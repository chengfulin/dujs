/**
 * Created by chengfulin on 2015/4/20.
 */
var CFGWrapper = require('../lib/dujs').CFGWrapper,
    esgraph = require('esgraph'),
    esprima = require('esprima'),
    should = require('should'),
    Def = require('../lib/dujs').Def,
    Set = require('../lib/analyses').Set;

describe('CFG Wrapper', function () {
    it('should be constructed with CFG well', function () {
        var cfgwrp = new CFGWrapper(
            'Program',
            esgraph(
                esprima.parse('var x = 1, y = 0;', { range:true})
            )
        );
        cfgwrp.scope.should.eql('Program');
        cfgwrp.cfg.length.should.eql(3);
        cfgwrp.cfg[2].length.should.eql(3);
        esgraph.dot(cfgwrp.cfg, 'var x = 1, y = 0;').should.eql(
            'n0 [label="entry", style="rounded"]\n' +
            'n1 [label="VariableDeclaration"]\n' +
            'n2 [label="exit", style="rounded"]\n' +
            'n0 -> n1 []\n' +
            'n1 -> n2 []\n'
        );
    });

    it('should set Reach Definitions well', function () {
        var fakeRDs = new Map(),
            cfgwrp = new CFGWrapper(
                'Program',
                esgraph(
                    esprima.parse('var x = 1, y = 0;', { range:true})
                )
            );
        fakeRDs.set(cfgwrp.cfg[0], new Set());
        fakeRDs.set(cfgwrp.cfg[1],
            new Set([
                new Def(1, [8, 9], 'Program'),
                new Def(1, [15, 16], 'Program')
            ])
        );
        fakeRDs.set(cfgwrp.cfg[2][1], new Set());
        cfgwrp.setReachDefinitions(fakeRDs);

        should(cfgwrp.rds.get(cfgwrp.cfg[0]) instanceof Set).be.ok;
        cfgwrp.rds.get(cfgwrp.cfg[0]).values().should.be.empty;
        should(cfgwrp.rds.get(cfgwrp.cfg[1]) instanceof Set).be.ok;
        cfgwrp.rds.get(cfgwrp.cfg[1]).values().length.should.eql(2);
        cfgwrp.rds.get(cfgwrp.cfg[1]).values()[0].toString().should.eql('Def @n1 @[8,9]_Program');
        cfgwrp.rds.get(cfgwrp.cfg[1]).values()[1].toString().should.eql('Def @n1 @[15,16]_Program');
        should(cfgwrp.rds.get(cfgwrp.cfg[2][1]) instanceof Set).be.ok;
        cfgwrp.rds.get(cfgwrp.cfg[2][1]).values().should.be.empty;

        var invalidRDs = new Map();
        invalidRDs.set(cfgwrp.cfg[0], 'entry');
        invalidRDs.set(cfgwrp.cfg[1], 'exit');
        invalidRDs.set(cfgwrp.cfg[2][1], 'n1');
        cfgwrp.setReachDefinitions(invalidRDs);

        should.not.exist(cfgwrp.rds.get(cfgwrp.cfg[0]));
        should.not.exist(cfgwrp.rds.get(cfgwrp.cfg[1]));
        should.not.exist(cfgwrp.rds.get(cfgwrp.cfg[2][1]));
    });
});