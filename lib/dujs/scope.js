/*
 * Model for JavaScript scope
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-27
 */

var Set = require('../analyses/set'),
	Map = require('core-js/es6/map'),
	walkes = require('walkes'),
	namesapce = require('./namespace'),
	internal = namesapce(),
	cfgValidator = require('./cfgvalidator'),
	VarDef = require('./vardef'),
	varFactory = require('./varfactory');

/**
 * Create scope
 * @param {Object} cfg Control flow graph of this scope
 * @param {String} name Name of current scope
 * @param {String} type Type of current scope
 * @param {Object} [parent] Reference to parent scope
 * @constructor
 * @throws {Object} When the value is invalid
 */
function Scope(cfg, name, type, parent) {
	'use strict';
	Scope.validate(cfg, name, type, parent);
	internal(this)._cfg = cfg;
	internal(this)._name = name;
	internal(this)._type = type;
	internal(this)._parent = parent || null;
	internal(this)._vars = new Map(); /// (name, Var)
	internal(this)._params = new Map(); /// (name, Var)
	internal(this)._paramNames = []; /// [names]
	internal(this)._children = []; /// [Scope]

	var thisScope = this;
	internal(this)._cfg[2].forEach(function (node) {
		node.scope = thisScope;
	});

	/* start-test-block */
	this._testonly_ = internal(this);
	/* end-test-block */
}

/* start-static-data-members */
Object.defineProperties(Scope, {
	/**
	 * Name of the domain scope
	 * @type {String}
	 * @memberof Scope
	 * @constant
	 */
	DOMAIN_SCOPE_NAME: {
		value: '!DOMAIN_SCOPE'
	},
	/**
	 * Leading name of page scope
	 * @type {String}
	 * @memberof Scope
	 * @constant
	 */
	PAGE_SCOPE_NAME: {
		value: '!PAGE_SCOPE'
	},
	/**
	 * Leadin name of anonymous function scope
	 * @type {String}
	 * @memberof Scope
	 * @constant
	 */
	ANONYMOUS_FUN_NAME: {
		value: '!ANONYMOUS_FUN_SCOPE'
	},
	/**
	 * Type of function scope
	 * @type {String}
	 * @memberof Scope
	 * @constant
	 */
	FUNCTION_TYPE: {
		value: 'function'
	},
	/**
	 * Type of anonymous function scope
	 * @type {String}
	 * @memberof Scope
	 * @constant
	 */
	ANONYMOUS_FUN_TYPE: {
		value: 'anonymousFun'
	},
	/**
	 * Type of page scope
	 * @type {String}
	 * @memberof Scope
	 * @constant
	 */
	PAGE_TYPE: {
		value: 'page'
	},
	/**
	 * Type of domain scope
	 * @type {String}
	 * @memberof Scope
	 * @constant
	 */
	DOMAIN_TYPE: {
		value: 'domain'
	},
	/**
	 * Scope types
	 * @type {Object}
	 * @memberof Scope
	 * @constant
	 */
	TYPES: {
		value: [Scope.FUNCTION_TYPE, Scope.ANONYMOUS_FUN_TYPE, Scope.PAGE_TYPE, Scope.DOMAIN_TYPE]
	}
});
/* end-static-data-members */

/* start-static-methods */
/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param {Object} parentScope Parent scope
 * @returns {Boolean} True if the parent scope is valid or empty
 */
Scope.isValidParent = function (parentScope) {
	'use strict';
	return (Scope.isScope(parentScope) || !parentScope);
};

/**
 * Check the object is a Scope or not
 * @param {Object} obj An object to be checked
 * @returns {Boolean} True if the obj is a Scope object, false otherwise
 */
Scope.isScope = function (obj) {
	'use strict';
	return obj instanceof Scope;
};

/**
 * Check the scope name is valid or not
 * @param {String} name Name of the scope
 * @returns {Boolean} True if it's valid, false otherwise
 */
