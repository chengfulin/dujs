/*
 * Self test of specs/006-eslint-scope/tools/diffcheck.js (contracts/diff-check.md
 * §2–§4) on synthetic dot directories and inline source code. Not part of
 * npm test; run with:
 *   node specs/006-eslint-scope/tools/diffcheck.test.js
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var assert = require('assert'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var diffcheck = require('./diffcheck');

var tests = [],
	tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck-test-'));

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
	var max = 0;
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
	Object.keys(files).forEach(function (file) {
		var full = path.join(dir, file);
		fs.mkdirSync(path.dirname(full), {recursive: true});
		fs.writeFileSync(full, Array.isArray(files[file]) ? dupairsDot(files[file]) : files[file]);
	});
	return dir;
}

/**
 * Compare a single-page case whose page level dupairs differ
 * @param {string} source page source
 * @param {Array} baseRows rows of page0/intra-pages/0.dupairs.dot before
 * @param {Array} newRows rows after
 * @returns {Object} result of compareCase
 */
function compareIntraPage(source, baseRows, newRows) {
	'use strict';
	return diffcheck.compareCase({
		name: 'c',
		pageSources: [source],
		baseDir: outputDir({'page0/intra-pages/0.dupairs.dot': baseRows}),
		newDir: outputDir({'page0/intra-pages/0.dupairs.dot': newRows})
	});
}

/**
 * Valid categories of the only difference of a result
 * @param {Object} result
 * @returns {Array}
 */
function onlyCategories(result) {
	'use strict';
	assert.strictEqual(result.diffs.length, 1, JSON.stringify(result.diffs));
	return result.diffs[0].categories;
}

/**
 * A record (golden-diff.md) with the given tables
 * @param {Array} netRows cells of the net difference table (without #)
 * @param {Array} [resolutionRows] cells of the resolution removal table
 * @param {Array} [linkRows] cells of the call link table
 * @param {string} [header] header lines
 * @returns {string}
 */
function record(netRows, resolutionRows, linkRows, header) {
	'use strict';
	function table(head, rows) {
		return head + '\n' + head.replace(/[^|]+/g, '---') + '\n' + rows.map(function (cells) {
			return '| ' + cells.join(' | ') + ' |';
		}).join('\n') + '\n';
	}
	return (header === undefined ? '基準：`584e17d`\n' : header) + '\n' +
		'## 淨差異（相對 develop，機器核對）\n\n' +
		table('| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |', netRows.map(function (cells, index) {
			return [String(index + 1)].concat(cells);
		})) + '\n## 解析類移除簽核（F3）\n\n' +
		table('| case | 頁 | 移除筆數 | 原因摘要 | 簽核 |', resolutionRows || []) +
		'\n## 呼叫連結簽核（衍生差異的釘選筆數）\n\n' +
		table('| case | 頁 | 觸發 | 衍生 + | 衍生 − | 簽核 |', linkRows || []) +
		'\n## 驗收預期更正\n\n無\n';
}

// §2 normalization
test('normalizes typed labels, same-line indexes and keeps the p-use structure', function () {
	'use strict';
	assert.strictEqual(diffcheck.normalizeLabel('entry_a'), 'entry');
	assert.strictEqual(diffcheck.normalizeLabel('exit_b'), 'exit');
	assert.strictEqual(diffcheck.normalizeLabel('call_c'), 'call');
	assert.strictEqual(diffcheck.normalizeLabel('callReturn_d'), 'callReturn');
	assert.strictEqual(diffcheck.normalizeLabel('callReturn (12:T)_b'), 'callReturn (12:T)');
	assert.strictEqual(diffcheck.normalizeLabel('30a'), '30');
	assert.strictEqual(diffcheck.normalizeLabel('12:TFb'), '12:TF');
	assert.strictEqual(diffcheck.normalizeLabel('entry'), 'entry');
	assert.strictEqual(diffcheck.normalizeLabel('7'), '7');
	var rows = diffcheck.parseDupairs(dupairsDot([
		['x', ['(18a,(18b,19))', '(entry_a,call_c)', '(3,30b)']],
		['y', []]
	]));
	assert.deepStrictEqual(rows, [
		{name: 'x', pairs: ['x: 18 -> (18,19)', 'x: entry -> call', 'x: 3 -> 30']},
		{name: 'y', pairs: []}
	]);
});

