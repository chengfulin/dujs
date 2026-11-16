/*
 * Expansion of the hierarchy of an upper model into its flat graph
 * (specs/003-hierarchical-models, data-model §4, research R1-R4, R15).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * expand is a pure function: the originals (nodes of the intra-procedural
 * models and the structure node templates) are copied without consuming the
 * counter of the FlowNode factory, the GEN sets of the copies are rebuilt with
 * the copies as the nodes of their definitions, and the operations of the
 * hierarchies of the subtree are replayed on the copies in the order of their
 * global sequence numbers, by the same code that connected the shared nodes
 * before the refactoring. The originals and the lower models are not changed.
 */
var FlowNode = require('../esgraph/flownode'),
	Model = require('./model'),
	hierarchy = require('./hierarchy'),
	factoryDef = require('./deffactory'),
	factoryVarDef = require('./vardeffactory');
var Set = require('../analyses/set');

/**
 * Throw an Error when a model is being expanded already: the model object is
 * in its own subtree (a hierarchy built by hand wrongly; a call cycle built by
 * modelBuilder is a back call edge instead)
 * @param {Model} model
 * @param {Array} stack models being expanded
 * @private
 */
function checkCycle(model, stack) {
	'use strict';
	var index = stack.indexOf(model);
	if (index !== -1) {
		var names = stack.slice(index).concat([model]).map(function (each) {
			return String(each.mainlyRelatedScope);
		});
		throw new Error('model cycle in hierarchy: ' + names.join(' -> '));
	}
}

/**
 * Nodes (originals, with duplicates) of the flat graph of a model
 * @param {Model} model
 * @param {Array} stack models being expanded
 * @returns {Array}
 * @private
 */
function orderOf(model, stack) {
	'use strict';
	var modelHierarchy = model.hierarchy;
	if (!modelHierarchy) {
		return [].concat(model.graph[2]);
	}
	checkCycle(model, stack);
	var innerStack = stack.concat([model]);
	switch (modelHierarchy.level) {
		case Model.INTER_PROCEDURAL:
			return orderOfCalls(modelHierarchy, innerStack);
		case Model.INTRA_PAGE:
			return orderOfPage(modelHierarchy, innerStack);
		default:
			return orderOfPages(modelHierarchy, innerStack);
	}
}

/**
 * Nodes of an inter-procedural model: for each call edge, the nodes before the
 * call-site (the CALL NODE replacing a decision node), the nodes of the callee
 * not added yet, the CALL RETURN NODE, (the decision node,) the nodes after.
 * A back call edge adds no node of the callee (they are added by the expansion
 * of an ancestor) and is not followed
 * @param {Object} modelHierarchy
 * @param {Array} stack
 * @returns {Array}
 * @private
 */
function orderOfCalls(modelHierarchy, stack) {
	'use strict';
	var nodes = orderOf(modelHierarchy.main.model, stack);
	modelHierarchy.edges.forEach(function (edge) {
		var index = nodes.indexOf(edge.callSite);
		if (edge.kind !== 'call' || index === -1) {
			return;
		}
		var nodesBeforeCall = nodes.slice(0, index + 1),
			nodesAfterCall = nodes.slice(index + 1);
		if (edge.beforeDecision) {
			nodesBeforeCall = nodesBeforeCall.slice(0, -1).concat([edge.callNode]);
			nodesAfterCall = [edge.callSite].concat(nodesAfterCall);
		}
		var connectedNodes = [].concat(nodesBeforeCall);
		if (!edge.back) {
			orderOf(edge.calleeModel, stack).forEach(function (node) {
				if (connectedNodes.indexOf(node) === -1) {
					connectedNodes.push(node);
				}
			});
		}
		connectedNodes.push(edge.callReturn);
		nodes = connectedNodes.concat(nodesAfterCall);
	});
	return nodes;
}

/**
 * Nodes of an intra-page model: the nodes of the page with the LOOP NODE
 * before the exit node, then the nodes of each handler (duplicates kept), the
 * LOOP RETURN NODE after the first handler (or the page when no handler)
 * @param {Object} modelHierarchy
 * @param {Array} stack
 * @returns {Array}
 * @private
 */
