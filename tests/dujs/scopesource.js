/*
 * Static checks of feature 006 (FR-012 (1), contracts/static-check.md,
 * acceptance US4-6): eslint-scope is the only source of declarations and
 * identifier resolution in lib. The lib files are parsed by espree and walked
 * by walkes; each rule S1...S6 and the whitelist W1...W4 is one test, and every
 * rule is also run on embedded violating sources to check it can fail
 * (contracts/static-check.md section 3).
 *
 * Function names used by S5 and by the whitelist (nearest named function):
 * - function declarations and named function expressions: their own name;
 * - `X.prototype.m = function` and `X.m = function`: m; `var f = function`: f;
 * - object literal members `m: function` and methods: m, except a getter,
 *   setter or value of a property descriptor (`name: {get: function}` in
 *   Object.defineProperties): the key of the described property (name);
 * - anonymous functions (callbacks): the nearest enclosing named function;
 * - outside any named function: '<top>'.
 *
 * Member names are those of member expressions (x.m, x['m']) and of the keys of
 * object destructuring patterns (var {m} = x, function f({m: y})), which read
 * the same member; S1, S4 and S5 check both.
 *
 * Known limitations (of the contract, not checked here): a name read into a
 * variable first and used as a key later (var k = n.name; m.get(k)), keys
 * built by template literals or other expressions (x[`na${'me'}`]), and reads
 * of .name in scopebinding.js out of the whitelisted functions (S5 excludes
 * scopebinding.js; S6 only checks name-keyed Map/Set lookups there).
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var assert = require('assert'),
	fs = require('fs'),
	path = require('path'),
	espree = require('espree'),
	walkes = require('walkes');
require('should');

var ROOT = path.join(__dirname, '..', '..'),
	SCOPE_BINDING = 'lib/dujs/scopebinding.js';

/**
 * S1: names of the removed Scope name API and storage
 * @type {Array}
 */
var S1_NAMES = ['getVariable', 'hasVariable', 'getLocalVariable', 'hasLocalVariable',
	'getScopeWhereTheVariableDeclared', 'addGlobalVariable', 'addLocalVariable', 'addLexicalVariable',
	'addParameter', 'addInnerFunctionVariable', 'hasNamedFunction', 'hasBuiltInObject', 'isLexicalVariable',
	'getParamNameWithIndex', 'namedFunctionVars', 'builtInObjectVars', '_vars', '_params', '_paramNames',
	'_namedFunctionVars', '_builtInObjectVars', '_lexicalNames'];

/**
 * S2: names that Scope.prototype and its subclasses must not define
 * @type {Array}
 */
var S2_NAMES = S1_NAMES.concat(['vars', 'params']);

/**
 * S4: name tables and name-based API of eslint-scope (Scope and ScopeManager)
 * forbidden in all lib, together with every member starting with `__` (the
 * internal API of eslint-scope, which resolves by name: __get, __resolve,
 * __define, __referencing, __close...; see isForbiddenS4); .resolve (by
 * identifier node) is allowed, .set only in the whitelisted functions
 * @type {Array}
 */
var S4_FORBIDDEN = ['implicit', 'through', 'taints', 'isUsedName', 'addGlobals'];

/**
 * Members starting with `__` that are standard JavaScript, not eslint-scope
 * @type {Array}
 */
var S4_STANDARD_DUNDER = ['__proto__'];

/**
 * @param {string|null} name Member name
 * @returns {boolean} Whether S4 forbids the member everywhere in lib
 */
function isForbiddenS4(name) {
	'use strict';
	return name !== null && (S4_FORBIDDEN.indexOf(name) !== -1 ||
		(/^__/.test(name) && S4_STANDARD_DUNDER.indexOf(name) === -1));
}

/**
 * Whitelist (contracts/static-check.md section 2): functions of scopebinding.js
 * marked with @nameLookup, exactly these names and reasons
 * @type {Object}
 */
var WHITELIST = {
	globalVariableOf: 'D3',
	isExcludedGlobalName: 'D3',
	builtInVariableOf: 'FIXED_LIST',
	isShadowed: 'FR-013'
};

/**
 * @type {Array}
 */
var NAME_LOOKUP_REASONS = ['D3', 'D6', 'FIXED_LIST', 'FR-013'];

/**
 * S5 allow list: reads of <x>.name in lib/dujs/*.js (scopebinding.js
 * excluded) that are property names, method names or output names, not
 * variable lookups; matched exactly by file, function (see header) and the
 * member expression source. Kept equal to the table of
 * contracts/static-check.md S5.
 * @type {Array}
 */
