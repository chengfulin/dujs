/**
 * Created by ChengFuLin on 2015/5/7.
 */
var fs = require('fs'),
    spawnSync = require('child_process').spawnSync,
    //open = require('open'),
    DUJS = require('../lib/dujs'),
    graphics = require('../lib/dujs').graphics,
    Map = require('core-js/es6/map');

var GRAPHVIZ_DOT_CMD = 'dot',
    OUTPUT_DIR = 'out-' + (new Date()).toLocaleDateString() + '-' + (new Date()).getHours() + '-' + (new Date()).getMinutes() + '-' + (new Date()).getSeconds(),
    INTRA_PROCEDURAL_OUTPUTS_DIR = 'intra-procedurals',
    INTER_PROCEDURAL_OUTPUTS_DIR = 'inter-procedurals',
    INTRA_PAGE_OUTPUTS_DIR = 'intra-pages',
    INTER_PAGE_OUTPUTS_DIR = 'inter-page',
    PAGE_OUTPUT_DIR = 'page',
    JS_FILES_FLAG = '-js',
    jsSourceFileNames = [],
    pageOutputs = [];
    intraProceduralCFGOutputs = new Map(),
    interProceduralCFGOutputs = new Map(),
    intraPageCFGOutputs = new Map(),
    interPageCFGOutputs = new Map(),
    intraProceduralDUPairsOutputs = new Map(),
    interProceduralDUPairsOutputs = new Map(),
    intraPageDUPairsOutputs = new Map(),
    interPageDUPairsOutputs = new Map();

/**
 * Get source code from files
 * @param files
 * @param callback
 * @function
 */
function getSourceFromFiles(files, pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    var source = '';
    files.forEach(function (filename) {
        var content = fs.readFileSync(filename);
        source += '/// --- start ' + filename + ' ---\n' + content + '\n/// --- end ' + filename + ' ---\n';
    });
    fs.writeFileSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + 'src.js', source);
    return source;
}

function outputGraphFile(dirPath, analysisItem, index) {
    "use strict";
    var cfgContent = graphics.analysisItemToCFG(analysisItem);
    var dotCFG = dirPath + '/' + index + '.cfg.dot';
    var outputCFG = dirPath + '/' + index + '.cfg.png';
    fs.writeFileSync(dotCFG, cfgContent);
    spawnSync(GRAPHVIZ_DOT_CMD, [dotCFG, '-Tpng', '-o', outputCFG]);
    return outputCFG;
}

function outputDUPairsFile(dirPath, analysisItem, index) {
    "use strict";
    var dupairsTable = graphics.dupairsToTable(analysisItem.dupairs);
    var dotDUPairs = dirPath + '/' + index + '.dupairs.dot'
    var outputDUPairs = dirPath + '/' + index + '.dupairs.png';
    fs.writeFileSync(dotDUPairs, dupairsTable);
    spawnSync(GRAPHVIZ_DOT_CMD, [dotDUPairs, '-Tpng', '-o', outputDUPairs]);
    return outputDUPairs;
}

/**
 * Output dot files and related image files for the graphs
 * @param dirPath
 * @param {Model} analysisItem
 * @param {number} index
 * @private
 * @function
 */
