/**
 * Created by ChengFuLin on 2015/5/11.
 */

var Var = require('./var'),
    Def = require('./def'),
    namespace = require('../namespace'),
    internal = namespace();

/**
 * A pair of variable and definition
 * @param variable Var object
 * @param definition Def object
 * @constructor
 */
function VarDef(variable, definition) {
    'use strict';
    VarDef.validate(variable, definition);
    internal(this)._var = variable;
    internal(this)._def = definition;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Define the variable property and getter function
 */
Object.defineProperty(VarDef.prototype, 'variable', {
    get: function () {
        'use strict';
        return internal(this)._var;
    }
});

/**
 * Define the definition property and getter function
 */
Object.defineProperty(VarDef.prototype, 'definition', {
    get: function () {
        'use strict';
        return internal(this)._def;
    }
});

/**
 * Validator for constructing a VarDef
 * @param variable Var object
 * @param definition Def object
 * @param msg Custom error message
 * @throws {Error} when the variable or definition invalid
 */
VarDef.validate = function (variable, definition, msg) {
    'use strict';
    Var.validateType(variable, msg || 'Invalid Var for a VarDef');
    Def.validateType(definition, msg || 'Invalid Def for a VarDef');
};

/**
 * Check the object is a VarDef or not
 * @param obj
 * @returns {boolean}
 */
VarDef.isVarDef = function (obj) {
    'use strict';
    return obj instanceof VarDef;
};

/**
 * String representation of this pair of Var and Def
 * @returns {string}
 */
VarDef.prototype.toString = function () {
    'use strict';
    return '(' + internal(this)._var + ',' + internal(this)._def + ')';
};

module.exports = VarDef;