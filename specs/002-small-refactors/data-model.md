# Data Model: 三項小型重構

**Feature**: `002-small-refactors` | 設計理由見 [research.md](./research.md)，函式簽章見 [contracts/internal-modules.md](./contracts/internal-modules.md)

本 feature 沒有持久化資料；以下為記憶體內結構的變更。

## 1. FlowNode 的拆分欄位（US2、FR-004～FR-006）

### 移除

| 欄位 | 舊型別／預設 | 取代 |
|------|-------------|------|
| `branchPath` | string，`''` | 拆分節點：`split.path`；呼叫／call return 節點：`labelPath`；讀取一律經 `branchLabel.pathOf(node)` |
| `splitOrigin` | AST，`null` | `split.origin`；「是否為拆分節點」改判 `split !== null` |
| `preEvaluated` | Array(AST)，`[]`（getter 回傳複本） | `split.preEvaluated` |

### 新增

| 欄位 | 型別 | 預設 | 寫入者 | 驗證（setter） |
|------|------|------|--------|---------------|
| `split` | `SplitInfo \| null` | `null` | 只有 `branchsplitter.js` 的 `create` | `null`／`undefined` → null；物件須 `typeof path === 'string'`、`origin` 為非 null 物件、`preEvaluated` 為陣列或省略（→ `[]`），存凍結淺複本；其他輸入忽略 |
| `labelPath` | string | `''` | 只有 `modelbuilder.js` 的呼叫節點與 call return 節點（`= pathOf(callSite)`） | 非字串忽略 |

`SplitInfo`（凍結）：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `path` | string | `T`／`F` 序列，自該敘述第一個決策節點起；第一個決策節點為 `''` |
| `origin` | AST | 被拆分的原敘述（同一敘述拆出的節點共用；switch discriminant 為 `SwitchStatement`；loop 右側為 loop 敘述） |
| `preEvaluated` | ReadonlyArray(AST) | 條件前已求值的運算式（求值次序）；僅決策節點可能非空，葉節點為 `[]` |

### 不變（FR-005）

`isWithObject`（with 物件節點，拆分與否皆可設）、`loopRightSplit`（loop 節點）、`discriminantSplit`（case 節點）維持獨立欄位與既有語意。

### 不變量

- `split === null` ⇔ 節點不是拆分產生的（含呼叫節點、call return 節點、被保留的 loop／case 原節點）。
- `labelPath !== ''` ⇒ `split === null`。
- 巢狀拆分：同一敘述的所有拆分節點 `origin` 相同、`path` 自外層累加（與舊 `splitOrigin`／`branchPath` 相同）。
- `analyzedExpressions` = `(split ? split.preEvaluated : [])` ++ `[astNode]`，每次回傳新陣列。
- 節點的「來源位置」（`cfgbuilder` 的 line／col、`isInsideLoopBody` 的 range）= `split ? split.origin : astNode`。

### 狀態轉移

`create` 建立拆分節點時一次設定 `split`（決策節點同時帶 `preEvaluated`），之後不再改變；`labelPath` 在
inter-procedural 模型建立呼叫／call return 節點時設定一次。

## 2. 分支標籤（US2、FR-006）

| 概念 | 格式 | 唯一定義處 |
|------|------|-----------|
| 節點的標籤路徑 | `split ? split.path : labelPath` | `branchLabel.pathOf` |
| 路徑後綴 | 路徑為 `''` → `''`；否則 `:<路徑>` | `branchLabel.pathSuffix` |
| 行號標籤（測試記法） | `L<行>` ＋後綴 | `branchLabel.lineLabel` |
| 延伸一個分支 | `<路徑><T|F>` | `branchLabel.extendPath` |
| pair p-use 分支記號 | `:T`／`:F` | `branchLabel.branchMark` |

dot 輸出 `labelWithLoc`（`L<行>:C<欄>` ＋後綴）與 `labelWithLineNumber`（`<行>` ＋後綴）的後綴改用 `pathSuffix`，
輸出字串不變。

## 3. 讀寫處清單（US2 實作範圍）

