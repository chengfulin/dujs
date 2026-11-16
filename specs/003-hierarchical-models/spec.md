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
| US1 | REF §⑥；KI §13、§16；USR D1、D2、D3；Clarifications 2026-11-16 |
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
- **D7**（2026-11-16，spec review）：現有 golden fixture 不產生 inter-procedural 輸出；新增（不擴充既有 fixture）會產生 inter-procedural 輸出的 fixture，
  其扁平輸出以重構前的程式（`develop` merge bf07818）產生後入 golden，再隨重構驗證逐位元組不變；其階層圖一併入 golden。
- **D8**（2026-11-16，spec review）：階層圖不畫呼叫返回與 LOOP 返回節點，返回關係以返回邊表示；階層圖只有大單位節點與 LOOP。
- **D9**（2026-11-16，spec review；clarify 修正）：inter-page 階層圖的 domain／storage 部分與現有扁平圖的跨頁節點一一對應；現況 domain 圖是
  單一 localStorage 節點兼 entry 與 exit，因此階層圖中 domain 為一個節點。

## Clarifications

### Session 2026-11-16

- Q: 扁平圖中的節點和下層模型的節點是什麼關係？（dot 的節點編號＝圖的 entry 節點編號＋陣列位置；inter-page 的 entry 是最後建立的
  domain 節點，其編號＝之前建立過的節點總數）→ A: 展開時複製下層節點；複本沿用原節點的編號、行號、標籤路徑等屬性，**不消耗**節點
  計數器。上層新增的呼叫、呼叫返回、LOOP、LOOP 返回節點每個只建立一次，建立順序與現況相同。分析在複本上進行，pair 指向複本，
  各模型的每節點結果因此自然分開。
- Q: 階層模型要保留哪些資訊？→ A: 呼叫邊帶有呼叫點節點、在該節點的呼叫順序（同節點連續呼叫多個函式時的鏈接順序）、是否插在決策
  節點之前、被呼叫的模型參照；扁平圖完全由階層展開（FR-005 不放寬）。
- Q: 建 intra-page 模型找事件處理器時讀哪個模型的 reach-in？→ A: 讀「包含該節點的最頂端 inter-procedural 模型」（沒有則為該節點的
  intra-procedural 模型）的結果，完全重現現況「最近一次分析」的語意（仲裁 2026-11-16 修訂；原答案「讀正在搜尋的模型」在處理器同時是
  被呼叫函式、且其內以識別字註冊外部處理器時會改變輸出）。解析被呼叫的函式一律讀 intra-procedural 的結果（與現況相同）。若 golden 或既有
  測試仍出現差異，停下請使用者裁決。
- Q（仲裁 N1）: 現況 inter-procedural 子模型分析時會沿共用節點的邊漏到外層（子模型的根函式被外層呼叫兩次以上或在迴圈內呼叫時，子模型出現外層
  定義的 pair），要不要重現？→ A: 視為缺陷、不重現：子模型只分析自己展開的圖；`docs/known-issues.md` 新增一節記錄此現象並標為本 feature 已修正；
  新增的 fixture 不得含此型態；既有測試若因此出現差異，停下請使用者裁決。
- Q: 展開時的呼叫環防護如何驗證？→ A: 以手工建立的環狀階層寫單元測試，驗證展開會終止；需要可手動建立階層的入口。
- Q: 每個模型的每節點分析結果是否為公開介面？→ A: 是，模型提供唯讀的每節點結果查詢（reach-in、reach-out、GEN、KILL、c-use、p-use），
  測試與 stage 2 共用；介面形狀由 plan 決定。
- 依 SC-002 決定：FR-006 的測試例外只允許改寫取值方式（因 API 改變），預期 pair 與斷言的預期值一字不動。
- 依現況決定（仲裁 H5）：現況可解析的呼叫是「節點本身就是呼叫運算式（陳述式 `f();` 或整個條件式 `if (f())`），callee 為識別字，且其函式定義
  在呼叫端自己的 intra-procedural 分析中可達」（含 `var f = function(){}; f();`）；`var a = f();` 不可解析。
- Q: 階層圖的邊與報告版面？→ A: 同一對單位、同一種邊只畫一條；domain 為一個節點（D9）；HTML 報告各段把階層圖放在扁平圖之前，既有內容
  彼此的相對順序不變。
