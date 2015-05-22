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
                should(FlowNode.isValidNodeType('branch')).eql(true);
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
                should(FlowNode.isValidConnectionType('onEvent')).eql(true);
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

                should(function () {
                    FlowNode.validateType('branch');
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
        var nodeA, nodeB;

        beforeEach(function () {
            FlowNode.resetCounter();
            nodeA = new FlowNode(FlowNode.ENTRY_NODE_TYPE);
            nodeB = new FlowNode();
        });

        describe('hasPrev', function () {
            it('should return false asa the node is not a previous node of this node', function () {
                nodeB.hasPrev(nodeA).should.eql(false);
                nodeA.hasPrev(nodeB).should.eql(false);
            });

            it('should return true as the node exists in the collection of the node', function () {
                nodeB._testonly_._prev.push(nodeA);
                nodeB.hasPrev(nodeA).should.eql(true);
                nodeA._testonly_._prev.push(nodeB);
                nodeA.hasPrev(nodeB).should.eql(true);
            });
        });

        describe('hasNext', function () {
            it('should return false asa the node is not a next node of this node', function () {
                nodeB.hasNext(nodeA).should.eql(false);
                nodeA.hasNext(nodeB).should.eql(false);
            });

            it('should return true as the node exists in the collection of the node', function () {
                nodeA._testonly_._next.push(nodeB);
                nodeA.hasNext(nodeB).should.eql(true);
                nodeB._testonly_._next.push(nodeA);
                nodeB.hasNext(nodeA).should.eql(true);
            });
        });

        describe('isConnectedTo', function () {
            it('should return false as there is no connection between these two nodes', function () {
                nodeA.isConnectedTo(nodeB).should.eql(false);
                nodeB.isConnectedTo(nodeA).should.eql(false);
            });

            it('should return true as there is any connection between there two nodes', function () {
                should.not.exist(nodeA._testonly_.normal);
                should.exist(nodeA._testonly_.onEvent);
                should(nodeA._testonly_.onEvent instanceof Array).eql(true);
                nodeA._testonly_.normal = nodeB;
                nodeA.isConnectedTo(nodeB).should.eql(true);
                nodeB._testonly_.onEvent.push(nodeA);
                nodeB._testonly_.onEvent.length.should.eql(1);
                nodeB.isConnectedTo(nodeA).should.eql(true);
            });
        });

        describe('addPrev', function () {
            it('should not add as the node is not a FlowNode', function () {
                nodeA._testonly_._prev.length.should.eql(0);
                FlowNode._testonly_.addPrev(nodeA, {});
                nodeA._testonly_._prev.length.should.eql(0);

                nodeA._testonly_._prev.push(nodeB);
                nodeA._testonly_._prev.length.should.eql(1);
                FlowNode._testonly_.addPrev(nodeA, {});
                nodeA._testonly_._prev.length.should.eql(1);
                nodeA._testonly_._prev[0].should.eql(nodeB);
            });

            it('should not add as the node is already in the collection', function () {
                nodeA._testonly_._prev.push(nodeB);
                nodeA._testonly_._prev.length.should.eql(1);
                FlowNode._testonly_.addPrev(nodeA, nodeB);
                nodeA._testonly_._prev.length.should.eql(1);
                nodeA._testonly_._prev[0].should.eql(nodeB);
            });

            it('should add successfully as the node is not a previous node of this node', function () {
                nodeA._testonly_._prev.length.should.eql(0);
                FlowNode._testonly_.addPrev(nodeA, nodeB);
                nodeA._testonly_._prev.length.should.eql(1);
                nodeA._testonly_._prev[0].should.eql(nodeB);
            });
        });

        describe('addNext', function () {
            it('should not add as the node is not a FlowNode', function () {
                nodeA._testonly_._next.length.should.eql(0);
                FlowNode._testonly_.addNext(nodeA, {});
                nodeA._testonly_._next.length.should.eql(0);

                nodeA._testonly_._next.push(nodeB);
                nodeA._testonly_._next.length.should.eql(1);
                FlowNode._testonly_.addNext(nodeA, {});
                nodeA._testonly_._next.length.should.eql(1);
                nodeA._testonly_._next[0].should.eql(nodeB);
            });

            it('should not add as the node is already in the collection', function () {
                nodeA._testonly_._next.push(nodeB);
                nodeA._testonly_._next.length.should.eql(1);
                FlowNode._testonly_.addNext(nodeA, nodeB);
                nodeA._testonly_._next.length.should.eql(1);
                nodeA._testonly_._next[0].should.eql(nodeB);
            });

            it('should add successfully as the node is not a next node of this node', function () {
                nodeA._testonly_._next.length.should.eql(0);
                FlowNode._testonly_.addNext(nodeA, nodeB);
                nodeA._testonly_._next.length.should.eql(1);
                nodeA._testonly_._next[0].should.eql(nodeB);
            });
        });

        describe('removePrev', function () {
            it('should not remove as the node is not a FlowNode', function () {
                nodeA._testonly_._prev.length.should.eql(0);
                FlowNode._testonly_.removePrev(nodeA, {});
                nodeA._testonly_._prev.length.should.eql(0);

                nodeA._testonly_._prev.push(nodeB);
                nodeA._testonly_._prev.length.should.eql(1);
                FlowNode._testonly_.removePrev(nodeA, {});
                nodeA._testonly_._prev.length.should.eql(1);
                nodeA._testonly_._prev[0].should.eql(nodeB);
            });

            it('should not remove as the node is not a previous node of this node', function () {
                nodeA._testonly_._next.push(nodeB);
                FlowNode._testonly_.removePrev(nodeA, nodeB);
                nodeA._testonly_._prev.length.should.eql(0);
            });

            it('should remove successfully as the node is in the collection', function () {
                nodeA._testonly_._prev.push(nodeB);
                nodeA._testonly_._prev.length.should.eql(1);
                FlowNode._testonly_.removePrev(nodeA, nodeB);
                nodeA._testonly_._prev.length.should.eql(0);
            });
        });

        describe('removeNext', function () {
            it('should not remove as the node is not a FlowNode', function () {
                nodeA._testonly_._next.length.should.eql(0);
                FlowNode._testonly_.removeNext(nodeA, {});
                nodeA._testonly_._next.length.should.eql(0);

                nodeA._testonly_._next.push(nodeB);
                nodeA._testonly_._next.length.should.eql(1);
                FlowNode._testonly_.removeNext(nodeA, {});
                nodeA._testonly_._next.length.should.eql(1);
                nodeA._testonly_._next[0].should.eql(nodeB);
            });

            it('should not remove as the node is not a previous node of this node', function () {
                nodeA._testonly_._prev.push(nodeB);
                FlowNode._testonly_.removeNext(nodeA, nodeB);
                nodeA._testonly_._next.length.should.eql(0);
            });

            it('should remove successfully as the node is in the collection', function () {
                nodeA._testonly_._next.push(nodeB);
                nodeA._testonly_._next.length.should.eql(1);
                FlowNode._testonly_.removeNext(nodeA, nodeB);
                nodeA._testonly_._next.length.should.eql(0);
            });
        });

        describe('connect', function () {
            it('should connect two nodes with ON_EVENT_CONNECTION_TYPE correctly', function () {
                should.exist(nodeA._testonly_.onEvent);
                nodeA._testonly_.onEvent.length.should.eql(0);
                nodeA._testonly_._next.length.should.eql(0);
                nodeB._testonly_._prev.length.should.eql(0);

                nodeA.connect(nodeB, FlowNode.ON_EVENT_CONNECTION_TYPE);
                nodeA._testonly_.onEvent.length.should.eql(1);
                nodeA._testonly_.onEvent[0].should.eql(nodeB);
                nodeA._testonly_._next[0].should.eql(nodeB);
                nodeB._testonly_._prev[0].should.eql(nodeA);
            });
        });
    });
});