/*
 * Test cases for testing analysis execution
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-06
 */
var should = require('should');
var fs = require('fs');
var jsParser = require('../../lib/dujs/jsparser'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl');

function createTest(dir, file, expected) {
	'use strict';
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = jsParser.parseAST(contents, {range: true, loc: true});

	describe('case: ' + file, function () {
		it('should have correct number of scopes', function () {
			scopeCtrl.addPageScopeTree(ast);
			scopeCtrl.pageScopeTrees[0].scopes.length.should.eql(expected.numOfScopes);
		});
	});
}

describe('Def-Use analysis execution', function () {
	"use strict";
	afterEach(function () {
		scopeCtrl.clear();
	});



	var dir = __dirname + '/cases/';
	var files = fs.readdirSync(dir);
	var numOfCases = 0;
	files.forEach(function (file) {
		if(/.js$/.test(file)){
			++numOfCases;
			var expected = JSON.parse(fs.readFileSync(dir + '/' + file + '.expected.json'));
			createTest(dir, file, expected);
		}
	});
});