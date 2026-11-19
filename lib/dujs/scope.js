/*
 * Model for JavaScript scope
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */

var Var = require('./var'),
    scopeBinding = require('./scopebinding'),
    astValidator = require('./astvalidator'),
    Range = require('./range'),
    rangeFactory = require('./rangefactory');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * Create scope
 * @param {Object} ast AST root of the current scope
 * @param {string} name Name of current scope
 * @param {string} type Type of current scope
 * @param {Scope} [parent] Reference to parent scope
 * @constructor
 * @throws {Error} When the value is invalid
 */
function Scope(ast, name, type, parent) {
	'use strict';
	Scope.validate(ast, name, type, parent);
	internal(this)._ast = ast;
	internal(this)._name = name;
	internal(this)._type = type;
	internal(this)._parent = parent || null;
    internal(this)._range = (!!internal(this)._ast)? rangeFactory.create(internal(this)._ast.range) : null;
	internal(this)._variables = []; /// [Var] in the order of registration (feature 006 research R5)
	internal(this)._children = []; /// [Scope]
	internal(this)._binding = null; /// PageBinding of a page scope (lib/dujs/scopebinding.js)

	if (!!parent) {
		parent.addChild(this);
	}

	/* start-test-block */
	this._testonly_ = internal(this);
	/* end-test-block */
}

/* start-static-data-members */
Object.defineProperties(Scope, {
	/**
	 * Name of the domain scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	DOMAIN_SCOPE_NAME: {
		value: '$DOMAIN',
		enumerable: true
	},
	/**
	 * Leading name of page scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	PAGE_SCOPE_NAME: {
		value: '$PAGE',
		enumerable: true
	},
	/**
	 * Leadin name of anonymous function scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	ANONYMOUS_FUN_SCOPE_NAME: {
		value: '$ANONYMOUS_FUN',
		enumerable: true
	},
	/**
	 * Type of function scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	FUNCTION_TYPE: {
		value: 'function',
		enumerable: true
	},
	/**
	 * Type of anonymous function scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	ANONYMOUS_FUN_TYPE: {
		value: 'anonymousFunction',
		enumerable: true
	},
	/**
	 * Type of page scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	PAGE_TYPE: {
		value: 'page',
		enumerable: true
	},
	/**
	 * Type of domain scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	DOMAIN_TYPE: {
		value: 'domain',
		enumerable: true
	},
	/**
	 * Name prefix of block scopes
	 * @type {string}
	 * @memberof Scope
	 */
	BLOCK_SCOPE_NAME: {
		value: '$BLOCK',
		enumerable: true
	},
	/**
	 * Type of block scopes (ES2015 lexical scopes of blocks, loops and switches)
	 * @type {string}
	 * @memberof Scope
	 */
	BLOCK_TYPE: {
		value: 'block',
		enumerable: true
	}
});

Object.defineProperties(Scope, {
	/**
	 * Scope types
	 * @type {Object}
	 * @memberof Scope
	 * @constant
	 */
	TYPES: {
		value: [Scope.FUNCTION_TYPE, Scope.ANONYMOUS_FUN_TYPE, Scope.PAGE_TYPE, Scope.DOMAIN_TYPE, Scope.BLOCK_TYPE],
		enumerable: true
	}
});
/* end-static-data-members */

/* start-static-methods */
/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param {Scope} [parentScope] Parent scope
 * @returns {boolean} True if the parent scope is valid or empty
 */
Scope.isValidParent = function (parentScope) {
	'use strict';
	return (Scope.isScope(parentScope) || !parentScope);
};

/**
 * Check the object is a Scope or not
 * @param {Object} obj An object to be checked
 * @returns {boolean} True if the obj is a Scope object, false otherwise
 */
Scope.isScope = function (obj) {
	'use strict';
	return obj instanceof Scope;
};

/**
 * Check the scope name is valid or not
 * @param {string} name Name of the scope
 * @returns {boolean} True if it's valid, false otherwise
 */
Scope.isValidName = function (name) {
	'use strict';
	var normalFunctionNameForamt = /^[_a-zA-Z][_a-zA-Z0-9]*$/i;
	return (typeof name === 'string') &&
		(((name === Scope.DOMAIN_SCOPE_NAME) || (name.indexOf(Scope.PAGE_SCOPE_NAME) === 0) || (name.indexOf(Scope.ANONYMOUS_FUN_SCOPE_NAME) === 0) || (name.indexOf(Scope.BLOCK_SCOPE_NAME) === 0)) ||
		normalFunctionNameForamt.test(name));
};

