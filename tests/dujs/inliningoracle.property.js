/*
 * Inlining oracle of the summaries (feature 005, FR-002, research R12):
 * property-based test with fast-check.
 *
 * A small program is generated with global variables only (a, b, c), no
 * recursion (fi calls only fj with j > i) and no try: the page and a few
 * functions made of assignments (a = 3;), copies (b = a;, a read and a
 * definition), if statements on a variable (p-uses), call statements and
 * returns. Every call statement is then expanded with the body of its callee
 * (a return becomes a break of a labeled block around the body), giving one
 * program without calls. The pairs of the inter-procedural model of the page
 * of the original program must equal the pairs of the intra-procedural model
 * of the page of the expanded program: a summary applied at a call gives the
 * same pairs as the callee inlined at the call, so no pair crosses from one
 * call of a callee to another call of it (context-sensitivity).
 *
 * Each statement of the original program is on its own line, so its line is
 * its unique mark; every line of the expanded program records the line of
 * the original statement it copies, and the pairs of the expanded program
 * are compared after their lines are mapped back.
 *
 * The generated programs keep the targets of the p-uses comparable: a call or
 * a return is never the first statement of a block nor the statement after an
 * if (the branch target would be the call node in the original and the first
 * statement of the callee body in the expanded program; the return node in
 * the original and, since a break has no node, the statement after the
 * labeled block in the expanded program), and a function body
 * ends with an assignment (an if at the end of a callee would branch to its
 * exit). A return is only the last statement of a branch of an if in a
 * function.
 *
 * FC_NUM_RUNS overrides the number of runs (default 100); FC_SEED overrides
 * the fixed default seed. A failure prints the seed and the counterexample.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
require('should');
var fc = require('fast-check'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl');

var NUM_RUNS = parseInt(process.env.FC_NUM_RUNS, 10) || 100,
	SEED = parseInt(process.env.FC_SEED, 10);
if (isNaN(SEED)) { /// unset or not a number: the fixed default seed
	SEED = 20261117;
}

var VARIABLES = ['a', 'b', 'c'],
	HEADER = 'var a = 0, b = 0, c = 0;',
	MAX_FUNCTIONS = 3,
	MAX_DEPTH = 2;

/* ---------------------------------------------------------------------------
 * Generators: statements are {k: 'assign', target, value} | {k: 'copy',
 * target, source} | {k: 'call', callee} | {k: 'if', test, then, otherwise} |
 * {k: 'return'}
 * ------------------------------------------------------------------------ */

var variableArb = fc.constantFrom.apply(fc, VARIABLES);

var assignArb = fc.record({target: variableArb, value: fc.integer({min: 1, max: 9})}).map(function (r) {
	'use strict';
	return {k: 'assign', target: r.target, value: r.value};
});

var copyArb = fc.record({target: variableArb, source: variableArb}).map(function (r) {
	'use strict';
	return {k: 'copy', target: r.target, source: r.source};
});

/**
 * Statements of a block
 * @param {number} depth if statements nested at most this deep
 * @param {Array} callees indexes of the functions the block may call
 * @param {boolean} inFunction whether a branch may end with a return
 * @returns {Arbitrary} Array of statements
 */
function blockArb(depth, callees, inFunction) {
	'use strict';
	var options = [assignArb, copyArb];
	if (callees.length > 0) {
		options.push(fc.constantFrom.apply(fc, callees).map(function (callee) {
			return {k: 'call', callee: callee};
		}));
	}
	if (depth > 0) {
		options.push(fc.record({
			test: variableArb,
			then: blockArb(depth - 1, callees, inFunction),
			thenReturns: inFunction ? fc.boolean() : fc.constant(false),
			otherwise: fc.option(blockArb(depth - 1, callees, inFunction), {nil: null}),
			otherwiseReturns: inFunction ? fc.boolean() : fc.constant(false)
		}).map(function (r) {
			var otherwise = r.otherwise;
			return {
				k: 'if',
				test: r.test,
				then: r.thenReturns ? r.then.concat([{k: 'return'}]) : r.then,
				otherwise: !!otherwise && r.otherwiseReturns ? otherwise.concat([{k: 'return'}]) : otherwise
			};
		}));
	}
	return fc.array(fc.oneof.apply(fc, options), {minLength: 1, maxLength: 3});
}

/**
 * Indexes from first to MAX_FUNCTIONS - 1
 * @param {number} first
 * @param {number} count number of functions
 * @returns {Array}
 */
