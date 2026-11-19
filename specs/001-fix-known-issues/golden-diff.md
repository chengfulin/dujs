# Golden 差異稽核（FR-013、SC-004）

implement 期間的工作檔：每次 `UPDATE_GOLDEN=1 npm test` 的差異逐處對應到 FR，最後由 T053 彙整進 PR 說明。

說明：dot 輸出的節點標記為 fixture 行號 + 1（`tests/golden/fixtures/es2015/app.js` 的 L16 在 dot 中為 `17`，
L18 為 `19`）。

## US2（T023）：`new` 的參數（FR-004）、預設參數初始化節點（FR-005）

`tests/golden/expected/`（ES5）：零差異。

| 檔案 | 差異位置 | 內容 | FR |
|------|----------|------|----|
| `tests/golden/expected-es2015/page0/intra-procedurals/0.dupairs.dot` | `document` 列 | 新增 `(entry,17)`：fixture L16 `new TodoList(document.getElementById('list'))` 的參數讀 `document`；表格欄數 1→2（`COLSPAN` 與各列空白 `<td>` 隨之增加） | FR-004 |
| `tests/golden/expected-es2015/page0/intra-pages/0.dupairs.dot` | `document` 列 | 同上，新增 `(entry_a,17)`；欄數 3→4 | FR-004 |
| `tests/golden/expected-es2015/inter-page/0.dupairs.dot` | `document` 列 | 同上，新增 `(entry_a,17)`；欄數 3→4 | FR-004 |
| `tests/golden/expected-es2015/page0/intra-procedurals/4.graph.dot`（`$ANONYMOUS_FUN_3`＝fixture L18 `addTodo`） | 全檔 | 新增 `title = ''` 的初始化節點 `19`：`entry -> 19 -> 20`、`19 -> exit`（exception），取代 `entry -> 20`；其餘節點只是編號順移 | FR-005 |
| `tests/golden/expected-es2015/page0/intra-procedurals/4.dupairs.dot` | `title` 列 | `title` 的 def 由 `entry` 改為初始化節點 `19`：`(19,(20,21))`、`(19,(20,23))`、`(19,23)` | FR-005 |
| `tests/golden/expected-es2015/page0/intra-procedurals/5.graph.dot`、`6.graph.dot` | 節點編號 | 只有節點 id 順移（+2：上一個模型多一個敘述，CFG 建構多耗用節點計數）；以標記比對節點與邊完全相同 | FR-005（編號連帶） |
| `tests/golden/expected-es2015/inter-page/0.graph.dot` | 節點編號 | 只有節點 id 順移；以標記比對節點與邊完全相同 | FR-005（編號連帶） |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/es2015.js`「should declare pattern, default and rest parameters」 | `last: entry -> L2` → `last: L1 -> L2`（`last = 1` 在 L1 的初始化節點定義） | FR-005 |

## US4（T031）：連鎖指派（FR-007）

`tests/golden/expected/` 與 `tests/golden/expected-es2015/`：零差異。

## US5（T042–T044）：條件／短路運算拆分（FR-008）、單一識別字條件為 p-use（FR-009）、loop 出邊（FR-010，T040a）

逐處以「節點標記」比對（忽略 n-id）確認；`n-id` 整體順移依本檔既有約定記為「編號連帶」。

### 上游 fixture（T042）

| 檔案 | 差異位置 | 內容 | FR |
|------|----------|------|----|
| `tests/esgraph/tests/maythrow.js`（LGPL 衍生 fixture，期望 dot） | `1 && call();` | 原單一節點 `1 && call()` 拆為決策 `1`（true→葉 `call()`、false→直接接 `new klass()`，F 分支空節點不建）；決策為 Literal 不拋例外故無 exception 邊，`call()` 有 exception 邊；exit 依拆分後的排序編為 `n3`，其餘節點編號連帶 | FR-008 |

修改紀錄：`tests/esgraph/tests/README.md`（2026-11-16 段）、`THIRD_PARTY_NOTICES.md` §1 esgraph 2026-11-16 段。

### `tests/golden/expected/`（ES5）

ES5 fixtures 無 `?:`／短路運算拆分差異；只有 T040a（`connectLoopNodeToPageGraph` 不再丟失接 exit 的出邊）造成的 4 條新增 exception 邊，dupairs 零差異。

| 檔案 | 差異位置 | 內容 | FR |
|------|----------|------|----|
| `tests/golden/expected/inter-page/0.graph.dot` | `n230 -> n231`、`n250 -> n251` | 各新增一條 exception 邊（頁面最後一個敘述→LOOP 節點；原本被 else-if 丟失） | FR-010（T040a） |
| `tests/golden/expected/page0/intra-pages/0.graph.dot` | `n31 -> n32` | 同上，新增 exception 邊 | FR-010（T040a） |
| `tests/golden/expected/page1/intra-pages/0.graph.dot` | `n201 -> n202` | 同上，新增 exception 邊 | FR-010（T040a） |

### `tests/golden/expected-es2015/`

| 檔案 | 差異位置 | 內容 | FR |
|------|----------|------|----|
| `page0/intra-procedurals/3.graph.dot`（`$ANONYMOUS_FUN_2`＝fixture L11 箭頭本體 `state.filter === 'all' \|\| !done`） | 全檔 | 決策 `12`（`state.filter === 'all'`）拆出葉 `12:T`、`12:F`（`!done`）：`12 -> 12:T`（true）、`12 -> 12:F`（false）、兩葉 -> exit，`12:F -> exit`（exception）；原 `12 -> exit` 一般邊移除，決策保留 exception 邊 | FR-008 |
| `page0/intra-procedurals/3.dupairs.dot` | `done` 列 | `(entry,12)` → `(entry,12:F)`：`!done` 位於 false 分支葉 | FR-008 |
| `page0/intra-procedurals/5.graph.dot`（`init`；fixture L29 `for (const { id } of saved ?? [])`） | 節點 `30` | 原迴圈節點 `30` 變為決策 `30a`（`saved`）＋迴圈節點 `30b`：`29 -> 30a`、`30a -> 30b`（true 與 false，兩分支皆無節點）、`30b -> 31`（true）、`30b -> 33`（false）、`30b -> exit`（exception）、`31 -> 30b`；決策 `saved` 為識別字不拋例外，無 exception 邊。`a`／`b` 為既有標記碰撞後綴（第一個決策與迴圈節點同為 `L30`，contracts/analyze-helper-notation.md 已知限制） | FR-008 |
| `page0/intra-procedurals/5.dupairs.dot` | `saved`、`id` 列 | `saved`：c-use `(29,30)` → 兩筆 p-use `(29,(30a,30b))`（true、false 目標同為 `30b`），欄數 2→3；`id`：`(30,31)` → `(30b,31)`（def 在迴圈節點） | FR-009（`saved` p-use）、FR-008（`id` 標記） |
| `inter-page/0.graph.dot`、`page0/intra-pages/0.graph.dot` | 節點 `30` | 同 `5.graph.dot` 的 `30` → `30a`＋`30b` 拆分 | FR-008 |
| 同上兩檔 | `38 -> loop` | 新增 exception 邊（頁面最後一個敘述 fixture L37 → LOOP 節點；原本被丟失） | FR-010（T040a） |
| 同上兩檔與 `page0/intra-procedurals/4.graph.dot`、`6.graph.dot` | 節點編號 | 其餘節點 id 順移（`4`：+2、`6`：+3，inter-page／intra-page 同理）；以標記比對節點與邊完全相同 | FR-008（編號連帶） |
| `inter-page/0.dupairs.dot`、`page0/intra-pages/0.dupairs.dot` | `saved`、`id` 列 | 同 `5.dupairs.dot`（`saved` 欄數擴為 3） | FR-009、FR-008 |
| 同上兩檔 | `nextId` 列 | 兩筆 pair `(5,31)`、`(31,31)` 不變，只有欄位順序對調（迴圈頭多一個決策節點，到達定義的走訪順序改變） | FR-008（順序連帶） |

### 單元測試期望（T043）

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/es2015.js`「should use variables in template literals, tagged templates, optional chaining and nullish coalescing」 | L5 `var v = o?.a?.b ?? t;` 拆為決策 L5 與葉 L5:T／L5:F：`t: L3 -> L5` → `t: L3 -> L5:F`；`v: L5 -> L6` → `v: L5:T -> L6`、`v: L5:F -> L6`（`o: L4 -> L5` 不變，決策非單一識別字為 c-use） | FR-008 |
| `tests/dujs/es2015.js`「should use the target of compound and logical assignments」 | L2 `n ??= 1;` 拆為決策 `n`（L2）與指派葉 L2:F：`n: L1 -> L2` → `n: L1 -> L2>L2:F`、`n: L1 -> L2>L3:T`（單一識別字決策為 p-use）、`n: L1 -> L3`（true 分支不指派，L1 的 def 到達 L3）；`n: L2 -> L3` → `n: L2:F -> L3` | FR-008、FR-009 |

