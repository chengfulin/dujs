# Research：階層模型 stage 2——摘要分析、§18、`finally` 整族與例外路徑

**Feature**: `005-summary-analysis` | **Date**: 2026-11-17 | 探測：`specs/005-summary-analysis/probes/`（`node specs/005-summary-analysis/probes/run.js <檔>`）、
暫存腳本 `<scratchpad>/defs.js`（列出各 intra-procedural 模型的 GEN 與 Def 種類）、`<scratchpad>/d2count.js`（以 eslint-scope 數 D2 候選呼叫點）——暫存不入庫，結論記於各節。

基準：`develop`＝`9e324be`（含 006）；本 branch 的 `lib/` 與 `develop` 相同。`npm test` **1273 passing**（42 s）；Node v24.10.0。全部 probes 於本 branch 重跑，
結果與 spec「探測結果」表一致（P8、P9 拋 `Decision node entry ... lacks its true target`）。

## R0 現況：資料流程如何經過呼叫（被取代的對象）

| 位置 | 現行做法 | 造成的問題 |
|------|----------|------------|
| `lib/dujs/expansion.js` `orderOfCalls` | 被呼叫端在一張攤平圖只複製一份，多個呼叫點共用同一個 entry／exit | exit 的 `return` 邊接到所有呼叫點的 callReturn（P1、P2 的不可實現 pair） |
| `expansion.js` `replayCall` | `moveOutgoingEdges(callSite, callReturn)` 連例外邊一起搬到 callReturn | 呼叫敘述在呼叫**之後**拋錯，帶出返回後的定義（P13 `state: L7 -> L13`） |
| `defuseanalyzer.doAnalysis` | `lib/analyses` worklist：每個前驅一律貢獻 OUT；callReturn 另加 `bypassFilter` | 例外邊帶執行後的定義（P24）；被呼叫端例外經 exit→return 回到呼叫之後（P4） |
| `replay` 的 `event` | 處理器 exit 以 normal 邊接 LOOP RETURN；直接呼叫的同一處理器另有 return 邊 | 由 LOOP 進入、返回直接呼叫之後（P5） |
| `callresolver.resolveVariable` | 嚴格規則；放寬只給 class（004 H3） | 函式內呼叫頁面函式、自身遞迴不連結（P3、P7、P10、P11） |
| `lib/esgraph/index.js` `TryStatement` | catch 本體在 `catchStack.pop()` 之後走訪；`return`／`break`／`continue` 直連目標；finally 末端只接正常後繼 | P17–P23 |
| `usedexpressions`／`findUSESet` | entry 節點的 astNode 是整個本體，走訪本體讀取（006 Q3 只過濾可見性） | P8、P9 拋錯；每個函式多出 `→ entry` 的 pair |

## R1 摘要的資料結構與計算位置（FR-001、FR-009、D4）

- **Decision**：摘要是**函式單元（callee scope）**的性質，存在新模組 `lib/dujs/summary.js` 的每頁表 `Map(Scope → Summary)`（`WeakMap(scopeTree → …)`）。
  計算位置在 inter-procedural 模型**建好之後、分析之前**（`DefUseAnalysisExecutor.buildInterProceduralModelsOfEachPageModels` 中 `buildInterProceduralModels()` 之後）：
  每個 scope 的「摘要圖」＝該 scope 的 intra-procedural 節點（第 1 層）＋**它自己的直接呼叫邊**（第 2 層 hierarchy 的 call edges）以 `expansion.expandShallow` 重播，
  但不放入、不連接被呼叫端節點——被呼叫端以其摘要代表。摘要在第 2 層（call 邊）與第 3 層（LOOP／event 邊）被套用；第 4 層（inter-page）不套摘要。
- `Summary = {normalReturn, gen, mustKill, upwardExposed, exceptional, conservative}`：`gen`／`exceptional` 為 **original VarDef** 集合（`fromNode` 是 intra-procedural
  原始節點），`mustKill`／`upwardExposed` 為 Var 集合；全部排除被呼叫端自己的變數（含其 block scope，`scope.getVariablesIncludingBlockScopes()`）。套用：
  `apply(S, X) = normalReturn ? (X − defsOf(mustKill)) ∪ gen : ∅`；例外離開 `applyExceptional(S, X) = X ∪ exceptional`（D3：不做 KILL）。
