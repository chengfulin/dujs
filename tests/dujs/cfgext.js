/**
 * Created by ChengFuLin on 2015/5/7.
 */
var CFGExt = require('../../lib/dujs').CFGExt,
    should = require('should');

describe('CFGExt', function () {
    'use strict';
    describe('methods', function () {
        describe('getCFG', function () {
            it('should have continuous cfgIds', function () {
                var code1 = 'var a, b;',
                    code2 = 'fun();',
                    cfg1 = CFGExt.getCFG(CFGExt.parseAST(code1)),
                    cfg2 = CFGExt.getCFG(CFGExt.parseAST(code2));
                cfg1[2].length.should.eql(3);
                cfg1[2][0].cfgId.should.eql(0);
                cfg1[2][2].cfgId.should.eql(2);
                cfg2[2].length.should.eql(3);
                cfg2[2][0].cfgId.should.eql(3);
                cfg2[2][2].cfgId.should.eql(5);
            });
        });

        describe('toDot', function () {
            it('should convert simple code to Dot language with default label well', function () {
                CFGExt.resetCounter();
                var code = 'var a = 3;',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDot(cfg);
                output.should.eql(
                    'n0 [label="entry", style="rounded"]\n' +
                    'n1 [label="VariableDeclaration"]\n' +
                    'n2 [label="exit", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n'
                );
            });

            it('should convert simple code to Dot language well', function () {
                CFGExt.resetCounter();
                var code = 'var a = 3;',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDot(cfg, true);
                output.should.eql(
                    'n0 [label="entry", style="rounded"]\n' +
                    'n1 [label="1"]\n' +
                    'n2 [label="exit", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n'
                );
            });

            it('should convert code with loop to Dot language with default label well', function () {
                CFGExt.resetCounter();
                var code = 'var a = 3;\n' +
                        'while (a > 0) {\n' +
                        '--a;\n' +
                        '}',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDot(cfg);
                output.should.eql(
                    'n0 [label="entry", style="rounded"]\n' +
                    'n1 [label="VariableDeclaration"]\n' +
                    'n2 [label="BinaryExpression"]\n' +
                    'n3 [label="UpdateExpression"]\n' +
                    'n4 [label="exit", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n' +
                    'n2 -> n3 [label="true"]\n' +
                    'n2 -> n4 [label="false"]\n' +
                    'n2 -> n4 [color="red", label="exception"]\n' +
                    'n3 -> n2 []\n'
                );
            });

            it('should convert code with loop to Dot language well', function () {
                CFGExt.resetCounter();
                var code = 'var a = 3;\n' +
                        'while (a > 0) {\n' +
                        '--a;\n' +
                        '}',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDot(cfg, true);
                output.should.eql(
                    'n0 [label="entry", style="rounded"]\n' +
                    'n1 [label="1"]\n' +
                    'n2 [label="2"]\n' +
                    'n3 [label="3"]\n' +
                    'n4 [label="exit", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n' +
                    'n2 -> n3 [label="true"]\n' +
                    'n2 -> n4 [label="false"]\n' +
                    'n2 -> n4 [color="red", label="exception"]\n' +
                    'n3 -> n2 []\n'
                );
            });
        });
    });
});