/*
 * Test cases for the defects found by the code review of PR #3
 * (specs/001-fix-known-issues, Phase 10, T056 ~ T061)
 *
 * Each `it` title starts with R<n>, the defect it reproduces. Each analyzed
 * program keeps one node source per line (known limitation of the helper).
 */
require('should');
var analyze = require('../helpers/analyze'),
	pathOf = require('../../lib/esgraph/branchlabel').pathOf,
	modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode');

var PAGE = '$DOMAIN.$PAGE_0',
	ANONYMOUS = PAGE + '.$ANONYMOUS_FUN_';

function pageModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree);
}

function intraProceduralModelOf(result, scopeName) {
	'use strict';
	var found = null;
	pageModelsOf(result).intraProceduralModels.forEach(function (model) {
		if (model.mainlyRelatedScope.name === scopeName) {
			found = model;
		}
	});
	(!!found).should.eql(true, 'no intra-procedural model of ' + scopeName);
	return found;
}

/** all models of the page, except the inter-page model */
function modelsOf(result) {
	'use strict';
	var models = pageModelsOf(result);
	return [].concat(models.intraProceduralModels, models.interProceduralModels, models.intraPageModels);
}

/** nodes of a model calling the entry node of a scope */
function callersOf(model, entryNode) {
	'use strict';
	return model.graph[2].filter(function (node) {
		return node.call === entryNode;
	});
}

/** decision nodes of the original statement at a line: nodes with a true or a false target */
function decisionsAtLine(model, line) {
	'use strict';
	return model.graph[2].filter(function (node) {
		return node.line === line && node.type !== FlowNode.CALL_RETURN_NODE_TYPE && (!!node.true || !!node.false);
	});
}

