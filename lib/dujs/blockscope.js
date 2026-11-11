/*
 * BlockScope module: a lexical scope of a block, a for/for-in/for-of loop or a
 * switch statement that directly declares let/const/class bindings (ES2015)
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2026-11-11
 */
var Scope = require('./scope'),
	astValidator = require('./astvalidator');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * BlockScope
 * A block scope does not own a CFG model; its nodes belong to the model of the
 * enclosing function or page scope and resolve variables through this scope.
 * @param {Object} ast AST node creating the block scope
 * @param {Scope} [parent] Parent scope
 * @constructor
 * @extends Scope
 */
function BlockScope(ast, parent) {
	"use strict";
	var index = BlockScope.numOfBlockScopes++;
	var name = Scope.BLOCK_SCOPE_NAME + '_' + index;
	BlockScope.validate(ast, parent);
	Scope.call(this, ast, name, Scope.BLOCK_TYPE, parent);

	internal(this)._index = index;
}

BlockScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(BlockScope.prototype, 'constructor', {
	value: BlockScope
});

/* start-static-data-member */
Object.defineProperties(BlockScope, {
	/**
	 * Counter of created block scopes, used to name them
	 * @type {Number}
	 * @memberof BlockScope
	 */
	numOfBlockScopes: {
		value: 0,
		writable: true,
		enumerable: true
	}
});
/* end-static-data-member */

/* start-static-methods */
/**
 * Reset the counter of block scopes
 * @function
 */
BlockScope.resetCounter = function () {
	"use strict";
	this.numOfBlockScopes = 0;
};

/**
 * Validate the value of a BlockScope
 * @param {Object} ast AST node of this scope
 * @param {Scope} [parent] Parent of the scope
 * @param {string} [msg] Custom error message
 */
BlockScope.validate = function (ast, parent, msg) {
	"use strict";
	if (!astValidator.check(ast) || !Scope.isValidParent(parent)) {
		throw new Error(msg || 'Invalid value for a BlockScope');
	}
};
/* end-static-methods */

/* start-public-data-members */
Object.defineProperties(BlockScope.prototype, {
	/**
	 * Index of the block scope
	 * @type {Number}
	 * @memberof BlockScope.prototype
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

module.exports = BlockScope;
