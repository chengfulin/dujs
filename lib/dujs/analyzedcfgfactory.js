/**
 * Created by ChengFuLin on 2015/5/27.
 */
var AnalyzedCFG = require('./model');

function AnalyzedCFGFactory() {
    "use strict";
}

/**
 * Factory method of the Model
 * @returns {Model}
 * @function
 */
AnalyzedCFGFactory.prototype.create = function() {
    "use strict";
    return new AnalyzedCFG();
};

var singleton = new AnalyzedCFGFactory();
module.exports = singleton;