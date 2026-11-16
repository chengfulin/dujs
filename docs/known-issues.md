# Known Issues

Issues found by the code review of PR #2 (ES2015+ modeling) and confirmed by
reproducing them on `feat/es2015-modeling`. "Pre-existing" means dujs
1.0.0/1.1.0 behaves the same way.

Issues §1–§6 and §8 are fixed by feature `001-fix-known-issues`
(`specs/001-fix-known-issues/`); their sections are kept for reference and the
results describe the behavior before the fix. §7 and §9 are not fixed yet.
§10–§13 were found while implementing that feature and are not fixed yet.
§14–§17 were found by the code review of PR #3 (or while fixing it) and are
not fixed yet.

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

### 7. Class methods are not connected as call targets

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

### 9. Code style and records

- The `lib/esgraph/index.js` header and `THIRD_PARTY_NOTICES.md` do not list
  two small changes individually: the null guard in `expressionThrows` and
  treating `ClassDeclaration` as a leaf in `createNodes`. Both are part of the
  recorded class and arrow-function changes.
- In `lib/dujs/defuseanalyzer.js`, the new helpers (`isFunctionExpression`,
  `getDefinedVariables`, `computeKILLSet`, `useLoopHead`, `useClassHead`) were
  inserted between existing JSDoc blocks and the functions they document.
- `computeKILLSet` replaces `findKILLSet` in the analysis; `findKILLSet` is
  kept only for its existing tests.
- `lib/dujs/jsparser.js` uses an optional catch binding (`catch {`, ES2019),
  unlike the ES5 style of the rest of `lib/`.

## Found while fixing §1–§6 and §8 (feature `001-fix-known-issues`)

### 10. A function as the default value of a parameter is not a scope

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

### 11. Uses of the class name in its own static members are missed

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

### 12. CLI: no help, and errors exit with status 0 (pre-existing)

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

### 13. Branches of the intra-procedural model point to the LOOP node of the intra-page model

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

### 14. A predecessor without a source range is redirected to the split right side of a for-in/for-of loop

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

### 15. Split call sites have the same CALL RETURN label in the dot output

```js
function log(v) {}
log(c ? a : b);
```

The two leaves `L2:T` and `L2:F` are both call sites (US5-10) and each has a
CALL RETURN node. In the dot output the label of a CALL RETURN node is
`callReturn (L<line>:C<col>)` (`labelWithLoc` in
`lib/dujs/cfggraphconverter.js`), without the branch path, so both nodes are
labeled `callReturn (L2:C0)`. The nodes themselves are distinct and keep the
branch path (`FlowNode.branchPath`); only the label is ambiguous (review #8).

### 16. The call of a decision node is inserted before it

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

### 17. A nested default inside a destructured parameter with its own default

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
