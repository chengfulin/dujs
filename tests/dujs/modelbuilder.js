/*
 * Test cases for ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-19
 */
var should = require('should'),
	esprima = require('esprima');
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelBuilder = require('../../lib/dujs/modelbuilder'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder'),
	factoryModel = require('../../lib/dujs/modelfactory');

describe('ModelBuilder', function () {
	"use strict";
	afterEach(function () {
		scopeCtrl.clear();
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
			});

			it('should contain correct number of models', function () {
				var modelsOfPages = modelBuilder.buildIntraProceduralModels();
				modelsOfPages.size.should.eql(1);
				console.log(!!modelsOfPages.get(scopeCtrl.pageScopeTrees[0]));
				modelsOfPages.get(scopeCtrl.pageScopeTrees[0]).length.should.eql(4);
			});

			it('should contain corresponding scope', function () {
				var modelsOfPages = modelBuilder.buildIntraProceduralModels();
				var pageScopeTree = scopeCtrl.pageScopeTrees[0];
				modelsOfPages.get(pageScopeTree).forEach(function (model) {
					model._testonly_._relatedScopes.length.should.eql(1);
				});
				pageScopeTree._testonly_._scopes.every(function (scope) {
					return modelsOfPages.get(pageScopeTree).some(function (model) {
						return model._testonly_._relatedScopes.indexOf(scope) !== -1;
					});
				}).should.eql(true);
			});

			it('should contain corresponding graph', function () {
				var modelsOfPages = modelBuilder.buildIntraProceduralModels();
				var pageScopeTree = scopeCtrl.pageScopeTrees[0];
				modelsOfPages.get(pageScopeTree).forEach(function (model) {
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