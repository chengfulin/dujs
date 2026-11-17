/*
 * Difference check of feature 007 (FR-008, FR-009, SC-003, SC-004;
 * contracts/diff-check.md): compare the outputs of develop (edc22d5) with
 * those of this branch, pairs as sets, with the duplicate rows listed apart,
 * the call labels of the base side rewritten with its *.matching.json, and
 * every difference classified with the categories of feature 007 (連結,
 * 求值順序, 返回後例外, KI classes, 標記, 共通). The parsing and record
 * helpers are those of specs/005-summary-analysis/tools/diffcheck.js and
 * specs/006-eslint-scope/tools/diffcheck.js. Not part of dujs, not run by
 * npm test.
 *
 *   node specs/007-split-call-nodes/tools/diffcheck.js golden [--base <commit>] --report
 *   node specs/007-split-call-nodes/tools/diffcheck.js golden [--base <commit>] --verify <golden-diff.md>
 *   node specs/007-split-call-nodes/tools/diffcheck.js mdn --report
 *   node specs/007-split-call-nodes/tools/diffcheck.js mdn --verify <mdn-diff.md>
 *
 * Exit status: 0 passed (or report written), 1 problems found by --verify,
 * 2 usage error or no base (no base line and no --base, a base commit that
 * git cannot read, no MDN snapshot, or a base model with a CALL node and no
 * *.matching.json).
 *
 * Interpretations of the contract kept here:
 * - Label rewriting (§1): a model is the files of one index of one level
 *   (0.graph.dot, 0.dupairs.dot, 0.matching.json). Its base side is rewritten
 *   only when the *.graph.dot of this branch has a node label="call (". The
 *   CALL node of a record takes "call (<callSiteLine><path>)", where <path>
 *   is the branch path of the label of its CALL RETURN when that one already
 *   carries one ("callReturn (6:T)", KI §15, kept as is); a plain CALL RETURN
 *   takes "callReturn (<callSiteLine>)". Every other label keeps its plain
 *   form, and the suffixes of equal labels are given again as
 *   cfggraphconverter does (a normal node "3a", a typed node "call (4)_a"), in
 *   the node order of the file.
 * - A difference that disappears only because of the rewriting is listed as
 *   one "~" difference of the file (graph unit) or of the variable (row unit,
 *   when every pair difference of that variable disappears), category 標記.
 * - Duplicate rows (data-model §6): per *.dupairs.dot and per row, the
 *   occurrences of a normalized pair after its first; the base side after the
 *   rewriting.
 * - Facts of the output of a page (base and this branch): call sites are the
 *   records (callSiteLine, callee) of every *.matching.json of the page
 *   directory (the inter-page level: of all pages and inter-page/), callee
 *   line ranges come from the intra-procedural *.graph.dot of the scope
 *   (graph label "...[ <scope> ]"), call edges from every *.hierarchy.dot,
 *   decisions (out-edges "true"/"false") with an exception out-edge from the
 *   other *.graph.dot files.
 * - 連結: a line whose set of callees of this branch is not empty and differs
 *   from that of the base. 求值順序: the call site lines of this branch.
 *   決策返回不拋錯: a call site line of a decision with an exception out-edge
 *   in the base and none in this branch; a removed pair whose use is after
 *   that line or in a catch/finally block.
 * - KI classes: §37 a call of a generator/async function on the page; §38 a
 *   try with a finally, the pair in or after it (005 rule); §41 a loop listing
 *   one handler more than once; §43 a callee called from two or more scopes,
 *   the pair in its lines.
 * - class static (§2): a base record whose callee is an $ANONYMOUS_FUN_k scope
 *   missing in this branch, on the lines of a class with static members whose
 *   position is a case test (§44), the left of for-in/of, after "?.", a
 *   destructuring default or a catch parameter (§46).
 * - 共通（段0例外） (DECISION 008): per *.graph.dot "~" difference; the
 *   records are those of the *.matching.json of the same model, compared by
 *   id with their keys sorted; the decision node is a normal successor of the
 *   CALL RETURN of the base with a "true"/"false" out-edge. The report lists
 *   "callNode → target（record id）" in the note column.
 * - The pin table counts + and − of pairs, rows and models; "~" is listed by
 *   its row number only (005 rule). 標記 and 共通 are not pinned.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var childProcess = require('child_process'),
	crypto = require('crypto'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var espree = require('espree');
var base005 = require('../../005-summary-analysis/tools/diffcheck.js'),
	base006 = require('../../006-eslint-scope/tools/diffcheck.js');

var ROOT = path.resolve(__dirname, '..', '..', '..'),
	FEATURE = path.resolve(__dirname, '..'),
	MDN_CORPUS = path.join(ROOT, 'specs', '006-eslint-scope', 'mdn'),
	MDN_BASE = path.join(FEATURE, 'mdn', 'baseline-develop'),
	ORDER = ['連結', '求值順序（判別式）', '求值順序（可迭代）', '求值順序', '返回後例外（決策返回不拋錯）', '返回後例外',
		'§37', '§38', '§41', '§43', '§44', '§46', '標記', '共通（段0例外）', '共通'],
	FR_OF = {
		'連結': 'FR-001', '求值順序': 'FR-002–FR-004', '返回後例外': 'FR-005', '§44': 'FR-001 例外', '§46': 'FR-001 例外',
		'標記': 'FR-007', '共通': '—'
	},
	NET_HEADING = '## 淨差異（相對 develop）',
	DUP_HEADING = '## 重複列數',
	PIN_HEADING = '## 釘選與簽核',
	STATIC_HEADING = '## class static 不再連結',
	CALL_LABEL = /^call(_[a-z]+)?$/,
	RETURN_LABEL = /^callReturn(_[a-z]+)?$/,
	PATHED_RETURN = /^callReturn \((\d+)(:[TF]+)?\)(_[a-z]+)?$/,
	FUNCTION_TYPE = /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/;

/* ---------- §1 label rewriting ---------- */

/**
 * Suffix letters of the index of a same label (cfggraphconverter.js
 * computeLabelIndex, kept as it is)
 * @param {number} index
 * @returns {string}
 */
function computeLabelIndex(index) {
	'use strict';
	var chara = 97, charz = 122,
		divided = index, remainder,
		computed = '';
	do {
		remainder = divided % (charz - chara + 1);
		computed = String.fromCharCode(chara + remainder) + computed;
		divided = Math.floor(index / (charz - chara + 1));
	} while (divided !== 0 && computed.length < 4);
	return computed;
}

/**
 * Nodes of a *.graph.dot text in file order
 * @param {string} text
 * @returns {Array} [{id, label}]
 */
function graphNodes(text) {
	'use strict';
	var nodes = [];
	text.split('\n').forEach(function (line) {
		var node = /^\s*(\w+) \[label="([^"]*)"/.exec(line);
		if (node) {
			nodes.push({id: node[1], label: node[2]});
		}
	});
	return nodes;
}

/**
 * A label without the suffix telling apart same labels
 * @param {string} label
 * @returns {string}
 */
