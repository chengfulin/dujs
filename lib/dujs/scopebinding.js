/*
 * Binding of a page (feature 006, contracts/scope-binding-api.md): the
 * declarations of the page and the resolution of its identifiers come from
 * eslint-scope, analyzed once per page; each identifier node is mapped by its
 * identity to the dujs Vars it uses or defines. This is the only module of
 * lib requiring eslint-scope.
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * Names are compared only in the functions marked with @nameLookup
 * (contracts/static-check.md section 2): globalVariableOf and
 * isExcludedGlobalName (D3), builtInVariableOf (FIXED_LIST) and isShadowed
 * (FR-013).
 */
var eslintScope = require('eslint-scope'),
	espree = require('espree');
var jsParser = require('./jsparser'),
	bindingPattern = require('./bindingpattern'),
	Var = require('./var');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * Kinds of Vars and of their declarations (data-model section 2)
 * @type {Object}
 */
var KINDS = Object.freeze({
	VAR: 'var',
	LET: 'let',
	CONST: 'const',
	FUNCTION: 'function',
	CLASS: 'class',
	PARAMETER: 'parameter',
	CATCH_PARAMETER: 'catchParameter',
	IMPORT: 'import',
	NAMED_EXPRESSION_NAME: 'namedExpressionName',
	GLOBAL: 'global',
	IMPLICIT_GLOBAL: 'implicitGlobal',
	BUILT_IN: 'builtIn'
});

/**
 * Kinds of bindings a call in a function may be relaxed to (feature 005 D2,
 * FR-005, research R8)
 * @type {Array}
 */
var RELAXED_CALLEE_KINDS = [KINDS.FUNCTION, KINDS.LET, KINDS.CONST, KINDS.NAMED_EXPRESSION_NAME];

/**
 * Unresolved names which are not variables (D3)
 * @type {Array}
 */
var EXCLUDED_GLOBAL_NAMES = ['undefined', 'NaN', 'Infinity', 'arguments'];

/**
 * Types of eslint-scope scopes inside the region of a dujs scope, i.e. not
 * crossing a function (research R6 (b))
 * @type {Array}
 */
var REGION_SCOPE_TYPES = ['block', 'for', 'switch', 'catch', 'with', 'class'];

/**
 * Types of eslint-scope scopes owning a dujs block scope when their node
 * declares lexical bindings
 * @type {Array}
 */
var BLOCK_SCOPE_TYPES = ['block', 'for', 'switch'];

/**
 * Built-in object Vars of a dujs page or domain scope, created once from its
 * builtInObjects descriptors: (Scope, [Var])
 * @type {WeakMap}
 */
var builtInVarsOfScope = new WeakMap();

/* start-private-methods */
/**
 * Get the built-in object Vars of a dujs scope (page or domain), in the order
 * of its builtInObjects descriptors; created once per scope
 * @param {Scope} scope
 * @returns {Array} Vars
 * @private
 */
function builtInVariablesOf(scope) {
	'use strict';
	if (!scope) {
		return [];
	}
	if (!builtInVarsOfScope.has(scope)) {
		builtInVarsOfScope.set(scope, (scope.builtInObjects || []).map(function (descriptor) {
			return new Var(descriptor.name);
		}));
	}
	return builtInVarsOfScope.get(scope).slice();
}

/**
 * Collect the Identifier nodes written without declaration: by assignment
 * expressions (= and compound operators, destructuring assignments), by ++
 * and --, and as the left side of for-in and for-of (research R9, F4)
 * @param {Object} ast
 * @returns {Set} Identifier nodes
 * @private
 */
function collectAssignmentTargets(ast) {
	'use strict';
	var targets = new Set(),
		stack = [ast];
	function pushChild(child) {
		if (!!child && typeof child.type === 'string') {
			stack.push(child);
		}
	}
	function addTargetsOf(pattern) {
		bindingPattern.getTargets(pattern).forEach(function (target) {
			if (target.type === 'Identifier') {
				targets.add(target);
			}
		});
	}
	while (stack.length > 0) {
		var node = stack.pop();
		if (node.type === 'AssignmentExpression') {
			addTargetsOf(node.left);
		} else if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
			targets.add(node.argument);
		} else if ((node.type === 'ForInStatement' || node.type === 'ForOfStatement') &&
			node.left.type !== 'VariableDeclaration') {
			addTargetsOf(node.left);
		}
		(espree.VisitorKeys[node.type] || []).forEach(function (key) {
			[].concat(node[key]).forEach(pushChild);
		});
	}
	return targets;
}

