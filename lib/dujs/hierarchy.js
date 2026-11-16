/*
 * Hierarchies of the upper models (inter-procedural, intra-page and
 * inter-page): units referring to lower models and the operations (call,
 * LOOP, LOOP RETURN, event, load and save storage edges) numbered by a global
 * sequence, from which lib/dujs/expansion.js produces the flat graph
 * (specs/003-hierarchical-models, data-model §3).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * The structure nodes (CALL RETURN, CALL, LOOP, LOOP RETURN and domain) are
 * created here once, by the FlowNode factory, as templates: they are never
 * connected; a flat graph holds their copies.
 */
var FlowNode = require('../esgraph/flownode'),
	factoryFlowNode = require('../esgraph/flownodefactory'),
	factoryModel = require('./modelfactory'),
	Model = require('./model'),
	cfgBuilder = require('./cfgbuilder'),
	scopeCtrl = require('./scopectrl');
var walkes = require('walkes');

/**
 * Last global sequence number taken
 * @type {number}
 * @private
 */
var lastSeq = 0;

/**
 * Take the next global sequence number of an operation
 * @returns {number}
 */
function nextSeq() {
	'use strict';
	lastSeq += 1;
	return lastSeq;
}

/**
 * Create a unit of a hierarchy
 * @param {string} kind 'main', 'function', 'handler', 'loop', 'page' or 'domain'
 * @param {Scope|null} scope
 * @param {Model|null} model
 * @param {number} [pageIndex]
 * @returns {Object} frozen Unit
 * @private
 */
function createUnit(kind, scope, model, pageIndex) {
	'use strict';
	var unit = {kind: kind, scope: scope || null, model: model || null};
	if (typeof pageIndex === 'number') {
		unit.pageIndex = pageIndex;
	}
	return Object.freeze(unit);
}

/**
 * Add the related scopes of a model to another model, in order
 * @param {Model} to
 * @param {Model} from
 * @private
 */
function addRelatedScopesOf(to, from) {
	'use strict';
	from.relatedScopes.forEach(function (scope) {
		to.addRelatedScope(scope);
	});
}

/**
 * Entry or exit node (an original) of the graph of a model
 * @param {Model} model
 * @param {number} index 0 for the entry, 1 for the exit
 * @returns {FlowNode}
 * @private
 */
function boundaryOf(model, index) {
	'use strict';
	var hierarchy = model.hierarchy;
	if (!hierarchy) {
		return model.graph[index];
	}
	return (hierarchy.level === Model.INTER_PAGE) ? hierarchy.domain : boundaryOf(hierarchy.main.model, index);
}

/**
 * Entry node (an original) of the graph of a model: the entry of an
 * intra-procedural model, the entry of the main unit of an inter-procedural or
 * intra-page model, and the domain node of an inter-page model
 * @param {Model} model
 * @returns {FlowNode}
 */
function entryOf(model) {
	'use strict';
	return boundaryOf(model, 0);
}

/**
 * Exit node (an original) of the graph of a model (see entryOf)
 * @param {Model} model
 * @returns {FlowNode}
 */
function exitOf(model) {
	'use strict';
	return boundaryOf(model, 1);
}

/**
 * Whether the call at a call-site is inserted before it: a node with a true or
 * false target (a decision node) is; a CALL RETURN NODE (chained callees) is not
 * @param {FlowNode} callSite
 * @returns {boolean}
 */
function isCallBeforeDecision(callSite) {
	'use strict';
	return callSite.type !== FlowNode.CALL_RETURN_NODE_TYPE && (!!callSite.true || !!callSite.false);
}

/**
 * Create a new inter-procedural model whose main unit refers to the model of
 * the caller (an intra-procedural model); its related scopes start with the
 * ones of the caller (mainly related scope first)
 * @param {Model} mainModel
 * @returns {Model}
 */
function createCallHierarchyModel(mainModel) {
	'use strict';
	var model = factoryModel.create(),
		main = createUnit('main', mainModel.mainlyRelatedScope, mainModel);
	model.level = Model.INTER_PROCEDURAL;
	model.addRelatedScope(mainModel.mainlyRelatedScope);
	addRelatedScopesOf(model, mainModel);
	model.hierarchy = {
		level: Model.INTER_PROCEDURAL,
		main: main,
		units: [main],
		edges: []
	};
	return model;
}

/**
 * Create the CALL RETURN NODE template of a call at a call-site
 * @param {FlowNode} callSite
 * @returns {FlowNode}
 * @private
 */
