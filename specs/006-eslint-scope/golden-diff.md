# Golden 差異紀錄（feature 006，FR-012 (2)）

基準：`584e17d`（develop；`diffcheck.js golden` 未給 `--base` 時讀此行，見 contracts/diff-check.md §1）

行號說明：dot 標記的行號＝fixture 行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」與兩張簽核表為機器區塊（`node specs/006-eslint-scope/tools/diffcheck.js golden --verify specs/006-eslint-scope/golden-diff.md` 核對），
每個改 golden 的階段（T034、T043、T057、T063）以 `--report` 重新產生整表（相對 develop 的累積結果）後補「說明」；簽核欄 implementer 只填「草擬，待簽核」。

## 淨差異（相對 develop，機器核對）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected | inter-page | 0.dupairs.dot | row | + | `JSON` | 全域 | FR-006 | page0、page1 各自的 `JSON` Var（頁面＋名稱，不跨頁，US3-5），各一列 |
| 2 | expected | inter-page | 0.dupairs.dot | row | + | `JSON` | 全域 | FR-006 | page0、page1 各自的 `JSON` Var（頁面＋名稱，不跨頁，US3-5），各一列 |
| 3 | expected | inter-page | 0.dupairs.dot | pair | + | `JSON: entry -> 6` | 全域 | FR-006 | 同 #13（page1 entry_e → report.js L5），不跨頁 |
| 4 | expected | inter-page | 0.dupairs.dot | pair | + | `JSON: entry -> 71` | 全域 | FR-006 | 同 #8（page0 entry_a → app.js L70） |
| 5 | expected | inter-page | 0.dupairs.dot | pair | + | `JSON: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18；page0 entry_c、page1 entry_f 各一） |
| 6 | expected | inter-page | 0.dupairs.dot | pair | + | `JSON: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18；page0 entry_c、page1 entry_f 各一） |
| 7 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `JSON` | 全域 | FR-006 | `JSON` 全域列（D3）：頁面 entry 定義 |
| 8 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `JSON: entry -> 71` | 全域 | FR-006 | `onAdd` 的 `JSON.stringify(items)`（app.js L70）讀頁面 entry 的 `global` 定義 |
| 9 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `JSON: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為，`onAdd` 的 entry_c） |
| 10 | expected | page0 | intra-procedurals/0.dupairs.dot | row | + | `JSON` | 全域 | FR-006 | `JSON`（app.js L70 `JSON.stringify`，L53 `JSON.parse`）未宣告只讀，成為 page0 的 `global` Var，頁面 entry 定義（D3）；intra-procedural 為空列 |
| 11 | expected | page0 | intra-procedurals/5.dupairs.dot | row | + | `e` | catch | FR-003 | `parseSaved` 的 `catch (e)`（app.js L54）參數改為登記在 catch scope 的變數，列出 `e` 列（無 pair）；判準 (c) |
| 12 | expected | page1 | intra-pages/0.dupairs.dot | row | + | `JSON` | 全域 | FR-006 | `JSON`（report.js L5 `JSON.parse`）未宣告只讀，成為 page1 的 `global` Var（D3） |
| 13 | expected | page1 | intra-pages/0.dupairs.dot | pair | + | `JSON: entry -> 6` | 全域 | FR-006 | `onLoad` 的 `JSON.parse(...)`（report.js L5）讀 page1 entry 的 `global` 定義 |
| 14 | expected | page1 | intra-pages/0.dupairs.dot | pair | + | `JSON: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為，`onLoad` 的 entry_b） |
| 15 | expected | page1 | intra-procedurals/0.dupairs.dot | row | + | `JSON` | 全域 | FR-006 | `JSON`（report.js L5 `JSON.parse`）未宣告只讀，成為 page1 的 `global` Var（D3）；intra-procedural 為空列 |
| 16 | expected-es2015 | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math`（app.js L30 `Math.max`）未宣告只讀，成為頁面 `global` Var，頁面 entry 定義（D3） |
| 17 | expected-es2015 | inter-page | 0.dupairs.dot | row | + | `TodoList` | 解析 | FR-002–FR-005 | `class TodoList`（app.js L6）的 class scope 內層綁定成為獨立 Var（無 pair）；外層列 `(7,17)` 不變 |
| 18 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 31` | 全域 | FR-006 | `init` 中 `Math.max(...)`（app.js L30）讀頁面 entry 的 `global` 定義（US3-4 形態） |
| 19 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math`（app.js L30 `Math.max`）未宣告只讀，成為頁面 `global` Var，頁面 entry 定義（D3） |
| 20 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | row | + | `TodoList` | 解析 | FR-002–FR-005 | 同 #17：class 內層綁定列（無 pair） |
| 21 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 31` | 全域 | FR-006 | `init` 中 `Math.max(...)`（app.js L30）讀頁面 entry 的 `global` 定義（US3-4 形態） |
| 22 | expected-es2015 | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math`（app.js L30 `Math.max`）未宣告只讀，成為頁面 `global` Var，頁面 entry 定義（D3）；intra-procedural 為空列 |
| 23 | expected-es2015 | page0 | intra-procedurals/0.dupairs.dot | row | + | `TodoList` | 解析 | FR-002–FR-005 | 同 #17：class 內層綁定列（無 pair） |
| 24 | expected-fixes004 | inter-page | 0.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | `class Counter`（app.js L10）外／內層綁定分拆：類別本體內的參照（L11 `static self = Counter`、L13 `y = Counter`，dot 12、14 與 entry_c、entry_d）歸內層列，外層保留 call_d、37、call_j；pair multiset 不變 |
| 25 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | 同 #24：外／內層列分拆，pair multiset 不變 |
| 26 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | 同 #24：外／內層列分拆，pair multiset 不變 |
| 27 | expected-fixes004 | page0 | intra-procedurals/0.dupairs.dot | row | + | `Counter` | 解析 | FR-002–FR-005 | class 內層綁定列（無 pair）；外層列 `(11,36)`、`(11,37)`、`(11,39)` 不變 |

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

未宣告只讀的名稱成為頁面＋名稱的 `global` Var（`Def.GLOBAL_TYPE`，頁面 entry 在 fixed list、`undefined` 初值、函式宣告之後依 `globalVars()` 定義；
只被 `++`／`--`、for-in／for-of 左側寫入或只在參數預設值／class 成員中賦值的未宣告名稱補登記為 `implicitGlobal`，T053–T055）後，
淨差異表由 8 筆增為 27 筆：新增 19 筆全為全域類（FR-006），皆為 row／pair 新增，無移除、無 model／graph 差異（所有 `graph.dot`、`hierarchy.dot` 不變）。
`expected-fixes004/`、`expected-interprocedural/` 相對 US2（9c2941c）零差異。

- `expected` page0：`JSON`（app.js L53、L70）— intra-procedural 空列、intra-page 列與 `JSON: entry -> 71`、`JSON: entry -> entry`（KI §18 函式 entry 讀取）；
  page1：`JSON`（report.js L5）— 同形態的 `JSON: entry -> 6`、`JSON: entry -> entry`；inter-page 兩頁各一列、各自的 pair，不跨頁（US3-5）。
- `expected-es2015` page0：`Math`（app.js L30，`init` 中）— intra-procedural 空列、intra-page／inter-page 的 `Math: entry -> 31`（US3-4 形態）。
- US3-2：fixed list 物件（`window`、`document`、`console` 等）與 `localStorage` 的列與 pair 都不在淨差異表（逐位元組未變）。
- KI §18 的 `JSON: entry -> entry` 4 筆（page0／page1 intra-page 各 1、inter-page 2）歸全域類。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected | inter-page/0.dupairs.dot | 387e1b57c79c → 0f8c365bdb97 | #1–#6 兩頁的 `JSON` 列與 pair |
| expected | page0/intra-pages/0.dupairs.dot | a4c5ad1279d0 → 419aa93ab44d | #7–#9 `JSON` 列與 pair |
| expected | page0/intra-procedurals/0.dupairs.dot | 7b24e6ae6159 → fb4aa3646fb8 | #10 `JSON` 空列 |
| expected | page1/intra-pages/0.dupairs.dot | 6b114f03c64e → 49980f7fbfcc | #12–#14 `JSON` 列與 pair |
| expected | page1/intra-procedurals/0.dupairs.dot | b84eb11c9d66 → 288475fbb8e3 | #15 `JSON` 空列 |
| expected-es2015 | inter-page/0.dupairs.dot | a3a117d300c0 → eb4f45437f3f | #16、#18 `Math` 列與 pair |
| expected-es2015 | page0/intra-pages/0.dupairs.dot | a3a117d300c0 → eb4f45437f3f | #19、#21 `Math` 列與 pair |
| expected-es2015 | page0/intra-procedurals/0.dupairs.dot | 31017662f6cc → 58fc5a25ce9c | #22 `Math` 空列 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/scopebinding.js`「should keep a block function in a function with eval inside the block (D5 first)」 | 原斷言 block 外的 `bf()` 的 `useVarsOf` 為 `[]`；US3 後未解析的 `bf` 是頁面 `global` Var，改斷言恰一個 Var、種類 `global`、不是 block 函式的 Var（D5 不連結的語意不變） | FR-006、FR-007 |
| `tests/dujs/scopeguards.js`「should read f and g2 as page globals」（annexb） | 取消 `it.skip`（Foundational 因只讀全域屬 US3 而暫略），斷言不變 | FR-006、FR-007 |
| `tests/dujs/scopeguards.js`「should give the pairs of develop for with.js／evalouter.js」 | 原為與 develop 清單嚴格相等；US3 後多出 `eval: entry -> L4`、`eval: entry -> entry`（with）與 `eval: entry -> L3`、`eval: entry -> entry`（evalouter）。依 spec Clarifications「implement US3」改為「develop 清單全部存在＋新增 pair 的變數名須為該頁未解析名稱」（intra-page 與 inter-procedural 皆同；其他 probe 仍嚴格相等） | FR-006、US4-4 |

## US4

### 變化說明

無差異。US4 只新增靜態測試 `tests/dujs/scopesource.js`（FR-012 (1)），`lib/` 零修改（T060 只有 S5 允許表的缺項，於測試檔補齊，無 lib 違規）；
`UPDATE_GOLDEN=1 npm test` 重生後 `tests/golden/expected*` 相對 US3（428d36c）零差異，淨差異表不變（27 筆），manifest 未更新。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

（無變化）

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

（無既有測試修改；新增 `tests/dujs/scopesource.js`）

## 驗收預期更正

無
