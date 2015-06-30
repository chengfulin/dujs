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
    JS_FILES_FLAG = '-js',
    jsSourceFileNames = [],
    intraProceduralCFGOutputs = new Map(),
    interProceduralCFGOutputs = new Map(),
    intraPageCFGOutputs = new Map(),
    intraProceduralDUPairsOutputs = new Map(),
    interProceduralDUPairsOutputs = new Map(),
    intraPageDUPairsOutputs = new Map();

/**
 * Get source code from files
 * @param files
 * @param callback
 * @function
 */
function getSourceFromFiles(files) {
    "use strict";
    var source = '';
    files.forEach(function (filename) {
        var content = fs.readFileSync(filename);
        source += '/// --- start ' + filename + ' ---\n' + content + '\n/// --- end ' + filename + ' ---\n';
    });
    fs.writeFileSync(OUTPUT_DIR + '/' + 'src.js', source);
    return source;
}

/**
 * Output dot files and related image files for the graphs
 * @param dirPath
 * @param {AnalyzedCFG} analysisItem
 * @param {number} index
 * @private
 * @function
 */
function outputResultFiles(dirPath, analysisItem, index) {
    "use strict";
    var cfgContent = graphics.analysisItemToCFG(analysisItem),
        dupairsTable = graphics.dupairsToTable(analysisItem.dupairs);
    var dotCFG = dirPath + '/' + index + '.cfg.dot',
        dotDUPairs = dirPath + '/' + index + '.dupairs.dot';
    var outputCFG = dirPath + '/' + index + '.cfg.png',
        outputDUPairs = dirPath + '/' + index + '.dupairs.png';

    fs.writeFileSync(dotCFG, cfgContent);
    spawnSync(GRAPHVIZ_DOT_CMD, [dotCFG, '-Tpng', '-o', outputCFG]);
    fs.writeFileSync(dotDUPairs, dupairsTable);
    spawnSync(GRAPHVIZ_DOT_CMD, [dotDUPairs, '-Tpng', '-o', outputDUPairs]);

    if (dirPath.indexOf(INTRA_PROCEDURAL_OUTPUTS_DIR) !== -1) {
        if (!intraProceduralCFGOutputs.has(index)) {
            intraProceduralCFGOutputs.set(index, []);
        }
        intraProceduralCFGOutputs.set(index, intraProceduralCFGOutputs.get(index).concat(outputCFG));
        if (!intraProceduralDUPairsOutputs.has(index)) {
            intraProceduralDUPairsOutputs.set(index, []);
        }
        intraProceduralDUPairsOutputs.set(index, intraProceduralDUPairsOutputs.get(index).concat(outputDUPairs));
    } else if (dirPath.indexOf(INTER_PROCEDURAL_OUTPUTS_DIR) !== -1) {
        if (!interProceduralCFGOutputs.has(index)) {
            interProceduralCFGOutputs.set(index, []);
        }
        interProceduralCFGOutputs.set(index, interProceduralCFGOutputs.get(index).concat(outputCFG));
        if (!interProceduralDUPairsOutputs.has(index)) {
            interProceduralDUPairsOutputs.set(index, []);
        }
        interProceduralDUPairsOutputs.set(index, interProceduralDUPairsOutputs.get(index).concat(outputDUPairs));
    } else if (dirPath.indexOf(INTRA_PAGE_OUTPUTS_DIR) !== -1) {
        if (!intraPageCFGOutputs.has(index)) {
            intraPageCFGOutputs.set(index, []);
        }
        intraPageCFGOutputs.set(index, intraPageCFGOutputs.get(index).concat(outputCFG));
        if (!intraPageDUPairsOutputs.has(index)) {
            intraPageDUPairsOutputs.set(index, []);
        }
        intraPageDUPairsOutputs.set(index, intraPageDUPairsOutputs.get(index).concat(outputDUPairs));
    }

}

function doIntraProceduralAnalysis(source) {
    "use strict";
    var analysisOutputs = DUJS.doIntraProceduralAnalysis(source).intraProceduralAnalysisItems;
    analysisOutputs.forEach(function (item, index) {
        outputResultFiles(OUTPUT_DIR + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR, item, index);
    });
}

function doInterProceduralAnalysis(source) {
    "use strict";
    var analysisOutputs = DUJS.doInterProceduralAnalysis(source).interProceduralAnalysisItems;
    analysisOutputs.forEach(function (item, index) {
        outputResultFiles(OUTPUT_DIR + '/' + INTER_PROCEDURAL_OUTPUTS_DIR, item, index);
    });
}

