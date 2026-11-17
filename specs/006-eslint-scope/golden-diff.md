# Golden 差異紀錄（feature 006，FR-012 (2)）

基準：`584e17d`（develop；`diffcheck.js golden` 未給 `--base` 時讀此行，見 contracts/diff-check.md §1）

行號說明：dot 標記的行號＝fixture 行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」與兩張簽核表為機器區塊（`node specs/006-eslint-scope/tools/diffcheck.js golden --verify specs/006-eslint-scope/golden-diff.md` 核對），
每個改 golden 的階段（T034、T043、T057、T063）以 `--report` 重新產生整表（相對 develop 的累積結果）後補「說明」；簽核欄 implementer 只填「草擬，待簽核」。

## 淨差異（相對 develop，機器核對）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected | page0 | intra-procedurals/5.dupairs.dot | row | + | `e` | catch | FR-003 | `parseSaved` 的 `catch (e)`（app.js L54）參數改為登記在 catch scope 的變數，列出 `e` 列（無 pair）；判準 (c) |
| 2 | expected-es2015 | inter-page | 0.dupairs.dot | row | + | `TodoList` | 解析 | FR-002–FR-005 | `class TodoList`（app.js L6）的 class scope 內層綁定成為獨立 Var（無 pair）；外層列 `(7,17)` 不變 |
| 3 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | row | + | `TodoList` | 解析 | FR-002–FR-005 | 同 #2：class 內層綁定列（無 pair） |
| 4 | expected-es2015 | page0 | intra-procedurals/0.dupairs.dot | row | + | `TodoList` | 解析 | FR-002–FR-005 | 同 #2：class 內層綁定列（無 pair） |
| 5 | expected-fixes004 | inter-page | 0.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | `class Counter`（app.js L10）外／內層綁定分拆：類別本體內的參照（L11 `static self = Counter`、L13 `y = Counter`，dot 12、14 與 entry_c、entry_d）歸內層列，外層保留 call_d、37、call_j；pair multiset 不變 |
| 6 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | 同 #5：外／內層列分拆，pair multiset 不變 |
| 7 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | 同 #5：外／內層列分拆，pair multiset 不變 |
| 8 | expected-fixes004 | page0 | intra-procedurals/0.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | class 內層綁定列（無 pair）；外層列 `(11,36)`、`(11,37)`、`(11,39)` 不變 |

## 解析類移除簽核（F3：歸「解析」的移除 pair 的釘選筆數）

| case | 頁 | 移除筆數 | 原因摘要 | 簽核 |
|------|----|----------|----------|------|

## 呼叫連結簽核（衍生差異的釘選筆數）

| case | 頁 | 觸發（呼叫點：行、callee、解析變化） | 衍生 + | 衍生 − | 簽核 |
|------|----|----------------------------------------|---------|---------|------|

## Foundational

### 變化說明

eslint-scope 成為宣告與解析來源（T016–T033）後，golden 共 8 筆差異，全為 row 新增、無 pair 增減、無 model／graph 差異；
`expected-interprocedural/` 零差異（R5 登記順序與 develop 相同）。解析類移除與呼叫連結簽核表皆為空。

- catch 類 1 筆（判準 (c)）：`expected` page0 `parseSaved` 的 catch 參數 `e` 現為 catch scope 的 Var，intra-procedural 模型多出空列 `e`。U3 的 (d) 移除屬 US1（T043）。
- 解析類 7 筆：class 宣告的外層綁定與 class scope 內層綁定（eslint-scope 的兩個 Variable）分別成為 Var。
  - `expected-es2015` 的 `TodoList`：類別本體內無參照，內層列為空列（3 個檔）。
  - `expected-fixes004` 的 `Counter`：類別本體內的參照（L11、L13）改歸內層列，外層列只留類別外的使用；每檔 pair multiset 不變（4 個檔）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected | page0/intra-procedurals/5.dupairs.dot | 44f80e73f2ae → 1ebe3e9447bd | #1 catch 參數 `e` 列 |
