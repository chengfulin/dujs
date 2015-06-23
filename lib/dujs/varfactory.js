/**
 * Created by ChengFuLin on 2015/5/13.
 */
var Var = require('./var'),
    Scope = require('./scope'),
    rangeFactory = require('./rangefactory');

/**
 * Var Factory to create normal, global and returned variable
 * @constructor
 */
function VarFactory() {
    'use strict';
}

/**
 * Creator of normal Var
 * @param name
 * @param range
 * @param scope
 * @param livewith
 * @returns {Var}
 * @throws {Error} when failed to create a Var
 */
VarFactory.prototype.create = function (name, range, scope, livewith) {
    'use strict';
    return new Var(name, range, scope, livewith);
};

/**
 * Creator of Var of returned value
 * @param range
 * @param scope Scope belongs to
 * @returns {Var}
 * @throws {Error} when failed to create a Var
 */
VarFactory.prototype.createReturnVar = function (range, scope) {
    'use strict';
    return new Var(Var.RETURN_VAR_NAME, range, scope);
};

/**
 * Factory method for default return Var
 * @param range
 * @param scope
 * @returns {Var}
 * @function
 */
VarFactory.prototype.createDefaultReturnVar = function (range, scope) {
    "use strict";
    return new Var(Var.DEFAULT_RETURN_VAR_NAME, range, scope);
};

/**
 * Creator of global Var
 * @param name
 * @returns {Var}
 * @throws {Error} when failed to create a Vae
 */
VarFactory.prototype.createGlobalVar = function (name) {
    'use strict';
    return new Var(name, rangeFactory.createGlobalRange(), Scope.GLOBAL_SCOPE);
};

/**
 * Singleton
 * @type {VarFactory}
 */
var factory = new VarFactory();
module.exports = factory;