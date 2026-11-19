/*
 * Golden regression test: runs the dujs CLI on the ES5 fixtures and compares
 * every generated .dot, .matching.json and .md file (four models) with the
 * expected outputs; the Mermaid blocks of the .md files are checked with the
 * official Mermaid parser against the .dot files
 * (specs/009-mermaid-markdown-output FR-009, SC-003).
 *
 * The expected outputs must stay byte-identical unless the analysis is
 * intentionally changed. To regenerate after an intended change:
 * UPDATE_GOLDEN=1 npm test, then review the diff.
 * History: produced with esprima 1.0 (dujs 1.0.0); regenerated after fixing
 * the always-empty KILL sets of reaching definitions.
 */
var crypto = require('crypto'),
	fs = require('fs'),
	os = require('os'),
	path = require('path'),
	spawnSync = require('child_process').spawnSync,
	should = require('should');
var mermaid = require('../helpers/mermaid'),
	mermaidGraph = require('../../lib/dujs/mermaidgraph');

var CLI = path.resolve(__dirname, '../../bin/dujs.js'),
	FIXTURES = path.join(__dirname, 'fixtures'),
	EXPECTED = path.join(__dirname, 'expected'),
	/// sha256 of every .dot file produced before the hierarchical refactor, and
	/// the .dot files added since (specs/003-hierarchical-models/contracts/golden-verification.md);
	/// UPDATE_GOLDEN never reads or writes it
	MANIFEST = path.join(__dirname, 'manifest.json');

/**
 * Golden files: the .dot files, the call matching files and the Markdown
 * files (.md, specs/009-mermaid-markdown-output FR-008, FR-009a)
 * @type {RegExp}
 */
var GOLDEN_FILE = /\.dot$|\.matching\.json$|\.md$/;

/**
 * List the relative paths of the files under a directory whose names match a
 * pattern, sorted
 * @param {string} dir
 * @param {RegExp} pattern
 * @returns {Array}
 */
function listFiles(dir, pattern) {
	'use strict';
	var result = [];
	(function walk(current) {
		fs.readdirSync(current, {withFileTypes: true}).forEach(function (entry) {
			var full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (pattern.test(entry.name)) {
				result.push(path.relative(dir, full));
			}
		});
	}(dir));
	return result.sort();
}

/**
 * Run the CLI on the pages in a new temporary working directory. The fixtures
 * are copied into fixtures/ of the working directory and given by relative
 * paths, so the file names in the source code of the overview README.md
 * (/// --- start fixtures/<file> ---) do not depend on the checkout location
 * @param {Array} pages Arrays of fixture paths relative to FIXTURES
 * @returns {{workDir: string, outDir: string}}
 */
function runCli(pages) {
	'use strict';
	var workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-golden-'));
	var args = [CLI];
	pages.forEach(function (files) {
		args.push('-js');
		files.forEach(function (file) {
			var copy = path.join(workDir, 'fixtures', file);
			fs.mkdirSync(path.dirname(copy), {recursive: true});
			fs.copyFileSync(path.join(FIXTURES, file), copy);
			args.push(path.posix.join('fixtures', file));
		});
	});
	var run = spawnSync(process.execPath, args, {cwd: workDir, encoding: 'utf8'});
	run.status.should.eql(0, run.stderr);
	// the CLI exits with a non-zero status on failure (2: usage, 1: read or analysis error) and reports it on stderr
	run.stderr.should.eql('');
	var outDirs = fs.readdirSync(workDir).filter(function (name) {
		return /^out-/.test(name);
	});
	outDirs.should.have.length(1);
	return {workDir: workDir, outDir: path.join(workDir, outDirs[0])};
}

/**
 * Sections of a model Markdown file by their headings (## <name>)
 * @param {string} markdown
 * @returns {Object} text of each section after its heading line
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
 * sha256 of a file as a hex string
 * @param {string} file
 * @returns {string}
 */
