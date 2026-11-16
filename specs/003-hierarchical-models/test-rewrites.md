# 既有測試改寫紀錄

**Feature**: `003-hierarchical-models` | 依據：research R13、tasks.md「全程規則」

既有測試只允許 R13 列出的「取值方式」改寫，預期值一字不動；每一筆改寫**當下**記入下表，供 PR 逐條對照。

## 取值方式改寫

| 檔案 | 行號 | 改寫前 | 改寫後 | R13 對應列 | 空轉檢查證據 |
|------|------|--------|--------|-----------|--------------|
| tests/dujs/modelbuilder.js | 65–77 | `_testonly_._connectCallerCalleeScopeRelatedModelsAtCallSite(callerModel, calleeModel, callerGraph[2][2])` | 手建 `hierarchy.createCallHierarchyModel(callerModel)`＋`addCallEdge({callSite: callerGraph[2][2], calleeModel})`＋`expand`（檔內 `expandInto`）；長度 11、[2] call、[8] callReturn、[2].normal 不存在 皆不變 | modelbuilder private methods | 暫時改壞取值（scratchpad 複本）後該 it 失敗（[3]/[7] 的 original 互換 → fail） |
| tests/dujs/modelbuilder.js | 73、74、77 | `graph[2][3].should.eql(calleeGraph[0])`、`graph[2][7].should.eql(calleeGraph[1])`、`graph[2][2].call.should.eql(calleeGraph[0])` | 同位置改比 `.original`：`graph[2][3].original.should.eql(calleeGraph[0])` 等 | modelbuilder private methods（`should.eql(原圖節點)` → `node.original`） | 暫時改壞取值（scratchpad 複本）後該 it 失敗（`.call.original` 改比 calleeGraph[1] → fail） |
| tests/dujs/modelbuilder.js | 89–92 | `_testonly_._connectLoopNodeToPageGraph(model)`（回傳頁面圖＋LOOP，無 LOOP RETURN） | 手建 `hierarchy.createIntraPageModel(model, [])`＋`expand`；`connectedGraph` 取扁平圖節點陣列到 exit 為止（`slice(0, indexOf(exit) + 1)`，其後是 LOOP RETURN）；長度 4、exit.prev 為 1 個 loop、[2] loop、loop.normal 為 exit 皆不變 | modelbuilder private methods | 暫時改壞取值（scratchpad 複本）後該 it 失敗（slice 少取 exit → fail）；注意：取前段是取值方式的改寫，PR 需逐條對照 |
| tests/dujs/modelbuilder.js | 141–152 | `_testonly_._connectPageAndEventHandlers(pageModel, [h1, h2])` | 手建 `hierarchy.createIntraPageModel(pageModel, [h1, h2])`＋`expand`；長度 11、[2] loop、[7] loopReturn、return[0] 不變 | modelbuilder private methods | 暫時改壞取值（scratchpad 複本）後該 it 失敗 |
| tests/dujs/modelbuilder.js | 149、150 | `pageLoopNode.onEvent[i].should.eql(eventHandlerGraph{1,2}[0])` | `pageLoopNode.onEvent[i].original.should.eql(eventHandlerGraph{1,2}[0])` | modelbuilder private methods（→ `node.original`） | 暫時改壞取值（scratchpad 複本）後該 it 失敗（onEvent[0] 改比 handler2 → fail） |
| tests/dujs/modelbuilder.js | 151、152 | `eventHandlerGraph{1,2}[1].normal.toString()…`（原件 exit 的連線） | `resultModel.flatNodeOf(eventHandlerGraph{1,2}[1]).normal.toString()…` | modelbuilder private methods（原件不再被連線 → 改查扁平圖複本） | 暫時改壞取值（scratchpad 複本）後該 it 失敗（預期改為 pageLoopNode → fail） |
| tests/dujs/modelbuilder.js | 157–158 | `_testonly_._connectPageAndEventHandlers(pageModel, [])` | 手建 `hierarchy.createIntraPageModel(pageModel, [])`＋`expand`；長度 5、[2] loop、[4] loopReturn、onEvent[0]/return[0] 不變 | modelbuilder private methods | 改寫後斷言仍直接比對扁平圖節點（非空轉：length 5 與 onEvent[0] === [4]） |
| tests/dujs/modelbuilder.js | 578、579 | `graph[0].loadStorage[i].should.eql(pageNIntraPageModel.graph[0])` | `graph[0].loadStorage[i].original.should.eql(pageNIntraPageModel.graph[0].original)` | modelbuilder buildInterPageModel（`loadStorage[i]` 比 `.original`） | 暫時改壞取值（scratchpad 複本）後該 it 失敗（loadStorage[0] 改比 page2 → fail） |
| tests/dujs/modelbuilder.js | 580 | `page1IntraPageModel.graph[2][2].saveStorage.should.eql(graph[0])` | `(interPageModel.flatNodeOf(page1IntraPageModel.graph[2][2].original).saveStorage === graph[0]).should.eql(true)` | modelbuilder buildInterPageModel | 暫時改壞取值（scratchpad 複本）後該 it 失敗（改查 graph[2][1] → fail） |
| tests/dujs/branchsplit.js | 477 | `(node.call === logEntry)` | `(node.call === models[0].flatNodeOf(logEntry))` | branchsplit 約 476 行 `node.call === logEntry` | 暫時改壞取值（scratchpad 複本）後該 it 失敗（改查 `logEntry.normal` → fail） |
| tests/dujs/branchsplit.js | 755–760 | `(found.nodes[1].dujsDecisionCalledBefore === found.nodes[3]).should.eql(true)` | 在 `found.model.hierarchy.edges` 找 `kind === 'call'` 且 `flatNodeOf(edge.callNode) === found.nodes[1]` 的邊，斷言 `(!!callEdge && callEdge.beforeDecision === true && found.model.flatNodeOf(callEdge.callSite) === found.nodes[3]).should.eql(true)` | branchsplit `call before decision`（`dujsDecisionCalledBefore` 標記移除） | 暫時改壞取值（scratchpad 複本）後該 it 失敗（改比 found.nodes[2] → fail；找不到邊時 `!!callEdge` 為 false 亦 fail） |
| tests/dujs/reviewfixes.js | 115 | `entry = intraProceduralModelOf(...).graph[0]`（`callersOf(page, entry)`） | `entry = page.flatNodeOf(intraProceduralModelOf(...).graph[0])` | reviewfixes 約 113 行 | 暫時改壞取值（scratchpad 複本）後該 it 失敗（改取 graph[1] → fail；flatNodeOf 為 null 時 callers 為所有 call 為 null 的節點，亦 fail） |
| tests/dujs/reviewfixes.js | 150–151 | `callersOf(intraPageModels[0], staticEntry).length.should.eql(1)` | `callersOf(intraPageModels[0], intraPageModels[0].flatNodeOf(staticEntry)).length.should.eql(1)` | reviewfixes 約 149 行 | 暫時改壞取值（scratchpad 複本）後該 it 失敗（預期暫改 2 → fail，命中數為 1） |
| tests/dujs/reviewfixes.js | 216 | `fEntry = intraProceduralModelOf(result, PAGE + '.f').graph[0]` | `fEntry = page.flatNodeOf(intraProceduralModelOf(result, PAGE + '.f').graph[0])`（其後 `callersOf`、`next`、`prev` 斷言不變） | reviewfixes 約 220 行 | 暫時改壞取值（scratchpad 複本）後該 it 失敗（改取 graph[1] → fail） |
| tests/dujs/reviewfixes.js | 82–91 | `node !== staticEntry`、`callersOf(model, staticEntry)`（原件與上層扁平圖比身分：callers 恆為空，`belowOrEqual(1)` 與 `forEach` 空轉） | `var staticEntryOfModel = model.flatNodeOf(staticEntry)`；`node !== staticEntryOfModel`、`callersOf(model, staticEntryOfModel)`；預期值不變 | reviewfixes 約 82–91 行（T038 掃描所得） | 兩個 inter-procedural 模型的 `flatNodeOf` 皆非 null、callers 各 1 個（L2）。暫時改壞預期（scratchpad 複本，L2 → L3）：改寫後 fail（`expected 2 to equal 3`）；舊取值同樣改壞仍 pass，證實舊寫法空轉 |
| tests/helpers/analyze.js | 72–83（舊） | `branch()`：LOOP 分支當 exit、`dujsDecisionCalledBefore` 當決策節點；`target === decision.true \|\| target === branch(decision.true)`（false 同） | 刪除 `branch()` 與其註解；`target === decision.true`、`target === decision.false` | helper 兩個繞路（FR-007、SC-002） | 刪除後 npm test 896 全過；暫時改壞（false 目標為 exit 時不認）→ 12 failing，證實 exit 目標的 p-use 確實經此判定 |
| tests/dujs/branchsplit.property.js | 386–394 | `isTargetOf`：`graph[2].indexOf(target) !== -1 \|\| target.type === FlowNode.LOOP_NODE_TYPE`（訊息 `… in the graph or the LOOP NODE`） | `graph[2].indexOf(target) !== -1`（訊息改 `… in the graph`）；註解改為各模型有自己的節點 | branchsplit.property P1（SC-002） | 刪除後 P1 全過（含 FC_NUM_RUNS=1000）；暫時改壞（拒絕 exit 目標）→ P1 fail |

