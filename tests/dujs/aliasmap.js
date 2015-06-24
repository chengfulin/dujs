/**
 * Created by ChengFuLin on 2015/6/23.
 */
var AliasMap = require('../../lib/dujs').AliasMap,
    Set = require('../../lib/analyses').Set,
    Map = require('core-js/es6/map');
require('should');

describe('AliasMap', function () {
    "use strict";
    var aliasMap = new AliasMap();
    beforeEach(function () {
        aliasMap._testonly_._aliasMap = new Map();
    });

    describe('Properties', function () {
        describe('map', function () {
            it('should get the map correctly', function () {
                var pointed = {name: 'pointed'},
                    alias = {name: 'alias'};
                aliasMap._testonly_._aliasMap.set(pointed, new Set([alias]));
                var map = aliasMap.map;
                map.size.should.eql(1);
                map.has(pointed).should.eql(true);
                map.get(pointed).has(alias).should.eql(true);
            });
        });
    });

    describe('Methods', function () {
        describe('hasPointTo', function () {
            var pointed;
            beforeEach(function () {
                pointed = {name: 'pointed'};
                var alias = {name: 'alias'};
                aliasMap._testonly_._aliasMap.set(pointed, new Set([alias]));
            });

            it('should return true as the input object is existed', function () {
                aliasMap.hasPointTo(pointed).should.eql(true);
            });

            it('should return false as the input object is not existed', function () {
                aliasMap.hasPointTo({}).should.eql(false);
            });
        });

        describe('addAlias', function () {
            it('should support to add an alias to existed pointed object', function () {
                var pointed = {name: 'pointed'},
                    alias = {name: 'alias'};
                aliasMap._testonly_._aliasMap.set(pointed, new Set());
                aliasMap.addAlias(pointed, alias);

                aliasMap._testonly_._aliasMap.size.should.eql(1);
                aliasMap._testonly_._aliasMap.get(pointed).size.should.eql(1);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias).should.eql(true);
            });

            it('should support to add alias to newly pointed object', function () {
                var pointed = {name: 'pointed'},
                    alias = {name: 'alias'};
                aliasMap.addAlias(pointed, alias);

                aliasMap._testonly_._aliasMap.size.should.eql(1);
                aliasMap._testonly_._aliasMap.get(pointed).size.should.eql(1);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias).should.eql(true);
            });
        });

        describe('removeAlias', function () {
            var pointed, alias1, alias2, alias3;
            beforeEach(function () {
                pointed = {name: 'pointed'};
                alias1 = {name: 'alias1'};
                alias2 = {name: 'alias2'};
                alias3 = {name: 'alias3'};
                aliasMap._testonly_._aliasMap.set(pointed, new Set([alias1, alias2, alias3]));
            });

            it('should remove the 1st alias correctly', function () {
                aliasMap.removeAlias(pointed, alias1);
                aliasMap._testonly_._aliasMap.get(pointed).size.should.eql(2);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias1).should.eql(false);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias2).should.eql(true);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias3).should.eql(true);
            });

            it('should remove the 2nd alias correctly', function () {
                aliasMap.removeAlias(pointed, alias2);
                aliasMap._testonly_._aliasMap.get(pointed).size.should.eql(2);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias1).should.eql(true);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias2).should.eql(false);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias3).should.eql(true);
            });

            it('should remove the 3rd alias correctly', function () {
                aliasMap.removeAlias(pointed, alias3);
                aliasMap._testonly_._aliasMap.get(pointed).size.should.eql(2);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias1).should.eql(true);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias2).should.eql(true);
                aliasMap._testonly_._aliasMap.get(pointed).has(alias3).should.eql(false);
            });

            it('should do nothing as there is not the alias', function () {
                aliasMap.removeAlias(pointed, {name: 'invalid'});
                aliasMap._testonly_._aliasMap.get(pointed).size.should.eql(3);
            });

            it('should do nothing as there is not a pointed object', function () {
                aliasMap.removeAlias({name: 'pointed'}, alias1);
                aliasMap._testonly_._aliasMap.size.should.eql(1);
                aliasMap._testonly_._aliasMap.get(pointed).size.should.eql(3);
            });

            it('should remove all alias then the pointed object also', function () {
                aliasMap.removeAlias(pointed, alias1);
                aliasMap.removeAlias(pointed, alias2);
                aliasMap.removeAlias(pointed, alias3);
                aliasMap._testonly_._aliasMap.size.should.eql(0);
            });
        });
    });
});