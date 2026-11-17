/*
 * Test helper run as a child process (tests/dujs/relaxedcallee.js, feature
 * 005 T103, FR-003): analyze the program read from the standard input and
 * print, as JSON, the last parts of the scope names of the handlers of the
 * event edges of the intra-page model and the pairs of x of the intra-page
 * model. A test spawning it with a timeout fails, rather than hangs, when the
 * search of the handlers never ends (a synchronous endless loop cannot be
 * stopped by the timeout of mocha).
 */
var modelCtrl = require('../../lib/dujs/modelctrl'),
	analyze = require('./analyze');

function main(source) {
	'use strict';
	var result = analyze(source);
	var handlers = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraPageModels[0].hierarchy.edges
		.filter(function (edge) {
			return edge.kind === 'event';
		})
		.map(function (edge) {
			return edge.handlerModel.mainlyRelatedScope.name.split('.').pop();
		});
	var pairsOfX = result.intraPage().filter(function (pair) {
		return /^x: /.test(pair);
	});
	process.stdout.write(JSON.stringify({handlers: handlers, pairsOfX: pairsOfX}));
}

main(require('fs').readFileSync(0, 'utf8'));
