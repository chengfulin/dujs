/*
 * Test cases for PageScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-04
 */
var should = require('should');
var PageScope = require('../../lib/dujs/pagescope');

describe('PageScope', function () {
	"use strict";
	var sampleProgramAST;

	beforeEach(function () {
		PageScope.numOfPageScopes = 0;
		sampleProgramAST = {
			type: 'Program',
			range: [0,1],
			loc: {
				start: {line: 1, column: 0},
				end: {line: 1, column: 1}
			}
		};
	});

	describe('static data members', function () {
		describe('numOfPageScopes', function () {
			it('should have correct default value', function () {
				PageScope.numOfPageScopes.should.eql(0);
			});

			it('should support to be modified directly', function () {
				PageScope.numOfPageScopes = 1;
				PageScope.numOfPageScopes.should.eql(1);
			});

			it('should be enumerable', function () {
				PageScope.propertyIsEnumerable('numOfPageScopes').should.eql(true);
			});
		});
	});

	describe('static methods', function () {
		describe('resetCounter', function () {
			it('should reset numOfPageScopes well', function () {
				PageScope.numOfPageScopes = 1;
				PageScope.resetCounter();
				PageScope.numOfPageScopes.should.eql(0);
			});
		});

		describe('validate', function () {
			it('should not throw errors as the input is valid', function () {
				should(function () {
					PageScope.validate(sampleProgramAST);
				}).not.throw();
			});

			it('should throw an error as the AST is invalid', function () {
				should(function () {
					PageScope.validate({
						type: 'FunctionDeclaration',
						range: [0,1],
						loc: {
							start: {line: 1, column: 0},
							end: {line: 1, column: 1}
						}
					});
				}).throw('Invalid value for a PageScope');
			});
		});
	});

	describe('public data members', function () {
		var scope;
		beforeEach(function () {
			scope = new PageScope(sampleProgramAST);
		});

		describe('index', function () {
			it('should support to retrieve the value', function () {
				scope.index.should.eql(0);
			});

			it('should not be modified directly', function () {
				should(function () {
					scope.index = 1;
				}).throw();
			});

			it('should be enumerable', function () {
				PageScope.prototype.propertyIsEnumerable('index').should.eql(true);
			});
		});

		describe('buildInObjects', function () {
			it('should have correct values', function () {
				scope.builtInObjects.length.should.eql(11);
				scope.builtInObjects.should.containDeep([
					{name: "window", def: "htmlDom"},
					{name: "document", def: "htmlDom"},
					{name: "String", def: "object"},
					{name: "Number", def: "object"},
					{name: "Boolean", def: "object"},
					{name: "Array", def: "object"},
					{name: "Map", def: "object"},
					{name: "WeakMap", def: "object"},
					{name: "Set", def: "object"},
					{name: "Date", def: "object"},
					{name: "console", def: "object"}
				]);
			});
		});
	});

	describe('constructor', function () {
		it('should construct with index and indexed name', function () {
			var page1 = new PageScope(sampleProgramAST, null);
			page1._testonly_._index.should.eql(0);
			page1.name.should.eql('$PAGE_0');

			var page2 = new PageScope(sampleProgramAST, null);
			page2._testonly_._index.should.eql(1);
			page2.name.should.eql('$PAGE_1');
		});
	});
});