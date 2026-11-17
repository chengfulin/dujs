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
    Model = require('./model'),
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
        _getNonReachableVarDefs: getNonReachableVarDefs
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
 * Whether a variable is in a summary of a callee (feature 005 data-model §1,
 * FR-004): the callee can see it and it is not a variable of the callee itself
 * nor of its block scopes (another activation record of a recursive call)
 * @param {Var} variable
 * @param {Scope} calleeScope Scope of the callee
 * @returns {boolean}
 */
function isVisibleToCallee(variable, calleeScope) {
    "use strict";
    return isVisibleIn(variable, calleeScope) &&
        calleeScope.getVariablesIncludingBlockScopes().indexOf(variable) === -1;
}

/**
 * Whether a handler has only an open model (feature 005, User Story 4, ruling 1
 * of the implement phase): the first model built for its scope has a back call
 * edge to a scope out of it, so the model of the handler in the intra-page
 * model may not hold the nodes of its callees and its summary may not map to
 * the flat graph; the solver consults it only for such a summary
 * @param {Scope} scope
 * @returns {boolean}
 * @private
 */
function isOpenHandler(scope) {
    "use strict";
    // Required here, not at the top: lib/dujs/modelbuilder.js requires this module through the summaries.
    var callModel = require('./modelbuilder').callModelOf(scope);
    return !!callModel && !!callModel.hierarchy && require('./hierarchy').openTargetsOf(callModel).length > 0;
}

/**
 * Do reach definition analysis by the edge-type-aware solver
 * (lib/dujs/reachingsolver.js, feature 005 research R2): an exception edge
 * carries the definitions reaching its source (FR-014). In an upper model (a
 * model with a hierarchy) a return edge carries nothing: the CALL RETURN NODE
 * of each call (CallSiteRecord) gets the summary of its callee
 * (lib/dujs/summary.js, computed by summary.computeForPage) applied to the
 * output of the node with the call edge (FR-002), the definitions of the
 * summary mapped to the graph by model.flatVarDefOf. In an intra-page or
 * inter-page model the LOOP RETURN NODE of each LoopRecord gets OUT(LOOP) U the
 * gen and exceptional of the summaries of the handlers instead of the edges
 * from the handler exits (User Story 4, research R4)
 * @param {Model} model
 */
DefUseAnalyzer.prototype.doAnalysis = function (model) {
    "use strict";
    var thisAnalyzer = this;
    var options = {
        entryInput: new Set(),
        generateOf: function (node) {
            return node.generate || thisAnalyzer.findGENSet(node);
        },
        useOf: function (node) {
            thisAnalyzer.findUSESet(node);
        },
        extraReachIns: function (node) {
            return node.extraReachIns || null;
        }
    };
    if (!!model.hierarchy) {
        // Required here, not at the top: lib/dujs/summary.js requires this module.
        var summary = require('./summary');
        options.calls = model.callSiteRecords();
        options.summaryOf = function (scope) {
            return summary.summaryOf(scope);
        };
        options.flatVarDefOf = function (vardef) {
            return model.flatVarDefOf(vardef);
        };
        if (model.level === Model.INTRA_PAGE || model.level === Model.INTER_PAGE) {
            options.loops = model.loopRecords();
            options.openHandler = isOpenHandler;
        }
    }
    var solved = reachingSolver.solve(model.graph, options);
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
    /// a node not reached (after a call of a callee never returning normally) is not analyzed:
    /// no definition reaches it, and it has no analysis result
    model.graph[2].forEach(function (node) {
        if (!solved.results.has(node)) {
            node.reachIns = new Set();
            node.reachOuts = new Set();
        }
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
 * Find the set of variables and the corresponding definitions which will be generated;
 * cfgNode.generatedAt is set to the AST node completing each definition (feature 007
 * research R3): the assignment, update, variable declarator, named function or class
 * expression, class declaration, import declaration, for-in/for-of statement (the loop
 * variable) or catch parameter
 * @param {FlowNode} cfgNode
 * @returns {Set}
 */
DefUseAnalyzer.prototype.findGENSet = function (cfgNode) {
    'use strict';
    var generatedVarDef = new Set(),
        generatedAt = new Map();
    /// a definition and the AST node completing it (feature 007 research R3)
    function define(vardef, ast) {
        generatedVarDef.add(vardef);
        generatedAt.set(vardef, ast);
    }
    var binding = !!cfgNode.scope ? cfgNode.scope.binding : null;
    /// for-in/for-of: the loop node assigns the next key/value to the loop variables
    function defineLoopVariables(node) {
        var left = (node.left.type === 'VariableDeclaration') ? node.left.declarations[0].id : node.left;
        getDefinedVariables(left, binding).forEach(function (variable) {
            define(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.left.range)), node);
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
            define(varDefFactory.create(variable, defFactory.createFunctionDef(cfgNode, node.range)), node);
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
                        define(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.right.range)), node);
                    });
                    defineExpressionNamesIn(node.right);
                    return;
                }
                var definedVars = defVarsOf(binding, (node.left.type === 'MemberExpression') ? node.left.object : node.left);
                definedVars.forEach(function (definedVar) {
                    if (isFunctionExpression(node.right)) {
                        define(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.right.range)), node);
                    } else {
                        define(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.right.range)), node);
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
                    define(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.range)), node);
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
                        define(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.param.range)), node.param);
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
                        define(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, specifier.range)), node);
                    });
                });
            },
            /// a class declaration defines its name as a constructor function: both the outer
            /// and the inner binding (feature 006 research R7)
            ClassDeclaration: function (node) {
                defVarsOf(binding, node.id).forEach(function (definedVar) {
                    define(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.range)), node);
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
                        define(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.init.range)), node);
                    });
                    recurse(node.init);
                    return;
                }
                var definedVars = defVarsOf(binding, node.id);
                definedVars.forEach(function (definedVar) {
                    if (!!node.init) {
                        if (isFunctionExpression(node.init)) {
                            define(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.init.range)), node);
                        } else {
                            define(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, node.init.range)), node);
                        }
                    } else {
                        define(varDefFactory.create(definedVar, defFactory.createUndefinedDef(cfgNode, node.range)), node);
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
    cfgNode.generatedAt = generatedAt;
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
            /// No for-in/for-of loop or switch case is ever nested in a walked item: since the entry node no
            /// longer walks the function body (feature 005 FR-008, research R7), the items are expressions
            /// or leaf statements (declarations, return, throw, class heads, import/export, debugger), and a
            /// loop or case node is not walked itself but gives its head or discriminant (usedexpressions.js).
            /// Their rules (and useNestedLoopHead) were removed as dead code (feature 005 T102 (a)).
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
/**
 * Visibility filter of the summaries, shared with lib/dujs/summary.js (feature 005)
 * @type {Function}
 */
module.exports.isVisibleToCallee = isVisibleToCallee;
