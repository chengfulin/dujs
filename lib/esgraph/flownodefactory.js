/*
 * Simple factory for FlowNode
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-07
 */
var FlowNode = require('./flownode');
var namespace = require('../namespace'),
    internal = namespace();

/**
 * FlowNodeFactory
 * @constructor
 */
function FlowNodeFactory() {
}

/* start-public-methods */
/**
 * Factory method for the FlowNode object
 * @param {string} [type]
 * @param {Object} [astNode]
 * @param {Object} [parent]
 */
FlowNodeFactory.prototype.create = function (type, astNode, parent) {
    "use strict";
    var node = new FlowNode(type, astNode, parent);
    return node;
};

/**
 * Factory method for normal node
 * @param [astNode]
 * @param {*|FlowNode} [parent]
 * @returns {FlowNode}
 * @function
 */
FlowNodeFactory.prototype.createNormalNode = function (astNode, parent) {
    "use strict";
    return this.create(FlowNode.NORMAL_NODE_TYPE, astNode, parent);
};

/**
 * Factory method for entry node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createEntryNode = function () {
    "use strict";
    return this.create(FlowNode.ENTRY_NODE_TYPE, null, null);
};

/**
 * Factory method for exit node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createExitNode = function () {
    "use strict";
    return this.create(FlowNode.EXIT_NODE_TYPE, null, null);
};

/**
 * Factory method for call node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createCallNode = function () {
    "use strict";
    return this.create(FlowNode.CALL_NODE_TYPE, null, null);
};

/**
 * Factory method for call return node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createCallReturnNode = function () {
    "use strict";
    return this.create(FlowNode.CALL_RETURN_NODE_TYPE, null, null);
};

/**
 * Factory method for loop node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createLoopNode = function () {
    "use strict";
    return this.create(FlowNode.LOOP_NODE_TYPE, null, null);
};

/**
 * Factory method for loop return node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createLoopReturnNode = function () {
    "use strict";
    return this.create(FlowNode.LOOP_RETURN_NODE_TYPE, null, null);
};

/**
 * Factory method for local storage node
 * @returns {FlowNode.LOCAL_STORAGE_NODE_TYPE}
 */
FlowNodeFactory.prototype.createLocalStorageNode = function () {
    "use strict";
    return this.create(FlowNode.LOCAL_STORAGE_NODE_TYPE, null, null);
};

/**
 * Reset the counter of FlowNodes
 */
FlowNodeFactory.prototype.resetCounter = function () {
    "use strict";
    FlowNode.resetCounter();
};
/* end-public-methods */

var singleton = new FlowNodeFactory();
module.exports = singleton;