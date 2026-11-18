# Feature Specification: 以 Markdown + Mermaid 取代 Graphviz 圖檔輸出

**Feature Branch**: `009-mermaid-markdown-output`

**Created**: 2026-11-18

**Status**: Draft（D001 已裁決）

**Input**: User description: "將模型匯出資訊改為以 JS（npm 工具鏈：dujs 自身程式碼，必要時加 npm 套件）產出 Markdown 檔，CFG 等圖表以 Mermaid 語法定義，取代 Graphviz PNG。上游需求來源：`.specify/context/mermaid-markdown-output/v1/`。技術選型維持 repo 現有（Node ≥ 24、CommonJS、mocha + should、eslint、c8、npm）。本 feature 純輸出層：不得改變任何分析結果；既有 golden `.dot` 必須 byte-identical，新檔加入 `tests/golden/manifest.json`。實作完成後以 MDN 範例語料驗證全數可產出可解析的 Markdown。"

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| REQ | `.specify/context/mermaid-markdown-output/v1/requirements.md`（索引：同目錄 `index.md`） | §1 目的、§2 範圍 S1–S5、§3 非目標、§4 待決 Q1–Q6、§5 驗收觀點 |
| USR | 本 feature 的需求描述（2026-11-18，見上方 Input） | 技術選型、`.dot` byte-identical、manifest、MDN 驗收 |
| CODE | 目前 `develop`（`274257a`）的輸出程式：`lib/dujs/outputwriter.js`、`lib/dujs/reportgenerator.js`、`lib/dujs/graphics.js`、`lib/dujs/hierarchydot.js`、`lib/esgraph/dot.js` | 目前輸出的檔案、標籤與樣式（現況事實，非需求） |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | REQ §1、§2 S1、S2、S5；§3；§4 Q3、Q5、Q6；§5 第 2、3 點 |
| US2 | REQ §2 S3；§4 Q2、Q4 |
| US3 | REQ §1 第 1、2 點；§2 S4；§4 Q1；§5 第 1 點 |

### 現況（CODE，`develop` 274257a）

- 每個模型寫出 `<n>.graph.dot`（扁平敘述層級圖，節點 `n<k>`，標籤為行號＋分支路徑，如 `18a`、`call (19)`、`entry_a`）、`<n>.dupairs.dot`（以 Graphviz HTML-like 表格表示的 def-use pairs，不是圖）；inter-procedural／intra-page／inter-page 另有 `<n>.hierarchy.dot`（節點 `h<k>`，邊 `call`、`return`、`recursive call`、`recursive return`、`loop`、`onEvent`、`loadStorage`、`saveStorage`；**沒有** cluster／subgraph）與 `<n>.matching.json`。
- 每個 `.dot` 由 `outputwriter.js` `writeImageFileFromDotFile` 以 `spawnSync('dot', …)` 轉成同名 `.png`；未安裝 Graphviz 時靜默失敗。
- `report.html` 以 `<img src="../<out>/….png">` 依「每頁：intra-procedural → inter-procedural → intra-page，再 inter-page；上層模型先 hierarchy 再 graph 再 dupairs」排列，並從 CDN 載入 Bootstrap／jQuery。
- golden 測試（`tests/golden/golden.js`）比對 `.dot` 與 `.matching.json`；另有一個測試檢查 `report.html` 中 `.png` 的引用順序（不需 Graphviz）。MDN 語料（`specs/006-eslint-scope/mdn/corpus`，33 檔、32 個 id）目前最大的圖為 151 條邊、約 9 KB 的 `.dot`。

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

1. **Given** 兩頁的輸入，**When** 執行 dujs，**Then** 輸出目錄根有總覽 Markdown，依「每頁：Source Code → intra-procedural → inter-procedural → intra-page，最後 inter-page」列出每個模型檔的相對連結（含模型的標題，如函式名或 scope 名），每個連結都指向存在的檔案。[SRC REQ §2 S3]
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

### Edge Cases

