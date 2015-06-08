/**
 * Created by ChengFuLin on 2015/5/27.
 */
var AnalyzedCFG = require('../../lib/dujs').AnalyzedCFG,
    ScopeWrapper = require('../../lib/dujs').ScopeWrapper,
    Scope = require('../../lib/dujs').Scope,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    factoryDUPair = require('../../lib/dujs').factoryDUPair,
    should = require('should');

describe('AnalyzedCFG', function () {
    "use strict";
    describe('Static Methods', function () {
        describe('isAnalyzedCFG', function () {
            it('should return false as the object is not an AnalyzedCFG', function () {
                AnalyzedCFG.isAnalyzedCFG(null).should.eql(false);
                AnalyzedCFG.isAnalyzedCFG({}).should.eql(false);
            });

            it('should return true as the object is an AnalyzedCFG', function () {
                AnalyzedCFG.isAnalyzedCFG(new AnalyzedCFG()).should.eql(true);
            });
        });
    });

    describe('Properties', function () {
        describe('cfg', function () {
            var analyzed;
            beforeEach(function () {
                analyzed = new AnalyzedCFG();
            });

            it('should support to retrieve value correctly', function () {
                var node1 = factoryFlowNode.createEntryNode(),
                    node2 = factoryFlowNode.createExitNode(),
                    cfg = [node1, node2, [node1, node2]];
                analyzed._testonly_._cfg = cfg;

                should.exist(analyzed.cfg);
                analyzed.cfg.length.should.eql(3);
                analyzed.cfg[0].should.eql(node1);
                analyzed.cfg[1].should.eql(node2);
                analyzed.cfg[2].length.should.eql(2);
            });

            it('should support to modify the value', function () {
                var node1 = factoryFlowNode.createEntryNode(),
                    node2 = factoryFlowNode.createExitNode(),
                    cfg = [node1, node2, [node1, node2]];

                analyzed.cfg = cfg;
                analyzed._testonly_._cfg.length.should.eql(3);
                analyzed._testonly_._cfg[0].should.eql(node1);
                analyzed._testonly_._cfg[1].should.eql(node2);
                analyzed._testonly_._cfg[2].length.should.eql(2);
            });
        });

        describe('scopeWrappers', function () {
            var analyzed;
            beforeEach(function () {
                analyzed = new AnalyzedCFG();
            });

            it('should support to retrieve value correctly', function () {
                var node1 = factoryFlowNode.createEntryNode(),
                    node2 = factoryFlowNode.createExitNode(),
                    wrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);

                analyzed._testonly_._scopeWrappers.push(wrapper);

                should.exist(analyzed.scopeWrappers);
                analyzed.scopeWrappers.length.should.eql(1);
                analyzed.scopeWrappers[0].should.eql(wrapper);
            });

            it('should not be modified', function () {
                should(function () {
                    analyzed.scopeWrappers = null;
                }).throw();
            });
        });

        describe('dupairs', function () {
            var analyzed;
            beforeEach(function () {
                analyzed = new AnalyzedCFG();
            });

            it('should support to retrieve value correctly', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createNormalNode();
                node1.cfgId = 0;
                node2.cfgId = 1;
                var pair = factoryDUPair.create(node1,node2);
                analyzed._testonly_._dupairs.push(pair);

                analyzed.dupairs.length.should.eql(1);
                analyzed.dupairs[0]._testonly_._first.should.eql(node1);
                analyzed.dupairs[0]._testonly_._second.should.eql(node2);
            });

            it('should not be modified', function () {
                should(function () {
                    analyzed.dupairs = null;
                }).throw();
            });
        });
    });

    describe('Methods', function () {
        var analyzed, node1, node2;
        beforeEach(function () {
            analyzed = new AnalyzedCFG();
            node1 = factoryFlowNode.createNormalNode();
            node2 = factoryFlowNode.createNormalNode();
            node1.cfgId = 0;
            node2.cfgId = 1;
        });

        describe('hasDUPair', function () {
            it('should found the reference of pair', function () {
                var pair = factoryDUPair.create(node1,node2);
                analyzed._testonly_._dupairs.push(pair);
                analyzed.hasDUPair(pair).should.eql(true);
            });

            it('should found the pair has same elements', function () {
                var pair = factoryDUPair.create(node1,node2);
                analyzed._testonly_._dupairs.push(pair);
                analyzed.hasDUPair(factoryDUPair.create(node1, node2)).should.eql(true);
            });

            it('should return false as the input is not a DUPair', function () {
                analyzed._testonly_._dupairs.push(factoryDUPair.create(node1, node2));
                analyzed.hasDUPair([0,1]).should.eql(false);
                analyzed.hasDUPair({}).should.eql(false);
            });

            it('should return false as the pair value is not existed', function () {
                var pair = factoryDUPair.create(node1,node2);
                analyzed._testonly_._dupairs.push(pair);
                analyzed.hasDUPair(factoryDUPair.create(node2, node1)).should.eql(false);
            });
        });

        describe('addDUPair', function () {
            it('should add a pair as the pair is a non-existed DUPair', function () {
                var pair1 = factoryDUPair.create(node1, node2);
                analyzed.addDUPair(pair1);
                analyzed._testonly_._dupairs.length.should.eql(1);
                analyzed._testonly_._dupairs[0]._testonly_._first.should.eql(node1);
                analyzed._testonly_._dupairs[0]._testonly_._second.should.eql(node2);

                var pair2 = factoryDUPair.create(node2, node1);
                analyzed.addDUPair(pair2);
                analyzed._testonly_._dupairs.length.should.eql(2);
                analyzed._testonly_._dupairs[1]._testonly_._first.should.eql(node2);
                analyzed._testonly_._dupairs[1]._testonly_._second.should.eql(node1);
            });

            it('should ignore non-DUPair', function () {
                analyzed.addDUPair({});
                analyzed._testonly_._dupairs.length.should.eql(0);
            });

            it('should ignore existed DUPair', function () {
                var pair1 = factoryDUPair.create(node1, node2);
                analyzed.addDUPair(pair1);
                analyzed.addDUPair(pair1);
                analyzed._testonly_._dupairs.length.should.eql(1);
            });
        });
    });
});