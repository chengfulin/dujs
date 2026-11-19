/*
 * Test cases for PageBinding (lib/dujs/scopebinding.js), feature 006:
 * eslint-scope as the only source of declarations and identifier resolution
 * (contracts/scope-binding-api.md sections 2-4, data-model sections 1, 2, 5;
 * research R1-R8, R11, R12; acceptance US4-9)
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	espree = require('espree'),
	should = require('should');
var jsParser = require('../../lib/dujs/jsparser'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	scopeTreeFactory = require('../../lib/dujs/scopetreefactory'),
	sourceReader = require('../../lib/dujs/sourcereader'),
	scopeBinding = require('../../lib/dujs/scopebinding'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, 'cases', 'probes006');

/**
 * Parse the code and add it as the only page of the scope controller
 * @param {string} code
 * @returns {Object} {ast, tree, binding}
 */
function setUp(code) {
	'use strict';
	analyze.reset();
	var ast = jsParser.parseAST(code);
	scopeCtrl.addPageScopeTree(ast);
	var tree = scopeCtrl.pageScopeTrees[0];
	return {ast: ast, tree: tree, binding: tree.binding};
}

/**
 * Identifier nodes of the AST in source order
 * @param {Object} ast
 * @returns {Array}
 */
function identifiersOf(ast) {
	'use strict';
	var found = [];
	(function visit(node) {
		if (!node || typeof node.type !== 'string') {
			return;
		}
		if (node.type === 'Identifier') {
			found.push(node);
		}
		(espree.VisitorKeys[node.type] || []).forEach(function (key) {
			[].concat(node[key]).forEach(visit);
		});
	}(ast));
	return found.sort(function (first, second) {
		return first.range[0] - second.range[0];
	});
}

/**
 * The index-th (0-based) Identifier with the name, optionally on a line
 * @param {Object} ast
 * @param {string} name
 * @param {number} [index]
 * @param {number} [line]
 * @returns {Object} Identifier
 */
function idOf(ast, name, index, line) {
	'use strict';
	var matched = identifiersOf(ast).filter(function (node) {
		return node.name === name && (line === undefined || node.loc.start.line === line);
	});
	var found = matched[index || 0];
	if (!found) {
		throw new Error('No Identifier ' + name + ' #' + (index || 0) + (line === undefined ? '' : ' on line ' + line));
	}
	return found;
}

/**
 * The index-th eslint scope of the type
 * @param {PageBinding} binding
 * @param {string} type
 * @param {number} [index]
 * @returns {Object} eslint-scope Scope
 */
function eslintScopeOfType(binding, type, index) {
	'use strict';
	return binding.scopeManager.scopes.filter(function (scope) {
		return scope.type === type;
	})[index || 0];
}

/**
 * The dujs scope (function, page or block) of the tree with the name (last
 * part of the scope name)
 * @param {ScopeTree} tree
 * @param {string} name
 * @returns {Scope}
 */
function dujsScopeNamed(tree, name) {
	'use strict';
	return tree.scopes.concat(tree.blockScopes).filter(function (scope) {
		return scope.name.split('.').pop() === name;
	})[0];
}

function kindsOf(variable) {
	'use strict';
	return variable.binding.declarations.map(function (declaration) {
		return declaration.kind;
	});
}

