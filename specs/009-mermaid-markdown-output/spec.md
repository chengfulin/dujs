# Feature Specification: 以 Markdown + Mermaid 取代 Graphviz 圖檔輸出

**Feature Branch**: `009-mermaid-markdown-output`

**Created**: 2026-11-18

**Status**: Draft（D001 已裁決；D002 使用者追加 US4；D003 已確認；D004 plan 閘門已裁決）

**Input**: User description: "將模型匯出資訊改為以 JS（npm 工具鏈：dujs 自身程式碼，必要時加 npm 套件）產出 Markdown 檔，CFG 等圖表以 Mermaid 語法定義，取代 Graphviz PNG。上游需求來源：`.specify/context/mermaid-markdown-output/v1/`。技術選型維持 repo 現有（Node ≥ 24、CommonJS、mocha + should、eslint、c8、npm）。本 feature 純輸出層：不得改變任何分析結果；既有 golden `.dot` 必須 byte-identical，新檔加入 `tests/golden/manifest.json`。實作完成後以 MDN 範例語料驗證全數可產出可解析的 Markdown。"

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| REQ | `.specify/context/mermaid-markdown-output/v1/requirements.md`（索引：同目錄 `index.md`） | §1 目的、§2 範圍 S1–S5、§3 非目標、§4 待決 Q1–Q6、§5 驗收觀點 |
| USR | 本 feature 的需求描述（2026-11-18，見上方 Input） | 技術選型、`.dot` byte-identical、manifest、MDN 驗收 |
| USR2 | 使用者追加需求（2026-11-18，主 session 轉達；D002） | README 精簡與章節檔拆分（US4） |
| CODE | 目前 `develop`（`274257a`）的輸出程式：`lib/dujs/outputwriter.js`、`lib/dujs/reportgenerator.js`、`lib/dujs/graphics.js`、`lib/dujs/hierarchydot.js`、`lib/esgraph/dot.js` | 目前輸出的檔案、標籤與樣式（現況事實，非需求） |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | REQ §1、§2 S1、S2、S5；§3；§4 Q3、Q5、Q6；§5 第 2、3 點 |
| US2 | REQ §2 S3；§4 Q2、Q4 |
| US3 | REQ §1 第 1、2 點；§2 S4；§4 Q1；§5 第 1 點 |
| US4 | USR2 |

### 現況（CODE，`develop` 274257a）

- 每個模型寫出 `<n>.graph.dot`（扁平敘述層級圖，節點 `n<k>`，標籤為行號＋分支路徑，如 `18a`、`call (19)`、`entry_a`）、`<n>.dupairs.dot`（以 Graphviz HTML-like 表格表示的 def-use pairs，不是圖）；inter-procedural／intra-page／inter-page 另有 `<n>.hierarchy.dot`（節點 `h<k>`，邊 `call`、`return`、`recursive call`、`recursive return`、`loop`、`onEvent`、`loadStorage`、`saveStorage`；**沒有** cluster／subgraph）與 `<n>.matching.json`。
- 每個 `.dot` 由 `outputwriter.js` `writeImageFileFromDotFile` 以 `spawnSync('dot', …)` 轉成同名 `.png`；未安裝 Graphviz 時靜默失敗。
- `report.html` 以 `<img src="../<out>/….png">` 依「每頁：intra-procedural → inter-procedural → intra-page，再 inter-page；上層模型先 hierarchy 再 graph 再 dupairs」排列，並從 CDN 載入 Bootstrap／jQuery。
- golden 測試（`tests/golden/golden.js`）比對 `.dot` 與 `.matching.json`；另有一個測試檢查 `report.html` 中 `.png` 的引用順序（不需 Graphviz）。MDN 語料（`specs/006-eslint-scope/mdn/corpus`，33 檔、32 個 id）目前（`274257a`，plan 階段實測）最大的圖為 a05 `inter-page/0.graph.dot`：200 條邊、11,580 bytes 的 `.dot`、轉成 Mermaid 約 7,411 字元（先前記載的 151 邊／9 KB 出自 008 開工前的快照，006 的 114 邊／6 KB 早於 007）。

## Clarifications

### Session 2026-11-18

本輪 clarify 問題與 spec 人為 review 閘門合併為一個裁決請求（D001），由主 session 與獨立 Fable judge 裁決（judge 以程式碼與 `mermaid@12.3.0`＋`jsdom` 探針查證）。

