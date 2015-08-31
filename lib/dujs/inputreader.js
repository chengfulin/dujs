/*
 * Read input commands
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-08-31
 */

/**
 * InputReader
 * @constructor
 */
function InputReader() {
}

Object.defineProperties(InputReader.prototype, {
    /**
     * Command flag to specify JS file names
     * @type {string}
     * @memberof InputReader.prototype
     */
    JS_FILES_FLAG: {
        value: '-js',
        enumerable: true
    }
});

/**
 * Read input content to separate JS file names of different pages
 * @param {Array} argv
 * @returns {Array} Collections of JS file names
 */
InputReader.prototype.readInput = function (argv) {
    "use strict";
    var theInputReader = this;
    var indexesOfJSFiles = [];
    argv.forEach(function (arg, index) {
        if (arg === theInputReader.JS_FILES_FLAG) {
            indexesOfJSFiles.push(index);
        }
    });
    var collectionOfJSFileNames = [];
    indexesOfJSFiles.forEach(function (indexOfJSFiles, index) {
        if (index !== indexesOfJSFiles.length - 1 && (indexesOfJSFiles[index + 1] !== indexOfJSFiles + 1)) {
            collectionOfJSFileNames.push(argv.slice(indexOfJSFiles + 1, indexesOfJSFiles[index + 1]));
        } else {
            collectionOfJSFileNames.push(argv.slice(indexOfJSFiles + 1));
        }
    });
    return collectionOfJSFileNames;
};

var reader = new InputReader();
module.exports = reader;