/**
 * Model of variable
 * Created by chengfulin on 2015/4/22.
 */
var Scope = require('./scope'),
    Range = require('./range'),
    Namespace = require('./namespace'),
    internal = Namespace();

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
    internal(this)._range = new Range(range);
    internal(this)._scope = scope;
    internal(this)._name = name;
    internal(this)._liveWith = liveWith;/// If this variable is an object property, liveWith = the Var represents the object

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

Object.defineProperty(Var, 'RETURN_VAR_NAME', {
    value: '!RETURN',
    writable: false,
    enumerable: false,
    configurable: false
});

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
    var identifierFormat = /^[_a-zA-Z]{1}[_a-zA-Z0-9]*$/i;
    return name === Var.RETURN_VAR_NAME || (typeof name === 'string' && identifierFormat.test(name));
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
 * @param msg custom error message
 * @throws {Error} when a values of the Var is invalid
 */
Var.validate = function (name, range, scope, liveWith, msg) {
    'use strict';
    if (!Var.isValidName(name) || !Var.isValidForLiveWith(liveWith)) {
        throw new Error(msg || 'Invalid Var value');
    }
    try {
        Range.validate(range, msg);
        Scope.validateType(scope, msg);
        Scope.validate(scope, msg);
    } catch (err) {
        throw new Error(msg || 'Invalid Var value');
    }
};

/**
 * Validate an object is a Var or not
 * @param obj
 * @param msg custom error message
 * @throws {Error} when the object is not a Var
 */
Var.validateType = function (obj, msg) {
    'use strict';
    if (!Var.isVar(obj)) {
        throw new Error(msg || 'Not a Var');
    }
};

/**
 * Represent the object as string
 * @returns {string}
 */
Var.prototype.toString = function () {
    'use strict';
   return internal(this)._name + '@' + internal(this)._range + '_' + internal(this)._scope + (!!internal(this)._liveWith? ':' + internal(this)._liveWith : '');
};

/**
 * Set a Var which this Var lives with
 * @param variable
 * @throws {Error} when the variable is not a Var
 */
Var.prototype.live = function (variable) {
    'use strict';
    Var.validateType(variable);
    internal(this)._liveWith = variable;
};

Object.defineProperty(Var.prototype, 'name', {
    get: function () {
        'use strict';
        return internal(this)._name;
    }
});

Object.defineProperty(Var.prototype, 'scope', {
    get: function () {
        'use strict';
        return internal(this)._scope;
    }
});

Object.defineProperty(Var.prototype, 'liveWith', {
    get: function () {
        'use strict';
        return internal(this)._liveWith;
    }
});

Object.defineProperty(Var.prototype, 'range', {
    get: function () {
        'use strict';
        return internal(this)._range;
    }
});

module.exports = Var;