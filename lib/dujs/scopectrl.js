/*
 * ScopeCtrl module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-07-29
 */
var cfgBuilder = require('./cfgbuilder'),
    Scope = require('./scope'),
    Range = require('./range'),
    namespace = require('./namespace'),
    internal = namespace(),
    Set = require('../analyses/set'),
    Map = require('core-js/es6/map'),
    walkes = require('walkes'),
    factoryVarDef = require('./vardeffactory'),
    factoryDef = require('./deffactory'),
    factoryVar = require('./varfactory'),
    factoryRange = require('./rangefactory'),
    factoryScope = require('./scopefactory');

/**
 * ScopeCtrl
 * @constructor
 */
function ScopeCtrl() {
    'use strict';
    internal(this)._scopes = [];
    internal(this)._mapFromDefToScope = new Map();
    internal(this)._mapFromScopeNameToScope = new Map();
    internal(this)._root = null;

	initialization(this);

    /* start-test-block */
    this._testonly_ = internal(this);
	this._testonly_._addScope = addScope;
	this._testonly_._recursivelyGetScopeText = recursivelyGetScopeText;
	this._testonly_._getScopeRepresentation = getScopeRepresentation;
    /* end-test-block */
}

/* start-private-methods */
/**
 * Add a Scope
 * @param {Object} ctrl The scope controller
 * @param {Object} scope Scope object
 * @param {Object} def Definition of the scope
 * @private
 */
function addScope(ctrl, scope, def) {
	'use strict';
	var theCtrl = ctrl;
	if (Scope.isScope(scope)) {
		internal(theCtrl)._scopes.push(scope);
		internal(theCtrl)._mapFromDefToScope.set(def, scope);
		internal(theCtrl)._mapFromScopeNameToScope.set(scope.name, scope);
	}
}

/**
 * Initialize the scope controller
 * @param {Object} ctrl The scope controller
 * @private
 */
function initialization(ctrl) {
	"use strict";
	var domainScope = factoryScope.createDomainScope(cfgBuilder.getDomainScopeGraph());
	internal(ctrl)._root = domainScope;
	var domainScopeDef = factoryDef.createFunctionDef(domainScope.cfg[0]);
	addScope(ctrl, domainScope, domainScopeDef);
}

/**
 * Recursively get the representation text of a function scope
 * @param {Object} currentScope Current function scope
 * @param {Number} level Level of the current scope located in the tree (>= 0)
 * @returns {String} String representation
 * @private
 */
function recursivelyGetScopeText(currentScope, level) {
	'use strict';
	var currentLevel = level || 0,
		representation = '';
	if (ScopeWrapper.isScope(currentScope)) {
		representation += (currentLevel === 0)? '' : '\n';
		representation += getScopeRepresentation(currentScope, currentLevel);
		currentScope.children.forEach(function (val) {
			representation += recursivelyGetScopeText(val, currentLevel + 1);
		});
	}
	return representation;
}

/**
 * Get the representation of a function scope with indent
 * @param {Object} scope A scope
 * @param {Number} level Level of the current scope located in the tree to compute the indent
 * @returns {String} String representation for a scope with indent
 * @private
 */
function getScopeRepresentation(scope, level) {
	'use strict';
	var indentBasis = '  ',
		indent = '';
	for (var index = 0; index < level; ++index) {
		indent += indentBasis;
	}
	return indent + '+-' + scope;
}
/* end-private-methods */

/* start-static-methods */
/**
 * Check for the object is a ScopeCtrl or not
 * @param {Object} obj An object
 * @returns {Boolean} True if the obj is a ScopeCtrl, false otherwise
 */
ScopeCtrl.isScopeTree = function (obj) {
    "use strict";
    return obj instanceof ScopeCtrl;
};

/**
 * Add a scope tree of a page
 * @param {Object} ast AST of a page
 */