## T053 總稽核：PR 說明用對照表

基準：`45022ed`（PR #2 合併點）。指令：`git diff 45022ed -- tests/golden tests/esgraph/tests tests/dujs/es2015.js`
（18 檔）。graph 差異以「節點標記取代 n-id」後比對（忽略編號連帶）；逐 commit 檢查：US1（`77a4571`）、US3
（`bb9ce6e`）、US4（`82f44c7`）、US6（`edd53ec`）對上列路徑零差異，差異只來自 Foundational（`193b1a3`，僅
`es2015.js` 記法）、US2（`0d0b05b`）、US5（`04dbf3d`）。結論：每處差異皆對應 FR-004、FR-005、FR-008、FR-009、
FR-010（T040a）或 FR-014；ES5 golden 只有 D17 的 loop exception 邊（graph 共 4 條），ES5 dupairs 零差異。

| 範圍 | 檔案 | 差異摘要 | FR |
|------|------|----------|----|
| ES5 golden | `expected/inter-page/0.graph.dot`、`expected/page0/intra-pages/0.graph.dot`、`expected/page1/intra-pages/0.graph.dot` | 頁面最後一個敘述→LOOP 節點各新增 exception 邊（2＋1＋1 條）；其餘零差異，dupairs 零差異 | FR-010（T040a，D17） |
| ES2015 golden | `page0/intra-procedurals/0.dupairs.dot`、`page0/intra-pages/0.dupairs.dot`、`inter-page/0.dupairs.dot` | `document` 新增 `new TodoList(document…)` 參數的 use（fixture L16）；欄數擴充 | FR-004 |
| ES2015 golden | `page0/intra-procedurals/4.graph.dot`、`4.dupairs.dot` | `title = ''` 初始化節點 `19`（fixture L18）；`title` 的 def 由 `entry` 改為 `19` | FR-005 |
| ES2015 golden | `page0/intra-procedurals/3.graph.dot`、`3.dupairs.dot` | `\|\|` 拆為決策 `12` 與葉 `12:T`／`12:F`（fixture L11）；`done` 的 use 移至 `12:F` | FR-008 |
| ES2015 golden | `page0/intra-procedurals/5.graph.dot`、`5.dupairs.dot`；`page0/intra-pages/0.*`、`inter-page/0.*` | `??` 拆為決策 `30a`（`saved`）＋迴圈節點 `30b`（fixture L29）；`saved` 由 c-use 改為 p-use；`id` def 移至 `30b`；`nextId` 兩筆 pair 欄序對調 | FR-008、FR-009 |
| ES2015 golden | `page0/intra-pages/0.graph.dot`、`inter-page/0.graph.dot` | `38 -> loop` 新增 exception 邊 | FR-010（T040a，D17） |
| ES2015 golden | `page0/intra-procedurals/4.graph.dot`、`6.graph.dot`、`inter-page/0.graph.dot` | 僅 n-id 順移；以標記比對節點與邊不變（`6.graph.dot` 標記比對零差異） | FR-005、FR-008（編號連帶） |
| 上游 fixture | `tests/esgraph/tests/maythrow.js` | `1 && call()` 拆為決策 `1`＋葉 `call()`；修改紀錄見 `tests/esgraph/tests/README.md` | FR-008 |
| 單元測試 | `tests/dujs/es2015.js`（Foundational） | p-use 目標記法加 `:T`／`:F`（4 個 `it`：`x: L2 -> L3>L4` → `L3>L4:T` 等），行為不變 | FR-014 |
| 單元測試 | `tests/dujs/es2015.js`（US2） | `last: entry -> L2` → `last: L1 -> L2` | FR-005 |
| 單元測試 | `tests/dujs/es2015.js`（US5） | `??`（L5）拆分後 `t`／`v` 的標記；`n ??= 1` 拆分後 `n` 的 p-use 與 def | FR-008、FR-009 |

