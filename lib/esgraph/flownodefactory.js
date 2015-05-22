/**
 * Created by ChengFuLin on 2015/5/22.
 */
var FlowNode = require('./flownode');

function FlowNodeFactory() {
    "use strict";

}

/**
 * Factory method for the FlowNode object
 * @param {string} [type]
 * @param [astNode]
 * @param [parent]
 * @function
 */
FlowNodeFactory.prototype.create = function (type, astNode, parent) {
    "use strict";
    return new FlowNode(type, astNode, parent);
};

var singleton = new FlowNodeFactory();
module.exports = singleton;