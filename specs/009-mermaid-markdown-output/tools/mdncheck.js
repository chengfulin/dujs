/*
 * MDN corpus acceptance of feature 009 (FR-016, SC-002, SC-003; research R5,
 * R8; D005-A5): run bin/dujs.js on every id of
 * specs/006-eslint-scope/mdn/pages.json without Graphviz on the PATH, run the
 * same input with the base commit (274257a) checked out in a git worktree,
 * and check the Markdown + Mermaid output. Not part of dujs, not run by
 * npm test.
 *
 *   node specs/009-mermaid-markdown-output/tools/mdncheck.js --report [<mdn-check.md>] [--work <dir>]
 *   node specs/009-mermaid-markdown-output/tools/mdncheck.js --verify <mdn-check.md> [--work <dir>]
 *
 * --report writes the record (by default
 * specs/009-mermaid-markdown-output/mdn-check.md); --verify runs everything
 * again and compares the base commit line, the rows of the table and the
 * total line with the record. --work is the parent of the temporary
 * directory (os.tmpdir() by default); the worktree is made there and
 * removed (git worktree remove --force) at the end.
 *
 * Checks of each id (the result column lists the failed ones):
 * - exit 0 and an empty stderr, of this branch and of the base;
 * - no .png and no report.html in the output directory;
 * - a <n>.md next to each <n>.graph.dot, and no <n>.md without it;
 * - every link ](...) of the overview README.md (outside fenced code) to an
 *   existing file;
 * - every ```mermaid block of every .md accepted by the Mermaid parser;
 * - each graph (<n>.graph.dot, <n>.hierarchy.dot) in its section of <n>.md
 *   (## Graph, ## Hierarchy): a Mermaid block within MAX_EDGES and
 *   MAX_TEXT_SIZE whose nodes, edges and shapes are those of the .dot (as
 *   multisets), or else the table form ("> This graph has ...") of a graph
 *   over the limits;
 * - every .dot and .matching.json byte-identical with the base (same set of
 *   files).
 * The parse and the facts come from tests/helpers/mermaid.js.
 *
 * Exit status: 0 every id passes (--verify: and the record matches), 1 a
 * failed check or a record that does not match, 2 usage error or no
 * worktree / corpus.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var childProcess = require('child_process'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');

var ROOT = path.resolve(__dirname, '..', '..', '..'),
	FEATURE = path.resolve(__dirname, '..'),
	CORPUS = path.join(ROOT, 'specs', '006-eslint-scope', 'mdn'),
	BASE = '274257a',
	DEFAULT_RECORD = path.join(FEATURE, 'mdn-check.md');

var mermaid = require(path.join(ROOT, 'tests', 'helpers', 'mermaid.js')),
	mermaidGraph = require(path.join(ROOT, 'lib', 'dujs', 'mermaidgraph.js'));

/**
 * Numbers of research R5, compared with the measured ones in the record
 * @type {Object}
 */
var R5 = {ids: 32, graphs: 281, degraded: 0, maxEdges: 200, maxGraph: 'a05-assessment-main inter-page/0.graph.dot', maxChars: 7411};

/**
 * Relative paths (posix) of the files under a directory, sorted
 * @param {string} dir
 * @returns {Array}
 */
function listFiles(dir) {
	'use strict';
	var result = [];
	(function walk(current) {
		fs.readdirSync(current, {withFileTypes: true}).forEach(function (entry) {
			var full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else {
				result.push(path.relative(dir, full).split(path.sep).join('/'));
			}
		});
	}(dir));
	return result.sort();
}

/**
 * Run a dujs CLI on the pages of an id in a new directory; the corpus files
 * are copied into it and given by relative paths (same arguments for both
 * sides). The PATH is the directory of node only, so no Graphviz.
 * @param {string} cli path of bin/dujs.js
 * @param {Array} pages arrays of corpus file names
 * @param {string} work parent directory
 * @returns {{status: number, stderr: string, outDir: (string|null)}}
 */