function orderOfPage(modelHierarchy, stack) {
	'use strict';
	var nodes = orderOf(modelHierarchy.main.model, stack),
		events = modelHierarchy.edges.filter(function (edge) {
			return edge.kind === 'event';
		});
	nodes.splice(nodes.indexOf(hierarchy.exitOf(modelHierarchy.main.model)), 0, modelHierarchy.loop);
	if (events.length > 0) {
		events.forEach(function (edge, index) {
			nodes = nodes.concat(orderOf(edge.handlerModel, stack));
			if (index === 0) {
				nodes.push(modelHierarchy.loopReturn);
			}
		});
	} else {
		nodes.push(modelHierarchy.loopReturn);
	}
	return nodes;
}

/**
 * Nodes of an inter-page model: the domain node, then the nodes of each page
 * @param {Object} modelHierarchy
 * @param {Array} stack
 * @returns {Array}
 * @private
 */
function orderOfPages(modelHierarchy, stack) {
	'use strict';
	var nodes = [modelHierarchy.domain];
	modelHierarchy.units.forEach(function (unit) {
		if (unit.kind === 'page') {
			nodes = nodes.concat(orderOf(unit.model, stack));
		}
	});
	return nodes;
}

/**
 * Nodes (originals, with duplicates) of the flat graph of a model, in the
 * order of its node array (research R4)
 * @param {Model} model
 * @returns {Array}
 */
function nodeOrder(model) {
	'use strict';
	return orderOf(model, []);
}

/**
 * Collect the edges of the hierarchies of a model and its lower models (the
 * callee of a back call edge is not a unit, so it is not followed)
 * @param {Model} model
 * @param {Array} stack models being collected
 * @param {Array} collected edges collected so far (no duplicates)
 * @private
 */
function collectEdgesOf(model, stack, collected) {
	'use strict';
	var modelHierarchy = model.hierarchy;
	if (!modelHierarchy) {
		return;
	}
	checkCycle(model, stack);
	var innerStack = stack.concat([model]);
	modelHierarchy.units.forEach(function (unit) {
		if (!!unit.model) {
			collectEdgesOf(unit.model, innerStack, collected);
		}
	});
	modelHierarchy.edges.forEach(function (edge) {
		if (collected.indexOf(edge) === -1) {
			collected.push(edge);
		}
	});
}

/**
 * Edges of the subtree of a model (no duplicates) in the order of their global
 * sequence numbers
 * @param {Model} model
 * @returns {Array}
 * @private
 */
function collectEdges(model) {
	'use strict';
	var collected = [];
	collectEdgesOf(model, [], collected);
	return collected.sort(function (one, another) {
		return one.seq - another.seq;
	});
}

/**
 * Rebuild the GEN set of each copy whose original has one: each VarDef is
 * created again with the copy (of the node of its definition) as the node,
 * in the order of the set; a VarDef shared by originals is rebuilt once
 * @param {Map} copies Map(original, copy)
 * @private
 */
function rebuildGenerateSets(copies) {
	'use strict';
	var rebuilt = new Map();
	function rebuild(vardef, copy) {
		if (!rebuilt.has(vardef)) {
			var definition = vardef.definition,
				fromNode = copies.get(definition.fromNode) || copy;
			rebuilt.set(vardef, factoryVarDef.create(
				vardef.variable,
				factoryDef.create(fromNode, definition.type, definition.range.toArray())
			));
		}
		return rebuilt.get(vardef);
	}
	copies.forEach(function (copy, original) {
		var generate = original.generate;
		if (generate === null) {
			return;
		}
		var rebuiltSet = new Set();
		generate.values().forEach(function (vardef) {
			rebuiltSet.add(rebuild(vardef, copy));
		});
		copy.generate = rebuiltSet;
	});
}

/**
 * Edges of a node as {type, node}; all edges are collected before any is
 * disconnected, since disconnecting a node removes every edge to it (e.g. the
 * false and exception edges of a decision to the exit node)
 * @param {FlowNode} node
 * @returns {Array}
 * @private
 */
