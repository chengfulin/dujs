/*
 * Conversion of a DOT graph read by dotreader (flat graph or hierarchy) to a
 * Mermaid flowchart, with the fallback to a node table and an edge table over
 * the limits of Mermaid (specs/009-mermaid-markdown-output,
 * contracts/mermaid-graph.md §2, §3, data-model.md §2).
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var markdownText = require('./markdowntext'),
	cell = markdownText.cell,
	rowOf = markdownText.rowOf;

/**
 * Most edges of a graph shown in Mermaid (maxEdges of Mermaid)
 * @type {number}
 */
var MAX_EDGES = 500;

/**
 * Most characters of a Mermaid text (maxTextSize of Mermaid)
 * @type {number}
 */
var MAX_TEXT_SIZE = 50000;

/**
 * Node shapes by the DOT shape attribute: opening and closing of the label,
 * and the class
 * @type {Object}
 * @private
 */
var SHAPES = {
	box: {open: '[', close: ']', className: null},
	ellipse: {open: '([', close: '])', className: 'ellipse'},
	doublecircle: {open: '(((', close: ')))', className: 'storage'}
};

/**
 * Class definitions in the order written
 * @type {Array}
 * @private
 */
var CLASS_DEFS = [
	{className: 'ellipse', definition: 'fill:#ffff00,stroke:#333,color:#000'},
	{className: 'storage', definition: 'fill:#ffa500,stroke:#333,color:#000'}
];

/**
 * Arrows and extra link styles by the DOT edge style ('' for no style)
 * @type {Object}
 * @private
 */
var EDGE_STYLES = {
	'': {arrow: '-->', linkStyle: null},
	dotted: {arrow: '-.->', linkStyle: 'stroke-dasharray:2 2'},
	dashed: {arrow: '-.->', linkStyle: null},
	bold: {arrow: '==>', linkStyle: null},
	'bold,dashed': {arrow: '-.->', linkStyle: 'stroke-width:3px'}
};

/**
 * DOT edge colors allowed
 * @type {Array}
 * @private
 */
var EDGE_COLORS = ['red', 'blue', 'green'];

/**
 * Replacements of characters of a label, in order (`#` first)
 * @type {Array}
 * @private
 */
