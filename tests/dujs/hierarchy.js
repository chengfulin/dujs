/*
 * Test cases of the hierarchies of upper models built by hand
 * (lib/dujs/hierarchy.js, specs/003-hierarchical-models).
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var fs = require('fs'),
	path = require('path');
var analyze = require('../helpers/analyze'),
	executor = require('../../lib/dujs/defuseanalysisexecutor'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	expansion = require('../../lib/dujs/expansion'),
	hierarchy = require('../../lib/dujs/hierarchy'),
	hierarchyDot = require('../../lib/dujs/hierarchydot'),
	Model = require('../../lib/dujs/model'),
	FlowNode = require('../../lib/esgraph/flownode'),
	factoryFlowNode = require('../../lib/esgraph/flownodefactory'),
	sourceReader = require('../../lib/dujs/sourcereader');

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
	return model.graph[2].filter(function (node) {
		return node.line === line && (!calleeName ||
			(!!node.astNode && node.astNode.type === 'CallExpression' && node.astNode.callee.name === calleeName));
	})[0];
}

/**
 * Whether a node has no edge at all
 * @param {FlowNode} node
 * @returns {boolean}
 */
function hasNoEdge(node) {
	'use strict';
	return node.prev.length === 0 && node.next.length === 0 &&
		FlowNode.CONNECTION_TYPES.every(function (type) {
			return [].concat(node[type] || []).length === 0;
		});
}

/// function f calls k (nested), the page calls f (not a decision), g before a
/// decision and g again (not a decision)
var CALLS = [
	'var x = 0;',
	'function f(v) { function k() { x = 3; } k(); return v; }',
	'function g() { return x; }',
	'f(x = 1);',
	'if (g()) { x = 2; }',
	'g();'
].join('\n');