- D001-1 Q: spec 整體是否通過？ → A: 方向通過，必修四項已套用：FR-001 現況描述更正（`graph.dot` 標題實值）；FR-010／G-8 註明 `parse` 只檢查 `maxEdges`、不檢查 `maxTextSize`；FR-005 表格結構定死；移除 `report.html` 的連帶範圍列入 A7。建議修亦已套用：FR-003 依各產生器的跳脫規則還原；FR-004 黃／橘底文字色 `color:#000`；SC-003 改多重集合；G-9 登記 manifest 作法。
- D001-2 Q: HTML 報告 `report.html` 去留？（REQ §4 Q2） → A: 以總覽 `README.md` 取代，移除 `report.html` 與 `reportgenerator.js`（FR-012、A7）；README 註明此輸出變更；不改 `package.json` 版本號。
- D001-3 Q: 模型標題的來源？ → A: 上層模型與同模型 `hierarchy.dot` 的 `label` 相同（inter-page 即 `inter-page`）；intra-procedural 為 `intra-procedural: <String(主 scope)>`（FR-001）。
- D001-4 Q: 超過 Mermaid 上限的大圖如何處理？（REQ §4 Q3） → A: 每張圖各自判斷，邊數 > 500 或 Mermaid 區塊字元數 > 50000 即降級為節點表＋邊表並提示看 `.dot`；閾值為 dujs 自訂常數、執行期自算、不依賴 `mermaid` 套件；測試驗 500／501 邊與 50000／50001 字元兩邊界（FR-010）。
- D001-5 Q: def-use pairs 用表格還是 Mermaid？ → A: 表格，固定兩欄 `Variable | Def-Use pairs`，pairs 以 `<br/>` 分隔、`|` 跳脫，同名變數多列保留原順序（FR-005、G-6）。
- 自行決定並經 D001 接受：MDN 語料以 006 corpus 為準（G-7）；驗證用 `mermaid`＋`jsdom` devDependency（G-8，jsdom 全域須在第一次 `import('mermaid')` 前設定）；golden 比對擴及 `.md`（FR-009a）；總覽原始碼以動態加長 fence 呈現（A2）；Mermaid 標籤換行輸出 `<br/>`、`"`、`#`、`<`、`>`、`` ` `` 以 `#<碼>;` 實體表示，`&` 與前後空白同樣以實體表示，空字串標籤寫成 `" "`（mermaid 12.3.0 無法解析 `""`，plan 實測）（FR-006）。

**clarifier（spec-only）發現處置**：H1 → G-6／D001-5；H2 → FR-001／D001-3；H3 → FR-009、G-8；H4 → G-7；M1 → FR-010；M2 → FR-009a、G-9；M3 → A2；M4 → FR-003、情境 3；M5 → FR-004；I1（憲章基線有新版 `fb34a5a`，本專案 `4a4b2be`）→ 依規則不升級，僅告知。

- D002（使用者需求，非裁決）：本 feature 一併精簡 repo 根目錄 README（現 221 行：Usage 約 105 行、Limits 約 40 行，`##Goal`、`##Limits`、`##Demo` 標題缺空格），詳細內容拆成 `docs/` 章節檔、README 以連結參照，內容不得遺失，SDD 導入宣告與 License 留在 README；新增為 US4（FR-017～FR-019、SC-007）。README 保留章節與章節檔清單由使用者親自確認（D003），確認前不實作拆分。
- D003（使用者本人確認）：README 拆分清單照 plan 的 contracts/docs-split.md §2 定案；另於 README 頂部 Goal 之後加 `## Background` 小節，一兩句註明此 repo 緣起自作者的論文，逐字含論文中文標題「JavaScript網頁應用程式資料流測試模型之研究」、英文標題「A Study on Dataflow Testing Model of JavaScript Web Applications」與臺北科技大學博碩士論文系統網址 https://hdl.handle.net/11296/u8f5n6 ；對照表中此項處置為「新增（使用者 D003）」，並以測試斷言三項字串出現在 README。

**交給 plan 的注意事項（D001 judge）**：Mermaid 轉換器不得衍生自 LGPL 的 `lib/esgraph/dot.js`（由模型或 `.dot` 文字轉出，放在 MIT 範圍）；`mermaid`＋`jsdom` devDependency 的規模（約 155 套件／225 MB）寫入 plan；README 說明本機檢視需支援 Mermaid 的檢視器（`out-*/` 被 gitignore）；FR-009 往返測試可用 `mermaidAPI.getDiagramFromText(...).db.getVertices()` 取回標籤，但實體以佔位符出現，測試須自行解碼；MDN 最大圖的實際邊數與字元數在 plan 時重新量測並記錄（spec 寫的 151 邊與 006 基線 114 邊／6 KB 不一致）。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 每個模型產出可直接閱讀的 Markdown 圖（Priority: P1）

