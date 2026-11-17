/*
 * Resolution of the callees of a call-site (specs/004-fix-remaining-issues,
 * FR-002, FR-003, FR-017, FR-018, User Story 3, research R2,
 * contracts/model-api §6).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * A node is a call-site when its AST node is a CallExpression or a
 * NewExpression, or it is the return statement of an instance field
 * initializer (marked dujsFieldInitializer by lib/dujs/scopetree.js) whose
 * argument is this.m() or new B() (FR-017). The callee variable of f(...),
 * new F(...), new A(...), new A(...).m(...) and A.s(...) is resolved by the
 * strict rule: its definitions reaching the node (the ReachIn set of the
 * intra-procedural original) are at least one and all refer to the same
 * function or the same class. When none of its definitions reaches the node,
 * a class (not a function) is resolved when the variable has only one
 * definition in the GEN sets of all the intra-procedural models of the page
 * and the definition is the class (class relaxation). When none reaches f(...)
 * (a CallExpression, not new) in a function, a function is resolved when the
 * variable has only one definition on the page, the definition is the
 * function and the binding may be relaxed (scopebinding isRelaxedCallee:
 * function, let, const or the name of a named function expression; feature
 * 005 D2, FR-005, research R8), self and mutual recursion included. this.m(...) is resolved
 * by the member of a class the node is directly in (not in an arrow function
 * or a function of the member), o.m(...) by the definitions of o reaching the
 * node, all new A(...) of the same class. Only own methods (kind 'method',
 * not computed, not private) are connected: no getters, setters, arrow
 * functions of fields, optional calls nor super classes. Nothing is
 * modified; an unresolved callee gives [].
 */
var Def = require('./def'),
	Scope = require('./scope'),
	modelCtrl = require('./modelctrl');
var walkes = require('walkes');

/**
 * Class index of each page, by its scope tree
 * @type {WeakMap}
 * @private
 */
var classIndexes = new WeakMap();

/**
 * Key of a range
 * @param {Array|Range} range Range of an AST node, or of a definition (Range)
 * @returns {string} 'start,end'
 * @private
 */
function rangeKeyOf(range) {
	'use strict';
	return Array.isArray(range) ? range[0] + ',' + range[1] : range.start + ',' + range.end;
}

/**
 * Information of a class (data-model §2) and the scopes of its members
 * @param {Object} classNode ClassDeclaration or ClassExpression
 * @param {ScopeTree} scopeTree
 * @param {Map} byMemberScope Map(Scope, {classInfo, isStatic}) to add the member scopes to
 * @returns {Object} ClassInfo
 * @private
 */
function createClassInfo(classNode, scopeTree, byMemberScope) {
	'use strict';
	var info = {
		node: classNode,
		rangeKey: rangeKeyOf(classNode.range),
		isDeclaration: classNode.type === 'ClassDeclaration',
		hasSuperClass: !!classNode.superClass,
		constructorScope: null,
		instanceFieldScopes: [],
		instanceMethods: new Map(),
		staticMethods: new Map()
	};
	function addMemberScope(scope, isStatic) {
		if (!!scope) {
			byMemberScope.set(scope, {classInfo: info, isStatic: isStatic});
		}
		return scope;
	}
	classNode.body.body.forEach(function (member) {
		var scope = null;
		if (member.type === 'MethodDefinition') {
			if (member.kind === 'constructor') {
				info.constructorScope = addMemberScope(scopeTree.getScopeByRange(member.value.range), false);
			} else if (member.kind === 'method') {
				scope = addMemberScope(scopeTree.getScopeByRange(member.value.range), !!member.static);
				/// not computed, not private and not a string name
				if (!!scope && !member.computed && member.key.type === 'Identifier') {
					(member.static ? info.staticMethods : info.instanceMethods).set(member.key.name, scope);
				}
			}
		} else if (member.type === 'PropertyDefinition' || member.type === 'StaticBlock') {
			/// a field with a value and a static block run as the scope of a synthetic function
			if (!!member.dujsScopeFunction) {
				var isStatic = member.type === 'StaticBlock' || !!member.static;
				scope = addMemberScope(scopeTree.getScopeByRange(member.dujsScopeFunction.range), isStatic);
				if (!!scope && !isStatic) {
					info.instanceFieldScopes.push(scope);
				}
			}
		}
	});
	return info;
}

