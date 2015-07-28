/*
 * PageScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-28
 */
var Scope = require('./scope');

/**
 * PageScope
 * @param {Object} cfg CFG of the page scope
 * @param {String} name Name of the page scope
 * @param {Object} parent Parent scope
 * @constructor
 */
function PageScope(cfg, name, parent) {
	"use strict";
	Scope.call(this, cfg, name, Scope.PAGE_TYPE, parent);
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
	}
});
/* end-public-data-members */