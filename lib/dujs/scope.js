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
	Def = require('./def'),
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
	internal(this)._children = new Map(); /// (Range text, Scope)
	internal(this)._def = null;

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
	var normalFunctionNameForamt = /^[_a-zA-Z]{1}[_a-zA-Z0-9]*$/i;
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
 * @returns {Object|Undefined} Returns found variable or undefined value
 */
Scope.prototype.getLocalVariable = function (name) {
	'use strict';
	var foundVar;
	if (typeof name === 'string') {
		foundVar = internal(this)._vars.get(name);
	}
	return foundVar;
};

/**
 * Get available variable with its name (recursive to parent scopes)
 * @param {String} name Name of the finding variable
 * @returns {Object|Undefined} Found variable, or undefined value
 */
Scope.prototype.getVariable = function (name) {
	'use strict';
	var foundVar;
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
				},
				VariableDeclaration: function (node, recurse) {
					node.declarations.forEach(function (declarator) {
						recurse(declarator);
					});
				},
				VariableDeclarator: function (node) {
					var declaredVar = varFactory.create(
						node.id.name,
						node.id.range,
						internal(thisScope)._name,
						null
					);
					internal(thisScope)._vars.set(
						node.id.name,
						declaredVar
					);
				}
			});
		});
	}
};

/**
 * Set parameters from an array or set of Vars
 * @param params
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
 * @throws {Object} When child is not a Scope
 */
Scope.prototype.addChild = function (child) {
	'use strict';
	if (Scope.isScope(child) && Range.isRange(child.range) && !internal(this)._children.has(child.range.toString())) {/// if the parameter is valid, do
		if (child.scope.type === Scope.FUNCTION_TYPE) {
			internal(this)._children.set(child.range.toString(), child);
			child.parent = this;
		} else if (child.scope.type === Scope.ANONYMOUS_FUN_TYPE) {
			/// for function expression, just add as a child
			internal(this)._children.set(child.range.toString(), child);
			child.parent = this;
		}
	}
};

/**
 * Recursively find possible definitions of a variable
 * @param variable
 * @param node
 * @returns {*|Set}
 * @function
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

	if (internal(this)._cfg[2].indexOf(node) !== -1) {
		var reachIns = node.reachIns || new Set(),
			defs = matchReachInByVariable(reachIns, variable),
			ascendant = internal(this)._parent;
		while (!defs && !!ascendant) {
			reachIns = ascendant.cfg[1].reachIns;
			defs = matchReachInByVariable(reachIns, variable);
			ascendant = ascendant.parent;
		}
		return defs;
	}
};

/**
 * Get available reach definitions from ascendants
 * @returns {*|Set}
 * @function
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
 * @returns {Map}
 * @function
 */
Scope.prototype.getAvailVariables = function () {
	"use strict";
	var variables = new Map(),
		ascendant = internal(this)._parent;
	internal(this)._vars.forEach(function (val, key) {
		variables.set(key, val);
	});

	function getAvailVariableFromTheAscendant(locals, ascendant) {
		var avails = null;
		if (locals instanceof Map) {
			var varFromAscendant = ascendant.vars;
			varFromAscendant.forEach(function (val, key) {
				if (!locals.has(key)) {
					if (!avails) {
						avails = new Map();
					}
					avails.set(key, val);
				}
			});
		}
		return avails;
	}

	function setAvailVariableFromAscendant(val, key) {
		variables.set(key, val);
	}

	while (!!ascendant) {
		var fromAscedant = getAvailVariableFromTheAscendant(variables, ascendant);
		if (!!fromAscedant) {
			fromAscedant.forEach(setAvailVariableFromAscendant);
		}
		ascendant = ascendant.parent;
	}
	return variables;
};

/**
 * Remove unavailable reach definitions from inputs
 * @param rds {Set}
 * @returns {*|Set} removed reach definitions
 * @function
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
 * Get a child of this scope by its range value
 * @param range
 * @returns {*|Scope}
 * @function
 */
Scope.prototype.getChildByRange = function (range) {
	"use strict";
	if (Range.isValidValue(range)) {
		var findRage = rangeFactory.create(range);
		return internal(this)._children.get(findRage.toString());
	}
};

Object.defineProperty(Scope.prototype, 'children', {
	get: function () {
		'use strict';
		var map = new Map();
		internal(this)._children.forEach(function (child, rangeText) {
			map.set(rangeText, child);
		});
		return map;
	}
});

Scope.prototype.hasParentScopeSameAs = function (comparedScope) {
	"use strict";
	if (comparedScope instanceof Scope) {
		return internal(this)._parent === comparedScope.parent;
	}
	return false;
};

Scope.prototype.hasAscendantChild = function (comparedScope) {
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
 * @returns {string}
 * @function
 */
Scope.prototype.toString = function () {
	'use strict';
	return internal(this)._name + '_Entry@n' + internal(this)._cfg[0].cfgId;
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperty(Scope.prototype, 'cfg', {
	get: function () {
		'use strict';
		return [].concat(internal(this)._cfg);
	}
});

Object.defineProperty(Scope.prototype, 'parent', {
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
});

Object.defineProperty(Scope.prototype, 'def', {
	get: function () {
		"use strict";
		return internal(this)._def;
	},
	set: function (def) {
		"use strict";
		if (Def.isDef(def)) {
			internal(this)._def = def;
		}
	}
});

Object.defineProperty(Scope.prototype, 'vars', {
	get: function () {
		'use strict';
		var map = new Map();
		internal(this)._vars.forEach(function (val, key) {
			map.set(key, val);
		});
		return map;
	}
});

Object.defineProperty(Scope.prototype, 'params', {
	get: function () {
		'use strict';
		var map = new Map();
		internal(this)._params.forEach(function (val, key) {
			map.set(key, val);
		});
		return map;
	}
});

Object.defineProperty(Scope.prototype, 'lastReachIns', {
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
});
/* end-public-methods */

module.exports = Scope;
