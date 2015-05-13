/**
 * Created by ChengFuLin on 2015/5/11.
 */
var VarDef = require('./vardef'),
    Def = require('./def'),
    varFactory = require('./varfactory'),
    defFactory = require('./deffactory');

/**
 * Factory of VarDef object
 * @constructor
 */
function VarDefFactory() {
    'use strict';
}

/**
 * Creator API
 * @param variable
 * @param definition
 * @returns {*|VarDef}
 * @throws {Error} when a value is invalid
 */
VarDefFactory.prototype.create = function (variable, definition) {
    'use strict';
    return new VarDef(variable, definition);
};

/**
 * Creator for global variable and its definition
 * @param name
 * @param type
 * @returns {VarDef}
 * @throws {Error} when a invalid value of Var or Def object
 */
VarDefFactory.prototype.createGlobalVarDef = function (name, type) {
    'use strict';
    var variable = varFactory.createGlobalVar(name);
    return new VarDef(variable, defFactory.createGlobalDef(type, variable.getRange()));
};

/// Singleton
var factory = new VarDefFactory();
module.exports = factory;