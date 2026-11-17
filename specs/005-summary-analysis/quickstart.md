# Quickstart：驗證 005（摘要分析、§18、`finally`、例外路徑）

**Feature**: `005-summary-analysis` | 細節見 [contracts/](./contracts/) 與 [data-model.md](./data-model.md)。所有指令在 repo 根目錄執行。

## 0. 前置

- Node.js ≥ 24、`npm ci`；Graphviz `dot`（CLI 產 png，非必要）。
- branch `005-summary-analysis`；golden 基準 `9e324be`。

## 1. 單元與驗收測試

```sh
npm test          # 全部通過（基線 1273 passing，新增測試見 contracts/acceptance.md）
npm run lint      # 0 錯誤；eslint-suppressions.json 不得新增鍵或增加 count
```

預期：P8、P9 不再拋錯；spec 全部驗收情境有對應測試且通過（SC-001）。

## 2. 探測程式

```sh
node specs/005-summary-analysis/probes/run.js                       # 全部
node specs/005-summary-analysis/probes/run.js specs/005-summary-analysis/probes/p1.js
```

對照 spec「探測結果」表：P1–P11 得到 US 中的預期 pair（SC-002）；例如 P1 的 intra-page 中 `x` 的 pair 只剩 `x: L1 -> L5`、`x: L6 -> L8`；P5 沒有 `x: L7 -> L6`。

## 3. 配對資訊

```sh
(cd <scratchpad> && node <repo>/bin/dujs.js -js <repo>/specs/005-summary-analysis/probes/p1.js)   # 輸出到 <scratchpad>/out-<date>-<time>/
ls <scratchpad>/out-*/page0/intra-pages/      # 0.graph.dot、0.dupairs.dot、0.hierarchy.dot、0.matching.json
```

`0.matching.json` 符合 contracts/matching-output.md：`calls` 有兩筆（L4、L7），兩條 `f` exit → callReturn 的 return 邊各對應一筆；`.graph.dot` 與 develop 相比只有 Q-a 的
例外邊位置變化（US1-5）。

## 4. golden

```sh
UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js     # 只在要更新 expected 的階段執行
node specs/005-summary-analysis/tools/diffcheck.js golden --report     # 產生差異骨架，補說明
node specs/005-summary-analysis/tools/diffcheck.js golden --verify specs/005-summary-analysis/golden-diff.md
```

預期：結束碼 0；每處差異都有類別與 FR（FR-011、SC-003）；`tests/golden/manifest.json` 的 `baseline` 雜湊與 `added`（`*.matching.json`）同步更新。

## 5. MDN 範例集與效能

```sh
node specs/005-summary-analysis/tools/diffcheck.js mdn --verify specs/005-summary-analysis/mdn-diff.md
node specs/006-eslint-scope/tools/perf.js .                      # 本 branch
node specs/006-eslint-scope/tools/perf.js <scratchpad>/develop   # git archive 9e324be 後 npm ci
```

預期：33 檔全部 exit 0、不拋錯；消失的 pair 都歸入 SC-005 的原因、新增的 pair 只屬 FR-005／FR-013／FR-014；本 branch 中位數 ≤ develop × 2（SC-004），記入 `perf.md`。

## 6. 文件

`docs/known-issues.md` 依 FR-012、FR-013、FR-014 更新；README 限制說明更新（D2 放寬、D3 例外語意、generator／async 保守摘要、`window.f` 誤連）。
