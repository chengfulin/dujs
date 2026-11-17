/*
 * Analysis time of the MDN corpus (feature 006, research R15): in one
 * process, analyze the 32 ids (33 files) of mdn/pages.json in order with
 * <dujsRoot>/tests/helpers/analyze.js; run the whole round 3 times and print
 * each total and the median (ms). Usage (from the repository root):
 *   node specs/006-eslint-scope/tools/perf.js <dujsRoot>
 * <dujsRoot> is the dujs checkout to measure (develop or this branch); the
 * corpus is read from this feature directory. A page is the concatenation of
 * its files as the CLI reads them (lib/dujs/sourcereader.js of <dujsRoot>).
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');

var MDN = path.resolve(__dirname, '..', 'mdn'),
	ROUNDS = 3;

/**
 * Analyze every id once
 * @param {Function} analyze tests/helpers/analyze.js of the measured root
 * @param {Array} work [{id, pages: [source]}]
 * @returns {number} elapsed ms
 */
function round(analyze, work) {
	'use strict';
	var start = process.hrtime.bigint();
	work.forEach(function (item) {
		analyze(item.pages);
		analyze.reset();
	});
	return Number(process.hrtime.bigint() - start) / 1e6;
}

function main(argv) {
	'use strict';
	if (argv.length !== 1) {
		process.stderr.write('用法：node specs/006-eslint-scope/tools/perf.js <dujsRoot>\n');
		return 2;
	}
	var root = path.resolve(argv[0]),
		analyze = require(path.join(root, 'tests', 'helpers', 'analyze.js')),
		reader = require(path.join(root, 'lib', 'dujs', 'sourcereader.js')),
		pages = JSON.parse(fs.readFileSync(path.join(MDN, 'pages.json'), 'utf8')),
		work = Object.keys(pages).sort().map(function (id) {
			return {
				id: id,
				pages: pages[id].map(function (files) {
					return reader.getSourceFromFiles(files.map(function (file) {
						return path.join(MDN, 'corpus', file);
					}));
				})
			};
		}),
		times = [];
	for (var i = 0; i < ROUNDS; ++i) {
		times.push(round(analyze, work));
	}
	var sorted = times.slice().sort(function (a, b) {
		return a - b;
	});
	process.stdout.write('root: ' + root + '\n' +
		'ids: ' + work.length + ', files: ' + work.reduce(function (sum, item) {
			return sum + pages[item.id].reduce(function (count, files) {
				return count + files.length;
			}, 0);
		}, 0) + '\n' +
		'rounds (ms): ' + times.map(function (time) {
			return time.toFixed(1);
		}).join(', ') + '\n' +
		'median (ms): ' + sorted[Math.floor(ROUNDS / 2)].toFixed(1) + '\n');
	return 0;
}

process.exitCode = main(process.argv.slice(2));
