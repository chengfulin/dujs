/*
 * DOT representation of the hierarchy of an upper model (inter-procedural,
 * intra-page or inter-page): one node per unit and the call, return, loop,
 * onEvent, loadStorage and saveStorage edges between the units
 * (specs/003-hierarchical-models, contracts/hierarchy-output.md §2), with the
 * recursive call and recursive return edges of the back call edges
 * (specs/004-fix-remaining-issues, contracts/output.md §2).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * Only model.hierarchy is read; the CALL, CALL RETURN and LOOP RETURN nodes
 * are not drawn.
 */
var Model = require('./model');

/**
 * Edge attributes of each kind of edge
 * @type {Object}
 * @private
 */
var EDGE_ATTRIBUTES = {
	call: 'color="blue", label="call"',
	'return': 'color="blue", style="dashed", label="return"',
	backCall: 'color="blue", style="bold", label="recursive call"',
	backReturn: 'color="blue", style="bold,dashed", label="recursive return"',
	loop: 'label="loop"',
	onEvent: 'color="green", label="onEvent"',
	loadStorage: 'style="dotted", label="loadStorage"',
	saveStorage: 'style="dotted", label="saveStorage"'
};

/**
 * Node attributes of the LOOP unit (same as the LOOP NODE of the flat graph)
 * @type {string}
 * @private
 */
var LOOP_STYLE = ', shape="ellipse", style="filled", fillcolor="yellow"';

/**
 * Node attributes of the domain unit (same as the localStorage node of the flat graph)
 * @type {string}
 * @private
 */
var DOMAIN_STYLE = ', shape="doublecircle", style="filled", fillcolor="orange"';

/**
 * Escape the double quotes and backslashes of a label
 * @param {string} text
 * @returns {string}
 */
