/*
 * Validator for AST nodes
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-03
 */
function ASTValidator() {
}

Object.defineProperties(ASTValidator, {
	/**
	 * Default option object for AST parser
	 * @type {Object}
	 * @memberof ASTValidator
	 * @constant
	 */
	DEFAULT_OPTION_OBJECT: {
		value: {
			range: true,
			loc: true
		},
		enumerable: true
	}
});

/**
 * Check for the node is a valid AST node or not
 * @param   {Object}  node      AST node
 * @param   {Object}  [options] Option object
 * @returns {boolean} True if it's valid, false otherwise
 */
ASTValidator.prototype.check = function (node, options) {
    'use strict';
	var opt = options || ASTValidator.DEFAULT_OPTION_OBJECT;
    return (!!node.type) && ((!opt.range)? true : node.range) && ((!opt.loc)? true : node.loc);
};

/**
 * Validate for the object is an AST node or not
 * @param {Object} node    AST node
 * @param {Object} options Option object
 * @param {string} msg     Custom error message
 * @throws "Not an AST node"
 */
ASTValidator.prototype.validate = function (node, options, msg) {
    'use strict';
    if (!this.check(node, options)) {
        throw new Error(msg || 'Not an AST node');
    }
};

/**
 * Check for the AST node is a root of a page
 * @param   {Object}    node   AST node
 * @returns {boolean}   True, if it's, false otherwise
 */
ASTValidator.prototype.isPageAST = function (node) {
	"use strict";
	return this.check(node) && node.type === 'Program';
};

var validator = new ASTValidator();
module.exports = validator;
