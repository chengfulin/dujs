/**
 * Created by chengfulin on 2015/4/20.
 */
var ScopeWrapper = require('../../lib/dujs').ScopeWrapper,
    //Var = require('../../lib/dujs').Var,
    Def = require('../../lib/dujs').Def,
    Scope = require('../../lib/dujs').Scope,
    //Range = require('../../lib/dujs').Range,
    //CfgExt = require('../../lib/dujs').CFGExt,
    //Map = require('core-js/es6/map'),
    Set = require('../../lib/analyses').Set,
    vardefFactory = require('../../lib/dujs').factoryVarDef,
    defFactory = require('../../lib/dujs').factoryDef,
    varFactory = require('../../lib/dujs').factoryVar,
    //FlowNode = require('../../lib/esgraph').FlowNode,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    should = require('should');

describe('ScopeWrapper', function () {
    'use strict';
    describe('Static Methods', function () {
        describe('isValidParent', function () {
            it('should return false as the input is not a ScopeWrapper or null', function () {
                ScopeWrapper.isValidParent({}).should.eql(false);
                ScopeWrapper.isValidParent([]).should.eql(false);
            });

            it('should return true as the input is a ScopeWrapper or null', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createExitNode();
                ScopeWrapper.isValidParent(new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE)).should.eql(true);
                ScopeWrapper.isValidParent(null).should.eql(true);
            });
        });

        describe('isScopeWrapper', function () {
            it('should return false as the input is not a ScopeWrapper', function () {
                ScopeWrapper.isScopeWrapper({}).should.eql(false);
                ScopeWrapper.isScopeWrapper([]).should.eql(false);
                ScopeWrapper.isScopeWrapper().should.eql(false);
            });

            it('should return true as the input is a ScopeWapper', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createExitNode();
                ScopeWrapper.isScopeWrapper(new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE));
            });
        });

        describe('validate', function () {
            it('should throw as the CFG is invalid', function () {
                should(function () {
                    ScopeWrapper.validate([1,2,[1,2]], Scope.PROGRAM_SCOPE);
                }).throw('Invalid CFG for a ScopeWrapper');

                should(function () {
                    ScopeWrapper.validate(null, Scope.PROGRAM_SCOPE);
                }).throw('Invalid CFG for a ScopeWrapper');
            });

            it('should throw as the Scope value is invalid', function () {
                var node1 = factoryFlowNode.createCallNode(),
                    node2 = factoryFlowNode.createCallReturnNode();
                should(function () {
                    ScopeWrapper.validate([node1, node2, [node1, node2]], 'InvalidScope');
                }).throw('Invalid Scope value for a ScopeWrapper');
            });

            it('should support for custom error message', function () {
                should(function () {
                    ScopeWrapper.validate(null, Scope.PROGRAM_SCOPE, 'Custom Error');
                }).throw('Custom Error');
            });

            it('should not throw as the inputs are valid', function () {
                var node1 = factoryFlowNode.createCallNode(),
                    node2 = factoryFlowNode.createCallReturnNode();
                should(function () {
                    ScopeWrapper.validate([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
                }).not.throw();
            });
        });

        describe('validateType', function () {
            it('should throw as the input is not a ScopeWrapper', function () {
                should(function () {
                    ScopeWrapper.validateType({});
                }).throw('Not a ScopeWrapper');

                should(function () {
                    ScopeWrapper.validateType();
                }).throw('Not a ScopeWrapper');
            });

            it('should support custom error message', function () {
                should(function () {
                    ScopeWrapper.validateType({}, 'Custom Error');
                }).throw('Custom Error');
            });

            it('should not throw as the input is a ScopeWrapper', function () {
                var node1 = factoryFlowNode.createCallNode(),
                    node2 = factoryFlowNode.createCallReturnNode();
                should(function () {
                    ScopeWrapper.validateType(new  ScopeWrapper([node1, node2, [node1, node2]], Scope.GLOBAL_SCOPE));
                }).not.throw();
            });
        });
    });

    describe('Constructor', function () {
        it('should construct with value well', function () {
            var node1 = factoryFlowNode.createNormalNode(),
                node2 = factoryFlowNode.createCallNode();
            var wrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.GLOBAL_SCOPE);

            wrapper._testonly_._cfg.length.should.eql(3);
            wrapper._testonly_._cfg[2].length.should.eql(2);
            wrapper._testonly_._cfg[0]._testonly_._type.should.eql('normal');
            wrapper._testonly_._cfg[1]._testonly_._type.should.eql('call');
            wrapper._testonly_._scope._testonly_._type.should.eql('Global');
            should.not.exist(wrapper._testonly_._parent);
            wrapper._testonly_._vars.size.should.eql(0);
            wrapper._testonly_._params.size.should.eql(0);
            wrapper._testonly_._paramNames.length.should.eql(0);
            wrapper._testonly_._initialVars.size.should.eql(0);
            wrapper._testonly_._children.length.should.eql(0);
            should.not.exist(wrapper._testonly_._def);
        });
    });

    describe('Properties', function () {
        var node1, node2, wrapper;
        beforeEach(function () {
            node1 = factoryFlowNode.createEntryNode();
            node2 = factoryFlowNode.createExitNode();
            wrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
        });

        describe('cfg', function () {
            it('should retrieve the value correctly', function () {
                wrapper.cfg.length.should.eql(3);
                wrapper.cfg[0].should.eql(node1);
                wrapper.cfg[1].should.eql(node2);
                wrapper.cfg[2].length.should.eql(2);

                wrapper._testonly_._cfg.should.eql(wrapper.cfg);
            });

            it('should not modified', function () {
                should(function () {
                    wrapper.cfg = [];
                }).throw();
            });
        });

        describe('scope', function () {
            it('should retrieve the value correctly', function () {
                wrapper.scope._testonly_._type.should.eql('Program');
                wrapper._testonly_._scope.should.eql(wrapper.scope);
            });

            it('should not modified', function () {
                should(function () {
                    wrapper.scope = {};
                }).throw();
            });
        });

        describe('parent', function () {
            var node3, node4, parentWrapper;
            beforeEach(function () {
                node3 = factoryFlowNode.createCallNode();
                node4 = factoryFlowNode.createCallReturnNode();
                parentWrapper = new ScopeWrapper([node3, node4, [node3, node4]], Scope.GLOBAL_SCOPE);
            });

            it('should retrieve the value correctly', function () {
                should.not.exist(wrapper.parent);
                wrapper._testonly_._parent = parentWrapper;
                wrapper.parent.should.eql(parentWrapper);
            });

            it('should support to assign the value', function () {
                should(function () {
                    wrapper.parent = parentWrapper;
                }).not.throw();

                wrapper._testonly_._parent.should.eql(wrapper.parent);
                wrapper._testonly_._parent._testonly_._scope._testonly_._type.should.eql('Global');
                wrapper._testonly_._parent._testonly_._cfg[0]._testonly_._type.should.eql('call');
                wrapper._testonly_._parent._testonly_._cfg[1]._testonly_._type.should.eql('callReturn');
            });
        });

        describe('def', function () {
            var def, node;
            beforeEach(function () {
                node = factoryFlowNode.createNormalNode();
                node.cfgId = 0;
                def = new Def(node, Def.LITERAL_TYPE, [0,1], Scope.GLOBAL_SCOPE);
            });

            it('should retrieve the value correctly', function () {
                should.not.exist(wrapper.def);
                wrapper._testonly_._def = def;
                wrapper.def.should.eql(def);
            });

            it('should support to assign the value', function () {
                should(function () {
                    wrapper.def = def;
                }).not.throw();

                wrapper._testonly_._def.should.eql(def);
            });
        });

        describe('vars', function () {
            it('should retrieve the value correctly', function () {
                var tmp = varFactory.create('tmp', [0,1], Scope.PROGRAM_SCOPE);
                wrapper._testonly_._vars.set(tmp.name, tmp);
                wrapper.vars.size.should.eql(1);
                should.exist(wrapper.vars.get('tmp'));
                wrapper.vars.get('tmp').should.eql(tmp);
            });

            it('should not modified', function () {
                should(function () {
                    wrapper.vars = null;
                }).throw();
            });
        });

        describe('params', function () {
            it('should retrieve the value correctly', function () {
                var param = varFactory.create('param', [0,1], Scope.PROGRAM_SCOPE);
                wrapper._testonly_._params.set(param.name, param);
                wrapper.params.size.should.eql(1);
                should.exist(wrapper.params.get('param'));
                wrapper.params.get('param').should.eql(param);
            });

            it('should not modified', function () {
                should(function () {
                    wrapper.params = null;
                }).throw();
            });
        });

        describe('children', function () {
            it('should retrieve the value correctly', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createNormalNode(),
                    childWrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
                wrapper._testonly_._children.push(childWrapper);
                wrapper.children.length.should.eql(1);
                wrapper.children[0].should.eql(childWrapper);
            });
        });
    });

    describe('Methods', function () {
        describe('hasVarWithName', function () {
            var node1, node2, cfg, wrapper, var1;
            beforeEach(function () {
                node1 = factoryFlowNode.createNormalNode();
                node2 = factoryFlowNode.createEntryNode();
                cfg = [node1, node2, [node1, node2]];
                wrapper = new ScopeWrapper(cfg, Scope.PROGRAM_SCOPE);
                var1 = varFactory.create('var1', [0,1], Scope.PROGRAM_SCOPE);

                wrapper._testonly_._vars.set('var1', var1);
            });

            it('should return as the name is valid', function () {
                wrapper.hasVarWithName('var1').should.eql(true);
            });

            it('should return false as the name is invalid', function () {
                wrapper.hasVarWithName('var2').should.eql(false);
                wrapper.hasVarWithName().should.eql(false);
                wrapper.hasVarWithName({}).should.eql(false);
            });
        });

        describe('getVarByName', function () {
            var node1, node2, node3, node4, childWrapper, parentWrapper, var1, var2;
            beforeEach(function () {
                node1 = factoryFlowNode.createEntryNode();
                node2 = factoryFlowNode.createExitNode();
                node3 = factoryFlowNode.createCallNode();
                node4 = factoryFlowNode.createCallReturnNode();

                childWrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
                parentWrapper = new ScopeWrapper([node3, node4, [node3, node4]], Scope.GLOBAL_SCOPE);

                var1 = varFactory.create('var1', [1,2], Scope.PROGRAM_SCOPE);
                var2 = varFactory.create('var2', [0,1], Scope.GLOBAL_SCOPE);

                childWrapper._testonly_._vars.set('var1', var1);
                parentWrapper._testonly_._vars.set('var2', var2);

                childWrapper._testonly_._parent = parentWrapper;
                parentWrapper._testonly_._children.push(childWrapper);
            });

            it('should support to find the var in the current scope', function () {
                should.exist(childWrapper.getVarByName('var1'));
                childWrapper.getVarByName('var1').should.eql(var1);
            });

            it('should support to find the var in the outer scope', function () {
                should.exist(childWrapper.getVarByName('var2'));
                childWrapper.getVarByName('var2').should.eql(var2);
            });
        });

        describe('setInitVars', function () {
            var node1, node2, cfg, wrapper, var1, var2;
            beforeEach(function () {
                node1 = factoryFlowNode.createEntryNode();
                node1.cfgId = 0;
                node2 = factoryFlowNode.createExitNode();
                node2.cfgId = 1;
                cfg = [node1, node2, [node1, node2]];
                wrapper = new ScopeWrapper(cfg, Scope.PROGRAM_SCOPE);
                var1 = varFactory.createGlobalVar('var1');
                var2 = varFactory.createGlobalVar('var2');
                varFactory.resetGlobalsCounter();
            });

            it('should set initial Vars with array of Vars well', function () {
                var vars = [var1, var2];
                wrapper.setInitVars(vars);
                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._vars.get('var1').should.eql(var1);
                wrapper._testonly_._vars.get('var2').should.eql(var2);
                wrapper._testonly_._initialVars.size.should.eql(2);
                wrapper._testonly_._initialVars.get('var1').should.eql(var1);
                wrapper._testonly_._initialVars.get('var2').should.eql(var2);
            });

            it('should set initial Vars with set of Vars well', function () {
                var vars = new Set([var1, var2]);
                wrapper.setInitVars(vars);
                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._vars.get('var1').should.eql(var1);
                wrapper._testonly_._vars.get('var2').should.eql(var2);
                wrapper._testonly_._initialVars.size.should.eql(2);
                wrapper._testonly_._initialVars.get('var1').should.eql(var1);
                wrapper._testonly_._initialVars.get('var2').should.eql(var2);
            });

            it('should support to set initial Vars with VarDefs', function () {
                var def1 = defFactory.createLiteralDef(node1, var1._testonly_._range, var1._testonly_._scope),
                    def2 = defFactory.createLiteralDef(node2, var2._testonly_._range, var2._testonly_._scope),
                    vardef1 = vardefFactory.create(var1, def1),
                    vardef2 = vardefFactory.create(var2, def2),
                    initials = new Set([vardef1, vardef2]);

                wrapper.setInitVars(initials);
                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._vars.get('var1').should.eql(var1);
                wrapper._testonly_._vars.get('var2').should.eql(var2);
                wrapper._testonly_._initialVars.size.should.eql(2);
                wrapper._testonly_._initialVars.get('var1').should.eql(var1);
                wrapper._testonly_._initialVars.get('var2').should.eql(var2);
            });
        });
    });
});