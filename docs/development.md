# Development

Setup and the npm scripts are in the [README](../README.md#setup).

## Golden tests

`tests/golden/` runs the CLI on two ES5 sample pages, an ES2015+ module, an
inter-procedural sample (nested calls, a call in a decision and event
handlers) and a sample of the fixes of feature `004-fix-remaining-issues`
(conditions, `new` statements, class method calls and recursion, parameter
defaults, static members) and compares all generated `.dot`,
`.matching.json` and `.md` files (four models) with
`tests/golden/expected/`, `tests/golden/expected-es2015/`,
`tests/golden/expected-interprocedural/` and
`tests/golden/expected-fixes004/`. Besides the flat graphs
(`<k>.graph.dot`) and def-use pairs (`<k>.dupairs.dot`), each inter-procedural,
intra-page and inter-page model has a hierarchy graph (`<k>.hierarchy.dot`:
functions, main program, LOOP, event handlers, pages and the domain, with call,
return, loop, onEvent, loadStorage and saveStorage edges), shown before the
flat graph in the model Markdown `<k>.md`. `tests/golden/manifest.json`
records the sha256 of every `.dot` file produced before the hierarchical
refactor (`baseline`, which must stay byte-identical) and the files added
since (`added`, including the names of the `.md` files: the model files and
the overview `README.md` of each fixture). After an intended change to the
analysis, regenerate the expected outputs with `UPDATE_GOLDEN=1 npm test` and
review the diff; the manifest is never updated automatically.

## Lint

Existing lint violations are recorded in `eslint-suppressions.json`
(ESLint bulk suppressions), so only new violations fail `npm run lint`. After
fixing some of them, run `npx eslint . --prune-suppressions`.
