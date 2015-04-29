/**
 * Created by chengfulin on 2015/4/16.
 */
var Def = require('../../lib/dujs').Def,
    Range = require('../../lib/dujs').Range,
    Scope = require('../../lib/dujs').Scope,
    should = require('should');

describe('Def', function () {
    'use strict';
    describe('constructor', function () {
        it('should construct well', function () {
            var valid = new Def(0, 'object', new Range(0, 1), new Scope('fun'));
            valid.getFromCFGNode().should.eql(0);
            valid.getType().should.eql('object');
            valid.getRange().toString().should.eql('[0,1]');
            valid.getScope().toString().should.eql('Function["fun"]');

            (function () {
                var invalid = new Def(-1, 'object', new Range(0, 1), new Scope('fun'));
            }).should.throw('Invalid Def value (from node or type)');
            (function () {
                var invalid = new Def(0, 'invalid', new Range(0, 1), new Scope('fun'));
            }).should.throw('Invalid Def value (from node or type)');
            (function () {
                var invalid = new Def(0, 'object', [1, 0], new Scope('fun'));
            }).should.throw('Invalid Def value (range)');
            (function () {
                var invalid = new Def(0, 'object', new Range(0, 1), 'Program');
            }).should.throw('Invalid Def value (scope)');
        });
    });

    describe('static constants', function () {
        it('should have correct constants', function () {
            Def.OBJECT_TYPE.should.eql('object');
            Def.FUNCTION_TYPE.should.eql('function');
            Def.LITERAL_TYPE.should.eql('literal');
            Def.UNDEFINED_TYPE.should.eql('undefined');

            /// cannot modified
            (function () {
                Def.OBJECT_TYPE = 'non-object';
            }).should.throw();
            (function () {
                Def.FUNCTION_TYPE = 'non-function';
            }).should.throw();
            (function () {
                Def.LITERAL_TYPE = 'non-literal';
            }).should.throw();
            (function () {
                Def.UNDEFINED_TYPE = 'non-undefined';
            }).should.throw();
        });
    });

    describe('methods', function () {
        describe('validate', function () {
            it('should validate node and type', function () {
                (function () {
                    var invalid = new Def(-1, 'object', new Range(0, 1), new Scope('fun'));
                }).should.throw('Invalid Def value (from node or type)');
                (function () {
                    var invalid = new Def(0, 'not-a-type', new Range(0, 1), new Scope('fun'));
                }).should.throw('Invalid Def value (from node or type)');
                (function () {
                    var invalid = new Def(0, 'invalid', new Range(0, 1), new Scope('fun'));
                }).should.throw('Invalid Def value (from node or type)');

                (function () {
                    var valid = new Def(0, 'object', new Range(0, 1), new Scope('fun'));
                }).should.not.throw();
                (function () {
                    var valid = new Def(1, 'object', new Range(0, 1), new Scope('fun'));
                }).should.not.throw();
                (function () {
                    var valid = new Def(1, 'literal', new Range(0, 1), new Scope('fun'));
                }).should.not.throw();
                (function () {
                    var valid = new Def(1, 'function', new Range(0, 1), new Scope('fun'));
                }).should.not.throw();
                (function () {
                    var valid = new Def(1, 'undefined', new Range(0, 1), new Scope('fun'));
                }).should.not.throw();
            });
        });

        describe('validateType', function () {
            it('should validate type well', function () {
                (function () {
                    Def.validateType();
                }).should.throw('Not a Def');
                (function () {
                    Def.validateType({});
                }).should.throw('Not a Def');
                (function () {
                    Def.validateType(new Def(0, 'object', [0,1], Scope.PROGRAM_SCOPE));
                }).should.not.throw();
            });
        });

        describe('toString', function () {
            it('should convert to string correctly', function () {
                var aDef = new Def(0, 'object', [0, 1], Scope.PROGRAM_SCOPE),
                    another = new Def(1, 'literal', [1, 10], new Scope('foo'));
                aDef.toString().should.eql('Def@n0@[0,1]_Program');
                another.toString().should.eql('Def@n1@[1,10]_Function["foo"]');
            });
        });
    });
});