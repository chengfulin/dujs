/**
 * Created by chengfulin on 2015/4/29.
 */
var DuJs = require('../../lib/dujs').DuJs,
    CFGExt = require('../../lib/dujs').CFGExt,
    should = require('should');

describe('DuJs', function () {
    'use strict';
    describe('methods', function () {
        var dujs;
        beforeEach(function () {
            dujs = new DuJs();
        });
        describe('buildCFGWrapperTree', function () {
            it('should build the tree well', function () {
                var code = 'function foo(x) {\n' +
                                'function inner() {}\n' +
                            '}\n' +
                            'var foo2 = function (a, b) {};',
                    rootScope,
                    childScope1,
                    childScope2,
                    descendentScope;
                dujs.buildCFGWrapperTree(CFGExt.parseAST(code));
                dujs.getFunctionScopes().length.should.eql(4);

                rootScope = dujs.getRoot();
                childScope1 = dujs.getFunctionScopes()[1];
                childScope2 = dujs.getFunctionScopes()[3];
                descendentScope = dujs.getFunctionScopes()[2];

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
                should(rootScope.getChildren().has(childScope1.getDef())).eql(true);
                should(rootScope.getChildren().has(childScope2.getDef())).eql(true);

                should.exist(childScope1.getParent());
                childScope1.getParent().getScope().toString().should.eql('Program');
                childScope1.getChildren().size.should.eql(1);
                should(childScope1.getChildren().has(descendentScope.getDef())).eql(true);
                childScope1.getParams().size.should.eql(1);
                should(childScope1.getParams().has('x')).eql(true);
                childScope1.getScopeVars().size.should.eql(2);
                should(childScope1.getScopeVars().has('inner')).eql(true);
                should(childScope1.getScopeVars().has('x')).eql(true);
                var childScope1EntryRDs = childScope1.getReachDefinitions().get(childScope1.getCFG()[0]),
                    innerVar = childScope1.getScopeVars().get('inner'),
                    xVar = childScope1.getScopeVars().get('x');
                should.exist(childScope1EntryRDs.get(innerVar));
                should.exist(childScope1EntryRDs.get(xVar));
                /// params don't get the def yet
                childScope1EntryRDs.get(xVar).values().length.should.eql(0);

                should.exist(childScope2.getParent());
                childScope2.getParent().getScope().toString().should.eql('Program');
                childScope2.getChildren().size.should.eql(0);
                childScope2.getParams().size.should.eql(2);
                should(childScope2.getParams().has('a')).eql(true);
                should(childScope2.getParams().has('b')).eql(true);
                var childScope2EntryRDs = childScope2.getReachDefinitions().get(childScope2.getCFG()[0]),
                    aVar = childScope2.getScopeVars().get('a'),
                    bVar = childScope2.getScopeVars().get('b');
                should.exist(childScope2EntryRDs.get(aVar));
                should.exist(childScope2EntryRDs.get(bVar));
                /// params don't get the def yet
                childScope2EntryRDs.get(aVar).values().length.should.eql(0);

                should.exist(descendentScope.getParent());
                descendentScope.getParent().getScope().toString().should.eql('Function["foo"]');
                descendentScope.getChildren().size.should.eql(0);
                descendentScope.getParams().size.should.eql(0);
            });
        });
    });
});