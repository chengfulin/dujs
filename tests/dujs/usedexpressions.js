/*
 * Test cases for the expressions read by a CFG node (usedExpressionsOf) and
 * the c-use/p-use sets found from them (findUSESet)
 * (specs/002-small-refactors, User Story 3, FR-007, FR-008, research R6)
 *
 * The expected values are characterization: they are taken from the behavior
 * of findUSESet before the refactoring and must be kept as they are.
 * findUSESet resolves variables by cfgNode.scope, so the nodes are taken from
 * a built model (tests/helpers/analyze.js), not from a bare CFG. The worklist
 * is not run by these tests: findUSESet is called on the node directly.
 */
require('should');
var analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	defUseAnalyzer = require('../../lib/dujs/defuseanalyzer'),
	FlowNode = require('../../lib/esgraph/flownode'),
	pathOf = require('../../lib/esgraph/branchlabel').pathOf;

/// every analyzed program keeps one node source per line
var CODE = {
	/// scenario 1: the condition o.p[i] has no expression evaluated before it
	'decision': [
		'var o, i, a, b, x, f, y;',
		'x = o.p[i] ? a : b;',
		'x = f(y) + (o.p[i] ? a : b);',
		'x = (a + b) + (y ? a : b);'
	].join('\n'),
	/// scenario 2: astNode is a single identifier
	'identifier': [
		'var a, b, c, x;',
		'x = a ? b : c;',
		'with (a) {}',
		'if (a) {}',
		'a;',
		'b || c;'
	].join('\n'),
	/// scenario 3
	'switch': [
		'var x, y, a, b;',
		'switch (x) { case y: a; break; default: b; }',
		'switch (a + b) { case y: break; }',
		'switch (a || b) { case y: break; }'
	].join('\n'),
	/// scenario 3: a discriminant read in the condition mode (specs/004-fix-remaining-issues FR-001)
	'switchCall': [
		'var a, b, c, f, y;',
		'switch (a + f(b) + c) { case y: break; }'
	].join('\n'),
	/// scenario 4
	'loop': [
		'var k, x, o, a, d, e, f, s, t;',
		'for (k in x) {}',
		'for (o.p in x) {}',
		'for ({a = d, [e]: f} of x) {}',
		'for (k of s ?? t) {}'
	].join('\n'),
	/// scenario 5
	'general': [
		'var x, a, b;',
		'x = a + b;'
	].join('\n'),
	/// scenario 5: the entry node of a function does not read its body (feature 005 FR-008)
	'nested': [
		'var x, a, b, k, o;',
		'function f() {',
		'  switch (x) { case a: b; }',
		'  a;',
		'  for (k in o) { b; }',
		'}'
	].join('\n'),
	/// scenario 6: a catch clause node only reads the evaluated expressions of its parameter (feature 006 D4, R10)
	'catch': [
		'var a, b, d, x;',
		'try { x = 1; }',
		'catch ({p = d, [a]: q}) { b; }',
		'try { x = 2; }',
		'catch { b; }',
		'try { x = 3; }',
		'catch (e) { b; }'
	].join('\n')
};

/**
 * Nodes of the intra-procedural model of the page scope of the code
 */
function nodesOf(code) {
	'use strict';
	var result = analyze(code),
		found = null;
	modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
		if (model.mainlyRelatedScope === result.scopeTree.root) {
			found = model;
		}
	});
	(!!found).should.eql(true, 'no intra-procedural model of the page');
	return found.graph[2];
}

/**
 * The only node at the line with the branch path and the astNode type
 */
function nodeAt(nodes, line, path, astType) {
	'use strict';
	var found = nodes.filter(function (node) {
		return node.line === line && pathOf(node) === path && !!node.astNode && node.astNode.type === astType &&
			node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE;
	});
	found.length.should.eql(1, 'number of ' + astType + ' nodes at L' + line + (path ? ':' + path : ''));
	return found[0];
}

/**
 * The only case node at the line whose test is the identifier (null: default)
 */
function caseAt(nodes, line, testName) {
	'use strict';
	var found = nodes.filter(function (node) {
		return node.line === line && !!node.astNode && node.astNode.type === 'SwitchCase' &&
			(testName === null ? node.astNode.test === null : (!!node.astNode.test && node.astNode.test.name === testName));
	});
	found.length.should.eql(1, 'number of case nodes at L' + line);
	return found[0];
}

function namesOf(variables) {
	'use strict';
	return variables.values().map(function (variable) {
		return variable.name;
	});
}

