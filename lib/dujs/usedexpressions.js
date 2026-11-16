/*
 * The expressions read by a CFG node and how their roots are read: the rules
 * of each kind of node (split nodes, switch cases, for-in/for-of loop heads,
 * single identifiers), kept apart from the walk that finds the variables
 * (DefUseAnalyzer.findUSESet in lib/dujs/defuseanalyzer.js)
 *
 * Original dujs code, MIT License (see LICENSE).
 * See specs/002-small-refactors/research.md R6.
 *
 * Each item is {expression, read}, where read is
 * - 'c-use': every variable read by the expression is a c-use (expressions
 *   evaluated before the condition of a decision node, a split leaf or the
 *   object of a with statement that is a single identifier);
 * - 'p-use': the walk starts as a p-use (the discriminant read by a case, the
 *   single identifier condition of a decision node);
 * - 'walk': the walk starts as a c-use and follows the walking rules.
 *
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var bindingPattern = require('./bindingpattern');

/**
 * Expressions read by the head of a for-in/for-of loop: the object of a
 * member target, defaults and computed keys of a destructuring target, then
 * the iterated object unless it is split before the loop node
 * (FlowNode.loopRightSplit); the loop variable and the body are not read.
 * Also used by findUSESet for a loop nested in a walked function body.
 * @param {Object} node ForInStatement or ForOfStatement
 * @param {boolean} rightSplit Whether the right side is split before the loop node
 * @returns {Array}
 */
function loopHeadExpressions(node, rightSplit) {
	'use strict';
	var left = (node.left.type === 'VariableDeclaration') ? node.left.declarations[0].id : node.left,
		expressions = [];
	if (left.type === 'MemberExpression') {
		expressions.push(left.object);
	}
	expressions = expressions.concat(bindingPattern.getEvaluatedExpressions(left));
	if (!rightSplit) {
		expressions.push(node.right);
	}
	return expressions;
}

/**
 * Expressions read for the astNode of the node
 * @param {FlowNode} cfgNode
 * @returns {Array} items of {expression, read}
 * @private
 */
function astNodeItems(cfgNode) {
	'use strict';
	var node = cfgNode.astNode;
	if (!node) {
		return [];
	}
	if (node.type === 'SwitchCase') {
		/// the test of a case is not read; a split discriminant is evaluated by the split nodes before the first case
		var readsDiscriminant = !!node.test && !!cfgNode.parent && cfgNode.parent.type === 'SwitchStatement' &&
			!cfgNode.discriminantSplit;
		return readsDiscriminant ? [{expression: cfgNode.parent.discriminant, read: 'p-use'}] : [];
	}
	if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
		/// the loop node only reads its head; its body has its own nodes
		return loopHeadExpressions(node, cfgNode.loopRightSplit).map(function (expression) {
			return {expression: expression, read: 'walk'};
		});
	}
	if (node.type === 'Identifier') {
		/// a decision node branches on it, a split leaf and the object of a with statement use it; `a;` does not
		if (!!cfgNode.true || !!cfgNode.false) {
			return [{expression: node, read: 'p-use'}];
		}
		return (cfgNode.split !== null || !!cfgNode.isWithObject) ? [{expression: node, read: 'c-use'}] : [];
	}
	return [{expression: node, read: 'walk'}];
}

/**
 * Expressions read by a CFG node in evaluation order: the expressions of
 * split.preEvaluated (all c-uses), then those read for the astNode
 * @param {FlowNode} cfgNode
 * @returns {Array} items of {expression: Object, read: string}
 */
function usedExpressionsOf(cfgNode) {
	'use strict';
	var preEvaluated = !!cfgNode.split ? cfgNode.split.preEvaluated : [];
	return preEvaluated.map(function (expression) {
		return {expression: expression, read: 'c-use'};
	}).concat(astNodeItems(cfgNode));
}

module.exports = {
	usedExpressionsOf: usedExpressionsOf,
	loopHeadExpressions: loopHeadExpressions
};
