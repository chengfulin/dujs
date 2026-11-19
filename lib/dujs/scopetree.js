/*
 * ScopeTree module
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var Scope = require('./scope'),
	factoryScope = require('./scopefactory'),
    Range = require('./range'),
	factoryRange = require('./rangefactory');
var walkes = require('walkes');
var namespace = require('../namespace'),
	internal = namespace();

/**
 * ScopeTree inside a page
 * @constructor
 */
function ScopeTree() {
    'use strict';
    internal(this)._scopes = [];
    internal(this)._mapFromNameToScope = new Map(); /// (Range text, Scope)
    internal(this)._mapFromRangeToScope = new Map(); /// (Parent scope + Range text, Scope)
    internal(this)._root = null;
    internal(this)._blockScopes = []; /// block scopes, which own no model

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-private-methods */
/**
 * Recursively get the representation text of a function scope
 * @param   {Scope}     currentScope    Current function scope
 * @param   {number}    level           Level of the current scope located in the tree (>= 0)
 * @returns {string}    String representation
 * @memberof ScopeTree
 * @private
 */
function recursivelyGetScopeText(currentScope, level) {
	'use strict';
	var currentLevel = level || 0,
		representation = '';
	if (Scope.isScope(currentScope)) {
		representation += (currentLevel === 0)? '' : '\n';
		representation += getScopeRepresentation(currentScope, currentLevel);
		currentScope.children.forEach(function (val) {
			representation += recursivelyGetScopeText(val, currentLevel + 1);
		});
	}
	return representation;
}

/**
 * Get the representation of a function scope with indent
 * @param   {Scope}     scope A scope
 * @param   {number}    level Level of the current scope located in the tree to compute the indent
 * @returns {string}    String representation for a scope with indent
 * @memberof ScopeTree
 * @private
 */
function getScopeRepresentation(scope, level) {
	'use strict';
	var indentBasis = '  ',
		indent = '';
	for (var index = 0; index < level; ++index) {
		indent += indentBasis;
	}
	return indent + '+-' + scope;
}

/**
 * Add a Scope
 * @param {ScopeTree} tree This ScopeTree
 * @param {Scope} scope Scope object
 * @memberof ScopeTree
 * @private
 */
function addScope(tree, scope) {
	"use strict";
	if (Scope.isScope(scope)) {
		internal(tree)._scopes.push(scope);
		internal(tree)._mapFromNameToScope.set(scope.name, scope);
		internal(tree)._mapFromRangeToScope.set(scope.range.toString(), scope);
	}
}

/**
 * Initialize the scope tree
 * @param {ScopeTree} tree This ScopeTree
 * @param {Object} ast AST node of this page
 * @memberof ScopeTree
 * @private
 */
/**
 * Check whether a statement declares lexical (let/const/class) bindings
 * @param {Object} node
 * @returns {boolean}
 * @private
 */
function isLexicalDeclaration(node) {
	"use strict";
	return !!node &&
		((node.type === 'VariableDeclaration' && node.kind !== 'var') || node.type === 'ClassDeclaration');
}

/**
 * Check whether an AST node creates a block scope, i.e. it directly declares
 * lexical bindings (a function body is part of its function scope instead)
 * @param {Object} node
 * @returns {boolean}
 * @private
 */
function createsBlockScope(node) {
	"use strict";
	switch (node.type) {
		case 'BlockStatement':
			return node.body.some(isLexicalDeclaration);
		case 'ForStatement':
			return isLexicalDeclaration(node.init);
		case 'ForInStatement':
		/* falls through */
		case 'ForOfStatement':
			return isLexicalDeclaration(node.left);
		case 'SwitchStatement':
			return node.cases.some(function (switchCase) {
				return switchCase.consequent.some(isLexicalDeclaration);
			});
		default:
			return false;
	}
}

/**
 * Get the synthetic function of a class member which runs as a scope (FR-006):
 * a parameterless FunctionExpression whose body is the body of a static block,
 * or the field value as a return statement (as the expression body of an arrow
 * function; an expression statement of a lone identifier would not count as a
 * use of it; for an instance field marked by the non-enumerable property
 * dujsFieldInitializer, which lib no longer reads since feature 007); range and
 * loc are the member's. Created once and cached on the
 * member (dujsScopeFunction), and marked with the member (non-enumerable
 * dujsClassMember).
 * @param {Object} member PropertyDefinition or StaticBlock
 * @returns {Object|null} FunctionExpression, or null for a field without value
 * @private
 */
function getClassMemberScopeFunction(member) {
	"use strict";
	if (!member.dujsScopeFunction) {
		var statements = null;
		if (member.type === 'StaticBlock') {
			statements = member.body;
		} else if (member.type === 'PropertyDefinition' && !!member.value) {
			statements = [{
				type: 'ReturnStatement',
				argument: member.value,
				range: member.value.range,
				loc: member.value.loc
			}];
			/// marks the return statement of an instance field initializer (004 FR-017,
			/// research R2); no code in lib reads it since feature 007 (T037 removed the
			/// special case of callResolver.callExpressionOf: the calls of the initializer
			/// are listed as call sites by callsplit); kept, and checked by
			/// tests/dujs/newcallsite.js
			if (!member.static) {
				Object.defineProperty(statements[0], 'dujsFieldInitializer', {
					value: true,
					enumerable: false
				});
			}
		}
		if (!statements) {
			return null;
		}
		Object.defineProperty(member, 'dujsScopeFunction', {
			value: {
				type: 'FunctionExpression',
				id: null,
				params: [],
				generator: false,
				async: false,
				body: {
					type: 'BlockStatement',
					body: statements,
					range: member.range,
					loc: member.loc
				},
				range: member.range,
				loc: member.loc
			},
			configurable: true
		});
		/// the member of a synthetic function, read by the binding of the page
		/// to map the eslint-scope class-field-initializer and class-static-block
		/// scopes to it (feature 006 research R4)
		Object.defineProperty(member.dujsScopeFunction, 'dujsClassMember', {
			value: member,
			configurable: true
		});
	}
	return member.dujsScopeFunction;
}

function initialization(tree, ast) {
	"use strict";
	var pageScope = factoryScope.createPageScope(ast);
	internal(tree)._root = pageScope;
	internal(tree)._scopes = [];
	internal(tree)._blockScopes = [];
	internal(tree)._mapFromRangeToScope.clear();
	internal(tree)._mapFromNameToScope.clear();

	addScope(tree, pageScope);
}

/**
 * Make the names of same-named sibling scopes unique (FR-011): under each
 * parent scope, the first child keeps its name and each later child with the
 * same name gets the smallest suffix _k (k >= 1) not among the original names
 * of its siblings nor the names already assigned; children are in source order
 * @param {Scope} parentScope
 * @memberof ScopeTree
 * @private
 */
function recursivelyMakeChildNamesUnique(parentScope) {
	"use strict";
	var children = parentScope.children,
		originalNames = children.map(function (child) {
			return child._name;
		}),
		assignedNames = [];
	children.forEach(function (child) {
		var name = child._name;
		if (assignedNames.indexOf(name) !== -1) {
			var k = 1;
			while (originalNames.indexOf(name + '_' + k) !== -1 || assignedNames.indexOf(name + '_' + k) !== -1) {
				++k;
			}
			name = name + '_' + k;
			child._name = name;
		}
		assignedNames.push(name);
		recursivelyMakeChildNamesUnique(child);
	});
}

/**
 * Make scope names unique and rebuild the map from names to the scopes
 * (block scopes are not in the map)
 * @param {ScopeTree} tree This ScopeTree
 * @memberof ScopeTree
 * @private
 */
function makeScopeNamesUnique(tree) {
	"use strict";
	recursivelyMakeChildNamesUnique(internal(tree)._root);
	internal(tree)._mapFromNameToScope.clear();
	internal(tree)._scopes.forEach(function (scope) {
		internal(tree)._mapFromNameToScope.set(scope.name, scope);
	});
}
/* end-private-methods */

/* start-test-block */
ScopeTree._testonly_ = {
	_addScope: addScope,
	_initialization: initialization,
	_recursivelyGetScopeText: recursivelyGetScopeText,
	_getScopeRepresentation: getScopeRepresentation
};
/* end-test-block */

/* start-static-methods */
/**
 * Check for the object is a ScopeTree or not
 * @param {Object} obj An object
 * @returns {boolean} True if the obj is a ScopeTree, false otherwise
 */
ScopeTree.isScopeTree = function (obj) {
    "use strict";
    return obj instanceof ScopeTree;
};
/* end-static-methods */

/* start-public-methods */
/**
 * Build the ScopeTree with its AST nodes
 * @param {Object} ast AST of a page
 */
ScopeTree.prototype.buildScopeTree = function (ast) {
    'use strict';
    var theScopeTree = this;
	initialization(theScopeTree, ast);
	var currentScope = internal(theScopeTree)._root;

	function astProgramHandler(node, recurse) {
		node.body.forEach(function (elem) {
			currentScope = internal(theScopeTree)._root;
			recurse(elem);
		});
	}

	/// Visit the parameters (the functions in their default values become child
	/// scopes, FR-006) and the body of a function within its scope, then restore
	/// the enclosing scope so that sibling functions get the same parent; the
	/// synthetic function of a class member has no parameters
	function visitFunctionBody(node, functionScope, recurse) {
		var enclosingScope = currentScope;
		enclosingScope.addChild(functionScope);
		addScope(theScopeTree, functionScope);
		currentScope = functionScope;
		(node.params || []).forEach(recurse);
		if (node.body.type === 'BlockStatement') {
			node.body.body.forEach(recurse);
		} else { /// expression body of an arrow function
			recurse(node.body);
		}
		currentScope = enclosingScope;
	}

	/// Create a block scope for a node directly declaring lexical bindings; the
	/// node is marked with it (dujsBlockScope) for the variable analysis
	function astBlockHandler(node, recurse) {
		if (!createsBlockScope(node)) {
			walkes.checkProps(node, recurse);
			return;
		}
		var enclosingScope = currentScope;
		var blockScope = factoryScope.createBlockScope(node);
		enclosingScope.addChild(blockScope);
		internal(theScopeTree)._blockScopes.push(blockScope);
		Object.defineProperty(node, 'dujsBlockScope', {value: blockScope, configurable: true});
		currentScope = blockScope;
		walkes.checkProps(node, recurse);
		currentScope = enclosingScope;
	}

	function astFunctionDeclarationHandler(node, recurse) {
		/// a default-exported function declaration may have no name
		var functionScope = (!!node.id) ?
			factoryScope.createFunctionScope(node, node.id.name) :
			factoryScope.createAnonymousFunctionScope(node);
		visitFunctionBody(node, functionScope, recurse);
	}

	function astFunctionExpressionHandler(node, recurse) {
		visitFunctionBody(node, factoryScope.createAnonymousFunctionScope(node), recurse);
	}

	/// A field with a value and a static block each become an anonymous
	/// function scope of a synthetic function (FR-006); a computed key is
	/// evaluated in the enclosing scope
	function astClassMemberHandler(node, recurse) {
		if (node.computed) {
			recurse(node.key);
		}
		var scopeFunction = getClassMemberScopeFunction(node);
		if (!!scopeFunction) {
			visitFunctionBody(scopeFunction, factoryScope.createAnonymousFunctionScope(scopeFunction), recurse);
		}
	}

    walkes(ast, {
        Program: astProgramHandler,
        FunctionDeclaration: astFunctionDeclarationHandler,
        FunctionExpression: astFunctionExpressionHandler,
        ArrowFunctionExpression: astFunctionExpressionHandler,
        BlockStatement: astBlockHandler,
        ForStatement: astBlockHandler,
        ForInStatement: astBlockHandler,
        ForOfStatement: astBlockHandler,
        SwitchStatement: astBlockHandler,
        PropertyDefinition: astClassMemberHandler,
        StaticBlock: astClassMemberHandler
    });
	makeScopeNamesUnique(theScopeTree);
};

/**
 * method for getting a function scope (Scope type) by comparing its range
 * @param {Range|Array} range Value for a Range
 * @returns {null|Scope} If it found, returns searched scope, otherwise, returns null
 */
ScopeTree.prototype.getScopeByRange = function (range) {
    'use strict';
    var found = null;
	if (Range.isValidValue(range)) {
		var rangeObj = factoryRange.create(range);
        found = internal(this)._mapFromRangeToScope.get(rangeObj.toString()) || null;
    }
	return found;
};

/**
 * Method for getting a function scope (Scope type) by comparing its scope name
 * @param {string} scopeName Name of the searched scope
 * @returns {null|Scope} If it found, returns searched scope, otherwise, returns null
 */
ScopeTree.prototype.getScopeByName = function (scopeName) {
    'use strict';
    var found = null;
	if (typeof scopeName === 'string') {
        found = internal(this)._mapFromNameToScope.get(scopeName) || null;
    }
	return found;
};

/**
 * Check the Scope is in the tree or not
 * @param {Scope|string|Range|Array} searchKey Key to search a scope, could be a Scope, name or a value of the scope\'s range
 * @returns {boolean} True, if the scope is existed; false otherwise
 */
ScopeTree.prototype.isRelatedToTheScope = function (searchKey) {
    'use strict';
	var found = false;
	if (Scope.isScope(searchKey)) {
		found = (internal(this)._scopes.indexOf(searchKey) !== -1);
	} else if (typeof searchKey === 'string') {
		found = !!this.getScopeByName(searchKey);
	} else if (Range.isValidValue(searchKey)) {
		found = !!this.getScopeByRange(searchKey);
	}
	return found;
};

/**
 * Represent the ScopeTree as a string
 * @returns {string} String representation of the ScopeTree
 */
ScopeTree.prototype.toString = function () {
    'use strict';
    return recursivelyGetScopeText(internal(this)._root, 0);
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(ScopeTree.prototype, {
	root: {
		get: function () {
			"use strict";
			return internal(this)._root;
		},
		enumerable: true
	},
	scopes: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._scopes);
		}
	},
	/**
	 * Block scopes (ES2015 lexical scopes), which own no model
	 * @type {Array}
	 * @memberof ScopeTree.prototype
	 */
	blockScopes: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._blockScopes);
		}
	}
});
/* end-public-data-members */

module.exports = ScopeTree;