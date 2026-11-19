# Implementation Plan：階層模型 stage 2——摘要分析、§18、`finally` 整族與例外路徑

**Branch**: `005-summary-analysis` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-summary-analysis/spec.md`

## Summary

每個被呼叫端（函式、方法、constructor、欄位初始化式、static block、事件處理器）計算一份摘要（GEN at exit、must-KILL、upward-exposed uses、例外離開時的定義），
在 inter-procedural 模型建好後以 scope 呼叫圖的 SCC 不動點（從「無正常返回」起算）求得；摘要圖＝該 scope 的 intra-procedural 節點＋自己的直接 call 邊（`expandShallow`，
不含被呼叫端節點）。攤平圖結構不變，pair 改由新的邊型別感知求解器 `reachingsolver` 計算：callReturn 吃 `apply(摘要, OUT(callNode))` 而不吃 exit 的 return 邊、
例外邊帶拋錯節點的 IN（FR-014）、LOOP RETURN 吃 `OUT(LOOP) ∪ 各處理器的 GEN`（不套 must-KILL）。呼叫敘述的例外邊留在 CALL 節點（Q-a）。函式內 `f()` 依 D2 放寬連結
（判定在 `callresolver`，binding 種類由 `scopebinding.isRelaxedCallee` 提供）。entry 節點不再讀本體（§18）。esgraph 修正 `finally` 整族：catch 拋錯、跳躍、例外進入的 finally
都經新的 `finallyExit` 節點續行。配對資訊另存 `*.matching.json`，`.dot` 不為它改變。golden／MDN 差異沿用 006 的 diff-check 機制記錄。設計理由見 [research.md](./research.md) R0–R14。

## Technical Context

**Language/Version**: JavaScript（CommonJS，`lib/` 維持 ES5 風格），Node.js ≥ 24

**Primary Dependencies**: espree ^11.2.0、eslint-scope ^9.1.2（`lib/dujs/scopebinding.js` 是唯一的宣告與解析來源）、walkes ^0.2.1、自有 esgraph CFG（`lib/esgraph/`）。**不新增執行期相依**。
LGPL 衍生檔中本 feature 修改 `lib/esgraph/index.js`、`lib/esgraph/dot.js`（FR-013，檔頭 Modified 清單記錄）；`lib/analyses/index.js` 不修改（改由新求解器取代其在 doAnalysis 的使用）。

**Storage**: N/A（CLI 輸出 `.dot`／`.png`／`report.html`，新增 `*.matching.json`）

**Testing**: mocha ^12＋should ^13＋fast-check ^4；golden `tests/golden/golden.js`＋`manifest.json`；eslint ^10；c8。**基線**（`9e324be`）：`npm test` **1273 passing**。

**Target Platform**: Node.js ≥ 24（macOS／Linux）

**Project Type**: library＋CLI（`bin/dujs.js`）

**Performance Goals**: SC-004：golden fixture 與 MDN 33 檔全部完成；總分析時間 ≤ develop（`9e324be`）× 2（`specs/006-eslint-scope/tools/perf.js`，同機 3 輪中位數，記入 `perf.md`）。

**Constraints**: 攤平圖不為呼叫點複製被呼叫端（D4、FR-009）；intra-procedural 模型的呼叫維持不透明，只受 FR-008、FR-013、FR-014 影響；配對資訊不得改動 `.dot`（FR-010）；
golden 每處差異記錄於 `golden-diff.md` 並對應 FR／KI（FR-011）；`eslint-suppressions.json` 不得新增鍵或增加 count；spec.md 不由 plan 修改。

**Scale/Scope**: 6 個 user story、14 條 FR；新增 lib 模組 2 個（`summary.js`、`reachingsolver.js`），修改 lib 檔約 16 個（見「變更影響範圍」）；新增測試檔約 11 個；feature 目錄新增 diffcheck、MDN 快照、紀錄檔。

**tech-standards**：`.specify/memory/baseline/tech-standards.md` 未涵蓋靜態分析 CLI／函式庫，無偏離項，無 §CP-6 例外。

**NEEDS CLARIFICATION**：無技術未知項；plan review 的兩項 spec 層級事項（Q1、Q2）與 analyze 閘門的四項（Q1–Q4）皆已由使用者裁決（見「需使用者裁決的事項」與 spec Clarifications）。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／D／Clarifications（下表「關鍵設計」）；發現的 spec 矛盾（Q1）與 `.dot` 新節點（Q2）列為裁決事項，不自行改 spec | PASS | PASS（裁決事項皆已決，見「需使用者裁決的事項」） |
| §CP-2 機密 | 不涉及；MDN 語料為 CC0 | PASS | PASS |
| §CP-3 設定不硬編碼 | 無新設定；`UPDATE_GOLDEN` 沿用；diffcheck 基準以檔頭／參數指定 | PASS | PASS |
| §CP-4 核心邏輯測試 | 每個驗收情境有自動化測試（contracts/acceptance.md）；摘要、求解器、esgraph finally、inlining oracle（property test）各有單元測試；golden 回歸 | PASS | PASS |
| §CP-5 審查 | PR 目標 `develop`，人為核准 | PASS | PASS |
| §CP-6 例外 | 無 | PASS | PASS |
| §GV 最小審查 | golden-diff／mdn-diff 由 diffcheck `--verify` 核對，釘選類別由使用者簽核 | PASS | PASS |
| 【參考】§TR-7 ISP | finally：進入方式（正常／例外／return／break／continue）× catch 有無 × finally 空／非空 × 巢狀 × 頁面層／函式內；摘要：無呼叫／一般／自身遞迴／互相遞迴／無正常返回／generator／async | — | 採用 |
| 【參考】§TR-8 影響範圍 | 見下節 | — | 已宣告 |

## 關鍵設計（plan 必答議題）

| 議題 | 決策 | research |
|------|------|----------|
| 摘要的資料結構與計算位置 | `Summary{normalReturn, gen, mustKill, upwardExposed, exceptional, conservative}`，存 `lib/dujs/summary.js` 每頁表；屬函式單元（第 1 層節點＋第 2 層直接 call 邊），以 `expansion.expandShallow` 建摘要圖；在第 2 層 call 邊與第 3 層 LOOP 套用 | R1 |
| 與 expansion 攤平圖的關係 | 攤平圖結構不變（每個 original 一份）；求解器以 CallSiteRecord 讓 callReturn 改吃摘要；摘要的 original VarDef 經 `flatVarDefOf` 對到該圖的重建 VarDef | R1、R2 |
| 不動點與遞迴回邊 | hierarchy call 邊（含 back）建 scope 呼叫圖，Tarjan SCC 反拓撲序；SCC 內從 ⊥（無正常返回）反覆至不變；must-KILL 以 entry 的哨兵定義求（同一求解器） | R3 |
| LOOP | `IN(LOOP RETURN) = OUT(LOOP) ∪ ⋃_h(gen_h ∪ exceptional_h)`；處理器 exit→LOOP RETURN 邊不貢獻；頁面未捕捉例外經 `replayLoop` 進 LOOP | R4 |
| FR-010 配對輸出 | 每個 upper 模型另寫 `<index>.matching.json`（`n<k>` 與 `.graph.dot` 同名），含 call／LOOP 紀錄與摘要；`exit → exceptionalReturn` 為虛擬邊 | R9；contracts/matching-output.md |
| FR-013 finally 落點 | `lib/esgraph/index.js`：catch 本體在 finally 入口的 catchStack 下走訪；跳躍經 finally 串接；非空 finally 非單純正常進入時加 `finallyExit` 節點（normal／exception／新多目標 `finally` 邊）；空 finally 視同無 | R6；data-model §7、§8 |
| FR-014 例外邊只帶 IN 的落點 | 新求解器 `lib/dujs/reachingsolver.js` 的邊貢獻表（exception → `IN(p)`）；`defuseanalyzer.doAnalysis` 改用它，所有模型與摘要一致 | R2 |
| Q-a | `expansion.replayCall` 不搬例外邊，留在 CALL 節點（帶呼叫前定義）；被呼叫端例外以 CallSiteRecord 的 `exceptionalReturn` 虛擬貢獻 `X ∪ exceptional` | R2、R5 |
| FR-005 D2 放寬 | `callresolver.resolveVariable`：無到達定義＋`CallExpression`＋函式內＋全頁恰 1 筆定義＋指向函式＋`scopebinding.isRelaxedCallee`（function／let／const／namedExpressionName） | R8 |
| FR-008 §18 | `usedexpressions` 對 entry／exit 回傳空；移除 `findUSESet` 的 entry 特例與 `isOnFunctionChain` | R7 |
| generator／async | 摘要 `conservative`：恆正常返回、無 must-KILL、gen 合併正常與例外抵達 | R13 |
| golden／MDN 差異 | 新 `tools/diffcheck.js` 重用 006 的解析與 verify，替換類別（§18、連結、finally、例外IN、Q-a、摘要、保守摘要）；golden 基準 `9e324be`；MDN develop 快照於 Setup 重做 | R10；contracts/diff-check.md |
| 效能 | 摘要每 scope 每頁算一次（SCC 內多輪）；哨兵只建相關變數；以 006 perf.js 量測，門檻 2.0 | R11 |

## 變更影響範圍（§TR-8，參考）

- **新增**：`lib/dujs/summary.js`、`lib/dujs/reachingsolver.js`；`tests/dujs/{summary, reachingsolver, summaryanalysis, matching, relaxedcallee, exceptionsummary, loopmatching, entryuse, finallyflow, inliningoracle.property}.js`、
  `tests/esgraph/finally.js`、`tests/dujs/cases/probes005/`；`specs/005-summary-analysis/{tools/diffcheck.js, tools/diffcheck.test.js, mdn/baseline-develop/, golden-diff.md, mdn-diff.md, perf.md}`。
- **修改**：`lib/dujs/defuseanalyzer.js`、`usedexpressions.js`、`expansion.js`、`model.js`、`modelbuilder.js`、`defuseanalysisexecutor.js`、`callresolver.js`、`scopebinding.js`、`def.js`、`deffactory.js`、
  `cfggraphconverter.js`、`outputwriter.js`；`lib/esgraph/flownode.js`、`flownodefactory.js`、`index.js`（LGPL）、`dot.js`（LGPL）；`tests/helpers/analyze.js`（reset）；`tests/golden/golden.js`（納入 `*.matching.json`）、
  `tests/golden/expected*`、`manifest.json`；既有測試中編碼舊行為者（逐處列入 golden-diff「單元測試期望」）；`README.md`、`docs/known-issues.md`。
- **明確不受影響**：`lib/analyses/**`、`lib/esgraph/branchsplitter.js`／`astrewriter.js`／`decisionfinder.js`（只依賴其對 `CONNECTION_TYPES` 的泛用處理，不改程式）、`hierarchy.js`、`hierarchydot.js`、
  `scopetree.js`、`variableanalyzer.js`、`cli.js`、`bin/dujs.js`、scope 命名與數量、inter-page 的 localStorage 模型。

## Project Structure

### Documentation (this feature)

```text
specs/005-summary-analysis/
├── spec.md、plan.md、research.md、data-model.md、quickstart.md
├── contracts/   lib-api.md、matching-output.md、diff-check.md、acceptance.md
├── probes/      探測程式與 run.js（既有）
├── tools/       diffcheck.js、diffcheck.test.js                 （implement 新增）
├── mdn/         baseline-develop/（9e324be 的 .dot、pairs、exitcodes）（Setup 新增；語料沿用 006）
├── golden-diff.md、mdn-diff.md、perf.md                          （implement 新增）
└── tasks.md                                                      （/speckit-tasks）
```

### Source Code (repository root)

```text
lib/dujs/      summary.js、reachingsolver.js（新）＋上節修改檔
lib/esgraph/   flownode.js、flownodefactory.js、index.js、dot.js（修改）
tests/dujs/    新測試檔（上節）、cases/probes005/
tests/esgraph/ finally.js（新）
tests/golden/  expected*／manifest.json（更新）、golden.js（納入 matching）
```

**Structure Decision**：維持單一 library＋CLI 結構；摘要與求解器為兩個新模組，模型建構（modelbuilder／expansion／hierarchy）只提供呼叫紀錄，不承擔資料流程規則。

## 實作順序與 story 相依（每階段結束 `npm test`、lint 全綠；改 golden 的階段 `diffcheck golden --verify` 通過後才 commit，由 orchestrator 親自重跑）

| 階段 | 內容 | 主要檔案 | golden |
|------|------|----------|--------|
| Setup | probes 複製到 `tests/dujs/cases/probes005/`；MDN develop 快照與 perf 基準；diffcheck（含自我測試） | specs、tests/dujs/cases | 不變 |
| Foundational（阻擋全部 story） | `reachingsolver`（邊貢獻表；此時 return／LOOP 虛擬貢獻先以「沿用 exit 邊」模式保持行為，並加過渡規則：指向被呼叫端 exit 的 exception 邊仍帶 OUT，analyze Q1）＋`doAnalysis` 切換；FR-014 exception 帶 IN 同時生效 | `reachingsolver.js`、`defuseanalyzer.js` | **更新**（預期零差異，至多例外IN；單元測試只翻轉 `catchclause.js` catch-edge 一筆） |
| US5（P1，§18） | entry／exit 不讀本體；移除 `isOnFunctionChain` | `usedexpressions.js`、`defuseanalyzer.js`、`scopebinding.js` | **更新**（§18） |
| US6（P2，finally） | esgraph finally 整族、`finallyExit`、`finally` 邊、dot 繪製 | `lib/esgraph/*` | **更新**（finally） |
| US1（P1，摘要核心） | `summary.js`、`expandShallow`、CallSiteRecord、`flatVarDefOf`、Q-a、callReturn 改吃摘要、`*.matching.json`；刪除 Foundational 的過渡規則（analyze Q1） | `summary.js`、`expansion.js`、`model.js`、`modelbuilder.js`、`defuseanalysisexecutor.js`、`outputwriter.js`、`cfggraphconverter.js` | **更新**（摘要、Q-a、matching 新檔） |
| US3（P2，例外摘要） | `exceptional`、`exceptionalReturn` 虛擬貢獻、沿呼叫鏈往外 | `summary.js`、`reachingsolver.js` | **更新** |
| US4（P2，LOOP） | LoopRecord、LOOP RETURN 虛擬貢獻 | `expansion.js`、`reachingsolver.js` | **更新** |
| US2（P1，D2） | `isRelaxedCallee`、`resolveVariable` 放寬；自身／互相遞迴的不動點驗收 | `scopebinding.js`、`callresolver.js` | **更新**（連結） |
| Polish | inlining oracle、MDN `--verify`、perf.md、known-issues、README、quickstart 全流程、簽核 | docs、specs | `--verify` |

- **順序理由**：US2 雖為 P1，但它新增的連結（自身／互相遞迴）沒有摘要時會讓 P6 一類守門變成不可實現 pair（spec P6 說明），故排在 US1、US3、US4 之後；US5 與 US6 不依賴摘要，先做以縮小
  後續 golden 差異的混雜。改 golden 的階段**必須依序**，每次重產「淨差異」並 `--verify`（淨差異相對 develop 累積）。
- **Foundational 的行為保持**：求解器切換時先不啟用摘要（return／LOOP RETURN 邊照舊貢獻），使該階段 golden 差異只有 FR-014 一類，便於核對。另加**過渡規則**
  （analyze Q1 → A）：指向被呼叫端 exit（有 return 出邊之 exit）的 exception 邊仍帶 OUT——否則被呼叫端拋錯前的定義會經 return 邊流回呼叫端（Fable 原型實測翻轉 26 個
  既有測試）；加入後預期 Foundational golden 零差異、只翻轉 `catchclause.js` 的 catch-edge 一筆。US1 摘要上線時刪除此規則並記入 golden-diff US1 節；US6 情境 5 的否定斷言
  （無 `r: L4 -> L11`）在 Q1-A 下仍屬 US6。

## 需使用者裁決的事項

| # | 問題 | 建議 | 若不裁決的影響 |
|---|------|------|----------------|
| Q1（已決：A，2026-11-17 使用者採建議，spec 已改） | US1-4 的 `cyc-3.js` 是無條件遞迴（`m` 每次都呼叫 `this.m(0)`），依 FR-003「從無正常返回起算」與 US1-7，L6 不可達，`t: L4 -> L6` 必然消失，與 US1-4「仍有 `t: L4 -> L6`」矛盾 | US1-4 改用有終止條件的變體（`if (p) { this.m(0); }`）檢查「外層區域變數不受內層影響」；原 cyc-3 改為「沒有以 L6 為 use 端的 pair、分析終止」 | US1-4 無法通過（research R3） |
| Q2（已決：A，2026-11-17 使用者接受，spec FR-013 已補述） | FR-013 無法只靠「邊變化」完成：`FlowNode` 的 normal／exception 各只有一個目標，例外進入或跳躍穿過的 finally 需要一個續行節點；本設計新增 `finallyExit` 節點型別與多目標 `finally` 邊型別，出現在 `.dot` | 接受（golden 只影響 page0 `parseSaved` 一處；MDN 無 `try`）；或改採複製 finally 節點（同行多節點、pair 重複列，不建議） | `.dot` 出現新節點／邊型別而 spec 只提到邊變化 |
| analyze Q1（已決：A） | Foundational 相容模式下例外邊帶 IN 會讓被呼叫端拋錯前的定義經 return 邊流回呼叫端 | 加過渡規則（指向被呼叫端 exit 的 exception 邊仍帶 OUT），US1 刪除 | — |
| analyze Q2（已決：A） | diff-check `例外IN` 的新增 pair 無法以 intra-procedural 圖判定 | 新增 pair 以基準攤平圖判定，逐頁釘選並簽核 | — |
| analyze Q3（已決：A） | generator／async 保守摘要造成的差異無類別可歸 | SC-005、diff-check 增列 `保守摘要`（FR-001） | — |
| analyze Q4（已決：A） | US5 情境 2 的 p-use 實際在 L7 的 `case` 節點 | 改為 `x: L1 -> L7>L8:T`、`x: L1 -> L7>L10:F` | — |

analyze 各項的詳細決定見 spec Clarifications「analyze（2026-11-17）的使用者決策」。

## 已知風險

| 風險 | 影響 | 緩解 |
|------|------|------|
| 求解器替換造成非預期行為差異 | golden 大量變動、難以歸因 | Foundational 先只啟用 FR-014，其他貢獻沿用舊語意；之後逐 story 啟用，每階段單獨 `--verify` |
| 摘要與攤平圖規則分岔（GEN 搬移、class 內部名稱、決策前呼叫） | 摘要與 pair 不一致 | `expandShallow` 重用 `replayCall`；inlining oracle 作為整體正確性的獨立檢查 |
| VarDef 對應（original → 攤平圖） | pair 的 def 端標錯節點或遺失 | `flatVarDefOf` 由 `rebuildGenerateSets` 外露；求解器在找不到對應時拋錯（測試可見），不默默丟棄 |
| 哨兵外洩到輸出 | `.dupairs.dot` 出現異常列 | 哨兵只放摘要圖 entry；單元測試斷言各模型 reachIns 無 `SENTINEL_TYPE` |
| finally 續行的聯集過度近似 | 多種進入方式並存時多報 pair | 文件化於 README 限制；spec 情境為單一進入方式，結果精確 |
| esgraph 新型別未被某處泛用處理（`allNodes` 走訪、`replayLoop`、dot） | 節點遺失或邊未畫 | `tests/esgraph/finally.js` 對每種進入方式檢查節點數、邊型別與 dot 輸出；data-model §7 列出需確認處 |
| D2 讓 flat 圖變大 | 效能 | 實測 MDN 只有 4 個新連結候選、golden 3 個（`addTodo`、`scale`、`log`）；perf.md 檢核 2 倍門檻 |
| `cyc-3` 一類無條件遞迴在 golden／MDN 中 | 更多 pair 消失 | 歸 `摘要` 類（呼叫無正常返回），逐頁釘選並簽核 |

## Complexity Tracking

無憲章違規需說明。
