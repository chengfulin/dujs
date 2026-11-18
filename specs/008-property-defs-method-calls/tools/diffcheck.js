/*
 * Difference check of feature 008 (FR-009, FR-010, SC-003, SC-004; D006, D011,
 * D022, D023, D024, D025; contracts/diff-check.md): compare the outputs of develop (2035c93) with
 * those of this branch and classify every difference with the categories of
 * feature 008 (成員目標, 屬性寫入→讀取損失, 外溢, 放寬, 層級新增, KI classes,
 * 共通). The .dot parsing, locate, baseOf and exitCodesOf are those of
 * specs/005-summary-analysis/tools/diffcheck.js and
 * specs/006-eslint-scope/tools/diffcheck.js; duplicateCount, sourceFactsOf and
 * outputFactsOf those of specs/007-split-call-nodes/tools/diffcheck.js; the
 * loss / fix judgement is tools/classify.js. compareCase, buildReport,
 * verifyRecord, goldenResults, mdnResults and main are copies of 007 changed
 * here (R9). Not part of dujs, not run by npm test.
 *
 *   node specs/008-property-defs-method-calls/tools/diffcheck.js golden [--base <commit>] --report
 *   node specs/008-property-defs-method-calls/tools/diffcheck.js golden [--base <commit>] --verify <golden-diff.md>
 *   node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --report
 *   node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --verify <mdn-diff.md>
 *
 * Exit status: 0 passed (or report written with every difference of some
 * category), 1 problems (--verify: a difference not recorded, a record not
 * matching, a category that does not hold, a pin / segment / duplicate row
 * count that differs; both modes: a difference of no category, a changed CLI
 * exit code, a page that cannot be parsed), 2 usage error or no base (no base
 * line and no --base, a base commit that git cannot read, no MDN snapshot, or
 * a base model with a CALL node and no *.matching.json).
 *
 * Interpretations of the contract kept here:
 * - No label rewriting (§1): 2035c93 and 008 both write "call (<line>)".
 * - Pairs (§1, D022): the pairs of every *.dupairs.dot of one page and one
 *   level (intra-procedurals/, inter-procedurals/, intra-pages/, inter-page)
 *   are one set per side, and so are the variable names of their rows (unit
 *   row); a model (unit model) is a file name of the level. The line key of a
 *   label is the line it starts with ("5", "5:T", "call (5)", "callReturn
 *   (5)" with their suffixes), or the label without suffix when it has none
 *   ("entry"). A line key is unchanged when the set of the per-model
 *   multisets of labels with that key (*.graph.dot of the same model, all
 *   models of the page and level) is the same on both sides; a label keeps
 *   its suffix on an unchanged key and loses every suffix on a changed one
 *   ("call (19)_a_b_a_b" -> "call (19)", "18adab" -> "18"). The changed keys
 *   used by a pair of the page and level are the rows of 段結構改變行
 *   (模型檔 "<level>*.graph.dot", counts: distinct labels of the key over the
 *   models of each side).
 * - Duplicate rows: per *.dupairs.dot, as 007 (labels without suffix).
 * - 定義性成員目標 (§3.1) as a trigger: a target (=, any operator, a
 *   destructuring, a for-in/of left side) whose object is the Identifier
 *   itself (o.p = 1, o[k] = 1; not o.p.q = 1). The loss / fix judgement is
 *   classify.classifyRemoved on a − pair whose def line has one.
 * - 成員目標（新增讀取）: the use line has a read of the variable inside a
 *   member target that is not exempt (its .object chain does not end at a
 *   localStorage that the page does not declare, R5, D008).
 * - 外溢 / 放寬 trigger lines: a call site line whose set of callees differs
 *   between the sides (either way); 外溢 when a call on that line has a callee
 *   Identifier (f(), new A()) or an Identifier receiver (o.m(), A.s()) with a
 *   定義性成員目標 on the page (this covers the 007 guard lifted: o.p = 1,
 *   o.m() has its receiver defined by a member target); 放寬 when this branch
 *   adds a callee on the line and a call o.m() there is in a function, o
 *   resolving to one let / const declaration with a new initial value.
 *   Callee lines: intra-procedural *.graph.dot ranges of the callees of the
 *   line on both sides and their callees (hierarchy edges of each side).
 * - Position (§2, T010): a pair def or use in those lines, a use after the
 *   call site line, or a use after the call site line of a caller of the
 *   innermost function (by those ranges) holding the call site, transitively
 *   (records of both sides).
 * - Relabelling of the trigger line itself (D023 (a), part of the position):
 *   a def or use label of the pair has the line key L of the trigger line, L
 *   is a changed line key of the page and level (a row of 段結構改變行), and
 *   the pair with its labels of key L made "L" equals a pair difference of the
 *   other sign made the same way ("x: 3 -> 199" / "x: 3 -> call (199)"). Only
 *   trigger lines (callee sets that differ) count.
 * - Units row / model: 外溢 or 放寬 when the page has such a trigger line;
 *   graph / matching: the same, and 共通 when equal without node numbers or
 *   when the page has a call site record added or removed. A matching file is
 *   equal without node numbers only when its summaries are also equal with
 *   each "v@n" written with the label of node n of the same model (D024 (2);
 *   with no *.graph.dot, the node numbers themselves).
 * - Matching files (D024): the *.matching.json of a page and level are paired
 *   by mainScope, not by file number; a pair of other names is the matching ~
 *   "<base file> → <file of this branch>" (file column: this branch); a file
 *   with no counterpart is a matching + / − (categories as a model ±). A
 *   mainScope that is not unique on a side (or missing) is an error (exit 1)
 *   and that group is paired by name. The *.graph.dot of the summary check
 *   are those of the paired models.
 * - 成員目標（摘要） (D023 (b), matching ~, FR-003): summaries are compared
 *   element by element for the functions on both sides. Before that (D025),
 *   each v@n of gen / exceptional is taken as v with the label of node n in
 *   the *.graph.dot of the same model on its side, and an element whose
 *   labelled form is on both sides is no difference (a pure renumbering,
 *   "init.gen −nextId@n144 +nextId@n146" both "31"); with no graph, or no
 *   node n in it, the node number itself (stricter). R(f) is the base line
 *   range of f (intra-procedural *.graph.dot) and those of its callees along
 *   the base hierarchy call edges, transitively. An element holds when (1)
 *   gen / exceptional −v@n: the line of node n in the base *.graph.dot of the
 *   same model has a 定義性成員目標 of v (strict: the object is v itself);
 *   (2) mustKill −v: such a target of v in R(f); (3) upwardExposed +v: a read
 *   of v in a non-exempt member target in R(f) (the facts of 新增讀取); (4)
 *   gen / exceptional +v@n: the same function has a (1) of v and the line of
 *   node n in this branch's *.graph.dot of the same model has an eslint-scope
 *   write reference of v. Anything else fails: mustKill +, upwardExposed −, a
 *   changed normalReturn, conservative or other field. The category holds
 *   when the JSON without summaries is the same, the keys of summaries are
 *   the same, at least one element differs and every element holds. A
 *   matching ~ of 外溢, 放寬 or 共通 (new call site) is also checked element
 *   by element and has none of them when an element fails. The note lists
 *   "function.field ±element"; the pin table has its own row 成員目標（摘要）
 *   counting the elements added (+) and removed (−).
 * - 第 5 條 (D024), only in a matching file of a page with a 外溢 / 放寬
 *   trigger line: N(f) is the set of scopes reached from f along the call
 *   edges of this branch (hierarchy files of the page and level, all levels
 *   at inter-page) less f and those reached along the base call edges; an
 *   edge not in the base counts only when a trigger line adds its callee and
 *   lies in its caller (the innermost function of the line by the
 *   intra-procedural ranges; the top level for a caller with no range).
 *   gen / exceptional +v@n holds when (i) the innermost function of the line
 *   of node n (graph of this branch) is in N(f) (innermost, not a range
 *   holding the line), (ii) that line has an eslint-scope write reference of
 *   v, (iii) some g in N(f) has the same v@n in the same field of its summary
 *   in the same file of this branch. upwardExposed +v holds when a read
 *   reference of v lies on a line whose innermost function g' is in N(f) and
 *   resolves to no variable or to one whose scope is not inside the function
 *   node of g', and v is in the upwardExposed of some g in N(f). Removals,
 *   mustKill and flags are never of 第 5 條. Its elements note
 *   "（新連結 g）" (the first such g by name) and are counted in the pin row
 *   of the file's category: the + / − of a matching ~ of 外溢 / 放寬 are its
 *   summary elements added / removed (all of them, (1)–(5)).
 * - Summary keys (D024): a function of the base only fails; one of this
 *   branch only fails unless it is in N(f) of some function on both sides
 *   (noted "新鍵（新連結）"). This holds for every matching ~ checked.
 * - 成員目標（列消失） (D023 (c), row −, FR-001): a base model of the page
 *   and level has a row of v whose def labels all lie on lines with a
 *   定義性成員目標 of v (a row with no pair too), and the numeric line keys of
 *   its *.graph.dot have no eslint-scope write reference of v (a declaration
 *   with an initial value is one); the page (every page at inter-page) has at
 *   most one declaration of v (eslint-scope defs); the row − of v are no more
 *   than such models. No row + has it.
 * - 層級新增 (D022, 007 DECISION 011): a + pair found in a model file only in
 *   this branch whose model + has 外溢, 放寬 or 成員目標, and whose (variable,
 *   def, use) without suffixes is in a base intra-pages/*.dupairs.dot of the
 *   same page: category "<main>（層級新增）", the note names that file.
 * - Inter-page level: the source facts of every page (lines of any page).
 * - The pin table counts + and − of pairs, rows and models (summary elements
 *   for 成員目標（摘要）); 共通 is not pinned.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var childProcess = require('child_process'),
	crypto = require('crypto'),
	fs = require('fs'),
	os = require('os'),
	path = require('path');
var base006 = require('../../006-eslint-scope/tools/diffcheck.js'),
	base007 = require('../../007-split-call-nodes/tools/diffcheck.js'),
	classify = require('./classify.js');

var ROOT = path.resolve(__dirname, '..', '..', '..'),
	FEATURE = path.resolve(__dirname, '..'),
	MDN_CORPUS = path.join(ROOT, 'specs', '006-eslint-scope', 'mdn'),
	MDN_BASE = path.join(FEATURE, 'mdn', 'baseline-develop'),
	FIX = '成員目標（修正）',
	LOSS = '屬性寫入→讀取損失',
	NEW_READ = '成員目標（新增讀取）',
	NO_KILL = '成員目標（不再殺除）',
	SPILL = '外溢',
	RELAX = '放寬',
	LEVEL_NEW = '（層級新增）',
	SUMMARY = '成員目標（摘要）',
	ROW_GONE = '成員目標（列消失）',
	ORDER = [FIX, LOSS, NEW_READ, NO_KILL, SUMMARY, ROW_GONE, SPILL, SPILL + LEVEL_NEW, RELAX, RELAX + LEVEL_NEW, '成員目標' + LEVEL_NEW,
		'§37', '§38', '§41', '§43', '共通'],
	FR_OF = {
		'成員目標（修正）': 'FR-001', '成員目標（新增讀取）': 'FR-002', '成員目標（不再殺除）': 'FR-001', '成員目標（層級新增）': 'FR-001',
		'成員目標（摘要）': 'FR-003', '成員目標（列消失）': 'FR-001',
		'屬性寫入→讀取損失': 'D001、FR-009', '外溢': 'FR-001 外溢', '外溢（層級新增）': 'FR-001', '放寬': 'FR-004',
		'放寬（層級新增）': 'FR-004', '共通': '—'
	},
	PINNED = ['成員目標', LOSS, SPILL, RELAX],
	NET_HEADING = '## 淨差異（相對 develop）',
	SEGMENT_HEADING = '## 段結構改變行',
	DUP_HEADING = '## 重複列數',
	PIN_HEADING = '## 釘選與簽核',
	CALL_LABEL = /^call(_[a-z]+)?$/,
	FUNCTION_TYPE = /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/;

/* ---------- small helpers (copies of 007) ---------- */