/**
 * Names of the c-use and p-use variables found by findUSESet, in insertion order
 */
function usesOf(node) {
	'use strict';
	var uses = defUseAnalyzer.findUSESet(node);
	return {cuse: namesOf(uses.cuse), puse: namesOf(uses.puse)};
}

describe('findUSESet characterization', function () {
	'use strict';
	var nodes = {};

	before(function () {
		Object.keys(CODE).forEach(function (name) {
			nodes[name] = nodesOf(CODE[name]);
		});
	});

	after(analyze.reset);

	describe('scenario 1: decision node with expressions evaluated before the condition', function () {
		/// specs/004-fix-remaining-issues FR-001: every read of a decision condition is a p-use (was c-uses)
		it('should read the condition of x = o.p[i] ? a : b as p-uses', function () {
			var decision = nodeAt(nodes.decision, 2, '', 'MemberExpression');
			decision.split.preEvaluated.should.eql([]);
			usesOf(decision).should.eql({cuse: [], puse: ['o', 'i']});
		});

		/// specs/004-fix-remaining-issues FR-001: o and i of the condition were c-uses
		it('should read the evaluated call as c-uses, even its callee, then the condition as p-uses', function () {
			var decision = nodeAt(nodes.decision, 3, '', 'MemberExpression');
			decision.split.preEvaluated.length.should.eql(1);
			usesOf(decision).should.eql({cuse: ['f', 'y'], puse: ['o', 'i']});
		});

		it('should read the evaluated binary as c-uses and the identifier condition as a p-use', function () {
			var decision = nodeAt(nodes.decision, 4, '', 'Identifier');
			decision.split.preEvaluated.length.should.eql(1);
			usesOf(decision).should.eql({cuse: ['a', 'b'], puse: ['y']});
		});
	});

	describe('scenario 2: astNode is a single identifier', function () {
		it('should read a split leaf as a c-use', function () {
			var leaf = nodeAt(nodes.identifier, 6, 'F', 'Identifier');
			leaf.split.should.not.eql(null);
			usesOf(leaf).should.eql({cuse: ['c'], puse: []});
		});

		it('should read the identifier decision of a split as a p-use', function () {
			usesOf(nodeAt(nodes.identifier, 2, '', 'Identifier')).should.eql({cuse: [], puse: ['a']});
		});

		it('should read the object of a with statement as a c-use', function () {
			var withObject = nodeAt(nodes.identifier, 3, '', 'Identifier');
			withObject.isWithObject.should.eql(true);
			usesOf(withObject).should.eql({cuse: ['a'], puse: []});
		});

		it('should read the condition of if (a) as a p-use', function () {
			usesOf(nodeAt(nodes.identifier, 4, '', 'Identifier')).should.eql({cuse: [], puse: ['a']});
		});

		it('should not read a; ', function () {
			usesOf(nodeAt(nodes.identifier, 5, '', 'Identifier')).should.eql({cuse: [], puse: []});
		});
	});

	describe('scenario 3: switch case', function () {
		it('should read x (p-use) and not y at case y', function () {
			var caseNode = caseAt(nodes['switch'], 2, 'y');
			usesOf(caseNode).should.eql({cuse: [], puse: ['x']});
		});

		it('should read nothing at default', function () {
			usesOf(caseAt(nodes['switch'], 2, null)).should.eql({cuse: [], puse: []});
		});

		it('should read the operands of switch (a + b) as p-uses at its case', function () {
			usesOf(nodeAt(nodes['switch'], 3, '', 'SwitchCase')).should.eql({cuse: [], puse: ['a', 'b']});
		});

		it('should not read a split discriminant at its case', function () {
			var caseNode = nodeAt(nodes['switch'], 4, '', 'SwitchCase');
			caseNode.discriminantSplit.should.eql(true);
			usesOf(caseNode).should.eql({cuse: [], puse: []});
		});

		/// specs/004-fix-remaining-issues FR-001: only the arguments of a call are c-uses
		it('should read a, f and c of switch (a + f(b) + c) as p-uses and b as a c-use at its case', function () {
			var caseNode = nodeAt(nodes.switchCall, 2, '', 'SwitchCase');
			(!!caseNode.discriminantSplit).should.eql(false);
			usesOf(caseNode).should.eql({cuse: ['b'], puse: ['a', 'f', 'c']});
		});
	});

	describe('scenario 4: for-in/for-of loop node', function () {
		it('should read x of for (k in x) as a c-use', function () {
			var loop = nodeAt(nodes.loop, 2, '', 'ForInStatement');
			(!!loop.true && !!loop.false).should.eql(true);
			usesOf(loop).should.eql({cuse: ['x'], puse: []});
		});

		it('should read the object of a member target, then the right side', function () {
			usesOf(nodeAt(nodes.loop, 3, '', 'ForInStatement')).should.eql({cuse: ['o', 'x'], puse: []});
		});

		it('should read the default and the computed key of a pattern, then the right side', function () {
			usesOf(nodeAt(nodes.loop, 4, '', 'ForOfStatement')).should.eql({cuse: ['d', 'e', 'x'], puse: []});
		});

		it('should not read a split right side', function () {
			var loop = nodeAt(nodes.loop, 5, '', 'ForOfStatement');
			loop.loopRightSplit.should.eql(true);
			usesOf(loop).should.eql({cuse: [], puse: []});
		});
	});

	describe('scenario 5: other nodes', function () {
		it('should read the astNode of x = a + b by the walking rules', function () {
			usesOf(nodeAt(nodes.general, 2, '', 'AssignmentExpression')).should.eql({cuse: ['a', 'b'], puse: []});
		});

		/// feature 005 FR-008 (KI §18, research R7): the entry node of a function reads nothing (it walked the
		/// function body: was {cuse: ['x'], puse: ['a', 'o']})
		it('should not read the body of a function at its entry node', function () {
			var result = analyze(CODE.nested),
				entries = [];
			modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
				if (model.mainlyRelatedScope !== result.scopeTree.root) {
					entries.push(model.graph[0]);
				}
			});
			entries.length.should.eql(1);
			entries[0].astNode.type.should.eql('BlockStatement');
			usesOf(entries[0]).should.eql({cuse: [], puse: []});
		});
	});

	describe('scenario 6: catch clause node (feature 006, D4)', function () {
		it('should read the default and the computed key of the parameter, not the body', function () {
			usesOf(nodeAt(nodes['catch'], 3, '', 'CatchClause')).should.eql({cuse: ['d', 'a'], puse: []});
		});

		it('should read nothing at a catch without parameter', function () {
			usesOf(nodeAt(nodes['catch'], 5, '', 'CatchClause')).should.eql({cuse: [], puse: []});
		});

		it('should read nothing at a catch with an identifier parameter', function () {
			usesOf(nodeAt(nodes['catch'], 7, '', 'CatchClause')).should.eql({cuse: [], puse: []});
		});
	});
});

