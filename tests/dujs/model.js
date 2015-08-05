/*
 * Test cases for Model module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
var Model = require('../../lib/dujs/model'),
    factoryScope = require('../../lib/dujs/scopefactory'),
    factoryFlowNode = require('../../lib/esgraph/flownodefactory'),
    factoryDUPair = require('../../lib/dujs/dupairfactory'),
    factoryVar = require('../../lib/dujs/varfactory');
var Set = require('../../lib/analyses/set'),
    Map = require('core-js/es6/map');
var should = require('should');

describe('Model', function () {
    "use strict";
    beforeEach(function () {
        factoryFlowNode.resetCounter();
    });

    describe('static methods', function () {
        describe('isModel', function () {
            it('should return false as the object is not an Model', function () {
                Model.isModel(null).should.eql(false);
                Model.isModel({}).should.eql(false);
            });

            it('should return true as the object is an Model', function () {
                Model.isModel(new Model()).should.eql(true);
            });
        });
    });

	describe('static data members', function () {
		describe('REACH_IN_ARTIFACT_TYPE', function () {
			it('should have correct value', function () {
				Model.REACH_IN_ARTIFACT_TYPE.should.eql('reachIn');
			});

			it('should not be modified directly', function () {
				should(function () {
					Model.REACH_IN_ARTIFACT_TYPE = '';
				}).throw();
			});
		});

		describe('REACH_OUT_ARTIFACT_TYPE', function () {
			it('should have correct value', function () {
				Model.REACH_OUT_ARTIFACT_TYPE.should.eql('reachOut');
			});

			it('should not be modified directly', function () {
				should(function () {
					Model.REACH_OUT_ARTIFACT_TYPE = '';
				}).throw();
			});
		});

		describe('KILL_ARTIFACT_TYPE', function () {
			it('should have correct value', function () {
				Model.KILL_ARTIFACT_TYPE.should.eql('kill');
			});

			it('should not be modified directly', function () {
				should(function () {
					Model.KILL_ARTIFACT_TYPE = '';
				}).throw();
			});
		});

		describe('GEN_ARTIFACT_TYPE', function () {
			it('should have correct value', function () {
				Model.GEN_ARTIFACT_TYPE.should.eql('gen');
			});

			it('should not be modified directly', function () {
				should(function () {
					Model.GEN_ARTIFACT_TYPE = '';
				}).throw();
			});
		});

		describe('USE_ARTIFACT_TYPE', function () {
			it('should have correct value', function () {
				Model.USE_ARTIFACT_TYPE.should.eql('use');
			});

			it('should not be modified directly', function () {
				should(function () {
					Model.USE_ARTIFACT_TYPE = '';
				}).throw();
			});
		});
	});

    describe('public data members', function () {
        describe('graph', function () {
            var model;
            beforeEach(function () {
                model = new Model();
            });

            it('should support to retrieve value correctly', function () {
                var node1 = factoryFlowNode.createEntryNode(),
                    node2 = factoryFlowNode.createExitNode(),
                    graph = [node1, node2, [node1, node2]];
	            model._testonly_._graph = graph;

                should.exist(model.graph);
	            model.graph.length.should.eql(3);
	            model.graph[0].should.eql(node1);
	            model.graph[1].should.eql(node2);
	            model.graph[2].length.should.eql(2);
            });

            it('should support to modify the value', function () {
                var node1 = factoryFlowNode.createEntryNode(),
                    node2 = factoryFlowNode.createExitNode(),
                    graph = [node1, node2, [node1, node2]];

	            model.graph = graph;
	            model._testonly_._graph.length.should.eql(3);
	            model._testonly_._graph[0].should.eql(node1);
	            model._testonly_._graph[1].should.eql(node2);
	            model._testonly_._graph[2].length.should.eql(2);
            });
        });

        describe('relatedScopes', function () {
            var model;
            beforeEach(function () {
	            model = new Model();
            });

            it('should support to retrieve value correctly', function () {
	            var scope = factoryScope.createDomainScope();
	            model._testonly_._relatedScopes.push(scope);

                should.exist(model.relatedScopes);
	            model.relatedScopes.length.should.eql(1);
	            model.relatedScopes[0].should.eql(scope);
            });

            it('should support to change value', function () {
                var scope = factoryScope.createDomainScope();
                model.relatedScopes = [scope];
                model._testonly_._relatedScopes.length.should.eql(1);
                model._testonly_._relatedScopes[0].should.eql(scope);
            });
        });

        describe('dupairs', function () {
            var model;
            beforeEach(function () {
                model = new Model();
            });

            it('should support to retrieve value correctly', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createNormalNode();
                node1.cfgId = 0;
                node2.cfgId = 1;
                var pair = factoryDUPair.create(node1,node2),
                    variable = factoryVar.create('var');
                model._testonly_._dupairs.set(variable, new Set([pair]));

                model.dupairs.size.should.eql(1);
                model.dupairs.get(variable).size.should.eql(1);
                model.dupairs.get(variable).values()[0]._testonly_._first.should.eql(node1);
                model.dupairs.get(variable).values()[0]._testonly_._second.should.eql(node2);
            });

            it('should support to modify value', function () {
                var node1 = factoryFlowNode.createNormalNode(),
                    node2 = factoryFlowNode.createNormalNode();
                node1.cfgId = 0;
                node2.cfgId = 1;
                var pair = factoryDUPair.create(node1,node2),
                    variable = factoryVar.create('var'),
                    pairs = new Map();
                pairs.set(variable, new Set([pair]));
                model.dupairs = pairs;

                model.dupairs.size.should.eql(1);
                model.dupairs.get(variable).size.should.eql(1);
            });
        });
    });

    describe('Methods', function () {
        var model, node1, node2, variable;
        beforeEach(function () {
	        model = new Model();
            node1 = factoryFlowNode.createNormalNode();
            node2 = factoryFlowNode.createNormalNode();
            node1.cfgId = 0;
            node2.cfgId = 1;
            variable = factoryVar.create('var');
        });

        describe('hasDUPair', function () {
            it('should found the reference of pair', function () {
                var pair = factoryDUPair.create(node1,node2);
	            model._testonly_._dupairs.set(variable, new Set([pair]));
	            model.hasDUPair(pair).should.eql(true);
            });

            it('should found the pair has same elements', function () {
                var pair = factoryDUPair.create(node1,node2);
	            model._testonly_._dupairs.set(variable, new Set([pair]));
	            model.hasDUPair(factoryDUPair.create(node1, node2)).should.eql(true);
            });

            it('should return false as the input is not a DUPair', function () {
	            model._testonly_._dupairs.set(variable, new Set([factoryDUPair.create(node1, node2)]));
	            model.hasDUPair([0,1]).should.eql(false);
	            model.hasDUPair({}).should.eql(false);
            });

            it('should return false as the pair value is not existed', function () {
                var pair = factoryDUPair.create(node1,node2);
	            model._testonly_._dupairs.set(variable, new Set([pair]));
	            model.hasDUPair(factoryDUPair.create(node2, node1)).should.eql(false);
            });
        });
    });
});