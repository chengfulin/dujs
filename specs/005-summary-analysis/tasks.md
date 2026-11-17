---

description: "Task list for feature 005-summary-analysis"
---

# Tasks: 階層模型 stage 2——摘要分析、§18、`finally` 整族與例外路徑

**Input**: Design documents from `specs/005-summary-analysis/`（plan.md、spec.md、research.md R0–R14、data-model.md、contracts/（lib-api、matching-output、diff-check、acceptance）、quickstart.md、probes/）

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/（plan review 裁決 Q1、Q2 已寫入 spec Clarifications「plan review（2026-11-17）的使用者決策」；analyze 裁決 Q1–Q4 已寫入「analyze（2026-11-17）的使用者決策」）

**任務總數**：100（T001–T100）

**Tests**: 本 feature 要求測試（憲章 §CP-4、SC-001：每個驗收情境一個自動化測試，對應表見 `contracts/acceptance.md`）。**測試先行**：每個 phase 先寫測試並確認失敗（red），再實作（green）。

**Organization**: Setup → Foundational（新求解器＋FR-014，阻擋所有 story）→ US5 → US6 → US1 → US3 → US4 → US2 → Polish（依 plan「實作順序與 story 相依」）；每個 story phase 以閘門任務與 Checkpoint 結束。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、不依賴未完成的任務）
- **[Story]**：US1–US6
- 路徑皆相對於專案根 `/Users/chengfulin/Documents/Personal/dujs`；git 一律 `git -C <專案根>`

## 全程規則（每個任務都適用）

- **驗收預期**：spec 與 `contracts/acceptance.md` 的預期 pair 是手推值。實跑不符時先查推導（例外邊帶 IN、Q-a 的例外邊位置、`finallyExit` 續行、摘要可見性過濾），確認是實作偏離就修實作；確認是推導錯誤才記入 `golden-diff.md` 末節「驗收預期更正」並在回報中列出（含推導），**implementer 回報，由 orchestrator 改 `contracts/acceptance.md` 並 commit**；**不得只改預期迎合結果**。更正若涉及 spec.md 明列的 pair，**先停下回報，由使用者裁決後 orchestrator 改 spec.md（Clarifications 新條目）**，再改 contracts。
- **plan 裁決**：US1 情境 4 用 `c-cyc3-cond.js`（Q1；`contracts/acceptance.md` 該列「依裁決 Q1」即指此檔），原 004 `cyc-3.js` 改驗「沒有以 L6 為 use 端的 pair、分析終止」；`.dot` 新增 `finallyExit` 節點型別與多目標 `finally` 邊型別（Q2）。
- **探針複本**：測試只讀 `tests/dujs/cases/probes005/` 的複本（T002）與既有 `tests/dujs/cases/probes004/cyc-3.js`，不得讀 `specs/` 下的檔案；spec 以內文給出、probes 沒有的程式（US1-3、US2-2 的變體）以內嵌字串寫在測試中。
- **feature 目錄的寫入範圍**：implementer 只可寫入 `specs/005-summary-analysis/{tools/,mdn/,golden-diff.md,mdn-diff.md,perf.md}`；`spec.md`、`plan.md`、`tasks.md`、`research.md`、`data-model.md`、`quickstart.md`、`contracts/`、`probes/` 需改時 implementer 回報，由 orchestrator 改並 commit。006 的 `specs/006-eslint-scope/tools/diffcheck.js` 只允許「新增 `module.exports` 項目」（contracts/diff-check.md §1）。
- **Golden 序列化**：`tests/golden/expected*/`、`tests/golden/manifest.json`、`specs/005-summary-analysis/golden-diff.md` 是共用資源，**寫入它們的任務都不標 [P]**，同一時間只有一個 phase 寫入；順序固定為 T019（Foundational）→ T028（US5）→ T042（US6）→ T062（US1）→ T071（US3）→ T081（US4）→ T090（US2）。每次的步驟（quickstart §4）：
  1. `UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js`（只重建 `expected*`，不碰 manifest）；
  2. `node specs/005-summary-analysis/tools/diffcheck.js golden --report > <scratchpad>/g.md`，把骨架貼入 `golden-diff.md`「淨差異（相對 develop）」（**相對 `9e324be` 的累積結果，整表重新產生**），補「說明」；`摘要`、`連結`、`finally`、`保守摘要` 四類與 `例外IN` 的新增 pair（analyze Q2）填「釘選與簽核」表的每頁筆數（簽核欄只填「草擬，待簽核」）；在本階段敘述節寫該階段的變化、雜湊變化表（舊→新 sha256 前 12 碼）與「單元測試期望」表；
  3. `node specs/005-summary-analysis/tools/diffcheck.js golden --verify specs/005-summary-analysis/golden-diff.md` 結束碼 0；
  4. 只更新有變化的 `tests/golden/manifest.json` 鍵（`baseline` 雜湊；新檔 `*.matching.json` 登記於各 case 的 `added`）；
  5. `npm test` 全綠。
  6. 回報後由 **orchestrator 親自重跑** `diffcheck.js golden --verify` 結束碼 0 才 commit（diffcheck 不進 `npm test`）。
  無法歸入 contracts/diff-check.md §2 類別的差異（`--verify` 失敗）→ 先視為回歸修實作；確認不是回歸且無法歸類 → 停下請使用者裁決，不得放寬 diffcheck 判準。
- **既有測試**：編碼舊行為的既有測試（`tests/dujs/bypass.js`、`defuseanalyzer.js` 的 entry use、`expansion.js` 的例外邊搬移、`scopebinding.js` 的 `isOnFunctionChain`、`reachingdefinitions.js`、`usedexpressions.js` 的 entry 讀取等）只在本 feature 規格要求的範圍內改期望；每一筆修改記入 `golden-diff.md` 對應階段的「單元測試期望」表。其他既有測試失敗 → 先查是否為實作偏離；無法判斷 → 停下裁決。
- **檔案限制**：不修改 `lib/analyses/**`（求解器以新模組取代其在 `doAnalysis` 的使用）、`lib/esgraph/branchsplitter.js`／`astrewriter.js`／`decisionfinder.js`、`hierarchy.js`、`hierarchydot.js`、`scopetree.js`、`variableanalyzer.js`、`cli.js`、`bin/dujs.js`（plan「明確不受影響」）；LGPL 檔只改 `lib/esgraph/index.js`、`lib/esgraph/dot.js`，各在檔頭 Modified 清單加一行；新檔 MIT 檔頭、ES5 風格（`'use strict'`、`var`、function 表示式）。
- **閘門**（下文稱「閘門」）：`npm test` 全綠、`npm run lint` 0 錯誤、`git -C <專案根> diff 9e324be -- eslint-suppressions.json` 無新增鍵、無 count 增加（基準 118 筆、35 檔；只允許 `npx eslint . --prune-suppressions` 造成的刪減並列於回報）；改 golden 的階段另需 `diffcheck.js golden --verify` 結束碼 0，且由 orchestrator 親自重跑通過後才 commit。
- **簽核**：`摘要`、`連結`、`finally`、`保守摘要` 與 `例外IN` 新增 pair 的釘選表簽核欄 implementer 只填「草擬，待簽核」，**不得自簽**；使用者於 T099（golden）、T100（MDN）簽核。

---

## Phase 1: Setup（develop 基準；任何 `lib/` 變更之前）

**Purpose**: contracts/diff-check.md §4——複製 probes、鎖定 MDN 與效能基準（lib＝`9e324be`），備妥差異判定工具。

