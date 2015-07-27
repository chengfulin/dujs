/**
 * Created by chengfulin on 2015/4/13.
 */
var varDefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    dupairFactory = require('./dupairfactory'),
    pairFactory = require('./pairfactory'),
    Def = require('./def'),
    AnalyzedCFG = require('./analyzedcfg'),
    ScopeWrapper = require('./scope'),
    FlowNode = require('../esgraph').FlowNode,
    Set = require('../analyses').Set,
    walkes = require('walkes'),
    worklist = require('../analyses'),
    Map = require('core-js/es6/map');

function DefUseAnalyzer() {
    "use strict";
}

/**
 * Get DUPairs of the CFG
 * @param analysisItem
 * @returns Map of DUPairs of each definitions, (key: def name, value: DUPair)
 * @constructor
 */
DefUseAnalyzer.prototype.findDUPairs = function (analysisItem) {
    'use strict';
    var dupairs = new Map();
    if (AnalyzedCFG.isAnalyzedCFG(analysisItem)) {
        analysisItem.cfg[2].forEach(function (node) {
            if (!node.astNode || node.type === FlowNode.ENTRY_NODE_TYPE || node.type === FlowNode.EXIT_NODE_TYPE) {
                return;
            }
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
                pairs.add(dupairFactory.create(elem.definition.fromCFGNode, node));
                dupairs.set(elem.variable, pairs);
            });
            /// add Def-Use pairs of p-use
            nodePUse.values().forEach(function (elem) {
                var pairs = dupairs.get(elem.variable);
                /// Assume each id of CFG nodes will be different
                pairs.add(dupairFactory.create(elem.definition.fromCFGNode, pairFactory.create(node, node.true)));
                pairs.add(dupairFactory.create(elem.definition.fromCFGNode, pairFactory.create(node, node.false)));
                dupairs.set(elem.variable, pairs);
            });
        });
    }
    analysisItem.dupairs = dupairs;
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
 * @param {AnalyzedCFG} analysisItem
 * @function
 */
DefUseAnalyzer.prototype.doAnalysis = function (analysisItem) {
    "use strict";
    var thisAnalyzer = this;
    if (AnalyzedCFG.isAnalyzedCFG(analysisItem)) {
        var reachDefinitions = worklist(analysisItem.cfg, function (input) { /// input = ReachIn(n)
            var currentNode = this;
            if (!!currentNode.extraReachIns) {
                if (!!input) {
                    input = Set.union(input, currentNode.extraReachIns);
                } else {
                    input = new Set(currentNode.extraReachIns);
                }
            }

            /// to handle lexical scope
            if (currentNode.type === FlowNode.CALL_NODE_TYPE) {

                var availRDs = currentNode.call.scope.getAvailReachDefinitionsFromAscendants();
                if (currentNode.scope !== currentNode.call.scope.parent) {
                    if (currentNode.scope.hasAscendantChild(currentNode.call.scope)) {
                        currentNode.call.scope.spliceUnavailableReachDefinitionsFromSet(input);
                        if (!!availRDs) {
                            input = Set.union(input, availRDs);
                        }
                    } else if (currentNode.call.scope.hasAscendantChild(currentNode.scope)) {
                        if (!!availRDs) {
                            input = Set.union(input, availRDs);
                        }
                    }
                }
                return input;
            }


            /// to support used variables before initialization
            if (currentNode.type === FlowNode.ENTRY_NODE_TYPE) {
                var localVariables = currentNode.scope.vars;
                var tmpGenerate = (!currentNode.generate)? new Set() : new Set(currentNode.generate);
                var notInitializedVar = new Map();
                localVariables.forEach(function (val, key) {
                    if (!tmpGenerate.values().some(function (elem) {
                            return elem.variable === val;
                        })) {
                        notInitializedVar.set(key, val);
                    }
                });

                notInitializedVar.forEach(function (variable) {
                    var vardef = varDefFactory.create(
                        variable,
                        defFactory.createUndefinedDef(currentNode, variable.range, variable.scope)
                    );
                    if (!!vardef) {
                        tmpGenerate.add(vardef);
                    }
                });
                currentNode.generate = tmpGenerate;
            }

            var kill = currentNode.kill || thisAnalyzer.findKILLSet(currentNode);
            /// GEN(n)
            var generate = currentNode.generate || thisAnalyzer.findGENSet(currentNode);
            /// Find VarDef of redefined Vars = KILL(n)
            var killSet = new Set();
            kill.forEach(function (killed) {
                input.values().forEach(function (elem) {
                    if (elem.variable === killed) {
                        killSet.add(elem);
                    }
                });
            });
            /// find Use(n)
            thisAnalyzer.findUSESet(currentNode);

            if (!!currentNode.scope) {
                currentNode.scope.lastReachIns = new Set(input);
            }

            /// Return ReachOut(n)
            return Set.union(Set.minus(input, killSet), generate);
        }, {direction: 'forward', start: new Set()});
        /// records
        reachDefinitions.inputs.forEach(function (varDefSet, node) {
            node.reachIns = new Set(varDefSet);
        });
        reachDefinitions.outputs.forEach(function (varDefSet, node) {
            node.reachOuts = new Set(varDefSet);
        });
    }
};

