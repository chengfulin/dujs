# Contract：golden／MDN 差異判定（FR-008、FR-009、SC-003、SC-004）

**Feature**: `007-split-call-nodes` | 工具：`specs/007-split-call-nodes/tools/diffcheck.js`（不屬 lib，不進 `npm test`；自我測試 `tools/diffcheck.test.js`）|
基礎：`specs/005-summary-analysis/contracts/diff-check.md`、`specs/006-eslint-scope/contracts/diff-check.md`；理由見 research R10。

## 1. 沿用與替換

- **沿用**（`require` 005／006 工具的匯出；缺匯出時只新增 `module.exports` 項目，不改其行為）：`.dot` 解析與標記正規化（含 005 的 `finallyExit`）、`parseGraph`、`parseHierarchy`、
  差異單位 `pair`／`row`／`model`／`graph`／`matching`、`--report` 表格骨架、`--verify` 讀機器區塊、`exitcodes.json`。
- **替換**：
  - **基準**：golden 為 `edc22d5`，寫在 `golden-diff.md` 檔頭「基準：`edc22d5`」行；MDN 為 `specs/007-split-call-nodes/mdn/baseline-develop/`（Setup 產生，§4），`mdn-diff.md` 檔頭同樣寫「基準：`edc22d5`」。
    工具未給 `--base` 時讀檔頭的基準行；rebase 到新 develop 時改該行並整表重產（Clarifications Q5）。
  - **去重**：`pair` 單位以 (case, 頁, 檔案／層級, 變數) 的**集合**比對（005／006 為 multiset）；`row` 單位（變數列的出現／消失）不變。
  - **重複列數**：每個 `.dupairs.dot` 計算 develop 與 007 的重複列數（同變數同 pair 標記出現第 2 次以上的次數總和），輸出「重複列數」表（data-model §6）；只列、不設門檻，`--verify` 只核對數字一致。
  - **標記改寫**（R9，Q1 → A）：**不可**把 007 的 `call (5)` 與 develop 的 `call_c` 正規化成同一個無行號記號——那樣會抹掉節點身分，call 節點上的 pair 變動會躲進 `標記` 類。改為只改寫基準側：
    1. 讀基準側同一模型的 `*.matching.json`，對每個 record 以 `callNode`、`callReturn`（`.graph.dot` 的節點 id）取得 `callSiteLine`，建立「節點 id → 行號」；
    2. 依基準側 `.graph.dot` 的節點 id → 標記，把 develop 的 `call[_x]`、`callReturn[_x]` 換成 007 的形式 `call (<callSiteLine>)`、`callReturn (<callSiteLine>)`（已帶行號或路徑者，如 KI §15 的 `callReturn (6:T)`，維持原樣），重名後綴依 007 的規則重新指定；
       `.dupairs.dot` 以同一張「舊標記 → 新標記」表改寫；
    3. 改寫後再做 `pair`／`row`／`graph` 比對。只因改寫而消失的差異歸 `標記`；改寫後仍不同者照一般單位比對與分類（call 節點上的 pair 增減歸 `連結`／`求值順序`／`返回後例外`，不得歸 `標記`）；
    4. 基準側找不到 record 的 CALL／CALL RETURN 不改寫（其差異無法歸 `標記`，保守地落入一般分類，必要時失敗）。
    自我測試（`diffcheck.test.js`）涵蓋：純標記差異歸 `標記`；同一 call 節點上一筆 pair 的定義端改變時**不**歸 `標記`；重名後綴；KI §15 已帶路徑者不改寫。
  - **類別**：§2。

## 2. 類別與觸發（每頁前置計算：以 espree＋eslint-scope 讀串接後原始碼，並讀兩側的 `.hierarchy.dot`、`.graph.dot`）

