/*
 * Loss / fix classification of the pairs removed by FR-001 (member targets no longer
 * define their object variable): contracts/diff-check.md §3, data-model §6 (D006, D011,
 * FR-009). Pure module over the page source: espree for the AST, eslint-scope for the
 * declarations and the read references. Self test: tools/classify.test.js.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var espree = require('espree'),
	eslintScope = require('eslint-scope');

var LOSS = '屬性寫入→讀取損失',
	FIX = '成員目標',
	WILDCARD = '*';

/**
 * Parse the source like lib/dujs/jsparser.js: as a script, or as a module when it is not a
 * valid script
 * @param {string} source
 * @returns {Object} AST with range and loc
 */
function parse(source) {
	'use strict';
	var options = {ecmaVersion: espree.latestEcmaVersion, range: true, loc: true};
	try {
		return espree.parse(source, Object.assign({}, options, {sourceType: 'script'}));
	} catch (scriptError) {
		try {
			return espree.parse(source, Object.assign({}, options, {sourceType: 'module'}));
		} catch (ignoredModuleError) {
			throw scriptError;
		}
	}
}

/**
 * Child nodes of an AST node (espree visitor keys)
 * @param {Object} node
 * @returns {Array}
 */
function childrenOf(node) {
	'use strict';
	var keys = espree.VisitorKeys[node.type] || Object.keys(node).filter(function (key) {
		return key !== 'parent' && key !== 'loc' && key !== 'range';
	});
	var children = [];
	keys.forEach(function (key) {
		var value = node[key];
		(Array.isArray(value) ? value : [value]).forEach(function (child) {
			if (!!child && typeof child.type === 'string') {
				children.push(child);
			}
		});
	});
	return children;
}

/**
 * Source facts of a page: AST, eslint-scope analysis, parent table and node list
 * @param {string} source Page source code
 * @returns {{source: string, ast: Object, scopeManager: Object, parents: Map, nodes: Array}}
 */
function sourceFacts(source) {
	'use strict';
	var ast = parse(source);
	var scopeManager = eslintScope.analyze(ast, {
		ecmaVersion: espree.latestEcmaVersion,
		sourceType: ast.sourceType || 'script',
		optimistic: true,
		childVisitorKeys: espree.VisitorKeys
	});
	var parents = new Map(),
		nodes = [],
		stack = [ast];
	while (stack.length > 0) {
		var node = stack.pop();
		nodes.push(node);
		childrenOf(node).forEach(function (child) {
			parents.set(child, node);
			stack.push(child);
		});
	}
	nodes.sort(function (a, b) {
		return a.range[0] - b.range[0] || b.range[1] - a.range[1];
	});
	return {source: source, ast: ast, scopeManager: scopeManager, parents: parents, nodes: nodes};
}

/**
 * Path segment of a member expression: the static name, or * for a computed key
 * @param {Object} member MemberExpression
 * @returns {string}
 */
function segmentOf(member) {
	'use strict';
	return member.computed ? WILDCARD : member.property.name;
}

/**
 * Keep the path up to and including the first *
 * @param {Array<string>} path
 * @returns {Array<string>}
 */
function truncated(path) {
	'use strict';
	var star = path.indexOf(WILDCARD);
	return star < 0 ? path.slice() : path.slice(0, star + 1);
}

/**
 * Member targets inside a destructuring pattern
 * @param {Object} pattern
 * @param {Array} targets Output
 */
function collectPatternTargets(pattern, targets) {
	'use strict';
	if (!pattern) {
		return;
	}
	switch (pattern.type) {
		case 'MemberExpression':
			targets.push(pattern);
			break;
		case 'ArrayPattern':
			pattern.elements.forEach(function (element) {
				collectPatternTargets(element, targets);
			});
			break;
		case 'ObjectPattern':
			pattern.properties.forEach(function (property) {
				collectPatternTargets(property.type === 'RestElement' ? property : property.value, targets);
			});
			break;
		case 'RestElement':
			collectPatternTargets(pattern.argument, targets);
			break;
		case 'AssignmentPattern':
			collectPatternTargets(pattern.left, targets);
			break;
		default:
			break;
	}
}

/**
 * Write paths of the member targets of the variable on a line (§3.1): assignment targets
 * (any operator), destructuring targets and for-in/for-of left sides whose .object chain
 * reaches an Identifier named variable; a computed key gives * and ends the path
 * @param {Object} facts sourceFacts(source)
 * @param {string} variable
 * @param {number} line
 * @returns {Array<Array<string>>} In source order
 */
