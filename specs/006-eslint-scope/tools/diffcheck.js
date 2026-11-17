/*
 * Difference check of feature 006 (FR-012 (2), contracts/diff-check.md):
 * compare the dupairs/graph outputs of develop with those of this branch,
 * classify every difference with eslint-scope facts of the page source and
 * check the record (golden-diff.md, mdn-diff.md). Not part of dujs, not run
 * by npm test.
 *
 *   node specs/006-eslint-scope/tools/diffcheck.js golden [--base <commit>] --report
 *   node specs/006-eslint-scope/tools/diffcheck.js golden [--base <commit>] --verify <golden-diff.md>
 *   node specs/006-eslint-scope/tools/diffcheck.js mdn --report
 *   node specs/006-eslint-scope/tools/diffcheck.js mdn --verify <mdn-diff.md>
 *
 * Exit status: 0 passed (or report written), 1 problems found by --verify,
 * 2 usage error or no base of the golden mode (golden-diff.md has no base
 * line and no --base; no fallback to HEAD or another commit).
 *
 * Interpretations of the contract kept here:
 * - Normalization (§2) also drops the same-line index letter of a normal node
 *   ("30a" -> "30"), like the letter of a typed node ("entry_a" -> "entry"):
 *   both only tell apart nodes of one label and shift when nodes are added.
 * - The use line of a c-use is its node line; a p-use "(d,t)" has the use
 *   line of its decision d (catch (a), (b) and default parameter lines; the
 *   target t is not a use line).
 * - The inter-page level holds the pairs of every page: its facts and
 *   triggers are the union of those of the pages.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var childProcess = require('child_process'),
	crypto = require('crypto'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var espree = require('espree'),
	eslintScope = require('eslint-scope');

var ROOT = path.resolve(__dirname, '..', '..', '..'),
	FEATURE = path.resolve(__dirname, '..'),
	MDN = path.join(FEATURE, 'mdn'),
	FR_OF = {'解析': 'FR-002–FR-005', '全域': 'FR-006', 'catch': 'FR-003', 'AnnexB': 'FR-007', '連結': 'FR-013'},
	SPECIAL_SCOPES = ['function-expression-name', 'class'],
	LINK_SCOPES = ['catch', 'function-expression-name', 'class'],
	BLOCK_SCOPES = ['block', 'switch'],
	NET_HEADING = '## 淨差異（相對 develop，機器核對）',
	RESOLUTION_HEADING = '## 解析類移除簽核（F3：歸「解析」的移除 pair 的釘選筆數）',
	LINK_HEADING = '## 呼叫連結簽核（衍生差異的釘選筆數）';

/* ---------- §2 dot parsing and normalization ---------- */

/**
 * Normalize a node label of a dupairs cell: drop the index letter that tells
 * apart nodes of the same label ("entry_a" -> "entry", "30a" -> "30");
 * line numbers and branch paths are kept
 * @param {string} label
 * @returns {string}
 */
function normalizeLabel(label) {
	'use strict';
	var text = label.trim(),
		normal = /^(\d+(?::[TF]+)?)[a-z]+$/.exec(text);
	if (normal) {
		return normal[1];
	}
	var typed = /^(.+)_[a-z]+$/.exec(text);
	return typed ? typed[1] : text;
}

/**
 * Split "(a,b)" into its two top-level parts
 * @param {string} text
 * @returns {Array|null}
 */
function splitPair(text) {
	'use strict';
	var inner = text.trim();
	if (inner.charAt(0) !== '(' || inner.charAt(inner.length - 1) !== ')') {
		return null;
	}
	inner = inner.slice(1, -1);
	var depth = 0;
	for (var i = 0; i < inner.length; ++i) {
		var ch = inner.charAt(i);
		if (ch === '(') {
			depth++;
		} else if (ch === ')') {
			depth--;
		} else if (ch === ',' && depth === 0) {
			return [inner.slice(0, i), inner.slice(i + 1)];
		}
	}
	return null;
}

/**
 * Normalized use of a cell: a node label, or "(decision,target)" of a p-use
 * @param {string} text
 * @returns {string}
 */
function normalizeUse(text) {
	'use strict';
	var parts = splitPair(text);
	return parts ? '(' + normalizeLabel(parts[0]) + ',' + normalizeLabel(parts[1]) + ')' : normalizeLabel(text);
}

/**
 * Rows of a *.dupairs.dot file, each with its normalized pair strings
 * "name: def -> use" (in file order, duplicates kept)
 * @param {string} text
 * @returns {Array} [{name, pairs}]
 */
function parseDupairs(text) {
	'use strict';
	var rows = [],
		rowPattern = /<tr><td>([^<]*)<\/td>(.*?)<\/tr>/g,
		match;
	while ((match = rowPattern.exec(text)) !== null) {
		if (/COLSPAN/.test(match[2])) {
			continue;
		}
		var name = match[1],
			pairs = [],
			cellPattern = /<td>([^<]*)<\/td>/g,
			cell;
		while ((cell = cellPattern.exec(match[2])) !== null) {
			var parts = !!cell[1] && splitPair(cell[1]);
			if (parts) {
				pairs.push(name + ': ' + normalizeLabel(parts[0]) + ' -> ' + normalizeUse(parts[1]));
			}
		}
		rows.push({name: name, pairs: pairs});
	}
	return rows;
}

