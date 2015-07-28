/**
 * Created by ChengFuLin on 2015/6/8.
 */
var factoryScopeWrapper = require('../../lib/dujs').factoryScopeWrapper,
    Scope = require('../../lib/dujs').Scope,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    should = require('should');

describe('ScopeFactory', function () {
    "use strict";
    beforeEach(function () {
        factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes = 0;
        factoryFlowNode.resetCounter();
    });

    describe('Properties', function () {
        describe('numOfAnonymousFunctionScopes', function () {
            it('should retrieve the value correctly', function () {
                factoryScopeWrapper.numOfAnonymousFunctionScopes.should.eql(0);
                factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes = 1;
                factoryScopeWrapper.numOfAnonymousFunctionScopes.should.eql(1);
            });

            it('should support to modify value', function () {
                factoryScopeWrapper.numOfAnonymousFunctionScopes = 2;
                factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes.should.eql(2);
            });

            it('should ignore non-number and the number less than 0', function () {
                factoryScopeWrapper.numOfAnonymousFunctionScopes = '1';
                factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes.should.eql(0);
                factoryScopeWrapper.numOfAnonymousFunctionScopes = -1;
                factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes.should.eql(0);
            });
        });
    });

    describe('Methods', function () {
        describe('resetAnonymousFunctionScopeCounter', function () {
            it('should reset the property of numOfAnonymousFunctionScope correctly', function () {
                factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes = 1;
                factoryScopeWrapper.resetAnonymousFunctionScopeCounter();
                factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes.should.eql(0);
            });
        });

        describe('Factory Methods', function () {
            var node1, node2, cfg;
            beforeEach(function () {
                node1 = factoryFlowNode.createEntryNode();
                node2 = factoryFlowNode.createExitNode();
                cfg = [node1, node2, [node1, node2]];
            });

            describe('create', function () {
                it('should support to create Scope for global scope', function () {
                    var globalWrapper = factoryScopeWrapper.create(cfg, Scope.GLOBAL_SCOPE);
                    should.exist(globalWrapper._testonly_._cfg);
                    should.exist(globalWrapper._testonly_._name);
                    globalWrapper._testonly_._cfg[0].should.eql(node1);
                    globalWrapper._testonly_._cfg[1].should.eql(node2);
                    globalWrapper._testonly_._name._testonly_._type.should.eql('Global');
                });

                it('should support to create Scope for program scope', function () {
                    var programWrapper = factoryScopeWrapper.create(cfg, Scope.PROGRAM_SCOPE);
                    programWrapper._testonly_._name._testonly_._type.should.eql('Program');
                });

                it('should support to create Scope for function scope', function () {
                    var functionWrapper = factoryScopeWrapper.create(cfg, new Scope('foo'));
                    functionWrapper._testonly_._name._testonly_._type.should.eql('Function');
                    functionWrapper._testonly_._name._testonly_._value.should.eql('foo');
                });

                it('should support to create Scope for anonymous function scope', function () {
                    var anonymousWrapper = factoryScopeWrapper.create(cfg, new Scope(0));
                    anonymousWrapper._testonly_._name._testonly_._type.should.eql('AnonymousFunction');
                    anonymousWrapper._testonly_._name._testonly_._value.should.eql(0);
                });
            });

            describe('createGlobalScopeWrapper', function () {
                it('should support to create Scope for global scope', function () {
                    var wrapper = factoryScopeWrapper.createGlobalScopeWrapper(cfg);
                    wrapper._testonly_._name._testonly_._type.should.eql('Global');
                });
            });

            describe('createProgramScopeWrapper', function () {
                it('should support to create Scope for program scope', function () {
                    var wrapper = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    wrapper._testonly_._name._testonly_._type.should.eql('Program');
                });
            });

            describe('createFunctionScopeWrapper', function () {
                it('should support to create Scope for function scope', function () {
                    var wrapper = factoryScopeWrapper.createFunctionScopeWrapper(cfg, 'foo');
                    wrapper._testonly_._name._testonly_._value.should.eql('foo');
                });
            });

            describe('createAnonymousFunctionScopeWrapper', function () {
                it('should support to create Scope for anonymous function scope', function () {
                    var wrapper = factoryScopeWrapper.createAnonymousFunctionScopeWrapper(cfg);
                    wrapper._testonly_._name._testonly_._value.should.eql(0);
                });

                it('should increase the counter of anonymous scope wrappers', function () {
                    var wrapper1 = factoryScopeWrapper.createAnonymousFunctionScopeWrapper(cfg);
                    wrapper1._testonly_._name._testonly_._value.should.eql(0);

                    factoryScopeWrapper._testonly_._numOfAnonymousFunctionScopes.should.eql(1);

                    var wrapper2 = factoryScopeWrapper.createAnonymousFunctionScopeWrapper(cfg);
                    wrapper2._testonly_._name._testonly_._value.should.eql(1);
                });
            });
        });
    });
});