/**
 * Find set of Vars who are redefined
 * @param {FlowNode} cfgNode
 * @returns Set of variable whose definition was redefined in this node
 * @function
 */
DefUseAnalyzer.prototype.findKILLSet = function (cfgNode) {
    'use strict';
    var redefinedVars = new Set();
    if (FlowNode.isFlowNode(cfgNode) && ScopeWrapper.isScope(cfgNode.scope)) {
        var currentScope = cfgNode.scope;
        if (cfgNode.type === FlowNode.EXIT_NODE_TYPE) {
            /// Let the ReachOut(Exit Node) excludes the local variables
            currentScope.vars.forEach(function (variable) {
                redefinedVars.add(variable);
            });
        } else if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && !!cfgNode.astNode) {
            walkes(cfgNode.astNode, {/// Find one AST node in a CFG node at a time
                AssignmentExpression: function (node, recurse) {
                    var killedVar = (node.left.type === 'MemberExpression') ? currentScope.getVarByName(node.left.object.name) : currentScope.getVarByName(node.left.name);
                    if (!!killedVar) {
                        redefinedVars.add(killedVar);
                    }
                    if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {/// Sequential assignment
                        recurse(node.right);
                    }
                },
                UpdateExpression: function (node) {
                    var killedVar = currentScope.getVarByName(node.argument.name);
                    if (!!killedVar) {
                        redefinedVars.add(killedVar);
                    }
                },
                SwitchCase: function () {/*ignore AST nodes inside SwitchCase node*/},
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(function (declarator) {
                        recurse(declarator);
                    });
                },
                VariableDeclarator: function (node) {
                    var initializedVar = currentScope.getVarByName(node.id.name);
                    if (!!initializedVar) {
                        redefinedVars.add(initializedVar);
                    }
                }
            });
        }
        if (redefinedVars.size > 0) {
            cfgNode.kill = redefinedVars;
        }
    }
    return redefinedVars;
};

/**
 * Find GEN set
 * @param {FlowNode} cfgNode
 * @returns {Set}
 * @function
 */
