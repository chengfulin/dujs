/**
 * Used to help identify the definition of variables having the same definition
 * Created by chengfulin on 2015/4/22.
 */
require('core-js/fn/map');
var Set = require('../analyses').Set,
    Var = require('./var');
module.exports = VarTable;

/**
 * Create a VarTable, could be initialized with an array of Vars, or another VarTable
 * @param initial initialization
 * @constructor
 * @throws {Error} when initialized with array of Vars but there exists one not Var type
 */
function VarTable(initial) {
    this.variables = new Set();
    this.table = new Map();
    var thisTable = this;
    if (typeof initial === 'object' && initial instanceof Array) {
        initial.forEach(function (elem, index, arr) {
            VarTable.validate(elem);
            thisTable.variables.add(arr[index]);
            thisTable.table.set(arr[index], new Set());
        });
    } else if (typeof initial === 'object' && initial instanceof VarTable) {
        initial.forEach(function (val, key) {
            thisTable.variables.add(key);
            thisTable.table.set(key, val);
        });
    }
}

/**
 * Check if the param is Var
 * @param param reference to the Var
 * @returns {boolean}
 */
VarTable.isParamVar = function (param) {
    return typeof param === 'object' && param instanceof Var;
};

/**
 * Validation for Var type
 * @param variable reference to the Var
 * @throws {Error} when the variable is not Var type
 */
VarTable.validate = function (variable) {
    if (!VarTable.isParamVar(variable)) {
        throw new Error('Incorrect type of param as Var for processing');
    }
};

/**
 * Check is the table has this variable
 * @param variable reference to the Var
 * @returns {boolean}
 * @throws {Error} when the variable is not a Var
 */
VarTable.prototype.has = function (variable) {
    VarTable.validate(variable);
    return !!this.variables.has(variable);
};

/**
 * Add a variable to the table
 * @param variable reference to the Var
 * @throws {Error} when the variable is not a Var
 */
VarTable.prototype.add = function (variable) {
    if (!this.has(variable)) {
        this.variables.add(variable);
        this.table.set(variable, new Set());
    }
};

/**
 * Get the set of Vars having same Def of the variable
 * @param variable reference to the Var
 * @returns {undefined|Set} undefined if the variable is not existed
 * @throws {Error} when the variable is not a Var
 */
VarTable.prototype.get = function (variable) {
    if (this.has(variable)) {
        return new Set(this.table.get(variable));
    }
};

/**
 * Delete the variable from the table
 * @param variable reference to the Var
 * @throws {Error} when the variable is not a Var
 */
VarTable.prototype.delete = function (variable) {
    if (this.has(variable)) {
        this.variables.delete(variable);
        this.table.delete(variable);
    }
};

/**
 * Add a Var to the set of Vars having the same Def of the variable
 * @param variable reference to the Var
 * @param sameDefVar reference to the Var having same Def
 * @throws {Error} when one of the parameters is not a Var, or the variable doesn't existed
 */
VarTable.prototype.addSameDefVar = function (variable, sameDefVar) {
    VarTable.validate(variable);
    VarTable.validate(sameDefVar);

    var sameDefVars = new Set();
    if (!this.has(variable)) {
        throw new Error('Accessing not existed Var');
    } else if (sameDefVar.toString() !== variable.toString()) {
        sameDefVars = this.table.get(variable);
        sameDefVars.add(sameDefVar);
        this.table.set(variable, sameDefVars);
    }
};

/**
 * Remove a Var from the set of Vars having the same Def of the variable
 * @param variable reference to the Var
 * @param removeVar reference to the Var in the set of Vars having the same Def
 * @throws {Error} when one of the parameters is not a Var, or the variable doesn't existed
 */
VarTable.prototype.removeSameDefVar = function (variable, removeVar) {
    VarTable.validate(variable);
    VarTable.validate(removeVar);

    if (!this.has(variable)) {
        throw new Error('Accessing not existed Var');
    }
    var sameDefVars = this.table.get(variable);
    sameDefVars.delete(removeVar);
    this.table.set(variable, new Set(sameDefVars));
};

/**
 * Check if there is a Var in the set of Vars having the same Def of the variable
 * @param variable reference to the Var
 * @param sameDefVar reference to the Var in the set of Vars having the same Def
 * @returns {boolean}
 * @throws {Error} when one of the parameters is not a Var, or the variable doesn't existed
 */
VarTable.prototype.hasSameDefVar = function (variable, sameDefVar) {
    VarTable.validate(variable);
    VarTable.validate(sameDefVar);

    if (!this.has(variable)) {
        throw new Error('Accessing not existed Var');
    }
    return this.table.get(variable).has(sameDefVar);
};

