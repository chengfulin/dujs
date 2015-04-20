/**
 * Created by chengfulin on 2015/4/10.
 */
var walkes = require('walkes'),
    worklist = require('../analyses'),
    Set = require('../analyses').Set,
    DFA = require('./dfa');

module.exports = ReachDefinitions;

function ReachDefinitions(cfg) {
    'use strict';
    /// Transfer function of ReachDefinition algorithm with Work list algorithm
    /// input ReachIn set of current node
    /// output ReachOut set of current node
    return worklist(cfg, function (input) {
        if (this.type || !this.astNode)
            return input;
        var kill = this.kill = this.kill || DFA.KILL(this.astNode);
        var generate = this.generate = this.generate || DFA.GEN(this);
        /// excludes from those definition names in KILL set
        var killSet = new Set();
        kill.values().forEach(function (killed) {
            input.values().forEach(function (elem) {
                if (elem.name === killed) {
                    killSet.add(elem);
                }
            });
        });
        return Set.union(Set.minus(input, killSet), generate);
    }, {direction: 'forward'}).inputs;
}

