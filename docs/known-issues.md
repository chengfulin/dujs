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
refactoring, and the follow-up items of §22.

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

### 16. The call of a decision node is inserted before it (partly fixed by `003-hierarchical-models`)

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

### 18. The entry node of a function uses the variables of statements in its body

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
rules. The description below is the behavior before the fix.

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

### 22. Strict resolution of `f()` and follow-up items (found by `004-fix-remaining-issues`)

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

(1) **An assignment to a property `o.p = 1` is taken as a definition of `o`.**
It should be a definition of `o.p` and a use of `o` (a separate feature). One
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

(2) **The inner name of a named class or function expression is not a
variable.** In `var B = class Q { static s = Q; };` there is no pair for `Q`;
the same holds for the name of a named function expression used in its own
body.

(3) **Calls inside other expressions should also be call-sites.** Only call
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

(5) **Pairs in the dead code after an unconditional recursion.** With a back
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

The intra-page pairs are `A: L2 -> L8` and `x: L5 -> L9`. The pairs
`console: entry -> L9` and `x: L1 -> L9` disappear, since L5, L9 and the nodes
after them are not reachable from the entry node; but the worklist also
processes the unreachable nodes, so the definition `x = 1` (L5) inside the
unreachable cycle flows out to L9 and gives `x: L5 -> L9`
(`specs/004-fix-remaining-issues/research.md` P8,
`specs/004-fix-remaining-issues/probes/cyc-uncond.js`).