/**
 * Kind of an eslint-scope Definition (data-model section 2); using and await
 * using are taken as const
 * @param {Object} definition
 * @returns {string}
 * @private
 */
function kindOfDefinition(definition) {
	'use strict';
	switch (definition.type) {
		case 'Variable':
			if (definition.parent.kind === KINDS.VAR || definition.parent.kind === KINDS.LET) {
				return definition.parent.kind;
			}
			return KINDS.CONST;
		case 'FunctionName':
			return (definition.node.type === 'FunctionDeclaration') ? KINDS.FUNCTION : KINDS.NAMED_EXPRESSION_NAME;
		case 'ClassName':
			return (definition.node.type === 'ClassDeclaration') ? KINDS.CLASS : KINDS.NAMED_EXPRESSION_NAME;
		case 'Parameter':
			return KINDS.PARAMETER;
		case 'CatchClause':
			return KINDS.CATCH_PARAMETER;
		case 'ImportBinding':
			return KINDS.IMPORT;
		default:
			return KINDS.IMPLICIT_GLOBAL;
	}
}

/**
 * Binding information of a Var of a declared eslint-scope Variable: all its
 * declarations, and the kind function if one of them is a function
 * declaration, otherwise the kind of the first declaration (F9 (4))
 * @param {Object} variable eslint-scope Variable with definitions
 * @returns {Object} {variable, kind, declarations}
 * @private
 */
function bindingInfoOf(variable) {
	'use strict';
	var declarations = variable.defs.map(function (definition) {
		return Object.freeze({
			kind: kindOfDefinition(definition),
			node: definition.node,
			identifier: definition.name
		});
	});
	var isFunction = declarations.some(function (declaration) {
		return declaration.kind === KINDS.FUNCTION;
	});
	return Object.freeze({
		variable: variable,
		kind: isFunction ? KINDS.FUNCTION : declarations[0].kind,
		declarations: Object.freeze(declarations)
	});
}

/**
 * Binding information of a Var without declaration
 * @param {string} kind
 * @returns {Object} {variable, kind, declarations}
 * @private
 */
function undeclaredBindingInfo(kind) {
	'use strict';
	return Object.freeze({variable: null, kind: kind, declarations: Object.freeze([])});
}

/**
 * Whether an eslint-scope scope is a scope of the whole page
 * @param {Object} scope
 * @returns {boolean}
 * @private
 */
function isPageLevelScope(scope) {
	'use strict';
	return scope.type === 'global' || scope.type === 'module';
}

/**
 * Text of the range of an AST node for error messages
 * @param {Object} node
 * @returns {string}
 * @private
 */
function rangeText(node) {
	'use strict';
	return (!!node && !!node.range) ? '[' + node.range[0] + ', ' + node.range[1] + ']' : '(no range)';
}

/**
 * Get the Vars of a Reference: its resolved Variable, or for an unresolved
 * name nothing (excluded names), the built-in object Var or the global Var of
 * the page (data-model section 5)
 * @param {PageBinding} binding
 * @param {Object} reference eslint-scope Reference
 * @returns {Array} Vars
 * @private
 */
function varsOfReference(binding, reference) {
	'use strict';
	var found = null;
	if (!!reference.resolved) {
		found = binding.variableVar(reference.resolved);
	} else {
		var identifierName = reference.identifier.name;
		if (!binding.isExcludedGlobalName(identifierName)) {
			found = binding.builtInVariableOf(identifierName) || binding.globalVariableOf(identifierName);
		}
	}
	return (!!found) ? [found] : [];
}

/**
 * Whether a built-in object Var is one of the page scope (not the domain)
 * @param {Object} self internal of the binding
 * @param {Var} builtIn
 * @returns {boolean}
 * @private
 */
function isPageBuiltIn(self, builtIn) {
	'use strict';
	return builtInVariablesOf(self._pageScope).indexOf(builtIn) !== -1;
}

/**
 * Get the dujs scope owning the Vars of an eslint-scope scope (research R4)
 * @param {Object} self internal of the binding
 * @param {Object} scope eslint-scope scope
 * @param {Map} functionScopeOf (function node, dujs scope)
 * @param {Map} memberScopeOf (field value or static block, dujs synthetic function scope)
 * @returns {Scope|null}
 * @private
 */
