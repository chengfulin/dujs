/*
 * Split conditional expressions and short-circuit operators of CFG nodes into
 * decision and leaf nodes (equivalent if/else transformation): the graph part
 * of the branch splitting
 *
 * Original dujs code, MIT License (see LICENSE); this file contains no code
 * derived from esgraph. It is called by lib/esgraph/index.js, which passes its
 * own expressionThrows function as a callback.
 *
 * A node whose expression has a split operator is replaced by a decision node
 * for the first condition and one subgraph per branch. The first decision is
 * found by lib/esgraph/decisionfinder.js and the AST of each branch is built
 * by lib/esgraph/astrewriter.js; this file creates the nodes of the decisions
 * and leaves, connects them where the original node was (the contexts of the
 * node) and removes or keeps the original node.
 * See specs/001-fix-known-issues/research.md R1 ~ R3 and data-model.md §1 ~ §2.
 *
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var FlowNode = require('./flownode'),
	factoryFlowNode = require('./flownodefactory'),
	decisionfinder = require('./decisionfinder'),
	astrewriter = require('./astrewriter'),
	branchLabel = require('./branchlabel');

/**
 * Redirect the connections of a node from one target to another
 * @private
 */
function redirect(node, from, to) {
	'use strict';
	var types = FlowNode.CONNECTION_TYPES.filter(function (type) {
		if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
			return node[type].indexOf(from) !== -1;
		}
		return node[type] === from;
	});
	if (types.length) {
		node.disconnect(from);
		types.forEach(function (type) {
			node.connect(to, type);
		});
	}
}

/**
 * The contexts of a node: where the leaves of its split go (research R3).
 * The discriminant of a switch is split at its first case node (the switch
 * statement node itself is never entered), before the test of that case.
 * @private
 */
function contextsOf(node) {
	'use strict';
	var ast = node.astNode;
	switch (ast.type) {
		case 'SwitchCase':
			return discriminantContexts(node).concat([{kind: 'case', root: ast, origin: ast}]);
		case 'ForInStatement':
		case 'ForOfStatement':
			return [{kind: 'value', root: ast.right, next: node, keep: true, loop: true, origin: ast}];
		default:
			break;
	}
	if (node.isWithObject) {
		return [{kind: 'value', root: ast, next: node.normal, withObject: true, origin: ast}];
	}
	if (!!node.true || !!node.false) {
		return [{kind: 'condition', root: ast, origin: ast}];
	}
	return [{
		kind: 'statement',
		root: ast,
		transfer: ast.type === 'ReturnStatement' || ast.type === 'ThrowStatement',
		origin: ast
	}];
}

/**
 * The context of the switch discriminant at the first case node: the leaves
 * enter the case node, which is kept
 * @private
 */
function discriminantContexts(caseNode) {
	'use strict';
	var switchAst = caseNode.parent;
	if (!switchAst || switchAst.type !== 'SwitchStatement' || switchAst.cases[0] !== caseNode.astNode) {
		return [];
	}
	return [{kind: 'value', root: switchAst.discriminant, next: caseNode, keep: true, origin: switchAst}];
}

/**
 * Whether an AST range lies in the body of a loop statement
 * @private
 */
function isInsideLoopBody(node, loop) {
	'use strict';
	if (node === loop) {
		return true;
	}
	var ast = node.split ? node.split.origin : node.astNode,
		body = loop.astNode.body;
	return !!ast && !!ast.range && !!body.range && ast.range[0] >= body.range[0] && ast.range[1] <= body.range[1];
}

/**
 * Split one node; returns the created nodes (empty when not split)
 * @private
 */
