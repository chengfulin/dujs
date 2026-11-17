/*
 * Edge-type-aware reaching definitions solver (specs/005-summary-analysis,
 * research R2, data-model §6, contracts/lib-api.md §2). It replaces the use of
 * the worklist of lib/analyses by DefUseAnalyzer.doAnalysis.
 *
 * Original dujs code, MIT License (see LICENSE).
 *
 * IN(n) is the union of the contributions of the edges reaching n, plus
 * entryInput for the entry, the summaries of the calls returning to n
 * (options.calls) and the extra definitions of options.extraReachIns:
 * - normal, true, false, call, onEvent, loadStorage, saveStorage and finally
 *   edges carry OUT of the source;
 * - an exception edge carries IN of the source (FR-014: the throwing
 *   statement does not complete);
 * - with options.calls (CallSiteRecords, data-model §4), the return edge from
 *   the exit of a callee to the CALL RETURN NODE of a record carries nothing
 *   (the return edge from a LOOP RETURN to the LOOP carries OUT): the CALL RETURN NODE of a record gets
 *   apply(summaryOf(calleeScope), OUT(callNode)) (FR-002), the definitions of
 *   the summary mapped to the graph by options.flatVarDefOf, and is analyzed
 *   again when OUT(callNode) changes; the exceptionalReturn of a record (when
 *   not null) gets applyExceptional(summaryOf(calleeScope), OUT(callNode)) =
 *   OUT(callNode) U exceptional (User Story 3, research R5; no KILL), mapped
 *   the same way, and is analyzed again when OUT(callNode) changes; only the
 *   nodes reached from the entry (not by return edges; a CALL RETURN NODE when
 *   its callee returns normally; an exceptionalReturn when its call node is
 *   reached) are analyzed; exitArrivals holds the contributions of the edges
 *   to the exit only, not the exceptional returns of the records to it;
 * - compatible mode (options.calls not given): return edges carry OUT of the
 *   source; until options.loops is supported (User Story 4) the edges from
 *   handler exits to LOOP RETURN carry OUT of the source.
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
 * Whether an edge carries IN of its source (else OUT of its source)
 * @param {string} type connection type
 * @returns {boolean}
 * @private
 */
function carriesIn(type) {
    'use strict';
    return type === FlowNode.EXCEPTION_CONNECTION_TYPE;
}

/**
 * Definitions after a call by the summary of its callee (data-model §1:
 * apply(S, X) = S.normalReturn ? (X - defsOf(S.mustKill)) U S.gen : {}), the
 * definitions of S.gen mapped to the graph
 * @param {Object} summary
 * @param {Set} vardefs OUT of the node with the call edge
 * @param {function} flatVarDefOf (original VarDef) -> VarDef of the graph or null
 * @returns {Set}
 * @throws {Error} when a definition of the summary has no VarDef in the graph
 * @private
 */
function applySummary(summary, vardefs, flatVarDefOf) {
    'use strict';
    var applied = new Set();
    if (!summary.normalReturn) {
        return applied;
    }
    vardefs.forEach(function (vardef) {
        if (!summary.mustKill.has(vardef.variable)) {
            applied.add(vardef);
        }
    });
    summary.gen.forEach(function (vardef) {
        var mapped = flatVarDefOf(vardef);
        if (!mapped) {
            throw new Error('reachingsolver: no VarDef in the graph for the definition of ' +
                String(vardef.variable) + ' of the summary of ' + String(summary.scope));
        }
        applied.add(mapped);
    });
    return applied;
}

/**
 * Definitions after a call returning exceptionally by the summary of its
 * callee (data-model §1: applyExceptional(S, X) = X U S.exceptional, no KILL),
 * the definitions of S.exceptional mapped to the graph
 * @param {Object} summary
 * @param {Set} vardefs OUT of the node with the call edge
 * @param {function} flatVarDefOf (original VarDef) -> VarDef of the graph or null
 * @returns {Set}
 * @throws {Error} when a definition of the summary has no VarDef in the graph
 * @private
 */
function applyExceptionalSummary(summary, vardefs, flatVarDefOf) {
    'use strict';
    var applied = new Set(vardefs);
    (summary.exceptional || new Set()).forEach(function (vardef) {
        var mapped = flatVarDefOf(vardef);
        if (!mapped) {
            throw new Error('reachingsolver: no VarDef in the graph for the exceptional definition of ' +
                String(vardef.variable) + ' of the summary of ' + String(summary.scope));
        }
        applied.add(mapped);
    });
    return applied;
}

/**
 * Solve the reaching definitions of a graph
 * @param {Array} graph [entry, exit, all nodes]
 * @param {Object} [options] {entryInput: Set, generateOf(node): Set, useOf(node),
 * calls: Array of CallSiteRecord, summaryOf(scope): Summary, flatVarDefOf(VarDef):
 * VarDef|null (default identity), extraReachIns(node, outOf): Set|null (outOf(m)
 * gives the current OUT of m; n is analyzed again when OUT(m) changes)};
 * loops is not supported yet (User Story 4)
 * @returns {Object} {results: Map(FlowNode, {in, out, generate, kill}),
 * exitArrivals: {normal: Set, exceptional: Set}}
 * @throws {Error} when loops are given, when calls are given without summaryOf,
 * or when a definition of a summary has no VarDef in the graph
 */
