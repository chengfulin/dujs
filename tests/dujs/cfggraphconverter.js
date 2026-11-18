/*
 * Test cases of the labels of call return nodes given by the CFG graph
 * converter (lib/dujs/cfggraphconverter.js; specs/004-fix-remaining-issues,
 * FR-011, User Story 6 #1, #2, research R9, contracts/output.md §1, KI §15).
 * Original dujs code, MIT License (see LICENSE).
 *
 * The call return of a split call site carries the branch path of the call
 * site: "callReturn (<line>:<path>)" with labeled line numbers (the CLI
 * default) and "callReturn (L<line>:C<col>:<path>)" with labeled line and
 * column. A call return with an empty path and every other node keep their
 * labels. Line numbers are those of the converted program (the CLI output
 * adds one line before the program).
 */
require('should');
var fs = require('fs'),
	path = require('path'),
	analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	converter = require('../../lib/dujs/cfggraphconverter');

var PROBES = path.join(__dirname, 'cases', 'probes004');

/**
 * The single inter-procedural model of the page of a program
 * @param {string} code
 * @returns {Object}
 */
function interProceduralModelOf(code) {
	'use strict';
	var result = analyze(code),
		models = modelCtrl.collectionOfPageModels.get(result.scopeTree).interProceduralModels;
	models.length.should.eql(1);
	return models[0];
}

/**
 * Convert the graph of a model and list the labels of its nodes
 * @param {Object} model
 * @param {string} method name of the converter method
 * @returns {Array} labels in node order
 */
function labelsOf(model, method) {
	'use strict';
	var dot = converter[method](model.graph);
	return model.graph[2].map(function (node) {
		dot.should.containEql('[label="' + node.label + '"');
		return node.label;
	});
}

describe('Labels of call return nodes (FR-011)', function () {
	'use strict';

	after(analyze.reset);

	describe('a split call site: us6-1.js, log(c ? a : b);', function () {
		var code = fs.readFileSync(path.join(PROBES, 'us6-1.js'), 'utf8');

		/// US6 #1, CLI default converter; feature 007 (FR-007, DECISION 005 Q1 A): the calls as well
		it('should label the calls and the call returns with line and branch path', function () {
			labelsOf(interProceduralModelOf(code), 'toDotWithLabelLine').should.eql([
				'entry_a', '1', '4', 'call (4:T)', 'entry_b', 'exit_a',
				'callReturn (4:T)', 'exit_b', 'call (4:F)', 'callReturn (4:F)'
			]);
		});

		/// US6 #1, converter with line and column
		it('should label the call returns with line, column and branch path', function () {
			labelsOf(interProceduralModelOf(code), 'toDotWithLabelLoc').should.eql([
				'entry (L1:C0)', 'L1:C0', 'L4:C0', 'call', 'entry (L2:C16)', 'exit (L2:C17)',
				'callReturn (L4:C0:T)', 'exit (L4:C1)', 'call', 'callReturn (L4:C0:F)'
			]);
		});

		/// US6 #1: the pairs do not change
		it('should keep the def-use pairs', function () {
			analyze.pairsOfModel(interProceduralModelOf(code)).should.eql([
				'a: L1 -> L4:T',
				'b: L1 -> L4:F',
				'c: L1 -> L4>L4:F',
				'c: L1 -> L4>L4:T',
				'log: entry -> L4:F',
				'log: entry -> L4:T'
			]);
		});
	});

	describe('call sites not split: f(); statements', function () {
		var code = 'function f() {\n}\nf();\nf();';

		/// feature 007 (FR-007, DECISION 005 Q1 A): a call and a call return are labeled with their line
		/// (no ':' for an empty path); other equal labels are deduplicated by _a, _b
		it('should label the calls and the call returns with their lines', function () {
			labelsOf(interProceduralModelOf(code), 'toDotWithLabelLine').should.eql([
				'entry_a', 'call (3)', 'entry_b', 'exit_a', 'callReturn (3)', 'call (4)', 'callReturn (4)', 'exit_b'
			]);
		});

		/// US6 #2: same labels as before with line and column
		it('should keep the labels with labeled line and column', function () {
			labelsOf(interProceduralModelOf(code), 'toDotWithLabelLoc').should.eql([
				'entry (L1:C0)', 'call', 'entry (L1:C13)', 'exit (L1:C14)', 'callReturn (L3:C0)',
				'call', 'callReturn (L4:C0)', 'exit (L4:C1)'
			]);
		});
	});

	describe('a split call site and a call site not split', function () {
		var code = 'var a = 1, b = 2, c = 0;\nfunction log(v) {\n}\nlog(c ? a : b);\nlog(a);';

		/// feature 007 (FR-007): the call return not split carries its line without a path
		it('should label only the call returns of the split call site with paths', function () {
			var labels = labelsOf(interProceduralModelOf(code), 'toDotWithLabelLine');
			labels.filter(function (label) {
				return label.indexOf('callReturn') === 0;
			}).sort().should.eql(['callReturn (4:F)', 'callReturn (4:T)', 'callReturn (5)']);
			labels.filter(function (label) {
				return label.indexOf('call ') === 0;
			}).sort().should.eql(['call (4:F)', 'call (4:T)', 'call (5)']);
		});

		it('should label only the call returns of the split call site with paths, with columns', function () {
			var labels = labelsOf(interProceduralModelOf(code), 'toDotWithLabelLoc');
			labels.filter(function (label) {
				return label.indexOf('callReturn') === 0;
			}).sort().should.eql(['callReturn (L4:C0:F)', 'callReturn (L4:C0:T)', 'callReturn (L5:C0)']);
		});
	});

	/// feature 007 (FR-007, DECISION 005 Q1 A): call sites on one line give equal labels, deduplicated by _a, _b
	describe('call sites on the same line', function () {
		var code = 'function f() {\n}\nf(); f();';

		it('should deduplicate the labels call (<line>) and callReturn (<line>) by _a, _b', function () {
			labelsOf(interProceduralModelOf(code), 'toDotWithLabelLine').should.eql([
				'entry_a', 'call (3)_a', 'entry_b', 'exit_a', 'callReturn (3)_a', 'call (3)_b', 'callReturn (3)_b', 'exit_b'
			]);
		});

		/// two call sites in one node (feature 007 User Story 2): the return of the first call is the call of
		/// the second one; every label carries the line of the node
		it('should label the call sites of one node with its line', function () {
			var labels = labelsOf(interProceduralModelOf('function f() {\n}\nvar y = f() + f();'), 'toDotWithLabelLine');
			labels.filter(function (label) {
				return /^call/.test(label);
			}).sort().should.eql(['call (3)_a', 'call (3)_b', 'callReturn (3)']);
		});
	});
});

