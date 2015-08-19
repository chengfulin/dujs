/*
 * Model module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-19
 */
var namespace = require('../namespace'),
    internal = namespace();
var Scope = require('./scope'),
    DUPair = require('./dupair'),
    cfgValidator = require('./cfgvalidator');
var Map = require('core-js/es6/map'),
	Set = require('../analyses/set');

/**
 * Model
 * @constructor
 */
function Model() {
    "use strict";
    internal(this)._relatedScopes = [];
	internal(this)._mainlyRelatedScope = null;
    internal(this)._graph = null;
    internal(this)._dupairs = new Map(); /// (Var, Set)
	/// TODO: should contain dataflow artifacts (ReachIn, ReachOut, KILL, GEN, USE) or not

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-static-methods */
/**
 * Check for the object is an Model
 * @param {Object} obj An object to be checked
 * @returns {boolean} True, if it is; false, otherwise
 */
Model.isModel = function (obj) {
    "use strict";
    return obj instanceof Model;
};
/* end-static-methods */

/* start-public-methods */
/**
 * Check for the scope is related
 * @param {Scope} scope A Scope to be checked
 * @returns {boolean}
 */
Model.prototype.isRelatedToTheScope = function (scope) {
    "use strict";
    return internal(this)._relatedScopes.indexOf(scope) !== -1;
};

/**
 * Check the scope is mainly related, which means this model is derive from the scope's intra-procedural model
 * @param {Scope} scope A Scope to be checked
 * @returns {boolean} True, if it is; false, otherwise
 */
Model.prototype.isMainlyRelatedToTheScope = function (scope) {
    "use strict";
    return internal(this)._mainlyRelatedScope === scope;
};

/**
 * Add a related scope
 * @param {Scope} scope Related scope
 */
Model.prototype.addRelatedScope = function (scope) {
    "use strict";
    if (Scope.isScope(scope) && !this.isRelatedToTheScope(scope)) {
	    if (internal(this)._relatedScopes.length === 0) {
		    internal(this)._mainlyRelatedScope = scope;
	    }
        internal(this)._relatedScopes.push(scope);
    }
};

/**
 * Check for DUPair has found
 * @param {DUPair} dupair
 * @returns {boolean} True, if found; false, otherwise
 */
Model.prototype.hasDUPair = function (dupair) {
    "use strict";
    var found = false;
    if (DUPair.isDUPair(dupair)) {
        internal(this)._dupairs.forEach(function (pairs) {
            pairs.forEach(function (pair) {
                if (pair.def === dupair.def && pair.use === dupair.use) {
                    found = true;
                }
            });
        });
    }
    return found;
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(Model.prototype, {
	/**
	 * Graph of the model
	 * @type {Array}
	 * @memberof Model.prototype
	 */
	graph: {
	    get: function () {
	        "use strict";
	        return [].concat(internal(this)._graph);
	    },
	    set: function (graph) {
	        "use strict";
	        if (cfgValidator.isValidCFG(graph)) {
	            internal(this)._graph = [].concat(graph);
	        }
	    }
	},
	/**
	 * Related scopes
	 * @type {Array}
	 * @memberof Model.prototype
	 */
	relatedScopes: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._relatedScopes);
		},
		set: function (scopes) {
			"use strict";
			if (scopes instanceof Array) {
				internal(this)._relatedScopes = [].concat(scopes);
			}
		}
	},
	/**
	 * DUPairs found in this model
	 * @type {Map}
	 * @memberof Model.prototype
	 */
	dupairs: {
		get: function () {
			"use strict";
			var map = new Map();
			internal(this)._dupairs.forEach(function (val, key) {
				map.set(key, val);
			});
			return map;
		},
		set: function (dupairs) {
			"use strict";
			if (dupairs instanceof Map) {
				var currentAnalysisItem = this;
				dupairs.forEach(function (pairs, variable) {
					internal(currentAnalysisItem)._dupairs.set(variable, pairs);
				});
			}
		}
	},
	/**
	 * Mainly related scope
	 * @type {Scope}
	 * @memberof Model.prototype
	 */
	mainlyRelatedScope: {
		get: function () {
			"use strict";
			return internal(this)._mainlyRelatedScope;
		}
	}
});
/* end-public-data-members */

module.exports = Model;