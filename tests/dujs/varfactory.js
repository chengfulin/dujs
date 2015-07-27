/**
 * Test cases for VarFactory
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-27
 */
var varFactory = require('../../lib/dujs/varfactory');
require('should');

describe('VarFactory', function () {
    'use strict';
    describe('create', function () {
        it('should create normal Var well', function () {
            var normal = varFactory.create('normal');
            normal._testonly_._name.should.eql('normal');

	        var var123 = varFactory.create('var123');
	        var123._testonly_._name.should.eql('var123');

	        var var_456 = varFactory.create('var_456');
	        var_456._testonly_._name.should.eql('var_456');
        });
    });
});