/**
 * Line number of a normalized label, or null (entry, exit, call, ...)
 * @param {string} label
 * @returns {number|null}
 */
function lineOf(label) {
	'use strict';
	var match = /^(\d+)/.exec(label) || /\((\d+)/.exec(label);
	return match ? Number(match[1]) : null;
}

/**
 * Name, def line, use line and all use lines of a pair string
 * @param {string} pair
 * @returns {Object}
 */
function pairParts(pair) {
	'use strict';
	var match = /^(.*?): (.*?) -> (.*)$/.exec(pair),
		use = splitPair(match[3]),
		useLines = use ? [lineOf(use[0]), lineOf(use[1])] : [lineOf(match[3])];
	return {
		name: match[1],
		defLine: lineOf(match[2]),
		useLine: useLines[0],
		useLines: useLines.filter(function (line) {
			return line !== null;
		})
	};
}

/* ---------- §3 facts of a page from eslint-scope ---------- */

/**
 * Parse as dujs does: a script, or a module when it is not a valid script
 * @param {string} code
 * @returns {Object} AST
 */
function parse(code) {
	'use strict';
	var options = {ecmaVersion: 'latest', range: true, loc: true};
	try {
		return espree.parse(code, Object.assign({}, options, {sourceType: 'script'}));
	} catch (scriptError) {
		try {
			return espree.parse(code, Object.assign({}, options, {sourceType: 'module'}));
		} catch (ignoredModuleError) {
			throw scriptError;
		}
	}
}

/**
 * Visit every node of an AST (espree visitor keys)
 * @param {Object} node
 * @param {Function} visit called with (node, parent)
 * @param {Object} [parent]
 */
function walk(node, visit, parent) {
	'use strict';
	if (!node || typeof node.type !== 'string') {
		return;
	}
	visit(node, parent || null);
	(espree.VisitorKeys[node.type] || []).forEach(function (key) {
		[].concat(node[key] || []).forEach(function (child) {
			walk(child, visit, node);
		});
	});
}

/**
 * Names bound by a pattern
 * @param {Object} pattern
 * @returns {Array}
 */
function boundNames(pattern) {
	'use strict';
	var names = [];
	(function collect(node) {
		if (!node) {
			return;
		}
		if (node.type === 'Identifier') {
			names.push(node.name);
		} else if (node.type === 'ObjectPattern') {
			node.properties.forEach(function (property) {
				collect(property.type === 'RestElement' ? property.argument : property.value);
			});
		} else if (node.type === 'ArrayPattern') {
			node.elements.forEach(collect);
		} else if (node.type === 'RestElement') {
			collect(node.argument);
		} else if (node.type === 'AssignmentPattern') {
			collect(node.left);
		}
	}(pattern));
	return names;
}

/**
 * Empty facts
 * @returns {Object}
 */
function emptyFacts() {
	'use strict';
	return {
		varCount: new Map(),
		special: new Set(),
		defaultLines: new Set(),
		unresolved: new Set(),
		catches: [],
		nonCatchDecl: new Set(),
		triggers: [],
		error: null
	};
}

/**
 * Call sites of a page: the callee identifier of f() and new f(), the object
 * of o.m() and A.s(), the handler identifier of addEventListener
 * @param {Object} ast
 * @returns {Array} [{id, text, kind}] kind: 'callee', 'handler' or 'object'
 */
function callSitesOf(ast) {
	'use strict';
	var sites = [];
	walk(ast, function (node) {
		if (node.type !== 'CallExpression' && node.type !== 'NewExpression') {
			return;
		}
		var callee = node.callee,
			prefix = node.type === 'NewExpression' ? 'new ' : '';
		if (callee.type === 'Identifier') {
			sites.push({id: callee, text: prefix + callee.name + '()', kind: 'callee'});
		} else if (callee.type === 'MemberExpression') {
			var property = callee.computed ? '[…]' : '.' + (callee.property.name || '');
			if (callee.object.type === 'Identifier') {
				sites.push({id: callee.object, text: prefix + callee.object.name + property + '()', kind: 'object'});
			}
			var handler = node.arguments[1];
			if (!callee.computed && callee.property.name === 'addEventListener' && !!handler &&
				handler.type === 'Identifier') {
				sites.push({id: handler, text: 'addEventListener(…, ' + handler.name + ')', kind: 'handler'});
			}
		}
	});
	return sites;
}

/**
 * Facts of a page source (§3 prerequisites) and its AnnexB and call link
 * triggers; eslint-scope with the options of research R1
 * @param {string} source
 * @returns {Object}
 */
function factsOf(source) {
	'use strict';
	var facts = emptyFacts(), ast, manager;
	try {
		ast = parse(source);
		manager = eslintScope.analyze(ast, {
			ecmaVersion: espree.latestEcmaVersion,
			sourceType: ast.sourceType,
			optimistic: true,
			childVisitorKeys: espree.VisitorKeys
		});
	} catch (err) {
		facts.error = err.message;
		return facts;
	}
	var referenceOf = new Map(),
		blockFunctions = new Set(),
		catchParams = new Set();
	manager.scopes.forEach(function (scope) {
		scope.references.forEach(function (reference) {
			referenceOf.set(reference.identifier, reference);
		});
		scope.variables.forEach(function (variable) {
			if (variable.defs.length === 0) {
				return;
			}
			facts.varCount.set(variable.name, (facts.varCount.get(variable.name) || 0) + 1);
			if (SPECIAL_SCOPES.indexOf(scope.type) !== -1) {
				facts.special.add(variable.name);
			}
			if (scope.type !== 'catch') {
				facts.nonCatchDecl.add(variable.name);
			}
			if (BLOCK_SCOPES.indexOf(scope.type) !== -1 && variable.defs.some(function (def) {
					return def.type === 'FunctionName' && def.node.type === 'FunctionDeclaration';
				})) {
				blockFunctions.add(variable.name);
			}
		});
	});
	manager.globalScope.through.forEach(function (reference) {
		facts.unresolved.add(reference.identifier.name);
	});
	walk(ast, function (node) {
		if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
			node.params.forEach(function (param) {
				walk(param, function (inner) {
					if (inner.type === 'AssignmentPattern') {
						for (var line = inner.loc.start.line; line <= inner.loc.end.line; ++line) {
							facts.defaultLines.add(line);
						}
					}
				});
			});
		} else if (node.type === 'CatchClause') {
			var params = boundNames(node.param);
			params.forEach(function (name) {
				catchParams.add(name);
			});
			facts.catches.push({line: node.loc.start.line, start: node.loc.start.line, end: node.loc.end.line, params: params});
		}
	});
	callSitesOf(ast).forEach(function (site) {
		var name = site.id.name,
			line = site.id.loc.start.line,
			reference = referenceOf.get(site.id),
			resolved = reference ? reference.resolved : null,
			reasons = [];
		if (site.kind !== 'object' && !!reference && !resolved && blockFunctions.has(name)) {
			facts.triggers.push({kind: 'AnnexB', line: line, text: 'L' + line + ' `' + site.text + '`：block 函式未解析'});
		}
		if (!!resolved && LINK_SCOPES.indexOf(resolved.scope.type) !== -1) {
			reasons.push('解析到 ' + resolved.scope.type + ' scope');
		}
		if ((facts.varCount.get(name) || 0) >= 2) {
			reasons.push('同名宣告 ' + facts.varCount.get(name) + ' 個');
		}
		if (catchParams.has(name)) {
			reasons.push('同名 catch 參數');
		}
		if (reasons.length > 0) {
			facts.triggers.push({kind: '連結', line: line, text: 'L' + line + ' `' + site.text + '`：' + reasons.join('、')});
		}
	});
	return facts;
}

