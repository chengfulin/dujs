/**
 * Created by ChengFuLin on 2015/6/29.
 */
var namespace = require('../namespace'),
    internal = namespace(),
    AnalyzedCFG = require('./model');

function AnalysisItemCtrl() {
    "use strict";
    internal(this)._intraProceduralAnalysisItems = [];
    internal(this)._interProceduralAnalysisItems = [];
    internal(this)._intraPageAnalysisItems = [];
    internal(this)._interPageAnalysisItems = [];

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

Object.defineProperty(AnalysisItemCtrl.prototype, 'intraProceduralAnalysisItems', {
    set: function (items) {
        "use strict";
        if (items instanceof Array && items.every(AnalyzedCFG.isModel)) {
            internal(this)._intraProceduralAnalysisItems = [].concat(items);
        }
    },
    get: function () {
        "use strict";
        return [].concat(internal(this)._intraProceduralAnalysisItems);
    }
});

Object.defineProperty(AnalysisItemCtrl.prototype, 'interProceduralAnalysisItems', {
    set: function (items) {
        "use strict";
        if (items instanceof Array && items.every(AnalyzedCFG.isModel)) {
            internal(this)._interProceduralAnalysisItems = [].concat(items);
        }
    },
    get: function () {
        "use strict";
        return [].concat(internal(this)._interProceduralAnalysisItems);
    }
});

Object.defineProperty(AnalysisItemCtrl.prototype, 'intraPageAnalysisItems', {
    set: function (items) {
        "use strict";
        if (items instanceof Array && items.every(AnalyzedCFG.isModel)) {
            internal(this)._intraPageAnalysisItems = [].concat(items);
        }
    },
    get: function () {
        "use strict";
        return [].concat(internal(this)._intraPageAnalysisItems);
    }
});

Object.defineProperty(AnalysisItemCtrl.prototype, 'interPageAnalysisItems', {
    set: function (items) {
        "use strict";
        if (items instanceof Array && items.every(AnalyzedCFG.isModel)) {
            internal(this)._interPageAnalysisItems = [].concat(items);
        }
    },
    get: function () {
        "use strict";
        return [].concat(internal(this)._interPageAnalysisItems);
    }
});

AnalysisItemCtrl.prototype.getInterPageAnalysisItemByTopRelatedScope = function (scope) {
    "use strict";
    var foundItem = null;
    internal(this)._interPageAnalysisItems.some(function (item) {
        if (item.isMainlyRelatedToTheScope(scope)) {
            foundItem = item;
            return true;
        }
    });
    return foundItem;
};

AnalysisItemCtrl.prototype.getIntraPageAnalysisItemByTopRelatedScope = function (scope) {
    "use strict";
    var foundItem = null;
    internal(this)._intraPageAnalysisItems.some(function (item) {
        if (item.isMainlyRelatedToTheScope(scope)) {
            foundItem = item;
            return true;
        }
    });
    return foundItem;
};

AnalysisItemCtrl.prototype.getInterProceduralAnalysisItemByTopRelatedScope = function (scope) {
    "use strict";
    var foundItem = null;
    internal(this)._interProceduralAnalysisItems.some(function (item) {
        if (item.isMainlyRelatedToTheScope(scope)) {
            foundItem = item;
            return true;
        }
    });
    return foundItem;
};

AnalysisItemCtrl.prototype.getIntraProceduralAnalysisItemByTopRelatedScope = function (scope) {
    "use strict";
    var foundItem = null;
    internal(this)._intraProceduralAnalysisItems.some(function (item) {
        if (item.isMainlyRelatedToTheScope(scope)) {
            foundItem = item;
            return true;
        }
    });
    return foundItem;
};

AnalysisItemCtrl.prototype.getAnalysisItemByTopRelatedScope = function (scope) {
    "use strict";
    var foundItem = null,
        allAnalysisItem = [].concat(internal(this)._interPageAnalysisItems)
                            .concat(internal(this)._intraPageAnalysisItems)
                            .concat(internal(this)._interProceduralAnalysisItems)
                            .concat(internal(this)._intraProceduralAnalysisItems);
    allAnalysisItem.some(function (item) {
        if (item.isMainlyRelatedToTheScope(scope)) {
            foundItem = item;
            return true;
        }
    });
    return foundItem;
};

AnalysisItemCtrl.isAnalysisItemCtrl = function (obj) {
    "use strict";
    return obj instanceof AnalysisItemCtrl;
};

module.exports = AnalysisItemCtrl;