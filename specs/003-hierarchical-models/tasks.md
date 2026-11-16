---

description: "Task list for feature 003-hierarchical-models"
---

# Tasks: 階層式模型結構（重構 stage 1）

**Input**: Design documents from `specs/003-hierarchical-models/`（plan.md、spec.md、research.md R1–R17、data-model.md、contracts/、quickstart.md）

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/（皆已 review 並 commit）

**Tests**: 本 feature 要求測試（spec「Independent Test」、plan §CP-4、quickstart §3）；每個 story 含測試任務。

**Organization**: 依 user story 分 phase；US1 依 plan「實作順序」2.1–2.7 拆成步驟，**每步以閘門任務結束**（`npm test`、`npm run lint`、golden 全綠）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、不依賴未完成的任務）
- **[Story]**：US1／US2／US3
- 路徑皆相對於專案根 `/Users/chengfulin/Documents/Personal/dujs`；git 一律 `git -C <專案根>`

## 全程規則（每個任務都適用）

- 既有 .dot（`tests/golden/expected/`、`expected-es2015/`、Setup 產生的 `expected-interprocedural/`）任何差異都是行為改變，**不得**以 `UPDATE_GOLDEN` 放行；`tests/golden/manifest.json` 的 `baseline` 在 Setup 後不得修改。
- 既有測試只允許 research R13 列出的「取值方式」改寫，預期值一字不動；每一筆改寫**當下**記入 `specs/003-hierarchical-models/test-rewrites.md`（檔案、行號、改寫前、改寫後、R13 對應列、空轉檢查證據）。R13 以外的測試失敗、或 N1 外漏消失造成既有測試差異 → **停下請使用者裁決**。
- 不新增 `eslint-suppressions.json` 項目；新模組 MIT 檔頭、ES5 風格（函式內 `'use strict'`、`var`）。
- `<Setup commit>`：T010 完成後 orchestrator 建立的 Setup 基準 commit（orchestrator 記錄於 `.sdd-workflow.json`；未記錄時以 `git -C <專案根> log --diff-filter=A --format=%H -- tests/golden/manifest.json` 取得，即首次加入 manifest 的 commit）。
- `<暫存目錄>`：任意專案外的暫存目錄（例如 `$TMPDIR/dujs-base`），下文同。
- 閘門指令（下文稱「步驟閘門」）：`npm test` 全綠、`npm run lint` 0 錯誤、`git -C <專案根> diff --exit-code eslint-suppressions.json`，以及 golden 基準檢查：
  - **US1 期間**：`git -C <專案根> diff --exit-code <Setup commit> -- tests/golden/expected tests/golden/expected-es2015 tests/golden/expected-interprocedural tests/golden/manifest.json`；
  - **US2 起**（expected 目錄與 manifest 會新增 `.hierarchy.dot`／`added`，不再用上式）：`git -C <專案根> diff --name-status <Setup commit> -- tests/golden/expected tests/golden/expected-es2015 tests/golden/expected-interprocedural` 只有 `A` 開頭且以 `.hierarchy.dot` 結尾的行；manifest 的 `baseline` 與 Setup commit 相同（`node -e` 比對 `git -C <專案根> show <Setup commit>:tests/golden/manifest.json` 與工作目錄檔案中每個 case 的 `baseline`，以 `JSON.stringify` 相等）。

---

## Phase 1: Setup（重構前基準；任何 `lib/` 變更之前）

**Purpose**: plan R11／quickstart §1——以現行（= `bf07818`）程式鎖定 inter-procedural fixture 的扁平輸出與全部 golden 的雜湊基準。

