/**
 * Created by ChengFuLin on 2015/5/12.
 */
var Def = require('./def');

/**
 * Constructor of DefFactory
 * @constructor
 */
function DefFactory() {
    'use strict';
}

/**
 * Creator of Def object
 * @param from
 * @param type
 * @param range
 * @param scope
 * @returns {Def}
 * @throws {Error} when a value is invalid
 */
DefFactory.prototype.create = function (from, type, range, scope) {
    'use strict';
    return new Def(from, type, range, scope);
};

/**
 * Singleton
 * @type {DefFactory}
 */
var factory = new DefFactory();
module.exports = factory;