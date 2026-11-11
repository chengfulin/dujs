/*
 * Derived from analyses 0.2.1 (https://github.com/Swatinem/analyses), upstream tests
 * Original author: Arpad Borsos (Swatinem) <arpad.borsos@googlemail.com>
 * SPDX-License-Identifier: LGPL-3.0-only
 * Licensed under the GNU LGPL v3, see LICENSES/LGPL-3.0.txt and
 * LICENSES/GPL-3.0.txt. This file is NOT covered by the dujs MIT license.
 *
 * Modified by ChengFuLin (chengfulin0806@gmail.com):
 *   2015-04: moved into dujs, test the fork in lib/analyses
 *   2026-11-11: parse with lib/dujs/jsparser (espree) instead of esprima
 * See THIRD_PARTY_NOTICES.md for details.
 */
var jsParser = require('../../lib/dujs/jsparser');
var esgraph = require('esgraph');
var liveVariables = require('../../lib/analyses/index').examples.liveVariables;
var Set = require('../../lib/analyses/index').Set,
	should = require('should');

/**
 * returns the analysis output for the entry node, since this is a
 * backwards analysis
 */
function doAnalysis(code) {
	var ast = jsParser.parseAST(code);
	var cfg = esgraph(ast);
	var output = liveVariables(cfg);
	return output.get(cfg[0]);
}

describe('Live Variables', function () {
	it('should work for basic example', function () {
		var actual = doAnalysis('var a = b + c;');
		Set.equals(actual, new Set(['b', 'c'])).should.be.true;
	});
	it('should work for loops', function () {
		var actual = doAnalysis(
			'var y = 0; var u = a + b; var y = a * u;' +
			'while (y > u) {' +
				'a = a + 1; u = a + b; x = u;' +
			'}'
		);
		Set.equals(actual, new Set(['a', 'b'])).should.be.true;
	});
	it('should work for branches', function () {
		var actual = doAnalysis(
			'var x = 0;' +
			'if (any) {' +
				'x = y;' +
			'} else {' +
				'x = z;' +
			'}'
		);
		Set.equals(actual, new Set(['y', 'z', 'any'])).should.be.true;
	});
	it('should work for objects', function () {
		var actual = doAnalysis(
			'var x = {a: a, b: b};' +
			'y.x = x.a;'
		);
		Set.equals(actual, new Set(['y', 'a', 'b'])).should.be.true;
	});
});

