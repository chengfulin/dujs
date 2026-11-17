/*
 * Unit tests of lib/dujs/callsplit.js (specs/007-split-call-nodes T011,
 * data-model §1 and §5, research R2, R3, R6, contracts/lib-api.md §1,
 * contracts/acceptance.md "另有單元測試").
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * Each program is analyzed with tests/helpers/analyze.js; the plan of a node
 * of the intra-procedural model is computed without a predicate (every call
 * site is listed, once-* shapes included) unless a test gives one. The
 * phase predicate (DECISION 006 Q2) is temporary: its cases are removed by
 * T048.
 */
var should = require('should');
var analyze = require('../helpers/analyze'),
	modelCtrl = require('../../lib/dujs/modelctrl'),
	FlowNode = require('../../lib/esgraph/flownode'),
	esgraph = require('../../lib/esgraph'),
	callsplit = require('../../lib/dujs/callsplit');

var PAGE = '$DOMAIN.$PAGE_0',
	/// line 1-3: the functions f, g and h; programs below start at line 4
	PRELUDE = ['function f() {}', 'function g() {}', 'function h() {}'];

/**
 * Analyze a program and take the plan of a node of a line
 * @param {Array} lines Lines after PRELUDE (line 4 is lines[0])
 * @param {number} line 1-based line of the whole program
 * @param {Object} [options]
 * @param {string} [options.scope] Scope name, default the page
 * @param {Function} [options.pick] (FlowNode) -> boolean, default any node of the line
 * @param {Function} [options.predicate] Phase predicate of planOf
 * @returns {Object} {plan, node, result, source, text(ast), find(text, type), sites()}
 */
function planAt(lines, line, options) {
	'use strict';
	options = options || {};
	var source = PRELUDE.concat(lines).join('\n'),
		result = analyze(source),
		node = nodeAt(result, options.scope || PAGE, line, options.pick),
		plan = (options.predicate === undefined) ? callsplit.planOf(node, result.scopeTree) :
			callsplit.planOf(node, result.scopeTree, options.predicate);
	return wrap(plan, node, result, source);
}

/**
 * Accessors of a plan
 * @private
 */
function wrap(plan, node, result, source) {
	'use strict';
	function text(ast) {
		return source.slice(ast.range[0], ast.range[1]);
	}
	return {
		plan: plan,
		node: node,
		result: result,
		source: source,
		text: text,
		/** the AST of the plan (in order) whose source is text (and type, when given), first by position */
		find: function (expressionText, type) {
			var found = null, position = Infinity;
			plan.order.forEach(function (index, ast) {
				if (!!ast.range && text(ast) === expressionText && (!type || ast.type === type) && index < position) {
					found = ast;
					position = index;
				}
			});
			(!!found).should.eql(true, 'no AST ' + expressionText + ' in the order');
			return found;
		},
		/** position of an AST found by find */
		pos: function (expressionText, type) {
			return plan.order.get(this.find(expressionText, type));
		},
		/** call sites as "<source>:<kind>" */
		sites: function () {
			return plan.callSites.map(function (entry) {
				return text(entry.expression) + ':' + entry.kind;
			});
		},
		/** whether any AST of the order has the given source */
		hasText: function (expressionText) {
			var has = false;
			plan.order.forEach(function (index, ast) {
				has = has || (!!ast.range && text(ast) === expressionText);
			});
			return has;
		},
		/** the VarDefs of the GEN set of the node of a variable */
		defsOf: function (name) {
			return node.generate.values().filter(function (vardef) {
				return vardef.variable.toString() === name;
			});
		}
	};
}

/**
 * Nodes of the intra-procedural model of a scope
 * @param {Object} result
 * @param {string} scopeName
 * @returns {Array}
 */
function nodesOf(result, scopeName) {
	'use strict';
	var nodes = null;
	modelCtrl.collectionOfPageModels.get(result.scopeTree).intraProceduralModels.forEach(function (model) {
		if (model.mainlyRelatedScope.name === scopeName) {
			nodes = model.graph[2];
		}
	});
	(!!nodes).should.eql(true, 'no model of ' + scopeName);
	return nodes;
}