function outgoingEdges(node) {
	'use strict';
	var edges = [];
	FlowNode.CONNECTION_TYPES.forEach(function (connection) {
		[].concat(node[connection] || []).forEach(function (target) {
			edges.push({type: connection, node: target});
		});
	});
	return edges;
}

/**
 * Move all outgoing edges of a node to another node
 * @param {FlowNode} from
 * @param {FlowNode} to
 * @private
 */
function moveOutgoingEdges(from, to) {
	'use strict';
	var edges = outgoingEdges(from);
	edges.forEach(function (edge) {
		from.disconnect(edge.node);
	});
	edges.forEach(function (edge) {
		to.connect(edge.node, edge.type);
	});
}

/**
 * Redirect the edges of a node to a target to another target, keeping their types
 * @param {FlowNode} node
 * @param {FlowNode} from
 * @param {FlowNode} to
 * @private
 */
function redirectEdges(node, from, to) {
	'use strict';
	var edges = outgoingEdges(node);
	if (edges.some(function (edge) { return edge.node === from; })) {
		edges.forEach(function (edge) {
			node.disconnect(edge.node);
		});
		edges.forEach(function (edge) {
			node.connect(edge.node === from ? to : edge.node, edge.type);
		});
	}
}

/**
 * Replay a call edge (a back call edge as well, whose entry and exit copies
 * exist already): a call before a decision node enters the CALL NODE
 * instead of the decision node and returns to the decision node; otherwise the
 * call-site becomes the CALL NODE and its GEN, KILL and outgoing edges move to
 * the CALL RETURN NODE. The bypass of the call (FR-016) is recorded: the node
 * with the call edge (the call-site, the CALL NODE before a decision, or the
 * CALL RETURN NODE of the previous callee of chained calls), the CALL RETURN
 * NODE and the scope of the callee
 * @param {Object} edge
 * @param {function} copyOf
 * @param {Map} bypasses Map(CALL RETURN NODE, {callNode, callReturn, calleeScope})
 * @private
 */
function replayCall(edge, copyOf, bypasses) {
	'use strict';
	var callSite = copyOf(edge.callSite),
		callReturnNode = copyOf(edge.callReturn),
		callNode = callSite;
	if (edge.beforeDecision) {
		callNode = copyOf(edge.callNode);
		callNode.generate = new Set();
		callNode.kill = new Set();
		callReturnNode.generate = new Set();
		callReturnNode.kill = new Set();
		callSite.prev.forEach(function (prevNode) {
			redirectEdges(prevNode, callSite, callNode);
		});
		callReturnNode.connect(callSite, FlowNode.NORMAL_CONNECTION_TYPE);
	} else {
		callSite.type = FlowNode.CALL_NODE_TYPE;
		callReturnNode.generate = callSite.generate;
		callReturnNode.kill = callSite.kill;
		callSite.clearGENSet();
		callSite.clearKILLSet();
		moveOutgoingEdges(callSite, callReturnNode);
	}
	callNode.connect(copyOf(hierarchy.entryOf(edge.calleeModel)), FlowNode.CALL_CONNECTION_TYPE);
	copyOf(hierarchy.exitOf(edge.calleeModel)).connect(callReturnNode, FlowNode.RETURN_CONNECTION_TYPE);
	bypasses.set(callReturnNode, Object.freeze({
		callNode: callNode,
		callReturn: callReturnNode,
		calleeScope: edge.calleeModel.mainlyRelatedScope
	}));
}

/**
 * Replay a loop edge: the edges to the exit node of the page are redirected
 * to the LOOP NODE (with the same connection types), which goes to the exit node
 * @param {Object} edge
 * @param {function} copyOf
 * @private
 */
function replayLoop(edge, copyOf) {
	'use strict';
	var loopNode = copyOf(edge.loop),
		exitNode = copyOf(edge.exit);
	exitNode.prev.forEach(function (node) {
		/// a node may reach the exit node by several connections (e.g. the exception
		/// and false edges of a decision node): redirect all of them to the LOOP NODE
		var types = [
			FlowNode.NORMAL_CONNECTION_TYPE,
			FlowNode.EXCEPTION_CONNECTION_TYPE,
			FlowNode.TRUE_BRANCH_CONNECTION_TYPE,
			FlowNode.FALSE_BRANCH_CONNECTION_TYPE
		].filter(function (type) {
			return node[type] === exitNode;
		});
		node.disconnect(exitNode);
		types.forEach(function (type) {
			node.connect(loopNode, type);
		});
	});
	loopNode.connect(exitNode);
}

