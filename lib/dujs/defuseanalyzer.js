/*
 * Def-Use analyzer
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var varDefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    Def = require('./def'),
    dupairFactory = require('./dupairfactory'),
    pairFactory = require('./pairfactory'),
    scopeCtrl = require('./scopectrl'),
    modelCtrl = require('./modelctrl'),
    FlowNode = require('../esgraph/flownode'),
    bindingPattern = require('./bindingpattern'),
    scopeBinding = require('./scopebinding'),
    usedExpressions = require('./usedexpressions');
var Set = require('../analyses/set'),
    walkes = require('walkes'),
    reachingSolver = require('./reachingsolver');

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
        _getNonReachableVarDefs: getNonReachableVarDefs,
        _bypassFilter: bypassFilter
    };
    /* end-test-block */
}

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
 * Get the variables defined by an identifier through the binding of its page
 * (feature 006 defVarsOf); none without a binding
 * @param {PageBinding|null} binding
 * @param {Object} identifier Identifier node (other nodes define nothing)
 * @returns {Array} Var objects
 * @private
 */
function defVarsOf(binding, identifier) {
    'use strict';
    if (!binding || !identifier || identifier.type !== 'Identifier') {
        return [];
    }
    return binding.defVarsOf(identifier);
}

/**
 * Get the variables defined by assigning to a target or pattern: identifiers,
 * and the objects of member expressions (a.b = ... defines a)
 * @param {Object} target Identifier, MemberExpression or pattern
 * @param {PageBinding|null} binding Binding of the page to resolve the identifiers
 * @returns {Array} Var objects
 * @private
 */
function getDefinedVariables(target, binding) {
    'use strict';
    var variables = [];
    bindingPattern.getTargets(target).forEach(function (node) {
        var identifier = (node.type === 'MemberExpression') ? node.object : node;
        defVarsOf(binding, identifier).forEach(function (variable) {
            if (variables.indexOf(variable) === -1) {
                variables.push(variable);
            }
        });
    });
    return variables;
}

/**
 * Whether a Var has the value undefined at the entry of its scope: a variable
 * declared by var, a parameter, or a global assigned without declaration (not
 * a function, a let/const/class/import binding, a catch parameter nor a name
 * of a named expression; feature 006 data-model section 2); a Var without
 * binding is a plain local variable
 * @param {Var} variable
 * @returns {boolean}
 * @private
 */
function hasUndefinedInitialValue(variable) {
    'use strict';
    if (!variable.binding) {
        return true;
    }
    return [scopeBinding.KINDS.VAR, scopeBinding.KINDS.PARAMETER, scopeBinding.KINDS.IMPLICIT_GLOBAL]
        .indexOf(variable.binding.kind) !== -1;
}

/**
 * Whether a variable is visible in a scope: by the binding of its page
 * (feature 006 research R6); without a binding (the domain scope, scopes
 * built without a page), when it is registered in the scope or an ancestor
 * @param {Var} variable
 * @param {Scope} scope
 * @returns {boolean}
 * @private
 */
function isVisibleIn(variable, scope) {
    'use strict';
    var binding = scope.binding;
    if (!!binding) {
        return binding.isVisible(variable, scope);
    }
    for (var current = scope; !!current; current = current.parent) {
        if (current.variables.indexOf(variable) !== -1) {
            return true;
        }
    }
    return false;
}

/**
 * Analyze an intra-procedural model to create and set the GEN set of the definitions for built-in objects
 * @param {Model} model
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
function analyzeBuiltInObjects(model) {
    'use strict';
    var builtInVariables = scopeBinding.builtInVariablesOf(model.mainlyRelatedScope);
    var builtInObjects = model.mainlyRelatedScope.builtInObjects;
    var vardefOfBuiltInObjects = new Set();
    var modelGraphEntryNode = model.graph[0];

    /// the Vars are in the order of the descriptors
    builtInObjects.forEach(function (objDescriptor, index) {
        var variable = builtInVariables[index];
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
    var builtInVariables = scopeBinding.builtInVariablesOf(scope);
    scope.variables.forEach(function (variable) {
        /// let/const/class variables have no value before their declaration (TDZ)
        if (builtInVariables.indexOf(variable) === -1 && hasUndefinedInitialValue(variable)) {
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
    /// a function declared with the name of a built-in object is that object (F9)
    var builtInVariables = scopeBinding.builtInVariablesOf(scope);
    /// the entry node refers to the Program or the body (BlockStatement) of the function
    walkes(scopeEntryNode.astNode, {
        FunctionExpression: function () {},
        ArrowFunctionExpression: function () {},
        ClassBody: function () {},
        FunctionDeclaration: function (node) {
            defVarsOf(scope.binding, node.id).forEach(function (funVar) {
                if (builtInVariables.indexOf(funVar) === -1) {
                    vardefOfNamedFunctions.add(varDefFactory.create(funVar, defFactory.createFunctionDef(scopeEntryNode, node.range)));
                }
            });
        }
    });
    scopeEntryNode.generate = Set.union(scopeEntryNode.generate, vardefOfNamedFunctions);
}

/**
 * Analyze the intra-procedural model of a page scope to create and set the GEN
 * set of the definitions of the globals only read without declaration
 * (feature 006, D3, FR-006), in the order of binding.globalVars()
 * @param {Model} model
 * @private
 */
