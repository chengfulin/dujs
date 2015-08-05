/*
 * Simple factory for Def
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
var Def = require('./def');

/**
 * DefFactory
 * @constructor
 */
function DefFactory() {
}

/* start-public-methods */
/**
 * Factory method for literal type definition
 * @param {FlowNode} from Node where the definition is generated
 * @returns {Def} Definition object with literal type
 */
DefFactory.prototype.createLiteralDef = function (from) {
    "use strict";
    return new Def(from, Def.LITERAL_TYPE);
};

/**
 * Factory method for object type definition
 * @param {FlowNode} from Node where the definition is generated
 * @returns {Def} Definition object with object type
 */
DefFactory.prototype.createObjectDef = function (from) {
    "use strict";
    return new Def(from, Def.OBJECT_TYPE);
};

/**
 * Factory method for function type definition
 * @param {FlowNode} from Node where the definition is generated
 * @returns {Def} Definition object with function type
 */
DefFactory.prototype.createFunctionDef = function (from) {
    "use strict";
    return new Def(from, Def.FUNCTION_TYPE);
};

/**
 * Factory method for HTML DOM type definition
 * @param {FlowNode} from Node where the definition is generated
 * @returns {Def} Definition object with HTML DOM type
 */
DefFactory.prototype.createHTMLDOMDef = function (from) {
    "use strict";
    return new Def(from, Def.HTML_DOM_TYPE);
};

/**
 * Factory method for undefined type definition
 * @param {FlowNode} from Node where the definition is generated
 * @returns {Def} Definition object with undefined type
 */
DefFactory.prototype.createUndefinedDef = function (from) {
    "use strict";
    return new Def(from, Def.UNDEFINED_TYPE);
};

/**
 * Factory method for local storage type definition
 * @param {FlowNode} from Node where the definition is generated
 * @returns {Def} Definition object with local storage type
 */
DefFactory.prototype.createLocalStorageDef = function (from) {
    "use strict";
    return new Def(from, Def.LOCAL_STORAGE_TYPE);
};
/* end-public-methods */

var factory = new DefFactory();
module.exports = factory;