/**
 * From the repository: esgraph
 * @license LGPLv3
 * @author Swatinem (arpad.borsos@googlemail.com)
 */
var esgraph = require('../../lib/esgraph');
var esprima = require('esprima');
var fs = require('fs');
var should = require('should');
var FlowNode = require('../../lib/esgraph/flownode');

function createTest(dir, file) {
	'use strict';
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true, range: true});
	var comments = ast.comments;
	delete ast.comments;
	it(comments[0].value.trim() + ' (' + file + ')', function () {
		if (ast.body[0].type === 'FunctionDeclaration') {
			ast = ast.body[0].body;
		}
		var cfg = esgraph(ast);
		var expected = comments[1].value.trim();
		var actual = esgraph.dot(cfg, {source: contents}).trim();
		if (actual !== expected) {
			console.log(actual);
		}
		actual.should.eql(expected);
	});
}

describe('esgraph', function () {
	'use strict';
	var dir = __dirname + '/tests/';
	var files = fs.readdirSync(dir);
	files.forEach(function (file) {
		if(/.js$/.test(file)){
			createTest(dir, file);
		}
	});

	it('should handle long graphs', function () {
		var source = Array(1e4).join('stmt;');
		var ast = esprima.parse(source);
		var cfg = esgraph(ast);
		esgraph.dot(cfg);
	});
});

describe('esgraph.dot', function () {
	'use strict';
	it('should number the nodes starting at `counter`', function () {
		var out = esgraph.dot(esgraph(esprima.parse('var a;')), {counter: 10});
		out.should.not.containEql('n0');
		out.should.containEql('n10');
	});
});
