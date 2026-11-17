# Research：改用 eslint-scope 判定變數的宣告與參照

**Feature**: `006-eslint-scope` | **Date**: 2026-11-17（同日依 plan review 裁決 U1–U4、Q1–Q3 與 Fable F3–F9 修訂）| 探測腳本：`/private/tmp/claude-501/plan006/probe*.js`、
`/private/tmp/claude-501/plan006b/*.js`（暫存，不入庫；結論記於各節）；入庫守門探測：`probes/vis3.js`、`plan-catch1.js`、`plan-u1.js`、`plan-u3.js`、`plan-u4.js`、`plan-bi.js`、`plan-pf.js`

基準：`develop`＝`584e17d`；本 branch 的 `lib/` 與 `develop` 相同。`npm test` **1102 passing**，`eslint-suppressions.json` **118** 筆（35 檔）。

## R0 現況：以名稱查變數的位置（被取代的對象）

| 檔案 | 位置 | 現行做法 |
|------|------|----------|
| `lib/dujs/variableanalyzer.js` | `setLocalVariables` 全部 | 以名稱把宣告登記到 dujs `Scope`（`addLocalVariable`、`addLexicalVariable`、`addParameter`、`addInnerFunctionVariable`、`addGlobalVariable`） |
| `lib/dujs/scope.js` | `getVariable`、`hasVariable`、`getScopeWhereTheVariableDeclared`、`getLocalVariable`… | 沿 dujs scope 鏈以名稱查找；`_vars` 是 `Map(name, Var)`，同一 scope 不能有兩個同名變數 |
| `lib/dujs/defuseanalyzer.js` | `getDefinedVariables`、`findGENSet`（6 處）、`findUSESet` 的 `Identifier`、`bypassFilter`、`getNonReachableVarDefs`、`analyzeFunctionDeclaration` | `currentScope.getVariable(node.name)`；可見性以 `scope.getVariable(v.name) !== v` 判定 |
| `lib/dujs/callresolver.js` | `resolveVariable`、`classOfInstance` | `node.scope.getVariable(name)` |
| `lib/dujs/modelbuilder.js` | `getRegisteredEventHandlerCallback` | `graphNode.scope.getVariable(node.name)` |
| `lib/dujs/hierarchy.js` | `definingLocalStorageNodes` | `getScopeWhereTheVariableDeclared(name) === domainScope` |

## R1 eslint-scope 的呼叫方式（FR-001、Edge Cases「串接後才解析」）

- **Decision**：每頁一次，在 `scopeCtrl.addPageScopeTree(ast)` 中、`ScopeTree.buildScopeTree` **之前**呼叫
  `eslintScope.analyze(ast, {ecmaVersion: jsParser.ECMA_VERSION, sourceType: ast.sourceType, optimistic: true, childVisitorKeys: espree.VisitorKeys})`。
  `jsParser.ECMA_VERSION = espree.latestEcmaVersion`（目前 17），`parseAST` 的預設 `ecmaVersion` 改用同一常數（取代字串 `'latest'`，行為不變）。
  `sourceType` 取自 espree 產生的 `Program.sourceType`（`parseAST` 先試 script、失敗才 module，AST 已記錄實際採用者）。`nodejsScope`、`impliedStrict` 維持 false。
- **Rationale**：eslint-scope 預設 `ecmaVersion: 5`，必須明確傳入；先於 dujs 的 AST 裝飾（`dujsScopeFunction`、`dujsBlockScope`、`dujsBodyWithParamInits` 等皆為
  non-enumerable，仍以「先分析、後裝飾」避免任何走訪差異）。`childVisitorKeys` 用 espree 自己的 visitor keys，未知節點仍走預設 `fallback: 'iteration'`。
- **實測**（eslint-scope 9.1.2 × espree 11.2.0）：`using`／`await using`、`#p in o`、class static block、class field、top-level await、`import.meta`、
  解構預設值、`export {q as r}` 均可分析；1285 行檔案 analyze 約 1.9 ms。