var S5_ALLOWED = [
	{file: 'lib/dujs/callresolver.js', fn: 'createClassInfo', expr: 'member.key.name',
		reason: 'method name (property key)'},
	{file: 'lib/dujs/callresolver.js', fn: 'calleeScopesOfMethodCall', expr: 'member.property.name',
		reason: 'method name (property)'},
	{file: 'lib/dujs/modelbuilder.js', fn: 'getRegisteredEventHandlerCallback',
		expr: 'callExpression.callee.property.name', reason: 'addEventListener method name'},
	/// added by T061
	{file: 'lib/dujs/cli.js', fn: 'parsePages', expr: 'token.name', reason: 'command line option name'},
	{file: 'lib/dujs/graphics.js', fn: 'convertGraphToDot', expr: 'model.mainlyRelatedScope.name',
		reason: 'scope name in the DOT output'},
	{file: 'lib/dujs/graphics.js', fn: 'convertDUPairsToDot', expr: 'key.name',
		reason: 'variable name in the DOT output'},
	{file: 'lib/dujs/scope.js', fn: 'toString', expr: 'this.name', reason: 'scope name as its string form'},
	/// added by feature 005 T058
	{file: 'lib/dujs/outputwriter.js', fn: 'variableNameOf', expr: 'variable.name',
		reason: 'variable name in the call matching output (matching.json)'},
	{file: 'lib/dujs/outputwriter.js', fn: 'scopeNameOf', expr: 'scope.name',
		reason: 'scope name in the call matching output (matching.json)'},
	{file: 'lib/dujs/scope.js', fn: 'name', expr: 'internal(this)._parent.name',
		reason: 'scope name composed with the parent scope name'},
	{file: 'lib/dujs/scopetree.js', fn: 'addScope', expr: 'scope.name',
		reason: 'scope name as the key of the scope tree map (scope naming, FR-009)'},
	{file: 'lib/dujs/scopetree.js', fn: 'makeScopeNamesUnique', expr: 'scope.name',
		reason: 'scope name as the key of the scope tree map (scope naming, FR-009)'},
	{file: 'lib/dujs/scopetree.js', fn: 'astFunctionDeclarationHandler', expr: 'node.id.name',
		reason: 'function declaration name as the scope name (scope naming, FR-009)'}
];

/**
 * Parse a source as the lib files are checked
 * @param {string} source
 * @returns {Object} AST with comments
 */
function parse(source) {
	'use strict';
	return espree.parse(source, {ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true,
		comment: true});
}

/**
 * @param {string} file Path relative to the project root
 * @param {string} source
 * @returns {Object} Checked module
 */
function moduleOf(file, source) {
	'use strict';
	return {file: file, source: source, ast: parse(source)};
}

/**
 * All .js files under a directory, relative to the project root, sorted
 * @param {string} dir Relative directory
 * @returns {Array}
 */
function jsFilesUnder(dir) {
	'use strict';
	var found = [];
	fs.readdirSync(path.join(ROOT, dir), {withFileTypes: true}).forEach(function (entry) {
		var relative = dir + '/' + entry.name;
		if (entry.isDirectory()) {
			found = found.concat(jsFilesUnder(relative));
		} else if (/\.js$/.test(entry.name)) {
			found.push(relative);
		}
	});
	return found.sort();
}

/**
 * Walk an AST in source order with the ancestors of each node
 * @param {Object} ast
 * @param {function} visit Called with the node and its ancestors (root first)
 */
function walk(ast, visit) {
	'use strict';
	var ancestors = [];
	walkes(ast, {
		default: function (node, recurse) {
			visit(node, ancestors);
			ancestors.push(node);
			walkes.checkProps(node, recurse);
			ancestors.pop();
		}
	});
}

/**
 * @param {Object} node
 * @returns {boolean}
 */
function isFunction(node) {
	'use strict';
	return node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' ||
		node.type === 'ArrowFunctionExpression';
}

/**
 * Name of a property key or member property: identifier or string literal
 * @param {Object} key
 * @param {boolean} computed
 * @returns {string|null}
 */
function keyName(key, computed) {
	'use strict';
	if (!computed && key.type === 'Identifier') {
		return key.name;
	}
	return (key.type === 'Literal' && typeof key.value === 'string') ? key.value : null;
}

/**
 * Member name of a member expression (null for other nodes)
 * @param {Object} node
 * @returns {string|null}
 */
function memberName(node) {
	'use strict';
	return (node.type === 'MemberExpression') ? keyName(node.property, node.computed) : null;
}

/**
 * Member name read by a node: of a member expression, or of a key of an
 * object destructuring pattern (null for other nodes)
 * @param {Object} node
 * @param {Object} parent
 * @returns {string|null}
 */
