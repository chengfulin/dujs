# Data Model：改用 eslint-scope 判定變數的宣告與參照

**Feature**: `006-eslint-scope` | 對應 spec Key Entities：宣告（Declaration）、識別字解析（Resolution）、Golden 差異紀錄

## 1. PageBinding（新，`lib/dujs/scopebinding.js`；每頁一份，掛在 `ScopeTree.binding`）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `scopeManager` | eslint-scope ScopeManager | R1 的選項分析整頁 AST 的結果（唯一來源） |
| `referenceOf` | `Map(Identifier, Reference)` | 全部 scope 的 references（身分鍵） |
| `declaredBy` | `Map(Identifier, Variable[])` | 宣告識別字（`Definition.name`）→ Variable；class 宣告的 id 對應兩個 |
| `varOf` | `Map(Variable, Var)` | 有宣告（`defs.length > 0`）的 Variable 與 dujs Var 一對一 |
| `ownerOf` | `Map(eslint Scope, dujs Scope)` | research R4 的擁有者表 |
| `eslintScopeOf` | `Map(dujs Scope, eslint Scope)` | dujs function／page／synthetic scope → 其 eslint scope（block scope → 其節點的 eslint block scope） |
| `globalsByName` | `Map(name, Var)` | D3 頁面＋名稱的全域（白名單 W1，只在 `globalVariableOf` 內存取） |
| `definingScopeOf` | `Map(Var, dujs Scope)` | 宣告 eslint scope 沒有自己 dujs scope 的 Var（class 內層、catch 參數、具名運算式名稱、無 lexical 的 block 中的宣告）→ 產生其定義的 CFG 節點所屬 dujs scope（research R6 (c)，Q1） |
| `visibleCache` | `Map(dujs Scope, Set(Var))` | research R6 的可見集合 (a)∪(b)∪(c)，延遲計算 |
| `pageScope`、`domainScope` | dujs Scope | fixed list Var 在 pageScope；`localStorage` Var 在 domainScope |

**驗證規則**（scopebinding 單元測試，US4-9）：
- 每個 `defs.length > 0` 的 Variable 恰有一個 Var；`arguments`（`defs` 為空）沒有 Var。
- 每個 Var 恰屬一種來源：Variable、fixed list／`localStorage`、頁面＋名稱全域。例外：頁面層級（global／module scope）宣告的 fixed list 同名
  Variable 對應到該 fixed list Var（develop 中兩者本是同一個 Var，research R9），此時該 Var 的 `binding.variable` 為該 Variable。**此例外只適用於 page scope
  的 fixed list，不含 domain scope 的 `localStorage`**：頁面宣告的 `localStorage` 是頁面自己的 Var（同 develop，F9 (2)）。
- 頁面層 `function Map() {}` 等與 fixed list 同名的函式宣告（F9 (1)）：依上一條對應到 builtin Var，維持 develop——擁有者 entry **不給函式定義**（只有 builtin 的
  `object`／`htmlDom` 定義）、呼叫 `Map()` **不連結**到 `Map` 函式 scope（callresolver 看到的定義不是 function def）；`Map` 函式 scope 仍存在（FR-009）。
  守門 probes/plan-bi.js（develop：`Map: entry -> L2`、無 inter-procedural 模型）。
- `ownerOf` 涵蓋 `scopeManager.scopes` 的每一個 scope；dujs scope 的數量與名稱不因 binding 改變。

## 2. Var（修改 `lib/dujs/var.js`）

| 欄位 | 說明 |
|------|------|
| `name` | 不變（輸出列名）；名稱驗證放寬為 ES IdentifierName（U1，見下方「名稱規則」） |
| `binding`（新，唯讀） | `{variable: Variable|null, kind: VarKind, declarations: Array<{kind, node}>}`；由 PageBinding 建立時設定 |

**VarKind**（spec Clarifications 的列舉；`declarations[].kind` 同此列舉）：

