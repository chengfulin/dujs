# Implementation Plan: 三項小型重構（拆分 branchsplitter、FlowNode 分支欄位、usedExpressionsOf）

**Branch**: `002-small-refactors` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-small-refactors/spec.md`

## Summary

三項不改變任何分析結果的純重構，依 US1 → US2 → US3 順序、每個 story 結束時 golden 逐位元組相同：

1. **US1**：`lib/esgraph/branchsplitter.js`（687 行）依「只讀 AST → 改寫 AST → 建流程節點」三層拆成
   `decisionfinder.js`（找第一個決策與條件前已求值的部分）、`astrewriter.js`（路徑複製改寫）與保留
   graph 部分的 `branchsplitter.js`；依賴方向單向 `branchsplitter → astrewriter → decisionfinder`，前兩者不
   require `flownode`。函式本體原樣搬移、`create` 的呼叫順序不變，故節點編號不變（[research.md](./research.md) R1–R3）。
2. **US2**：`FlowNode` 以單一凍結物件 `split`（`null | {path, origin, preEvaluated}`）取代 `branchPath`／
   `splitOrigin`／`preEvaluated`，新增作為所有節點標籤路徑唯一來源的 `labelPath`（拆分節點建立時一併設為
   `split.path`，不變量 `split !== null ⇒ labelPath === split.path`）；分支標籤格式集中於新模組
   `lib/esgraph/branchlabel.js`（`pathOf` 即回 `labelPath`、`pathSuffix`、`lineLabel`、`extendPath`、`branchMark`），所有讀寫處改用
   它們（R4–R5）。
3. **US3**：新模組 `lib/dujs/usedexpressions.js` 的 `usedExpressionsOf(cfgNode)` 回傳
   `[{expression, read: 'c-use'|'p-use'|'walk'}]`，把條件前已求值、case discriminant、loop 頭與「單一識別字根」的
   判斷全部收進來；`findUSESet` 只依 `read` 設定走訪起始狀態並套用原有的走訪內 p-use 傳播規則（R6）。

## Technical Context

**Language/Version**: JavaScript（CommonJS，ES5 風格的 `lib/` 程式碼），Node.js ≥ 24（`package.json` engines）

**Primary Dependencies**: espree ^11.2.0（parser）、walkes ^0.2.1（AST walker）；`lib/esgraph/index.js`、`dot.js`
衍生自 esgraph 0.1.1（LGPL-3.0-only），本 feature **不修改**；其餘 `lib/esgraph`、`lib/dujs` 為 MIT。無新增依賴。

**Storage**: N/A（CLI 輸出 `.dot` 檔）

**Testing**: mocha ^12 ＋ should ^13；fast-check ^4.10.2 性質測試（`FC_SEED` 預設 20261116、`FC_NUM_RUNS` 預設 100）；
golden 回歸 `tests/golden/golden.js`（ES5 `expected/`、ES2015+ `expected-es2015/`）；eslint ^10（`eslint-suppressions.json`）。
基線（`9254c18` 後的本分支）：`npm test` **640 passing**、`npm run lint` 0 錯誤、抑制項 **119** 筆。

**Target Platform**: Node.js ≥ 24（macOS／Linux 開發機、CI）

**Project Type**: library ＋ CLI（`bin/dujs.js`）

**Performance Goals**: 無新目標；`npm test` 維持秒級（現約 2 s）

**Constraints**: golden（含 dot 節點編號）逐位元組不變，差異一律視為行為改變、不得以 `UPDATE_GOLDEN` 放行；
`split(entryNode, { expressionThrows })` 與 `lib/esgraph/index.js` 的 require 不變；不新增 lint 抑制；既有測試
預期值不變（只改欄位存取方式）

**Scale/Scope**: 3 個 user story、11 條 FR；新增 4 個 lib 模組（`decisionfinder.js`、`astrewriter.js`、
`branchlabel.js`、`usedexpressions.js`），修改 `branchsplitter.js`、`flownode.js`、`defuseanalyzer.js`、
`modelbuilder.js`、`cfgbuilder.js`、`cfggraphconverter.js`、`tests/helpers/analyze.js` 等

**tech-standards**：`.specify/memory/baseline/tech-standards.md` 針對服務後端／前端，不適用於本 CLI／函式庫的
內部重構；屬「不適用」而非偏離，無需 §CP-6 例外記錄。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／USR 決策／Clarifications；未擴大範圍（`expressionsEvaluatedAtNode` 只改讀 `split`） | PASS | PASS |
| §CP-2 機密 | 不涉及機密 | PASS | PASS |
| §CP-3 設定不硬編碼 | 無環境相依設定；性質測試 runs／seed 沿用 `FC_NUM_RUNS`／`FC_SEED` | PASS | PASS |
| §CP-4 核心邏輯測試 | 新模組各有直接單元測試（FR-003、FR-008、US2 獨立測試）；既有 640 測試、性質測試、golden 為回歸網 | PASS | PASS |
| §CP-5 審查 | 經 PR（目標 `develop`）人為核准合併 | PASS | PASS |
| §CP-6 例外可追蹤 | 無例外；tech-standards 不適用（見上） | PASS | PASS |
| §GV 最小審查 | PR 檢查清單；golden 0 差異 | PASS | PASS |
| 【參考】§TR-7 ISP | `searchByType` 每個 case 一個代表值；`usedExpressionsOf` 依 US3 節點種類表各列一個區塊；標註 characterization | — | 採用 |
| 【參考】§TR-8 影響範圍 | 見下節 | — | 已宣告 |

無未說明的違規，Complexity Tracking 不需填寫。

## 變更影響範圍（§TR-8，參考）

| Story | 檔案 | 變更 | FR |
|-------|------|------|----|
| US1 | `lib/esgraph/decisionfinder.js`（新，MIT） | `findFirstDecision`、`preEvaluatedOf`、`isInert`、`isPlaceholder`、`PLACEHOLDER_TYPE` | FR-001、FR-003 |
| US1 | `lib/esgraph/astrewriter.js`（新，MIT） | `placeholder`、`shallowCopy`、`branchesOf`、`staticChoice`、`rewrite`、`branchRoot` | FR-001、FR-003 |
| US1 | `lib/esgraph/branchsplitter.js` | 只留 graph 部分；re-export `PLACEHOLDER_TYPE` | FR-001、FR-002 |
| US1 | `tests/esgraph/decisionfinder.js`、`tests/esgraph/astrewriter.js`（新） | 直接以 AST 為輸入的單元測試 | FR-003 |
| US1 | `package.json` | `test` 腳本的三個 esgraph 檔改為 `tests/esgraph/*.js`（現有檔案集合相同，加上新檔） | FR-003 |
| US1 | `THIRD_PARTY_NOTICES.md` | §1 列出 original dujs code (MIT) 檔案的那一句加入 `decisionfinder.js`、`astrewriter.js`（US2 再加 `branchlabel.js`；`lib/dujs/usedexpressions.js` 不列，該句未列任何 `lib/dujs` 檔） | FR-011 |
| US2 | `lib/esgraph/flownode.js` | 移除三欄位，新增 `split`、`labelPath`；`analyzedExpressions` 改讀 `split`；jsdoc（含不變量 `split !== null ⇒ labelPath === split.path`） | FR-004、FR-005 |
| US2 | `lib/esgraph/branchlabel.js`（新，MIT）＋`tests/esgraph/branchlabel.js`（新） | 標籤 helper 與其測試 | FR-006 |
| US2 | `lib/esgraph/branchsplitter.js`、`lib/dujs/cfgbuilder.js`、`lib/dujs/cfggraphconverter.js`、`lib/dujs/modelbuilder.js`、`lib/dujs/defuseanalyzer.js`、`tests/helpers/analyze.js` | 改用 `split`／`labelPath`／helper（清單見 [data-model.md](./data-model.md) §3） | FR-004、FR-006 |
| US2 | `tests/esgraph/flownodetest.js`、`tests/dujs/{branchsplit,branchsplit.property,reviewfixes,analyzehelper}.js` | 只改欄位存取方式，預期值不變 | FR-009 |
| US2 | `package.json` `doc` 腳本加 `lib/esgraph/branchlabel.js`；`docs/known-issues.md` §15 的 `FlowNode.branchPath` 用語 | 文件 | — |
| US3 | `lib/dujs/usedexpressions.js`（新，MIT）＋`tests/dujs/usedexpressions.js`（新） | `usedExpressionsOf` 與其測試 | FR-007、FR-008 |
| US3 | `lib/dujs/defuseanalyzer.js` | `findUSESet` 改走訪 `usedExpressionsOf` 的項目；移除 `useLoopHead`、`readsSwitchDiscriminant` 與 root 判斷 | FR-007 |

**明確不受影響**：`lib/esgraph/index.js`、`dot.js`（LGPL，不修改，故 FR-011 的 LGPL 修改紀錄不觸發）；
`findDEFSet`；`modelbuilder.js` 的 `expressionsEvaluatedAtNode` 邏輯（只改讀 `split`）；`isWithObject`／`loopRightSplit`／
`discriminantSplit`（FR-005）；`FlowNode.toJSON`（不含這些欄位）；golden 期望檔、`tests/esgraph/tests/` fixture；
`bin/dujs.js`、`lib/analyses/`；known-issues §13–§17 的現有行為。

## Project Structure

### Documentation (this feature)

```text
specs/002-small-refactors/
├── plan.md              # 本檔
├── research.md          # Phase 0：R1–R9 設計決策
├── data-model.md        # Phase 1：FlowNode.split／labelPath、UsedExpression、Decision 形狀
├── quickstart.md        # Phase 1：逐 story 驗證步驟
├── contracts/
│   └── internal-modules.md   # 新模組的內部介面（無對外 API／CLI 變更）
└── tasks.md             # Phase 2（/speckit-tasks 產出，非本指令）
```

### Source Code (repository root)

```text
lib/
├── esgraph/
│   ├── index.js            # 不變（LGPL；require('./branchsplitter') 與 split 呼叫不變）
│   ├── decisionfinder.js   # 新（US1）：只讀 AST
│   ├── astrewriter.js      # 新（US1）：路徑複製改寫，依賴 decisionfinder
│   ├── branchsplitter.js   # 修改（US1、US2）：graph 部分，依賴上兩者＋flownode＋branchlabel
│   ├── branchlabel.js      # 新（US2）：分支標籤格式唯一定義處
│   └── flownode.js         # 修改（US2）
└── dujs/
    ├── usedexpressions.js  # 新（US3）
    ├── defuseanalyzer.js   # 修改（US2、US3）
    ├── modelbuilder.js     # 修改（US2）
    ├── cfgbuilder.js       # 修改（US2）
    └── cfggraphconverter.js# 修改（US2）
tests/
├── esgraph/{decisionfinder,astrewriter,branchlabel}.js   # 新
├── esgraph/flownodetest.js                               # 修改（US2）
├── dujs/usedexpressions.js                               # 新（US3）
├── dujs/{branchsplit,branchsplit.property,reviewfixes,analyzehelper}.js  # 修改存取方式（US2）
└── helpers/analyze.js                                    # 修改（US2）
```

**Structure Decision**: 沿用既有單一專案結構。拆分相關的三個模組與標籤 helper 都放 `lib/esgraph/`（與
`flownode.js`、`branchsplitter.js` 同層，符合 spec Assumptions 的檔名）；`usedExpressionsOf` 屬 def-use 規則，放
`lib/dujs/` 的獨立模組以便直接測試（research R6）。

## 量測與 SC-003 可行性（research R1）

| 模組 | 內容（現行行數） | 預估行數 |
|------|------------------|---------|
| `decisionfinder.js` | 檔頭 ~20、常數 ~8、`isPlaceholder` 4、`isInert` 42、`findFirstDecision` 168、`preEvaluatedOf` 10、exports | ≈ 265 |
| `astrewriter.js` | 檔頭 ~20、require／常數 ~6、`placeholder` 11、`shallowCopy` 13、`branchesOf` 35、`staticChoice` 20、`rewrite` 60、`branchRoot` 21、exports | ≈ 195 |
| `branchsplitter.js` | 檔頭 ~20、require ~6、`redirect` 19、`contextsOf` 31、`discriminantContexts` 13、`isInsideLoopBody` 13、`splitNode` 119、`reachableNodes` 18、`split` 36、exports | ≈ 280 |

三者皆 < 350 行，SC-003 可行，無需放寬上限。

## 驗證方式（每個 story 結束時皆執行，見 [quickstart.md](./quickstart.md)）

1. `npm test`：全部通過、數量 ≥ 640＋新增；golden 段 0 差異；`git status tests/golden` 乾淨。
2. `npm run lint`：0 錯誤；`eslint-suppressions.json` 項目數仍為 119（`git diff --exit-code eslint-suppressions.json`）。
3. `FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js`：全部通過（固定 seed 20261116）。
4. story 專屬檢查：US1 行數與 require 檢查（SC-003、FR-001）；US2 標籤字串 grep（SC-004）；US3 `findUSESet` 範圍內 grep（SC-005）；
   Polish 再整體重跑一次 SC-004／SC-005 檢查。

## Complexity Tracking

無違規需說明。
