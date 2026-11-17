/*
 * Model module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var namespace = require('../namespace'),
    internal = namespace();
var Scope = require('./scope'),
    DUPair = require('./dupair'),
    cfgValidator = require('./cfgvalidator');
var Set = require('../analyses/set');

/**
 * Fields of an analysis result record of a node
 * @type {Array}
 * @private
 */
var RESULT_FIELDS = ['reachIns', 'reachOuts', 'generate', 'kill', 'cuse', 'puse'];

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
    internal(this)._level = null; /// one of Model.INTRA_PROCEDURAL, ...
    internal(this)._hierarchy = null; /// Hierarchy of an upper model; null for an intra-procedural model
    internal(this)._flatNodeOf = null; /// Map(original, flat node); null means identity
    internal(this)._results = null; /// Map(flat node, frozen record); null before analyzed
    internal(this)._callBypasses = null; /// Map(CALL RETURN NODE, CallSiteRecord) of FR-016; null before set
    internal(this)._loopRecords = null; /// Array of LoopRecord (feature 005 data-model §5); null before set
    internal(this)._flatVarDefOf = null; /// Map(original VarDef, VarDef of the graph); null means identity

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

/* start-static-data-members */
Object.defineProperties(Model, {
	/**
	 * Level of an intra-procedural model
	 * @type {string}
	 * @memberof Model
	 * @constant
	 */
	INTRA_PROCEDURAL: {
		value: 'intra-procedural'
	},
	/**
	 * Level of an inter-procedural model
	 * @type {string}
	 * @memberof Model
	 * @constant
	 */
	INTER_PROCEDURAL: {
		value: 'inter-procedural'
	},
	/**
	 * Level of an intra-page model
	 * @type {string}
	 * @memberof Model
	 * @constant
	 */
	INTRA_PAGE: {
		value: 'intra-page'
	},
	/**
	 * Level of an inter-page model
	 * @type {string}
	 * @memberof Model
	 * @constant
	 */
	INTER_PAGE: {
		value: 'inter-page'
	}
});

Object.defineProperty(Model, 'LEVELS', {
	/**
	 * Collection of the levels
	 * @type {Array}
	 * @memberof Model
	 * @constant
	 */
	value: Object.freeze([
		Model.INTRA_PROCEDURAL,
		Model.INTER_PROCEDURAL,
		Model.INTRA_PAGE,
		Model.INTER_PAGE
	])
});
/* end-static-data-members */

/* start-private-methods */
/**
 * Copy a Set of the analysis result (null stays null)
 * @param {Set|null} set
 * @returns {Set|null}
 * @private
 */
function copySet(set) {
    "use strict";
    return (set instanceof Set) ? new Set(set) : null;
}

/**
 * Whether a node is in the graph of a model
 * @param {Model} model
 * @param {FlowNode} node
 * @returns {boolean}
 * @private
 */
