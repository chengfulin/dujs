/*
 * Model for definition of variables
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-27
 */
var FlowNode = require('../esgraph/flownode');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * Constructor of Def class, initialize a Def object, if valid
 * @param {object} fromNode A FlowNode from where this definition is generated
 * @param {string} type Type of this definition
 * @constructor
 * @throws {object} When an attribute of Def is invalid
 */
function Def(fromNode, type) {
    'use strict';
    Def.validate(fromNode, type);
    internal(this)._fromNode = fromNode;
    internal(this)._type = type;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-static-methods */
/**
 * Check the node where the definition generated is valid or not
 * @param {object} node A FlowNode
 * @returns {Boolean} True if the node is valid, false otherwise
 */
Def.fromValidNode = function (node) {
    "use strict";
    return FlowNode.isFlowNode(node);
};

/**
 * Check for the type is a valid type of Def or not
 * @param {string} type Type of this definition
 * @returns {Boolean} True if the type is valid, false otherwise
 */
Def.isValidDefType = function (type) {
    "use strict";
    return Def.TYPES.indexOf(type) !== -1;
};

/**
 * Validate the data of Def
 * @param {object} from A FlowNode where the definition is generated
 * @param {string} type Type of this definition
 * @param {string} msg Custom error message
 * @throws {object} When a value of the definition is invalid
 */
Def.validate = function (from, type, msg) {
    'use strict';
    if (!Def.fromValidNode(from) || !Def.isValidDefType(type)) {
        throw new Error(msg || 'Invalid value for a Def');
    }
};

/**
 * Check for an object is Def or not
 * @param {object} obj An object to be checked
 * @returns {Boolean} True if the obj is a Def, false otherwise
 */
Def.isDef = function (obj) {
    'use strict';
    return obj instanceof Def;
};

/**
 * Validator for checking an object is Def type or not
 * @param {object} obj An object to be validated
 * @param {string} msg Custom error message
 * @throws {object} When the obj is not a Def
 */
Def.validateType = function (obj, msg) {
    'use strict';
    if (!Def.isDef(obj)) {
        throw new Error(msg || 'Not a Def');
    }
};
/* end-static-methods */

/* start-static-data-members*/
Object.defineProperty(Def, 'OBJECT_TYPE', {
    value: 'object'
});

Object.defineProperty(Def, 'FUNCTION_TYPE', {
    value: 'function',
	enumerable: true
});

Object.defineProperty(Def, 'LITERAL_TYPE', {
    value: 'literal',
	enumerable: true
});

Object.defineProperty(Def, 'UNDEFINED_TYPE', {
    value: 'undefined',
	enumerable: true
});

Object.defineProperty(Def, 'HTML_DOM_TYPE', {
    value: 'htmlDom',
	enumerable: true
});

Object.defineProperty(Def, 'LOCAL_STORAGE_TYPE', {
    value: 'localStorage',
	enumerable: true
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
	enumerable: true
});

/* start-public-data-members */
Object.defineProperty(Def.prototype, 'fromNode', {
    get: function () {
        'use strict';
        return internal(this)._fromNode;
    },
	enumerable: true
});

Object.defineProperty(Def.prototype, 'type', {
    get: function () {
        'use strict';
        return internal(this)._type;
    },
	enumerable: true
});
/* end-public-data-members*/

/* start-public-methods */
/**
 * Represent Def as a string
 * @returns {string} With the type and the from node
 */
Def.prototype.toString = function () {
    'use strict';
    return internal(this)._type + ((!internal(this)._fromNode)? '' : (' @ ' + internal(this)._fromNode));
};

/**
 * Convert the definition to JSON formatted object
 * @returns {object} JSON formatted definition, including fromNode and type properties
 */
Def.prototype.toJSON = function () {
	'use strict';
	return {
		"fromNode": (!internal(this)._fromNode)? null : internal(this)._fromNode.toJSON(),
		"type": internal(this)._type
	};
};
/* end-public-methods*/

module.exports = Def;