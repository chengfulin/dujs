/*
 * Create output files and directories
 * @lastmodifiedBy ChengFuLin
 */
var fs = require('fs'),
    spawnSync = require('child_process').spawnSync;
var scopeCtrl = require('./scopectrl'),
    modelCtrl = require('./modelctrl'),
    modelGraphConverter = require('./graphics'),
    hierarchyDot = require('./hierarchydot'),
    markdownOutput = require('./markdownoutput'),
    cfgGraphConverter = require('./cfggraphconverter'),
    summary = require('./summary');

/**
 * Format of the call matching files (feature 005 contracts/matching-output.md §2)
 * @type {string}
 * @private
 */
var MATCHING_FORMAT = 'dujs-matching/1';

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
        _writeImageFileFromDotFile: writeImageFileFromDotFile,
        _matchingOf: matchingOf,
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
};

/**
 * Write a DOT text to <n>.<kind>.dot
 * @param {string} dotText
 * @param {string} outputDirPath
 * @param {number} [modelIndex]
 * @param {string} kind graph, dupairs or hierarchy
 * @returns {string} File path of the DOT file
 * @private
 */
function writeDotFile(dotText, outputDirPath, modelIndex, kind) {
    "use strict";
    var index = modelIndex || 0;
    var dotFilePath = outputDirPath + '/' + index + '.' + kind + '.dot';
    fs.writeFileSync(dotFilePath, dotText);
    return dotFilePath;
}

/**
 * Write the DOT files of a model (<n>.graph.dot, <n>.dupairs.dot and, for an
 * upper model, <n>.hierarchy.dot) and keep their texts in memory for the
 * Markdown file (specs/009-mermaid-markdown-output contracts/model-markdown.md §1)
 * @param {Model} model
 * @param {boolean} withHierarchy
 * @param {string} outputDirPath
 * @param {number} [modelIndex]
 * @returns {{graphDot: string, dupairsDot: string, hierarchyDot: string|undefined,
 *     graphFilePath: string, dupairsFilePath: string, hierarchyFilePath: string|undefined}}
 * @private
 */
function writeDotFilesOf(model, withHierarchy, outputDirPath, modelIndex) {
    "use strict";
    var result = {
        graphDot: modelGraphConverter.convertGraphToDot(model),
        dupairsDot: modelGraphConverter.convertDUPairsToDot(model.dupairs)
    };
    result.graphFilePath = writeDotFile(result.graphDot, outputDirPath, modelIndex, 'graph');
    result.dupairsFilePath = writeDotFile(result.dupairsDot, outputDirPath, modelIndex, 'dupairs');
    if (withHierarchy) {
        result.hierarchyDot = hierarchyDot.convertHierarchyToDot(model);
        result.hierarchyFilePath = writeDotFile(result.hierarchyDot, outputDirPath, modelIndex, 'hierarchy');
    }
    return result;
}

/**
 * Write the Markdown file <n>.md of a model from the DOT texts of its .dot
 * files (UTF-8, LF; specs/009-mermaid-markdown-output contracts/model-markdown.md)
 * @param {Model} model
 * @param {string} level intraProcedural, interProcedural, intraPage or interPage
 * @param {{graphDot: string, hierarchyDot: string|undefined}} dots
 * @param {string} outputDirPath
 * @param {number} [modelIndex]
 * @returns {string} File path of the Markdown file
 * @private
 */
function writeModelMarkdownFile(model, level, dots, outputDirPath, modelIndex) {
    "use strict";
    var index = modelIndex || 0;
    var markdownFilePath = outputDirPath + '/' + index + '.md';
    var markdown = markdownOutput.modelMarkdown(model, level,
        {graphDot: dots.graphDot, hierarchyDot: dots.hierarchyDot}, index);
    fs.writeFileSync(markdownFilePath, markdown, 'utf8');
    return markdownFilePath;
}

/**
 * Number k of a node name n<k> (for sorting)
 * @param {string|null} nodeName
 * @returns {number}
 * @private
 */
function numberOfNodeName(nodeName) {
    "use strict";
    return (typeof nodeName === 'string') ? parseInt(nodeName.slice(1), 10) : -1;
}

