/*
 * ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-19
 */
var FlowNode = require('../esgraph/flownode'),
	Scope = require('./scope'),
	Def = require('./def'),
	ScopeTree = require('./scopetree'),
	modelCtrl = require('./modelctrl'),
	duAnalyzer = require('./defuseanalyzer'),
	cfgBuilder = require('./cfgbuilder'),
	scopeCtrl = require('./scopectrl'),
    factoryFlowNode = require('../esgraph/flownodefactory'),
	factoryModel = require('./modelfactory'),
    factoryVarDef = require('./vardeffactory'),
    factoryDef = require('./deffactory');
var Set = require('../analyses/set'),
	Map = require('core-js/es6/map'),
    walkes = require('walkes');

/**
 * ModelBuilder
 * @constructor
 */
function ModelBuilder() {
    "use strict";

    /* start-test-block */
    this._testonly_ = {
        _connectCallerCalleeScopeRelatedModelsAtCallSite: connectCallerCalleeScopeRelatedModelsAtCallSite,
		_getInterProceduralModelStartFromTheScope: getInterProceduralModelStartFromTheScope,
		_connectLoopNodeToPageGraph: connectLoopNodeToPageGraph
    };
    /* end-test-block */
}

/* start-public-methods */
/**
 * Produce collection of Model for intra-procedural dataflow
 */
ModelBuilder.prototype.buildIntraProceduralModels = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		scopeTree.scopes.forEach(function (scope) {
			var model = factoryModel.create();
			if (!!model) {
				if (scope.ast.type === 'FunctionDeclaration' || scope.ast.type === 'FunctionExpression') {
					model.graph = cfgBuilder.getCFG(scope.ast.body);
				} else {
					model.graph = cfgBuilder.getCFG(scope.ast);
				}
				model.addRelatedScope(scope);
				modelCtrl.addIntraProceduralModelToAPage(scopeTree, model);
			}
		});
	});
};

/**
 * Connect the related model of caller and callee at the call-site
 * @param {Model} callerModel
 * @param {Model} calleeModel
 * @param {FlowNode} callSite
 * @returns {Model|null} Connected model or null
 * @memberof ModelBuilder.prototype
 * @private
 */
function connectCallerCalleeScopeRelatedModelsAtCallSite(callerModel, calleeModel, callSite) {
    "use strict";
	var callerRelatedModelGraph = callerModel.graph,
		calleeRelatedModelGraph = calleeModel.graph;
    var connectedGraph = [],
		connectedNodes = [],
		connectedModel = null;
    if (callerRelatedModelGraph[2].indexOf(callSite) !== -1 && FlowNode.isFlowNode(callSite)) {
        var nodesBeforeCall = callerRelatedModelGraph[2].slice(0, callerRelatedModelGraph[2].indexOf(callSite)+1),
            nodesAfterCall = callerRelatedModelGraph[2].slice(callerRelatedModelGraph[2].indexOf(callSite)+1),
            callReturnNode = factoryFlowNode.createCallReturnNode();

		/// set entry and exit nodes of connected graph
        connectedGraph.push(callerRelatedModelGraph[0]);
        connectedGraph.push(callerRelatedModelGraph[1]);

		/// let call-site to be type of CALL NODE
        callSite.type = FlowNode.CALL_NODE_TYPE;

		/// move def-use analysis artifacts at call-site to CALL RETURN NODE, expect for the USE set
        callReturnNode.generate = callSite.generate;
        callReturnNode.kill = callSite.kill;
		callSite.clearGENSet();
		callSite.clearKILLSet();

		/// set the line and column label of the CALL RETURN NODE to be same as call-site
		callReturnNode.line = callSite.line;
        callReturnNode.col = callSite.col;

		/// disconnect call-site with its descending nodes, which to be connected with CALL RETURN NODE
        FlowNode.CONNECTION_TYPES.forEach(function (connection) {
            if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(connection) !== -1) {
                callSite[connection].forEach(function (node) {
                    callSite.disconnect(node);
                    callReturnNode.connect(node, connection);
                });
            } else {
                var node = callSite[connection];
                callSite.disconnect(node);
                callReturnNode.connect(node, connection);
            }
        });
        callSite.connect(calleeRelatedModelGraph[0], FlowNode.CALL_CONNECTION_TYPE);
        connectedNodes = connectedNodes.concat(nodesBeforeCall);
        calleeRelatedModelGraph[1].connect(callReturnNode, FlowNode.RETURN_CONNECTION_TYPE);
        calleeRelatedModelGraph[2].forEach(function (node) {
            if (connectedNodes.indexOf(node) === -1) {
                connectedNodes.push(node);
            }
        });
        connectedNodes.push(callReturnNode);
        connectedNodes = connectedNodes.concat(nodesAfterCall);
        connectedGraph.push(connectedNodes);

		/// create the connected model
		connectedModel = factoryModel.create();
		connectedModel.addRelatedScope(callerModel.mainlyRelatedScope);
		callerModel.relatedScopes.forEach(function (scope) {
			connectedModel.addRelatedScope(scope);
		});
		calleeModel.relatedScopes.forEach(function (scope) {
			connectedModel.addRelatedScope(scope);
		});
		connectedModel.graph = connectedGraph;
    }
	return connectedModel;
}