function runCli(cli, pages, work) {
	'use strict';
	var cwd = fs.mkdtempSync(path.join(work, 'run-')),
		args = [cli];
	pages.forEach(function (files) {
		args.push('-js');
		files.forEach(function (file) {
			fs.copyFileSync(path.join(CORPUS, 'corpus', file), path.join(cwd, file));
			args.push(file);
		});
	});
	var env = Object.assign({}, process.env, {PATH: path.dirname(process.execPath)}),
		run = childProcess.spawnSync(process.execPath, args, {cwd: cwd, encoding: 'utf8', env: env}),
		outs = fs.readdirSync(cwd).filter(function (name) {
			return /^out-/.test(name);
		});
	return {status: run.status, stderr: run.stderr || '', outDir: outs.length === 1 ? path.join(cwd, outs[0]) : null};
}

/**
 * Destinations of the links ](...) of a Markdown text, fenced code skipped
 * @param {string} markdown
 * @returns {Array}
 */
function linkDestinationsOf(markdown) {
	'use strict';
	var destinations = [], fence = null;
	markdown.split('\n').forEach(function (line) {
		var opening = /^(`{3,})/.exec(line), pattern = /\]\(([^)\s]*)(?:\s+"[^"]*")?\)/g, match, closing;
		if (fence !== null) {
			closing = /^(`{3,})\s*$/.exec(line);
			if (closing && closing[1].length >= fence.length) {
				fence = null;
			}
			return;
		}
		if (opening) {
			fence = opening[1];
			return;
		}
		while ((match = pattern.exec(line)) !== null) {
			if (!/^[a-z][a-z0-9+.-]*:/i.test(match[1])) {
				destinations.push(match[1].replace(/#.*$/, ''));
			}
		}
	});
	return destinations;
}

/**
 * Sections of a model Markdown file by their headings (## <name>)
 * @param {string} markdown
 * @returns {Object}
 */
function sectionsOf(markdown) {
	'use strict';
	var sections = {};
	markdown.split(/^## /m).slice(1).forEach(function (part) {
		var newline = part.indexOf('\n');
		sections[part.slice(0, newline)] = part.slice(newline + 1);
	});
	return sections;
}

/**
 * Check the graphs of the model Markdown files of an output directory
 * @param {string} outDir
 * @param {Array} files
 * @param {Object} result to fill (graphs, maxEdges, maxChars, degraded, problems)
 * @returns {Promise}
 */
function checkGraphs(outDir, files, result) {
	'use strict';
	var graphs = [];
	files.filter(function (file) {
		return /(^|\/)\d+\.md$/.test(file);
	}).forEach(function (file) {
		var model = file.replace(/\.md$/, ''),
			sections = sectionsOf(fs.readFileSync(path.join(outDir, file), 'utf8'));
		[['Hierarchy', '.hierarchy.dot'], ['Graph', '.graph.dot']].forEach(function (kind) {
			var dotFile = model + kind[1];
			if (files.indexOf(dotFile) === -1) {
				if (typeof sections[kind[0]] === 'string') {
					result.problems.push('## ' + kind[0] + ' without ' + dotFile);
				}
			} else if (typeof sections[kind[0]] !== 'string') {
				result.problems.push('no ## ' + kind[0] + ' in ' + file);
			} else {
				graphs.push({dotFile: dotFile, section: sections[kind[0]],
					text: fs.readFileSync(path.join(outDir, dotFile), 'utf8')});
			}
		});
	});
	return graphs.reduce(function (previous, graph) {
		return previous.then(function () {
			return checkGraph(graph, result);
		});
	}, Promise.resolve());
}

/**
 * Check one graph: Mermaid within the limits and equal to the .dot, or the
 * table form over the limits
 * @param {Object} graph {dotFile, section, text}
 * @param {Object} result
 * @returns {Promise}
 */
