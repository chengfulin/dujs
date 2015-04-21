/**
 * Created by chengfulin on 2015/4/15.
 */
var Scope = require('./scope');
module.exports = Def;

/**
 * Constructor of Def class, initialize a Def object, if valid
 * @param from CFG node id
 * @param range range property of AST node
 * @param scope name of scope (or a number of index)
 * @constructor
 */
function Def(from, range, scope) {
    if (Def.validate(from, range, scope)) {
        this.from = from;/// CFG node id
        this.range = range;/// range property of AST node
        this.scope = new Scope(scope);/// which scope the Def belongs to
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
    return 'Def @n' + this.from + ' @[' + this.range[0] + ',' + this.range[1] + ']_' + this.scope;
};

/**
 * Basically check the scope
 * @param from
 * @param range
 * @param scope
 * @returns {boolean}
 */
Def.isValidScope = function (from, range, scope) {
   if ((typeof scope === 'object' && scope instanceof Scope) || scope === 'Program') {
       return true;
   }
   if (scope === 'Global') {
       return from === 0;/// Def in "Global" scope should from n0
   }
   return typeof scope === 'string' || (typeof scope === 'number' && scope >= 0);
};

/**
 * Return the validation result of all parameters
 * @param from
 * @param range
 * @param scope
 * @returns {boolean}
 */
Def.validate = function (from, range, scope) {
    return typeof from === 'number' && Def.isRange(range) && Def.isValidScope(from, range, scope);
};
