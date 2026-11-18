---

description: "Task list for feature 008-property-defs-method-calls"
---

# Tasks：成員賦值不是物件變數的定義（KI §22 (1)）、函式中的 `o.m()` 放寬（KI §23）、無法到達的程式碼不產生 pair（KI §22 (5)）

**Input**: `specs/008-property-defs-method-calls/` 的 spec.md（Clarifications D001–D020 為已定決策；D021–D024 為 analyze／implement 中的 Fable 裁決，記於本檔「analyze 裁決（D021–D022）」節；合稱 D001–D024）、plan.md（「實作順序與 story 相依」表與其下條列為排程權威）、research.md（R0–R14）、data-model.md、contracts/（lib-api.md、reachability.md、diff-check.md、acceptance.md）、quickstart.md

**Tests**: 規格要求（§CP-4、SC-001、contracts/acceptance.md），**測試先行**：每個 story／元件先寫測試（預期先失敗；「與 develop 相同」的 characterization 可直接通過），再實作。框架 mocha＋should；驗收測試以 `tests/helpers/analyze.js` 執行，probes 自 `tests/dujs/cases/probes008/` 以 `fs.readFileSync` 讀入，兩頁程式以 `//// page` 行切開（同 `probes/run-pages.js`）。

**Organization**: Setup → Foundational → US1 → US2 → US3 → Polish（plan「實作順序與 story 相依」）。**US2 依賴 US1**（P9：`o.p = 1` 不再是定義）。改 golden 的階段（US1、US2）必須依序，各自重產相對 `2035c93` 的累積淨差異。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、不依賴未完成的任務）
- **[Story]**：所屬 user story（US1–US3）；Foundational 中 FR-013 的任務依 plan 標 `[US3／FR-013]`——**刻意例外**（plan 裁決：FR-013 移到 Foundational，緊接檢查器之後先紅後綠；需求歸屬仍是 US3），不屬格式錯誤，analyze 不報
- 路徑皆相對 repo 根 `/Users/chengfulin/Documents/Personal/dujs`；git 一律 `git -C /Users/chengfulin/Documents/Personal/dujs`

## 共通約定（每個任務都適用）

