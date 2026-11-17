/*
 * Self test of specs/005-summary-analysis/tools/diffcheck.js
 * (contracts/diff-check.md §1–§5) on synthetic dot directories and inline
 * source code. Not part of npm test; run with:
 *   node specs/005-summary-analysis/tools/diffcheck.test.js
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var assert = require('assert'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var diffcheck = require('./diffcheck');

var tests = [],
	tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck005-test-')),
	PREFIX = '/// --- start probe.js\n';

function test(title, body) {
	'use strict';
	tests.push({title: title, body: body});
}

/**
 * Text of a *.dupairs.dot file with the given rows
 * @param {Array} rows [name, [cell, ...]] pairs, in order
 * @returns {string}
 */
function dupairsDot(rows) {
	'use strict';
	var max = 1;
	rows.forEach(function (row) {
		max = Math.max(max, row[1].length);
	});
	var text = 'digraph structs {\nnode [shape="plaintext"]\nstruct1 [label=<\n' +
		'<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">\n' +
		'<tr><td>Variable</td><td COLSPAN="' + max + '">Def-Use pairs</td></tr>';
	rows.forEach(function (row) {
		text += '<tr><td>' + row[0] + '</td>';
		row[1].forEach(function (cell) {
			text += '<td>' + cell + '</td>';
		});
		for (var i = row[1].length; i < max; ++i) {
			text += '<td></td>';
		}
		text += '</tr>\n';
	});
	return text + '</TABLE>\n>];\n}';
}

/**
 * Text of a *.graph.dot file
 * @param {Array} nodes [[name, label], ...]
 * @param {Array} edges [[from, to, type], ...]; type '' for a normal edge
 * @returns {string}
 */
function graphDot(nodes, edges) {
	'use strict';
	var lines = ['digraph CFG {', 'node [shape="box"]', 'label = ""'];
	nodes.forEach(function (node) {
		lines.push(node[0] + ' [label="' + node[1] + '"]');
	});
	edges.forEach(function (edge) {
		var attrs = edge[2] === 'exception' ? '[color="red", label="exception"]' :
			(edge[2] === 'call' ? '[color="blue", label = "call"]' :
				(edge[2] ? '[label="' + edge[2] + '"]' : '[]'));
		lines.push(edge[0] + ' -> ' + edge[1] + ' ' + attrs);
	});
	return lines.join('\n') + '\n}';
}

/**
 * Text of a *.hierarchy.dot file
 * @param {Array} nodes scope names (h0, h1, ... in order)
 * @param {Array} edges [[fromIndex, toIndex, label], ...]
 * @returns {string}
 */
function hierarchyDot(nodes, edges) {
	'use strict';
	var lines = ['digraph Hierarchy {', 'node [shape="box"]', 'label = "inter-procedural"'];
	nodes.forEach(function (name, index) {
		lines.push('h' + index + ' [label="' + name + '"]');
	});
	edges.forEach(function (edge) {
		lines.push('h' + edge[0] + ' -> h' + edge[1] + ' [color="blue", label="' + edge[2] + '"]');
	});
	return lines.join('\n') + '\n}';
}

var dirCounter = 0;

/**
 * Write an output directory: files maps a relative path to its text, or to
 * an Array of rows for a *.dupairs.dot file
 * @param {Object} files
 * @returns {string} the directory
 */
function outputDir(files) {
	'use strict';
	var dir = path.join(tmpRoot, 'out' + (dirCounter++));
	fs.mkdirSync(dir, {recursive: true});
	Object.keys(files).forEach(function (file) {
		var full = path.join(dir, file);
		fs.mkdirSync(path.dirname(full), {recursive: true});
		fs.writeFileSync(full, Array.isArray(files[file]) ? dupairsDot(files[file]) : files[file]);
	});
	return dir;
}

/**
 * Compare a single-page case
 * @param {string} source page source
 * @param {Object} baseFiles files of the base output (see outputDir)
 * @param {Object} newFiles files of the new output
 * @returns {Object} result of compareCase
 */
function compare(source, baseFiles, newFiles) {
	'use strict';
	return diffcheck.compareCase({
		name: 'c',
		pageSources: [source],
		baseDir: outputDir(baseFiles),
		newDir: outputDir(newFiles)
	});
}

/**
 * The single difference of a result whose content is the given text
 * @param {Object} result
 * @param {string} content
 * @param {string} [sign]
 * @returns {Object}
 */
