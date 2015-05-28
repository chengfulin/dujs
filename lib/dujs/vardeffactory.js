/**
 * Created by ChengFuLin on 2015/5/11.
 */
var VarDef = require('./vardef'),
    Def = require('./def'),
    FlowNode = require('../esgraph/flownode'),

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
    if (!!globalNode && FlowNode.isFlowNode(globalNode) && globalNode.type === FlowNode.GLOBAL_NODE_TYPE) {
        var variable = varFactory.createGlobalVar(name);
        return new VarDef(
            variable,
            defFactory.create(
                globalNode,
                type,
                variable.getRange(),
                variable.getScope()
            )
        );
    }
};

/// Singleton
var factory = new VarDefFactory();
module.exports = factory;