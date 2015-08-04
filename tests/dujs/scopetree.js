/*
 * Test cases for ScopeTree module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-04
 */
var should = require('should');
var ScopeTree = require('../../lib/dujs/scopetree'),
	factoryScope = require('../../lib/dujs/scopefactory'),
	factoryRange = require('../../lib/dujs/rangefactory');

describe('ScopeTree', function () {
	"use strict";
	describe('private methods', function () {
		describe('addScope', function () {
			var tree, scope;
			beforeEach(function () {
				tree = new ScopeTree();
				scope = factoryScope.createFunctionScope(
					{type: 'FunctionDeclaration', range: [0,1], loc: {line: 1, col: 0}},
					'foo',
					null
				);
			});

			it('should support to add a Scope into the tree', function () {
				ScopeTree._testonly_._addScope(tree, scope);
				tree._testonly_._scopes.length.should.eql(1);
				tree._testonly_._scopes.indexOf(scope).should.eql(0);
				tree._testonly_._mapFromNameToScope.size.should.eql(1);
				tree._testonly_._mapFromNameToScope.has('foo').should.eql(true);
				tree._testonly_._mapFromNameToScope.get('foo').should.eql(scope);
				tree._testonly_._mapFromRangeToScope.size.should.eql(1);
				tree._testonly_._mapFromRangeToScope.has('[0,1]').should.eql(true);
				tree._testonly_._mapFromRangeToScope.get('[0,1]').should.eql(scope);
			});

			it('should ignore as the input scope is invalid', function () {
				ScopeTree._testonly_._addScope(tree, {type: 'function', name: 'foo', parent: null});
				tree._testonly_._scopes.length.should.eql(0);
				tree._testonly_._mapFromNameToScope.size.should.eql(0);
				tree._testonly_._mapFromRangeToScope.size.should.eql(0);
			});
		});

		describe('initialization', function () {
			var tree, ast;
			beforeEach(function () {
				tree = new ScopeTree();
				ast = {type: 'Program', range: [0,1], loc: {line: 1, col: 0}};
			});

			it('should initialize the tree with AST', function () {
				ScopeTree._testonly_._initialization(tree, ast);
				tree._testonly_._scopes.length.should.eql(1);
				should.exist(tree._testonly_._root);

				var page = tree._testonly_._root;
				page._testonly_._ast.should.eql(ast);
				page._testonly_._type.should.eql('page');
				tree._testonly_._scopes[0].should.eql(page);
				tree._testonly_._mapFromNameToScope.size.should.eql(1);
				tree._testonly_._mapFromNameToScope.has('$PAGE_0').should.eql(true);
			});
		});
	});
});