function unique(items) {
	'use strict';
	return Array.from(new Set(items));
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

function stripIds(text) {
	'use strict';
	return text.replace(/\bn\d+\b/g, 'n#');
}

function within(range, line) {
	'use strict';
	return line !== null && line !== undefined && line >= range.start && line <= range.end;
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
 * Nodes of a *.graph.dot text in file order, labels as written
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

function hasCallNode(text) {
	'use strict';
	return graphNodes(text).some(function (node) {
		return CALL_LABEL.test(node.label) || node.label.indexOf('call (') === 0;
	});
}

/* ---------- §1 labels and pairs ---------- */

/**
 * A label without any suffix ("18adab" -> "18", "call (19)_a_b_a_b" ->
 * "call (19)", "entry_d_h" -> "entry")
 * @param {string} label
 * @returns {string}
 */
function stripSuffix(label) {
	'use strict';
	var text = label.trim(),
		numbered = /^(\d+(?::[TF]+)?)[a-z]+$/.exec(text);
	return numbered ? numbered[1] : text.replace(/(_[a-z]+)+$/, '');
}

/**
 * Line key of a label: its line, or the label without suffix when it has none
 * @param {string} label
 * @returns {string}
 */
function lineKey(label) {
	'use strict';
	var stripped = stripSuffix(label),
		line = base006.lineOf(stripped);
	return line !== null ? String(line) : stripped;
}

/**
 * Rows of a *.dupairs.dot text with their cells as written
 * @param {string} text
 * @returns {Array} [{name, cells: [{def, use}]}] (use: a label, or [decision, target])
 */
function parseRows(text) {
	'use strict';
	var rows = [],
		rowPattern = /<tr><td>([^<]*)<\/td>(.*?)<\/tr>/g,
		match;
	while ((match = rowPattern.exec(text)) !== null) {
		if (/COLSPAN/.test(match[2])) {
			continue;
		}
		var cells = [],
			cellPattern = /<td>([^<]*)<\/td>/g,
			cell;
		while ((cell = cellPattern.exec(match[2])) !== null) {
			var parts = !!cell[1] && base006.splitPair(cell[1]);
			if (parts) {
				var use = base006.splitPair(parts[1]);
				cells.push({def: parts[0].trim(), use: use ? [use[0].trim(), use[1].trim()] : parts[1].trim()});
			}
		}
		rows.push({name: match[1], cells: cells});
	}
	return rows;
}

function cellLabels(cell) {
	'use strict';
	return [cell.def].concat(cell.use);
}

/**
 * Pair string "name: def -> use" of a cell with its labels mapped
 * @param {string} name
 * @param {Object} cell
 * @param {Function} map
 * @returns {string}
 */
function pairText(name, cell, map) {
	'use strict';
	var use = Array.isArray(cell.use) ? '(' + map(cell.use[0]) + ',' + map(cell.use[1]) + ')' : map(cell.use);
	return name + ': ' + map(cell.def) + ' -> ' + use;
}

function keyCompare(a, b) {
	'use strict';
	var numberA = /^\d+$/.test(a), numberB = /^\d+$/.test(b);
	if (numberA && numberB) {
		return Number(a) - Number(b);
	}
	if (numberA !== numberB) {
		return numberA ? -1 : 1;
	}
	return a < b ? -1 : (a > b ? 1 : 0);
}

/**
 * Models of one side of a page and level: rows and graph labels per line key
 * @param {string} dir
 * @param {Array} files *.dupairs.dot files
 * @returns {Array} [{file, rows, byKey: Map(key -> sorted labels)}]
 */
function modelsOf(dir, files) {
	'use strict';
	return files.map(function (file) {
		var graph = readText(dir, file.replace(/\.dupairs\.dot$/, '.graph.dot')),
			byKey = new Map();
		(graph === null ? [] : graphNodes(graph)).forEach(function (node) {
			var key = lineKey(node.label);
			if (!byKey.has(key)) {
				byKey.set(key, []);
			}
			byKey.get(key).push(node.label);
		});
		byKey.forEach(function (labels) {
			labels.sort();
		});
		return {file: file, rows: parseRows(readText(dir, file)), byKey: byKey};
	});
}

function signatureOf(models, key) {
	'use strict';
	return unique(models.filter(function (model) {
		return model.byKey.has(key);
	}).map(function (model) {
		return model.byKey.get(key).join('\u0001');
	})).sort().join('\u0002');
}

function labelCountOf(models, key) {
	'use strict';
	return unique([].concat.apply([], models.map(function (model) {
		return model.byKey.get(key) || [];
	}))).length;
}

/**
 * Pairs of a page and level on both sides (§1 steps 1–2, D022)
 * @param {Array} baseModels
 * @param {Array} nextModels
 * @returns {Object} {base: {pairs, names, stripped: Map}, next: {...}, perModel: Map(file -> Set),
 *   segments: [{line, base, next}]}
 */
function pairsOfLevel(baseModels, nextModels) {
	'use strict';
	var keys = new Set();
	baseModels.concat(nextModels).forEach(function (model) {
		model.byKey.forEach(function (labels, key) {
			keys.add(key);
		});
	});
	var changed = new Set(Array.from(keys).filter(function (key) {
		return signatureOf(baseModels, key) !== signatureOf(nextModels, key);
	}));
	function map(label) {
		return changed.has(lineKey(label)) ? stripSuffix(label) : label.trim();
	}
	var used = new Set(),
		perModel = new Map();
	function side(models) {
		var pairs = [], names = [], stripped = new Map(), cells = new Map();
		models.forEach(function (model) {
			var own = new Set();
			model.rows.forEach(function (row) {
				names.push(row.name);
				row.cells.forEach(function (cell) {
					var text = pairText(row.name, cell, map);
					pairs.push(text);
					own.add(text);
					stripped.set(text, pairText(row.name, cell, stripSuffix));
					cells.set(text, {name: row.name, cell: {def: map(cell.def), use: Array.isArray(cell.use) ? cell.use.map(map) : map(cell.use)}});
					cellLabels(cell).forEach(function (label) {
						used.add(lineKey(label));
					});
				});
			});
			perModel.set(model.file, own);
		});
		return {pairs: unique(pairs), names: unique(names), stripped: stripped, cells: cells};
	}
	var base = side(baseModels),
		next = side(nextModels);
	return {
		base: base,
		next: next,
		perModel: perModel,
		changed: changed,
		segments: Array.from(changed).filter(function (key) {
			return used.has(key);
		}).sort(keyCompare).map(function (key) {
			return {line: key, base: labelCountOf(baseModels, key), next: labelCountOf(nextModels, key)};
		})
	};
}

/* ---------- facts of the source ---------- */

/**
 * Member targets of a destructuring pattern or of an assignment left side
 * @param {Object} pattern
 * @param {Array} targets output
 */
function collectTargets(pattern, targets) {
	'use strict';
	if (!pattern) {
		return;
	}
	if (pattern.type === 'MemberExpression') {
		targets.push(pattern);
	} else if (pattern.type === 'ArrayPattern') {
		pattern.elements.forEach(function (element) {
			collectTargets(element, targets);
		});
	} else if (pattern.type === 'ObjectPattern') {
		pattern.properties.forEach(function (property) {
			collectTargets(property.type === 'RestElement' ? property : property.value, targets);
		});
	} else if (pattern.type === 'RestElement') {
		collectTargets(pattern.argument, targets);
	} else if (pattern.type === 'AssignmentPattern') {
		collectTargets(pattern.left, targets);
	}
}

/**
 * Facts of one page source for the member target triggers
 * @param {Object} facts classify.sourceFacts(source)
 * @returns {Object}
 */
function memberFactsOf(facts) {
	'use strict';
	var targets = [],
		refOf = new Map(),
		reads = [],
		readRefs = new Map(),
		writes = new Map(),
		declarations = new Map(),
		direct = new Map();
	facts.nodes.forEach(function (node) {
		if (node.type === 'AssignmentExpression') {
			collectTargets(node.left, targets);
		} else if ((node.type === 'ForInStatement' || node.type === 'ForOfStatement') && node.left.type !== 'VariableDeclaration') {
			collectTargets(node.left, targets);
		}
	});
	facts.scopeManager.scopes.forEach(function (scope) {
		scope.references.forEach(function (reference) {
			refOf.set(reference.identifier, reference);
			if (reference.isRead()) {
				reads.push(reference.identifier);
				if (!readRefs.has(reference.identifier.name)) {
					readRefs.set(reference.identifier.name, []);
				}
				readRefs.get(reference.identifier.name).push(reference);
			}
			if (reference.isWrite()) {
				var name = reference.identifier.name;
				if (!writes.has(name)) {
					writes.set(name, new Set());
				}
				writes.get(name).add(reference.identifier.loc.start.line);
			}
		});
		scope.variables.forEach(function (variable) {
			declarations.set(variable.name, (declarations.get(variable.name) || 0) + variable.defs.length);
		});
	});
	targets.forEach(function (target) {
		if (target.object.type === 'Identifier') {
			var name = target.object.name;
			if (!direct.has(name)) {
				direct.set(name, new Set());
			}
			direct.get(name).add(target.loc.start.line);
		}
	});
	function exempt(target) {
		var root = target;
		while (root.type === 'MemberExpression') {
			root = root.object;
		}
		if (root.type !== 'Identifier' || root.name !== 'localStorage') {
			return false;
		}
		var reference = refOf.get(root);
		return !reference || reference.resolved === null;
	}
	var open = targets.filter(function (target) {
		return !exempt(target);
	});
	// a read of name inside a member target that is not exempt, on a line that passes the test
	function newRead(name, test) {
		return reads.some(function (identifier) {
			return identifier.name === name && test(identifier.loc.start.line) && open.some(function (target) {
				return identifier.range[0] >= target.range[0] && identifier.range[1] <= target.range[1];
			});
		});
	}
	function inRanges(ranges) {
		return function (line) {
			return ranges.some(function (range) {
				return within(range, line);
			});
		};
	}
	return {
		facts: facts,
		refOf: refOf,
		directLines: function (name) {
			return direct.get(name) || new Set();
		},
		directNames: direct,
		newReadAt: function (name, line) {
			return newRead(name, function (at) {
				return at === line;
			});
		},
		// D023: R(f) of a summary
		newReadIn: function (name, ranges) {
			return newRead(name, inRanges(ranges));
		},
		directIn: function (name, ranges) {
			return Array.from(direct.get(name) || []).some(inRanges(ranges));
		},
		// eslint-scope write references (a declaration with an initial value included)
		writeLines: function (name) {
			return writes.get(name) || new Set();
		},
		declarationCount: function (name) {
			return declarations.get(name) || 0;
		},
		// D024: eslint-scope read references of a name
		readRefsOf: function (name) {
			return readRefs.get(name) || [];
		}
	};
}

function inFunction(node, parents) {
	'use strict';
	var current = parents.get(node);
	while (current) {
		if (FUNCTION_TYPE.test(current.type)) {
			return true;
		}
		current = parents.get(current);
	}
	return false;
}

/**
 * Calls on a call site line of a page: their callee or receiver name, and
 * whether the call is an o.m() of the relaxation (FR-004)
 * @param {Object} page memberFactsOf result
 * @param {number} line
 * @returns {Array} [{name, relax}]
 */
function callsAt(page, line) {
	'use strict';
	var facts = page.facts;
	return facts.nodes.filter(function (node) {
		return (node.type === 'CallExpression' || node.type === 'NewExpression') &&
			(node.loc.start.line === line || node.callee.loc.end.line === line);
	}).map(function (node) {
		var callee = node.callee;
		if (callee.type === 'Identifier') {
			return {name: callee.name, relax: false};
		}
		if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') {
			return {name: null, relax: false};
		}
		var reference = page.refOf.get(callee.object),
			variable = reference ? reference.resolved : null,
			defs = variable ? variable.defs : [],
			def = defs.length === 1 ? defs[0] : null;
		return {
			name: callee.object.name,
			relax: node.type === 'CallExpression' && inFunction(node, facts.parents) && !!def && def.type === 'Variable' &&
				(def.parent.kind === 'let' || def.parent.kind === 'const') && !!def.node.init && def.node.init.type === 'NewExpression'
		};
	});
}

function emptyKiFacts() {
	'use strict';
	return {tries: [], caseLines: new Set(), iterables: [], staticClasses: [], conservative: false, error: null};
}

function unionKiFacts(list) {
	'use strict';
	var facts = emptyKiFacts();
	list.forEach(function (item) {
		[].push.apply(facts.tries, item.tries);
		facts.conservative = facts.conservative || item.conservative;
	});
	return facts;
}

function mergeOutputFacts(list) {
	'use strict';
	var facts = {records: [], edges: [], ranges: new Map(), excDecisions: new Set(), handlerDup: false};
	list.forEach(function (item) {
		[].push.apply(facts.records, item.records);
		[].push.apply(facts.edges, item.edges);
		item.ranges.forEach(function (range, scope) {
			facts.ranges.set(scope, range);
		});
		facts.handlerDup = facts.handlerDup || item.handlerDup;
	});
	return facts;
}

/* ---------- §2 page triggers ---------- */

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
 * Triggers of a page
 * @param {Array} pages memberFactsOf results of the pages of the level
 * @param {Object} ki KI source facts (007 sourceFactsOf)
 * @param {Object} base output facts of the base
 * @param {Object} next output facts of this branch
 * @returns {Object}
 */
function pageInfoOf(pages, ki, base, next) {
	'use strict';
	var ranges = new Map(),
		rangesOf = function (scopes) {
			return scopes.map(function (scope) {
				return ranges.get(scope);
			}).filter(Boolean);
		},
		baseByLine = calleesByLine(base.records),
		nextByLine = calleesByLine(next.records),
		info = {
			pages: pages,
			ki: ki,
			links: [],
			ranges: ranges,
			records: base.records.concat(next.records),
			newCallSite: base006.multisetDiff(base.records.map(recordKey), next.records.map(recordKey)).length > 0,
			shared: [],
			handlerDup: next.handlerDup,
			base: base,
			next: next
		};
	base.ranges.forEach(function (range, scope) {
		ranges.set(scope, range);
	});
	next.ranges.forEach(function (range, scope) {
		ranges.set(scope, range);
	});
	unique(Array.from(baseByLine.keys()).concat(Array.from(nextByLine.keys()))).sort(function (a, b) {
		return a - b;
	}).forEach(function (line) {
		var before = Array.from(baseByLine.get(line) || []),
			after = Array.from(nextByLine.get(line) || []),
			added = after.filter(function (callee) {
				return before.indexOf(callee) === -1;
			});
		if (added.length === 0 && before.length === after.length) {
			return;
		}
		var calls = [].concat.apply([], pages.map(function (page) {
			return callsAt(page, line).map(function (call) {
				return {name: call.name, relax: call.relax, page: page};
			});
		}));
		info.links.push({
			line: line,
			callees: unique(before.concat(after)).sort(),
			added: added,
			ranges: rangesOf(unique(transitive(after, next.edges).concat(transitive(before, base.edges)))),
			spill: calls.some(function (call) {
				return call.name !== null && call.page.directLines(call.name).size > 0;
			}),
			relax: added.length > 0 && calls.some(function (call) {
				return call.relax;
			})
		});
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
	return info;
}

/**
 * The innermost function holding a line (the smallest intra-procedural range
 * of either side), null at the top level
 * @param {Object} info
 * @param {number} line
 * @returns {string|null}
 */
function innermostScope(info, line) {
	'use strict';
	var best = null;
	info.ranges.forEach(function (range, scope) {
		if (within(range, line) && (best === null || range.end - range.start < best.range.end - best.range.start)) {
			best = {scope: scope, range: range};
		}
	});
	return best && best.scope;
}

/**
 * Call site lines of the callers of the innermost function holding a line,
 * transitively (T010)
 * @param {Object} info
 * @param {number} line
 * @returns {Array}
 */
function callerLinesOf(info, line) {
	'use strict';
	var lines = [],
		seenScopes = new Set(),
		seenLines = new Set([line]);
	(function visit(at) {
		var scope = innermostScope(info, at);
		if (!scope || seenScopes.has(scope)) {
			return;
		}
		seenScopes.add(scope);
		info.records.forEach(function (record) {
			if (record.callee === scope && !seenLines.has(record.line)) {
				seenLines.add(record.line);
				lines.push(record.line);
				visit(record.line);
			}
		});
	}(line));
	return lines;
}

/* ---------- §2 classification ---------- */

function pairOf(content) {
	'use strict';
	var parts = base006.pairParts(content);
	parts.lines = [parts.defLine].concat(parts.useLines).filter(function (line) {
		return line !== null;
	});
	return parts;
}

/**
 * Position condition of 外溢 / 放寬 (§2, T010)
 * @param {Object} pair
 * @param {Object} link
 * @param {Object} info
 * @returns {boolean}
 */
function positionHolds(pair, link, info, diff) {
	'use strict';
	// D023 (a): a relabelling of the trigger line itself
	if (diff && diff.relabelAt && diff.relabelAt(link.line)) {
		return true;
	}
	if (pair.lines.some(function (line) {
		return link.ranges.some(function (range) {
			return within(range, line);
		});
	})) {
		return true;
	}
	if (pair.useLine === null) {
		return false;
	}
	if (pair.useLine > link.line) {
		return true;
	}
	// T010: g() reached through a call of the function holding the call site
	if (!link.callers) {
		link.callers = callerLinesOf(info, link.line);
	}
	return link.callers.some(function (line) {
		return pair.useLine > line;
	});
}

/* ---------- D023 summaries and rows ---------- */

/**
 * R(f): the line range of a function in the base and those of its callees
 * along the call edges of the base hierarchy, transitively
 * @param {Object} info
 * @param {string} scope
 * @returns {Array}
 */
function summaryRanges(info, scope) {
	'use strict';
	var base = info.base || {ranges: new Map(), edges: []};
	return transitive([scope], base.edges).map(function (item) {
		return base.ranges.get(item);
	}).filter(Boolean);
}

function edgeKey(edge) {
	'use strict';
	return edge.from + '\u0000' + edge.to;
}

/**
 * N(f) of D024: the scopes reached from f along the call edges of this branch
 * less f and those reached along the base call edges; an edge of this branch
 * that is not in the base counts only when a 外溢 / 放寬 trigger line adds its
 * callee in its caller (the innermost function of the line, or the top level
 * for a caller with no range)
 * @param {Object} info
 * @returns {Function} scope -> Set
 */
function newReachOf(info) {
	'use strict';
	if (info.newReach) {
		return info.newReach;
	}
	var base = info.base || {edges: []},
		next = info.next || {edges: []},
		baseKeys = new Set(base.edges.map(edgeKey)),
		triggers = info.links.filter(function (link) {
			return link.spill || link.relax;
		}),
		edges = next.edges.filter(function (edge) {
			return baseKeys.has(edgeKey(edge)) || triggers.some(function (link) {
				var holder = innermostScope(info, link.line);
				return (link.added || []).indexOf(edge.to) !== -1 &&
					(holder === edge.from || (holder === null && !info.ranges.has(edge.from)));
			});
		}),
		cache = new Map();
	info.newReach = function (scope) {
		if (!cache.has(scope)) {
			var before = new Set(transitive([scope], base.edges));
			cache.set(scope, new Set(transitive([scope], edges).filter(function (item) {
				return item !== scope && !before.has(item);
			})));
		}
		return cache.get(scope);
	};
	return info.newReach;
}

/**
 * D024 upwardExposed +v: a read reference of v on a line whose innermost
 * function is in N, resolving outside that function (or to no variable)
 * @param {Object} info
 * @param {string} name
 * @param {Set} reach N(f)
 * @returns {boolean}
 */
function readOutsideIn(info, name, reach) {
	'use strict';
	return info.pages.some(function (page) {
		var parents = page.facts.parents;
		return page.readRefsOf(name).some(function (reference) {
			var identifier = reference.identifier,
				scope = innermostScope(info, identifier.loc.start.line),
				range = scope ? info.ranges.get(scope) : null;
			if (!range || !reach.has(scope)) {
				return false;
			}
			var holder = parents.get(identifier);
			while (holder && !(FUNCTION_TYPE.test(holder.type) && holder.loc.start.line <= range.start &&
				holder.loc.end.line >= range.end)) {
				holder = parents.get(holder);
			}
			if (!holder) {
				return false;
			}
			var variable = reference.resolved;
			if (!variable) {
				return true;
			}
			var block = variable.scope.block;
			return !(block.range[0] >= holder.range[0] && block.range[1] <= holder.range[1]);
		});
	});
}

function shortScope(scope) {
	'use strict';
	return scope.replace(/^\$DOMAIN\.\$PAGE_\d+\.?/, '') || scope;
}

function elementParts(element) {
	'use strict';
	var at = element.lastIndexOf('@');
	return at === -1 ? {name: element, node: null} : {name: element.slice(0, at), node: element.slice(at + 1)};
}

/**
 * Key of a summary element for the comparison of the two sides (D025): v@n
 * with node n in the labels of the *.graph.dot of the same model becomes
 * "v@[label]"; with no such node (no graph) it stays v@n, and an element with
 * no node (mustKill, upwardExposed) stays as it is
 * @param {string} element
 * @param {Map} [labels] node id -> label
 * @returns {string}
 */
function elementKey(element, labels) {
	'use strict';
	var parts = elementParts(element);
	return parts.node !== null && labels && labels.has(parts.node) ? parts.name + '@[' + labels.get(parts.node) + ']' : element;
}

/**
 * Element differences of the summaries of a matching file (D023 (b), D024,
 * FR-003): each must be (1) a gen / exceptional v@n removed whose node line
 * (base graph) has a 定義性成員目標 of v, (2) a mustKill v removed with such a
 * target in R(f), (3) an upwardExposed v added with a non-exempt member target
 * reading v in R(f), (4) a gen / exceptional v@n added whose node line (graph
 * of this branch) has an eslint-scope write reference of v, the same summary
 * having a (1) of v, or, in a file of a page with a 外溢 / 放寬 trigger line
 * (linked), (5) a gen / exceptional v@n added whose node line has its
 * innermost function in N(f) and a write reference of v, some g in N(f)
 * having the same v@n in the same field, or an upwardExposed v added with a
 * read reference of v on a line whose innermost function is in N(f),
 * resolving outside it, and v in the upwardExposed of some g in N(f).
 * Anything else (mustKill added, upwardExposed removed, a flag or another
 * field changed) fails; so does a function of the base only, and one of this
 * branch only that is not in N(f) of some function on both sides.
 * @param {Object} summary {restEqual, base, next, baseLines, nextLines}
 * @param {Object} info
 * @param {boolean} linked the page has a 外溢 / 放寬 trigger line
 * @returns {Object} {restEqual, keysSame, items, failures, newKeys, plus, minus}
 */
function summaryCheck(summary, info, linked) {
	'use strict';
	var result = {restEqual: summary.restEqual, keysSame: true, items: [], failures: [], newKeys: [], plus: 0, minus: 0},
		baseKeys = Object.keys(summary.base).sort(),
		nextKeys = Object.keys(summary.next).sort(),
		has = function (object, key) {
			return Object.prototype.hasOwnProperty.call(object, key);
		},
		common = baseKeys.filter(function (scope) {
			return has(summary.next, scope);
		}),
		reachOf = linked ? newReachOf(info) : function () {
			return new Set();
		},
		reachAll = new Set();
	result.keysSame = baseKeys.join('\u0000') === nextKeys.join('\u0000');
	function anyPage(test) {
		return info.pages.some(test);
	}
	function list(object, field) {
		return object && Array.isArray(object[field]) ? object[field] : [];
	}
	common.forEach(function (scope) {
		reachOf(scope).forEach(function (item) {
			reachAll.add(item);
		});
	});
	// D024: keys on one side only
	baseKeys.forEach(function (scope) {
		if (!has(summary.next, scope)) {
			result.failures.push('鍵 −' + shortScope(scope));
		}
	});
	nextKeys.forEach(function (scope) {
		if (has(summary.base, scope)) {
			return;
		}
		if (reachAll.has(scope)) {
			result.newKeys.push(shortScope(scope));
		} else {
			result.failures.push('鍵 +' + shortScope(scope));
		}
	});
	common.forEach(function (scope) {
		var before = summary.base[scope],
			after = summary.next[scope],
			label = shortScope(scope),
			ranges = null,
			removed = new Set();
		function rangesOf() {
			if (ranges === null) {
				ranges = summaryRanges(info, scope);
			}
			return ranges;
		}
		function note(field, sign, element, holds, via) {
			var text = label + '.' + field + ' ' + (sign === '+' ? '+' : '−') + element + (via ? '（新連結 ' + shortScope(via) + '）' : '');
			if (holds) {
				result.items.push(text);
				if (sign === '+') {
					result.plus++;
				} else {
					result.minus++;
				}
			} else {
				result.failures.push(text);
			}
		}
		// D025: an element v@n is compared as v with the label of node n in
		// the *.graph.dot of the same model on its side (no graph or no such
		// node: the node number itself), so a pure renumbering is no change
		function changes(field) {
			var was = list(before, field), now = list(after, field),
				wasKeys = was.map(function (element) {
					return elementKey(element, summary.baseLabels);
				}),
				nowKeys = now.map(function (element) {
					return elementKey(element, summary.nextLabels);
				});
			return {
				removed: was.filter(function (element, index) {
					return nowKeys.indexOf(wasKeys[index]) === -1;
				}),
				added: now.filter(function (element, index) {
					return wasKeys.indexOf(nowKeys[index]) === -1;
				})
			};
		}
		// D024 (5): the g in N(f) whose summary of this branch passes the test
		function linkedBy(test) {
			return Array.from(reachOf(scope)).sort().filter(function (item) {
				return has(summary.next, item) && test(summary.next[item]);
			})[0] || null;
		}
		unique(Object.keys(before).concat(Object.keys(after))).forEach(function (field) {
			if (['gen', 'exceptional', 'mustKill', 'upwardExposed'].indexOf(field) === -1 &&
				JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
				result.failures.push(label + '.' + field + ' ' + JSON.stringify(before[field]) + '→' + JSON.stringify(after[field]));
			}
		});
		['gen', 'exceptional'].forEach(function (field) {
			changes(field).removed.forEach(function (element) {
				var parts = elementParts(element),
					line = summary.baseLines.get(parts.node),
					holds = line !== undefined && anyPage(function (page) {
						return page.directLines(parts.name).has(line);
					});
				if (holds) {
					removed.add(parts.name);
				}
				note(field, '-', element, holds);
			});
		});
		['gen', 'exceptional'].forEach(function (field) {
			changes(field).added.forEach(function (element) {
				var parts = elementParts(element),
					line = summary.nextLines.get(parts.node),
					written = line !== undefined && anyPage(function (page) {
						return page.writeLines(parts.name).has(line);
					}),
					via = null;
				if (written && !removed.has(parts.name) && linked && reachOf(scope).has(innermostScope(info, line))) {
					via = linkedBy(function (other) {
						return list(other, field).indexOf(element) !== -1;
					});
				}
				note(field, '+', element, written && (removed.has(parts.name) || via !== null), via);
			});
		});
		var kill = changes('mustKill'), exposed = changes('upwardExposed');
		kill.removed.forEach(function (name) {
			note('mustKill', '-', name, anyPage(function (page) {
				return page.directIn(name, rangesOf());
			}));
		});
		kill.added.forEach(function (name) {
			note('mustKill', '+', name, false);
		});
		exposed.added.forEach(function (name) {
			if (anyPage(function (page) {
				return page.newReadIn(name, rangesOf());
			})) {
				note('upwardExposed', '+', name, true);
				return;
			}
			var via = linked && readOutsideIn(info, name, reachOf(scope)) ? linkedBy(function (other) {
				return list(other, 'upwardExposed').indexOf(name) !== -1;
			}) : null;
			note('upwardExposed', '+', name, via !== null, via);
		});
		exposed.removed.forEach(function (name) {
			note('upwardExposed', '-', name, false);
		});
	});
	return result;
}

/**
 * 成員目標（列消失） (D023 (c), FR-001): base models of the page and level with
 * a row of v whose every def line has a 定義性成員目標 of v (a row with no pair
 * too), and whose graph node lines have no write reference of v (a declaration
 * with an initial value included); at most one declaration of v on the page;
 * no more row − of v than such models: as the row unit is a union over the
 * models (D022), every base model with a row of v must hold
 * @param {Object} diff
 * @param {Object} info
 * @returns {boolean}
 */
function rowGoneHolds(diff, info) {
	'use strict';
	var name = diff.content,
		declarations = 0;
	info.pages.forEach(function (page) {
		declarations += page.declarationCount(name);
	});
	if (declarations > 1) {
		return false;
	}
	var models = diff.rowModels.filter(function (model) {
		var defsHold = model.rows.every(function (row) {
				return row.name !== name || row.cells.every(function (cell) {
					var line = base006.lineOf(stripSuffix(cell.def));
					return line !== null && info.pages.some(function (page) {
						return page.directLines(name).has(line);
					});
				});
			}),
			lines = [];
		model.byKey.forEach(function (labels, key) {
			if (/^\d+$/.test(key)) {
				lines.push(Number(key));
			}
		});
		return defsHold && !info.pages.some(function (page) {
			var writes = page.writeLines(name);
			return lines.some(function (line) {
				return writes.has(line);
			});
		});
	});
	// the row unit is the union over the models of the page and level (D022):
	// a row − of v means v left every base model with a row of v, so each of
	// them must hold (no more row − of v than such models)
	return models.length > 0 && models.length === diff.rowModels.length;
}

/**
 * Categories of a difference, in ORDER (層級新增 is added afterwards)
 * @param {Object} diff
 * @param {Object} info result of pageInfoOf
 * @returns {Array}
 */
function categoriesOf(diff, info) {
	'use strict';
	var found = new Set(),
		intraProcedural = /^intra-procedurals\//.test(diff.file),
		ki = info.ki,
		spills = info.links.filter(function (link) {
			return link.spill;
		}),
		relaxes = info.links.filter(function (link) {
			return link.relax;
		});
	if (diff.unit === 'pair') {
		var pair = pairOf(diff.content),
			reasons = [];
		if (diff.sign === '-' && pair.defLine !== null) {
			info.pages.forEach(function (page) {
				if (!page.directLines(pair.name).has(pair.defLine)) {
					return;
				}
				var result = classify.classifyRemoved({facts: page.facts, variable: pair.name, defLine: pair.defLine, useLine: pair.useLine});
				if (result) {
					found.add(result.sub ? result.category + '（' + result.sub + '）' : result.category);
					reasons.push(result.reason);
				}
			});
		}
		if (diff.sign === '+') {
			if (pair.useLine !== null && info.pages.some(function (page) {
				return page.newReadAt(pair.name, pair.useLine);
			})) {
				found.add(NEW_READ);
			}
			if (info.pages.some(function (page) {
				var lines = page.directLines(pair.name);
				return lines.size > 0 && !(pair.defLine !== null && lines.has(pair.defLine));
			})) {
				found.add(NO_KILL);
			}
		}
		if (reasons.length > 0) {
			diff.reason = unique(reasons).join('；');
		}
		if (spills.some(function (link) {
			return positionHolds(pair, link, info, diff);
		})) {
			found.add(SPILL);
		}
		if (relaxes.some(function (link) {
			return positionHolds(pair, link, info, diff);
		})) {
			found.add(RELAX);
		}
		if (!intraProcedural && ki.conservative) {
			found.add('§37');
		}
		if (ki.tries.some(function (item) {
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
	} else {
		// D023 (b): the summaries of a matching file, element by element
		var summary = diff.unit === 'matching' && diff.sign === '~' && !diff.sameShape && diff.summary ?
				summaryCheck(diff.summary, info, spills.length > 0 || relaxes.length > 0) : null,
			summaryHolds = !summary || summary.failures.length === 0;
		if (summary) {
			diff.summaryResult = summary;
		}
		if (summaryHolds && spills.length > 0) {
			found.add(SPILL);
		}
		if (summaryHolds && relaxes.length > 0) {
			found.add(RELAX);
		}
		if ((diff.unit === 'graph' || diff.unit === 'matching') && (diff.sameShape || (summaryHolds && info.newCallSite))) {
			found.add('共通');
		}
		if (summary && summaryHolds && summary.restEqual && summary.keysSame && summary.items.length > 0) {
			found.add(SUMMARY);
		}
		if (diff.unit === 'row' && diff.sign === '-' && diff.rowModels && rowGoneHolds(diff, info)) {
			found.add(ROW_GONE);
		}
	}
	return ORDER.filter(function (category) {
		return found.has(category);
	});
}

function mainCategory(category) {
	'use strict';
	return category.replace(/（.*）$/, '');
}

/* ---------- §1 comparison ---------- */

/**
 * Input of the summary check of a matching file (D023 (b))
 * @param {string} raw base *.matching.json
 * @param {string} next *.matching.json of this branch
 * @param {string|null} baseGraph *.graph.dot of the same model in the base
 * @param {string|null} nextGraph *.graph.dot of the same model in this branch
 * @returns {Object|null} {labelEqual, restEqual, base, next, baseLines, nextLines, baseLabels, nextLabels}
 */
function summaryInput(raw, next, baseGraph, nextGraph) {
	'use strict';
	var before, after;
	try {
		before = JSON.parse(raw);
		after = JSON.parse(next);
	} catch (ignored) {
		return null;
	}
	function linesOf(text) {
		var lines = new Map();
		(text === null ? [] : graphNodes(text)).forEach(function (node) {
			var line = base006.lineOf(stripSuffix(node.label));
			if (line !== null) {
				lines.set(node.id, line);
			}
		});
		return lines;
	}
	function labelsOf(text) {
		var labels = new Map();
		(text === null ? [] : graphNodes(text)).forEach(function (node) {
			labels.set(node.id, node.label);
		});
		return labels;
	}
	function labelled(summaries, text) {
		var labels = labelsOf(text);
		return JSON.stringify(summaries, function (key, value) {
			return typeof value === 'string' ? value.replace(/@(n\d+)$/, function (whole, id) {
				return '@' + (labels.has(id) ? labels.get(id) : id);
			}) : value;
		});
	}
	var base = before.summaries || {}, now = after.summaries || {};
	delete before.summaries;
	delete after.summaries;
	return {
		labelEqual: labelled(base, baseGraph) === labelled(now, nextGraph),
		restEqual: JSON.stringify(before) === JSON.stringify(after),
		base: base,
		next: now,
		baseLines: linesOf(baseGraph),
		nextLines: linesOf(nextGraph),
		baseLabels: labelsOf(baseGraph),
		nextLabels: labelsOf(nextGraph)
	};
}

/**
 * Pairs of the *.matching.json files of a page and level (D024): the same
 * mainScope on both sides, whatever the file numbers; a file with no
 * counterpart stands alone. A mainScope that is not unique on a side is an
 * error, and so is a file with no mainScope; such a group is paired by name.
 * @param {Object} spec {name, baseDir, newDir}
 * @param {Object} group {page, level, base, next}
 * @param {Array} errors
 * @returns {Array} [{base, next}] (file names relative to the case, null when absent)
 */
function pairMatching(spec, group, errors) {
	'use strict';
	function scopesOf(dir, files) {
		var scopes = new Map(),
			valid = true;
		files.forEach(function (file) {
			var scope = null;
			try {
				scope = JSON.parse(readText(dir, file)).mainScope || null;
			} catch (ignored) {
				scope = null;
			}
			if (scope === null) {
				errors.push(spec.name + ' ' + file + '：沒有 mainScope，無法配對 matching 檔（D024）');
				valid = false;
			} else if (scopes.has(scope)) {
				errors.push(spec.name + ' ' + group.page + ' ' + (group.level || '(inter-page)') + '：mainScope ' + scope +
					' 不唯一（' + scopes.get(scope) + '、' + file + '），無法配對 matching 檔（D024）');
				valid = false;
			} else {
				scopes.set(scope, file);
			}
		});
		return valid ? scopes : null;
	}
	var before = scopesOf(spec.baseDir, group.base),
		after = scopesOf(spec.newDir, group.next),
		pairs = [];
	if (!before || !after) {
		unique(group.base.concat(group.next)).sort().forEach(function (file) {
			pairs.push({base: group.base.indexOf(file) !== -1 ? file : null, next: group.next.indexOf(file) !== -1 ? file : null});
		});
		return pairs;
	}
	before.forEach(function (file, scope) {
		pairs.push({base: file, next: after.has(scope) ? after.get(scope) : null});
	});
	after.forEach(function (file, scope) {
		if (!before.has(scope)) {
			pairs.push({base: null, next: file});
		}
	});
	return pairs.sort(function (a, b) {
		return (a.next || a.base) < (b.next || b.base) ? -1 : 1;
	});
}

/**
 * Compare the outputs of a case and classify each difference
 * @param {Object} spec {name, pageSources, baseDir, newDir}
 * @returns {Object} {name, diffs, infos, errors, duplicates, segmentRows}
 * @throws {Error} when a base model has a CALL node and no *.matching.json
 */
function compareCase(spec) {
	'use strict';
	var pattern = /\.dot$|\.matching\.json$/,
		baseFiles = listFiles(spec.baseDir, pattern),
		newFiles = listFiles(spec.newDir, pattern),
		diffs = [],
		duplicates = [],
		segmentRows = [],
		groups = new Map(),
		matchGroups = new Map(),
		errors = [];
	baseFiles.filter(function (file) {
		return /\.graph\.dot$/.test(file);
	}).forEach(function (file) {
		var matching = file.replace(/\.graph\.dot$/, '.matching.json');
		if (baseFiles.indexOf(matching) === -1 && hasCallNode(readText(spec.baseDir, file))) {
			throw new Error('基準側 ' + spec.name + ' ' + file + ' 有 CALL 節點，卻缺少 ' + matching + '（無法取得呼叫點）');
		}
	});
	function push(located, unit, sign, content, extra) {
		var diff = Object.assign({caseName: spec.name, page: located.page, file: located.file, unit: unit, sign: sign,
			content: content}, extra || {});
		diffs.push(diff);
		return diff;
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
				push(located, 'model', inNew ? '+' : '-', located.file);
			}
			var before = inBase ? base007.duplicateCount(readText(spec.baseDir, file)) : 0,
				after = inNew ? base007.duplicateCount(readText(spec.newDir, file)) : 0;
			if (before > 0 || after > 0) {
				duplicates.push({file: located.file, page: located.page, base: before, next: after});
			}
			return;
		}
		if (unit === 'matching') {
			// D024: paired by mainScope below
			var matchKey = located.page + '|' + located.level;
			if (!matchGroups.has(matchKey)) {
				matchGroups.set(matchKey, {page: located.page, level: located.level, base: [], next: []});
			}
			if (inBase) {
				matchGroups.get(matchKey).base.push(file);
			}
			if (inNew) {
				matchGroups.get(matchKey).next.push(file);
			}
			return;
		}
		if (!inBase || !inNew) {
			push(located, unit, inNew ? '+' : '-', located.file);
			return;
		}
		var raw = readText(spec.baseDir, file),
			next = readText(spec.newDir, file);
		if (sha256(raw) === sha256(next)) {
			return;
		}
		push(located, unit, '~', located.file, {sameShape: stripIds(raw) === stripIds(next), summary: null});
	});
	matchGroups.forEach(function (group) {
		pairMatching(spec, group, errors).forEach(function (item) {
			if (!item.base || !item.next) {
				var only = base006.locate(item.base || item.next);
				push(only, 'matching', item.next ? '+' : '-', only.file);
				return;
			}
			var raw = readText(spec.baseDir, item.base),
				next = readText(spec.newDir, item.next);
			if (sha256(raw) === sha256(next)) {
				return;
			}
			var located = base006.locate(item.next),
				baseLocated = base006.locate(item.base),
				summary = summaryInput(raw, next, readText(spec.baseDir, item.base.replace(/\.matching\.json$/, '.graph.dot')),
					readText(spec.newDir, item.next.replace(/\.matching\.json$/, '.graph.dot')));
			push(located, 'matching', '~', item.base === item.next ? located.file : baseLocated.file + ' → ' + located.file, {
				// a matching file is renumbered only when its summaries are the same with node labels for node ids (D023, D024 (2))
				sameShape: stripIds(raw) === stripIds(next) && (!summary || summary.labelEqual),
				summary: summary
			});
		});
	});
	groups.forEach(function (group) {
		var located = {page: group.page, file: group.level + '*.dupairs.dot'},
			baseModels = modelsOf(spec.baseDir, group.base),
			level = pairsOfLevel(baseModels, modelsOf(spec.newDir, group.next)),
			newOnly = group.next.filter(function (file) {
				return group.base.indexOf(file) === -1;
			}),
			rowDiffs = base006.multisetDiff(level.base.names, level.next.names),
			pairDiffs = base006.multisetDiff(level.base.pairs, level.next.pairs);
		rowDiffs.forEach(function (item) {
			push(located, 'row', item.sign, item.content, item.sign !== '-' ? {} : {
				// D023 (c): the base models of the page and level with a row of the variable
				rowModels: baseModels.filter(function (model) {
					return model.rows.some(function (row) {
						return row.name === item.content;
					});
				}),
				rowCount: rowDiffs.filter(function (other) {
					return other.sign === '-' && other.content === item.content;
				}).length
			});
		});
		// D023 (a): a pair whose labels on a changed line L, made the line, is a
		// difference of the other sign (a pure relabelling of L)
		function relabelled(item) {
			var own = (item.sign === '+' ? level.next : level.base).cells.get(item.content),
				other = item.sign === '+' ? level.base : level.next;
			return function (line) {
				var key = String(line);
				if (!own || !level.changed.has(key)) {
					return false;
				}
				function normal(label) {
					return lineKey(label) === key ? key : label;
				}
				var labels = cellLabels(own.cell).map(lineKey);
				if (labels.indexOf(key) === -1) {
					return false;
				}
				var text = pairText(own.name, own.cell, normal);
				return pairDiffs.some(function (diff) {
					var cell = other.cells.get(diff.content);
					return diff.sign !== item.sign && !!cell && pairText(cell.name, cell.cell, normal) === text;
				});
			};
		}
		pairDiffs.forEach(function (item) {
			var plus = item.sign === '+',
				levelNew = !plus ? [] : newOnly.filter(function (file) {
					return level.perModel.get(file).has(item.content);
				});
			push(located, 'pair', item.sign, item.content, {
				stripped: (plus ? level.next : level.base).stripped.get(item.content),
				levelNew: levelNew.length > 0 ? levelNew : null,
				relabelAt: relabelled(item)
			});
		});
		level.segments.forEach(function (row) {
			segmentRows.push({page: group.page, file: group.level + '*.graph.dot', line: row.line, base: row.base, next: row.next});
		});
	});
	var pageFacts = spec.pageSources.map(function (source, index) {
			var ki = base007.sourceFactsOf(source),
				member = null;
			try {
				member = memberFactsOf(classify.sourceFacts(source));
			} catch (error) {
				errors.push(spec.name + ' page' + index + '：無法剖析（' + error.message + '）');
			}
			return {ki: ki, member: member};
		}),
		pageOutputs = pageFacts.map(function (facts, index) {
			return {
				base: base007.outputFactsOf(path.join(spec.baseDir, 'page' + index)),
				next: base007.outputFactsOf(path.join(spec.newDir, 'page' + index))
			};
		}),
		infos = {};
	pageFacts.forEach(function (facts, index) {
		infos['page' + index] = pageInfoOf(facts.member ? [facts.member] : [], facts.ki,
			pageOutputs[index].base, pageOutputs[index].next);
	});
	infos['inter-page'] = pageInfoOf(pageFacts.map(function (facts) {
		return facts.member;
	}).filter(Boolean), unionKiFacts(pageFacts.map(function (facts) {
		return facts.ki;
	})), mergeOutputFacts(pageOutputs.map(function (item) {
		return item.base;
	}).concat([base007.outputFactsOf(path.join(spec.baseDir, 'inter-page'))])), mergeOutputFacts(pageOutputs.map(function (item) {
		return item.next;
	}).concat([base007.outputFactsOf(path.join(spec.newDir, 'inter-page'))])));
	diffs.forEach(function (diff) {
		var info = infos[diff.page];
		diff.categories = info ? categoriesOf(diff, info) : [];
	});
	// 層級新增 (D022): the model + of the file has a category, and the pair is
	// in a base intra-pages/*.dupairs.dot of the same page
	var intraStripped = new Map();
	function baseIntraFileOf(page, stripped) {
		var files = page === 'inter-page' ? [] : baseFiles.filter(function (file) {
			return file.indexOf(page + '/intra-pages/') === 0 && /\.dupairs\.dot$/.test(file);
		});
		return files.filter(function (file) {
			if (!intraStripped.has(file)) {
				var set = new Set();
				parseRows(readText(spec.baseDir, file)).forEach(function (row) {
					row.cells.forEach(function (cell) {
						set.add(pairText(row.name, cell, stripSuffix));
					});
				});
				intraStripped.set(file, set);
			}
			return intraStripped.get(file).has(stripped);
		})[0] || null;
	}
	diffs.forEach(function (diff) {
		if (!diff.levelNew) {
			return;
		}
		var mains = new Set();
		diff.levelNew.forEach(function (file) {
			var located = base006.locate(file);
			diffs.forEach(function (other) {
				if (other.unit === 'model' && other.sign === '+' && other.page === located.page && other.content === located.file) {
					other.categories.forEach(function (category) {
						var main = mainCategory(category);
						if (main === SPILL || main === RELAX || main === '成員目標') {
							mains.add(main);
						}
					});
				}
			});
		});
		var baseFile = mains.size > 0 ? baseIntraFileOf(diff.page, diff.stripped) : null;
		if (baseFile) {
			diff.levelNewBase = baseFile;
			diff.categories = ORDER.filter(function (category) {
				return diff.categories.indexOf(category) !== -1 || (/（層級新增）$/.test(category) && mains.has(mainCategory(category)));
			});
		}
	});
	return {name: spec.name, diffs: diffs, infos: infos, errors: errors, duplicates: duplicates, segmentRows: segmentRows};
}

/* ---------- §4 report and record ---------- */

function isPinned(category) {
	'use strict';
	var main = mainCategory(category);
	return PINNED.indexOf(main) !== -1 || main.charAt(0) === '§';
}

function pinKey(caseName, page, category) {
	'use strict';
	return [caseName, page, category].join('\u0000');
}

/**
 * Pin table category of a recorded category: 成員目標（摘要） has its own row
 * (D023), the others their main category
 * @param {string} category
 * @returns {string}
 */
function pinCategory(category) {
	'use strict';
	return category === SUMMARY ? SUMMARY : mainCategory(category);
}

/**
 * Count a difference in a pin entry: + / − of its sign, or the summary
 * elements added / removed of a 成員目標（摘要） (D023)
 * @param {Object} entry
 * @param {Object} diff
 * @param {string} category recorded category
 */
function countSign(entry, diff, category) {
	'use strict';
	if (category === SUMMARY && diff.summaryResult) {
		entry.plus += diff.summaryResult.plus;
		entry.minus += diff.summaryResult.minus;
		return;
	}
	if (diff.sign === '+') {
		entry.plus++;
	} else if (diff.sign === '-') {
		entry.minus++;
	}
	// D024: the summary elements of a matching file of 外溢 / 放寬 are pinned with it
	if (diff.unit === 'matching' && diff.summaryResult && (category === SPILL || category === RELAX)) {
		entry.plus += diff.summaryResult.plus;
		entry.minus += diff.summaryResult.minus;
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
	if (category === SPILL || category === RELAX) {
		return info.links.filter(function (link) {
			return category === SPILL ? link.spill : link.relax;
		}).map(function (link) {
			return 'L' + link.line + ' → ' + link.callees.join('、');
		}).join('；');
	}
	if (category === '成員目標' || category === SUMMARY || category === LOSS) {
		var names = new Map();
		info.pages.forEach(function (page) {
			page.directNames.forEach(function (lines, name) {
				names.set(name, unique(Array.from(names.get(name) || []).concat(Array.from(lines))));
			});
		});
		return '定義性成員目標 ' + Array.from(names.keys()).sort().map(function (name) {
			return name + ' ' + names.get(name).sort(function (a, b) {
				return a - b;
			}).map(function (line) {
				return 'L' + line;
			}).join('、');
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

function uncategorized(results) {
	'use strict';
	return allDiffs(results).filter(function (diff) {
		return diff.categories.length === 0;
	});
}

/**
 * Markdown of the four machine sections
 * @param {Array} results results of compareCase
 * @returns {string}
 */
function buildReport(results) {
	'use strict';
	var diffs = allDiffs(results),
		missing = uncategorized(results).length,
		lines = [(diffs.length === 0 ? '無差異' : diffs.length + ' 筆差異') + (missing > 0 ? '（' + missing + ' 筆無成立類別）' : ''), '',
			NET_HEADING, '',
			'| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |',
			'|---|------|----|------------|------|---|------|------|----|------|'],
		pins = new Map();
	diffs.forEach(function (diff, index) {
		var category = diff.categories[0] || '（無成立類別）',
			notes = [];
		if (diff.reason) {
			notes.push(diff.reason);
		}
		if (diff.categories.length > 1) {
			notes.push('亦符：' + diff.categories.slice(1).join('、'));
		}
		if (diff.levelNewBase) {
			notes.push('層級新增：對應基準檔 ' + diff.levelNewBase);
		}
		if (diff.summaryResult && diff.summaryResult.items.length > 0 && diff.categories.length > 0) {
			notes.push('摘要 ' + diff.summaryResult.items.join('、'));
		}
		if (diff.summaryResult && diff.summaryResult.newKeys.length > 0 && diff.categories.length > 0) {
			notes.push('新鍵（新連結）' + diff.summaryResult.newKeys.join('、'));
		}
		lines.push('| ' + [index + 1, diff.caseName, diff.page, diff.file, diff.unit, diff.sign, '`' + diff.content + '`',
			category, FR_OF[category] || FR_OF[mainCategory(category)] || '', notes.join('；').replace(/\|/g, '/')].join(' | ') + ' |');
		if (diff.categories.length > 0 && isPinned(category)) {
			var key = pinKey(diff.caseName, diff.page, pinCategory(category)),
				entry = pins.get(key) || {plus: 0, minus: 0, numbers: []};
			countSign(entry, diff, category);
			entry.numbers.push(index + 1);
			pins.set(key, entry);
		}
	});
	lines.push('', SEGMENT_HEADING, '', '| case | 頁 | 模型檔 | 行 | 基準段標記數 | 008 段標記數 | 簽核 |',
		'|------|----|--------|----|--------------|--------------|------|');
	var segmentCount = 0;
	results.forEach(function (result) {
		result.segmentRows.forEach(function (row) {
			segmentCount++;
			lines.push('| ' + [result.name, row.page, row.file, row.line, row.base, row.next, '待簽核'].join(' | ') + ' |');
		});
	});
	if (segmentCount === 0) {
		lines.push('| 無 |  |  |  |  |  |  |');
	}
	lines.push('', DUP_HEADING, '', '| case | 頁 | 檔案 | develop 重複列 | 008 重複列 | 增減 |',
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
	return lines.join('\n') + '\n';
}

/**
 * Check a record against the actual differences (§2, §4)
 * @param {Array} results results of compareCase
 * @param {string} text the record
 * @returns {Array} problems (empty when it passes)
 */
function verifyRecord(results, text) {
	'use strict';
	var problems = [],
		net = base006.tableOf(text, '## 淨差異'),
		segmentTable = base006.tableOf(text, SEGMENT_HEADING),
		dupTable = base006.tableOf(text, DUP_HEADING),
		pinTable = base006.tableOf(text, PIN_HEADING);
	if (net === null || segmentTable === null || dupTable === null || pinTable === null) {
		return ['紀錄缺少機器區塊（淨差異／段結構改變行／重複列數／釘選與簽核）'];
	}
	var actual = new Map(),
		pins = new Map();
	allDiffs(results).forEach(function (diff) {
		var key = base006.keyOf(diff.caseName, diff.page, diff.file, diff.unit, diff.sign, diff.content);
		actual.set(key, (actual.get(key) || []).concat([diff]));
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
			var pin = pinKey(diff.caseName, diff.page, pinCategory(category)),
				entry = pins.get(pin) || {plus: 0, minus: 0};
			countSign(entry, diff, category);
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
	var segments = new Map();
	results.forEach(function (result) {
		result.segmentRows.forEach(function (row) {
			segments.set([result.name, row.page, row.file, row.line].join('\u0000'), row);
		});
	});
	var segmentListed = new Set();
	segmentTable.forEach(function (cells) {
		if (cells[0] === '無') {
			return;
		}
		var key = [cells[0], cells[1], cells[2], cells[3]].join('\u0000'),
			name = '段結構改變行：' + cells.slice(0, 4).join(' '),
			row = segments.get(key);
		if (segmentListed.has(key)) {
			problems.push(name + ' 重複列');
		}
		segmentListed.add(key);
		if (!row) {
			problems.push(name + ' 實際段結構未改變，不得列');
		} else if (Number(cells[4]) !== row.base || Number(cells[5]) !== row.next) {
			problems.push(name + ' 記錄 ' + cells[4] + '／' + cells[5] + '，實際 ' + row.base + '／' + row.next);
		}
	});
	segments.forEach(function (row, key) {
		if (!segmentListed.has(key)) {
			problems.push('段結構改變行：' + key.split('\u0000').join(' ') + ' 未列（' + row.base + '／' + row.next + '）');
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
	return problems;
}

/* ---------- §1 inputs ---------- */

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
 * Results of the golden mode (the base from git)
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
 * Check the MDN snapshot: exitcodes.json, a directory per id and a
 * *.matching.json for every model with a CALL node
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
				throw new Error('MDN 基準 ' + id + ' ' + file + ' 有 CALL 節點，卻缺少 ' + matching);
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
	var work = fs.mkdtempSync(path.join(os.tmpdir(), 'diffcheck008-')),
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
		out((mode === 'golden' ? '<!-- diffcheck 008 golden，基準 ' + base + ' -->\n' : '<!-- diffcheck 008 mdn -->\n') +
			text + codes.lines.join('\n') + (errors.length > 0 ? '\n\n' + errors.join('\n') : ''));
		var missing = uncategorized(results);
		missing.forEach(function (diff) {
			err('歸不進類別：' + [diff.caseName, diff.page, diff.file, diff.unit, diff.sign, '`' + diff.content + '`'].join(' '));
		});
		codes.problems.concat(errors).forEach(function (problem) {
			err(problem);
		});
		return missing.length > 0 || codes.problems.length > 0 || errors.length > 0 ? 1 : 0;
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
	MDN_BASE: MDN_BASE,
	baseOf: base006.baseOf,
	resolveBase: resolveBase,
	stripSuffix: stripSuffix,
	parseRows: parseRows,
	compareCase: compareCase,
	buildReport: buildReport,
	verifyRecord: verifyRecord,
	exitCodesOf: base006.exitCodesOf,
	main: main
};

if (require.main === module) {
	process.exitCode = main(process.argv.slice(2));
}