ScopeCtrl.prototype.addPageScopeTree = function (ast) {
    'use strict';
    var theScopeCtrl = this, current = null;
    walkes(ast, {
        Program: function (node, recurse) {
            var cfg = cfgBuilder.getCFG(node),
                pageScope = factoryScope.createPageScope(cfg);

            /// add into the tree
            addScope(theScopeCtrl, pageScope, factoryDef.createFunctionDef(pageScope.cfg[0]));
            current = pageScope;
            internal(theScopeCtrl)._root.addChild(pageScope);

            /// to recursively walks to inner functions
            node.body.forEach(function (elem) {
                current = pageScope;
                recurse(elem);
            });
        },
        FunctionDeclaration: function (node, recurse) {
            var cfg = cfgBuilder.getCFG(node.body),
                functionScopeWrapper = factoryScope.createFunctionScope(cfg, node.id.name),
                paramVarDefs = new Set();
            /// set Range and Def of this function scope
            var functionRange = factoryRange.create(node.range);
            functionScopeWrapper.range = functionRange;
            functionScopeWrapper.def = factoryDef.createFunctionDef(current.cfg[0], functionRange, (!!current)? current.scope : globalScopeName);
            /// set params of this function
            node.params.forEach(function (paramNode) {
                var varDef = factoryVarDef.createLiteralParamVarDef(functionScopeWrapper, paramNode.name, paramNode.range);
                paramVarDefs.add(varDef);
            });
            functionScopeWrapper.setParams(paramVarDefs);

            /// add into the tree
            addScope(thisTree, functionScopeWrapper);
            if (!current) {
                current = functionScopeWrapper;
                internal(thisTree)._root = functionScopeWrapper;
            } else {
                current.addChild(functionScopeWrapper);
                var functionVar = factoryVar.create(functionScopeWrapper.scope.value, functionScopeWrapper.range, current.scope),
                    varDef = factoryVarDef.create(functionVar, functionScopeWrapper.def);
                current.setInitVarDefs(new Set([varDef]));
            }

            /// to recursively walks to inner functions
            node.body.body.forEach(function (elem) {
                current = functionScopeWrapper;
                recurse(elem);
            });
        },
        FunctionExpression: function (node, recurse) {
            var cfg = cfgBuilder.getCFG(node.body),
                anonymousFunctionWrapper = factoryScope.createAnonymousFunctionScope(cfg),
                paramVarDefs = new Set();
            /// set Range and Def of this function scope
            var functionRange = factoryRange.create(node.range);
            anonymousFunctionWrapper.range = functionRange;
            anonymousFunctionWrapper.def = factoryDef.createFunctionDef(current.cfg[0], functionRange, (!!current)? current.scope : globalScopeName);

            /// set params of this function
            node.params.forEach(function (paramNode) {
                var varDef = factoryVarDef.createLiteralParamVarDef(anonymousFunctionWrapper, paramNode.name, paramNode.range);
                paramVarDefs.add(varDef);
            });
            anonymousFunctionWrapper.setParams(paramVarDefs);

            /// add into the tree
            addScope(thisTree, anonymousFunctionWrapper);
            if (!current) {
                current = anonymousFunctionWrapper;
                internal(this)._root = anonymousFunctionWrapper;
            } else {
                current.addChild(anonymousFunctionWrapper);
            }

            /// to recursively walks to inner functions
            node.body.body.forEach(function (elem) {
                current = anonymousFunctionWrapper;
                recurse(elem);
            });
        }
    });
};

/**
 * Add new global variable and its definition to the root scope
 * @param {string} name
 * @param {string} type
 * @function
 */
ScopeCtrl.prototype.addGlobalVarDef = function (name, type) {
    "use strict";
    if (!!internal(this)._root) {
        var globalVarDef = factoryVarDef.createGlobalVarDef(internal(this)._root.cfg[0], name, type);
        internal(this)._root.setInitVarDefs(new Set([globalVarDef]));
    }
};

Object.defineProperty(ScopeCtrl.prototype, 'root', {
    get: function () {
        "use strict";
        return internal(this)._root;
    }
});

Object.defineProperty(ScopeCtrl.prototype, 'scopes', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._scopes);
    }
});

/**
 * method for getting a function scope (Scope type) by comparing its range
 * @param range Range object or the string representation of it
 * @returns {*|Scope}
 * @function
 */
ScopeCtrl.prototype.getScopeByRange = function (range) {
    'use strict';
    if (Range.isRange(range)) {
        return internal(this)._mapFromRangeToScope.get(range.toString());
    } else if (typeof range === 'string') {
        return internal(this)._mapFromRangeToScope.get(range);
    }
};

/**
 * Method for getting a function scope by comparing its definition
 * @param definition Def object or the string representation of it
 * @returns {*|Scope}
 * @function
 */
ScopeCtrl.prototype.getScopeByDef = function (definition) {
    'use strict';
    return internal(this)._mapFromDefToScope.get(definition);
};

/**
 * Method for getting a function scope (Scope type) by comparing its scope name
 * @param scopeName Scope object or the string representation of it
 * @returns {*|Scope}
 * @function
 */
ScopeCtrl.prototype.getScopeByScopeName = function (scopeName) {
    'use strict';
    if (Scope.isScope(scopeName)) {
        /// return the function if its scope is the same
        return internal(this)._mapFromScopeNameToScope.get(scopeName.toString());
    } else if (typeof scopeName === 'string') {
        return internal(this)._mapFromScopeNameToScope.get(scopeName);
    }
};

/**
 * Check the Scope is in the tree or not
 * @param scopeWrapper
 * @returns {boolean}
 * @function
 */
ScopeCtrl.prototype.hasScope = function (scopeWrapper) {
    'use strict';
    return internal(this)._scopes.indexOf(scopeWrapper) !== -1;
};

/**
 * Represent the ScopeCtrl as a string
 * @returns {string}
 * @function
 */
ScopeCtrl.prototype.toString = function () {
    'use strict';
    return recursivelyGetScopeText(internal(this).root, 0);
};


/**
 * Find declared variables
 * @param {Array|Set} globalVars Array or set of VarDef
 * @function
 */
ScopeCtrl.prototype.setVars = function (globalVars) {
    'use strict';
    if (!!globalVars) {
        internal(this)._root.setInitVarDefs(globalVars);
    }
    internal(this)._root.setVars();
    internal(this)._root.children.forEach(function (scope) {
        scope.setVars();
    });
};

module.exports = ScopeCtrl;