/**
 * Get the class index of a page, created once and cached (data-model §2)
 * @param {ScopeTree} scopeTree
 * @returns {Object} {byRange: Map(rangeKey, ClassInfo), byMemberScope: Map(Scope, {classInfo, isStatic}),
 * newExpressionsByRange: Map(rangeKey, NewExpression)}
 */
function classIndexOf(scopeTree) {
	'use strict';
	if (classIndexes.has(scopeTree)) {
		return classIndexes.get(scopeTree);
	}
	var index = {
		byRange: new Map(),
		byMemberScope: new Map(),
		newExpressionsByRange: new Map()
	};
	function classHandler(node, recurse) {
		var info = createClassInfo(node, scopeTree, index.byMemberScope);
		index.byRange.set(info.rangeKey, info);
		walkes.checkProps(node, recurse);
	}
	walkes(scopeTree.root.ast, {
		ClassDeclaration: classHandler,
		ClassExpression: classHandler,
		NewExpression: function (node, recurse) {
			index.newExpressionsByRange.set(rangeKeyOf(node.range), node);
			walkes.checkProps(node, recurse);
		}
	});
	classIndexes.set(scopeTree, index);
	return index;
}

/**
 * Whether an expression is this.m(...)
 * @param {Object} expression
 * @returns {boolean}
 * @private
 */
function isThisMethodCall(expression) {
	'use strict';
	return expression.type === 'CallExpression' && expression.callee.type === 'MemberExpression' &&
		expression.callee.object.type === 'ThisExpression';
}

/**
 * The call expression represented by a node: its AST node when it is a
 * CallExpression or a NewExpression, or the argument this.m() or new B() of
 * the return statement of an instance field initializer (FR-017)
 * @param {FlowNode} node
 * @returns {Object|null} CallExpression, NewExpression or null
 */
function callExpressionOf(node) {
	'use strict';
	var ast = node.astNode;
	if (!ast) {
		return null;
	}
	if (ast.type === 'CallExpression' || ast.type === 'NewExpression') {
		return ast;
	}
	if (ast.type === 'ReturnStatement' && ast.dujsFieldInitializer === true && !!ast.argument &&
		(ast.argument.type === 'NewExpression' || isThisMethodCall(ast.argument))) {
		return ast.argument;
	}
	return null;
}

/**
 * The function or class a definition refers to
 * @param {Def} definition
 * @param {ScopeTree} scopeTree
 * @param {Object} index Class index of the page
 * @returns {Object|null} {scope} of a function, {classInfo} of a class, or null
 * @private
 */
function targetOfDefinition(definition, scopeTree, index) {
	'use strict';
	if (!definition.range || (definition.type !== Def.FUNCTION_TYPE && definition.type !== Def.LITERAL_TYPE)) {
		return null;
	}
	/// a class declaration defines a function, a class expression a literal, of the range of the class
	var classInfo = index.byRange.get(rangeKeyOf(definition.range)) || null;
	if (!!classInfo) {
		return {classInfo: classInfo};
	}
	var scope = (definition.type === Def.FUNCTION_TYPE) ? scopeTree.getScopeByRange(definition.range) : null;
	return !!scope ? {scope: scope} : null;
}

/**
 * Definitions of each variable in the GEN sets of the intra-procedural models
 * of each page, by its scope tree (created once per page: the GEN sets of the
 * intra-procedural models are complete before any call is resolved)
 * @type {WeakMap}
 * @private
 */
var pageDefinitionIndexes = new WeakMap();

/**
 * Get the definitions of each variable in the GEN sets of all the
 * intra-procedural models of a page, created once and cached
 * @param {ScopeTree} scopeTree
 * @returns {Map|null} Map(Var, Array of VarDefs), or null when the page has no models
 * @private
 */
