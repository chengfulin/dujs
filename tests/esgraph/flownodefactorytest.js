/**
 * Created by ChengFuLin on 2015/5/22.
 */
var factoryFlowNode = require('../../lib/esgraph/flownodefactory'),
    FlowNode = require('../../lib/esgraph/flownode'),
    should = require('should');

describe('Create object', function () {
    "use strict";
    beforeEach(function () {
        FlowNode.resetCounter();
    });

    it('should create FlowNode well', function () {
        var node = factoryFlowNode.create();
        should.exist(node);

        should(node instanceof FlowNode).eql(true);
        node._testonly_._type.should.eql('normal');
        should.not.exist(node._testonly_._astNode);
        should.not.exist(node._testonly_._parent);
    });
});