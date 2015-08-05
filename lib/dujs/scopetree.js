/*
 * ScopeTree module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-05
 */
var Scope = require('./scope'),
	factoryScope = require('./scopefactory'),
    Range = require('./range');
var walkes = require('walkes'),
	Map = require('core-js/es6/map');
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
    /* end-test-block */
}

/* start-private-methods */
/**
 * Recursively get the representation text of a function scope
 * @param   {Scope}     currentScope    Current function scope
 * @param   {number}    level           Level of the current scope located in the tree (>= 0)
 * @returns {string}    String representation
 * @private
 */
function recursivelyGetScopeText(currentScope, level) {
	'use strict';
	var currentLevel = level || 0,
		representation = '';
	if (Scope.isScope(currentScope)) {
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
 * @param   {Scope}     scope A scope
 * @param   {number}    level Level of the current scope located in the tree to compute the indent
 * @returns {string}    String representation for a scope with indent
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

/**
 * Add a Scope
 * @param {ScopeTree} tree This ScopeTree
 * @param {Scope} scope Scope object
 * @private
 */
function addScope(tree, scope) {
	"use strict";
	if (Scope.isScope(scope)) {
		internal(tree)._scopes.push(scope);
		internal(tree)._mapFromNameToScope.set(scope.name, scope);
		internal(tree)._mapFromRangeToScope.set(scope.range.toString(), scope);
	}
}

/**
 * Initialize the scope tree
 * @param {ScopeTree} tree This ScopeTree
 * @param {Object} ast AST node of this page
 * @private
 */
function initialization(tree, ast) {
	"use strict";
	var pageScope = factoryScope.createPageScope(ast);
	if (!pageScope) {
		return;
	}
	internal(tree)._root = pageScope;
	internal(tree)._scopes = [];
	internal(tree)._mapFromRangeToScope.clear();
	internal(tree)._mapFromNameToScope.clear();

	addScope(tree, pageScope);
}
/* end-private-methods */

/* start-test-block */
ScopeTree._testonly_ = {
	_addScope: addScope,
	_initialization: initialization,
	_recursivelyGetScopeText: recursivelyGetScopeText,
	_getScopeRepresentation: getScopeRepresentation
};
/* end-test-block */

/* start-static-methods */
/**
 * Check for the object is a ScopeTree or not
 * @param {Object} obj An object
 * @returns {boolean} True if the obj is a ScopeTree, false otherwise
 */
ScopeTree.isScopeTree = function (obj) {
    "use strict";
    return obj instanceof ScopeTree;
};
/* end-static-methods */

/* start-public-methods */
/**
 * Build the ScopeTree with its AST nodes
 * @param {Object} ast AST of a page
 */
ScopeTree.prototype.buildScopeTree = function (ast) {
    'use strict';
    var theScopeTree = this;
	initialization(theScopeTree, ast);
	var currentScope = internal(theScopeTree)._root;

	function astProgramHandler(node, recurse) {
		node.body.forEach(function (elem) {
			currentScope = internal(theScopeTree)._root;
			recurse(elem);
		});
	}

	function astFunctionDeclarationHandler(node, recurse) {
		var functionScope = factoryScope.createFunctionScope(node, node.id.name);
		currentScope.addChild(functionScope);
		addScope(theScopeTree, functionScope);
		node.body.body.forEach(function (astNode) {
			currentScope = functionScope;
			recurse(astNode);
		});
	}

	function astFunctionExpressionHandler(node, recurse) {
		var anonymousFunctionScope = factoryScope.createAnonymousFunctionScope(node);
		currentScope.addChild(anonymousFunctionScope);
		addScope(theScopeTree, anonymousFunctionScope);
		node.body.body.forEach(function (astNode) {
			currentScope = anonymousFunctionScope;
			recurse(astNode);
		});
	}

    walkes(ast, {
        Program: astProgramHandler,
        FunctionDeclaration: astFunctionDeclarationHandler,
        FunctionExpression: astFunctionExpressionHandler
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