function outputPageResultFiles(pageIndex, dirPath, analysisItem, index) {
    "use strict";
    var outputCFG = outputGraphFile(dirPath, analysisItem, index);
    var outputDUPairs = outputDUPairsFile(dirPath, analysisItem, index);

    var pageResultFiles = {
        intraProceduralCFGOutputs: new Map(),
        interProceduralCFGOutputs: new Map(),
        intraPageCFGOutputs: new Map(),
        interPageCFGOutputs: new Map(),
        intraProceduralDUPairsOutputs: new Map(),
        interProceduralDUPairsOutputs: new Map(),
        intraPageDUPairsOutputs: new Map(),
        interPageDUPairsOutputs: new Map(),
    };

    if (!pageOutputs[pageIndex]) {
        pageOutputs[pageIndex] = pageResultFiles;
    }

    if (dirPath.indexOf(INTRA_PROCEDURAL_OUTPUTS_DIR) !== -1) {
        if (!pageOutputs[pageIndex].intraProceduralCFGOutputs.has(index)) {
            pageOutputs[pageIndex].intraProceduralCFGOutputs.set(index, []);
        }
        pageOutputs[pageIndex].intraProceduralCFGOutputs.set(index, pageOutputs[pageIndex].intraProceduralCFGOutputs.get(index).concat(outputCFG));
        if (!pageOutputs[pageIndex].intraProceduralDUPairsOutputs.has(index)) {
            pageOutputs[pageIndex].intraProceduralDUPairsOutputs.set(index, []);
        }
        pageOutputs[pageIndex].intraProceduralDUPairsOutputs.set(index, pageOutputs[pageIndex].intraProceduralDUPairsOutputs.get(index).concat(outputDUPairs));
    } else if (dirPath.indexOf(INTER_PROCEDURAL_OUTPUTS_DIR) !== -1) {
        if (!pageOutputs[pageIndex].interProceduralCFGOutputs.has(index)) {
            pageOutputs[pageIndex].interProceduralCFGOutputs.set(index, []);
        }
        pageOutputs[pageIndex].interProceduralCFGOutputs.set(index, pageOutputs[pageIndex].interProceduralCFGOutputs.get(index).concat(outputCFG));
        if (!pageOutputs[pageIndex].interProceduralDUPairsOutputs.has(index)) {
            pageOutputs[pageIndex].interProceduralDUPairsOutputs.set(index, []);
        }
        pageOutputs[pageIndex].interProceduralDUPairsOutputs.set(index, pageOutputs[pageIndex].interProceduralDUPairsOutputs.get(index).concat(outputDUPairs));
    } else if (dirPath.indexOf(INTRA_PAGE_OUTPUTS_DIR) !== -1) {
        if (!pageOutputs[pageIndex].intraPageCFGOutputs.has(index)) {
            pageOutputs[pageIndex].intraPageCFGOutputs.set(index, []);
        }
        pageOutputs[pageIndex].intraPageCFGOutputs.set(index, pageOutputs[pageIndex].intraPageCFGOutputs.get(index).concat(outputCFG));
        if (!pageOutputs[pageIndex].intraPageDUPairsOutputs.has(index)) {
            pageOutputs[pageIndex].intraPageDUPairsOutputs.set(index, []);
        }
        pageOutputs[pageIndex].intraPageDUPairsOutputs.set(index, pageOutputs[pageIndex].intraPageDUPairsOutputs.get(index).concat(outputDUPairs));
    }
}

function outputInterPageResultFiles(dirPath, analysisItem, index) {
    "use strict";
    var outputCFG = outputGraphFile(dirPath, analysisItem, index);
    var outputDUPairs = outputDUPairsFile(dirPath, analysisItem, index);

    if (dirPath.indexOf(INTER_PAGE_OUTPUTS_DIR) !== -1) {
        pageOutputs.forEach(function (outputs) {
            if (!outputs.interPageCFGOutputs.has(index)) {
                outputs.interPageCFGOutputs.set(index, []);
            }
            outputs.interPageCFGOutputs.set(index, outputs.interPageCFGOutputs.get(index).concat(outputCFG));
            if (!outputs.interPageDUPairsOutputs.has(index)) {
                outputs.interPageDUPairsOutputs.set(index, []);
            }
            outputs.interPageDUPairsOutputs.set(index, outputs.interPageDUPairsOutputs.get(index).concat(outputDUPairs));
        });
    }
}

function doIntraProceduralAnalysis(source, pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    var analysisOutputs = DUJS.doIntraProceduralAnalysis(source).intraProceduralAnalysisItems;
    analysisOutputs.forEach(function (item, index) {
        outputPageResultFiles(pageIndex, OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR, item, index);
    });
}

function doInterProceduralAnalysis(source, pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    var analysisOutputs = DUJS.doInterProceduralAnalysis(source).interProceduralAnalysisItems;
    analysisOutputs.forEach(function (item, index) {
        outputPageResultFiles(pageIndex, OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTER_PROCEDURAL_OUTPUTS_DIR, item, index);
    });
}

