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

describe('Golden outputs (ES5 fixtures)', function () {
	'use strict';
	this.timeout(30000);
	var workDir, outDir;

	before(function () {
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-golden-'));
		var run = spawnSync(process.execPath, [
			CLI,
			'-js', path.join(FIXTURES, 'page0', 'app.js'),
			'-js', path.join(FIXTURES, 'page1', 'report.js')
		], {cwd: workDir, encoding: 'utf8'});
		run.status.should.eql(0);
		// the CLI reports failures on stderr but still exits with 0
		run.stderr.should.eql('');
		var outDirs = fs.readdirSync(workDir).filter(function (name) {
			return /^out-/.test(name);
		});
		outDirs.should.have.length(1);
		outDir = path.join(workDir, outDirs[0]);

		if (process.env.UPDATE_GOLDEN) {
			fs.rmSync(EXPECTED, {recursive: true, force: true});
			listDotFiles(outDir).forEach(function (file) {
				fs.mkdirSync(path.dirname(path.join(EXPECTED, file)), {recursive: true});
				fs.copyFileSync(path.join(outDir, file), path.join(EXPECTED, file));
			});
		}
	});

	after(function () {
		fs.rmSync(workDir, {recursive: true, force: true});
	});

	it('should generate the same set of .dot files', function () {
		listDotFiles(outDir).should.eql(listDotFiles(EXPECTED));
	});

	it('should generate identical contents for every .dot file', function () {
		listDotFiles(EXPECTED).forEach(function (file) {
			var actual = fs.readFileSync(path.join(outDir, file), 'utf8'),
				expected = fs.readFileSync(path.join(EXPECTED, file), 'utf8');
			should(actual).eql(expected, 'mismatch in ' + file);
		});
	});
});