describe('hierarchy', function () {
	'use strict';
	after(analyze.reset);

	describe('nextSeq', function () {
		it('should increase strictly', function () {
			var first = hierarchy.nextSeq(),
				second = hierarchy.nextSeq();
			second.should.be.above(first);
		});
	});

	describe('createCallHierarchyModel', function () {
		it('should create an inter-procedural model with the main unit', function () {
			var page = intraProceduralModelsOf(CALLS),
				mainModel = page.modelOf(''),
				counter = factoryFlowNode.counter;
			var model = hierarchy.createCallHierarchyModel(mainModel);
			model.level.should.eql(Model.INTER_PROCEDURAL);
			model.hierarchy.level.should.eql(Model.INTER_PROCEDURAL);
			model.hierarchy.main.kind.should.eql('main');
			(model.hierarchy.main.scope === page.scopeOf('')).should.be.true();
			(model.hierarchy.main.model === mainModel).should.be.true();
			model.hierarchy.units.should.have.length(1);
			(model.hierarchy.units[0] === model.hierarchy.main).should.be.true();
			model.hierarchy.edges.should.have.length(0);
			(model.mainlyRelatedScope === page.scopeOf('')).should.be.true();
			model.relatedScopes.should.have.length(1);
			factoryFlowNode.counter.should.eql(counter);
		});
	});

	describe('addCallEdge', function () {
		var page, model;

		beforeEach(function () {
			page = intraProceduralModelsOf(CALLS);
			model = hierarchy.createCallHierarchyModel(page.modelOf(''));
		});

		it('should record a call not before a decision with a CALL RETURN NODE template only', function () {
			var callSite = nodeAt(page.modelOf(''), 4, 'f'),
				counter = factoryFlowNode.counter;
			var edge = hierarchy.addCallEdge(model, {callSite: callSite, calleeModel: page.modelOf('f')});
			factoryFlowNode.counter.should.eql(counter + 1);
			edge.kind.should.eql('call');
			(edge.caller === model.hierarchy.main).should.be.true();
			edge.callee.kind.should.eql('function');
			(edge.callee.scope === page.scopeOf('f')).should.be.true();
			(edge.callee.model === page.modelOf('f')).should.be.true();
			(edge.calleeModel === page.modelOf('f')).should.be.true();
			(edge.callSite === callSite).should.be.true();
			edge.order.should.eql(0);
			edge.beforeDecision.should.be.false();
			(edge.callNode === null).should.be.true();
			edge.callReturn.type.should.eql(FlowNode.CALL_RETURN_NODE_TYPE);
			edge.callReturn.cfgId.should.eql(counter);
			edge.callReturn.line.should.eql(callSite.line);
			edge.callReturn.col.should.eql(callSite.col);
			edge.callReturn.labelPath.should.eql(callSite.labelPath);
			(edge.callReturn.scope === callSite.scope).should.be.true();
			hasNoEdge(edge.callReturn).should.be.true();
			Object.isFrozen(edge).should.be.true();
			model.hierarchy.edges.should.eql([edge]);
			model.hierarchy.units.should.have.length(2);
			(model.hierarchy.units[1] === edge.callee).should.be.true();
		});

		it('should create the CALL RETURN NODE before the CALL NODE for a call before a decision', function () {
			var callSite = nodeAt(page.modelOf(''), 5, 'g'),
				counter = factoryFlowNode.counter;
			var edge = hierarchy.addCallEdge(model, {callSite: callSite, calleeModel: page.modelOf('g')});
			factoryFlowNode.counter.should.eql(counter + 2);
			edge.beforeDecision.should.be.true();
			edge.order.should.eql(0);
			edge.callReturn.type.should.eql(FlowNode.CALL_RETURN_NODE_TYPE);
			edge.callReturn.cfgId.should.eql(counter);
			edge.callNode.type.should.eql(FlowNode.CALL_NODE_TYPE);
			edge.callNode.cfgId.should.eql(counter + 1);
			[edge.callNode, edge.callReturn].forEach(function (template) {
				template.line.should.eql(callSite.line);
				template.col.should.eql(callSite.col);
				template.labelPath.should.eql(callSite.labelPath);
				(template.scope === callSite.scope).should.be.true();
				hasNoEdge(template).should.be.true();
			});
		});

		it('should not change the call-sites', function () {
			var nonDecision = nodeAt(page.modelOf(''), 4, 'f'),
				decision = nodeAt(page.modelOf(''), 5, 'g');
			var before = [nonDecision, decision].map(function (node) {
				return [node.type, node.prev, node.next, node.true, node.false, node.normal, node.generate];
			});
			hierarchy.addCallEdge(model, {callSite: nonDecision, calleeModel: page.modelOf('f')});
			hierarchy.addCallEdge(model, {callSite: decision, calleeModel: page.modelOf('g')});
			[nonDecision, decision].map(function (node) {
				return [node.type, node.prev, node.next, node.true, node.false, node.normal, node.generate];
			}).should.eql(before);
		});

		it('should take increasing sequence numbers', function () {
			var first = hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 4, 'f'), calleeModel: page.modelOf('f')}),
				second = hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 5, 'g'), calleeModel: page.modelOf('g')});
			second.seq.should.be.above(first.seq);
		});

		it('should chain the callees of a node from the CALL RETURN NODE of the previous one', function () {
			var callSite = nodeAt(page.modelOf(''), 5, 'g');
			var first = hierarchy.addCallEdge(model, {callSite: callSite, calleeModel: page.modelOf('g')}),
				counter = factoryFlowNode.counter;
			var second = hierarchy.addCallEdge(model, {callSite: first.callReturn, calleeModel: page.modelOf('f')});
			factoryFlowNode.counter.should.eql(counter + 1);
			(second.callSite === first.callReturn).should.be.true();
			[first.order, second.order].should.eql([0, 1]);
			second.beforeDecision.should.be.false();
			(second.callNode === null).should.be.true();
		});

		it('should not record a call-site out of the caller', function () {
			var counter = factoryFlowNode.counter;
			var edge = hierarchy.addCallEdge(model, {
				callSite: page.modelOf('g').graph[2][1],
				calleeModel: page.modelOf('f')
			});
			(edge === null).should.be.true();
			model.hierarchy.edges.should.have.length(0);
			factoryFlowNode.counter.should.eql(counter);
		});

		it('should use the given templates', function () {
			var callSite = nodeAt(page.modelOf(''), 5, 'g'),
				callReturn = factoryFlowNode.createCallReturnNode(),
				callNode = factoryFlowNode.createCallNode(),
				counter = factoryFlowNode.counter;
			var edge = hierarchy.addCallEdge(model, {
				callSite: callSite,
				calleeModel: page.modelOf('g'),
				callReturn: callReturn,
				callNode: callNode
			});
			(edge.callReturn === callReturn).should.be.true();
			(edge.callNode === callNode).should.be.true();
			factoryFlowNode.counter.should.eql(counter);
		});

		it('should order the related scopes as caller mainly, caller related, callee related', function () {
			/// f calls k: the model of f relates to f and k; the page calls f then g
			var calleeModel = hierarchy.createCallHierarchyModel(page.modelOf('f'));
			hierarchy.addCallEdge(calleeModel, {callSite: nodeAt(page.modelOf('f'), 2, 'k'), calleeModel: page.modelOf('f.k')});
			calleeModel.relatedScopes.map(String).should.eql(['$DOMAIN.$PAGE_0.f', '$DOMAIN.$PAGE_0.f.k']);
			hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 4, 'f'), calleeModel: calleeModel});
			hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 5, 'g'), calleeModel: page.modelOf('g')});
			hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 6, 'g'), calleeModel: page.modelOf('g')});
			(model.mainlyRelatedScope === page.scopeOf('')).should.be.true();
			model.relatedScopes.map(String).should.eql([
				'$DOMAIN.$PAGE_0',
				'$DOMAIN.$PAGE_0.f',
				'$DOMAIN.$PAGE_0.f.k',
				'$DOMAIN.$PAGE_0.g'
			]);
		});

		it('should order the related scopes of nested calls (three levels)', function () {
			var nested = intraProceduralModelsOf([
				'function a() { function b() { function c() {} c(); } b(); }',
				'a();'
			].join('\n'));
			var modelOfB = hierarchy.createCallHierarchyModel(nested.modelOf('a.b'));
			hierarchy.addCallEdge(modelOfB, {callSite: nodeAt(nested.modelOf('a.b'), 1, 'c'), calleeModel: nested.modelOf('a.b.c')});
			var modelOfA = hierarchy.createCallHierarchyModel(nested.modelOf('a'));
			hierarchy.addCallEdge(modelOfA, {callSite: nodeAt(nested.modelOf('a'), 1, 'b'), calleeModel: modelOfB});
			var modelOfPage = hierarchy.createCallHierarchyModel(nested.modelOf(''));
			hierarchy.addCallEdge(modelOfPage, {callSite: nodeAt(nested.modelOf(''), 2, 'a'), calleeModel: modelOfA});
			modelOfA.relatedScopes.map(String).should.eql([
				'$DOMAIN.$PAGE_0.a',
				'$DOMAIN.$PAGE_0.a.b',
				'$DOMAIN.$PAGE_0.a.b.c'
			]);
			(modelOfPage.mainlyRelatedScope === nested.scopeOf('')).should.be.true();
			modelOfPage.relatedScopes.map(String).should.eql([
				'$DOMAIN.$PAGE_0',
				'$DOMAIN.$PAGE_0.a',
				'$DOMAIN.$PAGE_0.a.b',
				'$DOMAIN.$PAGE_0.a.b.c'
			]);
		});

		it('should not add a call edge after frozen', function () {
			hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 4, 'f'), calleeModel: page.modelOf('f')});
			(hierarchy.freeze(model) === model).should.be.true();
			Object.isFrozen(model.hierarchy).should.be.true();
			Object.isFrozen(model.hierarchy.units).should.be.true();
			Object.isFrozen(model.hierarchy.edges).should.be.true();
			(function () {
				hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 5, 'g'), calleeModel: page.modelOf('g')});
			}).should.throw();
			model.hierarchy.edges.should.have.length(1);
		});

		it('should reject a model without a call hierarchy', function () {
			(function () {
				hierarchy.addCallEdge(page.modelOf(''), {callSite: nodeAt(page.modelOf(''), 4, 'f'), calleeModel: page.modelOf('f')});
			}).should.throw();
		});

		// feature 007 data-model §2: plan, callIndex and lastOfCallSite replace keepGenerateAtCallSite (004 FR-007)
		it('should record the plan, callIndex and lastOfCallSite on the frozen edge', function () {
			var callSite = nodeAt(page.modelOf(''), 4, 'f'),
				plan = {shape: 'statement', node: callSite};
			var edge = hierarchy.addCallEdge(model, {
				callSite: callSite,
				calleeModel: page.modelOf('f'),
				plan: plan,
				callIndex: 0,
				lastOfCallSite: true
			});
			(edge.plan === plan).should.be.true();
			edge.callIndex.should.eql(0);
			edge.lastOfCallSite.should.be.true();
			edge.beforeDecision.should.be.false();
			edge.should.not.have.property('keepGenerateAtCallSite');
			Object.isFrozen(edge).should.be.true();
		});

		it('should insert the call before the node by the shape of the plan, the first edge only', function () {
			var callSite = nodeAt(page.modelOf(''), 4, 'f'),
				plan = {shape: 'decision', node: callSite};
			var first = hierarchy.addCallEdge(model, {callSite: callSite, calleeModel: page.modelOf('f'), plan: plan,
					callIndex: 0, lastOfCallSite: false}),
				chained = hierarchy.addCallEdge(model, {callSite: first.callReturn, calleeModel: page.modelOf('g'),
					plan: plan, callIndex: 0, lastOfCallSite: true});
			first.beforeDecision.should.be.true();
			FlowNode.isFlowNode(first.callNode).should.be.true();
			chained.beforeDecision.should.be.false();
			chained.order.should.eql(1);
			first.lastOfCallSite.should.be.false();
		});

		it('should have no plan fields without a plan', function () {
			var edge = hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 4, 'f'), calleeModel: page.modelOf('f')});
			(edge.plan === null).should.be.true();
			(edge.callIndex === null).should.be.true();
			(edge.lastOfCallSite === null).should.be.true();
		});
	});

	describe('back call edges (specs/004-fix-remaining-issues contracts/model-api.md §1)', function () {
		/// f calls itself and g, g calls f, the page calls f
		var RECURSION = [
			'function f(n) { if (n) { f(n - 1); } g(); }',
			'function g() { f(0); }',
			'f(1);'
		].join('\n');
		var page;

		beforeEach(function () {
			page = intraProceduralModelsOf(RECURSION);
		});

		it('should record a back call edge without adding its callee unit to the units', function () {
			var model = hierarchy.createCallHierarchyModel(page.modelOf('f'));
			var edge = hierarchy.addCallEdge(model, {
				callSite: nodeAt(page.modelOf('f'), 1, 'f'),
				calleeModel: page.modelOf('f'),
				back: true
			});
			edge.kind.should.eql('call');
			edge.back.should.be.true();
			edge.callee.kind.should.eql('function');
			(edge.callee.scope === page.scopeOf('f')).should.be.true();
			(edge.callee.model === page.modelOf('f')).should.be.true();
			(edge.calleeModel === page.modelOf('f')).should.be.true();
			edge.callReturn.type.should.eql(FlowNode.CALL_RETURN_NODE_TYPE);
			Object.isFrozen(edge).should.be.true();
			model.hierarchy.edges.should.eql([edge]);
			model.hierarchy.units.should.have.length(1);
			(model.hierarchy.units[0] === model.hierarchy.main).should.be.true();
			/// the target is related already: not added twice
			model.relatedScopes.map(String).should.eql(['$DOMAIN.$PAGE_0.f']);
		});

		it('should add the target of a back call edge to the related scopes', function () {
			var model = hierarchy.createCallHierarchyModel(page.modelOf('g'));
			hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf('g'), 2, 'f'), calleeModel: page.modelOf('f'), back: true});
			model.relatedScopes.map(String).should.eql(['$DOMAIN.$PAGE_0.g', '$DOMAIN.$PAGE_0.f']);
			model.hierarchy.units.should.have.length(1);
		});

		it('should mark a call edge not back by default', function () {
			var model = hierarchy.createCallHierarchyModel(page.modelOf(''));
			var edge = hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 3, 'f'), calleeModel: page.modelOf('f')});
			edge.back.should.be.false();
			model.hierarchy.units.should.have.length(2);
		});

		it('should reject a back call edge to an inter-procedural model', function () {
			var calleeModel = hierarchy.createCallHierarchyModel(page.modelOf('g')),
				model = hierarchy.createCallHierarchyModel(page.modelOf('f'));
			(function () {
				hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf('f'), 1, 'g'), calleeModel: calleeModel, back: true});
			}).should.throw();
			model.hierarchy.edges.should.have.length(0);
		});

		it('should give no open target and no back edge without back call edges', function () {
			var model = hierarchy.createCallHierarchyModel(page.modelOf(''));
			hierarchy.addCallEdge(model, {callSite: nodeAt(page.modelOf(''), 3, 'f'), calleeModel: page.modelOf('f')});
			hierarchy.openTargetsOf(model).should.eql([]);
			hierarchy.hasBackEdge(model).should.be.false();
			hierarchy.openTargetsOf(page.modelOf('f')).should.eql([]);
			hierarchy.hasBackEdge(page.modelOf('f')).should.be.false();
		});

		it('should give the targets of the back call edges out of the subtree as open targets', function () {
			/// g -> back f: open (f is not the main scope of any model of the subtree)
			var modelOfG = hierarchy.createCallHierarchyModel(page.modelOf('g'));
			hierarchy.addCallEdge(modelOfG, {callSite: nodeAt(page.modelOf('g'), 2, 'f'), calleeModel: page.modelOf('f'), back: true});
			hierarchy.freeze(modelOfG);
			hierarchy.openTargetsOf(modelOfG).should.have.length(1);
			(hierarchy.openTargetsOf(modelOfG)[0] === page.scopeOf('f')).should.be.true();
			hierarchy.hasBackEdge(modelOfG).should.be.true();
			/// f -> back f, f -> g (g -> back f): closed
			var modelOfF = hierarchy.createCallHierarchyModel(page.modelOf('f'));
			hierarchy.addCallEdge(modelOfF, {callSite: nodeAt(page.modelOf('f'), 1, 'f'), calleeModel: page.modelOf('f'), back: true});
			hierarchy.addCallEdge(modelOfF, {callSite: nodeAt(page.modelOf('f'), 1, 'g'), calleeModel: modelOfG});
			hierarchy.freeze(modelOfF);
			hierarchy.openTargetsOf(modelOfF).should.eql([]);
			hierarchy.hasBackEdge(modelOfF).should.be.true();
			/// the page -> f: closed, with back edges in the subtree
			var modelOfPage = hierarchy.createCallHierarchyModel(page.modelOf(''));
			hierarchy.addCallEdge(modelOfPage, {callSite: nodeAt(page.modelOf(''), 3, 'f'), calleeModel: modelOfF});
			hierarchy.openTargetsOf(modelOfPage).should.eql([]);
			hierarchy.hasBackEdge(modelOfPage).should.be.true();
			modelOfPage.relatedScopes.map(String).should.eql([
				'$DOMAIN.$PAGE_0',
				'$DOMAIN.$PAGE_0.f',
				'$DOMAIN.$PAGE_0.g'
			]);
		});

		it('should give each open target once', function () {
			var modelOfG = hierarchy.createCallHierarchyModel(page.modelOf('g'));
			var first = hierarchy.addCallEdge(modelOfG, {callSite: nodeAt(page.modelOf('g'), 2, 'f'), calleeModel: page.modelOf('f'), back: true});
			hierarchy.addCallEdge(modelOfG, {callSite: first.callReturn, calleeModel: page.modelOf('f'), back: true});
			hierarchy.openTargetsOf(modelOfG).should.have.length(1);
		});
	});

	describe('createIntraPageModel', function () {
		var page;

		beforeEach(function () {
			page = intraProceduralModelsOf(CALLS);
		});

		it('should create the LOOP NODE before the LOOP RETURN NODE without edges', function () {
			var counter = factoryFlowNode.counter;
			var model = hierarchy.createIntraPageModel(page.modelOf(''), [page.modelOf('g')]);
			factoryFlowNode.counter.should.eql(counter + 2);
			model.hierarchy.loop.type.should.eql(FlowNode.LOOP_NODE_TYPE);
			model.hierarchy.loop.cfgId.should.eql(counter);
			model.hierarchy.loopReturn.type.should.eql(FlowNode.LOOP_RETURN_NODE_TYPE);
			model.hierarchy.loopReturn.cfgId.should.eql(counter + 1);
			[model.hierarchy.loop, model.hierarchy.loopReturn].forEach(function (template) {
				(template.scope === page.scopeOf('')).should.be.true();
				hasNoEdge(template).should.be.true();
			});
		});

		it('should record the loop, loopReturn and event edges keeping duplicated handlers', function () {
			var handlers = [page.modelOf('f'), page.modelOf('g'), page.modelOf('f')];
			var model = hierarchy.createIntraPageModel(page.modelOf(''), handlers);
			model.level.should.eql(Model.INTRA_PAGE);
			model.hierarchy.level.should.eql(Model.INTRA_PAGE);
			model.hierarchy.main.kind.should.eql('main');
			(model.hierarchy.main.model === page.modelOf('')).should.be.true();
			var edges = model.hierarchy.edges;
			edges.map(function (edge) { return edge.kind; }).should.eql(['loop', 'loopReturn', 'event', 'event', 'event']);
			edges.forEach(function (edge, index) {
				if (index > 0) {
					edge.seq.should.be.above(edges[index - 1].seq);
				}
			});
			(edges[0].loop === model.hierarchy.loop).should.be.true();
			(edges[0].exit === page.modelOf('').graph[1]).should.be.true();
			(edges[1].loopReturn === model.hierarchy.loopReturn).should.be.true();
			edges[1].noHandler.should.be.false();
			edges.slice(2).map(function (edge) { return edge.index; }).should.eql([0, 1, 2]);
			edges.slice(2).map(function (edge) { return edge.handlerModel; }).should.eql(handlers);
			edges.slice(2).map(function (edge) { return String(edge.handler.scope); }).should.eql([
				'$DOMAIN.$PAGE_0.f', '$DOMAIN.$PAGE_0.g', '$DOMAIN.$PAGE_0.f'
			]);
			edges[2].handler.kind.should.eql('handler');
			model.relatedScopes.map(String).should.eql(['$DOMAIN.$PAGE_0']);
			Object.isFrozen(model.hierarchy).should.be.true();
		});

		it('should mark the loopReturn edge when there is no handler', function () {
			var model = hierarchy.createIntraPageModel(page.modelOf(''), []);
			model.hierarchy.edges.map(function (edge) { return edge.kind; }).should.eql(['loop', 'loopReturn']);
			model.hierarchy.edges[1].noHandler.should.be.true();
		});
	});

	describe('createInterPageModel', function () {
		it('should create the domain node and the load and save edges of each page', function () {
			var page = intraProceduralModelsOf([
				'var n = 1;',
				'localStorage.n = n;',
				'localStorage.m = n;'
			].join('\n'));
			var pageModel = hierarchy.createIntraPageModel(page.modelOf(''), []);
			var expanded = expansion.expand(pageModel);
			pageModel.graph = expanded.graph;
			pageModel.setFlatNodeOf(expanded.flatNodeOf);
			var counter = factoryFlowNode.counter;
			var model = hierarchy.createInterPageModel([pageModel]);
			factoryFlowNode.counter.should.eql(counter + 1);
			model.level.should.eql(Model.INTER_PAGE);
			var domain = model.hierarchy.domain;
			domain.type.should.eql(FlowNode.LOCAL_STORAGE_NODE_TYPE);
			domain.cfgId.should.eql(counter);
			(domain.scope === scopeCtrl.domainScope).should.be.true();
			hasNoEdge(domain).should.be.true();
			model.hierarchy.main.kind.should.eql('domain');
			model.hierarchy.units.map(function (unit) { return unit.kind; }).should.eql(['domain', 'page']);
			model.hierarchy.units[1].pageIndex.should.eql(0);
			(model.hierarchy.units[1].model === pageModel).should.be.true();
			var edges = model.hierarchy.edges;
			edges.map(function (edge) { return edge.kind; }).should.eql(['load', 'save']);
			edges[1].seq.should.be.above(edges[0].seq);
			/// the defining nodes are originals of the intra-procedural model
			edges[1].definingNodes.should.eql([nodeAt(page.modelOf(''), 2), nodeAt(page.modelOf(''), 3)]);
			model.relatedScopes.map(String).should.eql(['$DOMAIN', '$DOMAIN.$PAGE_0']);
			Object.isFrozen(model.hierarchy).should.be.true();
		});
	});
});

