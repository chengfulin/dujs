/*
 * Test cases of call cycles (specs/004-fix-remaining-issues, User Story 3,
 * FR-015, SC-006, research R5, plan risk 2 and U3).
 * Original dujs code, MIT License (see LICENSE).
 *
 * A call to a scope being called already (in the stack of the search, the
 * caller included) is a back call edge to the intra-procedural model of that
 * scope; a closed model is registered once per scope, an open model only is a
 * unit of the model of its caller. The expected pairs, inter-procedural models
 * and node numbers are those of contracts/acceptance.md "FR-015" and "FR-016"
 * (byp-3).
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl');

var PROBES = path.join(__dirname, 'cases', 'probes004'),
	PAGE = '$DOMAIN.$PAGE_0',
	ANONYMOUS = PAGE + '.$ANONYMOUS_FUN_';

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
 * Models of the analyzed page
 * @param {Object} result
 * @returns {PageModels}
 */
function pageModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree);
}

/**
 * Short name of a scope: P for the page, P.$A<k> for an anonymous function
 * @param {Scope} scope
 * @returns {string}
 */
function shortName(scope) {
	'use strict';
	return String(scope).replace(ANONYMOUS, 'P.$A').replace(PAGE, 'P');
}

/**
 * Summary of an inter-procedural model: short names of its related scopes,
 * the number of nodes of its flat graph and its pairs
 * @param {Model} model
 * @returns {Object}
 */
function summaryOf(model) {
	'use strict';
	return {
		scopes: model.relatedScopes.map(shortName),
		nodes: model.graph[2].length,
		pairs: analyze.pairsOfModel(model)
	};
}

/**
 * Call edges of the hierarchy of a model and of its units (each model once),
 * depth first in the order of the edges: "<caller> L<line> -> <callee>" for a
 * call edge and "<caller> L<line> => <callee> (back)" for a back call edge
 * @param {Model} model
 * @returns {Array}
 */
function callEdgesOf(model) {
	'use strict';
	var edges = [],
		visited = [];
	function walk(each) {
		if (!each.hierarchy || visited.indexOf(each) !== -1) {
			return;
		}
		visited.push(each);
		each.hierarchy.edges.forEach(function (edge) {
			if (edge.kind !== 'call') {
				return;
			}
			edges.push(shortName(edge.caller.scope) + ' L' + edge.callSite.line +
				(edge.back ? ' => ' : ' -> ') + shortName(edge.callee.scope) + (edge.back ? ' (back)' : ''));
			if (!edge.back) {
				walk(edge.calleeModel);
			}
		});
	}
	walk(model);
	return edges;
}

/**
 * Number of call edges of each call-site in the hierarchy of a model and of
 * its units (each model object once); a call-site is an original of a caller
 * or a CALL RETURN NODE template (chained callees)
 * @param {Model} model
 * @returns {Array} the numbers
 */
function callEdgeCountsPerCallSite(model) {
	'use strict';
	var callSites = [],
		counts = [],
		visited = [];
	function walk(each) {
		if (!each.hierarchy || visited.indexOf(each) !== -1) {
			return;
		}
		visited.push(each);
		each.hierarchy.edges.forEach(function (edge) {
			if (edge.kind !== 'call') {
				return;
			}
			var index = callSites.indexOf(edge.callSite);
			if (index === -1) {
				callSites.push(edge.callSite);
				counts.push(1);
			} else {
				counts[index] += 1;
			}
			if (!edge.back) {
				walk(edge.calleeModel);
			}
		});
	}
	walk(model);
	return counts;
}