// §2 pair multiset
test('compares pairs as a multiset', function () {
	'use strict';
	var result = compareIntraPage('var x = 1;\nx;\nx;\n',
		[['x', ['(1,2a)', '(1,2b)', '(1,3)']]],
		[['x', ['(1,2)', '(1,3)', '(1,3)']]]);
	var summary = result.diffs.map(function (diff) {
		return diff.unit + diff.sign + diff.content;
	}).sort();
	assert.deepStrictEqual(summary, ['pair+x: 1 -> 3', 'pair-x: 1 -> 2']);
	assert.strictEqual(compareIntraPage('var x = 1;\nx;\n', [['x', ['(1,2a)', '(1,2b)']]],
		[['x', ['(1,2c)', '(1,2d)']]]).diffs.length, 0);
});

// §2 row, model and graph units
test('reports row, model and graph units', function () {
	'use strict';
	var result = diffcheck.compareCase({
		name: 'c',
		pageSources: ['f();\nfunction f() {}\n'],
		baseDir: outputDir({
			'page0/intra-procedurals/0.dupairs.dot': [['f', []]],
			'page0/inter-procedurals/0.dupairs.dot': [['f', []]],
			'page0/inter-procedurals/0.graph.dot': 'digraph a {}',
			'page0/inter-procedurals/0.hierarchy.dot': 'digraph h {}'
		}),
		newDir: outputDir({
			'page0/intra-procedurals/0.dupairs.dot': [['f', []], ['g', []]],
			'page0/inter-procedurals/0.dupairs.dot': [['f', []]],
			'page0/inter-procedurals/1.dupairs.dot': [['f', []]],
			'page0/inter-procedurals/0.graph.dot': 'digraph b {}',
			'page0/inter-procedurals/0.hierarchy.dot': 'digraph h {}',
			'page0/inter-procedurals/1.graph.dot': 'digraph c {}'
		})
	});
	var summary = result.diffs.map(function (diff) {
		return [diff.file, diff.unit, diff.sign, diff.content].join(' ');
	}).sort();
	assert.deepStrictEqual(summary, [
		'inter-procedurals/*.dupairs.dot row + f',
		'inter-procedurals/0.graph.dot graph ~ inter-procedurals/0.graph.dot',
		'inter-procedurals/1.dupairs.dot model + inter-procedurals/1.dupairs.dot',
		'inter-procedurals/1.graph.dot graph + inter-procedurals/1.graph.dot',
		'intra-procedurals/0.dupairs.dot row + g'
	]);
});

// §3 resolution
test('classifies resolution by vars >= 2, special scopes and default lines', function () {
	'use strict';
	var shadow = 'var x = 1;\nfunction f() {\n  var x = 2;\n  x;\n}\n';
	var shadowed = compareIntraPage(shadow, [['x', ['(1,4)']]], [['x', ['(3,4)']]]);
	assert.strictEqual(shadowed.diffs.length, 2);
	shadowed.diffs.forEach(function (diff) {
		assert.deepStrictEqual(diff.categories, ['解析']);
	});
	var named = 'var g = function h() {\n  h;\n};\n';
	assert.deepStrictEqual(onlyCategories(compareIntraPage(named, [['h', []]], [['h', ['(1,2)']]])), ['解析']);
	var klass = 'class K {\n  m() { return K; }\n}\n';
	assert.deepStrictEqual(onlyCategories(compareIntraPage(klass, [['K', []]], [['K', ['(1,2)']]])), ['解析']);
	var defaults = 'var a = 1;\nfunction f(p = a) {\n  return p;\n}\n';
	assert.deepStrictEqual(onlyCategories(compareIntraPage(defaults, [['a', ['(1,2)']]], [['a', []]])), ['解析']);
	var plain = 'var b = 1;\nb;\n';
	assert.deepStrictEqual(onlyCategories(compareIntraPage(plain, [['b', []]], [['b', ['(1,2)']]])), []);
});