- 依現況決定（clarifier H5）：現有 fixture 只能「新增」，不得擴充（擴充會改變既有 golden）。新 fixture 與驗收情境照現況可解析的呼叫寫法
  撰寫（見下方仲裁 H5 條），此限制本身不在本 feature 修正。新增一個 ES5 fixture 即可（inter-procedural 的建模與語法版本無關）。
- 依現況決定（clarifier M1、M2）：現況的呼叫解析不會形成呼叫環（自遞迴、互相呼叫都不產生環）；沒有任何可解析呼叫的頁面沒有
  inter-procedural 模型，也就沒有該層的階層圖。
- 依現況決定（clarifier M4）：階層結構本身與「上層節點取得下層模型」歸入 US1（它是 US1 的手段）；US2 只負責輸出（.dot 與 HTML）。

### 延後釐清（plan 必答）

- golden 測試比對「相同 .dot 檔集合」與 `UPDATE_GOLDEN` 重建目錄的方式，如何同時驗證「既有檔逐位元組不變」與「新增檔清單」（clarifier M5e）。
- HTML 報告以 `<img>` 引用由 Graphviz 產生的圖檔；US2 驗收情境 4 以 HTML 內容（引用了階層圖）驗證，不依賴 Graphviz 是否安裝（clarifier M5f）。
- `scope.lastReachIns` 是每次分析覆寫的全域狀態（目前只寫不讀），處置方式；`tests/dujs/branchsplit.js` 斷言 `dujsDecisionCalledBefore`，隨
  FR-007 改寫（clarifier I1）。

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
分析結果和建好當下的快照相同；能從程式取得每個上層節點參照的下層模型；測試輔助工具的兩個繞路移除後，既有測試的預期 pair 不變。

**Acceptance Scenarios**:

1. **Given** `var a = 1; if (a) { a = 2; }`，**When** 四層都建完，**Then** 頁面的 intra-procedural 模型裡 `L2` 的 false 分支仍指向頁面的
   exit 節點（不是 LOOP 節點），且其 def-use pair 仍為 `a: L1 -> L2>exit:F`。[SRC KI §13]
2. **Given** known-issues §16 的範例（`if (f(x = 1)) { x = 2; }`），**When** 四層都建完，**Then** 頁面的 intra-procedural 模型裡進入
   決策節點 `L5` 的邊仍來自它原本的前驅（不是插入的呼叫節點）；inter-procedural 模型仍是「前驅 → 呼叫 → 被呼叫函式 → 呼叫返回 →
   決策節點」，pair 與現況相同（§16 的順序語意不變，見 Edge Cases）。[SRC KI §16]
3. **Given** 任一 fixture，**When** 四層都建完並分析完，**Then** 每個模型的每個節點都能取得「該模型分析時」的 reach-in、reach-out、
   GEN、KILL、c-use、p-use，與只建到該層時的結果相同（比較基準是「只建到該層、尚未建任何上層」時的分析結果）。[SRC REF §⑥]
4. **Given** 測試輔助工具移除「LOOP 分支當 exit」與「插入的呼叫節點當決策節點」兩個繞路，**When** 執行全部既有測試，
   **Then** 全部通過，預期 pair 不變。[SRC KI §13、§16]
5. **Given** ES5 與 ES2015+ 的 golden fixture，**When** 重構完成，**Then** 既有的每個 .dot 檔（含節點編號與 dupairs.dot 的節點標籤，
   如 `entry_a`）與重構前逐位元組相同。[SRC USR D3]
6. **Given** 一個頁面，主程式有非決策節點的呼叫 `f();`，且有儲存 storage 的節點，**When** 四層都建完，**Then** 頁面的 intra-procedural 模型中
   該呼叫點的節點種類、GEN／KILL、出邊與建好當下相同（現況會被改型為呼叫節點、GEN／KILL 被移到呼叫返回節點、出邊被搬移）；
   intra-page 模型中頁面節點沒有因 inter-page 建模而多出儲存／載入 storage 的邊。[SRC REF §⑥]
7. **Given** 任一上層模型的節點（函式、主程式、事件處理器、頁面），**When** 從程式詢問它參照的下層模型與（呼叫邊的）呼叫點、呼叫順序、
   是否插在決策節點之前，**Then** 都能取得，且參照的下層模型圖與它剛建好時相同。[SRC USR D1；Clarifications 2026-11-16]

