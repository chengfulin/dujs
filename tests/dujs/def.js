/**
 * Created by chengfulin on 2015/4/16.
 */
var Def = require('../../lib/dujs').Def,
    Range = require('../../lib/dujs').Range,
    Scope = require('../../lib/dujs').Scope,
    FlowNode = require('../../lib/esgraph/flownode'),
    should = require('should');

describe('Def', function () {
    'use strict';
    describe('static constants', function () {
        it('should have correct constants', function () {
            Def.OBJECT_TYPE.should.eql('object');
            Def.FUNCTION_TYPE.should.eql('function');
            Def.LITERAL_TYPE.should.eql('literal');

            /// cannot modified
            (function () {
                Def.OBJECT_TYPE = 'non-object';
            }).should.throw();
            (function () {
                Def.FUNCTION_TYPE = 'non-function';
            }).should.throw();
            (function () {
                Def.LITERAL_TYPE = 'non-literal';
            }).should.throw();
        });
    });

    describe('methods', function () {
        describe('fromValidNode', function () {
            it('should return true as the node is a FlowNode', function () {
                var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                node.cfgId = 0;
                Def.fromValidNode(node).should.eql(true);
            });

            it('should return false as the node is not a FlowNode', function () {
                Def.fromValidNode({}).should.eql(false);
            });

            it('should return false as the node does not have cfgId', function () {
                Def.fromValidNode(new FlowNode(FlowNode.NORMAL_NODE_TYPE)).should.eql(false);
            });
        });

        describe('validate', function () {
            it('should throw as the node is invalid', function () {
                (function () {
                    Def.validate(
                        {},
                        'object',
                        new Range(0, 1),
                        new Scope('fun')
                    );
                }).should.throw('Invalid from node of Def');
            });

            it('should throw as the type is invalid', function () {
                should(function () {
                    var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                    node.cfgId = 0;
                    Def.validate(
                        node,
                        'invalidType',
                        new Range(0,1),
                        new Scope('fun')
                    );
                }).throw('Invalid type value of Def');
            });

            it('should throw as the range is invalid', function () {
                should(function () {
                    var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                    node.cfgId = 0;
                    Def.validate(
                        node,
                        'literal',
                        [0],
                        new Scope('fun')
                    );
                }).throw('Invalid range value of Def');
            });

            it('should throw as the scope value is invalid', function () {
                should(function () {
                    var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                    node.cfgId = 0;
                    Def.validate(
                        node,
                        'function',
                        new Range(0,1),
                        {}
                    );
                }).throw('Invalid scope value of Def');
            });

            it('should not throw as the value is valid', function () {
                should(function () {
                    var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                    node.cfgId = 0;
                    Def.validate(
                        node,
                        'function',
                        new Range(0,1),
                        new Scope('fun')
                    );
                }).not.throw();
            });
        });

        describe('validateType', function () {
            it('should validate type well', function () {
                (function () {
                    Def.validateType();
                }).should.throw('Not a Def');
                (function () {
                    Def.validateType({});
                }).should.throw('Not a Def');
                (function () {
                    var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                    node.cfgId = 0;
                    Def.validateType(new Def(node, 'object', [0,1], Scope.PROGRAM_SCOPE));
                }).should.not.throw();
            });
        });

        describe('toString', function () {
            it('should convert to string correctly', function () {
                var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                node1.cfgId = 0;
                node2.cfgId = 1;

                var aDef = new Def(node1, 'object', [0, 1], Scope.PROGRAM_SCOPE),
                    another = new Def(node2, 'literal', [1, 10], new Scope('foo'));
                aDef.toString().should.eql('Def@n0@[0,1]_Program');
                another.toString().should.eql('Def@n1@[1,10]_Function["foo"]');
            });
        });
    });

    describe('constructor', function () {
        it('should construct well', function () {
            var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
            node.cfgId = 0;
            var valid = new Def(
                node,
                'object',
                new Range(0, 1),
                new Scope('fun')
            );
            valid._testonly_.fromCFGNode.should.eql(node);
            valid._testonly_.fromCFGNode._testonly_._cfgId.should.eql(0);
            valid._testonly_.type.should.eql('object');
            valid._testonly_.range._testonly_.start.should.eql(0);
            valid._testonly_.range._testonly_.end.should.eql(1);
            valid._testonly_.scope._testonly_.value.should.eql('fun');
        });
    });
});