/*
 * Test cases of class method calls connected to the method bodies
 * (specs/004-fix-remaining-issues, User Story 3, FR-017, FR-018, research R2,
 * KI §7, clarifier M5).
 * Original dujs code, MIT License (see LICENSE).
 *
 * new A(...).m(...) is connected to the instance fields, the constructor and
 * then the instance method m of A (new F().m() only to F); A.s(...) to the
 * static method s; this.m(...) in a member of A to the method m of A (an
 * instance method in an instance member, a static method in a static
 * member); o.m(...) to the instance method m of A when the definitions of o
 * reaching the call-site are at least one and all new A(...). Other forms
 * are not connected. The expected pairs are those of
 * contracts/acceptance.md "US3", "FR-017／FR-018" (handler-new) and "Edge
 * cases".
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
 * Inter-procedural models of the analyzed page
 * @param {Object} result
 * @returns {Array}
 */
function interModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels;
}

/**
 * Pairs of the inter-procedural model whose related scopes are the given ones
 * @param {Object} result
 * @param {Array} scopeNames
 * @returns {Array}
 */
function interPairsOf(result, scopeNames) {
	'use strict';
	var found = null;
	interModelsOf(result).forEach(function (model) {
		if (model.relatedScopes.map(String).join('|') === scopeNames.join('|')) {
			found = model;
		}
	});
	(!!found).should.eql(true, 'no inter-procedural model of ' + scopeNames.join(', '));
	return analyze.pairsOfModel(found);
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
	modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
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

describe('class method calls (User Story 3)', function () {
	'use strict';

	after(analyze.reset);

	/// US3 #1 (KI §7): new A().m(); with A without constructor and fields
	it('US3-1 should connect new A().m(); to the method m', function () {
		var result = analyzeProbe('us3-1');
		result.intraPage().should.eql(['A: L2 -> L7', 'console: entry -> L8', 'x: L4 -> L8']);
		result.interProceduralScopes().should.eql([[PAGE, ANONYMOUS + '0']]);
	});

	/// US3 #2: var o = new A(); is a declaration, o.m(); is connected to m only
	it('US3-2 should connect o.m(); of var o = new A(); to the method m only', function () {
		var result = analyzeProbe('us3-2');
		result.intraPage().should.eql(['A: L2 -> L7', 'console: entry -> L9', 'o: L7 -> L8', 'x: L4 -> L9']);
		result.interProceduralScopes().should.eql([[PAGE, ANONYMOUS + '0']]);
	});

	/// US3 #3: o is new A() in a branch and an object in the other
	it('US3-3 should not connect o.m(); of mixed definitions of o', function () {
		var result = analyzeProbe('us3-3');
		result.intraPage().should.eql([
			'A: L2 -> L8', 'c: L1 -> L7>L10:F', 'c: L1 -> L7>L8:T', 'console: entry -> L13',
			'o: L10 -> L12', 'o: L8 -> L12', 'x: L1 -> L13'
		]);
		result.interProceduralScopes().should.eql([]);
	});

	/// US3 #4: A.s(); is connected to the static method s
	it('US3-4 should connect A.s(); to the static method s', function () {
		var result = analyzeProbe('us3-4');
		result.intraPage().should.eql(['A: L2 -> L7', 'console: entry -> L8', 'x: L4 -> L8']);
	});

	/// US3 #5: this.m(); of a field initializer, the constructor and the method n
	it('US3-5 should connect this.m(); in the members of A to the method m', function () {
		var result = analyzeProbe('us3-5');
		/// x: L9 -> entry is the §18 residue of the entries of the constructor and n
		result.intraPage().should.eql([
			'A: L2 -> L16', 'console: entry -> L17',
			'x: L9 -> L13', 'x: L9 -> L17', 'x: L9 -> L6'
		]);
		/// in the order the models are registered
		result.interProceduralScopes().should.eql([
			[ANONYMOUS + '0', ANONYMOUS + '2'],
			[ANONYMOUS + '1', ANONYMOUS + '2'],
			[ANONYMOUS + '3', ANONYMOUS + '2'],
			[PAGE, ANONYMOUS + '0', ANONYMOUS + '2', ANONYMOUS + '1', ANONYMOUS + '3']
		]);
		interPairsOf(result, [ANONYMOUS + '1', ANONYMOUS + '2']).should.eql(['x: L9 -> L6']);
		interPairsOf(result, [ANONYMOUS + '3', ANONYMOUS + '2']).should.eql(['x: L9 -> L13']);
	});

	/// US3 #6: m only in the super class and k not existing are not connected and do not throw
	it('US3-6 should not connect methods of the super class or missing methods', function () {
		var result = analyzeProbe('us3-6');
		result.intraPage().should.eql([
			'A: L7 -> L10', 'A: L7 -> L9', 'S: L2 -> L7', 'console: entry -> L11', 'x: L1 -> L11'
		]);
		result.interProceduralScopes().should.eql([]);
	});

	/// US3 #7: the field, then the constructor and then m run in order
	it('US3-7 should connect new A().m(); to the field, the constructor and then m', function () {
		var result = analyzeProbe('us3-7');
		var expected = [
			'A: L2 -> L12', 'console: entry -> L13',
			'x: L1 -> L3', 'x: L5 -> L13', 'x: L5 -> L8', 'x: L9 -> L13'
		];
		result.intraPage().should.eql(expected);
		result.interProceduralScopes().should.eql([[PAGE, ANONYMOUS + '0', ANONYMOUS + '1', ANONYMOUS + '2']]);
		interPairsOf(result, [PAGE, ANONYMOUS + '0', ANONYMOUS + '1', ANONYMOUS + '2']).should.eql(expected);
	});

	/// Edge case: this.m() in a static method is connected to the static method m only
	it('should connect this.m() in a static method to the static method only', function () {
		var result = analyzeProbe('edge-static-this');
		result.intraPage().should.eql(['A: L2 -> L14', 'console: entry -> L15', 'x: L8 -> L15', 'y: L1 -> L15']);
		result.interProceduralScopes().should.eql([
			[ANONYMOUS + '0', ANONYMOUS + '1'],
			[PAGE, ANONYMOUS + '0', ANONYMOUS + '1']
		]);
	});

	/// FR-017／FR-018 table: new A(); A.s(); in an event handler are connected by the class relaxation
	it('should connect new A(); A.s(); in an event handler by the class relaxation', function () {
		var result = analyzeProbe('handler-new');
		/// the entry items are §18 residues (the handler is reentered by its LOOP)
		result.intraPage().should.eql([
			'A: L2 -> L11', 'A: L2 -> L12', 'console: entry -> L16',
			'onClick: entry -> L15', 'window: entry -> L15',
			'x: L1 -> L16', 'x: L7 -> L13'
		]);
		result.intraPage().should.not.containEql('x: L1 -> L13');
		result.interProceduralScopes().should.eql([[PAGE + '.onClick', ANONYMOUS + '0', ANONYMOUS + '1']]);
		interPairsOf(result, [PAGE + '.onClick', ANONYMOUS + '0', ANONYMOUS + '1']).should.eql(['x: L7 -> L13']);
	});
});

describe('callResolver.calleeScopesOf of method calls (research R2, clarifier M5)', function () {
	'use strict';

	after(analyze.reset);

	/// Edge case: A without constructor and fields
	it('should resolve new A().m() of a class without constructor and fields to m only', function () {
		var result = analyze(['class A {', '  m() {}', '}', 'new A().m();'].join('\n'));
		calleesAt(result, PAGE, 4).should.eql([ANONYMOUS + '0']);
	});

	it('should resolve new A().m() to the fields, the constructor and then m', function () {
		var result = analyze([
			'class A {',
			'  f = 1;',
			'  constructor() {}',
			'  m() {}',
			'}',
			'new A().m();',
			'new A().k();'
		].join('\n'));
		calleesAt(result, PAGE, 6).should.eql([ANONYMOUS + '0', ANONYMOUS + '1', ANONYMOUS + '2']);
		/// k is not a method of A: only the fields and the constructor
		calleesAt(result, PAGE, 7).should.eql([ANONYMOUS + '0', ANONYMOUS + '1']);
	});

	it('should resolve new F().m() of a function F to F only', function () {
		var result = analyze(['function F() {}', 'new F().m();'].join('\n'));
		calleesAt(result, PAGE, 2).should.eql([PAGE + '.F']);
	});

	it('should resolve A.s() to the static method s only', function () {
		var result = analyze([
			'class A {',
			'  constructor() {}',
			'  static s() {}',
			'  m() {}',
			'}',
			'A.s();',
			'A.m();'
		].join('\n'));
		calleesAt(result, PAGE, 6).should.eql([ANONYMOUS + '1']);
		calleesAt(result, PAGE, 7).should.eql([]);
	});

	/// FR-018: A.s() in a function, A the only class declaration of the page
	it('should resolve A.s() in a function by the class relaxation (FR-018)', function () {
		var result = analyze([
			'class A {',
			'  static s() {}',
			'}',
			'function g() {',
			'  A.s();',
			'}'
		].join('\n'));
		calleesAt(result, PAGE + '.g', 5).should.eql([ANONYMOUS + '0']);
	});

	/// README: var A = class {...} has two definitions on the page (with undefined)
	it('should not resolve A.s() in a function of a class expression bound by var', function () {
		var result = analyze([
			'var A = class {',
			'  static s() {}',
			'};',
			'function g() {',
			'  A.s();',
			'}'
		].join('\n'));
		calleesAt(result, PAGE + '.g', 5).should.eql([]);
	});

	it('should resolve o.m() of o = new A() to m only (not the constructor)', function () {
		var result = analyze([
			'class A {',
			'  constructor() {}',
			'  m() {}',
			'}',
			'var o = new A();',
			'o.m();'
		].join('\n'));
		calleesAt(result, PAGE, 6).should.eql([ANONYMOUS + '1']);
	});

	/// README: o.p = 1 defines o and the definition is not new A()
	it('should not resolve o.m() after a property assignment o.p = 1', function () {
		var result = analyze([
			'class A {',
			'  m() {}',
			'}',
			'var o = new A();',
			'o.p = 1;',
			'o.m();'
		].join('\n'));
		calleesAt(result, PAGE, 6).should.eql([]);
	});

	/// o is declared and not defined before o.m()
	it('should not resolve o.m() without a reaching definition of o', function () {
		var result = analyze([
			'class A {',
			'  m() {}',
			'}',
			'function g() {',
			'  o.m();',
			'}',
			'var o = new A();'
		].join('\n'));
		calleesAt(result, PAGE + '.g', 5).should.eql([]);
	});

	it('should resolve this.m() in instance members to the instance method m', function () {
		var result = analyze([
			'class A {',
			'  f = this.m();',
			'  constructor() {',
			'    this.m();',
			'  }',
			'  m() {}',
			'  static m() {}',
			'  n() {',
			'    this.m();',
			'  }',
			'}'
		].join('\n'));
		calleesAt(result, ANONYMOUS + '0', 2).should.eql([ANONYMOUS + '2']);
		calleesAt(result, ANONYMOUS + '1', 4).should.eql([ANONYMOUS + '2']);
		calleesAt(result, ANONYMOUS + '4', 9).should.eql([ANONYMOUS + '2']);
	});

	it('should resolve this.m() in a static method to the static method m', function () {
		var result = analyze([
			'class A {',
			'  m() {}',
			'  static m() {}',
			'  static s() {',
			'    this.m();',
			'    this.k();',
			'  }',
			'  k() {}',
			'}'
		].join('\n'));
		calleesAt(result, ANONYMOUS + '2', 5).should.eql([ANONYMOUS + '1']);
		calleesAt(result, ANONYMOUS + '2', 6).should.eql([]);
	});

	/// README: this.m() in an arrow function or a function in a method is not connected
	it('should not resolve this.m() in an arrow function or a function in a method', function () {
		var result = analyze([
			'class A {',
			'  m() {}',
			'  n() {',
			'    var f = () => {',
			'      this.m();',
			'    };',
			'    var g = function () {',
			'      this.m();',
			'    };',
			'  }',
			'}',
			'function h() {',
			'  this.m();',
			'}'
		].join('\n'));
		calleesAt(result, ANONYMOUS + '1.$ANONYMOUS_FUN_2', 5).should.eql([]);
		calleesAt(result, ANONYMOUS + '1.$ANONYMOUS_FUN_3', 8).should.eql([]);
		calleesAt(result, PAGE + '.h', 13).should.eql([]);
	});

	/// README: private methods, optional calls and computed or string names are not connected
	it('should not resolve this.#m(), o?.m(), o.m?.(), o[\'m\']() and new ns.A().m()', function () {
		var result = analyze([
			'class A {',
			'  #m() {}',
			'  m() {}',
			'  n() {',
			'    this.#m();',
			'    this[\'m\']();',
			'  }',
			'}',
			'var ns = {A: A};',
			'var o = new A();',
			'o?.m();',
			'o.m?.();',
			'o[\'m\']();',
			'new ns.A().m();',
			'new A()[\'m\']();'
		].join('\n'));
		calleesAt(result, ANONYMOUS + '2', 5).should.eql([]);
		calleesAt(result, ANONYMOUS + '2', 6).should.eql([]);
		calleesAt(result, PAGE, 11).should.eql([]);
		calleesAt(result, PAGE, 12).should.eql([]);
		calleesAt(result, PAGE, 13).should.eql([]);
		calleesAt(result, PAGE, 14).should.eql([]);
		/// only the new A() part (no constructor and no fields): nothing
		calleesAt(result, PAGE, 15).should.eql([]);
	});

	/// Edge case: getters, setters and arrow functions of fields are not methods
	it('should not resolve o.m() of a getter, a setter or an arrow function of a field', function () {
		var result = analyze([
			'var x = 0;',
			'class A {',
			'  get g() {',
			'    x = 1;',
			'    return function () {};',
			'  }',
			'  set s(v) {',
			'    x = 2;',
			'  }',
			'  h = () => {',
			'    x = 3;',
			'  };',
			'}',
			'var o = new A();',
			'o.g();',
			'o.s();',
			'o.h();',
			'console.log(x);'
		].join('\n'));
		var index = callResolver.classIndexOf(result.scopeTree);
		index.byRange.forEach(function (info) {
			Array.from(info.instanceMethods.keys()).should.eql([]);
		});
		calleesAt(result, PAGE, 15).should.eql([]);
		calleesAt(result, PAGE, 16).should.eql([]);
		calleesAt(result, PAGE, 17).should.eql([]);
		/// pairs as before the fix (var o = new A(); is not a call-site)
		result.intraPage().should.eql([
			'A: L2 -> L14', 'console: entry -> L18', 'o: L14 -> L15', 'o: L14 -> L16', 'o: L14 -> L17',
			'x: L1 -> L18'
		]);
		result.interProceduralScopes().should.eql([]);
	});
});
