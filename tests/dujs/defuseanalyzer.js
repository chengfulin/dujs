/**
 * Created by ChengFuLin on 2015/6/22.
 */
var analyzer = require('../../lib/dujs').DefUseAnalyzer,
    factoryScopeWrapper = require('../../lib/dujs').factoryScopeWrapper,
    cfgext = require('../../lib/dujs').CFGExt,
    factoryFlowNode = require('../../lib/esgraph').factoryFlowNode,
    should = require('should');

describe('DefUseAnalyzer', function () {
    "use strict";
    describe('Methods', function () {
        beforeEach(function () {
            factoryFlowNode.resetCounter();
        });

        describe('findKILLSet', function () {
            describe('as for Single Variable Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        'a = 1;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find no redefined variables at entry node', function () {
                    var killAtEntry = analyzer.findKILLSet(cfg[0]);
                    killAtEntry.size.should.eql(0);
                });

                it('should kill local variables at exit node', function () {
                    var killAtExit = analyzer.findKILLSet(cfg[1]);
                    killAtExit.size.should.eql(1);
                    scope._testonly_._vars.has('a').should.eql(true);
                    killAtExit.has(scope._testonly_._vars.get('a')).should.eql(true);
                });

                it('should kill variable at variable assignment', function () {
                    var kill = analyzer.findKILLSet(cfg[2][2]);
                    kill.size.should.eql(1);
                    kill.has(scope._testonly_._vars.get('a')).should.eql(true);
                });

                it('should set the kill property as the CFG node has found kill set', function () {
                    analyzer.findKILLSet(cfg[2][2]);
                    cfg[2][2]._testonly_._kill.size.should.eql(1);
                    cfg[2][2]._testonly_._kill.has(scope._testonly_._vars.get('a')).should.eql(true);

                    analyzer.findKILLSet(cfg[1]);
                    cfg[1]._testonly_._kill.size.should.eql(1);
                    cfg[1]._testonly_._kill.has(scope._testonly_._vars.get('a')).should.eql(true);
                });

                it('should not set the kill property as the CFG node has not found kill set', function () {
                    analyzer.findKILLSet(cfg[0]);
                    should.not.exist(cfg[0]._testonly_._kill);
                });
            });

            describe('as for Multiple Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a = b = 2;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill all redefined variables', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(2);
                    killSet.has(scope._testonly_._vars.get('a')).should.eql(true);
                    killSet.has(scope._testonly_._vars.get('b')).should.eql(true);
                });
            });

            describe('as for Update Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        '++a;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill the updated variable', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(1);
                    killSet.has(scope._testonly_._vars.get('a')).should.eql(true);
                });
            });

            describe('as for Assignment of Update Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a = b++;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill the assigned variable and the updated variable', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(2);
                    killSet.has(scope._testonly_._vars.get('a')).should.eql(true);
                    killSet.has(scope._testonly_._vars.get('b')).should.eql(true);
                });
            });

            describe('as for Assignment of Member Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = {};\n' +
                        'a.x = 1;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should kill the object variable', function () {
                    var killSet = analyzer.findKILLSet(cfg[2][2]);
                    killSet.size.should.eql(1);
                    killSet.has(scope._testonly_._vars.get('a'));
                });
            });
        });

        describe('findGENSet', function () {
            describe('as for Single Variable Declaration', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate VarDef at the node where the variable declared', function () {
                    var genSet = analyzer.findGENSet(cfg[2][1]);
                    genSet.size.should.eql(1);
                    genSet.values()[0]._testonly_._var.should.eql(scope._testonly_._vars.get('a'));
                    genSet.values()[0]._testonly_._def._testonly_._type.should.eql('literal');
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._start.should.eql(8);
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._end.should.eql(9);
                });
            });

            describe('as for Variable initialized with Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        'var b = a = 1;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate for the declared and redefined variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][2]);
                    genSet.size.should.eql(2);
                    /// it would generate from left to right
                    genSet.values()[0]._testonly_._var.should.eql(scope._testonly_._vars.get('b'));
                    genSet.values()[1]._testonly_._var.should.eql(scope._testonly_._vars.get('a'));
                    genSet.values()[0]._testonly_._def._testonly_._type.should.eql('literal');
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._start.should.eql(19);
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._end.should.eql(24);
                    genSet.values()[1]._testonly_._def._testonly_._range._testonly_._start.should.eql(23);
                    genSet.values()[1]._testonly_._def._testonly_._range._testonly_._end.should.eql(24);
                });
            });

            describe('as for Variable initialized with Function Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = function () {};'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate for the declared variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][1]);
                    genSet.size.should.eql(1);
                    genSet.values()[0]._testonly_._def._testonly_._type.should.eql('function');
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._start.should.eql(8);
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._end.should.eql(22);
                });
            });

            describe('as for Single Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        'a = 1;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate for the redefined variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][2]);
                    genSet.size.should.eql(1);
                    genSet.values()[0]._testonly_._var.should.eql(scope._testonly_._vars.get('a'));
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._start.should.eql(15);
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._end.should.eql(16);
                });
            });

            describe('as for Multiple Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a = b = 2;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate for the redefined variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][2]);
                    genSet.size.should.eql(2);
                    genSet.values()[0]._testonly_._var.should.eql(scope._testonly_._vars.get('a'));
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._start.should.eql(22);
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._end.should.eql(27);
                });
            });

            describe('as for Assignment of Function Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a;\n' +
                        'a = function () {};'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate for the declared variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][2]);
                    genSet.size.should.eql(1);
                    genSet.values()[0]._testonly_._def._testonly_._type.should.eql('function');
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._start.should.eql(11);
                    genSet.values()[0]._testonly_._def._testonly_._range._testonly_._end.should.eql(25);
                });
            });

            describe('as for Update Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        '++a;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate the definition of updated variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][2]);
                    genSet.size.should.eql(1);
                    genSet.values()[0]._testonly_._var.should.eql(scope._testonly_._vars.get('a'));
                });
            });

            describe('as for Assignment of Update Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a = b++;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate the definition of assigned variable and the updated variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][2]);
                    genSet.size.should.eql(2);
                    genSet.values()[0]._testonly_._var.should.eql(scope._testonly_._vars.get('a'));
                    genSet.values()[1]._testonly_._var.should.eql(scope._testonly_._vars.get('b'));
                });
            });

            describe('as for Assignment of Member Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    factoryFlowNode.resetCounter();
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = {};\n' +
                        'a.x = 1;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should generate the definition of object variable', function () {
                    var genSet = analyzer.findGENSet(cfg[2][2]);
                    genSet.size.should.eql(1);
                    genSet.values()[0]._testonly_._var.should.eql(scope._testonly_._vars.get('a'));
                });
            });
        });

        describe('findUSESet', function () {
            describe('as for single Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a = b;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var usedVar = analyzer.findUSESet(cfg[2][2]);
                    usedVar.cuse.size.should.eql(1);
                    usedVar.puse.size.should.eql(0);
                    usedVar.cuse.values()[0].should.eql(scope._testonly_._vars.get('b'));
                });
            });

            describe('as for multiple Assignment', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1, c = 2;\n' +
                        'a = b = c;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var usedVar = analyzer.findUSESet(cfg[2][2]);
                    usedVar.cuse.size.should.eql(2);
                    usedVar.puse.size.should.eql(0);
                    usedVar.cuse.values()[0].should.eql(scope._testonly_._vars.get('b'));
                    usedVar.cuse.values()[1].should.eql(scope._testonly_._vars.get('c'));
                });
            });

            describe('as for Self Assignment with literal value', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        'a += 1;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var usedVar = analyzer.findUSESet(cfg[2][2]);
                    usedVar.cuse.size.should.eql(1);
                    usedVar.puse.size.should.eql(0);
                    usedVar.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                });
            });

            describe('as for Self Assignment with variable', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        'a += b;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var usedVar = analyzer.findUSESet(cfg[2][2]);
                    usedVar.cuse.size.should.eql(2);
                    usedVar.puse.size.should.eql(0);
                    usedVar.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                    usedVar.cuse.values()[1].should.eql(scope._testonly_._vars.get('b'));
                });
            });

            describe('as for BinaryExpression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1, c;\n' +
                        'c = a + b;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var usedVar = analyzer.findUSESet(cfg[2][2]);
                    usedVar.cuse.size.should.eql(2);
                    usedVar.puse.size.should.eql(0);
                    usedVar.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                    usedVar.cuse.values()[1].should.eql(scope._testonly_._vars.get('b'));
                });
            });

            describe('as for CallExpression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var call = function () {}, a;\n' +
                        'a = call();'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var callee = analyzer.findUSESet(cfg[2][2]);

                    callee.cuse.size.should.eql(1);
                    callee.puse.size.should.eql(0);
                    callee.cuse.values()[0].should.eql(scope._testonly_._vars.get('call'));
                });
            });

            describe('as for CallExpression with argument', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var call = function (x) {}, a, b = 1;\n' +
                        'a = call(b);'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var used = analyzer.findUSESet(cfg[2][2]);

                    used.cuse.size.should.eql(2);
                    used.puse.size.should.eql(0);
                    used.cuse.values()[0].should.eql(scope._testonly_._vars.get('call'));
                    used.cuse.values()[1].should.eql(scope._testonly_._vars.get('b'));
                });
            });

            describe('as for VariableDeclaration initialized by variable', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0;\n' +
                        'var b = a;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var initialize = analyzer.findUSESet(cfg[2][2]);
                    initialize.cuse.size.should.eql(1);
                    initialize.puse.size.should.eql(0);
                    initialize.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                });
            });

            describe('as for UpdateExpression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b = 1;\n' +
                        '++a;\n' +
                        'b--;\n'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var prefixUpdate = analyzer.findUSESet(cfg[2][2]),
                        postfixUpdate = analyzer.findUSESet(cfg[2][3]);

                    prefixUpdate.cuse.size.should.eql(1);
                    prefixUpdate.puse.size.should.eql(0);
                    prefixUpdate.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));

                    postfixUpdate.cuse.size.should.eql(1);
                    postfixUpdate.puse.size.should.eql(0);
                    postfixUpdate.cuse.values()[0].should.eql(scope._testonly_._vars.get('b'));
                });
            });

            describe('as for New Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a, c = function () {};\n' +
                        'a = new c();'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find used variable', function () {
                    var used = analyzer.findUSESet(cfg[2][2]);
                    used.cuse.size.should.eql(1);
                    used.puse.size.should.eql(0);
                    used.cuse.values()[0].should.eql(scope._testonly_._vars.get('c'));
                });
            });

            describe('as for Unary Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 0, b;\n' +
                        'b = ~a;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var used = analyzer.findUSESet(cfg[2][2]);

                    used.cuse.size.should.eql(1);
                    used.puse.size.should.eql(0);
                    used.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                });
            });

            describe('as for if statement', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = false;\n' +
                        'if (!a) {}'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var used = analyzer.findUSESet(cfg[2][2]);

                    used.cuse.size.should.eql(0);
                    used.puse.size.should.eql(1);
                    used.puse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                });
            });

            describe('as for while statement', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 5;\n' +
                        'while (a > 0) {}'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var used = analyzer.findUSESet(cfg[2][2]);

                    used.cuse.size.should.eql(0);
                    used.puse.size.should.eql(1);
                    used.puse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                });
            });

            describe('as for for loop statement', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'for (var a = 5; a > 0; --a) {}'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var initialPart = analyzer.findUSESet(cfg[2][1]),
                        conditionalPart = analyzer.findUSESet(cfg[2][2]),
                        changePart = analyzer.findUSESet(cfg[2][3]);

                    initialPart.cuse.size.should.eql(0);
                    initialPart.puse.size.should.eql(0);

                    conditionalPart.cuse.size.should.eql(0);
                    conditionalPart.puse.size.should.eql(1);
                    conditionalPart.puse.values()[0].should.eql(scope._testonly_._vars.get('a'));

                    changePart.cuse.size.should.eql(1);
                    changePart.puse.size.should.eql(0);
                    changePart.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));
                });
            });

            describe('as for Switch Statement', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = 1, b = 0;\n' +
                        'switch (a) {\n' +
                        'case 1: b = a;\n' +
                        'break;\n' +
                        'default: break;}'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find used variables', function () {
                    var conditional = analyzer.findUSESet(cfg[2][2]),
                        firstCase = analyzer.findUSESet(cfg[2][3]),
                        defaultCase = analyzer.findUSESet(cfg[2][5]);

                    conditional.cuse.size.should.eql(0);
                    conditional.puse.size.should.eql(1);
                    conditional.puse.values()[0].should.eql(scope._testonly_._vars.get('a'));

                    firstCase.cuse.size.should.eql(1);
                    firstCase.puse.size.should.eql(0);
                    firstCase.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));

                    defaultCase.cuse.size.should.eql(0);
                    defaultCase.puse.size.should.eql(0);
                });
            });

            describe('as for Member Expression', function () {
                var cfg, scope;
                beforeEach(function () {
                    cfg = cfgext.getCFG(cfgext.parseAST(
                        'var a = {v: 0}, b;\n' +
                        'b = a.v;'
                    ));
                    scope = factoryScopeWrapper.createProgramScopeWrapper(cfg);
                    scope.setVars();
                });

                it('should find the used variable', function () {
                    var used = analyzer.findUSESet(cfg[2][2]);

                    used.cuse.size.should.eql(1);
                    used.puse.size.should.eql(0);
                    used.cuse.values()[0].should.eql(scope._testonly_._vars.get('a'));

                });
            });
        });
    });
});