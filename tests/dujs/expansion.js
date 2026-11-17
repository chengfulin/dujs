/*
 * Test cases of the expansion of hierarchical models into flat graphs
 * (specs/003-hierarchical-models).
 * Original dujs code, MIT License (see LICENSE).
 *
 * "pre-refactor characterization (probes)" pins the def-use pairs of every
 * inter-procedural, intra-page and inter-page model of the probe programs in
 * tests/dujs/cases/probes/ as produced by the program before the refactoring
 * (bf07818): chained calls (a2 class static members), handlers registered
 * more than once (a2 h, a4 onA), and models searched for registrations that
 * are not the topmost model (a2 h is called and registered and registers reg
 * by an identifier; r8 g and h are called and registered, h registers g).
 * The expected values are the output of the program at that time, not a
 * statement of correctness; feature 005 (User Story 1, summaries: a call
 * returns only to its own call-site, and an exception of a callee no longer
 * goes back to the CALL RETURN NODE) removed these pairs (golden-diff.md
 * US1 "unit test expectations"): a1 i: entry -> L7, x: L7 -> L6 (g returning
 * to the call of another line); a2 n: L3 -> L9/L10 (h() of L5 must-KILLs n by
 * reg()), n: L8 -> L9/L10 (intra-page and inter-page: h registered as a handler
 * returning to the call of L5); a3 s: L3 -> L10, s: L6 -> L10 (exceptions of
 * outer and inner returning to the call of L9); r8 n: L1 -> L6 (h() of L4
 * must-KILLs n by reg()), n: L2 -> L6 (intra-page and inter-page: the handler h
 * returning to the call of L4). User Story 2 of feature 005 (D2: a call f() in
 * a function is linked to the only definition of f on the page) added the
 * inter-procedural models rooted at u of r6a and r6b (g() and k() in u), the
 * callee g of f in r6c (g() of L8) and its pair a: L6 -> L3 (golden-diff.md
 * US2 "unit test expectations"). The probes n1, n1b and n1c are not asserted here
 * (their pairs are recorded in specs/003-hierarchical-models/probes/n1-leak-baseline.md).
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode'),
	executor = require('../../lib/dujs/defuseanalysisexecutor'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	hierarchy = require('../../lib/dujs/hierarchy'),
	expansion = require('../../lib/dujs/expansion'),
	factoryFlowNode = require('../../lib/esgraph/flownodefactory');

var PROBES = path.join(__dirname, 'cases', 'probes');

/**
 * Analyze a probe program and collect the def-use pairs of its models
 * @param {string} name File name of the probe without extension
 * @returns {Object}
 */
function modelsOfProbe(name) {
	'use strict';
	var result = analyze(fs.readFileSync(path.join(PROBES, name + '.js'), 'utf8')),
		pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree);
	pageModels.intraPageModels.should.have.length(1);
	var intraPageModel = pageModels.intraPageModels[0],
		loopNode = intraPageModel.graph[2].filter(function (node) {
			return node.type === FlowNode.LOOP_NODE_TYPE;
		})[0];
	return {
		interProcedural: pageModels.interProceduralModels.map(function (model) {
			return {
				scopes: model.relatedScopes.map(String),
				pairs: analyze.pairsOfModel(model)
			};
		}),
		intraPage: analyze.pairsOfModel(intraPageModel),
		/// scope names of the targets of the onEvent edges of the LOOP node
		/// (the LOOP RETURN node, in the page scope, when no handler is registered)
		onEvent: loopNode.onEvent.map(function (node) {
			return node.scope.name;
		}),
		interPage: analyze.pairsOfModel(modelCtrl.interPageModel)
	};
}

describe('pre-refactor characterization (probes)', function () {
	'use strict';
	after(analyze.reset);

	var expected = {
		a1: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0.f',
						'$DOMAIN.$PAGE_0.f.k'
					],
					pairs: [
						'k: entry -> L2',
						'v: entry -> L2'
					]
				},
				{
					scopes: [
						'$DOMAIN.$PAGE_0',
						'$DOMAIN.$PAGE_0.f',
						'$DOMAIN.$PAGE_0.f.k',
						'$DOMAIN.$PAGE_0.g'
					],
					pairs: [
						'f: entry -> L4',
						'g: entry -> L5>L5:T',
						'g: entry -> L5>L6:F',
						'g: entry -> L6>L6:T',
						'g: entry -> L6>L7:F',
						'g: entry -> L7>L7:T',
						'g: entry -> L7>exit:F',
						'i: L7 -> L7',
						'k: entry -> L2',
						'v: entry -> L2',
						'x: L4 -> L3',
						'x: L4 -> L6',
						'x: L5 -> L3',
						'x: L5 -> L6',
						'x: L6 -> L3',
						'x: L6 -> L6',
						'x: L7 -> L3'
					]
				}
			],
			intraPage: [
				'f: entry -> L4',
				'g: entry -> L5>L5:T',
				'g: entry -> L5>L6:F',
				'g: entry -> L6>L6:T',
				'g: entry -> L6>L7:F',
				'g: entry -> L7>L7:T',
				'g: entry -> L7>Lnull:F',
				'i: L7 -> L7',
				'k: entry -> L2',
				'v: entry -> L2',
				'x: L4 -> L3',
				'x: L4 -> L6',
				'x: L5 -> L3',
				'x: L5 -> L6',
				'x: L6 -> L3',
				'x: L6 -> L6',
				'x: L7 -> L3',
			],
			onEvent: [
				'$DOMAIN.$PAGE_0'
			],
			interPage: [
				'f: entry -> L4',
				'g: entry -> L5>L5:T',
				'g: entry -> L5>L6:F',
				'g: entry -> L6>L6:T',
				'g: entry -> L6>L7:F',
				'g: entry -> L7>L7:T',
				'g: entry -> L7>Lnull:F',
				'i: L7 -> L7',
				'k: entry -> L2',
				'v: entry -> L2',
				'x: L4 -> L3',
				'x: L4 -> L6',
				'x: L5 -> L3',
				'x: L5 -> L6',
				'x: L6 -> L3',
				'x: L6 -> L6',
				'x: L7 -> L3'
			]
		},
		a2: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0.h',
						'$DOMAIN.$PAGE_0.h.reg'
					],
					pairs: [
						'reg: entry -> L4'
					]
				},
				{
					scopes: [
						'$DOMAIN.$PAGE_0',
						'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0',
						'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1',
						'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_2',
						'$DOMAIN.$PAGE_0.h',
						'$DOMAIN.$PAGE_0.h.reg'
					],
					pairs: [
						'h: entry -> L5',
						'h: entry -> L6',
						'h: entry -> L7',
						'init: entry -> L3',
						'n: L4 -> L10',
						'n: L4 -> L9',
						'reg: entry -> L4',
						'window: entry -> L4',
						'window: entry -> L6',
						'window: entry -> L7',
						'window: entry -> L8'
					]
				}
			],
			intraPage: [
				'h: entry -> L5',
				'h: entry -> L6',
				'h: entry -> L7',
				'h: entry -> L8',
				'init: entry -> L3',
				'n: L4 -> L10',
				'n: L4 -> L9',
				'reg: entry -> L4',
				'window: entry -> L4',
				'window: entry -> L6',
				'window: entry -> L7',
				'window: entry -> L8'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0.h.reg',
				'$DOMAIN.$PAGE_0.h',
				'$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_4',
				'$DOMAIN.$PAGE_0.h.reg'
			],
			interPage: [
				'h: entry -> L5',
				'h: entry -> L6',
				'h: entry -> L7',
				'h: entry -> L8',
				'init: entry -> L3',
				'n: L4 -> L10',
				'n: L4 -> L9',
				'reg: entry -> L4',
				'window: entry -> L4',
				'window: entry -> L6',
				'window: entry -> L7',
				'window: entry -> L8'
			]
		},
		a3: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0.outer',
						'$DOMAIN.$PAGE_0.outer.$ANONYMOUS_FUN_0'
					],
					pairs: [
						'inner: L3 -> L4',
						's: L3 -> L5>L5:T',
						's: L3 -> L5>L6:F',
						's: L3 -> L6>L6:F',
						's: L3 -> L6>L6:T'
					]
				},
				{
					scopes: [
						'$DOMAIN.$PAGE_0',
						'$DOMAIN.$PAGE_0.outer',
						'$DOMAIN.$PAGE_0.outer.$ANONYMOUS_FUN_0'
					],
					pairs: [
						'inner: L3 -> L4',
						'outer: entry -> L9',
						's: L1 -> L3',
						's: L3 -> L5>L5:T',
						's: L3 -> L5>L6:F',
						's: L3 -> L6>L6:F',
						's: L3 -> L6>L6:T',
						's: L7 -> L10>L10:F',
						's: L7 -> L10>L10:T'
					]
				}
			],
			intraPage: [
				'inner: L3 -> L4',
				'outer: entry -> L9',
				's: L1 -> L3',
				's: L3 -> L5>L5:T',
				's: L3 -> L5>L6:F',
				's: L3 -> L6>L6:F',
				's: L3 -> L6>L6:T',
				's: L7 -> L10>L10:F',
				's: L7 -> L10>L10:T'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0'
			],
			interPage: [
				'inner: L3 -> L4',
				'outer: entry -> L9',
				's: L1 -> L3',
				's: L3 -> L5>L5:T',
				's: L3 -> L5>L6:F',
				's: L3 -> L6>L6:F',
				's: L3 -> L6>L6:T',
				's: L7 -> L10>L10:F',
				's: L7 -> L10>L10:T'
			]
		},
		a4: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0.onA',
						'$DOMAIN.$PAGE_0.onA.deep'
					],
					pairs: [
						'deep: entry -> L2'
					]
				}
			],
			intraPage: [
				'deep: entry -> L2',
				'onA: entry -> L4',
				'onA: entry -> L6',
				'onB: entry -> L5',
				'q: L1 -> L2',
				'q: L1 -> L2>L2:T',
				'q: L1 -> L2>exit:F',
				'q: L2 -> L2',
				'q: L2 -> L2>L2:T',
				'q: L2 -> L2>exit:F',
				'q: L3 -> L2',
				'q: L3 -> L2>L2:T',
				'q: L3 -> L2>exit:F',
				'q: L7 -> L2',
				'q: L7 -> L2>L2:T',
				'q: L7 -> L2>exit:F',
				'q: L7 -> L8',
				'window: entry -> L4',
				'window: entry -> L5',
				'window: entry -> L6'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0.onA',
				'$DOMAIN.$PAGE_0.onB'
			],
			interPage: [
				'deep: entry -> L2',
				'localStorage: L8 -> L7',
				'onA: entry -> L4',
				'onA: entry -> L6',
				'onB: entry -> L5',
				'q: L1 -> L2',
				'q: L1 -> L2>L2:T',
				'q: L1 -> L2>exit:F',
				'q: L2 -> L2',
				'q: L2 -> L2>L2:T',
				'q: L2 -> L2>exit:F',
				'q: L3 -> L2',
				'q: L3 -> L2>L2:T',
				'q: L3 -> L2>exit:F',
				'q: L7 -> L2',
				'q: L7 -> L2>L2:T',
				'q: L7 -> L2>exit:F',
				'q: L7 -> L8',
				'window: entry -> L4',
				'window: entry -> L5',
				'window: entry -> L6'
			]
		},
		r6a: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0',
						'$DOMAIN.$PAGE_0.g'
					],
					pairs: [
						'g: entry -> L12',
						'onClick: entry -> L13',
						'window: entry -> L13'
					]
				},
				{
					scopes: [
						'$DOMAIN.$PAGE_0.u',
						'$DOMAIN.$PAGE_0.g'
					],
					pairs: []
				}
			],
			intraPage: [
				'g: entry -> L12',
				'onClick: entry -> L13',
				'window: entry -> L13'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0.onClick'
			],
			interPage: [
				'g: entry -> L12',
				'onClick: entry -> L13',
				'window: entry -> L13'
			]
		},
		r6b: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0',
						'$DOMAIN.$PAGE_0.g',
						'$DOMAIN.$PAGE_0.k'
					],
					pairs: [
						'a: L1 -> L3',
						'a: L13 -> L6',
						'g: entry -> L12',
						'k: entry -> L14'
					]
				},
				{
					scopes: [
						'$DOMAIN.$PAGE_0.u',
						'$DOMAIN.$PAGE_0.g',
						'$DOMAIN.$PAGE_0.k'
					],
					pairs: [
						'a: L3 -> L6'
					]
				}
			],
			intraPage: [
				'a: L1 -> L3',
				'a: L13 -> L6',
				'g: entry -> L12',
				'k: entry -> L14'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0'
			],
			interPage: [
				'a: L1 -> L3',
				'a: L13 -> L6',
				'g: entry -> L12',
				'k: entry -> L14'
			]
		},
		r6c: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0.f',
						'$DOMAIN.$PAGE_0.f.h',
						'$DOMAIN.$PAGE_0.g'
					],
					pairs: [
						'a: L6 -> L3',
						'h: entry -> L7'
					]
				},
				{
					scopes: [
						'$DOMAIN.$PAGE_0',
						'$DOMAIN.$PAGE_0.f',
						'$DOMAIN.$PAGE_0.f.h',
						'$DOMAIN.$PAGE_0.g'
					],
					pairs: [
						'a: L11 -> L3',
						'a: L6 -> L3',
						'f: entry -> L10',
						'g: entry -> L12',
						'g: entry -> L8',
						'h: entry -> L7'
					]
				}
			],
			intraPage: [
				'a: L11 -> L3',
				'a: L6 -> L3',
				'f: entry -> L10',
				'g: entry -> L12',
				'g: entry -> L8',
				'h: entry -> L7'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0'
			],
			interPage: [
				'a: L11 -> L3',
				'a: L6 -> L3',
				'f: entry -> L10',
				'g: entry -> L12',
				'g: entry -> L8',
				'h: entry -> L7'
			]
		},
		r8: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0.h',
						'$DOMAIN.$PAGE_0.h.reg'
					],
					pairs: [
						'reg: entry -> L3'
					]
				},
				{
					scopes: [
						'$DOMAIN.$PAGE_0',
						'$DOMAIN.$PAGE_0.h',
						'$DOMAIN.$PAGE_0.h.reg'
					],
					pairs: [
						'g: entry -> L3',
						'h: entry -> L4',
						'h: entry -> L5',
						'n: L3 -> L6',
						'reg: entry -> L3',
						'window: entry -> L3',
						'window: entry -> L5'
					]
				}
			],
			intraPage: [
				'g: entry -> L3',
				'h: entry -> L4',
				'h: entry -> L5',
				'n: L3 -> L6',
				'reg: entry -> L3',
				'window: entry -> L3',
				'window: entry -> L5'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0.g',
				'$DOMAIN.$PAGE_0.h',
				'$DOMAIN.$PAGE_0.g'
			],
			interPage: [
				'g: entry -> L3',
				'h: entry -> L4',
				'h: entry -> L5',
				'n: L3 -> L6',
				'reg: entry -> L3',
				'window: entry -> L3',
				'window: entry -> L5'
			]
		}
	};

	Object.keys(expected).forEach(function (name) {
		describe(name, function () {
			var actual;

			before(function () {
				actual = modelsOfProbe(name);
			});

			it('keeps the def-use pairs of every inter-procedural model', function () {
				actual.interProcedural.should.eql(expected[name].interProcedural);
			});

			it('keeps the def-use pairs of the intra-page model', function () {
				actual.intraPage.should.eql(expected[name].intraPage);
			});

			it('keeps the onEvent targets of the LOOP node', function () {
				actual.onEvent.should.eql(expected[name].onEvent);
			});

			it('keeps the def-use pairs of the inter-page model', function () {
				actual.interPage.should.eql(expected[name].interPage);
			});
		});
	});

	it('registers g, h and g again from the LOOP node of r8', function () {
		modelsOfProbe('r8').onEvent.should.eql(['$DOMAIN.$PAGE_0.g', '$DOMAIN.$PAGE_0.h', '$DOMAIN.$PAGE_0.g']);
	});
});