- **與攤平圖的關係**：攤平圖結構不變（每個 original 一份 copy，D4／FR-009）。pair 仍在攤平圖上以同一個求解器計算，差別只在「哪些邊貢獻什麼」（R2）：
  callReturn 不吃 exit 的 `return` 邊，而吃 `apply(S, OUT(callNode))`；被呼叫端內部節點吃 entry 的聯集（每個實際呼叫點的 OUT），因此內部 use 只得到可實現的定義
  （FR-002 前半），呼叫之後只得到該呼叫點的 `apply`（FR-002 後半）。對 gen/kill 型（distributive）問題，這等同 meet-over-valid-paths。
- 摘要的 VarDef 套到某張攤平圖時，經 `expand()` 新增回傳的 `flatVarDefOf(originalVarDef)` 對應到該圖的重建 VarDef（`rebuildGenerateSets` 的 map 外露），pair 的 def 端
  因此是該圖的節點，`.dupairs.dot` 標籤不變。
- **Rationale**：只用被呼叫端的摘要就能算出呼叫端，不需要每個呼叫點複製被呼叫端（D4）；`expandShallow` 重用 `replayCall`，callSite 的 GEN 搬到 callReturn、
  `keepGenerateAtCallSite`、class 運算式內部名稱、決策節點前插入 CALL NODE 等規則與攤平圖**同一份程式**，摘要與攤平圖的結果不會分岔。
  `expandShallow` 讀既有 hierarchy 的 edges，不新建 edge，因此不消耗 `hierarchy.nextSeq()`（seq 會出現在 `.hierarchy.dot`，消耗會讓 golden 無謂變動）。
- **Alternatives**：(a) 每個呼叫點複製被呼叫端（cloning）——rejected：違反 D4，圖大小指數成長；(b) 摘要直接在 intra-procedural 圖＋呼叫表上另寫一套轉移——rejected：
  與 `replayCall` 的 GEN 搬移規則重複，易分岔；(c) 在已登記的 inter-procedural 攤平圖上算摘要——rejected：open 模型（R5.2）沒有攤平圖，且被呼叫端節點與摘要
  重複計算。
- **每個 scope 的直接呼叫邊從哪來**：`modelbuilder` 的 `getInterProceduralModelStartFromTheScope` 為每個有呼叫的 scope 建一個 hierarchy 模型（登記的 closed 模型，或只作 unit 的
  frozen open 模型），其 `hierarchy.edges` 恰為該 scope 的直接呼叫；新增 `modelbuilder` 內部表 `callModelOf(scope)` 記錄第一個建出的模型（同一 scope 多次建出的模型直接呼叫相同，
  只有 `back` 旗標不同，`expandShallow` 不看 `back`）。沒有呼叫的 scope 用其 intra-procedural 模型。

## R2 求解器：邊型別決定貢獻（FR-014、FR-002、Q-a）

- **Decision**：新模組 `lib/dujs/reachingsolver.js`（MIT，dujs 自有）取代 `doAnalysis` 對 `lib/analyses` worklist 的使用；所有模型（intra-procedural、inter-procedural、
  intra-page、inter-page）與摘要圖都用它。`IN(n) = ⋃ contribution(p, type, n) ∪ virtual(n) ∪ extraReachIns(n)`：

  | 前驅邊 | 貢獻 |
  |--------|------|
  | normal／true／false／call／onEvent／load／save／`finally`（R6） | `OUT(p)` |
  | exception | `IN(p)`（FR-014：拋錯的敘述視為沒有完成） |
  | return（被呼叫端 exit → callReturn） | 無（由 `virtual` 取代） |
  | 處理器 exit → LOOP RETURN（`event` 重播的 normal 邊） | 無（由 `virtual` 取代） |

  `virtual`：每個呼叫紀錄 d（R9 的 CallSiteRecord，取代現行 bypass 紀錄）——`d.callReturn` 得 `apply(S_callee, OUT(d.callNode))`；`d.exceptionalReturn` 得
  `applyExceptional(S_callee, OUT(d.callNode))`。LOOP RETURN 得 `OUT(LOOP) ∪ ⋃_h (gen_h ∪ exceptional_h)`（R4）。`OUT(n) = (IN(n) − KILL(n)) ∪ GEN(n)`，KILL 沿用
  `computeKILLSet`（含 entry 殺不可見、exit 殺區域）。依賴改變時把受影響節點重新入列（callNode→callReturn、callNode→exceptionalReturn、LOOP→LOOP RETURN）。
