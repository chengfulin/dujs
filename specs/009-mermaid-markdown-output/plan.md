# Implementation Plan：以 Markdown + Mermaid 取代 Graphviz 圖檔輸出

**Branch**: `009-mermaid-markdown-output` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/009-mermaid-markdown-output/spec.md`（D001 已裁決；D002 追加 US4；D003 README 拆分清單已確認；D004 plan 閘門已裁決；D005 analyze 閘門修正已套用，見「裁決紀錄」）

## Summary

每個模型在寫出 `.dot` 的同時，以**同一份記憶體中的 DOT 字串**經新的原創 MIT 模組（`dotreader` 讀 dujs 自己的 DOT 方言 → `mermaidgraph` 轉 Mermaid `flowchart TD`）產生 `<n>.md`（標題、階層圖、扁平圖、def-use pairs 表格），因此節點／邊與 `.dot` 必然一一對應、`.dot` 不動，也不衍生 LGPL 的 `lib/esgraph/dot.js`。輸出目錄根改寫總覽 `README.md`（取代 `report.html`，刪 `reportgenerator.js`），移除 Graphviz 呼叫與所有 PNG 路徑狀態。測試以 devDependency `mermaid@12.3.0`＋`jsdom` 在 Node 內呼叫官方 parser，golden 擴及 `.md`。最後更新 README，並依 D003 定案清單把 README 拆成 `docs/` 章節檔（README 頂部另加 `## Background` 註明論文緣起）。設計理由見 [research.md](./research.md) R1–R9。

## Technical Context

**Language/Version**: JavaScript（CommonJS；`lib/` 維持 ES5 風格），Node.js ≥ 24

**Primary Dependencies**: 執行期不變（espree、eslint-scope、walkes）。devDependencies 新增 `mermaid` `12.3.0`（精確釘選，parser oracle）、`jsdom` `^29.1.1`（research R3：+155 套件／225 MB；lock +153 項、+1783 行；`npm audit` 0）。`lib/esgraph/**` 不修改。

**Storage**: 檔案輸出：`.dot`（不變）、`*.matching.json`（不變）、新增 `<n>.md`、根目錄 `README.md`；移除 `.png`、`report.html`

**Testing**: mocha ^12＋should ^13；golden `tests/golden/golden.js`＋`manifest.json`；eslint ^10；c8。Mermaid 只在 `tests/helpers/mermaid.js` 的 `load()` 內以動態 `import()` 載入：設 jsdom 全域 → import → initialize → 立即還原全域（D005-A1）。

**Target Platform**: Node.js ≥ 24（macOS／Linux），不需 Graphviz、不需瀏覽器

**Project Type**: library＋CLI（`bin/dujs.js`）

**Performance Goals**: Markdown 產生為線性字串處理，不設獨立門檻；測試中 Mermaid parse ≈ 2 秒／281 圖（R5）

**Constraints**: `.dot`／`.matching.json` byte-identical（FR-008）；輸出確定性（FR-007）；不得呼叫外部程式（FR-013）；不新增需瀏覽器的執行期相依（FR-014）；新程式 MIT、不衍生 LGPL 檔

**Scale/Scope**: golden 4 fixture／86 張圖；MDN 32 id／281 張圖，最大 200 邊、Mermaid 7,411 字元（R5，遠低於 500／50,000）

## Constitution Check

*GATE：Phase 0 前與 Phase 1 後各檢查一次。*

