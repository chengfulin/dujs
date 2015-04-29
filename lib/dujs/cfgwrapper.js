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
    walkes = require('walkes');

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
    internal(this).rds = new Map();
    internal(this).params = new Map();
    internal(this).children = new Map();
    internal(this).numOfAnonymousInnerFunctions = 0;
    internal(this).def = new Def(
        internal(this).cfg[0].cfgId,
        Def.FUNCTION_TYPE,
        internal(this).range,
        (!!internal(this).parent)? internal(this).parent.getScope() : Scope.PROGRAM_SCOPE
    );
}

/**
 * Check the cfg is valid or not
 * @param cfg
 * @returns {boolean}
 */
CFGWrapper.isValidCFG = function (cfg) {
    'use strict';
    var isArr = (cfg instanceof Array) && cfg.length === 3,
        isCFG =
            cfg[0].type === 'entry' &&
            cfg[1].type === 'exit' &&
            !!cfg[0].astNode &&
            !cfg[1].astNode,
        hasStartPoint =
            cfg[0].astNode.type === 'Program' ||
            cfg[0].astNode.type === 'BlockStatement';

    return isArr && isCFG && hasStartPoint;
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
 * @throws {Error} when a value is invalid
 */
CFGWrapper.validate = function (cfg, scope, parent) {
    'use strict';
    if (!CFGWrapper.isValidCFG(cfg)) {
        throw new Error('Invalid CFGWrapper value (CFG)');
    }
    if (!CFGWrapper.isValidParent(parent)) {
        throw new Error('Invalid CFGWrapper value (parent scope)');
    }
    try {
        Scope.validateType(scope);
        Scope.validate(scope);
    } catch (err) {
        throw new Error('Invalid CFGWrapper value');
    }
};

/**
 * Validate the object is a CFGWrapper or not
 * @param obj
 * @throws {Error} when the object is not a CFGWrapper
 */
CFGWrapper.validateType = function (obj) {
    'use strict';
    if (!CFGWrapper.isCFGWrapper(obj)) {
        throw new Error('Not a CFGWrapper');
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
 * @param initGlobals
 * @throws {Error} when an element is not a Var
 */
CFGWrapper.prototype.setInitGlobalVars = function (initGlobals) {
    'use strict';
    if (initGlobals instanceof Array || initGlobals instanceof Set) {
        var varsAdded = new Map(),
            thisCFGWrapper = this,
            allString = false,
            allVar = false;
        initGlobals.forEach(function (elem) {
            allString = (typeof elem === 'string');
            allVar = Var.isVar(elem);
        });
        initGlobals.forEach(function (elem) {
            if (allVar && !thisCFGWrapper.hasVarWithName(elem.getName())) {
                varsAdded.set(elem.getName(), elem);
            } else if (allString && !thisCFGWrapper.hasVarWithName(elem)) {
                varsAdded.set(elem, new Var(elem, [0,1], Scope.GLOBAL_SCOPE, null));
            }
        });
        varsAdded.forEach(function (val, key) {
            internal(thisCFGWrapper).vars.set(key, val);
        });
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
                FunctionDeclaration: function () {},
                FunctionExpression: function () {},
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(function (declarator) {
                        recurse(declarator);
                    });
                },
                VariableDeclarator: function (node) {
                    if (node.init.type !== 'FunctionExpression') {
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
    if (params instanceof Array || params instanceof Set) {
        var paramToAdd = [],
            thisCFGWrapper = this,
            rdsOfEntry = internal(thisCFGWrapper).rds.get(internal(thisCFGWrapper).cfg[0]) || new Map();
        params.forEach(function (elem) {
            Var.validateType(elem);
            paramToAdd.push(elem);
        });
        paramToAdd.forEach(function (param) {
            internal(thisCFGWrapper).vars.set(param.getName(), param);
            internal(thisCFGWrapper).params.set(param.getName(), param);
            rdsOfEntry.set(param, new Set());
        });
        if (rdsOfEntry.size > 0) {
            internal(thisCFGWrapper).rds.set(internal(thisCFGWrapper).cfg[0], rdsOfEntry);
        }
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
 * @returns {Range}
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
 * Getter of reach definitions of this CFG
 * @returns {*}
 */
CFGWrapper.prototype.getReachDefinitions = function () {
    'use strict';
    var map = new Map();
    internal(this).rds.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

/**
 * Getter of num of anonymous inner functions
 * @returns {number}
 */
CFGWrapper.prototype.getNumOfAnonymousInnerFunctions = function () {
    'use strict';
    return internal(this).numOfAnonymousInnerFunctions;
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
 * @param exprAssignedVar
 * @throws {Error} when child is not a CFGWrapper or exprAssignedVar is not a Var
 */
CFGWrapper.prototype.addChild = function (child, exprAssignedVar) {
    'use strict';
    CFGWrapper.validateType(child);
    var rdsAtEntry = internal(this).rds.get(internal(this).cfg[0]) || new Map();
    if (!exprAssignedVar && child.getScope().getType() === Scope.FUNCTION_TYPE) {
        var varToFun = new Var(
            child.getScope().getValue(),
            child.getRange(),
            child.getScope(),
            null
        );
        internal(this).vars.set(
            varToFun.getName(),
            varToFun
        );
        rdsAtEntry.set(varToFun, new Set([child.getDef()]));
        internal(this).children.set(child.getDef(), child);
    } else if (!!exprAssignedVar && child.getScope().getType() === Scope.ANONYMOUS_FUN_TYPE) {
        Var.validateType(exprAssignedVar);
        internal(this).vars.set(exprAssignedVar.getName(), exprAssignedVar);
        rdsAtEntry.set(exprAssignedVar, new Set([child.getDef()]));
        internal(this).children.set(child.getDef(), child);
    }
    internal(this).rds.set(internal(this).cfg[0], rdsAtEntry);
};

/**
 * Getter of children
 * @returns {Map}
 */
CFGWrapper.prototype.getChildren = function () {
    'use strict';
    var map = new Map();
    internal(this).children.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

/**
 * Getter of parameters
 * @returns {Map}
 */
CFGWrapper.prototype.getParams = function () {
    'use strict';
    var map = new Map();
    internal(this).params.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

module.exports = CFGWrapper;