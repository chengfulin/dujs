# Feature Specification: 三項小型重構（拆分 branchsplitter、FlowNode 分支欄位、usedExpressionsOf）

**Feature Branch**: `002-small-refactors`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "依重構建議頁做三項小型重構——(1) 拆分 lib/esgraph/branchsplitter.js 為 decision-finder / AST-rewriter / graph 模組；(2) FlowNode 的 split 相關欄位收成一個 split 物件，並抽出共用的 branch-label helpers；(3) 從 findUSESet 抽出 usedExpressionsOf。golden 輸出必須完全不變。PR 目標分支 develop。參考 docs/known-issues.md §13–§17。"

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| REF | 重構建議頁（外部連結；本 spec 引用的內容已摘入各 FR 與範圍決策，審閱時以本 spec 為準） https://claude.ai/artifact/RZ2tvCHqxnzYnFFTe1rgbC（PR #3 code review 後整理） | 三項重構的動機與建議做法（§② branchsplitter 拆模組、§④ usedExpressionsOf、§⑤ FlowNode 分支欄位、§7 執行順序與注意事項） |
| KI | `docs/known-issues.md` | §13–§17 的現況（本 feature 不修正，僅確認重構不改變其行為） |
| USR | 本 feature 的需求討論（2026-11-16，記錄於本 spec 的「範圍決策」） | 範圍與順序 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | REF §②、§7；USR D1、D2 |
| US2 | REF §⑤、§7；USR D1、D3、D4、D5 |
| US3 | REF §④；USR D1、D5 |

### 範圍決策（USR）

- **D1**（2026-11-16）：本 feature 只做 REF 的 ②、⑤、④ 三項純重構；REF ⑥（各模型不共用 FlowNode）分兩個後續
  feature 進行，不在本輪。golden 輸出（含 dot 檔的節點編號）必須與 `develop`（merge 9254c18）完全相同。
- **D2**：REF §② 「search* 的大 switch 改成資料表」不採用；`searchByType` 的 switch 原樣搬到 decision finder 模組，
  以單元測試保護。
- **D3**：`isWithObject` 描述的是「這個節點是 with 敘述的物件運算式」，未拆分的 with 物件節點也會設定，
  因此不收進只屬於拆分節點的 `split` 物件，維持獨立欄位（與 REF §⑤ 圖示不同，見 Assumptions）。
- **D4**：`loopRightSplit`、`discriminantSplit` 標在被保留的原節點（loop 節點、case 節點）上、不是拆分產生的
  節點，維持獨立欄位（同 REF §⑤）。
- **D5**（2026-11-16，spec review）：拆分呼叫點產生的呼叫節點與 call return 節點不帶 `split`（它們不是拆分節點），只另存標籤用的
  分支路徑；分支標籤 helper 以行號與路徑為輸入，不依賴 `split`。US3 驗收情境補上 loop 節點與一般節點的預期讀法，預期值取自
  重構前的行為。

## User Scenarios & Testing *(mandatory)*

本 feature 的使用者是 dujs 的維護者（之後修 known-issues、做分層模型 feature 的人）。三項重構都不改變任何
分析結果；價值在於：錯誤能在較小的單位重現與測試、同一件事只在一個地方定義。

### User Story 1 - 分支拆分的三個工作各自成為模組 (Priority: P1)

維護者要追查「某個運算式拆分錯誤」時，能直接拿一段原始碼的 AST，分別檢查「第一個要拆的條件是哪個節點、
哪些部分在條件前已求值」與「改寫後的各分支 AST 長什麼樣子」，不必跑完整個 def-use 分析再從 pair 反推。
目前這三件事（找條件、複製改寫 AST、在 CFG 上建節點接邊）都在同一個 687 行的檔案裡。[SRC REF §②]

**Why this priority**: 拆分邏輯是 PR #3 review 發現缺陷最多的地方（R4、R5），也是下一個 feature 要動的地方；
先讓它可分開測試，後兩項重構才有安全網。US2 要改的欄位設定也集中在這個檔案，先拆再改最省事。[SRC REF §⑤、§7]