/**
 * Snapshot of a model taken by analyze.buildModels
 * @param {Array} snapshots snapshots of each stage
 * @param {Model} model
 * @returns {Object|undefined}
 */
function snapshotIn(snapshots, model) {
	'use strict';
	return [].concat.apply([], snapshots).filter(function (snapshot) {
		return snapshot.model === model;
	})[0];
}

/**
 * Source code of the probe (tests/dujs/cases/probes)
 * @param {string} name
 * @returns {string}
 */
function probe(name) {
	'use strict';
	return fs.readFileSync(path.join(__dirname, 'cases', 'probes', name + '.js'), 'utf8');
}

/// pages of the golden fixtures, read as the CLI reads them
var GOLDEN_FIXTURES = {
	'ES5': [['page0/app.js'], ['page1/report.js']],
	'ES2015+': [['es2015/app.js']],
	'inter-procedural': [['interprocedural/app.js']]
};

function goldenPages(name) {
	'use strict';
	return GOLDEN_FIXTURES[name].map(function (files) {
		return sourceReader.getSourceFromFiles(files.map(function (file) {
			return path.join(__dirname, '..', 'golden', 'fixtures', file);
		}));
	});
}

describe('US1 acceptance (specs/003-hierarchical-models quickstart §3)', function () {
	'use strict';
	after(analyze.reset);

	// scenario 1 (known-issues §13): the intra-page model does not reconnect the exit of the intra-procedural model
	it('scenario 1 should keep the false target of L2 the exit of the intra-procedural model', function () {
		var result = analyze(['var a = 1;', 'if (a) {', '  a = 2;', '}'].join('\n'));
		var pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
			model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(result.scopeTree, result.scopeTree.root),
			decision = nodeAt(model, 2);
		(decision.false === model.graph[1]).should.be.true();
		decision.false.type.should.eql(FlowNode.EXIT_NODE_TYPE);
		result.intraProcedural().should.containEql('a: L1 -> L2>exit:F');
		/// the copy of L2 in the intra-page model goes to the LOOP NODE instead
		var intraPage = pageModels.intraPageModels[0];
		intraPage.flatNodeOf(decision).false.type.should.eql(FlowNode.LOOP_NODE_TYPE);
	});

	// scenario 2 (known-issues §16): the CALL NODE is inserted before the decision node in the inter-procedural model only
	it('scenario 2 should keep the predecessor of the decision node L5 in the intra-procedural model', function () {
		var result = analyze(['var x = 0;', 'function f(v) {', '  return x;', '}', 'if (f(x = 1)) {', '  x = 2;', '}'].join('\n'));
		var pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
			model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(result.scopeTree, result.scopeTree.root),
			fModel = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(result.scopeTree,
				result.scopeTree.root.children[0]),
			decision = nodeAt(model, 5),
			predecessor = model.graph[2].filter(function (node) {
				return node.line === 1 && node.type === FlowNode.NORMAL_NODE_TYPE;
			})[0];
		decision.prev.should.have.length(1);
		(decision.prev[0] === predecessor).should.be.true();
		decision.prev[0].type.should.not.eql(FlowNode.CALL_NODE_TYPE);
		(predecessor.normal === decision).should.be.true();
		/// inter-procedural: predecessor -> call -> f -> callReturn -> L5
		var inter = pageModels.interProceduralModels.filter(function (each) {
			return each.mainlyRelatedScope === result.scopeTree.root;
		})[0];
		var call = inter.flatNodeOf(predecessor).normal;
		call.type.should.eql(FlowNode.CALL_NODE_TYPE);
		(call.call === inter.flatNodeOf(fModel.graph[0])).should.be.true();
		var callReturn = inter.flatNodeOf(fModel.graph[1]).return[0];
		callReturn.type.should.eql(FlowNode.CALL_RETURN_NODE_TYPE);
		(callReturn.normal === inter.flatNodeOf(decision)).should.be.true();
		inter.flatNodeOf(decision).prev.should.eql([callReturn]);
		/// feature 007 US1: x = 1 in the argument is defined before f runs (KI §16; was x: L1 -> L3)
		analyze.pairsOfModel(inter).should.eql([
			'f: entry -> L5>L6:T',
			'f: entry -> L5>exit:F',
			'x: L5 -> L3'
		]);
	});

	// scenario 3 (SC-003): the snapshots of each stage equal the ones after the four stages
	describe('scenario 3', function () {
		Object.keys(GOLDEN_FIXTURES).forEach(function (name) {
			it('should keep every model of the ' + name + ' golden fixture as built by its stage', function () {
				analyze.reset();
				var snapshots = analyze.buildModels(goldenPages(name));
				snapshots.should.have.length(4);
				/// the ES5 and ES2015+ fixtures have no inter-procedural model
				[0, 2, 3].forEach(function (stage) {
					snapshots[stage].length.should.be.above(0);
				});
				snapshots.forEach(function (snapshotsOfStage) {
					snapshotsOfStage.forEach(function (snapshot) {
						snapshot.nodes.length.should.be.above(0);
						analyze.compareSnapshots(snapshot, analyze.snapshotOf(snapshot.model));
					});
				});
			});
		});

		it('should throw an Error naming the model and the node when an edge of a built model changes', function () {
			analyze.reset();
			var snapshots = analyze.buildModels(['var a = 1;\na = 2;']);
			var snapshot = snapshots[0][0],
				model = snapshot.model,
				node = nodeAt(model, 2);
			node.disconnect(model.graph[1]);
			(function () {
				analyze.compareSnapshots(snapshot, analyze.snapshotOf(model));
			}).should.throw(/^The (normal|next) of node \d+ \(L2\) of the intra-procedural model of \$DOMAIN\.\$PAGE_0 changed$/);
		});

		it('should throw an Error when the analysis result of a built model changes', function () {
			analyze.reset();
			var snapshots = analyze.buildModels(['var a = 1;\na = 2;']);
			var snapshot = snapshots[2][0];
			snapshot.model.level.should.eql(Model.INTRA_PAGE);
			snapshot.model.setAnalysisResults(new Map());
			(function () {
				analyze.compareSnapshots(snapshot, analyze.snapshotOf(snapshot.model));
			}).should.throw(/^The reachIns of node \d+ \(entry\) of the intra-page model of \$DOMAIN\.\$PAGE_0 changed$/);
		});
	});

	// scenario 6: a call-site not before a decision and a node saving storage are not changed by upper models
	it('scenario 6 should keep the call-site and the storage of the intra-procedural model', function () {
		analyze.reset();
		executor.initialize([['function f() {', '}', 'f();', 'localStorage.x = 1;'].join('\n')]);
		executor.buildIntraProceduralModelsOfEachPageModels();
		var scopeTree = scopeCtrl.pageScopeTrees[0],
			model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scopeTree.root),
			callSite = nodeAt(model, 3),
			saving = nodeAt(model, 4);
		function stateOf(node) {
			return [node.type, node.generate.values(), node.kill.values(), node.normal, node.true, node.false,
				node.next.slice(), node.call, node.saveStorage];
		}
		var before = stateOf(callSite);
		executor.buildInterProceduralModelsOfEachPageModels();
		executor.buildIntraPageModelsOfEachPageModels();
		executor.buildInterPageModelsOfEachPageModels();
		callSite.type.should.eql(FlowNode.NORMAL_NODE_TYPE);
		var after = stateOf(callSite);
		after.length.should.eql(before.length);
		after.forEach(function (item, index) {
			if (Array.isArray(item)) {
				item.length.should.eql(before[index].length);
				item.forEach(function (each, position) {
					(each === before[index][position]).should.be.true('item ' + index + ' at ' + position);
				});
			} else {
				(item === before[index]).should.be.true('item ' + index);
			}
		});
		var intraPage = modelCtrl.collectionOfPageModels.get(scopeTree).intraPageModels[0];
		intraPage.graph[2].forEach(function (node) {
			(node.saveStorage === null).should.be.true('saveStorage of ' + node.cfgId);
			node.loadStorage.should.have.length(0);
		});
		/// the inter-page model has the storage edges
		var interPage = modelCtrl.interPageModel;
		(interPage.flatNodeOf(saving).saveStorage === interPage.graph[0]).should.be.true();
	});

	// scenario 7: the lower models of each upper model and the call edges are available and unchanged
	it('scenario 7 should give the call-site, order and decision of each call edge and the unchanged lower models', function () {
		analyze.reset();
		var snapshots = analyze.buildModels(goldenPages('inter-procedural'));
		var pageModels = modelCtrl.collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0]),
			upperModels = [].concat(pageModels.interProceduralModels, pageModels.intraPageModels, [modelCtrl.interPageModel]),
			callEdges = [];
		upperModels.forEach(function (model) {
			model.hierarchy.units.forEach(function (unit) {
				if (unit.kind === 'loop' || unit.kind === 'domain') {
					(unit.model === null).should.be.true();
					return;
				}
				Model.isModel(unit.model).should.be.true(unit.kind + ' unit of ' + String(model.mainlyRelatedScope));
				var snapshot = snapshotIn(snapshots, unit.model);
				(!!snapshot).should.be.true('snapshot of the model of ' + String(unit.scope));
				analyze.compareSnapshots(snapshot, analyze.snapshotOf(unit.model));
			});
			model.hierarchy.edges.forEach(function (edge) {
				if (edge.kind === 'call') {
					callEdges.push({model: model, edge: edge});
				}
			});
		});
		callEdges.length.should.be.above(0);
		callEdges.forEach(function (found) {
			var edge = found.edge, main = found.model.hierarchy.main.model;
			(edge.caller === found.model.hierarchy.main).should.be.true();
			(edge.callee.model === edge.calleeModel).should.be.true();
			Model.isModel(edge.callee.model).should.be.true();
			(main.graph[2].indexOf(edge.callSite) !== -1 || edge.callSite.type === FlowNode.CALL_RETURN_NODE_TYPE).should.be.true();
			edge.order.should.be.aboveOrEqual(0);
			edge.beforeDecision.should.be.a.Boolean();
		});
		callEdges.filter(function (found) {
			return found.edge.beforeDecision;
		}).length.should.be.above(0);
	});
});

