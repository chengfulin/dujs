/*
 * Headings and relative links of the repo documents (specs/009-mermaid-markdown-output
 * contracts/docs-split.md §4; FR-019, SC-007, D003, D004-3): the root
 * README.md and docs/*.md (not recursive: not docs/research/**, not the
 * README.md of tests/golden/expected*). Every ATX heading has one space after
 * its #s (outside fenced code; docs/known-issues.md is not checked, its links
 * are); every relative link ](path[#anchor]) outside fenced code points to an
 * existing file or directory, and its #anchor to a heading of the target file
 * (GitHub slug); http(s) links are not checked. The README has a
 * "## Background" section right after "## Goal" with the title of the thesis
 * in Chinese and English and its URL, word for word (D003).
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var fs = require('fs'),
	path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');

/** Files whose headings are not checked (links are) */
var NO_HEADING_CHECK = ['docs/known-issues.md'];

/** The strings of D003 the Background section has word for word */
var BACKGROUND_STRINGS = [
	'JavaScript網頁應用程式資料流測試模型之研究',
	'A Study on Dataflow Testing Model of JavaScript Web Applications',
	'https://hdl.handle.net/11296/u8f5n6'
];

/**
 * Paths (relative to the repo root, with /) of the documents to check
 * @returns {Array<string>}
 */
function documentPaths() {
	'use strict';
	var docs = fs.readdirSync(path.join(ROOT, 'docs')).filter(function (name) {
		return /\.md$/.test(name) && fs.statSync(path.join(ROOT, 'docs', name)).isFile();
	}).sort().map(function (name) {
		return 'docs/' + name;
	});
	return ['README.md'].concat(docs);
}

/**
 * Lines of a document outside fenced code, with their line numbers
 * @param {string} text
 * @returns {Array<{number: number, text: string}>}
 */
