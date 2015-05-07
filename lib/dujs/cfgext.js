/**
 * Extensions of CFG
 * Created by chengfulin on 2015/4/15.
 */
var esgraph = require('esgraph'),
    esprima = require('esprima'),
    walkes = require('walkes'),
    namespace = require('./namespace'),
    internal = namespace();

/**
 * Extended for CFG build by esgraph
 * @constructor
 */
function CFGExt() {
    'use strict';
    internal(this).lastId = -1;
}

/**
 * Parse the code to AST with default range option
 * @param code source code
 * @returns {*}
 */
CFGExt.prototype.parseAST = function parseAST(code) {
    'use strict';
    return esprima.parse(code, {range: true});
};

/**
 * Get the CFG of the AST
 * @param ast
 * @returns {Array} CFG
 */
CFGExt.prototype.getCFG = function getCFG(ast) {
    'use strict';
    var cfg = esgraph(ast);
    for(var index = 0; index < cfg[2].length; ++index) {
        (cfg[2][index]).cfgId = internal(this).lastId + index + 1;
    }
    internal(this).lastId += cfg[2].length;
    return cfg;
};

/**
 * Find function scopes of AST parsed from source
 * @param ast
 * @returns {Array}
 */
CFGExt.prototype.findScopes = function findScopes(ast) {
    'use strict';
    var scopes = [];
    function handleInnerFunction(astNode, recurse) {
        scopes.push(astNode);
        recurse(astNode.body);
    }

    walkes(ast, {
        Program: function (node, recurse) {
            scopes.push(node);
            node.body.forEach(function (elem) {
                recurse(elem);
            });
        },
        FunctionDeclaration: handleInnerFunction,
        FunctionExpression: handleInnerFunction
    });
    return scopes;
};

/**
 * Convert a CFG to dot language for Graphviz output
 * @param cfg
 * @param withLabelId If the output graph should labeled with node id
 * @returns {*|string}
 */
CFGExt.prototype.toDot = function (cfg, withLabelId) {
    'use strict';
    var outputCFG = [].concat(cfg),
        option = {counter: outputCFG[0].cfgId};
    if (withLabelId) {
        outputCFG[2].forEach(function (node) {
            if (!node.type) {
                node.label = node.cfgId;
            }
        });
    }
    return esgraph.dot(cfg, option);
};

/**
 * Utility for resetting the current counter for Id
 */
CFGExt.prototype.resetCounter = function () {
    'use strict';
    internal(this).lastId = -1;
};

var singleTon = new CFGExt();
module.exports = singleTon;