/// research R6, spec Edge Cases: the flat graph of a sub-model of an inter-procedural model holds its subtree only,
/// so the definitions outside of it do not leak in (n1-leak-baseline.md lists the pairs leaked before the refactor)
describe('N1 not reproduced (specs/003-hierarchical-models/probes/n1-leak-baseline.md)', function () {
	'use strict';
	after(analyze.reset);

	/// pairs of the inter-procedural models of a probe, in the order of pageModels.interProceduralModels
	function interProceduralPairsOf(name) {
		var result = analyze(probe(name));
		return modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels.map(function (model) {
			return {
				scopes: model.relatedScopes.map(String),
				pairs: analyze.pairsOfModel(model)
			};
		});
	}

	function shouldNotLeak(pairs, leaked) {
		leaked.forEach(function (pair) {
			pairs.should.not.containEql(pair);
		});
	}

	it('n1 should not pair a = 2 of the page in the model of f -> h', function () {
		var models = interProceduralPairsOf('n1');
		models.should.have.length(2);
		models[0].scopes.should.eql(['$DOMAIN.$PAGE_0.f', '$DOMAIN.$PAGE_0.f.h']);
		shouldNotLeak(models[0].pairs, ['a: L7 -> L3', 'a: L7 -> entry']);
		models[0].pairs.should.eql(['h: entry -> L4']);
		/// the page model still has them
		models[1].pairs.should.containDeep(['a: L7 -> L3']);
	});

	it('n1b should not pair a = 2 of the page in the models of r -> c and p -> r -> c', function () {
		var models = interProceduralPairsOf('n1b');
		models.should.have.length(3);
		models[0].scopes.should.eql(['$DOMAIN.$PAGE_0.p.r', '$DOMAIN.$PAGE_0.p.r.c']);
		models[1].scopes.should.eql(['$DOMAIN.$PAGE_0.p', '$DOMAIN.$PAGE_0.p.r', '$DOMAIN.$PAGE_0.p.r.c']);
		shouldNotLeak(models[0].pairs, ['a: L10 -> L4', 'a: L10 -> entry']);
		shouldNotLeak(models[1].pairs, ['a: L10 -> L4', 'a: L10 -> entry']);
		models[0].pairs.should.eql(['c: entry -> L5']);
		models[1].pairs.should.eql(['c: entry -> L5', 'r: entry -> L7']);
		models[2].pairs.should.containDeep(['a: L10 -> L4']);
	});

	it('n1c should not pair a = 3 of p in the model of r -> c', function () {
		var models = interProceduralPairsOf('n1c');
		models.should.have.length(3);
		models[0].scopes.should.eql(['$DOMAIN.$PAGE_0.p.r', '$DOMAIN.$PAGE_0.p.r.c']);
		shouldNotLeak(models[0].pairs, ['a: L8 -> L4', 'a: L8 -> entry']);
		models[0].pairs.should.eql(['c: entry -> L5']);
		/// a = 3 is in p: the model of p -> r -> c keeps the pairs
		models[1].pairs.should.eql(['a: L8 -> L4', 'c: entry -> L5', 'r: entry -> L7', 'r: entry -> L9']);
	});
});

