# Data Model：摘要分析、呼叫配對與 `finally` 續行

**Feature**: `005-summary-analysis` | 設計理由見 [research.md](./research.md)；API 見 [contracts/lib-api.md](./contracts/lib-api.md)。

## 1. Summary（`lib/dujs/summary.js`，每個 callee scope 一份）

| 欄位 | 型別 | 意義 | 規則 |
|------|------|------|------|
| `scope` | Scope | 被呼叫端（函式、方法、constructor、欄位初始化式、static block、事件處理器） | 每頁每 scope 唯一 |
| `normalReturn` | boolean | 有沒有任何正常抵達 exit 的路徑 | 不動點起點 false（R3）；`conservative` 時恆 true |
| `gen` | Set\<VarDef\> | 正常抵達 exit 時有效、由被呼叫端（含其被呼叫端）產生的定義 | original VarDef；不含哨兵、不含被呼叫端自己的變數 |
| `mustKill` | Set\<Var\> | 每條正常返回路徑上都被重新定義的變數 | 哨兵 `⊥v` 到不了正常 exit；`conservative` 時為空 |
| `upwardExposed` | Set\<Var\> | 被重新定義前就被讀取、需呼叫端供應的變數 | 所有路徑；含直接被呼叫端的 `upwardExposed`（呼叫點處哨兵仍在者） |
| `exceptional` | Set\<VarDef\> | 例外離開時可能有效、由被呼叫端產生的定義 | 例外抵達 exit 的貢獻（FR-014：拋錯節點的 IN）；不做 KILL |
| `conservative` | boolean | generator 或 async | R13 |

- **可見性過濾**：`gen`、`mustKill`、`upwardExposed`、`exceptional` 只含「被呼叫端可見（`binding.isVisible`）且不屬於 `scope.getVariablesIncludingBlockScopes()`」的變數（FR-004、Edge Cases）。
- **套用**：`apply(S, X) = S.normalReturn ? (X − {d ∈ X : d.variable ∈ S.mustKill}) ∪ S.gen : ∅`；`applyExceptional(S, X) = X ∪ S.exceptional`。
- **生命週期**：`summary.computeForPage(scopeTree)` 在 inter-procedural 模型建好後執行一次（R1）；`summary.reset()` 隨 `tests/helpers/analyze.reset()` 清除（以 `WeakMap(scopeTree)` 存放，換頁自然失效）。

## 2. 哨兵定義（只存在於摘要計算）

- `Def.SENTINEL_TYPE`（新 Def 種類）；每個（摘要圖, 相關變數 v）一個 VarDef `⊥v`，`fromNode` 為該摘要圖 entry 的 copy、range `[0, 0]`。
- 只放入摘要圖 entry 的 IN；任何模型的 `reachIns`／`dupairs`、輸出檔都不得出現（單元測試守門）。

## 3. 摘要圖（`expansion.expandShallow(model)` 的結果）

| 欄位 | 內容 |
|------|------|
| `graph` | `[entry copy, exit copy, nodes]`：scope 的 intra-procedural 節點 copy＋其直接 call 邊的 CALL NODE／CALL RETURN NODE copy；不含被呼叫端節點 |
| `calls` | CallSiteRecord 陣列（§4），`calleeScope` 指向被呼叫端 scope |
| GEN | copy 的 `generate` 直接沿用 original 的 VarDef（**不重建**），再由 `replayCall` 依規則搬到 callReturn；因此摘要中的 VarDef 都是 original VarDef |

沒有呼叫的 scope：`expandShallow` 對 intra-procedural 模型回傳其節點 copy（不碰 original）、`calls` 為空。

## 4. CallSiteRecord（取代 `expansion` 的 bypass 紀錄；`Model.setCallBypasses`／`callBypassOf` 沿用名稱，值擴充）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `callNode` | FlowNode | 有 call 邊的節點（callSite、決策前的 CALL NODE、或串接中前一個 callReturn） |
| `callReturn` | FlowNode | 正常返回目標 |
| `calleeScope` | Scope | 被呼叫端 |
| `exceptionalReturn` | FlowNode\|null | 重播全部完成後，串接首個 callSite 的 exception 目標（catch、finally 入口、呼叫端 exit 或 LOOP）；無則 null |
| `entry`／`exit` | FlowNode\|null | 被呼叫端 entry／exit 在本圖的 copy（摘要圖為 null） |
| `seq` | number | 對應 hierarchy call edge 的 seq |
| `back` | boolean | 是否回邊（FR-015） |
| `beforeDecision` | boolean | 呼叫插在決策節點前（維持現況，007） |
| `callSiteLine` | number | 呼叫點行號（輸出用） |

## 5. LoopRecord（intra-page／inter-page 攤平圖）

`{loop, loopReturn, handlers: [{scope, entry, exit}], noHandler}`；由 `expand` 依 `loop`／`loopReturn`／`event` 重播產生，供求解器的 LOOP RETURN 虛擬貢獻（R4）與配對輸出（R9）。

## 6. 求解結果（`lib/dujs/reachingsolver.js`）

`solve(graph, options) → {results: Map(FlowNode → {in, out, generate, kill}), exitArrivals: {normal: Set<VarDef>, exceptional: Set<VarDef>}}`（contracts/lib-api.md §2）；
`options = {entryInput, generateOf(node), useOf(node), calls, loops, summaryOf(scope), flatVarDefOf, extraReachIns(node, outOf), exceptionToCalleeExitCarriesOut}`。