function checkGraph(graph, result) {
	'use strict';
	var blocks = mermaid.mermaidBlocksOf(graph.section),
		dotFacts = mermaid.dotFactsOf(graph.text),
		edges = dotFacts.edges.length;
	result.graphs += 1;
	if (edges > result.maxEdges) {
		result.maxEdges = edges;
		result.maxEdgesGraph = graph.dotFile;
	}
	if (blocks.length === 0) {
		var degraded = /^\n> This graph has (\d+) edges and (\d+) characters in Mermaid/.exec(graph.section);
		result.degraded += 1;
		if (!degraded || !(edges > mermaidGraph.MAX_EDGES || Number(degraded[2]) > mermaidGraph.MAX_TEXT_SIZE)) {
			result.problems.push('table form not over the limits: ' + graph.dotFile);
		}
		return Promise.resolve();
	}
	if (blocks.length !== 1) {
		result.problems.push(blocks.length + ' Mermaid blocks for ' + graph.dotFile);
	}
	result.maxChars = Math.max(result.maxChars, blocks[0].length);
	if (edges > mermaidGraph.MAX_EDGES || blocks[0].length > mermaidGraph.MAX_TEXT_SIZE) {
		result.problems.push('Mermaid over the limits: ' + graph.dotFile);
	}
	return mermaid.mermaidFactsOf(blocks[0]).then(function (facts) {
		if (JSON.stringify(facts) !== JSON.stringify(dotFacts)) {
			result.problems.push('Mermaid differs from ' + graph.dotFile);
		}
	}, function (error) {
		result.problems.push('facts of ' + graph.dotFile + ': ' + error.message);
	});
}

/**
 * Check every Mermaid block of every .md with the parser
 * @param {string} outDir
 * @param {Array} files
 * @param {Object} result
 * @returns {Promise}
 */
function checkParse(outDir, files, result) {
	'use strict';
	var blocks = [];
	files.filter(function (file) {
		return /\.md$/.test(file);
	}).forEach(function (file) {
		mermaid.mermaidBlocksOf(fs.readFileSync(path.join(outDir, file), 'utf8')).forEach(function (block) {
			blocks.push({file: file, block: block});
		});
	});
	return blocks.reduce(function (previous, entry) {
		return previous.then(function () {
			return mermaid.parse(entry.block).catch(function (error) {
				result.problems.push('parse failed in ' + entry.file + ': ' + error.message.split('\n')[0]);
			});
		});
	}, Promise.resolve());
}

/**
 * Checks of the files of an output directory that need no parser
 * @param {string} outDir
 * @param {Array} files
 * @param {Object} result
 */
function checkFiles(outDir, files, result) {
	'use strict';
	files.forEach(function (file) {
		if (/\.png$/.test(file) || /(^|\/)report\.html$/.test(file)) {
			result.problems.push('unexpected file ' + file);
		}
	});
	var graphFiles = files.filter(function (file) {
			return /\.graph\.dot$/.test(file);
		}),
		modelMarkdown = files.filter(function (file) {
			return /(^|\/)\d+\.md$/.test(file);
		});
	result.models = graphFiles.length;
	if (JSON.stringify(graphFiles.map(function (file) {
		return file.replace(/\.graph\.dot$/, '.md');
	}).sort()) !== JSON.stringify(modelMarkdown.slice().sort())) {
		result.problems.push('<n>.md and <n>.graph.dot differ');
	}
	if (files.indexOf('README.md') === -1) {
		result.problems.push('no README.md');
		return;
	}
	linkDestinationsOf(fs.readFileSync(path.join(outDir, 'README.md'), 'utf8')).forEach(function (destination) {
		if (!fs.existsSync(path.join(outDir, destination))) {
			result.problems.push('README.md link to no file: ' + destination);
		}
	});
}

/**
 * .dot and .matching.json byte-identical with the base
 * @param {string} outDir
 * @param {Array} files
 * @param {string} baseOutDir
 * @param {Object} result
 */
function checkBase(outDir, files, baseOutDir, result) {
	'use strict';
	function compared(list) {
		return list.filter(function (file) {
			return /\.dot$|\.matching\.json$/.test(file);
		});
	}
	var mine = compared(files),
		theirs = compared(listFiles(baseOutDir));
	if (JSON.stringify(mine) !== JSON.stringify(theirs)) {
		result.problems.push('.dot / .matching.json files differ from ' + BASE);
		return;
	}
	mine.forEach(function (file) {
		if (!fs.readFileSync(path.join(outDir, file)).equals(fs.readFileSync(path.join(baseOutDir, file)))) {
			result.problems.push('not byte-identical with ' + BASE + ': ' + file);
		}
	});
}

