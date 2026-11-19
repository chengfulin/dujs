/*
 * Test cases of the conversion of a DOT graph to a Mermaid flowchart
 * (lib/dujs/mermaidgraph.js, specs/009-mermaid-markdown-output
 * contracts/mermaid-graph.md §2, §3, data-model.md §2; FR-002, FR-003,
 * FR-004, FR-006, FR-009, FR-010, SC-003):
 * 1. the text format;
 * 2. the official Mermaid parser (tests/helpers/mermaid.js) as the oracle;
 * 3. the fallback to tables over the limits of Mermaid.
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var fs = require('fs'),
	path = require('path');
var mermaidGraph = require('../../lib/dujs/mermaidgraph'),
	mermaid = require('../helpers/mermaid');

/**
 * Node of a graph
 * @param {string} id
 * @param {Object} attrs
 * @returns {Object}
 */
function node(id, attrs) {
	'use strict';
	return {id: id, attrs: attrs};
}

/**
 * Edge of a graph
 * @param {string} from
 * @param {string} to
 * @param {Object} [attrs]
 * @returns {Object}
 */
function edge(from, to, attrs) {
	'use strict';
	return {from: from, to: to, attrs: attrs || {}};
}

/**
 * Graph of nodes and edges
 * @param {Array} nodes
 * @param {Array} [edges]
 * @returns {Object}
 */
function graphOf(nodes, edges) {
	'use strict';
	return {label: '', nodes: nodes, edges: edges || []};
}

/**
 * Graph with all three shapes and all five edge styles with colors
 * @returns {Object}
 */
function fullGraph() {
	'use strict';
	return graphOf([
		node('n0', {label: 'entry', shape: 'ellipse', style: 'filled', fillcolor: 'yellow'}),
		node('n1', {label: '2'}),
		node('n2', {label: 'localStorage', shape: 'doublecircle', style: 'filled', fillcolor: 'orange'}),
		node('n3', {label: 'exit', shape: 'ellipse', style: 'filled', fillcolor: 'yellow'})
	], [
		edge('n2', 'n0', {style: 'dotted'}),
		edge('n0', 'n1'),
		edge('n1', 'n3', {color: 'red', label: 'exception'}),
		edge('n1', 'n3', {color: 'blue', label: 'call'}),
		edge('n3', 'n1', {color: 'blue', style: 'dashed', label: 'return'}),
		edge('n1', 'n0', {color: 'blue', style: 'bold', label: 'recursive call'}),
		edge('n0', 'n1', {color: 'blue', style: 'bold,dashed', label: 'recursive return'}),
		edge('n0', 'n3', {color: 'green', label: 'onEvent'}),
		edge('n3', 'n2', {style: 'dotted', label: 'saveStorage'}),
		edge('n1', 'n3', {color: 'red', label: 'exception'})
	]);
}

/**
 * Mermaid text of a graph with one node of a label
 * @param {string} label
 * @returns {string} the quoted label of the node line
 */
function quotedLabel(label) {
	'use strict';
	var text = mermaidGraph.toMermaid(graphOf([node('n0', {label: label})]));
	return text.split('\n')[1].replace(/^ {2}n0\[/, '').replace(/\]$/, '');
}

/**
 * Graph of two nodes and a number of unlabeled edges between them
 * @param {number} count
 * @returns {Object}
 */
function graphOfEdges(count) {
	'use strict';
	var edges = [];
	for (var i = 0; i < count; ++i) {
		edges.push(edge('n0', 'n1'));
	}
	return graphOf([node('n0', {label: 'a'}), node('n1', {label: 'b'})], edges);
}

/**
 * Graph of one node whose label makes the Mermaid text of exactly a size
 * @param {number} size
 * @returns {Object}
 */
function graphOfSize(size) {
	'use strict';
	var base = mermaidGraph.toMermaid(graphOf([node('n0', {label: 'x'})])).length - 1;
	return graphOf([node('n0', {label: new Array(size - base + 1).join('x')})]);
}