---

### User Story 2 - 每個上層模型都有一張階層圖 (Priority: P2)

閱讀報告的人在看 inter-procedural、intra-page、inter-page 的扁平圖之前，先看一張只有「函式／主程式／事件處理器／頁面」
等大單位的階層圖，了解有哪些單位、誰呼叫誰、哪些處理器掛在 LOOP 上、頁面之間怎麼經由 storage 相連；需要細節時再看
原本的敘述層級圖。階層結構本身在 US1 建立；本 story 只負責把它輸出成圖並放進報告。[SRC USR D1、D2、D5]

**Why this priority**: 階層結構本身是 US1 的手段；把它輸出成圖是額外的閱讀價值，不影響分析結果。

**Independent Test**: 在 US1 完成後，每個 inter-procedural、intra-page、inter-page 模型都多一個階層圖 .dot 檔，HTML 報告
引用它；既有 .dot 檔逐位元組不變；新的 .dot 檔加入 golden 並經人工核對節點與邊。

**Acceptance Scenarios**:

1. **Given** 一段頁面程式，`f` 宣告在頁面層、`g` 宣告在 `f` 內，主程式以 `f();`、`f` 以 `g();` 呼叫（現況可解析的寫法，見 Clarifications），
   **When** 產生 inter-procedural 階層圖，**Then** 圖中有主程式、`f`、`g` 三個節點，以呼叫邊 主程式 → `f` → `g` 相連（返回以返回邊表示），
   沒有敘述節點，同一對單位同一種邊只有一條。[SRC USR D1、D8；Clarifications 2026-11-16]
2. **Given** 一個頁面註冊了兩個事件處理器，**When** 產生 intra-page 階層圖，**Then** 圖中有主程式、LOOP、兩個處理器節點，主程式接到
   LOOP、LOOP 以事件邊接到各處理器、處理器返回 LOOP；處理器內呼叫的函式不出現在這張圖（屬於該處理器的 inter-procedural 階層）。
   [SRC USR D1]
3. **Given** 兩個頁面，**When** 產生 inter-page 階層圖，**Then** 圖中每個頁面一個節點，加上一個 domain 節點（對應扁平圖的單一 localStorage
   節點），以載入與儲存 storage 的邊相連；同一頁面的多個儲存點只有一條儲存邊。[SRC USR D1、D9；Clarifications 2026-11-16]
4. **Given** 執行 dujs CLI，**When** 檢查產生的 HTML 報告內容，**Then** inter-procedural、intra-page、inter-page 各段都在扁平圖之前引用
   對應的階層圖，原有的圖與 pair 圖照舊引用、相對順序不變。[SRC USR D5；Clarifications 2026-11-16]

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

- 扁平圖的節點編號：dot 檔的節點編號是「圖的 entry 節點編號＋節點在陣列中的位置」，inter-page 的 entry（domain 節點）編號等於之前
  建立過的節點總數。展開用的複本與階層節點 MUST NOT 消耗節點計數器；上層新增的呼叫、呼叫返回、LOOP、LOOP 返回節點每個只建立一次、
  建立順序與現況相同；扁平圖的節點陣列順序（含現況因 `concat` 造成的重複節點）MUST 原樣重現。golden 差異一律視為行為改變，
  不得以更新既有 golden 放行。[SRC USR D3；Clarifications 2026-11-16]
- 同一個函式被多處呼叫：現況扁平圖中被呼叫函式只有一份節點、各呼叫點都接到同一份（context-insensitive），本 feature 保留此結構；
  每個呼叫點各自展開一份屬於 stage 2 的範圍。[SRC USR D3]
- 遞迴與互相呼叫：現況的呼叫解析不產生呼叫環（Clarifications）；展開仍須防護環（不得無窮展開），以手工建立的環狀階層單元測試驗證。
- 呼叫鏈：同一節點連續呼叫多個函式（例如 class 靜態成員先執行再呼叫函式）時，前一個呼叫返回節點是下一個呼叫的呼叫點，
  與現況相同（`tests/dujs/classfields.js`、`tests/dujs/reviewfixes.js`）。
- 決策節點上的呼叫（§16）：呼叫仍在決策節點之前執行、條件的 use 仍在被呼叫函式之後（含 §16 的「參數同名使 use 消失」）；
  本 feature 只移除「改動共用節點」的副作用，不改語意。[SRC KI §16]
