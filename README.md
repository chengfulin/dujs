#dujs
A Dataflow analysis tool for JavaScript. (working project)
##Goal
Propose a tool to build a JavaScript Dataflow test model automatically, which includes four types of dataflow graph, intra-procedural, inter-procedural, intra-page and inter-page.<br>
Then the tool can compute all valid Def-Use pairs and dataflow anomalies.

## Requirements
- Node.js 24 or later (see `.nvmrc`)
- [Graphviz](http://www.graphviz.org) (optional): if the `dot` executable is on your `PATH`, the `.dot` outputs are also rendered to PNG

## Dependency
[espree](https://github.com/eslint/js/tree/main/packages/espree): JavaScript parser producing ESTree AST<br>
[walkes](https://github.com/Swatinem/walkes): Walker for ESTree AST<br>
Forked and modified in `lib/`: [esgraph](https://github.com/Swatinem/esgraph) (intra-procedural CFG builder) and [analyses](https://github.com/Swatinem/analyses) (work list algorithm)

## Setup
```
npm install
npm test           # run unit tests and the golden regression test
npm run lint       # ESLint (rules ported from the former .jshintrc)
npm run coverage   # run unit tests with coverage report
npm run doc        # generate API docs into doc/
```

`tests/golden/` runs the CLI on two ES5 sample pages, an ES2015+ module, an
inter-procedural sample (nested calls, a call in a decision and event
handlers) and a sample of the fixes of feature `004-fix-remaining-issues`
(conditions, `new` statements, class method calls and recursion, parameter
defaults, static members) and compares all generated `.dot` files (four
models) with `tests/golden/expected/`, `tests/golden/expected-es2015/`,
`tests/golden/expected-interprocedural/` and
`tests/golden/expected-fixes004/`. Besides the flat graphs
(`<k>.graph.dot`) and def-use pairs (`<k>.dupairs.dot`), each inter-procedural,
intra-page and inter-page model has a hierarchy graph (`<k>.hierarchy.dot`:
functions, main program, LOOP, event handlers, pages and the domain, with call,
return, loop, onEvent, loadStorage and saveStorage edges), referred to in the
HTML report before the flat graph. `tests/golden/manifest.json` records the
sha256 of every `.dot` file produced before the hierarchical refactor
(`baseline`, which must stay byte-identical) and the `.dot` files added since
(`added`). After an intended change to the analysis, regenerate the expected
outputs with `UPDATE_GOLDEN=1 npm test` and review the diff; the manifest is
never updated automatically.

Existing lint violations are recorded in `eslint-suppressions.json`
(ESLint bulk suppressions), so only new violations fail `npm run lint`. After
fixing some of them, run `npx eslint . --prune-suppressions`.

## Usage
```
Usage: dujs -js <file>... [-js <file>...]...
       dujs -h | --help
```

Run it as `node bin/dujs.js ...` (or `dujs` when installed). Each `-js` starts
a page; the files after it, up to the next `-js`, are combined into that page.
Example: `node bin/dujs.js -js lib.js app.js -js report.js` (two pages).
`-h`/`--help` prints the usage. A file named `-js` can be given after `--`.

The results are written to a new directory
<strong>out-[year]-[month]-[day]-[hour]-[minute]-[second]</strong> in the
current directory; when that directory already exists (for example, another
run started in the same second), `_1`, `_2`, ... is appended
(`out-…[_<n>]`), so a run never overwrites another run's outputs. All files
are read before the directory is created.

Exit status:
- `0`: success, or `--help`
- `1`: a file cannot be read (no directory is created), or the analysis or
  writing failed (the directory of the run is removed)
- `2`: usage error: no arguments, no page, an unknown option, a file before the
  first `-js`, or `-js` without files (the message and the usage are printed to
  stderr)

Each model is written as `<n>.graph.dot` (the flattened statement-level
graph) and `<n>.dupairs.dot` (the def-use pairs); the inter-procedural,
intra-page and inter-page models also have `<n>.hierarchy.dot` (the models
they are built from) and `<n>.matching.json`. The `.png` files are drawn
from the `.dot` files with Graphviz `dot`.

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

`finallyExit` nodes and `finally` edges: when a non-empty `finally` block can
be entered by an exception or by `return`/`break`/`continue`, the end of the
block goes to a `finallyExit` node. Its `normal` edge goes to the statement
after the `try` (when the block can be entered normally), its `exception` edge
goes on with the exception, and each `finally` edge (`label="finally"`) goes to
the target of a jump that passed through the block.

In the `.dot` outputs a node is labeled with its line number as dujs prints it
(one more than the line in the source file, since dujs prepends a line to the
analyzed source). Conditional
expressions and short-circuit operators (`?:`, `&&`, `||`, `??`, `&&=`, `||=`,
`??=`) are split into a decision node and branch nodes; a node created inside a
branch is labeled `<line>:<path>`, where `<path>` is its sequence of `T`/`F`
branches (e.g. `2:TF`). The CALL RETURN node of a split call site is labeled
`callReturn (<line>:<path>)`.

## Supported syntax
ES5 and ES2015+: `let`/`const` block scopes, arrow functions, classes,
destructuring, default and rest parameters, spread, `for...of`, ES modules
(`import`/`export`, top-level `await`; a page is parsed as a module when it is
not a valid script), template literals, optional chaining, nullish coalescing,
compound and logical assignments, async functions and generators.

##Limits
<ul>
    <li>Anonymous function call</li>
    <li>Closure</li>
    <li>HTML DOM object</li>
    <li>Only call statements are connected as inter-procedural call sites:
        <ul>
            <li><code>f();</code> and <code>new F();</code> connect the function <code>F</code>; <code>new A();</code> connects the instance field initializers of class <code>A</code> (in source order) and then its constructor</li>
            <li><code>new A().m();</code> (construction, then <code>m</code>), <code>A.s();</code> (static method), <code>this.m();</code> in a method, constructor or field initializer of class <code>A</code>, and <code>o.m();</code> when every definition of <code>o</code> reaching the call is <code>new A(...)</code> of the same class</li>
            <li>an instance field whose value is itself <code>this.m()</code> or <code>new B()</code></li>
        </ul>
    </li>
    <li>Not connected: calls inside other expressions (<code>x = f()</code>, <code>x = new F()</code>, <code>return f()</code>, a call wrapped in a field value); private methods (<code>#m</code>), optional calls (<code>o?.m()</code>, <code>f?.()</code>), computed or string method names, getters and setters, arrow functions in fields; <code>new ns.A()</code> and <code>new (f())()</code>; <code>this.m()</code> in an arrow function or a plain <code>function</code>; <code>new A()</code>/<code>A.s()</code> in a function when <code>A</code> is a class expression (<code>var A = class {}</code>); <code>new F()</code> of a function defined outside the function containing the call; <code>o.m()</code> when the definitions of <code>o</code> are mixed (not all <code>new A()</code> of one class) or <code>o</code> has a property assignment in between (<code>o.p = 1</code> defines <code>o</code>); <code>o.m()</code> in a function when <code>o</code> is defined outside it (known-issues §23)</li>
    <li>A callee is resolved only when its definitions reaching the call are at least one and all refer to the same function or class: <code>f()</code> with mixed definitions (two different functions, or a function and another value) is not connected</li>
    <li>In a function, method or event handler, <code>new A()</code>/<code>A.s()</code> is connected when <code>A</code> has only one definition on the page and it is a class (a class declaration, or a class expression bound by <code>const</code>/<code>let</code>), including a field <code>f = new B();</code>; this does not apply to <code>var A = class {}</code>. Functions have their own rule (below), which does not cover <code>new F()</code>. This rule ignores the execution order: <code>function g() { new A(); }</code>, <code>g();</code>, <code>class A {...}</code> is connected, although running it throws (temporal dead zone)</li>
    <li>In a function, method or event handler, <code>f();</code> with no definition of <code>f</code> reaching the call in the function is connected when the declaration <code>f</code> refers to has only one definition on the page (declarations, assignments, parameters, <code>catch</code> parameters and loop bindings all count) and it is a function declaration (also in a block), a function or arrow function expression bound by <code>const</code>/<code>let</code>, or the inner name of a named function expression. Self recursion (<code>function f() { … f(); }</code>, <code>var g = function fact() { … fact(); }</code>) and mutual recursion are connected too. Like the class rule it ignores the execution order. Not relaxed: <code>new F()</code> in a function, <code>var f = function () {}</code>, a name with two or more definitions, and a call on the page (also in a block of the page). A function declared in a block is visible only in that block, so <code>f();</code> outside the block is not connected (Annex B, below)</li>
    <li><code>window.f = …</code> is not a definition of <code>f</code>: in <code>function f() {…} window.f = function () {}; function a() { f(); }</code> the call is connected to the declaration of <code>f</code>, although at run time it calls the new function (known limitation, <code>specs/005-summary-analysis/probes/c-win.js</code>)</li>
    <li>A parameter and a function declaration with the same name: in <code>function g(f) { function f() {} function h() { f(); } }</code> the parameter <code>f</code> is not counted as a definition of <code>f</code>, so the declaration is taken as the only one and <code>f();</code> is connected to it. The rule above says that parameters count as definitions, so this differs from its wording; the result is still right, because the function declaration overwrites the parameter when <code>g</code> starts (known deviation)</li>
    <li>Calls use summaries of the callees (context-sensitive): a definition made before one call of a function does not flow out of another call of it, and a use in the callee only gets the definitions of the calls that actually reach it. Only the normal return of a callee goes back to the statement after the call: an exception the callee does not catch does not return there; it goes to the <code>catch</code>/<code>finally</code> of the caller, or, when the caller has no <code>try</code>, up the chain of calls to the page or the event handler and then to the event loop (LOOP). It carries the definitions valid where it is thrown. A call statement can throw only before the call (evaluating the callee and the arguments); once the callee returns normally, the statement does not throw. Calls inside expressions and calls before a decision node keep the old modeling (planned for feature 007)</li>
    <li>Exception paths carry only the definitions valid <em>before</em> the throwing node: a statement that throws is treated as not completed (in <code>var x = 0; var o = {}; try { x = o.p; } catch (e) { console.log(x); }</code>, written one statement per line, the read in <code>catch</code> gets <code>x: L1 -> L6</code>, not the definition <code>x = o.p</code> of L4)</li>
    <li><code>try</code>…<code>finally</code>: an exception thrown in <code>catch</code>, and <code>return</code>/<code>break</code>/<code>continue</code> leaving the <code>try</code>, run the <code>finally</code> block first; a <code>finally</code> entered by an exception or a jump continues with it after the block (it does not go on to the statement after the <code>try</code>). When a <code>finally</code> can be entered in several ways, it continues to all of them (a safe over-approximation: a path entered normally may also continue to a jump target)</li>
    <li>Generators and async functions get a conservative summary: a call is treated as if the callee may have run any part of its body (no definition is killed, every definition of the callee may flow out), since a generator runs only when iterated and an async function returns at its first <code>await</code></li>
    <li>An event handler entered from the event loop returns only to the event loop, and a function called directly returns only to its call. The event loop does not kill definitions (a handler may never run), and the definitions of each handler flow to every handler, itself included</li>
    <li>Common patterns such as the MDN bouncing balls example are still not connected: a declaration <code>const ball = new Ball()</code> (a call inside an expression) and <code>ball.draw()</code> on a <code>for...of</code> binding</li>
    <li><code>var o = new A();</code> does not connect the constructor (a call inside an expression), but a following <code>o.m();</code> is connected to <code>m</code></li>
    <li>The super class is not followed: methods and fields are looked up only in the class itself; for a class with <code>extends</code>, construction is approximated as "fields first, then the constructor body" (in JavaScript the fields run after <code>super()</code> returns); <code>this.m()</code> always goes to the <code>m</code> of the class containing the call (overriding in a subclass is not considered)</li>
    <li>Recursion (a function, method or constructor calling itself, or functions calling each other) is modeled as a loop path in the graph: the recursive call returns to the entry of the callee already expanded (a back edge), and its exit has an extra return edge to that call. The summary of a recursive callee is computed as a fixed point, starting from "no normal return", so the analysis always ends; after an unconditional recursion the nodes that follow cannot be reached and have no pairs in the inter-procedural and intra-page models (the intra-procedural model keeps calls opaque).</li>
    <li>Object properties, <code>this</code> and aliases are not tracked: assigning to <code>a.b</code> defines <code>a</code></li>
    <li>Scopes follow <a href="https://www.npmjs.com/package/eslint-scope">eslint-scope</a>: the declarations of every scope and the declaration each identifier refers to come from it. A <code>catch</code> parameter (also a destructured one) is a variable of its catch clause, defined at the catch node and visible only in the catch block; the catch node reads only the defaults of its parameter, not the catch block. The inner name of a named function or class expression, and the inner binding of a class declaration, are variables visible only inside the function or class (in the static members of a named class expression too: <code>var B = class Q { static s = Q; }</code> gives <code>Q: L1 -> L2</code>). Identifiers in parameter default values do not see the <code>var</code> declarations of the function body. The names of the dujs scopes (<code>$DOMAIN.$PAGE_0.f</code>, <code>$ANONYMOUS_FUN_n</code>, …) are unchanged; a function whose name starts with <code>$</code> still makes the analysis throw (known-issues §28)</li>
    <li>Globals: an identifier read without a declaration is a global of its page, defined at the entry node of the page (definition kind <code>global</code>), e.g. <code>Math: entry -> L1</code>; each page has its own, so no pair crosses pages. <code>undefined</code>, <code>NaN</code> and <code>Infinity</code> (when not declared) and <code>arguments</code> are excluded and have no pairs, nor does <code>this</code>. <code>eval</code> is such a global of the page too (<code>eval("x")</code> gives an <code>eval</code> pair). The built-in objects <code>window</code>, <code>document</code>, <code>String</code>, <code>Number</code>, <code>Boolean</code>, <code>Array</code>, <code>Map</code>, <code>WeakMap</code>, <code>Set</code>, <code>Date</code>, <code>console</code> and <code>localStorage</code>, and names assigned without a declaration (implicit globals), behave as before</li>
    <li>Annex B: a function declared in a block (<code>{ function f() {} }</code>, <code>if (c) { function g() {} }</code>) is visible only in that block; a call <code>f();</code> outside the block reads the page global <code>f</code> and is not connected to the function</li>
    <li>References made dynamic by a direct <code>eval</code> or by <code>with</code> are resolved statically along the scope chain (eslint-scope <code>optimistic</code>); code evaluated by <code>eval</code> is not analyzed</li>
    <li>Names in the body of a <code>with</code> statement are resolved by the normal scope rules; they are not inferred to be properties of the object</li>
    <li>Splitting conditions makes the number of nodes grow as the product of the parallel conditions in one statement; analyzing minified code may exhaust resources and hang, so analyze the original source instead</li>
    <li>The initialization node of a parameter with a default value always defines the parameter; "only when <code>undefined</code> is passed" is not modeled, so when the caller passes a value, the definition at the entry node is treated as overwritten and pairs may be missed</li>
    <li>The files of a page are concatenated, so imports between module files are not resolved</li>
</ul>

See [docs/known-issues.md](docs/known-issues.md) for confirmed issues that are not fixed yet, each with a reproducing input.

##Demo
[Single page sample](http://chengfulin.github.io/dujs/)

## SDD 導入宣告

| 項目 | 值 |
|------|-----|
| 目前導入階段 | 第 1 階段（對齊基礎）|
| 服務風險分級 | 未分級（階段一）|
| 應用類型 | 工具服務（函式庫＋CLI）|
| 憲章基線 | chengfulin/sdd-baseline v5.6.0@4a4b2be |

## License
dujs is released under the [MIT License](LICENSE), except for the files derived
from [esgraph](https://github.com/Swatinem/esgraph) and
[analyses](https://github.com/Swatinem/analyses) (`lib/esgraph/index.js`,
`lib/esgraph/dot.js`, `lib/analyses/`, and their tests), which remain under the
GNU LGPL v3 ([LICENSES/](LICENSES)). The runtime dependency
[walkes](https://github.com/Swatinem/walkes) is also LGPL v3 and is used
unmodified. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the origin
and modifications of each file.
