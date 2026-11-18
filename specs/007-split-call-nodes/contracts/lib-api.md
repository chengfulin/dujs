# Contract：lib 介面（feature 007）

**Feature**: `007-split-call-nodes` | 結構見 [data-model.md](../data-model.md)；理由見 [research.md](../research.md)。只列新增與語意改變者。

## 1. `lib/dujs/callsplit.js`（新，MIT）

```js
planOf(node, scopeTree) -> SegmentPlan           // data-model §1；WeakMap 快取（鍵＝原節點），結果凍結；列出全部呼叫點
evaluatedExpressionsOf(node) -> Array<AST>       // R2 步驟 1
evaluationOrder(expressions) -> Map<AST, number> // 後序位置（data-model §5）
segmentThrows(plan, j) -> boolean                // R6；等同 plan.throws[j]，供單元測試直接呼叫
THROW_TYPES                                      // 與 lib/esgraph/index.js 的 throwTypes 相同（單元測試比對）
reset()                                          // 清快取（tests/helpers/analyze.js 的 reset 呼叫）
```

- 下游（`hierarchy`、`expansion`、`defuseanalyzer`）只用 `edge.plan`／`segment.plan`，不自行呼叫 `planOf`；`planOf` 由 `modelbuilder` 與 `callresolver.calleeScopesOf` 呼叫。
  （US1–US2 曾有的階段性 predicate 參數與 `callresolver.stagedCallSite`〔DECISION 006 Q2〕已於 T048 移除，快取改為單層 `WeakMap<原節點, plan>`。）
- 只讀原節點（`astNode`、`split`、`true`／`false`、`exception`、`discriminantThrowTarget`、`parent`、`reachIns`、`generatedAt`），不修改任何節點。
- entry／exit 節點、沒有 `astNode` 的節點回傳 `callSites` 為空的 plan。
- 呼叫點列舉排除 data-model §5「不列為呼叫點」的位置：`?.` 之後的部分、解構樣式內的預設值（參數本身的預設值除外；catch 參數的預設值同屬此類）、for-in/of 左側、留在 `case` 節點內的 test（未拆分者或拆分後的末端運算元；拆出的非末端運算元照常列入，DECISION 007）（這些位置中 class 的 static 成員也不列入——相對 develop 的行為變更，data-model §5）；
  並套用防護——callee／receiver 識別字在同一節點中有後序位置早於其讀取的定義（`generatedAt`）時不列為呼叫點（R2 步驟 3、R13 L3）。排除的位置不影響讀取與定義的歸段。
- `once-loop` 的迴圈變數定義：`segmentOfVarDef` 回傳 null（不屬段，留在 N 副本）。
- 前提：intra-procedural 分析已完成（`reachIns` 供解析、`generatedAt` 供歸段）；`modelbuilder` 在 `buildInterProceduralModels` 時呼叫，順序與現行 `calleeScopesOf` 相同。

## 2. `lib/dujs/callresolver.js`（修改）

```js
calleeScopesOfExpression(node, expression, scopeTree) -> Array<Scope>   // 新：單一呼叫運算式
calleeScopesOf(node, scopeTree) -> Array<Scope>                         // 語意改（T037）：planOf(node, scopeTree).callSites 的 callees 依序串接
```

- `calleeScopesOfExpression`：`CallExpression`（成員 callee 走 `calleeScopesOfMethodCall`）或 `NewExpression`（`calleeScopesOfNew`）；解析規則不變（004 FR-018、005 FR-005 D2）。
- `calleeScopesOfMethodCall` 的 `new F().m()` 分支只回傳 `[method]`（R7）；`new F()` 由 `NewExpression` 自己成為呼叫點。
- `callExpressionOf` 的欄位初始化式特例（`dujsFieldInitializer`）刪除（一般列舉涵蓋，T037）。`scopetree.js` 仍設 `dujsFieldInitializer` 標記，lib 已無讀者（只剩 `tests/dujs/newcallsite.js` 檢查）。
- **循環 require**：`callsplit` 頂層 require `callresolver`（`calleeScopesOfExpression`）；`calleeScopesOf` 要用 `callsplit.planOf`，故在函式內延後 `require('./callsplit')`（先例：defuseanalyzer.js:324 的 `isOpenHandler`），不在檔頭 require。

## 3. `lib/dujs/modelbuilder.js`（修改）

- `getInterProceduralModelStartFromTheScope`：每個節點改用 `callsplit.planOf(node, scopeTree)`；依 `plan.callSites` 逐一、每個呼叫點內依 `callees` 逐一 `hierarchy.addCallEdge`，
  傳入 `{callSite, calleeModel, back, plan, callIndex, lastOfCallSite}`；`findStaticMemberScopesOfClassesAtNode`、`isClassDeclarationNode`、`expressionsEvaluatedAtNode`、`preEvaluatedAt` 與 `keepGenerateAtCallSite` 刪除（class static 成員改為 `class-static` 呼叫點；後兩者的唯一呼叫者是 `findStaticMemberScopesOfClassesAtNode`，同在 T025 刪除以免 `no-unused-vars`）。