/*
 * Expansion of hierarchies built by hand (lib/dujs/hierarchy.js and
 * lib/dujs/expansion.js; tasks T022-T025). The structures named "as before
 * the refactoring" are the graphs of the same models built by the program
 * before the refactoring (e68bb2d), pinned as characterization: node array
 * (index, cfgId, type), connections, prev and next, as indices into the node
 * array (targets out of the array omitted, as in the .dot output).
 */

/**
 * Build and analyze the intra-procedural models of a page only
 * @param {string} code
 * @returns {Object} {modelOf(name), scopeOf(name)}: name relative to the page ('' for the page)
 */
function intraProceduralModelsOf(code) {
	'use strict';
	analyze.reset();
	executor.initialize([code]);
	executor.buildIntraProceduralModelsOfEachPageModels();
	var scopeTree = scopeCtrl.pageScopeTrees[0];
	function scopeOf(name) {
		var fullName = '$DOMAIN.$PAGE_0' + (!!name ? '.' + name : '');
		return scopeTree.scopes.filter(function (scope) {
			return scope.name === fullName;
		})[0];
	}
	return {
		scopeOf: scopeOf,
		modelOf: function (name) {
			return modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scopeOf(name));
		}
	};
}

/**
 * First node of a model at a line (a call of the named callee when given)
 * @param {Model} model
 * @param {number} line
 * @param {string} [calleeName]
 * @returns {FlowNode}
 */
function nodeAt(model, line, calleeName) {
	'use strict';
	var found = model.graph[2].filter(function (node) {
		return node.line === line && (!calleeName ||
			(!!node.astNode && node.astNode.type === 'CallExpression' && node.astNode.callee.name === calleeName));
	})[0];
	FlowNode.isFlowNode(found).should.be.true();
	return found;
}

/**
 * Freeze the hierarchy of a model and set its graph and flatNodeOf by expand
 * @param {Model} model
 * @returns {Object} result of expand
 */
function expandInto(model) {
	'use strict';
	hierarchy.freeze(model);
	var expanded = expansion.expand(model);
	model.graph = expanded.graph;
	model.setFlatNodeOf(expanded.flatNodeOf);
	return expanded;
}

/**
 * Structure of a graph: entry and exit, then per node its index, cfgId, type,
 * connections, prev and next as indices (targets out of the array omitted)
 * @param {Array} graph
 * @returns {Array} strings
 */
function structureOf(graph) {
	'use strict';
	var nodes = graph[2];
	function at(node) {
		return nodes.indexOf(node);
	}
	function targets(list) {
		return list.map(at).filter(function (index) {
			return index !== -1;
		}).join(',');
	}
	return ['entry=' + at(graph[0]) + ' exit=' + at(graph[1])].concat(nodes.map(function (node, index) {
		var text = index + ' #' + node.cfgId + ' ' + node.type;
		FlowNode.CONNECTION_TYPES.forEach(function (type) {
			var list = targets([].concat(node[type] || []));
			if (!!list) {
				text += ' ' + type + '=' + list;
			}
		});
		return text + ' prev=' + targets(node.prev) + ' next=' + targets(node.next);
	}));
}

/**
 * Snapshot of nodes: cfgId, type, connections, prev and next (by cfgId), and
 * the VarDefs of GEN and KILL (by identity)
 * @param {Array} nodes
 * @returns {Object} {text, vardefs}
 */
function snapshotOf(nodes) {
	'use strict';
	function ids(list) {
		return [].concat(list || []).map(function (node) {
			return node.cfgId;
		}).join(',');
	}
	var vardefs = [];
	var text = nodes.map(function (node) {
		var line = node.cfgId + ' ' + node.type;
		FlowNode.CONNECTION_TYPES.forEach(function (type) {
			line += ' ' + type + '=' + ids(node[type]);
		});
		['generate', 'kill'].forEach(function (field) {
			var set = node[field];
			line += ' ' + field + '=' + (set === null ? 'null' : set.size);
			if (set !== null) {
				vardefs = vardefs.concat(set.values());
			}
		});
		return line + ' prev=' + ids(node.prev) + ' next=' + ids(node.next);
	});
	return {text: text, vardefs: vardefs};
}

