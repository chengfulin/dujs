# Implementation Plan: 修正已知問題（#1–#6、#8）

**Branch**: `001-fix-known-issues` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-fix-known-issues/spec.md`

## Summary

修正 `docs/known-issues.md` 的 §1–§6、§8：CFG 建構支援 labeled／`with`／`debugger`；`new` 參數、預設參數
（新增參數初始化節點）、class 欄位與 static block（新 scope）的 use 被記錄；連鎖指派不再誤記內層目標；
同名 scope 加後綴。核心是 FR-008：把 `?:`、`&&`、`||`、`??` 與邏輯指派依「等效 if/else（尾端複製）」拆成
決策節點與葉節點。技術做法：新 MIT 模組 `lib/esgraph/branchsplitter.js` 在 esgraph 建好基本 CFG 後、
排序編號前，以「路徑複製的合成 AST＋佔位節點」產生葉節點、以「條件運算式＋`preEvaluated`」產生決策節點，
所有下游走訪器不需理解替換即得到正確的 def／use／呼叫點（[research.md](./research.md) R1–R3）。測試輔助工具
加上分支路徑記法（FR-014），並以 fast-check 性質測試驗證 FR-010 與 D12 的不變量。

## Technical Context

**Language/Version**: JavaScript（CommonJS，ES5 風格的 `lib/` 程式碼），Node.js ≥ 24（`package.json` engines）

**Primary Dependencies**: espree ^11.2.0（parser，支援 `PropertyDefinition`、`StaticBlock`、邏輯指派）、
walkes ^0.2.1（AST walker）；CFG 建構於 `lib/esgraph`（衍生自 esgraph 0.1.1，LGPL-3.0-only，修改須在檔頭
「Modified by」段與 `THIRD_PARTY_NOTICES.md` 記錄）；def-use 分析於 `lib/dujs`（MIT）

**Storage**: N/A（CLI 輸出 `.dot` 檔至 `out-<時間>/`）

**Testing**: mocha ^12 ＋ should ^13（既有）；c8 ^12（coverage）；eslint ^10（lint）；**新增 devDependency
fast-check ^4.10.2**（搭配 mocha，性質測試 FR-010 與 D12 不變量；research R11）

**Target Platform**: Node.js ≥ 24（macOS／Linux 開發機、CI）

**Project Type**: library ＋ CLI（`bin/dujs.js`）

**Performance Goals**: 無新目標；既有 `npm test` 維持秒級（現約 0.5 s，性質測試預設 100 runs）

**Constraints**: 不改 CLI 參數與輸出檔格式（spec Assumptions）；golden 差異只可因本 spec 的 FR（FR-013、SC-004）；
不引入暫存變數（FR-008）；LGPL 檔案修改須記錄；拆分節點數不設上限（README 註明乘積成長）

**Scale/Scope**: 7 個已知問題、6 個 user story、14 條 FR；主要修改 `lib/esgraph/index.js`、
`lib/dujs/{defuseanalyzer,modelbuilder,scopetree,scope,cfggraphconverter}.js`，新增
`lib/esgraph/branchsplitter.js`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／USR 決策；spec 與既有限制衝突處（US5 情境 10 vs README 呼叫點限制）已由使用者裁決（R12 方案 A，spec 情境 10 拆為 10／10b），不擴大範圍 | PASS | PASS（R12 已裁決：A，spec 已先更新） |
| §CP-2 機密 | 不涉及機密 | PASS | PASS |
| §CP-3 設定不硬編碼 | 無環境相依設定；性質測試 runs 可由 `FC_NUM_RUNS`、seed 可由 `FC_SEED` 覆寫（預設固定 seed） | PASS | PASS |
| §CP-4 核心邏輯測試 | 每個驗收情境一個自動化測試；FR-010／D12 以性質測試；golden 回歸 | PASS | PASS |
| §CP-5 審查 | 經 PR 人為核准合併 | PASS | PASS |
| §CP-6 例外可追蹤 | 偏離 tech-standards 兩項記於下節（tech-standards 非強制，仍記錄） | PASS | PASS |
| §GV 最小審查 | PR 檢查清單 ＋ golden 差異逐處對應 FR | PASS | PASS |
| 【參考】§TR-7 ISP | 驗收情境即分割代表值；性質測試補 block 內隨機採樣 | — | 採用 |
| 【參考】§TR-8 影響範圍 | 見下節「變更影響範圍」 | — | 已宣告 |

無未說明的違規，Complexity Tracking 不需填寫。

## 變更影響範圍（§TR-8，參考）

| 模組 | 檔案 | FR |
|------|------|----|
| CFG（LGPL） | `lib/esgraph/index.js`（labeled／with／debugger、呼叫 branchsplitter、檔頭紀錄） | FR-001～003、FR-008 |
| CFG（MIT，新） | `lib/esgraph/branchsplitter.js`（介面 `split(allNodes, { expressionThrows: fn })`，`expressionThrows` 由 LGPL 的 index.js 傳入，本檔不含 LGPL 程式碼） | FR-008、FR-010 |
| FlowNode | `lib/esgraph/flownode.js`（`preEvaluated`、`branchPath`、`splitOrigin`、`analyzedExpressions`、`isWithObject`、`loopRightSplit`） | FR-003、FR-008、FR-014 |
| def-use | `lib/dujs/defuseanalyzer.js`（new 參數、連鎖指派、單一識別字、with 物件 use、走訪 `analyzedExpressions`、switch 判斷式與 for-in／for-of 右側不重讀） | FR-003、FR-004、FR-007～009 |
| 變數 | `lib/dujs/variableanalyzer.js`（必要時：新 scope 的 `ClassBody` 略過不影響分析，T026） | FR-006 |
| 模型 | `lib/dujs/modelbuilder.js`（參數初始化合成本體、static 成員串接、callReturn 複製 `branchPath`） | FR-005、FR-006 |
| scope | `lib/dujs/scopetree.js`、`lib/dujs/scope.js`（欄位／static scope、名稱唯一化） | FR-006、FR-011 |
| 輸出 | `lib/dujs/cfggraphconverter.js`（拆出節點 label） | FR-008 |
| 測試 | `tests/helpers/analyze.js`、`tests/dujs/*`（新增驗收與性質測試、更新 `tests/dujs/es2015.js` 既有 p-use 字串 4 處 9 筆）、`tests/dujs/defuseanalyzer.js` 等（依 T043 失敗清單）、`tests/esgraph/flownodetest.js`（FlowNode 新欄位）、`tests/golden/expected-es2015/`、`tests/esgraph/tests/maythrow.js`、`tests/esgraph/tests/README.md`（fixture 修改說明） | FR-013、FR-014 |
| 文件 | `README.md`、`docs/known-issues.md`、`THIRD_PARTY_NOTICES.md` | FR-012 |
| 稽核 | `specs/001-fix-known-issues/golden-diff.md`（golden 差異 → FR 對照的工作檔，T053 彙整進 PR 說明） | FR-013 |
| 依賴 | `package.json`、`package-lock.json`（fast-check） | — |

**明確不受影響**：KI §7（class 方法呼叫連結）、§9；可選鏈；`with` 的屬性推斷；呼叫點偵測規則（R12 裁決 A）；
`lib/analyses/`；`bin/dujs.js`；ES5 golden（`tests/golden/expected/`）預期零差異。

## 偏離 tech-standards（§CP-6 記錄）

| 項目 | tech-standards 建議 | 本專案做法 | 理由 |
|------|---------------------|-----------|------|
| PBT 執行框架 | fast-check（舉例 Jest／Vitest 生態） | fast-check 搭配既有 mocha | 既有系統相容；同專案維持測試框架選型一致 |
| Mutation testing | Stryker | 本輪不導入 | 使用者決定本輪範圍只加 PBT；後續晉級或另案再評估 |

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-known-issues/
├── plan.md              # 本檔
├── research.md          # Phase 0：設計決策 R1–R12
├── data-model.md        # Phase 1：FlowNode／合成 AST／Scope 變更
├── quickstart.md        # Phase 1：驗證步驟
├── contracts/
│   ├── analyze-helper-notation.md   # 測試輔助工具 pair 記法（FR-014）
│   └── cli-and-output.md            # CLI、API、輸出檔相容性
├── golden-diff.md       # implement 期間的稽核工作檔：golden 差異 → FR（最後由 T053 彙整進 PR 說明）
└── tasks.md             # Phase 2（/speckit-tasks 產出，非本指令）
```

### Source Code (repository root)

```text
bin/dujs.js                      # CLI（不變）
lib/
├── esgraph/                     # CFG 建構（index.js、dot.js 為 LGPL 衍生；其餘 MIT）
│   ├── index.js                 # 修改
│   ├── branchsplitter.js        # 新增（MIT）
│   ├── flownode.js              # 修改
│   └── dot.js                   # 不變
├── dujs/                        # scope、模型、def-use 分析（MIT）
│   ├── defuseanalyzer.js        # 修改
│   ├── modelbuilder.js          # 修改
│   ├── scopetree.js / scope.js  # 修改
│   └── cfggraphconverter.js     # 修改
└── analyses/                    # 不變
tests/
├── helpers/analyze.js           # 修改（記法）
├── dujs/                        # 新增各 US 驗收測試與 branchsplit.property.js
├── esgraph/tests/               # maythrow.js 期望更新
└── golden/expected-es2015/      # 期望更新（逐處對應 FR）
```

**Structure Decision**: 沿用既有單一專案結構（`lib/esgraph` 建 CFG、`lib/dujs` 分析、`tests/` 依模組分目錄）；
拆分邏輯獨立為 `lib/esgraph/branchsplitter.js`，使 LGPL 檔案只增加呼叫點與 labeled／with／debugger 的最小修改。

## 已裁決事項

- **R12（已裁決：方案 A）**：US5 情境 10 原要求 `var x = log(c ? a : b);` 的葉連結到 `log` scope，與 README
  「只有呼叫敘述會連結」衝突。使用者 2026-11-16 裁決方案 A：spec 情境 10 改為 `log(c ? a : b);`，`var x = …`
  形式另列情境 10b 只驗 pair；呼叫點偵測規則不變。詳見 [research.md](./research.md) R12。
- **D14–D16（2026-11-16 analyze）**：US4 情境 3 只驗 `a = b += 1`，`a ||= b ||= 1` 移到 US5 情境 14；`return`／
  `throw` 的葉一律建節點（US5 情境 15）；不設複製上限、README 註明壓縮檔風險。for-in／for-of 右側拆分見 US5
  情境 16。

## Complexity Tracking

無違規需說明。
