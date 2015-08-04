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
				Scope.DOMAIN_SCOPE_NAME.should.eql('$DOMAIN');
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
				Scope.PAGE_SCOPE_NAME.should.eql('$PAGE');
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

		describe('ANONYMOUS_FUN_SCOPE_NAME', function () {
			it('should have correct value', function () {
				Scope.ANONYMOUS_FUN_SCOPE_NAME.should.eql('$ANONYMOUS_FUN');
			});

			it('should not be modified directly', function () {
				should(function () {
					Scope.ANONYMOUS_FUN_SCOPE_NAME = 'invalid';
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.propertyIsEnumerable('ANONYMOUS_FUN_SCOPE_NAME').should.eql(true);
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

	describe('static methods', function () {
		describe('isValidParent', function () {
			it('should return true as the parent is a Scope', function () {
				var parent = new Scope({type: 'Program', range: [0,1], loc: {line: 1, col: 0}}, '$PAGE_0', 'page', null);
				Scope.isValidParent(parent).should.eql(true);
			});

			it('should return true as the parent is empty', function () {
				Scope.isValidParent(null).should.eql(true);
			});
		});

		describe('isValidName', function () {
			it('should return true as the name is default for domain scope', function () {
				Scope.isValidName('$DOMAIN').should.eql(true);
			});

			it('should return true as the name is leading with default for page scope', function () {
				Scope.isValidName('$PAGE0').should.eql(true);
			});

			it('should return true as the name is leading with default for anonoymous function scope', function () {
				Scope.isValidName('$ANONYMOUS_FUN1').should.eql(true);
			});

			it('should return true as containing characters and numbers but not leading with numbers', function () {
				Scope.isValidName('abc123').should.eql(true);
				Scope.isValidName('abc123d').should.eql(true);
				Scope.isValidName('abc12d3').should.eql(true);
			});

			it('should return true as containing characters, numbers and underscores', function () {
				Scope.isValidName('_abc123').should.eql(true);
				Scope.isValidName('_abc123d').should.eql(true);
				Scope.isValidName('_abc123').should.eql(true);
				Scope.isValidName('_abc123').should.eql(true);
				Scope.isValidName('abc_123').should.eql(true);
				Scope.isValidName('abc123_').should.eql(true);
			});

			it('should return false as containing other symbols', function () {
				Scope.isValidName('$invalid').should.eql(false);
				Scope.isValidName('!invalid').should.eql(false);
				Scope.isValidName('invalid.').should.eql(false);
			});

			it('should return false as leading with numbers', function () {
				Scope.isValidName('123abc').should.eql(false);
				Scope.isValidName('123').should.eql(false);
			});
		});

		describe('validate', function () {
			it('should throw an error as the scope is not a DomainScope but has no AST', function () {
				should(function () {
					Scope.validate(null, '$PAGE_0', 'page', null);
				}).throw('Invalid value for a Scope');
			});

			it('should not throw error as the scope type is DomainScope and its ast is empty', function () {
				should(function () {
					Scope.validate(null, '$DOMAIN', 'domain', null);
				}).not.throw();
			});

			it('should support custom error message', function () {
				should(function () {
					Scope.validate(null, '$PAGE_0', 'page', null, 'Custom error');
				}).throw('Custom error');
			});
		});

		describe('validateType', function () {
			it('should throw an error as the object is not a Scope', function () {
				should(function () {
					Scope.validateType({type: 'domain', name: '$DOMAIN', parent: null});
				}).throw('Not a Scope');

				should(function () {
					Scope.validateType(null);
				}).throw('Not a Scope');
			});

			it('should support custom error message', function () {
				should(function () {
					Scope.validateType(null, 'null is not a Scope');
				}).throw('null is not a Scope');
			});

			it('should not throw error as the object is a Scope', function () {
				var ast = {type: 'FunctionDeclaration', range: [0,1], loc: {line: 1, col: 0}};
				var scope = new Scope(ast, 'foo', 'function', null);
				should(function () {
					Scope.validateType(scope);
				}).not.throw();
			});
		});
	});

	describe('public methods', function () {
		var rootScope, parentScope, childScope, otherScope;
		beforeEach(function () {
			var rootAST = esprima.parse('var ga, gb;', {range: true, loc: true});
			var parentAST = esprima.parse('var a, b', {range: true, loc: true});
			var childAST = esprima.parse('var ca, cb', {range: true, loc: true});
			var otherAST = esprima.parse('var oa, ob', {range: true, loc: true});

			rootScope = new Scope(rootAST, '$DOMAIN', 'domain', null);
			parentScope = new Scope(parentAST, '$PAGE', 'page', null);
			childScope = new Scope(childAST, 'foo', 'function', null);
			otherScope = new Scope(otherAST, 'other', 'function', null);
		});

		describe('addChild', function () {
			it('should add a Scope as a child', function () {
				rootScope.addChild(parentScope);
				rootScope._testonly_._children.indexOf(parentScope).should.eql(0);
				parentScope._testonly_._parent.should.eql(rootScope);
			});

			it('should ignore as the child is existed', function () {
				rootScope._testonly_._children.push(parentScope);
				parentScope._testonly_._parent = rootScope;

				rootScope.addChild(parentScope);
				rootScope._testonly_._children.length.should.eql(1);
			});

			it('should ignore as the input is not a Scope', function () {
				rootScope.addChild({ast: null, name: '$DOMAIN', type: 'domain', parent: null});
				rootScope._testonly_._children.length.should.eql(0);
			});
		});

		function connectScopes() {
			rootScope._testonly_._children.push(parentScope);
			parentScope._testonly_._children.push(childScope);
			parentScope._testonly_._children.push(otherScope);

			parentScope._testonly_._parent = rootScope;
			childScope._testonly_._parent = parentScope;
			otherScope._testonly_._parent = parentScope;
		}

		describe('hasLocalVariable', function () {
			var outerScope, innerScope;

			beforeEach(function () {
				var outerAST = esprima.parse('var ga = 0, gb = 1;' +
					'function foo(a) {' +
					'var b = 1;' +
					'ga = a + b;' +
					'}', {range: true, loc: true});
				var innerAST = esprima.parse('function foo(a) {' +
					'var b = 1;' +
					'ga = a + b;' +
					'}', {range: true, loc: true});
				outerScope = new Scope(outerAST, '$PAGE', 'page', null);
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

			it('should return false as the input is not a string', function () {
				innerScope.hasLocalVariable({name: 'a'}).should.eql(false);
				innerScope.hasLocalVariable(null).should.eql(false);
			});
		});

		describe('hasVariable', function () {
			beforeEach(function () {
				connectScopes();
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

			it('should return false as the input is not a string', function () {
				rootScope.hasVariable({name: 'ga'}).should.eql(false);
				rootScope.hasVariable(null).should.eql(false);
			});
		});

		describe('getLocalVariable', function () {
			var ga;
			beforeEach(function () {
				connectScopes();
				ga = factoryVar.create('ga');
				rootScope._testonly_._vars.set('ga', ga);
			});

			it('should return null as there is not the variable', function () {
				should.not.exist(rootScope.getLocalVariable('a'));
				should.not.exist(rootScope.getLocalVariable({name: 'ga'}));
				should.not.exist(rootScope.getLocalVariable(null));
			});

			it('should return found variable as there is the variable', function () {
				var variable = rootScope.getLocalVariable('ga');
				should.exist(variable);
				variable.should.eql(ga);
			});
		});

		describe('getVariable', function () {
			var ga, a, ca;
			beforeEach(function () {
				connectScopes();
				ga = factoryVar.create('ga');
				a = factoryVar.create('a');
				ca = factoryVar.create('ca');

				rootScope._testonly_._vars.set('ga', ga);
				parentScope._testonly_._vars.set('a', a);
				childScope._testonly_._vars.set('ca', ca);
			});

			it('should return null as the variable is not existed', function () {
				should.not.exist(rootScope.getVariable('gb'));
			});

			it('should return null as the variable is not available', function () {
				should.not.exist(parentScope.getVariable('ca'));
				should.not.exist(rootScope.getVariable('ca'));
			});

			it('should return available variable', function () {
				var inChild = childScope.getVariable('ca');
				var inParent = childScope.getVariable('a');
				var inRoot = childScope.getVariable('ga');

				should.exist(inChild);
				inChild.should.eql(ca);
				should.exist(inParent);
				inParent.should.eql(a);
				should.exist(inRoot);
				inRoot.should.eql(ga);
			});
		});

		describe('getParamNameWithIndex', function () {
			beforeEach(function () {
				connectScopes();
				rootScope._testonly_._paramNames.push('p1');
				rootScope._testonly_._paramNames.push('p2');
			});

			it('should get the name with valid index', function () {
				rootScope.getParamNameWithIndex(0).should.eql('p1');
				rootScope.getParamNameWithIndex(1).should.eql('p2');
			});

			it('should get null as the index is invalid', function () {
				should.not.exist(rootScope.getParamNameWithIndex(-1));
				should.not.exist(rootScope.getParamNameWithIndex(2));
				should.not.exist(rootScope.getParamNameWithIndex('0'));
			});
		});

		describe('isSiblingOf', function () {
			beforeEach(function () {
				connectScopes();
			});

			it('should return true as the two scopes are siblings', function () {
				childScope.isSiblingOf(otherScope).should.eql(true);
			});

			it('should return false otherwise', function () {
				childScope.isSiblingOf(parentScope).should.eql(false);
				childScope.isSiblingOf(rootScope).should.eql(false);
			});
		});

		describe('hasAscendantContainingTheChild', function () {
			beforeEach(function () {
				connectScopes();
			});

			it('should return true as the one is a child of another\'s ascendant', function () {
				childScope.hasAscendantContainingTheChild(otherScope).should.eql(true);
				otherScope.hasAscendantContainingTheChild(childScope).should.eql(true);
				otherScope.hasAscendantContainingTheChild(parentScope).should.eql(true);

			});

			it('should return false otherwise', function () {
				var anotherAST = esprima.parse('var aa, ab;', {range: true, loc: true});
				var anotherScope = new Scope(anotherAST, 'another', 'function', childScope);

				otherScope.hasAscendantContainingTheChild(rootScope).should.eql(false);
				otherScope.hasAscendantContainingTheChild(anotherScope).should.eql(false);
			});
		});
	});

	describe('public data members', function () {
		describe('name', function () {
			var oneScope, parentScope, rootScope;

			beforeEach(function () {
				oneScope = new Scope(esprima.parse('var a;', {range: true, loc: true}), 'one', 'function', null);
				parentScope = new Scope(esprima.parse('var pa;', {range: true, loc: true}), '$PAGE', 'page', null);
				rootScope = new Scope(esprima.parse('var ga;', {range: true, loc: true}), '$DOMAIN', 'domain', null);
			});

			it('should be same as own name since it has no parent scope', function () {
				oneScope.name.should.eql('one');
			});

			it('should be composed by ascendants\' names', function () {
				oneScope._testonly_._parent = parentScope;
				oneScope.name.should.eql('$PAGE.one');

				parentScope._testonly_._parent = rootScope;
				oneScope.name.should.eql('$DOMAIN.$PAGE.one');
			});
		});
	});
});
