---

description: "Task list for feature 009-mermaid-markdown-output"
---

# Tasks：以 Markdown + Mermaid 取代 Graphviz 圖檔輸出

**Input**: `specs/009-mermaid-markdown-output/` 的 spec.md（Clarifications D001～D003）、plan.md（D004；「User Story 對應與相依」表為排程權威、「測試策略」表為測試內容權威）、research.md（R1–R9）、data-model.md、contracts/（mermaid-graph.md、model-markdown.md、overview-readme.md、docs-split.md）、quickstart.md

**Tests**: 規格要求（§CP-4、FR-009、FR-009a、FR-019），**測試先行**：每個元件先寫測試（預期先失敗），再實作。框架 mocha＋should；Mermaid parser 經 `tests/helpers/mermaid.js`（jsdom 全域＋動態 `import('mermaid')`）。**紅燈先行註記（plan）**：「清空 `PATH` 跑 CLI」的測試在 US3 之前就會通過（現行 `spawnSync('dot')` 失敗是靜默的），**不得**當 US3 的紅燈依據；US3 的紅燈是 `lib/` 不含 `child_process` 的靜態檢查（以及本機有 Graphviz〔`/opt/homebrew/bin/dot`〕時，一般 `PATH` 下「0 個 `.png`」的斷言）。

**Organization**: Setup → Foundational → US1 → US2 → US3 → US4 → Polish。US2 依賴 US1（連結目標 `<n>.md`）、US3 依賴 US2（`report.html` 是 PNG 路徑屬性的唯一讀者）、US4 依賴 US3（同一份 README，先改 Graphviz／PNG 敘述再拆）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、不依賴未完成的任務）
- **[Story]**：所屬 user story（US1–US4）
- 路徑皆相對 repo 根 `/Users/chengfulin/Documents/Personal/dujs`；git 一律 `git -C /Users/chengfulin/Documents/Personal/dujs`；基準 commit `274257a`

## 共通約定（每個任務都適用）

