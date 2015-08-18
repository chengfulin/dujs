/*
 * Test cases for AnonymousFunctionScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-30
 */
var should = require('should');
var AnonymousFunctionScope = require('../../lib/dujs/anonymousfunctionscope');

describe('AnonymousFunctionScope', function () {
	"use strict";
	var sampleFunctionExpressionAST;

	beforeEach(function () {
		AnonymousFunctionScope.numOfAnonymousFunctionScopes = 0;
		sampleFunctionExpressionAST = {
			type: 'FunctionExpression',
			range: [0,1],
			loc: {
				start: {line: 1, column: 0},
				end: {line: 1, column: 1}
			}
		};
	});

	describe('static data members', function () {
		describe('numOfAnonymousFunctionScopes', function () {
			it('should have correct default value', function () {
				AnonymousFunctionScope.numOfAnonymousFunctionScopes.should.eql(0);
			});

			it('should support to be modified', function () {
				AnonymousFunctionScope.numOfAnonymousFunctionScopes = 1;
				AnonymousFunctionScope.numOfAnonymousFunctionScopes.should.eql(1);
			});

			it('should be enumerable', function () {
				AnonymousFunctionScope.propertyIsEnumerable('numOfAnonymousFunctionScopes').should.eql(true);
			});
		});
	});

	describe('static methods', function () {
		describe('resetCounter', function () {
			it('should reset numOfAnonymousFunctionScopes well', function () {
				AnonymousFunctionScope.numOfAnonymousFunctionScopes = 1;
				AnonymousFunctionScope.resetCounter();
				AnonymousFunctionScope.numOfAnonymousFunctionScopes.should.eql(0);
			});
		});

		describe('validate', function () {
			var validAST;
			beforeEach(function () {
				validAST = sampleFunctionExpressionAST;
			});

			it('should not throw as the inputs are valid', function () {
				should(function () {
					AnonymousFunctionScope.validate(validAST, null);
				}).not.throw();
			});

			it('should throw an error as the AST is invalid', function () {
				should(function () {
					AnonymousFunctionScope.validate({
						type: 'Program',
						range: [0,1],
						loc: {
							start: {line: 1, column: 0},
							end: {line: 1, column: 1}
						}
					}, null);
				}).throw('Invalid value for an AnonymousFunctionScope');
			});

			it('should throw an error as the parent of the socpe is invalid', function () {
				should(function () {
					AnonymousFunctionScope.validate(validAST, {});
				}).throw('Invalid value for an AnonymousFunctionScope');
			});

			it('should support custom error message', function () {
				should(function () {
					AnonymousFunctionScope.validate({}, null, 'Custom error');
				}).throw('Custom error');
			});
		});
	});

	describe('constructor', function () {
		it('should increase the property "numOfAnonymousFunctionScope" and "index"', function () {
			var ast = sampleFunctionExpressionAST;
			var scope = new AnonymousFunctionScope(ast, null);
			scope._testonly_._index.should.eql(0);
			AnonymousFunctionScope.numOfAnonymousFunctionScopes.should.eql(1);

			var scope2 = new AnonymousFunctionScope(ast, null);
			scope2._testonly_._index.should.eql(1);
			AnonymousFunctionScope.numOfAnonymousFunctionScopes.should.eql(2);
		});
	});

	describe('public data member', function () {
		describe('index', function () {
			var ast, scope;

			beforeEach(function () {
				ast = sampleFunctionExpressionAST;
				scope = new AnonymousFunctionScope(ast, null);
			});

			it('should retrieve the value correctly', function () {
				scope.index.should.eql(0);
			});

			it('should not be modified', function () {
				should(function () {
					scope.index = 1;
				}).throw();
			});

			it('should be enumerable', function () {
				AnonymousFunctionScope.prototype.propertyIsEnumerable('index').should.eql(true);
			});
		});
	});
});