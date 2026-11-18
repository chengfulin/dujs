/*
 * Test cases of the command line interface (specs/004-fix-remaining-issues,
 * FR-009, FR-010, User Story 5, research R10, contracts/cli.md).
 * Original dujs code, MIT License (see LICENSE).
 *
 * Unit level: cli.run(argv, io) with collected stdout/stderr covers the rows
 * #1-#7 of contracts/cli.md §1 (#7 by a stub of
 * defuseAnalysisExecutor.initialize). OutputWriter keeps its state in module
 * singletons, so a complete analysis (#8) only runs in child processes
 * (bin/dujs.js), which also cover contracts/cli.md §4 (US5-1...US5-5,
 * SC-004, SC-005). The output directory is relative to process.cwd(): the
 * in-process tests switch into a temporary directory and back.
 */
var should = require('should');
var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	childProcess = require('child_process');
var cli = require('../../lib/dujs/cli'),
	outputWriter = require('../../lib/dujs/outputwriter'),
	reportGenerator = require('../../lib/dujs/reportgenerator'),
	defuseAnalysisExecutor = require('../../lib/dujs/defuseanalysisexecutor');

var BIN = path.resolve(__dirname, '../../bin/dujs.js');

var USAGE = [
	'Usage: dujs -js <file>... [-js <file>...]...',
	'       dujs -h | --help',
	'',
	'Analyze the def-use pairs of client-side JavaScript pages.',
	'Each -js starts a page; the files after it, up to the next -js, are combined',
	'into that page. The outputs are written to a new directory',
	'out-<date>-<time>[_<n>] in the current directory.',
	'',
	'Options:',
	'  -js <file>...  files of one page (repeat for more pages)',
	'  -h, --help     print this help and exit',
	'',
	'Example:',
	'  dujs -js lib.js app.js -js report.js',
	''
].join('\n');

/**
 * Collector of the written text, standing for process.stdout/stderr
 * @returns {{text: string, write: Function}}
 */
function collector() {
	'use strict';
	var stream = {text: ''};
	stream.write = function (chunk) {
		stream.text += chunk;
		return true;
	};
	return stream;
}

/**
 * Names of the output directories in a directory
 * @param {string} dir
 * @returns {Array}
 */
function outDirsIn(dir) {
	'use strict';
	return fs.readdirSync(dir).filter(function (name) {
		return name.indexOf('out-') === 0;
	}).sort();
}

/**
 * Relative paths of all files under a directory, sorted
 * @param {string} dir
 * @returns {Array}
 */
function listFiles(dir) {
	'use strict';
	var files = [];
	(function walk(sub) {
		fs.readdirSync(path.join(dir, sub), {withFileTypes: true}).forEach(function (entry) {
			var rel = sub ? sub + '/' + entry.name : entry.name;
			if (entry.isDirectory()) {
				walk(rel);
			} else {
				files.push(rel);
			}
		});
	}(''));
	return files.sort();
}