使用 dujs 分析網頁程式的人（測試設計者、研究者）執行 dujs 後，每個模型除了既有 `.dot` 外，還得到一份 Markdown 檔：扁平敘述層級圖與階層圖以 Mermaid 區塊表示、def-use pairs 以表格表示。他在 GitHub、VS Code 等 Markdown 檢視器直接看到圖、可以複製節點文字、可以 diff；圖上的節點名稱與標籤和 `.dot`、`matching.json` 一致，可交叉對照。[SRC REQ §1、§2 S1、S2]

**Why this priority**: 這是本 feature 的核心價值（REQ §1 的兩個問題的解法）；沒有它，US2、US3 都沒有可串接或可取代的內容。

**Independent Test**: 對 golden 的 fixture 執行 dujs，檢查每個模型都有對應的 Markdown 檔、其中 Mermaid 區塊可被 Mermaid 官方 parser 解析、節點與邊（含標籤）和同模型的 `.dot` 一一對應，且所有 `.dot` 與 `.matching.json` byte-identical。

**Acceptance Scenarios**:

1. **Given** 任一 fixture，**When** 執行 dujs，**Then** 每個產生 `<n>.graph.dot` 的模型都多一份同目錄的模型 Markdown 檔，內含扁平圖的 Mermaid 區塊與 def-use pairs 表格；上層模型（inter-procedural、intra-page、inter-page）另含階層圖的 Mermaid 區塊，順序為階層圖 → 扁平圖 → def-use pairs。[SRC REQ §2 S1]
2. **Given** 某模型的 `.dot` 有節點 `n71 [label="entry_a"]` 與邊 `n75 -> n76 [color="blue", label = "call"]`，**When** 產出 Markdown，**Then** Mermaid 圖中有同名節點 `n71`、顯示文字 `entry_a`，以及 `n75` 到 `n76`、標籤 `call` 的邊；`.dot` 的每個節點與每條邊都恰好對應一個 Mermaid 節點與邊，反之亦然。[SRC REQ §2 S2]
3. **Given** 節點標籤或階層圖標題含 FR-006 所列的 Mermaid／Markdown 特殊字元（以及 `$DOMAIN.$PAGE_0.f` 這類名稱），**When** 產出 Markdown，**Then** Mermaid 區塊仍可解析，且渲染後顯示的文字與 `.dot` 標籤（去掉 DOT 跳脫後）相同。[SRC REQ §4 Q5]
4. **Given** 任何輸入，**When** 產出 Markdown，**Then** 所有 `.dot` 與 `.matching.json` 與本 feature 開工前 byte-identical（既有 golden 與 manifest baseline 不變），新產生的 Markdown 檔列入 `tests/golden/manifest.json`。[SRC REQ §3；§2 S5；USR]
5. **Given** 一張圖（階層圖或扁平圖，各自判斷）的邊數 > 500 或其 Mermaid 區塊字元數 > 50000，**When** 產出 Markdown，**Then** 該圖改為節點表＋邊表（Markdown 表格）並提示改看同目錄 `.dot`，同檔的其他圖不受影響；邊數 500／字元數 50000 的圖仍以 Mermaid 區塊輸出（FR-010）。[SRC REQ §4 Q3；§5 第 3 點]

---

### User Story 2 - 一份總覽串起所有模型（Priority: P2）

使用者打開一份總覽 Markdown，就能依頁面與層級（intra-procedural、inter-procedural、intra-page、inter-page）找到每個模型的 Markdown 檔，不必在 `out-…` 目錄中逐層翻找；原本的 HTML 報告依決定改寫或移除。[SRC REQ §2 S3]

**Why this priority**: US1 已讓每張圖可讀；總覽是導覽便利性，且牽涉 HTML 報告的去留。

**Independent Test**: 執行 dujs 後打開總覽，逐一點擊連結都能抵達存在的模型 Markdown 檔，連結順序與目前報告的模型順序一致。

**Acceptance Scenarios**:

1. **Given** 兩頁的輸入，**When** 執行 dujs，**Then** 輸出目錄根有總覽 Markdown，依「每頁：Source code → intra-procedural → inter-procedural → intra-page，最後 inter-page」列出每個模型檔的相對連結（含模型的標題，如函式名或 scope 名），每個連結都指向存在的檔案。[SRC REQ §2 S3]
2. **Given** 執行完成，**When** 檢查輸出目錄，**Then** 不再產生 `report.html`，總覽 `README.md` 取代其角色（FR-012）。[SRC REQ §4 Q2]
3. **Given** 任何環境，**When** 執行 dujs，**Then** 不預先渲染 SVG 或任何圖片，渲染交給 Markdown 檢視器。[SRC REQ §4 Q4]

