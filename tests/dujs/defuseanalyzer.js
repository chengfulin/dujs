/**
 * Test cases for DefUseAnalyzer
 * @lastmodifiedBy ChengFuLin
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
var jsParser = require('../../lib/dujs/jsparser'),
    Set = require('../../lib/analyses/set');

describe('DefUseAnalyzer', function () {
    "use strict";
    describe('private methods', function () {
        var ast, scope, model;
        beforeEach(function () {
            ast =jsParser.parseAST('var a = 1, b = 0;', {range: true, loc: true});
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
                /// feature 006: the Vars of the built-in objects are created from the descriptors
                scope.setBuiltInObjectVariables();
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
                scope.addVariable(varFactory.create('loc_1'));
                scope.addVariable(varFactory.create('loc_2'));
                scope.addVariable(varFactory.create('loc_3'));
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
                    jsParser.parseAST('var a = 0;', {range: true, loc: true}),
                    rootScope
                );
                childScope2 = scopeFactory.createPageScope(
                    jsParser.parseAST('var b = 0;', {range: true, loc: true}),
                    rootScope
                );
                descendantScope = scopeFactory.createFunctionScope(
                    jsParser.parseAST('function foo() { var c = 0; }', {range: true, loc: true}).body[0],
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

                rootScope.addVariable(var1);
                childScope1.addVariable(var2);
                descendantScope.addVariable(var3);

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
                ast = jsParser.parseAST(
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
/**
 * findGENSet records where each definition is completed (feature 007 T009,
 * data-model §3, research R3): cfgNode.generatedAt maps each VarDef of the
 * GEN set to the AST node completing it; the returned GEN set is unchanged.
 */
describe('DefUseAnalyzer.findGENSet generatedAt (feature 007 R3)', function () {
    "use strict";
    var analyze = require('../helpers/analyze'),
        FlowNode = require('../../lib/esgraph/flownode');

    after(function () {
        analyze.reset();
    });

    /**
     * The first node of a line in the intra-procedural model of a scope
     * @param {Object} result
     * @param {string} scopeName
     * @param {number} line
     * @returns {FlowNode}
     */
    function nodeAt(result, scopeName, line) {
        var found = null;
        modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
            if (model.mainlyRelatedScope.name !== scopeName) {
                return;
            }
            model.graph[2].forEach(function (node) {
                if (!found && node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE &&
                    node.line === line) {
                    found = node;
                }
            });
        });
        should.exist(found, 'no node at L' + line);
        return found;
    }

    /**
     * Run findGENSet on the node of a line and describe generatedAt
     * @param {string} source
     * @param {number} line
     * @param {string} [scopeName] default the page
     * @returns {Array} sorted "<variable>@<AST type>:<source of the AST>"
     */
    function generatedAtOf(source, line, scopeName) {
        var result = analyze(source),
            node = nodeAt(result, scopeName || '$DOMAIN.$PAGE_0', line),
            before = node.generate.values().map(String).sort(),
            returned = defuseAnalyzer.findGENSet(node);
        /// the returned GEN set is unchanged
        returned.values().map(String).sort().should.eql(before);
        (node.generatedAt instanceof Map).should.eql(true);
        node.generatedAt.size.should.eql(returned.size);
        return returned.values().map(function (vardef) {
            node.generatedAt.has(vardef).should.eql(true, 'no generatedAt of ' + vardef);
            var ast = node.generatedAt.get(vardef);
            return vardef.variable.toString() + '@' + ast.type + ':' + source.slice(ast.range[0], ast.range[1]);
        }).sort();
    }

    it('should map var y = g() to the VariableDeclarator', function () {
        generatedAtOf('function g() {}\nvar y = g();', 2).should.eql(['y@VariableDeclarator:y = g()']);
    });

    it('should map x = f() and x += f() to the AssignmentExpression', function () {
        var source = 'var x;\nfunction f() {}\nx = f();\nx += f();';
        generatedAtOf(source, 3).should.eql(['x@AssignmentExpression:x = f()']);
        generatedAtOf(source, 4).should.eql(['x@AssignmentExpression:x += f()']);
    });

    it('should map a chained assignment to each AssignmentExpression', function () {
        generatedAtOf('var a, b;\na = b = 1;', 2).should.eql(['a@AssignmentExpression:a = b = 1',
            'b@AssignmentExpression:b = 1']);
    });

    it('should map a destructuring declaration to the VariableDeclarator', function () {
        generatedAtOf('var c = [];\nvar [a, b] = c;', 2).should.eql(['a@VariableDeclarator:[a, b] = c',
            'b@VariableDeclarator:[a, b] = c']);
    });

    it('should map the loop variable of for-of to the loop statement', function () {
        generatedAtOf('var a = [];\nfor (var v of a) {\n}', 2).should.eql(['v@ForOfStatement:for (var v of a) {\n}']);
    });

    it('should map the name of a class declaration to the ClassDeclaration', function () {
        var defs = generatedAtOf('class A {\n  static y = 1;\n}', 1);
        defs.length.should.be.above(0);
        defs.forEach(function (def) {
            def.should.startWith('A@ClassDeclaration:class A {');
        });
    });

    it('should map a parameter default to its AssignmentExpression', function () {
        generatedAtOf('function g() {}\nfunction k(p,\n  q = g()) {\n}', 3, '$DOMAIN.$PAGE_0.k')
            .should.eql(['q@AssignmentExpression:q = g()']);
    });

    it('should map an update and a named function expression to themselves', function () {
        generatedAtOf('var i = 0;\ni++;', 2).should.eql(['i@UpdateExpression:i++']);
        generatedAtOf('var h = function n() {};', 1).should.eql(['h@VariableDeclarator:h = function n() {}',
            'n@FunctionExpression:function n() {}']);
    });
});