| 條款 | 檢查 | 結果 |
|------|------|------|
| §CP-1 可追溯 | 每項設計對應 FR／SC／A（本檔與 contracts 皆標註）；spec 問題列入回報、不自行改 spec；US4 拆分清單依 D003 使用者確認版（contracts/docs-split.md §2） | 通過 |
| §CP-2 機密 | 不涉機密；無新設定檔 | 通過 |
| §CP-3 設定不硬編碼 | 新常數 `MAX_EDGES`／`MAX_TEXT_SIZE` 是輸出格式規格（Mermaid 預設上限），非環境設定，與既有 `MATCHING_FORMAT` 同性質；不新增環境相依設定 | 通過（非環境設定） |
| §CP-4 核心邏輯測試 | dotreader／mermaidgraph／markdownoutput 單元測試（正常、錯誤行、quote-aware 屬性、跳脫、空標籤、重複邊、降級兩邊界）＋golden＋CLI 測試＋`tests/docs/links.js`；`npm test` 可獨立重複執行，不依外部服務；mermaid 為本機 devDependency | 通過 |
| §CP-5 審查 | PR 目標 `develop`，人為核准合併 | 依流程 |
| §CP-6 例外 | 無例外 | 無 |
| §GV-3 | `npm test`、`npm run lint` 為閘門；刪檔後 `npx eslint . --prune-suppressions` 移除 `reportgenerator.js` 的 suppression；新模組不得違反 `tests/dujs/scopesource.js` 的 S5 靜態檢查（`markdownoutput.js` 以 `String(key)` 取變數名，不改 `S5_ALLOWED`，D004-1b） | 通過 |
| 【參考】§TR-3 | lock 納入版控；`npm audit` 0；devDependencies 不進執行期 | 符合 |
| 【參考】§TR-8 影響範圍 | 見下「影響範圍宣告」 | 已宣告 |

**Post-design 重檢（Phase 1 後）**：contracts 未引入新的執行期相依、外部程式或環境設定；授權邊界明確（新檔 MIT、只讀 DOT 輸出）。仍全數通過，無 Complexity Tracking 項目。

### 影響範圍宣告（§TR-8）

- **新增**：`lib/dujs/dotreader.js`、`lib/dujs/mermaidgraph.js`、`lib/dujs/markdownoutput.js`；`tests/dujs/dotreader.js`、`tests/dujs/mermaidgraph.js`、`tests/dujs/markdownoutput.js`、`tests/helpers/mermaid.js`；`tests/golden/expected*/**/*.md`；（US4）`docs/usage.md`、`docs/output-format.md`、`docs/limitations.md`、`docs/development.md`、`tests/docs/links.js`；本目錄 `tools/mdncheck.js`、`tools/readmecheck.js`、`mdn-check.md`、`readme-map.md`。
- **修改**：`lib/dujs/outputwriter.js`（去 PNG、寫 `.md`、`writeOverview`）、`lib/dujs/cli.js`（改呼叫總覽）、`lib/dujs/hierarchydot.js`（抽 `hierarchyTitleOf`、另匯出 `escapeLabel`，輸出不變）、`tests/dujs/hierarchydot.js`、`tests/golden/golden.js`、`tests/golden/manifest.json`（只加 `added`）、`tests/dujs/cli.js`、`package.json`／`package-lock.json`（devDependencies；US4 時 `test` script 加 `tests/docs/*.js`）、`eslint-suppressions.json`、`README.md`、`specs/003-hierarchical-models/contracts/hierarchy-output.md`、`specs/004-fix-remaining-issues/contracts/cli.md`（加 superseded 註記）。
- **刪除**：`lib/dujs/reportgenerator.js`。
- **明確不受影響**：`lib/esgraph/**`（含 LGPL `dot.js`、`index.js`）、`lib/analyses/**`、`lib/dujs/graphics.js`、`lib/dujs/cfggraphconverter.js` 與所有分析模組；`.dot`／`.matching.json` 內容；`LICENSE`、`LICENSES/`、`THIRD_PARTY_NOTICES.md`；`package.json` 版本號；`docs/known-issues.md`（若 T044 經 DECISION 核准寫入新段落，同步改本宣告為「只新增核准段落」，並於其後重跑 T043；D005-A9）。

## 架構

```
outputwriter.write*AnalysisResultFiles
  ├─ graphDot = graphics.convertGraphToDot(model)        ──► <n>.graph.dot   (不變)
  ├─ dupairsDot = graphics.convertDUPairsToDot(...)      ──► <n>.dupairs.dot (不變)
  ├─ hierarchyDot = hierarchydot.convertHierarchyToDot   ──► <n>.hierarchy.dot (不變)
  ├─ matching                                             ──► <n>.matching.json (不變)
  └─ markdownoutput.modelMarkdown(model, level, {graphDot, hierarchyDot})  ──► <n>.md
        ├─ dotreader.readDot(dotText)          (MIT；只讀 DOT 文字)
        ├─ mermaidgraph.renderGraph(graph)     (MIT；Mermaid／降級)
        └─ dupairs 表格 ← model.dupairs
cli.analyzeAndWrite → outputWriter.writeOverview(sourceContents) ──► README.md
```

