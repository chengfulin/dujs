/**
 * Created by chengfulin on 2015/4/15.
 */
module.exports = Def;

/**
 * Constructor of Def class, initialize a Def object, if valid
 * @param from CFG node id
 * @param range range property of AST node
 * @param scope name of scope (or a number of index)
 * @constructor
 */
function Def(from, range, scope) {
    if (!isNaN(from) && Def.isRange(range) && (typeof scope === 'string' || typeof scope === 'number')) {
        this.from = from;/// CFG node id
        this.range = range;/// range property of AST node
        this.scope = scope;/// name of the scope
    }
}

/**
 * Check the format of the range property
 * @param obj
 * @returns {boolean}
 */
Def.isRange = function (obj) {
    return (obj instanceof Array) && (obj.length === 2) && (typeof obj[0] === 'number') && (typeof obj[1] === 'number') && (obj[0] >= 0) && (obj[1] > obj[0]);
};

/**
 * Represent Def object as a string:
 * e.g., "Def from n1 at [2,5] in Program"
 * @returns {string}
 */
Def.prototype.toString = function () {
    return 'Def @n' + this.from + ' @[' + this.range[0] + ',' + this.range[1] + ']_' + (this.scope === 'Program'? this.scope : (typeof this.scope === 'string'? 'function["' + this.scope + '"]': 'anonymousFunction[' + this.scope + ']'));
};
