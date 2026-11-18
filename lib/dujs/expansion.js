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
 * The GEN of a segment of the original node of a plan (feature 007,
 * data-model §4): the definitions of its GEN whose segment
 * (plan.segmentOfVarDef) is the given one, in the order of its GEN, mapped to
 * the graph by varDefOf; with unplaced, the definitions in no segment (the
 * loop variable of a once-loop node) as well
 * @param {Object} plan SegmentPlan
 * @param {number|null} index Segment, null for the definitions in no segment only
 * @param {function} varDefOf (original VarDef) -> VarDef of the graph
 * @param {boolean} unplaced
 * @returns {Set}
 * @private
 */
function generateOfSegment(plan, index, varDefOf, unplaced) {
	'use strict';
	var generate = new Set();
	if (!plan.node.generate) {
		return generate;
	}
	plan.node.generate.values().forEach(function (vardef) {
		var segment = plan.segmentOfVarDef(vardef);
		if (segment === index || (unplaced && segment === null)) {
			generate.add(varDefOf(vardef));
		}
	});
	return generate;
}

/**
 * Mark the copies of a once-* node as not evaluating the discriminant or the
 * right side again (feature 007 User Story 3, data-model §3): discriminantSplit
 * on the copy of the first case and the copies of the cases with a test
 * (owners) of a once-switch, loopRightSplit on the copy of a once-loop node;
 * the originals are not changed
 * @param {Object} plan SegmentPlan of shape once-switch or once-loop
 * @param {FlowNode} copyOfNode copy of plan.node
 * @param {Array} owners copies of plan.owners
 * @private
 */
function markEvaluatedOnce(plan, copyOfNode, owners) {
	'use strict';
	if (plan.shape === 'once-switch') {
		[copyOfNode].concat(owners).forEach(function (caseCopy) {
			caseCopy.discriminantSplit = true;
		});
	} else if (plan.shape === 'once-loop') {
		copyOfNode.loopRightSplit = true;
	}
}

/**
 * Place the segments of the call sites of a node on the copies of a call edge
 * (feature 007, data-model §4, research R1, R3, R4): the node entering the
 * first callee is segment 0 (the copy of the node of a statement, the CALL
 * NODE inserted before a decision); the CALL RETURN NODE of the last callee of
 * call site j is segment j + 1, but the one of the last call site of a
 * decision, which returns to the copy of the decision node, segment k; the
 * other CALL RETURN NODEs (chained callees of one call site) have no segment,
 * GEN or USE. Each segment node has the GEN of its segment, its segment
 * {source, index, plan} (read by DefUseAnalyzer.findUSESet) and the owners of
 * its deferred p-uses (the copies of plan.owners; none for an owner itself).
 * The CALL NODE inserted before a decision (segment 0) gets an exception edge
 * to the copy of plan.throwTarget; the other exception edges stay where they
 * are (develop positions until User Story 4). For the once-* shapes (User
 * Story 3), the copy of the node (and the copies of the other cases with a
 * test of a once-switch) are marked discriminantSplit or loopRightSplit.
 * @param {Object} edge call edge with a plan
 * @param {FlowNode} callNode copy entering the callee
 * @param {FlowNode} callReturnNode copy of the CALL RETURN NODE
 * @param {function} copyOf
 * @param {function} varDefOf (original VarDef) -> VarDef of the graph
 * @private
 */
function placeSegments(edge, callNode, callReturnNode, copyOf, varDefOf) {
	'use strict';
	var plan = edge.plan,
		count = plan.callSites.length,
		copyOfNode = copyOf(plan.node),
		owners = plan.owners.map(copyOf);
	function setSegment(node, index) {
		node.segment = Object.freeze({source: plan.node, index: index, plan: plan});
		node.puseOwners = (owners.indexOf(node) === -1) ? owners : [];
		node.generate = generateOfSegment(plan, index, varDefOf, node === copyOfNode);
		node.kill = new Set();
	}
	if (edge.callSite === plan.node) {
		setSegment(callNode, 0);
		if (edge.beforeDecision) {
			if (plan.shape === 'decision') {
				setSegment(copyOfNode, count);
			} else {
				/// once-* (User Story 3): the copy of the node keeps the definitions in no segment only (the loop
				/// variable)
				copyOfNode.generate = generateOfSegment(plan, null, varDefOf, true);
				copyOfNode.kill = new Set();
				markEvaluatedOnce(plan, copyOfNode, owners);
			}
			if (!!plan.throwTarget) {
				callNode.connect(copyOf(plan.throwTarget), FlowNode.EXCEPTION_CONNECTION_TYPE);
			}
		}
	}
	if (edge.lastOfCallSite && (plan.shape !== 'decision' || edge.callIndex + 1 < count)) {
		setSegment(callReturnNode, edge.callIndex + 1);
	}
}