/**
 * Nodes (id -> label) and edges ("<from label> -> <to label> <kind>") of a
 * hierarchy graph in the DOT representation
 * @param {string} dot
 * @returns {Object} {labels: Array, edges: Array} sorted
 */
function parseHierarchyDot(dot) {
	'use strict';
	var labelOf = {}, edges = [];
	dot.split('\n').forEach(function (line) {
		var node = /^(h\d+) \[label="([^"]*)"/.exec(line),
			edge = /^(h\d+) -> (h\d+) \[.*label="([^"]*)"\]$/.exec(line);
		if (!!node) {
			labelOf[node[1]] = node[2];
		} else if (!!edge) {
			edges.push(labelOf[edge[1]] + ' -> ' + labelOf[edge[2]] + ' ' + edge[3]);
		}
	});
	return {
		labels: Object.keys(labelOf).map(function (id) {
			return labelOf[id];
		}).sort(),
		edges: edges.sort()
	};
}

/**
 * Sorted unique items
 * @param {Array} items
 * @returns {Array}
 */
function uniqueSorted(items) {
	'use strict';
	return items.filter(function (item, index) {
		return items.indexOf(item) === index;
	}).sort();
}

/**
 * Nodes of the flat graph of a model and the targets of a connection of a node
 * @param {FlowNode} node
 * @param {string} type connection type
 * @returns {Array}
 */
