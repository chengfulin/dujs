/*
 * Derived from esgraph 0.1.1 (https://github.com/Swatinem/esgraph), upstream test runner
 * Original author: Arpad Borsos (Swatinem) <arpad.borsos@googlemail.com>
 * SPDX-License-Identifier: LGPL-3.0-only
 * Licensed under the GNU LGPL v3, see LICENSES/LGPL-3.0.txt and
 * LICENSES/GPL-3.0.txt. This file is NOT covered by the dujs MIT license.
 *
 * Modified by ChengFuLin (chengfulin0806@gmail.com):
 *   2015-05: run against the dujs fork in lib/esgraph
 *   2026-11-11: parse with lib/dujs/jsparser (espree) instead of esprima
 *   2026-11-18: test discriminantThrowTarget, throwTypes and the isInsideLoopBody export
 *     (specs/007-split-call-nodes T008)
 * See THIRD_PARTY_NOTICES.md for details.
 */
var esgraph = require('../../lib/esgraph');
var jsParser = require('../../lib/dujs/jsparser');
var fs = require('fs');
var should = require('should');
var FlowNode = require('../../lib/esgraph/flownode');

function createTest(dir, file) {
	'use strict';
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = jsParser.parseAST(contents, {comment: true, range: true});
	var comments = ast.comments;
	delete ast.comments;
	it(comments[0].value.trim() + ' (' + file + ')', function () {
		if (ast.body[0].type === 'FunctionDeclaration') {
			ast = ast.body[0].body;
		}
		var cfg = esgraph(ast);
		var expected = comments[1].value.trim();
		var actual = esgraph.dot(cfg, {source: contents}).trim();
		if (actual !== expected) {
			console.log(actual);
		}
		actual.should.eql(expected);
	});
}

describe('esgraph', function () {
	'use strict';
	var dir = __dirname + '/tests/';
	var files = fs.readdirSync(dir);
	files.forEach(function (file) {
		if(/.js$/.test(file)){
			createTest(dir, file);
		}
	});

	it('should handle long graphs', function () {
		var source = Array(1e4).join('stmt;');
		var ast = jsParser.parseAST(source);
		var cfg = esgraph(ast);
		esgraph.dot(cfg);
	});
});

describe('esgraph.dot', function () {
	'use strict';
	it('should number the nodes starting at `counter`', function () {
		var out = esgraph.dot(esgraph(jsParser.parseAST('var a;')), {counter: 10});
		out.should.not.containEql('n0');
		out.should.containEql('n10');
	});
});

/**
 * Parse a program with ranges and lines and build its CFG
 * @param {string} source
 * @returns {Array} [entry, exit, all nodes]
 */
function cfgOf(source) {
	'use strict';
	return esgraph(jsParser.parseAST(source, {range: true, loc: true}));
}

/**
 * Edges of a CFG as sorted strings "<from>-<type>-><to>" (indexes in the node list)
 * @param {Array} cfg
 * @returns {Array}
 */
function edgesOf(cfg) {
	'use strict';
	var nodes = cfg[2], edges = [];
	nodes.forEach(function (node) {
		FlowNode.CONNECTION_TYPES.forEach(function (type) {
			[].concat(node[type] || []).forEach(function (target) {
				edges.push(nodes.indexOf(node) + '-' + type + '->' + nodes.indexOf(target));
			});
		});
	});
	return edges.sort();
}

/**
 * Case nodes of a CFG whose case is the n-th case of its switch
 * @param {Array} cfg
 * @param {Function} filter (FlowNode) -> boolean
 * @returns {Array}
 */
function caseNodesOf(cfg, filter) {
	'use strict';
	return cfg[2].filter(function (node) {
		return !!node.astNode && node.astNode.type === 'SwitchCase' && (!filter || filter(node));
	});
}

function isFirstCase(node) {
	'use strict';
	return node.parent.cases[0] === node.astNode;
}

