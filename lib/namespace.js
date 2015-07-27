/**
 * Create namespace with Weak-Map
 */
require('core-js/es6/weak-map');

function namespace() {
    var map = new WeakMap();

    return function (obj) {
        if (!map.has(obj)) {
            map.set(obj, {});
        }
        return map.get(obj);
    };
}

module.exports = namespace;