- 摘要圖中 entry 的 IN 為**哨兵定義**（R3），其他模型 entry 的 IN 為空（同現況 `start`）。
- **Q-a**：`replayCall`（非決策節點前的呼叫）只把非例外邊搬到 callReturn，例外邊留在 callSite（此時已是 CALL 節點）。CALL 節點 GEN／KILL 已搬走，所以
  `IN(callNode) = OUT(callNode)`＝呼叫前的定義（求 callee、引數時拋錯），被呼叫端正常返回後不再拋錯。決策節點前的呼叫（`beforeDecision`）與運算式中的呼叫維持現況（007）。
  串接的第 2 個以後被呼叫端，其 callNode 是前一個 callReturn（無例外邊），`exceptionalReturn` 取串接首個 callSite 的例外目標。
- **Rationale**：`lib/analyses/index.js` 只能合併前驅 OUT，表達不了「例外邊帶 IN」與「return 邊改由摘要供應」；它是 LGPL 衍生檔，新求解器寫成 dujs 自有模組可避免擴大
  LGPL 檔的修改。現行「callReturn 吃 bypassFilter」被 `apply` 取代：被呼叫端看不到或屬於被呼叫端自己的變數不在 `mustKill`／`gen` 中，自然原樣通過（FR-004）。
- **Alternatives**：替 worklist 加 `edgeValue` 選項——rejected（同上，且 return／LOOP RETURN 的取代仍需另寫）；把會拋錯的節點拆成「拋錯前」節點——rejected：改變 `.dot` 節點。
- 求解器是純函式（回傳 `Map(node → {in, out, generate, kill})`），`doAnalysis` 再把結果寫回節點與 `model.setAnalysisResults`（API 不變）；摘要計算直接用回傳值，
  不寫入任何節點（intra-procedural 原始節點的分析結果是輸出的一部分，不得被摘要計算覆寫）。

## R3 不動點、遞迴回邊、must-KILL 與 upward-exposed uses（FR-003、FR-001）

- **Decision**：以 hierarchy 的 call 邊（含 back 邊）建 scope 呼叫圖，Tarjan SCC，依反拓撲序處理；SCC 內所有摘要從 **⊥＝「無正常返回」**（`normalReturn=false`、
  其餘為空）起算，反覆重算到全部不變。單調性：`normalReturn` 只會 false→true，`gen`／`exceptional`／`upwardExposed` 只增，`mustKill` 只減；有限，必終止。
- **must-KILL 以哨兵求**：摘要圖 entry 的 IN 放每個「被呼叫端可見、且不屬於被呼叫端自己」的相關變數 v 的哨兵 VarDef `⊥v`（新 Def 種類 `Def.SENTINEL_TYPE`，只存在於摘要計算，
  不會進入任何模型的結果）。相關變數＝摘要圖中任一節點 GEN 或 USE 的變數 ∪ 其直接被呼叫端摘要的 `gen`／`mustKill`／`upwardExposed` 的變數。
  `mustKill = {v : ⊥v 不在「正常抵達 exit」的貢獻中}`；`gen = 正常抵達 exit 的非哨兵 VarDef`；`exceptional = 例外抵達 exit 的非哨兵 VarDef`（例外邊貢獻 ∪ 呼叫紀錄的
  `applyExceptional` 以 exit 為目標者）；`upwardExposed = {v : ∃n, ⊥v ∈ IN(n) 且 v ∈ USE(n)} ∪ {v : ∃ 呼叫紀錄 d, ⊥v ∈ OUT(d.callNode) 且 v ∈ upwardExposed(S_d)}`（所有路徑）。
  「正常抵達」＝經 normal／true／false／`finally` 邊；「例外抵達」＝經 exception 邊（含 R6 的 finallyExit 重拋）。
