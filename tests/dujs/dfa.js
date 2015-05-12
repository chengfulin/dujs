/**
 * Created by chengfulin on 2015/4/13.
 */
var DFA = require('../../lib/dujs/index').DFA,
    Set = require('../../lib/analyses/index').Set,
    cfgext = require('../../lib/dujs/index').CFGExt,
    Def = require('../../lib/dujs/index').Def,
    CFGWrapper = require('../../lib/dujs').CFGWrapper,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('DFA (dependent on CFGWrapper)', function () {
    'use strict';
    beforeEach(function () {
        cfgext.resetCounter();
    });

    describe('KILL set', function () {
        it('should work for single literal assignment', function () {
            var code = 'var a;' +
                    'a = 1;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(1);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for single variable assignment', function () {
            var code = 'var a;' +
                    'a = b;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(1);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for sequential assignment', function () {
            var code = 'var a, b;' +
                    'a = b = c;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(2);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
            killSet.values()[1].toString().should.eql('b@[7,8]_Program');
        });

        it('should work for function expression assignment', function () {
            var code = 'var a;' +
                    'a = function () {};',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(1);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for call expression assignment', function () {
            var code = 'var a;' +
                    'a = foo();',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(1);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for new expression assignment', function () {
            var code = 'var a;' +
                    'a = new Class();',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(1);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for prefix update expression', function () {
            var code = 'var a;' +
                    '++a;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UpdateExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(1);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for postfix update expression', function () {
            var code = 'var a;' +
                    'a++;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UpdateExpression');

            var killSet = DFA.KILL(cfgWrapper.getCFG()[2][2], cfgWrapper);
            killSet.size.should.eql(1);
            killSet.values()[0].toString().should.eql('a@[4,5]_Program');
        });
    });

    describe('GEN set', function () {
        it('should work for single literal assignment', function () {
            var code = 'var a;' +
                    'a = 1;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(1);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[10,11]_Program)');
        });

        it('should work for single variable assignment', function () {
            var code = 'var a;' +
                    'a = b;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(1);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[10,11]_Program)');
        });

        it('should work for sequential assignment', function () {
            var code = 'var a, b;' +
                    'a = b = c;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(2);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[17,18]_Program)');
            genSet.values()[1].toString().should.eql('(b@[7,8]_Program,Def@n2@[17,18]_Program)');
        });

        it('should work for function expression assignment', function () {
            var code = 'var a;' +
                    'a = function () {};',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(1);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[10,24]_Program)');
        });

        it('should work for call expression assignment', function () {
            var code = 'var a;' +
                    'a = foo();',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(1);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[10,15]_Program)');
        });

        it('should work for new expression assignment', function () {
            var code = 'var a;' +
                    'a = new Class();',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(1);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[10,21]_Program)');
        });

        it('should work for prefix update expression', function () {
            var code = 'var a;' +
                    '++a;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UpdateExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(1);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[6,9]_Program)');
        });

        it('should work for postfix update expression', function () {
            var code = 'var a;' +
                    'a++;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UpdateExpression');

            var genSet = DFA.GEN(cfgWrapper.getCFG()[2][2], cfgWrapper);
            genSet.size.should.eql(1);
            genSet.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[6,9]_Program)');
        });
    });

    describe('USE set', function () {
        it('should work for single variable assignment', function () {
            var code = 'var a, b;' +
                    'a = b;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(1);
            useSet.puse.size.should.eql(0);
            useSet.cuse.values()[0].toString().should.eql('b@[7,8]_Program');
        });

        it('should work for sequential assignment', function () {
            var code = 'var a, b, c;' +
                    'a = b = c;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(2);
            useSet.puse.size.should.eql(0);
            useSet.cuse.values()[0].toString().should.eql('b@[7,8]_Program');
            useSet.cuse.values()[1].toString().should.eql('c@[10,11]_Program');
        });

        it('should work for call expression assignment', function () {
            var code = 'var a, foo = function () {};' +
                    'a = foo();',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(1);
            useSet.puse.size.should.eql(0);
            useSet.cuse.values()[0].toString().should.eql('foo@[7,10]_Program');
        });

        it('should work for new expression assignment', function () {
            var code = 'var a, Class = {};' +
                    'a = new Class();',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(1);
            useSet.puse.size.should.eql(0);
            useSet.cuse.values()[0].toString().should.eql('Class@[7,12]_Program');
        });
    });
});