/*
 * Test cases for ASTValidator module
 * @lastmodifedBy ChengFuLin
 * @lastmodifiedDate 2015-08-17
 */
var should = require('should');
var validatorAST = require('../../lib/dujs/astvalidator');

describe('ASTValidator', function () {
	"use strict";
	describe('public data members', function () {
		describe('DEFAULT_OPTION_OBJECT', function () {
			it('should have correct value', function () {
				(typeof validatorAST.DEFAULT_OPTION_OBJECT).should.eql('object');
				should.exist(validatorAST.DEFAULT_OPTION_OBJECT.range);
				validatorAST.DEFAULT_OPTION_OBJECT.range.should.eql(true);
				should.exist(validatorAST.DEFAULT_OPTION_OBJECT.loc);
				validatorAST.DEFAULT_OPTION_OBJECT.loc.should.eql(true);
			});
		});
	});

	describe('public methods', function () {
		var sampleProgramAST, sampleFunctionDeclarationAST, sampleFunctionExpressionAST, sampleBlockStatementAST;

		beforeEach(function () {
			sampleProgramAST = {
				type: 'Program',
				range: [0,1],
				loc: {
					start: {line: 1, column: 0},
					end: {line: 1, column: 1}
				}
			};
			sampleFunctionDeclarationAST = {
				type: 'FunctionDeclaration',
				range: [0,1],
				loc: {
					start: {line: 1, column: 0},
					end: {line: 1, column: 1}
				}
			};
			sampleFunctionExpressionAST = {
				type: 'FunctionExpression',
				range: [0,1],
				loc: {
					start: {line: 1, column: 0},
					end: {line: 1, column: 1}
				}
			};
			sampleBlockStatementAST = {
				type: 'BlockStatement',
				range: [2,11],
				loc: {
					start: {line: 2, column: 0},
					end: {line: 3, column: 9}
				}
			};
		});

		describe('checkRangeProperty', function () {
			it('should support to check the range property of an AST node', function () {
				var node = {type: 'Program', range: [0,1]};
				validatorAST.checkRangeProperty(node).should.eql(true);
			});

			it('should return false as the value has invalid size of an array', function () {
				var node = {type: 'Program', range: [0,1,2]};
				validatorAST.checkRangeProperty(node).should.eql(false);
			});

			it('should return false as the value is not an array', function () {
				var node = {type: 'Program', range: {0: 0, 1: 1}};
				validatorAST.checkRangeProperty(node).should.eql(false);
			});

			it('should return false as the elements of the array are not numbers', function () {
				var range = ['0', '1'];
				var node = {type: 'Program', range: range};
				validatorAST.checkRangeProperty(node).should.eql(false);
				range[0] = 0;
				validatorAST.checkRangeProperty(node).should.eql(false);
				range[0] = '0';
				range[1] = 1;
				validatorAST.checkRangeProperty(node).should.eql(false);
			});

			it('should return false as the input or the range property are empty', function () {
				validatorAST.checkRangeProperty(null).should.eql(false);
				validatorAST.checkRangeProperty({type: 'Program'}).should.eql(false);
			});
		});

		describe('checkLocProperty', function () {
			it('should support to check the loc object', function () {
				var node = sampleProgramAST;
				validatorAST.checkLocProperty(node).should.eql(true);
			});

			it('should return false as start and end members to be empty or not an object', function () {
				var loc = {start: null, end: null};
				var node = {type: 'Program', loc: loc};
				validatorAST.checkLocProperty(node).should.eql(false);
				loc.start = [1,0];
				validatorAST.checkLocProperty(node).should.eql(false);
				loc.start = {line: 1, column: 0};
				loc.end = [1,1];
				validatorAST.checkLocProperty(node).should.eql(false);
			});

			it('should return false as lines and columns of the loc are not numbers', function () {
				var loc = {
					start: {line: '1', column: '0'},
					end: {line: '1', column: '1'}
				};
				var node = {type: 'Program', loc: loc};
				validatorAST.checkLocProperty(node).should.eql(false);
				loc.start.line = 1;
				validatorAST.checkLocProperty(node).should.eql(false);
				loc.start.line = '1';
				loc.start.col = 0;
				validatorAST.checkLocProperty(node).should.eql(false);
				loc.start.col = '0';
				loc.end.line = 1;
				validatorAST.checkLocProperty(node).should.eql(false);
				loc.end.line = '1';
				loc.end.col = 1;
				validatorAST.checkLocProperty(node).should.eql(false);
			});

			it('should return false as the input or the loc property are empty', function () {
				validatorAST.checkLocProperty(null).should.eql(false);
				validatorAST.checkLocProperty({type: 'Program'}).should.eql(false);
			});
		});

		describe('check', function () {
			it('should support to check the default format of AST node', function () {
				var validNode = sampleProgramAST;
				validatorAST.check(validNode).should.eql(true);
				var missingLocNode = {type: 'Program', range: [0,1]};
				validatorAST.check(missingLocNode).should.eql(false);
				var missingRangeNode = {type: 'Program', loc: {start: {line: 1, column: 0}}, end: {line: 1, column: 1}};
				validatorAST.check(missingRangeNode).should.eql(false);
			});

			it('should support to add a custom option object', function () {
				var option = {range: false, loc: false};
				var validNode = {type: 'Program'};
				validatorAST.check(validNode, option).should.eql(true);
			});
		});

		describe('validate', function () {
			it('should not throw an exception as the input is valid', function () {
				var validNode = sampleProgramAST;
				should(function () {
					validatorAST.validate(validNode);
				}).not.throw();
			});

			it('should throw an exception as the input is invalid', function () {
				var invalidNode = {type: 'Program'};
				should(function () {
					validatorAST.validate(invalidNode);
				}).throw('Not an AST node');
			});

			it('should support to throw custom error', function () {
				var invalidNode = {type: 'Program'};
				should(function () {
					validatorAST.validate(invalidNode, null, 'Custom error');
				}).throw('Custom error');
			});
		});

		describe('isPageAST', function () {
			it('should support to check the AST node for the root of a page', function () {
				var  node = sampleProgramAST;
				validatorAST.isPageAST(node).should.eql(true);
			});

			it('should return false as the AST node is not the type of the root of a page', function () {
				var node = sampleBlockStatementAST;
				validatorAST.isPageAST(node).should.eql(false);
			});
		});

		describe('isFunctionAST', function () {
			it('should support to check the AST node for the root of a function', function () {
				var  node = sampleFunctionDeclarationAST;
				validatorAST.isFunctionAST(node).should.eql(true);
			});

			it('should return false as the AST node is not the type of the root of a function', function () {
				var node = sampleBlockStatementAST;
				validatorAST.isFunctionAST(node).should.eql(false);
			});
		});

		describe('isAnonymousFunctionAST', function () {
			it('should support to check the AST node for the root of an anonymous function', function () {
				var  node = sampleFunctionExpressionAST;
				validatorAST.isAnonymousFunctionAST(node).should.eql(true);
			});

			it('should return false as the AST node is not the type of the root of an anonymous function', function () {
				var node = sampleBlockStatementAST;
				validatorAST.isAnonymousFunctionAST(node).should.eql(false);
			});
		});

		describe('validatePageAST', function () {
			it('should not throw as the AST node is valid for a root of a page', function () {
				var  node = sampleProgramAST;
				should(function () {
					validatorAST.validatePageAST(node);
				}).not.throw();
			});

			it('should throw as the AST node is not a root of a page', function () {
				var node = sampleBlockStatementAST;
				should(function () {
					validatorAST.validatePageAST(node);
				}).throw('Not an AST of a page scope');
			});
		});

		describe('validateFunctionAST', function () {
			it('should not throw as the AST node is valid for a root of a function', function () {
				var  node = sampleFunctionDeclarationAST;
				should(function () {
					validatorAST.validateFunctionAST(node);
				}).not.throw();
			});

			it('should throw as the AST node is not a root of a function', function () {
				var node = sampleBlockStatementAST;
				should(function () {
					validatorAST.validateFunctionAST(node);
				}).throw('Not an AST of a function scope');
			});
		});

		describe('validateAnonymousFunctionAST', function () {
			it('should not throw as the AST node is valid for a root of an anonymous function', function () {
				var  node = sampleFunctionExpressionAST;
				should(function () {
					validatorAST.validateAnonymousFunctionAST(node);
				}).not.throw();
			});

			it('should throw as the AST node is not a root of an anonymous function', function () {
				var node = sampleBlockStatementAST;
				should(function () {
					validatorAST.validateAnonymousFunctionAST(node);
				}).throw('Not an AST of an anonymous function scope');
			});
		});
	});
});
