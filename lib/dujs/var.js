/**
 * Model of variable
 * Created by chengfulin on 2015/4/22.
 */
var Scope = require('./scope'),
    Range = require('./range'),
    Namespace = require('./namespace'),
    internal = Namespace();
module.exports = Var;

/**
 * Create a model of variable
 * @param name variable name
 * @param range range at the scope
 * @param scope the scope where the variable belongs to
 * @param liveWith the variable living with (if any)
 * @constructor
 * @throws {Error} when Var constructed with invalid value
 */
function Var(name, range, scope, liveWith) {
    'use strict';
    Var.validate(name, range, scope, liveWith);
    internal(this).range = new Range(range);
    internal(this).scope = scope;
    internal(this).name = name;
    internal(this).liveWith = liveWith;/// If this variable is an object property, liveWith = the Var represents the object
}

/**
 * Check an object is Var or not
 * @param obj
 * @returns {boolean}
 */
Var.isVar = function (obj) {
    'use strict';
    return obj instanceof Var;
};

/**
 * Check the name is a valid identifier
 * @param name
 * @returns {boolean}
 */
Var.isValidName = function (name) {
    'use strict';
    var identifierFormat = /^[_a-zA-Z0-9]+$/i;
    return typeof name === 'string' && identifierFormat.test(name);
};

/**
 * Check the var to live with is valid as a Var or undefined/null
 * @param varLivedWith
 * @returns {boolean}
 */
Var.isValidForLiveWith = function (varLivedWith) {
    'use strict';
    return Var.isVar(varLivedWith) || !varLivedWith;
};

/**
 * Validate the values for a Var is valid
 * @param name
 * @param range
 * @param scope
 * @param liveWith
 * @throws {Error} when a values of the Var is invalid
 */
Var.validate = function (name, range, scope, liveWith) {
    'use strict';
    if (!Var.isValidName(name) || !Var.isValidForLiveWith(liveWith)) {
        throw new Error('Invalid Var value');
    }
    try {
        Range.validate(range);
        Scope.validateType(scope);
        Scope.validate(scope);
    } catch (err) {
        throw new Error('Invalid Var value');
    }
};

/**
 * Validate an object is a Var or not
 * @param obj
 * @throws {Error} when the object is not a Var
 */
Var.validateType = function (obj) {
    'use strict';
    if (!Var.isVar(obj)) {
        throw new Error('Not a Var');
    }
};

/**
 * Represent the object as string
 * @returns {string}
 */
Var.prototype.toString = function () {
    'use strict';
   return internal(this).name + '@' + internal(this).range + '_' + internal(this).scope + (!!internal(this).liveWith? ':' + internal(this).liveWith : '');
};

/**
 * Set a Var which this Var lives with
 * @param variable
 * @throws {Error} when the variable is not a Var
 */
Var.prototype.live = function (variable) {
    'use strict';
    Var.validateType(variable);
    internal(this).liveWith = variable;
};

/**
 * Getter for the name of the Var
 * @returns {*|string}
 */
Var.prototype.getName = function () {
    'use strict';
    return internal(this).name;
};

/**
 * Getter for the scope of the Var
 * @returns {*|Scope}
 */
Var.prototype.getScope = function () {
    'use strict';
    return internal(this).scope;
};

/**Getter for the Var which this Var lives with
 * @returns {*|liveWith}
 */
Var.prototype.getVarLivingWith = function () {
    'use strict';
    return internal(this).liveWith;
};

/**
 * Getter for the range of the Var
 * @returns {*|Range}
 */
Var.prototype.getRange = function () {
    'use strict';
    return internal(this).range;
}