/*
 * Names of the nodes in the dot output (feature 005, research R9): the
 * matching output names the nodes as the .graph.dot does
 */
describe('dotNodeIds (feature 005)', function () {
	'use strict';

	after(analyze.reset);

	var code = 'var a = 1;\nfunction f() {\na = 2;\n}\nf();\nf();';

	/**
	 * Node names declared in a dot output, in order
	 * @param {string} dot
	 * @returns {Array}
	 */
	function declaredNames(dot) {
		var names = [];
		dot.split('\n').forEach(function (line) {
			var matched = /^(n\d+) \[label=/.exec(line);
			if (!!matched) {
				names.push(matched[1]);
			}
		});
		return names;
	}

	it('should name each node n<k> with k from the cfgId of the first node and its index', function () {
		var model = interProceduralModelOf(code),
			ids = converter.dotNodeIds(model),
			first = model.graph[2][0].cfgId;
		ids.size.should.eql(model.graph[2].length);
		model.graph[2].forEach(function (node, index) {
			ids.get(node).should.eql('n' + (first + index));
		});
		converter.dotNodeIds(model.graph).should.eql(ids);
	});

	it('should name the nodes as every toDot method does', function () {
		var model = interProceduralModelOf(code),
			ids = converter.dotNodeIds(model),
			expected = model.graph[2].map(function (node) {
				return ids.get(node);
			});
		['toDot', 'toDotWithLabelLoc', 'toDotWithLabelLine', 'toDotWithLabelId'].forEach(function (method) {
			var dot = converter[method](model.graph);
			declaredNames(dot).should.eql(expected, method);
			/// the edges refer to the same names
			model.graph[2].forEach(function (node) {
				if (!!node.normal) {
					dot.should.containEql(ids.get(node) + ' -> ' + ids.get(node.normal) + ' []');
				}
			});
		});
	});

	it('should name a node listed twice by its first index (a handler listed twice)', function () {
		var result = analyze('function h() {\n}\nwindow.addEventListener("x", h);\nwindow.addEventListener("y", h);'),
			model = modelCtrl.collectionOfPageModels.get(result.scopeTree).intraPageModels[0],
			ids = converter.dotNodeIds(model),
			nodes = model.graph[2];
		nodes.forEach(function (node, index) {
			ids.get(node).should.eql('n' + (nodes[0].cfgId + nodes.indexOf(node)));
			index.should.be.aboveOrEqual(nodes.indexOf(node));
		});
	});
});
