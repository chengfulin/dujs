/*
 * Test cases for nested functions: scope tree structure, named function
 * definitions inside functions, and function declarations inside function
 * expressions
 */
require('should');
var analyze = require('../helpers/analyze');

describe('Nested functions', function () {
	'use strict';
	after(analyze.reset);

	it('should put sibling function expressions of one statement under the same parent', function () {
		var result = analyze([
			'foo(function () {',
			'  a();',
			'}, function () {',
			'  b();',
			'});'
		].join('\n'));
		result.scopeTree.root.children.map(String).should.eql([
			'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0',
			'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1'
		]);
	});

	it('should define a function declared inside a function at the entry of that function', function () {
		var result = analyze([
			'function outer() {',
			'  function inner() {',
			'    return 1;',
			'  }',
			'  inner();',
			'}'
		].join('\n'));
		result.intraProcedural('$DOMAIN.$PAGE_0.outer').should.containEql('inner: entry -> L5');
		/// only call statements are call sites so far (not calls in return/assignment)
		result.interProceduralScopes().should.containDeep([
			['$DOMAIN.$PAGE_0.outer', '$DOMAIN.$PAGE_0.outer.inner']
		]);
	});

	it('should not add a function declared inside a function expression to the outer scope', function () {
		var result = analyze([
			'var h = function () {',
			'  function g() {}',
			'};'
		].join('\n'));
		var page = result.scopeTree.root,
			anonymous = page.children[0];
		/// the scope name APIs were removed by feature 006: the Vars registered in the scopes
		page.variables.some(function (variable) {
			return variable.name === 'g';
		}).should.eql(false);
		anonymous.variables.some(function (variable) {
			return variable.name === 'g' && variable.binding.kind === 'function';
		}).should.eql(true);
	});
});