function pageDefinitionIndexOf(scopeTree) {
	'use strict';
	if (pageDefinitionIndexes.has(scopeTree)) {
		return pageDefinitionIndexes.get(scopeTree);
	}
	var pageModels = modelCtrl.collectionOfPageModels.get(scopeTree);
	if (!pageModels) {
		return null;
	}
	var index = new Map(), seen = new Set();
	pageModels.intraProceduralModels.forEach(function (model) {
		model.graph[2].forEach(function (graphNode) {
			if (!graphNode.generate) {
				return;
			}
			graphNode.generate.values().forEach(function (vardef) {
				if (seen.has(vardef)) {
					return;
				}
				seen.add(vardef);
				if (!index.has(vardef.variable)) {
					index.set(vardef.variable, []);
				}
				index.get(vardef.variable).push(vardef);
			});
		});
	});
	pageDefinitionIndexes.set(scopeTree, index);
	return index;
}

/**
 * Definitions of a variable in the GEN sets of all the intra-procedural
 * models of a page; the outer and the inner binding of a class declaration
 * count together, a definition of both (the class node) once (feature 006
 * research R7)
 * @param {Var} variable
 * @param {ScopeTree} scopeTree
 * @returns {Array} VarDefs
 * @private
 */
function definitionsOnThePage(variable, scopeTree) {
	'use strict';
	var index = pageDefinitionIndexOf(scopeTree);
	if (!index) {
		return [];
	}
	var group = !!scopeTree.binding ? scopeTree.binding.classBindingGroupOf(variable) : [variable],
		definitions = [];
	group.forEach(function (member) {
		(index.get(member) || []).forEach(function (vardef) {
			var isSame = definitions.some(function (found) {
				var foundRange = found.definition.range, range = vardef.definition.range;
				return found.definition.fromNode === vardef.definition.fromNode &&
					(foundRange === range || (!!foundRange && !!range && rangeKeyOf(foundRange) === rangeKeyOf(range)));
			});
			if (!isSame) {
				definitions.push(vardef);
			}
		});
	});
	return definitions;
}

/**
 * The Var used by an identifier at a node, through the binding of its page
 * @param {FlowNode} node
 * @param {Object} identifier Identifier node
 * @returns {Var|null}
 * @private
 */
function useVarOf(node, identifier) {
	'use strict';
	var binding = !!node.scope ? node.scope.binding : null;
	return (!!binding && !!identifier && identifier.type === 'Identifier') ? binding.useVarOf(identifier) : null;
}

/**
 * Whether a node is in a function (feature 005 D2): its scope, out of the
 * block scopes around it, is not the page scope (methods, field initializers
 * and static blocks are functions)
 * @param {FlowNode} node
 * @param {ScopeTree} scopeTree
 * @returns {boolean}
 * @private
 */
function isInFunction(node, scopeTree) {
	'use strict';
	var scope = node.scope;
	while (!!scope && scope.type === Scope.BLOCK_TYPE) {
		scope = scope.parent;
	}
	return !!scope && scope !== scopeTree.root;
}

/**
 * Resolve a callee variable at a node (FR-018): its definitions reaching the
 * node are at least one and all refer to the same function or class (strict
 * rule); when none reaches, the only definition of the variable on the page
 * when it is a class (class relaxation), or, for a call f(...) in a function,
 * when it is a function and the binding may be relaxed (D2 of feature 005)
 * @param {FlowNode} node An intra-procedural original
 * @param {Object} identifier Identifier node of the callee
 * @param {ScopeTree} scopeTree
 * @param {string} [expressionType] Type of the expression of the callee;
 * only 'CallExpression' (f(...)) is relaxed to a function
 * @returns {Object|null} {scope} of a function, {classInfo} of a class, or null
 * @private
 */
