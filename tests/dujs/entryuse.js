/*
 * Test cases of the entry node of a function (feature 005, User Story 5,
 * FR-008, research R7; contracts/acceptance.md US5-1...3): the entry and exit
 * nodes of a function only stand for entering and leaving it, they do not
 * read the variables of the function body (KI §18); the reads of the body are
 * on the nodes of their own statements and the reads of parameter defaults on
 * the synthesized parameter initialization nodes.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode'),
	analyze = require('../helpers/analyze');

var PROBES005 = path.join(__dirname, 'cases', 'probes005'),
	PROBES004 = path.join(__dirname, 'cases', 'probes004'),
	PAGE = '$DOMAIN.$PAGE_0';

/**
 * Analyze a probe
 * @param {string} directory
 * @param {string} probe file name
 * @returns {Object} the result of the analyze helper
 */
function analyzeProbe(directory, probe) {
	'use strict';
	return analyze(fs.readFileSync(path.join(directory, probe), 'utf8'));
}

/**
 * Pairs of every model of the page analyzed last (intra-procedural,
 * inter-procedural, intra-page and inter-page), each model as an Array
 * @param {Object} result
 * @returns {Array} arrays of pairs
 */
function pairsOfEveryModel(result) {
	'use strict';
	var pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree);
	return [].concat(pageModels.intraProceduralModels, pageModels.interProceduralModels,
		pageModels.intraPageModels, [modelCtrl.interPageModel]).map(analyze.pairsOfModel);
}

/**
 * All pairs of every model of the page analyzed last
 * @param {Object} result
 * @returns {Array}
 */
function allPairsOf(result) {
	'use strict';
	return [].concat.apply([], pairsOfEveryModel(result));
}

/**
 * Intra-procedural model of a scope
 * @param {Object} result
 * @param {string} scopeName
 * @returns {Model}
 */
function intraModelOf(result, scopeName) {
	'use strict';
	var found = null;
	modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
		if (model.mainlyRelatedScope.name === scopeName) {
			found = model;
		}
	});
	(!!found).should.eql(true, 'no intra-procedural model of ' + scopeName);
	return found;
}

/**
 * Names of the variables of a set of Vars
 * @param {Set} variables
 * @returns {Array}
 */
function namesOf(variables) {
	'use strict';
	return (!!variables ? variables.values() : []).map(function (variable) {
		return variable.name;
	});
}

/**
 * Nodes of a model reading a variable (as a c-use or a p-use), as
 * [label, 'c-use' | 'p-use']
 * @param {Model} model
 * @param {string} name
 * @returns {Array}
 */
function readersOf(model, name) {
	'use strict';
	var readers = [];
	model.graph[2].forEach(function (node) {
		if (namesOf(node.cuse).indexOf(name) !== -1) {
			readers.push([analyze.nodeLabel(node), 'c-use']);
		}
		if (namesOf(node.puse).indexOf(name) !== -1) {
			readers.push([analyze.nodeLabel(node), 'p-use']);
		}
	});
	return readers;
}

/**
 * Check that the entry and exit nodes of a model read nothing
 * @param {Model} model
 */
function checkEntryAndExitReadNothing(model) {
	'use strict';
	[model.graph[0], model.graph[1]].forEach(function (node) {
		namesOf(node.cuse).should.eql([], 'c-uses of ' + analyze.nodeLabel(node));
		namesOf(node.puse).should.eql([], 'p-uses of ' + analyze.nodeLabel(node));
	});
}

describe('Entry node of a function (feature 005, US5)', function () {
	'use strict';
	afterEach(function () {
		analyze.reset();
	});

	/// US5-1 (KI §18, P8)
	it('should not read the body of f at its entry node (p8)', function () {
		var result = analyzeProbe(PROBES005, 'p8.js'),
			model = intraModelOf(result, PAGE + '.f');
		model.graph[0].type.should.eql(FlowNode.ENTRY_NODE_TYPE);
		checkEntryAndExitReadNothing(model);
		/// x is read by the case of L2 (the discriminant), o by the loop node of L4
		readersOf(model, 'x').should.eql([['L2', 'p-use']]);
		readersOf(model, 'o').should.eql([['L4', 'c-use']]);
		/// `case a:`, `b;` and `a;` do not read a or b (a case test and an identifier statement are not read)
		['a', 'b'].forEach(function (name) {
			readersOf(model, name).forEach(function (reader) {
				reader[0].should.not.eql('entry');
			});
		});
		/// no pair of any model has the entry node as its use
		allPairsOf(result).forEach(function (pair) {
			pair.should.not.match(/ -> entry/);
		});
	});

	/// US5-2 (P9; analyze Q4: the p-use is on the case node of L7)
	it('should analyze p9 and read x as a p-use at the case of L7', function () {
		var result = analyzeProbe(PROBES005, 'p9.js'),
			pairs;
		pairs = allPairsOf(result);
		pairs.should.containEql('x: L1 -> L7>L8:T');
		pairs.should.containEql('x: L1 -> L7>L10:F');
		pairs.forEach(function (pair) {
			pair.should.not.match(/^x: .* -> entry/);
		});
		checkEntryAndExitReadNothing(intraModelOf(result, PAGE + '.f'));
		checkEntryAndExitReadNothing(intraModelOf(result, PAGE + '.g'));
	});

	/// US5-3 (KI §18, US1 scenario 2 program)
	it('should not pair the definitions of x with the entry node of get (p2)', function () {
		var pairs = allPairsOf(analyzeProbe(PROBES005, 'p2.js'));
		pairs.should.not.containEql('x: L3 -> entry');
		pairs.should.not.containEql('x: L11 -> entry');
	});

	/// US5-3 (004 cyc-3)
	it('should not pair t and p with the entry node of m (004 cyc-3)', function () {
		var pairs = allPairsOf(analyzeProbe(PROBES004, 'cyc-3.js'));
		pairs.should.not.containEql('t: L4 -> entry');
		pairs.should.not.containEql('p: entry -> entry');
	});

	/// the reads of a parameter default stay on the synthesized parameter initialization node
	it('should read a parameter default at the parameter initialization node, not at the entry node', function () {
		var result = analyze([
				'var d = 1;',
				'function f(p = d) {',
				'  return p;',
				'}',
				'f();'
			].join('\n')),
			model = intraModelOf(result, PAGE + '.f');
		checkEntryAndExitReadNothing(model);
		readersOf(model, 'd').should.eql([['L2', 'c-use']]);
		allPairsOf(result).should.containEql('d: L1 -> L2');
		allPairsOf(result).forEach(function (pair) {
			pair.should.not.match(/ -> entry/);
		});
	});
});
