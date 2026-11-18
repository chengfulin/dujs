# Contract：golden／MDN 差異判定（FR-008、FR-009、SC-003、SC-004）

**Feature**: `007-split-call-nodes` | 工具：`specs/007-split-call-nodes/tools/diffcheck.js`（不屬 lib，不進 `npm test`；自我測試 `tools/diffcheck.test.js`）|
基礎：`specs/005-summary-analysis/contracts/diff-check.md`、`specs/006-eslint-scope/contracts/diff-check.md`；理由見 research R10。

## 1. 沿用與替換

- **沿用**（`require` 005／006 工具的匯出；缺匯出時只新增 `module.exports` 項目，不改其行為）：`.dot` 解析與標記正規化（含 005 的 `finallyExit`）、`parseGraph`、`parseHierarchy`、
  差異單位 `pair`／`row`／`model`／`graph`／`matching`、`--report` 表格骨架、`--verify` 讀機器區塊、`exitcodes.json`。
- **替換**：
  - **基準**：golden 為 `edc22d5`，寫在 `golden-diff.md` 檔頭「基準：`edc22d5`」行；MDN 為 `specs/007-split-call-nodes/mdn/baseline-develop/`（Setup 產生，§4），`mdn-diff.md` 檔頭同樣寫「基準：`edc22d5`」。
    工具未給 `--base` 時讀檔頭的基準行；rebase 到新 develop 時改該行並整表重產（clarify Q5）。
  - **去重**：`pair` 單位以 (case, 頁, 檔案／層級, 變數) 的**集合**比對（005／006 為 multiset）；`row` 單位（變數列的出現／消失）不變。
  - **重複列數**：每個 `.dupairs.dot` 計算 develop 與 007 的重複列數（同變數同 pair 標記出現第 2 次以上的次數總和），輸出「重複列數」表（data-model §6）；只列、不設門檻，`--verify` 只核對數字一致。
  - **標記改寫**（R9，DECISION 005 Q1 → A）：**不可**把 007 的 `call (5)` 與 develop 的 `call_c` 正規化成同一個無行號記號——那樣會抹掉節點身分，call 節點上的 pair 變動會躲進 `標記` 類。改為只改寫基準側：
    0. **是否改寫**（DECISION 006 Q4 A1／M1）：只在 007 側**同一模型**的 `.graph.dot` 有節點標記 `label="call (`（以此完整字串判定，不用子字串 `call (`，避免誤中 `callReturn (6:T)` 等既有形式）時，才改寫基準側該模型的 `.graph.dot`；
       `.dupairs.dot` 跟隨同一模型的 `.graph.dot` 的判定（不以檔為單位各自判定）。007 側仍為 `call_x`（Foundational、US1）時不改寫，兩側原樣比對。
    1. 讀基準側同一模型的 `*.matching.json`（golden 取自 git 的 `edc22d5`；MDN 取自快照，§4），對每個 record 以 `callNode`、`callReturn`（`.graph.dot` 的節點 id）取得 `callSiteLine`，建立「節點 id → 行號」；
    2. 依基準側 `.graph.dot` 的節點 id → 標記，把 develop 的 `call[_x]`、`callReturn[_x]` 換成 007 的形式 `call (<callSiteLine>)`、`callReturn (<callSiteLine>)`（已帶行號或路徑者，如 KI §15 的 `callReturn (6:T)`，維持原樣），**只對被改寫的 CALL／CALL RETURN 標記**依 007 的規則重新指定重名後綴；其他標記（如 develop 的累積後綴 `16abab`、`entry_b_d_a_b_a_b`、`exit_b`，以及找不到 record 而未改寫的 `call_x`）原樣保留（T067，DECISION 011）；
       `.dupairs.dot` 以同一張「舊標記 → 新標記」表改寫；
    3. 改寫後再做 `pair`／`row`／`graph` 比對。只因改寫而消失的差異歸 `標記`；改寫後仍不同者照一般單位比對與分類（call 節點上的 pair 增減歸 `連結`／`求值順序`／`返回後例外`，不得歸 `標記`）；
    4. 基準側找不到 record 的 CALL／CALL RETURN 不改寫（其差異無法歸 `標記`，保守地落入一般分類，必要時失敗）。
    已知限制：重名後綴由 `diffcheck.js` 的 `computeLabelIndex` 產生（工具自己的複本）。lib 的 `cfggraphconverter.js` `computeLabelIndex` 原本迴圈不更新被除數，同名節點 ≥ 27 個（索引 ≥ 26）時不會結束（CLI heap OOM，KI §49），已於 T068 修正（每輪以上一輪的被除數再除，索引 26 → `ba`）；工具的複本維持舊式（最多產生 4 個字母後停止），索引 0–25（`a`–`z`）與 lib 相同，索引 ≥ 26 時與 lib 不一致，改寫結果在此情形下不保證與 007 側一致（golden、MDN 皆無此實例）。
    工具限制（T068 註記）：`.dupairs.dot` 的 pair 以去掉重名後綴後的集合比對（重複列另計），同一行不同段節點（如 `call (79)_a`…`_f`）上同變數的 pair 去後綴後是同一個字串，因此同一行某一段的 pair 缺漏或多出，只要另一段仍有相同的去後綴 pair，`--verify` 看不出來；這類 pair 只反映在「重複列數」（如 `mdn-diff.md` 的 a04／a05／x01）。
    自我測試（`diffcheck.test.js`）涵蓋：純標記差異歸 `標記`；同一 call 節點上一筆 pair 的定義端改變時**不**歸 `標記`；重名後綴；KI §15 已帶路徑者不改寫；007 側仍為 `call_x` 時零差異（第 0 步不改寫）；`.dupairs.dot` 跟隨同模型 `.graph.dot` 的判定；MDN 基準側以快照中的 `*.matching.json` 改寫，快照缺該檔時 exit 2。
  - **類別**：§2。

