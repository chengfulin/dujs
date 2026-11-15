/*
 * Test helper: run the whole dujs analysis on in-memory source code and
 * expose def-use pairs in a compact, assertable form
 * (specs/001-fix-known-issues/contracts/analyze-helper-notation.md, FR-014).
 *
 * A pair is rendered as "<variable>: <def> -> <use>".
 * - A node label is "entry", "exit", "L<line>" or "L<line>:<path>", where
 *   <line> is the 1-based line of the analyzed code (a node split from a
 *   statement takes the line of that statement) and <path> is the non-empty
 *   T/F branch path of a node split into a branch (FlowNode.branchPath).
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
 */
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder'),
	executor = require('../../lib/dujs/defuseanalysisexecutor'),
	Pair = require('../../lib/dujs/pair'),
	FlowNode = require('../../lib/esgraph/flownode');

function nodeLabel(node) {
	'use strict';
	if (node.type === FlowNode.ENTRY_NODE_TYPE) {
		return 'entry';
	}
	if (node.type === FlowNode.EXIT_NODE_TYPE) {
		return 'exit';
	}
	return 'L' + node.line + (!!node.branchPath ? ':' + node.branchPath : '');
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
	if (!!target.branchPath) {
		return [prefix];
	}
	/// FlowNodes are shared by the models: the intra-page model reconnects a
	/// branch to the exit node to its LOOP node, while the pair of the
	/// intra-procedural model still targets the exit node (known limitation)
	function branch(node) {
		return (!!node && node.type === FlowNode.LOOP_NODE_TYPE && target.type === FlowNode.EXIT_NODE_TYPE) ?
			target : node;
	}
	var labels = [];
	if (target === branch(decision.true)) {
		labels.push(prefix + ':T');
	}
	if (target === branch(decision.false)) {
		labels.push(prefix + ':F');
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

	executor.initialize(pages);
	executor.buildIntraProceduralModelsOfEachPageModels();
	executor.buildInterProceduralModelsOfEachPageModels();
	executor.buildIntraPageModelsOfEachPageModels();
	executor.buildInterPageModelsOfEachPageModels();

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
