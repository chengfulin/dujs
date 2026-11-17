/*
 * DefUseAnalysisExecutor module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var jsParser = require('./jsparser'),
	scopeCtrl = require('./scopectrl'),
	modelCtrl = require('./modelctrl'),
	modelBuilder = require('./modelbuilder'),
	defuseAnalyzer = require('./defuseanalyzer'),
	summary = require('./summary'),
	variableAnalyzer = require('./variableanalyzer');

function DefUseAnalysisExecutor() {
}

/* start-public-methods */
/**
 * Initialize: parse each page and build its scope tree with its binding, then
 * register the Vars of every scope (feature 006 data-model section 6)
 * @param {Array} codeOfPages Source code of each page
 */
DefUseAnalysisExecutor.prototype.initialize = function (codeOfPages) {
	"use strict";
	if (codeOfPages instanceof Array) {
		codeOfPages.forEach(function (code) {
			var ast = jsParser.parseAST(code, {range: true, loc: true});
			scopeCtrl.addPageScopeTree(ast);
		});
		modelCtrl.initializePageModels();
        variableAnalyzer.setLocalVariables(scopeCtrl.domainScope);
        scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
            pageScopeTree.scopes.forEach(function (scope) {
                variableAnalyzer.setLocalVariables(scope);
            });
        });
        /// the Vars not registered by the walks (catch parameters, function
        /// expression names, inner class names; feature 006 data-model section 6)
        scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
            pageScopeTree.binding.registerRemainingVariables();
        });
	}
};

/**
 * Build model graphs for each intra-procedural model in every PageModels
 */
DefUseAnalysisExecutor.prototype.buildIntraProceduralModelsOfEachPageModels = function () {
	"use strict";
	modelBuilder.buildIntraProceduralModels();

    defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.intraProceduralModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
            defuseAnalyzer.findDUPairs(model);
        });
    });
};

/**
 * Build the inter-procedural models of every page, compute the summaries of
 * the scopes of each page (feature 005 research R1: after the models are
 * built, before they are analyzed), then analyze the models
 */
DefUseAnalysisExecutor.prototype.buildInterProceduralModelsOfEachPageModels = function () {
    "use strict";
    modelBuilder.buildInterProceduralModels();
    scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
        summary.computeForPage(scopeTree);
    });

    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.interProceduralModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
            defuseAnalyzer.findDUPairs(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildIntraPageModelsOfEachPageModels = function () {
    "use strict";
    modelBuilder.buildIntraPageModel();

    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.intraPageModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
            defuseAnalyzer.findDUPairs(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildInterPageModelsOfEachPageModels = function () {
    "use strict";
    modelBuilder.buildInterPageModel();
    defuseAnalyzer.doAnalysis(modelCtrl.interPageModel);
    defuseAnalyzer.findDUPairs(modelCtrl.interPageModel);
};
/* start-public-methods */

var analysisExecutor = new DefUseAnalysisExecutor();
module.exports = analysisExecutor;