describe('usedExpressionsOf', function () {
	'use strict';
	var usedExpressionsOf = require('../../lib/dujs/usedexpressions').usedExpressionsOf,
		nodes = {};

	/**
	 * Items of the node rendered as [source of the expression, read]
	 */
	function itemsOf(name, node) {
		return usedExpressionsOf(node).map(function (item) {
			return [CODE[name].slice(item.expression.range[0], item.expression.range[1]), item.read];
		});
	}

	before(function () {
		Object.keys(CODE).forEach(function (name) {
			nodes[name] = nodesOf(CODE[name]);
		});
	});

	after(analyze.reset);

	describe('scenario 1: decision node', function () {
		/// specs/004-fix-remaining-issues FR-001: the condition is read in the condition mode (was 'walk')
		it('should read the condition in the condition mode when nothing is evaluated before it', function () {
			itemsOf('decision', nodeAt(nodes.decision, 2, '', 'MemberExpression')).should.eql([['o.p[i]', 'p-use']]);
		});

		it('should put the evaluated expressions first as c-uses, then the condition', function () {
			itemsOf('decision', nodeAt(nodes.decision, 3, '', 'MemberExpression')).should.eql([
				['f(y)', 'c-use'],
				['o.p[i]', 'p-use']
			]);
			itemsOf('decision', nodeAt(nodes.decision, 4, '', 'Identifier')).should.eql([
				['a + b', 'c-use'],
				['y', 'p-use']
			]);
		});
	});

	describe('scenario 2: astNode is a single identifier', function () {
		it('should read a split leaf, a with object, if (a) and a; as c-use, c-use, p-use and nothing', function () {
			[
				nodeAt(nodes.identifier, 6, 'F', 'Identifier'),
				nodeAt(nodes.identifier, 3, '', 'Identifier'),
				nodeAt(nodes.identifier, 4, '', 'Identifier'),
				nodeAt(nodes.identifier, 5, '', 'Identifier')
			].map(function (node) {
				return itemsOf('identifier', node);
			}).should.eql([[['c', 'c-use']], [['a', 'c-use']], [['a', 'p-use']], []]);
		});

		it('should read the identifier decision of a split as a p-use', function () {
			itemsOf('identifier', nodeAt(nodes.identifier, 2, '', 'Identifier')).should.eql([['a', 'p-use']]);
		});
	});

	describe('scenario 3: switch case', function () {
		it('should read the discriminant x as a p-use at case y', function () {
			itemsOf('switch', caseAt(nodes['switch'], 2, 'y')).should.eql([['x', 'p-use']]);
		});

		it('should read nothing at default', function () {
			itemsOf('switch', caseAt(nodes['switch'], 2, null)).should.eql([]);
		});

		it('should read the discriminant a + b as a p-use', function () {
			itemsOf('switch', nodeAt(nodes['switch'], 3, '', 'SwitchCase')).should.eql([['a + b', 'p-use']]);
		});

		it('should read nothing when the discriminant is split', function () {
			itemsOf('switch', nodeAt(nodes['switch'], 4, '', 'SwitchCase')).should.eql([]);
		});
	});

	describe('scenario 4: for-in/for-of loop node', function () {
		it('should walk the right side of for (k in x)', function () {
			itemsOf('loop', nodeAt(nodes.loop, 2, '', 'ForInStatement')).should.eql([['x', 'walk']]);
		});

		it('should walk the object of a member target, then the right side', function () {
			itemsOf('loop', nodeAt(nodes.loop, 3, '', 'ForInStatement')).should.eql([['o', 'walk'], ['x', 'walk']]);
		});

		it('should walk the default, the computed key, then the right side', function () {
			itemsOf('loop', nodeAt(nodes.loop, 4, '', 'ForOfStatement')).should.eql([
				['d', 'walk'],
				['e', 'walk'],
				['x', 'walk']
			]);
		});

		it('should not read a split right side', function () {
			itemsOf('loop', nodeAt(nodes.loop, 5, '', 'ForOfStatement')).should.eql([]);
		});
	});

	describe('scenario 5: other nodes', function () {
		it('should walk the astNode of x = a + b', function () {
			itemsOf('general', nodeAt(nodes.general, 2, '', 'AssignmentExpression')).should.eql([['x = a + b', 'walk']]);
		});
	});

	describe('scenario 6: catch clause node (feature 006, D4)', function () {
		it('should walk the default and the computed key of the parameter only', function () {
			itemsOf('catch', nodeAt(nodes['catch'], 3, '', 'CatchClause')).should.eql([['d', 'walk'], ['a', 'walk']]);
		});

		it('should read nothing at a catch without parameter', function () {
			itemsOf('catch', nodeAt(nodes['catch'], 5, '', 'CatchClause')).should.eql([]);
		});

		it('should read nothing at a catch with an identifier parameter', function () {
			itemsOf('catch', nodeAt(nodes['catch'], 7, '', 'CatchClause')).should.eql([]);
		});
	});
});

