/*
 * Segment plans of the nodes with calls (specs/007-split-call-nodes, FR-001,
 * FR-002, FR-004, FR-005, research R2, R3, R5, R6, data-model §1 and §5,
 * contracts/lib-api.md §1).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * For an intra-procedural original node, the expressions it evaluates are
 * numbered in ECMAScript evaluation order (post-order: operands from left to
 * right before their operator, arguments before the call; nested function
 * bodies and class bodies, out of computed keys, are not walked). Each call or
 * new expression whose callees are resolved (callresolver
 * calleeScopesOfExpression) and each class with static members is a call
 * site, except in the positions evaluated conditionally in a single node
 * (after ?. in an optional chain, defaults of destructuring patterns), the
 * left side of for-in/for-of and case tests left in the case node (not
 * evaluated by the node: a test not split, or the last operand of a split
 * test; the other operands split from a test are decision nodes evaluating
 * their expressions, DECISION 007), and a callee or receiver variable defined
 * earlier in the same node (guard). The
 * k call sites cut the node into k + 1 segments: every read, definition and
 * operation that may throw belongs to the segment of the number of call sites
 * before its position. Nothing is modified; the plans are frozen and cached
 * by the original node.
 */
var FlowNode = require('../esgraph/flownode'),
	branchsplitter = require('../esgraph/branchsplitter'),
	callResolver = require('./callresolver');

/**
 * Node types whose evaluation may throw: the same as throwTypes of
 * lib/esgraph/index.js (compared by tests/dujs/callsplit.js)
 * @type {Array}
 */
var THROW_TYPES = Object.freeze([
	'AssignmentExpression',
	'BinaryExpression',
	'CallExpression',
	'MemberExpression',
	'NewExpression',
	'UnaryExpression'
]);

/**
 * Plan of each original node: WeakMap(FlowNode, SegmentPlan)
 * @type {WeakMap}
 * @private
 */
var plans = new WeakMap();

/**
 * Nodes reachable from the entry node without passing each loop node:
 * WeakMap(FlowNode, Set)
 * @type {WeakMap}
 * @private
 */
var outsideOfLoops = new WeakMap();

/**
 * Pattern node types (destructuring targets)
 * @type {Array}
 * @private
 */
var PATTERN_TYPES = ['ObjectPattern', 'ArrayPattern', 'AssignmentPattern', 'RestElement'];

/**
 * Whether a node is the first case node of a switch statement
 * @param {FlowNode} node
 * @returns {boolean}
 * @private
 */
function isFirstCase(node) {
	'use strict';
	return !!node.astNode && node.astNode.type === 'SwitchCase' && !!node.parent &&
		node.parent.type === 'SwitchStatement' && node.parent.cases[0] === node.astNode;
}

/**
 * Whether an AST node is a for-in or for-of statement
 * @param {Object} ast
 * @returns {boolean}
 * @private
 */
function isForInOrOf(ast) {
	'use strict';
	return !!ast && (ast.type === 'ForInStatement' || ast.type === 'ForOfStatement');
}

/**
 * The expressions evaluated by a node itself, in order (research R2 step 1):
 * split.preEvaluated, then the discriminant of its switch for the first case
 * node when the discriminant is not split (not the case test; other case
 * nodes evaluate nothing), the right side of a for-in/for-of loop node unless
 * split (not the left side), the parameter of a catch clause node, or the
 * astNode of other nodes (a decision node split from the operands of a case
 * test as well, DECISION 007); nothing for the entry and exit nodes, a node
 * without astNode, and the case node left by splitting a case test (its last
 * operand is not modeled, as a case test not split)
 * @param {FlowNode} node
 * @returns {Array} AST nodes
 */
function evaluatedExpressionsOf(node) {
	'use strict';
	if (!node || node.type === FlowNode.ENTRY_NODE_TYPE || node.type === FlowNode.EXIT_NODE_TYPE || !node.astNode) {
		return [];
	}
	var ast = node.astNode,
		preEvaluated = !!node.split ? node.split.preEvaluated.slice() : [];
	if (!!node.split && node.split.origin.type === 'SwitchCase' && ast.type === 'SwitchCase') {
		return [];
	}
	switch (ast.type) {
		case 'SwitchCase':
			return (isFirstCase(node) && !node.discriminantSplit) ? preEvaluated.concat([node.parent.discriminant]) :
				preEvaluated;
		case 'ForInStatement':
		case 'ForOfStatement':
			return node.loopRightSplit ? preEvaluated : preEvaluated.concat([ast.right]);
		case 'CatchClause':
			return !!ast.param ? preEvaluated.concat([ast.param]) : preEvaluated;
		default:
			return preEvaluated.concat([ast]);
	}
}

