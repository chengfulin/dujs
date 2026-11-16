/*
 * Test helper: run the whole dujs analysis on in-memory source code and
 * expose def-use pairs in a compact, assertable form
 * (specs/001-fix-known-issues/contracts/analyze-helper-notation.md, FR-014).
 *
 * A pair is rendered as "<variable>: <def> -> <use>".
 * - A node label is "entry", "exit", "L<line>" or "L<line>:<path>", where
 *   <line> is the 1-based line of the analyzed code (a node split from a
 *   statement takes the line of that statement) and <path> is the non-empty
 *   T/F label path of the node (FlowNode.labelPath, read through
 *   lib/esgraph/branchlabel.js pathOf): the split path of a node split into a
 *   branch, or the label path of the call site for a call node inserted
 *   before a decision node and a call return node.
 * - <def> is a node label; a c-use is the label of the using node.
 * - A p-use is "<decision>><target>": when the target has a branch path its
 *   last T/F already tells the branch and nothing is appended; otherwise
 *   ":T" or ":F" is appended for the true or false target of the decision.
 *   When both targets of a decision are the same node, both strings are
 *   rendered.
 * - Pairs are deduplicated and sorted.
 * - An Error naming the variable and the decision node is thrown when the
 *   decision node of a p-use lacks its true or false target (FR-010).
 *
 * Known limitation (accepted, spec "notation"): when one line holds more
 * than one node source (several statements, several split sources, or
 * parameter defaults on the same line as the body), labels may collide, and
 * the omitted branch code of a p-use may be ambiguous ("L2>L2:T" can be the
 * true branch to "L2" or a target "L2:T"); for-in/for-of with a split right
 * side labels its first decision and the loop node both "L<line>". No
 * sequence number is added and no error is thrown, so the analyzed programs
 * of the tests keep one node source per line.
 *
 * Invariance of built models (specs/003-hierarchical-models research R14,
 * SC-003): after each modeling stage is analyzed, the models built by the
 * stage are snapshotted; after all four stages, every snapshot is taken again
 * and compared, and an Error naming the model and the node is thrown on any
 * difference.
 */
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder'),
	executor = require('../../lib/dujs/defuseanalysisexecutor'),
	Pair = require('../../lib/dujs/pair'),
	FlowNode = require('../../lib/esgraph/flownode'),
	branchLabel = require('../../lib/esgraph/branchlabel');

function nodeLabel(node) {
	'use strict';
	if (node.type === FlowNode.ENTRY_NODE_TYPE) {
		return 'entry';
	}
	if (node.type === FlowNode.EXIT_NODE_TYPE) {
		return 'exit';
	}
	return branchLabel.lineLabel(node.line, branchLabel.pathOf(node));
}

/**
 * Labels of a use: one for a c-use; one or two for a p-use
 * @param {FlowNode|Pair} use
 * @param {string} variableName
 * @returns {Array}
 */
function useLabels(use, variableName) {
	'use strict';
	if (!(use instanceof Pair)) {
		return [nodeLabel(use)];
	}
	var decision = use.first, target = use.second;
	if (!decision.true || !decision.false || !target) {
		throw new Error('Decision node ' + nodeLabel(decision) + ' of the p-use of variable ' + variableName +
			' lacks its ' + (!decision.true ? 'true' : (!decision.false ? 'false' : 'branch')) + ' target');
	}
	var prefix = nodeLabel(decision) + '>' + nodeLabel(target);
	if (!!branchLabel.pathOf(target)) {
		return [prefix];
	}
	var labels = [];
	if (target === decision.true) {
		labels.push(prefix + branchLabel.branchMark(branchLabel.TRUE_BRANCH));
	}
	if (target === decision.false) {
		labels.push(prefix + branchLabel.branchMark(branchLabel.FALSE_BRANCH));
	}
	if (labels.length === 0) {
		throw new Error('Target ' + nodeLabel(target) + ' of the p-use of variable ' + variableName +
			' is neither the true nor the false target of decision node ' + nodeLabel(decision));
	}
	return labels;
}