| 類別 | 適用 | 機械觸發條件（必要條件） | FR |
|------|------|--------------------------|----|
| `連結` | ± pair／row、model、graph | 007 側 `.hierarchy.dot` 在某行有 call 邊、基準側同頁同行沒有（或被呼叫端集合不同，如 `new F().m()`）；pair 的 def 或 use 位於該被呼叫端（或其傳遞被呼叫端）的行範圍，或位於該呼叫點之後可達處（以「use 行 > 呼叫點行」近似） | FR-001 |
| `求值順序` | ± pair | pair 的 def 或 use 行是 007 側的呼叫點行（call 邊的 `callSiteLine`），或 use 為判別式含呼叫點的 switch 的 `case` p-use（子標 `判別式`），或位於右側含呼叫點的 for-in/of 本體／迴圈節點（子標 `可迭代`） | FR-002、FR-003、FR-004 |
| `返回後例外` | ± pair | 頁面有 `TryStatement`；pair 的 use 行位於某 catch／finally 區塊（或 exit），且 def 行是被呼叫端內的行或呼叫點行。子標 `決策返回不拋錯`（− pair）：基準側攤平圖中該呼叫點行的決策節點有 exception 出邊、007 側該節點沒有 | FR-005 |
| `§37`、`§38`、`§41`、`§43`… | ± pair | 對應 KI 節次的觸發（generator／async 呼叫、多入口 finally、diamond 註冊、page＋handler 共用被呼叫端）；說明欄註明節次 | — |
| `標記` | graph、row | 依 §1 以基準側 matching 改寫 develop 標記後相同（R9，Q1 A） | FR-007 |
| `共通` | graph、matching | 去除節點編號（`n<k>`、cfgId）後相同；或頁面有任一新呼叫點而 `.graph.dot`／`*.matching.json` 的結構改變（CALL／CALL RETURN 增加、邊改向） | — |

- **新增或消失的 pair** 只能歸 `連結`、`求值順序`、`返回後例外` 或 KI 類（SC-004）；歸不進即失敗（exit 1），須先在 `docs/known-issues.md` 記為新已知問題，再以該 KI 類記錄。
- intra-procedural 層級（`intra-procedurals/*`）的 pair 差異一律失敗（FR-006）；只允許 `共通`（cfgId 重新編號）。
- 一筆差異符合多類時報告全部，紀錄選一（須成立）。
- **釘選與簽核**：`連結`、`求值順序`、`返回後例外`、KI 類的每頁 +／− 筆數記在「釘選與簽核」表，`--verify` 核對筆數；「說明」欄必填；implementer 只填「草擬，待簽核」，
  使用者在 golden 收尾後、PR 前簽核 golden-diff 一次，MDN 驗證後簽核 mdn-diff 一次。`標記`、`共通` 為機械判定，不需釘選。

## 3. 紀錄檔

`specs/007-split-call-nodes/golden-diff.md`、`mdn-diff.md`：機器區塊「淨差異（相對 develop）」「重複列數」「釘選與簽核」；另保留各階段敘述節、雜湊變化表（舊→新 sha256 前 12 碼）、
「單元測試期望」表（改動既有測試期望的每一處：檔案、測試名、舊期望、新期望、FR）。沿用 005 做法：每個改 golden 的階段以 `UPDATE_GOLDEN=1` 更新 `tests/golden/expected*` 與 `manifest.json`（同一 commit），
並以 `--report` 重產相對 `edc22d5` 的累積淨差異、`--verify` 通過後才 commit（基準取自 git 的 `edc22d5`，不受工作樹 golden 影響）；釘選列的簽核欄在使用者簽核前為「草擬，待簽核」，
使用者在 PR 前簽核（FR-008 的「簽核後更新」以此落實：未簽核的 golden 變更不得合併）；簽核不同意的列，回到對應階段修正後整表重產。

## 4. MDN 基準（Setup，任何 lib 變更前）

1. `git -C <repo> diff --quiet edc22d5 -- lib` 確認 lib 與基準相同。
2. 對 `specs/006-eslint-scope/mdn/pages.json` 每個 id，以 `specs/006-eslint-scope/mdn/corpus/` 的檔案跑 CLI，只存 `.dot` 到 `specs/007-split-call-nodes/mdn/baseline-develop/<id>/`，`exitcodes.json` 記結束碼，
   `<id>.pairs.txt` 供閱讀（`docs/research/mdn-baseline/tools/run-pairs.js`）。
3. `node specs/006-eslint-scope/tools/perf.js .` 與 golden 各 case 的 CLI 時間寫入 `perf.md`（develop 基準）。
4. 同一 commit 提交快照與 perf 基準。

## 5. 指令

```sh
node specs/007-split-call-nodes/tools/diffcheck.js golden --report
node specs/007-split-call-nodes/tools/diffcheck.js golden --verify specs/007-split-call-nodes/golden-diff.md
node specs/007-split-call-nodes/tools/diffcheck.js mdn --report
node specs/007-split-call-nodes/tools/diffcheck.js mdn --verify specs/007-split-call-nodes/mdn-diff.md
npx mocha specs/007-split-call-nodes/tools/diffcheck.test.js
```

結束碼同 005（0 通過；1 未記錄／不符／類別不成立／釘選或重複列數不符／intra-procedural pair 差異／exit code 不同；2 無法取得基準）。