function ownerOfEslintScope(self, scope, functionScopeOf, memberScopeOf) {
	'use strict';
	switch (scope.type) {
		case 'global':
		case 'module':
			return self._pageScope;
		case 'function':
		case 'function-expression-name':
			return functionScopeOf.get(scope.block) || null;
		case 'class-field-initializer':
		case 'class-static-block':
			return memberScopeOf.get(scope.block) || null;
		case 'block':
		case 'for':
		case 'switch':
			return scope.block.dujsBlockScope || self._ownerOf.get(scope.upper) || null;
		case 'class':
		case 'catch':
		case 'with':
			return self._ownerOf.get(scope.upper) || null;
		default:
			return null;
	}
}

/**
 * Whether the dujs owner of an eslint-scope scope is the dujs scope of the
 * same code (so that the eslint scope is the eslint scope of the dujs scope)
 * @param {Object} scope eslint-scope scope
 * @returns {boolean}
 * @private
 */
function isOwnScopeOfOwner(scope) {
	'use strict';
	if (BLOCK_SCOPE_TYPES.indexOf(scope.type) !== -1) {
		return !!scope.block.dujsBlockScope;
	}
	return ['global', 'module', 'function', 'class-field-initializer', 'class-static-block'].indexOf(scope.type) !== -1;
}

/**
 * Get the eslint-scope scope declaring a Var: the scope of its Variable; the
 * page-level scope for a global or a built-in object of the page; null for a
 * built-in object of the domain (visible from all pages); undefined for a
 * global or a built-in object of another page
 * @param {PageBinding} binding
 * @param {Var} aVar
 * @returns {Object|null|undefined}
 * @private
 */
function declaringScopeOf(binding, aVar) {
	'use strict';
	var self = internal(binding);
	if (!!aVar.binding && !!aVar.binding.variable) {
		return aVar.binding.variable.scope;
	}
	if (builtInVariablesOf(self._domainScope).indexOf(aVar) !== -1) {
		return null;
	}
	var isOfThisPage = isPageBuiltIn(self, aVar) || self._globalVars.has(aVar);
	/// a global of another page is not declared in any scope of this page
	return isOfThisPage ? self._eslintScopeOf.get(self._pageScope) : undefined;
}

/**
 * Research R6 (a): the declaring scope of the Var is on the eslint scope
 * chain of the dujs scope, and no scope of the chain inside it declares the
 * same name
 * @param {PageBinding} binding
 * @param {Var} aVar
 * @param {Scope} dujsScope
 * @returns {boolean}
 * @private
 */
function isUnshadowedFrom(binding, aVar, dujsScope) {
	'use strict';
	var declaring = declaringScopeOf(binding, aVar),
		scope = binding.eslintScopeOf(dujsScope);
	if (declaring === undefined) {
		return false;
	}
	while (!!scope && scope !== declaring) {
		if (binding.isShadowed(aVar, scope)) {
			return false;
		}
		scope = scope.upper;
	}
	return scope === declaring;
}

/**
 * Research R6 (b): Vars referenced in the region of a dujs scope (its eslint
 * scope and the child scopes not crossing a function), computed once
 * @param {PageBinding} binding
 * @param {Scope} dujsScope
 * @returns {Set} Vars
 * @private
 */
function directVarsOf(binding, dujsScope) {
	'use strict';
	var self = internal(binding);
	if (!self._directVarsCache.has(dujsScope)) {
		var collected = new Set(),
			stack = [binding.eslintScopeOf(dujsScope)];
		while (stack.length > 0) {
			var scope = stack.pop();
			scope.references.forEach(function (reference) {
				varsOfReference(binding, reference).forEach(function (aVar) {
					collected.add(aVar);
				});
			});
			scope.childScopes.forEach(function (child) {
				if (REGION_SCOPE_TYPES.indexOf(child.type) !== -1) {
					stack.push(child);
				}
			});
		}
		self._directVarsCache.set(dujsScope, collected);
	}
	return self._directVarsCache.get(dujsScope);
}

/**
 * Research R6 (c), Q1: the dujs scope where the Var is defined is the dujs
 * scope or one of its ancestors
 * @param {PageBinding} binding
 * @param {Var} aVar
 * @param {Scope} dujsScope
 * @returns {boolean}
 * @private
 */
