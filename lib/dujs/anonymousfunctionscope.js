/*
 * AnonymousFunctionScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-30
 */
var Scope = require('./scope'),
	astValidator = require('./astvalidator');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * AnonymousFunctionScope
 * @param {Object}  ast         AST root of an anonymous function scope
 * @param {Scope}   [parent]    Parent scope of the anonymous function scope
 * @constructor
 */
function AnonymousFunctionScope(ast, parent) {
	"use strict";
	internal(this)._index = AnonymousFunctionScope.numOfAnonymousFunctionScopes++;
	var name = Scope.ANONYMOUS_FUN_SCOPE_NAME + '_' + internal(this)._index;
	AnonymousFunctionScope.validate(ast, name, Scope.ANONYMOUS_FUN_TYPE, parent);
	Scope.call(this, ast, name, Scope.ANONYMOUS_FUN_TYPE, parent);

	/* start-test-block */
	this._testonly_ = internal(this);
	/* end-test-block */
}

AnonymousFunctionScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(AnonymousFunctionScope.prototype, 'constructor', {
	value: AnonymousFunctionScope
});

/* start-static-data-member */
Object.defineProperties(AnonymousFunctionScope, {
	/**
	 * Number of the instances of AnonymousFunctionScope
	 * @type {number}
	 * @memberof AnonymousFunctionScope
	 */
	numOfAnonymousFunctionScopes: {
		value: 0,
		writable: true,
		enumerable: true
	}
});
/* end-static-data-member */

/* start-static-methods */
/**
 * Reset the counter of AnonymousFunctionScope
 */
AnonymousFunctionScope.resetCounter = function () {
	"use strict";
	this.numOfAnonymousFunctionScopes = 0;
};

/**
 * Check the name of an AnonymousFunctionScope is leading with "$ANONYMOUS_FUN" and end with numbers
 * @param   {string}    name    Name of the AnonymousFunctionScope
 * @returns {boolean}   True, if the name is valid; false, otherwise
 */
AnonymousFunctionScope.isValidName = function (name) {
	"use strict";
	var substringOfIndex = name.substring(Scope.ANONYMOUS_FUN_SCOPE_NAME.length + 1);
	return name.indexOf(Scope.ANONYMOUS_FUN_SCOPE_NAME) === 0 && !isNaN(parseInt(substringOfIndex));
};

/**
 * Validate the value of an AnonymousFunctionScope
 * @param   {Object}    ast         An AST node of this scope
 * @param   {string}    name        Name of the scope
 * @param   {string}    type        Type of the scope
 * @param   {Scope}     [parent]    Parent of the scope
 * @param   {string}    [msg]       Custom error message
 */
AnonymousFunctionScope.validate = function (ast, name, type, parent, msg) {
	"use strict";
	if (!astValidator.isAnonymousFunctionAST(ast) ||
		!this.isValidName(name) ||
		type !== Scope.ANONYMOUS_FUN_TYPE ||
		!Scope.isValidParent(parent)) {
		throw new Error(msg || 'Invalid value for an AnonymousFunctionScope');
	}

};
/* end-static-methods */

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
		},
		enumerable: true
	}
});
/* end-public-data-members */

module.exports = AnonymousFunctionScope;