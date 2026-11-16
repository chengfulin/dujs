/*
 * Find the first decision (in evaluation order) of an AST: the split operator,
 * its condition and the operands evaluated before the condition. Only reads
 * the AST; part of the branch splitting of lib/esgraph/branchsplitter.js,
 * which rewrites the AST (lib/esgraph/astrewriter.js) and the CFG.
 *
 * Original dujs code, MIT License (see LICENSE); this file contains no code
 * derived from esgraph.
 *
 * The split operators are `?:`, `&&`, `||`, `??`, `&&=`, `||=` and `??=`;
 * the decision is the first condition in evaluation order. The operands
 * evaluated before it are recorded as entries, which a branch replaces by an
 * evaluated-value placeholder (`DujsEvaluatedValue`) for a value already
 * computed at the decision.
 * See specs/001-fix-known-issues/research.md R1 ~ R3 and data-model.md §1 ~ §2.
 *
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var PLACEHOLDER_TYPE = 'DujsEvaluatedValue';

var LOGICAL_ASSIGNMENTS = ['&&=', '||=', '??='];

/// node types structural to their parent: their children are operands, not themselves
var STRUCTURAL_TYPES = ['SpreadElement', 'Property'];

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
 * Expressions evaluated before the condition, in evaluation order
 * @private
 */
function preEvaluatedOf(decision) {
	'use strict';
	return decision.entries.map(function (entry) {
		return (entry.action === 'compound') ? entry.node.left : entry.node;
	});
}

module.exports = {
	findFirstDecision: findFirstDecision,
	preEvaluatedOf: preEvaluatedOf,
	isInert: isInert,
	isPlaceholder: isPlaceholder,
	PLACEHOLDER_TYPE: PLACEHOLDER_TYPE
};
