/**
 * Created by ChengFuLin on 2015/6/23.
 */
var aliasCtrl = require('../../lib/dujs').aliasCtrl,
    Set = require('../../lib/analyses').Set,
    Map = require('core-js/es6/map');
require('should');

describe('AliasCtrl', function () {
    "use strict";
    describe('Methods', function () {
        beforeEach(function () {
            aliasCtrl._testonly_._aliasMap = new Map();
        });

        describe('hasPointTo', function () {
            var pointed;
            beforeEach(function () {
                pointed = {name: 'pointed'};
                var alias = {name: 'alias'};
                aliasCtrl._testonly_._aliasMap.set(pointed, new Set([alias]));
            });

            it('should return true as the input object is existed', function () {
                aliasCtrl.hasPointTo(pointed).should.eql(true);
            });

            it('should return false as the input object is not existed', function () {
                aliasCtrl.hasPointTo({}).should.eql(false);
            });
        });

        describe('addAlias', function () {
            it('should support to add an alias to existed pointed object', function () {
                var pointed = {name: 'pointed'},
                    alias = {name: 'alias'};
                aliasCtrl._testonly_._aliasMap.set(pointed, new Set());
                aliasCtrl.addAlias(pointed, alias);

                aliasCtrl._testonly_._aliasMap.size.should.eql(1);
                aliasCtrl._testonly_._aliasMap.get(pointed).size.should.eql(1);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias).should.eql(true);
            });

            it('should support to add alias to newly pointed object', function () {
                var pointed = {name: 'pointed'},
                    alias = {name: 'alias'};
                aliasCtrl.addAlias(pointed, alias);

                aliasCtrl._testonly_._aliasMap.size.should.eql(1);
                aliasCtrl._testonly_._aliasMap.get(pointed).size.should.eql(1);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias).should.eql(true);
            });
        });

        describe('removeAlias', function () {
            var pointed, alias1, alias2, alias3;
            beforeEach(function () {
                pointed = {name: 'pointed'};
                alias1 = {name: 'alias1'};
                alias2 = {name: 'alias2'};
                alias3 = {name: 'alias3'};
                aliasCtrl._testonly_._aliasMap.set(pointed, new Set([alias1, alias2, alias3]));
            });

            it('should remove the 1st alias correctly', function () {
                aliasCtrl.removeAlias(pointed, alias1);
                aliasCtrl._testonly_._aliasMap.get(pointed).size.should.eql(2);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias1).should.eql(false);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias2).should.eql(true);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias3).should.eql(true);
            });

            it('should remove the 2nd alias correctly', function () {
                aliasCtrl.removeAlias(pointed, alias2);
                aliasCtrl._testonly_._aliasMap.get(pointed).size.should.eql(2);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias1).should.eql(true);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias2).should.eql(false);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias3).should.eql(true);
            });

            it('should remove the last alias correctly', function () {
                aliasCtrl.removeAlias(pointed, alias3);
                aliasCtrl._testonly_._aliasMap.get(pointed).size.should.eql(2);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias1).should.eql(true);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias2).should.eql(true);
                aliasCtrl._testonly_._aliasMap.get(pointed).has(alias3).should.eql(false);
            });

            it('should do nothing as there is not the alias', function () {
                aliasCtrl.removeAlias(pointed, {name: 'invalid'});
                aliasCtrl._testonly_._aliasMap.get(pointed).size.should.eql(3);
            });

            it('should do nothing as there is not a pointed object', function () {
                aliasCtrl.removeAlias({name: 'pointed'}, alias1);
                aliasCtrl._testonly_._aliasMap.size.should.eql(1);
                aliasCtrl._testonly_._aliasMap.get(pointed).size.should.eql(3);
            });
        });
    });
});