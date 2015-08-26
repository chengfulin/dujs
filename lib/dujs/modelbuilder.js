/*
 * ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-21
 */
var FlowNode = require('../esgraph/flownode'),
	Def = require('./def'),
	modelCtrl = require('./modelctrl'),
	cfgBuilder = require('./cfgbuilder'),
	scopeCtrl = require('./scopectrl'),
    factoryFlowNode = require('../esgraph/flownodefactory'),
	factoryModel = require('./modelfactory');
var	Map = require('core-js/es6/map'),
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
		_connectLoopNodeToPageGraph: connectLoopNodeToPageGraph,
		_connectPageAndEventHandlers: connectPageAndEventHandlers,
		_getRegisteredEventHandlerCallback: getRegisteredEventHandlerCallback,
		_getNodesWhereDefiningLocalStorageObject: getNodesWhereDefiningLocalStorageObject,
		_connectDomainScopeGraphToModelOfPages: connectDomainScopeGraphToModelOfPages,
        _setScopeOfGraphNodes: setScopeOfGraphNodes
    };
    /* end-test-block */
}

/**
 * Set the scope of graph nodes
 * @param {Array} graph
 * @param {Scope} scope
 */
function setScopeOfGraphNodes(graph, scope) {
    "use strict";
    graph[2].forEach(function (node) {
        node.scope = scope;
    });
}

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
                setScopeOfGraphNodes(model.graph, scope);
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
		callReturnNode.scope = callerModel.mainlyRelatedScope;

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
        callReturnNode.scope = callSite.scope;

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
			reachIns.values().some(function (vardef) {
				if (vardef.variable === node.scope.getVariable(node.callee.name) && vardef.definition.type === Def.FUNCTION_TYPE) {
					calleeScope = scopeTree.getScopeByRange(vardef.definition.range);
				}
				if (!!calleeScope) {
					callSiteMapCalleeScope.set(node, calleeScope);
					return true;
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
	loopNode.scope = modelForPage.mainlyRelatedScope;
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

/**
 * Connect pageModel to each model in the eventHandlerModels array with LOOP NODE and LOOP RETURN NODE
 * @param {Model} pageModel
 * @param {Array} eventHandlerModels
 * @returns {Model}
 */
function connectPageAndEventHandlers(pageModel, eventHandlerModels) {
    "use strict";
	var pageModelGraph = connectLoopNodeToPageGraph(pageModel);
	var pageLoopNode = pageModelGraph[1].prev[0];
	var loopReturnNode = factoryFlowNode.createLoopReturnNode();
	loopReturnNode.scope = pageModel.mainlyRelatedScope;
	var resultGraphNodes = [].concat(pageModelGraph[2]);
	eventHandlerModels.forEach(function (model, index) {
		pageLoopNode.connect(model.graph[0], FlowNode.ON_EVENT_CONNECTION_TYPE);
		model.graph[1].connect(loopReturnNode);
		resultGraphNodes = resultGraphNodes.concat(model.graph[2]);
		if (index === 0) {
			loopReturnNode.connect(pageLoopNode, FlowNode.RETURN_CONNECTION_TYPE);
			resultGraphNodes.push(loopReturnNode);
		}
	});
	var resultModel = factoryModel.create();
	resultModel.graph = [pageModelGraph[0], pageModelGraph[1], resultGraphNodes];
	resultModel.addRelatedScope(pageModel.mainlyRelatedScope);
	pageModel.relatedScopes.forEach(function (scope) {
		resultModel.addRelatedScope(scope);
	});
    return resultModel;
}

/**
 * Find scope of an event handler at the node
 * @param {FlowNode} graphNode
 * @param {ScopeTree} scopeTree
 * @returns {null|Scope}
 */
function getRegisteredEventHandlerCallback(graphNode, scopeTree) {
	"use strict";
	var foundHandlerScope = null;
	if (graphNode.astNode.callee.type === 'MemberExpression' && graphNode.astNode.callee.name === 'addEventListener') {
		walkes(graphNode.astNode["arguments"][1], {
			FunctionDeclaration: function () {},
			Identifier: function (node) {
				var handler = graphNode.scope.getVariable(node.name);
				graphNode.reachIns.some(function (vardef) {
					if (vardef.variable === handler && vardef.definition.type === Def.FUNCTION_TYPE) {
						foundHandlerScope = scopeTree.getScopeByRange(vardef.definition.range) || null;
					}
					if (!!foundHandlerScope) {
						return true;
					}
				});
			},
			FunctionExpression: function (node) {
				foundHandlerScope = scopeTree.getScopeByRange(node.range) || null;
			}
		});
	}
	return foundHandlerScope;
}

/**
 * Find models mainly related to event handlers from a model
 * @param {Model} model
 * @param {ScopeTree} scopeTree
 * @returns {Array} Models of event handlers
 */
function findEventHandlerModelsFromAModel(model, scopeTree) {
	"use strict";
	var modelGraph = model.graph;
	var eventHandlers = [];
	modelGraph[2].forEach(function (graphNode) {
		if (graphNode.type !== FlowNode.ENTRY_NODE_TYPE && !!graphNode.astNode) {
			walkes(graphNode.astNode, {
				FunctionExpression: function () {},
				FunctionDeclaration: function () {},
				CallExpression: function () {
					var handlerScope = getRegisteredEventHandlerCallback(graphNode, scopeTree);
					var handlerModel = null;
					if (!!handlerScope) {
						handlerModel = modelCtrl.getModelByMainlyRelatedScopeFromAPageModels(scopeTree, handlerScope);
					}
					if (!!handlerModel) {
						eventHandlers.push(handlerModel);
					}
				}
			});
		}
	});
	return eventHandlers;
}

/**
 * Build intra-page model
 */
ModelBuilder.prototype.buildIntraPageModel = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		var modelForPage = modelCtrl.getModelByMainlyRelatedScopeFromAPageModels(scopeTree, scopeTree.root);
		var searchingEventHandlerModels = [];
		var eventHandlerModels = [];
		var intraPageModel = null;
		if (!!modelForPage) {
			searchingEventHandlerModels.push(modelForPage);
			for (var index = 0; index < searchingEventHandlerModels.length; ++index) {
				var searchingModel = searchingEventHandlerModels[index];
				var foundEventHandlerModels = findEventHandlerModelsFromAModel(searchingModel, scopeTree);
				eventHandlerModels = eventHandlerModels.concat(foundEventHandlerModels);
				searchingEventHandlerModels = searchingEventHandlerModels.concat(foundEventHandlerModels);
			}
			intraPageModel = connectPageAndEventHandlers(modelForPage, eventHandlerModels);
		}
		if (!!intraPageModel) {
			modelCtrl.addIntraPageModelToAPage(scopeTree, intraPageModel);
		} else {
			modelCtrl.addIntraPageModelToAPage(scopeTree, modelForPage);
		}
	});
};

