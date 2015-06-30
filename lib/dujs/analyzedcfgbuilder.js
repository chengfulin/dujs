/**
 * Created by ChengFuLin on 2015/5/27.
 */
var analyzedcfgFactory = require('./analyzedcfgfactory'),
    flownodeFactory = require('../esgraph').factoryFlowNode,
    FlowNode = require('../esgraph').FlowNode,
    Scope = require('./scope'),
    Def = require('./def'),
    ScopeTree = require('./scopetree'),
    AnalysisItemCtrl = require('./analysisitemctrl'),
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
AnalyzedCFGBuilder.prototype.buildIntraProceduralAnalysisItems = function (scopeTree) {
    "use strict";
    var analyzedCFGs = [];
    if (ScopeTree.isScopeTree(scopeTree)) {
        scopeTree.scopes.forEach(function (scope) {
            var analyzedCFG = analyzedcfgFactory.create();
            /// Assign value
            if (!!analyzedCFG) {
                analyzedCFG.cfg = scope.cfg;
                analyzedCFG.addRelatedScope(scope);
                analyzedCFGs.push(analyzedCFG);
            }
        });
    }
    return analyzedCFGs;
};

/**
 * Connect CFGs of caller and callee
 * @param callerCFG
 * @param calleeCFG
 * @param {FlowNode} callSiteNode
 * @param {boolean} isDuplicateCall
 * @returns {Array} New connected CFG
 * @private
 * @function
 */
function connectCallerCalleeCFGs(callerCFG, calleeCFG, callSiteNode, isDuplicateCall) {
    "use strict";
    var connectedCFG = [],
        connectedCFGNodes = [];
    if (callerCFG[2].indexOf(callSiteNode) !== -1 && FlowNode.isFlowNode(callSiteNode)) {
        var nodesBeforeCall = callerCFG[2].slice(0, callerCFG[2].indexOf(callSiteNode)),
            nodesAfterCall = callerCFG[2].slice(callerCFG[2].indexOf(callSiteNode), callerCFG[2].length),
            callNode = flownodeFactory.create(FlowNode.CALL_NODE_TYPE, null, null);
        connectedCFG.push(callerCFG[0]);
        connectedCFG.push(callerCFG[1]);

        callSiteNode.prev.forEach(function (prevNode) {
            prevNode.disconnect(callSiteNode);
            prevNode.connect(callNode);
        });
        callNode.connect(calleeCFG[0], FlowNode.CALL_CONNECTION_TYPE);

        connectedCFGNodes = connectedCFGNodes.concat(nodesBeforeCall);
        connectedCFGNodes.push(callNode);

        callSiteNode.type = FlowNode.CALL_RETURN_NODE_TYPE;
        calleeCFG[1].connect(callSiteNode, FlowNode.RETURN_CONNECTION_TYPE);

        if (!isDuplicateCall) {
            connectedCFGNodes = connectedCFGNodes.concat(calleeCFG[2]);
        }
        connectedCFGNodes = connectedCFGNodes.concat(nodesAfterCall);
        connectedCFG.push(connectedCFGNodes);
    }
    return connectedCFG;
}

/**
 * Find related scopes and get connected CFG of inter-procedurals
 * @param currentScope
 * @param scopeTree
 * @param connectToCFG
 * @returns {{relatedScopes: Array, connectedCFG: *}}
 * @private
 * @function
 */