- **Alternatives**：在 `ScopeTree.buildScopeTree` 內呼叫（rejected：ScopeTree 單元測試大量直接建樹，綁在 scopeCtrl 才能讓「沒有 binding 的樹」保持可測）；
  每個 dujs scope 各自分析（rejected：違反「每頁一次」且 scope chain 斷裂）。

## R2 D6 以 `optimistic: true` 達成（FR-008）

- **Decision**：採 `optimistic: true`。直接 `eval` 與 `with` 造成的動態 scope 在此模式下仍以靜態方式沿 scope chain 解析，等同 D6「以名稱沿 eslint-scope
  scope chain 往外查找，找不到才為全域」，lib 不需要自寫 D6 回退；FR-012 (1) 白名單的 D6 項目因此**不出現在程式中**（白名單測試以「實際存在的白名單函式」
  精確比對，見 contracts/static-check.md）。
- **實測**：`with.js`：`p` 未解析（→ 隱含全域，與 develop 的 `p: L2 -> L2` 一致）、`k` 內 `q` 解析到全域 `q`；`evalouter.js`：`outer` 內 `a`、`k`、`p` 全部解析
  到 `outer` 的宣告（非 optimistic 時這些參照全部未解析）。D5 優先：block 內函式在 optimistic 下仍只存在於 block，外部同名參照未解析。
- **與 D6 字面回退唯一已知的偏離**（F7）：同一函式**有參數預設值又有直接 eval** 時，非 optimistic 下預設值中的參照未解析、其所在 scope 是函式 scope，
  D6 字面「沿所在 scope 往外查找」會先找到函式本體的同名 `var`；optimistic 則解析到外層。實測（`plan006b/f7.js`）：
  `var x = 1; function f(a = x) { var x = 2; eval(""); return a; }` 的 L2 `x`：optimistic → global scope 的 `x`；非 optimistic → 未解析（scope＝function）。
  optimistic 的結果符合 FR-005（預設值看不到本體宣告），採用之；`tests/dujs/scopebinding.js` 加此案例的單元測試（斷言 L2 `x` 的 `useVarsOf` 結果是頁面的 `x`，
  不是 `f` 的 `x`）。
- **Guard**：US4 情境 4 的 with／evalouter，另加「含 eval 的函式中的 block 函式」（D5 優先）、「`with` 內的 catch」兩個單元測試。若日後發現 optimistic 與 D6
  不一致的案例，才在 `scopebinding.js` 加白名單函式 `resolveDynamically`（標 `@nameLookup D6`）。
- **Alternatives**：非 optimistic＋自寫回退（rejected：多一條名稱查找路徑，且宣告寫入 `var a = 1` 本身也會變成未解析，需更多例外）。

## R3 識別字 → eslint-scope Variable（FR-001、FR-002）

- **Decision**：每頁建兩張以 **AST 節點身分**為鍵的表：
  1. `referenceOf: Map(Identifier, Reference)`：所有 scope 的 `references`。
  2. `declaredBy: Map(Identifier, Variable[])`：每個 Variable 的 `defs[].name`（宣告識別字）。class 宣告的 `id` 同時是外層與 class 內層兩個 Variable 的宣告識別字。
- 查詢分兩個 API（F5）：
  - **use 端** `useVarsOf(identifier)`：只查 `referenceOf`；有 Reference → `[reference.resolved 的 Var]`（未解析見 R9）；沒有 Reference → `[]`，**不回退** `declaredBy`
    （避免宣告識別字、標籤、屬性鍵、export 別名在 USE 中被當成讀取）。用於 `findUSESet`、callee、handler 識別字。
  - **def 端** `defVarsOf(identifier)`：Reference（寫入或 `G.p = v` 的讀取）優先，否則 `declaredBy`（宣告識別字；class 宣告 id → 外層＋內層兩個），都沒有 → `[]`。
    用於 `findGENSet`、`getDefinedVariables`、variableanalyzer 的登記。
  **以參照為準**：`catch (e) { var e = 4; }` 的 `e` 同時是外層 Variable 的宣告識別字與一個解析到 catch 參數的寫入 Reference，取 Reference（FR-001）。
