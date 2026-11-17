/*
 * Derived from esgraph 0.1.1 (https://github.com/Swatinem/esgraph), upstream lib/index.js
 * Original author: Arpad Borsos (Swatinem) <arpad.borsos@googlemail.com>
 * SPDX-License-Identifier: LGPL-3.0-only
 * Licensed under the GNU LGPL v3, see LICENSES/LGPL-3.0.txt and
 * LICENSES/GPL-3.0.txt. This file is NOT covered by the dujs MIT license.
 *
 * Modified by ChengFuLin (chengfulin0806@gmail.com):
 *   2015-05 ~ 2015-08: build CFGs with dujs FlowNode/FlowNodeFactory, typed
 *     connections, CFG ids assigned after building, strict mode and bug fixes
 *   2026-11-11: read the ESTree TryStatement.handler (espree)
 *   2026-11-11: treat arrow functions as nested scopes (no CFG nodes inside)
 *   2026-11-11: support ForOfStatement like ForInStatement
 *   2026-11-11: a ClassDeclaration is a single statement node (no nodes in class bodies)
 *   2026-11-11: support ES module import/export declarations
 *   2026-11-11: expressionThrows returns false for a null expression
 *   2026-11-11: a ClassDeclaration is a leaf in createNodes
 *   2026-11-16: support labeled statements (labeled break/continue), with and debugger
 *   2026-11-16: split conditional and short-circuit expressions into decision/leaf nodes (see branchsplitter.js)
 *   2026-11-17: route catch throws, jumps and exceptional completion through non-empty finally blocks
 *   (a jump inside a finally block keeps its target; the end of a finally block is told apart by an end marker)
 *   2026-11-18: record the exception target of a switch at its first case (discriminantThrowTarget, a
 *   property only, no edge) and export a copy of throwTypes (dujs specs/007-split-call-nodes)
 * See THIRD_PARTY_NOTICES.md for details.
 */
var walker = require('walkes'),
	factoryFlowNode = require('./flownodefactory'),
	FlowNode = require('./flownode'),
	branchsplitter = require('./branchsplitter');

module.exports = ControlFlowGraph;
module.exports.dot = require('./dot');
module.exports.FlowNode = FlowNode;
module.exports.factoryFlowNode = factoryFlowNode;

// FIXME: switch/case with default before other cases?
// FIXME: catch creates a new scope, so should somehow be handled differently

// TODO: avoid adding and deleting properties on ast nodes


/*
 * Returns [entry, exit] `FlowNode`s for the passed in AST
 */
