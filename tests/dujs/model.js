/*
 * Test cases for Model module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var Model = require('../../lib/dujs/model'),
    factoryScope = require('../../lib/dujs/scopefactory'),
    factoryFlowNode = require('../../lib/esgraph/flownodefactory'),
    factoryDUPair = require('../../lib/dujs/dupairfactory'),
    factoryVar = require('../../lib/dujs/varfactory');
var Set = require('../../lib/analyses/set'),
    jsParser = require('../../lib/dujs/jsparser');
var should = require('should');

describe('Model', function () {
    "use strict";
    afterEach(function () {
        factoryFlowNode.resetCounter();
        factoryScope.resetPageScopeCounter();
        factoryScope.resetAnonymousFunctionScopeCounter();
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

		describe('mainlyRelatedScope', function () {
			var model;
			beforeEach(function () {
				model = new Model();
			});

			it('should support to retrieve the value', function () {
				should.not.exist(model.mainlyRelatedScope);
				var scope = factoryScope.createDomainScope();
				model._testonly_._mainlyRelatedScope = scope;
				should.exist(model.mainlyRelatedScope);
				model.mainlyRelatedScope.should.eql(scope);
			});

			it('should not be modified directly', function () {
				should(function () {
					model.mainlyRelatedScope = {};
				}).throw();
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

		describe('isMainlyRelatedToTheScope', function () {
			var model, scope;
			beforeEach(function () {
				model = new Model();
				scope = factoryScope.createDomainScope();
				model._testonly_._mainlyRelatedScope = scope;
			});

			it('should return true as the input scope is equal to the mainlyRelatedScope', function () {
				model.isMainlyRelatedToTheScope(scope).should.eql(true);
			});

			it('should return false otherwise', function () {
				model.isMainlyRelatedToTheScope(factoryScope.createDomainScope()).should.eql(false);
			});
		});

        describe('addRelatedScope', function () {
            var model, scope1, scope2;
            beforeEach(function () {
                model = new Model();
                scope1 = factoryScope.createDomainScope();
                scope2 = factoryScope.createPageScope(jsParser.parseAST('var a;', {range: true, loc: true}));
            });

            it('should add the first related scope as mainly related scope', function () {
                model.addRelatedScope(scope1);
                model._testonly_._relatedScopes.length.should.eql(1);
                model._testonly_._mainlyRelatedScope.should.eql(scope1);
            });

            it('should support to add multiple related scopes', function () {
                model.addRelatedScope(scope1);
                model.addRelatedScope(scope2);
                model._testonly_._relatedScopes.length.should.eql(2);
            });
        });
    });
    describe('levels, hierarchy and analysis results', function () {
        var RESULT_FIELDS = ['reachIns', 'reachOuts', 'generate', 'kill', 'cuse', 'puse'];
        var model, entry, middle, exit, outside;

        function record(seed) {
            return {
                reachIns: new Set([seed + 'in']),
                reachOuts: new Set([seed + 'out']),
                generate: new Set([seed + 'gen']),
                kill: new Set([seed + 'kill']),
                cuse: new Set([seed + 'cuse']),
                puse: null
            };
        }

        beforeEach(function () {
            model = new Model();
            entry = factoryFlowNode.createEntryNode();
            middle = factoryFlowNode.createNormalNode();
            exit = factoryFlowNode.createExitNode();
            outside = factoryFlowNode.createNormalNode();
            entry.connect(middle);
            middle.connect(exit);
            model.graph = [entry, exit, [entry, middle, exit]];
        });

        it('should define the constants of the levels', function () {
            Model.INTRA_PROCEDURAL.should.eql('intra-procedural');
            Model.INTER_PROCEDURAL.should.eql('inter-procedural');
            Model.INTRA_PAGE.should.eql('intra-page');
            Model.INTER_PAGE.should.eql('inter-page');
        });

        it('should support to set the level', function () {
            should(new Model().level).equal(null);
            model.level = Model.INTER_PAGE;
            model.level.should.eql('inter-page');
            model.level = 'unknown';
            model.level.should.eql('inter-page');
        });

        it('should have no hierarchy by default', function () {
            should(new Model().hierarchy).equal(null);
        });

        it('should map a node of an intra-procedural model to itself', function () {
            model.level = Model.INTRA_PROCEDURAL;
            model.flatNodeOf(entry).should.equal(entry);
            model.flatNodeOf(middle).should.equal(middle);
            model.flatNodeOf(exit).should.equal(exit);
        });

        it('should return null for a node not in the graph', function () {
            should(model.flatNodeOf(outside)).equal(null);
            should(model.flatNodeOf(null)).equal(null);
            should(new Model().flatNodeOf(entry)).equal(null);
        });

        it('should map an original to its flat node and a flat node to itself', function () {
            var copyEntry = factoryFlowNode.createEntryNode(),
                copyExit = factoryFlowNode.createExitNode(),
                upper = new Model();
            copyEntry.connect(copyExit);
            upper.graph = [copyEntry, copyExit, [copyEntry, copyExit]];
            upper._testonly_._flatNodeOf = new Map([[entry, copyEntry], [exit, copyExit]]);
            upper.flatNodeOf(entry).should.equal(copyEntry);
            upper.flatNodeOf(copyExit).should.equal(copyExit);
            should(upper.flatNodeOf(middle)).equal(null);
        });

        /// feature 005 data-model §4: the values of setCallBypasses are CallSiteRecords
        it('should keep the CallSiteRecords of the calls in their order', function () {
            var callReturn = factoryFlowNode.createCallReturnNode(),
                other = factoryFlowNode.createCallReturnNode(),
                first = Object.freeze({callNode: middle, callReturn: callReturn, calleeScope: null,
                    exceptionalReturn: exit, entry: null, exit: null, seq: 3, back: false,
                    beforeDecision: false, callSiteLine: 2}),
                second = Object.freeze({callNode: callReturn, callReturn: other, calleeScope: null,
                    exceptionalReturn: exit, entry: null, exit: null, seq: 4, back: true,
                    beforeDecision: false, callSiteLine: 2}),
                map = new Map([[callReturn, first], [other, second]]);
            model.setCallBypasses(map);
            map.clear();
            model.callBypassOf(callReturn).should.equal(first);
            model.callBypassOf(callReturn).exceptionalReturn.should.equal(exit);
            model.callBypassOf(other).should.equal(second);
            should(model.callBypassOf(middle)).equal(null);
            var records = model.callSiteRecords();
            records.length.should.eql(2);
            records[0].should.equal(first);
            records[1].should.equal(second);
            records.pop();
            model.callSiteRecords().length.should.eql(2);
            new Model().callSiteRecords().should.eql([]);
        });

        /// feature 005 data-model §5 (User Story 4): the LoopRecords of expand
        it('should keep the LoopRecords of the model in their order, set only once', function () {
            var loop = factoryFlowNode.createLoopNode(),
                loopReturn = factoryFlowNode.createLoopReturnNode(),
                first = Object.freeze({loop: loop, loopReturn: loopReturn,
                    handlers: [{scope: null, entry: entry, exit: exit}], noHandler: false}),
                second = Object.freeze({loop: loop, loopReturn: loopReturn, handlers: [], noHandler: true}),
                list = [first, second];
            new Model().loopRecords().should.eql([]);
            model.setLoopRecords(list);
            list.pop();
            var records = model.loopRecords();
            records.length.should.eql(2);
            records[0].should.equal(first);
            records[1].should.equal(second);
            records.pop();
            model.loopRecords().length.should.eql(2);
            (function () {
                model.setLoopRecords([]);
            }).should.throw(/only once/);
            (function () {
                new Model().setLoopRecords(new Map());
            }).should.throw(/should be an Array/);
        });

        /// feature 005 research R1: original VarDef -> VarDef of the graph
        it('should map an original VarDef by setFlatVarDefOf and default to the identity', function () {
            var original = {name: 'original'},
                rebuilt = {name: 'rebuilt'},
                missing = {name: 'missing'};
            model.flatVarDefOf(original).should.equal(original);
            var map = new Map([[original, rebuilt]]);
            model.setFlatVarDefOf(map);
            map.clear();
            model.flatVarDefOf(original).should.equal(rebuilt);
            should(model.flatVarDefOf(missing)).equal(null);
            model.setFlatVarDefOf(null);
            model.flatVarDefOf(missing).should.equal(missing);
            should(function () {
                model.setFlatVarDefOf({});
            }).throw();
        });

        it('should return null before the model is analyzed', function () {
            should(model.analysisResultOf(middle)).equal(null);
        });

        it('should return null for a node not in the model', function () {
            model.setAnalysisResults(new Map([[middle, record('m')]]));
            should(model.analysisResultOf(outside)).equal(null);
            should(model.analysisResultOf(entry)).equal(null);
        });

        it('should return a frozen record of new Sets each time', function () {
            model.setAnalysisResults(new Map([[middle, record('m')]]));
            var result = model.analysisResultOf(middle);
            Object.isFrozen(result).should.eql(true);
            Object.keys(result).sort().should.eql(RESULT_FIELDS.concat([]).sort());
            result.reachIns.values().should.eql(['min']);
            result.reachOuts.values().should.eql(['mout']);
            result.generate.values().should.eql(['mgen']);
            result.kill.values().should.eql(['mkill']);
            result.cuse.values().should.eql(['mcuse']);
            should(result.puse).equal(null);

            var again = model.analysisResultOf(middle);
            RESULT_FIELDS.forEach(function (field) {
                if (result[field] !== null) {
                    (result[field] === again[field]).should.eql(false);
                    (result[field] instanceof Set).should.eql(true);
                }
            });
            again.should.not.equal(result);
        });

        it('should not be affected by changing the returned Sets or the given record', function () {
            var given = record('m');
            model.setAnalysisResults(new Map([[middle, given]]));
            var result = model.analysisResultOf(middle);
            RESULT_FIELDS.forEach(function (field) {
                if (result[field] !== null) {
                    result[field].add('changed');
                }
            });
            given.reachIns.add('given');
            given.kill = new Set(['replaced']);
            var again = model.analysisResultOf(middle);
            again.reachIns.values().should.eql(['min']);
            again.reachOuts.values().should.eql(['mout']);
            again.generate.values().should.eql(['mgen']);
            again.kill.values().should.eql(['mkill']);
            again.cuse.values().should.eql(['mcuse']);
        });

        it('should accept an original of an upper model', function () {
            var copyEntry = factoryFlowNode.createEntryNode(),
                copyExit = factoryFlowNode.createExitNode(),
                upper = new Model();
            copyEntry.connect(copyExit);
            upper.graph = [copyEntry, copyExit, [copyEntry, copyExit]];
            upper._testonly_._flatNodeOf = new Map([[entry, copyEntry], [exit, copyExit]]);
            upper.setAnalysisResults(new Map([[copyEntry, record('e')]]));
            upper.analysisResultOf(entry).reachIns.values().should.eql(['ein']);
            upper.analysisResultOf(copyEntry).reachIns.values().should.eql(['ein']);
            should(upper.analysisResultOf(exit)).equal(null);
        });
    });
    describe('analysis results kept by defuseAnalyzer.doAnalysis', function () {
        var scopeCtrl = require('../../lib/dujs/scopectrl'),
            modelCtrl = require('../../lib/dujs/modelctrl'),
            modelBuilder = require('../../lib/dujs/modelbuilder'),
            variableAnalyzer = require('../../lib/dujs/variableanalyzer'),
            defuseAnalyzer = require('../../lib/dujs/defuseanalyzer');
        var model, scope;

        beforeEach(function () {
            var ast = jsParser.parseAST('var a = 1;\nvar b = a;\nif (b) {\n a = 2;\n}', {range: true, loc: true});
            scopeCtrl.addPageScopeTree(ast);
            scopeCtrl.pageScopeTrees[0].scopes.forEach(function (aScope) {
                variableAnalyzer.setLocalVariables(aScope);
            });
            modelCtrl.initializePageModels();
            modelCtrl.addPageModels(scopeCtrl.pageScopeTrees[0]);
            modelBuilder.buildIntraProceduralModels();
            defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
            scope = scopeCtrl.pageScopeTrees[0].scopes[0];
            model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(
                scopeCtrl.pageScopeTrees[0], scope);
        });

        afterEach(function () {
            scopeCtrl.clear();
            modelCtrl.clear();
        });

        function sameValues(actual, expected) {
            if (expected === null) {
                should(actual).equal(null);
            } else {
                actual.values().length.should.eql(expected.values().length);
                actual.values().forEach(function (value, i) {
                    (value === expected.values()[i]).should.eql(true);
                });
            }
        }

        it('should keep the result of every node, equal to the fields of the node', function () {
            should(model.analysisResultOf(model.graph[0])).equal(null);
            defuseAnalyzer.doAnalysis(model);
            var nodes = model.graph[2];
            nodes.length.should.be.above(3);
            nodes.forEach(function (node) {
                var result = model.analysisResultOf(node);
                should.exist(result);
                sameValues(result.reachIns, node.reachIns);
                sameValues(result.reachOuts, node.reachOuts);
                sameValues(result.generate, node.generate || new Set());
                sameValues(result.kill, node.kill);
                sameValues(result.cuse, node.cuse);
                sameValues(result.puse, node.puse);
            });
        });

        it('should not be changed by changing the fields of the nodes', function () {
            defuseAnalyzer.doAnalysis(model);
            var node = model.graph[2].filter(function (aNode) {
                return aNode.reachIns.size > 0;
            })[0];
            var size = model.analysisResultOf(node).reachIns.size;
            node.reachIns = new Set();
            model.analysisResultOf(node).reachIns.size.should.eql(size);
        });

        it('should not keep the reach-ins in the scope', function () {
            defuseAnalyzer.doAnalysis(model);
            should(scope.lastReachIns).equal(undefined);
        });
    });
});