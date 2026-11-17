/*
 * Test cases of the bypass rule of calls (specs/004-fix-remaining-issues,
 * FR-016, research R6, contracts/model-api.md §2-§4, data-model §5).
 * Original dujs code, MIT License (see LICENSE).
 *
 * A definition reaching a call-site that the callee cannot see (or that is a
 * variable of the callee itself, another activation record) reaches the CALL
 * RETURN NODE directly. The expected pairs are those of contracts/acceptance.md
 * "FR-016"; byp-3.js is asserted with the method calls (User Story 3).
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	Model = require('../../lib/dujs/model'),
	expansion = require('../../lib/dujs/expansion'),
	hierarchy = require('../../lib/dujs/hierarchy'),
	defuseAnalyzer = require('../../lib/dujs/defuseanalyzer'),
	factoryDef = require('../../lib/dujs/deffactory'),
	factoryVarDef = require('../../lib/dujs/vardeffactory'),
	FlowNode = require('../../lib/esgraph/flownode');
var Set = require('../../lib/analyses/set');

var PROBES = path.join(__dirname, 'cases', 'probes004'),
	PROBES003 = path.join(__dirname, 'cases', 'probes'),
	PAGE = '$DOMAIN.$PAGE_0';

/**
 * The Var with the name registered in a scope or else in its nearest ancestor
 * (the scope name API getVariable was removed by feature 006)
 * @param {Scope} scope
 * @param {string} name
 * @returns {Var|null}
 */
function variableNamed(scope, name) {
	'use strict';
	for (var current = scope; !!current; current = current.parent) {
		var found = current.variables.filter(function (variable) {
			return variable.name === name;
		})[0];
		if (!!found) {
			return found;
		}
	}
	return null;
}

/**
 * Analyze a probe program
 * @param {string} directory
 * @param {string} name File name without extension
 * @returns {Object}
 */
function analyzeProbe(directory, name) {
	'use strict';
	return analyze(fs.readFileSync(path.join(directory, name + '.js'), 'utf8'));
}

/**
 * The inter-procedural model of the page scope
 * @param {Object} result
 * @returns {Model}
 */
function pageInterProceduralModelOf(result) {
	'use strict';
	var found = modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels.filter(function (model) {
		return model.mainlyRelatedScope === result.scopeTree.root;
	});
	found.should.have.length(1);
	return found[0];
}

/**
 * Call edges of the subtree of a model (no duplicates)
 * @param {Model} model
 * @returns {Array}
 */
function callEdgesOf(model) {
	'use strict';
	var edges = [];
	(function collect(current) {
		if (!current.hierarchy) {
			return;
		}
		current.hierarchy.units.forEach(function (unit) {
			if (!!unit.model) {
				collect(unit.model);
			}
		});
		current.hierarchy.edges.forEach(function (edge) {
			if (edge.kind === 'call' && edges.indexOf(edge) === -1) {
				edges.push(edge);
			}
		});
	}(model));
	return edges;
}