function linesOutsideFences(text) {
	'use strict';
	var lines = [], fence = null;
	text.split('\n').forEach(function (line, index) {
		var match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
		if (fence) {
			if (match && match[1].charAt(0) === fence.charAt(0) && match[1].length >= fence.length &&
				/^ {0,3}[`~]+\s*$/.test(line)) {
				fence = null;
			}
			return;
		}
		if (match) {
			fence = match[1];
			return;
		}
		lines.push({number: index + 1, text: line});
	});
	return lines;
}

/**
 * GitHub slug of a heading text
 * @param {string} heading the text after the #s
 * @returns {string}
 */
function slugOf(heading) {
	'use strict';
	return heading.trim().toLowerCase()
		.replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
		.replace(/ /g, '-');
}

/**
 * Anchors of the headings of a document, with -1, -2, ... for repeated slugs
 * @param {string} text
 * @returns {Array<string>}
 */
function anchorsOf(text) {
	'use strict';
	var seen = {}, anchors = [];
	linesOutsideFences(text).forEach(function (line) {
		var match = /^ {0,3}#{1,6}(?:\s+(.*?))?\s*#*\s*$/.exec(line.text), slug;
		if (!match) {
			return;
		}
		slug = slugOf(match[1] || '');
		if (Object.prototype.hasOwnProperty.call(seen, slug)) {
			seen[slug] += 1;
			anchors.push(slug + '-' + seen[slug]);
		} else {
			seen[slug] = 0;
			anchors.push(slug);
		}
	});
	return anchors;
}

/**
 * Relative link targets of a document (outside fenced code and code spans)
 * @param {string} text
 * @returns {Array<{line: number, target: string}>}
 */
function relativeLinksOf(text) {
	'use strict';
	var links = [];
	linesOutsideFences(text).forEach(function (line) {
		var stripped = line.text.replace(/(`+)[\s\S]*?\1/g, ''),
			pattern = /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g,
			match;
		while ((match = pattern.exec(stripped)) !== null) {
			if (!/^(?:https?:|mailto:)/i.test(match[1])) {
				links.push({line: line.number, target: match[1]});
			}
		}
	});
	return links;
}

/**
 * Lines of the section of a level 2 heading "## <title>" (up to the next
 * heading of level 1 or 2); only for ## headings
 * @param {string} text
 * @param {string} title the heading text after "## "
 * @returns {?Array<string>} null when there is no such heading
 */
function level2SectionOf(text, title) {
	'use strict';
	var lines = linesOutsideFences(text), heading = '## ' + title, start = -1, end, i;
	for (i = 0; i < lines.length && start < 0; i += 1) {
		if (lines[i].text === heading) {
			start = i;
		}
	}
	if (start < 0) {
		return null;
	}
	for (end = start + 1; end < lines.length && !/^#{1,2} /.test(lines[end].text); end += 1) {
		/// up to the next heading of level 1 or 2
	}
	return lines.slice(start, end).map(function (line) {
		return line.text;
	});
}

describe('docs', function () {
	'use strict';
	var paths = documentPaths();

	it('should check the root README.md and docs/*.md only', function () {
		paths[0].should.equal('README.md');
		paths.forEach(function (file) {
			file.should.match(/^(?:README\.md|docs\/[^/]+\.md)$/);
		});
		paths.should.containEql('docs/known-issues.md');
	});

	describe('headings', function () {
		paths.filter(function (file) {
			return NO_HEADING_CHECK.indexOf(file) < 0;
		}).forEach(function (file) {
			it('should have one space after the #s in ' + file, function () {
				var bad = linesOutsideFences(fs.readFileSync(path.join(ROOT, file), 'utf8')).filter(function (line) {
					return /^#/.test(line.text) && !/^#{1,6} \S/.test(line.text);
				}).map(function (line) {
					return file + ':' + line.number + ': ' + line.text;
				});
				bad.should.eql([]);
			});
		});
	});

	describe('relative links', function () {
		paths.forEach(function (file) {
			it('should reach an existing file and heading from ' + file, function () {
				var text = fs.readFileSync(path.join(ROOT, file), 'utf8'),
					broken = [];
				relativeLinksOf(text).forEach(function (link) {
					var hash = link.target.indexOf('#'),
						pathPart = hash < 0 ? link.target : link.target.slice(0, hash),
						anchor = hash < 0 ? null : decodeURIComponent(link.target.slice(hash + 1)),
						target = pathPart === '' ? path.join(ROOT, file) :
							path.resolve(path.dirname(path.join(ROOT, file)), decodeURIComponent(pathPart)),
						where = file + ':' + link.line + ': ' + link.target;
					if (!fs.existsSync(target)) {
						broken.push(where + ' (no such file or directory)');
					} else if (anchor !== null && (fs.statSync(target).isDirectory() ||
						anchorsOf(fs.readFileSync(target, 'utf8')).indexOf(anchor) < 0)) {
						broken.push(where + ' (no such heading)');
					}
				});
				broken.should.eql([]);
			});
		});
	});

	describe('README Background (D003)', function () {
		var readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');

		it('should have the section ## Background right after ## Goal', function () {
			var headings = linesOutsideFences(readme).filter(function (line) {
				return /^#{1,6} /.test(line.text);
			}).map(function (line) {
				return line.text;
			});
			headings.should.containEql('## Background');
			headings.should.containEql('## Goal');
			headings[headings.indexOf('## Goal') + 1].should.equal('## Background');
		});

		BACKGROUND_STRINGS.forEach(function (expected) {
			it('should have "' + expected + '" in ## Background', function () {
				var section = level2SectionOf(readme, 'Background');
				(section === null).should.be.false();
				section.join('\n').should.containEql(expected);
			});
		});
	});

	describe('slugOf', function () {
		it('should follow the GitHub slugs', function () {
			slugOf('SDD 導入宣告').should.equal('sdd-導入宣告');
			slugOf('Supported syntax and limitations').should.equal('supported-syntax-and-limitations');
			slugOf('`finallyExit` nodes and `finally` edges').should.equal('finallyexit-nodes-and-finally-edges');
			slugOf('§23 o.m(), (1)').should.equal('23-om-1');
		});

		it('should number repeated headings', function () {
			anchorsOf('# A\n## B\n## B\n```\n## B\n```\n## B\n').should.eql(['a', 'b', 'b-1', 'b-2']);
		});
	});
});