- **階段檢查**（Foundational 起每個 Checkpoint 皆同）：`npm test` 全綠、`npm run lint` 0 錯誤，且 **`.dot`／`.matching.json` byte-identical**：`git -C <root> diff --quiet 274257a -- 'tests/golden/expected*/**/*.dot' 'tests/golden/expected*/**/*.matching.json'` exit 0、`git -C <root> status --porcelain -- tests/golden/expected*` 只有新增（`??`／`A`）的 `.md`，沒有任何 `M`／`D`（SC-001、FR-008）。
- **golden 更新**：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js` 只重寫 `tests/golden/expected*`；**UPDATE_GOLDEN 不讀也不寫 `manifest.json`**（`tests/golden/golden.js:21-24`）→ 手動把新增的 `.md` 檔名加入各 fixture 的 `added`；`baseline` 雜湊**一個字都不得改**（`git diff 274257a -- tests/golden/manifest.json` 只有 `added` 陣列中的新增行）。重產後人工審閱新 `.md`（每層級至少一份）。
- **授權邊界（R1）**：新模組 `lib/dujs/dotreader.js`、`mermaidgraph.js`、`markdownoutput.js` 檔頭 `Original dujs code, MIT License (see LICENSE).`；不 require、不複製 `lib/esgraph/dot.js`。
- **不得修改**：`lib/esgraph/**`、`lib/analyses/**`、`lib/dujs/graphics.js`、`lib/dujs/cfggraphconverter.js` 與所有分析模組、`LICENSE`、`LICENSES/`、`THIRD_PARTY_NOTICES.md`、`package.json` 的 `version`、`docs/known-issues.md`、`tests/dujs/scopesource.js` 的 `S5_ALLOWED`（D004-1b）；`eslint-suppressions.json` 只允許經 `npx eslint . --prune-suppressions` 移除 `lib/dujs/reportgenerator.js` 項；spec／plan／contracts 等設計文件不由 implement 修改（需動 → 先發 DECISION）。
- **測試先行期間不 commit**：每個 story 從第一個紅測試起到該 story Checkpoint 通過前不 commit。
- 新模組維持 `lib/` 的 ES5 風格（CommonJS、函式內 `'use strict'`、`max-depth` 3）；測試檔沿用 `tests/**` 的 mocha 全域。

---

## Phase 1: Setup（devDependencies 與 Mermaid 測試 helper）

**Purpose**: 確認基準、加入 parser oracle（`mermaid@12.3.0`＋`jsdom`）與共用 helper。

- [ ] T001 確認基準：`git -C <root> diff --quiet 274257a -- lib tests bin README.md package.json` exit 0（本 branch 目前只有 `specs/` 文件 commit）；執行 `npm test`、`npm run lint`，把 passing 數與 lint 結果回報主對話（作為之後各階段「既有測試不減少」的對照，不另建檔）
- [ ] T002 加入 devDependencies（FR-009、FR-014、D004-2、research R3）：`npm install --save-dev --save-exact mermaid@12.3.0` 與 `npm install --save-dev jsdom@^29.1.1`；`package.json` 的 `devDependencies` 恰新增 `"mermaid": "12.3.0"` 與 `"jsdom": "^29.1.1"` 兩行（`dependencies`、`version`、`scripts` 不變）；`package-lock.json` 隨之更新（預期約 +153 個 `packages` 項目）；`npm audit` 0 vulnerabilities；`npm test` 仍全綠
- [ ] T003 新增 `tests/helpers/mermaid.js`（FR-009、G-8、contracts/mermaid-graph.md §2.3「往返解碼」；依賴 T002）：(a) `load()`：在**第一次** `await import('mermaid')` 之前以 jsdom 設定 `global.window`／`global.document`（及 mermaid 需要的其他全域），`mermaid.initialize({startOnLoad: false})`，模組快取；(b) `parse(text)`：回傳 Promise，成功 resolve、語法錯誤或超過 `maxEdges` reject；(c) `diagramOf(text)`：經 `mermaid.mermaidAPI.getDiagramFromText(text)` 取 `db.getVertices()`／`db.getEdges()`，回傳 `{vertices: [{id, label, type}], edges: [{from, to, label}]}`（依 mermaid 回傳順序，保留重複邊），文字經 `decode`；(d) `decode(s)`：`ﬂ°°(\d+)¶ß`→`String.fromCharCode(碼)`、`ﬂ°(\w+)¶ß`→具名實體、`<br>`→`\n`；(e) 全域只在呼叫期間設定、呼叫後還原（或提供 `restore()` 並在每個使用的 describe 的 `after` 呼叫），確保同一 mocha 行程中其他測試看不到 `window`／`document`。以 `node -e` 臨時驗證：`flowchart TD\n  a --> b` 可 parse、`a -->` 被拒、500 邊過／501 邊拒（`Edge limit exceeded`）、`decode('ﬂ°°35¶ß')` 為 `#`；`npm test` 仍全綠（helper 本身的行為由 T009、T013 的測試涵蓋）

**Checkpoint**: devDependency 與 helper 就緒；`npm test`、`npm run lint` 與 T001 相同。

---

## Phase 2: Foundational（標題的單一來源；阻擋 US1、US2）

**Purpose**: 抽出上層模型標題函式（`<n>.md` 標題、總覽連結、`.hierarchy.dot` label 共用；research R2），`.dot` 輸出不變。

- [ ] T004 擴充 `tests/dujs/hierarchydot.js`（FR-001、D001-3；此時應失敗）：`hierarchyTitleOf(model)` 對 inter-procedural 回傳 `inter-procedural: <String(main scope)>`（如 `inter-procedural: $DOMAIN.$PAGE_0.sumAll`）、intra-page 回傳 `intra-page: <String(main scope)>`、inter-page 回傳 `inter-page`；沒有 hierarchy 或未知層級時拋錯（與 `convertHierarchyToDot` 相同訊息）；且 `convertHierarchyToDot(model)` 第三行恰為 `label = "` + `escapeLabel(hierarchyTitleOf(model))` + `"`
- [ ] T005 修改 `lib/dujs/hierarchydot.js`（依賴 T004）：抽出並匯出 `hierarchyTitleOf(model)`，`convertHierarchyToDot` 改用它（輸出 byte 不變）；T004 全綠；golden 不需重產（共通約定的 byte-identical 檢查 exit 0）

**Checkpoint**: `hierarchyTitleOf` 可用；`npm test` 全綠、lint 0、golden 與 `274257a` byte-identical。User story 可開始。

---

## Phase 3: User Story 1 - 每個模型產出可直接閱讀的 Markdown 圖（Priority: P1）🎯 MVP

**Goal**: 每個寫出 `<n>.graph.dot` 的模型同目錄多一份 `<n>.md`（標題 → 階層圖〔上層模型〕→ 扁平圖 → def-use pairs 表格），Mermaid 由同一份記憶體中的 DOT 字串轉出，節點／邊與 `.dot` 一一對應；`.dot`／`.matching.json` 不變（FR-001～FR-010、SC-001～SC-003、SC-006）。

**Independent Test**: `npx mocha tests/dujs/dotreader.js tests/dujs/mermaidgraph.js tests/dujs/markdownoutput.js tests/golden/golden.js`：golden 每個模型都有 `<n>.md`、所有 Mermaid 區塊 parse 通過、Mermaid↔`.dot` 多重集合 0 差異、`.md` 逐字等於 expected、兩次執行 byte-identical；`.dot`／`.matching.json` 與 `274257a` byte-identical。

### Tests for User Story 1（先寫）

- [ ] T006 [P] [US1] 新增 `tests/dujs/dotreader.js`（FR-003、contracts/mermaid-graph.md §1、data-model §1；此時應失敗）：`readDot(text)` 回傳 `{label, nodes: [{id, attrs}], edges: [{from, to, attrs}]}`；`digraph <word> {`、`node [shape="box"]`、`}`、空行略過；`label = "…"` 取為 `label`（已解碼）；節點 `n71 [label="entry_a", shape="ellipse", fillcolor="yellow"]`；邊 `n75 -> n76 [color="blue", label = "call"]`（`=` 兩側空白）與空 `[]`；`<id>` 為 `[A-Za-z_]\w*`（`n<k>`、`h<k>`）；`\"`→`"`、`\\`→`\` 解碼，`\n` 不解碼（原樣保留）；**quote-aware**：`style="bold,dashed"` 一例、標籤含 `]`（及 `,`）一例；重複邊（同對節點多條、含無標籤重複邊）依出現順序保留；方言外的行（如 `subgraph x {`、`a -- b`）與標籤含真換行時拋 `Error` 且訊息含 `unsupported DOT line`；含引號／反斜線的階層標籤經 `hierarchydot.escapeLabel` 寫出再讀回等於原文（R1「標籤還原」不變量）
- [ ] T007 [P] [US1] 新增 `tests/dujs/mermaidgraph.js` 第一部分「文字格式」（FR-002、FR-004、FR-006、contracts/mermaid-graph.md §2；此時應失敗）：`toMermaid(graph)` 首行 `flowchart TD`、其餘縮排兩空白、節點行依 nodes 順序、邊行依 edges 順序；三種形狀：無 `shape` → `id["L"]`、`shape="ellipse"` → `id(["L"])`＋`class … ellipse`、`shape="doublecircle"` → `id((("L")))`＋`class … storage`，其他 `shape` 值拋錯；`classDef ellipse fill:#ffff00,stroke:#333,color:#000`／`classDef storage fill:#ffa500,stroke:#333,color:#000` **僅在有該類節點時**出現；五種邊線型（無 style `-->`、`dotted` `-.->`＋`stroke-dasharray:2 2`、`dashed` `-.->`、`bold` `==>`、`bold,dashed` `-.->`＋`stroke-width:3px`）、`color` → `stroke:<color>`，片段依 `stroke`、`stroke-dasharray`、`stroke-width` 順序、相同樣式合併為一行 `linkStyle i,j,…`、依該樣式第一次出現的邊序；無 `label` 的邊不寫 `|…|`；`quote` 逐字元：`#`→`#35;`（第一個替換）、`"`→`#34;`、`&`→`#38;`、`<`→`#60;`、`>`→`#62;`、`` ` ``→`#96;`、`:`→`#58;`、`%`→`#37;`、`\r`→`#13;`；`$$a$$`→`$#36;a$#36;`、`$$$`→`$#36;#36;`、單一 `$` 不動；`\n`→`<br/>`；首尾空白以 `#<碼>;`；空字串 → `" "`；`[ ] { } ( ) | ;` 原樣；輸出任何位置都不含反引號；同一輸入兩次輸出相同（I3）
- [ ] T008 [US1] 擴充 `tests/dujs/mermaidgraph.js` 第二部分「官方 parser」（同檔，依賴 T007、T003；FR-003、FR-006、FR-009、SC-003）：涵蓋三形狀＋五線型＋classDef／linkStyle 的區塊經 helper `parse` 通過；沒有邊的圖、只有一個節點的圖可 parse（Edge Cases）；**重複邊**：同對節點的多條邊（`true` 與 `exception`、兩條無標籤）經 `toMermaid` → `diagramOf(...).edges` 條數與順序保留；**跳脫往返**：含 FR-006 全部字元（`"`、`&`、`[`、`]`、`{`、`}`、`(`、`)`、`|`、`#`、`<`、`>`、`;`、`` ` ``、換行、首尾空白）與 `:`、`%`、`$DOMAIN.$PAGE_0.f` 的節點與邊標籤，以及 D004-1a 必含案例 `style:#x`、`classDef x:#1`、`%%{init: {}}%%`、含 `\r` 的標籤、`$$a$$`，`diagramOf` 解碼後的 vertex／edge 文字逐一等於原文；空標籤往返為 `""`
- [ ] T009 [US1] 擴充 `tests/dujs/mermaidgraph.js` 第三部分「降級邊界」（同檔，依賴 T008；FR-010、data-model §2、contracts/mermaid-graph.md §3）：匯出常數 `MAX_EDGES === 500`、`MAX_TEXT_SIZE === 50000`（模組不 require `mermaid`）；`renderGraph(graph, dotFileName)` 回傳 `{mermaid, edgeCount, textSize, degraded, markdown}`；合成圖：500 邊 → 不降級且其區塊 helper `parse` 通過、501 邊 → 降級；以長標籤調整到 `textSize` **恰為** 50000（斷言之）→ 不降級、恰為 50001 → 降級；降級 `markdown` 逐字符合 §3：提示句（含 `<E>`、`<C>`、`[`<n>.<kind>.dot`](<n>.<kind>.dot)`，`<kind>` 為 `graph`／`hierarchy`）、節點表 `| Node | Label |`（依 nodes 順序）、邊表 `| From | To | Label |`（依 edges 順序含重複邊、無標籤邊 Label 欄為空），儲存格依 model-markdown.md §3；未降級 `markdown` 為 ` ```mermaid ` fence＋區塊＋結尾 fence
- [ ] T010 [P] [US1] 新增 `tests/dujs/markdownoutput.js`（FR-001、FR-005、FR-007、FR-010、contracts/model-markdown.md；此時應失敗；模型以 `tests/helpers/analyze.js` 建立）：`codeSpan`：反引號長度 = max(1, 最長連續反引號 + 1)、首尾為反引號或空白時兩側補一空白、空字串不輸出 code span；`cell(pieces)`：依 `\n` 拆段、各段 code span、`<br/>` 連接、整格 `|`→`\|`；`modelTitleOf(model, level)`：intra-procedural＝`intra-procedural: ` + `String(model.mainlyRelatedScope)`（如 `intra-procedural: $DOMAIN.$PAGE_0.add`）、其他三層＝`hierarchyTitleOf(model)`；`modelMarkdown(model, level, {graphDot, hierarchyDot})`：首行 ``# `<title>` ``、區段順序 `## Hierarchy`（僅上層模型）→ `## Graph` → `## Def-use pairs`、區段間一個空行、結尾恰一個 `\n`；def-use 表固定兩欄 `| Variable | Def-Use pairs |`：無 entry 只有表頭兩行、有 entry 無 pair 第二欄為空、同名變數多列各自保留且依 Map 順序、pair 含逗號（`(entry_b,(8,9))`）原樣、`$DOMAIN.$PAGE_0` 以 code span 包住、`|` 跳脫；變數名與 pair 文字與同模型 `graphics.convertDUPairsToDot` 相同；同檔兩張圖一張降級（合成 `hierarchyDot` 501 邊）時另一張仍為 Mermaid；同輸入兩次輸出 byte-identical；另斷言 `lib/dujs/markdownoutput.js` 原始碼不含 `.name` 讀取（D004-1b），且 `tests/dujs/scopesource.js` 不改 `S5_ALLOWED` 即通過
- [ ] T011 [US1] 在 `tests/helpers/mermaid.js` 新增測試端的獨立事實讀取（依賴 T003；SC-003、plan「測試策略」golden 列）：`dotFactsOf(dotText)` 以**獨立的簡易 regex**（不 require `lib/dujs/dotreader.js`）取節點 (id, label) 多重集合、邊 (from, to, label) 多重集合、`shape` 計數（box／ellipse／doublecircle）；`mermaidFactsOf(text)` 由 `diagramOf` 取同樣三項（形狀依 vertex `type`：square／stadium／doublecircle）；`mermaidBlocksOf(markdown)` 取出所有 ` ```mermaid ` 區塊
- [ ] T012 [US1] 修改 `tests/golden/golden.js`（FR-007、FR-008、FR-009、FR-009a、SC-001～SC-003、SC-006；依賴 T011；此時應失敗）：`listDotFiles` 改為 `listGoldenFiles`（`.dot`、`.matching.json`、`.md`），UPDATE_GOLDEN 複製範圍隨之擴及 `.md`；「same set」「identical contents」「adds exactly the listed new files」三個測試改用 `listGoldenFiles`（標題去掉 `.dot` 字樣）；`keeps every baseline .dot file byte-identical` 不變；新增：(a) 每個 `<n>.graph.dot` 有同目錄 `<n>.md`、沒有多餘的 `<n>.md`；(b) 所有 `.md` 的 Mermaid 區塊 helper `parse` 通過；(c) 每個 `<n>.md` 的 Hierarchy／Graph 區塊（未降級者）`mermaidFactsOf` ＝ 同模型 `<n>.hierarchy.dot`／`<n>.graph.dot` 的 `dotFactsOf`（節點、邊多重集合與形狀計數，0 差異）；(d) 每張圖邊數 ≤ 500 且區塊字元數 ≤ 50000，否則該處必須是降級表格；(e) 確定性：同一 fixture 在第二個暫存工作目錄再跑一次 CLI，所有 `.md` byte-identical（不含輸出目錄名稱）；報告順序測試（L189-222）暫不動（US2 取代）

### Implementation for User Story 1

- [ ] T013 [P] [US1] 新增 `lib/dujs/dotreader.js`（MIT 檔頭；contracts/mermaid-graph.md §1）：`readDot(text)`，逐行判定、quote-aware 屬性解析、`\"`／`\\` 解碼、方言外行拋 `Error('unsupported DOT line: …')`；T006 全綠
- [ ] T014 [P] [US1] 新增 `lib/dujs/mermaidgraph.js`（MIT 檔頭；contracts/mermaid-graph.md §2、§3）：`toMermaid(graph)`、`renderGraph(graph, dotFileName)`、`MAX_EDGES = 500`、`MAX_TEXT_SIZE = 50000`（不 require `mermaid`，FR-014）；`textSize` 為 `toMermaid(graph).length`（含 classDef／class／linkStyle 行、不含 fence）；降級表格的儲存格規則與 `markdownoutput` 共用（`codeSpan`／`cell` 放在本模組或 `markdownoutput.js` 擇一並由另一方 require，避免循環 require）；T007–T009 全綠
- [ ] T015 [US1] 新增 `lib/dujs/markdownoutput.js`（MIT 檔頭；依賴 T005、T013、T014；contracts/model-markdown.md）：`codeSpan`、`cell`、`modelTitleOf(model, level)`、`modelMarkdown(model, level, {graphDot, hierarchyDot})`（`readDot` → `renderGraph`；def-use 表由 `model.dupairs`，變數名 `String(key)`、pair `'' + pair`，不讀 `<x>.name`）；T010 全綠、`tests/dujs/scopesource.js` 全綠
- [ ] T016 [US1] 修改 `lib/dujs/outputwriter.js`（依賴 T015；contracts/model-markdown.md §1、plan「架構」）：四個 `write*AnalysisResultFiles` 在寫出 `<n>.graph.dot`、`<n>.dupairs.dot`、（上層）`<n>.hierarchy.dot`、（上層）`<n>.matching.json` 之後寫 `<n>.md`（UTF-8、LF），Markdown 由**同一份記憶體中的 DOT 字串**產生（`writeDOTRepresentationFileFor*` 改為同時回傳 DOT 字串或拆出字串產生步驟，寫出的 bytes 不變）；inter-page 寫 `inter-page/0.md`；PNG 與 `*ImageFilePaths` 本階段保留（US3 移除）；`npx mocha tests/golden/golden.js` 中 T012 (a)–(e) 以外仍綠
- [ ] T017 [US1] golden 重產與 manifest（依賴 T016；FR-008、FR-009a、G-9、SC-001）：依「共通約定」`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js`——預期**只新增** 62 個 `<n>.md`（四個 `tests/golden/expected*/`），`git status --porcelain -- tests/golden/expected*` 沒有任何 `M`／`D`、`git diff --quiet 274257a -- 'tests/golden/expected*/**/*.dot' 'tests/golden/expected*/**/*.matching.json'` exit 0（若有任何 `.dot`／`.matching.json` 變動即停止並回報）；人工審閱每層級至少一份 `.md`（標題、區段順序、表格）；手動把各 fixture 的新 `.md` 檔名加入 `tests/golden/manifest.json` 的 `added`（`baseline` 不變）；T012 全綠
- [ ] T018 [US1] US1 階段檢查：`npm test` 全綠（passing 數 ≥ T001＋新增）、`npm run lint` 0 錯誤、共通約定的 byte-identical 檢查；`git -C <root> diff --stat 274257a -- lib` 只有 `lib/dujs/hierarchydot.js`、`lib/dujs/outputwriter.js` 與三個新檔；`grep -n "esgraph/dot" lib/dujs/dotreader.js lib/dujs/mermaidgraph.js lib/dujs/markdownoutput.js` 無輸出

**Checkpoint**: US1 完成——每個模型有 `<n>.md`，Mermaid 全數 parse、與 `.dot` 0 差異；`.dot`／`.matching.json` byte-identical；manifest 只新增 `added`。`.md` 與 `.png`／`report.html` 並存（可獨立交付）。

---

## Phase 4: User Story 2 - 一份總覽串起所有模型（Priority: P2）

**Goal**: 輸出目錄根寫總覽 `README.md`（每頁 Source code → Intra-procedural → Inter-procedural → Intra-page，最後 Inter-page），取代 `report.html`；移除 `reportgenerator.js` 與 spec A7 中屬報告的連帶項（FR-011、FR-012、SC-005、A2、A7）。依賴 US1。

**Independent Test**: `npx mocha tests/dujs/markdownoutput.js tests/dujs/cli.js tests/golden/golden.js`：總覽連結 100% 指向存在的 `.md`、順序符合 contracts/overview-readme.md §2；不產生 `report.html`。

### Tests for User Story 2（先寫）

- [ ] T019 [P] [US2] 擴充 `tests/dujs/markdownoutput.js`（FR-011、A2、contracts/overview-readme.md §2；此時應失敗）：`overviewMarkdown(pages)` 逐字符合 §2：`# dujs analysis results`＋說明段、`## Page <p>`（依 index 遞增）下 `### Source code`（連結 ``[`page<p>/src.js`](page<p>/src.js)``＋原始碼 fence）、`### Intra-procedural`、`### Inter-procedural`、`### Intra-page`，最後 `## Inter-page`；各層依模型編號遞增、連結文字 `codeSpan(modelTitleOf(...))`、目的地為相對 POSIX 路徑且不含輸出目錄名稱；某層無模型寫 `None.`；fence 長度：原始碼無反引號 → 3、含 ```` ``` ```` → 4、含 5 個連續反引號 → 6；原始碼不以 `\n` 結尾時補一個；原始碼原樣不跳脫；檔尾恰一個 `\n`
- [ ] T020 [P] [US2] 修改 `tests/dujs/cli.js`（FR-012、A7；此時應失敗）：移除 L21 `reportGenerator` require；L289-324 的 `describe('report.html')`（含 12 個陣列覆寫）改為 `describe('README.md (overview)')`：在 `base` 已存在時 `writeOverview` 寫進實際目錄 `base_1`（`base` 下沒有 `README.md`）、內容的連結不含目錄名；L423（US5-5）改為 `files.should.containEql('README.md')` 且 `files.should.not.containEql('report.html')`；L485-489（US5-4 並行）改為每個目錄都有 `README.md`、各目錄的 `README.md` 內容相同（不含目錄名）
- [ ] T021 [P] [US2] 修改 `tests/golden/golden.js`（FR-011、FR-012、SC-005、contracts/overview-readme.md §3；此時應失敗）：刪除 `reportImagePaths` 與報告順序測試（L69-121、L189-222）；新增：輸出目錄根有 `README.md`、沒有 `report.html`；所有 `](…)` 目的地都存在（SC-005）；連結序列等於依 §2 規則由輸出目錄 `*.md` 推得的序列（第一個連結為 `page0/src.js`）；每個 `<n>.graph.dot` 的 `<n>.md` 恰被連到一次、沒有多餘連結