/**
 * Run and check one id
 * @param {string} id
 * @param {Array} pages
 * @param {string} work
 * @param {string} baseCli
 * @returns {Promise<Object>} result
 */
function checkId(id, pages, work, baseCli) {
	'use strict';
	var result = {id: id, models: 0, graphs: 0, maxEdges: 0, maxEdgesGraph: null, maxChars: 0, degraded: 0, problems: []},
		run = runCli(path.join(ROOT, 'bin', 'dujs.js'), pages, work),
		baseRun = runCli(baseCli, pages, work);
	if (run.status !== 0 || run.stderr !== '' || run.outDir === null) {
		result.problems.push('CLI exit ' + run.status + (run.stderr ? ', stderr ' + JSON.stringify(run.stderr.slice(0, 200)) : ''));
		return Promise.resolve(result);
	}
	if (baseRun.status !== 0 || baseRun.stderr !== '' || baseRun.outDir === null) {
		result.problems.push(BASE + ' CLI exit ' + baseRun.status + (baseRun.stderr ? ', stderr ' + JSON.stringify(baseRun.stderr.slice(0, 200)) : ''));
	}
	var files = listFiles(run.outDir);
	checkFiles(run.outDir, files, result);
	if (baseRun.outDir !== null) {
		checkBase(run.outDir, files, baseRun.outDir, result);
	}
	return checkParse(run.outDir, files, result).then(function () {
		return checkGraphs(run.outDir, files, result);
	}).then(function () {
		return result;
	});
}

/**
 * Add a git worktree of the base with node_modules linked to the repo's
 * @param {string} dir
 */
function addWorktree(dir) {
	'use strict';
	var add = childProcess.spawnSync('git', ['-C', ROOT, 'worktree', 'add', '--detach', dir, BASE], {encoding: 'utf8'});
	if (add.status !== 0) {
		throw new Error('git worktree add ' + BASE + ' 失敗：' + add.stderr);
	}
	var link = path.join(dir, 'node_modules');
	// never link into an existing node_modules (it would make a link inside the repo's)
	if (fs.existsSync(link) || isLink(link)) {
		throw new Error('worktree 已有 node_modules：' + link);
	}
	fs.symlinkSync(path.join(ROOT, 'node_modules'), link, 'dir');
}

/**
 * Whether a path is a symbolic link (also a dangling one)
 * @param {string} file
 * @returns {boolean}
 */
function isLink(file) {
	'use strict';
	try {
		return fs.lstatSync(file).isSymbolicLink();
	} catch (ignoredError) {
		return false;
	}
}

/**
 * Remove the worktree
 * @param {string} dir
 */
function removeWorktree(dir) {
	'use strict';
	if (fs.existsSync(dir)) {
		childProcess.spawnSync('git', ['-C', ROOT, 'worktree', 'remove', '--force', dir], {encoding: 'utf8'});
	}
	childProcess.spawnSync('git', ['-C', ROOT, 'worktree', 'prune'], {encoding: 'utf8'});
}

/**
 * Row of an id in the record table
 * @param {Object} result
 * @returns {string}
 */
function rowOf(result) {
	'use strict';
	return '| ' + [result.id, result.models, result.graphs, result.maxEdges, result.maxChars, result.degraded,
		result.problems.length === 0 ? '通過' : '失敗（' + result.problems.length + '）'].join(' | ') + ' |';
}

/**
 * Totals of the results
 * @param {Array} results
 * @returns {Object}
 */