// §3 global (U4): any addition of an unresolved name, def not limited to entry
test('classifies any added pair or row of an unresolved name as global', function () {
	'use strict';
	var code = 'G++;\nG;\n';
	assert.deepStrictEqual(onlyCategories(compareIntraPage(code, [['G', []]], [['G', ['(1,2)']]])), ['全域']);
	assert.deepStrictEqual(onlyCategories(compareIntraPage(code, [], [['G', []]])), ['全域']);
	assert.deepStrictEqual(onlyCategories(compareIntraPage(code, [['G', ['(1,2)']]], [['G', []]])), []);
});

// §3 catch (a)–(e)
test('classifies the five catch criteria', function () {
	'use strict';
	var code = 'var e = 0, z = 0;\ntry {\n  z = 1;\n} catch (e) {\n  e;\n  z;\n}\n';
	// (a) removed pair whose use line is the catch line, name not the parameter
	assert.ok(onlyCategories(compareIntraPage(code, [['z', ['(3,4)']]], [['z', []]])).indexOf('catch') !== -1);
	// (b) catch parameter, both ends in the catch clause (added or removed)
	assert.ok(onlyCategories(compareIntraPage(code, [['e', []]], [['e', ['(4,5)']]])).indexOf('catch') !== -1);
	assert.ok(onlyCategories(compareIntraPage(code, [['e', ['(4,5)']]], [['e', []]])).indexOf('catch') !== -1);
	// (c) added row of a catch parameter name
	var onlyCatch = 'try {\n  x();\n} catch (q) {\n  q;\n}\n';
	assert.ok(onlyCategories(compareIntraPage(onlyCatch, [], [['q', []]])).indexOf('catch') !== -1);
	// (d) removed pair whose def line is the catch line, name not the parameter
	assert.ok(onlyCategories(compareIntraPage(code, [['z', ['(4,6)']]], [['z', []]])).indexOf('catch') !== -1);
	// (e) catch parameter without a non-catch declaration: removed pair and row
	var noDecl = 'try {\n  x();\n} catch (q) {\n  q;\n}\nq;\n';
	assert.ok(onlyCategories(compareIntraPage(noDecl, [['q', ['(entry,6)']]], [['q', []]])).indexOf('catch') !== -1);
	assert.ok(onlyCategories(compareIntraPage(noDecl, [['q', []]], [])).indexOf('catch') !== -1);
	// not catch: added pair of the parameter outside the clause, with a non-catch declaration
	var outside = 'var e = 0;\ntry {\n  x();\n} catch (e) {\n  e;\n}\ne;\n';
	assert.ok(onlyCategories(compareIntraPage(outside, [['e', []]], [['e', ['(1,7)']]])).indexOf('catch') === -1);
});

// §3 AnnexB and call link triggers with derived differences
test('detects AnnexB and call link triggers and derived differences', function () {
	'use strict';
	var annexB = 'if (c) {\n  function f() {}\n}\nf();\nvar y = 1;\ny;\n';
	var result = compareIntraPage(annexB, [['y', ['(5,6)']]], [['y', []]]);
	assert.deepStrictEqual(result.triggers.page0.map(function (trigger) {
		return trigger.kind;
	}), ['AnnexB']);
	assert.deepStrictEqual(onlyCategories(result), ['AnnexB']);
	assert.strictEqual(result.diffs[0].derived, true);
	var link = 'var g = function h() {\n  h();\n};\nvar y = 1;\ny;\n';
	result = compareIntraPage(link, [['y', ['(4,5)']]], [['y', []]]);
	assert.deepStrictEqual(result.triggers.page0.map(function (trigger) {
		return trigger.kind;
	}), ['連結']);
	assert.deepStrictEqual(onlyCategories(result), ['連結']);
	var noTrigger = 'function f() {}\nf();\nvar y = 1;\ny;\n';
	result = diffcheck.compareCase({
		name: 'c',
		pageSources: [noTrigger],
		baseDir: outputDir({'page0/intra-pages/0.graph.dot': 'digraph a {}'}),
		newDir: outputDir({'page0/intra-pages/0.graph.dot': 'digraph b {}'})
	});
	assert.deepStrictEqual(result.triggers.page0, []);
	assert.deepStrictEqual(onlyCategories(result), []);
});

