/*
 * Create output files and directories
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-31
 */
var fs = require('fs'),
    spawnSync = require('child_process').spawnSync;
var scopeCtrl = require('./scopectrl'),
    modelCtrl = require('./modelctrl'),
    modelGraphConverter = require('./graphics');

/**
 * OutputWriter
 * @constructor
 */
function OutputWriter() {
    "use strict";
    /* start-test-block */
    this._testonly_ = {
        _writeDOTRepresentationFileForGraph: writeDOTRepresentationFileForGraph,
        _writeDOTRepresentationFileForDUpairs: writeDOTRepresentationFileForDUpairs,
        _writeImageFileFromDotFile: writeImageFileFromDotFile
    };
    /* end-test-block */
}

Object.defineProperties(OutputWriter.prototype, {
    ROOT_OUTPUT_DIR: {
        value: 'out-' + (new Date()).toLocaleDateString() + '-' + (new Date()).getHours() + '-' + (new Date()).getMinutes() + '-' + (new Date()).getSeconds(),
        enumerable: true
    },
    PAGE_OUTPUT_DIR: {
        value: 'page',
        enumerable: true
    },
    INTRA_PROCEDURAL_OUTPUTS_DIR: {
        value: 'intra-procedurals',
        enumeralbe: true
    },
    INTER_PROCEDURAL_OUTPUTS_DIR: {
        value: 'inter-procedurals',
        enumerable: true
    },
    INTRA_PAGE_OUTPUTS_DIR: {
        value: 'intra-pages',
        enumerable: true
    },
    INTER_PAGE_OUTPUTS_DIR: {
        value: 'inter-page',
        enumerable: true
    },
    intraProceduralAnalysisResultFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    }
});

/**
 * Create output directories
 * @param {number} pageIndex
 */
OutputWriter.prototype.createOutputDirectories = function (pageIndex) {
    "use strict";
    var indexOfPageOutput = pageIndex || 0;
    if (!fs.existsSync(this.ROOT_OUTPUT_DIR)) {
        fs.mkdirSync(this.ROOT_OUTPUT_DIR);
    }
    if (!fs.existsSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput)) {
        fs.mkdirSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput);
    }
    if (!fs.existsSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput + '/' + this.INTRA_PROCEDURAL_OUTPUTS_DIR)) {
        fs.mkdirSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput + '/' + this.INTRA_PROCEDURAL_OUTPUTS_DIR);
    }
    if (!fs.existsSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput + '/' + this.INTER_PROCEDURAL_OUTPUTS_DIR)) {
        fs.mkdirSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput + '/' + this.INTER_PROCEDURAL_OUTPUTS_DIR);
    }
    if (!fs.existsSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput + '/' + this.INTRA_PAGE_OUTPUTS_DIR)) {
        fs.mkdirSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPageOutput + '/' + this.INTRA_PAGE_OUTPUTS_DIR);
    }
    if (!fs.existsSync(this.ROOT_OUTPUT_DIR + '/' + this.INTER_PAGE_OUTPUTS_DIR)) {
        fs.mkdirSync(this.ROOT_OUTPUT_DIR + '/' + this.INTER_PAGE_OUTPUTS_DIR);
    }
};

/**
 * Write the combined JS source files of a page
 * @param {string} content
 * @param {number} indexOfPage
 */
OutputWriter.prototype.writeCombinedJSSource = function (content, indexOfPage) {
    "use strict";
    fs.writeFileSync(this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPage + '/' + 'src.js', content);
};

/**
 * Write the DOT format files representing model graph
 * @param {Model} model
 * @param {string} outputDirPath
 * @param {number} [modelIndex]
 * @returns {string} File path of the graph representation file
 * @memberof OutputWriter.prototype
 * @private
 */
function writeDOTRepresentationFileForGraph(model, outputDirPath, modelIndex) {
    "use strict";
    var graphRepresentation = modelGraphConverter.convertGraphToDot(model);
    var index = modelIndex || 0;
    var graphRepresentationFilePath = outputDirPath + '/' + index + '.graph.dot';
    fs.writeFileSync(graphRepresentationFilePath, graphRepresentation);
    return graphRepresentationFilePath;
}

/**
 * Write the DOT format files representing computed Def-Use pairs
 * @param {Model} model
 * @param {string} outputDirPath
 * @param {number} [modelIndex]
 * @returns {string}
 * @memberof OutputWriter.prototype
 * @private
 */
function writeDOTRepresentationFileForDUpairs(model, outputDirPath, modelIndex) {
    "use strict";
    var dupairsRepresentation = modelGraphConverter.convertDUPairsToDot(model.dupairs);
    var index = modelIndex || 0;
    var dupairsRepresentationFilePath = outputDirPath + '/' + index + '.dupairs.dot';
    fs.writeFileSync(dupairsRepresentationFilePath, dupairsRepresentation);
    return dupairsRepresentationFilePath;
}

