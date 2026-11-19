/*
 * Reader of the DOT dialect written by dujs (flat graphs and hierarchies),
 * read line by line into the label, the nodes and the edges of the graph in
 * their order (specs/009-mermaid-markdown-output, contracts/mermaid-graph.md
 * §1, data-model.md §1).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * Any line out of the dialect throws (fail fast): a DOT text that cannot be
 * read exactly is never turned into a different Mermaid graph.
 */

/**
 * Lines skipped: the header, the default node attributes and the closing brace
 * @type {RegExp}
 * @private
 */
var SKIPPED_LINE = /^(?:digraph \w+ \{|node \[shape="box"\]|\})$/;

/**
 * Quoted value: `"` followed by any characters other than `"` and `\`, or
 * escaped characters, up to the closing `"`
 * @type {string}
 * @private
 */
var QUOTED = '"((?:[^"\\\\\\n]|\\\\.)*)"';

/**
 * Label line of the graph
 * @type {RegExp}
 * @private
 */
var LABEL_LINE = new RegExp('^label = ' + QUOTED + '$');

/**
 * Node line: id and the attribute list
 * @type {RegExp}
 * @private
 */
var NODE_LINE = /^([A-Za-z_]\w*) \[(.*)\]$/;

/**
 * Edge line: from, to and the attribute list
 * @type {RegExp}
 * @private
 */
var EDGE_LINE = /^([A-Za-z_]\w*) -> ([A-Za-z_]\w*) \[(.*)\]$/;

/**
 * One attribute at the start of the rest of an attribute list
 * @type {RegExp}
 * @private
 */
var ATTRIBUTE = new RegExp('^(\\w+) ?= ?' + QUOTED);

/**
 * DOT keywords, which are not node ids
 * @type {Array}
 * @private
 */
var KEYWORDS = ['node', 'edge', 'graph', 'digraph', 'subgraph', 'strict'];

/**
 * Error of a line out of the dialect
 * @param {string} line
 * @returns {Error}
 * @private
 */
function unsupported(line) {
	'use strict';
	return new Error('unsupported DOT line: ' + line);
}

/**
 * Decode a quoted value: \" to " and \\ to \; other characters as they are
 * @param {string} value
 * @returns {string}
 * @private
 */
function decode(value) {
	'use strict';
	return value.replace(/\\(["\\])/g, '$1');
}

/**
 * Parse an attribute list (the text between the brackets), quote-aware:
 * commas and brackets inside quotes neither separate nor end the list
 * @param {string} text
 * @param {string} line the whole line, for the error message
 * @returns {Object} attributes by key, decoded
 * @throws {Error} when the list is not of the dialect
 * @private
 */
function parseAttributes(text, line) {
	'use strict';
	var attrs = {},
		rest = text;
	while (rest.length > 0) {
		var match = ATTRIBUTE.exec(rest);
		if (!match) {
			throw unsupported(line);
		}
		attrs[match[1]] = decode(match[2]);
		rest = rest.slice(match[0].length);
		if (rest.length > 0) {
			if (rest.slice(0, 2) !== ', ') {
				throw unsupported(line);
			}
			rest = rest.slice(2);
		}
	}
	return attrs;
}

/**
 * Read a DOT text of the dujs dialect
 * @param {string} text
 * @returns {{label: (string|null), nodes: Array<{id: string, attrs: Object}>,
 *   edges: Array<{from: string, to: string, attrs: Object}>}} in the order of
 *   appearance, duplicate edges kept
 * @throws {Error} 'unsupported DOT line: …' on any line out of the dialect
 */
function readDot(text) {
	'use strict';
	var graph = {label: null, nodes: [], edges: []};
	String(text).split('\n').forEach(function (line) {
		var match;
		if (line === '' || SKIPPED_LINE.test(line)) {
			return;
		}
		match = LABEL_LINE.exec(line);
		if (match) {
			graph.label = decode(match[1]);
			return;
		}
		match = EDGE_LINE.exec(line);
		if (match) {
			graph.edges.push({from: match[1], to: match[2], attrs: parseAttributes(match[3], line)});
			return;
		}
		match = NODE_LINE.exec(line);
		if (match && KEYWORDS.indexOf(match[1]) === -1) {
			graph.nodes.push({id: match[1], attrs: parseAttributes(match[2], line)});
			return;
		}
		throw unsupported(line);
	});
	return graph;
}

module.exports = {
	readDot: readDot
};