- [X] T001 確認程式是重構前版本：`git -C <專案根> diff --quiet bf07818 HEAD -- lib bin package.json && echo pre-refactor`；並記下基線 `npm test` 786 passing、`npm run lint` 0 錯誤、`eslint-suppressions.json` 119 筆（quickstart §0 的 node 指令）。不符即停下回報
- [X] T002 新增 `tests/golden/fixtures/interprocedural/app.js`，內容**逐字**照 quickstart §1 步驟 2（29 行；`addTo`/`scale`、`isReady`、`onClick`/`log`、`onLoad`、`localStorage.total = total;`），不得增減（不得含 N1 外漏型態與 H4 型態）
- [X] T003 在 `tests/golden/golden.js` 新增 `goldenCase('Golden outputs (inter-procedural fixture)', [['interprocedural/app.js']], <expected-interprocedural 目錄>)`，目錄常數與既有 case 同樣寫法
- [X] T004 只產生新 case 的 expected：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js --grep "inter-procedural fixture"`；確認 `git -C <專案根> status --short tests/golden` 只出現 `fixtures/interprocedural/` 與 `expected-interprocedural/`，且 `tests/golden/expected-interprocedural/` 內為 inter-page 2 個、`page0/inter-procedurals` 6 個、`page0/intra-pages` 2 個、`page0/intra-procedurals` 14 個 .dot
- [X] T005 **必做**交叉驗證：`git -C <專案根> worktree add <暫存目錄>/base bf07818`，接著 `ln -s <專案根>/node_modules <暫存目錄>/base/node_modules`（或在該 worktree 內 `npm ci`），在另一個空的暫存工作目錄以 `node <暫存目錄>/base/bin/dujs.js -js <專案根>/tests/golden/fixtures/interprocedural/app.js` 產生輸出，與 `tests/golden/expected-interprocedural/` 每個 .dot 逐檔 `cmp`（檔案清單也須相同），全部相同才可繼續；另確認 `git -C <專案根> diff --quiet bf07818 HEAD -- tests/golden/expected tests/golden/expected-es2015`。完成後 `git -C <專案根> worktree remove <暫存目錄>/base`
- [X] T006 產生 `tests/golden/manifest.json`：以 Node 內建 `crypto` 對 `expected/`、`expected-es2015/`、`expected-interprocedural/` 每個 .dot 計算 sha256，寫成 data-model §8 的形狀（鍵為 expected 目錄名；`baseline: {相對路徑: sha256}`、`added: []`；路徑以 `/` 分隔並排序）。產生腳本放 `<暫存目錄>`、不入庫
- [X] T007 在 `tests/golden/golden.js` 的 `goldenCase` 新增 contract golden-verification §2 的 #3 `keeps every baseline .dot file byte-identical`（baseline 每一項：實際輸出存在且 sha256 相同，失敗訊息列出檔名）與 #4 `adds exactly the listed new .dot files`（實際清單 − keys(baseline) 排序後 ＝ `added`）；兩者只讀 manifest，`UPDATE_GOLDEN` 不讀寫 manifest
- [X] T008 [P] 先把 `specs/003-hierarchical-models/probes/*.js`（a1、a2、a3、a4、n1、n1b、n1c、r6a、r6b、r6c、r8）逐字複製到 `tests/dujs/cases/probes/`（沿用既有 `tests/dujs/cases/` 測試輸入慣例）；**所有測試只讀 `tests/dujs/cases/probes/` 的副本，不得讀 `specs/` 下的檔案**（`probes/n1-leak-baseline.md` 是紀錄、仍放 specs 目錄）。再於 `tests/dujs/expansion.js`（新檔，MIT 檔頭）新增 `describe('pre-refactor characterization (probes)')`：以 `tests/helpers/analyze.js` 的記法，對 a1、a2、a3、a4、r6a、r6b、r6c、r8（**不含** n1／n1b／n1c）逐一斷言每個 inter-procedural、intra-page、inter-page 模型的 def-use pair，預期值取自**此刻**（重構前）程式的實際輸出。用途：鏈接呼叫（a2 class static）、重複處理器（a2 `h` 註冊兩次、a4 `onA` 註冊兩次）、R8「搜尋的模型不是最頂端模型」（a2 `h` 同時是被呼叫函式與處理器、其內以識別字註冊 `reg`；r8 頁面層 `g`、`h` 內以識別字註冊、`g`、`h` 被呼叫也被註冊，LOOP 的 onEvent 目標序列 `[g, h, g]` 一併斷言）在重構過程中的回歸基準（plan 風險 6；新 fixture 不涵蓋）；另以此刻（重構前）程式對 `tests/dujs/cases/probes/` 的 n1、n1b、n1c 取各 inter-procedural 子模型的 pair（含外漏），寫入 `specs/003-hierarchical-models/probes/n1-leak-baseline.md`（不寫成測試斷言，因為重構後預期改變），供 T043、T060 使用
- [X] T009 [P] 建立 `specs/003-hierarchical-models/test-rewrites.md`：表頭「檔案｜行號｜改寫前｜改寫後｜R13 對應列｜空轉檢查證據」與一節「階層圖人工核對紀錄」（US2 用），供 PR 逐條對照
- [X] T010 Setup 閘門：`npm test` 全綠（786 ＋ 新 case 4 個 `it` ＋ 既有兩個 case 各 2 個新 `it` ＋ T008 的案例）、`npm run lint` 0 錯誤、`git -C <專案根> diff --exit-code eslint-suppressions.json`；回報「可提交為 Setup 基準 commit」（commit 由 orchestrator 執行；此 commit 是之後所有比對的基準）

**Checkpoint**: 重構前基準已鎖定（manifest baseline、expected-interprocedural、probe characterization）；之後才可改 `lib/`。

---

## Phase 2: Foundational

不需要。US1 的 `FlowNode.copyNodes`、`Model` 擴充、`hierarchy`／`expansion` 都是 US1 的手段（spec clarifier M4），US2 依賴 US1 完成、US3 的 (a)(d) 與 US1 無關，沒有跨 story 的共同阻塞前置。

---

## Phase 3: User Story 1 - 各層模型建好後不再被上層改動 (Priority: P1) 🎯 MVP

**Goal**: 上層模型以階層（單位節點參照下層模型＋帶全域 `seq` 的操作）表示，扁平圖由 `expand` 從原件複製並重播產生；intra-procedural／inter-procedural／intra-page 模型建好後不再被改動；每模型保存自己的分析結果並提供唯讀查詢。

**Independent Test**: 既有測試與三個 golden case（#1–#4）全綠；helper 不變性檢查在所有 `analyze()` 測試中執行；`tests/dujs/hierarchy.js` 的 US1 情境 1–7、環防護、計數器測試通過；helper 的兩個繞路已移除。

### 步驟 2.1：FlowNode 複本

- [X] T011 [US1] 在 `tests/esgraph/flownodetest.js` 新增 `FlowNode.copyNodes` 測試：回傳 `Map(原件 → 複本)`；複本 `cfgId`、`type`、`astNode`、`parent`、`line`、`col`、`scope`、`split`、`labelPath`、`isWithObject`、`loopRightSplit`、`discriminantSplit` 與原件相同；每個單一連線槽、多重連線陣列與 `prev`／`next` 逐項轉成複本且**順序相同**；目標不在 Map 中者略去；`kill`、`cuse`、`puse`、`reachIns`、`reachOuts`、`extraReachIns`、`extraReachOuts`、`label`、`nextSibling` 清空；`original` 原件為 `null`、複本指向原件且唯讀；`require('lib/esgraph/flownodefactory')` 的 counter 前後相同；原件的所有欄位與連線不變
- [X] T012 [US1] 在 `lib/esgraph/flownode.js`（MIT）實作 `FlowNode.copyNodes(originals)` 與唯讀屬性 `original`（research R2：以 `new FlowNode(type, astNode, parent)` 建立、直接設 `cfgId`、直接寫內部陣列不經 `connect`、不 require dujs）
- [X] T013 [US1] 步驟 2.1 閘門

### 步驟 2.2：Model 擴充與每模型分析結果

- [X] T014 [P] [US1] 在 `tests/dujs/model.js` 新增測試：`Model.INTRA_PROCEDURAL`／`INTER_PROCEDURAL`／`INTRA_PAGE`／`INTER_PAGE` 常數值（`'intra-procedural'` 等）；`hierarchy` 預設 `null`；intra-procedural 的 `flatNodeOf` 為恆等、不在圖中回傳 `null`、傳入扁平圖節點回傳自己；`analysisResultOf` 未分析或節點不在模型回傳 `null`、回傳紀錄凍結且六個欄位（`reachIns, reachOuts, generate, kill, cuse, puse`）每次都是新的 `Set`（改動不影響模型）
- [X] T015 [US1] 在 `lib/dujs/model.js` 新增 `level`、`hierarchy`、`flatNodeOf(node)`、`analysisResultOf(node)`、`setAnalysisResults(map)`（內部 `_results`、`_flatNodeOf`；contract model-api §1、data-model §2、§6）
- [X] T016 [US1] 在 `lib/dujs/defuseanalyzer.js` 的 `doAnalysis`：轉移函式記下每個節點最後一次使用的 GEN（`currentNode.generate || findGENSet(...)` 的值）、分析後以 worklist 的 inputs／outputs 與節點 `kill`／`cuse`／`puse` 組成紀錄呼叫 `model.setAnalysisResults`（照舊寫回節點欄位）；刪除 `scope.lastReachIns` 寫入（約 229 行）；在 `lib/dujs/scope.js` 刪除 `_lastReachIns` 初始化（約 38 行）與 `lastReachIns` 屬性（約 748–757 行）（research R7）
- [X] T017 [US1] 在 `lib/dujs/modelbuilder.js` 為每個建立的模型設定 `level`（intra-procedural、inter-procedural、intra-page、inter-page），並在 `tests/dujs/modelbuilder.js` 補斷言各層模型的 `level`
- [X] T018 [US1] 步驟 2.2 閘門（輸出不變；golden #2／#3 全過）

### 步驟 2.3：hierarchy.js／expansion.js 與單元測試

- [X] T019 [US1] 新增 `lib/dujs/hierarchy.js`（MIT）：模組層級遞增 `nextSeq()`；`createCallHierarchyModel(mainModel)`；`addCallEdge(model, {callSite, calleeModel, callReturn?, callNode?})`（自動計算 `order`（同一節點 0 起連續）與 `beforeDecision`（只有第一個被呼叫者可能為真）；省略時以 `flownodefactory` 建 CALL RETURN 再建 CALL 樣板，屬性 `line`、`col`、`labelPath`、`scope` 與現況 `_connectCallerCalleeScopeRelatedModelsAtCallSite` 相同；樣板不連邊）；`createIntraPageModel(mainModel, handlerModels)`（先 LOOP 後 LOOP RETURN 樣板、`loop`／`loopReturn`（無處理器時 `noHandler: true`）／`event` 邊，`index` 保留清單重複）；`createInterPageModel(pageModels)`（domain 樣板由呼叫端傳入或以 `cfgBuilder.getDomainScopeGraph()` 建立，load／save 邊，`definingNodes` 含重複）；`freeze(model)` 後 `addCallEdge` 拋錯。inter-procedural 模型的 `mainlyRelatedScope` 與 `relatedScopes` 順序須重現現況 `connectCallerCalleeScopeRelatedModelsAtCallSite`：呼叫端 mainly → 呼叫端 related → 被呼叫端 related（data-model §2），並在 T021 加單元測試斷言此順序。Unit／Edge 欄位依 data-model §3.1、§3.2
- [X] T020 [US1] 新增 `lib/dujs/expansion.js`（MIT）：`nodeOrder(model)`（research R4 三種串列演算法，保留 `concat` 重複）；`expand(model)` → `{graph, flatNodeOf}`：`FlowNode.copyNodes(distinct(order))` → **重播前**對原件 `generate` 非 `null` 的**所有**複本以 `varDefFactory.create(variable, defFactory.create(複本, def.type, range))` 重建 GEN（保留集合順序；`range` 依 `Range` 欄位還原）→ 遞迴蒐集子樹 Edge（物件身分去重、依 `seq` 排序）→ 在複本上執行 data-model §3.2 各 kind 的動作（`redirectEdges`、`moveOutgoingEdges` 等改邊程式由 `modelbuilder.js` **複製**過來；modelbuilder 的舊函式於 2.4–2.6 移除）；展開中模型堆疊偵測環，拋 `Error('call cycle in hierarchy: <scope 名稱鏈>')`
- [X] T021 [P] [US1] 新增 `tests/dujs/hierarchy.js`（MIT）手建階層單元測試：Unit／Edge 欄位、`seq` 遞增、`order`、`beforeDecision`、樣板建立次序（CALL RETURN 先於 CALL；LOOP 先於 LOOP RETURN）與屬性、`relatedScopes` 順序（呼叫端 mainly → 呼叫端 related → 被呼叫端 related，含多層巢狀呼叫）、樣板無邊、`freeze` 後不可再加邊
- [X] T022 [P] [US1] 在 `tests/dujs/expansion.js` 新增展開單元測試（§TR-7 代表組合）：呼叫點種類（非決策／決策前／鏈接）× 被呼叫者（intra-procedural／inter-procedural 子模型）× 共用被呼叫者（同一原件只有一個複本、各呼叫點接到同一份）；`nodeOrder` 與手算陣列逐項相同；純函式（原件與下層模型的圖、GEN／KILL 前後快照相同）；`flownodefactory` counter 前後相同；展開兩次結構相同、物件不同
- [X] T023 [US1] 在 `tests/dujs/expansion.js` 新增 GEN 重指測試：對展開結果**每個**複本的 `generate` 的每個 VarDef，`def.fromNode` 都是本扁平圖的複本（不是原件）；`function f(v) {} var x; f(x = 1);`（非決策呼叫點）的 CALL RETURN 複本 GEN 含 `x`，且其 `fromNode` 為複本
- [X] T024 [US1] 在 `tests/dujs/expansion.js` 新增環防護測試：以 `hierarchy.createCallHierarchyModel`／`addCallEdge` 手建 A→B→A，`expansion.expand` 拋出訊息以 `call cycle in hierarchy` 開頭的 Error 並終止（mocha timeout 內完成）
- [X] T025 [US1] 在 `tests/dujs/expansion.js` 新增手建階層的鏈接呼叫與重複處理器測試：鏈接時第二條邊的 `callSite` 是第一條的 CALL RETURN 樣板、`order` 為 0、1、`beforeDecision` 為 `false`，扁平圖鏈接順序同現況；`createIntraPageModel(main, [h, h])` 的扁平圖中 `h` 的節點重複出現且為**同一個複本物件**，陣列與 `concat` 結果相同（參考 probes a2、a4）
- [X] T026 [US1] 步驟 2.3 閘門（此步尚未接入 modelbuilder，輸出必然不變）

### 步驟 2.4：inter-procedural 改為建階層＋展開

- [X] T027 [US1] 改寫 `lib/dujs/modelbuilder.js` 的 `getInterProceduralModelStartFromTheScope`／`buildInterProceduralModels`：走訪與遞迴次序不變，「改接邊」換成 `hierarchy.addCallEdge`（樣板建立時點同現況）；解析被呼叫函式讀呼叫端 intra-procedural **原件**的 `reachIns`；階層建好後 `hierarchy.freeze` 並以 `expansion.expand` 設定 `model.graph` 與 `flatNodeOf`；刪除 `_connectCallerCalleeScopeRelatedModelsAtCallSite` 與 `dujsDecisionCalledBefore` 的 `Object.defineProperty`（約 299 行）；更新 `_testonly_` 暴露清單（contract model-api §5）；新模型的 `mainlyRelatedScope`／`relatedScopes` 順序同現況（呼叫端 mainly → 呼叫端 related → 被呼叫端 related，data-model §2），因 `buildInterProceduralModels` 的 `searchedScopes`、`addInterProceduralModelToAPage`（`relatedScopes.length > 1`）與 helper 的 `interProceduralScopes()` 依賴此順序；在 `tests/dujs/modelbuilder.js` 新增真實建模斷言（巢狀呼叫鏈的 `relatedScopes` 陣列逐項相同於重構前）
- [X] T028 [US1] 修正本步造成失敗的既有測試，**只限 R13 列**並逐筆記入 `test-rewrites.md`：`tests/dujs/modelbuilder.js` 的 `_connectCallerCalleeScopeRelatedModelsAtCallSite` 私有測試改為手建階層＋`expand`、`should.eql(原圖節點)` 改比對 `node.original`（位置、長度、種類不變）；`tests/dujs/branchsplit.js` 約 755 行 `found.nodes[1].dujsDecisionCalledBefore === found.nodes[3]` 改為找出 `flatNodeOf(edge.callNode)` 為 `found.nodes[1]` 的 call 邊，斷言 `edge.beforeDecision === true` 且 `model.flatNodeOf(edge.callSite) === found.nodes[3]`；`tests/dujs/branchsplit.js` 約 476 行與 `tests/dujs/reviewfixes.js` 約 82–91、113、149、220 行中**本步已失敗**的身分斷言改為比對 `flatNodeOf(原件)`。其他失敗 → 停下裁決
- [X] T029 [US1] 在 `tests/dujs/expansion.js` 新增 builder 層級測試（真實建模）：probe a1（`f(x = 1);` 非決策、`if (g())` 決策前、`while (g())`／`for (...; g(); ...)` 迴圈決策）的 inter-procedural 扁平圖為「前驅 → call → 被呼叫者 → callReturn → 決策節點」、CALL RETURN 的 GEN 含 `x` 且 `fromNode` 為複本；鏈接呼叫以 probe a2 的 class static 與 `tests/dujs/classfields.js` 情境驗證「前一個 CALL RETURN 是下一個呼叫的呼叫點」（probe 皆讀 `tests/dujs/cases/probes/`）；T008 characterization 全過
- [X] T030 [US1] 步驟 2.4 閘門（`Golden outputs (inter-procedural fixture)` #2／#3 是主要把關；若有差異停下比對 R1 的鄰接順序，不得更新 golden）

### 步驟 2.5：intra-page 改為建階層＋展開（R8 讀法）

- [X] T031 [US1] 改寫 `lib/dujs/modelbuilder.js` 的 `buildIntraPageModel`：以 `hierarchy.createIntraPageModel` 記錄 LOOP／LOOP RETURN／event 邊，處理器清單保留現況 `concat` 的順序與重複；新增 `_reachInsForHandlerLookup(n)`（`o = n.original || n`；在該頁 inter-procedural 模型中依分析次序**由後往前**找第一個 `analysisResultOf(o) !== null` 者回傳其 `reachIns`，都沒有則回傳 `o.reachIns`）；`getRegisteredEventHandlerCallback(graphNode, scopeTree, callExpression, reachIns)` 新增可選的第 4 參數 `reachIns`，省略時沿用 `graphNode.reachIns`；`findEventHandlerModelsFromAModel` 以 `_reachInsForHandlerLookup(graphNode)` 取得後傳入；既有測試 `tests/dujs/modelbuilder.js` 約 165 行（3 參數呼叫）不動；`expand` 設定扁平圖；刪除 `_connectLoopNodeToPageGraph`、`_connectPageAndEventHandlers`；更新 `_testonly_`
- [X] T032 [US1] 修正本步造成失敗的既有測試（只限 R13 列，逐筆記入 `test-rewrites.md`）：`tests/dujs/modelbuilder.js` 的 `_connectLoopNodeToPageGraph`、`_connectPageAndEventHandlers` 私有測試改為手建階層＋`expand`、比對 `node.original`，預期值不變；其他本步失敗的身分斷言改 `flatNodeOf(原件)`；R13 以外失敗 → 停下裁決
- [X] T033 [US1] 在 `tests/dujs/modelbuilder.js` 新增 R8 與重複處理器測試：probe a2（`h` 被頁面呼叫且註冊為處理器、`h` 內以識別字註冊 `reg`——搜尋 `h` 的處理器模型時，該節點的最頂端 inter-procedural 模型不是正在搜尋的模型）找到的處理器集合與 pair 與 T008 相同；`_reachInsForHandlerLookup` 對「有多個 inter-procedural 模型含該原件」回傳最後分析者的結果、對「只建不分析」退回 intra-procedural `reachIns`；probe a4（`onA` 註冊兩次）intra-page 處理器清單保留重複；probe r8 的 intra-page 扁平圖 LOOP onEvent 目標（處理器 entry 的 scope，依邊次序）為 `[g, h, g]`（順序與重複皆同）且與 T008 基準相同；probe 皆讀 `tests/dujs/cases/probes/`
- [X] T034 [US1] 步驟 2.5 閘門

### 步驟 2.6：inter-page 改為建階層＋展開

- [X] T035 [US1] 改寫 `lib/dujs/modelbuilder.js` 的 `buildInterPageModel`：domain 以 `cfgBuilder.getDomainScopeGraph()` 在與現況相同的時點建立（`cfgId` ＝ 之前建立過的節點總數）；以 `hierarchy.createInterPageModel` 記錄 load／save 邊（`definingNodes` 為原件、含重複、順序同 `getNodesWhereDefiningLocalStorageObject`）；`expand` 設定扁平圖；刪除 `_connectDomainScopeGraphToModelOfPages`；更新 `_testonly_`
- [X] T036 [US1] 修正 `tests/dujs/modelbuilder.js` 的 `buildInterPageModel` 斷言（R13 列）：`page1IntraPageModel.graph[2][2].saveStorage.should.eql(graph[0])` 改為 `interPageModel.flatNodeOf(page1IntraPageModel.graph[2][2].original).saveStorage === graph[0]`；`loadStorage[i]` 改比對 `.original`；逐筆記入 `test-rewrites.md`；其他失敗 → 停下裁決
- [X] T037 [US1] 確認 `lib/dujs/modelbuilder.js` 已無任何對原件或樣板的改邊／改型／GEN-KILL 搬移（grep `connect(`、`disconnect(`、`redirectEdges`、`moveOutgoingEdges`、`.type =`、`.generate =`、`.kill =`，殘留者只能出現在 `lib/dujs/expansion.js`），並跑步驟 2.6 閘門。至此 intra-procedural 原件不再被改動

### 步驟 2.7：測試掃描、helper、情境測試

- [X] T038 [US1] 以 grep 找出 `tests/` 中所有「intra-procedural 原件與上層模型節點比身分」的斷言（`===`、`should.equal`、`should.eql(<節點>)`、`indexOf(`、`callersOf(`、`.call ===`、`graph[2].filter(... node === ...)` 等以下層節點查上層圖者；至少涵蓋 `tests/dujs/branchsplit.js`、`tests/dujs/reviewfixes.js`、`tests/dujs/classfields.js`、`tests/dujs/modelbuilder.js`、`tests/dujs/pagemodels.js`、`tests/dujs/nestedfunctions.js`），列成清單；尚未改寫且會因上層為複本而**靜默通過**者改為比對 `model.flatNodeOf(原件)`，預期值不動，逐筆記入 `test-rewrites.md`
- [X] T039 [US1] 空轉檢查：對 T028／T032／T036／T038 改寫的**每一條**斷言，確認它仍實際檢查到節點（例如 `tests/dujs/reviewfixes.js` 約 82–91 行 `callersOf(model, staticEntry)` 改後 `callers` 不得因比身分失敗而恆為空、使 `belowOrEqual(1)` 與 `forEach` 空轉）；以暫時改壞預期或印出命中數驗證，證據記入 `test-rewrites.md`；發現空轉則修正取值方式（不改預期值）
- [X] T040 [US1] `tests/helpers/analyze.js`：刪除 `branch()` 的「LOOP 分支當 exit」與「`dujsDecisionCalledBefore` 當決策節點」兩個繞路與其註解（約 76–82 行），並刪除因此不再使用的 require；`tests/dujs/branchsplit.property.js` 約 390 行 `isTargetOf` 刪除 `|| target.type === FlowNode.LOOP_NODE_TYPE`；逐筆記入 `test-rewrites.md`
- [X] T041 [US1] `tests/helpers/analyze.js` 加入 research R14 不變性檢查：每個建模階段分析後對新建模型取快照（扁平圖節點陣列、每節點 `cfgId`／種類／各連線種類目標的陣列位置／`prev`／`next` 順序、`analysisResultOf` 六個集合的成員陣列，以物件身分比較），四層完成後重取並比對，差異時拋出指名模型與節點的 Error
- [X] T042 [US1] 在 `tests/dujs/hierarchy.js` 新增 US1 驗收情境測試（quickstart §3）：情境 1（`var a = 1; if (a) { a = 2; }` 四層建完後 intra-procedural `L2` 的 false 仍指向該模型 exit，pair `a: L1 -> L2>exit:F`）；情境 2（known-issues §16 範例 `if (f(x = 1)) { x = 2; }`：intra-procedural `L5` 前驅不是 CALL，inter-procedural 為 前驅 → call → `f` → callReturn → `L5`）；情境 3（SC-003：以 executor 逐段執行 `tests/golden/fixtures` 三個 fixture，每段快照與四層建完後相同）；情境 6（主程式 `f();` 與 `localStorage.x = 1;`：intra-procedural 呼叫點仍為 normal、GEN／KILL 與出邊不變，intra-page 扁平圖的頁面節點沒有 `saveStorage`／`loadStorage`）；情境 7（call 邊的 `caller`、`callee.model`、`callSite`、`order`、`beforeDecision` 可取得，`callee.model.graph` 與建好時快照相同；各上層單位都能取得下層模型）；情境 4、5 由 T040 後全部既有測試與 golden #3 驗證；所用 probe 皆讀 `tests/dujs/cases/probes/`
- [X] T043 [US1] 在 `tests/dujs/hierarchy.js` 新增 N1 不重現測試：`tests/dujs/cases/probes/` 的 n1、n1b、n1c 的 inter-procedural 子模型（`f→h`、`r→c`、`p→r→c` 等）不含外層定義（頁面層 `a = 2`／`p` 內 `a = 3` 等）的 pair；預期值以 T008 記錄於 `probes/n1-leak-baseline.md` 的外漏 pair 為反例逐一列出（spec Edge Cases「行為修正」）
- [X] T044 [P] [US1] 更新 `specs/001-fix-known-issues/contracts/analyze-helper-notation.md`：刪除兩個繞路的說明（FR-007）
- [X] T045 [US1] US1 閘門：quickstart §2 全部指令（含 `FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js`）；`grep -rn "dujsDecisionCalledBefore" lib tests` 無結果、`grep -n "LOOP_NODE_TYPE" tests/helpers/analyze.js tests/dujs/branchsplit.property.js` 無結果；步驟閘門的「US1 期間」golden 基準檢查

**Checkpoint**: US1 完成——四層建完後下層模型的圖與結果不變（helper 不變性檢查覆蓋全部 `analyze()` 測試）、golden 0 差異、繞路 0 處；可單獨交付（MVP）。

---

## Phase 4: User Story 2 - 每個上層模型都有一張階層圖 (Priority: P2)

**Goal**: 每個 inter-procedural、intra-page、inter-page 模型輸出 `<k>.hierarchy.dot`（與 `graph.dot` 同目錄）並在 HTML 報告中於扁平圖之前引用。

**Independent Test**: `tests/dujs/hierarchydot.js` 通過；三個 golden case 的 #1–#5 全過，manifest 只有 `added` 改變；新檔經人工核對並記錄。

- [X] T046 [P] [US2] 新增 `tests/dujs/hierarchydot.js`（MIT）：contract hierarchy-output §2 的格式（`digraph Hierarchy {`、`node [shape="box"]`、`label = "<level>: <main 名稱>"`、`h<n>` 節點 id、檔尾 `}` 無換行）、§2.1 節點標籤與樣式（LOOP `shape="ellipse", style="filled", fillcolor="yellow"`；domain `$DOMAIN` `shape="doublecircle", style="filled", fillcolor="orange"`）、§2.2 節點與邊次序（inter-procedural 深度優先 call／return、intra-page `h0` 主程式 `h1` LOOP 且 `h0 -> h1 [label="loop"]`、inter-page `h0` domain）、同一 `(from, to, 種類)` 只一次、不含 CALL／CALL RETURN／LOOP RETURN；spec US2 情境 1–3；Edge Case：沒有處理器的頁面仍輸出主程式與 LOOP、沒有 storage 的頁面仍有 loadStorage 邊；§2.3 新 fixture 預期（inter-procedurals `1` 為 4 節點 6 邊等）
- [X] T047 [P] [US2] 新增 `lib/dujs/hierarchydot.js`（MIT）：`model.hierarchy` → dot 字串（依 contract hierarchy-output §2）；只依賴 `hierarchy`，不 require `lib/esgraph/dot.js`
- [X] T048 [US2] 修改 `lib/dujs/outputwriter.js`：三個層級每個模型另寫 `<k>.hierarchy.dot`（與同模型 `graph.dot` 同目錄、同索引）並以 `writeImageFileFromDotFile` 產生 `<k>.hierarchy.png`；新增 `interProceduralHierarchyImageFilePaths[page][k]`、`intraPageHierarchyImageFilePaths[page][k]`、`interPageHierarchyImageFilePaths[k]`；既有檔名與寫檔次序不變
- [X] T049 [US2] 修改 `lib/dujs/reportgenerator.js`：`createInterProceduralReportForAPage`、`createIntraPageReportForAPage`、`createInterPageReportForAPage` 每個模型區塊在扁平圖 `<div>` 之前插入 `<div class="col-lg-8 col-lg-offset-2 col-sm-12"><img src="../<階層圖 png>" class="center-block"></div>`；Intra-procedural 段、Source Code 段、tab、script 不變
- [X] T050 [US2] 緊接 T048／T049：`UPDATE_GOLDEN=1 npm test` 產生新 `.hierarchy.dot` golden；`git -C <專案根> status --short tests/golden` 只可出現新增的 `.hierarchy.dot`（任何既有檔變更 → 停下）；把每個 case 的新增清單（排序）寫入 `tests/golden/manifest.json` 的 `added`，`git -C <專案根> diff tests/golden/manifest.json` 只有 `added` 變動。**階層圖輸出程式改動（T047–T049）與本任務的 golden／manifest 更新屬同一個 commit 單位**，使每個 commit 皆綠
- [X] T051 [US2] 在 `tests/dujs/hierarchy.js` 新增 contract hierarchy-output §3 的自動化對應檢查：對三個 golden fixture，每個上層模型的階層節點 ↔ 扁平圖 entry 所屬 scope（inter-procedural）／LOOP onEvent 目標（intra-page）／localStorage 與頁面（inter-page），邊 ↔ 扁平圖 call／return／onEvent／loadStorage／saveStorage 邊（依 §3 表歸併）
- [X] T052 [US2] 人工核對：在暫存目錄對三個 golden fixture 跑 CLI，依 contract hierarchy-output §3 逐一核對 T050 產生的每個新 `.hierarchy.dot`（若發現錯誤，修正程式並重做 T050，仍與程式同一 commit）（含 ES5、ES2015+ 的 intra-page 與 inter-page、新 fixture 的 inter-procedurals `0`／`1`／`2`），結果記入 `specs/003-hierarchical-models/test-rewrites.md`「階層圖人工核對紀錄」
- [X] T053 [US2] 在 `tests/golden/golden.js` 新增 contract #5 `references the hierarchy graphs before the flat graphs in the report`：讀 `out-*/report.html`，每個階層圖 png 路徑出現且 `indexOf(階層圖) < indexOf(同模型 graph png) < indexOf(同模型 dupairs png)`；移除 `.hierarchy.png` 的 `<div>` 後其餘 `<img src>` 序列與既有路徑序列相同（不依賴 Graphviz）；並更新 `README.md` 的 golden 說明段（以 ``tests/golden/` runs the CLI`` 開頭的段落）：加入 `tests/golden/manifest.json`（baseline／added）、`expected-interprocedural/` 與新 fixture、`.hierarchy.dot` 階層圖
- [X] T054 [US2] US2 閘門：quickstart §2 與 §4（`page0/inter-procedurals/{0,1,2}.hierarchy.dot`、`page0/intra-pages/0.hierarchy.dot`、`inter-page/0.hierarchy.dot` 存在）；步驟閘門的「US2 起」golden 基準檢查

