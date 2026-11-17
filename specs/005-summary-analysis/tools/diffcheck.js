/*
 * Difference check of feature 005 (FR-011, SC-003, SC-005;
 * contracts/diff-check.md): compare the dupairs/graph outputs of develop
 * (9e324be) with those of this branch and classify every difference with
 * the categories of feature 005 (§18, 連結, finally, 例外IN, Q-a, 摘要,
 * 保守摘要, graph 共通). The parsing, normalization, multiset comparison and
 * record table helpers are those of specs/006-eslint-scope/tools/diffcheck.js.
 * Not part of dujs, not run by npm test.
 *
 *   node specs/005-summary-analysis/tools/diffcheck.js golden [--base <commit>] --report
 *   node specs/005-summary-analysis/tools/diffcheck.js golden [--base <commit>] --verify <golden-diff.md>
 *   node specs/005-summary-analysis/tools/diffcheck.js mdn --report
 *   node specs/005-summary-analysis/tools/diffcheck.js mdn --verify <mdn-diff.md>
 *
 * Exit status: 0 passed (or report written), 1 problems found by --verify,
 * 2 usage error or no base (golden-diff.md has no base line and no --base).
 *
 * Interpretations of the contract kept here:
 * - Facts of the base side are read from the base output directory of the
 *   page: call edges ("call", "recursive call") and LOOP handlers ("onEvent")
 *   of every *.hierarchy.dot, nodes with an exception out-edge of the
 *   intra-procedural *.graph.dot files. The inter-page level uses the union of
 *   the pages and of inter-page/.
 * - 連結 (D2): a call f() inside a function whose callee identifier resolves
 *   (eslint-scope) to a function declaration, a let/const variable or a
 *   function expression name; it is linked in the base when a call edge goes
 *   from the caller (its declared name, or any $ANONYMOUS_FUN_k for a function
 *   expression) to a scope whose last name segment is f.
 * - 例外IN of an added pair: on the base graph of the same model (all graphs
 *   of the level when the models are compared as a whole), a def node reaches
 *   (by one edge or more) a node n with an exception out-edge whose target
 *   reaches (zero edges or more) a use node; nodes are matched by normalized
 *   label, a p-use by its decision.
 * - Q-a: the def is a call point when its label is call/callReturn or its line
 *   holds a call expression, and the base of the page has a call edge.
 * - 保守摘要: a call of an identifier declared as a generator or async
 *   function (declaration or variable initialized with such a function).
 * - graph 共通 (category "共通"): a graph difference of a page with any call
 *   expression, a finalizer or a 連結 trigger.
 * - *.matching.json files are new files: each is checked for JSON with
 *   format "dujs-matching/1" and a sibling *.graph.dot; they are not
 *   differences of the net table.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var childProcess = require('child_process'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var espree = require('espree'),
	eslintScope = require('eslint-scope');
var base006 = require('../../006-eslint-scope/tools/diffcheck.js');

var ROOT = path.resolve(__dirname, '..', '..', '..'),
	FEATURE = path.resolve(__dirname, '..'),
	MDN_CORPUS = path.join(ROOT, 'specs', '006-eslint-scope', 'mdn'),
	MDN_BASE = path.join(FEATURE, 'mdn', 'baseline-develop'),
	MATCHING_FORMAT = 'dujs-matching/1',
	ORDER = ['§18', '連結', 'finally', '保守摘要', '摘要', '例外IN', 'Q-a', '共通'],
	FR_OF = {
		'§18': 'FR-008', '連結': 'FR-005', 'finally': 'FR-013', '例外IN': 'FR-014', 'Q-a': 'FR-006',
		'摘要': 'FR-002、FR-003、FR-006、FR-007', '保守摘要': 'FR-001', '共通': '—'
	},
	PINNED = ['摘要', '連結', 'finally', '保守摘要'],
	NET_HEADING = '## 淨差異（相對 develop）',
	PIN_HEADING = '## 釘選與簽核';

/* ---------- §1 normalization ---------- */

/**
 * Normalize a node label (006 rules; "finallyExit_a" -> "finallyExit")
 * @param {string} label
 * @returns {string}
 */
function normalizeLabel(label) {
	'use strict';
	var text = label.trim();
	return /^finallyExit(_[a-z]+)?$/.test(text) ? 'finallyExit' : base006.normalizeLabel(text);
}

