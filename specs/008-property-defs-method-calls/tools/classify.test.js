/*
 * Self test of specs/008-property-defs-method-calls/tools/classify.js
 * (contracts/diff-check.md §3, data-model §6; tasks T006, D006, D011, FR-009).
 * Not part of npm test; run with:
 *   npx mocha specs/008-property-defs-method-calls/tools/classify.test.js
 *
 * Original dujs code, MIT License (see LICENSE).
 */
/* global describe, it */
var assert = require('assert'),
	fs = require('fs'),
	path = require('path');
var classify = require('./classify');

var probesDir = path.join(__dirname, '..', 'probes');
var LOSS = '屬性寫入→讀取損失',
	FIX = '成員目標';

/**
 * Source code of a probe program
 * @param {string} name File name under probes/
 * @returns {string}
 */
function probe(name) {
	'use strict';
	return fs.readFileSync(path.join(probesDir, name), 'utf8');
}

/**
 * Classify a removed pair
 * @param {string} source
 * @param {string} variable
 * @param {number} defLine
 * @param {number} useLine
 * @returns {Object}
 */
function run(source, variable, defLine, useLine) {
	'use strict';
	return classify.classifyRemoved({source: source, variable: variable, defLine: defLine, useLine: useLine});
}

/**
 * Assert the pair is a loss
 * @param {Object} result
 */
function assertLoss(result) {
	'use strict';
	assert.ok(result, 'expected a classification');
	assert.strictEqual(result.category, LOSS, JSON.stringify(result));
	assert.strictEqual(result.sub, null);
	assert.strictEqual(typeof result.reason, 'string');
	assert.ok(result.reason.length > 0);
}

/**
 * Assert the pair is a fix
 * @param {Object} result
 */
function assertFix(result) {
	'use strict';
	assert.ok(result, 'expected a classification');
	assert.strictEqual(result.category, FIX, JSON.stringify(result));
	assert.strictEqual(result.sub, '修正');
	assert.strictEqual(typeof result.reason, 'string');
	assert.ok(result.reason.length > 0);
}

/**
 * Reads at a line without the identifier objects (kind and path only)
 * @param {string} source
 * @param {string} variable
 * @param {number} line
 * @returns {Array}
 */
function reads(source, variable, line) {
	'use strict';
	return classify.readsAt(classify.sourceFacts(source), variable, line).map(function (read) {
		return {kind: read.kind, path: read.path};
	});
}

/**
 * Write paths at a line
 * @param {string} source
 * @param {string} variable
 * @param {number} line
 * @returns {Array}
 */
function writes(source, variable, line) {
	'use strict';
	return classify.writePathsAt(classify.sourceFacts(source), variable, line);
}

