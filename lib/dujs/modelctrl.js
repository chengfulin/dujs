/*
 * ModelCtrl module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-06
 */
var namespace = require('../namespace'),
    internal = namespace();
var Map = require('core-js/es6/map');
var scopeCtrl = require('./scopectrl'),
	factoryPageModels = require('./pagemodelsfactory'),
	Model = require('./model');

/**
 * ModelCtrl
 * @constructor
 */
function ModelCtrl() {
    "use strict";
	internal(this)._collectionOfPageModels = new Map(); /// (ScopeTree, PageModels)
    internal(this)._interPageModel = null;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-public-data-members */
Object.defineProperties(ModelCtrl.prototype, {
	/**
	 * Inter-page model
	 * @type {Model}
	 * @memberof ModelCtrl.prototype
	 */
	interPageModel: {
		get: function () {
			"use strict";
			return internal(this)._interPageModel;
		},
		set: function (model) {
			"use strict";
			if (Model.isModel(model)) {
				internal(this)._interPageModel = model;
			}
		}
	},
	/**
	 * Collection of PageModels
	 * @type {Map}
	 * @memberof ModelCtrl.prototype
	 */
	collectionOfPageModels: {
		get: function () {
			"use strict";
			var map = new Map();
			internal(this)._collectionOfPageModels.forEach(function (models, tree) {
				map.set(tree, models);
			});
			return map;
		}
	}
});
/* end-public-data-members */

/* start-public-methods */
/**
 * Check if there is a PageModels of corresponding ScopeTree
 * @param {ScopeTree} scopeTree Corresponding ScopeTree for a page
 * @returns {boolean} True, if there is one; false, otherwise
 */
ModelCtrl.prototype.hasPageModels = function (scopeTree) {
	"use strict";
	return internal(this)._collectionOfPageModels.has(scopeTree);
};

/**
 * Get a PageModels by corresponding ScopeTree
 * @param {ScopeTree} scopeTree
 * @returns {null|PageModels}
 */
ModelCtrl.prototype.getPageModels = function (scopeTree) {
	"use strict";
	var found = null;
	if (this.hasPageModels(scopeTree)) {
		found = internal(this)._collectionOfPageModels.get(scopeTree);
	}
	return found;
};

/**
 * Create and add a PageModels
 * @param {ScopeTree} scopeTree ScopeTree of a page
 */
ModelCtrl.prototype.addPageModels = function (scopeTree) {
	"use strict";
	if (!this.hasPageModels(scopeTree)) {
		var pageModels = factoryPageModels.create(scopeTree);
		internal(this)._collectionOfPageModels.set(scopeTree, pageModels);
	}
};

/**
 * Get intra-page model from a PageModels
 * @param {ScopeTree} pageScopeTree ScopeTree to specify PageModels
 * @param {Scope} scope Matched mainly related scope
 * @returns {null|Model}
 */
ModelCtrl.prototype.getIntraPageModelByMainlyRelatedScopeFromAPageModels = function (pageScopeTree, scope) {
	"use strict";
	var pageModels = this.getPageModels(pageScopeTree);
	var found = null;
	if (!!pageModels) {
		found = pageModels.getIntraPageModelByMainlyRelatedScope(scope);
	}
	return found;
};

/**
 * Get inter-procedural model from a PageModels
 * @param {ScopeTree} pageScopeTree ScopeTree to specify PageModels
 * @param {Scope} scope Matched mainly related scope
 * @returns {null|Model}
 */
ModelCtrl.prototype.getInterProceduralModelByMainlyRelatedScopeFromAPageModels = function (pageScopeTree, scope) {
	"use strict";
	var pageModels = this.getPageModels(pageScopeTree);
	var found = null;
	if (!!pageModels) {
		found = pageModels.getInterProceduralModelByMainlyRelatedScope(scope);
	}
	return found;
};

/**
 * Get intra-procedural model from a PageModels
 * @param {ScopeTree} pageScopeTree ScopeTree to specify PageModels
 * @param {Scope} scope Matched mainly related scope
 * @returns {null|Model}
 */
ModelCtrl.prototype.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels = function (pageScopeTree, scope) {
	"use strict";
	var pageModels = this.getPageModels(pageScopeTree);
	var found = null;
	if (!!pageModels) {
		found = pageModels.getIntraProceduralModelByMainlyRelatedScope(scope);
	}
	return found;
};

/**
 * Initialize PageModels for each page
 */
ModelCtrl.prototype.initializePageModels = function () {
	"use strict";
	scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
		this.addPageModels(pageScopeTree);
	});
};

/**
 * Add an intra-procedural model to a page
 * @param {ScopeTree} pageScopeTree The ScopeTree of a page
 * @param {Model} model An intra-procedural model of a page
 */
ModelCtrl.prototype.addIntraProceduralModelToAPage = function (pageScopeTree, model) {
	"use strict";
	var pageModels = this.getPageModels(pageScopeTree);
	if (!!pageModels) {
		pageModels.addIntraProceduralModel(model);
	}
};

/**
 * Add an inter-procedural model to a page
 * @param {ScopeTree} pageScopeTree The ScopeTree of a page
 * @param {Model} model An inter-procedural model of a page
 */
ModelCtrl.prototype.addInterProceduralModelToAPage = function (pageScopeTree, model) {
	"use strict";
	var pageModels = this.getPageModels(pageScopeTree);
	if (!!pageModels) {
		pageModels.addInterProceduralModel(model);
	}
};

/**
 * Add an intra-page model to a page
 * @param {ScopeTree} pageScopeTree The ScopeTree of a page
 * @param {Model} model An intra-page model of a page
 */
ModelCtrl.prototype.addIntraPageModelToAPage = function (pageScopeTree, model) {
	"use strict";
	var pageModels = this.getPageModels(pageScopeTree);
	if (!!pageModels) {
		pageModels.addIntraPageModel(model);
	}
};
/* end-public-methods */

var controller = new ModelCtrl();
module.exports = controller;