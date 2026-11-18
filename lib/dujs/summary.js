/*
 * Summaries of the callees (specs/005-summary-analysis, research R1, R3, R13,
 * data-model §1-§3, contracts/lib-api.md §1).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * The summary of a scope tells the effect of a call of it on its caller:
 * - normalReturn: whether a path reaches its exit normally;
 * - gen: the (original) definitions reaching its exit normally;
 * - mustKill: the variables defined again on every normal path to its exit;
 * - upwardExposed: the variables read before being defined again, on any path
 *   (through its callees as well);
 * - exceptional: the definitions reaching its exit exceptionally (User Story 3,
 *   research R3, R5): by an exception edge (carrying IN of its source, the
 *   rethrow of a finallyExit as well) or by a call whose exceptionalReturn is
 *   the exit (applyExceptional of the summary of its callee to OUT of the
 *   call node), so an exception goes out along the chain of calls;
 * - conservative: a generator or an async function (R13): it returns
 *   normally, kills nothing, and its gen holds the definitions reaching its
 *   exit both normally and exceptionally.
 * Only the variables the callee can see and not of the callee itself (nor of
 * its block scopes) are in a summary (FR-004).
 *
 * The summary of a scope is computed on its summary graph
 * (expansion.expandShallow of the model of its own calls,
 * modelbuilder.callModelOf): the calls in it are applied by the summaries of
 * the callees. The entry of the graph defines a sentinel of each variable
 * relevant to the summary (Def.SENTINEL_TYPE): a variable is must-killed when
 * its sentinel does not reach the exit normally, and upward-exposed when its
 * sentinel reaches a use of it. The scopes are solved by the strongly
 * connected components of their call graph, callees first; the summaries of a
 * component start from "no normal return" and are computed again until none
 * changes (R3).
 *
 * The summaries are kept by their scopes, so a page analyzed with the
 * summaries of another page (the inter-page model) finds them; computing them
 * writes no FlowNode and no Model of the analysis.
 */
var Set = require('../analyses/set'),
	FlowNode = require('../esgraph/flownode'),
	Def = require('./def'),
	defFactory = require('./deffactory'),
	varDefFactory = require('./vardeffactory'),
	modelCtrl = require('./modelctrl'),
	modelBuilder = require('./modelbuilder'),
	expansion = require('./expansion'),
	reachingSolver = require('./reachingsolver'),
	defuseAnalyzer = require('./defuseanalyzer');

/**
 * Upper limit of the rounds solving a strongly connected component (a guard
 * against a regression; the summaries change finitely)
 * @type {number}
 */
var MAX_ROUNDS = 1000;

/**
 * Computed pages: WeakSet(ScopeTree), only telling a page computed already
 * (its summaries are kept by their scopes in summaries)
 * @type {WeakSet}
 */
var pages = new WeakSet();

/**
 * Summaries of the computed pages by their scopes: WeakMap(Scope, Summary)
 * @type {WeakMap}
 */
var summaries = new WeakMap();

/**
 * Edges going out of a node
 * @param {FlowNode} node
 * @returns {Array} {type, target}
 * @private
 */
function outgoingEdgesOf(node) {
	'use strict';
	var edges = [];
	FlowNode.CONNECTION_TYPES.forEach(function (type) {
		var connected = node[type];
		if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
			(connected || []).forEach(function (target) {
				edges.push({type: type, target: target});
			});
		} else if (FlowNode.isFlowNode(connected)) {
			edges.push({type: type, target: connected});
		}
	});
	return edges;
}

/**
 * Whether a scope is a generator or an async function (R13)
 * @param {Scope} scope
 * @returns {boolean}
 * @private
 */
function isConservative(scope) {
	'use strict';
	var ast = scope.ast;
	return !!ast && (!!ast.generator || !!ast.async);
}

/**
 * The summary of no normal return, the start of the fixpoint (R3)
 * @param {Scope} scope
 * @returns {Object}
 * @private
 */
function bottomOf(scope) {
	'use strict';
	var conservative = isConservative(scope);
	return Object.freeze({
		scope: scope,
		normalReturn: conservative,
		gen: new Set(),
		mustKill: new Set(),
		upwardExposed: new Set(),
		exceptional: new Set(),
		conservative: conservative
	});
}

