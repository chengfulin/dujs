/**
 * Created by ChengFuLin on 2015/5/11.
 */
var VarDef = require('../../lib/dujs').VarDef,
    Var = require('../../lib/dujs').Var,
    Def = require('../../lib/dujs').Def,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('VarDef', function () {
    'use strict';
    describe('constructor', function () {
        it('should construct with Var and Def well', function () {
            (function () {
                var varDef = new VarDef(
                    new Var('a', [0,1], Scope.PROGRAM_SCOPE),
                    new Def(0, Def.LITERAL_TYPE, [1,2], Scope.PROGRAM_SCOPE)
                );
            }).should.not.throw();

            var varDef = new VarDef(
                new Var('a', [0,1], Scope.PROGRAM_SCOPE),
                new Def(0, Def.LITERAL_TYPE, [1,2], Scope.PROGRAM_SCOPE)
            );
            varDef.variable.toString().should.eql('a@[0,1]_Program');
            varDef.definition.toString().should.eql('Def@n0@[1,2]_Program');
        });
    });

    describe('methods', function () {
        describe('validate', function () {
            it('should throw when with invalid parameters', function () {
                (function () {
                    VarDef.validate(
                        {},
                        new Def(0, Def.LITERAL_TYPE, [1,2], Scope.PROGRAM_SCOPE)
                    );
                }).should.throw('Invalid VarDef');
                (function () {
                    VarDef.validate(
                        new Var('a', [0,1], Scope.PROGRAM_SCOPE),
                        {}
                    );
                }).should.throw('Invalid VarDef');
            });
        });

        describe('toString', function () {
            it('should convert to string well', function () {
                var varDef = new VarDef(
                    new Var('a', [0,1], Scope.PROGRAM_SCOPE),
                    new Def(0, Def.LITERAL_TYPE, [1,2], Scope.PROGRAM_SCOPE)
                );
                varDef.toString().should.eql('(a@[0,1]_Program,Def@n0@[1,2]_Program)');
            });
        });
    });
});