function ControlFlowGraph(astNode) {
	'use strict';
	var parentStack = [];

	var exitNode = factoryFlowNode.create(FlowNode.EXIT_NODE_TYPE);
	var catchStack = [exitNode];
	/// try/finally (feature 005, FR-013, research R6): pending targets of the jumps through
	/// each non-empty finally block, the try statements whose finally block is entered by
	/// the normal completion of the try block or a catch body, the try statements with a
	/// non-empty finally block (in post-order, with their outer handler), the end marker
	/// of each non-empty finally block (a temporary node the normal completion of its last
	/// statements goes to, so they are told apart from the jumps in it to the successor
	/// of the try statement) and the number of queries in progress (a query does not
	/// record a normal entry)
	var pendingTargets = new Map(),
		normalEntries = new Set(),
		finallyTries = [],
		endMarkers = new Map(), /// try statement -> end marker of its finally block
		queries = 0;
	createNodes(astNode);
	linkSiblings(astNode);
	
	walker(astNode, {
		CatchClause: function (node, recurse) {
			node.cfg.connect(getEntry(node.body));
			recurse(node.body);
		},
		DoWhileStatement: function (node, recurse) {
			mayThrow(node.test);
			node.test.cfg
				.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
				.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			recurse(node.body);
		},
		ExpressionStatement: connectNext,
		DebuggerStatement: connectNext,
		/// a labeled statement has no node of its own: it is entered at its body
		LabeledStatement: function (node, recurse) {
			recurse(node.body);
		},
		/// with: a node evaluating the object, then the body
		WithStatement: function (node, recurse) {
			if (expressionThrows(node.object)) {
				node.cfg.connect(getExceptionTarget(node), FlowNode.EXCEPTION_CONNECTION_TYPE);
			}
			node.cfg.connect(getEntry(node.body));
			recurse(node.body);
		},
		ClassDeclaration: connectNext,
		ClassBody: function () {},
		/// ES modules: an import or a re-export is a statement; an exported
		/// declaration is analyzed as the declaration itself
		ImportDeclaration: connectNext,
		ExportAllDeclaration: connectNext,
		ExportNamedDeclaration: function (node, recurse) {
			if (node.declaration) {
				recurse(node.declaration);
			} else {
				connectNext(node);
			}
		},
		ExportDefaultDeclaration: function (node, recurse) {
			if (isExportedDeclaration(node)) {
				recurse(node.declaration);
			} else {
				connectNext(node);
			}
		},
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
		ArrowFunctionExpression: function () {},
		ForStatement: function (node, recurse) {
			if (node.test) {
				mayThrow(node.test);
				node.test.cfg
					.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
					.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
				if (node.update) {
					node.update.cfg.connect(node.test.cfg);
				}
			} else if (node.update) {
				node.update.cfg.connect(getEntry(node.body));
			}
			if (node.update) {
				mayThrow(node.update);
			}
			if (node.init) {
				mayThrow(node.init);
				node.init.cfg.connect(node.test && node.test.cfg || getEntry(node.body));
			}
			recurse(node.body);
		},
		ForInStatement: forInOrOfStatement,
		ForOfStatement: forInOrOfStatement,
		IfStatement: function (node, recurse) {
			recurse(node.consequent);
			mayThrow(node.test);
			node.test.cfg.connect(getEntry(node.consequent), FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			if (node.alternate) {
				recurse(node.alternate);
				node.test.cfg.connect(getEntry(node.alternate), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			} else {
				node.test.cfg.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			}
		},
		ReturnStatement: function (node) {
			mayThrow(node);
			node.cfg.connect(routeJump(node, null, exitNode));
		},
		SwitchCase: function (node, recurse) {
			if (node.test) {
				// if this is a real case, connect `true` to the body
				// or the body of the next case
				var check = node;
				while (!check.consequent.length && check.cfg.nextSibling) {
					check = check.cfg.nextSibling.astNode;
				}
				node.cfg.connect(check.consequent.length && getEntry(check.consequent[0]) || getSuccessor(node.cfg.parent), FlowNode.TRUE_BRANCH_CONNECTION_TYPE);

				// and connect false to the next `case`
				node.cfg.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			} else {
				// this is the `default` case, connect it to the body, or the
				// successor of the parent
				node.cfg.connect(node.consequent.length && getEntry(node.consequent[0]) || getSuccessor(node.cfg.parent));
			}
			node.consequent.forEach(recurse);
		},
		SwitchStatement: function (node, recurse) {
			node.cfg.connect(node.cases[0].cfg);
			/// the exception target where the discriminant is evaluated (a property, not an edge)
			node.cases[0].cfg.discriminantThrowTarget = getExceptionTarget(node);
			node.cases.forEach(recurse);
		},
		ThrowStatement: function (node) {
			node.cfg.connect(getExceptionTarget(node), FlowNode.EXCEPTION_CONNECTION_TYPE);
		},
		TryStatement: function (node, recurse) {
			// ESTree uses a single `handler`; esprima 1.x used a `handlers` array
			var catchClause = node.handler || (node.handlers && node.handlers[0]) || null;
			var outerHandler = getExceptionTarget();
			/// an empty finally block (no node) is the same as no finally block
			var finallyEntry = hasNonEmptyFinalizer(node) ? finallyEntryOf(node) : null;
			catchStack.push(catchClause && catchClause.cfg || finallyEntry || outerHandler);
			recurse(node.block);
			catchStack.pop();

			if (catchClause) {
				// an exception in the catch body runs the finally block first
				if (finallyEntry) {
					catchStack.push(finallyEntry);
				}
				recurse(catchClause);
				if (finallyEntry) {
					catchStack.pop();
				}
			}
			if (node.finalizer) {
				recurse(node.finalizer);
			}
			if (finallyEntry) {
				finallyTries.push({tryStatement: node, finallyEntry: finallyEntry, outerHandler: outerHandler});
			}
		},
		VariableDeclaration: connectNext,
		WhileStatement: function (node, recurse) {
			mayThrow(node.test);
			node.test.cfg
				.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
				.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			recurse(node.body);
		}
	});

	/// for-in and for-of: the loop node takes the next value (true) or exits (false)
	function forInOrOfStatement(node, recurse) {
		mayThrow(node);
		node.cfg
			.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
			.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		recurse(node.body);
	}

	var entryNode = factoryFlowNode.create(FlowNode.ENTRY_NODE_TYPE, astNode);
	entryNode.connect(getEntry(astNode), FlowNode.NORMAL_CONNECTION_TYPE);
	// continue the non-empty finally blocks (inner ones first), before the cfg
	// properties are deleted and before the branch splitting
	finallyTries.forEach(connectFinallyExit);
	walker(astNode, {default: function (node, recurse) {
		if (!node.cfg) {
			return;
		}
		// ExpressionStatements should refer to their expression directly
		if (node.type === 'ExpressionStatement') {
			node.cfg.astNode = node.expression;
		}
		// a with node refers to its object expression, not to its body
		if (node.type === 'WithStatement') {
			node.cfg.astNode = node.object;
			node.cfg.isWithObject = true;
		}
		delete node.cfg;
		walker.checkProps(node, recurse);
	}});

	// split conditional and short-circuit expressions into decision and leaf
	// nodes (dujs branchsplitter.js), before the nodes are ordered and numbered
	branchsplitter.split(entryNode, {expressionThrows: expressionThrows});

	var allNodes = [];
	var reverseStack = [entryNode];
	var cfgNode;
	while (reverseStack.length) {
		cfgNode = reverseStack.pop();
		allNodes.push(cfgNode);
		[
			FlowNode.FINALLY_CONNECTION_TYPE,
			FlowNode.EXCEPTION_CONNECTION_TYPE,
			FlowNode.FALSE_BRANCH_CONNECTION_TYPE,
			FlowNode.TRUE_BRANCH_CONNECTION_TYPE,
			FlowNode.NORMAL_CONNECTION_TYPE
		].forEach(eachType);
	}
	/* esgraph creates a graph with five kinds of connection types: finally (from a finallyExit node), exception, false, true and normal */
	function eachType(type) {
		var next = cfgNode[type];
		if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
			next.forEach(function (node) {
				if (reverseStack.indexOf(node) === -1 && allNodes.indexOf(node) === -1) {
					reverseStack.push(node);
				}
			});
		} else if (!!next && reverseStack.indexOf(next) === -1 && allNodes.indexOf(next) === -1) {
			reverseStack.push(next);
		}
	}

	function getExceptionTarget() {
		return catchStack[catchStack.length - 1];
	}

	function mayThrow(node) {
		if (expressionThrows(node)) {
			node.cfg.connect(getExceptionTarget(node), FlowNode.EXCEPTION_CONNECTION_TYPE);
		}
	}
	function expressionThrows(astNode) {
		if (typeof astNode !== 'object' || !astNode || 'FunctionExpression' === astNode.type || 'ArrowFunctionExpression' === astNode.type) {
			return false;
		}
		if (astNode.type && throwTypes.indexOf(astNode.type) !== -1) {
			return true;
		}
		var self = astNode;
		return Object.keys(self).some(function (key) {
			var prop = self[key];
			if (prop instanceof Array) {
				return prop.some(expressionThrows);
			} else if (typeof prop === 'object' && prop) {
				return expressionThrows(prop);
			}
			else {
				return false;
			}
		});
	}

	/**
	 * Returns the statement a break/continue jumps out of: the innermost
	 * statement of the given types, or, for a labeled jump, the
	 * LabeledStatement of the same label (break) or the loop it labels (continue)
	 */
	function getJumpTarget(astNode, types) {
		var parent = astNode.cfg.parent;
		if (astNode.label) {
			while (!!parent && !(parent.type === 'LabeledStatement' && parent.label.name === astNode.label.name)) {
				parent = parent.cfg.parent;
			}
			if (!parent || astNode.type === 'BreakStatement') {
				return parent || null;
			}
			while (parent.type === 'LabeledStatement') {
				parent = parent.body;
			}
			return parent;
		}
		while (types.indexOf(parent.type) === -1 && !!parent.cfg.parent) {
			parent = parent.cfg.parent;
		}
		return (types.indexOf(parent.type) !== -1) ? parent : null;
	}

	function isExportedDeclaration(exportNode) {
		var declaration = exportNode.declaration;
		return !!declaration && (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration' ||
			declaration.type === 'VariableDeclaration');
	}

	function connectNext(node) {
		mayThrow(node);
		node.cfg.connect(getSuccessor(node));
	}

	/**
	 * Returns the entry node of a statement
	 */
	function getEntry(astNode) {
		var target;
		switch (astNode.type) {
			case 'BreakStatement':
				target = getJumpTarget(astNode, breakTargets);
				return routeJump(astNode, target, target ? getSuccessor(target) : exitNode);
			case 'ContinueStatement':
				target = getJumpTarget(astNode, continueTargets);
				switch (target.type) {
					case 'ForStatement':
						// continue goes to the update, test or body
						return routeJump(astNode, target,
							target.update && target.update.cfg || target.test && target.test.cfg || getEntry(target.body));
					case 'ForInStatement':
					/* falls through */
					case 'ForOfStatement':
						return routeJump(astNode, target, target.cfg);
					case 'DoWhileStatement':
					/* falls through */
					case 'WhileStatement':
						return routeJump(astNode, target, target.test.cfg);
				}
			// unreached
			/* falls through */
			case 'BlockStatement':
			/* falls through */
			case 'Program':
				return astNode.body.length && getEntry(astNode.body[0]) || getSuccessor(astNode);
			case 'DoWhileStatement':
				return getEntry(astNode.body);
			case 'EmptyStatement':
				return getSuccessor(astNode);
			case 'ExportNamedDeclaration':
			/* falls through */
			case 'ExportDefaultDeclaration':
				return isExportedDeclaration(astNode) ? getEntry(astNode.declaration) : astNode.cfg;
			case 'ForStatement':
				return astNode.init && astNode.init.cfg || astNode.test && astNode.test.cfg || getEntry(astNode.body);
			case 'FunctionDeclaration':
				return getSuccessor(astNode);
			case 'IfStatement':
				return astNode.test.cfg;
			case 'LabeledStatement':
				return getEntry(astNode.body);
			case 'SwitchStatement':
				return getEntry(astNode.cases[0]);
			case 'TryStatement':
				return getEntry(astNode.block);
			case 'WhileStatement':
				return astNode.test.cfg;
			default:
				return astNode.cfg;
		}
	}
	/**
	 * Returns the successor node of a statement
	 */
	function getSuccessor(astNode) {
		// part of a block -> it already has a nextSibling
		if (astNode.cfg.nextSibling) {
			return astNode.cfg.nextSibling;
		}
		var parent = astNode.cfg.parent;
		if (!parent) { // it has no parent -> exitNode
			return exitNode;
		}
		switch (parent.type) {
			case 'DoWhileStatement':
				return parent.test.cfg;
			case 'ForStatement':
				return parent.update && parent.update.cfg || parent.test && parent.test.cfg || getEntry(parent.body);
			case 'ForInStatement':
			/* falls through */
			case 'ForOfStatement':
				return parent.cfg;
			case 'TryStatement':
				// the end of the try block or of the catch clause enters a non-empty finally block
				// normally; the end of a non-empty finally block goes to its end marker (resolved by
				// connectFinallyExit); the end of an empty one goes on after the try statement
				if (hasNonEmptyFinalizer(parent)) {
					if (astNode === parent.finalizer) {
						return endMarkerOf(parent);
					}
					if (queries === 0) {
						normalEntries.add(parent);
					}
					return finallyEntryOf(parent);
				}
				return getSuccessor(parent);
			case 'SwitchCase':
				// the sucessor of a statement at the end of a case block is
				// the entry of the next cases consequent
				if (!parent.cfg.nextSibling) {
					return getSuccessor(parent);
				}
				var check = parent.cfg.nextSibling.astNode;
				while (!check.consequent.length && check.cfg.nextSibling) {
					check = check.cfg.nextSibling.astNode;
				}
				// or the next statement after the switch, if there are no more cases
				return check.consequent.length && getEntry(check.consequent[0]) || getSuccessor(parent.parent);
			case 'WhileStatement':
				return parent.test.cfg;
			default:
				return getSuccessor(parent);
		}
	}

	/**
	 * Run a function as a query: getSuccessor does not record normal entries of finally blocks
	 * @param {Function} fn
	 * @returns {*} the result of fn
	 */
	function query(fn) {
		queries++;
		try {
			return fn();
		} finally {
			queries--;
		}
	}

	/**
	 * Whether a try statement has a non-empty finally block: one with a statement
	 * other than an empty statement, an empty block, a function declaration or a
	 * labeled empty statement (`finally {}` and `finally { ; }` are the same as no
	 * finally block; `finally { continue; }` is not empty)
	 * @param {Object} tryStatement
	 * @returns {boolean}
	 */
	function hasNonEmptyFinalizer(tryStatement) {
		return !!tryStatement.finalizer && !isEmptyStatement(tryStatement.finalizer);
	}

	/**
	 * Whether a statement has no node and no jump
	 * @param {Object} statement AST
	 * @returns {boolean}
	 */
	function isEmptyStatement(statement) {
		switch (statement.type) {
			case 'EmptyStatement':
			/* falls through */
			case 'FunctionDeclaration':
				return true;
			case 'BlockStatement':
				return statement.body.every(isEmptyStatement);
			case 'LabeledStatement':
				return isEmptyStatement(statement.body);
			default:
				return false;
		}
	}

	/**
	 * The end marker of the non-empty finally block of a try statement: a temporary
	 * node (not in the CFG) the normal completion of the finally block goes to
	 * @param {Object} tryStatement
	 * @returns {FlowNode}
	 */
	function endMarkerOf(tryStatement) {
		if (!endMarkers.has(tryStatement)) {
			endMarkers.set(tryStatement, new FlowNode(FlowNode.NORMAL_NODE_TYPE));
		}
		return endMarkers.get(tryStatement);
	}

	/**
	 * The entry node of the finally block of a try statement
	 * @param {Object} tryStatement
	 * @returns {FlowNode}
	 */
	function finallyEntryOf(tryStatement) {
		return query(function () {
			return getEntry(tryStatement.finalizer);
		});
	}

	/**
	 * The node a jump (return, break or continue) goes to: the entry of the first
	 * non-empty finally block it leaves (from the try block or the catch clause, not
	 * from the finally block itself), else its target. Each finally block passed
	 * through gets the next one (or the target) as a pending target. The try
	 * statements left are found statically on the parent chain up to the target
	 * statement (up to the root of the CFG, the body of the function, for a return),
	 * so a call is idempotent.
	 * @param {Object} jump AST of the jump
	 * @param {Object|null} targetStatement statement the jump goes out of (null: the root)
	 * @param {FlowNode} target node the jump goes to without finally blocks
	 * @returns {FlowNode}
	 */
	function routeJump(jump, targetStatement, target) {
		var crossed = [],
			child = jump,
			parent = jump.cfg.parent;
		while (!!parent && parent !== targetStatement) {
			if (parent.type === 'TryStatement' && child !== parent.finalizer && hasNonEmptyFinalizer(parent)) {
				crossed.push(parent);
			}
			child = parent;
			parent = parent.cfg.parent;
		}
		var destination = target;
		for (var index = crossed.length - 1; index >= 0; index--) {
			var pending = pendingTargets.get(crossed[index]) || [];
			if (pending.indexOf(destination) === -1) {
				pending.push(destination);
			}
			pendingTargets.set(crossed[index], pending);
			destination = finallyEntryOf(crossed[index]);
		}
		return destination;
	}

	/**
	 * Continue a non-empty finally block (data-model §8): when it is entered by an
	 * exception or by a jump, its ends (its nodes going on after the try statement,
	 * return statements excepted) go to a new finallyExit node, which has a normal
	 * edge after the try statement (normal entry), an exception edge to the outer
	 * handler (exceptional entry) and a finally edge to each pending target
	 * @param {Object} record {tryStatement, finallyEntry, outerHandler}
	 */
	function connectFinallyExit(record) {
		var tryStatement = record.tryStatement,
			marker = endMarkers.get(tryStatement),
			ends = marker ? marker.prev.filter(function (node, index, all) {
				return all.indexOf(node) === index;
			}) : [];
		if (ends.length === 0) {
			// the finally block never completes normally
			return;
		}
		var successor = query(function () {
				return getSuccessor(tryStatement);
			}),
			pending = pendingTargets.get(tryStatement) || [],
			normal = normalEntries.has(tryStatement),
			exceptional = record.finallyEntry.prev.some(function (node) {
				return node.exception === record.finallyEntry;
			});
		if (normal) {
			// record the normal entry of an outer finally block
			getSuccessor(tryStatement);
		}
		var finallyExit = null;
		if (exceptional || pending.length > 0) {
			var end = tryStatement.finalizer.loc && tryStatement.finalizer.loc.end;
			finallyExit = factoryFlowNode.createFinallyExitNode(end ? end.line : undefined,
				end ? end.column - 1 : undefined);
		}
		// entered only by the normal completion, it goes on after the try statement
		redirect(ends, marker, finallyExit || successor);
		if (!finallyExit) {
			return;
		}
		if (normal) {
			finallyExit.connect(successor, FlowNode.NORMAL_CONNECTION_TYPE);
		}
		if (exceptional) {
			finallyExit.connect(record.outerHandler, FlowNode.EXCEPTION_CONNECTION_TYPE);
		}
		pending.forEach(function (target) {
			finallyExit.connect(target, FlowNode.FINALLY_CONNECTION_TYPE);
		});
	}

	/**
	 * Move the connections of nodes to a node onto another node, keeping their types
	 * @param {Array} nodes
	 * @param {FlowNode} from
	 * @param {FlowNode} to
	 */
	function redirect(nodes, from, to) {
		nodes.forEach(function (node) {
			var types = [];
			FlowNode.CONNECTION_TYPES.forEach(function (type) {
				if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
					node[type].forEach(function (next) {
						if (next === from) {
							types.push(type);
						}
					});
				} else if (node[type] === from) {
					types.push(type);
				}
			});
			while (node.next.indexOf(from) !== -1 || from.prev.indexOf(node) !== -1) {
				node.disconnect(from);
			}
			types.forEach(function (type) {
				node.connect(to, type);
			});
		});
	}

	/**
	 * Creates a FlowNode for every AST node
	 */
	function createNodes(astNode) {
		walker(astNode, { default: function (node, recurse) {
			var parent = parentStack.length ? parentStack[parentStack.length - 1] : undefined;
			createNode(node, parent);
			// do not recurse for FunctionDeclaration or any sub-expression
			if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' || node.type === 'FunctionExpression' || node.type.indexOf('Expression') !== -1) {
				return;
			}
			parentStack.push(node);
			walker.checkProps(node, recurse);
			parentStack.pop();
		}});
	}
	function createNode(astNode, parent) {
		if (!astNode.cfg) {
			var newNode = factoryFlowNode.create(FlowNode.NORMAL_NODE_TYPE, astNode, parent);
			Object.defineProperty(astNode, 'cfg', {value: newNode, configurable: true});
		}
	}

	/**
	 * Links in the next sibling for nodes inside a block
	 */
	function linkSiblings(astNode) {
		function backToFront(list, recurse) {
			// link all the children to the next sibling from back to front,
			// so the nodes already have .nextSibling
			// set when their getEntry is called
			for (var i = list.length - 1; i >= 0; i--) {
				var child = list[i];
				if (i < list.length - 1) {
					child.cfg.nextSibling = getEntry(list[i + 1]);
				}
				recurse(child);
			}
		}
		function BlockOrProgram(node, recurse) {
			backToFront(node.body, recurse);
		}
		walker(astNode, {
			BlockStatement: BlockOrProgram,
			Program: BlockOrProgram,
			FunctionDeclaration: function () {},
			FunctionExpression: function () {},
			ArrowFunctionExpression: function () {},
			ClassBody: function () {},
			SwitchCase: function (node, recurse) {
				backToFront(node.consequent, recurse);
			},
			SwitchStatement: function (node, recurse) {
				backToFront(node.cases, recurse);
			},
			// the finally block first: the jumps in the try block and the catch clause
			// look for its entry while their siblings are linked
			TryStatement: function (node, recurse) {
				if (node.finalizer) {
					recurse(node.finalizer);
				}
				recurse(node.block);
				var catchClause = node.handler || (node.handlers && node.handlers[0]) || null;
				if (catchClause) {
					recurse(catchClause);
				}
			}
		});
	}
	/// Reset cfgIds to skip those nodes not shown in CFG
	/// Reset to the first created node in this CFG
	factoryFlowNode.setCounter(entryNode.cfgId);
	allNodes.forEach(function (node, index) {
		node.cfgId = factoryFlowNode.counter + index;
	});
	factoryFlowNode.setCounter(entryNode.cfgId + allNodes.length);
	//factoryFlowNode.setCounter(allNodes.length);
	//allNodes.forEach(function (node, index) {
	//	node.cfgId = index;
	//});
	return [entryNode, exitNode, allNodes];
}

var continueTargets = [
	'ForStatement',
	'ForInStatement',
	'ForOfStatement',
	'DoWhileStatement',
	'WhileStatement'];
var breakTargets = continueTargets.concat(['SwitchStatement']);
var throwTypes = [
	'AssignmentExpression', // assigning to undef or non-writable prop
	'BinaryExpression', // instanceof and in on non-objects
	'CallExpression', // obviously
	'MemberExpression', // getters may throw
	'NewExpression', // obviously
	'UnaryExpression' // delete non-deletable prop
];

/**
 * Node types whose evaluation may throw (a copy; changing it does not change the graphs)
 * @type {Array}
 */
module.exports.throwTypes = throwTypes.slice();