function diffOf(result, content, sign) {
	'use strict';
	var found = result.diffs.filter(function (diff) {
		return diff.content === content && (!sign || diff.sign === sign);
	});
	assert.strictEqual(found.length, 1, 'difference ' + content + ' of ' + JSON.stringify(result.diffs.map(function (diff) {
		return diff.sign + diff.content;
	})));
	return found[0];
}

function has(diff, category) {
	'use strict';
	return diff.categories.indexOf(category) !== -1;
}

/* ---------- normalization and matching unit ---------- */

test('normalizes finallyExit_* labels to finallyExit', function () {
	'use strict';
	assert.strictEqual(diffcheck.normalizeLabel('finallyExit_a'), 'finallyExit');
	assert.strictEqual(diffcheck.normalizeLabel('finallyExit_ab'), 'finallyExit');
	assert.strictEqual(diffcheck.normalizeLabel('finallyExit'), 'finallyExit');
	assert.strictEqual(diffcheck.normalizeLabel('entry_b'), 'entry');
	assert.strictEqual(diffcheck.normalizeLabel('30a'), '30');
	var rows = diffcheck.parseDupairs(dupairsDot([['x', ['(finallyExit_a,7)', '(2,(finallyExit_b,8))']]]));
	assert.deepStrictEqual(rows[0].pairs, ['x: finallyExit -> 7', 'x: 2 -> (finallyExit,8)']);
});

test('finallyExit nodes with different letters compare equal', function () {
	'use strict';
	var result = compare('var x;\n', {'page0/intra-pages/0.dupairs.dot': [['x', ['(finallyExit_a,7)']]]},
		{'page0/intra-pages/0.dupairs.dot': [['x', ['(finallyExit_c,7)']]]});
	assert.strictEqual(result.diffs.length, 0);
});

test('matching files are new files: format checked, not counted as differences', function () {
	'use strict';
	var good = JSON.stringify({format: 'dujs-matching/1', level: 'intraPage', calls: []}, null, 2),
		result = compare('var x;\n', {'page0/intra-pages/0.graph.dot': graphDot([], [])}, {
			'page0/intra-pages/0.graph.dot': graphDot([], []),
			'page0/intra-pages/0.matching.json': good,
			'page0/inter-procedurals/0.matching.json': '{"format": "other"}',
			'inter-page/0.matching.json': 'not json'
		});
	assert.strictEqual(result.diffs.length, 0);
	assert.strictEqual(result.matching.length, 3);
	var problems = diffcheck.verifyRecord([result], diffcheck.buildReport([result]));
	assert.strictEqual(problems.filter(function (problem) {
		return /matching/.test(problem);
	}).length, 2, problems.join('\n'));
	assert.ok(problems.some(function (problem) {
		return /inter-procedurals\/0\.matching\.json.*graph\.dot/.test(problem);
	}), 'a matching file without its graph is reported');
	var clean = compare('var x;\n', {'page0/intra-pages/0.graph.dot': graphDot([], [])},
		{'page0/intra-pages/0.graph.dot': graphDot([], []), 'page0/intra-pages/0.matching.json': good});
	assert.deepStrictEqual(diffcheck.verifyRecord([clean], diffcheck.buildReport([clean])), []);
});

/* ---------- §18 ---------- */

test('§18: a removed pair whose use is entry', function () {
	'use strict';
	var result = compare('var x = 1;\nfunction f() {}\n', {'page0/intra-procedurals/1.dupairs.dot': [['x', ['(1,entry_b)']]]},
		{'page0/intra-procedurals/1.dupairs.dot': [['x', []]]});
	assert.ok(has(diffOf(result, 'x: 1 -> entry'), '§18'));
	var added = compare('var x = 1;\n', {'page0/intra-pages/0.dupairs.dot': [['x', []]]},
		{'page0/intra-pages/0.dupairs.dot': [['x', ['(1,entry_b)']]]});
	assert.ok(!has(diffOf(added, 'x: 1 -> entry'), '§18'));
});

/* ---------- 連結 ---------- */

var LINK_SOURCE = 'let f = function () {};\nfunction g() {\nf();\n}\ng();\n';

test('連結: a D2 call site not linked in the base hierarchy triggers the page', function () {
	'use strict';
	var base = {
			'page0/inter-procedurals/0.hierarchy.dot': hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.g'], [[0, 1, 'call']]),
			'page0/intra-pages/0.dupairs.dot': [['f', ['(1,5)']]]
		},
		next = {'page0/intra-pages/0.dupairs.dot': [['f', ['(1,5)', '(1,3)']]]},
		result = compare(LINK_SOURCE, base, next),
		diff = diffOf(result, 'f: 1 -> 3', '+');
	assert.ok(has(diff, '連結'));
	assert.ok(result.triggers.page0.some(function (trigger) {
		return trigger.kind === '連結' && trigger.line === 3;
	}));
});