### Implementation for User Story 2

- [ ] T022 [US2] 修改 `lib/dujs/markdownoutput.js` 與 `lib/dujs/outputwriter.js`（依賴 T019；research R7、data-model §4）：`markdownoutput.overviewMarkdown(pages)`；`OutputWriter.prototype.writeOverview(sourceContents)` 依 `scopeCtrl.pageScopeTrees` × `modelCtrl.getPageModels(...)` 三陣列＋`modelCtrl.interPageModel` 列舉（與寫模型檔同序同編號）、原始碼取自 `sourceContents`，寫 `<ROOT_OUTPUT_DIR>/README.md`；移除只供報告使用的 `pageJSSourFilePaths` 屬性與 `writeCombinedJSSource` 中的賦值（`src.js` 照常寫出）；T019 全綠
- [ ] T023 [US2] 修改 `lib/dujs/cli.js`、刪除 `lib/dujs/reportgenerator.js`（依賴 T022；FR-012、A7）：移除 L22 `reportGenerator` require，L215 `reportGenerator.createReport()` 改為 `outputWriter.writeOverview(sourceContents)`（失敗時沿用既有的刪除輸出目錄流程，G-2）；`git rm lib/dujs/reportgenerator.js`；執行 `npx eslint . --prune-suppressions`，`git diff -- eslint-suppressions.json` 只移除 `lib/dujs/reportgenerator.js` 鍵；T020 全綠
- [ ] T024 [US2] golden 重產與 manifest（依賴 T023）：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js`——預期只新增四個 `tests/golden/expected*/README.md`；共通約定的 byte-identical 檢查；人工審閱四份總覽（原始碼 fence、順序、`None.`）；manifest 各 fixture `added` 加入 `README.md`；T021 全綠
- [ ] T025 [US2] US2 階段檢查：`npm test` 全綠、`npm run lint` 0 錯誤、byte-identical 檢查；`grep -rn "reportgenerator\|reportGenerator\|report\.html\|pageJSSourFilePaths" lib bin tests --exclude-dir=expected*` 無輸出（README 與舊契約的敘述屬 US3）

**Checkpoint**: US2 完成——總覽 `README.md` 取代 `report.html`，`reportgenerator.js` 已刪；PNG 仍可能產生（US3 收尾）。

---

## Phase 5: User Story 3 - 安裝與執行不再需要 Graphviz（Priority: P3）

**Goal**: 移除 Graphviz 呼叫、`.png` 與所有 PNG 路徑狀態；README 的 Requirements／Usage／golden 敘述改寫（contracts/docs-split.md §1）；舊契約標 superseded（FR-012、FR-013、FR-015、SC-004、A3、A7）。依賴 US2。

**Independent Test**: `npx mocha tests/dujs/cli.js tests/golden/golden.js`：`lib/` 不含 `child_process`、一般與清空 `PATH` 下皆 0 個 `.png`、exit 0、stderr 空、`.dot` 與 `.md` 照常產生；`grep -n Graphviz README.md` 只剩輸出變更註記。

### Tests for User Story 3（先寫；紅燈依據見檔頭「紅燈先行註記」）

- [ ] T026 [US3] 擴充 `tests/dujs/cli.js`（FR-013、SC-004、US3 情境 1–3）：(a) **靜態檢查（紅燈依據）**：掃描 `lib/**/*.js` 與 `bin/dujs.js` 原始碼不含 `child_process`、`spawnSync`、`execSync`、`execFile`（此時因 `lib/dujs/outputwriter.js:6` 應失敗）；(b) 一般 `PATH` 跑 `bin/dujs.js` 後輸出目錄 0 個 `.png`（本機有 Graphviz 時此時應失敗；無 Graphviz 的環境會直接通過，**不作為可攜的紅燈依據**）；(c) `PATH` 只含 `path.dirname(process.execPath)` 的 env 跑 `bin/dujs.js`：exit 0、stderr 空、0 個 `.png`、每個 `<n>.graph.dot` 有 `<n>.md`、有 `README.md`（**此項 US3 前即通過，不當紅燈依據**）；(d) `outputWriter._testonly_` 沒有 `_writeImageFileFromDotFile`、`OutputWriter.prototype` 沒有任何名稱符合 `/ImageFilePaths$|DUPairsmageFilePaths$/` 的屬性（此時應失敗）
- [ ] T027 [P] [US3] 擴充 `tests/golden/golden.js`（FR-013、US3 情境 3）：每個 fixture 的輸出目錄 0 個 `.png`（本機有 Graphviz 時此時應失敗）且 `.dot` 照常產生（已由檔案集合測試涵蓋，於此 `it` 的訊息註明）

### Implementation for User Story 3

- [ ] T028 [US3] 修改 `lib/dujs/outputwriter.js`（依賴 T026；FR-013、data-model §5、A7）：移除 `spawnSync = require('child_process').spawnSync`、`writeImageFileFromDotFile`、`_testonly_._writeImageFileFromDotFile`、12 個 `*ImageFilePaths` 屬性（含 `intraPageDUPairsmageFilePaths` 拼字錯誤項）與四個 `write*AnalysisResultFiles` 中對它們的所有賦值；`.dot`／`.md` 寫出不變；T026、T027 全綠
- [ ] T029 [P] [US3] 修改 `README.md`（FR-012、FR-015、contracts/docs-split.md §1；仍是單一 README，不拆分）：Requirements L9 Graphviz 項刪除，改為「檢視輸出需支援 Mermaid 的 Markdown 檢視器（GitHub、VS Code 等）；`out-*/` 被 `.gitignore` 排除、請在本機檢視器開啟」；L37「referred to in the HTML report before the flat graph」改為「shown before the flat graph in the model Markdown `<k>.md`」並寫明 golden 比對包含 `.md`、manifest `added` 收錄 `.md` 檔名；Usage L77-78「The `.png` files are drawn … Graphviz `dot`.」改為模型 `<n>.md`（標題、階層圖、扁平圖、def-use pairs）與輸出目錄根 `README.md` 總覽、超過 500 邊或 50,000 字元的圖改以表格並指向 `.dot`；新增一段「輸出變更」註記：自本版起不再產生 `report.html` 與 `.png`、不需 Graphviz，改看 `README.md` 與 `<n>.md`（`package.json` 版本號不改）；完成後 `grep -n "Graphviz\|\.png\|HTML report\|report\.html" README.md` 只命中該註記段
- [ ] T030 [P] [US3] 舊契約標註（A7、plan「舊契約標註」）：`specs/003-hierarchical-models/contracts/hierarchy-output.md` §4 契約 #5 標題後加 `> Superseded by specs/009-mermaid-markdown-output（report.html 移除；順序改由 contracts/overview-readme.md 與 model-markdown.md 規定）`；`specs/004-fix-remaining-issues/contracts/cli.md` §2 第 4 步、§3 的 `reportgenerator`／`report.html` 敘述、§4 US5-4 的 report 引用各加 superseded 註記（註明輸出目錄唯一化本身仍有效）；只加註記、不改原文
- [ ] T031 [US3] US3 階段檢查：`npm test` 全綠、`npm run lint` 0 錯誤、byte-identical 檢查；`grep -rn "child_process" lib bin` 無輸出；依 `specs/009-mermaid-markdown-output/quickstart.md` §2 以 `PATH=/usr/bin:/bin` 手動跑兩頁 fixture：exit 0、stderr 空、`ls out-*/` 有 `README.md`、無 `report.html`、`find out-* -name '*.png' | wc -l` 為 0（跑完刪除暫存目錄）

**Checkpoint**: US3 完成——dujs 不呼叫任何外部程式、不產生 `.png`；README 不再要求 Graphviz；舊契約已標 superseded。

---

## Phase 6: User Story 4 - README 精簡為概覽，詳細說明拆成章節檔（Priority: P4）

**Goal**: 依 D003 定案清單（contracts/docs-split.md §2）把 README 拆成 `docs/usage.md`、`docs/output-format.md`、`docs/limitations.md`、`docs/development.md`，README 保留概覽並新增 `## Background`；對照表＋腳本證明內容不遺失；標題與連結測試併入 `npm test`（FR-017～FR-019、SC-007、D002、D003、D004-3）。依賴 US3。

