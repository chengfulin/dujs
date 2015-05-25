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
 * @param range
 * @param scope
 * @param [livewith]
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
 * Creator of global Var
 * @param name
 * @returns {Var}
 * @throws {Error} when failed to create a Vae
 */
VarFactory.prototype.createGlobalVar = function (name) {
    'use strict';
    var rangeStart = internal(this).numOfGlobals++;
    return new Var(name, rangeFactory.create(rangeStart, rangeStart + 1), Scope.GLOBAL_SCOPE);
};

/**
 * Reset the counter of number of globals
 */
VarFactory.prototype.resetGlobalsCounter = function () {
    'use strict';
    internal(this).numOfGlobals = 0;
};

/**
 * Singleton
 * @type {VarFactory}
 */
var factory = new VarFactory();
module.exports = factory;