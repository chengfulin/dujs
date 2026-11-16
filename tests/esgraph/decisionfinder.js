/*
 * Characterization tests of the decision finder (lib/esgraph/decisionfinder.js):
 * the expected values record the behavior of the code before it was moved out
 * of lib/esgraph/branchsplitter.js (specs/002-small-refactors, US1). Only ASTs
 * are used; no CFG is built.
 *
 * Original dujs code, MIT License (see LICENSE).
 */
var subject = require('../../lib/esgraph/decisionfinder'),
	jsParser = require('../../lib/dujs/jsparser'),
	should = require('should');

var PLACEHOLDER_TYPE = 'DujsEvaluatedValue';

/// pickers of the root analyzed in the parsed program
var TOP = function (program) {
	'use strict';
	return program.body[0];
};
var IN_FUNCTION = function (program) {
	'use strict';
	return program.body[0].body.body[0];
};
var FIRST_CASE = function (program) {
	'use strict';
	return program.body[0].cases[0];
};

function parse(code, pick) {
	'use strict';
	var program = jsParser.parseAST(code);
	return {code: code, root: (pick || TOP)(program)};
}

function sourceOf(parsed, node) {
	'use strict';
	if (node.type === PLACEHOLDER_TYPE) {
		return '<' + node.known + '>';
	}
	return parsed.code.slice(node.range[0], node.range[1]);
}

function typesOf(nodes) {
	'use strict';
	return nodes.map(function (node) {
		return node.type;
	});
}

/**
 * Find the first decision of the parsed root, check that the AST is not
 * modified, and summarize the decision with source texts
 */
function findIn(parsed) {
	'use strict';
	var snapshot = JSON.stringify(parsed.root);
	var decision = subject.findFirstDecision(parsed.root);
	JSON.stringify(parsed.root).should.equal(snapshot);
	if (!decision) {
		return null;
	}
	Object.keys(decision).sort().should.eql(['ancestors', 'condition', 'entries', 'split']);
	decision.ancestors[0].should.equal(parsed.root);
	decision.ancestors[decision.ancestors.length - 1].should.equal(decision.split);
	return {
		split: sourceOf(parsed, decision.split),
		condition: sourceOf(parsed, decision.condition),
		ancestors: typesOf(decision.ancestors),
		entries: decision.entries.map(function (entry) {
			Object.keys(entry).sort().should.eql(['action', 'ancestors', 'node']);
			entry.ancestors[0].should.equal(parsed.root);
			return [entry.action, sourceOf(parsed, entry.node), typesOf(entry.ancestors).join('>')];
		}),
		preEvaluated: subject.preEvaluatedOf(decision).map(function (node) {
			return sourceOf(parsed, node);
		})
	};
}

function find(code, pick) {
	'use strict';
	return findIn(parse(code, pick));
}

