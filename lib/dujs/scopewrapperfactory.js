/**
 * Created by ChengFuLin on 2015/5/26.
 */
var ScopeWrapper = require('./scope'),
    Scope = require('./scope'),
    namespace = require('../namespace'),
    internal = namespace();

function ScopeWrapperFactory() {
    "use strict";

    internal(this)._numOfAnonymousFunctionScopes = 0;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

Object.defineProperty(ScopeWrapperFactory.prototype, 'numOfAnonymousFunctionScopes', {
    get: function () {
        "use strict";
        return internal(this)._numOfAnonymousFunctionScopes;
    },
    set: function (num) {
        "use strict";
        if (typeof num === 'number' && num >= 0) {
            internal(this)._numOfAnonymousFunctionScopes = num;
        }
    }
});

/**
 * Reset the counter of number of anonymous function Scope
 * @function
 */
ScopeWrapperFactory.prototype.resetAnonymousFunctionScopeCounter = function () {
    "use strict";
    internal(this)._numOfAnonymousFunctionScopes = 0;
};

/**
 * Factory method of Scope
 * @param cfg
 * @param scope
 * @returns {Scope}
 */
ScopeWrapperFactory.prototype.create = function (cfg, scope) {
    "use strict";
    return new ScopeWrapper(cfg, scope);
};

/**
 * Create global scope wrapper
 * @param cfg
 * @returns {Scope}
 * @function
 */
ScopeWrapperFactory.prototype.createGlobalScopeWrapper = function (cfg) {
    "use strict";
    return new ScopeWrapper(cfg, Scope.GLOBAL_SCOPE);
};

/**
 * Create program scope wrapper
 * @param cfg
 * @returns {Scope}
 * @function
 */
ScopeWrapperFactory.prototype.createProgramScopeWrapper = function (cfg) {
    "use strict";
    return new ScopeWrapper(cfg, Scope.PROGRAM_SCOPE);
};

/**
 * Factory method for Scope of function scope
 * @param cfg
 * @returns {Scope}
 * @function
 */
ScopeWrapperFactory.prototype.createFunctionScopeWrapper = function (cfg, funName) {
    "use strict";
    return new ScopeWrapper(cfg, new Scope(funName));
};

/**
 * Factory method for Scope of anonymous function scope
 * @param cfg
 * @returns {Scope}
 * @function
 */
ScopeWrapperFactory.prototype.createAnonymousFunctionScopeWrapper = function (cfg) {
    "use strict";
    return new ScopeWrapper(cfg, new Scope(internal(this)._numOfAnonymousFunctionScopes++));
};

var singleton = new ScopeWrapperFactory();
module.exports = singleton;