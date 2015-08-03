/*
 * Test cases for ScopeTree module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-03
 */
var should = require('should');
var ScopeTree = require('../../lib/dujs/scopetree'),
	factoryScope = require('../../lib/dujs/scopefactory'),
	factoryRange = require('../../lib/dujs/rangefactory');

describe('ScopeTree', function () {
	"use strict";

	describe('public methods', function () {
		describe('addScope', function () {
			it('should add a scope into the scope tree with specified range', function () {
				var tree = new ScopeTree(),
					scope = factoryScope.createFunctionScope({type: 'FunctionDeclaration', range: [0,10], loc: {line: 1, col: 0}}, 'foo'),
					range = factoryRange.create([0,10]);

				tree.addScope(scope, range);
				tree._testonly_._scopes.length.should.eql(1);
				tree._testonly_._mapFromNameToScope.has('foo').should.eql(true);
				tree._testonly_._mapFromRangeToScope.has('[0,10]').should.eql(true);
				scope.range.should.eql(range);
			});
		});
	});
});