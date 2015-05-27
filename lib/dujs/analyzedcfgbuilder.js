/**
 * Created by ChengFuLin on 2015/5/27.
 */
var AnalyzedCFG = require('./index').AnalyzedCFG,
    factoryCFGWrapper = require('./index').factoryCFGWrapper,
    varFactory = require('./index').factoryVar,
    analyzedcfgFactory = require('./index').factoryAnalyzedCFG,
    Scope = require('./index').Scope,
    CFGExt = require('./index').CFGExt,
    walkes = require('walkes');

function AnalyzedCFGBuilder() {
    "use strict";

    /* start-test-block */
    this._testonly_ = {
        buildScopesAndCFGs: buildScopesAndCFGs
    };
    /* end-test-block */
}

/**
 *
 * @param ast
 * @returns {Array} AnalyzedCFGs
 * @private
 * @function
 */
function buildScopesAndCFGs(ast) {
    'use strict';
    var current = null,
        analyzedCFGs = [],
        numOfAnonymous = 0;
    walkes(ast, {
        Program: function (node, recurse) {
            var cfg = CFGExt.getCFG(node),
                cfgWrapper = factoryCFGWrapper.create(cfg, Scope.PROGRAM_SCOPE, null),
                analyzedCFG = analyzedcfgFactory.create();

            analyzedCFG.addRelatedScope(cfgWrapper);
            analyzedCFG.cfg = cfg;

            analyzedCFGs.push(analyzedCFG);
            node.body.forEach(function (elem) {/// to recursively walks to inner functions
                current = cfgWrapper;
                recurse(elem);
            });
        },
        FunctionDeclaration: function (node, recurse) {
            var cfg = CFGExt.getCFG(node.body),
                cfgWrapper = factoryCFGWrapper.create(cfg, new Scope(node.id.name), current || null),
                params = [],
                analyzedCFG = analyzedcfgFactory.create();

            node.params.forEach(function (paramNode) {
                params.push(varFactory.create(paramNode.name, paramNode.range, cfgWrapper.getScope()));
            });
            cfgWrapper.setParams(params);
            if (!!current) {
                current.addChild(cfgWrapper);
            }

            analyzedCFG.addRelatedScope(cfgWrapper);
            analyzedCFG.cfg = cfg;

            analyzedCFGs.push(analyzedCFG);
            node.body.body.forEach(function (elem) {/// to recursively walks to inner functions
                current = cfgWrapper;
                recurse(elem);
            });
        },
        FunctionExpression: function (node, recurse) {
            var cfg = CFGExt.getCFG(node.body),
                cfgWrapper = factoryCFGWrapper.create(
                    cfg,
                    new Scope(numOfAnonymous++),
                    current || null
                ),
                params = [],
                analyzedCFG = analyzedcfgFactory.create();
            node.params.forEach(function (paramNode) {
                params.push(varFactory.create(paramNode.name, paramNode.range, cfgWrapper.getScope()));
            });
            cfgWrapper.setParams(params);
            if (!!current) {
                current.addChild(
                    cfgWrapper
                );
            }
            analyzedCFG.addRelatedScope(cfgWrapper);
            analyzedCFG.cfg = cfg;

            analyzedCFGs.push(analyzedCFG);
            node.body.body.forEach(function (elem) {/// to recursively walks to inner functions
                current = cfgWrapper;
                recurse(elem);
            });
        }
    });
    return analyzedCFGs;
}

/**
 * Build function scopes and cfgs
 * @param ast
 * @returns {Array} AnalyzedCFGs
 * @function
 */
AnalyzedCFGBuilder.prototype.buildIntraProceduralCFGs = function (ast) {
    "use strict";
    var analyzedCFGs = buildScopesAndCFGs(ast);
    return analyzedCFGs;
};

var singleton = new AnalyzedCFGBuilder();
module.exports = singleton;