Scope.isValidName = function (name) {
	'use strict';
	var normalFunctionNameForamt = /^[_a-zA-Z][_a-zA-Z0-9]*$/i;
	return (typeof name === 'string') && ((name === Scope.DOMAIN_SCOPE_NAME) ||
		(name.indexOf(Scope.PAGE_SCOPE_NAME) === 0) ||
		(name.indexOf(Scope.ANONYMOUS_FUN_SCOPE_NAME) === 0) ||
		normalFunctionNameForamt.test(name));
};

/**
 * Check if the type is a valid scope type
 * @param {String} type Type to be checked
 * @returns {Boolean} True if the type is valid, false otherwise
 */
Scope.isValidType = function (type) {
	'use strict';
	return Scope.TYPES.indexOf(type) !== -1;
};

/**
 * Validate the initial value of the Scope is valid or not
 * @param {Object} cfg A control flow graph
 * @param {String} name Name of the scope
 * @param {String} type Type of the scope
 * @param {Object} parent Parent scope
 * @param {String} [msg] Custom error message
 * @throws {Object} When a value is invalid
 */
Scope.validate = function (cfg, name, type, parent, msg) {
	'use strict';
	if (!cfgValidator.isValidCFG(cfg) || Scope.isValidName(name) || Scope.isValidType(type) || !Scope.isValidParent(parent)) {
		throw new Error(msg || 'Invalid value for a Scope');
	}
};

/**
 * Validate the object is a Scope or not
 * @param {Object} obj An object to be validated
 * @param {String} [msg] Custom error message
 * @throws {Object} When the object is not a Scope
 */
Scope.validateType = function (obj, msg) {
	'use strict';
	if (!Scope.isScope(obj)) {
		throw new Error(msg || 'Not a Scope');
	}
};
/* end-static-methods */

/* start-public-methods */
/**
 * Check if the variable is declared in this scope with the same name
 * @param {String} name Name of the finding variable
 * @returns {Boolean} True if it's found, false otherwise
 */
Scope.prototype.hasLocalVariable = function (name) {
	'use strict';
	if (typeof name === 'string') {
		return internal(this)._vars.has(name);
	}
	return false;
};

/**
 * Check the variable is available in current scope
 * @param {String} name Name of the finding variable
 * @returns {Boolean} True if it's found, false otherwise
 */
Scope.prototype.hasVariable = function (name) {
	'use strict';
	var found = false;
	if (typeof name === 'string') {
		var current = this;
		while (!!current) {
			if (current.hasLocalVariable(name)) {
				found = true;
				break;
			} else {
				current = internal(current)._parent;
			}
		}
	}
	return found;
};

/**
 * Get the local variable with its name
 * @param {String} name Name of the finding variable
 * @returns {Object|Null} Returns found variable or null value
 */
Scope.prototype.getLocalVariable = function (name) {
	'use strict';
	var foundVar = null;
	if (typeof name === 'string') {
		foundVar = internal(this)._vars.get(name);
	}
	return foundVar;
};

/**
 * Get available variable with its name (recursive to parent scopes)
 * @param {String} name Name of the finding variable
 * @returns {Object|Null} Found variable, or null value
 */
Scope.prototype.getVariable = function (name) {
	'use strict';
	var foundVar = null;
	if (typeof name === 'string') {
		var current = this;
		while (!!current) {
			if (current.hasLocalVariable(name)) {
				foundVar = internal(current)._vars.get(name);
			} else {
				current = internal(current)._parent;
			}
		}
	}
	return foundVar;
};

/**
 * Add initial variables and their definitions into this scope
 * @param {Object} initials Set or array of VarDefs
 */
Scope.prototype.setInitVarDefs = function (initials) {
	'use strict';
	if (initials instanceof Array || initials instanceof Set) {
		var thisScopeWrapper = this,
			varDefs = new Set();
		initials.forEach(function (elem) {
			if (VarDef.isVarDef(elem)) {
				internal(thisScopeWrapper)._vars.set(elem.variable.name, elem.variable);
				varDefs.add(elem);
			}
		});
		if (varDefs.size > 0) {
			if (!internal(thisScopeWrapper)._cfg[0].generate) {
				internal(thisScopeWrapper)._cfg[0].generate = varDefs;
			} else {
				var originSet = internal(thisScopeWrapper)._cfg[0].generate;
				varDefs.forEach(function (varDef) {
					originSet.add(varDef);
				});
				internal(thisScopeWrapper)._cfg[0].generate = originSet;
			}
		}
	}
};

