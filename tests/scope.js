/**
 * Created by chengfulin on 2015/4/24.
 */
var Scope = require('../lib/dujs').Scope,
    should = require('should');

describe('Scope', function () {
    describe('constructor', function () {
        it('should construct well', function () {
            (function () {
                new Scope('!invalid');
            }).should.throw('Invalid Scope value');
            var global = new Scope('!GLOBAL'),
                program = new Scope('!PROGRAM'),
                normalFun = new Scope('fun'),
                anonymousFun = new Scope(0);
            global.getValue().should.eql('!GLOBAL');
            global.getType().should.eql('Global');
            program.getValue().should.eql('!PROGRAM');
            program.getType().should.eql('Program');
            normalFun.getValue().should.eql('fun');
            normalFun.getType().should.eql('Function');
            anonymousFun.getValue().should.eql(0);
            anonymousFun.getType().should.eql('AnonymousFunction');
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
            should(Scope.GLOBAL_SCOPE instanceof Scope).be.true;
            should(Scope.PROGRAM_SCOPE instanceof Scope).be.true;
            Scope.GLOBAL_SCOPE.getValue().should.eql('!GLOBAL');
            Scope.GLOBAL_SCOPE.getType().should.eql('Global');
            Scope.PROGRAM_SCOPE.getValue().should.eql('!PROGRAM');
            Scope.PROGRAM_SCOPE.getType().should.eql('Program');
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
                Scope.isValidValue(tmpScope).should.be.true;
                Scope.isValidValue(globalScopeValue).should.be.true;
                Scope.isValidValue(programScopeValue).should.be.true;
                Scope.isValidValue(functionScopeValue).should.be.true;
                Scope.isValidValue(anonymousFunScopeValue).should.be.true;
                Scope.isValidValue(negativeNumber).should.be.false;
                Scope.isValidValue(invalidIdentifier).should.be.false;
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
            });
        });

        describe('validateType', function () {
            it('should support for validating Scope type', function () {
                (function () {
                    Scope.validateType(tmpScope);
                }).should.not.throw();
                (function () {
                    Scope.validateType('text');
                }).should.throw('TypeError: not a Scope');
                (function () {
                    Scope.validateType({}, 'custom message');
                }).should.throw('custom message');
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

        describe('getValue', function () {
            it('should getting the value correctly', function () {
                global.getValue().should.eql('!GLOBAL');
                program.getValue().should.eql('!PROGRAM');
                fun.getValue().should.eql('fun');
                anonymous.getValue().should.eql(0);
            });
        });

        describe('getType', function () {
            it('should get the type correctly', function () {
                global.getType().should.eql('Global');
                program.getType().should.eql('Program');
                fun.getType().should.eql('Function');
                anonymous.getType().should.eql('AnonymousFunction');
            });
        });
    });
});