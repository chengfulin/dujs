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
        programCFGWrapper,
        funCFGWrapper;

    beforeEach(function () {
        code = 'var a = 0, b = 1;\n' +
        'function fun(a,b) {\n' +
            'var c = a + b;\n' +
        '}\n' +
        'var d = function () {};';
        scopeASTs = [];
        scopeCFGs = [];
        scopeASTs = CfgExt.findScopes(CfgExt.parseAST(code));
        scopeASTs.length.should.eql(3);

        scopeASTs.forEach(function (ast) {
            scopeCFGs.push(CfgExt.getCFG(ast));
        });
        scopeCFGs.length.should.eql(3);

        programScope = Scope.PROGRAM_SCOPE;
        funScope = new Scope('fun');
        programCFGWrapper = new CFGWrapper(scopeCFGs[0], programScope, null);
        funCFGWrapper = new CFGWrapper(scopeCFGs[1], funScope, programCFGWrapper);
    });

    describe('constructor', function () {
        it('should construct simply well', function () {
            programCFGWrapper.getCFG().length.should.eql(3);
            programCFGWrapper.getRange().toString().should.eql('[0,78]');
            programCFGWrapper.getScope().toString().should.eql('Program');
            should.not.exist(programCFGWrapper.getParent());
        });

        it('should connect to parent scope well', function () {
            funCFGWrapper.getRange().toString().should.eql('[18,54]');
            funCFGWrapper.getScope().toString().should.eql('Function["fun"]');
            funCFGWrapper.getParent().getRange().toString().should.eql('[0,78]');
            funCFGWrapper.getParent().getScope().toString().should.eql('Program');
        });
    });

    describe('methods', function () {
        describe('setVars', function () {
            it('should find Vars declared in this scope well', function () {
                programCFGWrapper.setVars();
                programCFGWrapper.getScopeVars().size.should.eql(3);
                should.exist(programCFGWrapper.getScopeVars().get('a'));
                should.exist(programCFGWrapper.getScopeVars().get('b'));
                should.exist(programCFGWrapper.getScopeVars().get('d'));
            });
        });
    });
});