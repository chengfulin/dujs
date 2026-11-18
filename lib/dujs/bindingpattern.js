/*
 * Helpers for ES2015 binding and assignment patterns (destructuring, default
 * values and rest elements)
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */

/**
 * BindingPattern
 * @constructor
 */
function BindingPattern() {
	'use strict';
}

/* start-public-methods */
/**
 * Get the target nodes defined by a pattern: Identifier nodes, and
 * MemberExpression nodes for assignment patterns like [a.b] = list
 * @param {Object} pattern Identifier, ObjectPattern, ArrayPattern, AssignmentPattern, RestElement or MemberExpression
 * @returns {Array} Target nodes, in source order
 */
BindingPattern.prototype.getTargets = function (pattern) {
	'use strict';
	var targets = [];
	(function collect(node) {
		if (!node) {
			return;
		}
		switch (node.type) {
			case 'Identifier':
			case 'MemberExpression':
				targets.push(node);
				break;
			case 'ObjectPattern':
				node.properties.forEach(function (property) {
					collect(property.type === 'RestElement' ? property.argument : property.value);
				});
				break;
			case 'ArrayPattern':
				node.elements.forEach(collect);
				break;
			case 'AssignmentPattern':
				collect(node.left);
				break;
			case 'RestElement':
				collect(node.argument);
				break;
		}
	}(pattern));
	return targets;
};

/**
 * Get the expressions read to assign to the member targets of a pattern: the
 * object of each MemberExpression target, followed by its property when the
 * key is computed, in pattern order (feature 008 FR-002, research R2-2;
 * contracts/lib-api.md §4); defaults and computed keys of the pattern are not
 * included (getEvaluatedExpressions)
 * @param {Object} pattern Pattern, Identifier or MemberExpression
 * @returns {Array} Expression nodes
 */
BindingPattern.prototype.getMemberTargetReads = function (pattern) {
	'use strict';
	var reads = [];
	this.getTargets(pattern).forEach(function (target) {
		if (target.type !== 'MemberExpression') {
			return;
		}
		reads.push(target.object);
		if (target.computed) {
			reads.push(target.property);
		}
	});
	return reads;
};

/**
 * Get the expressions evaluated when a pattern is destructured, whose
 * variables are used: default values and computed property keys
 * @param {Object} pattern
 * @returns {Array} Expression nodes
 */
BindingPattern.prototype.getEvaluatedExpressions = function (pattern) {
	'use strict';
	var expressions = [];
	(function collect(node) {
		if (!node) {
			return;
		}
		switch (node.type) {
			case 'ObjectPattern':
				node.properties.forEach(function (property) {
					if (property.type === 'RestElement') {
						collect(property.argument);
						return;
					}
					if (property.computed) {
						expressions.push(property.key);
					}
					collect(property.value);
				});
				break;
			case 'ArrayPattern':
				node.elements.forEach(collect);
				break;
			case 'AssignmentPattern':
				expressions.push(node.right);
				collect(node.left);
				break;
			case 'RestElement':
				collect(node.argument);
				break;
		}
	}(pattern));
	return expressions;
};

/**
 * Check whether a node is a destructuring pattern
 * @param {Object} node
 * @returns {boolean}
 */
BindingPattern.prototype.isPattern = function (node) {
	'use strict';
	return !!node && (node.type === 'ObjectPattern' || node.type === 'ArrayPattern' ||
		node.type === 'AssignmentPattern' || node.type === 'RestElement');
};
/* end-public-methods */

var singleton = new BindingPattern();
module.exports = singleton;
