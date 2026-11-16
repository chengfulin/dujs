/*
 * Characterization tests of the AST rewriter (lib/esgraph/astrewriter.js):
 * the expected values record the behavior of the code before it was moved out
 * of lib/esgraph/branchsplitter.js (specs/002-small-refactors, US1). Only ASTs
 * are used; no CFG is built. Every case checks that the input AST is not
 * modified and that the subtrees off the copied paths are shared.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var subject = require('../../lib/esgraph/astrewriter'),
	finder = require('../../lib/esgraph/decisionfinder'),
	jsParser = require('../../lib/dujs/jsparser'),
	should = require('should');

var PLACEHOLDER_TYPE = 'DujsEvaluatedValue';

function statementOf(code) {
	'use strict';
	return jsParser.parseAST(code).body[0];
}

/**
 * Print the nodes used by the cases (copied nodes keep the original ranges,
 * so the source text cannot be sliced)
 */
function print(node) {
	'use strict';
	if (!node) {
		return '';
	}
	switch (node.type) {
		case PLACEHOLDER_TYPE:
			return '<' + node.known + '>';
		case 'Identifier':
			return node.name;
		case 'Literal':
			return node.raw;
		case 'ExpressionStatement':
			return print(node.expression) + ';';
		case 'VariableDeclaration':
			return node.kind + ' ' + node.declarations.map(print).join(', ') + ';';
		case 'VariableDeclarator':
			return print(node.id) + (node.init ? ' = ' + print(node.init) : '');
		case 'SequenceExpression':
			return '(' + node.expressions.map(print).join(', ') + ')';
		case 'BinaryExpression':
		case 'LogicalExpression':
		case 'AssignmentExpression':
			return '(' + print(node.left) + ' ' + node.operator + ' ' + print(node.right) + ')';
		case 'ConditionalExpression':
			return '(' + print(node.test) + ' ? ' + print(node.consequent) + ' : ' + print(node.alternate) + ')';
		case 'CallExpression':
			return print(node.callee) + '(' + node.arguments.map(print).join(', ') + ')';
		case 'MemberExpression':
			return print(node.object) + (node.computed ? '[' + print(node.property) + ']' : '.' + print(node.property));
		default:
			throw new Error('unexpected node type ' + node.type);
	}
}

/// run an operation on the AST and check that the AST is not modified
function unchanged(ast, operation) {
	'use strict';
	var snapshot = JSON.stringify(ast);
	var result = operation();
	JSON.stringify(ast).should.equal(snapshot);
	return result;
}

