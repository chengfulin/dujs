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
 * statement of correctness. The probes n1, n1b and n1c are not asserted here
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
						'i: entry -> L7',
						'k: entry -> L2',
						'v: entry -> L2',
						'x: L4 -> L3',
						'x: L4 -> L6',
						'x: L4 -> entry',
						'x: L5 -> L3',
						'x: L5 -> L6',
						'x: L5 -> entry',
						'x: L6 -> L3',
						'x: L6 -> L6',
						'x: L6 -> entry',
						'x: L7 -> L3',
						'x: L7 -> L6',
						'x: L7 -> entry'
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
				'i: entry -> L7',
				'k: entry -> L2',
				'v: entry -> L2',
				'x: L4 -> L3',
				'x: L4 -> L6',
				'x: L4 -> entry',
				'x: L5 -> L3',
				'x: L5 -> L6',
				'x: L5 -> entry',
				'x: L6 -> L3',
				'x: L6 -> L6',
				'x: L6 -> entry',
				'x: L7 -> L3',
				'x: L7 -> L6',
				'x: L7 -> entry'
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
				'i: entry -> L7',
				'k: entry -> L2',
				'v: entry -> L2',
				'x: L4 -> L3',
				'x: L4 -> L6',
				'x: L4 -> entry',
				'x: L5 -> L3',
				'x: L5 -> L6',
				'x: L5 -> entry',
				'x: L6 -> L3',
				'x: L6 -> L6',
				'x: L6 -> entry',
				'x: L7 -> L3',
				'x: L7 -> L6',
				'x: L7 -> entry'
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
						'init: entry -> entry',
						'n: L3 -> L10',
						'n: L3 -> L9',
						'n: L4 -> L10',
						'n: L4 -> L9',
						'reg: entry -> L4',
						'window: entry -> L4',
						'window: entry -> L6',
						'window: entry -> L7',
						'window: entry -> L8',
						'window: entry -> entry'
					]
				}
			],
			intraPage: [
				'h: entry -> L5',
				'h: entry -> L6',
				'h: entry -> L7',
				'h: entry -> L8',
				'h: entry -> entry',
				'init: entry -> L3',
				'init: entry -> entry',
				'n: L3 -> L10',
				'n: L3 -> L9',
				'n: L4 -> L10',
				'n: L4 -> L9',
				'n: L8 -> L10',
				'n: L8 -> L9',
				'reg: entry -> L4',
				'reg: entry -> entry',
				'window: entry -> L4',
				'window: entry -> L6',
				'window: entry -> L7',
				'window: entry -> L8',
				'window: entry -> entry'
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
				'h: entry -> entry',
				'init: entry -> L3',
				'init: entry -> entry',
				'n: L3 -> L10',
				'n: L3 -> L9',
				'n: L4 -> L10',
				'n: L4 -> L9',
				'n: L8 -> L10',
				'n: L8 -> L9',
				'reg: entry -> L4',
				'reg: entry -> entry',
				'window: entry -> L4',
				'window: entry -> L6',
				'window: entry -> L7',
				'window: entry -> L8',
				'window: entry -> entry'
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
						's: L1 -> entry',
						's: L3 -> L10>L10:F',
						's: L3 -> L10>L10:T',
						's: L3 -> L5>L5:T',
						's: L3 -> L5>L6:F',
						's: L3 -> L6>L6:F',
						's: L3 -> L6>L6:T',
						's: L6 -> L10>L10:F',
						's: L6 -> L10>L10:T',
						's: L7 -> L10>L10:F',
						's: L7 -> L10>L10:T'
					]
				}
			],
			intraPage: [
				'inner: L3 -> L4',
				'outer: entry -> L9',
				's: L1 -> L3',
				's: L1 -> entry',
				's: L3 -> L10>L10:F',
				's: L3 -> L10>L10:T',
				's: L3 -> L5>L5:T',
				's: L3 -> L5>L6:F',
				's: L3 -> L6>L6:F',
				's: L3 -> L6>L6:T',
				's: L6 -> L10>L10:F',
				's: L6 -> L10>L10:T',
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
				's: L1 -> entry',
				's: L3 -> L10>L10:F',
				's: L3 -> L10>L10:T',
				's: L3 -> L5>L5:T',
				's: L3 -> L5>L6:F',
				's: L3 -> L6>L6:F',
				's: L3 -> L6>L6:T',
				's: L6 -> L10>L10:F',
				's: L6 -> L10>L10:T',
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
				'q: L1 -> entry',
				'q: L2 -> L2',
				'q: L2 -> L2>L2:T',
				'q: L2 -> L2>exit:F',
				'q: L2 -> entry',
				'q: L3 -> L2',
				'q: L3 -> L2>L2:T',
				'q: L3 -> L2>exit:F',
				'q: L3 -> entry',
				'q: L7 -> L2',
				'q: L7 -> L2>L2:T',
				'q: L7 -> L2>exit:F',
				'q: L7 -> L8',
				'q: L7 -> entry',
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
				'q: L1 -> entry',
				'q: L2 -> L2',
				'q: L2 -> L2>L2:T',
				'q: L2 -> L2>exit:F',
				'q: L2 -> entry',
				'q: L3 -> L2',
				'q: L3 -> L2>L2:T',
				'q: L3 -> L2>exit:F',
				'q: L3 -> entry',
				'q: L7 -> L2',
				'q: L7 -> L2>L2:T',
				'q: L7 -> L2>exit:F',
				'q: L7 -> L8',
				'q: L7 -> entry',
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
						'a: L1 -> entry',
						'a: L13 -> L6',
						'a: L13 -> entry',
						'g: entry -> L12',
						'k: entry -> L14'
					]
				}
			],
			intraPage: [
				'a: L1 -> L3',
				'a: L1 -> entry',
				'a: L13 -> L6',
				'a: L13 -> entry',
				'g: entry -> L12',
				'k: entry -> L14'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0'
			],
			interPage: [
				'a: L1 -> L3',
				'a: L1 -> entry',
				'a: L13 -> L6',
				'a: L13 -> entry',
				'g: entry -> L12',
				'k: entry -> L14'
			]
		},
		r6c: {
			interProcedural: [
				{
					scopes: [
						'$DOMAIN.$PAGE_0.f',
						'$DOMAIN.$PAGE_0.f.h'
					],
					pairs: [
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
						'a: L11 -> entry',
						'f: entry -> L10',
						'g: entry -> L12',
						'g: entry -> L8',
						'g: entry -> entry',
						'h: entry -> L7'
					]
				}
			],
			intraPage: [
				'a: L11 -> L3',
				'a: L11 -> entry',
				'f: entry -> L10',
				'g: entry -> L12',
				'g: entry -> L8',
				'g: entry -> entry',
				'h: entry -> L7'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0'
			],
			interPage: [
				'a: L11 -> L3',
				'a: L11 -> entry',
				'f: entry -> L10',
				'g: entry -> L12',
				'g: entry -> L8',
				'g: entry -> entry',
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
						'g: entry -> entry',
						'h: entry -> L4',
						'h: entry -> L5',
						'n: L1 -> L6',
						'n: L3 -> L6',
						'reg: entry -> L3',
						'window: entry -> L3',
						'window: entry -> L5',
						'window: entry -> entry'
					]
				}
			],
			intraPage: [
				'g: entry -> L3',
				'g: entry -> entry',
				'h: entry -> L4',
				'h: entry -> L5',
				'n: L1 -> L6',
				'n: L2 -> L6',
				'n: L3 -> L6',
				'reg: entry -> L3',
				'window: entry -> L3',
				'window: entry -> L5',
				'window: entry -> entry'
			],
			onEvent: [
				'$DOMAIN.$PAGE_0.g',
				'$DOMAIN.$PAGE_0.h',
				'$DOMAIN.$PAGE_0.g'
			],
			interPage: [
				'g: entry -> L3',
				'g: entry -> entry',
				'h: entry -> L4',
				'h: entry -> L5',
				'n: L1 -> L6',
				'n: L2 -> L6',
				'n: L3 -> L6',
				'reg: entry -> L3',
				'window: entry -> L3',
				'window: entry -> L5',
				'window: entry -> entry'
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

/// the root inter-procedural model of CALLS as before the refactoring
var CALLS_STRUCTURE = [
	'entry=0 exit=21',
	'0 #14 entry normal=1 prev= next=1',
	'1 #15 normal normal=2 prev=0 next=2',
	'2 #16 call call=3 prev=1 next=3',
	'3 #27 entry normal=4 prev=2 next=4',
	'4 #28 call call=5 prev=3 next=5',
	'5 #34 entry normal=6 prev=4 next=6',
	'6 #35 normal normal=7 exception=7 prev=5 next=7',
	'7 #36 exit return=8 prev=6 next=8',
	'8 #44 callReturn normal=9 exception=10 prev=7 next=9,10',
	'9 #29 normal normal=10 prev=8 next=10',
	'10 #30 exit return=11 prev=9,8 next=11',
	'11 #45 callReturn normal=12 exception=21 prev=10 next=12,21',
	'12 #47 call call=13 prev=11 next=13',
	'13 #41 entry normal=14 prev=12,19 next=14',
	'14 #42 normal normal=15 prev=13 next=15',
	'15 #43 exit return=16,20 prev=14 next=16,20',
	'16 #46 callReturn normal=17 prev=15 next=17',
	'17 #17 normal true=18 false=19 exception=21 prev=16 next=21,18,19',
	'18 #18 normal normal=19 exception=21 prev=17 next=21,19',
	'19 #19 call call=13 prev=18,17 next=13',
	'20 #48 callReturn normal=21 exception=21 prev=15 next=21',
	'21 #20 exit prev=18,17,11,20 next='
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

		it('should keep the structure of the flat graph as before the refactoring', function () {
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

	describe('call cycle', function () {
		it('should throw for a call cycle built by hand', function () {
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
			}).should.throw(/^call cycle in hierarchy: \$DOMAIN\.\$PAGE_0\.a -> \$DOMAIN\.\$PAGE_0\.b -> \$DOMAIN\.\$PAGE_0\.a$/);
			(function () {
				expansion.nodeOrder(modelOfB);
			}).should.throw(/^call cycle in hierarchy/);
			factoryFlowNode.counter.should.eql(counter);
		});
	});

	describe('chained calls and duplicated handlers', function () {
		/// the root inter-procedural model of probe a2 as before the refactoring
		var A2_STRUCTURE = [
			'entry=0 exit=30',
			'0 #15 entry normal=1 prev= next=1',
			'1 #16 normal normal=2 prev=0 next=2',
			'2 #17 call call=3 prev=1 next=3',
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
			'14 #83 callReturn normal=15 exception=30 prev=13 next=15,30',
			'15 #18 call call=16 prev=14 next=16',
			'16 #63 entry normal=17 prev=15 next=17',
			'17 #64 normal normal=18 exception=23 prev=16 next=23,18',
			'18 #65 call call=19 prev=17 next=19',
			'19 #70 entry normal=20 prev=18 next=20',
			'20 #71 normal normal=21 exception=21 prev=19 next=21',
			'21 #72 exit return=22 prev=20 next=22',
			'22 #84 callReturn normal=23 exception=23 prev=21 next=23',
			'23 #66 exit return=24 prev=17,22 next=24',
			'24 #85 callReturn normal=25 exception=30 prev=23 next=25,30',
			'25 #19 normal normal=26 exception=30 prev=24 next=30,26',
			'26 #20 normal normal=27 exception=30 prev=25 next=30,27',
			'27 #21 normal normal=28 exception=30 prev=26 next=30,28',
			'28 #22 normal normal=29 exception=30 prev=27 next=30,29',
			'29 #23 normal normal=30 exception=30 prev=28 next=30',
			'30 #24 exit prev=25,26,27,28,29,14,24 next='
		];
		/// the intra-page and inter-page models of probe r8 as before the refactoring
		var R8_PAGE_STRUCTURE = [
			'entry=0 exit=15',
			'0 #11 entry normal=1 prev= next=1',
			'1 #12 normal normal=2 prev=0 next=2',
			'2 #13 call call=3 prev=1 next=3',
			'3 #28 entry normal=4 prev=2,14 next=4',
			'4 #29 normal normal=5 exception=10 prev=3 next=10,5',
			'5 #30 call call=6 prev=4 next=6',
			'6 #35 entry normal=7 prev=5 next=7',
			'7 #36 normal normal=8 exception=8 prev=6 next=8',
			'8 #37 exit return=9 prev=7 next=9',
			'9 #38 callReturn normal=10 exception=10 prev=8 next=10',
			'10 #31 exit normal=19 return=11 prev=4,9 next=11,19',
			'11 #39 callReturn normal=12 exception=14 prev=10 next=12,14',
			'12 #14 normal normal=13 exception=14 prev=11 next=13,14',
			'13 #15 normal normal=14 exception=14 prev=12 next=14',
			'14 #40 loop normal=15 onEvent=16,3,16 prev=12,13,11,19 next=15,16,3',
			'15 #16 exit prev=14 next=',
			'16 #20 entry normal=17 prev=14 next=17',
			'17 #21 normal normal=18 exception=18 prev=16 next=18',
			'18 #22 exit normal=19 prev=17 next=19',
			'19 #41 loopReturn return=14 prev=18,10 next=14',
			'20 #28 entry normal=4 prev=2,14 next=4',
			'21 #29 normal normal=5 exception=10 prev=3 next=10,5',
			'22 #30 call call=6 prev=4 next=6',
			'23 #35 entry normal=7 prev=5 next=7',
			'24 #36 normal normal=8 exception=8 prev=6 next=8',
			'25 #37 exit return=9 prev=7 next=9',
			'26 #38 callReturn normal=10 exception=10 prev=8 next=10',
			'27 #31 exit normal=19 return=11 prev=4,9 next=11,19',
			'28 #20 entry normal=17 prev=14 next=17',
			'29 #21 normal normal=18 exception=18 prev=16 next=18',
			'30 #22 exit normal=19 prev=17 next=19'
		];
		var R8_INTER_PAGE_STRUCTURE = [
			'entry=0 exit=0',
			'0 #42 localStorage loadStorage=1 prev=14 next=1',
			'1 #11 entry normal=2 prev=0 next=2',
			'2 #12 normal normal=3 prev=1 next=3',
			'3 #13 call call=4 prev=2 next=4',
			'4 #28 entry normal=5 prev=3,15 next=5',
			'5 #29 normal normal=6 exception=11 prev=4 next=11,6',
			'6 #30 call call=7 prev=5 next=7',
			'7 #35 entry normal=8 prev=6 next=8',
			'8 #36 normal normal=9 exception=9 prev=7 next=9',
			'9 #37 exit return=10 prev=8 next=10',
			'10 #38 callReturn normal=11 exception=11 prev=9 next=11',
			'11 #31 exit normal=20 return=12 prev=5,10 next=12,20',
			'12 #39 callReturn normal=13 exception=15 prev=11 next=13,15',
			'13 #14 normal normal=14 exception=15 prev=12 next=14,15',
			'14 #15 normal normal=15 exception=15 saveStorage=0 prev=13 next=15,0',
			'15 #40 loop normal=16 onEvent=17,4,17 prev=13,14,12,20 next=16,17,4',
			'16 #16 exit prev=15 next=',
			'17 #20 entry normal=18 prev=15 next=18',
			'18 #21 normal normal=19 exception=19 prev=17 next=19',
			'19 #22 exit normal=20 prev=18 next=20',
			'20 #41 loopReturn return=15 prev=19,11 next=15',
			'21 #28 entry normal=5 prev=3,15 next=5',
			'22 #29 normal normal=6 exception=11 prev=4 next=11,6',
			'23 #30 call call=7 prev=5 next=7',
			'24 #35 entry normal=8 prev=6 next=8',
			'25 #36 normal normal=9 exception=9 prev=7 next=9',
			'26 #37 exit return=10 prev=8 next=10',
			'27 #38 callReturn normal=11 exception=11 prev=9 next=11',
			'28 #31 exit normal=20 return=12 prev=5,10 next=12,20',
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
