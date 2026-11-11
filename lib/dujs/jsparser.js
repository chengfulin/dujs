/*
 * Using espree JS parser to parse AST (ESTree format)
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2026-11-11
 */
var espree = require('espree');

/**
 * JS  parser
 * @constructor
 */
function JSParser() {
}

/**
 * Parse the code to AST with specified options for espree parser.
 * range and loc are always enabled; ecmaVersion defaults to the latest
 * supported version and sourceType defaults to "script".
 * @param {String} code Content of source code
 * @param {Object} [options] Option object
 * @returns {Object} Parsed JS AST
 */
JSParser.prototype.parseAST = function (code, options) {
	'use strict';
	var optionObj = Object.assign({ecmaVersion: 'latest', sourceType: 'script'}, options);
	optionObj.range = true;
	optionObj.loc = true;
	return espree.parse(code, optionObj);
};
/* end-public-methods */

var parser = new JSParser();
module.exports = parser;