function solve(graph, options) {
    'use strict';
    options = options || {};
    if (!!options.loops) {
        throw new Error('reachingsolver: options.loops is not supported yet');
    }
    var calls = options.calls || null;
    if (!!calls && typeof options.summaryOf !== 'function') {
        throw new Error('reachingsolver: options.calls needs options.summaryOf');
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
        dependents = new Map(), /// (FlowNode m, Array): nodes whose input reads OUT(m)
        callsReturningTo = new Map(), /// (CALL RETURN NODE, Array of CallSiteRecord)
        callsFrom = new Map(), /// (node with the call edge, Array of CallSiteRecord)
        callsThrowingTo = new Map(), /// (exceptionalReturn, Array of CallSiteRecord)
        flatVarDefOf = options.flatVarDefOf || function (vardef) {
            return vardef;
        },
        queue = [entry];

    function addDependent(other, node) {
        var readers = dependents.get(other) || [];
        if (readers.indexOf(node) === -1) {
            readers.push(node);
            dependents.set(other, readers);
        }
    }

    (calls || []).forEach(function (record) {
        var records = callsReturningTo.get(record.callReturn) || [];
        records.push(record);
        callsReturningTo.set(record.callReturn, records);
        callsFrom.set(record.callNode, (callsFrom.get(record.callNode) || []).concat([record]));
        addDependent(record.callNode, record.callReturn);
        if (FlowNode.isFlowNode(record.exceptionalReturn)) {
            callsThrowingTo.set(record.exceptionalReturn,
                (callsThrowingTo.get(record.exceptionalReturn) || []).concat([record]));
            addDependent(record.callNode, record.exceptionalReturn);
        }
    });

    /// with calls, the nodes reached from the entry: not by return edges; a CALL RETURN NODE
    /// is reached when the node with the call edge is and the callee returns normally; the
    /// exceptionalReturn of a record when the node with the call edge is (a CALL NODE before a
    /// decision and a later call of a chain have no exception edge)
    var reached = null;
    if (!!calls) {
        reached = new Map([[entry, true]]);
        var reaching = [entry];
        while (reaching.length > 0) {
            var from = reaching.shift(),
                targets = [];
            FlowNode.CONNECTION_TYPES.forEach(function (type) {
                [].concat(from[type] || []).forEach(function (target) {
                    if (!isReturnOfCall(type, target)) {
                        targets.push(target);
                    }
                });
            });
            (callsFrom.get(from) || []).forEach(function (record) {
                if (options.summaryOf(record.calleeScope).normalReturn) {
                    targets.push(record.callReturn);
                }
                if (FlowNode.isFlowNode(record.exceptionalReturn)) {
                    targets.push(record.exceptionalReturn);
                }
            });
            targets.forEach(function (target) {
                if (FlowNode.isFlowNode(target) && !reached.has(target)) {
                    reached.set(target, true);
                    reaching.push(target);
                }
            });
        }
    }

    /// a node already in the queue moves to its end (the order of the former worklist);
    /// with calls, a node not reached is not analyzed
    function enqueue(node) {
        if (!!reached && !reached.has(node)) {
            return;
        }
        var index = queue.indexOf(node);
        if (index !== -1) {
            queue.splice(index, 1);
        }
        queue.push(node);
    }

    /// with calls, the return edge from the exit of a callee to the CALL RETURN NODE of a record
    /// (not the return edge from a LOOP RETURN to the LOOP)
    function isReturnOfCall(type, target) {
        return !!calls && type === FlowNode.RETURN_CONNECTION_TYPE && callsReturningTo.has(target);
    }

    function contributionOf(source, type, target) {
        if (isReturnOfCall(type, target)) {
            return null;
        }
        return carriesIn(type) ? ins.get(source) : outs.get(source);
    }

    /// the definitions after the calls returning (normally or exceptionally) to a node, by the
    /// summaries of their callees
    function summarizedOf(node) {
        var summarized = null;
        (callsReturningTo.get(node) || []).forEach(function (record) {
            var output = outs.get(record.callNode);
            if (!output) {
                return;
            }
            summarized = Set.union(summarized || new Set(),
                applySummary(options.summaryOf(record.calleeScope), output, flatVarDefOf));
        });
        (callsThrowingTo.get(node) || []).forEach(function (record) {
            var output = outs.get(record.callNode);
            if (!output) {
                return;
            }
            summarized = Set.union(summarized || new Set(),
                applyExceptionalSummary(options.summaryOf(record.calleeScope), output, flatVarDefOf));
        });
        return summarized;
    }

    /// extra definitions of a node; records the nodes whose OUT is read by it
    function extraOf(node) {
        if (typeof options.extraReachIns !== 'function') {
            return null;
        }
        return options.extraReachIns(node, function outOf(other) {
            addDependent(other, node);
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
        return Set.union(Set.union(input, summarizedOf(node)), extraOf(node));
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
            /// the nodes reading OUT of this node (CALL RETURN NODEs, extra definitions) first, then the successors
            (dependents.get(node) || []).forEach(enqueue);
            node.next.forEach(enqueue);
        } else if (!Set.equals(oldInput, input)) {
            /// an edge carrying IN of its source: a change of IN matters too
            node.next.filter(function (target) {
                return edgeTypes(node, target).some(function (type) {
                    return carriesIn(type);
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
