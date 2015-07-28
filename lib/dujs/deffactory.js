/*
 * Simple factory for Def
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-28
 */
var Def = require('./def'),
    Scope = require('./scope');

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

/**
 * Factory method for Def of parameter
 * @param {Scope} functionScope Scope of which the parameter belongs to
 * @param {String} type Type of the definition
 * @returns {Def} Generated definition
 */
DefFactory.prototype.createParamDef = function (functionScope, type) {
    'use strict';
    if (Scope.isScope(functionScope)) {
        return new Def(functionScope.cfg[0], type);
    }
};

/**
 * Factory method for literal type Def of parameter
 * @param {Scope} functionScope Scope of which the parameter belongs to
 * @returns {Def} Generated definition of literal type
 */
DefFactory.prototype.createLiteralParamDef = function (functionScope) {
    'use strict';
    return this.createParamDef(functionScope, Def.LITERAL_TYPE);
};

/**
 * Factory method for object type Def of parameter
 * @param {Scope} functionScope Scope of which the parameter belongs to
 * @returns {Def} Generated definition of object type
 */
DefFactory.prototype.createObjectParamDef = function (functionScope) {
    'use strict';
    return this.createParamDef(functionScope, Def.OBJECT_TYPE);
};

/**
 * Factory method for function type Def of parameter
 * @param {Scope} functionScope Scope of which the parameter belongs to
 * @returns {Def} Generated definition of function type
 */
DefFactory.prototype.createFunctionParamDef = function (functionScope) {
    'use strict';
    return this.createParamDef(functionScope, Def.FUNCTION_TYPE);
};

/**
 * Factory method for HTML DOM type Def of parameter
 * @param {Scope} functionScope Scope of which the parameter belongs to
 * @returns {Def} Generated definition of HTML DOM type
 */
DefFactory.prototype.createHTMLDOMParamDef = function (functionScope) {
    'use strict';
    return this.createParamDef(functionScope, Def.HTML_DOM_TYPE);
};

/**
 * Factory method for undefined type Def of parameter
 * @param {Scope} functionScope Scope of which the parameter belongs to
 * @returns {Def} Generated definition of undefined type
 */
DefFactory.prototype.createUndefinedParamDef = function (functionScope) {
    'use strict';
    return this.createParamDef(functionScope, Def.UNDEFINED_TYPE);
};

/**
 * Factory method for local storage type Def of parameter
 * @param {Scope} functionScope Scope of which the parameter belongs to
 * @returns {Def} Generated definition of local storage type
 */
DefFactory.prototype.createLocalStorageParamDef = function (functionScope) {
    'use strict';
    return this.createParamDef(functionScope, Def.LOCAL_STORAGE_TYPE);
};

var factory = new DefFactory();
module.exports = factory;