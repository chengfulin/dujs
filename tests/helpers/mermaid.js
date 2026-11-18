/*
 * Test helper: the official Mermaid parser (devDependency mermaid@12.3.0) as
 * the oracle for the Mermaid blocks dujs writes
 * (specs/009-mermaid-markdown-output, FR-009, contracts/mermaid-graph.md §2.3).
 *
 * mermaid is an ES module that needs a DOM (DOMPurify binds to `window` when
 * the module is evaluated). load() therefore sets jsdom globals, imports
 * mermaid, initializes it and restores the globals right away (D005-A1);
 * parse() and diagramOf() work without any DOM global afterwards. The only
 * global left behind is mermaid's own `injected` (mocha does not run with
 * --check-leaks). Nothing may import mermaid outside load().
 *
 * Usage in a describe block (loading takes about 2.5 s):
 *   before(function () {
 *     this.timeout(30000);
 *     return mermaid.load();
 *   });
 */
var JSDOM_GLOBALS = ['window', 'document'];

var NAMED_ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: '\'',
	nbsp: ' '
};

var loading = null;

function setGlobals(dom) {
	'use strict';
	var saved = JSDOM_GLOBALS.map(function (key) {
		return {
			key: key,
			descriptor: Object.getOwnPropertyDescriptor(global, key)
		};
	});
	global.window = dom.window;
	global.document = dom.window.document;
	return saved;
}

function restoreGlobals(saved) {
	'use strict';
	saved.forEach(function (entry) {
		if (entry.descriptor) {
			Object.defineProperty(global, entry.key, entry.descriptor);
		} else {
			delete global[entry.key];
		}
	});
}

/**
 * Load and initialize mermaid once (cached).
 * @returns {Promise<Object>} the mermaid API object
 */
function load() {
	'use strict';
	if (!loading) {
		loading = Promise.resolve().then(function () {
			var JSDOM = require('jsdom').JSDOM;
			var saved = setGlobals(new JSDOM(''));
			return import('mermaid').then(function (module) {
				var mermaid = module.default;
				mermaid.initialize({startOnLoad: false});
				return mermaid;
			}).finally(function () {
				restoreGlobals(saved);
			});
		});
	}
	return loading;
}

/**
 * Decode the placeholders mermaid leaves in vertex and edge text:
 * `ﬂ°°<code>¶ß` (numeric entity), `ﬂ°<name>¶ß` (named entity), `<br>` (line
 * break). `<br>` is replaced first so that an entity-encoded `<` never turns
 * into a line break.
 * @param {string} s
 * @returns {string}
 */
function decode(s) {
	'use strict';
	return String(s)
		.replace(/<br\s*\/?>/g, '\n')
		.replace(/ﬂ°°(\d+)¶ß/g, function (ignoredMatch, code) {
			return String.fromCharCode(parseInt(code, 10));
		})
		.replace(/ﬂ°(\w+)¶ß/g, function (match, name) {
			if (!Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name)) {
				throw new Error('tests/helpers/mermaid.js: unknown entity ' + match);
			}
			return NAMED_ENTITIES[name];
		});
}

/**
 * Parse a Mermaid text with the official parser.
 * @param {string} text
 * @returns {Promise} resolves on success; rejects on a syntax error or when
 *   the diagram exceeds maxEdges (500)
 */
function parse(text) {
	'use strict';
	return load().then(function (mermaid) {
		return mermaid.parse(text);
	});
}

/**
 * Parse a flowchart and return its vertices and edges in mermaid's order
 * (duplicate edges kept), with text decoded.
 * @param {string} text
 * @returns {Promise<{vertices: Array<{id: string, label: string, type: string}>,
 *   edges: Array<{from: string, to: string, label: string}>}>}
 */
function diagramOf(text) {
	'use strict';
	return load().then(function (mermaid) {
		return mermaid.mermaidAPI.getDiagramFromText(text);
	}).then(function (diagram) {
		var vertices = [];
		diagram.db.getVertices().forEach(function (vertex) {
			vertices.push({
				id: vertex.id,
				label: decode(vertex.text === undefined ? '' : vertex.text),
				type: vertex.type
			});
		});
		var edges = diagram.db.getEdges().map(function (edge) {
			return {
				from: edge.start,
				to: edge.end,
				label: decode(edge.text === undefined ? '' : edge.text)
			};
		});
		return {vertices: vertices, edges: edges};
	});
}

