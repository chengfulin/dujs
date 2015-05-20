/**
 * Created by ChengFuLin on 2015/5/20.
 */
var FlowNode = require('../../lib/esgraph').FlowNode,
    should = require('should');

describe('FlowNode', function () {
    "use strict";
    describe('resetCounter', function () {
        it('should resetCounter correctly', function () {
            var node1 = new FlowNode(),
                node2 = new FlowNode();
            node1.cfgId.should.eql(0);
            node2.cfgId.should.eql(1);
            FlowNode.numOfFlowNodes.should.eql(2);
            FlowNode.resetCounter();
            FlowNode.numOfFlowNodes.should.eql(0);
        });
    });

    describe('static members', function () {
        beforeEach(function () {
            FlowNode.resetCounter();
        });

        describe('isValidNodeType', function () {
            it('should return true as the type is valid', function () {
                should(FlowNode.isValidNodeType('normal')).eql(true);
                should(FlowNode.isValidNodeType('entry')).eql(true);
                should(FlowNode.isValidNodeType('exit')).eql(true);
                should(FlowNode.isValidNodeType('loop')).eql(true);
                should(FlowNode.isValidNodeType('call')).eql(true);
                should(FlowNode.isValidNodeType('return')).eql(true);
            });

            it('should return false as the type is invalid', function () {
                should(FlowNode.isValidNodeType('invalidType')).eql(false);
                should(FlowNode.isValidNodeType('')).eql(false);
                should(FlowNode.isValidNodeType({})).eql(false);
                should(FlowNode.isValidNodeType()).eql(false);
            });
        });

        describe('isValidConnectionType', function () {
            it('should return true as the type is valid', function () {
                should(FlowNode.isValidConnectionType('normal')).eql(true);
                should(FlowNode.isValidConnectionType('true')).eql(true);
                should(FlowNode.isValidConnectionType('false')).eql(true);
                should(FlowNode.isValidConnectionType('exception')).eql(true);
                should(FlowNode.isValidConnectionType('call')).eql(true);
                should(FlowNode.isValidConnectionType('return')).eql(true);
            });

            it('shoudl return false as the type is invalid', function () {
                should(FlowNode.isValidConnectionType('invalidType')).eql(false);
                should(FlowNode.isValidConnectionType('')).eql(false);
                should(FlowNode.isValidConnectionType({})).eql(false);
                should(FlowNode.isValidConnectionType()).eql(false);
            });
        });

        describe('isFlowNode', function () {
            it('should return true as the object is a FlowNode', function () {
                should(FlowNode.isFlowNode(new FlowNode())).eql(true);
            });

            it('should return false as the object is not a FlowNode', function () {
                should(FlowNode.isFlowNode({})).eql(false);
                should(FlowNode.isFlowNode('text')).eql(false);
                should(FlowNode.isFlowNode()).eql(false);
            });
        });

        describe('validateType', function () {
            it('should throw as the type of a FlowNode is invalid', function () {
                should(function () {
                    FlowNode.validateType('invalidType');
                }).throw('Invalid type of FlowNode');

                should(function () {
                    FlowNode.validateType('');
                }).throw('Invalid type of FlowNode');

                should(function () {
                    FlowNode.validateType({});
                }).throw('Invalid type of FlowNode');

                should(function () {
                    FlowNode.validateType();
                }).throw('Invalid type of FlowNode');
            });

            it('should not throw as the type of a FlowNode is valid', function () {
                should(function () {
                    FlowNode.validateType('normal');
                }).not.throw();

                should(function () {
                    FlowNode.validateType('entry');
                }).not.throw();

                should(function () {
                    FlowNode.validateType('exit');
                }).not.throw();

                should(function () {
                    FlowNode.validateType('loop');
                }).not.throw();

                should(function () {
                    FlowNode.validateType('call');
                }).not.throw();

                should(function () {
                    FlowNode.validateType('return');
                }).not.throw();
            });

            it('should support throwing custom error', function () {
                should(function () {
                    FlowNode.validateType('', 'Custom error');
                }).throw('Custom error');
            });
        });
    });

    describe('methods', function () {

    });
});