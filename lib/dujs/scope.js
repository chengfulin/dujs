/**
 * Created by chengfulin on 2015/4/20.
 */
var Set = require('../analyses').Set,
    Var = require('./var'),
    namesapce = require('./namespace'),
    internal = namesapce(),
    Map = require('core-js/es6/map'),
    walkes = require('walkes'),
    varFactory = require('./varfactory'),
    FlowNode = require('../esgraph/flownode');

/**
 * Scope
 * @param {string} type
 * @param {Scope} parent reference to parent scope
 * @param value
 * @constructor
 * @throws {Error} when the value is invalid
 */
function Scope(type, parent, value) {
    'use strict';
    Scope.validate(type, parent, value);
    internal(this)._type = type;
    internal(this)._value = value;
    internal(this)._parent = parent;
    internal(this)._vars = new Map();/// (name, Var)
    internal(this)._params = new Map();/// (name, Var)
    internal(this)._paramNames = [];/// [name]
    internal(this)._children = [];/// [Scope]

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param {Scope} parentScope
 * @returns {boolean}
 * @static
 * @function
 */
Scope.isValidParent = function (parentScope) {
    'use strict';
    return (Scope.isScope(parentScope) || !parentScope);
};

/**
 * Check the object is a Scope or not
 * @param obj
 * @returns {boolean}
 * @static
 * @function
 */
Scope.isScope = function (obj) {
    'use strict';
    return obj instanceof Scope;
};

/**
 * Check for the type of a Scope
 * @param {string} type
 * @returns {boolean}
 * @static
 * @function
 */
Scope.isValidScopeType = function (type) {
    "use strict";
    return !!type && Scope.TYPES.indexOf(type) !== -1;
};

/**
 * Check for the value of a Scope
 * @param {string|number} val
 * @returns {boolean}
 * @static
 * @function
 */
Scope.isValidScopeValue = function (val) {
    "use strict";
    var regexp = /^[_A-Za-z]{1}[_A-Za-z0-9]+$/i;
    return (typeof val === 'number' && val >= 0) ||
        (
            (typeof val === 'string') &&
            ((val === Scope.PROGRAM_SCOPE_VALUE || val === Scope.GLOBAL_SCOPE_VALUE) || regexp.test(val))
        );
};

/**
 * Validate the initial value of the Scope is valid or not
 * @param {string} type
 * @param {Scope} parent Parent scope
 * @param {string} value
 * @param {string} msg Custom error message
 * @throws {Error} when a value is invalid
 * @static
 * @function
 */
Scope.validate = function (type, parent, value, msg) {
    'use strict';
    if (!Scope.isValidScopeType(type)) {
        throw new Error(msg || 'Invalid type for a Scope');
    }
    if (!Scope.isValidParent(parent)) {
        throw new Error(msg || 'Invalid parent for a Scope');
    }
    if (!Scope.isValidScopeValue(value)) {
        throw new Error(msg || 'Invalid value for a Scope');
    }
};

/**
 * Validate the object is a Scope or not
 * @param obj
 * @param msg custom error message
 * @throws {Error} when the object is not a Scope
 * @static
 * @function
 */
Scope.validateType = function (obj, msg) {
    'use strict';
    if (!Scope.isScope(obj)) {
        throw new Error(msg || 'Not a Scope');
    }
};

Object.defineProperty(Scope, 'PROGRAM_SCOPE_VALUE', {
    value: '!PROGRAM'
});

Object.defineProperty(Scope, 'GLOBAL_SCOPE_VALUE', {
    value: '!GLOBAL'
});

Object.defineProperty(Scope, 'FUNCTION_SCOPE_TYPE', {
    value: 'Function',
});

Object.defineProperty(Scope, 'ANONYMOUS_FUNCTION_SCOPE_TYPE', {
    value: 'AnonymousFunction'
});

Object.defineProperty(Scope, 'PROGRAM_SCOPE_TYPE', {
    value: 'Program',
});

Object.defineProperty(Scope, 'GLOBAL_SCOPE_TYPE', {
    value: 'Global',
});

Object.defineProperty(Scope, 'TYPES', {
    value: [
        Scope.FUNCTION_SCOPE_TYPE,
        Scope.ANONYMOUS_FUNCTION_SCOPE_TYPE,
        Scope.PROGRAM_SCOPE_TYPE,
        Scope.GLOBAL_SCOPE_TYPE
    ],
});

/**
 * Check if the variable is declared in this scope with the same name
 * @param name
 * @returns {boolean}
 * @function
 */
Scope.prototype.hasVarWithName = function (name) {
    'use strict';
    if (typeof name === 'string') {
        return internal(this)._vars.has(name);
    }
    return false;
};

/**
 * Get the variable by its name if existed in this or outer scopes
 * @param name
 * @returns {*|Var}
 * @function
 */
Scope.prototype.getVarByName = function (name) {
    'use strict';
    if (typeof name === 'string') {
        var current = this;
        while(!!current) {
            if (current.hasVarWithName(name)) {
                return internal(current).vars.get(name);
            } else {
                current = internal(current).parent;
            }
        }
    }
};

/**
 * Add initial variables of this scope
 * @param {Array|Set} initial variables
 * @function
 */
Scope.prototype.setInitVars = function (initials) {
    'use strict';
    var valid = false,
        thisScope = this;
    if (initials instanceof Array || initials instanceof Set) {
        valid = true;
        initials.forEach(function (variable, index) {
            valid = valid && Var.isVar(variable);
        });
        if (valid) {/// if all initial variables are Var type
            initials.forEach(function (variable) {
                internal(thisScope).vars.set(
                    variable.getName(),
                    variable
                );
            });
        }
    }
};

/**
 * Set the variables declared in this scope through CFG
 * @param {Array} cfg
 * @function
 */
Scope.prototype.setVarsFromCFG = function (cfg) {
    'use strict';
    if (!!cfg) {
        var currentScope = this;
        cfg[2].forEach(function (cfgNode) {
            walkes(cfgNode.astNode, {
                FunctionDeclaration: function (node) {
                    internal(currentScope).vars.set(
                        node.id.name,
                        varFactory.create(
                            node.id.name,
                            currentScope,
                            null
                        )
                    );
                },
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(function (declarator) {
                        recurse(declarator);
                    });
                },
                VariableDeclarator: function (node) {
                    internal(currentScope).vars.set(
                        node.id.name,
                        varFactory.create(
                            node.id.name,
                            currentScope,
                            null
                        )
                    );
                }
            });
        });
    }
};

