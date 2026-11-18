/*
 * "No content lost" check of the README split of feature 009 (FR-018, SC-007;
 * contracts/docs-split.md §3, research R9): every paragraph of the README of
 * 274257a has exactly one row in the map readme-map.md, and the row holds.
 * Not part of dujs, not run by npm test.
 *
 *   node specs/009-mermaid-markdown-output/tools/readmecheck.js <readme-map.md> [--base <commit>]
 *   node specs/009-mermaid-markdown-output/tools/readmecheck.js --segments [--base <commit>]
 *
 * Paragraphs ("段"): the blocks of the original README separated by blank
 * lines; in a block with <ul>, each <li> (nested ones too, in the order they
 * open; the text of an <li> does not include its nested lists) is a
 * paragraph, and the text of the block outside the outermost <ul> (the
 * heading before it) is one more, before them. The ID of a paragraph is its
 * number (1, 2, ...). --segments prints them.
 *
 * Map rows: | ID | 原段落（首句摘錄） | 新位置（檔案 + 標題） | 處置 | 理由 |;
 * 新位置 has the file and the heading line as code spans
 * (`docs/usage.md` + `## Exit status`), the file relative to the repo root;
 * a paragraph that spans several headings lists them all in order
 * (`README.md` + `# dujs` + `## Goal`) and its section is their sections
 * joined.
 * A \| in a cell (also in a code span) is a | of the cell, as in GFM tables.
 * The section of a heading is its line and the lines up to the next heading
 * of any level (outside fenced code; a fence closes with a run of the same
 * character, at least as long, followed only by white space).
 * - 搬移: the normalized paragraph (Markdown and HTML marks removed, entities
 *   decoded, white space merged) is a substring of the normalized section.
 * - 改寫: 理由 is not empty and the heading exists.
 * - 新增 (ID N1, N2, ...; no paragraph): every code span of 原段落 is in the
 *   text of the section, word for word with white space merged (one rule for
 *   every 新增 row).
 *
 * Exit status: 0 every paragraph has a row and every row holds, 1 a
 * paragraph without a row (or with two), a row that does not hold or an
 * unknown ID, 2 usage error (no map, a map or base that cannot be read).
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var childProcess = require('child_process'),
	fs = require('fs'),
	path = require('path');

var ROOT = path.resolve(__dirname, '..', '..', '..');
var DEFAULT_BASE = '274257a';

/** Inline HTML tags removed without a space, other tags give a space */
var INLINE_TAGS = /<\/?(?:code|em|strong|b|i|a)(?:\s[^>]*)?>/gi,
	BLOCK_TAGS = /<\/?(?:br|ul|ol|li|p|div)\s*\/?>/gi;

var ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', hellip: '…'};

/**
 * Text with entities decoded
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
	'use strict';
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (whole, name) {
		if (name.charAt(0) === '#') {
			return String.fromCodePoint(name.charAt(1).toLowerCase() === 'x' ?
				parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
		}
		return Object.prototype.hasOwnProperty.call(ENTITIES, name.toLowerCase()) ?
			ENTITIES[name.toLowerCase()] : whole;
	});
}

/**
 * Normalized text: Markdown and HTML marks removed, entities decoded, white space merged
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
	'use strict';
	return decodeEntities(text
		.replace(/^[ \t]*(?:`{3,}|~{3,}).*$/gm, ' ')
		.replace(/^[ \t]{0,3}#{1,6}[ \t]*/gm, '')
		.replace(/^[ \t]*(?:[-*+]|\d+\.)[ \t]+/gm, '')
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(INLINE_TAGS, '')
		.replace(BLOCK_TAGS, ' ')
		.replace(/\\([\\`*_{}[\]()#+\-.!|<>])/g, '$1')
		.replace(/[`*]/g, ''))
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Paragraphs of a block with <ul>: the text outside the outermost list, then every <li>
 * @param {string} block
 * @returns {Array<string>}
 */
function listParagraphsOf(block) {
	'use strict';
	var tags = /<(\/?)(ul|li)\b[^>]*>/gi,
		outside = [], items = [], open = [], depth = 0, last = 0, match, text;
	while ((match = tags.exec(block)) !== null) {
		text = block.slice(last, match.index);
		if (open.length > 0) {
			items[open[open.length - 1]] += text;
		} else if (depth === 0) {
			outside.push(text);
		}
		last = tags.lastIndex;
		if (match[2].toLowerCase() === 'ul') {
			depth += match[1] ? -1 : 1;
		} else if (match[1]) {
			open.pop();
		} else {
			open.push(items.length);
			items.push('');
		}
	}
	outside.push(block.slice(last));
	text = outside.join('\n');
	return (normalize(text) === '' ? [] : [text.trim()]).concat(items.map(function (item) {
		return item.trim();
	}));
}

/**
 * Paragraphs of the original README
 * @param {string} readme
 * @returns {Array<string>}
 */
