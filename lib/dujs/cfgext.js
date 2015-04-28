/**
 * Extensions of CFG
 * Created by chengfulin on 2015/4/15.
 */
var esgraph = require('esgraph'),
    esprima = require('esprima'),
    walkes = require('walkes');

/**
 * Parse the code to AST with default range option
 * @param code source code
 * @returns {*}
 */
module.exports.parseAST = function parseAST(code) {
    'use strict';
    return esprima.parse(code, {range: true});
};

/**
 * Add Id to each CFG node
 * @param cfg the CFG to be modified
 * @returns CFG
 */
function addCFGIds(cfg) {
    'use strict';
    for(var index = 0; index < cfg[2].length; ++index) {
        (cfg[2][index]).cfgId = index;
    }
    return cfg;
}

/**
 * Get the CFG of the AST
 * @param ast
 * @returns {Array} CFG
 */
module.exports.getCFG = function getCFG(ast) {
    'use strict';
    return addCFGIds(esgraph(ast));
};

/**
 * Find function scopes of AST parsed from source
 * @param ast
 * @returns {Array}
 */
module.exports.findScopes = function findScopes(ast) {
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