- 哨兵等價於一次 must-analysis（「每條正常路徑都定義 v」⇔「⊥v 到不了正常 exit」），但沿用同一求解器與 `computeKILLSet`，不必另寫交集格。
- **遞迴返回後外層區域變數不受影響**（FR-003 後半、US1-4）：自身遞迴時被呼叫端自己的變數不在摘要中，`apply` 讓外層那次的定義原樣通過。
- **⚠ 與 spec 衝突（需使用者裁決 Q1）**：US1-4 的 `cyc-3.js`（`m(p) { var t = p; this.m(0); y = t; }`）是**無條件遞迴**，`m` 沒有正常返回；依 FR-003「從無正常返回起算」與
  US1-7 的同類情境，L6 不可達，`t: L4 -> L6` 會消失，與 US1-4「仍有 `t: L4 -> L6`」矛盾。建議：US1-4 改用有終止條件的變體（例：`if (p) { this.m(0); }`），保留
  「外層區域變數不被內層汙染」的檢查；原 cyc-3 改為「沒有以 L6 為 use 端的 pair、分析終止」。
- **Alternatives**：從「⊤＝恆等」起算——rejected：spec 明定從無正常返回起算，且恆等起算對無條件遞迴會報出不可達 pair（US1-7）。

## R4 LOOP 與事件處理器（FR-007、US4）

- **Decision**：LOOP 是 intra-page 的「呼叫者」，但不套 must-KILL：`IN(LOOP RETURN) = OUT(LOOP) ∪ ⋃_h (gen_h ∪ exceptional_h)`（h 為該頁全部處理器；無處理器時即 onEvent 邊的 `OUT(LOOP)`）。
  處理器 exit → LOOP RETURN 的 normal 邊不貢獻；處理器 entry 的 IN＝`OUT(LOOP)` ∪ 直接呼叫點的 OUT。
- 效果：由 LOOP 進入只返回 LOOP、直接呼叫只返回該呼叫點（P5：`x: L7 -> L6` 消失）；直接呼叫情境的定義不會經處理器 exit 漏進 LOOP；各處理器（含自己）的 GEN 經 LOOP 互相可見（P26）。
- 處理器中未捕捉的例外：在處理器的摘要中進 `exceptional`，經 LOOP RETURN 回到事件迴圈；頁面層未捕捉的例外：頁面 exit 的前驅已被 `replayLoop` 改接 LOOP，例外邊帶 IN 進 LOOP（US3-5）。
- `replayLoop` 改接 exit 前驅時一併處理 R6 新增的 `finally` 多目標邊（頁面層 labeled break 跳到程式結尾的情形）。

## R5 例外沿呼叫鏈往外（FR-006、D3、US3）

- **Decision**：每個呼叫紀錄的 `exceptionalReturn`＝重播完成後串接首個 callSite 的例外目標（`catch`、`finally` 入口、呼叫端 exit，或頁面層經 `replayLoop` 後的 LOOP）。
  呼叫端沒有 `try` 時，目標是呼叫端 exit——在呼叫端自己的摘要圖中這是「例外抵達 exit」，因而進入呼叫端的 `exceptional`，再沿上一層呼叫往外，直到頁面層／處理器層進 LOOP。
- 可能拋錯的節點以展開前 intra-procedural CFG 的例外邊判定（D3）：摘要圖由 intra-procedural 節點複製，例外邊即 esgraph 的 `mayThrow` 結果。
- 實測對照（現況→預期）：P4 `x: L1 -> L7` 消失；P13 `state: L7 -> L13` 消失（L7 的賦值拋錯帶 IN；L10 呼叫敘述的例外邊移到 CALL 節點）；`us3-3.js` 的 `x: L5 -> L10` 消失、
  `x: L1 -> L10`、`x: L3 -> L10` 出現；P15 經 D2 連結後 `x: L3 -> L12`（另有 `x: L5 -> L12`：L9 `x = 3` 的賦值本身拋錯時帶 IN，屬可實現且不在檢查範圍）。