describe('classify (008 tools)', function () {
	'use strict';

	describe('contracts/diff-check.md §3.3 table', function () {
		it('P1 o: L8 -> L9 is a fix (o.m() reads [m], write [p])', function () {
			assertFix(run(probe('p1-ki22-1-prop.js'), 'o', 8, 9));
		});

		it('P25 o: L2 -> L3 and o: L4 -> L5 are losses (same path [p])', function () {
			var source = probe('p25-prop-write-read.js');
			assertLoss(run(source, 'o', 2, 3));
			assertLoss(run(source, 'o', 4, 5));
		});

		it('P4 o: L3 -> L4 is a loss', function () {
			assertLoss(run(probe('p4-storage-object.js'), 'o', 3, 4));
		});

		it('P2 has four losses (same path, computed key, delete, whole object)', function () {
			var source = probe('p2-member-targets.js');
			assertLoss(run(source, 'o', 5, 6));
			assertLoss(run(source, 'o', 4, 5));
			assertLoss(run(source, 'o', 9, 10));
			assertLoss(run(source, 'o', 9, 11));
		});

		it('P2 has two fixes (for (o.p of a) only dereferences o)', function () {
			var source = probe('p2-member-targets.js');
			assertFix(run(source, 'o', 7, 8));
			assertFix(run(source, 'o', 8, 8));
		});

		it('P27 o: L7 -> L8 is a loss (console.log(o, x) reads the whole object)', function () {
			assertLoss(run(probe('p27-member-more.js'), 'o', 7, 8));
		});

		it('P29-P32 bare callee and new operand are fixes (D011)', function () {
			assertFix(run(probe('p29-fn-prop-call.js'), 'f', 5, 6));
			assertFix(run(probe('p30-fn-prop-fn.js'), 'f', 5, 8));
			assertFix(run(probe('p31-class-prop-new.js'), 'A', 7, 8));
			assertFix(run(probe('p32-fn-prop-d2.js'), 'f', 5, 7));
		});

		it('P37 o: L2 -> L5 is a loss and q: L6 -> L7 is a fix', function () {
			var source = probe('p37-method-prop-call.js');
			assertLoss(run(source, 'o', 2, 5));
			assertFix(run(source, 'q', 6, 7));
		});

		it('synthetic prefix overlap is a loss (both directions)', function () {
			// write o.p.q, read o.p
			assertLoss(run('var o = {p: {}}, x;\no.p.q = 1;\nx = o.p;\n', 'o', 2, 3));
			// write o.p, read o.p.q
			assertLoss(run('var o = {p: {}}, x;\no.p = {};\nx = o.p.q;\n', 'o', 2, 3));
		});

		it('synthetic two statements on one line is a loss', function () {
			assertLoss(run('var o = {}, x;\no.p = 1; o.q = 2;\nx = o.r;\n', 'o', 2, 3));
		});
	});

	describe('§3.1 definitional member targets (writePathsAt)', function () {
		var source = [
			'var o = {}, a = [1], k = \'p\';', // L1
			'o.p = 1;', // L2
			'o.p += 1;', // L3
			'o.p ||= 1;', // L4
			'[o.p] = a;', // L5
			'({q: o.q} = {q: 1});', // L6
			'for (o.p in a) {}', // L7
			'for (o.p of a) {}', // L8
			'o[k] = 1;', // L9
			'o.p++;', // L10
			'[o.p, o.q] = a;', // L11
			'o.p = o.q = 1;', // L12
			'o = 1;', // L13
			'o.p.q = 1;', // L14
			'o[k].q = 1;' // L15
		].join('\n');

		it('= gives [p]', function () {
			assert.deepStrictEqual(writes(source, 'o', 2), [['p']]);
		});

		it('compound and logical assignments give [p]', function () {
			assert.deepStrictEqual(writes(source, 'o', 3), [['p']]);
			assert.deepStrictEqual(writes(source, 'o', 4), [['p']]);
		});

		it('destructuring targets give their paths', function () {
			assert.deepStrictEqual(writes(source, 'o', 5), [['p']]);
			assert.deepStrictEqual(writes(source, 'o', 6), [['q']]);
		});

		it('for-in and for-of left sides give [p]', function () {
			assert.deepStrictEqual(writes(source, 'o', 7), [['p']]);
			assert.deepStrictEqual(writes(source, 'o', 8), [['p']]);
		});

		it('computed key gives [*]', function () {
			assert.deepStrictEqual(writes(source, 'o', 9), [['*']]);
		});

		it('update expression and plain identifier assignment are not member targets', function () {
			assert.deepStrictEqual(writes(source, 'o', 10), []);
			assert.deepStrictEqual(writes(source, 'o', 13), []);
			assert.deepStrictEqual(writes(source, 'k', 9), []);
		});

		it('several member targets on one node are all listed', function () {
			assert.deepStrictEqual(writes(source, 'o', 11), [['p'], ['q']]);
			assert.deepStrictEqual(writes(source, 'o', 12), [['p'], ['q']]);
		});

		it('member chains follow .object to the variable; computed key stops the path', function () {
			assert.deepStrictEqual(writes(source, 'o', 14), [['p', 'q']]);
			assert.deepStrictEqual(writes(source, 'o', 15), [['*']]);
		});

		it('a def line without member targets is not classified (null)', function () {
			assert.strictEqual(run(source, 'o', 13, 14), null);
			assert.strictEqual(run(source, 'o', 10, 11), null);
		});
	});

	describe('§3.2 read forms (readsAt)', function () {
		var source = [
			'var o = {}, f = function () {}, A = function () {}, k = \'p\', x;', // L1
			'f();', // L2
			'new A();', // L3
			'o.m(1);', // L4
			'x = o.a.b;', // L5
			'x = o[k].b;', // L6
			'o.p = 1;', // L7
			'o.a.b = 1;', // L8
			'for (o.p of []) {}', // L9
			'[o.a.b] = [1];', // L10
			'f(o);', // L11
			'delete o.p;', // L12
			'o.p++;', // L13
			'o.p += 1;', // L14
			'x = typeof o;', // L15
			'o.a.m();', // L16
			'o[k] = 1;' // L17
		].join('\n');

		it('bare callee and new operand are callee reads', function () {
			assert.deepStrictEqual(reads(source, 'f', 2), [{kind: 'callee', path: null}]);
			assert.deepStrictEqual(reads(source, 'A', 3), [{kind: 'callee', path: null}]);
		});

		it('method call reads [m]', function () {
			assert.deepStrictEqual(reads(source, 'o', 4), [{kind: 'method', path: ['m']}]);
		});

		it('member chain reads the static names, stopping after *', function () {
			assert.deepStrictEqual(reads(source, 'o', 5), [{kind: 'member', path: ['a', 'b']}]);
			assert.deepStrictEqual(reads(source, 'o', 6), [{kind: 'member', path: ['*']}]);
			assert.deepStrictEqual(reads(source, 'o', 12), [{kind: 'member', path: ['p']}]);
			assert.deepStrictEqual(reads(source, 'o', 13), [{kind: 'member', path: ['p']}]);
			assert.deepStrictEqual(reads(source, 'o', 14), [{kind: 'member', path: ['p']}]);
			assert.deepStrictEqual(reads(source, 'o', 16), [{kind: 'member', path: ['a', 'm']}]);
		});

		it('= member targets only dereference (path without the last name)', function () {
			assert.deepStrictEqual(reads(source, 'o', 7), [{kind: 'deref', path: []}]);
			assert.deepStrictEqual(reads(source, 'o', 8), [{kind: 'deref', path: ['a']}]);
			assert.deepStrictEqual(reads(source, 'o', 9), [{kind: 'deref', path: []}]);
			assert.deepStrictEqual(reads(source, 'o', 10), [{kind: 'deref', path: ['a']}]);
			assert.deepStrictEqual(reads(source, 'o', 17), [{kind: 'deref', path: []}]);
		});

		it('other positions read the whole object', function () {
			assert.deepStrictEqual(reads(source, 'o', 11), [{kind: 'whole', path: null}]);
			assert.deepStrictEqual(reads(source, 'o', 15), [{kind: 'whole', path: null}]);
		});

		it('computed key identifiers are whole reads of the key variable', function () {
			assert.deepStrictEqual(reads(source, 'k', 6), [{kind: 'whole', path: null}]);
		});

		it('deref [] is a fix, deref with a path is compared', function () {
			var s = 'var o = {a: {}};\no.a = {};\no.a.b = 1;\no.q = {};\no.p.b = 1;\n';
			assertLoss(run(s, 'o', 2, 3));
			assertFix(run(s, 'o', 4, 5));
		});

		it('method read with a different path is a fix, with the same path a loss', function () {
			assertFix(run('var o = {};\no.p = 1;\no.m();\n', 'o', 2, 3));
			assertLoss(run('var o = {};\no.m = 1;\no.m();\n', 'o', 2, 3));
		});

		it('member read of another path is a fix; * on either side is a loss', function () {
			var k = 'var o = {}, k = \'p\', x;\n';
			assertFix(run(k + 'o.p = 1;\nx = o.q;\n', 'o', 2, 3));
			assertLoss(run(k + 'o.p = 1;\nx = o[k];\n', 'o', 2, 3));
			assertLoss(run(k + 'o[k] = 1;\nx = o.q;\n', 'o', 2, 3));
		});

		it('whole object read is a loss', function () {
			assertLoss(run('var o = {};\no.p = 1;\nconsole.log(o);\n', 'o', 2, 3));
			assertLoss(run('var o = {};\no.p = 1;\nvar s = o;\n', 'o', 2, 3));
		});
	});

	describe('§3.2 statement count (statementCountAt)', function () {
		it('counts statements starting or ending on the line, without blocks, functions or classes', function () {
			var facts = classify.sourceFacts('var o = {};\no.p = 1; o.q = 2;\nfunction g() {\n  o.r = 1;\n}\n' +
				'class C {}\nfor (o.p of []) {}\no.f = function () {\n  return 1;\n};\n');
			assert.strictEqual(facts.ast.type, 'Program');
			assert.strictEqual(classify.statementCountAt(facts, 1), 1);
			assert.strictEqual(classify.statementCountAt(facts, 2), 2);
			assert.strictEqual(classify.statementCountAt(facts, 3), 0);
			assert.strictEqual(classify.statementCountAt(facts, 4), 1);
			assert.strictEqual(classify.statementCountAt(facts, 5), 0);
			assert.strictEqual(classify.statementCountAt(facts, 6), 0);
			assert.strictEqual(classify.statementCountAt(facts, 7), 1);
			assert.strictEqual(classify.statementCountAt(facts, 8), 1);
			assert.strictEqual(classify.statementCountAt(facts, 9), 1);
			assert.strictEqual(classify.statementCountAt(facts, 10), 1);
		});
	});

	describe('§3.2 ambiguous cases default to loss', function () {
		it('two statements on the use line', function () {
			assertLoss(run('var o = {}, x;\no.p = 1;\nx = o.q; x = 1;\n', 'o', 2, 3));
		});

		it('two statements on the def line', function () {
			assertLoss(run('var o = {}, x;\no.p = 1; x = 2;\nx = o.q;\n', 'o', 2, 3));
		});

		it('more than one declaration of the name on the page', function () {
			var source = 'var o = {};\no.p = 1;\no.m();\nfunction g(o) {\n  return o;\n}\n';
			assertLoss(run(source, 'o', 2, 3));
		});

		it('class and named function expressions count as one declaration', function () {
			assertFix(run('class A {}\nA.p = 1;\nnew A();\n', 'A', 2, 3));
			assertFix(run('var f = function g() {};\nf.p = 1;\nf();\n', 'f', 2, 3));
		});

		it('no read of the variable on the use line', function () {
			assertLoss(run('var o = {}, x;\no.p = 1;\nx = 1;\n', 'o', 2, 3));
		});
	});

	describe('§3.2 aggregation', function () {
		it('several member targets on one node: any matching write path is a loss', function () {
			var a = 'var o = {}, a = [1, 2], x;\n';
			assertLoss(run(a + '[o.p, o.q] = a;\nx = o.q;\n', 'o', 2, 3));
			assertLoss(run(a + 'o.p = o.q = 1;\nx = o.q;\n', 'o', 2, 3));
			assertFix(run(a + '[o.p, o.q] = a;\nx = o.r;\n', 'o', 2, 3));
		});

		it('any read on the use line that is a loss makes the pair a loss', function () {
			assertLoss(run('var o = {}, x;\no.p = 1;\nx = o.q + o.p;\n', 'o', 2, 3));
			assertFix(run('var o = {}, x;\no.p = 1;\nx = o.q + o.r;\n', 'o', 2, 3));
		});

		it('p-use (decision line) uses the same judgement', function () {
			assertFix(run('var o = {};\no.p = 1;\nif (o.q) {\n}\n', 'o', 2, 3));
			assertLoss(run('var o = {};\no.p = 1;\nif (o.p) {\n}\n', 'o', 2, 3));
			assertLoss(run('var o = {};\no.p = 1;\nwhile (o) {\n}\n', 'o', 2, 3));
		});

		it('use in a callee (cross scope) uses the same judgement', function () {
			var head = 'var o = {};\no.p = 1;\ng();\nfunction g() {\n';
			assertFix(run(head + '  return o.m();\n}\n', 'o', 2, 5));
			assertLoss(run(head + '  return o.p;\n}\n', 'o', 2, 5));
		});

		it('accepts precomputed source facts', function () {
			var facts = classify.sourceFacts(probe('p1-ki22-1-prop.js'));
			assertFix(classify.classifyRemoved({facts: facts, variable: 'o', defLine: 8, useLine: 9}));
		});
	});
});