- [X] T001 確認基準：`git -C <專案根> diff --quiet 9e324be HEAD -- lib bin tests` 成立；`npm test` 1273 passing、`npm run lint` 0 錯誤、`eslint-suppressions.json` 118 筆（35 檔）。不符即停下回報
- [X] T002 [P] 把 `specs/005-summary-analysis/probes/*.js`（不含 `run.js`，41 個）逐字複製到 `tests/dujs/cases/probes005/`（`cmp` 逐檔確認）
- [X] T003 [P] 在 `eslint.config.js` 的 `ignores` 加 `'tests/dujs/cases/probes005/**'` 與 `'specs/005-summary-analysis/mdn/**'`（分析輸入，註解註明 feature 005）；`specs/005-summary-analysis/tools/` **不**忽略，須 lint 通過且不加抑制
- [X] T004 MDN develop 快照（diff-check §4 步驟 1）：以目前（lib＝`9e324be`）的工作樹對 `specs/006-eslint-scope/mdn/pages.json` 每個 id 執行 `node bin/dujs.js -js <files> [-js <files>]`（輸出到 scratchpad），只保存 `.dot` 到 `specs/005-summary-analysis/mdn/baseline-develop/<id>/`，結束碼寫入 `specs/005-summary-analysis/mdn/baseline-develop/exitcodes.json`（預期全 0），並以 `node docs/research/mdn-baseline/tools/run-pairs.js . <files>` 輸出 `specs/005-summary-analysis/mdn/baseline-develop/<id>.pairs.txt`
- [X] T005 效能基準（diff-check §4 步驟 2、research R11）：`node specs/006-eslint-scope/tools/perf.js .`（3 次中位數）與 golden fixture 各 case（`tests/golden/fixtures/`）的 CLI 時間寫入 `specs/005-summary-analysis/perf.md`（機器、Node 版本、數值、中位數；標為 develop 基準）
- [X] T006 [P] 撰寫自我測試 `specs/005-summary-analysis/tools/diffcheck.test.js`（先行；node `assert`，不進 `npm test`）：`finallyExit_*` → `finallyExit` 正規化；`matching` 單位（`*.matching.json` 屬新增檔，只核 `format` 欄）；七類觸發（`§18` use 端為 entry；`連結` 以基準 `.hierarchy.dot` 判定未連結的 D2 呼叫點；`finally` 有 finalizer〔不論空否〕＋行範圍；`例外IN` 消失 pair 的 def 節點有 exception 出邊、新增 pair 依基準攤平圖 `.graph.dot` 判定〔def 可達帶 exception 出邊的 n、n 的例外目標可達 use；analyze Q2〕；`Q-a` def 行為 call 點且非 intra-procedural〔±〕；`摘要`；`保守摘要` 頁面有對 generator／async 函式的呼叫敘述〔analyze Q3〕）；`例外IN` 新增 pair 的自我測試案例含 c-out3 型（`probes/c-out3.js`）與跨函式型（`probes/us3-3.js`）；新增 pair 只能歸 `連結`／`finally`／`例外IN`／`Q-a`／`保守摘要`，否則失敗；釘選筆數不符失敗；`--verify` 多列／少列失敗；`golden-diff.md` 檔頭未填基準且無 `--base` 時結束碼 2
- [X] T007 實作 `specs/005-summary-analysis/tools/diffcheck.js`（contracts/diff-check.md §1–§5）：`require('../../006-eslint-scope/tools/diffcheck.js')` 重用解析、multiset、報表與 verify 骨架（缺匯出時只在 `specs/006-eslint-scope/tools/diffcheck.js` 新增 `module.exports` 項目，不改行為）；替換類別判準；golden 基準讀 `golden-diff.md` 檔頭（`9e324be`）；MDN 基準 `specs/005-summary-analysis/mdn/baseline-develop/`、語料 `specs/006-eslint-scope/mdn/corpus/`。`node specs/005-summary-analysis/tools/diffcheck.test.js` 通過、lint 無錯
- [X] T008 建立 `specs/005-summary-analysis/golden-diff.md` 骨架（contracts/diff-check.md §3）：檔頭基準行（寫死 `9e324be`）、行號說明；機器區塊「淨差異（相對 develop）」「釘選與簽核」（初始空表）；敘述節 Foundational、US5、US6、US1、US3、US4、US2 各含「變化說明」「雜湊變化表」「單元測試期望」表頭；末節「驗收預期更正」（初始「無」）
- [X] T009 Setup 閘門：`diffcheck.js golden --report`、`diffcheck.js mdn --report` 皆「無差異」；`diffcheck.test.js` 通過；`npm test` 1273 passing、lint 0 錯誤；`git -C <專案根> status --short lib bin tests/golden` 無輸出。回報「可提交為 Setup commit」（probes 複本、MDN 快照、perf 基準、diffcheck 同一 commit，由 orchestrator 執行）

**Checkpoint**: develop 基準已鎖定；之後才可改 `lib/`。

---

## Phase 2: Foundational（新求解器＋FR-014；阻擋所有 user story）

**Purpose**: research R2——新增邊型別感知求解器 `reachingsolver` 並由 `doAnalysis` 改用；exception 邊帶 `IN(p)`（FR-014）同時生效。此階段**不啟用摘要**：return 邊與處理器 exit → LOOP RETURN 邊照舊貢獻 OUT、callReturn 的 bypass 合併照舊；另加過渡規則（analyze Q1 → A）：指向被呼叫端 exit（有 return 出邊之 exit）的 exception 邊仍帶 OUT（US1 刪除）。預期 golden 零差異（至多 `例外IN` 一類），單元測試只翻轉 `catchclause.js` 的 catch-edge 一筆。

**Independent Test**: `npx mocha tests/dujs/reachingsolver.js` 全過；golden `--verify` 通過且淨差異為空（至多 `例外IN`）。

### 測試（先寫，須先失敗）

- [X] T010 [P] 新增 `tests/dujs/reachingsolver.js`（contracts/lib-api.md §2、research R2）：以手建 FlowNode 小圖驗邊貢獻表——normal／true／false／call／onEvent／load／save 帶 `OUT(p)`；exception 帶 `IN(p)`；未給 `options.calls`／`options.loops` 時 return 邊與處理器 exit → LOOP RETURN 邊帶 `OUT(p)`（相容模式）；過渡規則開啟時，指向被呼叫端 exit（有 return 出邊之 exit）的 exception 邊帶 `OUT(p)`、其他 exception 邊仍帶 `IN(p)`；`OUT = (IN − KILL) ∪ GEN`（沿用 `computeKILLSet`，含 entry 殺不可見、exit 殺區域）；`entryInput`；`solve` 為純函式（不寫入節點的 `reachIns`／`reachOuts`）；回傳 `exitArrivals.normal`／`exitArrivals.exceptional` 依最後一條邊型別分開
- [X] T011 在 `tests/dujs/reachingsolver.js` 加 FR-014 整合案例（讀 `tests/dujs/cases/probes005/c-out3.js`，頁面 intra-procedural 與 intra-page）：有 `x: L1 -> L6`、沒有 `x: L4 -> L6`（US6-7 的正式驗收於 T034 `finallyflow.js`）
- [X] T012 執行 `npx mocha tests/dujs/reachingsolver.js` 確認新測試失敗（red）

### 實作

- [X] T013 新增 `lib/dujs/reachingsolver.js`（MIT，ES5）：`solve(graph, options)`，`options = {entryInput, generateOf, useOf, calls, loops, summaryOf, flatVarDefOf, extraReachIns, exceptionToCalleeExitCarriesOut}`（data-model §6、contracts/lib-api.md §2）；worklist 依邊型別合併貢獻（research R2 表）；exception 帶 IN；KILL 用 `defuseanalyzer` 的 `computeKILLSet`（必要時由 `lib/dujs/defuseanalyzer.js` 匯出供共用）；未給 `calls`／`loops` 時 return 與處理器 exit → LOOP RETURN 帶 OUT（相容模式，US1／US4 才關閉）；過渡規則 `exceptionToCalleeExitCarriesOut`（analyze Q1）：指向被呼叫端 exit（有 return 出邊之 exit）的 exception 邊帶 OUT，Foundational 由 `doAnalysis` 開啟、US1 刪除（T054）；回傳 `{results: Map(node → {in, out, generate, kill}), exitArrivals: {normal, exceptional}}`
- [X] T014 `lib/dujs/defuseanalyzer.js`：`doAnalysis` 改呼叫 `reachingsolver.solve`，callReturn 的 `bypassFilter` 合併以 `extraReachIns` 傳入（行為照舊；`extraReachIns` 必須是動態回呼，依迭代中當下的 `OUT(callNode)` 計算，callNode 的 OUT 變動時 callReturn 重新入列，不得在求解前算一次的靜態集合）；開啟過渡規則；把結果寫回 `reachIns`／`reachOuts`／`kill` 並 `model.setAnalysisResults`（API 不變）；不再 require `lib/analyses`（該目錄不修改）
- [X] T015 `npx mocha tests/dujs/reachingsolver.js` 全過；跑 `npx mocha "tests/dujs/*.js" "tests/esgraph/*.js"`，預期只翻轉 `tests/dujs/catchclause.js` 的 catch-edge 一筆（should read nothing at a catch without parameter and give var e = 4 to the catch parameter），依 FR-014 改期望並記入 `golden-diff.md` Foundational「單元測試期望」；其他既有測試失敗即先查過渡規則是否生效（Fable 原型未加過渡規則時翻轉 26 個），無法歸因停下回報
- [X] T016 執行 `node specs/005-summary-analysis/probes/run.js specs/005-summary-analysis/probes/c-out3.js`，確認 P24 改為預期；其他 probes 與 spec「探測結果」表的差異只能來自 FR-014（列於回報）
- [X] T017 確認 `git -C <專案根> diff --exit-code 9e324be -- lib/analyses` 無輸出
- [X] T018 執行 `npm run lint`，`lib/dujs/reachingsolver.js` 不加抑制
- [X] T019 Golden 更新（序列化，Foundational；依「全程規則」步驟 1–5）：預期零差異（至多 `例外IN` 類）；寫入 `specs/005-summary-analysis/golden-diff.md` Foundational 節與 `tests/golden/manifest.json`；orchestrator 親自重跑 `--verify` 通過後才 commit
- [X] T020 Foundational 閘門：閘門全過；淨差異表為空或只有 `例外IN`（其他類別出現即視為回歸；預期零差異，有 `例外IN` 列時於回報說明）。回報可提交

