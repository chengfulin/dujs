/*
 * Edge-type-aware reaching definitions solver (specs/005-summary-analysis,
 * research R2, data-model §6, contracts/lib-api.md §2). It replaces the use of
 * the worklist of lib/analyses by DefUseAnalyzer.doAnalysis.
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * IN(n) is the union of the contributions of the edges reaching n, plus
 * entryInput for the entry and the extra definitions of options.extraReachIns:
 * - normal, true, false, call, onEvent, loadStorage and saveStorage edges
 *   carry OUT of the source;
 * - an exception edge carries IN of the source (FR-014: the throwing
 *   statement does not complete);
 * - compatible mode (options.calls and options.loops not given, until the
 *   summaries are used): return edges and the edges from handler exits to
 *   LOOP RETURN carry OUT of the source; with the transitional rule
 *   options.exceptionToCalleeExitCarriesOut (analyze Q1), an exception edge
 *   to a callee exit (an exit with a return edge) carries OUT of the source.
 * OUT(n) = (IN(n) - KILL(n)) U GEN(n), KILL by computeKILLSet of
 * lib/dujs/defuseanalyzer.js. The solver is a pure function: it does not
 * write the results into the nodes.
 */
var Set = require('../analyses/set'),
    FlowNode = require('../esgraph/flownode');

/**
 * Types of the edges from a node to another one
 * @param {FlowNode} source
 * @param {FlowNode} target
 * @returns {Array} connection types
 * @private
 */
function edgeTypes(source, target) {
    'use strict';
    return FlowNode.CONNECTION_TYPES.filter(function (type) {
        var connected = source[type];
        if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
            return !!connected && connected.indexOf(target) !== -1;
        }
        return connected === target;
    });
}

/**
 * Whether a node is the exit of a callee in a flat graph: an exit with a return edge
 * @param {FlowNode} node
 * @returns {boolean}
 * @private
 */
function isCalleeExit(node) {
    'use strict';
    return node.type === FlowNode.EXIT_NODE_TYPE && !!node.return && node.return.length > 0;
}

/**
 * Whether an edge carries IN of its source (else OUT of its source)
 * @param {string} type connection type
 * @param {FlowNode} target
 * @param {Object} options
 * @returns {boolean}
 * @private
 */
function carriesIn(type, target, options) {
    'use strict';
    if (type !== FlowNode.EXCEPTION_CONNECTION_TYPE) {
        return false;
    }
    return !(options.exceptionToCalleeExitCarriesOut && isCalleeExit(target));
}

/**
 * Solve the reaching definitions of a graph
 * @param {Array} graph [entry, exit, all nodes]
 * @param {Object} [options] {entryInput: Set, generateOf(node): Set, useOf(node),
 * extraReachIns(node, outOf): Set|null (outOf(m) gives the current OUT of m; n is
 * analyzed again when OUT(m) changes), exceptionToCalleeExitCarriesOut: boolean};
 * calls, loops, summaryOf and flatVarDefOf are not supported yet (compatible mode only)
 * @returns {Object} {results: Map(FlowNode, {in, out, generate, kill}),
 * exitArrivals: {normal: Set, exceptional: Set}}
 * @throws {Error} when calls or loops are given
 */
function solve(graph, options) {
    'use strict';
    options = options || {};
    if (!!options.calls || !!options.loops) {
        throw new Error('reachingsolver: options.calls and options.loops are not supported yet');
    }
    // Required here, not at the top: defuseanalyzer requires this module, so a
    // top-level require would be circular.
    var computeKILLSet = require('./defuseanalyzer').computeKILLSet;
    var entry = graph[0],
        exit = graph[1],
        entryInput = options.entryInput || new Set(),
        generateOf = options.generateOf || function () {
            return new Set();
        },
        useOf = options.useOf || function () {},
        ins = new Map(),
        outs = new Map(),
        gens = new Map(),
        kills = new Map(),
        dependents = new Map(), /// (FlowNode m, Array): nodes whose extra definitions read OUT(m)
        queue = [entry];

    /// a node already in the queue moves to its end (the order of the former worklist)
    function enqueue(node) {
        var index = queue.indexOf(node);
        if (index !== -1) {
            queue.splice(index, 1);
        }
        queue.push(node);
    }

    function contributionOf(source, type, target) {
        return carriesIn(type, target, options) ? ins.get(source) : outs.get(source);
    }

    /// extra definitions of a node; records the nodes whose OUT is read by it
    function extraOf(node) {
        if (typeof options.extraReachIns !== 'function') {
            return null;
        }
        return options.extraReachIns(node, function outOf(other) {
            var readers = dependents.get(other) || [];
            if (readers.indexOf(node) === -1) {
                readers.push(node);
                dependents.set(other, readers);
            }
            return new Set(outs.get(other));
        });
    }

    function inputOf(node) {
        var input = (node === entry) ? new Set(entryInput) : new Set();
        node.prev.forEach(function (source) {
            edgeTypes(source, node).forEach(function (type) {
                input = Set.union(input, contributionOf(source, type, node));
            });
        });
        return Set.union(input, extraOf(node));
    }

    /// find the dependencies of the extra definitions before solving: a node
    /// without analyzed predecessors (a CALL RETURN NODE whose callee never
    /// returns) is analyzed when the OUT it reads is known
    graph[2].forEach(extraOf);

    while (queue.length > 0) {
        var node = queue.shift();
        var input = inputOf(node),
            generate = generateOf(node) || new Set(),
            kill = computeKILLSet(node, input, generate);
        useOf(node);
        var output = Set.union(Set.minus(input, kill), generate),
            oldInput = ins.get(node),
            oldOutput = outs.get(node),
            outputChanged = !oldOutput || !Set.equals(oldOutput, output);
        ins.set(node, input);
        outs.set(node, output);
        gens.set(node, generate);
        kills.set(node, kill);
        if (outputChanged) {
            /// the nodes reading OUT of this node by their extra definitions first, then the successors
            (dependents.get(node) || []).forEach(enqueue);
            node.next.forEach(enqueue);
        } else if (!Set.equals(oldInput, input)) {
            /// an edge carrying IN of its source: a change of IN matters too
            node.next.filter(function (target) {
                return edgeTypes(node, target).some(function (type) {
                    return carriesIn(type, target, options);
                });
            }).forEach(enqueue);
        }
    }

    var results = new Map();
    ins.forEach(function (input, each) {
        results.set(each, {in: input, out: outs.get(each), generate: gens.get(each), kill: kills.get(each)});
    });
    var exitArrivals = {normal: new Set(), exceptional: new Set()};
    exit.prev.forEach(function (source) {
        edgeTypes(source, exit).forEach(function (type) {
            var kind = (type === FlowNode.EXCEPTION_CONNECTION_TYPE) ? 'exceptional' : 'normal';
            exitArrivals[kind] = Set.union(exitArrivals[kind], contributionOf(source, type, exit));
        });
    });
    return {results: results, exitArrivals: exitArrivals};
}

module.exports = {
    solve: solve
};