function isDefinedAround(binding, aVar, dujsScope) {
	'use strict';
	var defining = binding.definingScopeOf(aVar);
	for (var scope = dujsScope; !!defining && !!scope; scope = scope.parent) {
		if (scope === defining) {
			return true;
		}
	}
	return false;
}

/**
 * All dujs scopes of the scope tree of a binding (function, page and block scopes)
 * @param {Object} self internal of the binding
 * @returns {Array}
 * @private
 */
function dujsScopesOf(self) {
	'use strict';
	return self._scopeTree.scopes.concat(self._scopeTree.blockScopes);
}

/**
 * Check data-model section 1: each declared Variable has one Var, and each
 * registered Var with a Variable is the Var of that Variable
 * @param {PageBinding} binding
 * @param {Map} registeredIn (Var, dujs Scope)
 * @throws {Error} When a rule is broken
 * @private
 */
function validateOneToOne(binding, registeredIn) {
	'use strict';
	var self = internal(binding);
	registeredIn.forEach(function (scope, aVar) {
		var variable = (!!aVar.binding) ? aVar.binding.variable : null;
		if (!!variable && self._varOf.get(variable) !== aVar) {
			throw new Error('scopebinding: the Var ' + aVar.name + ' in ' + scope.name +
				' is not the Var of its eslint-scope Variable');
		}
	});
	self._scopeManager.scopes.forEach(function (scope) {
		scope.variables.forEach(function (variable) {
			if (variable.defs.length > 0 && !registeredIn.has(self._varOf.get(variable))) {
				throw new Error('scopebinding: the Variable ' + variable.name + ' at ' +
					rangeText(variable.defs[0].name) + ' has no registered Var');
			}
		});
	});
}

/**
 * Get the global Vars of the page (D3), all created, in the source order of
 * the first unresolved reference of each name (research R5); names excluded
 * by W2 and built-in objects have none
 * @param {PageBinding} binding
 * @returns {Array} Vars
 * @private
 */
function orderedGlobalVars(binding) {
	'use strict';
	var self = internal(binding),
		found = [];
	self._unresolvedReferences.slice().sort(function (first, second) {
		return first.identifier.range[0] - second.identifier.range[0];
	}).forEach(function (reference) {
		varsOfReference(binding, reference).forEach(function (aVar) {
			if (self._globalVars.has(aVar) && found.indexOf(aVar) === -1) {
				found.push(aVar);
			}
		});
	});
	return found;
}
/* end-private-methods */

/**
 * Binding of a page: analyze the AST by eslint-scope (research R1) and build
 * the identity tables of references and declaring identifiers (research R3)
 * @param {Object} ast AST of the page (espree, with range and loc)
 * @constructor
 */
function PageBinding(ast) {
	'use strict';
	var options = Object.freeze({
		ecmaVersion: jsParser.ECMA_VERSION,
		sourceType: ast.sourceType || 'script',
		optimistic: true,
		childVisitorKeys: espree.VisitorKeys
	});
	var self = internal(this);
	self._options = options;
	self._scopeManager = eslintScope.analyze(ast, Object.assign({}, options));
	self._referenceOf = new Map(); /// (Identifier, Reference)
	self._declaredBy = new Map(); /// (Identifier, [Variable])
	self._unresolvedReferences = []; /// [Reference] in the order of the scopes
	self._varOf = new Map(); /// (Variable, Var)
	self._ownerOf = new Map(); /// (eslint scope, dujs Scope)
	self._eslintScopeOf = new Map(); /// (dujs Scope, eslint scope)
	self._globalsByName = new Map(); /// (name, Var), only in globalVariableOf
	self._assignedGlobalNames = null; /// Set of names, only in globalVariableOf
	self._globalVars = new Set(); /// global Vars of the page (by identity)
	self._assignmentTargets = collectAssignmentTargets(ast);
	self._definingScopeOf = new Map(); /// (Var, dujs Scope)
	self._visibleCache = new Map(); /// (dujs Scope, Map(Var, boolean))
	self._directVarsCache = new Map(); /// (dujs Scope, Set(Var))
	self._scopeTree = null;
	self._pageScope = null;
	self._domainScope = null;

	self._scopeManager.scopes.forEach(function (scope) {
		scope.references.forEach(function (reference) {
			if (!self._referenceOf.has(reference.identifier)) {
				self._referenceOf.set(reference.identifier, reference);
			}
			if (!reference.resolved) {
				self._unresolvedReferences.push(reference);
			}
		});
		scope.variables.forEach(function (variable) {
			variable.defs.forEach(function (definition) {
				var declaringIdentifier = definition.name,
					declared = self._declaredBy.get(declaringIdentifier) || [];
				if (declared.indexOf(variable) === -1) {
					declared.push(variable);
				}
				self._declaredBy.set(declaringIdentifier, declared);
			});
		});
	});

	/* start-test-block */
	this._testonly_ = self;
	/* end-test-block */
}

