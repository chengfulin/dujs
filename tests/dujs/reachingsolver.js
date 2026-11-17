/*
 * Test cases of the edge-type-aware reaching definitions solver
 * (specs/005-summary-analysis, contracts/lib-api.md §2, data-model §6,
 * research R2): the contribution of each predecessor depends on the type of
 * the edge (an exception edge carries IN of its source, FR-014); without
 * options.calls and options.loops the solver is in the compatible mode (return
 * edges and the edges from handler exits to LOOP RETURN carry OUT, and the
 * transitional rule exceptionToCalleeExitCarriesOut of analyze Q1).
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	path = require('path');
var should = require('should');
var solver = require('../../lib/dujs/reachingsolver'),
	FlowNode = require('../../lib/esgraph/flownode'),
	Var = require('../../lib/dujs/var'),
	factoryDef = require('../../lib/dujs/deffactory'),
	factoryVarDef = require('../../lib/dujs/vardeffactory'),
	analyze = require('../helpers/analyze');
var Set = require('../../lib/analyses/set');

var PROBES = path.join(__dirname, 'cases', 'probes005');

/**
 * A VarDef of a variable defined at a node
 * @param {Var} variable
 * @param {FlowNode} node
 * @returns {VarDef}
 */
function vardefOf(variable, node) {
	'use strict';
	return factoryVarDef.create(variable, factoryDef.createLiteralDef(node, [0, 1]));
}

/**
 * A graph [entry, exit, nodes] of hand-built nodes
 * @param {Array} nodes the first is the entry, the second the exit
 * @returns {Array}
 */
function graphOf(nodes) {
	'use strict';
	return [nodes[0], nodes[1], nodes];
}

/**
 * Options generating the definitions of a Map(FlowNode, Array of VarDef)
 * @param {Map} gens
 * @param {Object} [extra] other options
 * @returns {Object}
 */
function optionsOf(gens, extra) {
	'use strict';
	var options = {
		generateOf: function (node) {
			return new Set(gens.get(node) || []);
		},
		useOf: function () {}
	};
	Object.keys(extra || {}).forEach(function (key) {
		options[key] = extra[key];
	});
	return options;
}

/**
 * Whether a set has exactly the given items
 * @param {Set} set
 * @param {Array} items
 */
function shouldHaveExactly(set, items) {
	'use strict';
	set.values().should.have.length(items.length);
	items.forEach(function (item) {
		set.has(item).should.be.true();
	});
}