/**
 * Replay an operation on the copies
 * @param {Object} edge
 * @param {function} copyOf
 * @param {Map} bypasses bypasses of the calls replayed so far
 * @private
 */
function replay(edge, copyOf, bypasses) {
	'use strict';
	switch (edge.kind) {
		case 'call':
			replayCall(edge, copyOf, bypasses);
			break;
		case 'loop':
			replayLoop(edge, copyOf);
			break;
		case 'loopReturn':
			copyOf(edge.loopReturn).connect(copyOf(edge.loop), FlowNode.RETURN_CONNECTION_TYPE);
			if (edge.noHandler) {
				copyOf(edge.loop).connect(copyOf(edge.loopReturn), FlowNode.ON_EVENT_CONNECTION_TYPE);
			}
			break;
		case 'event':
			copyOf(edge.loop).connect(copyOf(hierarchy.entryOf(edge.handlerModel)), FlowNode.ON_EVENT_CONNECTION_TYPE);
			copyOf(hierarchy.exitOf(edge.handlerModel)).connect(copyOf(edge.loopReturn));
			break;
		case 'load':
			copyOf(edge.domain).connect(copyOf(hierarchy.entryOf(edge.page.model)), FlowNode.LOAD_STROAGE_CONNECTION_TYPE);
			break;
		case 'save':
			edge.definingNodes.forEach(function (definingNode) {
				copyOf(definingNode).connect(copyOf(edge.domain), FlowNode.SAVE_STORAGE_CONNECTION_TYPE);
			});
			break;
	}
}

/**
 * Expand the hierarchy of a model into its flat graph: copy the originals
 * (without consuming the counter of the FlowNode factory), rebuild the GEN sets
 * of the copies, then replay the operations of the subtree in the order of
 * their global sequence numbers. An intra-procedural model is not copied (its
 * graph is returned with the identity map and no bypass). A back call edge
 * (FR-015) is replayed as a call edge to the copies of the entry and exit of
 * its target (added by the expansion of an ancestor) with a bypass as well.
 * Throws an Error whose message starts with 'open hierarchy: back call edge to'
 * when the target of a back call edge is out of the subtree (openTargetsOf is
 * not empty), and with 'model cycle in hierarchy' when a model object is in
 * its own subtree (both are hierarchies built by hand wrongly).
 * @param {Model} model
 * @returns {Object} {graph: [entry, exit, nodes], flatNodeOf: Map(original, copy),
 *   bypasses: Map(copy of a CALL RETURN NODE, {callNode, callReturn, calleeScope})}
 *   with one bypass per call edge (FR-016)
 */
function expand(model) {
	'use strict';
	var openTargets = hierarchy.openTargetsOf(model);
	if (openTargets.length > 0) {
		throw new Error('open hierarchy: back call edge to ' + openTargets.map(String).join(', ') + ' outside the model');
	}
	var order = nodeOrder(model),
		copies;
	if (!model.hierarchy) {
		copies = new Map();
		order.forEach(function (node) {
			copies.set(node, node);
		});
		return {graph: model.graph, flatNodeOf: copies, bypasses: new Map()};
	}
	var edges = collectEdges(model);
	copies = FlowNode.copyNodes(order);
	function copyOf(node) {
		return copies.get(node);
	}
	rebuildGenerateSets(copies);
	var bypasses = new Map();
	edges.forEach(function (edge) {
		replay(edge, copyOf, bypasses);
	});
	return {
		graph: [copyOf(hierarchy.entryOf(model)), copyOf(hierarchy.exitOf(model)), order.map(copyOf)],
		flatNodeOf: copies,
		bypasses: bypasses
	};
}

module.exports = {
	expand: expand,
	nodeOrder: nodeOrder
};
