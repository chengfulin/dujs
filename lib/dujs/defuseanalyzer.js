/*
 * Def-Use analyzer
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var varDefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    dupairFactory = require('./dupairfactory'),
    pairFactory = require('./pairfactory'),
    scopeCtrl = require('./scopectrl'),
    modelCtrl = require('./modelctrl'),
    FlowNode = require('../esgraph/flownode'),
    bindingPattern = require('./bindingpattern'),
    usedExpressions = require('./usedexpressions');
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

/**
 * Analyze an intra-procedural model to create and set the GEN set of the definitions for built-in objects
 * @param {Model} model
 * @memberof DefUseAnalyzer.prototype
 * @private
 */
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
        ClassBody: function () {},
        FunctionDeclaration: function (node) {
            var funVar = (!!node.id) ? scope.namedFunctionVars.get(node.id.name) : null;
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
    var ownVariables = [],
        kept = new Set();
    calleeScope.getVariablesIncludingBlockScopes().forEach(function (variable) {
        ownVariables.push(variable);
    });
    (vardefs || new Set()).forEach(function (vardef) {
        var variable = vardef.variable;
        if (calleeScope.getVariable(variable.name) !== variable || ownVariables.indexOf(variable) !== -1) {
            kept.add(vardef);
        }
    });
    return kept;
}

/**
 * Bypasses of the calls of a model grouped by the nodes with the call edges
 * @param {Model} model
 * @returns {Map} Map(node with a call edge, Array of bypasses)
 * @private
 */
function bypassesByCallNode(model) {
    "use strict";
    var byCallNode = new Map();
    if (typeof model.callBypassOf !== 'function') {
        return byCallNode;
    }
    model.graph[2].forEach(function (node) {
        var bypass = model.callBypassOf(node);
        if (!!bypass) {
            if (!byCallNode.has(bypass.callNode)) {
                byCallNode.set(bypass.callNode, []);
            }
            byCallNode.get(bypass.callNode).push(bypass);
        }
    });
    return byCallNode;
}

/**
 * Do reach definition analysis. The input of the CALL RETURN NODE of a call
 * also has the definitions bypassing the call (FR-016): those reaching out of
 * the node with the call edge that the callee cannot change (bypassFilter);
 * the CALL RETURN NODE is enqueued again when the output of that node changes
 * @param {Model} model
 */
DefUseAnalyzer.prototype.doAnalysis = function (model) {
    "use strict";
    var thisAnalyzer = this;
    var lastGenerate = new Map(); /// (FlowNode, Set): GEN used in the last transfer of each node
    var byCallNode = bypassesByCallNode(model),
        callNodeOutputs = new Map(), /// (FlowNode, Set): last output of each node with a call edge
        effectiveInputs = new Map(); /// (FlowNode, Set): last effective input of each CALL RETURN NODE with a bypass
    var reachDefinitions = worklist(
        model.graph,
        function (input, list) { /// input = ReachIn(n)
            var currentNode = this;
            if (!!currentNode.extraReachIns) {
                if (!!input) {
                    input = Set.union(input, currentNode.extraReachIns);
                } else {
                    input = new Set(currentNode.extraReachIns);
                }
            }
            var bypass = (typeof model.callBypassOf === 'function') ? model.callBypassOf(currentNode) : null;
            if (!!bypass) {
                input = Set.union(input || new Set(),
                    bypassFilter(callNodeOutputs.get(bypass.callNode), bypass.calleeScope));
                effectiveInputs.set(currentNode, input);
            }
            var generate = currentNode.generate || thisAnalyzer.findGENSet(currentNode);
            lastGenerate.set(currentNode, generate);
            /// KILL depends on the definitions reaching this node, which are only known
            /// during the iteration, so it is computed from the current input every time
            var kill = computeKILLSet(currentNode, input || new Set(), generate);
            currentNode.kill = kill;
            thisAnalyzer.findUSESet(currentNode);
            var output = Set.union(Set.minus(input, kill), generate);
            if (byCallNode.has(currentNode)) {
                var lastOutput = callNodeOutputs.get(currentNode);
                callNodeOutputs.set(currentNode, output);
                if (!lastOutput || !Set.equals(lastOutput, output)) {
                    /// no edge from the node with the call edge to the CALL RETURN NODE
                    byCallNode.get(currentNode).forEach(function (each) {
                        list.push(each.callReturn);
                    });
                }
            }
            return output;
        },
        {direction: 'forward', start: new Set()}
    );
    effectiveInputs.forEach(function (varDefSet, node) {
        reachDefinitions.inputs.set(node, varDefSet);
    });
    reachDefinitions.inputs.forEach(function (varDefSet, node) {
        node.reachIns = new Set(varDefSet);
    });
    reachDefinitions.outputs.forEach(function (varDefSet, node) {
        node.reachOuts = new Set(varDefSet);
    });
    model.setAnalysisResults(collectAnalysisResults(reachDefinitions, lastGenerate));
};

