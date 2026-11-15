/*
 * Test cases for labeled statements, with and debugger
 * (specs/001-fix-known-issues, User Story 1, FR-001 ~ FR-003)
 */
require('should');
var fs = require('fs'),
	os = require('os'),
	path = require('path'),
	childProcess = require('child_process'),
	analyze = require('../helpers/analyze'),
	jsParser = require('../../lib/dujs/jsparser'),
	cfgBuilder = require('../../lib/dujs/cfgbuilder');

function pairsOf(pairs, name) {
	'use strict';
	return pairs.filter(function (pair) {
		return pair.indexOf(name + ': ') === 0;
	});
}

/**
 * Build the CFG of the code and return all nodes of the CFG
 */
function cfgOf(code) {
	'use strict';
	cfgBuilder.resetGraphNodeCounter();
	var cfg = cfgBuilder.getCFG(jsParser.parseAST(code));
	return cfg[2];
}

function isUpdateOf(node, name) {
	'use strict';
	return !!node && !!node.astNode && node.astNode.type === 'UpdateExpression' &&
		node.astNode.argument.name === name;
}

function nestedLoops(jump) {
	'use strict';
	return [
		'var a = 0;',
		'outer: for (var i = 0; i < 2; i++) {',
		'  for (var j = 0; j < 2; j++) {',
		'    if (j) ' + jump + ';',
		'    a = 1;',
		'  }',
		'}',
		'console.log(a);'
	].join('\n');
}

/**
 * The decision node of `if (j)` (line 4) and its true target
 */
function targetOfJump(jump) {
	'use strict';
	var nodes = cfgOf(nestedLoops(jump));
	var decision = nodes.filter(function (node) {
		return node.line === 4 && !!node.true && !!node.false;
	});
	decision.length.should.eql(1);
	/// break/continue statements are not nodes of the CFG: the decision jumps to the target directly
	nodes.some(function (node) {
		return !!node.astNode && (node.astNode.type === 'BreakStatement' || node.astNode.type === 'ContinueStatement' ||
			node.astNode.type === 'LabeledStatement');
	}).should.eql(false);
	return decision[0].true;
}