**Checkpoint**: 所有模型由 `reachingsolver` 計算、例外邊帶 IN；之後依序 US5 → US6 → US1 → US3 → US4 → US2（golden 寫入須依序）。

---

## Phase 3: User Story 5 - 函式的 entry 節點不讀取本體中的變數 (Priority: P1)

**Goal**: ENTRY／EXIT 節點不含本體 use（FR-008、research R7）；移除 006 暫行的 `isOnFunctionChain`。

**Independent Test**: `npx mocha tests/dujs/entryuse.js` 通過（US5-1…3）；P8、P9 不再拋錯。

### 測試（先寫，須先失敗）

- [X] T021 [P] [US5] 新增 `tests/dujs/entryuse.js`：US5-1（`probes005/p8.js`：`f` 的 entry 節點 `cuse`、`puse` 皆空；`x`、`a`、`o`、`b` 的讀取在各自敘述節點）；US5-2（`p9.js`：分析不拋錯；p-use 在 L7 的 `case` 節點：有 `x: L1 -> L7>L8:T`、`x: L1 -> L7>L10:F`〔analyze Q4〕；無以 `entry` 為 use 端的 `x` pair）；US5-3（`p2.js`：無 `x: L3 -> entry`、`x: L11 -> entry`；`probes004/cyc-3.js`：無 `t: L4 -> entry`、`p: entry -> entry`）；另斷言參數預設值的讀取仍在合成的參數初始化節點、不在 entry
- [X] T022 [P] [US5] 改既有測試：US5 會翻轉約 14 檔 58 個既有測試（`tests/dujs/` 的 branchsplit、bypass、callcycles、classfields、expansion、hierarchy、methodcalls、modelbuilder、newcallsite、paramdefaults、paramsandnew、reviewfixes、scopeguards、usedexpressions），清單以實跑失敗為準；**只允許刪除 use 端為 entry 的期望**（`usedexpressions.js` 的 ENTRY／EXIT used expressions 改為 `[]` 屬之），其他改動停下回報；移除 `tests/dujs/scopebinding.js` 的 `isOnFunctionChain` 測試。以檔為單位記入 `golden-diff.md` US5「單元測試期望」
- [X] T023 [US5] 執行 `npx mocha tests/dujs/entryuse.js tests/dujs/usedexpressions.js` 確認失敗（red）

### 實作

- [X] T024 [US5] `lib/dujs/usedexpressions.js`：`usedExpressionsOf` 對 ENTRY／EXIT 節點回傳 `[]`（與 `modelbuilder.expressionsEvaluatedAtNode` 一致）
- [X] T025 [US5] `lib/dujs/defuseanalyzer.js`：`findUSESet` 移除 `isEntryNode` 分支與 `binding.isOnFunctionChain` 的使用
- [X] T026 [US5] `lib/dujs/scopebinding.js`：移除 `isOnFunctionChain`；`tests/dujs/scopesource.js` 白名單若列有它則同步移除並記入「單元測試期望」；`grep -rn isOnFunctionChain lib tests` 無輸出
- [X] T027 [US5] `npx mocha tests/dujs/entryuse.js tests/dujs/usedexpressions.js tests/dujs/scopebinding.js` 全過；`run.js` 對 p8、p9 不拋錯
- [X] T028 [US5] Golden 更新（序列化，US5；依「全程規則」步驟 1–5）：預期 `§18` 類（use 端為 `entry` 的 pair 消失）；寫入 `golden-diff.md` US5 節與 `tests/golden/manifest.json`；orchestrator 親自重跑 `--verify` 通過後才 commit
- [X] T029 [US5] US5 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；回報可提交

**Checkpoint**: US5 獨立可驗（entry 不讀本體、P8／P9 不拋錯）。

---

## Phase 4: User Story 6 - `try`／`finally` 與例外路徑的控制流程正確 (Priority: P2)

**Goal**: esgraph 的 `finally` 整族（FR-013、research R6、data-model §7–§8、plan Q2）；`.dot` 繪出 `finallyExit` 節點與 `finally` 邊。

**Independent Test**: `npx mocha tests/esgraph/finally.js tests/dujs/finallyflow.js` 通過（US6-1…7）。

### 測試（先寫，須先失敗）

- [X] T030 [P] [US6] 新增 `tests/esgraph/finally.js`（data-model §8 每列一例，§TR-7 組合）：try 拋錯 × 有／無 catch × 空／非空 finally；catch 本體拋錯 → finally 入口；`return`／`break`／`continue` 跨出 try（含 catch）經 finally 再到原目標、巢狀兩層 finally 依序串接；只由正常完成進入的 finally 不建 `finallyExit`；`finallyExit` 的 normal／exception／`finally` 出邊；finally 內自己的跳躍／拋錯覆寫待續動作；同一 finally 同時有正常與例外進入（續行取聯集；golden `parseSaved` 型）；`return`／`break` 的目標在巢狀函式邊界之外時不被外層函式的 finally 攔截；頁面層與函式內各一；空 finally（`finally {}`、`finally { ; }`）視同無 finally（P18 的 `r: L9 -> L14` 來源）；esgraph `allNodes` 含 `finallyExit`；`lib/esgraph/dot.js` 輸出含 `finallyExit` 節點（以型別為標籤、橢圓）與 `label="finally"` 的邊
- [X] T031 [P] [US6] 在 `tests/esgraph/flownodetest.js`、`tests/esgraph/flownodefactory.js` 加：`FlowNode.FINALLY_EXIT_NODE_TYPE === 'finallyExit'`、`FINALLY_CONNECTION_TYPE === 'finally'` 屬 `CONNECTION_TYPES` 與 `MULTI_CONNECTION_TYPE`、`FlowNode.copyNodes` 保留 `finally` 多目標邊、factory 建 `finallyExit` 節點（無 astNode、`line` 為 finally 區塊結尾行）
- [X] T032 [P] [US6] 在 `tests/dujs/reachingsolver.js` 加 `finally` 邊帶 `OUT(p)`、`finallyExit` → exit 的 exception 邊屬 `exitArrivals.exceptional`、`finally` 邊屬 `exitArrivals.normal`
- [X] T033 [P] [US6] 在 `tests/dujs/expansion.js` 加：`replayLoop` 改接頁面 exit 前驅時處理 `finally` 多目標邊（頁面層 labeled break 跳到程式結尾）
- [X] T034 [P] [US6] 新增 `tests/dujs/finallyflow.js`（讀 `probes005/`）：US6-1 `c-fin1.js`（有 `r: L4 -> L14`、`r: L4 -> L16`；無 `r: L9 -> L14`、`r: L9 -> L16`）；US6-2 `c-fin3.js`（有 `r: L7 -> L16`、`r: L7 -> L18`）；US6-3 `c-fin4.js`（無以 L8 為 use 端的 `r` pair）；US6-4 `c-m4h.js` intra-page（有 `r: L13 -> L3`）；US6-5 `c-fin2.js`（有 `r: L7 -> L11`、無 `r: L4 -> L11`）；US6-6 `c-fin5-break.js`（有 `r: L7 -> L10`、無 `r: L4 -> L10`）與 `c-fin6-continue.js`（有 `r: L9 -> L12`、無 `r: L6 -> L12`）；US6-7 `c-out3.js`（有 `x: L1 -> L6`、無 `x: L4 -> L6`；Foundational 已成立，於回報列出）。未指明模型者對 inter-procedural（若有）與 intra-page 都斷言
- [X] T035 [US6] 執行 `npx mocha tests/esgraph/finally.js tests/esgraph/flownodetest.js tests/esgraph/flownodefactory.js tests/dujs/finallyflow.js` 確認失敗（red；US6-2、US6-7 等守門可能已通過，列於回報）