/* start-public-methods */
/**
 * Map the eslint-scope scopes to the dujs scopes of the scope tree built from
 * the same AST (research R4), and attach this binding to the tree
 * (non-enumerable scopeTree.binding); the built-in object Vars of the page and
 * of its domain (the parent of the page scope, if any) get their bindings
 * @param {ScopeTree} scopeTree
 * @throws {Error} When an eslint-scope scope or a dujs scope has no counterpart
 */
PageBinding.prototype.attach = function (scopeTree) {
	'use strict';
	var self = internal(this),
		binding = this;
	self._scopeTree = scopeTree;
	self._pageScope = scopeTree.root;
	self._domainScope = scopeTree.root.parent || null;
	var functionScopeOf = new Map(),
		memberScopeOf = new Map();
	scopeTree.scopes.forEach(function (scope) {
		if (scope === self._pageScope) {
			return;
		}
		var member = scope.ast.dujsClassMember;
		if (!!member) {
			memberScopeOf.set((member.type === 'StaticBlock') ? member : member.value, scope);
		} else {
			functionScopeOf.set(scope.ast, scope);
		}
	});
	self._scopeManager.scopes.forEach(function (scope) {
		var owner = ownerOfEslintScope(self, scope, functionScopeOf, memberScopeOf);
		if (!owner) {
			throw new Error('scopebinding: no dujs scope for the eslint-scope ' + scope.type + ' scope at ' +
				rangeText(scope.block));
		}
		self._ownerOf.set(scope, owner);
		if (isOwnScopeOfOwner(scope)) {
			self._eslintScopeOf.set(owner, scope);
		}
	});
	dujsScopesOf(self).forEach(function (scope) {
		if (!self._eslintScopeOf.has(scope)) {
			throw new Error('scopebinding: no eslint-scope scope for the dujs scope ' + scope.name);
		}
	});
	Object.defineProperty(scopeTree, 'binding', {value: binding, configurable: true});
	self._pageScope.binding = binding;
	[self._pageScope, self._domainScope].forEach(function (scope) {
		builtInVariablesOf(scope).forEach(function (builtIn) {
			binding.builtInVariableOf(builtIn.name);
		});
	});
};

/**
 * Get the Var of an eslint-scope Variable with declarations, created once; a
 * page-level declaration with a fixed-list name is the built-in object Var
 * (except localStorage, a Var of the domain; research R9, F9)
 * @param {Object} variable eslint-scope Variable
 * @returns {Var|null} null for a Variable without declarations (arguments)
 */
PageBinding.prototype.variableVar = function (variable) {
	'use strict';
	var self = internal(this);
	if (!variable || variable.defs.length === 0) {
		return null;
	}
	if (!self._varOf.has(variable)) {
		var builtIn = isPageLevelScope(variable.scope) ? this.builtInVariableOf(variable.name) : null;
		self._varOf.set(variable, (!!builtIn && isPageBuiltIn(self, builtIn)) ?
			builtIn : new Var(variable.name, bindingInfoOf(variable)));
	}
	return self._varOf.get(variable);
};

/**
 * Get the Vars used by an identifier: only by its Reference, without falling
 * back to the declarations (F5)
 * @param {Object} identifier Identifier node
 * @returns {Array} Vars (at most one)
 */
PageBinding.prototype.useVarsOf = function (identifier) {
	'use strict';
	var reference = internal(this)._referenceOf.get(identifier);
	return (!!reference) ? varsOfReference(this, reference) : [];
};

/**
 * Get the only Var used by an identifier
 * @param {Object} identifier Identifier node
 * @returns {Var|null}
 */
PageBinding.prototype.useVarOf = function (identifier) {
	'use strict';
	return this.useVarsOf(identifier)[0] || null;
};

