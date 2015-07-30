/*
 * PageScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-30
 */
var Scope = require('./scope');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * PageScope
 * @param {Object} ast AST root of the scope
 * @param {Number} index Index of a page scope
 * @param {Scope} [parent] Parent scope
 * @constructor
 */
function PageScope(ast, index, parent) {
	"use strict";
	var name = Scope.PAGE_SCOPE_NAME + '_' + index;
	internal(this)._index = index;

	Scope.call(this, ast, name, Scope.PAGE_TYPE, parent);
}

PageScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(PageScope.prototype, 'constructor', {
	value: PageScope
});

/* start-public-data-members */
Object.defineProperties(PageScope.prototype, {
	/**
	 * Array of build-in objects
	 * @type {Array}
	 * @memberof PageScope.prototype
	 * @inheritdoc
	 */
	builtInObjects: {
		get: function () {
			"use strict";
			/* manual */
			return [
				{name: "window", def: "htmlDom"},
				{name: "document", def: "htmlDom"},
				{name: "String", def: "object"},
				{name: "Number", def: "object"},
				{name: "Boolean", def: "object"},
				{name: "Array", def: "object"},
				{name: "Map", def: "object"},
				{name: "WeakMap", def: "object"},
				{name: "Set", def: "object"},
				{name: "Date", def: "object"}
			];
		}
	},
	/**
	 * Index of the page scope
	 * @type {Number}
	 * @memberof PageScope.prototype
	 */
	index: {
		get: function () {
			"use strict";
			return internal(this)._index;
		}
	}
});
/* end-public-data-members */

module.exports = PageScope;