# README 拆分對照表（feature 009, US4）

原文：`git show 274257a:README.md`（feature 開工前 `develop`）。段＝以空行分隔的區塊；`<ul>` 中每個 `<li>`（含巢狀）各算一段，區塊中清單外的文字（`##Limits` 標題）另算一段（`specs/009-mermaid-markdown-output/tools/readmecheck.js` 的切段定義，`--segments` 可列出）。ID＝段序號；`N1`～`N10` 為原 README 沒有的新增內容，不佔段序號（理由「新增（導覽）」者為指向其他章節或檔案的導覽文字）。

檢查：`node specs/009-mermaid-markdown-output/tools/readmecheck.js specs/009-mermaid-markdown-output/readme-map.md`（exit 0，SC-007）。`搬移` 段的正規化文字為新位置標題下正規化文字的子字串；`改寫` 段須有理由；`新增` 列「原段落」欄的每個 code span 須逐字（空白合併）出現在新位置標題下（contracts/docs-split.md §3）。標題下＝該標題行到下一個任何層級的標題；一段跨多個標題時新位置依序列出各標題，取其範圍的合併。

| ID | 原段落（首句摘錄） | 新位置（檔案 + 標題） | 處置 | 理由 |
|----|--------------------|-----------------------|------|------|
| 1 | dujs A Dataflow analysis tool for JavaScript. | `README.md` + `# dujs` + `## Goal` | 搬移 | 原段落跨 `#dujs`／`##Goal` 兩個標題：簡介句在 `# dujs` 下、`## Goal` 前，Goal 文字在 `## Goal` 下；標題補空格（FR-019） |
| 2 | Requirements Node.js 24 or later (see .nvmrc) Graphviz (optional): | `README.md` + `## Requirements` | 改寫 | Graphviz／PNG 移除（FR-013）：Graphviz 項改為 Mermaid 檢視器項（見 N2） |
| 3 | Dependency espree: | `README.md` + `## Dependency` | 搬移 |  |
| 4 | Setup npm install npm test # run unit tests and the golden regression … | `README.md` + `## Setup` | 搬移 |  |
| 5 | tests/golden/ runs the CLI on two ES5 sample pages, an ES2015+ module,… | `docs/development.md` + `## Golden tests` | 改寫 | HTML 報告移除（FR-012）：「referred to in the HTML report」改為模型 Markdown `<k>.md`；golden 比對含 `.md`、manifest `added` 收錄 `.md`（FR-015） |
| 6 | Existing lint violations are recorded in eslint-suppressions.json (ESL… | `docs/development.md` + `## Lint` | 搬移 |  |
| 7 | Usage Usage: | `README.md` + `## Usage` | 搬移 |  |
| 8 | Run it as node bin/dujs.js ... | `docs/usage.md` + `## Command line` | 搬移 |  |
| 9 | The results are written to a new directory out-[year]-[month]-[day]-[h… | `docs/usage.md` + `## Output directory` | 搬移 | `<strong>` 改 Markdown 粗體 |
| 10 | Exit status: | `docs/usage.md` + `## Exit status` | 改寫 | 前導句「Exit status:」改為章節標題 `## Exit status`（FR-019），清單逐字保留 |
| 11 | Each model is written as &lt;n&gt;.graph.dot (the flattened statement-level … | `docs/output-format.md` + `## Output files` | 改寫 | Graphviz／PNG 移除（FR-013）：`.png` 敘述改為模型 Markdown `<n>.md`、總覽 `README.md` 與降級表格（FR-012、FR-015） |
| 12 | &lt;n&gt;.matching.json (format dujs-matching/1) pairs every call edge with … | `docs/output-format.md` + `## Matching of calls and returns` | 搬移 |  |
| 13 | finallyExit nodes and finally edges: | `docs/output-format.md` + `## finallyExit nodes and finally edges` | 搬移 |  |
| 14 | In the .dot outputs a node is labeled with its line number as dujs pri… | `docs/output-format.md` + `## Node labels` | 搬移 |  |
| 15 | Nodes with calls are split into segments (feature 007-split-call-nodes… | `docs/output-format.md` + `## Call sites split into segments` | 搬移 |  |
| 16 | So a c-use can be on a CALL or CALL RETURN node (f(x = 1) defines x on… | `docs/output-format.md` + `## Call sites split into segments` | 搬移 |  |
| 17 | Supported syntax ES5 and ES2015+: | `docs/limitations.md` + `## Supported syntax` | 搬移 |  |
| 18 | Limits | `docs/limitations.md` + `## Limits` | 搬移 | 標題補空格（FR-019） |
| 19 | Anonymous function call | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 20 | Closure | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 21 | HTML DOM object | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 22 | Calls inside expressions are call sites too (feature 007-split-call-no… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 23 | f() and new F() connect the function F; | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 24 | new A().m() is two call sites, construction and then m (the arguments … | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 25 | the static members of a class declared or evaluated in a node run wher… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 26 | Still not call sites: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 27 | Not connected: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 28 | A callee is resolved only when its definitions reaching the call are a… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 29 | In a function, method or event handler, new A()/A.s() is connected whe… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 30 | In a function, method or event handler, o.m() with no definition of o … | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 31 | In a function, method or event handler, f(); | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 32 | window.f = … is not a definition of f: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 33 | A parameter and a function declaration with the same name: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 34 | Calls use summaries of the callees (context-sensitive): | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 35 | Exception paths carry only the definitions valid before the throwing n… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 36 | try…finally: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 37 | Generators and async functions get a conservative summary: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 38 | An event handler entered from the event loop returns only to the event… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 39 | In the MDN bouncing balls example, const ball = new Ball() is connecte… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 40 | The super class is not followed: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 41 | Recursion (a function, method or constructor calling itself, or functi… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 42 | Object properties, this and aliases are not tracked: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 43 | Scopes follow eslint-scope: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 44 | Globals: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 45 | Annex B: | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 46 | References made dynamic by a direct eval or by with are resolved stati… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 47 | Names in the body of a with statement are resolved by the normal scope… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 48 | Splitting conditions makes the number of nodes grow as the product of … | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 49 | The initialization node of a parameter with a default value always def… | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 50 | The files of a page are concatenated, so imports between module files … | `docs/limitations.md` + `## Limits` | 搬移 | HTML 清單改 Markdown（US4 情境 2） |
| 51 | See docs/known-issues.md for confirmed issues that are not fixed yet, … | `docs/limitations.md` + `## Limits` | 搬移 | 連結改相對路徑 `known-issues.md`；README 亦保留一個連結（`## Documentation`） |
| 52 | Demo Single page sample | `README.md` + `## Demo` | 搬移 | 標題補空格（FR-019） |
| 53 | SDD 導入宣告 | `README.md` + `## SDD 導入宣告` | 搬移 |  |
| 54 | \| 項目 \| 值 \| \|------\|-----\| \| 目前導入階段 \| 第 1 階段（對齊基礎）\| \| 服務風險分級 \| 未分級（階段一）… | `README.md` + `## SDD 導入宣告` | 搬移 |  |
| 55 | License dujs is released under the MIT License, except for the files d… | `README.md` + `## License` | 搬移 |  |
| N1 | 論文中文標題 `JavaScript網頁應用程式資料流測試模型之研究`、英文標題 `A Study on Dataflow Testing Model of JavaScript Web Applications`、網址 `https://hdl.handle.net/11296/u8f5n6` | `README.md` + `## Background` | 新增 | 新增（使用者 D003） |
| N2 | Requirements 的 Mermaid 檢視器項：``A Markdown viewer with Mermaid support (GitHub, VS Code, ...) to view the outputs; `out-*/` is excluded by `.gitignore` and never appears on GitHub, so open the outputs in a local viewer`` | `README.md` + `## Requirements` | 新增 | 新增（本 feature 輸出變更） |
| N3 | 輸出變更註記（FR-012）：``Output changes: since feature `009-mermaid-markdown-output`, dujs no longer writes `report.html` or `.png` files and does not need Graphviz; open the overview `README.md` and the model files `<n>.md` instead.`` | `README.md` + `## Output` | 新增 | 新增（本 feature 輸出變更） |
| N4 | `docs/` 章節檔連結清單：`[docs/usage.md](docs/usage.md)`、`[docs/output-format.md](docs/output-format.md)`、`[docs/limitations.md](docs/limitations.md)`、`[docs/development.md](docs/development.md)`、`[docs/known-issues.md](docs/known-issues.md)` | `README.md` + `## Documentation` | 新增 | 新增（本 feature 輸出變更） |
| N5 | docs/usage.md 開頭的用法區塊：`Usage: dujs -js <file>... [-js <file>...]... dujs -h \| --help` | `docs/usage.md` + `# Usage` | 新增 | 新增（導覽） |
| N6 | docs/usage.md 末行：`See [Output format](output-format.md) for the files written to the directory.` | `docs/usage.md` + `## Exit status` | 新增 | 新增（導覽） |
| N7 | docs/development.md 開頭：`Setup and the npm scripts are in the [README](../README.md#setup).` | `docs/development.md` + `# Development` | 新增 | 新增（導覽） |
| N8 | README `## Documentation` 各項說明：`[docs/usage.md](docs/usage.md): command line, output directory and exit status`、`[docs/output-format.md](docs/output-format.md): output files, call and return matching, node labels and call sites`、`[docs/limitations.md](docs/limitations.md): supported syntax and limits`、`[docs/development.md](docs/development.md): golden tests and lint`、`[docs/known-issues.md](docs/known-issues.md): confirmed issues that are not fixed yet, each with a reproducing input; the limits it refers to as "the README limits" are in [docs/limitations.md](docs/limitations.md#limits)` | `README.md` + `## Documentation` | 新增 | 新增（導覽） |
| N9 | README `## Usage` 用法區塊後的範例與導覽：``Example: `node bin/dujs.js -js lib.js app.js -js report.js` (two pages). See [docs/usage.md](docs/usage.md) for the command line, the output directory and the exit status.`` | `README.md` + `## Usage` | 新增 | 新增（導覽） |
| N10 | README `## Output` 輸出摘要：``Each run writes a new directory `out-…` with, for every model, its `.dot` files and a Markdown file `<n>.md` with the graphs drawn as Mermaid diagrams; the `README.md` of the directory is the overview, with links to every `<n>.md`. See [docs/output-format.md](docs/output-format.md) for the details.`` | `README.md` + `## Output` | 新增 | 新增（導覽） |
