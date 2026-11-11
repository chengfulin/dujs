/*
 * Test cases for modeling ES2015+ syntax
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

describe('ES2015+ modeling', function () {
	'use strict';
	after(analyze.reset);

	describe('arrow functions', function () {
		it('should create scopes for block-body and expression-body arrows', function () {
			var result = analyze([
				'var f = (x) => {',
				'  return x + 1;',
				'};',
				'var g = (y) => y * 2;'
			].join('\n'));
			result.scopeNames().should.eql([PAGE, ANONYMOUS + '0', ANONYMOUS + '1']);
			result.intraProcedural(ANONYMOUS + '0').should.eql(['x: entry -> L2']);
			result.intraProcedural(ANONYMOUS + '1').should.eql(['y: entry -> L4']);
		});

		it('should not count uses inside an arrow body as uses of the enclosing statement', function () {
			var result = analyze([
				'var k = 1;',
				'var h = () => k + 1;',
				'console.log(k);'
			].join('\n'));
			pairsOf(result.intraProcedural(), 'k').should.eql(['k: L1 -> L3']);
		});

		it('should define a variable assigned an arrow as a function and connect calls to it', function () {
			var result = analyze([
				'var add = (a) => {',
				'  return a;',
				'};',
				'add(1);'
			].join('\n'));
			pairsOf(result.intraProcedural(), 'add').should.eql(['add: L1 -> L4']);
			result.interProceduralScopes().should.containDeep([[PAGE, ANONYMOUS + '0']]);
		});

		it('should connect arrow event handlers, named or inline, into the intra-page model', function () {
			var result = analyze([
				'var count = 0;',
				'var onLoad = () => {',
				'  count = 1;',
				'};',
				'window.addEventListener(\'load\', onLoad);',
				'document.getElementById(\'b\').addEventListener(\'click\', () => {',
				'  console.log(count);',
				'});'
			].join('\n'));
			result.intraPageScopes().should.containDeep([ANONYMOUS + '0', ANONYMOUS + '1']);
			pairsOf(result.intraPage(), 'count').should.containDeep(['count: L1 -> L7', 'count: L3 -> L7']);
		});
	});

	describe('let and const', function () {
		it('should separate a block-scoped variable from a shadowed outer one', function () {
			var result = analyze([
				'function f() {',
				'  let x = 1;',
				'  if (x > 0) {',
				'    let x = 2;',
				'    console.log(x);',
				'  }',
				'  return x;',
				'}'
			].join('\n'));
			var pairs = pairsOf(result.intraProcedural(PAGE + '.f'), 'x');
			pairs.should.containDeep(['x: L2 -> L3>L4', 'x: L2 -> L3>L7', 'x: L2 -> L7', 'x: L4 -> L5']);
			pairs.should.not.containEql('x: L4 -> L7');
			pairs.should.not.containEql('x: L2 -> L5');
		});

		it('should declare a for-let variable in a block scope of the loop', function () {
			var result = analyze([
				'function g(list) {',
				'  let total = 0;',
				'  for (let i = 0; i < list.length; i++) {',
				'    total = total + list[i];',
				'  }',
				'  return total;',
				'}'
			].join('\n'));
			var g = result.scopeTree.root.children[0],
				loop = g.children[0];
			g.hasLocalVariable('i').should.eql(false);
			loop.type.should.eql('block');
			loop.hasLocalVariable('i').should.eql(true);
			var pairs = result.intraProcedural(PAGE + '.g');
			pairs.should.containDeep(['i: L3 -> L3>L4', 'i: L3 -> L3>L6']);
			pairsOf(pairs, 'total').should.eql([
				'total: L2 -> L4', 'total: L2 -> L6', 'total: L4 -> L4', 'total: L4 -> L6'
			]);
		});

		it('should not treat an assignment to a block-scoped variable as an implicit global', function () {
			var result = analyze([
				'function h() {',
				'  {',
				'    let t;',
				'    t = 5;',
				'    console.log(t);',
				'  }',
				'}'
			].join('\n'));
			result.scopeTree.root.hasLocalVariable('t').should.eql(false);
			pairsOf(result.intraProcedural(PAGE + '.h'), 't').should.eql(['t: L4 -> L5']);
		});

		it('should not give let/const variables an undefined definition at the scope entry', function () {
			var result = analyze([
				'function m() {',
				'  console.log(b);',
				'  const b = 1;',
				'  return b;',
				'}'
			].join('\n'));
			pairsOf(result.intraProcedural(PAGE + '.m'), 'b').should.eql(['b: L3 -> L4']);
		});

		it('should connect page-level let/const through event handlers', function () {
			var result = analyze([
				'let count = 0;',
				'const onClick = () => {',
				'  count = count + 1;',
				'};',
				'window.addEventListener(\'click\', onClick);'
			].join('\n'));
			var pairs = result.intraPage();
			pairs.should.containDeep(['count: L1 -> L3', 'count: L3 -> L3', 'onClick: L2 -> L5']);
			pairs.should.not.containEql('count: entry -> L3');
		});
	});
});