function totalsOf(results) {
	'use strict';
	var totals = {ids: results.length, passed: 0, models: 0, graphs: 0, degraded: 0, maxEdges: 0, maxGraph: null, maxChars: 0};
	results.forEach(function (result) {
		totals.passed += result.problems.length === 0 ? 1 : 0;
		totals.models += result.models;
		totals.graphs += result.graphs;
		totals.degraded += result.degraded;
		totals.maxChars = Math.max(totals.maxChars, result.maxChars);
		if (result.maxEdges > totals.maxEdges) {
			totals.maxEdges = result.maxEdges;
			totals.maxGraph = result.id + ' ' + result.maxEdgesGraph;
		}
	});
	return totals;
}

/**
 * Total line of the record
 * @param {Object} totals
 * @returns {string}
 */
function totalLineOf(totals) {
	'use strict';
	return '- 總計：' + totals.ids + ' 個 id，通過 ' + totals.passed + '；模型 ' + totals.models + '、圖 ' + totals.graphs +
		'、降級 ' + totals.degraded + '；最大邊數 ' + totals.maxEdges + '（' + totals.maxGraph + '）；最大字元數 ' + totals.maxChars;
}

/**
 * Comparison with research R5
 * @param {Object} totals
 * @returns {Array} lines
 */
function r5LinesOf(totals) {
	'use strict';
	var lines = [];
	function compare(name, expected, actual) {
		lines.push('- ' + name + '：R5 ' + expected + '，實測 ' + actual + (String(expected) === String(actual) ? '（相符）' : '（不符）'));
	}
	compare('id 數', R5.ids, totals.ids);
	compare('圖數（`*.graph.dot`＋`*.hierarchy.dot`）', R5.graphs, totals.graphs);
	compare('降級數', R5.degraded, totals.degraded);
	compare('最大邊數', R5.maxEdges, totals.maxEdges);
	compare('最大邊數的圖', R5.maxGraph, totals.maxGraph);
	compare('最大 Mermaid 區塊字元數', R5.maxChars, totals.maxChars);
	return lines;
}

/**
 * Record text
 * @param {Array} results
 * @returns {string}
 */
function buildReport(results) {
	'use strict';
	var totals = totalsOf(results),
		lines = [
			'# MDN 語料驗收（009，FR-016）',
			'',
			'由 `node specs/009-mermaid-markdown-output/tools/mdncheck.js --report` 產生；' +
				'`--verify specs/009-mermaid-markdown-output/mdn-check.md` 重跑並核對基準、表格每列與總計。',
			'語料：`specs/006-eslint-scope/mdn/pages.json`＋`corpus/`；兩邊皆以 `PATH=<node 目錄>`（無 Graphviz）執行 `bin/dujs.js`。',
			'',
			'- 基準 commit：' + BASE,
			totalLineOf(totals),
			'',
			'| id | 模型數 | 圖數 | 最大邊數 | 最大字元數 | 降級數 | 結果 |',
			'|----|-------:|-----:|---------:|-----------:|-------:|------|'
		];
	results.forEach(function (result) {
		lines.push(rowOf(result));
	});
	lines.push('', '欄位：模型數＝`*.graph.dot` 數；圖數＝`*.graph.dot`＋`*.hierarchy.dot` 數；最大邊數取自 `.dot`；' +
		'最大字元數＝Mermaid 區塊（不含 fence）的字元數。', '', '## 與 research R5 對照', '');
	[].push.apply(lines, r5LinesOf(totals));
	lines.push('');
	lines.push('註：R5 的字元數取自研究階段的原型轉換器；實測值為定稿 `lib/dujs/mermaidgraph.js`（contracts/mermaid-graph.md §2）輸出的 JS 字串長度，' +
		'兩者格式細節不同，字元數有差異屬預期（邊數、圖數與降級數取自 `.dot` 與 `.md`，不受影響）。差異遠低於上限 ' +
		mermaidGraph.MAX_TEXT_SIZE + ' 字元，不改變「語料 0 張降級」的結論。');
	var failed = results.filter(function (result) {
		return result.problems.length > 0;
	});
	if (failed.length > 0) {
		lines.push('', '## 失敗明細', '');
		failed.forEach(function (result) {
			result.problems.forEach(function (problem) {
				lines.push('- ' + result.id + '：' + problem);
			});
		});
	}
	return lines.join('\n') + '\n';
}

