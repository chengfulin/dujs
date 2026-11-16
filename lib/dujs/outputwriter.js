/*
 * Create output files and directories
 * @lastmodifiedBy ChengFuLin
 */
var fs = require('fs'),
    spawnSync = require('child_process').spawnSync;
var scopeCtrl = require('./scopectrl'),
    modelCtrl = require('./modelctrl'),
    modelGraphConverter = require('./graphics'),
    hierarchyDot = require('./hierarchydot');

/**
 * Name of the root output directory created by createRootOutputDirectory()
 * (null before it is created; specs/004-fix-remaining-issues contracts/cli.md §3)
 * @type {string|null}
 * @private
 */
var rootOutputDirectory = null;

/**
 * Base name of the root output directory, out-<YYYY>-<MM>-<DD>-<H>-<M>-<S>
 * @param {Date} time
 * @returns {string}
 * @private
 */
function getRootOutputDirectoryBaseName(time) {
    "use strict";
    // Build the name from date parts instead of toLocaleDateString(),
    // whose output depends on ICU/locale (e.g. "11/11/2026" on Node 24).
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'out-' + time.getFullYear() + '-' + pad(time.getMonth() + 1) + '-' + pad(time.getDate()) +
        '-' + time.getHours() + '-' + time.getMinutes() + '-' + time.getSeconds();
}

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
        _writeDOTRepresentationFileForHierarchy: writeDOTRepresentationFileForHierarchy,
        _writeImageFileFromDotFile: writeImageFileFromDotFile,
        _resetRootOutputDirectory: function () {
            rootOutputDirectory = null;
        }
    };
    /* end-test-block */
}

Object.defineProperties(OutputWriter.prototype, {
    /**
     * Directory name of the root directory of the output files: the name
     * created by createRootOutputDirectory(); reading it before throws
     * @type {string}
     * @memberof OutputWriter.prototype
     */
    ROOT_OUTPUT_DIR: {
        get: function () {
            'use strict';
            if (rootOutputDirectory === null) {
                throw new Error('the root output directory is not created yet');
            }
            return rootOutputDirectory;
        },
        enumerable: true
    },
    /**
     * Heading of the directory name of page outputs
     * @type {string}
     * @memeberof OutputWriter.prototype
     */
    PAGE_OUTPUT_DIR: {
        value: 'page',
        enumerable: true
    },
    /**
     * Directory name of the intra-procedural analysis outputs
     * @type {string}
     * @memberof OutputWriter.prototype
     */
    INTRA_PROCEDURAL_OUTPUTS_DIR: {
        value: 'intra-procedurals',
        enumeralbe: true
    },
    /**
     * Directory name of the inter-procedural analysis outputs
     * @type {string}
     * @memberof OutputWriter.prototype
     */
    INTER_PROCEDURAL_OUTPUTS_DIR: {
        value: 'inter-procedurals',
        enumerable: true
    },
    /**
     * Directory name of the intra-page analysis outputs
     * @type {string}
     * @memberof OutputWriter.prototype
     */
    INTRA_PAGE_OUTPUTS_DIR: {
        value: 'intra-pages',
        enumerable: true
    },
    /**
     * Directory name of the inter-page analysis outputs
     * @type {string}
     * @memberof OutputWriter.prototype
     */
    INTER_PAGE_OUTPUTS_DIR: {
        value: 'inter-page',
        enumerable: true
    },
    /**
     * Collection of intra-procedural graph image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    intraProceduralGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of intra-procedural def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    intraProceduralDUPairsImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-procedural graph image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    interProceduralGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-procedural def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    interProceduralDUPairsImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-procedural hierarchy graph image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    interProceduralHierarchyImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of intra-page graph image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    intraPageGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of intra-page def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    intraPageDUPairsmageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of intra-page hierarchy graph image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    intraPageHierarchyImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-page graph image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    interPageGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-page def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    interPageDUPairsImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-page hierarchy graph image file paths
     * @type {Array}
     * @memberof OutputWriter.prototype
     */
    interPageHierarchyImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * File paths for JS source of each page
     * @type {string}
     * @memberof OutputWriter.prototype
     */
    pageJSSourFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    }
});

/**
 * Create the root output directory in the current directory, named
 * out-<YYYY>-<MM>-<DD>-<H>-<M>-<S> by the start time; when the name exists,
 * <name>_1, <name>_2, ... in turn. mkdirSync (not recursive) fails with
 * EEXIST on an existing directory, also one created by a concurrent run, so
 * an existing directory is never reused (contracts/cli.md §3)
 * @param {Date} [startTime] Start time of the run (now by default)
 * @returns {string} Name of the created directory, also ROOT_OUTPUT_DIR
 */