function targetsOf(node, type) {
	'use strict';
	return [].concat(node[type] || []);
}

/**
 * Expected hierarchy (labels and edges) of an inter-procedural model from its flat graph
 * (contracts/hierarchy-output.md §3)
 * @param {Model} model
 * @returns {Object}
 */
function interProceduralFromFlatGraph(model) {
	'use strict';
	var nodes = model.graph[2], labels = [], edges = [];
	nodes.forEach(function (node) {
		if (node.type === FlowNode.ENTRY_NODE_TYPE) {
			labels.push(String(node.scope));
		}
		targetsOf(node, FlowNode.CALL_CONNECTION_TYPE).forEach(function (callee) {
			edges.push(String(node.scope) + ' -> ' + String(callee.scope) + ' call');
		});
		if (node.type === FlowNode.EXIT_NODE_TYPE) {
			targetsOf(node, FlowNode.RETURN_CONNECTION_TYPE).forEach(function (callReturn) {
				callReturn.type.should.eql(FlowNode.CALL_RETURN_NODE_TYPE);
				edges.push(String(node.scope) + ' -> ' + String(callReturn.scope) + ' return');
			});
		}
	});
	return {labels: uniqueSorted(labels), edges: uniqueSorted(edges)};
}

/**
 * Expected hierarchy of an intra-page model from its flat graph (§3)
 * @param {Model} model
 * @returns {Object}
 */