function accessedName(node, parent) {
	'use strict';
	if (node.type === 'Property' && !!parent && parent.type === 'ObjectPattern') {
		return keyName(node.key, node.computed);
	}
	return memberName(node);
}

/**
 * Name of a function by itself or by where it is defined (see header)
 * @param {Object} fn Function node
 * @param {Array} ancestors Ancestors of the function, root first
 * @returns {string|null} null for an anonymous function
 */
function ownNameOf(fn, ancestors) {
	'use strict';
	var parent = ancestors[ancestors.length - 1];
	if (!!fn.id) {
		return fn.id.name;
	}
	if (parent.type === 'AssignmentExpression' && parent.right === fn) {
		return (parent.left.type === 'Identifier') ? parent.left.name : memberName(parent.left);
	}
	if (parent.type === 'VariableDeclarator' && parent.init === fn && parent.id.type === 'Identifier') {
		return parent.id.name;
	}
	if (parent.type === 'MethodDefinition') {
		return keyName(parent.key, parent.computed);
	}
	if (parent.type === 'Property' && parent.value === fn) {
		var key = keyName(parent.key, parent.computed),
			descriptor = ancestors[ancestors.length - 2],
			described = ancestors[ancestors.length - 3];
		if (['get', 'set', 'value'].indexOf(key) !== -1 && !!descriptor && descriptor.type === 'ObjectExpression' &&
			!!described && described.type === 'Property' && described.value === descriptor) {
			return keyName(described.key, described.computed);
		}
		return key;
	}
	return null;
}

/**
 * Name of the nearest named function enclosing a node
 * @param {Array} ancestors Ancestors of the node, root first
 * @returns {string}
 */
function enclosingFunctionName(ancestors) {
	'use strict';
	for (var index = ancestors.length - 1; index >= 0; --index) {
		if (isFunction(ancestors[index])) {
			var name = ownNameOf(ancestors[index], ancestors.slice(0, index));
			if (name !== null) {
				return name;
			}
		}
	}
	return '<top>';
}

/**
 * @param {Object} module
 * @param {Object} node
 * @returns {string} Source text of the node with whitespace removed
 */
function textOf(module, node) {
	'use strict';
	return module.source.slice(node.range[0], node.range[1]).replace(/\s+/g, '');
}

/**
 * @param {Object} module
 * @param {Object} node
 * @param {string} [note]
 * @returns {string} file:line:column snippet
 */
function violation(module, node, note) {
	'use strict';
	var snippet = module.source.slice(node.range[0], node.range[1]).replace(/\s+/g, ' ');
	if (snippet.length > 80) {
		snippet = snippet.slice(0, 77) + '...';
	}
	return module.file + ':' + node.loc.start.line + ':' + (node.loc.start.column + 1) + ' ' + snippet +
		(!!note ? ' (' + note + ')' : '');
}

/**
 * Whether a member expression is written (assigned or updated), not read
 * @param {Object} node
 * @param {Object} parent
 * @returns {boolean}
 */
function isWritten(node, parent) {
	'use strict';
	return (parent.type === 'AssignmentExpression' && parent.left === node) ||
		(parent.type === 'UpdateExpression' && parent.argument === node);
}

/**
 * Functions marked with @nameLookup at the start of a line of a block comment;
 * the marked function is the top-level statement right after the comment, with
 * only whitespace between them (otherwise the entry has no function)
 * @param {Object} module
 * @returns {Array} Entries {name, reason, node (function or null), comment}
 */
function nameLookupFunctionsOf(module) {
	'use strict';
	var found = [];
	module.ast.comments.forEach(function (comment) {
		var match = (comment.type === 'Block') ? /^[ \t]*\*?[ \t]*@nameLookup\b[ \t]*(\S*)/m.exec(comment.value) : null;
		if (!match) {
			return;
		}
		var statement = module.ast.body.filter(function (each) {
			return each.range[0] >= comment.range[1];
		})[0], fn = null, name = null;
		if (!!statement && !/^\s*$/.test(module.source.slice(comment.range[1], statement.range[0]))) {
			statement = null;
		}
		if (!!statement && statement.type === 'FunctionDeclaration') {
			fn = statement;
			name = ownNameOf(fn, [statement]);
		} else if (!!statement && statement.type === 'ExpressionStatement' &&
			statement.expression.type === 'AssignmentExpression' && isFunction(statement.expression.right)) {
			fn = statement.expression.right;
			name = ownNameOf(fn, [statement, statement.expression]);
		} else if (!!statement && statement.type === 'VariableDeclaration' && statement.declarations.length === 1 &&
			!!statement.declarations[0].init && isFunction(statement.declarations[0].init)) {
			fn = statement.declarations[0].init;
			name = ownNameOf(fn, [statement, statement.declarations[0]]);
		}
		found.push({name: name, reason: match[1], node: fn, comment: comment});
	});
	return found;
}