/**
 * Get graph nodes from a model where defining the local storage object
 * @param {Model} model
 * @returns {Array}
 */
function getNodesWhereDefiningLocalStorageObject(model) {
	"use strict";
	var foundNodes = [];
	var modelGraph = model.graph;
	modelGraph[2].forEach(function (graphNode) {
		walkes(graphNode.astNode, {
			FunctionExpression: function () {},
			FunctionDeclaration: function () {},
			AssignmentExpression: function (node) {
				if (node.left.type === 'MemberExpression' &&
					graphNode.scope.getScopeWhereTheVariableDeclared(node.object.name) === scopeCtrl.domainScope) {
					foundNodes.push(graphNode);
				}
			}
		});
	});
	return foundNodes;
}

/**
 * Connect the graph of domain scope to graphs of each page
 * @param {Array} modelOfPages
 * @returns {Array} Node of connected graph
 */
function connectDomainScopeGraphToModelOfPages(modelOfPages) {
	"use strict";
	var domainScope = scopeCtrl.domainScope;
	var domainScopeGraph = cfgBuilder.getDomainScopeGraph();
	domainScopeGraph[0].scope = domainScope;
	var nodes = [].concat(domainScopeGraph[2]);
	modelOfPages.forEach(function (model) {
		var modelGraph = model.graph;
		domainScopeGraph[0].connect(modelGraph[0], FlowNode.LOAD_STROAGE_CONNECTION_TYPE);
		var definingNode = getNodesWhereDefiningLocalStorageObject(model);
		definingNode.forEach(function (defineNode) {
			defineNode.connect(domainScopeGraph[0], FlowNode.SAVE_STORAGE_CONNECTION_TYPE);
		});
	});
	return [domainScopeGraph[0], domainScopeGraph[1], nodes];
}

/**
 * Build the inter-page model
 */
ModelBuilder.prototype.buildInterPageModel = function () {
    "use strict";
	var modelOfPages = [];
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		var intraPageModel = modelCtrl.getIntraPageModelByMainlyRelatedScopeFromAPageModels(scopeTree, scopeTree.root);
		if (!!intraPageModel) {
			modelOfPages.push(intraPageModel);
		}
	});
	var connectedGraph = connectDomainScopeGraphToModelOfPages(modelOfPages);
	var interPageModel = factoryModel.create();
	interPageModel.graph = connectedGraph;
	interPageModel.addRelatedScope(scopeCtrl.domainScope);
	modelOfPages.forEach(function (model) {
		model.relatedScopes.forEach(function (scope) {
			interPageModel.addRelatedScope(scope);
		});
	});
	modelCtrl.interPageModel = interPageModel;
};

var builder = new ModelBuilder();
module.exports = builder;