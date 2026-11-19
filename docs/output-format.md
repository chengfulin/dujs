# Output format

## Output files

Each model is written as `<n>.graph.dot` (the flattened statement-level
graph) and `<n>.dupairs.dot` (the def-use pairs); the inter-procedural,
intra-page and inter-page models also have `<n>.hierarchy.dot` (the models
they are built from) and `<n>.matching.json`. Each model also has a Markdown
file `<n>.md`: its title, the hierarchy graph (when the model has one), the
flat graph and the def-use pairs, with the graphs drawn as Mermaid diagrams.
The `README.md` at the root of the output directory is the overview: the
source code of each page and links to every `<n>.md`. A graph over 500 edges
or 50,000 characters in Mermaid is shown as tables instead, with a link to its
`.dot` file.

To view the outputs, open the overview `README.md` of the output directory in
a Markdown viewer with Mermaid support (GitHub, VS Code, ...) and follow its
links. The `out-*/` directories are excluded by `.gitignore`, so they never
appear on GitHub; open them in a local viewer.

## Matching of calls and returns

`<n>.matching.json` (format `dujs-matching/1`) pairs every call edge with its
return edges, and the event loop with the handlers it runs: each record of
`calls` gives the call node, the entry and exit of the callee, the CALL RETURN
node and the node an exception of the callee goes to (`exceptionalReturn`,
`null` when there is none), and each record of `loops` the LOOP node, the LOOP
RETURN node and the entry and exit of every handler; `summaries` lists the
summary of each callee and handler. Nodes are named as in `<n>.graph.dot`
(`n<k>`). The graph itself does not change: a path generator should only take
paths whose calls and returns match. A path entering a callee from a call node
leaves its exit only to the CALL RETURN node of the same record when it reached
the exit normally (by a normal, `true`, `false` or `finally` edge), or to its
`exceptionalReturn` when it reached the exit by an exception edge (this edge
is virtual and is not drawn in the `.dot`). A path entering a handler from the
LOOP node leaves it only to the LOOP RETURN node; a handler also called
directly returns to that call. A recursive call (`back: true`) enters the
callee already expanded; calls and returns are matched as a stack.

## finallyExit nodes and finally edges

`finallyExit` nodes and `finally` edges: when a non-empty `finally` block can
be entered by an exception or by `return`/`break`/`continue`, the end of the
block goes to a `finallyExit` node. Its `normal` edge goes to the statement
after the `try` (when the block can be entered normally), its `exception` edge
goes on with the exception, and each `finally` edge (`label="finally"`) goes to
the target of a jump that passed through the block.

## Node labels

In the `.dot` outputs a node is labeled with its line number as dujs prints it
(one more than the line in the source file, since dujs prepends a line to the
analyzed source). Conditional
expressions and short-circuit operators (`?:`, `&&`, `||`, `??`, `&&=`, `||=`,
`??=`) are split into a decision node and branch nodes; a node created inside a
branch is labeled `<line>:<path>`, where `<path>` is its sequence of `T`/`F`
branches (e.g. `2:TF`). A CALL node is labeled `call (<line>)` and a CALL
RETURN node `callReturn (<line>)`, with the line of its call site and, in a
split branch, its path (`callReturn (6:T)`); nodes with the same label get
`_a`, `_b`, … (`call (79)_a`).

## Call sites split into segments

Nodes with calls are split into segments (feature `007-split-call-nodes`). In
the inter-procedural, intra-page and inter-page models, a node with call sites
is divided in JavaScript evaluation order (operands and arguments from left
to right, arguments before the call, the target of a compound assignment read
first) into the segment before the first call, one segment between each
return and the next call, and the segment after the last return; each segment
has its own definitions, uses and exception edge. No node or edge type is
added; the segments are the existing nodes:
- a statement (also a declaration, `return`, `throw`, a parameter or field
  initialization): the first segment is the CALL node (the copy of the
  statement), the others are the nodes the calls return to: the CALL RETURN
  node of a call, which is a CALL node (labeled `call (<line>)`) when it also
  starts the next call of the node, as in a chain of callees of `new A()`
  (`var y = f() + g();` has `call (<line>)_a`, `call (<line>)_b` and one
  `callReturn (<line>)`; `<n>.matching.json` has a record for each call);
- a decision node (a condition of `if` or of a loop, a split decision node): a
  CALL node is inserted before it for the first segment, and the decision node
  itself is the last segment;
- a `switch` discriminant and the right side of a `for...in`/`for...of`, which
  are evaluated once: a CALL node is inserted before the first `case` (or the
  loop node, entered from outside the loop) for the first segment, and the
  last CALL RETURN node goes on to the `case` or loop node.

So a c-use can be on a CALL or CALL RETURN node (`f(x = 1)` defines `x` on the
CALL node, before the callee; `x = f()` defines `x` on the CALL RETURN node,
after it), while the reads of a condition stay p-uses of the decision node (the use
end is still the decision node and its branch, e.g. `(6,7)`), with the
definitions valid when they are read. A definition made
after the return is shown at the definition end with the label of the copy of
the statement, `call (<line>)` (`var y = f();` gives `y: call (7) -> 8`); it
is not a definition before the call (known-issues §45). In
`<n>.matching.json` each call site of a node has its own record (`seq` in
evaluation order, `callSiteLine` the line of the node), and `beforeDecision`
is `true` for the first call of a node whose first segment is an inserted CALL
node (a decision node, a `switch` discriminant or the right side of a
`for...in`/`for...of`); its `callNode` is that inserted node. The
intra-procedural model keeps calls opaque and is not split.
