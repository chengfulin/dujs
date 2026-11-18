/*
 * Acceptance tests of member targets not defining their object variable
 * (specs/008-property-defs-method-calls, User Story 1, KI §22 (1); FR-001,
 * FR-002, FR-003; D001, D004, D007, D008, D009, D012, D013, D020, D021;
 * contracts/acceptance.md) and of o.m() in a function linked by the only
 * new A() definition of o on the page (User Story 2, KI §23; FR-004, FR-005;
 * D002, D010, D018, D021). Original dujs code, MIT License (see LICENSE).
 *
 * The probe programs are copied verbatim from
 * specs/008-property-defs-method-calls/probes to tests/dujs/cases/probes008
 * (two-page programs in pages/, split at the lines "//// page" as
 * probes/run-pages.js does). The expected pairs are those of spec.md; when a
 * scenario names no model, the pairs are asserted on the intra-procedural
 * model of the page, the inter-procedural model of the page (if any) and the
 * intra-page model (spec "notation").
 *
 * Characterization assertions (the same as develop 2035c93, passing before
 * the lib is changed) are marked "characterization" in the comments; the
 * outputs compared with probes/baseline-develop.txt and
 * probes/pages/baseline-develop.txt are read from those files, not copied.
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	scopeCtrl = require('../../lib/dujs/scopectrl'),
	hierarchy = require('../../lib/dujs/hierarchy'),
	defUseAnalyzer = require('../../lib/dujs/defuseanalyzer'),
	FlowNode = require('../../lib/esgraph/flownode'),
	pathOf = require('../../lib/esgraph/branchlabel').pathOf;

var PROBES = path.join(__dirname, 'cases', 'probes008'),
	PAGES = path.join(PROBES, 'pages'),
	SPEC = path.join(__dirname, '..', '..', 'specs', '008-property-defs-method-calls', 'probes'),
	BASELINE = path.join(SPEC, 'baseline-develop.txt'),
	PAGES_BASELINE = path.join(SPEC, 'pages', 'baseline-develop.txt'),
	PAGE = '$DOMAIN.$PAGE_0';

/**
 * Source of a probe program
 * @param {string} name File name without the extension (p1-ki22-1-prop) or its prefix (p1)
 * @returns {string}
 */
function probeSource(name) {
	'use strict';
	var files = fs.readdirSync(PROBES).filter(function (file) {
		return file === name + '.js' || file.indexOf(name + '-') === 0;
	});
	files.should.have.length(1, 'probe ' + name);
	return fs.readFileSync(path.join(PROBES, files[0]), 'utf8');
}

/**
 * Pages of a two-page probe program (as probes/run-pages.js)
 * @param {string} file File name in pages/
 * @returns {Array} source of each page
 */
function pagesOf(file) {
	'use strict';
	return fs.readFileSync(path.join(PAGES, file), 'utf8').split(/^\/\/\/\/ page\n/m).filter(function (page) {
		return page.length > 0;
	});
}

/**
 * Sections of a baseline file: the lines after each "=== <file>" line
 * @param {string} file
 * @returns {Object} file name -> Array of lines
 */
function baselineSections(file) {
	'use strict';
	var sections = {}, current = null;
	fs.readFileSync(file, 'utf8').split('\n').forEach(function (line) {
		if (line.indexOf('=== ') === 0) {
			current = line.slice(4);
			sections[current] = [];
		} else if (current !== null && line.length > 0) {
			/// a line without pairs ends with a space ("intra(g): "): compared without trailing spaces
			sections[current].push(line.replace(/\s+$/, ''));
		}
	});
	return sections;
}

/**
 * Models of the page analyzed last
 * @param {Object} result
 * @returns {PageModels}
 */
function pageModelsOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree);
}

/**
 * The inter-procedural model whose mainly related scope is the page (null if none)
 * @param {Object} result
 * @returns {Model|null}
 */
function pageInterModelOf(result) {
	'use strict';
	return pageModelsOf(result).interProceduralModels.filter(function (model) {
		return model.mainlyRelatedScope === result.scopeTree.root;
	})[0] || null;
}

/**
 * Pairs of the models of a result: intra-procedural (page), inter-procedural
 * (page; asserted to exist when required) and intra-page
 * @param {Object} result
 * @param {boolean} requireInter whether the inter-procedural model of the page must exist
 * @returns {Object} {intra, inter (null when none), intraPage}
 */
function pairsOfModels(result, requireInter) {
	'use strict';
	var inter = pageInterModelOf(result);
	if (requireInter) {
		(!!inter).should.eql(true, 'no inter-procedural model of the page; scopes ' +
			JSON.stringify(result.interProceduralScopes()));
	}
	return {
		intra: result.intraProcedural(),
		inter: !!inter ? analyze.pairsOfModel(inter) : null,
		intraPage: result.intraPage()
	};
}

/**
 * Assert the pairs present and absent in each list
 * @param {Object} lists name -> Array of pairs (null lists are skipped)
 * @param {Array} names names of the lists to assert
 * @param {Array} present
 * @param {Array} absent
 */
function expectPairs(lists, names, present, absent) {
	'use strict';
	names.forEach(function (name) {
		var pairs = lists[name];
		if (pairs === null) {
			return;
		}
		(present || []).forEach(function (pair) {
			pairs.should.containEql(pair, name + ' should have ' + pair + '; has ' + pairs.join(' | '));
		});
		(absent || []).forEach(function (pair) {
			pairs.should.not.containEql(pair, name + ' should not have ' + pair);
		});
	});
}

