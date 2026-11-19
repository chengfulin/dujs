/*
 * Test cases of the branch label format (lib/esgraph/branchlabel.js,
 * specs/002-small-refactors, US2). The expected strings follow the format of
 * the branch path suffix of lib/dujs/cfggraphconverter.js and the labels of
 * tests/helpers/analyze.js before the refactoring. Plain objects are used as
 * nodes; FlowNode is not needed.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var branchLabel = require('../../lib/esgraph/branchlabel');
require('should');

describe('branchlabel', function () {
	'use strict';

	it('should name the true and false branches', function () {
		branchLabel.TRUE_BRANCH.should.eql('T');
		branchLabel.FALSE_BRANCH.should.eql('F');
	});

	describe('pathSuffix', function () {
		it('should be empty for an empty path', function () {
			branchLabel.pathSuffix('').should.eql('');
		});

		it('should prefix a non-empty path with a colon', function () {
			branchLabel.pathSuffix('TF').should.eql(':TF');
		});
	});

	describe('lineLabel', function () {
		it('should be L<line> for an empty path', function () {
			branchLabel.lineLabel(3, '').should.eql('L3');
		});

		it('should be L<line>:<path> for a non-empty path', function () {
			branchLabel.lineLabel(3, 'T').should.eql('L3:T');
		});
	});

	describe('extendPath', function () {
		it('should append a branch to a path', function () {
			branchLabel.extendPath('T', branchLabel.FALSE_BRANCH).should.eql('TF');
			branchLabel.extendPath('', branchLabel.TRUE_BRANCH).should.eql('T');
		});
	});

	describe('branchMark', function () {
		it('should be a colon followed by the branch', function () {
			branchLabel.branchMark(branchLabel.TRUE_BRANCH).should.eql(':T');
			branchLabel.branchMark(branchLabel.FALSE_BRANCH).should.eql(':F');
		});
	});

	describe('pathOf', function () {
		it('should be the label path of a node', function () {
			branchLabel.pathOf({labelPath: 'T'}).should.eql('T');
			branchLabel.pathOf({labelPath: ''}).should.eql('');
			branchLabel.pathOf({split: {path: 'F'}, labelPath: 'F'}).should.eql('F');
		});

		it('should only read the label path, not the split', function () {
			branchLabel.pathOf({split: {path: 'F'}, labelPath: 'T'}).should.eql('T');
		});
	});
});
