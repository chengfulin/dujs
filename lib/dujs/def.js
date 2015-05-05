/**
 * Created by chengfulin on 2015/4/15.
 */
var Scope = require('./scope'),
    Range = require('./range'),
    namespace = require('./namespace'),
    internal = namespace();

/**
 * Constructor of Def class, initialize a Def object, if valid
 * @param from CFG node id
 * @param type should be 'object', 'function', 'literal' or 'undefined'
 * @param range range property of AST node
 * @param scope reference to the Scope where the Def is generated
 * @constructor
 * @throws {Error} when an attribute of Def is invalid
 */
function Def(from, type, range, scope) {
    'use strict';
    Def.validate(from, type, range, scope);
    internal(this).fromCFGNode = from;
    internal(this).scope = scope;
    internal(this).range = new Range(range);
    internal(this).type = type;
}

/**
 * Check value of Def is valid or not
 * @param from
 * @param type
 * @returns {boolean}
 */
Def.isValidFromAndTypeValue = function (from, type) {
    'use strict';
    return (typeof from === 'number' && from >= 0) &&
        (type === Def.OBJECT_TYPE || type === Def.FUNCTION_TYPE || type === Def.LITERAL_TYPE || type === Def.UNDEFINED_TYPE);
};

/**
 * Validate the data of Def
 * @param from
 * @param range
 * @param scope
 * @param type
 * @param msg custom error message
 * @throws {Error} when an attribute of Def is invalid
 */
Def.validate = function (from, type, range, scope, msg) {
    'use strict';
    if (!Def.isValidFromAndTypeValue(from, type)) {
        throw new Error(msg || 'Invalid Def value (from node or type)');
    }
    try {
        Range.validate(range, msg);
    } catch (err) {
        throw new Error(msg || 'Invalid Def value (range)');
    }
    try {
        Scope.validateType(scope, msg);
        Scope.validate(scope, msg);
    } catch (err) {
        throw new Error(msg || 'Invalid Def value (scope)');
    }
};

/**
 * Check for an object is Def or not
 * @param obj
 * @returns {boolean}
 */
Def.isDef = function (obj) {
    'use strict';
    return obj instanceof Def;
};

/**
 * Validator for checking an object is Def type or not
 * @param obj
 * @param msg custom error message
 * @throws {Error} when the obj is not a Def
 */
Def.validateType = function (obj, msg) {
    'use strict';
    if (!Def.isDef(obj)) {
        throw new Error(msg || 'Not a Def');
    }
};

Object.defineProperty(Def, 'OBJECT_TYPE', {
    value: 'object',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Def, 'FUNCTION_TYPE', {
    value: 'function',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Def, 'LITERAL_TYPE', {
    value: 'literal',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Def, 'UNDEFINED_TYPE', {
    value: 'undefined',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Getter of fromCFGNode
 * @returns {undefined|number} CFG node id
 */
Def.prototype.getFromCFGNode = function () {
    'use strict';
    return internal(this).fromCFGNode;
};

/**
 *  Getter of scope
 * @returns {*|Scope}
 */
Def.prototype.getScope = function () {
    'use strict';
    return internal(this).scope;
};

/**
 * Getter of range
 * @returns {*|Range}
 */
Def.prototype.getRange = function () {
    'use strict';
    return internal(this).range;
};

/**
 * Getter of type
 * @returns {*|string}
 */
Def.prototype.getType = function () {
    'use strict';
    return internal(this).type;
};

/**
 * Represent Def as a string
 * @returns {string}
 */
Def.prototype.toString = function () {
    'use strict';
    return 'Def@n' + internal(this).fromCFGNode + '@' + internal(this).range + '_' + internal(this).scope;
};

module.exports = Def;