function pairsOfModel(model) {
	'use strict';
	var result = [];
	model.dupairs.forEach(function (pairs, variable) {
		pairs.values().forEach(function (dupair) {
			useLabels(dupair.second, variable.name).forEach(function (use) {
				var text = variable.name + ': ' + nodeLabel(dupair.first) + ' -> ' + use;
				if (result.indexOf(text) === -1) {
					result.push(text);
				}
			});
		});
	});
	return result.sort();
}

/**
 * Fields of the analysis result of a node kept in a snapshot
 * @type {Array}
 */
var RESULT_FIELDS = ['reachIns', 'reachOuts', 'generate', 'kill', 'cuse', 'puse'];

/**
 * Stages of the executor, each with the models it builds
 * @type {Array}
 */
var STAGES = [
	{
		build: 'buildIntraProceduralModelsOfEachPageModels',
		models: function (pageModels) {
			'use strict';
			return pageModels.intraProceduralModels;
		}
	},
	{
		build: 'buildInterProceduralModelsOfEachPageModels',
		models: function (pageModels) {
			'use strict';
			return pageModels.interProceduralModels;
		}
	},
	{
		build: 'buildIntraPageModelsOfEachPageModels',
		models: function (pageModels) {
			'use strict';
			return pageModels.intraPageModels;
		}
	},
	{
		build: 'buildInterPageModelsOfEachPageModels',
		models: function () {
			'use strict';
			return [modelCtrl.interPageModel];
		}
	}
];

/**
 * Snapshot of a model: the nodes of the flat graph and, for each node, its
 * cfgId, type, the targets of each connection type, prev and next (a target
 * in the graph as its position, otherwise the object itself) and the members
 * of the six sets of analysisResultOf (objects compared by identity)
 * @param {Model} model
 * @returns {Object} {model, entry, exit, nodes, records}
 */
function snapshotOf(model) {
	'use strict';
	var graph = model.graph,
		positions = new Map();
	graph[2].forEach(function (node, index) {
		positions.set(node, index);
	});
	function refOf(node) {
		return positions.has(node) ? positions.get(node) : node;
	}
	function refsOf(nodes) {
		return [].concat(nodes || []).map(refOf);
	}
	return {
		model: model,
		entry: refOf(graph[0]),
		exit: refOf(graph[1]),
		nodes: graph[2].slice(),
		records: graph[2].map(function (node) {
			var record = {cfgId: node.cfgId, type: node.type, prev: refsOf(node.prev), next: refsOf(node.next)},
				result = model.analysisResultOf(node);
			FlowNode.CONNECTION_TYPES.forEach(function (type) {
				record[type] = refsOf(node[type]);
			});
			RESULT_FIELDS.forEach(function (field) {
				record[field] = (!result || !result[field]) ? null : result[field].values();
			});
			return record;
		})
	};
}

/**
 * Name of a model in an Error
 * @param {Model} model
 * @returns {string}
 */
function modelName(model) {
	'use strict';
	return model.level + ' model of ' + String(model.mainlyRelatedScope);
}

/**
 * Whether two arrays have the same elements (by identity) in the same order
 * @param {Array|null} first
 * @param {Array|null} second
 * @returns {boolean}
 */
function sameItems(first, second) {
	'use strict';
	if (first === null || second === null) {
		return first === second;
	}
	return first.length === second.length && first.every(function (item, index) {
		return item === second[index];
	});
}

/**
 * Compare a snapshot with a new snapshot of the same model
 * @param {Object} before
 * @param {Object} after
 * @throws {Error} naming the model and the node when they differ
 */
function compareSnapshots(before, after) {
	'use strict';
	var name = modelName(before.model);
	if (before.entry !== after.entry || before.exit !== after.exit) {
		throw new Error('The entry or exit node of the ' + name + ' changed');
	}
	if (!sameItems(before.nodes, after.nodes)) {
		throw new Error('The nodes of the ' + name + ' changed (' + before.nodes.length + ' -> ' +
			after.nodes.length + ' nodes)');
	}
	before.records.forEach(function (record, index) {
		var other = after.records[index];
		Object.keys(record).forEach(function (field) {
			var same = Array.isArray(record[field]) || record[field] === null ?
				sameItems(record[field], other[field]) : record[field] === other[field];
			if (!same) {
				throw new Error('The ' + field + ' of node ' + before.nodes[index].cfgId + ' (' +
					nodeLabel(before.nodes[index]) + ') of the ' + name + ' changed');
			}
		});
	});
}