**Independent Test**: 只完成本 story 時，全部既有測試與 golden 通過；新的單元測試能只用 AST（不建 CFG）
驗證找條件與改寫 AST 的結果。

**Acceptance Scenarios**:

1. **Given** 一段含 `?:`、`&&`、`||`、`??` 的運算式的 AST，**When** 直接呼叫 decision finder，**Then** 得到第一個
   要拆的條件節點與在它之前已求值的運算式，不需要建立任何 CFG 節點。[SRC REF §②]
2. **Given** 一個決策節點與要替換的分支值，**When** 直接呼叫 AST rewriter，**Then** 得到改寫後的 AST 副本，
   原 AST 不被修改。[SRC REF §②]
3. **Given** 拆分完成後的程式，**When** 執行全部測試與 golden 比對，**Then** 結果與重構前完全相同。[SRC REF §7；USR D1]
4. **Given** 其他模組使用拆分功能的方式（`split(entryNode, { expressionThrows })`），**When** 重構完成，
   **Then** 呼叫端不需任何修改。[SRC REF §②]

---

### User Story 2 - 拆分節點的欄位收成一個物件，分支標籤只在一處定義 (Priority: P2)

維護者看到一個流程節點時，用一個欄位就能判斷「這是不是拆分產生的節點」，並在同一處取得它的分支路徑、
原敘述與條件前已求值的運算式；分支標籤（`L<行>:<路徑>`、dot 檔的 `:<路徑>` 後綴）的字串格式只在一個地方
定義，產生 dot 輸出、測試輔助工具與拆分程式都呼叫它。[SRC REF §⑤]

**Why this priority**: 目前要從「分支路徑是不是空字串」間接推斷是否為拆分節點，標籤格式散在三個檔案；
不影響正確性，但下一個 feature（分層模型）會大量讀這些欄位。[SRC REF §⑤]

**Independent Test**: 只完成本 story 時，全部既有測試與 golden 通過；新的單元測試驗證未拆分節點的 `split` 為空、
拆分節點的 `split` 帶有路徑／原敘述／已求值運算式，以及標籤 helper 對各種節點的輸出。

**Acceptance Scenarios**:

1. **Given** 一個沒有被拆分的節點，**When** 讀取它的拆分資訊，**Then** 得到「無」（null）。[SRC REF §⑤]
2. **Given** 由 `x = c ? a : b` 拆出的決策節點與兩個葉節點，**When** 讀取它們的拆分資訊，**Then** 決策節點與葉節點都帶有
   原敘述與分支路徑（決策節點路徑為空字串、葉節點為 `T`／`F`），決策節點帶有條件前已求值的運算式。[SRC REF §⑤]
3. **Given** 拆分呼叫點產生的呼叫節點與 call return 節點，**When** 產生 dot 輸出與測試標籤，**Then** 標籤與重構前相同。
   [SRC KI §15；USR D1]
4. **Given** 分支標籤的格式，**When** 搜尋程式碼中組合分支標籤字串的地方，**Then** 只有一處定義，其他地方都呼叫它。
   [SRC REF §⑤]
5. **Given** with 敘述的物件節點與 for-in/for-of、switch 被拆分的原節點，**When** 重構完成，**Then** 這些節點的對應旗標
   行為不變。[SRC USR D3、D4]

---

### User Story 3 - 「要讀哪些運算式」與「運算式讀了哪些變數」分開 (Priority: P3)

維護者要修改某種節點的 use 規則時（例如之後修 known-issues §11），能在一個獨立的函式裡看到「這種節點要讀哪些運算式、
各以 c-use 還是 p-use 讀」，並直接對它寫單元測試；找 USE 集合的函式只負責把運算式轉成被讀的變數。[SRC REF §④]

**Why this priority**: 目前這些特例都有測試保護、尚未造成缺陷；價值在下一次修改。[SRC REF §④]

**Independent Test**: 只完成本 story 時，全部既有測試與 golden 通過；新的單元測試能對決策節點、拆分葉節點、
with 物件節點、switch case 節點、for-in/for-of loop 節點，直接檢查「要讀的運算式與讀法」而不跑 worklist。

