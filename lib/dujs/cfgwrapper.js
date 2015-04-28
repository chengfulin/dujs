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
            cfg[0].astNode.type === 'FunctionDeclaration' ||
            cfg[0].astNode.type === 'FunctionExpression';

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
                        thisCFGWrapper.setChildren();
                    }
                },
                FunctionDeclaration: function (node) {
                    if (cfgNode.type === 'entry') {
                        thisCFGWrapper.setChildren();
                        node.params.forEach(function (param) {
                            internal(thisCFGWrapper).vars.set(
                                param.name,
                                new Var(
                                    param.name,
                                    param.range,
                                    internal(thisCFGWrapper).scope,
                                    null
                                )
                            );
                            internal(thisCFGWrapper).params.set(
                                param.name,
                                internal(thisCFGWrapper).vars.get(param.name)
                            );
                        });
                    }
                },
                FunctionExpression: function (node) {
                    if (cfgNode.type === 'entry') {
                        thisCFGWrapper.setChildren();
                        node.params.forEach(function (param) {
                            internal(thisCFGWrapper).vars.set(
                                param.name,
                                new Var(
                                    param.name,
                                    param.range,
                                    internal(thisCFGWrapper).scope,
                                    null
                                )
                            );
                            internal(thisCFGWrapper).params.set(
                                param.name,
                                internal(thisCFGWrapper).vars.get(param.name)
                            );
                        });
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
 * Setter for child scopes
 */
CFGWrapper.prototype.setChildren = function () {
    'use strict';
    if (!!internal(this).cfg) {
        var entryPoint = internal(this).cfg[0].astNode,
            currentCFGWrapper = this;
        walkes(entryPoint.body, {
            FunctionDeclaration: function (node, recurse) {
                if (!currentCFGWrapper.hasVarWithName(node.id.name)) {
                    internal(currentCFGWrapper).children.set(
                        node.id.name,
                        new CFGWrapper(
                            CfgExt.getCFG(node),
                            new Scope(node.id.name),
                            currentCFGWrapper)
                    );
                    internal(currentCFGWrapper).vals.set(
                        node.id.name,
                        new Var(node.id.name, node.range, new Scope(node.id.name))
                    );
                }
            },
            FunctionExpression: function (node, recurse) {
                    internal(currentCFGWrapper).children.set(
                        node.id.name,
                        new CFGWrapper(
                            CfgExt.getCFG(node),
                            new Scope(internal(currentCFGWrapper).numOfAnonymousInnerFunctions),
                            currentCFGWrapper)
                    );
                    internal(currentCFGWrapper).numOfAnonymousInnerFunctions += 1;
            },
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

module.exports = CFGWrapper;