**Independent Test**: `node specs/009-mermaid-markdown-output/tools/readmecheck.js specs/009-mermaid-markdown-output/readme-map.md` exit 0；`npx mocha tests/docs/links.js` 全綠（含 Background 三項逐字字串）。

### Tests for User Story 4（先寫）

- [ ] T032 [US4] 新增 `tests/docs/links.js`，並把 `package.json` 的 `test` script 加上 `"tests/docs/*.js"`（FR-019、SC-007、D003、D004-3、contracts/docs-split.md §4；此時應失敗：README 有 `#dujs`、`##Goal`、`##Limits`、`##Demo`，且無 `## Background`）：只掃根 `README.md` 與 `docs/*.md`（不遞迴：不含 `docs/research/**`、`tests/golden/expected*/README.md`）；每個 ATX 標題符合 `^#{1,6} \S`（fenced code 內不檢查；**`docs/known-issues.md` 不做標題檢查**，連結仍檢查）；每個相對連結 `](path[#anchor])` 指向存在的檔案，有 `#anchor` 時目標檔有對應 GitHub slug 的標題；不檢查 `http(s)` 連結；**Background 斷言**：根 `README.md` 有 `## Background` 標題，且該節逐字含 `JavaScript網頁應用程式資料流測試模型之研究`、`A Study on Dataflow Testing Model of JavaScript Web Applications`、`https://hdl.handle.net/11296/u8f5n6`，`## Background` 緊接在 `## Goal` 節之後
- [ ] T033 [P] [US4] 新增 `specs/009-mermaid-markdown-output/tools/readmecheck.js`（不進 `npm test`；FR-018、contracts/docs-split.md §3、research R9）：`git -C <root> show 274257a:README.md` 取原文、以空行切段（`<ul>` 中每個 `<li>`〔含巢狀〕各算一段）；讀對照表 `readme-map.md`；每段恰有一列（ID＝段序號）；`搬移` 段正規化（去 Markdown／HTML 標記、實體還原、合併空白）後為新位置檔案該標題下正規化文字的子字串；`改寫` 段理由欄非空且新位置標題存在；`新增` 列（`N1`）只檢查新位置該標題下存在三項逐字字串；exit 0 全通過、1 有段未對應／未找到、2 用法錯誤；逐段輸出結果。此時對尚不存在的對照表執行應為 exit 1 或 2

