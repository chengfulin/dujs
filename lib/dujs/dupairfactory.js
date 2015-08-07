/*
 * Simple factory for DUPair
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-07
 */
var DUPair = require('./dupair');

/**
 * Factory of DUPair object
 * @constructor
 */
function DUPairFactory() {
}

/**
 * Creator for DUPair
 * @param {FlwoNode} def
 * @param {FlowNode} use
 * @returns {DUPair} Instance of DUPair
 */
DUPairFactory.prototype.create = function (def, use) {
    'use strict';
    return new DUPair(def, use);
};

var factory = new DUPairFactory();
module.exports = factory;