/**
 * Shape names of the facts, by the vertex type of mermaid
 * @type {Object}
 */
var SHAPE_OF_VERTEX_TYPE = {
	square: 'box',
	stadium: 'ellipse',
	doublecircle: 'doublecircle'
};

/**
 * Facts of a graph: the multisets of nodes and edges as sorted keys and the
 * number of nodes of each shape
 * @param {Array} nodes {id, label, shape}
 * @param {Array} edges {from, to, label}
 * @returns {{nodes: Array<string>, edges: Array<string>, shapes: Object}}
 */
function factsOf(nodes, edges) {
	'use strict';
	var shapes = {box: 0, ellipse: 0, doublecircle: 0};
	nodes.forEach(function (node) {
		shapes[node.shape] = (shapes[node.shape] || 0) + 1;
	});
	return {
		nodes: nodes.map(function (node) {
			return JSON.stringify([node.id, node.label]);
		}).sort(),
		edges: edges.map(function (edge) {
			return JSON.stringify([edge.from, edge.to, edge.label]);
		}).sort(),
		shapes: shapes
	};
}

/**
 * Value of a quoted DOT attribute in an attribute list, decoded (\" and \\)
 * @param {string} attrs
 * @param {string} key
 * @returns {string|undefined}
 */
function dotAttributeOf(attrs, key) {
	'use strict';
	var match = new RegExp('(?:^|, )' + key + ' ?= ?"((?:[^"\\\\]|\\\\.)*)"').exec(attrs);
	return match ? match[1].replace(/\\(["\\])/g, '$1') : undefined;
}

/**
 * Facts of a DOT graph written by dujs, read by simple regular expressions
 * independent of lib/dujs/dotreader.js (plan「測試策略」, SC-003). The
 * default node line `node [shape="box"]` is not a node (D005-A9).
 * @param {string} dotText
 * @returns {{nodes: Array<string>, edges: Array<string>, shapes: Object}}
 */
function dotFactsOf(dotText) {
	'use strict';
	var nodes = [],
		edges = [];
	dotText.split('\n').forEach(function (line) {
		var edgeMatch = /^(\w+) -> (\w+) \[(.*)\]$/.exec(line),
			nodeMatch = /^(\w+) \[(.*)\]$/.exec(line);
		if (edgeMatch) {
			edges.push({
				from: edgeMatch[1],
				to: edgeMatch[2],
				label: dotAttributeOf(edgeMatch[3], 'label') || ''
			});
		} else if (nodeMatch && nodeMatch[1] !== 'node') {
			nodes.push({
				id: nodeMatch[1],
				label: dotAttributeOf(nodeMatch[2], 'label') || '',
				shape: dotAttributeOf(nodeMatch[2], 'shape') || 'box'
			});
		}
	});
	return factsOf(nodes, edges);
}

/**
 * Facts of a Mermaid flowchart by the official parser (shapes by the vertex
 * type: square, stadium and doublecircle as box, ellipse and doublecircle)
 * @param {string} text
 * @returns {Promise<{nodes: Array<string>, edges: Array<string>, shapes: Object}>}
 */
function mermaidFactsOf(text) {
	'use strict';
	return diagramOf(text).then(function (diagram) {
		return factsOf(diagram.vertices.map(function (vertex) {
			return {
				id: vertex.id,
				label: vertex.label,
				shape: SHAPE_OF_VERTEX_TYPE[vertex.type] || vertex.type
			};
		}), diagram.edges);
	});
}

/**
 * Texts of all ```mermaid blocks of a Markdown text (without the fences)
 * @param {string} markdown
 * @returns {Array<string>}
 */
function mermaidBlocksOf(markdown) {
	'use strict';
	var blocks = [],
		pattern = /^```mermaid\n([\s\S]*?)\n```$/gm,
		match = pattern.exec(markdown);
	while (match) {
		blocks.push(match[1]);
		match = pattern.exec(markdown);
	}
	return blocks;
}

module.exports = {
	load: load,
	parse: parse,
	diagramOf: diagramOf,
	decode: decode,
	dotFactsOf: dotFactsOf,
	mermaidFactsOf: mermaidFactsOf,
	mermaidBlocksOf: mermaidBlocksOf
};