- **階段檢查（統一，Foundational 結束起每階段皆同，無例外）**：`npm test` 全綠、`npm run lint` 0 錯誤、全量不變量測試 `tests/dujs/reachabilityinvariant.js`「允許清單外 0 違反、過期 0」。改 golden 的階段（US1、US2）另須 `node specs/008-property-defs-method-calls/tools/diffcheck.js golden --verify specs/008-property-defs-method-calls/golden-diff.md` exit 0 才算完成（orchestrator 親自重跑）。
- golden 更新：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js`（只更新 `tests/golden/expected*`；**UPDATE_GOLDEN 不讀也不寫 `manifest.json`**，`tests/golden/golden.js:21-23`）→ **手動同步 manifest**：重算 `tests/golden/manifest.json` 中 `baseline` 所列 `.dot` 檔的 sha256 並寫回（`added` 類不記），新舊雜湊記入 golden-diff 的雜湊變化表（同 007 golden-diff.md 的作法），否則 golden.js「keeps every baseline .dot byte-identical」會紅（D020 analyze H1）；**檔案集合改變時**（如 US2 使 `expected-es2015` 新增 8 檔 `page0/inter-procedurals/2.*`、`3.*`）同步增刪 `manifest.json` 的 `added` 檔名（不記雜湊；只重算 baseline 雜湊時 `tests/golden/golden.js:225-229` 仍紅，Fable 實跑）；接著 `diffcheck.js golden --report` 重產機器區塊（淨差異、段結構改變行、重複列數、釘選與簽核）到 `golden-diff.md`，補該階段敘述節、雜湊變化表與「單元測試期望」表，最後 `--verify` exit 0。
- 釘選列（`成員目標`、`屬性寫入→讀取損失`、`外溢`、`放寬`、KI 類）的簽核欄 implementer 只填「草擬，待簽核」，「說明」欄必填；「段結構改變行」逐列待使用者簽核（contracts/diff-check.md §1）。
- 改動既有測試的期望時，逐處記入 `golden-diff.md` 的「單元測試期望」表（檔案、測試名、舊期望、新期望、FR）。
- **不得修改**：`specs/005-*/tools/**`、`specs/006-*/tools/**`、`specs/007-*/tools/**`（008 工具只 `require` 或複製）；`lib/esgraph/**`（含 LGPL 檔、`astrewriter.js`）；`lib/dujs/reachingsolver.js`、`summary.js`、`expansion.js`、`callsplit.js`、`modelbuilder.js`、`outputwriter.js`、`cfggraphconverter.js`、`tests/helpers/analyze.js`（plan「預期不改程式」）；`eslint-suppressions.json` 不得新增鍵或增加 count；spec／plan／contracts 等設計文件不由 implement 修改。**例外途徑**：需動本清單內的任何檔案（含 FR-008 範圍內修正需動 `reachingsolver.js`／`summary.js` 時）→ 先發 DECISION，裁決後才動。
- **測試先行期間不 commit**：除下方明列的不 commit 區間外，各階段測試先行期間（如 T029→T030、US1 T032–T043、US2 T048–T052）亦不 commit；階段檢查通過才 commit。
- **008 工具**：`specs/008-property-defs-method-calls/tools/{classify,diffcheck}.js` 與其自我測試在 Setup 首次 commit 後，**任何修改先發 DECISION**（D006）。
- 沒有新的節點型別、邊型別或輸出格式（FR-005）；`*.matching.json` 格式不變。
- 檢查器（`tests/helpers/reachability.js`）**不得** require `lib/dujs/reachingsolver`、`summary`、`defuseanalyzer`，不得讀 `reachIns`／`reachOuts`／`analysisResultOf`／`setAnalysisResults`／`normalReturn`／`summaryOf`（FR-007，contracts/reachability.md §1）。
- 注入、陽性對照與 D014／D015／D019 的單元測試是檢查器獨立性的唯一防線（plan「tasks 指引」）：**不得刪減、合併或改為 skip**。

---

## Phase 1: Setup（develop 快照與差異工具；任何 lib 變更之前）

**Purpose**: 在 lib 與 `2035c93` 相同時取得 probes 複本、MDN／效能基準，並建好 008 的 classify／diffcheck 與其自我測試。

- [X] T001 以 `git -C /Users/chengfulin/Documents/Personal/dujs diff --quiet 2035c93 -- lib` 確認 lib 與基準相同（非 0 即停止並回報）；執行 `npm test`（預期 1715 passing）與 `npm run lint`（0 錯誤），數字記入 `specs/008-property-defs-method-calls/perf.md` 的「develop 基準（`2035c93`）」節（R11）
- [X] T002 [P] 把 `specs/008-property-defs-method-calls/probes/p*.js`（42 檔，p1–p42；**不含** `run.js`、`run-pages.js`、`baseline-develop.txt`）逐字複製到 `tests/dujs/cases/probes008/`，`specs/008-property-defs-method-calls/probes/pages/s*.js`（14 檔，s1–s14；不含 `baseline-develop.txt`）複製到 `tests/dujs/cases/probes008/pages/`；以 `cmp` 確認逐位元相同（contracts/acceptance.md 前言）。baseline 檔不複製，測試直接讀 `specs/008-property-defs-method-calls/probes/baseline-develop.txt` 與 `probes/pages/baseline-develop.txt`
- [X] T003 [P] 在 `eslint.config.js` 的 ignores 加入 `'tests/dujs/cases/probes008/**'`（附一行註解，共兩行；照 005–007 的 probes00x 先例，`eslint.config.js:35-43`）；`npm run lint` 0 錯誤（probes 複本是分析輸入，不得以 `eslint-suppressions.json` 處理；D020 analyze H2）
- [X] T004 [P] 產生 MDN develop 快照（contracts/diff-check.md §1「基準」，作法同 `specs/007-split-call-nodes/contracts/diff-check.md` §4 步驟 2；依賴 T001）：對 `specs/006-eslint-scope/mdn/pages.json` 每個 id，以 `specs/006-eslint-scope/mdn/corpus/` 的檔案跑 `node bin/dujs.js`，存各模型的 `.dot` 與 `*.matching.json` 到 `specs/008-property-defs-method-calls/mdn/baseline-develop/<id>/`，結束碼寫入 `specs/008-property-defs-method-calls/mdn/baseline-develop/exitcodes.json`，以 `docs/research/mdn-baseline/tools/run-pairs.js` 產生 `specs/008-property-defs-method-calls/mdn/baseline-develop/<id>.pairs.txt`（FR-010）
- [X] T005 量測效能基準（SC-006，R11；依賴 T001，**不與 T004 同時執行**以免干擾計時）：`node specs/006-eslint-scope/tools/perf.js .` 同機 3 輪中位數，另記 golden 各 case 的 CLI 3 輪中位數；寫入 `specs/008-property-defs-method-calls/perf.md` 的「develop 基準（`2035c93`）」表
- [X] T006 [P] 先寫分類工具自我測試 `specs/008-property-defs-method-calls/tools/classify.test.js`（此時應失敗；D006、D011、FR-009）：contracts/diff-check.md §3.3 表的**每一列**（P1 `o: L8 -> L9` 修正；P25 兩筆損失；P4 `o: L3 -> L4` 損失；P2 損失 ×4〔`o: L5 -> L6`、`o: L4 -> L5`、`o: L9 -> L10`、`o: L9 -> L11`〕與修正 ×2〔`o: L7 -> L8`、`o: L8 -> L8`〕；P27 `o: L7 -> L8` 損失；P29–P32 裸 callee／`new` 運算元修正；P37 `o: L2 -> L5` 損失、`q: L6 -> L7` 修正；合成前綴重疊、同一行多敘述），以 `specs/008-property-defs-method-calls/probes/` 的原始碼為輸入；另測 §3.1 定義性成員目標（`=`、複合、邏輯、解構、`for…in`／`for…of` 左側；`[*]` 計算鍵）、§3.2 每種讀取形態（callee、method、member、deref、whole）、§3.2 模糊情形預設損失（同行兩敘述、同名多宣告、找不到讀取）、同一節點多個成員目標任一符合即損失、p-use 與跨 scope 同判定；介面依 data-model §6（`classifyRemoved`、`writePathsAt`、`readsAt`、`statementCountAt`）；檔首 `/* global describe, it */`（照 007 先例）
- [X] T007 實作 `specs/008-property-defs-method-calls/tools/classify.js`（依賴 T006）：純模組，只 require espree、eslint-scope；判準依 contracts/diff-check.md §3（路徑比較：相同、互為前綴〔非空〕、含 `*` → 損失）；`npx mocha specs/008-property-defs-method-calls/tools/classify.test.js` 全綠
- [X] T008 [P] 先寫 diffcheck 自我測試 `specs/008-property-defs-method-calls/tools/diffcheck.test.js`（此時應失敗；檔首 `/* global describe, it */`；contracts/diff-check.md §1、§2、§4、§5）：(a) 檔頭「基準：`2035c93`」行的讀取與 `--base` 覆寫；golden 基準取自 git、MDN 基準取 `mdn/baseline-develop/`；(b) pair 比對：某行兩側 `.graph.dot` 段標記多重集合相同時以保留後綴的完整標記比對（007 T068 (d) 的同行不同段缺漏要能被看出），不同時退回去後綴比對並列入「段結構改變行」表，`--verify` 核對列數與內容；(c)「重複列數」表（KI §43，不設門檻）；(d) 不沿用 007 的標記改寫、intra-procedural 層級 pair 差異照一般分類（不一律失敗）；**模型對應（D022）**：inter-procedural／intra-page 等模型以「頁 × 層級」聯集比對 pair，不依模型檔編號逐檔比（fixture：基準 `inter-procedurals/1` 的 pair 在 008 側出現在 `inter-procedurals/3`，須判為無差異）；(e) 每個類別的機械觸發各有正反例：`成員目標`（`修正`／`新增讀取`〔含 P42 型無物件變數、新 `localStorage` 讀取帶出的 inter-page pair，D013〕／`不再殺除`）、`屬性寫入→讀取損失`、`外溢`（含 007 防護解除）、`放寬`、`無法到達`（無自動觸發）、KI 類、`共通`，以及 `層級新增` 子標（D022：+ pair 以相同（變數、def、use）存在於基準側同頁 `intra-pages/*.dupairs.dot` 者成立，不存在者不成立；fixture 仿 US2 的 `saved: 29 -> 33`、`id: 30 -> 31`）；(f) 歸不進類別 → exit 1；釘選筆數、段結構改變行、重複列數不符或 exit code 不同 → exit 1；無法取得基準 → exit 2；(g) **位置條件 probe**（diff-check.md §2「位置條件的 probe 驗證」，plan 裁決）：fixture 為「`g` 宣告於使用行之後（如 L20）、內含 `o.m()`；L5 `g();`、L6 讀 `x`」的間接呼叫形態，分別對 `外溢`（成員目標使 `o.m()` 新連結）與 `放寬`（FR-004 使 `o.m()` 新連結）斷言該 pair 差異能被歸類
- [X] T009 實作 `specs/008-property-defs-method-calls/tools/diffcheck.js`（依賴 T007、T008；R9）：CLI `golden|mdn` × `--report|--verify <file>`、`--base`；**複製** `specs/007-split-call-nodes/tools/diffcheck.js` 的 `compareCase`、`buildReport`、`verifyRecord`、`goldenResults`、`mdnResults`、`main` 後修改；`.dot` 解析、`locate`、`baseOf`、`exitCodesOf` 以 `require` 使用 005／006 匯出，`duplicateCount`、`sourceFactsOf`、`outputFactsOf` 以 `require` 使用 007 匯出——**不修改 005／006／007 的任何檔案**（缺匯出時改為複製，不得在原檔新增匯出）；分類呼叫 `tools/classify.js`；`npx mocha specs/008-property-defs-method-calls/tools/diffcheck.test.js` 中 (g) 以外全綠；含 D022 的頁 × 層級聯集比對與 `層級新增` 子標；檔首 `/* global describe, it */`
- [X] T010 位置條件 probe 驗證與定案（diff-check.md §2；依賴 T009；**必須在工具首次 commit 前完成，此時修改不需 DECISION**）：執行 T008 (g)；若現行條件（use 行 > 呼叫點行、或位於被呼叫端行範圍）涵蓋不到，把 `外溢`／`放寬` 的位置條件放寬為「pair 的 def 或 use 位於被呼叫端行範圍、該呼叫點之後，或位於某個（遞移地）呼叫含該呼叫點之函式的呼叫點之後」並實作於 `specs/008-property-defs-method-calls/tools/diffcheck.js`；`npx mocha specs/008-property-defs-method-calls/tools/classify.test.js specs/008-property-defs-method-calls/tools/diffcheck.test.js` 全綠；結果（涵蓋與否、採用的條件）記入 `specs/008-property-defs-method-calls/golden-diff.md` 的「分類說明」段（T011 建立後補寫）
- [X] T011 建立 `specs/008-property-defs-method-calls/golden-diff.md` 與 `specs/008-property-defs-method-calls/mdn-diff.md`（contracts/diff-check.md §4）：檔頭「基準：`2035c93`」行、空的機器區塊（淨差異（相對 develop）、段結構改變行、重複列數、釘選與簽核）、「分類說明」段（含 `o.m()` 歸修正是**語法層**判定的說明，FR-009）、「單元測試期望」表、雜湊變化表、「可到達性允許清單」節骨架（格式參照 `specs/007-split-call-nodes/golden-diff.md`）；`diffcheck.js golden --verify` 與 `mdn --verify` 皆 exit 0（lib 未變，零差異）。**本任務完成即為 008 工具的首次 commit 點；之後修改 `tools/` 一律先發 DECISION**

**Checkpoint**: probes 複本、MDN 快照、perf 基準、classify／diffcheck 與其自我測試就緒；`git diff --quiet 2035c93 -- lib` 仍為 0；golden／MDN `--verify` 零差異。

---

## Phase 2: Foundational（可到達檢查器、全量不變量、FR-013、scopebinding 新方法；阻擋全部 story）

**Purpose**: 在 develop 行為上先建立與求解器獨立的檢查器（FR-006～FR-008）與其防線（注入、陽性對照、D014／D015／D019、fail-closed、獨立性守門）；啟用全量不變量測試，先讓它把 P38–P40 報紅，再以 FR-013 轉綠；`scopebinding` 新方法（尚未接線，行為不變）。golden 預期 0 筆差異（R14 原型實測）。

### 檢查器測試（先寫，`tests/dujs/reachability.js`，同檔依序）

- [X] T012 新增 `tests/dujs/reachability.js` 的規則單元測試（contracts/reachability.md §1、§2、§6「規則單元」；此時應失敗）：介面 `reachableNodes`、`normalReturns`、`violationsOf`、`check`、`assertInvariant`、`modelsOfPages` 存在；(a) 無條件遞迴之後不可到達（P13、P14、P15 的 inter-procedural 與 intra-page）、條件遞迴可到達（P16、P17）；(b) 沒有任何處理器邊的 LoopRecord 其 LOOP RETURN 可到達；(c) 只由例外進入的 `finally` 之後不可到達、正常進入時可到達、`finally` 內含會拆段的呼叫時（段節點、CALL RETURN 依 reachability.md §2 的位置規則落在 `region(T)` 內）進入判定正確（plan 已知風險，D020 analyze M1）、`return` 經 `finally`（`finally` 邊）可到達、巢狀 try–finally（內層 finallyExit 在外層區域內不算外層的進入）、finallyExit 對應不到 `TryStatement` 時拋錯；intra-procedural 模型中呼叫之後皆可到達（P14 intra(f)）且 `normalReturns` 回傳空 Map；inter-page 每頁 entry 可到達（否則拋錯）
- [X] T013 **D014** 單元測試（同檔，依賴 T012）：「呼叫節點無例外邊」的 record——鏈式呼叫的後段（如 `a().b()`）與決策前呼叫（如 `if (f())`）——在被呼叫端拋錯時，`exceptionalReturn`（catch 或 exit）經虛擬例外邊（型別視為例外）可到達；`exceptionalReturn` 斷言的反例：以包裝物件（`Object.create(model)` 覆寫 `callSiteRecords`）把某 record 的 `exceptionalReturn` 換成不是任何節點 `.exception` 目標的節點，檢查器必須拋錯（contracts/reachability.md §2「`exceptionalReturn` 的斷言」）
- [X] T014 **D015** 單元測試（同檔，依賴 T012；US3 情境 8 的可達集合部分）：P41 的 inter-procedural 與 intra-page 模型中，L10 的 CALL、CALL RETURN 與 L11 皆**不在** `reachableNodes` 的結果中；並對照「照圖走 return 邊」（測試內以圖結構直接 BFS、不分呼叫點）時 L10 的 CALL RETURN 會可到達，證明本測試能區分兩種解讀；另以注入（`Object.create(model)` 覆寫 `dupairs` 加入一筆以 L11 為使用端的 pair）使 `assertInvariant` 拋錯
- [X] T015 **D019** 單元測試（同檔，依賴 T012）：`async function f(){ await f(); } f(); x = 1; console.log(x);`（行號依測試程式）中 `normalReturns` 判 `f` 有正常返回，`x = 1` 與 `console.log(x)` 可到達、求解器的 `x` pair 不被報為違反；同時斷言對照：若不依 `ast.async`／`ast.generator` 旗標而純結構重算（測試內以 `Object.create` 包裝 scope 使旗標為假），`f` 判為沒有正常返回並誤報；generator 函式（`function* g(){ yield* g(); }`）同理各一例
- [X] T016 return 邊 **fail-closed** 單元測試（同檔，依賴 T012；contracts/reachability.md §2 邊表）：以包裝模型加入一條 `return` 邊，目標既不是任何 record 的 `callReturn` 也不是 LOOP，`reachableNodes` 必須拋錯；目標為 LOOP（LOOP RETURN → LOOP）時照常可走
- [X] T017 **獨立性守門**測試（同檔，依賴 T012；FR-007，contracts/reachability.md §1）：以正規表示式掃描 `tests/helpers/reachability.js` 原始碼，出現 `reachingsolver`、`summary`（require 路徑）、`defuseanalyzer`、`reachIns`、`reachOuts`、`analysisResultOf`、`setAnalysisResults`、`normalReturn`（作為屬性讀取；本模組自己的 `normalReturns` 函式名以精確樣式排除）、`summaryOf` 即失敗
- [X] T018 **陽性對照** P21、P23、P24（同檔，依賴 T012；US3 情境 5 的檢查器部分、FR-007、FR-008、D003、D005）：(a)(b)(c) 全開時把 P21 `x: L1 -> L11`、P23 `x: L11 -> L14`、P24 `x: L1 -> L11`（inter-procedural 與 intra-page）報為違反；`finallyRule: false` 時兩端皆可到達（`check` 的 `eligible` 含之）；見證為 `{scope, line, nonExceptionalEntries: 0}` 且 scope／line 指向該 `finally`（contracts/reachability.md §3）
- [X] T019 **注入**（同檔，依賴 T012；US3 情境 6，contracts/reachability.md §6；四例各自一個 `it`，不得合併）：取 P13 的 inter-procedural 模型 `m`，以 `Object.create(m)`＋`Object.defineProperty` 覆寫 `dupairs` 為原 Map 的複本再加一筆——(1) **兩端皆不可到達**：`DUPair(L9 節點, L9 節點)`（新 Var `injected`），`assertInvariant` 拋錯且訊息含 `injected`；(2) **只有定義端不可到達**：定義端 L9、使用端取可到達節點，拋錯；(3) **只有 p-use 分支目標不可到達**：`Pair(可到達的決策節點, 不可到達的分支目標)`，拋錯；(4) **加入允許清單仍拋錯**：把 (1) 的 pair 加入允許清單，因關掉 (c) 仍違反（判準 2）而拋錯。另測 `assertInvariant` 其餘失敗情形：允許清單項已不再違反（過期，訊息標「過期」）、`witness` 與當次輸出不同（contracts/reachability.md §5 情形 3、4）

### 檢查器實作

- [X] T020 實作 `tests/helpers/reachability.js` 的核心可到達（依賴 T012–T019；contracts/reachability.md §2、data-model §4）：各模型起點 `graph[0]`（M4）；邊的可走性表；圖上 `return` 邊不走、改由 (a) 虛擬邊 `record.callNode → record.callReturn`（**分呼叫點**，D015）；`normalReturns` 以最小不動點自行重算（被呼叫端 exit 有可到達的非 `exception` 前驅），generator／async 依 scope `ast` 旗標直接為是（D019）；`exceptionalReturn` 視為從 `callNode` 出發的例外邊並斷言其為圖上某節點的 `.exception` 目標（D014）；(b) LoopRecord 虛擬邊；return 目標不明即拋錯（fail-closed）；inter-page 每頁 entry 可到達斷言
- [X] T021 實作 `tests/helpers/reachability.js` 的 (c) finallyExit 規則（同檔，依賴 T020）：finallyExit → `TryStatement` 的對應（擁有函式 `ast` 中 `finalizer.loc.end` 比對，找不到或多於一個拋錯）、`region(T)` 的節點位置規則、非例外進入的判定、`FinallyRegion.entered` 單調轉真時補走 `normal` 出邊；`finallyRule: false` 時照常可走且 (a) 不動點以同一設定重算
- [X] T022 實作 `tests/helpers/reachability.js` 的 `violationsOf`、`check`（全開／關掉 (c) 差分、`eligible`、見證：只開放單一 F 的 `normal` 出邊重跑判定，排序 scope 名、行）、`assertInvariant`（§5 四種失敗情形，訊息逐項列出程式、模型、pair、不可到達端）、`modelsOfPages`（以 `tests/helpers/analyze.js` 建模，列出四層全部模型與 contracts/reachability.md §4 的 `model` 命名）（同檔，依賴 T021）；`npx mocha tests/dujs/reachability.js` 中 T012–T019 全綠

### 全量不變量（先報紅）

- [X] T023 新增 `tests/dujs/reachabilityinvariant.js` 的 MDN 語料載入與其失敗測試（**D016**；依賴 T022）：直接讀 `specs/006-eslint-scope/mdn/corpus`（依 `pages.json`，先例 `tests/dujs/splitcallnodes.js:24`），以 `crypto` 計算每檔 sha256 並與 `specs/006-eslint-scope/mdn/README.md`「sha256（全碼）」區塊逐檔比對；單元測試以暫存目錄複本斷言三種情形皆**失敗**（不得 `skip`／`pending`）：缺檔、`.js` 檔數 ≠ 33、sha256 不符
- [X] T024 在 `tests/dujs/reachabilityinvariant.js` 實作全量檢查（同檔，依賴 T023；US3 情境 4、SC-005；以 `this.timeout(…)` 設足夠逾時，同既有測試檔慣例）：對 `tests/dujs/cases/probes008/`（含 `pages/`，兩頁以 `//// page` 切開）、`tests/golden/fixtures`（頁面組合同 `tests/golden/golden.js`）、MDN 語料的每個模型執行 `check`，以 `assertInvariant` 對照 `tests/dujs/cases/reachability-allowlist.json`；`program` 命名依 contracts/reachability.md §4（`probes008/<檔名>`、`golden/<case>`、`mdn/<id>`）
> **implement 交接（不 commit 區間）**：兩段區間 `npm test` 刻意為紅，**不得 commit**——(1) T012（首個紅測試）起到 T022 完成（檢查器單元測試全綠）前；(2) T024 起到 T027 完成前（全量不變量先紅後綠，P38–P40）。最早在 T027 轉綠（`npm test` 全綠）後才可 commit（主對話裁決、D020）。

