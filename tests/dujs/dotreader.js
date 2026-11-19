/*
 * Test cases of the reader of the dujs DOT dialect (lib/dujs/dotreader.js,
 * specs/009-mermaid-markdown-output contracts/mermaid-graph.md §1,
 * data-model.md §1, FR-003).
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var dotReader = require('../../lib/dujs/dotreader'),
	hierarchyDot = require('../../lib/dujs/hierarchydot');

/**
 * DOT text of the given lines
 * @param {Array} lines
 * @returns {string}
 */
function dotOf(lines) {
	'use strict';
	return lines.join('\n');
}

describe('dotreader', function () {
	'use strict';

	describe('readDot', function () {
		it('should skip the header, the default node line, the closing brace and empty lines', function () {
			var graph = dotReader.readDot(dotOf(['digraph CFG {', 'node [shape="box"]', '', 'label = ""', '}']));
			graph.should.eql({label: '', nodes: [], edges: []});
		});

		it('should take the label line as the label of the graph', function () {
			var graph = dotReader.readDot(dotOf(['digraph Hierarchy {', 'node [shape="box"]',
				'label = "inter-procedural: $DOMAIN.$PAGE_0.f"', '}']));
			graph.label.should.equal('inter-procedural: $DOMAIN.$PAGE_0.f');
		});

		it('should give a null label without a label line', function () {
			var graph = dotReader.readDot(dotOf(['digraph CFG {', '}']));
			(graph.label === null).should.be.true();
		});

		it('should read node lines with their attributes', function () {
			var graph = dotReader.readDot(dotOf(['digraph CFG {',
				'n71 [label="entry_a", shape="ellipse", fillcolor="yellow"]',
				'n72 [label="2"]',
				'h3 [label="page0"]',
				'_x1 [label="x"]',
				'}']));
			graph.nodes.should.eql([
				{id: 'n71', attrs: {label: 'entry_a', shape: 'ellipse', fillcolor: 'yellow'}},
				{id: 'n72', attrs: {label: '2'}},
				{id: 'h3', attrs: {label: 'page0'}},
				{id: '_x1', attrs: {label: 'x'}}
			]);
		});

		it('should read edge lines with spaces around = and with empty brackets', function () {
			var graph = dotReader.readDot(dotOf(['digraph CFG {',
				'n75 -> n76 [color="blue", label = "call"]',
				'n76 -> n77 []',
				'}']));
			graph.edges.should.eql([
				{from: 'n75', to: 'n76', attrs: {color: 'blue', label: 'call'}},
				{from: 'n76', to: 'n77', attrs: {}}
			]);
		});

		it('should decode \\" and \\\\ in quoted values but keep \\n as it is', function () {
			var graph = dotReader.readDot(dotOf(['digraph CFG {',
				'n1 [label="a \\"b\\" c\\\\d"]',
				'n2 [label="x\\ny"]',
				'}']));
			graph.nodes[0].attrs.label.should.equal('a "b" c\\d');
			graph.nodes[1].attrs.label.should.equal('x\\ny');
		});

		it('should not split at a comma inside quotes (style="bold,dashed")', function () {
			var graph = dotReader.readDot(dotOf(['digraph Hierarchy {',
				'h1 -> h0 [color="blue", style="bold,dashed", label="recursive return"]',
				'}']));
			graph.edges[0].attrs.should.eql({color: 'blue', style: 'bold,dashed', label: 'recursive return'});
		});

		it('should not end the attributes at a ] or split at a , inside a label', function () {
			var graph = dotReader.readDot(dotOf(['digraph CFG {',
				'n1 [label="a[0] = [1, 2]", shape="ellipse"]',
				'n1 -> n2 [label="]"]',
				'}']));
			graph.nodes[0].attrs.should.eql({label: 'a[0] = [1, 2]', shape: 'ellipse'});
			graph.edges[0].attrs.should.eql({label: ']'});
		});

		it('should keep duplicate edges in their order', function () {
			var graph = dotReader.readDot(dotOf(['digraph CFG {',
				'n1 -> n2 [label="true"]',
				'n1 -> n2 [color="red", label="exception"]',
				'n2 -> n3 []',
				'n2 -> n3 []',
				'}']));
			graph.edges.should.eql([
				{from: 'n1', to: 'n2', attrs: {label: 'true'}},
				{from: 'n1', to: 'n2', attrs: {color: 'red', label: 'exception'}},
				{from: 'n2', to: 'n3', attrs: {}},
				{from: 'n2', to: 'n3', attrs: {}}
			]);
		});

		it('should throw on lines out of the dialect', function () {
			['subgraph x {', 'a -- b', 'n1 [label=unquoted]', 'n1 -> n2', 'n1 [label="a"] extra']
				.forEach(function (line) {
					(function () {
						dotReader.readDot(dotOf(['digraph CFG {', line, '}']));
					}).should.throw(/unsupported DOT line/);
				});
		});

		it('should throw on a node line whose id is a DOT keyword', function () {
			['graph [label="x"]', 'edge [color="red"]', 'node [label="a"]', 'digraph [label="x"]',
				'subgraph [label="x"]', 'strict [label="x"]'].forEach(function (line) {
				(function () {
					dotReader.readDot(dotOf(['digraph CFG {', line, '}']));
				}).should.throw('unsupported DOT line: ' + line);
			});
		});

		it('should throw on attributes not separated by a comma and a space', function () {
			// The attribute list n1 [...] must be `key="value", key="value"`;
			// a missing separator or a lone comma is out of the dialect.
			['n1 [label="a" shape="box"]', 'n1 [label="a",shape="box"]', 'n1 [label="a";shape="box"]',
				'n1 -> n2 [label="a"color="red"]'].forEach(function (line) {
				(function () {
					dotReader.readDot(dotOf(['digraph CFG {', line, '}']));
				}).should.throw('unsupported DOT line: ' + line);
			});
		});

		it('should throw on a label with a real newline', function () {
			(function () {
				dotReader.readDot(dotOf(['digraph CFG {', 'n1 [label="a', 'b"]', '}']));
			}).should.throw(/unsupported DOT line/);
		});

		it('should read back a hierarchy label escaped by hierarchydot.escapeLabel', function () {
			var text = 'f "quoted" \\ back\\slash \\"';
			var graph = dotReader.readDot(dotOf(['digraph Hierarchy {',
				'label = "' + hierarchyDot.escapeLabel(text) + '"',
				'h0 [label="' + hierarchyDot.escapeLabel(text) + '"]',
				'}']));
			graph.label.should.equal(text);
			graph.nodes[0].attrs.label.should.equal(text);
		});
	});
});
