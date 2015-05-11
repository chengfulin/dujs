/**
 * Created by ChengFuLin on 2015/5/11.
 */

var Var = require('./var'),
    Def = require('./def'),
    namespace = require('./namespace'),
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
    internal(this).var = variable;
    internal(this).def = definition;
}

/**
 * Define the variable property and getter function
 */
Object.defineProperty(VarDef.prototype, 'variable', {
    enumerable: false,
    configurable: false,
    get: function () {
        'use strict';
        return internal(this).var;
    }
});

/**
 * Define the definition property and getter function
 */
Object.defineProperty(VarDef.prototype, 'definition', {
    enumerable: false,
    configurable: false,
    get: function () {
        'use strict';
        return internal(this).def;
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
    var errMsg = msg || 'Invalid VarDef';
    Var.validateType(variable, errMsg);
    Def.validateType(definition, errMsg);
};

/**
 * String representation of this pair of Var and Def
 * @returns {string}
 */
VarDef.prototype.toString = function () {
    'use strict';
    return '(' + internal(this).var + ',' + internal(this).def + ')';
};

module.exports = VarDef;