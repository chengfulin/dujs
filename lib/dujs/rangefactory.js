/*
 * Simple factory for Range class
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-30
 */
var Range = require('./range');

/**
 * RangeFactory
 * @constructor
 */
function RangeFactory() {
}

/**
 * Creator of Range object
 * @param {*} start
 * @param {*} end
 * @returns {Range}
 */
RangeFactory.prototype.create = function (start, end) {
    'use strict';
    return new Range(start, end);
};

/**
 * Factory method for range of globals
 * @returns {Range}
 */
RangeFactory.prototype.createGlobalRange = function () {
    "use strict";
    return new Range(Range.GLOBAL_RANGE_START, Range.GLOBAL_RANGE_END);
};

var factory = new RangeFactory();
module.exports = factory;