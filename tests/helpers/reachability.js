/*
 * Test helper: an independent reachability checker of the def-use pairs of the
 * models built by dujs (specs/008-property-defs-method-calls,
 * contracts/reachability.md, data-model §4; FR-006, FR-007, FR-008).
 * Original dujs code, MIT License (see LICENSE).
 *
 * Independence (FR-007): this module computes the reachable nodes of a model on
 * its own, from the graph, the CallSiteRecords and LoopRecords of the model and
 * the AST of the scopes; it does not use the data flow solver nor the call
 * summaries, nor any analysis result kept by the model
 * (tests/dujs/reachability.js scans this source for the forbidden names).
 *
 * Reachable (contracts/reachability.md §2): from graph[0], every connection is
 * followed except
 * (a) a return edge to the CALL RETURN NODE of a CallSiteRecord: instead the
 *     record gives a virtual edge callNode -> callReturn, followed when the
 *     callNode is reachable and the callee returns normally (per call site,
 *     D015); "returns normally" is the least fixed point of "the exit of the
 *     callee has a reachable predecessor by a non-exception edge", true at once
 *     for a generator or async callee (its scope AST flags, D019); the
 *     exceptionalReturn of a record is an exception edge from the callNode (D014)
 *     and must be the exception target of some node of the graph;
 * (b) the LOOP RETURN NODE of a LoopRecord is reachable when its LOOP NODE is;
 * (c) the normal edges out of a finallyExit are followed only when its finally
 *     has a reachable non-exceptional entry (finallyRule, default true);
 * and a return edge to neither a CALL RETURN NODE of a record nor a LOOP NODE
 * throws (fail-closed). An intra-procedural model has no records: only (c).
 */
