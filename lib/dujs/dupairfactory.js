/**
 * Created by ChengFuLin on 2015/5/12.
 */
var DUPair = require('./dupair');

/**
 * Factory of DUPair object
 * @constructor
 */
function DUPairFactory() {
    'use strict';
}

/**
 * Creator for DUPair
 * @param def
 * @param use
 * @returns {DUPair}
 */
DUPairFactory.prototype.create = function (def, use) {
    'use strict';
    return new DUPair(def, use);
};

/**
 * Singleton
 * @type {DUPairFactory}
 */
var factory = new DUPairFactory();
module.exports = factory;