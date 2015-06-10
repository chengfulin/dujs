/**
 * Created by ChengFuLin on 2015/5/22.
 */
var factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    FlowNode = require('../../lib/esgraph').FlowNode,
    should = require('should');

describe('Factory Methods', function () {
    "use strict";
    describe('create', function () {
        it('should support to create all kinds of nodes', function () {
            var normalNode = factoryFlowNode.create(),
                entryNode = factoryFlowNode.create(FlowNode.ENTRY_NODE_TYPE),
                exitNode = factoryFlowNode.create(FlowNode.EXIT_NODE_TYPE),
                callNode = factoryFlowNode.create(FlowNode.CALL_NODE_TYPE),
                callReturnNode = factoryFlowNode.create(FlowNode.CALL_RETURN_NODE_TYPE),
                loopNode = factoryFlowNode.create(FlowNode.LOOP_NODE_TYPE),
                loopRetrunNode = factoryFlowNode.create(FlowNode.LOOP_RETURN_NODE_TYPE);

            should.exist(normalNode);
            should.exist(entryNode);
            should.exist(exitNode);
            should.exist(callNode);
            should.exist(callReturnNode);
            should.exist(loopNode);
            should.exist(loopRetrunNode);

            should(normalNode instanceof FlowNode).eql(true);
            should(entryNode instanceof FlowNode).eql(true);
            should(exitNode instanceof FlowNode).eql(true);
            should(callNode instanceof FlowNode).eql(true);
            should(callReturnNode instanceof FlowNode).eql(true);
            should(loopNode instanceof FlowNode).eql(true);
            should(loopRetrunNode instanceof FlowNode).eql(true);

            normalNode._testonly_._type.should.eql('normal');
            entryNode._testonly_._type.should.eql('entry');
            exitNode._testonly_._type.should.eql('exit');
            callNode._testonly_._type.should.eql('call');
            callReturnNode._testonly_._type.should.eql('callReturn');
            loopNode._testonly_._type.should.eql('loop');
            loopRetrunNode._testonly_._type.should.eql('loopReturn');


            should.not.exist(normalNode._testonly_._astNode);
            should.not.exist(normalNode._testonly_._parent);
            should.not.exist(entryNode._testonly_._astNode);
            should.not.exist(entryNode._testonly_._parent);
            should.not.exist(exitNode._testonly_._astNode);
            should.not.exist(exitNode._testonly_._parent);
            should.not.exist(callNode._testonly_._astNode);
            should.not.exist(callNode._testonly_._parent);
            should.not.exist(callReturnNode._testonly_._astNode);
            should.not.exist(callReturnNode._testonly_._parent);
            should.not.exist(loopNode._testonly_._astNode);
            should.not.exist(loopNode._testonly_._parent);
            should.not.exist(loopRetrunNode._testonly_._astNode);
            should.not.exist(loopRetrunNode._testonly_._parent);
        });

        it('should create with astNode well', function () {
            var ast = {type: 'Program', range: [0,1]},
                normal = factoryFlowNode.create(FlowNode.NORMAL_NODE_TYPE, ast);

            normal._testonly_._astNode.type.should.eql('Program');
        });

        it('should create with parent well', function () {
            var parent = {type: 'Program'},
                normal = factoryFlowNode.create(FlowNode.NORMAL_NODE_TYPE, null, parent);

            normal._testonly_._parent.type.should.eql('Program');
        });
    });

    describe('createNormalNode', function () {
        it('should create normal node well', function () {
            var normal = factoryFlowNode.createNormalNode();
            normal._testonly_._type.should.eql('normal');
        });
    });

    describe('createEntryNode', function () {
        it('should create entry node well', function () {
            var entry = factoryFlowNode.createEntryNode();
            entry._testonly_._type.should.eql('entry');
        });
    });

    describe('createExitNode', function () {
        it('should create exit node well', function () {
            var exit = factoryFlowNode.createExitNode();
            exit._testonly_._type.should.eql('exit');
        });
    });

    describe('createCallNode', function () {
        it('should create call node well', function () {
            var call = factoryFlowNode.createCallNode();
            call._testonly_._type.should.eql('call');
        });
    });

    describe('createCallReturnNode', function () {
        it('should create normal node well', function () {
            var callReturn = factoryFlowNode.createCallReturnNode();
            callReturn._testonly_._type.should.eql('callReturn');
        });
    });

    describe('createLoopNode', function () {
        it('should create normal node well', function () {
            var loop = factoryFlowNode.createLoopNode();
            loop._testonly_._type.should.eql('loop');
        });
    });

    describe('createLoopReturnNode', function () {
        it('should create normal node well', function () {
            var loopReturn = factoryFlowNode.createLoopReturnNode();
            loopReturn._testonly_._type.should.eql('loopReturn');
        });
    });
});