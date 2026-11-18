/*
 * Acceptance tests of splitting the nodes with calls into the segments
 * before and after each call (specs/007-split-call-nodes, KI §16, §22 (3),
 * contracts/acceptance.md). Original dujs code, MIT License (see LICENSE).
 *
 * The probe programs are copied verbatim from
 * specs/007-split-call-nodes/probes to tests/dujs/cases/probes007 (T002); the
 * expected pairs are those of spec.md. This file starts with the shared
 * helpers and the guards that hold in every phase (T018):
 * - FR-006: the pairs of the intra-procedural model of the page of every
 *   probe are the same as specs/007-split-call-nodes/probes/baseline-develop.txt
 *   (the "intra(page)" lines of develop edc22d5);
 * - P23 (IIFE): the whole result is the same as the baseline (not connected,
 *   not split).
 * The scenarios of each user story are added by its phase.
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl');

var PROBES = path.join(__dirname, 'cases', 'probes007'),
	BASELINE = path.join(__dirname, '..', '..', 'specs', '007-split-call-nodes', 'probes', 'baseline-develop.txt'),
	PAGE = '$DOMAIN.$PAGE_0';

/**
 * File names of the probe programs (sorted)
 * @returns {Array}
 */
function probeNames() {
	'use strict';
	return fs.readdirSync(PROBES).filter(function (name) {
		return /\.js$/.test(name);
	}).sort();
}

/**
 * Analyze a probe program
 * @param {string} name File name, with or without the extension .js
 * @returns {Object} result of the analyze helper
 */
function analyzeProbe(name) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, /\.js$/.test(name) ? name : name + '.js'), 'utf8'));
}

/**
 * Models of the page of an analyzed program
 * @param {Object} result
 * @returns {PageModels}
 */
function pageModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree);
}

/**
 * The inter-procedural model whose related scopes are the given ones (in order)
 * @param {Object} result
 * @param {Array} scopeNames
 * @returns {Model}
 */
function interModelOf(result, scopeNames) {
	'use strict';
	var found = null;
	pageModelsOf(result).interProceduralModels.forEach(function (model) {
		if (model.relatedScopes.map(String).join('|') === scopeNames.join('|')) {
			found = model;
		}
	});
	(!!found).should.eql(true, 'no inter-procedural model of ' + scopeNames.join(', '));
	return found;
}

/**
 * Pairs of the inter-procedural model whose related scopes are the given ones
 * @param {Object} result
 * @param {Array} scopeNames
 * @returns {Array}
 */
function interPairsOf(result, scopeNames) {
	'use strict';
	return analyze.pairsOfModel(interModelOf(result, scopeNames));
}

/**
 * Assert the pairs that a list has and has not
 * @param {Array} pairs
 * @param {Array} [present]
 * @param {Array} [absent]
 */
function shouldHavePairs(pairs, present, absent) {
	'use strict';
	(present || []).forEach(function (pair) {
		pairs.should.containEql(pair);
	});
	(absent || []).forEach(function (pair) {
		pairs.should.not.containEql(pair);
	});
}

/**
 * Assert the pairs of the inter-procedural model (when given) and of the
 * intra-page model: the pairs present and absent in both
 * @param {Object} result
 * @param {Array|null} scopeNames Related scopes of the inter-procedural model, null for none
 * @param {Array} [present]
 * @param {Array} [absent]
 */
function shouldHavePairsInModels(result, scopeNames, present, absent) {
	'use strict';
	if (!!scopeNames) {
		shouldHavePairs(interPairsOf(result, scopeNames), present, absent);
	}
	shouldHavePairs(result.intraPage(), present, absent);
}

/**
 * Call edges of the hierarchy of a model and of its units (each model once),
 * depth first: "<caller scope> L<line> -> <callee scope>" ("=>" and " (back)"
 * for a back call edge)
 * @param {Model} model
 * @returns {Array}
 */
function callEdgesOf(model) {
	'use strict';
	var edges = [], visited = [];
	function walk(each) {
		if (!each.hierarchy || visited.indexOf(each) !== -1) {
			return;
		}
		visited.push(each);
		each.hierarchy.edges.forEach(function (edge) {
			if (edge.kind !== 'call') {
				return;
			}
			edges.push(String(edge.caller.scope) + ' L' + edge.callSite.line + (edge.back ? ' => ' : ' -> ') +
				String(edge.callee.scope) + (edge.back ? ' (back)' : ''));
			if (!edge.back) {
				walk(edge.calleeModel);
			}
		});
	}
	walk(model);
	return edges;
}

/**
 * The result of a probe in the format of specs/007-split-call-nodes/probes/run.js
 * @param {string} name File name of the probe
 * @returns {Array} lines
 */
function probeOutput(name) {
	'use strict';
	var lines = [], result;
	try {
		result = analyzeProbe(name);
	} catch (err) {
		return ['ERROR: ' + err.message.split('\n')[0]];
	}
	var pageModels = pageModelsOf(result);
	lines.push('scopes: ' + result.scopeNames().join(', '));
	pageModels.interProceduralModels.forEach(function (model, index) {
		lines.push('inter[' + index + '] (' + model.relatedScopes.map(String).join(', ') + ', nodes ' +
			model.graph[2].length + '): ' + analyze.pairsOfModel(model).join(' | '));
	});
	lines.push('intra(page): ' + result.intraProcedural().join(' | '));
	lines.push('intra-page (nodes ' + pageModels.intraPageModels[0].graph[2].length + '): ' +
		result.intraPage().join(' | '));
	return lines;
}

