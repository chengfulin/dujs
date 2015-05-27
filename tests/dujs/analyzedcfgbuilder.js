/**
 * Created by ChengFuLin on 2015/5/27.
 */
var builder = require('../../lib/dujs').analyzedCFGBuilder,
    CFGExt = require('../../lib/dujs').CFGExt,
    should = require('should');

describe('AnalyzedCFGBuilder', function () {
    "use strict";
    describe('buildScopesAndCFGs', function () {
        it('should build all AnalyzedCFGs correctly', function () {
            var ast = CFGExt.parseAST(
                    'var a;' +
                    'function foo() {' +
                    'expr;' +
                    '}' +
                    'a = function () {' +
                    'expr;' +
                    '};'
                ),
                analyzedCFGs = builder._testonly_.buildScopesAndCFGs(ast);

            analyzedCFGs.length.should.eql(3);
            analyzedCFGs[0]._testonly_._relatedScopes[0]._testonly_.scope.toString().should.eql('Program');
            analyzedCFGs[0]._testonly_._relatedScopes[0]._testonly_.cfg[2].length.should.eql(4);
            analyzedCFGs[0]._testonly_._cfgToAnalyzed[2].length.should.eql(4);
            analyzedCFGs[0]._testonly_._cfgToAnalyzed[0].should.eql(analyzedCFGs[0]._testonly_._relatedScopes[0]._testonly_.cfg[0]);
            analyzedCFGs[0]._testonly_._cfgToAnalyzed[1].should.eql(analyzedCFGs[0]._testonly_._relatedScopes[0]._testonly_.cfg[1]);
            analyzedCFGs[0]._testonly_._cfgToAnalyzed[2].should.eql(analyzedCFGs[0]._testonly_._relatedScopes[0]._testonly_.cfg[2]);


            analyzedCFGs[1]._testonly_._relatedScopes[0]._testonly_.scope.toString().should.eql('Function["foo"]');
            analyzedCFGs[1]._testonly_._relatedScopes[0]._testonly_.cfg[2].length.should.eql(3);
            analyzedCFGs[2]._testonly_._relatedScopes[0]._testonly_.scope.toString().should.eql('AnonymousFunction[0]');
            analyzedCFGs[2]._testonly_._relatedScopes[0]._testonly_.cfg[2].length.should.eql(3);
        });
    });

    describe('buildIntraProceduralCFGs', function () {
        it('should use buildScopesAndCFGs well', function () {
            var ast = CFGExt.parseAST(
                    'var a;' +
                    'function foo() {' +
                    'expr;' +
                    '}' +
                    'a = function () {' +
                    'expr;' +
                    '};'
                ),
                analyzedCFGs = builder.buildIntraProceduralCFGs(ast);
            analyzedCFGs.length.should.eql(3);
        });
    });
});