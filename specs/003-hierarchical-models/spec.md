# Feature Specification: 階層式模型結構（重構 stage 1）

**Feature Branch**: `003-hierarchical-models`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "開新 feature：dujs 重構 stage 1 — 階層式模型結構（golden 必須完全不變），範圍含 known-issues §9（程式風格與紀錄）與 §18（函式 entry 節點使用函式本體內變數）。設計輸入見 memory dujs-hierarchical-model-design 與 docs/known-issues.md §13、§16、§9、§18。PR 目標分支 develop。"（§18 經 2026-11-16 討論移到 stage 2，見 D4）

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| REF | 重構建議頁（外部連結；本 spec 引用的內容已摘入各 FR 與範圍決策，審閱時以本 spec 為準） https://claude.ai/artifact/RZ2tvCHqxnzYnFFTe1rgbC | §⑥ 各模型不共用、不改動 FlowNode 的動機 |
| KI | `docs/known-issues.md` | §9、§13、§16、§18 的現況 |
| USR | 本 feature 與前一輪的需求討論（2026-11-16，記錄於本 spec 的「範圍決策」） | 層級粒度、雙輸出、分段、範圍 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | REF §⑥；KI §13、§16；USR D1、D2、D3 |
| US2 | USR D1、D2、D5、D7、D8、D9 |
| US3 | KI §9；USR D6 |

來源缺口（spec 自行補上）：

| 編號 | 內容 | 依據 |
|------|------|------|
| G-1 | lint 不新增抑制、LGPL 派生檔修改紀錄、新模組 MIT 檔頭 | 前兩個 feature（001、002）的既定做法與專案授權 |

### 範圍決策（USR）

- **D1**（2026-11-16，前一輪）：四個層級是由粗到細的粒度。inter-page 的節點是頁面（與跨頁共用的 domain／storage 節點）；
  intra-page 的節點是主程式、每個事件處理器與 LOOP 節點（處理器呼叫的函式往下歸 inter-procedural）；inter-procedural 的節點是
  函式，以呼叫邊相連；只有 intra-procedural 的節點是敘述。上層節點參照下層模型，絕不改動下層模型的邊。
- **D2**（2026-11-16，前一輪）：同時輸出階層圖（看全貌）與扁平的敘述層級圖（測試路徑生成需要）；扁平圖每次都由階層重新展開，
  不改動下層模型。
- **D3**（2026-11-16，前一輪）：分兩段。stage 1（本 feature）只改結構，分析仍在展開後的扁平圖上進行，既有輸出必須逐位元組不變；
  stage 2（後續 feature）才做 summary-based 分析並刻意改變結果。
- **D4**（2026-11-16）：known-issues §18（函式 entry 節點讀了本體敘述的變數）修正後會改變 golden，移到 stage 2，本 feature 不修。
- **D5**（2026-11-16）：階層圖輸出成新的 .dot 檔，並放進 HTML 報告；既有 .dot 檔逐位元組不變，新檔加入 golden。
- **D6**（2026-11-16）：known-issues §9（程式風格與紀錄）併入本 feature。
- **D7**（2026-11-16，spec review）：現有 golden fixture 不產生 inter-procedural 輸出；新增（或擴充）會產生 inter-procedural 輸出的 fixture，
  其扁平輸出以重構前的程式（`develop` merge bf07818）產生後入 golden，再隨重構驗證逐位元組不變；其階層圖一併入 golden。
- **D8**（2026-11-16，spec review）：階層圖不畫呼叫返回與 LOOP 返回節點，返回關係以返回邊表示；階層圖只有大單位節點與 LOOP。
- **D9**（2026-11-16，spec review）：inter-page 階層圖的 domain／storage 部分與現有扁平圖的跨頁節點一一對應（domain scope 的 entry／exit）。

## User Scenarios & Testing *(mandatory)*

本 feature 的使用者是 dujs 的維護者（做 stage 2、修 known-issues 的人）與閱讀分析報告的人。分析結果完全不變；
價值在於：每個層級的模型建好後就不再被改動，可以單獨檢查與測試；報告多了一張看全貌的階層圖。