- [X] T025 建立暫行允許清單 `tests/dujs/cases/reachability-allowlist.json`（依賴 T024；D003、D005、FR-008）：列入 P21、P23、P24 的每個違反（程式、模型、pair）與全量檢查實測到、**通過差分判準**（全開違反且關掉 (c) 兩端皆可達）的 finallyExit 根因項（含 golden、MDN），`witness` 取自檢查器當次輸出逐字填入，`note` 註明 KI §38 形態；執行 `npx mocha tests/dujs/reachabilityinvariant.js`，**預期紅**且允許清單外的違反恰為 P38、P39、P40 在 inter-procedural 與 intra-page 的決策節點 p-use pair（P38 `f: entry -> L5>L6:T`、`f: entry -> L5>L8:F`；P39 `g: entry -> L8>L9:T`、`g: entry -> L8>L11:F`；P40 同 P38 形式），把紅的輸出摘要記入 `specs/008-property-defs-method-calls/golden-diff.md` 的 Foundational 敘述節；**若出現其他關掉 (c) 仍違反的項目，停止並回報**（FR-008：屬本 feature 範圍者修正，否則 DECISION）

### FR-013（先紅後綠）

- [X] T026 [US3／FR-013] 擴充 `tests/dujs/defuseanalyzer.js` 的 `findDUPairs` 單元測試（US3 情境 7 的單元部分，D017；此時應失敗）：owner 可到達時照常配對（`if (h(a))`，`h` 會返回，有 `a` 的兩筆 p-use pair）；owner 不可到達時略過——`if (f())`、`while (f())`、`if (g(f()))`（`f` 無條件遞迴）的 inter-procedural 與 intra-page 模型沒有決策節點的 deferred p-use pair；段 0 的 c-use（`f: entry -> L3` 類）照常；intra-procedural 模型結果不變
- [X] T027 [US3／FR-013] 修改 `lib/dujs/defuseanalyzer.js` 的 `findDUPairs` 第二段（deferred p-use 與 `puseOwners` 配對，約 L278-293；contracts/lib-api.md §3、research R14）：`model.analysisResultOf(owner) === null` 時略過該 owner（簡單版，不另處理未分析；不改 `reachingsolver.js`、`summary.js`）；T026 全綠，`npx mocha tests/dujs/reachabilityinvariant.js` 轉綠（允許清單外 0 違反），`npm test` 全綠
- [X] T028 [US3／FR-013] 在 `tests/dujs/reachability.js` 以**注入重現修正前的 P38 違反**（contracts/reachability.md §6；依賴 T027）：取 P38 的 inter-procedural 與 intra-page 模型，`Object.create(model)` 覆寫 `dupairs` 補回修正前的 `f: entry -> L5>L6:T`、`f: entry -> L5>L8:F`，斷言檢查器報為違反、關掉 (c) 仍違反、`assertInvariant` 拋錯；P39（`g: entry -> L8>L9:T`、`g: entry -> L8>L11:F`）與 P40 同法各一例；另斷言 P38–P40 修正後的真實模型全開無違反

