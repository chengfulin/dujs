/*
 * Simple factory for PageModels
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-06
 */
var PageModels = require('./pagemodels');

function PageModelsFactory() {
}

/**
 * Factory method for PageModels
 * @param {ScopeTree} scopeTree
 * @returns {PageModels}
 */
PageModelsFactory.prototype.create = function (scopeTree) {
	"use strict";
	return new PageModels(scopeTree);
};

var factory = new PageModelsFactory();
module.exports = factory;