function doIntraPageAnalysis(source) {
    "use strict";
    var analysisOutputs = DUJS.doIntraPageAnalysis(source).intraPageAnalysisItems;
    analysisOutputs.forEach(function (item, index) {
        outputResultFiles(OUTPUT_DIR + '/' + INTRA_PAGE_OUTPUTS_DIR, item, index);
    });
}

/**
 * Create output directories
 */
function createOutputDirectories() {
    "use strict";
    if (!fs.existsSync(OUTPUT_DIR)) { /// root
        fs.mkdirSync(OUTPUT_DIR);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR)) { /// intra-procedural outputs
        fs.mkdirSync(OUTPUT_DIR + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + INTER_PROCEDURAL_OUTPUTS_DIR)) { /// inter-procedural outputs
        fs.mkdirSync(OUTPUT_DIR + '/' + INTER_PROCEDURAL_OUTPUTS_DIR);
    }
    if (!fs.existsSync(OUTPUT_DIR + '/' + INTRA_PAGE_OUTPUTS_DIR)) { /// intra-page outputs
        fs.mkdirSync(OUTPUT_DIR + '/' + INTRA_PAGE_OUTPUTS_DIR);
    }
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
        '<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>' +
        '<script src="https://code.jquery.com/jquery-1.11.3.min.js"></script>' +
        '</head>' +
        '<div class="container-fluid">' +
        '<div class="row">' +
        '<h2>Source Code</h2>' +
        '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
        '<pre>';

    var source = fs.readFileSync(OUTPUT_DIR + '/src.js');
    reportHTMLContent += source + '</pre></div></div>';

    reportHTMLContent += '<ul class="nav nav-tabs">' +
        '<li role="presentation"><a id="intraProceduralTab" href="#">Intra-procedural</a></li>'+
        '<li role="presentation"><a id="interProceduralTab" href="#">Inter-procedural</a></li>' +
        '<li role="presentation"><a id="intraPageTab" href="#">Intra-page</a></li>' +
        '</ul>';

    reportHTMLContent += '<div id="intraProceduralOutputs" class="row outputs"><h2>Intra-procedural</h2>';
    intraProceduralCFGOutputs.forEach(function (output, key) {
        var dupairsOutput = intraProceduralDUPairsOutputs.get(key);
        reportHTMLContent += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="img-responsive center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="img-responsive center-block">' +
            '</div>';
    });
    reportHTMLContent += '</div>';

    reportHTMLContent += '<div id="interProceduralOutputs" class="row outputs"><h2>Inter-procedural</h2>';
    interProceduralCFGOutputs.forEach(function (output, key) {
        var dupairsOutput = interProceduralDUPairsOutputs.get(key);
        reportHTMLContent += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="img-responsive center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="img-responsive center-block">' +
            '</div>';
    });
    reportHTMLContent += '</div>';

    reportHTMLContent += '<div id="intraPageOutputs" class="row outputs"><h2>Intra-page</h2>';
    intraPageCFGOutputs.forEach(function (output, key) {
        var dupairsOutput = intraPageDUPairsOutputs.get(key);
        reportHTMLContent += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="img-responsive center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="img-responsive center-block">' +
            '</div>';
    });
    reportHTMLContent += '</div></div>';

    reportHTMLContent += '<script>' +
        '$(".outputs").hide();' +
        '$("#intraProceduralTab").click(function () {' +
        '$("#intraProceduralOutputs").show();' +
        '$("#interProceduralOutputs").hide();' +
        '$("#intraPageOutputs").hide();' +
        '});' +
        '$("#interProceduralTab").click(function () {' +
        '$("#intraProceduralOutputs").hide();' +
        '$("#interProceduralOutputs").show();' +
        '$("#intraPageOutputs").hide();' +
        '});' +
        '$("#intraPageTab").click(function () {' +
        '$("#intraProceduralOutputs").hide();' +
        '$("#interProceduralOutputs").hide();' +
        '$("#intraPageOutputs").show();' +
        '});' +
        '</script>' +
        '</html>';

    fs.writeFileSync(OUTPUT_DIR + '/' + 'report.html', reportHTMLContent);
}

/* Main */
try {
    var jsFilesIndex = process.argv.indexOf(JS_FILES_FLAG) + 1;
    jsSourceFileNames = process.argv.slice(jsFilesIndex);
    createOutputDirectories();
    var source = getSourceFromFiles(jsSourceFileNames);
    doIntraProceduralAnalysis(source);
    doInterProceduralAnalysis(source);
    doIntraPageAnalysis(source);
    createReport();

} catch(err) {
    throw err;
}