---

### User Story 3 - 安裝與執行不再需要 Graphviz（Priority: P3）

在沒有安裝 Graphviz 的環境，使用者 `npm install` 後執行 dujs，不呼叫任何外部程式、不產生 `.png`、不出現錯誤或破圖；README 的 Requirements 與 Usage 不再提 Graphviz 與 PNG，改說明 Markdown 輸出。[SRC REQ §1 第 1、2 點；§2 S4；§5 第 1 點]

**Why this priority**: 移除相依是收尾；必須在 US1（替代輸出）與 US2（報告不再引用 PNG）之後才能做，否則報告會缺圖。

**Independent Test**: 在 `PATH` 中沒有 `dot` 的環境執行 dujs，輸出目錄中沒有 `.png`、沒有任何外部程式被呼叫，所有 Markdown 與 `.dot` 照常產生；README 不再出現 Graphviz。

**Acceptance Scenarios**:

1. **Given** `PATH` 沒有 `dot`，**When** 執行 dujs，**Then** 結束狀態 0、stderr 為空、輸出目錄沒有 `.png`。[SRC REQ §5 第 1 點；§2 S4]
2. **Given** dujs 的程式碼，**When** 檢查，**Then** 輸出流程不再啟動任何外部程式（不再有 Graphviz 呼叫）。[SRC REQ §2 S4]
3. **Given** 執行 dujs，**When** 檢查輸出目錄，**Then** `.dot` 仍照常產生（保留，作為 golden 基準與超大圖的後備）。[SRC REQ §4 Q1；USR]
4. **Given** README，**When** 閱讀 Requirements 與 Usage，**Then** 不再列 Graphviz、不再提 `.png`，改說明模型 Markdown 與總覽的檔名、內容與檢視方式。[SRC REQ §2 S4]

### User Story 4 - README 精簡為概覽，詳細說明拆成章節檔（Priority: P4）

第一次接觸 dujs 的人打開 repo 根目錄 README，只看到精簡的概覽與入門（目的、需求、安裝、最小用法、輸出概述、授權），細節（CLI 完整說明、輸出格式、支援語法與限制、開發與 golden 測試）在 `docs/` 下的獨立章節檔，README 以連結參照；本 feature 新的 Markdown／Mermaid 輸出說明也放在對應章節檔。拆分前後內容不遺失，且可逐段核對。[SRC USR2]

**Why this priority**: 文件整理，不影響輸出功能；放在 US3（README 的 Graphviz 移除）之後一起收斂，避免同一份 README 被兩個 story 交錯修改。

**Independent Test**: 比對拆分前（feature 開工前 `develop` 的 README）與拆分後的 README＋章節檔：對照表中原 README 每一段都指到新位置，且新位置含該段資訊；README 每個章節標題格式一致、連結全部可達。

**Acceptance Scenarios**:

1. **Given** 拆分後的 repo，**When** 閱讀 README，**Then** 只含概覽與入門章節（清單依 D003 使用者確認），且「SDD 導入宣告」與「License」段落保留在 README；Goal 之後有 `## Background` 小節，逐字含論文中文標題「JavaScript網頁應用程式資料流測試模型之研究」、英文標題「A Study on Dataflow Testing Model of JavaScript Web Applications」與網址 https://hdl.handle.net/11296/u8f5n6 。[SRC USR2；D003]
2. **Given** 拆分後的 repo，**When** 依對照表逐段核對原 README（`develop` 274257a 版），**Then** 每一段都能在 README 或某個章節檔找到等價內容（文字可隨本 feature 的輸出變更更新，如 Graphviz／PNG 敘述改為 Markdown 輸出；HTML 清單可改為 Markdown 清單），沒有遺失。[SRC USR2]
3. **Given** README 與章節檔，**When** 檢查標題與連結，**Then** 所有標題為 `#`／`##` 後接一個空格的一致格式（無 `##Goal` 這類缺空格），README 到章節檔、章節檔之間、章節檔到 `docs/known-issues.md` 的相對連結全部指向存在的檔案與標題。[SRC USR2]
4. **Given** 本 feature 新增的模型 Markdown、總覽與降級規則說明，**When** 閱讀文件，**Then** README 只有一兩句概述與連結，細節在輸出格式的章節檔。[SRC USR2；REQ §2 S4]

---

### Edge Cases

