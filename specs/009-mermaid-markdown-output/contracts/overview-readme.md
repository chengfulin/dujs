# Contract：總覽 `README.md`（輸出目錄根）

適用：`lib/dujs/markdownoutput.js` `overviewMarkdown(pages)`、`outputWriter.writeOverview(sourceContents)`、`lib/dujs/cli.js`。
對應：FR-011、FR-012、US2、A2、SC-005；research R7。取代 `report.html`（supersedes 003 `contracts/hierarchy-output.md` §4 契約 #5、004 `contracts/cli.md` §2 第 4 步與 §3 的 report 部分）。

## 1. 產生時機

`cli.analyzeAndWrite` 在四階段寫出之後呼叫 `outputWriter.writeOverview(sourceContents)`（取代 `reportGenerator.createReport()`）。寫到 `<ROOT_OUTPUT_DIR>/README.md`；失敗時由既有流程刪除整個輸出目錄（G-2）。不再產生 `report.html`。

## 2. 內容（依序，區段之間一個空行）

```
# dujs analysis results

Each model is a Markdown file with its graphs in Mermaid; the `.dot` files next to it are the same graphs. View the files with a Markdown viewer that renders Mermaid (for example GitHub or VS Code).

## Page 0

### Source code

[`page0/src.js`](page0/src.js)

<F>js
<頁 0 的原始碼>
<F>

### Intra-procedural

- [`intra-procedural: $DOMAIN.$PAGE_0`](page0/intra-procedurals/0.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.add`](page0/intra-procedurals/1.md)

### Inter-procedural

- [`inter-procedural: $DOMAIN.$PAGE_0.sumAll`](page0/inter-procedurals/0.md)

### Intra-page

- [`intra-page: $DOMAIN.$PAGE_0`](page0/intra-pages/0.md)

## Page 1
…

## Inter-page

- [`inter-page`](inter-page/0.md)
```

規則：
- 頁依 index 遞增；每頁內固定 Source code → Intra-procedural → Inter-procedural → Intra-page；最後 Inter-page（US2 情境 1）。
- 各層級的模型依模型編號 `<n>` 遞增（＝`getPageModels` 陣列順序＝檔名編號）；某層級沒有模型時該節寫一行 `None.`。
- 連結目的地為相對於輸出目錄根的 POSIX 路徑，不含輸出目錄名稱（FR-007）；連結文字為 `codeSpan(modelTitleOf(model, level))`（model-markdown.md §2、§3）。
- 原始碼 fence（A2）：`<F>` = 反引號 × max(3, 原始碼中最長的連續反引號數 + 1)；原始碼原樣輸出、不跳脫；原始碼不以 `\n` 結尾時補一個 `\n` 再接結尾 fence。
- 檔案結尾恰一個 `\n`。

## 3. 驗證

- SC-005：解析所有 `](…)` 目的地，每個都存在於輸出目錄（golden、cli 測試、MDN 工具）。
- 順序：連結序列等於依 §2 規則由輸出目錄的 `*.md` 推得的序列（取代 golden 的 `reportImagePaths` 測試）。
- 每個 `<n>.graph.dot` 都有同編號 `<n>.md` 且被總覽連到；沒有多餘連結。
