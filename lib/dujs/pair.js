/**
 * Created by ChengFuLin on 2015/5/12.
 */
var namespace = require('../namespace'),
    internal = namespace();

/**
 * Pair of two elements
 * @param firstElem
 * @param secondElem
 * @constructor
 */
function Pair(firstElem, secondElem) {
    'use strict';
    internal(this)._first = firstElem;
    internal(this)._second = secondElem;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Define the property, 'first', and its getter
 */
Object.defineProperty(Pair.prototype, 'first', {
    get: function () {
        'use strict';
        return internal(this)._first;
    }
});

/**
 * Define the property, 'second', and its getter
 */
Object.defineProperty(Pair.prototype, 'second', {
    get: function () {
        'use strict';
        return internal(this)._second;
    }
});

/**
 * Represent this Pair as string
 * @returns {string}
 */
Pair.prototype.toString = function () {
    'use strict';
    return '(' + internal(this)._first + ',' + internal(this)._second + ')';
};

module.exports = Pair;