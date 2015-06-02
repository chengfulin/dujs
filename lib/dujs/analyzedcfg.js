/**
 * Created by ChengFuLin on 2015/5/26.
 */
var namespace = require('../namespace'),
    internal = namespace(),
    CFGWrapper = require('./index').CFGWrapper,
    DUPair = require('./index').DUPair,
    Path = require('./index').Path;

function AnalyzedCFG() {
    "use strict";
    internal(this)._relatedScopes = [];
    internal(this)._cfgToAnalyzed = null;
    internal(this)._dupairs = [];
    internal(this)._dupaths = [];

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Check for the scope is related
 * @param {Scope} scope
 * @returns {boolean}
 * @function
 */
AnalyzedCFG.prototype.hasScope = function (scope) {
    "use strict";
    return internal(this)._relatedScopes.indexOf(scope) !== -1;
};

/**
 * Add a related scope
 * @param {Scope} scope
 * @function
 */
AnalyzedCFG.prototype.addRelatedScope = function (scope) {
    "use strict";
    if (CFGWrapper.isCFGWrapper(scope) && !this.hasScope(scope)) {
        internal(this)._relatedScopes.push(scope);
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
    if (internal(this)._dupairs.indexOf(dupair) !== -1) {
        found = true;
    } else {
        internal(this)._dupairs.forEach(function (pair) {
            if (pair.toString() === dupair.toString()) {
                found = true;
            }
        });
    }
    return found;
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

/**
 * Check the path has found
 * @param {Path} dupath
 * @returns {boolean}
 * @function
 */
AnalyzedCFG.prototype.hasDUPath = function (dupath) {
    "use strict";
    return internal(this)._dupaths.indexOf(dupath) !== -1;
};

/**
 * Add a Def-Use path
 * @param {Path} dupath
 * @function
 */
AnalyzedCFG.prototype.addDUPath = function (dupath) {
    "use strict";
    if (Path.isPath(dupath) && !this.hasDUPath(dupath)) {
        internal(this)._dupaths.push(dupath);
    }
};

/**
 * Getter and setter for cfg
 */
Object.defineProperty(AnalyzedCFG.prototype, 'cfg', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._cfgToAnalyzed);
    },
    set: function (cfg) {
        "use strict";
        if (cfg instanceof Array && cfg.length === 3) {
            internal(this)._cfgToAnalyzed = [].concat(cfg);
        }
    }
});

/**
 * Getter for the related scopes
 */
Object.defineProperty(AnalyzedCFG.prototype, 'scopes', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._relatedScopes);
    }
});

/**
 * Getter for the found Def-Use pairs in the analyzed CFG
 */
Object.defineProperty(AnalyzedCFG.prototype, 'dupairs', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._dupairs);
    }
});

/**
 * Getter of the found DUPaths in the analyzed CFG
 */
Object.defineProperty(AnalyzedCFG.prototype, 'dupaths', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._dupaths);
    }
});

module.exports = AnalyzedCFG;