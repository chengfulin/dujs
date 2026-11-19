# Supported syntax and limitations

## Supported syntax

ES5 and ES2015+: `let`/`const` block scopes, arrow functions, classes,
destructuring, default and rest parameters, spread, `for...of`, ES modules
(`import`/`export`, top-level `await`; a page is parsed as a module when it is
not a valid script), template literals, optional chaining, nullish coalescing,
compound and logical assignments, async functions and generators.

## Limits

- Anonymous function call
- Closure
- HTML DOM object
- Calls inside expressions are call sites too (feature
  `007-split-call-nodes`): every call that can be resolved is connected
  wherever it is in a node, in evaluation order: call statements, assignments
  (`x = f()`), variable initializers (`var o = new A()`), `return`, `throw`,
  conditions of `if` and loops, `switch` discriminants, the right side of
  `for...in`/`for...of`, parameter default values, field initializers, arrow
  function bodies and the arguments of other calls (`h(f())`, also when the
  outer call is not resolved, as in `console.log(f())`). The callees are
  resolved as follows:
  - `f()` and `new F()` connect the function `F`; `new A()` connects the
    instance field initializers of class `A` (in source order) and then its
    constructor
  - `new A().m()` is two call sites, construction and then `m` (the arguments
    of `m` are evaluated in between); `A.s()` (static method), `this.m()` in a
    method, constructor or field initializer of class `A`, and `o.m()` when
    every definition of `o` reaching the node is `new A(...)` of the same
    class
  - the static members of a class declared or evaluated in a node run where
    the class is evaluated
- Still not call sites: immediately invoked function expressions
  (`(function () {…})()`), callbacks passed as arguments (`arr.forEach(fn)`),
  `super(…)` and `super.m()`, optional calls (`o?.m()`, `f?.()`), getters and
  setters, tagged templates, implicit calls (`valueOf`, `toString`, the
  iteration protocol); a call in a `case` test that stays in the `case` node
  (an operand taken out of the test by splitting `&&`/`||`, other than the
  last one, is an ordinary decision node; known-issues §44); a call in the
  left side of a `for...in`/`for...of`, after `?.` in an optional chain
  (`c?.m(f())`) and in a default value inside a destructuring pattern
  (`var [z = f()] = c`, also in a `catch` parameter); a call whose callee or
  receiver variable is defined earlier in the same node (`f = g, f();`,
  `var o = new A(), r = o.m();`) (known-issues §46). The static members of a
  class in these positions are not connected either (a change from earlier
  versions)
- Not connected: private methods (`#m`), optional calls (`o?.m()`, `f?.()`),
  computed or string method names, getters and setters, arrow functions in
  fields; `new ns.A()` and `new (f())()` (the call `f()` in it is connected);
  `this.m()` in an arrow function or a plain `function`; `new A()`/`A.s()` in
  a function when `A` is a class expression (`var A = class {}`); `new F()` of
  a function defined outside the function containing the call; `o.m()` when
  the definitions of `o` are mixed (not all `new A()` of one class); `o.m()`
  in a function when `o` is defined outside it and the rule for instances
  (below) does not apply
- A callee is resolved only when its definitions reaching the call are at
  least one and all refer to the same function or class: `f()` with mixed
  definitions (two different functions, or a function and another value) is
  not connected
- In a function, method or event handler, `new A()`/`A.s()` is connected when
  `A` has only one definition on the page and it is a class (a class
  declaration, or a class expression bound by `const`/`let`), including a
  field `f = new B();`; this does not apply to `var A = class {}`. Functions
  have their own rule (below), which does not cover `new F()`. This rule
  ignores the execution order: `function g() { new A(); }`, `g();`,
  `class A {...}` is connected, although running it throws (temporal dead
  zone)
- In a function, method or event handler, `o.m()` with no definition of `o`
  reaching the call in the function is connected to the instance method `m` of
  class `A` when `o` has only one definition on the page (assignments to its
  properties, such as `o.p = 1`, do not count) and it is a `const`/`let`
  declaration `new A(...)` where `A` is a class (known-issues §23, feature
  `008-property-defs-method-calls`). Not relaxed: `var o = new A()` (its
  initial value `undefined` is a second definition) and a declaration
  separated from its assignment (`let o; o = new A();`). Like the class rule
  it ignores the execution order: a function calling `o.m()` that runs before
  `const o = new A();` is connected, although running it throws (temporal dead
  zone)