### scopebinding 新方法（尚未接線）

- [X] T029 [P] 擴充 `tests/dujs/scopebinding.js`（contracts/acceptance.md「另有單元測試」、contracts/lib-api.md §1；此時應失敗）：`isLocalStorageObject`（domain `localStorage` 為真；頁面宣告 `var localStorage`、函式內遮蔽 `let localStorage`、別名 `s`〔`var s = localStorage`〕、`window.localStorage` 的 `window` 皆為假；D008）、`isRelaxedInstance`（`let`、`const` 為真；`var`、參數、函式、class 為假；D002）、`isLogicalAssignmentTarget`（`&&=`、`||=`、`??=` 的 `left` 為真，以物件同一性；`+=`、`=` 為假）
- [X] T030 修改 `lib/dujs/scopebinding.js`（依賴 T029）：新增 `PageBinding.prototype.isLocalStorageObject`（`localStorageVar()` 存在且 ∈ `defVarsOf(identifier)`）、`isRelaxedInstance`（`RELAXED_INSTANCE_KINDS = [let, const]`，與 `RELAXED_CALLEE_KINDS` 並列）、`isLogicalAssignmentTarget`（集合在建構 `PageBinding` 時與 `collectAssignmentTargets` **同一次走訪**收集，不另走 AST）；既有方法語意不變；本階段**不接線**（defuseanalyzer、hierarchy、callresolver 尚不呼叫）；T029 全綠
- [X] T031 Foundational 階段檢查：`npm test` 全綠（1715＋新增）、`npm run lint` 0 錯誤、`reachabilityinvariant.js` 允許清單外 0 違反且無過期項；`node specs/008-property-defs-method-calls/tools/diffcheck.js golden --verify specs/008-property-defs-method-calls/golden-diff.md` exit 0（golden 0 筆差異）；`node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --verify specs/008-property-defs-method-calls/mdn-diff.md` exit 0（FR-013 對 MDN 預期 0 筆差異；008 工具已於 Setup 建立，可執行——D020 C1）；`node specs/008-property-defs-method-calls/probes/run.js` 與 `probes/baseline-develop.txt` 比對，只有 P38–P40 的 inter[1]／intra-page 行改變（各少兩筆 p-use pair）；`git -C /Users/chengfulin/Documents/Personal/dujs diff --stat 2035c93 -- lib` 只有 `lib/dujs/defuseanalyzer.js`、`lib/dujs/scopebinding.js`

**Checkpoint**: 檢查器、注入、陽性對照、D014／D015／D019、fail-closed、獨立性守門就緒；全量不變量在 `npm test` 中執行且允許清單外 0 違反；FR-013 完成；scopebinding 新方法可用但未接線。User story 可開始。

---

## Phase 3: User Story 1 - 成員賦值是物件變數的使用，不是它的定義（Priority: P1）🎯 MVP

**Goal**: 成員目標不定義任何變數（domain `localStorage` 物件變數整個走 develop 路徑），成員目標的物件運算式與計算鍵記為讀取；所有模型與摘要一致（FR-001、FR-002、FR-003；D001、D004、D008、D009、D012、D013）。

**Independent Test**: `npx mocha tests/dujs/propertydefs.js`：P1–P4、P12、P25、P27、P29–P33、P42 與 `probes/pages/` s1–s14 的 pair 與連結；s1–s9 四行與 `probes/pages/baseline-develop.txt` 逐字相同。

