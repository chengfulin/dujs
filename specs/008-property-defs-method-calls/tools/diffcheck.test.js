/*
 * Self test of specs/008-property-defs-method-calls/tools/diffcheck.js
 * (contracts/diff-check.md §1, §2, §4, §5; tasks T008 (a)–(g), T010; D022, D023, D024) on
 * synthetic output directories and inline source code. Not part of npm test;
 * run with:
 *   npx mocha specs/008-property-defs-method-calls/tools/diffcheck.test.js
 *
 * Original dujs code, MIT License (see LICENSE).
 */
/* global describe, it, after */
var assert = require('assert'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var diffcheck = require('./diffcheck'),
	base006 = require('../../006-eslint-scope/tools/diffcheck.js');

var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck008-test-')),
	counter = 0,
	ANON = '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0',
	G = '$DOMAIN.$PAGE_0.g',
	F = '$DOMAIN.$PAGE_0.f';

/**
 * Text of a *.dupairs.dot file with the given rows
 * @param {Array} rows [[name, [cell, ...]], ...]
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
 * @param {Array} nodes [[id, label], ...] in output order
 * @param {Array} [edges] [[from, to, type], ...]; type '' for a normal edge
 * @param {string} [title] graph label (scope of an intra-procedural model)
 * @returns {string}
 */
function graphDot(nodes, edges, title) {
	'use strict';
	var lines = ['digraph CFG {', 'node [shape="box"]', 'label = "' + (title || '') + '"'];
	nodes.forEach(function (node) {
		lines.push(node[0] + ' [label="' + node[1] + '", shape="box"]');
	});
	(edges || []).forEach(function (edge) {
		var attrs = edge[2] === 'exception' ? '[color="red", label="exception"]' :
			(edge[2] ? '[label="' + edge[2] + '"]' : '[]');
		lines.push(edge[0] + ' -> ' + edge[1] + ' ' + attrs);
	});
	return lines.join('\n') + '\n}';
}

/**
 * Graph of an intra-procedural model of a scope over some lines
 * @param {string} scope
 * @param {Array} lines
 * @returns {string}
 */
function calleeGraph(scope, lines) {
	'use strict';
	return graphDot([['n1', 'entry']].concat(lines.map(function (line, index) {
		return ['n' + (index + 2), String(line)];
	})).concat([['n99', 'exit']]), [], /ANONYMOUS/.test(scope) ? 'anonymousFunction[ ' + scope + ' ]' : 'function ' + scope);
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
	(edges || []).forEach(function (edge) {
		lines.push('h' + edge[0] + ' -> h' + edge[1] + ' [color="blue", label="' + edge[2] + '"]');
	});
	return lines.join('\n') + '\n}';
}

/**
 * Text of a *.matching.json file
 * @param {Array} calls [[callSiteLine, callee], ...]
 * @param {Object} [summaries] scope -> summary
 * @param {string} [mainScope] default $DOMAIN.$PAGE_0
 * @returns {string}
 */
function matchingJson(calls, summaries, mainScope) {
	'use strict';
	return JSON.stringify({
		format: 'dujs-matching/1',
		level: 'intraPage',
		mainScope: mainScope || '$DOMAIN.$PAGE_0',
		calls: calls.map(function (call, index) {
			return {
				id: 'c' + (index + 1), seq: index + 1, callSiteLine: call[0], callee: call[1], callNode: 'n' + (50 + index),
				entry: 'n90', exit: 'n91', callReturn: 'n' + (70 + index), exceptionalReturn: 'n92', back: false, beforeDecision: false
			};
		}),
		loops: [],
		summaries: summaries || {}
	}, null, 2);
}

/**
 * Write files into a new directory
 * @param {Object} files relative path -> text
 * @returns {string} the directory
 */
function writeDir(files) {
	'use strict';
	var dir = path.join(tmpRoot, 'd' + (counter++));
	fs.mkdirSync(dir, {recursive: true});
	Object.keys(files).forEach(function (file) {
		var full = path.join(dir, file);
		fs.mkdirSync(path.dirname(full), {recursive: true});
		fs.writeFileSync(full, files[file]);
	});
	return dir;
}

function prefixed(prefix, files) {
	'use strict';
	var result = {};
	Object.keys(files).forEach(function (file) {
		result[prefix + file] = files[file];
	});
	return result;
}

/**
 * Compare one page (base and new outputs of page0)
 * @param {string} source
 * @param {Object} base relative path (under page0/) -> text
 * @param {Object} next relative path (under page0/) -> text
 * @returns {Object} result of compareCase
 */
function comparePage(source, base, next) {
	'use strict';
	return diffcheck.compareCase({
		name: 'c',
		pageSources: [source],
		baseDir: writeDir(prefixed('page0/', base)),
		newDir: writeDir(prefixed('page0/', next))
	});
}

function pairDiffs(result) {
	'use strict';
	return result.diffs.filter(function (diff) {
		return diff.unit === 'pair';
	}).map(function (diff) {
		return diff.sign + diff.content;
	});
}

function find(result, unit, sign, content) {
	'use strict';
	var found = result.diffs.filter(function (diff) {
		return diff.unit === unit && diff.sign === sign && diff.content === content;
	})[0];
	assert.ok(found, 'no ' + unit + ' ' + sign + ' ' + content + ' in ' + JSON.stringify(result.diffs.map(function (diff) {
		return diff.unit + ' ' + diff.sign + diff.content;
	})));
	return found;
}

function categoriesOf(result, unit, sign, content) {
	'use strict';
	return find(result, unit, sign, content).categories;
}

function has(list, item) {
	'use strict';
	return list.indexOf(item) !== -1;
}

/**
 * A record built from the report, with every note filled
 * @param {string} report
 * @returns {string}
 */
function fillNotes(report) {
	'use strict';
	return '# 紀錄\n\n基準：`2035c93`\n\n' + report.split('\n').map(function (line) {
		return line.replace(/\| 草擬，待簽核/, '說明 | 草擬，待簽核');
	}).join('\n');
}

function quiet() {
	'use strict';
	var io = {lines: [], errors: []};
	io.out = function (text) {
		io.lines.push(text);
	};
	io.err = function (text) {
		io.errors.push(text);
	};
	return io;
}

function probe(name) {
	'use strict';
	return fs.readFileSync(path.join(__dirname, 'probes', name), 'utf8');
}

after(function () {
	'use strict';
	fs.rmSync(tmpRoot, {recursive: true, force: true});
});

describe('diffcheck 008', function () {
	'use strict';
	var empty = graphDot([['n1', 'entry'], ['n2', 'exit']]);

	describe('(a) base', function () {
		it('reads the base line of the header, --base overrides it', function () {
			assert.strictEqual(diffcheck.baseOf('# x\n\n基準：`2035c93`（develop）\n'), '2035c93');
			assert.strictEqual(diffcheck.baseOf('# x\n'), null);
			assert.strictEqual(diffcheck.resolveBase(null, '基準：`2035c93`\n'), '2035c93');
			assert.strictEqual(diffcheck.resolveBase('abc1234', '基準：`2035c93`\n'), 'abc1234');
			assert.strictEqual(diffcheck.resolveBase(null, '# no base\n'), null);
		});
		it('golden: exits 2 without a base, and when git cannot read the base', function () {
			var noBase = path.join(writeDir({'r.md': '# 紀錄\n'}), 'r.md'),
				badBase = path.join(writeDir({'r.md': '# 紀錄\n\n基準：`0000000`\n'}), 'r.md');
			assert.strictEqual(diffcheck.main(['golden', '--verify', noBase], quiet()), 2);
			assert.strictEqual(diffcheck.main(['golden', '--verify', badBase], quiet()), 2);
			assert.strictEqual(diffcheck.main(['golden', '--base', '0000000', '--verify', noBase], quiet()), 2);
		});
		it('mdn: the base is the snapshot of this feature, exit 2 without it', function () {
			assert.strictEqual(diffcheck.MDN_BASE, path.resolve(__dirname, '..', 'mdn', 'baseline-develop'));
			var io = quiet();
			assert.strictEqual(diffcheck.main(['mdn', '--report'], io, {mdnBase: path.join(tmpRoot, 'none'),
				mdnCorpus: writeDir({'pages.json': '{"a": [["a.js"]]}\n', 'corpus/a.js': 'var x;\n'})}), 2);
			assert.ok(/MDN 基準/.test(io.errors.join('\n')), io.errors.join('\n'));
		});
	});

	describe('(b) pairs and segment labels', function () {
		var calls = matchingJson([[5, F]]),
			moreCalls = matchingJson([[5, F], [5, G]]);
		it('same segment labels on a line: full labels, a missing segment is seen (007 T068 (d))', function () {
			var graph = graphDot([['n1', 'entry'], ['n2', '1'], ['n3', '5a'], ['n4', '5b'], ['n5', 'exit']]),
				result = comparePage('var x = 1;\n', {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5a)', '(1,5b)']]])
				}, {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5a)']]])
				});
			assert.deepStrictEqual(pairDiffs(result), ['-x: 1 -> 5b']);
			assert.deepStrictEqual(result.segmentRows, []);
		});
		it('other segment labels on a line: labels without suffix, the line listed', function () {
			var result = comparePage('var x = 1;\n', {
				'intra-pages/0.graph.dot': graphDot([['n1', 'entry'], ['n2', '1'], ['n3', 'call (5)_a'], ['n4', 'call (5)_b'], ['n5', 'exit']]),
				'intra-pages/0.matching.json': calls,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,call (5)_b)']]])
			}, {
				'intra-pages/0.graph.dot': graphDot([['n1', 'entry'], ['n2', '1'], ['n3', 'call (5)_a'], ['n4', 'call (5)_b'],
					['n6', 'call (5)_c'], ['n5', 'exit']]),
				'intra-pages/0.matching.json': moreCalls,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,call (5)_c)']]])
			});
			assert.deepStrictEqual(pairDiffs(result), []);
			assert.deepStrictEqual(result.segmentRows, [{page: 'page0', file: 'intra-pages/*.graph.dot', line: '5', base: 2, next: 3}]);
			var results = [result],
				report = diffcheck.buildReport(results),
				record = fillNotes(report);
			assert.ok(/\| c \| page0 \| intra-pages\/\*\.graph\.dot \| 5 \| 2 \| 3 \| 待簽核 \|/.test(report), report);
			assert.deepStrictEqual(diffcheck.verifyRecord(results, record), []);
			var missing = record.replace(/\| c \| page0 \| intra-pages\/\*\.graph\.dot \| 5 \| 2 \| 3 \| 待簽核 \|\n/, '');
			assert.notStrictEqual(missing, record);
			assert.ok(diffcheck.verifyRecord(results, missing).some(function (problem) {
				return /段結構改變行/.test(problem);
			}));
			var wrong = record.replace('| 5 | 2 | 3 | 待簽核 |', '| 5 | 2 | 4 | 待簽核 |');
			assert.ok(diffcheck.verifyRecord(results, wrong).some(function (problem) {
				return /段結構改變行/.test(problem);
			}));
		});
	});

	describe('(c) duplicate rows', function () {
		var graph = graphDot([['n1', 'entry'], ['n2', '1'], ['n3', '5a'], ['n4', '5b'], ['n5', 'exit']]);
		function result() {
			return comparePage('var x = 1;\n', {
				'intra-pages/0.graph.dot': graph,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5a)', '(1,5b)', '(1,5a)']], ['y', ['(1,5a)']]])
			}, {
				'intra-pages/0.graph.dot': graph,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5a)', '(1,5b)']], ['y', ['(1,5a)']]])
			});
		}
		it('lists the duplicate rows of each file apart from the pairs, with no threshold', function () {
			assert.deepStrictEqual(pairDiffs(result()), []);
			assert.deepStrictEqual(result().duplicates, [{file: 'intra-pages/0.dupairs.dot', page: 'page0', base: 2, next: 1}]);
		});
		it('reports the table and --verify checks its numbers', function () {
			var results = [result()],
				report = diffcheck.buildReport(results),
				record = fillNotes(report);
			assert.ok(/\| c \| page0 \| intra-pages\/0\.dupairs\.dot \| 2 \| 1 \| -1 \|/.test(report), report);
			assert.deepStrictEqual(diffcheck.verifyRecord(results, record), []);
			var wrong = record.replace('| 2 | 1 | -1 |', '| 2 | 2 | 0 |');
			assert.ok(diffcheck.verifyRecord(results, wrong).some(function (problem) {
				return /重複列數/.test(problem);
			}));
		});
	});

	describe('(d) no label rewriting, intra-procedural pairs, models of a page and level (D022)', function () {
		it('does not rewrite the call labels of the base', function () {
			var result = comparePage('function f() {}\nvar x;\n\nf();\nx;\n', {
				'intra-pages/0.graph.dot': graphDot([['n1', 'call'], ['n2', 'callReturn'], ['n3', '5']]),
				'intra-pages/0.matching.json': matchingJson([[4, F]]),
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn,5)']]])
			}, {
				'intra-pages/0.graph.dot': graphDot([['n1', 'call (4)'], ['n2', 'callReturn (4)'], ['n3', '5']]),
				'intra-pages/0.matching.json': matchingJson([[4, F]]),
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn (4),5)']]])
			});
			assert.deepStrictEqual(pairDiffs(result).sort(), ['+x: callReturn (4) -> 5', '-x: callReturn -> 5']);
		});
		it('classifies a pair difference of an intra-procedural model like any other', function () {
			var result = comparePage('var o = {};\no.p = 1;\no.m();\n', {
					'intra-procedurals/0.graph.dot': empty,
					'intra-procedurals/0.dupairs.dot': dupairsDot([['o', ['(1,3)', '(2,3)']]])
				}, {
					'intra-procedurals/0.graph.dot': empty,
					'intra-procedurals/0.dupairs.dot': dupairsDot([['o', ['(1,3)']]])
				}),
				results = [result];
			assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 2 -> 3'), ['成員目標（修正）']);
			assert.deepStrictEqual(diffcheck.verifyRecord(results, fillNotes(diffcheck.buildReport(results))), []);
		});
		it('compares the pairs of a page and level as one set, whatever the model numbers', function () {
			// es2015: the base inter-procedurals/1 is inter-procedurals/3 in 008
			var first = dupairsDot([['x', ['(1,2)']]]),
				second = dupairsDot([['y', ['(3,4)']]]),
				result = comparePage('var x = 1;\nx;\nvar y = 1;\ny;\n', {
					'inter-procedurals/0.dupairs.dot': first,
					'inter-procedurals/1.dupairs.dot': second
				}, {
					'inter-procedurals/0.dupairs.dot': first,
					'inter-procedurals/1.dupairs.dot': first,
					'inter-procedurals/2.dupairs.dot': first,
					'inter-procedurals/3.dupairs.dot': second
				});
			assert.deepStrictEqual(pairDiffs(result), []);
			assert.deepStrictEqual(result.diffs.filter(function (diff) {
				return diff.unit === 'row';
			}), []);
			assert.deepStrictEqual(result.diffs.filter(function (diff) {
				return diff.unit === 'model';
			}).map(function (diff) {
				return diff.sign + diff.content;
			}), ['+inter-procedurals/2.dupairs.dot', '+inter-procedurals/3.dupairs.dot']);
		});
	});

	describe('(e) categories', function () {
		function page(source, baseFiles, newFiles) {
			return comparePage(source, Object.assign({'intra-pages/0.graph.dot': empty}, baseFiles),
				Object.assign({'intra-pages/0.graph.dot': empty}, newFiles));
		}
		function removed(source, variable, cells, gone) {
			return page(source, {'intra-pages/0.dupairs.dot': dupairsDot([[variable, cells]])},
				{'intra-pages/0.dupairs.dot': dupairsDot([[variable, cells.filter(function (cell) {
					return gone.indexOf(cell) === -1;
				})]])});
		}
		function added(source, variable, cells, more) {
			return page(source, {'intra-pages/0.dupairs.dot': dupairsDot([[variable, cells]])},
				{'intra-pages/0.dupairs.dot': dupairsDot([[variable, cells.concat(more)]])});
		}

		describe('成員目標 and 屬性寫入→讀取損失 (− pair, classify)', function () {
			it('修正: the def line has a member target of the variable and classify says fix', function () {
				var result = removed('var o = {};\no.p = 1;\no.m();\n', 'o', ['(1,3)', '(2,3)'], ['(2,3)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 2 -> 3'), ['成員目標（修正）']);
				assert.ok(/method \[m\]/.test(find(result, 'pair', '-', 'o: 2 -> 3').reason));
			});
			it('損失: same path read', function () {
				var result = removed('var o = {};\no.p = 1;\nvar x = o.p;\n', 'o', ['(1,3)', '(2,3)'], ['(2,3)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 2 -> 3'), ['屬性寫入→讀取損失']);
			});
			it('neither when the def line has no member target of the variable', function () {
				var result = removed('var o = {};\no = {};\no.m();\n', 'o', ['(1,3)', '(2,3)'], ['(2,3)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 2 -> 3'), []);
			});
			it('neither when the target object is not the variable itself (o.p.q = 1, §3.1)', function () {
				var result = removed('var o = {p: {}};\no.p.q = 1;\no.m();\n', 'o', ['(1,3)', '(2,3)'], ['(2,3)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 2 -> 3'), []);
			});
			it('a destructuring and a for-of left side are member targets too', function () {
				var result = removed('var o = {}, a = [1];\n[o.p] = a;\nfor (o.q of a) {}\no.m();\n', 'o',
					['(1,4)', '(2,4)', '(3,4)'], ['(2,4)', '(3,4)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 2 -> 4'), ['成員目標（修正）']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 3 -> 4'), ['成員目標（修正）']);
			});
		});

		describe('成員目標（新增讀取） (+ pair)', function () {
			it('holds for a read of the object variable of a member target on the use line', function () {
				var result = added('var o = {};\no.p = 1;\n', 'o', [], ['(1,2)']);
				// 不再殺除 holds too: o has a member target and its def line L1 is not one
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'o: 1 -> 2'), ['成員目標（新增讀取）', '成員目標（不再殺除）']);
			});
			it('holds for the reads in the object and keys of a target with no object variable (P42, D013)', function () {
				var source = 'var n = 1, o = 2;\nlocalStorage.getItem(n).p = o;\n',
					result = added(source, 'n', [], ['(1,2)']),
					storage = added(source, 'localStorage', [], ['(entry,2)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'n: 1 -> 2'), ['成員目標（新增讀取）']);
				assert.deepStrictEqual(categoriesOf(storage, 'pair', '+', 'localStorage: entry -> 2'), ['成員目標（新增讀取）']);
				var keyed = added('var o = {}, k = 1;\no[k] = 2;\n', 'k', [], ['(1,2)']);
				assert.deepStrictEqual(categoriesOf(keyed, 'pair', '+', 'k: 1 -> 2'), ['成員目標（新增讀取）']);
			});
			it('holds for the new inter-page localStorage pair', function () {
				var result = diffcheck.compareCase({
					name: 'c',
					pageSources: ['localStorage.k = 1;\n', 'var n = 1;\nlocalStorage.getItem(n).p = 2;\n'],
					baseDir: writeDir({'inter-page/0.dupairs.dot': dupairsDot([['localStorage', []]])}),
					newDir: writeDir({'inter-page/0.dupairs.dot': dupairsDot([['localStorage', ['(1,2)']]])})
				});
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'localStorage: 1 -> 2'), ['成員目標（新增讀取）']);
			});
			it('does not hold for a plain read, nor for the exempt localStorage object', function () {
				var plain = added('var o = {};\nvar x = o.p;\n', 'o', [], ['(1,2)']),
					exempt = added('localStorage.a.b = 2;\n', 'localStorage', [], ['(entry,1)']),
					declared = added('var localStorage = {};\nlocalStorage.a.b = 2;\n', 'localStorage', [], ['(1,2)']);
				assert.deepStrictEqual(categoriesOf(plain, 'pair', '+', 'o: 1 -> 2'), []);
				assert.deepStrictEqual(categoriesOf(exempt, 'pair', '+', 'localStorage: entry -> 1'), []);
				// a page declaration is not exempt (D008)
				assert.ok(has(categoriesOf(declared, 'pair', '+', 'localStorage: 1 -> 2'), '成員目標（新增讀取）'));
			});
		});

		describe('成員目標（不再殺除） (+ pair)', function () {
			it('holds when the variable has a member target on the page and the def line is not one', function () {
				var result = added('var o = {};\no.p = 1;\nvar x = o;\n', 'o', [], ['(1,3)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'o: 1 -> 3'), ['成員目標（不再殺除）']);
			});
			it('does not hold without a member target of the variable, nor for a def line that is one', function () {
				var none = added('var o = {};\no = {};\nvar x = o;\n', 'o', [], ['(1,3)']),
					target = added('var o = {};\no.p = 1;\nvar x = o;\n', 'o', [], ['(2,3)']),
					deeper = added('var o = {p: {}};\no.p.q = 1;\nvar x = o;\n', 'o', [], ['(1,3)']);
				assert.deepStrictEqual(categoriesOf(none, 'pair', '+', 'o: 1 -> 3'), []);
				assert.deepStrictEqual(categoriesOf(target, 'pair', '+', 'o: 2 -> 3'), []);
				assert.deepStrictEqual(categoriesOf(deeper, 'pair', '+', 'o: 1 -> 3'), []);
			});
		});

		describe('外溢', function () {
			var calleeF = calleeGraph(F, [1]);
			function spill(source, baseCells, newCells) {
				return page(source, {
					'intra-pages/0.matching.json': matchingJson([]),
					'intra-pages/0.dupairs.dot': dupairsDot([['x', baseCells]]),
					'intra-procedurals/1.graph.dot': calleeF
				}, {
					'intra-pages/0.matching.json': matchingJson([[4, F]]),
					'intra-pages/0.dupairs.dot': dupairsDot([['x', newCells]]),
					'intra-procedurals/1.graph.dot': calleeF
				});
			}
			it('holds for a new link of a callee with a member target, the pair in the callee or after the call', function () {
				var result = spill('function f() { x = 2; }\nvar x = 1;\nf.p = 1;\nf();\nx;\n', ['(2,5)'], ['(1,5)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'x: 1 -> 5'), ['外溢']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 2 -> 5'), ['外溢']);
				assert.ok(has(categoriesOf(result, 'matching', '~', 'intra-pages/0.matching.json'), '外溢'));
			});
			it('does not hold without a member target of the callee, nor for a pair before the call', function () {
				var none = spill('function f() { x = 2; }\nvar x = 1;\nf.q;\nf();\nx;\n', ['(2,5)'], ['(1,5)']),
					before = spill('function f() { x = 2; }\nvar x = 1;\nf.p = x;\nf();\n', [], ['(2,3)']);
				assert.deepStrictEqual(categoriesOf(none, 'pair', '+', 'x: 1 -> 5'), []);
				assert.deepStrictEqual(categoriesOf(before, 'pair', '+', 'x: 2 -> 3'), []);
			});
			it('holds for a receiver with a member target, the 007 guard lifted (o.p = 1, o.m())', function () {
				var source = 'class A {\n  m() { x = 2; }\n}\nvar x = 1, o = new A();\no.p = 1, o.m();\nx;\n',
					files = function (calls, cells) {
						return {
							'intra-pages/0.matching.json': matchingJson(calls),
							'intra-pages/0.dupairs.dot': dupairsDot([['x', cells]]),
							'intra-procedurals/1.graph.dot': calleeGraph(ANON, [2])
						};
					},
					result = page(source, files([], ['(4,6)']), files([[5, ANON]], ['(2,6)'])),
					plain = page(source.replace('o.p = 1, o.m();', 'o.m();'), files([], ['(4,6)']), files([[5, ANON]], ['(2,6)']));
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'x: 2 -> 6'), ['外溢']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 4 -> 6'), ['外溢']);
				assert.deepStrictEqual(categoriesOf(plain, 'pair', '+', 'x: 2 -> 6'), []);
			});
			it('holds for a removed link and for the model of the page', function () {
				var source = 'function f() { x = 2; }\nvar x = 1;\nf.p = 1;\nf();\nx;\n',
					result = page(source, {
						'intra-pages/0.matching.json': matchingJson([[4, F]]),
						'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5)']]]),
						'intra-procedurals/1.graph.dot': calleeF,
						'inter-procedurals/0.dupairs.dot': dupairsDot([['x', ['(1,5)']]])
					}, {
						'intra-pages/0.matching.json': matchingJson([]),
						'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(2,5)']]]),
						'intra-procedurals/1.graph.dot': calleeF
					});
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 1 -> 5'), ['外溢']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'x: 2 -> 5'), ['外溢']);
				assert.ok(has(categoriesOf(result, 'model', '-', 'inter-procedurals/0.dupairs.dot'), '外溢'));
			});
			it('a matching file of 外溢 must pass the summary elements too; it does with passing elements', function () {
				var source = 'function f() { x = 2; }\nvar x = 1;\nf.p = 1;\nf();\nx;\n';
				function run(base, next) {
					var files = function (calls, fields) {
						return {
							'intra-pages/0.graph.dot': graphDot([['n1', 'entry'], ['n2', '1'], ['n99', 'exit']]),
							'intra-pages/0.matching.json': matchingJson(calls, {'$DOMAIN.$PAGE_0.f': Object.assign({normalReturn: true,
								conservative: false, gen: [], mustKill: [], upwardExposed: [], exceptional: []}, fields)}),
							'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5)']]]),
							'intra-procedurals/1.graph.dot': calleeF
						};
					};
					return page(source, files([], base), files([[4, F]], next));
				}
				// upwardExposed −x always fails (b)-2
				var failing = run({upwardExposed: ['x']}, {}),
					plain = run({}, {});
				assert.deepStrictEqual(categoriesOf(failing, 'matching', '~', 'intra-pages/0.matching.json'), []);
				assert.ok(has(failing.diffs.filter(function (diff) {
					return diff.unit === 'matching';
				})[0].summaryResult.failures, 'f.upwardExposed −x'));
				assert.ok(has(categoriesOf(plain, 'matching', '~', 'intra-pages/0.matching.json'), '外溢'));
			});
		});

		describe('放寬', function () {
			var lines = ['class A {', '  m() { x = 2; }', '}', 'var x = 1;', 'function g() {', '  const o = new A();', '  o.m();', '}', 'g();', 'x;'];
			function relax(source) {
				var files = function (calls, cells) {
					return {
						'intra-pages/0.matching.json': matchingJson(calls),
						'intra-pages/0.dupairs.dot': dupairsDot([['x', cells]]),
						'intra-procedurals/1.graph.dot': calleeGraph(ANON, [2]),
						'intra-procedurals/2.graph.dot': calleeGraph(G, [6, 7])
					};
				};
				return page(source, files([[9, G]], ['(4,10)']), files([[9, G], [7, ANON]], ['(2,10)']));
			}
			it('holds for a new o.m() callee in a function, o a const of new A(), the pair in the callee or after', function () {
				var result = relax(lines.join('\n') + '\n');
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'x: 2 -> 10'), ['放寬']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 4 -> 10'), ['放寬']);
				assert.ok(has(categoriesOf(result, 'matching', '~', 'intra-pages/0.matching.json'), '放寬'));
				var letted = relax(lines.join('\n').replace('const o', 'let o') + '\n');
				assert.deepStrictEqual(categoriesOf(letted, 'pair', '+', 'x: 2 -> 10'), ['放寬']);
			});
			it('does not hold for a var, an initial value that is not new, or a call outside functions', function () {
				var varred = relax(lines.join('\n').replace('const o', 'var o') + '\n'),
					literal = relax(lines.join('\n').replace('new A()', '{}') + '\n'),
					top = relax(['class A {', '  m() { x = 2; }', '}', 'var x = 1;', '', 'const o = new A();', 'o.m();', '', 'g();', 'x;'].join('\n') + '\n');
				assert.deepStrictEqual(categoriesOf(varred, 'pair', '+', 'x: 2 -> 10'), []);
				assert.deepStrictEqual(categoriesOf(literal, 'pair', '+', 'x: 2 -> 10'), []);
				assert.deepStrictEqual(categoriesOf(top, 'pair', '+', 'x: 2 -> 10'), []);
			});
		});

		// D022, 007 DECISION 011; after US2: saved: 29 -> 33, id: 30 -> 31
		describe('層級新增', function () {
			var lines = [];
			while (lines.length < 28) {
				lines.push('// filler');
			}
			lines.push('var saved = 1;', 'var id = 2;', 'id;', '', 'saved;',
				'class A { m() {} }', 'function g() {', '  const o = new A();', '  o.m();', '}', 'g();');
			var source = lines.join('\n') + '\n',
				intra = dupairsDot([['saved', ['(29,33)']], ['id', ['(30,31)']]]);
			function run(options) {
				var base = {
						'intra-pages/0.matching.json': matchingJson([[39, G]]),
						'intra-pages/0.dupairs.dot': options.baseIntra || intra,
						'intra-procedurals/1.graph.dot': calleeGraph(ANON, [34]),
						'intra-procedurals/2.graph.dot': calleeGraph(G, [36, 37])
					},
					next = {
						'intra-pages/0.matching.json': matchingJson(options.unlinked ? [[39, G]] : [[39, G], [37, ANON]]),
						'intra-pages/0.dupairs.dot': options.baseIntra || intra,
						'intra-procedurals/1.graph.dot': calleeGraph(ANON, [34]),
						'intra-procedurals/2.graph.dot': calleeGraph(G, [36, 37]),
						'inter-procedurals/3.dupairs.dot': dupairsDot([['saved', ['(29,33)']], ['id', ['(30,31)']], ['nextId', ['(31,32)']]])
					};
				if (options.baseModel) {
					base['inter-procedurals/3.dupairs.dot'] = options.baseModel;
				}
				return page(source, base, next);
			}
			it('holds for a pair of a new model found in the base intra-pages, and names that file', function () {
				var result = run({}),
					results = [result],
					report = diffcheck.buildReport(results);
				assert.ok(has(categoriesOf(result, 'model', '+', 'inter-procedurals/3.dupairs.dot'), '放寬'));
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'saved: 29 -> 33'), ['放寬（層級新增）']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'id: 30 -> 31'), ['放寬（層級新增）']);
				assert.strictEqual(find(result, 'pair', '+', 'id: 30 -> 31').levelNewBase, 'page0/intra-pages/0.dupairs.dot');
				assert.ok(/\| 放寬（層級新增） \| FR-004 \| 層級新增：對應基準檔 page0\/intra-pages\/0\.dupairs\.dot \|/.test(report), report);
			});
			it('does not hold for a pair missing in the base intra-pages (nextId: 31 -> 32)', function () {
				assert.deepStrictEqual(categoriesOf(run({}), 'pair', '+', 'nextId: 31 -> 32'), []);
				var other = run({baseIntra: dupairsDot([['saved', ['(29,32)']], ['id', ['(30,32)']]])});
				assert.deepStrictEqual(categoriesOf(other, 'pair', '+', 'saved: 29 -> 33'), []);
			});
			it('does not hold when the model + has no category', function () {
				var result = run({unlinked: true});
				assert.deepStrictEqual(categoriesOf(result, 'model', '+', 'inter-procedurals/3.dupairs.dot'), []);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'saved: 29 -> 33'), []);
			});
			it('does not hold for a model also in the base', function () {
				var result = run({baseModel: dupairsDot([['nextId', ['(31,32)']]])});
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'saved: 29 -> 33'), []);
			});
		});

		it('無法到達: no automatic trigger', function () {
			var result = removed('var x = 1;\nif (x) {\n  x;\n}\n', 'x', ['(1,(2,3))', '(1,3)'], ['(1,(2,3))']);
			assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 1 -> (2,3)'), []);
		});

		it('KI classes: §38 (finally) and §43 (callee called from two scopes); none without', function () {
			var fin = added('var x = 1;\ntry {\n  x = 2;\n} finally {\n  x;\n}\n', 'x', [], ['(1,5)']),
				plain = added('var x = 1;\n{\n  x = 2;\n}\n{\n  x;\n}\n', 'x', [], ['(1,6)']),
				callee = calleeGraph(F, [3]),
				hierarchy = hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.h', F], [[0, 2, 'call'], [1, 2, 'call']]),
				shared = page('var x = 0;\nfunction f() {\n  x;\n}\n', {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]]),
					'intra-pages/0.hierarchy.dot': hierarchy,
					'intra-procedurals/1.graph.dot': callee
				}, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,3)']]]),
					'intra-pages/0.hierarchy.dot': hierarchy,
					'intra-procedurals/1.graph.dot': callee
				});
			assert.deepStrictEqual(categoriesOf(fin, 'pair', '+', 'x: 1 -> 5'), ['§38']);
			assert.deepStrictEqual(categoriesOf(plain, 'pair', '+', 'x: 1 -> 6'), []);
			assert.deepStrictEqual(categoriesOf(shared, 'pair', '+', 'x: 1 -> 3'), ['§43']);
		});

		it('共通: a graph equal without node numbers, or a page with a new or removed call site', function () {
			var renumbered = comparePage('var x;\n', {
					'intra-pages/0.graph.dot': graphDot([['n1', 'entry'], ['n2', 'exit']], [['n1', 'n2', '']])
				}, {
					'intra-pages/0.graph.dot': graphDot([['n3', 'entry'], ['n4', 'exit']], [['n3', 'n4', '']])
				}),
				graphs = [graphDot([['n1', 'entry'], ['n2', '2'], ['n3', 'exit']]),
					graphDot([['n1', 'entry'], ['n2', 'call (2)'], ['n4', 'callReturn (2)'], ['n3', 'exit']])],
				called = comparePage('function f() {}\nf();\n', {
					'intra-pages/0.graph.dot': graphs[0],
					'intra-pages/0.matching.json': matchingJson([])
				}, {
					'intra-pages/0.graph.dot': graphs[1],
					'intra-pages/0.matching.json': matchingJson([[2, F]])
				}),
				changed = comparePage('function f() {}\nf();\n', {
					'intra-pages/0.graph.dot': graphs[0]
				}, {
					'intra-pages/0.graph.dot': graphs[1]
				});
			assert.deepStrictEqual(categoriesOf(renumbered, 'graph', '~', 'intra-pages/0.graph.dot'), ['共通']);
			assert.deepStrictEqual(categoriesOf(called, 'graph', '~', 'intra-pages/0.graph.dot'), ['共通']);
			assert.deepStrictEqual(categoriesOf(changed, 'graph', '~', 'intra-pages/0.graph.dot'), []);
		});
	});

	describe('(f) failures and exit codes', function () {
		// these run the dujs CLI of this branch on a one-line page
		this.timeout(60000);
		var work = path.join(tmpRoot, 'mdn');
		fs.mkdirSync(work, {recursive: true});
		var corpus = writeDir({'pages.json': '{"a": [["a.js"]]}\n', 'corpus/a.js': 'var x = 1;\nx;\nvar y = x;\n'});
		function snapshot(change, codes) {
			var run = base006.runCli([[path.join(corpus, 'corpus', 'a.js')]], work),
				dir = path.join(tmpRoot, 's' + (counter++));
			fs.mkdirSync(dir);
			fs.cpSync(run.outDir, path.join(dir, 'a'), {recursive: true});
			fs.writeFileSync(path.join(dir, 'exitcodes.json'), JSON.stringify(codes || {a: run.status}) + '\n');
			if (change) {
				change(dir);
			}
			return dir;
		}
		function main(args, dir) {
			var io = quiet();
			io.status = diffcheck.main(args, io, {mdnBase: dir, mdnCorpus: corpus});
			io.text = io.lines.join('\n');
			return io;
		}
		function addPair(dir) {
			var file = path.join(dir, 'a', 'page0', 'intra-pages', '0.dupairs.dot'),
				text = fs.readFileSync(file, 'utf8');
			fs.writeFileSync(file, text.replace('<tr><td>x</td>', '<tr><td>x</td><td>(1,9)</td>'));
		}
		it('no difference: report 無差異 and exit 0; --verify of that report exit 0', function () {
			var dir = snapshot(),
				report = main(['mdn', '--report'], dir);
			assert.strictEqual(report.status, 0, report.text + report.errors.join('\n'));
			assert.ok(/無差異/.test(report.text), report.text);
			var record = path.join(writeDir({'r.md': fillNotes(report.text)}), 'r.md');
			assert.strictEqual(main(['mdn', '--verify', record], dir).status, 0);
		});
		it('a pair of no category: report exit 1, --verify exit 1, a recorded category that does not hold fails', function () {
			var dir = snapshot(addPair),
				report = main(['mdn', '--report'], dir);
			assert.strictEqual(report.status, 1, report.text);
			assert.ok(/x: 1 -> 9/.test(report.text) && /（無成立類別）/.test(report.text), report.text);
			var record = path.join(writeDir({'r.md': fillNotes(report.text)}), 'r.md'),
				verified = main(['mdn', '--verify', record], dir);
			assert.strictEqual(verified.status, 1);
			assert.ok(/判準不成立/.test(verified.text), verified.text);
			var missing = path.join(writeDir({'r.md': fillNotes(report.text).replace(/^\| 1 \|.*\n/m, '')}), 'r.md');
			assert.ok(/差異未記錄/.test(main(['mdn', '--verify', missing], dir).text));
		});
		it('a changed CLI exit code: exit 1', function () {
			var dir = snapshot(null, {a: 3}),
				report = main(['mdn', '--report'], dir);
			assert.strictEqual(report.status, 1);
			var record = path.join(writeDir({'r.md': fillNotes(report.text)}), 'r.md'),
				verified = main(['mdn', '--verify', record], dir);
			assert.strictEqual(verified.status, 1);
			assert.ok(/exit code/.test(verified.text), verified.text);
		});
		it('a wrong pin count or a missing note fails', function () {
			var result = comparePage('var o = {};\no.p = 1;\no.m();\n', {
					'intra-pages/0.graph.dot': empty,
					'intra-pages/0.dupairs.dot': dupairsDot([['o', ['(1,3)', '(2,3)']]])
				}, {
					'intra-pages/0.graph.dot': empty,
					'intra-pages/0.dupairs.dot': dupairsDot([['o', ['(1,3)']]])
				}),
				results = [result],
				report = diffcheck.buildReport(results),
				record = fillNotes(report);
			assert.ok(/\| c \| page0 \| 成員目標 \|[^|]*\| 0 \| 1 \|/.test(report), report);
			assert.deepStrictEqual(diffcheck.verifyRecord(results, record), []);
			var wrong = record.replace(/(\| c \| page0 \| 成員目標 \|[^|]*\|) 0 \| 1 \|/, '$1 0 | 2 |');
			assert.notStrictEqual(wrong, record);
			assert.ok(diffcheck.verifyRecord(results, wrong).some(function (problem) {
				return /釘選/.test(problem);
			}));
			var noNote = record.replace('說明 | 草擬', ' | 草擬');
			assert.ok(diffcheck.verifyRecord(results, noNote).some(function (problem) {
				return /說明必填/.test(problem);
			}));
		});
	});

	// contracts/diff-check.md §2 位置條件的 probe 驗證 (plan 裁決, T010): g declared at L20
	// after the use, its o.m() newly linked; L5 g(); L6 reads x. The pair x: L4 -> L6
	// (killed by A's m) is neither in the callee lines (L2) nor after the call (L22/L23).
	describe('(g) position condition through an indirect call', function () {
		function run(source, callLine, gLines) {
			var files = function (calls, cells) {
				return {
					'intra-pages/0.graph.dot': empty,
					'intra-pages/0.matching.json': matchingJson(calls),
					'intra-pages/0.dupairs.dot': dupairsDot([['x', cells]]),
					'intra-procedurals/1.graph.dot': calleeGraph(ANON, [2]),
					'intra-procedurals/2.graph.dot': calleeGraph(G, gLines)
				};
			};
			return comparePage(source, files([[5, G]], ['(4,6)']), files([[5, G], [callLine, ANON]], ['(2,6)']));
		}
		it('外溢: the member target o.p = 1 lets o.m() in g link', function () {
			var result = run(probe('position-spill.js'), 23, [21, 22, 23]);
			assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'x: 2 -> 6'), ['外溢']);
			assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 4 -> 6'), ['外溢']);
		});
		it('放寬: FR-004 lets o.m() in g link', function () {
			var result = run(probe('position-relax.js'), 22, [21, 22]);
			assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'x: 2 -> 6'), ['放寬']);
			assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 4 -> 6'), ['放寬']);
		});
		it('still not for a pair before every caller of g', function () {
			var result = comparePage(probe('position-relax.js'), {
				'intra-pages/0.graph.dot': empty,
				'intra-pages/0.matching.json': matchingJson([[5, G]]),
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(4,4)']]]),
				'intra-procedurals/1.graph.dot': calleeGraph(ANON, [2]),
				'intra-procedurals/2.graph.dot': calleeGraph(G, [21, 22])
			}, {
				'intra-pages/0.graph.dot': empty,
				'intra-pages/0.matching.json': matchingJson([[5, G], [22, ANON]]),
				'intra-pages/0.dupairs.dot': dupairsDot([['x', []]]),
				'intra-procedurals/1.graph.dot': calleeGraph(ANON, [2]),
				'intra-procedurals/2.graph.dot': calleeGraph(G, [21, 22])
			});
			assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'x: 4 -> 4'), []);
		});
	});

	// D023 (contracts/diff-check.md §2): 成員目標（摘要）, 成員目標（列消失）, a
	// relabelling of the trigger line itself
	describe('(h) D023', function () {
		function summaryOf(fields) {
			return Object.assign({normalReturn: true, conservative: false, gen: [], mustKill: [], upwardExposed: [], exceptional: []}, fields);
		}
		/**
		 * One page with a matching file whose summaries change
		 * @param {string} source
		 * @param {Object} options {scope, lines (graph node labels by id), base, next (summary fields), ranges
		 *   ([[scope, lines]]), baseCalls, nextCalls, nextLabels}
		 * @returns {Object} the matching ~ difference
		 */
		function summaryDiff(source, options) {
			var files = function (calls, fields, labels) {
					var result = {
						'intra-pages/0.graph.dot': graphDot([['n1', 'entry']].concat(Object.keys(labels).map(function (id) {
							return [id, labels[id]];
						})).concat([['n99', 'exit']])),
						'intra-pages/0.matching.json': matchingJson(calls, (function () {
							var summaries = {};
							summaries[options.scope] = summaryOf(fields);
							return summaries;
						}()))
					};
					(options.ranges || []).forEach(function (item, index) {
						result['intra-procedurals/' + (index + 1) + '.graph.dot'] = calleeGraph(item[0], item[1]);
					});
					return result;
				},
				result = comparePage(source, files(options.baseCalls || [], options.base, options.lines),
					files(options.nextCalls || [], options.next, options.nextLabels || options.lines));
			return {result: result, diff: find(result, 'matching', '~', 'intra-pages/0.matching.json')};
		}
		var s13 = 'var para = document.querySelector(\'p\');\nfunction chooseName() {\n  para.textContent = \'x\';\n}\nchooseName();\n',
			CHOOSE = '$DOMAIN.$PAGE_0.chooseName';
		function s13Diff(base, next) {
			return summaryDiff(s13, {scope: CHOOSE, lines: {n3: '3'}, ranges: [[CHOOSE, [3]]], baseCalls: [[5, CHOOSE]], nextCalls: [[5, CHOOSE]],
				base: base, next: next});
		}

		describe('成員目標（摘要） (matching ~, FR-003)', function () {
			it('holds for gen −v@n, mustKill −v and upwardExposed +v of a member target (s13 para)', function () {
				var item = s13Diff({gen: ['para@n3'], mustKill: ['para']}, {upwardExposed: ['para']}),
					results = [item.result],
					report = diffcheck.buildReport(results);
				assert.deepStrictEqual(item.diff.categories, ['成員目標（摘要）']);
				assert.ok(/摘要 chooseName\.gen −para@n3、chooseName\.mustKill −para、chooseName\.upwardExposed \+para/.test(report), report);
				// the pin row counts the elements: + 1, − 2
				assert.ok(/\| c \| page0 \| 成員目標（摘要） \|[^|]*\| 1 \| 2 \|/.test(report), report);
				assert.deepStrictEqual(diffcheck.verifyRecord(results, fillNotes(report)), []);
				var wrong = fillNotes(report).replace(/(\| 成員目標（摘要） \|[^|]*\|) 1 \| 2 \|/, '$1 1 | 1 |');
				assert.ok(diffcheck.verifyRecord(results, wrong).some(function (problem) {
					return /釘選/.test(problem);
				}));
			});
			it('holds for gen −v@n of a member target with +v@m of a plain definition (s08 setGameOver resetButton)', function () {
				var source = 'var resetButton;\nfunction setGameOver() {\n  resetButton = document.createElement(\'button\');\n' +
						'  resetButton.textContent = \'Start\';\n}\nsetGameOver();\n',
					scope = '$DOMAIN.$PAGE_0.setGameOver',
					item = summaryDiff(source, {scope: scope, lines: {n3: '3', n4: '4'}, ranges: [[scope, [3, 4]]],
						baseCalls: [[6, scope]], nextCalls: [[6, scope]],
						base: {gen: ['resetButton@n4'], mustKill: ['resetButton']}, next: {gen: ['resetButton@n3'], mustKill: ['resetButton']}});
				assert.deepStrictEqual(item.diff.categories, ['成員目標（摘要）']);
			});
			it('rejects gen −v@n whose node line has no member target of v ((b)-1: para = h() in g, para.x = 1 in f)', function () {
				var source = 'function f() { para.x = 1; }\nfunction g() { para = h(); }\nvar para;\nf();\ng();\n',
					F0 = '$DOMAIN.$PAGE_0.f',
					G0 = '$DOMAIN.$PAGE_0.g',
					item = summaryDiff(source, {scope: G0, lines: {n5: '2'}, ranges: [[F0, [1]], [G0, [2]]],
						baseCalls: [[4, F0], [5, G0]], nextCalls: [[4, F0], [5, G0]], base: {gen: ['para@n5']}, next: {}});
				assert.deepStrictEqual(item.diff.categories, []);
			});
			it('rejects upwardExposed −v, mustKill +v and a conservative flip ((b)-2)', function () {
				var exposed = s13Diff({gen: ['para@n3'], upwardExposed: ['para']}, {}),
					killed = s13Diff({gen: ['para@n3']}, {mustKill: ['para']}),
					flipped = s13Diff({gen: ['para@n3']}, {conservative: true});
				assert.deepStrictEqual(exposed.diff.categories, []);
				assert.deepStrictEqual(killed.diff.categories, []);
				assert.deepStrictEqual(flipped.diff.categories, []);
				assert.ok(has(flipped.diff.summaryResult.failures, 'chooseName.conservative false→true'), flipped.diff.summaryResult.failures);
			});
			it('rejects a summary key added or removed, and a difference outside the summaries', function () {
				var files = function (summaries, calls) {
						return {
							'page0/intra-pages/0.graph.dot': graphDot([['n3', '3']]),
							'page0/intra-pages/0.matching.json': matchingJson(calls || [[5, CHOOSE]], summaries),
							'page0/intra-procedurals/1.graph.dot': calleeGraph(CHOOSE, [3])
						};
					},
					keyed = diffcheck.compareCase({
						name: 'c',
						pageSources: [s13],
						baseDir: writeDir(files({'$DOMAIN.$PAGE_0.chooseName': summaryOf({gen: ['para@n3']})})),
						newDir: writeDir(files({'$DOMAIN.$PAGE_0.chooseName': summaryOf({}), '$DOMAIN.$PAGE_0.extra': summaryOf({})}))
					}),
					other = diffcheck.compareCase({
						name: 'c',
						pageSources: [s13],
						baseDir: writeDir(files({'$DOMAIN.$PAGE_0.chooseName': summaryOf({gen: ['para@n3']})})),
						newDir: writeDir(files({'$DOMAIN.$PAGE_0.chooseName': summaryOf({})}, [[5, CHOOSE], [5, CHOOSE]]))
					});
				assert.deepStrictEqual(categoriesOf(keyed, 'matching', '~', 'intra-pages/0.matching.json'), []);
				// another call record: 共通 (a new call site) holds, 摘要 does not
				assert.deepStrictEqual(categoriesOf(other, 'matching', '~', 'intra-pages/0.matching.json'), ['共通']);
			});
			it('a matching file of 放寬 must pass the summary elements too; it does with passing elements', function () {
				var lines = ['class A {', '  m() { x = 2; }', '}', 'var x = 1;', 'function g() {', '  const o = new A();', '  o.m();', '}', 'g();', 'x;'],
					source = lines.join('\n') + '\n';
				function run(base, next) {
					var files = function (calls, fields) {
						return {
							'intra-pages/0.graph.dot': graphDot([['n1', 'entry'], ['n2', '2'], ['n99', 'exit']]),
							'intra-pages/0.matching.json': matchingJson(calls, {'$DOMAIN.$PAGE_0.g': summaryOf(fields)}),
							'intra-procedurals/1.graph.dot': calleeGraph(ANON, [2]),
							'intra-procedurals/2.graph.dot': calleeGraph(G, [6, 7])
						};
					};
					return comparePage(source, files([[9, G]], base), files([[9, G], [7, ANON]], next));
				}
				// x = 2 in A's m is not a member target: gen +x@n2 has no removal of x, upwardExposed −x
				var failing = run({upwardExposed: ['x']}, {gen: ['x@n2']}),
					plain = run({}, {});
				assert.deepStrictEqual(categoriesOf(failing, 'matching', '~', 'intra-pages/0.matching.json'), []);
				assert.ok(has(categoriesOf(plain, 'matching', '~', 'intra-pages/0.matching.json'), '放寬'));
			});
		});

		describe('成員目標（列消失） (row −, FR-001)', function () {
			function rowGone(source, graphLines, cells) {
				var graph = graphDot([['n1', 'entry']].concat(graphLines.map(function (line, index) {
					return ['n' + (index + 2), String(line)];
				})).concat([['n99', 'exit']]));
				return comparePage(source, {
					'inter-procedurals/0.graph.dot': graph,
					'inter-procedurals/0.dupairs.dot': dupairsDot([['o', cells], ['y', ['(1,1)']]])
				}, {
					'inter-procedurals/0.graph.dot': graph,
					'inter-procedurals/0.dupairs.dot': dupairsDot([['y', ['(1,1)']]])
				});
			}
			it('holds for a row whose defs are member targets of the variable, with no write of it in the model (s08 guessField)', function () {
				var source = 'var y = 1, o = document.querySelector(\'.f\');\nfunction f() {\n  o.disabled = true;\n  o.p = 2;\n}\n',
					result = rowGone(source, [3, 4], ['(3,4)']),
					empty0 = rowGone(source, [3, 4], []);
				assert.deepStrictEqual(categoriesOf(result, 'row', '-', 'o'), ['成員目標（列消失）']);
				assert.deepStrictEqual(categoriesOf(empty0, 'row', '-', 'o'), ['成員目標（列消失）']);
			});
			it('rejects a model with a write of the variable (function f(){ o = make(); o.p = 1; }), a def line that is no member target, two declarations', function () {
				var written = rowGone('var y = 1, o;\nfunction f() {\n  o = make();\n  o.p = 1;\n}\n', [3, 4], ['(4,4)']),
					plainDef = rowGone('var y = 1, o = {};\nfunction f() {\n  o.p = 1;\n  o.q;\n}\n', [3, 4], ['(1,4)']),
					twice = rowGone('var y = 1, o = {};\nfunction f() {\n  o.p = 1;\n  let o = 2;\n}\n', [3], ['(3,3)']);
				assert.deepStrictEqual(categoriesOf(written, 'row', '-', 'o'), []);
				assert.deepStrictEqual(categoriesOf(plainDef, 'row', '-', 'o'), []);
				assert.deepStrictEqual(categoriesOf(twice, 'row', '-', 'o'), []);
			});
			it('rejects a row − of the variable from more models than hold (one model holds, one has a write)', function () {
				var source = 'var y = 1, o = document.querySelector(\'.f\');\nfunction f() {\n  o.disabled = true;\n  o.p = 2;\n}\nfunction h() {\n  o = 3;\n}\n',
					graph = function (lines) {
						return graphDot([['n1', 'entry']].concat(lines.map(function (line, index) {
							return ['n' + (index + 2), String(line)];
						})).concat([['n99', 'exit']]));
					},
					result = comparePage(source, {
						'inter-procedurals/0.graph.dot': graph([3, 4]),
						'inter-procedurals/0.dupairs.dot': dupairsDot([['o', ['(3,4)']], ['y', ['(1,1)']]]),
						'inter-procedurals/1.graph.dot': graph([7]),
						'inter-procedurals/1.dupairs.dot': dupairsDot([['o', ['(7,7)']], ['y', ['(1,1)']]])
					}, {
						'inter-procedurals/0.graph.dot': graph([3, 4]),
						'inter-procedurals/0.dupairs.dot': dupairsDot([['y', ['(1,1)']]]),
						'inter-procedurals/1.graph.dot': graph([7]),
						'inter-procedurals/1.dupairs.dot': dupairsDot([['y', ['(1,1)']]])
					});
				assert.deepStrictEqual(categoriesOf(result, 'row', '-', 'o'), []);
			});
			it('does not hold for a row +', function () {
				var source = 'var y = 1, o = {};\nfunction f() {\n  o.p = 1;\n}\n',
					graph = graphDot([['n1', 'entry'], ['n2', '3'], ['n99', 'exit']]),
					result = comparePage(source, {
						'inter-procedurals/0.graph.dot': graph,
						'inter-procedurals/0.dupairs.dot': dupairsDot([['y', ['(1,1)']]])
					}, {
						'inter-procedurals/0.graph.dot': graph,
						'inter-procedurals/0.dupairs.dot': dupairsDot([['o', []], ['y', ['(1,1)']]])
					});
				assert.deepStrictEqual(categoriesOf(result, 'row', '+', 'o'), []);
			});
		});

		describe('a relabelling of the trigger line itself (外溢 / 放寬 position)', function () {
			var lines = ['class A {', '  m() { x = 2; }', '}', 'var x = 1;', 'function g() {', '  const o = new A();', '  o.m();', '}', 'g();'],
				source = lines.join('\n') + '\n';
			function run(baseCells, nextCells) {
				return page7(baseCells, nextCells, [[9, G]], [[9, G], [7, ANON]]);
			}
			function page7(baseCells, nextCells, baseCalls, nextCalls, baseLabels, nextLabels) {
				var files = function (calls, cells, labels) {
					return {
						'intra-pages/0.graph.dot': graphDot([['n1', 'entry']].concat(labels.map(function (label, index) {
							return ['n' + (index + 2), label];
						})).concat([['n99', 'exit']])),
						'intra-pages/0.matching.json': matchingJson(calls),
						'intra-pages/0.dupairs.dot': dupairsDot([['o', cells]]),
						'intra-procedurals/1.graph.dot': calleeGraph(ANON, [2]),
						'intra-procedurals/2.graph.dot': calleeGraph(G, [6, 7])
					};
				};
				return comparePage(source, files(baseCalls, baseCells, baseLabels || ['6', '7', 'call (9)', 'callReturn (9)']),
					files(nextCalls, nextCells, nextLabels || ['6', 'call (7)', 'callReturn (7)', 'call (9)', 'callReturn (9)']));
			}
			it('holds for o: 6 -> 7 becoming o: 6 -> call (7) on the trigger line L7 (a05 evilBall: call (185)_a -> 199)', function () {
				var result = run(['(6,7)'], ['(6,call (7))']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 6 -> 7'), ['放寬']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'o: 6 -> call (7)'), ['放寬']);
				assert.ok(result.segmentRows.some(function (row) {
					return row.line === '7';
				}));
			});
			it('rejects a pair on L with no relabelled counterpart ((a)-1: neither call (L) nor callReturn (L) in 008)', function () {
				var result = run(['(6,7)'], []);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 6 -> 7'), []);
				var other = run(['(6,7)'], ['(4,call (7))']);
				assert.deepStrictEqual(categoriesOf(other, 'pair', '-', 'o: 6 -> 7'), []);
			});
			it('rejects a relabelling on a line whose callees are the same on both sides ((a)-2)', function () {
				// L6 is relabelled (6 -> call (6)) but its callee set does not change; the
				// link of the page is L7
				var result = page7(['(6,6)'], ['(6,call (6))'], [[9, G], [6, F]], [[9, G], [6, F], [7, ANON]],
					['6', '7', 'call (9)', 'callReturn (9)'],
					['call (6)', 'callReturn (6)', 'call (7)', 'callReturn (7)', 'call (9)', 'callReturn (9)']);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 6 -> 6'), []);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'o: 6 -> call (6)'), []);
			});
			it('rejects a relabelling of the trigger line L7 when L7 is no 段結構改變行 (its graph labels the same on both sides)', function () {
				var labels = ['6', '7', 'call (7)', 'callReturn (7)', 'call (9)', 'callReturn (9)'],
					result = page7(['(6,7)'], ['(6,call (7))'], [[9, G]], [[9, G], [7, ANON]], labels, labels);
				assert.ok(!result.segmentRows.some(function (row) {
					return row.line === '7';
				}));
				assert.deepStrictEqual(categoriesOf(result, 'pair', '-', 'o: 6 -> 7'), []);
				assert.deepStrictEqual(categoriesOf(result, 'pair', '+', 'o: 6 -> call (7)'), []);
			});
		});
	});

	describe('(i) D024', function () {
		var LOOP = '$DOMAIN.$PAGE_0.loop',
			M = ANON,
			PAGE = '$DOMAIN.$PAGE_0',
			OTHER = '$DOMAIN.$PAGE_0.other',
			A05 = ['class A {', '  m() {', '    count--;', '    para.textContent = \'n\' + count + Math.PI;', '  }', '}',
				'var count = 1, para = document.querySelector(\'p\'), ctx = canvas.getContext(\'2d\');', 'const a = new A();',
				'function loop() {', '  ctx.fillStyle = \'x\';', '  a.m();', '}', 'loop();'];
		function summaryOf(fields) {
			return Object.assign({normalReturn: true, conservative: false, gen: [], mustKill: [], upwardExposed: [], exceptional: []}, fields);
		}
		function summariesOf(map) {
			var result = {};
			Object.keys(map).forEach(function (scope) {
				result[scope] = summaryOf(map[scope]);
			});
			return result;
		}
		/**
		 * The a05 shape: loop() calls a.m() of const a = new A() (FR-004 links
		 * line 11 to A's m, the scope M), base summaries of loop lose ctx of
		 * the member target ctx.fillStyle, those of this branch get count of m
		 * @param {Object} [options] {lines (source lines replaced, by number),
		 *   base, next (summaries, scope -> fields), baseEdges, nextEdges
		 *   (hierarchy edges [[from, to]] of scopes), baseCalls, nextCalls, baseLabels,
		 *   nextLabels (graph node id -> label), interPage}
		 * @returns {Object} result of compareCase
		 */
		function a05(options) {
			options = options || {};
			var lines = A05.slice();
			Object.keys(options.lines || {}).forEach(function (line) {
				lines[Number(line) - 1] = options.lines[line];
			});
			var level = options.interPage ? 'inter-page/0' : 'page0/intra-pages/0';
			function files(calls, summaries, edges, labels) {
				var scopes = [PAGE, LOOP, M, OTHER],
					result = {
						'page0/intra-procedurals/1.graph.dot': calleeGraph(M, [3, 4]),
						'page0/intra-procedurals/2.graph.dot': calleeGraph(LOOP, [10, 11])
					};
				result[level + '.graph.dot'] = graphDot([['n1', 'entry']].concat(Object.keys(labels).map(function (id) {
					return [id, labels[id]];
				})).concat([['n99', 'exit']]));
				result[level + '.matching.json'] = matchingJson(calls, summariesOf(summaries));
				result[level + '.hierarchy.dot'] = hierarchyDot(scopes, edges.map(function (edge) {
					return [scopes.indexOf(edge[0]), scopes.indexOf(edge[1]), 'call'];
				}));
				return result;
			}
			return diffcheck.compareCase({
				name: 'c',
				pageSources: [lines.join('\n') + '\n'],
				baseDir: writeDir(files(options.baseCalls || [[13, LOOP]],
					options.base || {'$DOMAIN.$PAGE_0.loop': {gen: ['ctx@n10'], exceptional: ['ctx@n10'], mustKill: ['ctx']}},
					options.baseEdges || [[PAGE, LOOP]], options.baseLabels || {n10: '10', n11: '11'})),
				newDir: writeDir(files(options.nextCalls || [[13, LOOP], [11, M]], options.next || nextSummaries(),
					options.nextEdges || [[PAGE, LOOP], [LOOP, M]], options.nextLabels || {n3: '3', n4: '4', n10: '10', n11: 'call (11)'}))
			});
		}
		function nextSummaries(loop, m) {
			var result = {};
			result[LOOP] = Object.assign({gen: ['count@n3'], exceptional: ['count@n3'], upwardExposed: ['Math', 'count', 'ctx', 'para']}, loop || {});
			result[M] = Object.assign({gen: ['count@n3'], exceptional: ['count@n3'], upwardExposed: ['Math', 'count', 'para']}, m || {});
			return result;
		}
		function matching(result, content) {
			return find(result, 'matching', '~', content || 'intra-pages/0.matching.json');
		}
		function failures(result, content) {
			var diff = matching(result, content);
			assert.ok(diff.summaryResult, 'no summary check');
			return diff.summaryResult.failures;
		}

		/**
		 * The a05 inter-procedurals: base 1 (mainScope $PAGE_0) and 2 (other); 008 1
		 * (mainScope loop, new), 2 ($PAGE_0) and 3 (other)
		 * @param {Object} [loop] summary fields of loop in 008 2
		 * @returns {Object} result of compareCase
		 */
		function renumbered(loop) {
			function files(models, edges) {
				var scopes = [PAGE, LOOP, M, OTHER],
					result = {
						'page0/intra-procedurals/1.graph.dot': calleeGraph(M, [3, 4]),
						'page0/intra-procedurals/2.graph.dot': calleeGraph(LOOP, [10, 11]),
						'page0/inter-procedurals/0.hierarchy.dot': hierarchyDot(scopes, edges.map(function (edge) {
							return [scopes.indexOf(edge[0]), scopes.indexOf(edge[1]), 'call'];
						}))
					};
				models.forEach(function (model, index) {
					result['page0/inter-procedurals/' + (index + 1) + '.graph.dot'] = graphDot(model.nodes);
					result['page0/inter-procedurals/' + (index + 1) + '.matching.json'] = model.text;
				});
				return result;
			}
			var other = matchingJson([], summariesOf({'$DOMAIN.$PAGE_0.other': {}}), OTHER),
				base = files([
					{nodes: [['n10', '10']], text: matchingJson([[13, LOOP]], summariesOf({'$DOMAIN.$PAGE_0.loop': {gen: ['ctx@n10'], exceptional: ['ctx@n10'], mustKill: ['ctx']}}), PAGE)},
					{nodes: [['n1', 'entry']], text: other}
				], [[PAGE, LOOP]]);
				return diffcheck.compareCase({
					name: 'c',
					pageSources: [A05.join('\n') + '\n'],
					baseDir: writeDir(base),
					newDir: writeDir(files([
						{nodes: [['n3', '3']], text: matchingJson([[11, M]], summariesOf(nextSummaries()), LOOP)},
						{nodes: [['n3', '3'], ['n10', '10']], text: matchingJson([[13, LOOP], [11, M]], summariesOf(nextSummaries(loop)), PAGE)},
						{nodes: [['n1', 'entry']], text: other}
					], [[PAGE, LOOP], [LOOP, M]]))
				});
		}
		var RENUMBERED = 'inter-procedurals/1.matching.json → inter-procedurals/2.matching.json';

		describe('第 5 條 and pairing: positive', function () {
			it('holds for the a05 shape at intra-pages/0: gen / exceptional +count@n, upwardExposed +Math +count +para of the new link', function () {
				var result = a05(),
					diff = matching(result),
					report = diffcheck.buildReport([result]);
				assert.ok(has(diff.categories, '放寬'), JSON.stringify(diff.summaryResult));
				assert.deepStrictEqual(diff.summaryResult.failures, []);
				assert.ok(has(diff.summaryResult.items, 'loop.gen +count@n3（新連結 $ANONYMOUS_FUN_0）'), diff.summaryResult.items);
				assert.ok(has(diff.summaryResult.items, 'loop.upwardExposed +para（新連結 $ANONYMOUS_FUN_0）'), diff.summaryResult.items);
				assert.ok(has(diff.summaryResult.items, 'loop.upwardExposed +ctx'), diff.summaryResult.items);
				assert.deepStrictEqual(diff.summaryResult.newKeys, ['$ANONYMOUS_FUN_0']);
				// pinned with 放寬: + 6 (gen, exceptional, 4 upwardExposed), − 3
				assert.strictEqual(diff.summaryResult.plus, 6);
				assert.strictEqual(diff.summaryResult.minus, 3);
				assert.ok(/\| c \| page0 \| 放寬 \|[^|]*\| 6 \| 3 \|/.test(report), report);
				assert.deepStrictEqual(diffcheck.verifyRecord([result], fillNotes(report)), []);
				var wrong = fillNotes(report).replace(/(\| c \| page0 \| 放寬 \|[^|]*\|) 6 \| 3 \|/, '$1 0 | 0 |');
				assert.ok(diffcheck.verifyRecord([result], wrong).some(function (problem) {
					return /釘選/.test(problem);
				}));
			});
			it('holds for the a05 shape at inter-page/0', function () {
				var result = a05({interPage: true}),
					diff = find(result, 'matching', '~', '0.matching.json');
				assert.ok(has(diff.categories, '放寬'), JSON.stringify(diff.summaryResult));
				assert.deepStrictEqual(diff.summaryResult.failures, []);
			});
			it('a new key of a new link (keys not the same) is no 成員目標（摘要）, the rest equal and the elements passing', function () {
				// the new call a.m() is in intra-pages/0; inter-procedurals/1 keeps its calls and gets the key of A's m
				function files(calls, edges, summaries, labels) {
					var scopes = [PAGE, LOOP, M, OTHER];
					return {
						'page0/intra-procedurals/1.graph.dot': calleeGraph(M, [3, 4]),
						'page0/intra-procedurals/2.graph.dot': calleeGraph(LOOP, [10, 11]),
						'page0/intra-pages/0.matching.json': matchingJson(calls),
						'page0/intra-pages/0.hierarchy.dot': hierarchyDot(scopes, edges.map(function (edge) {
							return [scopes.indexOf(edge[0]), scopes.indexOf(edge[1]), 'call'];
						})),
						'page0/inter-procedurals/1.graph.dot': graphDot([['n1', 'entry']].concat(Object.keys(labels).map(function (id) {
							return [id, labels[id]];
						})).concat([['n99', 'exit']])),
						'page0/inter-procedurals/1.matching.json': matchingJson([], summariesOf(summaries), PAGE)
					};
				}
				var base = {};
				base[LOOP] = {gen: ['ctx@n10'], exceptional: ['ctx@n10'], mustKill: ['ctx']};
				var result = diffcheck.compareCase({
						name: 'c',
						pageSources: [A05.join('\n') + '\n'],
						baseDir: writeDir(files([[13, LOOP]], [[PAGE, LOOP]], base, {n10: '10', n11: '11'})),
						newDir: writeDir(files([[13, LOOP], [11, M]], [[PAGE, LOOP], [LOOP, M]], nextSummaries(), {n3: '3', n4: '4', n10: '10', n11: 'call (11)'}))
					}),
					diff = matching(result, 'inter-procedurals/1.matching.json');
				assert.deepStrictEqual(diff.summaryResult.failures, []);
				assert.deepStrictEqual(diff.summaryResult.newKeys, ['$ANONYMOUS_FUN_0']);
				assert.ok(diff.summaryResult.restEqual && !diff.summaryResult.keysSame && diff.summaryResult.items.length > 0,
					JSON.stringify(diff.summaryResult));
				assert.ok(!has(diff.categories, '成員目標（摘要）'), diff.categories);
				assert.ok(has(diff.categories, '放寬'), diff.categories);
			});
			it('pairs inter-procedurals by mainScope: base 1 with 008 2, base 2 with 008 3, 008 1 alone', function () {
				var result = renumbered();
				assert.ok(has(categoriesOf(result, 'matching', '~', RENUMBERED), '放寬'), JSON.stringify(matching(result, RENUMBERED).summaryResult));
				assert.ok(has(categoriesOf(result, 'matching', '+', 'inter-procedurals/1.matching.json'), '放寬'));
				assert.ok(!result.diffs.some(function (diff) {
					return diff.unit === 'matching' && /3\.matching\.json/.test(diff.content);
				}), 'base 2 and 008 3 are the same');
			});
		});

		describe('第 5 條 and pairing: counterexamples (all rejected)', function () {
			it('1: +v@n in a callee already reachable in the base', function () {
				var base = {};
				base[LOOP] = {gen: ['ctx@n10'], exceptional: ['ctx@n10'], mustKill: ['ctx']};
				base[M] = nextSummaries()[M];
				var result = a05({base: base, baseEdges: [[PAGE, LOOP], [LOOP, M]]});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.ok(has(failures(result), 'loop.gen +count@n3'), failures(result));
			});
			it('2: the new callee calls f back, +v@n on a line of f itself', function () {
				var base = {}, next = {};
				base[LOOP] = {};
				base[M] = {};
				next[LOOP] = {gen: ['count@n10']};
				next[M] = {gen: ['count@n10']};
				var result = a05({lines: {10: '  count = 0;'}, base: base, next: next, baseEdges: [[PAGE, LOOP]],
					nextEdges: [[PAGE, LOOP], [LOOP, M], [M, LOOP]], baseLabels: {n10: '10'}, nextLabels: {n10: '10'}});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.ok(has(failures(result), 'loop.gen +count@n10'), failures(result));
			});
			it('3: the line in N has only v.p = …, no write reference of v', function () {
				var result = a05({lines: {3: '    count.p = 1;'}});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.ok(has(failures(result), 'loop.gen +count@n3'), failures(result));
			});
			it('4: an unconditional v = 1 in the callee gives mustKill +v', function () {
				var result = a05({lines: {3: '    count = 1;'}, next: nextSummaries({mustKill: ['count']}, {mustKill: ['count']})});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.ok(has(failures(result), 'loop.mustKill +count'), failures(result));
			});
			it('5: gen −v@n and upwardExposed −v in N', function () {
				var base = {};
				base[LOOP] = {gen: ['ctx@n10', 'count@n3'], exceptional: ['ctx@n10'], mustKill: ['ctx'], upwardExposed: ['para']};
				var result = a05({base: base, baseLabels: {n3: '3', n10: '10', n11: '11'},
					next: nextSummaries({gen: [], exceptional: [], upwardExposed: ['Math', 'count', 'ctx']})});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.ok(has(failures(result), 'loop.gen −count@n3'), failures(result));
				assert.ok(has(failures(result), 'loop.upwardExposed −para'), failures(result));
			});
			it('6: upwardExposed +v read only in the body of f', function () {
				var result = a05({lines: {10: '  ctx.fillStyle = bar;'},
					next: nextSummaries({upwardExposed: ['Math', 'bar', 'count', 'ctx', 'para']}, {upwardExposed: ['Math', 'bar', 'count', 'para']})});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.deepStrictEqual(failures(result), ['loop.upwardExposed +bar']);
				// a read in the new callee that resolves inside it (its own let bar)
				var local = a05({lines: {3: '    let bar = 1; count--;', 4: '    para.textContent = \'n\' + count + Math.PI + bar;'},
					next: nextSummaries({upwardExposed: ['Math', 'bar', 'count', 'ctx', 'para']}, {upwardExposed: ['Math', 'bar', 'count', 'para']})});
				assert.deepStrictEqual(matching(local).categories, []);
				assert.deepStrictEqual(failures(local), ['loop.upwardExposed +bar']);
			});
			it('7: +v@n in no summary of a g in N', function () {
				var result = a05({next: nextSummaries({}, {gen: [], exceptional: []})});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.deepStrictEqual(failures(result), ['loop.gen +count@n3', 'loop.exceptional +count@n3']);
			});
			it('8: a key of 008 only that is no new callee, and a key of the base only', function () {
				var next = nextSummaries();
				next[OTHER] = {};
				var added = a05({next: next}),
					base = {};
				base[LOOP] = {gen: ['ctx@n10'], exceptional: ['ctx@n10'], mustKill: ['ctx']};
				base['$DOMAIN.$PAGE_0.gone'] = {};
				var removed = a05({base: base});
				assert.deepStrictEqual(matching(added).categories, []);
				assert.deepStrictEqual(failures(added), ['鍵 +other']);
				assert.deepStrictEqual(matching(removed).categories, []);
				assert.deepStrictEqual(failures(removed), ['鍵 −gone']);
			});
			it('9: the renumbered model carries an unrelated +foo@n3 in loop, caught by the mainScope pairing', function () {
				var result = renumbered({gen: ['count@n3', 'foo@n3']});
				assert.deepStrictEqual(categoriesOf(result, 'matching', '~', RENUMBERED), []);
				assert.deepStrictEqual(failures(result, RENUMBERED), ['loop.gen +foo@n3']);
			});
			it('10: the shape of 第 5 條 in a file of no 外溢 / 放寬 (var a = new A() is not relaxed)', function () {
				var result = a05({lines: {8: 'var a = new A();'}});
				assert.deepStrictEqual(matching(result).categories, []);
				assert.ok(has(failures(result), 'loop.gen +count@n3'), failures(result));
				assert.ok(has(failures(result), '鍵 +$ANONYMOUS_FUN_0'), failures(result));
			});
			it('a mainScope that is not unique on a side fails', function () {
				var text = matchingJson([], {}),
					result = diffcheck.compareCase({
						name: 'c',
						pageSources: ['var x;\n'],
						baseDir: writeDir({'page0/inter-procedurals/1.matching.json': text}),
						newDir: writeDir({'page0/inter-procedurals/1.matching.json': text, 'page0/inter-procedurals/2.matching.json': text})
					});
				assert.ok(result.errors.some(function (error) {
					return /mainScope \$DOMAIN\.\$PAGE_0 不唯一/.test(error);
				}), result.errors);
			});
		});

		describe('共通 of a matching file (D024 (2))', function () {
			function run(baseLabel, nextLabel, graphs) {
				var files = function (id, label) {
					var result = {'intra-pages/0.matching.json': matchingJson([], {'$DOMAIN.$PAGE_0.f': summaryOf({gen: ['x@' + id]})})};
					if (graphs) {
						result['intra-pages/0.graph.dot'] = graphDot([['n1', 'entry'], [id, label]]);
					}
					return result;
				};
				return comparePage('var x;\nfunction f() {\n  x = 1;\n  x = 2;\n  x = 3;\n}\n', files('n4', baseLabel), files('n3', nextLabel));
			}
			it('11: -x@n4 +x@n3 of other labels is not 共通; a pure renumbering is', function () {
				assert.deepStrictEqual(categoriesOf(run('5', '4', true), 'matching', '~', 'intra-pages/0.matching.json'), []);
				assert.deepStrictEqual(categoriesOf(run('5', '5', true), 'matching', '~', 'intra-pages/0.matching.json'), ['共通']);
				// no graph: the node numbers themselves
				assert.deepStrictEqual(categoriesOf(run('5', '5', false), 'matching', '~', 'intra-pages/0.matching.json'), []);
			});
		});
	});
});