function plainOf(label) {
	'use strict';
	var normal = /^(\d+(?::[TF]+)?)[a-z]+$/.exec(label);
	if (normal) {
		return normal[1];
	}
	var typed = /^(.+)_[a-z]+$/.exec(label);
	return typed ? typed[1] : label;
}

/**
 * Whether a graph has a CALL node (either labeling)
 * @param {string} text
 * @returns {boolean}
 */
function hasCallNode(text) {
	'use strict';
	return graphNodes(text).some(function (node) {
		return CALL_LABEL.test(node.label) || node.label.indexOf('call (') === 0;
	});
}

/**
 * Whether the graph of this branch triggers the rewriting (§1 step 0)
 * @param {string} text
 * @returns {boolean}
 */
function triggersRewrite(text) {
	'use strict';
	return text.indexOf('label="call (') !== -1;
}

/**
 * Rewrite the call labels of a base *.graph.dot with its matching (§1)
 * @param {string} text base graph
 * @param {Object|null} matching parsed *.matching.json of the same model
 * @returns {Object} {text, map: Map(old label -> new label)}
 */
function rewriteLabels(text, matching) {
	'use strict';
	var nodes = graphNodes(text),
		labelOf = new Map(),
		rewritten = new Map(),
		map = new Map();
	nodes.forEach(function (node) {
		labelOf.set(node.id, node.label);
		map.set(node.label, node.label);
	});
	((matching && matching.calls) || []).forEach(function (record) {
		var call = labelOf.get(record.callNode),
			ret = labelOf.get(record.callReturn),
			pathed = ret !== undefined ? PATHED_RETURN.exec(ret) : null;
		if (call !== undefined && CALL_LABEL.test(call)) {
			rewritten.set(record.callNode, 'call (' + record.callSiteLine + (pathed && pathed[2] ? pathed[2] : '') + ')');
		}
		if (ret !== undefined && RETURN_LABEL.test(ret)) {
			rewritten.set(record.callReturn, 'callReturn (' + record.callSiteLine + ')');
		}
	});
	if (rewritten.size === 0) {
		return {text: text, map: map};
	}
	var plains = nodes.map(function (node) {
			return rewritten.get(node.id) || plainOf(node.label);
		}),
		counts = new Map(),
		seen = new Map(),
		newOf = new Map();
	plains.forEach(function (plain) {
		counts.set(plain, (counts.get(plain) || 0) + 1);
	});
	nodes.forEach(function (node, index) {
		var plain = plains[index],
			label = plain;
		if (counts.get(plain) > 1) {
			var order = seen.get(plain) || 0;
			seen.set(plain, order + 1);
			label = /^\d/.test(plain) ? plain + computeLabelIndex(order) : plain + '_' + computeLabelIndex(order);
		}
		newOf.set(node.id, label);
		map.set(node.label, label);
	});
	return {
		text: text.split('\n').map(function (line) {
			return line.replace(/^(\s*)(\w+) \[label="([^"]*)"/, function (all, indent, id) {
				return indent + id + ' [label="' + newOf.get(id) + '"';
			});
		}).join('\n'),
		map: map
	};
}

function mapLabel(label, map) {
	'use strict';
	var key = label.trim();
	return map.has(key) ? map.get(key) : label;
}

/**
 * Rewrite the labels of one dupairs cell "(def,use)" / "(def,(d,t))"
 * @param {string} cell
 * @param {Map} map
 * @returns {string}
 */
function rewriteCell(cell, map) {
	'use strict';
	var parts = base006.splitPair(cell);
	if (!parts) {
		return cell;
	}
	var use = base006.splitPair(parts[1]);
	return '(' + mapLabel(parts[0], map) + ',' +
		(use ? '(' + mapLabel(use[0], map) + ',' + mapLabel(use[1], map) + ')' : mapLabel(parts[1], map)) + ')';
}

/**
 * Rewrite every cell of a *.dupairs.dot text
 * @param {string} text
 * @param {Map} map
 * @returns {string}
 */
function rewriteDupairs(text, map) {
	'use strict';
	return text.replace(/<td>([^<]*)<\/td>/g, function (all, cell) {
		return '<td>' + rewriteCell(cell, map) + '</td>';
	});
}

/**
 * Duplicate rows of a *.dupairs.dot text (data-model §6)
 * @param {string} text
 * @returns {number}
 */
function duplicateCount(text) {
	'use strict';
	return base006.parseDupairs(text).reduce(function (sum, row) {
		return sum + row.pairs.length - new Set(row.pairs).size;
	}, 0);
}

/* ---------- facts of the outputs and of the source ---------- */

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

function emptyOutputFacts() {
	'use strict';
	return {records: [], edges: [], ranges: new Map(), excDecisions: new Set(), handlerDup: false};
}

/**
 * Facts of the output directory of a page (or of inter-page/)
 * @param {string} dir
 * @returns {Object} {records: [{line, callee}], edges: [{from, to}], ranges, excDecisions, handlerDup}
 */
function outputFactsOf(dir) {
	'use strict';
	var facts = emptyOutputFacts();
	listFiles(dir, /\.matching\.json$/).forEach(function (file) {
		var data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
		(data.calls || []).forEach(function (record) {
			facts.records.push({line: record.callSiteLine, callee: record.callee});
		});
		(data.loops || []).forEach(function (loop) {
			var scopes = (loop.handlers || []).map(function (handler) {
				return handler.scope;
			});
			facts.handlerDup = facts.handlerDup || new Set(scopes).size < scopes.length;
		});
	});
	listFiles(dir, /\.hierarchy\.dot$/).forEach(function (file) {
		base005.parseHierarchy(fs.readFileSync(path.join(dir, file), 'utf8')).forEach(function (edge) {
			if (edge.type === 'call' || edge.type === 'recursive call') {
				facts.edges.push({from: edge.from, to: edge.to});
			}
		});
	});
	listFiles(dir, /\.graph\.dot$/).forEach(function (file) {
		var text = fs.readFileSync(path.join(dir, file), 'utf8'),
			graph = base005.parseGraph(text);
		if (/(^|\/)intra-procedurals\//.test(file)) {
			var title = /^label = "[^"[]*\[ (.*) \]"/m.exec(text),
				lines = [];
			graph.labels.forEach(function (label) {
				var line = base006.lineOf(label);
				if (line !== null) {
					lines.push(line);
				}
			});
			if (title && lines.length > 0) {
				facts.ranges.set(title[1], {start: Math.min.apply(null, lines), end: Math.max.apply(null, lines)});
			}
			return;
		}
		var decisions = new Set(), throwing = new Set();
		graph.edges.forEach(function (edge) {
			if (edge.type === 'true' || edge.type === 'false') {
				decisions.add(edge.from);
			} else if (edge.type === 'exception') {
				throwing.add(edge.from);
			}
		});
		decisions.forEach(function (node) {
			var line = base006.lineOf(graph.labels.get(node) || '');
			if (throwing.has(node) && line !== null) {
				facts.excDecisions.add(line);
			}
		});
	});
	return facts;
}

