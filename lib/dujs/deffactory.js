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
 * Creator of global definition
 * @param type
 * @param range
 * @returns {Def}
 * @throws {Error} when a value is invalid
 */
DefFactory.prototype.createGlobalDef = function (type, range) {
    'use strict';
    return new Def(0, type, range, Scope.GLOBAL_SCOPE);
};

/**
 * Creator of parameter definition
 * @param functionScope
 * @param type
 * @param range Should be equal to var of parameter's
 * @returns {*|Def}
 * @throws {Error} when a value of Def is invalid
 */
DefFactory.prototype.createParamDef = function (functionScope, type, range) {
    'use strict';
    return new Def(functionScope.getCFG()[0].cfgId, type, range, functionScope.getScope());
};

/**
 * Singleton
 * @type {DefFactory}
 */
var factory = new DefFactory();
module.exports = factory;