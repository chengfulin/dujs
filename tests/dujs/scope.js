/*
 * Test cases for Scope module
 * @lastmodifiedBy ChengFuLin(chengulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-29
 */
var should = require('should');
var esprima = require('esprima');
var Scope = require('../../lib/dujs/scope'),
	factoryVar = require('../../lib/dujs/varfactory');

describe('Scope', function () {
	"use strict";
	describe('static data member', function () {
		describe('DOMAIN_SCOPE_NAME', function () {
			it('should have correct value', function () {
				Scope.DOMAIN_SCOPE_NAME.should.eql('!DOMAIN');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.DOMAIN_SCOPE_NAME = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('DOMAIN_SCOPE_NAME').should.eql(true);
			});
		});

		describe('PAGE_SCOPE_NAME', function () {
			it('should have correct value', function () {
				Scope.PAGE_SCOPE_NAME.should.eql('!PAGE');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.PAGE_SCOPE_NAME = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('PAGE_SCOPE_NAME').should.eql(true);
			});
		});

		describe('ANONYMOUS_FUN_NAME', function () {
			it('should have correct value', function () {
				Scope.ANONYMOUS_FUN_NAME.should.eql('!ANONYMOUS_FUN');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.ANONYMOUS_FUN_NAME = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('ANONYMOUS_FUN_NAME').should.eql(true);
			});
		});

		describe('FUNCTION_TYPE', function () {
			it('should have correct value', function () {
				Scope.FUNCTION_TYPE.should.eql('function');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.FUNCTION_TYPE = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('FUNCTION_TYPE').should.eql(true);
			});
		});

		describe('ANONYMOUS_FUN_TYPE', function () {
			it('should have correct value', function () {
				Scope.ANONYMOUS_FUN_TYPE.should.eql('anonymousFunction');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.ANONYMOUS_FUN_TYPE = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('ANONYMOUS_FUN_TYPE').should.eql(true);
			});
		});

		describe('PAGE_TYPE', function () {
			it('should have correct value', function () {
				Scope.PAGE_TYPE.should.eql('page');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.PAGE_TYPE = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('PAGE_TYPE').should.eql(true);
			});
		});

		describe('DOMAIN_TYPE', function () {
			it('should have correct value', function () {
				Scope.DOMAIN_TYPE.should.eql('domain');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.DOMAIN_TYPE = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('DOMAIN_TYPE').should.eql(true);
			});
		});

		describe('TYPES', function () {
			it('should have correct value', function () {
				should(Scope.TYPES instanceof Array).eql(true);
				Scope.TYPES.should.containDeep([
					'domain',
					'page',
					'function',
					'anonymousFunction'
				]);
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.TYPES = [];
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('TYPES').should.eql(true);
			});
		});
	});

	describe('public methods', function () {
		var rootScope, parentScope, childScope, otherScope;
		beforeEach(function () {
			var rootAST = esprima.parse('var ga, gb;');
			var parentAST = esprima.parse('var a, b');
			var childAST = esprima.parse('var ca, cb');
			var otherAST = esprima.parse('var oa, ob');

			rootScope = new Scope(rootAST, '!DOMAIN', 'domain', null);
			parentScope = new Scope(parentAST, '!PAGE', 'page', rootScope);
			childScope = new Scope(childAST, 'foo', 'function', parentScope);
			otherScope = new Scope(otherAST, 'other', 'function', parentScope);
		});

		describe('hasLocalVariable', function () {
			var outerScope, innerScope;

			beforeEach(function () {
				var outerAST = esprima.parse('var ga = 0, gb = 1;' +
					'function foo(a) {' +
					'var b = 1;' +
					'ga = a + b;' +
					'}');
				var innerAST = esprima.parse('function foo(a) {' +
					'var b = 1;' +
					'ga = a + b;' +
					'}');
				outerScope = new Scope(outerAST, '!PAGE', 'page', null);
				innerScope = new Scope(innerAST, 'foo', 'function', outerScope);

				outerScope._testonly_._vars.set('ga', factoryVar.create('ga'));
				outerScope._testonly_._vars.set('gb', factoryVar.create('gb'));
				innerScope._testonly_._vars.set('a', factoryVar.create('a'));
				innerScope._testonly_._vars.set('b', factoryVar.create('b'));
			});

			it('should return true as the variable is a local variables', function () {
				innerScope.hasLocalVariable('a').should.eql(true);
				innerScope.hasLocalVariable('b').should.eql(true);
				outerScope.hasLocalVariable('ga').should.eql(true);
				outerScope.hasLocalVariable('gb').should.eql(true);
			});

			it('should return false as the variable is outside the scope', function () {
				innerScope.hasLocalVariable('ga').should.eql(false);
				innerScope.hasLocalVariable('gb').should.eql(false);
				outerScope.hasLocalVariable('a').should.eql(false);
				outerScope.hasLocalVariable('b').should.eql(false);
			});
		});

		describe('hasVariable', function () {
			beforeEach(function () {
				rootScope._testonly_._vars.set('ga', factoryVar.create('ga'));
				rootScope._testonly_._vars.set('gb', factoryVar.create('gb'));
				parentScope._testonly_._vars.set('a', factoryVar.create('a'));
				parentScope._testonly_._vars.set('b', factoryVar.create('b'));
				childScope._testonly_._vars.set('ca', factoryVar.create('ca'));
				childScope._testonly_._vars.set('cb', factoryVar.create('cb'));
				otherScope._testonly_._vars.set('oa', factoryVar.create('oa'));
				otherScope._testonly_._vars.set('ob', factoryVar.create('ob'));
			});

			it('should return true as the variable is available from the scope to its ascendants', function () {
				childScope.hasVariable('ga').should.eql(true);
				childScope.hasVariable('a').should.eql(true);
				childScope.hasVariable('ca').should.eql(true);
			});

			it('should return false as the variable is not available', function () {
				otherScope.hasVariable('ca').should.eql(false);
			});
		});

		describe('isSiblingOf', function () {
			it('should return true as the two scopes are siblings', function () {
				childScope.isSiblingOf(otherScope).should.eql(true);
			});

			it('should return false otherwise', function () {
				childScope.isSiblingOf(parentScope).should.eql(false);
				childScope.isSiblingOf(rootScope).should.eql(false);
			});
		});

		describe('hasAscendantContainingTheChild', function () {
			it('should return true as the one is a child of another\'s ascendant', function () {
				childScope.hasAscendantContainingTheChild(otherScope).should.eql(true);
				otherScope.hasAscendantContainingTheChild(childScope).should.eql(true);
				otherScope.hasAscendantContainingTheChild(parentScope).should.eql(true);

			});

			it('should return false otherwise', function () {
				var anotherAST = esprima.parse('var aa, ab;');
				var anotherScope = new Scope(anotherAST, 'another', 'function', childScope);

				otherScope.hasAscendantContainingTheChild(rootScope).should.eql(false);
				otherScope.hasAscendantContainingTheChild(anotherScope).should.eql(false);
			});
		});
	});
});