describe('astrewriter (characterization)', function () {
	'use strict';

	describe('placeholder', function () {
		['truthy', 'falsy', 'nonnull', 'unknown'].forEach(function (known) {
			it('records the known value ' + known + ' and the range/loc of the replaced node', function () {
				var replaced = statementOf('f();').expression;
				var created = unchanged(replaced, function () {
					return subject.placeholder(known, replaced);
				});
				Object.keys(created).sort().should.eql(['known', 'loc', 'range', 'type']);
				created.type.should.equal(PLACEHOLDER_TYPE);
				created.known.should.equal(known);
				created.range.should.equal(replaced.range);
				created.loc.should.equal(replaced.loc);
				finder.isPlaceholder(created).should.be.true();
			});
		});
	});

	describe('branchesOf', function () {
		function branches(code) {
			var split = statementOf(code).expression;
			return unchanged(split, function () {
				var result = subject.branchesOf(split);
				result.should.have.length(2);
				return {split: split, result: result, printed: result.map(print)};
			});
		}

		it('?: the consequent and the alternate', function () {
			var found = branches('c ? a : b;');
			found.result[0].should.equal(found.split.consequent);
			found.result[1].should.equal(found.split.alternate);
		});

		it('&&: the right operand, or falsy', function () {
			var found = branches('a && b;');
			found.result[0].should.equal(found.split.right);
			found.printed[1].should.equal('<falsy>');
			found.result[1].range.should.equal(found.split.range);
		});

		it('||: truthy, or the right operand', function () {
			var found = branches('a || b;');
			found.printed[0].should.equal('<truthy>');
			found.result[1].should.equal(found.split.right);
		});

		it('??: nonnull, or the right operand', function () {
			var found = branches('a ?? b;');
			found.printed[0].should.equal('<nonnull>');
			found.result[1].should.equal(found.split.right);
		});

		function checkAssignment(split, assignment) {
			Object.keys(assignment).sort().should.eql(['left', 'loc', 'operator', 'range', 'right', 'type']);
			assignment.type.should.equal('AssignmentExpression');
			assignment.operator.should.equal('=');
			assignment.left.should.equal(split.left);
			assignment.right.should.equal(split.right);
			assignment.range.should.equal(split.range);
			assignment.loc.should.equal(split.loc);
			assignment.should.not.equal(split);
		}

		it('&&=: a synthetic = assignment, or falsy', function () {
			var found = branches('o.p &&= v;');
			checkAssignment(found.split, found.result[0]);
			found.printed.should.eql(['(o.p = v)', '<falsy>']);
		});

		it('||=: truthy, or a synthetic = assignment', function () {
			var found = branches('o.p ||= v;');
			checkAssignment(found.split, found.result[1]);
			found.printed.should.eql(['<truthy>', '(o.p = v)']);
		});

		it('??=: nonnull, or a synthetic = assignment', function () {
			var found = branches('o.p ??= v;');
			checkAssignment(found.split, found.result[1]);
			found.printed.should.eql(['<nonnull>', '(o.p = v)']);
		});
	});

	describe('staticChoice', function () {
		function choice(code, known) {
			var split = statementOf(code).expression;
			var condition = (known === null) ? split.test || split.left : subject.placeholder(known, split);
			return unchanged(split, function () {
				var result = subject.staticChoice(split, condition);
				return (result === null) ? null : print(result);
			});
		}

		it('returns null when the condition is not a placeholder or is unknown', function () {
			should(choice('c ? a : b;', null)).be.null();
			should(choice('a && b;', null)).be.null();
			should(choice('c ? a : b;', 'unknown')).be.null();
			should(choice('a ?? b;', 'unknown')).be.null();
		});

		it('?: truthy and falsy select a branch, nonnull is undecided', function () {
			choice('c ? a : b;', 'truthy').should.equal('a');
			choice('c ? a : b;', 'falsy').should.equal('b');
			should(choice('c ? a : b;', 'nonnull')).be.null();
		});

		it('&& and ||: truthy and falsy select a branch, nonnull is undecided', function () {
			choice('a && b;', 'truthy').should.equal('b');
			choice('a && b;', 'falsy').should.equal('<falsy>');
			should(choice('a && b;', 'nonnull')).be.null();
			choice('a || b;', 'truthy').should.equal('<truthy>');
			choice('a || b;', 'falsy').should.equal('b');
			should(choice('a || b;', 'nonnull')).be.null();
		});

		it('&&= and ||=: the assigning branch is a synthetic = assignment', function () {
			choice('o.p &&= v;', 'truthy').should.equal('(o.p = v)');
			choice('o.p &&= v;', 'falsy').should.equal('<falsy>');
			choice('o.p ||= v;', 'truthy').should.equal('<truthy>');
			choice('o.p ||= v;', 'falsy').should.equal('(o.p = v)');
			should(choice('o.p ||= v;', 'nonnull')).be.null();
		});

		it('?? and ??=: a truthy or non-null left operand is the value, falsy is undecided', function () {
			choice('a ?? b;', 'truthy').should.equal('<truthy>');
			choice('a ?? b;', 'nonnull').should.equal('<nonnull>');
			should(choice('a ?? b;', 'falsy')).be.null();
			choice('o.p ??= v;', 'truthy').should.equal('<truthy>');
			choice('o.p ??= v;', 'nonnull').should.equal('<nonnull>');
			should(choice('o.p ??= v;', 'falsy')).be.null();
		});

		it('?? and ??=: the placeholder replaces the whole split', function () {
			var split = statementOf('a ?? b;').expression;
			var result = subject.staticChoice(split, subject.placeholder('nonnull', split.left));
			result.range.should.equal(split.range);
		});
	});

	describe('rewrite', function () {
		it('copies the path to a replaced node and shares the other subtrees', function () {
			var root = statementOf('x = f(c ? a : b) + y;');
			var plus = root.expression.right,
				call = plus.left,
				split = call.arguments[0];
			var copy = unchanged(root, function () {
				return subject.rewrite(root, [[root, root.expression, plus, call, split]],
					new Map([[split, split.consequent]]), []);
			});
			print(copy).should.equal('(x = (f(a) + y));');
			copy.should.not.equal(root);
			copy.expression.should.not.equal(root.expression);
			copy.expression.right.should.not.equal(plus);
			copy.expression.right.left.should.not.equal(call);
			copy.expression.right.left.arguments.should.not.equal(call.arguments);
			copy.expression.left.should.equal(root.expression.left);
			copy.expression.right.right.should.equal(plus.right);
			copy.expression.right.left.callee.should.equal(call.callee);
			copy.expression.right.left.arguments[0].should.equal(split.consequent);
			copy.range.should.equal(root.range);
			copy.loc.should.equal(root.loc);
		});

		it('returns the root itself when nothing is on a path', function () {
			var root = statementOf('x = y;');
			unchanged(root, function () {
				return subject.rewrite(root, [], new Map(), []);
			}).should.equal(root);
		});

		it('replaces the root itself', function () {
			var root = statementOf('x;'), replacement = {type: 'Identifier', name: 'z'};
			subject.rewrite(root, [[root]], new Map([[root, replacement]]), []).should.equal(replacement);
		});

		it('keeps the non-enumerable properties of the copied nodes', function () {
			var root = statementOf('x = c ? a : b;');
			Object.defineProperty(root, 'cache', {value: 'kept', enumerable: false, writable: true});
			var split = root.expression.right;
			var copy = subject.rewrite(root, [[root, root.expression, split]], new Map([[split, split.alternate]]), []);
			copy.cache.should.equal('kept');
			Object.keys(copy).should.not.containEql('cache');
			print(copy).should.equal('(x = b);');
		});
	});

	describe('branchRoot', function () {
		function both(code) {
			var root = statementOf(code);
			var decision = finder.findFirstDecision(root);
			var branches = subject.branchesOf(decision.split);
			return unchanged(root, function () {
				var trueRoot = subject.branchRoot(root, decision, branches[0]),
					falseRoot = subject.branchRoot(root, decision, branches[1]);
				return {root: root, trueRoot: trueRoot, falseRoot: falseRoot, printed: [print(trueRoot), print(falseRoot)]};
			});
		}

		it('without entries: the split is replaced by each branch', function () {
			var found = both('x = c ? a : b;');
			found.printed.should.eql(['(x = a);', '(x = b);']);
			found.trueRoot.expression.left.should.equal(found.root.expression.left);
		});

		it('placeholder entries: the operands evaluated before are unknown placeholders', function () {
			var found = both('f(), g(), c ? a : b;');
			found.printed.should.eql(['(<unknown>, <unknown>, a);', '(<unknown>, <unknown>, b);']);
			found.trueRoot.expression.expressions[0].range.should.equal(found.root.expression.expressions[0].range);
		});

		it('placeholder entries: a logical operator keeps the shared operands', function () {
			var found = both('x = y + f(a || b);');
			found.printed.should.eql(['(x = (<unknown> + f(<truthy>)));', '(x = (<unknown> + f(b)));']);
			found.falseRoot.expression.left.should.equal(found.root.expression.left);
			found.falseRoot.expression.right.right.callee.should.equal(found.root.expression.right.right.callee);
		});

		it('remove entries: the declarators evaluated before are removed', function () {
			var found = both('var a = f(), b = c ? d : e;');
			found.printed.should.eql(['var b = d;', 'var b = e;']);
			found.root.declarations.should.have.length(2);
		});

		it('compound entries: the target read becomes an unknown placeholder', function () {
			var found = both('x += c ? a : b;');
			found.printed.should.eql(['(x = (<unknown> + a));', '(x = (<unknown> + b));']);
			var assignment = found.trueRoot.expression;
			assignment.left.should.equal(found.root.expression.left);
			assignment.range.should.equal(found.root.expression.range);
			assignment.right.left.range.should.equal(found.root.expression.left.range);
		});

		it('compound entries: with a nested decision and a placeholder entry', function () {
			var found = both('x -= (f(), c && d);');
			found.printed.should.eql(['(x = (<unknown> - (<unknown>, d)));', '(x = (<unknown> - (<unknown>, <falsy>)));']);
		});

		it('logical assignment: the branches of the decision', function () {
			var found = both('o.p ??= v;');
			found.printed.should.eql(['<nonnull>;', '(o.p = v);']);
		});
	});
});
