/**
 * Created by ChengFuLin on 2015/6/23.
 */
var namespace = require('./namespace'),
    internal = namespace(),
    Map = require('core-js/es6/map'),
    Set = require('./analyses').Set;

/**
 *
 * @constructor
 */
function AliasCtrl() {
    "use strict";
    internal(this)._aliasMap = new Map();

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Check whether there is a object that alias would point to
 * @param pointTo
 * @returns {boolean}
 * @function
 */
AliasCtrl.prototype.hasPointTo = function (pointTo) {
    "use strict";
    return internal(this)._aliasMap.has(pointTo);
};

/**
 * Add an alias to the pointed to object
 * @param pointTo
 * @param alias
 * @function
 */
AliasCtrl.prototype.addAlias = function (pointTo, alias) {
    "use strict";
    if (this.hasPointTo(pointTo)) {
        var aliases = internal(this)._aliasMap.get(pointTo);
        aliases.add(alias);
        internal(this)._aliasMap.set(pointTo, aliases);
    } else {
        var aliasSet = new Set();
        aliasSet.add(alias);
        internal(this)._aliasMap.set(pointTo, aliasSet);
    }
};

/**
 * Remove an alias from the pointed to object
 * @param pointTo
 * @param alias
 * @function
 */
AliasCtrl.prototype.removeAlias = function (pointTo, alias) {
    "use strict";
    if (this.hasPointTo(pointTo) && internal(this)._aliasMap.get(pointTo).has(alias)) {
        var aliases = internal(this)._aliasMap.get(pointTo).values(),
            aliasCollection = [];
        aliasCollection = aliasCollection.concat(aliases.slice(0, aliases.indexOf(alias)))
                                         .concat(aliases.slice(aliases.indexOf(alias) + 1, aliases.length));
        internal(this)._aliasMap.set(pointTo, new Set(aliasCollection));
    }
};

/**
 * Clear all aliases
 * @function
 */
AliasCtrl.prototype.clearAliases = function () {
    "use strict";
    internal(this)._aliasMap = new Map();
};

var singleton = new AliasCtrl();
module.exports = singleton;