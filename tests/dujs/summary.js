/*
 * Unit tests of the summaries of the callees (feature 005, User Story 1,
 * lib/dujs/summary.js; contracts/lib-api.md §1, data-model §1-§3): the
 * must-KILL set from the sentinel definitions, the GEN at the normal exit,
 * the upward-exposed uses (through nested calls as well), the fixpoint of a
 * strongly connected component starting from "no normal return", the
 * visibility filter, the conservative summaries of generators and async
 * functions, apply and applyExceptional, and the invariants (the sentinel
 * definitions never leak out of the summaries; computing the summaries
 * writes no FlowNode and no Model).
 *
 * The recursive cases use the class methods calling this.m() (linked since
 * feature 004), not the self recursion of a function declaration (that one
 * needs the relaxed callees of User Story 2).
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	childProcess = require('child_process');
var should = require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	Def = require('../../lib/dujs/def'),
	factoryDef = require('../../lib/dujs/deffactory'),
	factoryVarDef = require('../../lib/dujs/vardeffactory'),
	analyze = require('../helpers/analyze');
var Set = require('../../lib/analyses/set');

var PAGE = '$DOMAIN.$PAGE_0',
	PROBES005 = path.join(__dirname, 'cases', 'probes005'),
	PROBES004 = path.join(__dirname, 'cases', 'probes004');

/**
 * The summary module, required lazily: a missing module fails each test
 * instead of the loading of the whole test run
 * @returns {Object}
 */
function summaryModule() {
	'use strict';
	return require('../../lib/dujs/summary');
}

/**
 * Values of a Set (lib/analyses/set or a native Set)
 * @param {Object} set
 * @returns {Array}
 */
function valuesOf(set) {
	'use strict';
	return Array.from(set.values());
}

/**
 * Sorted names of a Set of Var
 * @param {Object} vars
 * @returns {Array}
 */
function namesOf(vars) {
	'use strict';
	return valuesOf(vars).map(function (aVar) {
		return aVar.name;
	}).sort();
}

/**
 * Sorted "<name>@L<line>" of a Set of VarDef
 * @param {Object} vardefs
 * @returns {Array}
 */
function defsOf(vardefs) {
	'use strict';
	return valuesOf(vardefs).map(function (vardef) {
		return vardef.variable.name + '@L' + vardef.definition.fromNode.line;
	}).sort();
}

/**
 * Analyze a program and compute the summaries of its page
 * @param {string} code
 * @returns {Object} the result of the analyze helper
 */
function analyzeAndSummarize(code) {
	'use strict';
	var result = analyze(code);
	summaryModule().computeForPage(result.scopeTree);
	return result;
}

/**
 * Scope of a page by its name (the last part of the full name)
 * @param {Object} result
 * @param {string} name
 * @returns {Scope}
 */
function scopeNamed(result, name) {
	'use strict';
	/// Scope.name is the full name ($DOMAIN.$PAGE_0.f): compare its last part
	var found = result.scopeTree.scopes.filter(function (scope) {
		return scope.name.split('.').pop() === name;
	});
	found.should.have.length(1, 'scope ' + name + ' of ' + result.scopeNames().join(', '));
	return found[0];
}

/**
 * Summary of a scope of the page analyzed last
 * @param {Object} result
 * @param {string} name
 * @returns {Object}
 */
function summaryOf(result, name) {
	'use strict';
	return summaryModule().summaryOf(scopeNamed(result, name));
}

/**
 * Every model of the page analyzed last
 * @param {Object} result
 * @returns {Array}
 */
function modelsOf(result) {
	'use strict';
	var pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree);
	return [].concat(pageModels.intraProceduralModels, pageModels.interProceduralModels,
		pageModels.intraPageModels, [modelCtrl.interPageModel]).filter(function (model) {
		return !!model;
	});
}