var ALL = ['intra', 'inter', 'intraPage'],
	UPPER = ['inter', 'intraPage'];

/**
 * 1-based line of an offset of a source
 * @param {string} source
 * @param {number} offset
 * @returns {number}
 */
function lineOf(source, offset) {
	'use strict';
	return source.slice(0, offset).split('\n').length;
}

/**
 * Call edges of the hierarchies of the inter-procedural models of the page
 * (each model once, nested units included), as
 * "L<line of the call-site> -> <last part of the callee scope name>@L<line of the callee function>"
 * @param {Object} result
 * @param {string} source
 * @returns {Array} sorted, without duplicates
 */
function callEdgesOf(result, source) {
	'use strict';
	var edges = [], visited = [];
	function walk(model) {
		if (!model || !model.hierarchy || visited.indexOf(model) !== -1) {
			return;
		}
		visited.push(model);
		model.hierarchy.edges.forEach(function (edge) {
			if (edge.kind !== 'call') {
				return;
			}
			var scope = edge.callee.scope,
				text = 'L' + edge.callSite.line + ' -> ' + String(scope).split('.').pop() + '@L' +
					lineOf(source, scope.ast.range[0]);
			if (edges.indexOf(text) === -1) {
				edges.push(text);
			}
		});
		model.hierarchy.units.forEach(function (unit) {
			walk(unit.model);
		});
	}
	pageModelsOf(result).interProceduralModels.forEach(walk);
	return edges.sort();
}

/**
 * The only node of a model at the line with the branch path (entry and exit excluded)
 * @param {Model} model
 * @param {number} line
 * @param {string} [labelPath] default ''
 * @param {function} [filter] further condition on the node
 * @returns {FlowNode}
 */
function nodeOf(model, line, labelPath, filter) {
	'use strict';
	var found = model.graph[2].filter(function (node) {
		return node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE &&
			node.line === line && pathOf(node) === (labelPath || '') && (!filter || filter(node));
	});
	found.should.have.length(1, 'nodes at L' + line + (labelPath ? ':' + labelPath : ''));
	return found[0];
}

/**
 * The intra-procedural model of the page
 * @param {Object} result
 * @returns {Model}
 */
function pageIntraModelOf(result) {
	'use strict';
	return pageModelsOf(result).intraProceduralModels.filter(function (model) {
		return model.mainlyRelatedScope === result.scopeTree.root;
	})[0];
}

/**
 * Sorted names of a Set of Var or VarDef
 * @param {Object} set
 * @returns {Array}
 */
function namesOf(set) {
	'use strict';
	return (!set ? [] : set.values()).map(function (item) {
		return !!item.variable ? item.variable.name : item.name;
	}).sort();
}

/**
 * GEN, c-use and p-use variable names of a node by findGENSet and findUSESet
 * @param {FlowNode} node
 * @returns {Object} {gen, cuse, puse}
 */
function defUseOf(node) {
	'use strict';
	var uses = defUseAnalyzer.findUSESet(node);
	return {gen: namesOf(defUseAnalyzer.findGENSet(node)), cuse: namesOf(uses.cuse), puse: namesOf(uses.puse)};
}

/**
 * c-use and p-use variable names of a node by the analysis result of a model
 * @param {Model} model
 * @param {FlowNode} node
 * @returns {Object} {gen, cuse, puse}
 */
function resultOf(model, node) {
	'use strict';
	var result = model.analysisResultOf(node);
	(!!result).should.eql(true, 'no analysis result of ' + analyze.nodeLabel(node));
	return {gen: namesOf(result.generate), cuse: namesOf(result.cuse), puse: namesOf(result.puse)};
}

/**
 * The lines printed by probes/run.js for a program
 * @param {string} source
 * @returns {Array}
 */
function runLinesOf(source) {
	'use strict';
	var result = analyze(source),
		pageModels = pageModelsOf(result),
		lines = ['scopes: ' + result.scopeNames().join(', ')];
	pageModels.interProceduralModels.forEach(function (model, index) {
		lines.push('inter[' + index + '] (' + model.relatedScopes.map(String).join(', ') + ', nodes ' +
			model.graph[2].length + '): ' + analyze.pairsOfModel(model).join(' | '));
	});
	lines.push('intra(page): ' + result.intraProcedural().join(' | '));
	result.scopeNames().slice(1).forEach(function (name) {
		lines.push('intra(' + name.split('.').slice(2).join('.') + '): ' + result.intraProcedural(name).join(' | '));
	});
	lines.push('intra-page (nodes ' + pageModels.intraPageModels[0].graph[2].length + '): ' +
		result.intraPage().join(' | '));
	return lines.map(function (line) {
		/// the baseline file has no trailing spaces on a line without pairs ("intra(g): ")
		return line.replace(/\s+$/, '');
	});
}

/**
 * Analysis of a two-page program as probes/run-pages.js: the four lines and
 * the pairs of the intra-page model of the first page
 * @param {string} file File name in pages/
 * @returns {Object} {lines, intra, intraPage, storageNodes, interPage}
 */