/**
 * The reads of the member targets of a for-in/for-of head (feature 008 User
 * Story 1, FR-002, R2-3; contracts/lib-api.md §5): loopHeadExpressions(node,
 * rightSplit, binding) reads the object and the computed key of a member
 * target and of each member target of a pattern, except those whose object
 * variable is the domain localStorage (binding.isLocalStorageObject; a null
 * binding exempts nothing); the left side first, then the right side.
 */
describe('loopHeadExpressions with the reads of member targets (feature 008 User Story 1)', function () {
	'use strict';
	var usedExpressions = require('../../lib/dujs/usedexpressions'),
		code = [
			'var o = {}, q = {}, a = [1], k = 0, d = 1, e = \'p\';',
			'for (o[k] of a) {}',
			'for ([o.p, q[k]] of a) {}',
			'for ({[e]: o.p = d, x: q[k]} of a) {}',
			'for (localStorage[k] of a) {}',
			'for ([localStorage.k, o[k]] of a) {}',
			'for (o.p.q in a) {}'
		].join('\n'),
		nodes = null;

	before(function () {
		nodes = nodesOf(code);
	});

	after(analyze.reset);

	/**
	 * The loop node of a line
	 */
	function loopAt(line) {
		var found = nodes.filter(function (node) {
			return node.line === line && !!node.astNode &&
				(node.astNode.type === 'ForOfStatement' || node.astNode.type === 'ForInStatement');
		});
		found.length.should.eql(1, 'number of loop nodes at L' + line);
		return found[0];
	}

	/**
	 * Sources of the expressions read by the head of the loop of a line
	 */
	function headOf(line, binding, rightSplit) {
		var loop = loopAt(line);
		return usedExpressions.loopHeadExpressions(loop.astNode, !!rightSplit,
			binding === undefined ? loop.scope.binding : binding).map(function (expression) {
			return code.slice(expression.range[0], expression.range[1]);
		});
	}

	it('should read the object and the computed key of a member target, then the right side', function () {
		headOf(2).should.eql(['o', 'k', 'a']);
	});

	it('should not read a split right side', function () {
		headOf(2, undefined, true).should.eql(['o', 'k']);
	});

	it('should read the object and the computed key of each member target of a pattern, in pattern order', function () {
		headOf(3).should.eql(['o', 'q', 'k', 'a']);
	});

	it('should read the defaults, the computed keys and the member targets of a pattern before the right side', function () {
		var head = headOf(4);
		head[head.length - 1].should.eql('a');
		head.slice(0, -1).sort().should.eql(['d', 'e', 'k', 'o', 'q']);
		/// the computed key of the pattern comes before its default (getEvaluatedExpressions)
		head.indexOf('e').should.be.below(head.indexOf('d'));
		/// the object of a member target comes before its computed key
		head.indexOf('q').should.be.below(head.indexOf('k'));
	});

	/// D004: the exempted member target keeps the develop reads (its object, not its key)
	it('should not read the computed key of a member target of the domain localStorage', function () {
		headOf(5).should.eql(['localStorage', 'a']);
	});

	it('should not read an exempted member target of a pattern', function () {
		headOf(6).should.eql(['o', 'k', 'a']);
	});

	it('should exempt no member target when the binding is null', function () {
		headOf(5, null).should.eql(['localStorage', 'k', 'a']);
		headOf(6, null).should.eql(['localStorage', 'o', 'k', 'a']);
	});

	/// characterization (the same as develop): the object of a non-computed member target
	it('should read the object o.p of the member target o.p.q', function () {
		headOf(7).should.eql(['o.p', 'a']);
	});

	/// astNodeItems passes cfgNode.scope.binding
	it('should walk the reads of the member targets at the loop node (usedExpressionsOf)', function () {
		[[2, ['o', 'k', 'a']], [5, ['localStorage', 'a']], [6, ['o', 'k', 'a']]].forEach(function (row) {
			usedExpressions.usedExpressionsOf(loopAt(row[0])).map(function (item) {
				item.read.should.eql('walk');
				return code.slice(item.expression.range[0], item.expression.range[1]);
			}).should.eql(row[1], 'L' + row[0]);
		});
	});
});

