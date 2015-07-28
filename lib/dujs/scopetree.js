/**
 * Created by chengfulin on 2015/4/29.
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
 * Build the tree of scopes (function scope, program scope)
 * @param ast AST parsed from the source
 * @constructor
 */
function ScopeTree() {
    'use strict';
    internal(this)._scopes = [];
    internal(this)._mapFromRangeToScope = new Map();
    internal(this)._mapFromDefToScope = new Map();
    internal(this)._mapFromScopeNameToScope = new Map();
    internal(this)._root = null;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

ScopeTree._testonly_ = {
    _addScope: addScope,
    _recursivelyGetScopeText: recursivelyGetScopeText,
    _getScopeRepresentation: getScopeRepresentation
};

/**
 * Check for the object is a ScopeTree or not
 * @param obj
 * @returns {boolean}
 * @static
 * @function
 */
ScopeTree.isScopeTree = function (obj) {
    "use strict";
    return obj instanceof ScopeTree;
};

/**
 * Add a Scope (Scope type) into the tree
 * @param tree
 * @param scope
 * @private
 * @function
 */
function addScope(tree, scope) {
    'use strict';
    var thisTree = tree;
    if (ScopeWrapper.isScope(scope)) {
        internal(thisTree)._scopes.push(scope);
        internal(thisTree)._mapFromRangeToScope.set(scope.range.toString(), scope);
        internal(thisTree)._mapFromDefToScope.set(scope.def, scope);
        internal(thisTree)._mapFromScopeNameToScope.set(scope.scope.toString(), scope);
    }
}

/**
 * Build the function scope tree with an AST
 * @param ast AST
 * @function
 */
ScopeTree.prototype.buildScopeTree = function (ast) {
    'use strict';
    var thisTree = this, current = null, globalScopeName = Scope.GLOBAL_SCOPE;
    walkes(ast, {
        Program: function (node, recurse) {
            var cfg = cfgBuilder.getCFG(node),
                programScopeWrapper = factoryScope.createPageScope(cfg);
            /// set Range and Def of program scope
            var programRange = factoryRange.create(node.range);
            programScopeWrapper.range = programRange;
            programScopeWrapper.def = factoryDef.createFunctionDef(programScopeWrapper.cfg[0], programRange, globalScopeName);

            /// add into the tree
            addScope(thisTree, programScopeWrapper);
            current = programScopeWrapper;
            internal(thisTree)._root = programScopeWrapper;

            /// to recursively walks to inner functions
            node.body.forEach(function (elem) {
                current = programScopeWrapper;
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
ScopeTree.prototype.addGlobalVarDef = function (name, type) {
    "use strict";
    if (!!internal(this)._root) {
        var globalVarDef = factoryVarDef.createGlobalVarDef(internal(this)._root.cfg[0], name, type);
        internal(this)._root.setInitVarDefs(new Set([globalVarDef]));
    }
};

Object.defineProperty(ScopeTree.prototype, 'root', {
    get: function () {
        "use strict";
        return internal(this)._root;
    }
});

Object.defineProperty(ScopeTree.prototype, 'scopes', {
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
ScopeTree.prototype.getScopeByRange = function (range) {
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
ScopeTree.prototype.getScopeByDef = function (definition) {
    'use strict';
    return internal(this)._mapFromDefToScope.get(definition);
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
 * Recursively get the representation text of a function scope
 * @param currentScope Current function scope
 * @param level Level of the current scope located in the tree (>= 0)
 * @returns {string}
 * @private
 * @function
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
 * @param scope
 * @param level Level of the current scope located in the tree to compute the indent
 * @returns {string}
 * @private
 * @function
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

module.exports = ScopeTree;