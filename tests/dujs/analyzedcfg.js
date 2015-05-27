/**
 * Created by ChengFuLin on 2015/5/27.
 */
var AnalyzedCFG = require('../../lib/dujs').AnalyzedCFG,
    CFGWrapper = require('../../lib/dujs').CFGWrapper,
    should = require('should');

describe('AnalyzedCFG', function () {
    "use strict";
    describe('constructor', function () {
        it('should construct with default values', function () {
            var analyzedCFG = new AnalyzedCFG();
            analyzedCFG._testonly_._relatedScopes.length.should.eql(0);
            should.not.exist(analyzedCFG._testonly_._cfgToAnalyzed);
            analyzedCFG._testonly_._dupairs.length.should.eql(0);
            analyzedCFG._testonly_._dupaths.length.should.eql(0);
        });
    });
});