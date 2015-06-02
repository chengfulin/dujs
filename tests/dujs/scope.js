/**
 * Created by chengfulin on 2015/4/24.
 */
var Scope = require('../../lib/dujs/index').Scope,
    should = require('should');

describe('Scope', function () {
    'use strict';
    describe('constructor', function () {
        it('should construct well', function () {
            (function () {
                var invalid = new Scope('!invalid');
            }).should.throw('Invalid Scope value');
            var global = new Scope('!GLOBAL'),
                program = new Scope('!PROGRAM'),
                normalFun = new Scope('fun'),
                anonymousFun = new Scope(0),
                anotherScope = new Scope(new Scope('foo'));
            global._testonly_._value.should.eql('!GLOBAL');
            global._testonly_._type.should.eql('Global');
            program._testonly_._value.should.eql('!PROGRAM');
            program._testonly_._type.should.eql('Program');
            normalFun._testonly_._value.should.eql('fun');
            normalFun._testonly_._type.should.eql('Function');
            anonymousFun._testonly_._value.should.eql(0);
            anonymousFun._testonly_._type.should.eql('AnonymousFunction');
            anotherScope._testonly_._value.should.eql('foo');
            anotherScope._testonly_._type.should.eql('Function');
        });
    });
    describe('static members', function () {
        it('should have correct global constants', function () {
            Scope.GLOBAL_TYPE.should.eql('Global');
            Scope.PROGRAM_TYPE.should.eql('Program');
            Scope.FUNCTION_TYPE.should.eql('Function');
            Scope.ANONYMOUS_FUN_TYPE.should.eql('AnonymousFunction');
        });

        it('should have global Scope objects', function () {
            should(Scope.GLOBAL_SCOPE instanceof Scope).equal(true);
            should(Scope.PROGRAM_SCOPE instanceof Scope).equal(true);
            Scope.GLOBAL_SCOPE.value.should.eql('!GLOBAL');
            Scope.GLOBAL_SCOPE.type.should.eql('Global');
            Scope.PROGRAM_SCOPE.value.should.eql('!PROGRAM');
            Scope.PROGRAM_SCOPE.type.should.eql('Program');
        });

        var tmpScope,
            globalScopeValue,
            programScopeValue,
            functionScopeValue,
            anonymousFunScopeValue,
            negativeNumber,
            invalidIdentifier;
        beforeEach(function () {
            tmpScope = new Scope('tmp');
            globalScopeValue = '!GLOBAL';
            programScopeValue = '!PROGRAM';
            functionScopeValue = 'fun';
            anonymousFunScopeValue = 0;
            negativeNumber = -1;
            invalidIdentifier = '!invalid';
        });

        describe('getType', function () {
            it('should support for getting the type of Scope with its value', function () {
                Scope.getType(tmpScope).should.eql('Function');
                Scope.getType(globalScopeValue).should.eql('Global');
                Scope.getType(programScopeValue).should.eql('Program');
                Scope.getType(functionScopeValue).should.eql('Function');
                Scope.getType(anonymousFunScopeValue).should.eql('AnonymousFunction');
                should.not.exist(Scope.getType(negativeNumber));
                should.not.exist(Scope.getType(invalidIdentifier));
            });
        });

        describe('isValidValue', function () {
            it('should support for checking valid scope value', function () {
                Scope.isValidValue(tmpScope).should.equal(true);
                Scope.isValidValue(globalScopeValue).should.equal(true);
                Scope.isValidValue(programScopeValue).should.equal(true);
                Scope.isValidValue(functionScopeValue).should.equal(true);
                Scope.isValidValue(anonymousFunScopeValue).should.equal(true);
                Scope.isValidValue(negativeNumber).should.equal(false);
                Scope.isValidValue(invalidIdentifier).should.equal(false);
            });
        });

        describe('validate', function () {
            it('should support for validating scope value', function () {
                (function () {
                    Scope.validate(globalScopeValue);
                }).should.not.throw();
                (function () {
                    Scope.validate(negativeNumber);
                }).should.throw('Invalid Scope value');
                (function () {
                    Scope.validate(invalidIdentifier);
                }).should.throw('Invalid Scope value');
                (function () {
                    Scope.validate();
                }).should.throw('Invalid Scope value');
            });
        });

        describe('validateType', function () {
            it('should support for validating Scope type', function () {
                (function () {
                    Scope.validateType(tmpScope);
                }).should.not.throw();
                (function () {
                    Scope.validateType('text');
                }).should.throw('Not a Scope');
                (function () {
                    Scope.validateType();
                }).should.throw('Not a Scope');
            });
        });
    });

    describe('methods', function () {
        var global,
            program,
            fun,
            anonymous;
        beforeEach(function () {
            global = new Scope('!GLOBAL');
            program = new Scope('!PROGRAM');
            fun = new Scope('fun');
            anonymous = new Scope(0);
        });

        describe('toString', function () {
            it('should converting to string well', function () {
                global.toString().should.eql('Global');
                program.toString().should.eql('Program');
                fun.toString().should.eql('Function["fun"]');
                anonymous.toString().should.eql('AnonymousFunction[0]');
            });
        });

        describe('getter of value', function () {
            it('should getting the value correctly', function () {
                global.value.should.eql('!GLOBAL');
                program.value.should.eql('!PROGRAM');
                fun.value.should.eql('fun');
                anonymous.value.should.eql(0);
            });
        });

        describe('getter of type', function () {
            it('should get the type correctly', function () {
                global.type.should.eql('Global');
                program.type.should.eql('Program');
                fun.type.should.eql('Function');
                anonymous.type.should.eql('AnonymousFunction');
            });
        });
    });
});