/**
 * Union of the facts of pages (the inter-page level)
 * @param {Array} list
 * @returns {Object}
 */
function unionFacts(list) {
	'use strict';
	var facts = emptyFacts();
	list.forEach(function (item) {
		item.varCount.forEach(function (count, name) {
			facts.varCount.set(name, Math.max(count, facts.varCount.get(name) || 0));
		});
		['special', 'defaultLines', 'unresolved', 'nonCatchDecl'].forEach(function (key) {
			item[key].forEach(function (value) {
				facts[key].add(value);
			});
		});
		[].push.apply(facts.catches, item.catches);
		[].push.apply(facts.triggers, item.triggers);
	});
	return facts;
}

/* ---------- §2 comparison and §3 classification ---------- */

/**
 * Relative paths ('/' separators) of the .dot files under a directory
 * @param {string} dir
 * @returns {Array}
 */
function listDotFiles(dir) {
	'use strict';
	var result = [];
	if (!fs.existsSync(dir)) {
		return result;
	}
	(function visit(current) {
		fs.readdirSync(current, {withFileTypes: true}).forEach(function (entry) {
			var full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				visit(full);
			} else if (/\.dot$/.test(entry.name)) {
				result.push(path.relative(dir, full).split(path.sep).join('/'));
			}
		});
	}(dir));
	return result.sort();
}

/**
 * Page and file of a relative path: page0/intra-pages/0.dupairs.dot ->
 * {page: 'page0', level: 'intra-pages/', file: 'intra-pages/0.dupairs.dot'}
 * @param {string} relative
 * @returns {Object}
 */
function locate(relative) {
	'use strict';
	var parts = relative.split('/');
	if (parts[0] === 'inter-page' || !/^page\d+$/.test(parts[0])) {
		return {page: 'inter-page', level: parts.slice(1, -1).map(function (part) {
			return part + '/';
		}).join(''), file: parts.slice(1).join('/'), base: parts[parts.length - 1]};
	}
	return {page: parts[0], level: parts.slice(1, -1).join('/') + '/', file: parts.slice(1).join('/'), base: parts[parts.length - 1]};
}

/**
 * Index of a dot file name ("3.dupairs.dot" -> 3)
 * @param {string} name
 * @returns {number}
 */
function indexOf(name) {
	'use strict';
	return parseInt(name, 10);
}

