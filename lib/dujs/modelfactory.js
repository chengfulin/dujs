/*
 * ModelFactory module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-06
 */
var Model = require('./model');

/**
 * ModelFactory
 * @constructor
 */
function ModelFactory() {
}

/* start-public-methods */
/**
 * Factory method of Model
 * @returns {Model}
 */
ModelFactory.prototype.create = function() {
    "use strict";
    return new Model();
};
/* end-public-methods */

var facotry = new ModelFactory();
module.exports = facotry;