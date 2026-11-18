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
 * Files of the report order test: the .dot files and the call matching files
 * (*.matching.json, feature 005 contracts/matching-output.md §4)
 * @type {RegExp}
 */
var DOT_FILE = /\.dot$|\.matching\.json$/;

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
 * Run the CLI on the pages in a new temporary working directory
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
			args.push(path.join(FIXTURES, file));
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
 * Image paths referred by a report, in the order of the report: for each
 * page the intra-procedural, inter-procedural and intra-page models (graph
 * then dupairs of each model), then the inter-page model; the hierarchy graph
 * of an upper model (contract #5) before its graph when withHierarchy
 * @param {Array} dotFiles relative paths of the .dot files of an output directory
 * @param {string} prefix prefix of each path (../<output directory>/)
 * @param {boolean} withHierarchy
 * @returns {Array}
 */
function reportImagePaths(dotFiles, prefix, withHierarchy) {
	'use strict';
	var files = dotFiles.map(toPosix);
	function modelsIn(dir) {
		return files.filter(function (file) {
			return path.posix.dirname(file) === dir && /\.graph\.dot$/.test(file);
		}).map(function (file) {
			return parseInt(path.posix.basename(file), 10);
		}).sort(function (first, second) {
			return first - second;
		}).map(function (index) {
			return dir + '/' + index;
		});
	}
	function imagesOf(model, upper) {
		var images = [];
		if (upper && withHierarchy) {
			images.push(prefix + model + '.hierarchy.png');
		}
		return images.concat([prefix + model + '.graph.png', prefix + model + '.dupairs.png']);
	}
	var pages = files.map(function (file) {
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
		[['intra-procedurals', false], ['inter-procedurals', true], ['intra-pages', true]].forEach(function (level) {
			modelsIn('page' + page + '/' + level[0]).forEach(function (model) {
				[].push.apply(result, imagesOf(model, level[1]));
			});
		});
		modelsIn('inter-page').forEach(function (model) {
			[].push.apply(result, imagesOf(model, true));
		});
	});
	return result;
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

		// contract #5 (contracts/hierarchy-output.md §4): checks the HTML only, not the png files (no Graphviz needed)
		it('references the hierarchy graphs before the flat graphs in the report', function () {
			var html = fs.readFileSync(path.join(outDir, 'report.html'), 'utf8'),
				prefix = '../' + path.basename(outDir) + '/',
				dotFiles = listFiles(outDir, DOT_FILE),
				hierarchyDiv = /<div class="col-lg-8 col-lg-offset-2 col-sm-12"><img src="[^"]*\.hierarchy\.png" class="center-block"><\/div>/g;
			function sourcesOf(content) {
				var sources = [], pattern = /<img src="([^"]*)"/g, match;
				while ((match = pattern.exec(content)) !== null) {
					sources.push(match[1]);
				}
				return sources;
			}
			function positionOf(image) {
				return html.indexOf('<img src="' + image + '"');
			}
			var hierarchies = dotFiles.map(toPosix).filter(function (file) {
				return /\.hierarchy\.dot$/.test(file);
			});
			hierarchies.length.should.be.above(0);
			hierarchies.forEach(function (file) {
				var model = prefix + file.replace(/\.hierarchy\.dot$/, ''),
					hierarchy = positionOf(model + '.hierarchy.png'),
					graph = positionOf(model + '.graph.png'),
					dupairs = positionOf(model + '.dupairs.png');
				hierarchy.should.be.aboveOrEqual(0, 'no hierarchy graph of ' + file);
				hierarchy.should.be.below(graph, 'hierarchy graph after the graph of ' + file);
				graph.should.be.below(dupairs, 'graph after the dupairs of ' + file);
			});
			sourcesOf(html).should.eql(reportImagePaths(dotFiles, prefix, true));
			var withoutHierarchy = html.replace(hierarchyDiv, '');
			withoutHierarchy.should.not.containEql('.hierarchy.png');
			sourcesOf(withoutHierarchy).should.eql(reportImagePaths(dotFiles, prefix, false));
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