function writePathsAt(facts, variable, line) {
	'use strict';
	var targets = [];
	facts.nodes.forEach(function (node) {
		if (node.type === 'AssignmentExpression') {
			collectPatternTargets(node.left, targets);
		} else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
			if (node.left.type !== 'VariableDeclaration') {
				collectPatternTargets(node.left, targets);
			}
		}
	});
	targets.sort(function (a, b) {
		return a.range[0] - b.range[0];
	});
	var paths = [];
	targets.forEach(function (target) {
		if (target.loc.start.line !== line) {
			return;
		}
		var segments = [],
			current = target;
		while (current.type === 'MemberExpression') {
			segments.unshift(segmentOf(current));
			current = current.object;
		}
		if (current.type === 'Identifier' && current.name === variable) {
			paths.push(truncated(segments));
		}
	});
	return paths;
}

/**
 * Whether a node is a target of a destructuring pattern
 * @param {Object} node
 * @param {Map} parents
 * @returns {boolean}
 */
function isPatternTarget(node, parents) {
	'use strict';
	var parent = parents.get(node);
	if (!parent) {
		return false;
	}
	switch (parent.type) {
		case 'ArrayPattern':
			return true;
		case 'RestElement':
			return parent.argument === node;
		case 'AssignmentPattern':
			return parent.left === node;
		case 'Property':
			return parent.value === node && !!parents.get(parent) && parents.get(parent).type === 'ObjectPattern';
		default:
			return false;
	}
}

/**
 * Whether a member expression is a target only written through (=, for-in/for-of left
 * side, destructuring target)
 * @param {Object} member
 * @param {Map} parents
 * @returns {boolean}
 */
function isPlainTarget(member, parents) {
	'use strict';
	var parent = parents.get(member);
	if (!parent) {
		return false;
	}
	if (parent.type === 'AssignmentExpression') {
		return parent.operator === '=' && parent.left === member;
	}
	if (parent.type === 'ForInStatement' || parent.type === 'ForOfStatement') {
		return parent.left === member;
	}
	return isPatternTarget(member, parents);
}

/**
 * Read form of one Identifier read (§3.2)
 * @param {Object} identifier
 * @param {Map} parents
 * @returns {{kind: string, path: Array<string>|null, identifier: Object}}
 */
function readFormOf(identifier, parents) {
	'use strict';
	var parent = parents.get(identifier);
	if (!!parent && (parent.type === 'CallExpression' || parent.type === 'NewExpression') &&
		parent.callee === identifier) {
		return {kind: 'callee', path: null, identifier: identifier};
	}
	if (!parent || parent.type !== 'MemberExpression' || parent.object !== identifier) {
		return {kind: 'whole', path: null, identifier: identifier};
	}
	var segments = [],
		top = identifier,
		next = parent;
	while (!!next && next.type === 'MemberExpression' && next.object === top) {
		segments.push(segmentOf(next));
		top = next;
		next = parents.get(top);
	}
	if (segments.length === 1 && !!next && next.type === 'CallExpression' && next.callee === top) {
		return {kind: 'method', path: segments, identifier: identifier};
	}
	if (isPlainTarget(top, parents)) {
		return {kind: 'deref', path: truncated(segments.slice(0, -1)), identifier: identifier};
	}
	return {kind: 'member', path: truncated(segments), identifier: identifier};
}

/**
 * Reads of the variable on a line (§3.2): every Identifier named variable that eslint-scope
 * records as a read reference, in source order
 * @param {Object} facts sourceFacts(source)
 * @param {string} variable
 * @param {number} line
 * @returns {Array<{kind: string, path: Array<string>|null, identifier: Object}>}
 */
function readsAt(facts, variable, line) {
	'use strict';
	var identifiers = new Set();
	facts.scopeManager.scopes.forEach(function (scope) {
		scope.references.forEach(function (reference) {
			var identifier = reference.identifier;
			if (identifier.name === variable && identifier.loc.start.line === line && reference.isRead()) {
				identifiers.add(identifier);
			}
		});
	});
	return Array.from(identifiers).sort(function (a, b) {
		return a.range[0] - b.range[0];
	}).map(function (identifier) {
		return readFormOf(identifier, facts.parents);
	});
}

/**
 * Number of statements starting or ending on a line (§3.2), without blocks, function and
 * class declarations, and the declarations heading for loops
 * @param {Object} facts sourceFacts(source)
 * @param {number} line
 * @returns {number}
 */
