/**
 * Created by ChengFuLin on 2015/5/22.
 */
var FlowNode = require('./flownode'),
    namespace = require('../namespace'),
    internal = namespace();

function FlowNodeFactory() {
    "use strict";
    internal(this)._counter = 0;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
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
    var node = new FlowNode(type, astNode, parent);
    node.cfgId = internal(this)._counter++;
    return node;
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

/**
 * Factory method for halt node
 * @returns {FlowNode.HALT_NODE_TYPE}
 * @function
 */
FlowNodeFactory.prototype.createHaltNode = function () {
    "use strict";
    return this.create(FlowNode.HALT_NODE_TYPE, null, null);
};

/**
 * Factory method for local storage node
 * @returns {FlowNode.LOCAL_STORAGE_NODE_TYPE}
 * @function
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
    internal(this)._counter = 0;
};

/**
 * Set the counter to be another number (should be used carefully)
 * @param {number} num
 * @function
 */
FlowNodeFactory.prototype.setCounter = function (num) {
    "use strict";
    if (typeof num === 'number' && num >= 0) {
        internal(this)._counter = num;
    }
};

Object.defineProperty(FlowNodeFactory.prototype, 'counter', {
    get: function () {
        "use strict";
        return internal(this)._counter;
    }
});

var singleton = new FlowNodeFactory();
module.exports = singleton;