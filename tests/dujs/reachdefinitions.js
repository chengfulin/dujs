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
            rds.inputs.get(functionScope.getCFG()[2][0]).size.should.eql(1);
            rds.inputs.get(functionScope.getCFG()[2][0]).values()[0]
                .toString()
                .should.eql('(Class@[0,1]_Global,Def@n0@[0,1]_Global)');
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
});
