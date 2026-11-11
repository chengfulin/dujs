/*
 * Test helper: run the whole dujs analysis on in-memory source code and
 * expose def-use pairs in a compact, assertable form.
 *
 * A pair is rendered as "<variable>: <def> -> <use>", where <def> is "entry"
 * or "L<line>", and <use> is "L<line>" for a c-use or "L<line>>L<line>"
 * (decision node > branch target) for a p-use. Lines are 1-based lines of
 * the analyzed code.
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
	return 'L' + node.line;
}

function useLabel(use) {
	'use strict';
	if (use instanceof Pair) {
		return nodeLabel(use.first) + '>' + nodeLabel(use.second);
	}
	return nodeLabel(use);
}

function pairsOfModel(model) {
	'use strict';
	var result = [];
	model.dupairs.forEach(function (pairs, variable) {
		pairs.values().forEach(function (dupair) {
			var text = variable.name + ': ' + nodeLabel(dupair.first) + ' -> ' + useLabel(dupair.second);
			if (result.indexOf(text) === -1) {
				result.push(text);
			}
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
