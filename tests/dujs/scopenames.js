/*
 * Test cases for unique scope names of same-named sibling scopes
 * (specs/001-fix-known-issues, User Story 6, FR-011)
 *
 * Under the same parent scope, the first scope keeps its name and the later
 * ones get the suffixes _1, _2... in source order, skipping the names already
 * used by siblings.
 */
require('should');
var analyze = require('../helpers/analyze');

var PAGE = '$DOMAIN.$PAGE_0';

describe('Unique scope names', function () {
	'use strict';
	after(analyze.reset);

	// US6-1: the two same-named functions of KI §8 get unique names and can be looked up
	it('US6-1 should name same-named functions in blocks f and f_1', function () {
		var result = analyze([
			'if (a) {',
			'  function f() {}',
			'} else {',
			'  function f() {}',
			'}'
		].join('\n'));
		result.scopeNames().should.eql([PAGE, PAGE + '.f', PAGE + '.f_1']);
		var first = result.scopeTree.getScopeByName('$PAGE_0.f'),
			second = result.scopeTree.getScopeByName('$PAGE_0.f_1');
		(!!first).should.eql(true);
		(!!second).should.eql(true);
		(first === second).should.eql(false);
		first.range.toString().should.not.eql(second.range.toString());
		second.ast.loc.start.line.should.eql(4);
	});

	// US6-2: three same-named functions are named in source order
	it('US6-2 should name three same-named functions f, f_1 and f_2', function () {
		var result = analyze([
			'{',
			'  function f() {}',
			'}',
			'{',
			'  function f() {}',
			'}',
			'{',
			'  function f() {}',
			'}'
		].join('\n'));
		result.scopeNames().should.eql([PAGE, PAGE + '.f', PAGE + '.f_1', PAGE + '.f_2']);
		result.scopeTree.getScopeByName('$PAGE_0.f_2').ast.loc.start.line.should.eql(8);
	});

	// US6-3: names without duplicates are unchanged
	it('US6-3 should keep the names when there is no duplicate', function () {
		var result = analyze([
			'function f() {',
			'  function g() {}',
			'}',
			'function g() {}',
			'var h = function () {};'
		].join('\n'));
		result.scopeNames().should.eql([PAGE, PAGE + '.f', PAGE + '.f.g', PAGE + '.g', PAGE + '.$ANONYMOUS_FUN_0']);
	});

	// US6-4: an existing f_1 is skipped by the suffix of the second f
	it('US6-4 should skip a name already used in source', function () {
		var result = analyze([
			'function f_1() {}',
			'{',
			'  function f() {}',
			'}',
			'{',
			'  function f() {}',
			'}'
		].join('\n'));
		var names = result.scopeNames();
		names.should.eql([PAGE, PAGE + '.f_1', PAGE + '.f', PAGE + '.f_2']);
		result.scopeTree.getScopeByName('$PAGE_0.f_1').ast.loc.start.line.should.eql(1);
		result.scopeTree.getScopeByName('$PAGE_0.f_2').ast.loc.start.line.should.eql(6);
	});

	// US6-5: a function in a block with let/const has the block scope as parent
	it('US6-5 should name a function in a lexical block under the block scope', function () {
		var result = analyze([
			'{',
			'  let x = 1;',
			'  function f() {}',
			'}',
			'function f() {}'
		].join('\n'));
		var blockScope = result.scopeTree.blockScopes[0];
		blockScope.name.should.eql(PAGE + '.$BLOCK_0');
		blockScope.children.map(String).should.eql([PAGE + '.$BLOCK_0.f']);
		result.scopeTree.root.children.map(String).should.eql([PAGE + '.$BLOCK_0', PAGE + '.f']);
	});

	// US6-5 (cont.): same-named functions under the same block scope get suffixes
	it('US6-5 should suffix same-named functions under the same block scope', function () {
		var result = analyze([
			'{',
			'  const x = 1;',
			'  if (x) {',
			'    function f() {}',
			'  } else {',
			'    function f() {}',
			'  }',
			'}'
		].join('\n'));
		result.scopeTree.blockScopes[0].children.map(String)
			.should.eql([PAGE + '.$BLOCK_0.f', PAGE + '.$BLOCK_0.f_1']);
	});

	// the descendants of a renamed scope follow its new name
	it('should name the descendants of a renamed scope after its new name', function () {
		var result = analyze([
			'if (a) {',
			'  function f() {',
			'    function g() {}',
			'  }',
			'} else {',
			'  function f() {',
			'    function g() {}',
			'  }',
			'}'
		].join('\n'));
		result.scopeNames().should.containDeep([PAGE + '.f.g', PAGE + '.f_1.g']);
		var first = result.scopeTree.getScopeByName('$PAGE_0.f.g'),
			second = result.scopeTree.getScopeByName('$PAGE_0.f_1.g');
		(!!first).should.eql(true);
		(!!second).should.eql(true);
		(first === second).should.eql(false);
	});
});
