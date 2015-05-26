/**
 * Created by ChengFuLin on 2015/5/26.
 */
var CFGWrapper = require('./cfgwrapper');

function CFGWrapperFactory() {
    "use strict";
}

/**
 * Factory method of CFGWrapper
 * @param cfg
 * @param scope
 * @param [parent]
 * @returns {CFGWrapper}
 */
CFGWrapperFactory.prototype.create = function (cfg, scope, parent) {
    "use strict";
    return new CFGWrapper(cfg, scope, parent);
};

var singleton = new CFGWrapperFactory();
module.exports = singleton;