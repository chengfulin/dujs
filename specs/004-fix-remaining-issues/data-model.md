# Data Model：修正其餘已知問題

**Feature**: `004-fix-remaining-issues` | 延伸 `specs/003-hierarchical-models/data-model.md`（Model／Hierarchy／Unit／Edge）。

## 1. Call-site（呼叫點）

| 欄位／判定 | 說明 |
|-----------|------|
| 呼叫運算式 | `callResolver.callExpressionOf(node)`：astNode 為 `CallExpression`／`NewExpression`；或實例欄位合成 `return` 的引數為 `this.m()`／`new B()`（FR-017） |
| 被呼叫端 | static 成員 scope（class 定義在此節點，既有）＋`calleeScopesOf(node)`（research R2 表），依執行順序；空陣列＝不是 call-site |
| 不變條件 | 只依 intra-procedural 原件的 `reachIns` 與 AST（FR-018 的 class 放寬另讀全頁 intra-procedural 模型節點的 GEN）；同一節點的多個被呼叫端串接（前一個 CALL RETURN 是下一個的呼叫點） |

## 2. Class 索引（每頁一份，`callresolver` 內 WeakMap(scopeTree → index) 快取）

```
ClassInfo {
  node,                  // ClassDeclaration | ClassExpression
  rangeKey,              // 'start,end'，對 FUNCTION／literal 定義的 range
  isDeclaration,         // FR-007 只對 class 宣告生效
  hasSuperClass,         // 不追 extends（README）
  constructorScope,      // Scope | null
  instanceFieldScopes,   // Array<Scope>：有值的實例欄位，原始碼順序
  instanceMethods,       // Map(name → Scope)：kind 'method'、非 static、非 computed、非 private
  staticMethods          // Map(name → Scope)：同上但 static
}
ClassIndex {
  byRange: Map(rangeKey → ClassInfo),
  byMemberScope: Map(Scope → {classInfo, isStatic}),   // 方法、constructor、欄位、static block 的 scope
  newExpressionsByRange: Map(rangeKey → NewExpression AST)
}
```

## 3. Call Edge（修訂 003 data-model §3）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `kind` | `'call'` | 不變 |
| `seq`、`caller`、`callSite`、`order`、`beforeDecision`、`callNode`、`callReturn` | — | 同 003 |
| `callee` | Unit | 一般邊：被呼叫模型的單位（加入 `units`）；回邊：目標 intra-procedural 模型的單位（**不**加入 `units`） |
| `calleeModel` | Model | 一般邊：intra 或 inter-procedural 模型；回邊：目標 scope 的 intra-procedural 模型 |
| `back` | boolean | 新：回邊（FR-015） |
| `keepGenerateAtCallSite` | boolean | 新：FR-007 |

**不變條件**
- 一個扁平圖中，每個呼叫點原件至多被一條呼叫邊使用（`built` 保證同一 DFS 中每個 scope 只有一個模型；跨根只重用無回邊的模型）。
- 回邊的目標必在展開根的子樹中（＝封閉）；開放模型不登記、不展開。

## 4. 模型的狀態（inter-procedural）

```
建立（createCallHierarchyModel）→ 加邊（addCallEdge，含回邊）→ 凍結（freeze）
  ├─ 封閉（openTargetsOf = []）→ 展開（expand → graph, flatNodeOf, bypasses）→ 登記（scope 尚未登記時）→ 分析
  └─ 開放（openTargetsOf ≠ []）→ 只作為外層模型的子單位（不展開、不登記、不分析）
```

## 5. Bypass（FR-016）

```
Bypass { callNode: FlowNode(複本), callReturn: FlowNode(複本), calleeScope: Scope }
model.callBypassOf(callReturn) → Bypass | null
bypassFilter(defs, calleeScope) = { d ∈ defs | calleeScope.getVariable(d.variable.name) !== d.variable
                                            ∨ d.variable ∈ calleeScope.getVariablesIncludingBlockScopes() }
ReachIn_eff(callReturn) = ReachIn(callReturn) ∪ extraReachIns ∪ bypassFilter(Out(callNode), calleeScope)
```

## 6. 參數初始化節點（FR-006、FR-008）

| 參數形式 | 初始化節點（依序） |
|----------|-------------------|
| `x = e` | `x = e`（不變） |
| `{x = d, y = x}`（無外層預設值） | `x = d`、`y = x`（不變） |
| `{x = d, y = x} = D` | `D`（只求值，GEN 空）、`x = d`、`y = x` |
| 巢狀：`{a: {b = 1} = E} = D` | `D`、`E`、`b = 1`（前序展開） |

預設值中的函式／箭頭函式：所屬函式的子 scope（scope 樹走訪 `params`）。

## 7. CLI 執行（FR-009、FR-010）

```
Invocation { pages: Array<Array<string>>, help: boolean }
ParseError { message }                     → exit 2
ReadError { file, cause }                  → exit 1，無輸出目錄
Run { outputDir: string（唯一）}            → 成功 exit 0；例外 → 刪除 outputDir，exit 1
```

輸出目錄名稱：`out-<YYYY>-<MM>-<DD>-<H>-<M>-<S>`，`EEXIST` 時 `_<n>`（n ≥ 1，遞增）。

## 8. Golden 差異紀錄（FR-013）

```
GoldenDiffRow { case, file, location, content, oldSha12, newSha12, kiSection, fr }
```
每一列對應 manifest 的一個鍵變更；每個 KI 節次的每個 case 沒有列時寫「無差異」。
