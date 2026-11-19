/*
 * Simple factory for FlowNode
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var FlowNode = require('./flownode'),
    namespace = require('../namespace'),
    internal = namespace();

/**
 * FlowNodeFactory
 * @constructor
 */
function FlowNodeFactory() {
    "use strict";
    internal(this)._counter = 0;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
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
    node.cfgId = internal(this)._counter++;
    return node;
};

/**
 * Factory method for normal node
 * @param {Object} [astNode]
 * @param {Object} [parent]
 * @returns {FlowNode}
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
 * Factory method for the finallyExit node of a non-empty finally block (feature 005,
 * FR-013): it has no astNode nor parent; its line and column are those of the end of
 * the finally block
 * @param {number} [line] line of the end of the finally block
 * @param {number} [col] column of the end of the finally block
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createFinallyExitNode = function (line, col) {
    "use strict";
    var node = this.create(FlowNode.FINALLY_EXIT_NODE_TYPE, null, null);
    node.line = line;
    node.col = col;
    return node;
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
 */
FlowNodeFactory.prototype.setCounter = function (num) {
    "use strict";
    if (typeof num === 'number' && num >= 0) {
        internal(this)._counter = num;
    }
};

/* start-public-data-members */
Object.defineProperty(FlowNodeFactory.prototype, 'counter', {
    get: function () {
        "use strict";
        return internal(this)._counter;
    }
});
/* end-public-data-members */

var singleton = new FlowNodeFactory();
module.exports = singleton;