function runPages(file) {
	'use strict';
	var result = analyze(pagesOf(file)),
		pageModels = modelCtrl.collectionOfPageModels.get(scopeCtrl.pageScopeTrees[0]),
		interPage = analyze.pairsOfModel(modelCtrl.interPageModel),
		storageNodes = hierarchy.definingLocalStorageNodes(pageModels.intraPageModels[0]).length,
		intra = result.intraProcedural();
	return {
		lines: [
			'intra(page 1): ' + intra.join(' | '),
			'storage nodes (page 1): ' + storageNodes,
			'inter-page localStorage: ' + interPage.filter(function (pair) {
				return /^localStorage:/.test(pair);
			}).join(' | '),
			'inter-page (all): ' + interPage.join(' | ')
		].map(function (line) {
			return line.replace(/\s+$/, '');
		}),
		intra: intra,
		intraPage: result.intraPage(),
		storageNodes: storageNodes,
		interPage: interPage
	};
}

describe('member targets are uses, not definitions, of their object variable (feature 008 User Story 1)', function () {
	'use strict';

	afterEach(function () {
		analyze.reset();
	});

	/// T032: US1 scenarios 1-5, 7, 8 and 17
	describe('scenarios 1-5, 7, 8, 17 (T032)', function () {
		it('US1-1 should connect o.m() of P1 to the method m of A, with o defined at L7 only', function () {
			var source = probeSource('p1'),
				result = analyze(source),
				lists = pairsOfModels(result, true);
			callEdgesOf(result, source).should.eql(['L9 -> $ANONYMOUS_FUN_0@L3']);
			expectPairs(lists, UPPER, ['o: L7 -> L8', 'o: L7 -> L9', 'x: L4 -> L10'], ['o: L8 -> L9', 'x: L1 -> L10']);
			expectPairs(lists, ['intra'], ['o: L7 -> L8', 'o: L7 -> L9'], ['o: L8 -> L9']);
		});

		it('US1-2 should not define o by any member target of P2 (L2-L10)', function () {
			var lists = pairsOfModels(analyze(probeSource('p2')), false),
				present = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (line) {
					return 'o: L1 -> L' + line;
				}).concat(['k: L1 -> L4']);
			expectPairs(lists, ALL, present,
				['o: L4 -> L5', 'o: L5 -> L6', 'o: L7 -> L8', 'o: L8 -> L8', 'o: L9 -> L10', 'o: L9 -> L11']);
			/// no pair of o is defined at L2-L10
			ALL.forEach(function (name) {
				(lists[name] || []).filter(function (pair) {
					return /^o: L([2-9]|10)(:[TF]+)? -> /.test(pair);
				}).should.eql([], name);
			});
		});

		it('US1-3 should keep the localStorage definition and give window and document only entry (P3)', function () {
			var lists = pairsOfModels(analyze(probeSource('p3')), false);
			expectPairs(lists, ALL, ['localStorage: L2 -> L3', 'v: L1 -> L2', 'window: entry -> L5', 'document: entry -> L7',
				'window: entry -> L4', 'document: entry -> L6'], ['window: L4 -> L5', 'document: L6 -> L7']);
			ALL.forEach(function (name) {
				(lists[name] || []).filter(function (pair) {
					return /^(window|document): /.test(pair) && !/^(window|document): entry -> /.test(pair);
				}).should.eql([], name);
			});
		});

		it('US1-4 should keep localStorage: L1 -> L4 and define o at L2 only (P4)', function () {
			expectPairs(pairsOfModels(analyze(probeSource('p4')), false), ALL,
				['localStorage: L1 -> L4', 'o: L2 -> L3', 'o: L2 -> L4'], ['o: L3 -> L4']);
		});

		it('US1-5 should not define o by o.p = 1 in the callee g (P12, intra-page)', function () {
			analyze(probeSource('p12')).intraPage().should.containDeep(['o: L7 -> L12', 'o: L7 -> L9', 'x: L4 -> L13']);
			analyze(probeSource('p12')).intraPage().should.not.containEql('o: L9 -> L12');
		});

		/// D001: the disappearing o: L2 -> L3 and o: L4 -> L5 are the known loss of the property-write-to-read flow
		it('US1-7 should not define o by o.p = 1 and o.p = 2 (P25)', function () {
			expectPairs(pairsOfModels(analyze(probeSource('p25')), false), ALL,
				['o: L1 -> L2', 'o: L1 -> L3', 'o: L1 -> L4', 'o: L1 -> L5', 'y: L3 -> L5'], ['o: L2 -> L3', 'o: L4 -> L5']);
		});

		it('US1-8 should read o of o.p ||= 1 only at the decision node and keep g() connected (P27)', function () {
			var source = probeSource('p27'),
				result = analyze(source),
				lists = pairsOfModels(result, true);
			/// characterization (the same as develop): the p-uses of the decision node
			expectPairs(lists, ALL, ['o: L1 -> L6>L6:F', 'o: L1 -> L6>L7:T'], []);
			expectPairs(lists, ALL, ['o: L1 -> L7', 'o: L1 -> L8'], ['o: L7 -> L8']);
			expectPairs(lists, UPPER, ['x: L3 -> L8'], []);
			callEdgesOf(result, source).should.eql(['L7 -> g@L2']);
			/// the assignment node of the F branch neither reads (c-use) nor defines o
			ALL.forEach(function (name) {
				(lists[name] || []).filter(function (pair) {
					return /^o: .* -> L6(:F)?$/.test(pair);
				}).should.eql([], name);
			});
			var node = nodeOf(pageIntraModelOf(result), 6, 'F');
			var defUse = defUseOf(node);
			defUse.gen.should.not.containEql('o');
			defUse.cuse.should.not.containEql('o');
			var intraPageModel = pageModelsOf(result).intraPageModels[0],
				inIntraPage = resultOf(intraPageModel, nodeOf(intraPageModel, 6, 'F'));
			inIntraPage.gen.should.not.containEql('o');
			inIntraPage.cuse.should.not.containEql('o');
		});

		/// D020, D011: o.m and q.n do not define o and q; o.m() and q.m() are not connected (object literals)
		it('US1-17 should not define o by o.m = function and q by q.n = 1, connecting no call (P37)', function () {
			var source = probeSource('p37'),
				result = analyze(source);
			expectPairs(pairsOfModels(result, false), ALL,
				['o: L1 -> L2', 'o: L1 -> L5', 'q: L1 -> L6', 'q: L1 -> L7', 'x: L1 -> L8'], ['o: L2 -> L5', 'q: L6 -> L7']);
			/// characterization (the same as develop): no call is connected
			callEdgesOf(result, source).should.eql([]);
			result.interProceduralScopes().should.eql([]);
		});
	});

	/// T033: US1 scenarios 9-13 (FR-001 on the call resolution)
	describe('scenarios 9-13: calls resolved after member targets (T033)', function () {
		it('US1-9 should connect f() after f.p = 1 to f (P29)', function () {
			var source = probeSource('p29'),
				result = analyze(source);
			callEdgesOf(result, source).should.eql(['L6 -> f@L2']);
			expectPairs(pairsOfModels(result, true), UPPER, ['f: entry -> L5', 'f: entry -> L6', 'x: L3 -> L7'],
				['f: L5 -> L6', 'x: L1 -> L7']);
		});

		it('US1-10 should connect f() after f.p = function to the declared f, not the function of L5 (P30)', function () {
			var source = probeSource('p30'),
				result = analyze(source);
			callEdgesOf(result, source).should.eql(['L8 -> f@L2']);
			expectPairs(pairsOfModels(result, true), UPPER, ['x: L3 -> L9'], ['f: L5 -> L8', 'x: L6 -> L9']);
		});

		it('US1-11 should connect new A() after A.count = 0 to the constructor of A (P31)', function () {
			var source = probeSource('p31'),
				result = analyze(source),
				lists = pairsOfModels(result, true);
			callEdgesOf(result, source).should.eql(['L8 -> $ANONYMOUS_FUN_0@L3']);
			/// x: L4 -> L9 needs the call: inter-procedural and intra-page only
			expectPairs(lists, UPPER, ['x: L4 -> L9'], ['x: L1 -> L9']);
			expectPairs(lists, ALL, [], ['A: L7 -> L8']);
		});

		it('US1-12 should connect f() in g after f.p = 1 to f by D2 (P32)', function () {
			var source = probeSource('p32'),
				result = analyze(source);
			callEdgesOf(result, source).should.eql(['L7 -> f@L2', 'L9 -> g@L6']);
			var lists = pairsOfModels(result, true);
			pageModelsOf(result).interProceduralModels.forEach(function (model) {
				analyze.pairsOfModel(model).should.not.containEql('f: L5 -> L7');
			});
			expectPairs(lists, UPPER, ['x: L3 -> L10'], ['x: L1 -> L10', 'f: L5 -> L7']);
		});

		/// D009: f(a) of f(a).p = 1 is still connected
		it('US1-13 should read the object expressions of f(a).p and o[i].q, defining nothing at L5 and L6 (P33)', function () {
			var source = probeSource('p33'),
				result = analyze(source),
				lists = pairsOfModels(result, true);
			callEdgesOf(result, source).should.eql(['L5 -> f@L2']);
			expectPairs(lists, ALL, ['a: L1 -> L5', 'o: L1 -> L6', 'i: L1 -> L6', 'f: entry -> L5'], []);
			expectPairs(lists, UPPER, ['o: L1 -> L3', 'v: entry -> L3'], []);
			[5, 6].forEach(function (line) {
				defUseOf(nodeOf(pageIntraModelOf(result), line)).gen.should.eql([], 'GEN of L' + line);
			});
			var intraPageModel = pageModelsOf(result).intraPageModels[0];
			intraPageModel.graph[2].filter(function (node) {
				return (node.line === 5 || node.line === 6) && !!intraPageModel.analysisResultOf(node);
			}).forEach(function (node) {
				resultOf(intraPageModel, node).gen.should.eql([], 'GEN of ' + analyze.nodeLabel(node) + ' (intra-page)');
			});
		});

		/// research R3: develop does not connect o.m() as o.p = 1 on the same node defines o first;
		/// a behavior change from develop (golden-diff note)
		it('should connect o.m() of var o = new A(); o.p = 1, o.m(); (the guard of the spillover lifted, R3)', function () {
			var source = [
				'var x = 0;',
				'class A {',
				'  m() {',
				'    x = 1;',
				'  }',
				'}',
				'var o = new A();',
				'o.p = 1, o.m();',
				'console.log(x);'
			].join('\n');
			var result = analyze(source);
			callEdgesOf(result, source).should.eql(['L8 -> $ANONYMOUS_FUN_0@L3']);
			expectPairs(pairsOfModels(result, true), UPPER, ['o: L7 -> L8', 'x: L4 -> L9'], ['x: L1 -> L9']);
		});
	});

	/// T034: US1 scenarios 6, 14, 15 and 16
	describe('scenarios 6, 14-16: two-page programs and localStorage (T034)', function () {
		var pagesBaseline = baselineSections(PAGES_BASELINE);

		/// characterization (D004): the four lines of s1-s9 are those of probes/pages/baseline-develop.txt
		fs.readdirSync(PAGES).filter(function (file) {
			return /^s[1-9]-.*\.js$/.test(file);
		}).sort().forEach(function (file) {
			it('US1-6 should give the develop output of ' + file + ' (characterization)', function () {
				(!!pagesBaseline[file]).should.eql(true, 'no baseline of ' + file);
				runPages(file).lines.should.eql(pagesBaseline[file]);
			});
		});

		/// D021: only the pairs of o are accepted by User Story 1; x: L3 -> L13 and the absence of
		/// x: L6 -> L13 need FR-004 and are asserted by User Story 2 (T048)
		it('US1-14 should define o of s10 at L5 only, in the inter-page model and the intra-page model of page 1', function () {
			var run = runPages('s10-two-pages-method.js');
			[run.interPage, run.intraPage].forEach(function (pairs) {
				pairs.should.containDeep(['o: L5 -> L9', 'o: L5 -> L11']);
				pairs.should.not.containEql('o: L11 -> L9');
			});
		});

		/// D008: a localStorage declared in a function or on the page and an alias are not exempted
		it('US1-15 should not exempt the shadowed localStorage of s11', function () {
			var run = runPages('s11-shadowed-storage.js');
			[run.interPage, run.intraPage].forEach(function (pairs) {
				pairs.should.containDeep(['localStorage: L3 -> L4', 'localStorage: L3 -> L5']);
				pairs.should.not.containEql('localStorage: L4 -> L5');
			});
			/// the pairs of the domain localStorage are unchanged
			run.interPage.should.containDeep(['localStorage: L1 -> L1', 'localStorage: L1 -> L8']);
			run.storageNodes.should.eql(1);
		});

		it('US1-15 should not exempt the localStorage declared on the page of s12', function () {
			var run = runPages('s12-page-var-storage.js');
			[run.intra, run.intraPage, run.interPage].forEach(function (pairs) {
				pairs.should.containDeep(['localStorage: L1 -> L2', 'localStorage: L1 -> L3']);
				pairs.should.not.containEql('localStorage: L2 -> L3');
			});
			run.storageNodes.should.eql(0);
		});

		it('US1-15 should not exempt the alias s of localStorage of s13', function () {
			var run = runPages('s13-storage-alias.js');
			[run.intra, run.intraPage, run.interPage].forEach(function (pairs) {
				pairs.should.containDeep(['s: L2 -> L3', 's: L2 -> L4']);
				pairs.should.not.containEql('s: L3 -> L4');
			});
			run.storageNodes.should.eql(1);
			/// characterization: the localStorage pairs of the inter-page model are those of develop
			run.lines[2].should.eql(pagesBaseline['s13-storage-alias.js'][2]);
		});

		it('US1-15 should take window.localStorage.k of s14 as a member target of window', function () {
			var run = runPages('s14-window-storage.js');
			[run.intra, run.intraPage, run.interPage].forEach(function (pairs) {
				pairs.should.containDeep(['window: entry -> L2', 'window: entry -> L3', 'window: entry -> L4',
					'window: entry -> L5']);
				pairs.should.not.containEql('window: L4 -> L5');
			});
			/// characterization: the same as develop
			run.storageNodes.should.eql(1);
			run.lines[2].should.eql(pagesBaseline['s14-window-storage.js'][2]);
		});

		/// D013: localStorage.getItem(n).p has no object variable (a call on the chain): not exempted,
		/// localStorage and n are read at L2
		it('US1-16 should read localStorage and n at L2 of P42, defining nothing', function () {
			var result = analyze(probeSource('p42')),
				lists = pairsOfModels(result, false),
				defUse = defUseOf(nodeOf(pageIntraModelOf(result), 2));
			defUse.gen.should.eql([]);
			defUse.cuse.should.containDeep(['localStorage', 'n']);
			expectPairs(lists, ALL, ['n: L1 -> L2', 'o: L1 -> L2', 'console: entry -> L3'], []);
			/// characterization (the same as develop): not a node defining the local storage object
			hierarchy.definingLocalStorageNodes(pageModelsOf(result).intraPageModels[0]).length.should.eql(0);
		});

		/// characterization, spec "by the actual run": whether localStorage, without a definition on the
		/// page, gives a pair. P42_LOCAL_STORAGE_PAIRS is the actual run of the implementation (T045): no
		/// localStorage pair in any model (no definition of localStorage reaches its reads at L2 and L3 in
		/// these models); recorded in the golden-diff "unit test expectations" table (D020 A1).
		it('US1-16 should give the localStorage pairs of P42 of the actual run (characterization)', function () {
			var P42_LOCAL_STORAGE_PAIRS = [];
			var lists = pairsOfModels(analyze(probeSource('p42')), false);
			ALL.forEach(function (name) {
				(lists[name] || []).filter(function (pair) {
					return /^localStorage: /.test(pair);
				}).should.eql(P42_LOCAL_STORAGE_PAIRS, name);
			});
		});
	});

	/// T035: positions of the segment nodes, nested assignments, reads of FR-002 and P22
	describe('segment nodes, nested assignments and the reads of member targets (T035)', function () {
		var HEAD = [
			'var o = {}, a = [1], k = 0;',
			'function g() {',
			'  return 1;',
			'}',
			'function f() {',
			'  return 2;',
			'}'
		];

		/**
		 * Analyze HEAD, the statement at L8 and console.log(o); and return the intra-page model
		 * @param {Array} statement lines from L8
		 * @returns {Object} {result, source, model, lists}
		 */
		function analyzeAtL8(statement) {
			var source = HEAD.concat(statement, ['console.log(o);']).join('\n'),
				result = analyze(source);
			return {
				result: result,
				source: source,
				model: pageModelsOf(result).intraPageModels[0],
				lists: pairsOfModels(result, false)
			};
		}

		/**
		 * Number of call-sites at a line (call edges of the hierarchy)
		 * @param {Object} run
		 * @param {number} line
		 * @returns {number}
		 */
		function callSitesAt(run, line) {
			return callEdgesOf(run.result, run.source).filter(function (edge) {
				return edge.indexOf('L' + line + ' -> ') === 0;
			}).length;
		}

		/// plan known risk (D020 analyze C1, M2): the reads of the target are in the segment 0
		it('should read o and g of o[g()] = f(); in the segment 0 (call node of g)', function () {
			var run = analyzeAtL8(['o[g()] = f();']);
			callSitesAt(run, 8).should.eql(2);
			var segment0 = nodeOf(run.model, 8, '', function (node) {
				return !!node.segment && node.segment.index === 0;
			});
			segment0.type.should.eql(FlowNode.CALL_NODE_TYPE);
			resultOf(run.model, segment0).cuse.should.eql(['g', 'o']);
			expectPairs(run.lists, ALL, ['o: L1 -> L8', 'g: entry -> L8', 'f: entry -> L8', 'o: L1 -> L9'], ['o: L8 -> L9']);
		});

		it('should read o, g and a of [o[g()]] = a; in the segment 0 (call node of g)', function () {
			var run = analyzeAtL8(['[o[g()]] = a;']);
			callSitesAt(run, 8).should.eql(1);
			var segment0 = nodeOf(run.model, 8, '', function (node) {
				return !!node.segment && node.segment.index === 0;
			});
			resultOf(run.model, segment0).cuse.should.eql(['a', 'g', 'o']);
			expectPairs(run.lists, ALL, ['o: L1 -> L8', 'g: entry -> L8', 'o: L1 -> L9'], ['o: L8 -> L9']);
		});

		it('should read o and k of for (o[k] of f()) at the loop node', function () {
			var run = analyzeAtL8(['for (o[k] of f()) {', '}']);
			callSitesAt(run, 8).should.eql(1);
			var loop = nodeOf(run.model, 8, '', function (node) {
				return !!node.astNode && node.astNode.type === 'ForOfStatement';
			});
			resultOf(run.model, loop).cuse.should.eql(['k', 'o']);
			expectPairs(run.lists, ALL, ['o: L1 -> L8', 'k: L1 -> L8', 'o: L1 -> L10'], ['o: L8 -> L8', 'o: L8 -> L10']);
		});

		/// KI §46: g() of the target of a for-of is not a call-site
		it('should read o and g of for (o[g()] of a) at the loop node, g() not a call-site', function () {
			var run = analyzeAtL8(['for (o[g()] of a) {', '}']);
			callSitesAt(run, 8).should.eql(0);
			var loop = nodeOf(run.model, 8, '', function (node) {
				return !!node.astNode && node.astNode.type === 'ForOfStatement';
			});
			var uses = resultOf(run.model, loop);
			uses.cuse.should.containEql('o');
			uses.cuse.concat(uses.puse).should.containEql('g');
			expectPairs(run.lists, ALL, ['o: L1 -> L8', 'o: L1 -> L10'], ['o: L8 -> L8', 'o: L8 -> L10']);
		});

		/// D012 (R1 (d)): regression, the nested assignment still defines x; o is not defined
		it('should define x and not o by o.p = x = 1; and o.p = x++;', function () {
			expectPairs(pairsOfModels(analyze('var o = {}, x = 0;\no.p = x = 1;\nconsole.log(x, o);'), false), ALL,
				['x: L2 -> L3', 'o: L1 -> L2', 'o: L1 -> L3'], ['x: L1 -> L3', 'o: L2 -> L3']);
			analyze.reset();
			expectPairs(pairsOfModels(analyze('var o = {}, x = 0;\no.p = x++;\nconsole.log(x, o);'), false), ALL,
				['x: L1 -> L2', 'x: L2 -> L3', 'o: L1 -> L2', 'o: L1 -> L3'], ['x: L1 -> L3', 'o: L2 -> L3']);
		});

		/// characterization (D012, the same as develop; new KI FR-011 (g)): x is not defined
		it('should not define x by o.a.b = x = 1; and this.p = x = 1; (characterization)', function () {
			expectPairs(pairsOfModels(analyze('var o = {a: {}}, x = 0;\no.a.b = x = 1;\nconsole.log(x, o);'), false), ALL,
				['x: L1 -> L3'], ['x: L2 -> L3']);
			analyze.reset();
			var source = [
				'var x = 0;',
				'class A {',
				'  m() {',
				'    this.p = x = 1;',
				'    console.log(x);',
				'  }',
				'}',
				'new A().m();'
			].join('\n');
			var result = analyze(source);
			callEdgesOf(result, source).should.eql(['L8 -> $ANONYMOUS_FUN_0@L3']);
			expectPairs(pairsOfModels(result, true), UPPER, ['x: L1 -> L5'], ['x: L4 -> L5']);
			result.intraProcedural(PAGE + '.$ANONYMOUS_FUN_0').should.not.containEql('x: L4 -> L5');
		});

		/// FR-002: the reads of the member targets are at the loop node
		it('should read o and k of for (o[k] of a) at the loop node', function () {
			expectPairs(pairsOfModels(analyze('var o = {}, a = [1], k = 0;\nfor (o[k] of a) {\n}\nconsole.log(o);'), false),
				ALL, ['o: L1 -> L2', 'k: L1 -> L2', 'a: L1 -> L2', 'o: L1 -> L4'], ['o: L2 -> L2', 'o: L2 -> L4']);
		});

		it('should read o of for ([o.p] of a) at the loop node', function () {
			expectPairs(pairsOfModels(analyze('var o = {}, a = [[1]];\nfor ([o.p] of a) {\n}\nconsole.log(o);'), false),
				ALL, ['o: L1 -> L2', 'a: L1 -> L2', 'o: L1 -> L4'], ['o: L2 -> L4']);
		});

		it('should read o and k of ({p: o[k]} = b);', function () {
			expectPairs(pairsOfModels(analyze('var o = {}, b = {p: 1}, k = 0;\n({p: o[k]} = b);\nconsole.log(o);'), false),
				ALL, ['o: L1 -> L2', 'k: L1 -> L2', 'b: L1 -> L2', 'o: L1 -> L3'], ['o: L2 -> L3']);
		});

		/// the read of o before f() is a p-use of the decision node (deferred from the segment 0 in the
		/// inter-procedural and intra-page models, 007 FR-003)
		it('should read o of if ((o.p = f())) as a p-use of the decision node', function () {
			var source = [
				'var o = {};',
				'function f() {',
				'  return 1;',
				'}',
				'if ((o.p = f())) {',
				'  o = null;',
				'}',
				'console.log(o);'
			].join('\n');
			var result = analyze(source);
			callEdgesOf(result, source).should.eql(['L5 -> f@L2']);
			expectPairs(pairsOfModels(result, true), ALL,
				['o: L1 -> L5>L6:T', 'o: L1 -> L5>L8:F', 'o: L1 -> L8', 'o: L6 -> L8'], ['o: L5 -> L8']);
		});

		it('should read f and a of f(a).p = 1; in the callee g', function () {
			var source = [
				'var a = 1;',
				'function f(v) {',
				'  return {};',
				'}',
				'function g() {',
				'  f(a).p = 1;',
				'}',
				'g();'
			].join('\n');
			var result = analyze(source);
			callEdgesOf(result, source).should.eql(['L6 -> f@L2', 'L8 -> g@L5']);
			expectPairs(pairsOfModels(result, true), UPPER, ['a: L1 -> L6', 'f: entry -> L6', 'g: entry -> L8'], []);
		});

		/// characterization (D004, the same as develop): the exempted variant
		it('should keep the develop pairs of for (localStorage[k] of a) (characterization)', function () {
			var lists = pairsOfModels(analyze('var a = [1], k = 0;\nfor (localStorage[k] of a) {\n}\n' +
				'console.log(localStorage.k);'), false);
			lists.intra.should.eql(['a: L1 -> L2', 'console: entry -> L4', 'localStorage: L2 -> L2',
				'localStorage: L2 -> L4']);
			lists.intraPage.should.eql(lists.intra);
		});

		/// SC-002: the result of P22 is unchanged
		it('should give the develop output of P22 (characterization)', function () {
			var baseline = baselineSections(BASELINE)['p22-while-true.js'];
			(!!baseline).should.eql(true, 'no baseline of P22');
			runLinesOf(probeSource('p22')).should.eql(baseline);
		});
	});
});

