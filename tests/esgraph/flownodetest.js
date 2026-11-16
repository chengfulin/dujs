/*
 * Test cases for FlowNode class
 * @lastmodifiedBy ChengFuLin
 */
var FlowNode = require('../../lib/esgraph/flownode'),
    Set = require('../../lib/analyses').Set,
    should = require('should');

describe('FlowNode', function () {
    "use strict";

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
                it('should not have cfgId yet', function () {
                    should.not.exist(single._testonly_._cfgId);
                });

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

        describe('toJSON', function () {
	        var entryNode, normalNode, exitNode, callNode, callReturnNode, loopNode, loopReturnNode, localStorageNode, branchNode;
	        beforeEach(function () {
		        entryNode = new FlowNode(FlowNode.ENTRY_NODE_TYPE);
		        entryNode.cfgId = 0;
		        entryNode.label = 'entry';
		        normalNode = new FlowNode();
		        normalNode.cfgId = 1;
		        normalNode.label = '1';
		        exitNode = new FlowNode(FlowNode.EXIT_NODE_TYPE);
		        exitNode.cfgId = 2;
		        exitNode.label = 'exit';
		        callNode = new FlowNode(FlowNode.CALL_NODE_TYPE);
		        callNode.cfgId = 3;
		        callNode.label = 'call';
		        callReturnNode = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE);
		        callReturnNode.cfgId = 4;
		        callReturnNode.label = 'callReturn';
		        loopNode = new FlowNode(FlowNode.LOOP_NODE_TYPE);
		        loopNode.cfgId = 5;
		        loopNode.label = 'loop';
		        loopReturnNode = new FlowNode(FlowNode.LOOP_RETURN_NODE_TYPE);
		        loopReturnNode.cfgId = 6;
		        loopReturnNode.label = 'loopReturn';
		        localStorageNode = new FlowNode(FlowNode.LOCAL_STORAGE_NODE_TYPE);
		        localStorageNode.cfgId = 7;
		        localStorageNode.label = 'localStorage';
		        branchNode = new FlowNode(FlowNode.BRANCH_NODE_TYPE);
		        branchNode.cfgId = 8;
		        branchNode.label = '8';
	        });

	        it('should contain correct information', function () {
		        entryNode.toJSON().should.eql('{"id":0,"label":"entry","type":"entry"}');
		        normalNode.toJSON().should.eql('{"id":1,"label":"1","type":"normal"}');
		        exitNode.toJSON().should.eql('{"id":2,"label":"exit","type":"exit"}');
		        callNode.toJSON().should.eql('{"id":3,"label":"call","type":"call"}');
		        callReturnNode.toJSON().should.eql('{"id":4,"label":"callReturn","type":"callReturn"}');
		        loopNode.toJSON().should.eql('{"id":5,"label":"loop","type":"loop"}');
		        loopReturnNode.toJSON().should.eql('{"id":6,"label":"loopReturn","type":"loopReturn"}');
		        localStorageNode.toJSON().should.eql('{"id":7,"label":"localStorage","type":"localStorage"}');
		        branchNode.toJSON().should.eql('{"id":8,"label":"8","type":"branch"}');
	        });

	        it('should not contain connection information', function () {
		        entryNode._testonly_.normal = normalNode;
		        entryNode._testonly_._next.push(normalNode);
		        normalNode._testonly_._prev.push(entryNode);
		        entryNode.toJSON().should.eql('{"id":0,"label":"entry","type":"entry"}');
		        normalNode.toJSON().should.eql('{"id":1,"label":"1","type":"normal"}');
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
    /// fields for branch splitting, with statements and loop heads
    /// (specs/002-small-refactors data-model §1: split and labelPath replace preEvaluated, branchPath and splitOrigin)
    describe('branch splitting fields', function () {
        var node, origin;
        beforeEach(function () {
            node = new FlowNode(FlowNode.NORMAL_NODE_TYPE, {type: 'Identifier', name: 'a'});
            origin = {type: 'ExpressionStatement'};
        });

        it('should have null split by default', function () {
            should(node.split).be.null();
        });

        it('should have empty labelPath by default', function () {
            node.labelPath.should.eql('');
        });

        it('should have false isWithObject by default', function () {
            node.isWithObject.should.eql(false);
        });

        it('should have false loopRightSplit by default', function () {
            node.loopRightSplit.should.eql(false);
        });

        it('should have false discriminantSplit by default', function () {
            node.discriminantSplit.should.eql(false);
        });

        it('should support to assign the flags', function () {
            node.isWithObject = true;
            node.loopRightSplit = true;
            node.discriminantSplit = true;
            node.isWithObject.should.eql(true);
            node.loopRightSplit.should.eql(true);
            node.discriminantSplit.should.eql(true);
        });

        describe('split', function () {
            it('should store a copy of a valid split', function () {
                var pre = {type: 'Identifier', name: 'b'}, info = {path: 'TF', origin: origin, preEvaluated: [pre]};
                node.split = info;
                node.split.should.not.equal(info);
                node.split.path.should.eql('TF');
                node.split.origin.should.equal(origin);
                node.split.preEvaluated.should.eql([pre]);
                node.split.preEvaluated[0].should.equal(pre);
                node.split.preEvaluated.should.not.equal(info.preEvaluated);
            });

            it('should have empty preEvaluated when it is omitted', function () {
                node.split = {path: '', origin: origin};
                node.split.preEvaluated.should.eql([]);
            });

            it('should not keep the changes of the assigned object and array', function () {
                var pre = [{type: 'Identifier', name: 'b'}], info = {path: 'T', origin: origin, preEvaluated: pre};
                node.split = info;
                info.path = 'F';
                pre.push({type: 'Identifier', name: 'c'});
                node.split.path.should.eql('T');
                node.split.preEvaluated.length.should.eql(1);
            });

            it('should return the same frozen object', function () {
                node.split = {path: 'T', origin: origin, preEvaluated: []};
                node.split.should.equal(node.split);
                Object.isFrozen(node.split).should.eql(true);
                Object.isFrozen(node.split.preEvaluated).should.eql(true);
            });

            it('should throw on writing the frozen split in strict mode', function () {
                node.split = {path: 'T', origin: origin, preEvaluated: []};
                (function () {
                    node.split.path = 'F';
                }).should.throw();
                (function () {
                    node.split.preEvaluated.push({type: 'Identifier', name: 'b'});
                }).should.throw();
                node.split.path.should.eql('T');
                node.split.preEvaluated.should.eql([]);
            });

            it('should be cleared by null or undefined', function () {
                node.split = {path: 'T', origin: origin};
                node.split = null;
                should(node.split).be.null();
                node.split = {path: 'T', origin: origin};
                node.split = undefined;
                should(node.split).be.null();
            });

            it('should ignore invalid values', function () {
                var valid = {path: 'T', origin: origin};
                node.split = valid;
                var stored = node.split;
                [
                    'T',
                    1,
                    true,
                    {origin: origin},
                    {path: 1, origin: origin},
                    {path: 'F'},
                    {path: 'F', origin: null},
                    {path: 'F', origin: 'statement'},
                    {path: 'F', origin: origin, preEvaluated: {type: 'Identifier', name: 'b'}},
                    {path: 'F', origin: origin, preEvaluated: null}
                ].forEach(function (invalid) {
                    node.split = invalid;
                    node.split.should.equal(stored);
                });
            });

            it('should not change labelPath', function () {
                node.split = {path: 'T', origin: origin};
                node.labelPath.should.eql('');
            });
        });

        describe('labelPath', function () {
            it('should support to assign a string', function () {
                node.labelPath = 'TF';
                node.labelPath.should.eql('TF');
                node.labelPath = '';
                node.labelPath.should.eql('');
            });

            it('should ignore non-string values', function () {
                node.labelPath = 'T';
                [null, undefined, 1, ['F'], {path: 'F'}].forEach(function (invalid) {
                    node.labelPath = invalid;
                    node.labelPath.should.eql('T');
                });
            });

            it('should not change split', function () {
                node.labelPath = 'T';
                should(node.split).be.null();
            });
        });

        describe('analyzedExpressions', function () {
            it('should be the astNode when not split', function () {
                node.analyzedExpressions.should.eql([node.astNode]);
                node.analyzedExpressions[0].should.equal(node.astNode);
            });

            it('should be the astNode for a split node without preEvaluated', function () {
                node.split = {path: 'T', origin: origin};
                node.analyzedExpressions.should.eql([node.astNode]);
            });

            it('should be split.preEvaluated followed by the astNode', function () {
                var first = {type: 'Identifier', name: 'b'}, second = {type: 'Identifier', name: 'c'};
                node.split = {path: '', origin: origin, preEvaluated: [first, second]};
                var exprs = node.analyzedExpressions;
                exprs.length.should.eql(3);
                exprs[0].should.equal(first);
                exprs[1].should.equal(second);
                exprs[2].should.equal(node.astNode);
            });

            it('should be read-only', function () {
                var original = node.analyzedExpressions;
                (function () {
                    node.analyzedExpressions = [];
                }).should.throw();
                node.analyzedExpressions.should.eql(original);
            });

            it('should be a new array each time', function () {
                node.split = {path: '', origin: origin, preEvaluated: [{type: 'Identifier', name: 'b'}]};
                var exprs = node.analyzedExpressions;
                exprs.should.not.equal(node.analyzedExpressions);
                Object.isFrozen(exprs).should.eql(false);
                exprs.push({type: 'Identifier', name: 'x'});
                node.split.preEvaluated.length.should.eql(1);
                node.analyzedExpressions.length.should.eql(2);
            });
        });
    });
    describe('static method copyNodes', function () {
        var factoryFlowNode = require('../../lib/esgraph/flownodefactory');
        var ast, parentAst, scopeObj, origin;
        var entry, decision, body, other, exit, outside, originals;

        function sameNodes(actual, expected) {
            actual.length.should.eql(expected.length);
            actual.forEach(function (n, i) { (n === expected[i]).should.eql(true); });
        }

        function snapshot(node) {
            var connections = {};
            FlowNode.CONNECTION_TYPES.forEach(function (type) {
                connections[type] = Array.isArray(node[type]) ? [].concat(node[type]) : node[type];
            });
            return {
                cfgId: node.cfgId, type: node.type, astNode: node.astNode, parent: node.parent,
                line: node.line, col: node.col, scope: node.scope, split: node.split,
                labelPath: node.labelPath, isWithObject: node.isWithObject,
                loopRightSplit: node.loopRightSplit, discriminantSplit: node.discriminantSplit,
                prev: node.prev, next: node.next, connections: connections,
                kill: node.kill, cuse: node.cuse, puse: node.puse, generate: node.generate,
                reachIns: node.reachIns, reachOuts: node.reachOuts,
                extraReachIns: node.extraReachIns, extraReachOuts: node.extraReachOuts,
                label: node.label, nextSibling: node.nextSibling, original: node.original
            };
        }

        beforeEach(function () {
            ast = {type: 'BinaryExpression'};
            parentAst = {type: 'IfStatement'};
            scopeObj = {name: '$DOMAIN.f'};
            origin = {type: 'IfStatement'};

            entry = new FlowNode(FlowNode.ENTRY_NODE_TYPE);
            entry.cfgId = 10;
            decision = new FlowNode(FlowNode.BRANCH_NODE_TYPE, ast, parentAst);
            decision.cfgId = 11;
            decision.line = 3;
            decision.col = 4;
            decision.scope = scopeObj;
            decision.split = {path: 'T', origin: origin, preEvaluated: [{type: 'Identifier', name: 'a'}]};
            decision.labelPath = 'T';
            decision.isWithObject = true;
            decision.loopRightSplit = true;
            decision.discriminantSplit = true;
            decision.kill = new Set([1]);
            decision.cuse = new Set([2]);
            decision.puse = new Set([3]);
            decision.generate = new Set([4]);
            decision.reachIns = new Set([5]);
            decision.reachOuts = new Set([6]);
            decision.extraReachIns = new Set([7]);
            decision.extraReachOuts = new Set([8]);
            decision.label = 'decision label';
            body = new FlowNode();
            body.cfgId = 12;
            other = new FlowNode();
            other.cfgId = 13;
            exit = new FlowNode(FlowNode.EXIT_NODE_TYPE);
            exit.cfgId = 14;
            outside = new FlowNode(FlowNode.CALL_RETURN_NODE_TYPE);
            outside.cfgId = 99;
            decision.nextSibling = body;

            entry.connect(decision);
            decision.connect(body, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
            decision.connect(other, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
            decision.connect(exit, FlowNode.EXCEPTION_CONNECTION_TYPE);
            other.connect(exit);
            body.connect(exit);
            /// multi-connection: exit returns to several targets in order, one outside the map
            exit.connect(other, FlowNode.RETURN_CONNECTION_TYPE);
            exit.connect(outside, FlowNode.RETURN_CONNECTION_TYPE);
            exit.connect(body, FlowNode.RETURN_CONNECTION_TYPE);
            entry.connect(body, FlowNode.ON_EVENT_CONNECTION_TYPE);
            entry.connect(other, FlowNode.ON_EVENT_CONNECTION_TYPE);
            originals = [entry, decision, body, other, exit];
        });

        it('should return a Map from each original to its copy', function () {
            var map = FlowNode.copyNodes(originals);
            (map instanceof Map).should.eql(true);
            map.size.should.eql(5);
            originals.forEach(function (node) {
                var copy = map.get(node);
                FlowNode.isFlowNode(copy).should.eql(true);
                copy.should.not.equal(node);
            });
        });

        it('should keep the attributes of the originals', function () {
            var map = FlowNode.copyNodes(originals);
            originals.forEach(function (node) {
                var copy = map.get(node);
                ['cfgId', 'type', 'astNode', 'parent', 'line', 'col', 'scope', 'split', 'labelPath',
                    'isWithObject', 'loopRightSplit', 'discriminantSplit'].forEach(function (key) {
                    should(copy[key]).equal(node[key]);
                });
            });
            var copy = map.get(decision);
            copy.cfgId.should.eql(11);
            copy.astNode.should.equal(ast);
            copy.parent.should.equal(parentAst);
            copy.scope.should.equal(scopeObj);
            copy.split.should.equal(decision.split);
            copy.labelPath.should.eql('T');
            copy.isWithObject.should.eql(true);
            copy.loopRightSplit.should.eql(true);
            copy.discriminantSplit.should.eql(true);
        });

        it('should map every connection to the copies in the same order', function () {
            var map = FlowNode.copyNodes(originals);
            function mapped(nodes) {
                return nodes.filter(function (node) {
                    return map.has(node);
                }).map(function (node) {
                    return map.get(node);
                });
            }
            originals.forEach(function (node) {
                var copy = map.get(node);
                sameNodes(copy.prev, mapped(node.prev));
                sameNodes(copy.next, mapped(node.next));
                FlowNode.CONNECTION_TYPES.forEach(function (type) {
                    if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
                        sameNodes(copy[type], mapped(node[type]));
                    } else if (node[type] === null) {
                        should(copy[type]).equal(null);
                    } else {
                        copy[type].should.equal(map.get(node[type]));
                    }
                });
            });
            map.get(decision).true.should.equal(map.get(body));
            map.get(decision).false.should.equal(map.get(other));
            map.get(decision).exception.should.equal(map.get(exit));
            sameNodes(map.get(entry).onEvent, [map.get(body), map.get(other)]);
        });

        it('should keep the order of prev differing from the order of connecting', function () {
            /// exit.prev is decision, other, body; body.prev is decision, exit, entry (order of connecting)
            var map = FlowNode.copyNodes(originals);
            sameNodes(map.get(exit).prev, [map.get(decision), map.get(other), map.get(body)]);
            sameNodes(map.get(body).prev, [map.get(decision), map.get(exit), map.get(entry)]);
        });

        it('should omit the targets not in the map', function () {
            var map = FlowNode.copyNodes(originals);
            sameNodes(map.get(exit).return, [map.get(other), map.get(body)]);
            sameNodes(map.get(exit).next, [map.get(other), map.get(body)]);
            map.get(exit).next.indexOf(outside).should.eql(-1);
            map.has(outside).should.eql(false);
        });

        it('should clear the analysis results, label and nextSibling of the copies', function () {
            var map = FlowNode.copyNodes(originals);
            var copy = map.get(decision);
            ['kill', 'cuse', 'puse', 'reachIns', 'reachOuts', 'extraReachIns', 'extraReachOuts',
                'nextSibling'].forEach(function (key) {
                should(copy[key]).equal(null);
            });
            /// label is the default of a new node of the same type (the converter sets it on writing)
            should(copy.label).equal(new FlowNode(FlowNode.BRANCH_NODE_TYPE).label);
            copy.label.should.not.eql('decision label');
            should(map.get(body).label).equal(null);
            map.get(exit).label.should.eql(FlowNode.EXIT_NODE_TYPE);
        });

        it('should set original read-only: null on originals and the original on copies', function () {
            var map = FlowNode.copyNodes(originals);
            originals.forEach(function (node) {
                should(node.original).equal(null);
                map.get(node).original.should.equal(node);
            });
            var copy = map.get(body);
            (function () {
                copy.original = other;
            }).should.throw();
            copy.original.should.equal(body);
            should(new FlowNode().original).equal(null);
        });

        it('should not consume the counter of flownodefactory', function () {
            var before = factoryFlowNode.counter;
            FlowNode.copyNodes(originals);
            factoryFlowNode.counter.should.eql(before);
        });

        it('should not change the originals', function () {
            var before = originals.concat([outside]).map(snapshot);
            FlowNode.copyNodes(originals);
            var after = originals.concat([outside]).map(snapshot);
            after.forEach(function (snap, i) {
                Object.keys(snap).forEach(function (key) {
                    should(snap[key]).eql(before[i][key]);
                });
                snap.prev.forEach(function (n, j) { n.should.equal(before[i].prev[j]); });
                snap.next.forEach(function (n, j) { n.should.equal(before[i].next[j]); });
            });
            sameNodes(outside.prev, [exit]);
        });

        it('should return an empty Map for no originals', function () {
            FlowNode.copyNodes([]).size.should.eql(0);
        });
    });
});
