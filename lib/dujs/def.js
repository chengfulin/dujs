/**
 * Created by chengfulin on 2015/4/15.
 */
var Scope = require('./scope'),
    Range = require('./range'),
    Namespace = require('./namespace'),
    internal = Namespace();
module.exports = Def;

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
 * @param range
 * @param scope
 * @returns {boolean}
 */
Def.isValidValue = function (from, type, range, scope) {
    var isValidFromNodeAndType = (typeof from === 'number' && from >= 0) &&
        (type === Def.OBJECT_TYPE || type === Def.FUNCTION_TYPE || type === Def.LITERAL_TYPE || type === Def.UNDEFINED_TYPE);
    if (!!scope && !!range) {
        return isValidFromNodeAndType && Range.isValidRange(range) && Scope.isValidValue(scope);
    }
    return isValidFromNodeAndType;
};

/**
 * Validate the data of Def
 * @param from
 * @param range
 * @param scope
 * @param type
 * @throws {Error} when an attribute of Def is invalid
 */
Def.validate = function (from, type, range, scope) {
    if (!Def.isValidValue(from, range)) {
        throw new Error('Invalid Def value (from node or type)');
    }
    try {
        Range.validateType(range);
        Range.validate(range);
    } catch(err) {
        throw new Error('Invalid Def value (range)');
    }
    try {
        Scope.validateType(scope);
        Scope.validate(scope);
    } catch(err) {
        throw new Error('Invalid Def value (scope)');
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
    return internal(this).fromCFGNode;
};

/**
 *  Getter of scope
 * @returns {undefined|Scope}
 */
Def.prototype.getScope = function () {
    return internal(this).scope;
};

/**
 * Getter of range
 * @returns {undefined|Range}
 */
Def.prototype.getRange = function () {
    return internal(this).range;
};

/**
 * Getter of type
 * @returns {undefined|string}
 */
Def.prototype.getType = function () {
    return internal(this).type;
};

/**
 * Represent Def as a string
 * @returns {string}
 */
Def.prototype.toString = function () {
    return 'Def@n' + internal(this).from + '@' + internal(this).range + '_' + internal(this).scope;
};