function findInterProceduralRealatedScopesAndCFG(currentScope, scopeTree, connectToCFG) {
    "use strict";
    if (!connectToCFG) {
        connectToCFG = currentScope.cfg;
    }
    var relatedScopes = [],
        connectedCFG = null;
    relatedScopes.push(currentScope);
    currentScope.cfg[2].forEach(function (cfgNode) {
        if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && cfgNode.type !== FlowNode.EXIT_NODE_TYPE) {
            walkes(cfgNode.astNode, {
                CallExpression: function (node) {
                    /// TODO: support anonymous functions
                    var callee = cfgNode.scope.getVarByName(node.callee.name);
                    if (!!callee) {
                        /// find possible callee scope
                        /// TODO: if the normal connection could be multiple, find all possible callee scopes
                        var calleeDefs = [],
                            calleeScope;
                        cfgNode.reachIns.forEach(function (varDef) {
                            if (varDef.variable === callee) {
                                calleeDefs.push(varDef.definition);
                            }
                        });
                        calleeDefs.forEach(function (def) {
                            var scope = scopeTree.getScopeByDef(def);
                            if (!!scope) {
                                calleeScope = scope;
                            }
                        });
                        if (relatedScopes.indexOf(calleeScope) === -1) {
                            connectedCFG = connectCallerCalleeCFGs(connectToCFG, calleeScope.cfg, cfgNode);
                        } else {
                            connectedCFG = connectCallerCalleeCFGs(connectToCFG, calleeScope.cfg, cfgNode, true);
                        }
                        var recursiveResult = findInterProceduralRealatedScopesAndCFG(calleeScope, scopeTree, connectedCFG);
                        recursiveResult.relatedScopes.forEach(function (scope) {
                            if (relatedScopes.indexOf(scope) === -1) {
                                relatedScopes.push(scope);
                            }
                        });
                        connectToCFG = [].concat(connectedCFG);
                    }
                }
            });
        }
    });
    return {relatedScopes: relatedScopes, connectedCFG: connectedCFG};
}

/**
 * Remove related scopes from queueOfScopes, won't change queueOfScopes but return a new array of scopes after being removed
 * @param queueOfScopes
 * @param relatedScopes
 * @returns {Array} scopes after removed
 */
function removeQueuedAnalysisItemWithRelatedScopes(queueOfScopes, relatedScopes) {
    "use strict";
    var excludedScopes = [],
        queue = [].concat(queueOfScopes);
    queue.forEach(function (item) {
        if (relatedScopes.indexOf(item) !== -1) {
            excludedScopes.push(item);
        }
    });
    excludedScopes.forEach(function (item) {
        var index = queue.indexOf(item);
        if (item !== -1) {
            queue.splice(index, 1);
        }
    });
    return queue;
}

/**
 * Build AnalyzedCFGs for inter-procedural CFGs
 * @param {ScopeTree} scopeTree
 * @returns {Array}
 * @function
 */
AnalyzedCFGBuilder.prototype.buildInterProceduralAnalysisItems = function (scopeTree) {
    "use strict";
    var interProceduralAnalysisItems = [];
    if (ScopeTree.isScopeTree(scopeTree)) {
        var scopes = [].concat(scopeTree.scopes);
        while (scopes.length > 0) {
            var relatedScopes,
                connectedCFG;
            var foundReault = findInterProceduralRealatedScopesAndCFG(scopes[0], scopeTree);
            relatedScopes = [].concat(foundReault.relatedScopes);
            connectedCFG = [].concat(foundReault.connectedCFG);

            if (relatedScopes.length > 1) {/// there is any inter-procedurals indeed
                /// create interProcedural analysis item
                var analyzedCFG = analyzedcfgFactory.create();
                if (!!analyzedCFG) {
                    analyzedCFG.cfg = connectedCFG;
                    analyzedCFG.scopeWrappers = relatedScopes;
                    interProceduralAnalysisItems.push(analyzedCFG);
                }
                /// exclude related scopes of found inter-procedurals
                scopes = [].concat(removeQueuedAnalysisItemWithRelatedScopes(scopes, relatedScopes));
            } else {
                scopes = [].concat(scopes.slice(1, scopes.length));
            }
        }
    }
    return interProceduralAnalysisItems;
};

