/*
 * Markdown file of a model (<n>.md): the title, the hierarchy (upper models),
 * the graph and the def-use pairs table (specs/009-mermaid-markdown-output,
 * contracts/model-markdown.md, data-model.md §3); the overview README.md of
 * an output directory (contracts/overview-readme.md). The graphs are read from the
 * DOT texts written next to it, so the Markdown shows the same nodes and edges.
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * dotreader.readDot is called as a property of the module (not destructured),
 * so a test can stub it.
 */
var dotReader = require('./dotreader'),
	mermaidGraph = require('./mermaidgraph'),
	markdownText = require('./markdowntext'),
	hierarchyDot = require('./hierarchydot');

/**
 * Level of an intra-procedural model (the levels are named as in the call
 * matching files: intraProcedural, interProcedural, intraPage, interPage)
 * @type {string}
 * @private
 */
var INTRA_PROCEDURAL = 'intraProcedural';

/**
 * Levels of the upper models (with a hierarchy)
 * @type {Array<string>}
 * @private
 */
var UPPER_LEVELS = ['interProcedural', 'intraPage', 'interPage'];

/**
 * Check a level of a model
 * @param {string} level
 * @throws {Error} when the level is unknown
 * @private
 */
function checkLevel(level) {
	'use strict';
	if (level !== INTRA_PROCEDURAL && UPPER_LEVELS.indexOf(level) < 0) {
		throw new Error('Unknown level of the model: ' + level);
	}
}

/**
 * Title of a model (FR-001): the level and the main scope of an
 * intra-procedural model, or the title of the hierarchy of an upper model
 * @param {Model} model
 * @param {string} level intraProcedural, interProcedural, intraPage or interPage
 * @returns {string}
 * @throws {Error} when the level is unknown
 */
function modelTitleOf(model, level) {
	'use strict';
	checkLevel(level);
	if (level === INTRA_PROCEDURAL) {
		return 'intra-procedural: ' + String(model.mainlyRelatedScope);
	}
	return hierarchyDot.hierarchyTitleOf(model);
}

/**
 * Lines of the def-use pairs table (contracts/model-markdown.md §4): a row
 * for each entry of the Map, in its order; the variable by String(key) and
 * each pair by '' + pair, as in graphics.convertDUPairsToDot
 * @param {Map} dupairs
 * @returns {Array<string>}
 * @private
 */
function dupairsTableOf(dupairs) {
	'use strict';
	var lines = [markdownText.rowOf(['Variable', 'Def-Use pairs']), markdownText.rowOf(['---', '---'])];
	dupairs.forEach(function (pairs, key) {
		var texts = [];
		pairs.forEach(function (pair) {
			texts.push('' + pair);
		});
		lines.push(markdownText.rowOf([markdownText.cell([String(key)]), markdownText.cell(texts)]));
	});
	return lines;
}

/**
 * Markdown of a graph in a DOT text
 * @param {string} dotText
 * @param {string} dotFileName
 * @returns {string} without a newline at the end
 * @private
 */
function graphMarkdownOf(dotText, dotFileName) {
	'use strict';
	return mermaidGraph.renderGraph(dotReader.readDot(dotText), dotFileName).markdown;
}

/**
 * Markdown text of a model (contracts/model-markdown.md §2)
 * @param {Model} model
 * @param {string} level intraProcedural, interProcedural, intraPage or interPage
 * @param {{graphDot: string, hierarchyDot: string}} dots DOT texts of the graph
 *     and, for an upper model, of the hierarchy, as written in the .dot files
 * @param {number} [modelIndex] number <n> of the model (0 by default), naming
 *     the .dot files referred by a graph shown as tables
 * @returns {string} ends with one newline
 * @throws {Error} when the level is unknown or a DOT text cannot be read
 */
function modelMarkdown(model, level, dots, modelIndex) {
	'use strict';
	var index = modelIndex || 0,
		lines = ['# ' + markdownText.codeSpan(modelTitleOf(model, level))];
	if (level !== INTRA_PROCEDURAL) {
		lines.push('', '## Hierarchy', '', graphMarkdownOf(dots.hierarchyDot, index + '.hierarchy.dot'));
	}
	lines.push('', '## Graph', '', graphMarkdownOf(dots.graphDot, index + '.graph.dot'));
	lines.push('', '## Def-use pairs', '');
	return lines.concat(dupairsTableOf(model.dupairs)).join('\n') + '\n';
}