/**
 * Def label, use label and use decision label of a pair string
 * @param {string} pair "name: def -> use"
 * @returns {Object} {name, def, use, decision}
 */
function pairLabels(pair) {
	'use strict';
	var match = /^(.*?): (.*?) -> (.*)$/.exec(pair),
		use = base006.splitPair(match[3]);
	return {name: match[1], def: match[2], use: match[3], decision: use ? use[0] : match[3]};
}

/* ---------- base side dot files ---------- */

/**
 * Nodes and edges of a *.graph.dot text
 * @param {string} text
 * @returns {Object} {labels: Map(node -> normalized label), edges: [{from, to, type}]}
 */
function parseGraph(text) {
	'use strict';
	var labels = new Map(),
		edges = [];
	text.split('\n').forEach(function (line) {
		var edge = /^\s*(\w+) -> (\w+) \[(.*)\]\s*$/.exec(line);
		if (edge) {
			var type = /label\s*=\s*"([^"]*)"/.exec(edge[3]);
			edges.push({from: edge[1], to: edge[2], type: type ? type[1] : ''});
			return;
		}
		var node = /^\s*(\w+) \[label="([^"]*)"/.exec(line);
		if (node) {
			labels.set(node[1], normalizeLabel(node[2]));
		}
	});
	return {labels: labels, edges: edges};
}

/**
 * Edges of a *.hierarchy.dot text with the labels of their ends
 * @param {string} text
 * @returns {Array} [{from, to, type}] from/to are scope names
 */
function parseHierarchy(text) {
	'use strict';
	var graph = parseGraph(text),
		names = new Map();
	text.split('\n').forEach(function (line) {
		var node = /^\s*(\w+) \[label="([^"]*)"/.exec(line);
		if (node) {
			names.set(node[1], node[2]);
		}
	});
	return graph.edges.map(function (edge) {
		return {from: names.get(edge.from) || edge.from, to: names.get(edge.to) || edge.to, type: edge.type};
	});
}

function lastSegment(name) {
	'use strict';
	var parts = String(name).split('.');
	return parts[parts.length - 1];
}

/**
 * Files under a directory whose name matches a pattern (relative, '/')
 * @param {string} dir
 * @param {RegExp} pattern
 * @returns {Array}
 */
function listFiles(dir, pattern) {
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
			} else if (pattern.test(entry.name)) {
				result.push(path.relative(dir, full).split(path.sep).join('/'));
			}
		});
	}(dir));
	return result.sort();
}

/**
 * Facts of the base output of a page directory (or of inter-page/)
 * @param {string} dir
 * @returns {Object} {calls: [{from, to}], handlers, throwingLines: Set}
 */
function baseFactsOf(dir) {
	'use strict';
	var facts = {calls: [], handlers: false, throwingLines: new Set()};
	listFiles(dir, /\.hierarchy\.dot$/).forEach(function (file) {
		parseHierarchy(fs.readFileSync(path.join(dir, file), 'utf8')).forEach(function (edge) {
			if (edge.type === 'call' || edge.type === 'recursive call') {
				facts.calls.push({from: edge.from, to: edge.to});
			} else if (edge.type === 'onEvent') {
				facts.handlers = true;
			}
		});
	});
	listFiles(dir, /\.graph\.dot$/).filter(function (file) {
		return /(^|\/)intra-procedurals\//.test(file);
	}).forEach(function (file) {
		var graph = parseGraph(fs.readFileSync(path.join(dir, file), 'utf8'));
		graph.edges.forEach(function (edge) {
			var line = edge.type === 'exception' ? base006.lineOf(graph.labels.get(edge.from) || '') : null;
			if (line !== null) {
				facts.throwingLines.add(line);
			}
		});
	});
	return facts;
}

function mergeBaseFacts(list) {
	'use strict';
	var facts = {calls: [], handlers: false, throwingLines: new Set()};
	list.forEach(function (item) {
		[].push.apply(facts.calls, item.calls);
		facts.handlers = facts.handlers || item.handlers;
		item.throwingLines.forEach(function (line) {
			facts.throwingLines.add(line);
		});
	});
	return facts;
}

/**
 * Whether a def of a pair reaches an exceptional path to its use on a graph
 * @param {Object} graph result of parseGraph
 * @param {string} defLabel normalized
 * @param {string} useLabel normalized (the decision of a p-use)
 * @returns {boolean}
 */
