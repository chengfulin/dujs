/*
 * Acceptance tests of User Story 3 of feature 005 (FR-006, FR-014, research
 * R5, contracts/acceptance.md US3-1...4, US3-6, US3-7): an exception leaving a
 * callee does not return to the call; the definitions reaching the exit of
 * the callee exceptionally (the fourth item of its summary, exceptional) go to
 * the exception target of the call (applyExceptional), along the chain of
 * calls. US3-5 needs the relaxed callees of User Story 2 (D2) and is added
 * with it (T085); it is asserted on the intra-page model only (the handler h
 * is not called by the page).
 *
 * The programs are the probes of tests/dujs/cases/probes005/. The pairs are
 * asserted on the inter-procedural model of the page (when the page has one)
 * and on the intra-page model.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	callResolver = require('../../lib/dujs/callresolver'),
	FlowNode = require('../../lib/esgraph/flownode'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, 'cases', 'probes005');

/**
 * Pairs of the inter-procedural model of the page (when there is one) and of
 * the intra-page model of a program, each model as an Array
 * @param {string} code
 * @returns {Array} arrays of pairs
 */
function pairsOfCode(code) {
	'use strict';
	var result = analyze(code),
		pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
		models = pageModels.interProceduralModels.filter(function (model) {
			return model.mainlyRelatedScope === result.scopeTree.root;
		});
	return models.map(analyze.pairsOfModel).concat([result.intraPage()]);
}

/**
 * Pairs of the models of a probe (see pairsOfCode)
 * @param {string} probe file name
 * @returns {Array} arrays of pairs
 */
function pairsOfProbe(probe) {
	'use strict';
	return pairsOfCode(fs.readFileSync(path.join(PROBES, probe), 'utf8'));
}

/**
 * Assert the pairs of every model of a probe
 * @param {string} probe file name
 * @param {Array} present pairs expected
 * @param {Array} absent pairs not expected
 */
function shouldHavePairs(probe, present, absent) {
	'use strict';
	shouldHavePairsIn(pairsOfProbe(probe), probe, present, absent);
}

/**
 * Assert the pairs of every model
 * @param {Array} models arrays of pairs (see pairsOfCode)
 * @param {string} probe name in the messages
 * @param {Array} present pairs expected
 * @param {Array} absent pairs not expected
 */
function shouldHavePairsIn(models, probe, present, absent) {
	'use strict';
	models.forEach(function (pairs) {
		present.forEach(function (pair) {
			pairs.should.containEql(pair, probe + ' should have ' + pair);
		});
		absent.forEach(function (pair) {
			pairs.should.not.containEql(pair, probe + ' should not have ' + pair);
		});
	});
}