/**
 * Whether a predecessor of the copy of the call-site of the first edge before
 * a decision enters segment 0 (feature 007 data-model §4, research R5): every
 * predecessor, but for a once-loop node only those whose original is in
 * plan.enteringPrev (out of the loop body), a CALL NODE or CALL RETURN NODE
 * being compared by the original node of its segment (segment.source); the
 * back edges of the loop body still go to the copy of the loop node
 * @param {Object} edge call edge with beforeDecision
 * @param {FlowNode} prevNode predecessor of the copy of the call-site
 * @param {function} copyOf
 * @returns {boolean}
 * @private
 */
function entersCallSite(edge, prevNode, copyOf) {
	'use strict';
	var plan = edge.plan;
	if (!plan || plan.shape !== 'once-loop' || !plan.enteringPrev) {
		return true;
	}
	return plan.enteringPrev.some(function (original) {
		return copyOf(original) === prevNode || (!!prevNode.segment && prevNode.segment.source === original);
	});
}

/**
 * Replay a call edge (a back call edge as well, whose entry and exit copies
 * exist already): a call before a decision node enters the CALL NODE
 * instead of the decision node and returns to the decision node; otherwise the
 * call-site becomes the CALL NODE and its outgoing edges but the exception
 * edge move to the CALL RETURN NODE (feature 005, Q-a: an exception of the
 * call statement is thrown before the callee returns, so it stays at the CALL
 * NODE; the CALL RETURN NODE of a call chained after it has no exception
 * edge). An edge with a SegmentPlan (feature 007) places the GEN, the
 * segments and the deferred p-use owners on the copies (placeSegments);
 * without a plan (a hierarchy built by hand) the GEN and KILL of the
 * call-site move to the CALL RETURN NODE.
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
 * @param {boolean} shallow
 * @param {function} varDefOf (original VarDef) -> VarDef of the graph
 * @private
 */
