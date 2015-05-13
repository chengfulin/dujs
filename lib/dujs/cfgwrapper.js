/**
 * Created by chengfulin on 2015/4/20.
 */
var Set = require('../analyses').Set,
    Scope = require('./scope'),
    Range = require('./range'),
    Var = require('./var'),
    namesapce = require('./namespace'),
    internal = namesapce(),
    Map = require('core-js/es6/map'),
    CfgExt = require('./cfgext'),
    Def = require('./def'),
    RDs = require('./reachdefinitions'),
    DUA = require('./dua'),
    walkes = require('walkes'),
    VarDef = require('./vardef'),
    vardefFactory = require('./vardeffactory');

/**
 * Wrap the CFG
 * @param cfg CFG built by esgraph
 * @param scope this scope name
 * @param parent reference to parent scope
 * @constructor
 * @throws {Error} when the value is invalid
 */
function CFGWrapper(cfg, scope, parent) {
    'use strict';
    CFGWrapper.validate(cfg, scope, parent);
    internal(this).cfg = cfg;
    internal(this).range = new Range(cfg[0].astNode.range);
    internal(this).scope = scope;
    internal(this).parent = parent;
    internal(this).vars = new Map();
    internal(this).reachIns = new Map();
    internal(this).reachOuts = new Map();
    internal(this).params = new Map();
    internal(this).paramNames = [];
    internal(this).children = new Map();
    internal(this).def = new Def(
        internal(this).cfg[0].cfgId,
        Def.FUNCTION_TYPE,
        internal(this).range,
        (!!internal(this).parent)? internal(this).parent.getScope() : Scope.PROGRAM_SCOPE
    );
    internal(this).mapVarDUpairs = new Map();
}

/**
 * Check the cfg is valid or not
 * @param cfg
 * @returns {boolean}
 */
CFGWrapper.isValidCFG = function (cfg) {
    'use strict';
    return (cfg instanceof Array && cfg.length === 3) &&
        (cfg[0].type === 'entry' && cfg[1].type === 'exit' && !!cfg[0].astNode && !cfg[1].astNode) &&
        (cfg[0].astNode.type === 'Program' || cfg[0].astNode.type === 'BlockStatement');
};

/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param cfgWrapper
 * @returns {boolean}
 */
CFGWrapper.isValidParent = function (cfgWrapper) {
    'use strict';
    return (CFGWrapper.isCFGWrapper(cfgWrapper) || !cfgWrapper);
};

/**
 * Check the object is a CFGWrapper or not
 * @param obj
 * @returns {boolean}
 */
CFGWrapper.isCFGWrapper = function (obj) {
    'use strict';
    return obj instanceof CFGWrapper;
};

/**
 * Validate the initial value of the CFGWrapper is valid or not
 * @param cfg CFG
 * @param scope current scope
 * @param parent parent scope
 * @param msg custom error message
 * @throws {Error} when a value is invalid
 */
CFGWrapper.validate = function (cfg, scope, parent, msg) {
    'use strict';
    if (!CFGWrapper.isValidCFG(cfg)) {
        throw new Error(msg || 'Invalid CFGWrapper value (CFG)');
    }
    if (!CFGWrapper.isValidParent(parent)) {
        throw new Error(msg || 'Invalid CFGWrapper value (parent scope)');
    }
    try {
        Scope.validateType(scope, msg);
        Scope.validate(scope, msg);
    } catch (err) {
        throw new Error(msg || 'Invalid CFGWrapper value (scope)');
    }
};

/**
 * Validate the object is a CFGWrapper or not
 * @param obj
 * @param msg custom error message
 * @throws {Error} when the object is not a CFGWrapper
 */
CFGWrapper.validateType = function (obj, msg) {
    'use strict';
    if (!CFGWrapper.isCFGWrapper(obj)) {
        throw new Error(msg || 'Not a CFGWrapper');
    }
};

/**
 * Check if the variable is declared in this scope with the same name
 * @param name
 * @returns {boolean}
 */
CFGWrapper.prototype.hasVarWithName = function (name) {
    'use strict';
    if (typeof name === 'string') {
        return internal(this).vars.has(name);
    }
    return false;
};

/**
 * Get the variable by its name if existed in this or outer scopes
 * @param name
 * @returns {*|Var}
 */
