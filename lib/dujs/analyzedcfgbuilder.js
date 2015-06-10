/**
 * Created by ChengFuLin on 2015/5/27.
 */
var analyzedcfgFactory = require('./index').factoryAnalyzedCFG,
    flownodeFactory = require('../esgraph').factoryFlowNode,
    FlowNode = require('../esgraph').FlowNode,
    ScopeTree = require('./scopetree'),
    ScopeWrapper = require('./scopewrapper'),
    walkes = require('walkes');

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

var singleton = new AnalyzedCFGBuilder();
module.exports = singleton;