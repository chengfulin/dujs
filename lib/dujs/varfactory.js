/*
 * Simple factory for Var
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-27
 */
var Var = require('./var');

/**
 * Factory for Var
 * @constructor
 */
function VarFactory() {
}

/**
 * Factory method for creating a variable
 * @param {String} name Name of the variable
 * @returns {Object} Create variable
 * @throws {Object} When failed to create a Var
 */
VarFactory.prototype.create = function (name) {
    'use strict';
    return new Var(name);
};

var factory = new VarFactory();
module.exports = factory;