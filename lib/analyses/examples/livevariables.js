/*
 * Derived from analyses 0.2.1 (https://github.com/Swatinem/analyses), upstream lib/examples/livevariables.js
 * Original author: Arpad Borsos (Swatinem) <arpad.borsos@googlemail.com>
 * SPDX-License-Identifier: LGPL-3.0-only
 * Licensed under the GNU LGPL v3, see LICENSES/LGPL-3.0.txt and
 * LICENSES/GPL-3.0.txt. This file is NOT covered by the dujs MIT license.
 *
 * Modified by ChengFuLin (chengfulin0806@gmail.com):
 *   2015-04: read .outputs of the worklist() result
 * See THIRD_PARTY_NOTICES.md for details.
 */
var walkes = require('walkes');
var worklist = require('../');
var Set = require('../set');

module.exports = liveVariables;

function liveVariables(cfg) {
	return worklist(cfg, function (input) {
		if (this.type || !this.astNode)
			return input;
		var kill = this.kill = this.kill || findAssignments(this.astNode);
		var generate = this.generate = this.generate || findVariables(this.astNode);
		return Set.union(Set.minus(input, kill), generate);
	}, {direction: 'backward'}).outputs;
}

function findAssignments(astNode) {
	var variables = new Set();
	walkes(astNode, {
		AssignmentExpression: function (node, recurse) {
			if (node.left.type === 'Identifier')
				variables.add(node.left.name);
			recurse(node.right);
		},
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
		VariableDeclarator: function (node, recurse) {
			variables.add(node.id.name);
			if (node.init)
				recurse(node.init);
		}
	});
	return variables;
}
function findVariables(astNode) {
	var variables = new Set();
	walkes(astNode, {
		AssignmentExpression: function (node, recurse) {
			if (node.left.type !== 'Identifier')
				recurse(node.left);
			recurse(node.right);
		},
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
		Identifier: function (node) {
			variables.add(node.name);
		},
		MemberExpression: function (node, recurse) {
			recurse(node.object);
		},
		Property: function (node, recurse) {
			recurse(node.value);
		},
		VariableDeclarator: function (node, recurse) {
			recurse(node.init);
		}
	});
	return variables;
}