function connectProgramAndEventHandlers(programAnalysisItem, eventHandlerAnalysisItems) {
    "use strict";

    var connectedCFG = [],
        connectCFGNodes = [];


    /// If there is any event handlers
    if (eventHandlerAnalysisItems instanceof Array && eventHandlerAnalysisItems.length > 0) {
        connectedCFG.push(programAnalysisItem.cfg[0]);
        connectedCFG.push(programAnalysisItem.cfg[1]);
        connectCFGNodes = connectCFGNodes.concat(programAnalysisItem.cfg[2]);

        var haltNode = flownodeFactory.createHaltNode();
        var loopNode = flownodeFactory.createLoopNode();
        var loopReturnNode = flownodeFactory.createLoopReturnNode();
        programAnalysisItem.cfg[1].prev.forEach(function (node) {
            if (node.exception === programAnalysisItem.cfg[1]) {
                node.connect(haltNode, FlowNode.EXCEPTION_CONNECTION_TYPE);
            }
            if (node.normal === programAnalysisItem.cfg[1]) {
                node.connect(loopNode);
            }
            node.disconnect(programAnalysisItem.cfg[1]);
        });

        haltNode.connect(programAnalysisItem.cfg[1], FlowNode.EXCEPTION_CONNECTION_TYPE);
        haltNode.connect(loopNode);
        connectCFGNodes.splice(connectCFGNodes.indexOf(programAnalysisItem.cfg[1]), 0, haltNode); /// insert before Exit Node
        connectCFGNodes.push(loopNode);

        /// Then, connect LOOP node to other handlers with ON_EVENT_CONNECTION
        eventHandlerAnalysisItems.forEach(function (handler, index) {
            loopNode.connect(handler.cfg[0], FlowNode.ON_EVENT_CONNECTION_TYPE);
            connectCFGNodes = connectCFGNodes.concat(handler.cfg[2]);
            handler.cfg[1].connect(loopReturnNode);
            if (index === 0) {
                connectCFGNodes.push(loopReturnNode);
                /// Connect LOOP_RETURN node to LOOP node with RETURN_CONNECTION
                loopReturnNode.connect(loopNode, FlowNode.RETURN_CONNECTION_TYPE);
            }
        });
        connectedCFG.push(connectCFGNodes);
    }
    return connectedCFG;
}

AnalyzedCFGBuilder.prototype.buildIntraPageAnalysisItem = function (analysisItemCtrl, scopeTree) {
    "use strict";
    var validHandlers = [],
        handlerAnalysisItems = [],
        newAnalyzedItem = [];
    if (AnalysisItemCtrl.isAnalysisItemCtrl(analysisItemCtrl) && ScopeTree.isScopeTree(scopeTree)) {
        if (scopeTree.root.scope.type === Scope.PROGRAM_TYPE) {
            var programAnalysisItem = analysisItemCtrl.getAnalysisItemByTopRelatedScope(scopeTree.root);
            if (!!programAnalysisItem) {
                programAnalysisItem.cfg[2].forEach(function (cfgNode) {
                    if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && !!cfgNode.astNode) {
                        walkes(cfgNode.astNode, {
                            CallExpression: function (node) {
                                if (node.callee.type === 'MemberExpression') {
                                    if (node.callee.property.name === 'addEventListener') {
                                        var handler = cfgNode.scope.getVarByName(node.arguments[1].name);
                                        if (!!handler) {
                                            cfgNode.reachIns.some(function (vardef) {
                                                if (vardef.variable === handler && vardef.definition.type === Def.FUNCTION_TYPE) {
                                                    var handlerScope = scopeTree.getScopeByDef(vardef.definition);
                                                    if (!!handlerScope && validHandlers.indexOf(handlerScope) === -1) {
                                                        validHandlers.push(handlerScope);
                                                        return true;
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        });
                    }
                });

                validHandlers.forEach(function (handlerScope) {
                    var handlerAnalysisItem = analysisItemCtrl.getAnalysisItemByTopRelatedScope(handlerScope);
                    if (!!handlerAnalysisItem) {
                        handlerAnalysisItems.push(handlerAnalysisItem);
                    }
                });

                var cfg = connectProgramAndEventHandlers(programAnalysisItem, handlerAnalysisItems);
                if (cfg.length > 0) {
                    var intraPageAnalysisItem = analyzedcfgFactory.create();
                    intraPageAnalysisItem.cfg = cfg;
                    programAnalysisItem.scopeWrappers.forEach(function (scope) {
                        intraPageAnalysisItem.addRelatedScope(scope);
                    });
                    handlerAnalysisItems.forEach(function (item) {
                        item.scopeWrappers.forEach(function (scope) {
                            intraPageAnalysisItem.addRelatedScope(scope);
                        });
                    });
                    newAnalyzedItem.push(intraPageAnalysisItem);
                }
            }
        }
    }
    return newAnalyzedItem;
};

var singleton = new AnalyzedCFGBuilder();
module.exports = singleton;