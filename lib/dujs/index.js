/**
 * Created by chengfulin on 2015/4/20.
 */
var analyzedCFGBuilder = require('./analyzedcfgbuilder'),
    CFGExt = require('./cfgext'),
    Def = require('./def'),
    ScopeTree = require('./scopetree'),
    DefUseAnalyzer = require('./defuseanalyzer');

function main(source) {
    "use strict";
    var intraProceduralAnalysisItems = [],
        interProceduralAnalysisItems = [],
        intraPageAnalysisItems = [],
        output = {};

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
    intraProceduralAnalysisItems = [].concat(analyzedCFGBuilder.buildIntraProceduralCFGs(scopeTree));

    /* Do analysis */
    intraProceduralAnalysisItems.forEach(function (item) {
        DefUseAnalyzer.doAnalysis(item);
        DefUseAnalyzer.findDUPairs(item);
    });

    output.intraProcedurals = intraProceduralAnalysisItems;
    output.interProcedurals = interProceduralAnalysisItems;
    output.intraPages = intraPageAnalysisItems;
    return output;
}

module.exports = main;

module.exports.Def = Def;
module.exports.DUPair = require('./dupair');
module.exports.Pair = require('./pair');
module.exports.DefUseAnalyzer = DefUseAnalyzer;
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
module.exports.AliasMap = require('./aliasmap');
module.exports.factoryAliasMap = require('./aliasmapfactory');