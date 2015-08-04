/*
 * Test cases for DomainScope module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-04
 */
var should = require('should');
var DomainScope = require('../../lib/dujs/domainscope');

describe('DomainScope', function () {
	"use strict";
	describe('static data members', function () {
		describe('buildInObjects', function () {
			it('should contain correct values', function () {
				DomainScope.builtInObjects.length.should.eql(1);
				DomainScope.builtInObjects.should.containDeep([
					{name: "localStorage", def: "localStorage"}
				]);
			});
		});
	});

	describe('constructor', function () {
		it('should construct with default name and type', function () {
			var scope = new DomainScope();
			scope._testonly_._name.should.eql('$DOMAIN');
			scope._testonly_._type.should.eql('domain');
			should.not.exist(scope._testonly_._ast);
		});
	});
});
