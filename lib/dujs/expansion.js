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
 * of an ancestor) and is not followed; with shallow, no call edge adds the
 * nodes of its callee (the summary graph of expandShallow)
 * @param {Object} modelHierarchy
 * @param {Array} stack
 * @param {boolean} [shallow]
 * @returns {Array}
 * @private
 */
function orderOfCalls(modelHierarchy, stack, shallow) {
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
		if (!edge.back && !shallow) {
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
 * @returns {Map} Map(original VarDef, rebuilt VarDef) (the flatVarDefOf of expand)
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
	return rebuilt;
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
 * Move the outgoing edges of a node but its exception edge to another node
 * (feature 005, Q-a): the exception edge stays at the node, also when it goes
 * to the target of a moved edge (disconnecting a node removes every edge to it)
 * @param {FlowNode} from
 * @param {FlowNode} to
 * @private
 */
function moveNonExceptionalEdges(from, to) {
	'use strict';
	var edges = outgoingEdges(from),
		moved = edges.filter(function (edge) {
			return edge.type !== FlowNode.EXCEPTION_CONNECTION_TYPE;
		}),
		targets = [];
	moved.forEach(function (edge) {
		if (targets.indexOf(edge.node) === -1) {
			targets.push(edge.node);
		}
	});
	targets.forEach(function (target) {
		from.disconnect(target);
	});
	edges.forEach(function (edge) {
		if (edge.type === FlowNode.EXCEPTION_CONNECTION_TYPE && targets.indexOf(edge.node) !== -1) {
			from.connect(edge.node, edge.type);
		}
	});
	moved.forEach(function (edge) {
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
 * Whether a Var is the inner name of the class expression whose static member
 * is the scope (feature 006, implement US2): a Var declared in the eslint-scope
 * class scope of a ClassExpression, and the scope is the synthetic function
 * of a member of that class
 * @param {Var} aVar
 * @param {Scope} scope
 * @returns {boolean}
 * @private
 */
function isInnerClassNameOfMember(aVar, scope) {
	'use strict';
	var member = (!!scope && !!scope.ast) ? scope.ast.dujsClassMember : null,
		variable = (!!aVar && !!aVar.binding) ? aVar.binding.variable : null;
	if (!member || !variable || !variable.scope || variable.scope.type !== 'class') {
		return false;
	}
	var classNode = variable.scope.block;
	return classNode.type === 'ClassExpression' && classNode.body.body.indexOf(member) !== -1;
}

/**
 * Split the VarDefs of a GEN or KILL set of a call-site: those of the inner
 * name of the class expression of the callee (a static member) are kept at
 * the call-site, the others are moved to the CALL RETURN NODE
 * @param {Set|null} vardefs
 * @param {Scope} calleeScope
 * @returns {Object} {kept: Set, moved: Set|null} (moved is null for a null set, which is not moved)
 * @private
 */
function splitByInnerClassName(vardefs, calleeScope) {
	'use strict';
	var kept = new Set(),
		moved = new Set();
	if (!vardefs) {
		return {kept: kept, moved: null};
	}
	vardefs.forEach(function (vardef) {
		(isInnerClassNameOfMember(vardef.variable, calleeScope) ? kept : moved).add(vardef);
	});
	return {kept: kept, moved: moved};
}

/**
 * Replay a call edge (a back call edge as well, whose entry and exit copies
 * exist already): a call before a decision node enters the CALL NODE
 * instead of the decision node and returns to the decision node; otherwise the
 * call-site becomes the CALL NODE and its GEN, KILL and outgoing edges but the
 * exception edge move to the CALL RETURN NODE (feature 005, Q-a: an exception
 * of the call statement is thrown before the callee returns, so it stays at the
 * CALL NODE; the CALL RETURN NODE of a call chained after it has no exception
 * edge). With edge.keepGenerateAtCallSite, GEN and KILL stay at
 * the call-site and those of the CALL RETURN NODE are empty; otherwise the
 * definitions of the inner name of a class expression stay at the call-site of
 * a static member of the class (splitByInnerClassName).
 * The CallSiteRecord of the call (FR-016, feature 005 data-model §4) is
 * recorded: the node with the call edge (the call-site, the CALL NODE before a
 * decision, or the CALL RETURN NODE of the previous callee of chained calls),
 * the CALL RETURN NODE, the scope of the callee, the copies of the entry and
 * the exit of the callee, and the fields of the edge; its exceptionalReturn is
 * set when all the edges are replayed (finishCallRecords).
 * In a summary graph (shallow) the callee is not connected: no call and return
 * edge, and the entry and exit of the record are null.
 * @param {Object} edge
 * @param {function} copyOf
 * @param {Array} records {edge, record} of the calls replayed so far
 * @param {boolean} [shallow]
 * @private
 */
function replayCall(edge, copyOf, records, shallow) {
	'use strict';
	var callSite = copyOf(edge.callSite),
		callReturnNode = copyOf(edge.callReturn),
		calleeScope = edge.calleeModel.mainlyRelatedScope,
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
		if (edge.keepGenerateAtCallSite) {
			/// the name of a declared class is defined before its static members run (FR-007)
			callReturnNode.generate = new Set();
			callReturnNode.kill = new Set();
		} else {
			/// the inner name of a class expression is bound before its static members run, so its
			/// definitions stay at the call-site of a static member of the class (feature 006, implement US2)
			var generate = splitByInnerClassName(callSite.generate, calleeScope),
				kill = splitByInnerClassName(callSite.kill, calleeScope);
			callReturnNode.generate = generate.moved;
			callReturnNode.kill = kill.moved;
			callSite.clearGENSet();
			callSite.clearKILLSet();
			callSite.generate = generate.kept;
			callSite.kill = kill.kept;
		}
		moveNonExceptionalEdges(callSite, callReturnNode);
	}
	var entry = null,
		exit = null;
	if (!shallow) {
		entry = copyOf(hierarchy.entryOf(edge.calleeModel));
		exit = copyOf(hierarchy.exitOf(edge.calleeModel));
		callNode.connect(entry, FlowNode.CALL_CONNECTION_TYPE);
		exit.connect(callReturnNode, FlowNode.RETURN_CONNECTION_TYPE);
	}
	records.push({
		edge: edge,
		record: {
			callNode: callNode,
			callReturn: callReturnNode,
			calleeScope: calleeScope,
			exceptionalReturn: null,
			entry: entry,
			exit: exit,
			seq: edge.seq,
			back: !!edge.back,
			beforeDecision: !!edge.beforeDecision,
			callSiteLine: edge.callSite.line
		}
	});
}

/**
 * Finish the CallSiteRecords when all the edges are replayed: the
 * exceptionalReturn of a call is the exception target of the first call-site
 * of its chain (the call-site of the first callee of the node; null without
 * an exception edge); the records are frozen
 * @param {Array} records {edge, record} in the order replayed
 * @param {function} copyOf
 * @returns {Object} {calls: Array of CallSiteRecord, bypasses: Map(CALL RETURN NODE, CallSiteRecord)}
 * @private
 */
function finishCallRecords(records, copyOf) {
	'use strict';
	var edgeOfCallReturn = new Map();
	records.forEach(function (each) {
		edgeOfCallReturn.set(each.edge.callReturn, each.edge);
	});
	var calls = [],
		bypasses = new Map();
	records.forEach(function (each) {
		var first = each.edge;
		while (edgeOfCallReturn.has(first.callSite)) {
			first = edgeOfCallReturn.get(first.callSite);
		}
		var exceptionTarget = copyOf(first.callSite).exception;
		each.record.exceptionalReturn = FlowNode.isFlowNode(exceptionTarget) ? exceptionTarget : null;
		var record = Object.freeze(each.record);
		calls.push(record);
		bypasses.set(record.callReturn, record);
	});
	return {calls: calls, bypasses: bypasses};
}

/**
 * Replay a loop edge: the edges to the exit node of the page are redirected
 * to the LOOP NODE (with the same connection types), which goes to the exit node;
 * the finally edges of a finallyExit node (feature 005, FR-013) are redirected as well
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
			FlowNode.FALSE_BRANCH_CONNECTION_TYPE,
			FlowNode.FINALLY_CONNECTION_TYPE
		].filter(function (type) {
			return FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1 ?
				node[type].indexOf(exitNode) !== -1 : node[type] === exitNode;
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
 * @param {Array} records records of the calls replayed so far (see replayCall)
 * @private
 */
function replay(edge, copyOf, records) {
	'use strict';
	switch (edge.kind) {
		case 'call':
			replayCall(edge, copyOf, records, false);
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
 * Identity map of the VarDefs of the GEN sets of nodes
 * @param {Array} nodes
 * @returns {Map} Map(VarDef, VarDef)
 * @private
 */
function identityOfGenerateSets(nodes) {
	'use strict';
	var identity = new Map();
	nodes.forEach(function (node) {
		if (!!node.generate) {
			node.generate.values().forEach(function (vardef) {
				identity.set(vardef, vardef);
			});
		}
	});
	return identity;
}

/**
 * Expand the hierarchy of a model into its flat graph: copy the originals
 * (without consuming the counter of the FlowNode factory), rebuild the GEN sets
 * of the copies, then replay the operations of the subtree in the order of
 * their global sequence numbers. An intra-procedural model is not copied (its
 * graph is returned with the identity maps and no call). A back call edge
 * (FR-015) is replayed as a call edge to the copies of the entry and exit of
 * its target (added by the expansion of an ancestor) with a record as well.
 * Throws an Error whose message starts with 'open hierarchy: back call edge to'
 * when the target of a back call edge is out of the subtree (openTargetsOf is
 * not empty), and with 'model cycle in hierarchy' when a model object is in
 * its own subtree (both are hierarchies built by hand wrongly).
 * @param {Model} model
 * @returns {Object} {graph: [entry, exit, nodes], flatNodeOf: Map(original, copy),
 *   calls: Array of CallSiteRecord (feature 005 data-model §4) in the order of
 *   their sequence numbers, one per call edge (FR-016),
 *   bypasses: Map(copy of a CALL RETURN NODE, CallSiteRecord of calls),
 *   flatVarDefOf: Map(original VarDef, VarDef of the graph)}
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
		return {
			graph: model.graph,
			flatNodeOf: copies,
			calls: [],
			bypasses: new Map(),
			flatVarDefOf: identityOfGenerateSets(order)
		};
	}
	var edges = collectEdges(model);
	copies = FlowNode.copyNodes(order);
	function copyOf(node) {
		return copies.get(node);
	}
	var flatVarDefOf = rebuildGenerateSets(copies);
	var records = [];
	edges.forEach(function (edge) {
		replay(edge, copyOf, records);
	});
	var finished = finishCallRecords(records, copyOf);
	return {
		graph: [copyOf(hierarchy.entryOf(model)), copyOf(hierarchy.exitOf(model)), order.map(copyOf)],
		flatNodeOf: copies,
		calls: finished.calls,
		bypasses: finished.bypasses,
		flatVarDefOf: flatVarDefOf
	};
}

/**
 * The summary graph of a scope (feature 005, research R1, data-model §3): the
 * copies of the nodes of its intra-procedural model and the CALL NODE and CALL
 * RETURN NODE copies of its own call edges (the edges of the hierarchy of an
 * inter-procedural model, read and not created, so no sequence number is
 * taken), without the nodes of the callees. The calls are replayed by
 * replayCall as in expand, on copies owned by this graph (the originals, the
 * templates and the graphs of other expansions are not changed); the GEN of a
 * copy keeps the original VarDefs (not rebuilt, so the VarDefs of a summary
 * are original VarDefs), in a new Set. An intra-procedural model gives the
 * copies of its nodes and no call.
 * @param {Model} model An intra-procedural model or an inter-procedural model with a hierarchy
 * @returns {Object} {graph: [entry, exit, nodes], flatNodeOf: Map(original, copy),
 *   calls: Array of CallSiteRecord (entry and exit null), bypasses: Map(CALL RETURN NODE, CallSiteRecord)}
 * @throws {Error} when the hierarchy of the model is not an inter-procedural one
 */
function expandShallow(model) {
	'use strict';
	var modelHierarchy = model.hierarchy;
	if (!!modelHierarchy && modelHierarchy.level !== Model.INTER_PROCEDURAL) {
		throw new Error('expandShallow: not an inter-procedural model: ' + String(model.mainlyRelatedScope));
	}
	var mainModel = !!modelHierarchy ? modelHierarchy.main.model : model,
		callEdges = !!modelHierarchy ? modelHierarchy.edges.filter(function (edge) {
			return edge.kind === 'call';
		}).sort(function (one, another) {
			return one.seq - another.seq;
		}) : [],
		order = !!modelHierarchy ? orderOfCalls(modelHierarchy, [model], true) : [].concat(mainModel.graph[2]),
		copies = FlowNode.copyNodes(order);
	function copyOf(node) {
		return copies.get(node);
	}
	copies.forEach(function (copy, original) {
		if (!!original.generate) {
			copy.generate = new Set(original.generate);
		}
	});
	var records = [];
	callEdges.forEach(function (edge) {
		replayCall(edge, copyOf, records, true);
	});
	var finished = finishCallRecords(records, copyOf);
	return {
		graph: [copyOf(mainModel.graph[0]), copyOf(mainModel.graph[1]), order.map(copyOf)],
		flatNodeOf: copies,
		calls: finished.calls,
		bypasses: finished.bypasses
	};
}

module.exports = {
	expand: expand,
	expandShallow: expandShallow,
	nodeOrder: nodeOrder
};
