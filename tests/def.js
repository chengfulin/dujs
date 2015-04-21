/**
 * Created by chengfulin on 2015/4/16.
 */
var Def = require('../lib/dujs').Def,
    Scope = require('../lib/dujs').Scope,
    should = require('should');

describe('Def class', function () {
    it('should create well with valid data', function () {
        var def = new Def(1, [2, 5], 'Program');
        def.from.should.eql(1);
        def.range.should.eql([2, 5]);
        def.scope.should.eql(new Scope('Program'));
    });

    it('should handle invalid parameters', function () {
        (function () {
            new Def(2, [1, 6]);
        }).should.throw('Invalid Scope');

        (function () {
            new Def(2, [1, 6], 'Global');
        }).should.throw('Def in "Global" scope not from n0');

        (function () {
            new Def(2, [0, 0], 'Program');
        }).should.throw('Invalid range of Def');

        (function () {
            new Def(2, [1, 0], 'Program');
        }).should.throw('Invalid range of Def');

        (function () {
            new Def(2, [0], 'Program');
        }).should.throw('Invalid range of Def');

        (function () {
            new Def(2, ['0', '1'], 'Program');
        }).should.throw('Invalid range of Def');

        (function () {
            new Def(2, {"0": 0, "1": 1}, 'Program');
        }).should.throw('Invalid range of Def');

        (function () {
            new Def(2, null, 'Program');
        }).should.throw('Invalid range of Def');

        (function () {
            new Def(-1, [0,1], 'Program');
        }).should.throw('Def should from the node with valid index');
    });

    it('should convert ot string correctly', function () {
        var defInGlobal = new Def(0, [0, 1], 'Global');
        defInGlobal.toString().should.eql('Def @n0 @[0,1]_Global');
        var def = new Def(1, [2, 5], 'Program');
        def.toString().should.eql('Def @n1 @[2,5]_Program');
        var defInFun = new Def(2, [5, 9], 'fun');
        defInFun.toString().should.eql('Def @n2 @[5,9]_Function["fun"]');
        var defInAnonymous = new Def(3, [11, 16], 1);
        defInAnonymous.toString().should.eql('Def @n3 @[11,16]_FunctionExpression[1]');
    });

    it('should check range property properly', function () {
        var nonArr = {},
            singleArr = [1],
            nanArr = ['1', '3'],
            negativeArr = [-1, 2],
            reverseArr = [2, 0],
            sameArr = [1, 1],
            validArr = [0, 10];
        should(Def.isRange(nonArr)).be.false;
        should(Def.isRange(singleArr)).be.false;
        should(Def.isRange(nanArr)).be.false;
        should(Def.isRange(negativeArr)).be.false;
        should(Def.isRange(reverseArr)).be.false;
        should(Def.isRange(sameArr)).be.false;
        should(Def.isRange(validArr)).be.true;
    });
});