function exceptionalPath(graph, defLabel, useLabel) {
	'use strict';
	var successors = new Map(),
		throwTargets = new Map();
	graph.edges.forEach(function (edge) {
		successors.set(edge.from, (successors.get(edge.from) || []).concat([edge.to]));
		if (edge.type === 'exception') {
			throwTargets.set(edge.from, (throwTargets.get(edge.from) || []).concat([edge.to]));
		}
	});
	function reach(starts) {
		var seen = new Set(),
			stack = starts.slice();
		while (stack.length > 0) {
			var node = stack.pop();
			if (!seen.has(node)) {
				seen.add(node);
				[].push.apply(stack, successors.get(node) || []);
			}
		}
		return seen;
	}
	var nodesOf = function (label) {
			var nodes = [];
			graph.labels.forEach(function (value, node) {
				if (value === label) {
					nodes.push(node);
				}
			});
			return nodes;
		},
		uses = nodesOf(useLabel);
	return uses.length > 0 && nodesOf(defLabel).some(function (def) {
		var reached = reach(successors.get(def) || []),
			found = false;
		reached.forEach(function (node) {
			if (!found && throwTargets.has(node)) {
				var after = reach(throwTargets.get(node));
				found = uses.some(function (use) {
					return after.has(use);
				});
			}
		});
		return found;
	});
}

/* ---------- §2 facts of a page source ---------- */

function emptySourceFacts() {
	'use strict';
	return {tries: [], callLines: new Set(), hasCall: false, d2Sites: [], conservativeCalls: [], error: null};
}

/**
 * Whether a function node is a generator or async function
 * @param {Object} node
 * @returns {boolean}
 */
function isConservative(node) {
	'use strict';
	return !!node && /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type) &&
		(!!node.generator || !!node.async);
}

/**
 * Facts of a page source: try statements with a finalizer, call lines,
 * D2 call sites and calls of generator/async functions
 * @param {string} source
 * @returns {Object}
 */
function sourceFactsOf(source) {
	'use strict';
	var facts = emptySourceFacts(), ast, manager;
	try {
		ast = base006.parse(source);
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
		conservativeNames = new Set(),
		functionStack = [];
	manager.scopes.forEach(function (scope) {
		scope.references.forEach(function (reference) {
			referenceOf.set(reference.identifier, reference);
		});
	});
	base006.walk(ast, function (node) {
		if (node.type === 'TryStatement' && !!node.finalizer) {
			facts.tries.push({start: node.loc.start.line, end: node.loc.end.line});
		} else if (node.type === 'FunctionDeclaration' && !!node.id && isConservative(node)) {
			conservativeNames.add(node.id.name);
		} else if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && isConservative(node.init)) {
			conservativeNames.add(node.id.name);
		}
	});
	(function visit(node) {
		if (!node || typeof node.type !== 'string') {
			return;
		}
		var isFunction = /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type);
		if (isFunction) {
			functionStack.push(node);
		}
		if (node.type === 'CallExpression' || node.type === 'NewExpression') {
			facts.hasCall = true;
			// Only the lines from the start of the call to the end of the callee are
			// call points: the bodies of IIFEs and of callbacks in the arguments are not.
			var lastLine = /Function/.test(node.callee.type) ? node.loc.start.line : node.callee.loc.end.line;
			for (var line = node.loc.start.line; line <= lastLine; ++line) {
				facts.callLines.add(line);
			}
			recordCall(node, functionStack[functionStack.length - 1] || null);
		}
		(espree.VisitorKeys[node.type] || []).forEach(function (key) {
			[].concat(node[key] || []).forEach(visit);
		});
		if (isFunction) {
			functionStack.pop();
		}
	}(ast));
	function recordCall(node, caller) {
		if (node.callee.type !== 'Identifier') {
			return;
		}
		var name = node.callee.name,
			line = node.callee.loc.start.line;
		if (node.type === 'CallExpression' && conservativeNames.has(name)) {
			facts.conservativeCalls.push({line: line, text: 'L' + line + ' `' + name + '()`：generator／async'});
		}
		var reference = referenceOf.get(node.callee),
			variable = reference ? reference.resolved : null;
		if (node.type !== 'CallExpression' || !caller || !variable || variable.defs.length === 0) {
			return;
		}
		var def = variable.defs[0],
			isD2 = def.type === 'FunctionName' ||
				(def.type === 'Variable' && !!def.parent && (def.parent.kind === 'let' || def.parent.kind === 'const'));
		if (isD2) {
			facts.d2Sites.push({
				line: line,
				callee: name,
				caller: caller.type === 'FunctionDeclaration' && !!caller.id ? caller.id.name : null
			});
		}
	}
	return facts;
}