/**
 * Check if the type is a valid scope type
 * @param {string} type Type to be checked
 * @returns {boolean} True if the type is valid, false otherwise
 */
Scope.isValidType = function (type) {
	'use strict';
	return Scope.TYPES.indexOf(type) !== -1;
};

/**
 * Validate the initial value of the Scope is valid or not
 * @param {Object} ast AST root of the scope
 * @param {string} name Name of the scope
 * @param {string} type Type of the scope
 * @param {Scope} parent Parent scope
 * @param {string} [msg] Custom error message
 * @throws {Error} When a value is invalid
 */
Scope.validate = function (ast, name, type, parent, msg) {
	'use strict';
	if (!ast && type === Scope.DOMAIN_TYPE) {
		return;
	} else if (!astValidator.check(ast) ||
		!Scope.isValidName(name) ||
		!Scope.isValidType(type) ||
		!Scope.isValidParent(parent)) {
		throw new Error(msg || 'Invalid value for a Scope');
	}
};

/**
 * Validate the object is a Scope or not
 * @param {Object} obj An object to be validated
 * @param {string} [msg] Custom error message
 * @throws {Error} When the object is not a Scope
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
 * Add a child to this Scope
 * @param {Scope} child Child scope
 */
Scope.prototype.addChild = function (child) {
	'use strict';
	if (Scope.isScope(child) && internal(this)._children.indexOf(child) === -1) {
		internal(this)._children.push(child);
		child.parent = this;
	}
};

/**
 * Check if the scope is a child of current scope
 * @param {Scope} scope A scope to be checked
 * @returns {boolean} True if it is, false otherwise
 */
Scope.prototype.hasChildScope = function (scope) {
	"use strict";
	return internal(this)._children.indexOf(scope) !== -1;
};

/**
 * Check the scope has the same parent as this scope ro not
 * @param {Scope} comparedScope Scope to be compared
 * @returns {boolean} True if it's the same, false otherwise
 */
Scope.prototype.isSiblingOf = function (comparedScope) {
	"use strict";
	if (comparedScope instanceof Scope) {
		return internal(this)._parent === comparedScope.parent;
	}
	return false;
};

/**
 * Check is the scope is a child of ascendant
 * @param {Scope} comparedScope Scope to be compared
 * @returns {boolean} True if there is the child from an ascendant, false otherwise
 */
Scope.prototype.hasAscendantContainingTheChild = function (comparedScope) {
	"use strict";
	var ascendant = internal(this)._parent,
		found = false;
	if (Scope.isScope(comparedScope)) {
		while (!!ascendant) {
			if (ascendant.hasChildScope(comparedScope)) {
				found = true;
				break;
			}
			ascendant = ascendant.parent;
		}
	}
	return found;
};

/**
 * Represent the Scope as string
 * @returns {string} Represented by its name
 */
Scope.prototype.toString = function () {
	'use strict';
	return this.name;
};

/**
 * Register a Var to this scope (feature 006 data-model section 3); a Var is
 * registered once (by its identity), and Vars with the same name may be
 * registered (e.g. a catch parameter and an outer variable)
 * @param {Var} variable
 * @throws {Error} When the object is not a Var
 */
Scope.prototype.addVariable = function (variable) {
	"use strict";
	Var.validateType(variable, 'Try to add a non-Var object to a Scope');
	if (internal(this)._variables.indexOf(variable) === -1) {
		internal(this)._variables.push(variable);
	}
};

/**
 * Get the local variables of this scope and of its descendant block scopes,
 * i.e. all variables that go out of scope when this scope exits
 * @returns {Array} Vars, each once
 */
Scope.prototype.getVariablesIncludingBlockScopes = function () {
	"use strict";
	var result = [];
	(function collect(scope) {
		scope.variables.forEach(function (variable) {
			if (result.indexOf(variable) === -1) {
				result.push(variable);
			}
		});
		scope.children.forEach(function (child) {
			if (child.type === Scope.BLOCK_TYPE) {
				collect(child);
			}
		});
	}(this));
	return result;
};

/**
 * Find the innermost scope among this scope and its descendant block scopes
 * whose range contains the given range
 * @param {Array} range [start, end] offsets
 * @returns {Scope}
 */
