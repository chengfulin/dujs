/*
 * AnonymousFunctionScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-30
 */
var Scope = require('./scope');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * AnonymousFunctionScope
 * @param {Object} ast AST root of an anonymous function scope
 * @param {Number} index Index of an anonymous function scope
 * @param {Scope} [parent] Parent scope of the anonymous function scope
 * @constructor
 */
function AnonymousFunctionScope(ast, index, parent) {
	"use strict";
	var name = Scope.ANONYMOUS_FUN_NAME + '_' + index;
	internal(this)._index = index;

	Scope.call(this, ast, name, Scope.ANONYMOUS_FUN_TYPE, parent);
}

AnonymousFunctionScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(AnonymousFunctionScope.prototype, 'constructor', {
	value: AnonymousFunctionScope
});

/* start-public-data-members */
Object.defineProperties(AnonymousFunctionScope.prototype, {
	/**
	 * Index of the anonymous function scope
	 * @type {Number}
	 * @memberof AnonymousFunctionScope.prototype
	 */
	index: {
		get: function () {
			"use strict";
			return internal(this)._index;
		}
	}
});
/* end-public-data-members */

module.exports = AnonymousFunctionScope;