function resolveVariable(node, identifier, scopeTree, expressionType) {
	'use strict';
	var variable = useVarOf(node, identifier);
	if (!variable) {
		return null;
	}
	var index = classIndexOf(scopeTree),
		reachingDefs = (!!node.reachIns ? node.reachIns.values() : []).filter(function (vardef) {
			return vardef.variable === variable;
		});
	if (reachingDefs.length === 0) {
		var pageDefs = definitionsOnThePage(variable, scopeTree),
			relaxed = (pageDefs.length === 1) ? targetOfDefinition(pageDefs[0].definition, scopeTree, index) : null;
		if (!!relaxed && !!relaxed.classInfo) {
			return relaxed;
		}
		/// D2: {classInfo} is not taken (the inner name of a class expression is also a namedExpressionName)
		return (expressionType === 'CallExpression' && !!relaxed && !!relaxed.scope && isInFunction(node, scopeTree) &&
			!!scopeTree.binding && scopeTree.binding.isRelaxedCallee(variable)) ? relaxed : null;
	}
	var target = null, resolved = true;
	reachingDefs.forEach(function (vardef) {
		var current = targetOfDefinition(vardef.definition, scopeTree, index);
		if (!current) {
			resolved = false;
		} else if (!target) {
			target = current;
		} else if (target.scope !== current.scope || target.classInfo !== current.classInfo) {
			resolved = false;
		}
	});
	return resolved ? target : null;
}

/**
 * The class of the definitions of o reaching a node (o.m(...)): they are at
 * least one and each is the range of a new A(...) whose A is resolved, at the
 * node of the definition, to the same class
 * @param {FlowNode} node An intra-procedural original
 * @param {Object} identifier Identifier node of o
 * @param {ScopeTree} scopeTree
 * @returns {Object|null} ClassInfo or null
 * @private
 */
function classOfInstance(node, identifier, scopeTree) {
	'use strict';
	var variable = useVarOf(node, identifier);
	if (!variable) {
		return null;
	}
	var index = classIndexOf(scopeTree),
		reachingDefs = (!!node.reachIns ? node.reachIns.values() : []).filter(function (vardef) {
			return vardef.variable === variable;
		});
	if (reachingDefs.length === 0) {
		return null;
	}
	var classInfo = null, resolved = true;
	reachingDefs.forEach(function (vardef) {
		var definition = vardef.definition,
			newExpression = !!definition.range ? index.newExpressionsByRange.get(rangeKeyOf(definition.range)) : null,
			target = (!!newExpression && newExpression.callee.type === 'Identifier') ?
				resolveVariable(definition.fromNode, newExpression.callee, scopeTree) : null;
		if (!target || !target.classInfo || (!!classInfo && classInfo !== target.classInfo)) {
			resolved = false;
		} else {
			classInfo = target.classInfo;
		}
	});
	return resolved ? classInfo : null;
}

/**
 * The callees of new X(...): the function F, or the instance field
 * initializers (in source order) and the constructor of the class A
 * @param {Object} target {scope} of a function or {classInfo} of a class
 * @returns {Array} Scopes
 * @private
 */
function calleeScopesOfNew(target) {
	'use strict';
	if (!!target.scope) {
		return [target.scope];
	}
	var classInfo = target.classInfo;
	return classInfo.instanceFieldScopes.concat(!!classInfo.constructorScope ? [classInfo.constructorScope] : []);
}

/**
 * The scopes called by a method call x.m(...) (research R2): new A(...).m(...),
 * A.s(...), this.m(...) and o.m(...)
 * @param {FlowNode} node An intra-procedural original
 * @param {Object} expression CallExpression whose callee is a MemberExpression
 * @param {ScopeTree} scopeTree
 * @returns {Array} Scopes
 * @private
 */
function calleeScopesOfMethodCall(node, expression, scopeTree) {
	'use strict';
	var member = expression.callee,
		object = member.object;
	/// not private, not computed (nor a string name), not an optional call
	if (member.computed || member.optional || expression.optional || member.property.type !== 'Identifier') {
		return [];
	}
	var name = member.property.name, method, target;
	if (object.type === 'NewExpression') {
		target = (object.callee.type === 'Identifier') ? resolveVariable(node, object.callee, scopeTree) : null;
		if (!target) {
			return [];
		}
		/// new F().m() of a function F: F only
		method = !!target.classInfo ? target.classInfo.instanceMethods.get(name) : null;
		return calleeScopesOfNew(target).concat(!!method ? [method] : []);
	}
	if (object.type === 'ThisExpression') {
		/// the scope of the node is the member itself (not an arrow function or a function in it)
		var memberOfClass = !!node.scope ? classIndexOf(scopeTree).byMemberScope.get(node.scope) : null;
		if (!memberOfClass) {
			return [];
		}
		method = (memberOfClass.isStatic ? memberOfClass.classInfo.staticMethods :
			memberOfClass.classInfo.instanceMethods).get(name);
		return !!method ? [method] : [];
	}
	if (object.type !== 'Identifier') {
		return [];
	}
	target = resolveVariable(node, object, scopeTree);
	if (!!target) {
		/// A.s(...) of a class A
		method = !!target.classInfo ? target.classInfo.staticMethods.get(name) : null;
		return !!method ? [method] : [];
	}
	/// o.m(...) of o = new A(...): m only (not the constructor)
	var classInfo = classOfInstance(node, object, scopeTree);
	method = !!classInfo ? classInfo.instanceMethods.get(name) : null;
	return !!method ? [method] : [];
}

