/*
 * ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var FlowNode = require('../esgraph/flownode'),
	Def = require('./def'),
	modelCtrl = require('./modelctrl'),
	cfgBuilder = require('./cfgbuilder'),
	scopeCtrl = require('./scopectrl'),
	factoryModel = require('./modelfactory'),
	Model = require('./model'),
	hierarchy = require('./hierarchy'),
	expansion = require('./expansion'),
	callResolver = require('./callresolver'),
	callsplit = require('./callsplit');
var Set = require('../analyses/set'),
    walkes = require('walkes');

/**
 * ModelBuilder
 * @constructor
 */
function ModelBuilder() {
    "use strict";

    /* start-test-block */
    this._testonly_ = {
		_getInterProceduralModelStartFromTheScope: getInterProceduralModelStartFromTheScope,
		_getRegisteredEventHandlerCallback: getRegisteredEventHandlerCallback,
        _findEventHandlerModelsFromAModel: findEventHandlerModelsFromAModel,
        _reachInsForHandlerLookup: reachInsForHandlerLookup,
		_getNodesWhereDefiningLocalStorageObject: getNodesWhereDefiningLocalStorageObject,
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
        /// nodes inside a block scope (ES2015) resolve variables through it;
        /// entry and exit nodes belong to the scope of the model
        var isBoundary = (node.type === FlowNode.ENTRY_NODE_TYPE || node.type === FlowNode.EXIT_NODE_TYPE);
        if (!isBoundary && !!node.astNode && !!node.astNode.range) {
            node.scope = scope.getInnermostBlockScopeContaining(node.astNode.range);
        } else {
            node.scope = scope;
        }
    });
}

/**
 * Produce collection of Model for intra-procedural dataflow
 */
/**
 * Get the body of an arrow function as a statement: a block body is used as is,
 * while an expression body is wrapped in a return statement (created once and
 * cached on the arrow node) so that its CFG flows from entry to exit
 * @param {Object} arrowAST
 * @returns {Object} BlockStatement or ReturnStatement
 * @private
 */
function getArrowFunctionBodyStatement(arrowAST) {
    "use strict";
    if (arrowAST.body.type === 'BlockStatement') {
        return arrowAST.body;
    }
    if (!arrowAST.dujsBodyStatement) {
        Object.defineProperty(arrowAST, 'dujsBodyStatement', {
            value: {
                type: 'ReturnStatement',
                argument: arrowAST.body,
                range: arrowAST.body.range,
                loc: arrowAST.body.loc
            }
        });
    }
    return arrowAST.dujsBodyStatement;
}

/**
 * Collect the AssignmentPattern nodes (parameters with default values,
 * including the ones nested in parameter patterns) of a function, in source
 * pre-order (research R8): a pattern with a default value comes before the
 * defaults nested in it, e.g. `{a: {b = 1} = E} = D` gives D, E, `b = 1`
 * @param {Array} params
 * @returns {Array} AssignmentPattern nodes
 * @private
 */
function collectParameterDefaults(params) {
    "use strict";
    var defaults = [];
    (function collect(node) {
        if (!node) {
            return;
        }
        switch (node.type) {
            case 'AssignmentPattern':
                defaults.push(node);
                collect(node.left);
                break;
            case 'ObjectPattern':
                node.properties.forEach(function (property) {
                    collect(property.type === 'RestElement' ? property.argument : property.value);
                });
                break;
            case 'ArrayPattern':
                node.elements.forEach(collect);
                break;
            case 'RestElement':
                collect(node.argument);
                break;
        }
    }({type: 'ArrayPattern', elements: params}));
    return defaults;
}

/**
 * Statement only evaluating the default value of a parameter pattern (research
 * R8): its names are defined by the parameters at entry and by the defaults
 * nested in it, so nothing is defined here. A lone identifier is wrapped in a
 * sequence expression, as an expression statement of a lone identifier does
 * not count as a use of it
 * @param {Object} defaultValue
 * @returns {Object} ExpressionStatement with the range and loc of the default value
 * @private
 */
