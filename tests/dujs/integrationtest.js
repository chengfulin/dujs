/**
 * Created by ChengFuLin on 2015/6/16.
 */
var dujs = require('../../lib/dujs'),
    CFGExt = require('../../lib/dujs').CFGExt,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    should = require('should');

describe('Integration Test', function () {
    "use strict";
    describe('Do analysis', function () {
        beforeEach(function () {
            factoryFlowNode.resetCounter();
        });

        describe('Getting Intra-procedural Analysis Items', function () {
            describe('from only one scope', function () {
                var result;
                beforeEach(function () {
                    var code = 'var a = 0, b;\n' +
                        'b = "text";';
                    result = dujs(code);
                });

                it('should construct CFG correctly', function () {
                    result.intraProcedurals.length.should.eql(1); /// 1 intra-procedural analysis item
                    result.interProcedurals.length.should.eql(0);
                    result.intraPages.length.should.eql(0);

                    /// Check properties
                    should.exist(result.intraProcedurals[0]._testonly_._cfg);
                    CFGExt.isValidCFG(result.intraProcedurals[0]._testonly_._cfg).should.eql(true);
                    var cfg = result.intraProcedurals[0]._testonly_._cfg;
                    cfg[2].length.should.eql(4);
                    /// cfgIds
                    cfg[0]._testonly_._cfgId.should.eql(0);
                    cfg[1]._testonly_._cfgId.should.eql(3);
                    cfg[2][1]._testonly_._cfgId.should.eql(1);
                    cfg[2][2]._testonly_._cfgId.should.eql(2);
                    /// node types
                    cfg[0]._testonly_._type.should.eql('entry');
                    cfg[1]._testonly_._type.should.eql('exit');
                    cfg[2][1]._testonly_._type.should.eql('normal');
                    cfg[2][2]._testonly_._type.should.eql('normal');
                    /// connections
                    should.exist(cfg[0].normal);
                    cfg[0].normal.should.eql(cfg[2][1]);
                    should.exist(cfg[2][1].normal);
                    cfg[2][1].normal.should.eql(cfg[2][2]);
                    should.exist(cfg[2][2].normal);
                    cfg[2][2].normal.should.eql(cfg[1]);
                });

                it('should set variables well', function () {
                    /// Global VarDefs
                    should.exist(result.intraProcedurals[0]._testonly_._cfg[0]._testonly_._generate);
                    result.intraProcedurals[0]._testonly_._cfg[0]._testonly_._generate.size.should.eql(2);
                    var globals = result.intraProcedurals[0]._testonly_._cfg[0]._testonly_._generate;
                    var globalNames = ['window', 'document'];
                    globals.forEach(function (vardef) {
                        globalNames.indexOf(vardef._testonly_._var._testonly_._name).should.not.eql(-1);
                        vardef._testonly_._def._testonly_._type.should.eql('htmlDOM');
                    });

                    /// Vars
                    should.exist(result.intraProcedurals[0]._testonly_._scopeWrappers[0]._testonly_._vars);
                    result.intraProcedurals[0]._testonly_._scopeWrappers[0]._testonly_._vars.size.should.eql(4);
                    var variables = result.intraProcedurals[0]._testonly_._scopeWrappers[0]._testonly_._vars;
                    variables.has('window').should.eql(true);
                    variables.has('document').should.eql(true);
                    variables.has('a').should.eql(true);
                    variables.has('b').should.eql(true);
                });
            });

            describe('from two scopes', function () {
                var result;
                beforeEach(function () {
                    var code = 'var a = 0, b;\n' +
                        'b = "text";\n' +
                        'function foo(c) { var d;}';
                    result = dujs(code);
                });

                it('should construct CFG correctly', function () {
                    result.intraProcedurals.length.should.eql(2);
                    result.interProcedurals.length.should.eql(0);
                    result.intraPages.length.should.eql(0);

                    /// Check properties
                    should.exist(result.intraProcedurals[1]._testonly_._cfg);
                    CFGExt.isValidCFG(result.intraProcedurals[1]._testonly_._cfg).should.eql(true);
                    var cfg = result.intraProcedurals[1]._testonly_._cfg;
                    cfg[2].length.should.eql(3);
                    /// cfgIds
                    cfg[0]._testonly_._cfgId.should.eql(4);
                    cfg[1]._testonly_._cfgId.should.eql(6);
                    cfg[2][1]._testonly_._cfgId.should.eql(5);
                    /// node types
                    cfg[0]._testonly_._type.should.eql('entry');
                    cfg[1]._testonly_._type.should.eql('exit');
                    cfg[2][1]._testonly_._type.should.eql('normal');
                    /// connections
                    should.exist(cfg[0].normal);
                    cfg[0].normal.should.eql(cfg[2][1]);
                    should.exist(cfg[2][1].normal);
                    cfg[2][1].normal.should.eql(cfg[1]);
                });

                it('should set variables well', function () {
                    /// Params VarDef
                    should.exist(result.intraProcedurals[1]._testonly_._cfg[0]._testonly_._generate);
                    result.intraProcedurals[1]._testonly_._cfg[0]._testonly_._generate.size.should.eql(1);
                    var params = result.intraProcedurals[1]._testonly_._cfg[0]._testonly_._generate;
                    var paramNames = ['c'];
                    params.forEach(function (vardef) {
                        paramNames.indexOf(vardef._testonly_._var._testonly_._name).should.not.eql(-1);
                    });

                    /// function VarDef
                    result.intraProcedurals[0]._testonly_._cfg[0]._testonly_._generate.size.should.eql(3);
                    var programEntryVarDefs = result.intraProcedurals[0]._testonly_._cfg[0]._testonly_._generate;
                    var programEntryVarNames = ['window', 'document', 'foo'];
                    programEntryVarDefs.forEach(function (vardef) {
                        programEntryVarNames.indexOf(vardef._testonly_._var._testonly_._name).should.not.eql(-1);
                    });

                    /// Vars
                    should.exist(result.intraProcedurals[1]._testonly_._scopeWrappers[0]._testonly_._vars);
                    result.intraProcedurals[1]._testonly_._scopeWrappers[0]._testonly_._vars.size.should.eql(2);
                    var variables = result.intraProcedurals[1]._testonly_._scopeWrappers[0]._testonly_._vars;
                    variables.has('c').should.eql(true);
                    variables.has('d').should.eql(true);

                    /// function variable
                    var programVars = result.intraProcedurals[0]._testonly_._scopeWrappers[0]._testonly_._vars;
                    programVars.has('foo').should.eql(true);
                });
            });
        });
    });
});