### 實作

- [X] T036 [P] [US6] `lib/esgraph/flownode.js`：新增 `FINALLY_EXIT_NODE_TYPE`、`FINALLY_CONNECTION_TYPE`（加入 `CONNECTION_TYPES`、`MULTI_CONNECTION_TYPE`）；確認 `copyNodes` 與多目標邊處理納入新型別
- [X] T037 [P] [US6] `lib/esgraph/flownodefactory.js`：新增建立 `finallyExit` 節點的 factory 方法
- [X] T038 [US6] `lib/esgraph/index.js`（LGPL，檔頭 Modified 清單加「route catch throws, jumps and exceptional completion through non-empty finally blocks」）：非空 finally 判定 `getEntry(finalizer) !== getSuccessor(try)`；catch 本體在 `catchStack` 推入 finally 入口後走訪；`ReturnStatement`、`getEntry(Break/Continue)` 跨出 try 時接第一個非空 finally 入口並登記待續目標；非單純正常進入時建 `finallyExit` 並改接 finally 末端；`allNodes` 走訪加入 `finally` 型別；在 branch splitting 之前插入（research R6）
- [X] T039 [US6] `lib/esgraph/dot.js`（LGPL，檔頭 Modified 清單加一行）：繪出 `finallyExit` 節點（型別為標籤、橢圓）與 `finally` 邊（`label="finally"`）
- [X] T040 [US6] `lib/dujs/expansion.js`：`outgoingEdges`／`replayLoop` 納入 `finally` 型別；`lib/dujs/reachingsolver.js` 確認 `finally` 邊帶 OUT、arrival 分類（T032）；確認 `git -C <專案根> diff --exit-code 9e324be -- lib/esgraph/branchsplitter.js lib/esgraph/astrewriter.js lib/esgraph/decisionfinder.js` 無輸出（泛用處理新型別，不改程式）
- [X] T041 [US6] `npx mocha tests/esgraph/finally.js tests/dujs/finallyflow.js tests/dujs/reachingsolver.js tests/dujs/expansion.js` 全過；`run.js` 對 c-fin1…6、c-m4h、m3 輸出符合 spec P17–P23 修正後預期
- [X] T042 [US6] Golden 更新（序列化，US6；依「全程規則」步驟 1–5）：預期 `finally` 類（`expected/` page0 `parseSaved` 的 `finallyExit` 節點、`finally` 邊與相關 pair；`.dot` 新節點型別依 plan Q2）；寫入 `golden-diff.md` US6 節與 `tests/golden/manifest.json`；orchestrator 親自重跑 `--verify` 通過後才 commit
- [X] T043 [US6] US6 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；`git -C <專案根> diff 9e324be -- lib/esgraph/index.js lib/esgraph/dot.js` 的檔頭各有一行 Modified 紀錄；回報可提交

**Checkpoint**: US6 獨立可驗（`finally` 整族與例外帶 IN）。

---

## Phase 5: User Story 1 - 同一函式被多處呼叫時，只報可實現的 pair (Priority: P1) 🎯 MVP

**Goal**: 摘要（R1、R3、R13）、`expandShallow`、CallSiteRecord、`flatVarDefOf`、Q-a、callReturn 改吃 `apply(摘要, OUT(callNode))`、`*.matching.json`（FR-010）。

**Independent Test**: `npx mocha tests/dujs/summary.js tests/dujs/summaryanalysis.js tests/dujs/matching.js` 通過（US1-1…6、8；US1-7 依賴 D2 自身遞迴連結，於 US2 T083 驗收）。

### 測試（先寫，須先失敗）

- [X] T044 [P] [US1] 新增 `tests/dujs/summary.js`（contracts/lib-api.md §1、data-model §1–§3）：哨兵 must-KILL（一條分支定義 → 不在 mustKill；每條正常路徑定義 → 在）；`gen` 只含正常抵達 exit 的定義；`upwardExposed` 對所有路徑、含巢狀呼叫的被呼叫端 upwardExposed；SCC 自身／互相遞迴的不動點與「從無正常返回（⊥）起算」（無條件遞迴 `normalReturn === false`；遞迴案例用 class 方法 `this.m()`〔已在 004 連結，如 `c-cyc3-cond.js`、`probes004/cyc-3.js`〕，不用函式宣告的自身遞迴——後者需 D2，屬 US2）；可見性過濾（被呼叫端自己的變數、參數、block 變數不出現）；`conservative`（generator、async：`normalReturn` 恆 true、`mustKill` 空、`gen` 合併正常與例外抵達）；`apply`／`applyExceptional` 回傳新 Set、不改輸入，`normalReturn=false` 時 `apply` 為 ∅；`summaryOf` 未計算時拋錯；`computeForPage` 重複呼叫為 no-op；`reset()`；任何模型的 `reachIns`／pair 不含 `Def.SENTINEL_TYPE`；摘要計算不寫入任何 FlowNode／Model
- [X] T045 [P] [US1] 新增 `tests/dujs/summaryanalysis.js`（讀 `probes005/`）：US1-1 `p1.js`（`x` 的 pair 恰為 `x: L1 -> L5`、`x: L6 -> L8`）；US1-2 `p2.js`（有 `x: L3 -> L6`、`x: L11 -> L6`、`x: L3 -> L10`、`x: L11 -> L13`；無 `x: L11 -> L10`、`x: L3 -> L13`、無 L1 的 `x` 到 L6／L10／L13）；US1-3 內嵌程式（有 `x: L1 -> L8`、`x: L4 -> L8`）；US1-4（plan Q1）`c-cyc3-cond.js` 有 `t: L4 -> L8` 且分析終止，`probes004/cyc-3.js` 無以 L6 為 use 端的 pair 且分析終止；US1-6 `g5-mdn-person-field.js`（有 `count: L1 -> L3`、`count: L1 -> L5`、`count: L5 -> L10`；無 `count: L1 -> L10`）；US1-8 `c-gen.js`（有 `x: L1 -> L6`、`x: L3 -> L6`）、`c-asy.js`（有 `x: L1 -> L8`、`x: L5 -> L8`）且其 Summary `conservative === true`。未指明模型者對 inter-procedural 與 intra-page 都斷言
- [X] T046 [P] [US1] 新增 `tests/dujs/matching.js`（contracts/matching-output.md §4）：US1-5——`p1.js` 的 `model.callBypassOf` 為 CallSiteRecord（data-model §4 欄位），兩條 `f` exit → callReturn 的 return 邊各對應 L4、L7 的 call 紀錄；以 CLI（輸出到 scratchpad）產出的 `page0/intra-pages/0.matching.json` 符合 `format: "dujs-matching/1"`、`calls` 兩筆、節點名與 `.graph.dot` 的 `n<k>` 一致、鍵順序固定；`us3-3.js` 中 `s` 的 call 紀錄 `exceptionalReturn` 為 L9 catch 節點、不是 L8 的 callReturn；自我一致：每條 return 邊恰對應一筆 call 紀錄的（exit, callReturn）；intra-procedural 模型不輸出 matching；`.dot` 與 develop 相比只有 Q-a 的例外邊位置變化
- [X] T047 [P] [US1] 改／加既有單元測試：`tests/dujs/expansion.js`（Q-a：非決策前的呼叫例外邊留在 callSite、決策前呼叫維持現況；`expand` 回傳 `calls`、`flatVarDefOf`；`expandShallow` 不含被呼叫端節點、GEN 沿用 original VarDef、不消耗 `hierarchy.nextSeq()`）；`tests/dujs/model.js`（`callBypassOf` 值為 CallSiteRecord、`setFlatVarDefOf`／`flatVarDefOf`）；`tests/dujs/modelbuilder.js`（`callModelOf`）；`tests/dujs/def.js`、`tests/dujs/deffactory.js`（`Def.SENTINEL_TYPE`、`createSentinelDef`）；`tests/dujs/bypass.js`（callReturn 改由摘要、`_bypassFilter` 單元測試維持）；`tests/dujs/cfggraphconverter.js`（`dotNodeIds`）；`tests/dujs/callcycles.js`（:197 cyc-3 should keep t: L4 -> L6 over a recursive call、:237 cyc-uncond 無條件遞迴案例）。清單以實跑失敗為準，逐筆記入 `golden-diff.md` US1「單元測試期望」；因被呼叫端例外 pair 暫失（US3 才由 `exceptionalReturn` 恢復）而暫改的期望，在該表與測試註解標「US3 還原」
- [X] T048 [US1] 執行 `npx mocha tests/dujs/summary.js tests/dujs/summaryanalysis.js tests/dujs/matching.js` 確認失敗（red；US1-3、US1-6 守門可能已通過，列於回報）