describe('exceptions leaving a callee (feature 005 US3)', function () {
	'use strict';
	after(analyze.reset);

	/// P4: no try; an exception of s leaves the page, so only the normal return reaches L7
	it('US3-1: an exception leaving the callee does not return after the call (p4)', function () {
		shouldHavePairs('p4.js', ['x: L4 -> L7'], ['x: L1 -> L7']);
	});

	/// P13: the definitions before the call reach the catch by the exception of the callee;
	/// after a normal return the call statement does not throw again
	it('US3-2: an exception of the callee reaches the catch of the caller (m1-mdn-error-objects)', function () {
		shouldHavePairs('m1-mdn-error-objects.js',
			['state: L1 -> L13', 'state: L1 -> L15', 'state: L7 -> L15', 'e: L11 -> L12'],
			['state: L7 -> L13']);
	});

	/// the same conclusion on the smaller program: x of L4 never reaches the catch (L4 throwing carries x of L1)
	it('US3-2: the same conclusion on g2-try-catch', function () {
		shouldHavePairs('g2-try-catch.js', ['x: L1 -> L9', 'x: L1 -> L11', 'x: L4 -> L11'], ['x: L4 -> L9']);
	});

	/// R2-2: L4 throwing leaves s with x of L3 (exceptional of the summary of s); L3 throwing carries x of L1;
	/// x of L5 never leaves s exceptionally (L5 throwing carries IN, Q-a: the call statement does not throw again)
	it('US3-3: the exceptional definitions of the callee reach the catch of the caller (us3-3)', function () {
		shouldHavePairs('us3-3.js', ['x: L3 -> L10', 'x: L1 -> L10'], ['x: L5 -> L10']);
	});

	/// P14 (a guard, holding already): the call of the finally block kills on both paths
	it('US3-4: a call in a finally block kills the definitions before it on both paths (m2-mdn-finally)', function () {
		shouldHavePairs('m2-mdn-finally.js', ['opened: L3 -> L16', 'opened: L9 -> L22'],
			['opened: L1 -> L16', 'opened: L1 -> L22']);
	});

	/// P15 (D2): s() in t is linked to s; x of L3 (L4 throwing) leaves s, then t, then the page without a try,
	/// enters the LOOP and reaches the handler h; x of L9 by the normal return, x of L1 by the page throwing first
	it('US3-5: an exception along the chain of calls enters the LOOP (g4-chain-loop)', function () {
		var result = analyze(fs.readFileSync(path.join(PROBES, 'g4-chain-loop.js'), 'utf8')),
			pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
			callNode = null;
		pageModels.intraProceduralModels.forEach(function (model) {
			if (model.mainlyRelatedScope.name.split('.').pop() !== 't') {
				return;
			}
			model.graph[2].forEach(function (node) {
				if (node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE && node.line === 8) {
					callNode = callNode || node;
				}
			});
		});
		callResolver.calleeScopesOf(callNode, result.scopeTree).map(function (scope) {
			return scope.name.split('.').pop();
		}).should.eql(['s']);
		var pairs = result.intraPage();
		['x: L3 -> L12', 'x: L9 -> L12', 'x: L1 -> L12'].forEach(function (pair) {
			pairs.should.containEql(pair, 'g4-chain-loop.js should have ' + pair);
		});
	});

	/// P17: the rethrow of the catch body goes through the finally block before it leaves f
	it('US3-6: a rethrow leaves the callee through its finally block (m3-mdn-finally-return)', function () {
		shouldHavePairs('m3-mdn-finally-return.js', ['r: L10 -> L16', 'r: L10 -> L18'], []);
	});

	/// P25 (a guard, holding already): the call statement may throw before the call, with x of L6
	it('US3-7: the call statement throwing before the call carries the definitions before it (c-nt)', function () {
		shouldHavePairs('c-nt.js', ['x: L6 -> L9'], []);
	});

	/// The reachability of the exceptionalReturn (US3 review R1, T102 (e)): the CALL NODE inserted before a
	/// decision has no exception edge, so the catch is reached only by the exceptionalReturn of the call
	/// record. Without it the catch and its pairs vanish (checked by removing that rule of the solver).
	it('reaches the catch by the exceptionalReturn of a call before a decision', function () {
		shouldHavePairsIn(pairsOfCode([
			'var x = 0;',
			'x = 1;',
			'function h() { throw new Error(); }',
			'try {',
			'  if (h()) {',
			'    x = 2;',
			'  }',
			'} catch (e) {',
			'  console.log(x);',
			'}'
		].join('\n')), 'if (h())', ['x: L2 -> L9'], ['x: L6 -> L9']);
		/// the program of the review (h returning normally): x of L2 reaches the use of L6
		shouldHavePairsIn(pairsOfCode([
			'function h() { return true; }',
			'var x = 1;',
			'try {',
			'  if (h()) { x = 2; }',
			'} catch (e) {',
			'  use(x);',
			'}'
		].join('\n')), 'if (h()) (review)', ['x: L2 -> L6'], []);
	});

	/// A chain of calls at one node: new A().m() calls the constructor, then m from the CALL RETURN NODE of
	/// the constructor (the CALL NODE of m, with no exception edge of its own). From feature 007 User Story 2
	/// new A() and .m() are two call sites of the node (new A() the constructor, .m() m only), chained in
	/// evaluation order by calleeScopesOf. a().b() is not linked (the object of b is a call), so the chain is
	/// written with new. The definitions m makes before it
	/// throws go out through the exceptionalReturn of the later call: to the catch, or to the exit of t and
	/// on through the exceptional summary of t.
	it('carries the exceptional definitions of the later call of a chain to the catch and to the exit', function () {
		var classA = [
			'var x = 1;',
			'class A {',
			'  constructor() {',
			'  }',
			'  m() {',
			'    x = 2;',
			'    throw new Error();',
			'  }',
			'}'
		];
		var result = analyze(classA.concat(['try {', '  new A().m();', '} catch (e) {', '  console.log(x);', '}']).join('\n')),
			pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
			calleesAtL11 = [];
		pageModels.intraProceduralModels.forEach(function (model) {
			if (model.mainlyRelatedScope !== result.scopeTree.root) {
				return;
			}
			model.graph[2].forEach(function (node) {
				if (node.line === 11) {
					calleesAtL11 = callResolver.calleeScopesOf(node, result.scopeTree);
				}
			});
		});
		calleesAtL11.length.should.eql(2, 'the constructor and m are chained at L11');
		/// two call sites (feature 007 User Story 2), one callee each
		pageModels.intraProceduralModels.forEach(function (model) {
			if (model.mainlyRelatedScope !== result.scopeTree.root) {
				return;
			}
			model.graph[2].forEach(function (node) {
				if (node.line === 11) {
					require('../../lib/dujs/callsplit').planOf(node, result.scopeTree)
						.callSites.map(function (entry) {
							return entry.kind + ':' + entry.callees.length;
						}).should.eql(['new:1', 'call:1']);
				}
			});
		});
		shouldHavePairsIn(pairsOfCode(classA.concat(['try {', '  new A().m();', '} catch (e) {', '  console.log(x);', '}']).join('\n')),
			'new A().m() in try', ['x: L1 -> L13', 'x: L6 -> L13'], []);
		shouldHavePairsIn(pairsOfCode(classA.concat(['function t() {', '  new A().m();', '}', 'try {', '  t();', '} catch (e) {',
			'  console.log(x);', '}']).join('\n')), 'new A().m() in t', ['x: L1 -> L16', 'x: L6 -> L16'], []);
	});
});