/**
 * Whether two summaries are the same
 * @param {Object} one
 * @param {Object} another
 * @returns {boolean}
 * @private
 */
function sameSummaries(one, another) {
	'use strict';
	return one.normalReturn === another.normalReturn && one.conservative === another.conservative &&
		Set.equals(one.gen, another.gen) && Set.equals(one.mustKill, another.mustKill) &&
		Set.equals(one.upwardExposed, another.upwardExposed) && Set.equals(one.exceptional, another.exceptional);
}

/**
 * The summary graph of a scope with what does not change over the rounds:
 * its GEN and USE sets (the c-uses, p-uses and deferred p-uses of each node,
 * feature 007) and the sentinel definitions made so far
 * @param {Scope} scope
 * @param {ScopeTree} scopeTree
 * @returns {Object} {scope, graph, calls, generate: Map(FlowNode, Set), use: Map(FlowNode, Array of Var), sentinels: Map(Var, VarDef)}
 * @throws {Error} when the scope has no model
 * @private
 */
function summaryGraphOf(scope, scopeTree) {
	'use strict';
	var model = modelBuilder.callModelOf(scope) ||
		modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
	if (!model) {
		throw new Error('summary: no model of the scope ' + String(scope));
	}
	var shallow = expansion.expandShallow(model),
		generate = new Map(),
		use = new Map();
	shallow.graph[2].forEach(function (node) {
		/// the copies are owned by the summary graph: the GEN and USE sets found here are kept by the copies only
		generate.set(node, node.generate || defuseAnalyzer.findGENSet(node));
		var used = defuseAnalyzer.findUSESet(node),
			variables = [];
		/// the deferred p-uses of a segment node are read there as well (feature 007, research R8)
		[used.cuse, used.puse, used.deferredPuse].forEach(function (vars) {
			vars.forEach(function (variable) {
				if (variables.indexOf(variable) === -1) {
					variables.push(variable);
				}
			});
		});
		use.set(node, variables);
	});
	return {
		scope: scope,
		graph: shallow.graph,
		calls: shallow.calls,
		generate: generate,
		use: use,
		sentinels: new Map()
	};
}

/**
 * Compute the summary of a scope from the summaries of its callees
 * @param {Object} summaryGraph see summaryGraphOf
 * @param {function} summaryOf (Scope) -> Summary of a callee
 * @returns {Object} frozen Summary
 * @private
 */
