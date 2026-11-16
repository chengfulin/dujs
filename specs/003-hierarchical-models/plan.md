# Implementation Plan: 階層式模型結構（重構 stage 1）

**Branch**: `003-hierarchical-models` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-hierarchical-models/spec.md`

## Summary

上層模型不再改動共用的 `FlowNode`：每個上層模型記錄一份**階層**（單位節點參照下層模型，加上帶全域序號的操作：呼叫邊、LOOP 掛接、
事件邊、storage 邊），扁平圖由純函式 `expand` 從階層產生——複製原件（沿用 `cfgId`、不消耗計數器、所有非 null 的 GEN 以複本為 fromNode 重建），再依
全域序號在複本上重播與現況**同一套**改邊程式。結構節點（CALL、CALL RETURN、LOOP、LOOP RETURN、domain）在建階層時以相同次序建立一次，
扁平圖只放它們的複本。因此節點陣列、鄰接順序、節點編號與現況相同，既有 .dot 逐位元組不變；每個模型的複本只屬於自己，分析結果自然
分開，另存於 `Model` 並提供唯讀查詢。US2 從階層輸出 `<k>.hierarchy.dot` 並放進 HTML 報告；US3 處理 known-issues §9。設計理由見
[research.md](./research.md) R1–R17。

## Technical Context

**Language/Version**: JavaScript（CommonJS，`lib/` 維持 ES5 風格），Node.js ≥ 24（`package.json` engines）

**Primary Dependencies**: espree ^11.2.0、walkes ^0.2.1；`lib/esgraph/index.js`、`dot.js`、`lib/analyses/index.js` 為 LGPL-3.0-only 衍生檔——
本 feature 只在 `index.js` 檔頭補修改紀錄（US3），不改其程式；新模組皆 MIT。**無新增依賴**（golden manifest 用 Node 內建 `crypto`）。

**Storage**: N/A（CLI 輸出 `.dot`／`.png`／`report.html`）

**Testing**: mocha ^12＋should ^13；fast-check ^4.10.2（`FC_SEED` 預設 20261116、`FC_NUM_RUNS` 預設 100）；golden 回歸
`tests/golden/golden.js`（ES5 `expected/`、ES2015+ `expected-es2015/`，本 feature 新增 `expected-interprocedural/` 與 `manifest.json`）；eslint ^10；c8。
**基線**（本分支 `03bc6a5`，`lib/`／`bin/`／`tests/` 與 `bf07818` 相同）：`npm test` **786 passing**（約 2 s）、`npm run lint` **0 錯誤**、
`eslint-suppressions.json` **119** 筆抑制（36 個檔案）。

**Target Platform**: Node.js ≥ 24（macOS／Linux 開發機、CI）

**Project Type**: library＋CLI（`bin/dujs.js`）

**Performance Goals**: 無新目標；每個上層模型多一次複製（節點數線性），`npm test` 維持秒級

**Constraints**: 既有 .dot（含節點編號與 dupairs 標籤）逐位元組不變，差異一律視為行為改變、不得以 `UPDATE_GOLDEN` 放行；既有測試預期值
不變（只允許 research R13 列出的取值方式改寫）；不新增 lint 抑制；CLI 參數與輸出目錄結構不變（只多出 `.hierarchy.dot`／`.png`）

**Scale/Scope**: 3 個 user story、14 條 FR；新增 `lib/dujs/hierarchy.js`、`expansion.js`、`hierarchydot.js`；修改 `modelbuilder.js`、`model.js`、
`defuseanalyzer.js`、`scope.js`、`outputwriter.js`、`reportgenerator.js`、`lib/esgraph/flownode.js`、`jsparser.js` 等

**tech-standards**：`.specify/memory/baseline/tech-standards.md` 針對服務後端／前端，對本 CLI／函式庫屬「不適用」而非偏離，無需 §CP-6 例外。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／USR 決策／Clarifications；外漏型態擴大定義與 FR-011(d) lint 處置皆依 spec Clarifications（plan 仲裁） | PASS | PASS |
| §CP-2 機密 | 不涉及 | PASS | PASS |
| §CP-3 設定不硬編碼 | 無環境相依設定；`UPDATE_GOLDEN`、`FC_*` 沿用環境變數 | PASS | PASS |
| §CP-4 核心邏輯測試 | 新模組各有單元測試（展開、複本、環、計數器、查詢介面、階層圖）；SC-003 不變性檢查嵌入 helper；golden 三個 case＋manifest | PASS | PASS |
| §CP-5 審查 | PR 目標 `develop`，人為核准合併 | PASS | PASS |
| §CP-6 例外可追蹤 | 無例外；tech-standards 不適用；jsparser 的 lint 處置已決為 eslint 規則設定（非抑制），於 PR 與 known-issues §9 記錄 | PASS | PASS |
| §GV 最小審查 | PR 檢查清單；golden #3 基準雜湊 0 差異 | PASS | PASS |
| 【參考】§TR-7 ISP | 展開測試依「呼叫點種類（非決策／決策前／鏈接）× 被呼叫者（intra／inter 子模型）× 重複（無／共用被呼叫者）」各取代表；不變性快照標註 characterization | — | 採用 |
| 【參考】§TR-8 影響範圍 | 見下節 | — | 已宣告 |

無未說明的違規，Complexity Tracking 不需填寫。

## 延後釐清（spec 指定 plan 必答）的回答

| 項目 | 回答 | 詳見 |
|------|------|------|
| golden 如何同時驗證「既有檔不變」與「新增檔清單」 | 新增 `tests/golden/manifest.json`：`baseline`＝重構前輸出的 sha256（Setup 時產生、本 feature 不得改）、`added`＝新增檔清單；golden.js 每個 case 新增「baseline 雜湊相同」與「實際清單 − baseline＝added」兩個 `it`。`UPDATE_GOLDEN` 只重建 expected 目錄，不碰 manifest，因此無法放行既有檔差異 | R10、[contracts/golden-verification.md](./contracts/golden-verification.md) |
| HTML 以 `<img>` 引用圖檔，如何不依賴 Graphviz 驗證 | `writeImageFileFromDotFile` 不論 Graphviz 是否安裝都回傳 png 路徑；golden case 讀 `report.html` 文字，斷言階層圖路徑在同模型扁平圖之前、既有路徑相對順序不變 | R12、[contracts/hierarchy-output.md](./contracts/hierarchy-output.md) §4 |
| `scope.lastReachIns` | 移除寫入與 `Scope` 的屬性（無讀取者；跨模型共用的全域狀態與 FR-003 相悖） | R7 |
| `branchsplit.js` 的 `dujsDecisionCalledBefore` 斷言 | 標記移除；改以階層查詢 `edge.beforeDecision === true` 且 `model.flatNodeOf(edge.callSite) === found.nodes[3]`（同一預期） | R13 |

## 關鍵設計

1. **複本展開不消耗計數器**：`FlowNode.copyNodes` 以 `new FlowNode(...)` 建複本並直接設 `cfgId`，不經 `flownodefactory`（R2）。
2. **結構節點只建一次、次序同現況**：建階層的走訪程式不變，只把「改接邊」換成「記錄操作＋建樣板」；每條呼叫邊先 CALL RETURN、決策前
   插入時再 CALL；每頁先 LOOP 後 LOOP RETURN；inter-page 建模時建 domain。樣板不連邊（R3）。
3. **重複節點＝同一複本**：展開以 `Map(原件 → 複本)` 為單一來源；節點陣列以現況串列演算法的純函式版本產生，保留 `concat` 重複（R4）。
4. **複本 GEN 的 Def 指向複本**：`findGENSet` 結尾會 `cfgNode.generate = generatedVarDef` 快取，intra-procedural 分析後每個走訪過的原件
   `generate` 都非 null、且 Def 的 `fromNode` 是原件；`callReturnNode.generate = callSite.generate` 搬的也是這份快取。因此展開時**所有**非 null
   的 `generate` 都在重播之前逐項以複本為 `fromNode` 重建 VarDef（R2）；只重建 entry 會讓 `f(x = 1);` 這類非決策呼叫點搬到 CALL RETURN 的
   GEN 失去定義。
5. **鄰接順序保持**：複本逐項照抄原件的 `prev`／`next` 與各連線槽；操作依全域序號 `seq` 在複本上重播與現況相同的程式（R1、R5）。
6. **每模型一份分析結果**：`doAnalysis` 另把 `{reachIns, reachOuts, generate, kill, cuse, puse}` 存進 `Model`；`model.analysisResultOf(node)`
   接受原件或扁平圖節點，回傳新的 Set（R7、[contracts/model-api.md](./contracts/model-api.md)）。
7. **reach-in 讀法**：解析被呼叫函式讀 intra-procedural 原件；找事件處理器讀「該頁 inter-procedural 模型中最後分析、且有該原件結果者」，
   沒有則讀原件（R8；前提是被呼叫者必在呼叫端 intra reach-in 內，模型間只有巢狀或互斥，故等價於 spec 的「最頂端」；stage 2 放寬呼叫解析時需重議）。
8. **輸出時機**：`bin/dujs.js` 不變；扁平圖建好後只被自己的分析與寫檔碰到，內容與時機無關（R9）。
9. **階層圖**：`<k>.hierarchy.dot`，與該模型 `graph.dot` 同目錄；HTML 每個模型區塊在扁平圖之前插入（R12）。

## 變更影響範圍（§TR-8，參考）

| Story | 檔案 | 變更 | FR |
|-------|------|------|----|
| Setup | `tests/golden/fixtures/interprocedural/app.js`、`tests/golden/expected-interprocedural/`（新） | 新 fixture 與重構前產生的 golden | FR-010 |
| Setup | `tests/golden/manifest.json`（新）、`tests/golden/golden.js` | baseline 雜湊、added 清單、contract #3／#4 | FR-006、FR-010 |
| US1 | `lib/esgraph/flownode.js`（MIT） | `copyNodes`、`original` | FR-001、FR-005 |
| US1 | `lib/dujs/hierarchy.js`、`lib/dujs/expansion.js`（新，MIT） | 階層資料、樣板、全域序號、手動建立入口；節點順序、複製、GEN 重指、重播、環防護 | FR-002、FR-004、FR-005 |
| US1 | `lib/dujs/modelbuilder.js` | 三個上層建模改為建階層＋`expand`；R8 的 reach-in 讀法；移除四個 connect 私有函式 | FR-001、FR-002、FR-004、FR-005 |
| US1 | `lib/dujs/model.js` | `level`、`hierarchy`、`flatNodeOf`、`analysisResultOf`、`setAnalysisResults` | FR-003、FR-004 |
| US1 | `lib/dujs/defuseanalyzer.js`、`lib/dujs/scope.js` | 存結果；移除 `lastReachIns` | FR-003 |
| US1 | `tests/helpers/analyze.js`、`tests/dujs/{branchsplit,branchsplit.property,modelbuilder,reviewfixes}.js` | R13 的改寫；helper 加不變性檢查 | FR-006、FR-007 |
| US1 | `tests/dujs/{hierarchy,expansion}.js`、`tests/esgraph/flownodetest.js`（新增案例）、`tests/dujs/model.js`（新增案例） | 單元測試與 US1 情境 1–7 | FR-001–FR-005 |
| US1 | `specs/001-fix-known-issues/contracts/analyze-helper-notation.md` | 刪除兩個繞路的說明 | FR-007 |
| US2 | `lib/dujs/hierarchydot.js`（新，MIT）＋`tests/dujs/hierarchydot.js` | 階層圖 dot | FR-008 |
| US2 | `lib/dujs/outputwriter.js`、`lib/dujs/reportgenerator.js` | 寫 `.hierarchy.dot`／png、報告插入 | FR-008、FR-009 |
| US2 | `tests/golden/expected*/**/*.hierarchy.dot`、`manifest.json` 的 `added`、golden.js contract #5 | 新 golden | FR-010 |
| US3 | `lib/esgraph/index.js`（只改檔頭）、`THIRD_PARTY_NOTICES.md` | 兩筆修改紀錄 | FR-011a、FR-014 |
| US3 | `lib/dujs/defuseanalyzer.js` | JSDoc 歸位、補 JSDoc、刪 `findKILLSet` | FR-011b、c |
| US3 | `lib/dujs/jsparser.js`、`eslint.config.js`（`caughtErrorsIgnorePattern`） | 有綁定的 catch | FR-011d、FR-013 |
| US3 | `docs/known-issues.md` | §9 已修正；§13、§16 註記；§18 移到 stage 2；新增 N1 一節 | FR-012 |
| US3 | `package.json` `doc` 腳本 | 不需改（`lib/dujs` 整個目錄已在內） | — |

**明確不受影響**：`bin/dujs.js`；`lib/esgraph/index.js`、`dot.js`、`lib/analyses/` 的程式；`branchsplitter.js` 等 esgraph 拆分模組；`usedexpressions.js`；
`findGENSet`／`findUSESet`／`computeKILLSet` 的邏輯；呼叫解析規則（仲裁 H5）；known-issues §14、§15、§17、§18 的行為；既有 golden 檔。

## Project Structure

### Documentation (this feature)

```text
specs/003-hierarchical-models/
├── plan.md              # 本檔
├── research.md          # Phase 0：R1–R17
├── data-model.md        # Phase 1：Model／Hierarchy／Unit／Edge／NodeResult／manifest
├── quickstart.md        # Phase 1：Setup 與各 story 驗證步驟（含新 fixture 全文）
├── contracts/
│   ├── model-api.md            # 模型、階層、展開、FlowNode 複本的程式介面
│   ├── hierarchy-output.md     # 階層圖檔名／格式／人工核對準則／HTML 插入
│   └── golden-verification.md  # golden 三個 case 與 manifest 規則
└── tasks.md             # Phase 2（/speckit-tasks 產出，非本指令）
```

### Source Code (repository root)

```text
lib/
├── esgraph/
│   └── flownode.js          # 修改（US1）：copyNodes、original
└── dujs/
    ├── hierarchy.js         # 新（US1）
    ├── expansion.js         # 新（US1）
    ├── hierarchydot.js      # 新（US2）
    ├── modelbuilder.js      # 修改（US1）
    ├── model.js             # 修改（US1）
    ├── defuseanalyzer.js    # 修改（US1、US3）
    ├── scope.js             # 修改（US1）：移除 lastReachIns
    ├── outputwriter.js      # 修改（US2）
    ├── reportgenerator.js   # 修改（US2）
    └── jsparser.js          # 修改（US3）
