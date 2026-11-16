/*
 * Rewrite the AST of a decision into the ASTs of its branches: each branch
 * works on a path-copied synthetic AST where the split operator is replaced
 * by the selected operand, or by an evaluated-value placeholder
 * (`DujsEvaluatedValue`) for a value already computed at the decision. The
 * input AST is never modified; subtrees not on the copied paths are shared
 * with the original AST (a function or class expression keeps one scope).
 * Part of the branch splitting of lib/esgraph/branchsplitter.js; the
 * decisions come from lib/esgraph/decisionfinder.js.
 *
 * Original dujs code, MIT License (see LICENSE); this file contains no code
 * derived from esgraph.
 * See specs/001-fix-known-issues/research.md R1 ~ R3 and data-model.md §1 ~ §2.
 *
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var decisionfinder = require('./decisionfinder');

/// marker of an array element removed from a copied node (a declarator moved to preEvaluated)
var REMOVED = {};

var NULLISH_OPERATORS = ['??', '??='];

/**
 * Create an evaluated-value placeholder replacing an expression
 * @param {string} known 'truthy', 'falsy', 'nonnull' or 'unknown'
 * @param {Object} replaced AST node replaced by the placeholder
 * @returns {Object}
 * @private
 */
function placeholder(known, replaced) {
	'use strict';
	return {type: decisionfinder.PLACEHOLDER_TYPE, known: known, range: replaced.range, loc: replaced.loc};
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
	if (!decisionfinder.isPlaceholder(condition) || condition.known === 'unknown') {
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

module.exports = {
	placeholder: placeholder,
	branchesOf: branchesOf,
	staticChoice: staticChoice,
	rewrite: rewrite,
	branchRoot: branchRoot
};
