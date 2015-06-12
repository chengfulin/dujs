/**
 * Created by ChengFuLin on 2015/5/7.
 */
var fs = require('fs'),
    open = require('open'),
    dujs = require('../lib/dujs'),
    filenames = [],
    sourceCode = '',
    analysisOutputs = null;

function getSourceFromFiles(files, callback) {
    "use strict";
    var source = '',
        currentFileName = '',
        readFileError = null;
    function readFileCallback(err, data) {
        if (!!err) { /// Failed
            readFileError = new Error('Failed to read the file: ' + currentFileName);
        } else { /// Succeed
            if (source !== '') {
                source += '\n';
            }
            source += data;
        }
    }

    if (typeof files === 'string') {
        currentFileName = files;
        fs.readFile(files, {encoding: 'utf8', flag: 'r'}, readFileCallback);
    } else if (files instanceof Array) {
        for (var index = 0; index < files.length; ++index) {
            if (!!readFileError) {
                break;
            }
            currentFileName = files[index];
            fs.readFile(currentFileName, {encoding: 'utf8', flag: 'r'}, readFileCallback);
        }
    } else {
        callback(new Error('Invalid input for method getSourceFromFiles'));
    }
    callback(readFileError, source);
}

process.argv.forEach(function (arg, index) {
    "use strict";
    if (index > 1) { /// as command line is "node bin/dujs.js [filename]"
        filenames.push(arg);
    }
});

function dujsCallback(err, outputs) {
    "use strict";
    if (!!err) {
        throw err;
    }
    analysisOutputs = outputs;
}

function getSourceCallback(err, data) {
    "use strict";
    if (!!err) {
        throw err;
    }
    sourceCode = data;
    dujs(sourceCode, dujsCallback);
}

getSourceFromFiles(filenames, getSourceCallback);