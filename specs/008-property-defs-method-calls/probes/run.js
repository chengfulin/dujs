/*
 * Probe runner (copied from feature 007; feature 008): analyze each probe program with
 * tests/helpers/analyze.js and print the scopes, the inter-procedural models
 * and the def-use pairs of the page intra-procedural, every inter-procedural
 * and the intra-page model. Usage (from the repository root):
 *   node specs/008-property-defs-method-calls/probes/run.js [probe.js ...]
 * Without arguments every p*.js probe of this directory runs.
 * The output is the "current behavior" recorded in research.md.
 */
var fs = require('fs'),
	path = require('path');
var analyze = require('../../../tests/helpers/analyze'),
	scopeCtrl = require('../../../lib/dujs/scopectrl'),
	modelCtrl = require('../../../lib/dujs/modelctrl');

function run(file) {
	'use strict';
	var code = fs.readFileSync(file, 'utf8');
	console.log('=== ' + path.basename(file));
	try {
		var result = analyze(code);
		console.log('scopes: ' + result.scopeNames().join(', '));
		var pageModels = modelCtrl.collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0]);
		pageModels.interProceduralModels.forEach(function (model, index) {
			console.log('inter[' + index + '] (' + model.relatedScopes.map(String).join(', ') + ', nodes ' +
				model.graph[2].length + '): ' + analyze.pairsOfModel(model).join(' | '));
		});
		console.log('intra(page): ' + result.intraProcedural().join(' | '));
		/// feature 008: the intra-procedural pairs of the other scopes (added after the lines above)
		result.scopeNames().slice(1).forEach(function (name) {
			console.log('intra(' + name.split('.').slice(2).join('.') + '): ' + result.intraProcedural(name).join(' | '));
		});
		console.log('intra-page (nodes ' + pageModels.intraPageModels[0].graph[2].length + '): ' +
			result.intraPage().join(' | '));
	} catch (err) {
		console.log('ERROR: ' + err.message.split('\n')[0]);
	}
	analyze.reset();
}

var files = process.argv.slice(2);
if (files.length === 0) {
	files = fs.readdirSync(__dirname).filter(function (name) {
		return /^p.*\.js$/.test(name);
	}).sort().map(function (name) {
		return path.join(__dirname, name);
	});
}
files.forEach(run);
