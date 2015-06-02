/**
 * Created by chengfulin on 2015/4/20.
 */
var CFGWrapper = require('../../lib/dujs').CFGWrapper,
    Var = require('../../lib/dujs').Var,
    Def = require('../../lib/dujs').Def,
    Scope = require('../../lib/dujs').Scope,
    Range = require('../../lib/dujs').Range,
    CfgExt = require('../../lib/dujs').CFGExt,
    Map = require('core-js/es6/map'),
    Set = require('../../lib/analyses').Set,
    vardefFactory = require('../../lib/dujs').factoryVarDef,
    varFactory = require('../../lib/dujs').factoryVar,
    FlowNode = require('../../lib/esgraph/flownode'),
    should = require('should');

describe('ScopeWrapper', function () {
    'use strict';
    var code,
        scopeASTs,
        scopeCFGs,
        programScope,
        funScope,
        anonymousFunScope,
        funParams,
        anonymousParams,
        programCFGWrapper,
        funCFGWrapper,
        anonymousFunCFGWrapper;

    beforeEach(function () {
        CfgExt.resetCounter();
        varFactory.resetGlobalsCounter();

        code = 'var a = 0, b = 1;\n' +
        'function fun(a,b) {\n' +
            'var c = a + b;\n' +
        '}\n' +
        'var d = function () {};';
        scopeASTs = [];
        scopeCFGs = [];
        funParams = [];
        anonymousParams = [];

        scopeASTs = CfgExt.findScopes(CfgExt.parseAST(code));
        scopeASTs.length.should.eql(3);

        programScope = Scope.PROGRAM_SCOPE;
        funScope = new Scope('fun');

        scopeASTs.forEach(function (ast) {
            if (ast.type === 'FunctionDeclaration') {/// if it's a function
                ast.params.forEach(function (paramNode) {
                    funParams.push(new Var(paramNode.name, paramNode.range, funScope));
                });
                scopeCFGs.push(CfgExt.getCFG(ast.body));
            } else if (ast.type === 'FunctionExpression') {
                ast.params.forEach(function (paramNode) {
                    anonymousParams.push(new Var(paramNode.name, paramNode.range, anonymousFunScope));
                });
                scopeCFGs.push(CfgExt.getCFG(ast.body));
            } else {
                scopeCFGs.push(CfgExt.getCFG(ast));
            }
        });
        scopeCFGs.length.should.eql(3);
        scopeCFGs[0][2].length.should.eql(4);

        anonymousFunScope = new Scope(0);
        programCFGWrapper = new CFGWrapper(scopeCFGs[0], programScope, null);
        funCFGWrapper = new CFGWrapper(scopeCFGs[1], funScope, programCFGWrapper);
        anonymousFunCFGWrapper = new CFGWrapper(scopeCFGs[2], anonymousFunScope, programCFGWrapper);
    });

    describe('constructor', function () {
        it('should construct simply well', function () {
            programCFGWrapper.getCFG()[2].length.should.eql(4);
            programCFGWrapper.getRange().toString().should.eql('[0,78]');
            programCFGWrapper.getScope().toString().should.eql('Program');
            should.not.exist(programCFGWrapper.getParent());
        });

        it('should connect to parent scope well', function () {
            funCFGWrapper.getCFG()[2].length.should.eql(3);
            funCFGWrapper.getRange().toString().should.eql('[36,54]');
            funCFGWrapper.getScope().toString().should.eql('Function["fun"]');
            funCFGWrapper.getParent().getRange().toString().should.eql('[0,78]');
            funCFGWrapper.getParent().getScope().toString().should.eql('Program');
        });
    });

    describe('methods', function () {
        describe('addChild', function () {
            it('should add child well', function () {
                programCFGWrapper.addChild(funCFGWrapper);
                programCFGWrapper.getChildren().size.should.eql(1);
                should(programCFGWrapper.getChildren().has(funCFGWrapper.getRange().toString())).eql(true);

                programCFGWrapper.addChild(anonymousFunCFGWrapper);
                programCFGWrapper.getChildren().size.should.eql(2);
                should(
                    programCFGWrapper
                        .getChildren()
                        .has(anonymousFunCFGWrapper.getRange().toString())
                ).eql(true);
                should.exist(programCFGWrapper.getScopeVars().get('fun'));

                var rdsOfEntry = programCFGWrapper
                        .getReachIns()
                        .get(programCFGWrapper.getCFG()[0]),
                    reachOutsOfEntry = programCFGWrapper
                        .getReachOuts();
                should.exist(rdsOfEntry);
                /// not find RDs yet
                reachOutsOfEntry.size.should.eql(0);
                /// Found child's Def reaches in the entry
                var foundChildDefReachInEntry = false;
                programCFGWrapper._testonly_.reachIns
                    .get(programCFGWrapper._testonly_.cfg[0])
                    .values()
                    .forEach(function (rd) {
                        if (rd.variable === programCFGWrapper._testonly_.vars.get('fun') &&
                            rd.definition === funCFGWrapper._testonly_.def) {
                            foundChildDefReachInEntry = true;
                        }
                    });
                foundChildDefReachInEntry.should.eql(true);
            });
        });

        describe('setVars', function () {
            it('should find Vars declared in program scope well', function () {
                var aInProgram,
                    bInProgram,
                    cInFun,
                    dInProgram;
                programCFGWrapper.setVars();
                programCFGWrapper.getScopeVars().size.should.eql(3);
                /// before adding any child
                aInProgram = programCFGWrapper.getScopeVars().get('a');
                bInProgram = programCFGWrapper.getScopeVars().get('b');
                dInProgram = programCFGWrapper.getScopeVars().get('d');
                should.exist(aInProgram);
                should.exist(bInProgram);
                should.exist(dInProgram);
                aInProgram.getScope().toString().should.eql('Program');
                bInProgram.getScope().toString().should.eql('Program');
                dInProgram.getScope().toString().should.eql('Program');

                funCFGWrapper.setVars();
                /// not including params
                funCFGWrapper.getScopeVars().size.should.eql(1);
                cInFun = funCFGWrapper.getScopeVars().get('c');
                should.exist(cInFun);
                cInFun.getScope().toString().should.eql('Function["fun"]');
            });

            it('should set initial global variables well', function () {
                var variables;
                programCFGWrapper.setVars();
                variables = programCFGWrapper.getScopeVars();
                variables.size.should.eql(3);
                should(variables.has('a')).eql(true);
                should(variables.has('b')).eql(true);
                should(variables.has('d')).eql(true);

                var globalNode = new FlowNode(FlowNode.GLOBAL_NODE_TYPE);
                globalNode.cfgId = 0;

                programCFGWrapper.setVars([
                    vardefFactory.createGlobalVarDef(globalNode, 'ga', Def.OBJECT_TYPE)
                ]);
                variables = programCFGWrapper.getScopeVars();
                variables.size.should.eql(4);
                should(variables.has('a')).eql(true);
                should(variables.has('b')).eql(true);
                should(variables.has('d')).eql(true);
                should(variables.has('ga')).eql(true);
            });
        });

        describe('setParams', function () {
            it('should set params well', function () {
                var aInFun,
                    bInFun;

                funParams.length.should.eql(2);
                funCFGWrapper.setParams(funParams);

                funCFGWrapper.getScopeVars().size.should.eql(2);
                aInFun = funCFGWrapper.getScopeVars().get('a');
                bInFun = funCFGWrapper.getScopeVars().get('b');

                should.exist(aInFun);
                should.exist(bInFun);

                aInFun.getScope().toString().should.eql('Function["fun"]');
                bInFun.getScope().toString().should.eql('Function["fun"]');
            });
        });

        describe('initRDs', function () {
            it('should find correct intra-procedural definitions', function () {
                programCFGWrapper._testonly_.children.set(funCFGWrapper._testonly_.range, funCFGWrapper);
                programCFGWrapper._testonly_.children.set(anonymousFunCFGWrapper._testonly_.range, anonymousFunCFGWrapper);
                /// Set vars in program scope
                programCFGWrapper._testonly_.vars.set(
                    'fun',
                    varFactory.create('fun', [36,54], programCFGWrapper._testonly_.scope)
                );
                programCFGWrapper._testonly_.vars.set(
                    'a',
                    varFactory.create('a', [4,5], programCFGWrapper._testonly_.scope)
                );
                programCFGWrapper._testonly_.vars.set(
                    'b',
                    varFactory.create('b', [11,12], programCFGWrapper._testonly_.scope)
                );
                /// Set reach in definitions at entry point
                programCFGWrapper._testonly_.reachIns.set(
                    programCFGWrapper._testonly_.cfg[0],
                    new Set([
                        vardefFactory.create(
                            programCFGWrapper._testonly_.vars.get('fun'),
                            funCFGWrapper._testonly_.def
                        )
                    ])
                );
                /// Set vars in fun scope
                funCFGWrapper._testonly_.vars.set(
                    'c',
                    varFactory.create('c', [42,43], funCFGWrapper._testonly_.scope)
                );
                programCFGWrapper.initRDs();

                var rds = programCFGWrapper._testonly_.reachIns,
                    reachOuts = programCFGWrapper._testonly_.reachOuts;
                /// size equals to CFG nodes
                rds.size.should.eql(4);
                reachOuts.size.should.eql(4);
                rds.get(programCFGWrapper._testonly_.cfg[0]).values().length.should.eql(1);
                reachOuts.get(programCFGWrapper._testonly_.cfg[0]).values().length.should.eql(1);
                /// VariableDeclaration node
                /// In: {fun}, Out: {fun, a, b}
                rds.get(programCFGWrapper._testonly_.cfg[2][1]).values().length.should.eql(1);
                programCFGWrapper._testonly_.cfg[2][1].generate.size.should.eql(2);
                reachOuts.get(programCFGWrapper._testonly_.cfg[2][1]).values().length.should.eql(3);

                /// FunctionExpression node
                /// In: {fun, a, b}, Out: {fun, a, b, d}
                rds.get(programCFGWrapper._testonly_.cfg[2][2]).values().length.should.eql(3);
                reachOuts.get(programCFGWrapper._testonly_.cfg[2][2]).values().length.should.eql(4);
                /// exit node
                rds.get(programCFGWrapper._testonly_.cfg[2][3]).values().length.should.eql(4);
                reachOuts.get(programCFGWrapper._testonly_.cfg[2][3]).values().length.should.eql(0);

                /// RDs of entry node
                rds.get(programCFGWrapper._testonly_.cfg[0]).values()[0]
                    .variable.toString()
                    .should.eql(programCFGWrapper._testonly_.vars.get('fun').toString());
                rds.get(programCFGWrapper._testonly_.cfg[0]).values()[0]
                    .definition.should.eql(funCFGWrapper._testonly_.def);
                /// ReachOuts of entry node
                reachOuts.get(programCFGWrapper._testonly_.cfg[0]).values()[0]
                    .variable.toString()
                    .should.eql(programCFGWrapper._testonly_.vars.get('fun').toString());
                reachOuts.get(programCFGWrapper._testonly_.cfg[0]).values()[0]
                    .definition.should.eql(funCFGWrapper._testonly_.def);

                /// ReachIns of 2nd declaration node
                rds.get(programCFGWrapper._testonly_.cfg[2][2]).values()[0]
                    .variable.toString()
                    .should.eql(programCFGWrapper._testonly_.vars.get('fun').toString());
                rds.get(programCFGWrapper._testonly_.cfg[2][2]).values()[1]
                    .variable.toString()
                    .should.eql(programCFGWrapper._testonly_.vars.get('a').toString());
                rds.get(programCFGWrapper._testonly_.cfg[2][2]).values()[2]
                    .variable.toString()
                    .should.eql(programCFGWrapper._testonly_.vars.get('b').toString());
            });

            it('should support initial gloval Vars', function () {
                programCFGWrapper.setVars([
                    vardefFactory.createGlobalVarDef('ga', Def.OBJECT_TYPE),
                    vardefFactory.createGlobalVarDef('gb', Def.LITERAL_TYPE)
                ]);
                programCFGWrapper.initRDs();

                var rds = programCFGWrapper.getReachIns();
                rds.get(programCFGWrapper.getCFG()[0]).values().length.should.eql(2);
                rds.get(programCFGWrapper.getCFG()[0]).values()[0]
                    .variable.toString()
                    .should.eql(programCFGWrapper.getVarByName('ga').toString());
            });

            it('should add definitions to parameters', function () {
                /// function parameters
                funCFGWrapper.setParams(funParams);
                funCFGWrapper.setVars();
                funCFGWrapper.initRDs();
                var reachInsOfFun = funCFGWrapper.getReachIns();
                reachInsOfFun.get(funCFGWrapper.getCFG()[0]).size.should.eql(2);
            });
        });

        describe('updateRDs', function () {
            it('should support update at entry node', function () {
                programCFGWrapper.addChild(funCFGWrapper);
                programCFGWrapper.addChild(anonymousFunCFGWrapper);
                programCFGWrapper.setVars();
                funCFGWrapper.setVars();

                programCFGWrapper.initRDs();
                funCFGWrapper.initRDs();

                var extraRDs = new Set();
                extraRDs.add(vardefFactory.createGlobalVarDef('extra', Def.LITERAL_TYPE));
                programCFGWrapper.updateRDs(programCFGWrapper.getCFG()[0], extraRDs);

                /// ReachIn(entry)
                var reachInEntry = programCFGWrapper.getReachIns().get(programCFGWrapper.getCFG()[0]);
                reachInEntry.size.should.eql(2);
                var reachInEntryTexts = [];
                reachInEntry.forEach(function (rd) {
                    reachInEntryTexts.push(rd.toString());
                });
                reachInEntryTexts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)',
                    '(extra@[0,1]_Global,Def@n0@[0,1]_Global)'
                ]);

                /// ReachOut(entry)
                var reachOutEntry = programCFGWrapper.getReachOuts().get(programCFGWrapper.getCFG()[0]);
                reachOutEntry.size.should.eql(2);
                var reachOutEntryTexts = [];
                reachOutEntry.forEach(function (rd) {
                    reachOutEntryTexts.push(rd.toString());
                });
                reachOutEntryTexts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)',
                    '(extra@[0,1]_Global,Def@n0@[0,1]_Global)'
                ]);

                /// ReachIn(node 1)
                var reachInNode1 = programCFGWrapper.getReachIns().get(programCFGWrapper.getCFG()[2][1]);
                reachInNode1.size.should.eql(2);
                var reachInNode1Texts = [];
                reachInNode1.forEach(function (rd) {
                    reachInNode1Texts.push(rd.toString());
                });
                reachInNode1Texts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)',
                    '(extra@[0,1]_Global,Def@n0@[0,1]_Global)'
                ]);

                /// ReachOut(node 1)
                var reachOutNode1 = programCFGWrapper.getReachOuts().get(programCFGWrapper.getCFG()[2][1]);
                reachOutNode1.size.should.eql(4);
                var reachOutNode1Texts = [];
                reachOutNode1.forEach(function (rd) {
                    reachOutNode1Texts.push(rd.toString());
                });
                reachOutNode1Texts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)',
                    '(extra@[0,1]_Global,Def@n0@[0,1]_Global)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                    '(b@[11,12]_Program,Def@n1@[15,16]_Program)'
                ]);

                /// ReachIn(exit)
                var reachInExit = programCFGWrapper.getReachIns().get(programCFGWrapper.getCFG()[1]);
                reachInExit.size.should.eql(5);
                var reachInExitTexts = [];
                reachInExit.forEach(function (rd) {
                    reachInExitTexts.push(rd.toString());
                });
                reachInExitTexts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)',
                    '(extra@[0,1]_Global,Def@n0@[0,1]_Global)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                    '(b@[11,12]_Program,Def@n1@[15,16]_Program)',
                    '(d@[59,60]_Program,Def@n2@[63,77]_Program)'
                ]);

                /// ReachOut(exit)
                var reachOutExit = programCFGWrapper.getReachOuts().get(programCFGWrapper.getCFG()[1]);
                reachOutExit.size.should.eql(1);
                reachOutExit.values()[0].toString().should.eql('(extra@[0,1]_Global,Def@n0@[0,1]_Global)');
            });

            it('should support update at the other node expect the exit node and keep the originals', function () {
                programCFGWrapper.addChild(funCFGWrapper);
                programCFGWrapper.addChild(anonymousFunCFGWrapper);
                programCFGWrapper.setVars();
                funCFGWrapper.setVars();

                programCFGWrapper.initRDs();
                funCFGWrapper.initRDs();

                var extraRDs = new Set();
                extraRDs.add(vardefFactory.createGlobalVarDef('extra', Def.LITERAL_TYPE));

                programCFGWrapper.updateRDs(programCFGWrapper.getCFG()[2][1], extraRDs);

                /// ReachIn(entry)
                var reachInEntry = programCFGWrapper.getReachIns().get(programCFGWrapper.getCFG()[0]);
                reachInEntry.size.should.eql(1);
                var reachInEntryTexts = [];
                reachInEntry.forEach(function (rd) {
                    reachInEntryTexts.push(rd.toString());
                });
                reachInEntryTexts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)'
                ]);

                /// ReachOut(entry)
                var reachOutEntry = programCFGWrapper.getReachOuts().get(programCFGWrapper.getCFG()[0]);
                reachOutEntry.size.should.eql(1);
                var reachOutEntryTexts = [];
                reachOutEntry.forEach(function (rd) {
                    reachOutEntryTexts.push(rd.toString());
                });
                reachOutEntryTexts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)'
                ]);

                /// ReachIn(node 1)
                var reachInNode1 = programCFGWrapper.getReachIns().get(programCFGWrapper.getCFG()[2][1]);
                reachInNode1.size.should.eql(1);
                var reachInNode1Texts = [];
                reachInNode1.forEach(function (rd) {
                    reachInNode1Texts.push(rd.toString());
                });
                reachInNode1Texts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)'
                ]);

                /// ReachOut(node 1)
                var reachOutNode1 = programCFGWrapper.getReachOuts().get(programCFGWrapper.getCFG()[2][1]);
                reachOutNode1.size.should.eql(4);
                var reachOutNode1Texts = [];
                reachOutNode1.forEach(function (rd) {
                    reachOutNode1Texts.push(rd.toString());
                });
                reachOutNode1Texts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                    '(b@[11,12]_Program,Def@n1@[15,16]_Program)',
                    '(extra@[0,1]_Global,Def@n0@[0,1]_Global)'
                ]);

                /// ReachIn(exit)
                var reachInExit = programCFGWrapper.getReachIns().get(programCFGWrapper.getCFG()[1]);
                reachInExit.size.should.eql(5);
                var reachInExitTexts = [];
                reachInExit.forEach(function (rd) {
                    reachInExitTexts.push(rd.toString());
                });
                reachInExitTexts.should.containDeep([
                    '(fun@[36,54]_Program,Def@n0@[36,54]_Program)',
                    '(extra@[0,1]_Global,Def@n0@[0,1]_Global)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                    '(b@[11,12]_Program,Def@n1@[15,16]_Program)',
                    '(d@[59,60]_Program,Def@n2@[63,77]_Program)'
                ]);

                /// ReachOut(exit)
                var reachOutExit = programCFGWrapper.getReachOuts().get(programCFGWrapper.getCFG()[1]);
                reachOutExit.size.should.eql(1);
                reachOutExit.values()[0].toString().should.eql('(extra@[0,1]_Global,Def@n0@[0,1]_Global)');
            });
        });

        describe('validate', function () {
            it('should not throw with valid value', function () {
                (function () {
                    CFGWrapper.validate(scopeCFGs[0], Scope.PROGRAM_SCOPE, null);
                }).should.not.throw();
            });

            it('should throw an error when CFG invalid', function () {
                (function () {
                    CFGWrapper.validate({}, Scope.PROGRAM_SCOPE, null);
                    CFGWrapper.validate([1,2,3], Scope.PROGRAM_SCOPE, null);
                }).should.throw('Invalid ScopeWrapper value (CFG)');

                (function () {
                    CFGWrapper.validate({}, Scope.PROGRAM_SCOPE, null, 'Error occurred');
                    CFGWrapper.validate([1,2,3], Scope.PROGRAM_SCOPE, null, 'Error occurred');
                }).should.throw('Error occurred');
            });

            it('should throw an error when parent invalid', function () {
                (function () {
                    CFGWrapper.validate(scopeCFGs[0], Scope.PROGRAM_SCOPE, {});
                }).should.throw('Invalid ScopeWrapper value (parent scope)');
            });

            it('should throw an error when scope invalid', function () {
                (function () {
                    CFGWrapper.validate(scopeCFGs[0], null, programCFGWrapper);
                }).should.throw('Invalid ScopeWrapper value (scope)');
            });
        });

        describe('validateType', function () {
            it('should not throw with valid value', function () {
                (function () {
                    CFGWrapper.validateType(programCFGWrapper);
                    CFGWrapper.validateType(funCFGWrapper);
                    CFGWrapper.validateType(anonymousFunCFGWrapper);
                }).should.not.throw();
            });

            it('should throw an error when the parameter is not a ScopeWrapper', function () {
                (function () {
                    CFGWrapper.validateType({});
                }).should.throw('Not a ScopeWrapper');
                (function () {
                    CFGWrapper.validateType();
                }).should.throw('Not a ScopeWrapper');
                (function () {
                    CFGWrapper.validateType({}, 'Error occurred');
                }).should.throw('Error occurred');
            });
        });

        describe('hasVarWithName', function () {
            it('should check the name of a variable is existed or not', function () {
                should(programCFGWrapper.hasVarWithName('a')).equal(false);
                programCFGWrapper.setVars();
                should(programCFGWrapper.hasVarWithName('a')).equal(true);
                should(programCFGWrapper.hasVarWithName({})).equal(false);
            });
        });

        describe('getFunctionParams', function () {
            it('should get parameters correctly', function () {
                funCFGWrapper.setParams([new Var('va', [0,1], Scope.PROGRAM_SCOPE)]);
                funCFGWrapper.getFunctionParams().size.should.equal(1);
                should.exist(funCFGWrapper.getFunctionParams().get('va'));
                anonymousFunCFGWrapper.setParams(new Set([new Var('va', [0,2], Scope.PROGRAM_SCOPE), new Var('vb', [2,4], Scope.PROGRAM_SCOPE)]));
                anonymousFunCFGWrapper.getFunctionParams().size.should.equal(2);
                should.exist(anonymousFunCFGWrapper.getFunctionParams().get('va'));
                should.exist(anonymousFunCFGWrapper.getFunctionParams().get('vb'));
            });
        });

        describe('nodeReachInsToString', function () {
            it('should convert to string correctly', function () {
                programCFGWrapper.addChild(funCFGWrapper);
                programCFGWrapper.setVars();
                programCFGWrapper.initRDs();

                programCFGWrapper.nodeReachInsToString(
                    programCFGWrapper.getCFG()[0]
                ).should.eql(
                    'ReachIn(entry) = [\n' +
                    '{' + programCFGWrapper.getVarByName('fun').toString() + ': [' +
                    funCFGWrapper.getDef().toString() + ']}\n' +
                    ']'
                );

                programCFGWrapper.nodeReachInsToString(
                    programCFGWrapper.getCFG()[2][2]
                ).should.eql(
                    'ReachIn(2) = [\n' +
                    '{' + programCFGWrapper.getVarByName('fun').toString() + ': [' + funCFGWrapper.getDef().toString() + ']},\n' +
                    '{' + programCFGWrapper.getVarByName('a').toString() + ': [Def@n1@[8,9]_Program]},\n' +
                    '{' + programCFGWrapper.getVarByName('b').toString() + ': [Def@n1@[15,16]_Program]}\n' +
                    ']'
                );
            });
        });

        describe('reachInsToString', function () {
            it('should convert to string correctly', function () {
                /// TODO: test method reachInsToString
            });
        });

        describe('cfgToString', function () {
            it('should convert to string correctly', function () {
                /// TODO: test method cfgToString
            });
        });
    });
});