/**
 * Paragraph after the heading of the overview (contracts/overview-readme.md §2)
 * @type {string}
 * @private
 */
var OVERVIEW_INTRODUCTION = 'Each model is a Markdown file with its graphs in Mermaid; the `.dot` files next to it ' +
	'are the same graphs. View the files with a Markdown viewer that renders Mermaid (for example GitHub or VS Code).';

/**
 * Sections of the levels of a page in the overview: the heading, the
 * directory of the model files, the property of the models and their level
 * @type {Array<{heading: string, dir: string, property: string, level: string}>}
 * @private
 */
var OVERVIEW_PAGE_LEVELS = [
	{heading: 'Intra-procedural', dir: 'intra-procedurals', property: 'intraProceduralModels', level: INTRA_PROCEDURAL},
	{heading: 'Inter-procedural', dir: 'inter-procedurals', property: 'interProceduralModels', level: 'interProcedural'},
	{heading: 'Intra-page', dir: 'intra-pages', property: 'intraPageModels', level: 'intraPage'}
];

/**
 * Fenced code block of a source code (A2): backticks × max(3, the longest run
 * of backticks in the source + 1); the source is kept as it is, with a
 * newline added when it does not end with one
 * @param {string} source
 * @returns {string} without a newline at the end
 * @private
 */
function sourceFenceOf(source) {
	'use strict';
	var text = String(source),
		longest = 0;
	(text.match(/`+/g) || []).forEach(function (run) {
		longest = Math.max(longest, run.length);
	});
	var fence = new Array(Math.max(3, longest + 1) + 1).join('`');
	if (text.slice(-1) !== '\n') {
		text += '\n';
	}
	return fence + 'js\n' + text + fence;
}

/**
 * Lines of a list of links to the Markdown files of models, or `None.` when
 * there is no model
 * @param {Array<Model>} models
 * @param {string} level
 * @param {string} dir directory of the model files relative to the output
 *     directory
 * @returns {Array<string>}
 * @private
 */
function modelLinksOf(models, level, dir) {
	'use strict';
	if (!models || models.length === 0) {
		return ['None.'];
	}
	return models.map(function (model, index) {
		return '- [' + markdownText.codeSpan(modelTitleOf(model, level)) + '](' + dir + '/' + index + '.md)';
	});
}

/**
 * Markdown text of the overview README.md of an output directory
 * (contracts/overview-readme.md §2): for each page by its index the source
 * code and the links to the intra-procedural, inter-procedural and intra-page
 * models by their numbers, then the link to the inter-page model. The links
 * are relative to the output directory, without its name
 * @param {Array<{source: string, intraProceduralModels: Array<Model>,
 *     interProceduralModels: Array<Model>, intraPageModels: Array<Model>}>} pages
 * @param {Model} [interPageModel] None. when not given
 * @returns {string} ends with one newline
 * @throws {Error} when the title of a model cannot be made
 */
function overviewMarkdown(pages, interPageModel) {
	'use strict';
	var lines = ['# dujs analysis results', '', OVERVIEW_INTRODUCTION];
	pages.forEach(function (page, pageIndex) {
		var pageDir = 'page' + pageIndex;
		lines.push('', '## Page ' + pageIndex, '', '### Source code', '',
			'[' + markdownText.codeSpan(pageDir + '/src.js') + '](' + pageDir + '/src.js)', '', sourceFenceOf(page.source));
		OVERVIEW_PAGE_LEVELS.forEach(function (level) {
			lines.push('', '### ' + level.heading, '');
			lines = lines.concat(modelLinksOf(page[level.property], level.level, pageDir + '/' + level.dir));
		});
	});
	lines.push('', '## Inter-page', '');
	lines = lines.concat(modelLinksOf(interPageModel ? [interPageModel] : [], 'interPage', 'inter-page'));
	return lines.join('\n') + '\n';
}

module.exports = {
	modelTitleOf: modelTitleOf,
	modelMarkdown: modelMarkdown,
	overviewMarkdown: overviewMarkdown
};
