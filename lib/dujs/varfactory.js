/**
 * Created by ChengFuLin on 2015/5/13.
 */
var Var = require('./var'),
    Range = require('./range'),
    Scope = require('./scope'),
    namespace = require('./namespace'),
    internal = namespace(),
    rangeFactory = require('./rangefactory');

/**
 * Var Factory to create normal, global and returned variable
 * @constructor
 */
function VarFactory() {
    'use strict';
    internal(this).numOfGlobals = 0;
}

/**
 * Creator of normal Var
 * @param name
 * @param scope
 * @param livewith
 * @returns {Var}
 * @throws {Error} when failed to create a Var
 */
VarFactory.prototype.create = function (name, scope, livewith) {
    'use strict';
    return new Var(name, scope, livewith);
};

/**
 * Creator of Var of returned value
 * @param scope Scope belongs to
 * @returns {Var}
 * @throws {Error} when failed to create a Var
 */
VarFactory.prototype.createReturnVar = function (scope) {
    'use strict';
    return new Var(Var.RETURN_VAR_NAME, scope);
};

/**
 * Creator of global Var
 * @param name
 * @returns {Var}
 * @throws {Error} when failed to create a Vae
 */
VarFactory.prototype.createGlobalVar = function (name, globalScope) {
    'use strict';
    return new Var(name, globalScope);
};

/**
 * Singleton
 * @type {VarFactory}
 */
var factory = new VarFactory();
module.exports = factory;