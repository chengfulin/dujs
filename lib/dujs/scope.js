/**
 * Created by chengfulin on 2015/4/21.
 */
module.exports = Scope;

/**
 * Scope name model
 * @param scope initialization of scope name
 * @constructor
 */
function Scope(scope) {
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

Scope.prototype.toString = function () {
    return this.name || '\'' + this.name + '\'';
};