test('連結: no trigger when the base hierarchy already links the call', function () {
	'use strict';
	var base = {
			'page0/inter-procedurals/0.hierarchy.dot': hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.g',
				'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0'], [[0, 1, 'call'], [1, 2, 'call']]),
			'page0/intra-pages/0.dupairs.dot': [['f', ['(1,5)']]]
		},
		result = compare(LINK_SOURCE.replace('let f = function () {};', 'function f() {}'), {
			'page0/inter-procedurals/0.hierarchy.dot': hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.g',
				'$DOMAIN.$PAGE_0.f'], [[0, 1, 'call'], [1, 2, 'call']]),
			'page0/intra-pages/0.dupairs.dot': [['f', ['(1,5)']]]
		}, {'page0/intra-pages/0.dupairs.dot': [['f', ['(1,5)', '(1,3)']]]});
	assert.ok(!has(diffOf(result, 'f: 1 -> 3', '+'), '連結'));
	// a var (not let/const/function) callee is not a D2 site
	var plain = compare(LINK_SOURCE.replace('let f', 'var f'), base,
		{'page0/intra-pages/0.dupairs.dot': [['f', ['(1,5)', '(1,3)']]]});
	assert.ok(!has(diffOf(plain, 'f: 1 -> 3', '+'), '連結'));
	// a call at the top level is not a D2 site
	var top = compare('let f = function () {};\nf();\n', {'page0/intra-pages/0.dupairs.dot': [['f', []]]},
		{'page0/intra-pages/0.dupairs.dot': [['f', ['(1,2)']]]});
	assert.ok(!has(diffOf(top, 'f: 1 -> 2', '+'), '連結'));
});

test('連結: model and graph differences of a triggered page', function () {
	'use strict';
	var result = compare(LINK_SOURCE, {
		'page0/inter-procedurals/0.hierarchy.dot': hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.g'], [[0, 1, 'call']])
	}, {
		'page0/inter-procedurals/0.hierarchy.dot': hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.g',
			'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0'], [[0, 1, 'call'], [1, 2, 'call']]),
		'page0/inter-procedurals/1.dupairs.dot': [['f', []]]
	});
	assert.ok(has(diffOf(result, 'inter-procedurals/1.dupairs.dot'), '連結'));
	assert.ok(has(diffOf(result, 'inter-procedurals/0.hierarchy.dot'), '連結'));
});

/* ---------- finally ---------- */

test('finally: a page with a finalizer (empty or not) and a pair in or after the try', function () {
	'use strict';
	['var x = 1;\ntry {\nx = 2;\n} finally {\n}\nx;\n', 'var x = 1;\ntry {\nx = 2;\n} finally {\nx = 3;\n}\nx;\n'].forEach(function (source) {
		var result = compare(source, {'page0/intra-procedurals/0.dupairs.dot': [['x', []]]},
			{'page0/intra-procedurals/0.dupairs.dot': [['x', ['(3,7)', '(1,1)']]]});
		assert.ok(has(diffOf(result, 'x: 3 -> 7'), 'finally'));
		assert.ok(!has(diffOf(result, 'x: 1 -> 1'), 'finally'), 'def and use before the try');
	});
	var noFinalizer = compare('var x = 1;\ntry {\nx = 2;\n} catch (e) {\n}\nx;\n',
		{'page0/intra-procedurals/0.dupairs.dot': [['x', []]]},
		{'page0/intra-procedurals/0.dupairs.dot': [['x', ['(3,6)']]]});
	assert.ok(!has(diffOf(noFinalizer, 'x: 3 -> 6'), 'finally'));
});

/* ---------- 例外IN ---------- */

// probes/c-out3.js with the line the CLI prepends (dot line = source line + 1)
var C_OUT3 = PREFIX + 'var x = 0;\nvar o = {};\ntry {\nx = o.p;\n} catch (e) {\nconsole.log(x);\n}\n',
	C_OUT3_GRAPH = graphDot([['n17', 'entry'], ['n18', '2'], ['n19', '3'], ['n20', '5'], ['n21', 'exit'], ['n22', '6'], ['n23', '7']],
		[['n17', 'n18', ''], ['n18', 'n19', ''], ['n19', 'n20', ''], ['n20', 'n21', ''], ['n20', 'n22', 'exception'],
			['n22', 'n23', ''], ['n23', 'n21', ''], ['n23', 'n21', 'exception']]);