describe('reachingsolver', function () {
	'use strict';
	var x, y;
	beforeEach(function () {
		x = new Var('x');
		y = new Var('y');
	});

	describe('contributions of the edges', function () {
		/// entry defines x (d0); p redefines x (d1); n is reached from p by the edge of a type
		function solveWithEdge(type) {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				p = new FlowNode(),
				n = new FlowNode(),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, p),
				gens = new Map([[entry, [d0]], [p, [d1]]]);
			entry.connect(p);
			p.connect(n, type);
			n.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, p, n]), optionsOf(gens));
			return {result: solved.results.get(n), d0: d0, d1: d1};
		}

		[
			FlowNode.NORMAL_CONNECTION_TYPE,
			FlowNode.TRUE_BRANCH_CONNECTION_TYPE,
			FlowNode.FALSE_BRANCH_CONNECTION_TYPE,
			FlowNode.CALL_CONNECTION_TYPE,
			FlowNode.ON_EVENT_CONNECTION_TYPE,
			FlowNode.LOAD_STROAGE_CONNECTION_TYPE,
			FlowNode.SAVE_STORAGE_CONNECTION_TYPE
		].forEach(function (type) {
			it('should carry OUT of the source by the ' + type + ' edge', function () {
				var solved = solveWithEdge(type);
				shouldHaveExactly(solved.result.in, [solved.d1]);
			});
		});

		it('should carry IN of the source by the exception edge (FR-014)', function () {
			var solved = solveWithEdge(FlowNode.EXCEPTION_CONNECTION_TYPE);
			shouldHaveExactly(solved.result.in, [solved.d0]);
		});

		it('should merge the contributions of all predecessors', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				p = new FlowNode(),
				h = new FlowNode(),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, p),
				dy = vardefOf(y, p);
			entry.connect(p);
			p.connect(h, FlowNode.EXCEPTION_CONNECTION_TYPE);
			p.connect(h, FlowNode.NORMAL_CONNECTION_TYPE);
			h.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, p, h]), optionsOf(new Map([[entry, [d0]], [p, [d1, dy]]])));
			shouldHaveExactly(solved.results.get(h).in, [d0, d1, dy]);
		});
	});

	describe('compatible mode (no calls nor loops)', function () {
		it('should carry OUT of the callee exit by the return edge', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				calleeExit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				callReturn = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, calleeExit);
			entry.connect(calleeExit);
			calleeExit.connect(callReturn, FlowNode.RETURN_CONNECTION_TYPE);
			callReturn.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, calleeExit, callReturn]),
				optionsOf(new Map([[entry, [d0]], [calleeExit, [d1]]])));
			shouldHaveExactly(solved.results.get(callReturn).in, [d1]);
		});

		it('should carry OUT of a handler exit to the LOOP RETURN', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				handlerExit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				loopReturn = new FlowNode(FlowNode.LOOP_RETURN_NODE_TYPE),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, handlerExit);
			entry.connect(handlerExit);
			handlerExit.connect(loopReturn);
			loopReturn.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, handlerExit, loopReturn]),
				optionsOf(new Map([[entry, [d0]], [handlerExit, [d1]]])));
			shouldHaveExactly(solved.results.get(loopReturn).in, [d1]);
		});

		describe('transitional rule exceptionToCalleeExitCarriesOut (analyze Q1)', function () {
			/// p (x = d1 after d0 of entry) throws to the callee exit (with a return edge) and to a handler h
			function solveTransitional(rule) {
				var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
					exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
					p = new FlowNode(),
					q = new FlowNode(),
					h = new FlowNode(),
					calleeExit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
					plainExit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
					callReturn = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE),
					d0 = vardefOf(x, entry),
					d1 = vardefOf(x, p),
					d2 = vardefOf(x, q);
				entry.connect(p);
				p.connect(calleeExit, FlowNode.EXCEPTION_CONNECTION_TYPE);
				p.connect(q);
				q.connect(h, FlowNode.EXCEPTION_CONNECTION_TYPE);
				q.connect(plainExit);
				h.connect(plainExit);
				calleeExit.connect(callReturn, FlowNode.RETURN_CONNECTION_TYPE);
				callReturn.connect(exit);
				var options = optionsOf(new Map([[entry, [d0]], [p, [d1]], [q, [d2]]]));
				if (rule !== undefined) {
					options.exceptionToCalleeExitCarriesOut = rule;
				}
				var solved = solver.solve(graphOf([entry, exit, p, q, h, calleeExit, plainExit, callReturn]), options);
				return {
					calleeExit: solved.results.get(calleeExit).in,
					handler: solved.results.get(h).in,
					d0: d0, d1: d1, d2: d2
				};
			}

			it('should carry OUT by the exception edge to a callee exit when on', function () {
				var solved = solveTransitional(true);
				shouldHaveExactly(solved.calleeExit, [solved.d1]);
				/// other exception edges still carry IN
				shouldHaveExactly(solved.handler, [solved.d1]);
			});

			it('should carry IN by the exception edge to an exit without return edge when on', function () {
				var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
					exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
					p = new FlowNode(),
					d0 = vardefOf(x, entry),
					d1 = vardefOf(x, p);
				entry.connect(p);
				p.connect(exit, FlowNode.EXCEPTION_CONNECTION_TYPE);
				p.connect(exit);
				var solved = solver.solve(graphOf([entry, exit, p]),
					optionsOf(new Map([[entry, [d0]], [p, [d1]]]), {exceptionToCalleeExitCarriesOut: true}));
				shouldHaveExactly(solved.exitArrivals.exceptional, [d0]);
				shouldHaveExactly(solved.exitArrivals.normal, [d1]);
			});

			it('should carry IN by the exception edge to a callee exit when off', function () {
				var solved = solveTransitional(false);
				shouldHaveExactly(solved.calleeExit, [solved.d0]);
				shouldHaveExactly(solved.handler, [solved.d1]);
				var byDefault = solveTransitional();
				shouldHaveExactly(byDefault.calleeExit, [byDefault.d0]);
			});
		});
	});

	describe('transfer', function () {
		it('should compute OUT = (IN - KILL) U GEN and give GEN and KILL', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				p = new FlowNode(),
				d0 = vardefOf(x, entry),
				dy = vardefOf(y, entry),
				d1 = vardefOf(x, p);
			entry.connect(p);
			p.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, p]), optionsOf(new Map([[entry, [d0, dy]], [p, [d1]]]))),
				result = solved.results.get(p);
			shouldHaveExactly(result.in, [d0, dy]);
			shouldHaveExactly(result.kill, [d0]);
			shouldHaveExactly(result.generate, [d1]);
			shouldHaveExactly(result.out, [dy, d1]);
		});

		it('should kill the invisible definitions at an entry and the locals at an exit (computeKILLSet)', function () {
			var outer = new Var('outer'),
				local = new Var('local'),
				hidden = new Var('hidden'),
				rootScope = {variables: [outer], parent: null, binding: null},
				calleeScope = {
					variables: [local],
					parent: rootScope,
					binding: null,
					getVariablesIncludingBlockScopes: function () {
						return [local];
					}
				},
				pageEntry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				calleeEntry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				body = new FlowNode(),
				calleeExit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				dOuter = vardefOf(outer, pageEntry),
				dHidden = vardefOf(hidden, pageEntry),
				dLocal = vardefOf(local, body);
			calleeEntry.scope = calleeScope;
			calleeExit.scope = calleeScope;
			pageEntry.connect(calleeEntry, FlowNode.CALL_CONNECTION_TYPE);
			calleeEntry.connect(body);
			body.connect(calleeExit);
			calleeExit.connect(exit);
			var solved = solver.solve(graphOf([pageEntry, exit, calleeEntry, body, calleeExit]),
				optionsOf(new Map([[pageEntry, [dOuter, dHidden]], [body, [dLocal]]])));
			shouldHaveExactly(solved.results.get(calleeEntry).kill, [dHidden]);
			shouldHaveExactly(solved.results.get(calleeEntry).out, [dOuter]);
			shouldHaveExactly(solved.results.get(calleeExit).kill, [dLocal]);
			shouldHaveExactly(solved.results.get(calleeExit).out, [dOuter]);
		});

		it('should take entryInput as IN of the entry (default empty)', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				sentinel = vardefOf(x, entry);
			entry.connect(exit);
			var solved = solver.solve(graphOf([entry, exit]), optionsOf(new Map(), {entryInput: new Set([sentinel])}));
			shouldHaveExactly(solved.results.get(entry).in, [sentinel]);
			shouldHaveExactly(solved.results.get(exit).in, [sentinel]);
			shouldHaveExactly(solver.solve(graphOf([entry, exit]), optionsOf(new Map())).results.get(entry).in, []);
		});

		it('should reach a fixed point over a loop and call useOf for every analyzed node', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				head = new FlowNode(),
				body = new FlowNode(),
				unreachable = new FlowNode(),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, body),
				used = [];
			entry.connect(head);
			head.connect(body, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			head.connect(exit, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			body.connect(head);
			var options = optionsOf(new Map([[entry, [d0]], [body, [d1]]]));
			options.useOf = function (node) {
				if (used.indexOf(node) === -1) {
					used.push(node);
				}
			};
			var solved = solver.solve(graphOf([entry, exit, head, body, unreachable]), options);
			shouldHaveExactly(solved.results.get(head).in, [d0, d1]);
			shouldHaveExactly(solved.results.get(exit).in, [d0, d1]);
			solved.results.has(unreachable).should.be.false();
			used.should.have.length(4);
			used.indexOf(unreachable).should.eql(-1);
		});
		it('should re-enqueue the exception successors when only IN changes (OUT unchanged)', function () {
			/// p always redefines x, so OUT(p) stays {d2} while IN(p) grows from {d0} to {d0, d1}
			/// over the loop; t, reached from p by an exception edge, must get the later d1
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				head = new FlowNode(),
				body = new FlowNode(),
				p = new FlowNode(),
				t = new FlowNode(),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, body),
				d2 = vardefOf(x, p);
			entry.connect(head);
			head.connect(body, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			head.connect(p, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			body.connect(head);
			p.connect(exit);
			p.connect(t, FlowNode.EXCEPTION_CONNECTION_TYPE);
			t.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, head, body, p, t]),
				optionsOf(new Map([[entry, [d0]], [body, [d1]], [p, [d2]]])));
			shouldHaveExactly(solved.results.get(p).out, [d2]);
			shouldHaveExactly(solved.results.get(t).in, [d0, d1]);
		});
	});

	describe('extraReachIns (compatible mode)', function () {
		it('should merge the extra definitions computed from the current OUT of another node', function () {
			/// r is analyzed before c; it is enqueued again when OUT(c) changes
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				r = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE),
				a = new FlowNode(),
				c = new FlowNode(),
				after = new FlowNode(),
				dc = vardefOf(x, c),
				da = vardefOf(y, a);
			entry.connect(r);
			entry.connect(a, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			a.connect(c);
			c.connect(exit);
			r.connect(after);
			after.connect(exit);
			var options = optionsOf(new Map([[a, [da]], [c, [dc]]]), {
				extraReachIns: function (node, outOf) {
					return (node === r) ? outOf(c) : null;
				}
			});
			var solved = solver.solve(graphOf([entry, exit, r, a, c, after]), options);
			shouldHaveExactly(solved.results.get(r).in, [da, dc]);
			shouldHaveExactly(solved.results.get(after).in, [da, dc]);
		});
		it('should analyze a node reached only by its extra definitions when the OUT it reads changes', function () {
			/// the CALL RETURN NODE r of a callee that never returns has no analyzed predecessor
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				c = new FlowNode(),
				deadExit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				r = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE),
				dc = vardefOf(x, c);
			entry.connect(c);
			c.connect(exit);
			deadExit.connect(r, FlowNode.RETURN_CONNECTION_TYPE);
			r.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, c, deadExit, r]), optionsOf(new Map([[c, [dc]]]), {
				extraReachIns: function (node, outOf) {
					return (node === r) ? outOf(c) : null;
				}
			}));
			shouldHaveExactly(solved.results.get(r).in, [dc]);
			solved.results.has(deadExit).should.be.false();
		});
	});

	describe('result', function () {
		it('should not write the analysis results into the nodes', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				p = new FlowNode(),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, p);
			entry.connect(p);
			p.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, p]), optionsOf(new Map([[entry, [d0]], [p, [d1]]])));
			(solved.results instanceof Map).should.be.true();
			[entry, exit, p].forEach(function (node) {
				should.not.exist(node._testonly_._reachIns);
				should.not.exist(node._testonly_._reachOuts);
				should.not.exist(node._testonly_._kill);
				should.not.exist(node._testonly_._generate);
			});
		});

		it('should separate the arrivals at the exit by the type of the last edge', function () {
			var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
				exit = new FlowNode(FlowNode.EXIT_NODE_TYPE),
				p = new FlowNode(),
				q = new FlowNode(),
				d0 = vardefOf(x, entry),
				d1 = vardefOf(x, p),
				d2 = vardefOf(y, q);
			entry.connect(p);
			p.connect(exit, FlowNode.EXCEPTION_CONNECTION_TYPE);
			p.connect(q);
			q.connect(exit);
			var solved = solver.solve(graphOf([entry, exit, p, q]),
				optionsOf(new Map([[entry, [d0]], [p, [d1]], [q, [d2]]])));
			shouldHaveExactly(solved.exitArrivals.exceptional, [d0]);
			shouldHaveExactly(solved.exitArrivals.normal, [d1, d2]);
			shouldHaveExactly(solved.results.get(exit).in, [d0, d1, d2]);
		});
	});

	/// FR-014 integration (c-out3.js): o.p throws before x is assigned at L4 (US6-7 is accepted in finallyflow.js)
	describe('FR-014 integration (c-out3)', function () {
		it('should give x of L1, not of L4, to the catch block', function () {
			var result = analyze(fs.readFileSync(path.join(PROBES, 'c-out3.js'), 'utf8'));
			[result.intraProcedural(), result.intraPage()].forEach(function (pairs) {
				pairs.should.containEql('x: L1 -> L6');
				pairs.should.not.containEql('x: L4 -> L6');
			});
		});
	});
});
