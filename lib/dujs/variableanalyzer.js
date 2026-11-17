/*
 * VariableAnalyzer module, analyzing local variables in a scope
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var walkes = require('walkes');
var Scope = require('./scope'),
	scopeBinding = require('./scopebinding'),
	bindingPattern = require('./bindingpattern');

/**
 * VariableAnalyzer
 * @constructor
 */
function VariableAnalyzer() {
}

/* start-private-methods */
/**
 * Get the AST walked for the variables of a scope: the Program of a page, the
 * body of a function; none for the domain
 * @param {Scope} scope
 * @returns {Object|null}
 * @private
 */
function walkedASTOf(scope) {
	"use strict";
	if (scope.type === Scope.DOMAIN_TYPE) {
		return null;
	}
	return (scope.type === Scope.PAGE_TYPE) ? scope.ast : scope.ast.body;
}

/**
 * Get the page scope of a scope
 * @param {Scope} scope
 * @returns {Scope|null}
 * @private
 */
function pageScopeOf(scope) {
	"use strict";
	var current = scope;
	while (!!current && current.type !== Scope.PAGE_TYPE) {
		current = current.parent;
	}
	return current;
}

/**
 * Identifier nodes bound by a binding target or pattern
 * @param {Object} pattern
 * @returns {Array} Identifier nodes
 * @private
 */
function boundIdentifiersOf(pattern) {
	"use strict";
	return bindingPattern.getTargets(pattern).filter(function (target) {
		return target.type === 'Identifier';
	});
}

/**
 * Registrar of the Vars of a page to their owner dujs scopes (feature 006
 * research R4, R5)
 * @param {PageBinding} binding
 * @param {Scope} pageScope
 * @returns {Object} {declared(identifier, [includeInner]), assigned(identifier)}
 * @private
 */
function registrarOf(binding, pageScope) {
	"use strict";
	function ownerOf(aVar) {
		var variable = (!!aVar.binding) ? aVar.binding.variable : null;
		return (!!variable) ? binding.ownerScopeOf(variable.scope) : pageScope;
	}
	return {
		/// the Vars declared by a declaring identifier; the inner Var of a class
		/// declaration is registered with the remaining Vars
		declared: function (identifier) {
			binding.declaredVarsOf(identifier).forEach(function (aVar) {
				if (aVar.binding.variable.scope.type !== 'class') {
					ownerOf(aVar).addVariable(aVar);
				}
			});
		},
		/// the global Var of an unresolved name assigned without declaration
		assigned: function (identifier) {
			binding.defVarsOf(identifier).forEach(function (aVar) {
				if (!!aVar.binding && aVar.binding.kind === scopeBinding.KINDS.IMPLICIT_GLOBAL) {
					pageScope.addVariable(aVar);
				}
			});
		}
	};
}

/**
 * Register the Vars of the functions declared in a scope (not in nested
 * functions nor class members)
 * @param {Scope} scope
 * @param {Object} registrar
 * @private
 */
function setInnerFunctionVariables(scope, registrar) {
	"use strict";
	walkes(walkedASTOf(scope), {
		/// functions declared inside a nested function belong to that function
		FunctionExpression: function () {},
		ArrowFunctionExpression: function () {},
		ClassBody: function () {}, /// methods, fields and static blocks are separate scopes
		FunctionDeclaration: function (node) {
			if (!!node.id) { /// export default function () {} has no name
				registrar.declared(node.id);
			}
		}
	});
}

/**
 * Register the Vars of the parameters of a function scope
 * @param {Scope} scope
 * @param {Object} registrar
 * @private
 */
function setParameters(scope, registrar) {
	"use strict";
	if (scope.type === Scope.FUNCTION_TYPE || scope.type === Scope.ANONYMOUS_FUN_TYPE) {
		scope.ast.params.forEach(function (param) { /// identifiers, defaults, rest and patterns
			boundIdentifiersOf(param).forEach(registrar.declared);
		});
	}
}
/* end-private-methods */

/* start-public-methods */
/**
 * Set local variables of a scope: the Vars are found by the identity of the
 * declaring identifiers through the binding of the page (feature 006) and
 * registered to their owner scopes, in the order of the walk: built-in
 * objects, declared functions, parameters, then the body (classes, imports,
 * variable declarations, assignments without declaration)
 * @param {Scope} scope A scope object
 */
VariableAnalyzer.prototype.setLocalVariables = function (scope) {
	"use strict";
	Scope.validateType(scope, 'Try to analyze variables with non-Scope object');
	scope.setBuiltInObjectVariables();
	var binding = scope.binding;
	if (!binding) { /// the domain scope has only built-in objects
		return;
	}
	var registrar = registrarOf(binding, pageScopeOf(scope));
	setInnerFunctionVariables(scope, registrar);
	setParameters(scope, registrar);

	walkes(walkedASTOf(scope), {
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
		ArrowFunctionExpression: function () {},
		ClassBody: function () {}, /// methods and fields are separate scopes
		ClassDeclaration: function (node) {
			if (!!node.id) { /// export default class {} has no name
				registrar.declared(node.id);
			}
		},
		ImportDeclaration: function (node) {
			node.specifiers.forEach(function (specifier) {
				registrar.declared(specifier.local);
			});
		},
		VariableDeclaration: function (node) {
			node.declarations.forEach(function (declarator) {
				boundIdentifiersOf(declarator.id).forEach(registrar.declared);
			});
		},
		AssignmentExpression: function (node) {
			boundIdentifiersOf(node.left).forEach(registrar.assigned);
		}
	});
};
/* end-public-methods */

var analyzer = new VariableAnalyzer();
module.exports = analyzer;