/**
 * Assert two lists hold the same objects in the same order
 * @param {Array} actual
 * @param {Array} expected
 */
function shouldBeSameObjects(actual, expected) {
	'use strict';
	actual.length.should.eql(expected.length);
	actual.forEach(function (each, index) {
		(each === expected[index]).should.be.true('object at ' + index + ' differs');
	});
}

/// f calls k (nested; f has an inter-procedural model), the page calls f (not
/// a decision), g before a decision and g again (not a decision): the callee g
/// is shared by two call-sites
var CALLS = [
	'var x = 0;',
	'function f(v) { function k() { x = 3; } k(); return v; }',
	'function g() { return x; }',
	'f(x = 1);',
	'if (g()) { x = 2; }',
	'g();'
].join('\n');

/// the root inter-procedural model of CALLS as before the refactoring, except that the exception edge of a call statement stays at the CALL
/// NODE instead of moving to the CALL RETURN NODE (feature 005, Q-a)
var CALLS_STRUCTURE = [
	'entry=0 exit=21',
	'0 #14 entry normal=1 prev= next=1',
	'1 #15 normal normal=2 prev=0 next=2',
	'2 #16 call exception=21 call=3 prev=1 next=21,3',
	'3 #27 entry normal=4 prev=2 next=4',
	'4 #28 call exception=10 call=5 prev=3 next=10,5',
	'5 #34 entry normal=6 prev=4 next=6',
	'6 #35 normal normal=7 exception=7 prev=5 next=7',
	'7 #36 exit return=8 prev=6 next=8',
	'8 #44 callReturn normal=9 prev=7 next=9',
	'9 #29 normal normal=10 prev=8 next=10',
	'10 #30 exit return=11 prev=4,9 next=11',
	'11 #45 callReturn normal=12 prev=10 next=12',
	'12 #47 call call=13 prev=11 next=13',
	'13 #41 entry normal=14 prev=12,19 next=14',
	'14 #42 normal normal=15 prev=13 next=15',
	'15 #43 exit return=16,20 prev=14 next=16,20',
	'16 #46 callReturn normal=17 prev=15 next=17',
	'17 #17 normal true=18 false=19 exception=21 prev=16 next=21,18,19',
	'18 #18 normal normal=19 exception=21 prev=17 next=21,19',
	'19 #19 call exception=21 call=13 prev=18,17 next=21,13',
	'20 #48 callReturn normal=21 prev=15 next=21',
	'21 #20 exit prev=2,18,17,19,20 next='
];

/**
 * Build the hierarchies of CALLS in the order of the builder before the
 * refactoring (the model of f first, then the calls of the page)
 * @returns {Object}
 */
function buildCalls() {
	'use strict';
	var page = intraProceduralModelsOf(CALLS);
	var modelOfF = hierarchy.createCallHierarchyModel(page.modelOf('f'));
	var callOfK = hierarchy.addCallEdge(modelOfF, {callSite: nodeAt(page.modelOf('f'), 2, 'k'), calleeModel: page.modelOf('f.k')});
	expandInto(modelOfF);
	var root = hierarchy.createCallHierarchyModel(page.modelOf(''));
	var callOfF = hierarchy.addCallEdge(root, {callSite: nodeAt(page.modelOf(''), 4, 'f'), calleeModel: modelOfF}),
		callOfG = hierarchy.addCallEdge(root, {callSite: nodeAt(page.modelOf(''), 5, 'g'), calleeModel: page.modelOf('g')}),
		callOfGAgain = hierarchy.addCallEdge(root, {callSite: nodeAt(page.modelOf(''), 6, 'g'), calleeModel: page.modelOf('g')});
	hierarchy.freeze(root);
	return {
		page: page,
		modelOfF: modelOfF,
		root: root,
		callOfK: callOfK,
		callOfF: callOfF,
		callOfG: callOfG,
		callOfGAgain: callOfGAgain
	};
}