describe('Bypass rule of calls (FR-016)', function () {
	'use strict';
	after(analyze.reset);

	describe('acceptance (intra-page def-use pairs)', function () {
		/// a block variable t unseen by f reaches console.log(t) around the call f()
		it('byp-1 should keep the pair of a block variable around a call', function () {
			analyzeProbe(PROBES, 'byp-1').intraPage().should.eql([
				'console: entry -> L8',
				'f: entry -> L7',
				't: L6 -> L8'
			]);
		});

		/// the parameter a of check shadows the global a (KI §16, the consequence)
		it('ki16b should keep the pair of a global shadowed by a parameter of the callee', function () {
			analyzeProbe(PROBES, 'ki16b').intraPage().should.eql([
				'a: L1 -> L5',
				'a: L1 -> L6',
				'a: entry -> L3',
				'check: entry -> L5'
			]);
		});

		/// the call check(a) before the decision of if (check(a) || b)
		it('ki16 should keep the pairs of a global shadowed by a parameter around a call before a decision', function () {
			analyzeProbe(PROBES, 'ki16').intraPage().should.eql([
				'a: L4 -> L5',
				'a: L4 -> L8',
				'a: entry -> L2',
				'b: L4 -> L5:F>L6:T',
				'b: L4 -> L5:F>L8:F',
				'check: entry -> L5>L5:F',
				'check: entry -> L5>L6:T'
			]);
		});

		/// f() inside g was not connected (004 H3); since feature 005 D2 it is connected to the only definition of f,
		/// and the pairs are unchanged (x of f is not read after the call)
		it('byp-2 should keep the pairs when f() in g is connected (005 D2)', function () {
			analyzeProbe(PROBES, 'byp-2').intraPage().should.eql([
				'f: entry -> L7',
				'g: entry -> L10',
				'p: entry -> L8',
				't: L6 -> L8'
			]);
		});
	});

	describe('bypassFilter', function () {
		var bypassFilter = defuseAnalyzer._testonly_._bypassFilter;

		it('should keep the definitions unseen by the callee or of its own variables', function () {
			var result = analyze([
				'var x = 0, y = 0;',
				'function f(y) {',
				'  var z = 1;',
				'  {',
				'    let w = 2;',
				'  }',
				'  x = y;',
				'}',
				'f(1);'
			].join('\n'));
			var root = result.scopeTree.root,
				calleeScope = result.scopeTree.scopes.filter(function (scope) {
					return String(scope) === PAGE + '.f';
				})[0],
				blockScope = calleeScope.children.filter(function (child) {
					return child.variables.some(function (variable) {
						return variable.name === 'w';
					});
				})[0],
				node = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels[0].graph[0];
			function vardefOf(variable) {
				return factoryVarDef.create(variable, factoryDef.createLiteralDef(node, [0, 1]));
			}
			var outerX = vardefOf(variableNamed(root, 'x')),
				outerY = vardefOf(variableNamed(root, 'y')),
				ownY = vardefOf(variableNamed(calleeScope, 'y')),
				ownZ = vardefOf(variableNamed(calleeScope, 'z')),
				blockW = vardefOf(variableNamed(blockScope, 'w')),
				filtered = bypassFilter(new Set([outerX, outerY, ownY, ownZ, blockW]), calleeScope);
			(filtered instanceof Set).should.be.true();
			filtered.size.should.eql(4);
			/// x is seen and not shadowed by f: the callee may change it
			filtered.has(outerX).should.be.false();
			/// y of the page is shadowed by the parameter y
			filtered.has(outerY).should.be.true();
			/// variables of f and of its block scopes (another activation record)
			filtered.has(ownY).should.be.true();
			filtered.has(ownZ).should.be.true();
			filtered.has(blockW).should.be.true();
		});
	});

	describe('bypasses of expand', function () {
		/**
		 * Assert one bypass per call edge of the model, keyed by the copy of its CALL RETURN NODE
		 * @param {Model} model
		 * @returns {Object} {expanded, edges}
		 */
		function shouldRecordEachCallEdge(model) {
			var expanded = expansion.expand(model),
				edges = callEdgesOf(model);
			(expanded.bypasses instanceof Map).should.be.true();
			expanded.bypasses.size.should.eql(edges.length);
			edges.forEach(function (edge) {
				var callReturn = expanded.flatNodeOf.get(edge.callReturn),
					bypass = expanded.bypasses.get(callReturn);
				(!!bypass).should.be.true();
				(bypass.callReturn === callReturn).should.be.true();
				(bypass.calleeScope === edge.calleeModel.mainlyRelatedScope).should.be.true();
				(bypass.callNode.call === expanded.flatNodeOf.get(hierarchy.entryOf(edge.calleeModel))).should.be.true();
			});
			return {expanded: expanded, edges: edges};
		}

		it('should record the call-site of a call not before a decision and the CALL NODE of a call before a decision', function () {
			var result = analyzeProbe(PROBES003, 'a1'),
				model = pageInterProceduralModelOf(result),
				checked = shouldRecordEachCallEdge(model),
				expanded = checked.expanded,
				lines = [];
			model.hierarchy.edges.filter(function (edge) {
				return edge.kind === 'call';
			}).forEach(function (edge) {
				var bypass = expanded.bypasses.get(expanded.flatNodeOf.get(edge.callReturn));
				if (edge.beforeDecision) {
					(bypass.callNode === expanded.flatNodeOf.get(edge.callNode)).should.be.true();
				} else {
					(bypass.callNode === expanded.flatNodeOf.get(edge.callSite)).should.be.true();
				}
				lines.push([edge.callSite.line, edge.beforeDecision]);
			});
			/// f(x = 1) at line 4; g() before the decisions at lines 5 to 7
			lines.should.eql([[4, false], [5, true], [6, true], [7, true]]);
		});

		it('should record the CALL RETURN NODE of the previous callee of chained calls', function () {
			var result = analyzeProbe(PROBES003, 'a2'),
				model = pageInterProceduralModelOf(result),
				expanded = shouldRecordEachCallEdge(model).expanded,
				chained = model.hierarchy.edges.filter(function (edge) {
					return edge.kind === 'call' && model.hierarchy.edges.some(function (other) {
						return other.kind === 'call' && other.callReturn === edge.callSite;
					});
				});
			chained.length.should.be.above(0);
			chained.forEach(function (edge) {
				var bypass = expanded.bypasses.get(expanded.flatNodeOf.get(edge.callReturn));
				(bypass.callNode === expanded.flatNodeOf.get(edge.callSite)).should.be.true();
				bypass.callNode.type.should.eql(FlowNode.CALL_NODE_TYPE);
			});
		});

		it('should return an empty Map for an intra-procedural model', function () {
			var result = analyze('var x = 1;\nx = 2;'),
				model = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels[0],
				expanded = expansion.expand(model);
			(expanded.bypasses instanceof Map).should.be.true();
			expanded.bypasses.size.should.eql(0);
		});
	});

	describe('Model.setCallBypasses and callBypassOf', function () {
		it('should set the bypasses only once', function () {
			var model = new Model();
			model.setCallBypasses(new Map());
			(function () {
				model.setCallBypasses(new Map());
			}).should.throw();
		});

		it('should return null for a node not a CALL RETURN NODE with a bypass', function () {
			var result = analyzeProbe(PROBES, 'byp-1'),
				model = pageInterProceduralModelOf(result),
				callReturns = model.graph[2].filter(function (node) {
					return node.type === FlowNode.CALL_RETURN_NODE_TYPE;
				});
			callReturns.should.have.length(1);
			var bypass = model.callBypassOf(callReturns[0]);
			(bypass.callReturn === callReturns[0]).should.be.true();
			bypass.calleeScope.name.should.eql(PAGE + '.f');
			bypass.callNode.type.should.eql(FlowNode.CALL_NODE_TYPE);
			(model.callBypassOf(model.graph[0]) === null).should.be.true();
			(model.callBypassOf(bypass.callNode) === null).should.be.true();
			(new Model().callBypassOf(callReturns[0]) === null).should.be.true();
		});
	});

	describe('effective input of a CALL RETURN NODE', function () {
		it('should record the merged input in reachIns and analysisResultOf', function () {
			var result = analyzeProbe(PROBES, 'byp-1'),
				model = pageInterProceduralModelOf(result),
				callReturn = model.graph[2].filter(function (node) {
					return node.type === FlowNode.CALL_RETURN_NODE_TYPE;
				})[0];
			function namesAndLines(set) {
				return set.values().map(function (vardef) {
					return vardef.variable.name + '@' + vardef.definition.fromNode.line;
				});
			}
			var reachIns = model.analysisResultOf(callReturn).reachIns;
			namesAndLines(reachIns).should.containEql('t@6');
			namesAndLines(callReturn.reachIns).should.containEql('t@6');
		});
	});
});