function indexesFrom(first, count) {
	'use strict';
	var indexes = [];
	for (var i = first; i < count; ++i) {
		indexes.push(i);
	}
	return indexes;
}

/// {functions: [body], page: body}: function i calls only the functions after it
var programArb = fc.integer({min: 1, max: MAX_FUNCTIONS}).chain(function (count) {
	'use strict';
	var bodies = indexesFrom(0, count).map(function (index) {
		return blockArb(MAX_DEPTH, indexesFrom(index + 1, count), true);
	});
	return fc.record({
		functions: fc.tuple.apply(fc, bodies),
		page: blockArb(MAX_DEPTH, indexesFrom(0, count), false)
	});
});

/* ---------------------------------------------------------------------------
 * Normalizing: a call or a return is never first in a block nor after an if; a function
 * body ends with an assignment
 * ------------------------------------------------------------------------ */

var fillerCounter = 0;

function filler() {
	'use strict';
	fillerCounter = (fillerCounter % 9) + 1;
	return {k: 'assign', target: 'c', value: fillerCounter};
}

/**
 * A copy of a block with the fillers inserted
 * @param {Array} block
 * @returns {Array}
 */
function normalized(block) {
	'use strict';
	var result = [];
	block.forEach(function (statement, index) {
		if ((statement.k === 'call' || statement.k === 'return') && (index === 0 || block[index - 1].k === 'if')) {
			result.push(filler());
		}
		if (statement.k === 'if') {
			result.push({
				k: 'if',
				test: statement.test,
				then: normalized(statement.then),
				otherwise: !!statement.otherwise ? normalized(statement.otherwise) : null
			});
		} else {
			result.push(statement);
		}
	});
	return result;
}

/**
 * Normalize a generated program
 * @param {Object} program
 * @returns {Object} {functions, page}
 */
function normalizedProgram(program) {
	'use strict';
	return {
		functions: program.functions.map(function (body) {
			var result = normalized(body);
			return result[result.length - 1].k === 'assign' ? result : result.concat([filler()]);
		}),
		page: normalized(program.page)
	};
}

/* ---------------------------------------------------------------------------
 * Rendering: lines of a program, each with the original line it copies
 * ------------------------------------------------------------------------ */

/**
 * Render the original program: one statement per line
 * @param {Object} program normalized
 * @returns {Object} {text, linesOf: Map(statement, line)}
 */
function renderOriginal(program) {
	'use strict';
	var lines = [HEADER],
		linesOf = new Map();
	function block(statements, indent) {
		statements.forEach(function (statement) {
			lines.push(indent + statementHead(statement, function (callee) {
				return 'f' + callee + '();';
			}, 'return;'));
			linesOf.set(statement, lines.length);
			if (statement.k === 'if') {
				block(statement.then, indent + '  ');
				if (!!statement.otherwise) {
					lines.push(indent + '} else {');
					block(statement.otherwise, indent + '  ');
				}
				lines.push(indent + '}');
			}
		});
	}
	program.functions.forEach(function (body, index) {
		lines.push('function f' + index + '() {');
		block(body, '  ');
		lines.push('}');
	});
	block(program.page, '');
	return {text: lines.join('\n'), linesOf: linesOf};
}

/**
 * The text of the line of a statement (an if opens its block)
 * @param {Object} statement
 * @param {function} callText (callee) -> text of a call
 * @param {string} returnText
 * @returns {string}
 */
function statementHead(statement, callText, returnText) {
	'use strict';
	switch (statement.k) {
		case 'assign':
			return statement.target + ' = ' + statement.value + ';';
		case 'copy':
			return statement.target + ' = ' + statement.source + ';';
		case 'call':
			return callText(statement.callee);
		case 'return':
			return returnText;
		default:
			return 'if (' + statement.test + ') {';
	}
}

/**
 * Render the expanded program: each call replaced by the body of its callee
 * in a labeled block, a return by a break of the label
 * @param {Object} program normalized
 * @param {Map} linesOf lines of the statements in the original program
 * @returns {Object} {text, original: Array (line of the expanded program - 1 -> original line or null)}
 */
