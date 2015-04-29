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
                var code = 'function foo() {\n' +
                                'function inner() {}\n' +
                            '}\n' +
                            'var foo2 = function () {};',
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

                should.exist(childScope2.getParent());
                childScope2.getParent().getScope().toString().should.eql('Program');
                childScope2.getChildren().size.should.eql(0);

                should.exist(descendentScope.getParent());
                descendentScope.getParent().getScope().toString().should.eql('Function["foo"]');
                descendentScope.getChildren().size.should.eql(0);
            });
        });
    });
});