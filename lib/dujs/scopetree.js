/*
 * ScopeTree module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-03
 */
var cfgBuilder = require('./cfgbuilder'),
    Scope = require('./scope'),
    factoryVarDef = require('./vardeffactory'),
    factoryDef = require('./deffactory'),
    factoryVar = require('./varfactory'),
	factoryScope = require('./scopefactory'),
	factoryRange = require('./rangefactory'),
    Range = require('./range'),
	astValidator = require('./astvalidator');
var Set = require('../analyses/set'),
	Map = require('core-js/es6/map'),
	walkes = require('walkes');
var namespace = require('./namespace'),
	internal = namespace();

/**
 * ScopeTree inside a page
 * @constructor
 */
function ScopeTree() {
    'use strict';
    internal(this)._scopes = [];
    internal(this)._mapFromNameToScope = new Map(); /// (Range text, Scope)
    internal(this)._mapFromRangeToScope = new Map(); /// (Parent scope + Range text, Scope)
    internal(this)._latestReachInsOfScopes = new Map(); /// (Scope, ReachIns)
    internal(this)._root = null;

    /* start-test-block */
    this._testonly_ = internal(this);
	this._testonly_._recursivelyGetScopeText = recursivelyGetScopeText;
	this._testonly_._getScopeRepresentation = getScopeRepresentation;
    /* end-test-block */
}

/* start-private-methods */
/**
 * Recursively get the representation text of a function scope
 * @param {Scope} currentScope Current function scope
 * @param {number} level Level of the current scope located in the tree (>= 0)
 * @returns {string} String representation
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
 * @param {Scope} scope A scope
 * @param {number} level Level of the current scope located in the tree to compute the indent
 * @returns {string} String representation for a scope with indent
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
 * Check for the object is a ScopeTree or not
 * @param   {Object}    obj An object
 * @returns {boolean}   True if the obj is a ScopeTree, false otherwise
 */
ScopeTree.isScopeTree = function (obj) {
    "use strict";
    return obj instanceof ScopeTree;
};
/* end-static-methods */

/* start-public-methods */
/**
 * Add a Scope
 * @param {Scope} scope Scope object
 * @param {Range} range Range of the scope
 */
ScopeTree.prototype.addScope = function (scope, range) {
	"use strict";
	if (Scope.isScope(scope) && Range.isRange(range)) {
		internal(this)._scopes.push(scope);
		internal(this)._mapFromNameToScope.set(scope.name, scope);

		scope.range = range;
		internal(this)._mapFromRangeToScope.set(range.toString(), scope);
	}
};

/**
 * Build the scope tree
 * @param   {Object}    ast AST of the page
 */
ScopeTree.prototype.buildScopeTree = function (ast) {
	"use strict";
	var pageScope = factoryScope.createPageScope(ast);
	internal(this)._root = pageScope;
	var pageScopeRange = factoryRange.create(ast.range);
	this.addScope(pageScope, pageScopeRange);
};

/**
 * Add a scope tree of a page
 * @param {Object} ast AST of a page
 */
ScopeTree.prototype.addPageScopeTree = function (ast) {
    'use strict';
    var theScopeTree = this;
	var currentScope = internal(this)._root;

	function astProgramHandler(node, recurse) {
		var pageScope = factoryScope.createPageScope(ast, internal(theScopeTree)._root);
		addScope(theScopeTree, pageScope, factoryRange.create(node.range));
		currentScope = pageScope;

		node.body.forEach(function (elem) {
			currentScope = pageScope;
			recurse(elem);
		});
	}

	function astFunctionDeclarationHandler(node, recurse) {

	}

    walkes(ast, {
        Program: astProgramHandler,
        FunctionDeclaration: function (node, recurse) {
            var functionScopeWrapper = factoryScope.createFunctionScope(node, node.id.name);
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
 * method for getting a function scope (Scope type) by comparing its range
 * @param range Range object or the string representation of it
 * @returns {*|Scope}
 * @function
 */
ScopeTree.prototype.getScopeByRange = function (range) {
    'use strict';
    if (Range.isRange(range)) {
        return internal(this)._mapFromNameToScope.get(range.toString());
    } else if (typeof range === 'string') {
        return internal(this)._mapFromNameToScope.get(range);
    }
};

/**
 * Method for getting a function scope (Scope type) by comparing its scope name
 * @param scopeName Scope object or the string representation of it
 * @returns {*|Scope}
 * @function
 */
ScopeTree.prototype.getScopeByScopeName = function (scopeName) {
    'use strict';
    if (Scope.isScope(scopeName)) {
        /// return the function if its scope is the same
        return internal(this)._mapFromNameToScope.get(scopeName.toString());
    } else if (typeof scopeName === 'string') {
        return internal(this)._mapFromNameToScope.get(scopeName);
    }
};

/**
 * Check the Scope is in the tree or not
 * @param scopeWrapper
 * @returns {boolean}
 * @function
 */
ScopeTree.prototype.hasScope = function (scopeWrapper) {
    'use strict';
    return internal(this)._scopes.indexOf(scopeWrapper) !== -1;
};

/**
 * Represent the ScopeTree as a string
 * @returns {string}
 * @function
 */
ScopeTree.prototype.toString = function () {
    'use strict';
    return recursivelyGetScopeText(internal(this).root, 0);
};


/**
 * Find declared variables
 * @param {Array|Set} globalVars Array or set of VarDef
 * @function
 */
ScopeTree.prototype.setVars = function (globalVars) {
    'use strict';
    if (!!globalVars) {
        internal(this)._root.setInitVarDefs(globalVars);
    }
    internal(this)._root.setVars();
    internal(this)._root.children.forEach(function (scope) {
        scope.setVars();
    });
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(ScopeTree.prototype, {
	rootScope: {
		get: function () {
			"use strict";
			return internal(this)._root;
		},
		enumerable: true
	}
});
/* end-public-data-members */

module.exports = ScopeTree;