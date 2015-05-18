/**
 * Created by chengfulin on 2015/4/15.
 */
var cfgext = require('../../lib/dujs').CFGExt,
    DUA = require('../../lib/dujs').DUA,
    DUPair = require('../../lib/dujs').DUPair,
    Def = require('../../lib/dujs').Def,
    Set = require('../../lib/analyses').Set,
    CFGWrapper = require('../../lib/dujs').CFGWrapper,
    Scope = require('../../lib/dujs').Scope,
    vardefFactory = require('../../lib/dujs').factoryVarDef,
    should = require('should');

describe('Def-Use Analysis', function () {
    'use strict';
    beforeEach(function () {
        cfgext.resetCounter();
    });

    describe('find DU pairs of c-use', function () {
        it('should find correct Def-Use pairs with simple assignment and binary expressions', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a = 10, b = 0;' +
                    'b = a;' +
                    'a = b * b;' +
                    'b = a = 0;' +
                    'a += 1;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);

            cfgwrapper.setVars();
            cfgwrapper.initRDs();
            var dupairs = DUA.findDUPairs(cfgwrapper);

            dupairs.size.should.eql(2);/// a,b
            should.exist(dupairs.get(cfgwrapper.getVarByName('a')));
            should.exist(dupairs.get(cfgwrapper.getVarByName('b')));

            /// variable 'a'
            dupairs.get(cfgwrapper.getVarByName('a')).size.should.eql(3);
            dupairs.get(cfgwrapper.getVarByName('a')).values()[0].toString().should.eql('(1,2)');
            dupairs.get(cfgwrapper.getVarByName('a')).values()[1].toString().should.eql('(3,4)');
            dupairs.get(cfgwrapper.getVarByName('a')).values()[2].toString().should.eql('(4,5)');

            /// variable 'b'
            dupairs.get(cfgwrapper.getVarByName('b')).size.should.eql(1);
            dupairs.get(cfgwrapper.getVarByName('b')).values()[0].toString().should.eql('(2,3)');
        });

        it('should find correct Def-Use pairs with variable declarator and update expression', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a = 10;' +
                    'var b = a;' +
                    '++a;' +
                    'a = b--;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);

            cfgwrapper.setVars();
            cfgwrapper.initRDs();
            var dupairs = DUA.findDUPairs(cfgwrapper);

            /// variable 'a'
            dupairs.get(cfgwrapper.getVarByName('a')).size.should.eql(2);
            dupairs.get(cfgwrapper.getVarByName('a')).values()[0].toString().should.eql('(1,2)');
            dupairs.get(cfgwrapper.getVarByName('a')).values()[1].toString().should.eql('(1,3)');

            /// variable 'b'
            dupairs.get(cfgwrapper.getVarByName('b')).size.should.eql(1);
            dupairs.get(cfgwrapper.getVarByName('b')).values()[0].toString().should.eql('(2,4)');
        });

        it('should find correct Def-Use pairs with new and call expressions', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a = new MyClass(), b, c;' +
                    'b = callee(a);' +
                    'c = callee(a, b)'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);

            cfgwrapper.setVars([
                vardefFactory.createGlobalVarDef('MyClass', Def.OBJECT_TYPE),
                vardefFactory.createGlobalVarDef('callee', Def.FUNCTION_TYPE)
            ]);
            cfgwrapper.initRDs();
            var dupairs = DUA.findDUPairs(cfgwrapper);

            dupairs.size.should.eql(4);/// MyClass,callee,a,b ('c' no used)
            should.exist(dupairs.get(cfgwrapper.getVarByName('a')));
            should.exist(dupairs.get(cfgwrapper.getVarByName('b')));
            should.exist(dupairs.get(cfgwrapper.getVarByName('MyClass')));
            should.exist(dupairs.get(cfgwrapper.getVarByName('callee')));

            /// variable 'a'
            dupairs.get(cfgwrapper.getVarByName('a')).size.should.eql(2);
            dupairs.get(cfgwrapper.getVarByName('a')).values()[0].toString().should.eql('(1,2)');
            dupairs.get(cfgwrapper.getVarByName('a')).values()[1].toString().should.eql('(1,3)');

            /// variable 'b'
            dupairs.get(cfgwrapper.getVarByName('b')).size.should.eql(1);
            dupairs.get(cfgwrapper.getVarByName('b')).values()[0].toString().should.eql('(2,3)');

            /// variable 'MyClass'
            dupairs.get(cfgwrapper.getVarByName('MyClass')).size.should.eql(1);
            dupairs.get(cfgwrapper.getVarByName('MyClass')).values()[0].toString().should.eql('(0,1)');

            /// variable 'callee'
            dupairs.get(cfgwrapper.getVarByName('callee')).size.should.eql(2);
            dupairs.get(cfgwrapper.getVarByName('callee')).values()[0].toString().should.eql('(0,2)');
            dupairs.get(cfgwrapper.getVarByName('callee')).values()[1].toString().should.eql('(0,3)');
        });
    });

    describe('find DU pairs of p-use', function () {
        it('should find correct Def-Use pairs with if statement', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a = 1, b = 2, c;' +
                    'if (a > 0) {' +
                    '++a;' +
                    '} else if (b > a) {' +
                    '--b;' +
                    '}' +
                    'c = a + b;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgwrapper.setVars();
            cfgwrapper.initRDs();
            var dupairs = DUA.findDUPairs(cfgwrapper),
                dupairTexts_a = [],
                dupairTexts_b = [];

            dupairs.size.should.eql(2);/// a,b ('c' no used)
            should.exist(dupairs.get(cfgwrapper.getVarByName('a')));
            should.exist(dupairs.get(cfgwrapper.getVarByName('b')));

            /// variable 'a'
            dupairs.get(cfgwrapper.getVarByName('a')).size.should.eql(7);
            dupairs.get(cfgwrapper.getVarByName('a')).forEach(function (pair) {
                dupairTexts_a.push(pair.toString());
            });
            dupairTexts_a.should.containDeep([
                '(1,(2,3))',
                '(1,(2,5))',
                '(1,3)',
                '(3,4)',
                '(1,4)',
                '(1,(5,6))',
                '(1,(5,4))'
            ]);

            /// variable 'b'
            dupairs.get(cfgwrapper.getVarByName('b')).size.should.eql(5);
            dupairs.get(cfgwrapper.getVarByName('b')).forEach(function (pair) {
                dupairTexts_b.push(pair.toString());
            });
            dupairTexts_b.should.containDeep([
                '(1,4)',
                '(1,(5,6))',
                '(1,(5,4))',
                '(1,6)',
                '(6,4)'
            ]);
        });

        it('should find correct Def-Use pairs with switch statement', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a = 1, b = 2, c;' +
                    'switch (a) {' +
                    'case 0: ++a; break;' +
                    'case 1: ++b; break;' +
                    'default: a = b; break;' +
                    '}' +
                    'c = a;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgwrapper.setVars();
            cfgwrapper.initRDs();
            var dupairs = DUA.findDUPairs(cfgwrapper),
                dupairTexts_a = [],
                dupairTexts_b = [];

            dupairs.size.should.eql(2);/// a,b ('c' no used)
            should.exist(dupairs.get(cfgwrapper.getVarByName('a')));
            should.exist(dupairs.get(cfgwrapper.getVarByName('b')));

            /// variable 'a'
            dupairs.get(cfgwrapper.getVarByName('a')).size.should.eql(8);
            dupairs.get(cfgwrapper.getVarByName('a')).forEach(function (pair) {
                dupairTexts_a.push(pair.toString());
            });
            dupairTexts_a.should.containDeep([
                '(1,(2,3))',
                '(1,(2,6))',
                '(1,3)',
                '(3,4)',
                '(1,(6,7))',
                '(1,(6,8))',
                '(9,4)',
                '(1,4)'
            ]);

            /// variable 'b'
            dupairs.get(cfgwrapper.getVarByName('b')).size.should.eql(2);
            dupairs.get(cfgwrapper.getVarByName('b')).forEach(function (pair) {
                dupairTexts_b.push(pair.toString());
            });
            dupairTexts_b.should.containDeep([
                '(1,7)',
                '(1,9)'
            ]);
        });

        it('should find correct Def-Use pairs with while statement', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var a = 1, b = 2, c;' +
                    'while (a < b) {' +
                    '++a;' +
                    '}' +
                    'c = a;'
                )),
                cfgwrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgwrapper.setVars();
            cfgwrapper.initRDs();
            var dupairs = DUA.findDUPairs(cfgwrapper),
                dupairTexts_a = [],
                dupairTexts_b = [];

            dupairs.size.should.eql(2);/// a,b ('c' no used)
            should.exist(dupairs.get(cfgwrapper.getVarByName('a')));
            should.exist(dupairs.get(cfgwrapper.getVarByName('b')));

            /// variable 'a'
            dupairs.get(cfgwrapper.getVarByName('a')).size.should.eql(8);
            dupairs.get(cfgwrapper.getVarByName('a')).forEach(function (pair) {
                dupairTexts_a.push(pair.toString());
            });
            dupairTexts_a.should.containDeep([
                '(1,(2,3))',
                '(1,(2,4))',
                '(3,(2,3))',
                '(3,(2,4))',
                '(1,3)',
                '(1,4)',
                '(3,3)',
                '(3,4)'
            ]);

            /// variable 'b'
            dupairs.get(cfgwrapper.getVarByName('b')).size.should.eql(2);
            dupairs.get(cfgwrapper.getVarByName('b')).forEach(function (pair) {
                dupairTexts_b.push(pair.toString());
            });
            dupairTexts_b.should.containDeep([
                '(1,(2,3))',
                '(1,(2,4))'
            ]);
        });

        it('should find the Def-Use pairs of objects', function () {
            var cfg = cfgext.getCFG(cfgext.parseAST(
                    'var obj = {}, b;' +
                    'obj.a = 1;' +
                    'b = obj.a;'
                )),
                cfgWrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE);
            cfgWrapper.setVars();
            cfgWrapper.initRDs();

            var dupairs = DUA.findDUPairs(cfgWrapper),
                dupairsTexts_obj = [];

            dupairs.size.should.eql(1);
            should.exist(dupairs.get(cfgWrapper.getVarByName('obj')));

            dupairs.get(cfgWrapper.getVarByName('obj')).size.should.eql(1);
            dupairs.get(cfgWrapper.getVarByName('obj')).forEach(function (pair) {
                dupairsTexts_obj.push(pair.toString());
            });
            dupairsTexts_obj.should.containDeep([
                '(2,3)'
            ]);
        });
    });
});