# Data Model：階層式模型結構（重構 stage 1）

**Feature**: `003-hierarchical-models` | **Date**: 2026-11-16 | **Plan**: [plan.md](./plan.md)

本 feature 沒有持久化資料；以下是記憶體中的模型結構。設計理由見 [research.md](./research.md)，對外介面見
[contracts/model-api.md](./contracts/model-api.md)。

## 1. 名詞

| 名詞 | 定義 |
|------|------|
| 原件 | intra-procedural 模型圖中的 `FlowNode`（由 esgraph 建立），或上層建模時建立的**結構節點樣板**（CALL、CALL RETURN、LOOP、LOOP RETURN、domain）。原件只被 intra-procedural 的建模與分析寫入；樣板建立後不連任何邊。 |
| 複本 | `FlowNode.copyNodes` 由原件產生的 `FlowNode`；`original` 指向原件，`cfgId` 與原件相同，不消耗節點計數器。只屬於一個上層模型的扁平圖。 |
| 操作 | 上層建模記錄的改邊動作（呼叫邊、LOOP 掛接、LOOP RETURN 掛接、事件邊、load／save storage 邊），帶全域序號 `seq`；展開時在複本上依 `seq` 執行。 |
| 子樹 | 一個模型與它（遞迴）參照的所有下層模型；展開時套用子樹內的全部操作。 |

## 2. Model（`lib/dujs/model.js`，擴充）

| 欄位／方法 | 型別 | 說明 |
|-----------|------|------|
| `level` | `'intra-procedural' \| 'inter-procedural' \| 'intra-page' \| 'inter-page'` | 新增；建模時設定（常數 `Model.INTRA_PROCEDURAL` 等）。 |
| `graph` | `[entry, exit, nodes]` | 不變的介面；intra-procedural 為自己的圖（原件），上層為 `expand(model)` 的扁平圖（複本）。 |
| `relatedScopes`／`mainlyRelatedScope`／`dupairs` | 同現況 | 不變。inter-procedural 模型須重現現況 `connectCallerCalleeScopeRelatedModelsAtCallSite` 的順序：`mainlyRelatedScope` 為呼叫端 mainly；`relatedScopes` 為「呼叫端 mainly → 呼叫端 related → 被呼叫端 related」（`buildInterProceduralModels` 的 `searchedScopes`、`addInterProceduralModelToAPage` 的 `relatedScopes.length > 1`、helper 的 `interProceduralScopes()` 依賴此順序；以單元測試斷言）。 |
| `hierarchy` | `Hierarchy \| null` | 新增；intra-procedural 為 `null`。 |
| `flatNodeOf(original)` | `FlowNode \| null` | 新增；原件在本模型扁平圖中的節點（intra-procedural 為恆等；不在圖中回傳 `null`）；傳入扁平圖節點本身亦回傳自己。 |
| `analysisResultOf(node)` | `NodeResult \| null` | 新增；唯讀查詢（§6）。 |
| `setAnalysisResults(map)` | — | 新增；只供 `defuseanalyzer.doAnalysis` 呼叫，保存 `Map(扁平圖節點 → NodeResult)`（凍結）。 |

不變量：
- 上層模型的 `graph` 中每個節點都是本模型獨有的複本（`node.original !== null`），同一原件只有一個複本，`graph[2]` 中的重複是同一物件。
- intra-procedural 模型完成初始分析與 `doAnalysis` 後，其圖、GEN／KILL 與結果不再改變（FR-001）。

## 3. Hierarchy（`lib/dujs/hierarchy.js`，新，MIT）

上層模型的階層；建好後凍結（陣列與物件皆 `Object.freeze`）。

