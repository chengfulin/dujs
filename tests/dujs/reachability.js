/*
 * Unit tests of the independent reachability checker tests/helpers/reachability.js
 * (specs/008-property-defs-method-calls, contracts/reachability.md, data-model §4;
 * FR-006, FR-007, FR-008; D003, D005, D014, D015, D019). Original dujs code, MIT
 * License (see LICENSE).
 *
 * The injection, positive-control, D014, D015, D019, fail-closed and independence
 * tests are the only guard that the checker really reports unreachable pairs
 * (plan "tasks guidance"): they must not be removed, merged or skipped.
 *
 * Models are wrapped with Object.create(model) and Object.defineProperty: the
 * accessors of Model read a private namespace keyed by the object itself, so the
 * wrapper defines every member the checker reads (graph, dupairs, level,
 * hierarchy, callSiteRecords, loopRecords) from the original model before
 * overriding one of them.
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	assert = require('assert'),
	analyze = require('../helpers/analyze'),
	Pair = require('../../lib/dujs/pair'),
	DUPair = require('../../lib/dujs/dupair'),
	Var = require('../../lib/dujs/var'),
	AnalysisSet = require('../../lib/analyses/set'),
	FlowNode = require('../../lib/esgraph/flownode');

var PROBES = path.join(__dirname, 'cases', 'probes008'),
	HELPER = path.join(__dirname, '..', 'helpers', 'reachability.js'),
	PAGE = '$DOMAIN.$PAGE_0';

/**
 * The checker (required lazily: each test fails on its own while it is missing)
 * @returns {Object}
 */
function checker() {
	'use strict';
	return require('../helpers/reachability');
}

/**
 * Source code of a probe program
 * @param {string} name file name in tests/dujs/cases/probes008
 * @returns {string}
 */
function probe(name) {
	'use strict';
	return fs.readFileSync(path.join(PROBES, name), 'utf8');
}

/**
 * Models of a program: {list, byName, inter, intraPage, intra(scope)}
 * @param {string|Array} code
 * @param {string} [programId]
 * @returns {Object}
 */
function modelsOf(code, programId) {
	'use strict';
	var list = checker().modelsOfPages(code, programId || 'test'),
		byName = {};
	list.forEach(function (entry) {
		byName[entry.modelName] = entry;
	});
	var inter = list.filter(function (entry) {
		return entry.model.level === 'inter-procedural' && entry.model.mainlyRelatedScope.name === PAGE;
	});
	return {
		list: list,
		byName: byName,
		/** the inter-procedural model of the page (null without one) */
		inter: inter.length > 0 ? inter[0] : null,
		intraPage: byName['intra-page[0]'],
		intra: function (scopeName) {
			return byName['intra(' + (scopeName || '$PAGE_0') + ')'];
		}
	};
}

/**
 * The inter-procedural model of the page and the intra-page model
 * @param {Object} models modelsOf
 * @returns {Array} entries {programId, modelName, model}
 */
function upperModels(models) {
	'use strict';
	return [models.inter, models.intraPage];
}

/**
 * Nodes of a model at a line, of a type or (without a type) not an entry or
 * exit node (an exit takes the line of the last statement)
 * @param {Model} model
 * @param {number} line
 * @param {string} [type]
 * @returns {Array}
 */
function nodesAt(model, line, type) {
	'use strict';
	return model.graph[2].filter(function (node) {
		return node.line === line && (!!type ? node.type === type :
			(node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE));
	});
}

/**
 * The only node of a model at a line (of a type)
 * @param {Model} model
 * @param {number} line
 * @param {string} [type]
 * @returns {FlowNode}
 */
function nodeAt(model, line, type) {
	'use strict';
	var nodes = nodesAt(model, line, type);
	nodes.length.should.equal(1, 'one node at L' + line + (type ? ' of type ' + type : ''));
	return nodes[0];
}

/**
 * Whether every node of a model at a line is (not) reachable
 * @param {Set} reached
 * @param {Model} model
 * @param {Array} lines
 * @param {boolean} expected
 */
function expectLines(reached, model, lines, expected) {
	'use strict';
	lines.forEach(function (line) {
		var nodes = nodesAt(model, line);
		nodes.length.should.be.above(0, 'nodes at L' + line);
		nodes.forEach(function (node) {
			reached.has(node).should.equal(expected, 'node ' + node.cfgId + ' (' + node.type + ') at L' + line +
				(expected ? ' reachable' : ' not reachable') + ' in the ' + model.level + ' model');
		});
	});
}

/**
 * Wrap a model: Object.create(model) with own copies of the members read by the
 * checker, then the overrides
 * @param {Model} model
 * @param {Object} overrides {graph, dupairs, level, hierarchy, callSiteRecords: Array, loopRecords: Array}
 * @returns {Object}
 */
function wrap(model, overrides) {
	'use strict';
	var wrapper = Object.create(model),
		values = {
			graph: model.graph,
			dupairs: model.dupairs,
			level: model.level,
			hierarchy: model.hierarchy,
			mainlyRelatedScope: model.mainlyRelatedScope
		},
		records = model.callSiteRecords(),
		loops = model.loopRecords();
	overrides = overrides || {};
	Object.keys(values).forEach(function (key) {
		Object.defineProperty(wrapper, key, {value: overrides.hasOwnProperty(key) ? overrides[key] : values[key]});
	});
	Object.defineProperty(wrapper, 'callSiteRecords', {
		value: function () {
			return [].concat(overrides.callSiteRecords || records);
		}
	});
	Object.defineProperty(wrapper, 'loopRecords', {
		value: function () {
			return [].concat(overrides.loopRecords || loops);
		}
	});
	return wrapper;
}

/**
 * Wrap a model whose dupairs are a copy of the original Map with one more pair
 * @param {Model} model
 * @param {Var} variable
 * @param {DUPair} dupair
 * @returns {Object}
 */
function withPair(model, variable, dupair) {
	'use strict';
	var dupairs = new Map(model.dupairs),
		pairs = new AnalysisSet(dupairs.has(variable) ? dupairs.get(variable).values() : []);
	pairs.add(dupair);
	dupairs.set(variable, pairs);
	return wrap(model, {dupairs: dupairs});
}