Scope.prototype.getInnermostBlockScopeContaining = function (range) {
	"use strict";
	var found = this;
	var searching = true;
	while (searching) {
		searching = false;
		for (var index = 0; index < found.children.length; ++index) {
			var child = found.children[index];
			if (child.type === Scope.BLOCK_TYPE &&
				child.range.start <= range[0] && range[1] <= child.range.end) {
				found = child;
				searching = true;
				break;
			}
		}
	}
	return found;
};

/**
 * Register the Vars of the built-in objects (builtInObjects) of this scope;
 * the Vars are created once for the scope (lib/dujs/scopebinding.js
 * builtInVariablesOf), so that the binding of a page maps the fixed-list
 * names to them
 */
Scope.prototype.setBuiltInObjectVariables = function () {
	"use strict";
	var thisScope = this;
	scopeBinding.builtInVariablesOf(this).forEach(function (builtInVar) {
		thisScope.addVariable(builtInVar);
	});
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(Scope.prototype, {
	/**
	 * AST root of the scope
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	ast: {
		get: function () {
			"use strict";
			return internal(this)._ast;
		},
		enumerable: true
	},
    /**
     * Range of this scope
     * @type {Range}
     * @memberof Scope.prototype
     */
    range: {
        get: function () {
            'use strict';
            return internal(this)._range;
        },
        set: function (range) {
	        'use strict';
            if (Range.isValidValue(range)) {
                internal(this)._range = new Range(range);
            }
        },
	    enumerable: true
    },
	/**
	 * Array of child scopes
	 * @type {Array}
	 * @memberof Scope.prototype
	 */
	children: {
		get: function () {
			'use strict';
			return [].concat(internal(this)._children);
		},
		enumerable: true
	},
	/**
	 * Name of the scope, which would composed by ascendants\' names
	 * @type {string}
	 * @memberof Scope.prototype
	 */
	name: {
		get: function () {
			'use strict';
			return (!internal(this)._parent)? internal(this)._name : (internal(this)._parent.name + '.' + internal(this)._name);
		},
		enumerable: true
	},
	/**
	 * Internal: the name of the scope relative to its parent; set by the
	 * ScopeTree to make the names of same-named sibling scopes unique (FR-011)
	 * @type {string}
	 * @memberof Scope.prototype
	 * @private
	 */
	_name: {
		get: function () {
			'use strict';
			return internal(this)._name;
		},
		set: function (name) {
			'use strict';
			if (typeof name === 'string' && name.length > 0) {
				internal(this)._name = name;
			}
		}
	},
	/**
	 * Type of the scope
	 * @type {string}
	 * @memberof Scope.prototype
	 */
	type: {
		get: function () {
			'use strict';
			return internal(this)._type;
		},
		enumerable: true
	},
	/**
	 * Parent scope
	 * @type {Scope|Null}
	 * @memberof Scope.prototype
	 */
	parent: {
		get: function () {
			'use strict';
			return internal(this)._parent;
		},
		set: function (parent) {
			'use strict';
			if (Scope.isValidParent(parent)) {
				internal(this)._parent = parent;
			}
		},
		enumerable: true
	},
	/**
	 * Vars registered to this scope, in the order of registration
	 * @type {Array}
	 * @memberof Scope.prototype
	 */
	variables: {
		get: function () {
			'use strict';
			return [].concat(internal(this)._variables);
		},
		enumerable: true
	},
	/**
	 * Binding of the page (lib/dujs/scopebinding.js) of this scope, found
	 * through the page scope; set once on the page scope; null when the scope
	 * is not in an analyzed page (e.g. the domain scope)
	 * @type {PageBinding|null}
	 * @memberof Scope.prototype
	 */
	binding: {
		get: function () {
			'use strict';
			var current = this;
			while (!!current && current.type !== Scope.PAGE_TYPE) {
				current = current.parent;
			}
			return (!!current) ? internal(current)._binding : null;
		},
		set: function (binding) {
			'use strict';
			if (this.type === Scope.PAGE_TYPE && !!binding) {
				internal(this)._binding = binding;
			}
		}
	},
	/**
	 * Array of build-in objects
	 * @type {Array}
	 * @memberof Scope.prototype
	 */
	builtInObjects: {
		value: [],
		writable: true,
		enumerable: true
	},
    /**
     * Chain of scopes start from the current scope to the root scope
     * @type {Array}
     * @memberof Scope.prototype
     */
    scopeChain: {
        get: function () {
            "use strict";
            var chain = [];
            var currentScope = this;
            while (!!currentScope) {
                chain.push(currentScope);
                currentScope = currentScope.parent;
            }
            return chain;
        },
        enumerable: true
    }
});
/* end-public-data-members */

module.exports = Scope;