- 授權（R1）：三個新模組檔頭標 `Original dujs code, MIT License (see LICENSE).`，不 require／不複製 `lib/esgraph/dot.js`；它們只消費 DOT 字串，與 `dot.js` 的耦合僅限「dujs DOT 方言」這個資料格式（contracts/mermaid-graph.md §1），遇到未知行拋錯（fail fast，避免日後 `.dot` 格式改變時悄悄產生不一致的 Mermaid）。屬性解析為 quote-aware（引號內的 `,`、`]` 不當分隔／結尾，如 `style="bold,dashed"`、標籤含 `]`）。
- S5 靜態檢查（D004-1b）：`lib/dujs/*.js` 讀 `<x>.name` 須列在 `tests/dujs/scopesource.js` 的 `S5_ALLOWED`；`markdownoutput.js` 的 def-use 表格改以 `String(key)` 取變數名（`lib/dujs/var.js:101` `toString` 回傳同名），不擴充白名單（contracts/model-markdown.md §4）；`dotreader.js`、`mermaidgraph.js` 同樣不得讀 `<x>.name`（D005 建議）。
- 標題（R2）：`hierarchydot.hierarchyTitleOf(model)` 為上層模型標題的單一來源（`.dot` label、`<n>.md` 標題、總覽連結）。
- 總覽（R7）：由模型列舉，不用共享陣列；`writeOverview` 取代 `reportGenerator.createReport()`。

### 有意的取捨與已知限制（D004-1 建議）

- **dotreader fail-fast → CLI exit 1**：`.dot` 出現方言外的行時 `readDot` 拋錯，CLI 以 exit 1 結束（該模型以後的輸出不寫）。這是有意的取捨：寧可整次失敗，也不產生與 `.dot` 不一致的 Mermaid（由 T045 以 in-process `cli.run` stub `dotreader.readDot` 拋錯驗證 exit 1 且輸出目錄被移除，spec G-2）；現行 `dot.js`／`hierarchydot.js` 的輸出由 golden 與 MDN 驗收守住不會觸發。
- **`.dot` 標籤含 `\n` 跳脫或真換行**：現行產生路徑不會產生，屬不支援（`\n` 不解碼、真換行使該行無法比對而拋錯；contracts/mermaid-graph.md §1）。
- **Markdown 表格「反斜線緊接 `|`」**：儲存格內容含 `\|` 時，`|`→`\|` 後成為 `\\|`，GFM 的渲染結果可能與原文不同；現行輸出（pair、變數名、DOT 標籤）不含此序列，列為已知限制（contracts/model-markdown.md §3）。

## 契約（contracts/）

- [mermaid-graph.md](./contracts/mermaid-graph.md)：DOT 方言、Mermaid 輸出、FR-004 形狀／樣式對應表、FR-006 跳脫與往返解碼、FR-010 降級（常數 500／50,000、逐圖判斷、邊界）。
- [model-markdown.md](./contracts/model-markdown.md)：`<n>.md` 格式、標題、code span／儲存格規則、def-use pairs 表格（FR-005）。
- [overview-readme.md](./contracts/overview-readme.md)：總覽 `README.md` 格式、動態 fence（A2）、連結順序。
- [docs-split.md](./contracts/docs-split.md)：US3 的 README 改寫、US4 拆分定案清單（D003，含 `## Background`）、對照表與檢查（FR-018，處置值域含「新增」）、標題／連結檢查（FR-019）。

## 測試策略