function paragraphsOf(readme) {
	'use strict';
	var paragraphs = [];
	readme.split(/\n[ \t]*\n/).forEach(function (block) {
		if (block.trim() === '') {
			return;
		}
		if (/<ul\b/i.test(block)) {
			paragraphs = paragraphs.concat(listParagraphsOf(block));
		} else {
			paragraphs.push(block.trim());
		}
	});
	return paragraphs;
}

/**
 * Code spans of a Markdown text (CommonMark: backtick runs of the same length)
 * @param {string} text
 * @returns {Array<string>}
 */
function codeSpansOf(text) {
	'use strict';
	var spans = [], pattern = /(`+)([\s\S]*?[^`])\1(?!`)/g, match, content;
	while ((match = pattern.exec(text)) !== null) {
		content = match[2];
		if (/^ [\s\S]* $/.test(content) && content.trim() !== '') {
			content = content.slice(1, -1);
		}
		spans.push(content);
	}
	return spans;
}

/**
 * Cells of a table row; a | in a code span or escaped (\|) does not split
 * @param {string} line
 * @returns {Array<string>}
 */
function cellsOf(line) {
	'use strict';
	var cells = [], current = '', i = 0, run, close;
	var body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
	while (i < body.length) {
		if (body.charAt(i) === '\\' && body.charAt(i + 1) === '|') {
			current += '|';
			i += 2;
		} else if (body.charAt(i) === '`') {
			run = /^`+/.exec(body.slice(i))[0];
			close = body.indexOf(run, i + run.length);
			close = close < 0 ? i + run.length : close + run.length;
			current += body.slice(i, close).replace(/\\\|/g, '|');
			i = close;
		} else if (body.charAt(i) === '|') {
			cells.push(current.trim());
			current = '';
			i += 1;
		} else {
			current += body.charAt(i);
			i += 1;
		}
	}
	cells.push(current.trim());
	return cells;
}

/**
 * Rows of the map (the table rows other than the header and the separator)
 * @param {string} map
 * @returns {Array<{line: number, id: string, excerpt: string, file: ?string, headings: Array<string>, heading: ?string, action: string, reason: string}>}
 */
function rowsOf(map) {
	'use strict';
	var rows = [];
	map.split('\n').forEach(function (line, index) {
		var cells, place;
		if (!/^\s*\|/.test(line) || /^\s*\|[\s:|-]+\|\s*$/.test(line)) {
			return;
		}
		cells = cellsOf(line);
		if (cells[0] === 'ID') {
			return;
		}
		place = codeSpansOf(cells[2] || '');
		rows.push({
			line: index + 1,
			id: cells[0],
			excerpt: cells[1] || '',
			file: place.filter(function (span) {
				return !/^#/.test(span);
			})[0] || null,
			headings: place.filter(function (span) {
				return /^#{1,6} /.test(span);
			}),
			heading: place.filter(function (span) {
				return /^#{1,6} /.test(span);
			}).join(' + ') || null,
			action: cells[3] || '',
			reason: cells[4] || ''
		});
	});
	return rows;
}

/**
 * Whether a line closes a fenced code block (CommonMark: a run of the fence
 * character at least as long as the opening one, then only white space)
 * @param {string} line
 * @param {string} fence the opening run
 * @returns {boolean}
 */
function closesFence(line, fence) {
	'use strict';
	var match = /^ {0,3}(`+|~+)\s*$/.exec(line);
	return match !== null && match[1].charAt(0) === fence.charAt(0) && match[1].length >= fence.length;
}

/**
 * Lines of the section of a heading in a file: the heading line up to the
 * next heading of any level (null when the file or the heading is missing)
 * @param {string} file relative to the repo root
 * @param {string} heading
 * @returns {?string}
 */