function getDefaultEvaluationStatement(defaultValue) {
    "use strict";
    var expression = defaultValue;
    if (defaultValue.type === 'Identifier') {
        expression = {
            type: 'SequenceExpression',
            expressions: [defaultValue],
            range: defaultValue.range,
            loc: defaultValue.loc
        };
    }
    return {
        type: 'ExpressionStatement',
        expression: expression,
        range: defaultValue.range,
        loc: defaultValue.loc
    };
}

/**
 * Get the statement used as the CFG input of a function: when any parameter
 * has a default value, a block (created once and cached on the function node)
 * of one initialization statement per default value, in source pre-order
 * (`name = default`, or only evaluating the default of a pattern), followed by
 * the original body; otherwise the original body
 * (an expression body of an arrow function is wrapped in a return statement)
 * @param {Object} functionAST
 * @returns {Object} BlockStatement or ReturnStatement
 * @private
 */
function getFunctionBodyStatement(functionAST) {
    "use strict";
    var body = (functionAST.type === 'ArrowFunctionExpression') ?
        getArrowFunctionBodyStatement(functionAST) : functionAST.body;
    if (!functionAST.dujsBodyWithParamInits) {
        var defaults = collectParameterDefaults(functionAST.params);
        if (defaults.length === 0) {
            return body;
        }
        var initializations = defaults.map(function (pattern) {
            if (pattern.left.type !== 'Identifier') {
                return getDefaultEvaluationStatement(pattern.right);
            }
            return {
                type: 'ExpressionStatement',
                expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: pattern.left,
                    right: pattern.right,
                    range: pattern.range,
                    loc: pattern.loc
                },
                range: pattern.range,
                loc: pattern.loc
            };
        });
        Object.defineProperty(functionAST, 'dujsBodyWithParamInits', {
            value: {
                type: 'BlockStatement',
                body: initializations.concat((body.type === 'BlockStatement') ? body.body : [body]),
                range: body.range,
                loc: body.loc
            }
        });
    }
    return functionAST.dujsBodyWithParamInits;
}

ModelBuilder.prototype.buildIntraProceduralModels = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		scopeTree.scopes.forEach(function (scope) {
			var model = factoryModel.create();
			model.level = Model.INTRA_PROCEDURAL;
            if (scope.ast.type === 'FunctionDeclaration' || scope.ast.type === 'FunctionExpression' ||
                scope.ast.type === 'ArrowFunctionExpression') {
                model.graph = cfgBuilder.getCFG(getFunctionBodyStatement(scope.ast));
            } else {
                model.graph = cfgBuilder.getCFG(scope.ast);
            }
            setScopeOfGraphNodes(model.graph, scope);
            model.addRelatedScope(scope);
            modelCtrl.addIntraProceduralModelToAPage(scopeTree, model);
		});
	});
};

/**
 * Set the graph of an upper model to the flat graph expanded from its
 * (frozen) hierarchy, with the map from originals to the nodes of the graph,
 * the CallSiteRecords of its calls (FR-016, feature 005 data-model §4), the
 * LoopRecords of its LOOP NODEs (data-model §5, User Story 4) and the map
 * from the original VarDefs to the VarDefs of the graph (research R1)
 * @param {Model} model
 * @returns {Model}
 * @private
 */
function setFlatGraphFromHierarchy(model) {
    "use strict";
    var expanded = expansion.expand(hierarchy.freeze(model));
    model.graph = expanded.graph;
    model.setFlatNodeOf(expanded.flatNodeOf);
    model.setCallBypasses(expanded.bypasses);
    model.setLoopRecords(expanded.loops);
    model.setFlatVarDefOf(expanded.flatVarDefOf);
    return model;
}

/**
 * The first model built for each scope by getInterProceduralModelStartFromTheScope
 * (feature 005, research R1): an inter-procedural model whose hierarchy holds
 * the own calls of the scope (registered or not), or the intra-procedural model
 * of a scope without a call. The scopes are the keys, so a page analyzed again
 * (new scopes) does not see the models of another analysis.
 * @type {WeakMap}
 * @private
 */
var callModels = new WeakMap();

