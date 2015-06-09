/**
 * Created by chengfulin on 2015/4/29.
 */
var ScopeTree = require('../../lib/dujs').ScopeTree,
    CFGExt = require('../../lib/dujs').CFGExt,
    Range = require('../../lib/dujs').Range,
    rangeFactory = require('../../lib/dujs').factoryRange,
    Def = require('../../lib/dujs').Def,
    defFactory = require('../../lib/dujs').factoryDef,
    Scope = require('../../lib/dujs').Scope,
    scopeWrapperFactory = require('../../lib/dujs').factoryScopeWrapper,
    flowNodeFactory = require('../../lib/esgraph').factoryFlowNode,
    Map = require('core-js/es6/map'),
    should = require('should');

describe('ScopeTree', function () {
    'use strict';
    beforeEach(function () {
        CFGExt.resetCounter();
    });

    describe('Private Methods', function () {
        describe('addScope', function () {
            it('should add a ScopeWrapper into the tree', function () {
                var node1 = flowNodeFactory.createEntryNode(),
                    node2 = flowNodeFactory.createExitNode();
                node1.cfgId = 1;
                node2.cfgId = 2;
                var wrapper = scopeWrapperFactory.createFunctionScopeWrapper([node1, node2, [node1, node2]], 'foo'),
                    wrapperRange = rangeFactory.create(0,1),
                    wrapperDef = defFactory.createFunctionDef(node1, rangeFactory.create(0,1), Scope.PROGRAM_SCOPE),
                    tree = new ScopeTree();
                wrapper.range = wrapperRange;
                wrapper.def = wrapperDef;

                ScopeTree._testonly_._addScope(tree, wrapper);
                tree._testonly_._scopes.length.should.eql(2);
                tree._testonly_._scopes[1].should.eql(wrapper);

                tree._testonly_._mapFromRangeToScope.size.should.eql(2);
                should.exist(tree._testonly_._mapFromRangeToScope.get('[0,1]'));
                tree._testonly_._mapFromRangeToScope.get('[0,1]').should.eql(wrapper);

                tree._testonly_._mapFromDefToScope.size.should.eql(2);
                should.exist(tree._testonly_._mapFromDefToScope.get(wrapperDef));
                tree._testonly_._mapFromDefToScope.get(wrapperDef).should.eql(wrapper);

                tree._testonly_._mapFromScopeNameToScope.size.should.eql(2);
                should.exist(tree._testonly_._mapFromScopeNameToScope.get('Function["foo"]'));
                tree._testonly_._mapFromScopeNameToScope.get('Function["foo"]').should.eql(wrapper);
            });
        });

        describe('setGlobalScope', function () {
            var tree = new ScopeTree();
            CFGExt.resetCounter();
            tree._testonly_._scopes = [];
            tree._testonly_._mapFromRangeToScope = new Map();
            tree._testonly_._mapFromDefToScope = new Map();
            tree._testonly_._mapFromScopeToScope = new Map();

            var globalScope = ScopeTree._testonly_._setGlobalScope(tree);

            globalScope._testonly_._range._testonly_._start.should.eql(0);
            globalScope._testonly_._range._testonly_._end.should.eql(0);
            globalScope._testonly_._scope._testonly_._type.should.eql('Global');
            globalScope._testonly_._def._testonly_._type.should.eql('object');
            globalScope._testonly_._def._testonly_._fromCFGNode._testonly_._cfgId.should.eql(0);

            should.exist(tree._testonly_._globalScope);
            should.exist(tree._testonly_._root);
            tree._testonly_._root.should.eql(globalScope);
            tree._testonly_._globalScope.should.eql(globalScope);

            tree._testonly_._scopes.length.should.eql(1);
            tree._testonly_._mapFromRangeToScope.size.should.eql(1);
            tree._testonly_._mapFromDefToScope.size.should.eql(1);
            tree._testonly_._mapFromScopeNameToScope.size.should.eql(1);
            tree._testonly_._scopes[0].should.eql(globalScope);
            tree._testonly_._mapFromRangeToScope.get('[0,0]').should.eql(globalScope);
            tree._testonly_._mapFromDefToScope.get(globalScope._testonly_._def).should.eql(globalScope);
            tree._testonly_._mapFromScopeNameToScope.get('Global').should.eql(globalScope);
        });
    });

    describe('Constructor', function () {
        it('should have default values', function () {
            var tree = new ScopeTree();
            tree._testonly_._scopes.length.should.eql(1);
            tree._testonly_._mapFromRangeToScope.size.should.eql(1);
            tree._testonly_._mapFromDefToScope.size.should.eql(1);
            tree._testonly_._mapFromScopeNameToScope.size.should.eql(1);
            should.exist(tree._testonly_._globalScope);
            should.exist(tree._testonly_._root);
            tree._testonly_._root.should.eql(tree._testonly_._globalScope);
        });
    });
});