| 測試 | 位置 | 對應 |
|------|------|------|
| dotreader：dujs 方言逐行（節點、邊、`label = "call"` 空白、空 `[]`）、`\"`／`\\` 解碼、未知行拋錯、重複邊保留；quote-aware 屬性解析：`style="bold,dashed"` 一例、標籤含 `]` 一例 | `tests/dujs/dotreader.js` | FR-003 |
| mermaidgraph：三種形狀、五種線型＋顏色 linkStyle、跳脫（每個 FR-006 字元及 `:`、`%`、`\r`、相鄰 `$$`、換行、空標籤 `" "`、首尾空白）、classDef 只在需要時出現 | `tests/dujs/mermaidgraph.js` | FR-004、FR-006 |
| 重複邊：同對節點的多條邊（含無標籤重複邊）經 `toMermaid` → `getDiagramFromText(...).db.getEdges()` 一路走到 mermaid，條數與順序保留 | `tests/dujs/mermaidgraph.js`＋`tests/helpers/mermaid.js` | FR-003、SC-003 |
| 降級邊界（合成圖）：500 邊→Mermaid、501 邊→表格；字元 50,000→Mermaid、50,001→表格（以長標籤調整到精確字元數，斷言 `textSize` 恰為該值）；同檔另一張圖不受影響；500 邊區塊 `mermaid.parse` 通過 | `tests/dujs/mermaidgraph.js` | FR-010 |
| 跳脫往返：含所有特殊字元的標籤 → `mermaid.mermaidAPI.getDiagramFromText(...).db.getVertices()`／`getEdges()` → 解碼佔位符（`ﬂ°°<碼>¶ß`、`ﬂ°<名>¶ß`、`<br>`）→ 等於原文；案例 MUST 含 `style:#x`、`classDef x:#1`、`%%{init: {}}%%`、含 `\r` 的標籤、`$$a$$`（D004-1a） | `tests/dujs/mermaidgraph.js`＋`tests/helpers/mermaid.js` | FR-006、FR-009 |
| markdownoutput：標題規則（四層級）、區段順序、code span（含反引號、`|`、`$`）、dupairs 表格（無 pair、同名多列、pair 含逗號；變數名以 `String(key)` 取得）；S5 靜態檢查（`tests/dujs/scopesource.js`）不需改白名單即通過 | `tests/dujs/markdownoutput.js` | FR-001、FR-005 |
| golden：`listDotFiles` → `listGoldenFiles`（加 `.md`）；檔案集合、逐字比對、manifest `added`（含 `.md`）；baseline 雜湊檢查不變 | `tests/golden/golden.js` | FR-008、FR-009a、SC-001 |
| golden：所有 `.md` 的 mermaid 區塊 `mermaid.parse` 通過；每張圖 Mermaid（經 `getDiagramFromText`）的節點（id, label）多重集合與邊（from,to,label）多重集合＝同模型 `.dot`，且三種形狀（box／stadium／double circle）的節點數各等於 `.dot` 的 `shape` 計數（測試端以獨立的簡易 regex 讀 `.dot`，不重用 `dotreader`，避免同源錯誤互相掩蓋）；邊數 ≤ 500 且字元 ≤ 50,000 | `tests/golden/golden.js` | FR-009、SC-002、SC-003 |
| golden：總覽連結全部存在、順序符合 contracts/overview-readme.md §2（取代原 report 順序測試 L189-222 與 `reportImagePaths`）；無 `report.html` | `tests/golden/golden.js` | FR-011、FR-012、SC-005 |
| 確定性：同一 fixture 在兩個工作目錄各跑一次，所有 `.md` byte-identical | `tests/golden/golden.js` | FR-007、SC-006 |
| fail-fast：in-process `cli.run(argv, io)` 下 stub `dotreader.readDot` 拋錯 → exit 1、輸出目錄被移除；測試後還原 stub（D005-A6） | `tests/dujs/cli.js` | G-2 |
| 無 Graphviz：以 `PATH` 只含 `process.execPath` 所在目錄的 env 跑 `bin/dujs.js` → exit 0、stderr 空、0 個 `.png`；靜態檢查 `lib/**/*.js` 不含 `child_process` | `tests/dujs/cli.js` | FR-013、SC-004 |
| 標題與相對連結（US4）＋ D003 Background 三項逐字字串（中、英文論文標題與網址）出現在根 `README.md`：掃描根 `README.md` 與 `docs/*.md`（不遞迴，避開 `tests/golden/expected*/README.md` 與 `docs/research/`）；標題檢查排除 `docs/known-issues.md`（L427 為 `#7); …` 開頭的折行段落，會被誤判；連結檢查仍做；不改該檔）；解析 `](…)` 略過 fenced code、連結可指向目錄（如 `](LICENSES)`，D005-A8c） | `tests/docs/links.js`（併入 `npm test`） | FR-019 |
| CLI 測試更新：L289-324 的 report 測試改為 `writeOverview` 寫進實際目錄、連結不含目錄名；L423、L485-489 改查 `README.md`（同時跑的兩個目錄內容相同） | `tests/dujs/cli.js` | FR-012、A7 |

