/*
 * Model of variable
 * @lastmodifiedBy ChengFuLin(chengfulin0806@gmail.com)
 */
var namespace = require('../namespace'),
    internal = namespace();

/**
 * Create a model of variable
 * @param {String} name Name of the variable
 * @param {Object} [binding] Declaration information given by the binding of
 * its page (lib/dujs/scopebinding.js): {variable, kind, declarations}
 * @constructor
 * @throws {Object} when Var constructed with invalid value
 */
function Var(name, binding) {
    'use strict';
    Var.validate(name);
    internal(this)._name = name;
    internal(this)._binding = binding || null;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-static-methods */
/**
 * Check an object is Var or not
 * @param {Object} obj
 * @returns {Boolean}
 */
Var.isVar = function (obj) {
    'use strict';
    return obj instanceof Var;
};

/**
 * Check the name is a valid identifier: an ES IdentifierName, so that $ and
 * non-ASCII letters are valid (feature 006 U1); a Var name may equal a
 * reserved scope name like $ANONYMOUS_FUN_0
 * @param {String} name
 * @returns {Boolean}
 */
Var.isValidName = function (name) {
    'use strict';
    var identifierFormat = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u;
    return (typeof name === 'string' && identifierFormat.test(name));
};

/**
 * Set the binding of a Var created without one (a built-in object Var is
 * created by its scope and bound by the binding of its page); a binding is
 * set only once
 * @param {Var} variable
 * @param {Object} binding {variable, kind, declarations}
 * @throws {Error} When the Var already has a binding
 */
Var.setBinding = function (variable, binding) {
    'use strict';
    Var.validateType(variable);
    if (internal(variable)._binding !== null) {
        throw new Error('The Var ' + internal(variable)._name + ' already has a binding');
    }
    internal(variable)._binding = binding;
};


/**
 * Validate the values for a Var is valid
 * @param {String} name Name of checked variable
 * @param {String} msg Custom error message
 * @throws {Object} When a values of the Var is invalid
 */
Var.validate = function (name, msg) {
    'use strict';
    if (!Var.isValidName(name)) {
        throw new Error(msg || 'Invalid value for a Var');
    }
};

/**
 * Validate an object is a Var or not
 * @param {Object} obj An object to be validated
 * @param {String} msg Custom error message
 * @throws {Object} When the object is not a Var
 */
Var.validateType = function (obj, msg) {
    'use strict';
    if (!Var.isVar(obj)) {
        throw new Error(msg || 'Not a Var');
    }
};
/* end-static-methods */

/* start-public-methods */
/**
 * Represent the object as string
 * @returns {String} The variable's identity
 */
Var.prototype.toString = function () {
    'use strict';
    return internal(this)._name;
};

/**
 * Convert the variable to JSON
 * @returns {Object} JSON formatted object
 */
Var.prototype.toJSON = function () {
	'use strict';
	return {
		"name": internal(this)._name
	};
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperty(Var.prototype, 'name', {
    get: function () {
        'use strict';
        return internal(this)._name;
    },
	enumerable: true
});

/**
 * Declaration information (read only; feature 006 data-model section 2):
 * {variable: eslint-scope Variable or null, kind, declarations: [{kind, node, identifier}]},
 * or null when the Var is not created through the binding of a page
 */
Object.defineProperty(Var.prototype, 'binding', {
    get: function () {
        'use strict';
        return internal(this)._binding;
    }
});
/* end-public-data-members */

module.exports = Var;