# Contract: 內部模組介面

**Feature**: `002-small-refactors`

本 feature 無對外 API、CLI 參數或輸出格式變更（golden 逐位元組相同）。本文件定義新拆出／新增的**內部**模組介面，
作為單元測試的對象與後續 feature（分層模型）的依據。資料形狀見 [data-model.md](../data-model.md)。

## 不變的對外介面（FR-002）

```js
// lib/esgraph/branchsplitter.js（由 lib/esgraph/index.js 以 require('./branchsplitter') 使用）
split(entryNode, { expressionThrows: function (astNode) { return boolean; } }) // → Array<FlowNode>（新建節點）
PLACEHOLDER_TYPE // 'DujsEvaluatedValue'（re-export 自 decisionfinder）
```

## 依賴規則（FR-001、SC-003）

```text
branchsplitter.js ──> astrewriter.js ──> decisionfinder.js
        │                                     ▲
        ├──> flownode.js / flownodefactory.js  │ （astrewriter、decisionfinder 禁止 require flownode*）
        ├──> branchlabel.js                    │
        └──────────────────────────────────────┘
```

每個模組 < 350 行。

## `lib/esgraph/decisionfinder.js`（只讀 AST）

| 匯出 | 簽章 | 說明 |
|------|------|------|
| `findFirstDecision` | `(root: AST) → Decision \| null` | 依求值次序找第一個要拆的條件；不修改 root |
| `preEvaluatedOf` | `(decision: Decision) → Array<AST>` | 條件前已求值的運算式（求值次序） |
| `isInert` | `(node: AST?) → boolean` | 不讀變數、不定義、不呼叫（placeholder、literal、函式運算式及其組合）；null 為 true |
| `isPlaceholder` | `(node: AST?) → boolean` | `type === PLACEHOLDER_TYPE` |
| `PLACEHOLDER_TYPE` | `'DujsEvaluatedValue'` | — |

單元測試（FR-003）至少涵蓋 `searchByType` 每個 case 一例：`ConditionalExpression`、`LogicalExpression`（`&&`／`||`／`??`）、
`AssignmentExpression`（邏輯指派、複合指派 → `compound` entry、一般 `=`）、`SequenceExpression`、`TemplateLiteral`、
`BinaryExpression`、`UnaryExpression`／`UpdateExpression`／`AwaitExpression`／`YieldExpression`／`SpreadElement`、
`MemberExpression`（物件與計算鍵先求值）、`CallExpression`／`NewExpression`（callee 隨葉、不入 entries）、
`TaggedTemplateExpression`、`ArrayExpression`（含空洞）、`ObjectExpression`／`Property`（計算鍵）、`ImportExpression`、
`ClassDeclaration`／`ClassExpression`（superClass、計算鍵；本體不搜尋）、`VariableDeclaration`（前面的宣告子 → `remove`）、
`ExpressionStatement`、`ReturnStatement`／`ThrowStatement`、`SwitchCase`、`ExportDefaultDeclaration`（運算式 vs 宣告）、
default（識別字、可選鏈 → null）；另含 `isInert` 各分支。

## `lib/esgraph/astrewriter.js`（複製改寫 AST，不修改輸入）

| 匯出 | 簽章 | 說明 |
|------|------|------|
| `placeholder` | `(known: 'truthy'|'falsy'|'nonnull'|'unknown', replaced: AST) → AST` | 已求值佔位節點（帶 replaced 的 range／loc） |
| `branchesOf` | `(split: AST) → [AST, AST]` | T、F 分支的替換（邏輯指派的賦值分支為合成 `=` 指派） |
| `staticChoice` | `(split: AST, condition: AST) → AST \| null` | 條件為已知值 placeholder 時直接選定的替換 |
| `rewrite` | `(root, ancestorLists, replacements: Map, compounds: Array) → AST` | 路徑複製；路徑外子樹共用 |
| `branchRoot` | `(root, decision: Decision, replacement: AST) → AST` | 某分支的 AST：split 換成 replacement、entries 換成 placeholder／移除／複合改寫 |

單元測試：每個 `branchesOf` 運算子、`staticChoice` 的已知值組合、`branchRoot` 三種 entry action；每例斷言輸入 AST
（深度凍結或 JSON 快照）不變、路徑外子樹與原 AST 為同一物件。

## `lib/esgraph/branchlabel.js`（分支標籤格式唯一定義處，FR-006）

| 匯出 | 簽章 | 結果 |
|------|------|------|
| `TRUE_BRANCH`／`FALSE_BRANCH` | — | `'T'`／`'F'` |
| `pathOf` | `(node) → string` | `node.split ? node.split.path : node.labelPath` |
| `pathSuffix` | `(path: string) → string` | `''` 或 `':' + path` |
| `lineLabel` | `(line: number, path: string) → string` | `'L' + line + pathSuffix(path)` |
| `extendPath` | `(path: string, branch: 'T'|'F') → string` | `path + branch` |
| `branchMark` | `(branch: 'T'|'F') → string` | `':' + branch` |

## `lib/dujs/usedexpressions.js`（FR-007）

| 匯出 | 簽章 | 說明 |
|------|------|------|
| `usedExpressionsOf` | `(cfgNode: FlowNode) → Array<{expression: AST, read: 'c-use'|'p-use'|'walk'}>` | 依 spec US3 節點種類表；規則細節見 research R6 |

`DefUseAnalyzer.prototype.findUSESet(cfgNode)` 的簽章與回傳 `{cuse, puse}` 不變。

單元測試（FR-008，手建 FlowNode＋解析出的 AST，或取自 `cfgBuilder.getCFG` 的節點，不跑 worklist）對應 spec US3
情境 1–5：決策節點（含 preEvaluated）、拆分葉／with 物件／`if (a)`／`a;` 的單一識別字、`case y`／`default`／discriminant
已拆分、for-in/for-of（左側成員存取、解構預設值與計算鍵、右側已拆分與否）、一般節點。
