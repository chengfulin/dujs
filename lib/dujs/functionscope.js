/**
 * FunctionScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-30
 */
var Scope = require('./scope');

/**
 * FunctionScope
 * @param {Object} ast AST root of the function scope
 * @param {String} name Name of the function scope
 * @param {Scope} [parent] Parent scope of the function scope
 * @constructor
 */
function FunctionScope(ast, name, parent) {
	"use strict";
	Scope.call(this, ast, name, Scope.FUNCTION_TYPE, parent);
}

FunctionScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(FunctionScope.prototype, 'constructor', {
	value: FunctionScope
});

module.exports = FunctionScope;