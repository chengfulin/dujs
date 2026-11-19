/*
 * Test cases of the globals read without declaration (feature 006, User
 * Story 3, D3, FR-006, research R5, R9, R12; contracts/acceptance.md
 * US3-1...8, U1, U4): an unresolved name only read is a page global defined at
 * the entry of its page (definition type global); the fixed list,
 * localStorage and the implicit globals keep their definitions; undefined,
 * NaN, Infinity, arguments and this are not variables.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	childProcess = require('child_process'),
	should = require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	Scope = require('../../lib/dujs/scope'),
	Def = require('../../lib/dujs/def'),
	Pair = require('../../lib/dujs/pair'),
	FlowNode = require('../../lib/esgraph/flownode'),
	analyze = require('../helpers/analyze');

var ROOT = path.join(__dirname, '..', '..'),
	PROBES = path.join(__dirname, 'cases', 'probes006');

/**
 * Analyze a probe (a file name of probes006)
 * @param {string} probe
 * @returns {Object} the result of the analyze helper
 */
function analyzeProbe(probe) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, probe), 'utf8'));
}

/**
 * Check the pairs: every pair of present is in pairs, no pair of absent is
 * @param {Array} pairs
 * @param {Array} present
 * @param {Array} absent
 */
function checkPairs(pairs, present, absent) {
	'use strict';
	present.forEach(function (pair) {
		pairs.should.containEql(pair);
	});
	(absent || []).forEach(function (pair) {
		pairs.should.not.containEql(pair);
	});
}

/**
 * Pairs of the variables with the name
 * @param {Array} pairs
 * @param {string} name
 * @returns {Array}
 */
function pairsOfName(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

/**
 * The intra-page model of the page analyzed last (first page)
 * @param {Object} result
 * @returns {Model}
 */
function intraPageModelOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree).intraPageModels[0];
}

/**
 * Def-use pairs of the variables with the name in a model, with their nodes
 * @param {Model} model
 * @param {string} name
 * @returns {Array} [{variable, def, use}] (use: the using node, or the
 *     decision node of a p-use)
 */
function nodePairsOf(model, name) {
	'use strict';
	var found = [];
	model.dupairs.forEach(function (pairs, variable) {
		if (variable.name !== name) {
			return;
		}
		pairs.values().forEach(function (dupair) {
			found.push({
				variable: variable,
				def: dupair.first,
				use: (dupair.second instanceof Pair) ? dupair.second.first : dupair.second
			});
		});
	});
	return found;
}

/**
 * The page scope of the scope of a node
 * @param {FlowNode} node
 * @returns {Scope}
 */
function pageScopeOf(node) {
	'use strict';
	var scope = node.scope;
	while (!!scope && scope.type !== Scope.PAGE_TYPE) {
		scope = scope.parent;
	}
	return scope;
}

/**
 * Types of the definitions of each variable reaching any node of a model
 * @param {Model} model
 * @returns {Object} (name, [definition type])
 */
function definitionTypesOf(model) {
	'use strict';
	var types = {};
	model.graph[2].forEach(function (node) {
		var result = model.analysisResultOf(node);
		[].concat((!!result && !!result.reachIns) ? result.reachIns.values() : []).forEach(function (vardef) {
			var name = vardef.variable.name;
			types[name] = types[name] || [];
			if (types[name].indexOf(vardef.definition.type) === -1) {
				types[name].push(vardef.definition.type);
			}
		});
	});
	return types;
}

/**
 * The Vars with the name defined in a model
 * @param {Model} model
 * @param {string} name
 * @returns {Array}
 */
function varsNamed(model, name) {
	'use strict';
	var found = [];
	model.dupairs.forEach(function (pairs, variable) {
		if (variable.name === name && found.indexOf(variable) === -1) {
			found.push(variable);
		}
	});
	return found;
}

