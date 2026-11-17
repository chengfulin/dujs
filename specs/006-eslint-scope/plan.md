# Implementation Plan: 改用 eslint-scope 判定變數的宣告與參照

**Branch**: `006-eslint-scope` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-eslint-scope/spec.md`

## Summary

新模組 `lib/dujs/scopebinding.js` 每頁以 eslint-scope（`optimistic: true`）分析一次整頁 AST，建立「識別字節點 → Reference／宣告 Variable → dujs Var」
的身分表；dujs 的 scope 樹、CFG、worklist、四層模型與命名不動，只把所有「以名稱在 dujs scope 中查變數」的路徑（variableanalyzer、defuseanalyzer、
callresolver、modelbuilder、hierarchy、Scope 的名稱 API）換成身分查詢（D1）。catch／class／function-expression-name scope 不新增 dujs scope，其變數登記在
外層最近的 dujs scope；同一 dujs scope 允許同名的多個 Var。可見性（entry KILL 與 FR-016 繞過）以 eslint-scope 的 scope chain 判定，另以「定義所在的
dujs scope 是被呼叫端的祖先或本身」涵蓋沒有自己 dujs scope 的 Var（Q1）；函式 entry 節點的 USE 只認從函式 scope 可見的 Var（Q3，維持 develop）。catch 節點只定義參數、
只讀參數中的求值運算式（D4）；具名運算式與 class 內層名稱在其節點定義（D7、FR-004）；未解析的讀取成為頁面 entry 的 `global`（D3）。以靜態測試與差異判定
腳本守住「唯一來源」與「golden／MDN 只有 D2 類差異」（FR-012）。設計理由見 [research.md](./research.md) R0–R16。

## Technical Context

**Language/Version**: JavaScript（CommonJS，`lib/` 維持 ES5 風格），Node.js ≥ 24

**Primary Dependencies**: espree ^11.2.0、walkes ^0.2.1；**新增 runtime 依賴 `eslint-scope` ^9.1.2**（BSD-2-Clause，package-lock 鎖定；目前樹中已有 9.1.2）。
`espree.VisitorKeys`、`espree.latestEcmaVersion` 來自既有依賴。LGPL 衍生檔（`lib/esgraph/index.js`、`dot.js`、`lib/analyses/index.js`）不修改。

**Storage**: N/A（CLI 輸出 `.dot`／`.png`／`report.html`，格式不變）

**Testing**: mocha ^12＋should ^13；golden `tests/golden/golden.js`＋`manifest.json`（沿用 004 的雜湊做法，無新 golden case）；eslint ^10；c8。
**基線**（`e695fca`，lib＝develop `584e17d`）：`npm test` **1102 passing**、lint 0 錯誤、`eslint-suppressions.json` **118** 筆（35 檔）。

**Target Platform**: Node.js ≥ 24（macOS／Linux）

**Project Type**: library＋CLI（`bin/dujs.js`）

**Performance Goals**: SC-003：MDN 33 個程式總分析時間 ≤ develop 的 1.5 倍（同機、3 次中位數），以 `specs/006-eslint-scope/tools/perf.js` 人工執行並記入
`perf.md`，不進 `npm test`。eslint-scope 實測約 1.9 ms／1285 行；可見集合每個 dujs scope 計算一次並快取。

**Constraints**: scope 名稱與數量、CFG、模型數量與結構不變（FR-009，D5／FR-013 的連結變化除外）；golden 差異只屬 D2 五類並逐項記錄（FR-010）；
`eslint-suppressions.json` 不得新增鍵或增加 count（有未使用抑制時跑 `npx eslint . --prune-suppressions` 並在回報列出）；`tests/` 中**既有測試案例**的修改限下列檔，
且都列入 golden-diff「單元測試期望」表：`tests/dujs/scope.js` 的名稱 API 測試改寫、`modelbuilder.js`、`defuseanalyzer.js`、`bypass.js`、`es2015.js`、`model.js`、
`nestedfunctions.js`、`analysisexecution.js` 中直接呼叫名稱 API 或 `setLocalVariables` 的段落；**新增案例**的檔以任務指名為準（`var.js`、`usedexpressions.js`、`def.js`、
`deffactory.js`、`scopebinding.js` 等）。

**Scale/Scope**: 4 個 user story、13 條 FR；新增 1 個 lib 模組，修改 17 個 lib 檔（見「變更影響範圍」；Foundational 階段動 14 個 lib 檔，含新模組）；新增 6 個測試檔；feature 目錄新增 2 支工具與 MDN 範例集。

**tech-standards**：`.specify/memory/baseline/tech-standards.md` 以服務部署為主，對本 library 無偏離項，無 §CP-6 例外。

**NEEDS CLARIFICATION**：無。plan review 的 U1–U4 與 Fable 仲裁 Q1–Q3 已裁決並寫入 spec Clarifications「Session 2026-11-17（plan review…）」與 FR-012
（見「已裁決事項」）。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／D／Clarifications；設計中發現 spec 判準或白名單無法涵蓋的 4 處（U1–U4）與 Fable 仲裁 Q1–Q3 已由使用者裁決並寫入 spec | PASS | PASS（spec Clarifications 2026-11-17 與 FR-012 已同步） |
| §CP-2 機密 | 不涉及；MDN 範例集為公開 CC0 程式 | PASS | PASS |
| §CP-3 設定不硬編碼 | 無新設定；`UPDATE_GOLDEN` 沿用；工具以 CLI 參數指定基準 commit | PASS | PASS |
| §CP-4 核心邏輯測試 | 每個驗收情境有自動化測試（contracts/acceptance.md）；scopebinding、靜態測試、可見性（含 (c)、entry 節點）、合併計數、optimistic 偏離案例、保留名稱有單元測試；裁決守門 probes（vis3、plan-*）有測試；golden 回歸 | PASS | PASS |
| §CP-5 審查 | PR 目標 `develop`，人為核准 | PASS | PASS |
| §CP-6 例外 | 無例外；新依賴屬已確認的技術選型 | PASS | PASS |
| §GV 最小審查 | golden-diff／mdn-diff 由腳本 100% 核對（SC-002、SC-003） | PASS | PASS |
| 【參考】§TR-3 相依 | eslint-scope 進 dependencies，lock 鎖版 | — | 採用 |
| 【參考】§TR-7 ISP | 宣告種類（11 種）× 解析結果（已解析／未解析／動態 scope）× 位置（頁面／函式／block／catch／class 成員）各取代表（scopebinding 測試） | — | 採用 |
| 【參考】§TR-8 影響範圍 | 見下節 | — | 已宣告 |

## spec 指定 plan 必答事項

### 1. eslint-scope 結果與 dujs Scope／Var 的對應

- **每頁一次 analyze**：`scopeCtrl.addPageScopeTree(ast)` 內，`buildScopeTree` 前呼叫 `scopebinding.analyze(ast)`（research R1）。
- **選項**：`ecmaVersion: jsParser.ECMA_VERSION`（＝`espree.latestEcmaVersion`，`parseAST` 預設改用同一常數）、`sourceType: ast.sourceType`（espree 記錄的實際採用者，
  先 script 後 module）、`optimistic: true`（D6，research R2）、`childVisitorKeys: espree.VisitorKeys`。
- **識別字以 AST 節點身分對應**：use 端 `useVarsOf` 只查 `referenceOf`（Reference，不回退）；def 端 `defVarsOf` 以 Reference 優先、其次 `declaredBy`
  （`Definition.name`）；dujs 合成節點重用原 Identifier（research R3，F5）。
- **class 成員 synthetic function**：`class-field-initializer`（block＝`PropertyDefinition.value`）與 `class-static-block`（block＝StaticBlock）對應到該成員的
  synthetic function scope；`scopetree.js` 在 synthetic function 上加 non-enumerable `dujsClassMember` 供反查（research R4）。
- **不新增 dujs scope 的 eslint scope**：catch 參數 → CatchClause 所在最內層 dujs block scope，否則函式／頁面；function-expression-name → 該函式自己的
  dujs scope；class 內層名稱 → class 節點所在的 dujs scope；無 lexical 宣告的 block（Annex B 函式）→ 外層最近 dujs scope（research R4 表）。

### 2. FR-012 (1) 禁止清單與白名單；FR-012 (2) 差異判定與 MDN 基準

- (1) 見 [contracts/static-check.md](./contracts/static-check.md)：S1 名稱 API 22 項、S2 Scope 原型不得定義、S3 eslint-scope 只在 scopebinding、S4 eslint-scope
  名稱表（`.set`／`.implicit`／`.through`）、S5 五個檔案的 `.name` 讀取精確允許表、S6 scopebinding 內字串鍵存取限白名單；白名單 W1 `globalVariableOf`（D3）、
  W2 `isExcludedGlobalName`（D3）、W3 `builtInVariableOf`（fixed list／localStorage）、W4 `isShadowed`（FR-013 可見性，U2 已裁決）。D6 由 optimistic 達成，無程式
  （唯一偏離見 research R2，符合 FR-005）。
- (2) 見 [contracts/diff-check.md](./contracts/diff-check.md)：輸入（golden：基準 `584e17d` 的 expected* vs 工作樹；MDN：快照 vs 實跑）、單位（pair multiset、row、
  model 數、graph／hierarchy 雜湊）、五類判準（以 CLI 串接後原始碼的 eslint-scope 結果機械判定；全域類依 U4、catch 類 (d)(e) 依 U3／Q2）、紀錄檔的「淨差異」、
  「解析類移除簽核」（F3）與「呼叫連結簽核」三個機器區塊、釘選筆數；MDN 快照 6 步驟（33 個檔案先自 validation-004 的工作目錄複製並以附錄 A 雜湊核對，
  重新抽取為備援；存 `mdn/corpus/`，develop CLI `.dot` 存 `mdn/baseline-develop/`）。
- **MDN 範例來源核對（plan 修訂時，2026-11-17）**：`/private/tmp/claude-501/-Users-chengfulin-Documents-Personal-dujs/cbaaf31a-c3b2-4a55-9ff4-356dc509edf6/scratchpad/mdncheck/ex/`
  存在，含 33 個 `.js`（32 個 id，s09 兩檔）；sha256 前 16 碼與 `docs/research/mdn-baseline/validation-004.md` 附錄 A 的 33 行**逐行相同**。尚未複製進 repo
  （Setup 任務；該目錄位於暫存區，Setup 前若已被清除則改走重新抽取）。

### 3. golden 更新與 golden-diff.md 流程

沿用 004 contracts/golden-verification.md §3 的 manifest 規則（允許改 `baseline` 雜湊，每處都要有 golden-diff 對應列，同一 commit 更新；`UPDATE_GOLDEN=1`
不碰 manifest，手動貼差異的鍵）。不同於 004：本 feature 不新增 golden case；golden-diff.md 的「淨差異」表相對 **develop** 計算並以 `diffcheck.js --verify`
機器核對，各階段敘述節（Foundational、US1、US3、US4）記錄該階段造成的變化與雜湊表、單元測試期望。步驟見 [quickstart.md §3](./quickstart.md)。
預測：`expected/`（page0 `JSON` 全域、`parseSaved` 的 catch 參數 `e` 列；page1 `JSON`）、`expected-es2015/`（`Math` 全域、`TodoList` 內層綁定列）、
`expected-fixes004/`（`Counter` 內層綁定列，pair 以名稱＋行不變）、`expected-interprocedural/` 無差異。

### 4. 每個 story 的檔案影響（見下節「實作順序」）

### 5. 風險與緩解（見「已知風險」）

## 關鍵設計

| 主題 | 決策 | research |
|------|------|----------|
| 變數儲存 | `Scope` 改以 Var 身分的有序串列，移除全部名稱 API；同一 scope 可有同名 Var | R4、data-model §3 |
| 登記順序 | `setLocalVariables` 保留走訪骨架，名稱換成身分；最後補登記 catch 參數、具名運算式名稱、class 內層名稱與只讀全域 → 既有 dupairs 列序不變 | R5 |
| 可見性 | (a) 未遮蔽（eslint scope chain＋`Scope.set`，W4）∪ (b) 區域內直接參照（pdef 必需）∪ (c) 宣告 scope 無自己 dujs scope 者，定義所在 dujs scope 是被呼叫端的祖先或本身（Q1，vis3） | R6 |
| 函式 entry 的 USE | 只認宣告 eslint scope 在函式 eslint scope chain 上（含本身）的 Var 與未宣告全域／builtin；不讀子孫 block 的 let／const、catch 參數（Q3，維持 develop；KI §18 整體留給 005） | R6a |
| class | 外層＋內層兩個 Var，class 節點同時定義；FR-018 合併計數以（節點, range）去重 | R7 |
| 具名函式運算式 | 名稱在本體 scope、無 entry 初值、在運算式所在節點定義；自我遞迴自然不連結 | R8 |
| 未解析 | W2 排除 → W3 fixed list／localStorage → W1 頁面＋名稱；有寫入 Reference＝`implicitGlobal`（`undefined`），只讀＝`global`（新 Def 種類；`G.p = v` 的 `G` 屬只讀，仍為 `global`，但依 D1 在該節點定義） | R9 |
| 變數名稱 | `Var.isValidName` 放寬為 ES IdentifierName（U1）；`FunctionScope`／`Scope` 名稱規則不變（FR-009） | R12 |
| catch | 節點只定義參數、只讀參數中的求值運算式；不再定義區塊內賦值（U3） | R10 |
| D6 | eslint-scope `optimistic: true`；與 D6 字面回退唯一的偏離（同函式有參數預設值又有 eval）符合 FR-005 | R2 |

## 變更影響範圍（§TR-8，參考）

- **修改**：`lib/dujs/jsparser.js`、`scopectrl.js`、`scopetree.js`（`dujsClassMember` 標記）、`scope.js`、`pagescope.js`／`domainscope.js`（預計；實作時 fixed list 建立改在 `scope.js` 的 `setBuiltInObjectVariables`，此兩檔未修改）、
  `var.js`、`def.js`、`deffactory.js`、`vardeffactory.js`、`variableanalyzer.js`、`defuseanalysisexecutor.js`、`defuseanalyzer.js`、`usedexpressions.js`、
  `callresolver.js`、`modelbuilder.js`、`hierarchy.js`；`package.json`／`package-lock.json`；`eslint.config.js`（T003：`ignores` 加 probes006 與 MDN 範例集）；`tests/golden/expected*`、`manifest.json`；`README.md`、
  `docs/known-issues.md`。
- **新增**：`lib/dujs/scopebinding.js`；`tests/dujs/scopebinding.js`、`catchclause.js`、`scoperesolution.js`、`globals.js`、`scopeguards.js`、`scopesource.js`；
  `tests/dujs/cases/probes006/`；`specs/006-eslint-scope/{golden-diff.md, mdn-diff.md, perf.md, tools/, mdn/}`。
- **明確不受影響**：`lib/esgraph/**`、`lib/analyses/**`、`expansion.js`、`hierarchydot.js`、`outputwriter.js`、`cfggraphconverter.js`、`cli.js`、`bin/dujs.js`、
  scope 命名規則（`scopetree.js` 的建樹與命名邏輯）、輸出格式。

## Project Structure

### Documentation (this feature)

```text
specs/006-eslint-scope/
├── plan.md、research.md、data-model.md、quickstart.md
├── contracts/  scope-binding-api.md、static-check.md、diff-check.md、acceptance.md
├── probes/     33 個探測程式（含 plan review 加入的 vis3、plan-*）；Setup 加 develop.txt
├── tools/      diffcheck.js、diffcheck.test.js、perf.js           （implement 新增）
├── mdn/        README.md、pages.json、corpus/（33 檔）、baseline-develop/   （Setup 新增）
├── golden-diff.md、mdn-diff.md、perf.md                            （implement 新增）
└── tasks.md                                                        （/speckit-tasks）
```

### Source Code (repository root)

```text
lib/dujs/  scopebinding.js（新）＋上節修改檔
tests/dujs/  scopebinding.js、catchclause.js、scoperesolution.js、globals.js、scopeguards.js、scopesource.js（新）；cases/probes006/（新）
tests/golden/  expected*／manifest.json（更新）
```

**Structure Decision**：維持單一 library＋CLI 結構；scope 綁定集中在一個新模組，其他模組只經其 API 取得變數（contracts/scope-binding-api.md §2）。

## 實作順序與 story 相依（每階段結束 `npm test`、lint 全綠，改 golden 者 `diffcheck --verify` 通過；diffcheck 不進 `npm test`，由 orchestrator 親自重跑 `--verify` 通過後才 commit）

| 階段 | 內容 | lib 檔案 | 測試檔 | golden |
|------|------|----------|--------|--------|
| Setup | 依賴；probes 複製與 develop 記錄（`develop.txt`、`scopenames.json`、守門 probes 的 develop pair 清單）；MDN 33 檔自 validation-004 工作目錄複製進 `mdn/corpus/` 並核對附錄 A 雜湊（不符或目錄已清除→重新抽取）、develop 快照；`diffcheck.js`＋自我測試；`perf.js` 與 develop 基準 | — | `tests/dujs/cases/probes006/` | 不變（diffcheck golden 基準固定 `584e17d`） |
| Foundational（D1 切換，阻擋所有 story） | scopebinding（analyze、身分表、擁有者表、Var 建立、可見性、合併計數、宣告查詢）；Scope 身分儲存並移除名稱 API；variableanalyzer 改身分登記；defuseanalyzer GEN／USE／KILL／bypass 改身分；ClassDeclaration 同時定義內外 Var、具名 Function／ClassExpression 在節點定義名稱、CatchClause 定義參數（本體仍照 develop 走訪，區塊內賦值的定義保留到 US1 才移除）；callresolver（含 FR-018 合併計數）、modelbuilder handler、hierarchy localStorage 改身分 | `scopebinding.js`、`jsparser.js`、`scopectrl.js`、`scopetree.js`、`scope.js`、`pagescope.js`、`domainscope.js`、`var.js`、`variableanalyzer.js`、`defuseanalysisexecutor.js`、`defuseanalyzer.js`、`callresolver.js`、`modelbuilder.js`、`hierarchy.js` | `scopebinding.js`（新，含 US4-9〔只讀→`global` 的斷言於 US3 T050 補入〕、可見性 (a)(b)(c)、entry 可見、optimistic 偏離、保留名稱）；`scopeguards.js`（新，全部「與 develop 相同」與 FR-013 連結守門，F6）；`var.js`（U1）；改寫 `scope.js`，調整 `modelbuilder.js`、`defuseanalyzer.js`、`bypass.js`、`es2015.js`、`model.js`、`nestedfunctions.js`、`analysisexecution.js` | **更新**（解析／AnnexB／連結類；catch 參數列） |
| US1（P1） | catch 節點只讀參數求值運算式；GEN 不再走訪本體（D4，含 U3：移除 Foundational 仍保留的區塊內賦值定義） | `usedexpressions.js`、`defuseanalyzer.js` | `catchclause.js`（新，含 plan-u3、plan-catch1）、`usedexpressions.js` | **更新**（catch 類 (a)–(e)） |
| US2（P1） | 驗收 US2-1…5；若 D7／pdef 有落差在此修正 | （預期無；必要時 `defuseanalyzer.js`、`scopebinding.js`） | `scoperesolution.js`（新） | 預期不變 |
| US3（P2） | 未解析讀取的 `global` Var 與 `Def.GLOBAL_TYPE`；名稱排除；頁面 entry 的 global 定義；`++`／for-in 寫入的隱含全域補登記（R5） | `scopebinding.js`、`def.js`、`deffactory.js`、`vardeffactory.js`、`defuseanalyzer.js` | `globals.js`（新，含 plan-u1、plan-u4）、`def.js`、`deffactory.js` | **更新**（全域類） |
| US4（P1） | 靜態測試；golden 重生驗證（有差異一律先當回歸修 lib）與最終核對（守門已在 Foundational 完成，此處只重跑） | （無新邏輯） | `scopesource.js`（新） | 重生驗證零差異＋`--verify` |
| Polish | MDN `--verify`、perf.md、known-issues、README、quickstart 全流程 | — | — | — |

- **Foundational 完成條件**（F6）：除 `npm test`、lint、golden `--verify` 外，`scopeguards.js` 全過——scope 名稱與各層模型數（33 個 probes，模型數只在 annexb、
  link-n4／n8a／n9／n10 改變）、與 develop 相同的守門（shadow-*、with、evalouter、op、mod、classdecl、vis3、plan-bi、plan-pf、link-n5、Q3 的 entry 程式）、
  FR-013 連結（link-n4／n8a／n9／n10）與 link-bypass 的 `e: L6 -> L8`（US4-11）；且 `run.js` 對「與 develop 相同」那組 probe 檔（不含 Q3 內嵌程式）的 pair 輸出與 `probes/develop.txt` 逐行相同（只比 pair；class 內層綁定的新增 row 不在 run.js 輸出中）。catch-*、link-bypass 的其他 pair、globals、tyof、
  plan-u*、plan-catch1 此時仍可與 develop 不同（屬 US1／US3）。
- **相依**：Setup → Foundational → US1 → US2 → US3 → US4 → Polish，逐 phase 依序；US2 只加測試，在 US1 commit 後執行。**改 golden 的階段（Foundational、US1、US3、US4 收尾）必須
  依序進行**，每次都重新產生 golden-diff「淨差異」並 `--verify`，因為淨差異是相對 develop 的累積結果，並行會互相覆蓋 expected 與 manifest。
- 為何 Foundational 這麼大：Scope 名稱 API 一旦移除，所有呼叫端必須同時改為身分查詢才能通過測試；catch 參數、class 內層、具名運算式名稱的「節點定義」
  是新 Var 能有定義的最低需求，若延後到各 story，中間狀態會讓這些 Var 沒有定義而大量移除 pair（golden 反覆變動）。US1 只剩 D4 的 catch 節點讀取／GEN
  範圍，US3 只剩未解析讀取。
- **Foundational 分批**（analyze N1；任務 ID 見 tasks.md）：2a 純新增（scopebinding、Var 名放寬、`ECMA_VERSION`、`dujsClassMember`、analyze／attach 掛載；
  批末既有測試全綠、golden 零差異）→ 2b API 一次切換（Scope 身分儲存與所有呼叫端；批末 mocha 全綠）→ 2c golden 更新與閘門。
- **人工簽核**（analyze N2）：解析類移除、呼叫連結衍生與 MDN 差異的簽核欄由 implementer 只填「草擬，待簽核」，不得自簽；使用者在 US4 golden 收尾後、
  PR 前對累積表簽核一次（T070），MDN 在 Polish 的 MDN 驗證後簽核（T071）。

## 已裁決事項（plan review，2026-11-17；spec Clarifications 同日 Session 與 FR-012 已同步）

| # | 問題 | 裁決 | 落在 |
|---|------|------|------|
| U1 | `Var.isValidName` 只收 `[_a-zA-Z][_a-zA-Z0-9]*`，FR-006 為只讀的 `$`、`été` 建全域會拋錯 | 放寬為 ES IdentifierName（`/^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u`）；`$ANONYMOUS_FUN_n` 等保留名稱相撞加測試，並記入 KI | research R12；`globals.js`（plan-u1）；`scopebinding.js` 測試 |
| U2 | 遮蔽判定須比名稱 | 以 eslint-scope `Scope.set` 比名稱，列入白名單 W4 `isShadowed`（FR-012 (1)） | research R6；static-check W4 |
| U3 | catch 節點對本體賦值的定義（def 端為 catch 行）消失 | catch 節點不再定義區塊內賦值；diff-check catch 類 (d) | research R10；diff-check §3；`catchclause.js`（plan-u3） |
| U4 | 未宣告名稱被 `++`、for-in、解構、`G.p = v` 寫入產生非 entry 定義 | 全域類＝「該頁未解析名稱的任何新增 pair 或變數列」；`G.p = v` 的 `G` 種類仍為 `global` | research R5、R9；diff-check §3；`globals.js`（plan-u4） |
| Q1 | class 內層、catch 參數、具名運算式名稱、無 lexical 的 block 的 Var 沒有自己的 dujs scope，可見性 (a)(b) 會丟 `develop` 的 pair（vis3 `A: L1 -> L3`） | 可見性加 (c)：定義所在的 dujs scope 是被呼叫端的祖先或本身 | research R6；data-model §1 `definingScopeOf`；`scopeguards.js`（vis3） |
| Q2 | 頁面只有 catch 參數 `e` 時 develop 的隱含全域 `e` 消失 | catch 類 (e)：名稱為 catch 參數名且該頁沒有同名的其他宣告時，該名稱移除的 pair 與變數列 | diff-check §3；`catchclause.js`（plan-catch1） |
| Q3 | 函式 entry 節點以身分查詢會讀到 block 內 let／const | 維持 develop：entry 只認從函式 scope 可見的 Var；KI §18 整體留給 005 | research R6a；`scopeguards.js` |

依 Fable 建議直接修正（不需裁決）：F3 解析類移除簽核（diff-check §3、§4）；F4 R9／R5 更正；F5 `useVarsOf`／`defVarsOf`（contracts/scope-binding-api.md §2）；
F6 守門移到 Foundational（上節）；F7 optimistic 偏離（research R2）；F8 MDN 33 檔與複製來源（上節「MDN 範例來源核對」）；F9 builtin 同名、參數＋函式同名與
`binding.kind`（data-model §1、§2）。

## 已知風險

| 風險 | 影響 | 緩解 |
|------|------|------|
| eslint-scope 與 espree 11 新語法 | 未知節點的參照遺漏 | 傳 `espree.VisitorKeys`；實測 `using`、`#p in o`、static block、TLA、`import.meta` 正常（research R1）；`scopebinding.js` 測試加語法矩陣；鎖 `^9.1.2`，日後升 espree 時先跑該矩陣 |
| `optimistic` 與 D6 不等價的未知案例 | with／eval 下解析不同 | 已知唯一偏離（參數預設值＋eval，optimistic 較正確）有單元測試；with、evalouter、含 eval 的 block 函式、with 內 catch 的守門測試；其他不等價時才加 W5 `resolveDynamically` |
| 函式名以 `$` 開頭（`function $(s) {}`） | `FunctionScope.isValidName` 仍拒絕 → develop 與本 feature 都拋 `Invalid value for a FunctionScope`（U1 只放寬 Var） | 屬 develop 既有行為且 scope 命名不在範圍（FR-009），記入 KI 新節；MDN 範例集無此寫法（validation-004 全數 exit 0） |
| Var 登記順序改變 | 既有 dupairs 列序變動 → golden 位元組差異（diffcheck 以 multiset 判定仍會過，但違反「既有列不動」的預期） | research R5 的順序規則；Foundational 結束時 `expected-interprocedural/` 必須零差異作為順序正確的檢查 |
| class 內層綁定／具名運算式名稱產生無 pair 的新列 | golden 與 MDN 多出同名列 | 屬解析類（`vars(N) ≥ 2`／`special(N)`），逐列記錄 |
| 可見性在 worklist 中重算 | 效能退化 | 每個 dujs scope 一次並快取；perf.md 以 SC-003 檢核 |
| MDN 範例集無法逐字重建（a02b、a06、x01 為人工組合） | 基準不可比 | 優先複製 validation-004 工作目錄的 33 檔（2026-11-17 已核對雜湊全符）；目錄被清除時才重新抽取，以附錄 A 雜湊核對，不符者交使用者裁決（換新雜湊或剔除），記入 `mdn/README.md` |
| 既有單元測試大量依賴 Scope 名稱 API（`tests/dujs/scope.js` 54 處） | 改寫範圍大、易夾帶行為變更 | 只改寫 API 呼叫方式，斷言語意不變；逐檔列入 golden-diff「單元測試期望」 |
| 名稱表以外的非參照識別字（標籤、export 別名）在 develop 可能誤配到同名變數 | 非 D2 類差異 | 身分查詢下它們沒有變數；若 golden／MDN 出現此類差異，diffcheck 會失敗 → 交使用者判斷是否加入 D2（預期不發生：fixture 與 MDN 無同名標籤） |
| `using` 宣告不在 spec 種類列舉 | FR-001 種類不完整 | 歸為 `const`（data-model §2），測試註明 |

## Complexity Tracking

無憲章違規需說明。
