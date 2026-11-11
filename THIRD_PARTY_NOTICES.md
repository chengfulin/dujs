# Third-Party Notices

dujs is licensed under the MIT License (see [LICENSE](LICENSE)), **except** for
the files derived from the third-party projects listed below, which remain under
their original license, the **GNU Lesser General Public License v3.0**
(SPDX: `LGPL-3.0-only`). The license texts are in
[LICENSES/LGPL-3.0.txt](LICENSES/LGPL-3.0.txt) and
[LICENSES/GPL-3.0.txt](LICENSES/GPL-3.0.txt) (the LGPL v3 is a set of additional
permissions on top of the GPL v3, so both texts apply).

All three projects were written by Arpad Borsos (Swatinem,
arpad.borsos@googlemail.com).

## 1. esgraph — forked and modified

| | |
|---|---|
| Upstream | https://github.com/Swatinem/esgraph |
| Base version | 0.1.1 (npm, published 2013-12-15) |
| License | LGPL-3.0 |
| Imported into dujs | 2015-05-20 (commit `88a5e36`) |

### Derived files (LGPL-3.0)

| File | Origin |
|---|---|
| `lib/esgraph/index.js` | upstream `lib/index.js` |
| `lib/esgraph/dot.js` | upstream `lib/dot.js` |
| `tests/esgraph/test.js` | upstream test runner |
| `tests/esgraph/tests/*.js` | upstream test fixtures |

`lib/esgraph/flownode.js`, `lib/esgraph/flownodefactory.js` and the other files
under `tests/esgraph/` are original dujs code (MIT); they live in this directory
only because the forked CFG builder uses them.

### Modifications

- 2015-05 – 2015-08, by ChengFuLin
  - Replaced the plain CFG node objects with dujs `FlowNode` objects created by
    `FlowNodeFactory`; CFG node ids are assigned after the graph is built.
  - Added typed connections (normal, true, false, exception, ...) to support
    the inter-procedural, intra-page and inter-page models.
  - Changed the DOT output to render `FlowNode` graphs and to skip invalid
    nodes.
  - Strict mode and JSHint fixes; bug fixes for reading undefined properties.
- 2026-11-11, by ChengFuLin
  - `TryStatement`: read the ESTree `handler` property (keeping support for the
    esprima 1.x `handlers` array), required after switching the parser to
    espree.
  - Tests parse through `lib/dujs/jsparser` (espree) instead of esprima.
  - Arrow functions are treated like function expressions: their bodies are
    separate scopes, so no CFG nodes are created or linked inside them and
    they are not considered as throwing.
  - `ForOfStatement` is handled like `ForInStatement` (loop node with
    true/false branches, `continue` and `break` targets).
  - A `ClassDeclaration` is a single statement node; no CFG nodes are created
    or linked inside class bodies (methods are separate scopes).
  - ES module declarations: `import`, `export * from` and `export { ... }` are
    statement nodes; an exported declaration (`export const`, `export function`,
    `export default class`, ...) is analyzed as the declaration itself.

The full history is in `git log -- lib/esgraph tests/esgraph`.

## 2. analyses — forked and modified

| | |
|---|---|
| Upstream | https://github.com/Swatinem/analyses |
| Base version | 0.2.1 (npm, published 2013-12-15) |
| License | LGPL-3.0 |
| Imported into dujs | 2015-04-20 (commit `fd546f1`) |

### Derived files (LGPL-3.0)

| File | Origin |
|---|---|
| `lib/analyses/index.js` | upstream `lib/index.js` |
| `lib/analyses/queue.js` | upstream `lib/queue.js` |
| `lib/analyses/set.js` | upstream `lib/set.js` |
| `lib/analyses/examples/index.js` | upstream `lib/examples/index.js` |
| `lib/analyses/examples/livevariables.js` | upstream `lib/examples/livevariables.js` |
| `lib/analyses/examples/availableexpressions.js` | upstream `lib/examples/availableexpressions.js` |
| `tests/analyses/*.js` | upstream tests |

### Modifications

- 2015-04 – 2015-05, by ChengFuLin
  - `worklist()` returns `{inputs, outputs}` (also recording the input set of
    each node) instead of only the output map; the examples were updated to
    read `.outputs`.
  - Strict mode and JSHint fixes; ES6 `Map` via the core-js polyfill.
- 2026-11-11, by ChengFuLin
  - Removed the core-js polyfill and use the native `Map`.
  - `availableExpressions`: ignore `start`/`end`/`range`/`loc` when comparing
    expressions structurally, because espree always attaches position info.
  - Tests parse through `lib/dujs/jsparser` (espree) instead of esprima, and
    the available-expressions test compares expressions without positions.

The full history is in `git log -- lib/analyses tests/analyses`.

## 3. walkes — used as an unmodified dependency

| | |
|---|---|
| Upstream | https://github.com/Swatinem/walkes |
| Version | 0.2.1 (installed from npm, see `package.json`) |
| License | LGPL-3.0 |

walkes is not copied into this repository and has not been modified. It is
loaded at runtime via `require('walkes')` and can be replaced by any compatible
version.

## Development-only dependency

The upstream `esgraph` package (0.3.0, LGPL-3.0) is installed as a
devDependency and used only by `tests/analyses/*.js`. It is not part of the
dujs runtime.
