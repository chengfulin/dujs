/**
 * Test cases for PageModels
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-27
 */
var should = require('should');
var PageModels = require('../../lib/dujs/pagemodels'),
    modelFactory = require('../../lib/dujs/modelfactory'),
    scopeTreeFactory = require('../../lib/dujs/scopetreefactory'),
    scopeFactory = require('../../lib/dujs/scopefactory'),
    jsParser = require('../../lib/dujs/jsparser');

describe('PageModels', function () {
    "use strict";
    var scopeTree, pageModels;
    beforeEach(function () {
        scopeTree = scopeTreeFactory.create();
        pageModels = new PageModels(scopeTree);
    });

    describe('public methods', function () {
        describe('hasTheIntraProceduralModel', function () {
            it('should check the model is an intra-procedural model of this PageModels', function () {
                var model = modelFactory.create();
                pageModels.hasTheIntraProceduralModel(model).should.eql(false);
                pageModels._testonly_._intraProceduralModels.push(model);
                pageModels.hasTheIntraProceduralModel(model).should.eql(true);
            });
        });

        describe('addIntraProceduralModel', function () {
            it('should add the model into collection of intra-procedural models', function () {
                var model = modelFactory.create();
                pageModels.addIntraProceduralModel(model);
                pageModels._testonly_._intraProceduralModels[0].should.eql(model);
            });

            it('should ignore existed intra-procedural model', function () {
                var model = modelFactory.create();
                pageModels.addIntraProceduralModel(model);
                pageModels.addIntraProceduralModel(model);
                pageModels._testonly_._intraProceduralModels.length.should.eql(1);
            });
        });

        describe('hasTheInterProceduralModel', function () {
            it('should check the model is an inter-procedural model of this PageModels', function () {
                var model = modelFactory.create();
                pageModels.hasTheInterProceduralModel(model).should.eql(false);
                pageModels._testonly_._interProceduralModels.push(model);
                pageModels.hasTheInterProceduralModel(model).should.eql(true);
            });
        });

        describe('addInterProceduralModel', function () {
            it('should add the model into collection of inter-procedural models', function () {
                var model = modelFactory.create();
                pageModels.addInterProceduralModel(model);
                pageModels._testonly_._interProceduralModels[0].should.eql(model);
            });

            it('should ignore existed inter-procedural model', function () {
                var model = modelFactory.create();
                pageModels.addInterProceduralModel(model);
                pageModels.addInterProceduralModel(model);
                pageModels._testonly_._interProceduralModels.length.should.eql(1);
            });
        });

        describe('hasTheIntraPageModel', function () {
            it('should check the model is an intra-page model of this PageModels', function () {
                var model = modelFactory.create();
                pageModels.hasTheIntraPageModel(model).should.eql(false);
                pageModels._testonly_._intraPageModels.push(model);
                pageModels.hasTheIntraPageModel(model).should.eql(true);
            });
        });

        describe('addIntraPageModel', function () {
            it('should add the model into collection of intra-page models', function () {
                var model = modelFactory.create();
                pageModels.addIntraPageModel(model);
                pageModels._testonly_._intraPageModels[0].should.eql(model);
            });

            it('should ignore existed intra-page model', function () {
                var model = modelFactory.create();
                pageModels.addIntraPageModel(model);
                pageModels.addIntraPageModel(model);
                pageModels._testonly_._intraPageModels.length.should.eql(1);
            });
        });

        var model1, model2, model3, pageScope, funScope, fooScope;
        beforeEach(function () {
            model1 = modelFactory.create();
            model2 = modelFactory.create();
            model3 = modelFactory.create();

            pageScope = scopeFactory.createPageScope(jsParser.parseAST('var a;'));
            funScope = scopeFactory.createFunctionScope(jsParser.parseAST('function fun() {var b;}').body[0], 'fun');
            fooScope = scopeFactory.createFunctionScope(jsParser.parseAST('function foo() {var c;}').body[0], 'foo');
        });

        describe('getIntraProceduralModelByMainlyRelatedScope', function () {
            beforeEach(function () {
                model1._testonly_._mainlyRelatedScope = pageScope;
                model2._testonly_._mainlyRelatedScope = funScope;
                model3._testonly_._mainlyRelatedScope = fooScope;
                model1._testonly_._relatedScopes.push(pageScope);
                model2._testonly_._relatedScopes.push(fooScope);
                model3._testonly_._relatedScopes.push(funScope);

                pageModels._testonly_._intraProceduralModels.push(model1);
                pageModels._testonly_._intraProceduralModels.push(model2);
                pageModels._testonly_._intraProceduralModels.push(model3);
            });

            it('should get the intra-procedural by its mainly related scope well', function () {
                var model = pageModels.getIntraProceduralModelByMainlyRelatedScope(pageScope);
                should.exist(model);
                model.mainlyRelatedScope.should.eql(pageScope);
                model = pageModels.getIntraProceduralModelByMainlyRelatedScope(scopeFactory.createDomainScope());
                should.not.exist(model);
            });
        });

        describe('getIntraProceduralModelByMainlyRelatedScope', function () {
            beforeEach(function () {
                model1._testonly_._mainlyRelatedScope = pageScope;
                model2._testonly_._mainlyRelatedScope = fooScope;

                model1._testonly_._relatedScopes.push(pageScope);
                model1._testonly_._relatedScopes.push(funScope);
                model2._testonly_._relatedScopes.push(fooScope);
                model2._testonly_._relatedScopes.push(funScope);

                pageModels._testonly_._interProceduralModels.push(model1);
                pageModels._testonly_._interProceduralModels.push(model2);
            });

            it('should get the inter-procedural by its mainly related scope well', function () {
                var model = pageModels.getInterProceduralModelByMainlyRelatedScope(pageScope);
                should.exist(model);
                model.mainlyRelatedScope.should.eql(pageScope);
                model = pageModels.getInterProceduralModelByMainlyRelatedScope(funScope);
                should.not.exist(model);
            });
        });
    });
});