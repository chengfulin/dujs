/**
 * Created by chengfulin on 2015/4/29.
 */
var CFGExt = require('./cfgext'),
    CFGWrapper = require('./cfgwrapper'),
    Scope = require('./scope'),
    Var = require('./var'),
    Def = require('./def'),
    Range = require('./range'),
    namespace = require('./namespace'),
    internal = namespace(),
    Map = require('core-js/es6/map'),
    walkes = require('walkes');

/**
 * Build the tree of scopes (function scope, program scope)
 * @param ast AST parsed from the source
 * @constructor
 */
function FunctionScopeTree(ast) {
    'use strict';
    internal(this).functionScopes = [];
    internal(this).root = null;
    internal(this).numOfAnonymousFunctions = 0;
    internal(this).mapFromRangeToFunctionScope = new Map();
    internal(this).mapFromDefToFunctionScope = new Map();
    internal(this).mapFromScopeNameToFunctionScope = new Map();

    buildCFGWrapperTree(this, ast);
}

/**
 * Add a function scope (CFGWrapper type) into the tree
 * @param tree
 * @param fscope
 * @private
 */
function addFunctionScope(tree, fscope) {
    'use strict';
    if (CFGWrapper.isCFGWrapper(fscope)) {
        internal(tree).functionScopes.push(fscope);
        internal(tree).mapFromRangeToFunctionScope.set(fscope.getRange().toString(), fscope);
        internal(tree).mapFromDefToFunctionScope.set(fscope.getDef().toString(), fscope);
        internal(tree).mapFromScopeNameToFunctionScope.set(fscope.getScope().toString(), fscope);
    }
}

/**
 * Build the function scope tree with an AST
 * @param tree the FunctionScopeTree
 * @param ast AST
 * @private
 */
function buildCFGWrapperTree(tree, ast) {
    'use strict';
    var thisTree = tree, current = null;
    walkes(ast, {
        Program: function (node, recurse) {
            var cfg = CFGExt.getCFG(node),
                cfgWrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE, null);
            internal(thisTree).root = cfgWrapper;/// 'Program' scope should be the root, if any
            addFunctionScope(thisTree, cfgWrapper);
            node.body.forEach(function (elem) {/// to recursively walks to inner functions
                current = cfgWrapper;
                recurse(elem);
            });
        },
        FunctionDeclaration: function (node, recurse) {
            var cfg = CFGExt.getCFG(node.body),
                cfgWrapper = new CFGWrapper(cfg, new Scope(node.id.name), current || null),
                params = [];
            node.params.forEach(function (paramNode) {
                params.push(new Var(paramNode.name, paramNode.range, cfgWrapper.getScope()));
            });
            cfgWrapper.setParams(params);
            if (!!current) {
                current.addChild(cfgWrapper);
            } else {
                internal(thisTree).root = cfgWrapper;
            }
            addFunctionScope(thisTree, cfgWrapper);
            node.body.body.forEach(function (elem) {/// to recursively walks to inner functions
                current = cfgWrapper;
                recurse(elem);
            });
        },
        VariableDeclarator: function (node, recurse) {
            if (node.init.type === 'FunctionExpression') {
                var cfg = CFGExt.getCFG(node.init.body),
                    cfgWrapper = new CFGWrapper(
                        cfg,
                        new Scope(internal(thisTree).numOfAnonymousFunctions),
                        current || null
                    ),
                    params = [];
                node.init.params.forEach(function (paramNode) {
                    params.push(new Var(paramNode.name, paramNode.range, cfgWrapper.getScope()));
                });
                cfgWrapper.setParams(params);
                internal(thisTree).numOfAnonymousFunctions += 1;
                if (!!current) {/// TODO: add function expression as child
                    current.addChild(cfgWrapper, new Var(
                        node.id.name,
                        node.range,
                        current.getScope(),
                        null)
                    );
                } else {
                    internal(thisTree).root = cfgWrapper;
                }
                addFunctionScope(thisTree, cfgWrapper);
                node.init.body.body.forEach(function (elem) {/// to recursively walks to inner functions
                    current = cfgWrapper;
                    recurse(elem);
                });
            }
        }
    });
}

/**
 * Validator for AST used to build the tree
 * @param ast
 * @param msg custom error message if any
 * @throws {Error} when the AST is not start from 'Program', 'FunctionDeclaration' or 'FunctionExpression' type
 */
FunctionScopeTree.prototype.validate = function (ast, msg) {
    'use strict';
    if (!ast.type ||
        (ast.type !== 'Program' && ast.type !== 'FunctionDeclaration' && ast.type !== 'FunctionExpression')) {
        throw new Error(msg || 'Invalid start point for a FunctionScopeTree');
    }
};

/**
 * Getter for the root scope
 * @returns {*|CFGWrapper}
 */
FunctionScopeTree.prototype.getRoot = function () {
    'use strict';
    return internal(this).root;
};

/**
 * method for getting a function scope (CFGWrapper type) by comparing its range
 * @param range Range object or the string representation of it
 * @returns {*|CFGWrapper}
 */
FunctionScopeTree.prototype.getFunctionScopeByRange = function (range) {
    'use strict';
    if (Range.isRange(range)) {
        return internal(this).mapFromRangeToFunctionScope.get(range.toString());
    } else if (typeof range === 'string') {
        return internal(this).mapFromRangeToFunctionScope.get(range);
    }
    /// return undefined
};

/**
 * Method for getting a function scope by comparing its definition
 * @param definition Def object or the string representation of it
 * @returns {*|CFGWrapper}
 */
FunctionScopeTree.prototype.getFunctionScopeByDef = function (definition) {
    'use strict';
    if (Def.isDef(definition)) {
        /// return the function if its definition is the same
        return internal(this).mapFromDefToFunctionScope.get(definition.toString());
    } else if (typeof definition === 'string') {
        return internal(this).mapFromDefToFunctionScope.get(definition);
    }
    /// return undefined
};

/**
 * Method for getting a function scope (CFGWrapper type) by comparing its scope name
 * @param scopeName Scope object or the string representation of it
 * @returns {*|CFGWrapper}
 */
FunctionScopeTree.prototype.getFunctionScopeByScopeName = function (scopeName) {
    'use strict';
    if (Scope.isScope(scopeName)) {
        /// return the function if its scope is the same
        return internal(this).mapFromScopeNameToFunctionScope.get(scopeName.toString());
    } else if (typeof scopeName === 'string') {
        return internal(this).mapFromScopeNameToFunctionScope.get(scopeName);
    }
    /// return undefined
};

/**
 * Check the cfgWrapper is in the tree or not
 * @param cfgWrapper
 * @returns {boolean}
 */
FunctionScopeTree.prototype.hasFunctionScope = function (cfgWrapper) {
    'use strict';
    if(CFGWrapper.isCFGWrapper(cfgWrapper)) {
        internal(this).functionScopes.forEach(function (scope) {
            if (scope.toString() === cfgWrapper) {
                return true;
            }
        });
        return false;
    }
    return false;
};

/**
 * Getter for getting the list of function scopes
 * @returns {Array}
 */
FunctionScopeTree.prototype.getFunctionScopes = function () {
    'use strict';
    return [].concat(internal(this).functionScopes);
};

/**
 * Getter for the number of anonymous functions
 * @returns {*|number}
 */
FunctionScopeTree.prototype.getNumOfAnonymousFunctions = function () {
    'use strict';
    return internal(this).numOfAnonymousFunctions;
};

module.exports = FunctionScopeTree;