/**
 * Extensions of CFG
 * Created by chengfulin on 2015/4/15.
 */
var esgraph = require('esgraph'),
    esprima = require('esprima');
/**
 * Get the CFG of the script code
 * @param code
 * @returns CFG
 */
module.exports.getCFG = function (code) {
    'use strict';
    var ast = esprima.parse(code);
    return addCFGIds(esgraph(ast));
}

/**
 * Add Id to each CFG node
 * @param cfg the CFG to be modified
 * @returns CFG
 */
function addCFGIds(cfg) {
    'use strict';
    for(var index = 0; index < cfg[2].length; ++index) {
        (cfg[2][index]).cfgId = index;
    }
    return cfg;
}