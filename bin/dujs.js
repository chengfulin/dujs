/*
 * Main execution: run the command line (lib/dujs/cli.js) and exit with its
 * status (specs/004-fix-remaining-issues contracts/cli.md)
 * @lastmodifiedBy ChengFuLin
 */
process.exitCode = require('../lib/dujs/cli').run(process.argv.slice(2));