var REPLACEMENTS = [
	[/#/g, '#35;'],
	[/"/g, '#34;'],
	[/&/g, '#38;'],
	[/</g, '#60;'],
	[/>/g, '#62;'],
	[/`/g, '#96;'],
	[/:/g, '#58;'],
	[/%/g, '#37;'],
	[/\r/g, '#13;']
];

/**
 * Own property of an object, or undefined
 * @param {Object} object
 * @param {string} key
 * @returns {*}
 * @private
 */
function own(object, key) {
	'use strict';
	return Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
}

/**
 * Entities of the characters of a string
 * @param {string} s
 * @returns {string}
 * @private
 */
function entitiesOf(s) {
	'use strict';
	return s.split('').map(function (c) {
		return '#' + c.charCodeAt(0) + ';';
	}).join('');
}

/**
 * Quote a label for Mermaid (contracts/mermaid-graph.md §2.3)
 * @param {string} text
 * @returns {string} quoted label
 * @private
 */
function quote(text) {
	'use strict';
	var s = String(text);
	REPLACEMENTS.forEach(function (replacement) {
		s = s.replace(replacement[0], replacement[1]);
	});
	s = s.replace(/\$/g, function (match, offset, whole) {
		return whole.charAt(offset - 1) === '$' ? '#36;' : match;
	});
	s = s.replace(/\n/g, '<br/>');
	s = s.replace(/^\s+/, entitiesOf).replace(/\s+$/, entitiesOf);
	return '"' + (s === '' ? ' ' : s) + '"';
}

/**
 * Label attribute of a node or an edge ('' when absent)
 * @param {Object} attrs
 * @returns {string}
 * @private
 */
function labelOf(attrs) {
	'use strict';
	var label = own(attrs, 'label');
	return label === undefined ? '' : label;
}

/**
 * Shape of a node
 * @param {Object} node
 * @returns {Object}
 * @throws {Error} on an unknown shape
 * @private
 */
function shapeOf(node) {
	'use strict';
	var shape = own(node.attrs, 'shape');
	if (shape === undefined) {
		return SHAPES.box;
	}
	if (shape === 'box' || !own(SHAPES, shape)) {
		throw new Error('Unknown shape of the DOT node ' + node.id + ': ' + shape);
	}
	return SHAPES[shape];
}

/**
 * Arrow and link style of an edge
 * @param {Object} edge
 * @param {number} index
 * @returns {{arrow: string, linkStyle: string}} linkStyle '' when none
 * @throws {Error} on an unknown style or color
 * @private
 */
function edgeStyleOf(edge, index) {
	'use strict';
	var style = own(edge.attrs, 'style'),
		color = own(edge.attrs, 'color'),
		edgeStyle = own(EDGE_STYLES, style === undefined ? '' : style),
		pieces = [];
	if (!edgeStyle || style === '') {
		throw new Error('Unknown style of the DOT edge ' + index + ': ' + style);
	}
	if (color !== undefined) {
		if (EDGE_COLORS.indexOf(color) === -1) {
			throw new Error('Unknown color of the DOT edge ' + index + ': ' + color);
		}
		pieces.push('stroke:' + color);
	}
	if (edgeStyle.linkStyle) {
		pieces.push(edgeStyle.linkStyle);
	}
	return {arrow: edgeStyle.arrow, linkStyle: pieces.join(',')};
}

/**
 * Convert a DOT graph to the text of a Mermaid flowchart
 * @param {{nodes: Array, edges: Array}} graph result of dotreader.readDot
 * @returns {string} Mermaid text (without fences and without a newline at the end)
 * @throws {Error} on an unknown node shape, edge style or edge color
 */
function toMermaid(graph) {
	'use strict';
	var lines = ['flowchart TD'],
		classMembers = {},
		linkStyles = [],
		linkStyleIndices = {};
	graph.nodes.forEach(function (node) {
		var shape = shapeOf(node);
		lines.push('  ' + node.id + shape.open + quote(labelOf(node.attrs)) + shape.close);
		if (shape.className) {
			classMembers[shape.className] = (classMembers[shape.className] || []).concat([node.id]);
		}
	});
	graph.edges.forEach(function (edge, index) {
		var edgeStyle = edgeStyleOf(edge, index),
			label = own(edge.attrs, 'label');
		lines.push('  ' + edge.from + ' ' + edgeStyle.arrow +
			(label === undefined ? '' : '|' + quote(label) + '|') + ' ' + edge.to);
		if (edgeStyle.linkStyle) {
			if (!own(linkStyleIndices, edgeStyle.linkStyle)) {
				linkStyleIndices[edgeStyle.linkStyle] = [];
				linkStyles.push(edgeStyle.linkStyle);
			}
			linkStyleIndices[edgeStyle.linkStyle].push(index);
		}
	});
	CLASS_DEFS.forEach(function (classDef) {
		if (own(classMembers, classDef.className)) {
			lines.push('  classDef ' + classDef.className + ' ' + classDef.definition);
		}
	});
	CLASS_DEFS.forEach(function (classDef) {
		if (own(classMembers, classDef.className)) {
			lines.push('  class ' + classMembers[classDef.className].join(',') + ' ' + classDef.className);
		}
	});
	linkStyles.forEach(function (linkStyle) {
		lines.push('  linkStyle ' + linkStyleIndices[linkStyle].join(',') + ' ' + linkStyle);
	});
	return lines.join('\n');
}

/**
 * Notice, node table and edge table of a graph over the limits
 * @param {Object} graph
 * @param {number} edgeCount
 * @param {number} textSize
 * @param {string} dotFileName
 * @returns {string}
 * @private
 */
function tablesOf(graph, edgeCount, textSize, dotFileName) {
	'use strict';
	var lines = [
		'> This graph has ' + edgeCount + ' edges and ' + textSize + ' characters in Mermaid, over the limits ' +
		'of Mermaid (' + MAX_EDGES + ' edges, ' + MAX_TEXT_SIZE + ' characters); it is shown as tables. ' +
		'See [' + markdownText.codeSpan(dotFileName) + '](' + dotFileName + ') for the graph.',
		'',
		rowOf(['Node', 'Label']),
		rowOf(['---', '---'])
	];
	graph.nodes.forEach(function (node) {
		lines.push(rowOf([cell([node.id]), cell([labelOf(node.attrs)])]));
	});
	lines.push('', rowOf(['From', 'To', 'Label']), rowOf(['---', '---', '---']));
	graph.edges.forEach(function (edge) {
		lines.push(rowOf([cell([edge.from]), cell([edge.to]), cell([labelOf(edge.attrs)])]));
	});
	return lines.join('\n');
}

/**
 * Render a DOT graph as Markdown: a ```mermaid block, or tables over the
 * limits of Mermaid (contracts/mermaid-graph.md §3)
 * @param {Object} graph result of dotreader.readDot
 * @param {string} dotFileName file name of the DOT graph (<n>.graph.dot or <n>.hierarchy.dot)
 * @returns {{mermaid: string, edgeCount: number, textSize: number, degraded: boolean, markdown: string}}
 *   markdown without a newline at the end
 */
function renderGraph(graph, dotFileName) {
	'use strict';
	var mermaid = toMermaid(graph),
		edgeCount = graph.edges.length,
		textSize = mermaid.length,
		degraded = edgeCount > MAX_EDGES || textSize > MAX_TEXT_SIZE;
	return {
		mermaid: mermaid,
		edgeCount: edgeCount,
		textSize: textSize,
		degraded: degraded,
		markdown: degraded ? tablesOf(graph, edgeCount, textSize, dotFileName) :
			'```mermaid\n' + mermaid + '\n```'
	};
}

module.exports = {
	MAX_EDGES: MAX_EDGES,
	MAX_TEXT_SIZE: MAX_TEXT_SIZE,
	toMermaid: toMermaid,
	renderGraph: renderGraph
};
