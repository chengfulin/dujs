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
grep -n _testonly_ lib/esgraph/branchsplitter.js lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js tests/esgraph/decisionfinder.js tests/esgraph/astrewriter.js
npx mocha tests/esgraph/decisionfinder.js tests/esgraph/astrewriter.js
```

預期：三檔皆 < 350 行（SC-003）；decisionfinder 無 require、astrewriter 只 require `./decisionfinder`，兩者都不出現
`flownode`（FR-001）；`index.js` 無差異（FR-002）；暫時的 `_testonly_` 匯出與測試對它的引用無殘留（grep 無輸出；
`flownode.js` 等其他模組既有的 `_testonly_` 不在範圍）；新單元測試涵蓋 `searchByType` 每個 case（FR-003）。

## US2：`split`／`labelPath` 與標籤 helper

```bash
grep -rn "branchPath\|splitOrigin\|\.preEvaluated\b" lib tests/helpers tests/dujs tests/esgraph   # 預期：只剩 split.preEvaluated 的讀取
grep -rnE "':' *\+|\+ *':[TF]'|\+ *'[TF]'|'L' *\+" lib tests/helpers
npx mocha tests/esgraph/branchlabel.js tests/esgraph/flownodetest.js
```

預期：
- 舊欄位名不再出現（`split.preEvaluated` 除外）（FR-004）。
- 第二個 grep 的分支標籤拼接（含 `path + 'T'` 這類路徑延伸）只出現在 `lib/esgraph/branchlabel.js`（SC-004）；
  `cfggraphconverter.js` 的 `'L' + node.line + ':C' + node.col`（`L<行>:C<欄>`）與 `node.type + ' (L'`（`<type> (L…)`）是位置標籤，不計入。
- FlowNode 測試涵蓋：預設 `split === null`、`labelPath === ''`；setter 驗證與凍結；`analyzedExpressions` 以
  `split.preEvaluated` 為前綴（US2 情境 1、2）。US2 情境 3 由既有 `tests/dujs/branchsplit.js`、analyze helper 的 pair 記法與
  golden 回歸保護，另加測試分別斷言兩種呼叫節點：callSite 非決策節點而改型者保留原 `split` 與 `labelPath`；callSite 為決策節點時
  新建的呼叫節點與 call return 節點 `split === null` 且 `labelPath` 等於 callSite 的 `labelPath`。
- 不變量 `split !== null ⇒ labelPath === split.path`：對拆分產生的所有節點（含巢狀拆分）成立，由 `tests/dujs/branchsplit.js`
  的不變量測試驗證。

## US3：`usedExpressionsOf`

```bash
npx mocha tests/dujs/usedexpressions.js
sed -n '/findUSESet = function/,/^};/p' lib/dujs/defuseanalyzer.js | grep -nE "isPreEvaluated|currentRoot|isSplitLeaf|readsDiscriminant|readsSwitchDiscriminant|useLoopHead|loopRightSplit|discriminant|SwitchCase|ForInStatement|ForOfStatement|isWithObject|preEvaluated|\.split\b"
grep -nE "function (useLoopHead|readsSwitchDiscriminant)" lib/dujs/defuseanalyzer.js
```

預期：
- 新測試對應 spec US3 情境 1–5 各通過（FR-008）；情境 6 由共同檢查（既有 def-use 測試與 golden）保證。
- 兩個 grep 皆無輸出（SC-005）：第一個以 `sed` 限定在 `findUSESet` 範圍，故其之前的 DEF 相關走訪（現行 :377、:448-449、:493 的
  `SwitchCase: function () {}`、`ForInStatement`／`ForOfStatement: defineLoopVariables`）不會被抓到；第二個確認模組層的
  `useLoopHead`、`readsSwitchDiscriminant` 已移除。`isDecisionNode` 不在 grep 清單：`?:` handler 依節點是否有 true/false 邊重設
  `isPUse`，屬走訪內 p-use 傳播規則，仍合法留在 `findUSESet`。

## Polish：整體重跑

- 共同檢查再跑一次（含 `FC_NUM_RUNS=1000` 性質測試），並重跑 US2 的 SC-004 grep 與 US3 的 SC-005 grep。
- `git diff --exit-code 9254c18 -- lib/esgraph/index.js lib/esgraph/dot.js` 無輸出（LGPL 檔未改，FR-011 修改紀錄不觸發）。