function mergeOutputFacts(list) {
	'use strict';
	var facts = emptyOutputFacts();
	list.forEach(function (item) {
		[].push.apply(facts.records, item.records);
		[].push.apply(facts.edges, item.edges);
		item.ranges.forEach(function (range, scope) {
			facts.ranges.set(scope, range);
		});
		item.excDecisions.forEach(function (line) {
			facts.excDecisions.add(line);
		});
		facts.handlerDup = facts.handlerDup || item.handlerDup;
	});
	return facts;
}

function emptySourceFacts() {
	'use strict';
	return {tries: [], caseLines: new Set(), iterables: [], staticClasses: [], conservative: false, error: null};
}

/**
 * Whether an expression evaluates a call (nested functions excluded)
 * @param {Object} node
 * @returns {boolean}
 */
function containsCall(node) {
	'use strict';
	var found = false;
	(function visit(current) {
		if (found || !current || typeof current.type !== 'string' || FUNCTION_TYPE.test(current.type)) {
			return;
		}
		if (current.type === 'CallExpression' || current.type === 'NewExpression') {
			found = true;
			return;
		}
		(espree.VisitorKeys[current.type] || []).forEach(function (key) {
			[].concat(current[key] || []).forEach(visit);
		});
	}(node));
	return found;
}

/**
 * Whether the part of a chain after a node is evaluated after a "?."
 * @param {Object} node CallExpression or MemberExpression
 * @returns {boolean}
 */
function afterOptional(node) {
	'use strict';
	if (!node) {
		return false;
	}
	if (node.optional) {
		return true;
	}
	if (node.type === 'CallExpression') {
		return afterOptional(node.callee);
	}
	return node.type === 'MemberExpression' && afterOptional(node.object);
}

/**
 * Position of a class with static members (§2 class static): kind and line
 * of its CFG node, or null when it is evaluated as a call site
 * @param {Object} node the class
 * @param {Map} parentOf
 * @returns {Object|null} {kind, line}
 */
function staticPositionOf(node, parentOf) {
	'use strict';
	var kinds = [], host = null, child = node, parent = parentOf.get(node);
	while (parent && !FUNCTION_TYPE.test(parent.type)) {
		if (parent.type === 'SwitchCase' && parent.test === child) {
			kinds.push({kind: 'case test', line: parent.loc.start.line});
		} else if ((parent.type === 'ForInStatement' || parent.type === 'ForOfStatement') && parent.left === child) {
			kinds.push({kind: 'for-in/of 左側', line: parent.loc.start.line});
		} else if (parent.type === 'CatchClause' && parent.param === child) {
			kinds.push({kind: 'catch 參數', line: parent.loc.start.line});
		} else if (((parent.type === 'CallExpression' && parent.arguments.indexOf(child) !== -1) ||
			(parent.type === 'MemberExpression' && parent.computed && parent.property === child)) && afterOptional(parent)) {
			kinds.push({kind: '?. 之後', line: null});
		} else if (parent.type === 'AssignmentPattern' && parent.right === child && !FUNCTION_TYPE.test((parentOf.get(parent) || {}).type || '')) {
			kinds.push({kind: '解構預設值', line: null});
		}
		if (host === null && /Statement$|^VariableDeclaration$/.test(parent.type)) {
			host = parent.loc.start.line;
		}
		child = parent;
		parent = parentOf.get(parent);
	}
	var order = ['case test', 'for-in/of 左側', 'catch 參數', '?. 之後', '解構預設值'];
	kinds.sort(function (a, b) {
		return order.indexOf(a.kind) - order.indexOf(b.kind);
	});
	return kinds.length === 0 ? null : {kind: kinds[0].kind, line: kinds[0].line !== null ? kinds[0].line : (host || node.loc.start.line)};
}

/**
 * Facts of a page source: try blocks, case lines of a switch whose
 * discriminant has a call, for-in/of whose right has a call, classes with
 * static members not evaluated as call sites, calls of generator/async
 * functions
 * @param {string} source
 * @returns {Object}
 */
function sourceFactsOf(source) {
	'use strict';
	var facts = emptySourceFacts(), ast;
	try {
		ast = base006.parse(source);
	} catch (err) {
		facts.error = err.message;
		return facts;
	}
	var parentOf = new Map();
	base006.walk(ast, function (node, parent) {
		parentOf.set(node, parent);
		if (node.type === 'TryStatement') {
			facts.tries.push({
				start: node.loc.start.line,
				end: node.loc.end.line,
				finalizer: !!node.finalizer,
				blocks: [node.handler, node.finalizer].filter(Boolean).map(function (block) {
					return {start: block.loc.start.line, end: block.loc.end.line};
				})
			});
		} else if (node.type === 'SwitchStatement' && containsCall(node.discriminant)) {
			node.cases.forEach(function (item) {
				if (item.test) {
					facts.caseLines.add(item.loc.start.line);
				}
			});
		} else if ((node.type === 'ForInStatement' || node.type === 'ForOfStatement') && containsCall(node.right)) {
			facts.iterables.push({start: node.loc.start.line, end: node.loc.end.line});
		}
	});
	base006.walk(ast, function (node) {
		if (node.type !== 'ClassDeclaration' && node.type !== 'ClassExpression') {
			return;
		}
		var members = node.body.body.filter(function (member) {
			return member.type === 'StaticBlock' || (member.type === 'PropertyDefinition' && member.static && !!member.value);
		});
		var position = members.length > 0 ? staticPositionOf(node, parentOf) : null;
		if (position) {
			facts.staticClasses.push({kind: position.kind, line: position.line, end: node.loc.end.line,
				members: members.map(function (member) {
					return {start: member.loc.start.line, end: member.loc.end.line};
				})});
		}
	});
	facts.conservative = base005.sourceFactsOf(source).conservativeCalls.length > 0;
	return facts;
}

function unionSourceFacts(list) {
	'use strict';
	var facts = emptySourceFacts();
	list.forEach(function (item) {
		[].push.apply(facts.tries, item.tries);
		item.caseLines.forEach(function (line) {
			facts.caseLines.add(line);
		});
		[].push.apply(facts.iterables, item.iterables);
		[].push.apply(facts.staticClasses, item.staticClasses);
		facts.conservative = facts.conservative || item.conservative;
	});
	return facts;
}

/* ---------- §2 page triggers ---------- */

function within(range, line) {
	'use strict';
	return line !== null && line !== undefined && line >= range.start && line <= range.end;
}

function recordKey(record) {
	'use strict';
	return record.line + '\u0000' + record.callee;
}

function calleesByLine(records) {
	'use strict';
	var byLine = new Map();
	records.forEach(function (record) {
		if (!byLine.has(record.line)) {
			byLine.set(record.line, new Set());
		}
		byLine.get(record.line).add(record.callee);
	});
	return byLine;
}

/**
 * Callees and their transitive callees on the call edges
 * @param {Array} callees
 * @param {Array} edges
 * @returns {Array}
 */
