/*
 * Simple factory for Pair object
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-07
 */
var Pair = require('./pair');

/**
 * PairFactory
 * @constructor
 */
function PairFactory() {
}

/* start-public-methods */
/**
 * Creator of Pair object
 * @param first
 * @param second
 * @returns {Pair}
 */
PairFactory.prototype.create = function (first, second) {
    'use strict';
    return new Pair(first, second);
};
/* end-public-methods */

var factory = new PairFactory();
module.exports  = factory;