function analyzeGlobals(model) {
    "use strict";
    var binding = model.mainlyRelatedScope.binding;
    if (!binding) {
        return;
    }
    var scopeEntryNode = model.graph[0];
    var vardefOfGlobals = new Set();
    binding.globalVars().forEach(function (variable) {
        vardefOfGlobals.add(varDefFactory.createGlobalVarDef(variable, scopeEntryNode, Def.GLOBAL_TYPE));
    });
    scopeEntryNode.generate = Set.union(scopeEntryNode.generate, vardefOfGlobals);
}

/**
 * Initially analyze intra-procedural models: at the entry of each scope, the
 * built-in objects, the undefined initial values and the declared functions;
 * at the entry of a page, then the globals only read
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
            if (scope === scopeTree.root) {
                analyzeGlobals(model);
            }
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
 * Definitions bypassing a call (FR-016, data-model §5): those of the variables
 * the callee cannot see (not visible or shadowed in its scope), and those of
 * the variables of the callee itself and of its block scopes (another
 * activation record of a recursive call). Only the scope of the direct callee
 * is checked: a function called by the callee that redefines a variable the
 * callee shadows does not stop the old definition from bypassing (a safe
 * over-approximation, no pair is missed)
 * @param {Set} vardefs Definitions reaching out of the node with the call edge
 * @param {Scope} calleeScope Scope of the callee
 * @returns {Set} a new Set
 * @private
 */
function bypassFilter(vardefs, calleeScope) {
    "use strict";
    var ownVariables = calleeScope.getVariablesIncludingBlockScopes(),
        kept = new Set();
    (vardefs || new Set()).forEach(function (vardef) {
        var variable = vardef.variable;
        if (!isVisibleIn(variable, calleeScope) || ownVariables.indexOf(variable) !== -1) {
            kept.add(vardef);
        }
    });
    return kept;
}

/**
 * Do reach definition analysis by the edge-type-aware solver
 * (lib/dujs/reachingsolver.js, feature 005 research R2): an exception edge
 * carries the definitions reaching its source (FR-014), except one to the exit
 * of a callee (transitional rule of analyze Q1, until the summaries are used).
 * The input of the CALL RETURN NODE of a call also has the definitions
 * bypassing the call (FR-016): those reaching out of the node with the call
 * edge that the callee cannot change (bypassFilter); they are computed from the
 * current output of that node, and the CALL RETURN NODE is analyzed again when
 * that output changes
 * @param {Model} model
 */
DefUseAnalyzer.prototype.doAnalysis = function (model) {
    "use strict";
    var thisAnalyzer = this;
    var solved = reachingSolver.solve(model.graph, {
        entryInput: new Set(),
        generateOf: function (node) {
            return node.generate || thisAnalyzer.findGENSet(node);
        },
        useOf: function (node) {
            thisAnalyzer.findUSESet(node);
        },
        extraReachIns: function (node, outOf) {
            var extras = node.extraReachIns || null;
            var bypass = (typeof model.callBypassOf === 'function') ? model.callBypassOf(node) : null;
            if (!!bypass) {
                extras = Set.union(extras || new Set(), bypassFilter(outOf(bypass.callNode), bypass.calleeScope));
            }
            return extras;
        },
        exceptionToCalleeExitCarriesOut: true
    });
    var results = new Map();
    solved.results.forEach(function (result, node) {
        node.reachIns = new Set(result.in);
        node.reachOuts = new Set(result.out);
        node.kill = result.kill;
        results.set(node, {
            reachIns: result.in,
            reachOuts: result.out,
            generate: result.generate,
            kill: node.kill,
            cuse: node.cuse,
            puse: node.puse
        });
    });
    model.setAnalysisResults(results);
};

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

