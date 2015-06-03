/**
 * Created by chengfulin on 2015/4/15.
 */
var Scope = require('./scope'),
    Range = require('./range'),
    FlowNode = require('../esgraph/flownode'),
    namespace = require('./namespace'),
    internal = namespace();

/**
 * Constructor of Def class, initialize a Def object, if valid
 * @param {FlowNode} from CFG node
 * @param type should be 'object', 'function', 'literal' or 'undefined'
 * @param range range property of AST node
 * @param scope reference to the Scope where the Def is generated
 * @constructor
 * @throws {Error} when an attribute of Def is invalid
 */
function Def(from, type, range, scope) {
    'use strict';
    Def.validate(from, type, range, scope);
    internal(this)._fromCFGNode = from;
    internal(this)._scope = scope;
    internal(this)._range = new Range(range);
    internal(this)._type = type;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Check the node where the definition generated is valid or not
 * @param {FlowNode} node
 * @returns {boolean}
 * @static
 * @function
 */
Def.fromValidNode = function (node) {
    "use strict";
    return FlowNode.isFlowNode(node) && node.cfgId !== null && node.cfgId !== undefined;
};

/**
 * Check for the type is a valid type of Def or not
 * @param {string} type
 * @returns {boolean}
 * @static
 * @function
 */
Def.isValidDefType = function (type) {
    "use strict";
    return Def.TYPES.indexOf(type) !== -1;
};

/**
 * Validate the data of Def
 * @param {FlowNode} from
 * @param {string} type
 * @param range
 * @param scope
 * @param {string} msg custom error message
 * @throws {Error} when an attribute of Def is invalid
 * @static
 * @function
 */
Def.validate = function (from, type, range, scope, msg) {
    'use strict';
    if (!Def.fromValidNode(from)) {
        throw new Error(msg || 'Invalid from node of Def');
    }
    if (!Def.isValidDefType(type)) {
        throw new Error(msg || 'Invalid type value of Def');
    }
    try {
        Range.validate(range, msg);
    } catch (err) {
        throw new Error(msg || 'Invalid range value of Def');
    }
    try {
        Scope.validateType(scope, msg);
        Scope.validate(scope, msg);
    } catch (err) {
        throw new Error(msg || 'Invalid scope value of Def');
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

Object.defineProperty(Def, 'HTML_DOM_TYPE', {
    value: 'htmlDOM',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Def, 'LOCAL_STORAGE_TYPE', {
    value: 'localStorage',
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Def, 'TYPES', {
    value: [
        Def.OBJECT_TYPE,
        Def.FUNCTION_TYPE,
        Def.LITERAL_TYPE,
        Def.UNDEFINED_TYPE,
        Def.HTML_DOM_TYPE,
        Def.LOCAL_STORAGE_TYPE
    ],
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Def.prototype, 'fromCFGNode', {
    get: function () {
        'use strict';
        return internal(this)._fromCFGNode;
    }
});

Object.defineProperty(Def.prototype, 'scope', {
    get: function () {
        'use strict';
        return internal(this)._scope;
    }
});

Object.defineProperty(Def.prototype, 'range', {
    get: function () {
        'use strict';
        return internal(this)._range;
    }
});

Object.defineProperty(Def.prototype, 'type', {
    get: function () {
        'use strict';
        return internal(this)._type;
    }
});

/**
 * Represent Def as a string
 * @returns {string}
 */
Def.prototype.toString = function () {
    'use strict';
    return 'Def@n' + internal(this)._fromCFGNode.cfgId + '@' + internal(this)._range + '_' + internal(this)._scope;
};

module.exports = Def;