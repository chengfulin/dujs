# dujs
A Dataflow analysis tool for JavaScript. (working project)

## Goal
Propose a tool to build a JavaScript Dataflow test model automatically, which includes four types of dataflow graph, intra-procedural, inter-procedural, intra-page and inter-page.<br>
Then the tool can compute all valid Def-Use pairs and dataflow anomalies.

## Background
dujs started from the author's thesis "JavaScript網頁應用程式資料流測試模型之研究"
(A Study on Dataflow Testing Model of JavaScript Web Applications); the thesis
is at https://hdl.handle.net/11296/u8f5n6.

## Requirements
- Node.js 24 or later (see `.nvmrc`)
- A Markdown viewer with Mermaid support (GitHub, VS Code, ...) to view the
  outputs; `out-*/` is excluded by `.gitignore` and never appears on GitHub,
  so open the outputs in a local viewer

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

## Usage
```
Usage: dujs -js <file>... [-js <file>...]...
       dujs -h | --help
```

Example: `node bin/dujs.js -js lib.js app.js -js report.js` (two pages). See
[docs/usage.md](docs/usage.md) for the command line, the output directory and
the exit status.

## Output
Each run writes a new directory `out-…` with, for every model, its `.dot`
files and a Markdown file `<n>.md` with the graphs drawn as Mermaid diagrams;
the `README.md` of the directory is the overview, with links to every `<n>.md`.
See [docs/output-format.md](docs/output-format.md) for the details.

Output changes: since feature `009-mermaid-markdown-output`, dujs no longer
writes `report.html` or `.png` files and does not need Graphviz; open the
overview `README.md` and the model files `<n>.md` instead.

## Documentation
- [docs/usage.md](docs/usage.md): command line, output directory and exit
  status
- [docs/output-format.md](docs/output-format.md): output files, call and
  return matching, node labels and call sites
- [docs/limitations.md](docs/limitations.md): supported syntax and limits
- [docs/development.md](docs/development.md): golden tests and lint
- [docs/known-issues.md](docs/known-issues.md): confirmed issues that are not
  fixed yet, each with a reproducing input; the limits it refers to as "the
  README limits" are in [docs/limitations.md](docs/limitations.md#limits)

## Demo
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