function isInGraph(model, node) {
    "use strict";
    var graph = internal(model)._graph;
    return !!graph && !!node &&
        (graph[0] === node || graph[1] === node || graph[2].indexOf(node) !== -1);
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
 * Node of the graph of this model corresponding to a node: an original (a node
 * of a lower model) or a node of this graph itself. An intra-procedural model
 * maps its nodes to themselves.
 * @param {FlowNode} node
 * @returns {FlowNode|null} null when the node is not in this model
 */
Model.prototype.flatNodeOf = function (node) {
    "use strict";
    var mapping = internal(this)._flatNodeOf;
    if (!!mapping && mapping.has(node)) {
        return mapping.get(node);
    }
    return isInGraph(this, node) ? node : null;
};

/**
 * Analysis result of a node in this model (read-only)
 * @param {FlowNode} node An original or a node of the graph of this model
 * @returns {Object|null} frozen {reachIns, reachOuts, generate, kill, cuse, puse},
 *   each a new Set (or null); null when the node is not in this model or this
 *   model is not analyzed yet
 */
Model.prototype.analysisResultOf = function (node) {
    "use strict";
    var results = internal(this)._results;
    if (!results) {
        return null;
    }
    var flatNode = this.flatNodeOf(node);
    if (!flatNode || !results.has(flatNode)) {
        return null;
    }
    var stored = results.get(flatNode),
        result = {};
    RESULT_FIELDS.forEach(function (field) {
        result[field] = copySet(stored[field]);
    });
    return Object.freeze(result);
};

/**
 * Keep the analysis results of this model (only for defuseAnalyzer.doAnalysis)
 * @param {Map} map Map(node of the graph, {reachIns, reachOuts, generate, kill, cuse, puse})
 */
Model.prototype.setAnalysisResults = function (map) {
    "use strict";
    var results = new Map();
    if (map instanceof Map) {
        map.forEach(function (record, node) {
            var stored = {};
            RESULT_FIELDS.forEach(function (field) {
                stored[field] = copySet(!!record ? record[field] : null);
            });
            results.set(node, Object.freeze(stored));
        });
    }
    internal(this)._results = results;
};

/**
 * Keep the CallSiteRecords of the calls of this model (the bypasses of
 * lib/dujs/expansion.js expand, FR-016; feature 005 data-model §4; only for
 * building upper models). The records can be set only once.
 * @param {Map} map Map(CALL RETURN NODE of the graph, CallSiteRecord {callNode,
 *   callReturn, calleeScope, exceptionalReturn, entry, exit, seq, back,
 *   beforeDecision, callSiteLine}), in the order of the sequence numbers
 * @throws {Error} when the bypasses are set already or the map is not a Map
 */
Model.prototype.setCallBypasses = function (map) {
    "use strict";
    if (internal(this)._callBypasses !== null) {
        throw new Error('the call bypasses of a model can be set only once');
    }
    if (!(map instanceof Map)) {
        throw new Error('the call bypasses should be a Map');
    }
    internal(this)._callBypasses = new Map(map);
};

/**
 * CallSiteRecord of the call returning to a node of the graph of this model
 * (FR-016, feature 005 data-model §4)
 * @param {FlowNode} node A node of the graph of this model
 * @returns {Object|null} the frozen CallSiteRecord; null when the node is not
 *   the CALL RETURN NODE of a call of this model
 */
Model.prototype.callBypassOf = function (node) {
    "use strict";
    var bypasses = internal(this)._callBypasses;
    return (!!bypasses && bypasses.has(node)) ? bypasses.get(node) : null;
};

/**
 * CallSiteRecords of the calls of this model in the order of their sequence
 * numbers (feature 005 data-model §4)
 * @returns {Array} a new Array; empty when no record is set
 */
Model.prototype.callSiteRecords = function () {
    "use strict";
    var bypasses = internal(this)._callBypasses,
        records = [];
    if (!!bypasses) {
        bypasses.forEach(function (record) {
            records.push(record);
        });
    }
    return records;
};

/**
 * Keep the LoopRecords of this model (the loops of lib/dujs/expansion.js
 * expand; feature 005 data-model §5, User Story 4; only for building upper
 * models). The records can be set only once.
 * @param {Array} records Array of LoopRecord {loop, loopReturn, handlers:
 *   [{scope, entry, exit}], noHandler}
 * @throws {Error} when the records are set already or are not an Array
 */
Model.prototype.setLoopRecords = function (records) {
    "use strict";
    if (internal(this)._loopRecords !== null) {
        throw new Error('the loop records of a model can be set only once');
    }
    if (!Array.isArray(records)) {
        throw new Error('the loop records should be an Array');
    }
    internal(this)._loopRecords = [].concat(records);
};

/**
 * LoopRecords of this model in their order (feature 005 data-model §5)
 * @returns {Array} a new Array; empty when no record is set
 */
Model.prototype.loopRecords = function () {
    "use strict";
    return [].concat(internal(this)._loopRecords || []);
};

/**
 * Keep the map from the original VarDefs to the VarDefs of the graph of this
 * model (the flatVarDefOf of lib/dujs/expansion.js expand; feature 005,
 * research R1; only for building upper models)
 * @param {Map|null} map Map(original VarDef, VarDef of the graph); null means identity
 * @throws {Error} when the map is neither a Map nor null
 */
Model.prototype.setFlatVarDefOf = function (map) {
    "use strict";
    if (map !== null && !(map instanceof Map)) {
        throw new Error('the flat VarDefs should be a Map or null');
    }
    internal(this)._flatVarDefOf = (map === null) ? null : new Map(map);
};

/**
 * VarDef of the graph of this model corresponding to an original VarDef (the
 * definition of a summary, feature 005 research R1)
 * @param {VarDef} vardef An original VarDef
 * @returns {VarDef|null} the VarDef itself when no map is set (identity);
 *   null when the map has no VarDef for it
 */
Model.prototype.flatVarDefOf = function (vardef) {
    "use strict";
    var mapping = internal(this)._flatVarDefOf;
    if (mapping === null) {
        return vardef;
    }
    return mapping.has(vardef) ? mapping.get(vardef) : null;
};

/**
 * Keep the map from originals to the nodes of the graph of this model (the
 * flatNodeOf of lib/dujs/expansion.js expand; only for building upper models)
 * @param {Map|null} map Map(original, node of the graph); null means identity
 */
Model.prototype.setFlatNodeOf = function (map) {
    "use strict";
    if (map === null || map instanceof Map) {
        internal(this)._flatNodeOf = map;
    }
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
	        return [internal(this)._graph[0], internal(this)._graph[1], [].concat(internal(this)._graph[2])];
	    },
	    set: function (graph) {
	        "use strict";
	        if (cfgValidator.isValidCFG(graph)) {
	            internal(this)._graph = [graph[0], graph[1], [].concat(graph[2])];
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
	 * Level of the model (one of Model.INTRA_PROCEDURAL, Model.INTER_PROCEDURAL,
	 * Model.INTRA_PAGE and Model.INTER_PAGE; null before set); other values are ignored
	 * @type {string|null}
	 * @memberof Model.prototype
	 */
	level: {
		get: function () {
			"use strict";
			return internal(this)._level;
		},
		set: function (level) {
			"use strict";
			if (Model.LEVELS.indexOf(level) !== -1) {
				internal(this)._level = level;
			}
		}
	},
	/**
	 * Hierarchy of an upper model; null for an intra-procedural model
	 * (non-object values are ignored)
	 * @type {Object|null}
	 * @memberof Model.prototype
	 */
	hierarchy: {
		get: function () {
			"use strict";
			return internal(this)._hierarchy;
		},
		set: function (hierarchy) {
			"use strict";
			if (hierarchy === null || typeof hierarchy === 'object') {
				internal(this)._hierarchy = hierarchy;
			}
		}
	}
});
/* end-public-data-members */

module.exports = Model;