test('例外IN: a removed pair whose def node throws in the base intra-procedural graph (c-out3)', function () {
	'use strict';
	var result = compare(C_OUT3, {
		'page0/intra-procedurals/0.graph.dot': C_OUT3_GRAPH,
		'page0/intra-procedurals/0.dupairs.dot': [['x', ['(5,7)']]]
	}, {
		'page0/intra-procedurals/0.graph.dot': C_OUT3_GRAPH,
		'page0/intra-procedurals/0.dupairs.dot': [['x', ['(2,7)']]]
	});
	assert.ok(has(diffOf(result, 'x: 5 -> 7', '-'), '例外IN'));
	var quiet = graphDot([['n18', '2'], ['n20', '5'], ['n23', '7']], [['n18', 'n20', ''], ['n20', 'n23', '']]),
		none = compare(C_OUT3, {'page0/intra-procedurals/0.graph.dot': quiet, 'page0/intra-procedurals/0.dupairs.dot': [['x', ['(5,7)']]]},
			{'page0/intra-procedurals/0.dupairs.dot': [['x', []]]});
	assert.ok(!has(diffOf(none, 'x: 5 -> 7', '-'), '例外IN'));
});

test('例外IN: an added pair of the c-out3 type (def reaches a throwing node whose target reaches the use)', function () {
	'use strict';
	var result = compare(C_OUT3, {
		'page0/intra-procedurals/0.graph.dot': C_OUT3_GRAPH,
		'page0/intra-procedurals/0.dupairs.dot': [['x', ['(5,7)']]],
		'page0/intra-pages/0.graph.dot': C_OUT3_GRAPH,
		'page0/intra-pages/0.dupairs.dot': [['x', ['(5,7)']]]
	}, {
		'page0/intra-procedurals/0.dupairs.dot': [['x', ['(2,7)']]],
		'page0/intra-pages/0.dupairs.dot': [['x', ['(2,7)', '(7,2)']]]
	});
	result.diffs.filter(function (diff) {
		return diff.content === 'x: 2 -> 7';
	}).forEach(function (diff) {
		assert.ok(has(diff, '例外IN'), diff.file);
	});
	assert.ok(!has(diffOf(result, 'x: 7 -> 2', '+'), '例外IN'), 'no exceptional path from L7 to L2');
});

// probes/us3-3.js: base intra-page flattened graph (s copied into the page)
var US3_3 = PREFIX + 'var x = 0;\nfunction s() {\nx = 1;\nconsole.log(1);\nx = 2;\n}\ntry {\ns();\n} catch (e) {\nconsole.log(x);\n}\n',
	US3_3_GRAPH = graphDot([['n14', 'entry_a'], ['n15', '2'], ['n16', 'call'], ['n17', 'entry_b'], ['n18', '4'], ['n19', '5'], ['n20', '6'],
		['n21', 'exit_a'], ['n22', 'callReturn'], ['n23', 'loop'], ['n24', 'exit_b'], ['n25', '10'], ['n26', '11'], ['n27', 'loopReturn']], [
		['n14', 'n15', ''], ['n15', 'n16', ''], ['n16', 'n17', 'call'], ['n17', 'n18', ''], ['n18', 'n19', ''], ['n19', 'n20', ''],
		['n20', 'n21', ''], ['n21', 'n22', 'return'], ['n22', 'n23', ''], ['n23', 'n24', ''], ['n23', 'n27', 'onEvent'], ['n25', 'n26', ''],
		['n26', 'n23', ''], ['n27', 'n23', 'return'], ['n18', 'n21', 'exception'], ['n19', 'n21', 'exception'], ['n20', 'n21', 'exception'],
		['n22', 'n25', 'exception'], ['n26', 'n23', 'exception']]);