- 模型沒有任何 def-use pair（`.dupairs.dot` 只有表頭）：Markdown 的 def-use pairs 節仍存在，表格只有表頭或標明「無」。[G-1]
- 模型的圖沒有邊或只有一個節點：Mermaid 區塊仍可解析。[SRC REQ §2 S5]
- `.dot` 標籤含 `\n` 跳脫或真換行：現行產生路徑（`dot.js`、`hierarchydot.js`）不產生，屬不支援（見 plan「有意的取捨與已知限制」、contracts/mermaid-graph.md §1；D005-A2）。[SRC REQ §4 Q5]
- 同一對節點之間有多條不同標籤的邊（如 `true` 與 `exception`）：Mermaid 中各自保留，不合併。[SRC REQ §2 S2]
- 兩頁或多頁輸入、同一頁有多個模型：檔名與 `.dot` 一致地依模型編號區分，不互相覆蓋。[SRC REQ §2 S1]
- 分析或寫出失敗時（現行：移除整個輸出目錄、結束狀態 1）：行為不變，不留下半份 Markdown。[G-2]
- 階層圖沒有 cluster／subgraph（CODE：`hierarchydot.js` 只有節點與邊），不需處理子圖對應。[SRC REQ §4 Q6；CODE]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 每個寫出 `<n>.graph.dot` 的模型 MUST 在同目錄寫出一份模型 Markdown 檔（檔名見 Assumptions A1），內容依序為：標題、階層圖（僅上層模型）、扁平敘述層級圖、def-use pairs。標題規則：上層模型（inter-procedural／intra-page／inter-page）的標題與同模型 `hierarchy.dot` 的 `label` 完全相同（如 `inter-procedural: $DOMAIN.$PAGE_0.sumAll`、`intra-page: $DOMAIN.$PAGE_0`、`inter-page`）；intra-procedural 為 `intra-procedural: <主 scope 的 String 表示>`（如 `intra-procedural: $DOMAIN.$PAGE_0.add`）。不採用 `graph.dot` 的 `label`（CODE `graphics.js:34-43`：intra-procedural 為 `function $DOMAIN.$PAGE_0.sumAll`、`anonymousFunction[…]` 或 `page`，inter-procedural 與 inter-page 為空字串，intra-page 為空字串或 `page`，不足以辨識模型）。[SRC REQ §2 S1；D001-3]
- **FR-002**: 扁平圖與階層圖 MUST 以 ` ```mermaid ` 區塊表示，使用 `flowchart TD`。[SRC REQ §2 S1；§4 Q6]
- **FR-003**: Mermaid 圖的節點 id MUST 與 `.dot` 相同（扁平圖 `n<k>`、階層圖 `h<k>`），顯示文字 MUST 為 `.dot` 標籤依其產生器的跳脫規則還原後的原文（CODE：`hierarchydot.js` `escapeLabel` 跳脫 `\` 與 `"`；`lib/esgraph/dot.js` 對已設定的 `node.label` 不跳脫，只有以原始碼為標籤的模式才把換行寫成 `\n`、把 `"` 跳脫；`graphics.js` 的圖標題不跳脫），也就是取模型中的原標籤文字；節點與邊的多重集合（重複邊各自保留）MUST 與同模型 `.dot` 一一對應（含每條邊的標籤：`true`、`false`、`exception`、`finally`、`call`、`return`、`onEvent`、`recursive call`、`recursive return`、`loop`、`loadStorage`、`saveStorage`；`.dot` 中無標籤的邊在 Mermaid 中也無標籤）。[SRC REQ §2 S2]
- **FR-004**: `.dot` 的三類節點 MUST 在 Mermaid 中以三種可區分的形狀呈現：一般方框、黃色橢圓類（entry／exit／call／callReturn／loop／loopReturn／finallyExit 與階層圖的 LOOP）、橘色雙圓類（localStorage 與階層圖的 domain），並 SHOULD 帶對應底色（黃、橘底的文字色固定 `color:#000`，以免深色主題看不清）；邊的顏色與線型（exception 紅、call／return 藍、onEvent 綠、資料流與 storage 虛線、return 與 recursive return 的 dashed、recursive 的 bold）SHOULD 以對應的線型或樣式保留。樣式不得影響可解析性，也不得取代 FR-003 的標籤。[SRC REQ §2 S2；§3 第 2 點]
- **FR-005**: def-use pairs MUST 以 Markdown 表格表示（`.dupairs.dot` 本身是表格而非圖，G-6）：固定兩欄 `Variable | Def-Use pairs`；每列對應 `.dupairs.dot` 的一列，依原列順序（同名變數的多列各自保留、不合併）；第二欄依原欄順序列出該變數的 pairs，pair 文字與 `.dupairs.dot` 相同（pair 內含逗號，如 `(entry_b,(8,9))`），pairs 之間以 `<br/>` 分隔；儲存格文字以 code span 包住（避免 GitHub 把 `$DOMAIN.$PAGE_0` 當成 `$…$` 數學式），其中的 `|` 跳脫為 `\|`。沒有 pair 的模型只輸出表頭。[SRC REQ §2 S1；CODE；D001-5]
- **FR-006**: 標籤與表格內容 MUST 依一致的跳脫規則處理 Mermaid 與 Markdown 的特殊字元（至少 `"`、`&`、`[`、`]`、`{`、`}`、`(`、`)`、`|`、`#`、`<`、`>`、`;`、`` ` ``、換行、前後空白，以及空字串標籤）：Mermaid 標籤一律以雙引號包住，換行輸出 `<br/>`，`"`、`#`、`<`、`>`、`` ` `` 以 `#<碼>;` 實體表示（引號內的 `[ ] { } ( ) | ;` 不需跳脫，D001 探針已確認）；使每個 Mermaid 區塊可被 Mermaid 官方 parser 解析、表格不被切斷，且渲染後的文字與 `.dot` 標籤原文相同。完整對照（含 D004-1a 補的 `:`、`%`、`\r`、相鄰 `$$`）見 contracts/mermaid-graph.md §2.3。[SRC REQ §4 Q5]
- **FR-007**: 輸出 MUST 為確定性：同一輸入重複執行，Markdown 檔 byte-identical（不含時間戳記、隨機值或輸出目錄名稱）。[SRC REQ §2 S5]
- **FR-008**: 本 feature MUST NOT 改變任何分析結果：所有 `.dot` 與 `.matching.json` byte-identical；`tests/golden/manifest.json` 既有的 `baseline` 雜湊不變，新增的 Markdown 檔加入各 fixture 的 `added`。[SRC REQ §3；§2 S5；USR]
- **FR-009**: 測試 MUST 以 Mermaid 官方 parser（`mermaid` 套件的 `parse`，devDependency）驗證 golden 所有 Mermaid 區塊可解析，且不需要瀏覽器或 Graphviz；另以測試比對每張 Mermaid 圖與同模型 `.dot` 的節點 id、邊（起訖與標籤）集合完全相同（SC-003），並以跳脫規則的往返測試（Mermaid 文字經 Mermaid 的實體解碼後等於 `.dot` 標籤原文）驗證 FR-006 的「顯示文字相同」。[SRC REQ §2 S5；G-8]
- **FR-009a**: golden 測試的比對範圍 MUST 擴及 `.md`（模型 Markdown 與總覽）：檔案集合、內容逐字比對與 manifest `added` 清單都納入 `.md`；`.dot`／`.matching.json` 的 baseline 雜湊檢查不變。[SRC REQ §2 S5；§5 第 2 點；CODE]
- **FR-010**: 每張圖（階層圖與扁平圖各自獨立判斷）若邊數 > 500 或其 Mermaid 區塊字元數（含 `classDef`／`class`／`linkStyle` 等樣式行）> 50000，MUST 改以「節點表（id、顯示文字）＋邊表（起點、終點、標籤）」的 Markdown 表格輸出，並附一句提示改看同目錄的對應 `.dot`。兩個閾值是 dujs 自訂常數（取 Mermaid 預設 `maxEdges` 500、`maxTextSize` 50000），由 dujs 於執行期自行計算，不依賴 `mermaid` 套件（FR-014）。測試以合成圖驗證兩邊界：500／501 邊、50000／50001 字元。[SRC REQ §4 Q3；D001-4]
- **FR-011**: 輸出目錄根 MUST 有一份總覽 Markdown（檔名與粒度見 Assumptions A2），依 US2 情境 1 的順序列出每頁的原始碼與每個模型 Markdown 檔的相對連結。[SRC REQ §2 S3]
- **FR-012**: dujs MUST NOT 再產生 `report.html`（以總覽 `README.md` 取代）；HTML 報告產生器、CLI 對它的呼叫、輸出寫出器中只供報告使用的圖檔路徑屬性與測試掛鉤一併移除，相關測試改為檢查總覽（範圍見 A7）。這是使用者可見的輸出變更，README MUST 註明；本 feature 不改 `package.json` 版本號（發版決策）。[SRC REQ §4 Q2；D001-2]
- **FR-013**: dujs MUST NOT 呼叫 Graphviz 或任何外部程式，MUST NOT 產生 `.png`；`.dot` 照常產生。[SRC REQ §2 S4；§4 Q1]
- **FR-014**: dujs MUST NOT 預先渲染 SVG 或圖片；若新增 npm 套件，僅限測試用的 devDependency（如 Mermaid parser），執行期相依不得新增需要瀏覽器的套件。[SRC REQ §4 Q4；USR]
- **FR-015**: README 的 Requirements、Usage 與 golden 說明 MUST 同步更新：移除 Graphviz 與 PNG，說明模型 Markdown、總覽與檢視方式，以及 manifest 收錄 Markdown 檔。[SRC REQ §2 S4]
- **FR-017**: README MUST 精簡為概覽與入門；詳細內容拆成 `docs/` 下的獨立 Markdown 章節檔，README 以相對連結參照；README 保留的章節與各章節檔的路徑、標題、涵蓋的原 README 段落以 D003 使用者確認的清單為準（使用者確認前不實作拆分）。「SDD 導入宣告」與「License」MUST 保留在 README。[SRC USR2；D002、D003]
- **FR-018**: 拆分 MUST 不遺失內容：本 feature 目錄 MUST 有一份對照表（原 README 每段 → 新位置），並以可重複執行的檢查（測試或腳本）確認原 README 的每一段在新位置都有對應；因本 feature 輸出變更而改寫的段落（Graphviz、PNG、HTML 報告）在對照表中標明改寫理由。[SRC USR2]
- **FR-019**: README 與章節檔的標題格式 MUST 一致（`#`／`##` 後一個空格），內部相對連結 MUST 全部可達（有測試或腳本檢查）。FR-015 所述 README 更新內容依 FR-017 的原則放置：README 只放概述，Markdown／Mermaid 輸出細節放輸出格式章節檔。[SRC USR2]
- **FR-016**: MDN 範例語料（`specs/006-eslint-scope/mdn/corpus` 的 32 個 id，依 `pages.json` 分頁；REQ §5 所寫的 `docs/research/mdn-baseline` 只有研究文件與工具、沒有語料，見 G-7）MUST 全數產出 Markdown，且所有 Mermaid 區塊可被官方 parser 解析；結果記錄於本 feature 目錄。[SRC REQ §5 第 3 點；USR]

