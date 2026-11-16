# Contract：golden 驗證（FR-006、FR-010、SC-001）

**Feature**: `003-hierarchical-models` | 檔案：`tests/golden/golden.js`、`tests/golden/manifest.json`（新）

## 1. Golden cases

| case 標題 | 頁面 | expected 目錄 |
|-----------|------|--------------|
| `Golden outputs (ES5 fixtures)` | `page0/app.js`；`page1/report.js` | `expected/` |
| `Golden outputs (ES2015+ module fixture)` | `es2015/app.js` | `expected-es2015/` |
| `Golden outputs (inter-procedural fixture)`（新） | `interprocedural/app.js` | `expected-interprocedural/` |

## 2. 每個 case 的斷言

| # | `it` | 內容 | 新／舊 |
|---|------|------|--------|
| 1 | `should generate the same set of .dot files` | 實際輸出的 .dot 清單＝expected 目錄的清單 | 舊 |
| 2 | `should generate identical contents for every .dot file` | 每個 expected 檔與實際輸出逐位元組相同 | 舊 |
| 3 | `keeps every baseline .dot file byte-identical` | 對 `manifest[case].baseline` 每一項：實際輸出存在，sha256 相同（訊息列出不同的檔名） | 新（Setup） |
| 4 | `adds exactly the listed new .dot files` | `實際清單 − keys(baseline)` 排序後＝`manifest[case].added` | 新（Setup；US2 前 `added` 為 `[]`） |
| 5 | `references the hierarchy graphs before the flat graphs in the report` | 見 [hierarchy-output.md](./hierarchy-output.md) §4 | 新（US2） |

## 3. manifest 的產生與更新規則

- `baseline`：在 Setup、任何 `lib/` 變更前，以重構前程式（`bf07818`）的輸出計算，提交後在本 feature 內**不得修改**。
- `added`：US2 加入階層圖時填入；之後新增或刪除輸出檔都必須同步修改，否則 #4 失敗。
- `UPDATE_GOLDEN=1` 仍會重建 expected 目錄（#1、#2 的基準），但不讀寫 manifest；既有檔若有差異，#3 仍失敗——golden 差異一律視為行為改變。
- stage 2（刻意改變結果）要更新 `baseline` 時，須在該 feature 的 spec／PR 記錄理由與差異（同 001 的 golden-diff 做法）。