/**
 * The lines of each probe in the baseline of develop
 * @returns {Object} probe file name -> Array of lines
 */
function baselineBlocks() {
	'use strict';
	var blocks = {}, current = null;
	fs.readFileSync(BASELINE, 'utf8').split('\n').forEach(function (line) {
		var start = /^=== (.+)$/.exec(line);
		if (!!start) {
			current = start[1];
			blocks[current] = [];
		} else if (!!current && line !== '') {
			blocks[current].push(line);
		}
	});
	return blocks;
}

describe('splitting the nodes with calls (feature 007)', function () {
	'use strict';
	var baseline = baselineBlocks();

	after(analyze.reset);

	it('should have a baseline of every probe', function () {
		probeNames().forEach(function (name) {
			baseline.should.have.property(name);
		});
	});

	describe('FR-006: the intra-procedural model of the page is not changed', function () {
		probeNames().forEach(function (name) {
			it('should keep the intra(page) pairs of ' + name, function () {
				var expected = (baseline[name] || []).filter(function (line) {
					return /^intra\(page\): /.test(line);
				});
				expected.length.should.eql(1, 'no intra(page) line of ' + name + ' in the baseline');
				probeOutput(name).filter(function (line) {
					return /^intra\(page\): /.test(line);
				}).should.eql(expected);
			});
		});
	});

	describe('P23: an IIFE is neither connected nor split', function () {
		it('should give the result of develop', function () {
			probeOutput('p23-iife.js').should.eql(baseline['p23-iife.js']);
			var result = analyzeProbe('p23-iife');
			pageModelsOf(result).interProceduralModels.length.should.eql(0);
			shouldHavePairsInModels(result, null, ['x: L1 -> L6'], []);
		});
	});

	/// User Story 1 (T020): the definitions and reads evaluated before a call take effect before the callee runs
	describe('US1: the part before a call takes effect before the callee', function () {
		var F = [PAGE, PAGE + '.f'];

		it('US1-1 should give x: L5 -> L3 and not x: L1 -> L3 (p1, if (f(x = 1)))', function () {
			shouldHavePairsInModels(analyzeProbe('p1-ki16'), F, ['x: L5 -> L3'], ['x: L1 -> L3']);
		});

		it('US1-2 should give x: L5 -> L3 and x: L5 -> L6, not x: L1 -> L3 (p12, f(x = 1);)', function () {
			shouldHavePairsInModels(analyzeProbe('p12-stmt-arg'), F, ['x: L5 -> L3', 'x: L5 -> L6'], ['x: L1 -> L3']);
		});

		/// guard: the bypass of 004 FR-016 still holds
		it('US1-3 should give a: L2 -> L3 and a: L2 -> L6 (p2, if (check(a) || b))', function () {
			shouldHavePairsInModels(analyzeProbe('p2-ki16-shadow'), [PAGE, PAGE + '.check'],
				['a: L2 -> L3', 'a: L2 -> L6'], []);
		});

		/// guard: the read of the callee is still a p-use of the decision node (deferred to its branches)
		it('US1-4 should give x: L3 -> L7 and the p-use f: entry -> L6>L7:T (p21, if (f()))', function () {
			var result = analyzeProbe('p21-callee-in-if-stmt');
			shouldHavePairsInModels(result, F, ['x: L3 -> L7', 'f: entry -> L6>L7:T'], ['f: entry -> L6']);
			interPairsOf(result, F).should.containEql('f: entry -> L6>exit:F');
			result.intraPage().should.containEql('f: entry -> L6>Lnull:F');
		});
	});

	/// DECISION 007: a case test left in the case node (not split, or the last operand of a split test) is not
	/// modeled; the operands split from a test are decision nodes whose reads and calls are modeled (as develop)
	describe('US1: case tests split into decision nodes (DECISION 007)', function () {
		var G = [PAGE, PAGE + '.g'];

		it('should connect g() of case g() && 1: (x: L3 -> L8, not x: L1 -> L8)', function () {
			var result = analyze([
				'var x = 0, d = 1;',
				'function g() {',
				'  x = 1;',
				'  return 1;',
				'}',
				'switch (d) {',
				'case g() && 1:',
				'  console.log(x);',
				'}'
			].join('\n'));
			shouldHavePairsInModels(result, G, ['x: L3 -> L8', 'g: entry -> L7>L7:T', 'g: entry -> L7>L7:F'],
				['x: L1 -> L8']);
			callEdgesOf(interModelOf(result, G)).should.eql([PAGE + ' L7 -> ' + PAGE + '.g']);
		});

		it('should not connect g() of case a && g(): (the last operand stays in the case node)', function () {
			var result = analyze([
				'var x = 0, d = 1, a = 1;',
				'function g() {',
				'  x = 1;',
				'  return 1;',
				'}',
				'switch (d) {',
				'case a && g():',
				'  console.log(x);',
				'}'
			].join('\n'));
			allCallEdgesOf(result).should.eql([]);
			shouldHavePairs(result.intraPage(), ['x: L1 -> L8', 'a: L1 -> L7>L7:T'], ['x: L3 -> L8']);
		});

		it('should connect the class static members in an operand split from a case test', function () {
			var result = analyze([
				'var x = 0, d = 1;',
				'switch (d) {',
				'case [class {',
				'  static y = (x = 1);',
				'}][0] && 1:',
				'  console.log(x);',
				'}'
			].join('\n'));
			allCallEdgesOf(result).should.eql([PAGE + ' L3 -> ' + PAGE + '.$ANONYMOUS_FUN_0']);
			shouldHavePairsInModels(result, [PAGE, PAGE + '.$ANONYMOUS_FUN_0'], ['x: L4 -> L6'], ['x: L1 -> L6']);
		});
	});

	/// T066 (DECISION 005 Q3 A, DECISION 006 Q4 must-fix 3, research R13 L2, L2'): the static members of a class
	/// in a position not listed as a call site are no longer connected. These are behavior changes relative to
	/// develop (edc22d5), which connected them through modelbuilder.expressionsEvaluatedAtNode:
	/// the case test is KI §44, the other positions are KI §46.
	describe('US1: class static members in the positions not listed as call sites (behavior change)', function () {
		/**
		 * Assert the static scope is not connected: no call edge from the page in any inter-procedural model.
		 * From User Story 2, g() in the static field initializer is a call site of the static scope itself:
		 * its only call edge is the one of its own model to g
		 * @param {Array} lines
		 */
		function shouldNotConnect(lines) {
			var result = analyze(lines.join('\n')),
				staticScope = PAGE + '.$ANONYMOUS_FUN_0';
			allCallEdgesOf(result).forEach(function (edge) {
				edge.should.match(new RegExp('^' + staticScope.replace(/\$/g, '\\$') + ' L\\d+ -> ' +
					(PAGE + '.g').replace(/\$/g, '\\$') + '$'));
			});
			return result;
		}
		var G = ['var x = 0, c = [], o = {}, v = 1;', 'function g() {', '  x = 1;', '}'];

		it('should not connect a class in a case test (behavior change relative to develop, KI §44)', function () {
			shouldNotConnect(G.concat(['switch (v) {', 'case class {', '  static y = g();', '}:', '  console.log(x);', '}']));
		});

		it('should not connect a class in a default of a destructuring pattern (behavior change relative to develop, KI §46)', function () {
			shouldNotConnect(G.concat(['var [z = class {', '  static y = g();', '}] = c;', 'console.log(x);']));
		});

		it('should not connect a class after ?. (behavior change relative to develop, KI §46)', function () {
			shouldNotConnect(G.concat(['c?.m(class {', '  static y = g();', '});', 'console.log(x);']));
		});

		it('should not connect a class in the left side of for-of (behavior change relative to develop, KI §46)', function () {
			shouldNotConnect(G.concat(['for (o[class {', '  static y = g();', '}] of c) {', '}', 'console.log(x);']));
		});

		it('should not connect a class in a default of a catch parameter (behavior change relative to develop, KI §46)', function () {
			shouldNotConnect(G.concat(['try {', '  x = 2;', '} catch ({a = class {', '  static y = g();', '}}) {',
				'  console.log(x);', '}']));
		});
	});

	/// User Story 2 (T032): the calls in expressions are call sites
	describe('US2: the calls in expressions are call sites', function () {
		var G = [PAGE, PAGE + '.g'],
			F = [PAGE, PAGE + '.f'];

		it('US2-1 should give x: L3 -> L7 and y: L6 -> L7, not x: L1 -> L7 (p3, var y = g();)', function () {
			var result = analyzeProbe('p3-assign');
			shouldHavePairsInModels(result, G, ['x: L3 -> L7', 'y: L6 -> L7'], ['x: L1 -> L7']);
			callEdgesOf(interModelOf(result, G)).should.eql([PAGE + ' L6 -> ' + PAGE + '.g']);
		});

		it('US2-2 should give d: L1 -> L3 (p4, KI §10, return g(); of a default parameter)', function () {
			var result = analyzeProbe('p4-ki10-return'),
				arrow = PAGE + '.f.$ANONYMOUS_FUN_0';
			shouldHavePairsInModels(result, [PAGE, PAGE + '.f', arrow], ['d: L1 -> L3'], []);
			callEdgesOf(interModelOf(result, [PAGE + '.f', arrow])).should.eql([PAGE + '.f L4 -> ' + arrow]);
		});

		it('US2-3 should give x: L1 -> L3 and x: L6 -> L7, not x: L6 -> L3 (p5, x = f();)', function () {
			shouldHavePairsInModels(analyzeProbe('p5-use-before-def'), F, ['x: L1 -> L3', 'x: L6 -> L7'], ['x: L6 -> L3']);
		});

		it('US2-4 should give x: L4 -> L8 and A: L2 -> L7, not x: L1 -> L8 (p10, var o = new A();)', function () {
			shouldHavePairsInModels(analyzeProbe('p10-new-var'), [PAGE, PAGE + '.$ANONYMOUS_FUN_0'],
				['x: L4 -> L8', 'A: L2 -> L7'], ['x: L1 -> L8']);
		});

		it('US2-5 should give x: L4 -> L10, not x: L1 -> L10 (p13, var r = o.m();)', function () {
			var result = analyzeProbe('p13-method-expr');
			shouldHavePairsInModels(result, [PAGE, PAGE + '.$ANONYMOUS_FUN_0'], ['x: L4 -> L10'], ['x: L1 -> L10']);
			callEdgesOf(interModelOf(result, [PAGE, PAGE + '.$ANONYMOUS_FUN_0'])).should.eql([
				PAGE + ' L9 -> ' + PAGE + '.$ANONYMOUS_FUN_0'
			]);
		});

		it('US2-6 should give x: L3 -> L10, not x: L1 -> L10 (p14, return g(); in f)', function () {
			var result = analyzeProbe('p14-return-in-fn');
			shouldHavePairsInModels(result, [PAGE, PAGE + '.f', PAGE + '.g'], ['x: L3 -> L10'], ['x: L1 -> L10']);
			callEdgesOf(interModelOf(result, [PAGE + '.f', PAGE + '.g'])).should.eql([PAGE + '.f L7 -> ' + PAGE + '.g']);
		});

		it('US2-7 should give x: L3 -> L7, not x: L1 -> L7 (p18, function f(a = g()))', function () {
			shouldHavePairsInModels(analyzeProbe('p18-default-param'), [PAGE, PAGE + '.f', PAGE + '.g'],
				['x: L3 -> L7'], ['x: L1 -> L7']);
		});

		it('US2-8 should give x: L3 -> L10, not x: L1 -> L10 (p19, field y = g();)', function () {
			var result = analyzeProbe('p19-field-init'),
				field = PAGE + '.$ANONYMOUS_FUN_0';
			shouldHavePairsInModels(result, [PAGE, field, PAGE + '.g'], ['x: L3 -> L10'], ['x: L1 -> L10']);
			callEdgesOf(interModelOf(result, [field, PAGE + '.g'])).should.eql([field + ' L7 -> ' + PAGE + '.g']);
		});

		/// the outer call console.log(...) is not resolved; f() in its arguments is a call site
		it('US2-9 should connect f() of console.log(f(), x) and give x: L3 -> L6, not x: L1 -> L6 (p22)', function () {
			var result = analyzeProbe('p22-unresolved-arg');
			shouldHavePairsInModels(result, F, ['x: L3 -> L6'], ['x: L1 -> L6']);
			allCallEdgesOf(result).should.eql([PAGE + ' L6 -> ' + PAGE + '.f']);
		});

		/// partial (DECISION 006 Q1): x: L3 -> L9 needs the exception edge of the segment after the return (US4, T052)
		it('US2-10 should connect f() of throw f(); and give x: L1 -> L9 (p25, partial)', function () {
			var result = analyzeProbe('p25-throw');
			shouldHavePairsInModels(result, F, ['x: L1 -> L9'], []);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L7 -> ' + PAGE + '.f']);
		});

		it('US2-11 should give x: L1 -> L6 and x: L3 -> L6 (p27, generator, KI §37)', function () {
			shouldHavePairsInModels(analyzeProbe('p27-generator'), G, ['x: L1 -> L6', 'x: L3 -> L6'], []);
		});

		/// new F() and .m() are two call sites: the constructor runs before x = 1, m after it
		it('US2-12 should give x: L1 -> L4 and x: L10 -> L7, not x: L10 -> L4 nor x: L1 -> L7 (p31)', function () {
			var result = analyzeProbe('p31-new-method-arg'),
				scopes = [PAGE, PAGE + '.$ANONYMOUS_FUN_0', PAGE + '.$ANONYMOUS_FUN_1'];
			shouldHavePairsInModels(result, scopes, ['x: L1 -> L4', 'x: L10 -> L7'], ['x: L10 -> L4', 'x: L1 -> L7']);
			callEdgesOf(interModelOf(result, scopes)).should.eql([
				PAGE + ' L10 -> ' + PAGE + '.$ANONYMOUS_FUN_0',
				PAGE + ' L10 -> ' + PAGE + '.$ANONYMOUS_FUN_1'
			]);
		});

		it('US2-13 should give x: L3 -> L8, not x: L1 -> L8 (p33, var h = () => g();)', function () {
			var result = analyzeProbe('p33-arrow-body'),
				arrow = PAGE + '.$ANONYMOUS_FUN_0';
			shouldHavePairsInModels(result, [PAGE, arrow, PAGE + '.g'], ['x: L3 -> L8'], ['x: L1 -> L8']);
			callEdgesOf(interModelOf(result, [arrow, PAGE + '.g'])).should.eql([arrow + ' L6 -> ' + PAGE + '.g']);
		});
	});

	/// T033 (DECISION 005, research R13): the positions not listed as call sites and the guard of a callee
	/// defined earlier in the same node; the pairs are those of develop (edc22d5)
	describe('US2: positions not listed as call sites (characterization)', function () {
		var HEAD = [
			'var x = 0, c = [], o = {}, a = [1];',
			'function f() {',
			'  x = 1;',
			'}',
			'function g() {',
			'  x = 3;',
			'}',
			'x = 2;'
		];

		/**
		 * Analyze HEAD, a line at L9 and console.log(x); at L10
		 * @param {string} line
		 * @returns {Object}
		 */
		function analyzeAt(line) {
			return analyze(HEAD.concat([line, 'console.log(x);']).join('\n'));
		}

		/// L5: evaluated conditionally in one node (after ?., defaults of destructuring patterns)
		[
			['c?.m(f());', 'c: L1 -> L9'],
			['c?.[f()];', 'c: L1 -> L9'],
			['var [z = f()] = c;', 'c: L1 -> L9'],
			['var {z = f()} = c;', 'c: L1 -> L9']
		].forEach(function (each) {
			it('should not connect f() of ' + each[0] + ' and keep x: L8 -> L10 (as develop)', function () {
				var result = analyzeAt(each[0]);
				allCallEdgesOf(result).should.eql([]);
				result.intraPage().should.eql([each[1], 'console: entry -> L10', 'f: entry -> L9', 'x: L8 -> L10']);
			});
		});

		/// L1 (DECISION 005 Q2 A, FR-001 exception): the left side of for-in/for-of
		it('should not connect g() of for (o[g()] of a) {} (as develop)', function () {
			var result = analyzeAt('for (o[g()] of a) {}');
			allCallEdgesOf(result).should.eql([]);
			result.intraPage().should.eql(['a: L1 -> L9', 'console: entry -> L10', 'o: L1 -> L9', 'o: L9 -> L9',
				'x: L8 -> L10']);
		});

		it('should not connect g() of for (var [z = g()] of a) {} (as develop)', function () {
			var result = analyzeAt('for (var [z = g()] of a) {}');
			allCallEdgesOf(result).should.eql([]);
			result.intraPage().should.eql(['a: L1 -> L9', 'console: entry -> L10', 'g: entry -> L9>L10:F',
				'g: entry -> L9>L9:T', 'x: L8 -> L10']);
		});

		/// L3: a callee defined earlier in the same node is resolved by the ReachIn of the node, which does not
		/// hold that definition: not connected
		it('should not connect f() of f = g, f(); (var f = h; as develop)', function () {
			var result = analyze([
				'var x = 0;', 'function h() {', '  x = 1;', '}', 'function g() {', '  x = 2;', '}',
				'var f = h;', 'f = g, f();', 'console.log(x);'
			].join('\n'));
			allCallEdgesOf(result).should.eql([]);
			result.intraPage().should.eql(['console: entry -> L10', 'f: L8 -> L9', 'g: entry -> L9', 'h: entry -> L8',
				'x: L1 -> L10']);
		});

		it('should not connect f() of f = g, f(); reached by a function expression (no pair through it)', function () {
			var result = analyze([
				'var x = 0;', 'function g() {', '  x = 2;', '}', 'var f = function () {', '  x = 1;', '};',
				'f = g, f();', 'console.log(x);'
			].join('\n'));
			allCallEdgesOf(result).should.eql([]);
			result.intraPage().should.eql(['console: entry -> L9', 'f: L5 -> L8', 'g: entry -> L8', 'x: L1 -> L9']);
		});

		it('should connect only new A() of var o = new A(), r = o.m();', function () {
			var result = analyze([
				'var x = 0;', 'class A {', '  constructor() {', '    x = 1;', '  }', '  m() {', '    x = 2;', '  }', '}',
				'var o = new A(), r = o.m();', 'console.log(x);'
			].join('\n'));
			allCallEdgesOf(result).should.eql([PAGE + ' L10 -> ' + PAGE + '.$ANONYMOUS_FUN_0']);
			shouldHavePairsInModels(result, [PAGE, PAGE + '.$ANONYMOUS_FUN_0'], ['x: L4 -> L11'], ['x: L7 -> L11']);
		});

		/// the callee is read before f = g: connected to f as develop
		it('should connect f() of f(f = g); (as develop)', function () {
			var result = analyze([
				'var x = 0;', 'function f() {', '  x = 1;', '}', 'function g() {', '  x = 2;', '}',
				'f(f = g);', 'console.log(x);'
			].join('\n'));
			allCallEdgesOf(result).should.eql([PAGE + ' L8 -> ' + PAGE + '.f']);
			shouldHavePairsInModels(result, [PAGE, PAGE + '.f'], ['x: L3 -> L9'], ['x: L1 -> L9']);
		});
	});

	/// DECISION 007 from User Story 2: the operands split from a case test (not the last one) are decision
	/// nodes, the calls in their expressions are call sites; the case node keeps its test unmodeled
	describe('US2: calls in the operands split from a case test (DECISION 007)', function () {
		var HEAD = [
			'var x = 0, d = 1, a = 1;',
			'function g() {',
			'  x = 1;',
			'  return 1;',
			'}',
			'function h(v) {',
			'  console.log(x);',
			'  return v;',
			'}',
			'switch (d) {'
		];

		it('should connect g() and then h() of case h(g()) && 1:', function () {
			var result = analyze(HEAD.concat(['case h(g()) && 1:', '  console.log(x);', '}']).join('\n')),
				scopes = [PAGE, PAGE + '.g', PAGE + '.h'];
			callEdgesOf(interModelOf(result, scopes)).should.eql([
				PAGE + ' L11 -> ' + PAGE + '.g',
				PAGE + ' L11 -> ' + PAGE + '.h'
			]);
			/// h reads x after g defines it
			shouldHavePairsInModels(result, scopes, ['x: L3 -> L7', 'x: L3 -> L12'], ['x: L1 -> L7', 'x: L1 -> L12']);
		});

		/// a && 1 in the arguments is split: the decision node a evaluates g() first; h(...) is the last operand,
		/// left in the case node (not modeled, as a case test not split): h is not connected
		it('should connect g() and not h() of case h(g(), a && 1):', function () {
			var result = analyze(HEAD.concat(['case h(g(), a && 1):', '  console.log(x);', '}']).join('\n'));
			allCallEdgesOf(result).should.eql([PAGE + ' L11 -> ' + PAGE + '.g']);
			shouldHavePairsInModels(result, [PAGE, PAGE + '.g'], ['x: L3 -> L12', 'a: L1 -> L11>L11:T'], ['x: L1 -> L12']);
		});
	});

	/// User Story 3 (T043): the reads, definitions and calls of a node in evaluation order; the discriminant
	/// of a switch and the right side of for-in/for-of are evaluated once
	describe('US3: evaluation order in a node and evaluated once', function () {
		var F = [PAGE, PAGE + '.f'];

		it('US3-1 should give x: L3 -> L7, not x: L1 -> L7 (p6, var y = f() + g();)', function () {
			var result = analyzeProbe('p6-two-calls'),
				scopes = [PAGE, PAGE + '.f', PAGE + '.g'];
			shouldHavePairsInModels(result, scopes, ['x: L3 -> L7'], ['x: L1 -> L7']);
			callEdgesOf(interModelOf(result, scopes)).should.eql([
				PAGE + ' L10 -> ' + PAGE + '.f',
				PAGE + ' L10 -> ' + PAGE + '.g'
			]);
		});

		it('US3-2 should give x: L3 -> L7, not x: L1 -> L7 (p7, h(f());)', function () {
			var result = analyzeProbe('p7-nested-arg'),
				scopes = [PAGE, PAGE + '.f', PAGE + '.h'];
			shouldHavePairsInModels(result, scopes, ['x: L3 -> L7'], ['x: L1 -> L7']);
			callEdgesOf(interModelOf(result, scopes)).should.eql([
				PAGE + ' L9 -> ' + PAGE + '.f',
				PAGE + ' L9 -> ' + PAGE + '.h'
			]);
		});

		it('US3-3 should give x: L3 -> L6>L7:T and x: L3 -> L7, no pair of x from L1 (p8, if (f() > x))', function () {
			var result = analyzeProbe('p8-cond-after');
			shouldHavePairsInModels(result, F, ['x: L3 -> L6>L7:T', 'x: L3 -> L7'], []);
			interPairsOf(result, F).concat(result.intraPage()).filter(function (pair) {
				return /^x: L1 -> /.test(pair);
			}).should.eql([]);
		});

		it('US3-4 should give x: L1 -> L6>L7:T and x: L3 -> L7, not x: L3 -> L6>L7:T nor x: L1 -> L7 (p9)', function () {
			shouldHavePairsInModels(analyzeProbe('p9-cond-before'), F, ['x: L1 -> L6>L7:T', 'x: L3 -> L7'],
				['x: L3 -> L6>L7:T', 'x: L1 -> L7']);
		});

		it('US3-5 should give n: L1 -> L3, n: L3 -> L3 and n: L3 -> L7, not n: L1 -> L7 (p11, while (next() > 0))', function () {
			shouldHavePairsInModels(analyzeProbe('p11-while'), [PAGE, PAGE + '.next'],
				['n: L1 -> L3', 'n: L3 -> L3', 'n: L3 -> L7'], ['n: L1 -> L7']);
		});

		it('US3-6 should give x: L3 -> L7, not x: L1 -> L7 (p15, for (var v of f()))', function () {
			var result = analyzeProbe('p15-for-of');
			shouldHavePairsInModels(result, F, ['x: L3 -> L7'], ['x: L1 -> L7']);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L6 -> ' + PAGE + '.f']);
		});

		/// f is called once, before entering the loop: the definition of the loop body does not reach it
		it('US3-6 should give x: L1 -> L3, not x: L7 -> L3 (p15b, the iterable is evaluated once)', function () {
			shouldHavePairsInModels(analyzeProbe('p15b-for-of-once'), F, ['x: L1 -> L3'], ['x: L7 -> L3']);
		});

		/// the read of x by the case test is not modeled (KI §44)
		it('US3-7 should give x: L3 -> L8, not x: L1 -> L8 (p16, switch (f()))', function () {
			shouldHavePairsInModels(analyzeProbe('p16-switch'), F, ['x: L3 -> L8'], ['x: L1 -> L8']);
		});

		it('US3-8 should give x: L1 -> L8 and x: L4 -> L8 (p17, var y = c && f();)', function () {
			shouldHavePairsInModels(analyzeProbe('p17-short-circuit'), F, ['x: L1 -> L8', 'x: L4 -> L8'], []);
		});

		/// the discriminant is evaluated once, before the first case: one call edge from the first case node
		/// (L7), entering a CALL NODE inserted before it
		it('US3-9 should give x: L1 -> L3, not x: L3 -> L3 (p24, switch (f()) with two cases)', function () {
			var result = analyzeProbe('p24-switch-two-case'),
				edges = interModelOf(result, F).hierarchy.edges.filter(function (edge) {
					return edge.kind === 'call';
				});
			shouldHavePairsInModels(result, F, ['x: L1 -> L3'], ['x: L3 -> L3']);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L7 -> ' + PAGE + '.f']);
			edges.length.should.eql(1);
			edges[0].beforeDecision.should.eql(true);
			edges[0].callSite.astNode.type.should.eql('SwitchCase');
			edges[0].callSite.parent.cases[0].should.equal(edges[0].callSite.astNode);
			edges[0].plan.shape.should.eql('once-switch');
		});

		it('US3-10 should give x: L1 -> L8 and x: L4 -> L8 (p26, var y = c ? f() : 2;)', function () {
			shouldHavePairsInModels(analyzeProbe('p26-conditional'), F, ['x: L1 -> L8', 'x: L4 -> L8'], []);
		});

		it('US3-11 should give x: L1 -> L6 and x: L6 -> L7, not x: L3 -> L6 (p28, x += f();)', function () {
			shouldHavePairsInModels(analyzeProbe('p28-compound'), F, ['x: L1 -> L6', 'x: L6 -> L7'], ['x: L3 -> L6']);
		});

		/// clarify Q2 A': each case keeps a p-use of the discriminant, reading the definitions when it is evaluated
		it('US3-12 should give x: L1 -> L7>L8:T and x: L3 -> L8, not x: L3 -> L7>L8:T nor x: L1 -> L8 (p32)', function () {
			var result = analyzeProbe('p32-switch-read-before');
			shouldHavePairsInModels(result, F, ['x: L1 -> L7>L8:T', 'x: L3 -> L8'], ['x: L3 -> L7>L8:T', 'x: L1 -> L8']);
			interPairsOf(result, F).should.containEql('x: L1 -> L7>exit:F');
		});

		it('US3-12 should give a p-use of the discriminant at each case (switch (x + f()) with two cases)', function () {
			var result = analyze([
				'var x = 0;',
				'function f() {',
				'  x = 1;',
				'  return 1;',
				'}',
				'switch (x + f()) {',
				'case 1:',
				'  console.log(x);',
				'  break;',
				'case 2:',
				'  console.log(x);',
				'}'
			].join('\n'));
			shouldHavePairsInModels(result, F, ['x: L1 -> L7>L8:T', 'x: L1 -> L7>L10:F', 'x: L1 -> L10>L11:T',
				'x: L3 -> L8', 'x: L3 -> L11'], ['x: L3 -> L7>L8:T', 'x: L3 -> L10>L11:T', 'x: L1 -> L8', 'x: L1 -> L11']);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L7 -> ' + PAGE + '.f']);
		});
	});

	/// T044: guards of User Story 3
	describe('US3: guards', function () {
		var F = [PAGE, PAGE + '.f'];

		/// (a) clarify Q4: connected by develop already, or as P17
		it('should keep x: L1 -> L6 and x: L3 -> L6 of for (; n < 1; f()) (as develop)', function () {
			var result = analyze(['var x = 0, n = 0;', 'function f() {', '  x = 1;', '}', 'for (; n < 1; f()) {',
				'  console.log(x);', '}'].join('\n'));
			shouldHavePairsInModels(result, F, ['x: L1 -> L6', 'x: L3 -> L6', 'f: entry -> L5'], []);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L5 -> ' + PAGE + '.f']);
		});

		it('should keep x: L7 -> L3 of do { } while (f()) (as develop)', function () {
			var result = analyze(['var x = 0;', 'function f() {', '  console.log(x);', '  return false;', '}', 'do {',
				'  x = 1;', '} while (f());'].join('\n'));
			shouldHavePairsInModels(result, F, ['x: L7 -> L3', 'f: entry -> L8>L7:T'], ['x: L1 -> L3']);
			interPairsOf(result, F).should.containEql('f: entry -> L8>exit:F');
		});

		['??', '||'].forEach(function (operator) {
			it('should give x: L1 -> L8 and x: L4 -> L8 of var y = c ' + operator + ' f(); (as p17)', function () {
				var result = analyze(['var x = 0;', 'var c = 0;', 'function f() {', '  x = 1;', '  return 1;', '}',
					'var y = c ' + operator + ' f();', 'console.log(x);'].join('\n'));
				shouldHavePairsInModels(result, F, ['x: L1 -> L8', 'x: L4 -> L8', 'f: entry -> L7:F'], []);
			});
		});

		/// (b) research R5: the split discriminant (the precedent) and the once-switch shape stand together
		it('should keep the pairs of develop of switch (a && b) (no call, read once)', function () {
			var result = analyze(['var x = 0, a = 1, b = 2;', 'switch (a && b) {', '  case 1:', '    console.log(x);',
				'    break;', '  case 2:', '    x = 2;', '}'].join('\n'));
			result.intraPage().should.eql(['a: L1 -> L2>L2:T', 'a: L1 -> L2>L3:F', 'b: L1 -> L2:T',
				'console: entry -> L4', 'x: L1 -> L4']);
		});

		it('should split the leaf f() of switch (a && f()) and not read the discriminant at the cases', function () {
			var result = analyze(['var x = 0, a = 1;', 'function f() {', '  x = 1;', '  return 1;', '}',
				'switch (a && f()) {', '  case 1:', '    console.log(x);', '    break;', '  case 2:', '    x = 2;', '}'
			].join('\n'));
			var expected = ['a: L1 -> L6>L6:T', 'a: L1 -> L6>L7:F', 'console: entry -> L8', 'f: entry -> L6:T',
				'x: L1 -> L8', 'x: L3 -> L8'];
			interPairsOf(result, F).should.eql(expected);
			result.intraPage().should.eql(expected);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L6 -> ' + PAGE + '.f']);
		});

		it('should split the leaf f() of for (var v of a && f()) and not read the right side at the loop', function () {
			var result = analyze(['var x = 0, a = [1];', 'function f() {', '  x = 1;', '  return [1];', '}',
				'for (var v of a && f()) {', '  console.log(x);', '}'].join('\n'));
			var expected = ['a: L1 -> L6>L6:F', 'a: L1 -> L6>L6:T', 'console: entry -> L7', 'f: entry -> L6:T',
				'x: L1 -> L7', 'x: L3 -> L7'];
			interPairsOf(result, F).should.eql(expected);
			result.intraPage().should.eql(expected);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L6 -> ' + PAGE + '.f']);
		});

		/// (c) data-model §4: the loop variable is defined on each iteration at the copy of the loop node
		it('should call f() of for (var v of f()) once and read the loop variable defined by the loop head', function () {
			var result = analyze(['var x = 0;', 'function f() {', '  console.log(x);', '  return [1];', '}',
				'function use(p) {', '}', 'for (var v of f()) {', '  use(v);', '  v = 2;', '  x = 2;', '}'].join('\n')),
				scopes = [PAGE, PAGE + '.f', PAGE + '.use'];
			shouldHavePairsInModels(result, scopes, ['v: L8 -> L9', 'x: L1 -> L3', 'f: entry -> L8>L9:T'],
				['v: L10 -> L9', 'x: L11 -> L3']);
			callEdgesOf(interModelOf(result, scopes)).should.eql([
				PAGE + ' L8 -> ' + PAGE + '.f',
				PAGE + ' L9 -> ' + PAGE + '.use'
			]);
		});

		/// the inner loop is entered from the body of the outer loop; its back edge and continue do not call f
		it('should call f() of an inner for-of once per entering, not on its back edge nor continue', function () {
			var result = analyze(['var x = 0;', 'function f() {', '  console.log(x);', '  return [1];', '}',
				'for (var i of [1, 2]) {', '  x = i;', '  for (var v of f()) {', '    if (v) continue;', '    x = 3;',
				'  }', '}'].join('\n'));
			shouldHavePairsInModels(result, F, ['x: L7 -> L3'], ['x: L1 -> L3', 'x: L10 -> L3']);
			callEdgesOf(interModelOf(result, F)).should.eql([PAGE + ' L8 -> ' + PAGE + '.f']);
		});

		/// (d) KI §48, research R13 L6: no worse than develop, which throws this error
		it('should fail on switch (f()) {} only as develop does (KI §48)', function () {
			var error = null;
			try {
				analyze(['var x = 0;', 'function f() {', '  x = 1;', '  return 1;', '}', 'switch (f()) {', '}'].join('\n'));
			} catch (err) {
				error = err;
			}
			(error === null || /Cannot read properties of undefined/.test(error.message)).should.eql(true,
				'unexpected failure: ' + (!!error ? error.message : ''));
		});
	});
});

/**
 * Call edges of every inter-procedural model of the page of an analyzed program (see callEdgesOf)
 * @param {Object} result
 * @returns {Array}
 */
function allCallEdgesOf(result) {
	'use strict';
	var edges = [];
	pageModelsOf(result).interProceduralModels.forEach(function (model) {
		callEdgesOf(model).forEach(function (edge) {
			if (edges.indexOf(edge) === -1) {
				edges.push(edge);
			}
		});
	});
	return edges;
}

module.exports = {
	PAGE: PAGE,
	analyzeProbe: analyzeProbe,
	interModelOf: interModelOf,
	interPairsOf: interPairsOf,
	shouldHavePairs: shouldHavePairs,
	shouldHavePairsInModels: shouldHavePairsInModels,
	callEdgesOf: callEdgesOf,
	probeOutput: probeOutput
};
