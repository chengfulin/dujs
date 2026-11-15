# Data Model: 修正已知問題（#1–#6、#8）

**Feature**: `001-fix-known-issues` | **Date**: 2026-11-16 | 設計依據見 [research.md](./research.md)

dujs 為函式庫＋CLI，無持久儲存；本文件描述分析過程中的記憶體內實體與本輪的欄位變更。

## 1. FlowNode（`lib/esgraph/flownode.js`，MIT）

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `astNode` | AST | 既有，語意擴充 | 一般節點：原敘述（運算式敘述指其 expression）。**拆出的決策節點**：條件運算式（`?:` test、短路／邏輯指派左運算元，或佔位節點）。**葉節點**：路徑複製的合成敘述（R1） |
| `preEvaluated` | `Array<AST>` | **新增**，預設 `[]` | 決策節點在條件之前已求值的前段運算式；GEN／USE 以 c-use 語境走訪 |
| `branchPath` | `string` | **新增**，預設 `''` | 自原敘述第一個決策起的 `T`／`F` 序列；第一個決策與未拆分節點為 `''` |
| `splitOrigin` | AST \| `null` | **新增**，預設 `null` | 拆出節點所屬的原敘述 AST；同一敘述的拆出節點共用 |
| `analyzedExpressions` | `Array<AST>`（唯讀） | **新增** | `preEvaluated.concat([astNode])`，所有 def／use／呼叫走訪的統一入口（R8）；根識別字防護依每個根各自判斷，`preEvaluated` 的根一律 c-use（R7） |
| `isWithObject` | `boolean` | **新增**，預設 `false` | `with` 節點（`astNode` = 物件運算式）設為 `true`，由 `lib/esgraph/index.js` 設定；defuseanalyzer 對此節點不套根識別字防護，物件運算式記 c-use（R6、FR-003） |
| `loopRightSplit` | `boolean` | **新增**，預設 `false` | for-in／for-of 迴圈節點的右側已被拆出決策／葉時，由 branchsplitter 設為 `true`；defuseanalyzer `useLoopHead` 略過 `right`，迴圈節點不重讀右側（R3、spec US5 情境 16） |
| `line`／`col` | number | 既有 | 拆出節點取原敘述的 `loc.start`（D13：行號為原敘述所在行） |
| `true`／`false` | FlowNode | 既有 | 決策節點兩者皆非 null（FR-010 不變量） |

**驗證規則**

- V1：`type === NORMAL` 且有 `true` 則必有 `false`，反之亦然（FR-010）。
- V2：`branchPath` 只含 `T`／`F`；同一 `splitOrigin` 下兩兩不同；非空路徑去掉最後一碼必為同敘述某決策節點的
  路徑（D13）。
- V3：`preEvaluated` 非空者必為決策節點。
- V4：拆出節點不得是「敘述語境中無 use、無 def、無呼叫的非決策節點」（空分支不建節點）；例外：`return`／
  `throw` 的葉一律建節點（spec D15），`return` 葉接 exit、`throw` 葉接原節點既有的 EXCEPTION 出邊目標。

**生命週期**：esgraph 建基本 CFG → `branchsplitter.split(allNodes, { expressionThrows })` 以決策子圖取代含可拆
運算的節點（原節點不進入 `allNodes`；for-in／for-of 右側例外：迴圈節點保留並設 `loopRightSplit`）→ DFS 排序、指派 cfgId → cfgbuilder 設 `line`／`col` → modelbuilder 設 scope、必要時成為
CALL 節點（其 callReturn 節點複製 `line`／`col`／`branchPath`）。

## 2. 佔位節點 `DujsEvaluatedValue`（合成 AST，`lib/esgraph/branchsplitter.js`）

| 欄位 | 說明 |
|------|------|
| `type` | `'DujsEvaluatedValue'`（walkes 未知型別，無子節點，不產生 use） |
| `known` | `'truthy'`（`||`／`||=` 的 T）、`'falsy'`（`&&`／`&&=` 的 F）、`'nonnull'`（`??`／`??=` 的 T）、`'unknown'`（前段值） |
| `range`／`loc` | 被取代的原運算式 |

條件語境遇到佔位節點：`truthy`／`falsy` 直接接 true／false 目標；`nonnull`／`unknown` 建一個無 use 的決策節點
（R3）。敘述語境中整個值只剩佔位節點且無 def：不建節點（Clarification 2026-11-16）。

### branchsplitter 模組介面

| 介面 | 說明 |
|------|------|
| `split(allNodes, { expressionThrows: fn })` | 由 `lib/esgraph/index.js`（LGPL）在既有邊連好、DFS 排序與 cfgId 指派之前呼叫；`expressionThrows(astNode)` 為 index.js 傳入的 callback，branchsplitter（MIT）只呼叫它判斷拆出節點是否可能拋例外，不含任何 LGPL 程式碼；拆出節點的例外目標取原節點既有的 EXCEPTION 出邊（R3） |

## 3. 合成 AST（皆以不可列舉屬性快取於原 AST，重複建 CFG 取得同一物件）

| 屬性 | 掛在 | 內容 | 用途 |
|------|------|------|------|
| `dujsBodyStatement` | 箭頭函式 | 既有：運算式本體的 `ReturnStatement` | 不變 |
| `dujsBodyWithParamInits` | 有預設值參數的函式／箭頭函式 | **新增**：`BlockStatement`＝依序的參數初始化 `ExpressionStatement(名稱 = 預設值)` ＋ 原本體 | FR-005（R4） |
| `dujsScopeFunction` | `PropertyDefinition`（有 value）、`StaticBlock` | **新增**：無參數 `FunctionExpression`（本體為欄位值敘述或 static block 本體），`range`／`loc` 取成員 | FR-006（R5） |

## 4. Scope（`lib/dujs/scope.js`、`lib/dujs/scopetree.js`）

| 變更 | 說明 |
|------|------|
| 新 scope 來源 | 欄位初始化式、static block：`AnonymousFunctionScope`，`ast` 為 `dujsScopeFunction`，名稱 `$ANONYMOUS_FUN_<n>`（spec Assumptions） |
| 名稱唯一化 | `_name` 新增內部 setter；`buildScopeTree` 結束後對每個父 scope 的子 scope 依原始碼順序加 `_1`、`_2`…（跳過兄弟原名與已指派名），重建 name map（FR-011） |
| static 成員的接入 | 不是 Scope 欄位；由 modelbuilder 在 inter-procedural 階段把 class 節點串接到各 static scope（R5） |

**狀態轉換**（static 接入）：`class 節點 —CALL→ S1.entry … S1.exit —RETURN→ ret1 —CALL→ S2.entry … —RETURN→ retN → 原後繼`。

## 5. Def-use pair（`lib/dujs/dupair.js`、`lib/dujs/pair.js`）

結構不變：c-use 為 `(defNode, useNode)`；p-use 為 `(defNode, (decision, target))`，`target` 為 `decision.true` 或
`decision.false`。不變量：p-use 的 `target` 不為 null（FR-010）。

## 6. 測試輔助工具輸出（`tests/helpers/analyze.js`）

字串格式見 [contracts/analyze-helper-notation.md](./contracts/analyze-helper-notation.md)。
