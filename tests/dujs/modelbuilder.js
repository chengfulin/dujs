/*
 * Test cases for ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-19
 */
var should = require('should'),
	esprima = require('esprima');
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	modelBuilder = require('../../lib/dujs/modelbuilder'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder'),
	factoryModel = require('../../lib/dujs/modelfactory'),
	factoryScope = require('../../lib/dujs/scopefactory');

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
				var pageLoopReturnNode = resultGraph[2][7];
				pageLoopNode.onEvent[0].should.eql(eventHandlerGraph1[0]);
				pageLoopNode.onEvent[1].should.eql(eventHandlerGraph2[0]);
				eventHandlerGraph1[1].normal.should.eql(pageLoopReturnNode);
				eventHandlerGraph2[1].normal.should.eql(pageLoopReturnNode);
				pageLoopReturnNode.return[0].should.eql(pageLoopNode);
			});
		});
	});

	describe('public methods', function () {
		describe('buildIntraProceduralModels', function () {
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
				modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
			});

			it('should contain correct number of models', function () {
				modelBuilder.buildIntraProceduralModels();
				modelCtrl._testonly_._collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0])
					._testonly_._intraProceduralModels.length.should.eql(4);
			});

			it('should contain corresponding scope', function () {
				modelBuilder.buildIntraProceduralModels();
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
				modelBuilder.buildIntraProceduralModels();
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
	});
});