| kind | 來源（eslint-scope `Definition`） | entry 初值（`analyzeDefaultValueOfLocalVariables`） |
|------|----------------------------------|-----------------------------------------------------|
| `var` | `Variable`，`parent.kind === 'var'` | `undefined`（若同一 Var 另有 `function` 宣告則無，同 develop） |
| `let`／`const` | `Variable`，`parent.kind` 為 `let`／`const`（`using`／`await using` 歸 `const`） | 無（TDZ） |
| `function` | `FunctionName`（FunctionDeclaration） | 無；函式定義在擁有者 entry（`analyzeFunctionDeclaration`） |
| `class` | `ClassName`（ClassDeclaration，外層與內層皆是） | 無；class 節點定義兩者 |
| `parameter` | `Parameter` | `undefined`；**同一 Variable 另有 `function` 宣告（`function f(a) { function a() {} }`）時無 `undefined` 初值**，只有函式定義（同 develop，F9 (3)；probes/plan-pf.js：develop 有 `a: entry -> L3`，無 undefined 初值的 pair） |
| `catchParameter` | `CatchClause` | 無；catch 節點定義 |
| `import` | `ImportBinding` | 無；import 節點定義 |
| `namedExpressionName` | `FunctionName`（function-expression-name scope）、`ClassName`（ClassExpression 的 class scope） | 無；運算式所在節點定義 |
| `global` | 未解析、頁面中只有讀取 | 新定義種類 `global`（`Def.GLOBAL_TYPE`）於頁面 entry |
| `implicitGlobal` | 未解析、頁面中有寫入（含 for-in 左側、`++`、解構） | `undefined`（現行） |
| fixed list／`localStorage` | 名稱對應（白名單 W3） | 現行 `htmlDom`／`object`／`localStorage` 定義，不變 |

**`binding.kind` 的取法（一個 Variable 有多種宣告時，F9 (4)）**：`declarations` 中有 `function` 者為 `function`（與 entry 初值規則一致：函式宣告勝出）；
否則取 eslint-scope `Variable.defs[0]` 的種類（參數先於本體宣告，故 `function f(a) { var a; }` 為 `parameter`）。fixed list 對應到頁面宣告時，`kind` 取該
Variable 的規則，`binding.variable` 為該 Variable。`declarations` 永遠列出全部宣告（各自的 kind）。

**名稱規則（U1）**：`Var.isValidName` 放寬為 ES IdentifierName（`/^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u`）；`$ANONYMOUS_FUN_0` 等與 scope
保留名稱同字的 Var 名合法（research R12）。

`declarations` 為空者：`global`、`implicitGlobal`、未被宣告的 fixed list Var。同一 Variable 多個宣告（`var x; var x;`）各列一筆。FR-001 的「以參照為準」：
catch-edge L10 的 `e` 的 **def** 歸 catch 參數 Var，但宣告節點仍列在外層 `e` 的 `declarations`。

## 3. Scope 的變數儲存（修改 `lib/dujs/scope.js`）

| 舊 | 新 |
|----|----|
| `_vars: Map(name, Var)`、`_params`、`_paramNames`、`_namedFunctionVars`、`_builtInObjectVars`、`_lexicalNames` | `_variables: Var[]`（登記順序＝research R5） |
| `getVariable`、`hasVariable`、`getLocalVariable`、`hasLocalVariable`、`getScopeWhereTheVariableDeclared`、`addGlobalVariable`、`addLocalVariable`、`addLexicalVariable`、`addParameter`、`addInnerFunctionVariable`、`hasNamedFunction`、`hasBuiltInObject`、`isLexicalVariable`、`getParamNameWithIndex`、`vars`、`params`、`namedFunctionVars`、`builtInObjectVars` | 移除（FR-012 (1) 禁止） |
| — | `addVariable(var)`（以身分去重）、`variables`（陣列複本）、`getVariablesIncludingBlockScopes()` 改回傳 `Var[]`（本 scope 與子孫 block scope） |

