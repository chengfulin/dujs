/*
 * Test cases for chained assignments
 * (specs/001-fix-known-issues, User Story 4, FR-007)
 *
 * The chained logical assignment `a ||= b ||= 1` is scenario 14 of User
 * Story 5 and is tested with it.
 */
require('should');
var analyze = require('../helpers/analyze');

function pairsOf(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

describe('Chained assignments', function () {
	'use strict';
	after(analyze.reset);

	// US4-1: the inner target of a simple chained assignment is not used
	it('US4-1 should not use the inner target of a chained assignment', function () {
		var pairs = analyze([
			'var a, b;',
			'a = b = 1;',
			'console.log(a);'
		].join('\n')).intraProcedural();
		pairs.should.not.containEql('b: L1 -> L2');
		pairs.should.containEql('a: L2 -> L3');
	});

	// US4-2: the inner targets of a chained declarator initializer are not used
	it('US4-2 should not use the inner targets of a chained initializer', function () {
		var pairs = analyze([
			'var a, b;',
			'var c = a = b = 1;',
			'console.log(a, b);'
		].join('\n')).intraProcedural();
		pairs.should.not.containEql('a: L1 -> L2');
		pairs.should.not.containEql('b: L1 -> L2');
		pairs.should.containDeep(['a: L2 -> L3', 'b: L2 -> L3']);
	});

	// US4-3: an inner compound assignment still reads its target
	it('US4-3 should use the inner target of a compound assignment', function () {
		var pairs = analyze([
			'var a, b = 1;',
			'a = b += 1;',
			'console.log(a, b);'
		].join('\n')).intraProcedural();
		pairs.should.containDeep(['b: L1 -> L2', 'a: L2 -> L3', 'b: L2 -> L3']);
	});

	// an outer compound assignment still reads its target, the inner simple
	// target is not used
	it('should use the outer target of a compound chained assignment', function () {
		var pairs = analyze([
			'var a = 1, b;',
			'a += b = 1;',
			'console.log(a, b);'
		].join('\n')).intraProcedural();
		pairsOf(pairs, 'a').should.containEql('a: L1 -> L2');
		pairsOf(pairs, 'b').should.not.containEql('b: L1 -> L2');
		pairs.should.containDeep(['a: L2 -> L3', 'b: L2 -> L3']);
	});
});