/**
 * Walk expressions in evaluation order (data-model §5)
 * @param {Array} expressions
 * @returns {Object} {order: Map(AST, number), excluded: Set of the AST nodes evaluated
 *   conditionally in the node (after ?., defaults of destructuring patterns)}
 * @private
 */
function walkEvaluation(expressions) {
	'use strict';
	var order = new Map(), excluded = new Set(), counter = 0, conditional = 0, chains = [];

	function number(ast) {
		if (!ast || order.has(ast)) {
			return;
		}
		order.set(ast, counter);
		counter += 1;
		if (conditional > 0) {
			excluded.add(ast);
		}
	}

	/// the rest of the innermost optional chain is evaluated only when the value is not nullish
	function startOptional() {
		var chain = chains[chains.length - 1];
		if (!!chain && !chain.optional) {
			chain.optional = true;
			conditional += 1;
		}
	}

	function visitConditionally(ast) {
		conditional += 1;
		visit(ast);
		conditional -= 1;
	}

	/// a member target (not a get): its object and computed property
	function visitMemberTarget(target) {
		visit(target.object);
		if (target.computed) {
			visit(target.property);
		}
	}

	/// a destructuring target: computed keys, member targets and defaults (conditional) in pattern order
	function visitPattern(pattern) {
		if (!pattern) {
			return;
		}
		switch (pattern.type) {
			case 'ObjectPattern':
				pattern.properties.forEach(function (property) {
					if (property.type === 'RestElement') {
						visitPattern(property);
						return;
					}
					if (property.computed) {
						visit(property.key);
					}
					visitPattern(property.value);
				});
				break;
			case 'ArrayPattern':
				pattern.elements.forEach(visitPattern);
				break;
			case 'AssignmentPattern':
				if (pattern.left.type === 'MemberExpression') {
					visitMemberTarget(pattern.left);
					visitConditionally(pattern.right);
					number(pattern.left);
				} else if (PATTERN_TYPES.indexOf(pattern.left.type) !== -1) {
					visitConditionally(pattern.right);
					visitPattern(pattern.left);
				} else {
					visitConditionally(pattern.right);
					number(pattern.left);
				}
				break;
			case 'RestElement':
				visitPattern(pattern.argument);
				break;
			case 'MemberExpression':
				visitMemberTarget(pattern);
				break;
			default:
				break;
		}
		number(pattern);
	}

	/// other nodes: their child nodes in the order of their properties
	function visitChildren(ast) {
		Object.keys(ast).forEach(function (key) {
			if (key === 'range' || key === 'loc' || /^dujs/.test(key)) {
				return;
			}
			var value = ast[key];
			if (Array.isArray(value)) {
				value.forEach(function (item) {
					if (!!item && typeof item.type === 'string') {
						visit(item);
					}
				});
			} else if (!!value && typeof value === 'object' && typeof value.type === 'string') {
				visit(value);
			}
		});
	}

	function visit(ast) {
		if (!ast || typeof ast.type !== 'string') {
			return;
		}
		if (PATTERN_TYPES.indexOf(ast.type) !== -1) {
			visitPattern(ast);
			return;
		}
		switch (ast.type) {
			case 'FunctionExpression':
			case 'ArrowFunctionExpression':
			case 'FunctionDeclaration':
				/// the function is created; its body is a scope of its own
				break;
			case 'ClassDeclaration':
			case 'ClassExpression':
				/// the superclass and the computed keys, then the class (its name and static members)
				visit(ast.superClass);
				ast.body.body.forEach(function (member) {
					if (member.computed) {
						visit(member.key);
					}
				});
				break;
			case 'CallExpression':
				visit(ast.callee);
				if (ast.optional) {
					startOptional();
				}
				ast['arguments'].forEach(visit);
				break;
			case 'NewExpression':
				visit(ast.callee);
				ast['arguments'].forEach(visit);
				break;
			case 'MemberExpression':
				visit(ast.object);
				if (ast.optional) {
					startOptional();
				}
				if (ast.computed) {
					visit(ast.property);
				}
				break;
			case 'ChainExpression':
				chains.push({optional: false});
				visit(ast.expression);
				if (chains.pop().optional) {
					conditional -= 1;
				}
				break;
			case 'AssignmentExpression':
				if (PATTERN_TYPES.indexOf(ast.left.type) !== -1) {
					visit(ast.right);
					visitPattern(ast.left);
				} else if (ast.operator === '=') {
					if (ast.left.type === 'MemberExpression') {
						visitMemberTarget(ast.left);
					}
					visit(ast.right);
				} else {
					/// compound: the target is read first
					visit(ast.left);
					visit(ast.right);
				}
				break;
			case 'VariableDeclarator':
				visit(ast.init);
				if (PATTERN_TYPES.indexOf(ast.id.type) !== -1) {
					visitPattern(ast.id);
				}
				break;
			case 'Property':
				if (ast.computed) {
					visit(ast.key);
				}
				visit(ast.value);
				break;
			case 'MetaProperty':
			case 'ImportDeclaration':
			case 'ExportAllDeclaration':
				break;
			case 'ExportNamedDeclaration':
			case 'ExportDefaultDeclaration':
				visit(ast.declaration);
				break;
			default:
				visitChildren(ast);
				break;
		}
		number(ast);
	}

	expressions.forEach(visit);
	return {order: order, excluded: excluded};
}

