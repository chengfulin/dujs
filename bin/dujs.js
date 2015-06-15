/**
 * Created by ChengFuLin on 2015/5/7.
 */
var fs = require('fs'),
    open = require('open'),
    dujs = require('../lib/dujs'),
    graphics = require('../lib/dujs').graphics,
    OUTPUT_DIR = 'out',
    INTRA_PROCEDURAL_OUTPUTS_DIR = 'intra-procedurals',
    INTER_PROCEDURAL_OUTPUTS_DIR = 'inter-procedurals',
    INTRA_PAGE_OUTPUTS_DIR = 'intra-pages',
    filenames = [],
    sourceCode = '',
    analysisOutputs = null;

/**
 * Get source code from files
 * @param files
 * @param callback
 * @function
 */
function getSourceFromFiles(files, callback) {
    "use strict";
    var source = '',
        currentFileName = '',
        readFileError = null;

    /**
     * Callback for reading a file
     * @param err
     * @param data
     */
    function readFileCallback(err, data) {
        if (!!err) {
            /// On error, log the failed file's name
            readFileError = new Error('Failed to read the file: ' + currentFileName);
        } else {
            /// On success, concat source code from files
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

/**
 * Callback for read source code from files
 * @param err
 * @param data
 * @function
 */
function getSourceCallback(err, data) {
    "use strict";
    if (!!err) {
        throw err;
    }
    /// On success, do analysis
    sourceCode = data;
    analysisOutputs = dujs(sourceCode);
}

/**
 * Callback for make the directory for the output of intra-page analysis
 * @param err
 * @function
 */
function makeIntraPageOutputDirCallback(err) {
    "use strict";
    if (!!err) {
        throw err;
    }
}

/**
 * Check the directory for the output of intra-page analysis is existed
 * @param err
 * @param stats
 * @function
 */
function checkeIntraPageOutputDirCallback(err, stats) {
    "use strict";
    if (!!err) {
        fs.mkdir(OUTPUT_DIR + '/' + INTRA_PAGE_OUTPUTS_DIR, makeIntraPageOutputDirCallback);
    }
}

/**
 * Callback for make the directory for the output of inter-procedural analysis
 * @param err
 * @function
 */
function makeInterProceduralOutputDirCallback(err) {
    "use strict";
    if (!!err) {
        throw err;
    }
    fs.lstat(OUTPUT_DIR + '/' + INTRA_PAGE_OUTPUTS_DIR, checkeIntraPageOutputDirCallback);
}

/**
 * Check the directory for the output of inter-procedural analysis is existed
 * @param err
 * @param stats
 * @function
 */
function checkeInterProceduralOutputDirCallback(err, stats) {
    "use strict";
    if (!!err) {
        fs.mkdir(OUTPUT_DIR + '/' + INTER_PROCEDURAL_OUTPUTS_DIR, makeInterProceduralOutputDirCallback);
    }
}

/**
 * Callback for make the directory for the output of intra-procedural analysis
 * @param err
 * @function
 */
function makeIntraProceduralOutputDirCallback(err) {
    "use strict";
    if (!!err) {
        throw err;
    }
    fs.lstat(OUTPUT_DIR + '/' + INTER_PROCEDURAL_OUTPUTS_DIR, checkeInterProceduralOutputDirCallback);
}

/**
 * Check the directory for the output of intra-procedural analysis is existed
 * @param err
 * @param stats
 * @function
 */
function checkeIntraProceduralOutputDirCallback(err, stats) {
    "use strict";
    if (!!err) {
        fs.mkdir(OUTPUT_DIR + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR, makeIntraProceduralOutputDirCallback);
    }
}

/**
 * Callback for make the root directory for output
 * @param err
 * @function
 */
function makeOutputDirCallback(err) {
    "use strict";
    if (!!err) {
        throw err;
    }
    fs.lstat(OUTPUT_DIR + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR, checkeIntraProceduralOutputDirCallback);
}

/**
 * Check the root directory of output is existed
 * @param err
 * @param stats
 * @function
 */
function checkOutputDirCallback(err, stats) {
    "use strict";
    if (!!err) {
        fs.mkdir(OUTPUT_DIR, makeOutputDirCallback);
    }
}

/**
 * Create output directories
 */
function createOutputDirectories() {
    "use strict";
    fs.lstat(OUTPUT_DIR, checkOutputDirCallback);
}

//*********************************************************************************
/* Main */
try {
    /* Get user inputs */
    process.argv.forEach(function (arg, index) {
        "use strict";
        if (index > 1) { /// as command line is "node bin/dujs.js [filename]"
            filenames.push(arg);
        }
    });

    /* Create otuput directories */
    createOutputDirectories();

    /* Get source codes */
    getSourceFromFiles(filenames, getSourceCallback);

} catch(err) {
    console.log('Error');
}