/**
 * Get inter-procedural model start from the scope related to the input model
 * @param {Scope} scope
 * @param {ScopeTree} scopeTree
 * @returns {Model}
 * @memberof ModelBuilder.prototype
 * @private
 */
function getInterProceduralModelStartFromTheScope(scope, scopeTree) {
    "use strict";
	var scopeModel = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
	var resultModel = null;
	var callSiteMapCalleeScope = new Map();
	scopeModel.graph[2].forEach(function (node) {
		if (node.astNode.type === 'CallExpression') {
			var reachIns = node.reachIns,
				calleeScope = null;
			reachIns.forEach(function (vardef) {
				if (vardef.variable === node.scope.getVariable(node.callee.name) && vardef.definition.type === Def.FUNCTION_TYPE) {
					calleeScope = scopeTree.getScopeByRange(vardef.definition.range);
				}
				if (!!calleeScope) {
					callSiteMapCalleeScope.set(node, calleeScope);
				}
			}); /// end for each reached in VarDef
		} /// end if the node is a call-site
	}); /// end for each node in the graph of scopeModel
	if (callSiteMapCalleeScope.size > 0) {
		callSiteMapCalleeScope.forEach(function (callee, callSite) {
			var connectedModel =
				modelCtrl.getInterProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, callee) ||
				getInterProceduralModelStartFromTheScope(callee, scopeTree);
			resultModel = connectCallerCalleeScopeRelatedModelsAtCallSite(resultModel || scopeModel, connectedModel, callSite);
		});
	} else {
		resultModel = scopeModel;
	}
	if (!!resultModel && resultModel.relatedScopes.length > 1) {
		modelCtrl.addInterProceduralModelToAPage(scopeTree, resultModel);
	}
	return resultModel;
}

/**
 * Remove related scopes from queueOfScopes, won't change queueOfScopes but return a new array of scopes after being removed
 * @param queueOfScopes
 * @param removedScopes
 * @returns {Array} scopes after removed
 * @memberof ModelBuilder.prototype
 * @private
 */
function removeScopesFromQueuedSearchingScopes(queueOfScopes, removedScopes) {
    "use strict";
    var excludedScopes = [],
        queue = [].concat(queueOfScopes);
    queue.forEach(function (item) {
        if (removedScopes.indexOf(item) !== -1) {
            excludedScopes.push(item);
        }
    });
    excludedScopes.forEach(function (item) {
        var index = queue.indexOf(item);
        if (index !== -1) {
            queue.splice(index, 1);
        }
    });
    return queue;
}

/**
 * Build inter-procedural models
 */
