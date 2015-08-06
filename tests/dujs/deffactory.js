/*
 * Test cases for DefFactory module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
var factoryDef = require('../../lib/dujs/deffactory'),
    factoryFlowNode = require('../../lib/esgraph/flownodefactory');
require('should');

describe('DefFactory', function () {
    "use strict";
    var node;
	beforeEach(function () {
		node = factoryFlowNode.createNormalNode();
	});

	describe('public methods', function () {
		describe('createLiteralDef', function () {
			it('should support to create literal type of Def', function () {
				var def = factoryDef.createLiteralDef(node);
				def._testonly_._type.should.eql('literal');
			});
		});

		describe('createObjectDef', function () {
			it('should support to create object type of Def', function () {
				var def = factoryDef.createObjectDef(node);
				def._testonly_._type.should.eql('object');
			});
		});

		describe('createFunctionDef', function () {
			it('should support to create function type of Def', function () {
				var def = factoryDef.createFunctionDef(node);
				def._testonly_._type.should.eql('function');
			});
		});

		describe('createHTMLDOMDef', function () {
			it('should support to create HTML DOM type of Def', function () {
				var def = factoryDef.createHTMLDOMDef(node);
				def._testonly_._type.should.eql('htmlDom');
			});
		});

		describe('createUndefinedDef', function () {
			it('should support to create undefined type of Def', function () {
				var def = factoryDef.createUndefinedDef(node);
				def._testonly_._type.should.eql('undefined');
			});
		});

		describe('createLocalStorageDef', function () {
			it('should support to create local storage type of Def', function () {
				var def = factoryDef.createLocalStorageDef(node);
				def._testonly_._type.should.eql('localStorage');
			});
		});
	});
});