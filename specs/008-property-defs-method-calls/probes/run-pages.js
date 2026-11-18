/*
 * Two-page probe runner (feature 008, US1 scenario 6): each file of pages/ holds
 * the pages of one program separated by a line "//// page". Prints the pairs of
 * the intra-procedural model of the first page, the number of nodes defining
 * the local storage object in the intra-page model of the first page
 * (hierarchy.definingLocalStorageNodes) and the localStorage pairs of the
 * inter-page model. Usage (from the repository root):
 *   node specs/008-property-defs-method-calls/probes/run-pages.js [file ...]
 */
var fs = require('fs'),
	path = require('path');
var analyze = require('../../../tests/helpers/analyze'),
	scopeCtrl = require('../../../lib/dujs/scopectrl'),
	modelCtrl = require('../../../lib/dujs/modelctrl'),
	hierarchy = require('../../../lib/dujs/hierarchy');

function run(file) {
	'use strict';
	var pages = fs.readFileSync(file, 'utf8').split(/^\/\/\/\/ page\n/m).filter(function (page) {
		return page.length > 0;
	});
	console.log('=== ' + path.basename(file));
	try {
		var result = analyze(pages);
		var pageModels = modelCtrl.collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0]);
		console.log('intra(page 1): ' + result.intraProcedural().join(' | '));
		console.log('storage nodes (page 1): ' + hierarchy.definingLocalStorageNodes(pageModels.intraPageModels[0]).length);
		console.log('inter-page localStorage: ' + analyze.pairsOfModel(modelCtrl.interPageModel).filter(function (pair) {
			return /^localStorage:/.test(pair);
		}).join(' | '));
	} catch (err) {
		console.log('ERROR: ' + err.message.split('\n')[0]);
	}
	analyze.reset();
}

var files = process.argv.slice(2);
if (files.length === 0) {
	var dir = path.join(__dirname, 'pages');
	files = fs.readdirSync(dir).filter(function (name) {
		return /\.js$/.test(name);
	}).sort().map(function (name) {
		return path.join(dir, name);
	});
}
files.forEach(run);
