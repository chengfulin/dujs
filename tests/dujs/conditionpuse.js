/*
 * Test cases of the reads of a decision condition (specs/004-fix-remaining-issues,
 * FR-001, User Story 1, research R1, KI §20).
 * Original dujs code, MIT License (see LICENSE).
 *
 * Every variable read by the condition of a decision node is a p-use whatever
 * the shape of the expression; only the reads in the arguments of a call (or
 * of new) are c-uses. The expected pairs are those of contracts/acceptance.md
 * "US1" (intra-procedural pairs of the page).
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze');

var PROBES = path.join(__dirname, 'cases', 'probes004');

/**
 * Intra-procedural pairs of the page of a probe program
 * @param {string} name File name without extension
 * @returns {Array}
 */
function pagePairsOf(name) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES, name + '.js'), 'utf8')).intraProcedural();
}

describe('Reads of a decision condition (FR-001)', function () {
	'use strict';

	after(analyze.reset);

	/// US1 #1: the right operand of a nested binary expression is a p-use
	it('should make every read of if (a + b >= c) a p-use', function () {
		pagePairsOf('us1-1').should.eql([
			'a: L1 -> L2>L3:T', 'a: L1 -> L2>exit:F',
			'b: L1 -> L2>L3:T', 'b: L1 -> L2>exit:F',
			'c: L1 -> L2>L3:T', 'c: L1 -> L2>exit:F'
		]);
	});

	/// US1 #2: a unary operand does not end the p-use walk
	it('should make every read of if (-a < c) a p-use', function () {
		pagePairsOf('us1-2').should.eql([
			'a: L1 -> L2>L3:T', 'a: L1 -> L2>exit:F',
			'c: L1 -> L2>L3:T', 'c: L1 -> L2>exit:F'
		]);
	});

	/// US1 #3: the call f(a) is split before the decision; c is still a p-use
	it('should make c of while (f(a) < c) a p-use', function () {
		pagePairsOf('us1-3').should.eql([
			'a: L1 -> L5',
			'c: L1 -> L5>L6:T', 'c: L1 -> L5>exit:F',
			'c: L6 -> L5>L6:T', 'c: L6 -> L5>exit:F',
			'f: entry -> L5>L6:T', 'f: entry -> L5>exit:F'
		]);
	});

	/// US1 #4: a condition that is not of a decision node is read as before
	it('should keep the c-uses of x = a + b >= c', function () {
		pagePairsOf('us1-4').should.eql(['a: L1 -> L2', 'b: L1 -> L2', 'c: L1 -> L2']);
	});

	/// US1 #5: member, computed member, assignment, update and template literal conditions
	it('should make the reads of o.p, o[a], x = a, a++ and template conditions p-uses', function () {
		pagePairsOf('us1-5a').should.eql([
			'a: L1 -> L11>L12:T', 'a: L1 -> L11>L14:F',
			'a: L1 -> L5>L6:T', 'a: L1 -> L5>L8:F',
			'a: L1 -> L8>L11:F', 'a: L1 -> L8>L9:T',
			'a: L11 -> L14>L15:T', 'a: L11 -> L14>exit:F',
			'o: L1 -> L2>L3:T', 'o: L1 -> L2>L5:F',
			'o: L1 -> L5>L6:T', 'o: L1 -> L5>L8:F'
		]);
	});

	/// US1 #6: the arguments of a call or new are c-uses, the callee is a p-use
	it('should make the arguments of f(a + 1) and new F(a) c-uses', function () {
		pagePairsOf('us1-6').should.eql([
			'F: entry -> L9>L10:T', 'F: entry -> L9>exit:F',
			'a: L1 -> L6', 'a: L1 -> L9',
			'f: entry -> L6>L7:T', 'f: entry -> L6>L9:F'
		]);
	});
});
