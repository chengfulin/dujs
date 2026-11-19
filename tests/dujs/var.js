/**
 * Test cases for Var
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var Var = require('../../lib/dujs/var'),
    should = require('should');

describe('Var', function () {
    'use strict';
	var MockVar;
	MockVar = function (name) {
		Var.call(this, name);
	};
	MockVar.prototype = Object.create(Var.prototype);
	Object.defineProperty(MockVar.prototype, 'constructor', {
		value: MockVar
	});

    describe('static methods', function () {
	    describe('isVar', function () {
		    it('should return true as the object is a Var', function () {
				var obj = new MockVar('obj');
			    Var.isVar(obj).should.eql(true);
		    });

		    it('should return false as the object is not a Var', function () {
			    Var.isVar({name: 'obj'}).should.eql(false);
		    });

		    it('should return false as the object is not existed', function () {
			    Var.isVar(null).should.eql(false);
			    Var.isVar().should.eql(false);
		    });
	    });

	    describe('isValidName', function () {
		    it('should return true as the input has numbers, characters and underscores', function () {
			    Var.isValidName('abc').should.eql(true);
			    Var.isValidName('abc123').should.eql(true);
			    Var.isValidName('ab123c').should.eql(true);
			    Var.isValidName('abc123_').should.eql(true);
			    Var.isValidName('abc_123').should.eql(true);
		    });

		    it('should return true as the input has numbers and characters then leading with underscore', function () {
			    Var.isValidName('_abc').should.eql(true);
			    Var.isValidName('_abc123').should.eql(true);
			    Var.isValidName('_123abc').should.eql(true);
			    Var.isValidName('_ab123c').should.eql(true);
		    });

		    it('should return false as the input leading with numbers', function () {
			    Var.isValidName('123abc').should.eql(false);
			    Var.isValidName('123456').should.eql(false);
			    Var.isValidName('123_abc').should.eql(false);
			    Var.isValidName('123456_').should.eql(false);
		    });

		    it('should return false as the input has invalid symbols', function () {
			    Var.isValidName('!invalid').should.eql(false);
			    Var.isValidName('NO.1').should.eql(false);
			    Var.isValidName('time02:10').should.eql(false);
		    });

		    /// feature 006 U1: a Var name is an ES IdentifierName ($ and non-ASCII
		    /// letters are valid; '$doolars' moved here from the invalid symbols)
		    it('should return true as the input is an IdentifierName with $ or non-ASCII characters', function () {
			    Var.isValidName('$').should.eql(true);
			    Var.isValidName('$doolars').should.eql(true);
			    Var.isValidName('\u00e9t\u00e9').should.eql(true);
			    Var.isValidName('a\u200Cb').should.eql(true);
			    Var.isValidName('$ANONYMOUS_FUN_0').should.eql(true);
		    });

		    it('should return false as the input is not an IdentifierName', function () {
			    Var.isValidName('1a').should.eql(false);
			    Var.isValidName('a-b').should.eql(false);
			    Var.isValidName('').should.eql(false);
			    Var.isValidName(null).should.eql(false);
		    });
	    });

	    describe('validate', function () {
		    it('should not throw any error as the input name is valid', function () {
			    should(function () {
				    Var.validate('valid');
			    }).not.throw();
		    });

		    it('should throw an error "Invalid value for a Var" as the input name is invalid', function () {
			    should(function () {
				    Var.validate('!invalid');
			    }).throw('Invalid value for a Var');
		    });

		    it('should support to throw custom error', function () {
			    should(function () {
				    Var.validate('!invalid', 'Custom Error');
			    }).throw('Custom Error');
		    });
	    });

	    describe('validateType', function () {
		    it('should not throw any error as the input object is a Var', function () {
			    should(function () {
				    Var.validateType(new MockVar('name'));
			    }).not.throw();
		    });

		    it('should throw an error "Not a Var" as the input object is not a Var', function () {
			    should(function () {
				    Var.validateType({name: 'name'});
			    }).throw('Not a Var');
		    });

		    it('should support to throw custom error', function () {
			    should(function () {
				    Var.validateType({name: 'name'}, 'Custom Error');
			    }).throw('Custom Error');
		    });
	    });
    });

	describe('public methods', function () {
		describe('toString', function () {
			it('should represent a variable with its name only', function () {
				var var1 = new MockVar('var1');
				var1.toString().should.eql('var1');
			});
		});

		describe('toJSON', function () {
			it('should convert to JSON with name property', function () {
				var variable = new MockVar('variable');
				JSON.stringify(variable.toJSON()).should.eql('{"name":"variable"}');
			});
		});
	});

	describe('public data members', function () {
		describe('name', function () {
			it('should support to retrieve the value', function () {
				var aVar = new MockVar('aVar');
				aVar.name.should.eql('aVar');
			});

			it('should not support to modify value', function () {
				var var123 = new MockVar('var123');
				should(function () {
					var123.name = 'a123';
				}).throw();
			});

			it('should be enumerable', function () {
				Var.prototype.propertyIsEnumerable('name').should.eql(true);
			});
		});

		/// feature 006 data-model section 2: read-only binding {variable, kind, declarations}
		describe('binding', function () {
			it('should be null when the Var is created without a binding', function () {
				should(new Var('a').binding).be.null();
			});

			it('should support to retrieve the binding given to the constructor', function () {
				var info = {variable: null, kind: 'implicitGlobal', declarations: []};
				var aVar = new Var('a', info);
				aVar.binding.kind.should.eql('implicitGlobal');
				should(aVar.binding.variable).be.null();
				aVar.binding.declarations.should.eql([]);
			});

			it('should not support to modify the binding', function () {
				var aVar = new Var('a', {variable: null, kind: 'var', declarations: []});
				should(function () {
					aVar.binding = null;
				}).throw();
				aVar.binding.kind.should.eql('var');
			});

			it('should be set only once by setBinding', function () {
				var aVar = new Var('a');
				Var.setBinding(aVar, {variable: null, kind: 'builtIn', declarations: []});
				aVar.binding.kind.should.eql('builtIn');
				should(function () {
					Var.setBinding(aVar, {variable: null, kind: 'var', declarations: []});
				}).throw(/already has a binding/);
			});

			it('should not be enumerable', function () {
				Var.prototype.propertyIsEnumerable('binding').should.eql(false);
			});
		});
	});
});