describe('esgraph discriminantThrowTarget (feature 007 R5, R13 L4)', function () {
	'use strict';
	it('should record the exit node at the first case of a switch out of try', function () {
		var cfg = cfgOf('switch (a) {\ncase 1:\n  x();\n  break;\ncase 2:\n  y();\n}');
		var first = caseNodesOf(cfg, isFirstCase);
		first.length.should.eql(1);
		first[0].discriminantThrowTarget.should.equal(cfg[1]);
		caseNodesOf(cfg, function (node) {
			return !isFirstCase(node);
		}).forEach(function (node) {
			should(node.discriminantThrowTarget).equal(null);
		});
	});

	it('should record the catch node at the first case of a switch in try', function () {
		var cfg = cfgOf('try {\n  switch (a) {\n  case 1:\n    x();\n  }\n} catch (e) {\n  z();\n}');
		var first = caseNodesOf(cfg, isFirstCase)[0];
		first.discriminantThrowTarget.astNode.type.should.eql('CatchClause');
	});

	it('should record the target of each nested switch', function () {
		var cfg = cfgOf([
			'switch (a) {',
			'case 1:',
			'  try {',
			'    switch (b) {',
			'    case 2:',
			'      y();',
			'    }',
			'  } catch (e) {',
			'    z();',
			'  }',
			'}'
		].join('\n'));
		var firsts = caseNodesOf(cfg, isFirstCase);
		firsts.length.should.eql(2);
		firsts.forEach(function (node) {
			if (node.astNode.test.value === 1) {
				node.discriminantThrowTarget.should.equal(cfg[1]);
			} else {
				node.discriminantThrowTarget.astNode.type.should.eql('CatchClause');
			}
		});
	});

	it('should copy the target to the split nodes of the discriminant (switch (a && b))', function () {
		var cfg = cfgOf('try {\n  switch (a && b) {\n  case 1:\n    x();\n  }\n} catch (e) {\n  z();\n}');
		var first = caseNodesOf(cfg, isFirstCase)[0],
			splits = cfg[2].filter(function (node) {
				return !!node.split && node.split.origin.type === 'SwitchStatement';
			});
		first.discriminantSplit.should.eql(true);
		splits.length.should.be.above(0);
		splits.forEach(function (node) {
			node.discriminantThrowTarget.should.equal(first.discriminantThrowTarget);
		});
		first.discriminantThrowTarget.astNode.type.should.eql('CatchClause');
	});

	it('should not add any edge', function () {
		var cfg = cfgOf('try { switch (a && b) { case 1: x(); break; case 2: switch (c) { case 3: y(); } } } ' +
			'catch (e) { z(); }');
		edgesOf(cfg).should.eql(['0-normal->1', '1-false->3', '1-true->2', '10-exception->6', '10-normal->5',
			'2-normal->3', '3-false->8', '3-true->4', '4-exception->6', '4-normal->5', '6-normal->7',
			'7-exception->5', '7-normal->5', '8-false->5', '8-true->9', '9-false->5', '9-true->10']);
		caseNodesOf(cfg).forEach(function (node) {
			should(node.exception).equal(null);
		});
	});

	it('should be copied by FlowNode.copyNodes (still the original target)', function () {
		var cfg = cfgOf('switch (a) {\ncase 1:\n  x();\n}');
		var first = caseNodesOf(cfg, isFirstCase)[0],
			copies = FlowNode.copyNodes(cfg[2]);
		copies.get(first).discriminantThrowTarget.should.equal(cfg[1]);
	});
});

describe('esgraph.throwTypes (feature 007 R6)', function () {
	'use strict';
	it('should list the node types that may throw', function () {
		esgraph.throwTypes.slice().sort().should.eql(['AssignmentExpression', 'BinaryExpression', 'CallExpression',
			'MemberExpression', 'NewExpression', 'UnaryExpression']);
	});

	it('should be a copy (changing it does not change the graphs)', function () {
		var exported = esgraph.throwTypes;
		exported.push('Identifier');
		try {
			var cfg = cfgOf('try {\n  a;\n} catch (e) {\n  z();\n}');
			cfg[2].filter(function (node) {
				return !!node.astNode && node.astNode.type === 'Identifier';
			}).forEach(function (node) {
				should(node.exception).equal(null);
			});
		} finally {
			exported.pop();
		}
	});
});

describe('branchsplitter exports (feature 007)', function () {
	'use strict';
	it('should export isInsideLoopBody', function () {
		var branchsplitter = require('../../lib/esgraph/branchsplitter');
		(typeof branchsplitter.isInsideLoopBody).should.eql('function');
		(typeof branchsplitter.split).should.eql('function');
	});
});
