/**
 * Created by chengfulin on 2015/4/20.
 */
var Set = require('../analyses').Set,
    Scope = require('./scope'),
    Range = require('./range'),
    Var = require('./var'),
    namesapce = require('./namespace'),
    internal = namesapce(),
    WeakMap = require('core-js/es6/weak-map'),
    walkes = require('walkes');
module.exports = CFGWrapper;

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
    internal(this).vars = [];
    internal(this).rds = new WeakMap();
    internal(this).params = [];
    internal(this).children = [];
}

/**
 * Check the cfg is valid or not
 * @param cfg
 * @returns {boolean}
 */
CFGWrapper.isValidCFG = function (cfg) {
    'use strict';
    return cfg instanceof Array &&
        cfg.length === 3 &&
        cfg[0].type === 'entry' &&
        cfg[1].type === 'exit' &&
        !!cfg[0].astNode &&
        !!cfg[1].astNode &&
        (cfg[0].astNode.type === 'Program' ||
        cfg[0].astNode.type === 'FunctionDeclaration' ||
        cfg[0].astNode.type === 'FunctionExpression');
};

/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param cfgWrapper
 * @returns {boolean}
 */
CFGWrapper.isValidParent = function (cfgWrapper) {
    'use strict';
    return CFGWrapper.isCFGWrapper(cfgWrapper) || !cfgWrapper;
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
    if (!CFGWrapper.isValidCFG(cfg) || !CFGWrapper.isValidParent(parent)) {
        throw new Error('Invalid CFGWrapper value');
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
 * Check if the variable is declared in this scope
 * @param variable
 * @returns {boolean}
 */
CFGWrapper.prototype.hasVar = function (variable) {
    'use strict';
    if (Var.isVar(variable)) {
        internal(this).vars.forEach(function (elem) {
            if (elem.toString() === variable.toString()) {
                return true;
            }
        });
    }
    return false;
};

/**
 * Get the variable if existed
 * @param variable
 * @returns {*|Var}
 */
CFGWrapper.prototype.getVar = function (variable) {
    'use strict';
    if (Var.isVar(variable)) {
        internal(this).vars.forEach(function (elem) {
            if (elem.toString() === variable.toString()) {
                return elem;
            }
        });
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
        var varsAdded = [],
            thisCFGWrapper = this;
        initGlobals.forEach(function (elem) {
            Var.validateType(elem);
            if (!thisCFGWrapper.hasVar(elem)) {
                varsAdded.push(elem);
            }
        });
        internal(thisCFGWrapper).vars.concat(varsAdded);
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
                    thisCFGWrapper.setInitGlobalVars(initGlobals);
                },
                FunctionDeclaration: function () {},
                FunctionExpression: function () {}
            });
        });
    }
};