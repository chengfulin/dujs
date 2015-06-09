/**
 * Created by ChengFuLin on 2015/5/12.
 */
var Def = require('./def'),
    Scope = require('./scope'),
    ScopeWrapper = require('./scopewrapper');

/**
 * Constructor of DefFactory
 * @constructor
 */
function DefFactory() {
    'use strict';
}

/**
 * Creator of Def object
 * @param from
 * @param type
 * @param range
 * @param scope
 * @returns {Def}
 * @throws {Error} when a value is invalid
 */
DefFactory.prototype.create = function (from, type, range, scope) {
    'use strict';
    return new Def(from, type, range, scope);
};

/// Factory methods for all kinds of Def

/**
 * Factory method for literal type Def
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createLiteralDef = function (from, range, scope) {
    "use strict";
    return new Def(from, Def.LITERAL_TYPE, range, scope);
};

/**
 * Factory method for object type Def
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createObjectDef = function (from, range, scope) {
    "use strict";
    return new Def(from, Def.OBJECT_TYPE, range, scope);
};

/**
 * Factory method for function type Def
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createFunctionDef = function (from, range, scope) {
    "use strict";
    return new Def(from, Def.FUNCTION_TYPE, range, scope);
};

/**
 * Factory method for HTML DOM type Def
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createHTMLDOMDef = function (from, range, scope) {
    "use strict";
    return new Def(from, Def.HTML_DOM_TYPE, range, scope);
};

/**
 * Factory method for undefined type Def
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createUndefinedDef = function (from, range, scope) {
    "use strict";
    return new Def(from, Def.UNDEFINED_TYPE, range, scope);
};

/**
 * Factory method for local storage type Def
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createLocalStorageDef = function (from, range, scope) {
    "use strict";
    return new Def(from, Def.LOCAL_STORAGE_TYPE, range, scope);
};

/**
 * Factory method for Def of parameter
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createParamDef = function (functionScope, type, range) {
    'use strict';
    if (ScopeWrapper.isScopeWrapper(functionScope)) {
        return new Def(functionScope.cfg[0], type, range, functionScope.scope);
    }
};

/// Factory methods for all kinds of parameters

/**
 * Factory method for literal type Def of parameter
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createLiteralParamDef = function (functionScope, range) {
    'use strict';
    return this.createParamDef(functionScope, Def.LITERAL_TYPE, range, functionScope.scope);
};

/**
 * Factory method for object type Def of parameter
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createObjectParamDef = function (functionScope, range) {
    'use strict';
    return this.createParamDef(functionScope.cfg[0], Def.OBJECT_TYPE, range, functionScope.scope);
};

/**
 * Factory method for function type Def of parameter
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createFunctionParamDef = function (functionScope, range) {
    'use strict';
    return this.createParamDef(functionScope.cfg[0], Def.FUNCTION_TYPE, range, functionScope.scope);
};

/**
 * Factory method for HTML DOM type Def of parameter
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createHTMLDOMParamDef = function (functionScope, range) {
    'use strict';
    return this.createParamDef(functionScope.cfg[0], Def.HTML_DOM_TYPE, range, functionScope.scope);
};

/**
 * Factory method for undefined type Def of parameter
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createUndefinedParamDef = function (functionScope, range) {
    'use strict';
    return this.createParamDef(functionScope.cfg[0], Def.UNDEFINED_TYPE, range, functionScope.scope);
};

/**
 * Factory method for local storage type Def of parameter
 * @param from
 * @param range
 * @param scope
 * @returns {Def}
 * @function
 */
DefFactory.prototype.createLocalStorageParamDef = function (functionScope, range) {
    'use strict';
    return this.createParamDef(functionScope.cfg[0], Def.LOCAL_STORAGE_TYPE, range, functionScope.scope);
};

/**
 * Singleton
 * @type {DefFactory}
 */
var factory = new DefFactory();
module.exports = factory;