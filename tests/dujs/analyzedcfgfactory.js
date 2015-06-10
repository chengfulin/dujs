/**
 * Created by ChengFuLin on 2015/6/10.
 */
var factoryAnalyzedCFG = require('../../lib/dujs').factoryAnalyzedCFG,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    factoryScopeWrapper = require('../../lib/dujs').factoryScopeWrapper,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('AnalyzedCFGFactory', function () {
    "use strict";
    describe('Factory Method', function () {
        it('should support to create empty AnalyzedCFG', function () {
            var analyzedCFG = factoryAnalyzedCFG.create();
            should.not.exist(analyzedCFG._testonly_._cfg);
            should.exist(analyzedCFG._testonly_._scopeWrappers);
            analyzedCFG._testonly_._scopeWrappers.length.should.eql(0);
            should.exist(analyzedCFG._testonly_._dupairs);
            analyzedCFG._testonly_._dupairs.length.should.eql(0);
        });

        it('should support to create with ScopeWrapper', function () {
            var node1 = factoryFlowNode.createNormalNode(),
                node2 = factoryFlowNode.createNormalNode(),
                cfg = [node1, node2, [node1, node2]],
                wrapper = factoryScopeWrapper.create(cfg, Scope.PROGRAM_SCOPE),
                analyzedCFG = factoryAnalyzedCFG.create(wrapper);

            analyzedCFG._testonly_._scopeWrappers.length.should.eql(1);
            should.exist(analyzedCFG._testonly_._cfg);
            analyzedCFG._testonly_._cfg[0].should.eql(node1);
            analyzedCFG._testonly_._cfg[1].should.eql(node2);
        });
    });
});