### 實作

- [X] T049 [P] [US1] `lib/dujs/def.js`、`lib/dujs/deffactory.js`：新增 `Def.SENTINEL_TYPE` 與 `createSentinelDef`（data-model §2：`fromNode` 為摘要圖 entry copy、range `[0, 0]`）
- [X] T050 [US1] `lib/dujs/expansion.js`：`replayCall` 非決策前的呼叫只搬非例外邊到 callReturn（Q-a）；`expand` 回傳 `calls`（CallSiteRecord：callNode、callReturn、calleeScope、exceptionalReturn〔重播完成後串接首個 callSite 的例外目標〕、entry、exit、seq、back、beforeDecision、callSiteLine）與 `flatVarDefOf`（外露 `rebuildGenerateSets` 的 map）；新增 `expandShallow(model)`（重用 `replayCall`，讀既有 hierarchy edges、不新建 edge；沒有呼叫的 scope 回傳 intra-procedural 節點 copy）
- [X] T051 [P] [US1] `lib/dujs/model.js`：`setCallBypasses`／`callBypassOf` 值改 CallSiteRecord；新增 `setFlatVarDefOf`／`flatVarDefOf`
- [X] T052 [US1] `lib/dujs/modelbuilder.js`：記錄 `callModelOf(scope)`（第一個建出的模型）；`setFlatGraphFromHierarchy` 存 calls 與 flatVarDefOf
- [X] T053 [US1] 新增 `lib/dujs/summary.js`（MIT）：`computeForPage(scopeTree)`（`callModelOf` 建 scope 呼叫圖、Tarjan SCC 反拓撲序、SCC 內從 ⊥ 反覆至不變、上限 1000 輪超過拋 `Error('summary fixpoint did not converge: <scopes>')`；摘要圖＝`expandShallow`；entry IN 為相關變數的哨兵；以 `reachingsolver.solve` 求 normalReturn、gen、mustKill、upwardExposed；generator／async 標 `conservative`〔R13〕；`exceptional` 欄位先建立為空集合，US3 填入）、`summaryOf`、`apply`、`applyExceptional`、`reset`；以 `WeakMap(scopeTree)` 存放
- [X] T054 [US1] `lib/dujs/reachingsolver.js`：給 `options.calls` 時 return 邊不貢獻，`callReturn` 得 `apply(summaryOf(callee), OUT(callNode))`，摘要 VarDef 經 `flatVarDefOf` 對到本圖（找不到對應時拋錯）；callNode 改變時 callReturn 重新入列；**刪除 Foundational 的過渡規則** `exceptionToCalleeExitCarriesOut`（analyze Q1）與 `doAnalysis` 對它的開啟，`tests/dujs/reachingsolver.js` 的對應案例同步移除，記入 `golden-diff.md` US1 節「變化說明」與「單元測試期望」
- [X] T055 [US1] `lib/dujs/defuseanalyzer.js`：upper 模型的 `doAnalysis` 傳入 calls 與 `summary.summaryOf`；移除 callReturn 的 `bypassFilter` 合併（`_bypassFilter` 保留為摘要可見性過濾的實作）
- [X] T056 [US1] `lib/dujs/defuseanalysisexecutor.js`：`buildInterProceduralModelsOfEachPageModels` 在 `buildInterProceduralModels()` 後、分析前呼叫 `summary.computeForPage`；`tests/helpers/analyze.js` 的 `reset` 加 `summary.reset()`
- [X] T057 [P] [US1] `lib/dujs/cfggraphconverter.js`：新增 `dotNodeIds(model)`（`k = graph[2][0].cfgId + 陣列索引`），`toDot*` 改用之（輸出不變）
- [X] T058 [US1] `lib/dujs/outputwriter.js`：每個 inter-procedural、intra-page、inter-page 模型另寫 `<index>.matching.json`（contracts/matching-output.md §1–§2：UTF-8、2 空白縮排、鍵順序固定、陣列依 seq／節點名排序、`summaries` 只列本圖涉及者；`loops` 先輸出空陣列，US4 填入）；不產 png；`matching.json` 輸出用到的 scope／變數名稱 API 需在 `tests/dujs/scopesource.js` 的 `S5_ALLOWED` 補列，並同步 `specs/006-eslint-scope` 的 static-check 表（implementer 回報，由 orchestrator 核對並改 specs）
- [X] T059 [US1] `tests/golden/golden.js`：檔案清單納入 `*.matching.json`（比對與 manifest `added` 登記）
- [X] T060 [US1] `npx mocha tests/dujs/summary.js tests/dujs/summaryanalysis.js tests/dujs/matching.js tests/dujs/expansion.js tests/dujs/model.js tests/dujs/bypass.js` 全過；`run.js` 對 p1、p2、c-gen、c-asy、c-cyc3-cond 符合 spec 預期（c-noret 屬 US2，T089）
- [X] T061 [US1] 確認 `.dupairs.dot` 與輸出檔無哨兵（`grep -rn SENTINEL` 於 scratchpad 的 CLI 輸出無結果）
- [X] T062 [US1] Golden 更新（序列化，US1；依「全程規則」步驟 1–5）：預期 `摘要`、`Q-a` 類與 `matching` 新檔（manifest `added`）；被呼叫端例外定義暫時經 return 邊消失者照實歸類並在說明欄標「US3 還原」；過渡規則刪除記入 US1 節；寫入 `golden-diff.md` US1 節；orchestrator 親自重跑 `--verify` 通過後才 commit
- [X] T063 [US1] US1 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；回報可提交

**Checkpoint**: US1 獨立可驗（多處呼叫只報可實現 pair、配對資訊輸出）。

---

## Phase 6: User Story 3 - 例外離開不算返回呼叫端 (Priority: P2)

**Goal**: 摘要第四項 `exceptional`、`exceptionalReturn` 虛擬貢獻 `applyExceptional`、例外沿呼叫鏈往外（FR-006、research R5）。

**Independent Test**: `npx mocha tests/dujs/exceptionsummary.js` 通過（US3-1…4、6、7；US3-5 依賴 D2，於 US2 T085 加入）。

### 測試（先寫，須先失敗）

- [X] T064 [P] [US3] 新增 `tests/dujs/exceptionsummary.js`（讀 `probes005/`）：US3-1 `p4.js`（有 `x: L4 -> L7`、無 `x: L1 -> L7`）；US3-2 `m1-mdn-error-objects.js`（有 `state: L1 -> L13`、`state: L1 -> L15`、`state: L7 -> L15`、`e: L11 -> L12`；無 `state: L7 -> L13`），另以 `g2-try-catch.js` 對照同結論；US3-3 `us3-3.js`（有 `x: L3 -> L10`、`x: L1 -> L10`；無 `x: L5 -> L10`）；US3-4 `m2-mdn-finally.js`（有 `opened: L3 -> L16`、`opened: L9 -> L22`；無 `opened: L1 -> L16`、`opened: L1 -> L22`）；US3-6 `m3-mdn-finally-return.js`（有 `r: L10 -> L16`、`r: L10 -> L18`）；US3-7 `c-nt.js`（有 `x: L6 -> L9`）
- [X] T065 [P] [US3] 在 `tests/dujs/summary.js` 加：`exceptional`＝例外抵達 exit 的定義（例外邊帶 IN、不做 KILL）∪ 呼叫紀錄 `exceptionalReturn` 為 exit 者的 `applyExceptional`（沿呼叫鏈往外）；`finallyExit` 重拋屬例外抵達；可見性過濾
- [X] T066 [P] [US3] 在 `tests/dujs/reachingsolver.js` 加：`exceptionalReturn` 得 `applyExceptional(S, OUT(callNode))`、`exceptionalReturn` 為 null 時不貢獻、callNode 改變時重新入列
- [X] T067 [US3] 執行 `npx mocha tests/dujs/exceptionsummary.js tests/dujs/summary.js tests/dujs/reachingsolver.js` 確認失敗（red；US3-4、US3-7 守門可能已通過，列於回報）

