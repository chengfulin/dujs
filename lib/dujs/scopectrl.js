/*
 * Controller for Scopes
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
var factoryScope = require('./scopefactory'),
	factoryScopeTree = require('./scopetreefactory');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * ScopeCtrl
 * @constructor
 */
function ScopeCtrl() {
	"use strict";
	internal(this)._domainScope = factoryScope.createDomainScope();
	internal(this)._pageScopeTrees = [];

	/* start-test-block */
	this._testonly_ = internal(this);
	/* end-test-block */
}

/* start-public-methods */
/**
 * Add scope tree of a page
 * @param {Object} ast AST of the page
 */
ScopeCtrl.prototype.addPageScopeTree = function (ast) {
	"use strict";
	var tree = factoryScopeTree.create();
	tree.buildScopeTree(ast);
	internal(this)._domainScope.addChild(tree.root);
	internal(this)._pageScopeTrees.push(tree);
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(ScopeCtrl.prototype, {
	/**
	 * ScopeTree of pages
	 * @type {Array}
	 * @memberof ScopeCtrl.prototype
	 */
	pageScopeTrees: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._pageScopeTrees);
		},
		enumerable: true
	},
	/**
	 * DomainScope
	 * @type {DomainScope}
	 * @memberof ScopeCtrl.prototype
	 */
	domainScope: {
		get: function () {
			"use strict";
			return internal(this)._domainScope;
		},
		enumerable: true
	}
});
/* end-public-data-members */

var controller = new ScopeCtrl();
module.exports = controller;
