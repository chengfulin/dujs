/**
 * Created by chengfulin on 2015/4/20.
 */
var analyzedCFGBuilder = require('./analyzedcfgbuilder'),
    CFGExt = require('./cfgext'),
    Def = require('./def'),
    ScopeTree = require('./scopetree');

function main(source) {
    "use strict";
    var intraProceduralAnalysisItems = [],
        interProceduralAnalysisItems = [],
        intraPageAnalysisItems = [],
        outputs = [];

    /* Parse AST */
    var scopeTree = new ScopeTree(),
        ast = CFGExt.parseAST(source);

    /* Build scopes */
    scopeTree.buildScopeTree(ast);

    /* Set global variables */
    scopeTree.addGlobalVarDef('window', Def.HTML_DOM_TYPE);
    scopeTree.addGlobalVarDef('document', Def.HTML_DOM_TYPE);

    /* Create local variables */
    scopeTree.setVars();

    /* Create intra-procedural analysis item */
    intraProceduralAnalysisItems.concat(analyzedCFGBuilder.buildIntraProceduralCFGs(scopeTree));

    outputs.push(intraProceduralAnalysisItems);
    outputs.push(interProceduralAnalysisItems);
    outputs.push(intraPageAnalysisItems);
    return outputs;
}

module.exports = main;

exports.Def = require('./def');
exports.DUPair = require('./dupair');
exports.Pair = require('./pair');
exports.DFA = require('./dfa');
exports.DUA = require('./dua');
exports.ReachDefinitions = require('./reachdefinitions');
exports.CFGExt = require('./cfgext');
exports.ScopeWrapper = require('./scopewrapper');
exports.Scope = require('./scope');
exports.Var = require('./var');
exports.Range = require('./range');
exports.ScopeTree = require('./scopetree');
exports.graphics = require('./graphics');
exports.VarDef = require('./vardef');
exports.factoryVarDef = require('./vardeffactory');
exports.factoryDUPair = require('./dupairfactory');
exports.factoryDef = require('./deffactory');
exports.factoryRange = require('./rangefactory');
exports.factoryVar = require('./varfactory');
exports.factoryPair = require('./pairfactory');
exports.factoryScopeWrapper = require('./scopewrapperfactory');
exports.Path = require('./path');
exports.AnalyzedCFG = require('./analyzedcfg');
exports.factoryAnalyzedCFG = require('./analyzedcfgfactory');
exports.analyzedCFGBuilder = require('./analyzedcfgbuilder');