# Contract：模型、階層、展開與分析的程式介面（004 修訂）

**Feature**: `004-fix-remaining-issues` | 修訂 `specs/003-hierarchical-models/contracts/model-api.md`（以下「003 §n」）；未提到的條目維持 003 原文。
003 文件在對應段落加一行「已由 004 contracts/model-api.md 修訂」的註記。

## 1. `lib/dujs/hierarchy.js`（修訂 003 §2）

```js
hierarchy.addCallEdge(model, {
    callSite, calleeModel, callReturn, callNode,   // 同 003
    back,                    // 選填 boolean：回邊（FR-015）。true 時 calleeModel 必須是 intra-procedural 模型（無 hierarchy），否則拋錯
    keepGenerateAtCallSite   // 選填 boolean：展開時呼叫點的 GEN 不搬到 CALL RETURN（FR-007，class 宣告的 static 成員）
})  // => 凍結的 call Edge，新增欄位 back（boolean）、keepGenerateAtCallSite（boolean）
hierarchy.openTargetsOf(model)   // => Array<Scope>：子樹中回邊目標 − 子樹中各模型 main 單位的 scope；[] ＝封閉
hierarchy.hasBackEdge(model)     // => boolean：子樹中是否有回邊
```

- 回邊的 `callee` 單位（`kind: 'function'`、`model` 為目標的 intra-procedural 模型）記在 edge 上，但**不**加入 `hierarchy.units`；`relatedScopes`
  照常加入目標 scope（已存在則不重複）。
- 003 §2「單元測試以它建立環狀階層」改為：「單元測試以 `back: true` 建立回邊；以兩個未凍結模型互相 `addCallEdge` 建立的是**模型物件環**，
  屬手動建立錯誤，展開時拋錯（§2）」。

## 2. `lib/dujs/expansion.js`（修訂 003 §3）

```js
expansion.expand(model)
// => {graph: [entry, exit, nodes], flatNodeOf: Map(原件 → 複本), bypasses: Map(CALL RETURN 複本 → {callNode, callReturn, calleeScope})}
```

- 純函式、不消耗計數器、兩次展開結構相同：同 003。
- **回邊**：`nodeOrder` 只插入 CALL（決策前）與 CALL RETURN，不加入被呼叫端節點；重播與一般呼叫邊相同（`replayCall`），entry／exit 取目標
  intra-procedural 模型的原件之複本。
- **`keepGenerateAtCallSite`**：`replayCall` 非決策分支中，呼叫點的 GEN 留在呼叫點（類型仍改為 CALL），CALL RETURN 的 GEN 為空 Set。
- **bypasses**：每條呼叫邊（一般、回邊、串接）一筆；`callNode` 為有 call 邊的複本（非決策＝呼叫點、決策前＝CALL、串接＝前一個 CALL RETURN），
  `calleeScope` ＝ `calleeModel.mainlyRelatedScope`。intra-procedural 模型回傳空 Map。
- **錯誤**（取代 003 §3「環：拋出 Error，訊息以 `call cycle in hierarchy` 開頭」）：
  - `openTargetsOf(model)` 非空：`Error('open hierarchy: back call edge to <scope 名稱> outside the model')`；
  - 模型物件出現在自己的子樹中（手動建立錯誤）：`Error('model cycle in hierarchy: <scope 名稱鏈>')`。
  - 建模（`modelBuilder`）產生的呼叫環一律以回邊表示，兩種錯誤都不會發生。

## 3. `lib/dujs/model.js`（新增）

```js
model.setCallBypasses(map)   // 由 modelBuilder 以 expand 的 bypasses 設定；只能設定一次
model.callBypassOf(node)     // => {callNode, callReturn, calleeScope} 或 null（node 為扁平圖節點）
```

## 4. `lib/dujs/defuseanalyzer.js`（修訂 003 §6）

- `doAnalysis(model)`：對 `model.callBypassOf(node)` 非 null 的 CALL RETURN，轉移函式的有效輸入＝worklist 輸入 ∪ `extraReachIns` ∪
  `bypassFilter(上一次 callNode 輸出, calleeScope)`；callNode 輸出改變時以轉移函式的 `list` 參數把該 CALL RETURN 放回佇列；
  `reachIns` 與 `analysisResultOf(node).reachIns` 記錄有效輸入。
