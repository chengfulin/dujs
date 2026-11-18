# Implementation Plan：成員賦值不是物件變數的定義（KI §22 (1)）、函式中的 `o.m()` 放寬（KI §23）、無法到達的程式碼不產生 pair 的查核（KI §22 (5)）

**Branch**: `008-property-defs-method-calls` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-property-defs-method-calls/spec.md`（D001–D017 已裁決；D012–D017 為 plan 階段的使用者裁決）

## Summary

US1：`defuseanalyzer` 的 GEN 不再把成員目標的物件變數當定義，USE 把 `=`／解構／`for…in`／`for…of` 左側成員目標的物件運算式與計算鍵記為讀取；物件變數依 Var 同一性為 domain `localStorage` 者整個走 develop 的程式路徑（新 `PageBinding.isLocalStorageObject`，與 hierarchy 的儲存定義判定共用）。
摘要、攤平圖、inter-page 與呼叫解析（嚴格規則與 D2／class 放寬的頁面定義計數）都經 GEN／USE，自動一致並帶出 P29–P32 的外溢修正。
US2：`callresolver.classOfInstance` 在沒有到達定義時加 `relaxedClassOfInstance`（函式中、`let`／`const`、頁面唯一定義、`new A()` 且 A 解析為 class），與 005 D2 共用 `isInFunction`／`definitionsOnThePage`。
US3：新增與求解器獨立的可到達檢查器 `tests/helpers/reachability.js`（(a)(b)(c)、差分、見證、允許清單），以 `npm test` 對 probes、golden、MDN 全量檢查；產品程式碼只改 `defuseanalyzer.findDUPairs` 的 deferred p-use 配對條件（owner 決策節點可到達才配對，FR-013、D017，P38–P40）。
golden／MDN 差異以 008 自己的 `tools/diffcheck.js`＋`tools/classify.js`（損失／修正的語法判準）記錄，基準 `2035c93`。設計理由見 [research.md](./research.md) R0–R14。

## Technical Context

**Language/Version**: JavaScript（CommonJS，`lib/` 維持 ES5 風格），Node.js ≥ 24

**Primary Dependencies**: espree ^11.2.0、eslint-scope ^9.1.2、walkes ^0.2.1、自有 esgraph CFG（`lib/esgraph/`）。**不新增相依**；`lib/esgraph/**`（含 LGPL 檔）不修改。

**Storage**: N/A（CLI 輸出 `.dot`／`.png`／`report.html`／`*.matching.json`，格式不變）

**Testing**: mocha ^12＋should ^13＋fast-check ^4；golden `tests/golden/golden.js`＋`manifest.json`；eslint ^10；c8。**基線**（`2035c93`）：`npm test` **1715 passing**（2026-11-18 實測）。

**Target Platform**: Node.js ≥ 24（macOS／Linux）

**Project Type**: library＋CLI（`bin/dujs.js`）

**Performance Goals**: SC-006：golden fixture 與 MDN 33 檔（1218 行）總分析時間 ≤ develop（`2035c93`）× 2（`specs/006-eslint-scope/tools/perf.js`＋golden CLI，同機 3 輪中位數，記入 `perf.md`）。

**Constraints**: `probes/pages/baseline-develop.txt` 的 s1–s9 逐行不變（D004）；沒有新的節點型別、邊型別或輸出格式（FR-005）；檢查器不重用 reachingsolver 的 reached 與 summary 的 normalReturn（FR-007）；
005／006／007 的 diffcheck 與其他驗收工具不得修改（008 工具只 require 或複製）；golden 每處差異記錄、分類並經簽核（FR-009）；`eslint-suppressions.json` 不得新增鍵或增加 count；spec.md 不由 plan 修改。

**Scale/Scope**: 3 個 user story、13 條 FR；修改 lib 檔 6 個（`defuseanalyzer.js`〔含 US3 的 `findDUPairs`〕、`usedexpressions.js`、`bindingpattern.js`、`scopebinding.js`、`callresolver.js`、`hierarchy.js`〔純重構〕），新增 lib 檔 0 個；
新增測試 3 個（`propertydefs.js`、`reachability.js`、`reachabilityinvariant.js`）＋測試輔助 1 個（`tests/helpers/reachability.js`）＋擴充既有測試；feature 目錄新增 `tools/`（diffcheck、classify 與測試）、MDN 快照、紀錄檔。

**tech-standards**：`.specify/memory/baseline/tech-standards.md` 未涵蓋靜態分析 CLI／函式庫，無偏離項，無 §CP-6 例外。技術選型維持 repo 現況（無偏離）。

**NEEDS CLARIFICATION**：無技術未知項。spec 交 plan 的事項（M4、D006 工具、FR-008 判準、localStorage 實作、FR-004 判準）已於 research／contracts 定案；需使用者確認的解讀已由使用者裁決（D012–D017，見「使用者裁決」）。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／D00x／KI（下表「關鍵設計」）；spec 未定或可兩解之處列為「需使用者裁決」，預設選項維持 develop 行為（不做 spec 外的修正） | PASS | PASS |
| §CP-2 機密 | 不涉及；MDN 語料為 CC0 | PASS | PASS |
| §CP-3 設定不硬編碼 | 無新設定；diffcheck 基準以檔頭「基準：」行／`--base` 指定；`UPDATE_GOLDEN` 沿用 | PASS | PASS |
| §CP-4 核心邏輯測試 | 每個驗收情境有自動化測試（contracts/acceptance.md）；FR-006／FR-007 以 `npm test` 內的不變量測試＋陽性對照；分類工具有自我測試；golden 回歸 | PASS | PASS |
| §CP-5 審查 | PR 目標 `develop`，人為核准 | PASS | PASS |
| §CP-6 例外 | 無 | PASS | PASS |
| §GV 最小審查 | golden-diff／mdn-diff 由 diffcheck `--verify` 核對，釘選類別與段結構改變行由使用者簽核；SC-007 的 `docs-check.md` | PASS | PASS |
| 【參考】§TR-7 ISP | 成員目標形態（`=`／複合／邏輯／`++`／解構／for-in-of 左側／巢狀／`delete`／`this.p`）× 物件運算式（識別字／成員鏈／計算鍵／呼叫）× 物件變數（一般／domain `localStorage`／遮蔽／頁面宣告／別名／`window.localStorage`）× 節點（敘述／決策／段）× 模型（四層＋摘要）；放寬：位置（頁面／函式／處理器）× kind（let／const／var）× 定義數（1／2）× callee（class／函式）× 宣告分開；可到達：(a)(b)(c) 各自的正反例（含 (a) 分呼叫點 P41、呼叫節點無例外邊的 record）× 模型；deferred p-use：owner 可到達／不可到達 × `if`／`while`／巢狀呼叫（P38–P40）| — | 採用（contracts/acceptance.md、reachability.md §6） |
| 【參考】§TR-8 影響範圍 | 見下節 | — | 已宣告 |

## 關鍵設計（plan 必答議題）

| # | 議題 | 決策 | research／contracts |
|---|------|------|---------------------|
| 1 | 008 差異工具（D006） | `tools/classify.js` 純模組（espree＋eslint-scope 取原始碼事實：寫入路徑、讀取形態、同行敘述數）＋`tools/diffcheck.js`（複製 007 的 compareCase／report／verify 後修改；解析 helper 以 require 使用 005／006／007 匯出，不改它們）。損失判準：讀寫同屬性路徑、互為前綴、計算鍵、整個物件讀取、`delete`、同路徑方法呼叫（D011）→ 損失；裸 callee／`new` 運算元、不同路徑、只為解參考 → 修正；模糊（同行多敘述、同名多宣告）→ 損失。正反例含 P1、P25、P4、P2（4 損失 2 修正）、P27、P29–P32、P37。**T068 (d)**：同一行兩側段標記多重集合相同時以保留後綴的完整標記比對，不同時退回去後綴並列入「段結構改變行」表逐列簽核 | R9；contracts/diff-check.md |
| 2 | 獨立可到達檢查器（FR-006～FR-008；**M4**） | `tests/helpers/reachability.js`＋`tests/dujs/reachability.js`／`reachabilityinvariant.js`，允許清單 `tests/dujs/cases/reachability-allowlist.json`。起點：各模型 `graph[0]`（inter-page 為 domain 節點，每頁 entry 經 `loadStorage` 邊、處理器經 LOOP 的 `onEvent` 邊進入，不另列起點）；例外邊＝連線型別 `exception`＋record 的 `exceptionalReturn`（D014：從 CALL 出發的例外邊；斷言每個非 null 者都是圖上某節點的 `.exception` 目標）；(a) CALL RETURN 只經「同一 record 的 CALL 可到達 ∧ 被呼叫端有正常返回」的虛擬邊（D015，P41 可達集合測試），normalReturn 以最小不動點自行重算；(b) LOOP→LOOP RETURN 虛擬邊；(c) finallyExit 的 `normal` 出邊需該 finally 區域有可到達的非例外進入（以 finalizer 的 range 與擁有函式界定區域）。差分（全開／關 (c)）、見證、四種失敗情形、陽性對照（P21、P23、P24、注入 P13）、獨立性守門。可走規則與求解器 reached 幾乎同構，獨立性只靠重寫、自算 normalReturn 與 (c)——注入與陽性對照是唯一防線，tasks 不得刪減。MDN 語料直接讀 006 corpus，缺檔或檔數 ≠ 33 失敗、核對 sha256（D016） | R8；contracts/reachability.md |
| 3 | US1 改動點與 localStorage 凍結（D004、D008） | `scopebinding.isLocalStorageObject`（hierarchy 共用）；物件變數＝沿 `.object` 鏈到達的 Identifier（D013：鏈中遇呼叫即無物件變數、不豁免，P42）；豁免者整個走 develop 路徑（GEN `:600`、`getDefinedVariables`、迴圈 `left.object`、`=` 不讀）；非豁免：GEN 無定義，USE 讀物件運算式與計算鍵（`=`、解構〔新 `getMemberTargetReads`〕、迴圈左側）；邏輯賦值 F 分支以 `isLogicalAssignmentTarget` 不重複讀；巢狀賦值遞迴條件「develop 會定義左側」（D012：維持 develop，缺口記 KI，FR-011 (g)）。summary／expansion／inter-page 不改（FR-003）；s1–s9 以 baseline 檔逐字比對 | R1–R5；contracts/lib-api.md §1–§5 |
| 4 | FR-001 對呼叫解析的外溢（P29–P32） | 不另改 callresolver：嚴格規則讀 `reachIns`、D2／class 放寬讀 GEN 計數，自動修正；007 防護（同節點先定義的接收者）因此解除者歸「外溢」類並有 characterization 測試 | R3、R6 |
| 5 | US2 `o.m()` 放寬（FR-004） | `classOfInstance` 無到達定義時 → `relaxedClassOfInstance`：`isInFunction` ∧ `isRelaxedInstance`（let／const）∧ `definitionsOnThePage` 恰一筆 ∧ 定義 range ↦ `new A()` 且 `resolveVariable(def.fromNode, A)` 給 class；與 005 D2 共用判定函式。FR-005 由既有呼叫點管線自動滿足 | R7；contracts/lib-api.md §6 |
| 6 | golden／MDN 重產與簽核、效能 | US1、US2 各自 `UPDATE_GOLDEN=1`，以 diffcheck 重產相對 `2035c93` 的累積淨差異並 `--verify` 後 commit；使用者在 PR 前各簽核一次；MDN 快照與 perf 基準在 Setup（任何 lib 變更前）產生；SC-006 在 Polish 量測 | R10、R11；contracts/diff-check.md |
| 7 | 文件（FR-011、FR-012、SC-007） | Polish 逐項修改並寫 `docs-check.md`；新 KI：選項 B、巢狀賦值通用缺口（FR-011 (g)，D012）、`Lnull`；§38 補 P21、P23、P24 形態與窄修候選；§22 (5) 記 FR-013 的修正 | R12 |
| 8 | deferred p-use 的死碼 pair（FR-013，D017） | `findDUPairs` 第二段（deferred p-use）只在 owner 依求解器可到達時配對：以 `model.analysisResultOf(owner) !== null` 判定（`doAnalysis` 只為 reached 節點存結果，`defuseanalyzer.js:416-438`；沒有 calls／loops 的模型 reached 為 null、全部節點都有結果），不改 `reachingsolver.js`；model 尚未分析（無結果）時維持現行行為。原型實測：probes 只有 P38–P40 的 inter／intra-page 改變、golden 0、MDN 0、`npm test` 1715 passing | R14；contracts/lib-api.md §3 |

## 使用者裁決（D012–D017，2026-11-18；原「需使用者裁決的事項」Q1–Q5）

| # | 問題 | 裁決 | 落實 |
|---|------|------|------|
| Q1→D012 | 成員目標右側的巢狀賦值：develop 中 `o.a.b = x = 1`、`this.p = x = 1` 不定義 `x` | **A：維持 develop**（GEN 只在右側直接是賦值／更新且 develop 會定義左側時遞迴，`defuseanalyzer.js:608-611`）；通用缺口記新 KI（spec FR-011 (g)，含 golden `tests/golden/fixtures/es2015/app.js:22` 的 `nextId++`） | 回歸測試：`o.p = x = 1`、`o.p = x++` 仍定義 `x`；characterization：`o.a.b = x = 1`、`this.p = x = 1` 不定義 `x`（contracts/acceptance.md）；golden／MDN 影響 0 筆 |
| Q2→D013 | 「物件變數」對呼叫根的成員鏈（`localStorage.getItem(n).p = o`） | **A：只沿 `.object` 鏈**（呼叫中斷 → 沒有物件變數，不豁免，讀 `localStorage`、`n`） | spec「表示法」、US1 情境 16（P42）；FR-009：新 `localStorage` 讀取帶出的 inter-page pair 歸「新增讀取」 |
| Q3→D014 | 檢查器對被呼叫端未捕捉例外的處理 | **A：`exceptionalReturn` 視為從 CALL 出發的例外邊**（它由 `expansion.js:592-606` `finishCallRecords` 依圖結構設定，求解器只在 `reachingsolver.js:292` 讀它，與獨立性相容） | contracts/reachability.md §2 的敘述修正（實測 1278 筆：1230 筆即 `callNode.exception`、39 筆呼叫節點無例外邊、9 筆 null）；「呼叫節點無例外邊」單元測試；檢查器斷言非 null 者都是圖上某節點的 `.exception` 目標 |
| Q4→D015 | (a) 的 return 是否分呼叫點 | **A：分呼叫點**（比「表示法」(a) 字面嚴格，可達集合是字面可達的子集，通過即滿足 FR-006） | P41 可達集合測試（US3 情境 8） |
| Q5→D016 | MDN 語料進 `npm test` | **A：直接讀 `specs/006-eslint-scope/mdn/corpus`**（33 檔、1218 行；先例 `tests/dujs/splitcallnodes.js:24`） | 缺檔或檔數 ≠ 33 時測試失敗、不得 skip；核對 `specs/006-eslint-scope/mdn/README.md` 的 sha256 |
| D017（新） | 決策條件中的無返回呼叫仍產生決策節點的 p-use pair（P38–P40，關掉 (c) 仍違反） | **納入 US3 修正**（FR-013） | 關鍵設計 #8、research R14、contracts/lib-api.md §3、contracts/acceptance.md |

## 變更影響範圍（§TR-8，參考）

- **新增**：`tests/helpers/reachability.js`；`tests/dujs/{propertydefs, reachability, reachabilityinvariant}.js`、`tests/dujs/cases/probes008/`（含 `pages/`）、`tests/dujs/cases/reachability-allowlist.json`；
  `specs/008-property-defs-method-calls/{tools/diffcheck.js, tools/diffcheck.test.js, tools/classify.js, tools/classify.test.js, mdn/baseline-develop/, golden-diff.md, mdn-diff.md, perf.md, docs-check.md}`。
- **修改**：`lib/dujs/defuseanalyzer.js`（`findGENSet`、`getDefinedVariables`、`findUSESet`；US3 的 `findDUPairs` deferred p-use 配對條件，FR-013）、`usedexpressions.js`（`loopHeadExpressions`）、`bindingpattern.js`（`getMemberTargetReads`）、`scopebinding.js`（三個新方法、`RELAXED_INSTANCE_KINDS`、邏輯賦值目標集合）、`callresolver.js`（`relaxedClassOfInstance`）、`hierarchy.js`（`definesLocalStorage` 改呼叫 binding，行為不變）；
  `tests/golden/expected*`、`manifest.json`；既有測試中編碼舊行為者（`globals.js`、`methodcalls.js` 等，以各階段 `npm test` 失敗清單為準，逐處列入 golden-diff「單元測試期望」）；擴充 `tests/dujs/{scopebinding, usedexpressions, defuseanalyzer, relaxedcallee, methodcalls, summary, matching}.js`；`README.md`、`docs/known-issues.md`。
- **預期不改程式**（以測試確認）：`lib/dujs/summary.js`、`reachingsolver.js`（FR-013 所需的 reached 資訊已由 `doAnalysis` 只為 reached 節點存的分析結果提供，`model.analysisResultOf`）、`expansion.js`、`callsplit.js`、`modelbuilder.js`、`outputwriter.js`、`cfggraphconverter.js`、`tests/helpers/analyze.js`。
- **明確不受影響**：`lib/esgraph/**`（含 LGPL 檔、`astrewriter.js`）、`lib/analyses/**`、`cli.js`、`bin/dujs.js`、scope 命名與數量、儲存定義節點的判定結果、事件處理器註冊查找、`*.matching.json` 格式、005／006／007 的 `tools/`。

## Project Structure

### Documentation (this feature)

```text
specs/008-property-defs-method-calls/
├── spec.md、plan.md、research.md、data-model.md、quickstart.md
├── contracts/   lib-api.md、reachability.md、diff-check.md、acceptance.md
├── probes/      探測程式、run.js、run-pages.js、baseline-develop.txt、pages/（既有）
├── tools/       diffcheck.js、diffcheck.test.js、classify.js、classify.test.js   （Setup 新增）
├── mdn/         baseline-develop/（2035c93 的 .dot、*.matching.json、pairs、exitcodes）（Setup 新增；語料沿用 006）
├── golden-diff.md、mdn-diff.md、perf.md、docs-check.md                        （implement 新增）
└── tasks.md                                                                   （/speckit-tasks）
```

### Source Code (repository root)

```text
lib/dujs/       defuseanalyzer.js（含 findDUPairs，US3）、usedexpressions.js、bindingpattern.js、scopebinding.js、callresolver.js、hierarchy.js（修改）
tests/helpers/  reachability.js（新）
tests/dujs/     propertydefs.js、reachability.js、reachabilityinvariant.js（新）、cases/probes008/、cases/reachability-allowlist.json、既有測試擴充與更新
tests/golden/   expected*／manifest.json（更新）
```

**Structure Decision**：維持單一 library＋CLI 結構。「成員目標的角色」集中在 defuseanalyzer 的 GEN／USE 與 usedexpressions 的迴圈頭（下游自動一致）；`localStorage` 判定集中在 scopebinding；放寬只在 callresolver；可到達檢查器屬測試基礎設施，不進 lib。

## 實作順序與 story 相依（每階段結束 `npm test`、lint 全綠；改 golden 的階段 `diffcheck golden --verify` 通過後才 commit，由 orchestrator 親自重跑）

| 階段 | 內容 | 主要檔案 | golden |
|------|------|----------|--------|
| Setup | probes 複製到 `tests/dujs/cases/probes008/`；MDN `2035c93` 快照與 perf 基準（`git diff --quiet 2035c93 -- lib` 確認）；`tools/classify.js`＋`tools/diffcheck.js` 與自我測試（工具首次 commit 後修改需 DECISION） | specs、tests/dujs/cases | 不變（diffcheck 對現況零差異） |
| Foundational | 可到達檢查器 `tests/helpers/reachability.js`＋單元測試、陽性對照、注入、獨立性守門（在 develop 行為上先建立；US1／US2 改動後可立即偵測新的不可到達 pair）；`scopebinding` 三個新方法＋單元測試（尚未接線，行為不變） | tests/helpers、tests/dujs、scopebinding.js | 不變 |
| US1（P1，§22 (1)） | GEN／USE 改動、`getMemberTargetReads`、迴圈頭、F 分支、巢狀賦值條件、hierarchy 重構；s1–s14、P1–P4、P12、P25、P27、P29–P33 驗收；外溢 characterization；summary／matching 擴充 | defuseanalyzer、usedexpressions、bindingpattern、hierarchy | **更新**（成員目標、損失、外溢） |
| US2（P1，§23） | `relaxedClassOfInstance`；P5–P11、P26、P28、P34–P36、MDN a05 驗收 | callresolver | **更新**（放寬） |
| US3（P2，§22 (5)） | `findDUPairs` 的 deferred p-use 只在 owner 可到達時配對（FR-013，P38–P40 驗收，intra-procedural 不變）；P41 可達集合測試（D015）；`reachabilityinvariant.js` 全量（probes、golden、MDN；MDN 缺檔／檔數 ≠ 33／sha256 不符即失敗，D016）、允許清單與見證（P21、P23、P24 及實測到的 finallyExit 根因項）；關掉 (c) 仍違反者依 FR-008 修正或 DECISION | defuseanalyzer、tests、allowlist | 不變（原型實測 golden 0 筆差異） |
| Polish | MDN `--verify`、mdn-diff、perf.md、KI（FR-011 (a)–(g)）、README（FR-012）、docs-check.md、quickstart 全流程、golden-diff／mdn-diff 簽核 | docs、specs | `--verify` |

- **順序理由**：檢查器在 Foundational 建立，US1／US2 期間即作為回歸網（新 pair 若落在不可到達節點立即失敗）；允許清單在 US3 依最終行為定稿（US1／US2 可能新增或消除 finallyExit 根因的 pair）。US2 依賴 US1（P9：`o.p = 1` 不再是定義）。改 golden 的階段必須依序，每次重產相對 `2035c93` 的累積淨差異。
- **tasks 指引**：檢查器的可走規則與求解器 reached 幾乎同構，獨立性只靠重寫、自算 normalReturn 與 (c)；注入（US3 情境 6）、陽性對照（P21、P23、P24）與 D014／D015 的單元測試是唯一防線，tasks 不得刪減或合併掉。
- **US3 與 Foundational 的關係**：Foundational 建立的檢查器在 develop 行為上會把 P38–P40 報為允許清單以外的違反（關掉 (c) 仍違反）；Foundational／US1／US2 的階段檢查以「除 P38–P40 外無違反」為準，US3 修正 FR-013 後歸零。
- **US1 的期中狀態**：Foundational 後檢查器已在 `npm test`，但全量不變量測試（含允許清單）在 US3 才加入；US1／US2 期間以 probes 的 `check` 結果（除 P38–P40 外無允許清單以外違反）作為階段檢查。

## 已知風險

| 風險 | 影響 | 緩解 |
|------|------|------|
| 新讀取在段節點找不到位置（`callsplit.segmentOf` 拋 `no evaluation position`） | 分析拋錯 | R0：`visitMemberTarget` 已編號 `=`／解構目標；迴圈左側在 once-loop 不歸段。US1 測試涵蓋 `o[g()] = h()`、`[o[g()]] = a`、`for (o[k] of f())`；若拋錯先補 callsplit 測試再修，並記入 golden-diff |
| 邏輯賦值 F 分支的判定依賴 `left` 物件同一性（astrewriter 共用子樹） | 若某路徑複製了 `left`，F 分支會多一筆 `o` 的 c-use | US1-8（P27）與 `??=`、`&&=` 的單元測試；s3 的 baseline 逐字比對 |
| s1–s9 凍結被間接改變（例如 USE 的走訪順序影響 pair 標記） | D004 違反 | baseline 檔逐字比對測試；豁免分支只呼叫既有程式路徑 |
| 外溢與放寬新增呼叫邊，段後綴位移 | 差異比對失真（T068 (d)） | 「段結構改變行」表逐列簽核（contracts/diff-check.md §1） |
| 檢查器的 finally 區域對應（loc 比對、無 astNode 節點的位置） | 誤判非例外進入 → 漏報或誤報 | 對應失敗即拋錯；巢狀 try–finally、`return` 經 finally、段節點在 finally 中的單元測試；陽性對照 P21、P23、P24 |
| 檢查器在 golden／MDN 發現非 finallyExit 根因的違反 | US3 範圍擴大 | FR-008：屬本 feature 範圍者修正，否則 DECISION。已知一類：deferred p-use 的 owner 不可到達（P38–P40，D017），由 FR-013 修正；原型實測 golden、MDN 中此類為 0 筆。除 finallyExit 與此類外的違反未實測，數量未知——實作時以檢查器全量輸出為準，逐項歸因 |
| 損失／修正分類的語法判準與使用者直覺不符（如 `o.m()` 歸修正） | 簽核往返 | 分類說明段明寫語法層判定（FR-009）；每類有正反例測試 |

## Complexity Tracking

無憲章違規需說明。
