/*
 * Test cases for FlowNode module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-07
 */
var FlowNode = require('../../lib/esgraph/flownode'),
    Set = require('../../lib/analyses/set'),
    should = require('should');

describe('FlowNode', function () {
    "use strict";
    beforeEach(function () {
	    FlowNode.numOfNodes = 0;
    });

    describe('constructor', function () {
        describe('create object with node type', function () {
            it('should create with default type correctly', function () {
                var node = new FlowNode();
                node._testonly_._type.should.eql('normal');
            });

            it('should create with specified type correctly', function () {
                var node = new FlowNode(FlowNode.EXIT_NODE_TYPE);
                node._testonly_._type.should.eql('exit');

                node = new FlowNode(FlowNode.CALL_NODE_TYPE);
                node._testonly_._type.should.eql('call');

                node = new FlowNode(FlowNode.BRANCH_NODE_TYPE);
                node._testonly_._type.should.eql('branch');

                node = new FlowNode(FlowNode.NORMAL_NODE_TYPE);
                node._testonly_._type.should.eql('normal');
            });

            it('should support to create with type, astNode and parent', function () {
                var node = new FlowNode(FlowNode.ENTRY_NODE_TYPE, {type: 'AssignmentExpression'}, {type: 'Program'});
                should.exist(node._testonly_._astNode);
                should.exist(node._testonly_._parent);

                node._testonly_._astNode.type.should.eql('AssignmentExpression');
                node._testonly_._parent.type.should.eql('Program');
            });

            var single;
            beforeEach(function () {
                single = new FlowNode();
            });
            describe('default values', function () {
                it('should not have astNode', function () {
                    should.not.exist(single._testonly_._astNode);
                });

                it('should not have parent', function () {
                    should.not.exist(single._testonly_._parent);
                });

                it('should not have nextSibling', function () {
                    should.not.exist(single._testonly_._nextSibling);
                });

                it('should not have kill set', function () {
                    should.not.exist(single._testonly_._kill);
                });

                it('should not have generate set', function () {
                    should.not.exist(single._testonly_._generate);
                });

                it('should not have c-use set', function () {
                    should.not.exist(single._testonly_._cuse);
                });

                it('should not have p-use set', function () {
                    should.not.exist(single._testonly_._puse);
                });

                it('should have empty array of previous nodes', function () {
                    single._testonly_._prev.length.should.eql(0);
                });

                it('should have empty array of next nodes', function () {
                    single._testonly_._next.length.should.eql(0);
                });

                it('should not have any connections', function () {
                    should.not.exist(single._testonly_.normal);
                    should.not.exist(single._testonly_.true);
                    should.not.exist(single._testonly_.false);
                    should.not.exist(single._testonly_.exception);
                    should.not.exist(single._testonly_.call);
                    single._testonly_.return.length.should.eql(0);
                    single._testonly_.onEvent.length.should.eql(0);
                });

                it('should not have label yet except for the entry and exit node', function () {
                    var entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE),
                        exit = new FlowNode(FlowNode.EXIT_NODE_TYPE);
                    should.not.exist(single._testonly_._label);
                    should.exist(entry._testonly_._label);
                    should.exist(exit._testonly_._label);

                    entry._testonly_._label.should.eql('entry');
                    exit._testonly_._label.should.eql('exit');
                });

                it('should not set line property yet', function () {
                    should.not.exist(single._testonly_._line);
                });

                it('should not set col property yet', function () {
                    should.not.exist(single._testonly_._col);
                });

                it('should not set scope yet', function () {
                    should.not.exist(single._testonly_._name);
                });

                it('should not have extra ReachIns yet', function () {
                    should.not.exist(single._testonly_._extraReachIns);
                });

                it('should not have extra ReachOuts yet', function () {
                    should.not.exist(single._testonly_._extraReachOuts);
                });

                it('should not have ReachIns yet', function () {
                    should.not.exist(single._testonly_._reachIns);
                });

                it('should not have ReachOuts yet', function () {
                    should.not.exist(single._testonly_._reachOuts);
                });
            });
        });
    });

    describe('static members', function () {
        describe('validateType', function () {
            it('should not throw as the input is a FlowNode', function () {
                should(function () {
                    FlowNode.validateType(new FlowNode('normal'));
                }).not.throw();
            });

            it('should throw as the input is not a FlowNode', function () {
                should(function () {
                    FlowNode.validateType({});
                }).throw('Not a FlowNode');
            });

            it('should support throwing custom error message', function () {
                should(function () {
                    FlowNode.validateType({}, 'Custom Error');
                }).throw('Custom Error');
            });
        });

        describe('isValidNodeType', function () {
            it('should return true as the type is valid', function () {
                should(FlowNode.isValidNodeType('normal')).eql(true);
                should(FlowNode.isValidNodeType('entry')).eql(true);
                should(FlowNode.isValidNodeType('exit')).eql(true);
                should(FlowNode.isValidNodeType('loop')).eql(true);
                should(FlowNode.isValidNodeType('call')).eql(true);
                should(FlowNode.isValidNodeType('callReturn')).eql(true);
                should(FlowNode.isValidNodeType('loopReturn')).eql(true);
                should(FlowNode.isValidNodeType('branch')).eql(true);
                should(FlowNode.isValidNodeType('localStorage')).eql(true);
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
                should(FlowNode.isValidConnectionType('saveStorage')).eql(true);
                should(FlowNode.isValidConnectionType('loadStorage')).eql(true);
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
                    FlowNode.validateTypeValue('invalidType');
                }).throw('Invalid type of FlowNode');

                should(function () {
                    FlowNode.validateTypeValue('');
                }).throw('Invalid type of FlowNode');

                should(function () {
                    FlowNode.validateTypeValue({});
                }).throw('Invalid type of FlowNode');

                should(function () {
                    FlowNode.validateTypeValue();
                }).throw('Invalid type of FlowNode');
            });

            it('should not throw as the type of a FlowNode is valid', function () {
                should(function () {
                    FlowNode.validateTypeValue('normal');
                }).not.throw();

                should(function () {
                    FlowNode.validateTypeValue('entry');
                }).not.throw();

                should(function () {
                    FlowNode.validateTypeValue('exit');
                }).not.throw();

                should(function () {
                    FlowNode.validateTypeValue('loop');
                }).not.throw();

                should(function () {
                    FlowNode.validateTypeValue('call');
                }).not.throw();

                should(function () {
                    FlowNode.validateTypeValue('callReturn');
                }).not.throw();

                should(function () {
                    FlowNode.validateTypeValue('loopReturn');
                }).not.throw();

                should(function () {
                    FlowNode.validateTypeValue('branch');
                }).not.throw();
            });

            it('should support throwing custom error', function () {
                should(function () {
                    FlowNode.validateTypeValue('', 'Custom error');
                }).throw('Custom error');
            });
        });
    });

    describe('methods', function () {
        var nodeA, nodeB;

        beforeEach(function () {
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
                nodeA._testonly_.normal = nodeB;
                nodeA.isConnectedTo(nodeB).should.eql(true);
                nodeB._testonly_.onEvent.push(nodeA);
                nodeB._testonly_.onEvent.length.should.eql(1);
                nodeB.isConnectedTo(nodeA).should.eql(true);
            });
        });

        describe('addPrev', function () {
            it('should not add as the node is not a FlowNode', function () {
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
                FlowNode._testonly_.addPrev(nodeA, nodeB);
                nodeA._testonly_._prev.length.should.eql(1);
                nodeA._testonly_._prev[0].should.eql(nodeB);
            });
        });

        describe('addNext', function () {
            it('should not add as the node is not a FlowNode', function () {
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
                FlowNode._testonly_.addNext(nodeA, nodeB);
                nodeA._testonly_._next.length.should.eql(1);
                nodeA._testonly_._next[0].should.eql(nodeB);
            });
        });

        describe('removePrev', function () {
            it('should not remove as the node is not a FlowNode', function () {
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
                nodeA.connect(nodeB, FlowNode.ON_EVENT_CONNECTION_TYPE);
                nodeA._testonly_.onEvent.length.should.eql(1);
                nodeA._testonly_.onEvent[0].should.eql(nodeB);
                nodeA._testonly_._next[0].should.eql(nodeB);
                nodeB._testonly_._prev[0].should.eql(nodeA);
            });

            it('should support without specified connection type', function () {
                nodeA.connect(nodeB);
                nodeA._testonly_.normal.should.eql(nodeB);
            });
        });

        describe('disconnect', function () {
            it('should disconnect two nodes of ON_EVENT_CONNECTION_TYPE correctly', function () {
                nodeA._testonly_.onEvent.push(nodeB);
                nodeA._testonly_._next.push(nodeB);
                nodeB._testonly_._prev.push(nodeA);

                nodeA.disconnect(nodeB);

                nodeA._testonly_.onEvent.length.should.eql(0);
                nodeA._testonly_._next.length.should.eql(0);
                nodeB._testonly_._prev.length.should.eql(0);
            });

            it('should disconnect two node of other connection types correctly', function () {
                nodeA._testonly_.call = nodeB;
                nodeA._testonly_._next.push(nodeB);
                nodeB._testonly_._prev.push(nodeA);

                nodeA.disconnect(nodeB);

                should.not.exist(nodeA._testonly_.call);
                nodeA._testonly_._next.length.should.eql(0);
                nodeB._testonly_._prev.length.should.eql(0);
            });
        });
    });

    describe('Properties', function () {
        var nodeA, nodeB;

        beforeEach(function () {
            nodeA = new FlowNode(FlowNode.ENTRY_NODE_TYPE);
            nodeB = new FlowNode();
        });

        it('should support to assign and retrieve cfgIds', function () {
            nodeA.cfgId = 0;
            nodeA._testonly_._cfgId.should.eql(0);
            nodeA.cfgId.should.eql(nodeA._testonly_._cfgId);
        });

        it('should support to assign and retrieve astNode and parent', function () {
            nodeA.parent = {type: 'Program'};
            nodeA.astNode = {type: 'AssignmentExpression'};

            nodeA._testonly_._parent.should.eql(nodeA.parent);
            nodeA._testonly_._astNode.should.eql(nodeA.astNode);

            nodeA.parent.type.should.eql('Program');
            nodeA.astNode.type.should.eql('AssignmentExpression');
        });

        it('should support to assign and retrieve type', function () {
            nodeA.type.should.eql('entry');
            nodeA.type = FlowNode.EXIT_NODE_TYPE;
            nodeA.type.should.eql('exit');

            nodeB.type.should.eql('normal');
            nodeB.type = '';
            nodeB.type.should.eql('normal');
        });

        it('should ignore assigning invalid type', function () {
            nodeA.type = '';
            nodeA.type.should.eql('entry');
        });

        it('should support to assign and retrieve next sibling', function () {
            nodeA.nextSibling = nodeB;
            nodeA.nextSibling.should.eql(nodeB);
            should(nodeA._testonly_._nextSibling === nodeA.nextSibling).eql(true);
        });

        it('should ignore assigning non-FlowNode as next sibling', function () {
            nodeA.nextSibling = {};
            should.not.exist(nodeA._testonly_._nextSibling);
        });

        it('should get previous nodes collection', function () {
            nodeA._testonly_._prev.push(nodeB);
            nodeA.prev.length.should.eql(1);
            nodeA.prev[0].should.eql(nodeB);
            should(nodeA.prev === nodeA._testonly_._prev).eql(false);
        });

        it('should get next nodes collection', function () {
            nodeA._testonly_._next.push(nodeB);
            nodeA.next.length.should.eql(1);
            nodeA.next[0].should.eql(nodeB);
            should(nodeA.next === nodeA._testonly_._next).eql(false);
        });

        it('should get normal connection well', function () {
            nodeA._testonly_.normal = nodeB;
            should.exist(nodeA.normal);
            nodeA.normal.should.eql(nodeB);
        });

        it('should get true branch connection well', function () {
            nodeA._testonly_.true = nodeB;
            should.exist(nodeA.true);
            nodeA.true.should.eql(nodeB);
        });

        it('should get false branch connection well', function () {
            nodeA._testonly_.false = nodeB;
            should.exist(nodeA.false);
            nodeA.false.should.eql(nodeB);
        });

        it('should get exception connection well', function () {
            nodeA._testonly_.exception = nodeB;
            should.exist(nodeA.exception);
            nodeA.exception.should.eql(nodeB);
        });

        it('should get call connection well', function () {
            nodeA._testonly_.call = nodeB;
            should.exist(nodeA.call);
            nodeA.call.should.eql(nodeB);
        });

        it('should get return connection well', function () {
            nodeA._testonly_.return = nodeB;
            should.exist(nodeA.return);
            nodeA.return.should.eql(nodeB);
        });

        it('should get onEvent connection well', function () {
            nodeA._testonly_.onEvent.push(nodeB);
            nodeA.onEvent.length.should.eql(1);
            nodeA.onEvent[0].should.eql(nodeB);
        });

        it('should support assign and retrieve label', function () {
            nodeA.label.should.eql('entry');
            nodeA.label = 'none';
            nodeA._testonly_._label.should.eql('none');
            nodeA.label.should.eql(nodeA._testonly_._label);
        });

        it('should ignore non string assignment to label', function () {
            nodeA.label = 1;
            nodeA._testonly_._label.should.eql('entry');
        });

        it('should support assign and retrieve line number', function () {
            nodeA.line = 0;
            nodeA._testonly_._line.should.eql(0);
            nodeA.line.should.eql(nodeA._testonly_._line);
        });

        it('should ignore NaN assignment to line number', function () {
            nodeA.line = '0';
            should.not.exist(nodeA._testonly_._line);
        });

        it('should support assign and retrieve column offset', function () {
            nodeA.col = 1;
            nodeA._testonly_._col.should.eql(1);
            nodeA.col.should.eql(nodeA._testonly_._col);
        });

        it('should ignore NaN assignment to column offset', function () {
            nodeA.col = '1';
            should.not.exist(nodeA._testonly_._col);
        });

        describe('kill', function () {
            it('should support to retrieve the kill set', function () {
                var set = new Set([1]);
                nodeA._testonly_._kill = set;
                nodeA.kill.size.should.eql(1);
                nodeA.kill.has(1).should.eql(true);
            });

            it('should support to modify the kill set, with any set', function () {
                var set = new Set([1,2]);
                nodeB.kill = set;
                nodeB._testonly_._kill.size.should.eql(2);
                nodeB._testonly_._kill.has(1).should.eql(true);
                nodeB._testonly_._kill.has(2).should.eql(true);
            });
        });
    });
});
