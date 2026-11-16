/*
 * Namespace
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */

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