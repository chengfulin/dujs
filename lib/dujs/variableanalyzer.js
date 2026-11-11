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
    var ast = (scope.type === Scope.DOMAIN_TYPE)? null : ((scope.type === Scope.PAGE_TYPE)? scope.ast: scope.ast.body);
	walkes(ast, {
		/// functions declared inside a nested function belong to that function
		FunctionExpression: function () {},
		ArrowFunctionExpression: function () {},
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

    if (scope.type === Scope.FUNCTION_TYPE || scope.type === Scope.ANONYMOUS_FUN_TYPE) {
        addParametersToScope(scope.ast.params, scope);
    }
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

	/// block scopes (marked by the scope tree) entered while walking this scope
	var blockScopes = [];
	function innermostScope() {
		return (blockScopes.length > 0) ? blockScopes[blockScopes.length - 1] : scope;
	}
	function enterBlock(node, recurse) {
		if (!!node.dujsBlockScope) {
			blockScopes.push(node.dujsBlockScope);
			walkes.checkProps(node, recurse);
			blockScopes.pop();
		} else {
			walkes.checkProps(node, recurse);
		}
	}

    var ast = (scope.type === Scope.DOMAIN_TYPE)? null : ((scope.type === Scope.PAGE_TYPE)? scope.ast: scope.ast.body);
	walkes(ast, {
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        ArrowFunctionExpression: function () {},
		BlockStatement: enterBlock,
		ForStatement: enterBlock,
		ForInStatement: enterBlock,
		ForOfStatement: enterBlock,
		SwitchStatement: enterBlock,
		VariableDeclaration: function (node) {
			node.declarations.forEach(function (declarator) {
				if (declarator.id.type !== 'Identifier') {
					return;
				}
				if (node.kind === 'var') { /// hoisted to the function scope
					scope.addLocalVariable(declarator.id.name);
				} else { /// let/const: scoped to the innermost block
					innermostScope().addLexicalVariable(declarator.id.name);
				}
			});
		},
		AssignmentExpression: function (node) {
			if (node.left.type === 'Identifier' &&
				!innermostScope().hasVariable(node.left.name)) {
				scope.addGlobalVariable(node.left.name);
			}
		}
	});
};
/* end-public-methods */

var analyzer = new VariableAnalyzer();
module.exports = analyzer;