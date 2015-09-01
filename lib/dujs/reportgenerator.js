/*
 * Generate analysis result report
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-09-01
 */
var fs = require('fs');
var outputWriter = require('./outputwriter');

/**
 * ReportGenerator
 * @constructor
 */
function ReportGenerator() {
}

/**
 * JS source content of a page in a report
 * @param {number} pageIndex
 * @returns {string}
 * @memberof ReportGenerator.prototype
 * @private
 */
function createSourceReportFromPage(pageIndex) {
    "use strict";
    var index = pageIndex || 0;
    var content = '<div class="row">' +
        '<h2>Source Code</h2>' +
        '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
        '<pre>';
    var source = fs.readFileSync(outputWriter.pageJSSourFilePaths[index]);
    content += source + '</pre></div></div>';
    return content;
}

/**
 * Create a part of report containing the result of intra-procedural analysis
 * @param {number} pageIndex
 * @returns {string}
 * @memberof ReportGenerator.prototype
 * @private
 */
function createIntraProceduralReportForAPage(pageIndex) {
    "use strict";
    var content = '';
    content += '<div class="row outputs intraProceduralOutputs"><h2>Intra-procedural</h2>';
    outputWriter.intraProceduralGraphImageFilePaths[pageIndex].forEach(function (output, fileIndex) {
        var dupairsOutput = outputWriter.intraProceduralDUPairsImageFilePaths[pageIndex][fileIndex];
        content += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="img-responsive center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="img-responsive center-block">' +
            '</div>';
    });
    content += '</div>';
    return content;
}

/**
 * Create a part of report containing the result of inter-procedural analysis
 * @param {number} pageIndex
 * @returns {string}
 * @memberof ReportGenerator.prototype
 * @private
 */
function createInterProceduralReportForAPage(pageIndex) {
    "use strict";
    var content = '';
    content += '<div class="row outputs interProceduralOutputs"><h2>Inter-procedural</h2>';
    outputWriter.interProceduralGraphImageFilePaths[pageIndex].forEach(function (output, fileIndex) {
        var dupairsOutput = outputWriter.interProceduralDUPairsImageFilePaths[pageIndex][fileIndex];
        content += '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
            '<img src="../' + output + '" class="img-responsive center-block">' +
            '</div>' +
            '<div class="col-lg-12 col-sm-12">' +
            '<img src="../' + dupairsOutput + '" class="center-block">' +
            '</div>';
    });
    content += '</div>';
    return content;
}

/**
 * Create a part of report containing the result of intra-page analysis
 * @param {number} pageIndex
 * @returns {string}
 * @memberof ReportGenerator.prototype
 * @private
 */
function createIntraPageReportForAPage(pageIndex) {
    "use strict";
    var content = '';
    content += '<div class="row outputs intraPageOutputs"><h2>Intra-page</h2>';
    outputWriter.intraPageGraphImageFilePaths[pageIndex].forEach(function (output, fileIndex) {
        var dupairsOutput = outputWriter.intraPageDUPairsmageFilePaths[pageIndex][fileIndex];
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

/**
 * Create a part of report containing the result of inter-page analysis
 * @param {number} pageIndex
 * @returns {string}
 * @memberof ReportGenerator.prototype
 * @private
 */
function createInterPageReportForAPage() {
    "use strict";
    var content = '';
    content += '<div class="row outputs interPageOutputs"><h2>Inter-page</h2>';
    outputWriter.interPageGraphImageFilePaths.forEach(function (output, fileIndex) {
        var dupairsOutput = outputWriter.interPageDUPairsImageFilePaths[fileIndex];
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

/**
 * Create a part of a report containing analysis result
 * @param {number} pageIndex
 * @returns {string}
 * @memberof ReportGenerator.prototype
 * @private
 */
function createPageAnalysisReportFromPage(pageIndex) {
    "use strict";
    var index = pageIndex || 0;
    var content = '<ul class="nav nav-tabs">' +
        '<li role="presentation"><a class="intraProceduralTab" href="#">Intra-procedural</a></li>'+
        '<li role="presentation"><a class="interProceduralTab" href="#">Inter-procedural</a></li>' +
        '<li role="presentation"><a class="intraPageTab" href="#">Intra-page</a></li>' +
        '<li role="presentation"><a class="interPageTab" href="#">Inter-page</a></li>' +
        '</ul>';

    content += createIntraProceduralReportForAPage(index);
    content += createInterProceduralReportForAPage(index);
    content += createIntraPageReportForAPage(index);
    content += createInterPageReportForAPage();
    return content;
}

/**
 * Create the mainly part of analysis report of a page
 * @param {number} pageIndex
 * @returns {string}
 * @memberof ReportGenerator.prototype
 * @private
 */
function createPageReport(pageIndex) {
    "use strict";
    var index = pageIndex || 0;
    var content = '<div id="page' + index + '" class="row page-result">' +
        '<div class="col-lg-12 col-sm-12">' +
        '<h2>Page ' + index + '</h2>';
    content += createSourceReportFromPage(index);
    content += createPageAnalysisReportFromPage(index);
    content += '</div></div>';
    return content;
}

/**
 * Create the report
 */
ReportGenerator.prototype.createReport = function () {
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
    var pageNumbers = outputWriter.pageJSSourFilePaths.length;
    for (pageIndex = 0; pageIndex < pageNumbers; ++pageIndex) {
        reportHTMLContent += '<li role="presentation"><a id="page'+ pageIndex +'ResultTab" href="#">Page ' + pageIndex + '</a></li>';
    }
    reportHTMLContent += '</ul>';

    for (pageIndex = 0; pageIndex < pageNumbers; ++pageIndex) {
        reportHTMLContent += createPageReport(pageIndex);
    }

    reportHTMLContent += '</div><script>';

    reportHTMLContent += '$(".page-result").hide();\n';
    for (pageIndex = 0; pageIndex < pageNumbers; ++pageIndex) {
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

    fs.writeFileSync(outputWriter.ROOT_OUTPUT_DIR + '/' + 'report.html', reportHTMLContent);
};

var generator = new ReportGenerator();
module.exports = generator;