describe('CLI', function () {
	'use strict';
	var originalCwd, workDir;

	/**
	 * Run cli.run in the temporary working directory
	 * @param {Array} argv
	 * @returns {{status: number, stdout: string, stderr: string}}
	 */
	function run(argv) {
		var stdout = collector(), stderr = collector();
		var status = cli.run(argv, {stdout: stdout, stderr: stderr, cwd: workDir});
		return {status: status, stdout: stdout.text, stderr: stderr.text};
	}

	/**
	 * Assert a usage error (#2-#5): exit 2, the message and the usage on stderr
	 * @param {Array} argv
	 * @param {string} message
	 */
	function shouldBeUsageError(argv, message) {
		var result = run(argv);
		result.status.should.eql(2);
		result.stdout.should.eql('');
		result.stderr.should.eql('dujs: ' + message + '\n\n' + USAGE);
		outDirsIn(workDir).should.eql([]);
	}

	before(function () {
		originalCwd = process.cwd();
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-cli-'));
		process.chdir(workDir);
		fs.writeFileSync(path.join(workDir, 'ok.js'), 'var a = 1;\n');
	});

	after(function () {
		process.chdir(originalCwd);
		fs.rmSync(workDir, {recursive: true, force: true});
		outputWriter._testonly_._resetRootOutputDirectory();
	});

	describe('run (contracts/cli.md §1)', function () {
		/// #1: help wins wherever it appears before --, whatever the other arguments are
		[['--help'], ['-h'], ['-js', 'ok.js', '--help'], ['-x', '--help'], ['-h', 'a.js', '-js'], ['--out', '-h']]
			.forEach(function (argv) {
				it('should print the usage for ' + JSON.stringify(argv), function () {
					var result = run(argv);
					result.status.should.eql(0);
					result.stdout.should.eql(USAGE);
					result.stderr.should.eql('');
					outDirsIn(workDir).should.eql([]);
				});
			});

		it('should not take --help after -- as help', function () {
			var result = run(['-js', '--', '--help']);
			result.status.should.eql(1);
			result.stderr.should.eql('dujs: cannot read --help: ENOENT: no such file or directory\n');
		});

		/// #2
		it('should reject no argument', function () {
			shouldBeUsageError([], 'no page: give the files of each page after -js');
		});

		/// #3: unknown options, short option groups (-hj is not help) and --js=<file>
		it('should reject an unknown short option', function () {
			shouldBeUsageError(['-x', '-js', 'a.js'], 'Unknown option \'-x\'. To specify a positional argument starting ' +
				'with a \'-\', place it at the end of the command after \'--\', as in \'-- "-x"');
		});

		it('should reject an unknown long option', function () {
			shouldBeUsageError(['-js', 'a.js', '--out'], 'Unknown option \'--out\'. To specify a positional argument ' +
				'starting with a \'-\', place it at the end of the command after \'--\', as in \'-- "--out"');
		});

		it('should reject a short option group such as -hj', function () {
			shouldBeUsageError(['-hj'], 'Unknown option \'-j\'. To specify a positional argument starting ' +
				'with a \'-\', place it at the end of the command after \'--\', as in \'-- "-j"');
		});

		it('should reject --js=a.js', function () {
			shouldBeUsageError(['--js=a.js'], 'Option \'--js\' does not take an argument');
		});

		/// #4
		it('should reject files before the first -js', function () {
			shouldBeUsageError(['a.js', '-js', 'b.js'], 'a.js is not after -js');
		});

		it('should reject files after -- with no -js', function () {
			shouldBeUsageError(['--', 'a.js'], 'a.js is not after -js');
		});

		/// #5: k is the 0-based page index
		it('should reject a trailing -js', function () {
			shouldBeUsageError(['-js', 'a.js', '-js'], '-js without files (page 1)');
		});

		it('should reject -js -js', function () {
			shouldBeUsageError(['-js', '-js', 'a.js'], '-js without files (page 0)');
		});

		it('should reject -js --', function () {
			shouldBeUsageError(['-js', '--'], '-js without files (page 0)');
		});

		/// #6: no directory when a file cannot be read; a file named -js after --
		it('should report an unreadable file and create no directory', function () {
			var result = run(['-js', 'ok.js', '-js', 'missing.js']);
			result.status.should.eql(1);
			result.stdout.should.eql('');
			result.stderr.should.eql('dujs: cannot read missing.js: ENOENT: no such file or directory\n');
			outDirsIn(workDir).should.eql([]);
		});

		it('should take -js after -- as a file name', function () {
			var result = run(['-js', 'ok.js', '--', '-js']);
			result.status.should.eql(1);
			result.stderr.should.eql('dujs: cannot read -js: ENOENT: no such file or directory\n');
			outDirsIn(workDir).should.eql([]);
		});

		/// #7: the directory is created before the analysis and removed on failure
		describe('when the analysis throws', function () {
			var originalInitialize, seenDirs, seenSource;

			before(function () {
				originalInitialize = defuseAnalysisExecutor.initialize;
				defuseAnalysisExecutor.initialize = function () {
					seenDirs = outDirsIn(workDir);
					seenSource = seenDirs.length === 1 && fs.existsSync(path.join(workDir, seenDirs[0], 'page0', 'src.js'));
					throw new Error('stub failure');
				};
			});

			after(function () {
				defuseAnalysisExecutor.initialize = originalInitialize;
			});

			it('should remove the output directory and report the failure', function () {
				var result = run(['-js', 'ok.js']);
				result.status.should.eql(1);
				result.stdout.should.eql('');
				result.stderr.should.eql('dujs: analysis failed: stub failure\n');
				seenDirs.should.have.length(1);
				seenSource.should.eql(true);
				outDirsIn(workDir).should.eql([]);
			});
		});
	});

	/// T064: contracts/cli.md §3
	describe('OutputWriter root output directory (contracts/cli.md §3)', function () {
		var start = new Date(2026, 10, 16, 9, 5, 7);
		var base = 'out-2026-11-16-9-5-7';

		beforeEach(function () {
			outputWriter._testonly_._resetRootOutputDirectory();
		});

		afterEach(function () {
			outDirsIn(workDir).forEach(function (name) {
				fs.rmSync(path.join(workDir, name), {recursive: true, force: true});
			});
		});

		it('should throw when ROOT_OUTPUT_DIR is read before the directory is created', function () {
			(function () {
				return outputWriter.ROOT_OUTPUT_DIR;
			}).should.throw(/not created/);
		});

		it('should name the directory by the start time', function () {
			outputWriter.createRootOutputDirectory(start).should.eql(base);
			outputWriter.ROOT_OUTPUT_DIR.should.eql(base);
			fs.statSync(path.join(workDir, base)).isDirectory().should.eql(true);
		});

		it('should add _1, _2 in turn when the name exists, without touching the existing directories', function () {
			fs.mkdirSync(path.join(workDir, base));
			fs.writeFileSync(path.join(workDir, base, 'mark'), 'kept');
			outputWriter.createRootOutputDirectory(start).should.eql(base + '_1');
			outputWriter.ROOT_OUTPUT_DIR.should.eql(base + '_1');
			outputWriter.createRootOutputDirectory(start).should.eql(base + '_2');
			outputWriter.ROOT_OUTPUT_DIR.should.eql(base + '_2');
			outDirsIn(workDir).should.eql([base, base + '_1', base + '_2']);
			fs.readFileSync(path.join(workDir, base, 'mark'), 'utf8').should.eql('kept');
			fs.readdirSync(path.join(workDir, base + '_1')).should.eql([]);
		});

		it('should not create the root directory in createOutputDirectories', function () {
			(function () {
				outputWriter.createOutputDirectories(0);
			}).should.throw(/not created/);
			outDirsIn(workDir).should.eql([]);
		});

		describe('report.html', function () {
			var arrays = ['pageJSSourFilePaths', 'intraProceduralGraphImageFilePaths', 'intraProceduralDUPairsImageFilePaths',
				'interProceduralGraphImageFilePaths', 'interProceduralDUPairsImageFilePaths',
				'interProceduralHierarchyImageFilePaths', 'intraPageGraphImageFilePaths', 'intraPageDUPairsmageFilePaths',
				'intraPageHierarchyImageFilePaths', 'interPageGraphImageFilePaths', 'interPageDUPairsImageFilePaths',
				'interPageHierarchyImageFilePaths'];

			beforeEach(function () {
				/// own arrays on the singleton, so the shared prototype arrays stay untouched
				arrays.forEach(function (name) {
					outputWriter[name] = [];
				});
			});

			afterEach(function () {
				arrays.forEach(function (name) {
					delete outputWriter[name];
				});
			});

			it('should be written into the actual directory and refer to the images by its name', function () {
				fs.mkdirSync(path.join(workDir, base));
				var dir = outputWriter.createRootOutputDirectory(start);
				dir.should.eql(base + '_1');
				outputWriter.createOutputDirectories(0);
				outputWriter.writeCombinedJSSource('var a = 1;\n', 0);
				var image = dir + '/page0/intra-procedurals/0.graph.png';
				outputWriter.intraProceduralGraphImageFilePaths[0] = [image];
				outputWriter.intraProceduralDUPairsImageFilePaths[0] = [dir + '/page0/intra-procedurals/0.dupairs.png'];
				outputWriter.interProceduralGraphImageFilePaths[0] = [];
				outputWriter.intraPageGraphImageFilePaths[0] = [];
				reportGenerator.createReport();
				fs.existsSync(path.join(workDir, base, 'report.html')).should.eql(false);
				var report = fs.readFileSync(path.join(workDir, dir, 'report.html'), 'utf8');
				report.should.containEql('<img src="../' + image + '"');
				report.should.not.containEql('src="../' + base + '/');
			});
		});
	});

	/// T065: contracts/cli.md §4, child processes of bin/dujs.js
	describe('bin/dujs.js (contracts/cli.md §4)', function () {
		/// US5-4 runs 20 analyses with graphviz dot (about 13 s measured)
		this.timeout(60000);
		var dir;

		/**
		 * Run bin/dujs.js synchronously in the directory of the test
		 * @param {Array} argv
		 * @returns {Object} Result of spawnSync
		 */
		function spawnBin(argv) {
			return childProcess.spawnSync(process.execPath, [BIN].concat(argv), {cwd: dir, encoding: 'utf8'});
		}

		/**
		 * Start bin/dujs.js in the directory of the test
		 * @param {Array} argv
		 * @returns {Promise} Resolved with {status, stderr}
		 */
		function startBin(argv) {
			return new Promise(function (resolve, reject) {
				var child = childProcess.spawn(process.execPath, [BIN].concat(argv), {cwd: dir});
				var stderr = '';
				child.stderr.on('data', function (chunk) {
					stderr += chunk;
				});
				child.on('error', reject);
				child.on('close', function (status) {
					resolve({status: status, stderr: stderr});
				});
			});
		}

		beforeEach(function () {
			dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-bin-'));
			fs.writeFileSync(path.join(dir, 'ok.js'), 'var a = 1;\nconsole.log(a);\n');
			fs.writeFileSync(path.join(dir, 'bad.js'), 'var a = ;\n');
		});

		afterEach(function () {
			fs.rmSync(dir, {recursive: true, force: true});
		});

		/// US5-1
		[['--help'], ['-h'], ['-js', 'a.js', '--help'], ['-x', '--help']].forEach(function (argv) {
			it('US5-1 should print the usage for ' + argv.join(' '), function () {
				var result = spawnBin(argv);
				result.status.should.eql(0);
				result.stdout.should.containEql('Usage: dujs -js');
				result.stderr.should.eql('');
				outDirsIn(dir).should.eql([]);
			});
		});

		/// US5-2
		[[], ['a.js'], ['-js'], ['-js', '-js', 'a.js'], ['-x', '-js', 'a.js']].forEach(function (argv) {
			it('US5-2 should exit with 2 for "' + argv.join(' ') + '"', function () {
				var result = spawnBin(argv);
				result.status.should.eql(2);
				result.stdout.should.eql('');
				result.stderr.split('\n')[0].should.startWith('dujs: ');
				result.stderr.should.containEql(USAGE);
				outDirsIn(dir).should.eql([]);
			});
		});

		/// US5-3 / SC-004: a missing file, and an analysis error of a syntax error file
		it('US5-3 should exit with 1 and create no directory for a missing file', function () {
			var result = spawnBin(['-js', 'ok.js', '-js', 'missing.js']);
			result.status.should.eql(1);
			result.stdout.should.eql('');
			result.stderr.should.containEql('dujs: cannot read missing.js');
			outDirsIn(dir).should.eql([]);
		});

		it('US5-3 should exit with 1 and remove the directory for a syntax error', function () {
			var result = spawnBin(['-js', 'bad.js']);
			result.status.should.eql(1);
			result.stdout.should.eql('');
			result.stderr.should.startWith('dujs: analysis failed:');
			result.stderr.should.not.containEql('*** ERROR');
			outDirsIn(dir).should.eql([]);
		});

		/// US5-5
		it('US5-5 should exit with 0 and write the outputs', function () {
			var result = spawnBin(['-js', 'ok.js']);
			result.status.should.eql(0);
			result.stdout.should.eql('');
			result.stderr.should.eql('');
			var dirs = outDirsIn(dir);
			dirs.should.have.length(1);
			var files = listFiles(path.join(dir, dirs[0]));
			files.should.containEql('report.html');
			files.should.containEql('page0/src.js');
			files.should.containEql('inter-page/0.graph.dot');
		});

		/// feature 007 T068 (DECISION 013): 27 or more nodes with one label in a graph used to make
		/// computeLabelIndex loop forever (heap OOM, exit 134)
		describe('27 or more nodes with one label (T068)', function () {
			/// runs about 12.5-14 s and 4.5 s measured, within the 60 s of this describe
			/// handlers-9: 9 event handlers call h(), which has two call sites on one line
			var handlers9 = 'function g(v) { return v; }\n' +
				'function h() { var s = g(1) + g(2); return s; }\n';
			for (var k = 0; k < 9; k += 1) {
				handlers9 += 'function on' + k + '() { var r = h(); }\n' +
					'document.addEventListener("e' + k + '", on' + k + ');\n';
			}
			/// ten-calls-line: ten call sites on one line, reached by three handlers
			var tenCallsLine = 'function g(v) { return v; }\n' +
				'function on0() { var s = [g(1), g(2), g(3), g(4), g(5), g(6), g(7), g(8), g(9), g(10)]; }\n' +
				'function on1() { on0(); }\n' +
				'function on2() { on0(); }\n' +
				'document.addEventListener("a", on0);\n' +
				'document.addEventListener("b", on1);\n' +
				'document.addEventListener("c", on2);\n';

			[['handlers-9.js', handlers9], ['ten-calls-line.js', tenCallsLine]].forEach(function (sample) {
				it('should exit with 0 for ' + sample[0], function () {
					fs.writeFileSync(path.join(dir, sample[0]), sample[1]);
					var result = spawnBin(['-js', sample[0]]);
					should(result.status).eql(0);
					result.stderr.should.eql('');
					outDirsIn(dir).should.have.length(1);
				});
			});
		});

		/// US5-4 / SC-005: two runs started together in the same directory, 10 times
		it('US5-4 should give concurrent runs different directories', function () {
			var rounds = 10;
			var round = 0;
			function next() {
				if (round === rounds) {
					return Promise.resolve();
				}
				round += 1;
				var before = outDirsIn(dir);
				return Promise.all([startBin(['-js', 'ok.js']), startBin(['-js', 'ok.js'])]).then(function (results) {
					results.forEach(function (result) {
						should(result.status).eql(0, result.stderr);
						result.stderr.should.eql('');
					});
					var added = outDirsIn(dir).filter(function (name) {
						return before.indexOf(name) < 0;
					});
					added.should.have.length(2, 'round ' + round);
					return next();
				});
			}
			return next().then(function () {
				var dirs = outDirsIn(dir);
				dirs.should.have.length(2 * rounds);
				var expectedFiles = listFiles(path.join(dir, dirs[0]));
				expectedFiles.should.containEql('report.html');
				dirs.forEach(function (name) {
					listFiles(path.join(dir, name)).should.eql(expectedFiles, name);
					var report = fs.readFileSync(path.join(dir, name, 'report.html'), 'utf8');
					var refs = report.match(/src="\.\.\/[^/"]+\//g);
					refs.length.should.be.above(0);
					refs.forEach(function (ref) {
						ref.should.eql('src="../' + name + '/', name);
					});
				});
			});
		});
	});
});
