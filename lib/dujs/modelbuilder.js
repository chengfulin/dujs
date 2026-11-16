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
	expansion = require('./expansion');
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
 * order. A default nested in a pattern that has a default itself is not
 * collected: the initialization of the outer pattern (a destructuring
 * assignment) already evaluates it and defines its name
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
 * Get the statement used as the CFG input of a function: when any parameter
 * has a default value, a block (created once and cached on the function node)
 * of one initialization statement `name = default` per default value, in
 * source order, followed by the original body; otherwise the original body
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
 * (frozen) hierarchy, with the map from originals to the nodes of the graph
 * @param {Model} model
 * @returns {Model}
 * @private
 */
function setFlatGraphFromHierarchy(model) {
    "use strict";
    var expanded = expansion.expand(hierarchy.freeze(model));
    model.graph = expanded.graph;
    model.setFlatNodeOf(expanded.flatNodeOf);
    return model;
}

/**
 * Find the definition of a named function from a ReachIn set in a scope
 * @param {Set} reachIns
 * @param {Scope} scope
 * @param {string}calleeName
 * @returns {Set}
 */
function findFunctionDefinitionFromReachInSet(reachIns, scope, calleeName) {
    "use strict";
    var functionDef = new Set();
    reachIns.values().forEach(function (vardef) {
        if (vardef.variable === scope.getVariable(calleeName) && vardef.definition.type === Def.FUNCTION_TYPE) {
            functionDef = vardef.definition;
        }
    });
    return functionDef;
}

/**
 * Expressions evaluated before the condition of a node split from a statement
 * (split.preEvaluated), or none for a node not split
 * @param {FlowNode} node
 * @returns {Array} AST nodes
 * @private
 */
function preEvaluatedAt(node) {
    "use strict";
    return !!node.split ? node.split.preEvaluated : [];
}

/**
 * The expressions evaluated by a node itself, without the statements nested
 * in its AST: an entry or exit node evaluates nothing (its AST is the whole
 * body), a case node its test (not its consequent), a for-in/for-of loop node
 * its left side and its right side unless split before it (not its body), a
 * catch node its parameter (not its body); other nodes their analyzed expressions
 * @param {FlowNode} node
 * @returns {Array} AST nodes
 * @private
 */
function expressionsEvaluatedAtNode(node) {
    "use strict";
    var ast = node.astNode,
        preEvaluated = preEvaluatedAt(node);
    if (!ast || node.type === FlowNode.ENTRY_NODE_TYPE || node.type === FlowNode.EXIT_NODE_TYPE) {
        return [];
    }
    switch (ast.type) {
        case 'SwitchCase':
            return preEvaluated.concat([ast.test]);
        case 'ForInStatement':
        case 'ForOfStatement':
            return preEvaluated.concat(node.loopRightSplit ? [ast.left] : [ast.left, ast.right]);
        case 'CatchClause':
            return preEvaluated.concat([ast.param]);
        default:
            return node.analyzedExpressions;
    }
}

/**
 * Find the scopes of static field initializers and static blocks of the
 * classes defined at a node (not inside functions, class members or the
 * statements nested in the AST of the node), in the order they run: the
 * superclass and computed keys of a class are evaluated before its static
 * members (FR-006)
 * @param {FlowNode} node
 * @param {ScopeTree} scopeTree
 * @returns {Array} Scopes
 * @private
 */
