/*
 * Whole invariant of the independent reachability checker
 * (specs/008-property-defs-method-calls, contracts/reachability.md §4–§6;
 * US3 scenario 4, SC-005, FR-006, FR-008; D016). Original dujs code, MIT License
 * (see LICENSE).
 *
 * Every model of the probes of feature 008 (tests/dujs/cases/probes008, with
 * pages/ whose pages are separated by a line "//// page", as
 * specs/008-property-defs-method-calls/probes/run-pages.js), of the golden
 * fixtures (the pages of each goldenCase of tests/golden/golden.js) and of the
 * MDN corpus (specs/006-eslint-scope/mdn/corpus, pages of pages.json) is checked
 * with check, and all the results together with assertInvariant against the
 * allowlist tests/dujs/cases/reachability-allowlist.json.
 *
 * D016: the MDN corpus is read directly (precedent tests/dujs/splitcallnodes.js
 * reads files under specs/); a missing file, a number of .js files other than
 * 33 or a sha256 differing from the block "sha256（全碼）" of
 * specs/006-eslint-scope/mdn/README.md fails the test (never skipped).
 */
require('should');
var crypto = require('crypto'),
	fs = require('fs'),
	os = require('os'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	reachability = require('../helpers/reachability');

var ROOT = path.join(__dirname, '..', '..'),
	PROBES = path.join(__dirname, 'cases', 'probes008'),
	GOLDEN = path.join(ROOT, 'tests', 'golden'),
	MDN = path.join(ROOT, 'specs', '006-eslint-scope', 'mdn'),
	MDN_README = path.join(MDN, 'README.md'),
	MDN_FILES = 33,
	ALLOWLIST = path.join(__dirname, 'cases', 'reachability-allowlist.json');

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
 * The sha256 of each corpus file recorded in the block "sha256（全碼）" of the README
 * @param {string} readme path of README.md
 * @returns {Map} file name -> sha256
 */
function recordedHashesOf(readme) {
	'use strict';
	var text = fs.readFileSync(readme, 'utf8'),
		section = text.split(/^## sha256（全碼）\s*$/m)[1];
	if (!section) {
		throw new Error('MDN corpus: no block "sha256（全碼）" in ' + readme);
	}
	var block = section.split('```')[1] || '',
		hashes = new Map();
	block.split('\n').forEach(function (line) {
		var match = /^([0-9a-f]{64})\s+(\S+)$/.exec(line.trim());
		if (match) {
			hashes.set(match[2], match[1]);
		}
	});
	if (hashes.size === 0) {
		throw new Error('MDN corpus: an empty block "sha256（全碼）" in ' + readme);
	}
	return hashes;
}

/**
 * Load the MDN corpus (D016): fails on a missing file, a number of .js files
 * other than 33, or a sha256 differing from the README
 * @param {string} dir directory of pages.json and corpus/
 * @param {string} readme path of the README recording the sha256
 * @returns {Array} {id, pages: Array of the code of each page}
 * @throws {Error}
 */
function loadMdnCorpus(dir, readme) {
	'use strict';
	var corpus = path.join(dir, 'corpus'),
		pages = JSON.parse(fs.readFileSync(path.join(dir, 'pages.json'), 'utf8')),
		recorded = recordedHashesOf(readme),
		listed = [];
	Object.keys(pages).forEach(function (id) {
		pages[id].forEach(function (files) {
			files.forEach(function (file) {
				if (!fs.existsSync(path.join(corpus, file))) {
					throw new Error('MDN corpus: missing file ' + file + ' of ' + id + ' in ' + corpus);
				}
				listed.push(file);
			});
		});
	});
	var jsFiles = fs.readdirSync(corpus).filter(function (name) {
		return /\.js$/.test(name);
	}).sort();
	if (jsFiles.length !== MDN_FILES) {
		throw new Error('MDN corpus: ' + jsFiles.length + ' .js files in ' + corpus + ', expected ' + MDN_FILES);
	}
	jsFiles.forEach(function (file) {
		if (!recorded.has(file)) {
			throw new Error('MDN corpus: no sha256 recorded for ' + file + ' in ' + readme);
		}
		var actual = sha256Of(path.join(corpus, file));
		if (actual !== recorded.get(file)) {
			throw new Error('MDN corpus: sha256 mismatch of ' + file + ': ' + actual + ', recorded ' +
				recorded.get(file));
		}
	});
	return Object.keys(pages).map(function (id) {
		return {
			id: id,
			pages: pages[id].map(function (files) {
				return files.map(function (file) {
					return fs.readFileSync(path.join(corpus, file), 'utf8');
				}).join('\n');
			})
		};
	});
}

/**
 * Pages of a probe file: separated by a line "//// page" (as probes/run-pages.js)
 * @param {string} file
 * @returns {Array}
 */
function pagesOfFile(file) {
	'use strict';
	return fs.readFileSync(file, 'utf8').split(/^\/\/\/\/ page\n/m).filter(function (page) {
		return page.length > 0;
	});
}

/**
 * Programs of the probes of feature 008: probes008/<name> and probes008/pages/<name>
 * @returns {Array} {id, pages}
 */
function probePrograms() {
	'use strict';
	var programs = [];
	[{dir: PROBES, prefix: 'probes008/'}, {dir: path.join(PROBES, 'pages'), prefix: 'probes008/pages/'}]
		.forEach(function (each) {
			fs.readdirSync(each.dir).filter(function (name) {
				return /\.js$/.test(name);
			}).sort().forEach(function (name) {
				programs.push({id: each.prefix + name, pages: pagesOfFile(path.join(each.dir, name))});
			});
		});
	return programs;
}

/**
 * Programs of the golden fixtures: the pages of each goldenCase of
 * tests/golden/golden.js, named golden/<expected directory>
 * @returns {Array} {id, pages}
 */
function goldenPrograms() {
	'use strict';
	var source = fs.readFileSync(path.join(GOLDEN, 'golden.js'), 'utf8'),
		pattern = /goldenCase\('[^']*',\s*(\[\[[^\n]*?\]\]),\s*(EXPECTED|path\.join\(__dirname, '([^']+)'\))\);/g,
		programs = [],
		match;
	while ((match = pattern.exec(source)) !== null) {
		var files = JSON.parse(match[1].replace(/'/g, '"')),
			expected = match[2] === 'EXPECTED' ? 'expected' : match[3];
		programs.push({
			id: 'golden/' + expected,
			pages: files.map(function (page) {
				return page.map(function (file) {
					return fs.readFileSync(path.join(GOLDEN, 'fixtures', file), 'utf8');
				}).join('\n');
			})
		});
	}
	return programs;
}

/**
 * Copy the MDN corpus (pages.json, corpus/) and the README to a temporary directory
 * @returns {string}
 */
function copyOfMdn() {
	'use strict';
	var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-reachability-mdn-'));
	fs.mkdirSync(path.join(dir, 'corpus'));
	fs.copyFileSync(path.join(MDN, 'pages.json'), path.join(dir, 'pages.json'));
	fs.copyFileSync(MDN_README, path.join(dir, 'README.md'));
	fs.readdirSync(path.join(MDN, 'corpus')).forEach(function (name) {
		fs.copyFileSync(path.join(MDN, 'corpus', name), path.join(dir, 'corpus', name));
	});
	return dir;
}

describe('reachability invariant (contracts/reachability.md §4–§6)', function () {
	'use strict';

	describe('MDN corpus (T023; D016)', function () {
		var dir = null;

		afterEach(function () {
			if (!!dir) {
				fs.rmSync(dir, {recursive: true, force: true});
				dir = null;
			}
		});

		it('loads the 32 ids (33 files, 1218 lines) whose sha256 are those of the README', function () {
			var programs = loadMdnCorpus(MDN, MDN_README),
				lines = 0;
			programs.length.should.equal(32);
			fs.readdirSync(path.join(MDN, 'corpus')).filter(function (name) {
				return /\.js$/.test(name);
			}).forEach(function (name) {
				lines += fs.readFileSync(path.join(MDN, 'corpus', name), 'utf8').split('\n').filter(function (line, index, all) {
					return index < all.length - 1 || line.length > 0;
				}).length;
			});
			lines.should.equal(1218);
			recordedHashesOf(MDN_README).size.should.equal(MDN_FILES);
		});

		it('fails on a missing file', function () {
			dir = copyOfMdn();
			fs.unlinkSync(path.join(dir, 'corpus', 's09-second.js'));
			(function () {
				loadMdnCorpus(dir, path.join(dir, 'README.md'));
			}).should.throw(/missing file s09-second\.js/);
		});

		it('fails on a number of .js files other than 33', function () {
			dir = copyOfMdn();
			fs.writeFileSync(path.join(dir, 'corpus', 'z99-extra.js'), 'var extra = 1;\n');
			(function () {
				loadMdnCorpus(dir, path.join(dir, 'README.md'));
			}).should.throw(/34 \.js files .* expected 33/);
		});

		it('fails on a sha256 differing from the README', function () {
			dir = copyOfMdn();
			fs.appendFileSync(path.join(dir, 'corpus', 'a01-oojs-1.js'), '\n');
			(function () {
				loadMdnCorpus(dir, path.join(dir, 'README.md'));
			}).should.throw(/sha256 mismatch of a01-oojs-1\.js/);
		});
	});

	describe('every model of the probes, the golden fixtures and the MDN corpus (T024; US3 scenario 4, SC-005)', function () {
		this.timeout(600000);

		after(function () {
			analyze.reset();
		});

		it('has no violation outside the allowlist and no stale allowlist item', function () {
			var programs = [].concat(probePrograms(), goldenPrograms(), loadMdnCorpus(MDN, MDN_README).map(function (each) {
					return {id: 'mdn/' + each.id, pages: each.pages};
				})),
				allowlist = JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')),
				results = [];
			goldenPrograms().map(function (each) {
				return each.id;
			}).should.eql(['golden/expected', 'golden/expected-es2015', 'golden/expected-interprocedural',
				'golden/expected-fixes004']);
			programs.forEach(function (program) {
				reachability.modelsOfPages(program.pages, program.id).forEach(function (entry) {
					results.push(reachability.check(entry.model, entry.programId, entry.modelName));
				});
				analyze.reset();
			});
			results.length.should.be.above(0);
			reachability.assertInvariant(results, allowlist);
		});
	});
});