/**
 * Whether a D2 site is linked by a call edge of the base
 * @param {Object} site
 * @param {Array} calls [{from, to}]
 * @returns {boolean}
 */
function isLinked(site, calls) {
	'use strict';
	return calls.some(function (call) {
		var from = lastSegment(call.from);
		return lastSegment(call.to) === site.callee &&
			(site.caller !== null ? from === site.caller : /^\$ANONYMOUS_FUN_\d+$/.test(from));
	});
}

/**
 * Triggers of a page (§2) from its source facts and base facts
 * @param {Object} source
 * @param {Object} baseFacts
 * @returns {Array} [{kind, line, text}]
 */
function triggersOf(source, baseFacts) {
	'use strict';
	var triggers = [];
	source.d2Sites.forEach(function (site) {
		if (!isLinked(site, baseFacts.calls)) {
			triggers.push({kind: '連結', line: site.line, text: 'L' + site.line + ' `' + site.callee + '()`（' +
				(site.caller || '函式運算式') + ' 內）：基準未連結'});
		}
	});
	source.tries.forEach(function (item) {
		triggers.push({kind: 'finally', line: item.start, text: 'L' + item.start + '–L' + item.end + ' try…finally'});
	});
	source.conservativeCalls.forEach(function (call) {
		triggers.push({kind: '保守摘要', line: call.line, text: call.text});
	});
	if (baseFacts.calls.length > 0 || baseFacts.handlers) {
		triggers.push({kind: '摘要', line: null, text: (baseFacts.calls.length > 0 ? '基準有 call 邊' : '') +
			(baseFacts.calls.length > 0 && baseFacts.handlers ? '、' : '') + (baseFacts.handlers ? 'LOOP 有處理器' : '')});
	}
	return triggers;
}

function unionSourceFacts(list) {
	'use strict';
	var facts = emptySourceFacts();
	list.forEach(function (item) {
		[].push.apply(facts.tries, item.tries);
		item.callLines.forEach(function (line) {
			facts.callLines.add(line);
		});
		facts.hasCall = facts.hasCall || item.hasCall;
		[].push.apply(facts.d2Sites, item.d2Sites);
		[].push.apply(facts.conservativeCalls, item.conservativeCalls);
	});
	return facts;
}

/* ---------- §2 classification ---------- */

function hasKind(triggers, kind) {
	'use strict';
	return triggers.some(function (trigger) {
		return trigger.kind === kind;
	});
}

/**
 * Categories of a difference
 * @param {Object} diff a difference of compareCase
 * @param {Object} page {source, base, triggers, graphsOf}
 * @returns {Array} in ORDER
 */
function categoriesOf(diff, page) {
	'use strict';
	var found = new Set(),
		intraProcedural = /^intra-procedurals\//.test(diff.file),
		link = hasKind(page.triggers, '連結'),
		fin = page.source.tries.length > 0,
		calls = page.base.calls.length > 0;
	if (diff.unit === 'pair') {
		var labels = pairLabels(diff.content),
			parts = base006.pairParts(diff.content),
			defLabel = labels.def,
			useLabel = labels.decision;
		if (diff.sign === '-' && labels.use === 'entry') {
			found.add('§18');
		}
		if (link) {
			found.add('連結');
		}
		if (fin && page.source.tries.some(function (item) {
			return [parts.defLine, parts.useLine].some(function (line) {
				return line !== null && line >= item.start && line <= item.end;
			}) || (parts.useLine !== null && parts.useLine > item.start);
		})) {
			found.add('finally');
		}
		if (diff.sign === '-' && parts.defLine !== null && page.base.throwingLines.has(parts.defLine)) {
			found.add('例外IN');
		}
		if (diff.sign === '+' && page.graphsOf(diff).some(function (graph) {
			return exceptionalPath(graph, defLabel, useLabel);
		})) {
			found.add('例外IN');
		}
		var atCall = /^(call|callReturn)$/.test(defLabel) || (parts.defLine !== null && page.source.callLines.has(parts.defLine));
		if (!intraProcedural && calls && atCall) {
			found.add('Q-a');
		}
		if (diff.sign === '-' && !intraProcedural && (calls || page.base.handlers)) {
			found.add('摘要');
		}
		if (!intraProcedural && page.source.conservativeCalls.length > 0) {
			found.add('保守摘要');
		}
	} else if (diff.unit === 'row' || diff.unit === 'model') {
		if (link) {
			found.add('連結');
		}
	} else if (diff.unit === 'graph') {
		if (link) {
			found.add('連結');
		}
		if (fin) {
			found.add('finally');
		}
		if (!intraProcedural && calls) {
			found.add('Q-a');
		}
		if (page.source.hasCall || fin || link) {
			found.add('共通');
		}
	}
	return ORDER.filter(function (category) {
		return found.has(category);
	});
}