function statementCountAt(facts, line) {
	'use strict';
	return facts.nodes.filter(function (node) {
		if (!/(Statement|Declaration)$/.test(node.type) || node.type === 'BlockStatement' ||
			node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
			return false;
		}
		var parent = facts.parents.get(node);
		if (node.type === 'VariableDeclaration' && !!parent &&
			/^For(In|Of)?Statement$/.test(parent.type) && parent.body !== node) {
			return false;
		}
		return node.loc.start.line === line || node.loc.end.line === line;
	}).length;
}

/**
 * Number of declarations of a name on the page (eslint-scope; the class-scope and
 * function-name-scope copies share the declaring identifier and count once)
 * @param {Object} facts
 * @param {string} variable
 * @returns {number}
 */
function declarationCountOf(facts, variable) {
	'use strict';
	var names = new Set();
	facts.scopeManager.scopes.forEach(function (scope) {
		scope.variables.forEach(function (candidate) {
			if (candidate.name === variable) {
				candidate.defs.forEach(function (def) {
					names.add(def.name);
				});
			}
		});
	});
	return names.size;
}

/**
 * Whether two paths are the same or one is a (non-empty) prefix of the other
 * @param {Array<string>} a
 * @param {Array<string>} b
 * @returns {boolean}
 */
function overlaps(a, b) {
	'use strict';
	if (a.length === 0 || b.length === 0) {
		return false;
	}
	var length = Math.min(a.length, b.length);
	for (var index = 0; index < length; ++index) {
		if (a[index] !== b[index]) {
			return false;
		}
	}
	return true;
}

/**
 * Loss reason of one read against the write paths, or null for a fix
 * @param {Object} read
 * @param {Array<Array<string>>} writePaths
 * @returns {string|null}
 */
function lossOf(read, writePaths) {
	'use strict';
	if (read.kind === 'callee') {
		return null;
	}
	if (read.kind === 'whole') {
		return 'whole-object read';
	}
	if (read.kind === 'deref' && read.path.length === 0) {
		return null;
	}
	var reason = null;
	writePaths.some(function (write) {
		if (read.path.indexOf(WILDCARD) >= 0 || write.indexOf(WILDCARD) >= 0) {
			reason = 'computed key (*) in [' + write.join('.') + '] / [' + read.path.join('.') + ']';
		} else if (overlaps(read.path, write)) {
			reason = read.kind + ' read [' + read.path.join('.') + '] overlaps write [' + write.join('.') + ']';
		}
		return reason !== null;
	});
	return reason;
}

/**
 * Classify a pair removed because its definition is a member target (§3)
 * @param {{source: string, facts: Object, variable: string, defLine: number, useLine: number}} input
 *        source or precomputed facts (sourceFacts); useLine is the decision line for a p-use
 * @returns {{category: string, sub: string|null, reason: string}|null} null when the def line
 *          has no member target of the variable (§3.1 does not apply)
 */
function classifyRemoved(input) {
	'use strict';
	var facts = input.facts || sourceFacts(input.source),
		variable = input.variable;
	var writePaths = writePathsAt(facts, variable, input.defLine);
	if (writePaths.length === 0) {
		return null;
	}
	function loss(reason) {
		return {category: LOSS, sub: null, reason: reason};
	}
	if (statementCountAt(facts, input.defLine) > 1) {
		return loss('ambiguous: several statements on L' + input.defLine);
	}
	if (statementCountAt(facts, input.useLine) > 1) {
		return loss('ambiguous: several statements on L' + input.useLine);
	}
	if (declarationCountOf(facts, variable) > 1) {
		return loss('ambiguous: several declarations of ' + variable);
	}
	var reads = readsAt(facts, variable, input.useLine);
	if (reads.length === 0) {
		return loss('ambiguous: no read of ' + variable + ' on L' + input.useLine);
	}
	var reason = null;
	reads.some(function (read) {
		reason = lossOf(read, writePaths);
		return reason !== null;
	});
	if (reason !== null) {
		return loss(reason);
	}
	return {
		category: FIX,
		sub: '修正',
		reason: 'reads (' + reads.map(function (read) {
			return read.kind + (read.path === null ? '' : ' [' + read.path.join('.') + ']');
		}).join(', ') + ') miss writes (' + writePaths.map(function (write) {
			return '[' + write.join('.') + ']';
		}).join(', ') + ')'
	};
}

module.exports = {
	sourceFacts: sourceFacts,
	classifyRemoved: classifyRemoved,
	writePathsAt: writePathsAt,
	readsAt: readsAt,
	statementCountAt: statementCountAt
};
