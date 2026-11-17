/*
 * Acceptance tests of User Story 6 of feature 005 (FR-013, contracts/acceptance.md
 * US6-1...7): try/finally and the exception paths. A catch body throwing,
 * return, break and continue through a finally block run the finally block
 * first; a finally block entered by an exception goes on throwing after it; an
 * exception path only carries the definitions before the throwing statement.
 * The programs are the probes of tests/dujs/cases/probes005/. Unless a model is
 * named, the pairs are asserted on the inter-procedural model of the page (when
 * the page has one) and on the intra-page model.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, 'cases', 'probes005');

/**
 * Pairs of the inter-procedural model of the page (when there is one) and of
 * the intra-page model of a probe, each model as an Array
 * @param {string} probe file name
 * @returns {Array} arrays of pairs
 */
function pairsOfProbe(probe) {
	'use strict';
	var result = analyze(fs.readFileSync(path.join(PROBES, probe), 'utf8')),
		pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
		models = pageModels.interProceduralModels.filter(function (model) {
			return model.mainlyRelatedScope === result.scopeTree.root;
		});
	return models.map(analyze.pairsOfModel).concat([result.intraPage()]);
}

/**
 * Assert the pairs of every model of a probe
 * @param {string} probe file name
 * @param {Array} present pairs expected
 * @param {Array} absent pairs not expected
 */
function shouldHavePairs(probe, present, absent) {
	'use strict';
	var models = pairsOfProbe(probe);
	models.forEach(function (pairs) {
		present.forEach(function (pair) {
			pairs.should.containEql(pair);
		});
		absent.forEach(function (pair) {
			pairs.should.not.containEql(pair);
		});
	});
	return models;
}

describe('finally and exception paths (feature 005 US6)', function () {
	'use strict';
	after(analyze.reset);

	/// P18: the exception of f passes through the empty finally block and leaves f
	it('US6-1: an exception through an empty finally block goes on throwing (c-fin1)', function () {
		/// US3 還原: r: L4 -> L14 and r: L4 -> L16 come back with the exceptional return of the call
		/// (applyExceptional of the summary of f at the catch of L13); until User Story 3 the definitions of
		/// f reaching its exit exceptionally are lost (feature 005 US1: the exception of f no longer goes back
		/// through its exit to the call; golden-diff.md US1 "unit test expectations")
		shouldHavePairs('c-fin1.js', [/* US3 還原: 'r: L4 -> L14', 'r: L4 -> L16' */], ['r: L9 -> L14', 'r: L9 -> L16']);
	});

	/// P19: the rethrow of the catch body passes through the finally block and leaves f as an exception
	it('US6-2: a rethrow through a finally block leaves the function as an exception (c-fin3)', function () {
		/// US3 還原: r: L7 -> L16 and r: L7 -> L18 come back with the exceptional return of the call
		/// (applyExceptional of the summary of f at the catch of L15); until User Story 3 the definitions of
		/// f reaching its exit exceptionally are lost (feature 005 US1; golden-diff.md US1 "unit test expectations")
		shouldHavePairs('c-fin3.js', [/* US3 還原: 'r: L7 -> L16', 'r: L7 -> L18' */], []);
	});

	/// P20: the finally block entered by an exception goes on throwing; L8 is unreachable
	it('US6-3: the statement after a try statement throwing through a finally block is unreachable (c-fin4)', function () {
		var result = analyze(fs.readFileSync(path.join(PROBES, 'c-fin4.js'), 'utf8'));
		[result.intraProcedural(), result.intraPage()].forEach(function (pairs) {
			pairs.filter(function (pair) {
				return /^r: .* -> L8(:|$)/.test(pair);
			}).should.eql([]);
		});
	});

	/// P21: the rethrow of the catch body of the page passes through the finally block, then the LOOP
	it('US6-4: a rethrow of the page goes through the finally block to the handlers (c-m4h, intra-page)', function () {
		var result = analyze(fs.readFileSync(path.join(PROBES, 'c-m4h.js'), 'utf8'));
		result.intraPage().should.containEql('r: L13 -> L3');
	});

	/// P22
	it('US6-5: return goes through the finally block (c-fin2)', function () {
		shouldHavePairs('c-fin2.js', ['r: L7 -> L11'], ['r: L4 -> L11']);
	});

	/// P23
	it('US6-6: break goes through the finally block (c-fin5-break)', function () {
		shouldHavePairs('c-fin5-break.js', ['r: L7 -> L10'], ['r: L4 -> L10']);
	});

	it('US6-6: continue goes through the finally block (c-fin6-continue)', function () {
		shouldHavePairs('c-fin6-continue.js', ['r: L9 -> L12'], ['r: L6 -> L12']);
	});

	/// continue in the finally block overrides the pending return: the definition before it reaches the loop test
	it('US6-6: continue in a finally block goes to the loop test, overriding a pending return', function () {
		var result = analyze([
			'function f(x) {',
			'var y = 0;',
			'while (y < 3) {',
			'try {',
			'return a();',
			'} finally {',
			'y = y + 1;',
			'if (x) continue;',
			'b();',
			'}',
			'}',
			'}',
			'f(true);'
		].join('\n'));
		[result.intraProcedural('$DOMAIN.$PAGE_0.f'), result.intraPage()].forEach(function (pairs) {
			pairs.should.containEql('y: L7 -> L3>L5:T');
			pairs.should.containEql('y: L7 -> L7');
		});
	});

	/// P24 (FR-014, already holding since Foundational): o.p throws before x is assigned
	it('US6-7: an exception path only carries the definitions before the throwing statement (c-out3)', function () {
		var result = analyze(fs.readFileSync(path.join(PROBES, 'c-out3.js'), 'utf8'));
		[result.intraProcedural(), result.intraPage()].forEach(function (pairs) {
			pairs.should.containEql('x: L1 -> L6');
			pairs.should.not.containEql('x: L4 -> L6');
		});
	});
});
