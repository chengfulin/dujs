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
    <li>Not connected: calls inside other expressions (<code>x = f()</code>, <code>x = new F()</code>, <code>return f()</code>, a call wrapped in a field value); private methods (<code>#m</code>), optional calls (<code>o?.m()</code>, <code>f?.()</code>), computed or string method names, getters and setters, arrow functions in fields; <code>new ns.A()</code> and <code>new (f())()</code>; <code>this.m()</code> in an arrow function or a plain <code>function</code>; <code>new A()</code>/<code>A.s()</code> in a function when <code>A</code> is a class expression (<code>var A = class {}</code>); <code>f()</code>/<code>new F()</code> of a function defined outside the function containing the call; <code>o.m()</code> when the definitions of <code>o</code> are mixed (not all <code>new A()</code> of one class) or <code>o</code> has a property assignment in between (<code>o.p = 1</code> defines <code>o</code>); <code>o.m()</code> in a function when <code>o</code> is defined outside it (known-issues §23)</li>
    <li>A callee is resolved only when its definitions reaching the call are at least one and all refer to the same function or class: <code>f()</code> with mixed definitions (two different functions, or a function and another value) is not connected</li>
    <li>In a function, method or event handler, <code>new A()</code>/<code>A.s()</code> is connected when <code>A</code> has only one definition on the page and it is a class (a class declaration, or a class expression bound by <code>const</code>/<code>let</code>), including a field <code>f = new B();</code>; this does not apply to <code>var A = class {}</code> nor to functions (<code>f()</code>/<code>new F()</code> in a function is not connected this way), so the two are asymmetric. This rule ignores the execution order: <code>function g() { new A(); }</code>, <code>g();</code>, <code>class A {...}</code> is connected, although running it throws (temporal dead zone)</li>
    <li>Common patterns such as the MDN bouncing balls example are still not connected: a declaration <code>const ball = new Ball()</code> (a call inside an expression) and <code>ball.draw()</code> on a <code>for...of</code> binding</li>
    <li><code>var o = new A();</code> does not connect the constructor (a call inside an expression), but a following <code>o.m();</code> is connected to <code>m</code></li>
    <li>The super class is not followed: methods and fields are looked up only in the class itself; for a class with <code>extends</code>, construction is approximated as "fields first, then the constructor body" (in JavaScript the fields run after <code>super()</code> returns); <code>this.m()</code> always goes to the <code>m</code> of the class containing the call (overriding in a subclass is not considered)</li>
    <li>Recursion (a method or constructor calling itself, methods calling each other) is modeled as a loop path: the recursive call returns to the entry of the callee already expanded (a back edge), and its exit has an extra return edge to that call. After an unconditional recursion the following nodes cannot be reached from the entry (dead code): the pairs of outer variables visible to the callee after the call disappear, a definition inside the unreachable cycle still flows out (e.g. <code>x: L5 -> L9</code> for <code>m() { this.m(); x = 1; }</code>), and the pairs of the caller's local variables, which bypass the callee, are kept</li>
    <li>Object properties, <code>this</code> and aliases are not tracked: assigning to <code>a.b</code> defines <code>a</code></li>
    <li><code>catch</code> parameters are not variables</li>
    <li>Only these global objects are defined: <code>window</code>, <code>document</code>, <code>String</code>, <code>Number</code>, <code>Boolean</code>, <code>Array</code>, <code>Map</code>, <code>WeakMap</code>, <code>Set</code>, <code>Date</code>, <code>console</code> and <code>localStorage</code>; uses of other globals (<code>Math</code>, <code>Object</code>, <code>JSON</code>, <code>alert</code>, …) have no pairs (known-issues §24)</li>
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