- dujs 的合成節點（`getFunctionBodyStatement` 的 `a = x`、`getDefaultEvaluationStatement`、`getArrowFunctionBodyStatement`、`getClassMemberScopeFunction`
  的 `return <value>`）都重用原 AST 的 Identifier 節點，身分查詢可直接命中。
- **Rationale**：def／use 的分類與定義節點仍由 dujs 的走訪決定（D1），只把「這個識別字是哪個變數」換成身分查詢。

## R4 eslint-scope scope → dujs scope（「變數掛在哪裡」）

| eslint-scope scope（`block`） | dujs 擁有者 scope（Var 登記處，exit 時 KILL） |
|-------------------------------|-----------------------------------------------|
| `global`、`module`（Program） | 頁面 scope（module 的 `global` scope 沒有變數） |
| `function`（FunctionDeclaration／FunctionExpression／Arrow；class method 的 `value`） | 同一節點的 dujs function／anonymous scope |
| `function-expression-name`（FunctionExpression） | 該函式自己的 dujs scope（名稱只在函式內可見；定義發生在外層節點，R8） |
| `class-field-initializer`（`PropertyDefinition.value`） | 該成員的 synthetic function scope（`scopetree.js` 在 synthetic function 上加 non-enumerable `dujsClassMember` 反查） |
| `class-static-block`（StaticBlock） | 該 static block 的 synthetic function scope |
| `class`（ClassDeclaration／ClassExpression） | 不新增 dujs scope；內層名稱登記在 class 節點所在的 dujs scope（最內層 block scope，否則函式／頁面） |
| `catch`（CatchClause） | 不新增 dujs scope；catch 參數登記在 CatchClause 所在的最內層 dujs block scope，否則函式／頁面 scope |
| `block`／`for`／`switch` | 該節點的 `dujsBlockScope`（有 let／const／class 時才有）；沒有時（例如只含 block 內函式宣告，D5）登記在外層最近的 dujs scope |
| `with` | 無變數 |

dujs scope 的數量與命名完全不變（FR-009、US4-2）；同一 dujs scope 可有多個同名 Var（catch 參數與外層 `e`、class 內外兩個 `A`、block 函式 `f` 與頁面全域 `f`），
因此 `Scope` 的變數儲存改為以 Var 身分為單位的有序串列（data-model §3）。

## R5 Var 的登記順序（golden 位元組穩定）

- dupairs.dot 的列序＝變數第一次出現在 reachIns 的順序，主要由頁面／函式 entry 的 GEN 順序決定：fixed list → `undefined` 初值（依 `scope.vars` 順序）→
  函式宣告（走訪順序）。
- **Decision**：`variableanalyzer.setLocalVariables(scope)` 保留現行走訪骨架與順序（builtins → 內層函式宣告 → 參數 → 本體走訪：class／import／
  VariableDeclarator／AssignmentExpression），只把「以名稱登記」換成「以識別字身分取得 Variable，再取得（或建立）其 Var 並登記到 R4 的擁有者 scope」；
  未解析寫入的名稱建立／取得頁面全域 Var（R9）。全部 scope 走訪完後，`registerRemainingVariables(scopeTree)` 依 `scopeManager.scopes` 順序補登記走訪
  未碰到的 Variable（catch 參數、具名運算式名稱、class 內層名稱），接著依原始碼順序補登記**走訪未碰到的有寫入未解析名稱**（只被 `++`／`--`、for-in／for-of
  左側寫入者；`=` 與解構賦值在本體走訪的 AssignmentExpression 時就已登記，F4），種類 `implicitGlobal`，登記在頁面 scope、在既有 Var 之後（entry `undefined`
  初值因此排在既有列之後）；最後依原始碼順序補登記只讀未解析名稱（`global`，US3，含 `G.p = v` 的 `G`）。
- **Rationale**：現有 Var 的 entry `undefined` 初值順序不變 → 既有列的相對順序不變；新列只在既有 entry 定義的列之後插入。

## R6 可見性：entry 的 KILL 與 FR-016 繞過（FR-013、US2-4、US4-11）

