/**
 * Created by chengfulin on 2015/4/15.
 */
var DFA = require('./dfa'),
    RD = require('./reachdefinitions'),
    Set = require('../analyses').Set,
    DUPair = require('./dupair'),
    Def = require('./def'),
    Map = require('core-js/es6/map');

module.exports.findDUPairs = findDUPairs;
/**
 * Get DUPairs of the CFG
 * @param cfg
 * @returns Map of DUPairs of each definitions, (key: def name, value: DUPair)
 * @constructor
 */
function findDUPairs(cfgWrapper) {
    'use strict';
    /// 1. get RD of the node
    /// 2. get USE of the node
    /// 3. get intersection of RD and USE
    /// 4. get LastDEFs of each element in the intersection
    var dupairs = new Map();
    cfgWrapper.getCFG()[2].forEach(function (node) {
        if (!!node.type && (node.type === 'entry' || node.type === 'exit')) {
            return;
        }
        var nodeRD = cfgWrapper.getReachIns().get(node),
            nodeUSE = DFA.USE(node, cfgWrapper),/// Set of used Vars
            nodeActualUsed = getUsedDefs(nodeRD, nodeUSE);
        /// Initialization
        nodeRD.values().forEach(function (elem) {
            var pairs = dupairs.get(elem.variable) || new Set();
            dupairs.set(elem.variable, pairs);
        });
        nodeActualUsed.values().forEach(function (elem) {
            var pairs = dupairs.get(elem.variable);
            /// Assume each id of CFG nodes will be different
            pairs.add(new DUPair(elem.definition.getFromCFGNode(), node.cfgId));
            dupairs.set(elem.variable, pairs);
        });
    });
    return dupairs;
}

/**
 * Get used definitions by getting the intersection of RD and USE
 * @param defs reaching definitions
 * @param used used definition names
 * @returns used definitions
 */
function getUsedDefs(defs, used) {
    'use strict';
    var usedDefs = new Set();
    if (defs instanceof Set) {
        defs.values().forEach(function (vardef) {
            used.values().forEach(function (variable) {
                if (vardef.variable.toString() === variable.toString()) {
                    usedDefs.add(vardef);
                }
            });
        });
    }
    return usedDefs;
}