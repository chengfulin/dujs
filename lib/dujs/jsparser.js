/**
 * Using esprima JS parser to parse AST
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-27
 */
/** Import esprima module */
var esprima = require('esprima');

/**
 * JS  parser
 * @constructor
 */
function JSParser() {
}

/* start-public-methods */
/**
 * Check if the node is an AST node
 * @param {Object} ast An AST node
 * @returns {Boolean} True if it\'s, false otherwise
 */
JSParser.prototype.isValidAST = function (ast) {
    "use strict";
    return (typeof ast === 'object') && !!ast.type;
};

/**
 * Parse the code to AST with specified options for esprima parser or use the default range and loc options
 * @param {String} code Content of source code
 * @param {Object} [options] Option object
 * @returns {Object} Parsed JS AST
 */
JSParser.prototype.parseAST = function (code, options) {
	'use strict';
	var optionObj = options || {range: true, loc: true};
	if (!optionObj.range) {
		optionObj.range = true;
	}
	if (!optionObj.loc) {
		optionObj.loc = true;
	}
	return esprima.parse(code, optionObj);
};
/* end-public-methods */

var parser = new JSParser();
module.exports = parser;
