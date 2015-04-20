/**
 * Created by chengfulin on 2015/4/15.
 */
var cfgext = require('../lib/dujs').CFGExt,
    DUA = require('../lib/dujs').DUA,
    DUPair = require('../lib/dujs').DUPair,
    Def = require('../lib/dujs').Def,
    Set = require('../lib/analyses').Set,
    should = require('should');

describe('Def-Use Analysis', function () {
    it('should work for simple example', function () {
        var cfg = cfgext.getCFG(
                'var a = 10, b = 0;\n' +
                'b = a;\n' +
                'a = b * b;\n' +
                'b = a = 0;'
            ),
            dupairs = DUA.DUPairs(cfg);
        /// DU pairs of 'a'
        var dupairsOfa = dupairs.get('a').values();
        dupairsOfa.length.should.eql(2);
        dupairsOfa.should.containDeep([
            new DUPair(1, 2),
            new DUPair(3, 4)
        ]);
        /// DU pairs of 'b'
        var dupairsOfb = dupairs.get('b').values();
        dupairsOfb.length.should.eql(1);
        dupairsOfb.should.containDeep([new DUPair(2, 3)]);
    });

    it('should work for assignment with object property', function () {
        var cfg = cfgext.getCFG(
                'var obj = {prop: "test"};\n' +
                'var test = obj.prop;'
            ),
            dupairs = DUA.DUPairs(cfg);
        /// DU pairs of 'obj'
        var dupairsOfobj = dupairs.get('obj').values();
        dupairsOfobj.length.should.eql(1);
        dupairsOfobj.should.containDeep([new DUPair(1, 2)]);
    });

    it('should work for self assignment', function () {
        var cfg = cfgext.getCFG(
                'var x = 0;\n' +
                'x += 2;\n' +
                'var y = x;\n' +
                'y++;'
            ),
            dupairs = DUA.DUPairs(cfg);
        /// DU pairs of 'x'
        var dupairsOfx = dupairs.get('x').values();
        dupairsOfx.length.should.eql(2);
        dupairsOfx.should.containDeep([
            new DUPair(1, 2),
            new DUPair(2, 3)
        ]);
        /// DU pairs of 'y'
        var dupairsOfy = dupairs.get('y').values();
        dupairsOfy.length.should.eql(1);
        dupairsOfy.should.containDeep([new DUPair(3, 4)]);
    });

    it('should work for branch', function () {
        var cfg = cfgext.getCFG(
            'var x = 20, y = 5;\n' +
            'if (x > y) {\n' +
                'var z = 10;' +
                'x = x % y;\n' +
            '} else {\n' +
                'y = x;\n' +
            '}\n' +
            'var out1 = x, out2 = y, out3 = z;'
            ),
            dupairs = DUA.DUPairs(cfg);
        /// DU pairs of 'x'
        var dupairsOfx = dupairs.get('x').values();
        dupairsOfx.length.should.eql(5);
        /// n5: 'var out1 = x, out2 = y, out3 = x;'
        /// n6: 'y = x;'
        dupairsOfx.should.containDeep([
            new DUPair(1, 2),
            new DUPair(1, 4),
            new DUPair(1, 5),
            new DUPair(1, 6),
            new DUPair(4, 5)
        ]);
        /// DU pairs of 'y'
        var dupairsOfy = dupairs.get('y').values();
        dupairsOfy.length.should.eql(4);
        dupairsOfy.should.containDeep([
            new DUPair(1, 2),
            new DUPair(1, 4),
            new DUPair(1, 5),
            new DUPair(6, 5)
        ]);
        /// DU pairs of 'z'
        var dupairsOfz = dupairs.get('z').values();
        dupairsOfz.length.should.eql(1);
        dupairsOfz.should.containDeep([new DUPair(3, 5)]);
    });

    it('should work for loop', function () {
        var cfg = cfgext.getCFG(
                'var x = 5, y = 0;\n' +
                'while(x > 0) {\n' +
                    'y += x;\n' +
                    '--x;\n' +
                    'var z = x;\n' +
                '}'
            ),
            dupairs = DUA.DUPairs(cfg);
        /// DU pairs of 'x'
        var dupairsOfx = dupairs.get('x').values();
        dupairsOfx.length.should.eql(7);
        dupairsOfx.should.containDeep([
            new DUPair(1, 2),
            new DUPair(1, 3),
            new DUPair(1, 4),
            new DUPair(4, 5),
            new DUPair(4, 2),
            new DUPair(4, 3),
            new DUPair(4, 4)
        ]);
        /// DU pairs of 'y'
        var dupairsOfy = dupairs.get('y').values();
        dupairsOfy.length.should.eql(2);
        dupairsOfy.should.containDeep([
            new DUPair(1, 3),
            new DUPair(3, 3)
        ]);
        /// DU pairs of 'z'
        var dupairsOfz = dupairs.get('z').values();
        dupairsOfz.length.should.eql(0);
    });

    it('should work for function call', function () {
        var cfg = cfgext.getCFG(
                'var argu, obj = {method: function () {}};\n' +
                'obj.method(argu);\n' +
                'fun(argu);\n' +
                'var fexp = function (v) {};\n' +
                'fexp(argu);'
            ),
            dupairs = DUA.DUPairs(cfg);
        /// DU pairs of 'argu'
        var dupairsOfargu = dupairs.get('argu').values();
        dupairsOfargu.length.should.eql(3);
        dupairsOfargu.should.containDeep([
            new DUPair(1, 2),
            new DUPair(1, 3),
            new DUPair(1, 5)
        ]);
        /// DU pairs of 'obj'
        var dupairsOfobj = dupairs.get('obj').values();
        dupairsOfobj.length.should.eql(1);
        dupairsOfobj.should.containDeep([new DUPair(1, 2)]);
        /// DU pairs of 'fexp'
        var dupairsOffexp = dupairs.get('fexp').values();
        dupairsOffexp.length.should.eql(1);
        dupairsOffexp.should.containDeep([new DUPair(4, 5)]);
    });

    it('should work for switch', function () {
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
            dupairs = DUA.DUPairs(cfg);
        /// DU pairs of 'test'
        var dupairsOfx = dupairs.get('test').values();
        dupairsOfx.length.should.eql(8);
        dupairsOfx.should.containDeep([
            new DUPair(1, 2),
            new DUPair(1, 3),
            new DUPair(1, 6),
            new DUPair(1, 7),
            new DUPair(1, 8),
            new DUPair(1, 9),
            new DUPair(1, 10),
            new DUPair(1, 12)
        ]);
    });
});

describe('getUsedDefs', function () {
    var defs = new Set();
    beforeEach(function () {
        defs = new Set();
        defs.add(new Def('x', 1));
        defs.add(new Def('x', 4));
        defs.add(new Def('y', 2));
    });

    it('should work for no used', function () {
        var use = new Set();
        /// intersection of set of Defs and empty set
        DUA.getUsedDefs(defs, use).values().should.be.empty;
    });

    it('should work for partial used', function () {
        var use = new Set();
        use.add('x');
        /// intersection of set of Defs and partial used definition names
        var intersection = DUA.getUsedDefs(defs, use).values();
        intersection.length.should.eql(2);
        intersection.should.containDeep([
            new Def('x', 1),
            new Def('x', 4)
        ]);
    });

    it('should work for all used', function () {
        var use = new Set();
        use.add('x');
        use.add('y');
        /// intersection of set of Defs and partial used definition names
        var intersection = DUA.getUsedDefs(defs, use).values();
        intersection.length.should.eql(3);
        intersection.should.containDeep([
            new Def('x', 1),
            new Def('x', 4),
            new Def('y', 2)
        ]);
    });
});