/**
 * Pair strings of violations
 * @param {Array} violations
 * @returns {Array}
 */
function pairsOf(violations) {
	'use strict';
	return violations.map(function (violation) {
		return violation.pair;
	});
}

describe('reachability checker (contracts/reachability.md)', function () {
	'use strict';
	this.timeout(20000);

	afterEach(function () {
		analyze.reset();
	});

	describe('rules (T012; §1, §2, §6 rule units)', function () {
		it('exports reachableNodes, normalReturns, violationsOf, check, assertInvariant and modelsOfPages', function () {
			['reachableNodes', 'normalReturns', 'violationsOf', 'check', 'assertInvariant', 'modelsOfPages']
				.forEach(function (name) {
					checker()[name].should.be.a.Function();
				});
		});

		it('modelsOfPages lists the models of the four levels with the names of §4', function () {
			var models = modelsOf(probe('p13-ki22-5.js'), 'probes008/p13-ki22-5.js'),
				names = models.list.map(function (entry) {
					return entry.modelName;
				});
			names.should.containDeep(['intra($PAGE_0)', 'inter-procedural[0]', 'inter-procedural[1]', 'intra-page[0]',
				'inter-page']);
			models.list.forEach(function (entry) {
				entry.programId.should.equal('probes008/p13-ki22-5.js');
			});
			models.byName['inter-page'].model.level.should.equal('inter-page');
			models.byName['intra-page[0]'].model.level.should.equal('intra-page');
			models.byName['intra($PAGE_0)'].model.level.should.equal('intra-procedural');
		});

		it('(a) nothing after an unconditional recursion is reachable (P13, P14, P15)', function () {
			[
				{name: 'p13-ki22-5.js', unreachable: [5, 9], reachable: [8]},
				{name: 'p14-rec-inner.js', unreachable: [4, 5, 8], reachable: [7]},
				{name: 'p15-mutual.js', unreachable: [5], reachable: [4]}
			].forEach(function (each) {
				upperModels(modelsOf(probe(each.name))).forEach(function (entry) {
					var reached = checker().reachableNodes(entry.model);
					expectLines(reached, entry.model, each.unreachable, false);
					nodesAt(entry.model, each.reachable[0], FlowNode.CALL_NODE_TYPE).forEach(function (node) {
						reached.has(node).should.be.true();
					});
				});
				analyze.reset();
			});
		});

		it('(a) P15: the assignment after g() in f (same line) is not reachable', function () {
			upperModels(modelsOf(probe('p15-mutual.js'))).forEach(function (entry) {
				var reached = checker().reachableNodes(entry.model),
					assignments = nodesAt(entry.model, 2).filter(function (node) {
						return !!node.astNode && node.astNode.type === 'AssignmentExpression';
					});
				assignments.length.should.equal(1);
				reached.has(assignments[0]).should.be.false();
			});
		});

		it('(a) the code after a conditional recursion is reachable (P16, P17)', function () {
			[
				{name: 'p16-cond-rec.js', reachable: [4, 7]},
				{name: 'p17-rec-loop-fn.js', reachable: [4, 6]}
			].forEach(function (each) {
				upperModels(modelsOf(probe(each.name))).forEach(function (entry) {
					expectLines(checker().reachableNodes(entry.model), entry.model, each.reachable, true);
				});
				analyze.reset();
			});
		});

		it('(a) normalReturns: false for the unconditional recursions, true for the conditional ones', function () {
			[
				{name: 'p13-ki22-5.js', expected: {'$ANONYMOUS_FUN_0': false}},
				{name: 'p14-rec-inner.js', expected: {f: false}},
				{name: 'p15-mutual.js', expected: {f: false, g: false}},
				{name: 'p16-cond-rec.js', expected: {f: true}},
				{name: 'p17-rec-loop-fn.js', expected: {f: true}}
			].forEach(function (each) {
				upperModels(modelsOf(probe(each.name))).forEach(function (entry) {
					var returns = checker().normalReturns(entry.model),
						byName = {};
					returns.forEach(function (value, scope) {
						byName[scope.name.split('.').slice(2).join('.')] = value;
					});
					byName.should.eql(each.expected, each.name + ' ' + entry.modelName);
				});
				analyze.reset();
			});
		});

		it('(b) the LOOP RETURN NODE of a LoopRecord without handler edges is reachable', function () {
			var models = modelsOf('var x = 1;\nconsole.log(x);\n');
			[models.intraPage, models.byName['inter-page']].forEach(function (entry) {
				var loops = entry.model.loopRecords();
				loops.length.should.equal(1);
				loops[0].handlers.length.should.equal(0);
				var reached = checker().reachableNodes(entry.model);
				reached.has(loops[0].loop).should.be.true();
				reached.has(loops[0].loopReturn).should.be.true();
			});
			/// the graph also has an onEvent edge LOOP -> LOOP RETURN here: a forged LoopRecord whose LOOP RETURN
			/// has no edge from the LOOP shows that (b) follows the record, not the graph
			var model = models.intraPage.model,
				loop = model.loopRecords()[0].loop,
				forgedReturn = {type: FlowNode.LOOP_RETURN_NODE_TYPE, scope: loop.scope, cfgId: -1, 'return': [loop]},
				graph = model.graph,
				wrapped = wrap(model, {
					graph: [graph[0], graph[1], graph[2].concat([forgedReturn])],
					loopRecords: [{loop: loop, loopReturn: forgedReturn, handlers: [], noHandler: true}]
				});
			checker().reachableNodes(wrapped).has(forgedReturn).should.be.true();
		});

		it('(c) after a finally entered only by an exception nothing is reachable; with (c) off it is', function () {
			/// the CFG keeps the normal edge of the finallyExit (the call may complete); the callee t only throws
			var code = 'var x = 0, y;\nfunction t() { throw x; }\ntry {\n  t();\n} finally {\n  y = 1;\n}\nconsole.log(y);\n',
				models = modelsOf(code);
			upperModels(models).forEach(function (entry) {
				var reached = checker().reachableNodes(entry.model);
				expectLines(reached, entry.model, [6], true);
				reached.has(nodeAt(entry.model, 7, FlowNode.FINALLY_EXIT_NODE_TYPE)).should.be.true();
				expectLines(reached, entry.model, [8], false);
				expectLines(checker().reachableNodes(entry.model, {finallyRule: false}), entry.model, [8], true);
			});
			/// intra-procedural: the call is opaque, the finally is entered normally
			expectLines(checker().reachableNodes(models.intra().model), models.intra().model, [6, 8], true);
		});

		it('(c) after a finally entered normally the code is reachable', function () {
			var code = 'var x = 0, y;\nfunction t() { return x; }\ntry {\n  t();\n} finally {\n  y = 1;\n}\nconsole.log(y);\n',
				models = modelsOf(code);
			[models.intra(), models.inter, models.intraPage].forEach(function (entry) {
				expectLines(checker().reachableNodes(entry.model), entry.model, [6, 8], true);
			});
		});

		it('(c) a finally with calls split into segments: the segment nodes and CALL RETURN NODEs are in the region', function () {
			/// plan known risk (D020 analyze M1): a segment node or CALL RETURN NODE placed outside region(T) would
			/// count as a non-exceptional entry and make L12 reachable
			var thrown = 'var x = 0, y;\nfunction g() { return 1; }\nfunction t() { throw 1; }\ntry {\n  t();\n' +
					'} finally {\n  y = g() + g();\n  if (g()) {\n    x = 2;\n  }\n}\nconsole.log(x);\n',
				models = modelsOf(thrown);
			upperModels(models).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model),
					noAst = nodesAt(model, 7).concat(nodesAt(model, 8)).filter(function (node) {
						return !node.astNode;
					});
				noAst.length.should.be.above(1, 'segment nodes without AST at L7, L8');
				expectLines(reached, model, [7, 8, 9], true);
				expectLines(reached, model, [12], false);
				expectLines(checker().reachableNodes(model, {finallyRule: false}), model, [12], true);
			});
			analyze.reset();
			var normal = thrown.replace('  t();\n', '  g();\n');
			upperModels(modelsOf(normal)).forEach(function (entry) {
				expectLines(checker().reachableNodes(entry.model), entry.model, [7, 8, 9, 12], true);
			});
		});

		it('(c) a return through a finally (finally edge) reaches the exit: the callee returns normally', function () {
			var code = 'var y, z;\nfunction f() {\n  try {\n    return 1;\n  } finally {\n    y = 2;\n  }\n}\nf();\nz = 3;\n',
				models = modelsOf(code);
			upperModels(models).forEach(function (entry) {
				var model = entry.model,
					finallyExit = nodeAt(model, 7, FlowNode.FINALLY_EXIT_NODE_TYPE);
				[].concat(finallyExit.finally || []).length.should.be.above(0, 'the finallyExit has a finally edge');
				var reached = checker().reachableNodes(model);
				reached.has(finallyExit).should.be.true();
				expectLines(reached, model, [6, 10], true);
				var returns = [];
				checker().normalReturns(model).forEach(function (value, scope) {
					returns.push(scope.name + ':' + value);
				});
				returns.should.eql([PAGE + '.f:true']);
			});
		});

		it('(c) nested try-finally: the inner finallyExit inside the outer region is not an entry of the outer', function () {
			var code = 'var a = 0, b, c;\nfunction t() { throw a; }\ntry {\n  t();\n} finally {\n  try {\n    b = 2;\n' +
					'  } finally {\n    c = 3;\n  }\n}\nconsole.log(c);\n',
				models = modelsOf(code);
			upperModels(models).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model);
				expectLines(reached, model, [7, 9], true);
				reached.has(nodeAt(model, 10, FlowNode.FINALLY_EXIT_NODE_TYPE)).should.be.true();
				reached.has(nodeAt(model, 11, FlowNode.FINALLY_EXIT_NODE_TYPE)).should.be.true();
				expectLines(reached, model, [12], false);
				expectLines(checker().reachableNodes(model, {finallyRule: false}), model, [12], true);
			});
		});

		it('(c) a finally entered normally after its finallyExit was reached: its normal edges are followed then (monotone)', function () {
			/// the exception edge of the call t() reaches the finally and its finallyExit before the normal path
			/// through L5-L8 enters it; the normal edges of the finallyExit already reached are followed at that entry
			var code = 'var x = 0, y, a, b, c, d;\nfunction t() { return x; }\ntry {\n  t();\n  a = 1;\n  b = 2;\n  c = 3;\n' +
					'  d = 4;\n} finally {\n  y = 1;\n}\nconsole.log(y);\n',
				models = modelsOf(code);
			upperModels(models).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model);
				reached.has(nodeAt(model, 11, FlowNode.FINALLY_EXIT_NODE_TYPE)).should.be.true();
				expectLines(reached, model, [5, 6, 7, 8, 10, 12], true);
			});
		});

		it('(c) a non-exceptional edge into a finally from a node of another function does not enter it', function () {
			/// a real model has no such edge (an edge into a node of a finally region comes from its own function, the
			/// call edges go to an entry and the return edges are replaced by (a)): a forged node F of the callee t,
			/// placed at the position of y = 1 in the finally of the page and reached by an exception edge of a forged
			/// start, has a normal edge to y = 1; F is not of the owner function of the region, the finally is not entered
			var code = 'var x = 0, y;\nfunction t() { throw x; }\ntry {\n  t();\n} finally {\n  y = 1;\n}\nconsole.log(y);\n';
			upperModels(modelsOf(code)).forEach(function (entry) {
				var model = entry.model,
					graph = model.graph,
					inFinally = nodeAt(model, 6),
					callee = model.callSiteRecords().filter(function (record) {
						return record.callNode.line === 4;
					})[0].calleeScope,
					other = {type: FlowNode.NORMAL_NODE_TYPE, scope: callee, astNode: inFinally.astNode, line: 6,
						col: inFinally.col, cfgId: -1, normal: inFinally},
					start = {type: FlowNode.ENTRY_NODE_TYPE, scope: graph[0].scope, cfgId: -2, normal: graph[0],
						exception: [other]},
					wrapped = wrap(model, {graph: [start, graph[1], [start, other].concat(graph[2])]}),
					reached = checker().reachableNodes(wrapped);
				callee.should.not.equal(inFinally.scope);
				reached.has(other).should.be.true();
				reached.has(nodeAt(model, 7, FlowNode.FINALLY_EXIT_NODE_TYPE)).should.be.true();
				expectLines(reached, model, [8], false);
				expectLines(checker().reachableNodes(wrapped, {finallyRule: false}), model, [8], true);
			});
		});

		it('(c) a finallyExit matching no TryStatement throws', function () {
			var code = 'var x = 0, y;\ntry {\n  x = 1;\n} finally {\n  y = 1;\n}\nconsole.log(y);\n',
				model = modelsOf(code).intra().model,
				graph = model.graph,
				real = nodeAt(model, 6, FlowNode.FINALLY_EXIT_NODE_TYPE),
				fake = {type: FlowNode.FINALLY_EXIT_NODE_TYPE, line: 99, col: 0, scope: real.scope, cfgId: -1},
				wrapped = wrap(model, {graph: [graph[0], graph[1], graph[2].concat([fake])]});
			(function () {
				checker().reachableNodes(wrapped);
			}).should.throw(/TryStatement/);
		});

		it('intra-procedural: everything after a call is reachable and normalReturns is an empty Map (P14 intra(f))', function () {
			var models = modelsOf(probe('p14-rec-inner.js')),
				intraF = models.intra('$PAGE_0.f'),
				intraPage = models.intra();
			expectLines(checker().reachableNodes(intraF.model), intraF.model, [3, 4, 5], true);
			expectLines(checker().reachableNodes(intraPage.model), intraPage.model, [7, 8], true);
			var returns = checker().normalReturns(intraF.model);
			returns.should.be.instanceOf(Map);
			returns.size.should.equal(0);
		});

		it('inter-page: the entry of every page is reachable; a model shape where one is not throws', function () {
			var models = modelsOf(['var a = 1;\nconsole.log(a);\n', 'var b = 2;\nconsole.log(b);\n']),
				model = models.byName['inter-page'].model,
				reached = checker().reachableNodes(model),
				entries = model.graph[2].filter(function (node) {
					return node.type === FlowNode.ENTRY_NODE_TYPE && node.scope.type === 'page';
				});
			entries.length.should.equal(2);
			entries.forEach(function (entry) {
				reached.has(entry).should.be.true();
			});
			var graph = model.graph,
				wrapped = wrap(model, {graph: [entries[0], graph[1], graph[2]]});
			(function () {
				checker().reachableNodes(wrapped);
			}).should.throw(/entry/);
		});
	});

	describe('D014: exceptionalReturn as an exception edge from the call node (T013)', function () {
		var FIELD_CODE = 'var x = 0;\nclass A {\n  count = x;\n  constructor() {\n    throw 1;\n  }\n}\n' +
			'function g() {\n  new A();\n}\ntry {\n  new A();\n} catch (e) {\n  console.log(x);\n}\ng();\nx = 1;\n' +
			'console.log(x);\n';

		it('a record whose call node has no exception edge (constructor after a field initializer) reaches its exceptionalReturn', function () {
			upperModels(modelsOf(FIELD_CODE)).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model),
					records = model.callSiteRecords().filter(function (record) {
						return !record.callNode.exception && !!record.exceptionalReturn;
					});
				records.length.should.be.above(0, 'records whose call node has no exception edge');
				records.forEach(function (record) {
					reached.has(record.callNode).should.be.true();
					reached.has(record.exceptionalReturn).should.be.true();
				});
				expectLines(reached, model, [13, 14], true);
			});
		});

		it('the exceptionalReturn edge counts as an exception: a callee only throwing through it has no normal return', function () {
			upperModels(modelsOf(FIELD_CODE)).forEach(function (entry) {
				var model = entry.model,
					returns = {};
				checker().normalReturns(model).forEach(function (value, scope) {
					returns[scope.name.split('.').slice(2).join('.')] = value;
				});
				returns.g.should.be.false();
				var reached = checker().reachableNodes(model);
				expectLines(reached, model, [17, 18], false);
			});
		});

		it('a later call of a chain (a().b()) whose callee throws reaches the catch', function () {
			var code = 'var x = 0;\nclass A {\n  constructor() {\n    this.p = 1;\n  }\n  m() {\n    throw 1;\n  }\n}\n' +
				'try {\n  new A().m();\n} catch (e) {\n  console.log(x);\n}\n';
			upperModels(modelsOf(code)).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model),
					records = model.callSiteRecords().filter(function (record) {
						return record.callNode.line === 11;
					});
				records.length.should.equal(2);
				records.forEach(function (record) {
					reached.has(record.exceptionalReturn).should.be.true();
				});
				expectLines(reached, model, [12, 13], true);
			});
		});

		it('a call before a decision (if (f())) whose callee throws reaches the catch', function () {
			var code = 'var x = 0;\nfunction f() {\n  throw 1;\n}\ntry {\n  if (f()) {\n    x = 1;\n  }\n} catch (e) {\n' +
				'  console.log(x);\n}\n';
			upperModels(modelsOf(code)).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model),
					records = model.callSiteRecords().filter(function (record) {
						return record.beforeDecision;
					});
				records.length.should.equal(1);
				reached.has(records[0].exceptionalReturn).should.be.true();
				expectLines(reached, model, [9, 10], true);
				expectLines(reached, model, [7], false);
			});
		});

		it('the exceptionalReturn of a record is followed on its own, as an exception edge', function () {
			/// T: a forged node at the position of y = 1 in the finally, the exception target of only a forged node U
			/// not reachable; a forged record of the reachable call t() at L4 gives T as its exceptionalReturn. T is
			/// reachable through the record alone and, an exception, does not enter the finally: L8 stays unreachable
			var code = 'var x = 0, y;\nfunction t() { throw x; }\ntry {\n  t();\n} finally {\n  y = 1;\n}\nconsole.log(y);\n';
			upperModels(modelsOf(code)).forEach(function (entry) {
				var model = entry.model,
					graph = model.graph,
					inFinally = nodeAt(model, 6),
					target = {type: FlowNode.NORMAL_NODE_TYPE, scope: inFinally.scope, astNode: inFinally.astNode, line: 6,
						col: inFinally.col, cfgId: -1},
					source = {type: FlowNode.NORMAL_NODE_TYPE, scope: inFinally.scope, line: 99, col: 0, cfgId: -2,
						exception: [target]},
					records = model.callSiteRecords(),
					calls = records.filter(function (record) {
						return record.callNode.line === 4;
					});
				calls.length.should.equal(1);
				var forged = Object.assign({}, calls[0], {exceptionalReturn: target}),
					wrapped = wrap(model, {
						graph: [graph[0], graph[1], graph[2].concat([source, target])],
						callSiteRecords: records.concat([forged])
					}),
					reached = checker().reachableNodes(wrapped);
				checker().reachableNodes(model).has(calls[0].callNode).should.be.true();
				reached.has(calls[0].callNode).should.be.true();
				reached.has(source).should.be.false();
				reached.has(target).should.be.true();
				expectLines(reached, model, [8], false);
				expectLines(checker().reachableNodes(wrapped, {finallyRule: false}), model, [8], true);
			});
		});

		it('an exceptionalReturn which is not the exception target of any node throws', function () {
			var model = modelsOf(FIELD_CODE).inter.model,
				records = model.callSiteRecords(),
				forged = records.map(function (record, index) {
					return index !== 0 ? record : Object.assign({}, record, {exceptionalReturn: model.graph[0]});
				});
			(function () {
				checker().reachableNodes(wrap(model, {callSiteRecords: forged}));
			}).should.throw(/exceptionalReturn/);
		});
	});

	describe('D015: (a) per call site (T014; US3 scenario 8)', function () {
		it('P41: the CALL and CALL RETURN NODE of L10 and L11 are not reachable', function () {
			upperModels(modelsOf(probe('p41-call-after-norecall.js'))).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model);
				reached.has(nodeAt(model, 10, FlowNode.CALL_NODE_TYPE)).should.be.false();
				reached.has(nodeAt(model, 10, FlowNode.CALL_RETURN_NODE_TYPE)).should.be.false();
				expectLines(reached, model, [11], false);
				reached.has(nodeAt(model, 8, FlowNode.CALL_RETURN_NODE_TYPE)).should.be.true();
				reached.has(nodeAt(model, 9, FlowNode.CALL_NODE_TYPE)).should.be.true();
			});
		});

		it('P41: following the return edges of the graph (not per call site) reaches the CALL RETURN NODE of L10', function () {
			upperModels(modelsOf(probe('p41-call-after-norecall.js'))).forEach(function (entry) {
				var model = entry.model,
					/// plain BFS over the graph; the callee r does not return normally, h does: return edges from the
					/// exit of r are not followed, those of the exit of h are (to every CALL RETURN NODE of h)
					exitOfR = model.callSiteRecords().filter(function (record) {
						return /\.r$/.test(record.calleeScope.name);
					})[0].exit,
					reached = new Set([model.graph[0]]),
					queue = [model.graph[0]];
				while (queue.length > 0) {
					var from = queue.shift();
					FlowNode.CONNECTION_TYPES.forEach(function (type) {
						if (type === FlowNode.RETURN_CONNECTION_TYPE && from === exitOfR) {
							return;
						}
						[].concat(from[type] || []).forEach(function (target) {
							if (!reached.has(target)) {
								reached.add(target);
								queue.push(target);
							}
						});
					});
				}
				reached.has(nodeAt(model, 10, FlowNode.CALL_RETURN_NODE_TYPE)).should.be.true();
				checker().reachableNodes(model).has(nodeAt(model, 10, FlowNode.CALL_RETURN_NODE_TYPE)).should.be.false();
			});
		});

		it('P41: an injected pair used at L11 fails assertInvariant', function () {
			upperModels(modelsOf(probe('p41-call-after-norecall.js'), 'probes008/p41-call-after-norecall.js'))
				.forEach(function (entry) {
					var model = entry.model,
						wrapped = withPair(model, new Var('injectedL11'),
							new DUPair(nodeAt(model, 1), nodeAt(model, 11)));
					(function () {
						checker().assertInvariant([checker().check(wrapped, entry.programId, entry.modelName)], []);
					}).should.throw(/injectedL11: L1 -> L11/);
				});
		});
	});

	describe('D019: generator and async callees return normally (T015)', function () {
		[
			{kind: 'async', code: 'var x;\nasync function f() { await f(); }\nf();\nx = 1;\nconsole.log(x);\n', flag: 'async'},
			{kind: 'generator', code: 'var x;\nfunction* f() { yield* f(); }\nf();\nx = 1;\nconsole.log(x);\n', flag: 'generator'}
		].forEach(function (each) {
			it('the ' + each.kind + ' function f returns normally; x = 1 and console.log(x) are reachable', function () {
				upperModels(modelsOf(each.code)).forEach(function (entry) {
					var model = entry.model,
						returns = [];
					checker().normalReturns(model).forEach(function (value, scope) {
						returns.push(scope.name + ':' + value);
					});
					returns.should.eql([PAGE + '.f:true']);
					expectLines(checker().reachableNodes(model), model, [4, 5], true);
					analyze.pairsOfModel(model).should.containEql('x: L4 -> L5');
					pairsOf(checker().violationsOf(model)).should.not.containEql('x: L4 -> L5');
				});
			});

			it('the ' + each.kind + ' function f: recomputed only from the structure (flag false) it has no normal return', function () {
				upperModels(modelsOf(each.code)).forEach(function (entry) {
					var model = entry.model,
						scope = model.callSiteRecords()[0].calleeScope,
						plain = Object.create(scope),
						ast = Object.assign({}, scope.ast);
					ast[each.flag] = false;
					scope.ast[each.flag].should.be.true();
					Object.defineProperty(plain, 'ast', {value: ast});
					Object.defineProperty(plain, 'name', {value: scope.name});
					var records = model.callSiteRecords().map(function (record) {
							return Object.assign({}, record, {calleeScope: plain});
						}),
						wrapped = wrap(model, {callSiteRecords: records});
					checker().normalReturns(wrapped).get(plain).should.be.false();
					expectLines(checker().reachableNodes(wrapped), model, [4, 5], false);
					pairsOf(checker().violationsOf(wrapped)).should.containEql('x: L4 -> L5');
				});
			});
		});
	});

	describe('fail-closed return edges (T016; §2 edge table)', function () {
		var CODE = 'var x = 1;\nconsole.log(x);\n';

		it('a return edge to neither a CALL RETURN NODE of a record nor a LOOP NODE throws', function () {
			var model = modelsOf(CODE).intraPage.model,
				graph = model.graph,
				start = {type: FlowNode.ENTRY_NODE_TYPE, scope: graph[0].scope, cfgId: -1, normal: graph[0],
					'return': [nodeAt(model, 2)]};
			(function () {
				checker().reachableNodes(wrap(model, {graph: [start, graph[1], [start].concat(graph[2])]}));
			}).should.throw(/return/);
		});

		it('a return edge to a LOOP NODE is followed (LOOP RETURN -> LOOP)', function () {
			var model = modelsOf(CODE).intraPage.model,
				loop = model.loopRecords()[0],
				graph = model.graph;
			[].concat(loop.loopReturn['return'] || []).should.eql([loop.loop]);
			checker().reachableNodes(model).has(loop.loop).should.be.true();
			/// a forged start node whose only edge is a return edge to the LOOP NODE
			var start = {type: FlowNode.ENTRY_NODE_TYPE, scope: graph[0].scope, cfgId: -1, 'return': [loop.loop]},
				reached = checker().reachableNodes(wrap(model, {graph: [start, graph[1], [start].concat(graph[2])]}));
			reached.has(loop.loop).should.be.true();
			reached.has(loop.loopReturn).should.be.true();
		});
	});

	describe('independence guard (T017; FR-007, §1)', function () {
		var FORBIDDEN = [
			{name: 'reachingsolver', pattern: /reachingsolver/},
			{name: 'summary (require path)', pattern: /require\s*\(\s*['"][^'"]*summary[^'"]*['"]\s*\)/},
			{name: 'defuseanalyzer', pattern: /defuseanalyzer/},
			{name: 'reachIns', pattern: /reachIns/},
			{name: 'reachOuts', pattern: /reachOuts/},
			{name: 'analysisResultOf', pattern: /analysisResultOf/},
			{name: 'setAnalysisResults', pattern: /setAnalysisResults/},
			{name: 'normalReturn (property read)', pattern: /(\.\s*|\[\s*['"])normalReturn(?!s)\b/},
			{name: 'summaryOf', pattern: /summaryOf/}
		];

		it('the patterns catch the forbidden names and spare the function normalReturns', function () {
			var bad = {
				'reachingsolver': 'var s = require("../../lib/dujs/reachingsolver");',
				'summary (require path)': 'var s = require(\'../../lib/dujs/summary\');',
				'defuseanalyzer': 'var d = require("../../lib/dujs/defuseanalyzer");',
				'reachIns': 'node.reachIns;',
				'reachOuts': 'node.reachOuts;',
				'analysisResultOf': 'model.analysisResultOf(node);',
				'setAnalysisResults': 'model.setAnalysisResults(x);',
				'normalReturn (property read)': 'summary.normalReturn;',
				'summaryOf': 'options.summaryOf(scope);'
			};
			FORBIDDEN.forEach(function (each) {
				each.pattern.test(bad[each.name]).should.be.true(each.name);
			});
			FORBIDDEN.forEach(function (each) {
				each.pattern.test('function normalReturns(model, options) {}\nexports.normalReturns = normalReturns;')
					.should.be.false(each.name);
			});
			FORBIDDEN[7].pattern.test('x["normalReturn"]').should.be.true();
		});

		it('tests/helpers/reachability.js contains none of the forbidden names', function () {
			var source = fs.readFileSync(HELPER, 'utf8'),
				found = FORBIDDEN.filter(function (each) {
					return each.pattern.test(source);
				}).map(function (each) {
					return each.name;
				});
			found.should.eql([]);
		});
	});

	describe('positive controls P21, P23, P24 (T018; US3 scenario 5, FR-007, FR-008, D003, D005)', function () {
		[
			{name: 'p21-finally.js', pair: 'x: L1 -> L11', scope: PAGE, line: 10},
			{name: 'p23-finally-summary.js', pair: 'x: L11 -> L14', scope: PAGE + '.g', line: 10},
			{name: 'p24-finally-throw.js', pair: 'x: L1 -> L11', scope: PAGE, line: 10}
		].forEach(function (each) {
			it(each.name + ': ' + each.pair + ' is a violation, both ends are reachable with (c) off, the witness is the finally', function () {
				var models = modelsOf(probe(each.name), 'probes008/' + each.name);
				upperModels(models).forEach(function (entry) {
					var model = entry.model;
					analyze.pairsOfModel(model).should.containEql(each.pair);
					pairsOf(checker().violationsOf(model)).should.containEql(each.pair);
					pairsOf(checker().violationsOf(model, {finallyRule: false})).should.not.containEql(each.pair);
					var result = checker().check(model, entry.programId, entry.modelName);
					pairsOf(result.violations).should.containEql(each.pair);
					result.eligible.should.containEql(each.pair);
					result.witnesses.get(each.pair).should.eql([{scope: each.scope, line: each.line, nonExceptionalEntries: 0}]);
					var finallyExit = nodeAt(model, each.line, FlowNode.FINALLY_EXIT_NODE_TYPE);
					finallyExit.scope.name.should.equal(each.scope);
				});
			});
		});

		it('two closed finally: a witness is a finally whose opening reaches an unreachable end, sorted by line', function () {
			/// both finally are entered only by the exception of t(); opening the inner one (L8) reaches z = 2 (L9),
			/// which enters the outer one normally and reaches L13; opening the outer one (L12) reaches L13 only
			var code = 'var x = 0, y, z;\nfunction t() { throw x; }\ntry {\n  try {\n    t();\n  } finally {\n    y = 1;\n' +
					'  }\n  z = 2;\n} finally {\n  x = z;\n}\nconsole.log(y);\n',
				models = modelsOf(code, 'test/two-finally'),
				inner = {scope: PAGE, line: 8, nonExceptionalEntries: 0},
				outer = {scope: PAGE, line: 12, nonExceptionalEntries: 0};
			upperModels(models).forEach(function (entry) {
				var model = entry.model,
					reached = checker().reachableNodes(model);
				reached.has(nodeAt(model, 8, FlowNode.FINALLY_EXIT_NODE_TYPE)).should.be.true();
				reached.has(nodeAt(model, 12, FlowNode.FINALLY_EXIT_NODE_TYPE)).should.be.true();
				expectLines(reached, model, [9, 13], false);
				var result = checker().check(model, entry.programId, entry.modelName);
				pairsOf(result.violations).should.containDeep(['y: L7 -> L13', 'z: L9 -> L11']);
				result.witnesses.get('y: L7 -> L13').should.eql([inner, outer]);
				result.witnesses.get('z: L9 -> L11').should.eql([inner]);
			});
		});
	});

	describe('injection (T019; US3 scenario 6, §6)', function () {
		var PROGRAM = 'probes008/p13-ki22-5.js';

		/**
		 * The inter-procedural model of the page of P13 with its program id and name
		 * @returns {Object}
		 */
		function p13() {
			return modelsOf(probe('p13-ki22-5.js'), PROGRAM).inter;
		}

		/**
		 * The (only) node at a line which is not a call or call return node
		 * @param {Model} model
		 * @param {number} line
		 * @returns {FlowNode}
		 */
		function plainNodeAt(model, line) {
			return nodeAt(model, line, FlowNode.NORMAL_NODE_TYPE);
		}

		it('(1) both ends unreachable: DUPair(L9, L9) of a new Var injected fails assertInvariant naming injected', function () {
			var entry = p13(),
				model = entry.model,
				l9 = plainNodeAt(model, 9);
			checker().reachableNodes(model).has(l9).should.be.false();
			var wrapped = withPair(model, new Var('injected'), new DUPair(l9, l9)),
				result = checker().check(wrapped, entry.programId, entry.modelName);
			result.violations.filter(function (violation) {
				return violation.variable === 'injected';
			})[0].unreachable.should.eql(['def', 'use']);
			(function () {
				checker().assertInvariant([result], []);
			}).should.throw(/injected/);
		});

		it('(2) only the definition unreachable: DUPair(L9, reachable L1) fails assertInvariant', function () {
			var entry = p13(),
				model = entry.model,
				l1 = plainNodeAt(model, 1);
			checker().reachableNodes(model).has(l1).should.be.true();
			var wrapped = withPair(model, new Var('injectedDef'), new DUPair(plainNodeAt(model, 9), l1)),
				result = checker().check(wrapped, entry.programId, entry.modelName);
			result.violations.filter(function (violation) {
				return violation.variable === 'injectedDef';
			})[0].unreachable.should.eql(['def']);
			(function () {
				checker().assertInvariant([result], []);
			}).should.throw(/injectedDef: L9 -> L1/);
		});

		it('(3) only the branch target of a p-use unreachable: Pair(reachable decision, unreachable target) fails assertInvariant', function () {
			/// P13 has no decision node: the reachable node of L1 stands for the decision; the same injection
			/// is repeated on a program with a real reachable decision node (L3) and the unreachable L7
			var entry = p13(),
				model = entry.model,
				l1 = plainNodeAt(model, 1),
				wrapped = withPair(model, new Var('injectedPuse'), new DUPair(l1, new Pair(l1, plainNodeAt(model, 9)))),
				result = checker().check(wrapped, entry.programId, entry.modelName);
			result.violations.filter(function (violation) {
				return violation.variable === 'injectedPuse';
			})[0].unreachable.should.eql(['target']);
			(function () {
				checker().assertInvariant([result], []);
			}).should.throw(/injectedPuse/);
			analyze.reset();
			var code = 'var x = 0, c = 1;\nfunction r() { r(); }\nif (c) {\n  x = 1;\n}\nr();\nconsole.log(x);\n',
				other = modelsOf(code, 'test/decision').inter,
				decision = plainNodeAt(other.model, 3),
				reached = checker().reachableNodes(other.model);
			reached.has(decision).should.be.true();
			decision.true.should.be.ok();
			reached.has(plainNodeAt(other.model, 7)).should.be.false();
			var injected = withPair(other.model, new Var('injectedBranch'),
					new DUPair(plainNodeAt(other.model, 1), new Pair(decision, plainNodeAt(other.model, 7)))),
				otherResult = checker().check(injected, other.programId, other.modelName);
			otherResult.violations.filter(function (violation) {
				return violation.variable === 'injectedBranch';
			})[0].unreachable.should.eql(['target']);
			(function () {
				checker().assertInvariant([otherResult], []);
			}).should.throw(/injectedBranch: L1 -> L3>L7/);
		});

		it('(4) the pair of (1) in the allowlist still fails: with (c) off it is still a violation (criterion 2)', function () {
			var entry = p13(),
				model = entry.model,
				l9 = plainNodeAt(model, 9),
				result = checker().check(withPair(model, new Var('injected'), new DUPair(l9, l9)),
					entry.programId, entry.modelName);
			result.eligible.should.not.containEql('injected: L9 -> L9');
			(function () {
				checker().assertInvariant([result], [
					{program: PROGRAM, model: entry.modelName, pair: 'injected: L9 -> L9', witness: [], note: 'injection'}
				]);
			}).should.throw(/injected: L9 -> L9/);
		});

		it('assertInvariant passes with an allowlist matching the violations of P21 and their witnesses', function () {
			var entry = modelsOf(probe('p21-finally.js'), 'probes008/p21-finally.js').inter,
				result = checker().check(entry.model, entry.programId, entry.modelName),
				allowlist = result.violations.map(function (violation) {
					return {program: entry.programId, model: entry.modelName, pair: violation.pair,
						witness: result.witnesses.get(violation.pair), note: 'KI §38 P21'};
				});
			allowlist.length.should.be.above(0);
			checker().assertInvariant([result], allowlist);
		});

		it('an allowlist item no longer violated fails as stale (過期)', function () {
			var entry = modelsOf(probe('p21-finally.js'), 'probes008/p21-finally.js').inter,
				result = checker().check(entry.model, entry.programId, entry.modelName),
				allowlist = result.violations.map(function (violation) {
					return {program: entry.programId, model: entry.modelName, pair: violation.pair,
						witness: result.witnesses.get(violation.pair), note: 'KI §38 P21'};
				});
			analyze.pairsOfModel(entry.model).should.containEql('x: L1 -> L9');
			pairsOf(result.violations).should.not.containEql('x: L1 -> L9');
			allowlist.push({program: entry.programId, model: entry.modelName, pair: 'x: L1 -> L9',
				witness: [{scope: PAGE, line: 10, nonExceptionalEntries: 0}], note: 'stale'});
			(function () {
				checker().assertInvariant([result], allowlist);
			}).should.throw(/過期[\s\S]*x: L1 -> L9/);
		});

		it('an allowlist item whose witness differs from the output fails', function () {
			var entry = modelsOf(probe('p21-finally.js'), 'probes008/p21-finally.js').inter,
				result = checker().check(entry.model, entry.programId, entry.modelName),
				allowlist = result.violations.map(function (violation) {
					return {program: entry.programId, model: entry.modelName, pair: violation.pair,
						witness: result.witnesses.get(violation.pair), note: 'KI §38 P21'};
				});
			allowlist.forEach(function (item) {
				if (item.pair === 'x: L1 -> L11') {
					item.witness = [{scope: PAGE, line: 9, nonExceptionalEntries: 0}];
				}
			});
			var error = null;
			try {
				checker().assertInvariant([result], allowlist);
			} catch (caught) {
				error = caught;
			}
			assert.ok(error instanceof assert.AssertionError, 'an AssertionError');
			error.message.should.match(/witness/);
			error.message.should.match(/x: L1 -> L11/);
		});
	});

	describe('FR-013: the violations of P38-P40 before the fix reproduced by injection (T028; D017, §6)', function () {
		/// the p-use pairs of the decision node removed by FR-013 (develop had them, spec P38-P40)
		var CASES = [
			{name: 'p38-if-norecall.js', variable: 'f', line: 5, pairs: ['f: entry -> L5>L6:T', 'f: entry -> L5>L8:F']},
			{name: 'p39-if-nested-norecall.js', variable: 'g', line: 8, pairs: ['g: entry -> L8>L9:T', 'g: entry -> L8>L11:F']},
			{name: 'p40-while-norecall.js', variable: 'f', line: 5, pairs: ['f: entry -> L5>L6:T', 'f: entry -> L5>L8:F']}
		];

		/**
		 * The Var of a name among the keys of the def-use pairs of a model (a new Var without one)
		 * @param {Model} model
		 * @param {string} name
		 * @returns {Var}
		 */
		function variableOf(model, name) {
			var found = null;
			model.dupairs.forEach(function (pairs, variable) {
				if (variable.name === name) {
					found = variable;
				}
			});
			return found || new Var(name);
		}

		/**
		 * Wrap a model whose dupairs are a copy of the original Map with the two p-use
		 * pairs (entry, Pair(decision, true target)) and (entry, Pair(decision, false target))
		 * @param {Model} model
		 * @param {string} name variable
		 * @param {number} line line of the decision node
		 * @returns {Object}
		 */
		function withDecisionPairs(model, name, line) {
			var decisions = nodesAt(model, line).filter(function (node) {
					return !!node.true && !!node.false;
				}),
				variable = variableOf(model, name),
				dupairs = new Map(model.dupairs),
				pairs = new AnalysisSet(dupairs.has(variable) ? dupairs.get(variable).values() : []);
			decisions.length.should.equal(1, 'one decision node at L' + line);
			pairs.add(new DUPair(model.graph[0], new Pair(decisions[0], decisions[0].true)));
			pairs.add(new DUPair(model.graph[0], new Pair(decisions[0], decisions[0].false)));
			dupairs.set(variable, pairs);
			return wrap(model, {dupairs: dupairs});
		}

		CASES.forEach(function (each) {
			it(each.name + ': the injected ' + each.pairs.join(', ') + ' are violations, still with (c) off, and fail assertInvariant', function () {
				var models = modelsOf(probe(each.name), 'probes008/' + each.name);
				upperModels(models).forEach(function (entry) {
					var model = entry.model;
					/// after the fix the pairs are not in the model
					each.pairs.forEach(function (pair) {
						analyze.pairsOfModel(model).should.not.containEql(pair);
					});
					var wrapped = withDecisionPairs(model, each.variable, each.line);
					analyze.pairsOfModel(wrapped).should.containDeep(each.pairs);
					pairsOf(checker().violationsOf(wrapped)).should.containDeep(each.pairs);
					pairsOf(checker().violationsOf(wrapped, {finallyRule: false})).should.containDeep(each.pairs);
					var result = checker().check(wrapped, entry.programId, entry.modelName);
					pairsOf(result.violations).should.containDeep(each.pairs);
					each.pairs.forEach(function (pair) {
						result.eligible.should.not.containEql(pair);
						result.violations.filter(function (violation) {
							return violation.pair === pair;
						})[0].unreachable.should.eql(['decision', 'target']);
					});
					(function () {
						checker().assertInvariant([result], []);
					}).should.throw(new RegExp(each.pairs[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
					/// in the allowlist they still fail: with (c) off they are still violations (criterion 2)
					(function () {
						checker().assertInvariant([result], each.pairs.map(function (pair) {
							return {program: entry.programId, model: entry.modelName, pair: pair, witness: [], note: 'injection'};
						}));
					}).should.throw(/differential criterion/);
				});
			});
		});

		it('P38, P39, P40: the real models after the fix have no violation', function () {
			CASES.forEach(function (each) {
				var models = modelsOf(probe(each.name), 'probes008/' + each.name);
				upperModels(models).forEach(function (entry) {
					var result = checker().check(entry.model, entry.programId, entry.modelName);
					result.violations.should.eql([]);
					checker().assertInvariant([result], []);
				});
				analyze.reset();
			});
		});
	});
});
