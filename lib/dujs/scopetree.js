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
    Set = require('../analyses').Set,
    Map = require('core-js/es6/map'),
    walkes = require('walkes'),
    vardefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    varFactory = require('./varfactory');

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
    internal(this).dupairs = new Map();

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
 * @function
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
                params.push(varFactory.create(paramNode.name, paramNode.range, cfgWrapper.getScope()));
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
            if (!!node.init && node.init.type === 'FunctionExpression') {
                var cfg = CFGExt.getCFG(node.init.body),
                    cfgWrapper = new CFGWrapper(
                        cfg,
                        new Scope(internal(thisTree).numOfAnonymousFunctions),
                        current || null
                    ),
                    params = [];
                node.init.params.forEach(function (paramNode) {
                    params.push(varFactory.create(paramNode.name, paramNode.range, cfgWrapper.getScope()));
                });
                cfgWrapper.setParams(params);
                internal(thisTree).numOfAnonymousFunctions += 1;
                if (!!current) {
                    current.addChild(cfgWrapper, varFactory.create(
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
 * @static
 * @function
 */
FunctionScopeTree.validate = function (ast, msg) {
    'use strict';
    if (!ast.type ||
        (ast.type !== 'Program' && ast.type !== 'FunctionDeclaration' && ast.type !== 'FunctionExpression')) {
        throw new Error(msg || 'Invalid start point for a FunctionScopeTree');
    }
};

/**
 * Getter for the root scope
 * @returns {*|CFGWrapper}
 * @function
 */
FunctionScopeTree.prototype.getRoot = function () {
    'use strict';
    return internal(this).root;
};

/**
 * method for getting a function scope (CFGWrapper type) by comparing its range
 * @param range Range object or the string representation of it
 * @returns {*|CFGWrapper}
 * @function
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
 * @function
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
 * @function
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
 * @function
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
 * @function
 */
FunctionScopeTree.prototype.getFunctionScopes = function () {
    'use strict';
    return [].concat(internal(this).functionScopes);
};

/**
 * Getter for the number of anonymous functions
 * @returns {*|number}
 * @function
 */
FunctionScopeTree.prototype.getNumOfAnonymousFunctions = function () {
    'use strict';
    return internal(this).numOfAnonymousFunctions;
};

/**
 * Represent the FunctionScopeTree as a string
 * @returns {string}
 * @function
 */
FunctionScopeTree.prototype.toString = function () {
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
FunctionScopeTree.prototype.findVars = function (globalVars) {
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
FunctionScopeTree.prototype.findRDs = function () {
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
FunctionScopeTree.prototype.findInterProceduralCFG = function () {
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
FunctionScopeTree.prototype.findDUpairs = function () {
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
FunctionScopeTree.prototype.getDUpairs = function () {
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
FunctionScopeTree.prototype.dupairsToString = function () {
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

module.exports = FunctionScopeTree;