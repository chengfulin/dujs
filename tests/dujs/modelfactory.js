/*
 * Test cases for ModelFactory
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-14
 */
var factoryModel = require('../../lib/dujs/modelfactory');
var should = require('should');

describe('ModelFactory', function () {
    "use strict";
    describe('public methods', function () {
	    describe('create', function () {
		    it('should support to create empty Model', function () {
			    var model = factoryModel.create();
			    should.not.exist(model._testonly_._graph);
			    should.exist(model._testonly_._relatedScopes);
			    model._testonly_._relatedScopes.length.should.eql(0);
			    should.exist(model._testonly_._dupairs);
			    model._testonly_._dupairs.size.should.eql(0);
		    });
	    });
    });
});