// §4 verify: matching rows, pins of derived and resolution removals
test('verify passes an exact record and fails on missing, extra or wrong rows', function () {
	'use strict';
	var result = compareIntraPage('G;\n', [], [['G', ['(entry,1)']]]),
		ok = record([['c', 'page0', 'intra-pages/0.dupairs.dot', 'row', '+', '`G`', '全域', 'FR-006', 'x'],
			['c', 'page0', 'intra-pages/0.dupairs.dot', 'pair', '+', '`G: entry -> 1`', '全域', 'FR-006', 'x']]);
	assert.deepStrictEqual(diffcheck.verifyRecord([result], ok), []);
	var less = record([['c', 'page0', 'intra-pages/0.dupairs.dot', 'row', '+', '`G`', '全域', 'FR-006', 'x']]);
	assert.strictEqual(diffcheck.verifyRecord([result], less).length, 1);
	var more = record([['c', 'page0', 'intra-pages/0.dupairs.dot', 'row', '+', '`G`', '全域', 'FR-006', 'x'],
		['c', 'page0', 'intra-pages/0.dupairs.dot', 'pair', '+', '`G: entry -> 1`', '全域', 'FR-006', 'x'],
		['c', 'page0', 'intra-pages/0.dupairs.dot', 'pair', '+', '`G: entry -> 1`', '全域', 'FR-006', 'x']]);
	assert.strictEqual(diffcheck.verifyRecord([result], more).length, 1);
	var wrongCategory = record([['c', 'page0', 'intra-pages/0.dupairs.dot', 'row', '+', '`G`', '解析', 'FR-004', 'x'],
		['c', 'page0', 'intra-pages/0.dupairs.dot', 'pair', '+', '`G: entry -> 1`', '全域', 'FR-006', 'x']]);
	assert.strictEqual(diffcheck.verifyRecord([result], wrongCategory).length, 1);
	// the skeleton of --report verifies as is
	assert.deepStrictEqual(diffcheck.verifyRecord([result], '基準：`584e17d`\n' + diffcheck.buildReport([result])), []);
});

test('verify fails when the pinned counts of derived differences or resolution removals differ', function () {
	'use strict';
	var link = 'var g = function h() {\n  h();\n};\nvar y = 1;\ny;\n',
		derived = compareIntraPage(link, [['y', ['(4,5)']]], [['y', []]]),
		row = ['c', 'page0', 'intra-pages/0.dupairs.dot', 'pair', '-', '`y: 4 -> 5`', '連結', 'FR-013', 'L2 `h()`'];
	assert.deepStrictEqual(diffcheck.verifyRecord([derived],
		record([row], [], [['c', 'page0', 'L2 `h()`', '0', '1', '草擬，待簽核（#1）']])), []);
	assert.strictEqual(diffcheck.verifyRecord([derived],
		record([row], [], [['c', 'page0', 'L2 `h()`', '0', '2', '草擬，待簽核（#1）']])).length, 1);
	assert.strictEqual(diffcheck.verifyRecord([derived], record([row], [], [])).length, 1);
	var noNote = row.slice(0, 8).concat(['']);
	assert.strictEqual(diffcheck.verifyRecord([derived],
		record([noNote], [], [['c', 'page0', 'L2 `h()`', '0', '1', '草擬，待簽核（#1）']])).length, 1);

	var shadow = 'var x = 1;\nfunction f() {\n  var x = 2;\n  x;\n}\n',
		removal = compareIntraPage(shadow, [['x', ['(1,4)', '(3,4)']]], [['x', ['(3,4)']]]),
		removed = ['c', 'page0', 'intra-pages/0.dupairs.dot', 'pair', '-', '`x: 1 -> 4`', '解析', 'FR-002', '`f` 的 `var x`'];
	assert.deepStrictEqual(diffcheck.verifyRecord([removal],
		record([removed], [['c', 'page0', '1', 'shadow', '草擬，待簽核（#1）']])), []);
	assert.strictEqual(diffcheck.verifyRecord([removal],
		record([removed], [['c', 'page0', '2', 'shadow', '草擬，待簽核（#1）']])).length, 1);
	assert.strictEqual(diffcheck.verifyRecord([removal], record([removed], [])).length, 1);
	assert.strictEqual(diffcheck.verifyRecord([removal],
		record([removed.slice(0, 8).concat([''])], [['c', 'page0', '1', 'shadow', '草擬，待簽核（#1）']])).length, 1);
});

