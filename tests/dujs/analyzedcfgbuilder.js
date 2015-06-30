/**
 * Created by ChengFuLin on 2015/5/27.
 */
var builder = require('../../lib/dujs').analyzedCFGBuilder,
    CFGExt = require('../../lib/dujs').CFGExt,
    ScopeTree = require('../../lib/dujs').ScopeTree,
    should = require('should');

describe('AnalyzedCFGBuilder', function () {
    "use strict";
    describe('Private Methods', function () {
        describe('connectCallerCalleeCFGs', function () {
            it('should connect two CFGs correctly', function () {
                var cfg1 = CFGExt.getCFG(CFGExt.parseAST(
                        'foo();'
                    )),
                    cfg2 = CFGExt.getCFG(CFGExt.parseAST(
                        'var b = 1;'
                    )),
                    connectedCFG = builder._testonly_.connectCallerCalleeCFGs(cfg1, cfg2, cfg1[2][1]);

                connectedCFG.length.should.eql(3);
                connectedCFG[0].should.eql(cfg1[0]);
                connectedCFG[1].should.eql(cfg1[1]);
                connectedCFG[2].length.should.eql(7);

                /// All nodes of connected CFG
                connectedCFG[2][0]._testonly_._type.should.eql('entry');
                connectedCFG[2][1]._testonly_._type.should.eql('call');
                should.not.exist(connectedCFG[2][1]._testonly_._astNode);
                connectedCFG[2][2]._testonly_._type.should.eql('entry');
                connectedCFG[2][4]._testonly_._type.should.eql('exit');
                connectedCFG[2][5]._testonly_._type.should.eql('callReturn');
                should.exist(connectedCFG[2][5]._testonly_._astNode);
                connectedCFG[2][5]._testonly_._astNode.type.should.eql('CallExpression');
                connectedCFG[2][6]._testonly_._type.should.eql('exit');

                /// Call connection
                connectedCFG[2][0]._testonly_.normal.should.eql(connectedCFG[2][1]);
                connectedCFG[2][1]._testonly_.call.should.eql(connectedCFG[2][2]);
                connectedCFG[2][1]._testonly_._next.length.should.eql(1);
                connectedCFG[2][1]._testonly_._next[0].should.eql(connectedCFG[2][2]);
                connectedCFG[2][2]._testonly_._prev.length.should.eql(1);
                connectedCFG[2][2]._testonly_._prev[0].should.eql(connectedCFG[2][1]);

                /// Return connection
                connectedCFG[2][4]._testonly_.return[0].should.eql(connectedCFG[2][5]);
                connectedCFG[2][4]._testonly_._next.length.should.eql(1);
                connectedCFG[2][4]._testonly_._next[0].should.eql(connectedCFG[2][5]);
                connectedCFG[2][5]._testonly_._prev.length.should.eql(1);
                connectedCFG[2][5]._testonly_._prev[0].should.eql(connectedCFG[2][4]);
            });
        });
    });

    describe('Public Methods', function () {
        describe('buildIntraProceduralCFGs', function () {
            it('should produce correct AnalyzedCFGs', function () {
                var ast = CFGExt.parseAST(
                        'var a;' +
                        'function foo() {' +
                        'expr;' +
                        '}' +
                        'a = function () {' +
                        'expr;' +
                        '};'
                    ),
                    tree = new ScopeTree();
                tree.buildScopeTree(ast);

                var analyzedCFGs = builder.buildIntraProceduralAnalysisItems(tree);
                analyzedCFGs.length.should.eql(3);
            });

            it('should be empty as the input is not a ScopeTree',function () {
                var analyzedCFGs = builder.buildIntraProceduralAnalysisItems({});
                analyzedCFGs.length.should.eql(0);
            });
        });

        describe('buildInterProceduralCFGs', function () {
            /// TODO: should be tested
        });
    });
});