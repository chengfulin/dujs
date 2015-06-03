/**
 * Created by ChengFuLin on 2015/5/27.
 */
var AnalyzedCFG = require('../../lib/dujs').AnalyzedCFG,
    ScopeWrapper = require('../../lib/dujs').ScopeWrapper,
    Scope = require('../../lib/dujs').Scope,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
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
    });
});