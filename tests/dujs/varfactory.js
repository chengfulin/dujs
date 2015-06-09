/**
 * Created by ChengFuLin on 2015/5/13.
 */
var Range = require('../../lib/dujs').Range,
    Scope = require('../../lib/dujs').Scope,
    varFactory = require('../../lib/dujs').factoryVar,
    should = require('should');

describe('VarFactory', function () {
    'use strict';
    describe('create', function () {
        it('should create normal Var well', function () {
            var normal = varFactory.create('normal', new Range(0,1), Scope.PROGRAM_SCOPE);
            normal.toString().should.eql('normal@[0,1]_Program');
        });
    });

    describe('createReturnVar', function () {
        it('should create return Var well', function () {
            var returned = varFactory.createReturnVar(new Range(0,1), Scope.PROGRAM_SCOPE);
            returned.toString().should.eql('!RETURN@[0,1]_Program');
        });
    });

    describe('createGlobalVar', function () {
        it('should create global Var well', function () {
            var global = varFactory.createGlobalVar('global'),
                another = varFactory.createGlobalVar('another');
            global.toString().should.eql('global@[0,0]_Global');
            another.toString().should.eql('another@[0,0]_Global');
        });
    });
});