/**
 * Whether a difference recorded under a category is pinned (§2)
 * @param {string} category
 * @param {string} sign
 * @returns {boolean}
 */
function isPinned(category, sign) {
	'use strict';
	return PINNED.indexOf(category) !== -1 || (category === '例外IN' && sign === '+');
}

/**
 * Matching files of a new output: [{file, problem}] (problem null when valid)
 * @param {string} newDir
 * @returns {Array}
 */
function matchingOf(newDir) {
	'use strict';
	return listFiles(newDir, /\.matching\.json$/).map(function (file) {
		var reasons = [],
			graph = file.replace(/\.matching\.json$/, '.graph.dot');
		try {
			var data = JSON.parse(fs.readFileSync(path.join(newDir, file), 'utf8'));
			if (!data || data.format !== MATCHING_FORMAT) {
				reasons.push('format 不是 ' + MATCHING_FORMAT);
			}
		} catch (error) {
			reasons.push('不是 JSON（' + error.message + '）');
		}
		if (!fs.existsSync(path.join(newDir, graph))) {
			reasons.push('缺少同索引的 ' + path.basename(graph));
		}
		return {file: file, problem: reasons.length > 0 ? reasons.join('；') : null};
	});
}

/**
 * Compare the outputs of a case (006 comparison) and classify each
 * difference with the categories of feature 005
 * @param {Object} spec {name, pageSources, baseDir, newDir}
 * @returns {Object} {name, diffs, triggers: {page: [trigger]}, errors, matching}
 */
function compareCase(spec) {
	'use strict';
	var compared = base006.compareCase(spec),
		sources = spec.pageSources.map(sourceFactsOf),
		pages = {},
		triggers = {},
		errors = [],
		graphCache = new Map();
	sources.forEach(function (facts, index) {
		if (facts.error) {
			errors.push(spec.name + ' page' + index + '：無法剖析（' + facts.error + '）');
		}
	});
	var pageBases = sources.map(function (facts, index) {
		return baseFactsOf(path.join(spec.baseDir, 'page' + index));
	});
	function graphsOf(dir, diff) {
		var files = /\*\.dupairs\.dot$/.test(diff.file) ?
			listFiles(path.join(dir, path.dirname(diff.file)), /\.graph\.dot$/).map(function (file) {
				return path.join(path.dirname(diff.file), file);
			}) : [diff.file.replace(/\.dupairs\.dot$/, '.graph.dot')];
		return files.map(function (file) {
			var full = path.join(dir, file);
			if (!graphCache.has(full)) {
				graphCache.set(full, fs.existsSync(full) ? parseGraph(fs.readFileSync(full, 'utf8')) : null);
			}
			return graphCache.get(full);
		}).filter(function (graph) {
			return graph !== null;
		});
	}
	function pageOf(key, source, baseFacts, dir) {
		pages[key] = {
			source: source,
			base: baseFacts,
			triggers: triggersOf(source, baseFacts),
			graphsOf: function (diff) {
				return graphsOf(dir, diff);
			}
		};
		triggers[key] = pages[key].triggers;
	}
	sources.forEach(function (facts, index) {
		pageOf('page' + index, facts, pageBases[index], path.join(spec.baseDir, 'page' + index));
	});
	pageOf('inter-page', unionSourceFacts(sources),
		mergeBaseFacts(pageBases.concat([baseFactsOf(path.join(spec.baseDir, 'inter-page'))])),
		path.join(spec.baseDir, 'inter-page'));
	compared.diffs.forEach(function (diff) {
		diff.categories = pages[diff.page] ? categoriesOf(diff, pages[diff.page]) : [];
		delete diff.derived;
	});
	return {name: spec.name, diffs: compared.diffs, triggers: triggers, errors: errors, matching: matchingOf(spec.newDir)};
}