/**
 * Compare two strings in code point order
 * @param {string} one
 * @param {string} another
 * @returns {number}
 * @private
 */
function compareStrings(one, another) {
    "use strict";
    if (one < another) {
        return -1;
    }
    return (one > another) ? 1 : 0;
}

/**
 * Name of a variable in the matching file (output only, no lookup)
 * @param {Var} variable
 * @returns {string}
 * @private
 */
function variableNameOf(variable) {
    "use strict";
    return variable.name;
}

/**
 * Full name of a scope in the matching file (output only, no lookup)
 * @param {Scope} scope
 * @returns {string}
 * @private
 */
function scopeNameOf(scope) {
    "use strict";
    return scope.name;
}

/**
 * Line of the first declaration of a variable (null when unknown)
 * @param {Var} variable
 * @returns {number|null}
 * @private
 */
function declarationLineOf(variable) {
    "use strict";
    var binding = variable.binding,
        declaration = (!!binding && binding.declarations.length > 0) ? binding.declarations[0] : null,
        located = !!declaration ? (declaration.identifier || declaration.node) : null;
    return (!!located && !!located.loc) ? located.loc.start.line : null;
}

/**
 * Names of the variables of a summary in the matching file: the name; when
 * different variables of the summary have the same name, the name with the
 * line of its declaration, x(L1) (contracts/matching-output.md §2)
 * @param {Object} theSummary
 * @returns {function} (Var) -> string
 * @private
 */
function variableNamerOf(theSummary) {
    "use strict";
    var variablesByName = new Map();
    function collect(variable) {
        var name = variableNameOf(variable);
        if (!variablesByName.has(name)) {
            variablesByName.set(name, []);
        }
        if (variablesByName.get(name).indexOf(variable) === -1) {
            variablesByName.get(name).push(variable);
        }
    }
    [theSummary.gen, theSummary.exceptional].forEach(function (vardefs) {
        vardefs.forEach(function (vardef) {
            collect(vardef.variable);
        });
    });
    [theSummary.mustKill, theSummary.upwardExposed].forEach(function (variables) {
        variables.forEach(collect);
    });
    return function (variable) {
        var name = variableNameOf(variable);
        if (variablesByName.get(name).length < 2) {
            return name;
        }
        var line = declarationLineOf(variable);
        return name + '(L' + (line === null ? '?' : line) + ')';
    };
}

/**
 * Summary of a callee in the matching file of a model: the definitions as
 * <variable>@<node of the definition in the graph> (contracts/matching-output.md §2)
 * @param {Object} theSummary
 * @param {Model} model
 * @param {Map} nodeIds Map(FlowNode, n<k>) of the graph
 * @returns {Object}
 * @private
 */
function summaryEntryOf(theSummary, model, nodeIds) {
    "use strict";
    var nameOf = variableNamerOf(theSummary);
    function definitionsOf(vardefs) {
        var named = [];
        vardefs.forEach(function (vardef) {
            var mapped = model.flatVarDefOf(vardef),
                node = !!mapped ? mapped.definition.fromNode : null,
                nodeName = (!!node && nodeIds.has(node)) ? nodeIds.get(node) : null;
            named.push({variable: nameOf(vardef.variable), node: nodeName});
        });
        return named.sort(function (one, another) {
            return (numberOfNodeName(one.node) - numberOfNodeName(another.node)) ||
                compareStrings(one.variable, another.variable);
        }).map(function (definition) {
            return definition.variable + '@' + (definition.node === null ? '?' : definition.node);
        });
    }
    function variablesOf(variables) {
        var names = [];
        variables.forEach(function (variable) {
            names.push(nameOf(variable));
        });
        return names.sort(compareStrings);
    }
    return {
        normalReturn: theSummary.normalReturn,
        conservative: theSummary.conservative,
        gen: definitionsOf(theSummary.gen),
        mustKill: variablesOf(theSummary.mustKill),
        upwardExposed: variablesOf(theSummary.upwardExposed),
        exceptional: definitionsOf(theSummary.exceptional)
    };
}

