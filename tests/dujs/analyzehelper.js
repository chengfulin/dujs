/*
 * Test cases for the def-use pair notation of the test helper
 * (tests/helpers/analyze.js; specs/001-fix-known-issues/contracts/analyze-helper-notation.md, FR-014)
 *
 * Known limitation of the helper: when one line holds more than one node
 * source (several statements, several split sources, or parameter defaults
 * on the same line as the body), labels may collide, and the omitted branch
 * code of a p-use may be ambiguous ("L2>L2:T" can be the true branch to "L2"
 * or a target "L2:T"). The helper adds no sequence number and throws no
 * error for it, so the programs analyzed in this file and in the acceptance
 * tests keep one node source per line.
 */
var should = require('should');
var analyze = require('../helpers/analyze'),
	FlowNode = require('../../lib/esgraph/flownode'),
	Pair = require('../../lib/dujs/pair'),
	DUPair = require('../../lib/dujs/dupair'),
	Set = require('../../lib/analyses').Set;

/**
 * Create a node of a hand-built graph
 * @param {number} line
 * @param {string} [branchPath]
 * @returns {FlowNode}
 */
function nodeAt(line, branchPath) {
	'use strict';
	var node = new FlowNode();
	node.line = line;
	if (!!branchPath) {
		node.branchPath = branchPath;
	}
	return node;
}

/**
 * Stub model holding def-use pairs of one variable
 * @param {string} name
 * @param {Array} dupairs
 * @returns {Object}
 */
function stubModel(name, dupairs) {
	'use strict';
	var map = new Map();
	map.set({name: name}, new Set(dupairs));
	return {dupairs: map};
}

describe('analyze helper notation', function () {
	'use strict';
	after(analyze.reset);

	describe('p-use to a target without branch path', function () {
		/// rule 3: ":T" / ":F" is appended to a target without a branch path
		it('should append the branch code of the true and false targets', function () {
			var result = analyze([
				'var a = 1;',
				'if (a > 0) {',
				'  a = 2;',
				'}',
				'console.log(a);'
			].join('\n'));
			var pairs = result.intraProcedural();
			pairs.should.containEql('a: L1 -> L2>L3:T');
			pairs.should.containEql('a: L1 -> L2>L5:F');
			pairs.should.not.containEql('a: L1 -> L2>L3');
			pairs.should.not.containEql('a: L1 -> L2>L5');
		});

		/// rule 4: the true and false targets are the same node
		it('should render both branches when the targets are the same node', function () {
			var decision = nodeAt(2),
				target = nodeAt(3),
				def = nodeAt(1);
			decision.connect(target, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			decision.connect(target, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			var pairs = analyze.pairsOfModel(stubModel('a', [new DUPair(def, new Pair(decision, target))]));
			pairs.should.eql(['a: L1 -> L2>L3:F', 'a: L1 -> L2>L3:T']);
		});

		/// rule 4 with the analysis: an empty if body joins both branches at the next statement
		it('should render both branches of an empty if statement', function () {
			var result = analyze([
				'var a = 1;',
				'if (a > 0) {',
				'}',
				'console.log(a);'
			].join('\n'));
			var pairs = result.intraProcedural();
			pairs.should.containEql('a: L1 -> L2>L4:T');
			pairs.should.containEql('a: L1 -> L2>L4:F');
		});
	});

	describe('nodes with branch path', function () {
		/// rule 2: a node split into a branch is labeled "L<line>:<path>"
		it('should label a def and a c-use with the branch path', function () {
			var def = nodeAt(2, 'F'),
				use = nodeAt(3, 'TF');
			var pairs = analyze.pairsOfModel(stubModel('c', [new DUPair(def, use)]));
			pairs.should.eql(['c: L2:F -> L3:TF']);
		});

		/// rule 3: no branch code is appended to a target with a branch path
		it('should omit the branch code when the target has a branch path', function () {
			var def = nodeAt(1),
				decision = nodeAt(2),
				trueLeaf = nodeAt(2, 'T'),
				falseLeaf = nodeAt(2, 'F');
			decision.connect(trueLeaf, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			decision.connect(falseLeaf, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			var pairs = analyze.pairsOfModel(stubModel('a', [
				new DUPair(def, new Pair(decision, trueLeaf)),
				new DUPair(def, new Pair(decision, falseLeaf))
			]));
			pairs.should.eql(['a: L1 -> L2>L2:F', 'a: L1 -> L2>L2:T']);
		});

		/// rules 2 and 3: an inner decision with a path and a target without one
		it('should label an inner decision with its path and append the branch code', function () {
			var def = nodeAt(1),
				inner = nodeAt(2, 'T'),
				body = nodeAt(3),
				after = nodeAt(5);
			inner.connect(body, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			inner.connect(after, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			var pairs = analyze.pairsOfModel(stubModel('b', [new DUPair(def, new Pair(inner, body))]));
			pairs.should.eql(['b: L1 -> L2:T>L3:T']);
		});
	});

	describe('decision node lacking a branch target', function () {
		/// rule 6 (FR-010): the error names the variable and the decision node
		it('should throw an Error when the false target is missing', function () {
			var def = nodeAt(1),
				decision = nodeAt(2, 'T'),
				target = nodeAt(3);
			decision.connect(target, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			var model = stubModel('a', [new DUPair(def, new Pair(decision, target))]);
			var error = null;
			try {
				analyze.pairsOfModel(model);
			} catch (e) {
				error = e;
			}
			should.exist(error);
			error.should.be.instanceOf(Error);
			error.message.should.containEql('variable a');
			error.message.should.containEql('L2:T');
			error.message.should.containEql('false');
		});

		it('should throw an Error when the true target is missing', function () {
			var def = nodeAt(1),
				decision = nodeAt(4),
				target = nodeAt(6);
			decision.connect(target, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			var model = stubModel('flag', [new DUPair(def, new Pair(decision, target))]);
			(function () {
				analyze.pairsOfModel(model);
			}).should.throw(/variable flag/);
			(function () {
				analyze.pairsOfModel(model);
			}).should.throw(/Decision node L4 /);
		});
	});
});
