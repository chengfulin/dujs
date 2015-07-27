/**
 * Created by ChengFuLin on 2015/6/3.
 */
var factoryDef = require('../../lib/dujs').factoryDef,
    Def = require('../../lib/dujs').Def,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('Factory Methods', function () {
    "use strict";
    var range, scope, node;
    beforeEach(function () {
        factoryFlowNode.resetCounter();
        range = [0,1];
        scope = Scope.PROGRAM_SCOPE;
        node = factoryFlowNode.createNormalNode();
        node.cfgId = 0;
    });

    describe('create', function () {
        it('should support to create any type of Def', function () {
            var literalDef = factoryDef.create(node, Def.LITERAL_TYPE, range, scope),
                objectDef = factoryDef.create(node, Def.OBJECT_TYPE, range, scope),
                funDef = factoryDef.create(node, Def.FUNCTION_TYPE, range, scope),
                htmlDOMDef = factoryDef.create(node, Def.HTML_DOM_TYPE, range, scope),
                undefinedDef = factoryDef.create(node, Def.UNDEFINED_TYPE, range, scope),
                localStorageDef = factoryDef.create(node, Def.LOCAL_STORAGE_TYPE, range, scope);
            literalDef._testonly_._fromCFGNode.should.eql(node);
            literalDef._testonly_._range._testonly_._start.should.eql(0);
            literalDef._testonly_._range._testonly_._end.should.eql(1);
            literalDef._testonly_._name.should.eql(scope);

            literalDef._testonly_._type.should.eql('literal');
            objectDef._testonly_._type.should.eql('object');
            funDef._testonly_._type.should.eql('function');
            htmlDOMDef._testonly_._type.should.eql('htmlDOM');
            undefinedDef._testonly_._type.should.eql('undefined');
            localStorageDef._testonly_._type.should.eql('localStorage');
        });
    });

    describe('createLiteralDef', function () {
        it('should support to create literal type of Def', function () {
            var def = factoryDef.createLiteralDef(node, range, scope);
            def._testonly_._type.should.eql('literal');
        });
    });

    describe('createObjectDef', function () {
        it('should support to create object type of Def', function () {
            var def = factoryDef.createObjectDef(node, range, scope);
            def._testonly_._type.should.eql('object');
        });
    });

    describe('createFunctionDef', function () {
        it('should support to create function type of Def', function () {
            var def = factoryDef.createFunctionDef(node, range, scope);
            def._testonly_._type.should.eql('function');
        });
    });

    describe('createHTMLDOMDef', function () {
        it('should support to create HTML DOM type of Def', function () {
            var def = factoryDef.createHTMLDOMDef(node, range, scope);
            def._testonly_._type.should.eql('htmlDOM');
        });
    });

    describe('createUndefinedDef', function () {
        it('should support to create undefined type of Def', function () {
            var def = factoryDef.createUndefinedDef(node, range, scope);
            def._testonly_._type.should.eql('undefined');
        });
    });

    describe('createLocalStorageDef', function () {
        it('should support to create local storage type of Def', function () {
            var def = factoryDef.createLocalStorageDef(node, range, scope);
            def._testonly_._type.should.eql('localStorage');
        });
    });
});