function renderExpanded(program, linesOf) {
	'use strict';
	var lines = [HEADER],
		original = [1],
		labels = 0;
	function push(text, line) {
		lines.push(text);
		original.push(line);
	}
	function block(statements, indent, label) {
		statements.forEach(function (statement) {
			if (statement.k === 'call') {
				var inner = 'inline' + (labels++);
				push(indent + inner + ': {', null);
				block(program.functions[statement.callee], indent + '  ', inner);
				push(indent + '}', null);
				return;
			}
			push(indent + statementHead(statement, null, 'break ' + label + ';'), linesOf.get(statement));
			if (statement.k === 'if') {
				block(statement.then, indent + '  ', label);
				if (!!statement.otherwise) {
					push(indent + '} else {', null);
					block(statement.otherwise, indent + '  ', label);
				}
				push(indent + '}', null);
			}
		});
	}
	block(program.page, '', null);
	return {text: lines.join('\n'), original: original};
}

/* ---------------------------------------------------------------------------
 * Pairs
 * ------------------------------------------------------------------------ */

/**
 * Pairs of the global variables of the page model to compare: the
 * inter-procedural model of the page, or its intra-procedural model when the
 * page has no linked call
 * @param {string} code
 * @param {boolean} interProcedural
 * @returns {Array}
 */
function pagePairs(code, interProcedural) {
	'use strict';
	var result = analyze(code),
		pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree),
		inter = pageModels.interProceduralModels.filter(function (model) {
			return model.mainlyRelatedScope === result.scopeTree.root;
		})[0],
		pairs = (interProcedural && !!inter) ? analyze.pairsOfModel(inter) : result.intraProcedural();
	return pairs.filter(function (pair) {
		return VARIABLES.indexOf(pair.split(':')[0]) !== -1;
	});
}

/**
 * A pair of the expanded program with its lines mapped to the original ones
 * @param {string} pair
 * @param {Array} original
 * @returns {string}
 */
function mapBack(pair, original) {
	'use strict';
	var parts = /^([^:]+): (.*)$/.exec(pair);
	return parts[1] + ': ' + parts[2].replace(/L(\d+)/g, function (whole, line) {
		var mapped = original[Number(line) - 1];
		if (mapped === null || mapped === undefined) {
			throw new Error('line ' + line + ' of the expanded program copies no statement (' + pair + ')');
		}
		return 'L' + mapped;
	});
}

function unique(list) {
	'use strict';
	return list.filter(function (item, index) {
		return list.indexOf(item) === index;
	}).sort();
}

describe('inlining oracle of the summaries (feature 005, FR-002, research R12)', function () {
	'use strict';
	this.timeout(120000);
	after(analyze.reset);

	it('the pairs of the page with summaries equal those of the page with the callees inlined', function () {
		fc.assert(fc.property(programArb, function (generated) {
			var program = normalizedProgram(generated),
				original = renderOriginal(program),
				expanded = renderExpanded(program, original.linesOf),
				expected = unique(pagePairs(expanded.text, false).map(function (pair) {
					return mapBack(pair, expanded.original);
				})),
				actual = unique(pagePairs(original.text, true));
			if (JSON.stringify(actual) !== JSON.stringify(expected)) {
				throw new Error('pairs differ\n--- original\n' + original.text + '\n--- expanded\n' + expanded.text +
					'\n--- only with summaries: ' + JSON.stringify(actual.filter(function (pair) {
						return expected.indexOf(pair) === -1;
					})) + '\n--- only inlined: ' + JSON.stringify(expected.filter(function (pair) {
						return actual.indexOf(pair) === -1;
					})));
			}
		}), {numRuns: NUM_RUNS, seed: SEED});
	});

	/// the oracle compares something: a program with two calls of one callee, the pair across the calls
	it('compares the pairs of a fixed program with two calls of a callee', function () {
		var program = {
				functions: [[{k: 'copy', target: 'b', source: 'a'}, {k: 'assign', target: 'a', value: 2}]],
				page: [{k: 'assign', target: 'a', value: 1}, {k: 'call', callee: 0}, {k: 'assign', target: 'c', value: 3},
					{k: 'call', callee: 0}, {k: 'copy', target: 'c', source: 'a'}]
			},
			original = renderOriginal(normalizedProgram(program)),
			pairs = pagePairs(original.text, true);
		/// L1 header; f0 at L2-L5 (L3 b = a, L4 a = 2); page L6 a = 1, L7 f0(), L8 c = 3, L9 f0(), L10 c = a
		original.text.split('\n')[9].should.eql('c = a;');
		/// L3 reads a of L6 (first call) and a of L4 (second call, after the first one set a = 2)
		pairs.should.containEql('a: L6 -> L3');
		pairs.should.containEql('a: L4 -> L3');
		pairs.should.containEql('a: L4 -> L10');
		/// f0 kills a on every path: a of L6 does not pass the calls
		pairs.should.not.containEql('a: L6 -> L10');
	});
});
