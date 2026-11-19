# Known Issues

Issues found by the code review of PR #2 (ES2015+ modeling) and confirmed by
reproducing them on `feat/es2015-modeling`. "Pre-existing" means dujs
1.0.0/1.1.0 behaves the same way.

Issues §1–§6 and §8 are fixed by feature `001-fix-known-issues`
(`specs/001-fix-known-issues/`); their sections are kept for reference and the
results describe the behavior before the fix. §10–§13 were found while
implementing that feature, and §14–§17 by the code review of PR #3 (or while
fixing it). §18 was found by feature `002-small-refactors` and is moved to
stage 2 of the hierarchical model refactoring. Every fixed section keeps its
original description, preceded by a note on the fix.

Feature `003-hierarchical-models` (`specs/003-hierarchical-models/`) fixes
§9, fixes the part of §13 and §16 where a model changed the nodes shared with
another model (the order of a call and its decision node in §16 is kept until
stage 2), and fixes §19 (sub-models of the inter-procedural model leaked
definitions of outer code), which is recorded after §18.

§20 and §21 were found by checking the MDN "Advanced JavaScript objects"
examples.

Feature `004-fix-remaining-issues` (`specs/004-fix-remaining-issues/`) fixes
§7, §10, §11, §12, §14, §15, §17, §20 and §21, and the consequence described
at the end of §16 (the use of an outer variable disappearing when a parameter
of the callee has the same name). It also changes how a call `f();` is
resolved (strict rule) and records follow-up items; both are in §22, after
§21. Not fixed yet: §16 (the call of a decision node is still modeled before
the decision node) and §18, both left to stage 2 of the hierarchical model
refactoring, the follow-up items of §22 (except (2), fixed by
`006-eslint-scope`), and §23, found by checking the MDN examples after the
feature (§24 is fixed by `006-eslint-scope`).

Feature `006-eslint-scope` (`specs/006-eslint-scope/`) takes the declarations
of every scope and the resolution of every identifier from `eslint-scope`. It
fixes §22 (2) and §24, and two issues of the scope rules that it records as
§25 (catch parameters and the reads of the catch node) and §26 (identifiers in
parameter default values). It records the other findings, limits and
decisions of the feature in §27–§34, and adds a note to §18 on the variables
the entry node of a function reads.

Feature `005-summary-analysis` (`specs/005-summary-analysis/`, stage 2 of
the hierarchical model refactoring) computes the data flow through calls with
summaries of the callees, fixes §18, relaxes the resolution of `f()` in a
function (§22 (0)), corrects the premise of §22 (4), and fixes the control flow
of `try`…`finally` (§35). It records its behavior changes, limits and findings
in §35–§43. §16 and §22 (3) are planned for feature `007`; §22 (1), §22 (5) and
§23 for feature `008`; §22 (4) for a separate feature on the storage model.

Feature `007-split-call-nodes` (`specs/007-split-call-nodes/`) splits a node
with calls into "before the call" and "after the return" segments in the
inter-procedural, intra-page and inter-page models. It fixes §16 (the
arguments and the reads of a condition are evaluated before the callee runs)
and §22 (3) (calls inside expressions are call sites), with the note on §10
(`return g();` is connected) and a note on §36 (only call statements never
throw after the return). It records its limits and behavior changes in
§44–§48 (the reads and calls of a `case` test, the behavior changes of the
segments, the positions that are not call sites, the exception edges of the
split discriminant nodes, and the crash of a `switch` without `case`). It
also fixes §49 (a pre-existing bug of the labels of the `.graph.dot` that
`007` makes much easier to trigger) and records §50 (a pre-existing
performance problem, left to a later feature).

Feature `008-property-defs-method-calls`
(`specs/008-property-defs-method-calls/`) makes a member assignment a use of
the object variable instead of a definition of it, which fixes part of
§22 (1) (there is still no definition of a property; §51), and connects
`o.m()` in a function to the class of a `const`/`let` instance defined
outside the function, which fixes §23. It also checks the dead-code pairs of
§22 (5) with an independent reachability test and fixes them except for the
`finally` case of §38. It records its follow-up items
and findings from §51 on.

Line numbers in the results refer to the analyzed code (`L<n>`); `entry` is
the entry node of a scope.

## Analysis errors

### 1. Labeled statements, `with` and `debugger` make the analysis throw (pre-existing)

**Fixed** by feature `001-fix-known-issues` (FR-001–FR-003): the three
programs are analyzed and the CLI writes all models. Labeled
`break`/`continue` jump to the labeled statement or loop, the object of `with`
is a use, and `debugger` is a plain statement.

| Input | Result |
|---|---|
| `var a = 1;`<br>`l: a = 2;` | `TypeError: Cannot read properties of null (reading '0')` |
| `var o = {};`<br>`with (o) { p = 1; }` | same |
| `var a = 1;`<br>`debugger;`<br>`console.log(a);` | same |

The CFG builder (esgraph fork) has no handler for `LabeledStatement`,
`WithStatement` and `DebuggerStatement`, so the graph is broken and building
the intra-procedural model fails (`lib/dujs/model.js` via
`lib/dujs/modelbuilder.js`). The CLI prints the error and produces no output.

## Missing uses (def-use pairs not found)

### 2. Default parameter values are not uses (severity: medium)

**Fixed** by feature `001-fix-known-issues` (FR-005): each parameter with a
default value has its own
initialization node after the entry node, which uses the variables of the
default value and defines the parameter (also for arrow functions and pattern
parameters).

```js
var d = 1;
function f(a, b = a + d) {
  return b;
}
```

No pair for `a` or `d`: the expressions of default parameters are not part of
any CFG node. The same applies to arrow functions and to defaults in
parameter patterns (`function f({x = y}) {}`). A possible fix is to attribute
these uses to the entry node of the function.

### 3. Arguments of `new` are not uses (severity: medium, pre-existing)

**Fixed** by feature `001-fix-known-issues` (FR-004): the arguments of `new`
(including spread) are uses.

```js
var a = 1;
var o = new X(a);
throw new Error(a);
```

No pair for `a`: the use analysis of `NewExpression` only visits the callee.

### 4. Class field initializers and static blocks do not use outer variables

**Fixed** by feature `001-fix-known-issues` (FR-006): every field initializer
and static block is a scope of
its own; static field initializers and static blocks are connected into the
intra-page model at the class node (instance field initializers are not, see
the README limits).

```js
var v = 1;
class A {
  f = v;
  static {
    console.log(v);
  }
}
```

No pair for `v`: class bodies are skipped when analyzing the enclosing
statement, and field initializers and static blocks are not scopes of their
own (methods are).

## Wrong pairs

### 5. A chained assignment uses the inner target (pre-existing)

**Fixed** by feature `001-fix-known-issues` (FR-007): the inner target of a
chained plain assignment is not
a use; chained logical assignments are split into branches (FR-008).

```js
var a, b;
a = b = 1;
console.log(a);
```

Gives `b: L1 -> L2`, but `b` is only defined at L2. The same happens with
chained logical assignments (`a ||= b ||= 1`).

### 6. A conditional expression outside a decision node gives p-uses without a target (pre-existing)

**Fixed** by feature `001-fix-known-issues` (FR-008–FR-010): conditional
expressions and short-circuit
operators are split into a decision node with true and false branches, so
every p-use has both targets.

```js
var a = 1, b = 2;
var c = a ? b : 3;
```

The intra-procedural output contains `a (2,(3,null))` twice: the test of a
conditional expression is recorded as a p-use of a node that has no
true/false branches. The test helper (`tests/helpers/analyze.js`) throws on
such pairs.

### 7. Class methods are not connected as call targets (fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-004, FR-005, FR-015–FR-018):
call statements whose method can be decided statically are connected to the
method: `new A().m();` (first the construction, see §21, then `m`), `A.s();`
(static method), `this.m();` in a method, constructor or field initializer of
class `A`, and `o.m();` when every definition of `o` reaching the call is
`new A(...)` of the same class. Only own methods are looked up (no super
chain); other forms are not connected (see the README limits). A call that
forms a cycle (recursion, methods calling each other) is modeled as a loop
path (a back edge to the entry of the callee already expanded) instead of
making the analysis fail. The example now gives `x: L4 -> L8`, with the
inter-procedural model `[$DOMAIN.$PAGE_0, $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0]`.
The description below is the behavior before the fix.

```js
var x = 0;
class A {
  m() {
    x = 1;
  }
}
new A().m();
console.log(x);
```

The intra-page model gives `x: L1 -> L8`, although `A.prototype.m` sets `x`
before L8. Only calls of functions bound to variables are connected (see also
the README limitation on call sites).

## Other

### 8. Duplicate scope names for functions declared in plain blocks

**Fixed** by feature `001-fix-known-issues` (FR-011): same-named scopes under
the same parent scope are named
`f`, `f_1`, `f_2`, ... in source order.

```js
{
  function f() {}
}
{
  function f() {}
}
```

Both function scopes are named `$DOMAIN.$PAGE_0.f`, so looking up a scope by
name returns only one of them. A function declared in a block that has
`let`/`const` is named after the block scope instead
(`$DOMAIN.$PAGE_0.$BLOCK_0.f`).

### 9. Code style and records (fixed by `003-hierarchical-models`)

Fixed by feature `003-hierarchical-models` (US3); the list below describes the
state before the fix, and each point is followed by the change:

- The `lib/esgraph/index.js` header and `THIRD_PARTY_NOTICES.md` do not list
  two small changes individually: the null guard in `expressionThrows` and
  treating `ClassDeclaration` as a leaf in `createNodes`. Both are part of the
  recorded class and arrow-function changes.
  **Fixed**: the header of `lib/esgraph/index.js` has the two lines
  `expressionThrows returns false for a null expression` and
  `a ClassDeclaration is a leaf in createNodes`, and the Modifications of
  `THIRD_PARTY_NOTICES.md` §1 have the two matching points. The code is
  unchanged.
- In `lib/dujs/defuseanalyzer.js`, the new helpers (`isFunctionExpression`,
  `getDefinedVariables`, `computeKILLSet`, `useNestedLoopHead`,
  `useClassHead`) were inserted between existing JSDoc blocks and the
  functions they document. (This list named `useLoopHead`; that helper was
  replaced by `lib/dujs/usedexpressions.js` in `002-small-refactors`, and the
  remaining helper is `useNestedLoopHead`.)
  **Fixed**: every JSDoc block is right before its function: the misplaced
  blocks of `analyzeBuiltInObjects` and
  `findVariableAndItsDefinitionsFromASet` were moved to those functions, and
  each of the five helpers has its own JSDoc.
- `computeKILLSet` replaces `findKILLSet` in the analysis; `findKILLSet` is
  kept only for its existing tests.
  **Fixed**: `DefUseAnalyzer.prototype.findKILLSet` is removed (it had no
  callers and no tests); the KILL set is computed only by `computeKILLSet`.
- `lib/dujs/jsparser.js` uses an optional catch binding (`catch {`, ES2019),
  unlike the ES5 style of the rest of `lib/`.
  **Fixed**: the catch has a binding, `catch (ignoredModuleError)`.
  Lint rule change: `no-unused-vars` reports an unused catch binding by
  default (`caughtErrors: "all"`), and no new suppression may be added to
  `eslint-suppressions.json`, so `eslint.config.js` sets
  `'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^ignored' }]`.
  This is a rule setting, not a suppression: only catch bindings named
  `ignored...` are exempt, which marks an intentionally unused error.

## Found while fixing §1–§6 and §8 (feature `001-fix-known-issues`)

### 10. A function as the default value of a parameter is not a scope (fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-006): a function or arrow
function in a default value of a parameter (also inside a destructured
parameter) is a child scope of the function, `$DOMAIN.$PAGE_0.f.$ANONYMOUS_FUN_0`
here, and is analyzed like other nested functions (it has its own
intra-procedural model). With the body `g();` the call is connected and
`d: L1 -> L3` is found (`specs/004-fix-remaining-issues/probes/us4-1b.js`).
In the program below, `return g();` is still not connected, because it is not
a call statement (only the arrow function becomes a scope; the pairs are
unchanged); treating such calls as call-sites is a follow-up item in §22.
**Fixed** by feature `007-split-call-nodes` (§22 (3)): `return g();` is now a
call site and `d: L1 -> L3` is found
(`specs/007-split-call-nodes/probes/p4-ki10-return.js`).
The description below is the behavior before the fix.

