/**
 * Created by chengfulin on 2015/4/29.
 */
var CFGExt = require('./cfgext'),
    CFGWrapper = require('./cfgwrapper'),
    Scope = require('./scope'),
    Var = require('./var'),
    namespace = require('./namespace'),
    internal = namespace(),
    Map = require('core-js/es6/map'),
    walkes = require('walkes');

function DuJs() {
    'use strict';
    internal(this).functionScopes = [];
    internal(this).root = null;
    internal(this).numOfAnonymousFunctions = 0;
}

DuJs.prototype.buildCFGWrapperTree = function (ast) {
    'use strict';
    var thisDuJs = this, current = null;
    walkes(ast, {
        Program: function (node, recurse) {
            var cfg = CFGExt.getCFG(node),
                cfgWrapper = new CFGWrapper(cfg, Scope.PROGRAM_SCOPE, null);
            internal(thisDuJs).root = cfgWrapper;
            internal(thisDuJs).functionScopes.push(cfgWrapper);
            node.body.forEach(function (elem) {
                current = cfgWrapper;
                recurse(elem);
            });
        },
        FunctionDeclaration: function (node, recurse) {
            var cfg = CFGExt.getCFG(node.body),
                cfgWrapper = new CFGWrapper(cfg, new Scope(node.id.name), current || null),
                params = [];
            node.params.forEach(function (paramNode) {
                params.push(new Var(paramNode.name, paramNode.range, cfgWrapper.getScope()));
            });
            cfgWrapper.setParams(params);
            if (!!current) {
                current.addChild(cfgWrapper);
            } else {
                internal(thisDuJs).root = cfgWrapper;
            }
            internal(thisDuJs).functionScopes.push(cfgWrapper);
            node.body.body.forEach(function (elem) {
                current = cfgWrapper;
                recurse(elem);
            });
        },
        VariableDeclarator: function (node, recurse) {
            if (node.init.type === 'FunctionExpression') {
                var cfg = CFGExt.getCFG(node.init.body),
                    cfgWrapper = new CFGWrapper(
                        cfg,
                        new Scope(internal(thisDuJs).numOfAnonymousFunctions),
                        current || null
                    ),
                    params = [];
                node.init.params.forEach(function (paramNode) {
                    params.push(new Var(paramNode.name, paramNode.range, cfgWrapper.getScope()));
                });
                internal(thisDuJs).numOfAnonymousFunctions += 1;
                if (!!current) {
                    current.addChild(cfgWrapper, new Var(
                        node.id.name,
                        node.range,
                        current.getScope(),
                        null)
                    );
                } else {
                    internal(thisDuJs).root = cfgWrapper;
                }
                internal(thisDuJs).functionScopes.push(cfgWrapper);
                node.init.body.body.forEach(function (elem) {
                    current = cfgWrapper;
                    recurse(elem);
                });
            }
        }
    });
};

DuJs.prototype.getRoot = function () {
    'use strict';
    return internal(this).root;
};

DuJs.prototype.getFunctionScopes = function () {
    'use strict';
    return [].concat(internal(this).functionScopes);
};

DuJs.prototype.getNumOfAnonymousFunctions = function () {
    'use strict';
    return internal(this).numOfAnonymousFunctions;
};

module.exports = DuJs;