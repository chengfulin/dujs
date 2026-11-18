/*
 * Markdown file of a model (<n>.md): the title, the hierarchy (upper models),
 * the graph and the def-use pairs table (specs/009-mermaid-markdown-output,
 * contracts/model-markdown.md, data-model.md §3). The graphs are read from the
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

module.exports = {
	modelTitleOf: modelTitleOf,
	modelMarkdown: modelMarkdown
};
