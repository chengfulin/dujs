/**
 * Created by chengfulin on 2015/4/20.
 */
require('core-js/fn/map');
var Set = require('../analyses').Set,
    Scope = require('./scope');
module.exports = CFGWrapper;

/**
 * Wrap the CFG
 * @param scope scope name
 * @param cfg CFG built by esgraph
 * @constructor
 * @throws {Error} when scope is invalid
 */
function CFGWrapper(scope, cfg) {
    if (cfg instanceof Array && cfg.length === 3) {
        this.scope = new Scope(scope);
        var thisCFG = this.cfg = [];
        cfg.forEach(function (elem) {
            thisCFG.push(elem);
        });
    }
}

/**
 * Set the Reach Definitions of all nodes of the CFG
 * @param rds Map of reach definitions of all nodes
 */
CFGWrapper.prototype.setReachDefinitions = function (rds) {
    if (rds instanceof Map && !!this.cfg && rds.size === this.cfg[2].length) {
        var thisRDs = this.rds = new Map();
        rds.forEach(function (value, key) {
            if (value instanceof Set) {
                thisRDs.set(key, value);
            }
        });
    }
};