function pairsOf(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

describe('Defects found by the code review of PR #3', function () {
	'use strict';
	after(analyze.reset);

	// R1: a class defined inside a function body is not a static-member call site at the entry node
	it('R1 should not make the entry node of a function a call site of a static member in its body', function () {
		var result = analyze([
			'function g() {',
			'  class D { static a = 1; }',
			'}',
			'g();'
		].join('\n'));
		var gModel = intraProceduralModelOf(result, PAGE + '.g'),
			staticEntry = intraProceduralModelOf(result, PAGE + '.g.' + '$ANONYMOUS_FUN_0').graph[0];
		gModel.graph[0].type.should.eql(FlowNode.ENTRY_NODE_TYPE);
		var models = pageModelsOf(result).interProceduralModels;
		models.length.should.be.above(0);
		models.forEach(function (model) {
			var staticEntryOfModel = model.flatNodeOf(staticEntry);
			model.graph[2].filter(function (node) {
				return node.type === FlowNode.ENTRY_NODE_TYPE && node !== model.graph[0] && node !== staticEntryOfModel;
			}).forEach(function (node) {
				(node.call === null).should.eql(true, 'an entry node is not a call site');
			});
			var callers = callersOf(model, staticEntryOfModel);
			callers.length.should.belowOrEqual(1);
			callers.forEach(function (node) {
				node.line.should.eql(2);
			});
		});
	});

	// R1: a static member in a loop body, a case body or a catch body is called at its own class node
	it('R1 should call a static member at the class node in a loop, case or catch body', function () {
		var result = analyze([
			'var v = 1, o = [1];',
			'for (var k of o) {',
			'  class A { static a = v; }',
			'}',
			'switch (v) {',
			'  case 1:',
			'    class B { static b = v; }',
			'}',
			'try {',
			'  v = 2;',
			'} catch (e) {',
			'  class C { static c = v; }',
			'}'
		].join('\n'));
		var page = pageModelsOf(result).intraPageModels[0];
		[['$BLOCK_0.$ANONYMOUS_FUN_0', 3], ['$BLOCK_1.$ANONYMOUS_FUN_1', 7], ['$BLOCK_2.$ANONYMOUS_FUN_2', 12]].forEach(function (member) {
			var entry = page.flatNodeOf(intraProceduralModelOf(result, PAGE + '.' + member[0]).graph[0]);
			callersOf(page, entry).map(function (node) {
				return node.line;
			}).should.eql([member[1]], member[0]);
		});
	});

	// R2: a switch case whose body defines a class keeps its true and false targets
	it('R2 should keep the targets of a case node whose body defines a class with static members', function () {
		var result = analyze([
			'var v = 1;',
			'switch (v) {',
			'  case 1:',
			'    class D { static a = v; }',
			'}'
		].join('\n'));
		/// the intra-page model reconnects the false target (exit) to its LOOP node (no line)
		result.intraPage().should.containDeep(['v: L1 -> L3>L4:T', 'v: L1 -> L4']);
		result.intraProcedural().should.containDeep(['v: L1 -> L3>L4:T', 'v: L1 -> L3>exit:F']);
	});

	// R2: a decision node whose condition defines a class with static members keeps its targets
	it('R2 should keep the targets of a decision node that calls static members', function () {
		var result = analyze([
			'var v = 1;',
			'if (v === class { static a = v; }) {',
			'  v = 2;',
			'}'
		].join('\n'));
		var staticEntry = intraProceduralModelOf(result, ANONYMOUS + '0').graph[0];
		modelsOf(result).forEach(function (model) {
			decisionsAtLine(model, 2).forEach(function (node) {
				(!!node.true && !!node.false).should.eql(true, 'decision L2 has both targets');
			});
		});
		callersOf(pageModelsOf(result).intraPageModels[0],
			pageModelsOf(result).intraPageModels[0].flatNodeOf(staticEntry)).length.should.eql(1);
		result.intraPage().should.containDeep(['v: L1 -> L2>L3:T']);
		result.intraProcedural().should.containDeep(['v: L1 -> L2>L3:T', 'v: L1 -> L2>exit:F']);
	});

	// R3: a split decision node whose condition is a call keeps its true and false targets
	it('R3 should keep the targets of a split decision node whose condition is a call', function () {
		var result = analyze([
			'var a = 1, b = 0;',
			'function check(x) {',
			'  return x;',
			'}',
			'if (check(a) || b) {',
			'  b = 2;',
			'}'
		].join('\n'));
		modelsOf(result).forEach(function (model) {
			decisionsAtLine(model, 5).forEach(function (node) {
				(!!node.true && !!node.false).should.eql(true, 'decision L5:' + pathOf(node) + ' has both targets');
			});
		});
		var expected = ['b: L1 -> L5:F>L6:T', 'check: entry -> L5>L5:F', 'check: entry -> L5>L6:T'];
		result.intraProcedural().should.containDeep(expected.concat(['b: L1 -> L5:F>exit:F']));
		/// the intra-page model reconnects the false target (exit) to its LOOP node (no line)
		result.intraPage().should.containDeep(expected);
	});

	// R3: a split decision node of an expression statement whose condition is a call keeps its targets
	it('R3 should keep the targets of a decision node of `f() && x;` and `f() ? a : b`', function () {
		var result = analyze([
			'var x = 1, a = 2, b = 3;',
			'function f() {',
			'  return x;',
			'}',
			'f() && x;',
			'var y = f() ? a : b;'
		].join('\n'));
		modelsOf(result).forEach(function (model) {
			decisionsAtLine(model, 5).concat(decisionsAtLine(model, 6)).forEach(function (node) {
				(!!node.true && !!node.false).should.eql(true, 'decision L' + node.line + ' has both targets');
			});
		});
		var expected = ['a: L1 -> L6:T', 'b: L1 -> L6:F', 'f: entry -> L5>L5:T', 'f: entry -> L5>L6:F',
			'f: entry -> L6>L6:F', 'f: entry -> L6>L6:T', 'x: L1 -> L5:T'];
		result.intraProcedural().should.containDeep(expected);
		result.intraPage().should.containDeep(expected);
	});

	// R3: the call of a decision node is made before the decision: definitions killed by the callee do not reach the branches
	it('R3 should call the callee before a decision node whose condition is a call', function () {
		var result = analyze([
			'var g = 1;',
			'function f() {',
			'  g = 2;',
			'  return g;',
			'}',
			'if (f()) {',
			'  console.log(g);',
			'}'
		].join('\n'));
		var pairs = pairsOf(result.intraPage(), 'g');
		pairs.should.containEql('g: L3 -> L7');
		pairs.should.not.containEql('g: L1 -> L7');
		result.intraProcedural().should.containDeep(['f: entry -> L6>L7:T', 'f: entry -> L6>exit:F']);
		var page = pageModelsOf(result).intraPageModels[0],
			fEntry = page.flatNodeOf(intraProceduralModelOf(result, PAGE + '.f').graph[0]),
			decision = decisionsAtLine(page, 6);
		decision.length.should.eql(1);
		decision[0].type.should.eql(FlowNode.NORMAL_NODE_TYPE);
		(decision[0].call === null).should.eql(true, 'the decision node is not the CALL node');
		var callers = callersOf(page, fEntry);
		callers.length.should.eql(1);
		callers[0].next.should.eql([fEntry]);
		fEntry.prev.indexOf(callers[0]).should.not.eql(-1);
	});

	// R2/R3: static members and a call of one decision node are chained before the decision
	it('R2 should chain a static member and a call before a decision node', function () {
		var result = analyze([
			'var v = 1;',
			'function f(c) {',
			'  v = 3;',
			'  return v;',
			'}',
			'if (f(class { static a = (v = 2); })) {',
			'  console.log(v);',
			'}'
		].join('\n'));
		var pairs = pairsOf(result.intraPage(), 'v');
		/// the static member defines v before f is entered
		pairs.should.containDeep(['v: L6 -> entry', 'v: L3 -> L4', 'v: L3 -> L7']);
		pairs.should.not.containEql('v: L1 -> L7');
		pairs.should.not.containEql('v: L6 -> L7');
		result.intraProcedural();
		modelsOf(result).forEach(function (model) {
			decisionsAtLine(model, 6).forEach(function (node) {
				(!!node.true && !!node.false).should.eql(true, 'decision L6 has both targets');
			});
		});
	});

	// R4: the condition in the operand of an update expression of a switch discriminant is split
	it('R4 should keep the uses of a switch discriminant with a condition in an update expression', function () {
		var result = analyze([
			'var a = [1], i = 0;',
			'switch (a[i || 0]++) {',
			'  case 1:',
			'    break;',
			'}'
		].join('\n'));
		var pairs = result.intraProcedural();
		pairsOf(pairs, 'a').should.not.eql([]);
		pairsOf(pairs, 'i').should.not.eql([]);
		/// a is read before the condition at the decision; each leaf updates the element
		pairs.should.eql(['a: L1 -> L2', 'i: L1 -> L2>L2:F', 'i: L1 -> L2>L2:T']);
	});

	// R4: a switch discriminant without a split operator is still read by its case nodes
	it('R4 should read a switch discriminant that is not split at each case', function () {
		var result = analyze([
			'var a = [1], i = 0;',
			'switch (a[i]++) {',
			'  case 1:',
			'    break;',
			'}'
		].join('\n'));
		result.intraProcedural().should.containDeep(['a: L1 -> L3>exit:T', 'i: L1 -> L3>exit:F']);
	});

	// R5: the value of a property evaluated before the condition stays at the decision node
	it('R5 should keep a property value evaluated before the condition at the decision node', function () {
		var object = analyze([
			'var x = 1, y = 0;',
			'var o = {a: x, b: (x = 2) || y};'
		].join('\n')).intraProcedural();
		var array = analyze([
			'var x = 1, y = 0;',
			'var o = [x, (x = 2) || y];'
		].join('\n')).intraProcedural();
		array.should.containEql('x: L1 -> L2');
		object.should.containEql('x: L1 -> L2');
		object.should.eql(array);
	});

	// R5: a spread argument evaluated before the condition stays at the decision node
	it('R5 should keep a spread element evaluated before the condition at the decision node', function () {
		var call = analyze([
			'var x = [1], y = 0;',
			'var o = Math.max(...x, (x = 2) || y);'
		].join('\n')).intraProcedural();
		call.should.containEql('x: L1 -> L2');
		var object = analyze([
			'var x = {}, y = 0;',
			'var o = {...x, b: (x = 2) || y};'
		].join('\n')).intraProcedural();
		object.should.containEql('x: L1 -> L2');
	});

	// R6: a default value nested in a destructuring pattern with a default is initialized once
	it('R6 should initialize a default nested in a parameter pattern with a default only once', function () {
		var result = analyze([
			'function g() {',
			'  return 1;',
			'}',
			'function f([a = g()] = [], b = a) {',
			'  return b;',
			'}'
		].join('\n'));
		var model = intraProceduralModelOf(result, PAGE + '.f');
		var definingA = model.graph[2].filter(function (node) {
			return !!node.generate && node.generate.values().some(function (vardef) {
				return vardef.variable.name === 'a' && node.type !== FlowNode.ENTRY_NODE_TYPE;
			});
		});
		definingA.length.should.eql(1);
		var callsOfG = 0;
		/// the entry node's AST is the whole body: count the expressions of the other nodes
		model.graph[2].filter(function (node) {
			return node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE;
		}).forEach(function (node) {
			JSON.stringify(node.analyzedExpressions, function (key, value) {
				if (!!value && value.type === 'CallExpression' && value.callee.name === 'g') {
					callsOfG += 1;
				}
				return (key === 'loc' || key === 'range') ? undefined : value;
			});
		});
		callsOfG.should.eql(1);
		pairsOf(result.intraProcedural(PAGE + '.f'), 'a').should.eql(['a: L4 -> L4']);
	});
});