## 2. 類別與觸發（每頁前置計算：以 espree＋eslint-scope 讀串接後原始碼，並讀兩側的 `.hierarchy.dot`、`.graph.dot`）

| 類別 | 適用 | 機械觸發條件（必要條件） | FR |
|------|------|--------------------------|----|
| `連結` | ± pair／row、model、graph | 007 側 `.hierarchy.dot` 在某行有 call 邊、基準側同頁同行沒有（或被呼叫端集合不同，如 `new F().m()`）；pair 的 def 或 use 位於該被呼叫端（或其傳遞被呼叫端）的行範圍，或位於該呼叫點之後可達處（以「use 行 > 呼叫點行」近似）。子標 `層級新增`（T067，DECISION 011）：該 `.dupairs.dot` 所屬模型只存在於 007 側（其 model `+` 已成立 `連結`），且該 `+` pair 經 §1 改寫後，以相同的（變數、def、use）存在於基準側同頁的 `intra-pages/*.dupairs.dot`。不符者照一般判準，歸不進即失敗。`--report` 在說明欄註明對應的基準檔 | FR-001 |
| `求值順序` | ± pair | pair 的 def 或 use 行是 007 側的呼叫點行（call 邊的 `callSiteLine`），或 use 為判別式含呼叫點的 switch 的 `case` p-use（子標 `判別式`），或位於右側含呼叫點的 for-in/of 本體／迴圈節點（子標 `可迭代`） | FR-002、FR-003、FR-004 |
| `返回後例外` | ± pair | 頁面有 `TryStatement`；pair 的 use 行位於某 catch／finally 區塊（或 exit），且 def 行是被呼叫端內的行或呼叫點行。子標 `決策返回不拋錯`（− pair）：基準側攤平圖中該呼叫點行的決策節點有 exception 出邊、007 側該節點沒有 | FR-005 |
| `§37`、`§38`、`§41`、`§43`… | ± pair | 對應 KI 節次的觸發（generator／async 呼叫、多入口 finally、diamond 註冊、page＋handler 共用被呼叫端）；說明欄註明節次 | — |
| `§44`／`§46`（class static 行為變更） | ± pair／row、model、graph | 基準側 `.hierarchy.dot` 在某行有 call 邊連到 class 的 static 成員 scope（static 欄位初始化式或 static block），007 側同頁同行沒有；該行的 class 位於 `case` test（§44）、for-in/of 左側、`?.` 之後或解構預設值（含 catch 參數）（§46）。pair 的 def 或 use 位於該 static scope 的行範圍，或位於該行之後可達處 | FR-001 例外（DECISION 005 Q3、DECISION 006 Q4 必修 3） |
| `標記` | graph、row | 依 §1 以基準側 matching 改寫 develop 標記後逐字相同（R9，DECISION 005 Q1 A；改寫後只差節點編號者歸 `共通`，T067） | FR-007 |
| `共通` | graph、matching | 去除節點編號（`n<k>`、cfgId）後相同（含經 §1 改寫後只差節點編號，T067）；或頁面有任一新呼叫點而 `.graph.dot`／`*.matching.json` 的結構改變（CALL／CALL RETURN 增加、邊改向）；或（子標 `段0例外`，DECISION 008）同時滿足：(a) 同一模型的 `.dupairs.dot` 沒有 pair／row 差異，`*.matching.json` 在此條件涉及的 record 上相同；(b) 兩側 `.graph.dot` 的節點集合與標記（經 §1 改寫後）相同，007 側沒有改向任何邊，且只多容許一種刪除（DECISION 012 Q1）：同一 record 的例外邊從決策節點移到前插 CALL——被刪邊 `label="exception"`、來源為該 record 的原決策節點（基準側 `callReturn` 的 normal 後繼）、目標等於該 record 的 `exceptionalReturn`；刪除必須與同一 record 的新增邊成對（同目標），每筆 record 至多一刪一增；其他刪除或改向一律不成立；(c) 007 側新增的每一條邊都是 `label="exception"`，來源是該模型 matching 中某筆 `beforeDecision: true` record 的 `callNode`，目標等於該 record 的 `exceptionalReturn`，且基準側該 record 的 `callReturn` 的 normal 後繼（原決策節點）已有連到同一目標的 exception 邊；(d) 每筆這樣的 record 至多新增一條；(e)（DECISION 012 Q1）被刪邊所屬 record 的 `callSiteLine` 上，工具以 espree 獨立判定該決策條件在最後一個呼叫點之後（求值順序）沒有任何 AssignmentExpression／BinaryExpression／CallExpression／MemberExpression／NewExpression／UnaryExpression（最簡實作：條件去括號後本身就是該 CallExpression／NewExpression）；同一行有多個決策（`&&`／`||`／`??` 在 CFG 產生分支，同行出現即計為決策）或無法唯一對應時不成立。任一新增邊不符 (c)，或與其他結構變化並存而無法逐邊歸因時，本條件不成立（只涵蓋 decision 形狀，不放寬成任何 CALL；被呼叫端有 mustKill 而帶出 + pair 者不歸 `共通`，落入一般分類）。`--report` 在說明欄自動列出「callNode → 目標（record id）」，有 (b) 的刪除時接著列「；移除 決策節點 → 目標」，不需釘選 | — |

