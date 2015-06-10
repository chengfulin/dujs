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
    vardefFactory = require('../../lib/dujs').factoryVarDef,
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
                tree._testonly_._scopes.length.should.eql(1);
                tree._testonly_._scopes[0].should.eql(wrapper);

                tree._testonly_._mapFromRangeToScope.size.should.eql(1);
                should.exist(tree._testonly_._mapFromRangeToScope.get('[0,1]'));
                tree._testonly_._mapFromRangeToScope.get('[0,1]').should.eql(wrapper);

                tree._testonly_._mapFromDefToScope.size.should.eql(1);
                should.exist(tree._testonly_._mapFromDefToScope.get(wrapperDef));
                tree._testonly_._mapFromDefToScope.get(wrapperDef).should.eql(wrapper);

                tree._testonly_._mapFromScopeNameToScope.size.should.eql(1);
                should.exist(tree._testonly_._mapFromScopeNameToScope.get('Function["foo"]'));
                tree._testonly_._mapFromScopeNameToScope.get('Function["foo"]').should.eql(wrapper);
            });
        });
    });

    describe('Constructor', function () {
        it('should have default values', function () {
            var tree = new ScopeTree();
            tree._testonly_._scopes.length.should.eql(0);
            tree._testonly_._mapFromRangeToScope.size.should.eql(0);
            tree._testonly_._mapFromDefToScope.size.should.eql(0);
            tree._testonly_._mapFromScopeNameToScope.size.should.eql(0);
            should.not.exist(tree._testonly_._root);
        });
    });

    describe('Methods', function () {
        describe('buildScopeTree', function () {
            it('should support building program scope only', function () {
                var ast = CFGExt.parseAST(
                        'var a = 0, b;'
                    ),
                    tree = new ScopeTree();

                tree.buildScopeTree(ast);

                /// root
                should.exist(tree._testonly_._root);
                tree._testonly_._root._testonly_._scope._testonly_._type.should.eql('Program');
                /// scopes
                tree._testonly_._scopes.length.should.eql(1);
                tree._testonly_._scopes[0].should.eql(tree._testonly_._root);
                tree._testonly_._mapFromRangeToScope.size.should.eql(1);
                tree._testonly_._mapFromRangeToScope.has('[0,13]').should.eql(true);
                tree._testonly_._mapFromDefToScope.size.should.eql(1);
                tree._testonly_._mapFromDefToScope.has(tree._testonly_._root._testonly_._def).should.eql(true);
                tree._testonly_._mapFromScopeNameToScope.size.should.eql(1);
                tree._testonly_._mapFromScopeNameToScope.has('Program').should.eql(true);
            });

            it('should support building with named function scope', function () {
                var ast = CFGExt.parseAST(
                    'var a = 0, b;' +
                    'function foo(c) { expr;}'
                    ),
                    tree = new ScopeTree();
                tree.buildScopeTree(ast);

                /// scopes
                tree._testonly_._scopes.length.should.eql(2);
                tree._testonly_._scopes[1]._testonly_._scope._testonly_._type.should.eql('Function');
                tree._testonly_._scopes[1]._testonly_._scope._testonly_._value.should.eql('foo');
                tree._testonly_._mapFromRangeToScope.size.should.eql(2);
                tree._testonly_._mapFromRangeToScope.has('[13,37]').should.eql(true);
                tree._testonly_._mapFromDefToScope.has(tree._testonly_._scopes[1]._testonly_._def).should.eql(true);
                tree._testonly_._mapFromScopeNameToScope.has('Function["foo"]').should.eql(true);

                /// parameters
                tree._testonly_._scopes[1]._testonly_._params.size.should.eql(1);
                tree._testonly_._scopes[1]._testonly_._params.has('c').should.eql(true);
                tree._testonly_._scopes[1]._testonly_._vars.has('c').should.eql(true);
                tree._testonly_._scopes[1]._testonly_._cfg[0]._testonly_._generate.size.should.eql(1);

                /// function variable and definition
                tree._testonly_._root._testonly_._vars.has('foo');
                tree._testonly_._root._testonly_._cfg[0]._testonly_._generate.size.should.eql(1);
            });

            it('should support building with anonymous function scope', function () {
                var ast = CFGExt.parseAST(
                        'var a = 0, b;' +
                        'b = function (c) { expr;}'
                    ),
                    tree = new ScopeTree();
                tree.buildScopeTree(ast);

                /// scopes
                tree._testonly_._scopes.length.should.eql(2);
                tree._testonly_._scopes[1]._testonly_._scope._testonly_._type.should.eql('AnonymousFunction');
                tree._testonly_._scopes[1]._testonly_._scope._testonly_._value.should.eql(0);
                tree._testonly_._mapFromRangeToScope.has('[17,38]').should.eql(true);
                tree._testonly_._mapFromDefToScope.has(tree._testonly_._scopes[1]._testonly_._def).should.eql(true);
                tree._testonly_._mapFromScopeNameToScope.has('AnonymousFunction[0]').should.eql(true);
            });

            it('should support multilevel scopes', function () {
                var ast = CFGExt.parseAST(
                        'function foo() {' +
                        'function fun() {' +
                        'expr;}' +
                        '}'
                    ),
                    tree = new ScopeTree();
                tree.buildScopeTree(ast);

                tree._testonly_._scopes.length.should.eql(3);
                tree._testonly_._scopes[0]._testonly_._vars.has('foo').should.eql(true);
                tree._testonly_._scopes[0]._testonly_._cfg[0]._testonly_._generate.size.should.eql(1);
                tree._testonly_._scopes[1]._testonly_._vars.has('fun').should.eql(true);
                tree._testonly_._scopes[1]._testonly_._cfg[0]._testonly_._generate.size.should.eql(1);
            });
        });
    });
});