OutputWriter.prototype.createRootOutputDirectory = function (startTime) {
    "use strict";
    var baseName = getRootOutputDirectoryBaseName(startTime || new Date());
    var name = baseName;
    for (var suffix = 1; ; ++suffix) {
        try {
            fs.mkdirSync(name);
            rootOutputDirectory = name;
            return name;
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
        name = baseName + '_' + suffix;
    }
};

/**
 * Create the output directories of a page under the root output directory
 * (created beforehand by createRootOutputDirectory())
 * @param {number} pageIndex
 */
OutputWriter.prototype.createOutputDirectories = function (pageIndex) {
    "use strict";
    var indexOfPageOutput = pageIndex || 0;
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
    var path = this.ROOT_OUTPUT_DIR + '/' + this.PAGE_OUTPUT_DIR + indexOfPage + '/' + 'src.js';
    fs.writeFileSync(path, content);
    this.pageJSSourFilePaths[indexOfPage] = path;
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
 * Write the DOT format file representing the hierarchy of an upper model
 * (specs/003-hierarchical-models contracts/hierarchy-output.md)
 * @param {Model} model
 * @param {string} outputDirPath
 * @param {number} [modelIndex]
 * @returns {string} File path of the hierarchy representation file
 * @memberof OutputWriter.prototype
 * @private
 */
function writeDOTRepresentationFileForHierarchy(model, outputDirPath, modelIndex) {
    "use strict";
    var hierarchyRepresentation = hierarchyDot.convertHierarchyToDot(model);
    var index = modelIndex || 0;
    var hierarchyRepresentationFilePath = outputDirPath + '/' + index + '.hierarchy.dot';
    fs.writeFileSync(hierarchyRepresentationFilePath, hierarchyRepresentation);
    return hierarchyRepresentationFilePath;
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
        theOutputWriter.intraProceduralGraphImageFilePaths[pageIndex] = [];
        theOutputWriter.intraProceduralDUPairsImageFilePaths[pageIndex] = [];

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
            theOutputWriter.intraProceduralGraphImageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelGraphOutputFilePath));
            theOutputWriter.intraProceduralDUPairsImageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
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
        theOutputWriter.interProceduralGraphImageFilePaths[pageIndex] = [];
        theOutputWriter.interProceduralDUPairsImageFilePaths[pageIndex] = [];
        theOutputWriter.interProceduralHierarchyImageFilePaths[pageIndex] = [];

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
            theOutputWriter.interProceduralGraphImageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelGraphOutputFilePath));
            theOutputWriter.interProceduralDUPairsImageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
            var modelHierarchyOutputFilePath = writeDOTRepresentationFileForHierarchy(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTER_PROCEDURAL_OUTPUTS_DIR,
                modelIndex
            );
            theOutputWriter.interProceduralHierarchyImageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelHierarchyOutputFilePath));
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
        theOutputWriter.intraPageGraphImageFilePaths[pageIndex] = [];
        theOutputWriter.intraPageDUPairsmageFilePaths[pageIndex] = [];
        theOutputWriter.intraPageHierarchyImageFilePaths[pageIndex] = [];

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
            theOutputWriter.intraPageGraphImageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelGraphOutputFilePath));
            theOutputWriter.intraPageDUPairsmageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
            var modelHierarchyOutputFilePath = writeDOTRepresentationFileForHierarchy(
                model,
                theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTRA_PAGE_OUTPUTS_DIR,
                modelIndex
            );
            theOutputWriter.intraPageHierarchyImageFilePaths[pageIndex].push(writeImageFileFromDotFile(modelHierarchyOutputFilePath));
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
    var modelGraphOutputFilePath = writeDOTRepresentationFileForGraph(
        interPageModel,
        theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.INTER_PAGE_OUTPUTS_DIR
    );
    var modelDUPairsOutputFilePath = writeDOTRepresentationFileForDUpairs(
        interPageModel,
        theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.INTER_PAGE_OUTPUTS_DIR
    );
    theOutputWriter.interPageGraphImageFilePaths.push(writeImageFileFromDotFile(modelGraphOutputFilePath));
    theOutputWriter.interPageDUPairsImageFilePaths.push(writeImageFileFromDotFile(modelDUPairsOutputFilePath));
    var modelHierarchyOutputFilePath = writeDOTRepresentationFileForHierarchy(
        interPageModel,
        theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.INTER_PAGE_OUTPUTS_DIR
    );
    theOutputWriter.interPageHierarchyImageFilePaths.push(writeImageFileFromDotFile(modelHierarchyOutputFilePath));
};

var writer = new OutputWriter();
module.exports = writer;