### Tests for User Story 1（先寫）

- [ ] T032 [US1] 新增 `tests/dujs/propertydefs.js`：US1 情境 1–5、7、8、17（P1、P2、P3、P4、P12、P25、P27、P37〔D020：`o.m()`、`q.m()` 不連結〕；預期 pair 以 spec 為準），未指明模型者對 intra-procedural（頁面）、inter-procedural、intra-page 都斷言；US1-1 斷言 `o.m()` 的 call 邊連到 `A` 的 `m`；US1-8 另斷言 `L6:F` 節點沒有 `o` 的 c-use 與定義（`||=` 只在決策節點讀 `o`）
- [ ] T033 [US1] 擴充 `tests/dujs/propertydefs.js`：US1 情境 9–13（P29、P30、P31、P32、P33；FR-001 外溢），斷言 hierarchy 的 call 邊（被呼叫端 scope 名稱：P29、P32 連 `f`、P30 連宣告的 `f` 而非 L5 匿名函式、P31 連 `A` 的 constructor）；US1-13 斷言 `f(a)` 仍連結（D009，保留 `o: L1 -> L3`、`v: entry -> L3`）與 L5、L6 的 GEN 為空；外溢的防護解除 characterization（R3）：內嵌 `var o = new A(); o.p = 1, o.m();`，`o.m()` 連結（相對 develop 的行為變更，列入 golden-diff 說明）
- [ ] T034 [US1] 擴充 `tests/dujs/propertydefs.js`（US1-16 的 `localStorage` pair 依 spec「以實跑為準」，該斷言標為 characterization 並把實跑值記入 golden-diff「單元測試期望」表，D020 analyze A1）：US1 情境 6（s1–s9，D004）——以 run-pages 等價程序產生四行（intra(page 1)、storage nodes、inter-page localStorage、inter-page (all)），與讀入的 `specs/008-property-defs-method-calls/probes/pages/baseline-develop.txt` 對應段落**逐字相同**（不手抄期望）；US1 情境 14（s10，D007）**分段驗收（D021）**：US1 只斷言 inter-page (all) 與第一頁 intra-page 有 `o: L5 -> L9`、`o: L5 -> L11`，沒有 `o: L11 -> L9`；`x: L3 -> L13`／沒有 `x: L6 -> L13` 需要 FR-004，移到 US2 的 T048 斷言（spec 終態不變）；US1 情境 15（s11–s14，D008：各自的 pair、儲存定義節點數，s13、s14 的 `inter-page localStorage` 行與 baseline 相同）；US1 情境 16（P42，D013：L2 的 GEN 為空、USE 含 `localStorage` 與 `n`；`n: L1 -> L2`、`o: L1 -> L2`、`console: entry -> L3`；`localStorage` 的 pair 以實跑為準寫入；儲存定義節點數 0）
- [ ] T035 [US1] 擴充 `tests/dujs/propertydefs.js`：段節點位置（plan 已知風險，D020 analyze C1／M2）——`o[g()] = h();`、`[o[g()]] = a;`、`for (o[k] of f()) {}`、`for (o[g()] of a) {}`（後者仍不是呼叫點，KI §46）各斷言不拋錯、讀取所在節點與呼叫點數；巢狀賦值（D012，R1 (d)）——回歸 `o.p = x = 1;`、`o.p = x++;` 定義 `x`、不定義 `o`；characterization `o.a.b = x = 1;`、`this.p = x = 1;`（方法內）與 develop 相同不定義 `x`（各接 `console.log(x);`）；FR-002 細項——`for (o[k] of a) {}`、`for ([o.p] of a) {}`、`({p: o[k]} = b);`、`if ((o.p = f()))`、被呼叫端中的 `f(a).p = 1;`，讀取在迴圈節點／決策節點（p-use 依 007 FR-003）；豁免變體 `for (localStorage[k] of a)` 與 develop 相同；P22（SC-002：結果不變）與 `probes/baseline-develop.txt` 逐字相同
- [ ] T036 [P] [US1] 擴充 `tests/dujs/defuseanalyzer.js`：`findGENSet`／`findUSESet` 對「表示法」成員目標每一形態各一列（`=`、複合、邏輯、`++`、解構、`for…in`／`for…of`、巢狀 `o.p.q`、計算鍵 `o[k]`、`o[i].q`、`f(a).p`、`delete o.p`、`this.p`、`super.p`），含 domain `localStorage` 豁免列與 `localStorage.getItem(n).p` 不豁免列（data-model §1 的 `reads(T)`／`defs(T)`）
- [ ] T037 [P] [US1] 擴充 `tests/dujs/usedexpressions.js`：`loopHeadExpressions(node, rightSplit, binding)` 的計算鍵、樣式中成員目標、豁免（`localStorage`）、`binding` 為 null（不豁免任何目標）、順序（左側物件、鍵、樣式預設值與計算鍵，再右側）；另以 describe 測 `bindingPattern.getMemberTargetReads`（每個 `MemberExpression` 目標的 `object`，計算鍵時接 `property`，樣式順序；contracts/lib-api.md §4、§5）
- [ ] T038 [P] [US1] 擴充 `tests/dujs/summary.js`（FR-003，R4；contracts/acceptance.md「FR-003 摘要」）：內嵌被呼叫端 `function g() { o.p = 1; }`，`o` ∉ `summaryOf(g).gen`、∉ `mustKill`，`o` ∈ `upwardExposed`；`*.matching.json` 的 `summaries` 同步

### Implementation for User Story 1

- [ ] T039 [P] [US1] 修改 `lib/dujs/bindingpattern.js`：新增 `BindingPattern.prototype.getMemberTargetReads(pattern)`（contracts/lib-api.md §4）；T037 的 getMemberTargetReads 部分轉綠
- [ ] T040 [P] [US1] 修改 `lib/dujs/hierarchy.js`（純重構，contracts/lib-api.md §2）：`definesLocalStorage(graphNode, identifier)` 改為 `binding.isLocalStorageObject(identifier)`（無 binding 時 false）；`definingLocalStorageNodes` 的語法判定與結果不變（s1–s14 儲存定義節點數不變）
- [ ] T041 [US1] 修改 `lib/dujs/defuseanalyzer.js` 的 `findGENSet` 與私有 `getDefinedVariables`（FR-001，R1 (b)(c)(d)；依賴 T030）：物件變數＝沿 `.object` 鏈到達的 Identifier（遇呼叫、`this`、其他運算式即無，D013）；非豁免成員目標不定義任何變數；豁免（`isLocalStorageObject`）時維持 develop 的 `:600` 與 `getDefinedVariables` 路徑；巢狀賦值遞迴條件改為「develop 會定義左側」（左側是有 Var 的 Identifier，或 `left.object` 是有 Var 的 Identifier，不論豁免與否；D012）
- [ ] T042 [US1] 修改 `lib/dujs/defuseanalyzer.js` 的 `findUSESet`（FR-002，R2；依賴 T039、T041）：`=` 的非解構成員目標先 `recurse(left.object)`、`left.computed` 時 `recurse(left.property)`，再 `recurse(node.right)`；`isLogicalAssignmentTarget(left)` 為真或豁免時不新增讀取（F 分支不重複讀，R2-4）；解構賦值另走 `getMemberTargetReads(left)`（豁免者略過）；p-use／c-use 依既有條件模式。若 `callsplit.segmentOf` 拋 `no evaluation position`，先在 `tests/dujs/callsplit.js` 補失敗測試再回報（plan 已知風險；`callsplit.js` 不在可改清單，需 DECISION）
- [ ] T043 [US1] 修改 `lib/dujs/usedexpressions.js`（FR-002，R2-3，contracts/lib-api.md §5；依賴 T039）：`loopHeadExpressions(node, rightSplit, binding)`——左側成員目標非豁免時另推入計算鍵 `left.property`，左側是樣式時推入 `getMemberTargetReads(left)` 中非豁免者；`astNodeItems` 傳入 `cfgNode.scope.binding`；讀取留在迴圈節點（KI §46）；T032–T038 全綠
- [ ] T044 [US1] 更新編碼「成員賦值定義物件變數」舊行為的既有測試（如 `tests/dujs/globals.js`、`tests/dujs/methodcalls.js`；實際以 `npm test` 失敗清單為準，完成時把實際檔案清單回填到 `golden-diff.md` 的 US1 敘述節），逐處記入「單元測試期望」表（FR-001／FR-002）。Fable 原型實測的失敗點（皆為測試期望，不需改「不得修改」清單內的 lib）：`tests/dujs/callsplit.js:185-192`（`segmentOfVarDef(defsOf('a'))` 拋「no AST completing the definition」，因 `a[i] = f()` 不再定義 `a`——這不是 T042 的「no evaluation position」，**不觸發 DECISION**，改測試期望即可）、`tests/dujs/globals.js:303`、`tests/dujs/methodcalls.js:301`、`tests/dujs/scopeguards.js:162`（`op.js` 的 DEVELOP_PAIRS）、`tests/dujs/splitcallnodes.js:484`
- [ ] T045 [US1] 執行 `node specs/008-property-defs-method-calls/probes/run.js` 與 `node specs/008-property-defs-method-calls/probes/run-pages.js`，確認 US1 各情境（P1–P4、P12、P25、P27、P29–P33、P42、s10–s14；s10 只核對 `o` 的 pair，`x` 的部分屬 US2，D021）與 spec 一致、s1–s9 與 `probes/pages/baseline-develop.txt` 逐行相同、P38–P40 維持 Foundational 結果、US2 的守門 probes（P6、P7、P11、P26、P28、P35、P36）未意外改變
- [ ] T046 [US1] 全量不變量：執行 `npx mocha tests/dujs/reachabilityinvariant.js`；US1 若新增或消除 finallyExit 根因的 pair，更新 `tests/dujs/cases/reachability-allowlist.json`（新項附見證且通過差分判準，過期項即刪）；允許清單外 0 違反（關掉 (c) 仍違反者停止並回報，FR-008）
- [ ] T047 [US1] golden：依「共通約定」更新並以 `diffcheck.js golden --report` 重產相對 `2035c93` 的累積淨差異到 `specs/008-property-defs-method-calls/golden-diff.md` 的「US1」敘述節（預期類別：`成員目標`〔修正／新增讀取／不再殺除〕、`屬性寫入→讀取損失`、`外溢`；「段結構改變行」照實列出）；`--verify` exit 0；`npm test`、`npm run lint` 全綠；manifest 依共通約定手動同步；另跑 `node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --report`（不寫 mdn-diff），只檢查有無歸不進類別者，有則先處理（D020 C1）

