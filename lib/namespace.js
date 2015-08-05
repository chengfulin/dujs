/*
 * Namespace
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
require('core-js/es6/weak-map');

function namespace() {
	'use strict';
    var map = new WeakMap();

    return function (obj) {
        if (!map.has(obj)) {
            map.set(obj, {});
        }
        return map.get(obj);
    };
}

module.exports = namespace;