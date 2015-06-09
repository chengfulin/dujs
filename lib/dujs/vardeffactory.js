/**
 * Created by ChengFuLin on 2015/5/11.
 */
var VarDef = require('./vardef'),
    Def = require('./def'),
    FlowNode = require('../esgraph/flownode'),
    ScopeWrapper = require('./scopewrapper'),
    varFactory = require('./varfactory'),
    defFactory = require('./deffactory');

/**
 * Factory of VarDef object
 * @constructor
 */
function VarDefFactory() {
    'use strict';
}

/**
 * Creator API
 * @param variable
 * @param definition
 * @returns {*|VarDef}
 * @throws {Error} when a value is invalid
 */
VarDefFactory.prototype.create = function (variable, definition) {
    'use strict';
    return new VarDef(variable, definition);
};

/**
 * Creator for global variable and its definition
 * @param {FlowNode} globalnode
 * @param {string} name
 * @param {string} type
 * @returns {VarDef}
 * @throws {Error} when a invalid value of Var or Def object
 * @function
 */
VarDefFactory.prototype.createGlobalVarDef = function (globalNode, name, type) {
    'use strict';
    if (FlowNode.isFlowNode(globalNode) && globalNode.type === FlowNode.GLOBAL_NODE_TYPE) {
        var variable = varFactory.createGlobalVar(name),
            def = defFactory.create(globalNode, type, variable.range, variable.scope);
        return this.create(variable, def);
    }
};

VarDefFactory.prototype.createGlobalLiteralVarDef = function (globalNode, name) {
    "use strict";
    return this.createGlobalVarDef(globalNode, name, Def.LITERAL_TYPE);
};

VarDefFactory.prototype.createGlobalObjectVarDef = function (globalNode, name) {
    "use strict";
    return this.createGlobalVarDef(globalNode, name, Def.OBJECT_TYPE);
};

VarDefFactory.prototype.createGlobalFunctionVarDef = function (globalNode, name) {
    "use strict";
    return this.createGlobalVarDef(globalNode, name, Def.FUNCTION_TYPE);
};

VarDefFactory.prototype.createGlobalHTMLDOMVarDef = function (globalNode, name) {
    "use strict";
    return this.createGlobalVarDef(globalNode, name, Def.HTML_DOM_TYPE);
};

VarDefFactory.prototype.createGlobalUndefinedVarDef = function (globalNode, name) {
    "use strict";
    return this.createGlobalVarDef(globalNode, name, Def.UNDEFINED_TYPE);
};

VarDefFactory.prototype.createGlobalLocalStorageVarDef = function (globalNode, name) {
    "use strict";
    return this.createGlobalVarDef(globalNode, name, Def.LOCAL_STORAGE_TYPE);
};

VarDefFactory.prototype.createParamVarDef = function (functionScope, name, type, range) {
    "use strict";
    if (ScopeWrapper.isScopeWrapper(functionScope)) {
        var variable = varFactory.create(name, range, functionScope.scope, null),
            def = defFactory.createParamDef(functionScope, type, range);
        return this.create(variable, def);
    }
};

VarDefFactory.prototype.createLiteralParamVarDef = function (functionScope, name, range) {
    "use strict";
    return this.createParamVarDef(functionScope, name, Def.LITERAL_TYPE, range);
};

VarDefFactory.prototype.createObjectParamVarDef = function (functionScope, name, range) {
    "use strict";
    return this.createParamVarDef(functionScope, name, Def.OBJECT_TYPE, range);
};

VarDefFactory.prototype.createFunctionParamVarDef = function (functionScope, name, range) {
    "use strict";
    return this.createParamVarDef(functionScope, name, Def.FUNCTION_TYPE, range);
};

VarDefFactory.prototype.createHTMLDOMParamVarDef = function (functionScope, name, range) {
    "use strict";
    return this.createParamVarDef(functionScope, name, Def.HTML_DOM_TYPE, range);
};

VarDefFactory.prototype.createUndefinedParamVarDef = function (functionScope, name, range) {
    "use strict";
    return this.createParamVarDef(functionScope, name, Def.UNDEFINED_TYPE, range);
};

VarDefFactory.prototype.createLocalStorageParamVarDef = function (functionScope, name, range) {
    "use strict";
    return this.createParamVarDef(functionScope, name, Def.LOCAL_STORAGE_TYPE, range);
};

/// Singleton
var factory = new VarDefFactory();
module.exports = factory;