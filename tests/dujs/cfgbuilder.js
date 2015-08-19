/*
 * Test cases for CFGBuilder module
 * @lastmodifiedBy ChengFuLin
 * @lastmodifedDate 2015-08-19
 */
var should = require('should');
var builder = require('../../lib/dujs/cfgbuilder'),
	factoryFlownode = require('../../lib/esgraph/flownodefactory');

describe('CFGBuilder', function () {
	"use strict";
	describe('public methods', function () {
		beforeEach(function () {
			factoryFlownode.resetCounter();
		});

		describe('getDomainScopeGraph', function () {
			it('should create graph of the domain scope correctly', function () {
				var graph = builder.getDomainScopeGraph();
				should.exist(graph);
				(graph instanceof Array).should.eql(true);
				graph.length.should.eql(3);
				graph[0]._testonly_._type.should.eql('localStorage');
				graph[1]._testonly_._type.should.eql('localStorage');
				graph[2].length.should.eql(1);
				graph[2][0]._testonly_._type.should.eql('localStorage');
			});
		});
	});
});
