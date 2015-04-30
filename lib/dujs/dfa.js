/**
 * Created by chengfulin on 2015/4/13.
 */
var walkes = require('walkes'),
    Set = require('../analyses').Set,
    Def = require('./def'),
    Scope = require('./scope'),
    Range = require('./range'),
    Map = require('core-js/es6/map');

/**
 * Get KILL set
 * @param astNode
 * @param cfgWrapper
 * @returns Set of variable whose definition was redefined in astNode
 * @constructor
 */
module.exports.KILL = function (astNode, cfgWrapper) {
    'use strict';
    var variables = new Set();
    walkes(astNode, {
        Program: function () {},
        AssignmentExpression: function (node, recurse) {
            if (node.left.type === 'MemberExpression') {
                recurse(node.left.object);
            } else {
                recurse(node.left);
            }
            if (node.right.type === 'AssignmentExpression') {
                recurse(node.right);
            }
        },
        UpdateExpression: function (node, recurse) {
            recurse(node.argument);
        },
        BinaryExpression: function () {},
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        CallExpression: function () {},
        SwitchCase: function () {},
        VariableDeclaration: function () {},
        VariableDeclarator: function () {},
        Identifier: function (node) {
            var killVar = cfgWrapper.getVarByName(node.name);
            if (!!killVar) {
                variables.add(killVar);
            }
        }
    });
    return variables;
};

/**
 * Get GEN set
 * @param cfgNode
 * @param inputs
 * @param cfgWrapper
 * @returns {Map}
 * @constructor
 */
module.exports.GEN = function (cfgNode, inputs, cfgWrapper) {
    'use strict';
    var generatedVarDef = new Set(),
        sameDefVars = new Set();
    walkes(cfgNode.astNode, {
        Program: function () {},
        AssignmentExpression: function (node, recurse) {/// add left var into sameDefVars, then recurse to right
            if (node.right.type === 'AssignmentExpression') {
                var sameDefVar = cfgWrapper.getVarByName(node.left.name);
                if (!!sameDefVar) {
                    sameDefVars.add(sameDefVar);
                }
                recurse(node.right);
            } else if (node.left.type === 'MemberExpression') {
                var objVar = cfgWrapper.getVarByName(node.left.object.name),
                    propVar = cfgWrapper.getVarByName(node.left.property.name || node.left.property.raw);
                if (!!objVar && !!propVar) {
                    if (node.right.type === 'Literal') {
                        /// Assignment to object property or array element
                        /// Generate new definitions of the object and the property
                        sameDefVars.add(objVar);
                        sameDefVars.add(propVar);
                        recurse(node.right);
                    } else if (node.right.type === 'MemberExpression') {
                        sameDefVars.add(objVar);
                        sameDefVars.add(propVar);
                        recurse(node.right);

                    } else if (node.right.type !== 'CallExpression' && node.right.type !== 'FunctionExpression') {
                        sameDefVars.add(objVar);
                        sameDefVars.add(propVar);
                        recurse(node.right);
                    }
                }
            } else {
                var assignedVar = cfgWrapper.getVarByName(node.left.name);
                if (!!assignedVar) {
                    sameDefVars.add(assignedVar);
                    recurse(node.right);
                }
            }
        },
        BinaryExpression: function (node) {
            sameDefVars.forEach(function (elem) {
                generatedVarDef.add({
                    variable: elem,
                    definition: new Def(
                        cfgNode.cfgId,
                        Def.LITERAL_TYPE,
                        new Range(node.range),
                        cfgWrapper.getScope()
                    )
                });
            });
            sameDefVars = new Set();
        },
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        CallExpression: function () {},
        VariableDeclaration: function (node, recurse) {
            node.declarations.forEach(recurse);
        },
        VariableDeclarator: function (node, recurse) {
            var declareVar = cfgWrapper.getVarByName(node.id.name);
            if (!!declareVar) {
                sameDefVars.add(declareVar);
                recurse(node.id);
            }
        },
        UpdateExpression: function (node) {///TODO: if the updateVar is an object property
            var updateVar = cfgWrapper.getVarByName(node.argument.name);
            if (!!updateVar) {
                if (node.prefix) {
                    sameDefVars.add(updateVar);
                    sameDefVars.forEach(function (elem) {
                        generatedVarDef.add({
                            variable: elem,
                            definition: new Def(
                                cfgNode.cfgId,
                                Def.LITERAL_TYPE,
                                new Range(node.range),
                                cfgWrapper.getScope()
                            )
                        });
                    });
                } else {
                    inputs.forEach(function (varDef) {
                        if (varDef.variable === updateVar) {
                            sameDefVars.forEach(function (elem) {
                                generatedVarDef.add({
                                    variable: elem,
                                    definition: varDef.definition
                                });
                            });
                        }
                    });
                }
            }
            sameDefVars = new Set();
        },
        SwitchCase: function () {},
        Identifier: function (node) {
            sameDefVars.forEach(function (elem) {
                generatedVarDef.add({
                    variable: elem,
                    definition: new Def(
                        cfgNode.cfgId,
                        Def.LITERAL_TYPE,
                        new Range(node.range),
                        cfgWrapper.getScope()
                    )
                });
            });
            sameDefVars = new Set();
        },
        NewExpression: function () {},
        MemberExpression: function (node) {
            var assignProp = cfgWrapper.getVarByName(node.property.name);
            if (!!assignProp) {
                sameDefVars.forEach(function (elem) {
                    inputs.forEach(function (varDef) {
                        if (varDef.variable === assignProp) {
                            sameDefVars.forEach(function (elem) {
                                generatedVarDef.add({
                                    variable: elem,
                                    definition: varDef.definition
                                });
                            });
                        }
                    });
                });
            }
            sameDefVars = new Set();
        },
        ObjectExpression: function (node) {
            sameDefVars.forEach(function (elem) {
                generatedVarDef.add({
                    variable: elem,
                    definition: new Def(
                        cfgNode.cfgId,
                        Def.OBJECT_TYPE,
                        node.range,
                        cfgWrapper.getScope()
                    )
                });
            });
            sameDefVars = new Set();
        },
        Literal: function (node) {
            sameDefVars.forEach(function (elem) {
                generatedVarDef.add({
                    variable: elem,
                    definition: new Def(
                        cfgNode.cfgId,
                        Def.LITERAL_TYPE,
                        new Range(node.range),
                        cfgWrapper.getScope()
                    )
                });
            });
            sameDefVars = new Set();
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