### Key Entities

- **模型 Markdown 檔**：一個模型的可讀表示；包含標題、（上層模型的）階層圖、扁平圖、def-use pairs 表格；與同目錄的 `.dot`、`.matching.json` 以模型編號對應。
- **Mermaid 區塊**：一張圖的 Mermaid 文字；節點 id 與 `.dot` 相同，邊與標籤一一對應。
- **總覽 Markdown**：一次執行（或一頁，見 A2）的入口；依頁面與層級連到模型 Markdown 檔。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: golden 四個 fixture 的所有 `.dot` 與 `.matching.json` 雜湊與開工前相同（0 個差異）。[SRC REQ §5 第 2 點]
- **SC-002**: golden 與 MDN 語料產出的 Mermaid 區塊 100% 通過官方 parser 解析，且 100% 符合 FR-010 的閾值（邊數 ≤ 500、字元數 ≤ 50000；parser 只檢查邊數，字元數由測試另行檢查），超過者 100% 以降級表格輸出。[SRC REQ §5 第 2、3 點]
- **SC-003**: 每張 Mermaid 圖的節點 id 集合與邊（起點、終點、標籤）的多重集合和同模型 `.dot` 完全相同，自動檢查 0 差異。[SRC REQ §2 S2]
- **SC-004**: 未安裝 Graphviz 的環境執行 dujs，0 個錯誤、0 個 `.png`、0 個外部程式呼叫。[SRC REQ §5 第 1 點]
- **SC-005**: 總覽中 100% 的連結指向存在的檔案。[SRC REQ §2 S3]
- **SC-007**: 原 README 的段落 100% 在對照表中有新位置且通過 FR-018 的檢查；README 與章節檔 0 個失效連結、0 個格式不一致的標題。[SRC USR2]
- **SC-006**: 同一輸入連續執行兩次，Markdown 檔 100% byte-identical。[G-3]

