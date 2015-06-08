/**
 * Simple structure of DUPair
 * Created by chengfulin on 2015/4/15.
 */
var namespace = require('./namespace'),
    internal = namespace(),
    Pair = require('./pair'),
    FlowNode = require('../esgraph').FlowNode;

/**
 * Construct the def-use pair
 * @param {FlowNode} def
 * @param {FlowNode} use
 * @constructor
 */
function DUPair(def, use) {
    'use strict';
    DUPair.validate(def, use);
    Pair.call(this, def, use);
}

/**
 * DUPair inherits from Pair
 * @type {Pair}
 */
DUPair.prototype = Object.create(Pair.prototype, {
    def: {
        get: function () {
            'use strict';
            return this.first;
        }
    },
    use: {
        get: function () {
            'use strict';
            return this.second;
        }
    }
});

/**
 * Check for the def and use are valid or not
 * @param def
 * @param use
 * @returns {boolean}
 * @function
 */
DUPair.isValidDUPair = function (def, use) {
    'use strict';
    return FlowNode.isFlowNode(def) && FlowNode.isFlowNode(use);
};

/**
 * Validate for the value of DUPair
 * @param def
 * @param use
 * @param msg Custom error message, if any
 * @function
 */
DUPair.validate = function (def, use, msg) {
    'use strict';
    if (!DUPair.isValidDUPair(def, use)) {
        throw new Error(msg || 'Invalid DUPair');
    }
};

/**
 * Check for the object is a DUPair or not
 * @param obj
 * @returns {boolean}
 * @function
 */
DUPair.isDUPair = function (obj) {
    "use strict";
    return obj instanceof DUPair;
};

module.exports = DUPair;