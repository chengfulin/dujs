/**
 * Created by chengfulin on 2015/4/20.
 */
var CFGWrapper = require('../../lib/dujs').CFGWrapper,
    Var = require('../../lib/dujs').Var,
    Scope = require('../../lib/dujs').Scope,
    Range = require('../../lib/dujs').Range,
    CfgExt = require('../../lib/dujs').CFGExt,
    should = require('should');

describe('CFGWrapper', function () {
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
                should(programCFGWrapper.getChildren().has(funCFGWrapper.getDef())).eql(true);

                programCFGWrapper.addChild(
                    anonymousFunCFGWrapper,
                    new Var('d', [59,78], programScope, null)
                );
                programCFGWrapper.getChildren().size.should.eql(2);
                should(
                    programCFGWrapper
                        .getChildren()
                        .has(anonymousFunCFGWrapper.getDef())
                ).eql(true);
                should.exist(programCFGWrapper.getScopeVars().get('fun'));
                should.exist(programCFGWrapper.getScopeVars().get('d'));

                var rdsOfEntry = programCFGWrapper
                    .getReachDefinitions()
                    .get(programCFGWrapper.getCFG()[0]);
                should.exist(rdsOfEntry);
                should(rdsOfEntry.has(programCFGWrapper.getScopeVars().get('fun'))).eql(true);
            });
        });

        describe('setVars', function () {
            it('should find Vars declared in program scope well', function () {
                var aInProgram,
                    bInProgram,
                    cInFun;
                programCFGWrapper.setVars();
                programCFGWrapper.getScopeVars().size.should.eql(2);
                /// before adding any child
                aInProgram = programCFGWrapper.getScopeVars().get('a');
                bInProgram = programCFGWrapper.getScopeVars().get('b');
                should.exist(aInProgram);
                should.exist(bInProgram);
                aInProgram.getScope().toString().should.eql('Program');
                bInProgram.getScope().toString().should.eql('Program');

                funCFGWrapper.setVars();
                /// not including params
                funCFGWrapper.getScopeVars().size.should.eql(1);
                cInFun = funCFGWrapper.getScopeVars().get('c');
                should.exist(cInFun);
                cInFun.getScope().toString().should.eql('Function["fun"]');
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
    });
});