### 實作

- [X] T068 [US3] `lib/dujs/summary.js`：計算 `exceptional`（`exitArrivals.exceptional` 的非哨兵 VarDef ∪ 以 exit 為 `exceptionalReturn` 的呼叫紀錄貢獻），`conservative` 的 gen 合併照 R13
- [X] T069 [US3] `lib/dujs/reachingsolver.js`：CallSiteRecord 的 `exceptionalReturn` 虛擬貢獻 `applyExceptional(summaryOf(callee), OUT(callNode))`（經 `flatVarDefOf`）；`lib/dujs/outputwriter.js` 的 `summaries` 輸出 `exceptional`
- [X] T070 [US3] `npx mocha tests/dujs/exceptionsummary.js tests/dujs/summary.js tests/dujs/reachingsolver.js tests/dujs/matching.js` 全過；`run.js` 對 p4、m1、us3-3、m2、m3、c-nt 符合 spec 預期；還原 T047、T062 標「US3 還原」的暫改期望，並核對 `grep -rn "US3 還原" tests` 無殘留
- [X] T071 [US3] Golden 更新（序列化，US3；依「全程規則」步驟 1–5）：預期 US1 階段暫時消失的例外路徑 pair 恢復、`摘要` 類（例外不返回）；寫入 `golden-diff.md` US3 節，列出與 US1「US3 還原」各列（golden 與單元測試期望）的沖銷並核對無殘留；orchestrator 親自重跑 `--verify` 通過後才 commit
- [X] T072 [US3] US3 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；回報可提交

**Checkpoint**: US3 獨立可驗（例外不返回呼叫之後、例外定義流向 catch／finally）。

---

## Phase 7: User Story 4 - 事件處理器的進入與返回也要配對 (Priority: P2)

**Goal**: LoopRecord、LOOP RETURN 虛擬貢獻 `OUT(LOOP) ∪ ⋃_h (gen_h ∪ exceptional_h)`、處理器 exit → LOOP RETURN 不貢獻（FR-007、research R4）。

**Independent Test**: `npx mocha tests/dujs/loopmatching.js` 通過（US4-1…3）。

### 測試（先寫，須先失敗）

- [X] T073 [P] [US4] 新增 `tests/dujs/loopmatching.js`（intra-page，讀 `probes005/`）：US4-1 `p5-loop-pair.js`（有 `x: L1 -> L6`、無 `x: L7 -> L6`；`model.loopRecords()` 與 CLI 的 `0.matching.json` `loops` 紀錄與 L5 的 call 紀錄分開，contracts/matching-output.md §4）；US4-2 `p6.js`（有 `x: L9 -> L11`、無 `x: L5 -> L11`；守門，US2 後須仍成立）；US4-3 `c-h12.js`（有 `x: L1 -> L6`、`x: L3 -> L6`）；處理器的 GEN 經 LOOP 流向自己（內嵌：處理器先讀後寫同一變數，斷言該處理器的寫入到下一次觸發時的讀取有 pair）；自我一致：每條處理器 exit → LOOP RETURN 邊對應 LoopRecord 的一個處理器
- [X] T074 [P] [US4] 在 `tests/dujs/reachingsolver.js` 加 LoopRecord 列：LOOP RETURN 得 `OUT(LOOP) ∪ ⋃_h (gen_h ∪ exceptional_h)`（不套 must-KILL）、處理器 exit → LOOP RETURN 不貢獻、無處理器時只有 `OUT(LOOP)`
- [X] T075 [P] [US4] 在 `tests/dujs/expansion.js`、`tests/dujs/model.js` 加 LoopRecord（`{loop, loopReturn, handlers: [{scope, entry, exit}], noHandler}`）與 `setLoopRecords`／`loopRecords`
- [X] T076 [US4] 執行 `npx mocha tests/dujs/loopmatching.js tests/dujs/reachingsolver.js` 確認失敗（red；US4-2、US4-3 守門可能已通過，列於回報）

### 實作

- [X] T077 [US4] `lib/dujs/expansion.js`：`expand` 依 `loop`／`loopReturn`／`event` 重播回傳 `loops`（LoopRecord）；`lib/dujs/model.js` 新增 `setLoopRecords`／`loopRecords`；`lib/dujs/modelbuilder.js` 的 `setFlatGraphFromHierarchy` 存 loops
- [X] T078 [US4] `lib/dujs/reachingsolver.js`：給 `options.loops` 時 LOOP RETURN 虛擬貢獻、處理器 exit → LOOP RETURN 不貢獻、LOOP 改變時 LOOP RETURN 重新入列；`lib/dujs/defuseanalyzer.js` 對 intra-page／inter-page 傳入 loops
- [X] T079 [US4] `lib/dujs/outputwriter.js`：`*.matching.json` 的 `loops` 依 LoopRecord 輸出（處理器 summaries 一併列入）
- [X] T080 [US4] `npx mocha tests/dujs/loopmatching.js tests/dujs/reachingsolver.js tests/dujs/expansion.js tests/dujs/matching.js` 全過；`run.js` 對 p5、p6、c-h12 符合 spec 預期
- [X] T081 [US4] Golden 更新（序列化，US4；依「全程規則」步驟 1–5）：預期 `摘要` 類（LOOP 不可實現路徑）與 `*.matching.json` 的 `loops` 變化；inter-page 的 pair 差異只允許已列類別，若出現 inter-page localStorage 的新增 pair，停下請使用者裁決；寫入 `golden-diff.md` US4 節；orchestrator 親自重跑 `--verify` 通過後才 commit
- [X] T082 [US4] US4 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；回報可提交

**Checkpoint**: US4 獨立可驗（LOOP 進入只返回 LOOP、直接呼叫只返回呼叫點）。

---

## Phase 8: User Story 2 - 函式內呼叫頁面層定義的函式 (Priority: P1)

**Goal**: D2 放寬（FR-005、research R8）：`scopebinding.isRelaxedCallee`＋`callresolver.resolveVariable`；自身／互相遞迴的不動點驗收。排在 US1、US3、US4 之後（plan「順序理由」）。

**Independent Test**: `npx mocha tests/dujs/relaxedcallee.js` 通過（US2-1…7、P30）；US3-5、US4-2 仍成立。

### 測試（先寫，須先失敗）

- [ ] T083 [P] [US2] 新增 `tests/dujs/relaxedcallee.js`（連結與否以 inter-procedural 模型的 `relatedScopes`／hierarchy call 邊斷言）：US2-1 `p3.js`（`f();` 連到 `f`、有 `x: L3 -> L8`、無 `x: L6 -> L8`）；US2-2 `us2-2-let.js` 與內嵌 `const f = () => { x = 7; };` 連結，內嵌 `var f = function () {...}`、兩筆定義（另有 `f = g;`）、函式內 `new f()` 不連結且 `x: L6 -> L8` 維持；US2-3 `p7.js`（分析終止；有 `n: L4 -> L9>L10:T`、`n: L10 -> L3>L4:T`、`n: L1 -> L15`、`n: L4 -> L15`、`n: L10 -> L15`）；US2-4 `g1-local-fn.js`（有 `x: L4 -> L8`、無 `x: L6 -> L8`）；US2-5 `p10-self-rec.js`（連結；有 `n: L4 -> L3>L4:T`、`n: L1 -> L9`、`n: L4 -> L9`）；US2-6 `p11-named-fe.js`（`fact();` 連結；同上三筆）；US2-7 `c-blk.js`（L9 `f();` 不連結；有 `x: L8 -> L10`）；US1-7 `c-noret.js`（無以 L7 為 use 端的 `x` pair；需 D2 自身遞迴連結，故於 US2 驗收）；限制 P30 `c-win.js`（characterization：斷言誤連發生，註明 README 限制）
- [ ] T084 [P] [US2] 在 `tests/dujs/scopebinding.js` 加 `isRelaxedCallee`：`function`（含 block 內宣告）、`let`、`const`、`namedExpressionName` 為 true；`var`、參數、catch 參數、class 為 false
- [ ] T085 [P] [US2] 在 `tests/dujs/exceptionsummary.js` 加 US3-5 `g4-chain-loop.js`（intra-page：L8 `s();` 連到 `s`；有 `x: L3 -> L12`、`x: L9 -> L12`、`x: L1 -> L12`）——US3 的驗收，因依賴 D2 連結於此撰寫
- [ ] T086 [US2] 執行 `npx mocha tests/dujs/relaxedcallee.js tests/dujs/scopebinding.js tests/dujs/exceptionsummary.js` 確認失敗（red；US2-4、US2-7 守門可能已通過，列於回報）

