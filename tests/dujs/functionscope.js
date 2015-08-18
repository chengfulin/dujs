/*
 * Test cases for FunctionScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-03
 */
var should = require('should');
var FunctionScope = require('../../lib/dujs/functionscope'),
	Scope = require('../../lib/dujs/scope');

describe('FunctionScope', function () {
	"use strict";
	describe('static methods', function () {
		describe('isValidName', function () {
			it('should return true as the input is valid', function () {
				FunctionScope.isValidName('abc123').should.eql(true);
				FunctionScope.isValidName('_abc123').should.eql(true);
				FunctionScope.isValidName('abc_123').should.eql(true);
				FunctionScope.isValidName('abc123_').should.eql(true);
				FunctionScope.isValidName('a1_b2_c3').should.eql(true);
			});

			it('should return false as the input contains special symbols', function () {
				FunctionScope.isValidName('!valid').should.eql(false);
				FunctionScope.isValidName('a.b.c').should.eql(false);
				FunctionScope.isValidName('$DOMAIN').should.eql(false);
			});

			it('should return false as the input is leading with numbers', function () {
				FunctionScope.isValidName('123abc').should.eql(false);
				FunctionScope.isValidName('123_abc').should.eql(false);
				FunctionScope.isValidName('123abc_').should.eql(false);
			});
		});

		var sampleFunctionDeclarationAST;
		beforeEach(function () {
			sampleFunctionDeclarationAST = {
				type: 'FunctionDeclaration',
				range: [0,1],
				loc: {
					start: {line: 1, column: 0},
					end: {line: 1, column: 1}
				}
			};
		});

		describe('validate', function () {
			it('should not throw any error as the inputs are valid', function () {
				var ast = sampleFunctionDeclarationAST;
				should(function () {
					FunctionScope.validate(ast, 'foo', null);
				}).not.throw();
			});

			it('should throw an error as the ast is not for a function scope', function () {
				var ast = {
					type: 'FunctionExpression',
					range: [0,1],
					loc: {
						start: {line: 1, column: 0},
						end: {line: 1, column: 1}
					}
				};
				should(function () {
					FunctionScope.validate(ast, 'foo', null);
				}).throw('Invalid value for a FunctionScope');
			});

			it('should throw an error as the name is invalid', function () {
				var ast = sampleFunctionDeclarationAST;
				should(function () {
					FunctionScope.validate(ast, 'invalid!', null);
				}).throw('Invalid value for a FunctionScope');
			});

			it('should throw an error as the parent is invalid', function () {
				var ast = sampleFunctionDeclarationAST;
				should(function () {
					FunctionScope.validate(ast, 'foo', {});
				}).throw('Invalid value for a FunctionScope');
			});

			it('should support custom error', function () {
				should(function () {
					FunctionScope.validate({}, 'foo', null, 'Custom error');
				}).throw('Custom error');
			});
		});

		describe('constructor', function () {
			it('should construct well', function () {
				var ast = sampleFunctionDeclarationAST;
				var scope = new FunctionScope(ast, 'foo', null);
				(scope instanceof FunctionScope).should.eql(true);
				(scope instanceof Scope).should.eql(true);
			});
		});
	});
});
