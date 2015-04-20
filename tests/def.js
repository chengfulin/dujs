/**
 * Created by chengfulin on 2015/4/16.
 */
var Def = require('../lib/dujs').Def,
    should = require('should');

describe('Def class', function () {
    it('should create well with valid data', function () {
        var def = new Def(1, [2, 5], 'Program');
        def.from.should.eql(1);
        def.range.should.eql([2, 5]);
        def.scope.should.eql('Program');
    });

    it('should handle missing parameters', function () {
        var missingScope = new Def(2, [1, 6]);
        should.not.exist(missingScope.scope);

        var missingRange = new Def(3);
        should.not.exist(missingRange.range);
        should.not.exist(missingRange.scope);

        var emptyDef = new Def();
        should.not.exist(emptyDef.from);
        should.not.exist(emptyDef.range);
        should.not.exist(emptyDef.scope);
    });

    it('should convert ot string correctly', function () {
        var def = new Def(1, [2, 5], 'Program');
        def.toString().should.eql('Def @n1 @[2,5]_Program');
        var defInFun = new Def(2, [5, 9], 'fun');
        defInFun.toString().should.eql('Def @n2 @[5,9]_function["fun"]');
        var defInAnonymous = new Def(3, [11, 16], 1);
        defInAnonymous.toString().should.eql('Def @n3 @[11,16]_anonymousFunction[1]');
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