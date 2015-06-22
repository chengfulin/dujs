/**
 * Created by ChengFuLin on 2015/6/22.
 */
var analyzer = require('../../lib/dujs').DefUseAnalyzer,
    factoryScopeWrapper = require('../../lib/dujs').factoryScopeWrapper,
    cfgext = require('../../lib/dujs').CFGExt,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    should = require('should');

describe('DefUseAnalyzer', function () {
    "use strict";
    describe('Methods', function () {
        describe('findKillSet', function () {
            describe('as for Single Variable Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        'a = 1;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find no redefined variables at entry node', function () {
                    var killAtEntry = analyzer.findKILLSet(cfg[0]);
                    killAtEntry.size.should.eql(0);
                });

                it('should kill local variables at exit node', function () {
                    var killAtExit = analyzer.findKILLSet(cfg[1]);
                    killAtExit.size.should.eql(1);
                    scope._testonly_._vars.has('a').should.eql(true);
                    killAtExit.has(scope._testonly_._vars.get('a')).should.eql(true);
                });

                it('should kill variable at variable assignment', function () {
                    var kill = analyzer.findKILLSet(cfg[2][2]);
                    kill.size.should.eql(1);
                    kill.has(scope._testonly_._vars.get('a')).should.eql(true);
                });

                it('should set the kill property as the CFG node has found kill set', function () {
                    analyzer.findKILLSet(cfg[2][2]);
                    cfg[2][2]._testonly_._kill.size.should.eql(1);
                    cfg[2][2]._testonly_._kill.has(scope._testonly_._vars.get('a')).should.eql(true);

                    analyzer.findKILLSet(cfg[1]);
                    cfg[1]._testonly_._kill.size.should.eql(1);
                    cfg[1]._testonly_._kill.has(scope._testonly_._vars.get('a')).should.eql(true);
                });

                it('should not set the kill property as the CFG node has not found kill set', function () {
                    analyzer.findKILLSet(cfg[0]);
                    should.not.exist(cfg[0]._testonly_._kill);
                });
            });

            describe('as for Multiple Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a = b = 2;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill all redefined variables', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(2);
                    killSet.has(scope._testonly_._vars.get('a')).should.eql(true);
                    killSet.has(scope._testonly_._vars.get('b')).should.eql(true);
                });
            });

            describe('as for Update Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        '++a;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill the updated variable', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(1);
                    killSet.has(scope._testonly_._vars.get('a')).should.eql(true);
                });
            });

            describe('as for Assignment of Update Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a = b++;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill the assigned variable and the updated variable', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(2);
                    killSet.has(scope._testonly_._vars.get('a')).should.eql(true);
                    killSet.has(scope._testonly_._vars.get('b')).should.eql(true);
                });
            });

            describe('as for Assignment of Member Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = {};\n' +
                        'a.x = 1;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill the object variable', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(1);
                    killSet.has(scope._testonly_._vars.get('a'));
                });
            });
        });
    });
});