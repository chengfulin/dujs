/*
 * Test cases of new statements as call-sites and of the resolution of the
 * callees of a call-site (specs/004-fix-remaining-issues, FR-002, FR-003,
 * FR-017, FR-018, User Story 2, research R2, R3, KI §21).
 * Original dujs code, MIT License (see LICENSE).
 *
 * A `new F();` / `new A();` statement is a call-site: it is connected to the
 * function F, or to the instance field initializers (in source order) and
 * the constructor of the class A (not following extends). A callee variable
 * is resolved when its definitions reaching the call-site are at least one
 * and all refer to the same function or class (strict rule, also for f());
 * when none reaches, a class (not a function) is resolved from the only
 * definition of the variable on the page (class relaxation); since feature
 * 005 (D2) a function too, for f() (not new F()) in a function. The expected
 * pairs are those of contracts/acceptance.md "US2", "FR-017／FR-018" and
 * "Edge cases" (intra-page pairs and inter-procedural models).
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode'),
	callResolver = require('../../lib/dujs/callresolver');

var PROBES = path.join(__dirname, 'cases', 'probes004'),
	PAGE = '$DOMAIN.$PAGE_0',
	ANONYMOUS = PAGE + '.$ANONYMOUS_FUN_';

/**
 * Analyze a probe program
 * @param {string} name File name without extension
 * @returns {Object} result of the analyze helper
 */
function analyzeProbe(name) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, name + '.js'), 'utf8'));
}

/**
 * Intra-procedural models of the analyzed page
 * @param {Object} result
 * @returns {Array}
 */
function intraModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels;
}

/**
 * The node of a line in the intra-procedural model of a scope (an original)
 * @param {Object} result
 * @param {string} scopeName
 * @param {number} line
 * @returns {FlowNode}
 */