/**
 * Function nodes marked with @nameLookup, computed once per module
 * @type {WeakMap}
 */
var markedFunctionsCache = new WeakMap();

/**
 * Whether a node is inside a function marked with @nameLookup
 * @param {Object} module
 * @param {Array} ancestors
 * @returns {boolean}
 */
function isInNameLookupFunction(module, ancestors) {
	'use strict';
	if (!markedFunctionsCache.has(module)) {
		markedFunctionsCache.set(module, nameLookupFunctionsOf(module).map(function (entry) {
			return entry.node;
		}).filter(function (node) {
			return node !== null;
		}));
	}
	var marked = markedFunctionsCache.get(module);
	return ancestors.some(function (ancestor) {
		return marked.indexOf(ancestor) !== -1;
	});
}

/**
 * S1: members with the names of the removed name API
 * @param {Array} modules
 * @returns {Array} Violations
 */
function checkS1(modules) {
	'use strict';
	var found = [];
	modules.forEach(function (module) {
		walk(module.ast, function (node, ancestors) {
			if (S1_NAMES.indexOf(accessedName(node, ancestors[ancestors.length - 1])) !== -1) {
				found.push(violation(module, node));
			}
		});
	});
	return found;
}

/**
 * S2: own properties of Scope.prototype and its subclasses' prototypes
 * @param {Array} prototypes Entries {name, proto}
 * @returns {Array} Violations
 */
function checkS2(prototypes) {
	'use strict';
	var found = [];
	prototypes.forEach(function (entry) {
		Object.getOwnPropertyNames(entry.proto).forEach(function (property) {
			if (S2_NAMES.indexOf(property) !== -1) {
				found.push(entry.name + '.prototype.' + property);
			}
		});
	});
	return found;
}

/**
 * S3: require('eslint-scope') out of scopebinding.js
 * @param {Array} modules
 * @returns {Array} Violations
 */
function checkS3(modules) {
	'use strict';
	var found = [];
	modules.forEach(function (module) {
		walk(module.ast, function (node) {
			if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'require' &&
				node.arguments.length > 0 && node.arguments[0].type === 'Literal' &&
				/^eslint-scope(\/|$)/.test(String(node.arguments[0].value)) && module.file !== SCOPE_BINDING) {
				found.push(violation(module, node));
			}
		});
	});
	return found;
}

/**
 * S4: name tables of eslint-scope; .set (not the callee of a call, which is
 * Map#set) only in the whitelisted functions of scopebinding.js
 * @param {Array} modules
 * @returns {Array} Violations
 */
function checkS4(modules) {
	'use strict';
	var found = [];
	modules.forEach(function (module) {
		walk(module.ast, function (node, ancestors) {
			var parent = ancestors[ancestors.length - 1],
				name = accessedName(node, parent);
			if (isForbiddenS4(name)) {
				found.push(violation(module, node));
			} else if (name === 'set' && !(parent.type === 'CallExpression' && parent.callee === node) &&
				!(module.file === SCOPE_BINDING && isInNameLookupFunction(module, ancestors))) {
				found.push(violation(module, node, 'out of the whitelist'));
			}
		});
	});
	return found;
}

/**
 * S5: reads of <x>.name in lib/dujs/*.js (scopebinding.js excluded) not in the
 * allow list
 * @param {Array} modules
 * @param {Array} allowed Allow list
 * @returns {Object} {violations, used (keys of the allow list matched)}
 */
function checkS5(modules, allowed) {
	'use strict';
	var keys = allowed.map(function (entry) {
			return entry.file + '|' + entry.fn + '|' + entry.expr;
		}),
		result = {violations: [], used: []};
	modules.filter(function (module) {
		return /^lib\/dujs\/[^/]+\.js$/.test(module.file) && module.file !== SCOPE_BINDING;
	}).forEach(function (module) {
		walk(module.ast, function (node, ancestors) {
			var parent = ancestors[ancestors.length - 1];
			if (accessedName(node, parent) !== 'name' || isWritten(node, parent)) {
				return;
			}
			var fn = enclosingFunctionName(ancestors),
				key = module.file + '|' + fn + '|' + textOf(module, node);
			if (keys.indexOf(key) === -1) {
				result.violations.push(violation(module, node, 'function ' + fn));
			} else if (result.used.indexOf(key) === -1) {
				result.used.push(key);
			}
		});
	});
	return result;
}

