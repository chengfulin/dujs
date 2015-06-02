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

describe('DFA (dependent on Scope)', function () {
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

        it('should work for prefix update expression', function () {
            var code = 'var a;' +
                    '++a;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UpdateExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(1);
            useSet.puse.size.should.eql(0);
            useSet.cuse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for postfix update expression', function () {
            var code = 'var a;' +
                    'a++;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UpdateExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(1);
            useSet.puse.size.should.eql(0);
            useSet.cuse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for if statement with binary expression', function () {
            var code = 'var a;' +
                'if (a > 0) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('BinaryExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for if statement with unary expression', function () {
            var code = 'var a;' +
                    'if (!!a) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UnaryExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for if statement with call expression', function () {
            var code = 'var callee = function () {};' +
                    'if (callee()) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('CallExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('callee@[4,10]_Program');
        });

        it('should work for while statement with binary expression', function () {
            var code = 'var a;' +
                    'while (a <= 0) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('BinaryExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for while statement with unary expression', function () {
            var code = 'var a;' +
                    'while (!a) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UnaryExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for while statement with call expression', function () {
            var code = 'var callee = function () {};' +
                    'while (callee()) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('CallExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('callee@[4,10]_Program');
        });

        it('should work for for statement with binary expression', function () {
            var code = 'var a;' +
                    'for (;a <= 0;) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('BinaryExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for for statement with unary expression', function () {
            var code = 'var a;' +
                    'for (;!a;) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('UnaryExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for for statement with call expression', function () {
            var code = 'var callee = function () {};' +
                    'for (;callee();) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('CallExpression');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('callee@[4,10]_Program');
        });


        it('should work for for statement with initialization', function () {
            var code = 'var a;' +
                    'for (a = 0; a >= 0;) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');
            cfgWrapper.getCFG()[2][3].astNode.type.should.eql('BinaryExpression');

            var useSetOfInit = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper),
                useSetOfTest = DFA.USE(cfgWrapper.getCFG()[2][3], cfgWrapper);
            useSetOfInit.cuse.size.should.eql(0);
            useSetOfInit.puse.size.should.eql(0);
            useSetOfTest.cuse.size.should.eql(0);
            useSetOfTest.puse.size.should.eql(1);
            useSetOfTest.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for for statement with initialization and update statement', function () {
            var code = 'var a;' +
                    'for (a = 0; a >= 0; ++a) {}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('AssignmentExpression');
            cfgWrapper.getCFG()[2][3].astNode.type.should.eql('BinaryExpression');
            cfgWrapper.getCFG()[2][4].astNode.type.should.eql('UpdateExpression');

            var useSetOfInit = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper),
                useSetOfTest = DFA.USE(cfgWrapper.getCFG()[2][3], cfgWrapper),
                useSetOfUpdate = DFA.USE(cfgWrapper.getCFG()[2][4], cfgWrapper);
            useSetOfInit.cuse.size.should.eql(0);
            useSetOfInit.puse.size.should.eql(0);
            useSetOfTest.cuse.size.should.eql(0);
            useSetOfTest.puse.size.should.eql(1);
            useSetOfUpdate.cuse.size.should.eql(1);
            useSetOfUpdate.puse.size.should.eql(0);
            useSetOfTest.puse.values()[0].toString().should.eql('a@[4,5]_Program');
            useSetOfUpdate.cuse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        it('should work for switch cases', function () {
            var code = 'var a, b;' +
                    'switch (a) {' +
                    'case 1: b = 2; break;' +
                    'case 2: b = 1; break;' +
                    'default: b = 0;' +
                    '}',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgext.toDotWithLabelId(cfgWrapper.getCFG()).should.eql(
                'n0 [label="entry (0)", style="rounded"]\n' +
                'n1 [label="1"]\n' +
                'n2 [label="2"]\n' +
                'n3 [label="3"]\n' +
                'n4 [label="exit (4)", style="rounded"]\n' +
                'n5 [label="5"]\n' +
                'n6 [label="6"]\n' +
                'n7 [label="7"]\n' +
                'n8 [label="8"]\n' +
                'n0 -> n1 []\n' +
                'n1 -> n2 []\n' +
                'n2 -> n3 [label="true"]\n' +
                'n2 -> n5 [label="false"]\n' +
                'n3 -> n4 []\n' +
                'n3 -> n4 [color="red", label="exception"]\n' +
                'n5 -> n6 [label="true"]\n' +
                'n5 -> n7 [label="false"]\n' +
                'n6 -> n4 []\n' +
                'n6 -> n4 [color="red", label="exception"]\n' +
                'n7 -> n8 []\n' +
                'n8 -> n4 []\n' +
                'n8 -> n4 [color="red", label="exception"]\n'
            );
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('SwitchCase');
            cfgWrapper.getCFG()[2][5].astNode.type.should.eql('SwitchCase');
            cfgWrapper.getCFG()[2][7].astNode.type.should.eql('SwitchCase');

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(0);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });

        /// conditional expression modeled as a single node
        it('should work for conditional expression', function () {
            var code = 'var a;' +
                    '(a > 0)? a++ : --a;',
                cfgWrapper = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.getCFG()[2][2].astNode.type.should.eql('ConditionalExpression');
            cfgWrapper.getCFG()[2].length.should.eql(4);

            var useSet = DFA.USE(cfgWrapper.getCFG()[2][2], cfgWrapper);
            useSet.cuse.size.should.eql(1);
            useSet.puse.size.should.eql(1);
            useSet.puse.values()[0].toString().should.eql('a@[4,5]_Program');
        });
    });
});