function intraPageFromFlatGraph(model) {
	'use strict';
	var nodes = model.graph[2],
		mainName = String(model.hierarchy.main.scope),
		loop = nodes.filter(function (node) {
			return node.type === FlowNode.LOOP_NODE_TYPE;
		}),
		labels = [mainName, 'loop'],
		edges = [];
	loop.should.have.length(1);
	loop = loop[0];
	loop.prev.filter(function (node) {
		return node.type !== FlowNode.LOOP_RETURN_NODE_TYPE && String(node.scope) === mainName;
	}).length.should.be.above(0);
	edges.push(mainName + ' -> loop loop');
	targetsOf(loop, FlowNode.ON_EVENT_CONNECTION_TYPE).forEach(function (target) {
		if (target.type === FlowNode.ENTRY_NODE_TYPE) {
			labels.push(String(target.scope));
			edges.push('loop -> ' + String(target.scope) + ' onEvent');
		}
	});
	nodes.forEach(function (node) {
		if (node.type === FlowNode.LOOP_RETURN_NODE_TYPE) {
			node.prev.forEach(function (previous) {
				if (previous.type === FlowNode.EXIT_NODE_TYPE) {
					edges.push(String(previous.scope) + ' -> loop return');
				}
			});
		}
	});
	return {labels: uniqueSorted(labels), edges: uniqueSorted(edges)};
}

