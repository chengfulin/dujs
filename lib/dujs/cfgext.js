/**
 * Extensions of CFG
 * Created by chengfulin on 2015/4/15.
 */
var esgraph = require('esgraph'),
    esprima = require('esprima'),
    walkes = require('walkes'),
    namespace = require('./namespace'),
    internal = namespace(),
    Map = require('core-js/es6/Map');

/**
 * Extended for CFG build by esgraph
 * @constructor
 */
function CFGExt() {
    'use strict';
    internal(this).lastId = -1;
}

Object.defineProperty(CFGExt.prototype, 'NORMAL_CONNECT_TYPE', {
    get: function () {
        'use strict';
        return 'normal';
    }
});

Object.defineProperty(CFGExt.prototype, 'TRUE_CONNECT_TYPE', {
    get: function () {
        'use strict';
        return 'true';
    }
});

Object.defineProperty(CFGExt.prototype, 'FALSE_CONNECT_TYPE', {
    get: function () {
        'use strict';
        return 'false';
    }
});

Object.defineProperty(CFGExt.prototype, 'EXCEPTION_CONNECT_TYPE', {
    get: function () {
        'use strict';
        return 'exception';
    }
});

Object.defineProperty(CFGExt.prototype, 'CALL_CONNECT_TYPE', {
    get: function () {
        'use strict';
        return 'call';
    }
});

Object.defineProperty(CFGExt.prototype, 'RETURN_CONNECT_TYPE', {
    get: function () {
        'use strict';
        return 'return';
    }
});

/**
 * Parse the code to AST with default range option
 * @param code source code
 * @returns {*}
 */
CFGExt.prototype.parseAST = function parseAST(code) {
    'use strict';
    return esprima.parse(code, {range: true, loc: true});
};

/**
 * Get the CFG of the AST with additional information
 * @param ast
 * @returns {Array} CFG
 * @function
 */
CFGExt.prototype.getCFG = function getCFG(ast) {
    'use strict';
    var cfg = esgraph(ast);
    /// label for entry and exit node
    cfg[0].label = 'entry';
    cfg[1].label = 'exit';
    /// Add cfgId and label to each node
    for(var index = 0; index < cfg[2].length; ++index) {
        (cfg[2][index]).cfgId = internal(this).lastId + index + 1;
        (cfg[2][index]).line = (!!cfg[2][index].type)? 0 : (cfg[2][index]).astNode.loc.start.line;
        (cfg[2][index]).col = (!!cfg[2][index].type)? 0 : (cfg[2][index]).astNode.loc.start.column;
    }
    internal(this).lastId += cfg[2].length;
    return cfg;
};

/**
 * Find function scopes of AST parsed from source
 * @param ast
 * @returns {Array}
 * @function
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
 * Convert a CFG to dot language for Graphviz output (with AST node type labeled, default)
 * @param cfg
 * @returns {*|string}
 * @function
 */
CFGExt.prototype.toDot = function (cfg) {
    'use strict';
    var outputCFG = [].concat(cfg),
        option = {counter: outputCFG[0].cfgId};
    return esgraph.dot(cfg, option);
};

/**
 * Convert a CFG to dot language for Graphviz output (with labeled line and column)
 * @param cfg
 * @returns {*|string}
 * @function
 */
CFGExt.prototype.toDotWithLabelLoc = function (cfg) {
    'use strict';
    var outputCFG = [].concat(cfg),
        option = {counter: outputCFG[0].cfgId};
    outputCFG[2].forEach(function (node) {
        if (!node.type) {
            node.label = node.line + ':' + node.col;
        } else {
            node.label = node.type;
        }
    });
    return esgraph.dot(cfg, option);
};

/**
 * Convert a CFG to dot language for Graphviz output (with id labeled)
 * @param cfg
 * @returns {*|string}
 * @function
 */
CFGExt.prototype.toDotWithLabelId = function (cfg) {
    'use strict';
    var outputCFG = [].concat(cfg),
        option = {counter: outputCFG[0].cfgId};
    outputCFG[2].forEach(function (node) {
        if (!node.type) {
            node.label = node.cfgId;
        } else {
            node.label = node.type + ' (' + node.cfgId + ')';
        }
    });
    return esgraph.dot(cfg, option);
};

/**
 * Utility for resetting the current counter for Id
 * @function
 */
CFGExt.prototype.resetCounter = function () {
    'use strict';
    internal(this).lastId = -1;
};

/**
 * Connect this CFG node to next node with a type if specified
 * @param thisNode
 * @param nextNode
 * @param type
 * @function
 */
CFGExt.prototype.connect = function (thisNode, nextNode, type) {
    'use strict';
    thisNode.connect(nextNode, type);
    thisNode.next.push(nextNode);
    nextNode.prev.push(thisNode);
};

var singleTon = new CFGExt();
module.exports = singleTon;