describe('decisionfinder (characterization)', function () {
	'use strict';

	describe('findFirstDecision', function () {
		it('ConditionalExpression: decides its test', function () {
			find('x = c ? a : b;').should.eql({
				split: 'c ? a : b',
				condition: 'c',
				ancestors: ['ExpressionStatement', 'AssignmentExpression', 'ConditionalExpression'],
				entries: [],
				preEvaluated: []
			});
		});

		it('ConditionalExpression: a decision in the test comes first', function () {
			var found = find('x = (c ? d : e) ? a : b;');
			found.split.should.equal('c ? d : e');
			found.condition.should.equal('c');
			found.ancestors.should.eql(['ExpressionStatement', 'AssignmentExpression',
				'ConditionalExpression', 'ConditionalExpression']);
		});

		it('ConditionalExpression: the branches are not searched before the test', function () {
			var found = find('x = c ? a : b ? d : e;');
			found.split.should.equal('c ? a : b ? d : e');
			found.condition.should.equal('c');
		});

		['&&', '||', '??'].forEach(function (operator) {
			it('LogicalExpression ' + operator + ': decides its left operand', function () {
				find('f(a ' + operator + ' b);').should.eql({
					split: 'a ' + operator + ' b',
					condition: 'a',
					ancestors: ['ExpressionStatement', 'CallExpression', 'LogicalExpression'],
					entries: [],
					preEvaluated: []
				});
			});
		});

		it('LogicalExpression: a decision in the left operand comes first', function () {
			var found = find('x = (a && b) || d;');
			found.split.should.equal('a && b');
			found.ancestors.should.eql(['ExpressionStatement', 'AssignmentExpression',
				'LogicalExpression', 'LogicalExpression']);
		});

		['&&=', '||=', '??='].forEach(function (operator) {
			it('AssignmentExpression ' + operator + ': the assignment is split on its target', function () {
				find('o.p ' + operator + ' v;').should.eql({
					split: 'o.p ' + operator + ' v',
					condition: 'o.p',
					ancestors: ['ExpressionStatement', 'AssignmentExpression'],
					entries: [],
					preEvaluated: []
				});
			});
		});

		it('AssignmentExpression compound: the target read is a compound entry', function () {
			find('x += c ? a : b;').should.eql({
				split: 'c ? a : b',
				condition: 'c',
				ancestors: ['ExpressionStatement', 'AssignmentExpression', 'ConditionalExpression'],
				entries: [['compound', 'x += c ? a : b', 'ExpressionStatement>AssignmentExpression']],
				preEvaluated: ['x']
			});
		});

		it('AssignmentExpression compound: entry before a nested decision', function () {
			var found = find('x -= f(c && d);');
			found.split.should.equal('c && d');
			found.entries.should.eql([['compound', 'x -= f(c && d)', 'ExpressionStatement>AssignmentExpression']]);
			found.preEvaluated.should.eql(['x']);
		});

		it('AssignmentExpression =: only the right side is searched, no entry', function () {
			var found = find('x = y = c ? a : b;');
			found.split.should.equal('c ? a : b');
			found.ancestors.should.eql(['ExpressionStatement', 'AssignmentExpression',
				'AssignmentExpression', 'ConditionalExpression']);
			found.entries.should.eql([]);
			should(find('x = 1;')).be.null();
		});

		it('SequenceExpression: the earlier expressions are placeholder entries', function () {
			find('f(), g(), c ? a : b;').should.eql({
				split: 'c ? a : b',
				condition: 'c',
				ancestors: ['ExpressionStatement', 'SequenceExpression', 'ConditionalExpression'],
				entries: [
					['placeholder', 'f()', 'ExpressionStatement>SequenceExpression'],
					['placeholder', 'g()', 'ExpressionStatement>SequenceExpression']
				],
				preEvaluated: ['f()', 'g()']
			});
		});

		it('SequenceExpression: an inert expression is not an entry', function () {
			var found = find('x = (1, c ? a : b);');
			found.split.should.equal('c ? a : b');
			found.entries.should.eql([]);
		});

		it('TemplateLiteral: the earlier expressions are placeholder entries', function () {
			var found = find('`${f()}${c ? a : b}`;');
			found.split.should.equal('c ? a : b');
			found.ancestors.should.eql(['ExpressionStatement', 'TemplateLiteral', 'ConditionalExpression']);
			found.entries.should.eql([['placeholder', 'f()', 'ExpressionStatement>TemplateLiteral']]);
		});

		it('BinaryExpression: the left operand is evaluated first', function () {
			var found = find('f() + (c ? a : b);');
			found.ancestors.should.eql(['ExpressionStatement', 'BinaryExpression', 'ConditionalExpression']);
			found.entries.should.eql([['placeholder', 'f()', 'ExpressionStatement>BinaryExpression']]);
			found = find('x = 1 + (c ? a : b);');
			found.entries.should.eql([]);
			should(find('x = f() + g();')).be.null();
		});

		it('UnaryExpression: searches its argument', function () {
			find('!(c ? a : b);').ancestors.should.eql(['ExpressionStatement', 'UnaryExpression',
				'ConditionalExpression']);
		});

		it('UpdateExpression: searches its argument', function () {
			var found = find('o[c ? a : b]++;');
			found.ancestors.should.eql(['ExpressionStatement', 'UpdateExpression', 'MemberExpression',
				'ConditionalExpression']);
			found.entries.should.eql([['placeholder', 'o', 'ExpressionStatement>UpdateExpression>MemberExpression']]);
			should(find('x++;')).be.null();
		});

		it('AwaitExpression: searches its argument', function () {
			find('async function q() { await (c ? a : b); }', IN_FUNCTION).ancestors.should.eql([
				'ExpressionStatement', 'AwaitExpression', 'ConditionalExpression']);
		});

		it('YieldExpression: searches its argument', function () {
			find('function* q() { yield (c ? a : b); }', IN_FUNCTION).ancestors.should.eql([
				'ExpressionStatement', 'YieldExpression', 'ConditionalExpression']);
		});

		it('SpreadElement: searches its argument', function () {
			var found = find('f(...(c ? a : b));');
			found.ancestors.should.eql(['ExpressionStatement', 'CallExpression', 'SpreadElement',
				'ConditionalExpression']);
			found.entries.should.eql([]);
		});

		it('SpreadElement: is structural, its evaluated argument is the entry', function () {
			var found = find('x = [...f(), c ? a : b];');
			found.entries.should.eql([['placeholder', 'f()',
				'ExpressionStatement>AssignmentExpression>ArrayExpression>SpreadElement']]);
		});

		it('MemberExpression: the object is evaluated before a computed key', function () {
			find('o[c ? a : b];').entries.should.eql([['placeholder', 'o', 'ExpressionStatement>MemberExpression']]);
			var found = find('o[f()][c ? a : b];');
			found.ancestors.should.eql(['ExpressionStatement', 'MemberExpression', 'ConditionalExpression']);
			found.entries.should.eql([['placeholder', 'o[f()]', 'ExpressionStatement>MemberExpression']]);
		});

		it('MemberExpression: the condition can be a member access', function () {
			var found = find('x = o.p[i] ? a : b;');
			found.condition.should.equal('o.p[i]');
			found.entries.should.eql([]);
		});

		it('CallExpression: the callee stays in the leaves, the arguments are entries', function () {
			find('f(c ? a : b);').entries.should.eql([]);
			find('g(f())(c ? a : b);').entries.should.eql([]);
			find('f(g(), c ? a : b);').entries.should.eql([['placeholder', 'g()', 'ExpressionStatement>CallExpression']]);
		});

		it('CallExpression: a decision in the callee', function () {
			var found = find('(c ? f : g)(a);');
			found.split.should.equal('c ? f : g');
			found.ancestors.should.eql(['ExpressionStatement', 'CallExpression', 'ConditionalExpression']);
		});

		it('NewExpression: the callee stays in the leaves, the arguments are entries', function () {
			var found = find('new F(x, c ? a : b);');
			found.ancestors.should.eql(['ExpressionStatement', 'NewExpression', 'ConditionalExpression']);
			found.entries.should.eql([['placeholder', 'x', 'ExpressionStatement>NewExpression']]);
		});

		it('TaggedTemplateExpression: the tag stays in the leaves', function () {
			var found = find('f(h())`${c ? a : b}`;');
			found.ancestors.should.eql(['ExpressionStatement', 'TaggedTemplateExpression', 'TemplateLiteral',
				'ConditionalExpression']);
			found.entries.should.eql([]);
		});

		it('ArrayExpression: holes are skipped, earlier elements are entries', function () {
			var found = find('[f(), , c ? a : b];');
			found.ancestors.should.eql(['ExpressionStatement', 'ArrayExpression', 'ConditionalExpression']);
			found.entries.should.eql([['placeholder', 'f()', 'ExpressionStatement>ArrayExpression']]);
		});

		it('ObjectExpression/Property: computed keys and values are entries', function () {
			find('x = {[f()]: g(), k: c ? a : b};').should.eql({
				split: 'c ? a : b',
				condition: 'c',
				ancestors: ['ExpressionStatement', 'AssignmentExpression', 'ObjectExpression', 'Property',
					'ConditionalExpression'],
				entries: [
					['placeholder', 'f()', 'ExpressionStatement>AssignmentExpression>ObjectExpression>Property'],
					['placeholder', 'g()', 'ExpressionStatement>AssignmentExpression>ObjectExpression>Property']
				],
				preEvaluated: ['f()', 'g()']
			});
		});

		it('ObjectExpression/Property: a decision in a computed key', function () {
			var found = find('x = {m() {}, [c ? a : b]: 1};');
			found.ancestors.should.eql(['ExpressionStatement', 'AssignmentExpression', 'ObjectExpression', 'Property',
				'ConditionalExpression']);
			found.entries.should.eql([]);
		});

		it('ObjectExpression: a spread element evaluated before is an entry', function () {
			find('x = {...f(), k: c ? a : b};').entries.should.eql([['placeholder', 'f()',
				'ExpressionStatement>AssignmentExpression>ObjectExpression>SpreadElement']]);
		});

		it('ImportExpression: searches its source', function () {
			find('import(c ? a : b);').ancestors.should.eql(['ExpressionStatement', 'ImportExpression',
				'ConditionalExpression']);
		});

		it('ClassDeclaration: searches the super class', function () {
			find('class K extends (c ? A : B) {}').should.eql({
				split: 'c ? A : B',
				condition: 'c',
				ancestors: ['ClassDeclaration', 'ConditionalExpression'],
				entries: [],
				preEvaluated: []
			});
		});

		it('ClassDeclaration: the method bodies are not searched', function () {
			should(find('class K { m() { return c ? a : b; } }')).be.null();
		});

		it('ClassExpression: super class and computed keys are entries, bodies are not searched', function () {
			find('x = class extends f() { [g()]() {} [c ? a : b]() {} m() { return c2 ? 1 : 2; } };').should.eql({
				split: 'c ? a : b',
				condition: 'c',
				ancestors: ['ExpressionStatement', 'AssignmentExpression', 'ClassExpression', 'ClassBody',
					'MethodDefinition', 'ConditionalExpression'],
				entries: [
					['placeholder', 'f()', 'ExpressionStatement>AssignmentExpression>ClassExpression'],
					['placeholder', 'g()',
						'ExpressionStatement>AssignmentExpression>ClassExpression>ClassBody>MethodDefinition']
				],
				preEvaluated: ['f()', 'g()']
			});
		});

		it('VariableDeclaration: the earlier declarators are remove entries', function () {
			find('var a = f(), b = c ? d : e;').should.eql({
				split: 'c ? d : e',
				condition: 'c',
				ancestors: ['VariableDeclaration', 'VariableDeclarator', 'ConditionalExpression'],
				entries: [['remove', 'a = f()', 'VariableDeclaration']],
				preEvaluated: ['a = f()']
			});
			/// an inert initializer is also removed
			find('var a = 1, b = c ? d : e;').entries.should.eql([['remove', 'a = 1', 'VariableDeclaration']]);
		});

		it('ExpressionStatement: searches its expression', function () {
			find('x = c ? a : b;').ancestors[0].should.equal('ExpressionStatement');
		});

		it('ReturnStatement: searches its argument', function () {
			find('function q() { return f(), c ? a : b; }', IN_FUNCTION).should.eql({
				split: 'c ? a : b',
				condition: 'c',
				ancestors: ['ReturnStatement', 'SequenceExpression', 'ConditionalExpression'],
				entries: [['placeholder', 'f()', 'ReturnStatement>SequenceExpression']],
				preEvaluated: ['f()']
			});
		});

		it('ThrowStatement: searches its argument', function () {
			find('function q() { throw c ? a : b; }', IN_FUNCTION).ancestors.should.eql([
				'ThrowStatement', 'ConditionalExpression']);
		});

		it('SwitchCase: searches its test', function () {
			find('switch (x) { case c ? a : b: }', FIRST_CASE).ancestors.should.eql([
				'SwitchCase', 'ConditionalExpression']);
		});

		it('ExportDefaultDeclaration: an expression is searched', function () {
			find('export default c ? a : b;').ancestors.should.eql(['ExportDefaultDeclaration',
				'ConditionalExpression']);
		});

		it('ExportDefaultDeclaration: a declaration is not searched', function () {
			should(find('export default function () { return c ? a : b; }')).be.null();
			should(find('export default class extends (c ? A : B) {}')).be.null();
		});

		it('default: identifiers, optional chains and function bodies have no decision', function () {
			should(find('x;')).be.null();
			should(find('a?.b;')).be.null();
			should(find('a?.[c ? d : e];')).be.null();
			should(find('f(() => c ? a : b);')).be.null();
		});

		it('returns null for a missing root', function () {
			should(subject.findFirstDecision(null)).be.null();
		});
	});

	describe('preEvaluatedOf', function () {
		it('maps the entries to their nodes, the target of a compound assignment', function () {
			var parsed = parse('x *= f(), c ? a : b;');
			var found = findIn(parsed);
			/// the compound assignment is the whole sequence operand here: no decision in it
			found.preEvaluated.should.eql(['x *= f()']);
			parsed = parse('x *= (f(), c ? a : b);');
			found = findIn(parsed);
			found.entries.should.eql([
				['compound', 'x *= (f(), c ? a : b)', 'ExpressionStatement>AssignmentExpression'],
				['placeholder', 'f()', 'ExpressionStatement>AssignmentExpression>SequenceExpression']
			]);
			found.preEvaluated.should.eql(['x', 'f()']);
		});

		it('returns the left node object of a compound entry', function () {
			var parsed = parse('x += c ? a : b;');
			var decision = subject.findFirstDecision(parsed.root);
			subject.preEvaluatedOf(decision)[0].should.equal(parsed.root.expression.left);
		});
	});

	describe('isPlaceholder', function () {
		it('is true only for a node of the placeholder type', function () {
			subject.isPlaceholder({type: PLACEHOLDER_TYPE, known: 'unknown'}).should.be.true();
			subject.isPlaceholder({type: 'Identifier', name: 'x'}).should.be.false();
			subject.isPlaceholder(null).should.be.false();
			subject.isPlaceholder(undefined).should.be.false();
		});
	});

	describe('isInert', function () {
		function inert(code) {
			var parsed = parse('(' + code + ');');
			return subject.isInert(parsed.root.expression);
		}

		it('is true for a missing node and a placeholder', function () {
			subject.isInert(null).should.be.true();
			subject.isInert({type: PLACEHOLDER_TYPE, known: 'truthy'}).should.be.true();
		});

		it('is true for literals, this and function expressions', function () {
			inert('1').should.be.true();
			inert('"s"').should.be.true();
			inert('this').should.be.true();
			inert('function () { return x; }').should.be.true();
			inert('() => x').should.be.true();
			subject.isInert({type: 'TemplateElement'}).should.be.true();
		});

		it('TemplateLiteral: inert when all expressions are', function () {
			inert('`a${1}b`').should.be.true();
			inert('`a${x}b`').should.be.false();
		});

		it('BinaryExpression/LogicalExpression: inert when both operands are', function () {
			inert('1 + 2').should.be.true();
			inert('1 + x').should.be.false();
			inert('1 && 2').should.be.true();
			inert('x || 2').should.be.false();
		});

		it('ConditionalExpression: inert when all three parts are', function () {
			inert('1 ? 2 : 3').should.be.true();
			inert('1 ? x : 3').should.be.false();
		});

		it('UnaryExpression: inert unless delete or a non-inert argument', function () {
			inert('!1').should.be.true();
			inert('typeof x').should.be.false();
			inert('delete 1').should.be.false();
		});

		it('SequenceExpression and ArrayExpression: inert when all items are', function () {
			inert('1, 2').should.be.true();
			inert('1, x').should.be.false();
			inert('[1, , 2]').should.be.true();
			inert('[1, x]').should.be.false();
		});

		it('ObjectExpression: inert with non-computed properties of inert values', function () {
			inert('{a: 1, b() {}}').should.be.true();
			inert('{a: x}').should.be.false();
			inert('{[1]: 1}').should.be.false();
			inert('{...{}}').should.be.false();
		});

		it('is false for other nodes', function () {
			inert('x').should.be.false();
			inert('f()').should.be.false();
			inert('x = 1').should.be.false();
			inert('o.p').should.be.false();
		});
	});
});