### T038 掃描清單（原件與上層節點比身分的斷言）

grep `===`／`should.eql(<節點>)`／`indexOf(`／`callersOf(`／`.call ===`／`graph[2].filter` 於 `tests/`（branchsplit、reviewfixes、classfields、
modelbuilder、pagemodels、nestedfunctions、es2015、model、usedexpressions、cfgbuilder、defuseanalyzer、analysisexecution、labeledwithdebugger、
paramsandnew、scopenames 等）。以下層節點查上層圖者僅：branchsplit 477、755–760；reviewfixes 82–91、115、150–151、216；modelbuilder 73–77、
149–152、578–580（皆已改寫，見上表）。其餘比對皆在同一張圖內（intra-procedural 圖、`cfgOf` 的 CFG、或同一上層扁平圖的節點互比），或比對模型／
scope 身分，不受上層為複本影響，不改。

行號為 Polish（T066）時的現行行號（R4 把 `tests/dujs/modelbuilder.js` 中段的 require 移到檔頭後，18–593 行下移 7 行）。

### T066 完整性檢查（對 Setup commit e68bb2d）

`git diff --numstat e68bb2d -- tests` 中有刪除行的既有測試檔僅：branchsplit.js、branchsplit.property.js、modelbuilder.js、reviewfixes.js、
helpers/analyze.js（以及 manifest.json 的 `added`、expansion.js 的 1 行 require 搬移）。逐行對照其刪除行，皆屬上表各列或下列非斷言變更，
無 R13 以外的改寫，預期值一字未動：