### Implementation for User Story 4

- [ ] T034 [US4] 新增 `docs/usage.md`（`# Usage`）、`docs/output-format.md`（`# Output format`）、`docs/limitations.md`（`# Supported syntax and limitations`）、`docs/development.md`（`# Development`）（FR-017、FR-019、contracts/docs-split.md §2）：內容依 §2 表搬移自 T029 後的 README——usage：CLI 完整說明（`-js` 分頁、`--`、`-h`）、輸出目錄命名與 `_<n>`、Exit status；output-format：各輸出檔（`.dot`、`<n>.md`、總覽 `README.md`、降級表格、檢視方式）、`<n>.matching.json`、finallyExit 與 finally 邊、節點標籤、呼叫分段（feature 007）；limitations：Supported syntax、Limits（`<ul>/<li>` 改 Markdown 清單且巢狀保留層級、`<code>`→反引號、`&amp;` 等實體還原），known-issues 連結改相對路徑 `known-issues.md`；development：golden 說明、`manifest.json`（`baseline`／`added`，含 `.md`）、`UPDATE_GOLDEN=1`、ESLint bulk suppressions；所有標題 `#`／`##` 後一個空格
- [ ] T035 [US4] 改寫 `README.md`（依賴 T034；FR-017、FR-019、D003、US4 情境 1、4）：`# dujs`、`## Goal`、`## Background`（一兩句註明此 repo 緣起自作者的論文，逐字含中文標題 `JavaScript網頁應用程式資料流測試模型之研究`、英文標題 `A Study on Dataflow Testing Model of JavaScript Web Applications` 與臺北科技大學博碩士論文系統網址 `https://hdl.handle.net/11296/u8f5n6`，不得改寫、翻譯或增減空白）、`## Requirements`、`## Dependency`、`## Setup`（僅指令區塊）、`## Usage`（用法區塊＋一個範例＋連到 `docs/usage.md`）、`## Output`（一兩句概述＋T029 的「輸出變更」註記〔FR-012 要求 README 註明〕＋連到 `docs/output-format.md`）、`## Demo`、`## SDD 導入宣告`、`## License`（後兩者原文保留），另列 `docs/` 各章節檔連結並保留一個 `docs/known-issues.md` 連結；T032 全綠
- [ ] T036 [US4] 新增 `specs/009-mermaid-markdown-output/readme-map.md`（依賴 T033–T035；FR-018、contracts/docs-split.md §3）：表格欄 `ID | 原段落（首句摘錄） | 新位置（檔案 + 標題） | 處置 | 理由`，涵蓋 `274257a` README 的每一段（依 T033 的切段定義）；處置 `搬移`／`改寫`／`新增`，`改寫` 必填理由（如「Graphviz／PNG 移除（FR-013）」「HTML 報告移除（FR-012）」「HTML 清單改 Markdown（US4 情境 2）」）；另一列 `N1`：原段落欄記三項逐字字串、新位置 `README.md` + `## Background`、處置 `新增`、理由「新增（使用者 D003）」；`node specs/009-mermaid-markdown-output/tools/readmecheck.js specs/009-mermaid-markdown-output/readme-map.md` exit 0
- [ ] T037 [US4] US4 階段檢查：`npm test` 全綠（確認 mocha 輸出含 `tests/docs/links.js` 的測試）、`npm run lint` 0 錯誤（含 `tests/docs/links.js`、`specs/009-mermaid-markdown-output/tools/readmecheck.js`）、byte-identical 檢查；readmecheck exit 0；`git -C <root> diff --quiet 274257a -- docs/known-issues.md` exit 0