| expected-es2015 | inter-page/0.dupairs.dot | 1dd4149c195f → a3a117d300c0 | #2 `TodoList` 內層列 |
| expected-es2015 | page0/intra-pages/0.dupairs.dot | 1dd4149c195f → a3a117d300c0 | #3 `TodoList` 內層列 |
| expected-es2015 | page0/intra-procedurals/0.dupairs.dot | 38cbbaef4b9a → 31017662f6cc | #4 `TodoList` 內層列 |
| expected-fixes004 | inter-page/0.dupairs.dot | f4bbfec1faec → 78fd272ab42a | #5 `Counter` 外／內層分拆 |
| expected-fixes004 | page0/inter-procedurals/2.dupairs.dot | f4bbfec1faec → 78fd272ab42a | #6 `Counter` 外／內層分拆 |
| expected-fixes004 | page0/intra-pages/0.dupairs.dot | f4bbfec1faec → 78fd272ab42a | #7 `Counter` 外／內層分拆 |
| expected-fixes004 | page0/intra-procedurals/0.dupairs.dot | e31229399c54 → ba35aaf252ed | #8 `Counter` 內層列 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/var.js`「invalid symbols」 | 移除 `Var.isValidName('$doolars').should.eql(false)`，改於新增的 IdentifierName 測試斷言 `$` 開頭名稱為 true（T022 依 U1 放寬名稱規則的必然結果；測試數不變） | Clarifications U1 |
| `tests/dujs/scope.js` hasLocalVariable | 改為以身分檢查 `variables` 是否含該 Var；原「非字串輸入→false」改為「`addVariable` 對非 Var 拋錯」（斷言不同） | FR-001、FR-002 |
| `tests/dujs/scope.js` hasVariable／getVariable | 改為沿 `scopeChain`＋`variables` 的身分搜尋；刪除非字串輸入案例 | FR-002 |
| `tests/dujs/scope.js` getLocalVariable | 改為 `variables` 只含已登記的 Var | FR-002 |
| `tests/dujs/scope.js` getParamNameWithIndex | 改為 `variables` 保持登記順序、越界索引無結果 | FR-002 |
| `tests/dujs/scope.js` addInnerFunctionVariable／addParameter／addLocalVariable | 改為 `addVariable`：加入 Var、非法名稱由 Var 拋 `Invalid value for a Var`、同一 Var 第二次忽略；新增「同名兩個 Var 皆保留」 | FR-002 |
| `tests/dujs/scope.js` addGlobalVariable | 改為 `binding`：設於 page scope 保留、子孫可沿上取得、不在 page 下為 null | FR-001 |
| `tests/dujs/scope.js` vars／params／namedFunctionVars | 改為 `variables`（登記順序、不可指派）；新增 `getVariablesIncludingBlockScopes` 回傳 `Var[]` | FR-002 |
| `tests/dujs/scopetree.js`（3 處） | `_testonly_._vars.size` 改為 `_testonly_._variables.length`，語意（尚未登記變數）不變 | FR-002 |
| `tests/dujs/bypass.js` getVariable／hasLocalVariable | 改用測試 helper `variableNamed`（沿 `parent` 依名稱找已登記的 Var） | FR-013 |
| `tests/dujs/es2015.js` hasLocalVariable（9 處）、`h.params.has` | 改用 `hasLocal` helper；參數判定改為 `binding.kind === 'parameter'` | FR-001 |
| `tests/dujs/nestedfunctions.js` hasLocalVariable／hasNamedFunction | 改為依名稱查 `variables`＋`binding.kind === 'function'` | FR-001 |
| `tests/dujs/defuseanalyzer.js` `_builtInObjectVars.set`、`_vars.set` | 改為 `setBuiltInObjectVariables()`、`addVariable`；手建 scope 的 getNonReachableVarDefs 依無 binding 時的身分回退 | FR-002 |
| `tests/dujs/analysisexecution.js` `scope.vars` | 改為 `scope.variables` | FR-002 |

## US1

### 變化說明

catch 子句節點只讀參數中的求值運算式、GEN 只含參數綁定、`definingLocalStorageNodes` 不走進 catch 本體（T039、T040、T072；D4、U3）後，
`UPDATE_GOLDEN=1 npm test` 重建的 `expected*` 與 Foundational commit（607c01d）**逐位元組相同**；`diffcheck.js golden --report` 重新產生的
淨差異表與 Foundational 相同（8 筆，整表未變），`--verify` 結束碼 0。`tests/golden/manifest.json` 無鍵需更新。

- 唯一含 catch 的 fixture 是 `expected` page0 `parseSaved`（app.js L54 `catch (e) { parsed = []; }`）：develop 的 catch 節點把本體的 `parsed = []` 也當定義，
  但本體節點（L55）緊接著重新定義 `parsed`，catch 節點的那筆定義到不了任何使用；本體也沒有讀取（`[]` 為字面值）。因此 D4／U3 的修正
  在 golden 上沒有可見差異，預期的 catch 類 (a)／(d) 移除在 golden 不出現（只在 probes catch-*、plan-u3、plan-catch1 出現，由 `tests/dujs/catchclause.js` 驗收）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

（無變化）

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

（無既有測試修改；只新增案例：`tests/dujs/catchclause.js`（新檔）與 `tests/dujs/usedexpressions.js` 的 scenario 6）

## US2

### 變化說明

T073（spec Clarifications「implement US2」）：static 成員連結時，callee 所屬具名 ClassExpression 的內部名稱 VarDef 留在呼叫點，其餘 GEN／KILL 照舊移到
CALL RETURN（`lib/dujs/expansion.js` 的 `replayCall`）。golden fixture 沒有在 static 初值讀具名 class 運算式內部名稱的寫法，`tests/golden` 相對 dccf4bf
零差異；淨差異表不變（8 筆）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

（無變化）

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/classfields.js`「should not pair the inner name of a named class expression in its static members」（004 Fable A7） | 原斷言 `Q` 無 pair，與 US2-1 衝突；改為斷言含 `Q: L1 -> L2`（另有 KI §18 的 `Q: L1 -> entry`，以 containEql 斷言），`B` 仍為空；測試名稱與註解同步 | FR-004、Clarifications「implement US2」 |

## US3

### 變化說明

（待 US3 階段填寫）

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## US4

### 變化說明

（待 US4 階段填寫）

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## 驗收預期更正

無
