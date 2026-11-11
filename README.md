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
npm test           # run unit tests
npm run coverage   # run unit tests with coverage report
npm run doc        # generate API docs into doc/
```

## Usage
```
node bin/dujs.js -js [src_file_page1_1] [src_file_page1_2] ... [src_file_page1_i] -js [src_file_page2_1] [src_file_page2_2] ... [src_file_page2_i]
```

Result files will located under the <strong>out-[year]-[month]-[day]-[hour]-[minute]-[second]</strong> directory

##Limits
<ul>
    <li>Anonymous function call</li>
    <li>Closure</li>
    <li>HTML DOM object</li>
    <li>ES2015+ syntax (let/const, arrow functions, classes, modules, ...) can be parsed but is not yet modeled correctly</li>
</ul>

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
