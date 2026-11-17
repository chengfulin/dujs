/*
 * Test cases of the control flow of try/finally built by lib/esgraph
 * (feature 005, User Story 6, FR-013, research R6, data-model §7–§8):
 * - an exception in a try block goes to the catch clause, else to the entry of
 *   a non-empty finally block, else to the outer handler; an exception in a
 *   catch body goes to the entry of a non-empty finally block, else to the
 *   outer handler;
 * - return, break and continue leaving a try block (or a catch clause) go
 *   through every non-empty finally block on the way to their target;
 * - a non-empty finally block entered otherwise than by the normal completion
 *   of its try block ends at a finallyExit node: normal edge to the successor
 *   of the try statement (normal entry), exception edge to the outer handler
 *   (exceptional entry) and a finally edge to each pending target of a jump;
 * - an empty finally block (finally {}, finally { ; }) is the same as no
 *   finally block.
 * The programs keep one statement per line; an identifier statement (a;)
 * does not throw, a call statement (a();) may throw.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var should = require('should');
var esgraph = require('../../lib/esgraph'),
	jsParser = require('../../lib/dujs/jsparser'),
	FlowNode = require('../../lib/esgraph/flownode'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder');

/**
 * CFG of a program (or of the body of its first function declaration) with lookups
 * @param {Array} lines lines of the program
 * @param {boolean} [ofFunction] build the CFG of the body of the first function
 * @returns {Object} {cfg, entry, exit, at(line), finallyExits()}
 */
function cfgOf(lines, ofFunction) {
	'use strict';
	var source = lines.join('\n'),
		ast = jsParser.parseAST(source);
	if (ofFunction) {
		ast = ast.body[0].body;
	}
	var cfg = esgraph(ast);
	function lineOf(node) {
		if (node.type === FlowNode.FINALLY_EXIT_NODE_TYPE) {
			return node.line;
		}
		return !!node.astNode && !!node.astNode.loc ? node.astNode.loc.start.line : null;
	}
	return {
		cfg: cfg,
		source: source,
		entry: cfg[0],
		exit: cfg[1],
		/** the node of a line (not a finallyExit); throws when there is not exactly one */
		at: function (line) {
			var found = cfg[2].filter(function (node) {
				return node.type === FlowNode.NORMAL_NODE_TYPE && lineOf(node) === line;
			});
			if (found.length !== 1) {
				throw new Error(found.length + ' nodes at line ' + line);
			}
			return found[0];
		},
		/** whether a node of a line is in the graph */
		has: function (line) {
			return cfg[2].some(function (node) {
				return node.type === FlowNode.NORMAL_NODE_TYPE && lineOf(node) === line;
			});
		},
		finallyExits: function () {
			return cfg[2].filter(function (node) {
				return node.type === FlowNode.FINALLY_EXIT_NODE_TYPE;
			});
		}
	};
}

/**
 * The only finallyExit node of a graph
 * @param {Object} graph result of cfgOf
 * @returns {FlowNode}
 */
function onlyFinallyExit(graph) {
	'use strict';
	var found = graph.finallyExits();
	found.should.have.length(1);
	return found[0];
}