describe('call cycles (FR-015)', function () {
	'use strict';

	after(analyze.reset);

	/// m calls this.m() in if (c): the model of m has a back call edge at L6;
	/// the exception edge of the assignment c = 0 at L5 goes to the exit of m
	/// and back to the CALL RETURN NODE of L11, so x@L1 reaches L12
	it('cyc-1 should analyze a self recursive method with a back call edge', function () {
		var result = analyzeProbe('cyc-1'),
			models = pageModelsOf(result).interProceduralModels,
			intraPage = [
				'A: L2 -> L11', 'c: L1 -> L4>L5:T', 'c: L1 -> L4>L8:F',
				'c: L5 -> L4>L5:T', 'c: L5 -> L4>L8:F',
				'console: entry -> L12', 'x: L1 -> L12', 'x: L8 -> L12'
			];
		result.intraPage().should.eql(intraPage);
		pageModelsOf(result).intraPageModels[0].graph[2].length.should.eql(16);
		models.length.should.eql(2);
		summaryOf(models[0]).should.eql({
			scopes: ['P.$A0'],
			nodes: 7,
			pairs: ['c: L5 -> L4>L5:T', 'c: L5 -> L4>L8:F']
		});
		callEdgesOf(models[0]).should.eql(['P.$A0 L6 => P.$A0 (back)']);
		summaryOf(models[1]).should.eql({scopes: ['P', 'P.$A0'], nodes: 14, pairs: intraPage});
		callEdgesOf(models[1]).should.eql(['P L11 -> P.$A0', 'P.$A0 L6 => P.$A0 (back)']);
	});

	/// m calls this.n() and n calls this.m() (research R5.3): M, the page model
	/// and N are registered in this order; M has an open unit of n with a back
	/// call edge to m, N an open unit of m with a back call edge to n
	it('cyc-2 should analyze mutually recursive methods with a model per scope', function () {
		var result = analyzeProbe('cyc-2'),
			models = pageModelsOf(result).interProceduralModels,
			methodPairs = ['c: L5 -> L4>L5:T', 'c: L5 -> L4>L8:F'],
			intraPage = [
				'A: L2 -> L15', 'c: L1 -> L4>L5:T', 'c: L1 -> L4>L8:F',
				'c: L5 -> L4>L5:T', 'c: L5 -> L4>L8:F',
				'console: entry -> L16', 'x: L1 -> L16', 'x: L12 -> L16', 'x: L8 -> L16'
			];
		result.intraPage().should.eql(intraPage);
		pageModelsOf(result).intraPageModels[0].graph[2].length.should.eql(21);
		result.interProceduralScopes().should.eql([
			[ANONYMOUS + '0', ANONYMOUS + '1'],
			[PAGE, ANONYMOUS + '0', ANONYMOUS + '1'],
			[ANONYMOUS + '1', ANONYMOUS + '0']
		]);
		summaryOf(models[0]).should.eql({scopes: ['P.$A0', 'P.$A1'], nodes: 12, pairs: methodPairs});
		callEdgesOf(models[0]).should.eql(['P.$A0 L6 -> P.$A1', 'P.$A1 L11 => P.$A0 (back)']);
		summaryOf(models[1]).should.eql({scopes: ['P', 'P.$A0', 'P.$A1'], nodes: 19, pairs: intraPage});
		callEdgesOf(models[1]).should.eql([
			'P L15 -> P.$A0', 'P.$A0 L6 -> P.$A1', 'P.$A1 L11 => P.$A0 (back)'
		]);
		(models[1].hierarchy.edges[0].calleeModel === models[0]).should.eql(true);
		summaryOf(models[2]).should.eql({scopes: ['P.$A1', 'P.$A0'], nodes: 12, pairs: methodPairs});
		callEdgesOf(models[2]).should.eql(['P.$A1 L11 -> P.$A0', 'P.$A0 L6 => P.$A1 (back)']);
	});

	/// m(p) { var t = p; this.m(0); y = t; }: t@L4 reaches L6 through the
	/// bypass of the recursive call (FR-016, SC-006)
	it('cyc-3 should keep t: L4 -> L6 over a recursive call', function () {
		var result = analyzeProbe('cyc-3'),
			models = pageModelsOf(result).interProceduralModels,
			methodPairs = ['p: entry -> L4', 't: L4 -> L6'];
		result.intraPage().should.eql(['A: L2 -> L9'].concat(methodPairs));
		models.length.should.eql(2);
		summaryOf(models[0]).should.eql({scopes: ['P.$A0'], nodes: 6, pairs: methodPairs});
		callEdgesOf(models[0]).should.eql(['P.$A0 L5 => P.$A0 (back)']);
		summaryOf(models[1]).scopes.should.eql(['P', 'P.$A0']);
	});

	/// the constructor of A runs new A() in if (c): a back call edge at L6 to
	/// the constructor (the class relaxation of FR-018 makes the cycle)
	it('ctor-cycle should analyze a constructor calling new A()', function () {
		var result = analyzeProbe('ctor-cycle'),
			models = pageModelsOf(result).interProceduralModels,
			intraPage = [
				'A: L2 -> L11', 'A: L2 -> L6',
				'c: L1 -> L4>L5:T', 'c: L1 -> L4>L8:F',
				'c: L5 -> L4>L5:T', 'c: L5 -> L4>L8:F',
				'console: entry -> L12', 'x: L1 -> L12', 'x: L8 -> L12'
			];
		result.intraPage().should.eql(intraPage);
		pageModelsOf(result).intraPageModels[0].graph[2].length.should.eql(16);
		models.length.should.eql(2);
		summaryOf(models[0]).should.eql({
			scopes: ['P.$A0'],
			nodes: 7,
			pairs: ['c: L5 -> L4>L5:T', 'c: L5 -> L4>L8:F']
		});
		callEdgesOf(models[0]).should.eql(['P.$A0 L6 => P.$A0 (back)']);
		summaryOf(models[1]).should.eql({scopes: ['P', 'P.$A0'], nodes: 14, pairs: intraPage});
	});

	/// m() { this.m(); x = 1; } (research P8): the CALL RETURN NODE of L4 is
	/// reached only from the exit of m, which is reached only from L5 and that
	/// CALL RETURN NODE, so every node after L4 (and after the CALL RETURN NODE
	/// of L8 in the page) is unreachable from the entry (dead code):
	/// console: entry -> L9 and x: L1 -> L9 disappear, while x@L5 of the
	/// unreachable cycle still flows out by the worklist (x: L5 -> L9)
	it('cyc-uncond should analyze an unconditional recursion as dead code', function () {
		var result = analyzeProbe('cyc-uncond'),
			models = pageModelsOf(result).interProceduralModels;
		result.intraPage().should.eql(['A: L2 -> L8', 'x: L5 -> L9']);
		pageModelsOf(result).intraPageModels[0].graph[2].length.should.eql(14);
		models.length.should.eql(2);
		summaryOf(models[0]).should.eql({scopes: ['P.$A0'], nodes: 5, pairs: []});
		callEdgesOf(models[0]).should.eql(['P.$A0 L4 => P.$A0 (back)']);
		summaryOf(models[1]).should.eql({scopes: ['P', 'P.$A0'], nodes: 12, pairs: ['A: L2 -> L8', 'x: L5 -> L9']});
	});

	/// n(p) { var t = 1; this.m(); y = t + p; }: t and p are variables of n
	/// that m cannot see, so they reach L9 through the bypass (FR-016)
	it('byp-3 should keep the variables of the caller over a method call', function () {
		var result = analyzeProbe('byp-3'),
			models = pageModelsOf(result).interProceduralModels;
		result.intraPage().should.eql(['A: L2 -> L12', 'p: entry -> L9', 't: L7 -> L9']);
		summaryOf(models[0]).should.eql({
			scopes: ['P.$A1', 'P.$A0'],
			nodes: 9,
			pairs: ['p: entry -> L9', 't: L7 -> L9']
		});
	});

	/// SC-006: every probe with a call cycle is analyzed without an error
	it('should analyze every probe with a call cycle without an error', function () {
		['cyc-1', 'cyc-2', 'cyc-3', 'ctor-cycle', 'cyc-uncond', 'cyc-handler', 'cyc-handler-nocyc', 'byp-3']
			.forEach(function (name) {
				(function () {
					analyzeProbe(name);
				}).should.not.throw();
				analyze.reset();
			});
	});

	/// plan risk 2: the page calls both m and n of a cycle; n is reused from the
	/// search (built) so each call-site has at most one call edge in a model
	it('should connect each call-site once when the page calls both m and n of a cycle', function () {
		var result = analyze([
				'var x = 0, c = 1;',
				'class A {',
				'  m() {',
				'    if (c) {',
				'      c = 0;',
				'      this.n();',
				'    }',
				'    x = 1;',
				'  }',
				'  n() {',
				'    this.m();',
				'    x = 2;',
				'  }',
				'}',
				'var a = new A();',
				'a.m();',
				'a.n();',
				'console.log(x);'
			].join('\n')),
			models = pageModelsOf(result).interProceduralModels;
		result.interProceduralScopes().should.eql([
			[ANONYMOUS + '0', ANONYMOUS + '1'],
			[PAGE, ANONYMOUS + '0', ANONYMOUS + '1'],
			[ANONYMOUS + '1', ANONYMOUS + '0']
		]);
		models.forEach(function (model) {
			callEdgeCountsPerCallSite(model).forEach(function (count) {
				count.should.eql(1);
			});
		});
		callEdgesOf(models[1]).should.eql([
			'P L16 -> P.$A0', 'P.$A0 L6 -> P.$A1', 'P.$A1 L11 => P.$A0 (back)', 'P L17 -> P.$A1'
		]);
		/// page 8 nodes and 2 CALL RETURN NODEs, m and n once with their 2 CALL RETURN NODEs
		models[1].graph[2].length.should.eql(22);
		result.intraPage().should.eql([
			'A: L2 -> L15', 'a: L15 -> L16', 'a: L15 -> L17',
			'c: L1 -> L4>L5:T', 'c: L1 -> L4>L8:F',
			'c: L5 -> L4>L5:T', 'c: L5 -> L4>L8:F',
			'console: entry -> L18', 'x: L1 -> L18', 'x: L12 -> L18', 'x: L8 -> L18'
		]);
	});

	/// a recursive method called in a loop: the analysis terminates and the
	/// pairs of x go around both the recursion and the loop
	it('should analyze a recursive call in a loop to a fixed point', function () {
		var result = analyze([
				'var x = 0, i = 0;',
				'class A {',
				'  m() {',
				'    if (x < 3) {',
				'      x = x + 1;',
				'      this.m();',
				'    }',
				'  }',
				'}',
				'var a = new A();',
				'while (i < 2) {',
				'  a.m();',
				'  i = i + 1;',
				'}',
				'console.log(x);'
			].join('\n'));
		result.intraPage().should.eql([
			'A: L2 -> L10', 'a: L10 -> L12', 'console: entry -> L15',
			'i: L1 -> L11>L12:T', 'i: L1 -> L11>L15:F', 'i: L1 -> L13',
			'i: L13 -> L11>L12:T', 'i: L13 -> L11>L15:F', 'i: L13 -> L13',
			'x: L1 -> L15', 'x: L1 -> L4>L5:T', 'x: L1 -> L4>exit:F', 'x: L1 -> L5',
			'x: L5 -> L15', 'x: L5 -> L4>L5:T', 'x: L5 -> L4>exit:F', 'x: L5 -> L5'
		]);
		summaryOf(pageModelsOf(result).interProceduralModels[0]).should.eql({
			scopes: ['P.$A0'],
			nodes: 6,
			pairs: ['x: L5 -> L4>L5:T', 'x: L5 -> L4>exit:F', 'x: L5 -> L5']
		});
	});
});

