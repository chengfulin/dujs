/*
 * Test cases for testing analysis execution
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-27
 */
var should = require('should');
var fs = require('fs');
var scopeCtrl = require('../../lib/dujs/scopectrl'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
    defuseAnalysisExecutor = require('../../lib/dujs/defuseanalysisexecutor');

describe('DefUseAnalysisExecutor', function () {
	"use strict";
	var dir, files, sources, expected;
    beforeEach(function () {
        dir = __dirname + '/cases/';
        files = fs.readdirSync(dir);
        sources = [];
        expected = [];

        files.forEach(function (file) {
            if(/.js$/.test(file)){
                sources.push(fs.readFileSync(dir + file, 'utf8'));
                expected.push(JSON.parse(fs.readFileSync(dir + '/' + file + '.expected.json')));
            }
        });
    });

    afterEach(function () {
        scopeCtrl.clear();
        modelCtrl.clear();
    });

    describe('public methods', function () {
        describe('initialize', function () {
            it('should initialize the scopeCtrl and modelCtrl well', function () {
                defuseAnalysisExecutor.initialize(sources);
                var pageScopeTrees = scopeCtrl.pageScopeTrees;
                var pageModels = modelCtrl.collectionOfPageModels;
                pageScopeTrees.length.should.eql(sources.length);
                pageModels.size.should.eql(sources.length);

                pageScopeTrees.forEach(function (scopeTree, index) {
                    scopeTree.scopes.length.should.eql(expected[index].numOfScopes);
                    var scopeNames = [];
                    scopeTree.scopes.forEach(function (scope, scopeIndex) {
                        scopeNames.push(scope.toString());
                        var scopeLocals = [];
                        scope.vars.forEach(function (variable) {
                            scopeLocals.push(variable.toString());
                        });
                        scopeLocals.should.containDeep(expected[index].scopeLocalVars[scopeIndex]);
                    });
                    scopeNames.should.containDeep(expected[index].scopeNames);

                    pageModels.has(scopeTree).should.eql(true);
                    should.exist(pageModels.get(scopeTree));
                });
            });
        });

        describe('buildIntraProceduralModelsOfEachPageModels', function () {
            beforeEach(function () {
                defuseAnalysisExecutor.initialize(sources);
                defuseAnalysisExecutor.buildIntraProceduralModelsOfEachPageModels();
            });

            it('should have intra-procedural models corresponding to each scope', function () {
                var pageScopeTrees = scopeCtrl.pageScopeTrees;
                var collectionPageModels = modelCtrl.collectionOfPageModels;
                /// model and corresponding scopes
                pageScopeTrees.forEach(function (scopeTree, index) {
                    var pageModel = collectionPageModels.get(scopeTree);
                    pageModel.intraProceduralModels.length.should.eql(expected[index].numOfIntraProceduralModels);
                    var scopesOfIntraProceduralModels = [];
                    pageModel.intraProceduralModels.forEach(function (model) {
                        scopesOfIntraProceduralModels.push(model.mainlyRelatedScope.toString());
                    });
                    var scopeNames = [];
                    scopeTree.scopes.forEach(function (scope) {
                        scopeNames.push(scope.toString());
                    });
                    scopeNames.should.containDeep(scopesOfIntraProceduralModels);
                });
            });
        });

        describe('buildInterProceduralModelsOfEachPageModels', function () {
            beforeEach(function () {
                defuseAnalysisExecutor.initialize(sources);
                defuseAnalysisExecutor.buildIntraProceduralModelsOfEachPageModels();
                defuseAnalysisExecutor.buildInterProceduralModelsOfEachPageModels();
            });

            it('should build inter-procedural models well', function () {
            });
        });
    });
});