describe('expansion', function () {
	'use strict';
	after(analyze.reset);

	describe('call-sites and callees', function () {
		var built, expanded;

		beforeEach(function () {
			built = buildCalls();
			expanded = expansion.expand(built.root);
		});

		function copyOf(node) {
			return expanded.flatNodeOf.get(node);
		}

		it('should order the nodes as the hand-computed array', function () {
			var page = built.page,
				nodesOfPage = page.modelOf('').graph[2],
				nodesOfF = page.modelOf('f').graph[2],
				nodesOfK = page.modelOf('f.k').graph[2],
				nodesOfG = page.modelOf('g').graph[2];
			/// f: [.., k() | nodes of k, CALL RETURN, ..]
			var indexOfK = nodesOfF.indexOf(built.callOfK.callSite);
			var orderOfF = nodesOfF.slice(0, indexOfK + 1).concat(nodesOfK, [built.callOfK.callReturn], nodesOfF.slice(indexOfK + 1));
			shouldBeSameObjects(expansion.nodeOrder(built.modelOfF), orderOfF);
			/// page: [.., f(x = 1) | nodes of f | CALL RETURN | .. | CALL | nodes of g | CALL RETURN | if (g()) | .. g() | CALL RETURN | ..]
			var at4 = nodesOfPage.indexOf(built.callOfF.callSite),
				at5 = nodesOfPage.indexOf(built.callOfG.callSite),
				at6 = nodesOfPage.indexOf(built.callOfGAgain.callSite);
			var expected = nodesOfPage.slice(0, at4 + 1)
				.concat(orderOfF, [built.callOfF.callReturn])
				.concat(nodesOfPage.slice(at4 + 1, at5), [built.callOfG.callNode])
				.concat(nodesOfG, [built.callOfG.callReturn, built.callOfG.callSite])
				.concat(nodesOfPage.slice(at5 + 1, at6 + 1), [built.callOfGAgain.callReturn])
				.concat(nodesOfPage.slice(at6 + 1));
			shouldBeSameObjects(expansion.nodeOrder(built.root), expected);
			shouldBeSameObjects(expanded.graph[2], expected.map(copyOf));
		});

		it('should keep the structure of the flat graph as before the refactoring but Q-a', function () {
			structureOf(expanded.graph).should.eql(CALLS_STRUCTURE);
		});

		it('should make the call-site not before a decision the CALL NODE', function () {
			var callSite = copyOf(built.callOfF.callSite),
				callReturn = copyOf(built.callOfF.callReturn);
			callSite.type.should.eql(FlowNode.CALL_NODE_TYPE);
			(callSite.call === copyOf(built.page.modelOf('f').graph[0])).should.be.true();
			(callSite.normal === null).should.be.true();
			/// the outgoing edge moved to the CALL RETURN NODE enters the CALL NODE inserted before the decision of line 5
			(callReturn.normal === copyOf(built.callOfG.callNode)).should.be.true();
			copyOf(built.page.modelOf('f').graph[1]).return.should.eql([callReturn]);
			/// the call in the inter-procedural callee is replayed as well
			copyOf(built.callOfK.callSite).type.should.eql(FlowNode.CALL_NODE_TYPE);
			(copyOf(built.callOfK.callSite).call === copyOf(built.page.modelOf('f.k').graph[0])).should.be.true();
		});

		it('should insert the CALL NODE before the decision node', function () {
			var decision = copyOf(built.callOfG.callSite),
				callNode = copyOf(built.callOfG.callNode),
				callReturn = copyOf(built.callOfG.callReturn);
			decision.type.should.eql(built.callOfG.callSite.type);
			shouldBeSameObjects(decision.prev, [callReturn]);
			(callReturn.normal === decision).should.be.true();
			(callNode.call === copyOf(built.page.modelOf('g').graph[0])).should.be.true();
			(decision.true === copyOf(built.callOfG.callSite.true)).should.be.true();
			(decision.false === copyOf(built.callOfG.callSite.false)).should.be.true();
			callNode.generate.size.should.eql(0);
			callReturn.generate.size.should.eql(0);
			/// the predecessor (the CALL RETURN NODE of line 4) enters the CALL NODE instead of the decision node
			shouldBeSameObjects(callNode.prev, [copyOf(built.callOfF.callReturn)]);
		});

		it('should connect the call-sites of a shared callee to one copy of it', function () {
			var entryOfG = copyOf(built.page.modelOf('g').graph[0]),
				exitOfG = copyOf(built.page.modelOf('g').graph[1]);
			expanded.graph[2].filter(function (node) {
				return node === entryOfG;
			}).should.have.length(1);
			shouldBeSameObjects(entryOfG.prev, [copyOf(built.callOfG.callNode), copyOf(built.callOfGAgain.callSite)]);
			shouldBeSameObjects(exitOfG.return, [copyOf(built.callOfG.callReturn), copyOf(built.callOfGAgain.callReturn)]);
		});

		it('should make every node a copy owned by the flat graph', function () {
			var originals = expansion.nodeOrder(built.root);
			expanded.flatNodeOf.size.should.eql(originals.filter(function (node, index) {
				return originals.indexOf(node) === index;
			}).length);
			expanded.flatNodeOf.forEach(function (copy, original) {
				(copy.original === original).should.be.true();
				(copy === original).should.be.false();
				expanded.graph[2].indexOf(copy).should.not.eql(-1);
			});
			(expanded.graph[0] === copyOf(built.page.modelOf('').graph[0])).should.be.true();
			(expanded.graph[1] === copyOf(built.page.modelOf('').graph[1])).should.be.true();
		});

		it('should not change the originals, the lower models and the counter of nodes', function () {
			var again = buildCalls(),
				originals = expansion.nodeOrder(again.root),
				before = snapshotOf(originals),
				structureOfF = structureOf(again.modelOfF.graph),
				counter = factoryFlowNode.counter;
			expansion.expand(again.root);
			var after = snapshotOf(originals);
			after.text.should.eql(before.text);
			shouldBeSameObjects(after.vardefs, before.vardefs);
			structureOf(again.modelOfF.graph).should.eql(structureOfF);
			factoryFlowNode.counter.should.eql(counter);
		});

		it('should expand twice to the same structure with different objects', function () {
			var other = expansion.expand(built.root);
			structureOf(other.graph).should.eql(structureOf(expanded.graph));
			other.graph[2].forEach(function (node) {
				expanded.graph[2].indexOf(node).should.eql(-1);
			});
		});

		it('should keep the graph of an intra-procedural model', function () {
			var model = built.page.modelOf('g'),
				result = expansion.expand(model);
			shouldBeSameObjects(result.graph[2], model.graph[2]);
			(result.graph[0] === model.graph[0]).should.be.true();
			(result.flatNodeOf.get(model.graph[0]) === model.graph[0]).should.be.true();
		});
	});

	describe('GEN of copies', function () {
		/**
		 * Assert the GEN of every copy is rebuilt with copies of the graph as
		 * the nodes of the definitions, in the order of the original GEN
		 * @param {Object} expanded result of expand
		 */
		function shouldRebuildEveryGEN(expanded) {
			var checked = 0;
			expanded.graph[2].forEach(function (copy) {
				var generate = copy.generate;
				if (generate === null) {
					return;
				}
				generate.values().forEach(function (vardef) {
					var fromNode = vardef.definition.fromNode;
					(fromNode.original === null).should.be.false('the node of the definition of ' + vardef.variable.name + ' is an original');
					expanded.graph[2].indexOf(fromNode).should.not.eql(-1);
					checked += 1;
				});
			});
			expanded.flatNodeOf.forEach(function (copy, original) {
				var originalGEN = original.generate;
				if (originalGEN === null || copy.type === FlowNode.CALL_NODE_TYPE ||
					original.type === FlowNode.CALL_RETURN_NODE_TYPE) {
					return;
				}
				/// a copy not changed by a call keeps the variables, types and ranges of its original GEN
				copy.generate.values().map(function (vardef) {
					return [vardef.variable, vardef.definition.type, vardef.definition.range.toString()];
				}).should.eql(originalGEN.values().map(function (vardef) {
					return [vardef.variable, vardef.definition.type, vardef.definition.range.toString()];
				}));
			});
			checked.should.be.above(0);
		}

		it('should rebuild the GEN of every copy with copies (f(x = 1) not a decision)', function () {
			var page = intraProceduralModelsOf(['function f(v) {}', 'var x;', 'f(x = 1);'].join('\n'));
			var root = hierarchy.createCallHierarchyModel(page.modelOf('')),
				callSite = nodeAt(page.modelOf(''), 3, 'f');
			var edge = hierarchy.addCallEdge(root, {callSite: callSite, calleeModel: page.modelOf('f')});
			var expanded = expandInto(root);
			shouldRebuildEveryGEN(expanded);
			var callReturn = expanded.flatNodeOf.get(edge.callReturn),
				definitionsOfX = callReturn.generate.values().filter(function (vardef) {
					return vardef.variable.name === 'x';
				});
			definitionsOfX.should.have.length(1);
			(definitionsOfX[0].definition.fromNode === expanded.flatNodeOf.get(callSite)).should.be.true();
			expanded.flatNodeOf.get(callSite).generate.size.should.eql(0);
			/// the original keeps its own definition
			var originalDefinitionOfX = callSite.generate.values().filter(function (vardef) {
				return vardef.variable.name === 'x';
			})[0];
			(originalDefinitionOfX.definition.fromNode === callSite).should.be.true();
		});

		// 004 contracts/model-api.md §2: keepGenerateAtCallSite (FR-007)
		it('should keep the GEN at the call-site with keepGenerateAtCallSite', function () {
			var page = intraProceduralModelsOf(['function f(v) {}', 'var x;', 'f(x = 1);'].join('\n'));
			var root = hierarchy.createCallHierarchyModel(page.modelOf('')),
				callSite = nodeAt(page.modelOf(''), 3, 'f');
			var edge = hierarchy.addCallEdge(root, {
				callSite: callSite,
				calleeModel: page.modelOf('f'),
				keepGenerateAtCallSite: true
			});
			var expanded = expandInto(root);
			shouldRebuildEveryGEN(expanded);
			var callNode = expanded.flatNodeOf.get(callSite),
				callReturn = expanded.flatNodeOf.get(edge.callReturn);
			callNode.type.should.eql(FlowNode.CALL_NODE_TYPE);
			(callNode.call === expanded.flatNodeOf.get(page.modelOf('f').graph[0])).should.be.true();
			var definitionsOfX = callNode.generate.values().filter(function (vardef) {
				return vardef.variable.name === 'x';
			});
			definitionsOfX.should.have.length(1);
			(definitionsOfX[0].definition.fromNode === callNode).should.be.true();
			callReturn.generate.size.should.eql(0);
			callReturn.kill.size.should.eql(0);
			/// the outgoing edges still move to the CALL RETURN NODE
			(callNode.normal === null).should.be.true();
			(callReturn.normal === expanded.flatNodeOf.get(callSite.normal)).should.be.true();
		});

		it('should rebuild the GEN of every copy with copies (probe a1)', function () {
			var page = intraProceduralModelsOf(fs.readFileSync(path.join(PROBES, 'a1.js'), 'utf8'));
			var modelOfF = hierarchy.createCallHierarchyModel(page.modelOf('f'));
			hierarchy.addCallEdge(modelOfF, {callSite: nodeAt(page.modelOf('f'), 2, 'k'), calleeModel: page.modelOf('f.k')});
			expandInto(modelOfF);
			var root = hierarchy.createCallHierarchyModel(page.modelOf('')),
				callSite = nodeAt(page.modelOf(''), 4, 'f');
			var edge = hierarchy.addCallEdge(root, {callSite: callSite, calleeModel: modelOfF});
			[5, 6, 7].forEach(function (line) {
				hierarchy.addCallEdge(root, {callSite: nodeAt(page.modelOf(''), line, 'g'), calleeModel: page.modelOf('g')});
			});
			var expanded = expandInto(root);
			shouldRebuildEveryGEN(expanded);
			var definitionsOfX = expanded.flatNodeOf.get(edge.callReturn).generate.values().filter(function (vardef) {
				return vardef.variable.name === 'x';
			});
			definitionsOfX.should.have.length(1);
			(definitionsOfX[0].definition.fromNode === expanded.flatNodeOf.get(callSite)).should.be.true();
		});
	});

	describe('model cycle', function () {
		/// a model object in its own subtree is a hierarchy built by hand wrongly
		/// (a call cycle built by modelBuilder is a back call edge instead)
		it('should throw for a model cycle built by hand', function () {
			var page = intraProceduralModelsOf(['function a() { b(); }', 'function b() { a(); }'].join('\n'));
			var modelOfA = hierarchy.createCallHierarchyModel(page.modelOf('a')),
				modelOfB = hierarchy.createCallHierarchyModel(page.modelOf('b'));
			hierarchy.addCallEdge(modelOfA, {callSite: nodeAt(page.modelOf('a'), 1, 'b'), calleeModel: modelOfB});
			hierarchy.addCallEdge(modelOfB, {callSite: nodeAt(page.modelOf('b'), 2, 'a'), calleeModel: modelOfA});
			hierarchy.freeze(modelOfA);
			hierarchy.freeze(modelOfB);
			var counter = factoryFlowNode.counter;
			(function () {
				expansion.expand(modelOfA);
			}).should.throw(/^model cycle in hierarchy: \$DOMAIN\.\$PAGE_0\.a -> \$DOMAIN\.\$PAGE_0\.b -> \$DOMAIN\.\$PAGE_0\.a$/);
			(function () {
				expansion.nodeOrder(modelOfB);
			}).should.throw(/^model cycle in hierarchy/);
			factoryFlowNode.counter.should.eql(counter);
		});
	});

	describe('back call edges (specs/004-fix-remaining-issues contracts/model-api.md §2)', function () {
		/// f calls itself before a decision (L2) and not before a decision (L3),
		/// g calls f, the page calls f
		var RECURSION = [
			'function f(n) {',
			'  if (f(n - 1)) { n = 0; }',
			'  f(n);',
			'}',
			'function g() { f(0); }',
			'f(1);'
		].join('\n');
		var page, modelOfF, backBeforeDecision, back, root, callOfF, expanded;

		function copyOf(node) {
			return expanded.flatNodeOf.get(node);
		}

		beforeEach(function () {
			page = intraProceduralModelsOf(RECURSION);
			modelOfF = hierarchy.createCallHierarchyModel(page.modelOf('f'));
			backBeforeDecision = hierarchy.addCallEdge(modelOfF, {callSite: nodeAt(page.modelOf('f'), 2, 'f'), calleeModel: page.modelOf('f'), back: true});
			back = hierarchy.addCallEdge(modelOfF, {callSite: nodeAt(page.modelOf('f'), 3, 'f'), calleeModel: page.modelOf('f'), back: true});
			hierarchy.freeze(modelOfF);
			root = hierarchy.createCallHierarchyModel(page.modelOf(''));
			callOfF = hierarchy.addCallEdge(root, {callSite: nodeAt(page.modelOf(''), 6, 'f'), calleeModel: modelOfF});
			hierarchy.freeze(root);
			expanded = expansion.expand(root);
		});

		it('should insert only the CALL NODE and the CALL RETURN NODE of a back call edge', function () {
			backBeforeDecision.beforeDecision.should.be.true();
			back.beforeDecision.should.be.false();
			var nodesOfF = page.modelOf('f').graph[2],
				nodesOfPage = page.modelOf('').graph[2],
				at2 = nodesOfF.indexOf(backBeforeDecision.callSite),
				at3 = nodesOfF.indexOf(back.callSite),
				at6 = nodesOfPage.indexOf(callOfF.callSite);
			var orderOfF = nodesOfF.slice(0, at2)
				.concat([backBeforeDecision.callNode, backBeforeDecision.callReturn, backBeforeDecision.callSite])
				.concat(nodesOfF.slice(at2 + 1, at3 + 1), [back.callReturn])
				.concat(nodesOfF.slice(at3 + 1));
			shouldBeSameObjects(expansion.nodeOrder(modelOfF), orderOfF);
			var expected = nodesOfPage.slice(0, at6 + 1)
				.concat(orderOfF, [callOfF.callReturn])
				.concat(nodesOfPage.slice(at6 + 1));
			shouldBeSameObjects(expansion.nodeOrder(root), expected);
			shouldBeSameObjects(expanded.graph[2], expected.map(copyOf));
		});

		it('should connect a back call edge to the copies of the entry and the exit of its target', function () {
			var entryOfF = copyOf(page.modelOf('f').graph[0]),
				exitOfF = copyOf(page.modelOf('f').graph[1]);
			expanded.graph[2].filter(function (node) {
				return node === entryOfF;
			}).should.have.length(1);
			(copyOf(backBeforeDecision.callNode).call === entryOfF).should.be.true();
			copyOf(back.callSite).type.should.eql(FlowNode.CALL_NODE_TYPE);
			(copyOf(back.callSite).call === entryOfF).should.be.true();
			/// replayed in the order of the sequence numbers: the back call edges of f first
			shouldBeSameObjects(entryOfF.prev, [copyOf(backBeforeDecision.callNode), copyOf(back.callSite), copyOf(callOfF.callSite)]);
			shouldBeSameObjects(exitOfF.return, [
				copyOf(backBeforeDecision.callReturn),
				copyOf(back.callReturn),
				copyOf(callOfF.callReturn)
			]);
			/// the decision node is entered from the CALL RETURN NODE before it
			shouldBeSameObjects(copyOf(backBeforeDecision.callSite).prev, [copyOf(backBeforeDecision.callReturn)]);
		});

		it('should record a bypass of every call edge, back call edges as well', function () {
			expanded.bypasses.size.should.eql(3);
			[
				[callOfF, copyOf(callOfF.callSite)],
				[backBeforeDecision, copyOf(backBeforeDecision.callNode)],
				[back, copyOf(back.callSite)]
			].forEach(function (pair) {
				var bypass = expanded.bypasses.get(copyOf(pair[0].callReturn));
				(bypass.callNode === pair[1]).should.be.true();
				(bypass.callReturn === copyOf(pair[0].callReturn)).should.be.true();
				(bypass.calleeScope === page.scopeOf('f')).should.be.true();
			});
		});

		it('should expand a closed model with back call edges only', function () {
			var ofF = expansion.expand(modelOfF);
			(ofF.graph[0] === ofF.flatNodeOf.get(page.modelOf('f').graph[0])).should.be.true();
			ofF.bypasses.size.should.eql(2);
		});

		it('should throw for a back call edge to a scope out of the model', function () {
			var modelOfG = hierarchy.createCallHierarchyModel(page.modelOf('g'));
			hierarchy.addCallEdge(modelOfG, {callSite: nodeAt(page.modelOf('g'), 5, 'f'), calleeModel: page.modelOf('f'), back: true});
			hierarchy.freeze(modelOfG);
			var counter = factoryFlowNode.counter;
			(function () {
				expansion.expand(modelOfG);
			}).should.throw(/^open hierarchy: back call edge to \$DOMAIN\.\$PAGE_0\.f outside the model$/);
			factoryFlowNode.counter.should.eql(counter);
		});
	});

	describe('chained calls and duplicated handlers', function () {
		/// the root inter-procedural model of probe a2 as before the refactoring, except that the
		/// exception edge of a call statement stays at the CALL NODE (feature 005, Q-a)
		var A2_STRUCTURE = [
			'entry=0 exit=30',
			'0 #15 entry normal=1 prev= next=1',
			'1 #16 normal normal=2 prev=0 next=2',
			'2 #17 call exception=30 call=3 prev=1 next=30,3',
			'3 #35 entry normal=4 prev=2 next=4',
			'4 #36 normal normal=5 exception=5 prev=3 next=5',
			'5 #37 exit return=6 prev=4 next=6',
			'6 #81 call call=7 prev=5 next=7',
			'7 #41 entry normal=8 prev=6 next=8',
			'8 #42 normal normal=9 exception=9 prev=7 next=9',
			'9 #43 exit return=10 prev=8 next=10',
			'10 #82 call call=11 prev=9 next=11',
			'11 #48 entry normal=12 prev=10 next=12',
			'12 #49 normal normal=13 exception=13 prev=11 next=13',
			'13 #50 exit return=14 prev=12 next=14',
			'14 #83 callReturn normal=15 prev=13 next=15',
			'15 #18 call exception=30 call=16 prev=14 next=30,16',
			'16 #63 entry normal=17 prev=15 next=17',
			'17 #64 normal normal=18 exception=23 prev=16 next=23,18',
			'18 #65 call exception=23 call=19 prev=17 next=23,19',
			'19 #70 entry normal=20 prev=18 next=20',
			'20 #71 normal normal=21 exception=21 prev=19 next=21',
			'21 #72 exit return=22 prev=20 next=22',
			'22 #84 callReturn normal=23 prev=21 next=23',
			'23 #66 exit return=24 prev=17,18,22 next=24',
			'24 #85 callReturn normal=25 prev=23 next=25',
			'25 #19 normal normal=26 exception=30 prev=24 next=30,26',
			'26 #20 normal normal=27 exception=30 prev=25 next=30,27',
			'27 #21 normal normal=28 exception=30 prev=26 next=30,28',
			'28 #22 normal normal=29 exception=30 prev=27 next=30,29',
			'29 #23 normal normal=30 exception=30 prev=28 next=30',
			'30 #24 exit prev=2,15,25,26,27,28,29 next='
		];
		/// the intra-page and inter-page models of probe r8 as before the refactoring, except that
		/// the exception edge of a call statement stays at the CALL NODE (feature 005, Q-a)
		var R8_PAGE_STRUCTURE = [
			'entry=0 exit=15',
			'0 #11 entry normal=1 prev= next=1',
			'1 #12 normal normal=2 prev=0 next=2',
			'2 #13 call exception=14 call=3 prev=1 next=3,14',
			'3 #28 entry normal=4 prev=2,14 next=4',
			'4 #29 normal normal=5 exception=10 prev=3 next=10,5',
			'5 #30 call exception=10 call=6 prev=4 next=10,6',
			'6 #35 entry normal=7 prev=5 next=7',
			'7 #36 normal normal=8 exception=8 prev=6 next=8',
			'8 #37 exit return=9 prev=7 next=9',
			'9 #38 callReturn normal=10 prev=8 next=10',
			'10 #31 exit normal=19 return=11 prev=4,5,9 next=11,19',
			'11 #39 callReturn normal=12 prev=10 next=12',
			'12 #14 normal normal=13 exception=14 prev=11 next=13,14',
			'13 #15 normal normal=14 exception=14 prev=12 next=14',
			'14 #40 loop normal=15 onEvent=16,3,16 prev=2,12,13,19 next=15,16,3',
			'15 #16 exit prev=14 next=',
			'16 #20 entry normal=17 prev=14 next=17',
			'17 #21 normal normal=18 exception=18 prev=16 next=18',
			'18 #22 exit normal=19 prev=17 next=19',
			'19 #41 loopReturn return=14 prev=18,10 next=14',
			'20 #28 entry normal=4 prev=2,14 next=4',
			'21 #29 normal normal=5 exception=10 prev=3 next=10,5',
			'22 #30 call exception=10 call=6 prev=4 next=10,6',
			'23 #35 entry normal=7 prev=5 next=7',
			'24 #36 normal normal=8 exception=8 prev=6 next=8',
			'25 #37 exit return=9 prev=7 next=9',
			'26 #38 callReturn normal=10 prev=8 next=10',
			'27 #31 exit normal=19 return=11 prev=4,5,9 next=11,19',
			'28 #20 entry normal=17 prev=14 next=17',
			'29 #21 normal normal=18 exception=18 prev=16 next=18',
			'30 #22 exit normal=19 prev=17 next=19'
		];
		var R8_INTER_PAGE_STRUCTURE = [
			'entry=0 exit=0',
			'0 #42 localStorage loadStorage=1 prev=14 next=1',
			'1 #11 entry normal=2 prev=0 next=2',
			'2 #12 normal normal=3 prev=1 next=3',
			'3 #13 call exception=15 call=4 prev=2 next=4,15',
			'4 #28 entry normal=5 prev=3,15 next=5',
			'5 #29 normal normal=6 exception=11 prev=4 next=11,6',
			'6 #30 call exception=11 call=7 prev=5 next=11,7',
			'7 #35 entry normal=8 prev=6 next=8',
			'8 #36 normal normal=9 exception=9 prev=7 next=9',
			'9 #37 exit return=10 prev=8 next=10',
			'10 #38 callReturn normal=11 prev=9 next=11',
			'11 #31 exit normal=20 return=12 prev=5,6,10 next=12,20',
			'12 #39 callReturn normal=13 prev=11 next=13',
			'13 #14 normal normal=14 exception=15 prev=12 next=14,15',
			'14 #15 normal normal=15 exception=15 saveStorage=0 prev=13 next=15,0',
			'15 #40 loop normal=16 onEvent=17,4,17 prev=3,13,14,20 next=16,17,4',
			'16 #16 exit prev=15 next=',
			'17 #20 entry normal=18 prev=15 next=18',
			'18 #21 normal normal=19 exception=19 prev=17 next=19',
			'19 #22 exit normal=20 prev=18 next=20',
			'20 #41 loopReturn return=15 prev=19,11 next=15',
			'21 #28 entry normal=5 prev=3,15 next=5',
			'22 #29 normal normal=6 exception=11 prev=4 next=11,6',
			'23 #30 call exception=11 call=7 prev=5 next=11,7',
			'24 #35 entry normal=8 prev=6 next=8',
			'25 #36 normal normal=9 exception=9 prev=7 next=9',
			'26 #37 exit return=10 prev=8 next=10',
			'27 #38 callReturn normal=11 prev=9 next=11',
			'28 #31 exit normal=20 return=12 prev=5,6,10 next=12,20',
			'29 #20 entry normal=18 prev=15 next=18',
			'30 #21 normal normal=19 exception=19 prev=17 next=19',
			'31 #22 exit normal=20 prev=18 next=20'
		];

		it('should chain the callees of a node (probe a2 class static members)', function () {
			var page = intraProceduralModelsOf(fs.readFileSync(path.join(PROBES, 'a2.js'), 'utf8'));
			var root = hierarchy.createCallHierarchyModel(page.modelOf('')),
				callSite = nodeAt(page.modelOf(''), 3);
			/// static a, the static block and static b run in this order at the class
			var edges = ['$ANONYMOUS_FUN_0', '$ANONYMOUS_FUN_1', '$ANONYMOUS_FUN_2'].map(function (name) {
				var edge = hierarchy.addCallEdge(root, {callSite: callSite, calleeModel: page.modelOf(name)});
				callSite = edge.callReturn;
				return edge;
			});
			var modelOfH = hierarchy.createCallHierarchyModel(page.modelOf('h'));
			hierarchy.addCallEdge(modelOfH, {callSite: nodeAt(page.modelOf('h'), 4, 'reg'), calleeModel: page.modelOf('h.reg')});
			expandInto(modelOfH);
			hierarchy.addCallEdge(root, {callSite: nodeAt(page.modelOf(''), 5, 'h'), calleeModel: modelOfH});
			(edges[1].callSite === edges[0].callReturn).should.be.true();
			(edges[2].callSite === edges[1].callReturn).should.be.true();
			edges.map(function (edge) { return edge.order; }).should.eql([0, 1, 2]);
			edges.map(function (edge) { return edge.beforeDecision; }).should.eql([false, false, false]);
			var expanded = expandInto(root);
			structureOf(expanded.graph).should.eql(A2_STRUCTURE);
			/// the CALL RETURN NODE of a callee is the CALL NODE of the next one
			expanded.flatNodeOf.get(edges[0].callReturn).type.should.eql(FlowNode.CALL_NODE_TYPE);
			(expanded.flatNodeOf.get(edges[0].callReturn).call ===
				expanded.flatNodeOf.get(page.modelOf('$ANONYMOUS_FUN_1').graph[0])).should.be.true();
		});

		it('should keep duplicated handlers as one copy (probe r8: g, h, g)', function () {
			var page = intraProceduralModelsOf(fs.readFileSync(path.join(PROBES, 'r8.js'), 'utf8'));
			var modelOfH = hierarchy.createCallHierarchyModel(page.modelOf('h'));
			hierarchy.addCallEdge(modelOfH, {callSite: nodeAt(page.modelOf('h'), 3, 'reg'), calleeModel: page.modelOf('h.reg')});
			expandInto(modelOfH);
			var root = hierarchy.createCallHierarchyModel(page.modelOf(''));
			hierarchy.addCallEdge(root, {callSite: nodeAt(page.modelOf(''), 4, 'h'), calleeModel: modelOfH});
			expandInto(root);
			var modelOfG = page.modelOf('g');
			var intraPageModel = hierarchy.createIntraPageModel(root, [modelOfG, modelOfH, modelOfG]);
			var expanded = expandInto(intraPageModel);
			structureOf(expanded.graph).should.eql(R8_PAGE_STRUCTURE);
			/// the node array is the concatenation, with duplicates, of the copies
			var nodesOfPage = expansion.nodeOrder(root),
				loop = intraPageModel.hierarchy.loop;
			nodesOfPage.splice(nodesOfPage.indexOf(page.modelOf('').graph[1]), 0, loop);
			var expected = nodesOfPage.concat(modelOfG.graph[2], [intraPageModel.hierarchy.loopReturn],
				expansion.nodeOrder(modelOfH), modelOfG.graph[2]);
			shouldBeSameObjects(expanded.graph[2], expected.map(function (node) {
				return expanded.flatNodeOf.get(node);
			}));
			var entryOfG = expanded.flatNodeOf.get(modelOfG.graph[0]);
			shouldBeSameObjects(expanded.flatNodeOf.get(loop).onEvent,
				[entryOfG, expanded.flatNodeOf.get(page.modelOf('h').graph[0]), entryOfG]);
			var interPageModel = hierarchy.createInterPageModel([intraPageModel]);
			structureOf(expandInto(interPageModel).graph).should.eql(R8_INTER_PAGE_STRUCTURE);
		});

		it('should keep a handler listed twice as one copy (probe a4: onA, onA)', function () {
			var page = intraProceduralModelsOf(fs.readFileSync(path.join(PROBES, 'a4.js'), 'utf8'));
			var modelOfA = hierarchy.createCallHierarchyModel(page.modelOf('onA'));
			hierarchy.addCallEdge(modelOfA, {callSite: nodeAt(page.modelOf('onA'), 2, 'deep'), calleeModel: page.modelOf('onA.deep')});
			expandInto(modelOfA);
			var intraPageModel = hierarchy.createIntraPageModel(page.modelOf(''), [modelOfA, modelOfA]);
			var expanded = expandInto(intraPageModel),
				nodesOfA = expansion.nodeOrder(modelOfA);
			var nodesOfPage = expansion.nodeOrder(page.modelOf(''));
			nodesOfPage.splice(nodesOfPage.indexOf(page.modelOf('').graph[1]), 0, intraPageModel.hierarchy.loop);
			var expected = nodesOfPage.concat(nodesOfA, [intraPageModel.hierarchy.loopReturn], nodesOfA);
			shouldBeSameObjects(expanded.graph[2], expected.map(function (node) {
				return expanded.flatNodeOf.get(node);
			}));
			var offset = nodesOfPage.length + nodesOfA.length + 1;
			nodesOfA.forEach(function (node, index) {
				(expanded.graph[2][nodesOfPage.length + index] === expanded.graph[2][offset + index]).should.be.true();
			});
			var entryOfA = expanded.flatNodeOf.get(page.modelOf('onA').graph[0]);
			shouldBeSameObjects(expanded.flatNodeOf.get(intraPageModel.hierarchy.loop).onEvent, [entryOfA, entryOfA]);
		});
	});
});

