# Implementation Plan：把含呼叫的節點拆成「呼叫之前」與「返回之後」（KI §16、§22 (3)）

**Branch**: `007-split-call-nodes` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-split-call-nodes/spec.md`

## Summary

新模組 `lib/dujs/callsplit.js` 為每個 intra-procedural 原節點算出 **SegmentPlan**：依 ECMAScript 求值順序（後序）列出節點中所有可解析的呼叫點（含運算式中的呼叫、`new`、方法呼叫、class static 成員；
`new F().m()` 為兩個呼叫點），並以「位置在它之前的呼叫點個數」把每個讀取、每個定義、每個會拋錯的 AST 節點歸到「呼叫之前／呼叫之間／返回之後」的段。
`modelbuilder` 依 plan 逐一建呼叫邊；`expansion.replayCall` 在攤平圖（與 005 的摘要圖）中把各段放到既有的 CALL／CALL RETURN／決策節點上——**不新增節點或邊型別**——
各段帶自己的 GEN、USE 與 exception 邊（不遞迴、按段歸屬的拋錯判定）。決策節點中在呼叫前讀到的 p-use 以「延後 p-use」歸到決策節點的分支（標記不變），摘要（`summary.js`）的讀取集合也併入延後 p-use。
條件求值而未被拆分的位置（optional chaining 的 `?.` 之後、解構樣式內的預設值）與 for-in/of 左側中的呼叫不列為呼叫點；callee／receiver 變數在同一節點中先被定義者也不列為呼叫點（防護）。
`switch` 判別式與 `for…in`／`for…of` 右側含呼叫時在上層模型只求值一次（前插段鏈），各 `case` 仍各記一筆 p-use、讀求值當下的定義（clarify Q2 A'），與已拆分判別式的先例並存。
intra-procedural 模型完全不變（FR-006）。golden／MDN 差異以新的 diffcheck 去重比對、另列重複列數，基準固定 `edc22d5`。設計理由見 [research.md](./research.md) R0–R13。

## Technical Context

**Language/Version**: JavaScript（CommonJS，`lib/` 維持 ES5 風格），Node.js ≥ 24

**Primary Dependencies**: espree ^11.2.0、eslint-scope ^9.1.2、walkes ^0.2.1、自有 esgraph CFG（`lib/esgraph/`）。**不新增執行期相依**。
LGPL 衍生檔中本 feature 只修改 `lib/esgraph/index.js`（記 `discriminantThrowTarget` 屬性、匯出 `throwTypes`；檔頭 Modified 清單記錄），不改其建圖行為。

**Storage**: N/A（CLI 輸出 `.dot`／`.png`／`report.html`／`*.matching.json`，格式不變）

**Testing**: mocha ^12＋should ^13＋fast-check ^4；golden `tests/golden/golden.js`＋`manifest.json`；eslint ^10；c8。**基線**（`edc22d5`）：`npm test` **1495 passing**（2026-11-18 實測）。

**Target Platform**: Node.js ≥ 24（macOS／Linux）

**Project Type**: library＋CLI（`bin/dujs.js`）

**Performance Goals**: SC-005：golden fixture 與 MDN 33 檔總分析時間 ≤ develop（`edc22d5`）× 2（`specs/006-eslint-scope/tools/perf.js`，同機 3 輪中位數，記入 `perf.md`）。

**Constraints**: intra-procedural 模型不拆分、pair 不變（FR-006）；callee 解析規則不擴充（FR-001）；攤平圖不為呼叫點複製被呼叫端（005 D4）；
`*.matching.json` 格式不變；golden 每處差異記錄並對應 FR／KI（FR-008）；`eslint-suppressions.json` 不得新增鍵或增加 count；spec.md 除使用者指示的 FR-003 措辭（判別式 p-use 記在各 `case`，與 clarify 決策一致）外不由 plan 修改。

**Scale/Scope**: 4 個 user story、10 條 FR；新增 lib 模組 1 個（`callsplit.js`），修改 lib 檔 10 個（見「變更影響範圍」）；新增測試檔 2 個（`splitcallnodes.js`、`callsplit.js`）＋擴充既有測試檔（見「變更影響範圍」，實際約 18 個，含 `summary.js`、`tests/esgraph/test.js`）；feature 目錄新增 diffcheck、MDN 快照、紀錄檔。

**tech-standards**：`.specify/memory/baseline/tech-standards.md` 未涵蓋靜態分析 CLI／函式庫，無偏離項，無 §CP-6 例外。技術選型維持 repo 現況（無偏離）。

**NEEDS CLARIFICATION**：無技術未知項。三項設計選擇（DECISION 005 Q1–Q3）已由使用者裁決（皆選 A，見「已裁決的事項」）；analyze 的修正由 DECISION 006 裁決（見「analyze 修正（DECISION 006）」）。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／Clarifications／KI（下表「關鍵設計」）；spec 未定的三項選擇（DECISION 005 Q1–Q3）經使用者裁決；spec 只依 clarify 決策調整 FR-003 措辭，另依 DECISION 006 調整 US2 情境 10 的括號措辭（預期不變）並在 FR-001 加一行驗證方式 | PASS | PASS（DECISION 005 Q1–Q3 已決） |
| §CP-2 機密 | 不涉及；MDN 語料為 CC0 | PASS | PASS |
| §CP-3 設定不硬編碼 | 無新設定；diffcheck 基準以檔頭「基準：」行／`--base` 指定；`UPDATE_GOLDEN` 沿用 | PASS | PASS |
| §CP-4 核心邏輯測試 | 每個驗收情境有自動化測試（contracts/acceptance.md）；callsplit（後序、歸段、拋錯判定表）有單元測試；FR-006 以全部 probes 的 intra pair 逐字比對；golden 回歸 | PASS | PASS |
| §CP-5 審查 | PR 目標 `develop`，人為核准 | PASS | PASS |
| §CP-6 例外 | 無 | PASS | PASS |
| §GV 最小審查 | golden-diff／mdn-diff 由 diffcheck `--verify` 核對，釘選類別由使用者簽核 | PASS | PASS |
| 【參考】§TR-7 ISP | 節點形狀（statement／decision／once-switch／once-loop）× 呼叫點數（0／1／多）× 呼叫點種類（call／new／方法／class-static／`new F().m()`）× 最後一段拋錯（是／否）× try 內外 × 已拆分先例（是／否）× 不列為呼叫點的位置（條件求值位置／for-in/of 左側／`case` test／同節點先定義的 callee） | — | 採用（contracts/acceptance.md） |
| 【參考】§TR-8 影響範圍 | 見下節 | — | 已宣告 |

## 關鍵設計（plan 必答議題，含前一位 orchestrator 交接的 6 項）

| # | 議題 | 決策 | research |
|---|------|------|----------|
| 1 | switch 判別式（clarify Q2 A'）與已拆分先例 | 判別式未拆分且含呼叫點時，上層模型在第一個 `case` 前插段鏈，判別式只求值一次；`case` 副本設 `discriminantSplit` 不再讀；判別式中的 p-use 以「延後 p-use」歸到每個有 test 的 `case`，**每個 case 各一筆、讀求值當下的定義**。先例（`switch (a && b)`，usedexpressions.js:61-63）由 branchsplitter 在三種模型都產生拆分節點、只記一次——**並存不統一**：任一方向統一都會改 intra-procedural pair（FR-006），且「只記一次」違反 clarify Q2 A'；含呼叫的拆分葉依一般規則拆段。golden-diff 類別 `求值順序`／子標 `判別式`，先例零差異作守門 | R5 |
| 2 | 拋錯判定（FR-005） | `callsplit.segmentThrows(plan, j)`／`plan.throws`：每個 AST 節點依後序位置歸段（呼叫點本身歸其進入的段、已返回者不在後段），段內有任一節點**自身型別**屬 `throwTypes`（或為 `throw` 的最後一段）即可能拋錯。不重用 `expressionThrows`：它遞迴整棵子樹（`var y = f()`、`if (f())` 會誤判）、不知道段、是 LGPL 檔內未匯出的閉包；intra 模型仍用它（FR-006）。`throwTypes` 由 esgraph 匯出、單元測試比對相等。`replayCall` 依 `throws` 連段的 exception 邊，決策副本最後一段不拋錯時移除其 exception 邊；`exceptionalReturn` 改取 N 的例外目標 | R6 |
| 3 | `new F().m()` | 後序先遇內層 `NewExpression`（自己解析 `calleeScopesOfNew`），再遇外層 `.m()`；`calleeScopesOfMethodCall` 的 NewExpression 分支（callresolver.js:427-434）只回傳 `[method]`；modelbuilder（435-452）改依 plan 逐呼叫點串接，段 1 帶 `m` 的引數 | R7 |
| 4 | golden-diff／mdn-diff | 新 `tools/diffcheck.js`（重用 005／006 匯出）：基準 `edc22d5` 寫檔頭基準行；去重集合比對＋「重複列數」表（不設門檻，KI §43）；類別 `連結`／`求值順序`／`返回後例外`（含子類 `決策返回不拋錯`）／KI 類／`標記`／`共通`；intra 層 pair 差異一律失敗；MDN 語料 `specs/006-eslint-scope/mdn/corpus`，基準快照 Setup 產生 | R10；contracts/diff-check.md |
| 5 | 新節點／邊型別（FR-007）、intra 不拆（FR-006） | **不新增型別**：段放在既有 CALL／CALL RETURN／決策節點上；matching 格式不變；README 補「段」、`beforeDecision` 新涵義與標記規則。分段只在 `replayCall`（攤平圖與摘要圖共用），esgraph 只加屬性與匯出 | R1、R8、R9 |
| 6 | FR-010 known-issues | §16、§22 (3) 標已修正；§10 補「`return g();` 已連結」；§36 補「返回後不拋錯只適用呼叫敘述，運算式依 FR-005」；新增 §44「`case` test 的讀取與呼叫不建模」（限留在 `case` 節點內的 test，拆出的非末端運算元照常建模，DECISION 007；含 class static 成員不再連結——**相對 develop 的行為變更**，DECISION 005 Q3）；§45 記 007 的行為變更（分段、標記、只求值一次）；§46 記不列為呼叫點的位置（for-in/of 左側〔FR-001 例外，DECISION 005 Q2〕、條件求值位置、同節點先定義的 callee），並分開記這些位置中 class static 成員不再連結——**相對 develop 的行為變更**（DECISION 006 Q4 必修 3，R13 L2'）；§47 判別式拆分節點的例外邊；§48 `switch (f()) {}`（無 case）的既有崩潰（R12、R13 對照表） | R12、R13 |
| — | 求值順序與歸段 | 後序編號（data-model §5）一份同時供讀取、定義、拋錯三者使用；class 名稱在 static 之前綁定的位置規則取代 `keepGenerateAtCallSite`、`splitByInnerClassName` | R2、R3 |
| — | 決策節點 p-use（FR-003） | 段節點的 p-use 若段節點不是 owner 記入 `deferredPuse`，`findDUPairs` 以 owner 的分支產生 pair（去重）；c-use 記在段節點。**摘要**：`summary.summaryGraphOf`（summary.js:160-162 現只取 `cuse`／`puse`）併入 `deferredPuse`，否則被呼叫端的 `if (x < f())` 會讓 `x` 漏出 `upwardExposed`（輸出到 `*.matching.json` 的 `summaries`） | R4、R8 |
| — | 不列為呼叫點的位置（FR-001 範圍） | (1) 條件求值而未被拆分的位置：optional chaining 中 `?.` 之後的部分（`c?.m(f())`、`c?.[f()]`）、解構樣式內的預設值（`var [z = f()] = c`、`var {z = f()} = c`；參數本身的預設值除外）——單一節點內無法表示「可能不執行」，若列為呼叫點，callee 的定義會錯殺可實現的 pair；與 develop 一致（不連結）。(2) for-in/of 左側（DECISION 005 Q2 A，FR-001 的明文例外）。(3) `case` test（含 class static，DECISION 005 Q3 A）。(4) **防護**：callee 或 receiver 變數在同一節點中有後序位置早於該識別字讀取的定義（`generatedAt`）時不列為呼叫點（`var f = h; f = g, f();` 否則因 ReachIn 只有 `f = h` 錯連到 `h`，develop 沒有此錯誤 pair）。(1)–(4) 的一般呼叫 golden／MDN 皆 0 例，各有 characterization 測試。(1)–(3) 位置中的 class static 成員一律不連結（develop 會連結，相對 develop 的行為變更，DECISION 006 Q4 必修 3）；實例數由 diffcheck 計數、有實例時簽核列出；characterization 在 US1（T066） | R2、R13；data-model §5 |
| — | once-loop 的迴圈變數 | 迴圈變數的定義與左側的讀取留在 N 副本（每次迭代），不屬任何段 | data-model §4 |
| — | `switch` 沒有 `case` | `switch (f()) {}` 在 develop 即拋 `Cannot read properties of undefined`（既有 bug，KI §48）；「判別式記在第一個 `case`」的規則不涵蓋它（沒有第一個 `case`，判別式不列入任何節點的求值運算式）；007 不得讓它更糟（守門測試） | R5、R13 |
| — | for-in/of 右側（FR-004） | 前插段鏈，只攔截迴圈外前驅（以 intra 原圖的 `isInsideLoopBody` 算 `enteringPrev`，攤平圖以來源的原節點比對）；迴圈副本設 `loopRightSplit` | R5 |

## 變更影響範圍（§TR-8，參考）

- **新增**：`lib/dujs/callsplit.js`；`tests/dujs/{splitcallnodes, callsplit}.js`、`tests/dujs/cases/probes007/`；`specs/007-split-call-nodes/{tools/diffcheck.js, tools/diffcheck.test.js, mdn/baseline-develop/, golden-diff.md, mdn-diff.md, perf.md}`。
- **修改**：`lib/dujs/callresolver.js`、`modelbuilder.js`、`hierarchy.js`、`expansion.js`、`defuseanalyzer.js`、`summary.js`（`summaryGraphOf` 併入 `deferredPuse`）、`cfggraphconverter.js`（DECISION 005 Q1 A）；`lib/esgraph/flownode.js`、`branchsplitter.js`（屬性複製、匯出）、`index.js`（LGPL：屬性與匯出）；
  `tests/helpers/analyze.js`（reset 呼叫 `callsplit.reset`）；`tests/golden/expected*`、`manifest.json`；既有測試中編碼舊行為者（`methodcalls.js`、`newcallsite.js`、`relaxedcallee.js`、`expansion.js`、`bypass.js`、`classfields.js`、`exceptionsummary.js`、`matching.js`、`cfggraphconverter.js` 等，逐處列入 golden-diff「單元測試期望」；實際受影響者以各階段 `npm test` 的失敗清單為準）；`tests/dujs/summary.js`（擴充：延後 p-use 的 `upwardExposed`）；`tests/esgraph/test.js`（擴充：`discriminantThrowTarget`、`throwTypes`、`isInsideLoopBody` 匯出；選此檔因 esgraph 的建圖與既有 FlowNode 測試都在此）；
  `README.md`、`docs/known-issues.md`；`specs/005-summary-analysis/tools/diffcheck.js`、`specs/006-eslint-scope/tools/diffcheck.js`（T006 視需要**只新增** `module.exports` 項目，不改行為）。
- **預期不改程式**（以測試確認）：`lib/dujs/reachingsolver.js`、`usedexpressions.js`（規則來源改由 findUSESet 指定，項目規則不變；只改第 94 行附近引用 `modelbuilder.expressionsEvaluatedAtNode` 的註解，該函式在 T025 刪除）、`outputwriter.js`（matching 格式不變）。
- **明確不受影響**：`lib/analyses/**`、`lib/esgraph/astrewriter.js`／`decisionfinder.js`／`dot.js`、esgraph 的建圖與 exception 邊、`scopetree.js`、`scopebinding.js`、`variableanalyzer.js`、`hierarchydot.js`、`cli.js`、`bin/dujs.js`、
  scope 命名與數量、inter-page 的 localStorage 模型、事件處理器註冊查找（`getRegisteredEventHandlerCallback`）。

## Project Structure

### Documentation (this feature)

```text
specs/007-split-call-nodes/
├── spec.md、plan.md、research.md、data-model.md、quickstart.md
├── contracts/   lib-api.md、diff-check.md、acceptance.md
├── probes/      探測程式、run.js、baseline-develop.txt（既有）
├── tools/       diffcheck.js、diffcheck.test.js                      （implement 新增）
├── mdn/         baseline-develop/（edc22d5 的 .dot、*.matching.json、pairs、exitcodes）（Setup 新增；語料沿用 006；matching 供標記改寫，DECISION 006 Q3）
├── golden-diff.md、mdn-diff.md、perf.md                               （implement 新增）
└── tasks.md                                                           （/speckit-tasks）
```

### Source Code (repository root)

```text
lib/dujs/      callsplit.js（新）＋上節修改檔
lib/esgraph/   flownode.js、branchsplitter.js、index.js（修改）
tests/dujs/    splitcallnodes.js、callsplit.js（新）、cases/probes007/、既有測試更新
tests/esgraph/ test.js：discriminantThrowTarget、throwTypes、isInsideLoopBody 匯出（擴充既有檔）
tests/golden/  expected*／manifest.json（更新）
```

**Structure Decision**：維持單一 library＋CLI 結構；「哪些呼叫點、各讀寫歸哪段、哪段會拋錯」集中在 `callsplit.js`（純計算、可單元測試），`modelbuilder`／`hierarchy` 只依 plan 建邊，`expansion` 只依 plan 擺放，`defuseanalyzer` 只依 plan 過濾。

## 實作順序與 story 相依（每階段結束 `npm test`、lint 全綠；改 golden 的階段 `diffcheck golden --verify` 通過後才 commit，由 orchestrator 親自重跑）

| 階段 | 內容 | 主要檔案 | golden |
|------|------|----------|--------|
| Setup | probes 複製到 `tests/dujs/cases/probes007/`；MDN develop 快照與 perf 基準（lib＝`edc22d5`）；diffcheck（去重、重複列數、類別）與自我測試 | specs、tests/dujs/cases | 不變 |
| Foundational（阻擋全部 story） | `callsplit.js`（`evaluatedExpressionsOf`、後序、呼叫點列舉、歸段、拋錯判定）＋單元測試；`callresolver.calleeScopesOfExpression`；`findGENSet` 記 `generatedAt`；FlowNode 屬性；esgraph／branchsplitter 屬性與匯出。**此階段不接到模型建構**（行為不變） | `callsplit.js`、`callresolver.js`、`defuseanalyzer.js`、`flownode.js`、esgraph | 不變（預期零差異，`--verify` 確認） |
| US1（P1，§16） | 既有呼叫點（呼叫敘述、決策節點條件本身）改依 plan 分段（以階段性 predicate 只留 develop 會連結者，見下）：段的 GEN／USE、延後 p-use（含 `summary.summaryGraphOf`）、class 名稱位置規則（刪 `keepGenerateAtCallSite`、`splitByInnerClassName`）；**例外邊維持 develop 位置**（段 0 有、決策副本保留），但**前插 CALL（段 0）的 exception 邊從 US1 就建立**；不列為呼叫點的位置中 class static 不再連結（行為變更，自 T025 起） | `modelbuilder.js`、`callresolver.js`（`stagedCallSite`）、`hierarchy.js`、`expansion.js`、`defuseanalyzer.js`、`summary.js` | **更新**（求值順序；class static 行為變更若有實例） |
| US2（P1，§22 (3)） | 列舉全部呼叫點（運算式、參數預設值、欄位初始化式、箭頭本體、`throw`、`return`）；`new F().m()` 兩個呼叫點；刪除欄位初始化式特例；不列為呼叫點的位置與同節點先定義 callee 的防護（data-model §5）；**`case` 判別式與 for-in/of 右側暫不列入**；標記（DECISION 005 Q1 A） | `callresolver.js`、`modelbuilder.js`、`cfggraphconverter.js` | **更新**（連結、標記） |
| US3（P2，順序與只求值一次） | 多呼叫點串接的驗收；`once-switch`／`once-loop` 形狀（判別式、右側列入）、`discriminantThrowTarget` 的使用、`enteringPrev`；移除階段性 predicate | `expansion.js`、`callsplit.js`、`modelbuilder.js`、`callresolver.js` | **更新**（求值順序：判別式／可迭代） |
| US4（P3，返回後例外） | 依 `plan.throws` 連段的 exception 邊、移除決策副本不拋錯時的例外邊、`exceptionalReturn` 改取 N 的例外目標 | `expansion.js` | **更新**（返回後例外、決策返回不拋錯） |
| Polish | MDN `--verify`、perf.md、known-issues、README、quickstart 全流程、golden-diff／mdn-diff 簽核 | docs、specs | `--verify` |

- **順序理由**：US1 先在「既有呼叫點」上建立分段機制，golden 差異只有求值順序一類，便於核對；US2 再擴大呼叫點集合（差異主要是 `連結`）；US3 的只求值一次需要前插段鏈與例外目標，獨立一階段；
  US4 最後改例外邊，使 `返回後例外` 類（含 P35 的消失）集中在一個階段。改 golden 的階段**必須依序**，每次重產相對 `edc22d5` 的累積淨差異並 `--verify`。
- **階段性的呼叫點篩選（DECISION 006 Q2，取代原本只在 modelbuilder 丟掉呼叫點的作法）**：只在 modelbuilder 丟掉呼叫點會與段索引衝突（段索引假設呼叫點連續：`h(g())` 丟掉 `g` 後段 1 的讀取／定義無處可掛），
  故改由 `callsplit.planOf(node, scopeTree, predicate)` 在**列舉時**篩掉，段由 plan 依留下的呼叫點重算（被篩掉的呼叫運算式視同一般運算）。develop 只連結 `astNode` 本身是 Call／New 的節點（callresolver.js:158-172 的 `callExpressionOf`，另含欄位初始化式的 `return` 引數）與 class static，
  所以「段由 plan 重算」後 US1 的段界與 develop 的呼叫點一一對應。條件：
  (a) predicate 由 `modelbuilder` 以參數傳入 `planOf`（函式本體為 `callresolver.stagedCallSite`，T025 加入；`planOf` 的參數由 T016 加入）；`planOf` 不給 predicate 時列出全部呼叫點，快取依 predicate 分開——Foundational 的 T011 以無 predicate 驗證全列舉與 `once-*`；
  (b) US1：只留 `entry.expression === callExpressionOf(node)` 或 `kind === 'class-static'` 的呼叫點，且 `once-*` 形狀一律不留；US2（T038）：只剩「`once-*` 一律不留」（判別式與 for-in/of 右側在沒有 `once-*` 擺放時若列入，會以「每個 case 都呼叫」的錯誤形狀連結）；US3（T048）刪除 predicate；
  (c) 下游（`hierarchy`、`expansion`、`defuseanalyzer`）只用 `edge.plan`／`segment.plan`；T037 改寫的 `calleeScopesOf` 在 T048 之前以同一個 `stagedCallSite` 呼叫 `planOf`；
  (d) 登記於 contracts/lib-api.md §1 為暫時項，註明移除的 task（T048）。
  **US1 的過渡失真**：`new F().m(x = 1)` 在 US1 只留外層 `.m()`（`astNode` 本身），而 T037 之前 `calleeScopesOfMethodCall` 仍把 F 的 constructor 併入 `.m()` 的被呼叫端，因此 `x = 1` 落在段 0（constructor 之前），與 ECMAScript 順序不同；
  golden-diff 歸 `求值順序` 類並在 US1 敘述節註明，T037／T038 後修正（`new F()` 成為自己的呼叫點、`x = 1` 移到段 1）。
  **US1–US2 的過渡缺口**：for-in/of **右側**中 class 的 static 成員 develop 會連結（`expressionsEvaluatedAtNode` 取 `ast.right`），但 `once-loop` 在 US3 才有擺放，US1–US2 期間被 predicate 排除；若 golden／MDN 有實例，US1／US2 敘述節列為 `連結` 類的 − 項，US3 恢復。
- **US4 之前的例外邊**：US1–US3 期間，新呼叫點的段 1…k 不連 exception 邊、段 0 連（等同 005 Q-a 推廣），US4 才依 `throws` 補上返回後的例外邊；這段期間的 golden 差異中不會出現 `返回後例外` 類。
  因此 US2 情境 10（P25 `throw f();`）的 `x: L3 -> L9`（返回後段的例外路徑）在 US4（T052）才斷言，US2 的 T032 只斷言 `x: L1 -> L9`、`f` 有 call 邊、分析完成（DECISION 006 Q1）；US2 的 golden 檢查點對 P25 為部分驗收。
  **風險**：US2–US3 期間 `throw f();` 的 CALL RETURN（段 1）沒有任何出邊（`throw` 沒有 normal 後繼、返回後的 exception 邊要到 US4）。若 T041 因此出錯（求解器或攤平圖對無出邊節點失敗），
  改走「US2 就替 `throw` 的返回後段連 exception 邊」（本段對 `throw` 加例外），並由 orchestrator 以 DECISION REQUEST 回報使用者。
  `decision`／`once-*` 形狀**前插的 CALL 節點（段 0）的 exception 邊從 US1 就要有**（連到 `throwTarget` 的副本）：US1 起段 0 帶條件中呼叫前的讀取與 callee 的進入，若到 US4 才補，中間階段會誤刪「呼叫前的例外路徑」上的 pair，產生不屬當階段類別的 − pair。

## 已裁決的事項（使用者裁決 DECISION 005）

| # | 問題 | 決定 | 理由與影響 |
|---|------|------|------------|
| Q1 | FR-007「拆分產生的節點以原節點的行號標記」在 CLI `.dot` 的落實（段節點 CALL／CALL RETURN 現行標 `call`、`callReturn`，重名加 `_a`…） | **A**：CALL／CALL RETURN 一律標 `call (<行>[:路徑])`、`callReturn (<行>[:路徑])`（延伸 KI §15 的既有形式） | 依 FR-007 原文，若選 B（不改標記），007 新連結的 `var y = g();` 的 use 端會由 `6` 變成 `call_x`，CLI 反而退步。golden 影響：55 個 `.graph.dot` 中 14 個、55 個 `.dupairs.dot` 中 12 個，共 117 個標記；diffcheck 先以基準側 matching 把 develop 標記換成帶行號形式再比對（contracts/diff-check.md §1），純標記差異歸 `標記` 類 |
| Q2 | `for…in`／`for…of` **左側**（成員目標的物件、解構預設值）中的呼叫 | **A**：不是呼叫點，作為 FR-001 的明文例外 | develop 也不連結（左側中 class static 成員例外：develop 會連結，007 不連結，見 DECISION 006 Q4 必修 3）；golden 與 MDN 一般呼叫皆 0 例。記入 KI §46（R13 L1），characterization 測試（contracts/acceptance.md） |
| Q3 | `case` test 中 class 的 static 成員 | **A**：不再連結 | **窄範圍的相對 develop 行為變更**，不是既有限制：develop 的 `case class { static y = g(); }:` 會把 static scope 連進模型（`modelbuilder.expressionsEvaluatedAtNode` 的 `SwitchCase` 分支取 `ast.test`）。golden 與 MDN 皆 0 例。記入 KI §44（寫成相對 develop 的行為變更，R13 L2），characterization 測試（US1 T066）。DECISION 006 把同一規則擴及 `?.` 之後、解構預設值（含 catch 參數）、for-in/of 左側中的 class static（KI §46，R13 L2'）。DECISION 007：只涵蓋留在 `case` 節點內的 test，拆出的非末端運算元中仍連結 |

## analyze 修正（DECISION 006）

使用者對 analyze 發現（H1–H3、A1–A6、M1–M5）的裁決已套用到本 plan、spec、research、data-model、contracts 與 tasks；逐項改動見 tasks.md 文末「analyze 修正（DECISION 006）」。要點：
DECISION 006 Q1（H1）P25 的 `x: L3 -> L9` 移到 US4（見「US4 之前的例外邊」）；DECISION 006 Q2（H2）階段性 predicate（見「階段性的呼叫點篩選」）；DECISION 006 Q3（H3）MDN 快照同時保存 `*.matching.json`；
DECISION 006 Q4：diff-check §1 第 0 步、T025 一併刪除 `expressionsEvaluatedAtNode`／`preEvaluatedAt`、Scale 與影響範圍、Q 編號加前綴（`DECISION 005 Q2`、`clarify Q4`、`spec review Q1`）；
必修：US1 的摘要／延後 p-use 測試改用 `if (f(x))`、T037 延後 require（循環 callsplit ↔ callresolver）、不列為呼叫點的位置中 class static 一律不連結（行為變更，data-model §5）。

## 已知風險

| 風險 | 影響 | 緩解 |
|------|------|------|
| 後序編號與 `findUSESet`／`findGENSet` 的走訪範圍不一致（例如某些 AST 只在其中一邊被走訪） | 讀取或定義找不到段（`segmentOf` 無定義） | `callsplit` 對找不到位置的 Identifier／定義拋錯（測試可見），不默默歸到段 0；單元測試涵蓋 findUSESet 的每個 walker 分支 |
| class 名稱位置規則取代 `keepGenerateAtCallSite`／`splitByInnerClassName` | static 成員相關 pair 改變 | 既有 `classfields.js`、static 相關 golden 為守門，預期零差異；有差異即視為 bug |
| 延後 p-use 與 005 的 bypass、摘要 | p-use 讀到錯誤的定義或漏讀；摘要漏掉延後 p-use 時 `upwardExposed` 少列變數（`*.matching.json` 的 `summaries` 錯誤） | 摘要圖與攤平圖共用 `replayCall`；`summaryGraphOf` 併入 `deferredPuse`，`tests/dujs/summary.js` 在 US1 以被呼叫端 `if (f(x))`（callee 的延後 p-use，T021）、US2 以 `if (x < f())`（T036）斷言在 `upwardExposed`；US1-4（P21）、P9、P32 的驗收直接檢查 p-use 的定義端 |
| 單一節點內的條件求值位置（`?.`、解構預設值）與同節點先定義的 callee | 誤列為呼叫點時，callee 的定義錯殺可實現的 pair 或錯連到舊定義 | 不列為呼叫點（data-model §5）；characterization 測試釘住與 develop 相同的結果 |
| `once-loop` 的前驅判定在攤平圖中誤判 | 呼叫在每次迭代發生（P15b 失敗）或迴圈外進入略過呼叫 | 以 intra 原圖算 `enteringPrev`，攤平圖只比對來源的原節點；P15、P15b 與巢狀迴圈、`continue` 的單元測試 |
| 新呼叫點大量增加（MDN 中 `var p = new Person(…)` 很常見） | pair 差異多、`§43` 重複列增加、效能 | 差異去重＋分類釘選；重複列數另表；perf.md 檢核 2 倍門檻 |
| cfgId 全域計數器：上層模型多建 CALL／CALL RETURN 模板 | 之後建立的模型節點編號位移 | 歸 `共通`（去除編號後相同）；intra-procedural 模型在上層模型之前建立，預期不受影響，以 golden 確認 |
| 判別式的例外目標需要 esgraph（LGPL）新增屬性 | LGPL 衍生範圍擴大 | 只記屬性與匯出常數，不改建圖；檔頭 Modified 行記錄；esgraph 測試確認不新增任何邊 |

## Complexity Tracking

無憲章違規需說明。