## R6 `finally` 整族（FR-013、US6）——esgraph 的落點

- **Decision**：在 `lib/esgraph/index.js`（LGPL 衍生，依慣例在檔頭 Modified 清單加一行）修改 `TryStatement`、`ReturnStatement`、`getEntry(Break/Continue)`，並新增：
  1. **非空 finally** 的判定：`getEntry(finalizer) !== getSuccessor(try)`（`finally {}`、`finally { ; }` 沒有節點，視同沒有 finally：例外直接到外層 handler、跳躍直接到目標）。
     這也修正現況「無 catch＋空 finally 時例外接到正常後繼」（P18 的 `r: L9 -> L14` 來源）。
  2. **catch 本體**在 `catchStack` 推入 finally 入口後走訪（`catch` 中拋出的例外先經 finally）。
  3. **跳躍**：`return`／`break`／`continue` 若位於某 `try`（含 catch）內、目標在該 `try` 之外，改接第一個經過的非空 finally 入口，並把（下一個 finally 入口或原目標）登記為該
     finally 的待續目標；巢狀 finally 依序串接。
  4. **finallyExit 節點**（新 FlowNode 型別 `finallyExit`）：非空 finally 只要不是「只由正常完成進入」，就建一個 finallyExit，finally 末端（finally 範圍內、以 normal／true／false
     邊連到 `getSuccessor(try)` 的節點）改接它；它的出邊：正常進入時 normal → `getSuccessor(try)`；例外進入時 exception → 外層 handler（建 `TryStatement` 時 `catchStack` 的頂端）；
     每個待續目標一條新的多目標連接型別 `finally`（`FlowNode.FINALLY_CONNECTION_TYPE`，`MULTI_CONNECTION_TYPE` 之一，`.dot` 以 `label="finally"` 繪出）。
     在 branch splitting **之前**插入（`branchsplitter.redirect` 已逐一處理全部 `CONNECTION_TYPES`，含多目標型別）；建節點順序走訪（`allNodes`）加入 `finally` 型別。
- **資料流程語意**：finallyExit 本身無 GEN／USE；它的 exception 邊依 R2 帶 `IN(finallyExit) = OUT(finally 末端)`＝finally 做完後的定義（US3-6 `r: L10 -> L16`）；finally 末端節點自己的
  例外邊照常帶 IN（spec 註明 `r: L7 -> L16` 不在檢查範圍）。在被呼叫端中，finallyExit 的 exception 邊到 exit 屬「例外抵達」，`finally` 邊（return 的續行）到 exit 屬「正常抵達」。
- **精度**：單一 finally 有多種進入方式時，續行是聯集（例如正常進入的路徑也可能接到 break 目標）——安全的過度近似；spec 的情境（P18–P23、US3-6）每個 finally 只有一種
  非正常進入方式，結果精確。
- **Alternatives**：(a) 依續行種類複製 finally 的節點（javac 作法）——rejected：同一行多個節點、pair 重複列、esgraph 以 `astNode.cfg` 一對一建點，複製需複製 AST 而破壞 scopebinding 的
  識別字身分；(b) 不加節點、讓 finally 末端直接帶多條續行邊——rejected：`FlowNode` 的 normal／exception 各只有一個目標，末端若是決策節點無法改接，且末端自己的例外邊（帶 IN）與重拋（帶 OUT）
  會擠在同一條邊上。
- **對 `.dot` 的影響（需使用者確認 Q2）**：FR-010 只列「邊變化」列入 golden-diff；本設計另在有非空 finally 且非單純正常進入的 `try` 新增一個 `finallyExit` 節點與 `finally` 型別的邊。
  golden 只有 `page0` 的 `parseSaved`（catch 本體 `parsed = []` 可能拋錯 → finally 由例外進入）受影響；MDN 語料沒有 `try`。

## R7 §18：entry 節點不讀本體（FR-008、US5）

- **Decision**：`usedexpressions.usedExpressionsOf` 對 ENTRY／EXIT 節點回傳空（與 `modelbuilder.expressionsEvaluatedAtNode` 一致）；`findUSESet` 移除 `isEntryNode` 分支與
  `binding.isOnFunctionChain` 的使用（006 R6a 的暫行規則）。參數預設值已由 `dujsBodyWithParamInits` 變成本體前的合成敘述節點，entry 不需讀任何東西。