function createCallReturnTemplate(callSite) {
	'use strict';
	var callReturnNode = factoryFlowNode.createCallReturnNode();
	/// the line and column label of the CALL RETURN NODE is the same as the call-site
	callReturnNode.line = callSite.line;
	callReturnNode.col = callSite.col;
	callReturnNode.labelPath = callSite.labelPath;
	callReturnNode.scope = callSite.scope;
	return callReturnNode;
}

/**
 * Create the CALL NODE template of a call inserted before a decision node
 * @param {FlowNode} callSite
 * @returns {FlowNode}
 * @private
 */
function createCallTemplate(callSite) {
	'use strict';
	var callNode = factoryFlowNode.createCallNode();
	callNode.line = callSite.line;
	callNode.col = callSite.col;
	callNode.labelPath = callSite.labelPath;
	callNode.scope = callSite.scope;
	return callNode;
}

/**
 * Whether a hierarchy can not be changed any more
 * @param {Object} hierarchy
 * @returns {boolean}
 * @private
 */
function isFrozen(hierarchy) {
	'use strict';
	return Object.isFrozen(hierarchy);
}

/**
 * Record a call edge in an inter-procedural model. The call-site is a node of
 * the caller (an original) or the CALL RETURN NODE template of a previous call
 * edge of this model (chained callees of the same node); otherwise no edge is
 * recorded (null is returned), as no edge is connected when the call-site is
 * not in the caller. The CALL RETURN NODE template is created first, then the
 * CALL NODE template when the call is inserted before a decision node.
 * @param {Model} model inter-procedural model created by createCallHierarchyModel
 * @param {Object} spec {callSite, calleeModel, callReturn?, callNode?}
 * @returns {Object|null} frozen call Edge
 */
function addCallEdge(model, spec) {
	'use strict';
	var hierarchy = model.hierarchy;
	if (!hierarchy || hierarchy.level !== Model.INTER_PROCEDURAL) {
		throw new Error('Not an inter-procedural model with a hierarchy');
	}
	if (isFrozen(hierarchy)) {
		throw new Error('The hierarchy is frozen');
	}
	var callSite = spec.callSite,
		calleeModel = spec.calleeModel;
	if (!FlowNode.isFlowNode(callSite) || !Model.isModel(calleeModel)) {
		throw new Error('Invalid call-site or callee model');
	}
	var previous = hierarchy.edges.filter(function (edge) {
		return edge.callReturn === callSite;
	})[0] || null;
	if (!previous && hierarchy.main.model.graph[2].indexOf(callSite) === -1) {
		return null;
	}
	var beforeDecision = isCallBeforeDecision(callSite);
	var callReturn = spec.callReturn || createCallReturnTemplate(callSite);
	var callNode = beforeDecision ? (spec.callNode || createCallTemplate(callSite)) : null;
	var callee = createUnit('function', calleeModel.mainlyRelatedScope, calleeModel);
	var edge = Object.freeze({
		kind: 'call',
		seq: nextSeq(),
		caller: hierarchy.main,
		callee: callee,
		calleeModel: calleeModel,
		callSite: callSite,
		order: !!previous ? previous.order + 1 : 0,
		beforeDecision: beforeDecision,
		callNode: callNode,
		callReturn: callReturn
	});
	hierarchy.units.push(callee);
	hierarchy.edges.push(edge);
	addRelatedScopesOf(model, calleeModel);
	return edge;
}

/**
 * Freeze the hierarchy of a model (its units and edges as well); a call edge
 * can not be added afterwards
 * @param {Model} model
 * @returns {Model}
 */
function freeze(model) {
	'use strict';
	var hierarchy = model.hierarchy;
	if (!!hierarchy) {
		Object.freeze(hierarchy.units);
		Object.freeze(hierarchy.edges);
		Object.freeze(hierarchy);
	}
	return model;
}

/**
 * Create the intra-page model of a page: the LOOP NODE template is created
 * before the LOOP RETURN NODE template; the operations are the LOOP NODE before
 * the exit node, the LOOP RETURN NODE (with an onEvent edge from the LOOP NODE
 * when there is no handler) and one event edge per handler in the order of the
 * list (duplicates kept)
 * @param {Model} mainModel model of the page (inter-procedural or intra-procedural)
 * @param {Array} handlerModels models of the event handlers
 * @returns {Model} frozen hierarchy
 */