| 檔案 | 位置（現行） | 現行 | 改為 |
|------|-------------|------|------|
| `lib/esgraph/flownode.js` | 建構子 :40-42；屬性 :681-726；`analyzedExpressions` :776-786 | 三欄位 | `_split`、`_labelPath`；屬性與 jsdoc；`analyzedExpressions` 讀 `_split` |
| `lib/esgraph/branchsplitter.js` | `create`、`expand`、`isInsideLoopBody` | `branchPath`／`splitOrigin`／`preEvaluated` 設定；`path + 'T'`；`splitOrigin || astNode` | `split = {…}`；`extendPath`；`split ? split.origin : astNode` |
| `lib/dujs/cfgbuilder.js` | :30 | `splitOrigin || astNode` | `split ? split.origin : astNode` |
| `lib/dujs/cfggraphconverter.js` | :37-40、:50、:98 | `branchPathSuffix` | `branchLabel.pathSuffix(branchLabel.pathOf(node))`，移除本地函式 |
| `lib/dujs/modelbuilder.js` | :280、:291 | `x.branchPath = callSite.branchPath` | `x.labelPath = branchLabel.pathOf(callSite)` |
| `lib/dujs/modelbuilder.js` | :380、:383、:385（`expressionsEvaluatedAtNode`） | `node.preEvaluated.concat(…)` | 本地 helper 取 `split ? split.preEvaluated : []`，邏輯不變 |
| `lib/dujs/defuseanalyzer.js` | :562、:566 | `preEvaluated`、`splitOrigin` | US2 先改讀 `split`；US3 整段移入 `usedExpressionsOf` |
| `tests/helpers/analyze.js` | :10、:45、:65 | `branchPath` 與字串拼接 | `lineLabel(node.line, pathOf(node))`、`!!pathOf(target)`、`branchMark` |
| `tests/esgraph/flownodetest.js` | :692-751 | 三欄位預設／設定／`analyzedExpressions` | `split`／`labelPath` 的預設、驗證、凍結與 `analyzedExpressions` |
| `tests/dujs/branchsplit.js` | :216-242、:439-448、:585、:644 | `node.branchPath` | `branchLabel.pathOf(node)` |
| `tests/dujs/branchsplit.property.js` | :270-281、:383、:452 | `splitOrigin`、`branchPath` | `split`／`split.origin`、`pathOf` |
| `tests/dujs/reviewfixes.js` | :166 | `node.branchPath` | `pathOf(node)` |
| `tests/dujs/analyzehelper.js` | :23-31 | 手建節點設 `branchPath` | 設 `labelPath`（標籤輸出相同） |
| `docs/known-issues.md` | :291 | `FlowNode.branchPath` | `labelPath`／`split.path` 用語 |

機械規則：測試中讀 `node.branchPath` 一律換成 `pathOf(node)`（對拆分節點等於 `split.path`、對呼叫節點等於
`labelPath`、其餘 `''`），預期值不變。

## 4. Decision（US1，decisionfinder 輸出；形狀不變）

`findFirstDecision(root)` → `null` 或 `{split, condition, ancestors, entries}`：

| 欄位 | 說明 |
|------|------|
| `split` | 被拆的 `ConditionalExpression`／`LogicalExpression`／邏輯指派 `AssignmentExpression` |
| `condition` | 要決策的條件（`?:` 的 test、邏輯運算的 left） |
| `ancestors` | root 到 `split` 的節點串列（供 `rewrite` 路徑複製） |
| `entries` | 條件前已求值者 `{node, action: 'placeholder'|'remove'|'compound', ancestors}`（求值次序） |

`preEvaluatedOf(decision)` = `entries` 各取 `node`（`compound` 取 `node.left`）。

## 5. UsedExpression（US3，FR-007）

`usedExpressionsOf(cfgNode)` → `Array<UsedExpression>`，次序即走訪次序（決定 Set 插入次序）：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `expression` | AST | 要走訪的根運算式 |
| `read` | `'c-use'` | 強制：其下所有識別字皆 c-use，不套走訪內 p-use 規則（條件前已求值；拆分葉／with 物件的單一識別字） |
| | `'p-use'` | 起始 `isPUse = true`，走訪內規則照常（case discriminant；決策節點的單一識別字） |
| | `'walk'` | 起始 `isPUse = false`，走訪內規則照常（loop 頭各運算式、其他節點的 astNode） |

節點種類對應依 spec US3 表；逐項等價論證見 research R6。
