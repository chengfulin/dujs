/**
 * Created by ChengFuLin on 2015/5/26.
 */
var Path = require('../../lib/dujs').Path,
    should = require('should');

describe('Path', function () {
    "use strict";
    describe('validateSequenceValue', function () {
        it('should not throw as the sequence contains at least two elements with the same type', function () {
            should(function () {
                Path.validateSequenceValue([1,2]);
                Path.validateSequenceValue(['1','2']);
                Path.validateSequenceValue([{id: '1'},{id: '2'}]);
            }).not.throw();
        });

        it('should throw as the sequence is empty', function () {
            should(function () {
                Path.validateSequenceValue([]);
            }).throw('Invalid value for the sequence of the path');

            should(function () {
                Path.validateSequenceValue();
            }).throw('Invalid value for the sequence of the path');
        });

        it('should throw as the sequence contains only one element', function () {
            should(function () {
                Path.validateSequenceValue([1]);
            }).throw('Invalid value for the sequence of the path');
        });

        it('should throw as the sequence contains different type of elements', function () {
            should(function () {
                Path.validateSequenceValue([1, '2']);
            }).throw('Invalid value for the sequence of the path');
        });

        it('should support the custom error message', function () {
            should(function () {
                Path.validateSequenceValue([], 'Custom Error');
            }).throw('Custom Error');
        });
    });

    describe('constructor', function () {
        it('should construct with default value', function () {
            var path = new Path();
            path._testonly_._nodeSequences.length.should.eql(0);
        });

        it('should construct with sequence well', function () {
            var path = new Path([1,2,3]);
            path._testonly_._nodeSequences.length.should.eql(3);
            path._testonly_._nodeSequences[0].should.eql(1);
            path._testonly_._nodeSequences[1].should.eql(2);
            path._testonly_._nodeSequences[2].should.eql(3);
        });
    });

    describe('setSequence', function () {
        it('should set valid sequence correctly', function () {
            var path = new Path();
            path.setSequence([1,2]);
            path._testonly_._nodeSequences.length.should.eql(2);
            path._testonly_._nodeSequences[0].should.eql(1);
            path._testonly_._nodeSequences[1].should.eql(2);
        });

        it('should ignore invalid sequence', function () {
            var path = new Path();
            path.setSequence([1]);
            path._testonly_._nodeSequences.length.should.eql(0);
        });
    });

    describe('addNodePassedThrough', function () {
        it('should add a node passed through to empty path sequence', function () {
            var path = new Path();
            path.addNodePassedThrough(1);
            path._testonly_._nodeSequences.length.should.eql(1);
            path._testonly_._nodeSequences[0].should.eql(1);
        });

        it('should add a node passed through to non-empty path sequence', function () {
            var path = new Path([1,2]);
            path.addNodePassedThrough(3);
            path._testonly_._nodeSequences.length.should.eql(3);
            path._testonly_._nodeSequences[0].should.eql(1);
            path._testonly_._nodeSequences[1].should.eql(2);
            path._testonly_._nodeSequences[2].should.eql(3);
        });
    });

    describe('isInPath', function () {
        it('should check the node is in the path well', function () {
            var path = new Path();
            path.isInPath(1).should.eql(false);
            path._testonly_._nodeSequences.push(1);
            path.isInPath(1).should.eql(true);
        });
    });

    describe('isPath', function () {
        it('should check a object is Path well', function () {
            Path.isPath({}).should.eql(false);
            Path.isPath(new Path()).should.eql(true);
        });
    });
});