/*
 * Split conditional expressions and short-circuit operators of CFG nodes into
 * decision and leaf nodes (equivalent if/else transformation)
 *
 * Original dujs code, MIT License (see LICENSE); this file contains no code
 * derived from esgraph. It is called by lib/esgraph/index.js, which passes its
 * own expressionThrows function as a callback.
 *
 * A node whose expression has a `?:`, `&&`, `||`, `??`, `&&=`, `||=` or `??=`
 * is replaced by a decision node for the first condition (in evaluation order)
 * and one subgraph per branch; each branch works on a path-copied synthetic
 * AST where the split operator is replaced by the selected operand, or by an
 * evaluated-value placeholder (`DujsEvaluatedValue`) for a value already
 * computed at the decision. Subtrees not on the copied paths are shared with
 * the original AST (a function or class expression keeps one scope).
 * See specs/001-fix-known-issues/research.md R1 ~ R3 and data-model.md §1 ~ §2.
 *
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var FlowNode = require('./flownode'),
	factoryFlowNode = require('./flownodefactory');

var PLACEHOLDER_TYPE = 'DujsEvaluatedValue';

/// marker of an array element removed from a copied node (a declarator moved to preEvaluated)
var REMOVED = {};

var LOGICAL_ASSIGNMENTS = ['&&=', '||=', '??='];
var NULLISH_OPERATORS = ['??', '??='];

/// node types structural to their parent: their children are operands, not themselves
var STRUCTURAL_TYPES = ['SpreadElement', 'Property'];

/**
 * Create an evaluated-value placeholder replacing an expression
 * @param {string} known 'truthy', 'falsy', 'nonnull' or 'unknown'
 * @param {Object} replaced AST node replaced by the placeholder
 * @returns {Object}
 * @private
 */
function placeholder(known, replaced) {
	'use strict';
	return {type: PLACEHOLDER_TYPE, known: known, range: replaced.range, loc: replaced.loc};
}

function isPlaceholder(node) {
	'use strict';
	return !!node && node.type === PLACEHOLDER_TYPE;
}

/**
 * Whether evaluating the expression reads no variable, defines nothing and
 * calls nothing (a placeholder, a literal, a function expression, or
 * operators on those)
 * @param {Object} node
 * @returns {boolean}
 * @private
 */
function isInert(node) {
	'use strict';
	if (!node) {
		return true;
	}
	switch (node.type) {
		case PLACEHOLDER_TYPE:
		case 'Literal':
		case 'TemplateElement':
		case 'ThisExpression':
		case 'FunctionExpression':
		case 'ArrowFunctionExpression':
			return true;
		case 'TemplateLiteral':
			return node.expressions.every(isInert);
		case 'BinaryExpression':
		case 'LogicalExpression':
			return isInert(node.left) && isInert(node.right);
		case 'ConditionalExpression':
			return isInert(node.test) && isInert(node.consequent) && isInert(node.alternate);
		case 'UnaryExpression':
			return node.operator !== 'delete' && isInert(node.argument);
		case 'SequenceExpression':
			return node.expressions.every(isInert);
		case 'ArrayExpression':
			return node.elements.every(isInert);
		case 'ObjectExpression':
			return node.properties.every(function (property) {
				return property.type === 'Property' && !property.computed && isInert(property.value);
			});
		default:
			return false;
	}
}

/**
 * Shallow copy of an AST node, keeping the non-enumerable properties (dujs
 * caches of synthetic ASTs)
 * @private
 */
function shallowCopy(node) {
	'use strict';
	var copy = {};
	Object.getOwnPropertyNames(node).forEach(function (key) {
		Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(node, key));
	});
	return copy;
}

/**
 * The T and F replacements of a split operator (equivalent if/else)
 * @param {Object} split ConditionalExpression, LogicalExpression or logical AssignmentExpression
 * @returns {Array} [replacement of the true branch, replacement of the false branch]
 * @private
 */
function branchesOf(split) {
	'use strict';
	if (split.type === 'ConditionalExpression') {
		return [split.consequent, split.alternate];
	}
	var assignment = null;
	if (split.type === 'AssignmentExpression') {
		/// the assigning branch of a logical assignment is a plain assignment
		assignment = {
			type: 'AssignmentExpression',
			operator: '=',
			left: split.left,
			right: split.right,
			range: split.range,
			loc: split.loc
		};
	}
	var value = assignment || split.right;
	switch (split.operator) {
		case '&&':
		case '&&=':
			return [value, placeholder('falsy', split)];
		case '||':
		case '||=':
			return [placeholder('truthy', split), value];
		default: /// ?? and ??=
			return [placeholder('nonnull', split), value];
	}
}

/**
 * The replacement of a split operator whose condition is a placeholder of a
 * known value, or null when the condition has to be decided
 * @private
 */