- 現行 `getNonReachableVarDefs` 與 `bypassFilter` 以 `scope.getVariable(v.name) !== v` 判定「被呼叫端看得到 v」。
- **Decision**：`binding.isVisible(v, dujsScope)` ＝ (a) **未遮蔽**：v 的宣告 scope（全域 Var 為頁面的 global／module scope；`localStorage` 為所有頁面）在 dujsScope
  對應 eslint scope 的 chain 上，且 chain 上較內層的 scope 沒有同名宣告（以 eslint-scope 的 `Scope.set` 判定）；或 (b) **直接參照**：dujsScope 的區域（其
  eslint scope 與不跨函式的子 scope：block／for／switch／catch／with／class）內有 Reference 解析到 v。結果每個 dujs scope 快取一次。
- (b) 是 pdef 必需：`function f(a = x) { var x = 2; }` 的預設值 `x` 解析到外層 `x`，但 f 的 scope 有同名 `x`；只用 (a) 會在 f 的 entry 殺掉外層定義，得不到
  `x: L1 -> L2`。
- (a) 不能改為「只看參照」：`function b(){ a(); }` 不參照 `v`，但呼叫的 `a` 會改 `v`；若 `v` 對 b 不可見，`v` 的舊定義會繞過 b 而多出 pair（迴歸）。
- **遮蔽判定必須比較名稱**（JS 的遮蔽本質上以名稱定義）。它只讀 eslint-scope 的宣告表（`Scope.set`），不讀 dujs scope → **U2 已裁決**：視為 FR-013 的實作，
  列入 FR-012 (1) 白名單 W4 `isShadowed`（contracts/static-check.md）。
- **(c) 沒有自己 dujs scope 的 Var（Q1，Fable F1）**：宣告 eslint scope 為 `class`、`catch`、`function-expression-name`，或沒有 dujs block scope 的
  `block`／`for`／`switch`（Annex B 函式、R4 表最後一列）的 Var，其宣告 scope 不在被呼叫端的 chain 上，(a)(b) 都不成立；develop 以名稱查找卻看得到。
  加 (c)：**定義所在的 dujs scope**（`definingScopeOf(v)`：產生該 Var 定義的 CFG 節點所屬 dujs scope——class 內層＝class 節點所在 scope；catch 參數＝CatchClause
  所在 scope；具名運算式名稱＝運算式所在 scope；Annex B 函式＝擁有者 scope）**是被呼叫端 dujs scope 的祖先或本身** → 可見。不比名稱，不需白名單。
  實測 vis3（`class A { inc() { return A.n; } }`，`g` 中 `new A()`、`o.inc()`）：develop 有 `A: L1 -> L3`；只用 (a)(b) 時內層 `A` 在 `g` 的 entry 被殺而遺失，
  (c) 保住（頁面是 `g` 的祖先）。vis3 列入 Foundational 守門（與 develop 相同）。
- 最終：`isVisible(v, S) = (a) ∨ (b) ∨ (c)`，每個 dujs scope 一次計算並快取。

## R6a 函式 entry 節點的 USE（Q3，Fable F5；KI §18 部分）

- 現況：entry 節點的 AST 是整個函式本體，`findUSESet` 會讀到本體內的讀取（KI §18）；develop 以名稱在**函式 scope** 查找，因此 block 內 `let x` 遮蔽的 `x`
  會讀到外層 `x`、block 內的 `let`／`const` 本身讀不到。
- 改為身分查詢後，那些識別字會解析到 block 的 `let`／`const`（或 catch 參數），entry 會多出 develop 沒有的 pair。
- **Decision（維持 develop）**：entry 節點的 USE 只保留「從函式 scope 可見」的 Var——`useVarsOf` 的結果中，宣告 eslint scope 是函式 eslint scope 本身或其 chain
  上祖先的 Var，以及未宣告全域／builtin；其餘（子孫 block 的 let／const／class、catch 參數、內層具名運算式名稱）丟棄。API `binding.isOnFunctionChain(var, dujsFunctionScope)`
  （只比 scope 身分，不比名稱）。
- 與 develop 的唯一差別：被 block 內 `let x` 遮蔽的讀取，develop 會讀到外層 `x`、新版不讀；此時 `vars(x) ≥ 2`，屬解析類。實測
  （`plan006b/q3.js`：`var x = 0; function f() { if (x) { let x = 1; console.log(x); } } f();`）develop 有 `x: L1 -> entry`（來自 `if (x)`），新版相同；加入
  `scopeguards.js` 的「與 develop 相同」守門。KI §18 本身（entry 讀本體）留給 005。