/**
 * Get the Vars defined by an identifier: by its Reference (a write, or the
 * read of G in G.p = v) first, otherwise by the Variables it declares (the
 * outer and the inner Var for a class declaration id)
 * @param {Object} identifier Identifier node
 * @returns {Array} Vars
 */
PageBinding.prototype.defVarsOf = function (identifier) {
	'use strict';
	var self = internal(this);
	var reference = self._referenceOf.get(identifier);
	if (!!reference) {
		return varsOfReference(this, reference);
	}
	return this.declaredVarsOf(identifier);
};

/**
 * Get the Vars of the Variables declared by a declaring identifier
 * (Definition.name), whether or not it is also a reference: the outer and the
 * inner Var for a class declaration id; used to register the declared Vars
 * (research R5)
 * @param {Object} identifier Identifier node
 * @returns {Array} Vars
 */
PageBinding.prototype.declaredVarsOf = function (identifier) {
	'use strict';
	var binding = this,
		found = [];
	(internal(this)._declaredBy.get(identifier) || []).forEach(function (variable) {
		var aVar = binding.variableVar(variable);
		if (!!aVar && found.indexOf(aVar) === -1) {
			found.push(aVar);
		}
	});
	return found;
};

/**
 * Get the global Var of the page with the name of an unresolved reference
 * (D3), created once: kind implicitGlobal when the name is written somewhere
 * on the page (assignment, ++/--, left of for-in/for-of), otherwise global
 * (only read); the callers exclude the names of section W2 and the built-in
 * objects
 * @nameLookup D3
 * @param {string} name
 * @returns {Var}
 */
PageBinding.prototype.globalVariableOf = function (name) {
	'use strict';
	var self = internal(this);
	if (self._globalsByName.has(name)) {
		return self._globalsByName.get(name);
	}
	if (self._assignedGlobalNames === null) {
		self._assignedGlobalNames = new Set();
		self._unresolvedReferences.forEach(function (reference) {
			if (self._assignmentTargets.has(reference.identifier)) {
				self._assignedGlobalNames.add(reference.identifier.name);
			}
		});
	}
	var created = new Var(name, undeclaredBindingInfo(self._assignedGlobalNames.has(name) ?
		KINDS.IMPLICIT_GLOBAL : KINDS.GLOBAL));
	self._globalsByName.set(name, created);
	self._globalVars.add(created);
	return created;
};

/**
 * Whether an unresolved name is not a variable (D3): undefined, NaN, Infinity
 * and arguments
 * @nameLookup D3
 * @param {string} name
 * @returns {boolean}
 */
PageBinding.prototype.isExcludedGlobalName = function (name) {
	'use strict';
	return EXCLUDED_GLOBAL_NAMES.indexOf(name) !== -1;
};

/**
 * Get the built-in object Var with the name, of the page scope or else of the
 * domain scope; it is bound on first access: to the page-level Variable with
 * the same name for a fixed-list object declared on the page (F9), otherwise
 * as a built-in object without declarations
 * @nameLookup FIXED_LIST
 * @param {string} name
 * @returns {Var|null}
 */
PageBinding.prototype.builtInVariableOf = function (name) {
	'use strict';
	var self = internal(this);
	function named(aVar) {
		return aVar.name === name;
	}
	var onPage = builtInVariablesOf(self._pageScope).filter(named)[0] || null,
		found = onPage || builtInVariablesOf(self._domainScope).filter(named)[0] || null;
	if (!!found && found.binding === null) {
		var pageLevelScope = self._eslintScopeOf.get(self._pageScope),
			declared = (!!onPage && !!pageLevelScope) ? pageLevelScope.set.get(name) : null;
		Var.setBinding(found, (!!declared && declared.defs.length > 0) ?
			bindingInfoOf(declared) : undeclaredBindingInfo(KINDS.BUILT_IN));
	}
	return found;
};

/**
 * Whether a scope of the eslint scope chain declares another variable with
 * the name of the Var (research R6 (a), U2)
 * @nameLookup FR-013
 * @param {Var|Object} variableOrVar Var or eslint-scope Variable
 * @param {Object} scope eslint-scope scope
 * @returns {boolean}
 */
PageBinding.prototype.isShadowed = function (variableOrVar, scope) {
	'use strict';
	var own = variableOrVar;
	if (Var.isVar(variableOrVar)) {
		own = (!!variableOrVar.binding) ? variableOrVar.binding.variable : null;
	}
	var declared = scope.set.get(variableOrVar.name);
	return !!declared && declared !== own;
};