test('例外IN: an added pair across functions (us3-3) by the base flattened graph', function () {
	'use strict';
	var result = compare(US3_3, {
		'page0/intra-pages/0.graph.dot': US3_3_GRAPH,
		'page0/intra-pages/0.dupairs.dot': [['x', ['(4,11)', '(6,11)']]]
	}, {
		'page0/intra-pages/0.graph.dot': US3_3_GRAPH,
		'page0/intra-pages/0.dupairs.dot': [['x', ['(2,11)', '(4,11)', '(10,4)']]]
	});
	assert.ok(has(diffOf(result, 'x: 2 -> 11', '+'), '例外IN'));
	assert.ok(!has(diffOf(result, 'x: 10 -> 4', '+'), '例外IN'), 'L10 reaches no throwing node leading to L4');
	// the intra-procedural graphs alone (no flattening) do not show the path
	var intraOnly = compare(US3_3, {
		'page0/intra-procedurals/0.graph.dot': graphDot([['n1', '2'], ['n2', '9'], ['n3', '11']],
			[['n1', 'n2', ''], ['n2', 'n3', '']]),
		'page0/intra-procedurals/0.dupairs.dot': [['x', []]]
	}, {'page0/intra-procedurals/0.dupairs.dot': [['x', ['(2,11)']]]});
	assert.ok(!has(diffOf(intraOnly, 'x: 2 -> 11', '+'), '例外IN'));
});

/* ---------- Q-a ---------- */

test('Q-a: def at a call point of a linked call, not at the intra-procedural level (±)', function () {
	'use strict';
	var source = 'var x;\nfunction f() {}\ntry {\nx = f();\n} catch (e) {\nx;\n}\n',
		hierarchy = hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.f'], [[0, 1, 'call']]),
		result = compare(source, {
			'page0/inter-procedurals/0.hierarchy.dot': hierarchy,
			'page0/inter-procedurals/0.dupairs.dot': [['x', ['(callReturn,6)', '(4,6)']]],
			'page0/intra-procedurals/0.dupairs.dot': [['x', ['(4,6)']]]
		}, {
			'page0/inter-procedurals/0.dupairs.dot': [['x', ['(1,6)']]],
			'page0/intra-procedurals/0.dupairs.dot': [['x', []]]
		});
	assert.ok(has(diffOf(result, 'x: callReturn -> 6', '-'), 'Q-a'));
	var lineDiffs = result.diffs.filter(function (diff) {
		return diff.content === 'x: 4 -> 6';
	});
	assert.strictEqual(lineDiffs.length, 2);
	lineDiffs.forEach(function (diff) {
		assert.strictEqual(has(diff, 'Q-a'), !/^intra-procedurals/.test(diff.file), diff.file);
	});
	var unlinked = compare(source, {'page0/inter-procedurals/0.dupairs.dot': [['x', ['(4,6)']]]},
		{'page0/inter-procedurals/0.dupairs.dot': [['x', []]]});
	assert.ok(!has(diffOf(unlinked, 'x: 4 -> 6'), 'Q-a'), 'no call edge in the base hierarchy');
});

test('Q-a: the bodies of an IIFE and of a multi-line callback are not call points', function () {
	'use strict';
	var facts = diffcheck.sourceFactsOf('(function () {\nvar a = 1;\nvar b = a;\n}());\n' +
		"window.addEventListener('x', function () {\nvar c = 1;\n});\n");
	assert.ok(facts.callLines.has(1) && facts.callLines.has(5), 'the call start lines');
	[2, 3, 6].forEach(function (line) {
		assert.ok(!facts.callLines.has(line), 'line ' + line + ' is inside a function body');
	});
});

/* ---------- 摘要 ---------- */

test('摘要: a removed pair of a page with call edges or LOOP handlers, not at the intra-procedural level', function () {
	'use strict';
	var hierarchy = hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.f'], [[0, 1, 'call']]),
		result = compare('var x;\n', {
			'page0/inter-procedurals/0.hierarchy.dot': hierarchy,
			'page0/intra-pages/0.dupairs.dot': [['x', ['(1,9)']]],
			'page0/intra-procedurals/0.dupairs.dot': [['x', ['(1,9)']]]
		}, {
			'page0/intra-pages/0.dupairs.dot': [['x', ['(1,8)']]],
			'page0/intra-procedurals/0.dupairs.dot': [['x', []]]
		});
	result.diffs.filter(function (diff) {
		return diff.content === 'x: 1 -> 9';
	}).forEach(function (diff) {
		assert.strictEqual(has(diff, '摘要'), diff.file === 'intra-pages/0.dupairs.dot', diff.file);
	});
	assert.ok(!has(diffOf(result, 'x: 1 -> 8', '+'), '摘要'), 'only removed pairs');
	var handlers = compare('var x;\n', {
		'page0/intra-pages/0.hierarchy.dot': hierarchyDot(['$DOMAIN.$PAGE_0', 'loop', '$DOMAIN.$PAGE_0.h'], [[0, 1, 'loop'], [1, 2, 'onEvent']]),
		'page0/intra-pages/0.dupairs.dot': [['x', ['(1,9)']]]
	}, {'page0/intra-pages/0.dupairs.dot': [['x', []]]});
	assert.ok(has(diffOf(handlers, 'x: 1 -> 9'), '摘要'));
	var none = compare('var x;\n', {'page0/intra-pages/0.dupairs.dot': [['x', ['(1,9)']]]},
		{'page0/intra-pages/0.dupairs.dot': [['x', []]]});
	assert.ok(!has(diffOf(none, 'x: 1 -> 9'), '摘要'));
});

