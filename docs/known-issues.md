# Known Issues

Issues found by the code review of PR #2 (ES2015+ modeling) and confirmed by
reproducing them on `feat/es2015-modeling`. "Pre-existing" means dujs
1.0.0/1.1.0 behaves the same way.

Issues §1–§6 and §8 are fixed by feature `001-fix-known-issues`
(`specs/001-fix-known-issues/`); their sections are kept for reference and the
results describe the behavior before the fix. §7 and §9 are not fixed yet.
§10–§13 were found while implementing that feature and are not fixed yet.

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