function staticChoice(split, condition) {
	'use strict';
	if (!isPlaceholder(condition) || condition.known === 'unknown') {
		return null;
	}
	var known = condition.known;
	if (split.type !== 'ConditionalExpression' && NULLISH_OPERATORS.indexOf(split.operator) !== -1) {
		/// a truthy or non-null left operand is the value; no assignment for ??=
		return (known === 'falsy') ? null : placeholder(known, split);
	}
	if (known === 'nonnull') {
		return null;
	}
	return branchesOf(split)[known === 'truthy' ? 0 : 1];
}

/**
 * Find the first decision of an AST in evaluation order (the only place that
 * decides what is split: the nodes record the result, e.g.
 * FlowNode.loopRightSplit and FlowNode.discriminantSplit)
 * @param {Object} root
 * @returns {Object|null} {split, condition, ancestors, entries}; entries are
 *   the operands evaluated before the condition ({node, action, ancestors},
 *   action 'placeholder', 'remove' (declarator) or 'compound' (target read
 *   of a compound assignment))
 * @private
 */
function findFirstDecision(root) {
	'use strict';
	var stack = [], done = [];

	function search(node) {
		if (!node || typeof node !== 'object') {
			return null;
		}
		stack.push(node);
		var decision = searchByType(node);
		stack.pop();
		return decision;
	}

	/// search a child; the operands it evaluated do not stay in done if no decision is found
	function child(node) {
		var mark = done.length;
		var decision = search(node);
		if (!decision) {
			done.length = mark;
		}
		return decision;
	}

	/// search an operand; once completely evaluated without a decision, it is evaluated before the condition.
	/// A structural node (property, spread element) is not a value: its operands evaluated
	/// without a decision stay in done (D12, they are evaluated before a later condition)
	function operand(node) {
		if (!!node && STRUCTURAL_TYPES.indexOf(node.type) !== -1) {
			return search(node);
		}
		var decision = child(node);
		if (!decision && !!node && STRUCTURAL_TYPES.indexOf(node.type) === -1 && !isInert(node)) {
			done.push({node: node, action: 'placeholder', ancestors: stack.slice()});
		}
		return decision;
	}

	function operands(list) {
		var decision = null;
		list.some(function (node) {
			decision = operand(node);
			return !!decision;
		});
		return decision;
	}

	function decisionAt(split, condition, searchCondition) {
		var inner = searchCondition ? child(condition) : null;
		return inner || {split: split, condition: condition, ancestors: stack.slice(), entries: done.slice()};
	}

	function searchAssignment(node) {
		if (LOGICAL_ASSIGNMENTS.indexOf(node.operator) !== -1) {
			return decisionAt(node, node.left, false);
		}
		if (node.operator !== '=') {
			/// compound assignment: the target is read before the right side
			done.push({node: node, action: 'compound', ancestors: stack.slice()});
		}
		return operand(node.right);
	}

	function searchDeclarations(node) {
		var decision = null;
		node.declarations.some(function (declarator) {
			var mark = done.length;
			stack.push(declarator);
			decision = child(declarator.init);
			stack.pop();
			if (!decision) {
				done.length = mark;
				done.push({node: declarator, action: 'remove', ancestors: stack.slice()});
			}
			return !!decision;
		});
		return decision;
	}

	/// the super class and the computed keys are evaluated at the class definition; the bodies are not
	function searchClass(node) {
		var decision = operand(node.superClass);
		if (decision) {
			return decision;
		}
		stack.push(node.body);
		node.body.body.some(function (member) {
			if (member.computed) {
				stack.push(member);
				decision = operand(member.key);
				stack.pop();
			}
			return !!decision;
		});
		stack.pop();
		return decision;
	}

	function searchByType(node) {
		switch (node.type) {
			case 'ConditionalExpression':
				return decisionAt(node, node.test, true);
			case 'LogicalExpression':
				return decisionAt(node, node.left, true);
			case 'AssignmentExpression':
				return searchAssignment(node);
			case 'SequenceExpression':
			case 'TemplateLiteral':
				return operands(node.expressions);
			case 'BinaryExpression':
				return operand(node.left) || operand(node.right);
			case 'UnaryExpression':
			case 'UpdateExpression':
			case 'AwaitExpression':
			case 'YieldExpression':
			case 'SpreadElement':
				return operand(node.argument);
			case 'MemberExpression':
				return operand(node.object) || (node.computed ? operand(node.property) : null);
			case 'CallExpression':
			case 'NewExpression':
				/// the callee stays in the leaves (call sites are copied with them)
				return child(node.callee) || operands(node.arguments);
			case 'TaggedTemplateExpression':
				return child(node.tag) || child(node.quasi);
			case 'ArrayExpression':
				return operands(node.elements.filter(function (element) {
					return !!element;
				}));
			case 'ObjectExpression':
				return operands(node.properties);
			case 'Property':
				return (node.computed ? operand(node.key) : null) || operand(node.value);
			case 'ImportExpression':
				return operand(node.source);
			case 'ClassDeclaration':
			case 'ClassExpression':
				return searchClass(node);
			case 'VariableDeclaration':
				return searchDeclarations(node);
			case 'ExpressionStatement':
				return child(node.expression);
			case 'ReturnStatement':
			case 'ThrowStatement':
				return child(node.argument);
			case 'SwitchCase':
				return child(node.test);
			case 'ExportDefaultDeclaration':
				return /Expression$|^Identifier$/.test(node.declaration.type) ? child(node.declaration) : null;
			default:
				/// identifiers, literals, function bodies, optional chains (not split), ...
				return null;
		}
	}

	return search(root);
}