| 選項 | 說明 |
|------|------|
| `entryInput` | entry 的 IN（摘要圖為哨兵，其他模型為空） |
| `calls`／`loops` | CallSiteRecord／LoopRecord；未給時為相容模式（return 邊與處理器 exit → LOOP RETURN 邊帶 OUT） |
| （calls 模式的可達性） | 給 `calls` 時只分析從 entry 走得到的節點；callReturn 只在被呼叫端摘要的 `normalReturn` 成立時才算走得到（FR-003：無正常返回時呼叫之後不可達）。未分析的節點 `reachIns`／`reachOuts` 為空集合、不寫入分析結果。只有「被呼叫端 exit → 某筆 CallSiteRecord 的 callReturn」的 return 邊不貢獻；LOOP 相關 return 邊依 `loops`（US4）處理（US1 實作時補述） |
| `summaryOf`／`flatVarDefOf` | 摘要查詢與 original VarDef → 本圖 VarDef（摘要圖為恆等） |
| `extraReachIns(node, outOf)` | 相容模式下 callReturn 的 bypass 合併；**動態回呼**：`outOf(m)` 回傳 m 當下的 OUT 並登記依賴，m 的 OUT 改變時 node 重新入列；求解前對全部節點先呼叫一次以登記依賴，使 callee 永不返回時的 callReturn 仍會被分析（US1 起不再使用） |
| ~~`exceptionToCalleeExitCarriesOut`~~ | Foundational 過渡規則（analyze Q1）：為 true 時，指向被呼叫端 exit（有 return 出邊之 exit）的 exception 邊帶 `OUT(p)`。**已於 US1 刪除** |

邊貢獻表見 research R2。`doAnalysis` 將 `results` 寫回 `reachIns`／`reachOuts`／`kill` 並 `setAnalysisResults`（既有 API）。`exitArrivals` 依抵達 exit 的最後一條邊型別分開
（normal／`finally` 邊屬 `normal`，exception 邊屬 `exceptional`），供摘要使用。

## 7. FlowNode 新增（`lib/esgraph/flownode.js`）

| 項目 | 值 | 說明 |
|------|----|------|
| 節點型別 | `FlowNode.FINALLY_EXIT_NODE_TYPE = 'finallyExit'` | 非空 finally 的續行節點（R6）；無 astNode，`line` 取 finally 區塊結尾行；`.dot` 以型別為標籤、橢圓 |
| 連接型別 | `FlowNode.FINALLY_CONNECTION_TYPE = 'finally'` | 加入 `CONNECTION_TYPES`、`MULTI_CONNECTION_TYPE`；finallyExit → 跳躍的待續目標；資料流程帶 OUT；`.dot` `label="finally"` |

`FlowNode.copyNodes`、`branchsplitter.redirect`、`expansion.outgoingEdges`／`replayLoop`、esgraph 的 `allNodes` 走訪、`dot.js` 依 `CONNECTION_TYPES` 泛用處理，逐一確認納入新型別。

## 8. try／finally 的 CFG 規則（esgraph，FR-013）

| 情形 | 邊 |
|------|----|
| try 區塊拋錯 | 有 catch → catch；無 catch、非空 finally → finally 入口；無 catch、空 finally → 外層 handler |
| catch 本體拋錯 | 非空 finally → finally 入口；否則外層 handler |
| `return`／`break`／`continue` 跨出 try（含 catch） | 依序經過每個非空 finally：跳躍 → 第一個 finally 入口；各 finallyExit 以 `finally` 邊 → 下一個 finally 入口或原目標 |
| finally 末端 | 只由正常完成進入：照舊接正常後繼（無 finallyExit）；否則接 finallyExit |
| finallyExit | 正常進入 → normal 後繼；例外進入 → exception 外層 handler；每個待續目標 → `finally` 邊 |
| finally 內自己的跳躍／拋錯 | 直接到其目標／外層 handler（覆寫待續動作），跨出外層 try 時同樣經外層 finally |

「外層 handler」＝建該 `TryStatement` 時 `catchStack` 的頂端（外層 catch、外層 finally 入口或 exit）。

## 9. 每頁狀態轉移（分析管線）

```
initialize（scope、binding、Var）
→ buildIntraProceduralModels → intra 分析（新求解器；FR-008、FR-013、FR-014 生效）
→ buildInterProceduralModels（callresolver 含 FR-005；modelbuilder 記 callModelOf）
→ summary.computeForPage（SCC 不動點，摘要圖＝expandShallow）
→ inter-procedural 模型分析（攤平圖＋CallSiteRecord＋摘要）
→ buildIntraPageModel（handler 查找讀 inter 結果）→ intra-page 分析（＋LoopRecord）
→ inter-page 分析 → 輸出 .dot ＋ .matching.json
```

## 10. 驗證規則摘要

- 任一模型的 pair 不得含哨兵；`summary` 的四個集合不得含被呼叫端自己的變數。
- 每條 return 邊（exit → callReturn）恰對應一筆 CallSiteRecord；每條處理器 exit → LOOP RETURN 邊對應 LoopRecord 的一個處理器（配對檔自我檢查）。
- SCC 不動點迭代次數上限＝（SCC 內摘要可能變化的總量）有限；實作加防呆上限（例如 1000 輪）超過即拋錯，作為回歸偵測。