ModelBuilder.prototype.buildInterProceduralModels = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		var scopesToSearch = scopeTree.scopes;
		while (scopesToSearch.length > 0) {
			var currentScope = scopesToSearch[0];
			var interProceduralModel = getInterProceduralModelStartFromTheScope(currentScope, scopeTree);
			if (interProceduralModel.relatedScopes.length > 1) {
				removeScopesFromQueuedSearchingScopes(scopesToSearch, interProceduralModel.relatedScopes);
			}
		}
	});
};

/**
 * Connect the LOOP NODE and the related model graph of a page
 * @param {Model} modelForPage
 * @returns {Model}
 * @memberof ModelBuilder.prototype
 * @private
 */
function connectLoopNodeToPageGraph(modelForPage) {
	"use strict";
	var loopNode = factoryFlowNode.createLoopNode();
	var exitNode = modelForPage.graph[1];
	var previousNodes = [].concat(exitNode.prev);
	previousNodes.forEach(function (node) {
		if (node.normal === exitNode) {
			node.connect(loopNode);
		} else if (node.exception === exitNode) {
			node.connect(loopNode, FlowNode.EXCEPTION_CONNECTION_TYPE);
		} else if (node.true === exitNode) {
			node.connect(loopNode, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		} else if (node.false === exitNode) {
			node.connect(loopNode, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		}
		node.disconnect(exitNode);
	});
	loopNode.connect(exitNode);
	var nodes = [].concat(modelForPage.graph[2]);
	nodes.splice(nodes.indexOf(exitNode), 0, loopNode);
	return [modelForPage.graph[0], exitNode, nodes];
}

function connectPageAndEventHandlerRelatedModels(modelForPage, modelForEventHandler) {
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

ModelBuilder.prototype.buildIntraPageAnalysisItem = function (analysisItemCtrl, scopeTree) {
    "use strict";
    var validHandlers = [],
        handlerAnalysisItems = [],
        newAnalyzedItem = [];
    if (modelCtrl.isAnalysisItemCtrl(analysisItemCtrl) && ScopeTree.isScopeCtrl(scopeTree)) {
        if (scopeTree.root.scope.type === Scope.PROGRAM_TYPE) {
            var programAnalysisItem = analysisItemCtrl.getModelByMainlyRelatedScope(scopeTree.root);
            if (!!programAnalysisItem) {
                programAnalysisItem.cfg[2].forEach(function (cfgNode) {
                    if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && !!cfgNode.astNode) {
                        walkes(cfgNode.astNode, {
                            CallExpression: function (node) {
                                if (node.callee.type === 'MemberExpression') {
                                    if (node.callee.property.name === 'addEventListener') {
                                        var handler = cfgNode.scope.getVariable(node.arguments[1].name);
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
                    var handlerAnalysisItem = analysisItemCtrl.getModelByMainlyRelatedScope(handlerScope);
                    if (!!handlerAnalysisItem) {
                        handlerAnalysisItems.push(handlerAnalysisItem);
                    }
                });

                var cfg = connectProgramAndEventHandlers(programAnalysisItem, handlerAnalysisItems);
                if (cfg.length > 0) {
                    var intraPageAnalysisItem = factoryModel.create();
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

ModelBuilder.prototype.buildInterPageAnalysisItem = function (globalScopeCtrl, intraPageAnalysisItems) {
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
                                var definedVar = globalScopeCtrl.scope.getVariable(node.left.object.name);
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
                                    var definedVar = globalScopeCtrl.scope.getVariable(node.callee.left.object.name);
                                    if (!!definedVar) {
                                        cfgNode.connect(localStorageNode, FlowNode.SAVE_STORAGE_CONNECTION_TYPE);
                                    }
                                }
                            }
                        },
                        UpdateExpression: function (node) {
                            var definedVar = globalScopeCtrl.scope.getVariable(node.argument.name);
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

        var interPageItem = factoryModel.create();
        interPageItem.scopeWrappers = relatedScopes;
        interPageItem.cfg = [].concat(connectedGraph);
        return interPageItem;
    }
};

var builder = new ModelBuilder();
module.exports = builder;