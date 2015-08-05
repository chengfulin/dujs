/*
 * Test cases for ScopeCtrl module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
var should = require('should'),
	esprima = require('esprima');
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	PageScope = require('../../lib/dujs/pagescope');

describe('ScopeCtrl', function () {
	"use strict";
	describe('constructor', function () {
		it('should have domain scope', function () {
			should.exist(scopeCtrl._testonly_._domainScope);
			scopeCtrl._testonly_._domainScope._testonly_._type.should.eql('domain');
			scopeCtrl._testonly_._domainScope._testonly_._name.should.eql('$DOMAIN');
		});

		it('should not have any scope tree yet', function () {
			scopeCtrl._testonly_._pageScopeTrees.length.should.eql(0);
		});
	});

	describe('public methods', function () {
		beforeEach(function () {
			scopeCtrl._testonly_._pageScopeTrees = [];
			PageScope.numOfPageScopes = 0;
		});

		describe('addPageScopeTree', function () {
			it('should support to add a ScopeTree of a page with its AST well', function () {
				var ast = esprima.parse(
					'var a = 0, b = 1;',
					{range: true, loc: true}
				);
				scopeCtrl.addPageScopeTree(ast);
				scopeCtrl._testonly_._pageScopeTrees.length.should.eql(1);
				scopeCtrl._testonly_._pageScopeTrees[0]._testonly_._root._testonly_._name.should.eql('$PAGE_0');

				scopeCtrl.addPageScopeTree(ast);
				scopeCtrl._testonly_._pageScopeTrees.length.should.eql(2);
				scopeCtrl._testonly_._pageScopeTrees[1]._testonly_._root._testonly_._name.should.eql('$PAGE_1');
			});

			it('should throw an error as the ast is invalid', function () {
				var ast = {type: 'Program', range: true, loc: {line: 1, col: 0}};
				should(function () {
					scopeCtrl.addPageScopeTree(ast);
				}).throw();
			});
		});
	});

	describe('public data members', function () {
		describe('pageScopeTrees', function () {
			it('should support to retrieve the value', function () {
				scopeCtrl.pageScopeTrees.length.should.eql(0);

				var ast = esprima.parse(
					'var a = 0, b = 1;',
					{range: true, loc: true}
				);

				scopeCtrl.addPageScopeTree(ast);
				scopeCtrl.pageScopeTrees.length.should.eql(1);
			});

			it('should not be modified directly', function () {
				should(function () {
					scopeCtrl.pageScopeTrees = null;
				}).throw();
			});
		});

		describe('domainScope', function () {
			it('should support to retireve the value', function () {
				scopeCtrl.domainScope.should.eql(scopeCtrl._testonly_._domainScope);
			});

			it('should not be modified directly', function () {
				should(function () {
					scopeCtrl.domainScope = null;
				}).throw();
			});
		});
	});
});