/* ---------- 保守摘要 ---------- */

test('保守摘要: a page calling a generator or async function, not at the intra-procedural level', function () {
	'use strict';
	['function* g() {}\nvar x;\ng();\n', 'async function g() {}\nvar x;\ng();\n', 'var g = async () => {};\nvar x;\ng();\n'].forEach(function (source) {
		var result = compare(source, {
			'page0/intra-pages/0.dupairs.dot': [['x', ['(2,9)']]],
			'page0/intra-procedurals/0.dupairs.dot': [['x', ['(2,9)']]]
		}, {
			'page0/intra-pages/0.dupairs.dot': [['x', ['(2,8)']]],
			'page0/intra-procedurals/0.dupairs.dot': [['x', []]]
		});
		assert.ok(has(diffOf(result, 'x: 2 -> 8', '+'), '保守摘要'), source);
		result.diffs.filter(function (diff) {
			return diff.content === 'x: 2 -> 9';
		}).forEach(function (diff) {
			assert.strictEqual(has(diff, '保守摘要'), diff.file === 'intra-pages/0.dupairs.dot', source + diff.file);
		});
	});
	var plain = compare('function g() {}\nvar x;\ng();\n', {'page0/intra-pages/0.dupairs.dot': [['x', []]]},
		{'page0/intra-pages/0.dupairs.dot': [['x', ['(2,8)']]]});
	assert.ok(!has(diffOf(plain, 'x: 2 -> 8', '+'), '保守摘要'));
});

/* ---------- graph 共通 ---------- */

test('共通: a graph difference of a page with any call', function () {
	'use strict';
	var result = compare('function f() {}\nf();\n', {'page0/intra-procedurals/0.graph.dot': graphDot([['n1', '2']], [])},
		{'page0/intra-procedurals/0.graph.dot': graphDot([['n1', '2'], ['n2', '3']], [])});
	assert.ok(has(diffOf(result, 'intra-procedurals/0.graph.dot'), '共通'));
	var none = compare('var x;\n', {'page0/intra-procedurals/0.graph.dot': graphDot([['n1', '2']], [])},
		{'page0/intra-procedurals/0.graph.dot': graphDot([['n1', '2'], ['n2', '3']], [])});
	assert.deepStrictEqual(diffOf(none, 'intra-procedurals/0.graph.dot').categories, []);
});

/* ---------- SC-005: added pairs ---------- */

test('an added pair can only be 連結, finally, 例外IN, Q-a or 保守摘要; otherwise --verify fails', function () {
	'use strict';
	var hierarchy = hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.f'], [[0, 1, 'call']]),
		result = compare('var x;\n', {
			'page0/inter-procedurals/0.hierarchy.dot': hierarchy,
			'page0/intra-pages/0.dupairs.dot': [['x', []]]
		}, {'page0/intra-pages/0.dupairs.dot': [['x', ['(1,entry_a)']]]}),
		diff = diffOf(result, 'x: 1 -> entry', '+');
	assert.deepStrictEqual(diff.categories, [], 'neither §18 nor 摘要 applies to an added pair');
	var report = diffcheck.buildReport([result]);
	assert.ok(report.indexOf('（無成立類別）') !== -1);
	var problems = diffcheck.verifyRecord([result], report);
	assert.ok(problems.some(function (problem) {
		return /判準不成立/.test(problem);
	}), problems.join('\n'));
	var forced = report.replace('（無成立類別）', '摘要');
	assert.ok(diffcheck.verifyRecord([result], forced).some(function (problem) {
		return /摘要.*判準不成立/.test(problem);
	}));
});

/* ---------- record: pinning, rows ---------- */

/**
 * A result with one 摘要 removal and one 例外IN addition (c-out3, intra-page)
 * @returns {Object}
 */
function pinnedResult() {
	'use strict';
	return compare(C_OUT3, {
		'page0/inter-procedurals/0.hierarchy.dot': hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.f'], [[0, 1, 'call']]),
		'page0/intra-pages/0.graph.dot': C_OUT3_GRAPH,
		'page0/intra-pages/0.dupairs.dot': [['o', ['(3,9)']], ['x', ['(5,7)']]]
	}, {
		'page0/intra-pages/0.dupairs.dot': [['o', []], ['x', ['(2,7)', '(5,7)']]]
	});
}

