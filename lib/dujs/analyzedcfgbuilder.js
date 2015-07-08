/**
 * Created by ChengFuLin on 2015/5/27.
 */
var analyzedcfgFactory = require('./analyzedcfgfactory'),
    flownodeFactory = require('../esgraph').factoryFlowNode,
    vardefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    FlowNode = require('../esgraph').FlowNode,
    Scope = require('./scope'),
    Def = require('./def'),
    ScopeTree = require('./scopetree'),
    AnalysisItemCtrl = require('./analysisitemctrl'),
    DefUseAnalyzer = require('./defuseanalyzer'),
    Set = require('../analyses').Set,
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
function connectCallerCalleeCFGs(callerCFG, calleeCFG, callSiteNode) {
    "use strict";
    var connectedCFG = [],
        connectedCFGNodes = [];
    if (callerCFG[2].indexOf(callSiteNode) !== -1 && FlowNode.isFlowNode(callSiteNode)) {
        var nodesBeforeCall = callerCFG[2].slice(0, callerCFG[2].indexOf(callSiteNode)+1),
            nodesAfterCall = callerCFG[2].slice(callerCFG[2].indexOf(callSiteNode)+1, callerCFG[2].length),
            callReturnNode = flownodeFactory.createCallReturnNode();
        connectedCFG.push(callerCFG[0]);
        connectedCFG.push(callerCFG[1]);

        callSiteNode.type = FlowNode.CALL_NODE_TYPE;
        callReturnNode.generate = callSiteNode.generate;
        callReturnNode.kill = callSiteNode.kill;
        callReturnNode.line = callSiteNode.line;
        callReturnNode.col = callSiteNode.col;
        callSiteNode.setGENSetEmpty();
        callSiteNode.setKILLSetEmpty();
        FlowNode.CONNECTION_TYPES.forEach(function (connection) {
            if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(connection) !== -1) {
                callSiteNode[connection].forEach(function (node) {
                    callSiteNode.disconnect(node);
                    callReturnNode.connect(node, connection);
                });
            } else {
                var node = callSiteNode[connection];
                callSiteNode.disconnect(node);
                callReturnNode.connect(node, connection);
            }
        });
        callSiteNode.connect(calleeCFG[0], FlowNode.CALL_CONNECTION_TYPE);

        connectedCFGNodes = connectedCFGNodes.concat(nodesBeforeCall);

        calleeCFG[1].connect(callReturnNode, FlowNode.RETURN_CONNECTION_TYPE);
        calleeCFG[2].forEach(function (node) {
            if (connectedCFGNodes.indexOf(node) === -1) {
                connectedCFGNodes.push(node);
            }
        });
        connectedCFGNodes.push(callReturnNode);
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
        if (!!cfgNode.astNode && cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && cfgNode.type !== FlowNode.EXIT_NODE_TYPE) {
            walkes(cfgNode.astNode, {
                CallExpression: function (node) {
                    var callee = cfgNode.scope.getVarByName(node.callee.name);
                    if (!!callee) {
                        var availDefs = cfgNode.scope.getAvailDefsByVariable(callee, cfgNode);
                        if (!!availDefs) {
                            availDefs.some(function (def) {
                                if (def.type === Def.FUNCTION_TYPE) {
                                    var scope = scopeTree.getScopeByDef(def);
                                    if (!!scope) {
                                        connectedCFG = [].concat(connectCallerCalleeCFGs(connectToCFG, scope.cfg, cfgNode));
                                        var recursiveResult = findInterProceduralRealatedScopesAndCFG(scope, scopeTree, connectedCFG);
                                        recursiveResult.relatedScopes.forEach(function (scope) {
                                            if (relatedScopes.indexOf(scope) === -1) {
                                                relatedScopes.push(scope);
                                            }
                                        });
                                        if (!!recursiveResult.connectedCFG) {
                                            connectedCFG = [].concat(recursiveResult.connectedCFG);
                                        }
                                        return true;
                                    }
                                }
                            });
                            connectToCFG = [].concat(connectedCFG);
                        }
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
            }
            /// exclude related scopes of found inter-procedurals
            scopes = [].concat(removeQueuedAnalysisItemWithRelatedScopes(scopes, relatedScopes));
        }
    }
    return interProceduralAnalysisItems;
};

function connectProgramAndEventHandlers(programAnalysisItem, eventHandlerAnalysisItems) {
    "use strict";

    var connectedCFG = [],
        connectCFGNodes = [];


    /// If there is any event handlers
    if (eventHandlerAnalysisItems instanceof Array) {
        connectedCFG.push(programAnalysisItem.cfg[0]);
        connectedCFG.push(programAnalysisItem.cfg[1]);
        connectCFGNodes = connectCFGNodes.concat(programAnalysisItem.cfg[2]);

        var loopNode = flownodeFactory.createLoopNode();
        var loopReturnNode = flownodeFactory.createLoopReturnNode();
        var prevNodesOfExit = [].concat(programAnalysisItem.cfg[1].prev);
        programAnalysisItem.cfg[1].prev.forEach(function (node) {
            if (node.normal === programAnalysisItem.cfg[1]) {
                node.connect(loopNode);
            } else if (node.exception === programAnalysisItem.cfg[1]) {
                node.connect(loopNode, FlowNode.EXCEPTION_CONNECTION_TYPE);
            } else if (node.true === programAnalysisItem.cfg[1]) {
                node.connect(loopNode, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
            } else if (node.false === programAnalysisItem.cfg[1]) {
                node.connect(loopNode, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
            }
            node.disconnect(programAnalysisItem.cfg[1]);
        });

        loopNode.connect(programAnalysisItem.cfg[1]);
        connectCFGNodes.push(loopNode);
        connectCFGNodes.push(loopReturnNode);
        /// Connect LOOP_RETURN node to LOOP node with RETURN_CONNECTION
        loopReturnNode.connect(loopNode, FlowNode.RETURN_CONNECTION_TYPE);

        if (eventHandlerAnalysisItems.length > 0) {
            /// Then, connect LOOP node to other handlers with ON_EVENT_CONNECTION
            eventHandlerAnalysisItems.forEach(function (handler, index) {
                loopNode.connect(handler.cfg[0], FlowNode.ON_EVENT_CONNECTION_TYPE);
                connectCFGNodes = connectCFGNodes.concat(handler.cfg[2]);
                handler.cfg[1].connect(loopReturnNode);
                //if (index === 0) {
                //    connectCFGNodes.push(loopReturnNode);
                //    /// Connect LOOP_RETURN node to LOOP node with RETURN_CONNECTION
                //    loopReturnNode.connect(loopNode, FlowNode.RETURN_CONNECTION_TYPE);
                //}
            });
        } else {
            loopNode.connect(loopReturnNode, FlowNode.ON_EVENT_CONNECTION_TYPE);
        }
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

AnalyzedCFGBuilder.prototype.buildInterPageAnalysisItem = function (globalScopeCtrl, intraPageAnalysisItems) {
    "use strict";
    if (intraPageAnalysisItems instanceof Array) {
        var connectedGraph = [].concat(globalScopeCtrl.graph);
        var relatedScopes = [globalScopeCtrl.scope];
        var localStorageNode = globalScopeCtrl.localStorageNode;
        intraPageAnalysisItems.forEach(function (analysisItem) {
            localStorageNode.connect(analysisItem.cfg[0], FlowNode.LOAD_STROAGE_CONNECTION_TYPE);
            analysisItem.cfg[2].forEach(function (cfgNode) {
                if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && !!cfgNode.astNode) {
                    walkes(cfgNode.astNode, {
                        AssignmentExpression: function (node, recurse) {
                            if (node.left.type === 'MemberExpression') {
                                var definedVar = globalScopeCtrl.scope.getVarByName(node.left.object.name);
                                if (!!definedVar) {
                                    cfgNode.connect(localStorageNode, FlowNode.SAVE_STORAGE_CONNECTION_TYPE);
                                    if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {
                                        recurse(node.right);
                                    }
                                }
                            }
                        },
                        CallExpression: function (node) {
                            if (node.callee.type === 'MemberExpression') {
                                if (globalScopeCtrl.localStorageSetterNames.indexOf(node.callee.property.name) !== -1) {
                                    var definedVar = globalScopeCtrl.scope.getVarByName(node.callee.left.object.name);
                                    if (!!definedVar) {
                                        cfgNode.connect(localStorageNode, FlowNode.SAVE_STORAGE_CONNECTION_TYPE);
                                    }
                                }
                            }
                        },
                        UpdateExpression: function (node) {
                            var definedVar = globalScopeCtrl.scope.getVarByName(node.argument.name);
                            if (!!definedVar) {
                                cfgNode.connect(localStorageNode, FlowNode.SAVE_STORAGE_CONNECTION_TYPE);
                            }
                        },
                        SwitchCase: function () {/* ignore the SwitchCase node of AST */
                        }
                    });
                }
            });
            connectedGraph[2] = connectedGraph[2].concat(analysisItem.cfg[2]);
            relatedScopes.concat(analysisItem.scopeWrappers);
        });

        var interPageItem = analyzedcfgFactory.create();
        interPageItem.scopeWrappers = relatedScopes;
        interPageItem.cfg = [].concat(connectedGraph);
        return interPageItem;
    }
};

var singleton = new AnalyzedCFGBuilder();
module.exports = singleton;