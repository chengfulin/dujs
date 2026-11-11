/*
 * Def-Use analyzer
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-28
 */
var varDefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    dupairFactory = require('./dupairfactory'),
    pairFactory = require('./pairfactory'),
    scopeCtrl = require('./scopectrl'),
    modelCtrl = require('./modelctrl'),
    FlowNode = require('../esgraph/flownode'),
    bindingPattern = require('./bindingpattern');
var Set = require('../analyses/set'),
    walkes = require('walkes'),
    worklist = require('../analyses');

/**
 * DefUseAnalyzer
 * @constructor
 */
function DefUseAnalyzer() {
    "use strict";
    /* start-test-block */
    this._testonly_ = {
        _analyzeBuiltInObjects: analyzeBuiltInObjects,
        _analyzeDefaultValueOfLocalVariables: analyzeDefaultValueOfLocalVariables,
        _getVarDefsOfLocalVariablesReachingInExitNode: getVarDefsOfLocalVariablesReachingInExitNode,
        _findVariableAndItsDefinitionsFromASet: findVariableAndItsDefinitionsFromASet,
        _getNonReachableVarDefs: getNonReachableVarDefs
    };
    /* end-test-block */
}

/**
 * Analyze an intra-procedural model to create and set the GEN set of the definitions for built-in objects
 * @param {Model} model
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
/**
 * Check whether an AST node is a function expression (including arrow functions)
 * @param {Object} node
 * @returns {boolean}
 * @private
 */