/*
 * Flat graphs of the inter-procedural models built by the builder (real
 * modeling of the probes in tests/dujs/cases/probes/ and of a program of
 * tests/dujs/classfields.js; task T029)
 */
describe('expansion by the builder', function () {
	'use strict';
	after(analyze.reset);

	/**
	 * The inter-procedural model of the page of an analyzed program
	 * @param {Object} result result of the analyze helper
	 * @returns {Model}
	 */
	function pageInterProceduralModelOf(result) {
		var found = modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels.filter(function (model) {
			return model.mainlyRelatedScope === result.scopeTree.root;
		});
		found.should.have.length(1);
		return found[0];
	}

	/**
	 * Call edges of the hierarchy of a model whose call-site is at a line
	 * @param {Model} model
	 * @param {number} line
	 * @returns {Array}
	 */
	function callEdgesAt(model, line) {
		return model.hierarchy.edges.filter(function (edge) {
			return edge.kind === 'call' && edge.callSite.line === line;
		});
	}

	/**
	 * Assert the flat graph of a call edge: predecessors -> CALL NODE -> entry
	 * of the callee ... exit of the callee -> CALL RETURN NODE -> the decision
	 * node (a call before a decision) or the successors moved from the call-site
	 * @param {Model} model
	 * @param {Object} edge
	 */
	function shouldConnectTheCall(model, edge) {
		var callSite = model.flatNodeOf(edge.callSite),
			callReturn = model.flatNodeOf(edge.callReturn),
			callNode = edge.beforeDecision ? model.flatNodeOf(edge.callNode) : callSite,
			entry = model.flatNodeOf(hierarchy.entryOf(edge.calleeModel)),
			exit = model.flatNodeOf(hierarchy.exitOf(edge.calleeModel));
		[callSite, callReturn, callNode, entry, exit].forEach(function (node) {
			FlowNode.isFlowNode(node).should.be.true();
			model.graph[2].indexOf(node).should.not.eql(-1);
		});
		callNode.type.should.eql(FlowNode.CALL_NODE_TYPE);
		callNode.prev.length.should.be.above(0);
		callNode.prev.forEach(function (prevNode) {
			prevNode.next.indexOf(callNode).should.not.eql(-1);
		});
		(callNode.call === entry).should.be.true();
		exit.return.indexOf(callReturn).should.not.eql(-1);
		/// a CALL RETURN NODE chained to the next callee is its CALL NODE
		var chained = model.hierarchy.edges.some(function (other) {
			return other.kind === 'call' && other.callSite === edge.callReturn;
		});
		callReturn.type.should.eql(chained ? FlowNode.CALL_NODE_TYPE : FlowNode.CALL_RETURN_NODE_TYPE);
		if (edge.beforeDecision) {
			(callReturn.normal === callSite).should.be.true();
			shouldBeSameObjects(callSite.prev, [callReturn]);
			(!!callSite.true && !!callSite.false).should.be.true();
			(callSite.call === null).should.be.true();
		} else {
			(callSite.normal === null).should.be.true();
			callReturn.next.length.should.be.above(0);
		}
	}

	it('should connect the calls of probe a1 (not a decision, before decisions of if, while and for)', function () {
		var model = pageInterProceduralModelOf(analyze(fs.readFileSync(path.join(PROBES, 'a1.js'), 'utf8')));
		/// line 4 f(x = 1); line 5 if (g()); line 6 while (g()); line 7 for (...; g(); ...)
		[[4, false], [5, true], [6, true], [7, true]].forEach(function (expected) {
			var edges = callEdgesAt(model, expected[0]);
			edges.should.have.length(1);
			edges[0].beforeDecision.should.eql(expected[1]);
			shouldConnectTheCall(model, edges[0]);
		});
		/// the call returns of lines 5 to 7 go back to their decision nodes
		[5, 6, 7].forEach(function (line) {
			var edge = callEdgesAt(model, line)[0];
			(model.flatNodeOf(edge.callReturn).normal === model.flatNodeOf(edge.callSite)).should.be.true();
		});
		/// the GEN of the CALL RETURN NODE of f(x = 1) defines x at the copy of the call-site
		var callOfF = callEdgesAt(model, 4)[0],
			callSite = model.flatNodeOf(callOfF.callSite),
			definitionsOfX = model.flatNodeOf(callOfF.callReturn).generate.values().filter(function (vardef) {
				return vardef.variable.name === 'x';
			});
		definitionsOfX.should.have.length(1);
		(definitionsOfX[0].definition.fromNode === callSite).should.be.true();
		(callSite.original === callOfF.callSite).should.be.true();
		callSite.generate.size.should.eql(0);
		/// the original keeps its own definition of x
		callOfF.callSite.generate.values().filter(function (vardef) {
			return vardef.variable.name === 'x' && vardef.definition.fromNode === callOfF.callSite;
		}).should.have.length(1);
	});

	/**
	 * Assert the callees of a node are chained: the CALL RETURN NODE of a callee
	 * is the call-site (the CALL NODE in the flat graph) of the next one
	 * @param {Model} model
	 * @param {Array} edges call edges of the node in order
	 */
	function shouldChain(model, edges) {
		edges.map(function (edge) {
			return edge.order;
		}).should.eql(edges.map(function (edge, index) {
			return index;
		}));
		edges.forEach(function (edge, index) {
			shouldConnectTheCall(model, edge);
			if (index > 0) {
				(edge.callSite === edges[index - 1].callReturn).should.be.true();
				edge.beforeDecision.should.be.false();
				var previousReturn = model.flatNodeOf(edges[index - 1].callReturn);
				previousReturn.type.should.eql(FlowNode.CALL_NODE_TYPE);
				(previousReturn.call === model.flatNodeOf(hierarchy.entryOf(edge.calleeModel))).should.be.true();
			}
		});
	}

	it('should chain the static members of a class (probe a2)', function () {
		var model = pageInterProceduralModelOf(analyze(fs.readFileSync(path.join(PROBES, 'a2.js'), 'utf8')));
		var edges = model.hierarchy.edges.filter(function (edge) {
			return edge.kind === 'call' && (edge.callSite.line === 3 || edge.callSite.type === FlowNode.CALL_RETURN_NODE_TYPE);
		});
		edges.should.have.length(3);
		edges.map(function (edge) {
			return String(edge.calleeModel.mainlyRelatedScope);
		}).should.eql(['$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_2']);
		shouldChain(model, edges);
	});

	it('should chain the static member of a class argument and the called function (classfields)', function () {
		var model = pageInterProceduralModelOf(analyze([
			'var v = 1;',
			'function foo(k) {',
			'  return v;',
			'}',
			'foo(class X {',
			'  static s = (v = 2);',
			'});'
		].join('\n')));
		var edges = model.hierarchy.edges.filter(function (edge) {
			return edge.kind === 'call';
		});
		edges.should.have.length(2);
		edges[0].callSite.line.should.eql(5);
		edges.map(function (edge) {
			return String(edge.calleeModel.mainlyRelatedScope);
		}).should.eql(['$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0', '$DOMAIN.$PAGE_0.foo']);
		shouldChain(model, edges);
	});
});

