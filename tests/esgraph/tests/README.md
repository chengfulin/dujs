# esgraph test fixtures

The `*.js` files in this directory are test fixtures derived from
[esgraph](https://github.com/Swatinem/esgraph) 0.1.1 by Arpad Borsos (Swatinem),
licensed under the GNU LGPL v3 (`LGPL-3.0-only`, see `LICENSES/LGPL-3.0.txt` and
`LICENSES/GPL-3.0.txt` at the repository root). They are not covered by the
dujs MIT license.

They carry no license header because `tests/esgraph/test.js` reads the first
two comments of each fixture as the test name and the expected DOT output.
Modified by ChengFuLin on 2015-07-14: the expected DOT outputs were updated to
the dujs node styling for entry/exit nodes. See `THIRD_PARTY_NOTICES.md` for details.
Modified by ChengFuLin on 2026-11-16: the expected DOT output of `maythrow.js`
was updated because `1 && call()` is now split into a decision node `1` (true
edge to the leaf `call()`, false edge straight to `new klass()`; no node is
created for the empty false branch). The literal decision cannot throw, so it
has no exception edge; the node ids were renumbered accordingly. See
`THIRD_PARTY_NOTICES.md` for details.
