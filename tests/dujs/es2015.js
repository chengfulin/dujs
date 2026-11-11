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
});