/// feature 005 US6 (FR-013, data-model §7): replayLoop redirects the finally edges to the exit of
/// the page as well (a labeled break of the page jumping to the end of the program through a finally)
describe('replayLoop with finally edges', function () {
	'use strict';
	after(analyze.reset);

	var PROGRAM = [
		'let r = 0;',
		'function h() {',
		'console.log(r);',
		'}',
		'document.addEventListener(\'click\', h);',
		'out: try {',
		'r = 1;',
		'break out;',
		'} finally {',
		'r = 3;',
		'}'
	].join('\n');

	it('should redirect the finally edge to the exit of the page to the LOOP NODE', function () {
		var result = analyze(PROGRAM),
			model = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraPageModels[0],
			graph = model.graph,
			finallyExits = graph[2].filter(function (node) {
				return node.type === FlowNode.FINALLY_EXIT_NODE_TYPE;
			}),
			loops = graph[2].filter(function (node) {
				return node.type === FlowNode.LOOP_NODE_TYPE;
			});
		finallyExits.should.have.length(1);
		loops.should.have.length(1);
		finallyExits[0].finally.indexOf(loops[0]).should.not.eql(-1);
		finallyExits[0].finally.indexOf(graph[1]).should.eql(-1);
		graph[1].prev.indexOf(finallyExits[0]).should.eql(-1);
	});

	it('should reach the handler with the definition of the finally block', function () {
		var pairs = analyze(PROGRAM).intraPage();
		pairs.should.containEql('r: L10 -> L3');
	});
});

