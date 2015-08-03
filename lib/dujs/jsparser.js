/*
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
