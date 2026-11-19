/*
 * Test cases for Scope module
 * @lastmodifiedBy ChengFuLin(chengulin0806@gmail.com)
 */
var should = require('should');
var jsParser = require('../../lib/dujs/jsparser');
var Scope = require('../../lib/dujs/scope'),
	Range = require('../../lib/dujs/range'),
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
				var parent = new Scope({
					type: 'Program',
					range: [0,1],
					loc: {
						start: {line: 1, column: 0},
						end: {line: 1, column: 1}
					}
				}, '$PAGE_0', 'page', null);
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
				var ast = {
					type: 'FunctionDeclaration',
					range: [0,1],
					loc: {
						start: {line: 1, column: 0},
						end: {line: 1, column: 1}
					}
				};
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
			var rootAST = jsParser.parseAST('var ga, gb;', {range: true, loc: true});
			var parentAST = jsParser.parseAST('var a, b', {range: true, loc: true});
			var childAST = jsParser.parseAST('var ca, cb', {range: true, loc: true});
			var otherAST = jsParser.parseAST('var oa, ob', {range: true, loc: true});

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

		/// feature 006: the name APIs (hasLocalVariable, hasVariable, getLocalVariable,
		/// getVariable, getParamNameWithIndex) were replaced by the Vars registered in each
		/// scope (variables) and found by identity; the assertions keep their meaning
		/**
		 * Whether the Var is registered in the scope or one of its ascendants
		 * @param {Scope} scope
		 * @param {Var} variable
		 * @returns {boolean}
		 */
		function isAvailable(scope, variable) {
			return scope.scopeChain.some(function (current) {
				return current.variables.indexOf(variable) !== -1;
			});
		}

		describe('variables of a scope (was hasLocalVariable)', function () {
			var outerScope, innerScope, ga, gb, a, b;

			beforeEach(function () {
				var outerAST = jsParser.parseAST('var ga = 0, gb = 1;' +
					'function foo(a) {' +
					'var b = 1;' +
					'ga = a + b;' +
					'}', {range: true, loc: true});
				var innerAST = jsParser.parseAST('function foo(a) {' +
					'var b = 1;' +
					'ga = a + b;' +
					'}', {range: true, loc: true});
				outerScope = new Scope(outerAST, '$PAGE', 'page', null);
				innerScope = new Scope(innerAST, 'foo', 'function', outerScope);
				ga = factoryVar.create('ga');
				gb = factoryVar.create('gb');
				a = factoryVar.create('a');
				b = factoryVar.create('b');

				outerScope.addVariable(ga);
				outerScope.addVariable(gb);
				innerScope.addVariable(a);
				innerScope.addVariable(b);
			});

			it('should contain the variables registered in the scope', function () {
				innerScope.variables.indexOf(a).should.not.eql(-1);
				innerScope.variables.indexOf(b).should.not.eql(-1);
				outerScope.variables.indexOf(ga).should.not.eql(-1);
				outerScope.variables.indexOf(gb).should.not.eql(-1);
			});

			it('should not contain the variables outside the scope', function () {
				innerScope.variables.indexOf(ga).should.eql(-1);
				innerScope.variables.indexOf(gb).should.eql(-1);
				outerScope.variables.indexOf(a).should.eql(-1);
				outerScope.variables.indexOf(b).should.eql(-1);
			});

			it('should throw as the registered object is not a Var', function () {
				should(function () {
					innerScope.addVariable({name: 'a'});
				}).throw();
				should(function () {
					innerScope.addVariable(null);
				}).throw();
			});
		});

		describe('variables of the scope chain (was hasVariable)', function () {
			var ga, a, ca;
			beforeEach(function () {
				connectScopes();
				ga = factoryVar.create('ga');
				a = factoryVar.create('a');
				ca = factoryVar.create('ca');
				rootScope.addVariable(ga);
				rootScope.addVariable(factoryVar.create('gb'));
				parentScope.addVariable(a);
				parentScope.addVariable(factoryVar.create('b'));
				childScope.addVariable(ca);
				childScope.addVariable(factoryVar.create('cb'));
				otherScope.addVariable(factoryVar.create('oa'));
				otherScope.addVariable(factoryVar.create('ob'));
			});

			it('should find the variable available from the scope to its ascendants', function () {
				isAvailable(childScope, ga).should.eql(true);
				isAvailable(childScope, a).should.eql(true);
				isAvailable(childScope, ca).should.eql(true);
			});

			it('should not find the variable not available', function () {
				isAvailable(otherScope, ca).should.eql(false);
			});
		});

		describe('a variable of a scope (was getLocalVariable)', function () {
			var ga;
			beforeEach(function () {
				connectScopes();
				ga = factoryVar.create('ga');
				rootScope.addVariable(ga);
			});

			it('should not contain a variable not registered', function () {
				rootScope.variables.indexOf(factoryVar.create('a')).should.eql(-1);
				rootScope.variables.indexOf(factoryVar.create('ga')).should.eql(-1);
			});

			it('should contain the registered variable', function () {
				rootScope.variables.should.have.length(1);
				rootScope.variables[0].should.equal(ga);
			});
		});

		describe('a variable of the scope chain (was getVariable)', function () {
			var ga, a, ca;
			beforeEach(function () {
				connectScopes();
				ga = factoryVar.create('ga');
				a = factoryVar.create('a');
				ca = factoryVar.create('ca');

				rootScope.addVariable(ga);
				parentScope.addVariable(a);
				childScope.addVariable(ca);
			});

			it('should not find a variable not registered', function () {
				isAvailable(rootScope, factoryVar.create('gb')).should.eql(false);
			});

			it('should not find a variable not available', function () {
				isAvailable(parentScope, ca).should.eql(false);
				isAvailable(rootScope, ca).should.eql(false);
			});

			it('should find the available variables', function () {
				isAvailable(childScope, ca).should.eql(true);
				isAvailable(childScope, a).should.eql(true);
				isAvailable(childScope, ga).should.eql(true);
			});
		});

		describe('order of the variables (was getParamNameWithIndex)', function () {
			var p1, p2;
			beforeEach(function () {
				connectScopes();
				p1 = factoryVar.create('p1');
				p2 = factoryVar.create('p2');
				rootScope.addVariable(p1);
				rootScope.addVariable(p2);
			});

			it('should keep the order of registration', function () {
				rootScope.variables[0].should.equal(p1);
				rootScope.variables[1].should.equal(p2);
			});

			it('should have nothing out of the registered ones', function () {
				should.not.exist(rootScope.variables[-1]);
				should.not.exist(rootScope.variables[2]);
			});
		});

		describe('hasChildScope', function () {
			beforeEach(function () {
				connectScopes();
			});

			it('should return true as the scope is one of the children', function () {
				rootScope.hasChildScope(parentScope).should.eql(true);
			});

			it('should return false as the scope is not a child', function () {
				rootScope.hasChildScope(childScope).should.eql(false);
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

			it('should return false as the input is not a Scope', function () {
				childScope.isSiblingOf({name: 'other', type: 'function'}).should.eql(false);
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
				var anotherAST = jsParser.parseAST('var aa, ab;', {range: true, loc: true});
				var anotherScope = new Scope(anotherAST, 'another', 'function', childScope);

				otherScope.hasAscendantContainingTheChild(rootScope).should.eql(false);
				otherScope.hasAscendantContainingTheChild(anotherScope).should.eql(false);
				anotherScope.hasAscendantContainingTheChild(otherScope).should.eql(true);
			});

			it('should return false as the input is not a Scope', function () {
				otherScope.hasAscendantContainingTheChild({type: 'function', name: 'foo', parent: parentScope}).should.eql(false);
				otherScope.hasAscendantContainingTheChild(null).should.eql(false);
			});
		});

		describe('toString', function () {
			beforeEach(connectScopes);

			it('should represent a Scope by its "name" property', function () {
				rootScope.toString().should.eql('$DOMAIN');
				parentScope.toString().should.eql('$DOMAIN.$PAGE');
				childScope.toString().should.eql('$DOMAIN.$PAGE.foo');
				otherScope.toString().should.eql('$DOMAIN.$PAGE.other');
			});
		});

		/// feature 006: addInnerFunctionVariable, addParameter, addLocalVariable and
		/// addGlobalVariable were replaced by addVariable (a Var is registered once, by
		/// its identity) and the binding of the page found through the page scope
		describe('addVariable (was addInnerFunctionVariable, addParameter, addLocalVariable)', function () {
			it('should add a Var as a variable of the scope', function () {
				var inner = factoryVar.create('inner');
				childScope.addVariable(inner);
				childScope._testonly_._variables.length.should.eql(1);
				childScope._testonly_._variables[0].should.equal(inner);
			});

			it('should throw as the name is invalid for a variable', function () {
				should(function () {
					childScope.addVariable(factoryVar.create('!inner'));
				}).throw('Invalid value for a Var');
			});

			it('should ignore as the Var is already registered', function () {
				var inner = factoryVar.create('inner');
				childScope.addVariable(inner);
				childScope.addVariable(inner);
				childScope._testonly_._variables.length.should.eql(1);
			});

			it('should keep two Vars with the same name', function () {
				var outerE = factoryVar.create('e'),
					catchE = factoryVar.create('e');
				childScope.addVariable(outerE);
				childScope.addVariable(catchE);
				childScope.variables.should.have.length(2);
				childScope.variables[0].should.equal(outerE);
				childScope.variables[1].should.equal(catchE);
			});
		});

		describe('getVariablesIncludingBlockScopes', function () {
			it('should return the Vars of the scope and of its descendant block scopes, each once', function () {
				var blockAST = jsParser.parseAST('{ let w; }', {range: true, loc: true}).body[0],
					blockScope = new Scope(blockAST, '$BLOCK_0', 'block', childScope),
					z = factoryVar.create('z'),
					w = factoryVar.create('w'),
					otherW = factoryVar.create('w');
				childScope.addVariable(z);
				blockScope.addVariable(w);
				blockScope.addVariable(otherW);
				otherScope.addVariable(factoryVar.create('o'));
				childScope.getVariablesIncludingBlockScopes().should.eql([z, w, otherW]);
			});
		});

		describe('binding (was addGlobalVariable)', function () {
			var binding = {page: true};

			it('should keep the binding set on a page scope', function () {
				parentScope.binding = binding;
				parentScope.binding.should.equal(binding);
			});

			it('should find the binding of the page scope from a descendant of the page scope', function () {
				childScope._testonly_._parent = parentScope;
				parentScope._testonly_._children.push(childScope);
				parentScope.binding = binding;

				childScope.binding.should.equal(binding);
			});

			it('should have no binding as the scope is not a descendant of a page scope', function () {
				childScope._testonly_._parent = rootScope;
				rootScope._testonly_._children.push(childScope);
				rootScope.binding = binding;

				should.not.exist(childScope.binding);
				should.not.exist(rootScope.binding);
			});
		});
	});

	describe('public data members', function () {
		var sampleProgramAST, sampleFunctionDeclarationAST, scope;
		beforeEach(function () {
			sampleProgramAST = {
				type: 'Program',
					range: [0, 1],
				loc: {
					start: {line: 1, column: 0},
					end: {line: 1, column: 1}
				}
			};

			sampleFunctionDeclarationAST = {
				type: 'FunctionDeclaration',
				range: [0, 1],
				loc: {
					start: {line: 1, column: 0},
					end: {line: 1, column: 1}
				}
			};
			scope = new Scope(sampleFunctionDeclarationAST, 'foo', 'function', null);
		});

		describe('ast', function () {
			it('should retrieve the correct value', function () {
				scope.ast.should.eql(sampleFunctionDeclarationAST);
			});

			it('should not be modified directly', function () {
				should(function () {
					scope.ast = null;
				}).throw();
			});

			it('should be enumerable', function () {
				Scope.prototype.propertyIsEnumerable('ast').should.eql(true);
			});
		});

		describe('range', function () {
			it('should be initialized with ast', function () {
				should.exist(scope.range);
				scope.range._testonly_._start.should.eql(0);
				scope.range._testonly_._end.should.eql(1);
			});

			it('should support to be assigned with Range object', function () {
				var range = new Range(1,2);
				scope.range = range;
				scope._testonly_._range._testonly_._start.should.eql(1);
				scope._testonly_._range._testonly_._end.should.eql(2);
			});

			it('should support to be assigned with 2-elements Array', function () {
				scope.range = [1,2];
				scope._testonly_._range._testonly_._start.should.eql(1);
				scope._testonly_._range._testonly_._end.should.eql(2);
			});

			it('should ignore the assignment as the input is invalid', function () {
				scope.range = {start: 1, end: 2};
				scope._testonly_._range._testonly_._start.should.eql(0);
				scope._testonly_._range._testonly_._end.should.eql(1);
			});

			it('should be null as the ast does not contain range property', function () {
				scope = new Scope(null, '$DOMAIN', 'domain', null);
				should.not.exist(scope.range);
			});

			it('should be enumerable', function () {
				Scope.prototype.propertyIsEnumerable('range').should.eql(true);
			});
		});

		describe('children', function () {
			var child1, child2, child3;
			beforeEach(function () {
				child1 = new Scope(sampleFunctionDeclarationAST, 'child1', 'function');
				child2 = new Scope(sampleFunctionDeclarationAST, 'child2', 'function');
				child3 = new Scope(sampleFunctionDeclarationAST, 'child3', 'function');

				child1._testonly_._parent = scope;
				child2._testonly_._parent = scope;
				child3._testonly_._parent = scope;

				scope._testonly_._children.push(child1);
				scope._testonly_._children.push(child2);
				scope._testonly_._children.push(child3);
			});

			it('should retrieve the children correctly', function () {
				var children = scope.children;
				children.length.should.eql(3);
				children.indexOf(child1).should.eql(0);
				children.indexOf(child2).should.eql(1);
				children.indexOf(child3).should.eql(2);
			});

			it('should not be modified directly', function () {
				should(function () {
					scope.children = [];
				}).throw();
			});
		});

		describe('name', function () {
			var oneScope, parentScope, rootScope;

			beforeEach(function () {
				oneScope = new Scope(jsParser.parseAST('var a;', {range: true, loc: true}), 'one', 'function', null);
				parentScope = new Scope(jsParser.parseAST('var pa;', {range: true, loc: true}), '$PAGE', 'page', null);
				rootScope = new Scope(jsParser.parseAST('var ga;', {range: true, loc: true}), '$DOMAIN', 'domain', null);
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

		describe('parent', function () {
			var ast, scope, parent;
			beforeEach(function () {
				ast = sampleProgramAST;
				scope = new Scope(ast, '$PAGE_0', 'page', null);
				parent = new Scope(null, '$DOMAIN', 'domain', null);
			});

			it('should support to set valid Scope as parent', function () {
				scope.parent = parent;
				should.exist(scope._testonly_._parent);
				scope.parent.should.eql(parent);
			});

			it('should ignore invalid input', function () {
				scope.parent = {type: 'domain', name: '$DOMAIN'};
				should.not.exist(scope._testonly_._parent);
			});
		});

		/// feature 006: vars, params and namedFunctionVars were replaced by variables
		describe('variables (was vars, params and namedFunctionVars)', function () {
			var v1, v2, ast, scope;
			beforeEach(function () {
				ast = sampleProgramAST;
				scope = new Scope(ast, '$PAGE_0', 'page', null);
				v1 = factoryVar.create('v1');
				v2 = factoryVar.create('v2');
				scope.addVariable(v1);
				scope.addVariable(v2);
			});

			it('should retrieve an array of the variables in the order of registration', function () {
				var variables = scope.variables;
				variables.length.should.eql(2);
				variables[0].should.equal(v1);
				variables[1].should.equal(v2);
			});

			it('should not be modified directly', function () {
				should(function () {
					scope.variables = null;
				}).throw();
				scope.variables.push(factoryVar.create('v3'));
				scope.variables.length.should.eql(2);
			});
		});
	});
});
