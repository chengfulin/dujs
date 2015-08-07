/*
 * Test cases for ModelBuilder module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-07
 */
var should = require('should'),
	esprima = require('esprima');
var Model = require('../../lib/dujs/model'),
	factoryScopeTree = require('../../lib/dujs/scopetreefactory'),
	modelBuilder = require('../../lib/dujs/modelbuilder');

describe('ModelBuilder', function () {
	"use strict";
	describe('public methods', function () {
		describe('buildIntraProceduralModels', function () {
			var scopeTree;
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
				scopeTree = factoryScopeTree.create();
				scopeTree.buildScopeTree(ast);
			});

			it('should contain correct number of models', function () {
				var models = modelBuilder.buildIntraProceduralModels(scopeTree);
				models.length.should.eql(4);
			});

			it('should contain corresponding scope', function () {
				var models = modelBuilder.buildIntraProceduralModels(scopeTree);
				models.forEach(function (model) {
					model._testonly_._relatedScopes.length.should.eql(1);
				});
				scopeTree._testonly_._scopes.every(function (scope) {
					return models.some(function (model) {
						return model._testonly_._relatedScopes.indexOf(scope) !== -1;
					});
				}).should.eql(true);
			});

			it('should contain corresponding graph', function () {
				var models = modelBuilder.buildIntraProceduralModels(scopeTree);
				models.forEach(function (model) {
					if (model._testonly_._mainlyRelatedScope === scopeTree._testonly_._scopes[0]) {
						model._testonly_._graph[2].length.should.eql(5);
					} else if (model._testonly_._mainlyRelatedScope === scopeTree._testonly_._scopes[1]) {
						model._testonly_._graph[2].length.should.eql(4);
					} else if (model._testonly_._mainlyRelatedScope === scopeTree._testonly_._scopes[2]) {
						model._testonly_._graph[2].length.should.eql(6);
					} else if (model._testonly_._mainlyRelatedScope === scopeTree._testonly_._scopes[3]) {
						model._testonly_._graph[2].length.should.eql(3);
					}
				});
			});
		});
	});
});