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
        internal(this).value = scope.getValue();
    } else {
        internal(this).value = scope;
    }
    internal(this).type = Scope.getType(scope);
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
            return scope.getType();
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
    var regexp = /^[_a-zA-Z0-9]+$/i;
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
 * @throws {Error} when the value is invalid
 */
Scope.validate = function (value) {
    'use strict';
    if (!Scope.isValidValue(value)) {
        throw new Error('Invalid Scope value');
    }
};

/**
 * Validator for checking an object is a Scope or not
 * @param obj an object to be validated
 * @throws {Error} when the obj is not a Scope
 */
Scope.validateType = function (obj) {
    'use strict';
    if (!Scope.isScope(obj)) {
        throw new Error('Not a Scope');
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
    return (internal(this).type === Scope.PROGRAM_TYPE || internal(this).type === Scope.GLOBAL_TYPE)? internal(this).type : (internal(this).type === Scope.FUNCTION_TYPE)? internal(this).type + '["' + internal(this).value + '"]' : internal(this).type + '[' + internal(this).value + ']';
};

/**
 * Getter for scope value
 * @returns {string|number}
 */
Scope.prototype.getValue = function () {
    'use strict';
    return internal(this).value;
};

/**
 * Getter for scope type
 * @returns {string}
 */
Scope.prototype.getType = function () {
    'use strict';
    return internal(this).type;
};