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
 * - 'p-use': the condition mode (the condition of a decision node, the
 *   discriminant read by a case): every variable read is a p-use, except in the
 *   subtrees of the arguments of a call or new (and the expressions of a tagged
 *   template), which are c-uses (specs/004-fix-remaining-issues FR-001, R1);
 * - 'walk': the walk starts as a c-use and follows the walking rules.
 *
 * The head of a for-in/for-of loop also reads the objects and computed keys
 * of its member targets (feature 008 FR-002), which needs the binding of the
 * page to exempt the domain localStorage (loopHeadExpressions).
 *
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var bindingPattern = require('./bindingpattern'),
	FlowNode = require('../esgraph/flownode');

/**
 * Whether a member target is exempted from the reads of feature 008 FR-002
 * (D004, D008): its object variable (the Identifier reached along the
 * MemberExpression.object chain; none when the chain reaches a call, this or
 * another expression, D013) is the domain localStorage
 * (binding.isLocalStorageObject); the same judgement as
 * defuseanalyzer.isExemptMemberTarget
 * @param {Object} member MemberExpression
 * @param {PageBinding|null} [binding]
 * @returns {boolean} false without a binding (nothing is exempted)
 * @private
 */
function isExemptMemberTarget(member, binding) {
	'use strict';
	return !!binding && binding.isLocalStorageMemberTarget(member);
}

/**
 * Expressions read by the head of a for-in/for-of loop: the object of a
 * member target and its computed key, defaults and computed keys of a
 * destructuring target and the objects and computed keys of its member
 * targets (feature 008 FR-002, R2-3; contracts/lib-api.md §5), then the
 * iterated object unless it is split before the loop node
 * (FlowNode.loopRightSplit); the loop variable and the body are not read.
 * A member target of the domain localStorage keeps the develop reads (the
 * object of a member target, nothing for a member target of a pattern; D004).
 * @param {Object} node ForInStatement or ForOfStatement
 * @param {boolean} rightSplit Whether the right side is split before the loop node
 * @param {PageBinding|null} [binding] Binding of the page for the exemption; null or undefined exempts nothing
 * @returns {Array}
 */
function loopHeadExpressions(node, rightSplit, binding) {
	'use strict';
	var left = (node.left.type === 'VariableDeclaration') ? node.left.declarations[0].id : node.left,
		expressions = [];
	if (left.type === 'MemberExpression') {
		expressions.push(left.object);
		if (left.computed && !isExemptMemberTarget(left, binding)) {
			expressions.push(left.property);
		}
	}
	expressions = expressions.concat(bindingPattern.getEvaluatedExpressions(left));
	if (bindingPattern.isPattern(left)) {
		expressions = expressions.concat(bindingPattern.getMemberTargetReads(left, function (target) {
			return isExemptMemberTarget(target, binding);
		}));
	}
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
		return loopHeadExpressions(node, cfgNode.loopRightSplit, !!cfgNode.scope ? cfgNode.scope.binding : null).map(function (expression) {
			return {expression: expression, read: 'walk'};
		});
	}
	if (node.type === 'CatchClause') {
		/// the catch clause node only reads the evaluated expressions of its parameter (defaults, computed
		/// keys); its body has its own nodes (feature 006 D4, research R10)
		return (!!node.param ? bindingPattern.getEvaluatedExpressions(node.param) : []).map(function (expression) {
			return {expression: expression, read: 'walk'};
		});
	}
	if (node.type === 'Identifier') {
		/// a decision node branches on it, a split leaf and the object of a with statement use it; `a;` does not
		if (!!cfgNode.true || !!cfgNode.false) {
			return [{expression: node, read: 'p-use'}];
		}
		return (!!cfgNode.split || !!cfgNode.isWithObject) ? [{expression: node, read: 'c-use'}] : [];
	}
	/// the condition of a decision node is read in the condition mode
	return [{expression: node, read: (!!cfgNode.true || !!cfgNode.false) ? 'p-use' : 'walk'}];
}

/**
 * Expressions read by a CFG node in evaluation order: the expressions of
 * split.preEvaluated (all c-uses), then those read for the astNode; the entry
 * and exit nodes of a function or page read nothing, as in
 * callsplit.evaluatedExpressionsOf (feature 005 FR-008, research R7; the
 * former modelbuilder.expressionsEvaluatedAtNode was removed by feature 007)
 * @param {FlowNode} cfgNode
 * @returns {Array} items of {expression: Object, read: string}
 */
function usedExpressionsOf(cfgNode) {
	'use strict';
	if (cfgNode.type === FlowNode.ENTRY_NODE_TYPE || cfgNode.type === FlowNode.EXIT_NODE_TYPE) {
		return [];
	}
	var preEvaluated = !!cfgNode.split ? cfgNode.split.preEvaluated : [];
	return preEvaluated.map(function (expression) {
		return {expression: expression, read: 'c-use'};
	}).concat(astNodeItems(cfgNode));
}

module.exports = {
	usedExpressionsOf: usedExpressionsOf,
	loopHeadExpressions: loopHeadExpressions
};
