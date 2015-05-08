/**
 * Simple structure of DUPair
 * Created by chengfulin on 2015/4/15.
 */
var namespace = require('./namespace'),
    internal = namespace();


module.exports = DUPair;

/**
 * Create a DUPair with locations of def-use (if only)
 * @param def property of last-def location
 * @param use property of use location
 * @constructor
 */
function DUPair(def, use) {
    'use strict';
    internal(this).defCFGId = def;
    internal(this).useCFGId = use;
}

DUPair.prototype.toString = function () {
    'use strict';
    return '(' + internal(this).defCFGId + ',' + internal(this).useCFGId + ')';
};