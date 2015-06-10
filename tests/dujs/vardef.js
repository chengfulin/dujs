/**
 * Created by ChengFuLin on 2015/5/11.
 */
var VarDef = require('../../lib/dujs').VarDef,
    //Var = require('../../lib/dujs').Var,
    //Def = require('../../lib/dujs').Def,
    factoryVar = require('../../lib/dujs').factoryVar,
    factoryDef = require('../../lib/dujs').factoryDef,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('VarDef', function () {
    'use strict';
    beforeEach(function () {
        factoryFlowNode.resetCounter();
    });

    describe('Static Methods', function () {
        describe('validate', function () {
            it('should throw as Var or Def is invalid', function () {
                should(function () {
                    var node = factoryFlowNode.createNormalNode();
                    node._testonly_._cfgId = 0;
                    VarDef.validate(
                        {},
                        factoryDef.createLiteralDef(node, [1,2], Scope.PROGRAM_SCOPE)
                    );
                }).throw('Invalid Var for a VarDef');
                should(function () {
                    VarDef.validate(
                        factoryVar.create('a', [0,1], Scope.PROGRAM_SCOPE),
                        {}
                    );
                }).throw('Invalid Def for a VarDef');
            });

            it('should support for custom error message', function () {
                should(function () {
                    var node = factoryFlowNode.createNormalNode();
                    node._testonly_._cfgId = 0;
                    VarDef.validate(
                        null,
                        null,
                        'Custom Error'
                    );
                }).throw('Custom Error');
            });

            it('should not throw as Var and Def are valid', function () {
                should(function () {
                    var node = factoryFlowNode.createNormalNode();
                    node._testonly_._cfgId = 0;
                    VarDef.validate(
                        factoryVar.create('a', [0,1], Scope.PROGRAM_SCOPE),
                        factoryDef.createLiteralDef(node, [1,2], Scope.PROGRAM_SCOPE)
                    );
                }).not.throw();
            });
        });
    });

    describe('Properties', function () {
        var node, varDef;
        beforeEach(function () {
            node = factoryFlowNode.createNormalNode();
            node._testonly_._cfgId = 0;
            varDef = new VarDef(
                factoryVar.create('var', [0,3], Scope.PROGRAM_SCOPE),
                factoryDef.createLiteralDef(node, [3,4], Scope.PROGRAM_SCOPE)
            );
        });

        describe('variable', function () {
            it('should support to retrieve value', function () {
                should.exist(varDef.variable);
                varDef._testonly_._var.should.eql(varDef.variable);
            });

            it('should not modify value', function () {
                should(function () {
                    varDef.variable = null;
                }).throw();
            });
        });

        describe('definition', function () {
            it('should support to retrieve value', function () {
                should.exist(varDef.definition);
                varDef._testonly_._def.should.eql(varDef.definition);
            });

            it('should not modify value', function () {
                should(function () {
                    varDef.definition = null;
                }).throw();
            });
        });
    });

    describe('constructor', function () {
        it('should construct with Var and Def well', function () {
            var node = factoryFlowNode.createNormalNode();
            node._testonly_._cfgId = 0;
            var varDef = new VarDef(
                factoryVar.create('a', [0,1], Scope.PROGRAM_SCOPE),
                factoryDef.createLiteralDef(node, [1,2], Scope.PROGRAM_SCOPE)
            );
            varDef._testonly_._var._testonly_._name.should.eql('a');
            varDef._testonly_._var._testonly_._scope._testonly_._type.should.eql('Program');
            varDef._testonly_._var._testonly_._range._testonly_._start.should.eql(0);

            varDef._testonly_._def._testonly_._type.should.eql('literal');
            varDef._testonly_._def._testonly_._fromCFGNode._testonly_._cfgId.should.eql(0);
            varDef._testonly_._def._testonly_._range._testonly_._start.should.eql(1);
        });
    });

    describe('Methods', function () {
        describe('isVarDef', function () {
            it('should return false as the object is not a VarDef', function () {
                VarDef.isVarDef({}).should.eql(false);
                VarDef.isVarDef().should.eql(false);
            });

            it('should return true as the object is a VarDef', function () {
                var node = factoryFlowNode.createNormalNode();
                node._testonly_._cfgId = 0;
                var varDef = new VarDef(
                    factoryVar.create('var', [0,1], Scope.PROGRAM_SCOPE),
                    factoryDef.createObjectDef(node, [0,1], Scope.PROGRAM_SCOPE)
                );
                VarDef.isVarDef(varDef).should.eql(true);
            });
        });

        describe('toString', function () {
            it('should convert to string well', function () {
                var node = factoryFlowNode.createNormalNode();
                node._testonly_._cfgId = 0;
                var varDef = new VarDef(
                    factoryVar.create('a', [0,1], Scope.PROGRAM_SCOPE),
                    factoryDef.createLiteralDef(node, [1,2], Scope.PROGRAM_SCOPE)
                );
                varDef.toString().should.eql('(a@[0,1]_Program,Def@n0@[1,2]_Program)');
            });
        });
    });
});