## R7 class 的兩個綁定與 004 FR-018 合併計數（FR-004、FR-013、Clarifications A2）

- ClassDeclaration：外層 Variable（宣告於外層）與內層 Variable（`class` scope）各有一個 Var；class 節點的 GEN **同時**定義兩者（function def，range＝class）。
  class 內的 `A` 解析到內層 Var，外部的 `A = null` 只定義外層 Var。
- 「全頁只有一筆定義」：`binding.classBindingGroupOf(v)` 回傳 `[外層, 內層]`；`definitionsOnThePage` 對群組合併 GEN 中的定義並以（fromNode, range）去重
  → 無重新賦值時 1 筆（與 develop 相同），有 `A = null` 時 2 筆（link-n5 維持不連）。
- 具名 ClassExpression（`var B = class Q {}`）：內層 `Q` 在運算式所在節點定義（function def，range＝class），`targetOfDefinition` 依 class range 對應到 classInfo（link-n9）。
- 副作用：每個 class 宣告在頁面模型的 dupairs.dot 多一個同名列（內層綁定，可能無 pair），屬識別字解析類（該名稱有兩個 Variable）。

## R8 具名函式運算式的內部名稱（D7、FR-004）

- 內部名稱 Var 登記在函式自己的 dujs scope（只有本體可見），**不給 entry 初值**；在運算式所在節點（外層的 CFG 節點）由 `findGENSet` 新增的
  `FunctionExpression` 規則定義（function def，range＝運算式；不走進本體）。
- inter-procedural／intra-page：外層節點的定義經呼叫邊流入本體 → `fact: L4 -> L5`；本體的 intra-procedural 沒有定義 → 頁面與函式的 intra-procedural 都沒有
  `fact` 的 pair（US2-1）。自我遞迴 `fact(n - 1)` 在 intra-procedural 原件中沒有到達定義 → 依 004 FR-018 不連結（US2-2），不需額外程式。

## R9 未解析的名稱（D3、FR-006、US3）

- 未解析 Reference（optimistic 後）依名稱分流（唯一來源的具名例外，contracts/static-check.md 白名單 W1–W3）：
  1. `undefined`、`NaN`、`Infinity`、`arguments` → 不建立變數（W2）。
  2. fixed list（`window`、`document`、`String`…`console`）→ 頁面的 builtin Var；`localStorage` → domain scope 的 Var（W3）。頁面（global／module scope）
     宣告的同名變數也對應到該 builtin Var（develop 中 `var console` 與 builtin 是同一個 Var）；**`localStorage` 除外**（它在 domain scope，頁面的
     `var localStorage` 在 develop 是頁面自己的 Var，維持之，F9）。頁面層 `function Map() {}` 與 fixed list 同名時同樣對應到 builtin Var，且維持 develop：
     不給函式定義（develop `analyzeFunctionDeclaration` 跳過 builtin 名稱）、`Map()` 不連結到 `Map` 函式（probes/plan-bi.js：develop 只有 `Map: entry -> L2`
     的 builtin 定義，沒有 inter-procedural 模型；Foundational 守門）。
  3. 其他 → 頁面＋名稱的全域 Var（W1）：頁面中有任何寫入 Reference 者為 `implicitGlobal`（頁面 entry 給 `undefined` 初值，維持現行），只有讀取者為 `global`
     （頁面 entry 給新的 `global` 定義種類）。
