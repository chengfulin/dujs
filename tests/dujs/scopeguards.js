/*
 * Guards of feature 006 (eslint-scope as the only source of declarations and
 * identifier resolution): what must stay as in develop, and the call links
 * changed by FR-013 (contracts/acceptance.md US4-2...5, 8, 10, 11, Q1, Q3, F9).
 * The expectations of "same as develop" are the lists recorded with develop
 * at Setup: tests/dujs/cases/probes006/scopenames.json and developpairs.json.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, 'cases', 'probes006');
var SCOPE_NAMES = JSON.parse(fs.readFileSync(path.join(PROBES, 'scopenames.json'), 'utf8')),
	DEVELOP_PAIRS = JSON.parse(fs.readFileSync(path.join(PROBES, 'developpairs.json'), 'utf8'));

/**
 * Inter-procedural models expected for the probes whose model counts change
 * (D5 and FR-013, spec US4-3 and US4-10): annexb and link-n10 do not link
 * their calls any more; link-n4, link-n8a and link-n9 link new K()/new A() to
 * the constructor of the class, which adds a model rooted at the caller
 * @type {Object}
 */
var CHANGED_INTER_PROCEDURAL_COUNTS = {
	'annexb.js': 0,
	'link-n10.js': 0,
	'link-n4.js': 2,
	'link-n8a.js': 2,
	'link-n9.js': 2
};

/**
 * Analyze a probe (a file name of probes006) or code
 * @param {string} probe
 * @returns {Object} the result of the analyze helper
 */
function analyzeProbe(probe) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, probe), 'utf8'));
}

/**
 * Numbers of the models of each level of the (only) page analyzed last
 * @param {Object} result
 * @returns {Object} {intraProcedural, interProcedural, intraPage, interPage}
 */
function modelCountsOf(result) {
	'use strict';
	var pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree);
	return {
		intraProcedural: pageModels.intraProceduralModels.length,
		interProcedural: pageModels.interProceduralModels.length,
		intraPage: pageModels.intraPageModels.length,
		interPage: !!modelCtrl.interPageModel ? 1 : 0
	};
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

describe('Guards of the scope binding (feature 006)', function () {
	'use strict';
	afterEach(function () {
		analyze.reset();
	});

	describe('scope names and model counts (US4-2)', function () {
		Object.keys(SCOPE_NAMES).forEach(function (probe) {
			it('should keep the scope names and the model counts of ' + probe, function () {
				var result = analyzeProbe(probe),
					expected = Object.assign({}, SCOPE_NAMES[probe].models);
				if (CHANGED_INTER_PROCEDURAL_COUNTS.hasOwnProperty(probe)) {
					expected.interProcedural = CHANGED_INTER_PROCEDURAL_COUNTS[probe];
				}
				result.scopeNames().should.eql(SCOPE_NAMES[probe].scopes);
				modelCountsOf(result).should.eql(expected);
			});
		});
	});

	describe('Annex B functions (US4-3, D5)', function () {
		it('should keep the scopes of the block functions and not link their calls', function () {
			var result = analyzeProbe('annexb.js');
			result.scopeNames().should.containEql('$DOMAIN.$PAGE_0.f');
			result.scopeNames().should.containEql('$DOMAIN.$PAGE_0.g2');
			result.interProceduralScopes().should.eql([]);
		});

		/// the reads of f and g2 outside the blocks are unresolved, i.e. read-only
		/// page globals, which get their definitions at the page entry in US3
		/// (Def.GLOBAL_TYPE, T050); enable this case there
		it.skip('should read f and g2 as page globals (enabled by the global definitions of US3)', function () {
			var pairs = analyzeProbe('annexb.js').intraPage();
			pairs.should.containEql('f: entry -> L1');
			pairs.should.containEql('f: entry -> L5');
			pairs.should.containEql('g2: entry -> L7');
		});
	});

	describe('same pairs as develop (US2-5, US4-4, US4-5, US4-8, Q1, Q3, F9)', function () {
		Object.keys(DEVELOP_PAIRS).forEach(function (probe) {
			var expected = DEVELOP_PAIRS[probe];
			it('should give the pairs of develop for ' + probe, function () {
				var result = (probe === 'q3') ? analyze(expected.code) : analyzeProbe(probe);
				result.intraPage().should.eql(expected.intraPage);
				if (expected.hasOwnProperty('interProcedural')) {
					interProceduralPairsOf(result).should.eql(expected.interProcedural);
				}
			});
		});

		it('should not link Map() to the page function Map of a built-in name (plan-bi, F9)', function () {
			var result = analyzeProbe('plan-bi.js');
			result.interProceduralScopes().should.eql([]);
			result.intraPage().should.containEql('Map: entry -> L2');
		});

		it('should give the parameter declared again as a function no undefined initial value (plan-pf, F9)', function () {
			var pairs = analyzeProbe('plan-pf.js').intraPage();
			pairs.should.containEql('a: entry -> L3');
			pairs.filter(function (pair) {
				return pair.indexOf('a: ') === 0;
			}).should.eql(['a: entry -> L3']);
		});
	});

	describe('call links by FR-013 (US4-10)', function () {
		it('should link new K() to the class K, not taking K = 1 in catch (K) as a definition of it (link-n4)', function () {
			var result = analyzeProbe('link-n4.js'),
				pairs = result.intraPage();
			pairs.should.containEql('K: L1 -> L6');
			pairs.should.not.containEql('K: L5 -> L6');
			result.interProceduralScopes().should.containEql(['$DOMAIN.$PAGE_0.f', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0']);
		});

		it('should link new K() to the class K, K = 2 being the inner name of a function expression (link-n8a)', function () {
			var result = analyzeProbe('link-n8a.js');
			result.intraPage().should.containEql('K: L1 -> L5');
			result.interProceduralScopes().should.containEql(['$DOMAIN.$PAGE_0.f', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0']);
		});

		it('should link new A() to the constructor by the inner name of a class expression (link-n9)', function () {
			var result = analyzeProbe('link-n9.js');
			result.intraPage().should.containEql('A: L1 -> L3');
			result.interProceduralScopes().should.containEql(['$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0']);
		});

		it('should not link e() to the function e when e is the catch parameter (link-n10)', function () {
			var result = analyzeProbe('link-n10.js');
			result.interProceduralScopes().should.eql([]);
			result.intraPage().should.containEql('e: L2 -> L3');
		});

		it('should still not link new A() when A is also assigned outside the class (link-n5)', function () {
			/// A.make() links to the static method; new A() in it does not link to the constructor
			analyzeProbe('link-n5.js').interProceduralScopes().should.eql([['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1']]);
		});
	});

	describe('bypass of a call (US4-11)', function () {
		it('should let the catch parameter bypass a callee declaring the same name (link-bypass)', function () {
			analyzeProbe('link-bypass.js').intraPage().should.containEql('e: L6 -> L8');
		});
	});
});
