/**
 * Created by chengfulin on 2015/4/21.
 */
require('core-js/es6/weak-map');
module.exports = Scope;

var Namespace = require('./namespace'),
    internal = Namespace(),
    SPECIAL_PROGRAM_SCOPE_VALUE = '!PROGRAM',
    SPECIAL_GLOBAL_SCOPE_VALUE = '!GLOBAL';

/**
 * Model for scope name
 * @param scope initialization of scope value
 * @constructor
 * @throws {Error} when the scope has invalid value
 */
function Scope(scope) {
    'use strict';
    Scope.validate(scope);
    if (Scope.isScope(scope)) {
        internal(this)._value = scope.value;
    } else {
        internal(this)._value = scope;
    }
    internal(this)._type = Scope.getType(scope);

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}


/**
 * Determine the type of a Scope with its value
 * @param scope a value of Scope
 * @returns {undefined|string}
 */
Scope.getType = function (scope) {
    'use strict';
    if (Scope.isValidValue(scope)) {
        if (Scope.isScope(scope)) {
            return scope.type;
        } else if (scope === SPECIAL_PROGRAM_SCOPE_VALUE) {
            return Scope.PROGRAM_TYPE;
        } else if (scope === SPECIAL_GLOBAL_SCOPE_VALUE) {
            return Scope.GLOBAL_TYPE;
        } else if (typeof scope === 'string') {
            return Scope.FUNCTION_TYPE;
        } else if (typeof scope === 'number') {
            return Scope.ANONYMOUS_FUN_TYPE;
        }
    }
};

/**
 * Check a value of Scope is valid
 * @param value
 * @returns {boolean}
 */
Scope.isValidValue = function (value) {
    'use strict';
    if (Scope.isScope(value)) {
        return true;
    } else if (value === SPECIAL_PROGRAM_SCOPE_VALUE || value === SPECIAL_GLOBAL_SCOPE_VALUE) {
        return true;
    }
    var regexp = /^[_a-zA-Z]{1}[_a-zA-Z0-9]*$/i;
    return (typeof value === 'string' && regexp.test(value)) || (typeof value === 'number' && value >= 0);
};

/**
 * Check an object is a Scope or not
 * @param obj
 * @returns {boolean}
 */
Scope.isScope = function (obj) {
    'use strict';
    return obj instanceof Scope;
};

/**
 * Validator for check the value for a Scope is valid or not
 * @param value
 * @param msg custom error message
 * @throws {Error} when the value is invalid
 */
Scope.validate = function (value, msg) {
    'use strict';
    if (!Scope.isValidValue(value)) {
        throw new Error(msg || 'Invalid Scope value');
    }
};

/**
 * Validator for checking an object is a Scope or not
 * @param obj an object to be validated
 * @param msg custom error message
 * @throws {Error} when the obj is not a Scope
 */
Scope.validateType = function (obj, msg) {
    'use strict';
    if (!Scope.isScope(obj)) {
        throw new Error(msg || 'Not a Scope');
    }
};

/// static attributes 'ProgramType', 'GlobalType', 'FunctionType' and 'AnonymousFunctionType'
Object.defineProperty(Scope, 'PROGRAM_TYPE', {
    value: 'Program',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Scope, 'GLOBAL_TYPE', {
    value: 'Global',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Scope, 'FUNCTION_TYPE', {
    value: 'Function',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Scope, 'ANONYMOUS_FUN_TYPE', {
    value: 'AnonymousFunction',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Scope, 'PROGRAM_SCOPE', {
    value: new Scope(SPECIAL_PROGRAM_SCOPE_VALUE),
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Scope, 'GLOBAL_SCOPE', {
    value: new Scope(SPECIAL_GLOBAL_SCOPE_VALUE),
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Represent the Scope as a string
 * @overrides {Object}
 * @returns {string}
 */
Scope.prototype.toString = function () {
    'use strict';
    return (internal(this)._type === Scope.PROGRAM_TYPE || internal(this)._type === Scope.GLOBAL_TYPE)? internal(this)._type : (internal(this)._type === Scope.FUNCTION_TYPE)? internal(this)._type + '["' + internal(this)._value + '"]' : internal(this)._type + '[' + internal(this)._value + ']';
};

Object.defineProperty(Scope.prototype, 'value', {
    get: function () {
        'use strict';
        return internal(this)._value;
    }
});

Object.defineProperty(Scope.prototype, 'type', {
    get: function () {
        'use strict';
        return internal(this)._type;
    }
});