/**
 * Whether a Var is visible in a dujs scope (research R6): (a) not shadowed on
 * the eslint scope chain, (b) referenced in the region of the scope or (c)
 * defined in the scope or an ancestor; cached for each dujs scope
 * @param {Var} aVar
 * @param {Scope} dujsScope
 * @returns {boolean}
 */
PageBinding.prototype.isVisible = function (aVar, dujsScope) {
	'use strict';
	var self = internal(this);
	if (!self._visibleCache.has(dujsScope)) {
		self._visibleCache.set(dujsScope, new Map());
	}
	var cache = self._visibleCache.get(dujsScope);
	if (!cache.has(aVar)) {
		cache.set(aVar, isUnshadowedFrom(this, aVar, dujsScope) ||
			directVarsOf(this, dujsScope).has(aVar) ||
			isDefinedAround(this, aVar, dujsScope));
	}
	return cache.get(aVar);
};

/**
 * Whether a call in a function may be relaxed to a Var without a definition
 * reaching it (feature 005 D2, FR-005, research R8): the kind of its binding
 * is function (also declared in a block), let, const or the name of a named
 * expression; whether the definition is a function is checked by the caller
 * @param {Var} aVar
 * @returns {boolean}
 */
PageBinding.prototype.isRelaxedCallee = function (aVar) {
	'use strict';
	return !!aVar && !!aVar.binding && RELAXED_CALLEE_KINDS.indexOf(aVar.binding.kind) !== -1;
};

/**
 * Get the dujs scope where a Var declared in an eslint scope without its own
 * dujs scope is defined (research R6 (c), Q1): the scope of the class node
 * (inner class name), of the catch clause (catch parameter), of the
 * expression (function expression name) or the owner (declarations in a
 * block without a dujs block scope)
 * @param {Var} aVar
 * @returns {Scope|null} null for the other Vars
 */
PageBinding.prototype.definingScopeOf = function (aVar) {
	'use strict';
	var self = internal(this);
	if (!self._definingScopeOf.has(aVar)) {
		var variable = (!!aVar.binding) ? aVar.binding.variable : null,
			declaring = (!!variable) ? variable.scope : null,
			defining = null;
		if (!!declaring && declaring.type === 'function-expression-name') {
			defining = self._ownerOf.get(declaring.upper) || null;
		} else if (!!declaring && !isOwnScopeOfOwner(declaring)) {
			defining = self._ownerOf.get(declaring) || null;
		}
		self._definingScopeOf.set(aVar, defining);
	}
	return self._definingScopeOf.get(aVar);
};

/**
 * Get the Vars of a class declaration (outer and inner) for a Var of either;
 * [aVar] for other Vars (research R7)
 * @param {Var} aVar
 * @returns {Array} Vars
 */
PageBinding.prototype.classBindingGroupOf = function (aVar) {
	'use strict';
	var variable = (!!aVar.binding) ? aVar.binding.variable : null;
	if (!!variable && variable.defs[0].type === 'ClassName' && variable.defs[0].node.type === 'ClassDeclaration') {
		var group = this.defVarsOf(variable.defs[0].name);
		if (group.length === 2 && group.indexOf(aVar) !== -1) {
			return group;
		}
	}
	return [aVar];
};

/**
 * Register to their owner dujs scopes (research R4, R5) the Vars of the
 * declared Variables not registered by the variable analysis, in the order of
 * the eslint-scope scopes (catch parameters, function expression names, inner
 * class names); then register to the page scope, in source order, the
 * implicit globals not registered yet (written only by ++/--, the left of
 * for-in/for-of, or in parameter defaults and class members), then the
 * globals only read (US3); then check data-model section 1. Needs the
 * identity storage of Scope (variables, addVariable)
 * @throws {Error} When a Var is registered twice or a Variable has no registered Var
 */