- `bypassFilter(vardefs, calleeScope)`：保留 `calleeScope.getVariable(v.name) !== v` 或 `v` 為 `calleeScope.getVariablesIncludingBlockScopes()` 之一的定義。
  以 `_testonly_._bypassFilter` 暴露供單元測試。
- `findUSESet`：`read: 'p-use'` 的項目以條件模式走訪（research R1）；其他項目規則不變。

## 5. `lib/dujs/usedexpressions.js`

- 決策節點（`true` 或 `false` 目標存在）的 astNode 項目回傳 `read: 'p-use'`（原 `'walk'`）；SwitchCase、for-in／for-of 的規則不變，
  單一 Identifier 條件本來就是 `'p-use'`。檔頭的 read 說明改為：`'p-use'` ＝條件模式（呼叫與 `new` 的引數子樹為 c-use，其餘 p-use）。

## 6. `lib/dujs/callresolver.js`（新，MIT）

```js
var callResolver = require('./callresolver');
callResolver.calleeScopesOf(node, scopeTree)   // => Array<Scope>：依執行順序的被呼叫 scope（research R2 表，含 `f()`）；不含 static 成員
callResolver.callExpressionOf(node)            // => CallExpression|NewExpression|null：節點代表的呼叫運算式（含 FR-017 的欄位初始化式）
callResolver.classIndexOf(scopeTree)           // => 每頁快取的 class 索引（供測試）
```

- 只讀 `node.reachIns`（intra-procedural 原件）、AST 與頁面各 intra-procedural 模型節點的 GEN（class 放寬時統計全頁定義），不修改任何物件；找不到一律回傳
  `[]`，不拋錯（含 `super()`、`callee` 非 Identifier）。
- 解析規則（FR-018）：callee 變數在 reachIns 中的定義至少一筆且全部指向同一個函式或 class 才連（`f()` 亦同，取代原 `findFunctionDefinitionFromReachInSet`
  的「任一筆是函式」）；reachIns 中沒有該變數的定義時，只有「全頁唯一一筆定義且是 class」才連，函式不放寬。

## 7. `lib/dujs/modelbuilder.js`（修訂 003 §5）

- `getInterProceduralModelStartFromTheScope(scope, scopeTree[, stack, built])`：research R5.2 的四條規則；回傳模型（開放模型不登記、不展開）。
  `_testonly_` 名稱不變，舊的兩參數呼叫等同 `stack = []`、`built = new Map()`。
- 登記條件：有 hierarchy 且封閉，且該 scope 尚未登記（原為 `relatedScopes.length > 1`）。
- `buildInterProceduralModels`：已登記或「建過且沒有呼叫邊」的 scope 略過；只建成開放模型的 scope 仍以自己為根再建。
- 被呼叫端：`findStaticMemberScopesOfClassesAtNode(node)`（不變）＋`callResolver.calleeScopesOf(node)`（含 `f()`；`findFunctionDefinitionFromReachInSet`
  的邏輯搬入 callresolver 並改為嚴格規則，原函式移除或改為委派）；astNode 為 class 宣告時，static 成員的呼叫邊 `keepGenerateAtCallSite: true`。
- 事件 handler 查找（`reachInsForHandlerLookup`，plan U3＝(a)、FR-015）：優先取 `mainlyRelatedScope` 為頁面 scope 的 inter-procedural 模型中對該節點有分析
  結果者；沒有才退回「最後一個有結果的 inter-procedural 模型」，再退回原件的 `reachIns`。`interProceduralScopes()` 的模型登記順序不變。
- `setFlatGraphFromHierarchy` 另以 `bypasses` 呼叫 `model.setCallBypasses`。
- `collectParameterDefaults`／`getFunctionBodyStatement`：research R8（外層預設值求值節點＋巢狀預設值節點）。

## 8. `lib/dujs/scopetree.js`

- `visitFunctionBody` 在本體前於函式 scope 內走訪 `node.params`（research R7）。

## 9. `lib/dujs/cfggraphconverter.js`

- CALL RETURN 標籤（research R9、[output.md](./output.md) §1）。

## 10. `lib/esgraph/branchsplitter.js`（MIT）

- `isInsideLoopBody(prev, loop, entryNode)`：無 range 時以「從 entry 不經 loop 節點不可達」判定（research R11）；`split` 把 entry 傳入。
