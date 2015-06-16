/**
 * Created by chengfulin on 2015/4/13.
 */
var Def = require('./def'),
    Scope = require('./scope'),
    Range = require('./range'),
    varDefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    AnalyzedCFG = require('./analyzedcfg'),
    FlowNode = require('../esgraph').FlowNode,
    Set = require('../analyses').Set,
    Map = require('core-js/es6/map'),
    walkes = require('walkes'),
    worklist = require('../analyses');

function DefUseAnalyzer() {
    "use strict";

    /* start-test-block */
    this._testonly_ = {
        _findKILLSet: findKILLSet,
        _findGENSet: findGENSet,
        _findUSESet: findUSESet
    };
    /* end-test-block */
}

DefUseAnalyzer.prototype.doAnalysis = function (analysisItem) {
    "use strict";
    if (AnalyzedCFG.isAnalyzedCFG(analysisItem)) {
        return worklist(analysisItem.cfg, function (input) { /// input = ReachIn(n)
            var currentNode = this;
            var kill = currentNode.kill = currentNode.kill || findKILLSet(currentNode, analysisItem);
            /// GEN(n)
            var generate = currentNode.generate = currentNode.generate || findGENSet(currentNode, analysisItem);
            /// Find VarDef of redefined Vars = KILL(n)
            var killSet = new Set();
            kill.values().forEach(function (killed) {
                input.values().forEach(function (elem) {
                    if (elem.variable === killed) {
                        killSet.add(elem);
                    }
                });
            });
            /// Return ReachOut(n)
            return Set.union(Set.minus(input, killSet), generate);
        }, {direction: 'forward', start: null});
    }
};

/**
 * Find set of Vars who are redefined
 * @param {FlowNode} cfgNode
 * @param {AnalyzedCFG} analysisItem
 * @returns Set of variable whose definition was redefined in this node
 * @private
 * @function
 */
function findKILLSet(cfgNode, analysisItem) {
    'use strict';
    var variables = new Set();
    if (!!cfgNode.type && cfgNode.type === 'exit') {
        cfgWrapper.getScopeVars().forEach(function (val, key) {
            variables.add(val);
        });
    }
    walkes(cfgNode.astNode, {
        AssignmentExpression: function (node, recurse) {
            var killedVar = (node.left.type === 'MemberExpression')? cfgWrapper.getVarByName(node.left.object.name) : cfgWrapper.getVarByName(node.left.name);
            if (!!killedVar) {
                variables.add(killedVar);
            }
            if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {/// Sequential assignment
                recurse(node.right);
            }
        },
        UpdateExpression: function (node) {
            var killedVar = cfgWrapper.getVarByName(node.argument.name);
            if (!!killedVar) {
                variables.add(killedVar);
            }
        },
        SwitchCase: function () {}
    });
    return variables;
}

/**
 * Find GEN set
 * @param {FlowNode} cfgNode
 * @param {AnalyzedCFG} analysisItem
 * @returns {Set}
 * @private
 * @function
 */
function findGENSet(cfgNode, analysisItem) {
    'use strict';
    var generatedVarDef = new Set(),
        sameDefVars = new Set();
    walkes(cfgNode.astNode, {
        AssignmentExpression: function (node, recurse) {
            var definedVar = (node.left.type === 'MemberExpression')? cfgWrapper.getVarByName(node.left.object.name) : cfgWrapper.getVarByName(node.left.name);
            if (!!definedVar) {
                sameDefVars.add(definedVar);
                if (node.right.type === 'AssignmentExpression' || node.right.type === 'UpdateExpression') {
                    recurse(node.right);
                } else if (node.right.type === 'FunctionExpression') {
                    sameDefVars.forEach(function (defined) {
                        generatedVarDef.add(
                            varDefFactory.create(
                                defined,
                                defFactory.create(
                                    cfgNode,
                                    Def.FUNCTION_TYPE,
                                    node.right.range,
                                    cfgWrapper.getScope()
                                )
                            )
                        );
                    });
                    sameDefVars = new Set();
                } else {
                    sameDefVars.forEach(function (defined) {
                        generatedVarDef.add(
                            varDefFactory.create(
                                defined,
                                defFactory.create(
                                    cfgNode,
                                    Def.LITERAL_TYPE,
                                    node.right.range,
                                    cfgWrapper.getScope()
                                )
                            )
                        );
                    });
                    sameDefVars = new Set();
                }
            }
        },
        UpdateExpression: function (node) {
            var definedVar = cfgWrapper.getVarByName(node.argument.name);
            if (!!definedVar) {
                sameDefVars.add(definedVar);
                sameDefVars.forEach(function (defined) {
                    generatedVarDef.add(
                        varDefFactory.create(
                            defined,
                            defFactory.create(
                                cfgNode,
                                Def.LITERAL_TYPE,
                                node.range,
                                cfgWrapper.getScope()
                            )
                        )
                    );
                });
                sameDefVars = new Set();
            }
        },
        VariableDeclaration: function (node, recurse) {
            node.declarations.forEach(function (declarator) {
                recurse(declarator);
            });
        },
        VariableDeclarator: function (node, recurse) {
            var definedVar = cfgWrapper.getVarByName(node.id.name);
            if (!!definedVar) {
                sameDefVars.add(definedVar);
                if (!!node.init) {
                    if (node.init.type === 'AssignmentExpression') {
                        recurse(node.init);
                    } else if (node.init.type === 'FunctionExpression') {
                        sameDefVars.forEach(function (defined) {
                            generatedVarDef.add(
                                varDefFactory.create(
                                    defined,
                                    defFactory.create(
                                        cfgNode,
                                        Def.FUNCTION_TYPE,
                                        node.init.range,
                                        cfgWrapper.getScope()
                                    )
                                )
                            );
                        });
                        sameDefVars = new Set();
                    } else {
                        sameDefVars.forEach(function (defined) {
                            generatedVarDef.add(
                                varDefFactory.create(
                                    definedVar,
                                    defFactory.create(
                                        cfgNode,
                                        Def.LITERAL_TYPE,
                                        node.init.range,
                                        cfgWrapper.getScope()
                                    )
                                )
                            );
                        });
                        sameDefVars = new Set();
                    }
                }
            }
        },
        SwitchCase: function () {}
    });
    return generatedVarDef;
};

/**
 * Find set of variables who are used at this node
 * @param {FlowNode} cfgNode a node of CFG
 * @param {AnalyzedCFG} analysisItem
 * @returns {Object} Object of sets of variable names used at this node
 * @private
 * @function
 */
function findUSESet(cfgNode, analysisItem) {
    'use strict';
    var cuseVars = new Set(),
        puseVars = new Set(),
        isPUse = false;
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
            /// for the function arguments
            node.arguments.forEach(recurse);
            isPUse = false;
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
                var usedVar = cfgWrapper.getVarByName(node.name);
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
    return {cuse: cuseVars, puse: puseVars};
}

var singleton = new DefUseAnalyzer();
module.exports = singleton;