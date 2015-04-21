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
 * @throws {Error} when an attribute of Def is invalid
 */
function Def(from, range, scope) {
    Def.validate(from, range, scope);
    this.from = from;/// CFG node id
    this.range = range;/// range property of AST node
    this.scope = new Scope(scope);/// which scope the Def belongs to
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
 * @throws {Error} when the scope has invalid value
 */
Def.isValidScope = function (from, range, scope) {
    Scope.validate(scope);
    if (scope === 'Global' ||
        (typeof scope === 'object' &&
         scope instanceof Scope &&
         scope.toString() === 'Global')) {
        return from === 0;
    }
    return true;
 };

/**
 * Validate the data of Def
 * @param from
 * @param range
 * @param scope
 * @throws {Error} when an attribute of Def is invalid
 */
Def.validate = function (from, range, scope) {
    if (typeof from !== 'number' || (typeof from === 'number' && from < 0)) {
        throw new Error('Def should from the node with valid index');
    }
    if (!Def.isRange(range)) {
        throw new Error('Invalid range of Def');
    }
    if (!Def.isValidScope(from, range, scope)) {
        throw new Error('Def in "Global" scope not from n0');
    }
};
