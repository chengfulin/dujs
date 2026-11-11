/*
 * Helpers for ES2015 binding and assignment patterns (destructuring, default
 * values and rest elements)
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2026-11-11
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
 * Get the names of the variables bound by a pattern (member targets excluded)
 * @param {Object} pattern
 * @returns {Array} Names
 */
BindingPattern.prototype.getBoundNames = function (pattern) {
	'use strict';
	return this.getTargets(pattern).filter(function (target) {
		return target.type === 'Identifier';
	}).map(function (target) {
		return target.name;
	});
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
