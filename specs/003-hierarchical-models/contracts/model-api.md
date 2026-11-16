# Contract：模型、階層與展開的程式介面

**Feature**: `003-hierarchical-models` | 供測試與 stage 2 使用的內部介面（dujs 沒有對外 API 套件；CLI 參數不變）。
資料結構見 [../data-model.md](../data-model.md)。所有新模組為 MIT 授權檔頭、ES5 風格（`'use strict'` 於函式內、`var`）。

## 1. `lib/dujs/model.js`

```js
Model.INTRA_PROCEDURAL = 'intra-procedural';
Model.INTER_PROCEDURAL = 'inter-procedural';
Model.INTRA_PAGE = 'intra-page';
Model.INTER_PAGE = 'inter-page';

model.level            // 上列常數之一；由 modelBuilder 設定
model.graph            // [entry, exit, nodes]：intra-procedural 為原件；上層為扁平圖複本（不變的既有介面）
model.hierarchy        // Hierarchy | null（intra-procedural 為 null）
model.flatNodeOf(node) // FlowNode | null：node 為原件或本模型扁平圖的節點
model.analysisResultOf(node)
// => null（node 不在本模型，或本模型尚未分析）
// => Object.freeze({reachIns, reachOuts, generate, kill, cuse, puse})，每個欄位為新的 Set（呼叫端可任意改動，不影響模型）
model.setAnalysisResults(map) // 只供 defuseAnalyzer.doAnalysis；map: Map(扁平圖節點 → 紀錄)
```

保證：
- 四層建完後，對任一下層模型 `m` 與其任一節點 `n`，`m.graph` 的結構與 `m.analysisResultOf(n)` 與 `m` 剛分析完時相同（SC-003）。
- `analysisResultOf` 對同一模型重複呼叫得到相等內容、不同的 Set 物件。

## 2. `lib/dujs/hierarchy.js`

```js
var hierarchy = require('./hierarchy');

hierarchy.nextSeq()                               // 取全域序號（建模內部使用）
hierarchy.createCallHierarchyModel(mainModel)     // 新的 inter-procedural Model，main 單位參照 mainModel（intra-procedural）
hierarchy.addCallEdge(model, {
    callSite,         // FlowNode 原件（呼叫端 intra-procedural 節點，或上一條邊的 callReturn 樣板）
    calleeModel,      // Model（intra-procedural 或 inter-procedural）
    callReturn,       // 選填：CALL RETURN 樣板；省略時以 flownodefactory 建立（與建模相同的屬性設定）
    callNode          // 選填：決策前插入時的 CALL 樣板；省略時依 beforeDecision 建立
})                    // => 新的 call Edge（order、beforeDecision 自動計算，seq 取號）
hierarchy.createIntraPageModel(mainModel, handlerModels) // 建 LOOP、LOOP RETURN 樣板與 loop/loopReturn/event 邊
hierarchy.createInterPageModel(pageModels)              // 建 domain 樣板與 load/save 邊
hierarchy.freeze(model)                                 // 建好後凍結 hierarchy（之後 addCallEdge 拋錯）
```

`createCallHierarchyModel`／`addCallEdge` 是「可手動建立階層的入口」（spec Clarifications），單元測試以它建立環狀階層。
建模（`modelBuilder`）與手動建立使用同一批函式，因此樣板建立次序與屬性和現況一致。

### 查詢範例（US1 情境 7）

```js
var edge = model.hierarchy.edges.filter(function (e) { return e.kind === 'call'; })[0];
edge.caller.scope; edge.callee.model;      // 呼叫端單位、被呼叫的模型
edge.callSite; edge.order; edge.beforeDecision;
model.flatNodeOf(edge.callSite);            // 呼叫點在扁平圖中的節點
edge.callee.model.graph;                    // 下層模型的圖：與它剛建好時相同
```

## 3. `lib/dujs/expansion.js`

```js
var expansion = require('./expansion');
expansion.expand(model)  // => {graph: [entry, exit, nodes], flatNodeOf: Map(原件 → 複本)}
expansion.nodeOrder(model) // => Array<FlowNode> 原件陣列（含重複），供測試核對 R4
```

- 純函式：不改原件、不改任何下層模型、不改 `flownodefactory` 的 counter（測試以 `factoryFlowNode.counter` 前後相等驗證）。
- 對同一模型呼叫兩次得到結構相同、物件不同的扁平圖。
- 環：拋出 `Error`，訊息以 `call cycle in hierarchy` 開頭並列出 scope 名稱鏈。
- 建模流程中 `modelBuilder` 在模型的階層建好後呼叫一次，並以結果設定 `model.graph` 與 `flatNodeOf`。

## 4. `lib/esgraph/flownode.js`

```js
FlowNode.copyNodes(originals) // => Map(原件 → 複本)；不消耗計數器
node.original                 // 唯讀；原件為 null
```

## 5. `lib/dujs/modelbuilder.js`（行為契約）

- 公開方法名稱與呼叫次序不變：`buildIntraProceduralModels`、`buildInterProceduralModels`、`buildIntraPageModel`、`buildInterPageModel`。
- 不改動任何已建好模型的圖（含 intra-procedural 原件）。
- 找事件處理器的 reach-in：research R8 的 `reachInsForHandlerLookup`；解析被呼叫函式：intra-procedural 原件的 `reachIns`。
- `_testonly_` 改為暴露新的私有函式（`_findEventHandlerModelsFromAModel`、`_getRegisteredEventHandlerCallback`、
  `_getInterProceduralModelStartFromTheScope`、`_getNodesWhereDefiningLocalStorageObject`、`_setScopeOfGraphNodes`、`_reachInsForHandlerLookup`）；
  `_connectCallerCalleeScopeRelatedModelsAtCallSite`、`_connectLoopNodeToPageGraph`、`_connectPageAndEventHandlers`、
  `_connectDomainScopeGraphToModelOfPages` 由 `hierarchy`＋`expansion` 取代而移除（對應測試依 research R13 改寫）。

## 6. `lib/dujs/defuseanalyzer.js`

- `doAnalysis(model)`：行為不變，另呼叫 `model.setAnalysisResults`；不再寫 `scope.lastReachIns`。
- 移除 `findKILLSet`（FR-011c）。

## 7. `lib/dujs/scope.js`

- 移除 `lastReachIns` 屬性與 `_lastReachIns`（無讀取者）。
