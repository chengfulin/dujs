/**
 * Created by ChengFuLin on 2015/5/20.
 */
var namespace = require('./namespace'),
    internal = namespace(),
    numOfNodes = 0;

/**
 * Construct a FlowNode
 * @param {string} [type] Type of the node, default is NORMAL_NODE_TYPE
 * @param [astNode]
 * @param {FlowNode} [parent] Parent node
 * @constructor
 */
function FlowNode(type, astNode, parent) {
    'use strict';
    var nodeType = type || FlowNode.NORMAL_NODE_TYPE;
    FlowNode.validateType(nodeType);

    internal(this)._cfgId = numOfNodes++;
    internal(this)._astNode = astNode || null;
    internal(this)._parent = parent || null;
    internal(this)._type = nodeType;
    internal(this)._prev = [];
    internal(this)._next = [];
}

/**
 * Check for the type of the node is valid or not
 * @param type
 * @returns {boolean}
 * @static
 * @function
 */
FlowNode.isValidNodeType = function (type) {
    "use strict";
    return FlowNode.TYPES.indexOf(type) !== -1;
};

/**
 * Check for the type of the connection is valid or not
 * @param type
 * @returns {boolean}
 * @static
 * @function
 */
FlowNode.isValidConnectionType = function (type) {
    "use strict";
    return FlowNode.CONNECTION_TYPES.indexOf(type) !== -1;
};

/**
 * Check for the object is a FlowNode or not
 * @param {Object} obj
 * @returns {boolean}
 * @static
 * @function
 */
FlowNode.isFlowNode = function (obj) {
    "use strict";
    return obj instanceof FlowNode;
};

/**
 * Validate the type of a FlowNode
 * @param type
 * @param {string} [msg] Custom error message
 * @throws {Error} when the type is invalid
 * @static
 * @function
 */
FlowNode.validateType = function (type, msg) {
    "use strict";
    if (!FlowNode.isValidNodeType(type)) {
        throw new Error(msg || 'Invalid type of FlowNode');
    }
};

/**
 * Reset the counter of number of the FlowNodes
 * @static
 * @function
 */
FlowNode.resetCounter = function () {
    "use strict";
    numOfNodes = 0;
};

/**
 * The number of created FlowNodes
 * @type {number}
 */
Object.defineProperty(FlowNode, 'numOfFlowNodes', {
    get: function () {
        "use strict";
        return numOfNodes;
    }
});

/**
 * Type of the entry node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'ENTRY_NODE_TYPE', {
    value: 'entry',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the exit node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'EXIT_NODE_TYPE', {
    value: 'exit',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the call node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'CALL_NODE_TYPE', {
    value: 'call',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the return node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'RETURN_NODE_TYPE', {
    value: 'return',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the loop node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'LOOP_NODE_TYPE', {
    value: 'loop',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the normal node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'NORMAL_NODE_TYPE', {
    value: 'normal',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * The collection of all node types
 * @type {Array}
 */
