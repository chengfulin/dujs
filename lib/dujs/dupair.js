/**
 * Simple structure of DUPair
 * Created by chengfulin on 2015/4/15.
 */
var namespace = require('./namespace'),
    internal = namespace(),
    Pair = require('./pair');

/**
 * Construct the def-use pair
 * @param def
 * @param use
 * @constructor
 */
function DUPair(def, use) {
    'use strict';
    DUPair.validate(def, use);
    internal(this).def = def;
    internal(this).use = use;
}

/**
 * DUPair inherits from Pair
 * @type {Pair}
 */
DUPair.prototype = Object.create(Pair.prototype, {
    def: {
        get: function () {
            'use strict';
            return internal(this).def;
        }
    },
    use: {
        get: function () {
            'use strict';
            return internal(this).use;
        }
    }
});

/**
 * Check for the value of DUPair is valid or not. Should support (number, number), (string, string) or (number/string, Pair)
 * @param def
 * @param use
 * @returns {boolean}
 */
DUPair.isValidDUPair = function (def, use) {
    'use strict';
    return ((typeof def === 'number') && (typeof use === 'number' || use instanceof Pair)) ||
        ((typeof def === 'string') && (typeof use === 'string' || use instanceof Pair));
};

/**
 * Validate for the value of DUPair
 * @param def
 * @param use
 * @param msg Custom error message, if any
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

/**
 * Represent this DUPair as string
 * @returns {string}
 */
DUPair.prototype.toString = function () {
    'use strict';
    return '(' + internal(this).def + ',' + internal(this).use + ')';
};

module.exports = DUPair;