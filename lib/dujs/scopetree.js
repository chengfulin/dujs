/**
 * Created by chengfulin on 2015/4/29.
 */
var CFGExt = require('./cfgext'),
    ScopeWrapper = require('./scopewrapper'),
    Scope = require('./scope'),
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
    factoryScopeWrapper = require('./scopewrapperfactory');

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
 * Build the function scope tree with an AST
 * @param ast AST
 * @function
 */
ScopeTree.prototype.buildScopeTree = function (ast) {
    'use strict';
    var thisTree = this, current = null, globalScopeName = Scope.GLOBAL_SCOPE;
    walkes(ast, {
        Program: function (node, recurse) {
            var cfg = CFGExt.getCFG(node),
                programScopeWrapper = factoryScopeWrapper.createProgramScopeWrapper(cfg);
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
            var cfg = CFGExt.getCFG(node.body),
                functionScopeWrapper = factoryScopeWrapper.createFunctionScopeWrapper(cfg, node.id.name),
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
            var cfg = CFGExt.getCFG(node.body),
                anonymousFunctionWrapper = factoryScopeWrapper.createAnonymousFunctionScopeWrapper(cfg),
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
 * method for getting a function scope (ScopeWrapper type) by comparing its range
 * @param range Range object or the string representation of it
 * @returns {*|ScopeWrapper}
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
 * @returns {*|ScopeWrapper}
 * @function
 */
ScopeTree.prototype.getScopeByDef = function (definition) {
    'use strict';
    return internal(this)._mapFromDefToScope.get(definition);
};

/**
 * Method for getting a function scope (ScopeWrapper type) by comparing its scope name
 * @param scopeName Scope object or the string representation of it
 * @returns {*|ScopeWrapper}
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
 * Check the ScopeWrapper is in the tree or not
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
    if (ScopeWrapper.isScopeWrapper(currentScope)) {
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
//
///**
// * Find Reach Definitions and update with inter-procedural definitions
// * @function
// */
//ScopeTree.prototype.findRDs = function () {
//    'use strict';
//    /// initialize RDs
//    internal(this).functionScopes.forEach(function (scope) {
//        scope.initRDs();
//    });
//    /// handle inter-procedural
//    recursivelyUpdateRDs(this, internal(this).root);
//};
//
///**
// * Recursively update RDs
// * @param tree
// * @param cfgWrapper Current scope
// * @private
// * @function
// */
//function recursivelyUpdateRDs(tree, cfgWrapper) {
//    'use strict';
//    var currentScope = cfgWrapper;
//    if (CFGWrapper.isCFGWrapper(currentScope)) {
//        currentScope.getCFG()[2].forEach(function (cfgNode) {
//            walkes(cfgNode.astNode, {
//                Program: function () {},
//                /// Update only when a CallExpression is shown
//                CallExpression: function (node) {
//                    var calleeScopeDefs = [],
//                        rdsOfCalleeName = currentScope.getVarDefsReachIn(cfgNode, currentScope.getVarByName(node.callee.name)),
//                        rdsOfArguments = new Set(),
//                        actualArguments = node.arguments;
//                    /// definition of the name could have many possible values
//                    rdsOfCalleeName.forEach(function (rd) {
//                        if (rd.definition.getType() === Def.FUNCTION_TYPE) {
//                            calleeScopeDefs.push(rd.definition);
//                        }
//                    });
//                    calleeScopeDefs.forEach(function (def) {
//                        var calleeScope = tree.getFunctionScopeByDef(def);
//                        if (currentScope === calleeScope.getParent()) {
//                            calleeScope.updateRDs(
//                                calleeScope.getCFG()[0],
//                                currentScope.getReachIns().get(cfgNode)
//                            );
//                        } else {
//                            calleeScope.updateRDs(
//                                calleeScope.getCFG()[0],
//                                currentScope.getReachIns().get(calleeScope.getParent().getCFG()[1])
//                            );
//                        }
//                        /// TODO: separate the call site into two nodes (CALL, RETURN), then ReachIn(CALL) = ReachOut(CALL) = ReachIn(call site) = ReachIn(callee.entry), ReachIn(RETURN) = ReachOut(callee.exit) and ReachOut(RETURN) = UNION(ReachIn(RETURN), GEN(call site)) (seem as ReachOut(RETURN) = UNION(ReachIn(RETURN) - {}, GEN(call site)))
//                        /// ReachOut(call site) = union(ReachOut(call site), ReachOut(callee exit))
//                        currentScope.updateRDs(
//                            cfgNode,
//                            calleeScope.getReachOuts().get(calleeScope.getCFG()[1])
//                        );
//
//                        recursivelyUpdateRDs(tree, calleeScope);
//                    });
//                }
//            });
//        });
//    }
//}
//
///// TODO: test
//ScopeTree.prototype.findInterProceduralCFG = function () {
//    'use strict';
//    /// handle inter-procedural
//    return recursivelyUpdateCFG(this, internal(this).root);
//};
//
///**
// * Recursively update CFG to connect callsite and callee
// * @param tree
// * @param cfgWrapper Current scope
// */
//function recursivelyUpdateCFG(tree, cfgWrapper) {
//    'use strict';
//    var currentScope = cfgWrapper,
//        interCFGNodes = [];
//    if (CFGWrapper.isCFGWrapper(currentScope)) {
//        currentScope.getCFG()[2].forEach(function (cfgNode) {
//            walkes(cfgNode.astNode, {
//                Program: function () {},
//                /// Update only when a CallExpression is shown
//                CallExpression: function (node) {
//                    var calleeScopeDefs = [],
//                        rdsOfCalleeName = currentScope.getVarDefsReachIn(cfgNode, currentScope.getVarByName(node.callee.name)),
//                        rdsOfArguments = new Set(),
//                        actualArguments = node.arguments;
//                    /// definition of the name could have many possible values
//                    rdsOfCalleeName.forEach(function (rd) {
//                        if (rd.definition.getType() === Def.FUNCTION_TYPE) {
//                            calleeScopeDefs.push(rd.definition);
//                        }
//                    });
//                    calleeScopeDefs.forEach(function (def) {
//                        var calleeScope = tree.getFunctionScopeByDef(def);
//                        CFGExt.connect(cfgNode, calleeScope.getCFG()[0], CFGExt.CALL_CONNECT_TYPE);
//                        CFGExt.connect(calleeScope.getCFG()[1], cfgNode, CFGExt.RETURN_CONNECT_TYPE);
//                        interCFGNodes = interCFGNodes.concat(currentScope.getCFG()[2]);
//                        interCFGNodes = interCFGNodes.concat(recursivelyUpdateCFG(tree, calleeScope));
//                    });
//                }
//            });
//        });
//    }
//    return interCFGNodes;
//}
//
///**
// * Find all Def-Use pairs
// * @function
// */
//ScopeTree.prototype.findDUpairs = function () {
//    'use strict';
//    internal(this).functionScopes.forEach(function (scope) {
//        scope.findDUpairs();
//    });
//
//    var map = internal(this).dupairs;
//    internal(this).functionScopes.forEach(function (scope) {
//        var dupairsOfScope = scope.getDUpairs();
//        dupairsOfScope.forEach(function (val, key) {
//            map.set(key, ((!!map.get(key))? Set.union(map.get(key),val) : val));
//        });
//    });
//};
//
///**
// * Get all Def-Use pairs
// * @returns {Map}
// * @function
// */
//ScopeTree.prototype.getDUpairs = function () {
//    'use strict';
//    var map = new Map();
//    internal(this).dupairs.forEach(function (val, key) {
//        map.set(key, val);
//    });
//    return map;
//};
//
///**
// * Represent Def-Use pairs to string
// * @returns {string}
// * @function
// */
//ScopeTree.prototype.dupairsToString = function () {
//    'use strict';
//    var text = '';
//    internal(this).dupairs.forEach(function (val, key) {
//        text += ((text === '')? '' : '\n') + 'DefUse(' + key + ') = [';
//        val.forEach(function (pair, index) {
//            text += ((index === 0)? '' : ', ') + pair;
//        });
//        text += ']';
//    });
//    return text;
//};

module.exports = ScopeTree;