// R2: the use line of a p-use is its decision d, not the target t
test('default parameter lines match the def or decision line of a p-use, not its target', function () {
	'use strict';
	var code = 'var a = 1;\nfunction f(p = 0) {\n  return p;\n}\nif (a) {}\n';
	// target t on the default line: not resolution
	assert.deepStrictEqual(onlyCategories(compareIntraPage(code, [['a', ['(1,(5,2))']]], [['a', []]])), []);
	// decision d on the default line: resolution
	assert.deepStrictEqual(onlyCategories(compareIntraPage(code, [['a', ['(1,(2,5))']]], [['a', []]])), ['解析']);
});

// R1: the machine note of other valid categories is not a note
test('verify fails resolution removals and derived rows whose note is only the also-valid note', function () {
	'use strict';
	var code = 'var e = 0, z = 0;\ntry {\n  z = 1;\n} catch (e) {\n  e;\n  z;\n}\n',
		removal = compareIntraPage(code, [['e', ['(4,5)']]], [['e', []]]);
	assert.deepStrictEqual(onlyCategories(removal), ['解析', 'catch']);
	var skeleton = '基準：`584e17d`\n' + diffcheck.buildReport([removal]);
	assert.ok(skeleton.indexOf('（亦符：catch）') !== -1);
	var problems = diffcheck.verifyRecord([removal], skeleton);
	assert.strictEqual(problems.length, 1, problems.join('\n'));
	assert.ok(/解析類移除的說明必填/.test(problems[0]));
	assert.deepStrictEqual(diffcheck.verifyRecord([removal], skeleton.replace('（亦符：catch）', '（亦符：catch） catch 參數遮蔽')), []);

	var both = 'if (c) {\n  function f() {}\n}\nf();\nvar g = function h() {\n  h();\n};\nvar y = 1;\ny;\n',
		derived = compareIntraPage(both, [['y', ['(8,9)']]], [['y', []]]);
	assert.deepStrictEqual(onlyCategories(derived), ['AnnexB', '連結']);
	assert.strictEqual(derived.diffs[0].derived, true);
	skeleton = '基準：`584e17d`\n' + diffcheck.buildReport([derived]);
	problems = diffcheck.verifyRecord([derived], skeleton);
	assert.strictEqual(problems.length, 1, problems.join('\n'));
	assert.ok(/衍生差異的說明必填/.test(problems[0]));
	assert.deepStrictEqual(diffcheck.verifyRecord([derived], skeleton.replace('（亦符：連結）', '（亦符：連結）L4 `f()`')), []);
});