var assert = require('assert');
var analyze = require('./analyze'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	Scope = require('../../lib/dujs/scope'),
	Pair = require('../../lib/dujs/pair'),
	FlowNode = require('../../lib/esgraph/flownode'),
	branchLabel = require('../../lib/esgraph/branchlabel');

var EXCEPTION = FlowNode.EXCEPTION_CONNECTION_TYPE,
	NORMAL = FlowNode.NORMAL_CONNECTION_TYPE,
	RETURN = FlowNode.RETURN_CONNECTION_TYPE,
	/// connection type of the virtual edges of (a) and (b)
	VIRTUAL = 'virtual',
	INTRA_PROCEDURAL = 'intra-procedural',
	INTER_PAGE = 'inter-page';

/* ---------------------------------------------------------------------------
 * Positions and finally regions
 * ------------------------------------------------------------------------- */

/**
 * The owner function of a scope: the first scope which is not a block scope
 * @param {Scope|null} scope
 * @returns {Scope|null}
 */
function ownerOf(scope) {
	'use strict';
	var current = scope || null;
	while (!!current && current.type === Scope.BLOCK_TYPE) {
		current = current.parent;
	}
	return current;
}

/**
 * Whether an AST node is a function or a class (not entered when searching
 * the TryStatements of an owner function)
 * @param {Object} ast
 * @returns {boolean}
 */
function isNestedBoundary(ast) {
	'use strict';
	return ast.type === 'FunctionDeclaration' || ast.type === 'FunctionExpression' ||
		ast.type === 'ArrowFunctionExpression' || ast.type === 'ClassDeclaration' || ast.type === 'ClassExpression';
}

/**
 * Child AST nodes of an AST node
 * @param {Object} ast
 * @returns {Array}
 */
function childrenOf(ast) {
	'use strict';
	var children = [];
	Object.keys(ast).forEach(function (key) {
		if (key === 'parent' || key === 'loc' || key === 'range') {
			return;
		}
		[].concat(ast[key]).forEach(function (value) {
			if (!!value && typeof value === 'object' && typeof value.type === 'string') {
				children.push(value);
			}
		});
	});
	return children;
}

/**
 * TryStatements (with a finalizer) of the body of an owner function, not in
 * nested functions or classes
 * @param {Object} ownerAst AST of the owner scope (a function or the program)
 * @returns {Array}
 */
function tryStatementsOf(ownerAst) {
	'use strict';
	var found = [],
		stack = childrenOf(ownerAst);
	while (stack.length > 0) {
		var ast = stack.pop();
		if (isNestedBoundary(ast)) {
			continue;
		}
		if (ast.type === 'TryStatement' && !!ast.finalizer) {
			found.push(ast);
		}
		[].push.apply(stack, childrenOf(ast));
	}
	return found;
}

/**
 * The TryStatement of a finallyExit node: in the AST of its owner function, the
 * one whose finalizer ends at the line and column of the node
 * @param {FlowNode} finallyExit
 * @returns {Object} {owner, tryStatement}
 * @throws {Error} when none or more than one matches
 */
function tryStatementOf(finallyExit) {
	'use strict';
	var owner = ownerOf(finallyExit.scope),
		matches = (!owner || !owner.ast) ? [] : tryStatementsOf(owner.ast).filter(function (tryStatement) {
			var end = tryStatement.finalizer.loc.end;
			return end.line === finallyExit.line && end.column - 1 === finallyExit.col;
		});
	if (matches.length !== 1) {
		throw new Error('The finallyExit node ' + finallyExit.cfgId + ' (L' + finallyExit.line + ':' + finallyExit.col +
			' of ' + (!!finallyExit.scope ? finallyExit.scope.name : 'no scope') + ') matches ' + matches.length +
			' TryStatement with a finalizer ending there (contracts/reachability.md §2 (c))');
	}
	return {owner: owner, tryStatement: matches[0]};
}

/* ---------------------------------------------------------------------------
 * Context of a model
 * ------------------------------------------------------------------------- */

/**
 * Level of a model under the options
 * @param {Model} model
 * @param {Object} [options]
 * @returns {string}
 */
function levelOf(model, options) {
	'use strict';
	return (!!options && !!options.level) ? options.level : model.level;
}

/**
 * The structures of a model read by the reachability: nodes, records indexed by
 * their call node, CALL RETURN NODEs, loop records indexed by their LOOP NODE,
 * finally regions and the regions of each node
 * @param {Model} model
 * @param {Object} [options] {finallyRule, level}
 * @returns {Object}
 * @throws {Error} when an exceptionalReturn is not an exception target of the
 *   graph (D014) or a finallyExit matches no TryStatement
 */
function contextOf(model, options) {
	'use strict';
	var graph = model.graph,
		nodes = graph[2],
		level = levelOf(model, options),
		withRecords = level !== INTRA_PROCEDURAL,
		records = withRecords ? model.callSiteRecords() : [],
		loops = withRecords ? model.loopRecords() : [],
		recordsFrom = new Map(),
		callReturns = new Set(),
		loopsFrom = new Map(),
		exceptionTargets = new Set();

	nodes.forEach(function (node) {
		[].concat(node[EXCEPTION] || []).forEach(function (target) {
			exceptionTargets.add(target);
		});
	});
	records.forEach(function (record) {
		recordsFrom.set(record.callNode, (recordsFrom.get(record.callNode) || []).concat([record]));
		callReturns.add(record.callReturn);
		if (!!record.exceptionalReturn && !exceptionTargets.has(record.exceptionalReturn)) {
			throw new Error('The exceptionalReturn (node ' + record.exceptionalReturn.cfgId + ') of the call at L' +
				record.callNode.line + ' to ' + record.calleeScope.name + ' is not the exception target of any node ' +
				'(contracts/reachability.md §2, D014)');
		}
	});
	loops.forEach(function (record) {
		loopsFrom.set(record.loop, (loopsFrom.get(record.loop) || []).concat([record]));
	});

	/// the position of a node: astNode, segment source, original, the call node of a CALL RETURN NODE
	var callNodeOfReturn = new Map();
	records.forEach(function (record) {
		callNodeOfReturn.set(record.callReturn, record.callNode);
	});
	var regions = [],
		regionOfExit = new Map();
	nodes.forEach(function (node) {
		if (node.type === FlowNode.FINALLY_EXIT_NODE_TYPE) {
			var found = tryStatementOf(node),
				region = {
					finallyExit: node,
					tryStatement: found.tryStatement,
					owner: found.owner,
					range: found.tryStatement.finalizer.range
				};
			regions.push(region);
			regionOfExit.set(node, region);
		}
	});

	function rangeOf(node, seen) {
		if (!node || seen.indexOf(node) !== -1) {
			return null;
		}
		seen.push(node);
		if (regionOfExit.has(node)) {
			var end = regionOfExit.get(node).range[1] - 1;
			return [end, end + 1];
		}
		if (!!node.astNode && !!node.astNode.range) {
			return node.astNode.range;
		}
		if (!!node.segment && !!node.segment.source && !!node.segment.source.astNode &&
			!!node.segment.source.astNode.range) {
			return node.segment.source.astNode.range;
		}
		var original = (!!node.original && node.original !== node) ? rangeOf(node.original, seen) : null;
		if (!!original) {
			return original;
		}
		return callNodeOfReturn.has(node) ? rangeOf(callNodeOfReturn.get(node), seen) : null;
	}

	var regionsOf = new Map();
	function regionsOfNode(node) {
		if (regionsOf.has(node)) {
			return regionsOf.get(node);
		}
		var range = (regions.length === 0) ? null : rangeOf(node, []),
			owner = (regions.length === 0) ? null : ownerOf(node.scope),
			inside = (!range) ? [] : regions.filter(function (region) {
				return region.owner === owner && range[0] >= region.range[0] && range[1] <= region.range[1];
			});
		regionsOf.set(node, inside);
		return inside;
	}

	return {
		model: model,
		level: level,
		start: graph[0],
		nodes: nodes,
		records: records,
		recordsFrom: recordsFrom,
		callReturns: callReturns,
		loopsFrom: loopsFrom,
		regions: regions,
		regionOfExit: regionOfExit,
		regionsOf: regionsOfNode,
		finallyRule: !options || options.finallyRule !== false
	};
}

/* ---------------------------------------------------------------------------
 * Reachability
 * ------------------------------------------------------------------------- */

/**
 * Nodes reachable from a start node under the rules (a)(b)(c)
 * @param {Object} context contextOf
 * @param {FlowNode} start
 * @param {Map} returns Map(Scope, boolean) whether a callee returns normally
 * @param {Object} [run] {exit: a node whose non-exception entry is noted,
 *   open: a finallyExit whose normal edges are followed regardless of (c)}
 * @returns {Object} {reached: Set, entered: Set of regions, normalToExit: boolean}
 * @throws {Error} on a return edge to neither a CALL RETURN NODE of a record
 *   nor a LOOP NODE
 */
function explore(context, start, returns, run) {
	'use strict';
	run = run || {};
	var reached = new Set([start]),
		queue = [start],
		entered = new Set(),
		normalToExit = false;

	function isOpen(finallyExit) {
		if (!context.finallyRule || run.open === finallyExit) {
			return true;
		}
		return entered.has(context.regionOfExit.get(finallyExit));
	}

	function visit(from, to, type) {
		if (!to) {
			return;
		}
		if (type !== EXCEPTION && to === run.exit) {
			normalToExit = true;
		}
		if (type !== EXCEPTION) {
			noteEntries(from, to);
		}
		if (!reached.has(to)) {
			reached.add(to);
			queue.push(to);
		}
	}

	/// a non-exceptional edge from outside a region into it enters the region; the normal edges
	/// of its finallyExit already reached are followed then (monotone)
	function noteEntries(from, to) {
		var fromRegions = context.regionsOf(from),
			fromOwner = ownerOf(from.scope);
		context.regionsOf(to).forEach(function (region) {
			if (entered.has(region) || fromRegions.indexOf(region) !== -1 || fromOwner !== region.owner) {
				return;
			}
			entered.add(region);
			if (reached.has(region.finallyExit)) {
				[].concat(region.finallyExit[NORMAL] || []).forEach(function (target) {
					visit(region.finallyExit, target, NORMAL);
				});
			}
		});
	}

	while (queue.length > 0) {
		var from = queue.shift();
		FlowNode.CONNECTION_TYPES.forEach(function (type) {
			[].concat(from[type] || []).forEach(function (target) {
				if (!target) {
					return;
				}
				if (type === RETURN) {
					if (context.callReturns.has(target)) {
						return;
					}
					if (target.type !== FlowNode.LOOP_NODE_TYPE) {
						throw new Error('The return edge from node ' + from.cfgId + ' (' + from.type + ') to node ' +
							target.cfgId + ' (' + target.type + ') goes to neither the CALL RETURN NODE of a record ' +
							'nor a LOOP NODE (contracts/reachability.md §2, fail-closed)');
					}
				}
				if (type === NORMAL && from.type === FlowNode.FINALLY_EXIT_NODE_TYPE && !isOpen(from)) {
					return;
				}
				visit(from, target, type);
			});
		});
		(context.recordsFrom.get(from) || []).forEach(function (record) {
			if (returns.get(record.calleeScope) === true) {
				visit(from, record.callReturn, VIRTUAL);
			}
			if (!!record.exceptionalReturn) {
				visit(from, record.exceptionalReturn, EXCEPTION);
			}
		});
		(context.loopsFrom.get(from) || []).forEach(function (record) {
			visit(from, record.loopReturn, VIRTUAL);
		});
	}
	return {reached: reached, entered: entered, normalToExit: normalToExit};
}

/**
 * Whether each callee of the records returns normally: the least fixed point
 * (a generator or async callee returns normally at once, D019)
 * @param {Object} context
 * @param {Object} [run] {open}
 * @returns {Map} Map(Scope, boolean)
 */
function returnsOf(context, run) {
	'use strict';
	var returns = new Map(),
		bodies = new Map();
	context.records.forEach(function (record) {
		var scope = record.calleeScope;
		if (!returns.has(scope)) {
			var ast = scope.ast || {};
			returns.set(scope, ast.generator === true || ast.async === true);
			bodies.set(scope, []);
		}
		if (!!record.entry && !!record.exit && !bodies.get(scope).some(function (body) {
			return body.entry === record.entry && body.exit === record.exit;
		})) {
			bodies.get(scope).push({entry: record.entry, exit: record.exit});
		}
	});
	var changed = true;
	while (changed) {
		changed = false;
		returns.forEach(function (value, scope) {
			if (value) {
				return;
			}
			var returning = bodies.get(scope).some(function (body) {
				return explore(context, body.entry, returns, {exit: body.exit, open: (run || {}).open}).normalToExit;
			});
			if (returning) {
				returns.set(scope, true);
				changed = true;
			}
		});
	}
	return returns;
}

/**
 * The entries of the pages of an inter-page model are reachable
 * @param {Object} context
 * @param {Set} reached
 * @throws {Error} naming the entries not reachable
 */
function assertPageEntries(context, reached) {
	'use strict';
	var missing = context.nodes.filter(function (node) {
		return node.type === FlowNode.ENTRY_NODE_TYPE && !!node.scope && node.scope.type === Scope.PAGE_TYPE &&
			!reached.has(node);
	});
	if (missing.length > 0) {
		throw new Error('The entry of page ' + missing.map(function (node) {
			return node.scope.name;
		}).join(', ') + ' of the inter-page model is not reachable (contracts/reachability.md §2)');
	}
}

/**
 * Reachability of a model under a run
 * @param {Model} model
 * @param {Object} [options]
 * @param {Object} [run] {open}
 * @returns {Object} {context, returns, result: explore result}
 */
function solve(model, options, run) {
	'use strict';
	var context = contextOf(model, options),
		returns = returnsOf(context, run),
		result = explore(context, context.start, returns, {open: (run || {}).open});
	if (context.level === INTER_PAGE) {
		assertPageEntries(context, result.reached);
	}
	return {context: context, returns: returns, result: result};
}

/**
 * Nodes of a model reachable under the rules (a)(b)(c)
 * @param {Model} model
 * @param {Object} [options] {finallyRule: boolean (default true), level}
 * @returns {Set}
 */
function reachableNodes(model, options) {
	'use strict';
	return solve(model, options).result.reached;
}

/**
 * Whether each callee returns normally (the least fixed point of (a)); an empty
 * Map for an intra-procedural model
 * @param {Model} model
 * @param {Object} [options] {finallyRule, level}
 * @returns {Map} Map(Scope, boolean)
 */
function normalReturns(model, options) {
	'use strict';
	var context = contextOf(model, options);
	if (context.level === INTRA_PROCEDURAL) {
		return new Map();
	}
	return returnsOf(context);
}

/* ---------------------------------------------------------------------------
 * Violations, check and the invariant
 * ------------------------------------------------------------------------- */

/**
 * Labels of a use as tests/helpers/analyze.js pairsOfModel renders them; a
 * decision lacking its targets or a target which is not one of them (only by
 * an injection) is rendered "<decision>><target>" instead of throwing
 * @param {FlowNode|Pair} use
 * @returns {Array}
 */
function useLabelsOf(use) {
	'use strict';
	if (!(use instanceof Pair)) {
		return [analyze.nodeLabel(use)];
	}
	var decision = use.first,
		target = use.second,
		prefix = analyze.nodeLabel(decision) + '>' + analyze.nodeLabel(target);
	if (!!branchLabel.pathOf(target)) {
		return [prefix];
	}
	var labels = [];
	if (target === decision.true) {
		labels.push(prefix + branchLabel.branchMark(branchLabel.TRUE_BRANCH));
	}
	if (target === decision.false) {
		labels.push(prefix + branchLabel.branchMark(branchLabel.FALSE_BRANCH));
	}
	return labels.length > 0 ? labels : [prefix];
}

/**
 * Violations of the pairs of a model given its reachable nodes
 * @param {Model} model
 * @param {Set} reached
 * @returns {Array} Violation {variable, pair, unreachable, nodes}, sorted by pair
 */
function violationsAmong(model, reached) {
	'use strict';
	var violations = [],
		seen = new Set();
	model.dupairs.forEach(function (pairs, variable) {
		pairs.values().forEach(function (dupair) {
			var ends = [{name: 'def', node: dupair.first}];
			if (dupair.second instanceof Pair) {
				ends.push({name: 'decision', node: dupair.second.first}, {name: 'target', node: dupair.second.second});
			} else {
				ends.push({name: 'use', node: dupair.second});
			}
			var unreachable = ends.filter(function (end) {
				return !reached.has(end.node);
			});
			if (unreachable.length === 0) {
				return;
			}
			useLabelsOf(dupair.second).forEach(function (use) {
				var text = variable.name + ': ' + analyze.nodeLabel(dupair.first) + ' -> ' + use;
				if (seen.has(text)) {
					return;
				}
				seen.add(text);
				violations.push({
					variable: variable.name,
					pair: text,
					unreachable: unreachable.map(function (end) {
						return end.name;
					}),
					nodes: unreachable.map(function (end) {
						return end.node.cfgId;
					})
				});
			});
		});
	});
	return violations.sort(function (first, second) {
		return first.pair < second.pair ? -1 : (first.pair > second.pair ? 1 : 0);
	});
}

/**
 * Violations of the pairs of a model: a pair with an end not reachable
 * @param {Model} model
 * @param {Object} [options] {finallyRule, level}
 * @returns {Array} Violation (data-model §4)
 */
function violationsOf(model, options) {
	'use strict';
	return violationsAmong(model, reachableNodes(model, options));
}

/**
 * Nodes of the unreachable ends of a violation, from its pair in the model
 * @param {Model} model
 * @param {Set} reached reachable nodes with all rules on
 * @returns {Map} Map(pair text, Array of FlowNode)
 */
function unreachableEndsOf(model, reached) {
	'use strict';
	var ends = new Map();
	model.dupairs.forEach(function (pairs, variable) {
		pairs.values().forEach(function (dupair) {
			var nodes = [dupair.first].concat(dupair.second instanceof Pair ?
				[dupair.second.first, dupair.second.second] : [dupair.second]).filter(function (node) {
					return !reached.has(node);
				});
			useLabelsOf(dupair.second).forEach(function (use) {
				var text = variable.name + ': ' + analyze.nodeLabel(dupair.first) + ' -> ' + use;
				ends.set(text, (ends.get(text) || []).concat(nodes));
			});
		});
	});
	return ends;
}

/**
 * Check a model: the violations with all rules on, the pairs eligible to the
 * allowlist (both ends reachable with (c) off) and the witnesses of each
 * violation: the finallyExit nodes reachable with all rules on whose normal
 * edges are disabled by (c), such that opening only the normal edges of that one
 * reaches an unreachable end of the pair (sorted by scope name, line)
 * @param {Model} model
 * @param {string} programId
 * @param {string} modelName
 * @returns {Object} CheckResult {programId, modelName, violations, eligible, witnesses: Map(pair, Witness[])}
 */
function check(model, programId, modelName) {
	'use strict';
	var on = solve(model, {finallyRule: true}),
		reached = on.result.reached,
		violations = violationsAmong(model, reached),
		off = violationsAmong(model, reachableNodes(model, {finallyRule: false})).map(function (violation) {
			return violation.pair;
		}),
		eligible = violations.map(function (violation) {
			return violation.pair;
		}).filter(function (pair) {
			return off.indexOf(pair) === -1;
		}),
		witnesses = new Map();
	if (violations.length > 0) {
		var ends = unreachableEndsOf(model, reached),
			closed = on.context.regions.filter(function (region) {
				return reached.has(region.finallyExit) && !on.result.entered.has(region);
			}).map(function (region) {
				return {
					witness: {scope: region.finallyExit.scope.name, line: region.finallyExit.line, nonExceptionalEntries: 0},
					reached: solve(model, {finallyRule: true}, {open: region.finallyExit}).result.reached
				};
			}).sort(function (first, second) {
				var a = first.witness, b = second.witness;
				if (a.scope !== b.scope) {
					return a.scope < b.scope ? -1 : 1;
				}
				return a.line - b.line;
			});
		violations.forEach(function (violation) {
			var unreachable = ends.get(violation.pair) || [],
				list = [];
			closed.forEach(function (each) {
				var reaches = unreachable.some(function (node) {
					return each.reached.has(node);
				});
				if (reaches && !list.some(function (witness) {
					return witness.scope === each.witness.scope && witness.line === each.witness.line;
				})) {
					list.push(Object.assign({}, each.witness));
				}
			});
			witnesses.set(violation.pair, list);
		});
	}
	return {
		programId: programId,
		modelName: modelName,
		violations: violations,
		eligible: eligible,
		witnesses: witnesses
	};
}

/**
 * Check the results against the allowlist (contracts/reachability.md §5): fails
 * on (1) a violation not in the allowlist, (2) an item violated but not eligible
 * (still violated with (c) off), (3) an item no longer violated (stale; also an
 * item of a program or model not in the results), (4) an item whose witness is
 * not the one of the output
 * @param {Array} results CheckResult of check
 * @param {Array} allowlist items {program, model, pair, witness, note}
 * @throws {AssertionError} listing every failure
 */
function assertInvariant(results, allowlist) {
	'use strict';
	var problems = [],
		keyOf = function (program, model, pair) {
			return JSON.stringify([program, model, pair]);
		},
		allowed = new Set((allowlist || []).map(function (item) {
			return keyOf(item.program, item.model, item.pair);
		}));
	results.forEach(function (result) {
		result.violations.forEach(function (violation) {
			if (!allowed.has(keyOf(result.programId, result.modelName, violation.pair))) {
				problems.push('violation not in the allowlist: ' + result.programId + ' | ' + result.modelName + ' | ' +
					violation.pair + ' | unreachable: ' + violation.unreachable.join(', ') + ' (nodes ' +
					violation.nodes.join(', ') + ')');
			}
		});
	});
	(allowlist || []).forEach(function (item) {
		var name = item.program + ' | ' + item.model + ' | ' + item.pair,
			result = results.filter(function (each) {
				return each.programId === item.program && each.modelName === item.model;
			})[0],
			violated = !!result && result.violations.some(function (violation) {
				return violation.pair === item.pair;
			});
		if (!result) {
			problems.push('過期 (stale): allowlist item of a program or model not checked: ' + name);
		} else if (!violated) {
			problems.push('過期 (stale): allowlist item no longer violated: ' + name);
		} else if (result.eligible.indexOf(item.pair) === -1) {
			problems.push('allowlist item not meeting the differential criterion (still violated with (c) off): ' + name);
		} else {
			var actual = JSON.stringify(result.witnesses.get(item.pair) || []),
				expected = JSON.stringify(item.witness || []);
			if (actual !== expected) {
				problems.push('allowlist item whose witness differs: ' + name + ' | allowlist ' + expected +
					' | output ' + actual);
			}
		}
	});
	if (problems.length > 0) {
		throw new assert.AssertionError({
			message: 'Reachability invariant (contracts/reachability.md §5): ' + problems.length + ' failure(s)\n' +
				problems.join('\n')
		});
	}
}

/**
 * Build the models of the pages with tests/helpers/analyze.js and list the
 * models of the four levels with their names (contracts/reachability.md §4):
 * intra(<scope name without $DOMAIN.>), inter-procedural[<i>] (numbered over
 * the pages in order), intra-page[<page>], inter-page
 * @param {string|Array} codeOfPages
 * @param {string} [programId]
 * @returns {Array} {programId, modelName, model}
 */
function modelsOfPages(codeOfPages, programId) {
	'use strict';
	analyze(codeOfPages);
	var list = [],
		interIndex = 0,
		id = programId === undefined ? null : programId;
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree, page) {
		var pageModels = modelCtrl.collectionOfPageModels.get(scopeTree);
		pageModels.intraProceduralModels.forEach(function (model) {
			list.push({programId: id, modelName: 'intra(' + model.mainlyRelatedScope.name.replace(/^\$DOMAIN\./, '') + ')',
				model: model});
		});
		pageModels.interProceduralModels.forEach(function (model) {
			list.push({programId: id, modelName: 'inter-procedural[' + interIndex + ']', model: model});
			interIndex += 1;
		});
		pageModels.intraPageModels.forEach(function (model, index) {
			list.push({programId: id, modelName: 'intra-page[' + (index === 0 ? page : page + '.' + index) + ']',
				model: model});
		});
	});
	if (!!modelCtrl.interPageModel) {
		list.push({programId: id, modelName: 'inter-page', model: modelCtrl.interPageModel});
	}
	return list;
}

module.exports = {
	reachableNodes: reachableNodes,
	normalReturns: normalReturns,
	violationsOf: violationsOf,
	check: check,
	assertInvariant: assertInvariant,
	modelsOfPages: modelsOfPages
};
