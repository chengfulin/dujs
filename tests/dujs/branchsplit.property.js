/*
 * Property-based tests of splitting conditional and short-circuit expressions
 * (specs/001-fix-known-issues, User Story 5, FR-008 ~ FR-010, research R11)
 *
 * Programs are generated from small expression trees (depth <= 4) wrapped in
 * statement templates, one statement per line. Properties are checked on the
 * CFG and def-use results, not on fixed strings:
 *   P1 every p-use has existing true and false targets (FR-010)
 *   P2 each path of a statement defining x passes at most one split node
 *      defining x; zero only on the empty branch of a logical assignment
 *   P3 each identifier occurrence is used at most once on each path
 *   P4 identifiers only in one branch of a ?: are used only on that branch
 *   P5 branch paths of a statement are distinct and their prefixes exist
 *   P6 no split node in statement context lacks a use, a def and a call,
 *      except the leaves of return/throw (D15)
 *
 * FC_NUM_RUNS overrides the number of runs (default 100); FC_SEED overrides
 * the fixed default seed. A failure prints the seed and the counterexample.
 */
require('should');
var fc = require('fast-check'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode');

var NUM_RUNS = parseInt(process.env.FC_NUM_RUNS, 10) || 100,
	SEED = parseInt(process.env.FC_SEED, 10);
if (isNaN(SEED)) { /// unset or not a number: the fixed default seed
	SEED = 20261116;
}

var IDENTIFIERS = ['a', 'b', 'c', 'd', 'e'],
	HEADER = 'var a = 1, b = 0, c = null, d = 2, e = 3, g = 0, x = 0, y = 0;';

/* ---------------------------------------------------------------------------
 * Generators
 * ------------------------------------------------------------------------ */

/// expression trees: {k: 'id', name} | {k: 'num', value} | {k: 'cond', test, cons, alt} |
/// {k: 'bin', op, left, right} | {k: 'call', arg}
var expressionArb = fc.letrec(function (tie) {
	'use strict';
	return {
		expr: fc.oneof({maxDepth: 4, depthIdentifier: 'expr'},
			tie('leaf'), tie('cond'), tie('bin'), tie('call')),
		leaf: fc.oneof(
			fc.constantFrom.apply(fc, IDENTIFIERS).map(function (name) {
				return {k: 'id', name: name};
			}),
			fc.integer({min: 0, max: 9}).map(function (value) {
				return {k: 'num', value: value};
			})
		),
		cond: fc.record({test: tie('expr'), cons: tie('expr'), alt: tie('expr')}).map(function (r) {
			return {k: 'cond', test: r.test, cons: r.cons, alt: r.alt};
		}),
		bin: fc.record({op: fc.constantFrom('&&', '||', '??', '+'), left: tie('expr'), right: tie('expr')})
			.map(function (r) {
				return {k: 'bin', op: r.op, left: r.left, right: r.right};
			}),
		call: tie('expr').map(function (arg) {
			return {k: 'call', arg: arg};
		})
	};
}).expr;

var TEMPLATES = ['var', 'assign', 'logicalAssign', 'if', 'while', 'switch', 'return', 'param'];

var programArb = fc.array(fc.record({template: fc.constantFrom.apply(fc, TEMPLATES), expr: expressionArb}),
	{minLength: 1, maxLength: 3});

/* ---------------------------------------------------------------------------
 * Rendering: source text plus the ranges (as reported by the parser) of the
 * identifiers and conditional expressions of each expression
 * ------------------------------------------------------------------------ */

/**
 * Render an expression starting at the absolute offset
 * @returns {Object} {text, range, ids: [{name, range}], conds: [{test, cons, alt, testSimple}]}
 */
function render(expr, offset) {
	'use strict';
	var ids = [], conds = [];

	function walk(node, start) {
		var parts, text, inner;
		if (node.k === 'id') {
			ids.push({name: node.name, range: [start, start + node.name.length]});
			return {text: node.name, range: [start, start + node.name.length]};
		}
		if (node.k === 'num') {
			text = String(node.value);
			return {text: text, range: [start, start + text.length]};
		}
		if (node.k === 'call') {
			ids.push({name: 'g', range: [start, start + 1]});
			inner = walk(node.arg, start + 2);
			text = 'g(' + inner.text + ')';
			return {text: text, range: [start, start + text.length]};
		}
		/// parenthesized: the range of the node excludes the parentheses
		var cursor = start + 1;
		if (node.k === 'cond') {
			var test = walk(node.test, cursor);
			cursor += test.text.length + 3;
			var cons = walk(node.cons, cursor);
			var consSpan = [cursor, cursor + cons.text.length];
			cursor += cons.text.length + 3;
			var alt = walk(node.alt, cursor);
			conds.push({
				test: test.range,
				cons: consSpan,
				alt: [cursor, cursor + alt.text.length],
				testSimple: !containsSplit(node.test)
			});
			parts = test.text + ' ? ' + cons.text + ' : ' + alt.text;
		} else {
			var left = walk(node.left, cursor);
			cursor += left.text.length + node.op.length + 2;
			var right = walk(node.right, cursor);
			parts = left.text + ' ' + node.op + ' ' + right.text;
		}
		return {text: '(' + parts + ')', range: [start + 1, start + 1 + parts.length]};
	}

	var result = walk(expr, offset);
	return {text: result.text, range: result.range, ids: ids, conds: conds};
}

function containsSplit(node) {
	'use strict';
	if (node.k === 'cond') {
		return true;
	}
	if (node.k === 'bin') {
		return node.op !== '+' || containsSplit(node.left) || containsSplit(node.right);
	}
	if (node.k === 'call') {
		return containsSplit(node.arg);
	}
	return false;
}

/**
 * Build the program; each statement records the line of its expression,
 * the variable it defines and the identifiers it reads besides the expression
 */
function buildProgram(statements) {
	'use strict';
	var lines = [HEADER], offset = HEADER.length + 1, infos = [];

	function add(line) {
		lines.push(line);
		offset += line.length + 1;
	}

	function addWithExpression(prefix, expr, suffix, info) {
		var rendered = render(expr, offset + prefix.length);
		info.line = lines.length + 1;
		info.expression = rendered;
		info.splitExpected = info.splitExpected || containsSplit(expr);
		infos.push(info);
		add(prefix + rendered.text + suffix);
	}

	statements.forEach(function (statement, index) {
		var expr = statement.expr;
		switch (statement.template) {
		case 'var':
			addWithExpression('var x = ', expr, ';', {template: 'var', defines: 'x', reads: []});
			break;
		case 'assign':
			addWithExpression('x = ', expr, ';', {template: 'assign', defines: 'x', reads: []});
			break;
		case 'logicalAssign':
			addWithExpression('x ||= ', expr, ';',
				{template: 'logicalAssign', defines: 'x', reads: ['x'], splitExpected: true});
			break;
		case 'if':
			addWithExpression('if (', expr, ') {', {template: 'if', defines: null, reads: []});
			add('  y = 1;');
			add('}');
			break;
		case 'while':
			addWithExpression('while (', expr, ') {', {template: 'while', defines: null, reads: []});
			add('  y = 1;');
			add('}');
			break;
		case 'switch':
			addWithExpression('switch (', expr, ') {', {template: 'switch', defines: null, reads: []});
			add('  case 1:');
			add('    y = 1;');
			add('}');
			break;
		case 'return':
			add('function f' + index + '() {');
			addWithExpression('  return ', expr, ';', {template: 'return', defines: null, reads: []});
			add('}');
			add('f' + index + '();');
			break;
		default: /// param
			addWithExpression('function k' + index + '(p = ', expr, ') {',
				{template: 'param', defines: 'p', reads: []});
			add('  return p;');
			add('}');
			add('k' + index + '();');
		}
	});
	return {code: lines.join('\n'), statements: infos};
}

/* ---------------------------------------------------------------------------
 * Inspection of the analysis results
 * ------------------------------------------------------------------------ */

function namesOf(set) {
	'use strict';
	return !set ? [] : set.values().map(function (item) {
		return (!!item.variable ? item.variable : item).name;
	});
}

function usedNames(node) {
	'use strict';
	return namesOf(node.cuse).concat(namesOf(node.puse));
}

function definedNames(node) {
	'use strict';
	return namesOf(node.generate);
}

function isDecision(node) {
	'use strict';
	return !!node.true || !!node.false;
}

function hasCall(ast) {
	'use strict';
	if (!ast || typeof ast !== 'object') {
		return false;
	}
	if (ast.type === 'CallExpression' || ast.type === 'NewExpression') {
		return true;
	}
	if (/Function/.test(ast.type || '') || ast.type === 'ClassBody') {
		return false;
	}
	return Object.keys(ast).some(function (key) {
		if (key === 'loc' || key === 'range') {
			return false;
		}
		var value = ast[key];
		return Array.isArray(value) ? value.some(hasCall) : (!!value && !!value.type && hasCall(value));
	});
}

/**
 * Analyze the program and group the split nodes of each statement
 * @returns {Object} {program, models, groups: [{statement, nodes, byPath}]}
 */
function analyzeProgram(statements) {
	'use strict';
	var program = buildProgram(statements),
		result = analyze(program.code),
		pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
		splitNodes = [];
	pageModels.intraProceduralModels.forEach(function (model) {
		model.graph[2].forEach(function (node) {
			if (!!node.splitOrigin && splitNodes.indexOf(node) === -1) {
				splitNodes.push(node);
			}
		});
	});
	var groups = program.statements.map(function (statement) {
		var nodes = splitNodes.filter(function (node) {
			return node.splitOrigin.loc.start.line === statement.line;
		});
		var byPath = {};
		nodes.forEach(function (node) {
			byPath[node.branchPath] = (byPath[node.branchPath] || []).concat([node]);
		});
		return {statement: statement, nodes: nodes, byPath: byPath};
	});
	return {program: program, pageModels: pageModels, groups: groups};
}

/**
 * Every path through the split nodes of a statement, from its first decision
 * until it leaves them (normal, true and false edges)
 * @returns {Array} paths, each an array of [node, branch taken ('T', 'F' or '')]
 */
function pathsOf(group) {
	'use strict';
	var roots = group.byPath[''] || [], paths = [];
	(roots.length).should.eql(1, 'one first decision at L' + group.statement.line);

	function visit(node, path) {
		if (group.nodes.indexOf(node) === -1) {
			paths.push(path);
			return;
		}
		if (isDecision(node)) {
			visit(node.true, path.concat([[node, 'T']]));
			visit(node.false, path.concat([[node, 'F']]));
		} else {
			visit(node.normal, path.concat([[node, '']]));
		}
	}

	visit(roots[0], []);
	return paths;
}

/**
 * Split nodes are expected for a statement with a splittable operator or a
 * logical assignment (guards the properties against vacuous success)
 */
function shouldBeSplit(group) {
	'use strict';
	if (group.statement.splitExpected) {
		group.nodes.length.should.above(0, 'split nodes at L' + group.statement.line);
	}
}

function checkProperty(name, check) {
	'use strict';
	var details = fc.check(fc.property(programArb, function (statements) {
		check(analyzeProgram(statements));
	}), {numRuns: NUM_RUNS, seed: SEED});
	if (details.failed) {
		var counterexample = !!details.counterexample ? buildProgram(details.counterexample[0]).code : '(none)';
		console.error('[' + name + '] fast-check seed: ' + details.seed + ' (rerun with FC_SEED=' + details.seed + ')\n' +
			'[' + name + '] counterexample program:\n' + counterexample);
		throw new Error(fc.defaultReportMessage(details));
	}
}

/* ---------------------------------------------------------------------------
 * Properties
 * ------------------------------------------------------------------------ */

describe('Properties of splitting conditional and short-circuit expressions', function () {
	'use strict';
	this.timeout(Math.max(60000, NUM_RUNS * 600));
	after(analyze.reset);

	it('P1 every p-use has existing true and false targets (FR-010)', function () {
		checkProperty('P1', function (analyzed) {
			var models = analyzed.pageModels;
			analyzed.groups.forEach(shouldBeSplit);
			[].concat(models.intraProceduralModels, models.interProceduralModels, models.intraPageModels)
				.forEach(function (model) {
					analyze.pairsOfModel(model);
					/// a target is in the graph of the model, or is the LOOP NODE: the edges to the exit
					/// node of a page are redirected to the LOOP NODE of the intra-page graph, and flow
					/// nodes are shared by the models (known limitation)
					function isTargetOf(target) {
						return !!target && (model.graph[2].indexOf(target) !== -1 || target.type === FlowNode.LOOP_NODE_TYPE);
					}
					model.graph[2].forEach(function (node) {
						if (isDecision(node)) {
							(!!node.true && !!node.false).should.eql(true, 'both targets of a decision');
							isTargetOf(node.true).should.eql(true, 'true target in the graph or the LOOP NODE');
							isTargetOf(node.false).should.eql(true, 'false target in the graph or the LOOP NODE');
						}
					});
				});
		});
	});

	it('P2 each path defines the target at most once and never at a merged node', function () {
		checkProperty('P2', function (analyzed) {
			analyzed.groups.forEach(function (group) {
				shouldBeSplit(group);
				var target = group.statement.defines;
				if (!target || group.nodes.length === 0) {
					return;
				}
				group.nodes.forEach(function (node) {
					if (definedNames(node).indexOf(target) !== -1) {
						isDecision(node).should.eql(false, 'a decision defines ' + target);
						node.branchPath.should.not.eql('', 'a merged node defines ' + target);
					}
				});
				pathsOf(group).forEach(function (path) {
					var defs = path.filter(function (step) {
						return definedNames(step[0]).indexOf(target) !== -1;
					}).length;
					defs.should.belowOrEqual(1, 'definitions of ' + target + ' on a path');
					if (defs === 0) {
						/// only the branch of x ||= E which does not assign
						group.statement.template.should.eql('logicalAssign');
						path.length.should.eql(1);
						path[0][1].should.eql('T');
					}
				});
			});
		});
	});

	it('P3 each identifier occurrence is used at most once on each path', function () {
		checkProperty('P3', function (analyzed) {
			analyzed.groups.forEach(function (group) {
				shouldBeSplit(group);
				if (group.nodes.length === 0) {
					return;
				}
				var occurrences = {};
				group.statement.expression.ids.map(function (id) {
					return id.name;
				}).concat(group.statement.reads).forEach(function (name) {
					occurrences[name] = (occurrences[name] || 0) + 1;
				});
				pathsOf(group).forEach(function (path) {
					var uses = {};
					path.forEach(function (step) {
						usedNames(step[0]).forEach(function (name) {
							uses[name] = (uses[name] || 0) + 1;
						});
					});
					Object.keys(uses).forEach(function (name) {
						uses[name].should.belowOrEqual(occurrences[name] || 0, 'uses of ' + name + ' on a path');
					});
				});
			});
		});
	});

	it('P4 identifiers only in one branch of a ?: are used only on that branch', function () {
		checkProperty('P4', function (analyzed) {
			analyzed.groups.forEach(function (group) {
				shouldBeSplit(group);
				var expression = group.statement.expression;
				expression.conds.filter(function (cond) {
					return cond.testSimple;
				}).forEach(function (cond) {
					[['T', cond.cons], ['F', cond.alt]].forEach(function (side) {
						var inside = function (id) {
							return id.range[0] >= side[1][0] && id.range[1] <= side[1][1];
						};
						IDENTIFIERS.concat(['g']).filter(function (name) {
							var ids = expression.ids.filter(function (id) {
								return id.name === name;
							});
							return ids.length > 0 && ids.every(inside);
						}).forEach(function (name) {
							group.nodes.forEach(function (node) {
								if (usedNames(node).indexOf(name) === -1) {
									return;
								}
								var path = node.branchPath;
								var onBranch = path.split('').some(function (branch, index) {
									return branch === side[0] && (group.byPath[path.slice(0, index)] || []).some(function (decision) {
										return !!decision.astNode && !!decision.astNode.range &&
											decision.astNode.range[0] === cond.test[0] && decision.astNode.range[1] === cond.test[1];
									});
								});
								onBranch.should.eql(true, name + ' used at L' + node.line + ':' + path +
									' outside the ' + side[0] + ' branch of the ?: at ' + cond.test);
							});
						});
					});
				});
			});
		});
	});

	it('P5 branch paths of a statement are distinct and their prefixes exist', function () {
		checkProperty('P5', function (analyzed) {
			analyzed.groups.forEach(function (group) {
				shouldBeSplit(group);
				Object.keys(group.byPath).forEach(function (path) {
					group.byPath[path].length.should.eql(1, 'nodes with path "' + path + '" at L' + group.statement.line);
					/^[TF]*$/.test(path).should.eql(true);
					if (path !== '') {
						var prefix = group.byPath[path.slice(0, -1)] || [];
						prefix.length.should.eql(1, 'prefix of "' + path + '" at L' + group.statement.line);
						isDecision(prefix[0]).should.eql(true, 'prefix of "' + path + '" is a decision');
					}
				});
			});
		});
	});

	it('P6 no empty split node in statement context except return/throw leaves', function () {
		var STATEMENT_CONTEXTS = ['var', 'assign', 'logicalAssign', 'return', 'param'];
		checkProperty('P6', function (analyzed) {
			analyzed.groups.forEach(function (group) {
				shouldBeSplit(group);
				if (STATEMENT_CONTEXTS.indexOf(group.statement.template) === -1) {
					return;
				}
				group.nodes.forEach(function (node) {
					if (isDecision(node) || (!!node.astNode &&
						(node.astNode.type === 'ReturnStatement' || node.astNode.type === 'ThrowStatement'))) {
						return;
					}
					(usedNames(node).length > 0 || definedNames(node).length > 0 || hasCall(node.astNode))
						.should.eql(true, 'empty split node L' + node.line + ':' + node.branchPath);
				});
			});
		});
	});
});
