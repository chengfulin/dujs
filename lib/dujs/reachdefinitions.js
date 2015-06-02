/**
 * From the repository: analyses (https://github.com/Swatinem/analyses)
 * @license LGPLv3 (http://www.gnu.org/licenses/lgpl-3.0-standalone.html)
 * @author Swatinem (arpad.borsos@googlemail.com)
 * @modified ChengFuLin (chengfulin0806@gmail.com)
 */
var walkes = require('walkes'),
    worklist = require('../analyses'),
    Set = require('../analyses').Set,
    DFA = require('./dfa'),
    CFGWrapper = require('./cfgwrapper'),
    Map = require('core-js/es6/map');

exports.findReachDefinitions = findReachDefinitions;

function findReachDefinitions(cfgWrapper, entryRDs, startNode) {
    'use strict';
    var initRDs = (!!startNode && startNode.type !== 'entry')? null : entryRDs,
        newStartNode = (!!startNode && startNode.type !== 'entry')? startNode : null,
        newCFG = cfgWrapper.getCFG();
    return worklist(newCFG, function (input) {
        var currentNode = this;
        /// for exit node, ReachOut(exit) = ReachIn(exit) - KILL(scope vars)
        if (currentNode.type === 'entry') {
            return input;
        }
        var kill = currentNode.kill = currentNode.kill || DFA.KILL(currentNode, cfgWrapper);
        var generate = currentNode.generate = currentNode.generate || DFA.GEN(currentNode, cfgWrapper);
        /// excludes from those definition names in KILL set
        input = (currentNode === startNode)? Set.union(input, entryRDs) : input;
        var killSet = new Set();
        kill.values().forEach(function (killed) {
            input.values().forEach(function (elem) {
                if (elem.variable === killed) {
                    killSet.add(elem);
                }
            });
        });
        return Set.union(Set.minus(input, killSet), generate);
    }, {direction: 'forward', start: initRDs});
}

