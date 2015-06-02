/**
 * Created by chengfulin on 2015/4/16.
 */
var Def = require('../../lib/dujs').Def,
    Scope = require('../../lib/dujs').Scope,
    FlowNode = require('../../lib/esgraph/flownode'),
    should = require('should');

describe('Def', function () {
    'use strict';
    describe('static constants', function () {
        it('should have correct constants', function () {
            Def.OBJECT_TYPE.should.eql('Object');
            Def.FUNCTION_TYPE.should.eql('Function');
            Def.LITERAL_TYPE.should.eql('Literal');
            Def.UNDEFINED_TYPE.should.eql('Undefined');
            Def.HTML_DOM_TYPE.should.eql('HTMLDOM');

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
            (function () {
                Def.LITERAL_TYPE = 'not-undefined';
            }).should.throw();
            (function () {
                Def.LITERAL_TYPE = 'not-HTML-DOM';
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
                        'Object',
                        new Scope('Function', null, 'foo')
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
                        new Scope('Function', null, 'foo')
                    );
                }).throw('Invalid type value of Def');
            });

            it('should throw as the scope value is invalid', function () {
                should(function () {
                    var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                    node.cfgId = 0;
                    Def.validate(
                        node,
                        'Function',
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
                        'Function',
                        new Scope('Function', null, 'foo')
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
                    Def.validateType(new Def(node, 'Object', new Scope('Program', null, '!PROGRAM')));
                }).should.not.throw();
            });
        });

        describe('toString', function () {
            it('should convert to string correctly', function () {
                var node1 = new FlowNode(FlowNode.NORMAL_NODE_TYPE),
                    node2 = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                node1.cfgId = 0;
                node2.cfgId = 1;

                var aDef = new Def(node1, 'Object', new Scope('Program', null, '!PROGRAM')),
                    another = new Def(node2, 'Literal', new Scope('Function', null, 'foo'));
                console.log(new Scope('Program', null, '!PROGRAM').toString());
                aDef.toString().should.eql('Object@n0@Program');
                another.toString().should.eql('Literal@n1@Function["foo"]');
            });
        });
    });

    describe('constructor', function () {
        it('should construct well', function () {
            var node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
            node.cfgId = 0;
            var valid = new Def(
                node,
                'Object',
                new Scope('Function', null, 'foo')
            );
            valid._testonly_._fromCFGNode.should.eql(node);
            valid._testonly_._fromCFGNode._testonly_._cfgId.should.eql(0);
            valid._testonly_._type.should.eql('Object');
            valid._testonly_._scope._testonly_._value.should.eql('foo');
        });
    });
});