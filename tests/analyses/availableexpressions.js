/*
 * Derived from analyses 0.2.1 (https://github.com/Swatinem/analyses), upstream tests
 * Original author: Arpad Borsos (Swatinem) <arpad.borsos@googlemail.com>
 * SPDX-License-Identifier: LGPL-3.0-only
 * Licensed under the GNU LGPL v3, see LICENSES/LGPL-3.0.txt and
 * LICENSES/GPL-3.0.txt. This file is NOT covered by the dujs MIT license.
 *
 * Modified by ChengFuLin (chengfulin0806@gmail.com):
 *   2015-04: moved into dujs, test the fork in lib/analyses
 *   2026-11-11: parse with lib/dujs/jsparser (espree), compare without positions
 * See THIRD_PARTY_NOTICES.md for details.
 */
var jsParser = require('../../lib/dujs/jsparser');
var esgraph = require('esgraph');
var availableExpressions = require('../../lib/analyses/index').examples.availableExpressions;

/**
 * returns the analysis output for the exit node, since this is a
 * forward analysis
 */
function doAnalysis(code) {
	var ast = jsParser.parseAST(code);
	var cfg = esgraph(ast);
	var output = availableExpressions(cfg);
	var exit = cfg[1];

	// exception edges mess up everything, so rather use the node before the exit
	// node
	var normals = exit.prev.filter(function (n) { return n.normal === exit; })
		.reduce(function (arr, elem) {
			if (!~arr.indexOf(elem))
				arr.push(elem);
			return arr;
		}, []);
	if (normals.length === 1)
		exit = normals[0];
	return output.get(exit).values().map(stripPositions);
}

/**
 * Remove position info so that structurally equal expressions parsed from
 * different source offsets compare as equal
 */
function stripPositions(node) {
	'use strict';
	if (Array.isArray(node)) {
		return node.map(stripPositions);
	}
	if (!node || typeof node !== 'object') {
		return node;
	}
	var result = {};
	Object.keys(node).forEach(function (key) {
		if (key !== 'start' && key !== 'end' && key !== 'range' && key !== 'loc') {
			result[key] = stripPositions(node[key]);
		}
	});
	return result;
}

function expr(code) {
	return stripPositions(jsParser.parseAST(code).body[0].expression);
}

describe('Available Expressions', function () {
	it('should work for basic example', function () {
		var actual = doAnalysis('var a = b + c; var c = a + b;');
		actual.should.containEql(expr('a + b'));
	});
	it('should work for loops', function () {
		var actual = doAnalysis(
			'var x = a + b; var y = a * x;' +
			'while (y > a + b) {' +
				'a = a + 1; x = a + b;' +
			'} expr;'
		);
		actual.should.containEql(expr('a + b'));
		actual.should.containEql(expr('y > a + b'));
	});
	it('should work for branches', function () {
		var actual = doAnalysis(
			'var x = 0;' +
			'if (any) {' +
				'x = a + b;' +
			'} else {' +
				'x = a + b;' +
				'y = a + c;' +
			'} expr;'
		);
		actual.should.containEql(expr('a + b'));
	});
});

