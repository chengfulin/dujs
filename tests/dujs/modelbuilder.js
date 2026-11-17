/*
 * Test cases for ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var should = require('should'),
	jsParser = require('../../lib/dujs/jsparser');
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	modelBuilder = require('../../lib/dujs/modelbuilder'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder'),
	factoryModel = require('../../lib/dujs/modelfactory'),
	Model = require('../../lib/dujs/model'),
	factoryScope = require('../../lib/dujs/scopefactory'),
    variableAnalyzer = require('../../lib/dujs/variableanalyzer'),
    defuseAnalyzer = require('../../lib/dujs/defuseanalyzer'),
	hierarchy = require('../../lib/dujs/hierarchy'),
	expansion = require('../../lib/dujs/expansion');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	executor = require('../../lib/dujs/defuseanalysisexecutor'),
	FlowNode = require('../../lib/esgraph/flownode');

var PROBES = path.join(__dirname, 'cases', 'probes');

/**
 * Freeze the hierarchy of a model built by hand and set its graph and
 * flatNodeOf by expand (as lib/dujs/modelbuilder.js does)
 * @param {Model} model
 * @returns {Model}
 */
function expandInto(model) {
	"use strict";
	var expanded = expansion.expand(hierarchy.freeze(model));
	model.graph = expanded.graph;
	model.setFlatNodeOf(expanded.flatNodeOf);
	return model;
}