/**
 * The scopes called by a node in the order they run (research R2): the
 * function f of f(...) and the function F of new F(...); the instance field
 * initializers (in source order) and then the constructor of the class A of
 * new A(...), not following extends; those of new A(...) and then the
 * instance method m of new A(...).m(...) (F only of new F().m()); the static
 * method s of A.s(...); the method m of this.m(...) in a member of a class
 * (an instance method in an instance member, a static method in a static
 * member; overriding in sub classes is not considered); the instance method
 * m of o.m(...) of o = new A(...). Static members of the classes defined at
 * the node are not included. Nothing found gives []
 * @param {FlowNode} node An intra-procedural original
 * @param {ScopeTree} scopeTree
 * @returns {Array} Scopes
 */
function calleeScopesOf(node, scopeTree) {
	'use strict';
	var expression = callExpressionOf(node);
	if (!expression) {
		return [];
	}
	return calleeScopesOfExpression(node, expression, scopeTree);
}

/**
 * The scopes called by one call or new expression evaluated at a node, in the
 * order they run (feature 007 research R7): the rules of calleeScopesOf
 * applied to the expression (004 FR-018, 005 FR-005 D2): a CallExpression
 * whose callee is a member by calleeScopesOfMethodCall, a NewExpression by
 * calleeScopesOfNew. Nothing found gives []
 * @param {FlowNode} node An intra-procedural original (its ReachIn resolves the callee)
 * @param {Object} expression CallExpression or NewExpression
 * @param {ScopeTree} scopeTree
 * @returns {Array} Scopes
 */
function calleeScopesOfExpression(node, expression, scopeTree) {
	'use strict';
	if (!expression || (expression.type !== 'CallExpression' && expression.type !== 'NewExpression') ||
		!expression.callee) {
		return [];
	}
	if (expression.type === 'CallExpression' && expression.callee.type === 'MemberExpression') {
		return calleeScopesOfMethodCall(node, expression, scopeTree);
	}
	if (expression.callee.type !== 'Identifier' || !!expression.optional) {
		return [];
	}
	var target = resolveVariable(node, expression.callee, scopeTree, expression.type);
	if (!target || (!target.scope && expression.type !== 'NewExpression')) {
		return [];
	}
	return calleeScopesOfNew(target);
}

// 007 US2 縮小、US3 移除
/**
 * Phase predicate of callsplit.planOf (temporary, DECISION 006 Q2, plan
 * "階段性的呼叫點篩選"; contracts/lib-api.md §1): in User Story 1 only the call
 * sites connected by develop are kept, the call expression of the node itself
 * (callExpressionOf) and the classes with static members, and none for the
 * once-* shapes (switch discriminant, right side of for-in/for-of)
 * @param {Object} entry candidate call site {expression, kind, callees}
 * @param {FlowNode} node An intra-procedural original
 * @param {string} shape Shape of the plan of the node
 * @returns {boolean}
 */
function stagedCallSite(entry, node, shape) {
	'use strict';
	if (shape === 'once-switch' || shape === 'once-loop') {
		return false;
	}
	return entry.kind === 'class-static' || entry.expression === callExpressionOf(node);
}

module.exports = {
	calleeScopesOf: calleeScopesOf,
	calleeScopesOfExpression: calleeScopesOfExpression,
	callExpressionOf: callExpressionOf,
	classIndexOf: classIndexOf,
	stagedCallSite: stagedCallSite
};
