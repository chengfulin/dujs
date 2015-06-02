/**
 * Created by chengfulin on 2015/4/20.
 */
var Scope = require('../../lib/dujs').Scope,
    Var = require('../../lib/dujs').Var,
    Map = require('core-js/es6/map'),
    Set = require('../../lib/analyses').Set,
    varFactory = require('../../lib/dujs').factoryVar,
    FlowNode = require('../../lib/esgraph').FlowNode,
    should = require('should');

describe('Scope', function () {
    "use strict";
    describe('Static Methods', function () {
        describe('isScope', function () {
            it('should return true as the object is a Scope', function () {
                var scope = new Scope('Function', null, 'foo');
                Scope.isScope(scope).should.eql(true);
            });

            it('should return false as the object is not a Scope', function () {
                Scope.isScope().should.eql(false);
                Scope.isScope(null).should.eql(false);
                Scope.isScope({}).should.eql(false);
            });
        });

        describe('isValidParent', function () {
            it('should return true as the parent is a Scope or null', function () {
                var scope = new Scope('Function', null, 'foo');
                Scope.isValidParent(null).should.eql(true);
                Scope.isValidParent(scope).should.eql(true);
            });

            it('should return false as the parent is not a Scope or null', function () {
                Scope.isValidParent({}).should.eql(false);
            });
        });

        describe('isValidScopeType', function () {
            it('should return true as the type value is valid', function () {
                Scope.isValidScopeType('Function').should.eql(true);
                Scope.isValidScopeType('AnonymousFunction').should.eql(true);
                Scope.isValidScopeType('Program').should.eql(true);
                Scope.isValidScopeType('Global').should.eql(true);
            });

            it('should return false as the type value is invalid', function () {
                Scope.isValidScopeType().should.eql(false);
                Scope.isValidScopeType('invalid').should.eql(false);
                Scope.isValidScopeType({}).should.eql(false);
            });
        });

        describe('isValidScopeValue', function () {
            it('should return true as the default value of Program and Global type', function () {
                Scope.isValidScopeValue('!PROGRAM').should.eql(true);
                Scope.isValidScopeValue('!GLOBAL').should.eql(true);
            });

            it('should return true as the value is an number not less than 0', function () {
                Scope.isValidScopeValue(0).should.eql(true);
                Scope.isValidScopeValue(1).should.eql(true);
            });

            it('should return true as the value is a valid identifier', function () {
                Scope.isValidScopeValue('valid').should.eql(true);
                Scope.isValidScopeValue('_valid').should.eql(true);
                Scope.isValidScopeValue('_valid0').should.eql(true);
            });

            it('should return false as the value is an negative number', function () {
                Scope.isValidScopeValue(-1).should.eql(false);
            });

            it('should return false as the value is an invalid identifier', function () {
                Scope.isValidScopeValue('3').should.eql(false);
                Scope.isValidScopeValue('3invalid').should.eql(false);
                Scope.isValidScopeValue('!invalid').should.eql(false);
            });
        });

        describe('validate', function () {
            it('should throw as the type is invalid', function () {
                should(function () {
                    Scope.validate('invalid', null, 'foo');
                }).throw('Invalid type for a Scope');
            });

            it('should throw as the parent is invalid', function () {
                should(function () {
                    Scope.validate('Function', {}, 'foo');
                }).throw('Invalid parent for a Scope');
            });

            it('should throw as the value is invalid', function () {
                should(function () {
                    Scope.validate('Function', null, '0');
                }).throw('Invalid value for a Scope');
            });

            it('should support custom error message', function () {
                should(function () {
                    Scope.validate(null, null, null, 'Custom Error');
                }).throw('Custom Error');
            });
        });

        describe('validateType', function () {
            it('should throw as the object is not a Scope', function () {
                should(function () {
                    Scope.validateType({});
                }).throw('Not a Scope');
            });

            it('should not throw as the object is a Scope', function () {
                should(function () {
                    Scope.validateType(new Scope('Function', null, 'foo'));
                }).not.throw();
            });
        });
    });

    describe('Properties', function () {
        describe('PROGRAM_SCOPE_TYPE', function () {
            it('should have correct value', function () {
                Scope.PROGRAM_SCOPE_TYPE.should.eql('Program');
            });

            it('should not be modified', function () {
                should(function () {
                    Scope.PROGRAM_SCOPE_TYPE = 'new value';
                }).throw();
            });
        });

        describe('GLOBAL_SCOPE_TYPE', function () {
            it('should have correct value', function () {
                Scope.GLOBAL_SCOPE_TYPE.should.eql('Global');
            });

            it('should not be modified', function () {
                should(function () {
                    Scope.GLOBAL_SCOPE_TYPE = 'new value';
                }).throw();
            });
        });

        describe('FUNCTION_SCOPE_TYPE', function () {
            it('should have correct value', function () {
                Scope.FUNCTION_SCOPE_TYPE.should.eql('Function');
            });

            it('should not be modified', function () {
                should(function () {
                    Scope.FUNCTION_SCOPE_TYPE = 'new value';
                }).throw();
            });
        });

        describe('ANONYMOUS_FUNCTION_SCOPE_TYPE', function () {
            it('should have correct value', function () {
                Scope.ANONYMOUS_FUNCTION_SCOPE_TYPE.should.eql('AnonymousFunction');
            });

            it('should not be modified', function () {
                should(function () {
                    Scope.ANONYMOUS_FUNCTION_SCOPE_TYPE = 'new value';
                }).throw();
            });
        });

        describe('PROGRAM_SCOPE_VALUE', function () {
            it('should have correct value', function () {
                Scope.PROGRAM_SCOPE_VALUE.should.eql('!PROGRAM');
            });

            it('should not be modified', function () {
                should(function () {
                    Scope.PROGRAM_SCOPE_VALUE = 'new value';
                }).throw();
            });
        });

        describe('GLOBAL_SCOPE_VALUE', function () {
            it('should have correct value', function () {
                Scope.GLOBAL_SCOPE_VALUE.should.eql('!GLOBAL');
            });

            it('should not be modified', function () {
                should(function () {
                    Scope.GLOBAL_SCOPE_VALUE = 'new value';
                }).throw();
            });
        });

        describe('TYPES', function () {
            it('should contain all types', function () {
                Scope.TYPES.length.should.eql(4);
                Scope.TYPES.indexOf('Function').should.not.eql(-1);
                Scope.TYPES.indexOf('AnonymousFunction').should.not.eql(-1);
                Scope.TYPES.indexOf('Program').should.not.eql(-1);
                Scope.TYPES.indexOf('Global').should.not.eql(-1);
            });
        });
    });

    describe('Methods', function () {
        describe('hasVarWithName', function () {
            var scope,
                variable;
            beforeEach(function () {
                scope = new Scope('Function', null, 'foo');
                variable = varFactory.create('name', scope);
            });

            it('should return false as the argument is not a string', function () {
                scope._testonly_._vars.set('name', variable);
                scope.hasVarWithName({}).should.eql(false);
                scope.hasVarWithName(0).should.eql(false);
            });
        });
    });
});