describe('ModelBuilder', function () {
	"use strict";
	afterEach(function () {
		scopeCtrl.clear();
		modelCtrl.clear();
	});

	describe('private methods', function () {
		describe('connectCallerCalleeScopeRelatedModelsAtCallSite', function () {
			it('should connect models related to caller and callee well', function () {
				var callerGraph = cfgBuilder.getCFG(jsParser.parseAST(
						'var a = 0;' +
						'foo();' +
						'++a;',
						{range: true, loc: true}
					)),
					calleeGraph = cfgBuilder.getCFG(jsParser.parseAST(
						'var b = 1;' +
						'--b;' +
						'--a;',
						{range: true, loc: true}
					));
				var callerModel = factoryModel.create(),
					calleeModel = factoryModel.create();
				callerModel.graph = callerGraph;
				calleeModel.graph = calleeGraph;
				/// built by hand with the hierarchy and expand (the connecting function is replaced by them)
				var connectedModel = hierarchy.createCallHierarchyModel(callerModel);
				hierarchy.addCallEdge(connectedModel, {callSite: callerGraph[2][2], calleeModel: calleeModel});
				expandInto(connectedModel);
				should.exist(connectedModel);
				connectedModel.graph[2].length.should.eql(11); /// callerGraph(CALL NODE inside) + calleeGraph + CALL RETURN NODE
				connectedModel.graph[2][2]._testonly_._type.should.eql('call');
				connectedModel.graph[2][3].original.should.eql(calleeGraph[0]);
				connectedModel.graph[2][7].original.should.eql(calleeGraph[1]);
				connectedModel.graph[2][8]._testonly_._type.should.eql('callReturn');
				should.not.exist(connectedModel.graph[2][2].normal);
				connectedModel.graph[2][2].call.original.should.eql(calleeGraph[0]);
			});
		});

		describe('connectPageRelatedModelToLoopNode', function () {
			it('should connect LOOP NODE to the related model for a page well', function () {
				var graph = cfgBuilder.getCFG(jsParser.parseAST(
					'var a, b;',
					{range: true, loc: true}
				));
				var model = factoryModel.create();
				model.graph = graph;
				/// built by hand with the hierarchy and expand; the graph of the page with
				/// the LOOP NODE is the flat graph up to the exit node (the LOOP RETURN NODE follows)
				var flatGraph = expandInto(hierarchy.createIntraPageModel(model, [])).graph,
					connectedGraph = [flatGraph[0], flatGraph[1], flatGraph[2].slice(0, flatGraph[2].indexOf(flatGraph[1]) + 1)];
				connectedGraph[2].length.should.eql(4);
				connectedGraph[1].prev.length.should.eql(1);
				connectedGraph[1].prev[0]._testonly_._type.should.eql('loop');
				connectedGraph[2][2]._testonly_._type.should.eql('loop');
				connectedGraph[2][2].normal.should.eql(connectedGraph[1]);
			});
		});

		describe('connectPageAndEventHandlers', function () {
			var pageAST, eventHandlerAST1, eventHandlerAST2,
				pageScope, eventHandlerScope1, eventHandlerScope2,
				pageGraph, eventHandlerGraph1, eventHandlerGraph2,
				pageModel, eventHandlerModel1, eventHandlerModel2;
			beforeEach(function () {
				pageAST = jsParser.parseAST(
					'var a, b;',
					{range: true, loc: true}
				);
				eventHandlerAST1 = jsParser.parseAST(
					'function foo() {' +
					'var c, d, e;' +
					'}',
					{range: true, loc: true}
				);
				eventHandlerAST2 = jsParser.parseAST(
					'function fun() {' +
					'var g;' +
					'}',
					{range: true, loc: true}
				);
				pageScope = factoryScope.createPageScope(pageAST);
				eventHandlerScope1 = factoryScope.createFunctionScope(eventHandlerAST1.body[0], 'foo', pageScope);
				eventHandlerScope2 = factoryScope.createFunctionScope(eventHandlerAST2.body[0], 'fun', pageScope);
				pageGraph = cfgBuilder.getCFG(pageAST);
				eventHandlerGraph1 = cfgBuilder.getCFG(eventHandlerAST1.body[0].body);
				eventHandlerGraph2 = cfgBuilder.getCFG(eventHandlerAST2.body[0].body);
				pageModel = factoryModel.create();
				eventHandlerModel1 = factoryModel.create();
				eventHandlerModel2 = factoryModel.create();
				pageModel.graph = pageGraph;
				pageModel.addRelatedScope(pageScope);
				eventHandlerModel1.graph = eventHandlerGraph1;
				eventHandlerModel1.addRelatedScope(eventHandlerScope1);
				eventHandlerModel2.graph = eventHandlerGraph2;
				eventHandlerModel2.addRelatedScope(eventHandlerScope2);
			});

			it('should connect page model and event handler models well', function () {
				/// built by hand with the hierarchy and expand
				var resultModel = expandInto(hierarchy.createIntraPageModel(pageModel, [eventHandlerModel1, eventHandlerModel2]));
				var resultGraph = resultModel.graph;
				resultGraph[2].length.should.eql(11);
				var pageLoopNode = resultGraph[2][2];
                pageLoopNode.type.should.eql('loop');
				var pageLoopReturnNode = resultGraph[2][7];
                pageLoopReturnNode.type.should.eql('loopReturn');
				pageLoopNode.onEvent[0].original.should.eql(eventHandlerGraph1[0]);
				pageLoopNode.onEvent[1].original.should.eql(eventHandlerGraph2[0]);
				resultModel.flatNodeOf(eventHandlerGraph1[1]).normal.toString().should.eql(pageLoopReturnNode.toString());
				resultModel.flatNodeOf(eventHandlerGraph2[1]).normal.toString().should.eql(pageLoopReturnNode.toString());
				pageLoopReturnNode.return[0].should.eql(pageLoopNode);
			});

            it('should connect LOOP NODE and LOOP RETURN NODE as no event handlers', function () {
                /// built by hand with the hierarchy and expand
                var resultModel = expandInto(hierarchy.createIntraPageModel(pageModel, []));
                var resultGraph = resultModel.graph;
                resultGraph[2].length.should.eql(5);
                var pageLoopNode = resultGraph[2][2];
                var pageLoopReturnNode = resultGraph[2][4];
                pageLoopReturnNode.type.should.eql('loopReturn');
                pageLoopNode.onEvent[0].should.eql(pageLoopReturnNode);
                pageLoopReturnNode.return[0].should.eql(pageLoopNode);
            });
		});

        describe('getRegisteredEventHandlerCallback', function () {
            beforeEach(function () {
                var ast = jsParser.parseAST(
                    'function foo() {}' +
                    'window.addEventListener("click",foo);',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees[0].scopes.forEach(function (scope) {
                    variableAnalyzer.setLocalVariables(scope);
                });
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
                modelBuilder.buildIntraProceduralModels();
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
                    scopeTree.scopes.forEach(function (scope) {
                        var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
                        if (!!model) {
                            defuseAnalyzer.doAnalysis(model);
                        }
                    });
                });
            });

            it('should get registered named function well', function () {
                var registerNode = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeCtrl.pageScopeTrees[0], scopeCtrl.pageScopeTrees[0].scopes[0]).graph[2][1];
                registerNode.astNode.type.should.eql('CallExpression');
                var handlerScope = modelBuilder._testonly_._getRegisteredEventHandlerCallback(registerNode, scopeCtrl.pageScopeTrees[0]);
                should.exist(handlerScope);
                handlerScope.toString().should.eql(scopeCtrl.pageScopeTrees[0].scopes[1].toString());
            });
        });

        describe('findEventHandlerModelsFromAModel', function () {
            it('should find depth-1 event handlers well', function () {
                var ast = jsParser.parseAST(
                    'function foo() {}' +
                    'function fun() {}' +
                    'window.addEventListener("click",foo);' +
                    'document.getElementById("id").addEventListener("load",fun);',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees[0].scopes.forEach(function (scope) {
                    variableAnalyzer.setLocalVariables(scope);
                });
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
                modelBuilder.buildIntraProceduralModels();
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
                    scopeTree.scopes.forEach(function (scope) {
                        var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
                        if (!!model) {
                            defuseAnalyzer.doAnalysis(model);
                        }
                    });
                });

                var handlerModels = modelBuilder._testonly_._findEventHandlerModelsFromAModel(
                    modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(
                        scopeCtrl.pageScopeTrees[0],
                        scopeCtrl.pageScopeTrees[0].scopes[0]
                    ),
                    scopeCtrl.pageScopeTrees[0]
                );
                handlerModels.length.should.eql(2);
                handlerModels[0]._testonly_._mainlyRelatedScope.toString().should.eql('$DOMAIN.$PAGE_0.foo');
                handlerModels[1]._testonly_._mainlyRelatedScope.toString().should.eql('$DOMAIN.$PAGE_0.fun');
            });

            it('should ignore already found event handler', function () {
                var ast = jsParser.parseAST(
                    'function foo() {}' +
                    'window.addEventListener("click",foo);' +
                    'document.getElementById("id").addEventListener("load",foo);',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees[0].scopes.forEach(function (scope) {
                    variableAnalyzer.setLocalVariables(scope);
                });
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
                modelBuilder.buildIntraProceduralModels();
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
                    scopeTree.scopes.forEach(function (scope) {
                        var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
                        if (!!model) {
                            defuseAnalyzer.doAnalysis(model);
                        }
                    });
                });

                var handlerModels = modelBuilder._testonly_._findEventHandlerModelsFromAModel(
                    modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(
                        scopeCtrl.pageScopeTrees[0],
                        scopeCtrl.pageScopeTrees[0].scopes[0]
                    ),
                    scopeCtrl.pageScopeTrees[0]
                );
                handlerModels.length.should.eql(1);
                handlerModels[0]._testonly_._mainlyRelatedScope.toString().should.eql('$DOMAIN.$PAGE_0.foo');
            });

            it('should support finding as no event handlers', function () {
                var ast = jsParser.parseAST(
                    'var a, b;',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees[0].scopes.forEach(function (scope) {
                    variableAnalyzer.setLocalVariables(scope);
                });
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
                modelBuilder.buildIntraProceduralModels();
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                scopeCtrl.pageScopeTrees[0].scopes.forEach(function (scope) {
                    var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeCtrl.pageScopeTrees[0], scope);
                    if (!!model) {
                        defuseAnalyzer.doAnalysis(model);
                    }
                });

                var handlerModels = modelBuilder._testonly_._findEventHandlerModelsFromAModel(
                    modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(
                        scopeCtrl.pageScopeTrees[0],
                        scopeCtrl.pageScopeTrees[0].scopes[0]
                    ),
                    scopeCtrl.pageScopeTrees[0]
                );
                handlerModels.length.should.eql(0);
            });
        });

        describe('getInterProceduralModelStartFromTheScope', function () {
            beforeEach(function () {
                var ast = jsParser.parseAST(
                    'var a, b;' +
                    'function foo() {' +
                    'var c;' +
                    'c++' +
                    '}' +
                    'function fun() {' +
                    'var d = function() {' +
                    'var f;' +
                    '};' +
                    'var g = 1;' +
                    '--g;' +
                    '++g;' +
                    '}' +
                    'foo();' +
                    'fun();',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
                    pageScopeTree.scopes.forEach(function (scope) {
                        variableAnalyzer.setLocalVariables(scope);
                    });
                });
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
                modelBuilder.buildIntraProceduralModels();
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
                    scopeTree.scopes.forEach(function (scope) {
                        var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
                        if (!!model) {
                            defuseAnalyzer.doAnalysis(model);
                        }
                    });
                });
            });

            it('should get inter-procedural models start from the scope', function () {
                var pageScopeTree = scopeCtrl.pageScopeTrees[0];
                var pageScope = pageScopeTree.scopes[0];
                var model = modelBuilder._testonly_._getInterProceduralModelStartFromTheScope(pageScope, pageScopeTree);
                should.exist(model);
                model._testonly_._mainlyRelatedScope.should.eql(pageScope);
                model._testonly_._relatedScopes.length.should.eql(3);
            });
        });
	});

	describe('public methods', function () {
        describe('building intra-procedural and inter-procedural models', function () {
            beforeEach(function () {
                var ast = jsParser.parseAST(
                    'var a, b;' +
                    'function foo() {' +
                    'var c;' +
                    'c++' +
                    '}' +
                    'function fun() {' +
                    'var d = function() {' +
                    'var f;' +
                    '};' +
                    'var g = 1;' +
                    '--g;' +
                    '++g;' +
                    '}' +
                    'foo();' +
                    'fun();',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
                    pageScopeTree.scopes.forEach(function (scope) {
                        variableAnalyzer.setLocalVariables(scope);
                    });
                });
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
            });

            describe('buildIntraProceduralModels', function () {
                beforeEach(function () {
                    modelBuilder.buildIntraProceduralModels();
                });

                it('should contain correct number of models', function () {
                    modelCtrl._testonly_._collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0])
                        ._testonly_._intraProceduralModels.length.should.eql(4);
                });

                it('should contain corresponding scope', function () {
                    var pageScopeTree = scopeCtrl.pageScopeTrees[0];
                    modelCtrl._testonly_._collectionOfPageModels.get(pageScopeTree)._testonly_._intraProceduralModels.forEach(function (model) {
                        model._testonly_._relatedScopes.length.should.eql(1);
                    });
                    pageScopeTree._testonly_._scopes.every(function (scope) {
                        return modelCtrl._testonly_._collectionOfPageModels.get(pageScopeTree)._testonly_._intraProceduralModels.some(function (model) {
                            return model._testonly_._relatedScopes.indexOf(scope) !== -1;
                        });
                    }).should.eql(true);
                });

                it('should contain corresponding graph', function () {
                    var pageScopeTree = scopeCtrl.pageScopeTrees[0];
                    modelCtrl._testonly_._collectionOfPageModels.get(pageScopeTree)._testonly_._intraProceduralModels.forEach(function (model) {
                        if (model._testonly_._mainlyRelatedScope === pageScopeTree._testonly_._scopes[0]) {
                            model._testonly_._graph[2].length.should.eql(5);
                        } else if (model._testonly_._mainlyRelatedScope === pageScopeTree._testonly_._scopes[1]) {
                            model._testonly_._graph[2].length.should.eql(4);
                        } else if (model._testonly_._mainlyRelatedScope === pageScopeTree._testonly_._scopes[2]) {
                            model._testonly_._graph[2].length.should.eql(6);
                        } else if (model._testonly_._mainlyRelatedScope === pageScopeTree._testonly_._scopes[3]) {
                            model._testonly_._graph[2].length.should.eql(3);
                        }
                    });
                });

                it('should set the level of intra-procedural models', function () {
                    var models = modelCtrl._testonly_._collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0])
                        ._testonly_._intraProceduralModels;
                    models.length.should.eql(4);
                    models.forEach(function (model) {
                        model.level.should.eql(Model.INTRA_PROCEDURAL);
                    });
                });
            });

            describe('buildInterProceduralModels', function () {
                beforeEach(function () {
                    modelBuilder.buildIntraProceduralModels();
                    defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                    scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
                        scopeTree.scopes.forEach(function (scope) {
                            var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
                            if (!!model) {
                                defuseAnalyzer.doAnalysis(model);
                            }
                        });
                    });
                    modelBuilder.buildInterProceduralModels();
                });

                it('should build inter-procedural models for depth-1 calling well', function () {
                    var pageScopeTrees = scopeCtrl.pageScopeTrees;
                    pageScopeTrees.length.should.eql(1);
                    var pageModels = modelCtrl.getPageModels(pageScopeTrees[0]);
                    pageModels._testonly_._interProceduralModels.length.should.eql(1);
                    var graph = pageModels._testonly_._interProceduralModels[0]._testonly_._graph;
                    graph[2].length.should.eql(17);
                    var callNodes = [], callReturnNodes = [];
                    graph[2].forEach(function (node) {
                        if (node.type === 'call') {
                            callNodes.push(node);
                        } else if (node.type === 'callReturn') {
                            callReturnNodes.push(node);
                        }
                    });
                    callNodes.length.should.eql(2);
                    callReturnNodes.length.should.eql(2);
                    callNodes[0].call.scope.toString().should.eql('$DOMAIN.$PAGE_0.foo');
                    callNodes[1].call.scope.toString().should.eql('$DOMAIN.$PAGE_0.fun');
                    callReturnNodes[0].prev[0].scope.toString().should.eql('$DOMAIN.$PAGE_0.foo');
                    callReturnNodes[1].prev[0].scope.toString().should.eql('$DOMAIN.$PAGE_0.fun');
                });

                it('should set the level of inter-procedural models', function () {
                    var pageModels = modelCtrl.getPageModels(scopeCtrl.pageScopeTrees[0]);
                    pageModels._testonly_._interProceduralModels.length.should.eql(1);
                    pageModels._testonly_._interProceduralModels[0].level.should.eql(Model.INTER_PROCEDURAL);
                    pageModels._testonly_._intraProceduralModels.forEach(function (model) {
                        model.level.should.eql(Model.INTRA_PROCEDURAL);
                    });
                });
            });
        });

        describe('buildIntraPageModel', function () {
            beforeEach(function () {
                var ast = jsParser.parseAST(
                    'function foo() {}' +
                    'function fun() {}' +
                    'function some() {}' +
                    'window.addEventListener("click", foo);' +
                    'document.getElementById("id").addEventListener("load",fun);' +
                    'window.addEventListener("load", fun);',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
                    pageScopeTree.scopes.forEach(function (scope) {
                        variableAnalyzer.setLocalVariables(scope);
                    });
                });
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
                modelBuilder.buildIntraProceduralModels();
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
                    scopeTree.scopes.forEach(function (scope) {
                        var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
                        if (!!model) {
                            defuseAnalyzer.doAnalysis(model);
                        }
                    });
                });
                modelBuilder.buildInterProceduralModels();
                modelBuilder.buildIntraPageModel();
            });

            it('should build intra-page model well', function () {
                var pageModels = modelCtrl.getPageModels(scopeCtrl.pageScopeTrees[0]);
                pageModels._testonly_._intraPageModels.length.should.eql(1);
                var graph = pageModels._testonly_._intraPageModels[0].graph;
                graph[2].length.should.eql(11);
                var loopNode = graph[2][4];
                loopNode.type.should.eql('loop');
                loopNode.onEvent.length.should.eql(2);
                loopNode.onEvent[0].scope.toString().should.eql('$DOMAIN.$PAGE_0.foo');
                loopNode.onEvent[1].scope.toString().should.eql('$DOMAIN.$PAGE_0.fun');
            });

            it('should set the level of the intra-page model', function () {
                var pageModels = modelCtrl.getPageModels(scopeCtrl.pageScopeTrees[0]);
                pageModels._testonly_._intraPageModels.length.should.eql(1);
                pageModels._testonly_._intraPageModels[0].level.should.eql(Model.INTRA_PAGE);
            });
        });

        describe('buildInterPageModel', function () {
            var page1ScopeTree, page2ScopeTree, pageScope1, pageScope2;
            beforeEach(function () {
                var ast1 = jsParser.parseAST(
                        'var d = "data";' +
                        'localStorage.data = d;',
                        {range: true, loc: true}
                    ),
                    ast2 = jsParser.parseAST(
                        'var d = localStorage.data;',
                        {range: true, loc: true}
                    );
                scopeCtrl.addPageScopeTree(ast1);
                scopeCtrl.addPageScopeTree(ast2);
                page1ScopeTree = scopeCtrl.pageScopeTrees[0];
                page2ScopeTree = scopeCtrl.pageScopeTrees[1];
                pageScope1 = page1ScopeTree.root;
                pageScope2 = page2ScopeTree.root;
                variableAnalyzer.setLocalVariables(scopeCtrl.domainScope);
                variableAnalyzer.setLocalVariables(pageScope1);
                variableAnalyzer.setLocalVariables(pageScope2);
                modelCtrl.initializePageModels();
                modelCtrl.addPageModels(page1ScopeTree);
                modelCtrl.addPageModels(page2ScopeTree);
                modelBuilder.buildIntraProceduralModels();
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                defuseAnalyzer.doAnalysis(modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(page1ScopeTree, pageScope1));
                defuseAnalyzer.doAnalysis(modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(page2ScopeTree, pageScope2));
                modelBuilder.buildInterProceduralModels();
                modelBuilder.buildIntraPageModel();
                modelBuilder.buildInterPageModel();
            });

            it('should build inter-page model well', function () {
                var page1IntraPageModel = modelCtrl.getIntraPageModelByMainlyRelatedScopeFromAPageModels(page1ScopeTree, pageScope1),
                    page2IntraPageModel = modelCtrl.getIntraPageModelByMainlyRelatedScopeFromAPageModels(page2ScopeTree, pageScope2);
                var interPageModel = modelCtrl._testonly_._interPageModel;
                should.exist(interPageModel);
                var graph = interPageModel.graph;
                graph[0].type.should.eql('localStorage');
                graph[1].type.should.eql('localStorage');
                graph[0].loadStorage[0].original.should.eql(page1IntraPageModel.graph[0].original);
                graph[0].loadStorage[1].original.should.eql(page2IntraPageModel.graph[0].original);
                (interPageModel.flatNodeOf(page1IntraPageModel.graph[2][2].original).saveStorage === graph[0]).should.eql(true);
            });

            it('should set the level of each model', function () {
                modelCtrl._testonly_._interPageModel.level.should.eql(Model.INTER_PAGE);
                modelCtrl.getIntraPageModelByMainlyRelatedScopeFromAPageModels(page1ScopeTree, pageScope1)
                    .level.should.eql(Model.INTRA_PAGE);
                modelCtrl.getIntraPageModelByMainlyRelatedScopeFromAPageModels(page2ScopeTree, pageScope2)
                    .level.should.eql(Model.INTRA_PAGE);
                modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(page1ScopeTree, pageScope1)
                    .level.should.eql(Model.INTRA_PROCEDURAL);
            });
        });
	});
});

