/**
 * Created by chengfulin on 2015/4/15.
 */
var DFA = require('./dfa'),
    RD = require('./reachdefinitions'),
    Set = require('../analyses').Set,
    DUPair = require('./dupair'),
    Def = require('./def');

module.exports.DUPairs = DUPairs;
/**
 * Get DUPairs of the CFG
 * @param cfg
 * @returns Map of DUPairs of each definitions, (key: def name, value: DUPair)
 * @constructor
 */
function DUPairs(cfg) {
    'use strict';
    /// 1. get RD of the node
    /// 2. get USE of the node
    /// 3. get intersection of RD and USE
    /// 4. get LastDEFs of each element in the intersection
    var RDs = RD(cfg),
        dupairs = new Map();
    cfg[2].forEach(function (node) {
        var nodeRD = RDs.get(node),
            nodeUSE = DFA.USE(node),
            nodeActualUsed = getUsedDefs(nodeRD, nodeUSE);
        /// Initialization
        nodeRD.values().forEach(function (elem) {
            var pairs = dupairs.get(elem.name) || new Set();
            dupairs.set(elem.name, pairs);
        });
        nodeActualUsed.values().forEach(function (elem) {
            var pairs = dupairs.get(elem.name);
            pairs.add(new DUPair(elem.from, node.cfgId));
            dupairs.set(elem.name, pairs);
        });
    });
    return dupairs;
}

module.exports.getUsedDefs = getUsedDefs;
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
        defs.values().forEach(function (def) {
            used.values().forEach(function (name) {
                if (def.name === name) {
                    usedDefs.add(def);
                }
            });
        });
    }
    return usedDefs;
}