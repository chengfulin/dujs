/**
 * Created by ChengFuLin on 2015/5/20.
 */
var namespace = require('../namespace'),
    Set = require('../analyses').Set,
    Map = require('core-js/es6/map'),
    internal = namespace();

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
    FlowNode.validateTypeValue(nodeType);

    internal(this)._cfgId = null;
    internal(this)._astNode = astNode || null;
    internal(this)._parent = parent || null;
    internal(this)._type = nodeType;
    internal(this)._prev = [];
    internal(this)._next = [];
    internal(this)._nextSibling = null;
    internal(this)._kill = null;
    internal(this)._generate = null;
    internal(this)._cuse = null;
    internal(this)._puse = null;
    internal(this)._label = null;
    internal(this)._line = null;
    internal(this)._col = null;
    internal(this)._extraReachIns = null;
    internal(this)._extraReachOuts = null;

    initializeConnections(this);
    if (internal(this)._type === FlowNode.ENTRY_NODE_TYPE || internal(this)._type === FlowNode.EXIT_NODE_TYPE) {
        internal(this)._label = internal(this)._type;
    }

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-test-block */
FlowNode._testonly_ = {
    initializeConnections: initializeConnections,
    addPrev: addPrev,
    addNext: addNext,
    removePrev: removePrev,
    removeNext: removeNext
};
/* end-test-block */

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
FlowNode.validateTypeValue = function (type, msg) {
    "use strict";
    if (!FlowNode.isValidNodeType(type)) {
        throw new Error(msg || 'Invalid type of FlowNode');
    }
};

/**
 * Validate an object is a FlowNode or not
 * @param obj
 * @param {string} [msg] Custom error message
 * @throws {Error} when the object is not a FlowNode
 * @static
 * @function
 */
FlowNode.validateType = function (obj, msg) {
    "use strict";
    if (!FlowNode.isFlowNode(obj)) {
        throw new Error(msg || 'Not a FlowNode');
    }
};

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
 * Type of the call-return node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'CALL_RETURN_NODE_TYPE', {
    value: 'callReturn',
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Type of the loop-return node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'LOOP_RETURN_NODE_TYPE', {
    value: 'loopReturn',
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
 * Type of the branch node
 * @type {string}
 */
Object.defineProperty(FlowNode, 'BRANCH_NODE_TYPE', {
    value: 'branch',
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
        FlowNode.CALL_RETURN_NODE_TYPE,
        FlowNode.LOOP_NODE_TYPE,
        FlowNode.LOOP_RETURN_NODE_TYPE,
        FlowNode.NORMAL_NODE_TYPE,
        FlowNode.BRANCH_NODE_TYPE
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
 * Type of the onEvent connection
 * @type {string}
 */
Object.defineProperty(FlowNode, 'ON_EVENT_CONNECTION_TYPE', {
    value: 'onEvent',
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
        FlowNode.EXCEPTION_CONNECTION_TYPE,
        FlowNode.FALSE_BRANCH_CONNECTION_TYPE,
        FlowNode.TRUE_BRANCH_CONNECTION_TYPE,
        FlowNode.NORMAL_CONNECTION_TYPE,
        FlowNode.CALL_CONNECTION_TYPE,
        FlowNode.RETURN_CONNECTION_TYPE,
        FlowNode.ON_EVENT_CONNECTION_TYPE
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
    },
    set: function (id) {
        "use strict";
        internal(this)._cfgId = id;
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
 * Getter of prop prev
 */
Object.defineProperty(FlowNode.prototype, 'prev', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._prev);
    }
});

/**
 * Getter of prop next
 */
Object.defineProperty(FlowNode.prototype, 'next', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._next);
    }
});

/**
 * Getter of prop nextSibling
 */
Object.defineProperty(FlowNode.prototype, 'nextSibling', {
    get: function () {
        "use strict";
        return internal(this)._nextSibling;
    },
    set: function (node) {
        "use strict";
        if (FlowNode.isFlowNode(node)) {
            internal(this)._nextSibling = node;
        }
    }
});