/*
 * Upper models built as hierarchies by the builder (specs/003-hierarchical-models,
 * tasks T027 and T033). The expected values are the output of the program
 * before the refactoring (e68bb2d) for the same programs.
 */
/**
 * Analyze a probe program of tests/dujs/cases/probes
 * @param {string} name
 * @returns {Object} result of the analyze helper
 */
function analyzeProbe(name) {
	"use strict";
	return analyze(fs.readFileSync(path.join(PROBES, name + '.js'), 'utf8'));
}

/**
 * The first node of a model at a line whose analyzed expressions include a
 * call of addEventListener
 * @param {Model} model
 * @param {number} line
 * @returns {FlowNode}
 */
function registeringNodeAt(model, line) {
	"use strict";
	var found = model.graph[2].filter(function (node) {
		return node.line === line && node.analyzedExpressions.some(function (expression) {
			return !!expression && expression.type === 'CallExpression' &&
				expression.callee.type === 'MemberExpression' && expression.callee.property.name === 'addEventListener';
		});
	})[0];
	FlowNode.isFlowNode(found).should.be.true();
	return found;
}

/**
 * Assert two lists hold the same objects in the same order
 * @param {Array} actual
 * @param {Array} expected
 */
function shouldBeSameObjects(actual, expected) {
	"use strict";
	actual.length.should.eql(expected.length);
	actual.forEach(function (each, index) {
		(each === expected[index]).should.be.true('object at ' + index + ' differs');
	});
}