/**
 * Lines of a record checked by --verify: the base line, the total line and
 * the table rows
 * @param {string} text
 * @returns {Array}
 */
function checkedLinesOf(text) {
	'use strict';
	return text.split('\n').filter(function (line) {
		return /^- 基準 commit：/.test(line) || /^- 總計：/.test(line) || /^\| [a-z]\d/.test(line);
	});
}

/**
 * Run every id
 * @param {string} work parent directory
 * @returns {Promise<Array>}
 */
function runAll(work) {
	'use strict';
	var pages = JSON.parse(fs.readFileSync(path.join(CORPUS, 'pages.json'), 'utf8')),
		ids = Object.keys(pages).sort(),
		temp = fs.mkdtempSync(path.join(work, 'mdncheck009-')),
		tree = path.join(temp, 'base');
	var done = function () {
		removeWorktree(tree);
		fs.rmSync(temp, {recursive: true, force: true});
	};
	try {
		addWorktree(tree);
	} catch (error) {
		done();
		return Promise.reject(error);
	}
	var results = [];
	return mermaid.load().then(function () {
		return ids.reduce(function (previous, id) {
			return previous.then(function () {
				return checkId(id, pages[id], temp, path.join(tree, 'bin', 'dujs.js'));
			}).then(function (result) {
				results.push(result);
			});
		}, Promise.resolve());
	}).then(function () {
		done();
		return results;
	}, function (error) {
		done();
		throw error;
	});
}

/**
 * Command line
 * @param {Array} argv
 * @returns {Promise<number>} exit status
 */
function main(argv) {
	'use strict';
	var report = false, recordFile = null, verifyFile = null, work = os.tmpdir();
	for (var i = 0; i < argv.length; ++i) {
		if (argv[i] === '--report') {
			report = true;
			if (argv[i + 1] && !/^--/.test(argv[i + 1])) {
				recordFile = argv[++i];
			}
		} else if (argv[i] === '--verify') {
			verifyFile = argv[++i] || null;
		} else if (argv[i] === '--work') {
			work = argv[++i] || null;
		} else {
			process.stderr.write('未知參數：' + argv[i] + '\n');
			return Promise.resolve(2);
		}
	}
	if (report === !!verifyFile || !work) {
		process.stderr.write('用法：mdncheck.js (--report [<mdn-check.md>] | --verify <mdn-check.md>) [--work <dir>]\n');
		return Promise.resolve(2);
	}
	if (verifyFile && !fs.existsSync(verifyFile)) {
		process.stderr.write('找不到紀錄檔：' + verifyFile + '\n');
		return Promise.resolve(2);
	}
	return runAll(work).then(function (results) {
		var text = buildReport(results),
			problems = [];
		results.forEach(function (result) {
			result.problems.forEach(function (problem) {
				problems.push(result.id + '：' + problem);
			});
		});
		if (report) {
			fs.writeFileSync(recordFile || DEFAULT_RECORD, text);
			process.stdout.write('已寫入 ' + (recordFile || DEFAULT_RECORD) + '\n');
		} else {
			var recorded = checkedLinesOf(fs.readFileSync(verifyFile, 'utf8')),
				actual = checkedLinesOf(text);
			actual.forEach(function (line) {
				if (recorded.indexOf(line) === -1) {
					problems.push('紀錄沒有這一列：' + line);
				}
			});
			recorded.forEach(function (line) {
				if (actual.indexOf(line) === -1) {
					problems.push('紀錄的這一列與實測不符：' + line);
				}
			});
		}
		problems.forEach(function (problem) {
			process.stdout.write('FAIL ' + problem + '\n');
		});
		process.stdout.write(problems.length === 0 ? '通過：' + results.length + ' 個 id\n' : problems.length + ' 個問題\n');
		return problems.length === 0 ? 0 : 1;
	}, function (error) {
		process.stderr.write(error.message + '\n');
		return 2;
	});
}

if (require.main === module) {
	main(process.argv.slice(2)).then(function (status) {
		'use strict';
		process.exitCode = status;
	});
}
