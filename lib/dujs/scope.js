/**
 * Created by chengfulin on 2015/4/21.
 */
module.exports = Scope;

/**
 * Scope name model
 * @param scope initialization of scope name
 * @constructor
 * @throws {Error} when the scope has invalid value
 */
function Scope(scope) {
    Scope.validate(scope);
    if (typeof scope === 'object' && scope instanceof Scope) {
        this.name = scope.name;
    } else if (typeof scope === 'number') {
        this.name = 'FunctionExpression[' + scope + ']';
    } else if (typeof scope === 'string') {
        if (scope !== 'Program' && scope !== 'Global') {
            this.name = 'Function["' + scope + '"]';
        } else {
            this.name = scope;/// 'Program' scope or 'Global' scope
        }
    }
}

/**
 * Check the scope is valid
 * @param scope
 * @returns {boolean}
 */
Scope.isValid = function (scope) {
    if (typeof scope === 'object' && scope instanceof Scope) {
        return true;
    }
    return typeof scope === 'string' || (typeof scope === 'number' && scope >= 0);
};

/**
 * Validate parameter
 * @param scope
 * @throws {Error} when the scope has invalid value
 */
Scope.validate = function (scope) {
    if (!Scope.isValid(scope)) {
        throw new Error('Invalid Scope');
    }
};

Scope.prototype.toString = function () {
    return this.name || '\'' + this.name + '\'';
};