function nodeAt(result, scopeName, line) {
	'use strict';
	var found = null;
	intraModelsOf(result).forEach(function (model) {
		if (model.mainlyRelatedScope.name !== scopeName) {
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
 * Names of the callee scopes of the node of a line
 * @param {Object} result
 * @param {string} scopeName
 * @param {number} line
 * @returns {Array}
 */
function calleesAt(result, scopeName, line) {
	'use strict';
	return callResolver.calleeScopesOf(nodeAt(result, scopeName, line), result.scopeTree).map(String);
}

/**
 * The class information of the class at a line
 * @param {Object} index
 * @param {number} line
 * @returns {Object}
 */
function classAt(index, line) {
	'use strict';
	var found = null;
	index.byRange.forEach(function (info) {
		if (info.node.loc.start.line === line) {
			found = info;
		}
	});
	(!!found).should.eql(true, 'no class at L' + line);
	return found;
}

describe('new statements as call-sites (FR-002, FR-003)', function () {
	'use strict';

	after(analyze.reset);

	/// US2 #1 (KI §21): new P(1); is connected like P(1);
	it('US2-1 should connect new P(1); to the function P', function () {
		var result = analyzeProbe('us2-1');
		result.intraPage().should.eql(['P: entry -> L5', 'a: entry -> L3', 'console: entry -> L6', 'x: L3 -> L6']);
		result.interProceduralScopes().should.eql([[PAGE, PAGE + '.P']]);
	});

	/// US2 #2: the field initializer runs before the constructor
	it('US2-2 should connect new A(); to the field initializer and then the constructor', function () {
		var result = analyzeProbe('us2-2');
		/// x: L1 -> entry is the §18 residue of the entry of the field
		result.intraPage().should.eql(['A: L2 -> L8', 'x: L1 -> L3', 'x: L5 -> L9']);
		result.interProceduralScopes().should.eql([[PAGE, ANONYMOUS + '0', ANONYMOUS + '1']]);
	});

	/// US2 #3: extends is not followed (A's constructor is not connected)
	it('US2-3 should connect new B(); to B only without following extends', function () {
		var result = analyzeProbe('us2-3');
		/// super(); is not connected and its exception edge goes to the exit of B's constructor; before
		/// feature 005 that exception went back to the CALL RETURN NODE of L14 (x: L1 -> L15). With the
		/// summaries (US1) B's constructor defines x on every normal path and its exception leaves the
		/// page, so x: L1 -> L15 is gone
		result.intraPage().should.eql([
			'A: L2 -> L7', 'B: L7 -> L14',
			'x: L1 -> L8', 'x: L11 -> L15'
		]);
		result.interProceduralScopes().should.eql([[PAGE, ANONYMOUS + '1', ANONYMOUS + '2']]);
	});

	/// US2 #4: a class with only methods has no callee for new
	it('US2-4 should not connect new A(); of a class without constructor and fields', function () {
		var result = analyzeProbe('us2-4');
		result.intraPage().should.eql(['A: L2 -> L7', 'x: L1 -> L8']);
		result.interProceduralScopes().should.eql([]);
	});

	/// US2 #5: y = new F(); is not a call-site (only a new statement is)
	it('US2-5 should not connect y = new F();', function () {
		var result = analyzeProbe('us2-5');
		result.intraPage().should.eql(['F: entry -> L5', 'console: entry -> L6', 'x: L1 -> L6']);
		result.interProceduralScopes().should.eql([]);
	});

	/// US2 #6: new A(); in a function, A the only class declaration of the page (class relaxation)
	it('US2-6 should connect new A(); in a function by the class relaxation', function () {
		var result = analyzeProbe('fn-new');
		/// A: L2 -> entry is the §18 residue of the entry of g
		result.intraPage().should.eql([
			'A: L2 -> L8', 'console: entry -> L11', 'g: entry -> L10', 'x: L4 -> L11'
		]);
		result.interProceduralScopes().should.eql([
			[PAGE + '.g', ANONYMOUS + '0'],
			[PAGE, PAGE + '.g', ANONYMOUS + '0']
		]);
	});

	/// US2 #7: the two definitions of f reaching f(); refer to different functions (strict rule)
	it('US2-7 should not connect f(); reached by definitions of different functions', function () {
		var result = analyzeProbe('mix-f');
		result.intraPage().should.eql([
			'c: L1 -> L5>L10:F', 'c: L1 -> L5>L6:T', 'console: entry -> L11',
			'f: L2 -> L10', 'f: L6 -> L10', 'x: L1 -> L11'
		]);
		result.interProceduralScopes().should.eql([]);
	});

	/// Edge case: var A = class {...}; new A(); (the definition of A is a literal of the class)
	it('should connect new A(); of a class expression assigned to a var', function () {
		var result = analyzeProbe('edge-classexpr');
		result.intraPage().should.eql(['A: L2 -> L7', 'x: L4 -> L8']);
	});

	/// FR-017: new B() of a field initializer is connected by the class relaxation
	it('should connect new B() of a field initializer (FR-017)', function () {
		var result = analyzeProbe('field-new');
		/// B: L2 -> entry is the §18 residue of the entry of the field
		result.intraPage().should.eql([
			'A: L7 -> L10', 'B: L2 -> L8', 'console: entry -> L11', 'x: L4 -> L11'
		]);
		result.interProceduralScopes().should.eql([
			[ANONYMOUS + '1', ANONYMOUS + '0'],
			[PAGE, ANONYMOUS + '1', ANONYMOUS + '0']
		]);
	});

	/// FR-018: the class relaxation does not look at the execution order: g(); runs
	/// before class A is declared (a TDZ error when run; README notes the limitation)
	it('should connect new A(); in a function called before the class declaration', function () {
		var result = analyzeProbe('fn-new-early');
		result.intraPage().should.eql(['console: entry -> L11', 'g: entry -> L5', 'x: L8 -> L11']);
		result.interProceduralScopes().should.eql([
			[PAGE + '.g', ANONYMOUS + '0'],
			[PAGE, PAGE + '.g', ANONYMOUS + '0']
		]);
	});
});

describe('callResolver (research R2, FR-018)', function () {
	'use strict';

	after(analyze.reset);

	describe('classIndexOf', function () {
		var CODE = [
			'class Base {}',
			'class A extends Base {',
			'  f = 1;',
			'  g;',
			'  h = 2;',
			'  static s = 3;',
			'  constructor() {}',
			'  m() {}',
			'  static n() {}',
			'  get p() { return 1; }',
			'  [k]() {}',
			'  #q() {}',
			'  "r"() {}',
			'}',
			'var B = class {};',
			'new A();'
		].join('\n');

		it('should index the classes with their constructor, fields and methods', function () {
			var result = analyze(CODE),
				index = callResolver.classIndexOf(result.scopeTree),
				base = classAt(index, 1),
				a = classAt(index, 2),
				b = classAt(index, 15);
			index.byRange.size.should.eql(3);
			base.isDeclaration.should.eql(true);
			base.hasSuperClass.should.eql(false);
			(base.constructorScope === null).should.eql(true);
			base.instanceFieldScopes.should.eql([]);
			a.isDeclaration.should.eql(true);
			a.hasSuperClass.should.eql(true);
			a.rangeKey.should.eql(a.node.range[0] + ',' + a.node.range[1]);
			String(a.constructorScope).should.eql(ANONYMOUS + '3');
			/// fields with a value in source order; g has no value
			a.instanceFieldScopes.map(String).should.eql([ANONYMOUS + '0', ANONYMOUS + '1']);
			/// kind 'method', not computed, not private (and not a string name)
			Array.from(a.instanceMethods.keys()).should.eql(['m']);
			String(a.instanceMethods.get('m')).should.eql(ANONYMOUS + '4');
			Array.from(a.staticMethods.keys()).should.eql(['n']);
			String(a.staticMethods.get('n')).should.eql(ANONYMOUS + '5');
			b.isDeclaration.should.eql(false);
			index.byMemberScope.get(a.constructorScope).classInfo.should.equal(a);
			index.byMemberScope.get(a.constructorScope).isStatic.should.eql(false);
			index.byMemberScope.get(a.staticMethods.get('n')).isStatic.should.eql(true);
			index.byMemberScope.get(a.instanceFieldScopes[0]).classInfo.should.equal(a);
			index.newExpressionsByRange.size.should.eql(1);
		});

		it('should cache the index of a page', function () {
			var result = analyze(CODE);
			callResolver.classIndexOf(result.scopeTree).should.equal(callResolver.classIndexOf(result.scopeTree));
		});
	});

	describe('callExpressionOf', function () {
		it('should return the call expression of a new or call statement only', function () {
			var result = analyze([
				'function F() {}',
				'function g() {',
				'  return g();',
				'}',
				'class A {}',
				'new A();',
				'var x = 0;',
				'x = new F();',
				'var o = new A();'
			].join('\n'));
			callResolver.callExpressionOf(nodeAt(result, PAGE, 6)).type.should.eql('NewExpression');
			(callResolver.callExpressionOf(nodeAt(result, PAGE, 8)) === null).should.eql(true);
			(callResolver.callExpressionOf(nodeAt(result, PAGE, 9)) === null).should.eql(true);
			(callResolver.callExpressionOf(nodeAt(result, PAGE + '.g', 3)) === null).should.eql(true);
		});

		it('should return this.m() and new B() of a field initializer (FR-017)', function () {
			var result = analyze([
				'class B {}',
				'class A {',
				'  f = this.m();',
				'  g = new B();',
				'  h = 1;',
				'  m() {}',
				'}'
			].join('\n'));
			var thisCall = callResolver.callExpressionOf(nodeAt(result, ANONYMOUS + '0', 3)),
				newB = callResolver.callExpressionOf(nodeAt(result, ANONYMOUS + '1', 4));
			thisCall.type.should.eql('CallExpression');
			thisCall.callee.object.type.should.eql('ThisExpression');
			newB.type.should.eql('NewExpression');
			newB.callee.name.should.eql('B');
			(callResolver.callExpressionOf(nodeAt(result, ANONYMOUS + '2', 5)) === null).should.eql(true);
		});

		it('should mark the return statement of a field initializer as non-enumerable', function () {
			var result = analyze(['class A {', '  f = 1;', '}'].join('\n'));
			var member = result.scopeTree.root.ast.body[0].body.body[0],
				returnStatement = member.dujsScopeFunction.body.body[0];
			returnStatement.dujsFieldInitializer.should.eql(true);
			Object.keys(returnStatement).should.not.containEql('dujsFieldInitializer');
		});
	});

	describe('calleeScopesOf', function () {
		it('should resolve new F() to the function F', function () {
			var result = analyze(['function F() {}', 'new F();'].join('\n'));
			calleesAt(result, PAGE, 2).should.eql([PAGE + '.F']);
		});

		it('should resolve new A() to the instance fields in source order and the constructor', function () {
			var result = analyze([
				'class A {',
				'  f = 1;',
				'  g;',
				'  static s = 2;',
				'  h = 3;',
				'  constructor() {}',
				'}',
				'new A();'
			].join('\n'));
			calleesAt(result, PAGE, 8).should.eql([ANONYMOUS + '0', ANONYMOUS + '2', ANONYMOUS + '3']);
		});

		it('should resolve new A() of a class without constructor and fields to none', function () {
			var result = analyze(['class A {', '  m() {}', '}', 'new A();'].join('\n'));
			calleesAt(result, PAGE, 4).should.eql([]);
		});

		it('should not follow extends', function () {
			var result = analyze([
				'class A {',
				'  constructor() {}',
				'}',
				'class B extends A {',
				'  constructor() {',
				'    super();',
				'  }',
				'}',
				'new B();'
			].join('\n'));
			calleesAt(result, PAGE, 9).should.eql([ANONYMOUS + '1']);
			/// super() is not connected and does not throw
			calleesAt(result, ANONYMOUS + '1', 6).should.eql([]);
		});

		it('should resolve new ns.A(), new (f())() and an undeclared callee to none', function () {
			var result = analyze([
				'var ns = {};',
				'function f() {}',
				'new ns.A();',
				'new (f())();',
				'new Z();',
				'z();'
			].join('\n'));
			calleesAt(result, PAGE, 3).should.eql([]);
			calleesAt(result, PAGE, 4).should.eql([]);
			calleesAt(result, PAGE, 5).should.eql([]);
			calleesAt(result, PAGE, 6).should.eql([]);
		});

		it('should resolve new A() reached by a function and a class definition to none', function () {
			var result = analyze([
				'var c = 1;',
				'var A = function () {};',
				'if (c) {',
				'  A = class {',
				'    constructor() {}',
				'  };',
				'}',
				'new A();'
			].join('\n'));
			calleesAt(result, PAGE, 8).should.eql([]);
		});

		it('should resolve f() reached by one function definition to the function (FR-018)', function () {
			var result = analyze(['function f() {}', 'f();'].join('\n'));
			calleesAt(result, PAGE, 2).should.eql([PAGE + '.f']);
		});

		it('should resolve f() reached by definitions of different functions to none (FR-018)', function () {
			var result = analyze([
				'var x = 0, c = 1;',
				'var f = function () {',
				'  x = 1;',
				'};',
				'if (c) {',
				'  f = function () {',
				'    x = 2;',
				'  };',
				'}',
				'f();'
			].join('\n'));
			calleesAt(result, PAGE, 10).should.eql([]);
		});

		it('should resolve f() reached by a function and a non-function value to none (FR-018)', function () {
			var result = analyze([
				'var c = 1;',
				'function f() {}',
				'if (c) {',
				'  f = 5;',
				'}',
				'f();'
			].join('\n'));
			calleesAt(result, PAGE, 6).should.eql([]);
		});

		it('should resolve new A() in a function to the only class declaration of the page', function () {
			var result = analyze([
				'class A {',
				'  constructor() {}',
				'}',
				'function g() {',
				'  new A();',
				'}'
			].join('\n'));
			calleesAt(result, PAGE + '.g', 5).should.eql([ANONYMOUS + '0']);
		});

		it('should resolve new A() in a function to a class expression bound by const', function () {
			var result = analyze([
				'const A = class {',
				'  constructor() {}',
				'};',
				'function g() {',
				'  new A();',
				'}'
			].join('\n'));
			calleesAt(result, PAGE + '.g', 5).should.eql([ANONYMOUS + '0']);
		});

		it('should not relax for a class expression bound by var (with its undefined definition)', function () {
			var result = analyze([
				'var A = class {',
				'  constructor() {}',
				'};',
				'function g() {',
				'  new A();',
				'}'
			].join('\n'));
			calleesAt(result, PAGE + '.g', 5).should.eql([]);
		});

		/// 004 H3 replaced by feature 005 D2 for F(): a call in a function is relaxed to the function declaration,
		/// new F() is not (golden-diff.md of feature 005, US2 "unit test expectations")
		it('should relax F() but not new F() for a function declaration (005 D2)', function () {
			var result = analyze([
				'function F() {}',
				'function g() {',
				'  new F();',
				'  F();',
				'}'
			].join('\n'));
			calleesAt(result, PAGE + '.g', 3).should.eql([]);
			calleesAt(result, PAGE + '.g', 4).should.eql([PAGE + '.F']);
		});

		it('should not relax when a definition of A reaches the call-site', function () {
			var result = analyze([
				'class A {',
				'  constructor() {}',
				'}',
				'function g() {',
				'  A = 1;',
				'  new A();',
				'}'
			].join('\n'));
			calleesAt(result, PAGE + '.g', 6).should.eql([]);
		});

		it('should not relax when the page has two definitions of A', function () {
			var result = analyze([
				'class A {',
				'  constructor() {}',
				'}',
				'function g() {',
				'  new A();',
				'}',
				'function h() {',
				'  A = 1;',
				'}'
			].join('\n'));
			calleesAt(result, PAGE + '.g', 5).should.eql([]);
		});

		it('should not modify any node', function () {
			var result = analyze([
				'var x = 0, c = 1;',
				'class A {',
				'  f = new B();',
				'  constructor() {}',
				'}',
				'class B {}',
				'function g() {',
				'  new A();',
				'  f();',
				'}',
				'function f() {}',
				'if (c) {',
				'  new A();',
				'}',
				'g();'
			].join('\n'));
			var models = intraModelsOf(result),
				before = models.map(analyze.snapshotOf);
			models.forEach(function (model) {
				model.graph[2].forEach(function (node) {
					callResolver.callExpressionOf(node);
					callResolver.calleeScopesOf(node, result.scopeTree);
				});
			});
			before.forEach(function (snapshot) {
				analyze.compareSnapshots(snapshot, analyze.snapshotOf(snapshot.model));
			});
		});
	});
});

/**
 * Names of the callee scopes of the first new expression of the node of a line
 * whose source is the given text (feature 007 R7)
 * @param {Object} result
 * @param {string} source
 * @param {number} line
 * @param {string} text
 * @returns {Array}
 */
function newCalleesAt(result, source, line, text) {
	'use strict';
	var node = nodeAt(result, PAGE, line), found = null;
	require('walkes')(node.astNode, {
		FunctionExpression: function () {},
		ArrowFunctionExpression: function () {},
		NewExpression: function (expression, recurse) {
			if (!found && source.slice(expression.range[0], expression.range[1]) === text) {
				found = expression;
			}
			require('walkes').checkProps(expression, recurse);
		}
	});
	(!!found).should.eql(true, 'no expression ' + text);
	return callResolver.calleeScopesOfExpression(node, found, result.scopeTree).map(String);
}

describe('callResolver.calleeScopesOfExpression of new (feature 007 R7)', function () {
	'use strict';

	after(analyze.reset);

	it('should resolve new A() in an expression to the instance fields and then the constructor', function () {
		var source = [
			'class A {',
			'  f = 1;',
			'  static s = 2;',
			'  g = 3;',
			'  constructor() {}',
			'}',
			'var a = [new A()];'
		].join('\n'), result = analyze(source);
		newCalleesAt(result, source, 7, 'new A()').should.eql([ANONYMOUS + '0', ANONYMOUS + '2', ANONYMOUS + '3']);
	});

	it('should resolve new F() in an argument to the function F', function () {
		var source = ['function F() {}', 'function h() {}', 'h(new F());'].join('\n'),
			result = analyze(source);
		newCalleesAt(result, source, 3, 'new F()').should.eql([PAGE + '.F']);
	});

	it('should resolve new F() of new F().m(x = 1) to F only', function () {
		var source = ['function F() {}', 'var x;', 'new F().m(x = 1);'].join('\n'),
			result = analyze(source);
		newCalleesAt(result, source, 3, 'new F()').should.eql([PAGE + '.F']);
	});

	it('should resolve new ns.A() and an undeclared callee in an expression to none', function () {
		var source = ['var ns = {};', 'var a = [new ns.A(), new Z()];'].join('\n'),
			result = analyze(source);
		newCalleesAt(result, source, 2, 'new ns.A()').should.eql([]);
		newCalleesAt(result, source, 2, 'new Z()').should.eql([]);
	});
});