- 下層分析時預先設定的資料（內建物件、區域變數預設值、函式宣告的定義等，在 intra-procedural 初始分析時設定）MUST 在展開的扁平圖中
  同樣生效，否則上層結果會改變；複本預設 GEN 中定義（Def）的來源節點 MUST 指向複本而非原節點，否則 dupairs.dot 會印出下層的舊標籤。
- 扁平圖中重複出現的節點 MUST 是同一個複本物件出現多次（dot 輸出以物件身分取邊端點與加標籤後綴），不是兩個不同的複本。
- 仲裁 N1 的外漏型態：子模型的根函式被外層呼叫兩次以上或在迴圈內呼叫時，重構後子模型不再含外層定義的 pair（行為修正，見 Clarifications）。
- 沒有事件處理器、沒有呼叫、沒有 storage 存取的頁面：沒有 inter-procedural 模型，也就沒有該層階層圖；intra-page 階層圖仍輸出
  （主程式與 LOOP），inter-page 階層圖仍輸出（頁面與 domain 節點）。
- known-issues §14、§15、§17、§18 的現有行為原樣保留，本 feature 不修正。[SRC KI §18；USR D4]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**：intra-procedural 模型建好並完成初始分析後，其圖（節點集合、每個節點的出入邊與邊種類、entry／exit、節點種類、scope、
  GEN／KILL 與初始分析資料）MUST 不再被任何上層模型的建立或分析改動；包含現況的 LOOP 改接（§13）、決策節點前插入呼叫（§16）、
  非決策呼叫點改型與 GEN／KILL 搬移、inter-page 新增的 storage 邊。[SRC REF §⑥；KI §13、§16；USR D1]
- **FR-002**：inter-procedural 與 intra-page 模型同樣 MUST 不被更上層改動；上層 MUST 以「參照下層模型」表示自己的節點，不得改接下層的邊。
  [SRC USR D1]
- **FR-003**：每個模型 MUST 保有自己分析得到的每節點結果（reach-in、reach-out、GEN、KILL、c-use、p-use），並提供唯讀的查詢介面；分析另一個模型不得
  改變已分析模型的這些結果。[SRC REF §⑥]
- **FR-004**：inter-procedural 模型 MUST 以函式為節點、呼叫為邊，呼叫邊 MUST 帶有呼叫點節點、在該節點的呼叫順序、是否插在決策節點之前
  與被呼叫的模型參照；intra-page 模型 MUST 以主程式、各事件處理器、LOOP 為節點；
  inter-page 模型 MUST 以各頁面與 domain（單一節點，D9）為節點。各上層節點 MUST 能取得它參照的下層模型。[SRC USR D1]
- **FR-005**：def-use 分析 MUST 在由階層重新展開的扁平敘述層級圖上進行；展開時複製下層節點，複本沿用原節點的編號與屬性、不消耗節點
  計數器，上層新增的結構節點每個只建立一次；建模時找事件處理器讀包含該節點的最頂端 inter-procedural 模型（沒有則 intra-procedural）的 reach-in，解析被呼叫函式讀
  intra-procedural 的 reach-in（Clarifications 2026-11-16）；展開結果的結構（節點、邊、邊種類、每個節點前驅／後繼的鄰接順序、節點陣列順序、節點編號）
  MUST 與重構前相同，因此 def-use pair 與重構前相同；唯一例外是仲裁 N1 的外漏現象（Clarifications），不重現。intra-page 階層 MUST 保留
  現況事件處理器清單的順序與重複（現況以 `concat` 累積、不去重），階層圖輸出時才去重。[SRC USR D2、D3]
- **FR-006**：既有輸出（ES5 與 ES2015+ golden fixture 的每個 .dot 檔，含節點編號）MUST 與重構前逐位元組相同；全部既有測試 MUST 通過且
  不得修改其預期 pair（測試因 API 改變而需改寫取值方式者除外，預期值一字不動；仲裁 N1 的差異依 Clarifications 停下裁決）。[SRC USR D3]
- **FR-007**：測試輔助工具（`tests/helpers/analyze.js`）MUST 移除「LOOP 節點的分支當成 exit」與「插入的呼叫節點當成決策節點」兩個
  繞路，以及模型建構中只為此存在的標記（`dujsDecisionCalledBefore`）；相關契約文件同步更新。[SRC KI §13、§16]