function doIntraPageAnalysis(source, pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    var analysisOutputs = DUJS.doIntraPageAnalysis(source).intraPageAnalysisItems;
    analysisOutputs.forEach(function (item, index) {
        outputPageResultFiles(pageIndex, OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTRA_PAGE_OUTPUTS_DIR, item, index);
    });
}

function doInterPageAnalysis(sources) {
    "use strict";
    if (sources instanceof Array) {
        var analysisOutputs = DUJS.doInterPageAnalysis(sources).interPageModels;
        analysisOutputs.forEach(function (item, index) {
            outputInterPageResultFiles(OUTPUT_DIR + '/' + INTER_PAGE_OUTPUTS_DIR, item, index);
        });
    }
}

/**
 * Create output directories
 */
function createOutputDirectories(pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    if (!fs.existsSync(OUTPUT_DIR)) { /// root
        fs.mkdirSync(OUTPUT_DIR);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex)) {
        fs.mkdirSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR)) { /// intra-procedural outputs
        fs.mkdirSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTER_PROCEDURAL_OUTPUTS_DIR)) { /// inter-procedural outputs
        fs.mkdirSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTER_PROCEDURAL_OUTPUTS_DIR);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTRA_PAGE_OUTPUTS_DIR)) { /// intra-page outputs
        fs.mkdirSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/' + INTRA_PAGE_OUTPUTS_DIR);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + INTER_PAGE_OUTPUTS_DIR)) { /// inter-page outputs
        fs.mkdirSync(OUTPUT_DIR + '/' + INTER_PAGE_OUTPUTS_DIR);
    }
}

function createSourceReportFromPage(pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    var content = '<div class="row">' +
        '<h2>Source Code</h2>' +
        '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
        '<pre>';
    var source = fs.readFileSync(OUTPUT_DIR + '/' + PAGE_OUTPUT_DIR + pageIndex + '/src.js');
    content += source + '</pre></div></div>';
    return content;
}

function createPageAnalysisReportFromPage(pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    var content = '<ul class="nav nav-tabs">' +
        '<li role="presentation"><a class="intraProceduralTab" href="#">Intra-procedural</a></li>'+
        '<li role="presentation"><a class="interProceduralTab" href="#">Inter-procedural</a></li>' +
        '<li role="presentation"><a class="intraPageTab" href="#">Intra-page</a></li>' +
        '<li role="presentation"><a class="interPageTab" href="#">Inter-page</a></li>' +
        '</ul>';

    content += '<div class="row outputs intraProceduralOutputs"><h2>Intra-procedural</h2>';
    pageOutputs[pageIndex].intraProceduralCFGOutputs.forEach(function (output, key) {
        var dupairsOutput = pageOutputs[pageIndex].intraProceduralDUPairsOutputs.get(key);
        content += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="img-responsive center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="img-responsive center-block">' +
            '</div>';
    });
    content += '</div>';

    content += '<div class="row outputs interProceduralOutputs"><h2>Inter-procedural</h2>';
    pageOutputs[pageIndex].interProceduralCFGOutputs.forEach(function (output, key) {
        var dupairsOutput = pageOutputs[pageIndex].interProceduralDUPairsOutputs.get(key);
        content += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="img-responsive center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="center-block">' +
            '</div>';
    });
    content += '</div>';

    content += '<div class="row outputs intraPageOutputs"><h2>Intra-page</h2>';
    pageOutputs[pageIndex].intraPageCFGOutputs.forEach(function (output, key) {
        var dupairsOutput = pageOutputs[pageIndex].intraPageDUPairsOutputs.get(key);
        content += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="center-block">' +
            '</div>';
    });
    content += '</div>';

    content += '<div class="row outputs interPageOutputs"><h2>Inter-page</h2>';
    pageOutputs[pageIndex].interPageCFGOutputs.forEach(function (output, key) {
        var dupairsOutput = pageOutputs[pageIndex].interPageDUPairsOutputs.get(key);
        content += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="center-block">' +
            '</div>';
    });
    content += '</div>';
    return content;
}

