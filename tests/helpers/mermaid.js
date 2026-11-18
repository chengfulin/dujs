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

module.exports = {
	load: load,
	parse: parse,
	diagramOf: diagramOf,
	decode: decode
};
