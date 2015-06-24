/**
 * Created by ChengFuLin on 2015/6/24.
 */
var AliasMap = require('./aliasmap');

function AliasMapFactory() {
    "use strict";
}

AliasMapFactory.prototype.create = function () {
    "use strict";
    return new AliasMap();
};

var singleton = new AliasMapFactory();
module.exports = singleton;