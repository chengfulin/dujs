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

	describe('destructuring, default parameters, rest and spread', function () {
		it('should define each variable of an object pattern and not use property keys', function () {
			var result = analyze([
				'var obj = {a: 1, b: 2};',
				'var {a, b: c} = obj;',
				'console.log(a + c);'
			].join('\n'));
			var pairs = result.intraProcedural();
			pairs.should.containDeep(['a: L2 -> L3', 'c: L2 -> L3', 'obj: L1 -> L2']);
			pairs.should.not.containEql('a: entry -> L1');
			result.scopeTree.root.hasLocalVariable('b').should.eql(false);
		});

		it('should define variables of an array pattern with defaults and a rest element', function () {
			var result = analyze([
				'function f(list) {',
				'  let [first, second = 0, ...rest] = list;',
				'  return first + second + rest.length;',
				'}'
			].join('\n'));
			result.intraProcedural(PAGE + '.f').should.eql([
				'first: L2 -> L3', 'list: entry -> L2', 'rest: L2 -> L3', 'second: L2 -> L3'
			]);
		});

		it('should define and kill variables in a destructuring assignment', function () {
			var result = analyze([
				'function g(x, y) {',
				'  [x, y] = [y, x];',
				'  return x - y;',
				'}'
			].join('\n'));
			result.intraProcedural(PAGE + '.g').should.eql([
				'x: L2 -> L3', 'x: entry -> L2', 'y: L2 -> L3', 'y: entry -> L2'
			]);
		});

		it('should use the variables of a default value in a pattern', function () {
			var result = analyze([
				'var fallback = 0;',
				'var {size = fallback} = {};',
				'console.log(size);'
			].join('\n'));
			result.intraProcedural().should.containDeep(['fallback: L1 -> L2', 'size: L2 -> L3']);
		});

		it('should declare pattern, default and rest parameters', function () {
			var result = analyze([
				'function h({id, name}, [first], last = 1, ...others) {',
				'  return id + name + first + last + others.length;',
				'}'
			].join('\n'));
			var h = result.scopeTree.root.children[0];
			['id', 'name', 'first', 'last', 'others'].forEach(function (name) {
				h.params.has(name).should.eql(true);
			});
			result.intraProcedural(PAGE + '.h').should.eql([
				'first: entry -> L2', 'id: entry -> L2', 'last: entry -> L2', 'name: entry -> L2', 'others: entry -> L2'
			]);
		});

		it('should use the variables of spread elements', function () {
			var result = analyze([
				'var arr = [1];',
				'var copy = [...arr];',
				'console.log(...copy);'
			].join('\n'));
			result.intraProcedural().should.containDeep(['arr: L1 -> L2', 'copy: L2 -> L3']);
		});
	});

	describe('for-of', function () {
		it('should define the loop variable at the loop node and use the iterable', function () {
			var result = analyze([
				'function sum(items) {',
				'  let total = 0;',
				'  for (const item of items) {',
				'    total = total + item;',
				'  }',
				'  return total;',
				'}'
			].join('\n'));
			result.intraProcedural(PAGE + '.sum').should.eql([
				'item: L3 -> L4',
				'items: entry -> L3',
				'total: L2 -> L4', 'total: L2 -> L6', 'total: L4 -> L4', 'total: L4 -> L6'
			]);
			result.scopeTree.root.children[0].children[0].hasLocalVariable('item').should.eql(true);
		});

		it('should continue to the loop node and break out of the loop', function () {
			var result = analyze([
				'function g(xs) {',
				'  var last = null;',
				'  for (var x of xs) {',
				'    if (x > 1) {',
				'      continue;',
				'    }',
				'    if (x < 0) {',
				'      break;',
				'    }',
				'    last = x;',
				'  }',
				'  return last;',
				'}'
			].join('\n'));
			var pairs = result.intraProcedural(PAGE + '.g');
			pairsOf(pairs, 'last').should.eql(['last: L10 -> L12', 'last: L2 -> L12']);
			/// continue/break are not nodes: their branches go to the loop node (L3) and after the loop (L12)
			pairs.should.containDeep(['x: L3 -> L4>L3', 'x: L3 -> L4>L7', 'x: L3 -> L7>L12', 'x: L3 -> L7>L10', 'x: L3 -> L10']);
		});

		it('should define variables of a destructuring pattern in the loop head', function () {
			var result = analyze([
				'function h(entries) {',
				'  for (const [key, value] of entries) {',
				'    console.log(key, value);',
				'  }',
				'}'
			].join('\n'));
			result.intraProcedural(PAGE + '.h').should.containDeep(['key: L2 -> L3', 'value: L2 -> L3']);
		});
	});

	describe('classes', function () {
		it('should bind a class lexically, model its methods as scopes and continue after it', function () {
			var result = analyze([
				'class Counter {',
				'  constructor(start) {',
				'    this.count = start;',
				'  }',
				'  increment(step) {',
				'    const next = this.count + step;',
				'    return next;',
				'  }',
				'}',
				'const c = new Counter(1);',
				'c.increment(2);'
			].join('\n'));
			result.scopeNames().should.eql([PAGE, ANONYMOUS + '0', ANONYMOUS + '1']);
			var pagePairs = result.intraProcedural();
			pagePairs.should.containDeep(['Counter: L1 -> L10', 'c: L10 -> L11']);
			pairsOf(pagePairs, 'Counter').should.eql(['Counter: L1 -> L10']);
			result.intraProcedural(ANONYMOUS + '0').should.eql(['start: entry -> L3']);
			result.intraProcedural(ANONYMOUS + '1').should.eql(['next: L6 -> L7', 'step: entry -> L6']);
		});

		it('should use the superclass but not the class name', function () {
			var result = analyze([
				'class Base {}',
				'class Child extends Base {}',
				'const Other = class extends Child {};'
			].join('\n'));
			var pairs = result.intraProcedural();
			pairs.should.containDeep(['Base: L1 -> L2', 'Child: L2 -> L3']);
			pairsOf(pairs, 'Child').should.eql(['Child: L2 -> L3']);
			pairsOf(pairs, 'Other').should.eql([]);
		});

		it('should not analyze class bodies as part of the enclosing statement', function () {
			var result = analyze([
				'var total = 0;',
				'var Box = class {',
				'  static init = (total = 1);',
				'  add(n) {',
				'    total = total + n;',
				'  }',
				'};',
				'console.log(total);'
			].join('\n'));
			pairsOf(result.intraProcedural(), 'total').should.eql(['total: L1 -> L8']);
		});

		it('should scope a class declared in a block to that block', function () {
			var result = analyze([
				'function f() {',
				'  if (true) {',
				'    class Local {}',
				'    new Local();',
				'  }',
				'}'
			].join('\n'));
			var f = result.scopeTree.root.children[0];
			f.hasLocalVariable('Local').should.eql(false);
			f.children[0].hasLocalVariable('Local').should.eql(true);
			result.intraProcedural(PAGE + '.f').should.containEql('Local: L3 -> L4');
		});
	});
});

