/**
 * Created by ChengFuLin on 2015/5/27.
 */
var analyzedcfgFactory = require('./analyzedcfgfactory'),
    flownodeFactory = require('../esgraph').factoryFlowNode,
    FlowNode = require('../esgraph').FlowNode,
    ScopeTree = require('./scopetree'),
    ScopeWrapper = require('./scopewrapper');

function AnalyzedCFGBuilder() {
    "use strict";

    /* start-test-block */
    this._testonly_ = {
        connectCallerCalleeCFGs: connectCallerCalleeCFGs
    };
    /* end-test-block */
}


/**
 * Produce collection of AnalyzedCFG for intra-procedural dataflow
 * @param {ScopeTree} scopeTree
 * @returns {Array} AnalyzedCFGs
 * @function
 */
AnalyzedCFGBuilder.prototype.buildIntraProceduralCFGs = function (scopeTree) {
    "use strict";
    var analyzedCFGs = [];
    if (ScopeTree.isScopeTree(scopeTree)) {
        scopeTree.scopes.forEach(function (scope) {
            var analyzedCFG = analyzedcfgFactory.create(scope);
            if (!!analyzedCFG) {
                analyzedCFGs.push(analyzedCFG);
            }
        });
    }
    return analyzedCFGs;
};

/**
 * Connect CFGs of caller and callee
 * @param caller CFG
 * @param callee CFG
 * @param {FlowNode} callSiteNode
 * @returns {Array} New connected CFG
 * @private
 * @function
 */
function connectCallerCalleeCFGs(caller, callee, callSiteNode) {
    "use strict";
    var connectedCFG = [],
        connectedCFGNodes = [];
    if (caller[2].indexOf(callSiteNode) !== -1 && FlowNode.isFlowNode(callSiteNode)) {
        var nodesBeforeCall = caller[2].slice(0, caller[2].indexOf(callSiteNode)),
            nodesAfterCall = caller[2].slice(caller[2].indexOf(callSiteNode), caller[2].length),
            callNode = flownodeFactory.create(FlowNode.CALL_NODE_TYPE, null, null);
        connectedCFG.push(caller[0]);
        connectedCFG.push(caller[1]);

        callSiteNode.prev.forEach(function (prevNode) {
            prevNode.disconnect(callSiteNode);
            prevNode.connect(callNode);
        });
        callNode.connect(callee[0], FlowNode.CALL_CONNECTION_TYPE);

        connectedCFGNodes = connectedCFGNodes.concat(nodesBeforeCall);
        connectedCFGNodes.push(callNode);

        callSiteNode.type = FlowNode.CALL_RETURN_NODE_TYPE;
        callee[1].connect(callSiteNode, FlowNode.RETURN_CONNECTION_TYPE);

        connectedCFGNodes = connectedCFGNodes.concat(callee[2]);
        connectedCFGNodes = connectedCFGNodes.concat(nodesAfterCall);
        connectedCFG.push(connectedCFGNodes);
    }
    return connectedCFG;
}

/**
 * Build a new AnalyzedCFG for inter-procedural CFG
 * @param {ScopeWrapper} callerScope
 * @param {ScopeWrapper} calleeScope
 * @param {FlowNode} callSiteNode
 * @returns {*|AnalyzedCFG}
 * @function
 */
AnalyzedCFGBuilder.prototype.buildInterProceduralCFG = function (callerScope, calleeScope, callSiteNode) {
    "use strict";
    var newAnalyzedCFG = null;
    if (ScopeWrapper.isScopeWrapper(callerScope) && ScopeWrapper.isScopeWrapper(calleeScope)) {
        var interProceduralCFG = connectCallerCalleeCFGs(callerScope.cfg, calleeScope.cfg, callSiteNode);
        newAnalyzedCFG = analyzedcfgFactory.create();
        newAnalyzedCFG.cfg = interProceduralCFG;
        newAnalyzedCFG.addRelatedScope(callerScope);
        newAnalyzedCFG.addRelatedScope(calleeScope);
    }
    return newAnalyzedCFG;
};