### 實作

- [ ] T087 [US2] `lib/dujs/scopebinding.js`：新增 `PageBinding.prototype.isRelaxedCallee(aVar)`（binding 種類 ∈ {`function`、`let`、`const`、`namedExpressionName`}）
- [ ] T088 [US2] `lib/dujs/callresolver.js`：`resolveVariable` 在到達定義為 0 筆時加 D2 放寬（`CallExpression`、呼叫點在函式內、`definitionsOnThePage` 恰 1 筆、`targetOfDefinition` 指向函式 scope、`binding.isRelaxedCallee`），呼叫端傳入運算式種類；`new` 不放寬；`tests/dujs/scopesource.js` 靜態守門（種類判定只在 scopebinding）通過；既有測試 `tests/dujs/newcallsite.js:451`（should not relax for a function declaration (H3)）、`tests/dujs/bypass.js:138`（byp-2）依 D2 改期望——清單以實跑失敗為準，逐筆記入 `golden-diff.md` US2「單元測試期望」
- [ ] T089 [US2] `npx mocha tests/dujs/relaxedcallee.js tests/dujs/scopebinding.js tests/dujs/exceptionsummary.js tests/dujs/loopmatching.js tests/dujs/summary.js tests/dujs/scopesource.js` 全過（US4-2 守門仍成立、遞迴不動點終止）；`run.js` 對 P3、P7、P10、P11、g4、c-blk、c-win、c-noret（US1-7）符合 spec 預期
- [ ] T090 [US2] Golden 更新（序列化，US2；依「全程規則」步驟 1–5）：預期 `連結` 類（`es2015` 的 `addTodo`、`interprocedural` 的 `scale`、`log`，research R8）與其衍生的 `摘要` 差異；寫入 `golden-diff.md` US2 節；orchestrator 親自重跑 `--verify` 通過後才 commit
- [ ] T091 [US2] US2 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；回報可提交

**Checkpoint**: US2 獨立可驗（函式內呼叫頁面函式、自身／互相遞迴連結並終止）；全部 story 完成。

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: inlining oracle、SC-002、MDN（SC-004、SC-005）、效能（SC-004）、文件（FR-012、FR-013、FR-014）、使用者簽核。

- [ ] T092 [P] 新增 `tests/dujs/inliningoracle.property.js`（fast-check，research R12）：產生只用全域變數、無遞迴、無 `try` 的小程式；把每個呼叫敘述以被呼叫端本體展開（`return` 改 labeled `break`），斷言原程式頁面 inter-procedural 模型 pair（以唯一標記比對）＝展開後頁面 intra-procedural 模型 pair
- [ ] T093 SC-002：`node specs/005-summary-analysis/probes/run.js` 對 P1–P11 與 KI §18 程式逐一核對 spec 預期；推導更正記入 `golden-diff.md`「驗收預期更正」
- [ ] T094 MDN 驗證（quickstart §5、SC-004、SC-005）：`node specs/005-summary-analysis/tools/diffcheck.js mdn --report > <scratchpad>/m.md`，確認 33 檔 CLI exit code 全 0、不拋錯；建立 `specs/005-summary-analysis/mdn-diff.md`（機器區塊「淨差異」「釘選與簽核」＋人工說明；消失 pair 歸 SC-005 原因、新增 pair 只屬 `連結`／`finally`／`例外IN`／`Q-a`／`保守摘要`；簽核欄只填「草擬，待簽核」）；`diffcheck.js mdn --verify specs/005-summary-analysis/mdn-diff.md` 結束碼 0
- [ ] T095 效能（SC-004、research R11）：`mkdir -p <scratchpad>/develop && git -C <專案根> archive 9e324be | tar -x -C <scratchpad>/develop`，該目錄 `npm ci`；同機同時段各跑 `node specs/006-eslint-scope/tools/perf.js <root>`（3 次中位數）與 golden fixture 各 case 的 CLI 時間；更新 `specs/005-summary-analysis/perf.md`（develop、本 branch、比值，門檻 ≤ 2.0；保留 Setup 基準）；超過門檻停下回報；完成後刪除 `<scratchpad>/develop`
- [ ] T096 [P] `docs/known-issues.md`（FR-012、FR-013、FR-014）：§18 標已修正；§22 (0) 註明函式內 `f()` 的放寬（D2）；§22 (4) 更正前提（`setItem` 不產生定義、localStorage 不分 key）並註明移到另開的儲存模型 feature；§16、§22 (3) 註明排入 007，§22 (1)、(5)、§23 排入 008；新增「`finally` 整族的控制流程」章節（P17–P23，標已修正）；新增「例外路徑只帶執行前定義」行為變更章節（FR-014）；generator／async 保守摘要；本輪新發現的問題（如 finally 多種進入方式的續行聯集、遞迴內層讀到外層定義，research R14）各立新節
- [ ] T097 [P] `README.md` 限制說明（FR-012）：D2 放寬（含自身遞迴、block 內函式宣告不在 block 外連結、`new F()` 不放寬）、D3 的例外語意（例外不返回呼叫之後、呼叫敘述只在呼叫前拋錯）、generator／async 保守摘要、`window.f = …` 誤連（P30）、`*.matching.json` 輸出與其路徑產生器語意、`finallyExit` 節點與 `finally` 邊
- [ ] T098 最終驗證：依 quickstart §1–§6 逐條執行（指令可用、預期相符）；`npm test && npm run lint` 全綠；`git -C <專案根> diff 9e324be -- eslint-suppressions.json` 無新增鍵、無 count 增加；`git -C <專案根> diff --exit-code 9e324be -- lib/analyses lib/esgraph/branchsplitter.js lib/esgraph/astrewriter.js lib/esgraph/decisionfinder.js lib/dujs/hierarchy.js lib/dujs/hierarchydot.js lib/dujs/scopetree.js lib/dujs/variableanalyzer.js lib/dujs/cli.js bin/dujs.js` 無輸出；`diffcheck.js golden --verify` 與 `mdn --verify` 結束碼 0。回報可提交
- [ ] T099 **Golden 使用者簽核閘門（orchestrator 執行，非 implementer）**：T098 後、PR 前，orchestrator 把 `golden-diff.md` 的「釘選與簽核」表（`摘要`、`連結`、`finally`、`保守摘要`、`例外IN` 新增 pair）交使用者簽核；同意後改簽核欄（簽核者、日期）、重跑 `diffcheck.js golden --verify` 結束碼 0 並 commit；不同意的列視為回歸，退回 implementer 修正
- [ ] T100 **MDN 使用者簽核閘門（orchestrator 執行，非 implementer）**：T094、T098 後，orchestrator 把 `mdn-diff.md` 的「釘選與簽核」表交使用者簽核；同意後改簽核欄、重跑 `diffcheck.js mdn --verify` 結束碼 0 並 commit；不同意的列退回修正。完成後建立 PR（目標 `develop`）
- [ ] T101 [P] 處理 Setup 審查延後的 diffcheck SHOULD-FIX（`specs/005-summary-analysis/tools/diffcheck.js`、`diffcheck.test.js`）：R3 graph `~` 不計入釘選表 ±；R4 消失 pair 的 例外IN `throwingLines` 以 `頁:行` 為鍵，不跨頁碰撞；R5 鏈式呼叫（`p.then(function () {…}).catch(g)`）的 callback 本體行不算呼叫點；各補自我測試。須在 T094（MDN 差異）與 T099（golden 簽核）之前完成
- [ ] T102 [P] US5 收尾的延後項：(a) `lib/dujs/defuseanalyzer.js` `findUSESet` 中巢狀 ForIn／ForOf／SwitchCase 規則與 `useNestedLoopHead`（US5 後可能為死碼）：以覆蓋率或探針確認是否可達，不可達則移除、可達則補測試（US5 審查 R1）；(b) `docs/known-issues.md` §18：更正「這些 use 在各自敘述節點也讀得到」——`case` 的 test、單獨識別字敘述在任何節點都不算讀取（既有建模；US5 驗收發現），隨 T096 一併處理；(c) `tests/dujs/summary.js` 的 `should not hold a variable defined before the nested callee reads it` 呼叫頁面函式 `g()`，在 US2 D2 之前未連結而空泛通過——US2 後確認它確實驗到行為，否則改寫（US1 第 3 批回報）；(d) US1 審查 SHOULD-FIX：`lib/dujs/summary.js` 的 `pages` 只當「已算過」旗標，改 WeakSet（R1）；`reachingsolver.js` 的 `applySummary` 與 `summary.apply` 兩份實作，加註須同步並補兩者結果相等的測試（R2）；`tests/dujs/matching.js` 的「callNode 保有 exception 邊」斷言只套鏈首 call，排除 callNode 為另一筆 call 之 callReturn 者（R3）；`defuseanalyzer.js` 的 `bypassFilter` 已無 lib 呼叫端，刪除或改測 `isVisibleToCallee`（R4）；(e) US3 審查 SHOULD-FIX：可達性補洞補模型層端到端測試——`try { if (h()) {…} } catch (e) { use(x) }`（審查實測 `x: L2 -> L6` 成立）與鏈式呼叫 `a().b()` 例外抵達 catch／exit（R1）；`reachingsolver.js` 的 `applyExceptionalSummary` 與 `summary.applyExceptional` 互註「語意須同步」或抽到無循環的共用模組（R2，與 (d) R2 併處理）；(f) US4 審查 SHOULD-FIX：`tests/dujs/loopmatching.js` 檔頭註明哪些案例是守門、哪些能分辨新舊（審查以 `git archive` 實測，US4 前已通過的有 US4-1／2／3、GEN 流向自己、區域變數不流出），並補一個「處理器 exit 不貢獻」的 pair 層案例（如處理器被直接呼叫時其區域定義不流入另一處理器）（R1）；open 處理器退回路徑（`isOpenHandler`）尚無整合測試，找到能觸發的 probe 時補上（R2）

