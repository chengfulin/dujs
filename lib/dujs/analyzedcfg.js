/**
 * Created by ChengFuLin on 2015/5/26.
 */
var namespace = require('../namespace'),
    internal = namespace(),
    ScopeWrapper = require('./scopewrapper'),
    DUPair = require('./dupair'),
    CFGExt = require('./cfgext'),
    Map = require('core-js/es6/map');

/**
 * Create default AnalyzedCFG object
 * @constructor
 */
function AnalyzedCFG() {
    "use strict";
    internal(this)._scopeWrappers = [];
    internal(this)._cfg = null;
    internal(this)._dupairs = new Map(); /// (Var, Set)
    internal(this)._reachIns = new Map(); /// (FlowNode, Set)
    internal(this)._reachOuts = new Map(); /// (FlowNode, Set)

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Check for the object is an AnalyzedCFG
 * @param obj
 * @returns {boolean}
 * @static
 * @function
 */
AnalyzedCFG.isAnalyzedCFG = function (obj) {
    "use strict";
    return obj instanceof AnalyzedCFG;
};

/**
 * Check for the scope is related
 * @param {ScopeWrapper} scope
 * @returns {boolean}
 * @function
 */
AnalyzedCFG.prototype.hasScope = function (scope) {
    "use strict";
    return internal(this)._scopeWrappers.indexOf(scope) !== -1;
};

/**
 * Add a related scope
 * @param {ScopeWrapper} scope
 * @function
 */
AnalyzedCFG.prototype.addRelatedScope = function (scope) {
    "use strict";
    if (ScopeWrapper.isScopeWrapper(scope) && !this.hasScope(scope)) {
        internal(this)._scopeWrappers.push(scope);
    }
};

/**
 * Check for DUPair has found
 * @param {DUPair} dupair
 * @returns {boolean}
 * @function
 */
AnalyzedCFG.prototype.hasDUPair = function (dupair) {
    "use strict";
    var found = false;
    if (DUPair.isDUPair(dupair)) {
        internal(this)._dupairs.forEach(function (pairs) {
            pairs.forEach(function (pair) {
                if (pair.def === dupair.def && pair.use === dupair.use) {
                    found = true;
                }
            });
        });
    }
    return found;
};

Object.defineProperty(AnalyzedCFG.prototype, 'cfg', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._cfg);
    },
    set: function (cfg) {
        "use strict";
        if (CFGExt.isValidCFG(cfg)) {
            internal(this)._cfg = [].concat(cfg);
        }
    }
});

Object.defineProperty(AnalyzedCFG.prototype, 'scopeWrappers', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._scopeWrappers);
    }
});

Object.defineProperty(AnalyzedCFG.prototype, 'dupairs', {
    get: function () {
        "use strict";
        var map = new Map();
        internal(this)._dupairs.forEach(function (val, key) {
            map.set(key, val);
        });
        return map;
    },
    set: function (dupairs) {
        "use strict";
        if (dupairs instanceof Map) {
            var currentAnalysisItem = this;
            dupairs.forEach(function (pairs, variable) {
                internal(currentAnalysisItem)._dupairs.set(variable, pairs);
            });
        }
    }
});

module.exports = AnalyzedCFG;