function connectProgramAndEventHandlers(programScope, eventHandlerScopes, windowLoadEventHandler) {
    "use strict";

    var connectedCFG = [],
        connectCFGNodes = [];
    connectedCFG.push(programScope.cfg[0]);
    connectedCFG.push(programScope.cfg[1]);
    connectCFGNodes.concat(programScope.cfg);

    /// If there is any event handlers
    if (eventHandlerScopes instanceof Array && eventHandlerScopes.length > 0) {
        /// Then, create a LOOP node
        var loopNode = flownodeFactory.createLoopNode();
        /// If there is a window load event handler,
        /// connect the prev nodes of program's EXIT node which is connected with NORMAL_connection to entry of the handler.
        if (!!windowLoadEventHandler) {
            programScope.cfg[1].prev.forEach(function (node) {
                if (node.normal === programScope.cfg[1]) {
                    node.connect(windowLoadEventHandler.cfg[0], FlowNode.NORMAL_CONNECTION_TYPE);
                }
            });
            windowLoadEventHandler.cfg[1].connect(loopNode);
            connectCFGNodes.concat(windowLoadEventHandler.cfg);
        } else {
            /// otherwise, connect the prev nodes to the LOOP node
            programScope.cfg[1].prev.forEach(function (node) {
                if (node.normal === programScope.cfg[1]) {
                    node.connect(loopNode, FlowNode.NORMAL_CONNECTION_TYPE);
                }
            });
        }
        connectCFGNodes.push(loopNode);

        /// Then, connect LOOP node to other handlers with ON_EVENT_CONNECTION
        eventHandlerScopes.forEach(function (handler) {
            if (handler !== windowLoadEventHandler) {
                loopNode.connect(handler.cfg[0], FlowNode.ON_EVENT_CONNECTION_TYPE);
                connectCFGNodes.concat(handler.cfg);
            }
        });

        /// Create a LOOP_RETURN node
        var loopReturnNode = flownodeFactory.createLoopReturnNode();
        if (eventHandlerScopes.length === 1 && eventHandlerScopes[0] === windowLoadEventHandler) {
            loopNode.connect(loopReturnNode);
        } else {
            eventHandlerScopes.forEach(function (handler) {
                if (handler !== windowLoadEventHandler) {
                    handler.cfg[1].connect(loopReturnNode);
                }
            });
        }
        connectCFGNodes.push(loopReturnNode);
        /// Connect LOOP_RETURN node to LOOP node with RETURN_CONNECTION
        loopReturnNode.connect(loopNode);
    }
    connectedCFG.push(connectCFGNodes);
    return connectedCFG;
}

AnalyzedCFGBuilder.prototype.buildIntraPageCFG = function (programScope, eventHandlerScopes, windowLoadEventHandler) {
    "use strict";
    var validHandlers = [],
        newAnalyzedCFG = null;
    if (eventHandlerScopes instanceof Array) {
        eventHandlerScopes.forEach(function (handler) {
            /// If this handler is valid and not found before
            if (ScopeWrapper.isScopeWrapper(handler) && validHandlers.indexOf(handler) === -1) {
                validHandlers.push(handler);
            }
        });

        if (ScopeWrapper.isScopeWrapper(programScope) && ScopeWrapper.isScopeWrapper(windowLoadEventHandler)) {
            /// Connect all event handlers to program scope
            var intraPageCFG = connectProgramAndEventHandlers(programScope, validHandlers);
            /// create new analysis item
            newAnalyzedCFG = analyzedcfgFactory.create();
            /// assign analysis info.
            newAnalyzedCFG.cfg = intraPageCFG;
            newAnalyzedCFG.addRelatedScope(programScope);
            validHandlers.forEach(function (handler) {
                newAnalyzedCFG.addRelatedScope(handler);
            });
        }
    }

    return newAnalyzedCFG;
};

var singleton = new AnalyzedCFGBuilder();
module.exports = singleton;