```js
var d = 1;
function f(g = () =>
  d) {
  return g();
}
f();
```

Scopes: only `$DOMAIN.$PAGE_0` and `$DOMAIN.$PAGE_0.f`; the intra-page pairs
are `f: entry -> L6` and `g: L2 -> L4`. The arrow function `() => d` is not a
scope, so its body is not analyzed and there is no pair for `d`. The scope
tree (`lib/dujs/scopetree.js`) does not visit the parameters of a function.

### 11. Uses of the class name in its own static members are missed (fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-007): the name of a class
declaration is defined before its static members run (order: superclass and
computed keys, then the class name, then the static members in source order;
the definition stays at the class node). The example now gives `Q: L1 -> L3`
(and `Q: L1 -> entry`, the §18 residue of the static block's entry node); a
static field `static s = Q;` also has its pair. The variable of a class
expression (`var B = class { static s = B; }`) is still defined after the
class, so only its hoisted `undefined` definition (`B: entry -> ...`) reaches
the static members, and the inner name of a named class expression is not a
variable (see §22). The description below is the behavior before the fix.

```js
class Q {
  static {
    console.log(Q);
  }
}
```

The intra-page pairs are only `console: entry -> L3` and
`console: entry -> entry`; there is no pair for `Q`. The same happens with a
static field (`static s = Q;`). The class name is defined at the class node,
which comes after all static members in the intra-page flow, so no definition
of `Q` reaches the uses in the static members.

### 12. CLI: no help, and errors exit with status 0 (pre-existing; fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-009, FR-010; argument
parsing moved to `lib/dujs/cli.js`, `lib/dujs/inputreader.js` removed):
`-h`/`--help` prints the usage and exits with 0; a usage error (no arguments,
no page, an unknown option, a file before the first `-js`, `-js` without
files) prints a message starting with `dujs: ` and the usage to stderr and
exits with 2; a file that cannot be read exits with 1 before any output
directory is created; an error while analyzing or writing exits with 1 and
removes the output directory of the run. All files are read before the output
directory is created, and each run creates a new directory: when
`out-<date>-<time>` exists (for example, another run in the same second), the
names `out-<date>-<time>_1`, `_2`, ... are tried, so two runs never share a
directory. The description below is the behavior before the fix.

`node bin/dujs.js --help` (and `node bin/dujs.js` without arguments) does not
print a usage text; it prints

```
*** ERROR:  ENOENT: no such file or directory, open 'out-<time>/inter-page/0.graph.dot'  ***
```

and exits with status 0. Arguments before the first `-js` are ignored, so
there are no pages: the output directories are created per page
(`createOutputDirectories` in `lib/dujs/outputwriter.js`), the analysis of zero
pages succeeds, and writing the inter-page model fails. `bin/dujs.js` catches
every error, prints it to stderr and does not set an exit status, so a failed
run cannot be told from a successful one by its exit status.

During the acceptance of the feature, a run with `-js` failed once with the
same kind of ENOENT; it did not happen again in 11 reruns (intermittent, not
reproduced). Possible causes, not confirmed:

- The output directory name `out-<year>-<month>-<day>-<hour>-<minute>-<second>`
  has a resolution of one second and is computed once when
  `lib/dujs/outputwriter.js` is loaded. Two runs started in the same directory
  within the same second share the directory (`mkdirSync` is skipped when it
  exists) and overwrite each other's files; if one run's directory is removed
  (for example by a cleanup of `out-*` after the other run) while the second
  run is still writing, the write fails with ENOENT.
- The run had no page at all (no file after `-js`, or an argument list
  without `-js`), which gives exactly this error as described above.

### 13. Branches of the intra-procedural model point to the LOOP node of the intra-page model (fixed by `003-hierarchical-models`)

**Fixed** by feature `003-hierarchical-models` (US1): the intra-page model and
the other upper models build their graphs from their own copies of the nodes
and no longer change the nodes of the intra-procedural models, so the false
branch of `L2` in the intra-procedural model points to its exit node. The
workaround in the test helper (treating a LOOP node branch as the exit node)
is removed. The description below is the behavior before the fix.

```js
var a = 1;
if (a) {
  a = 2;
}
```

`FlowNode` objects are shared by the models of a page. When the intra-page
model is built, the edges to the exit node of the page are redirected to its
LOOP node (`connectLoopNodeToPageGraph` in `lib/dujs/modelbuilder.js`); this
also changes the false branch of the decision `L2` seen through the
intra-procedural model, which now points to the LOOP node although that node is
not in the intra-procedural graph. The def-use pairs of the intra-procedural
model still target the exit node (`a: L1 -> L2>exit:F`). The test helper
(`tests/helpers/analyze.js`) treats a LOOP node branch as the exit node for
such a pair (`specs/001-fix-known-issues/contracts/analyze-helper-notation.md`).

## Found by the code review of PR #3 (feature `001-fix-known-issues`, Phase 10)

### 14. A predecessor without a source range is redirected to the split right side of a for-in/for-of loop (fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-012): when the
predecessor (or the loop body) has no source range, the predecessor is taken
as inside the body only when it cannot be reached from the entry node without
passing the loop node (dominance); predecessors with ranges keep the range
test. No program is known to produce such a node, so the fix is verified by
unit tests on hand-built graphs (`tests/esgraph/branchsplitlooppred.js`). The
description below is the behavior before the fix.