describe('summary (feature 005, User Story 1)', function () {
	'use strict';
	after(function () {
		analyze.reset();
		try {
			summaryModule().reset();
		} catch (ignored) {
			/// the module is missing before User Story 1 is implemented
		}
	});

	describe('must-KILL from the sentinel definitions', function () {
		it('should not must-KILL a variable defined on one branch only', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'function f(c) {',
				'if (c) {',
				'x = 1;',
				'}',
				'}',
				'f(0);',
				'console.log(x);'
			].join('\n'));
			namesOf(summaryOf(result, 'f').mustKill).should.not.containEql('x');
			defsOf(summaryOf(result, 'f').gen).should.eql(['x@L4']);
		});

		it('should must-KILL a variable defined on every normal path', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'function f(c) {',
				'if (c) {',
				'x = 1;',
				'} else {',
				'x = 2;',
				'}',
				'}',
				'f(0);',
				'console.log(x);'
			].join('\n'));
			var summary = summaryOf(result, 'f');
			namesOf(summary.mustKill).should.eql(['x']);
			defsOf(summary.gen).should.eql(['x@L4', 'x@L6']);
			summary.normalReturn.should.be.true();
		});
	});

	describe('GEN at the normal exit', function () {
		it('should keep only the definitions reaching the exit normally', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'function f(c) {',
				'x = 1;',
				'if (c) {',
				'x = 2;',
				'throw c;',
				'}',
				'}',
				'f(0);',
				'console.log(x);'
			].join('\n'));
			defsOf(summaryOf(result, 'f').gen).should.eql(['x@L3']);
		});
	});

	describe('upward-exposed uses', function () {
		it('should hold a variable read before it is defined, on any path', function () {
			var result = analyzeAndSummarize([
				'var x = 0, y = 0;',
				'function f(c) {',
				'if (c) {',
				'console.log(x);',
				'}',
				'x = 1;',
				'y = 1;',
				'console.log(y);',
				'}',
				'f(0);'
			].join('\n'));
			var exposed = namesOf(summaryOf(result, 'f').upwardExposed);
			exposed.should.containEql('x');
			exposed.should.not.containEql('y');
		});

		/// f calls the method g by this.g() (linked since feature 004): a call of
		/// the page function g() from f needs the relaxed callees of User Story 2
		/// (D2), so the nested callee is a class method here, as the recursive cases
		it('should hold the upward-exposed uses of a nested callee', function () {
			var result = analyzeAndSummarize([
				'var y = 0;',
				'class A {',
				'f() {',
				'this.g();',
				'}',
				'g() {',
				'return y;',
				'}',
				'}',
				'new A().f();'
			].join('\n'));
			/// f is $ANONYMOUS_FUN_0, g is $ANONYMOUS_FUN_1
			namesOf(summaryOf(result, '$ANONYMOUS_FUN_1').upwardExposed).should.containEql('y');
			namesOf(summaryOf(result, '$ANONYMOUS_FUN_0').upwardExposed).should.containEql('y');
		});

		it('should not hold a variable defined before the nested callee reads it', function () {
			var result = analyzeAndSummarize([
				'var y = 0;',
				'function g() {',
				'return y;',
				'}',
				'function f() {',
				'y = 1;',
				'g();',
				'}',
				'f();'
			].join('\n'));
			namesOf(summaryOf(result, 'f').upwardExposed).should.not.containEql('y');
		});

		/// feature 007 T021 (research R8): in the callee k, the read of the callee f of if (f(x)) is a p-use of
		/// the decision deferred from the CALL NODE inserted before it (segment 0), and the argument x is a
		/// c-use of that CALL NODE; both are upward-exposed uses of k (summaryGraphOf merges deferredPuse)
		it('should hold the deferred p-use of the callee and the argument of if (f(x)) (007 T021)', function () {
			this.timeout(60000);
			var code = [
				'var x = 0;',
				'function f(v) {',
				'  return 1;',
				'}',
				'function k() {',
				'  if (f(x)) {',
				'  }',
				'}',
				'k();'
			].join('\n');
			var result = analyzeAndSummarize(code),
				exposed = namesOf(summaryOf(result, 'k').upwardExposed);
			exposed.should.containEql('f');
			exposed.should.containEql('x');
			/// the summaries of *.matching.json list them as well
			var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-summary-')),
				input = path.join(dir, 'k.js');
			try {
				fs.writeFileSync(input, code, 'utf8');
				var run = childProcess.spawnSync(process.execPath,
					[path.join(__dirname, '..', '..', 'bin', 'dujs.js'), '-js', input], {cwd: dir, encoding: 'utf8'});
				run.status.should.eql(0, run.stderr);
				var out = fs.readdirSync(dir).filter(function (name) {
					return name.indexOf('out-') === 0;
				})[0];
				var interDir = path.join(dir, out, 'page0', 'inter-procedurals'),
					ofK = null;
				/// the matching of the model of the page (the caller of k)
				fs.readdirSync(interDir).filter(function (name) {
					return /\.matching\.json$/.test(name);
				}).forEach(function (name) {
					var summaries = JSON.parse(fs.readFileSync(path.join(interDir, name), 'utf8')).summaries;
					ofK = ofK || summaries[PAGE + '.k'] || null;
				});
				(!!ofK).should.eql(true, 'no summary of k');
				ofK.upwardExposed.should.containEql('f');
				ofK.upwardExposed.should.containEql('x');
			} finally {
				fs.rmSync(dir, {recursive: true, force: true});
			}
		});

		/// feature 007 T036 (moved from T021; from US2 f() of x < f() is a call site): x is read before f is
		/// called, a p-use of the decision deferred from the CALL NODE (segment 0), upward-exposed in k
		it('should hold the deferred p-use x of if (x < f()) in the callee k (007 US2)', function () {
			this.timeout(60000);
			var code = [
				'var x = 0;',
				'function f() {',
				'  return 1;',
				'}',
				'function k() {',
				'  if (x < f()) {',
				'  }',
				'}',
				'k();'
			].join('\n');
			namesOf(summaryOf(analyzeAndSummarize(code), 'k').upwardExposed).should.containEql('x');
			var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-summary-')),
				input = path.join(dir, 'k.js');
			try {
				fs.writeFileSync(input, code, 'utf8');
				var run = childProcess.spawnSync(process.execPath,
					[path.join(__dirname, '..', '..', 'bin', 'dujs.js'), '-js', input], {cwd: dir, encoding: 'utf8'});
				run.status.should.eql(0, run.stderr);
				var out = fs.readdirSync(dir).filter(function (name) {
					return name.indexOf('out-') === 0;
				})[0];
				var interDir = path.join(dir, out, 'page0', 'inter-procedurals'),
					ofK = null;
				fs.readdirSync(interDir).filter(function (name) {
					return /\.matching\.json$/.test(name);
				}).forEach(function (name) {
					var summaries = JSON.parse(fs.readFileSync(path.join(interDir, name), 'utf8')).summaries;
					ofK = ofK || summaries[PAGE + '.k'] || null;
				});
				(!!ofK).should.eql(true, 'no summary of k');
				ofK.upwardExposed.should.containEql('x');
			} finally {
				fs.rmSync(dir, {recursive: true, force: true});
			}
		});
	});

	describe('fixpoint of a strongly connected component', function () {
		/// probes005/c-cyc3-cond.js: m calls itself (this.m) only when p is truthy
		it('should return normally from a conditional self recursion (c-cyc3-cond)', function () {
			var result = analyzeAndSummarize(fs.readFileSync(path.join(PROBES005, 'c-cyc3-cond.js'), 'utf8')),
				summary = summaryOf(result, '$ANONYMOUS_FUN_0');
			summary.normalReturn.should.be.true();
			defsOf(summary.gen).should.eql(['y@L8']);
			namesOf(summary.mustKill).should.eql(['y']);
		});

		/// probes004/cyc-3.js: m calls itself unconditionally; the fixpoint starts from no normal return
		it('should never return normally from an unconditional self recursion (cyc-3)', function () {
			var result = analyzeAndSummarize(fs.readFileSync(path.join(PROBES004, 'cyc-3.js'), 'utf8')),
				summary = summaryOf(result, '$ANONYMOUS_FUN_0');
			summary.normalReturn.should.be.false();
			defsOf(summary.gen).should.eql([]);
		});

		/// a calls b only when p is truthy, b calls a: both return normally
		it('should solve a mutual recursion of methods to the fixpoint', function () {
			var result = analyzeAndSummarize([
				'var y;',
				'class A {',
				'a(p) {',
				'if (p) {',
				'this.b(0);',
				'}',
				'y = 1;',
				'}',
				'b(q) {',
				'this.a(q);',
				'}',
				'}',
				'new A().a(1);'
			].join('\n'));
			var ofA = summaryOf(result, '$ANONYMOUS_FUN_0'),
				ofB = summaryOf(result, '$ANONYMOUS_FUN_1');
			ofA.normalReturn.should.be.true();
			ofB.normalReturn.should.be.true();
			defsOf(ofA.gen).should.eql(['y@L7']);
			defsOf(ofB.gen).should.eql(['y@L7']);
			namesOf(ofB.mustKill).should.eql(['y']);
		});

		/// a calls b and b calls a, unconditionally: neither returns normally
		it('should never return normally from an unconditional mutual recursion', function () {
			var result = analyzeAndSummarize([
				'var y;',
				'class A {',
				'a() {',
				'this.b();',
				'y = 1;',
				'}',
				'b() {',
				'this.a();',
				'}',
				'}',
				'new A().a();'
			].join('\n'));
			summaryOf(result, '$ANONYMOUS_FUN_0').normalReturn.should.be.false();
			summaryOf(result, '$ANONYMOUS_FUN_1').normalReturn.should.be.false();
		});
	});

	/// User Story 3 (T065, research R3, R5): the definitions reaching the exit exceptionally
	describe('exceptional (User Story 3)', function () {
		/// probes005/us3-3.js: L4 throwing leaves s with x of L3; L5 throwing carries IN (x of L3), not x of L5
		it('should hold the definitions reaching the exit by an exception edge, carrying IN (us3-3)', function () {
			var result = analyzeAndSummarize(fs.readFileSync(path.join(PROBES005, 'us3-3.js'), 'utf8')),
				summary = summaryOf(result, 's');
			defsOf(summary.exceptional).should.eql(['x@L3']);
			defsOf(summary.gen).should.eql(['x@L5']);
		});

		/// f calls g by this.g() (linked since feature 004) out of any try: the call leaves f by its exit,
		/// so the exceptional definitions of g (applyExceptional at the call) are exceptional for f too
		it('should hold the exceptional definitions of a callee whose exception leaves by the exit', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'class A {',
				'f() {',
				'this.g();',
				'x = 3;',
				'}',
				'g() {',
				'x = 1;',
				'console.log(1);',
				'x = 2;',
				'}',
				'}',
				'new A().f();'
			].join('\n'));
			/// f is $ANONYMOUS_FUN_0, g is $ANONYMOUS_FUN_1; x of L10 reaches the exit of f by L5 throwing
			defsOf(summaryOf(result, '$ANONYMOUS_FUN_1').exceptional).should.eql(['x@L8']);
			defsOf(summaryOf(result, '$ANONYMOUS_FUN_0').exceptional).should.eql(['x@L10', 'x@L8']);
		});

		/// the callee of a call caught in the caller: its exceptional definitions go to the catch, not the exit
		it('should not hold the exceptional definitions of a callee caught in the caller', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'class A {',
				'f() {',
				'try {',
				'this.g();',
				'} catch (e) {',
				'}',
				'}',
				'g() {',
				'x = 1;',
				'console.log(1);',
				'x = 2;',
				'}',
				'}',
				'new A().f();'
			].join('\n'));
			defsOf(summaryOf(result, '$ANONYMOUS_FUN_0').exceptional).should.eql([]);
			defsOf(summaryOf(result, '$ANONYMOUS_FUN_0').gen).should.eql(['x@L10', 'x@L12']);
		});

		/// probes005/m3-mdn-finally-return.js: the rethrow of the catch body leaves f through the finallyExit
		it('should take the rethrow of a finallyExit as an exceptional arrival (m3-mdn-finally-return)', function () {
			var result = analyzeAndSummarize(fs.readFileSync(path.join(PROBES005, 'm3-mdn-finally-return.js'), 'utf8')),
				summary = summaryOf(result, 'f');
			summary.normalReturn.should.be.false();
			defsOf(summary.exceptional).should.containEql('r@L10');
			defsOf(summary.gen).should.eql([]);
		});

		it('should not hold the own variables of the callee', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'function f(p) {',
				'var local = p;',
				'x = local;',
				'console.log(1);',
				'}',
				'f(1);'
			].join('\n'));
			defsOf(summaryOf(result, 'f').exceptional).should.eql(['x@L4']);
		});

		/// R13: the gen of a generator holds the exceptional definitions of its callees as well
		it('should merge the exceptional definitions of the callees into the gen of a generator', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'class A {',
				'*g() {',
				'this.h();',
				'}',
				'h() {',
				'x = 1;',
				'console.log(1);',
				'x = 2;',
				'}',
				'}',
				'new A().g();'
			].join('\n'));
			var summary = summaryOf(result, '$ANONYMOUS_FUN_0');
			summary.conservative.should.be.true();
			defsOf(summary.gen).should.eql(['x@L7', 'x@L9']);
		});
	});

	describe('visibility filter', function () {
		it('should not hold the own variables, parameters and block variables of the callee', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'function f(p) {',
				'var local = p;',
				'{',
				'let b = local;',
				'console.log(b);',
				'}',
				'x = local;',
				'}',
				'f(1);'
			].join('\n'));
			var summary = summaryOf(result, 'f'),
				own = ['p', 'local', 'b', 'arguments'];
			[defsOf(summary.gen), defsOf(summary.exceptional)].forEach(function (defs) {
				defs.forEach(function (def) {
					own.should.not.containEql(def.split('@')[0]);
				});
			});
			[namesOf(summary.mustKill), namesOf(summary.upwardExposed)].forEach(function (names) {
				names.forEach(function (name) {
					own.should.not.containEql(name);
				});
			});
			defsOf(summary.gen).should.eql(['x@L8']);
		});
	});

	describe('conservative summaries of generators and async functions', function () {
		[['c-gen.js', 'g', ['x@L3']], ['c-asy.js', 'g', ['x@L5']]].forEach(function (testCase) {
			it('should be conservative for ' + testCase[0], function () {
				var result = analyzeAndSummarize(fs.readFileSync(path.join(PROBES005, testCase[0]), 'utf8')),
					summary = summaryOf(result, testCase[1]);
				summary.conservative.should.be.true();
				summary.normalReturn.should.be.true();
				valuesOf(summary.mustKill).should.have.length(0);
				defsOf(summary.gen).should.eql(testCase[2]);
			});
		});

		it('should merge the definitions reaching the exit normally and exceptionally', function () {
			var result = analyzeAndSummarize([
				'var x = 0;',
				'function* g(c) {',
				'x = 1;',
				'if (c) {',
				'x = 2;',
				'throw c;',
				'}',
				'}',
				'g(0);'
			].join('\n'));
			defsOf(summaryOf(result, 'g').gen).should.eql(['x@L3', 'x@L5']);
		});
	});

	describe('apply and applyExceptional', function () {
		var PROGRAM = [
			'var x = 0;',
			'function f() {',
			'x = 1;',
			'}',
			'f();',
			'console.log(x);'
		].join('\n');

		/**
		 * A Set with one definition of x at the first node of the page
		 * @param {Object} result
		 * @param {Object} summary summary whose gen holds a VarDef of x
		 * @returns {Set}
		 */
		function definitionsOfX(result, summary) {
			var variable = valuesOf(summary.gen)[0].variable,
				pageModel = result.scopeTree.root,
				node = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.filter(function (model) {
					return model.mainlyRelatedScope === pageModel;
				})[0].graph[2][1];
			return new Set([factoryVarDef.create(variable, factoryDef.createLiteralDef(node, [0, 9]))]);
		}

		it('should kill the must-KILL variables and add the GEN, in a new Set', function () {
			var result = analyzeAndSummarize(PROGRAM),
				summary = summaryOf(result, 'f'),
				input = definitionsOfX(result, summary),
				before = valuesOf(input);
			var output = summaryModule().apply(summary, input);
			(output === input).should.be.false();
			defsOf(output).should.eql(['x@L3']);
			valuesOf(input).should.eql(before);
		});

		it('should add the exceptional definitions without killing, in a new Set', function () {
			var result = analyzeAndSummarize(PROGRAM),
				summary = summaryOf(result, 'f'),
				input = definitionsOfX(result, summary),
				before = valuesOf(input);
			var output = summaryModule().applyExceptional(summary, input);
			(output === input).should.be.false();
			/// containEql formats a VarDef and throws (should-format), so its index is checked
			valuesOf(output).indexOf(before[0]).should.not.eql(-1);
			valuesOf(input).should.eql(before);
		});

		/// summary.apply/applyExceptional and the solver's applySummary/applyExceptionalSummary are one
		/// implementation (T102 (d) R2, (e) R2): the solver maps the definitions of the summary to the
		/// VarDefs of its graph, the summaries use them as they are; the results must stay equal
		it('should give the same results as the solver applying the summary, in the same order', function () {
			var reachingSolver = require('../../lib/dujs/reachingsolver'),
				result = analyzeAndSummarize(PROGRAM),
				summary = summaryOf(result, 'f'),
				input = definitionsOfX(result, summary),
				same = function (vardef) {
					return vardef;
				},
				/// the same VarDef objects in the same order (should.eql would take equal copies as the same)
				identical = function (one, another) {
					return one.length === another.length && one.every(function (vardef, index) {
						return vardef === another[index];
					});
				};
			identical(valuesOf(summaryModule().apply(summary, input)),
				valuesOf(reachingSolver.applySummary(summary, input, same))).should.be.true();
			identical(valuesOf(summaryModule().applyExceptional(summary, input)),
				valuesOf(reachingSolver.applyExceptionalSummary(summary, input, same))).should.be.true();
			/// a mapping replaces each definition of the summary by its VarDef of the graph, and only those
			var copies = new Map(),
				mapped = function (vardef) {
					if (!copies.has(vardef)) {
						copies.set(vardef, factoryVarDef.create(vardef.variable, vardef.definition));
					}
					return copies.get(vardef);
				},
				expected = valuesOf(summaryModule().apply(summary, input)).map(function (vardef) {
					return summary.gen.has(vardef) ? mapped(vardef) : vardef;
				});
			summary.gen.size.should.be.above(0);
			identical(valuesOf(reachingSolver.applySummary(summary, input, mapped)), expected).should.be.true();
			(function () {
				reachingSolver.applySummary(summary, input, function () {
					return null;
				});
			}).should.throw(/no VarDef in the graph/);
		});

		/// probes004/cyc-3.js: m never returns normally, so nothing reaches after a call of it
		it('should apply to the empty set without a normal return', function () {
			var result = analyzeAndSummarize(fs.readFileSync(path.join(PROBES004, 'cyc-3.js'), 'utf8')),
				summary = summaryOf(result, '$ANONYMOUS_FUN_0'),
				page = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.filter(function (model) {
					return model.mainlyRelatedScope === result.scopeTree.root;
				})[0],
				defined = [];
			page.graph[2].forEach(function (node) {
				defined = defined.concat(valuesOf(node.generate || new Set()));
			});
			defined.length.should.be.above(0);
			var input = new Set(defined);
			valuesOf(summaryModule().apply(summary, input)).should.have.length(0);
			valuesOf(input).should.have.length(defined.length);
		});
	});

	describe('life cycle', function () {
		it('should throw for a scope whose summary is not computed', function () {
			var result = analyze('function f() {}\nf();');
			summaryModule().reset();
			should(function () {
				summaryModule().summaryOf(scopeNamed(result, 'f'));
			}).throw();
		});

		it('should not compute again for a page computed already', function () {
			var result = analyzeAndSummarize('var x;\nfunction f() {\nx = 1;\n}\nf();'),
				first = summaryOf(result, 'f');
			summaryModule().computeForPage(result.scopeTree);
			(summaryOf(result, 'f') === first).should.be.true();
		});

		it('should forget every summary after reset', function () {
			var result = analyzeAndSummarize('var x;\nfunction f() {\nx = 1;\n}\nf();');
			summaryModule().reset();
			should(function () {
				summaryOf(result, 'f');
			}).throw();
		});
	});

	describe('invariants', function () {
		var PROGRAMS = [
			fs.readFileSync(path.join(PROBES005, 'p1.js'), 'utf8'),
			fs.readFileSync(path.join(PROBES005, 'p2.js'), 'utf8'),
			fs.readFileSync(path.join(PROBES005, 'c-cyc3-cond.js'), 'utf8'),
			fs.readFileSync(path.join(PROBES005, 'us3-3.js'), 'utf8')
		];

		it('should leak no sentinel definition into the reach-ins and the pairs of any model', function () {
			Def.SENTINEL_TYPE.should.be.a.String();
			PROGRAMS.forEach(function (code) {
				var result = analyzeAndSummarize(code);
				modelsOf(result).forEach(function (model) {
					model.graph[2].forEach(function (node) {
						valuesOf(node.reachIns || new Set()).forEach(function (vardef) {
							vardef.definition.type.should.not.eql(Def.SENTINEL_TYPE);
						});
					});
					/// a sentinel is defined at an entry copy of a summary graph, never a node of a model
					model.dupairs.forEach(function (pairs) {
						valuesOf(pairs).forEach(function (pair) {
							model.graph[2].indexOf(pair.first).should.not.eql(-1);
						});
					});
				});
				/// the summaries hold original definitions only
				result.scopeTree.scopes.forEach(function (scope) {
					if (scope === result.scopeTree.root) {
						return;
					}
					var summary = summaryModule().summaryOf(scope);
					[summary.gen, summary.exceptional].forEach(function (vardefs) {
						valuesOf(vardefs).forEach(function (vardef) {
							vardef.definition.type.should.not.eql(Def.SENTINEL_TYPE);
						});
					});
				});
			});
		});

		it('should write no FlowNode and no Model when computing the summaries', function () {
			PROGRAMS.forEach(function (code) {
				var result = analyze(code);
				summaryModule().reset();
				var models = modelsOf(result);
				function snapshot() {
					return models.map(function (model) {
						/// Model.graph and the Set fields of a FlowNode are copies when read: keep their items
						return {
							graph: [model.graph[0], model.graph[1]],
							nodes: model.graph[2].slice(),
							pairs: analyze.pairsOfModel(model),
							fields: model.graph[2].map(function (node) {
								return [node.reachIns, node.reachOuts, node.generate, node.kill, node.cuse, node.puse,
									node.type, node.next.slice(), node.prev.slice()].map(function (field) {
									return (!!field && typeof field.values === 'function' && !Array.isArray(field)) ?
										valuesOf(field) : field;
								});
							})
						};
					});
				}
				var before = snapshot();
				summaryModule().computeForPage(result.scopeTree);
				var after = snapshot();
				after.forEach(function (each, index) {
					(each.graph[0] === before[index].graph[0] && each.graph[1] === before[index].graph[1]).should.be.true();
					each.pairs.should.eql(before[index].pairs);
					each.nodes.length.should.eql(before[index].nodes.length);
					each.nodes.forEach(function (node, at) {
						(node === before[index].nodes[at]).should.be.true('node ' + at + ' of model ' + index);
					});
					each.fields.forEach(function (fields, at) {
						fields.forEach(function (field, fieldIndex) {
							if (Array.isArray(field)) {
								var old = before[index].fields[at][fieldIndex];
								field.length.should.eql(old.length);
								field.forEach(function (item, itemIndex) {
									(item === old[itemIndex]).should.be.true(
										'field ' + fieldIndex + ' of node ' + at + ' of model ' + index);
								});
							} else {
								(field === before[index].fields[at][fieldIndex]).should.be.true(
									'field ' + fieldIndex + ' of node ' + at + ' of model ' + index);
							}
						});
					});
				});
			});
		});
	});
});

