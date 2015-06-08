/**
 * Created by chengfulin on 2015/4/29.
 */
var FunctionScopeTree = require('../../lib/dujs').FunctionScopeTree,
    CFGExt = require('../../lib/dujs').CFGExt,
    Range = require('../../lib/dujs').Range,
    rangeFactory = require('../../lib/dujs').factoryRange,
    Def = require('../../lib/dujs').Def,
    defFactory = require('../../lib/dujs').factoryDef,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('ScopeTree', function () {
    'use strict';
    beforeEach(function () {

        CFGExt.resetCounter();
    });

    describe('constructor', function () {
        it('should build the tree well', function () {
            var rootScope,
                childScope1,
                childScope2,
                descendentScope,
                code = 'function foo(x) {\n' +
                    'function inner() {}\n' +
                    '}\n' +
                    'var foo2 = function (a, b) {};',
                tree;
            tree = new FunctionScopeTree(CFGExt.parseAST(code));
            tree.getFunctionScopes().length.should.eql(4);

            rootScope = tree.getRoot();
            childScope1 = tree.getFunctionScopes()[1];
            childScope2 = tree.getFunctionScopes()[3];
            descendentScope = tree.getFunctionScopes()[2];

            /// Program
            ///     + Function["foo"]
            ///     |   + Function["inner"]
            ///     + AnonymousFunction[0]
            rootScope.getScope().toString().should.eql('Program');
            childScope1.getScope().toString().should.eql('Function["foo"]');
            childScope2.getScope().toString().should.eql('AnonymousFunction[0]');
            descendentScope.getScope().toString().should.eql('Function["inner"]');

            should.not.exist(rootScope.getParent());
            rootScope.getChildren().size.should.eql(2);
            should(rootScope.getChildren().has(childScope1.getRange().toString())).eql(true);
            should(rootScope.getChildren().has(childScope2.getRange().toString())).eql(true);

            should.exist(childScope1.getParent());
            childScope1.getParent().getScope().toString().should.eql('Program');
            childScope1.getChildren().size.should.eql(1);
            should(childScope1.getChildren().has(descendentScope.getRange().toString())).eql(true);
            childScope1.getFunctionParams().size.should.eql(1);
            should(childScope1.getFunctionParams().has('x')).eql(true);
            childScope1.getScopeVars().size.should.eql(2);
            should(childScope1.getScopeVars().has('inner')).eql(true);
            should(childScope1.getScopeVars().has('x')).eql(true);
            var childScope1EntryNode = childScope1.getCFG()[0],
                innerVar = childScope1.getScopeVars().get('inner'),
                xVar = childScope1.getScopeVars().get('x');
            should(childScope1.doesVarReachIn(childScope1EntryNode, innerVar)).eql(true);
            should(childScope1.doesVarReachIn(childScope1EntryNode, xVar)).eql(true);

            should.exist(childScope2.getParent());
            childScope2.getParent().getScope().toString().should.eql('Program');
            childScope2.getChildren().size.should.eql(0);
            childScope2.getFunctionParams().size.should.eql(2);
            should(childScope2.getFunctionParams().has('a')).eql(true);
            should(childScope2.getFunctionParams().has('b')).eql(true);
            var childScope2EntryNode = childScope2.getCFG()[0],
                aVar = childScope2.getScopeVars().get('a'),
                bVar = childScope2.getScopeVars().get('b');
            should(childScope2.doesVarReachIn(childScope2EntryNode, aVar)).eql(true);
            should(childScope2.doesVarReachIn(childScope2EntryNode, bVar)).eql(true);
            /// params don't get the def yet
            childScope2.getVarDefsReachIn(childScope2, aVar).values().length.should.eql(0);

            should.exist(descendentScope.getParent());
            descendentScope.getParent().getScope().toString().should.eql('Function["foo"]');
            descendentScope.getChildren().size.should.eql(0);
            descendentScope.getFunctionParams().size.should.eql(0);
        });
    });

    describe('methods', function () {
        describe('toString', function () {
            it('should represent by string correctly', function () {
                var code = 'function foo(x) {\n' +
                        'function inner() {}\n' +
                        '}\n' +
                        'var foo2 = function (a, b) {};',
                    tree = new FunctionScopeTree(CFGExt.parseAST(code)),
                    functionScopes = tree.getFunctionScopes();
                functionScopes.length.should.eql(4);
                tree.toString().should.eql(
                    '+-' + functionScopes[0].getScope() + '@' + functionScopes[0].getRange() + '\n' +
                    '  +-' + functionScopes[1].getScope() + '@' + functionScopes[1].getRange() + '\n' +
                    '    +-' + functionScopes[2].getScope() + '@' + functionScopes[2].getRange() + '\n' +
                    '  +-' + functionScopes[3].getScope() + '@' + functionScopes[3].getRange()
                );
            });
        });

        describe('validate', function () {
            it('should throw when a value is invalid', function () {
                (function () {
                    FunctionScopeTree.validate({});
                }).should.throw('Invalid start point for a ScopeTree');
            });

            it('should throw when the ast is not the valid entry points', function () {
                var cfg = CFGExt.getCFG(CFGExt.parseAST(
                    'var a = 0;'
                ));
                (function () {
                    FunctionScopeTree.validate(cfg[2][1].astNode);
                }).should.throw('Invalid start point for a ScopeTree');
            });

            it('should support custom error message', function () {
                (function () {
                    FunctionScopeTree.validate({}, 'Custom error');
                }).should.throw('Custom error');
            });
        });

        describe('getFunctionScopesBy', function () {
            var ast, tree;
            beforeEach(function () {
                ast = CFGExt.parseAST(
                    'function foo1() {' +
                    'expr;' +
                    '}' +
                    'function foo2() {' +
                    'expr;' +
                    '}'
                );
                tree = new FunctionScopeTree(ast);
            });

            describe('Range', function () {
                it('should get the function scope by the text of its range correctly', function () {
                    tree.getFunctionScopes().length.should.eql(3);

                    /// foo1Scope
                    var foo1Scope = tree.getFunctionScopes()[1];
                    foo1Scope.getScope().getValue().should.eql('foo1');
                    foo1Scope.getRange().toString().should.eql('[16,23]');
                    should.exist(tree.getFunctionScopeByRange('[16,23]'));
                    tree.getFunctionScopeByRange('[16,23]').should.eql(foo1Scope);

                    /// foo2Scope
                    var foo2Scope = tree.getFunctionScopes()[2];
                    foo2Scope.getScope().getValue().should.eql('foo2');
                    foo2Scope.getRange().toString().should.eql('[39,46]');
                    should.exist(tree.getFunctionScopeByRange('[39,46]'));
                    tree.getFunctionScopeByRange('[39,46]').should.eql(foo2Scope);
                });

                it('should get the function scope by the value of its range correctly', function () {
                    tree.getFunctionScopes().length.should.eql(3);

                    /// foo1Scope
                    var foo1Scope = tree.getFunctionScopes()[1];
                    foo1Scope.getScope().getValue().should.eql('foo1');
                    should.exist(tree.getFunctionScopeByRange(rangeFactory.create(16,23)));
                    tree.getFunctionScopeByRange(rangeFactory.create(16,23)).should.eql(foo1Scope);

                    /// foo2Scope
                    var foo2Scope = tree.getFunctionScopes()[2];
                    foo2Scope.getScope().getValue().should.eql('foo2');
                    should.exist(tree.getFunctionScopeByRange(rangeFactory.create(39,46)));
                    tree.getFunctionScopeByRange(rangeFactory.create(39,46)).should.eql(foo2Scope);
                });
            });

            describe('Def', function () {
                it('should get the function scope by the text of its Def correctly', function () {
                    tree.getFunctionScopes().length.should.eql(3);

                    /// foo1Scope
                    var foo1Scope = tree.getFunctionScopes()[1];
                    foo1Scope.getScope().getValue().should.eql('foo1');
                    foo1Scope.getDef().toString().should.eql('Def@n0@[16,23]_Program');
                    should.exist(tree.getFunctionScopeByDef('Def@n0@[16,23]_Program'));
                    tree.getFunctionScopeByDef('Def@n0@[16,23]_Program').should.eql(foo1Scope);

                    /// foo2Scope
                    var foo2Scope = tree.getFunctionScopes()[2];
                    foo2Scope.getScope().getValue().should.eql('foo2');
                    foo2Scope.getDef().toString().should.eql('Def@n0@[39,46]_Program');
                    should.exist(tree.getFunctionScopeByDef('Def@n0@[39,46]_Program'));
                    tree.getFunctionScopeByDef('Def@n0@[39,46]_Program').should.eql(foo2Scope);
                });

                it('should get the function scope by the value of its Def correctly', function () {
                    tree.getFunctionScopes().length.should.eql(3);

                    /// foo1Scope
                    var foo1Scope = tree.getFunctionScopes()[1];
                    foo1Scope.getScope().getValue().should.eql('foo1');
                    should.exist(tree.getFunctionScopeByDef(defFactory.create(0, Def.FUNCTION_TYPE, [16,23], Scope.PROGRAM_SCOPE)));
                    tree.getFunctionScopeByDef(defFactory.create(0, Def.FUNCTION_TYPE, [16,23], Scope.PROGRAM_SCOPE)).should.eql(foo1Scope);

                    /// foo2Scope
                    var foo2Scope = tree.getFunctionScopes()[2];
                    foo2Scope.getScope().getValue().should.eql('foo2');
                    should.exist(tree.getFunctionScopeByDef(defFactory.create(0, Def.FUNCTION_TYPE, [39,46], Scope.PROGRAM_SCOPE)));
                    tree.getFunctionScopeByDef(defFactory.create(0, Def.FUNCTION_TYPE, [39,46], Scope.PROGRAM_SCOPE)).should.eql(foo2Scope);
                });
            });

            describe('ScopeName', function () {
                it('should get the function scope by the text of its Scope correctly', function () {
                    tree.getFunctionScopes().length.should.eql(3);

                    /// foo1Scope
                    var foo1Scope = tree.getFunctionScopes()[1];
                    foo1Scope.getScope().getValue().should.eql('foo1');
                    foo1Scope.getScope().toString().should.eql('Function["foo1"]');
                    should.exist(tree.getFunctionScopeByScopeName('Function["foo1"]'));
                    tree.getFunctionScopeByScopeName('Function["foo1"]').should.eql(foo1Scope);

                    /// foo2Scope
                    var foo2Scope = tree.getFunctionScopes()[2];
                    foo2Scope.getScope().getValue().should.eql('foo2');
                    foo2Scope.getScope().toString().should.eql('Function["foo2"]');
                    should.exist(tree.getFunctionScopeByScopeName('Function["foo2"]'));
                    tree.getFunctionScopeByScopeName('Function["foo2"]').should.eql(foo2Scope);
                });

                it('should get the function scope by the value of its Scope correctly', function () {
                    tree.getFunctionScopes().length.should.eql(3);

                    /// foo1Scope
                    var foo1Scope = tree.getFunctionScopes()[1];
                    foo1Scope.getScope().getValue().should.eql('foo1');
                    should.exist(tree.getFunctionScopeByScopeName(new Scope('foo1')));
                    tree.getFunctionScopeByScopeName(new Scope('foo1')).should.eql(foo1Scope);

                    /// foo2Scope
                    var foo2Scope = tree.getFunctionScopes()[2];
                    foo2Scope.getScope().getValue().should.eql('foo2');
                    should.exist(tree.getFunctionScopeByScopeName(new Scope('foo2')));
                    tree.getFunctionScopeByScopeName(new Scope('foo2')).should.eql(foo2Scope);
                });
            });
        });


        describe('findRDs', function () {
            var ast, tree;
            beforeEach(function () {
                ast = CFGExt.parseAST(
                    'var a = 0;' +
                    'function foo() {' +
                    'a = 1;' +
                    '}' +
                    'foo();' +
                    '++a;'
                );
                tree = new FunctionScopeTree(ast);
            });

            it('should have correct reach definitions', function () {
                tree.findVars();
                tree.findRDs();

                var programScope = tree.getFunctionScopes()[0],
                    fooScope = tree.getFunctionScopes()[1];
                programScope.getScope().toString().should.eql('Program');
                fooScope.getScope().toString().should.eql('Function["foo"]');

                /// ReachIn(entry)
                var reachInsNode0 = programScope.getReachIns().get(programScope.getCFG()[0]);
                reachInsNode0.size.should.eql(1);
                reachInsNode0.values()[0].toString().should.eql('(foo@[25,33]_Program,Def@n0@[25,33]_Program)');

                /// node 1: var a = 0;
                /// ReachIn(node 1):
                var reachInsNode1 = programScope.getReachIns().get(programScope.getCFG()[2][1]);
                reachInsNode1.size.should.eql(1);
                reachInsNode1.values()[0].toString().should.eql('(foo@[25,33]_Program,Def@n0@[25,33]_Program)');

                /// ReachOut(node 1)
                var reachOutNode1 = programScope.getReachOuts().get(programScope.getCFG()[2][1]);
                reachOutNode1.size.should.eql(2);
                var reachOutNode1Texts = [];
                reachOutNode1.forEach(function (rd) {
                    reachOutNode1Texts.push(rd.toString());
                });
                reachOutNode1Texts.should.containDeep([
                    '(foo@[25,33]_Program,Def@n0@[25,33]_Program)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)'
                ]);

                /// node 2: foo();
                /// ReachIn(node 2)
                var reachInsNode2 = programScope.getReachIns().get(programScope.getCFG()[2][2]);
                reachInsNode2.size.should.eql(2);
                var reachInTextsNode2 = [];
                reachInsNode2.forEach(function (rd) {
                    reachInTextsNode2.push(rd.toString());
                });
                reachInTextsNode2.should.containDeep([
                    '(foo@[25,33]_Program,Def@n0@[25,33]_Program)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)'
                ]);

                /// ReachIn(foo.entry)
                var reachInEntryFoo = fooScope.getReachIns().get(fooScope.getCFG()[0]);
                reachInEntryFoo.size.should.eql(2);
                var reachInEntryFooTexts = [];
                reachInEntryFoo.forEach(function (rd) {
                    reachInEntryFooTexts.push(rd.toString());
                });
                reachInEntryFooTexts.should.containDeep([
                    '(foo@[25,33]_Program,Def@n0@[25,33]_Program)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)'
                ]);

                /// ReachOut(foo.entry)
                var reachOutEntryFoo = fooScope.getReachOuts().get(fooScope.getCFG()[0]);
                reachOutEntryFoo.size.should.eql(2);
                var reachOutEntryFooTexts = [];
                reachOutEntryFoo.forEach(function (rd) {
                    reachOutEntryFooTexts.push(rd.toString());
                });
                reachOutEntryFooTexts.should.containDeep([
                    '(foo@[25,33]_Program,Def@n0@[25,33]_Program)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)'
                ]);

                /// ReachOut(foo.exit)
                var reachOutExitFoo = fooScope.getReachOuts().get(fooScope.getCFG()[1]);
                reachOutExitFoo.size.should.eql(2);
                var reachOutExitFooTexts = [];
                reachOutExitFoo.forEach(function (rd) {
                    reachOutExitFooTexts.push(rd.toString());
                });
                reachOutExitFooTexts.should.containDeep([
                    '(foo@[25,33]_Program,Def@n0@[25,33]_Program)',
                    '(a@[4,5]_Program,Def@n6@[30,31]_Function["foo"])'
                ]);

                /// node 3: ++a;
                /// ReachIn(node 3):
                var reachInsNode3 = programScope.getReachIns().get(programScope.getCFG()[2][3]);
                reachInsNode3.size.should.eql(3);
                var reachInTextsNode3 = [];
                reachInsNode3.forEach(function (rd) {
                    reachInTextsNode3.push(rd.toString());
                });
                reachInTextsNode3.should.containDeep([
                    '(foo@[25,33]_Program,Def@n0@[25,33]_Program)',
                    '(a@[4,5]_Program,Def@n1@[8,9]_Program)',
                    '(a@[4,5]_Program,Def@n6@[30,31]_Function["foo"])'
                ]);

                var reachOutNode3 = programScope.getReachOuts().get(programScope.getCFG()[2][3]);
                //reachOutNode3.size.should.eql(4);
            });
        });
    });
});