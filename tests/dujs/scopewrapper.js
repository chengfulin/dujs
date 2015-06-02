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
    //Set = require('../../lib/analyses').Set,
    //vardefFactory = require('../../lib/dujs').factoryVarDef,
    //varFactory = require('../../lib/dujs').factoryVar,
    FlowNode = require('../../lib/esgraph').FlowNode,
    should = require('should');

describe('ScopeWrapper', function () {
    'use strict';
    var monkVar = (function () {
            function Var(name) {
                this.name = name;
            }
            return {
                create: function (name) {
                    return new Var(name);
                }
            };
        }()),
        monkWrapper = (function () {
            function ScopeWrapper(cfg, scope) {
                this.cfg = cfg;
                this.scope = scope;
            }
            return {
                create: function (cfg, scope) {
                    return new ScopeWrapper(cfg, scope);
                }
            };
        } ());

    describe('Static Methods', function () {
        describe('isValidParent', function () {
            it('should return false as the input is not a ScopeWrapper or null', function () {
                ScopeWrapper.isValidParent({}).should.eql(false);
                ScopeWrapper.isValidParent([]).should.eql(false);
            });

            it('should return true as the input is a ScopeWrapper or null', function () {
                var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.EXIT_NODE_TYPE);
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
                var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.EXIT_NODE_TYPE);
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
                var node1 = new FlowNode(FlowNode.CALL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE);
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
                var node1 = new FlowNode(FlowNode.CALL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE);
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
                var node1 = new FlowNode(FlowNode.CALL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE);
                should(function () {
                    ScopeWrapper.validateType(new  ScopeWrapper([node1, node2, [node1, node2]], Scope.GLOBAL_SCOPE));
                }).not.throw();
            });
        });
    });

    describe('Constructor', function () {
        it('should construct with value well', function () {
            var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                node2 = new FlowNode(FlowNode.CALL_NODE_TYPE);
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
            node1 = new FlowNode(FlowNode.ENTRY_NODE_TYPE);
            node2 = new FlowNode(FlowNode.EXIT_NODE_TYPE);
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
                node3 = new FlowNode(FlowNode.CALL_NODE_TYPE);
                node4 = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE);
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
                node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
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
                var monkedVar = monkVar.create('tmp');
                wrapper._testonly_._vars.set(monkedVar.name, monkedVar);
                wrapper.vars.size.should.eql(1);
                should.exist(wrapper.vars.get('tmp'));
                wrapper.vars.get('tmp').should.eql(monkedVar);
            });

            it('should not modified', function () {
                should(function () {
                    wrapper.vars = null;
                }).throw();
            });
        });

        describe('params', function () {
            it('should retrieve the value correctly', function () {
                var monkedParam = monkVar.create('param');
                wrapper._testonly_._params.set(monkedParam.name, monkedParam);
                wrapper.params.size.should.eql(1);
                should.exist(wrapper.params.get('param'));
                wrapper.params.get('param').should.eql(monkedParam);
            });

            it('should not modified', function () {
                should(function () {
                    wrapper.params = null;
                }).throw();
            });
        });

        describe('children', function () {
            it('should retrieve the value correctly', function () {
                var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    monkedWrapper = monkWrapper.create([node1, node2, [node1, node2]], Scope.PROGRAM_SCOPE);
                wrapper._testonly_._children.push(monkedWrapper);
                wrapper.children.length.should.eql(1);
                wrapper.children[0].should.eql(monkedWrapper);
            });
        });
    });
});