/**
 * The first node of a line (not entry or exit) accepted by pick
 * @param {Object} result
 * @param {string} scopeName
 * @param {number} line
 * @param {Function} [pick]
 * @returns {FlowNode}
 */
function nodeAt(result, scopeName, line, pick) {
	'use strict';
	var found = null;
	nodesOf(result, scopeName).forEach(function (node) {
		if (!found && node.type !== FlowNode.ENTRY_NODE_TYPE && node.type !== FlowNode.EXIT_NODE_TYPE &&
			node.line === line && (!pick || pick(node))) {
			found = node;
		}
	});
	(!!found).should.eql(true, 'no node at L' + line + ' of ' + scopeName);
	return found;
}

/**
 * A pick of the node whose AST node has the given type
 * @param {string} type
 * @returns {Function}
 */
function ofType(type) {
	'use strict';
	return function (node) {
		return !!node.astNode && node.astNode.type === type;
	};
}

/**
 * A pick of the first case node of a switch
 * @param {FlowNode} node
 * @returns {boolean}
 */
function isFirstCase(node) {
	'use strict';
	return !!node.astNode && node.astNode.type === 'SwitchCase' && node.parent.cases[0] === node.astNode;
}

describe('callsplit (feature 007)', function () {
	'use strict';

	after(analyze.reset);

	describe('post-order positions (data-model §5)', function () {
		it('should read x of x += f() before f() and define it after', function () {
			var p = planAt(['var x = 0;', 'x += f();'], 5);
			p.sites().should.eql(['f():call']);
			p.pos('x', 'Identifier').should.be.below(p.pos('f()'));
			p.pos('f()').should.be.below(p.pos('x += f()'));
			p.plan.segmentOf(p.find('x', 'Identifier')).should.eql(0);
			p.plan.segmentOfVarDef(p.defsOf('x')[0]).should.eql(1);
		});

		it('should define x of x = f() after f()', function () {
			var p = planAt(['var x = 0;', 'x = f();'], 5);
			p.sites().should.eql(['f():call']);
			p.pos('f()').should.be.below(p.pos('x = f()'));
			p.plan.segmentOfVarDef(p.defsOf('x')[0]).should.eql(1);
		});

		it('should evaluate the object and the property of a[i] = f() before f()', function () {
			var p = planAt(['var a = [], i = 0;', 'a[i] = f();'], 5);
			p.pos('a', 'Identifier').should.be.below(p.pos('i', 'Identifier'));
			p.pos('i', 'Identifier').should.be.below(p.pos('f()'));
			p.pos('f()').should.be.below(p.pos('a[i] = f()'));
			p.plan.segmentOf(p.find('i', 'Identifier')).should.eql(0);
			p.plan.segmentOfVarDef(p.defsOf('a')[0]).should.eql(1);
		});

		it('should evaluate F and a before new F(a)', function () {
			var p = planAt(['function F() {}', 'var a = 1;', 'new F(a);'], 6);
			p.sites().should.eql(['new F(a):new']);
			p.pos('F', 'Identifier').should.be.below(p.pos('a', 'Identifier'));
			p.pos('a', 'Identifier').should.be.below(p.pos('new F(a)'));
			p.plan.callSites[0].callees.map(String).should.eql([PAGE + '.F']);
		});

		it('should call f() before h(f())', function () {
			var p = planAt(['h(f());'], 4);
			p.sites().should.eql(['f():call', 'h(f()):call']);
			p.pos('h', 'Identifier').should.be.below(p.pos('f', 'Identifier'));
			p.plan.segmentCount.should.eql(3);
			p.plan.callSites.map(function (entry) {
				return entry.index;
			}).should.eql([0, 1]);
			p.plan.callSites.forEach(function (entry) {
				entry.position.should.eql(p.plan.order.get(entry.expression));
			});
			p.plan.segmentOf(p.find('h(f())')).should.eql(1);
			p.plan.segmentOf(p.find('f()')).should.eql(0);
		});

		it('should call f() before g() of f() + g()', function () {
			var p = planAt(['var r = f() + g();'], 4);
			p.sites().should.eql(['f():call', 'g():call']);
			p.pos('g()').should.be.below(p.pos('f() + g()'));
			p.plan.segmentOf(p.find('f() + g()')).should.eql(2);
			p.plan.segmentOfVarDef(p.defsOf('r')[0]).should.eql(2);
		});

		/// two call sites, new F() first; the callees of .m() are asserted by T037
		it('should list new F() and then .m() of new F().m(x = 1) with x defined between', function () {
			var p = planAt([
				'class F {',
				'  constructor() {}',
				'  m() {}',
				'}',
				'var x = 0;',
				'new F().m(x = 1);'
			], 9);
			p.sites().should.eql(['new F():new', 'new F().m(x = 1):call']);
			p.pos('new F()').should.be.below(p.pos('x = 1'));
			p.pos('x = 1').should.be.below(p.pos('new F().m(x = 1)'));
			p.plan.segmentOfVarDef(p.defsOf('x')[0]).should.eql(1);
		});

		it('should list a class with static members as a call site, its name bound before', function () {
			var p = planAt(['class A {', '  static y = g();', '}'], 4);
			p.sites().should.eql([p.text(p.node.astNode) + ':class-static']);
			p.plan.callSites[0].callees.length.should.eql(1);
			var defs = p.defsOf('A');
			defs.length.should.be.above(0);
			defs.forEach(function (vardef) {
				p.plan.segmentOfVarDef(vardef).should.eql(0);
			});
		});

		it('should define the variable of a class expression with static members after them', function () {
			var p = planAt(['var B = class {', '  static y = 1;', '};'], 4);
			p.sites().length.should.eql(1);
			p.plan.callSites[0].kind.should.eql('class-static');
			p.plan.callSites[0].expression.type.should.eql('ClassExpression');
			p.plan.segmentOfVarDef(p.defsOf('B')[0]).should.eql(1);
		});

		it('should list the static members of a class in source order', function () {
			var p = planAt(['class A {', '  static y = g();', '  static {', '    h();', '  }', '}'], 4);
			p.plan.callSites.length.should.eql(1);
			p.plan.callSites[0].callees.length.should.eql(2);
		});
	});

	describe('segments of reads and definitions (research R3)', function () {
		it('should put the definition of x of f(x = 1) in segment 0', function () {
			var p = planAt(['var x = 0;', 'f(x = 1);'], 5);
			p.sites().should.eql(['f(x = 1):call']);
			p.plan.segmentOfVarDef(p.defsOf('x')[0]).should.eql(0);
		});

		it('should put the definition of y of var y = g() in segment 1', function () {
			var p = planAt(['var y = g();'], 4);
			p.plan.segmentOfVarDef(p.defsOf('y')[0]).should.eql(1);
			p.plan.segmentOf(p.find('g', 'Identifier')).should.eql(0);
		});

		it('should throw for an AST without position (not segment 0 silently)', function () {
			var p = planAt(['var y = g();', 'var z = 1;'], 4),
				other = planAt(['var y = g();', 'var z = 1;'], 5);
			(function () {
				p.plan.segmentOf(other.node.astNode);
			}).should.throw();
			(function () {
				p.plan.segmentOfVarDef(other.defsOf('z')[0]);
			}).should.throw();
		});
	});

	describe('throws (FR-005, research R6)', function () {
		/// [lines, line, pick, expected throws]
		function throwsOf(lines, line, options) {
			var p = planAt(lines, line, options);
			p.plan.throws.forEach(function (flag, index) {
				callsplit.segmentThrows(p.plan, index).should.eql(flag);
			});
			return p.plan.throws;
		}

		it('should throw after f() returns in f() + 1, f()[0], !f(), f().p, x = f() and f() > x', function () {
			throwsOf(['f() + 1;'], 4).should.eql([true, true]);
			throwsOf(['f()[0];'], 4).should.eql([true, true]);
			throwsOf(['!f();'], 4).should.eql([true, true]);
			throwsOf(['if (!f()) {', '}'], 4).should.eql([true, true]);
			throwsOf(['f().p;'], 4).should.eql([true, true]);
			throwsOf(['var x = 0;', 'x = f();'], 5).should.eql([true, true]);
			throwsOf(['var x = 0;', 'f() > x;'], 5).should.eql([true, true]);
		});

		it('should throw between f() and h() of h(f()) but not after h() returns', function () {
			throwsOf(['h(f());'], 4).should.eql([true, true, false]);
		});

		it('should not throw after f() returns in f();, var y = f();, if (f()), return f(); and [f()]', function () {
			throwsOf(['f();'], 4).should.eql([true, false]);
			throwsOf(['var y = f();'], 4).should.eql([true, false]);
			throwsOf(['if (f()) {', '}'], 4).should.eql([true, false]);
			throwsOf(['function k() {', '  return f();', '}'], 5, {scope: PAGE + '.k'}).should.eql([true, false]);
			throwsOf(['[f()];'], 4).should.eql([true, false]);
		});

		it('should not throw after f() returns in the decision of f() ? a : b (split)', function () {
			throwsOf(['var a = 1, b = 2;', 'var r = f() ? a : b;'], 5, {
				pick: function (node) {
					return !!node.true && !!node.astNode && node.astNode.type === 'CallExpression';
				}
			}).should.eql([true, false]);
		});

		it('should throw after f() returns in throw f(); and console.log(f())', function () {
			throwsOf(['throw f();'], 4).should.eql([true, true]);
			throwsOf(['console.log(f());'], 4).should.eql([true, true]);
		});

		it('should always throw before a call site (throws[j], j < k)', function () {
			throwsOf(['class A {', '  static y = 1;', '}'], 4).should.eql([true, false]);
		});

		it('should have THROW_TYPES equal to the throwTypes of esgraph', function () {
			callsplit.THROW_TYPES.slice().sort().should.eql(esgraph.throwTypes.slice().sort());
		});
	});

	describe('evaluatedExpressionsOf (research R2 step 1)', function () {
		var lines = [
			'var d = 1, c = [], o = {};',
			'switch (d) {',
			'case g():',
			'  break;',
			'case 2:',
			'  break;',
			'}'
		];

		it('should take the discriminant at the first case only, not the case test', function () {
			var p = planAt(lines, 6, {pick: isFirstCase});
			callsplit.evaluatedExpressionsOf(p.node).map(p.text).should.eql(['d']);
			p.plan.expressions.map(p.text).should.eql(['d']);
			p.sites().should.eql([]);
			var other = planAt(lines, 8, {pick: ofType('SwitchCase')});
			callsplit.evaluatedExpressionsOf(other.node).should.eql([]);
		});

		it('should not take a split discriminant or a split right side', function () {
			var p = planAt(['var a = 1, b = 2;', 'switch (a && b) {', 'case 1:', '  break;', '}'], 6, {pick: isFirstCase});
			p.node.discriminantSplit.should.eql(true);
			callsplit.evaluatedExpressionsOf(p.node).should.eql([]);
			var loop = planAt(['var a = [], b = [];', 'for (var v of a || b) {', '}'], 5, {pick: ofType('ForOfStatement')});
			loop.node.loopRightSplit.should.eql(true);
			callsplit.evaluatedExpressionsOf(loop.node).should.eql([]);
			loop.plan.shape.should.not.eql('once-loop');
		});

		it('should take only the right side of for-of', function () {
			var p = planAt(['var a = [], o = {};', 'for (o[g()] of a) {', '}'], 5, {pick: ofType('ForOfStatement')});
			callsplit.evaluatedExpressionsOf(p.node).map(p.text).should.eql(['a']);
		});

		it('should take the parameter of a catch clause, none without one', function () {
			var p = planAt(['try {', '  f();', '} catch ({a = 1}) {', '}'], 6, {pick: ofType('CatchClause')});
			callsplit.evaluatedExpressionsOf(p.node).map(p.text).should.eql(['{a = 1}']);
			var none = planAt(['try {', '  f();', '} catch {', '}'], 6, {pick: ofType('CatchClause')});
			callsplit.evaluatedExpressionsOf(none.node).should.eql([]);
		});

		it('should take nothing at the entry and exit nodes', function () {
			var result = analyze(PRELUDE.concat(['f();']).join('\n')),
				nodes = nodesOf(result, PAGE);
			nodes.filter(function (node) {
				return node.type === FlowNode.ENTRY_NODE_TYPE || node.type === FlowNode.EXIT_NODE_TYPE;
			}).forEach(function (node) {
				callsplit.evaluatedExpressionsOf(node).should.eql([]);
				var plan = callsplit.planOf(node, result.scopeTree);
				plan.callSites.should.eql([]);
				plan.segmentCount.should.eql(1);
			});
		});
	});

	describe('shape, owners and throwTarget (data-model §1)', function () {
		it('should give statement and decision shapes', function () {
			var statement = planAt(['f();'], 4);
			statement.plan.shape.should.eql('statement');
			statement.plan.owners.should.eql([]);
			var decision = planAt(['if (f()) {', '}'], 4);
			decision.plan.shape.should.eql('decision');
			decision.plan.owners.length.should.eql(1);
			decision.plan.owners[0].should.equal(decision.node);
		});

		it('should give once-switch with every case with a test as owners', function () {
			var p = planAt(['switch (f()) {', 'case 1:', '  break;', 'case 2:', '  break;', 'default:', '}'], 5,
				{pick: isFirstCase});
			p.plan.shape.should.eql('once-switch');
			p.sites().should.eql(['f():call']);
			p.plan.owners.map(function (owner) {
				return owner.line;
			}).sort().should.eql([5, 7]);
			p.plan.owners.forEach(function (owner) {
				owner.astNode.type.should.eql('SwitchCase');
			});
		});

		it('should give no owner to a switch with only default', function () {
			var p = planAt(['switch (f()) {', 'default:', '  g();', '}'], 5, {pick: isFirstCase});
			p.plan.shape.should.eql('once-switch');
			p.plan.owners.should.eql([]);
		});

		it('should give once-loop with the loop node as owner and its entering predecessors', function () {
			var p = planAt(['for (var v of f()) {', '  g(v);', '}'], 4, {pick: ofType('ForOfStatement')});
			p.plan.shape.should.eql('once-loop');
			p.plan.owners.should.eql([p.node]);
			p.sites().should.eql(['f():call']);
			p.plan.enteringPrev.length.should.eql(1);
			p.plan.enteringPrev[0].type.should.eql(FlowNode.ENTRY_NODE_TYPE);
		});

		it('should not count the predecessors in the loop body (continue) as entering', function () {
			var p = planAt(['var x = 0;', 'for (var v of f()) {', '  if (v) {', '    continue;', '  }', '  x = v;', '}'], 5,
				{pick: ofType('ForOfStatement')});
			p.plan.enteringPrev.map(function (prev) {
				return prev.line;
			}).should.eql([4]);
		});

		it('should take the exception target of the node, else the discriminant target, else null', function () {
			var inTry = planAt(['try {', '  f();', '} catch (e) {', '}'], 5);
			inTry.plan.throwTarget.astNode.type.should.eql('CatchClause');
			inTry.plan.throwTarget.should.equal(inTry.node.exception);
			var once = planAt(['switch (f()) {', 'case 1:', '}'], 5, {pick: isFirstCase});
			once.plan.throwTarget.should.equal(once.node.discriminantThrowTarget);
			once.plan.throwTarget.type.should.eql(FlowNode.EXIT_NODE_TYPE);
			var none = planAt(['var y = 1;'], 4);
			should(none.plan.throwTarget).equal(null);
		});
	});

	describe('positions not listed as call sites (data-model §5)', function () {
		/// the reads and definitions in these positions still have segments
		function noSite(lines, line, options, texts) {
			var p = planAt(lines, line, options);
			p.sites().should.eql([]);
			(texts || []).forEach(function (text) {
				p.plan.segmentOf(p.find(text, 'Identifier')).should.eql(0);
			});
			return p;
		}

		it('should not list the calls after ?. (c?.m(f()), c?.[f()])', function () {
			noSite(['var c = null;', 'c?.m(f());'], 5, null, ['c', 'f']);
			noSite(['var c = null;', 'c?.[f()];'], 5, null, ['c', 'f']);
		});

		it('should not list the calls in defaults of destructuring patterns', function () {
			var p = noSite(['var c = [];', 'var [z = f()] = c;'], 5, null, ['f']);
			p.plan.segmentOfVarDef(p.defsOf('z')[0]).should.eql(0);
			noSite(['var c = {};', 'var {z = f()} = c;'], 5, null, ['f']);
			noSite(['var c = [], z;', '[z = f()] = c;'], 5, null, ['f']);
		});

		it('should not list the calls in the left side of for-of (not in the expressions)', function () {
			var p = noSite(['var a = [], o = {};', 'for (o[g()] of a) {', '}'], 5, {pick: ofType('ForOfStatement')});
			p.hasText('g()').should.eql(false);
			var q = noSite(['var a = [];', 'for (var [z = g()] of a) {', '}'], 5, {pick: ofType('ForOfStatement')});
			q.hasText('g()').should.eql(false);
			should(q.plan.segmentOfVarDef(q.defsOf('z')[0])).equal(null);
		});

		it('should not list the calls in a case test', function () {
			var lines = ['var d = 1;', 'switch (d) {', 'case g():', '  break;', 'case class {', '  static y = g();', '}:',
				'  break;', '}'];
			noSite(lines, 6, {pick: isFirstCase});
			noSite(lines, 8, {pick: ofType('SwitchCase')});
		});

		/// DECISION 007: only the operand left in the case node is not modeled; the operands split from a
		/// case test are decision nodes evaluating their expressions
		it('should list the calls of the operands split from a case test, not of the last operand', function () {
			var lines = ['var d = 1, a = 1;', 'switch (d) {', 'case g() && 1:', '  break;', 'case a && g():', '  break;',
				'case [class {', '  static y = 1;', '}][0] && 1:', '  break;', '}'];
			var split = planAt(lines, 6, {pick: ofType('CallExpression')});
			split.node.split.origin.type.should.eql('SwitchCase');
			split.plan.shape.should.eql('decision');
			callsplit.evaluatedExpressionsOf(split.node).map(split.text).should.eql(['g()']);
			split.sites().should.eql(['g():call']);
			/// the case nodes left by splitting (their last operand) evaluate nothing
			[6, 8].forEach(function (line) {
				var left = planAt(lines, line, {pick: ofType('SwitchCase')});
				(!!left.node.split).should.eql(true);
				callsplit.evaluatedExpressionsOf(left.node).should.eql([]);
				left.sites().should.eql([]);
			});
			var operand = planAt(lines, 8, {pick: ofType('Identifier')});
			operand.plan.expressions.map(operand.text).should.eql(['a']);
			var withClass = planAt(lines, 10, {pick: ofType('MemberExpression')});
			withClass.sites().should.eql(['class {\n  static y = 1;\n}:class-static']);
		});

		/// class static members in these positions are not class-static call sites (DECISION 006 Q4 must-fix 3)
		it('should not list the class static members in defaults, after ?., in the left of for-of and in catch', function () {
			noSite(['var c = [];', 'var [z = class {', '  static y = g();', '}] = c;'], 5);
			noSite(['var c = null;', 'c?.m(class {', '  static y = g();', '});'], 5);
			noSite(['var c = [], o = {};', 'for (o[class {', '  static y = g();', '}] of c) {', '}'], 5,
				{pick: ofType('ForOfStatement')});
			noSite(['try {', '  f();', '} catch ({a = class {', '  static y = g();', '}}) {', '}'], 6,
				{pick: ofType('CatchClause')});
		});
	});

	describe('guard of a callee defined before in the node (R13 L3)', function () {
		/// var f2 = h defines a literal (not resolved); the function expressions resolve without the guard
		it('should not list f() of f = g, f() (the reaching f = h is old)', function () {
			planAt(['var f2 = h;', 'f2 = g, f2();'], 5).sites().should.eql([]);
			var p = planAt(['var f2 = function () {};', 'f2 = function () {}, f2();'], 5);
			p.sites().should.eql([]);
			/// without the definition before it, f2() is resolved by the ReachIn
			planAt(['var f2 = function () {};', 'f2();'], 5).sites().should.eql(['f2():call']);
		});

		it('should list only new A() of var o = new A(), r = o.m()', function () {
			var p = planAt(['class A {', '  constructor() {}', '  m() {}', '}', 'var o = new A(), r = o.m();'], 8);
			p.sites().should.eql(['new A():new']);
		});

		it('should list f(f = g) (the definition is after the callee is read)', function () {
			var p = planAt(['var f2 = function () {};', 'f2(f2 = g);'], 5);
			p.sites().should.eql(['f2(f2 = g):call']);
			p.plan.callSites[0].callees.map(String).should.eql([PAGE + '.$ANONYMOUS_FUN_0']);
		});
	});

	describe('parameter defaults', function () {
		it('should list g() of function k(a = g())', function () {
			var p = planAt(['function k(a = g()) {', '}'], 4, {scope: PAGE + '.k', pick: ofType('AssignmentExpression')});
			p.sites().should.eql(['g():call']);
			p.plan.segmentOfVarDef(p.defsOf('a')[0]).should.eql(1);
		});
	});

	describe('segmentOfVarDef of once-loop', function () {
		it('should give null for the loop variable', function () {
			var p = planAt(['for (var v of f()) {', '}'], 4, {pick: ofType('ForOfStatement')});
			p.defsOf('v').length.should.eql(1);
			should(p.plan.segmentOfVarDef(p.defsOf('v')[0])).equal(null);
		});
	});

	describe('planOf cache', function () {
		it('should freeze and cache the plan by the original node, cleared by reset', function () {
			var p = planAt(['h(f());'], 4),
				again = callsplit.planOf(p.node, p.result.scopeTree);
			Object.isFrozen(p.plan).should.eql(true);
			Object.isFrozen(p.plan.callSites).should.eql(true);
			Object.isFrozen(p.plan.callSites[0]).should.eql(true);
			again.should.equal(p.plan);
			callsplit.reset();
			callsplit.planOf(p.node, p.result.scopeTree).should.not.equal(p.plan);
		});

		it('should not change the node', function () {
			var p = planAt(['for (var v of f()) {', '}'], 4, {pick: ofType('ForOfStatement')});
			p.node.loopRightSplit.should.eql(false);
			should(p.node.segment).equal(null);
		});
	});

	/// temporary (DECISION 006 Q2): removed with the predicate by T048
	describe('phase predicate (temporary)', function () {
		it('should list every call site without a predicate, once-* included', function () {
			planAt(['for (var v of f()) {', '}'], 4, {pick: ofType('ForOfStatement')}).sites().should.eql(['f():call']);
			planAt(['switch (f()) {', 'case 1:', '}'], 5, {pick: isFirstCase}).sites().should.eql(['f():call']);
		});

		it('should recompute the segments from the call sites kept', function () {
			var calls = [], source = PRELUDE.concat(['h(g());']).join('\n');
			function notG(entry, node, shape) {
				calls.push([entry.kind, entry.callees.length > 0, FlowNode.isFlowNode(node), shape]);
				return source.slice(entry.expression.range[0], entry.expression.range[1]) !== 'g()';
			}
			var p = planAt(['h(g());'], 4, {predicate: notG});
			p.sites().should.eql(['h(g()):call']);
			p.plan.segmentCount.should.eql(2);
			p.plan.segmentOf(p.find('g', 'Identifier')).should.eql(0);
			p.plan.segmentOf(p.find('g()')).should.eql(0);
			p.plan.throws.length.should.eql(2);
			calls.length.should.be.above(0);
			calls[0].should.eql(['call', true, true, 'statement']);
		});

		it('should cache the plans with and without a predicate apart', function () {
			function none() {
				return false;
			}
			var p = planAt(['h(g());'], 4),
				filtered = callsplit.planOf(p.node, p.result.scopeTree, none);
			filtered.should.not.equal(p.plan);
			filtered.callSites.should.eql([]);
			callsplit.planOf(p.node, p.result.scopeTree, none).should.equal(filtered);
			callsplit.planOf(p.node, p.result.scopeTree).should.equal(p.plan);
			p.plan.callSites.length.should.eql(2);
		});
	});
});
