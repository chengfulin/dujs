/**
 * Created by ChengFuLin on 2015/5/11.
 */
var VarDef = require('../../lib/dujs/vardef'),
    factoryVar = require('../../lib/dujs/varfactory'),
    factoryDef = require('../../lib/dujs/deffactory'),
    factoryFlowNode = require('../../lib/esgraph/flownodefactory'),
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
                        factoryDef.createLiteralDef(node)
                    );
                }).throw('Invalid Var for a VarDef');
                should(function () {
                    VarDef.validate(
                        factoryVar.create('a'),
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
                        factoryVar.create('a'),
                        factoryDef.createLiteralDef(node)
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
                factoryVar.create('var'),
                factoryDef.createLiteralDef(node)
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
                factoryVar.create('a'),
                factoryDef.createLiteralDef(node)
            );
            varDef._testonly_._var._testonly_._name.should.eql('a');

            varDef._testonly_._def._testonly_._type.should.eql('literal');
            varDef._testonly_._def._testonly_._fromNode._testonly_._cfgId.should.eql(0);
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
                    factoryVar.create('var'),
                    factoryDef.createObjectDef(node)
                );
                VarDef.isVarDef(varDef).should.eql(true);
            });
        });

        describe('toString', function () {
            it('should convert to string well', function () {
                var node = factoryFlowNode.createNormalNode();
                node._testonly_._cfgId = 0;
                var varDef = new VarDef(
                    factoryVar.create('a'),
                    factoryDef.createLiteralDef(node)
                );
                varDef.toString().should.eql('(a,literal@n0)');
            });
        });
    });
});