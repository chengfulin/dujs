/*
 * Command line interface of dujs (specs/004-fix-remaining-issues, FR-009,
 * FR-010, User Story 5, research R10, contracts/cli.md).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 *   dujs -js <file>... [-js <file>...]...
 *   dujs -h | --help
 *
 * The arguments are parsed by util.parseArgs: each argument before -- that is
 * exactly -js is mapped to --js first (-js is not a POSIX short option), then
 * the tokens are grouped in order: --js starts a page, a positional (also
 * after --) is a file of the current page. -h/--help before -- wins over any
 * other argument. All the files are read before the output directory is
 * created; an exception of the analysis or the writing removes the directory.
 * Exit status: 0 on success or help, 2 on a usage error, 1 on a failure.
 */
var fs = require('fs'),
    util = require('util');
var sourceReader = require('./sourcereader'),
    outputWriter = require('./outputwriter'),
    defuseAnalysisExecutor = require('./defuseanalysisexecutor');

/**
 * Usage text, printed by --help and after a usage error
 * @type {string}
 * @private
 */
var USAGE = [
    'Usage: dujs -js <file>... [-js <file>...]...',
    '       dujs -h | --help',
    '',
    'Analyze the def-use pairs of client-side JavaScript pages.',
    'Each -js starts a page; the files after it, up to the next -js, are combined',
    'into that page. The outputs are written to a new directory',
    'out-<date>-<time>[_<n>] in the current directory.',
    '',
    'Options:',
    '  -js <file>...  files of one page (repeat for more pages)',
    '  -h, --help     print this help and exit',
    '',
    'Example:',
    '  dujs -js lib.js app.js -js report.js',
    ''
].join('\n');

var EXIT_OK = 0,
    EXIT_FAILURE = 1,
    EXIT_USAGE = 2;

/**
 * Error of the command line arguments (exit status 2)
 * @param {string} message
 * @constructor
 * @private
 */
function UsageError(message) {
    'use strict';
    this.message = message;
}

/**
 * The arguments before --
 * @param {Array} argv
 * @returns {Array}
 * @private
 */
function argumentsBeforeTerminator(argv) {
    'use strict';
    var index = argv.indexOf('--');
    return index < 0 ? argv : argv.slice(0, index);
}

/**
 * Whether -h or --help appears before -- (help wins over any other argument,
 * also an unknown option that util.parseArgs would reject first)
 * @param {Array} argv
 * @returns {boolean}
 * @private
 */
function asksForHelp(argv) {
    'use strict';
    return argumentsBeforeTerminator(argv).some(function (arg) {
        return arg === '-h' || arg === '--help';
    });
}

/**
 * Parse the arguments into the file names of each page
 * @param {Array} argv
 * @returns {Array} Arrays of file names, one for each page
 * @throws {UsageError}
 * @private
 */
function parsePages(argv) {
    'use strict';
    var seenTerminator = false;
    var args = argv.map(function (arg) {
        if (arg === '--') {
            seenTerminator = true;
        }
        return (!seenTerminator && arg === '-js') ? '--js' : arg;
    });
    var parsed;
    try {
        parsed = util.parseArgs({
            args: args,
            options: {
                js: {type: 'boolean', multiple: true},
                help: {type: 'boolean', short: 'h'}
            },
            strict: true,
            allowPositionals: true,
            tokens: true
        });
    } catch (err) {
        throw new UsageError(err.message);
    }
    var pages = [];
    parsed.tokens.forEach(function (token) {
        if (token.kind === 'option' && token.name === 'js') {
            pages.push([]);
        } else if (token.kind === 'positional') {
            if (pages.length === 0) {
                throw new UsageError(token.value + ' is not after -js');
            }
            pages[pages.length - 1].push(token.value);
        }
    });
    if (pages.length === 0) {
        throw new UsageError('no page: give the files of each page after -js');
    }
    pages.forEach(function (files, pageIndex) {
        if (files.length === 0) {
            throw new UsageError('-js without files (page ' + pageIndex + ')');
        }
    });
    return pages;
}

/**
 * Reason of a file system error without the trailing ", <syscall> '<path>'"
 * (e.g. "ENOENT: no such file or directory")
 * @param {Error} err
 * @returns {string}
 * @private
 */