- `tests/helpers/analyze.js`：除上表 `branch()` 一列外，原本連續呼叫四個 `build*` 改為逐段建模並取快照（R14 不變性檢查，R13 列「加入 R14 的不變性檢查」）；不改任何斷言。
- `tests/dujs/modelbuilder.js`、`tests/dujs/expansion.js`：require 區塊調整（新增 `hierarchy`／`expansion` 等，與 R4 把中段 require 移到檔頭）；不改任何斷言。
- 其餘有變動的測試檔（`tests/dujs/model.js`、`hierarchy.js`、`hierarchydot.js`、`expansion.js`、`tests/esgraph/flownodetest.js`、`tests/golden/golden.js`）只有新增。

### US1 審查延後修正（Polish）對測試的影響

- R2：`buildInterPageModel` 改用 `createInterPageModel` 的預設值（domain 圖與 `definingLocalStorageNodes`）。
  `getNodesWhereDefiningLocalStorageObject` 保留：`contracts/model-api.md` §5 把 `_getNodesWhereDefiningLocalStorageObject` 列為 `_testonly_` 須暴露的函式；
  目前沒有測試呼叫它，故無測試改寫。
- R4：只搬移 require／`var PROBES` 宣告，無斷言或取值變更。
- R1、R3：只改 `lib/dujs/hierarchy.js` 內部，無測試改寫。

