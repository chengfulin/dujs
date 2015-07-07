/**
 * Created by chengfulin on 2015/4/20.
 */
var Set = require('../analyses').Set,
    Scope = require('./scope'),
    Range = require('./range'),
    namesapce = require('./namespace'),
    internal = namesapce(),
    Map = require('core-js/es6/map'),
    CfgExt = require('./cfgext'),
    Def = require('./def'),
    walkes = require('walkes'),
    VarDef = require('./vardef'),
    defFactory = require('./deffactory'),
    varFactory = require('./varfactory'),
    vardefFactory = require('./vardeffactory'),
    rangeFactory = require('./rangeFactory');

/**
 * Wrap the CFG
 * @param cfg CFG built by esgraph
 * @param scope this scope name
 * @param parent reference to parent scope
 * @constructor
 * @throws {Error} when the value is invalid
 */
function ScopeWrapper(cfg, scope) {
    'use strict';
    ScopeWrapper.validate(cfg, scope);
    internal(this)._cfg = cfg;
    internal(this)._range = null;
    internal(this)._scope = scope;
    internal(this)._parent = null;
    internal(this)._vars = new Map(); /// (name, Var)
    internal(this)._params = new Map(); /// (name, Var)
    internal(this)._paramNames = []; /// [names]
    internal(this)._children = new Map(); /// (Range text, ScopeWrapper)
    internal(this)._def = null;
    internal(this)._lastReachIns = null;

    var thisScopeWrapper = this;
    internal(this)._cfg[2].forEach(function (node) {
        node.scope = thisScopeWrapper;
    });

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param cfgWrapper
 * @returns {boolean}
 * @static
 * @function
 */
ScopeWrapper.isValidParent = function (cfgWrapper) {
    'use strict';
    return (ScopeWrapper.isScopeWrapper(cfgWrapper) || !cfgWrapper);
};

/**
 * Check the object is a ScopeWrapper or not
 * @param obj
 * @returns {boolean}
 * @static
 * @function
 */
ScopeWrapper.isScopeWrapper = function (obj) {
    'use strict';
    return obj instanceof ScopeWrapper;
};

/**
 * Validate the initial value of the ScopeWrapper is valid or not
 * @param cfg CFG
 * @param scope current scope
 * @param msg custom error message
 * @throws {Error} when a value is invalid
 * @static
 * @function
 */
ScopeWrapper.validate = function (cfg, scope, msg) {
    'use strict';
    if (!CfgExt.isValidCFG(cfg)) {
        throw new Error(msg || 'Invalid CFG for a ScopeWrapper');
    }
    if (!Scope.isScope(scope)) {
        throw new Error(msg || 'Invalid Scope value for a ScopeWrapper');
    }
};

/**
 * Validate the object is a ScopeWrapper or not
 * @param obj
 * @param msg custom error message
 * @throws {Error} when the object is not a ScopeWrapper
 * @static
 * @function
 */
ScopeWrapper.validateType = function (obj, msg) {
    'use strict';
    if (!ScopeWrapper.isScopeWrapper(obj)) {
        throw new Error(msg || 'Not a ScopeWrapper');
    }
};

/**
 * Check if the variable is declared in this scope with the same name
 * @param name
 * @returns {boolean}
 * @function
 */
ScopeWrapper.prototype.hasVarWithName = function (name) {
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
ScopeWrapper.prototype.getVarByName = function (name) {
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
ScopeWrapper.prototype.setInitVarDefs = function (initials) {
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
ScopeWrapper.prototype.setVars = function () {
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
                        internal(thisScope)._scope,
                        null
                    );
                    var undefinedDef = defFactory.createUndefinedDef(cfgNode, node.id.range, internal(thisScope)._scope);

                    internal(thisScope)._vars.set(
                        node.id.name,
                        declaredVar
                    );
                    if (!cfgNode.generate) {
                        cfgNode.generate = new Set();
                    }
                    Set.union(vardefFactory.create(declaredVar, undefinedDef));
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
ScopeWrapper.prototype.setParams = function (params) {
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

Object.defineProperty(ScopeWrapper.prototype, 'cfg', {
    get: function () {
        'use strict';
        return [].concat(internal(this)._cfg);
    }
});

Object.defineProperty(ScopeWrapper.prototype, 'range', {
    get: function () {
        "use strict";
        return internal(this)._range;
    },
    set: function (range) {
        "use strict";
        internal(this)._range = new Range(range);
    }
});

Object.defineProperty(ScopeWrapper.prototype, 'scope', {
    get: function () {
        'use strict';
        return internal(this)._scope;
    }
});

Object.defineProperty(ScopeWrapper.prototype, 'parent', {
    get: function () {
        'use strict';
        return internal(this)._parent;
    },
    set: function (parent) {
        "use strict";
        if (ScopeWrapper.isValidParent(parent)) {
            internal(this)._parent = parent;
        }
    }
});

Object.defineProperty(ScopeWrapper.prototype, 'def', {
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

Object.defineProperty(ScopeWrapper.prototype, 'vars', {
    get: function () {
        'use strict';
        var map = new Map();
        internal(this)._vars.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    }
});

Object.defineProperty(ScopeWrapper.prototype, 'params', {
    get: function () {
        'use strict';
        var map = new Map();
        internal(this)._params.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    }
});

Object.defineProperty(ScopeWrapper.prototype, 'lastReachIns', {
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
ScopeWrapper.prototype.getParamNameWithIndex = function (index) {
    'use strict';
    if (typeof index === 'number' && (index >= 0 && index < internal(this)._paramNames.length)) {
        return internal(this)._paramNames[index];
    }
};

/**
 * Add a child to this ScopeWrapper
 * @param child
 * @throws {Error} when child is not a ScopeWrapper
 * @function
 */
ScopeWrapper.prototype.addChild = function (child) {
    'use strict';
    if (ScopeWrapper.isScopeWrapper(child) && Range.isRange(child.range) && !internal(this)._children.has(child.range.toString())) {/// if the parameter is valid, do
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
ScopeWrapper.prototype.getAvailDefsByVariable = function (variable, node) {
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
ScopeWrapper.prototype.getAvailReachDefinitionsFromAscendants = function () {
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
ScopeWrapper.prototype.getAvailVariables = function () {
    "use strict";
    var variables = internal(this)._vars,
        ascendant = internal(this)._parent;
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
ScopeWrapper.prototype.spliceUnavailableReachDefinitionsFromSet = function (rds) {
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
 * @returns {*|ScopeWrapper}
 * @function
 */
ScopeWrapper.prototype.getChildByRange = function (range) {
    "use strict";
    if (Range.isValidValue(range)) {
        var findRage = rangeFactory.create(range);
        return internal(this)._children.get(findRage.toString());
    }
};

Object.defineProperty(ScopeWrapper.prototype, 'children', {
    get: function () {
        'use strict';
        var map = new Map();
        internal(this)._children.forEach(function (child, rangeText) {
            map.set(rangeText, child);
        });
        return map;
    }
});

ScopeWrapper.prototype.hasParentScopeSameAs = function (comparedScope) {
    "use strict";
    if (comparedScope instanceof ScopeWrapper) {
        return internal(this)._parent === comparedScope.parent;
    }
    return false;
};

ScopeWrapper.prototype.hasAscendantChild = function (comparedScope) {
    "use strict";
    var ascendant = internal(this)._parent,
        found = false;
    function matchScopeFromAscendantChildren(children, scope) {
        if (children instanceof Map && scope instanceof ScopeWrapper) {
            children.forEach(function (val) {
                if (val === scope) {
                    found = true;
                }
            });
        }
    }
    if (comparedScope instanceof ScopeWrapper) {
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
 * Represent the ScopeWrapper as string
 * @returns {string}
 * @function
 */
ScopeWrapper.prototype.toString = function () {
    'use strict';
    return internal(this)._scope + '_Entry@n' + internal(this)._cfg[0].cfgId;
};

module.exports = ScopeWrapper;