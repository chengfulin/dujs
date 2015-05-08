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

function findReachDefinitions(cfgWrapper, entryRDs) {
    'use strict';
    /// Transfer function of ReachDefinition algorithm with Work list algorithm
    /// input ReachIn set of current node
    /// output ReachOut set of current node
    return worklist(cfgWrapper.getCFG(), function (input) {
        if (this.type || !this.astNode) {
            return input;
        }
        var kill = this.kill = this.kill || DFA.KILL(this.astNode, cfgWrapper);
        var generate = this.generate = this.generate || DFA.GEN(this, input, cfgWrapper);
        /// excludes from those definition names in KILL set
        var killSet = new Set();
        kill.values().forEach(function (killed) {
            input.values().forEach(function (elem) {
                if (elem.variable === killed) {
                    killSet.add(elem);
                }
            });
        });
        return Set.union(Set.minus(input, killSet), generate);
    }, {direction: 'forward', start: entryRDs});
}