`builtInObjects`（PageScope、DomainScope 的 fixed list 描述）不變；`setBuiltInObjectVariables()` 改為建立 Var 後 `addVariable`，並交給 PageBinding 的 W3 表。

## 4. Def（修改 `lib/dujs/def.js`、`deffactory.js`、`vardeffactory.js`）

- 新增 `Def.GLOBAL_TYPE = 'global'`，加入 `Def.TYPES`；`defFactory.createGlobalDef(from, range)`；`varDefFactory.createGlobalVarDef(variable, node, Def.GLOBAL_TYPE)`
  沿用既有的 global range。既有 `htmlDom`、`object`、`localStorage` 不變（US3-2）。

## 5. 識別字解析（Resolution）

兩個 API（F5，research R3）：

```text
useVarsOf(identifier) → Var[]            （USE、callee、handler）
  Reference r = referenceOf(identifier)
    無 r                          → []          ← 不回退 declaredBy
    r.resolved 有 Var             → [variableVar(r.resolved)]
    r.resolved 為 arguments 類    → []
    r 未解析                       → W2 排除？[] : W3 builtin？[builtin] : [globalVariableOf(name)]

defVarsOf(identifier) → Var[]            （GEN、getDefinedVariables、variableanalyzer）
  有 r                            → 同上（寫入 Reference，或 `G.p = v` 的 `G` 讀取 Reference）
  否則 declaredBy(identifier)     → 各 Variable 的 Var（class 宣告 id → 外層＋內層 2 個）
  否則                            → []
```

`binding.isVisible(var, dujsScope)`：research R6 (a)∪(b)∪(c)；`binding.isOnFunctionChain(var, dujsFunctionScope)`：research R6a（函式 entry 節點的 USE 過濾，Q3）；
`binding.classBindingGroupOf(var)`：research R7。

## 6. 狀態：建立順序（`defuseanalysisexecutor.initialize`）

1. 每頁：`parseAST` → `scopeCtrl.addPageScopeTree(ast)`：`PageBinding.analyze(ast)`（eslint-scope）→ `ScopeTree.buildScopeTree(ast)` → `binding.attach(scopeTree)`（建立 `ownerOf`、`eslintScopeOf`）。
2. `variableAnalyzer.setLocalVariables(domainScope)`，各頁各 scope 依 `scopeTree.scopes` 順序 `setLocalVariables(scope)`（R5）。
3. 各頁 `binding.registerRemainingVariables()`（R5 的補登記：catch 參數／具名運算式名稱／class 內層 → 只被 `++`／for-in 寫入的隱含全域 → 只讀全域），
   建立 `definingScopeOf`，並驗證 §1 的一對一規則（不符即拋錯，屬程式錯誤）。
4. 之後的建模與分析只透過 §5 的 API 取得變數。

## 7. Golden／MDN 差異紀錄（對應 Key Entity「Golden 差異紀錄」）

| 欄位 | 說明 |
|------|------|
| `case` | golden case 目錄（`expected`、`expected-es2015`、`expected-interprocedural`、`expected-fixes004`）或 MDN 範例 id |
| `file`／`level` | dot 檔相對路徑；模型數量變化時以層級（`intra-procedurals` 等）為單位 |
| `unit` | `pair`、`row`（dupairs.dot 的變數列）、`model`（層級內的檔案數）、`graph`（graph／hierarchy.dot 的雜湊變化） |
| `sign` | `+`／`-` |
| `content` | 正規化後的 pair（`name: def -> use`，標籤去掉 `_a` 類字母尾碼）、列名或模型數 |
| `category` | `解析`、`全域`、`catch`、`AnnexB`、`連結`（D2 五類；判準見 contracts/diff-check.md §3，含 U4 全域類、catch (d)(e)） |
| `fr` | FR 編號 |
| `note` | 人工說明（`連結` 類衍生 pair 與 `解析` 類移除 pair 必填，F3） |

格式與判準見 [contracts/diff-check.md](./contracts/diff-check.md)。