/**
 * Entries of the S5 allow list matching no read (stale entries fail the test)
 * @param {Array} allowed Allow list
 * @param {Object} result Result of checkS5
 * @returns {Array} Unused entries as 'file fn expr'
 */
function unusedAllowed(allowed, result) {
	'use strict';
	return allowed.filter(function (entry) {
		return result.used.indexOf(entry.file + '|' + entry.fn + '|' + entry.expr) === -1;
	}).map(function (entry) {
		return entry.file + ' ' + entry.fn + ' ' + entry.expr;
	});
}

/**
 * Whether an argument is a name: <x>.name, an identifier `name` or a string
 * @param {Object} node
 * @returns {boolean}
 */
function isNameKey(node) {
	'use strict';
	return memberName(node) === 'name' || (node.type === 'Identifier' && node.name === 'name') ||
		(node.type === 'Literal' && typeof node.value === 'string');
}

/**
 * Whether a node compares a name: an equality (===, !==, ==, !=) with an
 * operand <x>.name, or a call of indexOf/includes with the argument <x>.name
 * (this also covers comparisons in find/filter/some callbacks)
 * @param {Object} node
 * @returns {boolean}
 */
function isNameComparison(node) {
	'use strict';
	if (node.type === 'BinaryExpression' && ['===', '!==', '==', '!='].indexOf(node.operator) !== -1) {
		return memberName(node.left) === 'name' || memberName(node.right) === 'name';
	}
	return node.type === 'CallExpression' && ['indexOf', 'includes'].indexOf(memberName(node.callee)) !== -1 &&
		node.arguments.length > 0 && memberName(node.arguments[0]) === 'name';
}

/**
 * S6: Map#get/has/set and Set#has keyed by a name, and comparisons of names
 * (isNameComparison), in scopebinding.js only in the whitelisted functions
 * @param {Array} modules
 * @returns {Array} Violations
 */
function checkS6(modules) {
	'use strict';
	var found = [];
	modules.filter(function (module) {
		return module.file === SCOPE_BINDING;
	}).forEach(function (module) {
		walk(module.ast, function (node, ancestors) {
			var keyed = node.type === 'CallExpression' && ['get', 'has', 'set'].indexOf(memberName(node.callee)) !== -1 &&
				node.arguments.length > 0 && isNameKey(node.arguments[0]);
			if ((keyed || isNameComparison(node)) && !isInNameLookupFunction(module, ancestors)) {
				found.push(violation(module, node, 'out of the whitelist'));
			}
		});
	});
	return found;
}

/**
 * Whitelist: the functions marked with @nameLookup are exactly W1...W4, only
 * in scopebinding.js, with reasons in {D3, D6, FIXED_LIST, FR-013}
 * @param {Array} modules
 * @returns {Array} Violations
 */
function checkWhitelist(modules) {
	'use strict';
	var found = [], marked = {};
	modules.forEach(function (module) {
		nameLookupFunctionsOf(module).forEach(function (entry) {
			var where = module.file + ':' + entry.comment.loc.start.line;
			if (entry.node === null || entry.name === null) {
				found.push(where + ' @nameLookup not followed by a named function');
			} else if (module.file !== SCOPE_BINDING) {
				found.push(where + ' @nameLookup ' + entry.name + ' out of ' + SCOPE_BINDING);
			} else if (NAME_LOOKUP_REASONS.indexOf(entry.reason) === -1) {
				found.push(where + ' @nameLookup ' + entry.name + ' with reason "' + entry.reason + '"');
			} else {
				marked[entry.name] = entry.reason;
			}
		});
	});
	Object.keys(WHITELIST).forEach(function (name) {
		if (marked[name] !== WHITELIST[name]) {
			found.push(SCOPE_BINDING + ' ' + name + ' should be marked @nameLookup ' + WHITELIST[name] +
				' (found ' + (marked[name] || 'none') + ')');
		}
	});
	Object.keys(marked).forEach(function (name) {
		if (!WHITELIST.hasOwnProperty(name)) {
			found.push(SCOPE_BINDING + ' ' + name + ' is not in the whitelist W1...W4');
		}
	});
	return found;
}

/**
 * @param {Array} violations
 * @param {string} rule
 */
function shouldHaveNone(violations, rule) {
	'use strict';
	assert.deepStrictEqual(violations, [], rule + ' violations:\n' + violations.join('\n'));
}

/**
 * @param {Array} violations
 * @param {string} rule
 */
function shouldHaveSome(violations, rule) {
	'use strict';
	assert.ok(violations.length > 0, rule + ' does not report the embedded violation');
}