**Checkpoint**: US2 完成——SC-004 達成，既有 .dot 仍 0 差異。

---

## Phase 5: User Story 3 - 清理 known-issues §9 的程式風格與紀錄 (Priority: P3)

**Goal**: §9 四點處理完畢；known-issues 依 FR-012 更新（含 N1 新節與重現程式）。

**Independent Test**: quickstart §5 的三個 grep 符合預期；全部測試、golden、lint 通過；known-issues 人工檢查通過。

- [X] T055 [P] [US3] (a) `lib/esgraph/index.js` 檔頭「Modified by」新增兩行（`2026-11-16: expressionThrows returns false for a null expression`、`2026-11-16: a ClassDeclaration is a leaf in createNodes`，措辭對照程式），`THIRD_PARTY_NOTICES.md` §1 Modifications 新增對應兩點；不改程式（FR-011a、FR-014）
- [X] T056 [P] [US3] (d) `lib/dujs/jsparser.js` 的 catch 改為有綁定 `catch (ignoredModuleError)`；`eslint.config.js` 的 `no-unused-vars` 加 `caughtErrorsIgnorePattern: '^ignored'`（規則設定，非抑制項）；`npm run lint` 0 錯誤且 `eslint-suppressions.json` 不變（FR-011d、FR-013）
- [X] T057 [US3] (b) `lib/dujs/defuseanalyzer.js`：把插入在 JSDoc 與其函式之間的 helper 移開，使每段 JSDoc 緊接其函式；`isFunctionExpression`、`getDefinedVariables`、`computeKILLSet`、`useClassHead`、`useNestedLoopHead` 各補 JSDoc；清掉 `analyzeBuiltInObjects`、`findVariableAndItsDefinitionsFromASet` 等前方的錯位 JSDoc（依賴 T016；FR-011b）
- [X] T058 [US3] (c) `lib/dujs/defuseanalyzer.js` 刪除 `DefUseAnalyzer.prototype.findKILLSet`（約 340 行起）；`grep -rn "findKILLSet" lib tests` 無結果（FR-011c）
- [X] T059 [US3] `docs/known-issues.md`：§9 標為已修正（逐點寫明 (a)–(d)，並記錄 `caughtErrorsIgnorePattern: '^ignored'` 規則設定與理由）；§13 註明「intra-procedural 分支被改接到 LOOP」已修正、helper 的 LOOP 繞路已移除；§16 註明共用節點被改動與 `dujsDecisionCalledBefore` 繞路已移除、呼叫順序語意保留待 stage 2；§18 註明移到 stage 2（D4）（FR-012；依賴 US1 完成）
- [X] T060 [US3] `docs/known-issues.md` 新增一節（接在 §18 之後，標題含「已於 003 修正」）：以統一定義描述 N1 外漏——「子模型呼叫鏈上任一函式（根函式或其任一祖先）被呼叫兩次以上或在迴圈內呼叫時，子模型分析沿共用節點的邊漏到外層，出現外層定義的 pair」；機制（被呼叫函式 exit 多出指向其他 CALL RETURN 的 `return` 邊，research R6）；附重現程式（`probes/n1b.js`：page 呼叫 `p` 兩次、`p` 呼叫 `r`、`r` 呼叫 `c`，與 `probes/n1.js` 的直接型）與修正前／後 `r→c` 子模型的 pair 差異（修正前取自 `probes/n1-leak-baseline.md`，修正後取自 T062）
- [X] T061 [US3] 更新 `docs/known-issues.md` 開頭的索引／分組（若有列出各節），使新節與 §9、§18 的狀態一致
- [X] T062 [US3] 重現證據：以目前分支對 probes n1、n1b、n1c 取 inter-procedural 子模型的 pair（不含外漏），與 `probes/n1-leak-baseline.md`（T008，重構前）對照列出差異，供 T060 使用（此任務可在 US1 步驟 2.4 完成後任何時間執行）
- [X] T063 [US3] US3 閘門：quickstart §5 三個 grep；人工檢查 `defuseanalyzer.js` 每段 JSDoc 與 known-issues §9／§13／§16／§18／新節；`npm run doc` 成功；步驟閘門

