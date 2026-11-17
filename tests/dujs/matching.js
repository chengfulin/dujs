/*
 * Tests of the call matching information of feature 005 (User Story 1
 * scenario 5, FR-010, research R9, contracts/matching-output.md §4): the
 * CallSiteRecord of each call of a flat graph (Model.callBypassOf) and the
 * *.matching.json written by the CLI next to the .graph.dot of each model
 * with a hierarchy.
 *
 * - p1.js: the two return edges from the exit of f go to the CALL RETURN
 *   NODEs of the calls of L4 and L7, one record each.
 * - us3-3.js: an exception of s leaves through the catch of L9 (the
 *   exceptionalReturn of the call of L8), not through its CALL RETURN NODE.
 * - Self consistency: every return edge to a call return of a graph is the
 *   (exit, callReturn) of exactly one record.
 *
 * The CLI analyzes the page with a header line (src.js), so the lines in its
 * output are one more than the lines of the probe.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	childProcess = require('child_process');
require('should');
var modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode'),
	analyze = require('../helpers/analyze');

var ROOT = path.join(__dirname, '..', '..'),
	PROBES005 = path.join(__dirname, 'cases', 'probes005');

/// fields of a CallSiteRecord (data-model §4)
var RECORD_FIELDS = ['callNode', 'callReturn', 'calleeScope', 'exceptionalReturn', 'entry', 'exit',
	'seq', 'back', 'beforeDecision', 'callSiteLine'];
/// key orders of the matching file (contracts/matching-output.md §2)
var FILE_KEYS = ['format', 'level', 'mainScope', 'calls', 'loops', 'summaries'],
	CALL_KEYS = ['id', 'seq', 'callSiteLine', 'callee', 'callNode', 'entry', 'exit', 'callReturn',
		'exceptionalReturn', 'back', 'beforeDecision'];

/**
 * Last part of a full scope name ($DOMAIN.$PAGE_0.f -> f)
 * @param {string} name
 * @returns {string}
 */
function lastPartOf(name) {
	'use strict';
	return name.split('.').pop();
}

/**
 * Analyze a probe
 * @param {string} probe file name
 * @returns {Object} the result of the analyze helper
 */
function analyzeProbe(probe) {
	'use strict';
	return analyze(fs.readFileSync(path.join(PROBES005, probe), 'utf8'));
}

/**
 * Inter-procedural model of the page
 * @param {Object} result
 * @returns {Model}
 */
function interProceduralModelOfPage(result) {
	'use strict';
	var found = modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels.filter(function (model) {
		return model.mainlyRelatedScope === result.scopeTree.root;
	});
	found.should.have.length(1);
	return found[0];
}

/**
 * Every model with a hierarchy of the page analyzed last
 * @param {Object} result
 * @returns {Array}
 */
function upperModelsOf(result) {
	'use strict';
	var pageModels = modelCtrl.collectionOfPageModels.get(result.scopeTree);
	return [].concat(pageModels.interProceduralModels, pageModels.intraPageModels, [modelCtrl.interPageModel])
		.filter(function (model) {
			return !!model && !!model.hierarchy;
		});
}

/**
 * Records of the calls of a model (one per CALL RETURN NODE of its graph)
 * @param {Model} model
 * @returns {Array}
 */
function recordsOf(model) {
	'use strict';
	var records = [];
	model.graph[2].forEach(function (node) {
		var record = model.callBypassOf(node);
		if (!!record && records.indexOf(record) === -1) {
			records.push(record);
		}
	});
	return records;
}

/**
 * Run the CLI on a probe into a temporary directory
 * @param {string} probe file name
 * @returns {Object} {dir, out} the temporary directory and the output directory
 */
function runCLI(probe) {
	'use strict';
	var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-matching-'));
	var run = childProcess.spawnSync(process.execPath,
		[path.join(ROOT, 'bin', 'dujs.js'), '-js', path.join(PROBES005, probe)],
		{cwd: dir, encoding: 'utf8'});
	run.status.should.eql(0, run.stderr);
	var outDirs = fs.readdirSync(dir).filter(function (name) {
		return name.indexOf('out-') === 0;
	});
	outDirs.should.have.length(1);
	return {dir: dir, out: path.join(dir, outDirs[0])};
}

/**
 * Node names (n<k>) of a .graph.dot
 * @param {string} dot
 * @returns {Array}
 */