**Checkpoint**: US1 完成；npm test 全綠、lint 0、不變量允許清單外 0 違反、golden `--verify` exit 0。golden-diff 釘選列待使用者簽核。

---

## Phase 4: User Story 2 - 函式中的 `o.m()` 在 `o` 只有一個 `new A()` 定義時連結（Priority: P1）

**Goal**: 函式中 `o.m()` 的 `o` 沒有到達的定義時，若 `o` 為 `const`／`let`、頁面唯一定義是 `new A(…)` 且 `A` 解析為 class，連到 `A` 的實例方法 `m`（FR-004、FR-005；D002、D010、D018）。**依賴 US1**。

**Independent Test**: `npx mocha tests/dujs/propertydefs.js tests/dujs/relaxedcallee.js tests/dujs/methodcalls.js tests/dujs/matching.js`：P5–P11、P26、P28、P34–P36 的連結與 pair；MDN `a05-assessment-main.js` 的三個 `evilBall` 呼叫連結。

### Tests for User Story 2（先寫）

- [ ] T048 [US2] 擴充 `tests/dujs/propertydefs.js`：US2 情境 1–7、9–13（P5、P8、P9、P7、P10、P11、P6、P26、P28、P34、P35、P36）；連結者（P5、P8、P9、P34）斷言 `o.m()` 的 call 邊連到 `A` 的 `m`（不含 constructor）與 spec 所列 pair；「與 develop 相同」者（P6、P7、P11、P26、P28、P35、P36）以 `specs/008-property-defs-method-calls/probes/baseline-develop.txt` 該程式的行逐字比對；P10（US2-5，**D018**）不逐字：不連結、有 `x: L1 -> L11`，intra(page)、inter[0]、intra-page 各多 `F: entry -> L3`，其餘 pair 與 baseline 相同；P36 保留 inter-procedural 的 `f: L3 -> L7`（D010）；另補 US1 情境 14 中依賴 FR-004 的部分（D021）：s10 的 inter-page (all) 與第一頁 intra-page 有 `x: L3 -> L13`、沒有 `x: L6 -> L13`
- [ ] T049 [US2] 擴充 `tests/dujs/propertydefs.js`：US2 情境 8——讀 `specs/006-eslint-scope/mdn/corpus/a05-assessment-main.js`，`loop()` 中 `evilBall.draw()`、`evilBall.checkBounds()`、`evilBall.collisionDetect()` 的 call 邊連到 `EvilCircle` 的 `draw`、`checkBounds`、`collisionDetect`
- [ ] T050 [P] [US2] 擴充 `tests/dujs/relaxedcallee.js` 與 `tests/dujs/methodcalls.js`：`relaxedClassOfInstance` 的四個條件各一反例（頁面程式碼中的 `o.m()`、`var o`、兩個定義、`new F()` 的函式建構子）與正例（class 放寬的 `A`，FR-018；FR-004 的外層函式宣告 `const o = new A()` 而內層函式呼叫 `o.m()`；class 欄位初始化式中的 `o.m()`，D020 analyze C2）；函式內有到達的定義時沿用嚴格規則（P11 型）
- [ ] T051 [P] [US2] 擴充 `tests/dujs/matching.js`（FR-005）：P5 中 FR-004 的呼叫每條 return 邊恰對應一個 record，`callSiteLine` 對應 P5 的 L9（依 matching 既有的行號慣例）

### Implementation for User Story 2

- [ ] T052 [US2] 修改 `lib/dujs/callresolver.js`（FR-004，R7，contracts/lib-api.md §6、data-model §2；依賴 T030、US1）：`classOfInstance` 在沒有到達的定義時呼叫新的私有 `relaxedClassOfInstance(node, variable, scopeTree, index)`，四條件全成立才回傳 classInfo——`isInFunction(node, scopeTree)`、`binding.isRelaxedInstance(variable)`（`let`／`const`）、`definitionsOnThePage(variable, scopeTree).length === 1`、該定義 range 對應 `index.newExpressionsByRange` 的 `new A(…)` 且 `A` 為 Identifier、`resolveVariable(def.fromNode, A, scopeTree)` 給 classInfo；只取 `instanceMethods`（不含 constructor）；匯出項目不變；T048–T051 全綠
- [ ] T053 [US2] 更新編碼舊行為的既有測試（實際以 `npm test` 失敗清單為準，完成時把實際檔案清單回填到 `golden-diff.md` 的 US2 敘述節），逐處記入「單元測試期望」表（FR-004）
- [ ] T054 [US2] 執行 `node specs/008-property-defs-method-calls/probes/run.js`，確認 US2 各情境（P5–P11、P26、P28、P34–P36）與 spec 一致，並執行 `probes/run-pages.js` 確認 s10 的 `x: L3 -> L13`、沒有 `x: L6 -> L13`（D021）、US1 各 probe 與 Foundational 的 P38–P40 不退步
- [ ] T055 [US2] 全量不變量：執行 `npx mocha tests/dujs/reachabilityinvariant.js`；US2 若新增或消除 finallyExit 根因的 pair，更新 `tests/dujs/cases/reachability-allowlist.json`（附見證、過期即刪）；允許清單外 0 違反（關掉 (c) 仍違反者停止並回報，FR-008）
- [ ] T056 [US2] golden：依「共通約定」更新並重產相對 `2035c93` 的累積淨差異到 `specs/008-property-defs-method-calls/golden-diff.md` 的「US2」敘述節（預期新增 `放寬` 類；新增呼叫點使段後綴位移的行列入「段結構改變行」）；`--verify` exit 0；`npm test`、`npm run lint` 全綠；manifest 依共通約定手動同步（含 `added` 檔名增刪：預期 `expected-es2015` 新增 `page0/inter-procedurals/2.*`、`3.*` 共 8 檔，不記雜湊）；預期 `成員目標`／`放寬` 帶出新模型的 pair 歸 `層級新增` 子標（D022）；另跑 `node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --report`（不寫 mdn-diff），只檢查有無歸不進類別者，有則先處理（D020 C1）