/**
 * Set the variables declared in this scope
 */
Scope.prototype.setVars = function () {
	'use strict';
	if (!!internal(this)._cfg) {
		var thisScope = this;
		internal(this)._cfg[2].forEach(function (cfgNode) {
			walkes(cfgNode.astNode, {
				FunctionDeclaration: function () {
					/// do not recursively down to inner scopes
				},
				VariableDeclaration: function (node, recurse) {
					node.declarations.forEach(function (declarator) {
						recurse(declarator);
					});
				},
				VariableDeclarator: function (node) {
					var declaredVar = varFactory.create(node.id.name);
					internal(thisScope)._vars.set(node.id.name, declaredVar);
				}
			});
		});
	}
};

/**
 * Set parameters with known definitions
 * @param {Object} params Array or set of parameters
 */
Scope.prototype.setParams = function (params) {
	'use strict';
	if (params instanceof Array || params instanceof Set) {/// if the parameters are valid
		var thisScope = this;
		this.setInitVarDefs(params);
		params.forEach(function (elem) {
			if (VarDef.isVarDef(elem)) {
				internal(thisScope)._params.set(elem.variable.name, elem.variable);
				internal(thisScope)._paramNames.push(elem.variable.name);
			}
		});
	}
};

/**
 * Get param name with parameter index
 * @param {Number} index Index of finding parameter
 * @returns {String|Undefined} If found, returns the parameter's name, otherwise undefined
 */
Scope.prototype.getParamNameWithIndex = function (index) {
	'use strict';
	if (typeof index === 'number' && (index >= 0 && index < internal(this)._paramNames.length)) {
		return internal(this)._paramNames[index];
	}
};

/**
 * Add a child to this Scope
 * @param {Object} child Child scope
 */
Scope.prototype.addChild = function (child) {
	'use strict';
	if (Scope.isScope(child) && internal(this)._children.indexOf(child) === -1) {
		internal(this)._children.push(child);
		child.parent = this;
	}
};

/**
 * Recursively find possible definitions of a variable
 * @param {Object} variable Variable to find
 * @param {Object} node A CFG node
 * @returns {Object|Null} Available reach definitions, Null otherwise
 */
Scope.prototype.getAvailDefsByVariable = function (variable, node) {
	"use strict";
	function matchReachInByVariable(reachIns, variable) {
		var def = null;
		reachIns.forEach(function (vardef) {
			if (vardef.variable === variable) {
				def = def || new Set();
				def.add(vardef.definition);
			}
		});
		return def;
	}

	var defs = null;
	if (internal(this)._cfg[2].indexOf(node) !== -1) {
		var reachIns = node.reachIns || new Set(),
			ascendant = internal(this)._parent;
		defs = matchReachInByVariable(reachIns, variable);
		while (!defs && !!ascendant) {
			reachIns = ascendant.cfg[1].reachIns;
			defs = matchReachInByVariable(reachIns, variable);
			ascendant = ascendant.parent;
		}
	}
	return defs;
};

/**
 * Get available reach definitions from ascendants
 * @returns {Object|Null} Available reach definitions if found, null otherwise
 */
Scope.prototype.getAvailReachDefinitionsFromAscendants = function () {
	"use strict";
	var reachDefinitions = null,
		ascendant = internal(this)._parent;
	while (!!ascendant) {
		if (!reachDefinitions) {
			reachDefinitions = new Set();
		}
		if (!ascendant.lastReachIns) {
			reachDefinitions = Set.union(reachDefinitions, ascendant.lastReachIns);
		}
		ascendant = ascendant.parent;
	}
	return reachDefinitions;
};

/**
 * Get available variables in this scope
 * @returns {Object|Null} Map of available variables or null value
 */
