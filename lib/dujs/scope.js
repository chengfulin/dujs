/**
 * Created by chengfulin on 2015/4/20.
 */
var Set = require('../analyses').Set,
    Range = require('./range'),
    Var = require('./var'),
    namesapce = require('../namespace'),
    internal = namesapce(),
    Map = require('core-js/es6/map'),
    CfgExt = require('./cfgext'),
    Def = require('./def'),
    RDs = require('./reachdefinitions'),
    DUA = require('./dua'),
    walkes = require('walkes'),
    VarDef = require('./vardef'),
    vardefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    varFactory = require('./varfactory'),
    FlowNode = require('../esgraph/flownode');

/**
 * Wrap the CFG
 * @param cfg CFG built by esgraph
 * @param {string} type Scope type
 * @param {Scope} [parent] reference to parent scope
 * @constructor
 * @throws {Error} when the value is invalid
 */
function Scope(cfg, type, parent) {
    'use strict';
    Scope.validate(cfg, type, parent);
    internal(this)._cfg = cfg || null;
    internal(this)._type = type || Scope.FUNCTION_SCOPE_TYPE;
    internal(this)._range = new Range(cfg[0].astNode.range);
    internal(this)._parent = parent || null;
    internal(this)._vars = new Map();/// (name, Var)
    internal(this)._params = new Map();/// (name, Var)
    internal(this)._paramNames = [];
    internal(this)._reachIns = new Map();/// (FlowNode, Set(VarDef))
    internal(this)._reachOuts = new Map();/// (FlowNode, Set(VarDef))
    internal(this)._children = new Map();/// (Def, Scope)
    internal(this)._def = defFactory.create(
        (!!internal(this)._parent)? internal(this)._parent.getCFG()[0].cfgId : 0,
        Def.FUNCTION_TYPE,
        internal(this)._range,
        internal(this)._parent
    );

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

Scope.defineProperty(Scope, 'GLOBAL_SCOPE_TYPE', {
    value: 'Global'
});

Scope.defineProperty(Scope, 'PROGRAM_SCOPE_TYPE', {
    value: 'Program'
});

Scope.defineProperty(Scope, 'FUNCTION_SCOPE_TYPE', {
    value: 'Function'
});

Scope.defineProperty(Scope, 'TYPES', {
    value: [Scope.GLOBAL_SCOPE_TYPE, Scope.PROGRAM_SCOPE_TYPE, Scope.FUNCTION_SCOPE_TYPE]
});

/**
 * Check the cfg is valid or not
 * @param cfg
 * @returns {boolean}
 * @static
 * @function
 */
Scope.isValidCFG = function (cfg) {
    'use strict';
    return (cfg instanceof Array && cfg.length === 3) &&
        (cfg[0].type === FlowNode.ENTRY_NODE_TYPE && cfg[1].type === FlowNode.EXIT_NODE_TYPE && !!cfg[0].astNode && !cfg[1].astNode) &&
        (cfg[0].astNode.type === 'Program' || cfg[0].astNode.type === 'BlockStatement');
};

/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param {Scope} scope
 * @returns {boolean}
 * @static
 * @function
 */
Scope.isValidParent = function (scope) {
    'use strict';
    return (Scope.isScope(scope) || !scope);
};

/**
 * Check the object is a Scope or not
 * @param {Object} obj
 * @returns {boolean}
 * @static
 * @function
 */
Scope.isScope = function (obj) {
    'use strict';
    return obj instanceof Scope;
};

/**
 * Check for the type is a valid scope type
 * @param type
 * @returns {boolean}
 */
Scope.isValidScopeType = function (type) {
    "use strict";
    return Scope.TYPES.indexof(type) !== -1;
};

/**
 * Validate the initial value of the Scope is valid or not
 * @param cfg CFG
 * @param type Scope type
 * @param {Scope} parent parent scope
 * @param {string} msg custom error message
 * @throws {Error} when a value is invalid
 * @static
 * @function
 */
Scope.validate = function (cfg, type, parent, msg) {
    'use strict';
    if (!Scope.isValidCFG(cfg)) {
        throw new Error(msg || 'Invalid value of CFG in a Scope');
    }
    if (!Scope.isValidScopeType(type)) {
        throw new Error(msg || 'Invalid value of the type of a Scope');
    }
    if (!Scope.isValidParent(parent)) {
        throw new Error(msg || 'Invalid value of parent scope in a Scope');
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
 * @param {string} name
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
 * @param {string} name
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
 * Set the variables declared in this scope
 * @function
 */
Scope.prototype.setVars = function () {
    'use strict';
    if (!!internal(this)._cfg) {
        var thisScope = this;
        internal(thisScope)._cfg[2].forEach(function (cfgNode) {
            walkes(cfgNode.astNode, {
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(function (declarator) {
                        recurse(declarator);
                    });
                },
                VariableDeclarator: function (node) {
                    internal(thisScope).vars.set(
                        node.id.name,
                        varFactory.create(
                            node.id.name,
                            node.id.range,
                            thisScope,
                            null
                        )
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
        var paramToAdd = [],
            thisScope = this,
            rdsOfEntry = internal(thisScope)._reachIns.get(internal(thisScope)._cfg[0]) || new Set();
        params.forEach(function (elem) {
            if (Var.isVar(elem)) {
                paramToAdd.push(elem);
            }
        });
        paramToAdd.forEach(function (param) {
            internal(thisScope)._vars.set(param.getName(), param);
            internal(thisScope)._params.set(param.getName(), param);
            internal(thisScope)._paramNames.push(param.getName());
            /// definition of params will be created at the entry point
            /// TODO: resolve definition alias
            var vardefOfParams = vardefFactory.create(param, defFactory.createParamDef(thisScope, Def.LITERAL_TYPE, param.getRange()));
            if (!!vardefOfParams) {
                rdsOfEntry.add(vardefOfParams);
            }
        });
        internal(paramToAdd)._reachIns.set(internal(thisScope)._cfg[0], rdsOfEntry);
    }
};

/**
 * Getter of CFG of this scope
 */
Object.defineProperty(Scope.prototype, 'cfg', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._cfg);
    }
});

/**
 * Getter of range of this scope
 */
Object.defineProperty(Scope.prototype, 'range', {
    get: function () {
        "use strict";
        return internal(this)._range;
    }
});

/**
 * Getter of parent scope
 */
Object.defineProperty(Scope.prototype, 'parent', {
    get: function () {
        "use strict";
        return internal(this)._parent;
    }
});

/**
 * Getter of Vars declared in this scope
 */
Object.definePrototype(Scope.prototype, 'vars', {
    get: function () {
        "use strict";
        var map = new Map();
        internal(this)._vars.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    }
});

/**
 * Getter of parameters
 */
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

/**
 * Getter of reach definitions of this CFG
 */
Object.defineProperty(Scope.prototype, 'reachIns', {
    get: function () {
        "use strict";
        var map = new Map();
        internal(this)._reachIns.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    }
});

/**
 * Getter of reaching out definitions of this CFG
 */
Object.defineProperty(Scope.prototype, 'reachOuts', {
    get: function () {
        "use strict";
        var map = new Map();
        internal(this)._reachOuts.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    }
});

/**
 * Getter of Def of this scope
 */
Object.defineProperty(Scope.prototype, 'def', {
    get: function () {
        "use strict";
        return internal(this)._def;
    }
});

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
 * @param child
 * @throws {Error} when child is not a Scope
 * @function
 */
Scope.prototype.addChild = function (child) {
    'use strict';
    if (Scope.isScope(child)) {/// if the parameter is valid, do
        var rdsAtEntry = internal(this)._reachIns.get(internal(this)._cfg[0]) || new Set();
        if (child.getScope().getType() === Scope.FUNCTION_TYPE) {
            /// for function declaration, add function name as a variable
            /// and assign the definition of function to it
            /// then add this variable and definition to the reach definitions of the entry point
            var varToFun = varFactory.create(
                child.getScope().getValue(),
                child.getRange(),
                this.getScope(),
                null
            );
            internal(this).vars.set(
                varToFun.getName(),
                varToFun
            );
            rdsAtEntry.add(
                vardefFactory.create(
                    varToFun,
                    child.getDef()
                )
            );
            internal(this).children.set(child.getRange().toString(), child);
        } else if (child.getScope().getType() === Scope.ANONYMOUS_FUN_TYPE) {
            /// for function expression, just add as a child
            internal(this).children.set(child.getRange().toString(), child);
        }
        internal(this).reachIns.set(internal(this).cfg[0], rdsAtEntry);
    }
};

/**
 * Getter of children
 * @returns {Map}
 * @function
 */
Scope.prototype.getChildren = function () {
    'use strict';
    var children = new Map();
    internal(this).children.forEach(function (val, key) {
        children.set(key, val);
    });
    return children;
};

/**
 * Get a child by matching its range property
 * @param {Range} range a Range object
 * @returns {*|Scope}
 * @function
 */
Scope.prototype.getChildByRange = function (range) {
    'use strict';
    if (Range.isRange(range)) {
        return internal(this).children.get(range.toString());
    }
};

/**
 * Initialize reach definitions (intra-procedural)
 * @param rdsAddedToEntry Additional RDs of entry node
 * @function
 */
Scope.prototype.initRDs = function (rdsAddedToEntry) {
    'use strict';
    var entryRDs = internal(this).reachIns.get(internal(this).cfg[0]) || new Set(),
        resultRDs,
        thisCFGWrapper = this;
    if (!!rdsAddedToEntry && rdsAddedToEntry instanceof Set) {
        var validRDs = false;
        rdsAddedToEntry.forEach(function (elem) {
            validRDs = VarDef.isVarDef(elem);
        });
        if (validRDs) {
            entryRDs = Set.union(entryRDs, rdsAddedToEntry);
        }
    }
    resultRDs = RDs.findReachDefinitions(this, entryRDs);
    resultRDs.inputs.forEach(function (val, key) {
        internal(thisCFGWrapper).reachIns.set(key, val);
    });
    resultRDs.outputs.forEach(function (val, key) {
        internal(thisCFGWrapper).reachOuts.set(key, val);
    });
};

/**
 * Update Reach Definitions (in & out) by adding extra definitions at some point, then re-find the RDs and union the result with the old one
 * @param node The node start to update
 * @param {Set} addReachIns Extra definitions (VarDef) would reach in
 * @function
 */
Scope.prototype.updateRDs = function (node, addReachIns) {
    'use strict';
    var originalRDs = internal(this).reachIns.get(node) || new Set(),
        resultRDs,
        thisCFGWrapper = this;
    resultRDs = RDs.findReachDefinitions(this, Set.union(originalRDs, addReachIns), node);
    /// update
    resultRDs.inputs.forEach(function (val, key) {
        internal(thisCFGWrapper).reachIns.set(key, Set.union(internal(thisCFGWrapper).reachIns.get(key), val));
    });
    resultRDs.outputs.forEach(function (val, key) {
        internal(thisCFGWrapper).reachOuts.set(key, Set.union(internal(thisCFGWrapper).reachOuts.get(key), val));
    });
};

/**
 * Check for the variable has definition reaching in the cfgNode or not
 * @param cfgNode
 * @param {Var} variable
 * @returns {boolean}
 * @function
 */
Scope.prototype.doesVarReachIn = function (cfgNode, variable) {
    'use strict';
    var found = false,
        setOfRDs = internal(this).reachIns.get(cfgNode);
    if (!!setOfRDs) {
        setOfRDs.forEach(function (elem) {
            if (elem.variable.toString() === variable.toString()) {
                found = true;
            }
        });
    }
    return found;
};

/**
 * Get the definitions of a Var that reaches in the node
 * @param cfgNode
 * @param {Var} variable
 * @returns {Set}
 * @function
 */
Scope.prototype.getVarDefsReachIn = function (cfgNode, variable) {
    'use strict';
    var varDefs = new Set(),
        setOfRDs = internal(this).reachIns.get(cfgNode);
    if (!!setOfRDs) {
        setOfRDs.forEach(function (elem) {
            if (elem.variable.toString() === variable.toString()) {
                varDefs.add(elem);
            }
        });
    }
    return varDefs;
};

/**
 * Represent the Scope as string
 * @returns {string}
 * @function
 */
Scope.prototype.toString = function () {
    'use strict';
    return this.getScope() + '@' + this.getRange();
};

/**
 * Represent Reach Ins at a CFG node as string
 * @param cfgNode
 * @returns {string}
 * @function
 */
Scope.prototype.nodeReachInsToString = function (cfgNode) {
    'use strict';
    var thisCFGWrapper = this,
        label = cfgNode.label || cfgNode.cfgId,
        rds = internal(thisCFGWrapper).reachIns.get(cfgNode),
        text = '';
    if (!!rds) {
        text += 'ReachIn(' + label + ') = [';
        var currentVarInReachIn, setOfVarDefs;
        rds.forEach(function (varDef, indexOuter) {
            if (currentVarInReachIn !== varDef.variable) {
                currentVarInReachIn = varDef.variable;
                setOfVarDefs = thisCFGWrapper.getVarDefsReachIn(cfgNode, currentVarInReachIn);

                text += ((indexOuter === 0)? '\n{' : ',\n{') + currentVarInReachIn + ': [';
                setOfVarDefs.forEach(function (elem, indexInner) {
                    text += ((indexInner === 0) ? '' : ', ') + elem.definition;
                });
                text += ']}';
            }
        });
        text += '\n]';
    }
    return text;
};

/**
 * Represent ReachIns of all CFG nodes as string
 * @returns {string}
 * @function
 */
Scope.prototype.reachInsToString = function () {
    'use strict';
    var thisCFGWrapper = this,
        text = '';
    internal(thisCFGWrapper).cfg[2].forEach(function (node, index) {
        text += ((index === 0)? '' : '\n') + thisCFGWrapper.nodeReachInsToString(node);
    });
    return text;
};

/**
 * Convert CFG of this function scope to dot format string
 * @returns {*|string}
 * @function
 */
Scope.prototype.cfgToString = function () {
    'use strict';
    return CfgExt.toDotWithLabelId(internal(this).cfg);
};

/**
 * Find Def-Use pairs of current function scope
 * @function
 */
Scope.prototype.findDUpairs = function () {
    'use strict';
    internal(this).mapVarDUpairs = DUA.findDUPairs(this);
};

/**
 * Get the Def-Use pairs of current function scope
 * @returns {Map}
 * @function
 */
Scope.prototype.getDUpairs = function () {
    'use strict';
    var map = new Map();
    internal(this).mapVarDUpairs.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

module.exports = Scope;