| 欄位 | 型別 | 說明 |
|------|------|------|
| `level` | 同 `Model.level` | |
| `main` | `Unit` | inter-procedural：根函式或主程式；intra-page：主程式；inter-page：domain。 |
| `units` | `Array<Unit>` | 本模型自己的單位（不遞迴進下層模型），依加入次序。 |
| `edges` | `Array<Edge>` | 本模型自己的操作，依 `seq` 遞增。 |
| `loop`、`loopReturn` | `FlowNode \| undefined` | intra-page 的 LOOP、LOOP RETURN 樣板。 |
| `domain` | `FlowNode \| undefined` | inter-page 的 domain 樣板。 |

### 3.1 Unit（階層節點）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `kind` | `'main' \| 'function' \| 'handler' \| 'loop' \| 'page' \| 'domain'` | |
| `scope` | `Scope \| null` | 單位對應的 scope（LOOP 為 `null`；domain 為 `scopeCtrl.domainScope`；page 為頁面 scope）。 |
| `model` | `Model \| null` | 單位參照的下層模型：function → 被呼叫者的模型（有被呼叫者時為其 inter-procedural 模型，否則 intra-procedural）；main（inter-procedural）→ 根 scope 的 intra-procedural 模型；main（intra-page）→ `getModelByMainlyRelatedScope(root)`（inter-procedural 或 intra-procedural）；handler → 處理器的模型（同上規則）；page → 該頁 intra-page 模型；loop／domain → `null`。 |
| `pageIndex` | `number \| undefined` | page 單位的頁面索引（`page<i>`）。 |

### 3.2 Edge（操作）

共同欄位：`kind`、`seq`（全域遞增）。

| kind | 其他欄位 | 展開時的動作（在複本上，與現況程式相同） |
|------|---------|------------------------------------------|
| `call` | `caller: Unit`、`callee: Unit`、`calleeModel: Model`、`callSite: FlowNode`（原件：呼叫端 intra-procedural 節點，或鏈接時上一條邊的 CALL RETURN 樣板）、`order: number`（同一節點的第幾個被呼叫者，0 起）、`beforeDecision: boolean`、`callNode: FlowNode \| null`（決策前插入的 CALL 樣板）、`callReturn: FlowNode`（CALL RETURN 樣板） | `beforeDecision`：CALL／CALL RETURN 的 `generate`、`kill` 設為空集合；`callSite.prev` 逐一 `redirectEdges(prev, callSite, callNode)`；`callReturn.connect(callSite)`。否則：`callSite.type = CALL`；`callReturn.generate/kill ← callSite`，清空 `callSite` 的 GEN／KILL；`moveOutgoingEdges(callSite, callReturn)`。最後 `(callNode \|\| callSite).connect(callee.entry, call)`、`callee.exit.connect(callReturn, return)`。 |
| `loop` | `loop: FlowNode`、`exit: FlowNode`（主程式 exit 原件） | 對 `exit.prev`（當下狀態）每個節點：記下指向 exit 的 normal／exception／true／false 種類，`disconnect(exit)` 後以相同種類接到 LOOP；`loop.connect(exit)`。 |
| `loopReturn` | `loop`、`loopReturn: FlowNode` | `loopReturn.connect(loop, return)`；沒有處理器時另 `loop.connect(loopReturn, onEvent)`（記為 `noHandler: true`）。 |
| `event` | `handler: Unit`、`handlerModel: Model`、`index: number`（處理器清單中的位置，含重複） | `loop.connect(handler.entry, onEvent)`；`handler.exit.connect(loopReturn)`。 |
| `load` | `page: Unit` | `domain.connect(page.entry, loadStorage)`。 |
| `save` | `page: Unit`、`definingNodes: Array<FlowNode>`（原件；含重複，順序同現況 `getNodesWhereDefiningLocalStorageObject`） | 每個 `definingNode.connect(domain, saveStorage)`。 |

驗證規則：
- `call` 邊的 `callSite` 必在呼叫端串列中（否則與現況相同，不建邊）；`order` 從 0 連續；`beforeDecision` 只在第一個被呼叫者可能為真
  （鏈接的呼叫點是 CALL RETURN，`isCallBeforeDecision` 為假）。