Scope.prototype.getAvailVariables = function () {
	"use strict";
	var availVariables = null;
	var currentScope = this;

	while (!!currentScope) {
		if (!availVariables) {
			availVariables = new Map();
		}
		var varIter = currentScope.vars.entries();
		for (var iter = varIter.next(); !iter.done; iter = varIter.next()) {
			availVariables.set(iter.value[0], iter.value[1]);
		}
		currentScope = currentScope.parent;
	}
	return availVariables;
};

/**
 * Remove unavailable reach definitions from inputs
 * @param {Object} rds Reach definitions to be modified
 * @returns {Object|Null} Removed reach definitions
 */
Scope.prototype.spliceUnavailableReachDefinitionsFromSet = function (rds) {
	"use strict";
	var unavailableRDs = null;
	if (rds instanceof Set) {
		var availableVars = this.getAvailVariables();
		rds.forEach(function (vardef) {
			if (availableVars.get(vardef.variable.name) !== vardef.variable) {
				if (!unavailableRDs) {
					unavailableRDs = new Set();
				}
				unavailableRDs.add(vardef);
			}
		});
		if (!!unavailableRDs) {
			rds = Set.minus(rds, unavailableRDs);
		}
	}
	return unavailableRDs;
};

/**
 * Check the scope has the same parent as this scope ro not
 * @param {Object} comparedScope Scope to be compared
 * @returns {Boolean} True if it's the same, false otherwise
 */
Scope.prototype.hasParentScopeSameAs = function (comparedScope) {
	"use strict";
	if (comparedScope instanceof Scope) {
		return internal(this)._parent === comparedScope.parent;
	}
	return false;
};

/**
 * Check is the scope is a child of ascendant
 * @param {Object} comparedScope Scope to be compared
 * @returns {Boolean} True if there is the child from an ascendant, false otherwise
 */
Scope.prototype.hasAscendantContainTheChild = function (comparedScope) {
	"use strict";
	var ascendant = internal(this)._parent,
		found = false;

	function matchScopeFromAscendantChildren(children, scope) {
		if (children instanceof Map && scope instanceof Scope) {
			children.forEach(function (val) {
				if (val === scope) {
					found = true;
				}
			});
		}
	}

	if (comparedScope instanceof Scope) {
		while (!!ascendant) {
			matchScopeFromAscendantChildren(ascendant.children, comparedScope);
			if (found) {
				break;
			}
			ascendant = ascendant.parent;
		}
	}
	return found;
};

/**
 * Represent the Scope as string
 * @returns {String} Contain its name and the entry point
 */
Scope.prototype.toString = function () {
	'use strict';
	return internal(this)._name + ' @ ' + internal(this)._cfg[0];
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(Scope.prototype, {
	/**
	 * Array of child scopes
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	children: {
		get: function () {
			'use strict';
			return [].concat(internal(this)._children);
		}
	},
	/**
	 * CFG of the scope
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	cfg: {
		get: function () {
			'use strict';
			return [].concat(internal(this)._cfg);
		}
	},
	/**
	 * Parent scope
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	parent: {
		get: function () {
			'use strict';
			return internal(this)._parent;
		},
		set: function (parent) {
			"use strict";
			if (Scope.isValidParent(parent)) {
				internal(this)._parent = parent;
			}
		}
	},
	/**
	 * Map of local variables
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	vars: {
		get: function () {
			'use strict';
			var map = new Map();
			internal(this)._vars.forEach(function (val, key) {
				map.set(key, val);
			});
			return map;
		}
	},
	/**
	 * Map of parameters
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	params: {
		get: function () {
			'use strict';
			var map = new Map();
			internal(this)._params.forEach(function (val, key) {
				map.set(key, val);
			});
			return map;
		}
	},
	/**
	 * Set of reach definitions
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	lastReachIns: {
		get: function () {
			"use strict";
			if (!!internal(this)._lastReachIns) {
				return new Set(internal(this)._lastReachIns);
			}
			return null;
		},
		set: function (reachIns) {
			"use strict";
			if (reachIns instanceof Set && reachIns.values().every(VarDef.isVarDef)) {
				internal(this)._lastReachIns = new Set(reachIns);
			}
		}
	}
});
/* end-public-methods */

module.exports = Scope;
