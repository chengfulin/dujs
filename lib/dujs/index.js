/*
 * Created by chengfulin on 2015/4/20.
 */
var analyzedCFGBuilder = require('./modelbuilder'),
    jsParser = require('./jsparser'),
    Def = require('./def'),
    ScopeTree = require('./scopectrl'),
    DefUseAnalyzer = require('./defuseanalyzer'),
    AnalysisItemCtrl = require('./modelctrl'),
    globalScopeCtrl = require('./globalscopectrl'),
    Set = require('../analyses').Set,
    Map = require('core-js/es6/map');

function buildScopeTree(source) {
    "use strict";
    /* Parse AST */
    var scopeTree = new ScopeTree(),
        ast = jsParser.parseAST(source);

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
    var analysisItemsCtrl = new AnalysisItemCtrl();
    /* Create intra-procedural analysis items */
    analysisItemsCtrl.intraProceduralAnalysisItems = [].concat(analyzedCFGBuilder.buildIntraProceduralAnalysisItems(scopeTree));
    /* Do analysis for intra-procedural analysis item */
    analysisItemsCtrl.intraProceduralAnalysisItems.forEach(function (item) {
        DefUseAnalyzer.doAnalysis(item);
        DefUseAnalyzer.findDUPairs(item);
    });
    return analysisItemsCtrl;
}

function doIntraProceduralAnalysis(source) {
    "use strict";
    var scopeTree = buildScopeTree(source);
    return buildIntraProceduralAnalysisItems(scopeTree);
}

function buildInterProceduralAnalysisItems(scopeTree) {
    "use strict";
    var analysisItemCtrl = buildIntraProceduralAnalysisItems(scopeTree);
    /* Create inter-procedural analysis items */
    analysisItemCtrl.interProceduralAnalysisItems = [].concat(analyzedCFGBuilder.buildInterProceduralAnalysisItems(scopeTree));
    /* Do analysis for inter-procedural analysis item */
    analysisItemCtrl.interProceduralAnalysisItems.forEach(function (item) {
        DefUseAnalyzer.doAnalysis(item);
        DefUseAnalyzer.findDUPairs(item);
    });
    return analysisItemCtrl;
}

function doInterProceduralAnalysis(source) {
    "use strict";
    var scopeTree = buildScopeTree(source);
    return buildInterProceduralAnalysisItems(scopeTree);
}

function buildIntraPageAnalysisItems(scopeTree) {
    "use strict";
    var analysisItemCtrl = buildInterProceduralAnalysisItems(scopeTree);

    analysisItemCtrl.intraPageAnalysisItems = [].concat(analyzedCFGBuilder.buildIntraPageAnalysisItem(analysisItemCtrl, scopeTree));
    analysisItemCtrl.intraPageAnalysisItems.forEach(function (item) {
        DefUseAnalyzer.doAnalysis(item);
        DefUseAnalyzer.findDUPairs(item);
    });
    return analysisItemCtrl;
}

function doIntraPageAnalysis(source) {
    "use strict";
    var scopeTree = buildScopeTree(source);
    return buildIntraPageAnalysisItems(scopeTree);
}

function doInterPageAnalysis(sources) {
    "use strict";
    if (sources instanceof Array) {
        var pageAnalysisItemCtrls = [];
        var intraPageAnalysisItems = [];
        sources.forEach(function (source) {
            var analysisItemCtrl = doIntraPageAnalysis(source);
            pageAnalysisItemCtrls.push(analysisItemCtrl);
            intraPageAnalysisItems = [].concat(intraPageAnalysisItems.concat(analysisItemCtrl.intraPageAnalysisItems));
        });
        DefUseAnalyzer.updateIntraPageWithLocalStorageDefinition(globalScopeCtrl, intraPageAnalysisItems);
        intraPageAnalysisItems.forEach(function (item) {
            DefUseAnalyzer.doAnalysis(item);
            DefUseAnalyzer.findDUPairs(item);
        });
        var interPageAnalysisItem = analyzedCFGBuilder.buildInterPageAnalysisItem(globalScopeCtrl, intraPageAnalysisItems);
        var combinedDUPairs = new Map();
        intraPageAnalysisItems.forEach(function (item) {
            item.dupairs.forEach(function (pair, variable) {
                if (!combinedDUPairs.has(variable)) {
                    combinedDUPairs.set(variable, pair);
                } else {
                    combinedDUPairs.set(variable, Set.union(combinedDUPairs.get, pair));
                }
            });
        });
        interPageAnalysisItem.dupairs = combinedDUPairs;
        var interPageAnalysisItemCtrl = new AnalysisItemCtrl();
        interPageAnalysisItemCtrl.interPageModels = [interPageAnalysisItem];
        return interPageAnalysisItemCtrl;
    }
}

module.exports.doIntraProceduralAnalysis = doIntraProceduralAnalysis;
module.exports.doInterProceduralAnalysis = doInterProceduralAnalysis;
module.exports.doIntraPageAnalysis = doIntraPageAnalysis;
module.exports.doInterPageAnalysis = doInterPageAnalysis;

module.exports.Def = Def;
module.exports.DUPair = require('./dupair');
module.exports.Pair = require('./pair');
module.exports.DefUseAnalyzer = DefUseAnalyzer;
module.exports.ScopeWrapper = require('./scope');
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
module.exports.factoryScope = require('./scopefactory');
module.exports.Path = require('./path');
module.exports.AnalyzedCFG = require('./model');
module.exports.factoryAnalyzedCFG = require('./modelfactory');
module.exports.analyzedCFGBuilder = analyzedCFGBuilder;
module.exports.AliasMap = require('./aliasmap');
module.exports.factoryAliasMap = require('./aliasmapfactory');
module.exports.AnalysisItemCtrl = AnalysisItemCtrl;
module.exports.globalScopeCtrl = globalScopeCtrl;