function createPageReport(pageIndex) {
    "use strict";
    pageIndex = pageIndex || 0;
    var content = '<div id="page' + pageIndex + '" class="row page-result">' +
        '<div class="col-lg-12 col-sm-12">' +
        '<h2>Page ' + pageIndex + '</h2>';
    content += createSourceReportFromPage(pageIndex);
    content += createPageAnalysisReportFromPage(pageIndex);
    content += '</div></div>';
    return content;
}

function createReport() {
    "use strict";
    var reportHTMLContent = '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
        '<meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>dujs analysis result</title>' +
        '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">' +
        '<script src="https://code.jquery.com/jquery-1.11.3.min.js"></script>' +
        '<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>' +
        '</head>' +
        '<div class="container-fluid">';

    var pageIndex = 0;
    reportHTMLContent += '<ul class="nav nav-tabs">';
    for (pageIndex = 0; pageIndex < pageOutputs.length; ++pageIndex) {
        reportHTMLContent += '<li role="presentation"><a id="page'+ pageIndex +'ResultTab" href="#">Page ' + pageIndex + '</a></li>';
    }
    reportHTMLContent += '</ul>';

    for (pageIndex = 0; pageIndex < pageOutputs.length; ++pageIndex) {
        reportHTMLContent += createPageReport(pageIndex);
    }

    reportHTMLContent += '</div><script>';

    reportHTMLContent += '$(".page-result").hide();\n';
    for (pageIndex = 0; pageIndex < pageOutputs.length; ++pageIndex) {
        reportHTMLContent += '$("#page' + pageIndex + 'ResultTab").click(function () {\n' +
            '$(".page-result").hide();\n' +
            '$("#page' + pageIndex + '").show();\n' +
            '});\n';
    }

    reportHTMLContent += '$(".outputs").hide();\n' +
        '$(".intraProceduralTab").click(function () {\n' +
            '$(".intraProceduralOutputs").show();\n' +
            '$(".interProceduralOutputs").hide();\n' +
            '$(".intraPageOutputs").hide();\n' +
            '$(".interPageOutputs").hide();\n' +
        '});\n' +
        '$(".interProceduralTab").click(function () {\n' +
            '$(".intraProceduralOutputs").hide();\n' +
            '$(".interProceduralOutputs").show();\n' +
            '$(".intraPageOutputs").hide();\n' +
            '$(".interPageOutputs").hide();\n' +
        '});\n' +
        '$(".intraPageTab").click(function () {\n' +
            '$(".intraProceduralOutputs").hide();\n' +
            '$(".interProceduralOutputs").hide();\n' +
            '$(".intraPageOutputs").show();\n' +
            '$(".interPageOutputs").hide();\n' +
        '});\n' +
        '$(".interPageTab").click(function () {\n' +
            '$(".intraProceduralOutputs").hide();\n' +
            '$(".interProceduralOutputs").hide();\n' +
            '$(".intraPageOutputs").hide();\n' +
            '$(".interPageOutputs").show();\n' +
        '});\n' +
        '</script>';
    reportHTMLContent += '</html>';

    fs.writeFileSync(OUTPUT_DIR + '/' + 'report.html', reportHTMLContent);
}

/* Main */
try {
    var jsFilesIndexes = [];
    process.argv.forEach(function (arg, index) {
        "use strict";
        if (arg === JS_FILES_FLAG) {
            jsFilesIndexes.push(index);
        }
    });
    var pageSourceFileNames = [];
    jsFilesIndexes.forEach(function (jsIndex, index) {
        "use strict";
        if (index !== jsFilesIndexes.length - 1) {
            pageSourceFileNames.push(process.argv.slice(jsIndex + 1, jsFilesIndexes[index + 1]));
        } else {
            pageSourceFileNames.push(process.argv.slice(jsIndex + 1));
        }
    });

    var sourceFiles = [];
    for (var index = 0; index < pageSourceFileNames.length; ++index) {
        createOutputDirectories(index);
        sourceFiles.push(getSourceFromFiles(pageSourceFileNames[index], index));
    }

    sourceFiles.forEach(function (source, index) {
        "use strict";
        doIntraProceduralAnalysis(source, index);
        doInterProceduralAnalysis(source, index);
        doIntraPageAnalysis(source, index);
    });

    doInterPageAnalysis(sourceFiles);
    createReport();

} catch(err) {
    throw err;
}