DefUseAnalyzer.prototype.findGENSet = function (cfgNode) {
    'use strict';
    var generatedVarDef = new Set();
    if (FlowNode.isFlowNode(cfgNode) && ScopeWrapper.isScope(cfgNode.scope)) {
        var currentScope = cfgNode.scope;
        if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && !!cfgNode.astNode) {
            walkes(cfgNode.astNode, {
                AssignmentExpression: function (node, recurse) {
                    var definedVar = (node.left.type === 'MemberExpression') ? currentScope.getVarByName(node.left.object.name) : currentScope.getVarByName(node.left.name);
                    if (!!definedVar) {
                        if (node.right.type === 'FunctionExpression') {
                            generatedVarDef.add(
                                varDefFactory.create(
                                    definedVar,
                                    defFactory.createFunctionDef(
                                        cfgNode,
                                        node.right.range,
                                        currentScope.scope
                                    )
                                )
                            );
                        } else {
                            generatedVarDef.add(
                                varDefFactory.create(
                                    definedVar,
                                    defFactory.createLiteralDef(
                                        cfgNode,
                                        node.right.range,
                                        currentScope.scope
                                    )
                                )
                            );
                            if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {
                                recurse(node.right);
                            }
                        }
                    }
                },
                UpdateExpression: function (node) {
                    var definedVar = currentScope.getVarByName(node.argument.name);
                    if (!!definedVar) {
                        generatedVarDef.add(
                            varDefFactory.create(
                                definedVar,
                                defFactory.createLiteralDef(
                                    cfgNode,
                                    node.range,
                                    currentScope.scope
                                )
                            )
                        );
                    }
                },
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(function (declarator) {
                        recurse(declarator);
                    });
                },
                VariableDeclarator: function (node, recurse) {
                    var definedVar = currentScope.getVarByName(node.id.name);
                    if (!!definedVar) {
                        if (!!node.init) {
                            if (node.init.type === 'FunctionExpression') {
                                generatedVarDef.add(
                                    varDefFactory.create(
                                        definedVar,
                                        defFactory.createFunctionDef(
                                            cfgNode,
                                            node.init.range,
                                            currentScope.scope
                                        )
                                    )
                                );
                            } else {
                                generatedVarDef.add(
                                    varDefFactory.create(
                                        definedVar,
                                        defFactory.createLiteralDef(
                                            cfgNode,
                                            node.init.range,
                                            currentScope.scope
                                        )
                                    )
                                );

                                if (node.init.type === 'AssignmentExpression') {
                                    recurse(node.init);
                                }
                            }
                        } else {
                            generatedVarDef.add(
                                varDefFactory.create(
                                    definedVar,
                                    defFactory.createUndefinedDef(
                                        cfgNode,
                                        node.range,
                                        currentScope.scope
                                    )
                                )
                            );
                        }
                    }
                },
                SwitchCase: function () {/* ignore the SwitchCase node of AST */
                }
            });
        }
        if (generatedVarDef.size > 0) {
            cfgNode.generate = generatedVarDef;
        }
    }
    return generatedVarDef;
};

/**
 * Find set of variables who are used at this node
 * @param {FlowNode} cfgNode a node of CFG
 * @returns {Object} Object of sets of variable names used at this node
 * @function
 */