function sectionOf(file, heading) {
	'use strict';
	var full = path.join(ROOT, file), lines = [], fence = null, inside = false;
	if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
		return null;
	}
	fs.readFileSync(full, 'utf8').split('\n').forEach(function (line) {
		var marker = /^ {0,3}(`{3,}|~{3,})/.exec(line), isHeading = fence === null && /^#{1,6} /.test(line);
		if (fence !== null) {
			fence = closesFence(line, fence) ? null : fence;
		} else if (marker) {
			fence = marker[1];
		}
		if (isHeading && inside) {
			inside = false;
		}
		if (isHeading && lines.length === 0 && line.trim() === heading.trim()) {
			inside = true;
		}
		if (inside) {
			lines.push(line);
		}
	});
	return lines.length === 0 ? null : lines.join('\n');
}

/**
 * Text with every run of white space made one space
 * @param {string} text
 * @returns {string}
 */
function mergeSpace(text) {
	'use strict';
	return text.replace(/\s+/g, ' ').trim();
}

/**
 * The README of a commit
 * @param {string} base
 * @returns {string}
 */
function originalReadme(base) {
	'use strict';
	return childProcess.execFileSync('git', ['-C', ROOT, 'show', base + ':README.md'],
		{encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
}

/**
 * Problems of a row (empty when it holds)
 * @param {Object} row
 * @param {?string} paragraph the original paragraph (null for 新增)
 * @returns {Array<string>}
 */
function problemsOf(row, paragraph) {
	'use strict';
	var sections, section, problems = [];
	if (!row.file || !row.heading) {
		return ['新位置 has no `file` + `## heading`'];
	}
	sections = row.headings.map(function (heading) {
		return sectionOf(row.file, heading);
	});
	if (sections.indexOf(null) >= 0) {
		return ['no heading "' + row.headings[sections.indexOf(null)] + '" in ' + row.file];
	}
	section = sections.join('\n');
	if (row.action === '搬移') {
		if (normalize(section).indexOf(normalize(paragraph)) < 0) {
			problems.push('the paragraph is not in the section: "' + normalize(paragraph).slice(0, 80) + '…"');
		}
	} else if (row.action === '改寫') {
		if (row.reason.trim() === '') {
			problems.push('改寫 without 理由');
		}
	} else if (row.action === '新增') {
		if (codeSpansOf(row.excerpt).length === 0) {
			problems.push('新增 without the strings (code spans) of 原段落');
		}
		codeSpansOf(row.excerpt).forEach(function (expected) {
			if (mergeSpace(section).indexOf(mergeSpace(expected)) < 0) {
				problems.push('not in the section: "' + expected + '"');
			}
		});
	} else {
		problems.push('unknown 處置 "' + row.action + '"');
	}
	return problems;
}

/**
 * Prints the result line of a paragraph or a row
 * @param {string} id
 * @param {string} label
 * @param {Array<string>} problems
 * @returns {number} 1 when there are problems, else 0
 */
function report(id, label, problems) {
	'use strict';
	console.log((problems.length > 0 ? 'FAIL ' : 'ok   ') + id + (label ? ' ' + label : '') +
		(problems.length > 0 ? ' -- ' + problems.join('; ') : ''));
	return problems.length > 0 ? 1 : 0;
}

/**
 * Checks the map; prints a line per paragraph and row
 * @param {Array<string>} paragraphs
 * @param {Array<Object>} rows
 * @returns {number} the exit status
 */
function check(paragraphs, rows) {
	'use strict';
	var failed = 0, byId = {};
	rows.forEach(function (row) {
		byId[row.id] = (byId[row.id] || []).concat([row]);
	});
	paragraphs.forEach(function (paragraph, index) {
		var id = String(index + 1), found = byId[id] || [], problems;
		if (found.length !== 1) {
			problems = [found.length === 0 ? 'no row' : found.length + ' rows'];
		} else if (found[0].action === '新增') {
			problems = ['新增 used for a paragraph of the original README'];
		} else {
			problems = problemsOf(found[0], paragraph);
		}
		failed += report(id, found.length === 1 ?
			found[0].action + ' ' + found[0].file + ' ' + found[0].heading : '', problems);
	});
	rows.filter(function (row) {
		return !/^[1-9]\d*$/.test(row.id) || Number(row.id) > paragraphs.length;
	}).forEach(function (row) {
		var problems;
		if (!/^N[1-9]\d*$/.test(row.id)) {
			problems = ['unknown ID (paragraphs are 1..' + paragraphs.length + ', added rows N1, N2, ...)'];
		} else if (row.action !== '新增') {
			problems = ['an N row must be 新增'];
		} else {
			problems = (byId[row.id].length > 1 ? ['repeated ID'] : []).concat(problemsOf(row, null));
		}
		failed += report(row.id, row.action + ' ' + row.file + ' ' + row.heading, problems);
	});
	console.log(paragraphs.length + ' paragraphs, ' + rows.length + ' rows, ' + failed + ' failed');
	return failed > 0 ? 1 : 0;
}

/**
 * Command line
 * @param {Array<string>} args
 * @returns {number} the exit status
 */
function main(args) {
	'use strict';
	var base = DEFAULT_BASE, mapFile = null, segments = false, usageError = false, i, readme, map;
	for (i = 0; i < args.length; i += 1) {
		if (args[i] === '--base' && i + 1 < args.length) {
			base = args[i + 1];
			i += 1;
		} else if (args[i] === '--segments') {
			segments = true;
		} else if (mapFile === null && !/^--/.test(args[i])) {
			mapFile = args[i];
		} else {
			usageError = true;
		}
	}
	if (usageError || (mapFile === null) === !segments) {
		console.error('usage: readmecheck.js <readme-map.md> [--base <commit>]\n' +
			'       readmecheck.js --segments [--base <commit>]');
		return 2;
	}
	try {
		readme = originalReadme(base);
	} catch (error) {
		console.error('cannot read README.md of ' + base + ': ' + error.message.split('\n')[0]);
		return 2;
	}
	if (segments) {
		paragraphsOf(readme).forEach(function (paragraph, index) {
			console.log((index + 1) + '\t' + normalize(paragraph).slice(0, 100));
		});
		return 0;
	}
	try {
		map = fs.readFileSync(path.resolve(mapFile), 'utf8');
	} catch (error) {
		console.error('cannot read ' + mapFile + ': ' + error.message);
		return 2;
	}
	return check(paragraphsOf(readme), rowsOf(map));
}

if (require.main === module) {
	process.exitCode = main(process.argv.slice(2));
}