describe('labeled statements, with and debugger', function () {
	'use strict';
	after(analyze.reset);

	// US1-1: a labeled expression statement is analyzed like the statement itself
	it('US1-1 should analyze a labeled expression statement', function () {
		var pairs = pairsOf(analyze([
			'var a = 1;',
			'l: a = 2;',
			'console.log(a);'
		].join('\n')).intraProcedural(), 'a');
		pairs.should.containEql('a: L2 -> L3');
		pairs.should.not.containEql('a: L1 -> L3');
	});

	// US1-2: break outer goes to the statement after the outer loop
	it('US1-2 should jump to the successor of the labeled loop on labeled break', function () {
		var pairs = pairsOf(analyze(nestedLoops('break outer')).intraProcedural(), 'a');
		pairs.should.containEql('a: L1 -> L8');
		pairs.should.containEql('a: L5 -> L8');
	});

	// US1-3: continue outer goes to the update i++ of the outer loop, not j++ of the inner loop
	it('US1-3 should jump to the update of the labeled loop on labeled continue', function () {
		var target = targetOfJump('continue outer');
		isUpdateOf(target, 'i').should.eql(true);
		isUpdateOf(target, 'j').should.eql(false);
		target.line.should.eql(2);
	});

	// US1-4: break l out of a labeled block
	it('US1-4 should jump to the successor of a labeled block on labeled break', function () {
		var pairs = pairsOf(analyze([
			'var a = 0, c = 1;',
			'l: {',
			'  if (c) break l;',
			'  a = 1;',
			'}',
			'console.log(a);'
		].join('\n')).intraProcedural(), 'a');
		pairs.should.containEql('a: L1 -> L6');
		pairs.should.containEql('a: L4 -> L6');
	});

	// US1-5: the object of with is a c-use; the body is analyzed
	it('US1-5 should analyze a with statement and use its object', function () {
		var pairs = analyze([
			'var o = {}, x = 1;',
			'with (o) {',
			'  console.log(x);',
			'  p = 1;',
			'}'
		].join('\n')).intraProcedural();
		pairs.should.containEql('o: L1 -> L2');
		pairs.should.containEql('x: L1 -> L3');
	});

	// US1-6: debugger is a plain statement
	it('US1-6 should analyze a debugger statement', function () {
		var pairs = analyze([
			'var a = 1;',
			'debugger;',
			'console.log(a);'
		].join('\n')).intraProcedural();
		pairs.should.containEql('a: L1 -> L3');
	});

	describe('unlabeled break/continue inside a labeled loop', function () {
		// edge case: an unlabeled break still leaves the innermost loop only
		it('should keep an unlabeled break to the innermost loop', function () {
			isUpdateOf(targetOfJump('break'), 'i').should.eql(true);
			var pairs = pairsOf(analyze(nestedLoops('break')).intraProcedural(), 'a');
			pairs.should.containEql('a: L1 -> L8');
			pairs.should.containEql('a: L5 -> L8');
		});

		// edge case: an unlabeled continue still goes to the update of the innermost loop
		it('should keep an unlabeled continue to the innermost loop', function () {
			var target = targetOfJump('continue');
			isUpdateOf(target, 'j').should.eql(true);
			target.line.should.eql(3);
		});
	});

	/// FR-002: the continue target of each kind of labeled loop
	describe('labeled continue to other kinds of loops', function () {
		function decisionOnLine(nodes, line) {
			var found = nodes.filter(function (node) {
				return node.line === line && !!node.true && !!node.false;
			});
			found.length.should.eql(1);
			return found[0];
		}

		it('should jump to the test of a labeled while loop', function () {
			var code = [
				'var a = 0, i = 0;',
				'outer: while (i < 2) {',
				'  i++;',
				'  for (var j = 0; j < 2; j++) {',
				'    if (j) continue outer;',
				'    a = 1;',
				'  }',
				'}',
				'console.log(a);'
			].join('\n');
			var target = decisionOnLine(cfgOf(code), 5).true;
			target.line.should.eql(2);
			target.astNode.type.should.eql('BinaryExpression');
			var pairs = pairsOf(analyze(code).intraProcedural(), 'a');
			pairs.should.containEql('a: L1 -> L9');
			pairs.should.containEql('a: L6 -> L9');
		});

		it('should jump to the loop node of a labeled for-in loop', function () {
			var code = [
				'var a = 0, o = {p: 1};',
				'outer: for (var k in o) {',
				'  for (var j = 0; j < 2; j++) {',
				'    if (j) continue outer;',
				'    a = 1;',
				'  }',
				'}',
				'console.log(a);'
			].join('\n');
			var target = decisionOnLine(cfgOf(code), 4).true;
			target.line.should.eql(2);
			target.astNode.type.should.eql('ForInStatement');
			var pairs = pairsOf(analyze(code).intraProcedural(), 'a');
			pairs.should.containEql('a: L1 -> L8');
			pairs.should.containEql('a: L5 -> L8');
		});
	});

	/// FR-001: only the object of with may throw from the with node
	describe('exception edges of a with node', function () {
		function withNode(code) {
			var found = cfgOf(code).filter(function (node) {
				return node.isWithObject;
			});
			found.length.should.eql(1);
			return found[0];
		}

		it('should not connect an exception edge when only the body may throw', function () {
			(!!withNode(['var o = {};', 'with (o) {', '  f();', '}'].join('\n')).exception).should.eql(false);
		});

		it('should connect an exception edge when the object may throw', function () {
			(!!withNode(['with (f()) {', '  g;', '}'].join('\n')).exception).should.eql(true);
		});
	});

	// US1-7: the CLI completes and writes the model outputs
	describe('CLI', function () {
		var tempDir;
		var programs = {
			labeled: 'var a = 1;\nl: a = 2;\nconsole.log(a);\n',
			with: 'var o = {}, x = 1;\nwith (o) {\n  console.log(x);\n  p = 1;\n}\n',
			debugger: 'var a = 1;\ndebugger;\nconsole.log(a);\n'
		};
		var cli = path.resolve(__dirname, '../../bin/dujs.js');

		before(function () {
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dujs-us1-'));
		});
		after(function () {
			fs.rmSync(tempDir, {recursive: true, force: true});
		});

		Object.keys(programs).forEach(function (name) {
			it('US1-7 should run the CLI on the ' + name + ' program', function () {
				this.timeout(20000);
				/// each program runs in its own directory: output directories are named by the second
				var runDir = path.join(tempDir, name);
				fs.mkdirSync(runDir);
				fs.writeFileSync(path.join(runDir, name + '.js'), programs[name]);
				var result = childProcess.spawnSync(process.execPath, [cli, '-js', name + '.js'],
					{cwd: runDir, encoding: 'utf8'});
				result.status.should.eql(0);
				result.stderr.should.eql('');
				var outDirs = fs.readdirSync(runDir).filter(function (entry) {
					return entry.indexOf('out-') === 0;
				});
				outDirs.length.should.eql(1);
				var outDir = path.join(runDir, outDirs[0]);
				/// intra-procedural, intra-page and inter-page models are written as .dot files;
				/// the inter-procedural directory is created, with no model when there is no function
				['page0/intra-procedurals', 'page0/intra-pages', 'inter-page'].forEach(function (dir) {
					fs.readdirSync(path.join(outDir, dir)).filter(function (file) {
						return /\.dot$/.test(file);
					}).length.should.be.above(0, dir + ' has no .dot file');
				});
				fs.existsSync(path.join(outDir, 'page0/inter-procedurals')).should.eql(true);
			});
		});
	});
});
