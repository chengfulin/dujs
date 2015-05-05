/**
 * Created by chengfulin on 2015/4/29.
 */
var FunctionScopeTree = require('../../lib/dujs').FunctionScopeTree,
    CFGExt = require('../../lib/dujs').CFGExt,
    should = require('should');

describe('FunctionScopeTree', function () {
    'use strict';
    describe('methods', function () {
        describe('buildCFGWrapperTree', function () {
            it('should build the tree well', function () {
                var code = 'function foo(x) {\n' +
                                'function inner() {}\n' +
                            '}\n' +
                            'var foo2 = function (a, b) {};',
                    rootScope,
                    childScope1,
                    childScope2,
                    descendentScope,
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
                should(childScope1.doesVarReachIn(childScope1EntryNode, xVar)).eql(false);

                should.exist(childScope2.getParent());
                childScope2.getParent().getScope().toString().should.eql('Program');
                childScope2.getChildren().size.should.eql(0);
                childScope2.getFunctionParams().size.should.eql(2);
                should(childScope2.getFunctionParams().has('a')).eql(true);
                should(childScope2.getFunctionParams().has('b')).eql(true);
                var childScope2EntryNode = childScope2.getCFG()[0],
                    aVar = childScope2.getScopeVars().get('a'),
                    bVar = childScope2.getScopeVars().get('b');
                should(childScope2.doesVarReachIn(childScope2EntryNode, aVar)).eql(false);
                should(childScope2.doesVarReachIn(childScope2EntryNode, bVar)).eql(false);
                /// params don't get the def yet
                childScope2.getVarDefsReachIn(childScope2, aVar).values().length.should.eql(0);

                should.exist(descendentScope.getParent());
                descendentScope.getParent().getScope().toString().should.eql('Function["foo"]');
                descendentScope.getChildren().size.should.eql(0);
                descendentScope.getFunctionParams().size.should.eql(0);
            });
        });
    });
});