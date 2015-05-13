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
 * Singleton
 * @type {RangeFactory}
 */
var factory = new RangeFactory();
module.exports = factory;