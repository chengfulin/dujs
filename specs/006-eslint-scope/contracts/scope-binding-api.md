# Contract：PageBinding（`lib/dujs/scopebinding.js`）與宣告查詢介面（FR-001、FR-002、FR-013、US4-9）

**Feature**: `006-eslint-scope` | 模組授權：MIT（原創）| 唯一 `require('eslint-scope')` 的 lib 檔

## 1. 建立

| 函式 | 說明 |
|------|------|
| `analyze(ast) → PageBinding` | 以 research R1 的選項呼叫 eslint-scope；建立 `referenceOf`、`declaredBy`。必須在 `buildScopeTree` 前呼叫 |
| `binding.attach(scopeTree)` | 建立 `ownerOf`／`eslintScopeOf`（research R4）；`scopeTree.binding = binding`；dujs scope 經 `scope.binding`（向上找到頁面 scope）取得 |
| `binding.registerRemainingVariables()` | research R5 的補登記，並驗證 data-model §1 的一對一規則 |

## 2. 查詢（lib 內取得變數的**唯一**途徑）

| 函式 | 回傳 | 使用者 |
|------|------|--------|
| `useVarsOf(identifier)` | `Var[]`：只查 Reference，**不回退** `declaredBy`（data-model §5，F5） | defuseanalyzer `findUSESet`、hierarchy（localStorage 讀取） |
| `useVarOf(identifier)` | `Var|null`：`useVarsOf` 的唯一元素 | callresolver（callee `f()`、`new X()`、`o.m()` 的 `o`）、modelbuilder（handler 識別字） |
| `defVarsOf(identifier)` | `Var[]`：Reference 優先，否則 `declaredBy`；class 宣告 id → 外層＋內層 | defuseanalyzer `findGENSet`／`getDefinedVariables`（含 `o` of `o.p = v`）、variableanalyzer |
| `declaredVarsOf(identifier)` | `Var[]`：只查 `declaredBy`（宣告歸屬）；`defVarsOf` 無 Reference 時回退至此（Foundational 2b 新增：讓 `catch (e) { var e = 4; }` 的 `var e` 在走訪時登記外層 `e`，維持 entry 初值順序） | variableanalyzer |
| `variableVar(variable)` | `Var|null`（eslint-scope Variable → Var） | variableanalyzer |
| `ownerScopeOfVar(var)` | `Scope|null`：宣告該 Var 之 Variable 的 eslint scope 所屬的 dujs scope（research R4）；無 Variable（全域、builtin）為 null（code review 後補：取代 variableanalyzer 對測試介面 `ownerScopeOf` 的依賴） | variableanalyzer |
| `isVisible(var, dujsScope)` | boolean（research R6 (a)∪(b)∪(c)，快取；(a) 的遮蔽判定為白名單 W4 `isShadowed`；(c) 用 `definingScopeOf`） | `getNonReachableVarDefs`、`bypassFilter` |
| `isOnFunctionChain(var, dujsFunctionScope)` | boolean：Var 的宣告 eslint scope 是函式 eslint scope 本身或其祖先，或 Var 無宣告（全域／builtin）（research R6a，Q3） | `findUSESet` 處理函式 entry 節點時過濾 |
| `classBindingGroupOf(var)` | `Var[]`（class 宣告的外層＋內層；其他為 `[var]`） | callresolver `definitionsOnThePage`（FR-018 合併計數） |
| `globalVars()` | 依原始碼順序的 `global` 類 Var | defuseanalyzer 在頁面 entry 產生 `global` 定義 |
| `localStorageVar()` | domain scope 的 `localStorage` Var | hierarchy `definingLocalStorageNodes` |

### 2.1 其他公開面（Foundational 實作補記，審查 R2）

| 名稱 | 說明 |
|------|------|
| 模組函式 `builtInVariablesOf(scope)` | 依 `scope.builtInObjects` 為 page／domain scope 建立 builtin Var（每個 scope 只建一次；domain 的 `localStorage` 跨頁共用），`binding.kind`＝`'builtIn'`。`builtInObjects` 描述須在首次分析前設定，之後不得改寫（審查 R3） |
| 模組常數 `KINDS` | 種類列舉（含 `builtIn`） |
| `Var.setBinding(var, binding)` | 一次性設定 Var 的 `binding`（供 scopebinding 建 Var 時使用） |
| 測試讀取介面 `options`、`scopeManager`、`scopeTree`、`ownerScopeOf(eslintScope)`、`eslintScopeOf(dujsScope)`、`definingScopeOf(var)` | 只供測試與 diffcheck 診斷讀取，lib 其他模組不得依賴 |
| `declarations` 每筆 | `{kind, node, identifier}`（`identifier`＝`Definition.name`） |

## 3. 宣告查詢（給 005；US4-9 單元測試的對象）

| 函式 | 回傳 |
|------|------|
| `var.binding.variable` | eslint-scope Variable 或 null（全域、fixed list） |
| `var.binding.kind` | data-model §2 的 VarKind |
| `var.binding.declarations` | `[{kind, node}]`，`node` 為 `Definition.node`（可取得名稱識別字 `Definition.name` 與宣告的 `kind`） |
| `binding.declarationsOf(var)` | 同上（便利函式） |

另有單元測試（`tests/dujs/scopebinding.js`）：`useVarsOf` 對宣告識別字（`var x` 的 `x`、函式名）回傳 `[]`、`defVarsOf` 回傳其 Var（F5）；非參照識別字（標籤、`o.p` 的 `p`、物件鍵、方法鍵、export 別名）的
`useVarsOf`／`defVarsOf` 為 `[]`；`for (const x of xs)`、`for (var k in o)`、解構宣告的 `defVarsOf`；兩檔串接且第二檔含 `import` 時 `sourceType` 為 module；可見性 (c)
（vis3 的內層 `A` 對 `g` 可見）；`isOnFunctionChain`（block `let`、catch 參數為 false）；optimistic 偏離案例（research R2）；保留名稱 `$ANONYMOUS_FUN_0`（research R12）；
`binding.kind` 多宣告取法（`function f(a) { function a() {} }` → `function`、`function f(a) { var a; }` → `parameter`，data-model §2）。

US4-9 的斷言（`tests/dujs/scopebinding.js`）：一個含 var、let、const、函式宣告、class、參數、catch 參數、import（module）、具名函式運算式、未宣告讀取、
未宣告賦值的程式——每個有宣告的 Var 對應唯一 Variable；`var x; var x;` 兩個宣告；class 宣告兩個 Var（外 `class`、內 `class`）；catch-edge L10 `e` 的
def 屬 catch 參數 Var、宣告節點在外層 `e` 的 `declarations`；未宣告有賦值 → `implicitGlobal`、只讀 → `global`，`declarations` 為空；`arguments` 無 Var。「只讀 → `global`」的斷言於 US3（T050）補入，Foundational（T017）先驗其餘項。

## 4. 錯誤

- 一對一驗證失敗、`ownerOf` 缺 scope：拋 `Error('scopebinding: ...')`（程式錯誤，不應發生；有單元測試觸發路徑以合成輸入驗證）。
- eslint-scope 自身拋錯（理論上 espree 能解析即可分析）：原樣拋出，CLI 依 004 FR-009 以 exit 1 結束。
