/*
 * Acceptance tests of User Story 1 of feature 005 (FR-001...FR-003, FR-006,
 * contracts/acceptance.md US1-1...4, US1-6, US1-8): a function called at
 * several call-sites returns only to the call it was entered from, and its
 * effect on the caller is its summary. US1-5 is in tests/dujs/matching.js and
 * US1-7 (needs the relaxed callees of User Story 2) in
 * tests/dujs/relaxedcallee.js.
 *
 * The programs are read from tests/dujs/cases/probes005/ (copied from
 * specs/005-summary-analysis/probes/) and probes004/; US1-3 is inline. A
 * scenario naming no model is asserted on the inter-procedural model of the
 * page and on the intra-page model.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	analyze = require('../helpers/analyze');

var PROBES005 = path.join(__dirname, 'cases', 'probes005'),
	PROBES004 = path.join(__dirname, 'cases', 'probes004');

/**
 * Analyze a probe
 * @param {string} directory
 * @param {string} probe file name
 * @returns {Object} the result of the analyze helper
 */
function analyzeProbe(directory, probe) {
	'use strict';
	return analyze(fs.readFileSync(path.join(directory, probe), 'utf8'));
}

/**
 * Pairs of the inter-procedural model of the page and of the intra-page model
 * @param {Object} result
 * @returns {Object} {interProcedural: Array, intraPage: Array}
 */
function pairsOfPage(result) {
	'use strict';
	var pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
		ofPage = pageModels.interProceduralModels.filter(function (model) {
			return model.mainlyRelatedScope === result.scopeTree.root;
		});
	ofPage.should.have.length(1, 'one inter-procedural model of the page');
	return {
		interProcedural: analyze.pairsOfModel(ofPage[0]),
		intraPage: result.intraPage()
	};
}

/**
 * Pairs of a variable
 * @param {Array} pairs
 * @param {string} name
 * @returns {Array}
 */
function pairsOfVariable(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

/**
 * Assert the presence and absence of pairs in both models of the page
 * @param {Object} result
 * @param {Array} present
 * @param {Array} absent
 */
function checkBoth(result, present, absent) {
	'use strict';
	var pairs = pairsOfPage(result);
	['interProcedural', 'intraPage'].forEach(function (level) {
		present.forEach(function (pair) {
			pairs[level].should.containEql(pair, level + ' should have ' + pair);
		});
		absent.forEach(function (pair) {
			pairs[level].should.not.containEql(pair, level + ' should not have ' + pair);
		});
	});
	return pairs;
}

describe('summary analysis (feature 005, User Story 1)', function () {
	'use strict';
	after(analyze.reset);

	/// US1-1 (probes005/p1.js): f is called at L4 and L7
	it('US1-1: should return to the call entered from (p1)', function () {
		var pairs = checkBoth(analyzeProbe(PROBES005, 'p1.js'), ['x: L1 -> L5', 'x: L6 -> L8'],
			['x: L6 -> L5', 'x: L1 -> L8']);
		pairsOfVariable(pairs.interProcedural, 'x').should.eql(['x: L1 -> L5', 'x: L6 -> L8']);
		pairsOfVariable(pairs.intraPage, 'x').should.eql(['x: L1 -> L5', 'x: L6 -> L8']);
	});

	/// US1-2 (probes005/p2.js): set defines x, get reads it, at several calls
	it('US1-2: should reach the uses in a callee only from realizable calls (p2)', function () {
		checkBoth(analyzeProbe(PROBES005, 'p2.js'),
			['x: L3 -> L6', 'x: L11 -> L6', 'x: L3 -> L10', 'x: L11 -> L13'],
			['x: L11 -> L10', 'x: L3 -> L13', 'x: L1 -> L6', 'x: L1 -> L10', 'x: L1 -> L13']);
	});

	/// US1-3 (inline): the callee defines x on one branch only, which is not a must-KILL
	it('US1-3: should keep the definition before a call defining on one branch only', function () {
		checkBoth(analyze([
			'var x = 0;',
			'function f(c) {',
			'if (c) {',
			'x = 1;',
			'}',
			'}',
			'f(0);',
			'console.log(x);'
		].join('\n')), ['x: L1 -> L8', 'x: L4 -> L8'], []);
	});

	/// US1-4 (probes005/c-cyc3-cond.js, plan Q1): the recursive call does not pollute nor kill the local t
	it('US1-4: should keep t: L4 -> L8 over a conditional recursive call and terminate (c-cyc3-cond)', function () {
		checkBoth(analyzeProbe(PROBES005, 'c-cyc3-cond.js'), ['t: L4 -> L8'], []);
	});

	/// US1-4 (probes004/cyc-3.js): the unconditional recursion never returns normally
	it('US1-4: should have no pair used at L6 after an unconditional recursion and terminate (cyc-3)', function () {
		var pairs = pairsOfPage(analyzeProbe(PROBES004, 'cyc-3.js'));
		['interProcedural', 'intraPage'].forEach(function (level) {
			pairs[level].filter(function (pair) {
				var use = pair.split(' -> ')[1];
				return use === 'L6' || /^L6[:>]/.test(use);
			}).should.eql([], level);
		});
	});

	/// US1-6 (probes005/g5-mdn-person-field.js): the field initializer and the constructor chained at one call
	it('US1-6: should chain the summaries of the field initializer and the constructor (g5)', function () {
		checkBoth(analyzeProbe(PROBES005, 'g5-mdn-person-field.js'),
			['count: L1 -> L3', 'count: L1 -> L5', 'count: L5 -> L10'], ['count: L1 -> L10']);
	});

	/// US1-8 (probes005/c-gen.js, c-asy.js): conservative summaries of a generator and an async function
	[['c-gen.js', ['x: L1 -> L6', 'x: L3 -> L6']], ['c-asy.js', ['x: L1 -> L8', 'x: L5 -> L8']]].forEach(function (testCase) {
		it('US1-8: should not must-KILL in the summary of ' + testCase[0], function () {
			var result = analyzeProbe(PROBES005, testCase[0]);
			checkBoth(result, testCase[1], []);
			var summary = require('../../lib/dujs/summary'),
				/// Scope.name is the full name ($DOMAIN.$PAGE_0.g): compare its last part
				callee = result.scopeTree.scopes.filter(function (scope) {
					return scope.name.split('.').pop() === 'g';
				})[0];
			summary.computeForPage(result.scopeTree);
			summary.summaryOf(callee).conservative.should.be.true();
		});
	});
});
