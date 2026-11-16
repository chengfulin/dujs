# Quickstart: 驗證三項小型重構

**Feature**: `002-small-refactors` | 介面見 [contracts/internal-modules.md](./contracts/internal-modules.md)，欄位見 [data-model.md](./data-model.md)

## 前置

- Node.js ≥ 24；專案根執行過 `npm install`（無新增依賴）。
- 基線（重構前）：`npm test` 640 passing、`npm run lint` 0 錯誤、`eslint-suppressions.json` 119 筆。

## 共同檢查（每個 story 結束時都執行）

```bash
npm test                                                   # 含 golden（tests/golden/golden.js）與性質測試（100 runs）
FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js
npm run lint
git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests
```

預期：
- 全部通過，數量 ≥ 640 ＋ 本 story 新增測試數（SC-002）；golden 段 0 失敗（SC-001）。
- 性質測試以固定 seed 20261116 跑 1000 runs 通過；失敗時依輸出的 `FC_SEED=<seed>` 重現。
- lint 0 錯誤；`git diff --exit-code` 無輸出（抑制項未增加、golden 與 esgraph fixture 未被改動，SC-006、FR-009）。
- 禁止以 `UPDATE_GOLDEN=1` 處理任何 golden 失敗：失敗即代表行為（含節點建立順序）改變，回頭修程式。

## US1：拆分模組

```bash
wc -l lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js lib/esgraph/branchsplitter.js
grep -n "require(" lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js
git diff --exit-code lib/esgraph/index.js
npx mocha tests/esgraph/decisionfinder.js tests/esgraph/astrewriter.js
```

預期：三檔皆 < 350 行（SC-003）；decisionfinder 無 require、astrewriter 只 require `./decisionfinder`，兩者都不出現
`flownode`（FR-001）；`index.js` 無差異（FR-002）；新單元測試涵蓋 `searchByType` 每個 case（FR-003）。

## US2：`split`／`labelPath` 與標籤 helper

```bash
grep -rn "branchPath\|splitOrigin\|\.preEvaluated\b" lib tests/helpers tests/dujs tests/esgraph   # 預期：只剩 split.preEvaluated 的讀取
grep -rnE "':' *\+|\+ *':[TF]'|'L' *\+" lib tests/helpers
npx mocha tests/esgraph/branchlabel.js tests/esgraph/flownodetest.js
```

預期：
- 舊欄位名不再出現（`split.preEvaluated` 除外）（FR-004）。
- 第二個 grep 的分支標籤拼接只出現在 `lib/esgraph/branchlabel.js`（SC-004）；`cfggraphconverter.js` 的
  `'L' + node.line + ':C' + node.col` 與 `node.type + ' (L'` 是位置標籤，不計入。
- FlowNode 測試涵蓋：預設 `split === null`、`labelPath === ''`；setter 驗證與凍結；`analyzedExpressions` 以
  `split.preEvaluated` 為前綴（US2 情境 1、2）。US2 情境 3（呼叫／call return 節點）由既有 `tests/dujs/branchsplit.js`、
  analyze helper 的 pair 記法與 golden 回歸保護，另加一個斷言其 `split === null` 且 `labelPath` 為呼叫點路徑的測試。

## US3：`usedExpressionsOf`

```bash
npx mocha tests/dujs/usedexpressions.js
grep -nE "isPreEvaluated|currentRoot|isSplitLeaf|readsSwitchDiscriminant|useLoopHead|loopRightSplit|discriminant|SwitchCase|ForInStatement|ForOfStatement" lib/dujs/defuseanalyzer.js
```

預期：
- 新測試對應 spec US3 情境 1–5 各通過（FR-008）；情境 6 由共同檢查（既有 def-use 測試與 golden）保證。
- grep 在 `findUSESet` 範圍內無結果（SC-005）；`findUSESet` 之前的 DEF 相關走訪（現行 :377、:448-449、:493 的
  `SwitchCase: function () {}`、`ForInStatement`／`ForOfStatement: defineLoopVariables`）不計入。
