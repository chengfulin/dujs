/*
 * Format of the branch labels: the only place defining how the T/F branch
 * path of a node is built and shown
 *
 * Original dujs code, MIT License (see LICENSE); this file contains no code
 * derived from esgraph.
 *
 * The label path of a node (FlowNode.labelPath) is the sequence of 'T'/'F'
 * from the first decision node of the statement it is split from; it is empty
 * for the first decision node and for nodes not split. A node is labeled
 * "L<line>" or "L<line>:<path>". This module only reads labelPath and does
 * not depend on the FlowNode module.
 * See specs/002-small-refactors/research.md R5 and data-model.md §2.
 *
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */

/**
 * Branch of the true target of a decision node
 * @type {string}
 * @constant
 */
var TRUE_BRANCH = 'T';

/**
 * Branch of the false target of a decision node
 * @type {string}
 * @constant
 */
var FALSE_BRANCH = 'F';

/**
 * Separator between a label and a branch path or a branch
 * @type {string}
 * @private
 */
var SEPARATOR = ':';

/**
 * The label path of a node: the only source of the branch path of labels
 * @param {Object} node node with labelPath
 * @returns {string}
 */
function pathOf(node) {
	'use strict';
	return node.labelPath;
}

/**
 * The suffix of a label for a branch path: empty for an empty path
 * @param {string} path
 * @returns {string}
 */
function pathSuffix(path) {
	'use strict';
	return !!path ? SEPARATOR + path : '';
}

/**
 * The label of a node at a line with a branch path: "L<line>[:<path>]"
 * @param {number} line
 * @param {string} path
 * @returns {string}
 */
function lineLabel(line, path) {
	'use strict';
	return 'L' + line + pathSuffix(path);
}

/**
 * The branch path of a branch of a decision node at the given path
 * @param {string} path
 * @param {string} branch TRUE_BRANCH or FALSE_BRANCH
 * @returns {string}
 */
function extendPath(path, branch) {
	'use strict';
	return path + branch;
}

/**
 * The mark of a branch appended to a label: ":T" or ":F"
 * @param {string} branch TRUE_BRANCH or FALSE_BRANCH
 * @returns {string}
 */
function branchMark(branch) {
	'use strict';
	return SEPARATOR + branch;
}

module.exports = {
	TRUE_BRANCH: TRUE_BRANCH,
	FALSE_BRANCH: FALSE_BRANCH,
	pathOf: pathOf,
	pathSuffix: pathSuffix,
	lineLabel: lineLabel,
	extendPath: extendPath,
	branchMark: branchMark
};
