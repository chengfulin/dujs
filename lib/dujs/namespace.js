/**
 * Created by chengfulin on 2015/4/24.
 */
var WeakMap = require('core-js/es6/weak-map');
module.exports = Namespace;

var map = new WeakMap();
function Namespace() {
    'use strict';
    return function (obj) {
        if (!map.has(obj)) {
            map.set(obj, {});
        }
        return map.get(obj);
    };
}