- `isOnFunctionChain` 失去唯一呼叫者：自 `scopebinding` 移除，並移除其單元測試（列入 golden-diff「單元測試期望」）。
- 效果：P8、P9 不再拋錯；所有 `→ entry` 的 pair 消失（diff-check 類別 `§18`，機械判定：use 端為 `entry`）。

## R8 FR-005（D2 放寬）在 scopebinding／callresolver 的判定

- **Decision**：`callresolver.resolveVariable` 在「到達定義為 0 筆」時，除既有的 class 放寬外，加 D2 放寬：條件全部成立才連結——(1) 運算式是 `CallExpression`（`new` 不放寬）；
  (2) 呼叫點所在模型不是頁面 scope（`node.scope` 所屬函式 scope ≠ `scopeTree.root`；方法、欄位初始化式、static block 都算函式內）；(3) `definitionsOnThePage(variable)` 恰 1 筆
  （以 Var＝binding 為鍵，涵蓋宣告、賦值、參數、catch 參數、迴圈綁定、`var` 的 undefined 初值）；(4) 該定義經 `targetOfDefinition` 指向函式 scope；(5) `binding.isRelaxedCallee(variable)`。
- **`scopebinding` 新增 `PageBinding.prototype.isRelaxedCallee(aVar)`**：binding 種類 ∈ {`function`（含 block 內宣告）、`let`、`const`、`namedExpressionName`}。種類判定集中在
  scopebinding（006 唯一來源原則）；「是否函式」由 (4) 的定義種類保證（實測 `defs.js`：`let f = function () {}` 的定義為 `function` 型、range＝函式運算式；具名函式運算式內部名稱
  `fact` 在運算式節點有一筆 `function` 型定義；`var f = function` 另有 undefined 初值 → 2 筆，不連結）。
- block 內函式宣告的 binding 只在 block 內（006 D5），block 外的 `f` 解析不到該 binding → 不連結（P29）；`window.f = …` 不是 `f` 的定義（P30，README 限制）。
- 實測規模（`d2count.js`，以 eslint-scope 判定）：MDN 33 檔共 **4** 個新連結候選（s07 `updateDisplayedImage`、s08 `setGameOver`×2、s10 `updateAllowance`）；golden：
  `es2015` 1（`addTodo`）、`interprocedural` 2（`scale`、`log`），其他 0。
- **Alternatives**：以 eslint-scope 的 `defs`＋write references 數定義——rejected：與 class 放寬既有的 `definitionsOnThePage`（GEN 為準）不一致，且需另處理 `var` 初值。

## R9 FR-010 呼叫配對資訊的輸出格式

- **Decision**：每個有 hierarchy 的模型（inter-procedural、intra-page、inter-page）在 `.graph.dot` 旁輸出 `<index>.matching.json`，節點以與 `.graph.dot` **相同的 `n<k>` 名稱**引用
  （`k = graph[2][0].cfgId + 陣列索引`，抽成 `cfgGraphConverter.dotNodeIds(model)` 供兩者共用）。內容：每個呼叫紀錄（callNode、entry、exit、callReturn、exceptionalReturn、callee、
  呼叫點行號、back、beforeDecision）、LOOP 紀錄（loop、loopReturn、各處理器 entry／exit）、與該模型涉及的摘要（以 `n<k>` 標示定義節點）。格式見 contracts/matching-output.md。
- 路徑產生器規則：進入 callee 的 call 邊與離開 exit 的 return 必須屬同一紀錄；最後一條邊是 exception 型（含 finallyExit 重拋）而抵達 exit 的路徑只能續接該紀錄的
  `exceptionalReturn`（`.dot` 中沒有這條虛擬邊），正常抵達的只能續接 `callReturn`。
- `.dot` 完全不為配對資訊改變；golden 以 manifest 的 `added` 登記新檔，`tests/golden/golden.js` 的檔案清單納入 `*.matching.json`。
- **Alternatives**：寫進 `.dot` 的邊屬性——rejected（FR-010 禁止）；只提供函式庫 API——rejected：CLI 使用者拿不到；單一大檔——rejected：與既有一模型一組檔的慣例不符。

