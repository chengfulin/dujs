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
	/// scenario 5: a function body walked at the entry node of the function
	'nested': [
		'var x, a, b, k, o;',
		'function f() {',
		'  switch (x) { case a: b; }',
		'  a;',
		'  for (k in o) { b; }',
		'}'
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

		/// the entry node of a function walks the function body: a nested case is not read and turns the
		/// rest of the walk into p-uses, a nested loop only reads its head
		it('should walk the body of a function at its entry node by the nested rules', function () {
			var result = analyze(CODE.nested),
				entries = [];
			modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
				if (model.mainlyRelatedScope !== result.scopeTree.root) {
					entries.push(model.graph[0]);
				}
			});
			entries.length.should.eql(1);
			entries[0].astNode.type.should.eql('BlockStatement');
			usesOf(entries[0]).should.eql({cuse: ['x'], puse: ['a', 'o']});
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
});