/**
 * Set parameters with Vars
 * @param {Array} Parameters in order
 * @function
 */
Scope.prototype.setParams = function (params) {
    'use strict';
    var valid = false,
        thisScope = this;
    if (params instanceof Array || params instanceof Set) {
        valid = true;
        params.forEach(function (elem) {
            valid = valid && Var.isVar(elem);
        });
        if (valid) {
            params.forEach(function (param) {
                internal(thisScope).vars.set(param.getName(), param);
                internal(thisScope).params.set(param.getName(), param);
                internal(thisScope).paramNames.push(param.getName());
            });
        }
    }
};

/**
 * Get the parameter name at the index order
 * @param index Index of the parameter (>= 0)
 * @returns {*|string}
 * @function
 */
Scope.prototype.getFunctionParamName = function (index) {
    'use strict';
    if (typeof index === 'number' && (index >= 0 && index < internal(this)._paramNames.length)) {
        return internal(this)._paramNames[index];
    }
};

/**
 * Add a child to this Scope
 * @param {Scope} child
 * @function
 */
Scope.prototype.addChild = function (child) {
    'use strict';
    if (Scope.isScope(child) && internal(this)._children.indexOf(child) === -1) {
        internal(this)._children.push(child);
        child.setParent(this);
    }
};

/**
 * Represent the Scope as string
 * @returns {string}
 * @function
 */
Scope.prototype.toString = function () {
    'use strict';
    return internal(this)._type + (internal(this)._type === Scope.PROGRAM_SCOPE_TYPE || internal(this)._type === Scope.GLOBAL_SCOPE_TYPE)? '' : '[' + (typeof internal(this)._value === 'string')? ('"' + internal(this)._value + '"') : internal(this)._value+ ']';
};

Object.defineProperty(Scope.prototype, 'type', {
    get: function () {
        "use strict";
        return internal(this)._type;
    }
});

Object.defineProperty(Scope.prototype, 'value', {
    get: function () {
        "use strict";
        return internal(this)._value;
    }
});

Object.defineProperty(Scope.prototype, 'parent', {
    get: function () {
        "use strict";
        return internal(this)._parent;
    },
    set: function (parent) {
        "use strict";
        if (Scope.isScope(parent)) {
            internal(this)._parent = parent;
        }
    }
});

Object.defineProperty(Scope.prototype, 'vars', {
    get: function () {
        "use strict";
        var map = new Map();
        internal(this)._vars.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    }
});

Object.defineProperty(Scope.prototype, 'params', {
    get: function () {
        "use strict";
        var map = new Map();
        internal(this)._params.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    }
});

Object.defineProperty(Scope.prototype, 'children', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._children);
    }
});

module.exports = Scope;