function computeSummary(summaryGraph, summaryOf) {
	'use strict';
	var scope = summaryGraph.scope,
		graph = summaryGraph.graph,
		entry = graph[0],
		exit = graph[1],
		conservative = isConservative(scope);
	function isInSummary(variable) {
		return defuseAnalyzer.isVisibleToCallee(variable, scope);
	}
	function isSentinel(vardef) {
		return vardef.definition.type === Def.SENTINEL_TYPE;
	}

	/// the relevant variables: defined or used in the graph, or in the summaries of the direct callees
	var relevant = [];
	function addRelevant(variable) {
		if (relevant.indexOf(variable) === -1 && isInSummary(variable)) {
			relevant.push(variable);
		}
	}
	graph[2].forEach(function (node) {
		summaryGraph.generate.get(node).forEach(function (vardef) {
			addRelevant(vardef.variable);
		});
		summaryGraph.use.get(node).forEach(addRelevant);
	});
	summaryGraph.calls.forEach(function (record) {
		var ofCallee = summaryOf(record.calleeScope);
		ofCallee.gen.forEach(function (vardef) {
			addRelevant(vardef.variable);
		});
		ofCallee.mustKill.forEach(addRelevant);
		ofCallee.upwardExposed.forEach(addRelevant);
	});
	var sentinelOf = new Map();
	relevant.forEach(function (variable) {
		if (!summaryGraph.sentinels.has(variable)) {
			summaryGraph.sentinels.set(variable, varDefFactory.create(variable, defFactory.createSentinelDef(entry)));
		}
		sentinelOf.set(variable, summaryGraph.sentinels.get(variable));
	});

	var solved = reachingSolver.solve(graph, {
		entryInput: new Set(relevant.map(function (variable) {
			return sentinelOf.get(variable);
		})),
		generateOf: function (node) {
			return summaryGraph.generate.get(node);
		},
		calls: summaryGraph.calls,
		summaryOf: summaryOf
	});

	/// the solver analyzes the nodes reached from the entry only (a CALL RETURN NODE when its callee returns normally)
	var normalReturn = conservative || exit.prev.some(function (source) {
			return solved.results.has(source) && outgoingEdgesOf(source).some(function (edge) {
				return edge.target === exit && edge.type !== FlowNode.EXCEPTION_CONNECTION_TYPE;
			});
		});
	/// the exceptional arrivals: by the exception edges to the exit (exitArrivals) and by the calls
	/// whose exceptionalReturn is the exit (the solver gives them to IN of the exit, not to exitArrivals)
	var arrivals = solved.exitArrivals,
		arrivingExceptionally = new Set(arrivals.exceptional);
	summaryGraph.calls.forEach(function (record) {
		var result = solved.results.get(record.callNode);
		if (record.exceptionalReturn !== exit || !result) {
			return;
		}
		arrivingExceptionally = Set.union(arrivingExceptionally,
			applyExceptional(summaryOf(record.calleeScope), result.out));
	});
	var exceptional = new Set(),
		gen = new Set(),
		mustKill = new Set(),
		upwardExposed = new Set();
	arrivingExceptionally.forEach(function (vardef) {
		if (!isSentinel(vardef) && isInSummary(vardef.variable)) {
			exceptional.add(vardef);
		}
	});
	arrivals.normal.forEach(function (vardef) {
		if (!isSentinel(vardef) && isInSummary(vardef.variable)) {
			gen.add(vardef);
		}
	});
	if (conservative) {
		/// R13: the gen of a generator or an async function holds its exceptional arrivals too
		gen = Set.union(gen, exceptional);
	}
	if (!conservative) {
		relevant.forEach(function (variable) {
			/// vacuously every relevant variable without a normal return
			if (!arrivals.normal.has(sentinelOf.get(variable))) {
				mustKill.add(variable);
			}
		});
	}
	/// the sentinel of a variable reaching a use of it, or the call of a callee reading it before defining it
	graph[2].forEach(function (node) {
		var result = solved.results.get(node);
		if (!result) {
			return;
		}
		summaryGraph.use.get(node).forEach(function (variable) {
			if (sentinelOf.has(variable) && result.in.has(sentinelOf.get(variable))) {
				upwardExposed.add(variable);
			}
		});
	});
	summaryGraph.calls.forEach(function (record) {
		var result = solved.results.get(record.callNode);
		if (!result) {
			return;
		}
		summaryOf(record.calleeScope).upwardExposed.forEach(function (variable) {
			if (sentinelOf.has(variable) && result.out.has(sentinelOf.get(variable))) {
				upwardExposed.add(variable);
			}
		});
	});
	return Object.freeze({
		scope: scope,
		normalReturn: normalReturn,
		gen: gen,
		mustKill: mustKill,
		upwardExposed: upwardExposed,
		exceptional: exceptional,
		conservative: conservative
	});
}

/**
 * Strongly connected components of the call graph of scopes (Tarjan), the
 * callees before their callers
 * @param {Array} scopes
 * @param {Map} calleesOf Map(Scope, Array of Scope)
 * @returns {Array} Array of Array of Scope
 * @private
 */
function componentsOf(scopes, calleesOf) {
	'use strict';
	var indexOf = new Map(),
		lowOf = new Map(),
		stack = [],
		components = [],
		counter = 0;
	function visit(scope) {
		indexOf.set(scope, counter);
		lowOf.set(scope, counter);
		counter += 1;
		stack.push(scope);
		(calleesOf.get(scope) || []).forEach(function (callee) {
			if (!calleesOf.has(callee)) {
				return; /// a scope of another page, computed already
			}
			if (!indexOf.has(callee)) {
				visit(callee);
				lowOf.set(scope, Math.min(lowOf.get(scope), lowOf.get(callee)));
			} else if (stack.indexOf(callee) !== -1) {
				lowOf.set(scope, Math.min(lowOf.get(scope), indexOf.get(callee)));
			}
		});
		if (lowOf.get(scope) === indexOf.get(scope)) {
			var component = [], member;
			do {
				member = stack.pop();
				component.push(member);
			} while (member !== scope);
			components.push(component.reverse());
		}
	}
	scopes.forEach(function (scope) {
		if (!indexOf.has(scope)) {
			visit(scope);
		}
	});
	return components;
}