- In a function, method or event handler, `f();` with no definition of `f`
  reaching the call in the function is connected when the declaration `f`
  refers to has only one definition on the page (declarations, assignments,
  parameters, `catch` parameters and loop bindings all count) and it is a
  function declaration (also in a block), a function or arrow function
  expression bound by `const`/`let`, or the inner name of a named function
  expression. Self recursion (`function f() { … f(); }`,
  `var g = function fact() { … fact(); }`) and mutual recursion are connected
  too. Like the class rule it ignores the execution order. Not relaxed:
  `new F()` in a function, `var f = function () {}`, a name with two or more
  definitions, and a call on the page (also in a block of the page). A
  function declared in a block is visible only in that block, so `f();`
  outside the block is not connected (Annex B, below)
- `window.f = …` is not a definition of `f`: in
  `function f() {…} window.f = function () {}; function a() { f(); }` the call
  is connected to the declaration of `f`, although at run time it calls the
  new function (known limitation,
  `specs/005-summary-analysis/probes/c-win.js`)
- A parameter and a function declaration with the same name: in
  `function g(f) { function f() {} function h() { f(); } }` the parameter `f`
  is not counted as a definition of `f`, so the declaration is taken as the
  only one and `f();` is connected to it. The rule above says that parameters
  count as definitions, so this differs from its wording; the result is still
  right, because the function declaration overwrites the parameter when `g`
  starts (known deviation)
- Calls use summaries of the callees (context-sensitive): a definition made
  before one call of a function does not flow out of another call of it, and a
  use in the callee only gets the definitions of the calls that actually reach
  it. Only the normal return of a callee goes back to the statement after the
  call: an exception the callee does not catch does not return there; it goes
  to the `catch`/`finally` of the caller, or, when the caller has no `try`, up
  the chain of calls to the page or the event handler and then to the event
  loop (LOOP). It carries the definitions valid where it is thrown. A call
  statement can throw only before the call (evaluating the callee and the
  arguments); once the callee returns normally, the statement does not throw.
  With calls inside expressions each segment is checked on its own: the part
  evaluated after a return may throw when it contains an assignment, a binary,
  unary or member expression, or another call (`f().p`, `x = f()`, `f() > x`;
  `throw f()` always throws), and its exception edge then carries the
  definitions of the callee; `var y = f();`, `if (f())` and `return f();` do
  not throw after the return
- Exception paths carry only the definitions valid *before* the throwing node:
  a statement that throws is treated as not completed (in
  `var x = 0; var o = {}; try { x = o.p; } catch (e) { console.log(x); }`,
  written one statement per line, the read in `catch` gets `x: L1 -> L6`, not
  the definition `x = o.p` of L4)
- `try`…`finally`: an exception thrown in `catch`, and
  `return`/`break`/`continue` leaving the `try`, run the `finally` block
  first; a `finally` entered by an exception or a jump continues with it after
  the block (it does not go on to the statement after the `try`). When a
  `finally` can be entered in several ways, it continues to all of them (a
  safe over-approximation: a path entered normally may also continue to a jump
  target)
- Generators and async functions get a conservative summary: a call is treated
  as if the callee may have run any part of its body (no definition is killed,
  every definition of the callee may flow out), since a generator runs only
  when iterated and an async function returns at its first `await`
- An event handler entered from the event loop returns only to the event loop,
  and a function called directly returns only to its call. The event loop does
  not kill definitions (a handler may never run), and the definitions of each
  handler flow to every handler, itself included
- Only `<object>.addEventListener(<type>, <handler>)` registers an event
  handler (a function expression, an arrow function or the name of a
  function declaration as the second argument). Callbacks run later by the
  event loop through other APIs, such as `promise.then(cb)`, `setTimeout(cb)`,
  `setInterval(cb)`, `queueMicrotask(cb)` or `el.onclick = cb`, are not
  handlers of the intra-page model, and the part of an async function after
  an `await` is not resumed from the event loop (known-issues §57)
