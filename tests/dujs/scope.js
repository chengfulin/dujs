/**
 * Created by chengfulin on 2015/4/20.
 */
var ScopeWrapper = require('../../lib/dujs').ScopeWrapper,
    Def = require('../../lib/dujs').Def,
    Scope = require('../../lib/dujs').Scope,
    Range = require('../../lib/dujs').Range,
    CfgExt = require('../../lib/dujs').CFGExt,
    Set = require('../../lib/analyses').Set,
    vardefFactory = require('../../lib/dujs').factoryVarDef,
    defFactory = require('../../lib/dujs').factoryDef,
    varFactory = require('../../lib/dujs').factoryVar,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    factoryRange = require('../../lib/dujs').factoryRange,
    should = require('should');

describe('Scope', function () {
    'use strict';
    beforeEach(function () {
        factoryFlowNode.resetCounter();
    });

    describe('Static Methods', function () {
        describe('isValidParent', function () {
            it('should return false as the input is not a Scope or null', function () {
                ScopeWrapper.isValidParent({}).should.eql(false);
                ScopeWrapper.isValidParent([]).should.eql(false);
            });

            it('should return true as the input is a Scope or null', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createExitNode();
                ScopeWrapper.isValidParent(new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE)).should.eql(true);
                ScopeWrapper.isValidParent(null).should.eql(true);
            });
        });

        describe('isScope', function () {
            it('should return false as the input is not a Scope', function () {
                ScopeWrapper.isScope({}).should.eql(false);
                ScopeWrapper.isScope([]).should.eql(false);
                ScopeWrapper.isScope().should.eql(false);
            });

            it('should return true as the input is a ScopeWapper', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createExitNode();
                ScopeWrapper.isScope(new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE));
            });
        });

        describe('validate', function () {
            it('should throw as the CFG is invalid', function () {
                should(function () {
                    ScopeWrapper.validate([1,2,[1,2]], Scope.PROGRAM_SCOPE);
                }).throw('Invalid CFG for a Scope');

                should(function () {
                    ScopeWrapper.validate(null, Scope.PROGRAM_SCOPE);
                }).throw('Invalid CFG for a Scope');
            });

            it('should throw as the Scope value is invalid', function () {
                var node1 = factoryFlowNode.createCallNode(),
                    node2 = factoryFlowNode.createCallReturnNode();
                should(function () {
                    ScopeWrapper.validate([node1, node2, [node1, node2]], 'InvalidScope');
                }).throw('Invalid Scope value for a Scope');
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
            it('should throw as the input is not a Scope', function () {
                should(function () {
                    ScopeWrapper.validateType({});
                }).throw('Not a Scope');

                should(function () {
                    ScopeWrapper.validateType();
                }).throw('Not a Scope');
            });

            it('should support custom error message', function () {
                should(function () {
                    ScopeWrapper.validateType({}, 'Custom Error');
                }).throw('Custom Error');
            });

            it('should not throw as the input is a Scope', function () {
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
            wrapper._testonly_._name._testonly_._type.should.eql('Global');
            should.not.exist(wrapper._testonly_._parent);
            wrapper._testonly_._vars.size.should.eql(0);
            wrapper._testonly_._params.size.should.eql(0);
            wrapper._testonly_._paramNames.length.should.eql(0);
            wrapper._testonly_._children.size.should.eql(0);
            should.not.exist(wrapper._testonly_._def);

            wrapper._testonly_._cfg[2].forEach(function (node) {
                node._testonly_._name.should.eql(wrapper);
            });
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

        describe('range', function () {
            it('should retrieve the value correctly', function () {
                should.not.exist(wrapper.range);
                wrapper._testonly_._range = new Range(1,2);
                should.exist(wrapper.range);
                wrapper.range._testonly_._start.should.eql(1);
                wrapper.range._testonly_._end.should.eql(2);
            });

            it('should support to modify value', function () {
                wrapper.range = new Range(2,3);
                wrapper._testonly_._range._testonly_._start.should.eql(2);
                wrapper._testonly_._range._testonly_._end.should.eql(3);
            });
        });

        describe('scope', function () {
            it('should retrieve the value correctly', function () {
                wrapper.scope._testonly_._type.should.eql('Program');
                wrapper._testonly_._name.should.eql(wrapper.scope);
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
                wrapper._testonly_._parent._testonly_._name._testonly_._type.should.eql('Global');
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
                wrapper._testonly_._children.set(factoryRange.create(0,1).toString(), childWrapper);
                wrapper.children.size.should.eql(1);
                should.exist(wrapper.children.get('[0,1]'));
                wrapper.children.get('[0,1]').should.eql(childWrapper);
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
                var2 = varFactory.create('var2', factoryRange.createGlobalRange(), Scope.GLOBAL_SCOPE);

                childWrapper._testonly_._vars.set('var1', var1);
                parentWrapper._testonly_._vars.set('var2', var2);

                childWrapper._testonly_._parent = parentWrapper;
                parentWrapper._testonly_._children.set(factoryRange.create(0,1).toString(), childWrapper);
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

        describe('setInitVarDefs', function () {
            var node1, node2, wrapper, vardef1, vardef2;
            beforeEach(function () {
                var programScope = Scope.PROGRAM_SCOPE;
                node1 = factoryFlowNode.createEntryNode();
                node2 = factoryFlowNode.createExitNode();
                node1._testonly_._cfgId = 0;
                node2._testonly_._cfgId = 1;
                wrapper = new ScopeWrapper([node1, node2, [node1, node2]], programScope);

                var variable1 = varFactory.create('var1', [0,1], programScope, null),
                    def1 = defFactory.createLiteralDef(node1, [1,2], programScope),
                    variable2 = varFactory.create('var2', [2,3], programScope, null),
                    def2 = defFactory.createLiteralDef(node1, [3,4], programScope);
                vardef1 = vardefFactory.create(variable1, def1);
                vardef2 = vardefFactory.create(variable2, def2);
            });

            it('should support non-empty array of VarDefs', function () {
                var varDefs = [vardef1, vardef2];
                wrapper.setInitVarDefs(varDefs);
                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._cfg[0]._testonly_._generate.size.should.eql(2);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef1).should.eql(true);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef2).should.eql(true);
            });

            it('should support non-empty set of VarDefs', function () {
                var varDefs = new Set([vardef1, vardef2]);
                wrapper.setInitVarDefs(varDefs);
                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._cfg[0]._testonly_._generate.size.should.eql(2);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef1).should.eql(true);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef2).should.eql(true);
            });

            it('should ignore as empty set of VarDefs', function () {
                var varDefs = new Set();
                wrapper.setInitVarDefs(varDefs);
                wrapper._testonly_._vars.size.should.eql(0);
                should.not.exist(wrapper._testonly_._cfg[0]._testonly_._generate);
            });

            it('should add only valid VarDefs', function () {
                var varDefs = new Set([vardef1, {}]);
                wrapper.setInitVarDefs(varDefs);
                wrapper._testonly_._vars.size.should.eql(1);
                wrapper._testonly_._cfg[0]._testonly_._generate.size.should.eql(1);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef1).should.eql(true);
            });
        });

        describe('setVars', function () {
            it('should support to variable declaration', function () {
                var cfg = CfgExt.getCFG(CfgExt.parseAST(
                        'var a;' +
                        'var b = 0, c = {};'
                    )),
                    wrapper = new ScopeWrapper(cfg, Scope.PROGRAM_SCOPE);
                wrapper.setVars();
                wrapper._testonly_._vars.size.should.eql(3);
                wrapper._testonly_._vars.has('a').should.eql(true);
                wrapper._testonly_._vars.has('b').should.eql(true);
                wrapper._testonly_._vars.has('c').should.eql(true);

                wrapper._testonly_._vars.get('a')._testonly_._range._testonly_._start.should.eql(4);
                wrapper._testonly_._vars.get('b')._testonly_._range._testonly_._start.should.eql(10);
                wrapper._testonly_._vars.get('c')._testonly_._range._testonly_._start.should.eql(17);
            });
        });

        describe('setParams', function () {
            var node1, node2, cfg, wrapper, param1, param2;
            beforeEach(function () {
                node1 = factoryFlowNode.createEntryNode();
                node1.cfgId = 0;
                node2 = factoryFlowNode.createExitNode();
                node2.cfgId = 1;
                cfg = [node1, node2, [node1, node2]];
                wrapper = new ScopeWrapper(cfg, Scope.PROGRAM_SCOPE);
                param1 = varFactory.createGlobalVar('param1');
                param2 = varFactory.createGlobalVar('param2');
            });

            it('should support to set initial Vars with VarDefs', function () {
                var def1 = defFactory.createLiteralDef(node1, param1._testonly_._range, param1._testonly_._name),
                    def2 = defFactory.createLiteralDef(node2, param2._testonly_._range, param2._testonly_._name),
                    vardef1 = vardefFactory.create(param1, def1),
                    vardef2 = vardefFactory.create(param2, def2),
                    params = new Set([vardef1, vardef2]);

                wrapper.setParams(params);
                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._vars.get('param1').should.eql(param1);
                wrapper._testonly_._vars.get('param2').should.eql(param2);
                wrapper._testonly_._params.size.should.eql(2);
                wrapper._testonly_._params.get('param1').should.eql(param1);
                wrapper._testonly_._params.get('param2').should.eql(param2);

                wrapper._testonly_._paramNames.length.should.eql(2);
                wrapper._testonly_._paramNames.should.containDeepOrdered([
                    'param1',
                    'param2'
                ]);

                /// GEN set of start node
                wrapper._testonly_._cfg[0]._testonly_._generate.size.should.eql(2);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef1).should.eql(true);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef2).should.eql(true);
            });
        });

        describe('Both setParam and setInitVarDefs', function () {
            var node1, node2, wrapper, vardef1, paramVarDef;
            beforeEach(function () {
                var programScope = Scope.PROGRAM_SCOPE;
                node1 = factoryFlowNode.createEntryNode();
                node2 = factoryFlowNode.createExitNode();
                node1._testonly_._cfgId = 0;
                node2._testonly_._cfgId = 1;
                wrapper = new ScopeWrapper([node1, node2, [node1, node2]], programScope);

                var variable1 = varFactory.create('var1', [0,1], programScope, null),
                    def1 = defFactory.createLiteralDef(node1, [1,2], programScope),
                    paramVar = varFactory.create('param', [2,3], wrapper._testonly_._name, null),
                    paramDef = defFactory.createLiteralParamDef(wrapper, [3,4]);
                vardef1 = vardefFactory.create(variable1, def1);
                paramVarDef = vardefFactory.create(paramVar, paramDef);
            });

            it('should support do setInitVarDefs first then setParam', function () {
                wrapper.setInitVarDefs(new Set([vardef1]));
                wrapper.setParams(new Set([paramVarDef]));

                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._vars.has('var1').should.eql(true);
                wrapper._testonly_._vars.has('param').should.eql(true);

                wrapper._testonly_._params.size.should.eql(1);
                wrapper._testonly_._params.has('param').should.eql(true);

                wrapper._testonly_._cfg[0]._testonly_._generate.size.should.eql(2);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef1).should.eql(true);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(paramVarDef).should.eql(true);
            });

            it('should support do setParam first then setInitVarDefs', function () {
                wrapper.setParams(new Set([paramVarDef]));
                wrapper.setInitVarDefs(new Set([vardef1]));

                wrapper._testonly_._vars.size.should.eql(2);
                wrapper._testonly_._vars.has('var1').should.eql(true);
                wrapper._testonly_._vars.has('param').should.eql(true);

                wrapper._testonly_._params.size.should.eql(1);
                wrapper._testonly_._params.has('param').should.eql(true);

                wrapper._testonly_._cfg[0]._testonly_._generate.size.should.eql(2);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(vardef1).should.eql(true);
                wrapper._testonly_._cfg[0]._testonly_._generate.has(paramVarDef).should.eql(true);
            });
        });

        describe('getParamNameWithIndex', function () {
            var node1, node2, wrapper;
            beforeEach(function () {
                node1 = factoryFlowNode.createEntryNode();
                node2 = factoryFlowNode.createExitNode();
                wrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
            });

            it('should return empty as the index is invalid', function () {
                should.not.exist(wrapper.getParamNameWithIndex(0));
                wrapper._testonly_._paramNames.push('param1');
                should.not.exist(wrapper.getParamNameWithIndex(1));
            });

            it('should get the correct parameter name with index', function () {
                wrapper._testonly_._paramNames.push('param1');
                wrapper._testonly_._paramNames.push('param2');
                wrapper.getParamNameWithIndex(0).should.eql('param1');
                wrapper.getParamNameWithIndex(1).should.eql('param2');
            });
        });

        describe('toString', function () {
            it('should represent as string correctly', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createExitNode();
                node1.cfgId = 0;
                node2.cfgId = 1;
                var wrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE),
                    anotherWrapper = new ScopeWrapper([node1, node2, [node1, node2]], new Scope('foo'));

                wrapper.toString().should.eql('Program_Entry@n0');
                anotherWrapper.toString().should.eql('Function["foo"]_Entry@n0');
            });
        });

        describe('addChild', function () {
            var node1, node2, wrapper;
            beforeEach(function () {
                node1 = factoryFlowNode.createEntryNode();
                node2 = factoryFlowNode.createExitNode();
                wrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
            });

            it('should ignore as the input is not a Scope', function () {
                wrapper.addChild({});
                wrapper._testonly_._children.size.should.eql(0);
            });

            it('should ignore as the child is existed', function () {
                var childWrapper = new ScopeWrapper([node2, node1, [node2, node1]], new Scope('foo'));
                childWrapper._testonly_._range = factoryRange.create(0,1);
                wrapper._testonly_._children.set('[0,1]', childWrapper);
                wrapper.addChild(childWrapper);
                wrapper._testonly_._children.size.should.eql(1);
            });

            it('should ignore as the input Scope does not have range property', function () {
                var childWrapper = new ScopeWrapper([node2, node1, [node2, node1]], new Scope('foo'));
                wrapper.addChild(childWrapper);
                wrapper._testonly_._children.size.should.eql(0);
            });

            it('should add a Scope with range as a child', function () {
                var childWrapper = new ScopeWrapper([node2, node1, [node2, node1]], new Scope('foo'));
                childWrapper._testonly_._range = factoryRange.create(0,1);
                wrapper.addChild(childWrapper);
                wrapper._testonly_._children.size.should.eql(1);
                should.exist(wrapper._testonly_._children.get('[0,1]'));
                wrapper._testonly_._children.get('[0,1]').should.eql(childWrapper);
                /// check relation
                childWrapper.parent.should.eql(wrapper);
            });
        });

        describe('getChildByRange', function () {
            var node1, node2, parentWrapper, childWrapper;
            beforeEach(function () {
                node1 = factoryFlowNode.createNormalNode();
                node2 = factoryFlowNode.createNormalNode();
                parentWrapper = new ScopeWrapper([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
                childWrapper = new ScopeWrapper([node2, node1, [node2, node1]], new Scope('foo'));
                childWrapper._testonly_._range = factoryRange.create(0,1);
                parentWrapper._testonly_._children.set('[0,1]', childWrapper);
                childWrapper._testonly_._parent = parentWrapper;
            });

            it('should get child by valid range value correctly', function () {
                parentWrapper.getChildByRange([0,1]).should.eql(childWrapper);
                parentWrapper.getChildByRange(factoryRange.create(0,1)).should.eql(childWrapper);
            });

            it('should get nothing as the range value is invalid', function () {
                should.not.exist(parentWrapper.getChildByRange([0,2]));
                should.not.exist(parentWrapper.getChildByRange({}));
                should.not.exist(parentWrapper.getChildByRange());
            });
        });
    });
});