- `once-loop` 的 `enteringPrev` 由 plan 提供（`branchsplitter` 匯出 `isInsideLoopBody` 供 `callsplit` 使用；只新增匯出）。

## 4. `lib/dujs/hierarchy.js`（修改）

- `addCallEdge(model, spec)`：spec 新增 `plan`、`callIndex`、`lastOfCallSite`；`beforeDecision` 取自 `plan.shape !== 'statement'`（第一條邊）；刪除 `keepGenerateAtCallSite`。
- `isCallBeforeDecision` 保留給沒有 plan 的呼叫者（測試）；`modelbuilder` 不再使用。

## 5. `lib/dujs/expansion.js`（修改）

- `replayCall(edge, copyOf, records, shallow)`：依 data-model §4 設定段節點的 `segment`、`puseOwners`、GEN（`plan.segmentOfVarDef`，攤平圖經 `flatVarDefOf`、摘要圖用原 VarDef）、exception 邊（`plan.throws`）與前驅改向（`shape`、`enteringPrev`）；
  `once-*` 時在 N 副本（及同一 switch 其他 `case` 副本）設 `discriminantSplit`／`loopRightSplit`。刪除 `splitByInnerClassName`。
- `finishCallRecords`：`exceptionalReturn` 改取段 0 節點的 exception 目標（＝`throwTarget` 的副本；該目標的入邊被改向時隨之改向：`replayLoop` 的 LOOP 節點，或目標為有前插 CALL 的決策節點時的該 CALL；DECISION 012 Q2）。
- `orderOfCalls`：`beforeDecision` 的插入順序不變（前插 CALL 在前、N 在 CALL RETURN 之後）。

## 6. `lib/dujs/defuseanalyzer.js`（修改）

- `findGENSet(cfgNode)`：另設 `cfgNode.generatedAt`（Map<VarDef, AST>）；回傳值不變。段節點的 GEN 由 `replayCall` 給定（`doAnalysis` 的 `node.generate || findGENSet(node)` 已優先取 `generate`）。
- `findUSESet(cfgNode)`：`cfgNode.segment` 存在時，以 `segment.source` 為規則來源（`usedExpressionsOf`、是否為決策節點），只收 `plan.segmentOf(Identifier) === segment.index` 的讀取；
  p-use 讀取在段節點不是 owner 時記入 `cfgNode.deferredPuse`。回傳 `{cuse, puse, deferredPuse}`（無 segment 時 `deferredPuse` 為空 Set，行為與現行相同）。
- `findDUPairs(model)`：另對 `deferredPuse` 產生 `puseOwners` 每個 owner 的 `true`／`false` pair；同一 (定義, owner, 分支) 只加一次。
- **連帶修改 `lib/dujs/summary.js`**：`summaryGraphOf` 的讀取集合（summary.js:160-162，現只合併 `cuse`、`puse`）改為合併 `cuse`、`puse`、`deferredPuse`（去重）；
  否則被呼叫端的 `if (x < f())` 會讓 `x` 漏出 `upwardExposed`（輸出到 `*.matching.json` 的 `summaries`）。`computeForPage`／`summaryOf` 的介面不變（§9）；單元測試擴充 `tests/dujs/summary.js`（R8）。

## 7. `lib/esgraph/`（修改）

- `index.js`（LGPL，檔頭加 Modified 行）：`SwitchStatement` 處理把 `getExceptionTarget()` 記到 `node.cases[0].cfg.discriminantThrowTarget`（不連邊）；`module.exports.throwTypes` 匯出（陣列副本）。
- `branchsplitter.js`（MIT）：判別式脈絡（`origin.type === 'SwitchStatement'`）建立的拆分節點複製 `discriminantThrowTarget`；匯出 `isInsideLoopBody`。
- `flownode.js`（MIT）：新增 `discriminantThrowTarget`、`generatedAt`、`segment`、`puseOwners`、`deferredPuse` 屬性；`copyNodes` 複製 `discriminantThrowTarget`。

## 8. `lib/dujs/cfggraphconverter.js`（修改，DECISION 005 Q1 → A）

- `labelWithLineNumber` 對 CALL 與 CALL RETURN 一律標 `<type> (<line><pathSuffix>)`（現行只對有路徑的 CALL RETURN）；重名的 `_a`、`_b` 規則不變。

## 9. 不變的介面

`reachingsolver.solve` 的 options、`summary.computeForPage`／`summaryOf`、`Model.callSiteRecords()`／`loopRecords()` 的形狀、`*.matching.json` 格式（`dujs-matching/1`）、CLI 參數與輸出檔名。