### User Story 1 - 各層模型建好後不再被上層改動 (Priority: P1)

維護者在四個層級都建完、分析完之後，回頭讀任何一個 intra-procedural 或 inter-procedural 模型，看到的圖（節點、邊、
邊的種類）與 def-use 分析結果，都和該模型剛建好、剛分析完時一樣。目前上層建模會直接改動共用的流程節點：intra-page 把
走向頁面 exit 的邊改接到 LOOP 節點（§13），inter-procedural 在決策節點前插入呼叫節點並把進入決策節點的邊改接過去（§16），
而且每個節點的分析結果（reach-in、KILL 等）只有一份，後分析的模型會蓋掉先分析的結果。[SRC REF §⑥；KI §13、§16]

**Why this priority**: 這是 stage 2（summary-based 分析）的前提：上層要讀下層的摘要，下層就不能被上層改掉。
測試輔助工具目前為此有兩個繞路（把 LOOP 節點的分支當成 exit、把插入的呼叫節點當成它前面的決策節點），本 story 完成後可以移除。
[SRC KI §13、§16；USR D3]

**Independent Test**: 只完成本 story 時，全部既有測試與 golden 通過；新的測試在四層都建完後比對每個下層模型的圖與
分析結果和建好當下相同；測試輔助工具的兩個繞路移除後，既有測試的預期 pair 不變。

**Acceptance Scenarios**:

1. **Given** `var a = 1; if (a) { a = 2; }`，**When** 四層都建完，**Then** 頁面的 intra-procedural 模型裡 `L2` 的 false 分支仍指向頁面的
   exit 節點（不是 LOOP 節點），且其 def-use pair 仍為 `a: L1 -> L2>exit:F`。[SRC KI §13]
2. **Given** known-issues §16 的範例（`if (f(x = 1)) { x = 2; }`），**When** 四層都建完，**Then** 頁面的 intra-procedural 模型裡進入
   決策節點 `L5` 的邊仍來自它原本的前驅（不是插入的呼叫節點）；inter-procedural 模型仍是「前驅 → 呼叫 → 被呼叫函式 → 呼叫返回 →
   決策節點」，pair 與現況相同（§16 的順序語意不變，見 Edge Cases）。[SRC KI §16]
3. **Given** 任一 fixture，**When** 四層都建完並分析完，**Then** 每個模型的每個節點都能取得「該模型分析時」的 reach-in、reach-out、
   GEN、KILL、c-use、p-use，與只建到該層時的結果相同。[SRC REF §⑥]
4. **Given** 測試輔助工具移除「LOOP 分支當 exit」與「插入的呼叫節點當決策節點」兩個繞路，**When** 執行全部既有測試，
   **Then** 全部通過，預期 pair 不變。[SRC KI §13、§16]
5. **Given** ES5 與 ES2015+ 的 golden fixture，**When** 重構完成，**Then** 既有的每個 .dot 檔（含節點編號）與重構前逐位元組相同。[SRC USR D3]

---

### User Story 2 - 每個上層模型都有一張階層圖 (Priority: P2)

閱讀報告的人在看 inter-procedural、intra-page、inter-page 的扁平圖之前，先看一張只有「函式／主程式／事件處理器／頁面」
等大單位的階層圖，了解有哪些單位、誰呼叫誰、哪些處理器掛在 LOOP 上、頁面之間怎麼經由 storage 相連；需要細節時再看
原本的敘述層級圖。維護者也能從程式取得同一個階層結構（每個上層節點參照哪個下層模型）。[SRC USR D1、D2、D5]

**Why this priority**: 階層結構本身是 US1 的手段；把它輸出成圖是額外的閱讀價值，不影響分析結果。

**Independent Test**: 只完成本 story 時，每個 inter-procedural、intra-page、inter-page 模型都多一個階層圖 .dot 檔，HTML 報告
顯示它；既有 .dot 檔逐位元組不變；新的 .dot 檔加入 golden 並經人工核對節點與邊。

**Acceptance Scenarios**:

1. **Given** 一段頁面程式，主程式呼叫 `f`、`f` 呼叫 `g`，**When** 產生 inter-procedural 階層圖，**Then** 圖中有主程式、`f`、`g` 三個節點，
   以呼叫邊 主程式 → `f` → `g` 相連，沒有敘述節點。[SRC USR D1]
2. **Given** 一個頁面註冊了兩個事件處理器，**When** 產生 intra-page 階層圖，**Then** 圖中有主程式、LOOP、兩個處理器節點，主程式接到
   LOOP、LOOP 以事件邊接到各處理器、處理器返回 LOOP；處理器內呼叫的函式不出現在這張圖（屬於該處理器的 inter-procedural 階層）。
   [SRC USR D1]
3. **Given** 兩個頁面，**When** 產生 inter-page 階層圖，**Then** 圖中每個頁面一個節點，加上與扁平圖跨頁節點一一對應的 domain
   節點（domain scope 的 entry／exit），以載入與儲存 storage 的邊相連（與扁平圖的跨頁邊對應）。[SRC USR D1、D9]
4. **Given** 任一上層階層節點，**When** 從程式詢問它參照的下層模型，**Then** 得到該函式／主程式／處理器／頁面的模型，且該模型的
   圖與它剛建好時相同。[SRC USR D1、D2]
5. **Given** 執行 dujs CLI，**When** 開啟 HTML 報告，**Then** inter-procedural、intra-page、inter-page 各段都顯示階層圖，原有的圖與
   pair 圖照舊顯示。[SRC USR D5]

---

### User Story 3 - 清理 known-issues §9 的程式風格與紀錄 (Priority: P3)

維護者讀 `lib/` 時，看到的 JSDoc 緊貼它說明的函式、沒有只為舊測試保留的死函式、語法風格一致；LGPL 派生檔的修改紀錄
逐項列出實際的修改。[SRC KI §9]

**Why this priority**: 不影響行為，但本 feature 會大量改動 `defuseanalyzer.js` 與相關檔案，順手處理成本最低。[SRC USR D6]

**Independent Test**: 只完成本 story 時，全部既有測試、golden 與 lint 通過；§9 列的四點逐項可檢查。

**Acceptance Scenarios**:

1. **Given** `lib/esgraph/index.js` 的檔頭與 `THIRD_PARTY_NOTICES.md`，**When** 檢查修改紀錄，**Then** `expressionThrows` 的 null 防護與
   `createNodes` 把 `ClassDeclaration` 當葉節點兩項各有一筆紀錄。[SRC KI §9]
2. **Given** `lib/dujs/defuseanalyzer.js`，**When** 檢查每段 JSDoc，**Then** 每段都緊接在它說明的函式之前，新增的 helper
   （`isFunctionExpression`、`getDefinedVariables`、`computeKILLSet`、`useLoopHead`／`useNestedLoopHead`、`useClassHead`）各有自己的 JSDoc。[SRC KI §9]
3. **Given** 分析程式，**When** 搜尋 `findKILLSet`，**Then** 已移除，KILL 只由 `computeKILLSet` 計算，沒有測試依賴舊函式。[SRC KI §9]
4. **Given** `lib/dujs/jsparser.js`，**When** 檢查 catch 子句，**Then** 有綁定變數（`catch (e)`），與 `lib/` 其餘程式的風格一致。[SRC KI §9]
5. **Given** known-issues 文件，**When** 本 feature 完成，**Then** §9 標為已修正，§13、§16 註明「共用節點被改動」的部分已修正、§16 的
   呼叫順序語意仍保留，§18 註明移到 stage 2。[SRC KI §9、§13、§16、§18；USR D4]

---

### Edge Cases

- 扁平圖的節點編號：dot 檔的節點編號來自建立節點的順序。重新展開時，敘述節點的編號 MUST 與下層模型中的同一節點相同，
  上層新增的節點（呼叫返回、LOOP、LOOP 返回等）MUST 依重構前的建立順序取得相同編號；golden 差異一律視為行為改變，
  不得以更新既有 golden 放行。[SRC USR D3]