/**
 * bindingPattern.getMemberTargetReads (feature 008 User Story 1, FR-002;
 * contracts/lib-api.md §4): the object of each MemberExpression target of a
 * pattern, followed by its property when the key is computed, in pattern
 * order; defaults and computed keys of the pattern are not included
 * (getEvaluatedExpressions)
 */
describe('bindingPattern.getMemberTargetReads (feature 008 User Story 1)', function () {
	'use strict';
	var espree = require('espree'),
		bindingPattern = require('../../lib/dujs/bindingpattern');

	/**
	 * Sources of the reads of the left side of the assignment of a statement
	 */
	function readsOf(statement) {
		var ast = espree.parse(statement, {ecmaVersion: 'latest', range: true}),
			left = ast.body[0].expression.left;
		(typeof bindingPattern.getMemberTargetReads).should.eql('function', 'getMemberTargetReads');
		return bindingPattern.getMemberTargetReads(left).map(function (expression) {
			return statement.slice(expression.range[0], expression.range[1]);
		});
	}

	it('should give the object of each member target, then the computed key, in pattern order', function () {
		readsOf('[o.p, {a: q[k], b: r.s.t}, ...u[v]] = x;').should.eql(['o', 'q', 'k', 'r.s', 'u', 'v']);
	});

	it('should not give the defaults and the computed keys of the pattern', function () {
		readsOf('({[e]: o.p = d, ...w[z]} = x);').should.eql(['o', 'w', 'z']);
	});

	it('should give the object expression of a member target on a call', function () {
		readsOf('[f(a).p, g()[i]] = x;').should.eql(['f(a)', 'g()', 'i']);
	});

	it('should give nothing for a pattern of identifiers', function () {
		readsOf('[a, {b, c: [d = e]}] = x;').should.eql([]);
	});
});
