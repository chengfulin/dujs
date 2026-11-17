/*
 * Tests of the LOOP matching of feature 005 (User Story 4, FR-007, research
 * R4, data-model §5, contracts/matching-output.md §2-§4): an event handler
 * entered from the LOOP NODE returns to the LOOP RETURN NODE only, and a
 * direct call of a handler returns to its call-site only. The LOOP RETURN
 * NODE gets OUT(LOOP) U the gen and exceptional of the summaries of the
 * handlers; the edge from the exit of a handler to the LOOP RETURN NODE
 * carries nothing.
 *
 * - US4-1 p5-loop-pair.js: x: L1 -> L6, no x: L7 -> L6; the LoopRecord and
 *   the record of the call of L5 are separate (model.loopRecords() and the
 *   loops of 0.matching.json of the CLI).
 * - US4-2 p6.js (guard, also after User Story 2): x: L9 -> L11, no x: L5 -> L11.
 * - US4-3 c-h12.js: x: L1 -> L6 and x: L3 -> L6.
 * - The GEN of a handler flows through the LOOP to the handler itself.
 * - Self consistency: every edge from a handler exit to a LOOP RETURN NODE is
 *   one handler of one LoopRecord (handlers registered twice are one handler).
 * - Ruling 1 of the implement phase (cyc-handler): the analysis does not
 *   throw. The handler h of cyc-handler (registered in n of a call cycle) has
 *   no call, so its summary maps to the graph and it does not fall back; the
 *   fallback of a handler with only an open model (its exit carries OUT to the
 *   LOOP RETURN NODE) is fixed by tests/dujs/reachingsolver.js, since the
 *   builder registers a closed model for every scope with calls.
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
	PROBES005 = path.join(__dirname, 'cases', 'probes005'),
	PROBES004 = path.join(__dirname, 'cases', 'probes004'),
	PROBES = path.join(__dirname, 'cases', 'probes');

/// fields of a LoopRecord and of its handlers (data-model §5)
var LOOP_FIELDS = ['loop', 'loopReturn', 'handlers', 'noHandler'],
	HANDLER_FIELDS = ['scope', 'entry', 'exit'],
	LOOP_KEYS = ['loop', 'loopReturn', 'handlers'];

/**
 * Analyze a program read from a file
 * @param {string} file
 * @returns {Object} the result of the analyze helper
 */
function analyzeFile(file) {
	'use strict';
	return analyze(fs.readFileSync(file, 'utf8'));
}

/**
 * Intra-page model of the page analyzed last
 * @param {Object} result
 * @returns {Model}
 */
function intraPageModelOf(result) {
	'use strict';
	return modelCtrl.collectionOfPageModels.get(result.scopeTree).intraPageModels[0];
}

/**
 * Last part of a full scope name ($DOMAIN.$PAGE_0.h -> h)
 * @param {Scope|string} scope
 * @returns {string}
 */
function lastPartOf(scope) {
	'use strict';
	return String(!!scope && !!scope.name ? scope.name : scope).split('.').pop();
}

/**
 * Whether there is a NORMAL edge from a node to another one
 * @param {FlowNode} source
 * @param {FlowNode} target
 * @returns {boolean}
 */
function hasNormalEdge(source, target) {
	'use strict';
	return [].concat(source[FlowNode.NORMAL_CONNECTION_TYPE] || []).indexOf(target) !== -1;
}

/**
 * Check every edge from a handler exit to a LOOP RETURN NODE of a model is
 * one handler of one LoopRecord, and every handler has that edge
 * @param {Model} model
 */
function shouldMatchHandlerExits(model) {
	'use strict';
	var records = model.loopRecords();
	records.forEach(function (record) {
		Object.keys(record).sort().should.eql(LOOP_FIELDS.slice().sort());
		Object.isFrozen(record).should.be.true();
		record.noHandler.should.eql(record.handlers.length === 0);
		var scopes = [];
		record.handlers.forEach(function (handler) {
			Object.keys(handler).sort().should.eql(HANDLER_FIELDS.slice().sort());
			scopes.indexOf(handler.scope).should.eql(-1);
			scopes.push(handler.scope);
			handler.entry.type.should.eql(FlowNode.ENTRY_NODE_TYPE);
			handler.exit.type.should.eql(FlowNode.EXIT_NODE_TYPE);
			(record.loop.onEvent.indexOf(handler.entry) !== -1).should.be.true();
			hasNormalEdge(handler.exit, record.loopReturn).should.be.true();
		});
	});
	model.graph[2].forEach(function (node) {
		if (node.type !== FlowNode.LOOP_RETURN_NODE_TYPE) {
			return;
		}
		var owners = records.filter(function (record) {
			return record.loopReturn === node;
		});
		owners.should.have.length(1);
		node.prev.forEach(function (source) {
			if (!hasNormalEdge(source, node)) {
				return;
			}
			owners[0].handlers.filter(function (handler) {
				return handler.exit === source;
			}).should.have.length(1);
		});
	});
}

