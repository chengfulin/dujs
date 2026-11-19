# Contract：FR-012 (1) 靜態測試（`tests/dujs/scopesource.js`，進 `npm test`）

**Feature**: `006-eslint-scope` | 驗收：US4-6

以 espree（`ecmaVersion: 'latest'`、`sourceType: 'script'`）解析 `lib/**/*.js` 全部檔案，以 walkes 走訪 AST 檢查下列規則；每條規則一個 `it`，失敗訊息列出
`檔案:行:欄` 與違規片段。

## 1. 禁止項目

| # | 規則 | 範圍 |
|---|------|------|
| S1 | 呼叫或讀取這些成員名稱：`getVariable`、`hasVariable`、`getLocalVariable`、`hasLocalVariable`、`getScopeWhereTheVariableDeclared`、`addGlobalVariable`、`addLocalVariable`、`addLexicalVariable`、`addParameter`、`addInnerFunctionVariable`、`hasNamedFunction`、`hasBuiltInObject`、`isLexicalVariable`、`getParamNameWithIndex`、`namedFunctionVars`、`builtInObjectVars`、`_vars`、`_params`、`_paramNames`、`_namedFunctionVars`、`_builtInObjectVars`、`_lexicalNames` | 全部 lib |
| S2 | `Scope.prototype` 上不得定義 S1 的名稱，也不得定義 `vars`、`params`（以 `require` 後檢查 `Object.getOwnPropertyNames`） | `lib/dujs/scope.js` 及其子類 |
| S3 | `require('eslint-scope')` | `lib/dujs/scopebinding.js` 以外 |
| S4 | 讀取 eslint-scope 的名稱表：成員 `.set`（非呼叫的屬性讀取，且物件來自 eslint scope；以「成員名為 `set` 且不是 `Map#set` 呼叫的 callee」判定）、`.implicit`、`.through`、`.__get`、`.resolve` 以外的 `scopeManager` 名稱 API | 全部 lib；`.set` 只允許在白名單函式內 |
| S5 | 在 `lib/dujs/*.js`（`scopebinding.js` 除外，由 S6 管）中讀取 `<x>.name`：只允許允許表中的讀取（以「檔案＋所在函式名＋成員運算式原文」精確比對），其他一律失敗 | `lib/dujs/*.js`（不含 `scopebinding.js`） |
| S6 | `scopebinding.js` 中以字串名稱為鍵的 `Map#get`／`Map#has`／`Map#set`、`Set#has`（參數是 `<x>.name`、名為 `name` 的識別字或字串字面值）只允許出現在白名單函式內 | `scopebinding.js` |

S5 允許的 `.name` 讀取（屬性名、方法名、輸出用名稱，不是變數查找）。本表與 `tests/dujs/scopesource.js` 的 `S5_ALLOWED` 須**完全相同**（前三項為初始項，其餘由 T061 依實際程式碼補齊；code review 後回寫本表，並刪除已無呼叫端的 `bindingpattern.js getBoundNames`）：

| 檔案 | 函式 | 運算式 | 理由 |
|------|------|--------|------|
| `callresolver.js` | `createClassInfo` | `member.key.name` | 方法名（屬性） |
| `callresolver.js` | `calleeScopesOfMethodCall` | `member.property.name` | 方法名（屬性） |
| `modelbuilder.js` | `getRegisteredEventHandlerCallback` | `callExpression.callee.property.name` | `addEventListener` 方法名 |
| `cli.js` | `parsePages` | `token.name` | 命令列選項名 |
| `graphics.js` | `convertGraphToDot` | `model.mainlyRelatedScope.name` | DOT 輸出的 scope 名 |
| `graphics.js` | `convertDUPairsToDot` | `key.name` | DOT 輸出的變數名 |
| `scope.js` | `toString` | `this.name` | scope 名作為字串形式 |
| `scope.js` | `name` | `internal(this)._parent.name` | 以父 scope 名組成 scope 名 |
| `scopetree.js` | `addScope` | `scope.name` | scope 名作為 scope tree map 的鍵（FR-009） |
| `scopetree.js` | `makeScopeNamesUnique` | `scope.name` | scope 名作為 scope tree map 的鍵（FR-009） |
| `scopetree.js` | `astFunctionDeclarationHandler` | `node.id.name` | 函式宣告名作為 scope 名（FR-009） |

## 2. 白名單（`scopebinding.js` 內以 JSDoc `@nameLookup <理由>` 標記的函式；集合須與下表**完全相同**）

| # | 函式 | `@nameLookup` | 對應 |
|---|------|---------------|------|
| W1 | `globalVariableOf(name)` | `D3` | 頁面＋名稱合併的未解析全域 |
| W2 | `isExcludedGlobalName(name)` | `D3` | `undefined`／`NaN`／`Infinity`／`arguments` 的名稱排除 |
| W3 | `builtInVariableOf(name)` | `FIXED_LIST` | fixed list 與 `localStorage` 的名稱對應 |
| W4 | `isShadowed(variableOrVar, eslintScope)` | `FR-013` | 可見性的遮蔽判定（research R6；U2 已裁決：以 eslint-scope `Scope.set` 比名稱，spec FR-012 (1)） |

- 可見性 (c)（`definingScopeOf`，Q1）與函式 entry 的 `isOnFunctionChain`（Q3）只比 scope 身分，不在白名單內，須通過 S4／S6。
- D6 的回退查找由 eslint-scope `optimistic: true` 完成（research R2），lib 中沒有對應函式；若日後需要，新增 `resolveDynamically` 並在本表加 W5（`D6`）。
- 測試同時斷言：白名單函式只在 `scopebinding.js`；標記的理由字串屬於 `{D3, D6, FIXED_LIST, FR-013}`。

## 3. 自我驗證

`tests/dujs/scopesource.js` 另以內嵌的違規範例字串（例如 `scope.getVariable(node.name)`、`require('eslint-scope')` 出現在其他檔名）驗證每條規則確實會失敗
（避免規則寫錯而永遠通過）。
