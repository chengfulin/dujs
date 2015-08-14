/*
 * Model module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-06
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
    internal(this)._reachIns = new Map(); /// (FlowNode, Set)
    internal(this)._reachOuts = new Map(); /// (FlowNode, Set)
    internal(this)._kill = new Map(); /// (FlowNode, Set)
    internal(this)._gen = new Map(); /// (FlowNode, Set)
    internal(this)._use = new Map(); /// (FlowNode, Set)

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

/* start-static-data-member */
Object.defineProperties(Model, {
	/**
	 * ReachIn type of the def-use artifact
	 * @type {string}
	 * @constant
	 * @memberof Model
	 */
	REACH_IN_ARTIFACT_TYPE: {
		value: 'reachIn'
	},
	/**
	 * ReachOut type of the def-use artifact
	 * @type {string}
	 * @constant
	 * @memberof Model
	 */
	REACH_OUT_ARTIFACT_TYPE: {
		value: 'reachOut'
	},
	/**
	 * KILL type of the def-use artifact
	 * @type {string}
	 * @constant
	 * @memberof Model
	 */
	KILL_ARTIFACT_TYPE: {
		value: 'kill'
	},
	/**
	 * GEN type of the def-use artifact
	 * @type {string}
	 * @constant
	 * @memberof Model
	 */
	GEN_ARTIFACT_TYPE: {
		value: 'gen'
	},
	/**
	 * USE type of the def-use artifact
	 * @type {string}
	 * @constant
	 * @memberof Model
	 */
	USE_ARTIFACT_TYPE: {
		value: 'use'
	}
});
/* end-static-data-member */

/* start-private-methods */
/**
 * Set a value set of the artifact at the node
 * @param {Model} model
 * @param {string} type
 * @param {FlowNode} node
 * @param {Set} valueSet
 */
function setArtifactAtNode(model, type, node, valueSet) {
	"use strict";
	if (Model.isModel(model) && !!internal(model)._graph && internal(model)._graph[2].indexOf(node) !== -1 && valueSet instanceof Set) {
		if (type === Model.REACH_IN_ARTIFACT_TYPE) {
			internal(model)._reachIns.set(node, valueSet);
		} else if (type === Model.REACH_OUT_ARTIFACT_TYPE) {
			internal(model)._reachOuts.set(node, valueSet);
		} else if (type === Model.KILL_ARTIFACT_TYPE) {
			internal(model)._kill.set(node, valueSet);
		} else if (type === Model.GEN_ARTIFACT_TYPE) {
			internal(model)._gen.set(node, valueSet);
		} else if (type === Model.USE_ARTIFACT_TYPE) {
			internal(model)._use.set(node, valueSet);
		}
	}
}

/**
 * Get copied artifact collection of this model
 * @param {Model} model
 * @param {string} type
 * @returns {Map}
 */
function getCopiedArtifact(model, type) {
	"use strict";
	var copied = null;
	if (Model.isModel(model)) {
		var artifacts = null;
		if (type === Model.REACH_IN_ARTIFACT_TYPE) {
			artifacts = internal(model)._reachIns;
		} else if (type === Model.REACH_OUT_ARTIFACT_TYPE) {
			artifacts = internal(model)._reachOuts;
		} else if (type === Model.KILL_ARTIFACT_TYPE) {
			artifacts = internal(model)._kill;
		} else if (type === Model.GEN_ARTIFACT_TYPE) {
			artifacts = internal(model)._gen;
		} else if (type === Model.USE_ARTIFACT_TYPE) {
			artifacts = internal(model)._use;
		}
		if (!!artifacts) {
			copied = new Map();
			artifacts.forEach(function (valueSet, node) {
				copied.set(node, valueSet);
			});
		}
	}
	return copied;
}
/* end-private-methods */

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

/**
 * Set a reach in set at the node
 * @param {FlowNode} node A node in the graph
 * @param {Set} reachInSet
 */
Model.prototype.setReachInSetAtNode = function (node, reachInSet) {
	"use strict";
	setArtifactAtNode(this, Model.REACH_IN_ARTIFACT_TYPE, node, reachInSet);
};

/**
 * Set a reach out set at the node
 * @param {FlowNode} node A node in the graph
 * @param {Set} reachOutSet
 */
Model.prototype.setReachOutSetAtNode = function (node, reachOutSet) {
	"use strict";
	setArtifactAtNode(this, Model.REACH_OUT_ARTIFACT_TYPE, node, reachOutSet);
};

/**
 * Set a kill set at the node
 * @param {FlowNode} node A node in the graph
 * @param {Set} killSet
 */
Model.prototype.setKillSetAtNode = function (node, killSet) {
	"use strict";
	setArtifactAtNode(this, Model.KILL_ARTIFACT_TYPE, node, killSet);
};

/**
 * Set a gen set at the node
 * @param {FlowNode} node A node in the graph
 * @param {Set} genSet
 */
Model.prototype.setGenSetAtNode = function (node, genSet) {
	"use strict";
	setArtifactAtNode(this, Model.GEN_ARTIFACT_TYPE, node, genSet);
};

/**
 * Set a use set at the node
 * @param {FlowNode} node A node in the graph
 * @param {Set} useSet
 */
Model.prototype.setUseSetAtNode = function (node, useSet) {
	"use strict";
	setArtifactAtNode(this, Model.USE_ARTIFACT_TYPE, node, useSet);
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
	},
	/**
	 * ReachIn set
	 * @type {Set}
	 * @memberof Model.prototype
	 */
	reachIns: {
		get: function () {
			"use strict";
			return getCopiedArtifact(this, Model.REACH_IN_ARTIFACT_TYPE);
		}
	},
	/**
	 * ReachOut set
	 * @type {Set}
	 * @memberof Model.prototype
	 */
	reachOuts: {
		get: function () {
			"use strict";
			return getCopiedArtifact(this, Model.REACH_OUT_ARTIFACT_TYPE);
		}
	},
	/**
	 * KILL set
	 * @type {Set}
	 * @memberof Model.prototype
	 */
	kill: {
		get: function () {
			"use strict";
			return getCopiedArtifact(this, Model.KILL_ARTIFACT_TYPE);
		}
	},
	/**
	 * GEN set
	 * @type {Set}
	 * @memberof Model.prototype
	 */
	gen: {
		get: function () {
			"use strict";
			return getCopiedArtifact(this, Model.GEN_ARTIFACT_TYPE);
		}
	},
	/**
	 * USE set
	 * @type {Set}
	 * @memberof Model.prototype
	 */
	use: {
		get: function () {
			"use strict";
			return getCopiedArtifact(this, Model.USE_ARTIFACT_TYPE);
		}
	}
});
/* end-public-data-members */

module.exports = Model;