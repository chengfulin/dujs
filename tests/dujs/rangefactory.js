/*
 * Test cases for RangeFactory module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-04
 */
var factoryRange = require('../../lib/dujs/rangefactory'),
    should = require('should');

describe('RangeFactory', function () {
    "use strict";
    describe('Factory Methods', function () {
        describe('create', function () {
            it('should create normal Range well', function () {
                var range;
                should(function () {
                    range = factoryRange.create(0, 1);
                }).not.throw();
                range._testonly_._start.should.eql(0);
                range._testonly_._end.should.eql(1);
            });

            it('should support to create global range', function () {
                var globalRange;
                should(function () {
                    globalRange = factoryRange.create(0, 0);
                }).not.throw();
                globalRange._testonly_._start.should.eql(0);
                globalRange._testonly_._end.should.eql(0);
            });
        });

        describe('createGlobalRange', function () {
            it('should create global range well', function () {
                var globalRange = factoryRange.createGlobalRange();
                globalRange._testonly_._start.should.eql(0);
                globalRange._testonly_._end.should.eql(0);
            });
        });
    });
});