/**
 * Find variable and its definitions from a VarDef set
 * @param {Set} vardefSet
 * @param {Var} variable
 * @returns {Set}
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
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
 * @param {Object} exitNode Exit node, or an object with its reachIns
 * @param {Map} locals Local variables of the scope (Var objects as values)
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
        if (!isVisibleIn(vardef.variable, scope)) {
            nonReachable.add(vardef);
        }
    });
    return nonReachable;
}

/**
 * Find the set of variables and the corresponding definitions which will be generated
 * @param {FlowNode} cfgNode
 * @returns {Set}
 */
DefUseAnalyzer.prototype.findGENSet = function (cfgNode) {
    'use strict';
    var generatedVarDef = new Set();
    var binding = !!cfgNode.scope ? cfgNode.scope.binding : null;
    /// for-in/for-of: the loop node assigns the next key/value to the loop variables
    function defineLoopVariables(node) {
        var left = (node.left.type === 'VariableDeclaration') ? node.left.declarations[0].id : node.left;
        getDefinedVariables(left, binding).forEach(function (variable) {
            generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.left.range)));
        });
    }
    /// a named function or class expression defines its name where it is evaluated, as a
    /// function of the range of the expression (feature 006 research R7, R8); once per expression
    var namedExpressions = [];
    function defineExpressionName(node) {
        if (!node.id || namedExpressions.indexOf(node) !== -1) {
            return;
        }
        namedExpressions.push(node);
        defVarsOf(binding, node.id).forEach(function (variable) {
            generatedVarDef.add(varDefFactory.create(variable, defFactory.createFunctionDef(cfgNode, node.range)));
        });
    }
    /// the names of the named expressions evaluated by an expression (not in nested functions or class bodies)
    function defineExpressionNamesIn(expression) {
        walkes(expression, {
            FunctionDeclaration: function () {},
            FunctionExpression: defineExpressionName,
            ArrowFunctionExpression: function () {},
            ClassBody: function () {},
            ClassExpression: function (node, recurse) {
                defineExpressionName(node);
                recurse(node.superClass);
            }
        });
    }
    cfgNode.analyzedExpressions.forEach(function (expression) {
        walkes(expression, {
            Program: function () {},
            FunctionDeclaration: function () {},
            ArrowFunctionExpression: function () {},
            ClassBody: function () {},
            AssignmentExpression: function (node, recurse) {
                if (bindingPattern.isPattern(node.left)) { /// destructuring assignment
                    getDefinedVariables(node.left, binding).forEach(function (variable) {
                        generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.right.range)));
                    });
                    defineExpressionNamesIn(node.right);
                    return;
                }
                var definedVars = defVarsOf(binding, (node.left.type === 'MemberExpression') ? node.left.object : node.left);
                definedVars.forEach(function (definedVar) {
                    if (isFunctionExpression(node.right)) {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.right.range)));
                    } else {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.right.range)));
                    }
                });
                if (definedVars.length > 0 && !isFunctionExpression(node.right) &&
                    (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression')) {
                    recurse(node.right);
                }
                defineExpressionNamesIn(node.right);
            },
            UpdateExpression: function (node) {
                defVarsOf(binding, node.argument).forEach(function (definedVar) {
                    generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.range)));
                });
            },
            /// named function and class expressions define their names (research R8), not walking their bodies
            FunctionExpression: defineExpressionName,
            ClassExpression: function (node, recurse) {
                defineExpressionName(node);
                recurse(node.superClass);
            },
            /// a catch clause only defines the Var of its parameter (feature 006 research R10, D4); its body
            /// has its own nodes, so the assignments in it are not defined here (U3)
            CatchClause: function (node, recurse) {
                if (!!node.param) {
                    getDefinedVariables(node.param, binding).forEach(function (variable) {
                        generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.param.range)));
                    });
                    bindingPattern.getEvaluatedExpressions(node.param).forEach(recurse);
                }
            },
            /// the loop node defines the loop variable on each iteration; its body has its own nodes
            ForInStatement: defineLoopVariables,
            ForOfStatement: defineLoopVariables,
            /// an import defines each imported binding
            ImportDeclaration: function (node) {
                node.specifiers.forEach(function (specifier) {
                    defVarsOf(binding, specifier.local).forEach(function (definedVar) {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, specifier.range)));
                    });
                });
            },
            /// a class declaration defines its name as a constructor function: both the outer
            /// and the inner binding (feature 006 research R7)
            ClassDeclaration: function (node) {
                defVarsOf(binding, node.id).forEach(function (definedVar) {
                    generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.range)));
                });
            },
            VariableDeclaration: function (node, recurse) {
                node.declarations.forEach(function (declarator) {
                    recurse(declarator);
                });
            },
            VariableDeclarator: function (node, recurse) {
                if (bindingPattern.isPattern(node.id)) { /// destructuring declaration (always initialized)
                    getDefinedVariables(node.id, binding).forEach(function (variable) {
                        generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.init.range)));
                    });
                    recurse(node.init);
                    return;
                }
                var definedVars = defVarsOf(binding, node.id);
                definedVars.forEach(function (definedVar) {
                    if (!!node.init) {
                        if (isFunctionExpression(node.init)) {
                            generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.init.range)));
                        } else {
                            generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.init.range)));
                        }
                    } else {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createUndefinedDef(cfgNode, node.range)));
                    }
                });
                if (definedVars.length > 0 && !!node.init && !isFunctionExpression(node.init)) {
                    recurse(node.init);
                }
                if (!!node.init) {
                    defineExpressionNamesIn(node.init);
                }
            },
            SwitchCase: function () {}
        });
    });
    cfgNode.generate = generatedVarDef;
    return generatedVarDef;
};