/**
 * Run the CLI on a probe into a temporary directory
 * @param {string} file
 * @returns {Object} {dir, out} the temporary directory and the output directory
 */
function runCLI(file) {
	'use strict';
	var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-loopmatching-'));
	var run = childProcess.spawnSync(process.execPath,
		[path.join(ROOT, 'bin', 'dujs.js'), '-js', file],
		{cwd: dir, encoding: 'utf8'});
	run.status.should.eql(0, run.stderr);
	var outDirs = fs.readdirSync(dir).filter(function (name) {
		return name.indexOf('out-') === 0;
	});
	outDirs.should.have.length(1);
	return {dir: dir, out: path.join(dir, outDirs[0])};
}

describe('LOOP matching (feature 005, User Story 4)', function () {
	'use strict';
	afterEach(analyze.reset);

	describe('pairs', function () {
		/// US4-1: L7 x = 2 reaches the LOOP, enters h by the LOOP and returns to the LOOP only
		it('US4-1 should not return from a handler entered by the LOOP to its direct call-site (p5)', function () {
			var pairs = analyzeFile(path.join(PROBES005, 'p5-loop-pair.js')).intraPage();
			pairs.should.containEql('x: L1 -> L6');
			pairs.should.not.containEql('x: L7 -> L6');
		});

		/// US4-2: h2 reads x after its own x = 2 and the call of f
		it('US4-2 should keep the definition of the handler itself (p6)', function () {
			var pairs = analyzeFile(path.join(PROBES005, 'p6.js')).intraPage();
			pairs.should.containEql('x: L9 -> L11');
			pairs.should.not.containEql('x: L5 -> L11');
		});

		/// US4-3: the definition of h1 reaches h2 through the LOOP
		it('US4-3 should let the definitions of a handler reach another handler through the LOOP (c-h12)', function () {
			var pairs = analyzeFile(path.join(PROBES005, 'c-h12.js')).intraPage();
			pairs.should.containEql('x: L1 -> L6');
			pairs.should.containEql('x: L3 -> L6');
		});

		/// the GEN of a handler reaches the next run of the handler itself (research R4, P26)
		it('should let the definition of a handler reach its own next run', function () {
			var pairs = analyze([
				'var x = 0;',
				'function h() {',
				'  console.log(x);',
				'  x = 1;',
				'}',
				'document.addEventListener(\'click\', h);'
			].join('\n')).intraPage();
			pairs.should.containEql('x: L1 -> L3');
			pairs.should.containEql('x: L4 -> L3');
		});

		/// a definition reaching a direct call of a handler does not leak through the exit of the
		/// handler into the LOOP (research R4): t of k reaches g only through the direct call of h at
		/// L7, h returning to L7 and not to the LOOP (the exception paths of k end at its exit, where
		/// t goes out of scope)
		it('should not let a definition reaching a direct call of a handler into the LOOP', function () {
			var pairs = analyze([
				'function k() {',
				'  var t = 1;',
				'  function h() {}',
				'  function g() { console.log(t); }',
				'  document.addEventListener(\'click\', h);',
				'  document.addEventListener(\'keyup\', g);',
				'  h();',
				'  t = 2;',
				'}',
				'k();'
			].join('\n')).intraPage();
			pairs.should.containEql('h: entry -> L7');
			pairs.should.not.containEql('t: L2 -> L4');
		});

		/// the local variables of a handler do not leave it through the LOOP
		it('should not let a local variable of a handler out through the LOOP', function () {
			var pairs = analyze([
				'var x = 0;',
				'function h() {',
				'  var t = x;',
				'  x = t;',
				'}',
				'document.addEventListener(\'click\', h);'
			].join('\n')).intraPage();
			pairs.should.containEql('t: L3 -> L4');
			pairs.should.containEql('x: L4 -> L3');
			pairs.filter(function (pair) {
				return pair.indexOf('t: ') === 0;
			}).should.eql(['t: L3 -> L4']);
		});
	});

	describe('LoopRecord of the flat graph', function () {
		it('US4-1 should keep the LoopRecord apart from the record of the call of L5 (p5)', function () {
			var model = intraPageModelOf(analyzeFile(path.join(PROBES005, 'p5-loop-pair.js'))),
				loops = model.loopRecords(),
				calls = model.callSiteRecords();
			loops.should.have.length(1);
			loops[0].noHandler.should.be.false();
			loops[0].handlers.should.have.length(1);
			lastPartOf(loops[0].handlers[0].scope).should.eql('h');
			loops[0].loop.type.should.eql(FlowNode.LOOP_NODE_TYPE);
			loops[0].loopReturn.type.should.eql(FlowNode.LOOP_RETURN_NODE_TYPE);
			calls.should.have.length(1);
			calls[0].callSiteLine.should.eql(5);
			/// the same copies of the entry and the exit of h, matched by two records
			(calls[0].entry === loops[0].handlers[0].entry).should.be.true();
			(calls[0].exit === loops[0].handlers[0].exit).should.be.true();
			(calls[0].callReturn !== loops[0].loopReturn).should.be.true();
			shouldMatchHandlerExits(model);
		});

		it('should give one LoopRecord without a handler when the page has none', function () {
			var model = intraPageModelOf(analyze('var x = 0;\nconsole.log(x);')),
				loops = model.loopRecords();
			loops.should.have.length(1);
			loops[0].noHandler.should.be.true();
			loops[0].handlers.should.eql([]);
			(loops[0].loop.onEvent.indexOf(loops[0].loopReturn) !== -1).should.be.true();
			shouldMatchHandlerExits(model);
		});

		/// ruling 2 of the orchestrator: a handler registered twice is one handler of the record
		it('should match each handler exit to one handler, handlers registered twice once (a2, r8)', function () {
			['a2.js', 'r8.js'].forEach(function (name) {
				var result = analyzeFile(path.join(PROBES, name)),
					model = intraPageModelOf(result);
				model.loopRecords().should.have.length(1);
				shouldMatchHandlerExits(model);
				shouldMatchHandlerExits(modelCtrl.interPageModel);
				analyze.reset();
			});
		});

		it('should match the handlers of c-h12 and p6', function () {
			[['c-h12.js', ['h1', 'h2']], ['p6.js', ['h1', 'h2']]].forEach(function (each) {
				var model = intraPageModelOf(analyzeFile(path.join(PROBES005, each[0])));
				model.loopRecords()[0].handlers.map(function (handler) {
					return lastPartOf(handler.scope);
				}).should.eql(each[1]);
				shouldMatchHandlerExits(model);
				analyze.reset();
			});
		});

		it('should keep one LoopRecord per page in the inter-page model', function () {
			analyze(['var a = 0;\nfunction h() { a = 1; }\ndocument.addEventListener(\'click\', h);',
				'var b = 0;\nconsole.log(b);']);
			var records = modelCtrl.interPageModel.loopRecords();
			records.should.have.length(2);
			records[0].handlers.should.have.length(1);
			records[1].noHandler.should.be.true();
			shouldMatchHandlerExits(modelCtrl.interPageModel);
		});

		/// ruling 1 of the implement phase: the handler h of cyc-handler (registered in n of a call
		/// cycle) is analyzed without an error, by its summary (x = 5 of L3 reaches the LOOP)
		it('should analyze cyc-handler without an error', function () {
			var result = analyzeFile(path.join(PROBES004, 'cyc-handler.js')),
				model = intraPageModelOf(result),
				record = model.loopRecords()[0];
			record.handlers.map(function (handler) {
				return lastPartOf(handler.scope);
			}).should.eql(['h']);
			shouldMatchHandlerExits(model);
			model.analysisResultOf(record.loopReturn).reachIns.values().map(function (vardef) {
				return vardef.variable.name + '@L' + vardef.definition.fromNode.line;
			}).should.containEql('x@L3');
		});
	});

	describe('0.matching.json of the CLI', function () {
		var output;

		before(function () {
			this.timeout(60000);
			output = runCLI(path.join(PROBES005, 'p5-loop-pair.js'));
		});

		after(function () {
			if (!!output) {
				fs.rmSync(output.dir, {recursive: true, force: true});
			}
		});

		function read(relative) {
			return fs.readFileSync(path.join(output.out, relative), 'utf8');
		}

		it('US4-1 should write the LOOP record apart from the call of L5 (p5)', function () {
			var matching = JSON.parse(read(path.join('page0', 'intra-pages', '0.matching.json'))),
				dot = read(path.join('page0', 'intra-pages', '0.graph.dot'));
			matching.loops.should.have.length(1);
			var loop = matching.loops[0];
			Object.keys(loop).should.eql(LOOP_KEYS);
			loop.handlers.should.eql([{scope: '$DOMAIN.$PAGE_0.h', entry: matching.calls[0].entry,
				exit: matching.calls[0].exit}]);
			matching.calls.should.have.length(1);
			/// the CLI adds a header line before the program (src.js)
			matching.calls[0].callSiteLine.should.eql(6);
			loop.loopReturn.should.not.eql(matching.calls[0].callReturn);
			dot.should.match(new RegExp('^' + loop.loop + ' -> ' + loop.handlers[0].entry + ' \\[', 'm'));
			dot.should.match(new RegExp('^' + loop.handlers[0].exit + ' -> ' + loop.loopReturn + '( |$)', 'm'));
			dot.should.match(new RegExp('^' + loop.loopReturn + ' -> ' + loop.loop + ' \\[', 'm'));
			Object.keys(matching.summaries).should.containEql('$DOMAIN.$PAGE_0.h');
		});

		it('should write the LOOP record of the inter-page model', function () {
			var matching = JSON.parse(read(path.join('inter-page', '0.matching.json')));
			matching.loops.should.have.length(1);
			matching.loops[0].handlers.map(function (handler) {
				return handler.scope;
			}).should.eql(['$DOMAIN.$PAGE_0.h']);
		});

		it('should write no LOOP record for an inter-procedural model', function () {
			var matching = JSON.parse(read(path.join('page0', 'inter-procedurals', '0.matching.json')));
			matching.loops.should.eql([]);
		});
	});
});
