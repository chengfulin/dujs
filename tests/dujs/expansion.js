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
	FlowNode = require('../../lib/esgraph/flownode');

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