function transitive(callees, edges) {
	'use strict';
	var seen = new Set(callees),
		stack = callees.slice();
	while (stack.length > 0) {
		var scope = stack.pop();
		edges.forEach(function (edge) {
			if (edge.from === scope && !seen.has(edge.to)) {
				seen.add(edge.to);
				stack.push(edge.to);
			}
		});
	}
	return Array.from(seen);
}

/**
 * Triggers of a page from its source facts and the facts of both outputs
 * @param {Object} source
 * @param {Object} base
 * @param {Object} next
 * @param {Object} [own] {base, next} facts of the level itself, for the
 *   class static rows (the inter-page level: inter-page/ only, so that the
 *   rows of the pages are not listed again)
 * @returns {Object}
 */
function pageInfoOf(source, base, next, own) {
	'use strict';
	var ranges = new Map(),
		rangesOf = function (scopes) {
			return scopes.map(function (scope) {
				return ranges.get(scope);
			}).filter(Boolean);
		},
		baseCount = base006.multisetDiff(base.records.map(recordKey), next.records.map(recordKey)),
		baseByLine = calleesByLine(base.records),
		nextByLine = calleesByLine(next.records),
		info = {
			source: source,
			callLines: new Set(next.records.map(function (record) {
				return record.line;
			})),
			links: [],
			newCallSite: baseCount.some(function (item) {
				return item.sign === '+';
			}),
			calleeRanges: [],
			excLost: [],
			shared: [],
			handlerDup: next.handlerDup,
			staticRows: []
		};
	base.ranges.forEach(function (range, scope) {
		ranges.set(scope, range);
	});
	next.ranges.forEach(function (range, scope) {
		ranges.set(scope, range);
	});
	nextByLine.forEach(function (callees, line) {
		var before = baseByLine.get(line) || new Set(),
			same = before.size === callees.size && Array.from(callees).every(function (callee) {
				return before.has(callee);
			});
		if (!same) {
			info.links.push({line: line, callees: Array.from(callees).sort(),
				ranges: rangesOf(transitive(Array.from(callees), next.edges))});
		}
	});
	info.calleeRanges = rangesOf(transitive(next.records.map(function (record) {
		return record.callee;
	}), next.edges));
	base.excDecisions.forEach(function (line) {
		if (!next.excDecisions.has(line)) {
			info.excLost.push(line);
		}
	});
	var callers = new Map();
	next.edges.forEach(function (edge) {
		if (!callers.has(edge.to)) {
			callers.set(edge.to, new Set());
		}
		callers.get(edge.to).add(edge.from);
	});
	callers.forEach(function (from, scope) {
		if (from.size >= 2) {
			info.shared.push({scope: scope, ranges: rangesOf([scope])});
		}
	});
	var listed = new Set(),
		lost = own ? base006.multisetDiff(own.base.records.map(recordKey), own.next.records.map(recordKey)) : baseCount;
	lost.forEach(function (item) {
		if (item.sign !== '-') {
			return;
		}
		var parts = item.content.split('\u0000'),
			line = Number(parts[0]),
			scope = parts[1],
			cls = /\$ANONYMOUS_FUN_\d+$/.test(scope) ? source.staticClasses.filter(function (candidate) {
				return line >= candidate.line && line <= candidate.end;
			})[0] : null;
		if (cls && !listed.has(item.content)) {
			listed.add(item.content);
			info.staticRows.push({line: line, scope: scope, kind: cls.kind, category: cls.kind === 'case test' ? '§44' : '§46',
				members: cls.members, pairs: 0});
		}
	});
	return info;
}

/* ---------- §2 classification ---------- */

/**
 * Def line, use line(s) and the use text of a pair string
 * @param {string} content "name: def -> use"
 * @returns {Object}
 */
function pairOf(content) {
	'use strict';
	var parts = base006.pairParts(content),
		match = /^(.*?): (.*?) -> (.*)$/.exec(content);
	parts.use = match[3];
	parts.lines = [parts.defLine].concat(parts.useLines).filter(function (line) {
		return line !== null;
	});
	return parts;
}

function staticRelated(row, pair) {
	'use strict';
	return pair.lines.some(function (line) {
		return row.members.some(function (member) {
			return within(member, line);
		});
	}) || (pair.useLine !== null && pair.useLine > row.line);
}

/**
 * Categories of a difference, in ORDER
 * @param {Object} diff
 * @param {Object} info result of pageInfoOf
 * @returns {Array}
 */
function categoriesOf(diff, info) {
	'use strict';
	var found = new Set(),
		intraProcedural = /^intra-procedurals\//.test(diff.file),
		source = info.source;
	if (diff.marker) {
		return ['標記'];
	}
	info.staticRows.forEach(function (row) {
		if (diff.unit !== 'pair' || staticRelated(row, pairOf(diff.content))) {
			found.add(row.category);
		}
	});
	if (diff.unit === 'pair') {
		var pair = pairOf(diff.content),
			inBlock = function (line) {
				return source.tries.some(function (item) {
					return item.blocks.some(function (block) {
						return within(block, line);
					});
				});
			},
			useAfterHandler = pair.use === 'exit' || inBlock(pair.useLine);
		if (info.links.some(function (link) {
			return pair.lines.some(function (line) {
				return link.ranges.some(function (range) {
					return within(range, line);
				});
			}) || (pair.useLine !== null && pair.useLine > link.line);
		})) {
			found.add('連結');
		}
		if (pair.lines.some(function (line) {
			return info.callLines.has(line);
		})) {
			found.add('求值順序');
		}
		if (pair.useLine !== null && source.caseLines.has(pair.useLine)) {
			found.add('求值順序（判別式）');
			found.add('求值順序');
		}
		if (source.iterables.some(function (range) {
			return pair.lines.some(function (line) {
				return within(range, line);
			});
		})) {
			found.add('求值順序（可迭代）');
			found.add('求值順序');
		}
		if (source.tries.length > 0 && useAfterHandler && (info.callLines.has(pair.defLine) ||
			info.calleeRanges.some(function (range) {
				return within(range, pair.defLine);
			}))) {
			found.add('返回後例外');
		}
		if (diff.sign === '-' && source.tries.length > 0 && info.excLost.some(function (line) {
			return info.callLines.has(line) && (useAfterHandler || (pair.useLine !== null && pair.useLine > line));
		})) {
			found.add('返回後例外（決策返回不拋錯）');
			found.add('返回後例外');
		}
		if (!intraProcedural && source.conservative) {
			found.add('§37');
		}
		if (source.tries.some(function (item) {
			return item.finalizer && (pair.lines.some(function (line) {
				return within(item, line);
			}) || (pair.useLine !== null && pair.useLine > item.start));
		})) {
			found.add('§38');
		}
		if (!intraProcedural && info.handlerDup) {
			found.add('§41');
		}
		if (!intraProcedural && info.shared.some(function (item) {
			return item.ranges.some(function (range) {
				return pair.lines.some(function (line) {
					return within(range, line);
				});
			});
		})) {
			found.add('§43');
		}
	} else if (diff.unit === 'row' || diff.unit === 'model') {
		if (info.links.length > 0) {
			found.add('連結');
		}
	} else {
		if (diff.unit === 'graph' && info.links.length > 0 && !intraProcedural) {
			found.add('連結');
		}
		if (diff.labelOnly) {
			found.add('標記');
		}
		if (diff.segment0) {
			found.add('共通（段0例外）');
			found.add('共通');
		}
		if (diff.sameShape || info.newCallSite) {
			found.add('共通');
		}
	}
	return ORDER.filter(function (category) {
		return found.has(category);
	});
}

