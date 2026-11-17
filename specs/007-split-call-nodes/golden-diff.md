# Golden 差異紀錄（feature 007，FR-008、SC-003、SC-004）

基準：`edc22d5`（develop；`diffcheck.js golden` 未給 `--base` 時讀此行；rebase 到新 develop 時改此行並整表重產，contracts/diff-check.md §1）

行號說明：dot 標記的行號＝fixture 行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」「重複列數」「釘選與簽核」「class static 不再連結」為機器區塊（`node specs/007-split-call-nodes/tools/diffcheck.js golden --verify specs/007-split-call-nodes/golden-diff.md` 核對），
每個改 golden 的階段（US1–US4）以 `UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js` 更新 golden 後，以 `--report` 重產整表（相對 `edc22d5` 的累積結果）後補「說明」。
pair 以 (case, 頁, 檔案／層級, 變數) 的集合比對（重複列不產生差異），重複列數另表列出、不設門檻（KI §43）；基準側的 `call[_x]`／`callReturn[_x]` 依基準側 `*.matching.json` 改寫成 `call (<行>)`／`callReturn (<行>)` 後再比對（只在本 branch 同一模型的 `.graph.dot` 有 `label="call (` 時改寫，contracts/diff-check.md §1），只因改寫而消失的差異歸 `標記`。
`連結`、`求值順序`、`返回後例外` 與 KI 類（`§37`、`§38`、`§41`、`§43`、`§44`、`§46`）為釘選類別：「釘選與簽核」表的「說明」欄必填，簽核欄 implementer 只填「草擬，待簽核」，使用者於 golden 收尾後、PR 前簽核。
`標記`、`共通` 為機械判定，不釘選。`intra-procedurals/*` 的 pair 差異一律失敗（FR-006）。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected-interprocedural | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 共通（段0例外） | — | 段0例外：n99 → n109（c3） |
| 2 | expected-interprocedural | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 共通（段0例外） | — | 段0例外：n36 → n46（c3） |
| 3 | expected-interprocedural | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 共通（段0例外） | — | 段0例外：n36 → n46（c3） |

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 007 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| expected | page0 | intra-procedurals/2.dupairs.dot | 4 | 4 | 0 |
| expected-es2015 | inter-page | 0.dupairs.dot | 1 | 1 | 0 |
| expected-es2015 | page0 | intra-pages/0.dupairs.dot | 1 | 1 | 0 |
| expected-es2015 | page0 | intra-procedurals/5.dupairs.dot | 1 | 1 | 0 |
| expected-fixes004 | inter-page | 0.dupairs.dot | 4 | 4 | 0 |
| expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | 4 | 4 | 0 |
| expected-fixes004 | page0 | intra-pages/0.dupairs.dot | 4 | 4 | 0 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|

## class static 不再連結

| case | 頁 | 行 | static scope | 位置種類 | 相關 ± pair 筆數 |
|------|----|----|--------------|----------|------------------|
| 無 |  |  |  |  |  |

## Setup

### 變化說明

lib 與 `edc22d5` 相同（T001 以 `git diff --quiet edc22d5 -- lib` 確認），golden 未更新；`diffcheck golden --verify` 零差異，重複列數兩側相同。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| （全部） | （無） | 不變 | Setup 不改 golden |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| （無） |  |  |  |  |

## Foundational

### 變化說明

新增 `lib/dujs/callsplit.js`（SegmentPlan、後序、呼叫點列舉、歸段、拋錯判定）、`callresolver.calleeScopesOfExpression`、`findGENSet` 記 `generatedAt`、FlowNode 新屬性、esgraph 的 `discriminantThrowTarget` 屬性與 `throwTypes` 匯出、`branchsplitter.isInsideLoopBody` 匯出；
皆未接到模型建構（`modelbuilder` 未呼叫 `callsplit`），esgraph 只記屬性、不連邊，golden 未更新；`diffcheck golden --verify` 零差異，重複列數兩側相同。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| （全部） | （無） | 不變 | Foundational 行為不變，不改 golden |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| （無） |  |  |  |  |

（本階段只新增測試，未改動既有測試的期望；`tests/dujs/methodcalls.js` 新增「should keep calleeScopesOf of new A().m() unchanged in this phase」釘住 T037 之前的 `calleeScopesOf` 行為。）

## US1

### 變化說明

既有呼叫點（`astNode` 本身是呼叫／`new` 的節點、欄位初始化式的 `return` 引數、class static）改依 SegmentPlan 分段（`callsplit.planOf(node, scopeTree, callresolver.stagedCallSite)`）：
段 0 帶呼叫前的 GEN／USE（`f(x = 1);` 的 `x = 1` 在 CALL 上），返回後段帶其後的 GEN／USE；決策節點中呼叫前讀到的 p-use 記為延後 p-use，以決策節點的 `true`／`false` 產生 pair；
`summary.summaryGraphOf` 併入延後 p-use；class 名稱位置規則取代 `keepGenerateAtCallSite`、`splitByInnerClassName`；前插 CALL（段 0）新增 exception 邊（其餘 exception 邊維持 develop 位置）。
另依 DECISION 007：`callsplit.evaluatedExpressionsOf` 只對「留在 `case` 節點內」的 test（未拆分或拆分後的末端運算元）回傳空，branchsplitter 自 `case` test 拆出的非末端運算元決策節點照常求值（與 develop 相同，`case g() && 1:` 的 `g()` 連結）。