/**
 * Fill the blank notes of the report so that it is a complete record
 * @param {string} report
 * @returns {string}
 */
function filled(report) {
	'use strict';
	return report.split('\n').map(function (line) {
		if (/^\| \d+ \|/.test(line)) {
			return line.replace(/\|\s*\|$/, '| 說明 |');
		}
		if (/^\| c \| page0 \|/.test(line)) {
			var cells = line.split('|');
			cells[cells.length - 3] = ' 說明 ';
			return cells.join('|');
		}
		return line;
	}).join('\n');
}

test('a complete record passes --verify; pinned counts are checked per page and category', function () {
	'use strict';
	var result = pinnedResult(),
		report = diffcheck.buildReport([result]),
		record = filled(report);
	assert.ok(has(diffOf(result, 'o: 3 -> 9', '-'), '摘要'));
	assert.ok(has(diffOf(result, 'x: 2 -> 7', '+'), '例外IN'));
	assert.deepStrictEqual(diffcheck.verifyRecord([result], record), []);
	assert.ok(/\| c \| page0 \| 摘要 \|[^\n]*\| 0 \| 1 \|/.test(record), record);
	assert.ok(/\| c \| page0 \| 例外IN \|[^\n]*\| 1 \| 0 \|/.test(record), record);
	var wrongCount = record.replace(/(\| c \| page0 \| 例外IN \|[^\n]*?)\| 1 \| 0 \|/, '$1| 2 | 0 |');
	assert.ok(diffcheck.verifyRecord([result], wrongCount).some(function (problem) {
		return /釘選.*例外IN.*實際/.test(problem);
	}));
	var missingPin = record.split('\n').filter(function (line) {
		return !/^\| c \| page0 \| 摘要 \|/.test(line);
	}).join('\n');
	assert.ok(diffcheck.verifyRecord([result], missingPin).some(function (problem) {
		return /未列/.test(problem);
	}));
	assert.ok(diffcheck.verifyRecord([result], report).some(function (problem) {
		return /說明必填/.test(problem);
	}), 'blank notes of pinned differences fail');
});

test('--verify fails on an extra row and on a missing row', function () {
	'use strict';
	var result = pinnedResult(),
		record = filled(diffcheck.buildReport([result])),
		lines = record.split('\n'),
		rowIndex = lines.findIndex(function (line) {
			return /^\| 1 \|/.test(line);
		}),
		extra = lines.slice(0, rowIndex + 1).concat([lines[rowIndex].replace(/^\| 1 \|/, '| 9 |')], lines.slice(rowIndex + 1)).join('\n'),
		missing = lines.filter(function (line, index) {
			return index !== rowIndex;
		}).join('\n');
	assert.ok(diffcheck.verifyRecord([result], extra).some(function (problem) {
		return /記錄與實際不符/.test(problem);
	}));
	assert.ok(diffcheck.verifyRecord([result], missing).some(function (problem) {
		return /差異未記錄/.test(problem);
	}));
});

test('a record without the machine sections fails', function () {
	'use strict';
	assert.ok(diffcheck.verifyRecord([], '# x\n').length > 0);
});

test('golden mode exits 2 without a base line and without --base', function () {
	'use strict';
	var file = path.join(tmpRoot, 'nobase.md'),
		messages = [];
	fs.writeFileSync(file, '# golden-diff\n\n基準：（未填）\n');
	var status = diffcheck.main(['golden', '--verify', file], {
		out: function (text) {
			messages.push(text);
		},
		err: function (text) {
			messages.push(text);
		}
	});
	assert.strictEqual(status, 2, messages.join('\n'));
	assert.strictEqual(diffcheck.baseOf('基準：`9e324be`（develop）\n'), '9e324be');
});

/* ---------- Setup review SHOULD-FIX (T101) ---------- */

