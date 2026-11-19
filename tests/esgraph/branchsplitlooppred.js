/*
 * Test cases of the predecessors of a for-in/for-of node whose right side is
 * split (specs/004-fix-remaining-issues, FR-012, User Story 6 #3, #3', #4,
 * research R11, KI §14).
 * Original dujs code, MIT License (see LICENSE).
 *
 * The edges entering the loop node from outside the loop are redirected to
 * the decision of the right side; the edges from the body keep entering the
 * loop node. With AST ranges the ranges decide; without a range the graph
 * decides by dominance: a predecessor not reachable from the entry node
 * without passing the loop node is in the body.
 *
 * The CFGs are built by hand so that the AST nodes of chosen predecessors
 * have no range (the parser always gives ranges).
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	branchsplitter = require('../../lib/esgraph/branchsplitter'),
	factoryFlowNode = require('../../lib/esgraph/flownodefactory'),
	FlowNode = require('../../lib/esgraph/flownode'),
	jsParser = require('../../lib/dujs/jsparser'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, '..', 'dujs', 'cases', 'probes004');

/**
 * A copy of an AST node without range (shallow: only the node itself)
 * @param {Object} ast
 * @returns {Object}
 */
function withoutRange(ast) {
	'use strict';
	var copy = Object.assign({}, ast);
	delete copy.range;
	return copy;
}

/**
 * Create a normal node of a hand-built CFG
 * @param {Object} ast
 * @returns {FlowNode}
 */
function normalNode(ast) {
	'use strict';
	return factoryFlowNode.create(FlowNode.NORMAL_NODE_TYPE, ast, null);
}

/**
 * The single created node entered by the redirected edges: the first decision
 * of the right side (the first node created by the split)
 * @param {Array} created
 * @returns {FlowNode}
 */
function rightDecisionOf(created) {
	'use strict';
	created.length.should.be.above(0);
	return created[0];
}

describe('Predecessors of a split for-of node (FR-012)', function () {
	'use strict';

	/**
	 * entry -> L1 (for-of) -T-> L2 (body) -> L1; L1 -F-> exit
	 * @param {Object} options
	 * @param {boolean} options.bodyNodeHasRange
	 * @param {boolean} options.loopBodyHasRange
	 */
	function singleLoop(options) {
		var program = jsParser.parseAST('for (var x of (s ?? [])) {\n  y = x;\n}'),
			forOf = program.body[0],
			assignment = forOf.body.body[0].expression;
		if (!options.loopBodyHasRange) {
			forOf = Object.assign({}, forOf, {body: withoutRange(forOf.body)});
		}
		var entry = factoryFlowNode.create(FlowNode.ENTRY_NODE_TYPE, program, null),
			exit = factoryFlowNode.create(FlowNode.EXIT_NODE_TYPE, null, null),
			loop = normalNode(forOf),
			body = normalNode(options.bodyNodeHasRange ? assignment : withoutRange(assignment));
		entry.connect(loop, FlowNode.NORMAL_CONNECTION_TYPE);
		loop.connect(body, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		loop.connect(exit, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		body.connect(loop, FlowNode.NORMAL_CONNECTION_TYPE);
		return {entry: entry, loop: loop, body: body};
	}

	/// #3: the body predecessor has no range; it is not reachable from the
	/// entry node without passing the loop node, so it stays on the loop node
	it('should keep the edge of a body predecessor without range on the loop node', function () {
		var cfg = singleLoop({bodyNodeHasRange: false, loopBodyHasRange: true});
		var decision = rightDecisionOf(branchsplitter.split(cfg.entry));
		cfg.body.normal.should.equal(cfg.loop);
		cfg.entry.normal.should.equal(decision);
		cfg.loop.loopRightSplit.should.eql(true);
	});

	/// with ranges the ranges decide as before
	it('should keep the edge of a body predecessor with range on the loop node', function () {
		var cfg = singleLoop({bodyNodeHasRange: true, loopBodyHasRange: true});
		var decision = rightDecisionOf(branchsplitter.split(cfg.entry));
		cfg.body.normal.should.equal(cfg.loop);
		cfg.entry.normal.should.equal(decision);
	});

	/// orchestrator decision: when the loop body itself has no range, the
	/// dominance decides too (the range check used to put every predecessor
	/// outside the body and redirect the back edge)
	it('should decide by dominance when the loop body has no range', function () {
		var cfg = singleLoop({bodyNodeHasRange: true, loopBodyHasRange: false});
		var decision = rightDecisionOf(branchsplitter.split(cfg.entry));
		cfg.body.normal.should.equal(cfg.loop);
		cfg.entry.normal.should.equal(decision);
	});

	/// #3': the predecessor without range is outside the for-of, in an outer
	/// while whose iteration comes back through the break of the for-of body:
	/// it is reachable from the entry node without passing the loop node, so
	/// it is redirected to the right-side decision (a "reachable from the
	/// first body node" rule would wrongly keep it)
	it('should redirect an outer predecessor without range reached back through break', function () {
		var program = jsParser.parseAST(fs.readFileSync(path.join(PROBES, 'us6-4.js'), 'utf8')),
			whileAst = program.body[1],
			statements = whileAst.body.body,
			forOf = statements[1],
			entry = factoryFlowNode.create(FlowNode.ENTRY_NODE_TYPE, program, null),
			exit = factoryFlowNode.create(FlowNode.EXIT_NODE_TYPE, null, null),
			whileNode = normalNode(whileAst),
			outer = normalNode(withoutRange(statements[0].expression)), /// k = 1;
			loop = normalNode(forOf),
			body = normalNode(withoutRange(forOf.body.body[0].expression)), /// y = x;
			breakNode = normalNode(forOf.body.body[1]), /// break;
			after = normalNode(withoutRange(statements[2].expression)); /// c = 0;
		entry.connect(whileNode, FlowNode.NORMAL_CONNECTION_TYPE);
		whileNode.connect(outer, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		whileNode.connect(exit, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		outer.connect(loop, FlowNode.NORMAL_CONNECTION_TYPE);
		loop.connect(body, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		loop.connect(after, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		body.connect(breakNode, FlowNode.NORMAL_CONNECTION_TYPE);
		breakNode.connect(after, FlowNode.NORMAL_CONNECTION_TYPE);
		after.connect(whileNode, FlowNode.NORMAL_CONNECTION_TYPE);

		var decision = rightDecisionOf(branchsplitter.split(entry));
		outer.normal.should.equal(decision);
		loop.prev.should.not.containEql(outer);
	});

	/// #4: us6-4.js (outer while + break) keeps the intra-procedural pairs
	describe('us6-4.js', function () {
		after(analyze.reset);

		it('should keep the intra-procedural pairs of the page', function () {
			analyze(fs.readFileSync(path.join(PROBES, 'us6-4.js'), 'utf8')).intraProcedural().should.eql([
				'c: L1 -> L2>L3:T', 'c: L1 -> L2>exit:F',
				'c: L8 -> L2>L3:T', 'c: L8 -> L2>exit:F',
				's: L1 -> L4>L4:F', 's: L1 -> L4>L4:T',
				'x: L4 -> L5'
			]);
		});
	});
});