/*
 * Feature 005 (User Story 1, research R1, R2 Q-a, data-model §3, §4): the
 * exception edge of a call statement stays at the CALL NODE (Q-a), expand
 * returns the CallSiteRecords of the calls and the map of the rebuilt
 * VarDefs (flatVarDefOf), and expandShallow builds the summary graph of a
 * scope (its own nodes and the CALL NODE and CALL RETURN NODE of its own
 * calls, no node of a callee).
 */
describe('expansion of feature 005 (Q-a, CallSiteRecord, expandShallow)', function () {
	'use strict';
	after(analyze.reset);

	var RECORD_FIELDS = ['callNode', 'callReturn', 'calleeScope', 'exceptionalReturn', 'entry', 'exit',
		'seq', 'back', 'beforeDecision', 'callSiteLine'];

	describe('Q-a and the CallSiteRecords of expand', function () {
		var built, expanded;

		beforeEach(function () {
			built = buildCalls();
			expanded = expansion.expand(built.root);
		});

		function copyOf(node) {
			return expanded.flatNodeOf.get(node);
		}

		it('should keep the exception edge of a call statement at the CALL NODE', function () {
			var exitOfPage = copyOf(built.page.modelOf('').graph[1]);
			[built.callOfF, built.callOfGAgain].forEach(function (edge) {
				var callSite = copyOf(edge.callSite),
					callReturn = copyOf(edge.callReturn);
				callSite.type.should.eql(FlowNode.CALL_NODE_TYPE);
				(callSite.exception === exitOfPage).should.be.true();
				(callReturn.exception === null).should.be.true();
				(callReturn.normal !== null).should.be.true();
			});
			/// the call of k in f: the exception edge goes to the exit of f
			(copyOf(built.callOfK.callSite).exception === copyOf(built.page.modelOf('f').graph[1])).should.be.true();
			(copyOf(built.callOfK.callReturn).exception === null).should.be.true();
		});

		it('should keep a call before a decision node as before (the decision keeps its exception edge)', function () {
			var decision = copyOf(built.callOfG.callSite),
				callNode = copyOf(built.callOfG.callNode);
			(decision.exception === copyOf(built.page.modelOf('').graph[1])).should.be.true();
			(callNode.exception === null).should.be.true();
		});

		it('should return one frozen CallSiteRecord per call edge in the order of the sequence numbers', function () {
			expanded.calls.should.have.length(4);
			expanded.calls.map(function (record) {
				return record.seq;
			}).should.eql([built.callOfK, built.callOfF, built.callOfG, built.callOfGAgain].map(function (edge) {
				return edge.seq;
			}));
			expanded.calls.forEach(function (record) {
				Object.isFrozen(record).should.be.true();
				Object.keys(record).sort().should.eql(RECORD_FIELDS.slice().sort());
				(expanded.bypasses.get(record.callReturn) === record).should.be.true();
			});
			expanded.bypasses.size.should.eql(4);
		});

		it('should fill the fields of the records of a call and of a call before a decision', function () {
			var exitOfPage = copyOf(built.page.modelOf('').graph[1]),
				ofF = expanded.bypasses.get(copyOf(built.callOfF.callReturn)),
				ofG = expanded.bypasses.get(copyOf(built.callOfG.callReturn));
			(ofF.callNode === copyOf(built.callOfF.callSite)).should.be.true();
			(ofF.calleeScope === built.page.scopeOf('f')).should.be.true();
			(ofF.entry === copyOf(built.page.modelOf('f').graph[0])).should.be.true();
			(ofF.exit === copyOf(built.page.modelOf('f').graph[1])).should.be.true();
			(ofF.exceptionalReturn === exitOfPage).should.be.true();
			ofF.back.should.be.false();
			ofF.beforeDecision.should.be.false();
			ofF.callSiteLine.should.eql(4);
			(ofG.callNode === copyOf(built.callOfG.callNode)).should.be.true();
			(ofG.calleeScope === built.page.scopeOf('g')).should.be.true();
			(ofG.exceptionalReturn === exitOfPage).should.be.true();
			ofG.beforeDecision.should.be.true();
			ofG.callSiteLine.should.eql(5);
		});

		it('should map every original VarDef to the rebuilt VarDef of the graph (flatVarDefOf)', function () {
			(expanded.flatVarDefOf instanceof Map).should.be.true();
			var mapped = 0;
			expanded.flatNodeOf.forEach(function (copy, original) {
				if (!original.generate) {
					return;
				}
				original.generate.values().forEach(function (vardef) {
					var rebuilt = expanded.flatVarDefOf.get(vardef);
					(!!rebuilt && rebuilt !== vardef).should.be.true();
					rebuilt.variable.should.equal(vardef.variable);
					expanded.graph[2].indexOf(rebuilt.definition.fromNode).should.not.eql(-1);
					mapped += 1;
				});
			});
			mapped.should.be.above(0);
		});

		it('should return no call and the identity of the VarDefs for an intra-procedural model', function () {
			var model = built.page.modelOf('f'),
				result = expansion.expand(model);
			result.calls.should.eql([]);
			result.flatVarDefOf.size.should.be.above(0);
			result.flatVarDefOf.forEach(function (to, from) {
				(to === from).should.be.true();
			});
		});

		it('should set the exceptional return of chained calls to the target of the first call-site (probe a2)', function () {
			var page = intraProceduralModelsOf(fs.readFileSync(path.join(PROBES, 'a2.js'), 'utf8'));
			var root = hierarchy.createCallHierarchyModel(page.modelOf('')),
				callSite = nodeAt(page.modelOf(''), 3);
			var edges = ['$ANONYMOUS_FUN_0', '$ANONYMOUS_FUN_1', '$ANONYMOUS_FUN_2'].map(function (name) {
				var edge = hierarchy.addCallEdge(root, {callSite: callSite, calleeModel: page.modelOf(name)});
				callSite = edge.callReturn;
				return edge;
			});
			var chained = expansion.expand(hierarchy.freeze(root)),
				exitOfPage = chained.flatNodeOf.get(page.modelOf('').graph[1]);
			edges.forEach(function (edge, index) {
				var record = chained.bypasses.get(chained.flatNodeOf.get(edge.callReturn));
				(record.exceptionalReturn === exitOfPage).should.be.true();
				(record.callNode === chained.flatNodeOf.get(index === 0 ? edge.callSite : edges[index - 1].callReturn))
					.should.be.true();
				(chained.flatNodeOf.get(edge.callReturn).exception === null).should.be.true();
			});
			(chained.flatNodeOf.get(edges[0].callSite).exception === exitOfPage).should.be.true();
		});
	});

	describe('expandShallow', function () {
		var built;

		beforeEach(function () {
			built = buildCalls();
		});

		it('should hold the nodes of the scope and the structure nodes of its own calls only', function () {
			var shallow = expansion.expandShallow(built.root),
				nodesOfPage = built.page.modelOf('').graph[2],
				templates = [built.callOfF.callReturn, built.callOfG.callNode, built.callOfG.callReturn,
					built.callOfGAgain.callReturn];
			shallow.graph[2].should.have.length(nodesOfPage.length + templates.length);
			shallow.graph[2].forEach(function (copy) {
				(copy.original !== copy).should.be.true();
				(nodesOfPage.indexOf(copy.original) !== -1 || templates.indexOf(copy.original) !== -1).should.be.true();
			});
			(shallow.graph[0] === shallow.flatNodeOf.get(nodesOfPage[0])).should.be.true();
			(shallow.graph[0].original === built.page.modelOf('').graph[0]).should.be.true();
			(shallow.graph[1].original === built.page.modelOf('').graph[1]).should.be.true();
		});

		it('should record the calls without connecting the callees', function () {
			var shallow = expansion.expandShallow(built.root);
			shallow.calls.should.have.length(3);
			shallow.calls.forEach(function (record) {
				(record.entry === null).should.be.true();
				(record.exit === null).should.be.true();
				(record.callNode.call === null).should.be.true();
				record.callReturn.prev.should.have.length(0);
				shallow.graph[2].indexOf(record.callNode).should.not.eql(-1);
				shallow.graph[2].indexOf(record.callReturn).should.not.eql(-1);
			});
			shallow.calls.map(function (record) {
				return record.calleeScope;
			}).should.eql([built.page.scopeOf('f'), built.page.scopeOf('g'), built.page.scopeOf('g')]);
			/// Q-a in the summary graph as well
			var ofF = shallow.calls[0],
				exitOfPage = shallow.graph[1];
			(ofF.callNode.exception === exitOfPage).should.be.true();
			(ofF.exceptionalReturn === exitOfPage).should.be.true();
			(ofF.callReturn.exception === null).should.be.true();
		});

		it('should keep the original VarDefs in the GEN of the copies (moved to the CALL RETURN NODE)', function () {
			var shallow = expansion.expandShallow(built.root),
				callSite = built.callOfF.callSite;
			shallow.flatNodeOf.forEach(function (copy, original) {
				if (!original.generate || original === callSite) {
					return;
				}
				(copy.generate === original.generate).should.be.false();
				shouldBeSameObjects(copy.generate.values(), original.generate.values());
			});
			/// the GEN of f(x = 1) moves to its CALL RETURN NODE
			callSite.generate.size.should.be.above(0);
			shallow.flatNodeOf.get(callSite).generate.size.should.eql(0);
			shouldBeSameObjects(shallow.flatNodeOf.get(built.callOfF.callReturn).generate.values(),
				callSite.generate.values());
		});

		it('should not change the originals, the templates, the counter and the sequence numbers', function () {
			var originals = expansion.nodeOrder(built.root),
				before = snapshotOf(originals),
				counter = factoryFlowNode.counter,
				seq = hierarchy.nextSeq();
			expansion.expandShallow(built.root);
			expansion.expandShallow(built.modelOfF);
			var after = snapshotOf(originals);
			after.text.should.eql(before.text);
			shouldBeSameObjects(after.vardefs, before.vardefs);
			factoryFlowNode.counter.should.eql(counter);
			hierarchy.nextSeq().should.eql(seq + 1);
			/// the flat graph expanded after it is not affected
			structureOf(expansion.expand(built.root).graph).should.eql(CALLS_STRUCTURE);
		});

		it('should give different copies each time', function () {
			var one = expansion.expandShallow(built.root),
				another = expansion.expandShallow(built.root);
			structureOf(one.graph).should.eql(structureOf(another.graph));
			one.graph[2].forEach(function (node) {
				another.graph[2].indexOf(node).should.eql(-1);
			});
		});

		it('should hold the call of k but no node of k for the model of f', function () {
			var shallow = expansion.expandShallow(built.modelOfF),
				nodesOfF = built.page.modelOf('f').graph[2];
			shallow.graph[2].should.have.length(nodesOfF.length + 1);
			shallow.calls.should.have.length(1);
			(shallow.calls[0].calleeScope === built.page.scopeOf('f.k')).should.be.true();
			(shallow.flatNodeOf.has(built.page.modelOf('f.k').graph[0])).should.be.false();
		});

		it('should copy the nodes of an intra-procedural model with no call', function () {
			var model = built.page.modelOf('g'),
				shallow = expansion.expandShallow(model);
			shallow.calls.should.eql([]);
			shallow.graph[2].should.have.length(model.graph[2].length);
			shallow.graph[2].forEach(function (copy, index) {
				(copy.original === model.graph[2][index]).should.be.true();
			});
			(shallow.graph[0].original === model.graph[0]).should.be.true();
		});

		it('should record back call edges as calls', function () {
			var page = intraProceduralModelsOf([
				'function f(n) {',
				'  f(n - 1);',
				'}',
				'f(1);'
			].join('\n'));
			var modelOfF = hierarchy.createCallHierarchyModel(page.modelOf('f'));
			hierarchy.addCallEdge(modelOfF, {callSite: nodeAt(page.modelOf('f'), 2, 'f'), calleeModel: page.modelOf('f'), back: true});
			var shallow = expansion.expandShallow(hierarchy.freeze(modelOfF));
			shallow.calls.should.have.length(1);
			shallow.calls[0].back.should.be.true();
			shallow.graph[2].should.have.length(page.modelOf('f').graph[2].length + 1);
		});

		it('should throw for a model with a hierarchy other than inter-procedural', function () {
			var intraPage = hierarchy.createIntraPageModel(built.root, []);
			(function () {
				expansion.expandShallow(intraPage);
			}).should.throw(/^expandShallow: not an inter-procedural model/);
		});
	});

	/// User Story 4 (T075, data-model §5): expand replays the loop, loopReturn and event edges into
	/// LoopRecords {loop, loopReturn, handlers: [{scope, entry, exit}], noHandler}; a handler
	/// registered twice is one handler (its copies are the same nodes)
	describe('LoopRecords of expand', function () {
		var LOOP_FIELDS = ['loop', 'loopReturn', 'handlers', 'noHandler'];

		it('should give one frozen LoopRecord per page, the handlers once each in their order', function () {
			var built = buildCalls(),
				modelOfG = built.page.modelOf('g'),
				intraPage = hierarchy.createIntraPageModel(built.root, [modelOfG, built.modelOfF, modelOfG]),
				expanded = expansion.expand(intraPage);
			function copyOf(node) {
				return expanded.flatNodeOf.get(node);
			}
			expanded.loops.should.have.length(1);
			var record = expanded.loops[0];
			Object.isFrozen(record).should.be.true();
			Object.keys(record).sort().should.eql(LOOP_FIELDS.slice().sort());
			(record.loop === copyOf(intraPage.hierarchy.loop)).should.be.true();
			(record.loopReturn === copyOf(intraPage.hierarchy.loopReturn)).should.be.true();
			record.loopReturn.type.should.eql(FlowNode.LOOP_RETURN_NODE_TYPE);
			record.noHandler.should.be.false();
			record.handlers.should.have.length(2);
			(record.handlers[0].scope === built.page.scopeOf('g')).should.be.true();
			(record.handlers[0].entry === copyOf(modelOfG.graph[0])).should.be.true();
			(record.handlers[0].exit === copyOf(modelOfG.graph[1])).should.be.true();
			(record.handlers[1].scope === built.page.scopeOf('f')).should.be.true();
			(record.handlers[1].entry === copyOf(built.page.modelOf('f').graph[0])).should.be.true();
			(record.handlers[1].exit === copyOf(built.page.modelOf('f').graph[1])).should.be.true();
			record.handlers.forEach(function (handler) {
				Object.keys(handler).sort().should.eql(['entry', 'exit', 'scope']);
				(handler.exit.normal === record.loopReturn).should.be.true();
			});
		});

		it('should give a LoopRecord without a handler', function () {
			var built = buildCalls(),
				expanded = expansion.expand(hierarchy.createIntraPageModel(built.root, []));
			expanded.loops.should.have.length(1);
			expanded.loops[0].noHandler.should.be.true();
			expanded.loops[0].handlers.should.eql([]);
		});

		it('should give the LoopRecords of every page to the inter-page model and none to the others', function () {
			var built = buildCalls(),
				intraPage = hierarchy.createIntraPageModel(built.root, [built.page.modelOf('g')]);
			expansion.expand(built.root).loops.should.eql([]);
			expansion.expand(built.page.modelOf('g')).loops.should.eql([]);
			var other = intraProceduralModelsOf('var y = 1;'),
				otherPage = hierarchy.createIntraPageModel(other.modelOf(''), []);
			expandInto(intraPage);
			expandInto(otherPage);
			var expanded = expansion.expand(hierarchy.createInterPageModel([intraPage, otherPage]));
			expanded.loops.should.have.length(2);
			expanded.loops[0].handlers.should.have.length(1);
			expanded.loops[1].noHandler.should.be.true();
			(expanded.loops[0].loop === expanded.flatNodeOf.get(intraPage.hierarchy.loop)).should.be.true();
			(expanded.loops[1].loop === expanded.flatNodeOf.get(otherPage.hierarchy.loop)).should.be.true();
		});
	});
});