**Checkpoint**: US4 完成——README 精簡、`## Background` 就位、四個章節檔、對照表與檢查通過（SC-007）、`tests/docs/links.js` 已在 `npm test` 中。

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T038 lint 與 suppressions：`npm run lint` 0 錯誤；`npx eslint . --prune-suppressions` 後 `eslint-suppressions.json` 無進一步變更，且 `git diff 274257a -- eslint-suppressions.json` 只有移除 `lib/dujs/reportgenerator.js` 鍵（§GV-3）
- [ ] T039 [P] coverage：`npm run coverage`，檢視 `lib/dujs/dotreader.js`、`lib/dujs/mermaidgraph.js`、`lib/dujs/markdownoutput.js` 與 `lib/dujs/outputwriter.js` 變更部分的行／分支覆蓋；未覆蓋的分支補測試到對應的 `tests/dujs/{dotreader,mermaidgraph,markdownoutput}.js`，或在回報中逐一說明不補的理由（§CP-4）
- [ ] T040 [P] 新增 `specs/009-mermaid-markdown-output/tools/mdncheck.js`（不進 `npm test`；FR-016、research R8）：對 `specs/006-eslint-scope/mdn/pages.json` 每個 id 以 `specs/006-eslint-scope/mdn/corpus/` 的檔案、`PATH` 去除 Graphviz 的 env 跑 `bin/dujs.js`；以 `git worktree` 在 session 暫存目錄 checkout `274257a` 跑同一輸入作基準（結束時移除 worktree）；檢查 exit 0、stderr 空、無 `.png`、無 `report.html`、每個 `.graph.dot` 有同編號 `.md`、`README.md` 連結全部可達、每個 Mermaid 區塊 parse 通過、每張圖邊數 ≤ 500 且字元數 ≤ 50000（否則必須為降級表格）、Mermaid↔`.dot` 多重集合相同、所有 `.dot`／`.matching.json` 與基準 byte-identical；parse 與事實讀取 require `tests/helpers/mermaid.js`；`--report` 寫 `specs/009-mermaid-markdown-output/mdn-check.md`（每 id 一列：模型數、圖數、最大邊數、最大字元數、降級數、結果，另記基準 commit 與總計）、`--verify <file>` 重跑核對（不符 exit 1）
- [ ] T041 MDN 語料驗收（依賴 T040；FR-016、SC-002、SC-003）：`node specs/009-mermaid-markdown-output/tools/mdncheck.js --report` 產生 `specs/009-mermaid-markdown-output/mdn-check.md`，`--verify specs/009-mermaid-markdown-output/mdn-check.md` exit 0；預期 32 個 id 全 exit 0、281 張圖全部 parse、0 張降級、最大為 a05 `inter-page/0` 200 邊／約 7,411 字元、`.dot`／`.matching.json` 0 差異；數字與 research R5 不符時於 `mdn-check.md` 註明實測值與原因
- [ ] T042 執行 `specs/009-mermaid-markdown-output/quickstart.md` 全流程（§1–§4）：`npm test`、`npm run lint`、§2 手動跑（`PATH=/usr/bin:/bin`，VS Code 或其他 Mermaid 檢視器開 `out-*/README.md` 抽看一份上層模型 `<n>.md` 的圖可渲染）、§3 mdncheck `--verify`、§4 readmecheck 與 `npx mocha tests/docs/links.js`；結果回報主對話
- [ ] T043 最終 byte-identical 與範圍確認（SC-001、FR-008、plan「影響範圍宣告」）：`git -C <root> diff --quiet 274257a -- 'tests/golden/expected*/**/*.dot' 'tests/golden/expected*/**/*.matching.json'` exit 0；`git diff 274257a -- tests/golden/manifest.json` 只有 `added` 中新增的 `.md`／`README.md` 行；`git diff --quiet 274257a -- lib/esgraph lib/analyses lib/dujs/graphics.js lib/dujs/cfggraphconverter.js LICENSE LICENSES THIRD_PARTY_NOTICES.md docs/known-issues.md` exit 0；`git diff --stat 274257a -- lib` 只有新增 `dotreader.js`、`mermaidgraph.js`、`markdownoutput.js`，修改 `outputwriter.js`、`cli.js`、`hierarchydot.js`，刪除 `reportgenerator.js`；`package.json` 的 `version` 仍為 `1.1.0`、`dependencies` 不變
- [ ] T044 known-issues 新發現（若有）：實作與驗收中若發現新的已知問題（例如特定檢視器的 Mermaid 渲染限制、plan「有意的取捨與已知限制」以外的情形），因 plan 宣告 `docs/known-issues.md` 不受影響，**先發 DECISION**，裁決同意後才寫入 `docs/known-issues.md`（並重跑 `npx mocha tests/docs/links.js`）；沒有新發現則於回報中註明「無」

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**：T001 最先；T002 → T003。
- **Foundational（Phase 2）**：依賴 Setup；T004 → T005；阻擋 US1（`modelTitleOf`）與 US2（總覽連結文字）。
- **US1（Phase 3）**：依賴 Foundational。
- **US2（Phase 4）**：依賴 US1（`<n>.md` 為連結目標、`markdownoutput.js` 已存在）。
- **US3（Phase 5）**：依賴 US2（報告移除後 PNG 路徑屬性才沒有讀者）。
- **US4（Phase 6）**：依賴 US3（README 先改 Graphviz／PNG 敘述再拆）。
- **Polish（Phase 7）**：依賴 US4；T040 → T041；T042、T043 在 T041 後；T044 最後。

