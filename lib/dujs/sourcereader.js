/*
 * Reading source files
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-31
 */
var fs = require('fs');

/**
 * SourceReader
 * @constructor
 */
function SourceReader() {
}

/**
 * Read file content of a page from source files
 * @param {Array} files
 * @returns {string} Merged file content
 */
SourceReader.prototype.getSourceFromFiles = function (files) {
    "use strict";
    var source = '';
    files.forEach(function (filename) {
        var content = fs.readFileSync(filename);
        source += '/// --- start ' + filename + ' ---\n' + content + '\n/// --- end ' + filename + ' ---\n';
    });
    return source;
};

var reader = new SourceReader();
module.exports = reader;