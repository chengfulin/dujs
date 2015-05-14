/**
 * Created by chengfulin on 2015/4/13.
 */
/// TODO: currently, we only care about where a variable is defined and where it's used, which means we do not need to know what kind or which definition the variable has.
/// TODO: also, as a static analysis tool, we cannot handle dynamic or semantic issues yet (e.g., object property, array element, object reference)
var walkes = require('walkes'),
    Set = require('../analyses').Set,
    Def = require('./def'),
    Scope = require('./scope'),
    Range = require('./range'),
    varDefFactory = require('./vardeffactory'),
    defFactory = require('./deffactory'),
    Map = require('core-js/es6/map');

/**
 * Get KILL set
 * @param cfgNode
 * @param cfgWrapper
 * @returns Set of variable whose definition was redefined in this node
 * @constructor
 */
module.exports.KILL = function (cfgNode, cfgWrapper) {
    'use strict';
    var variables = new Set();
    if (!!cfgNode.type && cfgNode.type === 'exit') {
        cfgWrapper.getScopeVars().forEach(function (val, key) {
            variables.add(val);
        });
    }
    walkes(cfgNode.astNode, {
        AssignmentExpression: function (node, recurse) {
            var killedVar = cfgWrapper.getVarByName(node.left.name);
            if (!!killedVar) {
                variables.add(killedVar);
            }
            if (node.right.type === 'AssignmentExpression') {/// Sequential assignment
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
};

/**
 * Get GEN set
 * @param cfgNode
 * @param cfgWrapper
 * @returns {Map}
 * @constructor
 */
module.exports.GEN = function (cfgNode, cfgWrapper) {
    'use strict';
    var generatedVarDef = new Set(),
        sameDefVars = new Set();
    walkes(cfgNode.astNode, {
        AssignmentExpression: function (node, recurse) {
            var definedVar = cfgWrapper.getVarByName(node.left.name);
            if (!!definedVar) {
                sameDefVars.add(definedVar);
                if (node.right.type === 'AssignmentExpression') {
                    recurse(node.right);
                } else {
                    sameDefVars.forEach(function (defined) {
                        generatedVarDef.add(
                            varDefFactory.create(
                                defined,
                                defFactory.create(
                                    cfgNode.cfgId,
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
                generatedVarDef.add(
                    varDefFactory.create(
                        definedVar,
                        defFactory.create(
                            cfgNode.cfgId,
                            Def.LITERAL_TYPE,
                            node.range,
                            cfgWrapper.getScope()
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
            var definedVar = cfgWrapper.getVarByName(node.id.name);
            if (!!definedVar) {
                sameDefVars.add(definedVar);
                if (!!node.init) {
                    if (node.init.type === 'AssignmentExpression') {
                        recurse(node.init);
                    } else {
                        generatedVarDef.add(
                            varDefFactory.create(
                                definedVar,
                                defFactory.create(
                                    cfgNode.cfgId,
                                    Def.LITERAL_TYPE,
                                    node.init.range,
                                    cfgWrapper.getScope()
                                )
                            )
                        );
                    }
                }
            }
        },
        SwitchCase: function () {}
    });
    return generatedVarDef;
};

/**
 * Get used variables at the node
 * @param cfgNode a node of CFG
 * @param cfgWrapper
 * @constructor
 * @returns Set of variable names used at this node
 */
module.exports.USE = function (cfgNode, cfgWrapper) {
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
};