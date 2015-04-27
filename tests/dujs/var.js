/**
 * Created by chengfulin on 2015/4/22.
 */
var Var = require('../../lib/dujs').Var,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('Var', function () {
    'use strict';
    describe('constructor', function () {
        it('should construct well', function () {
            var normal = new Var('ga', Scope.GLOBAL_SCOPE),
                property = new Var('prop', Scope.PROGRAM_SCOPE, new Var('obj', Scope.PROGRAM_SCOPE));
            normal.getName().should.eql('ga');
            normal.getScope().toString().should.eql('Global');
            should.not.exist(normal.getVarLivingWith());

            property.getName().should.eql('prop');
            property.getScope().toString().should.eql('Program');
            property.getVarLivingWith().getName().should.eql('obj');
            property.getVarLivingWith().getScope().toString().should.eql('Program');

            (function () {
                var invalid = new Var('!invalid', Scope.PROGRAM_SCOPE);
            }).should.throw('Invalid Var value');
            (function () {
                var invalid = new Var('valid', {});
            }).should.throw('Invalid Var value');
            (function () {
                var invalid = new Var('valid', Scope.PROGRAM_SCOPE, {});
            }).should.throw('Invalid Var value');
        });
    });

    describe('methods', function () {
        describe('validate', function () {
            it('should validate name', function () {
                (function () {
                    Var.validate('', Scope.PROGRAM_SCOPE);
                }).should.throw('Invalid Var value');
                (function () {
                    Var.validate('!invalid', Scope.PROGRAM_SCOPE);
                }).should.throw('Invalid Var value');
                (function () {
                    Var.validate('valid', Scope.PROGRAM_SCOPE);
                }).should.not.throw();
            });

            it('should validate the Var living with', function () {
                (function () {
                    Var.validate('valid', Scope.PROGRAM_SCOPE, {});
                }).should.throw('Invalid Var value');
                (function () {
                    Var.validate('valid', Scope.PROGRAM_SCOPE, null);
                }).should.not.throw();
                (function () {
                    Var.validate('valid', Scope.PROGRAM_SCOPE);
                }).should.not.throw();
            });
        });

        describe('validateType', function () {
            it('should validate Var type well', function () {
                (function () {
                    Var.validateType();
                }).should.throw('Not a Var');
                (function () {
                    Var.validateType({});
                }).should.throw('Not a Var');
                (function () {
                    Var.validateType(new Var('normal', Scope.PROGRAM_SCOPE));
                }).should.not.throw();
            });
        });

        describe('toString', function () {
            it('should convert to string correctly', function () {
                var global = new Var('global', Scope.GLOBAL_SCOPE),
                    normal = new Var('normal', Scope.PROGRAM_SCOPE),
                    prop = new Var('prop', new Scope('foo'), normal);
                global.toString().should.eql('global@Global');
                normal.toString().should.eql('normal@Program');
                prop.toString().should.eql('prop:normal@Program@Function["foo"]');
            });
        });

        describe('live', function () {
            it('should set the Var living with well', function () {
                var obj = new Var('obj', Scope.GLOBAL_SCOPE),
                    notProp = new Var('notProp', Scope.PROGRAM_SCOPE),
                    prop = new Var('prop', Scope.PROGRAM_SCOPE, obj),
                    objX = new Var('objX', Scope.PROGRAM_SCOPE);

                (function () {
                    notProp.live({});
                }).should.throw('Not a Var');

                notProp.live(obj);
                notProp.getVarLivingWith().getName().should.eql('obj');
                notProp.getVarLivingWith().getScope().toString().should.eql('Global');

                prop.getVarLivingWith().getName().should.eql('obj');
                prop.live(objX);
                prop.getVarLivingWith().getName().should.eql('objX');
                prop.getVarLivingWith().getScope().toString().should.eql('Program');
            });
        });
    });
});