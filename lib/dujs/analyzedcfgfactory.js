/**
 * Created by ChengFuLin on 2015/5/27.
 */
var AnalyzedCFG = require('./analyzedcfg'),
    ScopeWrapper = require('./scopewrapper'),
    CFGExt = require('./cfgext');

function AnalyzedCFGFactory() {
    "use strict";
}

/**
 * Factory method of the AnalyzedCFG
 * @param {ScopeWrapper} [scopeWrapper]
 * @returns {AnalyzedCFG}
 * @function
 */
AnalyzedCFGFactory.prototype.create = function(scopeWrapper) {
    "use strict";
    var analyzedCFG = new AnalyzedCFG();
    if (ScopeWrapper.isScopeWrapper(scopeWrapper)) {
        analyzedCFG.addRelatedScope(scopeWrapper);
        analyzedCFG.cfg = scopeWrapper.cfg;
    }
    return analyzedCFG;
};

var singleton = new AnalyzedCFGFactory();
module.exports = singleton;