/**
 * Model of the own calls of a scope (feature 005, research R1): the first model
 * built for the scope when building the inter-procedural models
 * @param {Scope} scope
 * @returns {Model|null} null when no model is built for the scope
 */
ModelBuilder.prototype.callModelOf = function (scope) {
    "use strict";
    return callModels.has(scope) ? callModels.get(scope) : null;
};

/**
 * The model of a callee scope in the hierarchy being built (research R5.2):
 * a back call edge to the intra-procedural model of a scope being called
 * already (in the stack, the caller included); the model built for it in this
 * search; its registered inter-procedural model without a back call edge; or
 * a model built for it now
 * @param {Scope} callee
 * @param {ScopeTree} scopeTree
 * @param {Array} stack scopes being called, the caller last
 * @param {Map} built (Scope, Model) models built in this search
 * @returns {Object} {model: Model, back: boolean}
 * @private
 */
function calleeModelOf(callee, scopeTree, stack, built) {
    "use strict";
    if (stack.indexOf(callee) !== -1) {
        return {
            model: modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, callee),
            back: true
        };
    }
    if (built.has(callee)) {
        return {model: built.get(callee), back: false};
    }
    var registered = modelCtrl.getInterProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, callee);
    if (!!registered && !hierarchy.hasBackEdge(registered)) {
        return {model: registered, back: false};
    }
    return {model: getInterProceduralModelStartFromTheScope(callee, scopeTree, stack, built), back: false};
}

/**
 * Get inter-procedural model start from the scope related to the input model
 * (research R5.2): a call to a scope being called already is a back call edge
 * (FR-015). The model is put in built; a closed model with a hierarchy is
 * expanded, and registered when no model of the scope is registered yet; an
 * open model (with a back call edge to a scope out of it) is neither
 * registered nor expanded, only used as a unit of the model of its caller
 * @param {Scope} scope
 * @param {ScopeTree} scopeTree
 * @param {Array} [stack] scopes being called (the callers of the scope), default is []
 * @param {Map} [built] (Scope, Model) models built in this search, default is a new Map
 * @returns {Model}
 * @memberof ModelBuilder.prototype
 * @private
 */
function getInterProceduralModelStartFromTheScope(scope, scopeTree, stack, built) {
    "use strict";
	var scopeModel = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
	var resultModel = null;
	/// the SegmentPlans of the nodes with call sites (feature 007, research R2)
	var plans = [];
	var callerStack = (stack || []).concat([scope]);
	built = built || new Map();
	if (!!scopeModel) {
        scopeModel.graph[2].forEach(function (node) {
            /// the call sites of the node in evaluation order (class static members included), kept by
            /// the phase predicate (DECISION 006 Q2; callsplit drops the others and computes the segments)
            var plan = callsplit.planOf(node, scopeTree, callResolver.stagedCallSite);
            if (plan.callSites.length > 0) {
                plans.push(plan);
            }
        });
    } /// end for each node in the graph of scopeModel
	plans.forEach(function (plan) {
		/// the callees of a node are chained across its call sites: the CALL RETURN NODE of a callee is
		/// the call-site of the next one (the order of the edges goes on across the call sites)
		var callSite = plan.node;
		plan.callSites.forEach(function (entry, callIndex) {
			entry.callees.forEach(function (callee, index) {
				var calleeModel = calleeModelOf(callee, scopeTree, callerStack, built);
				var model = resultModel || hierarchy.createCallHierarchyModel(scopeModel);
				var edge = hierarchy.addCallEdge(model, {
					callSite: callSite,
					calleeModel: calleeModel.model,
					back: calleeModel.back,
					plan: plan,
					callIndex: callIndex,
					lastOfCallSite: index === entry.callees.length - 1
				});
				if (!!edge) {
					resultModel = model;
					callSite = edge.callReturn;
				}
			});
		});
	});
	if (!resultModel) {
		resultModel = scopeModel;
	}
	if (!!resultModel && !!resultModel.hierarchy) {
		/// only a closed model of a scope not registered yet is expanded and
		/// registered; the other ones are used only through their hierarchy
		/// (research R5.2)
		if (hierarchy.openTargetsOf(resultModel).length === 0 &&
				!modelCtrl.getInterProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope)) {
			setFlatGraphFromHierarchy(resultModel);
			modelCtrl.addInterProceduralModelToAPage(scopeTree, resultModel);
		} else {
			hierarchy.freeze(resultModel);
		}
	}
	if (!!resultModel) {
		built.set(scope, resultModel);
		if (!callModels.has(scope)) {
			callModels.set(scope, resultModel);
		}
	}
	return resultModel;
}