/**
 * Call matching information of a model with a hierarchy (feature 005 FR-010,
 * research R9, contracts/matching-output.md §2): the CallSiteRecords of its
 * calls, the LoopRecords of its LOOP NODEs (User Story 4, data-model §5) and the
 * summaries of its callees and handlers, the nodes named as in its .graph.dot.
 * @param {Model} model
 * @param {string} level interProcedural, intraPage or interPage
 * @returns {Object}
 * @private
 */
function matchingOf(model, level) {
    "use strict";
    var nodeIds = cfgGraphConverter.dotNodeIds(model),
        records = model.callSiteRecords().sort(function (one, another) {
            return one.seq - another.seq;
        }),
        callees = new Map();
    function nodeNameOf(node) {
        return (!!node && nodeIds.has(node)) ? nodeIds.get(node) : null;
    }
    var calls = records.map(function (record, index) {
        var calleeName = scopeNameOf(record.calleeScope);
        if (!callees.has(calleeName)) {
            callees.set(calleeName, record.calleeScope);
        }
        return {
            id: 'c' + (index + 1),
            seq: record.seq,
            callSiteLine: record.callSiteLine,
            callee: calleeName,
            callNode: nodeNameOf(record.callNode),
            entry: nodeNameOf(record.entry),
            exit: nodeNameOf(record.exit),
            callReturn: nodeNameOf(record.callReturn),
            exceptionalReturn: nodeNameOf(record.exceptionalReturn),
            back: !!record.back,
            beforeDecision: !!record.beforeDecision
        };
    });
    var loops = model.loopRecords().map(function (record) {
        return {
            loop: nodeNameOf(record.loop),
            loopReturn: nodeNameOf(record.loopReturn),
            handlers: record.handlers.map(function (handler) {
                var handlerName = scopeNameOf(handler.scope);
                if (!callees.has(handlerName)) {
                    callees.set(handlerName, handler.scope);
                }
                return {scope: handlerName, entry: nodeNameOf(handler.entry), exit: nodeNameOf(handler.exit)};
            }).sort(function (one, another) {
                return numberOfNodeName(one.entry) - numberOfNodeName(another.entry);
            })
        };
    }).sort(function (one, another) {
        return numberOfNodeName(one.loop) - numberOfNodeName(another.loop);
    });
    var summaries = {};
    Array.from(callees.keys()).sort(compareStrings).forEach(function (calleeName) {
        summaries[calleeName] = summaryEntryOf(summary.summaryOf(callees.get(calleeName)), model, nodeIds);
    });
    return {
        format: MATCHING_FORMAT,
        level: level,
        mainScope: scopeNameOf(model.mainlyRelatedScope),
        calls: calls,
        loops: loops,
        summaries: summaries
    };
}

/**
 * Write the call matching file of a model with a hierarchy, next to its
 * .graph.dot (feature 005 contracts/matching-output.md §1; no image)
 * @param {Model} model
 * @param {string} level interProcedural, intraPage or interPage
 * @param {string} outputDirPath
 * @param {number} [modelIndex]
 * @returns {string} File path of the matching file
 * @private
 */