function nodeNamesOfDot(dot) {
	'use strict';
	var names = [];
	dot.split('\n').forEach(function (line) {
		var matched = /^(n\d+) \[label=/.exec(line);
		if (!!matched) {
			names.push(matched[1]);
		}
	});
	return names;
}

describe('call matching (feature 005, User Story 1 scenario 5)', function () {
	'use strict';
	after(analyze.reset);

	describe('CallSiteRecord of the flat graph', function () {
		/// p1.js: f is called at L4 and L7
		it('should match each return edge from the exit of f to the record of its call (p1)', function () {
			var model = interProceduralModelOfPage(analyzeProbe('p1.js')),
				records = recordsOf(model);
			records.should.have.length(2);
			records.forEach(function (record) {
				RECORD_FIELDS.forEach(function (field) {
					record.should.have.property(field);
				});
				/// Scope.name is the full name ($DOMAIN.$PAGE_0.f): compare its last part
				lastPartOf(record.calleeScope.name).should.eql('f');
				record.back.should.be.false();
				record.beforeDecision.should.be.false();
				(model.graph[2].indexOf(record.entry) !== -1).should.be.true();
				(model.graph[2].indexOf(record.exit) !== -1).should.be.true();
			});
			(records[0].exit === records[1].exit).should.be.true();
			var exitOfF = records[0].exit;
			exitOfF.return.should.have.length(2);
			exitOfF.return.map(function (callReturn) {
				return model.callBypassOf(callReturn).callSiteLine;
			}).sort().should.eql([4, 7]);
			exitOfF.return.forEach(function (callReturn) {
				var record = model.callBypassOf(callReturn);
				(record.callReturn === callReturn).should.be.true();
				record.callNode.line.should.eql(record.callSiteLine);
				(record.callNode.call === record.entry).should.be.true();
			});
			(records[0].seq < records[1].seq).should.be.true();
		});

		/// us3-3.js: s is called at L8 in a try with a catch at L9
		it('should continue an exception of s at the catch of L9, not at the call return of L8 (us3-3)', function () {
			var model = interProceduralModelOfPage(analyzeProbe('us3-3.js')),
				records = recordsOf(model).filter(function (record) {
					return lastPartOf(record.calleeScope.name) === 's';
				});
			records.should.have.length(1);
			var record = records[0];
			record.callSiteLine.should.eql(8);
			FlowNode.isFlowNode(record.exceptionalReturn).should.be.true();
			(record.exceptionalReturn === record.callReturn).should.be.false();
			record.exceptionalReturn.line.should.eql(9);
			/// Q-a: the exception edge of the call statement stays at the CALL NODE
			(record.callNode.exception === record.exceptionalReturn).should.be.true();
			(record.callReturn.exception === null).should.be.true();
		});

		it('should map every return edge to a call return to exactly one record', function () {
			['p1.js', 'p2.js', 'us3-3.js', 'c-cyc3-cond.js', 'g5-mdn-person-field.js'].forEach(function (probe) {
				var result = analyzeProbe(probe);
				upperModelsOf(result).forEach(function (model) {
					var records = recordsOf(model);
					model.graph[2].forEach(function (node) {
						node.return.forEach(function (target) {
							if (target.type === FlowNode.LOOP_NODE_TYPE) {
								return;
							}
							records.filter(function (record) {
								return record.exit === node && record.callReturn === target;
							}).should.have.length(1, probe + ': return edge to ' + target);
						});
					});
				});
			});
		});
	});

	describe('*.matching.json of the CLI', function () {
		var output;

		before(function () {
			this.timeout(60000);
			output = runCLI('p1.js');
		});

		after(function () {
			if (!!output) {
				fs.rmSync(output.dir, {recursive: true, force: true});
			}
		});

		function read(relative) {
			return fs.readFileSync(path.join(output.out, relative), 'utf8');
		}

		it('should write the matching of the intra-page model in format dujs-matching/1', function () {
			var matching = JSON.parse(read(path.join('page0', 'intra-pages', '0.matching.json')));
			Object.keys(matching).should.eql(FILE_KEYS);
			matching.format.should.eql('dujs-matching/1');
			matching.level.should.eql('intraPage');
			matching.mainScope.should.eql('$DOMAIN.$PAGE_0');
			matching.calls.should.have.length(2);
			matching.calls.forEach(function (call) {
				Object.keys(call).should.eql(CALL_KEYS);
				call.callee.should.eql('$DOMAIN.$PAGE_0.f');
			});
			/// the CLI adds a header line before the program (src.js)
			matching.calls.map(function (call) {
				return call.callSiteLine;
			}).should.eql([5, 8]);
		});

		it('should name the nodes as the .graph.dot does', function () {
			var matching = JSON.parse(read(path.join('page0', 'intra-pages', '0.matching.json'))),
				names = nodeNamesOfDot(read(path.join('page0', 'intra-pages', '0.graph.dot'))),
				dot = read(path.join('page0', 'intra-pages', '0.graph.dot'));
			matching.calls.forEach(function (call) {
				['callNode', 'entry', 'exit', 'callReturn'].forEach(function (field) {
					names.should.containEql(call[field]);
				});
				dot.should.containEql(call.callNode + ' -> ' + call.entry + ' [color="blue", label = "call"]');
				dot.should.containEql(call.exit + ' -> ' + call.callReturn + ' [color="blue", label="return"]');
			});
		});

		it('should write the matching of every upper model and none of the intra-procedural models', function () {
			fs.existsSync(path.join(output.out, 'page0', 'inter-procedurals', '0.matching.json')).should.be.true();
			fs.existsSync(path.join(output.out, 'inter-page', '0.matching.json')).should.be.true();
			fs.readdirSync(path.join(output.out, 'page0', 'intra-procedurals')).filter(function (name) {
				return /\.matching\.json$/.test(name);
			}).should.eql([]);
		});

		/// the .dot differs from develop only by the exception edges moved by Q-a:
		/// no exception edge leaves a call return, the call nodes keep theirs
		it('should keep the exception edges of the calls at the call nodes in the .graph.dot', function () {
			var matching = JSON.parse(read(path.join('page0', 'intra-pages', '0.matching.json'))),
				dot = read(path.join('page0', 'intra-pages', '0.graph.dot'));
			matching.calls.forEach(function (call) {
				dot.should.not.match(new RegExp('^' + call.callReturn + ' -> n\\d+ \\[color="red", label="exception"\\]$', 'm'));
				dot.should.match(new RegExp('^' + call.callNode + ' -> n\\d+ \\[color="red", label="exception"\\]$', 'm'));
			});
		});
	});
});