/**
 * Build inter-procedural models: a search starts from each scope of a page,
 * skipping the scopes having a registered model and the ones built without a
 * call edge (a scope built only as an open model is searched again)
 */
ModelBuilder.prototype.buildInterProceduralModels = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		var builtWithoutCalls = new Set();
		scopeTree.scopes.forEach(function (currentScope) {
            if (builtWithoutCalls.has(currentScope) ||
                !!modelCtrl.getInterProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, currentScope)) {
                return;
            }
			var built = new Map();
			getInterProceduralModelStartFromTheScope(currentScope, scopeTree, [], built);
			built.forEach(function (model, builtScope) {
				if (!model.hierarchy) {
					builtWithoutCalls.add(builtScope);
				}
			});
		});
	});
};

/**
 * Definitions reaching a node used to find the event handlers registered at
 * it (research R8, plan U3 (a)): the ReachIn set of its original in an
 * inter-procedural model mainly related to the page scope having an analysis
 * result of it; otherwise in the inter-procedural model analyzed last among
 * the ones having an analysis result of it; otherwise the ReachIn set of the
 * original (the intra-procedural result). The order of the registered models
 * is not changed.
 * @param {FlowNode} graphNode An original or a node of the graph of an upper model
 * @returns {Set}
 * @private
 */
function reachInsForHandlerLookup(graphNode) {
	"use strict";
	var original = graphNode.original || graphNode,
		fromPage = null,
		found = null;
	modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
		var pageScope = pageModels.pageScopeTree.root;
		pageModels.interProceduralModels.forEach(function (model) {
			var result = model.analysisResultOf(original);
			if (result !== null && result.reachIns !== null) {
				found = result.reachIns;
				if (model.mainlyRelatedScope === pageScope && fromPage === null) {
					fromPage = result.reachIns;
				}
			}
		});
	});
	return fromPage || found || original.reachIns;
}

/**
 * Find scope of an event handler registered by a call expression at the node
 * @param {FlowNode} graphNode
 * @param {ScopeTree} scopeTree
 * @param {Object} [callExpression] CallExpression analyzed at the node, default is the astNode
 * @param {Set} [reachIns] Definitions reaching the node, default is the ReachIn set of the node
 * @returns {null|Scope}
 */
