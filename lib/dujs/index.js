/**
 * Created by chengfulin on 2015/4/20.
 */
var analyzedCFGBuilder = require('./analyzedcfgbuilder'),
    CFGExt = require('./cfgext'),
    Def = require('./def'),
    ScopeTree = require('./scopetree'),
    DefUseAnalyzer = require('./defuseanalyzer');

function buildScopeTree(source) {
    "use strict";
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
    return scopeTree;
}

function buildIntraProceduralAnalysisItems(scopeTree) {
    "use strict";
    var intraProceduralAnalysisItems = [];
    /* Create intra-procedural analysis items */
    intraProceduralAnalysisItems = [].concat(analyzedCFGBuilder.buildIntraProceduralCFGs(scopeTree));
    /* Do analysis for intra-procedural analysis item */
    intraProceduralAnalysisItems.forEach(function (item) {
        DefUseAnalyzer.doAnalysis(item);
        DefUseAnalyzer.findDUPairs(item);
    });
    return intraProceduralAnalysisItems;
}

function doIntraProceduralAnalysis(source) {
    "use strict";
    var scopeTree = buildScopeTree(source);
    return buildIntraProceduralAnalysisItems(scopeTree);
}

function buildInterProceduralAnalysisItems(scopeTree) {
    "use strict";
    var interProceduralAnalysisItems = [];
    buildIntraProceduralAnalysisItems(scopeTree);
    /* Create inter-procedural analysis items */
    interProceduralAnalysisItems = [].concat(analyzedCFGBuilder.buildInterProceduralCFGs(scopeTree));
    /* Do analysis for inter-procedural analysis item */
    interProceduralAnalysisItems.forEach(function (item) {
        DefUseAnalyzer.doAnalysis(item);
        DefUseAnalyzer.findDUPairs(item);
    });
    return interProceduralAnalysisItems;
}

function doInterProceduralAnalysis(source) {
    "use strict";
    var scopeTree = buildScopeTree(source);
    return buildInterProceduralAnalysisItems(scopeTree);
}

module.exports.doIntraProceduralAnalysis = doIntraProceduralAnalysis;
module.exports.doInterProceduralAnalysis = doInterProceduralAnalysis;

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