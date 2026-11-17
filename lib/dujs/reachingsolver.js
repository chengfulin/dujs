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
 * - with options.loops (LoopRecords, data-model §5, User Story 4, research
 *   R4), the edge from the exit of a handler of a record to its LOOP RETURN
 *   NODE (a NORMAL edge) carries nothing: the LOOP RETURN NODE gets
 *   OUT(loop) U the gen and exceptional of the summaries of the handlers of
 *   the record (no must-KILL, unlike apply), mapped by options.flatVarDefOf,
 *   and is analyzed again when OUT(loop) changes; a handler whose summary has
 *   a definition without a VarDef in the graph and for which
 *   options.openHandler(scope) is true (a handler with only an open model)
 *   falls back to the compatible way: its edge to the LOOP RETURN NODE
 *   carries OUT of its exit and its summary gives nothing; with calls or
 *   loops, the LOOP RETURN NODE of a record is reached when its LOOP NODE is,
 *   not by the edges from the handler exits (but those of the handlers
 *   falling back);
 * - compatible mode (options.calls and options.loops not given): return edges
 *   and the edges from handler exits to LOOP RETURN carry OUT of the source.
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
 * Definitions given to the LOOP RETURN NODE of a LoopRecord by the summaries
 * of its handlers (research R4: gen U exceptional, no must-KILL), mapped to
 * the graph, and the exits of the handlers whose edges to the LOOP RETURN
 * NODE carry nothing
 * @param {Object} record LoopRecord {loop, loopReturn, handlers: [{scope, entry, exit}], noHandler}
 * @param {function} summaryOf (Scope) -> Summary
 * @param {function} flatVarDefOf (original VarDef) -> VarDef of the graph or null
 * @param {function} [openHandler] (Scope) -> true when the handler falls back to the compatible way
 * @returns {Object} {generated: Set, excludedExits: Array of FlowNode}
 * @throws {Error} when a definition of a summary has no VarDef in the graph and
 *   the handler does not fall back
 * @private
 */
function loopContributionOf(record, summaryOf, flatVarDefOf, openHandler) {
    'use strict';
    var generated = new Set(),
        excludedExits = [];
    record.handlers.forEach(function (handler) {
        var summary = summaryOf(handler.scope),
            mapped = [],
            unmapped = null;
        [summary.gen, summary.exceptional || new Set()].forEach(function (vardefs) {
            vardefs.forEach(function (vardef) {
                var flat = flatVarDefOf(vardef);
                if (!flat) {
                    unmapped = unmapped || vardef;
                } else {
                    mapped.push(flat);
                }
            });
        });
        if (!!unmapped) {
            if (typeof openHandler === 'function' && openHandler(handler.scope)) {
                return;
            }
            throw new Error('reachingsolver: no VarDef in the graph for the definition of ' +
                String(unmapped.variable) + ' of the summary of the handler ' + String(handler.scope));
        }
        mapped.forEach(function (vardef) {
            generated.add(vardef);
        });
        excludedExits.push(handler.exit);
    });
    return {generated: generated, excludedExits: excludedExits};
}

/**
 * Solve the reaching definitions of a graph
 * @param {Array} graph [entry, exit, all nodes]
 * @param {Object} [options] {entryInput: Set, generateOf(node): Set, useOf(node),
 * calls: Array of CallSiteRecord, summaryOf(scope): Summary, flatVarDefOf(VarDef):
 * VarDef|null (default identity), extraReachIns(node, outOf): Set|null (outOf(m)
 * gives the current OUT of m; n is analyzed again when OUT(m) changes),
 * loops: Array of LoopRecord, openHandler(scope): boolean (a handler with only
 * an open model, see the header)}
 * @returns {Object} {results: Map(FlowNode, {in, out, generate, kill}),
 * exitArrivals: {normal: Set, exceptional: Set}}
 * @throws {Error} when calls or loops are given without summaryOf, or when a
 * definition of a summary has no VarDef in the graph
 */
function solve(graph, options) {
    'use strict';
    options = options || {};
    var calls = options.calls || null,
        loops = options.loops || null;
    if (!!calls && typeof options.summaryOf !== 'function') {
        throw new Error('reachingsolver: options.calls needs options.summaryOf');
    }
    if (!!loops && typeof options.summaryOf !== 'function') {
        throw new Error('reachingsolver: options.loops needs options.summaryOf');
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
        loopsReturningTo = new Map(), /// (LOOP RETURN NODE, {record, generated, excludedExits})
        loopsFrom = new Map(), /// (LOOP NODE, Array of LoopRecord)
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

    (loops || []).forEach(function (record) {
        var contribution = loopContributionOf(record, options.summaryOf, flatVarDefOf, options.openHandler);
        loopsReturningTo.set(record.loopReturn, {
            record: record,
            generated: contribution.generated,
            excludedExits: contribution.excludedExits
        });
        loopsFrom.set(record.loop, (loopsFrom.get(record.loop) || []).concat([record]));
        addDependent(record.loop, record.loopReturn);
    });

    /// with calls or loops, the nodes reached from the entry: not by return edges; a CALL RETURN NODE
    /// is reached when the node with the call edge is and the callee returns normally; the
    /// exceptionalReturn of a record when the node with the call edge is (a CALL NODE before a
    /// decision and a later call of a chain have no exception edge); the LOOP RETURN NODE of a
    /// LoopRecord when its LOOP NODE is, not by the edges from the handler exits carrying nothing
    var reached = null;
    if (!!calls || !!loops) {
        reached = new Map([[entry, true]]);
        var reaching = [entry];
        while (reaching.length > 0) {
            var from = reaching.shift(),
                targets = [];
            FlowNode.CONNECTION_TYPES.forEach(function (type) {
                [].concat(from[type] || []).forEach(function (target) {
                    if (!isReturnOfCall(type, target) && !isHandlerExitToLoopReturn(from, target)) {
                        targets.push(target);
                    }
                });
            });
            (loopsFrom.get(from) || []).forEach(function (record) {
                targets.push(record.loopReturn);
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

    /// with loops, the edge from the exit of a handler (not falling back) to the LOOP RETURN NODE
    /// of its LoopRecord, whatever its type (a NORMAL edge); independent of isReturnOfCall (the
    /// exit of a handler called directly has a return edge to the CALL RETURN NODE as well)
    function isHandlerExitToLoopReturn(source, target) {
        var ofLoop = loopsReturningTo.get(target);
        return !!ofLoop && ofLoop.excludedExits.indexOf(source) !== -1;
    }

    function contributionOf(source, type, target) {
        if (isReturnOfCall(type, target) || isHandlerExitToLoopReturn(source, target)) {
            return null;
        }
        return carriesIn(type) ? ins.get(source) : outs.get(source);
    }

    /// the definitions after the calls returning (normally or exceptionally) to a node, by the
    /// summaries of their callees; those of a LOOP RETURN NODE by the summaries of the handlers
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
        /// the LOOP RETURN NODE: OUT(loop) U the definitions of the summaries of the handlers (no KILL)
        var ofLoop = loopsReturningTo.get(node),
            outOfLoop = !!ofLoop ? outs.get(ofLoop.record.loop) : null;
        if (!!outOfLoop) {
            summarized = Set.union(summarized || new Set(), Set.union(outOfLoop, ofLoop.generated));
        }
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
