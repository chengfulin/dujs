/*
 * Resolution of the callees of a call-site (specs/004-fix-remaining-issues,
 * FR-002, FR-003, FR-017, FR-018, research R2, contracts/model-api §6).
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * A node is a call-site when its AST node is a CallExpression or a
 * NewExpression, or it is the return statement of an instance field
 * initializer (marked dujsFieldInitializer by lib/dujs/scopetree.js) whose
 * argument is this.m() or new B() (FR-017). The callee variable of f(...),
 * new F(...) and new A(...) is resolved by the strict rule: its definitions
 * reaching the node (the ReachIn set of the intra-procedural original) are
 * at least one and all refer to the same function or the same class. When
 * none of its definitions reaches the node, a class (not a function) is
 * resolved when the variable has only one definition in the GEN sets of all
 * the intra-procedural models of the page and the definition is the class
 * (class relaxation). Nothing is modified; an unresolved callee gives [].
 */
var Def = require('./def'),
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
 * Definitions of a variable in the GEN sets of all the intra-procedural
 * models of a page
 * @param {Var} variable
 * @param {ScopeTree} scopeTree
 * @returns {Array} VarDefs
 * @private
 */
function definitionsOnThePage(variable, scopeTree) {
	'use strict';
	var vardefs = [],
		pageModels = modelCtrl.collectionOfPageModels.get(scopeTree);
	if (!pageModels) {
		return vardefs;
	}
	pageModels.intraProceduralModels.forEach(function (model) {
		model.graph[2].forEach(function (graphNode) {
			if (!graphNode.generate) {
				return;
			}
			graphNode.generate.values().forEach(function (vardef) {
				if (vardef.variable === variable && vardefs.indexOf(vardef) === -1) {
					vardefs.push(vardef);
				}
			});
		});
	});
	return vardefs;
}

/**
 * Resolve a callee variable at a node (FR-018): its definitions reaching the
 * node are at least one and all refer to the same function or class (strict
 * rule); when none reaches, the only definition of the variable on the page
 * when it is a class (class relaxation; not for a function)
 * @param {FlowNode} node An intra-procedural original
 * @param {string} name
 * @param {ScopeTree} scopeTree
 * @returns {Object|null} {scope} of a function, {classInfo} of a class, or null
 * @private
 */
function resolveVariable(node, name, scopeTree) {
	'use strict';
	var variable = !!node.scope ? node.scope.getVariable(name) : null;
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
		return (!!relaxed && !!relaxed.classInfo) ? relaxed : null;
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
 * The scopes called by a node in the order they run (research R2): the
 * function f of f(...) and the function F of new F(...); the instance field
 * initializers (in source order) and then the constructor of the class A of
 * new A(...), not following extends. Static members of the classes defined
 * at the node are not included. Nothing found gives []
 * @param {FlowNode} node An intra-procedural original
 * @param {ScopeTree} scopeTree
 * @returns {Array} Scopes
 */
function calleeScopesOf(node, scopeTree) {
	'use strict';
	var expression = callExpressionOf(node);
	if (!expression || !expression.callee || expression.callee.type !== 'Identifier') {
		return [];
	}
	var target = resolveVariable(node, expression.callee.name, scopeTree);
	if (!target) {
		return [];
	}
	if (!!target.scope) {
		return [target.scope];
	}
	if (expression.type !== 'NewExpression') {
		return [];
	}
	var classInfo = target.classInfo;
	return classInfo.instanceFieldScopes.concat(!!classInfo.constructorScope ? [classInfo.constructorScope] : []);
}

module.exports = {
	calleeScopesOf: calleeScopesOf,
	callExpressionOf: callExpressionOf,
	classIndexOf: classIndexOf
};