function reasonOfReadError(err) {
    'use strict';
    return String(err.message).replace(/, \w+ '.*'$/, '');
}

/**
 * Error of reading a source file (exit status 1)
 * @param {string} file
 * @param {Error} cause
 * @constructor
 * @private
 */
function ReadError(file, cause) {
    'use strict';
    this.message = 'cannot read ' + file + ': ' + reasonOfReadError(cause);
}

/**
 * Read the source of every page in order, stopping at the first failure.
 * The files are read one by one with sourceReader.getSourceFromFiles, whose
 * result for a page is the concatenation of those of its files, so the file
 * that fails is known (an EISDIR error has no path)
 * @param {Array} pages
 * @returns {Array} Combined source of each page
 * @throws {ReadError}
 * @private
 */
function readSourcesOfPages(pages) {
    'use strict';
    return pages.map(function (files) {
        return files.map(function (file) {
            try {
                return sourceReader.getSourceFromFiles([file]);
            } catch (err) {
                throw new ReadError(file, err);
            }
        }).join('');
    });
}

/**
 * Write the sources, run the analyses and write their outputs and the overview
 * into the created root output directory (the existing four stages)
 * @param {Array} sourceContents
 * @private
 */
function analyzeAndWrite(sourceContents) {
    'use strict';
    sourceContents.forEach(function (content, index) {
        outputWriter.createOutputDirectories(index);
        outputWriter.writeCombinedJSSource(content, index);
    });

    defuseAnalysisExecutor.initialize(sourceContents);
    defuseAnalysisExecutor.buildIntraProceduralModelsOfEachPageModels();
    outputWriter.writeIntraProceduralAnalysisResultFiles();

    defuseAnalysisExecutor.buildInterProceduralModelsOfEachPageModels();
    outputWriter.writeInterProceduralAnalysisResultFiles();

    defuseAnalysisExecutor.buildIntraPageModelsOfEachPageModels();
    outputWriter.writeIntraPageAnalysisResultFiles();

    defuseAnalysisExecutor.buildInterPageModelsOfEachPageModels();
    outputWriter.writeInterPageAnalysisResultFiles();

    outputWriter.writeOverview(sourceContents);
}

/**
 * Run the command line (contracts/cli.md §2). The output directory is created
 * in the current directory of the process (io.cwd is accepted for
 * information only)
 * @param {Array} argv Arguments without the node executable and the script
 * @param {Object} [io] {stdout, stderr, cwd}; process.stdout, process.stderr
 *     and process.cwd() by default
 * @returns {number} Exit status: 0 success or help, 1 failure, 2 usage error
 */
function run(argv, io) {
    'use strict';
    var startTime = new Date();
    var stdout = (io && io.stdout) || process.stdout,
        stderr = (io && io.stderr) || process.stderr;

    if (asksForHelp(argv)) {
        stdout.write(USAGE);
        return EXIT_OK;
    }
    var pages;
    try {
        pages = parsePages(argv);
    } catch (err) {
        if (!(err instanceof UsageError)) {
            throw err;
        }
        stderr.write('dujs: ' + err.message + '\n\n' + USAGE);
        return EXIT_USAGE;
    }

    var sourceContents;
    try {
        sourceContents = readSourcesOfPages(pages);
    } catch (err) {
        if (!(err instanceof ReadError)) {
            throw err;
        }
        stderr.write('dujs: ' + err.message + '\n');
        return EXIT_FAILURE;
    }

    var rootDirectory = null;
    try {
        rootDirectory = outputWriter.createRootOutputDirectory(startTime);
        analyzeAndWrite(sourceContents);
    } catch (err) {
        if (rootDirectory !== null) {
            try {
                fs.rmSync(rootDirectory, {recursive: true, force: true});
            } catch (ignored) {
                /// a failed cleanup does not change the reported failure
            }
        }
        stderr.write('dujs: analysis failed: ' + (err && err.message) + '\n');
        return EXIT_FAILURE;
    }
    return EXIT_OK;
}

module.exports = {
    run: run,
    USAGE: USAGE
};
