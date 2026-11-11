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
 * supported version. Without a sourceType option, the code is parsed as a
 * script, or as a module if it is not a valid script (import/export or
 * top-level await); the error of parsing as a script is thrown if both fail.
 * @param {String} code Content of source code
 * @param {Object} [options] Option object
 * @returns {Object} Parsed JS AST
 */
JSParser.prototype.parseAST = function (code, options) {
	'use strict';
	var optionObj = Object.assign({ecmaVersion: 'latest'}, options);
	optionObj.range = true;
	optionObj.loc = true;
	if (!!optionObj.sourceType) {
		return espree.parse(code, optionObj);
	}
	try {
		return espree.parse(code, Object.assign({}, optionObj, {sourceType: 'script'}));
	} catch (scriptError) {
		try {
			return espree.parse(code, Object.assign({}, optionObj, {sourceType: 'module'}));
		} catch {
			throw scriptError;
		}
	}
};
/* end-public-methods */

var parser = new JSParser();
module.exports = parser;
