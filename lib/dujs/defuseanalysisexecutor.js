/*
 * DefUseAnalysisExecutor module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-26
 */
var jsParser = require('./jsparser'),
	scopeCtrl = require('./scopectrl'),
	modelCtrl = require('./modelctrl'),
	modelBuilder = require('./modelbuilder'),
	defuseAnalyzer = require('./defuseanalyzer'),
	variableAnalyzer = require('./variableanalyzer');

function DefUseAnalysisExecutor() {
}

/* start-public-methods */
/**
 * Initialize
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
	}
};

/**
 * Build model graphs for each intra-procedural model in every PageModels
 */
DefUseAnalysisExecutor.prototype.buildIntraProceduralModelsOfEachPageModels = function () {
	"use strict";
	modelCtrl.collectionOfPageModels.forEach(function () {
		modelBuilder.buildIntraProceduralModels();
	});

    defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.intraProceduralModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildInterProceduralModelsOfEachPageModels = function () {
    "use strict";
    modelCtrl.collectionOfPageModels.forEach(function () {
        modelBuilder.buildInterProceduralModels();
    });

    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.interProceduralModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildIntraPageModelsOfEachPageModels = function () {
    "use strict";
    modelCtrl.collectionOfPageModels.forEach(function () {
        modelBuilder.buildIntraPageModel();
    });

    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.intraPageModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildInterPageModelsOfEachPageModels = function () {
    "use strict";
    modelBuilder.buildInterPageModel();
    defuseAnalyzer.doAnalysis(modelCtrl.interPageModel);
};
/* start-public-methods */

var analysisExecutor = new DefUseAnalysisExecutor();
module.exports = analysisExecutor;