/**
 * Post-order positions of the expressions (data-model §5)
 * @param {Array} expressions AST nodes evaluated in this order
 * @returns {Map} Map(AST, number)
 */
function evaluationOrder(expressions) {
	'use strict';
	return walkEvaluation(expressions).order;
}

/**
 * The shape of a node (research R1): once-switch for the first case node of
 * a switch whose discriminant is not split, once-loop for a for-in/for-of loop
 * node whose right side is not split, decision for other nodes with a branch,
 * statement otherwise
 * @param {FlowNode} node
 * @returns {string}
 * @private
 */
function shapeOf(node) {
	'use strict';
	if (!node.astNode || node.type === FlowNode.ENTRY_NODE_TYPE || node.type === FlowNode.EXIT_NODE_TYPE) {
		return 'statement';
	}
	if (!node.split && isFirstCase(node) && !node.discriminantSplit) {
		return 'once-switch';
	}
	if (isForInOrOf(node.astNode) && !node.loopRightSplit) {
		return 'once-loop';
	}
	return (!!node.true || !!node.false) ? 'decision' : 'statement';
}

/**
 * The scopes of the static fields with a value and the static blocks of a
 * class, in source order (FR-006 of feature 004)
 * @param {Object} classNode ClassDeclaration or ClassExpression
 * @param {ScopeTree} scopeTree
 * @returns {Array} Scopes
 * @private
 */
function staticMemberScopesOf(classNode, scopeTree) {
	'use strict';
	var scopes = [];
	classNode.body.body.forEach(function (member) {
		if ((member.static || member.type === 'StaticBlock') && !!member.dujsScopeFunction) {
			var scope = scopeTree.getScopeByRange(member.dujsScopeFunction.range);
			if (!!scope) {
				scopes.push(scope);
			}
		}
	});
	return scopes;
}

/**
 * The Var read by an identifier at a node, through the binding of its page
 * @param {FlowNode} node
 * @param {Object} identifier
 * @returns {Var|null}
 * @private
 */
function useVarOf(node, identifier) {
	'use strict';
	var binding = !!node.scope ? node.scope.binding : null;
	return !!binding ? binding.useVarOf(identifier) : null;
}

/**
 * Guard (research R2 step 3, R13 L3): the callee identifier, or the receiver
 * identifier of a method call, has a definition at the node (generatedAt)
 * whose position is before its read; the callee is resolved by the ReachIn
 * of the node, which does not hold that definition
 * @param {FlowNode} node
 * @param {Object} expression CallExpression or NewExpression
 * @param {Map} order
 * @returns {boolean}
 * @private
 */
function isDefinedBeforeRead(node, expression, order) {
	'use strict';
	var callee = expression.callee,
		identifier = (callee.type === 'Identifier') ? callee :
			((callee.type === 'MemberExpression' && callee.object.type === 'Identifier') ? callee.object : null);
	if (!identifier || !order.has(identifier) || !node.generatedAt) {
		return false;
	}
	var variable = useVarOf(node, identifier), readAt = order.get(identifier), defined = false;
	if (!variable) {
		return false;
	}
	node.generatedAt.forEach(function (ast, vardef) {
		if (vardef.variable === variable && order.has(ast) && order.get(ast) < readAt) {
			defined = true;
		}
	});
	return defined;
}