// R3: sign-off rows of pages without actual removals or derived differences
test('verify fails sign-off rows of pages with no actual entries or no such page', function () {
	'use strict';
	var link = 'var g = function h() {\n  h();\n};\nvar y = 1;\ny;\n',
		derived = compareIntraPage(link, [['y', ['(4,5)']]], [['y', []]]),
		row = ['c', 'page0', 'intra-pages/0.dupairs.dot', 'pair', '-', '`y: 4 -> 5`', '連結', 'FR-013', 'L2 `h()`'],
		linkRow = ['c', 'page0', 'L2 `h()`', '0', '1', '草擬，待簽核（#1）'];
	// resolution row of a page with 0 removals, pinned 0 or 1
	assert.strictEqual(diffcheck.verifyRecord([derived],
		record([row], [['c', 'page0', '0', 'x', '草擬']], [linkRow])).length, 1);
	assert.strictEqual(diffcheck.verifyRecord([derived],
		record([row], [['c', 'page0', '1', 'x', '草擬']], [linkRow])).length, 1);
	// resolution row of a page that does not exist
	assert.strictEqual(diffcheck.verifyRecord([derived],
		record([row], [['c', 'page9', '0', 'x', '草擬']], [linkRow])).length, 1);
	// link rows of a page without derived differences or of no such page, pinned 0/0
	assert.strictEqual(diffcheck.verifyRecord([derived],
		record([row], [], [linkRow, ['c', 'page9', 'x', '0', '0', '草擬']])).length, 1);
	assert.strictEqual(diffcheck.verifyRecord([derived],
		record([row], [], [linkRow, ['other', 'page0', 'x', '0', '0', '草擬']])).length, 1);
});

// R5 (a): exit codes of the mdn mode
test('exit codes of the mdn mode fail when they change', function () {
	'use strict';
	var same = diffcheck.exitCodesOf([{name: 'a', exitCode: {base: 0, now: 0}}, {name: 'b', exitCode: {base: 1, now: 1}}]);
	assert.deepStrictEqual(same.problems, []);
	assert.ok(same.lines.indexOf('| a | 0 | 0 |') !== -1);
	var changed = diffcheck.exitCodesOf([{name: 'a', exitCode: {base: 0, now: 1}},
		{name: 'b', exitCode: {base: null, now: 0}}, {name: 'c', exitCode: {base: 0, now: 0}}]);
	assert.strictEqual(changed.problems.length, 2, changed.problems.join('\n'));
	assert.ok(/a 0 → 1/.test(changed.problems[0]));
	assert.ok(/b null → 0/.test(changed.problems[1]));
});

// R5 (b): model and graph differences take the trigger kinds of their page
test('model and graph differences are classified by the triggers of their page', function () {
	'use strict';
	var annexB = 'if (c) {\n  function f() {}\n}\nf();\n',
		result = diffcheck.compareCase({
			name: 'c',
			pageSources: [annexB],
			baseDir: outputDir({'page0/intra-pages/0.graph.dot': 'digraph a {}'}),
			newDir: outputDir({'page0/intra-pages/0.graph.dot': 'digraph b {}'})
		});
	assert.deepStrictEqual(onlyCategories(result), ['AnnexB']);
	assert.strictEqual(result.diffs[0].derived, false);
	var link = 'var g = function h() {\n  h();\n};\n';
	result = diffcheck.compareCase({
		name: 'c',
		pageSources: [link],
		baseDir: outputDir({'page0/inter-procedurals/0.dupairs.dot': [['h', []]]}),
		newDir: outputDir({'page0/inter-procedurals/0.dupairs.dot': [['h', []]],
			'page0/inter-procedurals/1.dupairs.dot': []})
	});
	assert.strictEqual(result.diffs[0].unit, 'model');
	assert.deepStrictEqual(onlyCategories(result), ['連結']);
	assert.strictEqual(result.diffs[0].derived, false);
});

// R5 (c): the inter-page level takes the union of the facts of the pages
test('inter-page differences use the union of the facts and triggers of the pages', function () {
	'use strict';
	var page0 = 'if (c) {\n  function f() {}\n}\nf();\nG;\n',
		page1 = 'var g = function h() {\n  h;\n};\nvar y = 1;\ny;\n',
		result = diffcheck.compareCase({
			name: 'c',
			pageSources: [page0, page1],
			baseDir: outputDir({'inter-page/0.dupairs.dot': [['h', []], ['y', ['(4,5)']]]}),
			newDir: outputDir({'inter-page/0.dupairs.dot': [['h', ['(1,2)']], ['y', []], ['G', []]]})
		});
	assert.deepStrictEqual(result.triggers.page1, []);
	assert.deepStrictEqual(result.triggers['inter-page'].map(function (trigger) {
		return trigger.kind;
	}), ['AnnexB']);
	var byContent = {};
	result.diffs.forEach(function (diff) {
		assert.strictEqual(diff.page, 'inter-page');
		byContent[diff.sign + diff.content] = diff;
	});
	assert.deepStrictEqual(Object.keys(byContent).sort(), ['+G', '+h: 1 -> 2', '-y: 4 -> 5']);
	assert.deepStrictEqual(byContent['+h: 1 -> 2'].categories, ['解析']);
	assert.deepStrictEqual(byContent['+G'].categories, ['全域']);
	assert.deepStrictEqual(byContent['-y: 4 -> 5'].categories, ['AnnexB']);
	assert.strictEqual(byContent['-y: 4 -> 5'].derived, true);
});