**紅燈先行註記**：「清空 PATH 跑 CLI」測試在 US3 之前就會通過（現行 `spawnSync('dot')` 失敗是靜默的），不能當 US3 的紅燈先行依據；US3 的回歸防線是「輸出 0 個 `.png`」與「`lib/` 不含 `child_process`」的靜態檢查（後者在 US3 前為紅燈）。

golden expected 以 `UPDATE_GOLDEN=1 npm test` 產生後人工審閱；manifest `added` 手動加入 `.md` 檔名（`UPDATE_GOLDEN` 不寫 manifest，既有慣例）。`.dot` 的 expected 檔不得出現在 diff 中（SC-001）。

## MDN 驗收（FR-016）

`tools/mdncheck.js`（research R8）以 `specs/006-eslint-scope/mdn/corpus`＋`pages.json` 跑本 branch 與 `274257a`（git worktree），檢查項與結果記錄 `mdn-check.md`；`--verify` 重跑核對。已量測（R5）：32 id 全 exit 0、281 圖全可 parse、最大 a05 inter-page 200 邊／`.dot` 11,580 bytes／Mermaid 7,411 字元，預期 0 降級。

## User Story 對應與相依

| Story | 內容 | 相依 |
|-------|------|------|
| US1（P1）模型 Markdown | 三個新模組、`hierarchyTitleOf`、outputwriter 寫 `<n>.md`、devDependency、單元＋golden `.md` 測試、manifest `added` | 無（Setup：devDependency 與 `tests/helpers/mermaid.js`） |
| US2（P2）總覽＋移除 report.html | `writeOverview`、cli 改呼叫、刪 `reportgenerator.js`＋suppression、刪 `pageJSSourFilePaths`、golden／cli 測試改查總覽、golden 加 `README.md` | US1（連結目標 `<n>.md` 須存在） |
| US3（P3）移除 Graphviz／PNG＋README | 刪 `writeImageFileFromDotFile`、`_testonly_` 掛鉤、12 個 `*ImageFilePaths`；無 Graphviz 測試；README 改寫（contracts/docs-split.md §1）；003／004 契約標 superseded | US2（`report.html` 是 PNG 路徑屬性的唯一讀者，須先移除報告，否則報告缺圖或引用不存在的屬性） |
| US4（P4）README 拆分 | `docs/*.md`、README 精簡＋`## Background`（論文緣起與連結）、`readme-map.md`、`tools/readmecheck.js`（不進 `npm test`）、`tests/docs/links.js`、`test` script 加 `tests/docs/*.js` | US3（同一份 README，先改 Graphviz／PNG 敘述再拆）；清單依 D003 定案（contracts/docs-split.md §2） |

US1 完成時可獨立交付（`.md` 與 `.png`／`report.html` 並存）；US2 完成後 `report.html` 消失但 PNG 仍可能產生；US3 收尾。

## 舊契約標註（A7）

- `specs/003-hierarchical-models/contracts/hierarchy-output.md` §4（契約 #5）標題後加：`> Superseded by specs/009-mermaid-markdown-output（report.html 移除；順序改由 contracts/overview-readme.md 與 model-markdown.md 規定）`。
- `specs/004-fix-remaining-issues/contracts/cli.md` §2 第 4 步與 §3 的 `reportgenerator`／`report.html` 敘述、§4 US5-4 的 report 引用：同樣加 superseded 註記（輸出目錄唯一化本身仍有效）。

## Project Structure

### Documentation (this feature)

```text
specs/009-mermaid-markdown-output/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mermaid-graph.md
│   ├── model-markdown.md
│   ├── overview-readme.md
│   └── docs-split.md
├── tools/                 # implement 時建立：mdncheck.js、readmecheck.js（不進 npm test）
├── mdn-check.md           # implement 時產生
├── readme-map.md          # US4（D003 定案清單）
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
lib/dujs/
├── dotreader.js          # 新：dujs DOT 方言讀取（MIT）
├── mermaidgraph.js       # 新：Mermaid 與降級（MIT）
├── markdownoutput.js     # 新：<n>.md 與總覽 README.md（MIT）
├── outputwriter.js       # 改
├── hierarchydot.js       # 改（hierarchyTitleOf）
├── cli.js                # 改
└── reportgenerator.js    # 刪
tests/
├── dujs/{dotreader,mermaidgraph,markdownoutput,cli}.js
├── helpers/mermaid.js    # 新：jsdom 全域 + import('mermaid') + 佔位符解碼
├── golden/{golden.js,manifest.json,expected*/}
└── docs/links.js         # 新（US4）
docs/{usage,output-format,limitations,development}.md   # 新（US4，D003 定案）
```