- In the MDN bouncing balls example, `const ball = new Ball()` is connected,
  but `ball.draw()` on a `for...of` binding is not (the loop variable is not a
  definition `new Ball(...)`)
- The super class is not followed: methods and fields are looked up only in
  the class itself; for a class with `extends`, construction is approximated
  as "fields first, then the constructor body" (in JavaScript the fields run
  after `super()` returns); `this.m()` always goes to the `m` of the class
  containing the call (overriding in a subclass is not considered)
- Recursion (a function, method or constructor calling itself, or functions
  calling each other) is modeled as a loop path in the graph: the recursive
  call returns to the entry of the callee already expanded (a back edge), and
  its exit has an extra return edge to that call. The summary of a recursive
  callee is computed as a fixed point, starting from "no normal return", so
  the analysis always ends; after an unconditional recursion the nodes that
  follow cannot be reached and have no pairs in the inter-procedural and
  intra-page models (the intra-procedural model keeps calls opaque).
- Object properties, `this` and aliases are not tracked: assigning to `a.b`
  (also `a[k] = v`, `a.b++`, `delete a.b`) is a use of `a` (and of `k`), not a
  definition of any variable, and there is no data flow at the level of
  properties, so a write of `a.b` followed by a read of `a.b` is not a pair
  (feature `008-property-defs-method-calls`; known-issues §22 (1), §51). The
  built-in `localStorage` is the exception: `localStorage.k = v` is still a
  stored definition, as before
- Scopes follow [eslint-scope](https://www.npmjs.com/package/eslint-scope):
  the declarations of every scope and the declaration each identifier refers
  to come from it. A `catch` parameter (also a destructured one) is a variable
  of its catch clause, defined at the catch node and visible only in the catch
  block; the catch node reads only the defaults of its parameter, not the
  catch block. The inner name of a named function or class expression, and the
  inner binding of a class declaration, are variables visible only inside the
  function or class (in the static members of a named class expression too:
  `var B = class Q { static s = Q; }` gives `Q: L1 -> L2`). Identifiers in
  parameter default values do not see the `var` declarations of the function
  body. The names of the dujs scopes (`$DOMAIN.$PAGE_0.f`, `$ANONYMOUS_FUN_n`,
  …) are unchanged; a function whose name starts with `$` still makes the
  analysis throw (known-issues §28)
- Globals: an identifier read without a declaration is a global of its page,
  defined at the entry node of the page (definition kind `global`), e.g.
  `Math: entry -> L1`; each page has its own, so no pair crosses pages.
  `undefined`, `NaN` and `Infinity` (when not declared) and `arguments` are
  excluded and have no pairs, nor does `this`. `eval` is such a global of the
  page too (`eval("x")` gives an `eval` pair). The built-in objects `window`,
  `document`, `String`, `Number`, `Boolean`, `Array`, `Map`, `WeakMap`, `Set`,
  `Date`, `console` and `localStorage`, and names assigned without a
  declaration (implicit globals), behave as before
- Annex B: a function declared in a block (`{ function f() {} }`,
  `if (c) { function g() {} }`) is visible only in that block; a call `f();`
  outside the block reads the page global `f` and is not connected to the
  function
- References made dynamic by a direct `eval` or by `with` are resolved
  statically along the scope chain (eslint-scope `optimistic`); code evaluated
  by `eval` is not analyzed
- Names in the body of a `with` statement are resolved by the normal scope
  rules; they are not inferred to be properties of the object
- Splitting conditions makes the number of nodes grow as the product of the
  parallel conditions in one statement; analyzing minified code may exhaust
  resources and hang, so analyze the original source instead
- The initialization node of a parameter with a default value always defines
  the parameter; "only when `undefined` is passed" is not modeled, so when the
  caller passes a value, the definition at the entry node is treated as
  overwritten and pairs may be missed
- The files of a page are concatenated, so imports between module files are
  not resolved

See [docs/known-issues.md](known-issues.md) for confirmed issues that are not
fixed yet, each with a reproducing input.