CFGWrapper.prototype.getVarByName = function (name) {
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
 * Add global variables into this scope
 * @param initGlobals Array or Set of VarDef of global variables
 * @throws {Error} when an element is not a valid VarDef
 */
CFGWrapper.prototype.setInitGlobalVars = function (initGlobals) {
    'use strict';
    if (initGlobals instanceof Array || initGlobals instanceof Set) {
        var thisCFGWrapper = this,
            allString = false,
            allVar = false,
            entryRds = internal(this).reachIns.get(internal(this).cfg[0]) || new Set();
        initGlobals.forEach(function (elem) {
            if (elem instanceof VarDef) {
                internal(thisCFGWrapper).vars.set(elem.variable.getName(), elem.variable);
                entryRds.add(elem);
            }
        });
        if (entryRds.size > 0) {
            internal(this).reachIns.set(internal(this).cfg[0], entryRds);
        }
    }
};

/**
 * Set the variables declared in this scope
 * @param initGlobals
 */
CFGWrapper.prototype.setVars = function (initGlobals) {
    'use strict';
    if (!!internal(this).cfg) {
        var thisCFGWrapper = this;
        internal(thisCFGWrapper).cfg[2].forEach(function (cfgNode) {
            walkes(cfgNode.astNode, {
                Program: function () {
                    if (cfgNode.type === 'entry') {
                        thisCFGWrapper.setInitGlobalVars(initGlobals);
                    }
                },
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(function (declarator) {
                        recurse(declarator);
                    });
                },
                VariableDeclarator: function (node) {
                    internal(thisCFGWrapper).vars.set(
                        node.id.name,
                        new Var(
                            node.id.name,
                            node.id.range,
                            internal(thisCFGWrapper).scope,
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
 */
CFGWrapper.prototype.setParams = function (params) {
    'use strict';
    if (params instanceof Array || params instanceof Set) {/// if the parameters are valid
        var paramToAdd = [],
            thisCFGWrapper = this,
            rdsOfEntry = internal(thisCFGWrapper).reachIns.get(internal(thisCFGWrapper).cfg[0]) || new Set();
        params.forEach(function (elem) {
            if (Var.isVar(elem)) {
                paramToAdd.push(elem);
            }
        });
        paramToAdd.forEach(function (param) {
            internal(thisCFGWrapper).vars.set(param.getName(), param);
            internal(thisCFGWrapper).params.set(param.getName(), param);
            internal(thisCFGWrapper).paramNames.push(param.getName());
            /// parameters declared
            /// but it doesn't have definition yet
        });
    }
};

/**
 * Getter of CFG of this scope
 * @returns {Array}
 */
CFGWrapper.prototype.getCFG = function () {
    'use strict';
    return [].concat(internal(this).cfg);
};

/**
 * Getter of range of this scope
 * @returns {*|Range}
 */
CFGWrapper.prototype.getRange = function () {
    'use strict';
    return internal(this).range;
};

/**
 * Getter of scope name
 * @returns {*|Scope}
 */
CFGWrapper.prototype.getScope = function () {
    'use strict';
    return internal(this).scope;
};

/**
 * Getter of parent scope
 * @returns {CFGWrapper}
 */
CFGWrapper.prototype.getParent = function () {
    'use strict';
    return internal(this).parent;
};

/**
 * Getter of Vars declared in this scope
 * @returns {Map}
 */
CFGWrapper.prototype.getScopeVars = function () {
    'use strict';
    var map = new Map();
    internal(this).vars.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

/**
 * Getter of parameters
 * @returns {Map}
 */
CFGWrapper.prototype.getFunctionParams = function () {
    'use strict';
    var map = new Map();
    internal(this).params.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

/**
 * Get the parameter name at the index order
 * @param index Index of the parameter (>= 0)
 * @returns {*|string}
 */
CFGWrapper.prototype.getFunctionParamName = function (index) {
    'use strict';
    if (typeof index === 'number' && (index >= 0 && index < internal(this).paramNames.length)) {
        return internal(this).paramNames[index];
    }
};

/**
 * Getter of reach definitions of this CFG
 * @returns {*}
 */
CFGWrapper.prototype.getReachIns = function () {
    'use strict';
    var map = new Map();
    internal(this).reachIns.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

/**
 * Getter of reaching out definitions of this CFG
 * @returns {*}
 */
CFGWrapper.prototype.getReachOuts = function () {
    'use strict';
    var map = new Map();
    internal(this).reachOuts.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

/**
 * Getter of Def of this scope
 * @returns {*|Def}
 */
CFGWrapper.prototype.getDef = function () {
    'use strict';
    return internal(this).def;
};

/**
 * Add a child to this CFGWrapper
 * @param child
 * @throws {Error} when child is not a CFGWrapper
 */
CFGWrapper.prototype.addChild = function (child) {
    'use strict';
    if (CFGWrapper.isCFGWrapper(child)) {/// if the parameter is valid, do
        var rdsAtEntry = internal(this).reachIns.get(internal(this).cfg[0]) || new Set();
        if (child.getScope().getType() === Scope.FUNCTION_TYPE) {
            /// for function declaration, add function name as a variable
            /// and assign the definition of function to it
            /// then add this variable and definition to the reach definitions of the entry point
            var varToFun = new Var(
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
                {
                    variable: varToFun,
                    definition: child.getDef()
                }
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
 */
CFGWrapper.prototype.getChildren = function () {
    'use strict';
    var children = new Map();
    internal(this).children.forEach(function (val, key) {
        children.set(key, val);
    });
    return children;
};

/**
 * Get a child by matching its range property
 * @param range a Range object
 * @returns {*|CFGWrapper}
 */
CFGWrapper.prototype.getChildByRange = function (range) {
    'use strict';
    if (Range.isRange(range)) {
        return internal(this).children.get(range.toString());
    }
};

/**
 * Initialize reach definitions (intra-procedural)
 * @param rdsAddedToEntry Additional RDs of entry node
 */
CFGWrapper.prototype.initRDs = function (rdsAddedToEntry) {
    'use strict';
    var entryRDs = internal(this).reachIns.get(internal(this).cfg[0]),
        resultRDs,
        thisCFGWrapper = this;
    if (!!rdsAddedToEntry && rdsAddedToEntry instanceof Set) {
        var validRDs = false;
        rdsAddedToEntry.forEach(function (elem) {
            validRDs = (!!elem.variable && !!elem.definition);
        });
        if (validRDs) {
            entryRDs = Set.union(entryRDs, rdsAddedToEntry);
        }
    }
    if (!!entryRDs) {
        resultRDs = RDs.findReachDefinitions(this, entryRDs);
    } else {
        resultRDs = RDs.findReachDefinitions(this);
    }
    resultRDs.inputs.forEach(function (val, key) {
        internal(thisCFGWrapper).reachIns.set(key, val);
    });
    resultRDs.outputs.forEach(function (val, key) {
        internal(thisCFGWrapper).reachOuts.set(key, val);
    });
};

/**
 * Check for the variable has definition reaching in the cfgNode or not
 * @param cfgNode
 * @param variable
 * @returns {boolean}
 */
CFGWrapper.prototype.doesVarReachIn = function (cfgNode, variable) {
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
 * @param variable
 * @returns {Set}
 */
CFGWrapper.prototype.getVarDefsReachIn = function (cfgNode, variable) {
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
 * Represent the CFGWrapper as string
 * @returns {string}
 */
CFGWrapper.prototype.toString = function () {
    'use strict';
    return this.getScope() + '@' + this.getRange();
};

/**
 * Represent Reach Ins at a CFG node as string
 * @param cfgNode
 * @returns {string}
 */
CFGWrapper.prototype.nodeReachInsToString = function (cfgNode) {
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
 */
CFGWrapper.prototype.reachInsToString = function () {
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
 */
CFGWrapper.prototype.cfgToString = function () {
    'use strict';
    return CfgExt.toDotWithLabelId(internal(this).cfg);
};

/**
 * Find Def-Use pairs of current function scope
 */
CFGWrapper.prototype.findDUpairs = function () {
    'use strict';
    internal(this).mapVarDUpairs = DUA.findDUPairs(this);
};

/**
 * Get the Def-Use pairs of current function scope
 * @returns {Map}
 */
CFGWrapper.prototype.getDUpairs = function () {
    'use strict';
    var map = new Map();
    internal(this).mapVarDUpairs.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

module.exports = CFGWrapper;