function writeMatchingFile(model, level, outputDirPath, modelIndex) {
    "use strict";
    var index = modelIndex || 0;
    var matchingFilePath = outputDirPath + '/' + index + '.matching.json';
    fs.writeFileSync(matchingFilePath, JSON.stringify(matchingOf(model, level), null, 2) + '\n', 'utf8');
    return matchingFilePath;
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
        var outputDirPath = theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTRA_PROCEDURAL_OUTPUTS_DIR;
        theOutputWriter.intraProceduralGraphImageFilePaths[pageIndex] = [];
        theOutputWriter.intraProceduralDUPairsImageFilePaths[pageIndex] = [];

        intraProceduralModels.forEach(function (model, modelIndex) {
            var dots = writeDotFilesOf(model, false, outputDirPath, modelIndex);
            theOutputWriter.intraProceduralGraphImageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.graphFilePath));
            theOutputWriter.intraProceduralDUPairsImageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.dupairsFilePath));
            writeModelMarkdownFile(model, 'intraProcedural', dots, outputDirPath, modelIndex);
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
        var outputDirPath = theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTER_PROCEDURAL_OUTPUTS_DIR;
        theOutputWriter.interProceduralGraphImageFilePaths[pageIndex] = [];
        theOutputWriter.interProceduralDUPairsImageFilePaths[pageIndex] = [];
        theOutputWriter.interProceduralHierarchyImageFilePaths[pageIndex] = [];

        interProceduralModels.forEach(function (model, modelIndex) {
            var dots = writeDotFilesOf(model, true, outputDirPath, modelIndex);
            theOutputWriter.interProceduralGraphImageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.graphFilePath));
            theOutputWriter.interProceduralDUPairsImageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.dupairsFilePath));
            theOutputWriter.interProceduralHierarchyImageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.hierarchyFilePath));
            writeMatchingFile(model, 'interProcedural', outputDirPath, modelIndex);
            writeModelMarkdownFile(model, 'interProcedural', dots, outputDirPath, modelIndex);
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
        var outputDirPath = theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.PAGE_OUTPUT_DIR + pageIndex + '/' + theOutputWriter.INTRA_PAGE_OUTPUTS_DIR;
        theOutputWriter.intraPageGraphImageFilePaths[pageIndex] = [];
        theOutputWriter.intraPageDUPairsmageFilePaths[pageIndex] = [];
        theOutputWriter.intraPageHierarchyImageFilePaths[pageIndex] = [];

        intraPageModels.forEach(function (model, modelIndex) {
            var dots = writeDotFilesOf(model, true, outputDirPath, modelIndex);
            theOutputWriter.intraPageGraphImageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.graphFilePath));
            theOutputWriter.intraPageDUPairsmageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.dupairsFilePath));
            theOutputWriter.intraPageHierarchyImageFilePaths[pageIndex].push(writeImageFileFromDotFile(dots.hierarchyFilePath));
            writeMatchingFile(model, 'intraPage', outputDirPath, modelIndex);
            writeModelMarkdownFile(model, 'intraPage', dots, outputDirPath, modelIndex);
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
    var outputDirPath = theOutputWriter.ROOT_OUTPUT_DIR + '/' + theOutputWriter.INTER_PAGE_OUTPUTS_DIR;
    var dots = writeDotFilesOf(interPageModel, true, outputDirPath);
    theOutputWriter.interPageGraphImageFilePaths.push(writeImageFileFromDotFile(dots.graphFilePath));
    theOutputWriter.interPageDUPairsImageFilePaths.push(writeImageFileFromDotFile(dots.dupairsFilePath));
    theOutputWriter.interPageHierarchyImageFilePaths.push(writeImageFileFromDotFile(dots.hierarchyFilePath));
    writeMatchingFile(interPageModel, 'interPage', outputDirPath);
    writeModelMarkdownFile(interPageModel, 'interPage', dots, outputDirPath);
};

/**
 * Write the overview README.md into the root output directory
 * (specs/009-mermaid-markdown-output contracts/overview-readme.md, research
 * R7): the models are listed from the page scope trees and the inter-page
 * model, in the order and with the numbers of their files
 * @param {Array<string>} sourceContents Source code of each page
 * @returns {string} File path of the overview
 */
OutputWriter.prototype.writeOverview = function (sourceContents) {
    "use strict";
    var pages = scopeCtrl.pageScopeTrees.map(function (scopeTree, pageIndex) {
        var pageModels = modelCtrl.getPageModels(scopeTree);
        return {
            source: sourceContents[pageIndex],
            intraProceduralModels: pageModels.intraProceduralModels,
            interProceduralModels: pageModels.interProceduralModels,
            intraPageModels: pageModels.intraPageModels
        };
    });
    var overviewFilePath = this.ROOT_OUTPUT_DIR + '/README.md';
    fs.writeFileSync(overviewFilePath, markdownOutput.overviewMarkdown(pages, modelCtrl.interPageModel), 'utf8');
    return overviewFilePath;
};

var writer = new OutputWriter();
module.exports = writer;