function findStaticMemberScopesOfClassesAtNode(node, scopeTree) {
    "use strict";
    var scopes = [];
    function classHandler(classNode, recurse) {
        recurse(classNode.superClass);
        classNode.body.body.forEach(function (member) {
            if (member.computed) {
                recurse(member.key);
            }
        });
        classNode.body.body.forEach(function (member) {
            var memberScope = null;
            if (member.static || member.type === 'StaticBlock') {
                memberScope = !!member.dujsScopeFunction ?
                    scopeTree.getScopeByRange(member.dujsScopeFunction.range) : null;
            }
            if (!!memberScope) {
                scopes.push(memberScope);
            }
        });
    }
    expressionsEvaluatedAtNode(node).filter(Boolean).forEach(function (expression) {
        walkes(expression, {
            Program: function () {},
            FunctionDeclaration: function () {},
            FunctionExpression: function () {},
            ArrowFunctionExpression: function () {},
            ClassDeclaration: classHandler,
            ClassExpression: classHandler
        });
    });
    return scopes;
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
	/// [call-site, callee scopes in the order they are called]
	var callSitesAndCallees = [];
	if (!!scopeModel) {
        scopeModel.graph[2].forEach(function (node) {
            /// static members of classes defined at the node run first (FR-006)
            var calleeScopes = findStaticMemberScopesOfClassesAtNode(node, scopeTree);
            if (!!node.astNode && node.astNode.type === 'CallExpression') {
                var reachIns = node.reachIns || new Set(),
                    calleeScope = null;
                var calleeDefinition = findFunctionDefinitionFromReachInSet(reachIns, node.scope, node.astNode.callee.name);
                if (!!calleeDefinition) {
                    calleeScope = scopeTree.getScopeByRange(calleeDefinition.range);
                }
                if (!!calleeScope) {
                    calleeScopes.push(calleeScope);
                }
            } /// end if the node is a call-site
            if (calleeScopes.length > 0) {
                callSitesAndCallees.push([node, calleeScopes]);
            }
        });
    } /// end for each node in the graph of scopeModel
	if (callSitesAndCallees.length > 0) {
		callSitesAndCallees.forEach(function (callSiteAndCallees) {
			/// callees of the same node are chained: the CALL RETURN NODE of a
			/// callee is the call-site of the next one
			var callSite = callSiteAndCallees[0];
			callSiteAndCallees[1].forEach(function (callee) {
				var calleeModel =
					modelCtrl.getInterProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, callee) ||
					getInterProceduralModelStartFromTheScope(callee, scopeTree);
				var model = resultModel || hierarchy.createCallHierarchyModel(scopeModel);
				var edge = hierarchy.addCallEdge(model, {callSite: callSite, calleeModel: calleeModel});
				if (!!edge) {
					resultModel = model;
					callSite = edge.callReturn;
				}
			});
		});
		if (!!resultModel) {
			setFlatGraphFromHierarchy(resultModel);
		}
	} else {
		resultModel = scopeModel;
	}
	if (!!resultModel && resultModel.relatedScopes.length > 1) {
		modelCtrl.addInterProceduralModelToAPage(scopeTree, resultModel);
	}
	return resultModel;
}

/**
 * Build inter-procedural models
 */
ModelBuilder.prototype.buildInterProceduralModels = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		var scopesToSearch = scopeTree.scopes, searchedScopes = new Set();
		for (var searchIndex = 0; searchIndex < scopesToSearch.length; ++searchIndex) {
            if (searchedScopes.has(scopesToSearch[searchIndex])) {
                continue;
            }
			var currentScope = scopesToSearch[searchIndex];
			var interProceduralModel = getInterProceduralModelStartFromTheScope(currentScope, scopeTree);
			if (interProceduralModel.relatedScopes.length > 1) {
                var relatedScopes = [].concat(interProceduralModel.relatedScopes);
                while (relatedScopes.length > 0) {
                    searchedScopes.add(relatedScopes.pop());
                }
			}
		}
	});
};

/**
 * Definitions reaching a node used to find the event handlers registered at
 * it (research R8): the ReachIn set of its original in the inter-procedural
 * model analyzed last among the ones having an analysis result of it, or the
 * ReachIn set of the original (the intra-procedural result) when none has
 * @param {FlowNode} graphNode An original or a node of the graph of an upper model
 * @returns {Set}
 * @private
 */
function reachInsForHandlerLookup(graphNode) {
	"use strict";
	var original = graphNode.original || graphNode,
		found = null;
	modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
		pageModels.interProceduralModels.forEach(function (model) {
			var result = model.analysisResultOf(original);
			if (result !== null && result.reachIns !== null) {
				found = result.reachIns;
			}
		});
	});
	return found || original.reachIns;
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
				var handler = graphNode.scope.getVariable(node.name);
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
			/// the handler list keeps the order and the duplicates of the search
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