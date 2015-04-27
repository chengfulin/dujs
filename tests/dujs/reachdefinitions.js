/**
 * Created by chengfulin on 2015/4/10.
 */
var ReachDefinitions = require('../../lib/dujs/index').ReachDefinitions,
    Set = require('../../lib/analyses/index').Set,
    Def = require('../../lib/dujs/index').Def,
    cfgext = require('../../lib/dujs/index').CFGExt,
    should = require('should');

/**
 * Do reach definitions analysis
 * @param cfg CFG of the source code
 * @returns reach definitions of all nodes
 */
function doAnalysis(cfg) {
    return ReachDefinitions(cfg);
}

/**
 * Test suites
 */
describe('Reach Definitions', function () {
    it('should work for declaration only', function () {
        var cfg = cfgext.getCFG(
                'var x = 55, y = 10, tmp = 0;\n' +
                'expr;'
            ),
            output = doAnalysis(cfg);
        /// RD(entry)
        output.get(cfg[0]).values().should.be.empty;
        /// RD(n1)
        output.get(cfg[2][1]).values().should.empty;
        /// RD(n2)
        output.get(cfg[2][2]).values().should.containDeep([
            new Def('x', 1),
            new Def('y', 1),
            new Def('tmp', 1)
        ]);
    });

    it('should work for redefinition', function () {
        var cfg = cfgext.getCFG(
                'var x = 55, y = 10, tmp = 0;\n' +
                'x = 66;\n' +
                'y = tmp = 1;\n' +
                'expr;'
            ),
            output = doAnalysis(cfg);
        /// RD(n1)
        output.get(cfg[2][1]).values().should.empty;
        /// RD(n2)
        var n2RD = output.get(cfg[2][2]).values();
        n2RD.length.should.eql(3);
        n2RD.should.containDeep([
            new Def('x', 1),
            new Def('y', 1),
            new Def('tmp', 1)
        ]);
        /// RD(n3)
        var n3RD = output.get(cfg[2][3]).values();
        n3RD.length.should.eql(3);
        n3RD.should.containDeep([
            new Def('x', 2),
            new Def('y', 1),
            new Def('tmp', 1)
        ]);
        /// RD(n4)
        var n4RD = output.get(cfg[2][4]).values();
        n4RD.length.should.eql(3);
        n4RD.should.containDeep([
            new Def('x', 2),
            new Def('y', 3),
            new Def('tmp', 3)
        ]);
    });

    it('should work for update expression', function () {
        var cfg = cfgext.getCFG(
                'var x = 5;\n' +
                '++x;\n' +
                'expr;'
            ),
            output = doAnalysis(cfg);
        /// RD(n2)
        var n2RD = output.get(cfg[2][2]).values();
        n2RD.length.should.eql(1);
        n2RD.should.containDeep([new Def('x', 1)]);
        /// RD(n3)
        var n3RD = output.get(cfg[2][3]).values();
        n3RD.length.should.eql(1);
        n3RD.should.containDeep([new Def('x', 2)]);
    });

    it('should work for obj', function () {
       var cfg = cfgext.getCFG(
               'var obj = {};\n' +
               'obj.prop = 123;\n' +
               'expr;'
           ),
           output = doAnalysis(cfg);
        /// RD(n2)
        var n2RD = output.get(cfg[2][2]).values();
        n2RD.length.should.eql(1);
        n2RD.should.containDeep([new Def('obj', 1)]);
        /// RD(n3)
        var n3RD = output.get(cfg[2][3]).values();
        n3RD.length.should.eql(1);
        n3RD.should.containDeep([new Def('obj', 2)]);
    });

    it('should work for branches', function () {
        var cfg = cfgext.getCFG(
                'var x = 20, y = 5;\n' +
                'if (x > y) {\n' +
                    'var z = 10;\n' +
                    'x = x % y;\n' +
                '} else {\n' +
                    'y = x;\n' +
                '}\n' +
                'expr;'
            ),
            output = doAnalysis(cfg);
        /// RD(n2)
        var n2RD = output.get(cfg[2][2]).values();
        n2RD.length.should.eql(2);
        n2RD.should.containDeep([
            new Def('x', 1),
            new Def('y', 1)
        ]);
        /// RD(n3)
        var n3RD = output.get(cfg[2][3]).values();
        n3RD.length.should.eql(2);
        n3RD.should.containDeep([
            new Def('x', 1),
            new Def('y', 1)
        ]);
        /// RD(n4)
        var n4RD = output.get(cfg[2][4]).values();
        n4RD.length.should.eql(3);
        n4RD.should.containDeep([
            new Def('x', 1),
            new Def('y', 1),
            new Def('z', 3)
        ]);
        /// RD(n5) n5: 'expr;'
        var n5RD = output.get(cfg[2][5]).values();
        n5RD.length.should.eql(5);
        n5RD.should.containDeep([
            new Def('x', 1),
            new Def('x', 4),
            new Def('y', 1),
            new Def('y', 6),
            new Def('z', 3)
        ]);
        /// RD(n6) n6: 'y = x;'
        var n6RD = output.get(cfg[2][6]).values();
        n6RD.length.should.eql(2);
        n6RD.should.containDeep([
            new Def('x', 1),
            new Def('y', 1)
        ]);
    });

    it('should work for loops', function () {
        var cfg = cfgext.getCFG(
                'var x = 5, y = 0;\n' +
                'while(x > 0) {\n' +
                    'y += x;\n' +
                    '--x;\n' +
                    'var z = x;\n' +
                '}\n' +
                'expr;'
            ),
            output = doAnalysis(cfg);
        /// RD(n2)
        var n2RD = output.get(cfg[2][2]).values();
        n2RD.length.should.eql(5);
        n2RD.should.containDeep([
            new Def('x', 1),
            new Def('x', 4),
            new Def('y', 1),
            new Def('y', 3),
            new Def('z', 5)
        ]);
        /// RD(n3)
        var n3RD = output.get(cfg[2][3]).values();
        n3RD.length.should.eql(5);
        n3RD.should.containDeep([
            new Def('x', 1),
            new Def('x', 4),
            new Def('y', 1),
            new Def('y', 3),
            new Def('z', 5)
        ]);
        /// RD(n4)
        var n4RD = output.get(cfg[2][4]).values();
        n4RD.length.should.eql(4);
        n4RD.should.containDeep([
            new Def('x', 1),
            new Def('x', 4),
            new Def('y', 3),
            new Def('z', 5)
        ]);
        /// RD(n5)
        var n5RD = output.get(cfg[2][5]).values();
        n5RD.length.should.eql(3);
        n5RD.should.containDeep([
            new Def('x', 4),
            new Def('y', 3),
            new Def('z', 5)
        ]);
    });

    it('should work with switch', function () {
        var cfg = cfgext.getCFG(
                'var test = 3, out;\n' +
                'switch (test) {\n' +
                'case 1:\n' +
                    'out = test;\n' +
                    'break;\n' +
                'case 2:\n' +
                    'out = test * test;\n' +
                    'break;\n' +
                'case 3:\n' +
                    'out = test * test * test;\n' +
                    'break;\n' +
                'case 4:\n' +
                'case 5:\n' +
                    'out = 0;\n' +
                    'break;\n' +
                'default:\n' +
                    'out = -1;\n' +
                '}\n' +
                'var tmp = out;'
            ),
            output = doAnalysis(cfg);
        /// RD(n3) n3: 'out = test;'
        var n3RD = output.get(cfg[2][3]).values();
        n3RD.length.should.eql(2);
        n3RD.should.containDeep([
            new Def('test', 1),
            new Def('out', 1)
        ]);
        /// RD(n4) n4: 'var tmp = out;'
        var n4RD = output.get(cfg[2][4]).values();
        n4RD.length.should.eql(6);
        n4RD.should.containDeep([
            new Def('test', 1),
            new Def('out', 3),
            new Def('out', 7),
            new Def('out', 9),
            new Def('out', 11),
            new Def('out', 14)
        ]);
        /// RD(n7) n7: 'out = test * test;'
        var n7RD = output.get(cfg[2][7]).values();
        n7RD.length.should.eql(2);
        n7RD.should.containDeep([
            new Def('test', 1),
            new Def('out', 1)
        ]);
        /// RD(n11) n7: 'out = test * test;'
        var n11RD = output.get(cfg[2][11]).values();
        n11RD.length.should.eql(2);
        n11RD.should.containDeep([
            new Def('test', 1),
            new Def('out', 1)
        ]);
    });
});