**Checkpoint**: US1＋US2 完成；golden 收尾（之後不再改 golden），golden-diff 釘選列與段結構改變行待使用者簽核。

---

## Phase 5: User Story 3 - 無法到達的程式碼不產生 pair（Priority: P2）

**Goal**: 以 Foundational 建立的獨立檢查器完成 US3 的 pair 驗收與允許清單定稿（FR-006～FR-008、FR-013 已於 Foundational 完成；D003、D005、D015）。

**Independent Test**: `npx mocha tests/dujs/reachability.js tests/dujs/reachabilityinvariant.js`：P13–P24、P38–P41 的 pair 與可達集合；probes、golden、MDN 全量允許清單外 0 違反、0 過期，每項附見證。

### Tests for User Story 3

- [ ] T057 [US3] 擴充 `tests/dujs/reachability.js`：US3 情境 1–3 的 pair 斷言（P13 intra-page 只有 `A: L2 -> L8`；P14、P15、P18、P19、P20 沒有 spec 所列無返回呼叫之後的 pair，P14 intra(f) 仍有 `y: L4 -> L5`；P16、P17 與 develop 相同 `x: L4 -> L7`、`x: L6 -> L4`）＋檢查器全開無違反
- [ ] T058 [US3] 擴充 `tests/dujs/reachability.js`：US3 情境 5 的 pair 斷言——P21、P23、P24 結果與 `probes/baseline-develop.txt` 相同（P21 `x: L1 -> L11`、P23 `x: L11 -> L14`、P24 `x: L1 -> L11`），並由允許清單放行（檢查器部分已由 T018 涵蓋，兩者都保留）
- [ ] T059 [US3] 擴充 `tests/dujs/reachability.js`：US3 情境 7 的 pair 斷言（FR-013）——P38、P39、P40 的 inter-procedural 與 intra-page 沒有 spec 所列的決策節點 p-use pair，仍有 P38、P40 的 `f: entry -> L3`、P39 的 `f: entry -> L3`、`f: entry -> L8`；intra-procedural（頁面）與 `probes/baseline-develop.txt` 逐字相同；檢查器全開無違反
- [ ] T060 [US3] 擴充 `tests/dujs/reachability.js`：US3 情境 8 的 pair 斷言——P41 的 pair 與 baseline 相同（inter-procedural 只有 `h: entry -> L8`、`r: entry -> L6`、`r: entry -> L9`；可達集合已由 T014 涵蓋）

### 允許清單定稿

- [ ] T061 [US3] 依 US1／US2 後的最終行為定稿 `tests/dujs/cases/reachability-allowlist.json`（US3 情境 4、SC-005、FR-008）：重跑全量不變量，每項通過差分判準、`witness` 與當次輸出逐字相同、無過期項；關掉 (c) 仍違反者依 FR-008 修正（屬本 feature 範圍）或停止並發 DECISION；golden 的允許清單項逐項寫入 `specs/008-property-defs-method-calls/golden-diff.md` 的「可到達性允許清單」節（程式、模型、pair、見證，與 json 相同；`--verify` 仍 exit 0）；MDN 項留待 T063 寫入 `mdn-diff.md`；P21、P23、P24 的見證與 probes 項目供 T066 寫入 KI §38
- [ ] T062 [US3] US3 階段檢查：`npm test` 全綠、`npm run lint` 0、不變量允許清單外 0 違反與 0 過期；golden `--verify` exit 0（本階段不改 golden）；`node specs/008-property-defs-method-calls/probes/run.js` 全量對照 SC-002（P1–P21、P23–P42 符合情境、P22 不變）

**Checkpoint**: 全部 user story 完成；允許清單定稿並附見證。

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T063 MDN 驗證（FR-010、SC-004）：`node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --report` 對 33 檔與 `specs/008-property-defs-method-calls/mdn/baseline-develop/` 比對，寫入 `specs/008-property-defs-method-calls/mdn-diff.md`（淨差異、段結構改變行、重複列數、釘選草擬；「可到達性允許清單」節列 MDN 項）；全部檔案完成分析、結束碼與基準相同；確認 `a05-assessment-main.js` 三個 `evilBall` 呼叫連結；`無法到達` 類預期 0 筆（若出現依 contracts/diff-check.md §2 附檢查器輸出或 DECISION）；歸不進類別者先在 `docs/known-issues.md` 記為新已知問題再以 KI 類記錄；`diffcheck.js mdn --verify specs/008-property-defs-method-calls/mdn-diff.md` exit 0
- [ ] T064 效能（SC-006，R11）：`node specs/006-eslint-scope/tools/perf.js .` 同機 3 輪中位數＋golden CLI 時間，寫入 `specs/008-property-defs-method-calls/perf.md` 的「008」表與比值；總分析時間 ≤ develop × 2，超過即回報並停止（檢查器不計入）
- [ ] T065 更新 `docs/known-issues.md` 第一部分（FR-011 (a)(b)(f)）：§22 標題與開頭 feature 摘要段落補上 008；§22 (1) 加「`o` 不再被成員賦值定義（部分修正）」，不標完全修正；新增後續 KI：選項 B（`o.p = v` 定義 `o.p`、讀 `o.p` 使用 `o.p`、重新定義 `o` 時殺掉 `o.p`），成本 `lib/dujs/var.js:48`、`lib/dujs/defuseanalyzer.js:77`／`:600`、`lib/dujs/outputwriter.js:394-432`（行號以 `2035c93` 計，D020 analyze I2），all-uses 損失例 P25；§23 標為已修正（保留原描述，前加修正說明），記 `var` 不放寬（D002）、宣告與賦值分開不放寬、忽略執行順序（P34）
- [ ] T066 更新 `docs/known-issues.md` 第二部分（同檔，依賴 T065、T061、T063；FR-011 (c)(d)(e)(f)(g)）：(c) §22 (5) 寫成「除 §38 的 `finally` 情形外已修」，附查核範圍（probes、golden、MDN；四層模型）與 FR-013 的修正（P38–P40）；§38 補 P21、P23、P24 三種形態與允許清單見證（取自 `tests/dujs/cases/reachability-allowlist.json`），記窄修候選「`finally` 沒有可到達的非例外進入時，finallyExit 不帶出正常路徑」；(d) 測試 helper 對無行號節點標 `Lnull`（P18）；(e) §22 (4) 補 D004 凍結的 `localStorage` 缺口（`localStorage[k]` 不讀 `k`；`=`、`.a.b`、解構不讀 `localStorage`；解構與 `for…in` 有定義卻不是儲存定義節點；`x = (localStorage.k = 1)` 不是儲存定義節點）；(g) 新 KI：巢狀賦值通用缺口（D012；形態 `y = (x = 5, 3)`、`y = [x = 6]`、`y = f(x = 7)`、`[y] = x = [8]`、`o.t = [n++]`、`this.p = x = 1`、`f().p = x = 2`、`o.a.b = x++`，實例 `tests/golden/fixtures/es2015/app.js:22` 的 `nextId++`）；(f) 本 feature 的行為變更（外溢、防護解除、D013 新讀取）、限制與 T047／T056／T063 的新發現新增章節
- [ ] T067 [P] 更新 `README.md`（FR-012）：Limits 段「assigning to `a.b` defines `a`」改寫為成員賦值是物件變數的使用、不追蹤屬性層級的資料流；解析規則加入函式中 `o.m()` 的放寬與限制（只 `const`／`let`、宣告與賦值分開不放寬、忽略執行順序）；L173 的兩句過期敘述（「`o.m()` … `o` has a property assignment in between (`o.p = 1` defines `o`)」與「`o.m()` in a function when `o` is defined outside it (known-issues §23)」）刪除或改寫；L187 為 Limits 段「assigning to `a.b` defines `a`」；L175 為放寬規則的落點（行號以 `2035c93` 計）
- [ ] T068 建立 `specs/008-property-defs-method-calls/docs-check.md`（SC-007；依賴 T065–T067）：FR-011 (a)–(g) 與 FR-012 每一項一列（項目、檔案位置、核對結果）；`grep -n "defines <code>a</code>\|defines <code>o</code>\|known-issues §23)" README.md` 無輸出
- [ ] T069 執行 `specs/008-property-defs-method-calls/quickstart.md` 全流程（§0–§6）：`npm test`、`npm run lint`、`probes/run.js`、`probes/run-pages.js`、`npx mocha tests/dujs/reachability.js tests/dujs/reachabilityinvariant.js`、classify／diffcheck 自我測試、golden 與 mdn `--verify` 皆 exit 0、perf、docs-check；並確認：`git -C /Users/chengfulin/Documents/Personal/dujs diff --stat 2035c93 -- eslint.config.js` 只有 T003 新增的 `probes008` ignore（含註解共兩行）；`git diff --stat 2035c93 -- lib` 只含 `defuseanalyzer.js`、`usedexpressions.js`、`bindingpattern.js`、`scopebinding.js`、`callresolver.js`、`hierarchy.js`；`git diff --quiet 2035c93 -- lib/esgraph specs/005-summary-analysis/tools specs/006-eslint-scope/tools specs/007-split-call-nodes/tools eslint-suppressions.json` 為 0；`lib/dujs/reachingsolver.js`、`summary.js`、`expansion.js`、`callsplit.js`、`tests/helpers/analyze.js` 未改；008 `tools/` 自 T011 首次 commit 後的修改皆有 DECISION
- [ ] T070 **PR 前提醒（需使用者本人，不得略過）**：通知使用者簽核 `specs/008-property-defs-method-calls/golden-diff.md`（US2 golden 收尾後）與 `specs/008-property-defs-method-calls/mdn-diff.md`（T063 後）的「釘選與簽核」列與「段結構改變行」表（逐列）；簽核前簽核欄維持「草擬，待簽核」，未簽核的 golden 變更不得合併（FR-009、SC-003）；不同意之列回到對應階段修正後整表重產並重跑 `--verify`。PR 目標 `develop`