- golden 結果：**無任何 pair 差異**（`求值順序` 類 0 筆；golden fixture 中沒有引數或條件在呼叫前定義、且被呼叫端讀取的變數）。唯一差異是 `expected-interprocedural` 的 3 個 `.graph.dot` 各多一條 `CALL -> 例外目標` 的 exception 邊（同一個 `if (…())` 決策節點在 inter-procedural、intra-page、inter-page 三層；record `c3`，`isReady()`，`beforeDecision: true`），不改任何 pair、`*.matching.json` 不變。
- 這 3 筆歸 `共通`（子標 `段0例外`，DECISION 008 擴充 contracts/diff-check.md §2 `共通` 的第三個成立條件，diffcheck 機械判定：新增邊皆為 exception、來源為 `beforeDecision` record 的 `callNode`、目標為其 `exceptionalReturn`、基準側原決策節點已有同目標 exception 邊、每 record 一條、無 pair／row 差異、無刪邊／改向）。說明欄由 `--report` 自動列出「callNode → 目標（record id）」：inter-page `n99 → n109（c3）`，inter-procedurals/1 與 intra-pages/0 皆 `n36 → n46（c3）`。無釘選列，未出現 `返回後例外`。
- 類別計數：`共通` 3（皆 `段0例外`）；`求值順序`、`連結`、`返回後例外`、`§44`／`§46`、`標記` 皆 0。
- 過渡失真 `new F().m(x = 1)`（US1 只留外層 `.m()`，`x = 1` 落在段 0，歸 `求值順序`，T037／T038 後修正）：golden 與 MDN 皆 0 例。
- for-in/of 右側 class static 的過渡差異（US1–US2 不連結，US3 恢復；plan「階段性的呼叫點篩選」）：golden 與 MDN 皆 0 例（0 筆 − 項）。
- 「class static 不再連結」（KI §44／§46 行為變更）：實例數 golden 0 例（機器區塊表為「無」）、MDN 0 例（`diffcheck mdn --report` 無差異，33 檔 CLI exit code 皆 0→0）；行為以 `tests/dujs/splitcallnodes.js` 的 T066 五例釘住。
- MDN（`diffcheck mdn --report`，僅檢查，mdn-diff.md 未更新）：無差異。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-interprocedural | inter-page/0.graph.dot | 37ee3d700c98 → d9d073172a9c | 前插 CALL（段 0）新增 exception 邊 |
| expected-interprocedural | page0/inter-procedurals/1.graph.dot | 1de49a9e02ee → 603fa7e33f5b | 同上 |
| expected-interprocedural | page0/intra-pages/0.graph.dot | 2a92a0d7a998 → 4d548c20d8e1 | 同上 |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| tests/dujs/expansion.js | pre-refactor characterization (probes) › a1 › keeps the def-use pairs of every inter-procedural model／of the intra-page model／of the inter-page model | `x: L4 -> L3`、`x: L4 -> L6` | `x: L2 -> L3`、`x: L2 -> L6`（`f(x = 1)` 的 `x = 1` 在 f 呼叫 k〔`x = 4`〕之前生效） | FR-002（KI §16） |
| tests/dujs/expansion.js | expansion › GEN of copies › should keep the GEN at the call-site with keepGenerateAtCallSite | `keepGenerateAtCallSite` 使 GEN 留在呼叫點 | 刪除（欄位刪除，class 名稱位置規則取代；`tests/dujs/classfields.js` T023 守門） | FR-002（R3） |
| tests/dujs/expansion.js | expansion by the builder › should connect the calls of probe a1 | `f(x = 1)` 的 `x` 定義在 CALL RETURN 的 GEN、呼叫點副本 GEN 為空 | `x` 定義在呼叫點副本（CALL，段 0）的 GEN、CALL RETURN 的 GEN 為空 | FR-002 |
| tests/dujs/hierarchy.js | addCallEdge › should record keepGenerateAtCallSite on the frozen edge；should not keep the GEN at the call-site by default | Edge 帶 `keepGenerateAtCallSite` | 改為 plan／callIndex／lastOfCallSite 三個測試（有 plan 時 `beforeDecision` 依 shape、只第一條邊；無 plan 時三欄為 null） | FR-002（data-model §2） |
| tests/dujs/hierarchy.js | US1 acceptance (003 quickstart §3) › scenario 2 should keep the predecessor of the decision node L5 in the intra-procedural model | `x: L1 -> L3` | `x: L5 -> L3` | FR-002（KI §16） |
| tests/dujs/reviewfixes.js | R3 should call the callee before a decision node whose condition is a call | CALL 節點的 `next` 只有 f 的 entry | CALL 節點另有 exception 邊（與決策節點同一目標），`next` 兩個 | FR-005（前插段 0 的例外邊） |
