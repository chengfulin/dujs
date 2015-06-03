/**
 * Created by ChengFuLin on 2015/5/26.
 */
var namespace = require('../namespace'),
    internal = namespace(),
    ScopeWrapper = require('./index').ScopeWrapper,
    DUPair = require('./index').DUPair,
    CFGExt = require('./index').CFGExt,
    Map = require('core-js/es6/map');

/**
 * Create default AnalyzedCFG object
 * @constructor
 */
function AnalyzedCFG() {
    "use strict";
    internal(this)._scopeWrappers = [];
    internal(this)._cfg = null;
    internal(this)._dupairs = [];
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
    return internal(this)._dupairs.indexOf(dupair) !== -1;
};

/**
 * Add a Def-Use pair
 * @param {DUPair} dupair
 * @function
 */
AnalyzedCFG.prototype.addDUPair = function (dupair) {
    "use strict";
    if (DUPair.isDUPair(dupair) && !this.hasDUPair(dupair)) {
        internal(this)._dupairs.push(dupair);
    }
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
        return [].concat(internal(this)._dupairs);
    }
});

module.exports = AnalyzedCFG;