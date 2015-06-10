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
 * @returns {AnalyzedCFG}
 * @function
 */
AnalyzedCFGFactory.prototype.create = function() {
    "use strict";
    return new AnalyzedCFG();
};

var singleton = new AnalyzedCFGFactory();
module.exports = singleton;