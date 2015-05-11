/**
 * Created by chengfulin on 2015/4/13.
 */
var walkes = require('walkes'),
    Set = require('../analyses').Set,
    Def = require('./def'),
    Scope = require('./scope'),
    Range = require('./range'),
    varDefFactory = require('./vardeffactory'),
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
        }
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
            }
            if (node.right.type === 'AssignmentExpression') {
                recurse(node.right);
            } else {
                sameDefVars.forEach(function (defined) {
                    generatedVarDef.add(
                        varDefFactory.create(
                            defined,
                            new Def(
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
        },
        UpdateExpression: function (node) {
            var definedVar = cfgWrapper.getVarByName(node.argument.name);
            if (!!definedVar) {
                generatedVarDef.add(
                    varDefFactory.create(
                        definedVar,
                        new Def(
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
            }
            if (node.init.type === 'AssignmentExpression') {
                recurse(node.init);
            } else {
                generatedVarDef.add(
                    varDefFactory.create(
                        definedVar,
                        new Def(
                            cfgNode.cfgId,
                            Def.LITERAL_TYPE,
                            node.init.range,
                            cfgWrapper.getScope()
                        )
                    )
                );
            }
        }
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
    var variables = new Set();
    walkes(cfgNode.astNode, {
        Program: function () {},
        AssignmentExpression: function (node, recurse) {
            var selfAssign = ['+=', '-=', '*=', '/=', '%='];
            if (selfAssign.indexOf(node.operator) !== -1) {
                recurse(node.left);
                recurse(node.right);
            }
            if (node.right.type === 'AssignmentExpression') {
                /// Since it is a sequence of assignment
                if (node.right.left.type === 'Identifier') {
                    recurse(node.right.left);
                }
                recurse(node.right);
            } else if (node.right.type === 'MemberExpression') {
                /// assignment with object property
                recurse(node.right.object);
            } else {
                recurse(node.right);
            }
        },
        BinaryExpression: function (node, recurse) {
            /// Both operand are used
            recurse(node.left);
            recurse(node.right);
        },
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        CallExpression: function (node, recurse) {
            /// When calling object method
            if (node.callee.type === 'MemberExpression') {
                recurse(node.callee.object);
            } else {
                /// otherwise, calling a normal function
                recurse(node.callee);
            }
            /// for the function arguments
            node.arguments.forEach(recurse);
        },
        VariableDeclaration: function (node, recurse) {
            node.declarations.forEach(function (elem) {
                if (!!elem.init && elem.init.type === 'AssignmentExpression') {
                    /// e.g., var answer = var1 = var2;
                    recurse(elem.init.left);
                }
                recurse(elem.init);
            });
        },
        VariableDeclarator: function () {},
        UpdateExpression: function (node, recurse) {
            recurse(node.argument);
        },
        SwitchCase: function (node, recurse) {
            /// handle expression in switch statement
            if (!!node.test && !!cfgNode.parent && cfgNode.parent.type === 'SwitchStatement') {
                recurse(cfgNode.parent.discriminant);
            }
            /// each statement inside the case
            node.consequent.forEach(recurse);
        },
        Identifier: function (node) {
            var useVar = cfgWrapper.getVarByName(node.name);
            if (!!useVar) {
                variables.add(useVar);
            }
        }
    });
    return variables;
};