/**
 * Created by ChengFuLin on 2015/5/7.
 */
var CFGExt = require('../../lib/dujs').CFGExt,
    FlowNode = require('../../lib/esgraph/flownode'),
    should = require('should');

describe('CFGExt', function () {
    'use strict';
    beforeEach(function () {
        CFGExt._testonly_._lastCFGId = 0;
    });

    describe('Properties', function () {
        describe('lastCFGId', function () {
            it('should support to retrieve value correctly', function () {
                CFGExt.lastCFGId.should.eql(0);
                CFGExt._testonly_._lastCFGId = 1;
                CFGExt.lastCFGId.should.eql(1);
            });

            it('should support to modify value', function () {
                CFGExt.lastCFGId = 2;
                CFGExt._testonly_._lastCFGId.should.eql(2);
            });

            it('should ignore non-numbers and numbers less than 0', function () {
                CFGExt.lastCFGId = '1';
                CFGExt._testonly_._lastCFGId.should.eql(0);
                CFGExt.lastCFGId = -1;
                CFGExt._testonly_._lastCFGId.should.eql(0);
            });
        });
    });

    describe('methods', function () {
        describe('resetCounter', function () {
            it('should reset the counter correctly', function () {
                CFGExt._testonly_._lastCFGId.should.eql(0);
                CFGExt._testonly_._lastCFGId = 1;
                CFGExt.resetCounter();
                CFGExt._testonly_._lastCFGId.should.eql(0);
            });
        });

        describe('parseAST', function ()  {
            it('should convert to AST with default options correctly', function () {
                var ast = CFGExt.parseAST(
                    'var a;' +
                    'a = 0;'
                );

                should.exist(ast.range);
                should.exist(ast.loc);
                ast.range.should.eql([0,12]);
                ast.loc.start.should.containEql({line: 1, column: 0});
            });

            it('should convert to AST with custom options correctly', function () {
                var ast = CFGExt.parseAST(
                    'var a;' +
                    'a = 0;' +
                    '/// comment',
                    {
                        comment: true
                    }
                );

                should.exist(ast.range);
                should.exist(ast.loc);
                should.exist(ast.comments);
                ast.range.should.eql([0,12]);
                ast.loc.start.should.containEql({line: 1, column: 0});
            });
        });

        describe('getCFG', function () {
            it('should have correct cfgIds as the flow of CFG nodes', function () {
                var code1 = 'var a, b;',
                    cfg1 = CFGExt.getCFG(CFGExt.parseAST(code1));

                cfg1[2].length.should.eql(3);
                cfg1[0].cfgId.should.eql(0);
                cfg1[1].cfgId.should.eql(2);
                cfg1[2][1].cfgId.should.eql(1);
            });
        });

        describe('getGlobalCFG', function () {
            it('should create CFG for global scope correctly', function () {
                var cfg = CFGExt.getGlobalCFG();
                cfg.length.should.eql(3);
                cfg[0].should.eql(cfg[1]);
                cfg[0].should.eql(cfg[2][0]);
                cfg[0]._testonly_._cfgId.should.eql(0);
                cfg[0]._testonly_._line.should.eql(0);
                cfg[0]._testonly_._col.should.eql(0);
            });
        });

        describe('findScopes', function () {
            it('should support single scope', function () {
                var ast = CFGExt.parseAST(
                        'var a = 0;'
                    ),
                    scope = CFGExt.findScopes(ast);

                scope.length.should.eql(1);
                scope[0].type.should.eql('Program');
            });

            it('should support named functions', function () {
                var ast = CFGExt.parseAST(
                        'function foo() { expr;}' +
                        'function foo2() { expr;}'
                    ),
                    scopes = CFGExt.findScopes(ast);

                scopes.length.should.eql(3);
                scopes[1].type.should.eql('FunctionDeclaration');
                scopes[2].type.should.eql('FunctionDeclaration');
            });

            it('should support for anonymous functions', function () {
                var ast = CFGExt.parseAST(
                        'var a = function () { expr;};' +
                        'var b = function () { expr;};'
                    ),
                    scopes = CFGExt.findScopes(ast);

                scopes.length.should.eql(3);
                scopes[1].type.should.eql('FunctionExpression');
                scopes[2].type.should.eql('FunctionExpression');
            });

            it('should support for multiple functions', function () {
                var ast = CFGExt.parseAST(
                        'var a = function () { expr;};' +
                        'function foo() { expr;}'
                    ),
                    scopes = CFGExt.findScopes(ast);

                scopes.length.should.eql(3);
                scopes[1].type.should.eql('FunctionExpression');
                scopes[2].type.should.eql('FunctionDeclaration');
            });
        });

        describe('toDot', function () {
            var code = 'var a = 0, b = 1;' +
                '++a;' +
                'b = a - 1;';

            it('should convert correctly to dot with default options', function () {
                var ast = CFGExt.parseAST(code),
                    dot = CFGExt.toDot(CFGExt.getCFG(ast));

                dot.should.eql(
                    'n0 [label="entry", style="rounded"]\n' +
                    'n1 [label="VariableDeclaration"]\n' +
                    'n2 [label="UpdateExpression"]\n' +
                    'n3 [label="AssignmentExpression"]\n' +
                    'n4 [label="exit", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n' +
                    'n2 -> n3 []\n' +
                    'n3 -> n4 []\n' +
                    'n3 -> n4 [color="red", label="exception"]\n');
            });

            it('should convert correctly to dot with source option', function () {
                var ast = CFGExt.parseAST(code),
                    dot = CFGExt.toDot(CFGExt.getCFG(ast), code);

                dot.should.eql(
                    'n0 [label="entry", style="rounded"]\n' +
                    'n1 [label="var a = 0, b = 1;"]\n' +
                    'n2 [label="++a"]\n' +
                    'n3 [label="b = a - 1"]\n' +
                    'n4 [label="exit", style="rounded"]\n' +
                    'n0 -> n1 []\n' +
                    'n1 -> n2 []\n' +
                    'n2 -> n3 []\n' +
                    'n3 -> n4 []\n' +
                    'n3 -> n4 [color="red", label="exception"]\n');
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

        describe('isValidCFG', function () {
            it('should return false as the input is invalid', function () {
                CFGExt.isValidCFG([1,2]).should.eql(false);
                CFGExt.isValidCFG([1,2,3]).should.eql(false);

                var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.ENTRY_NODE_TYPE);
                CFGExt.isValidCFG([node1, 0, []]).should.eql(false);
                CFGExt.isValidCFG([node1, node2, []]);
                CFGExt.isValidCFG([node1, node2, [node1]]);
            });

            it('should return true as the input is valid', function () {
                var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.ENTRY_NODE_TYPE);
                CFGExt.isValidCFG([node1, node2, [node1, node2]]).should.eql(true);
            });
        });
    });
});