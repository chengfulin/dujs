/*
 * Test cases for ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-31
 */
var should = require('should'),
	esprima = require('esprima');
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	modelBuilder = require('../../lib/dujs/modelbuilder'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder'),
	factoryModel = require('../../lib/dujs/modelfactory'),
	factoryScope = require('../../lib/dujs/scopefactory'),
    variableAnalyzer = require('../../lib/dujs/variableanalyzer'),
    defuseAnalyzer = require('../../lib/dujs/defuseanalyzer');

describe('ModelBuilder', function () {
	"use strict";
	afterEach(function () {
		scopeCtrl.clear();
		modelCtrl.clear();
	});

	describe('private methods', function () {
		describe('connectCallerCalleeScopeRelatedModelsAtCallSite', function () {
			it('should connect models related to caller and callee well', function () {
				var callerGraph = cfgBuilder.getCFG(esprima.parse(
						'var a = 0;' +
						'foo();' +
						'++a;',
						{range: true, loc: true}
					)),
					calleeGraph = cfgBuilder.getCFG(esprima.parse(
						'var b = 1;' +
						'--b;' +
						'--a;',
						{range: true, loc: true}
					));
				var callerModel = factoryModel.create(),
					calleeModel = factoryModel.create();
				callerModel.graph = callerGraph;
				calleeModel.graph = calleeGraph;
				var connectedModel = modelBuilder._testonly_._connectCallerCalleeScopeRelatedModelsAtCallSite(callerModel, calleeModel, callerGraph[2][2]);
				should.exist(connectedModel);
				connectedModel.graph[2].length.should.eql(11); /// callerGraph(CALL NODE inside) + calleeGraph + CALL RETURN NODE
				connectedModel.graph[2][2]._testonly_._type.should.eql('call');
				connectedModel.graph[2][3].should.eql(calleeGraph[0]);
				connectedModel.graph[2][7].should.eql(calleeGraph[1]);
				connectedModel.graph[2][8]._testonly_._type.should.eql('callReturn');
				should.not.exist(connectedModel.graph[2][2].normal);
				connectedModel.graph[2][2].call.should.eql(calleeGraph[0]);
			});
		});

		describe('connectPageRelatedModelToLoopNode', function () {
			it('should connect LOOP NODE to the related model for a page well', function () {
				var graph = cfgBuilder.getCFG(esprima.parse(
					'var a, b;',
					{range: true, loc: true}
				));
				var model = factoryModel.create();
				model.graph = graph;
				var connectedGraph = modelBuilder._testonly_._connectLoopNodeToPageGraph(model);
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
				pageAST = esprima.parse(
					'var a, b;',
					{range: true, loc: true}
				);
				eventHandlerAST1 = esprima.parse(
					'function foo() {' +
					'var c, d, e;' +
					'}',
					{range: true, loc: true}
				);
				eventHandlerAST2 = esprima.parse(
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
				var resultModel = modelBuilder._testonly_._connectPageAndEventHandlers(pageModel, [eventHandlerModel1, eventHandlerModel2]);
				var resultGraph = resultModel.graph;
				resultGraph[2].length.should.eql(11);
				var pageLoopNode = resultGraph[2][2];
                pageLoopNode.type.should.eql('loop');
				var pageLoopReturnNode = resultGraph[2][7];
                pageLoopReturnNode.type.should.eql('loopReturn');
				pageLoopNode.onEvent[0].should.eql(eventHandlerGraph1[0]);
				pageLoopNode.onEvent[1].should.eql(eventHandlerGraph2[0]);
				eventHandlerGraph1[1].normal.toString().should.eql(pageLoopReturnNode.toString());
				eventHandlerGraph2[1].normal.toString().should.eql(pageLoopReturnNode.toString());
				pageLoopReturnNode.return[0].should.eql(pageLoopNode);
			});

            it('should connect LOOP NODE and LOOP RETURN NODE as no event handlers', function () {
                var resultModel = modelBuilder._testonly_._connectPageAndEventHandlers(pageModel, []);
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
                var ast = esprima.parse(
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
                var ast = esprima.parse(
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
                var ast = esprima.parse(
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
                var ast = esprima.parse(
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
                var ast = esprima.parse(
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
                var ast = esprima.parse(
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
            });
        });

        describe('buildIntraPageModel', function () {
            beforeEach(function () {
                var ast = esprima.parse(
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
        });

        describe('buildInterPageModel', function () {
            var page1ScopeTree, page2ScopeTree, pageScope1, pageScope2;
            beforeEach(function () {
                var ast1 = esprima.parse(
                        'var d = "data";' +
                        'localStorage.data = d;',
                        {range: true, loc: true}
                    ),
                    ast2 = esprima.parse(
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
                graph[0].loadStorage[0].should.eql(page1IntraPageModel.graph[0]);
                graph[0].loadStorage[1].should.eql(page2IntraPageModel.graph[0]);
                page1IntraPageModel.graph[2][2].saveStorage.should.eql(graph[0]);
            });
        });
	});
});