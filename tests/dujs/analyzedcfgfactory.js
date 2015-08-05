/**
 * Created by ChengFuLin on 2015/6/10.
 */
var factoryAnalyzedCFG = require('../../lib/dujs').factoryAnalyzedCFG,
    should = require('should');

describe('AnalyzedCFGFactory', function () {
    "use strict";
    describe('Factory Method', function () {
        it('should support to create empty Model', function () {
            var analyzedCFG = factoryAnalyzedCFG.create();
            should.not.exist(analyzedCFG._testonly_._graph);
            should.exist(analyzedCFG._testonly_._relatedScopes);
            analyzedCFG._testonly_._relatedScopes.length.should.eql(0);
            should.exist(analyzedCFG._testonly_._dupairs);
            analyzedCFG._testonly_._dupairs.size.should.eql(0);
        });
    });
});