/**
 * Walk the expressions used when a class is defined: the superclass and the
 * computed keys of its members (the class name and member bodies are not used)
 * @param {Object} node ClassDeclaration or ClassExpression
 * @param {Function} recurse
 * @private
 */
function useClassHead(node, recurse) {
    'use strict';
    recurse(node.superClass);
    node.body.body.forEach(function (member) {
        if (member.computed) {
            recurse(member.key);
        }
    });
}

/**
 * Walk the head of a for-in/for-of loop nested in a walked expression (see
 * loopHeadExpressions of lib/dujs/usedexpressions.js)
 * @param {Object} node ForInStatement or ForOfStatement
 * @param {Function} recurse
 * @private
 */
function useNestedLoopHead(node, recurse) {
    'use strict';
    usedExpressions.loopHeadExpressions(node, false).forEach(recurse);
}

/**
 * Find the set of used variables (both c-use and p-use): the expressions read
 * by the node and how their roots are read are given by usedExpressionsOf
 * (lib/dujs/usedexpressions.js); this walk turns them into variables
 * @param {FlowNode} cfgNode Graph node
 * @returns {Object} Object collects c-use set and p-use set
 */
DefUseAnalyzer.prototype.findUSESet = function (cfgNode) {
    'use strict';
    var cuseVars = new Set(), puseVars = new Set(), isPUse = false, forceCUse = false;
    /// the condition mode ('p-use' items): every read is a p-use, except in the arguments of a call or new
    /// (and the expressions of a tagged template), counted by argumentDepth (specs/004-fix-remaining-issues R1)
    var isConditionMode = false, argumentDepth = 0;
    var currentScope = cfgNode.scope,
        binding = !!currentScope ? currentScope.binding : null;
    /// the entry node of a function reads its body (KI 18): only the Vars visible from the
    /// function scope are used, as before (feature 006 research R6a, Q3)
    var isEntryNode = (cfgNode.type === FlowNode.ENTRY_NODE_TYPE);
    /// a decision node (created by splitting, or a condition of if/while/for) has branch targets
    var isDecisionNode = !!cfgNode.true || !!cfgNode.false;
    /// Outside the condition mode, the branches below that test cfgNode.true/false (Binary, Call, Unary,
    /// Conditional) are still reached: a for-in/for-of loop node has true/false branches but its head is
    /// walked as 'walk' items (usedexpressions.js), e.g. `for (k in a + b)`, `for (k in f())`,
    /// `for ((a ? b : c).p in o)`, `for (var {x = !a} of o)` give p-uses on the loop node.
    /// These are not dead code; changing them would change the pairs (specs/004-fix-remaining-issues T088).

    /**
     * Walk the arguments of a call or new (or the template of a tagged template): in the condition mode,
     * every read in them is a c-use
     * @param {Array} args
     * @param {Function} recurse
     */
    var useArguments = function (args, recurse) {
        argumentDepth += 1;
        args.forEach(recurse);
        argumentDepth -= 1;
    };
    usedExpressions.usedExpressionsOf(cfgNode).forEach(function (item) {
        /// 'c-use' forces every variable read to be a c-use; 'p-use' walks in the condition mode
        forceCUse = (item.read === 'c-use');
        /// isPUse is only read outside the condition mode (see Identifier), so each item starts it as false
        isPUse = false;
        isConditionMode = (item.read === 'p-use');
        argumentDepth = 0;
        walkes(item.expression, {
            Program: function () {},
            FunctionDeclaration: function () {},
            FunctionExpression: function () {},
            ArrowFunctionExpression: function () {},
            ClassBody: function () {},
            AssignmentExpression: function (node, recurse) {
                if (bindingPattern.isPattern(node.left)) { /// destructuring: defaults and computed keys are used
                    bindingPattern.getEvaluatedExpressions(node.left).forEach(recurse);
                }
                if (node.operator !== '=') { /// compound and logical assignments (+=, **=, ??=, ...) read the target
                    recurse(node.left);
                }
                recurse(node.right);
            },
            BinaryExpression: function (node, recurse) {
                if (isConditionMode) {
                    recurse(node.left);
                    recurse(node.right);
                    return;
                }
                if (!!cfgNode.true && !!cfgNode.false) {
                    isPUse = true;
                }
                recurse(node.left);
                recurse(node.right);
                isPUse = false;
            },
            CallExpression: function (node, recurse) {
                if (isConditionMode) {
                    recurse(node.callee);
                    useArguments(node["arguments"], recurse);
                    return;
                }
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
                recurse(node.init);
            },
            UpdateExpression: function (node, recurse) {
                recurse(node.argument);
            },
            /// a loop nested in a walked function body (the astNode of an entry node) only reads its head;
            /// the right side of a nested loop is never split before the walked node
            ForInStatement: useNestedLoopHead,
            ForOfStatement: useNestedLoopHead,
            /// a case nested in a walked function body: its test and consequent are not read and the
            /// walk goes on as p-uses (a nested case never reads the discriminant)
            SwitchCase: function () {
                isPUse = true;
            },
            ClassDeclaration: useClassHead,
            ClassExpression: useClassHead,
            /// import/export specifiers name bindings, they do not read variables
            ImportDeclaration: function () {},
            ExportAllDeclaration: function () {},
            ExportNamedDeclaration: function (node, recurse) {
                recurse(node.declaration);
            },
            /// the callee and the arguments (spread elements recurse into their argument) are used
            NewExpression: function (node, recurse) {
                recurse(node.callee);
                if (isConditionMode) {
                    useArguments(node.arguments, recurse);
                    return;
                }
                node.arguments.forEach(recurse);
            },
            /// the tag is read like a callee, the expressions of the template like arguments
            TaggedTemplateExpression: function (node, recurse) {
                recurse(node.tag);
                useArguments([node.quasi], recurse);
            },
            UnaryExpression: function (node, recurse) {
                if (isConditionMode) {
                    recurse(node.argument);
                    return;
                }
                if (!!cfgNode.true && !!cfgNode.false) {
                    isPUse = true;
                }
                recurse(node.argument);
                isPUse = false;
            },
            ConditionalExpression: function (node, recurse) {
                if (isConditionMode) {
                    recurse(node.test);
                    recurse(node.consequent);
                    recurse(node.alternate);
                    return;
                }
                /// only a decision node branches on the test (a split node has no ?: left)
                isPUse = isDecisionNode;
                recurse(node.test);
                isPUse = false;
                recurse(node.consequent);
                recurse(node.alternate);
            },
            MemberExpression: function (node, recurse) {
                recurse(node.object);
                if (node.computed) { /// a[i] and a?.[i] read i
                    recurse(node.property);
                }
            },
            /// new.target and import.meta are not variables
            MetaProperty: function () {},
            /// a property key of an object literal is not a variable, unless computed
            Property: function (node, recurse) {
                if (node.computed) {
                    recurse(node.key);
                }
                recurse(node.value);
            },
            Identifier: function (node) {
                (!!binding ? binding.useVarsOf(node) : []).forEach(function (usedVar) {
                    if (isEntryNode && !binding.isOnFunctionChain(usedVar, currentScope)) {
                        return;
                    }
                    if (isConditionMode) {
                        (argumentDepth > 0 ? cuseVars : puseVars).add(usedVar);
                    } else if (forceCUse || !isPUse) {
                        cuseVars.add(usedVar);
                    } else {
                        puseVars.add(usedVar);
                    }
                });
            }
        });
    });
    cfgNode.cuse = cuseVars;
    cfgNode.puse = puseVars;
    return {cuse: cuseVars, puse: puseVars};
};

var singleton = new DefUseAnalyzer();
module.exports = singleton;
/**
 * KILL set of a node, shared with lib/dujs/reachingsolver.js (feature 005)
 * @type {Function}
 */
module.exports.computeKILLSet = computeKILLSet;
