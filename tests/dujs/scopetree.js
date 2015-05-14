/**
 * Created by chengfulin on 2015/4/29.
 */
var FunctionScopeTree = require('../../lib/dujs').FunctionScopeTree,
    CFGExt = require('../../lib/dujs').CFGExt,
    Range = require('../../lib/dujs').Range,
    should = require('should');

describe('FunctionScopeTree', function () {
    'use strict';
    var code,
        tree;

    beforeEach(function () {
        code = 'function foo(x) {\n' +
        'function inner() {}\n' +
        '}\n' +
        'var foo2 = function (a, b) {};';
        tree = new FunctionScopeTree(CFGExt.parseAST(code));
        CFGExt.resetCounter();
    });

    describe('constructor', function () {
        it('should build the tree well', function () {
            var rootScope,
                childScope1,
                childScope2,
                descendentScope;
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
                var functionScopes = tree.getFunctionScopes();
                functionScopes.length.should.eql(4);
                tree.toString().should.eql(
                    '+-' + functionScopes[0].getScope() + '@' + functionScopes[0].getRange() + '\n' +
                    '  +-' + functionScopes[1].getScope() + '@' + functionScopes[1].getRange() + '\n' +
                    '    +-' + functionScopes[2].getScope() + '@' + functionScopes[2].getRange() + '\n' +
                    '  +-' + functionScopes[3].getScope() + '@' + functionScopes[3].getRange()
                );
            });
        });

        describe('findRDs', function () {
            it('should have correct definitions of formal argument', function () {
                code += '\nfoo(1);';
                tree = new FunctionScopeTree(CFGExt.parseAST(code));
                tree.findVars();
                tree.findRDs();

                var rootScope = tree.getRoot(),
                    fooScope = tree.getFunctionScopeByRange(new Range(16, 39));
                rootScope.getScope().toString().should.eql('Program');
                fooScope.getScope().toString().should.eql('Function["foo"]');

                /// ReachIns at the entry point of function 'foo'
                var reachInFooEntry = fooScope.getReachIns().get(fooScope.getCFG()[0]),
                    reachOutFooEntry = fooScope.getReachOuts().get(fooScope.getCFG()[0]);
                reachInFooEntry.size.should.eql(4);
                reachOutFooEntry.size.should.eql(4);

                rootScope.getReachIns().get(rootScope.getCFG()[1]).size.should.eql(2);
                rootScope.getReachIns().get(rootScope.getCFG()[1]).values()[0].variable.getName().toString().should.eql('foo');
                rootScope.getReachIns().get(rootScope.getCFG()[1]).values()[1].variable.getName().toString().should.eql('foo2');
                rootScope.getCFG()[2].length.should.eql(4);
                rootScope.getReachIns().get(rootScope.getCFG()[2][1]).size.should.eql(1);
                rootScope.getReachIns().get(rootScope.getCFG()[2][1]).values()[0].variable.getName().should.eql('foo');
                rootScope.getReachIns().get(rootScope.getCFG()[2][2]).size.should.eql(2);
                rootScope.getReachIns().get(rootScope.getCFG()[2][2]).values()[1].variable.getName().should.eql('foo2');
                rootScope.getReachIns().get(rootScope.getCFG()[2][3]).values()[1].variable.getName().should.eql('foo2');

                var rdTextsOfFooEntry = [];
                reachInFooEntry.forEach(function (rd) {
                    rdTextsOfFooEntry.push(rd.toString());
                });
                rdTextsOfFooEntry.should.containDeep([
                    '(inner@[35,37]_Function["foo"],Def@n4@[35,37]_Function["foo"])',
                    '(x@[13,14]_Function["foo"],Def@n4@[13,14]_Function["foo"])',
                    '(foo@[16,39]_Program,Def@n0@[16,39]_Program)',
                    '(foo2@[44,48]_Program,Def@n1@[51,69]_Program)'
                ]);
            });

            it('should have correct reach definitions', function () {
                var ast = CFGExt.parseAST(
                        'var a = 0, b = 1;' +
                        'function foo(x) {' +
                        '++a;' +
                        '}' +
                        'foo(b);' +
                        'b = a;'
                    ),
                    tree = new FunctionScopeTree(ast);
                tree.findVars();

                tree.findRDs();

                var rootScope = tree.getRoot(),
                    fooScope = tree.getFunctionScopeByScopeName('Function["foo"]');
                rootScope.getScope().toString().should.eql('Program');
                fooScope.getScope().toString().should.eql('Function["foo"]');

                fooScope.getReachOuts().get(fooScope.getCFG()[1]).values().forEach(function (elem) {
                    console.log(elem.toString());
                });
            });
        });
    });
});