- **FR-008**：每個 inter-procedural、intra-page 模型與 inter-page 模型 MUST 另外輸出一個階層圖 .dot 檔，放在該模型既有輸出所在的目錄；
  檔名格式由 plan 決定並記錄。階層節點的標籤 MUST 能辨識單位（函式／scope 名稱、LOOP、頁面編號、domain），邊 MUST 標示種類
  （呼叫、事件、返回、載入／儲存 storage）。階層圖 MUST NOT 含呼叫返回與 LOOP 返回節點，返回關係以返回邊表示；inter-page 階層圖的
  domain 部分 MUST 與扁平圖的跨頁節點一一對應（現況為單一節點）；同一對單位、同一種邊只畫一條。[SRC USR D5、D8、D9；Clarifications 2026-11-16]
- **FR-009**：HTML 報告 MUST 在 inter-procedural、intra-page、inter-page 各段、扁平圖之前引用對應的階層圖；既有內容彼此的相對順序不變。
  [SRC USR D5；Clarifications 2026-11-16]
- **FR-010**：golden MUST 加入新的階層圖 .dot 檔（ES5 與 ES2015+ fixture），並經人工核對節點與邊的對應；新增的 golden 檔以獨立清單
  記錄，與「既有檔逐位元組不變」分開驗證。golden MUST 新增（不得擴充既有 fixture）會產生 inter-procedural 輸出的 fixture，以現況可解析的呼叫寫法撰寫、不含仲裁 N1 的外漏型態（子模型根函式被外層呼叫兩次以上或在迴圈內呼叫）與 H4 的差異型態：其扁平輸出先以重構前的程式
  產生並入 golden（重構後逐位元組不變），其階層圖一併入 golden。[SRC USR D5、D7]
- **FR-011**：known-issues §9 的四點 MUST 處理：(a) `lib/esgraph/index.js` 檔頭與 `THIRD_PARTY_NOTICES.md` 各補兩筆修改紀錄；
  (b) `defuseanalyzer.js` 的 JSDoc 移回緊接其函式，新 helper 補 JSDoc；(c) 移除 `findKILLSet`；(d) `jsparser.js` 改用有綁定的 catch。
  [SRC KI §9]
- **FR-012**：`docs/known-issues.md` MUST 更新：§9 標為已修正；§13、§16 註明共用節點被改動的部分已修正、測試輔助工具的繞路已移除，
  §16 的呼叫順序語意保留待 stage 2；§18 註明移到 stage 2；新增一節記錄仲裁 N1 的外漏現象（重現程式與條件）並標為本 feature 已修正。[SRC KI §9、§13、§16、§18；USR D4]
- **FR-013**：lint MUST 通過，且不得在 `eslint-suppressions.json` 新增抑制項目。[G-1]
- **FR-014**：若修改到 LGPL 派生檔（如 `lib/esgraph/index.js`、`lib/esgraph/flownode.js` 中源自 esgraph 的部分），MUST 在檔頭與
  `THIRD_PARTY_NOTICES.md` 補修改紀錄；新模組一律採 MIT 授權檔頭。[G-1]

### Key Entities

- **模型（Model）**：一個層級的一個單位的資料流模型；有自己的圖、相關 scope、def-use pair，以及（本 feature 起）自己的每節點分析結果。
- **呼叫邊**：inter-procedural 階層中由呼叫端單位指向被呼叫單位的邊；帶有呼叫點節點、呼叫順序、是否插在決策節點之前、被呼叫的模型參照。
- **階層節點**：上層模型中的一個節點，代表一個下層單位（函式、主程式、事件處理器、頁面、domain）或結構節點 LOOP；單位節點參照
  它所代表的下層模型。呼叫返回與 LOOP 返回不是階層節點，在階層圖中以返回邊表示（D8）；它們仍存在於扁平圖。
- **階層圖**：上層模型由階層節點與種類化的邊組成的圖；用於輸出與閱讀，不直接用於 def-use 分析。
- **扁平圖**：由階層重新展開的圖，節點是下層節點的複本（沿用編號）加上呼叫／返回／LOOP 等結構節點；def-use 分析在它上面進行，pair 指向
  複本，結構與重構前相同。

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