- `global` 定義在頁面 entry 的 GEN 順序：fixed list、`undefined` 初值、函式宣告之後（新列排在既有 entry 列之後）。
- `arguments`：函式中由 eslint-scope 解析到隱含 `arguments`（`defs` 為空）→ 不建立 Var（FR-001）。
- 變化（F4 更正）：for-in 左側與 `u++` 寫入未宣告名稱時，develop 沒有變數，現在有 implicitGlobal Var（登記時點見 R5）；**解構賦值 develop 已有變數**
  （probes/plan-u4.js：develop 有 `d1: L5 -> L6`），不變。`G.p = v`（`G` 未宣告）在 eslint-scope 是讀取 → `global` Var，依 D1 該節點同時定義 `G`
  （plan-u4：`Math: L7 -> L8`、`location: L9 -> L10` 為新增）。這些都會產生非 entry 的定義 → **U4 已裁決**：全域類判準為「該頁未解析名稱的任何新增 pair 或
  變數列」（FR-012 (2)），`G.p = v` 的 `G` 種類仍為 `global`。
- 實測 develop（plan-u4）：`kk`、`uu`、`Math`、`location` 都沒有 pair；新版預期有 `kk: L2 -> L2`、`uu: entry -> L3`、`uu: L3 -> L4`、`Math: L7 -> L8`、
  `location: L9 -> L10` 與各自的 entry 定義 pair（`globals.js` 斷言）。

## R10 catch 子句（D4、FR-003、US1）

- `usedexpressions.astNodeItems`：CatchClause 節點只讀參數中的求值運算式（解構預設值、計算鍵，`bindingPattern.getEvaluatedExpressions(param)`，read `'walk'`）；
  無參數時不讀任何東西。
- `findGENSet`：新增 `CatchClause` 規則，只定義參數綁定的 Var（literal def，range＝param），不走進本體。
- 實測 develop：catch 節點的 GEN 也包含本體內的賦值（`var y=0; try{f();}catch(x){ if (c) { y = 1; } } console.log(y);` 有 `y: L4 -> L9`，L4 是 catch 行）。
  D4「只定義 catch 參數」會移除這類 pair → **U3 已裁決**：catch 節點不再定義區塊內賦值；FR-012 (2) catch 類加判準 (d)「移除的 pair 其 def 行為 CatchClause
  所在行且變數不是該 catch 參數」。守門 probes/plan-u3.js（develop 有 `y: L4 -> L7`，新版沒有；`y: L5 -> L7`、`y: L1 -> L7` 保留）。
- 頁面沒有其他宣告的 catch 參數名（probes/plan-catch1.js）：develop 把 `e` 當隱含全域（`e: entry -> L4`、row `e`），新版 `e` 是 catch 參數 → 這些 pair 移除
  → **Q2 已裁決**：catch 類加判準 (e)「名稱為 catch 參數名且該頁沒有同名的其他宣告時，該名稱移除的 pair 與變數列」。

## R11 Annex B（D5、FR-007）

- 依 eslint-scope：block 內函式宣告的 Variable 在 block scope；Var 登記在 R4 的擁有者（通常是外層 scope，因 block 沒有 lexical 宣告就沒有 dujs block scope），
  定義仍在擁有者模型的 entry（`analyzeFunctionDeclaration` 的走訪不變，Var 改以身分取得）。block 外的同名參照未解析 → R9 頁面全域，呼叫不再連結。
- scope 樹與命名（`f_1`、`$BLOCK_n.f`）不變。

## R12 `$` 與非 ASCII 名稱（風險，使用者裁決 U1）

- `Var.isValidName` 只接受 `/^[_a-zA-Z][_a-zA-Z0-9]*$/`。develop：`var $a = 1;` 拋出 `Invalid value for a Var`；但只讀取的 `$('#x')`、`été` 沒有變數，**不會**拋錯。
- FR-006 要為未解析讀取建立變數 → 若不處理，讀取 `$` 的程式由「可分析」變「拋錯」，違反 US4-7／SC-003。
- **Decision（U1 已裁決）**：`Var.isValidName` 放寬為 ES IdentifierName：`/^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u`。probes/plan-u1.js
  （develop：`a: L1 -> L2`、`console: entry -> L2`，無拋錯）新版預期另有 `$: entry -> L1`、`été: entry -> L2`（`global`）。