/* ---------- §3 report and record ---------- */

function pinKey(caseName, page, category) {
	'use strict';
	return [caseName, page, category].join('\u0000');
}

function matchingLine(results) {
	'use strict';
	var count = 0, bad = 0;
	results.forEach(function (result) {
		count += result.matching.length;
		bad += result.matching.filter(function (item) {
			return item.problem !== null;
		}).length;
	});
	return 'matching：' + count + ' 個 `*.matching.json`（新增檔，不計入差異）' + (bad > 0 ? '，' + bad + ' 個格式不符' : '');
}

/**
 * Markdown of the two machine sections (category: the first valid one in
 * ORDER; the others are noted in the note column)
 * @param {Array} results results of compareCase
 * @returns {string}
 */
function buildReport(results) {
	'use strict';
	var diffs = base006.allDiffs(results),
		lines = [diffs.length === 0 ? '無差異' : diffs.length + ' 筆差異', '', NET_HEADING, '',
			'| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |',
			'|---|------|----|------------|------|---|------|------|----|------|'],
		pins = new Map();
	diffs.forEach(function (diff, index) {
		var category = diff.categories[0] || '（無成立類別）',
			note = diff.categories.length > 1 ? '（亦符：' + diff.categories.slice(1).join('、') + '）' : '';
		lines.push('| ' + [index + 1, diff.caseName, diff.page, diff.file, diff.unit, diff.sign, '`' + diff.content + '`',
			category, FR_OF[category] || '', note].join(' | ') + ' |');
		if (isPinned(category, diff.sign)) {
			var key = pinKey(diff.caseName, diff.page, category),
				entry = pins.get(key) || {plus: 0, minus: 0, numbers: []};
			entry[diff.sign === '+' ? 'plus' : 'minus']++;
			entry.numbers.push(index + 1);
			pins.set(key, entry);
		}
	});
	lines.push('', PIN_HEADING, '', '| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |',
		'|------|----|------|------|---|---|------|------|');
	pins.forEach(function (entry, key) {
		var parts = key.split('\u0000'),
			result = results.filter(function (item) {
				return item.name === parts[0];
			})[0],
			kind = parts[2],
			triggerText = (result.triggers[parts[1]] || []).filter(function (trigger) {
				return trigger.kind === kind;
			}).map(function (trigger) {
				return trigger.text;
			}).join('；');
		lines.push('| ' + [parts[0], parts[1], kind, triggerText, entry.plus, entry.minus, '',
			'草擬，待簽核（' + base006.rowNumbers(entry.numbers) + '）'].join(' | ') + ' |');
	});
	lines.push('', matchingLine(results));
	return lines.join('\n') + '\n';
}

/**
 * Check a record against the actual differences (§2, §3)
 * @param {Array} results results of compareCase
 * @param {string} text the record
 * @returns {Array} problems (empty when it passes)
 */
function verifyRecord(results, text) {
	'use strict';
	var problems = [],
		net = base006.tableOf(text, '## 淨差異'),
		pinTable = base006.tableOf(text, PIN_HEADING);
	results.forEach(function (result) {
		(result.matching || []).forEach(function (item) {
			if (item.problem !== null) {
				problems.push('matching 檔 ' + result.name + ' ' + item.file + '：' + item.problem);
			}
		});
	});
	if (net === null || pinTable === null) {
		return problems.concat(['紀錄缺少機器區塊（淨差異／釘選與簽核）']);
	}
	var actual = new Map(),
		pins = new Map();
	base006.allDiffs(results).forEach(function (diff) {
		var key = base006.keyOf(diff.caseName, diff.page, diff.file, diff.unit, diff.sign, diff.content);
		actual.set(key, (actual.get(key) || []).concat([diff]));
	});
	net.forEach(function (cells) {
		var label = '淨差異 #' + cells[0] + '（' + cells.slice(1, 7).join(' ') + '）',
			sign = base006.normalizeSign(cells[5]),
			key = base006.keyOf(cells[1], cells[2], cells[3], cells[4], sign, base006.unquote(cells[6] || '')),
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
			return;
		}
		if (isPinned(category, diff.sign)) {
			if (!note) {
				problems.push(label + '：釘選類別「' + category + '」的說明必填');
			}
			var pin = pinKey(diff.caseName, diff.page, category),
				entry = pins.get(pin) || {plus: 0, minus: 0};
			entry[diff.sign === '+' ? 'plus' : 'minus']++;
			pins.set(pin, entry);
		}
	});
	actual.forEach(function (rest) {
		rest.forEach(function (diff) {
			problems.push('差異未記錄：' + [diff.caseName, diff.page, diff.file, diff.unit, diff.sign, '`' + diff.content + '`'].join(' ') +
				'（成立類別：' + (diff.categories.join('、') || '無') + '）');
		});
	});
	var listed = new Set();
	pinTable.forEach(function (cells) {
		var key = pinKey(cells[0], cells[1], cells[2]),
			name = '釘選與簽核：' + [cells[0], cells[1], cells[2]].join(' '),
			entry = pins.get(key);
		if (listed.has(key)) {
			problems.push(name + ' 重複列');
		}
		listed.add(key);
		if (!entry) {
			problems.push(name + ' 實際 0 筆（或頁不存在），不得列');
		} else if (Number(cells[4]) !== entry.plus || Number(cells[5]) !== entry.minus) {
			problems.push(name + ' 釘選 +' + cells[4] + '／−' + cells[5] + '，實際 +' + entry.plus + '／−' + entry.minus);
		}
		if (!(cells[6] || '').trim()) {
			problems.push(name + ' 的說明必填');
		}
	});
	pins.forEach(function (entry, key) {
		if (!listed.has(key)) {
			problems.push('釘選與簽核：' + key.split('\u0000').join(' ') + ' 未列（實際 +' + entry.plus + '／−' + entry.minus + '）');
		}
	});
	return problems;
}

