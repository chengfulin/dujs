/*
 * Acceptance tests of User Story 2 of feature 005 (D2, FR-005, research R8,
 * contracts/acceptance.md US2-1...7): a call f() in a function, where no
 * definition of f reaches the call in the intra-procedural model, is linked
 * to the function when the binding of f has only one definition on the page,
 * the definition is a function and the binding is a function declaration
 * (also in a block), a let or const binding or the name of a named function
 * expression; self and mutual recursion are linked and the summaries reach a
 * fixed point. new F() in a function is not relaxed, nor a call on the page
 * (also in a block of the page).
 *
 * Linking is asserted by the callees of the call node (callresolver on the
 * intra-procedural original) and by the related scopes of the
 * inter-procedural model of the page; pairs on the inter-procedural model of
 * the page and on the intra-page model. The programs are the probes of
 * tests/dujs/cases/probes005/ or embedded variants of US2-2.
 *
 * - US1-7 c-noret.js needs the self recursion of D2 (f has no normal return,
 *   so L7 is unreachable) and is accepted here.
 * - P30 c-win.js is a known limitation (README): window.f = ... is not a
 *   definition of f, so f() of L8 is linked to the declaration of f; the test
 *   characterizes the wrong link.
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
 * Analyze a probe file or an embedded program
 * @param {string|Array} program file name of a probe, or the lines of a program
 * @returns {Object} result of the analyze helper
 */
function analyzeProgram(program) {
	'use strict';
	return analyze(Array.isArray(program) ? program.join('\n') : fs.readFileSync(path.join(PROBES, program), 'utf8'));
}

/**
 * Last part of the name of a scope ($DOMAIN.$PAGE_0.a.f -> f)
 * @param {Scope} scope
 * @returns {string}
 */
function lastPartOf(scope) {
	'use strict';
	return scope.name.split('.').pop();
}

/**
 * The first node of a line in the intra-procedural model of a scope
 * @param {Object} result
 * @param {string} scopeName last part of the name of the scope
 * @param {number} line
 * @returns {FlowNode}
 */
function nodeAt(result, scopeName, line) {
	'use strict';
	var found = null;
	modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
		if (lastPartOf(model.mainlyRelatedScope) !== scopeName) {
			return;
		}
		model.graph[2].forEach(function (node) {
			if (node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE &&
				node.line === line && !found) {
				found = node;
			}
		});
	});
	(!!found).should.eql(true, 'no node at L' + line + ' of ' + scopeName);
	return found;
}

/**
 * The callee scopes of the node of a line
 * @param {Object} result
 * @param {string} scopeName last part of the name of the calling scope
 * @param {number} line
 * @returns {Array} Scopes
 */
function calleesAt(result, scopeName, line) {
	'use strict';
	return callResolver.calleeScopesOf(nodeAt(result, scopeName, line), result.scopeTree);
}

/**
 * The inter-procedural model of the page
 * @param {Object} result
 * @returns {Model|undefined} undefined when no call of the page is linked
 */
function pageInterModelOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels.filter(function (model) {
		return model.mainlyRelatedScope === result.scopeTree.root;
	})[0];
}

/**
 * Last parts of the names of the related scopes of the inter-procedural model of the page
 * @param {Object} result
 * @returns {Array}
 */
function relatedOf(result) {
	'use strict';
	return pageInterModelOf(result).relatedScopes.map(lastPartOf);
}

/**
 * Pairs of the inter-procedural model of the page (when the page has one, i.e.
 * a linked call) and of the intra-page model
 * @param {Object} result
 * @returns {Array} arrays of pairs
 */
function pairsOfModels(result) {
	'use strict';
	var interModel = pageInterModelOf(result);
	return (!!interModel ? [analyze.pairsOfModel(interModel)] : []).concat([result.intraPage()]);
}

/**
 * Assert the pairs of the inter-procedural model of the page and of the intra-page model
 * @param {Object} result
 * @param {Array} present pairs expected
 * @param {Array} absent pairs not expected
 */
function shouldHavePairs(result, present, absent) {
	'use strict';
	pairsOfModels(result).forEach(function (pairs) {
		present.forEach(function (pair) {
			pairs.should.containEql(pair);
		});
		absent.forEach(function (pair) {
			pairs.should.not.containEql(pair);
		});
	});
}

/**
 * P3 with another definition of f (lines 2-4)
 * @param {Array} definition three lines
 * @returns {Array} lines of the program
 */
function p3With(definition) {
	'use strict';
	return ['var x = 0;'].concat(definition, ['function a() {', 'x = 1;', 'f();', 'console.log(x);', '}', 'a();']);
}

