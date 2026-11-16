/*
 * Test cases of the DOT representation of the hierarchies of upper models
 * (lib/dujs/hierarchydot.js, specs/003-hierarchical-models
 * contracts/hierarchy-output.md §2, spec US2).
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var path = require('path');
var analyze = require('../helpers/analyze'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	hierarchy = require('../../lib/dujs/hierarchy'),
	hierarchyDot = require('../../lib/dujs/hierarchydot'),
	sourceReader = require('../../lib/dujs/sourcereader');

/**
 * Models of the analyzed pages
 * @param {number} [pageIndex]
 * @returns {Object} PageModels
 */
function pageModelsOf(pageIndex) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(scopeCtrl.pageScopeTrees[pageIndex || 0]);
}

/**
 * Inter-procedural model of a page whose main unit is of the named scope
 * @param {string} scopeName
 * @param {number} [pageIndex]
 * @returns {Model}
 */
function interProceduralModelOf(scopeName, pageIndex) {
	'use strict';
	return pageModelsOf(pageIndex).interProceduralModels.filter(function (model) {
		return String(model.hierarchy.main.scope) === scopeName;
	})[0];
}

/**
 * Lines of a DOT representation
 * @param {string} dot
 * @returns {Array}
 */
function linesOf(dot) {
	'use strict';
	return dot.split('\n');
}

/**
 * Node lines (h<n> [label=...]) of a DOT representation
 * @param {string} dot
 * @returns {Array}
 */
