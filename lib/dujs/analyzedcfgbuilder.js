/**
 * Created by ChengFuLin on 2015/5/27.
 */
var AnalyzedCFG = require('./index').AnalyzedCFG,
    factoryCFGWrapper = require('./index').factoryCFGWrapper,
    varFactory = require('./index').factoryVar,
    analyzedcfgFactory = require('./index').factoryAnalyzedCFG,
    flownodeFactory = require('../esgraph/flownodefactory'),
    FlowNode = require('../esgraph/flownode'),
    Scope = require('./index').Scope,
    CFGExt = require('./index').CFGExt,
    walkes = require('walkes');

function AnalyzedCFGBuilder() {
    "use strict";

    /* start-test-block */
    this._testonly_ = {
        buildScopesAndCFGs: buildScopesAndCFGs,
        connectCallerCalleeCFGs: connectCallerCalleeCFGs
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

/**
 * Connect CFGs of caller and callee
 * @param caller CFG
 * @param callee CFG
 * @param {FlowNode} callSiteNode
 * @returns {Array} New connected CFG
 * @private
 * @function
 */
function connectCallerCalleeCFGs(caller, callee, callSiteNode) {
    "use strict";
    var connectedCFG = [],
        connectedCFGNodes = [];
    if (caller[2].indexOf(callSiteNode) !== -1 && FlowNode.isFlowNode(callSiteNode)) {
        var nodesBeforeCall = caller[2].slice(0, caller[2].indexOf(callSiteNode)),
            nodesAfterCall = caller[2].slice(caller[2].indexOf(callSiteNode), caller[2].length),
            callNode = flownodeFactory.create(FlowNode.CALL_NODE_TYPE, null, null);
        connectedCFG.push(caller[0]);
        connectedCFG.push(caller[1]);

        callSiteNode.prev.forEach(function (prevNode) {
            prevNode.disconnect(callSiteNode);
            prevNode.connect(callNode);
        });
        callNode.connect(callee[0], FlowNode.CALL_CONNECTION_TYPE);

        connectedCFGNodes = connectedCFGNodes.concat(nodesBeforeCall);
        connectedCFGNodes.push(callNode);

        callSiteNode.type = FlowNode.CALL_RETURN_NODE_TYPE;
        callee[1].connect(callSiteNode, FlowNode.RETURN_CONNECTION_TYPE);

        connectedCFGNodes = connectedCFGNodes.concat(callee[2]);
        connectedCFGNodes = connectedCFGNodes.concat(nodesAfterCall);
        connectedCFG.push(connectedCFGNodes);
    }
    return connectedCFG;
}

var singleton = new AnalyzedCFGBuilder();
module.exports = singleton;