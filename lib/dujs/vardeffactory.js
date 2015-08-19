/*
 * Simple factory for creating VarDef objects
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-19
 */
var VarDef = require('./vardef'),
    Def = require('./def'),
    FlowNode = require('../esgraph/flownode'),
    factoryVar = require('./varfactory'),
    factoryDef = require('./deffactory'),
    factoryRange = require('./rangefactory');

/**
 * VarDefFactory
 * @constructor
 */
function VarDefFactory() {
}

/* start-public-methods */
/**
 * Factory method to create a VarDef with a Var and a Def
 * @param {Var} variable
 * @param {Def} definition
 * @returns {VarDef}
 */
VarDefFactory.prototype.create = function (variable, definition) {
    'use strict';
    return new VarDef(variable, definition);
};

/**
 * Creator for global variable and its definition
 * @param {FlowNode} node
 * @param {string} name
 * @param {string} type
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalVarDef = function (node, name, type) {
    'use strict';
    if (FlowNode.isFlowNode(node)) {
        var variable = factoryVar.create(name),
            def = factoryDef.create(node, type, factoryRange.createGlobalRange());
        return this.create(variable, def);
    }
};

/**
 * Factory method for creating global literal type variable and definition
 * @param {FlowNode} node
 * @param {string} name
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalLiteralVarDef = function (node, name) {
    "use strict";
    return this.createGlobalVarDef(node, name, Def.LITERAL_TYPE);
};

/**
 * Factory method for creating global object type variable and its definition
 * @param {FlowNode} node
 * @param {string} name
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalObjectVarDef = function (node, name) {
    "use strict";
    return this.createGlobalVarDef(node, name, Def.OBJECT_TYPE);
};

/**
 * Factory method for creating global function type variable and its definition
 * @param {FlowNode} node
 * @param {string} name
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalFunctionVarDef = function (node, name) {
    "use strict";
    return this.createGlobalVarDef(node, name, Def.FUNCTION_TYPE);
};

/**
 * Factory method for creating global HTML DOM type variable and its definition
 * @param {FlowNode} node
 * @param {string} name
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalHTMLDOMVarDef = function (node, name) {
    "use strict";
    return this.createGlobalVarDef(node, name, Def.HTML_DOM_TYPE);
};

/**
 * Factory method for creating global undefined type variable and its definition
 * @param {FlowNode} node
 * @param {string} name
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalUndefinedVarDef = function (node, name) {
    "use strict";
    return this.createGlobalVarDef(node, name, Def.UNDEFINED_TYPE);
};

/**
 * Factory method for creating global local storage type variable and its definition
 * @param {FlowNode} node
 * @param {string} name
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalLocalStorageVarDef = function (node, name) {
    "use strict";
    return this.createGlobalVarDef(node, name, Def.LOCAL_STORAGE_TYPE);
};

var factory = new VarDefFactory();
module.exports = factory;