## R10 golden 與 MDN 差異檢查（FR-011、SC-003、SC-005；沿用 006 機制）

- **Decision**：新增 `specs/005-summary-analysis/tools/diffcheck.js`，`require` 006 `diffcheck.js` 已匯出的解析、正規化、multiset 差、報表與 `--verify` 骨架，只替換類別判準；
  golden 基準 `9e324be`（檔頭寫死）；MDN 語料沿用 `specs/006-eslint-scope/mdn/corpus/`，但 **develop 快照需重做**（006 的 `baseline-develop` 是 `584e17d`、006 之前）：
  Setup 以本 branch 未改 lib 的工作樹（＝`9e324be`）產生 `specs/005-summary-analysis/mdn/baseline-develop/`。類別與觸發條件見 contracts/diff-check.md；無法機械歸類到單一原因者
  以「每頁釘選筆數＋必填說明＋使用者簽核」把關（006 F3／N2 慣例）。
- 新增的 pair 只允許 `連結`（FR-005）、`finally`（FR-013）、`例外 IN`（FR-014）三類（SC-005）。

## R11 效能（SC-004：≤ develop 的 2 倍）

- 基準（006 perf.md）：MDN 32 id 約 92–95 ms／輪。新增成本：每個 scope 一次摘要圖求解（SCC 內多輪）、攤平圖求解時 VarDef 對應。D2 新連結在 MDN 只有 4 處，攤平圖成長有限。
- **Decision**：沿用 `specs/006-eslint-scope/tools/perf.js <dujsRoot>`（它從 006 目錄讀語料，對任意 dujs 根目錄量測），另加 golden 3 個 case 的 CLI 時間；結果記入
  `specs/005-summary-analysis/perf.md`，門檻 2.0。摘要依 scope 快取、每頁算一次；哨兵只建「相關變數」。

## R12 測試策略

- 每個驗收情境一個自動化測試（contracts/acceptance.md）；probes 逐字複製到 `tests/dujs/cases/probes005/`。
- **inlining oracle（property test，fast-check）**：產生只用全域變數、無遞迴、無 `try` 的小程式（頁面層敘述＋數個函式，`if`、賦值、讀取、呼叫敘述）；把每個呼叫敘述以被呼叫端本體
  文字展開（`return` 改為 labeled `break`）得到等價的單一程式；每個賦值與讀取帶唯一標記，兩邊的 pair 以標記比對：原程式的 inter-procedural（頁面）模型 pair ＝ 展開後頁面
  intra-procedural 模型 pair。這直接驗證 FR-002 的 context-sensitivity，不依賴人工判讀。
- 摘要單元測試（`summary.js`）：哨兵 must-KILL、`upwardExposed`、SCC 不動點（自身、互相遞迴、無正常返回）、generator／async 保守化、`apply`／`applyExceptional`。
- esgraph 單元測試：`finally` 每種進入方式 × 有無 catch × 空／非空 finally × 巢狀 × 頁面層／函式內的邊結構。

## R13 generator 與 async（FR-001、US1-8）

- **Decision**：`scope.ast.generator || scope.ast.async` 時摘要標 `conservative`：`normalReturn = true`、`mustKill = ∅`、`gen = 正常抵達 ∪ 例外抵達 的定義`（async 在第一個 `await`
  就返回呼叫端，其後的定義與拋錯都可能在呼叫端之後才發生，故合併）、`exceptional` 照算。實測 P28 現況只有 `x: L3 -> L6`／`x: L5 -> L8`，預期加上 `x: L1 -> …`。記入 known-issues。

## R14 已知限制與不處理

- 被呼叫端 entry 不殺「呼叫端同一函式（遞迴）的區域變數」的舊定義：遞迴內層在自己重新定義前讀到外層定義屬既有過度近似（004），本輪不改。
- 單一 finally 多種進入方式時的續行聯集（R6）。
- `window.f = …` 誤連（P30）、運算式中的呼叫與 §16（007）、`o.p = v` 定義 `o`（008）。
