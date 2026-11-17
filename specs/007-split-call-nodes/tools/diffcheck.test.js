/*
 * Self test of specs/007-split-call-nodes/tools/diffcheck.js
 * (contracts/diff-check.md §1–§5, tasks T005 (a)–(i)) on synthetic output
 * directories and inline source code. Not part of npm test; run with:
 *   npx mocha specs/007-split-call-nodes/tools/diffcheck.test.js
 *
 * Original dujs code, MIT License (see LICENSE).
 */
/* global describe, it, after */
var assert = require('assert'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var diffcheck = require('./diffcheck');

var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck007-test-')),
	counter = 0;

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
 * @param {Array} edges [[from, to, type], ...]; type '' for a normal edge
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
	(edges || []).forEach(function (edge) {
		lines.push('h' + edge[0] + ' -> h' + edge[1] + ' [color="blue", label="' + edge[2] + '"]');
	});
	return lines.join('\n') + '\n}';
}

/**
 * Text of a *.matching.json file
 * @param {Array} calls [[callSiteLine, callee, callNode, callReturn], ...]
 * @param {Array} [loops] [[scope, ...], ...] handler scopes of each loop
 * @returns {string}
 */
function matchingJson(calls, loops) {
	'use strict';
	return JSON.stringify({
		format: 'dujs-matching/1',
		level: 'intraPage',
		mainScope: '$DOMAIN.$PAGE_0',
		calls: calls.map(function (call, index) {
			return {
				id: 'c' + (index + 1), seq: index + 1, callSiteLine: call[0], callee: call[1], callNode: call[2],
				entry: 'n90', exit: 'n91', callReturn: call[3], exceptionalReturn: 'n92', back: false, beforeDecision: false
			};
		}),
		loops: (loops || []).map(function (handlers, index) {
			return {loop: 'n8' + index, loopReturn: 'n9' + index, handlers: handlers.map(function (scope) {
				return {scope: scope, entry: 'n70', exit: 'n71'};
			})};
		}),
		summaries: {}
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
	Object.keys(files).forEach(function (file) {
		var full = path.join(dir, file);
		fs.mkdirSync(path.dirname(full), {recursive: true});
		fs.writeFileSync(full, files[file]);
	});
	return dir;
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
	var prefix = function (files) {
		var result = {};
		Object.keys(files).forEach(function (file) {
			result['page0/' + file] = files[file];
		});
		return result;
	};
	return diffcheck.compareCase({
		name: 'c',
		pageSources: [source],
		baseDir: writeDir(prefix(base)),
		newDir: writeDir(prefix(next))
	});
}

function pairDiffs(result) {
	'use strict';
	return result.diffs.filter(function (diff) {
		return diff.unit === 'pair';
	});
}

function find(result, unit, sign, content) {
	'use strict';
	return result.diffs.filter(function (diff) {
		return diff.unit === unit && diff.sign === sign && diff.content === content;
	})[0];
}

/**
 * A record built from the report, with every note filled
 * @param {string} report
 * @returns {string}
 */
function fillNotes(report) {
	'use strict';
	return '# 紀錄\n\n基準：`edc22d5`\n\n' + report.split('\n').map(function (line) {
		return line.replace(/\| 草擬，待簽核/, '說明 | 草擬，待簽核');
	}).join('\n');
}

after(function () {
	'use strict';
	fs.rmSync(tmpRoot, {recursive: true, force: true});
});

describe('diffcheck 007', function () {
	'use strict';

	describe('(a) base line', function () {
		it('reads the base line of the header', function () {
			assert.strictEqual(diffcheck.baseOf('# x\n\n基準：`edc22d5`（develop）\n'), 'edc22d5');
			assert.strictEqual(diffcheck.baseOf('# x\n'), null);
		});
		it('--base overrides the header', function () {
			assert.strictEqual(diffcheck.resolveBase(null, '基準：`edc22d5`\n'), 'edc22d5');
			assert.strictEqual(diffcheck.resolveBase('abc1234', '基準：`edc22d5`\n'), 'abc1234');
			assert.strictEqual(diffcheck.resolveBase(null, '# no base\n'), null);
		});
		it('exits 2 without a base, and when the base cannot be read', function () {
			var noBase = path.join(writeDir({'r.md': '# 紀錄\n'}), 'r.md'),
				badBase = path.join(writeDir({'r.md': '# 紀錄\n\n基準：`0000000`\n'}), 'r.md'),
				io = {out: function () {}, err: function () {}};
			assert.strictEqual(diffcheck.main(['golden', '--verify', noBase], io), 2);
			assert.strictEqual(diffcheck.main(['golden', '--verify', badBase], io), 2);
			assert.strictEqual(diffcheck.main(['golden', '--base', '0000000', '--verify', noBase], io), 2);
		});
	});

	describe('(b) pairs compared as sets', function () {
		it('repeated pairs make no difference', function () {
			var graph = graphDot([['n1', 'entry'], ['n2', '1'], ['n3', '5a'], ['n4', '5b'], ['n5', 'exit']]),
				result = comparePage('var x = 1;\n', {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5a)', '(1,5b)']]])
				}, {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5a)']]])
				});
			assert.deepStrictEqual(pairDiffs(result), []);
		});
		it('a new pair is one difference', function () {
			var graph = graphDot([['n1', 'entry'], ['n2', '1'], ['n3', '5'], ['n4', '7'], ['n5', 'exit']]),
				result = comparePage('var x = 1;\n', {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5)', '(1,5)']]])
				}, {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5)', '(1,7)', '(1,7)']]])
				});
			assert.deepStrictEqual(pairDiffs(result).map(function (diff) {
				return diff.sign + diff.content;
			}), ['+x: 1 -> 7']);
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
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5a)']], ['y', ['(1,5a)']]])
			});
		}
		it('counts the occurrences after the first of a pair of a variable', function () {
			assert.strictEqual(diffcheck.duplicateCount(dupairsDot([['x', ['(1,5a)', '(1,5b)', '(1,5a)']], ['y', ['(1,5a)']]])), 2);
			assert.deepStrictEqual(result().duplicates, [{file: 'intra-pages/0.dupairs.dot', page: 'page0', base: 2, next: 0}]);
		});
		it('reports the table and --verify checks its numbers', function () {
			var results = [result()],
				report = diffcheck.buildReport(results),
				record = fillNotes(report);
			assert.ok(/\| c \| page0 \| intra-pages\/0\.dupairs\.dot \| 2 \| 0 \| -2 \|/.test(report), report);
			assert.deepStrictEqual(diffcheck.verifyRecord(results, record), []);
			var wrong = record.replace('| 2 | 0 | -2 |', '| 2 | 1 | -1 |');
			assert.ok(diffcheck.verifyRecord(results, wrong).some(function (problem) {
				return /重複列數/.test(problem);
			}));
		});
	});

	describe('(d) label rewriting', function () {
		var baseGraph = graphDot([['n1', 'entry'], ['n2', '2'], ['n3', 'call'], ['n4', 'callReturn'], ['n5', '5'], ['n6', 'exit']],
				[['n2', 'n3', ''], ['n3', 'n4', ''], ['n4', 'n5', '']]),
			newGraph = graphDot([['n1', 'entry'], ['n2', '2'], ['n3', 'call (4)'], ['n4', 'callReturn (4)'], ['n5', '5'], ['n6', 'exit']],
				[['n2', 'n3', ''], ['n3', 'n4', ''], ['n4', 'n5', '']]),
			matching = matchingJson([[4, '$DOMAIN.$PAGE_0.f', 'n3', 'n4']]);
		it('a pure label difference is 標記', function () {
			var result = comparePage('function f() {}\nvar x;\n\nf();\nx;\n', {
				'intra-pages/0.graph.dot': baseGraph,
				'intra-pages/0.matching.json': matching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn,5)']]])
			}, {
				'intra-pages/0.graph.dot': newGraph,
				'intra-pages/0.matching.json': matching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn (4),5)']]])
			});
			assert.deepStrictEqual(pairDiffs(result), []);
			assert.deepStrictEqual(find(result, 'graph', '~', 'intra-pages/0.graph.dot').categories, ['標記']);
			assert.deepStrictEqual(find(result, 'row', '~', 'x').categories, ['標記']);
		});
		it('a changed def on the call node is not 標記', function () {
			var result = comparePage('function f() {}\nvar x;\n\nf();\nx;\n', {
				'intra-pages/0.graph.dot': baseGraph,
				'intra-pages/0.matching.json': matching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(call,5)']]])
			}, {
				'intra-pages/0.graph.dot': newGraph,
				'intra-pages/0.matching.json': matching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn (4),5)']]])
			});
			var pairs = pairDiffs(result);
			assert.deepStrictEqual(pairs.map(function (diff) {
				return diff.sign + diff.content;
			}).sort(), ['+x: callReturn (4) -> 5', '-x: call (4) -> 5']);
			pairs.forEach(function (diff) {
				assert.strictEqual(diff.categories.indexOf('標記'), -1);
			});
			assert.strictEqual(find(result, 'row', '~', 'x'), undefined);
		});
		it('renames the suffixes of same labels by the rules of 007', function () {
			var graph = graphDot([['n1', 'call_a'], ['n2', 'callReturn_a'], ['n3', 'call_b'], ['n4', 'callReturn_b'],
					['n5', 'call_c'], ['n6', 'callReturn_c'], ['n7', '3a'], ['n8', '3b']]),
				rewritten = diffcheck.rewriteLabels(graph, JSON.parse(matchingJson([
					[4, 'f', 'n1', 'n2'], [4, 'g', 'n3', 'n4']
				])));
			assert.strictEqual(rewritten.map.get('call_a'), 'call (4)_a');
			assert.strictEqual(rewritten.map.get('callReturn_b'), 'callReturn (4)_b');
			// the call without a record keeps its type label, now alone
			assert.strictEqual(rewritten.map.get('call_c'), 'call');
			assert.strictEqual(rewritten.map.get('3a'), '3a');
			assert.ok(rewritten.text.indexOf('n3 [label="call (4)_b"') !== -1);
			assert.strictEqual(diffcheck.rewriteCell('(call_a,(3b,callReturn_b))', rewritten.map), '(call (4)_a,(3b,callReturn (4)_b))');
		});
		it('keeps a label with a path (KI §15) and puts its path on the call', function () {
			var graph = graphDot([['n1', 'call'], ['n2', 'callReturn (6:T)']]),
				rewritten = diffcheck.rewriteLabels(graph, JSON.parse(matchingJson([[6, 'f', 'n1', 'n2']])));
			assert.strictEqual(rewritten.map.get('callReturn (6:T)'), 'callReturn (6:T)');
			assert.strictEqual(rewritten.map.get('call'), 'call (6:T)');
		});
		it('keeps a call node without a record', function () {
			var graph = graphDot([['n1', 'call'], ['n2', 'callReturn']]),
				rewritten = diffcheck.rewriteLabels(graph, JSON.parse(matchingJson([])));
			assert.strictEqual(rewritten.map.get('call'), 'call');
			assert.strictEqual(rewritten.text, graph);
		});
		it('step 0: no rewriting while this branch still writes call_x', function () {
			var result = comparePage('function f() {}\nvar x;\n\nf();\nx;\n', {
				'intra-pages/0.graph.dot': baseGraph,
				'intra-pages/0.matching.json': matching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn,5)']]])
			}, {
				'intra-pages/0.graph.dot': baseGraph,
				'intra-pages/0.matching.json': matching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn,5)']]])
			});
			assert.deepStrictEqual(result.diffs, []);
		});
		it('step 0: callReturn (6:T) alone does not trigger, and dupairs follow the graph', function () {
			var graph = graphDot([['n1', 'entry'], ['n2', 'call'], ['n3', 'callReturn (6:T)'], ['n4', '7']]),
				pathMatching = matchingJson([[6, 'f', 'n2', 'n3']]),
				dupairs = dupairsDot([['x', ['(call,7)', '(callReturn (6:T),7)']]]),
				result = comparePage('var x;\n', {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.matching.json': pathMatching,
					'intra-pages/0.dupairs.dot': dupairs
				}, {
					'intra-pages/0.graph.dot': graph,
					'intra-pages/0.matching.json': pathMatching,
					'intra-pages/0.dupairs.dot': dupairs
				});
			assert.deepStrictEqual(result.diffs, []);
			// the graph of the model triggers: its dupairs are rewritten even
			// though their own text has no "call ("
			var triggered = comparePage('var x;\n', {
				'intra-pages/0.graph.dot': graph,
				'intra-pages/0.matching.json': pathMatching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(call,7)']]])
			}, {
				'intra-pages/0.graph.dot': graphDot([['n1', 'entry'], ['n2', 'call (6:T)'], ['n3', 'callReturn (6:T)'], ['n4', '7']]),
				'intra-pages/0.matching.json': pathMatching,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(call (6:T),7)']]])
			});
			assert.deepStrictEqual(pairDiffs(triggered), []);
			assert.deepStrictEqual(find(triggered, 'row', '~', 'x').categories, ['標記']);
		});
	});

	describe('(e) categories', function () {
		var empty = graphDot([['n1', 'entry'], ['n2', 'exit']]);
		function page(source, baseFiles, newFiles) {
			return comparePage(source, Object.assign({'intra-pages/0.graph.dot': empty}, baseFiles),
				Object.assign({'intra-pages/0.graph.dot': empty}, newFiles));
		}
		it('連結: a new call edge at a line, use after it or in the callee', function () {
			var source = 'var x = 1;\nfunction f() {\n  x;\n}\nvar y = f();\nx;\n',
				calls = matchingJson([[5, '$DOMAIN.$PAGE_0.f', 'n5', 'n6']]),
				callee = graphDot([['n1', 'entry'], ['n2', '3'], ['n3', 'exit']], [], 'functionDeclaration[ $DOMAIN.$PAGE_0.f ]'),
				result = page(source, {
					'intra-pages/0.matching.json': matchingJson([]),
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]]),
					'intra-procedurals/1.graph.dot': callee
				}, {
					'intra-pages/0.matching.json': calls,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,3)', '(1,6)']]]),
					'intra-procedurals/1.graph.dot': callee
				});
			assert.ok(find(result, 'pair', '+', 'x: 1 -> 3').categories.indexOf('連結') !== -1);
			assert.ok(find(result, 'pair', '+', 'x: 1 -> 6').categories.indexOf('連結') !== -1);
		});
		it('求值順序: def or use on a call site line; 判別式 and 可迭代', function () {
			var calls = matchingJson([[2, '$DOMAIN.$PAGE_0.f', 'n5', 'n6']]),
				result = page('var x = 1;\nf(x);\nfunction f() {}\n', {
					'intra-pages/0.matching.json': calls,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]])
				}, {
					'intra-pages/0.matching.json': calls,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,2)']]])
				});
			assert.deepStrictEqual(find(result, 'pair', '+', 'x: 1 -> 2').categories, ['求值順序']);
			var switchSource = 'var x = 1;\nswitch (f()) {\n  case x:\n    break;\n}\nfunction f() {}\n',
				switched = page(switchSource, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]])
				}, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,(3,4))']]])
				});
			assert.ok(find(switched, 'pair', '+', 'x: 1 -> (3,4)').categories.indexOf('求值順序（判別式）') !== -1);
			var loopSource = 'var x = 1;\nfor (var v of f()) {\n  x;\n}\nfunction f() {}\n',
				looped = page(loopSource, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]])
				}, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,3)']]])
				});
			assert.ok(find(looped, 'pair', '+', 'x: 1 -> 3').categories.indexOf('求值順序（可迭代）') !== -1);
		});
		it('返回後例外: use in a catch, def on a call site line; 決策返回不拋錯', function () {
			var source = 'var x = 1;\ntry {\n  x = f();\n  if (g()) {}\n} catch (e) {\n  x;\n}\nfunction f() {}\nfunction g() {}\n',
				calls = matchingJson([[3, '$DOMAIN.$PAGE_0.f', 'n5', 'n6'], [4, '$DOMAIN.$PAGE_0.g', 'n7', 'n8']]),
				baseFlat = graphDot([['n1', 'entry'], ['n2', '4'], ['n3', '6'], ['n4', 'exit']],
					[['n2', 'n3', 'exception'], ['n2', 'n4', 'true'], ['n2', 'n4', 'false']]),
				newFlat = graphDot([['n1', 'entry'], ['n2', '4'], ['n3', '6'], ['n4', 'exit']],
					[['n2', 'n4', 'true'], ['n2', 'n4', 'false']]),
				result = comparePage(source, {
					'intra-pages/0.graph.dot': baseFlat,
					'intra-pages/0.matching.json': calls,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,6)']]])
				}, {
					'intra-pages/0.graph.dot': newFlat,
					'intra-pages/0.matching.json': calls,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(3,6)']]])
				});
			assert.ok(find(result, 'pair', '+', 'x: 3 -> 6').categories.indexOf('返回後例外') !== -1);
			assert.ok(find(result, 'pair', '-', 'x: 1 -> 6').categories.indexOf('返回後例外（決策返回不拋錯）') !== -1);
		});
		it('KI classes: §37 (generator call) and §38 (finally)', function () {
			var generator = page('var x = 1;\nfunction* g() { x = 2; }\ng();\nx;\n', {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]])
				}, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,4)']]])
				}),
				fin = page('var x = 1;\ntry {\n  x = 2;\n} finally {\n  x;\n}\n', {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]])
				}, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,5)']]])
				});
			assert.ok(find(generator, 'pair', '+', 'x: 1 -> 4').categories.indexOf('§37') !== -1);
			assert.ok(find(fin, 'pair', '+', 'x: 1 -> 5').categories.indexOf('§38') !== -1);
		});
		it('KI class §43: a callee called from two scopes, the pair in its lines', function () {
			var callee = graphDot([['n1', 'entry'], ['n2', '3'], ['n3', 'exit']], [], 'functionDeclaration[ $DOMAIN.$PAGE_0.f ]'),
				hierarchy = hierarchyDot(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.h', '$DOMAIN.$PAGE_0.f'], [[0, 2, 'call'], [1, 2, 'call']]),
				result = page('var x = 0;\nfunction f() {\n  x;\n}\n', {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]]),
					'intra-pages/0.hierarchy.dot': hierarchy,
					'intra-procedurals/1.graph.dot': callee
				}, {
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,3)']]]),
					'intra-pages/0.hierarchy.dot': hierarchy,
					'intra-procedurals/1.graph.dot': callee
				});
			assert.deepStrictEqual(find(result, 'pair', '+', 'x: 1 -> 3').categories, ['§43']);
		});
		it('共通: a graph equal after removing the node numbers', function () {
			var result = comparePage('var x;\n', {
				'intra-pages/0.graph.dot': graphDot([['n1', 'entry'], ['n2', 'exit']], [['n1', 'n2', '']])
			}, {
				'intra-pages/0.graph.dot': graphDot([['n3', 'entry'], ['n4', 'exit']], [['n3', 'n4', '']])
			});
			assert.deepStrictEqual(find(result, 'graph', '~', 'intra-pages/0.graph.dot').categories, ['共通']);
		});
	});

	describe('(e2) 共通（段0例外）, DECISION 008', function () {
		// base: CALL n2 -> CALL RETURN n3 -> decision n4 (true n5, false n6),
		// the decision with an exception edge to n7; 007 adds the exception
		// edge of the CALL (segment 0) n2 -> n7
		var nodes = [['n1', 'entry'], ['n2', 'call'], ['n3', 'callReturn'], ['n4', '3'], ['n5', '4'], ['n6', '5'],
				['n7', 'catch'], ['n8', 'exit']],
			baseEdges = [['n1', 'n2', ''], ['n2', 'n3', ''], ['n3', 'n4', ''], ['n4', 'n5', 'true'], ['n4', 'n6', 'false'],
				['n4', 'n7', 'exception'], ['n5', 'n8', ''], ['n6', 'n8', ''], ['n7', 'n8', '']],
			pairs = dupairsDot([['x', ['(1,4)']]]);
		function matching(beforeDecision) {
			return JSON.stringify({format: 'dujs-matching/1', level: 'intraPage', mainScope: '$DOMAIN.$PAGE_0', calls: [{
				id: 'c1', seq: 1, callSiteLine: 3, callee: '$DOMAIN.$PAGE_0.f', callNode: 'n2', entry: 'n90', exit: 'n91',
				callReturn: 'n3', exceptionalReturn: 'n7', back: false, beforeDecision: beforeDecision
			}], loops: [], summaries: {}}, null, 2);
		}
		function run(options) {
			var base = {
					'intra-pages/0.graph.dot': graphDot(nodes, options.baseEdges || baseEdges),
					'intra-pages/0.matching.json': matching(true),
					'intra-pages/0.dupairs.dot': pairs
				},
				next = {
					'intra-pages/0.graph.dot': graphDot(nodes, options.newEdges),
					'intra-pages/0.matching.json': matching(options.beforeDecision !== false),
					'intra-pages/0.dupairs.dot': options.newPairs || pairs
				};
			if (options.beforeDecision === false) {
				base['intra-pages/0.matching.json'] = matching(false);
			}
			return comparePage('var x = 1;\nfunction f() {}\nif (f()) {\n  x;\n} else {}\n', base, next);
		}
		function categories(result) {
			return find(result, 'graph', '~', 'intra-pages/0.graph.dot').categories;
		}
		var added = baseEdges.concat([['n2', 'n7', 'exception']]);
		it('holds for the exception edge of the CALL before a decision, and lists it in the report', function () {
			var result = run({newEdges: added}),
				results = [result],
				report = diffcheck.buildReport(results);
			assert.deepStrictEqual(categories(result), ['共通（段0例外）', '共通']);
			assert.ok(/\| 共通（段0例外） \| — \| 段0例外：n2 → n7（c1） \|/.test(report), report);
			assert.deepStrictEqual(diffcheck.verifyRecord(results, fillNotes(report)), []);
		});
		it('does not hold for a new edge that is not an exception edge', function () {
			assert.deepStrictEqual(categories(run({newEdges: baseEdges.concat([['n2', 'n7', '']])})), []);
		});
		it('does not hold when the source is not the CALL of a beforeDecision record', function () {
			assert.deepStrictEqual(categories(run({newEdges: added, beforeDecision: false})), []);
			assert.deepStrictEqual(categories(run({newEdges: baseEdges.concat([['n1', 'n7', 'exception']])})), []);
		});
		it('does not hold when the target is not the exceptionalReturn', function () {
			assert.deepStrictEqual(categories(run({newEdges: baseEdges.concat([['n2', 'n6', 'exception']])})), []);
		});
		it('does not hold when the decision of the base has no exception edge to the target', function () {
			var without = baseEdges.filter(function (edge) {
				return edge[2] !== 'exception';
			});
			assert.deepStrictEqual(categories(run({baseEdges: without, newEdges: without.concat([['n2', 'n7', 'exception']])})), []);
		});
		it('does not hold for two new edges of the same record', function () {
			assert.deepStrictEqual(categories(run({newEdges: added.concat([['n2', 'n7', 'exception']])})), []);
		});
		it('does not hold together with a pair difference', function () {
			var result = run({newEdges: added, newPairs: dupairsDot([['x', ['(1,4)', '(1,5)']]])});
			assert.deepStrictEqual(categories(result), []);
			assert.ok(find(result, 'pair', '+', 'x: 1 -> 5'));
		});
		it('does not hold together with a removed or redirected edge', function () {
			var removed = added.filter(function (edge) {
					return !(edge[0] === 'n7' && edge[1] === 'n8');
				}),
				redirected = removed.concat([['n7', 'n6', '']]);
			assert.deepStrictEqual(categories(run({newEdges: removed})), []);
			assert.deepStrictEqual(categories(run({newEdges: redirected})), []);
		});
	});

	describe('(f) failures of the classification', function () {
		it('a pair of no category fails, and a pair of an intra-procedural model always fails', function () {
			var empty = graphDot([['n1', 'entry'], ['n2', 'exit']]),
				result = comparePage('var x = 1;\nx;\n', {
					'intra-pages/0.graph.dot': empty,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', []]]),
					'intra-procedurals/0.graph.dot': empty,
					'intra-procedurals/0.dupairs.dot': dupairsDot([['x', []]])
				}, {
					'intra-pages/0.graph.dot': empty,
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,2)']]]),
					'intra-procedurals/0.graph.dot': empty,
					'intra-procedurals/0.dupairs.dot': dupairsDot([['x', ['(1,2)']]])
				}),
				results = [result],
				report = diffcheck.buildReport(results);
			assert.deepStrictEqual(find(result, 'pair', '+', 'x: 1 -> 2').categories, []);
			var problems = diffcheck.verifyRecord(results, fillNotes(report));
			assert.ok(problems.some(function (problem) {
				return /判準不成立/.test(problem);
			}), problems.join('\n'));
			assert.ok(problems.some(function (problem) {
				return /intra-procedural/.test(problem);
			}), problems.join('\n'));
		});
	});

	describe('(g) pins, duplicate rows and exit codes', function () {
		var calls = matchingJson([[2, '$DOMAIN.$PAGE_0.f', 'n5', 'n6']]),
			empty = graphDot([['n1', 'entry'], ['n2', 'exit']]);
		function results() {
			return [comparePage('var x = 1;\nf(x);\nfunction f() {}\n', {
				'intra-pages/0.graph.dot': empty,
				'intra-pages/0.matching.json': calls,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', []]])
			}, {
				'intra-pages/0.graph.dot': empty,
				'intra-pages/0.matching.json': calls,
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,2)']]])
			})];
		}
		it('passes with the report and fails on a wrong pin count or a missing note', function () {
			var report = diffcheck.buildReport(results()),
				record = fillNotes(report);
			assert.ok(/\| c \| page0 \| 求值順序 \|/.test(report), report);
			assert.deepStrictEqual(diffcheck.verifyRecord(results(), record), []);
			var wrongCount = record.replace(/(\| c \| page0 \| 求值順序 \|[^|]*\|) 1 \| 0 \|/, '$1 2 | 0 |');
			assert.notStrictEqual(wrongCount, record);
			assert.ok(diffcheck.verifyRecord(results(), wrongCount).some(function (problem) {
				return /釘選/.test(problem);
			}));
			var noNote = record.replace('說明 | 草擬', ' | 草擬');
			assert.ok(diffcheck.verifyRecord(results(), noNote).some(function (problem) {
				return /說明必填/.test(problem);
			}));
		});
		it('fails on a changed exit code', function () {
			var codes = diffcheck.exitCodesOf([{name: 'a', exitCode: {base: 0, now: 1}}]);
			assert.strictEqual(codes.problems.length, 1);
		});
	});

	describe('(h) MDN base side matching', function () {
		it('rewrites the base side with the matching of the snapshot', function () {
			// compareCase reads the matching of baseDir, as the MDN mode does
			// with the snapshot directory
			var result = comparePage('function f() {}\nvar x;\n\nf();\nx;\n', {
				'intra-pages/0.graph.dot': graphDot([['n1', 'call'], ['n2', 'callReturn'], ['n3', '5']]),
				'intra-pages/0.matching.json': matchingJson([[4, 'f', 'n1', 'n2']]),
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn,5)']]])
			}, {
				'intra-pages/0.graph.dot': graphDot([['n1', 'call (4)'], ['n2', 'callReturn (4)'], ['n3', '5']]),
				'intra-pages/0.matching.json': matchingJson([[4, 'f', 'n1', 'n2']]),
				'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(callReturn (4),5)']]])
			});
			assert.deepStrictEqual(pairDiffs(result), []);
		});
		it('a base model with a call node and no matching cannot be compared (exit 2)', function () {
			assert.throws(function () {
				comparePage('f();\n', {
					'intra-pages/0.graph.dot': graphDot([['n1', 'call'], ['n2', 'callReturn']])
				}, {
					'intra-pages/0.graph.dot': graphDot([['n1', 'call (1)'], ['n2', 'callReturn (1)']])
				});
			}, /matching/);
			var snapshot = writeDir({
					'exitcodes.json': '{"a": 0}\n',
					'a/page0/intra-pages/0.graph.dot': graphDot([['n1', 'call'], ['n2', 'callReturn']])
				}),
				corpus = writeDir({'pages.json': '{"a": [["a.js"]]}\n', 'corpus/a.js': 'f();\n'}),
				record = path.join(writeDir({'r.md': '# 紀錄\n\n基準：`edc22d5`\n'}), 'r.md'),
				errors = [];
			assert.strictEqual(diffcheck.main(['mdn', '--verify', record], {
				out: function () {},
				err: function (text) {
					errors.push(text);
				}
			}, {mdnBase: snapshot, mdnCorpus: corpus}), 2);
			assert.ok(/matching/.test(errors.join('\n')), errors.join('\n'));
		});
	});

	describe('(i) class static no longer linked', function () {
		it('lists a static scope linked by the base and not by this branch, with its pairs', function () {
			var source = 'var k = 1, x = 0;\nswitch (k) {\n  case class { static y = g(); }:\n    break;\n}\nx;\nfunction g() { x = 1; }\n',
				empty = graphDot([['n1', 'entry'], ['n2', 'exit']]),
				result = comparePage(source, {
					'intra-pages/0.graph.dot': empty,
					'intra-pages/0.matching.json': matchingJson([[3, '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0', 'n5', 'n6'],
						[3, '$DOMAIN.$PAGE_0.g', 'n7', 'n8']]),
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(7,6)', '(1,6)']]])
				}, {
					'intra-pages/0.graph.dot': empty,
					'intra-pages/0.matching.json': matchingJson([]),
					'intra-pages/0.dupairs.dot': dupairsDot([['x', ['(1,6)']]])
				});
			assert.deepStrictEqual(result.staticRows.map(function (row) {
				return [row.page, row.line, row.scope, row.kind, row.pairs];
			}), [['page0', 3, '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0', 'case test', 1]]);
			assert.ok(find(result, 'pair', '-', 'x: 7 -> 6').categories.indexOf('§44') !== -1);
			var results = [result],
				record = fillNotes(diffcheck.buildReport(results));
			assert.deepStrictEqual(diffcheck.verifyRecord(results, record), []);
			var wrong = record.replace('| case test | 1 |', '| case test | 2 |');
			assert.notStrictEqual(wrong, record);
			assert.ok(diffcheck.verifyRecord(results, wrong).some(function (problem) {
				return /class static/.test(problem);
			}));
		});
		it('writes 無 when there is none', function () {
			var report = diffcheck.buildReport([]);
			assert.ok(/## class static 不再連結[\s\S]*\| 無 \|/.test(report), report);
			assert.deepStrictEqual(diffcheck.verifyRecord([], fillNotes(report)), []);
		});
	});
});