## Assumptions

- **A1**：模型 Markdown 檔名為 `<n>.md`，與 `<n>.graph.dot`、`<n>.dupairs.dot`、`<n>.hierarchy.dot`、`<n>.matching.json` 同目錄（每個模型一份，三種內容合併在同一檔）。[SRC REQ §2 S1；G-4]
- **A2**：總覽每次執行一份，放在輸出目錄根，檔名 `README.md`（GitHub 與多數檢視器開啟目錄時自動顯示）；內含每頁的原始碼（同目前 HTML 報告的 Source Code 節），以 ` ```js ` fenced code block 呈現，fence 長度取「原始碼中最長的連續反引號數 + 1」與 3 的較大者（CommonMark 規則），原始碼不需跳脫。[SRC REQ §2 S3；G-5]
- **A3**：`.dot` 保留（REQ §4 Q1 的建議、USR 要求 golden `.dot` byte-identical）；只移除 PNG 與 Graphviz 呼叫。[SRC REQ §4 Q1；USR]
- **A4**：不預先渲染 SVG（REQ §4 Q4 傾向不做；FR-014）。[SRC REQ §4 Q4]
- **A5**：階層圖沒有 cluster，Q6 的子圖對應不適用；方向一律 `flowchart TD`。[SRC REQ §4 Q6；CODE]
- **A6**：技術選型沿用 repo 現有（Node ≥ 24、CommonJS、mocha + should、eslint、c8、npm）；Mermaid parser 若需要，以 devDependency 加入。[SRC USR]
- **A7**：移除 `report.html` 的連帶範圍（D001-2，CODE 查證）：`lib/dujs/reportgenerator.js` 整檔；`lib/dujs/cli.js` 對 `reportGenerator` 的 require 與 `createReport()` 呼叫（L22、L215）；`lib/dujs/outputwriter.js` 的 11 個 `*ImageFilePaths`（實測 11 個，含拼錯的 `intraPageDUPairsmageFilePaths`；原記 12 個有誤） 屬性與只供報告使用的 `pageJSSourFilePaths`、`writeImageFileFromDotFile` 與 `_testonly_._writeImageFileFromDotFile`；測試 `tests/golden/golden.js` 的報告引用順序測試（L189-222）與 `reportImagePaths`、`tests/dujs/cli.js` L289-324、L423、L485-489 改為檢查總覽；README L37「referred to in the HTML report」等敘述；`eslint-suppressions.json` 中 `lib/dujs/reportgenerator.js` 的項目；舊契約 `specs/003-hierarchical-models/contracts/hierarchy-output.md` §4 契約 #5 與 `specs/004-fix-remaining-issues/contracts/cli.md` §2 步驟 4、§3、§4 US5-4 的報告敘述標註 superseded by 009。這些是測試與文件隨規格變更，不是驗收工具（diffcheck）的修改。[SRC REQ §2 S3、S4；CODE；D001-2]

### 來源缺口（spec 自行補上）

| ID | 內容 | 理由 |
|----|------|------|
| G-1 | 沒有 def-use pair 的模型仍有表格節 | 現行 `.dupairs.dot` 在無 pair 時仍輸出表頭；保持結構一致 |
| G-2 | 失敗時不留半份 Markdown | 沿用現行 CLI 失敗即移除輸出目錄的契約（README Exit status） |
| G-3 | 輸出確定性 | golden 以雜湊比對，非確定性輸出無法入 manifest |
| G-4 | 檔名 `<n>.md`、三種內容合併一檔 | REQ §2 S1 暫名 `<n>.md` 或 `<n>.graph.md`；合併一檔利於閱讀與連結 |
| G-5 | 總覽檔名 `README.md`、每次執行一份 | REQ §2 S3 未定；檢視器開目錄時自動顯示 |
| G-6 | def-use pairs 以 Markdown 表格而非 Mermaid 區塊呈現（FR-005） | REQ §2 S1 把 def-use pairs 列在 Mermaid 區塊清單；但 `.dupairs.dot` 本身是 HTML-like 表格（CODE `graphics.js` `convertDUPairsToDot`），沒有節點與邊可畫。D001-5 確認 |
| G-7 | MDN 語料以 `specs/006-eslint-scope/mdn/corpus`（33 檔、32 個 id、`pages.json`）為準 | REQ §5 寫 `docs/research/mdn-baseline`，該目錄只有 README、research.md、validation-004.md 與 tools，沒有語料；USR 同時列出兩者 |
| G-9 | 上游 REQ §5「新增的 Markdown 檔雜湊入 manifest」改為：`.md` 以 expected 目錄逐字比對，manifest `added` 只列檔名（FR-009a） | 現行 manifest 的 `added` 是檔名清單、`baseline` 才是雜湊（CODE `tests/golden/golden.js`）；沿用既有結構 |
| G-8 | 驗證方式：`mermaid` devDependency 於 Node 以 `jsdom` 提供 DOM 後呼叫 `parse` | 2026-11-18 可行性實測：`mermaid@12.3.0` 在純 Node 呼叫 `parse` 失敗（`DOMPurify.addHook is not a function`），加 `jsdom` 全域 `window`／`document` 後可解析、可拒絕錯誤語法，且 `parse` 本身即套用 `maxEdges`（500 過、501 拒），但**不**檢查 `maxTextSize`（65,194 字元仍通過，只在渲染階段檢查），故字元數閾值須由 dujs 自行計算（FR-010）；jsdom 全域須在第一次 `import('mermaid')` 之前設定；`mermaid` 為 ESM，CommonJS 測試以動態 `import()` 載入 |
