/**
 * Test cases for DefUseAnalyzer
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-25
 */
var should = require('should');
var defuseAnalyzer = require('../../lib/dujs/defuseanalyzer'),
    modelFactory = require('../../lib/dujs/modelfactory'),
    scopeFactory = require('../../lib/dujs/scopefactory'),
    varFactory = require('../../lib/dujs/varfactory'),
    cfgBuilder = require('../../lib/dujs/cfgbuilder'),
    scopeCtrl = require('../../lib/dujs/scopectrl'),
    modelCtrl = require('../../lib/dujs/modelctrl'),
    modelBuilder = require('../../lib/dujs/modelbuilder'),
    variableAnalyzer = require('../../lib/dujs/variableanalyzer'),
    flownodeFactory = require('../../lib/esgraph/flownodefactory'),
    vardefFactory = require('../../lib/dujs/vardeffactory'),
    defFactory = require('../../lib/dujs/deffactory');
var esprima = require('esprima'),
    Set = require('../../lib/analyses/set'),
    Map = require('core-js/es6/map');

describe('DefUseAnalyzer', function () {
    "use strict";
    describe('private methods', function () {
        var ast, scope, model;
        beforeEach(function () {
            ast =esprima.parse('var a = 1, b = 0;', {range: true, loc: true});
            scope = scopeFactory.createPageScope(ast, null);
            model = modelFactory.create();
            model._testonly_._mainlyRelatedScope = scope;
            model._testonly_._relatedScopes.push(scope);
            model._testonly_._graph = cfgBuilder.getCFG(ast);
        });

        afterEach(function () {
            scopeFactory.resetPageScopeCounter();
            cfgBuilder.resetGraphNodeCounter();
        });

        function getTextOfVarDefSet(vardefSet) {
            var text =[];
            vardefSet.forEach(function (vardef) {
                text.push(vardef.toString());
            });
            return text;
        }

        describe('analyzeBuiltInObjects', function () {
            beforeEach(function () {
                scope.builtInObjects = [
                    {name: 'bi_1', def: 'object'},
                    {name: 'bi_2', def: 'literal'},
                    {name: 'bi_3', def: 'function'},
                    {name: 'bi_4', def: 'undefined'},
                    {name: 'bi_5', def: 'htmlDom'},
                    {name: 'bi_6', def: 'localStorage'}
                ];
                scope._testonly_._builtInObjectVars.set('bi_1', varFactory.create('bi_1'));
                scope._testonly_._builtInObjectVars.set('bi_2', varFactory.create('bi_2'));
                scope._testonly_._builtInObjectVars.set('bi_3', varFactory.create('bi_3'));
                scope._testonly_._builtInObjectVars.set('bi_4', varFactory.create('bi_4'));
                scope._testonly_._builtInObjectVars.set('bi_5', varFactory.create('bi_5'));
                scope._testonly_._builtInObjectVars.set('bi_6', varFactory.create('bi_6'));
            });

            it('should set the GEN set of built-in object variables well', function () {
                defuseAnalyzer._testonly_._analyzeBuiltInObjects(model);
                should.exist(model._testonly_._graph[0].generate);
                model._testonly_._graph[0].generate.size.should.eql(6);
                var genSetText = getTextOfVarDefSet(model._testonly_._graph[0].generate);
                genSetText.should.containDeep([
                    '(bi_1,object@entry)',
                    '(bi_2,literal@entry)',
                    '(bi_3,function@entry)',
                    '(bi_4,undefined@entry)',
                    '(bi_5,htmlDom@entry)',
                    '(bi_6,localStorage@entry)'
                ]);
            });
        });

        describe('analyzeDefaultValueOfLocalVariables', function () {
            beforeEach(function () {
                scope._testonly_._vars.set('loc_1', varFactory.create('loc_1'));
                scope._testonly_._vars.set('loc_2', varFactory.create('loc_2'));
                scope._testonly_._vars.set('loc_3', varFactory.create('loc_3'));
            });

            it('should set the GEN set of the default definition of local variables well', function () {
                defuseAnalyzer._testonly_._analyzeDefaultValueOfLocalVariables(model);
                should.exist(model._testonly_._graph[0].generate);
                model._testonly_._graph[0].generate.size.should.eql(3);
                var genSetText = getTextOfVarDefSet(model._testonly_._graph[0].generate);
                genSetText.should.containDeep([
                    '(loc_1,undefined@entry)',
                    '(loc_2,undefined@entry)',
                    '(loc_3,undefined@entry)'
                ]);
            });
        });

        describe('getVarDefsOfLocalVariablesReachingInExitNode', function () {
            var exitNode, reachIns,  locals, globals;
            beforeEach(function () {
                exitNode = flownodeFactory.createExitNode();
                locals = new Map();
                locals.set('a', varFactory.create('a'));
                locals.set('b', varFactory.create('b'));
                globals = new Map();
                globals.set('global', varFactory.create('global'));
                reachIns = new Set([
                    vardefFactory.create(globals.get('global'), defFactory.create(exitNode, 'literal', [0,1])),
                    vardefFactory.create(locals.get('a'), defFactory.create(exitNode, 'object', [10,11])),
                    vardefFactory.create(locals.get('b'), defFactory.create(exitNode, 'htmlDom', [12,22]))
                ]);
                exitNode.reachIns = reachIns;
            });

            afterEach(function () {
                flownodeFactory.resetCounter();
            });

            it('should get local variables and corresponding definitions from reaching in definitions of exit node well', function () {
                var localVarDefs = defuseAnalyzer._testonly_._getVarDefsOfLocalVariablesReachingInExitNode(exitNode, locals);
                localVarDefs.size.should.eql(2);
                var localVarDefsText = [];
                localVarDefs.forEach(function (vardef) {
                    localVarDefsText.push(vardef.toString());
                });
                localVarDefsText.should.containDeep([
                    '(a,object@exit)',
                    '(b,htmlDom@exit)'
                ]);
            });
        });

        describe('findVariableAndItsDefinitionsFromASet', function () {
            var variable, vardefSet;
            beforeEach(function () {
                var sampleNode = flownodeFactory.createNormalNode();
                variable = varFactory.create('v1');
                vardefSet = new Set();
                vardefSet.add(vardefFactory.create(
                    variable,
                    defFactory.create(sampleNode, 'literal', [0,1])
                ));
                vardefSet.add(vardefFactory.create(
                    varFactory.create('v2'),
                    defFactory.create(sampleNode, 'object', [1,3])
                ));
                vardefSet.add(vardefFactory.create(
                    variable,
                    defFactory.create(sampleNode, 'function', [3,10])
                ));
            });

            it('should find variable and its definitions well', function () {
                var set = defuseAnalyzer._testonly_._findVariableAndItsDefinitionsFromASet(vardefSet, variable);
                set.size.should.eql(2);
                set.values().every(function (vardef) {
                    return vardef.variable === variable;
                }).should.eql(true);
            });
        });

        describe('getNonReachableVarDefs', function () {
            var rootScope, childScope1, childScope2, descendantScope;
            var var1, var2, var3, node1, node2, node3, node4;
            var vardefs;
            beforeEach(function () {
                rootScope = scopeFactory.createDomainScope();
                childScope1 = scopeFactory.createPageScope(
                    esprima.parse('var a = 0;', {range: true, loc: true}),
                    rootScope
                );
                childScope2 = scopeFactory.createPageScope(
                    esprima.parse('var b = 0;', {range: true, loc: true}),
                    rootScope
                );
                descendantScope = scopeFactory.createFunctionScope(
                    esprima.parse('function foo() { var c = 0; }', {range: true, loc: true}).body[0],
                    'foo',
                    childScope1
                );
                var1 = varFactory.create('g');
                var2 = varFactory.create('a');
                var3 = varFactory.create('c');
                node1 = flownodeFactory.createLocalStorageNode();
                node2 = flownodeFactory.createNormalNode();
                node3 = flownodeFactory.createNormalNode();
                node2.label = 'inChildScope1';
                node3.label = 'inDescendantScope';

                node1.scope = rootScope;
                node2.scope = childScope1;
                node3.scope = descendantScope;

                rootScope._testonly_._vars.set('g', var1);
                childScope1._testonly_._vars.set('a', var2);
                descendantScope._testonly_._vars.set('c', var3);

                vardefs = new Set();
                vardefs.add(vardefFactory.create(var1, defFactory.createLiteralDef(node1, [0,0])));
                vardefs.add(vardefFactory.create(var1, defFactory.createLiteralDef(node2, [0,1])));
                vardefs.add(vardefFactory.create(var2, defFactory.createLiteralDef(node2, [1,2])));
                vardefs.add(vardefFactory.create(var3, defFactory.createLiteralDef(node3, [2,3])));
            });

            it('should get non-reachable VarDefs well', function () {
                var set = defuseAnalyzer._testonly_._getNonReachableVarDefs(vardefs, childScope2);
                set.size.should.eql(2);
                var setText = getTextOfVarDefSet(set);
                setText.should.containDeep([
                    '(a,literal@inChildScope1)',
                    '(c,literal@inDescendantScope)'
                ]);
            });
        });
    });

    describe('public methods', function () {
        var ast;
        afterEach(function () {
            scopeCtrl.clear();
            modelCtrl.clear();
            cfgBuilder.resetGraphNodeCounter();
        });

        describe('initiallyAnalyzeIntraProceduralModels', function () {
            beforeEach(function () {
                ast = esprima.parse(
                    'var a = 1, b = 0;' +
                    'function foo() {' +
                    'var c = a + b;' +
                    '}' +
                    'a--;',
                    {range: true, loc: true}
                );
                scopeCtrl.addPageScopeTree(ast);
                scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
                    scopeTree.scopes.forEach(function (scope) {
                        variableAnalyzer.setLocalVariables(scope);
                    });
                });
                modelCtrl.initializePageModels();
                modelBuilder.buildIntraProceduralModels();
            });

            it('should do initial analysis on intra-procedural models well', function () {
                defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
                var pageIntraProceduralModel = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(
                        scopeCtrl.pageScopeTrees[0],
                        scopeCtrl.pageScopeTrees[0].scopes[0]
                    ),
                    fooIntraProceduralModel = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(
                        scopeCtrl.pageScopeTrees[0],
                        scopeCtrl.pageScopeTrees[0].scopes[1]
                    );
                pageIntraProceduralModel.graph[0].generate.size.should.eql(14);
                fooIntraProceduralModel.graph[0].generate.size.should.eql(1);
            });
        });
    });
});