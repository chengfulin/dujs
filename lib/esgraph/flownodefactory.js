/**
 * Created by ChengFuLin on 2015/5/22.
 */
var FlowNode = require('./flownode');

function FlowNodeFactory() {
    "use strict";

}

/**
 * Factory method for the FlowNode object
 * @param {string} [type]
 * @param [astNode]
 * @param [parent]
 * @function
 */
FlowNodeFactory.prototype.create = function (type, astNode, parent) {
    "use strict";
    return new FlowNode(type, astNode, parent);
};

/// Factory method for all kinds of nodes

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
 * @param {*|FlowNode} [parent]
 * @returns {FlowNode}
 * @function
 */
FlowNodeFactory.prototype.createEntryNode = function () {
    "use strict";
    return this.create(FlowNode.ENTRY_NODE_TYPE, null, null);
};

/**
 * Factory method for exit node
 * @param {*|FlowNode} [parent]
 * @returns {FlowNode}
 * @function
 */
FlowNodeFactory.prototype.createExitNode = function () {
    "use strict";
    return this.create(FlowNode.EXIT_NODE_TYPE, null, null);
};

/**
 * Factory method for call node
 * @param {*|FlowNode} [parent]
 * @returns {FlowNode}
 * @function
 */
FlowNodeFactory.prototype.createCallNode = function () {
    "use strict";
    return this.create(FlowNode.CALL_NODE_TYPE, null, null);
};

/**
 * Factory method for call return node
 * @returns {FlowNode}
 * @function
 */
FlowNodeFactory.prototype.createCallReturnNode = function () {
    "use strict";
    return this.create(FlowNode.CALL_RETURN_NODE_TYPE, null, null);
};

/**
 * Factory method for loop node
 * @returns {FlowNode}
 * @function
 */
FlowNodeFactory.prototype.createLoopNode = function () {
    "use strict";
    return this.create(FlowNode.LOOP_NODE_TYPE, null, null);
};

/**
 * Factory method for loop return node
 * @returns {FlowNode}
 * @function
 */
FlowNodeFactory.prototype.createLoopReturnNode = function () {
    "use strict";
    return this.create(FlowNode.LOOP_RETURN_NODE_TYPE, null, null);
};

var singleton = new FlowNodeFactory();
module.exports = singleton;