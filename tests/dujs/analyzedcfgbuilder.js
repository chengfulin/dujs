/**
 * Created by ChengFuLin on 2015/5/27.
 */
var builder = require('../../lib/dujs').analyzedCFGBuilder,
    CFGExt = require('../../lib/dujs').CFGExt,
    ScopeTree = require('../../lib/dujs').ScopeTree,
    Scope = require('../../lib/dujs').Scope,
    factoryScopeWrapper = require('../../lib/dujs').factoryScopeWrapper,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
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
                connectedCFG[2][4]._testonly_.return.should.eql(connectedCFG[2][5]);
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

                var analyzedCFGs = builder.buildIntraProceduralCFGs(tree);
                analyzedCFGs.length.should.eql(3);
            });

            it('should be empty as the input is not a ScopeTree',function () {
                var analyzedCFGs = builder.buildIntraProceduralCFGs({});
                analyzedCFGs.length.should.eql(0);
            });
        });

        describe('buildInterProceduralCFGs', function () {
            var entry1, exit1, entry2, exit2, normal1, cfg1, cfg2;
            beforeEach(function () {
                entry1 = factoryFlowNode.createEntryNode();
                exit1 = factoryFlowNode.createExitNode();
                entry2 = factoryFlowNode.createEntryNode();
                exit2 = factoryFlowNode.createExitNode();
                normal1 = factoryFlowNode.createNormalNode();

                entry1._testonly_._cfgId = 0;
                exit1._testonly_._cfgId = 1;
                normal1._testonly_._cfgId = 3;
                entry2._testonly_._cfgId = 4;
                exit2._testonly_._cfgId = 5;

                /// connection
                entry1._testonly_.normal = normal1;
                normal1._testonly_.normal = exit1;
                entry2._testonly_.normal = exit2;
            });

            it('should produce correct AnalyzedCFG', function () {
                var callerScope = factoryScopeWrapper.create([entry1, exit1, [entry1, normal1, exit1]], Scope.PROGRAM_SCOPE),
                    calleeScope = factoryScopeWrapper.create([entry2, exit2, [entry2, exit2]], new Scope('foo'));
                var interProceduralAnalyzedCFG = builder.buildInterProceduralCFG(callerScope, calleeScope, normal1);
                should.exist(interProceduralAnalyzedCFG);
                interProceduralAnalyzedCFG._testonly_._scopeWrappers.length.should.eql(2);
                interProceduralAnalyzedCFG._testonly_._cfg[0].should.eql(entry1);
                interProceduralAnalyzedCFG._testonly_._cfg[1].should.eql(exit1);
                interProceduralAnalyzedCFG._testonly_._cfg[2].length.should.eql(6);
            });
        });
    });
});