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

`tests/golden/` runs the CLI on two ES5 sample pages and an ES2015+ module and
compares all generated `.dot` files (four models) with `tests/golden/expected/`
and `tests/golden/expected-es2015/`. After an intended
change to the analysis, regenerate them with `UPDATE_GOLDEN=1 npm test` and
review the diff.

Existing lint violations are recorded in `eslint-suppressions.json`
(ESLint bulk suppressions), so only new violations fail `npm run lint`. After
fixing some of them, run `npx eslint . --prune-suppressions`.

## Usage
```
node bin/dujs.js -js [src_file_page1_1] [src_file_page1_2] ... [src_file_page1_i] -js [src_file_page2_1] [src_file_page2_2] ... [src_file_page2_i]
```

Result files will located under the <strong>out-[year]-[month]-[day]-[hour]-[minute]-[second]</strong> directory

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
    <li>Only call statements (<code>f();</code>) are connected as inter-procedural call sites; calls inside other expressions (<code>x = f()</code>, <code>return f()</code>) are not</li>
    <li>Object properties, <code>this</code> and aliases are not tracked: assigning to <code>a.b</code> defines <code>a</code></li>
    <li>Labeled <code>break</code>/<code>continue</code>; <code>catch</code> parameters are not variables</li>
    <li>The files of a page are concatenated, so imports between module files are not resolved</li>
</ul>

See [docs/known-issues.md](docs/known-issues.md) for confirmed issues that are not fixed yet, each with a reproducing input.

##Demo
[Single page sample](http://chengfulin.github.io/dujs/)

## License
dujs is released under the [MIT License](LICENSE), except for the files derived
from [esgraph](https://github.com/Swatinem/esgraph) and
[analyses](https://github.com/Swatinem/analyses) (`lib/esgraph/index.js`,
`lib/esgraph/dot.js`, `lib/analyses/`, and their tests), which remain under the
GNU LGPL v3 ([LICENSES/](LICENSES)). The runtime dependency
[walkes](https://github.com/Swatinem/walkes) is also LGPL v3 and is used
unmodified. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the origin
and modifications of each file.
