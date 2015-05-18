/**
 * Created by chengfulin on 2015/4/10.
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
    var newStartNode = (!!startNode && startNode.type !== 'entry')? startNode : null,
        newCFG = (!!newStartNode)? [newStartNode, cfgWrapper.getCFG()[1], cfgWrapper.getCFG()[2]] : cfgWrapper.getCFG();
        //newCFG = cfgWrapper.getCFG();
    return worklist(newCFG, function (input) {
        var currentNode = this;
        /// for exit node, ReachOut(exit) = ReachIn(exit) - KILL(scope vars)
        if ((currentNode.type || !currentNode.astNode) && currentNode.type !== 'exit') {
            return input;
        }
        var kill = currentNode.kill = currentNode.kill || DFA.KILL(currentNode, cfgWrapper);
        var generate = currentNode.generate = currentNode.generate || DFA.GEN(currentNode, cfgWrapper);
        /// excludes from those definition names in KILL set
        var killSet = new Set();
        kill.values().forEach(function (killed) {
            input.values().forEach(function (elem) {
                if (elem.variable === killed) {
                    killSet.add(elem);
                }
            });
        });
        return (this === startNode)? Set.union(entryRDs, generate) : Set.union(Set.minus(input, killSet), generate);
        //return Set.union(Set.minus(input, killSet), generate);
    }, {direction: 'forward', start: entryRDs});
}