function createIntraPageModel(mainModel, handlerModels) {
	'use strict';
	var loopNode = factoryFlowNode.createLoopNode();
	loopNode.scope = mainModel.mainlyRelatedScope;
	var loopReturnNode = factoryFlowNode.createLoopReturnNode();
	loopReturnNode.scope = mainModel.mainlyRelatedScope;
	var main = createUnit('main', mainModel.mainlyRelatedScope, mainModel),
		units = [main, createUnit('loop', null, null)],
		edges = [];
	edges.push(Object.freeze({kind: 'loop', seq: nextSeq(), loop: loopNode, exit: exitOf(mainModel)}));
	edges.push(Object.freeze({
		kind: 'loopReturn',
		seq: nextSeq(),
		loop: loopNode,
		loopReturn: loopReturnNode,
		noHandler: handlerModels.length === 0
	}));
	handlerModels.forEach(function (handlerModel, index) {
		var handler = createUnit('handler', handlerModel.mainlyRelatedScope, handlerModel);
		units.push(handler);
		edges.push(Object.freeze({
			kind: 'event',
			seq: nextSeq(),
			handler: handler,
			handlerModel: handlerModel,
			index: index,
			loop: loopNode,
			loopReturn: loopReturnNode
		}));
	});
	var model = factoryModel.create();
	model.level = Model.INTRA_PAGE;
	model.addRelatedScope(mainModel.mainlyRelatedScope);
	addRelatedScopesOf(model, mainModel);
	model.hierarchy = {
		level: Model.INTRA_PAGE,
		main: main,
		units: units,
		edges: edges,
		loop: loopNode,
		loopReturn: loopReturnNode
	};
	return freeze(model);
}

/**
 * Nodes (originals) of the graph of a model where the local storage object is
 * defined, in order with duplicates (a node of the graph of an upper model is
 * mapped to its original)
 * @param {Model} model
 * @returns {Array}
 */
function definingLocalStorageNodes(model) {
	'use strict';
	var foundNodes = [];
	model.graph[2].forEach(function (graphNode) {
		graphNode.analyzedExpressions.forEach(function (expression) {
			walkes(expression, {
				Program: function () {},
				FunctionExpression: function () {},
				ArrowFunctionExpression: function () {},
				ClassBody: function () {},
				FunctionDeclaration: function () {},
				AssignmentExpression: function (node) {
					if (node.left.type === 'MemberExpression' &&
						graphNode.scope.getScopeWhereTheVariableDeclared(node.left.object.name) === scopeCtrl.domainScope) {
						foundNodes.push(graphNode.original || graphNode);
					}
				}
			});
		});
	});
	return foundNodes;
}

/**
 * Create the inter-page model: the domain node template (given or created by
 * cfgBuilder.getDomainScopeGraph), and for each page a load edge then a save
 * edge from the nodes defining the local storage object
 * @param {Array} pageModels intra-page models of the pages
 * @param {Object} [options] {domainGraph: graph of the domain scope,
 *   definingNodesOf: function (pageModel) returning the defining nodes
 *   (originals), default definingLocalStorageNodes}
 * @returns {Model} frozen hierarchy
 */
function createInterPageModel(pageModels, options) {
	'use strict';
	options = options || {};
	var domainGraph = options.domainGraph || cfgBuilder.getDomainScopeGraph(),
		definingNodesOf = options.definingNodesOf || definingLocalStorageNodes;
	var domainNode = domainGraph[0];
	domainNode.scope = scopeCtrl.domainScope;
	var main = createUnit('domain', scopeCtrl.domainScope, null),
		units = [main],
		edges = [];
	pageModels.forEach(function (pageModel, pageIndex) {
		var page = createUnit('page', pageModel.mainlyRelatedScope, pageModel, pageIndex);
		units.push(page);
		edges.push(Object.freeze({kind: 'load', seq: nextSeq(), page: page, domain: domainNode}));
		edges.push(Object.freeze({
			kind: 'save',
			seq: nextSeq(),
			page: page,
			definingNodes: Object.freeze([].concat(definingNodesOf(pageModel))),
			domain: domainNode
		}));
	});
	var model = factoryModel.create();
	model.level = Model.INTER_PAGE;
	model.addRelatedScope(scopeCtrl.domainScope);
	pageModels.forEach(function (pageModel) {
		addRelatedScopesOf(model, pageModel);
	});
	model.hierarchy = {
		level: Model.INTER_PAGE,
		main: main,
		units: units,
		edges: edges,
		domain: domainNode
	};
	return freeze(model);
}

module.exports = {
	nextSeq: nextSeq,
	createCallHierarchyModel: createCallHierarchyModel,
	addCallEdge: addCallEdge,
	createIntraPageModel: createIntraPageModel,
	createInterPageModel: createInterPageModel,
	definingLocalStorageNodes: definingLocalStorageNodes,
	freeze: freeze,
	entryOf: entryOf,
	exitOf: exitOf,
	isCallBeforeDecision: isCallBeforeDecision
};
