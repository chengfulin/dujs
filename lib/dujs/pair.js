/**
 * Created by ChengFuLin on 2015/5/12.
 */
var namespace = require('./namespace'),
    internal = namespace();

/**
 * Pair of two elements
 * @param firstElem
 * @param secondElem
 * @constructor
 */
function Pair(firstElem, secondElem) {
    'use strict';
    internal(this).first = firstElem;
    internal(this).second = secondElem;
}

/**
 * Define the property, 'first', and its getter
 */
Object.defineProperty(Pair.prototype, 'first', {
    get: function () {
        'use strict';
        return internal(this).first;
    }
});

/**
 * Define the property, 'second', and its getter
 */
Object.defineProperty(Pair.prototype, 'second', {
    get: function () {
        'use strict';
        return internal(this).second;
    }
});

/**
 * Represent this Pair as string
 * @returns {string}
 */
Pair.prototype.toString = function () {
    'use strict';
    return '(' + internal(this).first + ',' + internal(this).second + ')';
};

module.exports = Pair;