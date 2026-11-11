# Known Issues

Issues found by the code review of PR #2 (ES2015+ modeling) and confirmed by
reproducing them on `feat/es2015-modeling`. They are recorded here and not
fixed yet. "Pre-existing" means dujs 1.0.0/1.1.0 behaves the same way.

Line numbers in the results refer to the analyzed code (`L<n>`); `entry` is
the entry node of a scope.

## Analysis errors

### 1. Labeled statements, `with` and `debugger` make the analysis throw (pre-existing)

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

```js
var a = 1;
var o = new X(a);
throw new Error(a);
```

No pair for `a`: the use analysis of `NewExpression` only visits the callee.

### 4. Class field initializers and static blocks do not use outer variables

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

```js
var a, b;
a = b = 1;
console.log(a);
```

Gives `b: L1 -> L2`, but `b` is only defined at L2. The same happens with
chained logical assignments (`a ||= b ||= 1`).

### 6. A conditional expression outside a decision node gives p-uses without a target (pre-existing)

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