---

## analyze 裁決（D021–D022，Fable 2026-11-18）

- **D021 = A**：US1 情境 14（s10）的 `x: L3 -> L13`／沒有 `x: L6 -> L13` 隱藏相依 FR-004（US2）。US1（T034、T045）只驗 `o` 的部分；`x` 的部分由 US2（T048、T054）驗收。spec 終態不變。
- **D022 = A**：diffcheck 的模型對應以「頁 × 層級」聯集比對 pair（不依模型檔編號逐檔比；es2015 基準 `inter-procedurals/1` 在 008 變成 `3`），並沿 007 判準加 `層級新增` 子標（+ pair 以相同（變數、def、use）存在於基準側同頁 `intra-pages`）。於 T008、T009 實作並附自我測試 fixture，在 T011 首次 commit 前定案（contracts/diff-check.md §1、§2 同步）。
- **D023 = A 收緊版**（implement Setup，主對話＋Fable）：diffcheck 補 `成員目標（摘要）`（matching `~`，FR-003，四條逐元素判準）、`成員目標（列消失）`（row −，FR-001）、觸發行本身的純改標併入 `外溢`／`放寬` 位置條件；各附正反 fixture，於 T011 首次 commit 前定案（contracts/diff-check.md §2 同步）。
- **D024 = A 收緊版**（implement Setup，主對話＋Fable）：(b) 加第 5 條（新連結 callee 集合 N(f) 帶出的 gen／exceptional／upwardExposed 新增元素，三項全成立）；matching 檔以頁×層級內 mainScope 配對；共通須摘要標記相同；各附反例 fixture。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**：無相依；T001 最先；T004、T005 必須在任何 lib 變更前完成；T010 必須在工具首次 commit（T011）前完成。
- **Foundational（Phase 2）**：依賴 Setup；阻擋所有 story。檢查器 → 全量不變量（報紅）→ FR-013（轉綠）→ 注入重現；scopebinding（T029–T030）與檢查器線獨立。
- **US1（Phase 3）**：依賴 Foundational（T030 的 `isLocalStorageObject`、`isLogicalAssignmentTarget`）。
- **US2（Phase 4）**：**依賴 US1**（P9；golden 累積淨差異依序重產）與 T030 的 `isRelaxedInstance`。
- **US3（Phase 5）**：依賴 US2（允許清單依最終行為定稿）。
- **Polish（Phase 6）**：依賴 US3；T065 → T066 同檔依序；T068 依賴 T065–T067；T070 最後。

### Within Each Phase

- Setup：T001 → {T002, T004, T006, T008} ；T002 → T003（eslint ignore，D020）；T001 → T005（不與 T004 同時）；T006 → T007；{T007, T008} → T009 → T010 → T011。
- Foundational：T012 → T013…T019（同檔依序）→ T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028；T029 → T030（可與 T012–T028 並行）；全部 → T031。
- US1：T032 → T033 → T034 → T035（同檔依序）；T036、T037、T038 可並行；T039、T040 可並行；T041 → T042；T039 → T043；T042、T043 → T044 → T045 → T046 → T047。
- US2：T048 → T049；T050、T051 可並行；T052 → T053 → T054 → T055 → T056。
- US3：T057 → T058 → T059 → T060（同檔）→ T061 → T062。

### Parallel Opportunities

- Setup：T002、T004、T006、T008。
- Foundational：T029–T030（scopebinding）與 T012–T028（檢查器線）。
- US1：T036、T037、T038（不同測試檔）與 propertydefs 測試線；T039、T040。
- US2：T050、T051。
- Polish：T064、T067 可與 T065–T066 並行。

## Parallel Example: User Story 1

```text
T032–T035 tests/dujs/propertydefs.js（同檔依序）
T036 tests/dujs/defuseanalyzer.js（GEN／USE 形態表）
T037 tests/dujs/usedexpressions.js（loopHeadExpressions、getMemberTargetReads）
T038 tests/dujs/summary.js（FR-003 摘要）
T039 lib/dujs/bindingpattern.js ∥ T040 lib/dujs/hierarchy.js
```

## 防線落實對照（plan「tasks 指引」）

| 項目 | 任務 |
|------|------|
| 注入（US3 情境 6：兩端皆不可達、只有定義端不可達、只有 p-use 分支目標不可達、加入允許清單仍拋錯） | T019（四例各自一個 `it`）；FR-013 修正前 P38–P40 違反的注入重現 T028；D015 注入 T014 |
| 陽性對照 P21、P23、P24 | T018（檢查器：全開違反、關掉 (c) 可達、見證）、T025（暫行允許清單）、T058（pair 與 develop 相同） |
| D014（呼叫節點無例外邊、`exceptionalReturn` 斷言反例） | T013（測試）、T020（實作） |
| D015（P41 可達集合，分呼叫點） | T014（測試，含照圖走 return 邊的對照）、T020（實作）、T060（pair） |
| D016（MDN 缺檔／檔數 ≠ 33／sha256 不符即失敗） | T023 |
| D019（generator／async 反例） | T015（測試，含純結構重算的對照）、T020（實作） |
| return 邊 fail-closed | T016、T020 |
| 獨立性守門 | T017 |
| FR-013（先紅後綠） | T025（報紅）→ T026（單元測試）→ T027（lib）→ T028（注入重現） |

## Implementation Strategy

- **MVP**：Setup → Foundational → US1（KI §22 (1) 的核心修正＋檢查器回歸網）。
- **增量**：US2（`o.m()` 放寬，golden 收尾）→ US3（驗收斷言與允許清單定稿）→ Polish（MDN、效能、文件、簽核提醒）。每階段依「共通約定」的統一階段檢查後 commit。

## 任務數

Setup 11（T001–T011）、Foundational 20（T012–T031）、US1 16（T032–T047）、US2 9（T048–T056）、US3 6（T057–T062）、Polish 8（T063–T070），合計 70（D020 新增 T003，其後 ID 順延一號）。
