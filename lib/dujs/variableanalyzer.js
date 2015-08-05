/*
 * VariableAnalyzer module, analyzing local variables in a scope
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-29
 */
var walkes = require('walkes');
var Scope = require('./scope');

/**
 * VariableAnalyzer
 * @constructor
 */
function VariableAnalyzer() {
}

/* start-private-methods */
/**
 * Set inner function variables of a scope
 * @param {Scope} scope A scope object
 * @private
 */
function setInnerFunctionVariables(scope) {
	"use strict";
	Scope.validateType(scope, 'Try to analyze function variable with non-Scope object');
	walkes(scope.ast, {
		/// Add function name as local variable
		FunctionDeclaration: function (node) {
			scope.addInnerFunctionVariable(node.id.name);
		}
	});
}

/**
 * Set parameters of a function scope
 * @param {Scope} scope A function scope
 * @private
 */
function setParameters(scope) {
	"use strict";
	Scope.validateType(scope, 'Try to analyze parameter with non-Scope object');
	function addParametersToScope(params, scope) {
		params.forEach(function (param) {
			scope.addParameter(param.name);
		});
	}

	walkes(scope.ast, {
		FunctionDeclaration: function (node) {
			addParametersToScope(node.params, scope);
		},
		FunctionExpression: function (node) {
			addParametersToScope(node.params, scope);
		}
	});
}
/* end-private-methods */

/* start-public-methods */
/**
 * Set local variables of a scope
 * @param {Scope} scope A scope object
 */
VariableAnalyzer.prototype.setLocalVariables = function (scope) {
	"use strict";
	scope.setBuiltInObjectVariables();
	setInnerFunctionVariables(scope);
	setParameters(scope);

	var recursive = false;
	function recurseToFunctionBody(node, callback) {
		if (!recursive) {
			recursive = true;
			callback(node.body.body);
		}
	}

	walkes(scope.ast, {
		FunctionDeclaration: function (node, recurse) {
			if (Scope.type === Scope.FUNCTION_TYPE) {
				recurseToFunctionBody(node, recurse);
			}
		},
		FunctionExpression: function (node, recurse) {
			if (Scope.type === Scope.ANONYMOUS_FUN_TYPE) {
				recurseToFunctionBody(node, recurse);
			}
		},
		VariableDeclaration: function (node, recurse) {
			node.declarations.forEach(function (declarator) {
				recurse(declarator);
			});
		},
		VariableDeclarator: function (node) {
			scope.addLocalVariable(node.id.name);
		},
		AssignmentExpression: function (node) {
			if (node.left.type === 'Identifier' &&
				!scope.hasVariable(node.left.name)) {
				scope.addGlobalVariable(node.left.name);
			}
		}
	});
};
/* end-public-methods */

var analyzer = new VariableAnalyzer();
module.exports = analyzer;