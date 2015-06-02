/**
 * Created by chengfulin on 2015/4/10.
 */
var ReachDefinitions = require('../../lib/dujs').ReachDefinitions,
    Set = require('../../lib/analyses').Set,
    Var = require('../../lib/dujs').Var,
    Def = require('../../lib/dujs').Def,
    cfgext = require('../../lib/dujs').CFGExt,
    CFGWrapper = require('../../lib/dujs').CFGWrapper,
    Scope = require('../../lib/dujs').Scope,
    VarDef = require('../../lib/dujs').VarDef,
    vardefFactory = require('../../lib/dujs').factoryVarDef,
    varFactory = require('../../lib/dujs').factoryVar,
    FlowNode = require('../../lib/esgraph/flownode'),
    should = require('should');

describe('Reach Definitions (dependent on ScopeWrapper)', function () {
    'use strict';
    beforeEach(function () {
        cfgext.resetCounter();
    });
    describe('with initial RDs', function () {
        it('should work well', function () {
            var code = 'var a, b, c;',
                functionScope = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            functionScope.setVars();
            var globalNode = new FlowNode(FlowNode.GLOBAL_NODE_TYPE);
            globalNode.cfgId = 0;
            var rds = ReachDefinitions.findReachDefinitions(functionScope,
                new Set([
                    new VarDef(
                        new Var(
                            'Class',
                            [0, 1],
                            Scope.GLOBAL_SCOPE
                        ),
                        new Def(
                            globalNode,
                            Def.OBJECT_TYPE,
                            [0, 1],
                            Scope.GLOBAL_SCOPE
                        )
                    )
                ])
            );

            rds.inputs.size.should.eql(3);
            /// RDs at n0
            rds.inputs.get(functionScope.getCFG()[0]).size.should.eql(1);
            rds.outputs.get(functionScope.getCFG()[0]).size.should.eql(1);
            rds.inputs.get(functionScope.getCFG()[0]).values()[0]
                .toString()
                .should.eql('(Class@[0,1]_Global,Def@n0@[0,1]_Global)');
            /// RDs (in & out) at exit node
            rds.inputs.get(functionScope.getCFG()[1]).size.should.eql(1);
            rds.outputs.get(functionScope.getCFG()[1]).size.should.eql(1);
            rds.outputs.get(functionScope.getCFG()[1]).values()[0].toString().should.eql('(Class@[0,1]_Global,Def@n0@[0,1]_Global)');
        });
    });
    describe('without branch', function () {
        it('should support for CFG without branch', function () {
            var code = 'var a, b, c;' +
                    'a = 0;' +
                    'b = a++;' +
                    'c = a * b;',
                functionScope = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            functionScope.setVars();
            var rds = ReachDefinitions.findReachDefinitions(functionScope);

            rds.inputs.size.should.eql(6);
            functionScope.getCFG()[2][5].type.should.eql('exit');
            rds.inputs.get(functionScope.getCFG()[2][1]).size.should.eql(0);
            rds.inputs.get(functionScope.getCFG()[2][2]).size.should.eql(0);
            rds.inputs.get(functionScope.getCFG()[2][3]).size.should.eql(1);
            rds.inputs.get(functionScope.getCFG()[2][4]).size.should.eql(2);
            rds.inputs.get(functionScope.getCFG()[2][5]).size.should.eql(4);

            rds.outputs.get(functionScope.getCFG()[2][1]).size.should.eql(0);
            rds.outputs.get(functionScope.getCFG()[2][2]).size.should.eql(1);
            rds.outputs.get(functionScope.getCFG()[2][3]).size.should.eql(2);
            rds.outputs.get(functionScope.getCFG()[2][4]).size.should.eql(3);
            rds.outputs.get(functionScope.getCFG()[2][5]).size.should.eql(0);

            /// node 3: b = a++;
            /// ReachIn(node 3)
            var reachInNode3 = rds.inputs.get(functionScope.getCFG()[2][3]);
            reachInNode3.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[16,17]_Program)');

            /// ReachOut(node 3)
            var reachOutNode3 = rds.outputs.get(functionScope.getCFG()[2][3]),
                reachOutNode3Texts = [];
            reachOutNode3.forEach(function (rd) {
                reachOutNode3Texts.push(rd.toString());
            });
            reachOutNode3Texts.should.containDeep([
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)'
            ]);

            /// node 4: c = a * b;
            /// ReachIn(node 4)
            var reachInNode4 = rds.inputs.get(functionScope.getCFG()[2][4]),
                reachInNode4Texts = [];
            reachInNode4.forEach(function (rd) {
                reachInNode4Texts.push(rd.toString());
            });
            reachInNode4Texts.should.containDeep([
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)'
            ]);

            /// ReachOut(node 4)
            var reachOutNode4 = rds.outputs.get(functionScope.getCFG()[2][4]),
                reachOutNode4Text = [];
            reachOutNode4.forEach(function (rd) {
                reachOutNode4Text.push(rd.toString());
            });
            reachOutNode4Text.should.containDeep([
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);

            /// ReachIn(exit)
            var reachInExit = rds.inputs.get(functionScope.getCFG()[1]),
                reachInExitTexts = [];
            reachInExit.forEach(function (rd) {
                reachInExitTexts.push(rd.toString());
            });
            reachInExitTexts.should.containDeep([
                '(a@[4,5]_Program,Def@n2@[16,17]_Program)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);
        });
    });

    describe('with branch', function () {
        it('should support for if statement', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a = 1, b = 2, c;' +
                    'if (a > 0) {' +
                    '++a;' +
                    '} else if (b > a) {' +
                    '--b;' +
                    '}' +
                    'c = a + b;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgwrapper.setVars();
            var rds = ReachDefinitions.findReachDefinitions(cfgwrapper);

            rds.inputs.size.should.eql(8);
            rds.inputs.get(cfgwrapper.getCFG()[2][1]).size.should.eql(0);

            /// ReachIn at node 2:
            /// a > 0
            var rdTextsNode2 = [];
            rds.inputs.get(cfgwrapper.getCFG()[2][2]).size.should.eql(2);
            rds.inputs.get(cfgwrapper.getCFG()[2][2]).forEach(function (rd) {
                rdTextsNode2.push(rd.toString());
            });
            rdTextsNode2.should.containDeep([
                '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                '(b@[11,12]_Program,Def@n1@[15,16]_Program)'
            ]);

            /// ReachIn at node 3:
            /// ++a;
            var rdTextsNode3 = [];
            rds.inputs.get(cfgwrapper.getCFG()[2][3]).size.should.eql(2);
            rds.inputs.get(cfgwrapper.getCFG()[2][3]).forEach(function (rd) {
                rdTextsNode3.push(rd.toString());
            });
            rdTextsNode3.should.containDeep([
                '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                '(b@[11,12]_Program,Def@n1@[15,16]_Program)'
            ]);

            /// ReachIn at node 4:
            /// c = a + b;
            var rdTextsNode4 = [];
            rds.inputs.get(cfgwrapper.getCFG()[2][4]).size.should.eql(4);
            rds.inputs.get(cfgwrapper.getCFG()[2][4]).forEach(function (rd) {
                rdTextsNode4.push(rd.toString());
            });
            rdTextsNode4.should.containDeep([
                '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                '(b@[11,12]_Program,Def@n1@[15,16]_Program)',
                '(a@[4,5]_Program,Def@n3@[32,35]_Program)',
                '(b@[11,12]_Program,Def@n6@[55,58]_Program)'
            ]);

            /// ReachIn at node 5:
            /// b > a
            var rdTextsNode5 = [];
            rds.inputs.get(cfgwrapper.getCFG()[2][5]).size.should.eql(2);
            rds.inputs.get(cfgwrapper.getCFG()[2][5]).forEach(function (rd) {
                rdTextsNode5.push(rd.toString());
            });
            rdTextsNode5.should.containDeep([
                '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                '(b@[11,12]_Program,Def@n1@[15,16]_Program)'
            ]);

            /// ReachIn at node 6:
            /// --b;
            var rdTextsNode6 = [];
            rds.inputs.get(cfgwrapper.getCFG()[2][6]).size.should.eql(2);
            rds.inputs.get(cfgwrapper.getCFG()[2][6]).forEach(function (rd) {
                rdTextsNode6.push(rd.toString());
            });
            rdTextsNode6.should.containDeep([
                '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                '(b@[11,12]_Program,Def@n1@[15,16]_Program)'
            ]);
        });
    });

    beforeEach(function () {
        varFactory.resetGlobalsCounter();
    });
    describe('with init entry RDs', function () {
        it('should has init entry RDs and original RDs', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a, b, c;' +
                    'a = 0;' +
                    'b = a++;' +
                    'c = a * b;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgwrapper.setVars();

            var initRDs = new Set();
            initRDs.add(vardefFactory.createGlobalVarDef('outer', Def.LITERAL_TYPE));
            var rds = ReachDefinitions.findReachDefinitions(cfgwrapper, initRDs);

            /// ReachIn(entry)
            var reachInEntry = rds.inputs.get(cfgwrapper.getCFG()[0]);
            reachInEntry.size.should.eql(1);
            reachInEntry.values()[0].toString().should.eql('(outer@[0,1]_Global,Def@n0@[0,1]_Global)');

            /// ReachOut(entry)
            var reachOutEntry = rds.outputs.get(cfgwrapper.getCFG()[0]);
            reachOutEntry.size.should.eql(1);
            reachOutEntry.values()[0].toString().should.eql('(outer@[0,1]_Global,Def@n0@[0,1]_Global)');

            /// node 1: var a, b, c;
            /// ReachIn(node 1):
            var reachInNode1 = rds.inputs.get(cfgwrapper.getCFG()[2][1]);
            reachInNode1.size.should.eql(1);
            reachInNode1.values()[0].toString().should.eql('(outer@[0,1]_Global,Def@n0@[0,1]_Global)');

            /// ReachOut(node 1)
            var reachOutNode1 = rds.outputs.get(cfgwrapper.getCFG()[2][1]);
            reachOutNode1.size.should.eql(1);
            reachOutNode1.values()[0].toString().should.eql('(outer@[0,1]_Global,Def@n0@[0,1]_Global)');

            /// node 2: a = 0;
            /// ReachIn(node 2)
            var reachInNode2 = rds.inputs.get(cfgwrapper.getCFG()[2][2]);
            reachInNode2.size.should.eql(1);
            reachInNode2.values()[0].toString().should.eql('(outer@[0,1]_Global,Def@n0@[0,1]_Global)');

            /// ReachOut(node 2)
            var reachOutNode2 = rds.outputs.get(cfgwrapper.getCFG()[2][2]);
            reachOutNode2.size.should.eql(2);
            var reachOutNode2Texts = [];
            reachOutNode2.values().forEach(function (rd) {
                reachOutNode2Texts.push(rd.toString());
            });
            reachOutNode2Texts.should.containDeep([
                '(outer@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(a@[4,5]_Program,Def@n2@[16,17]_Program)'
            ]);

            /// node 3: b = a++;
            /// ReachIn(node 3)
            var reachInNode3 = rds.inputs.get(cfgwrapper.getCFG()[2][3]);
            reachInNode3.size.should.eql(2);
            var reachInNode3Texts = [];
            reachInNode3.forEach(function (rd) {
                reachInNode3Texts.push(rd.toString());
            });
            reachInNode3Texts.should.containDeep([
                '(outer@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(a@[4,5]_Program,Def@n2@[16,17]_Program)'
            ]);

            /// ReachOut(node 3)
            var reachOutNode3 = rds.outputs.get(cfgwrapper.getCFG()[2][3]);
            reachOutNode3.size.should.eql(3);
            var reachOutNode3Texts = [];
            reachOutNode3.forEach(function (rd) {
                reachOutNode3Texts.push(rd.toString());
            });
            reachOutNode3Texts.should.containDeep([
                '(outer@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)'
            ]);

            /// node 4: c = a * b;
            /// ReachIn(node 4)
            var reachInNode4 = rds.inputs.get(cfgwrapper.getCFG()[2][4]);
            reachInNode4.size.should.eql(3);
            var reachInNode4Texts = [];
            reachInNode4.forEach(function (rd) {
                reachInNode4Texts.push(rd.toString());
            });
            reachInNode4Texts.should.containDeep([
                '(outer@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)'
            ]);

            /// ReachOut(node 4)
            var reachOutNode4 = rds.outputs.get(cfgwrapper.getCFG()[2][4]);
            reachOutNode4.size.should.eql(4);
            var reachOutNode4Texts = [];
            reachOutNode4.forEach(function (rd) {
                reachOutNode4Texts.push(rd.toString());
            });
            reachOutNode4Texts.should.containDeep([
                '(outer@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);

            /// ReachIn(exit)
            var reachInExit = rds.inputs.get(cfgwrapper.getCFG()[1]);
            reachInExit.size.should.eql(5);
            var reachInExitTexts = [];
            reachInExit.forEach(function (rd) {
                reachInExitTexts.push(rd.toString());
            });
            reachInExitTexts.should.containDeep([
                '(outer@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(a@[4,5]_Program,Def@n2@[16,17]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);

            /// ReachOut(exit);
            var reachOutExit = rds.outputs.get(cfgwrapper.getCFG()[1]);
            reachOutExit.size.should.eql(1);
            reachOutExit.values()[0].toString().should.eql('(outer@[0,1]_Global,Def@n0@[0,1]_Global)');
        });
    });

    describe('with additional definition at other point expect exit node', function () {
        it('should contain the additional definition and keep the originals', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a, b, c;' +
                    'a = 0;' +
                    'b = a++;' +
                    'c = a * b;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgwrapper.setVars();

            var rds = ReachDefinitions.findReachDefinitions(cfgwrapper),
                extraRDs = new Set();
            extraRDs.add(vardefFactory.createGlobalVarDef('extra', Def.LITERAL_TYPE));
            var updatedRDs = ReachDefinitions.findReachDefinitions(cfgwrapper, Set.union(rds.inputs.get(cfgwrapper.getCFG()[2][3]), extraRDs), cfgwrapper.getCFG()[2][3]);

            /// ReachIn(entry)
            var reachInEntry = updatedRDs.inputs.get(cfgwrapper.getCFG()[0]);
            reachInEntry.forEach(function (rd) {
                console.log(rd.toString());
            });
            reachInEntry.size.should.eql(0);

            /// ReachOut(entry)
            var reachOutEntry = updatedRDs.outputs.get(cfgwrapper.getCFG()[0]);
            reachOutEntry.size.should.eql(0);

            /// ReachIn(node 1)
            var reachInNode1 = updatedRDs.inputs.get(cfgwrapper.getCFG()[2][1]);
            reachInNode1.size.should.eql(0);

            /// ReachOut(node 1)
            var reachOutNode1 = updatedRDs.outputs.get(cfgwrapper.getCFG()[2][1]);
            reachOutNode1.size.should.eql(0);

            /// ReachIn(node 2)
            var reachInNode2 = updatedRDs.inputs.get(cfgwrapper.getCFG()[2][2]);
            reachInNode2.size.should.eql(0);

            /// ReachOut(node 2)
            var reachOutNode2 = updatedRDs.outputs.get(cfgwrapper.getCFG()[2][2]);
            reachOutNode2.size.should.eql(1);
            reachOutNode2.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[16,17]_Program)');

            /// ReachIn(node 3)
            /// because the extra definition was added in inputs, the ReachIn set won't be changed but the ReachOut will be
            var reachInNode3 = updatedRDs.inputs.get(cfgwrapper.getCFG()[2][3]);
            reachInNode3.size.should.eql(1);
            reachInNode3.values()[0].toString().should.eql('(a@[4,5]_Program,Def@n2@[16,17]_Program)');

            /// ReachOut(node 3)
            var reachOutNode3 = updatedRDs.outputs.get(cfgwrapper.getCFG()[2][3]);
            reachOutNode3.size.should.eql(3);
            var reachOutNode3Texts = [];
            reachOutNode3.forEach(function (rd) {
                reachOutNode3Texts.push(rd.toString());
            });
            reachOutNode3Texts.should.containDeep([
                '(extra@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)'
            ]);

            /// ReachIn(node 4)
            var reachInNode4 = updatedRDs.inputs.get(cfgwrapper.getCFG()[2][4]);
            reachInNode4.size.should.eql(3);
            var reachInNode4Texts = [];
            reachInNode4.forEach(function (rd) {
                reachInNode4Texts.push(rd.toString());
            });
            reachInNode4Texts.should.containDeep([
                '(extra@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)'
            ]);

            /// ReachOut(node 4)
            var reachOutNode4 = updatedRDs.outputs.get(cfgwrapper.getCFG()[2][4]);
            reachOutNode4.size.should.eql(4);
            var reachOutNode4Texts = [];
            reachOutNode4.forEach(function (rd) {
                reachOutNode4Texts.push(rd.toString());
            });
            reachOutNode4Texts.should.containDeep([
                '(extra@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);

            /// ReachIn(exit)
            var reachInExit = updatedRDs.inputs.get(cfgwrapper.getCFG()[1]);
            reachInExit.size.should.eql(5);
            var reachInExitTexts = [];
            reachInExit.forEach(function (rd) {
                reachInExitTexts.push(rd.toString());
            });
            reachInExitTexts.should.containDeep([
                '(a@[4,5]_Program,Def@n2@[16,17]_Program)',
                '(extra@[0,1]_Global,Def@n0@[0,1]_Global)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);

            /// ReachOut(exit)
            var reachOutExit = updatedRDs.outputs.get(cfgwrapper.getCFG()[1]);
            reachOutExit.size.should.eql(1);
            reachOutExit.values()[0].toString().should.eql('(extra@[0,1]_Global,Def@n0@[0,1]_Global)');
        });
    });

    describe('with additional definition at exit node', function () {
        it('should contain extra definition and keep the originals', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a, b, c;' +
                    'a = 0;' +
                    'b = a++;' +
                    'c = a * b;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgwrapper.setVars();
            var rds = ReachDefinitions.findReachDefinitions(cfgwrapper),
                extraRDs = new Set();

            extraRDs.add(vardefFactory.createGlobalVarDef('extra', Def.LITERAL_TYPE));
            var updatedRDs = ReachDefinitions.findReachDefinitions(cfgwrapper, Set.union(rds.inputs.get(cfgwrapper.getCFG()[1]), extraRDs), cfgwrapper.getCFG()[1]);

            /// ReachIn(node 4)
            var reachInNode4 = updatedRDs.inputs.get(cfgwrapper.getCFG()[2][4]);
            reachInNode4.size.should.eql(2);
            var reachInNode4Texts = [];
            reachInNode4.forEach(function (rd) {
                reachInNode4Texts.push(rd.toString());
            });
            reachInNode4Texts.should.containDeep([
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)'
            ]);

            /// ReachOut(node 4)
            var reachOutNode4 = updatedRDs.outputs.get(cfgwrapper.getCFG()[2][4]);
            reachOutNode4.size.should.eql(3);
            var reachOutNode4Texts = [];
            reachOutNode4.forEach(function (rd) {
                reachOutNode4Texts.push(rd.toString());
            });
            reachOutNode4Texts.should.containDeep([
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);

            /// ReachIn(exit)
            var reachInExit = updatedRDs.inputs.get(cfgwrapper.getCFG()[1]);
            reachInExit.size.should.eql(4);
            var reachInExitTexts = [];
            reachInExit.forEach(function (rd) {
                reachInExitTexts.push(rd.toString());
            });
            reachInExitTexts.should.containDeep([
                '(a@[4,5]_Program,Def@n2@[16,17]_Program)',
                '(b@[7,8]_Program,Def@n3@[22,25]_Program)',
                '(a@[4,5]_Program,Def@n3@[22,25]_Program)',
                '(c@[10,11]_Program,Def@n4@[30,35]_Program)'
            ]);

            /// ReachOut(exit)
            var reachOutExit = updatedRDs.outputs.get(cfgwrapper.getCFG()[1]);
            reachOutExit.size.should.eql(1);
            reachOutExit.values()[0].toString().should.eql('(extra@[0,1]_Global,Def@n0@[0,1]_Global)');
        });
    });
});
