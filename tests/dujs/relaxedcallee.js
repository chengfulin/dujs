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
	path = require('path'),
	childProcess = require('child_process');
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

	/// negative cases of the US2 review (R1, T102 (g)): the binding of the callee is not a function of the
	/// page with one definition. The inner name K of a class expression is bound to the class
	it('does not link the inner name of a class expression', function () {
		var result = analyzeProgram(['var x = 0;', 'var C = class K {', '  m() {', '    x = 1;', '    K();',
			'    console.log(x);', '  }', '};', 'new C().m();']);
		calleesAt(result, '$ANONYMOUS_FUN_0', 5).should.eql([]);
		shouldHavePairs(result, ['x: L4 -> L6'], []);
	});

	/// the loop variable of for (var f of ...) is another definition of the var f of function f
	it('does not link f() when for (var f of ...) also defines f', function () {
		var result = analyzeProgram(['var x = 0;', 'function f() {', '  x = 7;', '}', 'function a() {', '  x = 1;', '  f();',
			'  console.log(x);', '}', 'for (var f of []) {}', 'a();']);
		calleesAt(result, 'a', 7).should.eql([]);
		shouldHavePairs(result, ['x: L6 -> L8'], ['x: L3 -> L8']);
	});

	/// f = ... in another function is another definition of f (the page-level f = g is the two
	/// definitions case above)
	it('does not link f() when another function assigns f', function () {
		var result = analyzeProgram(['var x = 0;', 'function f() {', '  x = 7;', '}', 'function a() {', '  x = 1;', '  f();',
			'  console.log(x);', '}', 'function b() {', '  f = function () {};', '}', 'a();']);
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

/*
 * T103 (FR-003): the relaxed callees of D2 make chains of registrations where
 * a handler is registered again by itself or by a handler it registers
 * (handler -> linked recursion -> registration of the handler); the search of
 * handlers never ended, and following each chain once still grew with the
 * simple paths of the registrations (factorial). When the registrations have
 * such a cycle, each handler is searched and listed once in the order first
 * found (the event loop already runs a registered handler any number of
 * times, so the pairs are the same); without a cycle the list keeps the order
 * and the duplicates of the search as before feature 005.
 *
 * Whether the analysis ends is asserted in a child process killed after a
 * timeout (tests/helpers/eventhandlers.js): the timeout of mocha cannot stop a
 * synchronous endless loop, so a regression would hang npm test.
 */
describe('handlers registered again in a linked recursion (feature 005 T103, FR-003)', function () {
	'use strict';
	this.timeout(30000);

	var HELPER = path.join(__dirname, '..', 'helpers', 'eventhandlers.js');
	var CHILD_TIMEOUT = 20000;

	/**
	 * Analyze a program in a child process killed after CHILD_TIMEOUT ms
	 * @param {Array} lines lines of the program
	 * @returns {Object} handlers (last parts of the scope names of the handlers
	 * of the event edges of the intra-page model) and pairsOfX (pairs of x of
	 * the intra-page model)
	 */
	function analyzeInChild(lines) {
		var child = childProcess.spawnSync(process.execPath, [HELPER], {
			input: lines.join('\n'),
			encoding: 'utf8',
			timeout: CHILD_TIMEOUT
		});
		(child.error === undefined && child.signal === null).should.eql(true,
			'the analysis did not end in ' + CHILD_TIMEOUT + ' ms (' + (child.error || child.signal) + ')');
		child.status.should.eql(0, child.stderr);
		return JSON.parse(child.stdout);
	}

	/**
	 * A function k registering n handlers h0...h(n-1), each calling k (linked by D2)
	 * @param {number} n
	 * @returns {Array} lines of the program
	 */
	function handlersCallingTheRegisteringFunction(n) {
		var lines = ['var x = 0;', 'function k() {'], index;
		for (index = 0; index < n; ++index) {
			lines.push('function h' + index + '() { x = x + 1; k(); }');
		}
		for (index = 0; index < n; ++index) {
			lines.push('document.addEventListener(\'e' + index + '\', h' + index + ');');
		}
		lines.push('}', 'k();', 'var y = x;');
		return lines;
	}

	/// k -> h -> k (k() in h linked by D2) and h is a handler registered in k;
	/// k never returns normally, so x of L3 has no use
	it('terminates when the handler h in a function k calls k (k -> h -> k)', function () {
		var result = analyzeInChild([
			'var x = 0;',
			'function k() {',
			'function h() { x = 1; k(); }',
			'document.addEventListener(\'click\', h);',
			'h();',
			'}',
			'k();'
		]);
		result.handlers.should.eql(['h']);
		result.pairsOfX.should.eql([]);
	});

	it('terminates when the handler in the linked recursion may stop calling', function () {
		var program = [
			'var x = 0;',
			'function k() {',
			'function h() {',
			'x = x + 1;',
			'k();',
			'}',
			'document.addEventListener(\'click\', h);',
			'if (x < 5) {',
			'h();',
			'}',
			'}',
			'k();',
			'var y = x;'
		];
		var result = analyzeInChild(program);
		result.handlers.should.eql(['h']);
		result.pairsOfX.should.eql([
			'x: L1 -> L13', 'x: L1 -> L4', 'x: L1 -> L8>L9:T', 'x: L1 -> L8>exit:F',
			'x: L4 -> L13', 'x: L4 -> L4', 'x: L4 -> L8>L9:T', 'x: L4 -> L8>exit:F'
		]);
		/// the analysis ends (asserted above), so it is safe in this process
		calleesAt(analyzeProgram(program), 'h', 5).map(lastPartOf).should.eql(['k']);
	});

	/// a registers b, the handler b calls a (linked by D2): b registers itself through a
	it('terminates with mutually recursive functions, one of them a handler', function () {
		var program = [
			'var x = 0;',
			'function a() {',
			'document.addEventListener(\'click\', b);',
			'}',
			'function b() {',
			'x = x + 1;',
			'a();',
			'}',
			'a();',
			'var y = x;'
		];
		var result = analyzeInChild(program);
		result.handlers.should.eql(['b']);
		result.pairsOfX.should.eql(['x: L1 -> L10', 'x: L1 -> L6', 'x: L6 -> L6']);
		calleesAt(analyzeProgram(program), 'b', 7).map(lastPartOf).should.eql(['a']);
	});

	/// h and g are handlers of k and each calls the other or k: each registers
	/// both handlers. Each handler is listed once (it was listed once per chain
	/// of registrations, ['h', 'g', 'g', 'h']); the pairs are the same as with
	/// the list per chain
	it('terminates with two handlers in a function registering each other', function () {
		var result = analyzeInChild([
			'var x = 0;',
			'function k() {',
			'function h() {',
			'x = x + 1;',
			'g();',
			'}',
			'function g() {',
			'x = x * 2;',
			'k();',
			'}',
			'document.addEventListener(\'click\', h);',
			'document.addEventListener(\'keyup\', g);',
			'}',
			'k();',
			'var y = x;'
		]);
		result.handlers.should.eql(['h', 'g']);
		result.pairsOfX.should.eql([
			'x: L1 -> L15', 'x: L1 -> L4', 'x: L1 -> L8',
			'x: L4 -> L4', 'x: L4 -> L8', 'x: L8 -> L4', 'x: L8 -> L8'
		]);
	});

	/// review R4 (T102 (h)): g is registered by the page and by k, and h and k
	/// call each other (k registers h and may call it, h calls k): the
	/// registrations have a cycle, so g is listed once although two models
	/// register it. x of L3 (g) reaches h (L7) only through the event loop, so
	/// neither the decision of k (L12) nor var y = x (L18) reads it
	it('lists once a handler registered by the page and in the cycle (k <-> h)', function () {
		var result = analyzeInChild([
			'var x = 0;',
			'function g() {',
			'x = 2;',
			'}',
			'function k() {',
			'function h() {',
			'x = x + 1;',
			'k();',
			'}',
			'document.addEventListener(\'click\', g);',
			'document.addEventListener(\'keyup\', h);',
			'if (x < 3) {',
			'h();',
			'}',
			'}',
			'document.addEventListener(\'click\', g);',
			'k();',
			'var y = x;'
		]);
		result.handlers.should.eql(['g', 'h']);
		result.pairsOfX.should.eql([
			'x: L1 -> L12>L13:T', 'x: L1 -> L12>exit:F', 'x: L1 -> L18', 'x: L1 -> L7',
			'x: L3 -> L7',
			'x: L7 -> L12>L13:T', 'x: L7 -> L12>exit:F', 'x: L7 -> L18', 'x: L7 -> L7'
		]);
	});

	/// a handler of the page registering itself
	it('terminates with a handler of the page registering itself', function () {
		var result = analyzeInChild([
			'var x = 0;',
			'function h() {',
			'x = x + 1;',
			'document.addEventListener(\'click\', h);',
			'}',
			'document.addEventListener(\'click\', h);',
			'var y = x;'
		]);
		result.handlers.should.eql(['h']);
		result.pairsOfX.should.eql(['x: L1 -> L3', 'x: L1 -> L7', 'x: L3 -> L3']);
	});

	/// review R1: following each chain of registrations once listed 4, 15, 64,
	/// 325, 1956, 13699 handlers for n = 2...7 and did not end in minutes for
	/// n = 8; each handler is now listed once
	[3, 8, 12].forEach(function (n) {
		it('ends quickly with ' + n + ' handlers each calling the function registering them', function () {
			var result = analyzeInChild(handlersCallingTheRegisteringFunction(n));
			result.handlers.should.eql(Array.from({length: n}, function (ignored, index) {
				return 'h' + index;
			}));
			/// x of L1 reaches each handler (L3...L(n+2)) and var y = x of
			/// L(2n+5); x of each handler reaches each handler
			var expected = ['x: L1 -> L' + (2 * n + 5)], def, use;
			for (def = 3; def <= n + 2; ++def) {
				expected.push('x: L1 -> L' + def);
				for (use = 3; use <= n + 2; ++use) {
					expected.push('x: L' + def + ' -> L' + use);
				}
			}
			result.pairsOfX.slice().sort().should.eql(expected.sort());
		});
	});
});
