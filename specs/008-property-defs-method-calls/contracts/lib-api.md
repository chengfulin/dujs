# Contract：lib 介面（feature 008）

**Feature**: `008-property-defs-method-calls` | 理由見 [research.md](../research.md) R1–R7、R14；只列新增與語意改變者。CLI 輸出格式（`.dot`、`report.html`、`*.matching.json`）不變，沒有新的節點型別、邊型別（FR-005）。

## 1. `lib/dujs/scopebinding.js`（新增方法）

```js
PageBinding.prototype.isLocalStorageObject(identifier) -> boolean   // R1 (a)：localStorageVar() 存在且 ∈ defVarsOf(identifier)（D008 的 Var 同一性）
PageBinding.prototype.isRelaxedInstance(aVar) -> boolean            // R7：binding kind ∈ RELAXED_INSTANCE_KINDS = [let, const]（D002）
PageBinding.prototype.isLogicalAssignmentTarget(node) -> boolean    // R2-4：node 是頁面上某個邏輯賦值（&&=、||=、??=）的 left 節點（以物件同一性）
```

- `isLogicalAssignmentTarget` 的集合在建構 `PageBinding` 時與 `collectAssignmentTargets` 同一次走訪收集，不另走一次 AST。
- 既有方法語意不變（`defVarsOf`、`useVarsOf`、`isRelaxedCallee`、`localStorageVar`）。

## 2. `lib/dujs/hierarchy.js`（純重構）

- `definesLocalStorage(graphNode, identifier)` 改為 `binding.isLocalStorageObject(identifier)`（無 binding 時 false）；`definingLocalStorageNodes` 的語法判定與結果不變（s1–s14 的儲存定義節點數不變）。

## 3. `lib/dujs/defuseanalyzer.js`（語意改變）

- `findGENSet`：成員目標不定義任何變數，物件變數（R1 (b)，沿 `.object` 鏈到達的 Identifier）為 domain `localStorage` Var 時維持 develop（`left.object` 是 Identifier 時定義它）；巢狀賦值的遞迴條件為「develop 會定義左側」（R1 (d)）。
- `getDefinedVariables`（私有）：`MemberExpression` 目標只在 `object` 是 Identifier 且 `isLocalStorageObject` 時回傳該 Var。
- `findUSESet`：`=` 的非解構成員目標先讀物件運算式與計算鍵（`isLogicalAssignmentTarget(left)` 為真或豁免時不讀）；解構賦值另讀 `bindingPattern.getMemberTargetReads(left)`（豁免者略過）。p-use／c-use 依既有的條件模式與引數深度規則。
- `findDUPairs`（US3，FR-013、D017）：第二段（deferred p-use 與 `puseOwners` 的配對）只在 owner 依求解器可到達時配對——model 已有分析結果且 `model.analysisResultOf(owner) === null`（`doAnalysis` 只為 reached 節點存結果）時略過該 owner；model 尚未分析時維持現行行為。第一段（c-use、節點自己的 p-use）不變；intra-procedural 模型沒有 deferred p-use，不受影響。理由見 research R14。
- `computeKILLSet`、`isVisibleToCallee` 的介面不變。

## 4. `lib/dujs/bindingpattern.js`（新增方法）

```js
BindingPattern.prototype.getMemberTargetReads(pattern) -> Array<AST>   // 樣式中每個 MemberExpression 目標的 object，計算鍵時接著 property；樣式順序
```

## 5. `lib/dujs/usedexpressions.js`（語意改變）

- `loopHeadExpressions(node, rightSplit)`：左側是成員目標時，物件變數非豁免者另推入計算鍵 `left.property`；左側是樣式時推入 `getMemberTargetReads(left)` 中物件變數非豁免者。順序：左側（物件、鍵、樣式中的預設值與計算鍵），再右側（未拆分時）。
  豁免判定需要 binding：函式簽名改為 `loopHeadExpressions(node, rightSplit, binding)`（`binding` 可為 null，此時不豁免任何目標；`astNodeItems` 傳入 `cfgNode.scope.binding`）。

## 6. `lib/dujs/callresolver.js`（語意改變）

- `classOfInstance(node, identifier, scopeTree)`：沒有到達的定義時改由私有 `relaxedClassOfInstance` 判定（R7 的四個條件），其餘不變。匯出項目不變。

## 7. 不改（以測試確認）

`lib/dujs/summary.js`、`reachingsolver.js`（FR-013 不需新介面：reached 由分析結果的有無表示）、`expansion.js`、`callsplit.js`、`modelbuilder.js`、`outputwriter.js`、`cfggraphconverter.js`、`lib/esgraph/**`（含 LGPL 檔與 `astrewriter.js`）。
