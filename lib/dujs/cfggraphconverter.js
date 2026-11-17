/*
 * Convert CFG to graph representation
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var esgraph = require('../esgraph');
var FlowNode = require('../esgraph/flownode');
var branchLabel = require('../esgraph/branchlabel');

/**
 * CFGGraphConverter
 * @constructor
 */
function CFGGraphConverter() {
}

/**
 * Number of the first node in the dot output of a graph: the cfgId of the
 * first node of its node array (the entry node of every model)
 * @param {Array} cfg [entry, exit, nodes]
 * @returns {number}
 * @private
 */
function firstDotIndexOf(cfg) {
	'use strict';
	var first = (cfg[2].length > 0) ? cfg[2][0] : cfg[0];
	return first.cfgId;
}

/**
 * Names of the nodes of a graph in its dot output (feature 005, research R9):
 * "n<k>" with k = graph[2][0].cfgId + the index of the node in the node array;
 * a node listed more than once is named by its first index, as the edges of
 * the dot output refer to it. Shared by the toDot* methods and the call
 * matching output, so both name a node the same.
 * @param {Model|Array} model A model or its graph [entry, exit, nodes]
 * @returns {Map} Map(FlowNode, string)
 */
CFGGraphConverter.prototype.dotNodeIds = function (model) {
	'use strict';
	var cfg = Array.isArray(model) ? model : model.graph,
		counter = firstDotIndexOf(cfg) || 0,
		ids = new Map();
	cfg[2].forEach(function (node, index) {
		if (!ids.has(node)) {
			ids.set(node, 'n' + (counter + index));
		}
	});
	return ids;
};

/**
 * Convert a CFG to dot language for Graphviz output (with AST node type labeled, default)
 * @param {Object} cfg CFG to be converted
 * @param {String} [source] Source code used for labels
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDot = function (cfg, source) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: firstDotIndexOf(outputCFG)};
	if (!!source) {
		option.source = source;
	}
	return esgraph.dot(cfg, option);
};

/**
 * Label CFG with line and column
 * @param {Object} cfg CFG to be converted
 */
function labelWithLoc(cfg) {
	"use strict";
	cfg[2].forEach(function (node) {
		if (node.type === FlowNode.NORMAL_NODE_TYPE) {
			node.label = 'L' + node.line + ':C' + node.col + branchLabel.pathSuffix(branchLabel.pathOf(node));
		} else if (node.type === FlowNode.CALL_RETURN_NODE_TYPE) {
			/// the call return of a split call site carries its branch path (FR-011)
			node.label = node.type + ' (L' + node.line + ':C' + node.col + branchLabel.pathSuffix(branchLabel.pathOf(node)) + ')';
		} else if ([FlowNode.ENTRY_NODE_TYPE, FlowNode.EXIT_NODE_TYPE].indexOf(node.type) !== -1) {
			node.label = node.type + ' (L' + node.line + ':C' + node.col + ')';
		} else {
			node.label = node.type;
		}
	});
}

/**
 * Convert a CFG to dot language for Graphviz output (with labeled line and column)
 * @param {Object} cfg CFG to be converted
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDotWithLabelLoc = function (cfg) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: firstDotIndexOf(outputCFG)};
	labelWithLoc(outputCFG);
	return esgraph.dot(cfg, option);
};

/**
 * Compute index number to be characters (a-z)
 * @param {Number} index Index number
 * @returns {String} Character
 */
function computeLabelIndex(index) {
	"use strict";
	var chara = 97, charz = 122;
	var divided = index, remainder;
	var computedLabelIndex = '';
	do {
		remainder = divided % (charz - chara + 1);
		computedLabelIndex = String.fromCharCode(chara + remainder) + computedLabelIndex;
		divided = Math.floor(index / (charz - chara + 1));
	} while(divided !== 0);
	return computedLabelIndex;
}

/**
 * Label CFG with line number
 * @param {Object} cfg CFG to be labeled
 */
function labelWithLineNumber(cfg) {
	"use strict";
	cfg[2].forEach(function (node) {
		if (node.type === FlowNode.NORMAL_NODE_TYPE) {
			node.label = '' + node.line + branchLabel.pathSuffix(branchLabel.pathOf(node));
		} else if (node.type === FlowNode.CALL_RETURN_NODE_TYPE && !!branchLabel.pathOf(node)) {
			/// the call return of a split call site carries its branch path (FR-011);
			/// one with an empty path keeps the plain type label
			node.label = node.type + ' (' + node.line + branchLabel.pathSuffix(branchLabel.pathOf(node)) + ')';
		} else if ([
				FlowNode.LOOP_NODE_TYPE,
				FlowNode.LOOP_RETURN_NODE_TYPE,
				FlowNode.LOCAL_STORAGE_NODE_TYPE
			].indexOf(node.type) !== -1) {
			node.label = node.type;
		} else {
			node.label = node.type;
		}
	});

	cfg[2].forEach(function (node) {
		var nodesHaveSameLabel = [];
		cfg[2].forEach(function (another) {
			if (node.label === another.label) {
				nodesHaveSameLabel.push(another);
			}
		});
		if (nodesHaveSameLabel.length > 1) {
			nodesHaveSameLabel.forEach(function (elem, index) {
				if (elem.type === FlowNode.NORMAL_NODE_TYPE) {
					elem.label = elem.label + computeLabelIndex(index);
				} else {
					elem.label = elem.label + '_' + computeLabelIndex(index);
				}
			});
		}
	});
}

/**
 * Convert a CFG to dot language format output with labeled line number only
 * @param {Object} cfg CFG to be converted
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDotWithLabelLine = function (cfg) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: firstDotIndexOf(outputCFG)};
	labelWithLineNumber(outputCFG);
	return esgraph.dot(cfg, option);
};

/**
 * Label CFG with node's id
 * @param {Object} cfg CFG to be labeled
 */
function labelWithId(cfg) {
	"use strict";
	cfg[2].forEach(function (node) {
		if (node.type === FlowNode.NORMAL_NODE_TYPE) {
			node.label = '' + node.cfgId;
		} else {
			node.label = node.type;
		}
	});
}

/**
 * Convert a CFG to dot language for Graphviz output (with id labeled)
 * @param {Object} cfg CFG to be converted
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDotWithLabelId = function (cfg) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: firstDotIndexOf(outputCFG)};
	labelWithId(outputCFG);
	return esgraph.dot(cfg, option);
};

var converter = new CFGGraphConverter();
module.exports = converter;