**Checkpoint**: US3 完成——SC-005 達成。

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T064 全量驗證：quickstart §2 全部指令；`npx c8 npm test` 確認 `lib/dujs/hierarchy.js`、`lib/dujs/expansion.js`、`lib/dujs/hierarchydot.js` 與 `FlowNode.copyNodes` 有測試覆蓋；`eslint-suppressions.json` 仍 119 筆
- [X] T065 基準完整性：`git -C <專案根> diff <Setup commit> HEAD -- tests/golden/expected tests/golden/expected-es2015 tests/golden/expected-interprocedural` 只有新增的 `.hierarchy.dot`；`manifest.json` 只有 `added` 變動；`git -C <專案根> diff bf07818 HEAD -- bin lib/esgraph/dot.js lib/analyses` 為空；`git -C <專案根> diff bf07818 HEAD -- lib/esgraph/index.js` 濾掉檔頭「Modified by」修改紀錄（T055）後為空（plan「明確不受影響」）
- [X] T066 整理 `specs/003-hierarchical-models/test-rewrites.md`：每一筆改寫都有改寫前／後、R13 對應列、空轉檢查證據；`tests/dujs/modelbuilder.js` 私有測試的改寫（plan 風險 7）逐條列出；確認無 R13 以外的改寫
- [X] T067 準備 PR（目標 `develop`）：以 Skill `mattpocock-skills:pr` 撰寫內容，必含 (1) 測試改寫逐條對照清單（取自 `test-rewrites.md`）；(2) 階層圖人工核對紀錄；(3) `eslint.config.js` `caughtErrorsIgnorePattern` 規則設定與理由；(4) LGPL 檔頭／`THIRD_PARTY_NOTICES.md` 修改紀錄；(5) N1 行為修正與 known-issues 新節；(6) golden 驗證（baseline 0 差異、`added` 清單）；(7) 連結 spec（`specs/003-hierarchical-models/spec.md`，憲章 §CP-5）。PR 由 orchestrator 建立

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：無依賴；**必須**在任何 `lib/` 變更前完成並提交（T010 後的 commit 為比對基準）
- **Foundational (Phase 2)**：無
- **US1 (Phase 3)**：依賴 Setup；步驟 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 嚴格依序，每步閘門通過才進下一步
- **US2 (Phase 4)**：依賴 US1 完成（需要 `model.hierarchy`）
- **US3 (Phase 5)**：T055、T056 只依賴 Setup，可與 US1／US2 並行；T057、T058 依賴 T016（`defuseanalyzer.js` 的 `doAnalysis` 改動）且與 US1 同檔，建議在 US1 完成後做；T059 依賴 US1 完成；T062 依賴 T027（2.4）與 T008；T060 依賴 T062
- **Polish (Phase 6)**：依賴所有 story 完成

