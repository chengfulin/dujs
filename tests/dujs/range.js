/**
 * Created by chengfulin on 2015/4/27.
 */
var Range = require('../../lib/dujs').Range,
    should = require('should');

describe('Range', function () {
    describe('constructor', function () {
        it('should construct well', function () {
            var tmp = new Range(0, 1),
                initRange = new Range(tmp),
                initArr = new Range([1, 3]),
                initPairs = new Range(0, 10);
            initRange.getStart().should.eql(0);
            initRange.getEnd().should.eql(1);
            initArr.getStart().should.eql(1);
            initArr.getEnd().should.eql(3);
            initPairs.getStart().should.eql(0);
            initPairs.getEnd().should.eql(10);

            (function () {
                new Range();
            }).should.throw('Invalid Range value');
            (function () {
                new Range([1]);
            }).should.throw('Invalid Range value');
            (function () {
                new Range(1, 0);
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
                    Range.validate(0, 0);
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
            });

            it('should validate array of numbers', function () {
                (function () {
                    Range.validate([0]);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate([-1, 0]);
                }).should.throw('Invalid Range value');
                (function () {
                    Range.validate([0, 0]);
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
    });
});