/**
 * Getter of prop kill
 */
Object.defineProperty(FlowNode.prototype, 'kill', {
    get: function () {
        "use strict";
        return (!!internal(this)._kill)? new Set(internal(this)._kill) : null;
    },
    set: function (killSet) {
        "use strict";
        if (killSet instanceof Set) {
            internal(this)._kill = killSet;
        }
    }
});

/**
 * Getter of prop generate
 */
Object.defineProperty(FlowNode.prototype, 'generate', {
    get: function () {
        "use strict";
        return (!!internal(this)._generate)? new Set(internal(this)._generate.values()) : null;
    },
    set: function (genSet) {
        "use strict";
        if (genSet instanceof Set) {
            internal(this)._generate = new Set(genSet);
        }
    }
});

/**
 * Getter of prop cuse
 */
Object.defineProperty(FlowNode.prototype, 'cuse', {
    get: function () {
        "use strict";
        return (!!internal(this)._cuse)? new Set(internal(this)._cuse) : null;
    },
    set: function (cuseSet) {
        "use strict";
        if (cuseSet instanceof Set) {
            internal(this)._cuse = cuseSet;
        }
    }
});

/**
 * Getter of prop puse
 */
Object.defineProperty(FlowNode.prototype, 'puse', {
    get: function () {
        "use strict";
        return (!!internal(this)._puse)? new Set(internal(this)._puse) : null;
    },
    set: function (puseSet) {
        "use strict";
        if (puseSet instanceof Set) {
            internal(this)._puse = puseSet;
        }
    }
});

Object.defineProperty(FlowNode.prototype, 'label', {
    get: function () {
        "use strict";
        return internal(this)._label;
    },
    set: function (text) {
        "use strict";
        if (typeof text === 'string') {
            internal(this)._label = text;
        }
    }
});

Object.defineProperty(FlowNode.prototype, 'line', {
    get: function () {
        "use strict";
        return internal(this)._line;
    },
    set: function (lineNum) {
        "use strict";
        if (typeof lineNum === 'number') {
            internal(this)._line = lineNum;
        }
    }
});

Object.defineProperty(FlowNode.prototype, 'col', {
    get: function () {
        "use strict";
        return internal(this)._col;
    },
    set: function (column) {
        "use strict";
        if (typeof column === 'number') {
            internal(this)._col = column;
        }
    }
});

Object.defineProperty(FlowNode.prototype, 'extraReachIns', {
    get: function () {
        "use strict";
        if (!!internal(this)._extraReachIns) {
            var map = new Map();
            internal(this)._extraReachIns.forEach(function (val, key) {
                map.set(key, val);
            });
            return map;
        }
        return null;
    }
});

Object.defineProperty(FlowNode.prototype, 'extraReachOuts', {
    get: function () {
        "use strict";
        if (!!internal(this)._extraReachOuts) {
            var map = new Map();
            internal(this)._extraReachOuts.forEach(function (val, key) {
                map.set(key, val);
            });
            return map;
        }
        return null;
    }
});

/**
 * Create and initialize the connections
 * @param {FlowNode} thisNode
 * @private
 * @function
 */
function initializeConnections(thisNode) {
    'use strict';
    FlowNode.CONNECTION_TYPES.forEach(function (type) {
        if (type === FlowNode.ON_EVENT_CONNECTION_TYPE) {
            internal(thisNode)[type] = [];
        } else {
            internal(thisNode)[type] = null;
        }
        Object.defineProperty(thisNode, type, {
            get: function () {
                return internal(thisNode)[type];
            }
        });
    });
}

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
        FlowNode.CONNECTION_TYPES.forEach(function (type) {
            if (type === FlowNode.ON_EVENT_CONNECTION_TYPE) {
                internal(thisNode)[type].forEach(function (transNode) {
                    if (transNode === node) {
                        connected = true;
                    }
                });
            } else if (internal(thisNode)[type] === node) {
                connected = true;
            }
        });
    }
    return connected;
};

