/*
 * Acceptance tests of splitting the nodes with calls into the segments
 * before and after each call (specs/007-split-call-nodes, KI §16, §22 (3),
 * contracts/acceptance.md). Original dujs code, MIT License (see LICENSE).
 *
 * The probe programs are copied verbatim from
 * specs/007-split-call-nodes/probes to tests/dujs/cases/probes007 (T002); the
 * expected pairs are those of spec.md. This file starts with the shared
 * helpers and the guards that hold in every phase (T018):
 * - FR-006: the pairs of the intra-procedural model of the page of every
 *   probe are the same as specs/007-split-call-nodes/probes/baseline-develop.txt
 *   (the "intra(page)" lines of develop edc22d5);
 * - P23 (IIFE): the whole result is the same as the baseline (not connected,
 *   not split).
 * The scenarios of each user story are added by its phase.
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl');

var PROBES = path.join(__dirname, 'cases', 'probes007'),
	BASELINE = path.join(__dirname, '..', '..', 'specs', '007-split-call-nodes', 'probes', 'baseline-develop.txt'),
	PAGE = '$DOMAIN.$PAGE_0';

/**
 * File names of the probe programs (sorted)
 * @returns {Array}
 */
function probeNames() {
	'use strict';
	return fs.readdirSync(PROBES).filter(function (name) {
		return /\.js$/.test(name);
	}).sort();
}

/**
 * Analyze a probe program
 * @param {string} name File name, with or without the extension .js
 * @returns {Object} result of the analyze helper
 */
function analyzeProbe(name) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, /\.js$/.test(name) ? name : name + '.js'), 'utf8'));
}

/**
 * Models of the page of an analyzed program
 * @param {Object} result
 * @returns {PageModels}
 */
function pageModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree);
}

/**
 * The inter-procedural model whose related scopes are the given ones (in order)
 * @param {Object} result
 * @param {Array} scopeNames
 * @returns {Model}
 */
function interModelOf(result, scopeNames) {
	'use strict';
	var found = null;
	pageModelsOf(result).interProceduralModels.forEach(function (model) {
		if (model.relatedScopes.map(String).join('|') === scopeNames.join('|')) {
			found = model;
		}
	});
	(!!found).should.eql(true, 'no inter-procedural model of ' + scopeNames.join(', '));
	return found;
}

/**
 * Pairs of the inter-procedural model whose related scopes are the given ones
 * @param {Object} result
 * @param {Array} scopeNames
 * @returns {Array}
 */
function interPairsOf(result, scopeNames) {
	'use strict';
	return analyze.pairsOfModel(interModelOf(result, scopeNames));
}

/**
 * Assert the pairs that a list has and has not
 * @param {Array} pairs
 * @param {Array} [present]
 * @param {Array} [absent]
 */
function shouldHavePairs(pairs, present, absent) {
	'use strict';
	(present || []).forEach(function (pair) {
		pairs.should.containEql(pair);
	});
	(absent || []).forEach(function (pair) {
		pairs.should.not.containEql(pair);
	});
}

/**
 * Assert the pairs of the inter-procedural model (when given) and of the
 * intra-page model: the pairs present and absent in both
 * @param {Object} result
 * @param {Array|null} scopeNames Related scopes of the inter-procedural model, null for none
 * @param {Array} [present]
 * @param {Array} [absent]
 */
function shouldHavePairsInModels(result, scopeNames, present, absent) {
	'use strict';
	if (!!scopeNames) {
		shouldHavePairs(interPairsOf(result, scopeNames), present, absent);
	}
	shouldHavePairs(result.intraPage(), present, absent);
}

/**
 * Call edges of the hierarchy of a model and of its units (each model once),
 * depth first: "<caller scope> L<line> -> <callee scope>" ("=>" and " (back)"
 * for a back call edge)
 * @param {Model} model
 * @returns {Array}
 */
function callEdgesOf(model) {
	'use strict';
	var edges = [], visited = [];
	function walk(each) {
		if (!each.hierarchy || visited.indexOf(each) !== -1) {
			return;
		}
		visited.push(each);
		each.hierarchy.edges.forEach(function (edge) {
			if (edge.kind !== 'call') {
				return;
			}
			edges.push(String(edge.caller.scope) + ' L' + edge.callSite.line + (edge.back ? ' => ' : ' -> ') +
				String(edge.callee.scope) + (edge.back ? ' (back)' : ''));
			if (!edge.back) {
				walk(edge.calleeModel);
			}
		});
	}
	walk(model);
	return edges;
}

/**
 * The result of a probe in the format of specs/007-split-call-nodes/probes/run.js
 * @param {string} name File name of the probe
 * @returns {Array} lines
 */
function probeOutput(name) {
	'use strict';
	var lines = [], result;
	try {
		result = analyzeProbe(name);
	} catch (err) {
		return ['ERROR: ' + err.message.split('\n')[0]];
	}
	var pageModels = pageModelsOf(result);
	lines.push('scopes: ' + result.scopeNames().join(', '));
	pageModels.interProceduralModels.forEach(function (model, index) {
		lines.push('inter[' + index + '] (' + model.relatedScopes.map(String).join(', ') + ', nodes ' +
			model.graph[2].length + '): ' + analyze.pairsOfModel(model).join(' | '));
	});
	lines.push('intra(page): ' + result.intraProcedural().join(' | '));
	lines.push('intra-page (nodes ' + pageModels.intraPageModels[0].graph[2].length + '): ' +
		result.intraPage().join(' | '));
	return lines;
}

/**
 * The lines of each probe in the baseline of develop
 * @returns {Object} probe file name -> Array of lines
 */
function baselineBlocks() {
	'use strict';
	var blocks = {}, current = null;
	fs.readFileSync(BASELINE, 'utf8').split('\n').forEach(function (line) {
		var start = /^=== (.+)$/.exec(line);
		if (!!start) {
			current = start[1];
			blocks[current] = [];
		} else if (!!current && line !== '') {
			blocks[current].push(line);
		}
	});
	return blocks;
}

describe('splitting the nodes with calls (feature 007)', function () {
	'use strict';
	var baseline = baselineBlocks();

	after(analyze.reset);

	it('should have a baseline of every probe', function () {
		probeNames().forEach(function (name) {
			baseline.should.have.property(name);
		});
	});

	describe('FR-006: the intra-procedural model of the page is not changed', function () {
		probeNames().forEach(function (name) {
			it('should keep the intra(page) pairs of ' + name, function () {
				var expected = (baseline[name] || []).filter(function (line) {
					return /^intra\(page\): /.test(line);
				});
				expected.length.should.eql(1, 'no intra(page) line of ' + name + ' in the baseline');
				probeOutput(name).filter(function (line) {
					return /^intra\(page\): /.test(line);
				}).should.eql(expected);
			});
		});
	});

	describe('P23: an IIFE is neither connected nor split', function () {
		it('should give the result of develop', function () {
			probeOutput('p23-iife.js').should.eql(baseline['p23-iife.js']);
			var result = analyzeProbe('p23-iife');
			pageModelsOf(result).interProceduralModels.length.should.eql(0);
			shouldHavePairsInModels(result, null, ['x: L1 -> L6'], []);
		});
	});
});

module.exports = {
	PAGE: PAGE,
	analyzeProbe: analyzeProbe,
	interModelOf: interModelOf,
	interPairsOf: interPairsOf,
	shouldHavePairs: shouldHavePairs,
	shouldHavePairsInModels: shouldHavePairsInModels,
	callEdgesOf: callEdgesOf,
	probeOutput: probeOutput
};