function isFunctionExpression(node) {
    'use strict';
    return !!node && (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression');
}

/**
 * Get the variables defined by assigning to a target or pattern: identifiers,
 * and the objects of member expressions (a.b = ... defines a)
 * @param {Object} target Identifier, MemberExpression or pattern
 * @param {Scope} scope Scope to resolve the variables
 * @returns {Array} Var objects
 * @private
 */
function getDefinedVariables(target, scope) {
    'use strict';
    var variables = [];
    bindingPattern.getTargets(target).forEach(function (node) {
        var name = (node.type === 'MemberExpression') ? node.object.name : node.name;
        var variable = scope.getVariable(name);
        if (!!variable && variables.indexOf(variable) === -1) {
            variables.push(variable);
        }
    });
    return variables;
}

function analyzeBuiltInObjects(model) {
    'use strict';
    var builtInObjectVars = model.mainlyRelatedScope.builtInObjectVars;
    var builtInObjects = model.mainlyRelatedScope.builtInObjects;
    var vardefOfBuiltInObjects = new Set();
    var modelGraphEntryNode = model.graph[0];

    builtInObjects.forEach(function (objDescriptor) {
        var variable = builtInObjectVars.get(objDescriptor.name);
        vardefOfBuiltInObjects.add(varDefFactory.createGlobalVarDef(variable, modelGraphEntryNode, objDescriptor.def));
    });

    modelGraphEntryNode.generate = Set.union(modelGraphEntryNode.generate, vardefOfBuiltInObjects);
}

/**
 * Analyze an intra-procedural model to create and set GEN set of the default definition of local variables
 * @param {Model} model
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function analyzeDefaultValueOfLocalVariables(model) {
    "use strict";
    var scope = model.mainlyRelatedScope;
    var scopeEntryNode = model.graph[0];
    var vardefOfLocalVars = new Set();
    scope.vars.forEach(function (variable, name) {
        /// let/const/class variables have no value before their declaration (TDZ)
        if (!scope.hasNamedFunction(name) && !scope.hasBuiltInObject(name) && !scope.isLexicalVariable(name)) {
            vardefOfLocalVars.add(varDefFactory.createGlobalUndefinedVarDef(variable, scopeEntryNode));
        }
    });
    scopeEntryNode.generate = Set.union(scopeEntryNode.generate, vardefOfLocalVars);
}

/**
 * Analyze definition of declaration of inner functions
 * @param {Model} model
 */
function analyzeFunctionDeclaration(model) {
    "use strict";
    var scope = model.mainlyRelatedScope;
    var scopeEntryNode = model.graph[0];
    var vardefOfNamedFunctions = new Set();
    /// the entry node refers to the Program or the body (BlockStatement) of the function
    walkes(scopeEntryNode.astNode, {
        FunctionExpression: function () {},
        ArrowFunctionExpression: function () {},
        FunctionDeclaration: function (node) {
            var funVar = scope.namedFunctionVars.get(node.id.name);
            if (!!funVar) {
                vardefOfNamedFunctions.add(varDefFactory.create(funVar, defFactory.createFunctionDef(scopeEntryNode, node.range)));
            }
        }
    });
    scopeEntryNode.generate = Set.union(scopeEntryNode.generate, vardefOfNamedFunctions);
}

/**
 * Initially analyze intra-procedural models
 */
DefUseAnalyzer.prototype.initiallyAnalyzeIntraProceduralModels = function () {
    "use strict";
    var pageScopeTrees = scopeCtrl.pageScopeTrees;
    pageScopeTrees.forEach(function (scopeTree) {
        var scopes = scopeTree.scopes;
        scopes.forEach(function (scope) {
            var model = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
            analyzeBuiltInObjects(model);
            analyzeDefaultValueOfLocalVariables(model);
            analyzeFunctionDeclaration(model);
        });
    });
};

/**
 * Get Def-Use pairs of a model
 * @param {Model} model
 */
DefUseAnalyzer.prototype.findDUPairs = function (model) {
    'use strict';
    var dupairs = new Map();
    model.graph[2].forEach(function (node) {
        var nodeCUse = getUsedDefs(node.reachIns, node.cuse),
            nodePUse = getUsedDefs(node.reachIns, node.puse);
        /// Initialization
        node.reachIns.values().forEach(function (elem) {
            var pairs = dupairs.get(elem.variable) || new Set();
            dupairs.set(elem.variable, pairs);
        });
        /// add Def-Use pairs of c-use
        nodeCUse.values().forEach(function (elem) {
            var pairs = dupairs.get(elem.variable);
            /// Assume each id of CFG nodes will be different
            pairs.add(dupairFactory.create(elem.definition.fromNode, node));
            dupairs.set(elem.variable, pairs);
        });
        /// add Def-Use pairs of p-use
        nodePUse.values().forEach(function (elem) {
            var pairs = dupairs.get(elem.variable);
            /// Assume each id of CFG nodes will be different
            pairs.add(dupairFactory.create(elem.definition.fromNode, pairFactory.create(node, node.true)));
            pairs.add(dupairFactory.create(elem.definition.fromNode, pairFactory.create(node, node.false)));
            dupairs.set(elem.variable, pairs);
        });
    });
    model.dupairs = dupairs;
};

/**
 * Get used definitions by getting the intersection of RD and USE
 * @param defs reaching definitions
 * @param used used definition names
 * @returns used definitions
 */
function getUsedDefs(defs, used) {
    'use strict';
    var usedDefs = new Set();
    if (defs instanceof Set && used instanceof Set) {
        defs.forEach(function (vardef) {
            used.forEach(function (variable) {
                if (vardef.variable === variable) {
                    usedDefs.add(vardef);
                }
            });
        });
    }
    return usedDefs;
}

/**
 * Do reach definition analysis
 * @param {Model} model
 */
DefUseAnalyzer.prototype.doAnalysis = function (model) {
    "use strict";
    var thisAnalyzer = this;
    var reachDefinitions = worklist(
        model.graph,
        function (input) { /// input = ReachIn(n)
            var currentNode = this;
            if (!!currentNode.extraReachIns) {
                if (!!input) {
                    input = Set.union(input, currentNode.extraReachIns);
                } else {
                    input = new Set(currentNode.extraReachIns);
                }
            }
            var generate = currentNode.generate || thisAnalyzer.findGENSet(currentNode);
            /// KILL depends on the definitions reaching this node, which are only known
            /// during the iteration, so it is computed from the current input every time
            var kill = computeKILLSet(currentNode, input || new Set(), generate);
            currentNode.kill = kill;
            thisAnalyzer.findUSESet(currentNode);
            if (!!currentNode.scope) {
                currentNode.scope.lastReachIns = new Set(input);
            }
            return Set.union(Set.minus(input, kill), generate);
        },
        {direction: 'forward', start: new Set()}
    );
    reachDefinitions.inputs.forEach(function (varDefSet, node) {
        node.reachIns = new Set(varDefSet);
    });
    reachDefinitions.outputs.forEach(function (varDefSet, node) {
        node.reachOuts = new Set(varDefSet);
    });
};

/**
 * Find variable and its definitions from a VarDef set
 * @param {Set} vardefSet
 * @param {Var} variable
 * @returns {Set}
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
/**
 * Compute the KILL set of a node from the definitions reaching it: a node kills
 * every other definition of the variables it defines (its GEN set); an exit node
 * also kills the definitions of the local variables of its scope, and an entry
 * node kills those not reachable from its scope
 * @param {FlowNode} cfgNode
 * @param {Set} reachIns Definitions reaching the node
 * @param {Set} generate GEN set of the node
 * @returns {Set}
 * @private
 */
function computeKILLSet(cfgNode, reachIns, generate) {
    "use strict";
    var definedVars = [];
    generate.forEach(function (vardef) {
        if (definedVars.indexOf(vardef.variable) === -1) {
            definedVars.push(vardef.variable);
        }
    });
    var killed = new Set();
    reachIns.forEach(function (vardef) {
        if (definedVars.indexOf(vardef.variable) !== -1 && !generate.has(vardef)) {
            killed.add(vardef);
        }
    });
    if (!!cfgNode.scope) {
        if (cfgNode.type === FlowNode.EXIT_NODE_TYPE) {
            /// all variables of the scope, including those of its block scopes, go out of scope
            killed = Set.union(killed, getVarDefsOfLocalVariablesReachingInExitNode({reachIns: reachIns}, cfgNode.scope.getVariablesIncludingBlockScopes()));
        } else if (cfgNode.type === FlowNode.ENTRY_NODE_TYPE) {
            killed = Set.union(killed, getNonReachableVarDefs(reachIns, cfgNode.scope));
        }
    }
    return killed;
}

function findVariableAndItsDefinitionsFromASet(vardefSet, variable) {
    "use strict";
    var set = new Set();
    vardefSet.forEach(function (vardef) {
        if (vardef.variable === variable) {
            set.add(vardef);
        }
    });
    return set;
}

/**
 * Get local variables and its definitions from reach in definitions of an exit node
 * @param {FlowNode} exitNode
 * @returns {Set} Reach out set
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function getVarDefsOfLocalVariablesReachingInExitNode(exitNode, locals) {
    "use strict";
    var reachIns = exitNode.reachIns || new Set();
    var reachOuts = new Set();
    locals.forEach(function (localVariable) {
        var foundVarDefs = findVariableAndItsDefinitionsFromASet(reachIns, localVariable);
        reachOuts = Set.union(reachOuts, foundVarDefs);
    });
    return reachOuts;
}

/**
 * Get non-reachable VarDefs related to a scope
 * @param {Set} vardefSet
 * @param {Scope} scope
 * @returns {Set}
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function getNonReachableVarDefs(vardefSet, scope) {
    "use strict";
    var nonReachable = new Set();
    vardefSet.forEach(function (vardef) {
        if (vardef.variable !== scope.getVariable(vardef.variable.name)) {
            nonReachable.add(vardef);
        }
    });
    return nonReachable;
}

/**
 * Find set of variable and  corresponding definitions which should be killed
 * @param {FlowNode} cfgNode
 * @returns {Set}
 */
DefUseAnalyzer.prototype.findKILLSet = function (cfgNode) {
    'use strict';
    var killedVarDef = new Set();
    var currentScope = cfgNode.scope;
    var reachIns = cfgNode.reachIns || new Set();
        if (cfgNode.type === FlowNode.EXIT_NODE_TYPE) {
            killedVarDef = Set.union(killedVarDef, getVarDefsOfLocalVariablesReachingInExitNode(cfgNode, currentScope.vars));
        } else if (cfgNode.type === FlowNode.ENTRY_NODE_TYPE) {
            killedVarDef = Set.union(killedVarDef, getNonReachableVarDefs(reachIns, currentScope));
        } else {
            walkes(cfgNode.astNode, {
                Program: function () {},
                FunctionDeclaration: function () {},
                FunctionExpression: function () {},
                ArrowFunctionExpression: function () {},
                AssignmentExpression: function (node, recurse) {
                    killedVarDef = Set.union(
                        killedVarDef,
                        findVariableAndItsDefinitionsFromASet(
                            reachIns,
                            (node.left.type === 'MemberExpression') ? currentScope.getVariable(node.left.object.name) : currentScope.getVariable(node.left.name)
                        )
                    );
                    if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {/// Sequential assignment
                        recurse(node.right);
                    }
                },
                UpdateExpression: function (node) {
                    killedVarDef = Set.union(
                        killedVarDef,
                        findVariableAndItsDefinitionsFromASet(
                            reachIns,
                            currentScope.getVariable(node.argument.name)
                        )
                    );
                },
                SwitchCase: function () {},
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(function (declarator) {
                        recurse(declarator);
                    });
                },
                VariableDeclarator: function (node) {
                    killedVarDef = Set.union(
                        killedVarDef,
                        findVariableAndItsDefinitionsFromASet(
                            reachIns,
                            currentScope.getVariable(node.id.name)
                        )
                    );
                }
            });
        }
    cfgNode.kill = killedVarDef;
    return killedVarDef;
};