/**
 * Counts of the items of an Array
 * @param {Array} items
 * @returns {Map}
 */
function countOf(items) {
	'use strict';
	var counts = new Map();
	items.forEach(function (item) {
		counts.set(item, (counts.get(item) || 0) + 1);
	});
	return counts;
}

/**
 * Multiset difference: [{content, sign}] for each surplus item
 * @param {Array} before
 * @param {Array} after
 * @returns {Array}
 */
function multisetDiff(before, after) {
	'use strict';
	var result = [],
		oldCounts = countOf(before),
		newCounts = countOf(after),
		keys = [];
	oldCounts.forEach(function (count, key) {
		keys.push(key);
	});
	newCounts.forEach(function (count, key) {
		if (!oldCounts.has(key)) {
			keys.push(key);
		}
	});
	keys.sort().forEach(function (key) {
		var delta = (newCounts.get(key) || 0) - (oldCounts.get(key) || 0);
		for (var i = 0; i < Math.abs(delta); ++i) {
			result.push({content: key, sign: delta > 0 ? '+' : '-'});
		}
	});
	return result;
}

function sha256Of(file) {
	'use strict';
	return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/**
 * Valid categories of a pair or row difference by the first three criteria
 * @param {Object} diff
 * @param {Object} facts
 * @returns {Array}
 */
function directCategories(diff, facts) {
	'use strict';
	var name = diff.name,
		categories = [],
		parts = diff.unit === 'pair' ? pairParts(diff.content) : null,
		isParam = function (item) {
			return item.params.indexOf(name) !== -1;
		},
		within = function (item, line) {
			return line !== null && line >= item.start && line <= item.end;
		};
	if ((facts.varCount.get(name) || 0) >= 2 || facts.special.has(name) || (!!parts &&
		[parts.defLine, parts.useLine].some(function (line) {
			return line !== null && facts.defaultLines.has(line);
		}))) {
		categories.push('解析');
	}
	if (diff.sign === '+' && facts.unresolved.has(name)) {
		categories.push('全域');
	}
	var isCatchParam = facts.catches.some(isParam),
		isCatch = (!!parts && diff.sign === '-' && facts.catches.some(function (item) {
			return !isParam(item) && (item.line === parts.useLine || item.line === parts.defLine);
		})) || (!!parts && facts.catches.some(function (item) {
			return isParam(item) && within(item, parts.defLine) && within(item, parts.useLine);
		})) || (diff.unit === 'row' && diff.sign === '+' && isCatchParam) ||
		(diff.sign === '-' && isCatchParam && !facts.nonCatchDecl.has(name));
	if (isCatch) {
		categories.push('catch');
	}
	return categories;
}

/**
 * Kinds of the triggers of a page, in category order
 * @param {Array} triggers
 * @returns {Array}
 */
function triggerKinds(triggers) {
	'use strict';
	return ['AnnexB', '連結'].filter(function (kind) {
		return triggers.some(function (trigger) {
			return trigger.kind === kind;
		});
	});
}

/**
 * Compare the outputs of a case (§2) and classify each difference (§3)
 * @param {Object} spec {name, pageSources, baseDir, newDir}
 * @returns {Object} {name, diffs, triggers: {page: [trigger]}, errors}
 */
function compareCase(spec) {
	'use strict';
	var pageFacts = spec.pageSources.map(factsOf),
		factsByPage = {'inter-page': unionFacts(pageFacts)},
		triggers = {'inter-page': factsByPage['inter-page'].triggers},
		errors = [],
		diffs = [],
		groups = new Map();
	pageFacts.forEach(function (facts, index) {
		factsByPage['page' + index] = facts;
		triggers['page' + index] = facts.triggers;
		if (facts.error) {
			errors.push(spec.name + ' page' + index + '：eslint-scope 無法分析（' + facts.error + '）');
		}
	});
	function groupOf(located) {
		var key = located.page + '|' + located.level;
		if (!groups.has(key)) {
			groups.set(key, {page: located.page, level: located.level, base: [], next: []});
		}
		return groups.get(key);
	}
	function push(located, unit, sign, content, name) {
		diffs.push({caseName: spec.name, page: located.page, file: located.file, unit: unit, sign: sign,
			content: content, name: name});
	}
	var baseFiles = listDotFiles(spec.baseDir),
		newFiles = listDotFiles(spec.newDir);
	baseFiles.concat(newFiles.filter(function (file) {
		return baseFiles.indexOf(file) === -1;
	})).sort().forEach(function (file) {
		var located = locate(file),
			inBase = baseFiles.indexOf(file) !== -1,
			inNew = newFiles.indexOf(file) !== -1;
		if (/\.dupairs\.dot$/.test(file)) {
			var group = groupOf(located);
			if (inBase) {
				group.base.push(file);
			}
			if (inNew) {
				group.next.push(file);
			}
			if (inBase !== inNew) {
				push(located, 'model', inNew ? '+' : '-', located.file, null);
			}
		} else if (!inBase || !inNew) {
			push(located, 'graph', inNew ? '+' : '-', located.file, null);
		} else if (sha256Of(path.join(spec.baseDir, file)) !== sha256Of(path.join(spec.newDir, file))) {
			push(located, 'graph', '~', located.file, null);
		}
	});
	function rowsOf(dir, files) {
		var rows = [];
		files.forEach(function (file) {
			[].push.apply(rows, parseDupairs(fs.readFileSync(path.join(dir, file), 'utf8')));
		});
		return rows;
	}
	function compareRows(located, before, after) {
		multisetDiff(before.map(function (row) {
			return row.name;
		}), after.map(function (row) {
			return row.name;
		})).forEach(function (item) {
			push(located, 'row', item.sign, item.content, item.content);
		});
		multisetDiff([].concat.apply([], before.map(function (row) {
			return row.pairs;
		})), [].concat.apply([], after.map(function (row) {
			return row.pairs;
		}))).forEach(function (item) {
			push(located, 'pair', item.sign, item.content, pairParts(item.content).name);
		});
	}
	groups.forEach(function (group) {
		var byIndex = function (a, b) {
			return indexOf(locate(a).base) - indexOf(locate(b).base);
		};
		group.base.sort(byIndex);
		group.next.sort(byIndex);
		if (group.base.length === group.next.length) {
			group.next.forEach(function (file, position) {
				compareRows(locate(file), rowsOf(spec.baseDir, [group.base[position]]), rowsOf(spec.newDir, [file]));
			});
		} else {
			compareRows({page: group.page, file: group.level + '*.dupairs.dot'},
				rowsOf(spec.baseDir, group.base), rowsOf(spec.newDir, group.next));
		}
	});
	diffs.forEach(function (diff) {
		var facts = factsByPage[diff.page] || emptyFacts(),
			kinds = triggerKinds(facts.triggers);
		if (diff.unit === 'pair' || diff.unit === 'row') {
			diff.categories = directCategories(diff, facts);
			diff.derived = diff.categories.length === 0 && kinds.length > 0;
			if (diff.derived) {
				diff.categories = kinds;
			}
		} else {
			diff.categories = kinds;
			diff.derived = false;
		}
	});
	return {name: spec.name, diffs: diffs, triggers: triggers, errors: errors};
}

/* ---------- §4 report and record ---------- */

function keyOf(caseName, page, file, unit, sign, content) {
	'use strict';
	return [caseName, page, file, unit, sign, content].join('\u0000');
}

function allDiffs(results) {
	'use strict';
	return [].concat.apply([], results.map(function (result) {
		return result.diffs;
	}));
}

function rowNumbers(numbers) {
	'use strict';
	return numbers.map(function (number) {
		return '#' + number;
	}).join('、');
}

/**
 * Markdown skeleton of the three machine sections (category: the first
 * valid one; the others are noted in the note column)
 * @param {Array} results results of compareCase
 * @returns {string}
 */
function buildReport(results) {
	'use strict';
	var diffs = allDiffs(results),
		lines = [diffs.length === 0 ? '無差異' : diffs.length + ' 筆差異', '', NET_HEADING, '',
			'| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |',
			'|---|------|----|------------|------|---|------|------|----|------|'],
		removals = new Map(),
		derived = new Map();
	diffs.forEach(function (diff, index) {
		var category = diff.categories[0] || '（無成立類別）',
			pageKey = diff.caseName + '\u0000' + diff.page,
			note = diff.categories.length > 1 ? '（亦符：' + diff.categories.slice(1).join('、') + '）' : '';
		lines.push('| ' + [index + 1, diff.caseName, diff.page, diff.file, diff.unit, diff.sign, '`' + diff.content + '`',
			category, FR_OF[category] || '', note].join(' | ') + ' |');
		if (diff.unit === 'pair' && diff.sign === '-' && category === '解析') {
			removals.set(pageKey, (removals.get(pageKey) || []).concat([index + 1]));
		}
		if (diff.derived) {
			var entry = derived.get(pageKey) || {plus: 0, minus: 0, numbers: [], diff: diff};
			entry[diff.sign === '+' ? 'plus' : 'minus']++;
			entry.numbers.push(index + 1);
			derived.set(pageKey, entry);
		}
	});
	lines.push('', RESOLUTION_HEADING, '', '| case | 頁 | 移除筆數 | 原因摘要 | 簽核 |', '|------|----|----------|----------|------|');
	removals.forEach(function (numbers, pageKey) {
		var parts = pageKey.split('\u0000');
		lines.push('| ' + [parts[0], parts[1], numbers.length, '', '草擬，待簽核（' + rowNumbers(numbers) + '）'].join(' | ') + ' |');
	});
	lines.push('', LINK_HEADING, '', '| case | 頁 | 觸發（呼叫點：行、callee、解析變化） | 衍生 + | 衍生 − | 簽核 |',
		'|------|----|----------------------------------------|---------|---------|------|');
	derived.forEach(function (entry, pageKey) {
		var parts = pageKey.split('\u0000'),
			result = results.filter(function (item) {
				return item.name === parts[0];
			})[0],
			triggerText = (result.triggers[parts[1]] || []).map(function (trigger) {
				return trigger.text;
			}).join('；');
		lines.push('| ' + [parts[0], parts[1], triggerText, entry.plus, entry.minus,
			'草擬，待簽核（' + rowNumbers(entry.numbers) + '）'].join(' | ') + ' |');
	});
	return lines.join('\n') + '\n';
}

/**
 * Base commit written in the header of golden-diff.md ("基準：`584e17d`")
 * @param {string} text
 * @returns {string|null}
 */
function baseOf(text) {
	'use strict';
	var match = /^基準[：:]\s*`([0-9a-f]{7,40})`/m.exec(text);
	return match ? match[1] : null;
}

/**
 * Rows of the markdown table of a section (cells trimmed; header,
 * separator and example rows dropped)
 * @param {string} text
 * @param {string} heading start of the heading line
 * @returns {Array}
 */
function tableOf(text, heading) {
	'use strict';
	var lines = text.split('\n'),
		start = -1;
	lines.forEach(function (line, index) {
		if (start === -1 && line.indexOf(heading) === 0) {
			start = index;
		}
	});
	if (start === -1) {
		return null;
	}
	var rows = [], seenHeader = false;
	for (var i = start + 1; i < lines.length && !/^#{1,2} /.test(lines[i]); ++i) {
		var line = lines[i].trim();
		if (line.charAt(0) !== '|') {
			continue;
		}
		var cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) {
			return cell.trim();
		});
		if (!seenHeader) {
			seenHeader = true;
		} else if (!cells.every(function (cell) {
				return /^:?-+:?$/.test(cell);
			}) && cells[0].indexOf('範例') === -1 && cells[1].indexOf('範例') === -1) {
			rows.push(cells);
		}
	}
	return rows;
}

