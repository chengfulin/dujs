/*
 * Test cases for the arguments of new expressions and the parameters with
 * default values
 * (specs/001-fix-known-issues, User Story 2, FR-004 and FR-005)
 *
 * Scenario 8 of User Story 2 depends on User Story 5 and is tested with it.
 */
require('should');
var analyze = require('../helpers/analyze');

var PAGE = '$DOMAIN.$PAGE_0',
	ANONYMOUS = PAGE + '.$ANONYMOUS_FUN_';

function pairsOf(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

function scopeNamed(result, scopeName) {
	'use strict';
	var found = null;
	result.scopeTree.scopes.forEach(function (scope) {
		if (scope.name === scopeName) {
			found = scope;
		}
	});
	(!!found).should.eql(true);
	return found;
}

describe('Arguments of new and parameters with default values', function () {
	'use strict';
	after(analyze.reset);

	describe('new expressions (FR-004)', function () {
		// US2-1: arguments of new are used, also inside throw
		it('US2-1 should use the arguments of new', function () {
			var result = analyze([
				'var a = 1;',
				'var o = new X(a);',
				'throw new Error(a);'
			].join('\n'));
			result.intraProcedural().should.containDeep(['a: L1 -> L2', 'a: L1 -> L3']);
		});

		// US2-2: spread arguments of new are used
		it('US2-2 should use the spread arguments of new', function () {
			var result = analyze([
				'var a = [1];',
				'var o = new X(...a);'
			].join('\n'));
			result.intraProcedural().should.containDeep(['a: L1 -> L2']);
		});

		// the callee of new is still used
		it('should still use the callee of new', function () {
			var result = analyze([
				'var X = function () {};',
				'var o = new X();'
			].join('\n'));
			result.intraProcedural().should.containDeep(['X: L1 -> L2']);
		});
	});

	describe('parameters with default values (FR-005)', function () {
		var SCENARIO_3 = [
			'var d = 1;',
			'function f(a, b = a + d) {',
			'  return b;',
			'}',
			'f(1);'
		].join('\n');

		// US2-3: the default value of b has its own node at L2
		it('US2-3 should initialize a parameter with a default value at its own node', function () {
			var result = analyze(SCENARIO_3);
			var pairs = result.intraPage();
			pairsOf(pairs, 'b').should.eql(['b: L2 -> L3']);
			/// d: L1 -> entry comes from the existing modeling of the call site, not from FR-005
			pairsOf(pairs, 'd').should.eql(['d: L1 -> L2', 'd: L1 -> entry']);
			result.intraProcedural(PAGE + '.f').should.not.containEql('b: entry -> L3');
		});

		// US2-4: a parameter without a default value is still defined at entry
		it('US2-4 should define a parameter without a default value at entry', function () {
			var result = analyze(SCENARIO_3);
			result.intraProcedural(PAGE + '.f').should.containDeep(['a: entry -> L2', 'b: L2 -> L3']);
		});

		// US2-5: an arrow function and a pattern parameter, each on its own line
		it('US2-5 should initialize defaults of arrow functions and pattern parameters', function () {
			var result = analyze([
				'var d = 1;',
				'const g = (x = d) =>',
				'  x;',
				'function h({x = d}) {',
				'  return x;',
				'}',
				'g();',
				'h({});'
			].join('\n'));
			var pairs = result.intraPage();
			pairs.should.containDeep(['d: L1 -> L2', 'd: L1 -> L4']);
			result.intraProcedural(ANONYMOUS + '0').should.eql(['x: L2 -> L3']);
			result.intraProcedural(PAGE + '.h').should.eql(['x: L4 -> L5']);
		});

		// US2-6: no default value, no extra node
		it('US2-6 should not create initialization nodes without default values', function () {
			var result = analyze([
				'function f(a, {b}, [c], ...d) {',
				'  return a + b + c + d;',
				'}',
				'f(1, {}, []);'
			].join('\n'));
			var f = scopeNamed(result, PAGE + '.f');
			(f.ast.dujsBodyWithParamInits === undefined).should.eql(true);
			result.intraProcedural(PAGE + '.f').should.eql([
				'a: entry -> L2', 'b: entry -> L2', 'c: entry -> L2', 'd: entry -> L2'
			]);
		});

		// US2-7: defaults of a pattern are initialized in order
		it('US2-7 should initialize defaults of a pattern in order', function () {
			var result = analyze([
				'var d = 1;',
				'function h({',
				'  x = d,',
				'  y = x',
				'}) {',
				'  return y;',
				'}',
				'h({});'
			].join('\n'));
			var pairs = result.intraProcedural(PAGE + '.h');
			pairs.should.containDeep(['x: L3 -> L4', 'y: L4 -> L6']);
			pairsOf(pairs, 'x').should.not.containEql('x: entry -> L4');
			pairsOf(pairs, 'y').should.not.containEql('y: entry -> L6');
			result.intraPage().should.containDeep(['d: L1 -> L3']);
		});

		// the synthetic body is not enumerable and a default value which is a
		// function is not analyzed again: the scope tree does not visit
		// parameters, so it gets no scope and its body is not a use of the
		// initialization node (unchanged behavior)
		it('should not analyze a default value which is an arrow function again', function () {
			var result = analyze([
				'var d = 1;',
				'function f(',
				'  g = () => d',
				') {',
				'  return g();',
				'}',
				'f();'
			].join('\n'));
			result.scopeNames().should.eql([PAGE, PAGE + '.f']);
			var f = scopeNamed(result, PAGE + '.f');
			Object.keys(f.ast).should.not.containEql('dujsBodyWithParamInits');
			f.ast.dujsBodyWithParamInits.type.should.eql('BlockStatement');
			pairsOf(result.intraProcedural(PAGE + '.f'), 'g').should.eql(['g: L3 -> L5']);
			pairsOf(result.intraProcedural(PAGE + '.f'), 'd').should.eql([]);
			pairsOf(result.intraPage(), 'd').should.eql([]);
		});

		// characterization: a pattern parameter with its own default and a
		// default inside the pattern gets an initialization node for each
		it('should initialize both the default of a pattern parameter and the defaults inside it', function () {
			var result = analyze([
				'var d = 1;',
				'function f({x = d} = {}) {',
				'  return x;',
				'}',
				'f();'
			].join('\n'));
			result.intraProcedural(PAGE + '.f').should.eql(['x: L2 -> L3']);
			pairsOf(result.intraPage(), 'd').should.containEql('d: L1 -> L2');
		});
	});
});