/**
 * Path-copy the AST with the replacements; nodes not on the copied paths are shared
 * @param {Object} root
 * @param {Array} ancestorLists lists of nodes from the root to the replaced nodes
 * @param {Map} replacements AST node -> replacement (or REMOVED for an array element)
 * @param {Array} compounds compound assignments rewritten as `target = <placeholder> op right`
 * @returns {Object}
 * @private
 */
function rewrite(root, ancestorLists, replacements, compounds) {
	'use strict';
	var onPath = new Set();
	ancestorLists.forEach(function (list) {
		list.forEach(function (node) {
			onPath.add(node);
		});
	});

	function copyCompound(node) {
		var right = {
			type: 'BinaryExpression',
			operator: node.operator.slice(0, -1),
			left: placeholder('unknown', node.left),
			right: visit(node.right),
			range: node.range,
			loc: node.loc
		};
		return {type: 'AssignmentExpression', operator: '=', left: node.left, right: right, range: node.range, loc: node.loc};
	}

	function visitChild(value) {
		if (Array.isArray(value)) {
			return value.map(visit).filter(function (item) {
				return item !== REMOVED;
			});
		}
		return (!!value && typeof value === 'object') ? visit(value) : value;
	}

	function visit(node) {
		if (replacements.has(node)) {
			return replacements.get(node);
		}
		if (!onPath.has(node)) {
			return node;
		}
		if (compounds.indexOf(node) !== -1) {
			return copyCompound(node);
		}
		var copy = shallowCopy(node);
		Object.keys(node).forEach(function (key) {
			if (key !== 'range' && key !== 'loc') {
				copy[key] = visitChild(node[key]);
			}
		});
		return copy;
	}

	return visit(root);
}

/**
 * The AST of a branch of the decision: the split operator replaced by the
 * branch, the operands evaluated before the condition by placeholders
 * @private
 */
function branchRoot(root, decision, replacement) {
	'use strict';
	var replacements = new Map(), compounds = [], ancestorLists = [decision.ancestors];
	decision.entries.forEach(function (entry) {
		ancestorLists.push(entry.ancestors);
		if (entry.action === 'placeholder') {
			replacements.set(entry.node, placeholder('unknown', entry.node));
		} else if (entry.action === 'remove') {
			replacements.set(entry.node, REMOVED);
		} else {
			compounds.push(entry.node);
		}
	});
	replacements.set(decision.split, replacement);
	return rewrite(root, ancestorLists, replacements, compounds);
}

/**
 * Expressions evaluated before the condition, in evaluation order
 * @private
 */
function preEvaluatedOf(decision) {
	'use strict';
	return decision.entries.map(function (entry) {
		return (entry.action === 'compound') ? entry.node.left : entry.node;
	});
}

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
	var ast = node.splitOrigin || node.astNode,
		body = loop.astNode.body;
	return !!ast && !!ast.range && !!body.range && ast.range[0] >= body.range[0] && ast.range[1] <= body.range[1];
}

/**
 * Split one node; returns the created nodes (empty when not split)
 * @private
 */
function splitNode(node, context, expressionThrows) {
	'use strict';
	var first = findFirstDecision(context.root);
	if (!first) {
		return [];
	}
	var origin = context.origin,
		exceptionTarget = node.exception,
		created = [];

	function create(ast, path) {
		var created1 = factoryFlowNode.create(FlowNode.NORMAL_NODE_TYPE, ast, node.parent);
		created1.branchPath = path;
		created1.splitOrigin = origin;
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
		if (!context.transfer && isInert(root)) {
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
		if (isInert(root)) {
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
				if (isPlaceholder(root) && (root.known === 'truthy' || root.known === 'falsy')) {
					return (root.known === 'truthy') ? node.true : node.false;
				}
				return decide(root, path, node.true, node.false);
		}
	}

	function expand(root, path, found) {
		var decision = found, choice;
		while (!!decision && (choice = staticChoice(decision.split, decision.condition)) !== null) {
			root = rewrite(root, [decision.ancestors], new Map([[decision.split, choice]]), []);
			decision = findFirstDecision(root);
		}
		if (!decision) {
			return finish(root, path);
		}
		var branches = branchesOf(decision.split);
		var decisionNode = create(decision.condition, path);
		decisionNode.preEvaluated = preEvaluatedOf(decision);
		var trueRoot = branchRoot(root, decision, branches[0]),
			falseRoot = branchRoot(root, decision, branches[1]);
		decisionNode.connect(expand(trueRoot, path + 'T', findFirstDecision(trueRoot)), FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		decisionNode.connect(expand(falseRoot, path + 'F', findFirstDecision(falseRoot)), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
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
	PLACEHOLDER_TYPE: PLACEHOLDER_TYPE
};