## 階層圖人工核對紀錄

（US2：依 contracts/hierarchy-output.md §3 逐檔核對新增的 `.hierarchy.dot`。）

| 檔案 | 核對項目 | 結果 | 備註 |
|------|----------|------|------|
| `expected/page0/intra-pages/0.hierarchy.dot` | 節點：主程式 `$PAGE_0`、`loop`、扁平圖 LOOP（n32）的 3 條 onEvent 目標 entry（n34、n39、n44）↔ `onLoad`、`onAdd`、`onModeChange`；邊：`h0 -> h1 loop`、3 組 onEvent／return | 一致 | 處理器 exit（n37、n43、n46）→ loopReturn n38 ↔ 3 條 return |
| `expected/page1/intra-pages/0.hierarchy.dot` | 節點：`$PAGE_1`、`loop`、LOOP（n202）2 條 onEvent 目標（n204、n209）↔ `onLoad`、`onClear`；邊：loop＋2 組 onEvent／return | 一致 | |
| `expected/inter-page/0.hierarchy.dot` | 節點：localStorage n223 ↔ `$DOMAIN`；`page0`、`page1`；邊：2 條 loadStorage 點線（n224 屬 page0、n246 屬 page1）↔ 2 條 loadStorage | 一致 | 扁平圖無指向 domain 的 saveStorage（fixture 用 `setItem` 呼叫，非指派），階層圖亦無 saveStorage |
| `expected-es2015/page0/intra-pages/0.hierarchy.dot` | 節點：`$PAGE_0`、`loop`、LOOP（n37）2 條 onEvent 目標（n39、n48）↔ `init`、`$ANONYMOUS_FUN_4`；邊：loop＋2 組 onEvent／return | 一致 | |
| `expected-es2015/inter-page/0.hierarchy.dot` | 節點：`$DOMAIN`、`page0`；邊：1 條 loadStorage（n122 -> n123） | 一致 | 無 saveStorage |
| `expected-interprocedural/page0/inter-procedurals/0.hierarchy.dot` | 節點：entry n39、n42 ↔ `addTo`、`addTo.scale`；邊：call n41 -> n42、return n44 -> n45 ↔ 各一 | 一致 | |
| `expected-interprocedural/page0/inter-procedurals/1.hierarchy.dot` | 節點：entry n22、n26、n29、n37 ↔ `$PAGE_0`、`addTo`、`addTo.scale`、`isReady`（4）；邊：call n25->n26、n28->n29、n36->n37，return n31->n32、n34->n35、n39->n40 ↔ 3 call、3 return（深度優先次序） | 一致 | 無 CALL／CALL RETURN 節點 |
| `expected-interprocedural/page0/inter-procedurals/2.hierarchy.dot` | 節點：entry n62、n64 ↔ `onClick`、`onClick.log`；邊：call n63 -> n64、return n66 -> n67 | 一致 | |
| `expected-interprocedural/page0/intra-pages/0.hierarchy.dot` | 節點：`$PAGE_0`、`loop`、LOOP（n46）2 條 onEvent 目標 entry n48、n56 ↔ `onClick`、`onLoad`；扁平圖中 `addTo`、`scale`、`isReady`（主程式子模型）與 `log`（n50，onClick 子模型）不出現 | 一致 | 處理器 exit → loopReturn n55 ↔ 2 條 return |
| `expected-interprocedural/inter-page/0.hierarchy.dot` | 節點：`$DOMAIN`、`page0`；邊：loadStorage n84 -> n85、saveStorage n108 -> n84（n108 屬 page0）↔ 各一 | 一致 | |

核對方式：在暫存目錄對三個 golden fixture 跑 CLI，產生的 10 個 `.hierarchy.dot` 與 golden 逐位元組相同；再逐檔對照同目錄同索引的
`graph.dot`。同一對照另以程式在 `tests/dujs/hierarchy.js`「hierarchy graphs match the flat graphs」自動檢查（三個 fixture 全部上層模型）。
未發現錯誤，未重做 T050。
