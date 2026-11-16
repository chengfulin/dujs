/*
 * Test cases for splitting conditional expressions and short-circuit
 * operators into decision and leaf nodes
 * (specs/001-fix-known-issues, User Story 5 and scenario 8 of User Story 2,
 * FR-005, FR-008 ~ FR-010, FR-014)
 *
 * The expected pairs follow the scenarios of the spec; labels follow
 * contracts/analyze-helper-notation.md. Each analyzed program keeps one node
 * source per line (known limitation of the helper).
 */
require('should');
var analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	jsParser = require('../../lib/dujs/jsparser'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder'),
	FlowNode = require('../../lib/esgraph/flownode'),
	pathOf = require('../../lib/esgraph/branchlabel').pathOf;

var PAGE = '$DOMAIN.$PAGE_0',
	ANONYMOUS = PAGE + '.$ANONYMOUS_FUN_';

/// every program analyzed in this file (one node source per line), checked by US5-7
var CODE = {};

function program(name, lines) {
	'use strict';
	CODE[name] = lines.join('\n');
}

program('US5-1', [
	'var a = 1, b = 2;',
	'var c = a ? b : 3;',
	'console.log(c);'
]);
program('US5-2', [
	'var a = 1, b = 2;',
	'var c = a ? (b ? 1 : 2) : 3;',
	'console.log(c);'
]);
program('US5-3 &&', [
	'var a = 1, b = 2;',
	'var c = a && b;',
	'console.log(c);'
]);
program('US5-3 ||', [
	'var a = 1, b = 2;',
	'var c = a || b;',
	'console.log(c);'
]);
program('US5-3 ??', [
	'var a = 1, b = 2;',
	'var c = a ?? b;',
	'console.log(c);'
]);
program('US5-4', [
	'var a = 1, b = 2;',
	'if (a && b) {',
	'  b = 3;',
	'}'
]);
program('US5-5 if', [
	'var a = 1, b;',
	'if (a) {',
	'  b = 3;',
	'}',
	'console.log(b);'
]);
program('US5-5 while', [
	'var a = 1;',
	'while (a) {',
	'  a = 0;',
	'}',
	'console.log(a);'
]);
program('US5-6 ||=', [
	'var a = 0, b = 1;',
	'a ||= b;',
	'console.log(a);'
]);
program('US5-6 &&=', [
	'var a = 0, b = 1;',
	'a &&= b;',
	'console.log(a);'
]);
program('US5-6 ??=', [
	'var a = null, b = 1;',
	'a ??= b;',
	'console.log(a);'
]);
program('US5-8', [
	'var a = 1, b = 2, c = 1, y = 0;',
	'var x = y + (c ? a : b);',
	'console.log(x);'
]);
program('US5-9', [
	'var a = 1, b = 0;',
	'var x = (a ? 1 : 2) + (b ? 3 : 4);',
	'console.log(x);'
]);
program('US5-10', [
	'var c = 1, a = 1, b = 2;',
	'log(c ? a : b);',
	'function log(v) { return v; }'
]);
program('US5-10b', [
	'var c = 1, a = 1, b = 2;',
	'var x = log(c ? a : b);',
	'console.log(x);',
	'function log(v) { return v; }'
]);
program('US5-11', [
	'var c = 1, a = 1;',
	'var x = (c ? 1 : 2) + run(function () { return a; });'
]);
program('US5-12', [
	'function f(c, a, b) {',
	'  return c ? a : b;',
	'}',
	'f(1, 2, 3);'
]);
program('US5-13', [
	'var c = 1, a = 1, b = 2;',
	'switch (c ? a : b) {',
	'  case 1:',
	'    console.log(a);',
	'}'
]);
program('US2-8', [
	'var a = 0, d = 1;',
	'function k(b = a || d) {',
	'  return b;',
	'}',
	'k();'
]);
program('US5-14', [
	'var a = 0, b = 0;',
	'a ||= b ||= 1;',
	'console.log(a, b);'
]);
program('US5-15', [
	'var a = 0, b = 1;',
	'function f() {',
	'  return a || b;',
	'}',
	'f();'
]);
program('US5-16', [
	'var c = 1, xs = [1], ys = [2], t = 0;',
	'for (var x of (c ? xs : ys)) {',
	'  t = x;',
	'}',
	'console.log(t);'
]);
program('for-of ??', [
	'var saved = null, t = 0;',
	'for (var x of (saved ?? [])) {',
	'  t = x;',
	'}',
	'console.log(t);'
]);
program('while ||', [
	'var a = 1, b = 0;',
	'while (a || b) {',
	'  a = 0;',
	'}',
	'console.log(a);'
]);
program('if ?:', [
	'var a = 1, b = 1, c = 0, y = 0;',
	'if (a ? b : c) {',
	'  y = 2;',
	'}',
	'console.log(y);'
]);
program('a?.b', [
	'var a = {b: 1};',
	'var x = a?.b;',
	'console.log(x);'
]);
/// characterization of the branch labels and flags (specs/002-small-refactors, User Story 2)
program('call leaf', [
	'var c = 1, a = 1, b = 2;',
	'c ? f(a) : g(b);',
	'console.log(c);',
	'function f(v) { return v; }',
	'function g(v) { return v; }'
]);
program('call before decision', [
	'var c = 1, a = 1, b = 2, d = 3, x = 0;',
	'x = c ? (f() ? a : b) : d;',
	'console.log(x);',
	'function f() { return a; }'
]);
program('assignment ?:', [
	'var c = 1, a = 1, b = 2, x = 0;',
	'x = c ? a : b;',
	'console.log(x);'
]);
program('with ?:', [
	'var c = 1, o = {}, p = {}, y = 0;',
	'with (c ? o : p) {',
	'  y = 1;',
	'}'
]);
program('switch ?: two cases', [
	'var c = 1, a = 1, b = 2;',
	'switch (c ? a : b) {',
	'  case 1:',
	'    a = 2;',
	'  case 2:',
	'    b = 3;',
	'}'
]);

function pairsOf(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

function pageModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree);
}