/* ---------- §2 共通（段0例外） ---------- */

/**
 * Edge lines and other lines of a *.graph.dot text
 * @param {string} text
 * @returns {Object} {edges: [{from, to, attrs, type, key}], rest: string}
 */
function splitGraphLines(text) {
	'use strict';
	var edges = [], rest = [];
	text.split('\n').forEach(function (line) {
		var edge = /^\s*(\w+) -> (\w+) \[(.*)\]\s*$/.exec(line);
		if (edge) {
			var type = /label\s*=\s*"([^"]*)"/.exec(edge[3]);
			edges.push({from: edge[1], to: edge[2], attrs: edge[3], type: type ? type[1] : '',
				key: edge[1] + ' -> ' + edge[2] + ' [' + edge[3] + ']'});
		} else {
			rest.push(line);
		}
	});
	return {edges: edges, rest: rest.join('\n')};
}

/**
 * A JSON value with its object keys sorted (for comparing records)
 * @param {*} value
 * @returns {string}
 */
function canonical(value) {
	'use strict';
	if (Array.isArray(value)) {
		return '[' + value.map(canonical).join(',') + ']';
	}
	if (value && typeof value === 'object') {
		return '{' + Object.keys(value).sort().map(function (key) {
			return JSON.stringify(key) + ':' + canonical(value[key]);
		}).join(',') + '}';
	}
	return JSON.stringify(value);
}

function recordsById(text) {
	'use strict';
	var map = new Map();
	if (text === null) {
		return null;
	}
	((JSON.parse(text).calls) || []).forEach(function (record) {
		map.set(record.id, record);
	});
	return map;
}

/**
 * Condition 共通（段0例外） of §2 (DECISION 008): the only change of a
 * *.graph.dot is new exception edges from the CALL (segment 0) of a record
 * with beforeDecision true to its exceptionalReturn, the base already having
 * an exception edge to the same target from the decision node after its CALL
 * RETURN.
 * @param {Object} input {baseGraph, newGraph (texts, the base rewritten by §1),
 *   baseDupairs, newDupairs (texts or null, the base rewritten by §1),
 *   baseMatching, newMatching (texts or null)}
 * @returns {Array|null} [{callNode, target, id}] of the new edges, or null
 *   when the condition does not hold
 */
function segment0Exceptions(input) {
	'use strict';
	// (a) no pair or row difference in the .dupairs.dot of the model
	if ((input.baseDupairs === null) !== (input.newDupairs === null)) {
		return null;
	}
	if (input.baseDupairs !== null) {
		var before = base006.parseDupairs(input.baseDupairs),
			after = base006.parseDupairs(input.newDupairs),
			names = function (rows) {
				return rows.map(function (row) {
					return row.name;
				});
			},
			pairs = function (rows) {
				return unique([].concat.apply([], rows.map(function (row) {
					return row.pairs;
				})));
			};
		if (base006.multisetDiff(names(before), names(after)).length > 0 ||
			base006.multisetDiff(pairs(before), pairs(after)).length > 0) {
			return null;
		}
	}
	var baseRecords = recordsById(input.baseMatching),
		newRecords = recordsById(input.newMatching);
	if (baseRecords === null || newRecords === null) {
		return null;
	}
	// (b) same nodes and labels; no edge removed or redirected
	var base = splitGraphLines(input.baseGraph),
		next = splitGraphLines(input.newGraph);
	if (base.rest !== next.rest) {
		return null;
	}
	var edgeDiff = base006.multisetDiff(base.edges.map(function (edge) {
		return edge.key;
	}), next.edges.map(function (edge) {
		return edge.key;
	}));
	if (edgeDiff.length === 0 || edgeDiff.some(function (item) {
		return item.sign !== '+';
	})) {
		return null;
	}
	var parsed = splitGraphLines(edgeDiff.map(function (item) {
			return item.content;
		}).join('\n')).edges,
		used = new Set(),
		result = [];
	// (c) every new edge attributed to exactly one record; (d) once per record
	for (var i = 0; i < parsed.length; ++i) {
		var edge = parsed[i];
		if (edge.type !== 'exception') {
			return null;
		}
		var candidates = Array.from(newRecords.values()).filter(function (record) {
			return record.beforeDecision === true && record.callNode === edge.from && record.exceptionalReturn === edge.to;
		});
		if (candidates.length !== 1) {
			return null;
		}
		var record = candidates[0],
			baseRecord = baseRecords.get(record.id);
		if (used.has(record.id) || !baseRecord || canonical(baseRecord) !== canonical(record)) {
			return null;
		}
		var decided = base.edges.some(function (out) {
			if (out.from !== baseRecord.callReturn || out.type !== '') {
				return false;
			}
			var successor = out.to;
			return base.edges.some(function (item) {
				return item.from === successor && (item.type === 'true' || item.type === 'false');
			}) && base.edges.some(function (item) {
				return item.from === successor && item.to === edge.to && item.type === 'exception';
			});
		});
		if (!decided) {
			return null;
		}
		used.add(record.id);
		result.push({callNode: edge.from, target: edge.to, id: record.id});
	}
	return result;
}

/* ---------- §1 comparison ---------- */

function stripIds(text) {
	'use strict';
	return text.replace(/\bn\d+\b/g, 'n#');
}