- **新增或消失的 pair** 只能歸 `連結`、`求值順序`、`返回後例外` 或 KI 類（SC-004）；歸不進即失敗（exit 1），須先在 `docs/known-issues.md` 記為新已知問題，再以該 KI 類記錄。
- intra-procedural 層級（`intra-procedurals/*`）的 pair 差異一律失敗（FR-006）；只允許 `共通`（cfgId 重新編號）。
- 一筆差異符合多類時報告全部，紀錄選一（須成立）。
- **class static 行為變更的計數**：`--report` 另輸出「class static 不再連結」表（頁、行、static scope、位置種類 `case` test／for-in/of 左側／`?.` 之後／解構預設值／catch 參數、相關 ± pair 筆數），`--verify` 核對筆數；即使沒有 pair 差異（只有 hierarchy／graph 差異）也列出。golden 或 MDN 有實例時，簽核時逐列列出（T065）；0 例時表格寫「無」。
- **釘選與簽核**：`連結`、`求值順序`、`返回後例外`、KI 類的每頁 +／− 筆數記在「釘選與簽核」表，`--verify` 核對筆數；「說明」欄必填；implementer 只填「草擬，待簽核」，
  使用者在 golden 收尾後、PR 前簽核 golden-diff 一次，MDN 驗證後簽核 mdn-diff 一次。`標記`、`共通` 為機械判定，不需釘選。

## 3. 紀錄檔

`specs/007-split-call-nodes/golden-diff.md`、`mdn-diff.md`：機器區塊「淨差異（相對 develop）」「重複列數」「釘選與簽核」；另保留各階段敘述節、雜湊變化表（舊→新 sha256 前 12 碼）、
「單元測試期望」表（改動既有測試期望的每一處：檔案、測試名、舊期望、新期望、FR）。沿用 005 做法：每個改 golden 的階段以 `UPDATE_GOLDEN=1` 更新 `tests/golden/expected*` 與 `manifest.json`（同一 commit），
並以 `--report` 重產相對 `edc22d5` 的累積淨差異、`--verify` 通過後才 commit（基準取自 git 的 `edc22d5`，不受工作樹 golden 影響）；釘選列的簽核欄在使用者簽核前為「草擬，待簽核」，
使用者在 PR 前簽核（FR-008 的「簽核後更新」以此落實：未簽核的 golden 變更不得合併）；簽核不同意的列，回到對應階段修正後整表重產。

## 4. MDN 基準（Setup，任何 lib 變更前）

1. `git -C <repo> diff --quiet edc22d5 -- lib` 確認 lib 與基準相同。
2. 對 `specs/006-eslint-scope/mdn/pages.json` 每個 id，以 `specs/006-eslint-scope/mdn/corpus/` 的檔案跑 CLI，存各模型的 `.dot` **與 `*.matching.json`**（§1 標記改寫的基準側輸入；develop 在 `edc22d5` 已輸出 matching，DECISION 006 Q3）到 `specs/007-split-call-nodes/mdn/baseline-develop/<id>/`，`exitcodes.json` 記結束碼，
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
