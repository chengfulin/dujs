/**
 * Extensions of CFG
 * Created by chengfulin on 2015/4/15.
 */
var esgraph = require('../esgraph/index'),
    FlowNode = require('../esgraph').FlowNode,
    factoryFlowNode = require('../esgraph').factoryFlowNode,
    esprima = require('esprima'),
    walkes = require('walkes');
/**
 * Extended for CFG build by esgraph
 * @constructor
 */
function CFGExt() {
    'use strict';
}

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
CFGExt.prototype.getCFG = function getCFG(ast, option) {
    'use strict';
    var cfg = esgraph(ast),
        maxLine = 0,
        maxCol = 0;

    for(var index = 0; index < cfg[2].length; ++index) {
        /// specify line number and column offset for nodes beside the entry and exit nodes
        if (cfg[2][index].type !== FlowNode.EXIT_NODE_TYPE) {
            (cfg[2][index]).line = cfg[2][index].astNode.loc.start.line;
            (cfg[2][index]).col = cfg[2][index].astNode.loc.start.column;
            maxLine = (cfg[2][index].line > maxLine)? cfg[2][index].line : maxLine;
            maxCol = (cfg[2][index].col > maxCol)? cfg[2][index].col : maxCol;
        }
    }
    /// specify the value of line number and column offset for the exit node
    cfg[1].line = maxLine;
    cfg[1].col = maxCol + 1;
    if (!option || (!!option && option.labelWithLoc)) {
        labelWithLoc(cfg);
    }
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

function labelWithLoc(cfg) {
    "use strict";
    cfg[2].forEach(function (node) {
        if (node.type === FlowNode.NORMAL_NODE_TYPE) {
            node.label = 'L' + node.line + ':C' + node.col;
        } else if ([FlowNode.ENTRY_NODE_TYPE, FlowNode.EXIT_NODE_TYPE, FlowNode.CALL_RETURN_NODE_TYPE].indexOf(node.type) !== -1) {
            node.label = node.type + ' (L' + node.line + ':C' + node.col + ')';
        } else {
            node.label = node.type;
        }
    });
}

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
    labelWithLoc(outputCFG);
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
        if (node.type === FlowNode.NORMAL_NODE_TYPE) {
            node.label = 'L' + node.line;
        } else if ([FlowNode.ENTRY_NODE_TYPE, FlowNode.EXIT_NODE_TYPE, FlowNode.CALL_RETURN_NODE_TYPE].indexOf(node.type) !== -1) {
            node.label = node.type + ' (L' + node.line + ')';
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
        if (node.type === FlowNode.NORMAL_NODE_TYPE) {
            node.label = node.cfgId.toString();
        } else if ([FlowNode.ENTRY_NODE_TYPE, FlowNode.EXIT_NODE_TYPE, FlowNode.CALL_RETURN_NODE_TYPE].indexOf(node.type) !== -1) {
            node.label = node.type + ' (' + node.cfgId + ')';
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

var singleTon = new CFGExt();
module.exports = singleTon;