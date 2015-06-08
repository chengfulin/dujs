/**
 * Created by ChengFuLin on 2015/5/13.
 */
var Range = require('./range');

/**
 * Range Factory
 * @constructor
 */
function RangeFactory() {
    'use strict';
}

/**
 * Creator of Range object
 * @param start
 * @param end
 * @returns {Range}
 * @throws {Error} when failed to create a Range
 */
RangeFactory.prototype.create = function (start, end) {
    'use strict';
    return new Range(start, end);
};

/**
 * Factory method for range of globals
 * @returns {Range}
 * @function
 */
RangeFactory.prototype.createGlobalRange = function () {
    "use strict";
    return new Range(Range.GLOBAL_RANGE_START, Range.GLOBAL_RANGE_END);
};

/**
 * Singleton
 * @type {RangeFactory}
 */
var factory = new RangeFactory();
module.exports = factory;