**Structure Decision**：沿用單一 library＋CLI 結構；新模組放 `lib/dujs/`（MIT 範圍），不進 `lib/esgraph/`。

## 裁決紀錄

| ID | 來源 | 摘要 |
|----|------|------|
| D001 | spec＋clarify 閘門（主 session＋Fable judge） | spec 方向通過並套用必修／建議修；`report.html` 以總覽 `README.md` 取代；標題來源、降級規則（500 邊／50,000 字元）、def-use pairs 用表格。詳見 spec Clarifications D001-1～5 |
| D002 | 使用者追加需求 | README 精簡並拆成 `docs/` 章節檔（US4，FR-017～FR-019、SC-007） |
| D003 | 使用者本人確認 | 拆分清單照 contracts/docs-split.md §2 定案；另於 README 頂部 Goal 之後加 `## Background`（一兩句＋逐字的論文中文標題「JavaScript網頁應用程式資料流測試模型之研究」、英文標題「A Study on Dataflow Testing Model of JavaScript Web Applications」、臺北科技大學博碩士論文系統連結 https://hdl.handle.net/11296/u8f5n6 ），readme-map 處置標「新增（使用者 D003）」；`tests/docs/links.js` 斷言三項字串出現在根 README |
| D004-1 | plan 閘門 | 必修：(a) 跳脫補 `:`→`#58;`、`%`→`#37;`、`\r`→`#13;`、相鄰 `$$` 以 `#36;` 打斷，往返案例加 `style:#x`、`classDef x:#1`、`%%{init: {}}%%`、`\r`、`$$a$$`（contracts/mermaid-graph.md §2.3）；(b) `markdownoutput.js` 以 `String(key)` 避開 S5，不改白名單。建議（採納）：golden 改 (id, label) 多重集合＋形狀計數；重複邊走到 `getEdges()`；dotreader quote-aware；`.dot` 標籤含換行屬不支援；fail-fast exit 1 為有意取捨；表格反斜線緊接 `|` 為已知限制；修正 research R5／R7 過時敘述；清空 PATH 測試不當紅燈依據 |
| D004-2 | plan 閘門 | A：`mermaid` 精確 `12.3.0`、`jsdom` `^29.1.1`（Technical Context 已如此） |
| D004-3 | plan 閘門 | A：`tests/docs/links.js` 併入 `npm test`（`test` script 加 `tests/docs/*.js`）；`readmecheck.js` 留在 `specs/009-…/tools/` 不進 `npm test`；標題檢查排除 `docs/known-issues.md`（連結仍檢查，不改該檔）；links.js 只掃根 `README.md` 與 `docs/*.md`（不遞迴） |
| D005 | analyze 閘門（Fable judge 裁決，全部採納） | A1 helper `load()` 設全域→import→initialize→立即還原、預載 `this.timeout(30000)`；A2 spec 換行 Edge Case 改為不支援；A3 readme-map 新增列 N1～N4 通用檢查、`## Output` 放輸出變更註記；A4 T025 grep 只掃 `lib bin`；A5 基準 worktree symlink `node_modules`、`remove --force`；A6 新任務 T045（fail-fast exit 1＋移除輸出目錄）、T015 以模組屬性呼叫 `readDot`；A7 T030 為「設計文件不由 implement 修改」的例外；A8 未知邊 `style`／`color` 拋錯（節點 style／fillcolor 忽略）、model-markdown §2 降級取代 fence、links 允許目錄；A9 文件小修（本表上方各處）；N1 `hierarchydot` 匯出 `escapeLabel`；N2 quickstart 以 `env PATH=/usr/bin:/bin "$(command -v node)"`、暫存改 session scratchpad；N3 T016 驗收敘述；建議：S5 提醒擴及 dotreader／mermaidgraph、writeOverview 測試先跑完整分析、manifest 插入位置、T018 `git status --porcelain -- lib`、連結解析略過 fenced code。不處理（記入 analyze 紀錄）：F7 編號排列、I1 基線不升級 |

## Complexity Tracking

無憲章違反。
