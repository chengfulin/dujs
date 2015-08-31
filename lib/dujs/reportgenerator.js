/*
 * Generate analysis result report
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-31
 */
var fs = require('fs');

function ReportGenerator() {
}

/**
 *
 * @param {string} sourceFilePath
 * @returns {string}
 */
ReportGenerator.prototype.createSourceReportFromPage = function (sourceFilePath) {
    "use strict";
    var content = '<div class="row">' +
        '<h2>Source Code</h2>' +
        '<div class="col-lg-8 col-lg-offset-2 col-sm-12">' +
        '<pre>';
    var source = fs.readFileSync(sourceFilePath);
    content += source + '</pre></div></div>';
    return content;
};

