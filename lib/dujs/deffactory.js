/**
 * Created by ChengFuLin on 2015/5/12.
 */
var Def = require('./def'),
    Scope = require('./scope');

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
 * @param scope
 * @returns {Def}
 * @throws {Error} when a value is invalid
 */
DefFactory.prototype.create = function (from, type, scope) {
    'use strict';
    return new Def(from, type, scope);
};

/**
 * Creator of parameter definition
 * @param functionScope
 * @param type
 * @returns {*|Def}
 * @throws {Error} when a value of Def is invalid
 */
DefFactory.prototype.createParamDef = function (functionScope, type) {
    'use strict';
    return new Def(functionScope.getCFG()[0], type, functionScope.getScope());
};

/**
 * Singleton
 * @type {DefFactory}
 */
var factory = new DefFactory();
module.exports = factory;