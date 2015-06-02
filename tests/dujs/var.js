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
            var normal = new Var('ga', [0, 1], Scope.GLOBAL_SCOPE),
                property = new Var('prop', [10, 12], Scope.PROGRAM_SCOPE, new Var('obj', [4, 5],  Scope.PROGRAM_SCOPE));
            normal._testonly_._name.should.eql('ga');
            normal._testonly_._range._testonly_._start.should.eql(0);
            normal._testonly_._range._testonly_._end.should.eql(1);
            normal._testonly_._scope._testonly_._type.should.eql('Global');
            should.not.exist(normal._testonly_._liveWith);

            property._testonly_._name.should.eql('prop');
            property._testonly_._range._testonly_._start.should.eql(10);
            property._testonly_._range._testonly_._end.should.eql(12);
            property._testonly_._scope._testonly_._type.should.eql('Program');
            property._testonly_._liveWith._testonly_._name.should.eql('obj');
            property._testonly_._liveWith._testonly_._scope._testonly_._type.should.eql('Program');

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
                    Var.validate('', [0, 1], Scope.PROGRAM_SCOPE);
                }).should.throw('Invalid Var value');
                (function () {
                    Var.validate('!invalid', [0, 1], Scope.PROGRAM_SCOPE);
                }).should.throw('Invalid Var value');
                (function () {
                    Var.validate('valid', [0, 1], Scope.PROGRAM_SCOPE);
                }).should.not.throw();
            });

            it('should validate the Var living with', function () {
                (function () {
                    Var.validate('valid', [0, 1], Scope.PROGRAM_SCOPE, {});
                }).should.throw('Invalid Var value');
                (function () {
                    Var.validate('valid', [0, 1], Scope.PROGRAM_SCOPE, null);
                }).should.not.throw();
                (function () {
                    Var.validate('valid', [0, 1], Scope.PROGRAM_SCOPE);
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
                    Var.validateType(new Var('normal', [1,2], Scope.PROGRAM_SCOPE));
                }).should.not.throw();
            });
        });

        describe('toString', function () {
            it('should convert to string correctly', function () {
                var global = new Var('global', [0, 1], Scope.GLOBAL_SCOPE),
                    normal = new Var('normal', [1, 3], Scope.PROGRAM_SCOPE),
                    prop = new Var('prop', [5, 10], new Scope('foo'), normal);
                global.toString().should.eql('global@[0,1]_Global');
                normal.toString().should.eql('normal@[1,3]_Program');
                prop.toString().should.eql('prop@[5,10]_Function["foo"]:normal@[1,3]_Program');
            });
        });

        describe('live', function () {
            it('should set the Var living with well', function () {
                var obj = new Var('obj', [0, 1], Scope.GLOBAL_SCOPE),
                    notProp = new Var('notProp', [1, 3], Scope.PROGRAM_SCOPE),
                    prop = new Var('prop', [99, 110], Scope.PROGRAM_SCOPE, obj),
                    objX = new Var('objX', [5, 11], Scope.PROGRAM_SCOPE);

                (function () {
                    notProp.live({});
                }).should.throw('Not a Var');

                notProp.live(obj);
                notProp._testonly_._liveWith._testonly_._name.should.eql('obj');
                notProp._testonly_._liveWith._testonly_._range._testonly_._start.should.eql(0);
                notProp._testonly_._liveWith._testonly_._range._testonly_._end.should.eql(1);
                notProp._testonly_._liveWith._testonly_._scope._testonly_._type.should.eql('Global');

                prop._testonly_._liveWith._testonly_._name.should.eql('obj');
                prop.live(objX);
                prop._testonly_._liveWith._testonly_._name.should.eql('objX');
                prop._testonly_._liveWith._testonly_._range._testonly_._start.should.eql(5);
                prop._testonly_._liveWith._testonly_._range._testonly_._end.should.eql(11);
                prop._testonly_._liveWith._testonly_._scope._testonly_._type.should.eql('Program');
            });
        });
    });
});