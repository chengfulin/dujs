/**
 * Created by ChengFuLin on 2015/5/7.
 */

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

var inputReader = require('../lib/dujs/inputreader'),
    sourceReader = require('../lib/dujs/sourcereader'),
    outputWriter = require('../lib/dujs/outputwriter'),
    defuseAnalysisExecutor = require('../lib/dujs/defuseanalysisexecutor');

/* Main */
try {
    var jsFileNamesOfPages = inputReader.readInput(process.argv);
    var sourceContents = [];
    for (var index = 0; index < jsFileNamesOfPages.length; ++index) {
        var content = sourceReader.getSourceFromFiles(jsFileNamesOfPages[index]);
        outputWriter.createOutputDirectories(index);
        outputWriter.writeCombinedJSSource(content, index);
        sourceContents.push(content);
    }

    defuseAnalysisExecutor.initialize(sourceContents);
    defuseAnalysisExecutor.buildIntraProceduralModelsOfEachPageModels();
    outputWriter.writeIntraProceduralAnalysisResultFiles();

    defuseAnalysisExecutor.buildInterProceduralModelsOfEachPageModels();
    outputWriter.writeInterProceduralAnalysisResultFiles();

    defuseAnalysisExecutor.buildIntraPageModelsOfEachPageModels();
    outputWriter.writeIntraPageAnalysisResultFiles();

    defuseAnalysisExecutor.buildInterPageModelsOfEachPageModels();
    outputWriter.writeInterPageAnalysisResultFiles();
} catch(err) {
    console.error(err.message);
}