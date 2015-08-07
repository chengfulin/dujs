/**
 * Created by chengfulin on 2015/4/16.
 */
var DUPair = require('../../lib/dujs/dupair'),
    factoryFlowNode = require('../../lib/esgraph/flownodefactory'),
	factoryPair = require('../../lib/dujs/pairfactory');
var should = require('should');

describe('DUPair', function () {
    'use strict';
    beforeEach(function () {
        factoryFlowNode.resetCounter();
    });

    describe('Static Methods', function () {
        describe('isValidDUPair', function () {
            it('should return false as both def and use are not FlowNodes', function () {
                DUPair.isValidDUPair(null, null).should.eql(false);
                DUPair.isValidDUPair({}, {}).should.eql(false);
            });

            it('should return false as def or use is not a FlowNode', function () {
                DUPair.isValidDUPair(factoryFlowNode.createNormalNode(), null).should.eql(false);
                DUPair.isValidDUPair(null, factoryFlowNode.createNormalNode()).should.eql(false);
            });

            it('should return true as both def and use are FlowNodes', function () {
                DUPair.isValidDUPair(factoryFlowNode.createNormalNode(), factoryFlowNode.createNormalNode()).should.eql(true);
                DUPair.isValidDUPair(factoryFlowNode.createEntryNode(), factoryFlowNode.createExitNode()).should.eql(true);
            });
        });

        describe('validate', function () {
            it('should throw as def or use is invalid', function () {
                should(function () {
                    DUPair.validate(null, {});
                }).throw('Invalid value for a DUPair');

                should(function () {
                    DUPair.validate(factoryFlowNode.createNormalNode(), null);
                }).throw('Invalid value for a DUPair');
            });

            it('should support custom error message', function () {
                should(function () {
                    DUPair.validate(null, null, 'Custom Error');
                }).throw('Custom Error');
            });

            it('should not throw as def and use are valid', function () {
                should(function () {
                    DUPair.validate(factoryFlowNode.createCallNode(), factoryFlowNode.createCallReturnNode());
                }).not.throw();
            });
        });
    });

    describe('public data members', function () {
        var pair;
        beforeEach(function () {
            pair = new DUPair(factoryFlowNode.createNormalNode(), factoryFlowNode.createEntryNode());
        });

        describe('def', function () {
            it('should support to retrieve value', function () {
                should.exist(pair.def);
                pair._testonly_._first.should.eql(pair.def);
            });

            it('should not be modified', function () {
                should(function () {
                    pair.def = null;
                }).throw();
            });
        });

        describe('use', function () {
            it('should support to retrieve value', function () {
                should.exist(pair.use);
                pair._testonly_._second.should.eql(pair.use);
            });

            it('should not be modified', function () {
                should(function () {
                    pair.use = null;
                }).throw();
            });
        });
    });

    describe('public methods', function () {
        describe('toString', function () {
	        it('should represent a c-use DUPair correctly', function () {
		        var defNode = factoryFlowNode.createNormalNode(),
			        useNode = factoryFlowNode.createExitNode();
		        var pair = new DUPair(defNode, useNode);
		        pair.toString().should.eql('(n0,exit)');

		        defNode.label = 'def';
		        pair.toString().should.eql('(def,exit)');
	        });

	        it('should represent a p-use DUPair correctly', function () {
		        var defNode = factoryFlowNode.createNormalNode(),
			        useNode = factoryFlowNode.createNormalNode(),
			        brachNode = factoryFlowNode.createNormalNode();

		        var pair = new DUPair(defNode, factoryPair.create(useNode, brachNode));
		        pair.toString().should.eql('(n0,(n1,n2))');
	        });
        });
    });

    describe('Constructor', function () {
        it('should assign value correctly', function () {
            var defNode = factoryFlowNode.createNormalNode(),
                useNode = factoryFlowNode.createExitNode(),
                pair = new DUPair(defNode, useNode);

            pair._testonly_._first.should.eql(defNode);
            pair._testonly_._second.should.eql(useNode);
        });
    });
});