DefUseAnalyzer.prototype.findUSESet = function (cfgNode) {
    'use strict';
    var cuseVars = new Set(),
        puseVars = new Set(),
        isPUse = false;
    if (FlowNode.isFlowNode(cfgNode) && ScopeWrapper.isScope(cfgNode.scope)) {
        var currentScope = cfgNode.scope;
        if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && !!cfgNode.astNode) {
            walkes(cfgNode.astNode, {
                AssignmentExpression: function (node, recurse) {
                    if (node.right.type === 'AssignmentExpression') {
                        /// handle sequential assignment
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
                    /// Both operand are used
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
                    /// for the function arguments
                    node.arguments.forEach(recurse);
                },
                VariableDeclaration: function (node, recurse) {
                    node.declarations.forEach(recurse);
                },
                VariableDeclarator: function (node, recurse) {
                    if (!!node.init && node.init.type === 'AssignmentExpression') {
                        /// e.g., var answer = var1 = var2;
                        /// USE = {var1, var2}
                        recurse(node.init.left);
                    }
                    recurse(node.init);
                },
                UpdateExpression: function (node, recurse) {
                    recurse(node.argument);
                },
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
                    /// handle expression in switch statement
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
                Identifier: function (node) {
                    /// Ignore statement with identifier only
                    if (cfgNode.astNode.type !== 'Identifier') {
                        var usedVar = currentScope.getVarByName(node.name);
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
        }
        if (cuseVars.size > 0 || puseVars.size > 0) {
            cfgNode.cuse = cuseVars;
            cfgNode.puse = puseVars;
        }
    }
    return {cuse: cuseVars, puse: puseVars};
};

/**
 * Find definitions of a variable from a set of VarDef
 * @param {Set} varDefSet
 * @param {Var} variable
 * @returns {Set}
 * @function
 */
DefUseAnalyzer.prototype.findDefSetByVar = function (varDefSet, variable) {
    "use strict";
    var defSet = new Set();
    if (varDefSet instanceof Set) {
        varDefSet.forEach(function (varDef) {
            if (varDef.variable === variable) {
                defSet.add(varDef.definition);
            }
        });
    }
    return defSet;
};

DefUseAnalyzer.prototype.updateIntraPageWithLocalStorageDefinition = function (globalScopeCtrl, intraPageAnalysisItems) {
    "use strict";
    if (intraPageAnalysisItems instanceof Array && intraPageAnalysisItems.every(AnalyzedCFG.isAnalyzedCFG)) {
        intraPageAnalysisItems.forEach(function (analysisItem) {
            analysisItem.cfg[2].forEach(function (cfgNode) {
                if (cfgNode.type !== FlowNode.ENTRY_NODE_TYPE && !!cfgNode.astNode) {
                    walkes(cfgNode.astNode, {
                        AssignmentExpression: function (node, recurse) {
                            if (node.left.type === 'MemberExpression') {
                                var definedVar = globalScopeCtrl.scope.getVarByName(node.left.object.name);
                                if (!!definedVar) {
                                    globalScopeCtrl.addReachDefinitionInLocalStorageNode(
                                        varDefFactory.create(
                                            definedVar,
                                            defFactory.createLocalStorageDef(
                                                cfgNode,
                                                node.right.range,
                                                globalScopeCtrl.scope.scope
                                            )
                                        )
                                    );
                                    if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {
                                        recurse(node.right);
                                    }
                                }
                            }
                        },
                        CallExpression: function (node) {
                            if (node.callee.type === 'MemberExpression') {
                                if (globalScopeCtrl.localStorageSetterNames.indexOf(node.callee.property.name) !== -1) {
                                    var definedVar = globalScopeCtrl.scope.getVarByName(node.callee.left.object.name);
                                    if (!!definedVar) {
                                        globalScopeCtrl.addReachDefinitionInLocalStorageNode(
                                            varDefFactory.create(
                                                definedVar,
                                                defFactory.createLocalStorageDef(
                                                    cfgNode,
                                                    node.range,
                                                    globalScopeCtrl.scope.scope
                                                )
                                            )
                                        );
                                    }
                                }
                            }
                        },
                        UpdateExpression: function (node) {
                            var definedVar = globalScopeCtrl.scope.getVarByName(node.argument.name);
                            if (!!definedVar) {
                                globalScopeCtrl.addReachDefinitionInLocalStorageNode(
                                    varDefFactory.create(
                                        definedVar,
                                        defFactory.createLocalStorageDef(
                                            cfgNode,
                                            node.range,
                                            globalScopeCtrl.scope.scope
                                        )
                                    )
                                );
                            }
                        },
                        SwitchCase: function () {/* ignore the SwitchCase node of AST */
                        }
                    });
                }
            });
        });
        intraPageAnalysisItems.forEach(function (analysisItem) {
            analysisItem.cfg[0].extraReachIns = Set.union(
                analysisItem.cfg[0].extraReachIns || new Set(),
                globalScopeCtrl.getReachOutDefinitionFromLocalStorageNode()
            );
            analysisItem.topRelatedScope.parent = globalScopeCtrl.scope;
        });
    }
};

var singleton = new DefUseAnalyzer();
module.exports = singleton;