/**
 * Graph [entry, exit, nodes] of the intra-procedural model of a scope
 */
function intraProceduralGraphOf(result, scopeName) {
	'use strict';
	var found = null;
	pageModelsOf(result).intraProceduralModels.forEach(function (model) {
		if (model.mainlyRelatedScope.name === scopeName) {
			found = model;
		}
	});
	(!!found).should.eql(true, 'no intra-procedural model of ' + scopeName);
	return found.graph;
}

/**
 * Build the CFG of the code and return it as [entry, exit, nodes]
 */
function cfgOf(code) {
	'use strict';
	cfgBuilder.resetGraphNodeCounter();
	return cfgBuilder.getCFG(jsParser.parseAST(code));
}

function nodesAt(nodes, line, path) {
	'use strict';
	return nodes.filter(function (node) {
		return node.line === line && pathOf(node) === path &&
			node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE;
	});
}

function theNodeAt(nodes, line, path) {
	'use strict';
	var found = nodesAt(nodes, line, path);
	found.length.should.eql(1, 'number of nodes at L' + line + (path ? ':' + path : ''));
	return found[0];
}

function isDecision(node) {
	'use strict';
	return !!node.true || !!node.false;
}

/**
 * A leaf whose only normal successor is the given node
 */
function shouldFlowOnlyTo(leaf, successor) {
	'use strict';
	isDecision(leaf).should.eql(false);
	(leaf.normal === successor).should.eql(true, 'normal successor of L' + leaf.line + ':' + pathOf(leaf));
}

function shouldNotContainAny(pairs, unexpected) {
	'use strict';
	unexpected.forEach(function (pair) {
		pairs.should.not.containEql(pair);
	});
}