- 沒有可解析呼叫的 scope 沒有 inter-procedural 模型；intra-page 與 inter-page 模型每次都建（與現況相同）。

## 4. 展開（`lib/dujs/expansion.js`，新，MIT）

> 已由 `specs/004-fix-remaining-issues/contracts/model-api.md` 修訂（004 §2：步驟 5 的遇環丟錯改為回邊）。

`expand(model) → {graph, flatNodeOf}`，純函式（不改原件、不改下層模型、不消耗節點計數器）：

1. `order = nodeOrder(model)`：依 research R4 的串列演算法，遞迴得到原件陣列（含重複）。
2. `copies = FlowNode.copyNodes(distinct(order))`；在重播之前，對原件 `generate` 非 null 者（intra-procedural 分析後每個走訪過的節點都是，因 `findGENSet` 快取）以複本為 `fromNode` 重建 GEN（research R2）。
3. `ops = collectEdges(model)`：遞迴蒐集子樹內所有 Edge（以物件身分去重），依 `seq` 排序後逐一套用到複本。
4. `graph = [copies.get(entryOf(model)), copies.get(exitOf(model)), order.map(copies.get)]`。
5. 遞迴時維護展開中的模型堆疊；遇到環拋出 `Error('call cycle in hierarchy: ...')`（research R15）。

`entryOf`／`exitOf`：intra-procedural 為 `graph[0]`／`graph[1]`；inter-procedural 為 `main.model` 的；intra-page 為主程式模型的；inter-page 為 domain 樣板（entry 與 exit 相同）。

## 5. FlowNode（`lib/esgraph/flownode.js`，擴充，MIT）

| 新增 | 說明 |
|------|------|
| `FlowNode.copyNodes(originals)` | 回傳 `Map(原件 → 複本)`；欄位與連線的處理見 research R2。 |
| `original`（唯讀） | 原件為 `null`；複本指向原件。 |

`dujsDecisionCalledBefore` 不再建立（FR-007）。

## 6. NodeResult（唯讀查詢的回傳）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `reachIns` | `Set<VarDef>` | worklist 的輸入。 |
| `reachOuts` | `Set<VarDef>` | worklist 的輸出。 |
| `generate` | `Set<VarDef>` | 該節點最後一次轉移使用的 GEN。 |
| `kill` | `Set<VarDef>` | 最後一次轉移計算的 KILL。 |
| `cuse`、`puse` | `Set<Var>` | 最後一次轉移計算的 c-use／p-use。 |

每次查詢回傳新的 `Set`；紀錄本身凍結。分析另一個模型不改變本模型的紀錄（FR-003）。

## 7. 建模階段的狀態轉移

```text
intra-procedural：buildIntraProceduralModels → initiallyAnalyze → doAnalysis/findDUPairs（原件；之後凍結不變）
inter-procedural：buildInterProceduralModels（記錄 call 邊、建 CALL RETURN/CALL 樣板、expand）→ doAnalysis/findDUPairs（各自的複本）
intra-page：buildIntraPageModel（以 R8 規則讀 reach-in 找處理器、記錄 loop/loopReturn/event 邊、建 LOOP/LOOP RETURN 樣板、expand）→ 分析
inter-page：buildInterPageModel（建 domain 樣板、記錄 load/save 邊、expand）→ 分析
```

## 8. Golden manifest（`tests/golden/manifest.json`，新）

```json
{
  "expected": { "baseline": { "page0/intra-pages/0.graph.dot": "<sha256>", "...": "..." }, "added": ["inter-page/0.hierarchy.dot", "..."] },
  "expected-es2015": { "baseline": {}, "added": [] },
  "expected-interprocedural": { "baseline": {}, "added": [] }
}
```

`baseline` 在任何 `lib/` 變更前由重構前程式的輸出產生；`added` 在 US2 填入。驗證方式見
[contracts/golden-verification.md](./contracts/golden-verification.md)。
