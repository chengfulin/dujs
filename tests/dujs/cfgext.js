/**
 * Created by ChengFuLin on 2015/5/7.
 */
var CFGExt = require('../../lib/dujs').CFGExt,
    should = require('should');

describe('CFGExt', function () {
    'use strict';
    describe('methods', function () {
        beforeEach(function () {
            CFGExt.resetCounter();
        });

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

        describe('toDotWithLabelLoc', function () {
            it('should convert simple code to Dot language with default label well', function () {
                var cfg = CFGExt.getCFG(CFGExt.parseAST(
                        'var a = 3;'
                    )),
                    output = CFGExt.toDotWithLabelLoc(cfg);
                output.should.eql(
                    'n0 [label="entry", style="rounded"]\n' +
                    'n1 [label="1:0"]\n' +
                    'n2 [label="exit", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n'
                );
            });
        });

        describe('toDotWithLabelId', function () {
            it('should convert simple code to Dot language with default label well', function () {
                var code = 'var a = 3;',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDotWithLabelId(cfg);
                output.should.eql(
                    'n0 [label="entry (0)", style="rounded"]\n' +
                    'n1 [label="1"]\n' +
                    'n2 [label="exit (2)", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n'
                );
            });

            it('should convert simple code to Dot language well', function () {
                var code = 'var a = 3;',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDotWithLabelId(cfg);
                output.should.eql(
                    'n0 [label="entry (0)", style="rounded"]\n' +
                    'n1 [label="1"]\n' +
                    'n2 [label="exit (2)", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n'
                );
            });

            it('should convert code with loop to Dot language with default label well', function () {
                var code = 'var a = 3;\n' +
                        'while (a > 0) {\n' +
                        '--a;\n' +
                        '}',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDotWithLabelId(cfg);
                output.should.eql(
                    'n0 [label="entry (0)", style="rounded"]\n' +
                    'n1 [label="1"]\n' +
                    'n2 [label="2"]\n' +
                    'n3 [label="3"]\n' +
                    'n4 [label="exit (4)", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n' +
                    'n2 -> n3 [label="true"]\n' +
                    'n2 -> n4 [label="false"]\n' +
                    'n2 -> n4 [color="red", label="exception"]\n' +
                    'n3 -> n2 []\n'
                );
            });

            it('should convert code with loop to Dot language well', function () {
                var code = 'var a = 3;\n' +
                        'while (a > 0) {\n' +
                        '--a;\n' +
                        '}',
                    cfg = CFGExt.getCFG(CFGExt.parseAST(code)),
                    output = CFGExt.toDotWithLabelId(cfg);
                output.should.eql(
                    'n0 [label="entry (0)", style="rounded"]\n' +
                    'n1 [label="1"]\n' +
                    'n2 [label="2"]\n' +
                    'n3 [label="3"]\n' +
                    'n4 [label="exit (4)", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n' +
                    'n2 -> n3 [label="true"]\n' +
                    'n2 -> n4 [label="false"]\n' +
                    'n2 -> n4 [color="red", label="exception"]\n' +
                    'n3 -> n2 []\n'
                );
            });
        });

        describe('connect', function () {
            it('should do connection of call type well', function () {
                var code1 = 'var a, b;',
                    code2 = 'var c;',
                    cfg1 = CFGExt.getCFG(CFGExt.parseAST(code1)),
                    cfg2 = CFGExt.getCFG(CFGExt.parseAST(code2));

                /// Before connection
                cfg1[2][1].cfgId.should.eql(1);
                cfg2[0].cfgId.should.eql(3);
                should.not.exist(cfg1[2][1].call);
                cfg1[2][1].next.length.should.eql(1);
                cfg2[0].prev.length.should.eql(0);

                /// After connection
                CFGExt.connect(cfg1[2][1], cfg2[0], CFGExt.CALL_CONNECT_TYPE);
                should.exist(cfg1[2][1].call);
                cfg1[2][1].call.cfgId.should.eql(3);
                cfg1[2][1].next.length.should.eql(2);
                cfg2[0].prev.length.should.eql(1);
            });

            it('should do connection of return type well', function () {
                var code1 = 'var a, b;',
                    code2 = 'var c;',
                    cfg1 = CFGExt.getCFG(CFGExt.parseAST(code1)),
                    cfg2 = CFGExt.getCFG(CFGExt.parseAST(code2));

                /// Before connection
                cfg1[2][1].cfgId.should.eql(1);
                cfg2[0].cfgId.should.eql(3);
                should.not.exist(cfg1[2][1].return);
                cfg1[2][1].next.length.should.eql(1);
                cfg2[0].prev.length.should.eql(0);

                /// After connection
                CFGExt.connect(cfg1[2][1], cfg2[0], CFGExt.RETURN_CONNECT_TYPE);
                should.exist(cfg1[2][1].return);
                cfg1[2][1].return.cfgId.should.eql(3);
                cfg1[2][1].next.length.should.eql(2);
                cfg2[0].prev.length.should.eql(1);
            });
        });
    });
});