describe('Globals read without declaration (feature 006, US3)', function () {
	'use strict';
	afterEach(function () {
		analyze.reset();
	});

	/// US3-1
	it('should define Math, JSON and alert at the page entry and keep the other pairs (globals)', function () {
		checkPairs(analyzeProbe('globals.js').intraPage(), [
			'Math: entry -> L1', 'JSON: entry -> L2', 'alert: entry -> L3',
			'console: entry -> L1', 't: L2 -> L3', 'undeclared: L4 -> L5'
		]);
	});

	/// US3-2 (the pairs of the golden fixtures are checked by diffcheck)
	it('should keep the definition types of window, document, console and localStorage', function () {
		var code = 'localStorage.setItem("k", document.title);\nconsole.log(window.name, Math.PI);';
		var result = analyze(code),
			binding = result.scopeTree.binding,
			types = definitionTypesOf(intraPageModelOf(result));
		types.window.should.eql([Def.HTML_DOM_TYPE]);
		types.document.should.eql([Def.HTML_DOM_TYPE]);
		types.console.should.eql([Def.OBJECT_TYPE]);
		types.Math.should.eql([Def.GLOBAL_TYPE]);
		/// localStorage stays the built-in Var of the domain (definition type localStorage), not a page global;
		/// as in develop, its definition at the domain does not reach the page models
		var localStorageVar = binding.localStorageVar();
		localStorageVar.binding.kind.should.eql('builtIn');
		binding.globalVars().should.not.containEql(localStorageVar);
		result.scopeTree.root.parent.builtInObjects.filter(function (descriptor) {
			return descriptor.name === 'localStorage';
		})[0].def.should.eql(Def.LOCAL_STORAGE_TYPE);
		should(types.localStorage).be.undefined();
		pairsOfName(result.intraPage(), 'localStorage').should.eql([]);
		checkPairs(result.intraPage(), ['document: entry -> L1', 'console: entry -> L2', 'window: entry -> L2',
			'Math: entry -> L2']);
	});

	/// US3-3 (guard)
	it('should define g at the entry and at its assignment (g)', function () {
		checkPairs(analyze('console.log(g);\ng = 1;\nconsole.log(g);').intraPage(), ['g: entry -> L1', 'g: L2 -> L3']);
	});

	/// US3-4
	it('should define Math at the page entry for its read in a called function', function () {
		var result = analyze('function k() { return Math.max(1, 2); }\nk();'),
			found = nodePairsOf(intraPageModelOf(result), 'Math').filter(function (pair) {
				return pair.use.line === 1 && pair.use.type !== FlowNode.ENTRY_NODE_TYPE;
			});
		result.intraPage().should.containEql('Math: entry -> L1');
		found.length.should.be.above(0);
		found.forEach(function (pair) {
			pair.def.scope.should.equal(result.scopeTree.root);
			pair.use.astNode.type.should.eql('ReturnStatement');
		});
	});

	/// US3-5
	it('should define Math at the entry of each page without pairs across the pages', function () {
		analyze(['console.log(Math.PI);', 'var m = Math.max(1, 2);']);
		var model = modelCtrl.interPageModel,
			found = nodePairsOf(model, 'Math');
		var pages = found.map(function (pair) {
			pageScopeOf(pair.def).should.equal(pageScopeOf(pair.use));
			pair.def.type.should.eql(FlowNode.ENTRY_NODE_TYPE);
			return pageScopeOf(pair.def);
		});
		pages.filter(function (page, index) {
			return pages.indexOf(page) === index;
		}).length.should.eql(2);
		varsNamed(model, 'Math').length.should.eql(2);
	});

	/// US3-6 (guard)
	it('should give arguments and this no pair (args, tyof)', function () {
		pairsOfName(analyzeProbe('args.js').intraPage(), 'arguments').should.eql([]);
		pairsOfName(analyzeProbe('args.js').intraPage(), 'this').should.eql([]);
		pairsOfName(analyzeProbe('tyof.js').intraPage(), 'this').should.eql([]);
	});

	/// US3-7
	it('should define the operand of typeof but not undefined and NaN (tyof)', function () {
		var pairs = analyzeProbe('tyof.js').intraPage();
		pairs.should.containEql('zz: entry -> L1');
		pairsOfName(pairs, 'undefined').should.eql([]);
		pairsOfName(pairs, 'NaN').should.eql([]);
	});

	/// US3-8
	it('should define globalThis but not Infinity, and keep a local undefined', function () {
		var code = 'console.log(globalThis, Infinity);\nfunction h() { var undefined = 1; return undefined; }\nh();';
		var result = analyze(code),
			pairs = result.intraPage(),
			model = intraPageModelOf(result);
		pairs.should.containEql('globalThis: entry -> L1');
		pairsOfName(pairs, 'Infinity').should.eql([]);
		pairs.should.containEql('undefined: L2 -> L2');
		definitionTypesOf(model).globalThis.should.eql([Def.GLOBAL_TYPE]);
		varsNamed(model, 'globalThis').forEach(function (aVar) {
			aVar.binding.kind.should.eql('global');
		});
	});

	it('should give the globals Math, JSON and alert the kind global and global definitions (globals)', function () {
		var model = intraPageModelOf(analyzeProbe('globals.js')),
			types = definitionTypesOf(model);
		['Math', 'JSON', 'alert'].forEach(function (name) {
			types[name].should.eql([Def.GLOBAL_TYPE]);
			varsNamed(model, name).length.should.eql(1);
			varsNamed(model, name)[0].binding.kind.should.eql('global');
		});
		varsNamed(model, 'undeclared')[0].binding.kind.should.eql('implicitGlobal');
	});

	/// plan review U1: names $ and été
	describe('names $ and été (plan-u1)', function () {
		it('should analyze without error and define $ and été as globals', function () {
			var result = analyzeProbe('plan-u1.js'),
				pairs = result.intraPage(),
				model = intraPageModelOf(result);
			checkPairs(pairs, ['$: entry -> L1', 'été: entry -> L2']);
			['$', 'été'].forEach(function (name) {
				varsNamed(model, name)[0].binding.kind.should.eql('global');
			});
		});

		it('should run the CLI with exit 0 and write the rows of $ and été', function () {
			this.timeout(60000);
			var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-globals-'));
			try {
				var run = childProcess.spawnSync(process.execPath,
					[path.join(ROOT, 'bin', 'dujs.js'), '-js', path.join(PROBES, 'plan-u1.js')],
					{cwd: dir, encoding: 'utf8'});
				run.status.should.eql(0);
				var outDirs = fs.readdirSync(dir).filter(function (name) {
					return name.indexOf('out-') === 0;
				});
				outDirs.length.should.eql(1);
				var dot = fs.readFileSync(path.join(dir, outDirs[0], 'page0', 'intra-pages', '0.dupairs.dot'), 'utf8');
				dot.should.containEql('<tr><td>$</td>');
				dot.should.containEql('<tr><td>été</td>');
			} finally {
				fs.rmSync(dir, {recursive: true, force: true});
			}
		});
	});

	/// plan review U4: writes of undeclared names by for-in, ++, destructuring; G.p = v reads G and does not
	/// define it (feature 008 FR-001, FR-002)
	it('should define the undeclared names written by for-in, ++ and read G of G.p = v (plan-u4)', function () {
		var result = analyzeProbe('plan-u4.js'),
			model = intraPageModelOf(result);
		checkPairs(result.intraPage(), [
			'd1: L5 -> L6', 'o: L1 -> L2',
			'kk: L2 -> L2', 'uu: entry -> L3', 'uu: L3 -> L4', 'Math: entry -> L7', 'Math: entry -> L8',
			'location: entry -> L9', 'location: entry -> L10'
		], ['Math: L7 -> L8', 'location: L9 -> L10']);
		['Math', 'location'].forEach(function (name) {
			varsNamed(model, name)[0].binding.kind.should.eql('global');
		});
		['kk', 'uu'].forEach(function (name) {
			varsNamed(model, name)[0].binding.kind.should.eql('implicitGlobal');
		});
	});
});