- 同一個函式被多處呼叫：現況扁平圖中被呼叫函式只有一份節點、各呼叫點都接到同一份（context-insensitive），本 feature 保留此結構；
  每個呼叫點各自展開一份屬於 stage 2 的範圍。[SRC USR D3]
- 遞迴與互相呼叫：階層圖中以呼叫邊形成環；展開扁平圖時不得無窮展開，結構與現況相同。
- 呼叫鏈：同一節點連續呼叫多個函式（例如 class 靜態成員先執行再呼叫函式）時，前一個呼叫返回節點是下一個呼叫的呼叫點，
  與現況相同（`tests/dujs/classfields.js`、`tests/dujs/reviewfixes.js`）。
- 決策節點上的呼叫（§16）：呼叫仍在決策節點之前執行、條件的 use 仍在被呼叫函式之後（含 §16 的「參數同名使 use 消失」）；
  本 feature 只移除「改動共用節點」的副作用，不改語意。[SRC KI §16]
- 下層分析時預先設定的資料（內建物件、區域變數預設值、函式宣告的定義等，在 intra-procedural 初始分析時設定）MUST 在展開的扁平圖中
  同樣生效，否則上層結果會改變。
- 沒有事件處理器、沒有呼叫、沒有 storage 存取的頁面：階層圖仍輸出（只有主程式／LOOP，或只有頁面節點）。
- known-issues §14、§15、§17、§18 的現有行為原樣保留，本 feature 不修正。[SRC KI §18；USR D4]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**：intra-procedural 模型建好並完成初始分析後，其圖（節點集合、每個節點的出入邊與邊種類、entry／exit）MUST 不再被任何
  上層模型的建立或分析改動。[SRC REF §⑥；KI §13、§16；USR D1]
- **FR-002**：inter-procedural 與 intra-page 模型同樣 MUST 不被更上層改動；上層 MUST 以「參照下層模型」表示自己的節點，不得改接下層的邊。
  [SRC USR D1]
- **FR-003**：每個模型 MUST 保有自己分析得到的每節點結果（reach-in、reach-out、GEN、KILL、c-use、p-use）；分析另一個模型不得
  改變已分析模型的這些結果。[SRC REF §⑥]
- **FR-004**：inter-procedural 模型 MUST 以函式為節點、呼叫為邊；intra-page 模型 MUST 以主程式、各事件處理器、LOOP 為節點；
  inter-page 模型 MUST 以各頁面與 domain／storage 為節點。各上層節點 MUST 能取得它參照的下層模型。[SRC USR D1]
- **FR-005**：def-use 分析 MUST 在由階層重新展開的扁平敘述層級圖上進行；展開結果的結構（節點、邊、邊種類、節點順序、節點編號）
  MUST 與重構前相同，因此 def-use pair 與重構前相同。[SRC USR D2、D3]
- **FR-006**：既有輸出（ES5 與 ES2015+ golden fixture 的每個 .dot 檔，含節點編號）MUST 與重構前逐位元組相同；全部既有測試 MUST 通過且
  不得修改其預期 pair（測試因 API 改變而需改寫存取方式者除外）。[SRC USR D3]
- **FR-007**：測試輔助工具（`tests/helpers/analyze.js`）MUST 移除「LOOP 節點的分支當成 exit」與「插入的呼叫節點當成決策節點」兩個
  繞路，以及模型建構中只為此存在的標記（`dujsDecisionCalledBefore`）；相關契約文件同步更新。[SRC KI §13、§16]
- **FR-008**：每個 inter-procedural、intra-page 模型與 inter-page 模型 MUST 另外輸出一個階層圖 .dot 檔，放在該模型既有輸出所在的目錄；
  檔名格式由 plan 決定並記錄。階層節點的標籤 MUST 能辨識單位（函式／scope 名稱、LOOP、頁面編號、domain），邊 MUST 標示種類
  （呼叫、事件、返回、載入／儲存 storage）。階層圖 MUST NOT 含呼叫返回與 LOOP 返回節點，返回關係以返回邊表示；inter-page 階層圖的
  domain 部分 MUST 與扁平圖的跨頁節點一一對應。[SRC USR D5、D8、D9]
