/*
 * Using espree JS parser to parse AST (ESTree format)
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var espree = require('espree');

/**
 * JS  parser
 * @constructor
 */
function JSParser() {
}

/**
 * ECMAScript version for parsing and for the scope analysis (eslint-scope,
 * lib/dujs/scopebinding.js): the latest version supported by espree
 * @type {number}
 * @constant
 */
Object.defineProperty(JSParser.prototype, 'ECMA_VERSION', {
	value: espree.latestEcmaVersion,
	enumerable: true
});

/**
 * Parse the code to AST with specified options for espree parser.
 * range and loc are always enabled; ecmaVersion defaults to the latest
 * supported version (ECMA_VERSION). Without a sourceType option, the code is parsed as a
 * script, or as a module if it is not a valid script (import/export or
 * top-level await); the error of parsing as a script is thrown if both fail.
 * @param {String} code Content of source code
 * @param {Object} [options] Option object
 * @returns {Object} Parsed JS AST
 */
JSParser.prototype.parseAST = function (code, options) {
	'use strict';
	var optionObj = Object.assign({ecmaVersion: JSParser.prototype.ECMA_VERSION}, options);
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
		} catch (ignoredModuleError) {
			throw scriptError;
		}
	}
};
/* end-public-methods */

var parser = new JSParser();
module.exports = parser;