function unquote(text) {
	'use strict';
	var match = /^`(.*)`$/.exec(text);
	return match ? match[1] : text;
}

function normalizeSign(text) {
	'use strict';
	return text === '−' ? '-' : text;
}

/**
 * Check a record against the actual differences (§3, §4)
 * @param {Array} results results of compareCase
 * @param {string} text the record
 * @returns {Array} problems (empty when it passes)
 */
function verifyRecord(results, text) {
	'use strict';
	var problems = [],
		net = tableOf(text, '## 淨差異'),
		resolution = tableOf(text, '## 解析類移除簽核'),
		link = tableOf(text, '## 呼叫連結簽核');
	if (net === null || resolution === null || link === null) {
		return ['紀錄缺少機器區塊（淨差異／解析類移除簽核／呼叫連結簽核）'];
	}
	var actual = new Map(),
		removals = new Map(),
		derived = new Map();
	allDiffs(results).forEach(function (diff) {
		var key = keyOf(diff.caseName, diff.page, diff.file, diff.unit, diff.sign, diff.content);
		actual.set(key, (actual.get(key) || []).concat([diff]));
		if (diff.derived) {
			var pageKey = diff.caseName + '\u0000' + diff.page,
				entry = derived.get(pageKey) || {plus: 0, minus: 0};
			entry[diff.sign === '+' ? 'plus' : 'minus']++;
			derived.set(pageKey, entry);
		}
	});
	net.forEach(function (cells) {
		var label = '淨差異 #' + cells[0] + '（' + cells.slice(1, 7).join(' ') + '）',
			key = keyOf(cells[1], cells[2], cells[3], cells[4], normalizeSign(cells[5]), unquote(cells[6] || '')),
			matches = actual.get(key) || [];
		if (matches.length === 0) {
			problems.push(label + '：記錄與實際不符（實際無此差異或多列）');
			return;
		}
		var diff = matches.shift(),
			category = cells[7],
			note = (cells[9] || '').replace(/^（亦符：[^）]*）/, '').trim();
		if (diff.categories.indexOf(category) === -1) {
			problems.push(label + '：類別「' + category + '」判準不成立（成立：' + (diff.categories.join('、') || '無') + '）');
		}
		if (diff.derived && !note) {
			problems.push(label + '：衍生差異的說明必填（引用呼叫連結簽核的觸發）');
		}
		if (diff.unit === 'pair' && diff.sign === '-' && category === '解析') {
			if (!note) {
				problems.push(label + '：解析類移除的說明必填');
			}
			var pageKey = diff.caseName + '\u0000' + diff.page;
			removals.set(pageKey, (removals.get(pageKey) || 0) + 1);
		}
	});
	actual.forEach(function (rest) {
		rest.forEach(function (diff) {
			problems.push('差異未記錄：' + [diff.caseName, diff.page, diff.file, diff.unit, diff.sign, '`' + diff.content + '`'].join(' ') +
				'（成立類別：' + (diff.categories.join('、') || '無') + '）');
		});
	});
	var pinned = new Set();
	resolution.forEach(function (cells) {
		var pageKey = cells[0] + '\u0000' + cells[1],
			count = removals.get(pageKey) || 0;
		if (pinned.has('r' + pageKey)) {
			problems.push('解析類移除簽核：' + cells[0] + ' ' + cells[1] + ' 重複列');
		}
		pinned.add('r' + pageKey);
		if (count === 0) {
			problems.push('解析類移除簽核：' + cells[0] + ' ' + cells[1] + ' 實際 0 筆解析類移除（或頁不存在），不得列');
		} else if (Number(cells[2]) !== count) {
			problems.push('解析類移除簽核：' + cells[0] + ' ' + cells[1] + ' 釘選 ' + cells[2] + ' 筆，實際 ' + count + ' 筆');
		}
	});
	removals.forEach(function (count, pageKey) {
		if (!pinned.has('r' + pageKey)) {
			problems.push('解析類移除簽核：' + pageKey.replace('\u0000', ' ') + ' 未列（實際 ' + count + ' 筆）');
		}
	});
	link.forEach(function (cells) {
		var pageKey = cells[0] + '\u0000' + cells[1],
			entry = derived.get(pageKey);
		if (pinned.has('l' + pageKey)) {
			problems.push('呼叫連結簽核：' + cells[0] + ' ' + cells[1] + ' 重複列');
		}
		pinned.add('l' + pageKey);
		if (!entry) {
			problems.push('呼叫連結簽核：' + cells[0] + ' ' + cells[1] + ' 實際 0 筆衍生差異（或頁不存在），不得列');
		} else if (Number(cells[3]) !== entry.plus || Number(cells[4]) !== entry.minus) {
			problems.push('呼叫連結簽核：' + cells[0] + ' ' + cells[1] + ' 釘選 +' + cells[3] + '／−' + cells[4] +
				'，實際 +' + entry.plus + '／−' + entry.minus);
		}
	});
	derived.forEach(function (entry, pageKey) {
		if (!pinned.has('l' + pageKey)) {
			problems.push('呼叫連結簽核：' + pageKey.replace('\u0000', ' ') + ' 未列（實際 +' + entry.plus + '／−' + entry.minus + '）');
		}
	});
	return problems;
}