function replayCall(edge, copyOf, records, shallow, varDefOf) {
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
			if (entersCallSite(edge, prevNode, copyOf)) {
				redirectEdges(prevNode, callSite, callNode);
			}
		});
		callReturnNode.connect(callSite, FlowNode.NORMAL_CONNECTION_TYPE);
	} else {
		callSite.type = FlowNode.CALL_NODE_TYPE;
		if (!!edge.plan) {
			callReturnNode.generate = new Set();
			callReturnNode.kill = new Set();
		} else {
			callReturnNode.generate = callSite.generate;
			callReturnNode.kill = callSite.kill;
			callSite.clearGENSet();
			callSite.clearKILLSet();
		}
		moveNonExceptionalEdges(callSite, callReturnNode);
	}
	if (!!edge.plan) {
		placeSegments(edge, callNode, callReturnNode, copyOf, varDefOf);
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
 * LoopRecord of the LOOP NODE of an edge (loop, loopReturn or event; feature
 * 005 data-model §5), created when not recorded yet
 * @param {Object} edge
 * @param {function} copyOf
 * @param {Object} loops {list: Array of LoopRecord, of: Map(original LOOP NODE, LoopRecord)}
 * @returns {Object} the (not frozen yet) LoopRecord
 * @private
 */
function loopRecordOf(edge, copyOf, loops) {
	'use strict';
	if (!loops.of.has(edge.loop)) {
		var record = {
			loop: copyOf(edge.loop),
			loopReturn: copyOf(edge.loopReturn),
			handlers: [],
			noHandler: true
		};
		loops.of.set(edge.loop, record);
		loops.list.push(record);
	}
	return loops.of.get(edge.loop);
}

/**
 * Replay an event edge: the LOOP NODE goes to the entry of the handler by an
 * onEvent edge and the exit of the handler goes to the LOOP RETURN NODE; the
 * handler is added to the LoopRecord of the LOOP NODE once (a handler
 * registered twice has the same copies, so one edge from its exit to the
 * LOOP RETURN NODE)
 * @param {Object} edge
 * @param {function} copyOf
 * @param {Object} loops see loopRecordOf
 * @private
 */
function replayEvent(edge, copyOf, loops) {
	'use strict';
	var entry = copyOf(hierarchy.entryOf(edge.handlerModel)),
		exit = copyOf(hierarchy.exitOf(edge.handlerModel)),
		record = loopRecordOf(edge, copyOf, loops),
		scope = edge.handlerModel.mainlyRelatedScope;
	copyOf(edge.loop).connect(entry, FlowNode.ON_EVENT_CONNECTION_TYPE);
	exit.connect(copyOf(edge.loopReturn));
	record.noHandler = false;
	if (!record.handlers.some(function (handler) {
		return handler.scope === scope;
	})) {
		record.handlers.push(Object.freeze({scope: scope, entry: entry, exit: exit}));
	}
}

/**
 * Freeze the LoopRecords when all the edges are replayed
 * @param {Object} loops see loopRecordOf
 * @returns {Array} the LoopRecords in the order replayed
 * @private
 */
function finishLoopRecords(loops) {
	'use strict';
	return loops.list.map(function (record) {
		Object.freeze(record.handlers);
		return Object.freeze(record);
	});
}

/**
 * Replay an operation on the copies
 * @param {Object} edge
 * @param {function} copyOf
 * @param {Array} records records of the calls replayed so far (see replayCall)
 * @param {Object} loops the LoopRecords replayed so far (see loopRecordOf)
 * @param {function} varDefOf (original VarDef) -> VarDef of the graph
 * @private
 */
function replay(edge, copyOf, records, loops, varDefOf) {
	'use strict';
	switch (edge.kind) {
		case 'call':
			replayCall(edge, copyOf, records, false, varDefOf);
			break;
		case 'loop':
			replayLoop(edge, copyOf);
			break;
		case 'loopReturn':
			copyOf(edge.loopReturn).connect(copyOf(edge.loop), FlowNode.RETURN_CONNECTION_TYPE);
			loopRecordOf(edge, copyOf, loops);
			if (edge.noHandler) {
				copyOf(edge.loop).connect(copyOf(edge.loopReturn), FlowNode.ON_EVENT_CONNECTION_TYPE);
			}
			break;
		case 'event':
			replayEvent(edge, copyOf, loops);
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
 *   loops: Array of frozen LoopRecord {loop, loopReturn, handlers: [{scope, entry,
 *   exit}], noHandler} (feature 005 data-model §5), one per LOOP NODE (page) in the
 *   order replayed, each handler once (by its scope) in the order of the event edges,
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
			loops: [],
			flatVarDefOf: identityOfGenerateSets(order)
		};
	}
	var edges = collectEdges(model);
	copies = FlowNode.copyNodes(order);
	function copyOf(node) {
		return copies.get(node);
	}
	var flatVarDefOf = rebuildGenerateSets(copies);
	function varDefOf(vardef) {
		return flatVarDefOf.get(vardef);
	}
	var records = [],
		loops = {list: [], of: new Map()};
	edges.forEach(function (edge) {
		replay(edge, copyOf, records, loops, varDefOf);
	});
	var finished = finishCallRecords(records, copyOf);
	return {
		graph: [copyOf(hierarchy.entryOf(model)), copyOf(hierarchy.exitOf(model)), order.map(copyOf)],
		flatNodeOf: copies,
		calls: finished.calls,
		bypasses: finished.bypasses,
		loops: finishLoopRecords(loops),
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
		replayCall(edge, copyOf, records, true, function (vardef) {
			return vardef;
		});
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