describe('ModelBuilder upper models as hierarchies', function () {
	"use strict";
	after(analyze.reset);

	describe('inter-procedural models', function () {
		/// a calls b (which calls c) and k, all nested; the page calls a and e
		var NESTED = [
			'var x = 0;',
			'function a() {',
			'  function b() {',
			'    function c() { x = 1; }',
			'    c();',
			'  }',
			'  function k() { x = 4; }',
			'  b();',
			'  k();',
			'}',
			'function e() { x = 2; }',
			'a();',
			'e();'
		].join('\n');

		it('should keep the related scopes of a nested call chain as before the refactoring', function () {
			var result = analyze(NESTED);
			result.interProceduralScopes().should.eql([
				['$DOMAIN.$PAGE_0.a.b', '$DOMAIN.$PAGE_0.a.b.c'],
				['$DOMAIN.$PAGE_0.a', '$DOMAIN.$PAGE_0.a.b', '$DOMAIN.$PAGE_0.a.b.c', '$DOMAIN.$PAGE_0.a.k'],
				['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.a', '$DOMAIN.$PAGE_0.a.b', '$DOMAIN.$PAGE_0.a.b.c',
					'$DOMAIN.$PAGE_0.a.k', '$DOMAIN.$PAGE_0.e']
			]);
			var models = modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels;
			models.map(function (model) {
				return String(model.mainlyRelatedScope);
			}).should.eql(['$DOMAIN.$PAGE_0.a.b', '$DOMAIN.$PAGE_0.a', '$DOMAIN.$PAGE_0']);
			models.forEach(function (model) {
				model.level.should.eql(Model.INTER_PROCEDURAL);
				Object.isFrozen(model.hierarchy).should.be.true();
				(model.hierarchy.main.scope === model.mainlyRelatedScope).should.be.true();
			});
			/// the callee of a is the inter-procedural model of a.b; the callees of the page, the models of a and e
			(models[1].hierarchy.edges[0].calleeModel === models[0]).should.be.true();
			(models[2].hierarchy.edges[0].calleeModel === models[1]).should.be.true();
			result.intraPage().should.eql(['a: entry -> L12', 'b: entry -> L8', 'c: entry -> L5', 'e: entry -> L13', 'k: entry -> L9']);
		});
	});

	describe('handlers found with the reach-in definitions of research R8', function () {
		function intraPageModelOf(result) {
			return modelCtrl.collectionOfPageModels.get(result.scopeTree).intraPageModels[0];
		}

		/** scope names of the handlers of the intra-page model, in the order of its event edges */
		function handlersOf(result) {
			return intraPageModelOf(result).hierarchy.edges.filter(function (edge) {
				return edge.kind === 'event';
			}).map(function (edge) {
				return String(edge.handlerModel.mainlyRelatedScope);
			});
		}

		/** scope names of the targets of the onEvent edges of the LOOP NODE of the intra-page flat graph */
		function onEventOf(result) {
			var model = intraPageModelOf(result);
			return model.flatNodeOf(model.hierarchy.loop).onEvent.map(function (node) {
				return String(node.scope);
			});
		}

		// a2: h is called by the page and registered; h registers reg by an identifier, and
		// the topmost inter-procedural model of that node (the page) is not the searched model of h
		it('should find the handlers and pairs of probe a2 as before the refactoring', function () {
			var result = analyzeProbe('a2');
			var expected = ['$DOMAIN.$PAGE_0.h.reg', '$DOMAIN.$PAGE_0.h', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_4', '$DOMAIN.$PAGE_0.h.reg'];
			handlersOf(result).should.eql(expected);
			onEventOf(result).should.eql(expected);
			result.intraPage().should.eql([
				'h: entry -> L5', 'h: entry -> L6', 'h: entry -> L7', 'h: entry -> L8',
				'init: entry -> L3',
				'n: L3 -> L10', 'n: L3 -> L9', 'n: L4 -> L10', 'n: L4 -> L9', 'n: L8 -> L10', 'n: L8 -> L9',
				'reg: entry -> L4',
				'window: entry -> L4', 'window: entry -> L6', 'window: entry -> L7', 'window: entry -> L8'
			]);
		});

		/// plan U3 (a): the inter-procedural model mainly related to the page is
		/// taken first; here it is the one analyzed last as well (cyc-handler in
		/// callcycles.js has a model of a cycle analyzed after the page model)
		it('should read the reach-in definitions of the inter-procedural model of the page first', function () {
			var result = analyzeProbe('a2'),
				pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
				lookup = modelBuilder._testonly_._reachInsForHandlerLookup;
			var modelOfH = pageModels.intraProceduralModels.filter(function (model) {
				return String(model.mainlyRelatedScope) === '$DOMAIN.$PAGE_0.h';
			})[0];
			var original = registeringNodeAt(modelOfH, 4);
			var containing = pageModels.interProceduralModels.filter(function (model) {
				return model.analysisResultOf(original) !== null;
			});
			containing.map(function (model) {
				return String(model.mainlyRelatedScope);
			}).should.eql(['$DOMAIN.$PAGE_0.h', '$DOMAIN.$PAGE_0']);
			var last = containing[1].analysisResultOf(original).reachIns.values(),
				first = containing[0].analysisResultOf(original).reachIns.values();
			/// the two models give different reach-in definitions: the choice matters
			last.length.should.not.eql(first.length);
			shouldBeSameObjects(lookup(original).values(), last);
			/// a node of the graph of an upper model is mapped to its original
			shouldBeSameObjects(lookup(containing[0].flatNodeOf(original)).values(), last);
		});

		it('should fall back to the intra-procedural reach-in definitions when no model is analyzed', function () {
			analyze.reset();
			executor.initialize([fs.readFileSync(path.join(PROBES, 'a2.js'), 'utf8')]);
			executor.buildIntraProceduralModelsOfEachPageModels();
			modelBuilder.buildInterProceduralModels();
			var scopeTree = scopeCtrl.pageScopeTrees[0],
				pageModels = modelCtrl.collectionOfPageModels.get(scopeTree),
				lookup = modelBuilder._testonly_._reachInsForHandlerLookup;
			var modelOfH = pageModels.intraProceduralModels.filter(function (model) {
				return String(model.mainlyRelatedScope) === '$DOMAIN.$PAGE_0.h';
			})[0];
			var original = registeringNodeAt(modelOfH, 4);
			pageModels.interProceduralModels.length.should.be.above(1);
			pageModels.interProceduralModels.forEach(function (model) {
				(model.analysisResultOf(original) === null).should.be.true();
				(model.flatNodeOf(original) !== null).should.be.true();
			});
			original.reachIns.size.should.be.above(0);
			shouldBeSameObjects(lookup(original).values(), original.reachIns.values());
			analyze.reset();
		});

		// a4: onA is registered twice by the page (one search keeps it once, as before the refactoring)
		it('should keep the handler list of probe a4 as before the refactoring', function () {
			var result = analyzeProbe('a4');
			handlersOf(result).should.eql(['$DOMAIN.$PAGE_0.onA', '$DOMAIN.$PAGE_0.onB']);
			onEventOf(result).should.eql(['$DOMAIN.$PAGE_0.onA', '$DOMAIN.$PAGE_0.onB']);
		});

		// r8: g is found from the page and again from h (duplicates kept)
		it('should keep the onEvent targets g, h, g of probe r8 in order with duplicates', function () {
			var result = analyzeProbe('r8');
			handlersOf(result).should.eql(['$DOMAIN.$PAGE_0.g', '$DOMAIN.$PAGE_0.h', '$DOMAIN.$PAGE_0.g']);
			onEventOf(result).should.eql(['$DOMAIN.$PAGE_0.g', '$DOMAIN.$PAGE_0.h', '$DOMAIN.$PAGE_0.g']);
			result.intraPage().should.eql([
				'g: entry -> L3', 'h: entry -> L4', 'h: entry -> L5',
				'n: L1 -> L6', 'n: L2 -> L6', 'n: L3 -> L6',
				'reg: entry -> L3', 'window: entry -> L3', 'window: entry -> L5'
			]);
		});
	});
});