/**
 * Call edges of a result at some lines, without the name of the callee scope:
 * "L<line of the call-site> -> @L<line of the callee function>"
 * @param {Object} result
 * @param {string} source
 * @param {Array} lines lines of the call-sites
 * @returns {Array} sorted
 */
function callEdgesAtLines(result, source, lines) {
	'use strict';
	return callEdgesOf(result, source).filter(function (edge) {
		return lines.indexOf(Number(/^L(\d+) /.exec(edge)[1])) !== -1;
	}).map(function (edge) {
		return edge.replace(/ -> .*@/, ' -> @');
	}).sort();
}

describe('o.m() in a function linked by the only new A() definition of o (feature 008 User Story 2)', function () {
	'use strict';
	var baseline = baselineSections(BASELINE);

	afterEach(function () {
		analyze.reset();
	});

	/**
	 * The lines of probes/baseline-develop.txt for a probe
	 * @param {string} file
	 * @returns {Array}
	 */
	function baselineOf(file) {
		(!!baseline[file]).should.eql(true, 'no baseline of ' + file);
		return baseline[file];
	}

	/// T048: US2 scenarios 1-3 and 11 (linked: m of A only, A has no constructor)
	describe('scenarios 1-3, 11: linked (T048)', function () {
		it('US2-1 should connect o.m() of g to m of A, giving x: L4 -> L12 (P5)', function () {
			var source = probeSource('p5'),
				result = analyze(source);
			callEdgesOf(result, source).should.eql(['L11 -> g@L8', 'L9 -> $ANONYMOUS_FUN_0@L3']);
			expectPairs(pairsOfModels(result, true), UPPER, ['x: L4 -> L12'], ['x: L1 -> L12']);
		});

		/// k may run before h: x: L1 -> L12 is kept
		it('US2-2 should connect o.m() of the handler h, giving x: L4 -> L12 in the intra-page model (P8)', function () {
			var source = probeSource('p8'),
				result = analyze(source);
			callEdgesAtLines(result, source, [9]).should.eql(['L9 -> @L3']);
			result.intraPage().should.containDeep(['x: L4 -> L12', 'x: L1 -> L12']);
		});

		/// needs User Story 1: o.p = 1 of L8 does not define o
		it('US2-3 should connect o.m() of g after o.p = 1, giving x: L4 -> L13 (P9)', function () {
			var source = probeSource('p9'),
				result = analyze(source);
			callEdgesOf(result, source).should.eql(['L10 -> $ANONYMOUS_FUN_0@L3', 'L12 -> g@L9']);
			expectPairs(pairsOfModels(result, true), UPPER, ['x: L4 -> L13'], ['x: L1 -> L13']);
		});

		/// the relaxation ignores the order of execution (temporal dead zone of o)
		it('US2-11 should connect o.m() of g called before const o = new A(), giving x: L4 -> L12 (P34)', function () {
			var source = probeSource('p34'),
				result = analyze(source);
			callEdgesOf(result, source).should.eql(['L10 -> g@L7', 'L8 -> $ANONYMOUS_FUN_0@L3']);
			expectPairs(pairsOfModels(result, true), UPPER, ['x: L4 -> L12'], ['x: L1 -> L12']);
		});
	});

	/// T048: US2 scenarios 4, 6, 7, 9, 10, 12, 13: the output of develop (characterization)
	describe('scenarios 4-7, 9, 10, 12, 13: not relaxed (T048)', function () {
		[
			['US2-4', 'p7-ki23-two-defs.js'],
			['US2-6', 'p11-ki23-local-def.js'],
			['US2-7', 'p6-ki23-var.js'],
			['US2-9', 'p26-ki23-reassigned.js'],
			['US2-10', 'p28-ki23-let-reassigned.js'],
			['US2-12', 'p35-ki23-let-split.js'],
			['US2-13', 'p36-d2-let-split.js']
		].forEach(function (each) {
			it(each[0] + ' should give the develop output of ' + each[1] + ' (characterization)', function () {
				runLinesOf(probeSource(each[1].replace(/\.js$/, ''))).should.eql(baselineOf(each[1]));
			});
		});

		/// D010: f of let f; f = function () {...}; is not relaxed, f: L3 -> L7 kept
		it('US2-13 should keep f: L3 -> L7 in the inter-procedural model of P36 (D010)', function () {
			var result = analyze(probeSource('p36')),
				lists = pairsOfModels(result, true);
			lists.inter.should.containEql('f: L3 -> L7');
			expectPairs(lists, ALL, ['x: L1 -> L10'], []);
		});

		/// D018: not linked; F.prototype.m = ... of L3 reads F (FR-002, User Story 1) in three models
		it('US2-5 should not connect o.m() of new F(), adding only F: entry -> L3 to develop (P10)', function () {
			var source = probeSource('p10'),
				expected = baselineOf('p10-ki23-not-class.js').map(function (line) {
					return /^(inter\[0\] |intra\(page\):|intra-page )/.test(line) ?
						line.replace('F: entry -> L6', 'F: entry -> L3 | F: entry -> L6') : line;
				});
			expected.join('\n').split('F: entry -> L3').should.have.length(4);
			runLinesOf(source).should.eql(expected);
			var result = analyze(source);
			callEdgesAtLines(result, source, [8]).should.eql([]);
			expectPairs(pairsOfModels(result, true), ALL, ['x: L1 -> L11', 'F: entry -> L3'], []);
		});
	});

	/// T048, D021: the pairs of x of US1 scenario 14 need FR-004 (o.m() of g linked)
	describe('scenario 14 of User Story 1: the pairs of x of s10 (T048, D021)', function () {
		it('US1-14 should give x: L3 -> L13 and not x: L6 -> L13 in the inter-page model and the intra-page model of page 1', function () {
			var run = runPages('s10-two-pages-method.js');
			[['inter-page', run.interPage], ['intra-page of page 1', run.intraPage]].forEach(function (each) {
				each[1].should.containEql('x: L3 -> L13', each[0] + ': ' + each[1].join(' | '));
				each[1].should.not.containEql('x: L6 -> L13', each[0]);
			});
		});
	});

	/// T049: US2 scenario 8, the MDN assessment of "Object building practice"
	describe('scenario 8: MDN a05-assessment-main.js (T049)', function () {
		it('US2-8 should connect evilBall.draw(), checkBounds() and collisionDetect() of loop() to EvilCircle', function () {
			this.timeout(60000);
			var source = fs.readFileSync(path.join(__dirname, '..', '..', 'specs', '006-eslint-scope', 'mdn', 'corpus',
					'a05-assessment-main.js'), 'utf8'),
				result = analyze(source);
			/// draw L119, checkBounds L127 and collisionDetect L145 of class EvilCircle (L93)
			callEdgesAtLines(result, source, [198, 199, 200]).should.eql(['L198 -> @L119', 'L199 -> @L127',
				'L200 -> @L145']);
		});
	});
});
