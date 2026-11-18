/*
 * Test cases of the Markdown file of a model (lib/dujs/markdownoutput.js,
 * specs/009-mermaid-markdown-output contracts/model-markdown.md; FR-001,
 * FR-005, FR-007, FR-010): the title of each level, the order of the
 * sections, the def-use pairs table and the fallback to tables of one graph
 * of a file; the overview README.md (contracts/overview-readme.md; FR-011,
 * A2).
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var fs = require('fs'),
	path = require('path');
var analyze = require('../helpers/analyze'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	Model = require('../../lib/dujs/model'),
	graphics = require('../../lib/dujs/graphics'),
	hierarchyDot = require('../../lib/dujs/hierarchydot'),
	dotReader = require('../../lib/dujs/dotreader'),
	mermaidGraph = require('../../lib/dujs/mermaidgraph'),
	markdownText = require('../../lib/dujs/markdowntext'),
	markdownOutput = require('../../lib/dujs/markdownoutput');

var SOURCE = [
	'var s = 0;',
	'function add(a) {',
	'  if (a) {',
	'    s = s + a;',
	'  }',
	'  return s;',
	'}',
	'function sumAll() {',
	'  add(1);',
	'  add(2);',
	'}',
	'sumAll();'
].join('\n');

/**
 * Models of the analyzed page
 * @returns {Object} PageModels
 */
function pageModels() {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0]);
}

/**
 * Model of a page whose main scope is named
 * @param {Array} models
 * @param {string} scopeName
 * @returns {Model}
 */
function modelOfScope(models, scopeName) {
	'use strict';
	return models.filter(function (model) {
		return String(model.mainlyRelatedScope) === scopeName;
	})[0];
}

/**
 * Key of a Map of def-use pairs standing for a variable
 * @param {string} name
 * @returns {Object}
 */
function variable(name) {
	'use strict';
	return {
		toString: function () {
			return name;
		}
	};
}

/**
 * DOT text of a graph of two nodes and a number of unlabeled edges
 * @param {number} count
 * @returns {string}
 */
function dotOfEdges(count) {
	'use strict';
	var lines = ['digraph Hierarchy {', 'node [shape="box"]', 'label = "inter-page"',
		'h0 [label="$DOMAIN.$PAGE_0"]', 'h1 [label="$DOMAIN.$PAGE_0.f"]'];
	for (var i = 0; i < count; ++i) {
		lines.push('h0 -> h1 [color="blue", label="call"]');
	}
	return lines.concat(['}']).join('\n');
}

/**
 * Paragraph after the heading of the overview (contracts/overview-readme.md §2)
 * @type {string}
 */
var OVERVIEW_INTRODUCTION = 'Each model is a Markdown file with its graphs in Mermaid; the `.dot` files next to it ' +
	'are the same graphs. View the files with a Markdown viewer that renders Mermaid (for example GitHub or VS Code).';

var SMALL_GRAPH_DOT = ['digraph cfg {', 'node [shape="box"]', 'label = ""',
	'n0 [label="entry", shape="ellipse", style="filled", fillcolor="yellow"]',
	'n1 [label="exit", shape="ellipse", style="filled", fillcolor="yellow"]',
	'n0 -> n1 []', '}'].join('\n');

/**
 * Fake model of the given def-use pairs (only String(mainlyRelatedScope),
 * hierarchy and dupairs are read)
 * @param {Map} dupairs
 * @returns {Object}
 */
function fakeModel(dupairs) {
	'use strict';
	return {
		mainlyRelatedScope: variable('$DOMAIN.$PAGE_0.f'),
		hierarchy: {level: Model.INTER_PAGE},
		dupairs: dupairs
	};
}

/**
 * Lines of the def-use pairs table of a Markdown text
 * @param {string} markdown
 * @returns {Array}
 */
function tableLinesOf(markdown) {
	'use strict';
	var section = markdown.split('\n## Def-use pairs\n\n')[1];
	return section.replace(/\n$/, '').split('\n');
}

/**
 * Rows of the DOT def-use pairs table: the variable then the pairs
 * @param {string} dot
 * @returns {Array<Array<string>>}
 */
function dotTableRowsOf(dot) {
	'use strict';
	/// the header row is the first row (on the line of the first entry)
	return (dot.match(/<tr>.*?<\/tr>/g) || []).slice(1).map(function (row) {
		return (row.match(/<td>.*?<\/td>/g) || []).map(function (td) {
			return td.replace(/^<td>/, '').replace(/<\/td>$/, '');
		}).filter(function (piece) {
			return piece !== '';
		});
	});
}

