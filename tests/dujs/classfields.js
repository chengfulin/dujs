/*
 * Test cases for class field initializers and static blocks as scopes
 * (specs/001-fix-known-issues, User Story 3, FR-006)
 *
 * Instance field initializers get their own scopes; 001 D7 "instance field
 * initializers are not connected to the flow" is superseded by 004 FR-003: a
 * `new A();` statement is connected to the instance field initializers (in
 * source order) and then the constructor. Static field initializers and
 * static blocks are connected at the class definition node in source order.
 */
require('should');
var analyze = require('../helpers/analyze');

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

	// static members run in source order; the class name is defined after them
	it('should chain static members in source order and define the class after them', function () {
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
});
