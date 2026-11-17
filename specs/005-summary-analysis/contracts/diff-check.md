# Contract：golden／MDN 差異判定（FR-011、SC-003、SC-005；沿用 006 機制）

**Feature**: `005-summary-analysis` | 工具：`specs/005-summary-analysis/tools/diffcheck.js`（不屬 lib，不進 `npm test`）| 基礎：`specs/006-eslint-scope/contracts/diff-check.md`

## 1. 沿用與差異

- **沿用**（`require('../../006-eslint-scope/tools/diffcheck.js')` 的匯出）：`.dot` 解析與 pair 正規化（新增 `finallyExit_*` → `finallyExit`）、差異單位 `pair`／`row`／`model`／`graph`、
  multiset 比對、`--report` 表格骨架、`--verify` 讀機器區塊、`exitcodes.json`。006 工具若缺匯出，以「只新增 `module.exports` 項目」補上，不改其行為。
- **新增單位** `matching`：`*.matching.json` 全部屬「新增檔」，只核對存在與 JSON 格式（`format` 欄），不計入 pair 差異。
- **替換**：類別判準（§2）；golden 基準 `9e324be`（`golden-diff.md` 檔頭）；MDN 基準 `specs/005-summary-analysis/mdn/baseline-develop/`（§4）。語料仍讀 `specs/006-eslint-scope/mdn/corpus/`。

## 2. 類別與觸發（每頁前置計算以 espree＋eslint-scope 讀串接後原始碼，並讀基準側 `.dot`）

| 類別 | 適用 | 機械觸發條件（必要條件） | FR |
|------|------|--------------------------|----|
| `§18` | − pair | use 端為 `entry` | FR-008 |
| `連結` | ± pair／row、model、graph | 頁面有 D2 新連結呼叫點：函式內呼叫敘述 `f()`，`f` 解析到的 Variable 種類為函式宣告／`let`／`const`／具名函式運算式名稱，且基準側該呼叫點未連結（以基準 `.hierarchy.dot` 的 call 邊判定） | FR-005 |
| `finally` | ± pair、graph | 頁面有 `TryStatement` 且 finalizer 非空；pair 的 def 或 use 行位於該 try 敘述行範圍，或其後繼可經該 try 到達（以「use 行 > try 起始行」近似） | FR-013 |
| `例外IN` | ± pair | def 行的節點在基準側 intra-procedural `.graph.dot` 有 exception 出邊 | FR-014 |
| `Q-a` | − pair、graph | def 行為呼叫點（基準 `.hierarchy.dot` 的 call 邊）且層級不是 intra-procedural | FR-006 |
| `摘要` | − pair | 層級不是 intra-procedural，且頁面基準側有 call 邊或 LOOP 有處理器；細分原因（不可實現路徑、例外不返回、呼叫無正常返回）寫在說明欄 | FR-002、FR-003、FR-006、FR-007 |
| `graph` 共通 | graph | 頁面有任一呼叫（Q-a 搬移例外邊）、`finally` 或 `連結` 觸發 | — |

- 新增的 pair 只能歸 `連結`、`finally`、`例外IN`（SC-005）；歸不進即失敗。
- 一筆差異符合多類時報告全部，紀錄選一（須成立）。
- **釘選與簽核**：`摘要`、`連結`、`finally` 三類的每頁筆數記在「釘選與簽核」表；`--verify` 核對筆數；「說明」欄必填；簽核欄 implementer 只填「草擬，待簽核」，
  使用者在 golden 收尾後、PR 前簽核一次（golden-diff），MDN 驗證後簽核一次（mdn-diff）。`§18`、`例外IN`、`Q-a` 為機械判定，不需釘選。

## 3. 紀錄檔

`specs/005-summary-analysis/golden-diff.md`、`mdn-diff.md`：機器區塊「淨差異（相對 develop）」「釘選與簽核」，格式同 006 §4（類別欄改用 §2 名稱）；
另依 004／006 慣例保留各階段敘述節、雜湊變化表（舊→新 sha256 前 12 碼）、「單元測試期望」表（改動既有測試的每一處）。`tests/golden/manifest.json` 與 golden 同一 commit 更新。

## 4. MDN 基準（Setup，任何 lib 變更前）

1. 以本 branch 工作樹（lib＝`9e324be`）對 `specs/006-eslint-scope/mdn/pages.json` 每個 id 跑 CLI，只存 `.dot` 到 `specs/005-summary-analysis/mdn/baseline-develop/<id>/`，
   `exitcodes.json` 記結束碼，`<id>.pairs.txt` 供閱讀（`docs/research/mdn-baseline/tools/run-pairs.js`）。
2. `node specs/006-eslint-scope/tools/perf.js .` 與 golden 3 個 case 的 CLI 時間寫入 `perf.md`（develop 基準）。
3. 同一 commit 提交快照與 perf 基準。

## 5. 指令

```sh
node specs/005-summary-analysis/tools/diffcheck.js golden --report
node specs/005-summary-analysis/tools/diffcheck.js golden --verify specs/005-summary-analysis/golden-diff.md
node specs/005-summary-analysis/tools/diffcheck.js mdn --report
node specs/005-summary-analysis/tools/diffcheck.js mdn --verify specs/005-summary-analysis/mdn-diff.md
```

結束碼同 006（0 通過；1 未記錄／不符／類別不成立／釘選不符／exit code 不同；2 無法取得基準）。每個改 golden 的階段結束時重產「淨差異」並由 orchestrator 親自 `--verify` 通過才 commit。
