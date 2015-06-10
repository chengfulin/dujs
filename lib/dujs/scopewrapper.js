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
    //RDs = require('./reachdefinitions'),
    //DUA = require('./dua'),
    walkes = require('walkes'),
    VarDef = require('./vardef'),
    //vardefFactory = require('./vardeffactory'),
    //defFactory = require('./deffactory'),
    varFactory = require('./varfactory'),
    rangeFactory = require('./rangeFactory');
    //FlowNode = require('../esgraph').FlowNode;

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
    //internal(this).reachIns = new Map();
    //internal(this).reachOuts = new Map();
    internal(this)._params = new Map(); /// (name, Var)
    internal(this)._paramNames = []; /// [names]
    internal(this)._children = new Map(); /// (Range text, ScopeWrapper)
    internal(this)._def = null;
    //internal(this).def = defFactory.create(
    //    (!!internal(this)._parent)? internal(this)._parent.cfg[0] : internal(this)._cfg[0],
    //    Def.FUNCTION_TYPE,
    //    internal(this)._range,
    //    (!!internal(this)._parent)? internal(this)._parent.scope : Scope.GLOBAL_SCOPE
    //);
    //internal(this).mapVarDUpairs = new Map();

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
        walkes(internal(this)._cfg[0].astNode, {
            VariableDeclaration: function (node, recurse) {
                node.declarations.forEach(function (declarator) {
                    recurse(declarator);
                });
            },
            VariableDeclarator: function (node) {
                internal(thisScope)._vars.set(
                    node.id.name,
                    varFactory.create(
                        node.id.name,
                        node.id.range,
                        internal(thisScope)._scope,
                        null
                    )
                );
            }
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
///**
// * Getter of reach definitions of this CFG
// * @returns {*}
// * @function
// */
//ScopeWrapper.prototype.getReachIns = function () {
//    'use strict';
//    var map = new Map();
//    internal(this).reachIns.forEach(function (val, key) {
//        map.set(key, val);
//    });
//    return map;
//};
//
///**
// * Getter of reaching out definitions of this CFG
// * @returns {*}
// * @function
// */
//ScopeWrapper.prototype.getReachOuts = function () {
//    'use strict';
//    var map = new Map();
//    internal(this).reachOuts.forEach(function (val, key) {
//        map.set(key, val);
//    });
//    return map;
//};

/**
 * Add a child to this ScopeWrapper
 * @param child
 * @throws {Error} when child is not a ScopeWrapper
 * @function
 */
ScopeWrapper.prototype.addChild = function (child) {
    'use strict';
    if (ScopeWrapper.isScopeWrapper(child) && Range.isRange(child.range) && !internal(this)._children.has(child.range.toString())) {/// if the parameter is valid, do
        //var rdsAtEntry = internal(this).reachIns.get(internal(this)._cfg[0]) || new Set();
        if (child.scope.type === Scope.FUNCTION_TYPE) {
            //rdsAtEntry.add(
            //    vardefFactory.create(
            //        varToFun,
            //        child.getDef()
            //    )
            //);
            internal(this)._children.set(child.range.toString(), child);
            child.parent = this;
        } else if (child.scope.type === Scope.ANONYMOUS_FUN_TYPE) {
            /// for function expression, just add as a child
            internal(this)._children.set(child.range.toString(), child);
            child.parent = this;
        }
        //internal(this).reachIns.set(internal(this)._cfg[0], rdsAtEntry);
    }
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

///**
// * Initialize reach definitions (intra-procedural)
// * @param rdsAddedToEntry Additional RDs of entry node
// * @function
// */
//ScopeWrapper.prototype.initRDs = function (rdsAddedToEntry) {
//    'use strict';
//    var entryRDs = internal(this).reachIns.get(internal(this)._cfg[0]) || new Set(),
//        resultRDs,
//        thisCFGWrapper = this;
//    if (!!rdsAddedToEntry && rdsAddedToEntry instanceof Set) {
//        var validRDs = false;
//        rdsAddedToEntry.forEach(function (elem) {
//            validRDs = VarDef.isVarDef(elem);
//        });
//        if (validRDs) {
//            entryRDs = Set.union(entryRDs, rdsAddedToEntry);
//        }
//    }
//    resultRDs = RDs.findReachDefinitions(this, entryRDs);
//    resultRDs.inputs.forEach(function (val, key) {
//        internal(thisCFGWrapper).reachIns.set(key, val);
//    });
//    resultRDs.outputs.forEach(function (val, key) {
//        internal(thisCFGWrapper).reachOuts.set(key, val);
//    });
//};
//
///**
// * Update Reach Definitions (in & out) by adding extra definitions at some point, then re-find the RDs and union the result with the old one
// * @param node The node start to update
// * @param {Set} addReachIns Extra definitions (VarDef) would reach in
// * @function
// */
//ScopeWrapper.prototype.updateRDs = function (node, addReachIns) {
//    'use strict';
//    var originalRDs = internal(this).reachIns.get(node) || new Set(),
//        resultRDs,
//        thisCFGWrapper = this;
//    resultRDs = RDs.findReachDefinitions(this, Set.union(originalRDs, addReachIns), node);
//    /// update
//    resultRDs.inputs.forEach(function (val, key) {
//        internal(thisCFGWrapper).reachIns.set(key, Set.union(internal(thisCFGWrapper).reachIns.get(key), val));
//    });
//    resultRDs.outputs.forEach(function (val, key) {
//        internal(thisCFGWrapper).reachOuts.set(key, Set.union(internal(thisCFGWrapper).reachOuts.get(key), val));
//    });
//};
//
///**
// * Check for the variable has definition reaching in the cfgNode or not
// * @param cfgNode
// * @param {Var} variable
// * @returns {boolean}
// * @function
// */
//ScopeWrapper.prototype.doesVarReachIn = function (cfgNode, variable) {
//    'use strict';
//    var found = false,
//        setOfRDs = internal(this).reachIns.get(cfgNode);
//    if (!!setOfRDs) {
//        setOfRDs.forEach(function (elem) {
//            if (elem.variable.toString() === variable.toString()) {
//                found = true;
//            }
//        });
//    }
//    return found;
//};
//
///**
// * Get the definitions of a Var that reaches in the node
// * @param cfgNode
// * @param {Var} variable
// * @returns {Set}
// * @function
// */
//ScopeWrapper.prototype.getVarDefsReachIn = function (cfgNode, variable) {
//    'use strict';
//    var varDefs = new Set(),
//        setOfRDs = internal(this).reachIns.get(cfgNode);
//    if (!!setOfRDs) {
//        setOfRDs.forEach(function (elem) {
//            if (elem.variable.toString() === variable.toString()) {
//                varDefs.add(elem);
//            }
//        });
//    }
//    return varDefs;
//};

/**
 * Represent the ScopeWrapper as string
 * @returns {string}
 * @function
 */
ScopeWrapper.prototype.toString = function () {
    'use strict';
    return internal(this)._scope + '_Entry@n' + internal(this)._cfg[0].cfgId;
};

///**
// * Represent Reach Ins at a CFG node as string
// * @param cfgNode
// * @returns {string}
// * @function
// */
//ScopeWrapper.prototype.nodeReachInsToString = function (cfgNode) {
//    'use strict';
//    var thisCFGWrapper = this,
//        label = cfgNode.label || cfgNode.cfgId,
//        rds = internal(thisCFGWrapper).reachIns.get(cfgNode),
//        text = '';
//    if (!!rds) {
//        text += 'ReachIn(' + label + ') = [';
//        var currentVarInReachIn, setOfVarDefs;
//        rds.forEach(function (varDef, indexOuter) {
//            if (currentVarInReachIn !== varDef.variable) {
//                currentVarInReachIn = varDef.variable;
//                setOfVarDefs = thisCFGWrapper.getVarDefsReachIn(cfgNode, currentVarInReachIn);
//
//                text += ((indexOuter === 0)? '\n{' : ',\n{') + currentVarInReachIn + ': [';
//                setOfVarDefs.forEach(function (elem, indexInner) {
//                    text += ((indexInner === 0) ? '' : ', ') + elem.definition;
//                });
//                text += ']}';
//            }
//        });
//        text += '\n]';
//    }
//    return text;
//};
//
///**
// * Represent ReachIns of all CFG nodes as string
// * @returns {string}
// * @function
// */
//ScopeWrapper.prototype.reachInsToString = function () {
//    'use strict';
//    var thisCFGWrapper = this,
//        text = '';
//    internal(thisCFGWrapper).cfg[2].forEach(function (node, index) {
//        text += ((index === 0)? '' : '\n') + thisCFGWrapper.nodeReachInsToString(node);
//    });
//    return text;
//};
//
///**
// * Convert CFG of this function scope to dot format string
// * @returns {*|string}
// * @function
// */
//ScopeWrapper.prototype.cfgToString = function () {
//    'use strict';
//    return CfgExt.toDotWithLabelId(internal(this)._cfg);
//};
//
///**
// * Find Def-Use pairs of current function scope
// * @function
// */
//ScopeWrapper.prototype.findDUpairs = function () {
//    'use strict';
//    internal(this).mapVarDUpairs = DUA.findDUPairs(this);
//};
//
///**
// * Get the Def-Use pairs of current function scope
// * @returns {Map}
// * @function
// */
//ScopeWrapper.prototype.getDUpairs = function () {
//    'use strict';
//    var map = new Map();
//    internal(this).mapVarDUpairs.forEach(function (val, key) {
//        map.set(key, val);
//    });
//    return map;
//};
//
///**
// * Add reach in definitions to entry node
// * @param {Set|Array} reachIns
// * @function
// */
//ScopeWrapper.prototype.addReachInEntry = function (reachIns) {
//    "use strict";
//    var inputVarDef = (reachIns instanceof Set)? reachIns : ((reachIns instanceof Array)? new Set(reachIns) : null);
//    if (!!reachIns) {
//        var valid = true;
//        reachIns.forEach(function (elem) {
//            if (!VarDef.isVarDef(elem)) {
//                valid = false;
//            }
//        });
//        /// union original existed if any
//        reachIns = (!!internal(this).reachIns.get(internal(this)._cfg[0]))? Set.union(internal(this).reachIns.get(internal(this)._cfg[0]), reachIns) : reachIns;
//        if (valid) {
//            internal(this).reachIns.set(internal(this)._cfg[0], reachIns);
//        }
//    }
//};

module.exports = ScopeWrapper;