/**
 * Write image files from DOT formatted file with Graphviz tool
 * @param {string} dotFilePath
 */
function writeImageFileFromDotFile(dotFilePath) {
    "use strict";
    var imageFilePath = dotFilePath.replace('.dot', '.png');
    var graphvizDotToolCmd = 'dot';
    spawnSync(graphvizDotToolCmd, [dotFilePath, '-Tpng', '-o', imageFilePath]);
    return imageFilePath;
}

/**
 * Write the result files of intra-procedural analysis
 */
OutputWriter.prototype.writeIntraProceduralAnalysisResultFiles = function () {
    "use strict";
    var theOutputWriter = this;
    var pageScopeTrees = scopeCtrl.pageScopeTrees;
    pageScopeTrees.forEach(function (scopeTree, pageIndex) {
        var pageModels = modelCtrl.getPageModels(scopeTree);
        var intraProceduralModels = pageModels.intraProceduralModels;
        var modelGraphImageFilePaths = [];
        var modelDUPairImageFilePaths = [];
        intraProceduralModels.forEach(function (model, modelIndex) {
            var modelGraphOutputFilePath = writeDOTRepresentationFileForGraph(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTRA_PROCEDURAL_OUTPUTS_DIR,
                modelIndex
            );
            var modelDUPairsOutputFilePath = writeDOTRepresentationFileForDUpairs(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTRA_PROCEDURAL_OUTPUTS_DIR,
                modelIndex
            );
            modelGraphImageFilePaths.push(writeImageFileFromDotFile(modelGraphOutputFilePath));
            modelDUPairImageFilePaths.push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
        });
    });
};

/**
 * Write the result files of inter-procedural analysis
 */
OutputWriter.prototype.writeInterProceduralAnalysisResultFiles = function () {
    "use strict";
    var theOutputWriter = this;
    var pageScopeTrees = scopeCtrl.pageScopeTrees;
    pageScopeTrees.forEach(function (scopeTree, pageIndex) {
        var pageModels = modelCtrl.getPageModels(scopeTree);
        var interProceduralModels = pageModels.interProceduralModels;
        var modelGraphImageFilePaths = [];
        var modelDUPairImageFilePaths = [];
        interProceduralModels.forEach(function (model, modelIndex) {
            var modelGraphOutputFilePath = writeDOTRepresentationFileForGraph(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTER_PROCEDURAL_OUTPUTS_DIR,
                modelIndex
            );
            var modelDUPairsOutputFilePath = writeDOTRepresentationFileForDUpairs(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTER_PROCEDURAL_OUTPUTS_DIR,
                modelIndex
            );
            modelGraphImageFilePaths.push(writeImageFileFromDotFile(modelGraphOutputFilePath));
            modelDUPairImageFilePaths.push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
        });
    });
};

/**
 * Write the result files of intra-page analysis
 */
OutputWriter.prototype.writeIntraPageAnalysisResultFiles = function () {
    "use strict";
    var theOutputWriter = this;
    var pageScopeTrees = scopeCtrl.pageScopeTrees;
    pageScopeTrees.forEach(function (scopeTree, pageIndex) {
        var pageModels = modelCtrl.getPageModels(scopeTree);
        var intraPageModels = pageModels.intraPageModels;
        var modelGraphImageFilePaths = [];
        var modelDUPairImageFilePaths = [];
        intraPageModels.forEach(function (model, modelIndex) {
            var modelGraphOutputFilePath = writeDOTRepresentationFileForGraph(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTRA_PAGE_OUTPUTS_DIR,
                modelIndex
            );
            var modelDUPairsOutputFilePath = writeDOTRepresentationFileForDUpairs(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTRA_PAGE_OUTPUTS_DIR,
                modelIndex
            );
            modelGraphImageFilePaths.push(writeImageFileFromDotFile(modelGraphOutputFilePath));
            modelDUPairImageFilePaths.push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
        });
    });
};

/**
 * Write the result files of inter-page analysis
 */
OutputWriter.prototype.writeInterPageAnalysisResultFiles = function () {
    "use strict";
    var theOutputWriter = this;
    var interPageModel = modelCtrl.interPageModel;
    var modelGraphImageFilePaths = [];
    var modelDUPairImageFilePaths = [];
    var modelGraphOutputFilePath = writeDOTRepresentationFileForGraph(
        interPageModel,
        theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.INTER_PAGE_OUTPUTS_DIR
    );
    var modelDUPairsOutputFilePath = writeDOTRepresentationFileForDUpairs(
        interPageModel,
        theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.INTER_PAGE_OUTPUTS_DIR
    );
    modelGraphImageFilePaths.push(writeImageFileFromDotFile(modelGraphOutputFilePath));
    modelDUPairImageFilePaths.push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
};

var writer = new OutputWriter();
module.exports = writer;