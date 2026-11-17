# Contract：摘要、求解器與相關 lib API

**Feature**: `005-summary-analysis` | 資料結構見 [data-model.md](../data-model.md)；設計理由見 research R1–R8。所有新模組為 dujs 自有（MIT）。

## 1. `lib/dujs/summary.js`（新）

| API | 說明 |
|-----|------|
| `computeForPage(scopeTree)` | 以 `modelbuilder.callModelOf` 取得每個 scope 的直接呼叫，建 scope 呼叫圖，SCC 反拓撲序、SCC 內從 ⊥ 反覆求解至不變；結果存入該頁表。重複呼叫為 no-op |
| `summaryOf(scope)` | 回傳該 scope 的 Summary；未計算時拋錯（不得默默回傳恆等） |
| `apply(summary, vardefs)`／`applyExceptional(summary, vardefs)` | data-model §1；回傳新 Set，不改輸入 |
| `reset()` | 測試用；清空所有頁的表 |

不變式：摘要計算不寫入任何 FlowNode 或 Model；SCC 迭代超過上限拋 `Error('summary fixpoint did not converge: <scopes>')`。

## 2. `lib/dujs/reachingsolver.js`（新）

`solve(graph, options)`：純函式。邊貢獻依 research R2；`options.calls`（CallSiteRecord）與 `options.loops`（LoopRecord）提供虛擬貢獻；`options.summaryOf` 與
`options.flatVarDefOf`（摘要的 original VarDef → 本圖 VarDef；摘要圖為恆等）。相容模式（未給 `calls`／`loops`，Foundational 至 US1 前）：`options.extraReachIns(node, outOf)`（`outOf(m)` 回傳 m 當下的 OUT 並登記依賴；求解前對全部節點先呼叫一次，見 data-model §6）
為動態回呼（依迭代中的 `OUT(callNode)`，變動時 callReturn 重新入列）；`options.exceptionToCalleeExitCarriesOut` 為過渡規則（analyze Q1：指向被呼叫端 exit 的 exception 邊帶
`OUT(p)`），US1 刪除。完整選項見 data-model §6。回傳 `{results: Map(node → {in, out, generate, kill}), exitArrivals: {normal: Set, exceptional: Set}}`。

## 3. 既有模組的變更

| 模組 | 變更 |
|------|------|
| `defuseanalyzer.js` | `doAnalysis` 改呼叫 `reachingsolver.solve`（upper 模型帶 calls／loops 與摘要）；移除 callReturn 的 `bypassFilter` 合併（`_bypassFilter` 測試介面保留為摘要可見性過濾的實作並維持其單元測試）；`findUSESet` 移除 entry 特例 |
| `usedexpressions.js` | ENTRY／EXIT 節點回傳 `[]`（FR-008） |
| `expansion.js` | `replayCall`：非決策節點前的呼叫，例外邊留在 callSite（Q-a）；`expand` 回傳增加 `calls`（CallSiteRecord，含 `exceptionalReturn`、entry／exit）、`loops`、`flatVarDefOf`；`replayLoop` 納入 `finally` 型別；新增 `expandShallow(model)` |
| `model.js` | `setCallBypasses`／`callBypassOf` 的值改為 CallSiteRecord；新增 `setLoopRecords`／`loopRecords`、`setFlatVarDefOf`／`flatVarDefOf` |
| `modelbuilder.js` | 記錄 `callModelOf(scope)`；`setFlatGraphFromHierarchy` 存 calls／loops／flatVarDefOf |
| `defuseanalysisexecutor.js` | `buildInterProceduralModelsOfEachPageModels` 在 `buildInterProceduralModels()` 後、分析前呼叫 `summary.computeForPage` |
| `callresolver.js` | `resolveVariable` 加 D2 放寬（research R8），需傳入運算式種類 |
| `scopebinding.js` | 新增 `PageBinding.prototype.isRelaxedCallee(aVar)`；移除 `isOnFunctionChain` |
| `def.js`／`deffactory.js` | 新增 `Def.SENTINEL_TYPE` 與 `createSentinelDef` |
| `lib/esgraph/flownode.js`、`flownodefactory.js` | `finallyExit` 節點型別、`finally` 連接型別與 factory 方法 |
| `lib/esgraph/index.js`（LGPL） | research R6；檔頭 Modified 清單加一行（route catch throws, jumps and exceptional completion through non-empty finally blocks） |
| `lib/esgraph/dot.js`（LGPL） | 繪出 `finallyExit` 節點與 `finally` 邊；同樣加 Modified 紀錄 |
| `cfggraphconverter.js` | 新增 `dotNodeIds(graph)`，`toDot*` 與配對輸出共用 |
| `outputwriter.js` | 每個 inter-procedural、intra-page、inter-page 模型另寫 `<index>.matching.json`（[matching-output.md](./matching-output.md)）；不產 png |

## 4. 相容性

- CLI 參數、`.dot` 檔名與既有欄位不變；新增檔案只有 `*.matching.json`。
- `tests/helpers/analyze.js` 的 `reset` 加 `summary.reset()`。
- 006 的唯一來源規則（`specs/006-eslint-scope/contracts/static-check.md` S1–S6）不得被打破：`isRelaxedCallee` 放在 scopebinding，其他模組只呼叫它；
  `tests/dujs/scopesource.js` 白名單若列有 `isOnFunctionChain`，同步移除並列入 golden-diff「單元測試期望」。
