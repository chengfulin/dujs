/**
 * Model for JavaScript scope
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-27
 */
/** Import Set module */
var Set = require('../analyses').Set;
/** Import polyfill module for Map of ES6 */
var Map = require('core-js/es6/map');
/** Import JS AST walker */
var walkes = require('walkes');
/** Import namespace module */
var namesapce = require('./namespace');
/** Create "internal" namespace */
var internal = namesapce();

var cfgValidator = require('./cfgvalidator'),
    Def = require('./def'),
    VarDef = require('./vardef'),
    varFactory = require('./varfactory');

/**
 * Wrap the CFG
 * @param {Object} cfg Control flow graph of this scope
 * @param {String} name Name of current scope
 * @param {Object} parent Reference to parent scope
 * @constructor
 * @throws {Object} When the value is invalid
 */
function Scope(cfg, name, parent) {
    'use strict';
    Scope.validate(cfg, scope, parent);
    internal(this)._cfg = cfg;
    internal(this)._name = name;
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
 * Validate the initial value of the Scope is valid or not
 * @param {Object} cfg A control flow graph
 * @param {Object} parent Parent scope
 * @param {String} msg Custom error message
 * @throws {Object} When a value is invalid
 */
Scope.validate = function (cfg, scope, parent, msg) {
    'use strict';
    if (!cfgValidator.isValidCFG(cfg)) {
        throw new Error(msg || 'Invalid CFG for a Scope');
    }
    if (!Scope.isScope(scope)) {
        throw new Error(msg || 'Invalid Scope value for a Scope');
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
                return internal(current)._vars.get(name);
            } else {
                current = internal(current)._parent;
            }
        }
    }
};

/**
 * Add initial variables and their definitions into this scope
 * @param initiials Set or array of VarDefs
 * @function
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
 * @function
 */
Scope.prototype.setVars = function () {
    'use strict';
    if (!!internal(this)._cfg) {
        var thisScope = this;
        internal(this)._cfg[2].forEach(function (cfgNode) {
            walkes(cfgNode.astNode, {
                FunctionDeclaration: function () {},
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
 * @function
 */
Scope.prototype.setParams = function (params) {
    'use strict';
    if (params instanceof Array || params instanceof Set) {/// if the parameters are valid
        //var paramToAdd = [],
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

Object.defineProperty(Scope.prototype, 'cfg', {
    get: function () {
        'use strict';
        return [].concat(internal(this)._cfg);
    }
});

Object.defineProperty(Scope.prototype, 'range', {
    get: function () {
        "use strict";
        return internal(this)._range;
    },
    set: function (range) {
        "use strict";
        internal(this)._range = new Range(range);
    }
});

Object.defineProperty(Scope.prototype, 'scope', {
    get: function () {
        'use strict';
        return internal(this)._name;
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

/**
 * Get param name with parameter index
 * @param index
 * @returns {*|string}
 * @function
 */
Scope.prototype.getParamNameWithIndex = function (index) {
    'use strict';
    if (typeof index === 'number' && (index >= 0 && index < internal(this)._paramNames.length)) {
        return internal(this)._paramNames[index];
    }
};

/**
 * Add a child to this Scope
 * @param child
 * @throws {Error} when child is not a Scope
 * @function
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
    while(!!ascendant) {
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

    while(!!ascendant) {
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

module.exports = Scope;