/**
 * Created by chengfulin on 2015/4/27.
 */
var Range = require('../../lib/dujs').Range,
    should = require('should');

describe('Range', function () {
    'use strict';
    describe('constructor', function () {
        it('should construct well', function () {
            var tmp = new Range(0, 1),
                initRange = new Range(tmp),
                initArr = new Range([1, 3]),
                initPairs = new Range(0, 10);
            initRange._testonly_._start.should.eql(0);
            initRange._testonly_._end.should.eql(1);
            initArr._testonly_._start.should.eql(1);
            initArr._testonly_._end.should.eql(3);
            initPairs._testonly_._start.should.eql(0);
            initPairs._testonly_._end.should.eql(10);

            (function () {
                var invalid = new Range();
            }).should.throw('Invalid Range value');
            (function () {
                var invalid = new Range([1]);
            }).should.throw('Invalid Range value');
            (function () {
                var invalid = new Range(1, 0);
            }).should.throw('Invalid Range value');
        });
    });

    describe('methods', function () {
        describe('validate', function () {
            it('should validate pairs of values', function () {
                (function () {
                    Range.validate(-1, 0);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate(1, 1);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate(1, 0);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate('0', '1');
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate(0, 1);
                }).should.not.throw();

                (function () {
                    Range.validate(0, 0);
                }).should.not.throw();
            });

            it('should validate array of numbers', function () {
                (function () {
                    Range.validate([0]);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate([-1, 0]);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate([1, 1]);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate([1, 0]);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate(['0', '1']);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate([0, 1]);
                }).should.not.throw();
                (function () {
                    Range.validate([0, 0]);
                }).should.not.throw();
            });

            it('should validate Range object', function () {
                (function () {
                    Range.validate();
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate({});
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate(new Range(0, 1));
                }).should.not.throw();
            });
        });

        describe('validateType', function () {
            it('should validate Range type', function () {
                (function () {
                    Range.validateType();
                }).should.throw('Not a Range');
                (function () {
                    Range.validateType({});
                }).should.throw('Not a Range');
                (function () {
                    Range.validateType(new Range(0, 1));
                }).should.not.throw();
            });
        });

        describe('toArray', function () {
            it('should convert to array well', function () {
                var aRange = new Range(0, 1),
                    another = new Range(1, 10);
                aRange.toArray().should.eql([0, 1]);
                another.toArray().should.eql([1, 10]);
            });
        });

        describe('toString', function () {
            it('should convert to string well', function () {
                var aRange = new Range(0, 1),
                    another = new Range(1, 10);
                aRange.toString().should.eql('[0,1]');
                another.toString().should.eql('[1,10]');
            });
        });

        describe('equals', function () {
            it('should return true as the values of two Ranges are the same', function () {
                var range1 = new Range(0,1),
                    range2 = new Range(0,1);
                Range.equals(range1, range2).should.eql(true);
            });

            it('should return true as comparing to itself', function () {
                var range = new Range(1,2);
                Range.equals(range, range).should.eql(true);
            });

            it('should return false as two different range values', function () {
                var range1 = new Range(0, 1),
                    range2 = new Range(1, 2);
                Range.equals(range1, range2).should.eql(false);
            });

            it('should return false as comparing non-Range object', function () {
                var range = new Range(0,1),
                    nonRange = {};
                Range.equals(range, nonRange).should.eql(false);
            });
        });
    });
});