**Acceptance Scenarios**:

1. **Given** 一個決策節點，**When** 詢問它要讀的運算式，**Then** 條件以 p-use 讀、條件前已求值的運算式以 c-use 讀。[SRC REF §④]
2. **Given** 一個拆分葉節點或 with 物件節點，其運算式是單一識別字，**When** 詢問它要讀的運算式，**Then** 該識別字以 c-use 讀。
3. **Given** 一個 discriminant 沒有被拆分的 switch case 節點，**When** 詢問它要讀的運算式，**Then** 包含 discriminant，以 p-use 讀。
4. **Given** 一個 for-in/for-of loop 節點，**When** 詢問它要讀的運算式，**Then** 包含左側解構的預設值與計算鍵、左側成員存取的
   物件，以 c-use 讀；右側（被迭代的物件）只在沒有被拆分時包含，同樣以 c-use 讀。[SRC USR D5]
5. **Given** 一個一般節點（非決策、非拆分葉、非 with 物件、非 case、非 loop），**When** 詢問它要讀的運算式，**Then** 得到該節點的
   astNode，以 c-use 讀；astNode 為單一識別字（`a;`）時不讀。[SRC USR D5]
6. **Given** 全部既有 def-use 測試與 golden，**When** 重構完成，**Then** 每個節點的 c-use／p-use 集合與重構前相同。[SRC USR D1]

---

### Edge Cases

- 節點建立順序改變會讓 dot 檔的節點編號順移：拆模組時建立節點的順序必須保持，golden 差異一律視為行為改變，
  不得以更新 golden 放行。[SRC REF §7]
- 拆分節點再被拆分（巢狀條件）時，`split` 的路徑與原敘述沿用外層的值，與重構前的 `branchPath`／`splitOrigin` 相同。
- 由拆分呼叫點產生的呼叫節點與 call return 節點不是拆分節點，但其分支標籤必須維持重構前的輸出。[SRC KI §15]
- known-issues §13–§17 記錄的現有錯誤行為在重構後必須原樣保留（含其 golden 與測試），本 feature 不修正它們。[SRC KI §13–§17]
- 性質測試：固定 seed 下全部通過，並以較大的執行次數再跑一次也全部通過。[SRC REF §7]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**：分支拆分的程式 MUST 分成三個模組：decision finder（只讀 AST，找第一個要拆的條件與條件前已求值的部分）、
  AST rewriter（複製並改寫 AST，不修改輸入）、graph 模組（建立流程節點並接邊）。前兩者 MUST NOT 依賴流程節點。[SRC REF §②]
- **FR-002**：拆分功能對外的呼叫方式（`split(entryNode, { expressionThrows })` 與其所在模組路徑）MUST 不變。[SRC REF §②]
- **FR-003**：decision finder 與 AST rewriter MUST 各有直接以 AST 為輸入的單元測試，涵蓋 `?:`、`&&`、`||`、`??`、邏輯指派、
  呼叫、成員存取、物件字面值等求值順序規則（001 spec 的 D12：在條件之前已求值的部分留在決策節點、其餘隨葉分支複製；
  例如成員存取的物件與計算鍵先求值，呼叫的 callee 隨葉複製）。預期值取自重構前的行為。[SRC REF §②]
- **FR-004**：流程節點 MUST 以單一 `split` 欄位表示拆分資訊：未拆分節點為 null；拆分產生的節點為一個物件，含分支路徑、
  原敘述、條件前已求值的運算式。原本分散的 `branchPath`、`splitOrigin`、`preEvaluated` 三個欄位 MUST 移除，所有讀寫處改用
  `split`。[SRC REF §⑤]
- **FR-005**：`isWithObject`、`loopRightSplit`、`discriminantSplit` MUST 維持為獨立欄位，行為不變。[SRC USR D3、D4]
- **FR-006**：分支標籤的字串格式（路徑後綴、`L<行>:<路徑>` 標籤、路徑延伸一個分支）MUST 由流程節點模組旁的共用 helper
  提供；dot 輸出、測試輔助工具與拆分程式 MUST 呼叫它，不得自行組字串。[SRC REF §⑤]