- 模型沒有任何 def-use pair（`.dupairs.dot` 只有表頭）：Markdown 的 def-use pairs 節仍存在，表格只有表頭或標明「無」。[G-1]
- 模型的圖沒有邊或只有一個節點：Mermaid 區塊仍可解析。[SRC REQ §2 S5]
- 節點標籤含換行（`.dot` 中為 `\n`）：在 Mermaid 中以換行顯示，不破壞語法。[SRC REQ §4 Q5]
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
- **FR-005**: def-use pairs MUST 以 Markdown 表格表示（`.dupairs.dot` 本身是表格而非圖，G-6）：固定兩欄 `Variable | Def-Use pairs`；每列對應 `.dupairs.dot` 的一列，依原列順序（同名變數的多列各自保留、不合併）；第二欄依原欄順序列出該變數的 pairs，pair 文字與 `.dupairs.dot` 相同（pair 內含逗號，如 `(entry_b,(8,9))`），pairs 之間以 `<br/>` 分隔；儲存格中的 `|` 跳脫為 `\|`。沒有 pair 的模型只輸出表頭。[SRC REQ §2 S1；CODE；D001-5]
- **FR-006**: 標籤與表格內容 MUST 依一致的跳脫規則處理 Mermaid 與 Markdown 的特殊字元（至少 `"`、`[`、`]`、`{`、`}`、`(`、`)`、`|`、`#`、`<`、`>`、`;`、`` ` ``、換行）：Mermaid 標籤一律以雙引號包住，換行輸出 `<br/>`，`"`、`#`、`<`、`>`、`` ` `` 以 `#<碼>;` 實體表示（引號內的 `[ ] { } ( ) | ;` 不需跳脫，D001 探針已確認）；使每個 Mermaid 區塊可被 Mermaid 官方 parser 解析、表格不被切斷，且渲染後的文字與 `.dot` 標籤原文相同。[SRC REQ §4 Q5]
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
- **SC-006**: 同一輸入連續執行兩次，Markdown 檔 100% byte-identical。[G-3]

## Assumptions

- **A1**：模型 Markdown 檔名為 `<n>.md`，與 `<n>.graph.dot`、`<n>.dupairs.dot`、`<n>.hierarchy.dot`、`<n>.matching.json` 同目錄（每個模型一份，三種內容合併在同一檔）。[SRC REQ §2 S1；G-4]
- **A2**：總覽每次執行一份，放在輸出目錄根，檔名 `README.md`（GitHub 與多數檢視器開啟目錄時自動顯示）；內含每頁的原始碼（同目前 HTML 報告的 Source Code 節），以 ` ```js ` fenced code block 呈現，fence 長度取「原始碼中最長的連續反引號數 + 1」與 3 的較大者（CommonMark 規則），原始碼不需跳脫。[SRC REQ §2 S3；G-5]
- **A3**：`.dot` 保留（REQ §4 Q1 的建議、USR 要求 golden `.dot` byte-identical）；只移除 PNG 與 Graphviz 呼叫。[SRC REQ §4 Q1；USR]
- **A4**：不預先渲染 SVG（REQ §4 Q4 傾向不做；FR-014）。[SRC REQ §4 Q4]
- **A5**：階層圖沒有 cluster，Q6 的子圖對應不適用；方向一律 `flowchart TD`。[SRC REQ §4 Q6；CODE]
- **A6**：技術選型沿用 repo 現有（Node ≥ 24、CommonJS、mocha + should、eslint、c8、npm）；Mermaid parser 若需要，以 devDependency 加入。[SRC USR]
- **A7**：移除 `report.html` 的連帶範圍（D001-2，CODE 查證）：`lib/dujs/reportgenerator.js` 整檔；`lib/dujs/cli.js` 對 `reportGenerator` 的 require 與 `createReport()` 呼叫（L22、L215）；`lib/dujs/outputwriter.js` 的 12 個 `*ImageFilePaths` 屬性、`writeImageFileFromDotFile` 與 `_testonly_._writeImageFileFromDotFile`；測試 `tests/golden/golden.js` 的報告引用順序測試（L189-222）與 `reportImagePaths`、`tests/dujs/cli.js` L289-324、L423、L485-489 改為檢查總覽；README L37「referred to in the HTML report」等敘述；舊契約 `specs/003-hierarchical-models/contracts/hierarchy-output.md` §4 契約 #5 與 `specs/004-fix-remaining-issues/contracts/cli.md` §3 標註 superseded by 009。這些是測試與文件隨規格變更，不是驗收工具（diffcheck）的修改。[SRC REQ §2 S3、S4；CODE；D001-2]

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