/**
 * The candidate call site of an AST node: {expression, kind, callees}, or null
 * @param {FlowNode} node
 * @param {Object} ast
 * @param {Map} order
 * @param {ScopeTree} scopeTree
 * @returns {Object|null}
 * @private
 */
function callSiteOf(node, ast, order, scopeTree) {
	'use strict';
	var kind = null, callees = [];
	if (ast.type === 'CallExpression' || ast.type === 'NewExpression') {
		kind = (ast.type === 'CallExpression') ? 'call' : 'new';
		if (isDefinedBeforeRead(node, ast, order)) {
			return null;
		}
		callees = callResolver.calleeScopesOfExpression(node, ast, scopeTree);
	} else if (ast.type === 'ClassDeclaration' || ast.type === 'ClassExpression') {
		kind = 'class-static';
		callees = staticMemberScopesOf(ast, scopeTree);
	}
	return (!!kind && callees.length > 0) ?
		Object.freeze({expression: ast, kind: kind, callees: Object.freeze(callees)}) : null;
}

/**
 * The entry node of the graph of an original node (through its predecessors)
 * @param {FlowNode} node
 * @returns {FlowNode|null}
 * @private
 */
function entryNodeOf(node) {
	'use strict';
	var nodes = [node], visited = new Set(nodes);
	for (var index = 0; index < nodes.length; ++index) {
		if (nodes[index].type === FlowNode.ENTRY_NODE_TYPE) {
			return nodes[index];
		}
		nodes[index].prev.forEach(addUnvisited);
	}
	function addUnvisited(prev) {
		if (!visited.has(prev)) {
			visited.add(prev);
			nodes.push(prev);
		}
	}
	return null;
}

/**
 * Nodes reachable from a node through the successors, without passing (nor
 * including) the excluded node
 * @param {FlowNode} start
 * @param {FlowNode} [excluded]
 * @returns {Array}
 * @private
 */
function reachableNodes(start, excluded) {
	'use strict';
	var nodes = (start === excluded) ? [] : [start], visited = new Set(nodes);
	if (!!excluded) {
		visited.add(excluded);
	}
	for (var index = 0; index < nodes.length; ++index) {
		nodes[index].next.forEach(addUnvisited);
	}
	function addUnvisited(next) {
		if (!visited.has(next)) {
			visited.add(next);
			nodes.push(next);
		}
	}
	return nodes;
}

/**
 * The predecessors of a for-in/for-of loop node out of its body in the
 * original graph (research R5; the rule of branchsplitter isInsideLoopBody)
 * @param {FlowNode} loop
 * @returns {Array}
 * @private
 */
function enteringPrevOf(loop) {
	'use strict';
	function reachableOutside() {
		if (!outsideOfLoops.has(loop)) {
			var entry = entryNodeOf(loop);
			outsideOfLoops.set(loop, new Set(!!entry ? reachableNodes(entry, loop) : []));
		}
		return outsideOfLoops.get(loop);
	}
	return loop.prev.filter(function (prev) {
		return !branchsplitter.isInsideLoopBody(prev, loop, reachableOutside);
	});
}

/**
 * The case nodes with a test of the switch of a first case node, in source order
 * @param {FlowNode} node First case node
 * @returns {Array}
 * @private
 */
function caseOwnersOf(node) {
	'use strict';
	var entry = entryNodeOf(node),
		nodes = !!entry ? reachableNodes(entry) : [node];
	return nodes.filter(function (other) {
		return !!other.astNode && other.astNode.type === 'SwitchCase' && other.parent === node.parent &&
			!!other.astNode.test;
	}).sort(function (first, second) {
		return first.astNode.range[0] - second.astNode.range[0];
	});
}

/**
 * Whether an AST node is in the left side of a for-in/for-of node (the loop
 * variable or the target, read and defined on each iteration by the copy of
 * the loop node, in no segment; data-model §4)
 * @param {FlowNode} node
 * @param {Object} ast
 * @returns {boolean}
 * @private
 */
function isInLoopLeft(node, ast) {
	'use strict';
	var left = isForInOrOf(node.astNode) ? node.astNode.left : null;
	return !!left && !!ast && !!ast.range && ast.range[0] >= left.range[0] && ast.range[1] <= left.range[1];
}