describe('esgraph try/finally (feature 005 US6)', function () {
	'use strict';
	after(function () {
		cfgBuilder.resetGraphNodeCounter();
	});

	describe('exceptions in a try block', function () {
		it('should go to the catch clause, and from the catch body to the non-empty finally block', function () {
			var graph = cfgOf([
				'try {',
				'a();',
				'} catch (e) {',
				'b();',
				'} finally {',
				'c();',
				'}',
				'd;'
			]);
			graph.at(2).exception.should.equal(graph.at(3));
			graph.at(2).normal.should.equal(graph.at(6));
			graph.at(4).exception.should.equal(graph.at(6));
			graph.at(4).normal.should.equal(graph.at(6));
			/// entered by an exception of the catch body: the end of the finally block goes to a finallyExit
			var finallyExit = onlyFinallyExit(graph);
			graph.at(6).normal.should.equal(finallyExit);
			graph.at(6).exception.should.equal(graph.exit);
			finallyExit.normal.should.equal(graph.at(8));
			finallyExit.exception.should.equal(graph.exit);
			finallyExit.finally.should.eql([]);
			finallyExit.line.should.eql(7);
			should(finallyExit.astNode).equal(null);
		});

		it('should go to the non-empty finally block without a catch clause', function () {
			var graph = cfgOf([
				'try {',
				'a();',
				'} finally {',
				'c;',
				'}',
				'd;'
			]);
			graph.at(2).exception.should.equal(graph.at(4));
			graph.at(2).normal.should.equal(graph.at(4));
			var finallyExit = onlyFinallyExit(graph);
			graph.at(4).normal.should.equal(finallyExit);
			finallyExit.normal.should.equal(graph.at(6));
			finallyExit.exception.should.equal(graph.exit);
			finallyExit.line.should.eql(5);
		});

		it('should go to the catch clause, and from the catch body to the outer handler, with an empty finally', function () {
			var graph = cfgOf([
				'try {',
				'a();',
				'} catch (e) {',
				'b();',
				'} finally {',
				'}',
				'd;'
			]);
			graph.at(2).exception.should.equal(graph.at(3));
			graph.at(4).exception.should.equal(graph.exit);
			graph.at(4).normal.should.equal(graph.at(7));
			graph.finallyExits().should.have.length(0);
		});

		/// P18: the exception does not reach the statement after the try statement
		['finally {', 'finally { ;'].forEach(function (head) {
			it('should go to the outer handler without a catch clause, with an empty finally (' + head + ' })', function () {
				var graph = cfgOf([
					'try {',
					'a();',
					'} ' + head,
					'}',
					'd;'
				]);
				graph.at(2).exception.should.equal(graph.exit);
				graph.at(2).normal.should.equal(graph.at(5));
				graph.finallyExits().should.have.length(0);
			});
		});

		it('should go to the outer catch clause through the finally block of an inner try statement', function () {
			var graph = cfgOf([
				'try {',
				'try {',
				'a();',
				'} finally {',
				'b;',
				'}',
				'c;',
				'} catch (e) {',
				'd;',
				'}'
			]);
			graph.at(3).exception.should.equal(graph.at(5));
			var finallyExit = onlyFinallyExit(graph);
			graph.at(5).normal.should.equal(finallyExit);
			finallyExit.normal.should.equal(graph.at(7));
			finallyExit.exception.should.equal(graph.at(8));
		});
	});

	describe('a finally block entered only by the normal completion', function () {
		it('should go on after the try statement without a finallyExit', function () {
			var graph = cfgOf([
				'try {',
				'a;',
				'} finally {',
				'b;',
				'}',
				'c;'
			]);
			graph.at(2).normal.should.equal(graph.at(4));
			graph.at(4).normal.should.equal(graph.at(6));
			graph.finallyExits().should.have.length(0);
		});
	});

	describe('jumps through finally blocks', function () {
		it('should go from return through the finally block to the exit (in a function)', function () {
			var graph = cfgOf([
				'function f() {',
				'try {',
				'a;',
				'return;',
				'} finally {',
				'b;',
				'}',
				'c;',
				'}'
			], true);
			graph.at(3).normal.should.equal(graph.at(4));
			graph.at(4).normal.should.equal(graph.at(6));
			var finallyExit = onlyFinallyExit(graph);
			graph.at(6).normal.should.equal(finallyExit);
			finallyExit.finally.should.eql([graph.exit]);
			should(finallyExit.normal).equal(null);
			should(finallyExit.exception).equal(null);
			/// the try block never completes normally: the statement after the try statement is unreachable
			graph.has(8).should.eql(false);
		});

		it('should go from return in a catch body through the finally block', function () {
			var graph = cfgOf([
				'function f() {',
				'try {',
				'a();',
				'} catch (e) {',
				'return;',
				'} finally {',
				'b;',
				'}',
				'c;',
				'}'
			], true);
			graph.at(5).normal.should.equal(graph.at(7));
			var finallyExit = onlyFinallyExit(graph);
			finallyExit.finally.should.eql([graph.exit]);
			/// the try block completes normally as well
			finallyExit.normal.should.equal(graph.at(9));
			should(finallyExit.exception).equal(null);
		});

		it('should go from break through the finally block to the statement after the loop', function () {
			var graph = cfgOf([
				'while (p) {',
				'try {',
				'a;',
				'break;',
				'} finally {',
				'b;',
				'}',
				'}',
				'c;'
			]);
			graph.at(3).normal.should.equal(graph.at(6));
			var finallyExit = onlyFinallyExit(graph);
			graph.at(6).normal.should.equal(finallyExit);
			finallyExit.finally.should.eql([graph.at(9)]);
			should(finallyExit.normal).equal(null);
		});

		it('should go from continue through the finally block to the test of the loop', function () {
			var graph = cfgOf([
				'while (p) {',
				'try {',
				'a;',
				'continue;',
				'} finally {',
				'b;',
				'}',
				'c;',
				'}',
				'd;'
			]);
			graph.at(3).normal.should.equal(graph.at(6));
			var finallyExit = onlyFinallyExit(graph);
			finallyExit.finally.should.eql([graph.at(1)]);
			should(finallyExit.normal).equal(null);
			graph.has(8).should.eql(false);
		});

		it('should go from a labeled break of the page through the finally block to the exit', function () {
			var graph = cfgOf([
				'out: try {',
				'a;',
				'break out;',
				'} finally {',
				'b;',
				'}'
			]);
			graph.entry.normal.should.equal(graph.at(2));
			graph.at(2).normal.should.equal(graph.at(5));
			var finallyExit = onlyFinallyExit(graph);
			finallyExit.finally.should.eql([graph.exit]);
		});

		it('should go through two nested finally blocks in order', function () {
			var graph = cfgOf([
				'function f() {',
				'try {',
				'try {',
				'a;',
				'return;',
				'} finally {',
				'b;',
				'}',
				'} finally {',
				'c;',
				'}',
				'}'
			], true);
			graph.at(4).normal.should.equal(graph.at(5));
			graph.at(5).normal.should.equal(graph.at(7));
			var finallyExits = graph.finallyExits();
			finallyExits.should.have.length(2);
			var inner = finallyExits.filter(function (node) {
					return node.line === 8;
				})[0],
				outer = finallyExits.filter(function (node) {
					return node.line === 11;
				})[0];
			graph.at(7).normal.should.equal(inner);
			inner.finally.should.eql([graph.at(10)]);
			graph.at(10).normal.should.equal(outer);
			outer.finally.should.eql([graph.exit]);
			/// neither finally block is entered by a normal completion
			should(inner.normal).equal(null);
			should(outer.normal).equal(null);
		});

		it('should not go through an empty finally block', function () {
			var graph = cfgOf([
				'while (p) {',
				'try {',
				'a;',
				'break;',
				'} finally {',
				'}',
				'}',
				'c;'
			]);
			graph.at(3).normal.should.equal(graph.at(8));
			graph.finallyExits().should.have.length(0);
		});

		it('should not be caught by the finally block of the outer function (nested function boundary)', function () {
			var graph = cfgOf([
				'function f() {',
				'try {',
				'function g() {',
				'return;',
				'}',
				'a;',
				'} finally {',
				'b;',
				'}',
				'}'
			], true);
			/// the return of g is in the CFG of g, not of f: f only enters its finally block normally
			graph.at(6).normal.should.equal(graph.at(8));
			graph.finallyExits().should.have.length(0);
			var gGraph = cfgOf([
				'function g() {',
				'return;',
				'}'
			], true);
			gGraph.at(2).normal.should.equal(gGraph.exit);
		});

		it('should not route a break whose target is inside the try block', function () {
			var graph = cfgOf([
				'try {',
				'while (p) {',
				'break;',
				'}',
				'a;',
				'} finally {',
				'b;',
				'}'
			]);
			graph.at(2).true.should.equal(graph.at(5));
			graph.finallyExits().should.have.length(0);
		});
	});

	describe('jumps and exceptions inside the finally block', function () {
		it('should go from break in the finally block directly to its target (overriding the pending exception)', function () {
			var graph = cfgOf([
				'while (p) {',
				'try {',
				'a();',
				'} finally {',
				'break;',
				'}',
				'}',
				'c;'
			]);
			/// the finally block has no node of its own: its entry is the target of the break
			graph.at(3).exception.should.equal(graph.at(8));
			graph.at(3).normal.should.equal(graph.at(8));
			graph.finallyExits().should.have.length(0);
		});

		it('should go from an exception in the finally block to the outer handler', function () {
			var graph = cfgOf([
				'function f() {',
				'try {',
				'return;',
				'} finally {',
				'b();',
				'}',
				'}'
			], true);
			graph.at(3).normal.should.equal(graph.at(5));
			graph.at(5).exception.should.equal(graph.exit);
			var finallyExit = onlyFinallyExit(graph);
			finallyExit.finally.should.eql([graph.exit]);
		});

		it('should go from return in an inner finally block through the outer finally block', function () {
			var graph = cfgOf([
				'function f() {',
				'try {',
				'try {',
				'a();',
				'} finally {',
				'return;',
				'}',
				'} finally {',
				'c;',
				'}',
				'}'
			], true);
			graph.at(4).exception.should.equal(graph.at(6));
			graph.at(6).normal.should.equal(graph.at(9));
			var finallyExit = onlyFinallyExit(graph);
			finallyExit.line.should.eql(10);
			graph.at(9).normal.should.equal(finallyExit);
			finallyExit.finally.should.eql([graph.exit]);
		});

		/// a jump in the finally block to the successor of the try statement is a jump, not
		/// the end of the finally block: it does not go to the finallyExit and it overrides
		/// the pending return or exception
		it('should go from continue in the finally block to the loop test, overriding the pending return', function () {
			var graph = cfgOf([
				'function f() {',
				'while (t) {',
				'try {',
				'return a();',
				'} finally {',
				'if (x) continue;',
				'b();',
				'}',
				'}',
				'}'
			], true);
			graph.at(4).normal.should.equal(graph.at(6));
			graph.at(6).true.should.equal(graph.at(2));
			var finallyExit = onlyFinallyExit(graph);
			graph.at(7).normal.should.equal(finallyExit);
			graph.at(2).prev.should.not.containEql(finallyExit);
			should(finallyExit.normal).equal(null);
			finallyExit.finally.should.eql([graph.exit]);
			finallyExit.exception.should.equal(graph.exit);
		});

		it('should go from a labeled break in the finally block to its target, overriding the pending exception', function () {
			var graph = cfgOf([
				'lbl: {',
				'try {',
				'throw 1;',
				'} finally {',
				'if (x) break lbl;',
				'b();',
				'}',
				'}',
				'z();'
			]);
			graph.at(3).exception.should.equal(graph.at(5));
			graph.has(9).should.be.true();
			graph.at(5).true.should.equal(graph.at(9));
			var finallyExit = onlyFinallyExit(graph);
			graph.at(6).normal.should.equal(finallyExit);
			should(finallyExit.normal).equal(null);
			finallyExit.exception.should.equal(graph.exit);
			finallyExit.finally.should.eql([]);
		});

		it('should take a finally block of only a continue as non-empty: its entry is the loop test', function () {
			var graph = cfgOf([
				'function f() {',
				'while (t) {',
				'try {',
				'return a();',
				'} finally {',
				'continue;',
				'}',
				'}',
				'}'
			], true);
			graph.at(4).normal.should.equal(graph.at(2));
			graph.at(4).exception.should.equal(graph.at(2));
			graph.exit.prev.should.eql([graph.at(2)]);
			graph.finallyExits().should.have.length(0);
		});

		/// the finallyExit has a normal edge: the continue does not go through it (no exception
		/// or finally edge on the path of the continue)
		it('should go from continue in the finally block to the loop test, not through the finallyExit', function () {
			var graph = cfgOf([
				'while (t) {',
				'try {',
				'a();',
				'} finally {',
				'if (x) continue;',
				'b();',
				'}',
				'}',
				'z();'
			]);
			graph.at(5).true.should.equal(graph.at(1));
			var finallyExit = onlyFinallyExit(graph);
			graph.at(6).normal.should.equal(finallyExit);
			finallyExit.prev.should.eql([graph.at(6)]);
			finallyExit.normal.should.equal(graph.at(1));
			finallyExit.exception.should.equal(graph.exit);
		});
	});

	describe('a finally block entered in several ways', function () {
		/// golden page0 parseSaved: the catch body may throw, the try block completes normally
		it('should continue by the union of the ways (in a function)', function () {
			var graph = cfgOf([
				'function f() {',
				'try {',
				'a();',
				'if (p) {',
				'return;',
				'}',
				'} catch (e) {',
				'b();',
				'} finally {',
				'c;',
				'}',
				'd;',
				'}'
			], true);
			var finallyExit = onlyFinallyExit(graph);
			graph.at(8).exception.should.equal(graph.at(10));
			graph.at(10).normal.should.equal(finallyExit);
			finallyExit.normal.should.equal(graph.at(12));
			finallyExit.exception.should.equal(graph.exit);
			finallyExit.finally.should.eql([graph.exit]);
		});

		it('should continue by the union of the ways (in the page)', function () {
			var graph = cfgOf([
				'try {',
				'a();',
				'} catch (e) {',
				'b();',
				'} finally {',
				'c;',
				'}',
				'd;'
			]);
			var finallyExit = onlyFinallyExit(graph);
			finallyExit.normal.should.equal(graph.at(8));
			finallyExit.exception.should.equal(graph.exit);
		});
	});

	describe('nodes and output', function () {
		var program = [
			'function f() {',
			'try {',
			'a;',
			'return;',
			'} finally {',
			'b;',
			'}',
			'}'
		];

		it('should list the finallyExit node in the nodes of the graph', function () {
			var graph = cfgOf(program, true),
				finallyExit = onlyFinallyExit(graph);
			graph.cfg[2].indexOf(finallyExit).should.not.eql(-1);
			graph.cfg[2].indexOf(graph.exit).should.not.eql(-1);
			var ids = graph.cfg[2].map(function (node) {
				return node.cfgId;
			});
			ids.forEach(function (id, index) {
				ids.indexOf(id).should.eql(index);
			});
		});

		it('should take the end line of the finally block as the line of the finallyExit node (cfgbuilder)', function () {
			var cfg = cfgBuilder.getCFG(jsParser.parseAST(program.join('\n')).body[0].body),
				finallyExit = cfg[2].filter(function (node) {
					return node.type === FlowNode.FINALLY_EXIT_NODE_TYPE;
				})[0];
			finallyExit.line.should.eql(7);
			cfg[1].line.should.eql(6);
		});

		it('should draw the finallyExit node as an ellipse labeled by its type and the finally edge', function () {
			var graph = cfgOf(program, true),
				output = esgraph.dot(graph.cfg, {source: graph.source}),
				index = graph.cfg[2].indexOf(onlyFinallyExit(graph)),
				exitIndex = graph.cfg[2].indexOf(graph.exit);
			output.should.containEql('n' + index + ' [label="finallyExit", shape="ellipse", style="filled", fillcolor="yellow"]');
			output.should.containEql('n' + index + ' -> n' + exitIndex + ' [label="finally"]');
		});
	});
});