function splitNode(node, context, expressionThrows) {
	'use strict';
	var first = decisionfinder.findFirstDecision(context.root);
	if (!first) {
		return [];
	}
	var origin = context.origin,
		exceptionTarget = node.exception,
		created = [];

	/// a split node: its label path is the split path (labelPath === split.path)
	function create(ast, path, preEvaluated) {
		var created1 = factoryFlowNode.create(FlowNode.NORMAL_NODE_TYPE, ast, node.parent);
		created1.split = {path: path, origin: origin, preEvaluated: preEvaluated};
		created1.labelPath = path;
		created.push(created1);
		return created1;
	}

	function connectException(created1, always) {
		if (!!exceptionTarget && (always || created1.analyzedExpressions.some(function (expression) {
			return expressionThrows(expression);
		}))) {
			created1.connect(exceptionTarget, FlowNode.EXCEPTION_CONNECTION_TYPE);
		}
	}

	function decide(ast, path, trueTarget, falseTarget) {
		var decision = create(ast, path);
		decision.connect(trueTarget, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		decision.connect(falseTarget, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		connectException(decision, false);
		return decision;
	}

	function finishStatement(root, path) {
		if (!context.transfer && decisionfinder.isInert(root)) {
			return node.normal; /// an empty branch: no node
		}
		var leaf = create(root, path);
		if (!!node.normal) {
			leaf.connect(node.normal, FlowNode.NORMAL_CONNECTION_TYPE);
		}
		connectException(leaf, root.type === 'ThrowStatement');
		return leaf;
	}

	function finishValue(root, path) {
		if (decisionfinder.isInert(root)) {
			return context.next;
		}
		var leaf = create(root, path);
		leaf.isWithObject = !!context.withObject;
		leaf.connect(context.next, FlowNode.NORMAL_CONNECTION_TYPE);
		connectException(leaf, false);
		return leaf;
	}

	function finish(root, path) {
		switch (context.kind) {
			case 'statement':
				return finishStatement(root, path);
			case 'value':
				return finishValue(root, path);
			case 'case':
				return decide(root, path, node.true, node.false);
			default: /// condition
				if (decisionfinder.isPlaceholder(root) && (root.known === 'truthy' || root.known === 'falsy')) {
					return (root.known === 'truthy') ? node.true : node.false;
				}
				return decide(root, path, node.true, node.false);
		}
	}

	function expand(root, path, found) {
		var decision = found, choice;
		while (!!decision && (choice = astrewriter.staticChoice(decision.split, decision.condition)) !== null) {
			root = astrewriter.rewrite(root, [decision.ancestors], new Map([[decision.split, choice]]), []);
			decision = decisionfinder.findFirstDecision(root);
		}
		if (!decision) {
			return finish(root, path);
		}
		var branches = astrewriter.branchesOf(decision.split);
		var decisionNode = create(decision.condition, path, decisionfinder.preEvaluatedOf(decision));
		var trueRoot = astrewriter.branchRoot(root, decision, branches[0]),
			falseRoot = astrewriter.branchRoot(root, decision, branches[1]);
		decisionNode.connect(expand(trueRoot, branchLabel.extendPath(path, branchLabel.TRUE_BRANCH),
			decisionfinder.findFirstDecision(trueRoot)), FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		decisionNode.connect(expand(falseRoot, branchLabel.extendPath(path, branchLabel.FALSE_BRANCH),
			decisionfinder.findFirstDecision(falseRoot)), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		connectException(decisionNode, false);
		return decisionNode;
	}

	var entry = expand(context.root, '', first);
	node.prev.forEach(function (prev) {
		/// a kept node (for-in/for-of, first case) is entered by the leaves; for a loop,
		/// only the edges from outside the loop are intercepted
		if (prev !== node && created.indexOf(prev) === -1 && !(context.loop && isInsideLoopBody(prev, node))) {
			redirect(prev, node, entry);
		}
	});
	if (context.keep) {
		node.loopRightSplit = !!context.loop || node.loopRightSplit;
		node.discriminantSplit = origin.type === 'SwitchStatement' || node.discriminantSplit;
		return created;
	}
	/// the original node is removed (self loops go to the decision)
	created.forEach(function (created1) {
		redirect(created1, node, entry);
	});
	node.next.forEach(function (next) {
		node.disconnect(next);
	});
	return created;
}

/**
 * Nodes reachable from the entry node, in breadth-first order
 * @private
 */
function reachableNodes(entryNode) {
	'use strict';
	var nodes = [entryNode], visited = new Set(nodes);
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
 * Split the conditional and short-circuit expressions of the nodes reachable
 * from the entry node into decision and leaf nodes. Call it after the edges
 * are connected and before the nodes are ordered and numbered.
 * @param {FlowNode} entryNode entry node of the CFG
 * @param {Object} options
 * @param {Function} options.expressionThrows (astNode) -> boolean, whether
 *   evaluating the expression may throw; a split node with a throwing
 *   expression is connected to the exception target of the original node
 * @returns {Array} the created nodes
 */
function split(entryNode, options) {
	'use strict';
	var expressionThrows = (!!options && typeof options.expressionThrows === 'function') ?
		options.expressionThrows : function () {
			return false;
		};
	var created = [], nodes = reachableNodes(entryNode), splitSwitches = new Set();
	nodes.forEach(function (node) {
		if (node.type === FlowNode.NORMAL_NODE_TYPE && !!node.astNode) {
			contextsOf(node).forEach(function (context) {
				created = created.concat(splitNode(node, context, expressionThrows));
			});
			if (node.discriminantSplit) {
				splitSwitches.add(node.parent);
			}
		}
	});
	/// no case node of a switch whose discriminant is split reads it again
	nodes.concat(created).forEach(function (node) {
		if (!!node.astNode && node.astNode.type === 'SwitchCase' && splitSwitches.has(node.parent)) {
			node.discriminantSplit = true;
		}
	});
	return created;
}

module.exports = {
	split: split,
	PLACEHOLDER_TYPE: decisionfinder.PLACEHOLDER_TYPE
};