/**
 * Source of a scopebinding.js with the four whitelisted functions, plus an
 * extra source
 * @param {string} [extra]
 * @param {Object} [reasons] Marks overriding WHITELIST (name -> reason or null)
 * @returns {string}
 */
function fakeScopeBinding(extra, reasons) {
	'use strict';
	var marks = Object.assign({}, WHITELIST, reasons || {});
	return Object.keys(marks).map(function (name) {
		return (marks[name] === null ? '' : '/**\n * fake\n * @nameLookup ' + marks[name] + '\n */\n') +
			'PageBinding.prototype.' + name + ' = function (name, scope) {\n' +
			'\tvar found = this.byName.get(name);\n\treturn scope.set.get(name) || found;\n};\n';
	}).join('') + (extra || '');
}

describe('Static checks: eslint-scope as the only source (feature 006, US4, FR-012 (1))', function () {
	'use strict';
	var modules = jsFilesUnder('lib').map(function (file) {
		return moduleOf(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));
	});

	describe('lib', function () {
		it('parses every lib file', function () {
			modules.length.should.be.above(50);
			modules.map(function (module) {
				return module.file;
			}).should.containEql(SCOPE_BINDING);
		});

		it('S1: no member with a name of the removed Scope name API', function () {
			shouldHaveNone(checkS1(modules), 'S1');
		});

		it('S2: Scope.prototype and its subclasses define neither the name API nor vars/params', function () {
			var prototypes = ['scope', 'functionscope', 'pagescope', 'domainscope', 'blockscope',
				'anonymousfunctionscope'].map(function (name) {
				return {name: name, proto: require('../../lib/dujs/' + name).prototype};
			});
			shouldHaveNone(checkS2(prototypes), 'S2');
		});

		it('S3: eslint-scope is required only by scopebinding.js', function () {
			shouldHaveNone(checkS3(modules), 'S3');
		});

		it('S4: no name table of eslint-scope out of the whitelist', function () {
			shouldHaveNone(checkS4(modules), 'S4');
		});

		it('S5: reads of .name in lib/dujs are only those of the allow list', function () {
			var result = checkS5(modules, S5_ALLOWED);
			shouldHaveNone(result.violations, 'S5');
			var unused = unusedAllowed(S5_ALLOWED, result);
			assert.deepStrictEqual(unused, [], 'S5 allow list entries matching no read:\n' + unused.join('\n'));
			S5_ALLOWED.forEach(function (entry) {
				entry.reason.should.be.a.String().and.not.be.empty();
			});
		});

		it('S6: name-keyed Map/Set lookups and name comparisons in scopebinding.js only in the whitelist', function () {
			shouldHaveNone(checkS6(modules), 'S6');
		});

		it('W1...W4: @nameLookup marks exactly the whitelisted functions of scopebinding.js', function () {
			shouldHaveNone(checkWhitelist(modules), 'Whitelist');
		});
	});

	describe('self-verification (contracts/static-check.md section 3)', function () {
		var FAKE = 'lib/dujs/fake.js';

		it('S1 reports scope.getVariable(node.name)', function () {
			shouldHaveSome(checkS1([moduleOf(FAKE, 'function f(scope, node) { return scope.getVariable(node.name); }')]),
				'S1');
			shouldHaveSome(checkS1([moduleOf(FAKE, 'function f(scope) { return scope._vars; }')]), 'S1');
			shouldHaveSome(checkS1([moduleOf(FAKE, 'function f(scope) { var {getVariable} = scope; return getVariable; }')]),
				'S1 (destructuring)');
			shouldHaveSome(checkS1([moduleOf(FAKE, 'function f({_vars: v}) { return v; }')]), 'S1 (parameter pattern)');
			shouldHaveNone(checkS1([moduleOf(FAKE, 'function f(scope) { return scope.variables; }')]), 'S1 control');
			shouldHaveNone(checkS1([moduleOf(FAKE, 'function f(scope) { return {getVariable: scope.variables}; }')]),
				'S1 control (object literal key)');
		});

		it('S2 reports a prototype defining the name API or vars', function () {
			function Fake() {
			}
			Fake.prototype.getVariable = function () {
			};
			function Sub() {
			}
			Sub.prototype = Object.create(Fake.prototype);
			Object.defineProperty(Sub.prototype, 'vars', {get: function () {
				return [];
			}});
			checkS2([{name: 'Fake', proto: Fake.prototype}, {name: 'Sub', proto: Sub.prototype}]).should.eql([
				'Fake.prototype.getVariable', 'Sub.prototype.vars']);
		});

		it('S3 reports require(\'eslint-scope\') in another file', function () {
			var source = 'var eslintScope = require(\'eslint-scope\');';
			shouldHaveSome(checkS3([moduleOf(FAKE, source)]), 'S3');
			shouldHaveSome(checkS3([moduleOf('lib/esgraph/fake.js', source)]), 'S3');
			shouldHaveNone(checkS3([moduleOf(SCOPE_BINDING, source)]), 'S3 control');
		});

		it('S4 reports .set out of the whitelist, .implicit/.through/.taints and __ members', function () {
			var unmarked = 'function f(scope, name) { return scope.set.get(name); }\n';
			shouldHaveSome(checkS4([moduleOf(SCOPE_BINDING, fakeScopeBinding(unmarked))]), 'S4');
			shouldHaveSome(checkS4([moduleOf(FAKE, unmarked)]), 'S4');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(scope) { return scope.through; }')]), 'S4');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(scope) { return scope.implicit.set; }')]), 'S4');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(manager, node) { return manager.__get(node); }')]),
				'S4');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(s) { return s.taints.get("x"); }')]), 'S4 (taints)');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(scope, ref) { return scope.__resolve(ref); }')]),
				'S4 (__resolve)');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(scope, ref) { scope.__delegateToUpperScope(ref); }')]),
				'S4 (__delegateToUpperScope)');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(scope) { var {__close: c} = scope; return c; }')]),
				'S4 (destructured __close)');
			shouldHaveNone(checkS4([moduleOf(FAKE, 'function f(q, P) { q.__proto__ = P.prototype; }')]),
				'S4 control (__proto__)');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(scope) { var {through} = scope; return through; }')]),
				'S4 (destructuring)');
			shouldHaveSome(checkS4([moduleOf(FAKE, 'function f(scope) { var {set: s} = scope; return s.get(\'x\'); }')]),
				'S4 (destructured .set)');
			shouldHaveSome(checkS4([moduleOf(SCOPE_BINDING, fakeScopeBinding(
				'function g(scope, name) {\n\t/**\n\t * @nameLookup D3\n\t */\n\tvar x = 1;\n}\n' +
				'function h(scope, name) { return scope.set.get(name); }\n'))]), 'S4 (mark inside a function body)');
			shouldHaveNone(checkS4([moduleOf(SCOPE_BINDING, fakeScopeBinding(
				'function g(map, key, scope, ref) { map.set(key, 1); return scope.resolve(ref); }\n'))]), 'S4 control');
		});

		it('S5 reports a .name read out of the allow list and matches the function names of the header', function () {
			shouldHaveSome(checkS5([moduleOf(FAKE, 'function f(scope, node) { return scope.getVariable(node.name); }')],
				S5_ALLOWED).violations, 'S5');
			shouldHaveSome(checkS5([moduleOf('lib/dujs/callresolver.js',
				'function other(member) { return member.key.name; }')], S5_ALLOWED).violations, 'S5');
			var allowed = [
				{file: 'lib/dujs/a.js', fn: 'toString', expr: 'this.name', reason: 'test'},
				{file: 'lib/dujs/a.js', fn: 'name', expr: 'internal(this)._parent.name', reason: 'test'},
				{file: 'lib/dujs/a.js', fn: 'getBoundNames', expr: 'target.name', reason: 'test'},
				{file: 'lib/dujs/a.js', fn: 'handler', expr: 'node.id.name', reason: 'test'},
				{file: 'lib/dujs/a.js', fn: 'helper', expr: 'x.name', reason: 'test'}
			];
			var source = 'Scope.prototype.toString = function () { return this.name; };\n' +
				'Object.defineProperties(Scope.prototype, { name: { get: function () {\n' +
				'\treturn internal(this)._parent.name; } } });\n' +
				'P.prototype.getBoundNames = function (p) { return p.map(function (target) { return target.name; }); };\n' +
				'function handler(node) { return node.id.name; }\n' +
				'var helper = function (x) { x.name = 1; return x.name; };\n';
			var result = checkS5([moduleOf('lib/dujs/a.js', source)], allowed);
			result.violations.should.eql([]);
			result.used.length.should.equal(allowed.length);
			shouldHaveNone(checkS5([moduleOf(SCOPE_BINDING, 'function f(node) { return node.name; }')], []).violations,
				'S5 control (scopebinding.js is checked by S6)');
			shouldHaveSome(checkS5([moduleOf(FAKE, 'function f(a) { var {name} = a; return name; }')], S5_ALLOWED)
				.violations, 'S5 (destructuring)');
			shouldHaveSome(checkS5([moduleOf(FAKE, 'function f({name: n}) { return n; }')], S5_ALLOWED).violations,
				'S5 (parameter pattern)');
			shouldHaveNone(checkS5([moduleOf('lib/dujs/a.js', 'function helper(x) { var {name} = x; return name; }')],
				[{file: 'lib/dujs/a.js', fn: 'helper', expr: 'name', reason: 'test'}]).violations,
				'S5 control (allowed destructuring)');
		});

		it('S5 reports a stale allow list entry matching no read', function () {
			var allowed = [{file: 'lib/dujs/a.js', fn: 'helper', expr: 'x.name', reason: 'test'}],
				source = 'function helper(x) { return x.name; }\n',
				stale = allowed.concat([{file: 'lib/dujs/a.js', fn: 'other', expr: 'y.name', reason: 'test'}]);
			shouldHaveNone(unusedAllowed(allowed, checkS5([moduleOf('lib/dujs/a.js', source)], allowed)),
				'S5 allow list control');
			unusedAllowed(stale, checkS5([moduleOf('lib/dujs/a.js', source)], stale)).should.eql([
				'lib/dujs/a.js other y.name']);
		});

		it('S6 reports name-keyed lookups and name comparisons out of the whitelist', function () {
			shouldHaveSome(checkS6([moduleOf(SCOPE_BINDING, 'function f(map, node) { return map.get(node.name); }')]),
				'S6');
			shouldHaveSome(checkS6([moduleOf(SCOPE_BINDING, 'function f(set) { return set.has(\'x\'); }')]), 'S6');
			shouldHaveSome(checkS6([moduleOf(SCOPE_BINDING, 'function f(map, name) { map.set(name, 1); }')]), 'S6');
			shouldHaveSome(checkS6([moduleOf(SCOPE_BINDING,
				'function f(variables, n) { return variables.filter(v => v.name === n); }')]), 'S6 (filter comparison)');
			shouldHaveSome(checkS6([moduleOf(SCOPE_BINDING, 'function f(a, b) { return a.name !== b; }')]),
				'S6 (!== comparison)');
			shouldHaveSome(checkS6([moduleOf(SCOPE_BINDING, 'function f(names, v) { return names.indexOf(v.name); }')]),
				'S6 (indexOf)');
			shouldHaveSome(checkS6([moduleOf(SCOPE_BINDING, 'function f(names, v) { return names.includes(v.name); }')]),
				'S6 (includes)');
			shouldHaveNone(checkS6([moduleOf(SCOPE_BINDING, fakeScopeBinding(
				'function g(map, variable) { return map.get(variable); }\n'))]), 'S6 control');
			shouldHaveNone(checkS6([moduleOf(SCOPE_BINDING, fakeScopeBinding(
				'/**\n * fake\n * @nameLookup FR-013\n */\n' +
				'P.prototype.lookUp = function (vs, n) { return vs.filter(v => v.name === n); };\n'))]),
				'S6 control (comparison in a whitelisted function)');
		});

		it('the whitelist check reports a missing, extra, misplaced or wrongly reasoned @nameLookup', function () {
			shouldHaveNone(checkWhitelist([moduleOf(SCOPE_BINDING, fakeScopeBinding())]), 'Whitelist control');
			shouldHaveSome(checkWhitelist([moduleOf(SCOPE_BINDING, fakeScopeBinding('', {isShadowed: null}))]),
				'Whitelist (missing)');
			shouldHaveSome(checkWhitelist([moduleOf(SCOPE_BINDING, fakeScopeBinding('', {resolveDynamically: 'D6'}))]),
				'Whitelist (extra)');
			shouldHaveSome(checkWhitelist([moduleOf(SCOPE_BINDING, fakeScopeBinding('', {isShadowed: 'D3'}))]),
				'Whitelist (reason)');
			shouldHaveSome(checkWhitelist([moduleOf(SCOPE_BINDING, fakeScopeBinding('', {isShadowed: 'OTHER'}))]),
				'Whitelist (unknown reason)');
			shouldHaveSome(checkWhitelist([moduleOf(SCOPE_BINDING, fakeScopeBinding()),
				moduleOf(FAKE, '/**\n * @nameLookup D3\n */\nfunction lookUp(name) { return name; }\n')]),
				'Whitelist (out of scopebinding.js)');
			// a mark inside a function body must not mark the next top-level function
			var inBody = 'function g(name) {\n\t/**\n\t * @nameLookup D3\n\t */\n\treturn name;\n}\n' +
				'function lookUp(name) { return name; }\n';
			shouldHaveSome(checkWhitelist([moduleOf(SCOPE_BINDING, fakeScopeBinding(inBody))]),
				'Whitelist (mark inside a function body)');
			nameLookupFunctionsOf(moduleOf(SCOPE_BINDING, inBody)).map(function (entry) {
				return entry.node;
			}).should.eql([null]);
		});
	});
});
