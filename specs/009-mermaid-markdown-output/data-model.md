# Data Model：009 Markdown + Mermaid 輸出

本 feature 不改分析資料結構（FR-008）；以下是輸出層的中介資料與檔案實體。

## 1. DotGraph（`dotreader.readDot` 的結果，記憶體中）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `label` | `string \| null` | DOT 的 `label = "…"`（已解碼）；Mermaid 不使用 |
| `nodes` | `Array<{id, attrs}>` | 依 DOT 出現順序；`id` 為 `n<k>`（扁平圖）或 `h<k>`（階層圖） |
| `edges` | `Array<{from, to, attrs}>` | 依出現順序、保留重複邊 |
| `attrs` | `Object<string,string>` | `label`、`shape`、`fillcolor`、`color`、`style`（已解碼） |

驗證：每行恰被一條規則消化，否則拋錯（contracts/mermaid-graph.md §1）。`edges[*].from/to` 不需檢查存在於 `nodes`（DOT 允許，且 dujs 產生器保證）。

## 2. GraphRendering（`mermaidgraph.renderGraph(dotGraph, dotFileName)` 的結果）

| 欄位 | 說明 |
|------|------|
| `mermaid` | Mermaid 區塊文字（contracts/mermaid-graph.md §2） |
| `edgeCount`、`textSize` | 邊數、`mermaid.length` |
| `degraded` | `edgeCount > MAX_EDGES \|\| textSize > MAX_TEXT_SIZE` |
| `markdown` | 未降級：` ```mermaid ` fence＋`mermaid`；降級：提示＋節點表＋邊表 |

狀態：只有「Mermaid」與「降級」兩種，逐圖獨立判斷（FR-010）。

## 3. ModelMarkdown（檔案 `<n>.md`）

由 (model, level, {graphDot, hierarchyDot?}) 決定。`level ∈ {intraProcedural, interProcedural, intraPage, interPage}`；`hierarchyDot` 僅非 intraProcedural。標題 `modelTitleOf(model, level)`。格式見 contracts/model-markdown.md。與同目錄的 `<n>.graph.dot`、`<n>.dupairs.dot`、`<n>.hierarchy.dot`、`<n>.matching.json` 以 `<n>` 對應。

## 4. OverviewEntry（總覽的一列，產生時臨時計算，不存狀態）

| 欄位 | 說明 |
|------|------|
| `pageIndex` | 頁號（inter-page 為 null） |
| `level` | 同上 |
| `index` | 模型編號 `<n>`（陣列 index） |
| `title` | `modelTitleOf(model, level)` |
| `path` | `page<p>/<level dir>/<n>.md` 或 `inter-page/0.md` |

來源：`scopeCtrl.pageScopeTrees` × `modelCtrl.getPageModels(tree)` 的三個陣列＋`modelCtrl.interPageModel`，與寫模型檔的迴圈相同（research R7）。

## 5. 移除的狀態（FR-012、FR-013）

`OutputWriter.prototype` 的 11 個 `*ImageFilePaths`（實測 11 個，含拼錯的 `intraPageDUPairsmageFilePaths`；原記 12 個有誤）、`pageJSSourFilePaths`；`writeImageFileFromDotFile` 與 `_testonly_._writeImageFileFromDotFile`；`lib/dujs/reportgenerator.js` 整檔。

## 6. Golden manifest（`tests/golden/manifest.json`，結構不變）

每個 fixture：`baseline`（`.dot` 的 sha256，不變）、`added`（檔名清單，新增所有 `.md`：各 `<n>.md` 與根目錄 `README.md`）。`.md` 的內容以 expected 目錄逐字比對（G-9）。
