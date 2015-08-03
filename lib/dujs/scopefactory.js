/*
 * Simple factory for Scope
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-28
 */
var PageScope = require('./pagescope'),
	DomainScope = require('./domainscope'),
	FunctionScope = require('./functionscope'),
	AnonymousFunctionScope = require('./anonymousfunctionscope');
var namespace = require('../namespace'),
    internal = namespace();

/**
 * Simple factory for the Scope class
 * @constructor
 */
function ScopeFactory() {
    "use strict";
	internal(this)._numOfPageScopes = 0;
    internal(this)._numOfAnonymousFunctionScopes = 0;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-public-data-members */
Object.defineProperties(ScopeFactory.prototype, {
	/**
	 * Number of the counter of anonymous function scopes
	 * @type {Number}
	 * @memberof ScopeFactory.prototype
	 */
	numOfAnonymousFunctionScopes: {
	    get: function () {
	        "use strict";
	        return internal(this)._numOfAnonymousFunctionScopes;
	    },
	    set: function (num) {
	        "use strict";
	        if (typeof num === 'number' && num >= 0) {
	            internal(this)._numOfAnonymousFunctionScopes = num;
	        }
	    }
	},
	/**
	 * Number of the counter of page scopes
	 * @type {Number}
	 * @memberof ScopeFactory.prototype
	 */
	numOfPageScopes: {
		get: function () {
			"use strict";
			return internal(this)._numOfPageScopes;
		},
		set: function (num) {
			"use strict";
			if (typeof num === 'number' && num >= 0) {
				internal(this)._numOfPageScopes = num;
			}
		}
	}
});
/* end-public-data-members */

/* start-public-methods */
/**
 * Reset the counter of number of anonymous function Scope
 */
ScopeFactory.prototype.resetAnonymousFunctionScopeCounter = function () {
    "use strict";
    internal(this)._numOfAnonymousFunctionScopes = 0;
};

/**
 * Reset the counter of number of page scopes
 */
ScopeFactory.prototype.resetPageScopeCounter = function () {
	"use strict";
	internal(this)._numOfPageScopes = 0;
};

/**
 * Factory method for page scopes
 * @param {Object} ast AST root of the page scope
 * @param {Scope} [parent] Parent scope
 * @returns {PageScope} A scope with page scope type and name
 */
ScopeFactory.prototype.createPageScope = function (ast, parent) {
    "use strict";
	var pageScopeIndex = internal(this)._numOfPageScopes++;
    return new PageScope(ast, pageScopeIndex, parent);
};

/**
 * Factory method for the domain scope
 * @returns {DomainScope} A scope with domain scope type and name
 */
ScopeFactory.prototype.createDomainScope = function () {
    "use strict";
    return new DomainScope();
};

/**
 * Factory method for function scopes
 * @param {Object} ast AST root of the function scope
 * @param {String} funName Name of the function
 * @param {Scope} [parent] Parent scope
 * @returns {FunctionScope} A scope with function name and function scope type
 */
ScopeFactory.prototype.createFunctionScope = function (ast, funName, parent) {
    "use strict";
    return new FunctionScope(ast, funName, parent);
};

/**
 * Factory method for anonymous function scopes
 * @param {Object} ast AST root of an anonymous function scope
 * @param {Scope} [parent] Parent scope
 * @returns {AnonymousFunctionScope} A scope with indexed anonymous function scope name and anonymous function scope type
 */
ScopeFactory.prototype.createAnonymousFunctionScope = function (ast, parent) {
    "use strict";
	var anonymousFunctionIndex = internal(this)._numOfAnonymousFunctionScopes++;
    return new AnonymousFunctionScope(ast, anonymousFunctionIndex, parent);
};
/* end-public-methods */

var singleton = new ScopeFactory();
module.exports = singleton;