/**
 * Find the set of variables and the corresponding definitions which will be generated
 * @param {FlowNode} cfgNode
 * @returns {Set}
 */
DefUseAnalyzer.prototype.findGENSet = function (cfgNode) {
    'use strict';
    var generatedVarDef = new Set();
    var currentScope = cfgNode.scope;
    /// for-in/for-of: the loop node assigns the next key/value to the loop variables
    function defineLoopVariables(node) {
        var left = (node.left.type === 'VariableDeclaration') ? node.left.declarations[0].id : node.left;
        getDefinedVariables(left, currentScope).forEach(function (variable) {
            generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.left.range)));
        });
    }
    walkes(cfgNode.astNode, {
        Program: function () {},
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        ArrowFunctionExpression: function () {},
        AssignmentExpression: function (node, recurse) {
            if (bindingPattern.isPattern(node.left)) { /// destructuring assignment
                getDefinedVariables(node.left, currentScope).forEach(function (variable) {
                    generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.right.range)));
                });
                return;
            }
            var definedVar = (node.left.type === 'MemberExpression') ? currentScope.getVariable(node.left.object.name) : currentScope.getVariable(node.left.name);
            if (!!definedVar) {
                if (isFunctionExpression(node.right)) {
                    generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.right.range)));
                } else {
                    generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.right.range)));
                    if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {
                        recurse(node.right);
                    }
                }
            }
        },
        UpdateExpression: function (node) {
            var definedVar = currentScope.getVariable(node.argument.name);
            if (!!definedVar) {
                generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.range)));
            }
        },
        /// the loop node defines the loop variable on each iteration; its body has its own nodes
        ForInStatement: defineLoopVariables,
        ForOfStatement: defineLoopVariables,
        VariableDeclaration: function (node, recurse) {
            node.declarations.forEach(function (declarator) {
                recurse(declarator);
            });
        },
        VariableDeclarator: function (node, recurse) {
            if (bindingPattern.isPattern(node.id)) { /// destructuring declaration (always initialized)
                getDefinedVariables(node.id, currentScope).forEach(function (variable) {
                    generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.init.range)));
                });
                recurse(node.init);
                return;
            }
            var definedVar = currentScope.getVariable(node.id.name);
            if (!!definedVar) {
                if (!!node.init) {
                    if (isFunctionExpression(node.init)) {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.init.range)));
                    } else {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.init.range)));
                        recurse(node.init);
                    }
                } else {
                    generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createUndefinedDef(cfgNode, node.range)));
                }
            }
        },
        SwitchCase: function () {}
    });
    cfgNode.generate = generatedVarDef;
    return generatedVarDef;
};

