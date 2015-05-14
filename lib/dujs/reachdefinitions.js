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
    return worklist(cfgWrapper.getCFG(), function (input) {
        /// for exit node, ReachOut(exit) = ReachIn(exit) - KILL(scope vars)
        if ((this.type || !this.astNode) && this.type !== 'exit') {
            return input;
        }
        var kill = this.kill = this.kill || DFA.KILL(this, cfgWrapper);
        var generate = this.generate = this.generate || DFA.GEN(this, cfgWrapper);
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

