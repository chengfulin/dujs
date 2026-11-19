/*
 * Markdown text rules shared by the Mermaid graphs and the Markdown files of
 * the models: code spans, table cells and table rows
 * (specs/009-mermaid-markdown-output contracts/model-markdown.md §3).
 *
 * Original dujs code, MIT License (see LICENSE).
 */

/**
 * Markdown code span of a text (contracts/model-markdown.md §3)
 * @param {string} s
 * @returns {string} '' for an empty text
 */
function codeSpan(s) {
	'use strict';
	var text = String(s),
		longest = 0;
	if (text === '') {
		return '';
	}
	(text.match(/`+/g) || []).forEach(function (run) {
		longest = Math.max(longest, run.length);
	});
	var fence = new Array(longest + 2).join('`'),
		padding = /^[`\s]|[`\s]$/.test(text) ? ' ' : '';
	return fence + padding + text + padding + fence;
}

/**
 * Markdown table cell of pieces of text (contracts/model-markdown.md §3):
 * each line a code span, joined by <br/>, with | escaped
 * @param {Array<string>} pieces
 * @returns {string}
 */
function cell(pieces) {
	'use strict';
	var segments = [];
	pieces.forEach(function (piece) {
		segments = segments.concat(String(piece).split('\n'));
	});
	return segments.map(codeSpan).join('<br/>').replace(/\|/g, '\\|');
}

/**
 * Markdown table row of cells
 * @param {Array<string>} cells
 * @returns {string}
 */
function rowOf(cells) {
	'use strict';
	return '| ' + cells.join(' | ') + ' |';
}

module.exports = {
	codeSpan: codeSpan,
	cell: cell,
	rowOf: rowOf
};
