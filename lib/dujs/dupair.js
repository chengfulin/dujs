/**
 * Simple structure of DUPair
 * Created by chengfulin on 2015/4/15.
 */

module.exports = DUPair;

/**
 * Create a DUPair with locations of def-use (if only)
 * @param def property of last-def location
 * @param use property of use location
 * @constructor
 */
function DUPair(def, use) {
    this.def = def;
    this.use = use;
}