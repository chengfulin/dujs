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
    should = require('should');

describe('Reach Definitions (dependent on CFGWrapper)', function () {
    'use strict';
    beforeEach(function () {
        cfgext.resetCounter();
    });
    describe('with initial RDs', function () {
        it('should work well', function () {
            var code = 'var a, b, c;',
                functionScope = new CFGWrapper(cfgext.getCFG(cfgext.parseAST(code)), Scope.PROGRAM_SCOPE);
            functionScope.setVars();
            var rds = ReachDefinitions.findReachDefinitions(functionScope,
                    new Set([
                        new VarDef(
                            new Var(
                                'Class',
                                [0, 1],
                                Scope.GLOBAL_SCOPE
                            ),
                            new Def(
                                0,
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
            rds.inputs.get(functionScope.getCFG()[2][5]).size.should.eql(3);

            rds.inputs.get(functionScope.getCFG()[2][3]).values()[0]
                .variable.toString().should.eql('a@[4,5]_Program');
            rds.inputs.get(functionScope.getCFG()[2][3]).values()[0]
                .definition.toString().should.eql('Def@n2@[16,17]_Program');
            rds.inputs.get(functionScope.getCFG()[2][4]).values()[1]
                .variable.toString().should.eql('b@[7,8]_Program');
            rds.inputs.get(functionScope.getCFG()[2][4]).values()[1]
                .definition.toString().should.eql('Def@n3@[22,25]_Program');
            rds.inputs.get(functionScope.getCFG()[2][5]).values()[2]
                .variable.toString().should.eql('c@[10,11]_Program');
            rds.inputs.get(functionScope.getCFG()[2][5]).values()[2]
                .definition.toString().should.eql('Def@n4@[30,35]_Program');
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
});
