# Quickstart：驗證 007（含呼叫的節點分段）

**Feature**: `007-split-call-nodes` | 細節見 [contracts/](./contracts/) 與 [data-model.md](./data-model.md)。所有指令在 repo 根目錄執行。

## 0. 前置

- Node.js ≥ 24、`npm ci`；Graphviz `dot`（CLI 產 png，非必要）。
- branch `007-split-call-nodes`；golden／MDN 基準 `develop` `edc22d5`（`golden-diff.md`、`mdn-diff.md` 檔頭「基準：」行）。

## 1. 單元與驗收測試

```sh
npm test          # 全部通過（基線 1495 passing；新增測試見 contracts/acceptance.md）
npm run lint      # 0 錯誤；eslint-suppressions.json 不得新增鍵或增加 count
```

預期：spec 全部驗收情境有對應測試且通過（SC-001）；每個 probe 的 intra-procedural pair 與 develop 相同（FR-006）。

## 2. 探測程式

```sh
node specs/007-split-call-nodes/probes/run.js                                         # 全部
node specs/007-split-call-nodes/probes/run.js specs/007-split-call-nodes/probes/p1-ki16.js
```

對照 spec「探測結果」與各情境：例如 P1 有 `x: L5 -> L3`、沒有 `x: L1 -> L3`；P9 有 `x: L1 -> L6>L7:T`、沒有 `x: L3 -> L6>L7:T`；P24 沒有 `x: L3 -> L3`；
P35 沒有 `x: L3 -> L11`；P23 與 `probes/baseline-develop.txt` 相同（SC-002）。

## 3. 輸出（FR-007）

```sh
node bin/dujs.js -js specs/007-split-call-nodes/probes/p6-two-calls.js
```

在輸出目錄的 inter-procedural／intra-page 模型檢查：`.graph.dot` 中 L10 有兩個呼叫點依求值順序串接（標為 `call (11)_a`、`call (11)_b` 與一個 `callReturn (11)`：`f` 返回的節點同時是 `g` 的呼叫來源，依既有串接行為改型為 CALL，與 develop 對串接呼叫的處理相同；DECISION 005 Q1 A，CLI 行號＝檔案行號＋1）；
`*.matching.json` 的 `calls` 每條 return 邊恰對應一個 record（`seq` 依求值順序）；沒有新的節點或邊型別。

## 4. golden 與 MDN 差異

```sh
npx mocha specs/007-split-call-nodes/tools/diffcheck.test.js
node specs/007-split-call-nodes/tools/diffcheck.js golden --verify specs/007-split-call-nodes/golden-diff.md
node specs/007-split-call-nodes/tools/diffcheck.js mdn --verify specs/007-split-call-nodes/mdn-diff.md
```

預期：exit 0；每筆新增／消失的 pair（去重後）歸入 `連結`／`求值順序`／`返回後例外` 或 KI 類，含 `決策返回不拋錯` 子類；「重複列數」表與實測一致（不設門檻）；
intra-procedural 層級沒有 pair 差異；「class static 不再連結」表與實測一致（有實例時簽核列出）；釘選列經使用者簽核（SC-003、SC-004）。

## 5. 效能（SC-005）

```sh
node specs/006-eslint-scope/tools/perf.js .
```

golden＋MDN 總分析時間 ≤ develop（`perf.md` 的基準）× 2。

## 6. 文件（FR-010）

`docs/known-issues.md`：§16、§22 (3) 標為已修正；§10、§36 有 007 的補註；§44「`case` test 的讀取與呼叫不建模」（含 class static 成員不再連結，標明為相對 develop 的行為變更）、§45 行為變更、§46 不列為呼叫點的位置（for-in/of 左側、條件求值位置、同節點先定義的 callee；這些位置中 class static 成員不再連結，標明為相對 develop 的行為變更）、§47 判別式拆分節點的例外邊、§48 `switch` 沒有 `case` 的既有崩潰存在（research R12、R13）。
README：Limits 不再寫「只有呼叫敘述是呼叫點」，並說明段節點、`beforeDecision` 與標記規則。
