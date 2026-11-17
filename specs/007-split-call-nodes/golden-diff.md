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
