/**
 * Model of variable
 * Created by chengfulin on 2015/4/22.
 */
var Scope = require('./scope');
module.exports = Var;

/**
 * Create a model of variable
 * @param name variable name
 * @param scope the scope where the variable belongs to
 * @constructor
 * @throws {Error} when name is not string or invalid scope
 */
function Var(name, scope) {
    Var.validate(name);
    this.scope = new Scope(scope);
    this.name = name;
    this.liveWith = null;/// If this variable is an object property, liveWith = the Var represents the object
}

/**
 * Check the name is a string or not
 * @param name
 * @returns {boolean}
 */
Var.isValidName = function (name) {
    return typeof name === 'string';
};

/**
 * Validate variable name is valid
 * @param name
 * @throws {Error} when the name is invalid
 */
Var.validate = function (name) {
    if (!Var.isValidName(name)) {
        throw new Error('Variable name should be string');
    }
};

/**
 * Represent the object as string
 * @returns {string}
 */
Var.prototype.toString = function () {
   return this.name + '@' + this.scope;
};

/**
 * Set a Var which this Var lives with
 * @param variable
 * @throws {Error} when the variable is not a Var
 */
Var.prototype.live = function (variable) {
    if (typeof variable !== 'object' || !(variable instanceof Var)) {
        throw new Error('Var cannot live with a non-Var');
    }
    this.liveWith = variable;
};