tests/
├── golden/{golden.js, manifest.json, fixtures/interprocedural/, expected-interprocedural/}
├── helpers/analyze.js
├── dujs/{hierarchy,expansion,hierarchydot}.js   # 新
└── dujs/{branchsplit,branchsplit.property,modelbuilder,model,reviewfixes}.js, esgraph/flownodetest.js  # 修改
```

**Structure Decision**: 沿用既有單一專案結構。階層、展開、輸出各一個 `lib/dujs/` 模組，依賴方向
`modelbuilder → hierarchy, expansion`；`expansion → hierarchy, flownode, vardeffactory, deffactory`；`outputwriter → hierarchydot → hierarchy`；
`flownode` 不依賴 dujs。`modelbuilder.js` 的改接邊程式移到 `expansion.js`（作為重播的操作實作），`modelbuilder.js` 預期由 776 行降到約 550 行。

## 實作順序（每個階段結束時 `npm test`、lint、golden 全綠）

1. **Setup（最早，任何 `lib/` 變更前）**：新 fixture → 以重構前程式產生 `expected-interprocedural/` → 產生 manifest baseline → golden #3／#4 →
   提交。步驟與指令見 [quickstart.md](./quickstart.md) §1。這個 commit 是之後所有比對的基準。
2. **US1**（依序，每步綠）：
   1. `FlowNode.copyNodes`／`original` ＋ 單元測試（欄位、鄰接順序、計數器不變）。
   2. `Model` 擴充＋`doAnalysis` 存結果＋移除 `lastReachIns`（輸出不變）。
   3. `hierarchy.js`／`expansion.js` ＋ 單元測試（手動階層、三種呼叫點、鏈接呼叫、共用被呼叫者、重複處理器、R8「搜尋的模型不是最頂端模型」、
      每個複本 GEN 的 `fromNode`（含 `f(x = 1);`）、環、計數器、展開兩次）；新 fixture 不涵蓋的路徑由此補。
   4. inter-procedural 改為建階層＋展開（新 fixture 的 golden 是主要把關）。
   5. intra-page 改為建階層＋展開，套 R8 讀法。
   6. inter-page 改為建階層＋展開。至此 intra-procedural 原件不再被改動。
   7. 以 grep 找出所有「原件與上層節點比身分」的斷言（含 `branchsplit.js`、`reviewfixes.js`），改為比對 `flatNodeOf(原件)` 並逐條檢查未變成空轉
      （特別是 `reviewfixes.js` 約 82–91 行）；測試改寫（R13）、helper 移除兩個繞路並加不變性檢查（R14）、US1 情境 1–7 的測試、更新 001 的 helper 契約文件。
3. **US2**：`hierarchydot.js`＋單元測試 → writer／report → 人工核對新檔（contracts/hierarchy-output.md §3）→ `UPDATE_GOLDEN=1` 產生新檔、
   填 `added` → golden #5。
4. **US3**：§9 四點（可與 US2 並行，檔案不重疊；`defuseanalyzer.js` 的 JSDoc 整理須在 US1 步驟 2 之後）→ known-issues（FR-012，含 N1 一節，以統一定義描述並附重現程式）。

## 已決事項（plan 仲裁，2026-11-16；見 spec Clarifications）

1. **外漏型態（R6）**：統一定義為「子模型呼叫鏈上任一函式（根函式或其任一祖先）被呼叫兩次以上或在迴圈內呼叫」，視為 N1 同一缺陷、不重現；known-issues 新節附重現程式。
2. **`jsparser.js` 的有綁定 catch 與 lint（R16）**：`eslint.config.js` 的 `no-unused-vars` 加 `caughtErrorsIgnorePattern: '^ignored'`，
   綁定命名 `ignoredModuleError`（規則設定而非抑制項）；PR 與 known-issues §9 各記一筆。

## 已知風險

| # | 風險 | 影響 | 緩解 |
|---|------|------|------|
| 1 | 重播次序或鄰接順序與現況有一處不同 | 既有或新 fixture 的 .dot 行序改變 | 全域序號；複本逐項照抄內部陣列；新 fixture 涵蓋非決策呼叫、決策前插入、巢狀子模型、處理器子模型；Setup 先鎖定重構前 golden |
| 2 | 既有測試含 N1 外漏型態 | pair 改變、測試失敗 | 仲裁實測既有測試不依賴外漏（濾掉模型外的邊後 786 全過）；若仍出現差異依 spec 停下裁決 |
| 3 | 複本 GEN 重建遺漏或 VarDef 身分不穩定（`findGENSet` 快取使每個走訪過的原件都帶 GEN） | dupairs 標籤、CALL RETURN 的 GEN 或收斂過程改變 | 所有非 null 的 GEN 在重播前於展開時重建一次；單元測試檢查**每個**複本 GEN 的每個 `fromNode` 都是複本，並含 `f(x = 1);` 案例（CALL RETURN 的 GEN 含 `x`、`fromNode` 為複本） |
| 4 | 某上層扁平圖節點在該模型分析中未被走訪 | 現況會沿用舊 `reachIns` 產生 pair；新設計為 `null` 而在 `findDUPairs` 拋錯 | 現況 intra-procedural 也有同樣前提（未走訪即拋錯），預期不會發生；不變性與 golden 會顯示，若發生停下裁決 |
| 5 | 測試改寫越界（FR-006） | 違反「預期值一字不動」 | 只做 R13 列出的改寫；PR 中逐檔列出 |
| 6 | 新 fixture 未涵蓋鏈接呼叫（class static，ES2015）、重複處理器、R8「搜尋的模型不是最頂端模型」的路徑 | golden 漏網 | 由 expansion／hierarchy 單元測試補（可參考仲裁探針 `specs/003-hierarchical-models/probes/`（仲裁探針程式複本：a1–a4 對抗案例、n1／n1b／n1c 外漏型態、r6a–c），唯讀）＋`tests/dujs/classfields.js`、`reviewfixes.js` 既有斷言＋helper 不變性檢查 |
| 7 | `modelbuilder` 私有測試改為「手建階層＋`expand`」，超出「只改取值方式」 | 審查負擔、FR-006 邊界 | 預期的長度、種類、位置保持原值，PR 逐條附改寫前後對照 |
| 8 | 改為比對 `flatNodeOf(原件)` 的斷言變成空轉 | 測試失去把關 | 實作步驟 2.7 逐條檢查（`reviewfixes.js` 約 82–91 行為已知候選） |

## Complexity Tracking

無違規需說明。

## Post-design Constitution Re-check

Phase 1 設計（data-model、contracts、quickstart）未引入新依賴、設定或例外；各條款維持 PASS（見上表）。本 feature 不更新 agent context 檔
（專案根沒有 `CLAUDE.md`，plan 範本也未要求）。