Object.defineProperty(FlowNode, 'TYPES', {
    value: [
        FlowNode.ENTRY_NODE_TYPE,
        FlowNode.EXIT_NODE_TYPE,
        FlowNode.CALL_NODE_TYPE,
        FlowNode.RETURN_NODE_TYPE,
        FlowNode.LOOP_NODE_TYPE,
        FlowNode.NORMAL_NODE_TYPE
    ],
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the normal connection
 * @type {string}
 */
Object.defineProperty(FlowNode, 'NORMAL_CONNECTION_TYPE', {
    value: 'normal',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the exception connection
 * @type {string}
 */
Object.defineProperty(FlowNode, 'EXCEPTION_CONNECTION_TYPE', {
    value: 'exception',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the connection for the true branch
 * @type {string}
 */
Object.defineProperty(FlowNode, 'TRUE_BRANCH_CONNECTION_TYPE', {
    value: 'true',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the connection for the false branch
 * @type {string}
 */
Object.defineProperty(FlowNode, 'FALSE_BRANCH_CONNECTION_TYPE', {
    value: 'false',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the call connection
 * @type {string}
 */
Object.defineProperty(FlowNode, 'CALL_CONNECTION_TYPE', {
    value: 'call',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the return connection
 * @type {string}
 */
Object.defineProperty(FlowNode, 'RETURN_CONNECTION_TYPE', {
    value: 'return',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Collection of connection types
 * @type {Array}
 */
Object.defineProperty(FlowNode, 'CONNECTION_TYPES', {
    value: [
        FlowNode.NORMAL_CONNECTION_TYPE,
        FlowNode.EXCEPTION_CONNECTION_TYPE,
        FlowNode.TRUE_BRANCH_CONNECTION_TYPE,
        FlowNode.FALSE_BRANCH_CONNECTION_TYPE,
        FlowNode.CALL_CONNECTION_TYPE,
        FlowNode.RETURN_CONNECTION_TYPE
    ],
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Getter of prop cfgId
 */
Object.defineProperty(FlowNode.prototype, 'cfgId', {
    get: function () {
        "use strict";
        return internal(this)._cfgId;
    }
});

/**
 * Getter and Setter of prop astNode
 */
Object.defineProperty(FlowNode.prototype, 'astNode', {
    get: function () {
        "use strict";
        return internal(this)._astNode;
    },
    set: function (ast) {
        "use strict";
        internal(this)._astNode = ast;
    }
});

/**
 * Getter and Setter of prop parent
 */
Object.defineProperty(FlowNode.prototype, 'parent', {
    get: function () {
        "use strict";
        return internal(this)._parent;
    },
    set: function (parent) {
        "use strict";
        internal(this)._parent = parent;
    }
});

/**
 * Getter and Setter of prop type
 */
Object.defineProperty(FlowNode.prototype, 'type', {
    get: function () {
        "use strict";
        return internal(this)._type;
    },
    set: function (type) {
        "use strict";
        if (FlowNode.isValidNodeType(type)) {
            internal(this)._type = type;
        }
    }
});

/**
 * Getter and Setter of prop prev
 */
Object.defineProperty(FlowNode.prototype, 'prev', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._prev);
    }
});

/**
 * Getter and Setter of prop next
 */
Object.defineProperty(FlowNode.prototype, 'next', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._next);
    }
});


(function () {
    'use strict';
    FlowNode.TYPES.forEach(function (type) {
        Object.defineProperty(FlowNode.prototype, type, {
            get: function () {
                return internal(this)[type];
            }
        });
    });
}());

/**
 * Check the node is in the collection of previous nodes of the current node
 * @param {FlowNode} prevNode
 * @returns {boolean}
 * @function
 */
FlowNode.prototype.hasPrev = function (prevNode) {
    "use strict";
    return internal(this)._prev.indexOf(prevNode) !== -1;
};

/**
 * Check the node is in the collection of next nodes of the current node
 * @param {FlowNode} nextNode
 * @returns {boolean}
 * @function
 */
FlowNode.prototype.hasNext = function (nextNode) {
    "use strict";
    return internal(this)._next.indexOf(nextNode) !== -1;
};

/**
 * Check the current node is connected to the node or not
 * @param {FlowNode} node
 * @returns {boolean}
 * @function
 */
FlowNode.prototype.isConnectedTo = function (node) {
    "use strict";
    var connected = false,
        thisNode = this;
    if (FlowNode.isFlowNode(node)) {
        FlowNode.TYPES.forEach(function (type) {
            if (internal(thisNode)[type] === node) {
                connected = true;
            }
        });
    }
    return connected;
};

/**
 * Add a node into the collection of previous nodes of the current node (should be connected first)
 * would dependent on the method 'connect'
 * @param {FlowNode} prevNode
 * @returns {boolean}
 * @function
 */
FlowNode.prototype.addPrev = function addPrev(prevNode) {
    "use strict";
    if (FlowNode.isFlowNode(prevNode) && !this.hasPrev(prevNode) && prevNode.isConnectedTo(this)) {
        internal(this)._prev.push(prevNode);
    }
};

/**
 * Add a node into the collection of next nodes of the current node (should be connected first)
 * would dependent on the method 'connect'
 * @param {FlowNode} nextNode
 * @returns {boolean}
 * @function
 */
FlowNode.prototype.addNext = function (nextNode) {
    "use strict";
    if (FlowNode.isFlowNode(nextNode) && !this.hasNext(nextNode) && this.isConnectedTo(nextNode)) {
        internal(this)._next.push(nextNode);
    }
};

/**
 * Connect a node ot this node with the specified connection type
 * @param {FlowNode} nextNode
 * @param {string} connectionType
 * @returns {FlowNode}
 */
FlowNode.prototype.connect = function (nextNode, connectionType) {
    "use strict";
    if (FlowNode.isFlowNode(nextNode) && FlowNode.isValidNodeType(connectionType) && !this.hasNext(nextNode)) {
        internal(this)[connectionType || FlowNode.NORMAL_CONNECTION_TYPE] = nextNode;
        this.addNext(nextNode);
        nextNode.addPrev(this);
    }
    return this;
};

module.exports = FlowNode;