describe('relaxed callees in functions (feature 005 US2, D2)', function () {
	'use strict';
	after(analyze.reset);

	/// P3: no definition of f reaches L7 in a; f is declared once on the page
	it('US2-1: f() in a function is linked to the function declaration of the page (p3)', function () {
		var result = analyzeProgram('p3.js');
		calleesAt(result, 'a', 7).map(lastPartOf).should.eql(['f']);
		relatedOf(result).should.containEql('f');
		shouldHavePairs(result, ['x: L3 -> L8'], ['x: L6 -> L8']);
	});

	it('US2-2: f() is linked to a function expression bound by let (us2-2-let)', function () {
		var result = analyzeProgram('us2-2-let.js');
		calleesAt(result, 'a', 5).length.should.eql(1);
		relatedOf(result).length.should.eql(3);
		shouldHavePairs(result, ['x: L2 -> L6'], ['x: L4 -> L6']);
	});

	it('US2-2: f() is linked to an arrow function bound by const', function () {
		var result = analyzeProgram(p3With(['const f = () => {', 'x = 7;', '};']));
		calleesAt(result, 'a', 7).length.should.eql(1);
		relatedOf(result).length.should.eql(3);
		shouldHavePairs(result, ['x: L3 -> L8'], ['x: L6 -> L8']);
	});

	/// var f = function has two definitions (the undefined initial value and the function)
	it('US2-2: f() is not linked to a function expression bound by var', function () {
		var result = analyzeProgram(p3With(['var f = function () {', 'x = 7;', '};']));
		calleesAt(result, 'a', 7).should.eql([]);
		shouldHavePairs(result, ['x: L6 -> L8'], ['x: L3 -> L8']);
	});

	it('US2-2: f() is not linked when f has two definitions on the page', function () {
		var result = analyzeProgram(['var x = 0;', 'function f() {', 'x = 7;', '}', 'function a() {', 'x = 1;', 'f();',
			'console.log(x);', '}', 'function g() {}', 'f = g;', 'a();']);
		calleesAt(result, 'a', 7).should.eql([]);
		shouldHavePairs(result, ['x: L6 -> L8'], ['x: L3 -> L8']);
	});

	it('US2-2: new f() in a function is not relaxed', function () {
		var result = analyzeProgram(['var x = 0;', 'function f() {', 'x = 7;', '}', 'function a() {', 'x = 1;',
			'new f();', 'console.log(x);', '}', 'a();']);
		calleesAt(result, 'a', 7).should.eql([]);
		shouldHavePairs(result, ['x: L6 -> L8'], ['x: L3 -> L8']);
	});

	/// the call is in a block of the page (a dujs block scope, by let y), not in a function
	it('does not relax a call in a block of the page', function () {
		var result = analyzeProgram(['var x = 0, c = 1;', 'if (c) {', 'let y = 2;', 'f();', 'console.log(x, y);', '}',
			'const f = () => {', 'x = 7;', '};']);
		calleesAt(result, '$PAGE_0', 4).should.eql([]);
		shouldHavePairs(result, ['x: L1 -> L5'], ['x: L8 -> L5']);
	});

	/// P7: mutual recursion; the summaries of even and odd reach a fixed point
	it('US2-3: mutually recursive functions are linked and the analysis terminates (p7)', function () {
		var result = analyzeProgram('p7.js');
		calleesAt(result, 'even', 5).map(lastPartOf).should.eql(['odd']);
		calleesAt(result, 'odd', 11).map(lastPartOf).should.eql(['even']);
		relatedOf(result).should.containEql('odd');
		shouldHavePairs(result, ['n: L4 -> L9>L10:T', 'n: L10 -> L3>L4:T', 'n: L1 -> L15', 'n: L4 -> L15', 'n: L10 -> L15'], []);
	});

	/// P12 (a guard): a local definition of f reaches L7, the strict rule links it
	it('US2-4: f() with a reaching local function is linked by the strict rule (g1-local-fn)', function () {
		var result = analyzeProgram('g1-local-fn.js');
		calleesAt(result, 'a', 7).map(function (scope) {
			return scope.name.split('.').slice(-2).join('.');
		}).should.eql(['a.f']);
		shouldHavePairs(result, ['x: L4 -> L8'], ['x: L6 -> L8']);
	});

	/// P10: self recursion of a function declaration
	it('US2-5: the self recursion of a function declaration is linked (p10-self-rec)', function () {
		var result = analyzeProgram('p10-self-rec.js');
		calleesAt(result, 'f', 5).map(lastPartOf).should.eql(['f']);
		shouldHavePairs(result, ['n: L4 -> L3>L4:T', 'n: L1 -> L9', 'n: L4 -> L9'], []);
	});

	/// P11: self recursion by the inner name of a named function expression
	it('US2-6: the self recursion by the name of a named function expression is linked (p11-named-fe)', function () {
		var result = analyzeProgram('p11-named-fe.js'),
			callees = calleesAt(result, '$ANONYMOUS_FUN_0', 5);
		callees.length.should.eql(1);
		callees[0].should.equal(nodeAt(result, '$ANONYMOUS_FUN_0', 5).scope);
		shouldHavePairs(result, ['n: L4 -> L3>L4:T', 'n: L1 -> L9', 'n: L4 -> L9'], []);
	});

	/// P29 (a guard): the binding of a function declared in a block is only in the block (006 D5)
	it('US2-7: f() out of the block of its declaration is not linked (c-blk)', function () {
		var result = analyzeProgram('c-blk.js');
		calleesAt(result, 'a', 9).should.eql([]);
		shouldHavePairs(result, ['x: L8 -> L10'], ['x: L4 -> L10']);
	});

	/// P27: f never returns normally (its self call is linked by D2), so L7 is unreachable
	it('US1-7: no pair uses x at L7 after a callee without a normal return (c-noret)', function () {
		var result = analyzeProgram('c-noret.js');
		calleesAt(result, 'f', 4).map(lastPartOf).should.eql(['f']);
		pairsOfModels(result).forEach(function (pairs) {
			pairs.filter(function (pair) {
				return /^x: .* -> L7$/.test(pair);
			}).should.eql([]);
		});
	});

	/// P30 (characterization of a known limitation, README): window.f = ... is not a definition of f,
	/// so f() of L8 is linked to the declaration of f; x of L3 reaches L9 and x of L7 does not
	it('P30 limitation: f() is linked to the declaration though window.f is reassigned (c-win)', function () {
		var result = analyzeProgram('c-win.js');
		calleesAt(result, 'a', 8).map(lastPartOf).should.eql(['f']);
		shouldHavePairs(result, ['x: L3 -> L9'], ['x: L7 -> L9']);
	});
});
