/*
 * Test cases for ScopeTree module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-04
 */
var should = require('should'),
	esprima = require('esprima');
var ScopeTree = require('../../lib/dujs/scopetree'),
	factoryScope = require('../../lib/dujs/scopefactory'),
	factoryRange = require('../../lib/dujs/rangefactory');

describe('ScopeTree', function () {
	"use strict";
	beforeEach(function () {
		factoryScope.resetPageScopeCounter();
		factoryScope.resetAnonymousFunctionScopeCounter();
	});

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

			it('should throw an error as the input AST is invalid', function () {
				should(function () {
					ScopeTree._testonly_._initialization(tree, {type: 'domain', range: [0,1], loc: {line: 1, col: 0}});
				}).throw('Invalid value for a PageScope');
			});
		});
	});

	describe('static methods', function () {
		describe('isScopeTree', function () {
			it('should return false as the object is not a ScopeTree', function () {
				ScopeTree.isScopeTree({root: null}).should.eql(false);
				ScopeTree.isScopeTree(null).should.eql(false);
			});

			it('should return true as the object is a ScopeTree', function () {
				ScopeTree.isScopeTree(new ScopeTree()).should.eql(true);
			});
		});
	});

	describe('public methods', function () {
		describe('buildScopeTree', function () {
			var tree;
			beforeEach(function () {
				tree = new ScopeTree();
			});

			describe('to build a ScopeTree with PageScope only', function () {
				beforeEach(function () {
					var ast = esprima.parse(
						'var a = 0, b = 1;\n' +
						'++a;\n' +
						'b = a\n' +
						'console.log("a=" + a);\n' +
						'console.log("b=" + b);',
						{range: true, loc: true}
					);

					tree.buildScopeTree(ast);
				});

				it('should contain all the scopes', function () {
					tree._testonly_._scopes.length.should.eql(1);
					should.exist(tree._testonly_._root);
					tree._testonly_._root.should.eql(tree._testonly_._scopes[0]);
					tree._testonly_._mapFromNameToScope.size.should.eql(1);
					tree._testonly_._mapFromNameToScope.has('$PAGE_0').should.eql(true);
					tree._testonly_._mapFromRangeToScope.size.should.eql(1);
					tree._testonly_._mapFromRangeToScope.has('[0,74]').should.eql(true);
				});

				it('should set the tree structure well', function () {
					tree._testonly_._root._testonly_._children.length.should.eql(0);
					should.not.exist(tree._testonly_._root._testonly_._parent);
				});

				it('should not set local variables yet', function () {
					var pageScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0');
					pageScope._testonly_._vars.size.should.eql(0);
				});
			});

			describe('to build a ScopeTree with two level scopes', function () {
				beforeEach(function () {
					var ast = esprima.parse(
						'var a = 0;\n' +
						'function foo(x) {\n' +
						'a = x + 1;\n' +
						'}\n' +
						'foo(2);\n' +
						'function fun(x, y) {\n' +
						'a = x * y;\n' +
						'}\n' +
						'fun(3, 4);',
						{range: true, loc: true}
					);

					tree.buildScopeTree(ast);
				});

				it('should contain all scopes', function () {
					tree._testonly_._mapFromNameToScope.size.should.eql(3);
					tree._testonly_._mapFromNameToScope.has('$PAGE_0.foo').should.eql(true);
					tree._testonly_._mapFromNameToScope.has('$PAGE_0.fun').should.eql(true);
					tree._testonly_._mapFromRangeToScope.size.should.eql(3);
					tree._testonly_._mapFromRangeToScope.has('[11,41]').should.eql(true);
					tree._testonly_._mapFromRangeToScope.has('[50,83]').should.eql(true);
				});

				it('should set the tree structure well', function () {
					var pageScope = tree._testonly_._root;
					var fooScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0.foo');
					var funScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0.fun');

					(pageScope._testonly_._children.indexOf(fooScope) !== -1).should.eql(true);
					(pageScope._testonly_._children.indexOf(funScope) !== -1).should.eql(true);
					fooScope._testonly_._parent.should.eql(pageScope);
					funScope._testonly_._parent.should.eql(pageScope);
				});

				it('should not set the local variables yet', function () {
					var fooScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0.foo');
					var funScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0.fun');
					fooScope._testonly_._vars.size.should.eql(0);
					funScope._testonly_._vars.size.should.eql(0);
				});
			});

			describe('to build a ScopeTree with more than two level scopes', function () {
				beforeEach(function () {
					var ast = esprima.parse(
						'var a = 0;\n' +
						'function foo(x) {\n' +
							'a = x + 1;\n' +
						'}\n' +
						'foo(2);\n' +
						'function fun(x, y) {\n' +
							'a = x * y;\n' +
							'var c = function () {\n' +
								'console.log("a=" + a);\n' +
							'};\n' +
						'}\n' +
						'fun(3, 4);',
						{range: true, loc: true}
					);

					tree.buildScopeTree(ast);
				});

				it('should contain all the scopes', function () {
					tree._testonly_._mapFromNameToScope.size.should.eql(4);
					tree._testonly_._mapFromNameToScope.has('$PAGE_0.fun.$ANONYMOUS_FUN_0').should.eql(true);
					tree._testonly_._mapFromRangeToScope.size.should.eql(4);
					tree._testonly_._mapFromRangeToScope.has('[90,128]').should.eql(true);
				});

				it('should set the tree structure well', function () {
					var funScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0.fun');
					var anonymousScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0.fun.$ANONYMOUS_FUN_0');
					(funScope._testonly_._children.indexOf(anonymousScope) !== -1).should.eql(true);
					anonymousScope._testonly_._parent.should.eql(funScope);
				});

				it('should not set the local variables yet', function () {
					var anonymousScope = tree._testonly_._mapFromNameToScope.get('$PAGE_0.fun.$ANONYMOUS_FUN_0');
					anonymousScope._testonly_._vars.size.should.eql(0);
				});
			});
		});

		describe('getScopeByRange', function () {
			var tree;
			beforeEach(function () {
				var ast = esprima.parse(
					'var a = 0, b = 1;\n' +
					'++a;\n' +
					'b = a\n' +
					'console.log("a=" + a);\n' +
					'console.log("b=" + b);',
					{range: true, loc: true}
				);
				tree = new ScopeTree();
				tree.buildScopeTree(ast);
			});

			it('should support to get a Scope by its range value', function () {
				var scope = tree.getScopeByRange([0,74]);
				should.exist(scope);
				scope.should.eql(tree._testonly_._root);
			});

			it('should return null as the range value is invalid', function () {
				var scope = tree.getScopeByRange({start: 0, end: 74});
				should.not.exist(scope);
			});
		});

		describe('getScopeByName', function () {
			var tree;
			beforeEach(function () {
				var ast = esprima.parse(
					'var a = 0;\n' +
					'function foo(x) {\n' +
					'a = x + 1;\n' +
					'}\n' +
					'foo(2);\n' +
					'function fun(x, y) {\n' +
					'a = x * y;\n' +
					'}\n' +
					'fun(3, 4);',
					{range: true, loc: true}
				);
				tree = new ScopeTree();
				tree.buildScopeTree(ast);
			});

			it('should support to get a Scope by its name', function () {
				var pageScope = tree.getScopeByName('$PAGE_0');
				should.exist(pageScope);
				pageScope.should.eql(tree._testonly_._root);

				var fooScope = tree.getScopeByName('$PAGE_0.foo');
				should.exist(fooScope);
				fooScope.should.eql(tree._testonly_._mapFromNameToScope.get('$PAGE_0.foo'));
			});

			it('should return null as the name value is invalid', function () {
				should.not.exist(tree.getScopeByName('notExisted'));
				should.not.exist(tree.getScopeByName('!invalid'));
			});
		});

		describe('hasScope', function () {
			var tree;
			beforeEach(function () {
				var ast = esprima.parse(
					'var a = 0;\n' +
					'function foo(x) {\n' +
					'a = x + 1;\n' +
					'}\n' +
					'foo(2);\n' +
					'function fun(x, y) {\n' +
					'a = x * y;\n' +
					'}\n' +
					'fun(3, 4);',
					{range: true, loc: true}
				);
				tree = new ScopeTree();
				tree.buildScopeTree(ast);
			});

			it('should support to find a Scope by its reference', function () {
				var pageScope = tree._testonly_._root;
				tree.hasScope(pageScope).should.eql(true);
			});

			it('should support to find a Scope by its name', function () {
				tree.hasScope('$PAGE_0.foo').should.eql(true);
			});

			it('should support ot find a Scope by its range value', function () {
				tree.hasScope([50,83]).should.eql(true);
			});
		});

		describe('toString', function () {
			describe('to represent the ScopeTree by string', function () {
				it('should support to represent the tree containing page scope only', function () {
					var ast = esprima.parse(
						'var a = 0, b = 1;\n' +
						'++a;\n' +
						'b = a\n' +
						'console.log("a=" + a);\n' +
						'console.log("b=" + b);',
						{range: true, loc: true}
					);
					var tree = new ScopeTree();
					tree.buildScopeTree(ast);

					tree.toString().should.eql('+-$PAGE_0');
				});

				it('should support to represent the tree containing two level scopes', function () {
					var ast = esprima.parse(
						'var a = 0;\n' +
						'function foo(x) {\n' +
						'a = x + 1;\n' +
						'}\n' +
						'foo(2);\n' +
						'function fun(x, y) {\n' +
						'a = x * y;\n' +
						'}\n' +
						'fun(3, 4);',
						{range: true, loc: true}
					);
					var tree = new ScopeTree();
					tree.buildScopeTree(ast);

					tree.toString().should.eql(
						'+-$PAGE_0\n' +
						'  +-$PAGE_0.foo\n' +
						'  +-$PAGE_0.fun'
					);
				});

				it('should support to represent the tree containing more than two level scopes', function () {
					var ast = esprima.parse(
						'var a = 0;\n' +
						'function foo(x) {\n' +
						'a = x + 1;\n' +
						'}\n' +
						'foo(2);\n' +
						'function fun(x, y) {\n' +
						'a = x * y;\n' +
						'var c = function () {\n' +
						'console.log("a=" + a);\n' +
						'};\n' +
						'}\n' +
						'fun(3, 4);',
						{range: true, loc: true}
					);
					var tree = new ScopeTree();
					tree.buildScopeTree(ast);

					tree.toString().should.eql(
						'+-$PAGE_0\n' +
						'  +-$PAGE_0.foo\n' +
						'  +-$PAGE_0.fun\n' +
						'    +-$PAGE_0.fun.$ANONYMOUS_FUN_0'
					);
				});
			});
		});
	});

	describe('public data members', function () {
		describe('root', function () {
			var tree;
			beforeEach(function () {
				tree = new ScopeTree();
			});

			it('should be empty as default', function () {
				should.not.exist(tree.root);
			});

			it('should not be modified directly', function () {
				should(function () {
					tree.root = {};
				}).throw();
			});

			it('should be enumerable', function () {
				ScopeTree.prototype.propertyIsEnumerable('root').should.eql(true);
			});
		});
	});
});