/**
 * Add a node into the collection of previous nodes of the current node (used in the method connect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} prevNode
 * @returns {boolean}
 * @function
 */
function addPrev(thisNode, prevNode) {
    "use strict";
    if (FlowNode.isFlowNode(prevNode) && !thisNode.hasPrev(prevNode)) {
        internal(thisNode)._prev.push(prevNode);
    }
}

/**
 * Add a node into the collection of next nodes of the current node (used in the method connect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} nextNode
 * @returns {boolean}
 * @function
 */
function addNext(thisNode, nextNode) {
    "use strict";
    if (FlowNode.isFlowNode(nextNode) && !thisNode.hasNext(nextNode)) {
        internal(thisNode)._next.push(nextNode);
    }
}

/**
 * Remove a previous node from the collection of this node (used in the method disconnect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} prevNode
 * @function
 */
function removePrev(thisNode, prevNode) {
    "use strict";
    if (FlowNode.isFlowNode(prevNode) && thisNode.hasPrev(prevNode)) {
        var index = -1;
        internal(thisNode)._prev.forEach(function (node, i) {/// find the index of the prevNode
            if (node === prevNode) {
                index = i;
            }
        });
        if (index >= 0) {/// remove from the array of previous nodes
            internal(thisNode)._prev.splice(index, 1);
        }
    }
}

/**
 * Remove a next node from the collection of this node (used in the method connect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} nextNode
 * @function
 */
function removeNext(thisNode, nextNode) {
    "use strict";
    if (FlowNode.isFlowNode(nextNode) && thisNode.hasNext(nextNode)) {
        var index = -1;
        internal(thisNode)._next.forEach(function (node, i) {/// find the index of the nextNode
            if (node === nextNode) {
                index = i;
            }
        });
        if (index >= 0) {/// remove from the array of next nodes
            internal(thisNode)._next.splice(index, 1);
        }
    }
}

/**
 * Connect a node ot this node with the specified connection type
 * @param {FlowNode} nextNode
 * @param {string} connectionType
 * @returns {FlowNode}
 * @function
 */
FlowNode.prototype.connect = function (nextNode, connectionType) {
    "use strict";
    if (FlowNode.isFlowNode(nextNode)) {
        if (connectionType === FlowNode.ON_EVENT_CONNECTION_TYPE) {
            internal(this)[connectionType].push(nextNode);
        } else if (FlowNode.isValidConnectionType(connectionType)) {
            internal(this)[connectionType] = nextNode;
        } else if (!connectionType) {
            internal(this)[FlowNode.NORMAL_CONNECTION_TYPE] = nextNode;
        }
        addNext(this, nextNode);
        addPrev(nextNode, this);
    }
    return this;
};

/**
 * Disconnect this node and the nextNode
 * @param {FlowNode} nextNode
 * @returns {FlowNode} the node disconnected
 * @function
 */
FlowNode.prototype.disconnect = function (nextNode) {
    "use strict";
    var thisNode = this;
    if (FlowNode.isFlowNode(nextNode)) {
        FlowNode.CONNECTION_TYPES.forEach(function (type) {
            if (type === FlowNode.ON_EVENT_CONNECTION_TYPE) {
                var nextNodeIndex = internal(thisNode)[type].indexOf(nextNode);
                if (nextNodeIndex !== -1) {
                    var oneventConnections = [];
                    oneventConnections = oneventConnections.concat(internal(thisNode)[type].slice(0, nextNodeIndex));
                    oneventConnections = oneventConnections.concat(
                        internal(thisNode)[type].slice(nextNodeIndex + 1,
                        internal(thisNode)[type].length)
                    );
                    internal(thisNode)[type] = oneventConnections;
                }
            } else if (internal(thisNode)[type] === nextNode) {
                internal(thisNode)[type] = null;
            }
        });
        removeNext(thisNode, nextNode);
        removePrev(nextNode, thisNode);
    }
    return this;
};

module.exports = FlowNode;