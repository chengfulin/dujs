# MDN 差異紀錄（feature 007，FR-009、SC-003、SC-004）

基準：`edc22d5`（develop；MDN 基準為 Setup 於 lib＝`edc22d5` 時產生的快照 `specs/007-split-call-nodes/mdn/baseline-develop/`，含各模型的 `.dot` 與 `*.matching.json`、`exitcodes.json`、`<id>.pairs.txt`）

語料：`specs/006-eslint-scope/mdn/corpus/`（33 檔、32 個 id，`pages.json`）；本 branch 的輸出由 diffcheck 以 `node bin/dujs.js` 實跑到暫存目錄。
「淨差異」「重複列數」「釘選與簽核」「class static 不再連結」為機器區塊（`node specs/007-split-call-nodes/tools/diffcheck.js mdn --verify specs/007-split-call-nodes/mdn-diff.md` 核對），
MDN 驗證（Polish）時以 `--report` 重產整表（相對 `edc22d5` 的累積結果）後補「說明」。
pair 以 (case, 頁, 檔案／層級, 變數) 的集合比對（重複列不產生差異），重複列數另表列出、不設門檻（KI §43）；基準側的 `call[_x]`／`callReturn[_x]` 依基準側 `*.matching.json` 改寫成 `call (<行>)`／`callReturn (<行>)` 後再比對（只在本 branch 同一模型的 `.graph.dot` 有 `label="call (` 時改寫，contracts/diff-check.md §1），只因改寫而消失的差異歸 `標記`。
`連結`、`求值順序`、`返回後例外` 與 KI 類（`§37`、`§38`、`§41`、`§43`、`§44`、`§46`）為釘選類別：「釘選與簽核」表的「說明」欄必填，簽核欄 implementer 只填「草擬，待簽核」，使用者於 MDN 驗證後簽核。
`標記`、`共通` 為機械判定，不釘選。`intra-procedurals/*` 的 pair 差異一律失敗（FR-006）。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 007 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| a06-classes-snippets | inter-page | 0.dupairs.dot | 2 | 2 | 0 |
| a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | 2 | 2 | 0 |
| a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | 2 | 2 | 0 |
| s03-loops-2-finish | inter-page | 0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | page0 | intra-pages/0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | page0 | intra-procedurals/0.dupairs.dot | 8 | 8 | 0 |
| s04c-for-loop-cats | inter-page | 0.dupairs.dot | 7 | 7 | 0 |
| s04c-for-loop-cats | page0 | intra-pages/0.dupairs.dot | 7 | 7 | 0 |
| s04c-for-loop-cats | page0 | intra-procedurals/0.dupairs.dot | 7 | 7 | 0 |
| s07-gallery-finish | inter-page | 0.dupairs.dot | 2 | 2 | 0 |
| s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | 2 | 2 | 0 |
| s08-number-guessing-game | inter-page | 0.dupairs.dot | 1 | 1 | 0 |
| s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | 1 | 1 | 0 |
| s10-allowance-updater | inter-page | 0.dupairs.dot | 9 | 9 | 0 |
| s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | 9 | 9 | 0 |
| s11-calculating-squares | inter-page | 0.dupairs.dot | 4 | 4 | 0 |
| s11-calculating-squares | page0 | intra-pages/0.dupairs.dot | 4 | 4 | 0 |
| s11-calculating-squares | page0 | intra-procedurals/1.dupairs.dot | 4 | 4 | 0 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|

## class static 不再連結

| case | 頁 | 行 | static scope | 位置種類 | 相關 ± pair 筆數 |
|------|----|----|--------------|----------|------------------|
| 無 |  |  |  |  |  |

## Setup

### 變化說明

快照與本 branch 的 lib 相同（`edc22d5`）：`diffcheck mdn --verify` 零差異，重複列數兩側相同，32 個 id 的 CLI exit code 皆為 0。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| id | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|----|------|---------------------------|------|
| （全部） | （無） | 不變 | Setup 不改 lib |

## CLI exit code（develop → 本 branch，Setup 時）

| id | develop | 本 branch |
|----|---------|-----------|
| a01-oojs-1 | 0 | 0 |
| a01b-oojs-1-solution | 0 | 0 |
| a02-oojs-2 | 0 | 0 |
| a02b-oojs-2-solution | 0 | 0 |
| a03-bouncing-main | 0 | 0 |
| a04-bouncing-main-finished | 0 | 0 |
| a05-assessment-main | 0 | 0 |
| a06-classes-snippets | 0 | 0 |
| a07-prototypes-person | 0 | 0 |
| a08-prototype-chain-dowhile | 0 | 0 |
| s01-math-3-finish | 0 | 0 |
| s02-conditionals-3-finish | 0 | 0 |
| s03-loops-2-finish | 0 | 0 |
| s04a-while-loop-cats | 0 | 0 |
| s04b-do-while-loop-cats | 0 | 0 |
| s04c-for-loop-cats | 0 | 0 |
| s05-switch-example | 0 | 0 |
| s06a-exiting-loops-break | 0 | 0 |
| s06b-silly-story-finish | 0 | 0 |
| s07-gallery-finish | 0 | 0 |
| s08-number-guessing-game | 0 | 0 |
| s09 | 0 | 0 |
| s10-allowance-updater | 0 | 0 |
| s11-calculating-squares | 0 | 0 |
| s12-conditionals-2-finish | 0 | 0 |
| s13-functions-1-finish | 0 | 0 |
| s14-functions-3 | 0 | 0 |
| s15-math-1-finish | 0 | 0 |
| s16-objects-2-finish | 0 | 0 |
| s17-string-methods-3 | 0 | 0 |
| s18-target-currenttarget | 0 | 0 |
| x01-bouncing-cycle | 0 | 0 |
