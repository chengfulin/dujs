/**
 * Created by chengfulin on 2015/4/16.
 */
var DUPair = require('../../lib/dujs').DUPair,
    Pair = require('../../lib/dujs').Pair,
    should = require('should');

describe('DUPair', function () {
    'use strict';
    describe('constructor', function () {
        it('should be constructed with two numbers well', function () {
            (function () {
                var pair = new DUPair(1,2);
            }).should.not.throw();
            var pair = new DUPair(1,2);
            pair.def.should.eql(1);
            pair.use.should.eql(2);
        });

        it('should be constructed with two string well', function () {
            (function () {
                var pair = new DUPair('a', 'b');
            }).should.not.throw();
            var pair = new DUPair('a', 'b');
            pair.def.should.eql('a');
            pair.use.should.eql('b');
        });

        it('should be constructed with number and a Pair well', function () {
            (function () {
                var pair = new DUPair(0, new Pair(1,2));
            }).should.not.throw();
            var pair = new DUPair(0, new Pair(1,2));
            pair.def.should.eql(0);
            pair.use.first.should.eql(1);
            pair.use.second.should.eql(2);
        });
    });

    describe('validate', function () {
        it('should validate the value correctly', function () {
            (function () {
                DUPair.validate(1, 'a');
            }).should.throw('Invalid DUPair');

            (function () {
                DUPair.validate('a', 1);
            }).should.throw('Invalid DUPair');

            (function () {
                DUPair.validate(new Pair(0,1), new Pair(1,2));
            }).should.throw('Invalid DUPair');

            (function () {
                DUPair.validate({}, new Pair(1,2));
            }).should.throw('Invalid DUPair');

            (function () {
                DUPair.validate(0, {});
            }).should.throw('Invalid DUPair');
        });
    });

    describe('toString', function () {
        it('should convert c-use to string correctly', function () {
            var cUseNumber = new DUPair(0,1),
                cUseString = new DUPair('a','b');
            cUseNumber.toString().should.eql('(0,1)');
            cUseString.toString().should.eql('(a,b)');
        });

        it('should convert p-use to string correctly', function () {
            var pUseNumber = new DUPair(0,new Pair(1,2)),
                pUseString = new DUPair('a', new Pair('b','c'));
            pUseNumber.toString().should.eql('(0,(1,2))');
            pUseString.toString().should.eql('(a,(b,c))');
        });
    });
});