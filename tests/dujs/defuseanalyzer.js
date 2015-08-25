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
    cfgBuilder = require('../../lib/dujs/cfgbuilder');
var esprima = require('esprima');

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
    });
});