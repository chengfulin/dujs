/**
 * Extensions of CFG
 * Created by chengfulin on 2015/4/15.
 */
var esgraph = require('../esgraph/index'),
    FlowNode = require('../esgraph/flownode'),
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
    internal(this)._lastCFGId = 0;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/**
 * Reset the counter of cfgId
 * @function
 */
CFGExt.prototype.resetCounter = function () {
    "use strict";
    internal(this)._lastCFGId = 0;
};

/**
 * Parse the code to AST with specified options for esprima parser or use the default range and loc options
 * @param code source code
 * @param [options]
 * @returns {*}
 */
CFGExt.prototype.parseAST = function parseAST(code, options) {
    'use strict';
    var optionObj = options || {range: true, loc: true};
    if (!optionObj.range) {
        optionObj.range = true;
    }
    if (!optionObj.loc) {
        optionObj.loc = true;
    }
    return esprima.parse(code, optionObj);
};

/**
 * Get the CFG of the AST with additional information
 * @param ast
 * @returns {Array} CFG
 * @function
 */
CFGExt.prototype.getCFG = function getCFG(ast) {
    'use strict';
    var cfg = esgraph(ast),
        maxLine = 0,
        maxCol = 0;
    /// specify line number and column offset for the entry node
    cfg[0].line = 0;
    cfg[0].loc = 0;

    for(var index = 0; index < cfg[2].length; ++index) {
        /// assign cfgId of the node
        cfg[2][index].cfgId = internal(this)._lastCFGId++;
        /// specify line number and column offset for nodes beside the entry and exit nodes
        if (cfg[2][index].type !== FlowNode.ENTRY_NODE_TYPE && cfg[2][index].type !== FlowNode.EXIT_NODE_TYPE) {
            (cfg[2][index]).line = cfg[2][index].astNode.loc.start.line;
            (cfg[2][index]).col = cfg[2][index].astNode.loc.start.column;
            maxLine = (cfg[2][index].line > maxLine)? cfg[2][index].line : maxLine;
            maxCol = (cfg[2][index].col > maxCol)? cfg[2][index].col : maxCol;
        }
    }
    /// specify the value of line number and column offset ofor the exit node
    cfg[1].line = maxLine;
    cfg[1].col = maxCol + 1;
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
 * @param [source] Source code used for labels
 * @returns {*|string}
 * @function
 */
CFGExt.prototype.toDot = function (cfg, source) {
    'use strict';
    var outputCFG = [].concat(cfg),
        option = {counter: outputCFG[0].cfgId};
    if (!!source) {
        option.source = source;
    }
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
        if (node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE) {
            node.label = node.line + ':' + node.col;
        }
    });
    return esgraph.dot(cfg, option);
};

/**
 * Convert a CFG to dot language format output with labeled line number only
 * @param cfg
 * @returns {*}
 */
CFGExt.prototype.toDotWithLabelLine = function (cfg) {
    'use strict';
    var outputCFG = [].concat(cfg),
        option = {counter: outputCFG[0].cfgId};
    outputCFG[2].forEach(function (node) {
        if (node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE) {
            node.label = node.line;
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
        if (node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE) {
            node.label = node.cfgId.toString();
        } else {
            node.label = node.type + ' (' + node.cfgId + ')';
        }
    });
    return esgraph.dot(cfg, option);
};

/**
 * Check for a cfg is valid
 * @param cfg
 * @returns {boolean}
 * @function
 */
CFGExt.prototype.isValidCFG = function (cfg) {
    "use strict";
    return cfg instanceof Array && cfg.length === 3 && cfg[0] instanceof FlowNode && cfg[1] instanceof FlowNode && cfg[2] instanceof Array && cfg[2].indexOf(cfg[0]) !== -1 && cfg[2].indexOf(cfg[1]) !== -1;
};

Object.defineProperty(CFGExt.prototype, 'lastCFGId', {
    get: function () {
        "use strict";
        return internal(this)._lastCFGId;
    },
    set: function (id) {
        "use strict";
        if (typeof id === 'number' && id >= 0) {
            internal(this)._lastCFGId = id;
        }
    }
});

var singleTon = new CFGExt();
module.exports = singleTon;