- **保留名稱相撞**：dujs scope 名稱用 `$DOMAIN`、`$PAGE_n`、`$ANONYMOUS_FUN_n`、`$BLOCK_n`；放寬後 `var $ANONYMOUS_FUN_0` 合法。lib 中沒有以 Var 名稱查 scope 的
  路徑（`ScopeTree.getScopeByName` 只收 scope 名稱），相撞只影響輸出可讀性（dupairs 列名與 scope 名相同）。加單元測試：
  `var $ANONYMOUS_FUN_0 = 1; var g = function () { return $ANONYMOUS_FUN_0; }; g();` 分析不拋錯、scope 名稱為 `$PAGE_0`、`$ANONYMOUS_FUN_0`、
  pair `$ANONYMOUS_FUN_0: L1 -> L1`（inter-procedural）存在。KI 新節記錄「Var 名可與 scope 保留名稱同字」。
- **不在範圍**：`FunctionScope.isValidName`／`Scope.isValidName` 不放寬（scope 命名 FR-009 不變）→ `function $(s) {}`、`function $a() {}` 在 develop 與本 feature
  都拋 `Invalid value for a FunctionScope`（`plan006b/u1r.js` 實測 develop）；記入 KI 新節，不改。

## R13 FR-012 (1) 靜態測試

- 以 espree 解析 `lib/**/*.js`，在 AST 上檢查禁止的 API／屬性與 `.name` 讀取，白名單以 JSDoc 標記 `@nameLookup <理由>` 的函式精確比對。細節見
  [contracts/static-check.md](./contracts/static-check.md)。
- **Alternatives**：regex 掃描（rejected：註解與字串誤判）；ESLint 自訂規則（rejected：需要 plugin 結構，且要改 `eslint.config` 範圍）。

## R14 FR-012 (2) 差異判定腳本與 MDN 基準

- 腳本 `specs/006-eslint-scope/tools/diffcheck.js`，同時處理 golden 與 MDN；單位、判準、簽核格式見
  [contracts/diff-check.md](./contracts/diff-check.md)。判準中的「eslint-scope 結果」由腳本以與 lib 相同的選項（R1）分析 CLI 實際分析的串接原始碼
  （`lib/dujs/sourcereader.js` 的 `getSourceFromFiles`，dot 行號＝串接後行號）。
- **不進 `npm test`**：基準是 git 歷史（golden）與動 lib 前的快照（MDN），屬本 feature 的一次性驗收工具；quickstart 規定每個改 golden 的階段與 Polish 必跑。
- MDN 範例集（F8）：33 個檔案（32 個 id，s09 為 `s09-first.js`＋`s09-second.js`；validation-004 §0.1 計為 33 個程式）。validation-004 的工作目錄仍在
  `/private/tmp/claude-501/-Users-chengfulin-Documents-Personal-dujs/cbaaf31a-c3b2-4a55-9ff4-356dc509edf6/scratchpad/mdncheck/ex/`：**2026-11-17 核對，33 檔齊全，
  sha256 前 16 碼與附錄 A 逐行相同**。Setup 先自該目錄複製到 `specs/006-eslint-scope/mdn/corpus/` 並再次核對雜湊（MDN 範例為 CC0）；該目錄若已被清除，
  才依 §2 各範例的「來源」重新抽取（釘選 commit 的 clone 放在 repo 外）並以附錄 A 核對。在任何 lib 變更前以 develop 產生 CLI `.dot` 快照與 run-pairs 輸出。

## R15 效能（SC-003）

- eslint-scope analyze 為線性（約 1.5 µs／行）；新增成本另有兩張身分表與每個 dujs scope 一次的可見集合計算（快取，KILL 時 O(1) 查詢）。worklist 迭代內
  不得重算可見性。
- 量測：`specs/006-eslint-scope/tools/perf.js <dujsRoot>` 在同一 process 依序分析 32 個 id（33 檔）（`tests/helpers/analyze.js`），整輪 3 次取中位數；develop 與本
  branch 各跑一次，結果記入 `specs/006-eslint-scope/perf.md`，門檻 ≤ 1.5 倍。

## R16 依賴與授權

- 新增 runtime 依賴 `eslint-scope` `^9.1.2`（BSD-2-Clause；package-lock 鎖定實際版本，目前 node_modules 已有 9.1.2，隨 ESLint 10 引入）。`espree.VisitorKeys`
  來自既有依賴。tech-standards 對本 library 無偏離項，無 §CP-6 例外。