function getRegisteredEventHandlerCallback(graphNode, scopeTree, callExpression, reachIns) {
	"use strict";
	var foundHandlerScope = null;
	callExpression = callExpression || graphNode.astNode;
	reachIns = reachIns || graphNode.reachIns;
	if (callExpression.callee.type === 'MemberExpression' && callExpression.callee.property.name === 'addEventListener') {
		walkes(callExpression["arguments"][1], {
			FunctionDeclaration: function () {},
			Identifier: function (node) {
				var handler = !!scopeTree.binding ? scopeTree.binding.useVarOf(node) : null;
				reachIns.some(function (vardef) {
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
			},
			ArrowFunctionExpression: function (node) {
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
		var reachIns = null;
		/// a registering call may be the astNode or one of the expressions of split.preEvaluated
		graphNode.analyzedExpressions.forEach(function (expression) {
			if (!!expression && expression.type === 'CallExpression') {
				reachIns = reachIns || reachInsForHandlerLookup(graphNode);
				var handlerScope = getRegisteredEventHandlerCallback(graphNode, scopeTree, expression, reachIns);
				var handlerModel = null;
				if (!!handlerScope) {
					handlerModel = modelCtrl.getModelByMainlyRelatedScopeFromAPageModels(scopeTree, handlerScope);
				}
				if (!!handlerModel && eventHandlers.indexOf(handlerModel) === -1) {
					eventHandlers.push(handlerModel);
				}
			}
		});
	});
	return eventHandlers;
}

/**
 * Whether a model registers, directly or through the handlers it registers,
 * a handler already in the chain of registrations being followed (a cycle
 * of the registration graph reachable from the model)
 * @param {Model} model
 * @param {Function} handlersOf handler models registered by a model (memoized)
 * @returns {boolean}
 */
function hasCyclicRegistration(model, handlersOf) {
	"use strict";
	/// depth-first search with the colors of the models: on the current chain
	/// (gray) or fully searched without a cycle (black)
	var onChain = [], done = [];
	function visit(current) {
		if (onChain.indexOf(current) !== -1) {
			return true;
		}
		if (done.indexOf(current) !== -1) {
			return false;
		}
		onChain.push(current);
		var cyclic = handlersOf(current).some(visit);
		onChain.pop();
		done.push(current);
		return cyclic;
	}
	return visit(model);
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
		/// handler models registered by each model of the page, searched once
		var searchedModels = [], handlersOfSearchedModels = [];
		var handlersOf = function (model) {
			var index = searchedModels.indexOf(model);
			if (index === -1) {
				searchedModels.push(model);
				handlersOfSearchedModels.push(findEventHandlerModelsFromAModel(model, scopeTree));
				index = searchedModels.length - 1;
			}
			return handlersOfSearchedModels[index];
		};
		if (!!modelForPage) {
			if (!hasCyclicRegistration(modelForPage, handlersOf)) {
				/// no handler is registered again by itself or by a handler it
				/// registers: the handler list keeps the order and the
				/// duplicates of the search (the same handlers as before
				/// feature 005)
				searchingEventHandlerModels.push(modelForPage);
				for (var index = 0; index < searchingEventHandlerModels.length; ++index) {
					var foundEventHandlerModels = handlersOf(searchingEventHandlerModels[index]);
					eventHandlerModels = eventHandlerModels.concat(foundEventHandlerModels);
					searchingEventHandlerModels = searchingEventHandlerModels.concat(foundEventHandlerModels);
				}
			} else {
				/// a handler registered again in a chain of registrations (made
				/// by the relaxed callees of D2, e.g. handler -> linked recursion
				/// -> registration of the handler): each handler is searched and
				/// listed once, in the order first found. The event loop already
				/// runs a registered handler any number of times, so the pairs
				/// are the same; listing a handler once per chain makes the list
				/// grow with the simple paths of the registrations (factorial),
				/// and listing it once per registration never ends
				/// (feature 005 FR-003)
				searchingEventHandlerModels.push(modelForPage);
				for (var searchIndex = 0; searchIndex < searchingEventHandlerModels.length; ++searchIndex) {
					handlersOf(searchingEventHandlerModels[searchIndex]).forEach(function (handlerModel) {
						if (handlerModel !== modelForPage && eventHandlerModels.indexOf(handlerModel) === -1) {
							eventHandlerModels.push(handlerModel);
							searchingEventHandlerModels.push(handlerModel);
						}
					});
				}
			}
			intraPageModel = setFlatGraphFromHierarchy(hierarchy.createIntraPageModel(modelForPage, eventHandlerModels));
		}
        modelCtrl.addIntraPageModelToAPage(scopeTree, intraPageModel);
	});
};

/**
 * Get graph nodes (originals) from a model where defining the local storage
 * object, in order with duplicates. Kept for _testonly_ as listed in
 * specs/003-hierarchical-models/contracts/model-api.md §5
 * @param {Model} model
 * @returns {Array}
 */
function getNodesWhereDefiningLocalStorageObject(model) {
	"use strict";
	return hierarchy.definingLocalStorageNodes(model);
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
	/// the domain node is created by createInterPageModel after the nodes of all
	/// the pages (its cfgId); the defining nodes default to
	/// hierarchy.definingLocalStorageNodes (getNodesWhereDefiningLocalStorageObject)
	modelCtrl.interPageModel = setFlatGraphFromHierarchy(hierarchy.createInterPageModel(modelOfPages));
};

var builder = new ModelBuilder();
module.exports = builder;