function nodeLinesOf(dot) {
	'use strict';
	return linesOf(dot).filter(function (line) {
		return /^h\d+ \[/.test(line);
	});
}

/**
 * Edge lines (h<a> -> h<b> [...]) of a DOT representation
 * @param {string} dot
 * @returns {Array}
 */
function edgeLinesOf(dot) {
	'use strict';
	return linesOf(dot).filter(function (line) {
		return / -> /.test(line);
	});
}

/// pages of the golden fixtures, read as the CLI reads them
function goldenPages(fixtures) {
	'use strict';
	return fixtures.map(function (files) {
		return sourceReader.getSourceFromFiles(files.map(function (file) {
			return path.join(__dirname, '..', 'golden', 'fixtures', file);
		}));
	});
}

var CALL = 'color="blue", label="call"',
	RETURN = 'color="blue", style="dashed", label="return"',
	ON_EVENT = 'color="green", label="onEvent"',
	LOAD = 'style="dotted", label="loadStorage"',
	SAVE = 'style="dotted", label="saveStorage"',
	LOOP_NODE = 'h1 [label="loop", shape="ellipse", style="filled", fillcolor="yellow"]',
	DOMAIN_NODE = 'h0 [label="$DOMAIN", shape="doublecircle", style="filled", fillcolor="orange"]';

describe('hierarchydot', function () {
	'use strict';
	after(analyze.reset);

	describe('convertHierarchyToDot', function () {
		it('should throw an Error for a model without a hierarchy', function () {
			analyze('var a = 1;');
			(function () {
				hierarchyDot.convertHierarchyToDot(pageModelsOf().intraProceduralModels[0]);
			}).should.throw('The model has no hierarchy');
		});

		it('should write the header and end with } without a newline', function () {
			analyze('var a = 1;');
			var dot = hierarchyDot.convertHierarchyToDot(pageModelsOf().intraPageModels[0]),
				lines = linesOf(dot);
			lines.slice(0, 3).should.eql([
				'digraph Hierarchy {',
				'node [shape="box"]',
				'label = "intra-page: $DOMAIN.$PAGE_0"'
			]);
			lines[lines.length - 1].should.eql('}');
			dot.charAt(dot.length - 1).should.eql('}');
		});
	});

	// spec US2 scenario 1: main -> f -> g
	describe('inter-procedural', function () {
		var dot;

		before(function () {
			analyze([
				'var x = 0;',
				'function f() {',
				'  function g() {',
				'    x = 1;',
				'  }',
				'  g();',
				'}',
				'f();'
			].join('\n'));
			dot = hierarchyDot.convertHierarchyToDot(interProceduralModelOf('$DOMAIN.$PAGE_0'));
		});

		it('should label the graph with the level and the main scope', function () {
			linesOf(dot)[2].should.eql('label = "inter-procedural: $DOMAIN.$PAGE_0"');
		});

		it('should have one node per unit, numbered by first appearance', function () {
			nodeLinesOf(dot).should.eql([
				'h0 [label="$DOMAIN.$PAGE_0"]',
				'h1 [label="$DOMAIN.$PAGE_0.f"]',
				'h2 [label="$DOMAIN.$PAGE_0.f.g"]'
			]);
		});

		it('should have the call and return edges depth first', function () {
			edgeLinesOf(dot).should.eql([
				'h0 -> h1 [' + CALL + ']',
				'h1 -> h2 [' + CALL + ']',
				'h2 -> h1 [' + RETURN + ']',
				'h1 -> h0 [' + RETURN + ']'
			]);
		});

		it('should not draw the CALL, CALL RETURN or LOOP RETURN nodes', function () {
			dot.should.not.match(/call_|callReturn|loopReturn|entry|exit/);
		});

		it('should have one edge of a kind for the same pair of units', function () {
			analyze(['function f() {', '}', 'f();', 'f();', 'f();'].join('\n'));
			var calls = hierarchyDot.convertHierarchyToDot(interProceduralModelOf('$DOMAIN.$PAGE_0'));
			interProceduralModelOf('$DOMAIN.$PAGE_0').hierarchy.edges.length.should.eql(3);
			nodeLinesOf(calls).should.have.length(2);
			edgeLinesOf(calls).should.eql(['h0 -> h1 [' + CALL + ']', 'h1 -> h0 [' + RETURN + ']']);
		});
	});

	// spec US2 scenario 2: two handlers on the LOOP; the functions they call are not drawn
	describe('intra-page', function () {
		var dot;

		before(function () {
			analyze([
				'var x = 0;',
				'function onA() {',
				'  function k() {',
				'    x = 1;',
				'  }',
				'  k();',
				'}',
				'function onB() {',
				'  x = 2;',
				'}',
				'window.addEventListener(\'click\', onA);',
				'window.addEventListener(\'load\', onB);',
				'window.addEventListener(\'focus\', onA);'
			].join('\n'));
			dot = hierarchyDot.convertHierarchyToDot(pageModelsOf().intraPageModels[0]);
		});

		it('should have the main unit, the loop and the handlers by first appearance', function () {
			nodeLinesOf(dot).should.eql([
				'h0 [label="$DOMAIN.$PAGE_0"]',
				LOOP_NODE,
				'h2 [label="$DOMAIN.$PAGE_0.onA"]',
				'h3 [label="$DOMAIN.$PAGE_0.onB"]'
			]);
		});

		it('should enter the loop, then have the onEvent and return edges of each handler once', function () {
			edgeLinesOf(dot).should.eql([
				'h0 -> h1 [label="loop"]',
				'h1 -> h2 [' + ON_EVENT + ']',
				'h2 -> h1 [' + RETURN + ']',
				'h1 -> h3 [' + ON_EVENT + ']',
				'h3 -> h1 [' + RETURN + ']'
			]);
		});

		it('should draw a handler listed more than once once', function () {
			var page = pageModelsOf().intraPageModels[0].hierarchy,
				handlers = page.units.filter(function (unit) {
					return unit.kind === 'handler';
				}).map(function (unit) {
					return unit.model;
				});
			var model = hierarchy.createIntraPageModel(page.main.model, [handlers[0], handlers[1], handlers[0]]);
			model.hierarchy.edges.filter(function (edge) {
				return edge.kind === 'event';
			}).length.should.eql(3);
			var duplicated = hierarchyDot.convertHierarchyToDot(model);
			nodeLinesOf(duplicated).should.eql(nodeLinesOf(dot));
			edgeLinesOf(duplicated).should.eql(edgeLinesOf(dot));
		});

		it('should not draw the functions called by a handler', function () {
			dot.should.not.containEql('onA.k');
		});

		// Edge Case: a page without handlers still has the main unit and the loop
		it('should have the main unit and the loop for a page without handlers', function () {
			analyze('var a = 1;');
			var plain = hierarchyDot.convertHierarchyToDot(pageModelsOf().intraPageModels[0]);
			nodeLinesOf(plain).should.eql(['h0 [label="$DOMAIN.$PAGE_0"]', LOOP_NODE]);
			edgeLinesOf(plain).should.eql(['h0 -> h1 [label="loop"]']);
		});
	});

	// spec US2 scenario 3: a domain node and a node per page; one save edge per page
	describe('inter-page', function () {
		it('should have the domain, the pages, the load edges and one save edge per saving page', function () {
			analyze([
				['localStorage.a = 1;', 'localStorage.b = 2;'].join('\n'),
				'var c = localStorage.a;'
			]);
			var dot = hierarchyDot.convertHierarchyToDot(modelCtrl.interPageModel);
			linesOf(dot)[2].should.eql('label = "inter-page"');
			nodeLinesOf(dot).should.eql([DOMAIN_NODE, 'h1 [label="page0"]', 'h2 [label="page1"]']);
			edgeLinesOf(dot).should.eql([
				'h0 -> h1 [' + LOAD + ']',
				'h1 -> h0 [' + SAVE + ']',
				'h0 -> h2 [' + LOAD + ']'
			]);
		});

		// Edge Case: a page without storage still has its node and load edge
		it('should have the load edge of a page without storage', function () {
			analyze('var a = 1;');
			var dot = hierarchyDot.convertHierarchyToDot(modelCtrl.interPageModel);
			nodeLinesOf(dot).should.eql([DOMAIN_NODE, 'h1 [label="page0"]']);
			edgeLinesOf(dot).should.eql(['h0 -> h1 [' + LOAD + ']']);
		});
	});

	// contracts/hierarchy-output.md §2.3: the inter-procedural golden fixture
	describe('inter-procedural golden fixture', function () {
		before(function () {
			analyze.reset();
			analyze.buildModels(goldenPages([['interprocedural/app.js']]));
		});

		it('should have addTo -> addTo.scale in model 0', function () {
			var dot = hierarchyDot.convertHierarchyToDot(pageModelsOf().interProceduralModels[0]);
			nodeLinesOf(dot).should.eql(['h0 [label="$DOMAIN.$PAGE_0.addTo"]', 'h1 [label="$DOMAIN.$PAGE_0.addTo.scale"]']);
			edgeLinesOf(dot).should.eql(['h0 -> h1 [' + CALL + ']', 'h1 -> h0 [' + RETURN + ']']);
		});

		it('should have 4 nodes and 6 edges in model 1', function () {
			var dot = hierarchyDot.convertHierarchyToDot(pageModelsOf().interProceduralModels[1]);
			nodeLinesOf(dot).should.eql([
				'h0 [label="$DOMAIN.$PAGE_0"]',
				'h1 [label="$DOMAIN.$PAGE_0.addTo"]',
				'h2 [label="$DOMAIN.$PAGE_0.addTo.scale"]',
				'h3 [label="$DOMAIN.$PAGE_0.isReady"]'
			]);
			edgeLinesOf(dot).should.eql([
				'h0 -> h1 [' + CALL + ']',
				'h1 -> h2 [' + CALL + ']',
				'h2 -> h1 [' + RETURN + ']',
				'h1 -> h0 [' + RETURN + ']',
				'h0 -> h3 [' + CALL + ']',
				'h3 -> h0 [' + RETURN + ']'
			]);
		});

		it('should have onClick -> onClick.log in model 2', function () {
			var dot = hierarchyDot.convertHierarchyToDot(pageModelsOf().interProceduralModels[2]);
			nodeLinesOf(dot).should.eql(['h0 [label="$DOMAIN.$PAGE_0.onClick"]', 'h1 [label="$DOMAIN.$PAGE_0.onClick.log"]']);
			edgeLinesOf(dot).should.eql(['h0 -> h1 [' + CALL + ']', 'h1 -> h0 [' + RETURN + ']']);
		});

		it('should have the main unit, the loop, onClick and onLoad in the intra-page model', function () {
			var dot = hierarchyDot.convertHierarchyToDot(pageModelsOf().intraPageModels[0]);
			nodeLinesOf(dot).should.eql([
				'h0 [label="$DOMAIN.$PAGE_0"]',
				LOOP_NODE,
				'h2 [label="$DOMAIN.$PAGE_0.onClick"]',
				'h3 [label="$DOMAIN.$PAGE_0.onLoad"]'
			]);
			dot.should.not.match(/addTo|scale|isReady|log"/);
		});

		it('should have the domain, page0 and one load and one save edge in the inter-page model', function () {
			var dot = hierarchyDot.convertHierarchyToDot(modelCtrl.interPageModel);
			nodeLinesOf(dot).should.eql([DOMAIN_NODE, 'h1 [label="page0"]']);
			edgeLinesOf(dot).should.eql(['h0 -> h1 [' + LOAD + ']', 'h1 -> h0 [' + SAVE + ']']);
		});
	});
});