/**
 * Expected hierarchy of the inter-page model from its flat graph (§3)
 * @param {Model} model
 * @returns {Object}
 */
function interPageFromFlatGraph(model) {
	'use strict';
	var domain = model.graph[0],
		labels = ['$DOMAIN'],
		edges = [];
	domain.type.should.eql(FlowNode.LOCAL_STORAGE_NODE_TYPE);
	function pageOf(node) {
		var found = -1;
		scopeCtrl.pageScopeTrees.forEach(function (scopeTree, index) {
			if (scopeTree.scopes.indexOf(node.scope) !== -1) {
				found = index;
			}
		});
		found.should.not.eql(-1);
		return 'page' + found;
	}
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree, index) {
		labels.push('page' + index);
	});
	targetsOf(domain, FlowNode.LOAD_STROAGE_CONNECTION_TYPE).forEach(function (target) {
		edges.push('$DOMAIN -> ' + pageOf(target) + ' loadStorage');
	});
	model.graph[2].forEach(function (node) {
		if (node.saveStorage === domain) {
			edges.push(pageOf(node) + ' -> $DOMAIN saveStorage');
		}
	});
	return {labels: uniqueSorted(labels), edges: uniqueSorted(edges)};
}

/// contracts/hierarchy-output.md §3: the automated counterpart of the manual check of the hierarchy graphs
describe('hierarchy graphs match the flat graphs (contracts/hierarchy-output.md §3)', function () {
	'use strict';
	after(analyze.reset);

	Object.keys(GOLDEN_FIXTURES).forEach(function (name) {
		it('should match every upper model of the ' + name + ' golden fixture', function () {
			analyze.reset();
			analyze.buildModels(goldenPages(name));
			var checked = 0;
			function check(model, expected) {
				parseHierarchyDot(hierarchyDot.convertHierarchyToDot(model))
					.should.eql(expected, 'hierarchy of ' + String(model.mainlyRelatedScope));
				checked += 1;
			}
			scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
				var pageModels = modelCtrl.collectionOfPageModels.get(scopeTree);
				pageModels.interProceduralModels.forEach(function (model) {
					check(model, interProceduralFromFlatGraph(model));
				});
				pageModels.intraPageModels.forEach(function (model) {
					check(model, intraPageFromFlatGraph(model));
				});
			});
			check(modelCtrl.interPageModel, interPageFromFlatGraph(modelCtrl.interPageModel));
			checked.should.be.above(1);
		});
	});
});