### Within Each Phase

- US1：T006 ∥ T007 ∥ T010；T007 → T008 → T009（同檔依序）；T003 → T011 → T012；T006 → T013、T009 → T014（T013 ∥ T014）；{T005, T013, T014, T010} → T015 → T016 → T017 → T018。
- US2：T019 ∥ T020 ∥ T021 → T022 → T023 → T024 → T025。
- US3：T026 ∥ T027 → T028；T029 ∥ T030（可與 T026–T028 並行）；全部 → T031。
- US4：T032 ∥ T033 → T034 → T035 → T036 → T037。
- Polish：T038 ∥ T039 ∥ T040 → T041 → T042 → T043 → T044。

### Parallel Opportunities

- US1：`tests/dujs/dotreader.js`（T006）、`tests/dujs/mermaidgraph.js`（T007）、`tests/dujs/markdownoutput.js`（T010）；`lib/dujs/dotreader.js`（T013）∥ `lib/dujs/mermaidgraph.js`（T014）。
- US2：T019、T020、T021（三個不同測試檔）。
- US3：T027（golden）與 T029（README）、T030（舊契約）。
- US4：T032（links 測試）∥ T033（readmecheck）。
- Polish：T038、T039、T040。

## Parallel Example: User Story 1

```text
T006 tests/dujs/dotreader.js        ∥ T007 tests/dujs/mermaidgraph.js（第一部分） ∥ T010 tests/dujs/markdownoutput.js
T013 lib/dujs/dotreader.js           ∥ T014 lib/dujs/mermaidgraph.js
T015 lib/dujs/markdownoutput.js → T016 lib/dujs/outputwriter.js → T017 golden 重產
```