/**
 * Kinds and texts of the triggers of a source
 * @param {string} source
 * @returns {Array}
 */
function triggersOf(source) {
	'use strict';
	return diffcheck.factsOf(source).triggers.map(function (trigger) {
		return trigger.kind + ' ' + trigger.text;
	});
}

// R5 (d): new f() and addEventListener handlers trigger AnnexB and call links
test('new f() and addEventListener handlers trigger AnnexB and call links', function () {
	'use strict';
	var block = 'if (c) {\n  function f() {}\n}\n';
	var newCall = triggersOf(block + 'new f();\n');
	assert.strictEqual(newCall.length, 1, newCall.join('\n'));
	assert.ok(/^AnnexB L4 `new f\(\)`/.test(newCall[0]));
	var handler = triggersOf(block + 'w.addEventListener("x", f);\n');
	assert.strictEqual(handler.length, 1, handler.join('\n'));
	assert.ok(/^AnnexB L4 `addEventListener\(…, f\)`/.test(handler[0]));
	// the object of a member call is not an AnnexB trigger
	assert.deepStrictEqual(triggersOf(block + 'f.call();\n'), []);
	var newLink = triggersOf('var K = class K2 {\n  m() { return new K2(); }\n};\n');
	assert.strictEqual(newLink.length, 1, newLink.join('\n'));
	assert.ok(/^連結 L2 `new K2\(\)`：解析到 class scope/.test(newLink[0]));
	var handlerLink = triggersOf('var g = function h() {\n  w.addEventListener("x", h);\n};\n');
	assert.strictEqual(handlerLink.length, 1, handlerLink.join('\n'));
	assert.ok(/^連結 L2 `addEventListener\(…, h\)`：解析到 function-expression-name scope/.test(handlerLink[0]));
});

// R5 (e): a callee named as a catch parameter triggers a call link
test('a callee with the name of a catch parameter triggers a call link', function () {
	'use strict';
	var triggers = triggersOf('try {\n  x();\n} catch (e) {\n}\ne();\n');
	assert.deepStrictEqual(triggers, ['連結 L5 `e()`：同名 catch 參數']);
});

// §1 base of the golden mode
test('exits with 2 when golden-diff.md has no base and no --base is given', function () {
	'use strict';
	var file = path.join(tmpRoot, 'nobase.md');
	fs.writeFileSync(file, record([], [], [], '# Golden 差異紀錄\n'));
	assert.strictEqual(diffcheck.baseOf(fs.readFileSync(file, 'utf8')), null);
	assert.strictEqual(diffcheck.baseOf(record([])), '584e17d');
	var errors = [];
	assert.strictEqual(diffcheck.main(['golden', '--verify', file], {
		out: function () {},
		err: function (text) {
			errors.push(text);
		}
	}), 2);
	assert.ok(errors.length > 0);
});

var failed = 0;
tests.forEach(function (item) {
	'use strict';
	try {
		item.body();
		console.log('  ok  ' + item.title);
	} catch (err) {
		failed++;
		console.log('  FAIL ' + item.title + '\n    ' + String(err.stack).split('\n').slice(0, 6).join('\n    '));
	}
});
fs.rmSync(tmpRoot, {recursive: true, force: true});
console.log((tests.length - failed) + ' passing, ' + failed + ' failing');
process.exitCode = failed > 0 ? 1 : 0;