/**
 * Collect the analysis result of each node analyzed by the worklist
 * @param {Object} reachDefinitions Result of the worklist ({inputs, outputs})
 * @param {Map} lastGenerate Map(FlowNode, Set): GEN used in the last transfer of each node
 * @returns {Map} Map(FlowNode, {reachIns, reachOuts, generate, kill, cuse, puse})
 * @private
 */
function collectAnalysisResults(reachDefinitions, lastGenerate) {
    'use strict';
    var results = new Map();
    function addNode(node) {
        if (!results.has(node)) {
            results.set(node, {
                reachIns: reachDefinitions.inputs.get(node) || null,
                reachOuts: reachDefinitions.outputs.get(node) || null,
                generate: lastGenerate.get(node) || null,
                kill: node.kill,
                cuse: node.cuse,
                puse: node.puse
            });
        }
    }
    lastGenerate.forEach(function (generate, node) {
        addNode(node);
    });
    reachDefinitions.inputs.forEach(function (varDefSet, node) {
        addNode(node);
    });
    reachDefinitions.outputs.forEach(function (varDefSet, node) {
        addNode(node);
    });
    return results;
}

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
        if (vardef.variable !== scope.getVariable(vardef.variable.name)) {
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
    var currentScope = cfgNode.scope;
    /// for-in/for-of: the loop node assigns the next key/value to the loop variables
    function defineLoopVariables(node) {
        var left = (node.left.type === 'VariableDeclaration') ? node.left.declarations[0].id : node.left;
        getDefinedVariables(left, currentScope).forEach(function (variable) {
            generatedVarDef.add(varDefFactory.create(variable, defFactory.createLiteralDef(cfgNode, node.left.range)));
        });
    }
    cfgNode.analyzedExpressions.forEach(function (expression) {
        walkes(expression, {
            Program: function () {},
            FunctionDeclaration: function () {},
            FunctionExpression: function () {},
            ArrowFunctionExpression: function () {},
            ClassBody: function () {},
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
            /// an import defines each imported binding
            ImportDeclaration: function (node) {
                node.specifiers.forEach(function (specifier) {
                    var definedVar = currentScope.getVariable(specifier.local.name);
                    if (!!definedVar) {
                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(cfgNode, specifier.range)));
                    }
                });
            },
            /// a class declaration defines its name as a constructor function
            ClassDeclaration: function (node) {
                var definedVar = (!!node.id) ? currentScope.getVariable(node.id.name) : null;
                if (!!definedVar) {
                    generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createFunctionDef(cfgNode, node.range)));
                }
            },
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
    var currentScope = cfgNode.scope;
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
                var usedVar = currentScope.getVariable(node.name);
                if (!usedVar) {
                    return;
                }
                if (isConditionMode) {
                    (argumentDepth > 0 ? cuseVars : puseVars).add(usedVar);
                } else if (forceCUse || !isPUse) {
                    cuseVars.add(usedVar);
                } else {
                    puseVars.add(usedVar);
                }
            }
        });
    });
    cfgNode.cuse = cuseVars;
    cfgNode.puse = puseVars;
    return {cuse: cuseVars, puse: puseVars};
};

var singleton = new DefUseAnalyzer();
module.exports = singleton;