/**
 * Compute the plan of a node (data-model §1)
 * @param {FlowNode} node
 * @param {ScopeTree} scopeTree
 * @returns {Object} SegmentPlan (frozen)
 * @private
 */
function computePlan(node, scopeTree) {
	'use strict';
	var shape = shapeOf(node),
		expressions = evaluatedExpressionsOf(node),
		walked = walkEvaluation(expressions),
		order = walked.order,
		callSites = [];
	order.forEach(function (position, ast) {
		if (walked.excluded.has(ast)) {
			return;
		}
		var candidate = callSiteOf(node, ast, order, scopeTree);
		if (!candidate) {
			return;
		}
		callSites.push(Object.freeze({
			index: callSites.length,
			expression: ast,
			kind: candidate.kind,
			callees: candidate.callees,
			position: position
		}));
	});
	var count = callSites.length;

	function segmentOf(ast) {
		/// the left side of a once-loop node is evaluated by the copy of the loop node on each iteration
		if (!order.has(ast) && shape === 'once-loop' && isInLoopLeft(node, ast)) {
			return null;
		}
		if (!order.has(ast)) {
			throw new Error('callsplit: no evaluation position of ' + (!!ast ? ast.type : String(ast)) +
				' at node ' + node.cfgId);
		}
		var position = order.get(ast), segment = 0;
		while (segment < count && callSites[segment].position < position) {
			segment += 1;
		}
		return segment;
	}

	function segmentOfVarDef(vardef) {
		var ast = !!node.generatedAt ? node.generatedAt.get(vardef) : undefined;
		if (!ast) {
			throw new Error('callsplit: no AST completing the definition ' + String(vardef) + ' at node ' + node.cfgId);
		}
		/// the loop variable is defined on each iteration, in no segment
		if (isForInOrOf(ast)) {
			return null;
		}
		return segmentOf(ast);
	}

	var throws = [];
	for (var index = 0; index <= count; ++index) {
		throws.push(index < count);
	}
	order.forEach(function (position, ast) {
		if (THROW_TYPES.indexOf(ast.type) !== -1) {
			throws[segmentOf(ast)] = true;
		}
	});
	if (!!node.astNode && node.astNode.type === 'ThrowStatement') {
		throws[count] = true;
	}

	var owners = [];
	if (shape === 'decision' || shape === 'once-loop') {
		owners = [node];
	} else if (shape === 'once-switch') {
		owners = caseOwnersOf(node);
	}

	return Object.freeze({
		node: node,
		shape: shape,
		expressions: Object.freeze(expressions),
		order: order,
		callSites: Object.freeze(callSites),
		segmentCount: count + 1,
		segmentOf: segmentOf,
		segmentOfVarDef: segmentOfVarDef,
		throws: Object.freeze(throws),
		throwTarget: node.exception || node.discriminantThrowTarget || null,
		owners: Object.freeze(owners),
		enteringPrev: (shape === 'once-loop') ? Object.freeze(enteringPrevOf(node)) : null
	});
}

/**
 * The segment plan of an intra-procedural original node, computed once and
 * cached by the node. Every call site is listed (the phase predicate of
 * DECISION 006 Q2 was removed by T048). The intra-procedural analysis must be
 * done (the ReachIn resolves the callees, generatedAt places the definitions).
 * @param {FlowNode} node
 * @param {ScopeTree} scopeTree
 * @returns {Object} SegmentPlan (frozen; data-model §1)
 */
function planOf(node, scopeTree) {
	'use strict';
	if (!plans.has(node)) {
		plans.set(node, computePlan(node, scopeTree));
	}
	return plans.get(node);
}

/**
 * Whether segment j of a plan may throw (research R6): throws[j]
 * @param {Object} plan SegmentPlan
 * @param {number} j
 * @returns {boolean}
 */
function segmentThrows(plan, j) {
	'use strict';
	return plan.throws[j] === true;
}

/**
 * Clear the cached plans (tests/helpers/analyze.js reset)
 */
function reset() {
	'use strict';
	plans = new WeakMap();
	outsideOfLoops = new WeakMap();
}

module.exports = {
	planOf: planOf,
	evaluatedExpressionsOf: evaluatedExpressionsOf,
	evaluationOrder: evaluationOrder,
	segmentThrows: segmentThrows,
	THROW_TYPES: THROW_TYPES,
	reset: reset
};