/**
 * FR-003 (feature 008 User Story 1, research R4; contracts/acceptance.md
 * "FR-003 summary"): a member target in a callee is a use, not a definition,
 * of its object variable, so the summary of the callee neither generates nor
 * must-kills it, and holds it as an upward-exposed use; the summaries of
 * *.matching.json are the same.
 */
describe('summary of a callee writing a property o.p = 1 (feature 008 FR-003)', function () {
	'use strict';
	var CODE = [
		'var o = {};',
		'function g() {',
		'  o.p = 1;',
		'}',
		'g();',
		'console.log(o);'
	].join('\n');

	after(function () {
		analyze.reset();
		summaryModule().reset();
	});

	it('should not hold o in the gen and the mustKill of g, and hold it as upward-exposed', function () {
		var summary = summaryOf(analyzeAndSummarize(CODE), 'g');
		namesOf(summary.mustKill).should.not.containEql('o');
		defsOf(summary.gen).filter(function (def) {
			return def.split('@')[0] === 'o';
		}).should.eql([]);
		namesOf(summary.upwardExposed).should.containEql('o');
	});

	it('should give the same summary of g in *.matching.json', function () {
		this.timeout(60000);
		var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-summary-')),
			input = path.join(dir, 'g.js');
		try {
			fs.writeFileSync(input, CODE, 'utf8');
			var run = childProcess.spawnSync(process.execPath,
				[path.join(__dirname, '..', '..', 'bin', 'dujs.js'), '-js', input], {cwd: dir, encoding: 'utf8'});
			run.status.should.eql(0, run.stderr);
			var out = fs.readdirSync(dir).filter(function (name) {
				return name.indexOf('out-') === 0;
			})[0];
			var interDir = path.join(dir, out, 'page0', 'inter-procedurals'),
				ofG = null;
			fs.readdirSync(interDir).filter(function (name) {
				return /\.matching\.json$/.test(name);
			}).forEach(function (name) {
				var summaries = JSON.parse(fs.readFileSync(path.join(interDir, name), 'utf8')).summaries;
				ofG = ofG || summaries[PAGE + '.g'] || null;
			});
			(!!ofG).should.eql(true, 'no summary of g');
			/// gen items are "<variable>@<node id>"
			ofG.gen.filter(function (item) {
				return item.split('@')[0] === 'o';
			}).should.eql([]);
			ofG.mustKill.should.not.containEql('o');
			ofG.upwardExposed.should.containEql('o');
		} finally {
			fs.rmSync(dir, {recursive: true, force: true});
		}
	});
});