describe('Splitting conditional and short-circuit expressions', function () {
	'use strict';
	after(analyze.reset);

	// US5-1: KI §6, the conditional expression of a declaration
	it('US5-1 should split a conditional expression into a decision and two leaves', function () {
		var pairs = analyze(CODE['US5-1']).intraProcedural();
		pairs.should.containDeep([
			'a: L1 -> L2>L2:T',
			'a: L1 -> L2>L2:F',
			'b: L1 -> L2:T',
			'c: L2:T -> L3',
			'c: L2:F -> L3'
		]);
		shouldNotContainAny(pairs, ['b: L1 -> L2:F', 'c: L2 -> L3']);
	});

	// US5-2: a nested conditional expression in the true branch
	it('US5-2 should split a nested conditional expression in a branch', function () {
		var pairs = analyze(CODE['US5-2']).intraProcedural();
		pairs.should.containDeep([
			'a: L1 -> L2>L2:T',
			'a: L1 -> L2>L2:F',
			'b: L1 -> L2:T>L2:TT',
			'b: L1 -> L2:T>L2:TF',
			'c: L2:TT -> L3',
			'c: L2:TF -> L3',
			'c: L2:F -> L3'
		]);
	});

	describe('US5-3 short-circuit operators', function () {
		// US5-3 (&&): if (a) { c = b; } else { c = the value of a; }
		it('US5-3 should split && with the right operand in the true leaf', function () {
			var pairs = analyze(CODE['US5-3 &&']).intraProcedural();
			pairs.should.containDeep([
				'a: L1 -> L2>L2:T',
				'a: L1 -> L2>L2:F',
				'b: L1 -> L2:T',
				'c: L2:T -> L3',
				'c: L2:F -> L3'
			]);
			shouldNotContainAny(pairs, ['a: L1 -> L2:F', 'a: L1 -> L2:T', 'b: L1 -> L2:F']);
		});

		// US5-3 (||): the use of b moves to the false leaf
		it('US5-3 should split || with the right operand in the false leaf', function () {
			var pairs = analyze(CODE['US5-3 ||']).intraProcedural();
			pairs.should.containDeep([
				'a: L1 -> L2>L2:T',
				'a: L1 -> L2>L2:F',
				'b: L1 -> L2:F',
				'c: L2:T -> L3',
				'c: L2:F -> L3'
			]);
			shouldNotContainAny(pairs, ['a: L1 -> L2:T', 'a: L1 -> L2:F', 'b: L1 -> L2:T']);
		});

		// US5-3 (??): true when a is not null/undefined, b is used in the false leaf
		it('US5-3 should split ?? with the right operand in the false leaf', function () {
			var pairs = analyze(CODE['US5-3 ??']).intraProcedural();
			pairs.should.containDeep([
				'a: L1 -> L2>L2:T',
				'a: L1 -> L2>L2:F',
				'b: L1 -> L2:F',
				'c: L2:T -> L3',
				'c: L2:F -> L3'
			]);
			shouldNotContainAny(pairs, ['a: L1 -> L2:T', 'a: L1 -> L2:F', 'b: L1 -> L2:T']);
		});
	});

	// US5-4: short-circuit in an if condition, the body is not copied
	it('US5-4 should split && in an if condition without copying the body', function () {
		var code = CODE['US5-4'];
		var pairs = analyze(code).intraProcedural();
		pairs.should.containDeep([
			'a: L1 -> L2>L2:T',
			'a: L1 -> L2>exit:F',
			'b: L1 -> L2:T>L3:T',
			'b: L1 -> L2:T>exit:F'
		]);
		/// p-uses, not c-uses
		shouldNotContainAny(pairs, ['a: L1 -> L2', 'b: L1 -> L2', 'b: L1 -> L2:T']);
		nodesAt(cfgOf(code)[2], 3, '').length.should.eql(1);
	});

	// US5-5: a single identifier condition is a p-use (FR-009)
	describe('US5-5 single identifier conditions', function () {
		it('US5-5 should record a p-use for if (a)', function () {
			analyze(CODE['US5-5 if']).intraProcedural().should.containDeep(['a: L1 -> L2>L3:T', 'a: L1 -> L2>L5:F']);
		});

		it('US5-5 should record a p-use for while (a)', function () {
			analyze(CODE['US5-5 while']).intraProcedural().should.containDeep(['a: L1 -> L2>L3:T', 'a: L1 -> L2>L5:F']);
		});
	});

	describe('US5-6 logical assignments', function () {
		// US5-6 (||=): if (a) {} else { a = b; }
		it('US5-6 should split ||= with the assignment in the false leaf', function () {
			var pairs = analyze(CODE['US5-6 ||=']).intraProcedural();
			pairs.should.containDeep([
				'a: L1 -> L2>L3:T',
				'a: L1 -> L2>L2:F',
				'b: L1 -> L2:F',
				'a: L1 -> L3',
				'a: L2:F -> L3'
			]);
			shouldNotContainAny(pairs, ['a: L2 -> L3', 'a: L1 -> L2:F', 'b: L1 -> L2']);
		});

		// US5-6 (&&=): if (a) { a = b; } else {}
		it('US5-6 should split &&= with the assignment in the true leaf', function () {
			var pairs = analyze(CODE['US5-6 &&=']).intraProcedural();
			pairs.should.containDeep([
				'a: L1 -> L2>L2:T',
				'a: L1 -> L2>L3:F',
				'b: L1 -> L2:T',
				'a: L1 -> L3',
				'a: L2:T -> L3'
			]);
			shouldNotContainAny(pairs, ['a: L2 -> L3', 'a: L1 -> L2:T', 'b: L1 -> L2']);
		});

		// US5-6 (??=): same as ||= with "a is not null/undefined" as true
		it('US5-6 should split ??= with the assignment in the false leaf', function () {
			var pairs = analyze(CODE['US5-6 ??=']).intraProcedural();
			pairs.should.containDeep([
				'a: L1 -> L2>L3:T',
				'a: L1 -> L2>L2:F',
				'b: L1 -> L2:F',
				'a: L1 -> L3',
				'a: L2:F -> L3'
			]);
			shouldNotContainAny(pairs, ['a: L2 -> L3', 'a: L1 -> L2:F', 'b: L1 -> L2']);
		});
	});

	// US5-8: the part evaluated before the condition stays at the decision
	it('US5-8 should keep the part evaluated before the condition at the decision', function () {
		var pairs = analyze(CODE['US5-8']).intraProcedural();
		/// y is a root identifier of preEvaluated: it must be a c-use of the decision
		pairs.should.containDeep([
			'y: L1 -> L2',
			'c: L1 -> L2>L2:T',
			'c: L1 -> L2>L2:F',
			'a: L1 -> L2:T',
			'b: L1 -> L2:F',
			'x: L2:T -> L3',
			'x: L2:F -> L3'
		]);
		shouldNotContainAny(pairs, ['y: L1 -> L2:T', 'y: L1 -> L2:F', 'x: L2 -> L3']);
	});

	// US5-9: parallel conditions are multiplied
	it('US5-9 should copy the decision of a parallel condition into each branch', function () {
		var pairs = analyze(CODE['US5-9']).intraProcedural();
		pairs.should.containDeep([
			'b: L1 -> L2:T>L2:TT',
			'b: L1 -> L2:T>L2:TF',
			'b: L1 -> L2:F>L2:FT',
			'b: L1 -> L2:F>L2:FF',
			'x: L2:TT -> L3',
			'x: L2:TF -> L3',
			'x: L2:FT -> L3',
			'x: L2:FF -> L3'
		]);
	});

	// US5-10: call sites are copied with the leaves and connected to the same callee
	it('US5-10 should connect the call sites of both leaves to the same callee', function () {
		var result = analyze(CODE['US5-10']);
		result.intraProcedural().should.containDeep(['a: L1 -> L2:T', 'b: L1 -> L2:F']);

		var logEntry = intraProceduralGraphOf(result, PAGE + '.log')[0],
			models = pageModelsOf(result).interProceduralModels.filter(function (model) {
				return model.graph[2].some(function (node) {
					return node.type === FlowNode.CALL_NODE_TYPE && node.line === 2;
				});
			});
		models.length.should.eql(1);
		var nodes = models[0].graph[2];
		var calls = nodes.filter(function (node) {
			return node.type === FlowNode.CALL_NODE_TYPE && node.line === 2;
		});
		calls.map(function (node) {
			return pathOf(node);
		}).sort().should.eql(['F', 'T']);
		calls.forEach(function (node) {
			(node.call === logEntry).should.eql(true, 'L2:' + pathOf(node) + ' calls the entry of log');
		});
		/// FlowNode attribute, not the label: labelWithLoc of CALL_RETURN does not show the path
		nodes.filter(function (node) {
			return node.type === FlowNode.CALL_RETURN_NODE_TYPE && node.line === 2;
		}).map(function (node) {
			return pathOf(node);
		}).sort().should.eql(['F', 'T']);
	});

	// US5-10b: the call of a declaration is not a call site (README limit), only pairs are checked
	it('US5-10b should define x in each leaf of a call with a conditional argument', function () {
		analyze(CODE['US5-10b']).intraProcedural().should.containDeep([
			'a: L1 -> L2:T',
			'b: L1 -> L2:F',
			'x: L2:T -> L3',
			'x: L2:F -> L3'
		]);
	});

	// US5-11: a function expression copied with the leaves has only one scope
	it('US5-11 should keep one scope for a function expression in the leaves', function () {
		var result = analyze(CODE['US5-11']);
		result.scopeNames().filter(function (name) {
			return name.indexOf(ANONYMOUS) === 0;
		}).should.eql([ANONYMOUS + '0']);
		/// the helper deduplicates strings: compare with the raw number of pairs of a
		var models = pageModelsOf(result);
		[].concat(models.intraProceduralModels, models.intraPageModels).forEach(function (model) {
			var raw = 0;
			model.dupairs.forEach(function (pairs, variable) {
				if (variable.name === 'a') {
					raw += pairs.values().length;
				}
			});
			pairsOf(analyze.pairsOfModel(model), 'a').length.should.eql(raw);
		});
		result.intraProcedural().should.containDeep(['c: L1 -> L2>L2:T', 'c: L1 -> L2>L2:F']);
	});

	// US5-12: return leaves flow to exit
	it('US5-12 should split a returned conditional expression into return leaves', function () {
		var result = analyze(CODE['US5-12']);
		result.intraProcedural(PAGE + '.f').should.containDeep([
			'c: entry -> L2>L2:T',
			'c: entry -> L2>L2:F',
			'a: entry -> L2:T',
			'b: entry -> L2:F'
		]);
		var graph = intraProceduralGraphOf(result, PAGE + '.f');
		shouldFlowOnlyTo(theNodeAt(graph[2], 2, 'T'), graph[1]);
		shouldFlowOnlyTo(theNodeAt(graph[2], 2, 'F'), graph[1]);
	});

	// US5-13: a switch discriminant, case bodies are not copied
	it('US5-13 should connect the leaves of a switch discriminant to the first case', function () {
		var code = CODE['US5-13'];
		var pairs = analyze(code).intraProcedural();
		pairs.should.containDeep([
			'c: L1 -> L2>L2:T',
			'c: L1 -> L2>L2:F',
			'a: L1 -> L2:T',
			'b: L1 -> L2:F'
		]);
		/// the case node does not read the discriminant again
		pairs.filter(function (pair) {
			return /^[abc]: L1 -> L3/.test(pair);
		}).should.eql([]);
		var nodes = cfgOf(code)[2],
			caseNode = theNodeAt(nodes, 3, '');
		shouldFlowOnlyTo(theNodeAt(nodes, 2, 'T'), caseNode);
		shouldFlowOnlyTo(theNodeAt(nodes, 2, 'F'), caseNode);
		nodesAt(nodes, 4, '').length.should.eql(1);
	});

	// US2-8: short-circuit in a default value of a parameter (FR-005 with FR-008)
	it('US2-8', function () {
		var pairs = analyze(CODE['US2-8']).intraPage();
		pairs.should.containDeep([
			'a: L1 -> L2>L2:T',
			'a: L1 -> L2>L2:F',
			'd: L1 -> L2:F',
			'b: L2:T -> L3',
			'b: L2:F -> L3'
		]);
		pairs.should.not.containEql('d: L1 -> L2:T');
	});

	// US5-14: if (a) {} else if (b) { a = the value of b; } else { b = 1; a = 1; }
	it('US5-14 should split nested logical assignments', function () {
		var pairs = analyze(CODE['US5-14']).intraProcedural();
		pairs.filter(function (pair) {
			return pair.indexOf('a: ') === 0 || pair.indexOf('b: ') === 0;
		}).should.eql([
			'a: L1 -> L2>L3:T',
			'a: L1 -> L2>L2:F',
			'b: L1 -> L2:F>L2:FT',
			'b: L1 -> L2:F>L2:FF',
			'a: L1 -> L3',
			'a: L2:FT -> L3',
			'a: L2:FF -> L3',
			'b: L1 -> L3',
			'b: L2:FF -> L3'
		].sort());
	});

	// US5-15: return leaves are created even without uses or definitions (D15)
	it('US5-15 should create both return leaves of a short-circuit', function () {
		var result = analyze(CODE['US5-15']);
		var pairs = result.intraPage();
		pairs.should.containDeep(['a: L1 -> L3>L3:T', 'a: L1 -> L3>L3:F', 'b: L1 -> L3:F']);
		shouldNotContainAny(pairs, ['a: L1 -> L3>exit:T', 'b: L1 -> L3:T']);
		var graph = intraProceduralGraphOf(result, PAGE + '.f');
		shouldFlowOnlyTo(theNodeAt(graph[2], 3, 'T'), graph[1]);
		shouldFlowOnlyTo(theNodeAt(graph[2], 3, 'F'), graph[1]);
	});

	describe('US5-16 the right side of for-of', function () {
		var SCENARIO_16 = CODE['US5-16'];

		// US5-16: the leaves enter the loop node, which does not read the right side again
		it('US5-16 should split the right side of for-of before the loop', function () {
			var pairs = analyze(SCENARIO_16).intraProcedural();
			pairs.should.containDeep([
				'c: L1 -> L2>L2:T',
				'c: L1 -> L2>L2:F',
				'xs: L1 -> L2:T',
				'ys: L1 -> L2:F',
				'x: L2 -> L3',
				't: L1 -> L5',
				't: L3 -> L5'
			]);
			shouldNotContainAny(pairs, ['xs: L1 -> L2', 'ys: L1 -> L2']);
		});

		// US5-16: only the edges from outside the loop pass the decision
		it('US5-16 should only intercept the entry edges of the loop node', function () {
			var nodes = cfgOf(SCENARIO_16)[2];
			var loop = nodes.filter(function (node) {
				return !!node.astNode && node.astNode.type === 'ForOfStatement';
			});
			loop.length.should.eql(1);
			var decision = nodes.filter(function (node) {
				return node.line === 2 && pathOf(node) === '' && node !== loop[0];
			});
			decision.length.should.eql(1);
			isDecision(decision[0]).should.eql(true);
			decision[0].prev.forEach(function (node) {
				node.line.should.eql(1, 'the decision is only entered from outside the loop');
			});
			shouldFlowOnlyTo(theNodeAt(nodes, 2, 'T'), loop[0]);
			shouldFlowOnlyTo(theNodeAt(nodes, 2, 'F'), loop[0]);
			(theNodeAt(nodes, 3, '').normal === loop[0]).should.eql(true, 'the back edge goes to the loop node');
		});

		// edge case: ?? on the right side of for-of, the loop node does not read saved
		it('should not read the split right side of for-of at the loop node', function () {
			var result = analyze(CODE['for-of ??']);
			result.intraProcedural.should.not.throw();
			var loop = intraProceduralGraphOf(result, PAGE)[2].filter(function (node) {
				return !!node.astNode && node.astNode.type === 'ForOfStatement';
			});
			loop.length.should.eql(1);
			var names = loop[0].cuse.values().map(function (variable) {
				return variable.name;
			});
			names.should.not.containEql('saved');
		});
	});

	describe('edge cases', function () {
		// while (a || b): the body is not copied
		it('should split || in a while condition without copying the body', function () {
			var code = CODE['while ||'];
			analyze(code).intraProcedural().should.containDeep([
				'a: L1 -> L2>L3:T',
				'a: L1 -> L2>L2:F',
				'b: L1 -> L2:F>L3:T',
				'b: L1 -> L2:F>L5:F'
			]);
			nodesAt(cfgOf(code)[2], 3, '').length.should.eql(1);
		});

		// if (a ? b : c): the body is not copied
		it('should split a conditional if condition without copying the body', function () {
			var code = CODE['if ?:'];
			analyze(code).intraProcedural().should.containDeep([
				'a: L1 -> L2>L2:T',
				'a: L1 -> L2>L2:F',
				'b: L1 -> L2:T>L3:T',
				'b: L1 -> L2:T>L5:F',
				'c: L1 -> L2:F>L3:T',
				'c: L1 -> L2:F>L5:F'
			]);
			nodesAt(cfgOf(code)[2], 3, '').length.should.eql(1);
		});

		// a?.b is not split (out of scope)
		it('should not split optional chaining', function () {
			var code = CODE['a?.b'];
			analyze(code).intraProcedural().should.containDeep(['a: L1 -> L2', 'x: L2 -> L3']);
			cfgOf(code)[2].filter(function (node) {
				return pathOf(node) !== '';
			}).should.eql([]);
		});
	});

	/// characterization (specs/002-small-refactors, User Story 2): expected values are taken
	/// from the behavior before the FlowNode branch fields are refactored
	describe('characterization of branch labels and flags', function () {
		/// nodes of the only inter-procedural model at a line, as "<type> <label>"
		function interProceduralNodesAt(result, line) {
			var models = pageModelsOf(result).interProceduralModels;
			models.length.should.eql(1);
			return {
				model: models[0],
				nodes: models[0].graph[2].filter(function (node) {
					return node.line === line;
				})
			};
		}

		function typedLabels(nodes) {
			return nodes.map(function (node) {
				return node.type + ' ' + analyze.nodeLabel(node);
			});
		}

		// (a1) the call site is not a decision node: it becomes the call node itself
		it('should label call nodes changed from split call sites and their call returns', function () {
			var found = interProceduralNodesAt(analyze(CODE['call leaf']), 2);
			typedLabels(found.nodes).should.eql([
				'normal L2',
				'call L2:T',
				'callReturn L2:T',
				'call L2:F',
				'callReturn L2:F'
			]);
			found.nodes.map(function (node) {
				return pathOf(node);
			}).should.eql(['', 'T', 'T', 'F', 'F']);
			/// the changed call sites keep their split and label path; their call returns are not split
			[1, 3].forEach(function (index) {
				var callSite = found.nodes[index], callReturn = found.nodes[index + 1];
				(callSite.split !== null).should.eql(true);
				callSite.labelPath.should.eql(callSite.split.path);
				(callReturn.split === null).should.eql(true);
				callReturn.labelPath.should.eql(callSite.labelPath);
			});
			analyze.pairsOfModel(found.model).should.eql([
				'a: L1 -> L2:T',
				'b: L1 -> L2:F',
				'c: L1 -> L2>L2:F',
				'c: L1 -> L2>L2:T',
				'c: L1 -> L3',
				'console: entry -> L3',
				'f: entry -> L2:T',
				'g: entry -> L2:F',
				'v: entry -> L4',
				'v: entry -> L5'
			]);
		});

		// (a2) the call site is a decision node: a new call node is inserted before it
		it('should label call nodes inserted before split decision nodes and their call returns', function () {
			var found = interProceduralNodesAt(analyze(CODE['call before decision']), 2);
			typedLabels(found.nodes).should.eql([
				'normal L2',
				'call L2:T',
				'callReturn L2:T',
				'normal L2:T',
				'normal L2:TT',
				'normal L2:TF',
				'normal L2:F'
			]);
			found.nodes.map(function (node) {
				return pathOf(node);
			}).should.eql(['', 'T', 'T', 'T', 'TT', 'TF', 'F']);
			(found.nodes[1].dujsDecisionCalledBefore === found.nodes[3]).should.eql(true);
			/// the inserted call node and the call return are not split and take the label path of the decision node
			(found.nodes[3].split !== null).should.eql(true);
			found.nodes[3].labelPath.should.eql(found.nodes[3].split.path);
			[found.nodes[1], found.nodes[2]].forEach(function (node) {
				(node.split === null).should.eql(true);
				node.labelPath.should.eql(found.nodes[3].labelPath);
			});
			analyze.pairsOfModel(found.model).should.eql([
				'a: L1 -> L2:TT',
				'a: L1 -> L4',
				'a: L1 -> entry',
				'b: L1 -> L2:TF',
				'c: L1 -> L2>L2:F',
				'c: L1 -> L2>L2:T',
				'console: entry -> L3',
				'd: L1 -> L2:F',
				'f: entry -> L2:T>L2:TF',
				'f: entry -> L2:T>L2:TT',
				'x: L2:F -> L3',
				'x: L2:TF -> L3',
				'x: L2:TT -> L3'
			]);
		});

		// (b) the decision node of x = c ? a : b and its two leaves
		it('should label the decision node and the leaves of a conditional assignment', function () {
			var code = CODE['assignment ?:'],
				nodes = cfgOf(code)[2].filter(function (node) {
					return node.line === 2;
				});
			nodes.map(function (node) {
				return analyze.nodeLabel(node) + ' ' + JSON.stringify(pathOf(node));
			}).should.eql(['L2 ""', 'L2:T "T"', 'L2:F "F"']);
			isDecision(nodes[0]).should.eql(true);
			/// the three nodes share the original statement; nothing is evaluated before c
			nodes.forEach(function (node) {
				(node.split.origin === nodes[0].split.origin).should.eql(true);
				node.labelPath.should.eql(node.split.path);
				node.split.preEvaluated.should.eql([]);
			});
			nodes[0].split.origin.type.should.eql('AssignmentExpression');
			nodes[0].split.origin.loc.start.line.should.eql(2);
			analyze(code).intraProcedural().should.eql([
				'a: L1 -> L2:T',
				'b: L1 -> L2:F',
				'c: L1 -> L2>L2:F',
				'c: L1 -> L2>L2:T',
				'console: entry -> L3',
				'x: L2:F -> L3',
				'x: L2:T -> L3'
			]);
		});

		// (b) the expressions evaluated before the condition belong to the decision node only
		it('should keep the expressions evaluated before the condition in the split of the decision node', function () {
			var nodes = cfgOf('var c = 1, a = 1, b = 2, y = 0, x = 0;\nx = y + (c ? a : b);')[2].filter(function (node) {
				return node.line === 2 && node.split !== null;
			});
			nodes.map(pathOf).should.eql(['', 'T', 'F']);
			nodes[0].split.preEvaluated.map(function (expression) {
				return expression.type + ' ' + expression.name;
			}).should.eql(['Identifier y']);
			nodes[1].split.preEvaluated.should.eql([]);
			nodes[2].split.preEvaluated.should.eql([]);
		});

		/// [label, isWithObject, loopRightSplit, discriminantSplit] of the nodes of a CFG
		function flagsOf(code) {
			return cfgOf(code)[2].filter(function (node) {
				return node.type === FlowNode.NORMAL_NODE_TYPE;
			}).map(function (node) {
				return [analyze.nodeLabel(node), node.isWithObject, node.loopRightSplit, node.discriminantSplit];
			});
		}

		// (c) the with object leaves of a split with object
		it('should keep isWithObject of the leaves of a split with object', function () {
			flagsOf(CODE['with ?:']).should.eql([
				['L1', false, false, false],
				['L2', false, false, false],
				['L2:T', true, false, false],
				['L3', false, false, false],
				['L2:F', true, false, false]
			]);
		});

		// (c) the loop node of for-of with a split right side
		it('should keep loopRightSplit of the loop node of a split right side', function () {
			flagsOf(CODE['US5-16']).should.eql([
				['L1', false, false, false],
				['L2', false, false, false],
				['L2:T', false, false, false],
				['L2', false, true, false],
				['L3', false, false, false],
				['L5', false, false, false],
				['L2:F', false, false, false]
			]);
		});

		// (c) every case node of a switch with a split discriminant
		it('should keep discriminantSplit of the case nodes of a split discriminant', function () {
			flagsOf(CODE['switch ?: two cases']).should.eql([
				['L1', false, false, false],
				['L2', false, false, false],
				['L2:T', false, false, false],
				['L3', false, false, true],
				['L4', false, false, false],
				['L6', false, false, false],
				['L5', false, false, true],
				['L2:F', false, false, false]
			]);
		});
	});

	// US5-7: every p-use of every model has both targets (the helper does not throw)
	it('US5-7 should have both branch targets for every p-use of every program', function () {
		var failures = [];
		Object.keys(CODE).forEach(function (name) {
			try {
				var models = pageModelsOf(analyze(CODE[name]));
				[].concat(models.intraProceduralModels, models.interProceduralModels, models.intraPageModels)
					.forEach(analyze.pairsOfModel);
			} catch (error) {
				failures.push(name + ': ' + error.message);
			}
		});
		failures.should.eql([]);
	});
});