describe('event handlers registered in a call cycle (FR-015, plan U3)', function () {
	'use strict';

	after(analyze.reset);

	/// whether the onEvent targets of the LOOP NODE of the intra-page model
	/// include the entry of the handler h
	function loopReachesHandler(result) {
		var graph = pageModelsOf(result).intraPageModels[0].graph;
		return graph[2].some(function (node) {
			return node.type === 'loop' && node.onEvent.some(function (target) {
				return target.type === 'entry' && String(target.scope) === PAGE + '.h';
			});
		});
	}

	/// n registers h and calls this.m(): the handler lookup takes the page
	/// model first (U3 (a)), although N is registered after it
	it('cyc-handler should connect the handler h registered in n', function () {
		var result = analyzeProbe('cyc-handler'),
			models = pageModelsOf(result).interProceduralModels,
			methodPairs = ['c: L8 -> L7>L11:F', 'c: L8 -> L7>L8:T'],
			intraPage = [
				'A: L5 -> L19', 'c: L1 -> L7>L11:F', 'c: L1 -> L7>L8:T',
				'c: L8 -> L7>L11:F', 'c: L8 -> L7>L8:T',
				'document: entry -> L14', 'h: entry -> L14'
			];
		result.intraPage().should.eql(intraPage);
		pageModelsOf(result).intraPageModels[0].graph[2].length.should.eql(24);
		loopReachesHandler(result).should.eql(true);
		result.interProceduralScopes().should.eql([
			[ANONYMOUS + '0', ANONYMOUS + '1'],
			[PAGE, ANONYMOUS + '0', ANONYMOUS + '1'],
			[ANONYMOUS + '1', ANONYMOUS + '0']
		]);
		summaryOf(models[0]).should.eql({scopes: ['P.$A0', 'P.$A1'], nodes: 13, pairs: methodPairs});
		summaryOf(models[1]).should.eql({scopes: ['P', 'P.$A0', 'P.$A1'], nodes: 19, pairs: intraPage});
		summaryOf(models[2]).should.eql({scopes: ['P.$A1', 'P.$A0'], nodes: 13, pairs: methodPairs});
	});

	/// the same program without the call this.m() in n (no cycle)
	it('cyc-handler-nocyc should connect the handler h as well', function () {
		var result = analyzeProbe('cyc-handler-nocyc'),
			models = pageModelsOf(result).interProceduralModels,
			intraPage = [
				'A: L5 -> L19', 'c: L1 -> L7>L11:F', 'c: L1 -> L7>L8:T',
				'document: entry -> L14', 'h: entry -> L14'
			];
		result.intraPage().should.eql(intraPage);
		pageModelsOf(result).intraPageModels[0].graph[2].length.should.eql(23);
		loopReachesHandler(result).should.eql(true);
		result.interProceduralScopes().should.eql([
			[ANONYMOUS + '0', ANONYMOUS + '1'],
			[PAGE, ANONYMOUS + '0', ANONYMOUS + '1']
		]);
		summaryOf(models[0]).should.eql({scopes: ['P.$A0', 'P.$A1'], nodes: 12, pairs: []});
		summaryOf(models[1]).should.eql({scopes: ['P', 'P.$A0', 'P.$A1'], nodes: 18, pairs: intraPage});
	});
});
