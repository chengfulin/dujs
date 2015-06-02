/**
 * Created by ChengFuLin on 2015/5/26.
 */
var ScopeWrapper = require('./scopewrapper'),
    Scope = require('./scope');

function ScopeWrapperFactory() {
    "use strict";
}

/**
 * Factory method of ScopeWrapper
 * @param cfg
 * @param scope
 * @returns {ScopeWrapper}
 */
ScopeWrapperFactory.prototype.create = function (cfg, scope) {
    "use strict";
    return new ScopeWrapper(cfg, scope);
};

/**
 * Create global scope wrapper
 * @param cfg
 * @returns {ScopeWrapper}
 * @function
 */
ScopeWrapperFactory.prototype.createGlobalScopeWrapper = function (cfg) {
    "use strict";
    return new ScopeWrapper(cfg, Scope.GLOBAL_SCOPE);
};

/**
 * Create program scope wrapper
 * @param cfg
 * @returns {ScopeWrapper}
 * @function
 */
ScopeWrapperFactory.prototype.createProgramScopeWrapper = function (cfg) {
    "use strict";
    return new ScopeWrapper(cfg, Scope.PROGRAM_SCOPE);
};

var singleton = new ScopeWrapperFactory();
module.exports = singleton;