When the right side of a for-in/for-of loop is split (`for (var x of (saved ?? []))`),
only the edges entering the loop node from outside the loop are redirected to
the first decision of the right side; the back edges from the loop body keep
going to the loop node. Whether a predecessor is inside the body is decided
by the source range of its AST (`isInsideLoopBody` in
`lib/esgraph/branchsplitter.js`); a predecessor in the body whose AST has no
range is taken as outside, so its edge is redirected to the decision and the
right side is evaluated again on that path. Found by reading the code (review
#7); no program of the current CFG builder is known to produce such a node,
so it is an edge case and not reproduced.

### 15. Split call sites have the same CALL RETURN label in the dot output (fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-011): the label of the
CALL RETURN node of a split call site has the branch path of its call site:
`callReturn (L2:C0:T)` and `callReturn (L2:C0:F)` with `labelWithLoc`, and
`callReturn (<line>:T)` and `callReturn (<line>:F)` in the CLI outputs (line
numbers one more than in the source). CALL RETURN nodes of call sites that are
not split keep their labels. The description below is the behavior before the
fix.

```js
function log(v) {}
log(c ? a : b);
```

The two leaves `L2:T` and `L2:F` are both call sites (US5-10) and each has a
CALL RETURN node. In the dot output the label of a CALL RETURN node is
`callReturn (L<line>:C<col>)` (`labelWithLoc` in
`lib/dujs/cfggraphconverter.js`), without the branch path, so both nodes are
labeled `callReturn (L2:C0)`. The nodes themselves are distinct and keep the
branch path in `FlowNode.labelPath` (a split node has `labelPath === split.path`;
a CALL RETURN node takes the `labelPath` of its call site); only the label is
ambiguous (review #8).

### 16. The call of a decision node is inserted before it (partly fixed by `003-hierarchical-models`; fixed by `007-split-call-nodes`)

**Fixed** by feature `007-split-call-nodes` (FR-002, FR-003, US1): a node with
calls is split into segments in evaluation order (§45). The part of a
condition evaluated before the call (the callee, the arguments and the
operands on their left) is in the segment before the call, so the callee sees
the definitions made there; the reads of the condition are still p-uses of the
decision node, but get the definitions valid when they are evaluated. In the
first program below the pair is now `x: L5 -> L3` and `x: L1 -> L3` is gone
(`specs/007-split-call-nodes/probes/p1-ki16.js`); the call statement
`f(x = 1);` is fixed the same way (`x: L5 -> L3`, P12). The second program
still gives `a: L2 -> L3` and `a: L2 -> L6` (P2). The description below is
the behavior before the fix.

**Planned for feature `007`** (decision D1 of feature `005-summary-analysis`),
together with §22 (3): both need a statement node split into "before the
call" and "after the return". Feature `005-summary-analysis` keeps the
modeling of calls before a decision node unchanged (its FR-006).

**Partly fixed** by feature `003-hierarchical-models` (US1): the
inter-procedural model inserts the CALL and CALL RETURN nodes in its own copy
of the graph, so the edges of the shared nodes seen through the
intra-procedural model are no longer redirected to the inserted CALL node, and
the workaround in the test helper (`dujsDecisionCalledBefore`, treating the
inserted CALL node as the decision node) is removed. The order is kept: the
call is still modeled before the decision node, so the uses and definitions
of the condition (including the arguments) are still modeled after the callee
runs, with the pairs described below. That part is left to stage 2 of the
hierarchical model refactoring. The consequence at the end of this section
(the use of a shadowed outer variable disappearing) is fixed by feature
`004-fix-remaining-issues` (FR-016), see there.

```js
var x = 0;
function f(v) {
  return x;
}
if (f(x = 1)) {
  x = 2;
}
```

When a decision node (a condition of if/loop, a split decision node, a case
node, a for-in/for-of loop node) is a call site, including a call site of
static class members, the inter-procedural model inserts a CALL node and a
CALL RETURN node before it (`prev -> call -> callee -> callReturn -> decision`,
`connectCallerCalleeScopeRelatedModelsAtCallSite` in
`lib/dujs/modelbuilder.js`, Phase 10 R2/R3); the decision node keeps its edges
and its definitions and uses. So the uses and definitions of the condition,
including the arguments of the call, are modeled after the callee runs: here
`return x;` (L3) is paired with `x: L1 -> L3` instead of the definition
`x = 1` (L5) made by the argument before the call. As in §13, `FlowNode` objects are shared by the
models of a page: an edge entering the decision node seen through the
intra-procedural model now points to the inserted CALL node, which is not in
the intra-procedural graph. The def-use pairs of the intra-procedural model
still target the decision node; the test helper (`tests/helpers/analyze.js`)
treats the inserted CALL node as the decision node it is inserted before.

A consequence: when a parameter of the callee has the same name as a variable
read in the condition, the use of that variable can disappear from the
intra-page model, because the use is modeled after the callee and the entry
node of the callee kills the shadowed outer definitions (the same happens
before this change for a call statement such as `check(a); var c = a;`):

```js
function check(a) { return a; }
var a = 1, b = 0;
if (check(a) || b) {
  b = 2;
}
var c = a;
```

The intra-page model has no `a: L2 -> L3`; with a parameter named `p` instead
of `a` the pair is found.

**This consequence is fixed** by feature `004-fix-remaining-issues` (FR-016):
the definitions of variables the callee cannot see (local variables and
parameters of the caller, block `let`/`const`) bypass the callee from the
CALL node to the CALL RETURN node and are not killed by its entry or exit
node. The program above now has `a: L2 -> L3` and `a: L2 -> L6`, and
`check(a); var c = a;` has the pair of `a` to `var c = a;`. The order of the
call and the decision node is unchanged (stage 2).

### 17. A nested default inside a destructured parameter with its own default (fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-008): the outer default
(`{}`) is evaluated once by its own node, then each nested default has its own
initialization node in source order, and each name is defined once (`h` has
5 nodes: entry, `{}`, `x = d`, `y = x`, exit). The pair of `x` from the node
defining `x` to the node defining `y` is found (both nodes are labeled `L1` in
this one-line form). The description below is the behavior before the fix.

```js
function h({x = d, y = x} = {}) {
}
```

A destructured parameter with a default value (`{...} = {}`) has one
initialization node for the whole pattern, and the defaults nested in it are
not initialized again (`collectParameterDefaults` in
`lib/dujs/modelbuilder.js`, Phase 10 R6; before the fix they were initialized
a second time unconditionally, defining the names twice and evaluating the
defaults twice). So `y = x` reads `x` inside the same node and
`x: L1 -> L1` (the def of `x` used by the default of `y`) is not found.
Without the outer default (`function h({x = d, y = x})`) each nested default
still has its own initialization node, as in US2 scenario 7.

## Found while refactoring (feature `002-small-refactors`)

### 18. The entry node of a function uses the variables of statements in its body (fixed by `005-summary-analysis`)

**Fixed** by feature `005-summary-analysis` (FR-008, US5): the entry node of a
function has no use; the reads of default parameter values are at the
synthesized parameter initialization nodes, and every read of the body is only
at the node of its statement. The pairs ending at `entry` are gone (for
example the golden and MDN `X: d -> entry` pairs, recorded in
`specs/005-summary-analysis/golden-diff.md` and `mdn-diff.md`), and the
programs that made the analysis throw (`Decision node entry of the p-use of
variable a lacks its true target`, the program below with `f();` added, and
US5 scenario 2 of the feature) are analyzed:

```js
var x = 1, a = 2, b = 3, o = {}, k;
function f() {
  switch (x) { case a: b; }
  a;
  for (k in o) { b; }
}
f();
```

The intra-page pairs are `f: entry -> L7`, `o: L1 -> L5`,
`x: L1 -> L3>L3:T` and `x: L1 -> L3>L4:F` (the p-uses of `x` at the `case`
node); there is no pair for `a` or `b` (see the correction below).

**Correction** (found while accepting US5 of feature `005-summary-analysis`):
the description below says that the uses taken by the entry node "are also
found at the nodes of the statements themselves". That holds for `x` and `o`,
but not for the test of a `case` (`a` of `case a:`) nor for an identifier used
alone as a statement (`b;`, `a;`): dujs never takes them as reads, at any node
(existing modeling, unchanged), so the entry node had pairs for them that no
other node has. The last sentence below ("the handlers for nested
`switch`/`for-in`/`for-of` stay in the walk of `findUSESet`") is out of date:
feature `005-summary-analysis` removed those rules from `findUSESet` (task
T102 (a)). The original description follows.

**Note (feature `006-eslint-scope`)**: the entry node of a function only takes
the variables visible from the function scope (decision Q3 of the feature). A
read in the body that resolves to a `let`/`const` of a nested block, which
shadows a variable of the function or of an outer scope, no longer gives a
pair at the entry node:

```js
var x = 0;
function f() {
  if (x) {
    let x = 1;
    console.log(x);
  }
}
f();
```

The entry node of `f` gives `x: L1 -> entry` (the `x` of `if (x)`) and no pair
for the `let x` read at L5 (`x: L4 -> L5` stays at the node of L5). The rest
of this section is unchanged and left to feature 005 (stage 2 of the
hierarchical model refactoring). Pairs ending at `entry`, such as
`Q: L1 -> entry` in §32, come from this issue.

**Moved to stage 2** of the hierarchical model refactoring (decision D4 of
feature `003-hierarchical-models`): the fix changes the golden output, which
feature `003-hierarchical-models` must keep unchanged.

```js
function f() {
  switch (x) { case a: b; }
  a;
  for (k in o) { b; }
}
```

The AST of the entry node of a function is the whole function body, and
`findUSESet` walks it like any other node. It does not enter the cases of a
nested `switch` or the body of a nested `for-in`/`for-of`, but it reads the
other expressions: the entry node of `f` has the c-use `{x}` and the p-use
`{a, o}` (a nested `case` turns the following identifiers into p-uses until a
binary, call, unary or conditional expression resets it). These uses are also
found at the nodes of the statements themselves, so the entry node gets extra
pairs (for example `(5,entry_b)` in the golden `inter-page/0.dupairs.dot` of the
ES2015+ fixture). Feature `002-small-refactors` keeps this behavior (the
golden output must not change); `usedExpressionsOf` decides only the
expressions read by the node itself, and the handlers for nested
`switch`/`for-in`/`for-of` stay in the walk of `findUSESet`.

## Found while building the hierarchical models (feature `003-hierarchical-models`)

### 19. Sub-models of the inter-procedural model leak definitions of outer code (fixed by `003-hierarchical-models`)

```js
var a = 1;
function p() {
  function r() {
    function c() { return a; }
    c();
  }
  r();
}
p();
a = 2;
p();
```

Condition: a function on the call chain of a sub-model (its root function or
any ancestor of it) is called two or more times, or is called in a loop. Then
the analysis of the sub-model leaks along the edges of shared nodes to outer
code, and the sub-model gets pairs with definitions made outside it.

Mechanism: before feature `003-hierarchical-models`, the models of a page
shared their `FlowNode` objects, and an outer model added edges to the nodes of
a sub-model: the exit node of a called function got an extra `return` edge to
the CALL RETURN node of every other call site
(`specs/003-hierarchical-models/research.md` R6). The worklist of the sub-model
followed such an edge out of the sub-model and came back through another call.

In the example, the page calls `p` twice, `p` calls `r` once and `r` calls `c`.
The root function `r` of the sub-model `r -> c` is called only once, but its
ancestor `p` is called twice, so before the fix the sub-model `r -> c` had the
pairs `a: L10 -> L4` and `a: L10 -> entry`, although `a = 2` (L10) is in the
main program. The direct form (`specs/003-hierarchical-models/probes/n1.js`):

```js
var a = 1;
function f() {
  function h() { return a; }
  h();
}
f();
a = 2;
f();
```

Here the sub-model `f -> h` had `a: L7 -> L3` and `a: L7 -> entry`.

| Program | Sub-model | Pairs before the fix | Pairs after the fix |
|---|---|---|---|
| `probes/n1b.js` (above) | `r -> c` | `a: L10 -> L4`, `a: L10 -> entry`, `c: entry -> L5` | `c: entry -> L5` |
| `probes/n1b.js` | `p -> r -> c` | `a: L10 -> L4`, `a: L10 -> entry`, `c: entry -> L5`, `r: entry -> L7` | `c: entry -> L5`, `r: entry -> L7` |
| `probes/n1.js` | `f -> h` | `a: L7 -> L3`, `a: L7 -> entry`, `h: entry -> L4` | `h: entry -> L4` |

**Fixed** by feature `003-hierarchical-models` (US1): each model has its own
graph that holds only the nodes and edges of its own subtree, so the analysis
of a sub-model cannot leave it. Only the leaked pairs disappear; the pairs of
the top inter-procedural model, the intra-page model and the inter-page model
are unchanged. The full comparison of the probes `n1`, `n1b` and `n1c` is in
`specs/003-hierarchical-models/probes/n1-leak-baseline.md`; the programs are in
`specs/003-hierarchical-models/probes/` (copies used by the tests are in
`tests/dujs/cases/probes/`).

## Found by checking the MDN "Advanced JavaScript objects" examples (after feature `003-hierarchical-models`)

The examples of the MDN module
<https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects>
(object prototypes, classes, the bouncing balls of "Object building practice")
were analyzed and compared with def-use pairs derived by hand. The other
differences found are the documented limits (assigning to `a.b` defines `a`,
§7, only call statements `f();` are connected, §18).

### 20. A use after a nested expression in a condition is a c-use (pre-existing; fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-001): every variable read
by the condition of a decision node (including the discriminant of a
`switch`) is a p-use whatever the shape of the expression, except the reads in
the arguments of a call or `new` (and the expressions of a tagged template),
which are c-uses. The example now gives `c: L1 -> L2>L3:T` and
`c: L1 -> L2>exit:F`, like `a` and `b`. As a consequence, the argument `a` of
`if (f(a))` is now a c-use (it was a p-use). The head of a for-in/for-of loop
and the walk of an entry node over a function body (§18) keep the previous
rules. Checking the MDN examples after the fix also showed that, before the
fix, a condition that is a member expression (`if (o.e)`) gave the c-use
`o: L1 -> L2`; it is a p-use now as well. The description below is the
behavior before the fix.

```js
var a = 1, b = 2, c = 3;
if (a + b >= c) {
  a = 0;
}
```

`c` is read by the condition of the decision node `L2`, so its pairs should be
p-uses (`c: L1 -> L2>L3:T` and `c: L1 -> L2>exit:F`), but the result is the
c-use `c: L1 -> L2`; `a` and `b` are p-uses. With the operands swapped
(`if (c <= a + b)`) all three are p-uses. The same happens when the left
operand is a unary expression or a call (`if (-a < c)`, `while (f(a) < c)`).

In `findUSESet` (`lib/dujs/defuseanalyzer.js`), the handlers of
`BinaryExpression`, `CallExpression` and `UnaryExpression` set `isPUse` to
`false` when they finish, so the operands of the outer expression visited after
a nested one are taken as c-uses. In the bouncing balls example the condition
`this.x + this.size >= width` of `Ball.update` has this form; its result is not
affected there only because class methods are not connected as call targets
(§7).

### 21. A `new` statement is not a call-site (pre-existing; fixed by `004-fix-remaining-issues`)

**Fixed** by feature `004-fix-remaining-issues` (FR-002, FR-003, FR-018): a
statement `new F(...);` is a call-site connected to the function `F`; when the
callee is a class, `new A(...);` is connected to the instance field
initializers of `A` in source order and then to its constructor (the super
class is not followed). The example now gives `x: L3 -> L6`, with the
inter-procedural model `[$DOMAIN.$PAGE_0, $DOMAIN.$PAGE_0.P]` as for `P(1);`.
Calls inside other expressions (`y = new F();`) are still not connected. The
callee is resolved by the strict rule of §22 (0). The description below is the
behavior before the fix.

```js
var x = 0;
function P(a) {
  x = a;
}
new P(1);
console.log(x);
```

`new P(1);` runs `P`, but no inter-procedural model is built and the
intra-page model has `x: L1 -> L6` instead of `x: L3 -> L6`. With `P(1);` the
call is connected and the pair is `x: L3 -> L6`. Only a node whose AST is a
`CallExpression` is a call-site (`getInterProceduralModelStartFromTheScope` in
`lib/dujs/modelbuilder.js`); a `NewExpression` is not. The README says that
only call statements (`f();`) are connected, without saying whether `new`
statements are included.

## Found by feature `004-fix-remaining-issues`

### 22. Strict resolution of `f()` and follow-up items (found by `004-fix-remaining-issues`; (2) fixed by `006-eslint-scope`; (3) fixed by `007-split-call-nodes`; (1) partly fixed and (5) fixed except for §38 by `008-property-defs-method-calls`)

**Note (feature `005-summary-analysis`, D2, FR-005)**: in a function, `f();`
with no definition of `f` reaching the call in the function is now connected
when the binding of `f` has only one definition on the page and it is a
function declaration (also in a block), a function expression bound by
`const`/`let` (also an arrow function) or the inner name of a named function
expression; self and mutual recursion are connected too. `new F()` in a
function and the other cases keep the strict rule below. The decision H3 of
feature `004-fix-remaining-issues` ("a function does not see the function
definitions of outer code") is replaced by this rule. Known limits: P30
(`window.f = …` is not a definition of `f`, so `f()` may be connected to the
wrong function) and a parameter with the name of a function declaration
(`function g(f) { function f() {} function h() { f(); } }`: the parameter is
not counted, so the call is connected; the result is right, since the
declaration overwrites the parameter), both in the README.

(0) **Behavior change: `f();` uses the strict rule** (FR-018). A callee
variable (of `f()`, `new F()`, `new A()`, `A.s()`, and the `A` of the
`new A()` definitions of `o` in `o.m()`) is resolved only when it has at
least one definition reaching the call and all of them refer to the same
function or class. Before the feature, `f();` was connected to the first
reaching definition that is a function. When the variable has no reaching
definition and the callee is a class, the call is also connected when the
name has only one definition on the whole page (class relaxation; not for
functions). With mixed definitions the call is no longer connected:

```js
var x = 0, c = 1;
var f = function () {
  x = 1;
};
if (c) {
  f = function () {
    x = 2;
  };
}
f();
console.log(x);
```

`specs/004-fix-remaining-issues/probes/mix-f.js`: before the change, `f();`
was connected to the first function and the pair was `x: L3 -> L11`; now
`f();` is not connected (no inter-procedural model) and the pair is
`x: L1 -> L11`.

Follow-up items (not fixed):

(1) **Partly fixed** by feature `008-property-defs-method-calls` (FR-001,
FR-002, US1): `o` is no longer defined by a member assignment. A member
target (`o.p = v`, `o[k] = v`, `o.p += v`, `o.p++`, `delete o.p`, a member
target in a destructuring pattern or in the left side of `for...in`/
`for...of`) defines no variable; its object expression and computed keys are
reads (`o` and `k` are used at that node). When the object variable is the
built-in `localStorage` of the domain, the definitions and uses are those of
`develop` (exempt; `localStorage.k = v` is still a stored definition). The
program below now connects `o.m()` (`x: L4 -> L10`, `o: L7 -> L8`,
`o: L7 -> L9`; no `o: L8 -> L9` and no `x: L1 -> L10`;
`specs/008-property-defs-method-calls/probes/p1-ki22-1-prop.js`). This is
not a full fix: there is no definition of the property `o.p`, so the data
flow from a property write to a read of it is not a pair any more (§51). The
original description follows.
**An assignment to a property `o.p = 1` is taken as a definition of `o`.**
It should be a definition of `o.p` and a use of `o` (planned for feature
`008`, which must keep `localStorage.k = v` as a stored definition). One
consequence is that `o.m()` after such an assignment is not connected, because
the reaching definition of `o` is no longer `new A()`:

```js
var x = 0;
class A {
  m() {
    x = 1;
  }
}
var o = new A();
o.p = 1;
o.m();
console.log(x);
```

The intra-page pairs are `A: L2 -> L7`, `console: entry -> L10`,
`o: L8 -> L9` and `x: L1 -> L10`; without `o.p = 1;` the call is connected and
the pair is `x: L4 -> L9`.

(2) **Fixed** by feature `006-eslint-scope` (FR-004, US2): the inner name of a
named class or function expression, and the inner binding of a class
declaration, are variables visible only in the class or function, defined at
the expression or declaration node; `specs/006-eslint-scope/probes/named-expr.js`
gives `Q: L1 -> L2` and `fact: L4 -> L5`. See also §32. The original
description follows.
**The inner name of a named class or function expression is not a
variable.** In `var B = class Q { static s = Q; };` there is no pair for `Q`;
the same holds for the name of a named function expression used in its own
body.

(3) **Fixed** by feature `007-split-call-nodes` (FR-001, US2): every call
dujs can resolve is a call site wherever it is in a node (assignments,
variable initializers, `return`, `throw`, conditions, parameter default
values, field initializers, arrow function bodies, arguments of other calls),
except the positions of §44 and §46; `new F().m()` is two call sites. The
resolution rules are unchanged. For `var x = 0;` L1 / `function g() {` L2 /
`x = 1;` L3 / `return 2;` L4 / `}` L5 / `var y = g();` L6 /
`console.log(x, y);` L7 the pairs are now `x: L3 -> L7` and `y: L6 -> L7`, and
`x: L1 -> L7` is gone (`specs/007-split-call-nodes/probes/p3-assign.js`); the
program of §10 gives `d: L1 -> L3`. The original description follows.
**Calls inside other expressions should also be call-sites** (planned
for feature `007`, with §16). Only call
statements (`f();`, `new F();`, the method calls of §7, and the value of an
instance field that is itself `this.m()` or `new B()`) are connected;
`return f()`, `x = f()` and similar calls are not (decision U1 of the plan of
feature `004-fix-remaining-issues`). For example, in the program of §10 the
arrow function in the default value is now a scope, but `return g();` is not
connected, so there is still no pair for `d`.

(4) **`localStorage.removeItem` is not a definition.** Found while studying
the MDN examples: only `localStorage.setItem` defines a stored item
(`localStorageSetterNames` in `lib/dujs/globalscopectrl.js` is `['setItem']`),
so removing an item does not kill the stored definition in the inter-page
model.

**Correction** (feature `005-summary-analysis`, decision D1): the premise above
is wrong. `localStorageSetterNames` is not referenced in `lib/`, so
`localStorage.setItem(…)` makes no stored definition either; the only stored
definition is `localStorage.k = v`, and it does not distinguish the keys
(every key is one stored definition) and is never killed. The storage model
(`setItem`, `getItem`, `removeItem`, `clear`, keys) is moved to a separate
feature.

**Note (feature `008-property-defs-method-calls`, decision D004)**: a member
target whose object variable is the `localStorage` of the domain keeps the
definitions and uses of `develop` (it is exempt from the change of §22 (1)),
so these gaps of `develop` are frozen and not fixed (two-page probes
`specs/008-property-defs-method-calls/probes/pages/s1-eq.js`–`s9-nested.js`,
output `probes/pages/baseline-develop.txt`, run by `probes/run-pages.js`):

- `localStorage[k] = 2` does not read `k` (s4).
- `localStorage.k = 2` (s1), `localStorage.a.b = 2` (s8) and a destructuring
  `[localStorage.k] = a` (s5) do not read `localStorage`; `localStorage.k++`
  (s7) and `localStorage.a.b = 2` do not define it either.
- The destructuring `[localStorage.k] = a` (s5) and `for (localStorage.k in a)`
  (s6) define `localStorage` in the intra-procedural model but are not stored
  definitions, so the second page does not read them.
- The nested `x = (localStorage.k = 1)` (s9) defines `localStorage` but is not
  a stored definition.

A member chain rooted at a call has no object variable and is not exempt:
`localStorage.getItem(n).p = o` reads `localStorage` and `n` (decision D013,
`probes/p42-localstorage-call-chain.js`).

(5) **Fixed except for the `finally` case of §38** by feature
`008-property-defs-method-calls` (FR-006–FR-008, FR-013, US3). A
reachability checker (`tests/helpers/reachability.js`) recomputes from the
graph which nodes the entry node can reach (a call continues only when the
callee can return normally) without reading the results of the solver, and
checks that no pair has an unreachable definition or use. Checked range: the
56 probes of the feature (`tests/dujs/cases/probes008/`), the 4 golden
cases and the 32 MDN programs (33 files), in the four model levels
(intra-procedural, inter-procedural, intra-page, inter-page): 92 programs and
569 models (`tests/dujs/reachabilityinvariant.js`). The only pairs left are those of
the `finally` case of §38 (P21, P23, P24; 18 items of
`tests/dujs/cases/reachability-allowlist.json`, none in the golden fixtures
or the MDN programs). One cause was fixed (FR-013): the deferred p-uses of a
decision (the variables read in the condition before a call in it, feature
`007`) were paired with the branches even when the call never returns
normally, so the decision cannot be reached; they are now paired only when
the solver reaches the decision (`findDUPairs` in
`lib/dujs/defuseanalyzer.js`). With `f` recursing unconditionally, the
inter-procedural and intra-page models lose `f: entry -> L5>L6:T` and
`f: entry -> L5>L8:F` for `if (f())` and `while (f())`
(`specs/008-property-defs-method-calls/probes/p38-if-norecall.js`,
`p40-while-norecall.js`) and `g: entry -> L8>L9:T` and
`g: entry -> L8>L11:F` for `if (g(f()))` (`p39-if-nested-norecall.js`); the
c-uses of the call segment (`f: entry -> L8`) and the intra-procedural
models are unchanged. The original description follows.
**Pairs in the dead code after an unconditional recursion** (planned for
feature `008`). **Note (feature `005-summary-analysis`)**: the summary of a
recursive callee starts from "no normal return" (FR-003), so a call that never
returns normally has no normal successor in the data flow; the program below
now gives only `A: L2 -> L8` (`x: L5 -> L9` is gone). Feature `008` checks the
remaining dead-code pairs. With a back
edge for recursion (§7), the nodes after an unconditional recursive call
cannot be reached from the entry node:

```js
var x = 0;
class A {
  m() {
    this.m();
    x = 1;
  }
}
new A().m();
console.log(x);
```

Before feature 005, the intra-page pairs were `A: L2 -> L8` and `x: L5 -> L9`. The pairs
`console: entry -> L9` and `x: L1 -> L9` disappeared, since L5, L9 and the nodes
after them are not reachable from the entry node; but the worklist also
processed the unreachable nodes, so the definition `x = 1` (L5) inside the
unreachable cycle flowed out to L9 and gave `x: L5 -> L9`
(`specs/004-fix-remaining-issues/research.md` P8,
`specs/004-fix-remaining-issues/probes/cyc-uncond.js`).

## Found by checking the MDN examples (after feature `004-fix-remaining-issues`)

The examples of the MDN modules "Advanced JavaScript objects" and "Dynamic
scripting with JavaScript" (33 programs, about 1,070 lines;
mdn/content@74f6e26e, mdn/learning-area@21973263) were analyzed with the
feature and with `develop`, and compared with def-use pairs derived by hand.
Every difference from `develop` is a fix of this feature and there is no
regression; the other differences from the hand-derived pairs are the
documented limits, except the two issues below.

### 23. `o.m()` in a function is not connected when `o` is defined outside the function (fixed by `008-property-defs-method-calls`)

**Fixed** by feature `008-property-defs-method-calls` (FR-004, US2): in a
function (also a method, an event handler or a field initializer), `o.m()`
with no definition of `o` reaching the call in the intra-procedural model of
the function is connected to the instance method `m` of class `A` when the
binding of `o` (declared in any scope, also an outer function) has only one
definition on the whole page (member assignments do not count, §22 (1)), that
definition is a `const`/`let` declaration `new A(…)`, and `A` is a class at
that node. The program below now gives `x: L4 -> L12` instead of
`x: L1 -> L12` (`specs/008-property-defs-method-calls/probes/p5-ki23.js`),
and the MDN calls `evilBall.draw()`, `evilBall.checkBounds()` and
`evilBall.collisionDetect()` in `loop()` are connected
(`specs/008-property-defs-method-calls/mdn-diff.md`). Limits of the rule
(probes in the same `probes/` directory):

- `var` is not relaxed (decision D002): `var o = new A();` has the initial
  value `undefined` too, so the page has two definitions of `o`; the call
  stays unconnected (`p6-ki23-var.js`).
- A declaration separated from its assignment is not relaxed:
  `let o; o = new A();` is two definitions (`p35-ki23-let-split.js`), like
  `let f; f = function () {…};` for `f()` (`p36-d2-let-split.js`).
- An assignment in a function that is never called counts as a definition
  too (`p28-ki23-let-reassigned.js`).
- The execution order is ignored, as for `f()` and `new A()`: a function
  called before `const o = new A();` is connected, although running it throws
  (temporal dead zone; `p34-ki23-tdz.js`).

The original description follows.

**Planned for feature `008`** (decision D1 of feature `005-summary-analysis`).
The relaxation D2 of feature `005-summary-analysis` covers only `f()`, not
`o.m()`.

```js
var x = 0;
class A {
  m() {
    x = 1;
  }
}
const o = new A();
function g() {
  o.m();
}
g();
console.log(x);
```

`o.m();` is not connected: the intra-page pairs are `A: L2 -> L7`,
`console: entry -> L12`, `g: entry -> L11` and `x: L1 -> L12`, instead of
`x: L4 -> L12`. Like `f()`, the call
is resolved with the reaching definitions of the intra-procedural model of the
function (`classOfInstance` in `lib/dujs/callresolver.js`), where `o` has no
definition; the class relaxation of FR-018 covers only `new A()` and `A.s()`.
In the MDN "Object building practice" assessment, `evilBall.draw()`,
`evilBall.checkBounds()` and `evilBall.collisionDetect()` inside `loop()` are
not connected for this reason. A fix could relax the rule like FR-018 (connect
when `o` has only one definition on the page and it is `new A(...)`).

### 24. Only a fixed list of global objects is defined (pre-existing; fixed by `006-eslint-scope`)

**Fixed** by feature `006-eslint-scope` (FR-006, US3): an identifier read
without a declaration is a global of its page, defined at the entry node of
the page with the new definition kind `global` (`console.log(Math.PI);` now
gives `Math: entry -> L1`). The names of one page share one variable, and two
pages do not share it. `undefined`, `NaN`, `Infinity` (when not declared) and
`arguments` are excluded; the fixed list, `localStorage` and implicit globals
(assigned without a declaration) behave as before. See also §31 for `eval`.
The original description follows.

```js
console.log(Math.PI);
```

The only pair is `console: entry -> L1`; there is no pair for `Math`. A page
scope defines only the built-in objects listed in `lib/dujs/pagescope.js`
(`window`, `document`, `String`, `Number`, `Boolean`, `Array`, `Map`,
`WeakMap`, `Set`, `Date`, `console`), and the domain scope defines
`localStorage`. Other globals, such as `Math`, `Object`, `JSON`, `Promise`,
`alert` and `requestAnimationFrame`, are not defined, so their uses have no
pairs.

## Found by feature `006-eslint-scope`

The programs below are in `specs/006-eslint-scope/probes/`; run them with
`node specs/004-fix-remaining-issues/probes/run.js specs/006-eslint-scope/probes/<file>`.
The results before the fix are those of `develop` (`584e17d`), recorded in
`specs/006-eslint-scope/probes/develop.txt`. The MDN examples of §23 were
checked again with the feature (`specs/006-eslint-scope/mdn-diff.md`): every
difference from `develop` is a new global (§24) or a new inner binding of a
class declaration, and no example throws.

### 25. A catch parameter is not a variable, and the catch node reads the catch block (fixed by `006-eslint-scope`)

**Fixed** by feature `006-eslint-scope` (FR-003, decision D4): the catch
parameter (also a destructured one) is a variable of the catch clause, defined
at the catch node and visible only in the catch block; the catch node reads
only the expressions evaluated by the parameter (the defaults of a pattern),
and defines only the parameter. The description below is the behavior before
the fix.

```js
var e = 1;
try {
  e = 2;
} catch (e) {
  console.log(e);
}
console.log(e);
```

`catch-b.js`: the catch parameter was not a definition, so `console.log(e)` in
the catch block got the outer `e` (`e: L3 -> L5`); the catch node walked the
whole catch block and read `e` and `console` (`e: L3 -> L4`,
`console: entry -> L4`). Now the pairs are `e: L4 -> L5` and `e: L3 -> L7`.

The same problem in the other programs:

- `catch-a.js`: `e = 3;` in the catch block was a definition of the outer `e`
  (`e: L5 -> L8`).
- `catch-c.js`: neither `catch ({message})` nor `catch (err)` defined its
  parameter (no `message` or `err` pair; now `message: L4 -> L5`,
  `err: L7 -> L7`).
- `catchloop.js`: with no outer `e`, `e = 3;` in the catch block became an
  implicit global of the page and leaked into another function and catch
  clause (`e: entry -> L5`, `e: L6 -> L5`, `e: L6 -> L11`, `e: L6 -> entry`,
  `e: entry -> entry`).
- `catchinner.js`: a function in the catch block could not read the
  parameter (no `e` pair), and the catch node read `g` (`g: entry -> L5`).
- `catch-edge.js`: a catch clause without a parameter also read its block
  (`e: L3 -> L4`, `console: entry -> L4`); in `catch (e) { var e = 4; }` the
  initial value was taken as a definition of the outer `e` (`e: L10 -> L13`)
  instead of the catch parameter (Annex B.3.5; now `e: L10 -> L11`).
- `plan-u3.js`: the catch node also defined the variables assigned in its
  block (`if (c) { y = 1; }` gave `y: L4 -> L7`, and the catch node read `c`,
  `c: L1 -> L4`).
- `plan-catch1.js`: the only `e` of the page is a catch parameter; it was an
  implicit global (`e: entry -> L4`) and the catch node read `console`
  (`console: entry -> L4`).

### 26. Identifiers in parameter default values resolve to the body (fixed by `006-eslint-scope`)

**Fixed** by feature `006-eslint-scope` (FR-005): identifiers in parameter
default values are resolved by `eslint-scope`, which does not let them see the
`var` declarations of the function body. The description below is the
behavior before the fix.

```js
var x = 1;
function f(a = x) {
  var x = 2;
  return a;
}
f();
```

`pdef.js`: the `x` of the default value resolved to the `var x` of the body,
so the pair was `x: entry -> L2` (its undefined initial value). Now the pair
is `x: L1 -> L2`.

### 27. A variable may have the name of a reserved scope name

To analyze programs that read `$` or non-ASCII names (`$('#x')`, `été`), which
are globals since §24 is fixed, a variable name is any ES IdentifierName
(decision U1 of feature `006-eslint-scope`; `develop` threw
`Invalid value for a Var` on `var $a = 1;`). A variable can now have the same
name as a reserved scope name (`$DOMAIN`, `$PAGE_n`, `$ANONYMOUS_FUN_n`,
`$BLOCK_n`):

```js
var $ANONYMOUS_FUN_0 = 1;
var f = function () { return $ANONYMOUS_FUN_0; };
f();
```

The analysis is correct (`$ANONYMOUS_FUN_0: L1 -> L2`; the variable and the
scope `$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0` are not confused, because nothing
looks up a scope by the name of a variable), but the output is hard to read.
Status: not fixed (output readability only).

### 28. A function name starting with `$` makes the analysis throw (pre-existing)

```js
function $(s) { return s; }
$(1);
```

The analysis throws `Invalid value for a FunctionScope`; `function $a() {}`
does the same. The name of a function scope still follows the old rule for
names, and `develop` behaves the same way. Status: not fixed; the naming of
scopes is out of the scope of feature `006-eslint-scope` (FR-009).

### 29. `optimistic` resolution differs from the literal fallback of D6 in one case

Feature `006-eslint-scope` resolves the references made dynamic by a direct
`eval` or `with` with the `optimistic` option of `eslint-scope`, instead of
looking names up along the scope chain (decision D6). The only known
difference from that literal rule is a function with both a parameter default
value and a direct `eval`:

```js
var x = 1;
function f(a = x) { var x = 2; eval(""); return a; }
f();
```

The `x` of the default value resolves to the global `x` (`x: L1 -> L2`), as
required by §26; the literal fallback would have found the `var x` of the
body first. Status: intended (research R2 of the feature).

### 30. Pairs of `with` and `eval` programs are those of `develop`

With `optimistic` resolution, programs with `with` or a direct `eval` give the
pairs of `develop` (`with.js`, `evalouter.js`), plus the pairs of the new
global `eval` (§31). Status: unchanged behavior, guarded by
`tests/dujs/scopeguards.js`.

### 31. `eval` is a global of the page (decision)

`eval` is not declared, so since §24 is fixed it is a global of its page like
any other undeclared name read (decision "implement US3" of feature
`006-eslint-scope`; the excluded names stay `undefined`, `NaN`, `Infinity`
and `arguments`):

```js
function outer(p) {
  var a = 1;
  function k() { eval("x"); return a; }
  k();
  return a + p;
}
outer(2);
```

`evalouter.js` keeps the pairs of `develop` (`a: L2 -> L3`, `a: L2 -> L5`,
`p: entry -> L5`) and also gives `eval: entry -> L3` and `eval: entry -> entry`.
Status: intended.

### 32. The inner name of a named class expression in its static members (fixed by `006-eslint-scope`)

**Fixed** by feature `006-eslint-scope` (decision "implement US2", task T073).
When the static members of a class are connected as a call, the definitions
of the node of the class were all moved to the CALL RETURN node, after the
static members; only a class declaration kept its name at the call node. So
the inner name of a named class expression had no definition in its static
members:

```js
var B = class Q {
  static s = Q;
};
```

Before the fix there was no pair for `Q` (004 had a test asserting it). Now
the definition of the inner name stays at the call node (`replayCall` in
`lib/dujs/expansion.js`), the other definitions (`B`) still move to CALL
RETURN, and the pair is `Q: L1 -> L2`. The result also has `Q: L1 -> entry`,
the use at the entry node of the static member function of §18 (not fixed;
left to feature 005).

### 33. `BindingPattern#getBoundNames` has no caller

`getBoundNames` in `lib/dujs/bindingpattern.js` is not called by `lib/` or
`tests/` (it looks like dead code). It reads `target.name`, so feature
`006-eslint-scope` only lists it in the S5 allow list of the static test
`tests/dujs/scopesource.js`. Status: not fixed; deleting the method (and its
allow list entry) is suggested for a later change.

### 34. Lookups by name that the static test does not catch

The static test `tests/dujs/scopesource.js` (FR-012 (1) of feature
`006-eslint-scope`) checks that `lib/` does not look variables up by name. In
`lib/dujs/scopebinding.js`, rule S6 only flags `Map#get`/`Map#has`/`Map#set`
and `Set#has` whose key is `<x>.name`, an identifier named `name` or a string
literal, outside the whitelisted functions. These forms are not caught:

```js
var k = n.name;
m.get(k);            // the name is stored in a variable first
m.get(`${n.name}`);  // template literal key
```

No such lookup exists in `lib/` now. Status: not fixed (a limit of the check;
code review covers it).

## Found by feature `005-summary-analysis`

The programs below are in `specs/005-summary-analysis/probes/` unless given
inline; run them with `node specs/005-summary-analysis/probes/run.js <file>`.
The results before the feature are those of `develop` (`9e324be`), recorded in
the probe table of `specs/005-summary-analysis/spec.md`. The MDN examples were
checked again with the feature (`specs/005-summary-analysis/mdn-diff.md`):
every difference from `develop` is a pair of §18 that disappears or a change
made by the relaxation D2 (§22 (0)), and no example throws.

### 35. The control flow of `try`…`finally` (fixed by `005-summary-analysis`)

**Fixed** by feature `005-summary-analysis` (FR-013, US6). Before the feature,
the CFG skipped a non-empty `finally` block, or left it the wrong way, in
these cases:

- an exception thrown in `catch` left the function (or went to the event loop
  on the page) without running `finally` (P17, P21);
- a `finally` entered by an exception went on to the statement after the
  `try`, as after a normal completion (P18, and P20, where that statement is
  not reachable);
- `return`, `break` and `continue` leaving a `try` skipped `finally` (P22,
  P23).

```js
let r = 0;
function f() {
  try {
    r = 1;
    throw "bogus";
  } catch (e) {
    r = 2;
    throw e;
  } finally {
    r = 3;
  }
}
try {
  f();
} catch (e) {
  console.log(r);
}
console.log(r);
```

`m3-mdn-finally-return.js` (from the MDN guide "Control flow and error
handling"): before the feature `r = 3` (L10) had no pair; now
`r: L10 -> L16` and `r: L10 -> L18` are found. `c-fin1.js` no longer has
`r: L9 -> L14` nor `r: L9 -> L16`; `c-fin4.js` has no pair used at L8 (not
reachable); `c-m4h.js` gives `r: L13 -> L3`; `c-fin2.js` gives only
`r: L7 -> L11` (no `r: L4 -> L11`); `c-fin5-break.js` gives `r: L7 -> L10`
and no `r: L4 -> L10`; `c-fin6-continue.js` gives `r: L9 -> L12` and no
`r: L6 -> L12`.

The graph has a new node type `finallyExit` at the end of a non-empty
`finally` block that can be entered by an exception or a jump, and a new edge
type `finally` (one edge per target of a jump through the block); see the
README. An empty `finally` (`finally {}`, `finally { ; }`) has no node and is
treated as no `finally`.

### 36. Exception paths carry only the definitions before the throwing node (behavior change)

**Behavior change** of feature `005-summary-analysis` (FR-014, US6 scenario 7):
the exception edge of a node carries the definitions valid before the node
(its IN set), not after it: a statement that throws is treated as not
completed. This holds for every exception edge of every model and for the
definitions an exception carries out of a callee (the fourth part of a
summary). Before the feature, the exception edges carried the definitions
after the node.

```js
var x = 0;
var o = {};
try {
  x = o.p;
} catch (e) {
  console.log(x);
}
```

`c-out3.js`: before the feature the only pair of `x` was `x: L4 -> L6`; now it
is `x: L1 -> L6` (`o.p` throws before `x` is assigned). A call statement can
throw only before the call (evaluating the callee and the arguments); once the
callee returns normally, the statement does not throw (decision Q-a), and an
exception the callee does not catch carries the definitions valid where it is
thrown in the callee.

**Note (feature `007-split-call-nodes`, FR-005)**: "once the callee returns
normally, the statement does not throw" holds only for a call statement
(nothing that may throw is evaluated after the return). With calls inside
expressions, each segment of the node (§45) is checked on its own: the part
evaluated after a return may throw when it contains an assignment, a binary,
unary or member expression, or another call, and then its exception edge
carries the definitions valid before that part, including those of the
callee. In `try { var y = f().p; } catch (e) { … }` (`p20-after-return-throws.js`)
the `catch` gets both the definitions before the call and those of `f`
(`.p` throws after the return); `x = f();` in `try` also throws after the
return (the assignment; `p29-assign-try.js` gives `x: L3 -> L9`), while
`var y = f();` does not (`p30-var-try.js`). A decision node whose condition is
only the call, `if (f())`, no longer throws after the return: its exception
edge is removed and the pair `x: L3 -> L11` of `p35-if-call-try.js` (a
definition of `f` reaching the `catch`) disappears. This is a behavior change
of feature `007` (§45).

### 37. Generators and async functions have a conservative summary

A generator function runs only when it is iterated, and an async function
returns to its caller at its first `await`, so a call does not tell which part
of the body has run. Feature `005-summary-analysis` (FR-001, research R13)
gives them a conservative summary: the call may return normally, kills no
definition, and every definition the callee makes (on a normal or exceptional
path) may flow out after the call.

```js
var x = 0;
function* g() {
  x = 1;
}
g();
console.log(x);
```

`c-gen.js` gives `x: L1 -> L6` and `x: L3 -> L6` (before the feature only
`x: L3 -> L6`, as if the body had run to the end); `c-asy.js` (an async
function assigning `x` after `await p;`) gives `x: L1 -> L8` and
`x: L5 -> L8`. The pairs inside the body are those of a normal function; the
iteration protocol and the resumption after `await` are not modeled. Status:
limit, not fixed.

### 38. A `finally` entered in several ways continues to all of them

When one `finally` block can be entered in more than one way (normally, by an
exception, by `return`/`break`/`continue`), its `finallyExit` node has an edge
for each way, and the data flow does not remember which way a path came in: a
path entered normally may continue with the exception or to the jump target,
and the other way around (research R6; a safe over-approximation). The
scenarios of §35 each have one non-normal way and are exact. In the golden
fixture (`parseSaved` in `tests/golden/fixtures/page0/app.js`) the `finally` is
entered normally and by an exception of the `catch` block, which adds
`parsed: 52 -> 60` (`specs/005-summary-analysis/golden-diff.md`). Status:
limit, not fixed (copying the `finally` nodes per way, as compilers do, would
break the one node per AST node of the CFG builder).

**Note (feature `008-property-defs-method-calls`, decision D003, FR-008)**: the
reachability checker of §22 (5) finds a second effect of this limit. When the
`try` block cannot complete normally, the `finally` is entered only by an
exception, but its `finallyExit` still continues on the normal path, so the
code after the `finally` gets pairs although it cannot be reached. Three forms
(`specs/008-property-defs-method-calls/probes/`, copied to
`tests/dujs/cases/probes008/`):

- P21, in the caller itself (`p21-finally.js`): `f()` in the `try` recurses
  unconditionally (L6), the `finally` is L8–L10 and `console.log(x);` is L11.
  Pairs `x: L1 -> L11` and `console: entry -> L11`.
- P23, through a summary (`p23-finally-summary.js`): the same `try` is in `g`
  (L6–L10), followed by `x = 2;` (L11); the summary of `g` gets a normal
  return from the `finallyExit` (`lib/dujs/summary.js:245`), so `g();` (L13)
  continues to `console.log(x);` (L14). Pairs `x: L11 -> L14` and
  `console: entry -> L14`.
- P24, a callee that only throws (`p24-finally-throw.js`): `t()` (L6) runs
  `throw x;` and is not recursive; the rest is as in P21. Pairs `x: L1 -> L11`
  and `console: entry -> L11`.

Each form has the two pairs in the inter-procedural model of the page, the
intra-page model and the inter-page model, which gives the 18 items of the
allowlist `tests/dujs/cases/reachability-allowlist.json` (models
`inter-procedural[1]`, `intra-page[0]`, `inter-page` for P21;
`inter-procedural[2]`, `intra-page[0]`, `inter-page` for P23;
`inter-procedural[0]`, `intra-page[0]`, `inter-page` for P24). The checker
accepts an item only when the pair breaks the reachability check, the
definition and the use become reachable when the `finallyExit` is allowed to
continue on the normal path, and the witness matches. Witness of each item:
the `finallyExit` with no reachable entry other than an exception,
`{"scope":"$DOMAIN.$PAGE_0","line":10,"nonExceptionalEntries":0}` for P21 and
P24 and `{"scope":"$DOMAIN.$PAGE_0.g","line":10,"nonExceptionalEntries":0}`
for P23. The golden fixtures and the MDN programs have no such item.
Candidate for a narrow fix (not done, D003): **when a `finally` has no
reachable entry other than an exception, its `finallyExit` does not continue
on the normal path.**

### 39. A recursive run reading definitions of the outer run (research R14)

Research R14 of feature `005-summary-analysis` lists a possible
over-approximation kept from feature `004-fix-remaining-issues`: the entry of a
recursive callee may not kill the definitions of the outer run of the same
function, so an inner run could read, before its own definition, a definition
made by the outer run. The feature does not change this. Checked after the
feature with programs where an inner run reads a local variable or a
parameter before defining it (for example
`function f(n, y) { if (n > 1) { y = 5; f(n - 1); } else { console.log(y); } } f(2);`,
one statement per line): the only pair is `y: entry -> L6`, so the
over-approximation was not reproduced. Status: kept as a watch item; no
program showing it is known.

### 40. The analysis did not end with a handler in a linked recursion (fixed by `005-summary-analysis`)

Found while finishing feature `005-summary-analysis` (task T103, FR-003): with
the relaxation D2 (§22 (0)), a handler can call the function that registers
it, so a handler is registered again in a chain of registrations:

```js
var x = 0;
function k() {
  function h() { x = 1; k(); }
  document.addEventListener('click', h);
  h();
}
k();
```

`k()` in `h` is linked to `k`, so `k -> h -> k`, and `h` is a handler
registered in `k`. The search of the handlers in
`ModelBuilder#buildIntraPageModel` (`lib/dujs/modelbuilder.js`) listed a
handler again for every registration found and never ended; following each
chain once still grew with the simple paths of the registrations (4, 15, 64,
325, 1956, 13699 handlers for 2…7 handlers calling the registering function,
not ending in minutes for 8).

**Fixed**: when the registrations have a cycle, each handler is searched and
listed once, in the order first found (the event loop already runs a
registered handler any number of times, so the pairs are the same); without a
cycle the list is as before (§41). The analysis of the program above ends
with the handler list `["h"]` and no pair of `x` (`k` never returns
normally). Regression tests in `tests/dujs/relaxedcallee.js` run the
analysis in a child process killed after a timeout.

### 41. The handler list grows exponentially with diamond registrations (pre-existing)

When the registrations have no cycle, the search of the handlers keeps the
order and the duplicates of the search as before feature
`005-summary-analysis` (§40): each handler found is searched again, and it is
listed once per chain of registrations reaching it. With layers of handlers
that each register the two handlers of the next layer (a "diamond"), the list
doubles with each layer:

```js
var x = 0;
function a1() { x = 1; document.addEventListener("e", a2); document.addEventListener("e", b2); }
function b1() { x = -1; document.addEventListener("e", a2); document.addEventListener("e", b2); }
function a2() { x = 2; }
function b2() { x = -2; }
a1(); b1(); a2(); b2();
document.addEventListener("e", a1);
document.addEventListener("e", b1);
```

The intra-page model lists 8 handlers for this program (2 layers), and 22, 52,
114, 240 for 3…6 layers built the same way; the pairs are the same as with
each handler listed once, but the intra-page graph has an event edge and a
copy of the handler for each item. Status: not fixed (found by the review of
task T103; deduplicating also without a cycle would change the golden
output).

### 42. A handler registered by name in a function reached only from a handler is not found (pre-existing)

Found by checking the MDN examples after feature `005-summary-analysis`:

```js
var x = 0;
function h2() { console.log(x); }
function h1() { x = 1; b.addEventListener('click', h2); }
a.addEventListener('click', h1);
```

`h2` is not a handler of the intra-page model (only `h1` is), so `x` has no
pair; `develop` gives the same result. The handler named at a registering call
is looked up in the definitions reaching the call (research R8 of feature
`005-summary-analysis`), taken from the inter-procedural model of the page when
it contains the call; a call in a function reached only from a handler is in
no such model, and the definitions of the function do not include the page
function `h2`. A function expression (`b.addEventListener('click', function () {…})`)
is found. In the MDN number guessing game, `setGameOver` (called from the
handler `checkGuess`, linked by D2) registers the page function `resetGame`,
which is therefore not a handler, and the pairs of `resetGame`
(`resetButton: L48 -> L60`, `randomNumber: L66 -> …`, in the lines of the
source file) are missing. Status:
not fixed.

### 43. A callee called from the page and from a handler lists its pairs twice

Found by checking the MDN examples after feature `005-summary-analysis`:

```js
var x = 0;
function f() {
  console.log(x);
}
f();
document.addEventListener("click", function () { x = 1; f(); });
```

The intra-page model contains a copy of the body of `f` under the page and one
under the handler (the hierarchy concatenates the models, decision D4); the
call edges of both calls enter the first copy, and both copies are listed with
the same pairs, so the intra-page `.dupairs.dot` lists `x: L1 -> L3` and
`x: L6 -> L3` twice each. Each pair is realizable (`x = 1` reaches `f` through
the call in the handler), but per copy, the copy of the page cannot read
`x = 1` and the copy of the handler cannot read `x = 0`. When both calls are on
the page, the pairs are listed once. In the MDN allowance updater
(`s10-allowance-updater`) the pairs of `shoppingDone` at L17 are listed twice
for this reason. Status: presentation of the duplicated nodes, not fixed.

## Found by feature `007-split-call-nodes`

The programs below are in `specs/007-split-call-nodes/probes/` unless given
inline; run them with `node specs/007-split-call-nodes/probes/run.js <file>`.
The results before the feature are those of `develop` (`edc22d5`), recorded in
`probes/baseline-develop.txt`. The golden outputs and the MDN examples were
checked against `edc22d5` (`specs/007-split-call-nodes/golden-diff.md`,
`specs/007-split-call-nodes/mdn-diff.md`): every new or removed pair is a newly
connected call site or a change of evaluation order, every example still
completes, and the intra-procedural pairs are unchanged. The MDN check found
no new issue.

### 44. The reads and calls of a `case` test are not modeled

A `case` test that stays in the `case` node (a test that is not split, such as
`case x:` or `case g():`, or the last operand of a split test) is not
evaluated by the model: its reads have no pair and its calls are not
connected. This is a pre-existing limit (`develop` does the same) and is left
to a later feature. In `p16-switch.js` (`case x:` at L7) there is no pair of
`x` used at L7.

**Behavior change** (DECISION 005 Q3 A): `develop` connected the
static members of a class in such a test (it ran the static scope of
`case class { static y = g(); }:` before the `case` node); feature `007` does
not, like any other call in the test:

```js
var x = 0;
function g() {
  x = 1;
  return 1;
}
switch (1) {
  case class { static y = g(); }:
    console.log(x);
}
```

`develop` connects the static scope `$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0` to the
page and gives `g: entry -> L7`; with `007` the page model has no call edge
and that pair is gone (the static scope only has its own inter-procedural
model, `$ANONYMOUS_FUN_0 -> g`). The golden outputs and the MDN examples have
no instance (0 rows in the "class static 不再連結" tables of `golden-diff.md`
and `mdn-diff.md`); `tests/dujs/splitcallnodes.js` (T066) pins the behavior.

Not covered by this section (DECISION 007): the operands that the branch
splitter takes out of a `case` test, other than the last one, are ordinary
decision nodes and are modeled, as in `develop`: in `case g() && 1:` the call
`g()` is connected (`x: L3 -> L8` in the program above with this test, as
in `develop`), and in `case a && b:` the read of `a` is a p-use of the split
decision node; the static members of a class in such an operand are still
connected.

Two limits found with DECISION 007, not handled by `007`:

- `switch (f()) { case a && 1: … }`: when the test of the first `case` is
  split, there is no first `case` node to evaluate the discriminant before,
  so the discriminant is not evaluated once (§45) and `f()` is not connected.
  `develop` does not connect it either (not a regression); in this form the
  discriminant is not "evaluated once" (FR-004).
- The nodes split from a `case` test have no exception target (`throwTarget`
  of their plan is `null`) and no exception edge, as in `develop`; this is
  kept (see also §47).

### 45. Behavior changes of the segments (feature `007`)

**Segments.** In the inter-procedural, intra-page and inter-page models
(and the summaries of the callees) a node with call sites is split into
segments in JavaScript evaluation order (operands and arguments from left to
right, arguments before the call, the target of a compound assignment read
first): segment 0 before the first call, segment j between the return of the
j-th call and the next call, and the last segment after the last return.
Every read and definition belongs to the segment in which it is evaluated:
in `f(x = 1)` the callee sees `x = 1`; in `x = f()` the definition of `x` is
after the return; in `x += f()` and `if (x < f())` the read of `x` is before
the call; in `h(f())` the call of `f` comes first. No node or edge type is
added: for a statement (also a declaration, `return`, `throw`, a parameter or
field initialization) segment 0 is the copy of the node (a CALL node) and the
later segments are the nodes the calls return to (the CALL RETURN node of a
call, shown as a CALL node `call (<line>)` when it also starts the next call
of the node, as in a chain of callees); for a decision node a CALL node is
inserted before it (segment 0) and the decision node is the last segment. The
reads of a condition made before the call stay p-uses of the decision node
(same labels, e.g. `L6>L7:T`) but get the definitions valid when they are
evaluated; other reads are c-uses of the segment node, also of a CALL or
CALL RETURN node. In `.dot` outputs every CALL and CALL RETURN node is
labeled `call (<line>)` and `callReturn (<line>)` (with `:<path>` in a split
branch, and `_a`, `_b`, … for the same label); each call site has its own
record in `*.matching.json` (`seq` in evaluation order), and `beforeDecision`
is `true` for the first call of a node whose segment 0 is an inserted CALL
node (a decision node, a `switch` discriminant or the right side of a
`for…in`/`for…of`). The intra-procedural model is not split (calls stay
opaque) and its pairs are unchanged.

**The definition end of a definition made after the return is labeled
`call (<line>)`**, not `callReturn (<line>)` (DECISION 011): the definition
end names the node the definition belongs to, which is the copy of the
statement (a CALL node), although the definition is made by the CALL RETURN
node after the callee returns. For example `var y = f();` at L6 gives
`y: call (7) -> 8` in the CLI output (CLI lines are one more than the source
lines), and the MDN example `a07-prototypes-person` gives
`reuben: call (15) -> 16` for `const reuben = new Person("Reuben");`. Such a
pair does not mean that the variable is defined before the call.

**Evaluated once.** A `switch` discriminant that is not split and has call
sites is evaluated once, by a CALL / CALL RETURN chain inserted before the
first `case` node; every `case` with a test still records its own p-use of
the reads of the discriminant, with the definitions valid when the
discriminant is evaluated (`p24-switch-two-case.js`: `x: L1 -> L3` and no
`x: L3 -> L3`; `p32-switch-read-before.js`). The right side of a
`for…in`/`for…of` with call sites is evaluated once before the loop, entered
only from outside the loop; the loop variable and the reads of the left side
stay at the loop node and happen on every iteration (`p15b-for-of-once.js`
has no `x: L7 -> L3`). An already split discriminant (`switch (a && b)`,
split by the branch splitter in every model) keeps its single p-use; the two
rules coexist, since unifying them either way would change the
intra-procedural pairs.

**Decision nodes do not throw after the return.** Each segment has its own
exception edge (§36 note): a segment ending with a call may throw; the last
segment may throw only when it evaluates something that may throw
(`f().p`, `x = f()`, `f() > x`), and the last segment of `throw f();` always
throws (`p25-throw.js` gives `x: L3 -> L9`). A decision node whose condition
is only the call, `if (f())`, has no exception edge after the return any
more, so `p35-if-call-try.js` loses `x: L3 -> L11`. The `exceptionalReturn`
of a call record, also for a decision node or `throw`, is the exception
target of the segment-0 node (following it when its incoming edges are
redirected to the LOOP node or to the CALL node inserted before a decision
node; DECISION 012 Q2).

### 46. Positions that are not call sites

The following calls are not call sites, even when the callee could be
resolved; their reads and definitions are still placed in segments (except
the left side of `for…in`/`for…of`, which stays at the loop node). `develop`
does not connect these calls either:

- the left side of `for…in`/`for…of` (the object or key of a member target,
  default values of a destructuring pattern): `for (o[g()] of a)`,
  `for (var [z = g()] of a)` (an exception of FR-001, DECISION 005 Q2 A);
- positions evaluated only conditionally inside one node: after `?.` in an
  optional chain (`c?.m(f())`, `c?.[f()]`, both `f()` and `.m()`), and default
  values inside a destructuring pattern (`var [z = f()] = c`,
  `var {z = f()} = c`, also in assignments and `catch` parameters; the default
  value of a parameter itself is a call site). One node cannot express "may
  not run"; connecting such a call would treat it as always run, and the
  definitions of the callee would kill reachable pairs;
- a call whose callee, or the receiver of a method call, is a variable defined
  earlier in the same node (`var f = h; f = g, f();`,
  `var o = new A(), r = o.m();` connects only `new A()`): the callee is
  resolved with the definitions reaching the start of the node, so it would
  be connected to the old definition (`h`) (guard). `f(f = g)` is connected,
  since the callee is read before the definition.

**Behavior change** (DECISION 006 Q4, required fix 3): the static members of
a class in these positions are not connected either, while `develop`
connected them: `var [z = class { static y = g(); }] = c`,
`catch ({a = class { static y = g(); }})`, `c?.m(class { static y = g(); })`,
`for (o[class { static y = g(); }] of c)`. For example, with `var x = 0;`
L1, `function g() { x = 1; return 1; }` on L2–L5, `var c = [];` L6,
`var [z = class { static y = g(); }] = c;` L7 and `console.log(x);` L8,
`develop` connects the static scope and gives `g: entry -> L7`; `007` does
not. The golden outputs and the MDN examples have no instance (0 rows in the
"class static 不再連結" tables of `golden-diff.md` and `mdn-diff.md`);
`tests/dujs/splitcallnodes.js` (T066) pins the four cases.

### 47. Exception edges of the split discriminant nodes

The nodes split from a `switch` discriminant (`switch (a && f())`) have no
exception edge in `develop`: the first `case` node has no exception target
they could inherit. `007` does not change the intra-procedural graph: the
branch splitter only copies the `discriminantThrowTarget` attribute of the
first `case` (the exception target of the `switch`) to these nodes. In the
upper models a split node with call sites gets the exception edges of its
segments (§45) to that target; a split node without calls still has no
exception edge, as in `develop`. The nodes split from a `case` test have no
target at all (§44).

Note on a comment of `lib/dujs/reachingsolver.js` (lines 266–269, left
unchanged by `007`, which does not modify that file): "a CALL NODE before a
decision and a later call of a chain have no exception edge" is no longer
exact. Since `007` the CALL node inserted before a decision node (segment 0)
has an exception edge, and the CALL RETURN node that starts the next call
site of the same node has one when its segment may throw; only the callees
chained in one call site (the field initializers and the constructor of
`new A()`) keep CALL RETURN nodes without exception edges. The code is not
affected: the `exceptionalReturn` of a record is reached when the node with
the call edge is, whether or not that node also has the exception edge.

### 48. A `switch` without `case` makes the analysis throw (pre-existing)

```js
function f() {
  return 1;
}
switch (f()) {
}
```

The analysis fails with `Cannot read properties of undefined (reading 'type')`
while the CFG is built, in `develop` and in `007` alike; it fails the same way
without a call (`var a = 1; switch (a) {}`). The rule "the discriminant is
evaluated before the first `case`" (§45) does not apply, since there is no
first `case`; `007` makes no plan for it and adds no other failure
(`tests/dujs/splitcallnodes.js`, T044 (d)). Not fixed.

### 49. 27 or more nodes with one label make the CLI run out of memory (pre-existing, fixed by `007`)

> **Fixed by feature `007-split-call-nodes` (T068, DECISION 013).** The
> description below is the behavior before the fix.

```js
function g(v) { return v; }
function h() { var s = g(1) + g(2); return s; }
function on0() { var r = h(); }
document.addEventListener("e0", on0);
// ... the same for on1 to on8 (9 handlers)
```

When a graph has 27 or more nodes with the same label, the labels of the
`.graph.dot` (`toDotWithLabelLine`) are deduplicated by suffixes made by
`computeLabelIndex` of `lib/dujs/cfggraphconverter.js`. Its loop computed the
next dividend from the original index instead of the last dividend, so it
never ended for an index of 26 or more: the suffix grew until the heap ran
out, and `bin/dujs.js` aborted with exit 134. `develop` has the same bug, but
`007` makes it much easier to trigger: the call sites inside expressions and
the split segments give many more `call (<line>)` and `callReturn (<line>)`
nodes, so a graph reaches 27 nodes with one label in much smaller programs.
The program above exits 0 in `develop` and exits 134 in
`007` before the fix.

Fix: the dividend is divided in turn (`Math.floor(divided / 26)`), so the
index 26 gives `ba`, 27 gives `bb`, and so on; the indexes 0–25 still give
`a`–`z`, and the golden outputs are unchanged. Tests: the 27 call sites on
one line in `tests/dujs/cfggraphconverter.js`, and the programs
`handlers-9.js` and `ten-calls-line.js` run by `bin/dujs.js` in
`tests/dujs/cli.js`. The copy of the function in the comparison tool
`specs/007-split-call-nodes/tools/diffcheck.js` keeps the old form (it stops
after 4 letters), so for an index of 26 or more it differs from the library;
the golden and MDN outputs have no such label
(`specs/007-split-call-nodes/contracts/diff-check.md` §1).

### 50. The analysis time grows fast with the functions called by the page code (pre-existing)

```js
function f0() { return 0; }
f0();
function f1() { return 1; }
f1();
// ... the same for f2, f3, ...
```

A file with many functions, each called once by the page code, takes much
longer to analyze as their number grows: with 14 of them `bin/dujs.js` takes
about 7 seconds, and with 26 of them it did not finish within 20 seconds, in
`develop` and in `007` alike (measured for the sign-off of `007`, DECISION
013). The cause is not analyzed yet. Not fixed; left to a later feature.

## Found by feature `008-property-defs-method-calls`

Feature `008-property-defs-method-calls` fixes part of §22 (1), §22 (5)
except for §38, and §23. The sections below record its follow-up items,
behavior changes, limits and findings.

### 51. Property-level definitions are not modeled (follow-up of §22 (1))

Feature `008` takes a member assignment as a use of the object variable and
as no definition (decision D001, option A). A property-level model (option B)
is left to a later feature: `o.p = v` would define `o.p`, a read of `o.p`
would use `o.p`, and a new definition of `o` would kill `o.p`. Where it would
change the code (line numbers of `develop` `2035c93`):

- `lib/dujs/var.js:48`: `Var.isValidName` accepts only identifiers, so there
  is no variable named `o.p`.
- `lib/dujs/defuseanalyzer.js:77` (`getDefinedVariables`) and
  `lib/dujs/defuseanalyzer.js:600` (the `AssignmentExpression` rule): a
  member target is mapped to its object variable (`node.object`).
- `lib/dujs/outputwriter.js:394-432`: the matching output names a variable by
  its name and the line of its declaration, which a property has not.

The cost of option A is a loss for all-uses: the data flow from a property
write to a read of the same property is no longer a pair. In
`specs/008-property-defs-method-calls/probes/p25-prop-write-read.js`:

```js
var o = {p: 0};
o.p = 1;
var y = o.p;
o.p = 2;
console.log(o.p, y);
```

the pairs are `o: L1 -> L2`, `o: L1 -> L3`, `o: L1 -> L4`, `o: L1 -> L5` and
`y: L3 -> L5`; `o: L2 -> L3` and `o: L4 -> L5`, which `develop` has, are gone.
The golden and MDN differences of this kind are recorded as their own
category ("屬性寫入→讀取損失", the pairs option B would keep) in
`specs/008-property-defs-method-calls/golden-diff.md` and `mdn-diff.md`,
not as fixes.

### 52. Known limit of the difference tool of feature `008`

The difference tool `specs/008-property-defs-method-calls/tools/diffcheck`
compares the summaries of a matching file element by element (decision
D025): each `v@n` of `gen` / `exceptional` is first replaced by `v` with the
label of node `n` in the `.graph.dot` of the same model, so a pure
renumbering is no difference. The two sides are compared as sets of these
keys. When one line has several nodes for the same variable and both sides
give them the same label, a side with one more such element than the other
is not seen, so one element may be counted too few. The criteria of the tool
are by line, so the effect is bounded (the line and the variable are still
compared). The tool is left unchanged; this was decided in the main session
of the feature.

Two more criteria of the tool are too wide (found at the sign-off review of
`golden-diff.md` and `mdn-diff.md`; the categories and the tool are left
unchanged):

- The trigger of `成員目標（不再殺除）` merges the definitions by variable
  name across different declarations. In MDN `a05-assessment-main` the
  trigger `ball L86、L154` joins the `ball` of `Ball.collisionDetect` (L79)
  and the one of `EvilCircle.collisionDetect` (L147); the pairs
  `ball: 147 -> (148,147)` and the like (net differences #51–#56) are
  really caused by the relaxation (FR-004): the old definition at L154
  (`ball.exists = false`) would be redefined by the loop head at L147, and
  the pairs were missing only because `collisionDetect` was not linked.
- The position condition of `放寬` / `外溢` (a use after the call line) also
  holds for differences unrelated to the link: in golden, `input: 39 -> 41`
  (#18, #39, #49, #65) also matches `放寬`, while its main category
  `成員目標（新增讀取）` is the right one.

### 53. Behavior changes and limits of feature `008`

Besides the fixes of §22 (1), §22 (5) and §23, feature `008` changes these
results (each kind is a category of
`specs/008-property-defs-method-calls/golden-diff.md` and `mdn-diff.md`):

- **Spillover to the resolution of calls** (FR-001, category `外溢`): the
  resolution rules are unchanged, but they count definitions, and a member
  assignment is no longer one. `function f() {…}` / `f.p = 1;` (L5) / `f();`
  (L6) is now connected to `f` (`x: L3 -> L7`; `f: L5 -> L6` and `x: L1 -> L7`
  are gone; `specs/008-property-defs-method-calls/probes/p29-fn-prop-call.js`);
  `f.p = function () {…}` no longer makes `f()` call that function (P30),
  `A.count = 0;` no longer stops `new A()` (P31), and `f.p = 1;` on the page is
  no longer counted by the relaxation D2 of `005-summary-analysis` (P32).
- **The guard of `007` is lifted**: `007` does not take a call as a call site
  when its receiver is defined earlier on the same node
  (`isDefinedBeforeRead` in `lib/dujs/callsplit.js`). In `o.p = 1, o.m();`
  the member assignment no longer defines `o`, so `o.m()` is now a call site
  and is connected (`x: L4 -> L9` instead of `x: L1 -> L9`; test in
  `tests/dujs/propertydefs.js`).
- **New reads in the object expression** (FR-002, decision D013): the object
  expression and the computed keys of a member target are evaluated, so
  `f(a).p = 1` uses `f` and `a`, and `o[i].q = 2` uses `o` and `i` (P33). A
  chain rooted at a call has no object variable and is not exempt:
  `localStorage.getItem(n).p = o` uses `localStorage` and `n` (P42,
  `n: L1 -> L2`), so a new read of `localStorage` can give a new inter-page
  pair (category `成員目標（新增讀取）`, not the frozen `localStorage` rules of
  §22 (4)).

Size of the change, against `develop` `2035c93`: 68 differences in the golden
fixtures (all in `tests/golden/fixtures/es2015/app.js`: `放寬` 41,
`屬性寫入→讀取損失` 15, `成員目標（不再殺除）` 6, `成員目標（新增讀取）` 6) and
547 in the MDN programs (`成員目標（新增讀取）` 197, `成員目標（不再殺除）` 96,
`放寬` 83, `屬性寫入→讀取損失` 78, `成員目標（修正）` 54, `成員目標（摘要）` 32,
`成員目標（列消失）` 7); no difference is unclassified and none is an
unreachable pair. The differences are signed off in the two files.

Limits of the relaxation of `o.m()` (§23, also in the README):

- Only `const`/`let`: `var o = new A();` is not relaxed (decision D002; P6).
- A declaration separated from its assignment (`let o; o = new A();`) is not
  relaxed (P35), as for `f()` (P36).
- The execution order is ignored: a function called before
  `const o = new A();` is connected, although running it throws (temporal dead
  zone; P34, `g();` L10 before `const o = new A();` L11).

### 54. Findings of the checks of feature `008`

- **The virtual exception edge of the reachability checker has no effect on
  reachability.** Decision D014 adds an edge from each call node to the
  `exceptionalReturn` of its call record. Measured at the Foundational phase on
  509 models (before the full-run total of 569 models in §22 (5)): the `exceptionalReturn` always has another reachable exception
  edge into it in the graph (the only call without an exception edge of its
  own is the constructor call after the field initializers of a class), so the
  edge reaches no new node; its only effect is that the path is of the
  exception kind (a callee that reaches its exit only through it has no normal
  return). It is kept as a guard and tested with forged records (D014 block of
  `tests/dujs/reachability.js`); `specs/008-property-defs-method-calls/contracts/reachability.md`
  was corrected.
- **The numbers of the model files can shift** (decision D022). A new
  connection adds inter-procedural models, so the same model gets another file
  number: the inter-procedural model `1` of the `es2015` golden case of
  `develop` is `3` in `008`, and in the MDN program `a05-assessment-main` the
  models `1` and `2` of `develop` are `2` and `3`, while `1` is the new model of
  `loop`. The difference tool compares pairs per page and model level, and
  pairs the `*.matching.json` files by their main scope, not by file number.
- **Summaries and rows that change without a pair** (decisions D023, D024):
  a member target that no longer defines `v` removes `v@n` from the `gen` and
  `exceptional` of a summary, removes `v` from `mustKill` and may add `v` to
  `upwardExposed`; a new connection adds the elements of the newly reached
  callees. A row of a variable can disappear from `.dupairs.dot` when all its
  definitions were member targets (`成員目標（列消失）`, 7 in MDN). The
  difference tool classifies these by the criteria of
  `specs/008-property-defs-method-calls/contracts/diff-check.md` §2.
- **An error in the wording of task T026**: the task says `if (h(a))` has two
  p-use pairs of `a`, but `a` is an argument of the call in the condition, so
  it is a c-use of the call segment (`a: L1 -> L5`); only the callee `h` is a
  deferred p-use (`h: entry -> L5>L6:T`, `h: entry -> L5>L8:F`). The test in
  `tests/dujs/defuseanalyzer.js` checks the actual pairs, and
  `if (a < h(a))` covers the p-uses of `a`.

### 55. A nested assignment is a definition only directly in the right side of an assignment (pre-existing)

The definitions of a node (GEN) follow a nested assignment or update only
when it is directly the right side of an assignment whose left side `develop`
defines (an identifier, or a member target whose object is an identifier;
`lib/dujs/defuseanalyzer.js:608-611` of `develop`, `:643-647` after feature
`008`; decision D012). In other positions the inner assignment defines
nothing:

- `y = (x = 5, 3)`, `y = [x = 6]`, `y = f(x = 7)`, `[y] = x = [8]`;
- `o.t = [n++]`, `this.p = x = 1`, `f().p = x = 2`, `o.a.b = x++`.

For example, `var x = 0, y, o = {a: {}};` / `function f() { return o; }` /
`y = (x = 5, 3);` / `console.log(x, y);` gives `x: L1 -> L4`, not
`x: L3 -> L4`; `o.a.b = x++;` gives `x: L1 -> L3` and `x: L1 -> L4` (checked
with `tests/helpers/analyze.js`). It is in the golden fixtures:
`state.todos = [...state.todos, { id: nextId++, title, done: false }];`
(`tests/golden/fixtures/es2015/app.js:22`) does not define `nextId`. The gap is
not limited to member targets. Feature `008` keeps the behavior of `develop`:
`o.p = x = 1` and `o.p = x++` still define `x` (the right side is directly an
assignment or update), and `o.a.b = x = 1` and `this.p = x = 1` are pinned by
characterization tests. Not fixed.

### 56. The test helper labels a node without a line `Lnull` (pre-existing)

`nodeLabel` in `tests/helpers/analyze.js` labels a node by its line, and only
the entry and exit nodes have names, so a node with no line is labeled
`Lnull`. In the intra-page and inter-page models the false branch of a loop
at the end of the page goes to the LOOP node of the event loop, which has no
line: in `specs/008-property-defs-method-calls/probes/p18-method-loop.js`
(`while (c)` at L8) the intra-page pair is `c: L1 -> L8>Lnull:F`, while the
inter-procedural model gives `c: L1 -> L8>exit:F`. Only the tests are
affected (not the CLI output or the golden files); `tests/dujs/expansion.js:127`,
`tests/dujs/splitcallnodes.js:251` and `tests/dujs/reachability.js` (P18)
pin the label. Not fixed.

### 57. Only `addEventListener` registers a handler of the event loop (pre-existing)

The intra-page model connects a handler to the LOOP node only when it is
registered by `<object>.addEventListener(<type>, <handler>)`, with a function
expression, an arrow function or the name of a function declaration as the
second argument (`getRegisteredEventHandlerCallback`,
`lib/dujs/modelbuilder.js:439`). An async function registered this way is a
handler like any other. Other callbacks run by the event loop are not
handlers: `promise.then(cb)`, `setTimeout(cb)`, `setInterval(cb)`,
`queueMicrotask(cb)` and the event handler properties (`el.onclick = cb`).
Their definitions reach no use of the page or of the handlers. The part of an
async function after an `await` is not resumed from the event loop either:
the body is a function run to the end, with the conservative summary of §37
at a direct call.

```js
var x = 0;
var p = Promise.resolve();
function h() { x = 1; }
function t() { x = 2; }
document.addEventListener('click', function () { console.log(x); });
p.then(h);
setTimeout(t, 0);
document.body.onclick = function () { x = 3; };
```

The intra-page model gives only `x: L1 -> L5` (checked with
`tests/helpers/analyze.js`); `x: L3 -> L5`, `x: L4 -> L5` and `x: L8 -> L5`
are missing, although `h`, `t` and the `onclick` handler may run before the
`click` handler. Treating these callbacks as handlers of the LOOP node would
over-approximate microtasks (a `then` callback of a settled promise always
runs before the next event), and resuming after `await` would need the body
of an async function split at each `await`. Status: limit, not fixed.
