/**
 * Created by chengfulin on 2015/4/29.
 */
var CFGExt = require('./cfgext'),
    ScopeWrapper = require('./scopewrapper'),
    Scope = require('./scope'),
    Var = require('./var'),
    Def = require('./def'),
    Range = require('./range'),
    namespace = require('./namespace'),
    internal = namespace(),
    Set = require('../analyses').Set,
    Map = require('core-js/es6/map'),
    walkes = require('walkes'),
    factoryVarDef = require('./vardeffactory'),
    factoryDef = require('./deffactory'),
    factoryVar = require('./varfactory'),
    factoryRange = require('./rangefactory'),
    factoryScopeWrapper = require('./scopewrapperfactory'),
    factoryFlowNode = require('../esgraph').factoryFlowNode,
    FlowNode = require('../esgraph').FlowNode;

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
    internal(this)._globalScope = null;
    internal(this)._root = null;

    setGlobalScope(this);
    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

ScopeTree._testonly_ = {
    _addScope: addScope,
    _setGlobalScope: setGlobalScope
};

/**
 * Add a Scope (ScopeWrapper type) into the tree
 * @param tree
 * @param scope
 * @private
 * @function
 */
function addScope(tree, scope) {
    'use strict';
    var thisTree = tree;
    if (ScopeWrapper.isScopeWrapper(scope)) {
        internal(thisTree)._scopes.push(scope);
        internal(thisTree)._mapFromRangeToScope.set(scope.range.toString(), scope);
        internal(thisTree)._mapFromDefToScope.set(scope.def, scope);
        internal(thisTree)._mapFromScopeNameToScope.set(scope.scope.toString(), scope);
    }
}

/**
 * Set global scope to this tree
 * @returns {ScopeWrapper} global scope wrapper
 * @private
 * @function
 */
function setGlobalScope(tree) {
    "use strict";
    var thisTree = tree;
    var globalScopeWrapper = factoryScopeWrapper.createGlobalScopeWrapper(CFGExt.getGlobalCFG());
    globalScopeWrapper.range = factoryRange.createGlobalRange();
    globalScopeWrapper.def = factoryDef.createObjectDef(globalScopeWrapper.cfg[0], globalScopeWrapper.range, globalScopeWrapper.scope);

    internal(thisTree)._globalScope = globalScopeWrapper;
    internal(thisTree)._root = globalScopeWrapper;
    addScope(thisTree, globalScopeWrapper);

    return globalScopeWrapper;
}

/**
 * Build the function scope tree with an AST
 * @param ast AST
 * @function
 */
ScopeTree.prototype.buildScopeTree = function (ast) {
    'use strict';
    var thisTree = this, current = internal(tree)._root;
    walkes(ast, {
        Program: function (node, recurse) {
            var cfg = CFGExt.getCFG(node),
                programScopeWrapper = factoryScopeWrapper.createProgramScopeWrapper(cfg);
            /// set Range and Def of program scope
            var programRange = factoryRange.create(node.range);
            programScopeWrapper.range = programRange;
            programScopeWrapper.def = factoryDef.createFunctionDef(current.cfg[0], programRange);
            /// add into the tree
            addScope(thisTree, programScopeWrapper);
            current.addChild(programScopeWrapper);
            /// to recursively walks to inner functions
            node.body.forEach(function (elem) {
                current = programScopeWrapper;
                recurse(elem);
            });
        },
        FunctionDeclaration: function (node, recurse) {
            var cfg = CFGExt.getCFG(node),
                functionScopeWrapper = factoryScopeWrapper.createFunctionScopeWrapper(cfg, new Scope(node.id.name), node.id.name),
                params = [];
            /// set Range and Def of this function scope
            var functionRange = factoryRange.create(node.range);
            functionScopeWrapper.range = functionRange;
            functionScopeWrapper.def = factoryDef.createFunctionDef(current.cfg[0], functionRange);

            /// set params of this function
            node.params.forEach(function (paramNode) {
                params.push(factoryVar.create(paramNode.name, paramNode.range, functionScopeWrapper.scope));
            });
            functionScopeWrapper.setParams(params);

            /// add into the tree
            addScope(thisTree, functionScopeWrapper);
            current.addChild(functionScopeWrapper);
            /// to recursively walks to inner functions
            node.body.body.forEach(function (elem) {
                current = functionScopeWrapper;
                recurse(elem);
            });
        },
        FunctionExpression: function (node, recurse) {
            var cfg = CFGExt.getCFG(node),
                anonymousFunctionWrapper = factoryScopeWrapper.createAnonymousFunctionScopeWrapper(cfg),
                params = [];
            /// set Range and Def of this function scope
            var functionRange = factoryRange.create(node.range);
            anonymousFunctionWrapper.range = functionRange;
            anonymousFunctionWrapper.def = factoryDef.createFunctionDef(current.cfg[0], functionRange);

            /// set params of this function
            node.params.forEach(function (paramNode) {
                params.push(factoryVar.create(paramNode.name, paramNode.range, anonymousFunctionWrapper.scope));
            });
            anonymousFunctionWrapper.setParams(params);

            /// add into the tree
            current.addChild(anonymousFunctionWrapper);
            addScope(thisTree, anonymousFunctionWrapper);
            /// to recursively walks to inner functions
            node.body.body.forEach(function (elem) {
                current = anonymousFunctionWrapper;
                recurse(elem);
            });
        }
    });
}

