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
var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	spawnSync = require('child_process').spawnSync,
	should = require('should');

var CLI = path.resolve(__dirname, '../../bin/dujs.js'),
	FIXTURES = path.join(__dirname, 'fixtures'),
	EXPECTED = path.join(__dirname, 'expected');

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
	});
}

goldenCase('Golden outputs (ES5 fixtures)',
	[['page0/app.js'], ['page1/report.js']], EXPECTED);
/// characterization of the ES2015+ modeling; semantics are asserted in tests/dujs/es2015.js
goldenCase('Golden outputs (ES2015+ module fixture)',
	[['es2015/app.js']], path.join(__dirname, 'expected-es2015'));
