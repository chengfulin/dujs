/*
 * Test cases of the resolution of names to their declarations (feature 006,
 * User Story 2, D7, research R7, R8; contracts/acceptance.md US2-1...5): the
 * name of a named function or class expression is defined where the
 * expression is evaluated and only visible in the expression; a recursive
 * call through the name of a function expression is not connected; the inner
 * name of a class declaration is another binding than the outer one; a
 * parameter default reads the variable of the outer scope; shadowing
 * declarations keep the results of develop.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, 'cases', 'probes006'),
	DEVELOP_PAIRS = JSON.parse(fs.readFileSync(path.join(PROBES, 'developpairs.json'), 'utf8'));

/**
 * Analyze a probe (a file name of probes006)
 * @param {string} probe
 * @returns {Object} the result of the analyze helper
 */
function analyzeProbe(probe) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, probe), 'utf8'));
}

/**
 * Check the pairs: every pair of present is in pairs, no pair of absent is
 * @param {Array} pairs
 * @param {Array} present
 * @param {Array} absent
 */
function checkPairs(pairs, present, absent) {
	'use strict';
	present.forEach(function (pair) {
		pairs.should.containEql(pair);
	});
	absent.forEach(function (pair) {
		pairs.should.not.containEql(pair);
	});
}

/**
 * Inter-procedural models of the page analyzed last
 * @param {Object} result
 * @returns {Array}
 */
function interProceduralModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels;
}

/**
 * Whether a pair is of the variable
 * @param {string} name
 * @returns {function}
 */
function ofVariable(name) {
	'use strict';
	return function (pair) {
		return pair.indexOf(name + ': ') === 0;
	};
}

describe('Scope resolution (feature 006, US2)', function () {
	'use strict';
	afterEach(function () {
		analyze.reset();
	});

	/// US2-1
	it('should define the names of named expressions where they are evaluated (named-expr)', function () {
		var result = analyzeProbe('named-expr.js'),
			present = ['Q: L1 -> L2', 'fact: L4 -> L5'],
			models = interProceduralModelsOf(result);
		models.length.should.be.above(0);
		models.forEach(function (model) {
			checkPairs(analyze.pairsOfModel(model), present, []);
		});
		checkPairs(result.intraPage(), present, []);
		var intraProcedural = result.intraProcedural();
		intraProcedural.filter(ofVariable('Q')).should.eql([]);
		intraProcedural.filter(ofVariable('fact')).should.eql([]);
	});

	/// Clarifications Session 2026-11-17 (implement US2): the inner name of a class expression is bound
	/// before its static members run, while the assigned variable is defined after the expression
	it('should define the inner name of an assigned class expression before its static members run', function () {
		var result = analyze([
				'var B;',
				'B = class Q {',
				'  static s = Q;',
				'};',
				'B.s;'
			].join('\n')),
			models = interProceduralModelsOf(result);
		models.length.should.be.above(0);
		models.forEach(function (model) {
			checkPairs(analyze.pairsOfModel(model), ['Q: L2 -> L3', 'B: L2 -> L5'], ['B: L2 -> L3']);
		});
		checkPairs(result.intraPage(), ['Q: L2 -> L3', 'B: L2 -> L5'], ['B: L2 -> L3']);
		result.intraProcedural().filter(ofVariable('Q')).should.eql([]);
	});

	/// US2 review R1: with two named class expressions in one node, each static member keeps only the inner
	/// name of its own class at the call site
	it('should define the inner name of each class expression in one node before its own static members', function () {
		var result = analyze([
				'var X = [class P {',
				'  static a = P;',
				'}, class Q {',
				'  static b = Q;',
				'}];'
			].join('\n'));
		checkPairs(result.intraPage(), ['P: L1 -> L2', 'Q: L1 -> L4'], []);
	});

	/// US2-2: a recursive call through the name of a function expression is not connected (D7)
	it('should not connect the recursive call through the name of a function expression', function () {
		var result = analyze([
				'var h = function fact(n) {',
				'  fact(n - 1);',
				'  return n;',
				'};',
				'h(1);'
			].join('\n')),
			models = interProceduralModelsOf(result);
		/// lines: L1 var h = function fact(n) {, L2 fact(n - 1);, L3 return n;, L4 };, L5 h(1);
		result.intraPage().should.containEql('fact: L1 -> L2');
		models.length.should.be.above(0);
		models.forEach(function (model) {
			analyze.pairsOfModel(model).should.containEql('fact: L1 -> L2');
			model.relatedScopes.map(String).should.eql(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0']);
			model.graph[2].filter(function (node) {
				return node.line === 2 && [].concat(node[FlowNode.CALL_CONNECTION_TYPE] || []).length > 0;
			}).should.eql([]);
		});
	});

	/// US2-3
	it('should resolve the inner and the outer name of a class declaration (classdecl)', function () {
		checkPairs(analyzeProbe('classdecl.js').intraPage(), ['A: L1 -> L2', 'A: L5 -> L6'], []);
	});

	/// US2-4
	it('should resolve a parameter default to the variable of the outer scope (pdef)', function () {
		checkPairs(analyzeProbe('pdef.js').intraPage(), ['x: L1 -> L2'], ['x: entry -> L2']);
	});

	/// US2-5: characterization of develop (developpairs.json, T007)
	['shadow-block.js', 'shadow-param.js', 'shadow-loop.js'].forEach(function (probe) {
		it('should keep the pairs of develop (' + probe + ')', function () {
			analyzeProbe(probe).intraPage().should.eql(DEVELOP_PAIRS[probe].intraPage);
		});
	});
});
