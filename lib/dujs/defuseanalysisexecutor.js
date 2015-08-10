/*
 * DefUseAnalysisExecutor module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 * @lastmodifiedDate 2015-08-09
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
	}
};

/**s
 * Build model graphs for each intra-procedural model in every PageModels
 */
DefUseAnalysisExecutor.prototype.buildIntraProceduralModelsForEachPageModels = function () {
	"use strict";
	modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
		pageModels.intraProceduralModels = modelBuilder.buildIntraProceduralModels(pageModels.pageScopeTree);
	});
};

/**
 * Analyze all intra-procedural models of each PageModels
 */
DefUseAnalysisExecutor.prototype.analyzeIntraProceduralModelsOfEachPageModels = function () {
	"use strict";
	modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
		pageModels.intraProceduralModels.forEach(function (model) {
			variableAnalyzer.setLocalVariables(model.mainlyRelatedScope);
		});
	});
};
/* start-public-methods */

var analysisExecutor = new DefUseAnalysisExecutor();
module.exports = analysisExecutor;