/**
 * Run the four modeling stages of the executor on the pages, snapshotting the
 * models built by each stage after it is analyzed, then check that no
 * snapshot changed after the four stages (research R14)
 * @param {Array} pages source code of each page
 * @returns {Array} snapshots of the models of each stage (an Array per stage)
 * @throws {Error} naming the model and the node when a snapshot changed
 */
function buildModels(pages) {
	'use strict';
	executor.initialize(pages);
	var snapshots = STAGES.map(function (stage) {
		executor[stage.build]();
		var models = [];
		scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
			[].push.apply(models, stage.models(modelCtrl.collectionOfPageModels.get(scopeTree)));
		});
		/// the inter-page model is shared by the pages: snapshot it once
		return models.filter(function (model, index) {
			return models.indexOf(model) === index;
		}).map(snapshotOf);
	});
	snapshots.forEach(function (snapshotsOfStage) {
		snapshotsOfStage.forEach(function (snapshot) {
			compareSnapshots(snapshot, snapshotOf(snapshot.model));
		});
	});
	return snapshots;
}

/**
 * Clear the global analysis state (scopes, models and node counter) kept by
 * the singleton controllers; call it after tests to isolate other suites
 */
function reset() {
	'use strict';
	scopeCtrl.clear();
	modelCtrl.clear();
	cfgBuilder.resetGraphNodeCounter();
}

/**
 * Analyze the given source code of pages (one string per page)
 * @param {string|Array} codeOfPages
 * @returns {Object} accessors of scopes and def-use pairs of the first page
 */
function analyze(codeOfPages) {
	'use strict';
	var pages = [].concat(codeOfPages);
	reset();

	buildModels(pages);

	var scopeTree = scopeCtrl.pageScopeTrees[0],
		pageModels = modelCtrl.collectionOfPageModels.get(scopeTree);

	function intraProceduralModelOf(scopeName) {
		var found = null;
		pageModels.intraProceduralModels.forEach(function (model) {
			if (model.mainlyRelatedScope.name === scopeName) {
				found = model;
			}
		});
		if (!found) {
			throw new Error('No intra-procedural model of scope ' + scopeName +
				'; scopes: ' + scopeTree.scopes.map(String).join(', '));
		}
		return found;
	}

	return {
		scopeTree: scopeTree,
		/** names of all scopes of the page */
		scopeNames: function () {
			return scopeTree.scopes.map(String);
		},
		/** def-use pairs of the intra-procedural model of a scope (default: page) */
		intraProcedural: function (scopeName) {
			return pairsOfModel(intraProceduralModelOf(scopeName || scopeTree.root.name));
		},
		/** def-use pairs of the intra-page model */
		intraPage: function () {
			return pairsOfModel(pageModels.intraPageModels[0]);
		},
		/** names of the scopes whose nodes are in the intra-page graph */
		intraPageScopes: function () {
			var names = [];
			pageModels.intraPageModels[0].graph[2].forEach(function (node) {
				if (!!node.scope && names.indexOf(node.scope.name) === -1) {
					names.push(node.scope.name);
				}
			});
			return names;
		},
		/** names of the scopes connected into inter-procedural models */
		interProceduralScopes: function () {
			return pageModels.interProceduralModels.map(function (model) {
				return model.relatedScopes.map(String);
			});
		}
	};
}

module.exports = analyze;
module.exports.reset = reset;
module.exports.pairsOfModel = pairsOfModel;
module.exports.nodeLabel = nodeLabel;
module.exports.buildModels = buildModels;
module.exports.snapshotOf = snapshotOf;
module.exports.compareSnapshots = compareSnapshots;
