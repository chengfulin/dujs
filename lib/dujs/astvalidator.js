/*
 * Validator for AST nodes
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-03
 */
function ASTValidator() {
}

/**
 * Check for the node is a valid AST node or not
 * @param   {Object}  node      AST node
 * @param   {Object}  [options] Option object
 * @returns {boolean} True if it's valid, false otherwise
 */
ASTValidator.prototype.check = function (node, options) {
    'use strict';
    if (!!options) {
        return (!!node.type) && ((!options.range)? true : node.range) && ((!options.loc)? true : node.loc);
    }
    return (!!node.type);
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

var validator = new ASTValidator();
module.exports = validator;