/* ---------- §4 inputs ---------- */

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
	return base006.goldenCases().map(function (item) {
		return compareCase({
			name: item.name,
			pageSources: item.pages.map(function (files) {
				return base006.pageSource(files.map(function (file) {
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
	var pages = JSON.parse(fs.readFileSync(path.join(MDN_CORPUS, 'pages.json'), 'utf8')),
		codesFile = path.join(MDN_BASE, 'exitcodes.json');
	if (!fs.existsSync(codesFile)) {
		throw new Error('找不到 MDN 基準：' + codesFile);
	}
	var baseCodes = JSON.parse(fs.readFileSync(codesFile, 'utf8'));
	return Object.keys(pages).sort().map(function (id) {
		var filesOfPages = pages[id].map(function (files) {
				return files.map(function (file) {
					return path.join(MDN_CORPUS, 'corpus', file);
				});
			}),
			run = base006.runCli(filesOfPages, work),
			result = compareCase({
				name: id,
				pageSources: filesOfPages.map(base006.pageSource),
				baseDir: path.join(MDN_BASE, id),
				newDir: run.outDir
			});
		result.exitCode = {base: Object.prototype.hasOwnProperty.call(baseCodes, id) ? baseCodes[id] : null, now: run.status};
		return result;
	});
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
		base = fs.existsSync(headerFile) ? base006.baseOf(fs.readFileSync(headerFile, 'utf8')) : null;
		if (!base) {
			err('無法取得 golden 基準：' + headerFile + ' 檔頭未填基準 commit，且未給 --base');
			return 2;
		}
	}
	var work = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck005-')),
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
		codes = base006.exitCodesOf(results);
	}
	var errors = [].concat.apply([], results.map(function (result) {
		return result.errors;
	}));
	if (report) {
		var text = buildReport(results);
		if (codes.problems.length > 0) {
			text = text.replace(/^無差異\n/, 'CLI exit code 有變化\n');
		}
		out((mode === 'golden' ? '<!-- diffcheck 005 golden，基準 ' + base + ' -->\n' : '<!-- diffcheck 005 mdn -->\n') +
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
	out('通過：' + base006.allDiffs(results).length + ' 筆差異皆已記錄且判準成立');
	return 0;
}

module.exports = {
	normalizeLabel: normalizeLabel,
	parseDupairs: function (text) {
		'use strict';
		return base006.parseDupairs(text).map(function (row) {
			return {name: row.name, pairs: row.pairs};
		});
	},
	parseGraph: parseGraph,
	parseHierarchy: parseHierarchy,
	sourceFactsOf: sourceFactsOf,
	exceptionalPath: exceptionalPath,
	compareCase: compareCase,
	buildReport: buildReport,
	verifyRecord: verifyRecord,
	baseOf: base006.baseOf,
	main: main
};

if (require.main === module) {
	process.exitCode = main(process.argv.slice(2));
}