## Phase 10（T056–T063）：PR #3 code review 修正

compare 模式 `npm test` 全綠：`tests/golden/expected/`（ES5）與 `tests/golden/expected-es2015/` 的 `.dot`
檔案集合與內容零差異，未重產 golden。各修正與 golden 的關係（「原因」欄為推斷，零差異本身由 compare 模式確認）：

| R | 修正 | golden 差異 | 原因 |
|---|------|-------------|------|
| R1 | 靜態成員呼叫點只看節點本身求值的運算式（不走進 ENTRY 本體、迴圈本體、case 本體、catch 本體） | 無 | fixture 的 class 皆為獨立敘述，原本就在自己的節點連結 |
| R2、R3 | 有 true／false 目標的節點（判斷節點）成為呼叫點（含靜態成員）時，在它之前插入 CALL／CALL RETURN 節點，判斷節點的邊與 GEN／KILL 不動；非判斷節點的呼叫點維持原做法，但改為先收齊所有出邊再搬（修正同一目標多條邊只搬一條的問題） | 無 | fixture 沒有條件為呼叫或 class 的決策節點 |
| R4 | switch 判斷式拆分改由 `FlowNode.discriminantSplit` 記錄；UpdateExpression 運算元內的條件依 D12 拆分 | 無 | fixture 的 switch 判斷式沒有條件或短路運算 |
| R5 | 物件 literal 的 Property 與 SpreadElement 中在條件前求值的部分留在決策節點 | 無 | fixture 沒有「條件前有屬性值或 spread」的拆分 |
| R6 | 帶預設值的解構參數，其巢狀預設值不另建初始化節點 | 無 | fixture 沒有巢狀於帶預設值模式內的預設值 |

單元測試期望未修改既有 `it`；新增 `tests/dujs/reviewfixes.js`（13 個 `it`）；`tests/helpers/analyze.js` 把插入在判斷節點前的 CALL 節點視為該判斷節點（比照 LOOP 節點的既有處理）。