## Implementation Strategy

- **MVP**：Setup → Foundational → US1（每個模型的 `<n>.md`，與既有 `.png`／`report.html` 並存，可獨立交付）。
- **增量**：US2（總覽取代 `report.html`）→ US3（移除 Graphviz／PNG＋README 改寫）→ US4（README 拆分）→ Polish（lint、coverage、MDN 驗收、quickstart、最終 byte-identical）。每階段依「共通約定」的階段檢查通過後才 commit。

## FR／SC 對照

| 需求 | 任務 |
|------|------|
| FR-001 標題 | T004、T005、T010、T015 |
| FR-002 `flowchart TD` | T007、T014 |
| FR-003 id／標籤／多重集合 | T006、T008、T011、T012、T013 |
| FR-004 形狀／樣式 | T007、T014 |
| FR-005 def-use 表格 | T010、T015 |
| FR-006 跳脫 | T007、T008、T014 |
| FR-007／SC-006 確定性 | T007、T010、T012 (e) |
| FR-008／SC-001 `.dot` byte-identical | 共通約定、T017、T024、T043 |
| FR-009／SC-002／SC-003 parser 與對應 | T003、T008、T011、T012、T041 |
| FR-009a golden 擴及 `.md` | T012、T017、T024 |
| FR-010 降級 | T009、T010、T012 (d)、T014 |
| FR-011／SC-005 總覽 | T019、T021、T022、T024 |
| FR-012 移除 `report.html` | T020、T021、T023、T025、T029、T030 |
| FR-013／SC-004 無 Graphviz／PNG | T026、T027、T028、T031 |
| FR-014 不新增執行期相依 | T002、T014、T043 |
| FR-015 README 更新 | T029、T034 |
| FR-016 MDN | T040、T041 |
| FR-017～FR-019／SC-007 README 拆分 | T032～T037 |

## 任務數

Setup 3（T001–T003）、Foundational 2（T004–T005）、US1 13（T006–T018）、US2 7（T019–T025）、US3 6（T026–T031）、US4 6（T032–T037）、Polish 7（T038–T044），合計 44。
