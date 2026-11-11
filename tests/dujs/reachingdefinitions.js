/*
 * Test cases for reaching definitions: a definition must be killed by a later
 * definition of the same variable on every path
 */
require('should');
var analyze = require('../helpers/analyze');

function pairsOf(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

describe('Reaching definitions', function () {
	'use strict';
	after(analyze.reset);

	it('should kill an earlier definition by a later assignment', function () {
		var result = analyze([
			'var a = 1;',
			'a = 2;',
			'console.log(a);'
		].join('\n'));
		pairsOf(result.intraProcedural(), 'a').should.eql(['a: L2 -> L3']);
	});

	it('should kill the initial undefined definition of a declared variable', function () {
		var result = analyze([
			'function f() {',
			'  var b = 1;',
			'  return b;',
			'}'
		].join('\n'));
		pairsOf(result.intraProcedural('$DOMAIN.$PAGE_0.f'), 'b').should.eql(['b: L2 -> L3']);
	});

	it('should keep definitions from both branches and kill the one before the branch', function () {
		var result = analyze([
			'function f(v) {',
			'  var r = 0;',
			'  if (v > 1) {',
			'    r = 1;',
			'  } else {',
			'    r = 2;',
			'  }',
			'  return r;',
			'}'
		].join('\n'));
		pairsOf(result.intraProcedural('$DOMAIN.$PAGE_0.f'), 'r').should.eql([
			'r: L4 -> L8',
			'r: L6 -> L8'
		]);
	});

	it('should keep a definition that is redefined on only one branch', function () {
		var result = analyze([
			'function f(v) {',
			'  var r = 0;',
			'  if (v > 1) {',
			'    r = 1;',
			'  }',
			'  return r;',
			'}'
		].join('\n'));
		pairsOf(result.intraProcedural('$DOMAIN.$PAGE_0.f'), 'r').should.eql([
			'r: L2 -> L6',
			'r: L4 -> L6'
		]);
	});

	it('should let a loop-carried definition reach the loop body', function () {
		var result = analyze([
			'function f() {',
			'  var s = 0;',
			'  while (s < 3) {',
			'    s = s + 1;',
			'  }',
			'  return s;',
			'}'
		].join('\n'));
		var pairs = pairsOf(result.intraProcedural('$DOMAIN.$PAGE_0.f'), 's');
		pairs.should.containDeep(['s: L2 -> L4', 's: L4 -> L4', 's: L2 -> L6', 's: L4 -> L6']);
		pairs.should.not.containEql('s: entry -> L4');
		pairs.should.not.containEql('s: entry -> L6');
	});

	it('should define the for-in variable at the loop node without analyzing the body there', function () {
		var result = analyze([
			'function g(o) {',
			'  var k, n = 0;',
			'  for (k in o) {',
			'    n = n + 1;',
			'  }',
			'  return n;',
			'}'
		].join('\n'));
		result.intraProcedural('$DOMAIN.$PAGE_0.g').should.eql([
			'n: L2 -> L4',
			'n: L2 -> L6',
			'n: L4 -> L4',
			'n: L4 -> L6',
			'o: entry -> L3'
		]);
	});

	it('should pair the for-in variable defined at the loop node with its uses in the body', function () {
		var result = analyze([
			'function h(o) {',
			'  for (var k in o) {',
			'    console.log(k);',
			'  }',
			'}'
		].join('\n'));
		result.intraProcedural('$DOMAIN.$PAGE_0.h').should.containEql('k: L2 -> L3');
	});
});
