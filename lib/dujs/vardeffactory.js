/**
 * Created by ChengFuLin on 2015/5/11.
 */
var VarDef = require('./vardef');

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

/// Singleton
var factory = new VarDefFactory();
module.exports = factory;