- **FR-007**：MUST 從找 USE 集合的函式抽出一個獨立函式（`usedExpressionsOf`），依節點種類回傳「要讀的運算式與各自的讀法
  （c-use／p-use）」；找 USE 集合的函式只負責把運算式轉成被讀的變數。[SRC REF §④]
- **FR-008**：`usedExpressionsOf` MUST 有直接的單元測試，涵蓋決策節點、拆分葉節點、with 物件節點、switch case 節點、
  for-in/for-of loop 節點與一般節點。[SRC REF §④]
- **FR-009**：重構後 golden 輸出（ES5 與 ES2015+ fixture，含 dot 檔節點編號）MUST 與重構前逐位元組相同；全部既有測試 MUST
  通過且不得修改其預期結果（測試因欄位改名而需改寫存取方式者除外，預期值不變）。[SRC REF §7；USR D1]
- **FR-010**：lint MUST 通過，且不得在 `eslint-suppressions.json` 新增抑制項目。
- **FR-011**：若修改到 LGPL 派生檔（如 `lib/esgraph/index.js`），MUST 在檔頭與 `THIRD_PARTY_NOTICES.md` 補修改紀錄；新拆出的
  模組採 MIT 授權檔頭。[SRC REF §7]

### Key Entities

- **拆分資訊（split）**：只屬於拆分產生的流程節點（呼叫節點與 call return 節點不帶，D5）；含分支路徑（`T`／`F` 序列，決策節點為空字串）、原敘述（被拆分的整個
  敘述的 AST）、條件前已求值的運算式（僅決策節點非空）。
- **分支標籤**：由行號與分支路徑組成的節點文字標籤，用於 dot 輸出、測試的 pair 記法與 README 公開的輸出格式。
- **要讀的運算式（used expression）**：一個運算式加上讀法（c-use／p-use），由節點種類決定。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**：golden 比對 0 個差異（全部 fixture 的所有輸出檔與重構前逐位元組相同）。
- **SC-002**：全部既有測試通過（重構前 627 個以上），新增的單元測試全部通過；性質測試在固定 seed 與 1000 次執行下皆通過。
- **SC-003**：原拆分檔案拆成三個模組後，每個模組少於 350 行（plan 量測後若不可行，須在 plan 記錄理由與實際上限），且 decision finder 與 AST rewriter 不引用流程節點模組。
- **SC-004**：組合分支標籤字串的程式碼只出現在 1 個地方（目前 3 處）。
- **SC-005**：找 USE 集合的函式中不再出現依節點種類決定讀哪些運算式的判斷（決策、拆分葉、with 物件、switch discriminant、
  loop 右側），這些判斷全部移到 `usedExpressionsOf`。
- **SC-006**：lint 0 錯誤，`eslint-suppressions.json` 的項目數不增加。

## Assumptions

- 三項重構依 US1 → US2 → US3 的順序進行，每個 story 各自一個 commit，golden 在每個 story 結束時都必須相同。
- 移除 `branchPath`、`splitOrigin`、`preEvaluated` 存取子不保留相容別名：它們只在 dujs 內部與測試使用，README 只公開標籤格式，
  不公開這些欄位。
- `isWithObject` 不收進 `split`（D3）：REF §⑤ 的圖示把它列入，但未拆分的 with 物件節點也會設定此旗標，收進只屬於拆分節點的
  物件會讓「`split` 為 null 即未拆分」的語意不成立。
- 由拆分呼叫點產生的呼叫節點與 call return 節點不帶 `split`，只沿用呼叫點的分支路徑作為標籤用途（D5）；輸出 MUST 不變。
- `npm run doc` 產生的 API 文件隨欄位調整更新，不另行維護相容說明。
- 新模組檔名沿用 REF §② 的建議：`lib/esgraph/decisionfinder.js`、`lib/esgraph/astrewriter.js`，graph 部分保留在
  `lib/esgraph/branchsplitter.js`。