**Checkpoint**: oracle、MDN、效能、文件與最終驗證完成，golden 與 MDN 差異皆經使用者簽核；可建立 PR。

---

## Dependencies & Execution Order

### Phase 相依

- **Setup（Phase 1）**：無相依；T009 後由 orchestrator 提交 Setup commit，之後才可改 `lib/`。
- **Foundational（Phase 2）**：依賴 Setup；阻擋所有 story（`doAnalysis` 換求解器後所有模型共用）。
- **US5 → US6 → US1 → US3 → US4 → US2**：**依序**（plan「實作順序」）；每個都改 golden 且多數改 `reachingsolver.js`／`defuseanalyzer.js`／`expansion.js`。US5、US6 不依賴摘要；US3、US4 依賴 US1 的摘要與 CallSiteRecord；US2 依賴 US1、US3、US4（新連結的遞迴若無摘要會產生不可實現 pair，spec P6）；US3-5 測試（T085）依賴 US2。
- **Polish（Phase 9）**：依賴全部 story；T099 在 T098 後、T100 在 T094 與 T098 後，皆在 PR 前。

### Golden 寫入序列（不可並行）

T019（Foundational）→ T028（US5）→ T042（US6）→ T062（US1）→ T071（US3）→ T081（US4）→ T090（US2）。淨差異表是相對 `9e324be` 的累積結果，每次整表重新產生並 `--verify`；orchestrator 親自重跑 `--verify` 通過後才 commit。

### Story 內順序

測試（red）→ 實作 → 測試全過 → golden → 閘門。

## Parallel Opportunities

- **Setup**：T002、T003 並行；T006（diffcheck 自我測試）可與 T004、T005 並行。
- **Foundational**：T010 與 Setup 之外無相依；T011 同檔接續撰寫。
- **US5**：T021、T022 並行。
- **US6**：T030、T031、T032、T033、T034 並行；T036、T037 並行。
- **US1**：T044、T045、T046、T047 並行；T049、T051、T057 並行。
- **US3**：T064、T065、T066 並行。
- **US4**：T073、T074、T075 並行。
- **US2**：T083、T084、T085 並行。
- **Polish**：T092、T096、T097 並行。

```text
# US6 測試先行：
T030 tests/esgraph/finally.js
T031 tests/esgraph/flownodetest.js、flownodefactory.js
T034 tests/dujs/finallyflow.js

# US1 測試先行：
T044 tests/dujs/summary.js
T045 tests/dujs/summaryanalysis.js
T046 tests/dujs/matching.js
```

## Implementation Strategy

### MVP

Setup → Foundational → US5 → US6 → US1：完成後多處呼叫只報可實現 pair（stage 2 核心）、entry 不再讀本體、`finally` 整族正確、配對資訊輸出，golden 差異經 `--verify` 核對，可單獨提交（人工簽核仍在 T099）。

### Incremental Delivery

每個 phase 結束於閘門並各自 commit（由 orchestrator 執行）：Foundational（求解器＋FR-014）→ US5（§18）→ US6（finally）→ US1（摘要、Q-a、matching）→ US3（例外摘要）→ US4（LOOP 配對）→ US2（D2 連結）→ Polish（oracle、MDN、perf、文件、簽核）。每一步都保持 `npm test`、lint 全綠與 golden `--verify` 通過。

## 各 story 預計修改／新增檔案

| Phase | lib | tests | 其他 |
|-------|-----|-------|------|
| Setup | — | 新增 `tests/dujs/cases/probes005/`（41 檔） | `eslint.config.js`；新增 `mdn/baseline-develop/`、`tools/diffcheck.js`、`tools/diffcheck.test.js`、`golden-diff.md`、`perf.md`；必要時 006 `tools/diffcheck.js` 匯出 |
| Foundational | 新增 `reachingsolver.js`；修改 `defuseanalyzer.js` | 新增 `reachingsolver.js`；修改 FR-014 相關既有測試 | golden、manifest、`golden-diff.md` |
| US5 | `usedexpressions.js`、`defuseanalyzer.js`、`scopebinding.js` | 新增 `entryuse.js`；修改 T022 所列約 14 檔（以實跑失敗為準）、`scopebinding.js`、（`scopesource.js`） | golden、manifest、`golden-diff.md` |
| US6 | `esgraph/flownode.js`、`flownodefactory.js`、`index.js`、`dot.js`；`dujs/expansion.js`、`reachingsolver.js` | 新增 `tests/esgraph/finally.js`、`tests/dujs/finallyflow.js`；修改 `flownodetest.js`、`flownodefactory.js`、`reachingsolver.js`、`expansion.js` | golden、manifest、`golden-diff.md` |
| US1 | 新增 `summary.js`；修改 `def.js`、`deffactory.js`、`expansion.js`、`model.js`、`modelbuilder.js`、`reachingsolver.js`、`defuseanalyzer.js`、`defuseanalysisexecutor.js`、`cfggraphconverter.js`、`outputwriter.js` | 新增 `summary.js`、`summaryanalysis.js`、`matching.js`；修改 `expansion.js`、`model.js`、`modelbuilder.js`、`def.js`、`deffactory.js`、`bypass.js`、`callcycles.js`、`cfggraphconverter.js`、`scopesource.js`、`tests/helpers/analyze.js`、`tests/golden/golden.js` | golden、manifest（`added`）、`golden-diff.md` |
| US3 | `summary.js`、`reachingsolver.js`、`outputwriter.js` | 新增 `exceptionsummary.js`；修改 `summary.js`、`reachingsolver.js` | golden、manifest、`golden-diff.md` |
| US4 | `expansion.js`、`model.js`、`modelbuilder.js`、`reachingsolver.js`、`defuseanalyzer.js`、`outputwriter.js` | 新增 `loopmatching.js`；修改 `reachingsolver.js`、`expansion.js`、`model.js` | golden、manifest、`golden-diff.md` |
| US2 | `scopebinding.js`、`callresolver.js` | 新增 `relaxedcallee.js`；修改 `scopebinding.js`、`exceptionsummary.js`、`newcallsite.js`、`bypass.js` | golden、manifest、`golden-diff.md` |
| Polish | — | 新增 `inliningoracle.property.js` | `mdn-diff.md`、`perf.md`、`docs/known-issues.md`、`README.md`；簽核欄（orchestrator） |