/**
 * Validator for AST used to build the tree
 * @param ast
 * @param msg custom error message if any
 * @throws {Error} when the AST is not start from 'Program', 'FunctionDeclaration' or 'FunctionExpression' type
 * @static
 * @function
 */
ScopeTree.validate = function (ast, msg) {
    'use strict';
    if (!ast.type ||
        (ast.type !== 'Program' && ast.type !== 'FunctionDeclaration' && ast.type !== 'FunctionExpression')) {
        throw new Error(msg || 'Invalid start point for a ScopeTree');
    }
};

ScopeTree.prototype.addGlobalVarDef = function (name, type) {
    "use strict";
    if (!!internal(this)._globalScope) {
        var newVarDef = vardefFactory.createGlobalVarDef(
            internal(this)._globalScope.getCFG()[0],
            name,
            type
        );
    }
};

/**
 * Getter for the root scope
 * @returns {*|ScopeWrapper}
 * @function
 */
ScopeTree.prototype.getRoot = function () {
    'use strict';
    return internal(this).root;
};

/**
 * method for getting a function scope (ScopeWrapper type) by comparing its range
 * @param range Range object or the string representation of it
 * @returns {*|ScopeWrapper}
 * @function
 */
ScopeTree.prototype.getFunctionScopeByRange = function (range) {
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
 * @returns {*|ScopeWrapper}
 * @function
 */
ScopeTree.prototype.getFunctionScopeByDef = function (definition) {
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
 * Method for getting a function scope (ScopeWrapper type) by comparing its scope name
 * @param scopeName Scope object or the string representation of it
 * @returns {*|ScopeWrapper}
 * @function
 */
ScopeTree.prototype.getFunctionScopeByScopeName = function (scopeName) {
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
 * @function
 */
ScopeTree.prototype.hasFunctionScope = function (cfgWrapper) {
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
 * @function
 */
ScopeTree.prototype.getFunctionScopes = function () {
    'use strict';
    return [].concat(internal(this).functionScopes);
};

/**
 * Getter for the number of anonymous functions
 * @returns {*|number}
 * @function
 */
ScopeTree.prototype.getNumOfAnonymousFunctions = function () {
    'use strict';
    return internal(this).numOfAnonymousFunctions;
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
    if (CFGWrapper.isCFGWrapper(currentScope)) {
        representation += (currentLevel === 0)? '' : '\n';
        representation += getFunctionScopeRepresentation(currentScope, currentLevel);
        currentScope.getChildren().forEach(function (val, key) {
            representation += recursivelyGetScopeText(val, currentLevel + 1);
        });
    }
    return representation;
}

/**
 * Get the representation of a function scope with indent
 * @param functionScope
 * @param level Level of the current scope located in the tree to compute the indent
 * @returns {string}
 * @private
 * @function
 */
function getFunctionScopeRepresentation(functionScope, level) {
    'use strict';
    var indentBasis = '  ',
        indent = '';
    for (var index = 0; index < level; ++index) {
        indent += indentBasis;
    }
    return indent + '+-' + functionScope;
}

/**
 * Find declared variables
 * @param globalVars
 * @function
 */
ScopeTree.prototype.findVars = function (globalVars) {
    'use strict';
    internal(this).root.setVars(globalVars);
    internal(this).root.getChildren().forEach(function (scope, def) {
        scope.setVars();
    });
};

/**
 * Find Reach Definitions and update with inter-procedural definitions
 * @function
 */
ScopeTree.prototype.findRDs = function () {
    'use strict';
    /// initialize RDs
    internal(this).functionScopes.forEach(function (scope) {
        scope.initRDs();
    });
    /// handle inter-procedural
    recursivelyUpdateRDs(this, internal(this).root);
};

/**
 * Recursively update RDs
 * @param tree
 * @param cfgWrapper Current scope
 * @private
 * @function
 */
function recursivelyUpdateRDs(tree, cfgWrapper) {
    'use strict';
    var currentScope = cfgWrapper;
    if (CFGWrapper.isCFGWrapper(currentScope)) {
        currentScope.getCFG()[2].forEach(function (cfgNode) {
            walkes(cfgNode.astNode, {
                Program: function () {},
                /// Update only when a CallExpression is shown
                CallExpression: function (node) {
                    var calleeScopeDefs = [],
                        rdsOfCalleeName = currentScope.getVarDefsReachIn(cfgNode, currentScope.getVarByName(node.callee.name)),
                        rdsOfArguments = new Set(),
                        actualArguments = node.arguments;
                    /// definition of the name could have many possible values
                    rdsOfCalleeName.forEach(function (rd) {
                        if (rd.definition.getType() === Def.FUNCTION_TYPE) {
                            calleeScopeDefs.push(rd.definition);
                        }
                    });
                    calleeScopeDefs.forEach(function (def) {
                        var calleeScope = tree.getFunctionScopeByDef(def);
                        if (currentScope === calleeScope.getParent()) {
                            calleeScope.updateRDs(
                                calleeScope.getCFG()[0],
                                currentScope.getReachIns().get(cfgNode)
                            );
                        } else {
                            calleeScope.updateRDs(
                                calleeScope.getCFG()[0],
                                currentScope.getReachIns().get(calleeScope.getParent().getCFG()[1])
                            );
                        }
                        /// TODO: separate the call site into two nodes (CALL, RETURN), then ReachIn(CALL) = ReachOut(CALL) = ReachIn(call site) = ReachIn(callee.entry), ReachIn(RETURN) = ReachOut(callee.exit) and ReachOut(RETURN) = UNION(ReachIn(RETURN), GEN(call site)) (seem as ReachOut(RETURN) = UNION(ReachIn(RETURN) - {}, GEN(call site)))
                        /// ReachOut(call site) = union(ReachOut(call site), ReachOut(callee exit))
                        currentScope.updateRDs(
                            cfgNode,
                            calleeScope.getReachOuts().get(calleeScope.getCFG()[1])
                        );

                        recursivelyUpdateRDs(tree, calleeScope);
                    });
                }
            });
        });
    }
}

/// TODO: test
ScopeTree.prototype.findInterProceduralCFG = function () {
    'use strict';
    /// handle inter-procedural
    return recursivelyUpdateCFG(this, internal(this).root);
};

/**
 * Recursively update CFG to connect callsite and callee
 * @param tree
 * @param cfgWrapper Current scope
 */
function recursivelyUpdateCFG(tree, cfgWrapper) {
    'use strict';
    var currentScope = cfgWrapper,
        interCFGNodes = [];
    if (CFGWrapper.isCFGWrapper(currentScope)) {
        currentScope.getCFG()[2].forEach(function (cfgNode) {
            walkes(cfgNode.astNode, {
                Program: function () {},
                /// Update only when a CallExpression is shown
                CallExpression: function (node) {
                    var calleeScopeDefs = [],
                        rdsOfCalleeName = currentScope.getVarDefsReachIn(cfgNode, currentScope.getVarByName(node.callee.name)),
                        rdsOfArguments = new Set(),
                        actualArguments = node.arguments;
                    /// definition of the name could have many possible values
                    rdsOfCalleeName.forEach(function (rd) {
                        if (rd.definition.getType() === Def.FUNCTION_TYPE) {
                            calleeScopeDefs.push(rd.definition);
                        }
                    });
                    calleeScopeDefs.forEach(function (def) {
                        var calleeScope = tree.getFunctionScopeByDef(def);
                        CFGExt.connect(cfgNode, calleeScope.getCFG()[0], CFGExt.CALL_CONNECT_TYPE);
                        CFGExt.connect(calleeScope.getCFG()[1], cfgNode, CFGExt.RETURN_CONNECT_TYPE);
                        interCFGNodes = interCFGNodes.concat(currentScope.getCFG()[2]);
                        interCFGNodes = interCFGNodes.concat(recursivelyUpdateCFG(tree, calleeScope));
                    });
                }
            });
        });
    }
    return interCFGNodes;
}

/**
 * Find all Def-Use pairs
 * @function
 */
ScopeTree.prototype.findDUpairs = function () {
    'use strict';
    internal(this).functionScopes.forEach(function (scope) {
        scope.findDUpairs();
    });

    var map = internal(this).dupairs;
    internal(this).functionScopes.forEach(function (scope) {
        var dupairsOfScope = scope.getDUpairs();
        dupairsOfScope.forEach(function (val, key) {
            map.set(key, ((!!map.get(key))? Set.union(map.get(key),val) : val));
        });
    });
};

/**
 * Get all Def-Use pairs
 * @returns {Map}
 * @function
 */
ScopeTree.prototype.getDUpairs = function () {
    'use strict';
    var map = new Map();
    internal(this).dupairs.forEach(function (val, key) {
        map.set(key, val);
    });
    return map;
};

/**
 * Represent Def-Use pairs to string
 * @returns {string}
 * @function
 */
ScopeTree.prototype.dupairsToString = function () {
    'use strict';
    var text = '';
    internal(this).dupairs.forEach(function (val, key) {
        text += ((text === '')? '' : '\n') + 'DefUse(' + key + ') = [';
        val.forEach(function (pair, index) {
            text += ((index === 0)? '' : ', ') + pair;
        });
        text += ']';
    });
    return text;
};

module.exports = ScopeTree;