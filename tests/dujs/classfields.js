/*
 * Test cases for class field initializers and static blocks as scopes
 * (specs/001-fix-known-issues, User Story 3, FR-006)
 *
 * Instance field initializers get their own scopes; 001 D7 "instance field
 * initializers are not connected to the flow" is superseded by 004 FR-003: a
 * `new A();` statement is connected to the instance field initializers (in
 * source order) and then the constructor. Static field initializers and
 * static blocks are connected at the class definition node in source order;
 * the name of a class declaration is defined at the class node before they
 * run (004 FR-007), the variable of a class expression is not.
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl');

var PROBES = path.join(__dirname, 'cases', 'probes004');

/**
 * Analyze a probe program of feature 004
 * @param {string} name File name without extension
 * @returns {Object} result of the analyze helper
 */
function analyzeProbe(name) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, name + '.js'), 'utf8'));
}

var PAGE = '$DOMAIN.$PAGE_0',
	ANONYMOUS = PAGE + '.$ANONYMOUS_FUN_';

function pairsOf(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

function scopeNamed(result, scopeName) {
	'use strict';
	var found = null;
	result.scopeTree.scopes.forEach(function (scope) {
		if (scope.name === scopeName) {
			found = scope;
		}
	});
	(!!found).should.eql(true);
	return found;
}

var KI4 = [
	'var v = 1;',
	'class A {',
	'  f = v;',
	'  static {',
	'    console.log(v);',
	'  }',
	'}'
].join('\n');

describe('Class field initializers and static blocks', function () {
	'use strict';
	after(analyze.reset);

	// US3-1: the field initializer and the static block each have a scope
	it('US3-1 should create a scope for a field initializer and one for a static block', function () {
		var result = analyze(KI4);
		result.scopeNames().should.eql([PAGE, ANONYMOUS + '0', ANONYMOUS + '1']);
		result.scopeTree.root.children.map(String).should.eql([ANONYMOUS + '0', ANONYMOUS + '1']);
	});

	// US3-2: the static block is connected at the class node; the instance field is not
	it('US3-2 should connect the static block but not the instance field into the intra-page model', function () {
		var result = analyze(KI4);
		var pairs = result.intraPage();
		pairs.should.containEql('v: L1 -> L5');
		pairs.should.not.containEql('v: L1 -> L3');
		result.intraPageScopes().should.containEql(ANONYMOUS + '1');
		result.intraPageScopes().should.not.containEql(ANONYMOUS + '0');
	});

	// US3-3: a static field initializer is connected at the class node
	it('US3-3 should connect a static field initializer into the intra-page model', function () {
		var result = analyze([
			'var v = 1;',
			'class C {',
			'  static s = v;',
			'}'
		].join('\n'));
		result.scopeNames().should.eql([PAGE, ANONYMOUS + '0']);
		result.intraPage().should.containEql('v: L1 -> L3');
	});

	// US3-4: local variables of a static block are paired in its own scope
	it('US3-4 should pair the local variables of a static block in its scope', function () {
		var result = analyze([
			'class B {',
			'  static {',
			'    let t = 1;',
			'    console.log(t);',
			'  }',
			'}'
		].join('\n'));
		result.scopeNames().should.eql([PAGE, ANONYMOUS + '0']);
		result.intraProcedural(ANONYMOUS + '0').should.containEql('t: L3 -> L4');
	});

	// static members run in source order; the class name is defined before
	// them (004 FR-007, research R4), so D at L8 still reads the class node
	it('should chain static members in source order and define the class before them', function () {
		var result = analyze([
			'var v = 1;',
			'class D {',
			'  static a = v;',
			'  static {',
			'    v = 2;',
			'  }',
			'}',
			'console.log(v, D);'
		].join('\n'));
		var pairs = result.intraPage();
		/// the order shows in which definition reaches each use; the uses at
		/// the entry nodes of connected scopes are an existing artifact
		pairs.should.containDeep(['v: L1 -> L3', 'v: L5 -> L8']);
		pairs.should.not.containEql('v: L1 -> L8');
		pairs.should.not.containEql('v: L5 -> L3');
		pairsOf(pairs, 'D').should.eql(['D: L2 -> L8']);
	});

	// a function as a field value keeps its scope, nested in the field scope
	it('should nest the scope of a function field value in the field scope', function () {
		var result = analyze([
			'class E {',
			'  g = (x) => {',
			'    return x;',
			'  };',
			'}'
		].join('\n'));
		var nested = ANONYMOUS + '0.$ANONYMOUS_FUN_1';
		result.scopeNames().should.eql([PAGE, ANONYMOUS + '0', nested]);
		var field = scopeNamed(result, ANONYMOUS + '0');
		field.children.map(String).should.eql([nested]);
		result.intraProcedural(nested).should.eql(['x: entry -> L3']);
	});

	// the synthetic function of a member is cached but not enumerable
	it('should cache the synthetic function of a member as a non-enumerable property', function () {
		var result = analyze(KI4);
		var member = result.scopeTree.root.ast.body[1].body.body[0];
		member.type.should.eql('PropertyDefinition');
		member.dujsScopeFunction.type.should.eql('FunctionExpression');
		Object.keys(member).should.not.containEql('dujsScopeFunction');
	});

	// static members of two classes on a page are chained class by class
	it('should chain the static members of two classes in source order', function () {
		var result = analyze([
			'var v = 1;',
			'class A {',
			'  static s = v;',
			'}',
			'class B {',
			'  static {',
			'    v = 2;',
			'  }',
			'}',
			'console.log(v, A, B);'
		].join('\n'));
		var pairs = result.intraPage();
		pairs.should.containDeep(['v: L1 -> L3', 'v: L7 -> L10']);
		pairs.should.not.containEql('v: L1 -> L10');
		pairsOf(pairs, 'A').should.eql(['A: L2 -> L10']);
		pairsOf(pairs, 'B').should.eql(['B: L5 -> L10']);
	});

	// at one node the static members of a class expression run before the call
	it('should run static members of a class argument before the called function', function () {
		var result = analyze([
			'var v = 1;',
			'function foo(k) {',
			'  return v;',
			'}',
			'foo(class X {',
			'  static s = (v = 2);',
			'});'
		].join('\n'));
		var pairs = pairsOf(result.intraPage(), 'v');
		pairs.should.containEql('v: L6 -> L3');
		pairs.should.not.containEql('v: L1 -> L3');
	});

	// US3-5: methods, computed keys and extends behave as before (characterization)
	it('US3-5 should keep the modeling of methods, computed keys and extends', function () {
		var result = analyze([
			'var k = "m";',
			'var b = 2;',
			'class Base {}',
			'class D extends Base {',
			'  [k](x) {',
			'    return x + b;',
			'  }',
			'}',
			'new D();'
		].join('\n'));
		result.scopeNames().should.eql([PAGE, ANONYMOUS + '0']);
		result.intraProcedural().should.eql(['Base: L3 -> L4', 'D: L4 -> L9', 'k: L1 -> L4']);
		result.intraPage().should.eql(['Base: L3 -> L4', 'D: L4 -> L9', 'k: L1 -> L4']);
		result.intraPageScopes().should.eql([PAGE]);
		result.interProceduralScopes().should.eql([]);
		result.intraProcedural(ANONYMOUS + '0').should.eql(['x: entry -> L6']);
	});

	// a computed key of a field is evaluated in the enclosing scope
	it('should use a computed key of a field in the enclosing scope', function () {
		var result = analyze([
			'var k = "m";',
			'class F {',
			'  [k] = 1;',
			'}'
		].join('\n'));
		result.scopeNames().should.eql([PAGE, ANONYMOUS + '0']);
		pairsOf(result.intraProcedural(), 'k').should.eql(['k: L1 -> L2']);
	});

	describe('class name defined before the static members (004 US4, FR-007, KI §11)', function () {
		// US4 #3: the static block reads the class name defined at the class node
		it('US4-3 should pair the class name with its use in a static block', function () {
			var result = analyzeProbe('us4-3');
			result.intraPage().should.eql(['Q: L1 -> L3', 'console: entry -> L3']);
		});

		// US4 #4: a static field initializer reads the class name
		it('US4-4 should pair the class name with its use in a static field', function () {
			var result = analyzeProbe('us4-4');
			result.intraPage().should.eql(['Q: L2 -> L3', 'Q: L2 -> L5']);
		});

		// edge case: the variable of a class expression is not defined yet when
		// its static members run (only its undefined definition at entry reaches)
		it('should not pair the variable of a class expression in its static members', function () {
			var result = analyze([
				'var B = class {',
				'  static s = B;',
				'};'
			].join('\n'));
			pairsOf(result.intraPage(), 'B').should.not.containEql('B: L1 -> L2');
			pairsOf(result.intraPage(), 'B').should.not.containEql('B: L1 -> entry');
		});

		// edge case: the inner name of a named class expression is bound before its static members run
		// (feature 006 US2-1, Clarifications Session 2026-11-17; was not a variable in 004, Fable A7)
		it('should pair the inner name of a named class expression in its static members', function () {
			var result = analyze([
				'var B = class Q {',
				'  static s = Q;',
				'};'
			].join('\n'));
			pairsOf(result.intraPage(), 'Q').should.containEql('Q: L1 -> L2');
			pairsOf(result.intraPage(), 'B').should.eql([]);
		});
	});
	/// feature 007 T023: the position rules of segmentOfVarDef (the name of a class bound before its static
	/// members) replace keepGenerateAtCallSite and splitByInnerClassName; the pairs of the class static members
	/// are the same as develop (edc22d5). A difference is a bug. The positions not listed as call sites
	/// (T066, a behavior change) are not here.
	describe('class static members as call sites are the same as develop (007 T023)', function () {
		var STATIC = PAGE + '.$ANONYMOUS_FUN_';
		[
			{
				name: 'a class declaration reading its name',
				code: ['var v = 1;', 'class A {', '  static s = A;', '  static {', '    v = A;', '  }', '}', 'console.log(v);'],
				scopes: [PAGE, STATIC + '0', STATIC + '1'],
				pairs: ['A: L2 -> L3', 'A: L2 -> L5', 'console: entry -> L8', 'v: L5 -> L8']
			},
			{
				name: 'the variable of a class expression',
				code: ['var v = 1;', 'var C = class {', '  static s = C;', '  static t = (v = 2);', '};', 'console.log(v, C);'],
				scopes: [PAGE, STATIC + '0', STATIC + '1'],
				pairs: ['C: L2 -> L6', 'C: entry -> L3', 'console: entry -> L6', 'v: L4 -> L6']
			},
			{
				name: 'the inner name of a named class expression',
				code: ['var v = 1;', 'var C = class X {', '  static s = X;', '  static t = (v = X);', '};',
					'console.log(v, C);'],
				scopes: [PAGE, STATIC + '0', STATIC + '1'],
				pairs: ['C: L2 -> L6', 'X: L2 -> L3', 'X: L2 -> L4', 'console: entry -> L6', 'v: L4 -> L6']
			},
			{
				name: 'a class argument before the called function',
				code: ['var v = 1;', 'function foo(k) {', '  return v;', '}', 'foo(class X {', '  static s = (v = 2);', '});',
					'console.log(v);'],
				scopes: [PAGE, STATIC + '0', PAGE + '.foo'],
				pairs: ['console: entry -> L8', 'foo: entry -> L5', 'v: L6 -> L3', 'v: L6 -> L8']
			},
			{
				name: 'a class declaration with a superclass',
				code: ['var v = 1, w = 2;', 'class A extends Object {', '  static s = (v = w);', '}', 'var u = v, q = A;'],
				scopes: [PAGE, STATIC + '0'],
				pairs: ['A: L2 -> L5', 'Object: entry -> L2', 'v: L3 -> L5', 'w: L1 -> L3']
			},
			{
				name: 'a class expression as a condition',
				code: ['var v = 1;', 'if (class {', '  static s = (v = 2);', '}) {', '  console.log(v);', '}'],
				scopes: [PAGE, STATIC + '0'],
				pairs: ['console: entry -> L5', 'v: L3 -> L5']
			}
		].forEach(function (testCase) {
			it('should keep the pairs of ' + testCase.name, function () {
				var result = analyze(testCase.code.join('\n'));
				var models = modelCtrl.collectionOfPageModels.get(result.scopeTree)
					.interProceduralModels.filter(function (model) {
						return model.relatedScopes.map(String).join('|') === testCase.scopes.join('|');
					});
				models.should.have.length(1);
				analyze.pairsOfModel(models[0]).should.eql(testCase.pairs);
				result.intraPage().should.eql(testCase.pairs);
			});
		});
	});
});