/**
 * Compute the summaries of the scopes of a page (after its inter-procedural
 * models are built, before they are analyzed); a page computed already is
 * not computed again
 * @param {ScopeTree} scopeTree
 * @throws {Error} 'summary fixpoint did not converge: <scopes>' when a
 *   strongly connected component does not converge
 */
function computeForPage(scopeTree) {
	'use strict';
	if (pages.has(scopeTree)) {
		return;
	}
	var summaryGraphs = new Map(),
		calleesOf = new Map();
	scopeTree.scopes.forEach(function (scope) {
		var summaryGraph = summaryGraphOf(scope, scopeTree),
			callees = [];
		summaryGraph.calls.forEach(function (record) {
			if (callees.indexOf(record.calleeScope) === -1) {
				callees.push(record.calleeScope);
			}
		});
		summaryGraphs.set(scope, summaryGraph);
		calleesOf.set(scope, callees);
	});
	componentsOf(scopeTree.scopes, calleesOf).forEach(function (component) {
		var current = new Map();
		component.forEach(function (scope) {
			current.set(scope, bottomOf(scope));
		});
		function lookup(scope) {
			if (current.has(scope)) {
				return current.get(scope);
			}
			return summaryOf(scope);
		}
		var recursive = component.length > 1 || calleesOf.get(component[0]).indexOf(component[0]) !== -1,
			converged = false;
		for (var round = 0; round < MAX_ROUNDS && !converged; round += 1) {
			converged = true;
			component.forEach(function (scope) {
				var next = computeSummary(summaryGraphs.get(scope), lookup);
				if (!sameSummaries(next, current.get(scope))) {
					current.set(scope, next);
					converged = false;
				}
			});
			if (!recursive) {
				converged = true;
			}
		}
		if (!converged) {
			throw new Error('summary fixpoint did not converge: ' + component.map(String).join(', '));
		}
		current.forEach(function (summary, scope) {
			summaries.set(scope, summary);
		});
	});
	pages.add(scopeTree);
}

/**
 * Summary of a scope
 * @param {Scope} scope
 * @returns {Object} {scope, normalReturn, gen, mustKill, upwardExposed, exceptional, conservative}
 * @throws {Error} when the summary of the scope is not computed
 */
function summaryOf(scope) {
	'use strict';
	if (!summaries.has(scope)) {
		throw new Error('summary: not computed for the scope ' + String(scope));
	}
	return summaries.get(scope);
}

/**
 * The definitions of a summary as they are: the summaries are applied on the
 * graphs whose VarDefs are the original ones
 * @param {VarDef} vardef
 * @returns {VarDef}
 * @private
 */
function sameVarDef(vardef) {
	'use strict';
	return vardef;
}

/**
 * Definitions after a call returning normally (data-model §1):
 * S.normalReturn ? (X - defsOf(S.mustKill)) U S.gen : {}. One implementation
 * with the solver (reachingsolver.applySummary, which also maps S.gen to the
 * VarDefs of a flattened graph), so the two cannot drift apart; the solver
 * does not require this module, so there is no cycle
 * @param {Object} summary
 * @param {Set} vardefs
 * @returns {Set} a new Set
 */
function apply(summary, vardefs) {
	'use strict';
	return reachingSolver.applySummary(summary, vardefs, sameVarDef);
}

/**
 * Definitions after a call returning exceptionally (data-model §1, D3: no
 * KILL): X U S.exceptional; one implementation with the solver
 * (reachingsolver.applyExceptionalSummary), see apply
 * @param {Object} summary
 * @param {Set} vardefs
 * @returns {Set} a new Set
 */
function applyExceptional(summary, vardefs) {
	'use strict';
	return reachingSolver.applyExceptionalSummary(summary, vardefs, sameVarDef);
}

/**
 * Forget the summaries of every page (tests)
 */
function reset() {
	'use strict';
	pages = new WeakSet();
	summaries = new WeakMap();
}

module.exports = {
	computeForPage: computeForPage,
	summaryOf: summaryOf,
	apply: apply,
	applyExceptional: applyExceptional,
	reset: reset
};
