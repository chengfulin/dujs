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

module.exports.Def = Def;
module.exports.DUPair = require('./dupair');
module.exports.Pair = require('./pair');
module.exports.DFA = require('./dfa');
module.exports.DUA = require('./dua');
module.exports.ReachDefinitions = require('./reachdefinitions');
module.exports.CFGExt = CFGExt;
module.exports.ScopeWrapper = require('./scopewrapper');
module.exports.Scope = require('./scope');
module.exports.Var = require('./var');
module.exports.Range = require('./range');
module.exports.ScopeTree = ScopeTree;
module.exports.graphics = require('./graphics');
module.exports.VarDef = require('./vardef');
module.exports.factoryVarDef = require('./vardeffactory');
module.exports.factoryDUPair = require('./dupairfactory');
module.exports.factoryDef = require('./deffactory');
module.exports.factoryRange = require('./rangefactory');
module.exports.factoryVar = require('./varfactory');
module.exports.factoryPair = require('./pairfactory');
module.exports.factoryScopeWrapper = require('./scopewrapperfactory');
module.exports.Path = require('./path');
module.exports.AnalyzedCFG = require('./analyzedcfg');
module.exports.factoryAnalyzedCFG = require('./analyzedcfgfactory');
module.exports.analyzedCFGBuilder = analyzedCFGBuilder;