var SPECIAL_LABELS = [
	'"', '&', '[', ']', '{', '}', '(', ')', '|', '#', '<', '>', ';', '`',
	'a\nb', ' lead', 'trail ', '  both  ', ':', '%', '$DOMAIN.$PAGE_0.f',
	'a["b"] {c} (d) |e| #f; <g> `h` & i',
	'style:#x', 'classDef x:#1', '%%{init: {}}%%', 'a\rb', '$$a$$', '$$$', '#35;', '<br/>',
	'a.style:#b;c', 'end', 'x --> y'
];

describe('mermaidgraph', function () {
	'use strict';

	describe('toMermaid: text format', function () {
		it('should write all shapes, edge styles, classDef, class and linkStyle lines', function () {
			mermaidGraph.toMermaid(fullGraph()).should.equal([
				'flowchart TD',
				'  n0(["entry"])',
				'  n1["2"]',
				'  n2((("localStorage")))',
				'  n3(["exit"])',
				'  n2 -.-> n0',
				'  n0 --> n1',
				'  n1 -->|"exception"| n3',
				'  n1 -->|"call"| n3',
				'  n3 -.->|"return"| n1',
				'  n1 ==>|"recursive call"| n0',
				'  n0 -.->|"recursive return"| n1',
				'  n0 -->|"onEvent"| n3',
				'  n3 -.->|"saveStorage"| n2',
				'  n1 -->|"exception"| n3',
				'  classDef ellipse fill:#ffff00,stroke:#333,color:#000',
				'  classDef storage fill:#ffa500,stroke:#333,color:#000',
				'  class n0,n3 ellipse',
				'  class n2 storage',
				'  linkStyle 0,8 stroke-dasharray:2 2',
				'  linkStyle 2,9 stroke:red',
				'  linkStyle 3,4,5 stroke:blue',
				'  linkStyle 6 stroke:blue,stroke-width:3px',
				'  linkStyle 7 stroke:green'
			].join('\n'));
		});

		it('should write classDef and class lines only for the classes used', function () {
			mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a'}), node('n1', {label: 'b'})],
				[edge('n0', 'n1')])).should.equal('flowchart TD\n  n0["a"]\n  n1["b"]\n  n0 --> n1');
			mermaidGraph.toMermaid(graphOf([node('h0', {label: 'loop', shape: 'ellipse'})])).should.equal(
				'flowchart TD\n  h0(["loop"])\n' +
				'  classDef ellipse fill:#ffff00,stroke:#333,color:#000\n  class h0 ellipse');
			mermaidGraph.toMermaid(graphOf([node('h0', {label: '$DOMAIN', shape: 'doublecircle'})])).should.equal(
				'flowchart TD\n  h0((("$DOMAIN")))\n' +
				'  classDef storage fill:#ffa500,stroke:#333,color:#000\n  class h0 storage');
		});

		it('should write a graph without nodes as the header line only', function () {
			mermaidGraph.toMermaid(graphOf([])).should.equal('flowchart TD');
		});

		it('should throw on an unknown shape', function () {
			(function () {
				mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a', shape: 'plaintext'})]));
			}).should.throw();
		});

		it('should throw on a node with shape="box" written out', function () {
			(function () {
				mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a', shape: 'box'})]));
			}).should.throw('Unknown shape of the DOT node n0: box');
		});

		it('should throw on an unknown edge style', function () {
			(function () {
				mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a'})], [edge('n0', 'n0', {style: 'invis'})]));
			}).should.throw();
		});

		it('should throw on an unknown edge color', function () {
			(function () {
				mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a'})], [edge('n0', 'n0', {color: 'purple'})]));
			}).should.throw();
		});

		it('should ignore style and fillcolor of nodes', function () {
			mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a', style: 'dotted', fillcolor: 'purple'})]))
				.should.equal('flowchart TD\n  n0["a"]');
		});

		it('should escape each special character of a label', function () {
			var expected = {
				'#': '"#35;"',
				'"': '"#34;"',
				'&': '"#38;"',
				'<': '"#60;"',
				'>': '"#62;"',
				'`': '"#96;"',
				':': '"#58;"',
				'%': '"#37;"',
				'a\rb': '"a#13;b"',
				'a"#b': '"a#34;#35;b"',
				'$$a$$': '"$#36;a$#36;"',
				'$$$': '"$#36;#36;"',
				'$a $b': '"$a $b"',
				'a\nb': '"a<br/>b"',
				' a ': '"#32;a#32;"',
				'\ta\t ': '"#9;a#9;#32;"',
				'': '" "',
				'[ ] { } ( ) | ;': '"[ ] { } ( ) | ;"'
			};
			Object.keys(expected).forEach(function (label) {
				quotedLabel(label).should.equal(expected[label], JSON.stringify(label));
			});
		});

		it('should escape edge labels the same way', function () {
			mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a'})], [edge('n0', 'n0', {label: '#:"'})]))
				.split('\n')[2].should.equal('  n0 -->|"#35;#58;#34;"| n0');
		});

		it('should never write a backquote', function () {
			var text = mermaidGraph.toMermaid(graphOf(SPECIAL_LABELS.map(function (label, i) {
				return node('n' + i, {label: label});
			}), [edge('n0', 'n1', {label: '```'})]));
			text.should.not.containEql('`');
		});

		it('should give the same text for the same graph', function () {
			mermaidGraph.toMermaid(fullGraph()).should.equal(mermaidGraph.toMermaid(fullGraph()));
		});
	});

	describe('toMermaid: official parser', function () {
		before(function () {
			this.timeout(30000);
			return mermaid.load();
		});

		it('should be parsed with all shapes, edge styles, classDef and linkStyle', function () {
			return mermaid.parse(mermaidGraph.toMermaid(fullGraph()));
		});

		it('should be parsed without edges and with one node', function () {
			return Promise.all([
				mermaid.parse(mermaidGraph.toMermaid(graphOf([node('n0', {label: 'a'}), node('n1', {label: 'b'})]))),
				mermaid.parse(mermaidGraph.toMermaid(graphOf([node('n0', {label: 'entry', shape: 'ellipse'})])))
			]);
		});

		it('should keep the shapes of the nodes', function () {
			return mermaid.diagramOf(mermaidGraph.toMermaid(fullGraph())).then(function (diagram) {
				diagram.vertices.map(function (vertex) {
					return vertex.id + ':' + vertex.type;
				}).should.eql(['n0:stadium', 'n1:square', 'n2:doublecircle', 'n3:stadium']);
			});
		});

		it('should keep duplicate edges in their order', function () {
			var graph = graphOf([node('n0', {label: 'a'}), node('n1', {label: 'b'})], [
				edge('n0', 'n1', {label: 'true'}),
				edge('n0', 'n1', {color: 'red', label: 'exception'}),
				edge('n0', 'n1'),
				edge('n0', 'n1')
			]);
			return mermaid.diagramOf(mermaidGraph.toMermaid(graph)).then(function (diagram) {
				diagram.edges.should.eql([
					{from: 'n0', to: 'n1', label: 'true'},
					{from: 'n0', to: 'n1', label: 'exception'},
					{from: 'n0', to: 'n1', label: ''},
					{from: 'n0', to: 'n1', label: ''}
				]);
			});
		});

		it('should give back the original node and edge labels after decoding', function () {
			var graph = graphOf(SPECIAL_LABELS.map(function (label, i) {
				return node('n' + i, {label: label});
			}), SPECIAL_LABELS.map(function (label, i) {
				return edge('n' + i, 'n' + ((i + 1) % SPECIAL_LABELS.length), {label: label});
			}));
			return mermaid.diagramOf(mermaidGraph.toMermaid(graph)).then(function (diagram) {
				diagram.vertices.map(function (vertex) {
					return vertex.label;
				}).should.eql(SPECIAL_LABELS);
				diagram.edges.map(function (e) {
					return e.label;
				}).should.eql(SPECIAL_LABELS);
			});
		});

		it('should give back an empty label as an empty string', function () {
			var graph = graphOf([node('n0', {label: ''}), node('n1', {label: 'b'})],
				[edge('n0', 'n1', {label: ''})]);
			return mermaid.diagramOf(mermaidGraph.toMermaid(graph)).then(function (diagram) {
				diagram.vertices[0].label.should.equal('');
				diagram.edges[0].label.should.equal('');
			});
		});
	});

	describe('renderGraph: fallback to tables', function () {
		before(function () {
			this.timeout(30000);
			return mermaid.load();
		});

		it('should export the limits of Mermaid', function () {
			mermaidGraph.MAX_EDGES.should.equal(500);
			mermaidGraph.MAX_TEXT_SIZE.should.equal(50000);
		});

		it('should not require mermaid', function () {
			var source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'dujs', 'mermaidgraph.js'), 'utf8');
			source.should.not.match(/require\(\s*['"]mermaid['"]\s*\)/);
			source.should.not.match(/import\(\s*['"]mermaid['"]\s*\)/);
			source.should.not.match(/esgraph\/dot/);
		});

		it('should render a fenced Mermaid block below the limits', function () {
			var graph = fullGraph(),
				text = mermaidGraph.toMermaid(graph),
				rendering = mermaidGraph.renderGraph(graph, '3.graph.dot');
			rendering.should.eql({
				mermaid: text,
				edgeCount: 10,
				textSize: text.length,
				degraded: false,
				markdown: '```mermaid\n' + text + '\n```'
			});
		});

		it('should not fall back at 500 edges, and the block should be parsed', function () {
			var rendering = mermaidGraph.renderGraph(graphOfEdges(500), '0.graph.dot');
			rendering.edgeCount.should.equal(500);
			rendering.degraded.should.be.false();
			return mermaid.parse(rendering.mermaid);
		});

		it('should fall back at 501 edges', function () {
			var rendering = mermaidGraph.renderGraph(graphOfEdges(501), '0.graph.dot');
			rendering.edgeCount.should.equal(501);
			rendering.degraded.should.be.true();
			rendering.markdown.should.not.containEql('```mermaid');
		});

		it('should not fall back at exactly 50000 characters', function () {
			var rendering = mermaidGraph.renderGraph(graphOfSize(50000), '0.graph.dot');
			rendering.textSize.should.equal(50000);
			rendering.degraded.should.be.false();
		});

		it('should fall back at exactly 50001 characters', function () {
			var rendering = mermaidGraph.renderGraph(graphOfSize(50001), '0.graph.dot');
			rendering.textSize.should.equal(50001);
			rendering.degraded.should.be.true();
		});

		it('should write the notice, the node table and the edge table when falling back', function () {
			var graph = graphOfEdges(501);
			graph.nodes = [node('n0', {label: 'entry', shape: 'ellipse'}), node('n1', {label: 'a | `b`'})];
			graph.edges[0] = edge('n0', 'n1', {color: 'red', label: 'exception'});
			graph.edges[1] = edge('n1', 'n0', {label: 'x\ny'});
			var rendering = mermaidGraph.renderGraph(graph, '7.hierarchy.dot'),
				lines = [
					'> This graph has 501 edges and ' + rendering.textSize + ' characters in Mermaid, over the ' +
					'limits of Mermaid (500 edges, 50000 characters); it is shown as tables. See ' +
					'[`7.hierarchy.dot`](7.hierarchy.dot) for the graph.',
					'',
					'| Node | Label |',
					'| --- | --- |',
					'| `n0` | `entry` |',
					'| `n1` | `` a \\| `b` `` |',
					'',
					'| From | To | Label |',
					'| --- | --- | --- |',
					'| `n0` | `n1` | `exception` |',
					'| `n1` | `n0` | `x`<br/>`y` |'
				];
			for (var i = 2; i < 501; ++i) {
				lines.push('| `n0` | `n1` |  |');
			}
			rendering.degraded.should.be.true();
			rendering.mermaid.should.equal(mermaidGraph.toMermaid(graph));
			rendering.markdown.should.equal(lines.join('\n'));
		});

		it('should name the graph DOT file in the notice', function () {
			mermaidGraph.renderGraph(graphOfEdges(501), '12.graph.dot').markdown.split('\n')[0]
				.should.containEql('See [`12.graph.dot`](12.graph.dot) for the graph.');
		});
	});
});