/**
 * Texts of the code spans of a table row (single backticks, no padding)
 * @param {string} line
 * @returns {Array<Array<string>>}
 */
function cellTextsOf(line) {
	'use strict';
	return line.replace(/^\| /, '').replace(/ \|$/, '').split(' | ').map(function (text) {
		return text === '' ? [] : text.split('<br/>').map(function (span) {
			return span.replace(/^`/, '').replace(/`$/, '');
		});
	});
}

describe('markdownoutput', function () {
	'use strict';

	after(function () {
		analyze.reset();
	});

	describe('with an analyzed page', function () {
		var intraProcedural, interProcedural, intraPage, interPage;

		before(function () {
			analyze(SOURCE);
			intraProcedural = modelOfScope(pageModels().intraProceduralModels, '$DOMAIN.$PAGE_0.add');
			interProcedural = modelOfScope(pageModels().interProceduralModels, '$DOMAIN.$PAGE_0.sumAll');
			intraPage = pageModels().intraPageModels[0];
			interPage = modelCtrl.interPageModel;
		});

		/**
		 * Markdown text of a model of an analyzed page
		 * @param {Model} model
		 * @param {string} level
		 * @returns {string}
		 */
		function markdownOf(model, level) {
			var dots = {graphDot: graphics.convertGraphToDot(model)};
			if (level !== 'intraProcedural') {
				dots.hierarchyDot = hierarchyDot.convertHierarchyToDot(model);
			}
			return markdownOutput.modelMarkdown(model, level, dots);
		}

		describe('modelTitleOf (FR-001)', function () {
			it('should be the level and the main scope for an intra-procedural model', function () {
				markdownOutput.modelTitleOf(intraProcedural, 'intraProcedural')
					.should.eql('intra-procedural: $DOMAIN.$PAGE_0.add');
			});

			it('should be the title of the hierarchy for an upper model', function () {
				markdownOutput.modelTitleOf(interProcedural, 'interProcedural')
					.should.eql('inter-procedural: $DOMAIN.$PAGE_0.sumAll');
				markdownOutput.modelTitleOf(intraPage, 'intraPage').should.eql('intra-page: $DOMAIN.$PAGE_0');
				markdownOutput.modelTitleOf(interPage, 'interPage').should.eql('inter-page');
				[[interProcedural, 'interProcedural'], [intraPage, 'intraPage'], [interPage, 'interPage']]
					.forEach(function (modelAndLevel) {
						markdownOutput.modelTitleOf(modelAndLevel[0], modelAndLevel[1])
							.should.eql(hierarchyDot.hierarchyTitleOf(modelAndLevel[0]));
					});
			});
			it('should throw on an unknown level', function () {
				['intra-procedural', 'page', '', undefined].forEach(function (level) {
					(function () {
						markdownOutput.modelTitleOf(intraProcedural, level);
					}).should.throw('Unknown level of the model: ' + level);
				});
			});
		});

		describe('modelMarkdown (contracts/model-markdown.md §2)', function () {
			it('should have the title, the graph and the def-use pairs of an intra-procedural model', function () {
				var graphDot = graphics.convertGraphToDot(intraProcedural),
					markdown = markdownOf(intraProcedural, 'intraProcedural'),
					graph = mermaidGraph.renderGraph(dotReader.readDot(graphDot), '0.graph.dot').markdown;
				markdown.indexOf('# `intra-procedural: $DOMAIN.$PAGE_0.add`\n\n## Graph\n\n' + graph +
					'\n\n## Def-use pairs\n\n| Variable | Def-Use pairs |\n| --- | --- |\n').should.eql(0);
				markdown.should.not.containEql('## Hierarchy');
			});

			it('should have the hierarchy before the graph of each upper model', function () {
				[[interProcedural, 'interProcedural'], [intraPage, 'intraPage'], [interPage, 'interPage']]
					.forEach(function (modelAndLevel) {
						var model = modelAndLevel[0],
							markdown = markdownOf(model, modelAndLevel[1]),
							hierarchy = mermaidGraph.renderGraph(
								dotReader.readDot(hierarchyDot.convertHierarchyToDot(model)), '0.hierarchy.dot').markdown,
							graph = mermaidGraph.renderGraph(
								dotReader.readDot(graphics.convertGraphToDot(model)), '0.graph.dot').markdown;
						markdown.indexOf('# ' + markdownText.codeSpan(hierarchyDot.hierarchyTitleOf(model)) +
							'\n\n## Hierarchy\n\n' + hierarchy + '\n\n## Graph\n\n' + graph +
							'\n\n## Def-use pairs\n\n| Variable | Def-Use pairs |\n| --- | --- |\n').should.eql(0);
					});
			});

			it('should end with exactly one newline', function () {
				[[intraProcedural, 'intraProcedural'], [interProcedural, 'interProcedural'], [intraPage, 'intraPage'],
					[interPage, 'interPage']].forEach(function (modelAndLevel) {
					var markdown = markdownOf(modelAndLevel[0], modelAndLevel[1]);
					markdown.should.match(/[^\n]\n$/);
				});
			});

			it('should give the variables and pairs of convertDUPairsToDot (FR-005)', function () {
				[intraProcedural, interProcedural, intraPage, interPage].forEach(function (model) {
					var level = model === intraProcedural ? 'intraProcedural' : 'interPage',
						rows = tableLinesOf(markdownOf(model, level)).slice(2).map(cellTextsOf),
						expected = dotTableRowsOf(graphics.convertDUPairsToDot(model.dupairs));
					expected.length.should.be.above(0);
					rows.should.eql(expected.map(function (row) {
						return [[row[0]], row.slice(1)];
					}));
				});
			});

			it('should be the same for the same input (FR-007)', function () {
				markdownOf(interProcedural, 'interProcedural').should.eql(markdownOf(interProcedural, 'interProcedural'));
				markdownOf(intraProcedural, 'intraProcedural').should.eql(markdownOf(intraProcedural, 'intraProcedural'));
			});
		});

		describe('overviewMarkdown (contracts/overview-readme.md §2)', function () {
			it('should list the source and the models of the page, then the inter-page model (FR-011)', function () {
				var models = pageModels(),
					page = {
						source: SOURCE + '\n',
						intraProceduralModels: models.intraProceduralModels,
						interProceduralModels: models.interProceduralModels,
						intraPageModels: models.intraPageModels
					};
				markdownOutput.overviewMarkdown([page], interPage).should.eql([
					'# dujs analysis results',
					'',
					OVERVIEW_INTRODUCTION,
					'',
					'## Page 0',
					'',
					'### Source code',
					'',
					'[`page0/src.js`](page0/src.js)',
					'',
					'```js',
					SOURCE,
					'```',
					'',
					'### Intra-procedural',
					'',
					'- [`intra-procedural: $DOMAIN.$PAGE_0`](page0/intra-procedurals/0.md)',
					'- [`intra-procedural: $DOMAIN.$PAGE_0.add`](page0/intra-procedurals/1.md)',
					'- [`intra-procedural: $DOMAIN.$PAGE_0.sumAll`](page0/intra-procedurals/2.md)',
					'',
					'### Inter-procedural',
					'',
					'- [`inter-procedural: $DOMAIN.$PAGE_0.sumAll`](page0/inter-procedurals/0.md)',
					'- [`inter-procedural: $DOMAIN.$PAGE_0`](page0/inter-procedurals/1.md)',
					'',
					'### Intra-page',
					'',
					'- [`intra-page: $DOMAIN.$PAGE_0`](page0/intra-pages/0.md)',
					'',
					'## Inter-page',
					'',
					'- [`inter-page`](inter-page/0.md)',
					''
				].join('\n'));
			});
		});
	});

	describe('overviewMarkdown with fake models (contracts/overview-readme.md §2, A2)', function () {
		/**
		 * Fake intra-procedural model (only String(mainlyRelatedScope) is read)
		 * @param {string} scopeName
		 * @returns {Object}
		 */
		function intraModel(scopeName) {
			return {mainlyRelatedScope: variable(scopeName)};
		}

		/**
		 * Fake upper model (only the level and the main scope of the hierarchy are read)
		 * @param {string} level Model.INTER_PROCEDURAL, Model.INTRA_PAGE or Model.INTER_PAGE
		 * @param {string} [scopeName]
		 * @returns {Object}
		 */
		function upperModel(level, scopeName) {
			return {hierarchy: {level: level, main: {scope: variable(scopeName)}}};
		}

		/**
		 * Page of the overview with no model
		 * @param {string} source
		 * @returns {Object}
		 */
		function emptyPage(source) {
			return {source: source, intraProceduralModels: [], interProceduralModels: [], intraPageModels: []};
		}

		/**
		 * Source code section of a page in the overview
		 * @param {string} markdown
		 * @param {number} pageIndex
		 * @returns {string} from the link of src.js up to the next heading
		 */
		function sourceSectionOf(markdown, pageIndex) {
			var start = markdown.indexOf('## Page ' + pageIndex + '\n\n### Source code\n\n');
			start.should.be.aboveOrEqual(0);
			var section = markdown.slice(start).split('\n\n### Source code\n\n')[1];
			return section.slice(0, section.indexOf('\n\n### Intra-procedural\n'));
		}

		it('should list the pages by their index, each level by the model number', function () {
			var pages = [
					{
						source: 'var a = 1;\n',
						intraProceduralModels: [intraModel('$DOMAIN.$PAGE_0'), intraModel('$DOMAIN.$PAGE_0.f')],
						interProceduralModels: [upperModel(Model.INTER_PROCEDURAL, '$DOMAIN.$PAGE_0.f')],
						intraPageModels: [upperModel(Model.INTRA_PAGE, '$DOMAIN.$PAGE_0')]
					},
					{
						source: 'var b = 2;\n',
						intraProceduralModels: [intraModel('$DOMAIN.$PAGE_1')],
						interProceduralModels: [],
						intraPageModels: [upperModel(Model.INTRA_PAGE, '$DOMAIN.$PAGE_1')]
					}
				],
				markdown = markdownOutput.overviewMarkdown(pages, upperModel(Model.INTER_PAGE));
			markdown.should.eql([
				'# dujs analysis results',
				'',
				OVERVIEW_INTRODUCTION,
				'',
				'## Page 0',
				'',
				'### Source code',
				'',
				'[`page0/src.js`](page0/src.js)',
				'',
				'```js',
				'var a = 1;',
				'```',
				'',
				'### Intra-procedural',
				'',
				'- [`intra-procedural: $DOMAIN.$PAGE_0`](page0/intra-procedurals/0.md)',
				'- [`intra-procedural: $DOMAIN.$PAGE_0.f`](page0/intra-procedurals/1.md)',
				'',
				'### Inter-procedural',
				'',
				'- [`inter-procedural: $DOMAIN.$PAGE_0.f`](page0/inter-procedurals/0.md)',
				'',
				'### Intra-page',
				'',
				'- [`intra-page: $DOMAIN.$PAGE_0`](page0/intra-pages/0.md)',
				'',
				'## Page 1',
				'',
				'### Source code',
				'',
				'[`page1/src.js`](page1/src.js)',
				'',
				'```js',
				'var b = 2;',
				'```',
				'',
				'### Intra-procedural',
				'',
				'- [`intra-procedural: $DOMAIN.$PAGE_1`](page1/intra-procedurals/0.md)',
				'',
				'### Inter-procedural',
				'',
				'None.',
				'',
				'### Intra-page',
				'',
				'- [`intra-page: $DOMAIN.$PAGE_1`](page1/intra-pages/0.md)',
				'',
				'## Inter-page',
				'',
				'- [`inter-page`](inter-page/0.md)',
				''
			].join('\n'));
		});

		it('should write None. for each level without a model', function () {
			var markdown = markdownOutput.overviewMarkdown([emptyPage('var a;\n')], upperModel(Model.INTER_PAGE));
			markdown.should.containEql('### Intra-procedural\n\nNone.\n\n### Inter-procedural\n\nNone.\n\n' +
				'### Intra-page\n\nNone.\n\n## Inter-page\n\n- [`inter-page`](inter-page/0.md)\n');
			markdownOutput.overviewMarkdown([emptyPage('var a;\n')]).should.match(/\n## Inter-page\n\nNone\.\n$/);
		});

		it('should wrap a title with backticks in a longer code span', function () {
			var page = emptyPage('var a;\n');
			page.intraProceduralModels = [intraModel('$DOMAIN.$PAGE_0.`f`')];
			markdownOutput.overviewMarkdown([page]).should.containEql(
				'- [' + markdownText.codeSpan('intra-procedural: $DOMAIN.$PAGE_0.`f`') +
				'](page0/intra-procedurals/0.md)\n');
		});

		// A2: backticks × max(3, the longest run of backticks in the source + 1)
		it('should fence the source longer than its longest run of backticks', function () {
			[['var a = 1;\n', '```'], ['var t = `x`;\n', '```'], ['// ```\nvar a;\n', '````'],
				['var s = "`````";\n', '``````']].forEach(function (sourceAndFence) {
				var source = sourceAndFence[0], fence = sourceAndFence[1];
				sourceSectionOf(markdownOutput.overviewMarkdown([emptyPage(source)]), 0).should.eql(
					'[`page0/src.js`](page0/src.js)\n\n' + fence + 'js\n' + source + fence);
			});
		});

		it('should add a newline to the source not ending with one, and keep the source as it is', function () {
			var source = 'var html = "<b>*a*</b> | [x](y) & #1";\n\nvar b;';
			sourceSectionOf(markdownOutput.overviewMarkdown([emptyPage(source)]), 0).should.eql(
				'[`page0/src.js`](page0/src.js)\n\n```js\n' + source + '\n```');
		});

		it('should end with exactly one newline and use relative POSIX paths', function () {
			var markdown = markdownOutput.overviewMarkdown([emptyPage('var a;\n\n\n'), emptyPage('')],
				upperModel(Model.INTER_PAGE));
			markdown.should.match(/[^\n]\n$/);
			(markdown.match(/\]\(([^)]*)\)/g) || []).forEach(function (link) {
				link.should.match(/^\]\((page\d+\/|inter-page\/)[^\\:]*\)$/);
			});
		});
	});

	describe('def-use pairs table (contracts/model-markdown.md §4)', function () {
		/**
		 * Table lines of a fake inter-page model of def-use pairs
		 * @param {Map} dupairs
		 * @returns {Array}
		 */
		function tableOf(dupairs) {
			return tableLinesOf(markdownOutput.modelMarkdown(fakeModel(dupairs), 'interPage',
				{graphDot: SMALL_GRAPH_DOT, hierarchyDot: dotOfEdges(1)}));
		}

		it('should have only the header with no entry', function () {
			tableOf(new Map()).should.eql(['| Variable | Def-Use pairs |', '| --- | --- |']);
		});

		it('should leave the pairs empty for an entry without a pair', function () {
			tableOf(new Map([[variable('a'), []]])).slice(2).should.eql(['| `a` |  |']);
		});

		it('should keep each row of variables of one name in the order of the Map', function () {
			var dupairs = new Map();
			dupairs.set(variable('x'), ['(n1,n2)']);
			dupairs.set(variable('a'), ['(n3,n4)']);
			dupairs.set(variable('x'), ['(n5,n6)']);
			dupairs.set(variable('x'), ['(n7,n8)', '(n7,n9)']);
			tableOf(dupairs).slice(2).should.eql([
				'| `x` | `(n1,n2)` |',
				'| `a` | `(n3,n4)` |',
				'| `x` | `(n5,n6)` |',
				'| `x` | `(n7,n8)`<br/>`(n7,n9)` |'
			]);
		});

		it('should keep the commas of a pair and wrap the names in code spans', function () {
			var dupairs = new Map([
				[variable('$DOMAIN.$PAGE_0'), ['(entry_b,(8,9))']],
				[variable('a|b'), [{toString: function () {
					return '(n1,n2|n3)';
				}}]]
			]);
			tableOf(dupairs).slice(2).should.eql([
				'| `$DOMAIN.$PAGE_0` | `(entry_b,(8,9))` |',
				'| `a\\|b` | `(n1,n2\\|n3)` |'
			]);
		});
	});

	describe('fallback of one graph (FR-010)', function () {
		it('should show the hierarchy over the limits as tables and the graph in Mermaid', function () {
			var markdown = markdownOutput.modelMarkdown(fakeModel(new Map()), 'interPage',
					{graphDot: SMALL_GRAPH_DOT, hierarchyDot: dotOfEdges(501)}, 3),
				sections = markdown.split('\n## ');
			sections[0].should.eql('# `inter-page`\n');
			sections[1].indexOf('Hierarchy\n\n> This graph has 501 edges and ').should.eql(0);
			sections[1].should.containEql('See [`3.hierarchy.dot`](3.hierarchy.dot) for the graph.');
			sections[1].should.not.containEql('```mermaid');
			sections[2].should.eql('Graph\n\n' +
				mermaidGraph.renderGraph(dotReader.readDot(SMALL_GRAPH_DOT), '3.graph.dot').markdown + '\n');
			sections[2].indexOf('Graph\n\n```mermaid\n').should.eql(0);
		});

		it('should keep the hierarchy at 500 edges in Mermaid', function () {
			var markdown = markdownOutput.modelMarkdown(fakeModel(new Map()), 'interPage',
				{graphDot: SMALL_GRAPH_DOT, hierarchyDot: dotOfEdges(500)});
			markdown.should.containEql('## Hierarchy\n\n```mermaid\n');
			markdown.should.not.containEql('> This graph has');
		});
	});

	// D004-1b: S5 of tests/dujs/scopesource.js passes without a new allowed entry
	it('should not read <x>.name in its source', function () {
		var source = fs.readFileSync(path.join(__dirname, '../../lib/dujs/markdownoutput.js'), 'utf8');
		source.should.not.match(/\.name\b/);
	});
});