### Within US1

- T011 → T012 → T013；T014 ∥ T015 起頭，T015 → T016 → T017 → T018
- T019 → T020 → {T021 ∥ T022} → T023 → T024 → T025 → T026（T022–T025 同檔 `tests/dujs/expansion.js`，依序）
- T027 → T028 → T029 → T030；T031 → T032 → T033 → T034；T035 → T036 → T037
- T038 → T039；T040 → T041；T042、T043（T043 需 T008 的 `n1-leak-baseline.md`）；T044 可隨時；T045 最後

### Parallel Opportunities

- Setup：T008 ∥ T009（T007 之後亦可與 T007 並行，檔案不同）
- US1：T014 ∥ T015；T021 ∥ T022；T044 與步驟 2.7 其他任務並行
- US2：T046 ∥ T047；T047 → T048 → T049 → T050（同一 commit 單位）→ T051 → T052 → T053 → T054
- US3：T055 ∥ T056，且兩者可與 US1 任一步並行（檔案不重疊）

## Parallel Example: User Story 2

```text
Task: "T046 [P] [US2] tests/dujs/hierarchydot.js 格式與次序測試"
Task: "T047 [P] [US2] lib/dujs/hierarchydot.js 實作"
```

## Implementation Strategy

### MVP First（只做 US1）

1. Setup（T001–T010）→ 提交基準
2. US1 步驟 2.1–2.7（T011–T045），每步閘門
3. **停下驗證**：golden #1–#4、helper 不變性檢查、情境 1–7 全過 → 可交付 MVP

### Incremental Delivery

1. Setup → US1（MVP）→ US2（階層圖、golden #5、manifest `added`）→ US3（§9、known-issues）→ Polish／PR
2. US3 的 T055、T056 可提早在 US1 期間完成

## Notes

- 任何步驟閘門失敗：先比對 research R1（全域 `seq` 與鄰接順序）、R2（GEN 重指）、R4（節點陣列含重複）；不得以更新 golden 或改預期值處理
- 測試改寫越界、N1 消失造成既有測試差異、或 plan 風險 4（扁平圖節點未被走訪而 `findDUPairs` 拋錯）→ 停下請使用者裁決
