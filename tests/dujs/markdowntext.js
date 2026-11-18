/*
 * Test cases of the Markdown text rules (lib/dujs/markdowntext.js,
 * specs/009-mermaid-markdown-output contracts/model-markdown.md §3): the code
 * span, the table cell and the table row shared by mermaidgraph and
 * markdownoutput.
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var fs = require('fs'),
	path = require('path');
var markdownText = require('../../lib/dujs/markdowntext'),
	mermaidGraph = require('../../lib/dujs/mermaidgraph'),
	markdownOutput = require('../../lib/dujs/markdownoutput');

/**
 * Source text of a module of lib/dujs
 * @param {string} name
 * @returns {string}
 */
function sourceOf(name) {
	'use strict';
	return fs.readFileSync(path.join(__dirname, '../../lib/dujs', name + '.js'), 'utf8');
}

describe('markdowntext', function () {
	'use strict';

	it('should be the rules shared by mermaidgraph and markdownoutput, not exported again by them', function () {
		['mermaidgraph', 'markdownoutput'].forEach(function (name) {
			sourceOf(name).should.match(/require\('\.\/markdowntext'\)/);
		});
		[mermaidGraph, markdownOutput].forEach(function (module) {
			module.should.not.have.property('codeSpan');
			module.should.not.have.property('cell');
			module.should.not.have.property('rowOf');
		});
	});

	describe('codeSpan', function () {
		it('should wrap a text in one more backtick than its longest run of backticks', function () {
			markdownText.codeSpan('a').should.eql('`a`');
			markdownText.codeSpan('a`b').should.eql('``a`b``');
			markdownText.codeSpan('a``b`c').should.eql('```a``b`c```');
		});

		it('should pad a text starting or ending with a backtick or a space', function () {
			markdownText.codeSpan('`a').should.eql('`` `a ``');
			markdownText.codeSpan('a`').should.eql('`` a` ``');
			markdownText.codeSpan(' a').should.eql('`  a `');
			markdownText.codeSpan('a ').should.eql('` a  `');
		});

		it('should give no code span for an empty text', function () {
			markdownText.codeSpan('').should.eql('');
		});
	});

	describe('cell', function () {
		it('should make a code span of each line, joined by <br/>, with | escaped', function () {
			markdownText.cell(['a\nb', 'c']).should.eql('`a`<br/>`b`<br/>`c`');
			markdownText.cell(['a|b']).should.eql('`a\\|b`');
			markdownText.cell([]).should.eql('');
			markdownText.cell(['$DOMAIN.$PAGE_0']).should.eql('`$DOMAIN.$PAGE_0`');
		});
	});

	describe('rowOf', function () {
		it('should join the cells between pipes', function () {
			markdownText.rowOf(['a', 'b']).should.eql('| a | b |');
			markdownText.rowOf(['---', '---', '---']).should.eql('| --- | --- | --- |');
			markdownText.rowOf(['', '`x`']).should.eql('|  | `x` |');
		});
	});

	// D004-1b: S5 of tests/dujs/scopesource.js passes without a new allowed entry
	it('should not read <x>.name in its source', function () {
		sourceOf('markdowntext').should.not.match(/\.name\b/);
	});
});
