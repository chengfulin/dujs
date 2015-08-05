/*
 * Simple factory for ScopeTree
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
var ScopeTree = require('./scopetree');

function ScopeTreeFactory() {
}

/**
 * Create a ScopeTree
 * @returns {ScopeTree} A ScopeTree
 */
ScopeTreeFactory.prototype.create = function () {
	"use strict";
	return new ScopeTree();
};

var factory = new ScopeTreeFactory();
module.exports = factory;