function readText(dir, file) {
	'use strict';
	var full = path.join(dir, file);
	return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

function sha256(text) {
	'use strict';
	return crypto.createHash('sha256').update(text).digest('hex');
}

function unique(items) {
	'use strict';
	return Array.from(new Set(items));
}

/**
 * Compare the outputs of a case and classify each difference
 * @param {Object} spec {name, pageSources, baseDir, newDir}
 * @returns {Object} {name, diffs, triggers, errors, duplicates, staticRows}
 * @throws {Error} when a base model has a CALL node and no *.matching.json
 */
function compareCase(spec) {
	'use strict';
	var pattern = /\.dot$|\.matching\.json$/,
		baseFiles = listFiles(spec.baseDir, pattern),
		newFiles = listFiles(spec.newDir, pattern),
		models = new Map(),
		diffs = [],
		duplicates = [],
		groups = new Map(),
		errors = [];
	baseFiles.filter(function (file) {
		return /\.graph\.dot$/.test(file);
	}).forEach(function (file) {
		var matching = file.replace(/\.graph\.dot$/, '.matching.json');
		if (baseFiles.indexOf(matching) === -1 && hasCallNode(readText(spec.baseDir, file))) {
			throw new Error('基準側 ' + spec.name + ' ' + file + ' 有 CALL 節點，卻缺少 ' + matching + '（無法改寫標記）');
		}
	});
	function modelOf(file) {
		var key = file.replace(/\.(graph|dupairs|hierarchy)\.dot$|\.matching\.json$/, '');
		if (!models.has(key)) {
			var baseGraph = readText(spec.baseDir, key + '.graph.dot'),
				newGraph = readText(spec.newDir, key + '.graph.dot'),
				matching = readText(spec.baseDir, key + '.matching.json'),
				model = {triggered: baseGraph !== null && newGraph !== null && triggersRewrite(newGraph)};
			if (model.triggered) {
				var rewritten = rewriteLabels(baseGraph, matching !== null ? JSON.parse(matching) : null);
				model.graph = rewritten.text;
				model.map = rewritten.map;
			}
			models.set(key, model);
		}
		return models.get(key);
	}
	function baseTextOf(file) {
		var text = readText(spec.baseDir, file),
			model = modelOf(file);
		if (text === null || !model.triggered) {
			return text;
		}
		if (/\.graph\.dot$/.test(file)) {
			return model.graph;
		}
		return /\.dupairs\.dot$/.test(file) ? rewriteDupairs(text, model.map) : text;
	}
	function push(located, unit, sign, content, name, extra) {
		diffs.push(Object.assign({caseName: spec.name, page: located.page, file: located.file, unit: unit, sign: sign,
			content: content, name: name}, extra || {}));
	}
	unique(baseFiles.concat(newFiles)).sort().forEach(function (file) {
		var located = base006.locate(file),
			inBase = baseFiles.indexOf(file) !== -1,
			inNew = newFiles.indexOf(file) !== -1,
			unit = /\.matching\.json$/.test(file) ? 'matching' : 'graph';
		if (/\.dupairs\.dot$/.test(file)) {
			var key = located.page + '|' + located.level;
			if (!groups.has(key)) {
				groups.set(key, {page: located.page, level: located.level, base: [], next: []});
			}
			if (inBase) {
				groups.get(key).base.push(file);
			}
			if (inNew) {
				groups.get(key).next.push(file);
			}
			if (inBase !== inNew) {
				push(located, 'model', inNew ? '+' : '-', located.file, null);
			}
			var before = inBase ? duplicateCount(baseTextOf(file)) : 0,
				after = inNew ? duplicateCount(readText(spec.newDir, file)) : 0;
			if (before > 0 || after > 0) {
				duplicates.push({file: located.file, page: located.page, base: before, next: after});
			}
			return;
		}
		if (!inBase || !inNew) {
			push(located, unit, inNew ? '+' : '-', located.file, null);
			return;
		}
		var raw = readText(spec.baseDir, file),
			rewritten = baseTextOf(file),
			next = readText(spec.newDir, file);
		if (sha256(raw) === sha256(next)) {
			return;
		}
		if (rewritten === next) {
			push(located, unit, '~', located.file, null, {marker: true});
			return;
		}
		var extra = {
			labelOnly: rewritten !== raw && stripIds(rewritten) === stripIds(next),
			sameShape: stripIds(raw) === stripIds(next) || stripIds(rewritten) === stripIds(next)
		};
		if (/\.graph\.dot$/.test(file)) {
			var modelKey = file.replace(/\.graph\.dot$/, ''),
				dupairs = modelKey + '.dupairs.dot',
				matching = modelKey + '.matching.json';
			extra.segment0 = segment0Exceptions({
				baseGraph: rewritten,
				newGraph: next,
				baseDupairs: readText(spec.baseDir, dupairs) === null ? null : baseTextOf(dupairs),
				newDupairs: readText(spec.newDir, dupairs),
				baseMatching: readText(spec.baseDir, matching),
				newMatching: readText(spec.newDir, matching)
			});
		}
		push(located, unit, '~', located.file, null, extra);
	});
	function rowsOf(files, rewrite) {
		var rows = [];
		files.forEach(function (file) {
			[].push.apply(rows, base006.parseDupairs(rewrite ? baseTextOf(file) : readText(rewrite === null ? spec.newDir : spec.baseDir, file)));
		});
		return rows;
	}
	function pairsOf(rows) {
		return unique([].concat.apply([], rows.map(function (row) {
			return row.pairs;
		})));
	}
	function namesOf(items) {
		return new Set(items.map(function (item) {
			return base006.pairParts(item.content).name;
		}));
	}
	function compareRows(located, rawBefore, before, after) {
		base006.multisetDiff(before.map(function (row) {
			return row.name;
		}), after.map(function (row) {
			return row.name;
		})).forEach(function (item) {
			push(located, 'row', item.sign, item.content, item.content);
		});
		var pairDiffs = base006.multisetDiff(pairsOf(before), pairsOf(after)),
			rawNames = namesOf(base006.multisetDiff(pairsOf(rawBefore), pairsOf(after))),
			names = namesOf(pairDiffs);
		pairDiffs.forEach(function (item) {
			push(located, 'pair', item.sign, item.content, base006.pairParts(item.content).name);
		});
		Array.from(rawNames).sort().forEach(function (name) {
			if (!names.has(name)) {
				push(located, 'row', '~', name, name, {marker: true});
			}
		});
	}
	groups.forEach(function (group) {
		var byIndex = function (a, b) {
			return parseInt(base006.locate(a).base, 10) - parseInt(base006.locate(b).base, 10);
		};
		group.base.sort(byIndex);
		group.next.sort(byIndex);
		if (group.base.length === group.next.length) {
			group.next.forEach(function (file, position) {
				var baseFile = [group.base[position]];
				compareRows(base006.locate(file), rowsOf(baseFile, false), rowsOf(baseFile, true), rowsOf([file], null));
			});
		} else {
			compareRows({page: group.page, file: group.level + '*.dupairs.dot'}, rowsOf(group.base, false),
				rowsOf(group.base, true), rowsOf(group.next, null));
		}
	});
	var sources = spec.pageSources.map(sourceFactsOf),
		pageOutputs = sources.map(function (facts, index) {
			if (facts.error) {
				errors.push(spec.name + ' page' + index + '：無法剖析（' + facts.error + '）');
			}
			return {
				base: outputFactsOf(path.join(spec.baseDir, 'page' + index)),
				next: outputFactsOf(path.join(spec.newDir, 'page' + index))
			};
		}),
		infos = {};
	sources.forEach(function (facts, index) {
		infos['page' + index] = pageInfoOf(facts, pageOutputs[index].base, pageOutputs[index].next);
	});
	var interBase = outputFactsOf(path.join(spec.baseDir, 'inter-page')),
		interNext = outputFactsOf(path.join(spec.newDir, 'inter-page'));
	infos['inter-page'] = pageInfoOf(unionSourceFacts(sources),
		mergeOutputFacts(pageOutputs.map(function (item) {
			return item.base;
		}).concat([interBase])),
		mergeOutputFacts(pageOutputs.map(function (item) {
			return item.next;
		}).concat([interNext])), {base: interBase, next: interNext});
	var staticRows = [];
	diffs.forEach(function (diff) {
		var info = infos[diff.page];
		diff.categories = info ? categoriesOf(diff, info) : [];
		if (info && diff.unit === 'pair') {
			info.staticRows.forEach(function (row) {
				if (staticRelated(row, pairOf(diff.content))) {
					row.pairs++;
				}
			});
		}
	});
	Object.keys(infos).sort().forEach(function (page) {
		infos[page].staticRows.forEach(function (row) {
			staticRows.push({page: page, line: row.line, scope: row.scope, kind: row.kind, category: row.category, pairs: row.pairs});
		});
	});
	return {name: spec.name, diffs: diffs, infos: infos, errors: errors, duplicates: duplicates, staticRows: staticRows};
}

/* ---------- §3 report and record ---------- */

function mainCategory(category) {
	'use strict';
	return category.replace(/（.*）$/, '');
}

function isPinned(category) {
	'use strict';
	var main = mainCategory(category);
	return ['連結', '求值順序', '返回後例外'].indexOf(main) !== -1 || main.charAt(0) === '§';
}

function pinKey(caseName, page, category) {
	'use strict';
	return [caseName, page, category].join('\u0000');
}

function countSign(entry, sign) {
	'use strict';
	if (sign === '+') {
		entry.plus++;
	} else if (sign === '-') {
		entry.minus++;
	}
}

function signed(number) {
	'use strict';
	return number > 0 ? '+' + number : String(number);
}

/**
 * Trigger text of a pinned category on a page
 * @param {Object} info
 * @param {string} category main category
 * @returns {string}
 */
function triggerText(info, category) {
	'use strict';
	if (!info) {
		return '';
	}
	if (category === '連結') {
		return info.links.map(function (link) {
			return 'L' + link.line + ' → ' + link.callees.join('、');
		}).join('；');
	}
	if (category === '求值順序') {
		return '呼叫點行 ' + Array.from(info.callLines).sort(function (a, b) {
			return a - b;
		}).map(function (line) {
			return 'L' + line;
		}).join('、');
	}
	if (category === '返回後例外') {
		return 'try ' + info.source.tries.map(function (item) {
			return 'L' + item.start + '–L' + item.end;
		}).join('、') + (info.excLost.length > 0 ? '；決策返回不拋錯 ' + info.excLost.map(function (line) {
			return 'L' + line;
		}).join('、') : '');
	}
	if (category === '§44' || category === '§46') {
		return info.staticRows.filter(function (row) {
			return row.category === category;
		}).map(function (row) {
			return 'L' + row.line + ' ' + row.kind;
		}).join('；');
	}
	return category;
}

function allDiffs(results) {
	'use strict';
	return [].concat.apply([], results.map(function (result) {
		return result.diffs;
	}));
}

/**
 * Markdown of the four machine sections
 * @param {Array} results results of compareCase
 * @returns {string}
 */
function buildReport(results) {
	'use strict';
	var diffs = allDiffs(results),
		lines = [diffs.length === 0 ? '無差異' : diffs.length + ' 筆差異', '', NET_HEADING, '',
			'| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |',
			'|---|------|----|------------|------|---|------|------|----|------|'],
		pins = new Map();
	diffs.forEach(function (diff, index) {
		var category = diff.categories[0] || '（無成立類別）',
			note = diff.categories.length > 1 ? '（亦符：' + diff.categories.slice(1).join('、') + '）' : '';
		if (mainCategory(category) === '共通' && diff.segment0) {
			var others = diff.categories.slice(1).filter(function (item) {
				return item !== '共通';
			});
			note = '段0例外：' + diff.segment0.map(function (item) {
				return item.callNode + ' → ' + item.target + '（' + item.id + '）';
			}).join('；') + (others.length > 0 ? '（亦符：' + others.join('、') + '）' : '');
		}
		lines.push('| ' + [index + 1, diff.caseName, diff.page, diff.file, diff.unit, diff.sign, '`' + diff.content + '`',
			category, FR_OF[mainCategory(category)] || '', note].join(' | ') + ' |');
		if (diff.categories.length > 0 && isPinned(category)) {
			var key = pinKey(diff.caseName, diff.page, mainCategory(category)),
				entry = pins.get(key) || {plus: 0, minus: 0, numbers: []};
			countSign(entry, diff.sign);
			entry.numbers.push(index + 1);
			pins.set(key, entry);
		}
	});
	lines.push('', DUP_HEADING, '', '| case | 頁 | 檔案 | develop 重複列 | 007 重複列 | 增減 |',
		'|------|----|------|----------------|------------|------|');
	results.forEach(function (result) {
		result.duplicates.forEach(function (item) {
			lines.push('| ' + [result.name, item.page, item.file, item.base, item.next, signed(item.next - item.base)].join(' | ') + ' |');
		});
	});
	lines.push('', PIN_HEADING, '', '| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |',
		'|------|----|------|------|---|---|------|------|');
	pins.forEach(function (entry, key) {
		var parts = key.split('\u0000'),
			result = results.filter(function (item) {
				return item.name === parts[0];
			})[0];
		lines.push('| ' + [parts[0], parts[1], parts[2], triggerText(result.infos[parts[1]], parts[2]), entry.plus, entry.minus, '',
			'草擬，待簽核（' + base006.rowNumbers(entry.numbers) + '）'].join(' | ') + ' |');
	});
	lines.push('', STATIC_HEADING, '', '| case | 頁 | 行 | static scope | 位置種類 | 相關 ± pair 筆數 |',
		'|------|----|----|--------------|----------|------------------|');
	var staticCount = 0;
	results.forEach(function (result) {
		result.staticRows.forEach(function (row) {
			staticCount++;
			lines.push('| ' + [result.name, row.page, row.line, row.scope, row.kind, row.pairs].join(' | ') + ' |');
		});
	});
	if (staticCount === 0) {
		lines.push('| 無 |  |  |  |  |  |');
	}
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
		dupTable = base006.tableOf(text, DUP_HEADING),
		pinTable = base006.tableOf(text, PIN_HEADING),
		staticTable = base006.tableOf(text, STATIC_HEADING);
	if (net === null || dupTable === null || pinTable === null || staticTable === null) {
		return ['紀錄缺少機器區塊（淨差異／重複列數／釘選與簽核／class static 不再連結）'];
	}
	var actual = new Map(),
		pins = new Map();
	allDiffs(results).forEach(function (diff) {
		var key = base006.keyOf(diff.caseName, diff.page, diff.file, diff.unit, diff.sign, diff.content);
		actual.set(key, (actual.get(key) || []).concat([diff]));
		if (diff.unit === 'pair' && /^intra-procedurals\//.test(diff.file)) {
			problems.push('intra-procedural 模型的 pair 差異（FR-006）：' + [diff.caseName, diff.page, diff.file, diff.sign,
				'`' + diff.content + '`'].join(' '));
		}
	});
	net.forEach(function (cells) {
		var label = '淨差異 #' + cells[0] + '（' + cells.slice(1, 7).join(' ') + '）',
			key = base006.keyOf(cells[1], cells[2], cells[3], cells[4], base006.normalizeSign(cells[5]), base006.unquote(cells[6] || '')),
			matches = actual.get(key) || [];
		if (matches.length === 0) {
			problems.push(label + '：記錄與實際不符（實際無此差異或多列）');
			return;
		}
		var diff = matches.shift(),
			category = cells[7];
		if (diff.categories.indexOf(category) === -1) {
			problems.push(label + '：類別「' + category + '」判準不成立（成立：' + (diff.categories.join('、') || '無') + '）');
			return;
		}
		if (isPinned(category)) {
			var pin = pinKey(diff.caseName, diff.page, mainCategory(category)),
				entry = pins.get(pin) || {plus: 0, minus: 0};
			countSign(entry, diff.sign);
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
	var dups = new Map();
	results.forEach(function (result) {
		result.duplicates.forEach(function (item) {
			dups.set([result.name, item.page, item.file].join('\u0000'), item);
		});
	});
	var dupListed = new Set();
	dupTable.forEach(function (cells) {
		var key = [cells[0], cells[1], cells[2]].join('\u0000'),
			name = '重複列數：' + [cells[0], cells[1], cells[2]].join(' '),
			item = dups.get(key);
		if (dupListed.has(key)) {
			problems.push(name + ' 重複列');
		}
		dupListed.add(key);
		if (!item) {
			problems.push(name + ' 實際兩側皆 0，不得列');
		} else if (Number(cells[3]) !== item.base || Number(cells[4]) !== item.next || cells[5] !== signed(item.next - item.base)) {
			problems.push(name + ' 記錄 ' + cells.slice(3, 6).join('／') + '，實際 ' + item.base + '／' + item.next + '／' + signed(item.next - item.base));
		}
	});
	dups.forEach(function (item, key) {
		if (!dupListed.has(key)) {
			problems.push('重複列數：' + key.split('\u0000').join(' ') + ' 未列（實際 ' + item.base + '／' + item.next + '）');
		}
	});
	var statics = new Map();
	results.forEach(function (result) {
		result.staticRows.forEach(function (row) {
			statics.set([result.name, row.page, row.line, row.scope].join('\u0000'), row);
		});
	});
	var staticListed = new Set();
	staticTable.forEach(function (cells) {
		if (cells[0] === '無') {
			return;
		}
		var key = [cells[0], cells[1], cells[2], cells[3]].join('\u0000'),
			name = 'class static 不再連結：' + cells.slice(0, 4).join(' '),
			row = statics.get(key);
		staticListed.add(key);
		if (!row) {
			problems.push(name + ' 實際不存在，不得列');
		} else if (Number(cells[5]) !== row.pairs) {
			problems.push(name + ' 記錄 ' + cells[5] + ' 筆 pair，實際 ' + row.pairs + ' 筆');
		}
	});
	statics.forEach(function (row, key) {
		if (!staticListed.has(key)) {
			problems.push('class static 不再連結：' + key.split('\u0000').join(' ') + ' 未列（' + row.kind + '，' + row.pairs + ' 筆 pair）');
		}
	});
	return problems;
}

/* ---------- §4 inputs ---------- */

/**
 * Base commit: --base, else the base line of the record header
 * @param {string|null} base
 * @param {string|null} headerText
 * @returns {string|null}
 */
function resolveBase(base, headerText) {
	'use strict';
	return base || (headerText ? base006.baseOf(headerText) : null);
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
		throw new Error('git archive ' + base + ' 失敗：' + String(archive.stderr).trim());
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
 * Check the MDN snapshot before running the CLI: exitcodes.json, a
 * directory per id and a *.matching.json for every model with a CALL node
 * @param {string} mdnBase
 * @param {Array} ids
 * @throws {Error}
 */
function checkSnapshot(mdnBase, ids) {
	'use strict';
	if (!fs.existsSync(path.join(mdnBase, 'exitcodes.json'))) {
		throw new Error('找不到 MDN 基準：' + path.join(mdnBase, 'exitcodes.json'));
	}
	ids.forEach(function (id) {
		var dir = path.join(mdnBase, id);
		if (!fs.existsSync(dir)) {
			throw new Error('找不到 MDN 基準：' + dir);
		}
		listFiles(dir, /\.graph\.dot$/).forEach(function (file) {
			var matching = file.replace(/\.graph\.dot$/, '.matching.json');
			if (!fs.existsSync(path.join(dir, matching)) && hasCallNode(fs.readFileSync(path.join(dir, file), 'utf8'))) {
				throw new Error('MDN 基準 ' + id + ' ' + file + ' 有 CALL 節點，卻缺少 ' + matching + '（無法改寫標記）');
			}
		});
	});
}

/**
 * Results of the mdn mode, each with the exit code of the CLI before and now
 * @param {string} work temporary directory
 * @param {string} mdnBase snapshot directory
 * @param {string} corpus directory of pages.json and corpus/
 * @returns {Array}
 */
function mdnResults(work, mdnBase, corpus) {
	'use strict';
	var pages = JSON.parse(fs.readFileSync(path.join(corpus, 'pages.json'), 'utf8')),
		ids = Object.keys(pages).sort();
	checkSnapshot(mdnBase, ids);
	var baseCodes = JSON.parse(fs.readFileSync(path.join(mdnBase, 'exitcodes.json'), 'utf8'));
	return ids.map(function (id) {
		var filesOfPages = pages[id].map(function (files) {
				return files.map(function (file) {
					return path.join(corpus, 'corpus', file);
				});
			}),
			run = base006.runCli(filesOfPages, work),
			result = compareCase({
				name: id,
				pageSources: filesOfPages.map(base006.pageSource),
				baseDir: path.join(mdnBase, id),
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
 * @param {Object} [overrides] {mdnBase, mdnCorpus} (self test)
 * @returns {number} exit status
 */
function main(argv, io, overrides) {
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
	if (mode === 'golden') {
		var headerFile = verifyFile || path.join(FEATURE, 'golden-diff.md');
		base = resolveBase(base, fs.existsSync(headerFile) ? fs.readFileSync(headerFile, 'utf8') : null);
		if (!base) {
			err('無法取得 golden 基準：' + headerFile + ' 檔頭未填基準 commit，且未給 --base');
			return 2;
		}
	}
	var work = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck007-')),
		results, codes = {lines: [], problems: []};
	try {
		results = mode === 'golden' ? goldenResults(base, work) :
			mdnResults(work, (overrides && overrides.mdnBase) || MDN_BASE, (overrides && overrides.mdnCorpus) || MDN_CORPUS);
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
		out((mode === 'golden' ? '<!-- diffcheck 007 golden，基準 ' + base + ' -->\n' : '<!-- diffcheck 007 mdn -->\n') +
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
	baseOf: base006.baseOf,
	resolveBase: resolveBase,
	rewriteLabels: rewriteLabels,
	rewriteCell: rewriteCell,
	rewriteDupairs: rewriteDupairs,
	duplicateCount: duplicateCount,
	sourceFactsOf: sourceFactsOf,
	outputFactsOf: outputFactsOf,
	compareCase: compareCase,
	buildReport: buildReport,
	verifyRecord: verifyRecord,
	exitCodesOf: base006.exitCodesOf,
	main: main
};

if (require.main === module) {
	process.exitCode = main(process.argv.slice(2));
}
