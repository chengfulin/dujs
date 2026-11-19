/*
 * Test cases of the catch clause node (feature 006, User Story 1, D4,
 * research R10; contracts/acceptance.md US1-1...6, U3, Q2): the catch
 * parameter (destructuring too) is defined by the catch clause node and only
 * visible in the catch clause; the catch clause node reads only the evaluated
 * expressions of its parameter, not its body, and defines nothing in its body.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	hierarchy = require('../../lib/dujs/hierarchy'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, 'cases', 'probes006');

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
 * Pairs of each inter-procedural model of the page analyzed last
 * @param {Object} result
 * @returns {Array} arrays of pairs
 */
function interProceduralPairsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels.map(analyze.pairsOfModel);
}

describe('Catch clause (feature 006, US1)', function () {
	'use strict';
	afterEach(function () {
		analyze.reset();
	});

	/// US1-1
	it('should define the catch parameter at the catch clause (catch-b)', function () {
		var result = analyzeProbe('catch-b.js'),
			present = ['e: L4 -> L5', 'e: L3 -> L7'],
			absent = ['e: L3 -> L5', 'e: L3 -> L4', 'console: entry -> L4'];
		checkPairs(result.intraProcedural(), present, absent);
		checkPairs(result.intraPage(), present, absent);
	});

	/// US1-2
	it('should take an assignment in the catch block as a definition of the catch parameter (catch-a)', function () {
		var result = analyzeProbe('catch-a.js'),
			present = ['e: L5 -> L6', 'e: L3 -> L8'],
			absent = ['e: L5 -> L8', 'e: L3 -> L4', 'console: entry -> L4'];
		checkPairs(result.intraProcedural(), present, absent);
		checkPairs(result.intraPage(), present, absent);
	});

	/// US1-3
	it('should define a destructuring and a plain catch parameter (catch-c)', function () {
		var result = analyzeProbe('catch-c.js'),
			present = ['message: L4 -> L5', 'err: L7 -> L7'];
		checkPairs(result.intraProcedural(), present, []);
		checkPairs(result.intraPage(), present, []);
	});

	/// US1-4
	it('should not take the catch parameter as a page global nor share it between catch clauses (catchloop)', function () {
		var result = analyzeProbe('catchloop.js'),
			absent = ['e: entry -> L5', 'e: L6 -> L5', 'e: L6 -> L11', 'e: L6 -> entry', 'e: entry -> entry'];
		checkPairs(result.intraProcedural(), ['e: L6 -> L7'], absent);
		checkPairs(result.intraPage(), ['e: L6 -> L7', 'e: L11 -> L11'], absent);
	});

	/// US1-5
	it('should let an inner function read the catch parameter (catchinner)', function () {
		var result = analyzeProbe('catchinner.js'),
			interProcedural = interProceduralPairsOf(result);
		interProcedural.length.should.be.above(0);
		interProcedural.forEach(function (pairs) {
			checkPairs(pairs, ['e: L5 -> L6'], ['g: entry -> L5']);
		});
		checkPairs(result.intraPage(), ['e: L5 -> L6'], ['g: entry -> L5']);
	});

	/// US1-6; feature 005 FR-014: an exception edge carries the definitions reaching the throwing
	/// node, so e = 2 (L3) throwing gives e of L1 to L5, and e = 3 (L8) throwing gives e of L1 and L3 to L13
	it('should read nothing at a catch without parameter and give var e = 4 to the catch parameter (catch-edge)', function () {
		var result = analyzeProbe('catch-edge.js'),
			present = ['e: L1 -> L5', 'e: L10 -> L11', 'e: L8 -> L13', 'e: L1 -> L13', 'e: L3 -> L13'],
			absent = ['e: L3 -> L5', 'e: L3 -> L4', 'console: entry -> L4', 'e: L10 -> L13', 'e: L8 -> L9',
				'console: entry -> L9'];
		checkPairs(result.intraProcedural(), present, absent);
		checkPairs(result.intraPage(), present, absent);
	});

	/// U3: the catch clause node does not define the assignments in its block
	it('should not define the assignments in the catch block at the catch clause (plan-u3)', function () {
		checkPairs(analyzeProbe('plan-u3.js').intraPage(), ['y: L1 -> L7', 'y: L5 -> L7'], ['y: L4 -> L7']);
	});

	/// Q2: a catch parameter whose name has no other declaration in the page is not a page global
	it('should not take a catch parameter without other declaration as a page global (plan-catch1)', function () {
		var result = analyzeProbe('plan-catch1.js'),
			present = ['e: L5 -> L6', 'h: entry -> L3', 'k: entry -> L9'],
			absent = ['e: entry -> L4', 'console: entry -> L4'];
		checkPairs(result.intraProcedural(), present, absent);
		checkPairs(result.intraPage(), present, absent);
	});

	/// T072: the local storage object defined in the catch block is defined by the node of the block, not the catch
	it('should not take the catch clause node as a node defining the local storage object', function () {
		var result = analyze([
				'function f2() {}',
				'try {',
				'  f2();',
				'} catch (e) {',
				'  localStorage.k = e;',
				'}'
			].join('\n')),
			pageModel = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraPageModels[0],
			found = hierarchy.definingLocalStorageNodes(pageModel);
		found.map(function (node) {
			return [node.line, node.astNode.type];
		}).should.eql([[5, 'AssignmentExpression']]);
	});
});
