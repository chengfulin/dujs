/**
 * Created by chengfulin on 2015/4/29.
 */
var ScopeTree = require('../../lib/dujs').ScopeTree,
    CFGExt = require('../../lib/dujs').CFGExt,
    rangeFactory = require('../../lib/dujs').factoryRange,
    defFactory = require('../../lib/dujs').factoryDef,
    Scope = require('../../lib/dujs').Scope,
    scopeWrapperFactory = require('../../lib/dujs').factoryScopeWrapper,
    flowNodeFactory = require('../../lib/esgraph').factoryFlowNode,
    vardefFactory = require('../../lib/dujs').factoryVarDef,
    Set = require('../../lib/analyses').Set,
    should = require('should');

describe('ScopeTree', function () {
    'use strict';
    beforeEach(function () {
        flowNodeFactory.resetCounter();
        scopeWrapperFactory.resetAnonymousFunctionScopeCounter();
    });

    describe('Private Methods', function () {
        describe('addScope', function () {
            it('should add a Scope into the tree', function () {
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

    describe('Static Methods', function () {
        describe('isScopeTree', function () {
            it('should return true as the object is a ScopeTree', function () {
                ScopeTree.isScopeTree(new ScopeTree()).should.eql(true);
            });

            it('should return false as the object is not a ScopeTree', function () {
                ScopeTree.isScopeTree({}).should.eql(false);
                ScopeTree.isScopeTree('').should.eql(false);
                ScopeTree.isScopeTree().should.eql(false);
            });
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
                tree._testonly_._root._testonly_._name._testonly_._type.should.eql('Program');
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
                tree._testonly_._scopes[1]._testonly_._name._testonly_._type.should.eql('Function');
                tree._testonly_._scopes[1]._testonly_._name._testonly_._value.should.eql('foo');
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
                tree._testonly_._scopes[1]._testonly_._name._testonly_._type.should.eql('AnonymousFunction');
                tree._testonly_._scopes[1]._testonly_._name._testonly_._value.should.eql(0);
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

            it('should support inner function', function () {
                var ast = CFGExt.parseAST(
                    'var a = 0;' +
                    'function foo() {' +
                        'a = 1;' +
                    '}' +
                    'function foo2() {' +
                        'a = 2;' +
                        'function inner() {' +
                            'a = 3;' +
                        '}' +
                    '}'
                    ),
                    tree = new ScopeTree();
                tree.buildScopeTree(ast);
                tree._testonly_._scopes.length.should.eql(4);
                tree._testonly_._root._testonly_._children.size.should.eql(2);
                tree._testonly_._root._testonly_._children.has('[10,33]').should.eql(true);
                tree._testonly_._root._testonly_._children.has('[33,82]').should.eql(true);
                tree._testonly_._scopes[2]._testonly_._children.size.should.eql(1);
                tree._testonly_._scopes[2]._testonly_._children.has('[56,81]').should.eql(true);
            });
        });

        describe('setVars', function () {
            it('should support setting Vars in program scope without globals', function () {
                var cfg = CFGExt.getCFG(CFGExt.parseAST(
                        'var a = 0, b;'
                    )),
                    tree = new ScopeTree(),
                    programScope = scopeWrapperFactory.create(cfg, Scope.PROGRAM_SCOPE);
                tree._testonly_._root = programScope;
                tree._testonly_._scopes.push(programScope);
                tree.setVars();

                programScope._testonly_._vars.size.should.eql(2);
                programScope._testonly_._vars.has('a').should.eql(true);
                programScope._testonly_._vars.has('b').should.eql(true);
            });

            it('should support setting Vars in multilevel scopes without globals', function () {
                var scopeASTs = CFGExt.findScopes(CFGExt.parseAST(
                        'var a = 0, b;' +
                        'function foo(c) { '+
                        'var d;' +
                        '}'
                    )),
                    programCFG = CFGExt.getCFG(scopeASTs[0]),
                    functionCFG = CFGExt.getCFG(scopeASTs[1].body),
                    tree = new ScopeTree(),
                    programScope = scopeWrapperFactory.create(programCFG, Scope.PROGRAM_SCOPE),
                    functionScope = scopeWrapperFactory.create(functionCFG, new Scope('foo'));

                functionScope._testonly_._range = rangeFactory.create(13,37);
                programScope._testonly_._children.set('[13,37]', functionScope);
                functionScope._testonly_._parent = programScope;
                tree._testonly_._root = programScope;
                tree._testonly_._scopes.push(programScope, functionScope);
                tree.setVars();

                programScope._testonly_._vars.size.should.eql(2);
                programScope._testonly_._vars.has('a').should.eql(true);
                programScope._testonly_._vars.has('b').should.eql(true);

                functionScope._testonly_._vars.size.should.eql(1);
                functionScope._testonly_._vars.has('d').should.eql(true);
            });

            it('should support setting Vars with globals', function () {
                var cfg = CFGExt.getCFG(CFGExt.parseAST(
                        'var a = 0, b;'
                    )),
                    tree = new ScopeTree(),
                    programScope = scopeWrapperFactory.create(cfg, Scope.PROGRAM_SCOPE),
                    global1 = vardefFactory.createGlobalLiteralVarDef(cfg[0], 'global1'),
                    global2 = vardefFactory.createGlobalObjectVarDef(cfg[0], 'global2');
                tree._testonly_._root = programScope;
                tree._testonly_._scopes.push(programScope);
                tree.setVars(new Set([global1, global2]));

                programScope._testonly_._vars.size.should.eql(4);
                programScope._testonly_._vars.has('global1').should.eql(true);
                programScope._testonly_._vars.has('global2').should.eql(true);
            });
        });
    });
});