PageBinding.prototype.registerRemainingVariables = function () {
	'use strict';
	var self = internal(this),
		binding = this,
		registeredIn = new Map(); /// (Var, dujs Scope)
	dujsScopesOf(self).forEach(function (scope) {
		scope.variables.forEach(function (aVar) {
			if (registeredIn.has(aVar) && registeredIn.get(aVar) !== scope) {
				throw new Error('scopebinding: the Var ' + aVar.name + ' is registered in ' +
					registeredIn.get(aVar).name + ' and ' + scope.name);
			}
			registeredIn.set(aVar, scope);
		});
	});
	self._scopeManager.scopes.forEach(function (scope) {
		scope.variables.forEach(function (variable) {
			var aVar = binding.variableVar(variable);
			if (!!aVar && !registeredIn.has(aVar)) {
				self._ownerOf.get(scope).addVariable(aVar);
				registeredIn.set(aVar, self._ownerOf.get(scope));
			}
			if (!!aVar) {
				binding.definingScopeOf(aVar);
			}
		});
	});
	var globals = orderedGlobalVars(this);
	[KINDS.IMPLICIT_GLOBAL, KINDS.GLOBAL].forEach(function (kind) {
		globals.forEach(function (aVar) {
			if (aVar.binding.kind === kind && !registeredIn.has(aVar)) {
				self._pageScope.addVariable(aVar);
				registeredIn.set(aVar, self._pageScope);
			}
		});
	});
	validateOneToOne(this, registeredIn);
};

/**
 * Get the global Vars of kind global (only read, D3), in the source order of
 * their first references (research R5)
 * @returns {Array} Vars
 */
PageBinding.prototype.globalVars = function () {
	'use strict';
	return orderedGlobalVars(this).filter(function (aVar) {
		return aVar.binding.kind === KINDS.GLOBAL;
	});
};

/**
 * Get the localStorage Var of the domain
 * @returns {Var|null} null when the page scope is not in a domain
 */
PageBinding.prototype.localStorageVar = function () {
	'use strict';
	return this.builtInVariableOf('localStorage');
};

/**
 * Get the declarations of a Var
 * @param {Var} aVar
 * @returns {Array} [{kind, node, identifier}]
 */
PageBinding.prototype.declarationsOf = function (aVar) {
	'use strict';
	return (!!aVar.binding) ? aVar.binding.declarations : [];
};

/**
 * Get the dujs scope owning the Vars of an eslint-scope scope (research R4)
 * @param {Object} scope eslint-scope scope
 * @returns {Scope|null}
 */
PageBinding.prototype.ownerScopeOf = function (scope) {
	'use strict';
	return internal(this)._ownerOf.get(scope) || null;
};

/**
 * Get the dujs scope owning a Var: the owner of the eslint-scope scope
 * declaring its Variable; null for a Var without Variable (global, built-in)
 * @param {Var} aVar
 * @returns {Scope|null}
 */
PageBinding.prototype.ownerScopeOfVar = function (aVar) {
	'use strict';
	var variable = (!!aVar.binding) ? aVar.binding.variable : null;
	return (!!variable) ? this.ownerScopeOf(variable.scope) : null;
};

/**
 * Get the eslint-scope scope of a dujs scope (the module scope for the page
 * scope of a module)
 * @param {Scope} dujsScope
 * @returns {Object|null}
 */
PageBinding.prototype.eslintScopeOf = function (dujsScope) {
	'use strict';
	return internal(this)._eslintScopeOf.get(dujsScope) || null;
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(PageBinding.prototype, {
	/**
	 * eslint-scope ScopeManager of the page
	 * @type {Object}
	 * @memberof PageBinding.prototype
	 */
	scopeManager: {
		get: function () {
			'use strict';
			return internal(this)._scopeManager;
		}
	},
	/**
	 * Options given to eslint-scope (research R1)
	 * @type {Object}
	 * @memberof PageBinding.prototype
	 */
	options: {
		get: function () {
			'use strict';
			return internal(this)._options;
		}
	},
	/**
	 * Scope tree the binding is attached to
	 * @type {ScopeTree|null}
	 * @memberof PageBinding.prototype
	 */
	scopeTree: {
		get: function () {
			'use strict';
			return internal(this)._scopeTree;
		}
	}
});
/* end-public-data-members */

/**
 * Analyze the AST of a page; call it before building the scope tree of the
 * AST, then attach the binding to the tree
 * @param {Object} ast
 * @returns {PageBinding}
 */
function analyze(ast) {
	'use strict';
	return new PageBinding(ast);
}

module.exports = {
	analyze: analyze,
	builtInVariablesOf: builtInVariablesOf,
	KINDS: KINDS,
	PageBinding: PageBinding
};
