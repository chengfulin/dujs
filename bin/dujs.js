/**
 * Created by ChengFuLin on 2015/5/7.
 */
var fs = require('fs'),
    async = require('async'),
    spawn = require('child_process').spawn,
    //open = require('open'),
    dujs = require('../lib/dujs'),
    graphics = require('../lib/dujs').graphics,
    GRAPHVIZ_DOT_CMD = 'dot',
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
    var source = '';

    /**
     * Callback for reading a file
     * @param err
     * @param data
     */
    function readFileCallback(err, data) {
        if (!!err) {
            callback(err, null);
        }
        data.forEach(function (content, index) {
            /// Add comments to separate source code from different files
            source += '/// --- start ' + files[index] + ' ---\n' + content + '\n/// --- end ' + files[index] + ' ---\n';
        });
        fs.writeFile(OUTPUT_DIR + '/' + 'src.js', source, function (err) {
            callback(err, source);
        });
    }

    async.map(files, fs.readFile, readFileCallback);
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
    var dotContent = graphics.analysisItemToCFG(analysisItem);
    var dotFile = dirPath + '/' + index + '.dot';
    var outputFile = dirPath + '/' + index + '.png';
    fs.writeFile(dotFile, dotContent, function (err) {
        if (!!err) {
            throw err;
        }
        spawn(GRAPHVIZ_DOT_CMD, [dotFile, '-Tpng', '-o', outputFile]);
    });
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
    analysisOutputs = dujs(data);
    analysisOutputs.intraProcedurals.forEach(function (item, index) {
        outputResultFiles(OUTPUT_DIR + '/' + INTRA_PROCEDURAL_OUTPUTS_DIR, item, index);
    });
    analysisOutputs.interProcedurals.forEach(function (item, index) {
        outputResultFiles(OUTPUT_DIR + '/' + INTER_PROCEDURAL_OUTPUTS_DIR, item, index);
    });
    analysisOutputs.intraPages.forEach(function (item, index) {
        outputResultFiles(OUTPUT_DIR + '/' + INTRA_PAGE_OUTPUTS_DIR, item, index);
    });
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
function checkeIntraPageOutputDirCallback(err) {
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
function checkeInterProceduralOutputDirCallback(err) {
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
function checkeIntraProceduralOutputDirCallback(err) {
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
function checkOutputDirCallback(err) {
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
    console.log(err.message);
}