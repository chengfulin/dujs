/**
 * Created by chengfulin on 2015/4/22.
 */
var Var = require('../lib/dujs').Var,
    should = require('should');

describe('Var model', function () {
    it('should checking param name well', function () {
        Var.isValidName('name').should.be.true;
        Var.isValidName(0).should.be.false;
        Var.isValidName({}).should.be.false;
    });

    it('should validate well', function () {
        (function () {
            Var.validate(0)
        }).should.throw('Variable name should be string');
        (function () {
            Var.validate({})
        }).should.throw('Variable name should be string');
    });

    it('should created well', function () {
        var var1 = new Var('var1', 'fun'),
            var2 = new Var('var2', 'Program'),
            var3 = new Var('var3', 'Global'),
            var4 = new Var('var4', 0);
        var1.name.should.eql('var1');
        var1.scope.toString().should.eql('Function["fun"]');
        var2.name.should.eql('var2');
        var2.scope.toString().should.eql('Program');
        var3.name.should.eql('var3');
        var3.scope.toString().should.eql('Global');
        var4.name.should.eql('var4');
        var4.scope.toString().should.eql('FunctionExpression[0]');
    });
});