function escapeLabel(text) {
	'use strict';
	return String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Collector of the nodes (identified by a key, numbered by first appearance)
 * and the edges (deduplicated by from, to and kind) of a hierarchy graph
 * @returns {Object}
 * @private
 */
function createCollector() {
	'use strict';
	var keys = [],
		nodeLines = [],
		edgeKeys = [],
		edgeLines = [];
	return {
		/**
		 * Id of the node of a key, added with the label and style at first
		 * @param {*} key
		 * @param {string} label
		 * @param {string} [style]
		 * @returns {string}
		 */
		node: function (key, label, style) {
			var index = keys.indexOf(key);
			if (index === -1) {
				index = keys.length;
				keys.push(key);
				nodeLines.push('h' + index + ' [label="' + escapeLabel(label) + '"' + (style || '') + ']');
			}
			return 'h' + index;
		},
		/**
		 * Add an edge once for the same from, to and kind
		 * @param {string} from
		 * @param {string} to
		 * @param {string} kind
		 */
		edge: function (from, to, kind) {
			var edgeKey = from + ' ' + to + ' ' + kind;
			if (edgeKeys.indexOf(edgeKey) === -1) {
				edgeKeys.push(edgeKey);
				edgeLines.push(from + ' -> ' + to + ' [' + EDGE_ATTRIBUTES[kind] + ']');
			}
		},
		/**
		 * Node and edge lines
		 * @returns {Array}
		 */
		lines: function () {
			return nodeLines.concat(edgeLines);
		}
	};
}

/**
 * Edges of a hierarchy in the order of their sequence numbers
 * @param {Object} hierarchy
 * @returns {Array}
 * @private
 */
function edgesInOrder(hierarchy) {
	'use strict';
	return hierarchy.edges.slice().sort(function (first, second) {
		return first.seq - second.seq;
	});
}

/**
 * Whether a model has an inter-procedural hierarchy
 * @param {Model} model
 * @returns {boolean}
 * @private
 */
function hasCallHierarchy(model) {
	'use strict';
	return !!model && !!model.hierarchy && model.hierarchy.level === Model.INTER_PROCEDURAL;
}

/**
 * Collect the call and return edges of an inter-procedural model, depth
 * first into the callees having an inter-procedural hierarchy. A back call
 * edge (FR-015, specs/004-fix-remaining-issues contracts/output.md §2) is
 * drawn as a recursive call from the caller to the unit of its target scope
 * and a recursive return back, without going down into the target
 * @param {Object} collector
 * @param {Model} model
 * @param {Array} visiting models on the current path (against recursion)
 * @private
 */
function collectCalls(collector, model, visiting) {
	'use strict';
	var hierarchy = model.hierarchy;
	visiting.push(model);
	edgesInOrder(hierarchy).forEach(function (edge) {
		if (edge.kind !== 'call') {
			return;
		}
		var caller = collector.node(edge.caller.scope, String(edge.caller.scope)),
			callee = collector.node(edge.callee.scope, String(edge.callee.scope));
		if (edge.back) {
			collector.edge(caller, callee, 'backCall');
			collector.edge(callee, caller, 'backReturn');
			return;
		}
		collector.edge(caller, callee, 'call');
		if (hasCallHierarchy(edge.calleeModel) && visiting.indexOf(edge.calleeModel) === -1) {
			collectCalls(collector, edge.calleeModel, visiting);
		}
		collector.edge(callee, caller, 'return');
	});
	visiting.pop();
}

/**
 * Collect the units and edges of an inter-procedural model
 * @param {Object} collector
 * @param {Model} model
 * @private
 */
function collectInterProcedural(collector, model) {
	'use strict';
	var main = model.hierarchy.main;
	collector.node(main.scope, String(main.scope));
	collectCalls(collector, model, []);
}

/**
 * Collect the units and edges of an intra-page model
 * @param {Object} collector
 * @param {Model} model
 * @private
 */
function collectIntraPage(collector, model) {
	'use strict';
	var hierarchy = model.hierarchy,
		main = collector.node(hierarchy.main.scope, String(hierarchy.main.scope)),
		loopUnit = hierarchy.units.filter(function (unit) {
			return unit.kind === 'loop';
		})[0],
		loop = collector.node(loopUnit, 'loop', LOOP_STYLE);
	collector.edge(main, loop, 'loop');
	edgesInOrder(hierarchy).forEach(function (edge) {
		if (edge.kind !== 'event') {
			return;
		}
		var handler = collector.node(edge.handler.scope, String(edge.handler.scope));
		collector.edge(loop, handler, 'onEvent');
		collector.edge(handler, loop, 'return');
	});
}

/**
 * Collect the units and edges of the inter-page model
 * @param {Object} collector
 * @param {Model} model
 * @private
 */
function collectInterPage(collector, model) {
	'use strict';
	var hierarchy = model.hierarchy,
		domain = collector.node(hierarchy.main, String(hierarchy.main.scope), DOMAIN_STYLE);
	hierarchy.units.forEach(function (unit) {
		if (unit.kind === 'page') {
			collector.node(unit, 'page' + unit.pageIndex);
		}
	});
	edgesInOrder(hierarchy).forEach(function (edge) {
		var page = collector.node(edge.page, 'page' + edge.page.pageIndex);
		if (edge.kind === 'load') {
			collector.edge(domain, page, 'loadStorage');
		} else if (edge.kind === 'save' && edge.definingNodes.length > 0) {
			collector.edge(page, domain, 'saveStorage');
		}
	});
}

/**
 * Title of the hierarchy of an upper model: the level and, except for the
 * inter-page model, the main scope
 * @param {Model} model inter-procedural, intra-page or inter-page model
 * @returns {string} title (not escaped)
 * @throws {Error} when the model has no hierarchy or the level is unknown
 */
function hierarchyTitleOf(model) {
	'use strict';
	if (!model || !model.hierarchy) {
		throw new Error('The model has no hierarchy');
	}
	var hierarchy = model.hierarchy;
	if (hierarchy.level === Model.INTER_PROCEDURAL) {
		return 'inter-procedural: ' + String(hierarchy.main.scope);
	}
	if (hierarchy.level === Model.INTRA_PAGE) {
		return 'intra-page: ' + String(hierarchy.main.scope);
	}
	if (hierarchy.level === Model.INTER_PAGE) {
		return 'inter-page';
	}
	throw new Error('Unknown level of the hierarchy: ' + hierarchy.level);
}

/**
 * Convert the hierarchy of an upper model to a DOT representation
 * @param {Model} model inter-procedural, intra-page or inter-page model
 * @returns {string} DOT representation (no newline at the end)
 * @throws {Error} when the model has no hierarchy or the level is unknown
 */
function convertHierarchyToDot(model) {
	'use strict';
	var title = hierarchyTitleOf(model),
		level = model.hierarchy.level,
		collector = createCollector();
	if (level === Model.INTER_PROCEDURAL) {
		collectInterProcedural(collector, model);
	} else if (level === Model.INTRA_PAGE) {
		collectIntraPage(collector, model);
	} else {
		collectInterPage(collector, model);
	}
	return ['digraph Hierarchy {', 'node [shape="box"]', 'label = "' + escapeLabel(title) + '"']
		.concat(collector.lines(), ['}']).join('\n');
}

module.exports = {
	convertHierarchyToDot: convertHierarchyToDot,
	hierarchyTitleOf: hierarchyTitleOf,
	escapeLabel: escapeLabel
};
