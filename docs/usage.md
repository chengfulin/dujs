# Usage

```
Usage: dujs -js <file>... [-js <file>...]...
       dujs -h | --help
```

## Command line

Run it as `node bin/dujs.js ...` (or `dujs` when installed). Each `-js` starts
a page; the files after it, up to the next `-js`, are combined into that page.
Example: `node bin/dujs.js -js lib.js app.js -js report.js` (two pages).
`-h`/`--help` prints the usage. A file named `-js` can be given after `--`.

## Output directory

The results are written to a new directory
**out-[year]-[month]-[day]-[hour]-[minute]-[second]** in the
current directory; when that directory already exists (for example, another
run started in the same second), `_1`, `_2`, ... is appended
(`out-…[_<n>]`), so a run never overwrites another run's outputs. All files
are read before the directory is created.

## Exit status

- `0`: success, or `--help`
- `1`: a file cannot be read (no directory is created), or the analysis or
  writing failed (the directory of the run is removed)
- `2`: usage error: no arguments, no page, an unknown option, a file before the
  first `-js`, or `-js` without files (the message and the usage are printed to
  stderr)

See [Output format](output-format.md) for the files written to the directory.