/**
 * Find the set of used variables (both c-use and p-use)
 * @param {FlowNode} cfgNode Graph node
 * @returns {Object} Object collects c-use set and p-use set
 */
/**
 * Walk the expressions used by the head of a for-in/for-of loop node: the
 * iterated object, defaults of a destructuring pattern, and the object of a
 * member target
 * @param {Object} node ForInStatement or ForOfStatement
 * @param {Function} recurse
 * @private
 */
function useLoopHead(node, recurse) {
    'use strict';
    var left = (node.left.type === 'VariableDeclaration') ? node.left.declarations[0].id : node.left;
    if (left.type === 'MemberExpression') {
        recurse(left.object);
    }
    bindingPattern.getEvaluatedExpressions(left).forEach(recurse);
    recurse(node.right);
}

DefUseAnalyzer.prototype.findUSESet = function (cfgNode) {
    'use strict';
    var cuseVars = new Set(), puseVars = new Set(),  isPUse = false;
    var currentScope = cfgNode.scope;
    walkes(cfgNode.astNode, {
        Program: function () {},
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        ArrowFunctionExpression: function () {},
        AssignmentExpression: function (node, recurse) {
            if (bindingPattern.isPattern(node.left)) { /// destructuring: defaults and computed keys are used
                bindingPattern.getEvaluatedExpressions(node.left).forEach(recurse);
            }
            if (node.right.type === 'AssignmentExpression') {
                recurse(node.right.left);
            } else {
                var selfAssignmentOp = ['+=', '-=', '*=', '/=', '%='];
                if (selfAssignmentOp.indexOf(node.operator) !== -1) {
                    recurse(node.left);
                }
            }
            recurse(node.right);
        },
        BinaryExpression: function (node, recurse) {
            if (!!cfgNode.true && !!cfgNode.false) {
                isPUse = true;
            }
            recurse(node.left);
            recurse(node.right);
            isPUse = false;
        },
        CallExpression: function (node, recurse) {
            if (!!cfgNode.true && !!cfgNode.false) {
                isPUse = true;
            }
            recurse(node.callee);
            isPUse = false;
            node["arguments"].forEach(recurse);
        },
        VariableDeclaration: function (node, recurse) {
            node.declarations.forEach(recurse);
        },
        VariableDeclarator: function (node, recurse) {
            bindingPattern.getEvaluatedExpressions(node.id).forEach(recurse);
            if (!!node.init && node.init.type === 'AssignmentExpression') {
                recurse(node.init.left);
            }
            recurse(node.init);
        },
        UpdateExpression: function (node, recurse) {
            recurse(node.argument);
        },
        /// the loop node only uses the iterated object; its body has its own nodes
        ForInStatement: useLoopHead,
        ForOfStatement: useLoopHead,
        NewExpression: function (node, recurse) {
            recurse(node.callee);
        },
        UnaryExpression: function (node, recurse) {
            if (!!cfgNode.true && !!cfgNode.false) {
                isPUse = true;
            }
            recurse(node.argument);
            isPUse = false;
        },
        SwitchCase: function (node, recurse) {
            isPUse = true;
            if (!!node.test && !!cfgNode.parent && cfgNode.parent.type === 'SwitchStatement') {
                recurse(cfgNode.parent.discriminant);
            }
        },
        ConditionalExpression: function (node, recurse) {
            isPUse = true;
            recurse(node.test);
            isPUse = false;
            recurse(node.consequent);
            recurse(node.alternate);
        },
        MemberExpression: function (node, recurse) {
            recurse(node.object);
        },
        /// a property key of an object literal is not a variable, unless computed
        Property: function (node, recurse) {
            if (node.computed) {
                recurse(node.key);
            }
            recurse(node.value);
        },
        Identifier: function (node) {
            if (cfgNode.astNode.type !== 'Identifier') {
                var usedVar = currentScope.getVariable(node.name);
                if (!!usedVar) {
                    if (!isPUse) {
                        cuseVars.add(usedVar);
                    } else {
                        puseVars.add(usedVar);
                    }
                }
            }
        }
    });
    cfgNode.cuse = cuseVars;
    cfgNode.puse = puseVars;
    return {cuse: cuseVars, puse: puseVars};
};

var singleton = new DefUseAnalyzer();
module.exports = singleton;
