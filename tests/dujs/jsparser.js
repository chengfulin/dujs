/*
 * Test cases for JSParser module
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-19
 */
var should = require('should');
var parser = require('../../lib/dujs/jsparser');

describe('JSParser', function () {
	"use strict";
	describe('public methods', function () {
		describe('parseAST', function () {
			it('should support parsing without custom option object', function () {
				var ast = parser.parseAST('var a, b;');
				should.exist(ast.range);
				(ast.range instanceof Array).should.eql(true);
				should.exist(ast.loc);
				should.exist(ast.loc.start);
				(typeof ast.loc.start.line).should.eql('number');
				(typeof ast.loc.start.column).should.eql('number');
				should.exist(ast.loc.end);
				(typeof ast.loc.end.line).should.eql('number');
				(typeof ast.loc.end.column).should.eql('number');
			});

			it('should support parsing with custom option object and adding default options', function () {
				var option1 = {loc: true};
				var option2 = {range: true};
				var option3 = {range: false, loc: false};

				var sampleCode = 'var a, b;';
				var ast1 = parser.parseAST(sampleCode, option1);
				should.exist(ast1.range);

				var ast2 = parser.parseAST(sampleCode, option2);
				should.exist(ast2.loc);

				var ast3 = parser.parseAST(sampleCode, option3);
				should.exist(ast3.range);
				should.exist(ast3.loc);
			});
		});
	});
});