test('R3: a changed graph (~) is listed in its pin row but counted in neither + nor −', function () {
	'use strict';
	var source = 'var x = 1;\ntry {\nx = 2;\n} finally {\nx = 3;\n}\nx;\n',
		result = compare(source, {
			'page0/intra-procedurals/0.graph.dot': graphDot([['n1', '2']], []),
			'page0/intra-procedurals/0.dupairs.dot': [['x', []]]
		}, {
			'page0/intra-procedurals/0.graph.dot': graphDot([['n1', '2'], ['n2', 'finallyExit']], []),
			'page0/intra-procedurals/0.dupairs.dot': [['x', ['(3,7)']]]
		}),
		graph = diffOf(result, 'intra-procedurals/0.graph.dot', '~');
	assert.strictEqual(graph.categories[0], 'finally');
	assert.strictEqual(diffOf(result, 'x: 3 -> 7', '+').categories[0], 'finally');
	var record = filled(diffcheck.buildReport([result])).replace('| （亦符：共通） |', '| 說明（亦符：共通） |');
	assert.ok(/\| c \| page0 \| finally \|[^\n]*\| 1 \| 0 \|[^\n]*（#1、#2）/.test(record), record);
	assert.deepStrictEqual(diffcheck.verifyRecord([result], record), []);
	var counted = record.replace(/(\| c \| page0 \| finally \|[^\n]*?)\| 1 \| 0 \|/, '$1| 1 | 1 |');
	assert.ok(diffcheck.verifyRecord([result], counted).some(function (problem) {
		return /釘選 \+1／−1，實際 \+1／−0/.test(problem);
	}), 'the old count (~ as −) fails');
});

test('R4: throwing lines of a removed pair are keyed by page, not shared across pages', function () {
	'use strict';
	var quiet = 'var x = 0;\nvar o = {};\nvar y = 0;\nx = 1;\ny = 2;\nconsole.log(x, y);\n',
		throwing = PREFIX + 'var y = 0;\nvar o = {};\ntry {\ny = o.p;\n} catch (e) {\nconsole.log(y);\n}\n',
		throwingGraph = graphDot([['n1', '5'], ['n2', '7']], [['n1', 'n2', 'exception']]),
		result = diffcheck.compareCase({
			name: 'c',
			pageSources: [PREFIX + quiet, throwing],
			baseDir: outputDir({
				'page0/intra-pages/0.dupairs.dot': [['x', ['(5,7)']]],
				'page1/intra-procedurals/0.graph.dot': throwingGraph,
				'page1/intra-pages/0.dupairs.dot': [['y', ['(5,7)']]],
				'inter-page/0.dupairs.dot': [['x', ['(5,7)']], ['y', ['(5,7)']]]
			}),
			newDir: outputDir({
				'page0/intra-pages/0.dupairs.dot': [['x', []]],
				'page1/intra-pages/0.dupairs.dot': [['y', []]],
				'inter-page/0.dupairs.dot': [['x', []], ['y', []]]
			})
		});
	function removed(page, content) {
		var found = result.diffs.filter(function (diff) {
			return diff.page === page && diff.content === content && diff.sign === '-';
		});
		assert.strictEqual(found.length, 1, page + ' ' + content);
		return found[0];
	}
	assert.ok(!has(removed('page0', 'x: 5 -> 7'), '例外IN'), 'L5 of page1 throws, not L5 of page0');
	assert.ok(has(removed('page1', 'y: 5 -> 7'), '例外IN'));
	assert.ok(has(removed('inter-page', 'y: 5 -> 7'), '例外IN'), 'page1 L5 assigns y and throws');
	assert.ok(!has(removed('inter-page', 'x: 5 -> 7'), '例外IN'), 'page1 L5 does not mention x; page0 L5 does not throw');
});

test('R5: the callback body of a chained call is not a call point', function () {
	'use strict';
	var facts = diffcheck.sourceFactsOf('p.then(function () {\nvar a = 1;\nvar b = a;\n}).catch(g);\n' +
		'q.then(() => {\nvar c = 1;\n}).\nfinally(h);\n');
	[1, 4, 5, 8].forEach(function (line) {
		assert.ok(facts.callLines.has(line), 'line ' + line + ' starts a call or holds the last property of the callee');
	});
	[2, 3, 6, 7].forEach(function (line) {
		assert.ok(!facts.callLines.has(line), 'line ' + line + ' is inside the callback body');
	});
});

/* ---------- run ---------- */

var failed = 0;
tests.forEach(function (item) {
	'use strict';
	try {
		item.body();
		process.stdout.write('ok - ' + item.title + '\n');
	} catch (error) {
		failed++;
		process.stdout.write('not ok - ' + item.title + '\n  ' + String(error.stack).split('\n').slice(0, 4).join('\n  ') + '\n');
	}
});
fs.rmSync(tmpRoot, {recursive: true, force: true});
process.stdout.write(tests.length + ' tests, ' + failed + ' failed\n');
process.exitCode = failed > 0 ? 1 : 0;