function sha256Of(file) {
	'use strict';
	return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/**
 * Relative path with '/' separators
 * @param {string} file
 * @returns {string}
 */
function toPosix(file) {
	'use strict';
	return file.split(path.sep).join('/');
}

/**
 * Destinations of the links ](...) of a Markdown text, in order; the fenced
 * code blocks (the source code of the overview) are skipped
 * @param {string} markdown
 * @returns {Array}
 */
function linkDestinationsOf(markdown) {
	'use strict';
	var destinations = [], fence = null;
	markdown.split('\n').forEach(function (line) {
		var opening = /^(`{3,})/.exec(line);
		if (fence !== null) {
			if (line === fence) {
				fence = null;
			}
			return;
		}
		if (opening) {
			fence = opening[1];
			return;
		}
		var pattern = /\]\(([^)]*)\)/g, match;
		while ((match = pattern.exec(line)) !== null) {
			destinations.push(match[1]);
		}
	});
	return destinations;
}

/**
 * Links of the overview in the order of contracts/overview-readme.md §2, from
 * the files of an output directory: for each page by its index, src.js, then
 * the intra-procedural, inter-procedural and intra-page models by their
 * numbers; then the inter-page model
 * @param {Array} files relative paths of the files of an output directory
 * @returns {Array}
 */
function overviewLinksOf(files) {
	'use strict';
	var posixFiles = files.map(toPosix);
	function modelsIn(dir) {
		return posixFiles.filter(function (file) {
			return path.posix.dirname(file) === dir && /^\d+\.md$/.test(path.posix.basename(file));
		}).map(function (file) {
			return parseInt(path.posix.basename(file), 10);
		}).sort(function (first, second) {
			return first - second;
		}).map(function (index) {
			return dir + '/' + index + '.md';
		});
	}
	var pages = posixFiles.map(function (file) {
		return /^page(\d+)\//.exec(file);
	}).filter(Boolean).map(function (match) {
		return parseInt(match[1], 10);
	}).filter(function (page, index, all) {
		return all.indexOf(page) === index;
	}).sort(function (first, second) {
		return first - second;
	});
	var result = [];
	pages.forEach(function (page) {
		result.push('page' + page + '/src.js');
		['intra-procedurals', 'inter-procedurals', 'intra-pages'].forEach(function (dir) {
			[].push.apply(result, modelsIn('page' + page + '/' + dir));
		});
	});
	return result.concat(modelsIn('inter-page'));
}

/**
 * Define a golden test case: run the CLI on the pages (each an array of
 * fixture files) and compare the .dot outputs with the expected directory
 * @param {string} title
 * @param {Array} pages Arrays of fixture paths relative to FIXTURES
 * @param {string} expectedDir Directory of expected outputs
 */
function goldenCase(title, pages, expectedDir) {
	'use strict';
	describe(title, function () {
		this.timeout(30000);
		var workDir, outDir;

		before(function () {
			var result = runCli(pages);
			workDir = result.workDir;
			outDir = result.outDir;

			if (process.env.UPDATE_GOLDEN) {
				fs.rmSync(expectedDir, {recursive: true, force: true});
				listFiles(outDir, GOLDEN_FILE).forEach(function (file) {
					fs.mkdirSync(path.dirname(path.join(expectedDir, file)), {recursive: true});
					fs.copyFileSync(path.join(outDir, file), path.join(expectedDir, file));
				});
			}
		});

		before(function () {
			this.timeout(30000);
			return mermaid.load();
		});

		after(function () {
			fs.rmSync(workDir, {recursive: true, force: true});
		});

		it('should generate the same set of files', function () {
			listFiles(outDir, GOLDEN_FILE).should.eql(listFiles(expectedDir, GOLDEN_FILE));
		});

		it('should generate identical contents for every file', function () {
			listFiles(expectedDir, GOLDEN_FILE).forEach(function (file) {
				var actual = fs.readFileSync(path.join(outDir, file), 'utf8'),
					expected = fs.readFileSync(path.join(expectedDir, file), 'utf8');
				should(actual).eql(expected, 'mismatch in ' + file);
			});
		});

		it('keeps every baseline .dot file byte-identical', function () {
			var baseline = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))[path.basename(expectedDir)].baseline,
				different = Object.keys(baseline).filter(function (file) {
					var actual = path.join(outDir, file);
					return !fs.existsSync(actual) || sha256Of(actual) !== baseline[file];
				});
			different.should.eql([], 'baseline .dot files missing or changed: ' + different.join(', '));
		});

		// FR-011, FR-012: the overview README.md replaces report.html
		it('writes the overview README.md and no report.html', function () {
			fs.existsSync(path.join(outDir, 'README.md')).should.eql(true);
			fs.existsSync(path.join(outDir, 'report.html')).should.eql(false);
		});

		// FR-013, FR-014, US3 scenario 3, US2 scenario 3: no image file among all the files of the
		// output directory (not only the golden files); the .dot files are still written, which
		// 'should generate the same set of files' covers
		it('writes no .png and no .svg file', function () {
			listFiles(outDir, /\.png$|\.svg$/).should.eql([]);
		});

		// SC-005, contracts/overview-readme.md §3
		it('links only existing files in the overview', function () {
			var destinations = linkDestinationsOf(fs.readFileSync(path.join(outDir, 'README.md'), 'utf8'));
			destinations.length.should.be.above(0);
			destinations.forEach(function (destination) {
				fs.existsSync(path.join(outDir, destination)).should.eql(true, 'no file of the link ' + destination);
			});
		});

		// contracts/overview-readme.md §2, §3 (replaces the report order test)
		it('links the source and the models in the order of the overview', function () {
			var destinations = linkDestinationsOf(fs.readFileSync(path.join(outDir, 'README.md'), 'utf8')),
				expected = overviewLinksOf(listFiles(outDir, /\.(js|md)$/));
			destinations[0].should.eql('page0/src.js');
			destinations.should.eql(expected);
		});

		// contracts/overview-readme.md §3: the <n>.md of each <n>.graph.dot linked once, and no other link
		it('links the Markdown file of each graph exactly once', function () {
			var destinations = linkDestinationsOf(fs.readFileSync(path.join(outDir, 'README.md'), 'utf8')),
				graphs = listFiles(outDir, GOLDEN_FILE).map(toPosix).filter(function (file) {
					return /\.graph\.dot$/.test(file);
				});
			graphs.length.should.be.above(0);
			graphs.forEach(function (file) {
				var markdownFile = file.replace(/\.graph\.dot$/, '.md');
				destinations.filter(function (destination) {
					return destination === markdownFile;
				}).should.have.length(1, markdownFile);
			});
			destinations.filter(function (destination) {
				return !/\/src\.js$/.test(destination);
			}).sort().should.eql(graphs.map(function (file) {
				return file.replace(/\.graph\.dot$/, '.md');
			}).sort());
		});

		it('adds exactly the listed new files', function () {
			var entry = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))[path.basename(expectedDir)],
				added = listFiles(outDir, GOLDEN_FILE).map(toPosix).filter(function (file) {
					return !Object.prototype.hasOwnProperty.call(entry.baseline, file);
				}).sort();
			added.should.eql([].concat(entry.added).sort());
		});

		/**
		 * Relative paths (posix) of the model Markdown files (<n>.md) of the output
		 * @returns {Array}
		 */
		function modelMarkdownFiles() {
			return listFiles(outDir, GOLDEN_FILE).map(toPosix).filter(function (file) {
				return /(^|\/)\d+\.md$/.test(file);
			});
		}

		/**
		 * Graphs of each model Markdown file: the section, the DOT file and its text
		 * @returns {Array<{file: string, section: string, dotFile: string, text: string}>}
		 */
		function graphsOfMarkdownFiles() {
			var graphs = [];
			modelMarkdownFiles().forEach(function (file) {
				var model = file.replace(/\.md$/, ''),
					sections = sectionsOf(fs.readFileSync(path.join(outDir, file), 'utf8'));
				[['Hierarchy', '.hierarchy.dot'], ['Graph', '.graph.dot']].forEach(function (kind) {
					var dotFile = model + kind[1];
					if (fs.existsSync(path.join(outDir, dotFile))) {
						(typeof sections[kind[0]]).should.eql('string', 'no ' + kind[0] + ' section in ' + file);
						graphs.push({file: file, section: sections[kind[0]], dotFile: dotFile,
							text: fs.readFileSync(path.join(outDir, dotFile), 'utf8')});
					} else {
						(typeof sections[kind[0]]).should.eql('undefined', 'a ' + kind[0] + ' section without ' + dotFile);
					}
				});
			});
			return graphs;
		}

		// FR-001: a <n>.md next to each <n>.graph.dot, and no other
		it('writes a Markdown file next to each graph', function () {
			var graphs = listFiles(outDir, GOLDEN_FILE).map(toPosix).filter(function (file) {
				return /\.graph\.dot$/.test(file);
			});
			graphs.length.should.be.above(0);
			modelMarkdownFiles().should.eql(graphs.map(function (file) {
				return file.replace(/\.graph\.dot$/, '.md');
			}).sort());
		});

		// FR-009
		it('writes Mermaid blocks accepted by the Mermaid parser', function () {
			var blocks = [];
			listFiles(outDir, GOLDEN_FILE).filter(function (file) {
				return /\.md$/.test(file);
			}).forEach(function (file) {
				mermaid.mermaidBlocksOf(fs.readFileSync(path.join(outDir, file), 'utf8')).forEach(function (block) {
					blocks.push({file: file, block: block});
				});
			});
			blocks.length.should.be.above(0);
			return blocks.reduce(function (previous, entry) {
				return previous.then(function () {
					return mermaid.parse(entry.block).catch(function (err) {
						throw new Error('Mermaid parse failed in ' + entry.file + ': ' + err.message);
					});
				});
			}, Promise.resolve());
		});

		// SC-003, contracts/mermaid-graph.md §4 I1
		it('writes the nodes, edges and shapes of each DOT graph in Mermaid', function () {
			var graphs = graphsOfMarkdownFiles().filter(function (graph) {
				return mermaid.mermaidBlocksOf(graph.section).length > 0;
			});
			graphs.length.should.be.above(0);
			return graphs.reduce(function (previous, graph) {
				return previous.then(function () {
					var blocks = mermaid.mermaidBlocksOf(graph.section);
					blocks.should.have.length(1, graph.file + ' ' + graph.dotFile);
					return mermaid.mermaidFactsOf(blocks[0]).then(function (facts) {
						should(facts).eql(mermaid.dotFactsOf(graph.text), 'Mermaid differs from ' + graph.dotFile);
					});
				});
			}, Promise.resolve());
		});

		// FR-010: within the limits of Mermaid, or shown as tables
		it('writes each graph within the limits of Mermaid or as tables', function () {
			var graphs = graphsOfMarkdownFiles();
			graphs.length.should.be.above(0);
			graphs.forEach(function (graph) {
				var blocks = mermaid.mermaidBlocksOf(graph.section),
					edges = mermaid.dotFactsOf(graph.text).edges.length;
				if (blocks.length > 0) {
					edges.should.be.belowOrEqual(mermaidGraph.MAX_EDGES, graph.dotFile);
					blocks[0].length.should.be.belowOrEqual(mermaidGraph.MAX_TEXT_SIZE, graph.dotFile);
				} else {
					graph.section.indexOf('\n> This graph has ').should.eql(0, graph.dotFile);
					graph.section.should.containEql('| Node | Label |');
					graph.section.should.containEql('| From | To | Label |');
				}
			});
		});

		// FR-007, SC-006: a second run in another working directory gives the same Markdown files
		it('writes the same Markdown files in another working directory', function () {
			this.timeout(60000);
			var files = listFiles(outDir, GOLDEN_FILE).filter(function (file) {
					return /\.md$/.test(file);
				}),
				second = runCli(pages);
			try {
				files.length.should.be.above(0);
				listFiles(second.outDir, GOLDEN_FILE).filter(function (file) {
					return /\.md$/.test(file);
				}).should.eql(files);
				files.forEach(function (file) {
					var first = fs.readFileSync(path.join(outDir, file), 'utf8');
					first.should.not.containEql(path.basename(outDir), file);
					should(fs.readFileSync(path.join(second.outDir, file), 'utf8')).eql(first, 'differs: ' + file);
				});
			} finally {
				fs.rmSync(second.workDir, {recursive: true, force: true});
			}
		});
	});
}

goldenCase('Golden outputs (ES5 fixtures)',
	[['page0/app.js'], ['page1/report.js']], EXPECTED);
/// characterization of the ES2015+ modeling; semantics are asserted in tests/dujs/es2015.js
goldenCase('Golden outputs (ES2015+ module fixture)',
	[['es2015/app.js']], path.join(__dirname, 'expected-es2015'));
/// inter-procedural models with nested calls, a call in a decision and event handlers
goldenCase('Golden outputs (inter-procedural fixture)',
	[['interprocedural/app.js']], path.join(__dirname, 'expected-interprocedural'));
/// regression of the fixes of feature 004 (§7, §10, §11, §15, §17, §20, §21, FR-015, FR-016); created before the fixes
goldenCase('Golden outputs (004 fixes fixture)',
	[['fixes004/app.js']], path.join(__dirname, 'expected-fixes004'));
