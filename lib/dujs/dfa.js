/**
 * Created by chengfulin on 2015/4/13.
 */
var walkes = require('walkes'),
    Set = require('../analyses').Set,
    Def = require('./def'),
    Scope = require('./scope');
require('core-js/fn/map');

/**
 * Get KILL set
 * @param astNode
 * @returns Set of variable whose definition was redefined in astNode
 * @constructor
 */
module.exports.KILL = function (astNode) {
    'use strict';
    var variables = new Set();
    /// KILL(n)
    /// 1. Variable redefined by assignment expression
    /// 2. Define object property by assignment expression
    /// 3. Update by UpdateExpression
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
            variables.add(node.name);
        }
    });
    return variables;
};

/**
 * Get GEN set
 * @param cfgNode
 * @param scope Scope where this node belongs to
 * @returns {Set} definition whom was newly created in current node
 * @constructor
 */
module.exports.GEN = function (cfgNode, scope) {
    'use strict';
    var mapDefVars = new Map(),
        selfAssign = ['+=', '-=', '*=', '/=', '%='],
        vars = new Set(),
        definitions = new Set();
    /// 1. self assignment
    walkes(cfgNode.astNode, {
        Program: function () {},
        AssignmentExpression: function (node, recurse) {
            var definitions = mapDefVars.get(node.left.name) || new Set();
            if (selfAssign.indexOf(node.operator) !== -1) {
                definitions.add(new Def(cfgNode.cfgId, node.range, new Scope(scope)));
                mapDefVars.set(definitions);
            } else if (node.right.type !== 'AssignmentExpression') {
                sameDefVars.push(node.left.name);
                sameDefVars.forEach(function (elem) {
                    definitions.add(new Def(cfgNode.cfgId, node.range, new Scope(scope)));
                    mapDefVars.set(definitions);
                });
            } else {
                sameDefVars.push(node.left.name);
                recurse(node.right);
            }
        },
        BinaryExpression: function () {},
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
        CallExpression: function () {},
        VariableDeclaration: function () {},
        VariableDeclarator: function () {},
        UpdateExpression: function (node) {
            definitions.add(new Def(cfgNode.cfgId, node.range, new Scope(scope)));
        },
        SwitchCase: function () {},
        Identifier: function (node) {
            vars.add(node.name);
        },
        NewExpression: function (node) {
            definitions.add(new Def(cfgNode.cfgId, node.range, new Scope(scope)));
        },
        ObjectExpression: function (node) {
            definitions.add(new Def(cfgNode.cfgId, node.range, new Scope(scope)));
        },
        Literal: function (node) {
            definitions.add(new Def(cfgNode.cfgId, node.range, new Scope(scope)));
        }
    });
    return definitions;
};

/**
 * Get used variables at the node
 * @param cfgNode a node of CFG
 * @constructor
 * @returns Set of variable names used at this node
 */
module.exports.USE = function (cfgNode) {
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
            variables.add(node.name);
        }
    });
    return variables;
};