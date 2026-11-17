/*
 * Test cases for DefFactory module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
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
				var def = factoryDef.createLiteralDef(node, [0,1]);
				def._testonly_._type.should.eql('literal');
			});
		});

		describe('createObjectDef', function () {
			it('should support to create object type of Def', function () {
				var def = factoryDef.createObjectDef(node, [0,1]);
				def._testonly_._type.should.eql('object');
			});
		});

		describe('createFunctionDef', function () {
			it('should support to create function type of Def', function () {
				var def = factoryDef.createFunctionDef(node, [0,1]);
				def._testonly_._type.should.eql('function');
			});
		});

		describe('createHTMLDOMDef', function () {
			it('should support to create HTML DOM type of Def', function () {
				var def = factoryDef.createHTMLDOMDef(node, [0,1]);
				def._testonly_._type.should.eql('htmlDom');
			});
		});

		describe('createUndefinedDef', function () {
			it('should support to create undefined type of Def', function () {
				var def = factoryDef.createUndefinedDef(node, [0,1]);
				def._testonly_._type.should.eql('undefined');
			});
		});

		describe('createLocalStorageDef', function () {
			it('should support to create local storage type of Def', function () {
				var def = factoryDef.createLocalStorageDef(node, [0,1]);
				def._testonly_._type.should.eql('localStorage');
			});
		});

		/// feature 006 US3: the definition of a global read without declaration
		describe('createGlobalDef', function () {
			it('should support to create global type of Def', function () {
				var def = factoryDef.createGlobalDef(node, [0,1]);
				def._testonly_._type.should.eql('global');
			});

			it('should keep the types of the definitions of the fixed list and localStorage', function () {
				factoryDef.createHTMLDOMDef(node, [0,1])._testonly_._type.should.eql('htmlDom');
				factoryDef.createObjectDef(node, [0,1])._testonly_._type.should.eql('object');
				factoryDef.createLocalStorageDef(node, [0,1])._testonly_._type.should.eql('localStorage');
			});
		});
	});
});