- **FR-009**：HTML 報告 MUST 在 inter-procedural、intra-page、inter-page 各段顯示對應的階層圖；既有內容與順序不變。[SRC USR D5]
- **FR-010**：golden MUST 加入新的階層圖 .dot 檔（ES5 與 ES2015+ fixture），並經人工核對節點與邊的對應；新增的 golden 檔以獨立清單
  記錄，與「既有檔逐位元組不變」分開驗證。golden MUST 新增（或擴充）會產生 inter-procedural 輸出的 fixture：其扁平輸出先以重構前的程式
  產生並入 golden（重構後逐位元組不變），其階層圖一併入 golden。[SRC USR D5、D7]
- **FR-011**：known-issues §9 的四點 MUST 處理：(a) `lib/esgraph/index.js` 檔頭與 `THIRD_PARTY_NOTICES.md` 各補兩筆修改紀錄；
  (b) `defuseanalyzer.js` 的 JSDoc 移回緊接其函式，新 helper 補 JSDoc；(c) 移除 `findKILLSet`；(d) `jsparser.js` 改用有綁定的 catch。
  [SRC KI §9]
- **FR-012**：`docs/known-issues.md` MUST 更新：§9 標為已修正；§13、§16 註明共用節點被改動的部分已修正、測試輔助工具的繞路已移除，
  §16 的呼叫順序語意保留待 stage 2；§18 註明移到 stage 2。[SRC KI §9、§13、§16、§18；USR D4]
- **FR-013**：lint MUST 通過，且不得在 `eslint-suppressions.json` 新增抑制項目。[G-1]
- **FR-014**：若修改到 LGPL 派生檔（如 `lib/esgraph/index.js`、`lib/esgraph/flownode.js` 中源自 esgraph 的部分），MUST 在檔頭與
  `THIRD_PARTY_NOTICES.md` 補修改紀錄；新模組一律採 MIT 授權檔頭。[G-1]

### Key Entities

- **模型（Model）**：一個層級的一個單位的資料流模型；有自己的圖、相關 scope、def-use pair，以及（本 feature 起）自己的每節點分析結果。
- **階層節點**：上層模型中的一個節點，代表一個下層單位（函式、主程式、事件處理器、頁面、domain）或結構節點 LOOP；單位節點參照
  它所代表的下層模型。呼叫返回與 LOOP 返回不是階層節點，在階層圖中以返回邊表示（D8）；它們仍存在於扁平圖。
- **階層圖**：上層模型由階層節點與種類化的邊組成的圖；用於輸出與閱讀，不直接用於 def-use 分析。
- **扁平圖**：由階層圖重新展開、只含敘述層級節點（加上呼叫／返回／LOOP 等結構節點）的圖；def-use 分析在它上面進行，結構與重構前相同。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**：ES5 與 ES2015+ golden 的既有 .dot 檔 100% 逐位元組相同（以重構前 `develop` merge bf07818 的輸出為準）。
- **SC-002**：全部既有測試通過，預期 pair 0 處修改；測試輔助工具中處理共用節點的繞路 0 處。
- **SC-003**：在所有 fixture 與既有測試程式上，四層建完後每個下層模型的圖與每節點分析結果，與建好當下相比 0 處差異。
- **SC-004**：每個 inter-procedural、intra-page、inter-page 模型都有 1 張階層圖輸出，並出現在 HTML 報告中。
- **SC-005**：known-issues §9 的四點 100% 處理；lint 0 錯誤、0 新增抑制。

## Assumptions

- 「展開結果與重構前相同」以 golden 與既有測試為驗證依據；現有 fixture 未產生 inter-procedural 輸出，依 D7 新增 fixture 補上
  inter-procedural 層的 golden，並以既有單元測試與 US1 新增的不變性測試補足。
- 階層圖的具體版面（顏色、形狀）比照既有 .dot 輸出的風格，由 plan 決定。
- 公開的 CLI 參數與輸出目錄結構不變，只多出階層圖檔案；`node >= 24` 等執行環境沿用專案現況。
- stage 2（summary-based 分析、§18、§16 的順序語意）不在本 feature 範圍。