describe('PageBinding (scopebinding)', function () {
	'use strict';
	afterEach(function () {
		analyze.reset();
	});

	describe('analyze options (research R1)', function () {
		it('should analyze with ECMA_VERSION, the sourceType of the AST, optimistic and espree visitor keys', function () {
			var page = setUp('var a = 1;');
			jsParser.ECMA_VERSION.should.eql(espree.latestEcmaVersion);
			page.binding.options.ecmaVersion.should.eql(jsParser.ECMA_VERSION);
			page.binding.options.sourceType.should.eql('script');
			page.binding.options.optimistic.should.eql(true);
			page.binding.options.childVisitorKeys.should.equal(espree.VisitorKeys);
			page.binding.scopeManager.isModule().should.eql(false);
		});

		it('should analyze as a module when the code is parsed as a module after failing as a script', function () {
			var page = setUp('import a from "./a.js";\na();');
			page.ast.sourceType.should.eql('module');
			page.binding.options.sourceType.should.eql('module');
			page.binding.scopeManager.isModule().should.eql(true);
		});

		it('should analyze two concatenated files as a module when the second one imports', function () {
			var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-scopebinding-'));
			var first = path.join(dir, 'first.js'),
				second = path.join(dir, 'second.js');
			fs.writeFileSync(first, 'var a = 1;\n');
			fs.writeFileSync(second, 'import b from "./b.js";\nb(a);\n');
			try {
				var page = setUp(sourceReader.getSourceFromFiles([first, second]));
				page.binding.options.sourceType.should.eql('module');
				page.binding.useVarsOf(idOf(page.ast, 'a', 1)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'a', 0)));
			} finally {
				fs.rmSync(dir, {recursive: true, force: true});
			}
		});

		it('should be attached to the scope tree of the page by the scope controller', function () {
			var page = setUp('var a;');
			should.exist(page.binding);
			page.binding.scopeTree.should.equal(page.tree);
		});
	});

	describe('useVarsOf and defVarsOf (research R3, F5)', function () {
		it('should not use a declaring identifier but define its Var', function () {
			var page = setUp('var x;\nfunction f() {}\nx;\nf();');
			page.binding.useVarsOf(idOf(page.ast, 'x', 0)).should.eql([]);
			page.binding.useVarsOf(idOf(page.ast, 'f', 0)).should.eql([]);
			var x = page.binding.defVarsOf(idOf(page.ast, 'x', 0)),
				f = page.binding.defVarsOf(idOf(page.ast, 'f', 0));
			x.length.should.eql(1);
			f.length.should.eql(1);
			x[0].name.should.eql('x');
			page.binding.useVarsOf(idOf(page.ast, 'x', 1)).should.eql(x);
			page.binding.useVarsOf(idOf(page.ast, 'f', 1)).should.eql(f);
			page.binding.useVarOf(idOf(page.ast, 'f', 1)).should.equal(f[0]);
		});

		it('should give no Var to identifiers which are not references', function () {
			var page = setUp('L: for (;;) { break L; }\nvar o = {k: 1, m() {}};\no.p;\nvar q;\nexport {q as r};');
			[idOf(page.ast, 'L', 0), idOf(page.ast, 'L', 1), idOf(page.ast, 'p'), idOf(page.ast, 'k'),
				idOf(page.ast, 'm'), idOf(page.ast, 'r')].forEach(function (identifier) {
				page.binding.useVarsOf(identifier).should.eql([]);
				page.binding.defVarsOf(identifier).should.eql([]);
				should(page.binding.useVarOf(identifier)).be.null();
			});
		});

		it('should define the Vars of for-of, for-in and destructuring declarations', function () {
			var page = setUp('var xs = [], o = {};\nfor (const x of xs) {}\nfor (var k in o) {}\nvar {p: a, b: [c]} = o;');
			['x', 'k', 'a', 'c'].forEach(function (name) {
				var defined = page.binding.defVarsOf(idOf(page.ast, name));
				defined.length.should.eql(1);
				defined[0].name.should.eql(name);
			});
			page.binding.defVarsOf(idOf(page.ast, 'x'))[0].binding.kind.should.eql('const');
			page.binding.defVarsOf(idOf(page.ast, 'k'))[0].binding.kind.should.eql('var');
			page.binding.defVarsOf(idOf(page.ast, 'b')).should.eql([]);
		});

		it('should define both the outer and the inner Var by a class declaration id', function () {
			var page = setUp('class A {\n  m() { return A; }\n}\nA = null;');
			var defined = page.binding.defVarsOf(idOf(page.ast, 'A', 0));
			defined.length.should.eql(2);
			defined[0].should.not.equal(defined[1]);
			page.binding.useVarsOf(idOf(page.ast, 'A', 1)).should.eql([defined[1]]);
			page.binding.defVarsOf(idOf(page.ast, 'A', 2)).should.eql([defined[0]]);
		});
	});

	describe('owner scopes (research R4)', function () {
		var code = [
			'var a;',
			'try { a = 1; } catch (e) { a = e; }',
			'function f() { { let b; try {} catch (e2) { b = e2; } } }',
			'class A { static s = 1; static { a; } m() {} }',
			'var g = function h() { return h; };',
			'{ function k() {} }',
			'for (let i = 0; i < 1; ++i) {}'
		].join('\n');

		it('should map the global scope to the page scope', function () {
			var page = setUp(code);
			page.binding.ownerScopeOf(eslintScopeOfType(page.binding, 'global')).should.equal(page.tree.root);
			page.binding.eslintScopeOf(page.tree.root).should.equal(eslintScopeOfType(page.binding, 'global'));
		});

		it('should map a catch scope to the innermost dujs scope containing the catch clause', function () {
			var page = setUp(code);
			page.binding.ownerScopeOf(eslintScopeOfType(page.binding, 'catch', 0)).should.equal(page.tree.root);
			var catchInBlock = eslintScopeOfType(page.binding, 'catch', 1);
			var blockScope = page.binding.ownerScopeOf(catchInBlock);
			blockScope.type.should.eql('block');
			blockScope.parent.should.equal(dujsScopeNamed(page.tree, 'f'));
		});

		it('should map a class scope to the dujs scope where the class is', function () {
			var page = setUp(code);
			page.binding.ownerScopeOf(eslintScopeOfType(page.binding, 'class')).should.equal(page.tree.root);
		});

		it('should map a class field initializer and a static block to the synthetic function scopes', function () {
			var page = setUp(code);
			var field = page.binding.ownerScopeOf(eslintScopeOfType(page.binding, 'class-field-initializer')),
				staticBlock = page.binding.ownerScopeOf(eslintScopeOfType(page.binding, 'class-static-block'));
			field.ast.dujsClassMember.type.should.eql('PropertyDefinition');
			staticBlock.ast.dujsClassMember.type.should.eql('StaticBlock');
			field.should.not.equal(staticBlock);
			page.binding.eslintScopeOf(field).type.should.eql('class-field-initializer');
			page.binding.eslintScopeOf(staticBlock).type.should.eql('class-static-block');
		});

		it('should map a function expression name scope to the scope of the function itself', function () {
			var page = setUp(code);
			var nameScope = eslintScopeOfType(page.binding, 'function-expression-name');
			var functionScope = page.binding.ownerScopeOf(nameScope);
			functionScope.ast.should.equal(nameScope.block);
			page.binding.eslintScopeOf(functionScope).type.should.eql('function');
		});

		it('should map a block without lexical declarations (Annex B function) to the enclosing dujs scope', function () {
			var page = setUp(code);
			var kBlock = page.binding.scopeManager.scopes.filter(function (scope) {
				return scope.type === 'block' && scope.set.has('k');
			})[0];
			page.binding.ownerScopeOf(kBlock).should.equal(page.tree.root);
		});

		it('should map a for scope with a let declaration to its dujs block scope', function () {
			var page = setUp(code);
			var forScope = eslintScopeOfType(page.binding, 'for');
			page.binding.ownerScopeOf(forScope).should.equal(forScope.block.dujsBlockScope);
			page.binding.eslintScopeOf(forScope.block.dujsBlockScope).should.equal(forScope);
		});

		it('should map every eslint scope to a dujs scope', function () {
			var page = setUp(code);
			page.binding.scopeManager.scopes.forEach(function (scope) {
				should.exist(page.binding.ownerScopeOf(scope));
			});
		});
	});

	describe('declarations of Vars (US4-9, data-model section 2)', function () {
		var code = [
			'import im from "./m.js";',
			'var v1; var v1;',
			'let l1 = 1;',
			'const c1 = 2;',
			'function fd(p1) { return p1; }',
			'class C1 {}',
			'try { fd(); } catch (ce) { ce; }',
			'var ne = function nf() { return nf; };',
			'ug = 3;',
			'function ar() { return arguments; }'
		].join('\n');

		it('should give each kind of declaration its kind', function () {
			var page = setUp(code);
			var expected = {im: 'import', l1: 'let', c1: 'const', fd: 'function', p1: 'parameter', ce: 'catchParameter',
				nf: 'namedExpressionName', ne: 'var'};
			Object.keys(expected).forEach(function (name) {
				var defined = page.binding.defVarsOf(idOf(page.ast, name));
				defined.length.should.eql(1);
				defined[0].binding.kind.should.eql(expected[name]);
				kindsOf(defined[0]).should.eql([expected[name]]);
				should.exist(defined[0].binding.variable);
				defined[0].binding.variable.defs[0].name.should.equal(idOf(page.ast, name));
				page.binding.declarationsOf(defined[0]).should.eql(defined[0].binding.declarations);
			});
		});

		it('should list both declarations of var v1; var v1;', function () {
			var page = setUp(code);
			var v1 = page.binding.defVarsOf(idOf(page.ast, 'v1', 0))[0];
			page.binding.defVarsOf(idOf(page.ast, 'v1', 1)).should.eql([v1]);
			v1.binding.kind.should.eql('var');
			kindsOf(v1).should.eql(['var', 'var']);
			v1.binding.declarations[0].node.type.should.eql('VariableDeclarator');
		});

		it('should give a class declaration an outer and an inner Var, both of kind class', function () {
			var page = setUp(code);
			var defined = page.binding.defVarsOf(idOf(page.ast, 'C1'));
			defined.length.should.eql(2);
			defined.forEach(function (aVar) {
				aVar.binding.kind.should.eql('class');
				aVar.name.should.eql('C1');
			});
			defined[0].binding.variable.should.not.equal(defined[1].binding.variable);
			defined[0].binding.variable.scope.type.should.eql('module');
			defined[1].binding.variable.scope.type.should.eql('class');
		});

		it('should give an undeclared assigned name an implicitGlobal Var without declarations', function () {
			var page = setUp(code);
			var ug = page.binding.defVarsOf(idOf(page.ast, 'ug'));
			ug.length.should.eql(1);
			ug[0].name.should.eql('ug');
			ug[0].binding.kind.should.eql('implicitGlobal');
			should(ug[0].binding.variable).be.null();
			ug[0].binding.declarations.should.eql([]);
		});

		/// US3 (T050): a name only read without declaration is a page global of kind global
		it('should give an undeclared name only read a global Var without declarations', function () {
			var page = setUp('console.log(gr);\nfunction f() { return gr; }');
			var gr = page.binding.useVarsOf(idOf(page.ast, 'gr', 0));
			gr.length.should.eql(1);
			gr[0].name.should.eql('gr');
			gr[0].binding.kind.should.eql('global');
			should(gr[0].binding.variable).be.null();
			gr[0].binding.declarations.should.eql([]);
			page.binding.useVarsOf(idOf(page.ast, 'gr', 1)).should.eql(gr);
		});

		/// US3 (T050): names written only by ++/-- or as the left of for-in/for-of are implicit globals
		it('should give undeclared names written by ++, -- and for-in/for-of implicitGlobal Vars', function () {
			var page = setUp('for (ki in {}) {}\nfor (ko of []) {}\nuu++;\n--ud;');
			['ki', 'ko', 'uu', 'ud'].forEach(function (name) {
				var defined = page.binding.defVarsOf(idOf(page.ast, name));
				defined.length.should.eql(1);
				defined[0].binding.kind.should.eql('implicitGlobal');
				defined[0].binding.declarations.should.eql([]);
			});
		});

		it('should give arguments no Var', function () {
			var page = setUp(code);
			page.binding.useVarsOf(idOf(page.ast, 'arguments')).should.eql([]);
		});

		it('should map each declared eslint-scope Variable to its own Var (one-to-one)', function () {
			var page = setUp(code);
			var seen = [];
			page.binding.scopeManager.scopes.forEach(function (scope) {
				scope.variables.forEach(function (variable) {
					var aVar = page.binding.variableVar(variable);
					if (variable.defs.length === 0) {
						should(aVar).be.null();
						return;
					}
					aVar.binding.variable.should.equal(variable);
					page.binding.variableVar(variable).should.equal(aVar);
					seen.indexOf(aVar).should.eql(-1);
					seen.push(aVar);
				});
			});
			seen.length.should.be.above(10);
		});

		it('should define the catch parameter by the write of var e = 4 in catch (e), and list the declaration under the outer e', function () {
			var page = setUp(fs.readFileSync(path.join(PROBES, 'catch-edge.js'), 'utf8'));
			var assigned = page.binding.defVarsOf(idOf(page.ast, 'e', 0, 10));
			var catchParameter = page.binding.defVarsOf(idOf(page.ast, 'e', 0, 9));
			assigned.length.should.eql(1);
			assigned.should.eql(catchParameter);
			assigned[0].binding.kind.should.eql('catchParameter');
			var outer = page.binding.defVarsOf(idOf(page.ast, 'e', 0, 1))[0];
			outer.should.not.equal(assigned[0]);
			outer.binding.declarations.map(function (declaration) {
				return declaration.node.id;
			}).should.eql([idOf(page.ast, 'e', 0, 1), idOf(page.ast, 'e', 0, 10)]);
			page.binding.useVarsOf(idOf(page.ast, 'e', 0, 13)).should.eql([outer]);
		});

		it('should take the kind function when a parameter is also declared as a function', function () {
			var page = setUp('function f(a) { function a() {} }\nfunction g(a) { var a; }');
			var inF = page.binding.defVarsOf(idOf(page.ast, 'a', 0))[0],
				inG = page.binding.defVarsOf(idOf(page.ast, 'a', 2))[0];
			page.binding.defVarsOf(idOf(page.ast, 'a', 1)).should.eql([inF]);
			inF.binding.kind.should.eql('function');
			kindsOf(inF).should.eql(['parameter', 'function']);
			page.binding.defVarsOf(idOf(page.ast, 'a', 3)).should.eql([inG]);
			inG.binding.kind.should.eql('parameter');
			kindsOf(inG).should.eql(['parameter', 'var']);
		});
	});

	/// feature 005 US2 (D2, FR-005, research R8): the kinds of bindings a call in a function may be relaxed to
	describe('isRelaxedCallee (feature 005 D2)', function () {
		var code = [
			'function fd() {}',
			'{ function fb() {} }',
			'let fl = function () {};',
			'const fc = () => {};',
			'var ne = function nf() {};',
			'var fv = function () {};',
			'function fp(p1) { try { p1(); } catch (ce) { ce(); } }',
			'class C1 {}'
		].join('\n');

		it('should be true for function (also in a block), let, const and the name of a named function expression', function () {
			var page = setUp(code);
			['fd', 'fb', 'fl', 'fc', 'nf'].forEach(function (name) {
				var defined = page.binding.defVarsOf(idOf(page.ast, name));
				defined.length.should.eql(1);
				page.binding.isRelaxedCallee(defined[0]).should.eql(true, name);
			});
		});

		it('should be false for var, parameter, catch parameter and class', function () {
			var page = setUp(code);
			['ne', 'fv', 'p1', 'ce', 'C1'].forEach(function (name) {
				var defined = page.binding.defVarsOf(idOf(page.ast, name));
				defined.length.should.be.above(0);
				defined.forEach(function (aVar) {
					page.binding.isRelaxedCallee(aVar).should.eql(false, name);
				});
			});
		});

		it('should be false for a global and an implicit global', function () {
			var page = setUp('ug = 1;\ngr();');
			page.binding.isRelaxedCallee(page.binding.defVarsOf(idOf(page.ast, 'ug'))[0]).should.eql(false);
			page.binding.isRelaxedCallee(page.binding.useVarsOf(idOf(page.ast, 'gr'))[0]).should.eql(false);
		});
	});

	describe('built-in objects (research R9, F9)', function () {
		it('should map an undeclared fixed-list name to the built-in Var', function () {
			var page = setUp('console.log(1);');
			var used = page.binding.useVarsOf(idOf(page.ast, 'console'));
			used.length.should.eql(1);
			used[0].should.equal(page.binding.builtInVariableOf('console'));
			used[0].binding.kind.should.eql('builtIn');
			should(used[0].binding.variable).be.null();
			used[0].binding.declarations.should.eql([]);
		});

		it('should map a page-level declaration with a fixed-list name to the built-in Var', function () {
			var page = setUp('var console = {};\nconsole.log(1);');
			var declared = page.binding.defVarsOf(idOf(page.ast, 'console', 0));
			declared.should.eql([page.binding.builtInVariableOf('console')]);
			page.binding.useVarsOf(idOf(page.ast, 'console', 1)).should.eql(declared);
			declared[0].binding.variable.should.equal(eslintScopeOfType(page.binding, 'global').set.get('console'));
			declared[0].binding.kind.should.eql('var');
		});

		it('should map a page-level function with a fixed-list name to the built-in Var (plan-bi)', function () {
			var page = setUp(fs.readFileSync(path.join(PROBES, 'plan-bi.js'), 'utf8'));
			var declared = page.binding.defVarsOf(idOf(page.ast, 'Map', 0));
			declared.should.eql([page.binding.builtInVariableOf('Map')]);
			declared[0].binding.kind.should.eql('function');
		});

		it('should keep a page-level localStorage declaration as a Var of the page', function () {
			var page = setUp('var localStorage = 1;\nlocalStorage;');
			var declared = page.binding.defVarsOf(idOf(page.ast, 'localStorage', 0));
			declared.length.should.eql(1);
			declared[0].should.not.equal(page.binding.localStorageVar());
			declared[0].binding.kind.should.eql('var');
			page.binding.localStorageVar().binding.kind.should.eql('builtIn');
		});

		it('should share the localStorage Var among the pages of the domain', function () {
			analyze.reset();
			scopeCtrl.addPageScopeTree(jsParser.parseAST('localStorage.a = 1;'));
			scopeCtrl.addPageScopeTree(jsParser.parseAST('localStorage.a;'));
			var first = scopeCtrl.pageScopeTrees[0].binding,
				second = scopeCtrl.pageScopeTrees[1].binding;
			first.localStorageVar().should.equal(second.localStorageVar());
			first.builtInVariableOf('console').should.not.equal(second.builtInVariableOf('console'));
		});
	});

	/// feature 008 contracts/lib-api.md section 1, D008: Var identity with the domain localStorage
	describe('isLocalStorageObject (feature 008 D008)', function () {
		it('should be true for the domain localStorage', function () {
			var page = setUp('localStorage.k = 1;\nlocalStorage.k;');
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 0)).should.eql(true);
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 1)).should.eql(true);
		});

		it('should be true for the domain localStorage used in a function', function () {
			var page = setUp('function f() { localStorage.k = 1; }\nf();');
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage')).should.eql(true);
		});

		it('should be false for a page-level var localStorage (s12)', function () {
			var page = setUp('var localStorage = {};\nlocalStorage.k = 2;\nlocalStorage.k;');
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 0)).should.eql(false);
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 1)).should.eql(false);
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 2)).should.eql(false);
		});

		it('should be false for a let localStorage shadowing it in a function (s11)', function () {
			var page = setUp('localStorage.a = 1;\nfunction f() {\n\tlet localStorage = {};\n\tlocalStorage.k = 2;\n}\nf();');
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 0)).should.eql(true);
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 1)).should.eql(false);
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage', 2)).should.eql(false);
		});

		it('should be false for an alias of localStorage (s13)', function () {
			var page = setUp('var s = localStorage;\ns.k = 2;');
			page.binding.isLocalStorageObject(idOf(page.ast, 's', 0)).should.eql(false);
			page.binding.isLocalStorageObject(idOf(page.ast, 's', 1)).should.eql(false);
			page.binding.isLocalStorageObject(idOf(page.ast, 'localStorage')).should.eql(true);
		});

		it('should be false for window of window.localStorage (s14)', function () {
			var page = setUp('window.localStorage.k = 2;');
			page.binding.isLocalStorageObject(idOf(page.ast, 'window')).should.eql(false);
		});
	});

	/// feature 008 contracts/lib-api.md section 1, D004, D008, D013: member targets of the domain localStorage
	describe('isLocalStorageMemberTarget (feature 008 D004)', function () {
		/**
		 * The left side of the assignment of statement i of the page
		 */
		function leftOf(page, i) {
			return page.ast.body[i].expression.left;
		}

		it('should be true for a member target of the domain localStorage, at any depth', function () {
			var page = setUp('localStorage.a = 1;\nlocalStorage.a.b = 2;\nlocalStorage[k].c = 3;');
			page.binding.isLocalStorageMemberTarget(leftOf(page, 0)).should.eql(true);
			page.binding.isLocalStorageMemberTarget(leftOf(page, 1)).should.eql(true);
			page.binding.isLocalStorageMemberTarget(leftOf(page, 2)).should.eql(true);
		});

		it('should be false for a shadowed localStorage', function () {
			var page = setUp('function f() {\n\tlet localStorage = {};\n\tlocalStorage.a.b = 2;\n}\nf();');
			page.binding.isLocalStorageMemberTarget(page.ast.body[0].body.body[1].expression.left).should.eql(false);
		});

		it('should be false for window.localStorage', function () {
			var page = setUp('window.localStorage.k = 2;');
			page.binding.isLocalStorageMemberTarget(leftOf(page, 0)).should.eql(false);
		});

		it('should be false for a chain starting with a call (D013)', function () {
			var page = setUp('g(localStorage).k = 2;\nlocalStorage.getItem(k).p = 3;');
			page.binding.isLocalStorageMemberTarget(leftOf(page, 0)).should.eql(false);
			page.binding.isLocalStorageMemberTarget(leftOf(page, 1)).should.eql(false);
		});
	});

	/// feature 008 contracts/lib-api.md section 1, D002: relaxed instances are let and const only
	describe('isRelaxedInstance (feature 008 D002)', function () {
		var code = [
			'let il = new Object();',
			'const ic = new Object();',
			'var iv = new Object();',
			'function fd(p1) { return p1; }',
			'class C1 {}',
			'try {} catch (ce) {}'
		].join('\n');

		it('should be true for let and const', function () {
			var page = setUp(code);
			['il', 'ic'].forEach(function (name) {
				var defined = page.binding.defVarsOf(idOf(page.ast, name));
				defined.length.should.eql(1);
				page.binding.isRelaxedInstance(defined[0]).should.eql(true, name);
			});
		});

		it('should be false for var, parameter, function, class and catch parameter', function () {
			var page = setUp(code);
			['iv', 'p1', 'fd', 'C1', 'ce'].forEach(function (name) {
				var defined = page.binding.defVarsOf(idOf(page.ast, name));
				defined.length.should.be.above(0);
				defined.forEach(function (aVar) {
					page.binding.isRelaxedInstance(aVar).should.eql(false, name);
				});
			});
		});

		it('should be false for a global, an implicit global and no Var', function () {
			var page = setUp('ug = 1;\ngr();');
			page.binding.isRelaxedInstance(page.binding.defVarsOf(idOf(page.ast, 'ug'))[0]).should.eql(false);
			page.binding.isRelaxedInstance(page.binding.useVarsOf(idOf(page.ast, 'gr'))[0]).should.eql(false);
			page.binding.isRelaxedInstance(null).should.eql(false);
			page.binding.isRelaxedInstance(undefined).should.eql(false);
		});
	});

	/// feature 008 contracts/lib-api.md section 1 (R2-4): left nodes of &&=, ||= and ??=, by identity
	describe('isLogicalAssignmentTarget (feature 008 R2-4)', function () {
		/**
		 * The AssignmentExpression nodes of the AST in source order
		 * @param {Object} ast
		 * @returns {Array}
		 */
		function assignmentsOf(ast) {
			var found = [];
			(function visit(node) {
				if (!node || typeof node.type !== 'string') {
					return;
				}
				if (node.type === 'AssignmentExpression') {
					found.push(node);
				}
				(espree.VisitorKeys[node.type] || []).forEach(function (key) {
					[].concat(node[key]).forEach(visit);
				});
			}(ast));
			return found.sort(function (first, second) {
				return first.range[0] - second.range[0];
			});
		}

		var code = [
			'var a, b, c, d, e, o = {};',
			'a &&= 1;',
			'b ||= 2;',
			'c ??= 3;',
			'o.p ??= 4;',
			'function f() { o[a] ||= 5; }',
			'd += 6;',
			'e = 7;',
			'o.q = 8;'
		].join('\n');

		it('should be true for the left of &&=, ||= and ??= (Identifier and member, also in a function)', function () {
			var page = setUp(code);
			var logical = assignmentsOf(page.ast).filter(function (node) {
				return ['&&=', '||=', '??='].indexOf(node.operator) !== -1;
			});
			logical.length.should.eql(5);
			logical.forEach(function (node) {
				page.binding.isLogicalAssignmentTarget(node.left).should.eql(true, node.operator + ' at line ' + node.loc.start.line);
			});
		});

		it('should be false for the left of += and =', function () {
			var page = setUp(code);
			var others = assignmentsOf(page.ast).filter(function (node) {
				return node.operator === '+=' || node.operator === '=';
			});
			others.length.should.eql(3);
			others.forEach(function (node) {
				page.binding.isLogicalAssignmentTarget(node.left).should.eql(false, node.operator + ' at line ' + node.loc.start.line);
			});
		});

		it('should compare by object identity, not by range or name', function () {
			var page = setUp(code);
			var left = assignmentsOf(page.ast)[0].left;
			left.name.should.eql('a');
			page.binding.isLogicalAssignmentTarget(Object.assign({}, left)).should.eql(false);
			/// other nodes of the logical assignment and later reads of the same name
			page.binding.isLogicalAssignmentTarget(assignmentsOf(page.ast)[0]).should.eql(false);
			page.binding.isLogicalAssignmentTarget(assignmentsOf(page.ast)[0].right).should.eql(false);
			page.binding.isLogicalAssignmentTarget(idOf(page.ast, 'a', 2)).should.eql(false);
		});

		it('should not be shared between pages', function () {
			var page = setUp(code);
			var left = assignmentsOf(page.ast)[0].left;
			var other = scopeBinding.analyze(jsParser.parseAST('x &&= 1;'));
			other.isLogicalAssignmentTarget(left).should.eql(false);
			page.binding.isLogicalAssignmentTarget(left).should.eql(true);
		});
	});

	describe('isVisible (research R6)', function () {
		it('should see an outer Var referenced by a parameter default though the function declares the same name (pdef, b)', function () {
			var page = setUp(fs.readFileSync(path.join(PROBES, 'pdef.js'), 'utf8'));
			var outer = page.binding.defVarsOf(idOf(page.ast, 'x', 0, 1))[0];
			page.binding.isVisible(outer, dujsScopeNamed(page.tree, 'f')).should.eql(true);
		});

		it('should not see a shadowed outer Var', function () {
			var page = setUp('var x = 1;\nfunction f() { var x = 2; return x; }\nf();');
			var outer = page.binding.defVarsOf(idOf(page.ast, 'x', 0))[0],
				inner = page.binding.defVarsOf(idOf(page.ast, 'x', 1))[0];
			page.binding.isVisible(outer, dujsScopeNamed(page.tree, 'f')).should.eql(false);
			page.binding.isVisible(inner, dujsScopeNamed(page.tree, 'f')).should.eql(true);
			page.binding.isVisible(inner, page.tree.root).should.eql(false);
			page.binding.isVisible(outer, page.tree.root).should.eql(true);
		});

		it('should see an unshadowed Var not referenced by the scope (a)', function () {
			var page = setUp('var v = 1;\nfunction a() { v = 2; }\nfunction b() { a(); }\nb();');
			var v = page.binding.defVarsOf(idOf(page.ast, 'v', 0))[0];
			page.binding.isVisible(v, dujsScopeNamed(page.tree, 'b')).should.eql(true);
		});

		it('should see the inner class Var from a function called on the page (vis3, c)', function () {
			var page = setUp(fs.readFileSync(path.join(PROBES, 'vis3.js'), 'utf8'));
			var both = page.binding.defVarsOf(idOf(page.ast, 'A', 0)),
				g = dujsScopeNamed(page.tree, 'g');
			page.binding.definingScopeOf(both[1]).should.equal(page.tree.root);
			should(page.binding.definingScopeOf(both[0])).be.null();
			page.binding.isVisible(both[1], g).should.eql(true);
			page.binding.isVisible(both[0], g).should.eql(true);
		});

		it('should see built-in and global Vars unless shadowed', function () {
			var page = setUp('u = 1;\nfunction f() { return console; }\nfunction g() { var console, u; }');
			var consoleVar = page.binding.builtInVariableOf('console'),
				u = page.binding.defVarsOf(idOf(page.ast, 'u', 0))[0];
			page.binding.isVisible(consoleVar, dujsScopeNamed(page.tree, 'f')).should.eql(true);
			page.binding.isVisible(u, dujsScopeNamed(page.tree, 'f')).should.eql(true);
			page.binding.isVisible(consoleVar, dujsScopeNamed(page.tree, 'g')).should.eql(false);
			page.binding.isVisible(u, dujsScopeNamed(page.tree, 'g')).should.eql(false);
			page.binding.isVisible(page.binding.localStorageVar(), dujsScopeNamed(page.tree, 'g')).should.eql(true);
		});

		it('should give the same answer when asked again (cached)', function () {
			var page = setUp('var x = 1;\nfunction f() { var x = 2; }');
			var outer = page.binding.defVarsOf(idOf(page.ast, 'x', 0))[0],
				f = dujsScopeNamed(page.tree, 'f');
			page.binding.isVisible(outer, f).should.eql(page.binding.isVisible(outer, f));
		});
	});

	describe('classBindingGroupOf (research R7)', function () {
		it('should group the outer and the inner Var of a class declaration', function () {
			var page = setUp('class A {}\nvar z;');
			var both = page.binding.defVarsOf(idOf(page.ast, 'A'));
			page.binding.classBindingGroupOf(both[0]).should.eql(both);
			page.binding.classBindingGroupOf(both[1]).should.eql(both);
			var z = page.binding.defVarsOf(idOf(page.ast, 'z'))[0];
			page.binding.classBindingGroupOf(z).should.eql([z]);
		});

		/// merged count (004 FR-018): new A() in a static method links to the
		/// constructor when the class is the only definition on the page
		it('should link new A() in a method when the class is defined once', function () {
			var result = analyze('class A {\n constructor() { this.x = 1; }\n static make() { new A(); }\n}\nA.make();');
			result.interProceduralScopes().some(function (scopes) {
				return scopes.join(',').indexOf('$ANONYMOUS_FUN_0') !== -1;
			}).should.eql(true);
		});

		it('should not link new A() in a method when A is also assigned on the page (link-n5)', function () {
			var result = analyze(fs.readFileSync(path.join(PROBES, 'link-n5.js'), 'utf8'));
			result.interProceduralScopes().some(function (scopes) {
				return scopes.join(',').indexOf('$ANONYMOUS_FUN_0') !== -1;
			}).should.eql(false);
		});
	});

	describe('optimistic resolution as D6 (research R2)', function () {
		it('should resolve names in with as globals or outer declarations (with.js)', function () {
			var page = setUp(fs.readFileSync(path.join(PROBES, 'with.js'), 'utf8'));
			var assigned = page.binding.defVarsOf(idOf(page.ast, 'p', 0));
			assigned.length.should.eql(1);
			assigned[0].binding.kind.should.eql('implicitGlobal');
			page.binding.useVarsOf(idOf(page.ast, 'p', 1)).should.eql(assigned);
			page.binding.useVarsOf(idOf(page.ast, 'q', 0, 4)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'q', 0, 3)));
		});

		it('should resolve names of a function with eval to the enclosing declarations (evalouter.js)', function () {
			var page = setUp(fs.readFileSync(path.join(PROBES, 'evalouter.js'), 'utf8'));
			var a = page.binding.defVarsOf(idOf(page.ast, 'a', 0, 2));
			page.binding.useVarsOf(idOf(page.ast, 'a', 0, 3)).should.eql(a);
			page.binding.useVarsOf(idOf(page.ast, 'a', 0, 5)).should.eql(a);
			page.binding.useVarsOf(idOf(page.ast, 'p', 0, 5)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'p', 0, 1)));
			page.binding.useVarsOf(idOf(page.ast, 'k', 0, 4)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'k', 0, 3)));
		});

		it('should keep a block function in a function with eval inside the block (D5 first)', function () {
			var page = setUp('function h() {\n  eval("");\n  { function bf() {} }\n  bf();\n}');
			var blockFunction = page.binding.defVarsOf(idOf(page.ast, 'bf', 0));
			blockFunction.length.should.eql(1);
			/// the call outside the block reads a page global (US3, D3), not the block function
			var used = page.binding.useVarsOf(idOf(page.ast, 'bf', 1));
			used.length.should.eql(1);
			used[0].binding.kind.should.eql('global');
			used[0].should.not.equal(blockFunction[0]);
		});

		it('should resolve a catch parameter inside with to the catch parameter', function () {
			var page = setUp('var o = {};\nwith (o) { try { x(); } catch (e) { e; } }');
			var parameter = page.binding.defVarsOf(idOf(page.ast, 'e', 0));
			parameter[0].binding.kind.should.eql('catchParameter');
			page.binding.useVarsOf(idOf(page.ast, 'e', 1)).should.eql(parameter);
		});

		it('should resolve a parameter default in a function with eval to the page Var (the only deviation)', function () {
			var page = setUp('var x = 1;\nfunction f(a = x) { var x = 2; eval(""); return a; }');
			var pageX = page.binding.defVarsOf(idOf(page.ast, 'x', 0, 1));
			page.binding.useVarsOf(idOf(page.ast, 'x', 0, 2)).should.eql(pageX);
			page.binding.defVarsOf(idOf(page.ast, 'x', 1, 2)).should.not.eql(pageX);
		});
	});

	describe('a Var named as a reserved scope name (research R12)', function () {
		it('should analyze var $ANONYMOUS_FUN_0 without error', function () {
			var code = 'var $ANONYMOUS_FUN_0 = 1; var g = function () { return $ANONYMOUS_FUN_0; }; g();';
			var result = analyze(code);
			result.scopeTree.scopes.map(function (scope) {
				return scope.name;
			}).should.eql(['$DOMAIN.$PAGE_0', '$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0']);
			var pairs = [];
			modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels.forEach(function (model) {
				pairs = pairs.concat(analyze.pairsOfModel(model));
			});
			pairs.should.containEql('$ANONYMOUS_FUN_0: L1 -> L1');
		});
	});

	describe('syntax (research R1)', function () {
		it('should take using and await using as const', function () {
			var page = setUp('{ using r = null; r; }\nasync function f() { await using s = null; s; }');
			page.binding.defVarsOf(idOf(page.ast, 'r', 0))[0].binding.kind.should.eql('const');
			page.binding.defVarsOf(idOf(page.ast, 's', 0))[0].binding.kind.should.eql('const');
			page.binding.useVarsOf(idOf(page.ast, 'r', 1)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'r', 0)));
		});

		it('should resolve the object of #p in o', function () {
			var page = setUp('class P { #p = 1; static has(o) { return #p in o; } }');
			page.binding.useVarsOf(idOf(page.ast, 'o', 1)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'o', 0)));
		});

		it('should resolve names in class fields and static blocks', function () {
			var page = setUp('var y = 1;\nclass S { static x = y; static { y; } }');
			var y = page.binding.defVarsOf(idOf(page.ast, 'y', 0));
			page.binding.useVarsOf(idOf(page.ast, 'y', 1)).should.eql(y);
			page.binding.useVarsOf(idOf(page.ast, 'y', 2)).should.eql(y);
			page.binding.useVarsOf(idOf(page.ast, 'x')).should.eql([]);
		});

		it('should resolve names with top-level await and import.meta in a module', function () {
			var page = setUp('const t = await Promise.resolve(1);\nconst m = import.meta;\nt; m;');
			page.binding.options.sourceType.should.eql('module');
			page.binding.useVarsOf(idOf(page.ast, 't', 1)).should.eql(page.binding.defVarsOf(idOf(page.ast, 't', 0)));
			page.binding.useVarsOf(idOf(page.ast, 'meta')).should.eql([]);
		});

		it('should resolve destructuring defaults and export specifiers', function () {
			var page = setUp('var b = 1, o = {};\nvar {k: a = b} = o;\nvar q = a;\nexport {q as r};');
			page.binding.useVarsOf(idOf(page.ast, 'b', 1)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'b', 0)));
			page.binding.defVarsOf(idOf(page.ast, 'a', 0)).should.eql(page.binding.useVarsOf(idOf(page.ast, 'a', 1)));
			page.binding.useVarsOf(idOf(page.ast, 'q', 1)).should.eql(page.binding.defVarsOf(idOf(page.ast, 'q', 0)));
		});
	});

	describe('errors (contract section 4)', function () {
		it('should throw a scopebinding error when the scope tree is not built from the analyzed AST', function () {
			analyze.reset();
			var binding = scopeBinding.analyze(jsParser.parseAST('function f() {}')),
				otherTree = scopeTreeFactory.create();
			otherTree.buildScopeTree(jsParser.parseAST('function f() {}'));
			should(function () {
				binding.attach(otherTree);
			}).throw(/^scopebinding: /);
		});
	});

	/// these need the identity storage of Scope (T027) and the call of
	/// registerRemainingVariables by the executor (T028)
	describe('registerRemainingVariables (research R5)', function () {
		it('should register the catch parameter, the inner class name and the function expression name', function () {
			var code = 'try {} catch (e) {}\nclass A {}\nvar g = function h() { return h; };\ng();';
			var result = analyze(code),
				binding = result.scopeTree.binding,
				ast = binding.scopeManager.globalScope.block;
			var e = binding.defVarsOf(idOf(ast, 'e'))[0],
				innerA = binding.defVarsOf(idOf(ast, 'A'))[1],
				h = binding.defVarsOf(idOf(ast, 'h', 0))[0];
			result.scopeTree.root.variables.indexOf(e).should.not.eql(-1);
			result.scopeTree.root.variables.indexOf(innerA).should.not.eql(-1);
			binding.ownerScopeOf(eslintScopeOfType(binding, 'function-expression-name')).variables.indexOf(h).should.not.eql(-1);
		});

		it('should give the owner scope of a Var by ownerScopeOfVar, null without Variable', function () {
			var code = 'var a;\nfunction f(p) { return p + u; }\nf(a);';
			var result = analyze(code),
				binding = result.scopeTree.binding,
				ast = binding.scopeManager.globalScope.block;
			var a = binding.defVarsOf(idOf(ast, 'a', 0))[0],
				p = binding.defVarsOf(idOf(ast, 'p', 0))[0],
				u = binding.useVarsOf(idOf(ast, 'u', 0))[0];
			binding.ownerScopeOfVar(a).should.equal(result.scopeTree.root);
			binding.ownerScopeOfVar(p).should.equal(binding.ownerScopeOf(eslintScopeOfType(binding, 'function')));
			binding.ownerScopeOfVar(p).should.not.equal(result.scopeTree.root);
			should.equal(binding.ownerScopeOfVar(u), null);
		});

		/// US3 (T050, R5): implicit globals written only by ++ or for-in after the existing Vars, then the
		/// read-only globals, each in source order
		it('should register the implicit globals of ++ and for-in, then the read-only globals, after the existing Vars', function () {
			var result = analyze('var o = {};\nconsole.log(rb);\nfor (kk in o) {}\nuu++;\nconsole.log(ra);\nzz = 1;\nvar q;');
			var binding = result.scopeTree.binding,
				ast = binding.scopeManager.globalScope.block;
			var names = result.scopeTree.root.variables.filter(function (aVar) {
				return !!aVar.binding && aVar.binding.kind !== 'builtIn';
			}).map(function (aVar) {
				return aVar.name + ':' + aVar.binding.kind;
			});
			names.should.eql(['o:var', 'zz:implicitGlobal', 'q:var', 'kk:implicitGlobal', 'uu:implicitGlobal',
				'rb:global', 'ra:global']);
			binding.globalVars().should.eql([binding.useVarOf(idOf(ast, 'rb')), binding.useVarOf(idOf(ast, 'ra'))]);
		});

		/// Foundational review R1: a name assigned only in a parameter default is registered to the page scope
		it('should register to the page scope a name assigned only in a parameter default (g1)', function () {
			var result = analyze('function f(a = (g1 = 1)) { return a + g1; }\nf();');
			var binding = result.scopeTree.binding,
				ast = binding.scopeManager.globalScope.block,
				g1 = binding.defVarsOf(idOf(ast, 'g1', 0))[0];
			g1.binding.kind.should.eql('implicitGlobal');
			result.scopeTree.root.variables.indexOf(g1).should.not.eql(-1);
		});

		it('should register every declared Var once in the dujs scope tree (one-to-one, data-model section 1)', function () {
			var result = analyze('var a; var a;\nfunction f(b) { let c; { const d = 1; } }\ntry {} catch (e) {}\nclass K {}');
			var binding = result.scopeTree.binding,
				registered = [];
			result.scopeTree.scopes.concat(result.scopeTree.blockScopes).forEach(function (scope) {
				scope.variables.forEach(function (aVar) {
					registered.indexOf(aVar).should.eql(-1);
					registered.push(aVar);
				});
			});
			binding.scopeManager.scopes.forEach(function (scope) {
				scope.variables.forEach(function (variable) {
					if (variable.defs.length > 0) {
						registered.indexOf(binding.variableVar(variable)).should.not.eql(-1);
					}
				});
			});
		});
	});
});
