/**
 * Created by ChengFuLin on 2015/5/13.
 */
var Pair = require('./pair');

function PairFactory() {
    'use strict';
}

/**
 * Creator of Pair object
 * @param first
 * @param second
 * @returns {Pair}
 */
PairFactory.prototype.create = function (first, second) {
    'use strict';
    return new Pair(first, second);
};

var factory = new PairFactory();
module.exports  = factory;