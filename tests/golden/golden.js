/*
 * Golden regression test: runs the dujs CLI on the ES5 fixtures and compares
 * every generated .dot file (four models) with the expected outputs.
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

var CLI = path.resolve(__dirname, '../../bin/dujs.js'),
	FIXTURES = path.join(__dirname, 'fixtures'),
	EXPECTED = path.join(__dirname, 'expected'),
	/// sha256 of every .dot file produced before the hierarchical refactor, and
	/// the .dot files added since (specs/003-hierarchical-models/contracts/golden-verification.md);
	/// UPDATE_GOLDEN never reads or writes it
	MANIFEST = path.join(__dirname, 'manifest.json');

/**
 * List the relative paths of all .dot files under a directory, sorted
 * @param {string} dir
 * @returns {Array}
 */
function listDotFiles(dir) {
	'use strict';
	var result = [];
	(function walk(current) {
		fs.readdirSync(current, {withFileTypes: true}).forEach(function (entry) {
			var full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (/\.dot$/.test(entry.name)) {
				result.push(path.relative(dir, full));
			}
		});
	}(dir));
	return result.sort();
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
			workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-golden-'));
			var args = [CLI];
			pages.forEach(function (files) {
				args.push('-js');
				files.forEach(function (file) {
					args.push(path.join(FIXTURES, file));
				});
			});
			var run = spawnSync(process.execPath, args, {cwd: workDir, encoding: 'utf8'});
			run.status.should.eql(0);
			// the CLI reports failures on stderr but still exits with 0
			run.stderr.should.eql('');
			var outDirs = fs.readdirSync(workDir).filter(function (name) {
				return /^out-/.test(name);
			});
			outDirs.should.have.length(1);
			outDir = path.join(workDir, outDirs[0]);

			if (process.env.UPDATE_GOLDEN) {
				fs.rmSync(expectedDir, {recursive: true, force: true});
				listDotFiles(outDir).forEach(function (file) {
					fs.mkdirSync(path.dirname(path.join(expectedDir, file)), {recursive: true});
					fs.copyFileSync(path.join(outDir, file), path.join(expectedDir, file));
				});
			}
		});

		after(function () {
			fs.rmSync(workDir, {recursive: true, force: true});
		});

		it('should generate the same set of .dot files', function () {
			listDotFiles(outDir).should.eql(listDotFiles(expectedDir));
		});

		it('should generate identical contents for every .dot file', function () {
			listDotFiles(expectedDir).forEach(function (file) {
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
				dotFiles = listDotFiles(outDir),
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

		it('adds exactly the listed new .dot files', function () {
			var entry = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))[path.basename(expectedDir)],
				added = listDotFiles(outDir).map(toPosix).filter(function (file) {
					return !Object.prototype.hasOwnProperty.call(entry.baseline, file);
				}).sort();
			added.should.eql([].concat(entry.added).sort());
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