/* ---------- §1 inputs ---------- */

/**
 * Source of a page as the CLI analyzes it
 * @param {Array} files
 * @returns {string}
 */
function pageSource(files) {
	'use strict';
	return require(path.join(ROOT, 'lib', 'dujs', 'sourcereader.js')).getSourceFromFiles(files);
}

/**
 * Golden cases of tests/golden/golden.js: [{name, pages}] (pages: fixture
 * paths relative to tests/golden/fixtures)
 * @returns {Array}
 */
function goldenCases() {
	'use strict';
	var text = fs.readFileSync(path.join(ROOT, 'tests', 'golden', 'golden.js'), 'utf8'),
		pattern = /goldenCase\(\s*'[^']*',\s*(\[[^;]*?\]\])\s*,\s*(EXPECTED|path\.join\(__dirname,\s*'([^']+)'\))\s*\)/g,
		cases = [],
		match;
	while ((match = pattern.exec(text)) !== null) {
		cases.push({name: match[3] || 'expected', pages: JSON.parse(match[1].replace(/'/g, '"'))});
	}
	return cases;
}

/**
 * Run the dujs CLI of this branch on pages into a new directory
 * @param {Array} pages Arrays of file paths
 * @param {string} work parent directory
 * @returns {Object} {status, stderr, outDir}
 */
function runCli(pages, work) {
	'use strict';
	var cwd = fs.mkdtempSync(path.join(work, 'run-')),
		args = [path.join(ROOT, 'bin', 'dujs.js')];
	pages.forEach(function (files) {
		args.push('-js');
		[].push.apply(args, files);
	});
	var run = childProcess.spawnSync(process.execPath, args, {cwd: cwd, encoding: 'utf8'}),
		outs = fs.readdirSync(cwd).filter(function (name) {
			return /^out-/.test(name);
		});
	return {status: run.status, stderr: run.stderr, outDir: outs.length === 1 ? path.join(cwd, outs[0]) : path.join(cwd, 'none')};
}

/**
 * Results of the golden mode
 * @param {string} base commit
 * @param {string} work temporary directory
 * @returns {Array}
 */
function goldenResults(base, work) {
	'use strict';
	var archive = childProcess.spawnSync('git', ['-C', ROOT, 'archive', base, 'tests/golden'], {maxBuffer: 268435456}),
		baseRoot = path.join(work, 'base');
	if (archive.status !== 0) {
		throw new Error('git archive ' + base + ' 失敗：' + String(archive.stderr));
	}
	fs.mkdirSync(baseRoot);
	var untar = childProcess.spawnSync('tar', ['-x', '-C', baseRoot], {input: archive.stdout});
	if (untar.status !== 0) {
		throw new Error('tar 解開失敗：' + String(untar.stderr));
	}
	return goldenCases().map(function (item) {
		return compareCase({
			name: item.name,
			pageSources: item.pages.map(function (files) {
				return pageSource(files.map(function (file) {
					return path.join(ROOT, 'tests', 'golden', 'fixtures', file);
				}));
			}),
			baseDir: path.join(baseRoot, 'tests', 'golden', item.name),
			newDir: path.join(ROOT, 'tests', 'golden', item.name)
		});
	});
}

/**
 * Results of the mdn mode, each with the exit code of the CLI before and now
 * @param {string} work temporary directory
 * @returns {Array}
 */
function mdnResults(work) {
	'use strict';
	var pages = JSON.parse(fs.readFileSync(path.join(MDN, 'pages.json'), 'utf8')),
		codesFile = path.join(MDN, 'baseline-develop', 'exitcodes.json'),
		baseCodes = fs.existsSync(codesFile) ? JSON.parse(fs.readFileSync(codesFile, 'utf8')) : {};
	return Object.keys(pages).sort().map(function (id) {
		var filesOfPages = pages[id].map(function (files) {
				return files.map(function (file) {
					return path.join(MDN, 'corpus', file);
				});
			}),
			run = runCli(filesOfPages, work),
			result = compareCase({
				name: id,
				pageSources: filesOfPages.map(pageSource),
				baseDir: path.join(MDN, 'baseline-develop', id),
				newDir: run.outDir
			});
		result.exitCode = {base: Object.prototype.hasOwnProperty.call(baseCodes, id) ? baseCodes[id] : null, now: run.status};
		return result;
	});
}

/**
 * Exit code table and problems of the mdn mode
 * @param {Array} results
 * @returns {Object} {lines, problems}
 */
function exitCodesOf(results) {
	'use strict';
	var lines = ['', '## CLI exit code（develop → 本 branch）', '', '| id | develop | 本 branch |', '|----|---------|-----------|'],
		problems = [];
	results.forEach(function (result) {
		lines.push('| ' + [result.name, result.exitCode.base, result.exitCode.now].join(' | ') + ' |');
		if (result.exitCode.base !== result.exitCode.now) {
			problems.push('CLI exit code 改變：' + result.name + ' ' + result.exitCode.base + ' → ' + result.exitCode.now);
		}
	});
	return {lines: lines, problems: problems};
}

/**
 * Command line
 * @param {Array} argv
 * @param {Object} [io] {out, err} writers
 * @returns {number} exit status
 */
function main(argv, io) {
	'use strict';
	var out = (io && io.out) || function (text) {
			process.stdout.write(text + '\n');
		},
		err = (io && io.err) || function (text) {
			process.stderr.write(text + '\n');
		},
		mode = argv[0],
		base = null,
		verifyFile = null,
		report = false;
	for (var i = 1; i < argv.length; ++i) {
		if (argv[i] === '--base') {
			base = argv[++i] || null;
		} else if (argv[i] === '--verify') {
			verifyFile = argv[++i] || null;
		} else if (argv[i] === '--report') {
			report = true;
		} else {
			err('未知參數：' + argv[i]);
			return 2;
		}
	}
	if ((mode !== 'golden' && mode !== 'mdn') || report === !!verifyFile) {
		err('用法：diffcheck.js golden [--base <commit>] (--report | --verify <golden-diff.md>)｜diffcheck.js mdn (--report | --verify <mdn-diff.md>)');
		return 2;
	}
	if (verifyFile && !fs.existsSync(verifyFile)) {
		err('找不到紀錄檔：' + verifyFile);
		return 2;
	}
	var recordText = verifyFile ? fs.readFileSync(verifyFile, 'utf8') : null;
	if (mode === 'golden' && !base) {
		var headerFile = verifyFile || path.join(FEATURE, 'golden-diff.md');
		base = fs.existsSync(headerFile) ? baseOf(fs.readFileSync(headerFile, 'utf8')) : null;
		if (!base) {
			err('無法取得 golden 基準：' + headerFile + ' 檔頭未填基準 commit，且未給 --base');
			return 2;
		}
	}
	var work = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck-')),
		results, codes = {lines: [], problems: []};
	try {
		results = mode === 'golden' ? goldenResults(base, work) : mdnResults(work);
	} catch (error) {
		err(error.message);
		fs.rmSync(work, {recursive: true, force: true});
		return 2;
	}
	fs.rmSync(work, {recursive: true, force: true});
	if (mode === 'mdn') {
		codes = exitCodesOf(results);
	}
	var errors = [].concat.apply([], results.map(function (result) {
		return result.errors;
	}));
	if (report) {
		var text = buildReport(results);
		if (codes.problems.length > 0) {
			text = text.replace(/^無差異\n/, 'CLI exit code 有變化\n');
		}
		out((mode === 'golden' ? '<!-- diffcheck golden，基準 ' + base + ' -->\n' : '<!-- diffcheck mdn -->\n') +
			text + codes.lines.join('\n') + (errors.length > 0 ? '\n\n' + errors.join('\n') : ''));
		return 0;
	}
	var problems = errors.concat(codes.problems, verifyRecord(results, recordText));
	if (problems.length > 0) {
		problems.forEach(function (problem) {
			out('FAIL ' + problem);
		});
		out(problems.length + ' 個問題');
		return 1;
	}
	out('通過：' + allDiffs(results).length + ' 筆差異皆已記錄且判準成立');
	return 0;
}

module.exports = {
	normalizeLabel: normalizeLabel,
	parseDupairs: parseDupairs,
	factsOf: factsOf,
	compareCase: compareCase,
	buildReport: buildReport,
	verifyRecord: verifyRecord,
	baseOf: baseOf,
	exitCodesOf: exitCodesOf,
	main: main
};

if (require.main === module) {
	process.exitCode = main(process.argv.slice(2));
}
