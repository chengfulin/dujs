/*
 * Test cases of the functions in parameter default values and of the
 * destructuring parameters with an outer default value
 * (specs/004-fix-remaining-issues, User Story 4, FR-006, FR-008, research R7,
 * R8, KI §10, §17).
 * Original dujs code, MIT License (see LICENSE).
 *
 * A function or arrow function in a default value (also inside a pattern) is
 * a child scope of the function of the parameter. A pattern parameter with a
 * default value gets a node only evaluating the default (defining nothing),
 * followed by one initialization node per default nested in it, in source
 * pre-order. The expected pairs are those of contracts/acceptance.md "US4"
 * #1, #1', #2, #5, #5' and #6, and data-model §6.
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode');

var PROBES = path.join(__dirname, 'cases', 'probes004'),
	PAGE = '$DOMAIN.$PAGE_0';

/**
 * Analyze a probe program
 * @param {string} name File name without extension
 * @returns {Object} result of the analyze helper
 */
function analyzeProbe(name) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, name + '.js'), 'utf8'));
}

/**
 * Intra-procedural model of a scope of the analyzed page
 * @param {Object} result
 * @param {string} scopeName
 * @returns {Model|null}
 */
function intraModelOf(result, scopeName) {
	'use strict';
	var found = null;
	modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
		if (model.mainlyRelatedScope.name === scopeName) {
			found = model;
		}
	});
	return found;
}

/**
 * Names of the variables defined by a node
 * @param {FlowNode} node
 * @returns {Array}
 */
function definedNames(node) {
	'use strict';
	return node.generate.values().map(function (item) {
		return (!!item.variable ? item.variable : item).name;
	}).sort();
}

/**
 * Nodes of a graph other than the entry defining a variable
 * @param {Array} nodes
 * @param {string} name
 * @returns {Array}
 */
function nodesDefining(nodes, name) {
	'use strict';
	return nodes.filter(function (node) {
		return node.type !== FlowNode.ENTRY_NODE_TYPE && definedNames(node).indexOf(name) !== -1;
	});
}

/**
 * Whether a model has a def-use pair of a variable from a node to a node
 * (compared as objects)
 * @param {Model} model
 * @param {string} name
 * @param {FlowNode} def
 * @param {FlowNode} use
 * @returns {boolean}
 */
function hasPair(model, name, def, use) {
	'use strict';
	var found = false;
	model.dupairs.forEach(function (pairs, variable) {
		if (variable.name === name) {
			pairs.values().forEach(function (dupair) {
				if (dupair.first === def && dupair.second === use) {
					found = true;
				}
			});
		}
	});
	return found;
}

describe('Parameter default values (004 US4)', function () {
	'use strict';
	after(analyze.reset);

	describe('functions in default values (FR-006, KI §10)', function () {
		// US4 #1: the arrow function of the default is a scope and the call g(); is connected to it
		it('US4-1 should make an arrow function in a default value a scope connected by its call', function () {
			var result = analyzeProbe('us4-1b'),
				arrow = PAGE + '.f.$ANONYMOUS_FUN_0';
			result.scopeNames().should.eql([PAGE, PAGE + '.f', arrow]);
			result.intraPage().should.eql(['d: L1 -> L3', 'f: entry -> L6', 'g: L2 -> L4']);
			result.interProceduralScopes().should.eql([
				[PAGE + '.f', arrow],
				[PAGE, PAGE + '.f', arrow]
			]);
		});

		// US4 #1': return g(); is not a call statement, so it is not connected (plan U1 = A)
		it('US4-1prime should make the arrow function a scope without connecting return g()', function () {
			var result = analyzeProbe('us4-1'),
				arrow = PAGE + '.f.$ANONYMOUS_FUN_0';
			result.scopeNames().should.eql([PAGE, PAGE + '.f', arrow]);
			(intraModelOf(result, arrow) !== null).should.eql(true);
			result.intraPage().should.eql(['f: entry -> L6', 'g: L2 -> L4']);
			result.interProceduralScopes().should.eql([[PAGE, PAGE + '.f']]);
		});

		// US4 #2: a function expression in a default inside a pattern is a scope as well
		it('US4-2 should make a function in a default inside a pattern a scope', function () {
			var result = analyzeProbe('us4-2'),
				fn = PAGE + '.f.$ANONYMOUS_FUN_0';
			result.scopeNames().should.eql([PAGE, PAGE + '.f', fn]);
			result.intraPage().should.eql(['f: entry -> L6']);
			result.intraProcedural(fn).should.eql([]);
		});
	});

	describe('patterns with an outer default value (FR-008, KI §17)', function () {
		// US4 #5: the outer default is evaluated once, the inner names are defined once
		it('US4-5 should evaluate the outer default then initialize the nested defaults', function () {
			var result = analyzeProbe('us4-5b');
			result.intraPage().should.eql(['d: L1 -> L3', 'h: entry -> L7', 'x: L3 -> L4']);
			var nodes = intraModelOf(result, PAGE + '.h').graph[2];
			nodes.map(analyze.nodeLabel).should.eql(['entry', 'L5', 'L3', 'L4', 'exit']);
			nodes.slice(1).map(definedNames).should.eql([[], ['x'], ['y'], []]);
			nodesDefining(nodes, 'x').should.have.length(1);
			nodesDefining(nodes, 'y').should.have.length(1);
		});

		// US4 #5': the program of KI §17 on one line, nodes compared as objects
		it('US4-5prime should read x defined by its default in the default of y on one line', function () {
			var result = analyzeProbe('us4-5'),
				model = intraModelOf(result, PAGE + '.h'),
				nodes = model.graph[2];
			nodes.should.have.length(5);
			var xDefs = nodesDefining(nodes, 'x'),
				yDefs = nodesDefining(nodes, 'y');
			xDefs.should.have.length(1);
			yDefs.should.have.length(1);
			hasPair(model, 'x', xDefs[0], yDefs[0]).should.eql(true);
		});

		// US4 #6: without an outer default value nothing changes
		it('US4-6 should keep a pattern without an outer default unchanged', function () {
			var result = analyzeProbe('us4-6b');
			result.intraPage().should.eql(['d: L1 -> L3', 'h: entry -> L7', 'x: L3 -> L4']);
			var nodes = intraModelOf(result, PAGE + '.h').graph[2];
			nodes.map(analyze.nodeLabel).should.eql(['entry', 'L3', 'L4', 'exit']);
			nodes.slice(1).map(definedNames).should.eql([['x'], ['y'], []]);
		});

		// data-model §6: {a: {b = 1} = E} = D gives the nodes D, E, b = 1 (pre-order)
		it('should initialize nested pattern defaults in source pre-order', function () {
			var result = analyze([
				'var D = {}, E = {};',
				'function f({',
				'  a: {',
				'    b = 1',
				'  } = E',
				'} = D) {',
				'  return b;',
				'}',
				'f();'
			].join('\n'));
			var nodes = intraModelOf(result, PAGE + '.f').graph[2];
			nodes.map(analyze.nodeLabel).should.eql(['entry', 'L6', 'L5', 'L4', 'L7', 'exit']);
			nodes.slice(1).map(definedNames).should.eql([[], [], ['b'], [], []]);
			/// a lone identifier as the outer default is still read
			result.intraPage().should.containDeep(['D: L1 -> L6', 'E: L1 -> L5']);
			result.intraProcedural(PAGE + '.f').should.eql(['b: L4 -> L7']);
		});
	});
});
