# Golden 差異紀錄（feature 005，FR-011、SC-005）

基準：`9e324be`（develop；`diffcheck.js golden` 未給 `--base` 時讀此行，見 contracts/diff-check.md §1）

行號說明：dot 標記的行號＝fixture 行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」與「釘選與簽核」為機器區塊（`node specs/005-summary-analysis/tools/diffcheck.js golden --verify specs/005-summary-analysis/golden-diff.md` 核對），
每個改 golden 的階段（T019、T028、T042、T062、T071、T081、T090）以 `--report` 重新產生整表（相對 develop 的累積結果）後補「說明」；
`摘要`、`連結`、`finally`、`保守摘要` 與 `例外IN` 的新增 pair 為釘選類別（說明必填），簽核欄 implementer 只填「草擬，待簽核」，使用者於 T099 簽核（2026-11-17：「釘選與簽核」表 7 列全部同意；inter-page 例外IN 兩列已人工核對為 Q-a 路徑）。
inter-page 層級的 pair 不帶頁別，`例外IN` 以「某頁同行號的節點會拋錯且該行提到同名變數」啟發式判定（兩頁同行號且都提到同名變數時可能誤歸）；T099 簽核時對 inter-page 的「例外IN」列（含「亦符」中的例外IN）人工核對（T103 審查 R3）。
釘選表的 +／− 只計 pair、列、模型的新增與消失；graph 的檔案變更（`~`）列入簽核欄的列號，但不計入 +／−（T101，Setup 審查 R3）。
`*.matching.json` 為新增檔，不列入淨差異（diffcheck 只核其 JSON 與 `format`），登記於 `tests/golden/manifest.json` 各 case 的 `added`。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 2 | expected | page0 | intra-procedurals/5.graph.dot | graph | ~ | `intra-procedurals/5.graph.dot` | finally | FR-013 | US6：parseSaved 的 catch 本體（L56 `parsed = []`）可能拋錯，finally 改由例外進入：新增 `finallyExit` 節點（normal → L60、exception → exit），L56 的 exception 邊改接 finally 入口（L58）；節點重新編號 （亦符：連結、共通） |
| 3 | expected | page0 | intra-procedurals/6.graph.dot | graph | ~ | `intra-procedurals/6.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 4 | expected | page0 | intra-procedurals/7.graph.dot | graph | ~ | `intra-procedurals/7.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 5 | expected | page0 | intra-procedurals/8.graph.dot | graph | ~ | `intra-procedurals/8.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 6 | expected | page1 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 7 | expected | page1 | intra-procedurals/0.graph.dot | graph | ~ | `intra-procedurals/0.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 8 | expected | page1 | intra-procedurals/1.graph.dot | graph | ~ | `intra-procedurals/1.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 9 | expected | page1 | intra-procedurals/2.graph.dot | graph | ~ | `intra-procedurals/2.graph.dot` | 共通 | — | US6：cfgId 為全域計數器，parseSaved 新增 `finallyExit` 節點後，其後建立的模型節點編號全部 +1；結構不變（去除節點編號後逐字相同） |
| 10 | expected | inter-page | 0.dupairs.dot | pair | - | `JSON: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 11 | expected | inter-page | 0.dupairs.dot | pair | - | `JSON: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 12 | expected | inter-page | 0.dupairs.dot | pair | - | `countDown: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 13 | expected | inter-page | 0.dupairs.dot | pair | - | `describeMode: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 14 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 15 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 16 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 64 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 17 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 64 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 18 | expected | inter-page | 0.dupairs.dot | pair | - | `mode: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 19 | expected | inter-page | 0.dupairs.dot | pair | - | `mode: 75 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 20 | expected | inter-page | 0.dupairs.dot | pair | - | `parseSaved: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 21 | expected | inter-page | 0.dupairs.dot | pair | - | `saved: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 22 | expected | inter-page | 0.dupairs.dot | pair | - | `saved: 6 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 23 | expected | inter-page | 0.dupairs.dot | pair | - | `sumAll: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 24 | expected | inter-page | 0.dupairs.dot | pair | - | `sumAll: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 25 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `JSON: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 26 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `countDown: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 27 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `describeMode: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 28 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 29 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 30 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 64 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 31 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 64 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 32 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `mode: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 33 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `mode: 75 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 34 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `parseSaved: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 35 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `sumAll: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 36 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `sumAll: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 37 | expected | page0 | intra-procedurals/5.dupairs.dot | pair | + | `parsed: 52 -> 60` | finally | FR-013 | US6：finally（L57–L59）由正常與例外兩種方式進入，`finallyExit` 的續行取聯集（research R6 精度說明）：L54 `JSON.parse` 拋錯時有效的 `parsed`（L52）經 catch 本體 L56 的例外邊、finally、`finallyExit` 的 normal 邊到 L60（過度近似） （亦符：連結、例外IN） |
| 38 | expected | page1 | intra-pages/0.dupairs.dot | pair | - | `JSON: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 39 | expected | page1 | intra-pages/0.dupairs.dot | pair | - | `saved: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 40 | expected | page1 | intra-pages/0.dupairs.dot | pair | - | `saved: 6 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 41 | expected-es2015 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-005 | US2：L40 `addTodo(input?.value)`（click 處理器內；fixture L39）依 D2 連到 `addTodo`（`const` 綁定的箭頭函式、全頁唯一定義），圖中插入 addTodo 本體與 call／return 邊 （亦符：共通） |
| 42 | expected-es2015 | page0 | inter-procedurals/0.dupairs.dot | model | + | `inter-procedurals/0.dupairs.dot` | 連結 | FR-005 | US2：新增處理器（`$ANONYMOUS_FUN_4`）的 inter-procedural 模型，L40 連到 addTodo（`$ANONYMOUS_FUN_3`） |
| 43 | expected-es2015 | page0 | inter-procedurals/0.graph.dot | graph | + | `inter-procedurals/0.graph.dot` | 連結 | FR-005 | US2：新增處理器（`$ANONYMOUS_FUN_4`）的 inter-procedural 模型，L40 連到 addTodo（`$ANONYMOUS_FUN_3`） （亦符：共通） |
| 44 | expected-es2015 | page0 | inter-procedurals/0.hierarchy.dot | graph | + | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-005 | US2：新增處理器（`$ANONYMOUS_FUN_4`）的 inter-procedural 模型，L40 連到 addTodo（`$ANONYMOUS_FUN_3`） （亦符：共通） |
| 45 | expected-es2015 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-005 | US2：L40 `addTodo(input?.value)`（click 處理器內；fixture L39）依 D2 連到 `addTodo`（`const` 綁定的箭頭函式、全頁唯一定義），圖中插入 addTodo 本體與 call／return 邊 （亦符：共通） |
| 46 | expected-es2015 | inter-page | 0.dupairs.dot | row | + | `title` | 連結 | FR-005 | US2：L40 連結後 addTodo 本體進入模型，新增此變數列 |
| 47 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `addTodo: 19 -> 40` | 連結 | FR-005 | US2：L40 連結後呼叫敘述拆為 callNode／callReturn，callee 的讀取移到 callNode（改為 `addTodo: 19 -> call`） （亦符：摘要、例外IN） |
| 48 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `addTodo: 19 -> call` | 連結 | FR-005 | US2：L40 連結後 callee 的讀取在 callNode（取代 `addTodo: 19 -> 40`） |
| 49 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `addTodo: 19 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 50 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `document: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 51 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `input: 39 -> 40` | 連結 | FR-005 | US2：L40 連結後引數的讀取移到 callNode（改為 `input: 39 -> call`） （亦符：摘要、例外IN） |
| 52 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `input: 39 -> call` | 連結 | FR-005 | US2：L40 連結後引數 `input?.value` 的讀取在 callNode（取代 `input: 39 -> 40`） |
| 53 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `list: 17 -> 25` | 連結 | FR-005 | US2：addTodo 本體 L25 `list.render(...)` 讀頁面 L17 的 `list`（經 LOOP 進處理器、L40 呼叫進 addTodo） |
| 54 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `list: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 55 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `loadTodos: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 56 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `nextId: 31 -> 23` | 連結 | FR-005 | US2：init（處理器）L31 的 `nextId` 經 LOOP 到 click 處理器，L40 進 addTodo，L23 `nextId++` 讀取 |
| 57 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `nextId: 5 -> 23` | 連結 | FR-005 | US2：頁面 L5 `let nextId = 1` 經 LOOP 與 L40 呼叫到 addTodo L23 讀取 |
| 58 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `saveTodos: 2 -> 24` | 連結 | FR-005 | US2：import 的 `saveTodos`（L2）在 addTodo L24 呼叫讀取 |
| 59 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `state: 23 -> 23` | 連結 | FR-005 | US2：L23 `state.todos = ...` 的定義經 addTodo 的摘要 gen 回到處理器、再經 LOOP 下一輪點擊進 addTodo L23 讀取 |
| 60 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `state: 23 -> 24` | 連結 | FR-005 | US2：addTodo 內 L23 的 `state` 定義到 L24 `saveTodos(state.todos)` |
| 61 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `state: 23 -> 25` | 連結 | FR-005 | US2：addTodo 內 L23 的 `state` 定義到 L25 `list.render(state.todos)` |
| 62 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `state: 33 -> 23` | 連結 | FR-005 | US2：init（處理器）L33 的 `state.todos = saved` 經 LOOP 到 click 處理器、L40 進 addTodo L23 |
| 63 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `state: 33 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 64 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `state: 4 -> 23` | 連結 | FR-005 | US2：頁面 L4 `const state` 經 LOOP 與 L40 呼叫到 addTodo L23 |
| 65 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `state: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 66 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `title: 19 -> (20,21)` | 連結 | FR-005 | US2：addTodo 參數 `title`（L19 定義）在 L20 `if (!title.trim())` 的 p-use（true 分支） |
| 67 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `title: 19 -> (20,23)` | 連結 | FR-005 | US2：addTodo 參數 `title` 在 L20 的 p-use（false 分支） |
| 68 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `title: 19 -> 23` | 連結 | FR-005 | US2：addTodo 參數 `title` 在 L23 物件字面值的讀取 |
| 69 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `input` | 連結 | FR-005 | US2：L40 連結後 addTodo 本體進入模型，新增此變數列 |
| 70 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `state` | 連結 | FR-005 | US2：L40 連結後 addTodo 本體進入模型，新增此變數列 |
| 71 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `title` | 連結 | FR-005 | US2：L40 連結後 addTodo 本體進入模型，新增此變數列 |
| 72 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `input: 39 -> call` | 連結 | FR-005 | US2：L40 連結後引數 `input?.value` 的讀取在 callNode（取代 `input: 39 -> 40`） |
| 73 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `state: 23 -> 24` | 連結 | FR-005 | US2：addTodo 內 L23 的 `state` 定義到 L24 `saveTodos(state.todos)` |
| 74 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `state: 23 -> 25` | 連結 | FR-005 | US2：addTodo 內 L23 的 `state` 定義到 L25 `list.render(state.todos)` |
| 75 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `title: 19 -> (20,21)` | 連結 | FR-005 | US2：addTodo 參數 `title`（L19 定義）在 L20 `if (!title.trim())` 的 p-use（true 分支） |
| 76 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `title: 19 -> (20,23)` | 連結 | FR-005 | US2：addTodo 參數 `title` 在 L20 的 p-use（false 分支） |
| 77 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `title: 19 -> 23` | 連結 | FR-005 | US2：addTodo 參數 `title` 在 L23 物件字面值的讀取 |
| 78 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | row | + | `title` | 連結 | FR-005 | US2：L40 連結後 addTodo 本體進入模型，新增此變數列 |
| 79 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `addTodo: 19 -> 40` | 連結 | FR-005 | US2：L40 連結後呼叫敘述拆為 callNode／callReturn，callee 的讀取移到 callNode（改為 `addTodo: 19 -> call`） （亦符：摘要、例外IN） |
| 80 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `addTodo: 19 -> call` | 連結 | FR-005 | US2：L40 連結後 callee 的讀取在 callNode（取代 `addTodo: 19 -> 40`） |
| 81 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `addTodo: 19 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 82 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `document: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 83 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `input: 39 -> 40` | 連結 | FR-005 | US2：L40 連結後引數的讀取移到 callNode（改為 `input: 39 -> call`） （亦符：摘要、例外IN） |
| 84 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `input: 39 -> call` | 連結 | FR-005 | US2：L40 連結後引數 `input?.value` 的讀取在 callNode（取代 `input: 39 -> 40`） |
| 85 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `list: 17 -> 25` | 連結 | FR-005 | US2：addTodo 本體 L25 `list.render(...)` 讀頁面 L17 的 `list`（經 LOOP 進處理器、L40 呼叫進 addTodo） |
| 86 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `list: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 87 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `loadTodos: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 88 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `nextId: 31 -> 23` | 連結 | FR-005 | US2：init（處理器）L31 的 `nextId` 經 LOOP 到 click 處理器，L40 進 addTodo，L23 `nextId++` 讀取 |
| 89 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `nextId: 5 -> 23` | 連結 | FR-005 | US2：頁面 L5 `let nextId = 1` 經 LOOP 與 L40 呼叫到 addTodo L23 讀取 |
| 90 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `saveTodos: 2 -> 24` | 連結 | FR-005 | US2：import 的 `saveTodos`（L2）在 addTodo L24 呼叫讀取 |
| 91 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `state: 23 -> 23` | 連結 | FR-005 | US2：L23 `state.todos = ...` 的定義經 addTodo 的摘要 gen 回到處理器、再經 LOOP 下一輪點擊進 addTodo L23 讀取 |
| 92 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `state: 23 -> 24` | 連結 | FR-005 | US2：addTodo 內 L23 的 `state` 定義到 L24 `saveTodos(state.todos)` |
| 93 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `state: 23 -> 25` | 連結 | FR-005 | US2：addTodo 內 L23 的 `state` 定義到 L25 `list.render(state.todos)` |
| 94 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `state: 33 -> 23` | 連結 | FR-005 | US2：init（處理器）L33 的 `state.todos = saved` 經 LOOP 到 click 處理器、L40 進 addTodo L23 |
| 95 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `state: 33 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 96 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `state: 4 -> 23` | 連結 | FR-005 | US2：頁面 L4 `const state` 經 LOOP 與 L40 呼叫到 addTodo L23 |
| 97 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `state: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 98 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `title: 19 -> (20,21)` | 連結 | FR-005 | US2：addTodo 參數 `title`（L19 定義）在 L20 `if (!title.trim())` 的 p-use（true 分支） |
| 99 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `title: 19 -> (20,23)` | 連結 | FR-005 | US2：addTodo 參數 `title` 在 L20 的 p-use（false 分支） |
| 100 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `title: 19 -> 23` | 連結 | FR-005 | US2：addTodo 參數 `title` 在 L23 物件字面值的讀取 |
| 101 | expected-interprocedural | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 102 | expected-interprocedural | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 103 | expected-interprocedural | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 104 | expected-interprocedural | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 105 | expected-interprocedural | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 106 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 107 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 108 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 109 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | + | `total: 2 -> 21` | 例外IN | FR-014 | US1：Q-a 後 L15 `addTo(1)`（fixture L14）的 exception 邊自 callNode 出發、帶呼叫前的定義（FR-014 的 IN），L2 `total`（fixture L1）經頁面 exit 與 LOOP 進入 onClick 的 log，到 L21 `console.log(total)`（fixture L20）；呼叫在 addTo 執行前即拋錯時可實現 |
| 110 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 111 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 112 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 113 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 114 | expected-interprocedural | page0 | inter-procedurals/0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 115 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 116 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 117 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 118 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 119 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 120 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 121 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 122 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | + | `total: 2 -> 21` | 例外IN | FR-014 | US1：Q-a 後 L15 `addTo(1)`（fixture L14）的 exception 邊自 callNode 出發、帶呼叫前的定義（FR-014 的 IN），L2 `total`（fixture L1）經頁面 exit 與 LOOP 進入 onClick 的 log，到 L21 `console.log(total)`（fixture L20）；呼叫在 addTo 執行前即拋錯時可實現 |
| 123 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 124 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 125 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 126 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 127 | expected-fixes004 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 128 | expected-fixes004 | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 129 | expected-fixes004 | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 130 | expected-fixes004 | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 131 | expected-fixes004 | page0 | inter-procedurals/3.graph.dot | graph | ~ | `inter-procedurals/3.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 132 | expected-fixes004 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 133 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 134 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 135 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 136 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 137 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 138 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 139 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 140 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 141 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `y: 14 -> 52` | 摘要 | FR-002、FR-003、FR-006、FR-007 | US1：L36 `new Counter().add(2)`（fixture L35）改以 add 的摘要套用：add 每條正常返回路徑都經 L23 `y = t`（mustKill `y`），L14 的 `y`（static block）在 callReturn 被殺；舊 pair 來自 add／bump 內的例外經被呼叫端 exit 的 return 邊回到 callReturn（不可實現）。非被呼叫端的例外定義，US3 不還原 （亦符：例外IN） |
| 142 | expected-fixes004 | page0 | inter-procedurals/0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 143 | expected-fixes004 | page0 | inter-procedurals/1.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 144 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 145 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 146 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 147 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 148 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 149 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 150 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 151 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 152 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `y: 14 -> 52` | 摘要 | FR-002、FR-003、FR-006、FR-007 | US1：L36 `new Counter().add(2)`（fixture L35）改以 add 的摘要套用：add 每條正常返回路徑都經 L23 `y = t`（mustKill `y`），L14 的 `y`（static block）在 callReturn 被殺；舊 pair 來自 add／bump 內的例外經被呼叫端 exit 的 return 邊回到 callReturn（不可實現）。非被呼叫端的例外定義，US3 不還原 （亦符：例外IN） |
| 153 | expected-fixes004 | page0 | inter-procedurals/3.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 154 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 155 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 156 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 157 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 158 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 159 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 160 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 161 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 162 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `y: 14 -> 52` | 摘要 | FR-002、FR-003、FR-006、FR-007 | US1：L36 `new Counter().add(2)`（fixture L35）改以 add 的摘要套用：add 每條正常返回路徑都經 L23 `y = t`（mustKill `y`），L14 的 `y`（static block）在 callReturn 被殺；舊 pair 來自 add／bump 內的例外經被呼叫端 exit 的 return 邊回到 callReturn（不可實現）。非被呼叫端的例外定義，US3 不還原 （亦符：例外IN） |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| expected | page0 | finally | L53–L59 `try`／`catch`／`finally`（parseSaved 內；fixture L52–L58） | 1 | 0 | `.graph.dot`：parseSaved 的 catch 本體拋錯改經 finally，新增 `finallyExit` 節點（#2）；pair：finally 由正常與例外進入，續行取聯集而新增 `parsed: 52 -> 60`（#37，過度近似，research R6） | 使用者簽核（2026-11-17）（#2、#37） |
| expected-es2015 | inter-page | 連結 | L40 `addTodo()`（函式運算式 內）：基準未連結 | 15 | 2 | US2：L40 `addTodo(input?.value)`（click 處理器內）依 D2 連到 addTodo（`const` 箭頭函式、全頁唯一定義）：callee 與引數的讀取由 L40 敘述節點移到 callNode（`addTodo`／`input: … -> 40` 改為 `-> call`）；addTodo 本體進模型，新增參數 `title`、`state`、`nextId`、`saveTodos`、`list` 的讀取（經 LOOP 進處理器再進 addTodo）；`.graph.dot` 插入本體與 call／return 邊；新增 `title` 變數列 | 使用者簽核（2026-11-17）（#41、#46、#47、#48、#51、#52、#53、#56、#57、#58、#59、#60、#61、#62、#64、#66、#67、#68） |
| expected-es2015 | page0 | 連結 | L40 `addTodo()`（函式運算式 內）：基準未連結 | 27 | 2 | 同 inter-page（intra-pages 0），另新增處理器 `$ANONYMOUS_FUN_4` 的 inter-procedural 模型 0（`.dupairs`／`.graph`／`.hierarchy.dot`，新增 `input`、`state`、`title` 列與其 6 筆 pair） | 使用者簽核（2026-11-17）（#42、#43、#44、#45、#69、#70、#71、#72、#73、#74、#75、#76、#77、#78、#79、#80、#83、#84、#85、#88、#89、#90、#91、#92、#93、#94、#96、#98、#99、#100） |
| expected-interprocedural | inter-page | 例外IN | L15 `addTo(1)` 的 callNode 例外邊（Q-a） | 1 | 0 | Q-a：L15 `addTo(1)` 的 callNode 例外邊帶 IN（FR-014），`total: 2 -> 21` 經頁面 exit 與 LOOP 到 onClick 的 log | 使用者簽核（2026-11-17）（#109） |
| expected-interprocedural | page0 | 例外IN | L15 `addTo(1)` 的 callNode 例外邊（Q-a） | 1 | 0 | Q-a：L15 `addTo(1)` 的 callNode 例外邊帶 IN（FR-014），`total: 2 -> 21` 經頁面 exit 與 LOOP 到 onClick 的 log | 使用者簽核（2026-11-17）（#122） |
| expected-fixes004 | inter-page | 摘要 | 基準有 call 邊 | 0 | 1 | L36 `new Counter().add(2)` 套用 add 的摘要（mustKill `y`），`y: 14 -> 52` 消失（不可實現的例外經 exit 回 callReturn 路徑不再存在；US3 不還原） | 使用者簽核（2026-11-17）（#141） |
| expected-fixes004 | page0 | 摘要 | 基準有 call 邊 | 0 | 2 | L36 `new Counter().add(2)` 套用 add 的摘要（mustKill `y`），`y: 14 -> 52` 消失（inter-procedural 2 與 intra-page 各 1；US3 不還原） | 使用者簽核（2026-11-17）（#152、#162） |

## Foundational

### 變化說明

`doAnalysis` 改用新求解器 `lib/dujs/reachingsolver.js`（research R2）：exception 邊帶 `IN(p)`（FR-014）；相容模式下 return 邊與處理器 exit → LOOP RETURN 邊照舊帶 `OUT(p)`，
callReturn 的 bypass 合併以動態 `extraReachIns` 傳入；過渡規則 `exceptionToCalleeExitCarriesOut`（analyze Q1）開啟，指向被呼叫端 exit 的 exception 邊仍帶 `OUT(p)`（US1 刪除）。
求解器的入列順序沿用原 worklist（已在佇列中的節點移到尾端；callNode 的 OUT 改變時先入列讀取它的 callReturn，再入列後繼），使集合的元素順序與 develop 相同。
golden 4 個 case 重建後**位元組不變**（`diffcheck.js golden --report`「無差異」），淨差異表為空，`tests/golden/manifest.json` 不需更新。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| （全部） | （無） | 不變 | golden 重建後無任何檔案變化 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/catchclause.js` | catch-edge（US1-6）：`e: L3 -> L5` 改為 `e: L1 -> L5`（L3 `e = 2` 拋錯時 `e` 仍為 L1 的定義），`e: L3 -> L5` 移入 absent；新增 present `e: L1 -> L13`、`e: L3 -> L13`（L8 `e = 3` 拋錯時帶 L1、L3 的定義經 catch 到 L13） | FR-014 |

## US5

### 變化說明

ENTRY／EXIT 節點不再讀取函式本體（FR-008、research R7）：`usedexpressions.usedExpressionsOf` 對 ENTRY／EXIT 回傳 `[]`（連 `split.preEvaluated` 也不回傳，與
`modelbuilder.expressionsEvaluatedAtNode` 一致）；`defuseanalyzer.findUSESet` 移除 `isEntryNode` 與 `binding.isOnFunctionChain` 的判斷；`scopebinding` 移除 `isOnFunctionChain`
（失去唯一呼叫者）。`findUSESet` 走訪器中為「entry 走訪函式本體」而設的巢狀敘述規則（巢狀 for-in/for-of、`SwitchCase`）保留程式、只更新註解。
golden 重建後只有 15 個 `.dupairs.dot` 變化，`.graph.dot` 全部不變；淨差異 88 筆皆為 `−` pair、類別 `§18`（use 端為 `entry`），沒有新增 pair，釘選表不變（`§18` 為機械判定）。
各 case 筆數：`expected` 30（inter-page 15、page0 intra-page 12、page1 intra-page 3）、`expected-es2015` 12、`expected-fixes004` 27、`expected-interprocedural` 19。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-es2015 | inter-page/0.dupairs.dot | eb4f45437f3f → fb91a771d68c | use 端為 entry 的 pair 消失（§18） |
| expected-es2015 | page0/intra-pages/0.dupairs.dot | eb4f45437f3f → fb91a771d68c | use 端為 entry 的 pair 消失（§18） |
| expected-fixes004 | inter-page/0.dupairs.dot | 78fd272ab42a → 72c28ca1410d | use 端為 entry 的 pair 消失（§18） |
| expected-fixes004 | page0/inter-procedurals/0.dupairs.dot | bdf4ba013185 → f02d01f385d3 | use 端為 entry 的 pair 消失（§18） |
| expected-fixes004 | page0/inter-procedurals/1.dupairs.dot | 2df60ae29939 → 95c6e893d24d | use 端為 entry 的 pair 消失（§18） |
| expected-fixes004 | page0/inter-procedurals/2.dupairs.dot | 78fd272ab42a → 72c28ca1410d | use 端為 entry 的 pair 消失（§18） |
| expected-fixes004 | page0/inter-procedurals/3.dupairs.dot | 2a3b853d5805 → f7ee511e7800 | use 端為 entry 的 pair 消失（§18） |
| expected-fixes004 | page0/intra-pages/0.dupairs.dot | 78fd272ab42a → 72c28ca1410d | use 端為 entry 的 pair 消失（§18） |
| expected-interprocedural | inter-page/0.dupairs.dot | eefbd316e37e → 7d3cda0b5220 | use 端為 entry 的 pair 消失（§18） |
| expected-interprocedural | page0/inter-procedurals/0.dupairs.dot | 34b3720a6225 → 627d2003cd9e | use 端為 entry 的 pair 消失（§18） |
| expected-interprocedural | page0/inter-procedurals/1.dupairs.dot | 2da50b1615f6 → 1f434e0b7beb | use 端為 entry 的 pair 消失（§18） |
| expected-interprocedural | page0/intra-pages/0.dupairs.dot | 44ab28868e6b → 1b96184c3d78 | use 端為 entry 的 pair 消失（§18） |
| expected | inter-page/0.dupairs.dot | 0f8c365bdb97 → fd399e593d80 | use 端為 entry 的 pair 消失（§18） |
| expected | page0/intra-pages/0.dupairs.dot | 419aa93ab44d → 20f1636ff045 | use 端為 entry 的 pair 消失（§18） |
| expected | page1/intra-pages/0.dupairs.dot | 49980f7fbfcc → 77ab6c4af2ff | use 端為 entry 的 pair 消失（§18） |

### 單元測試期望

以下改動皆為「刪除 use 端為 `entry` 的期望」（含 ENTRY 節點的 use 集合改為空）；以 `-> entry'` 字串比對確認除刪除外無其他改動。

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/usedexpressions.js` | scenario 5（巢狀本體）：函式 entry 節點的 use 由 `{cuse: ['x'], puse: ['a', 'o']}` 改為 `{cuse: [], puse: []}`，測試名稱與註解改寫為「entry 不讀本體」 | FR-008 |
| `tests/dujs/scopebinding.js` | 刪除 `isOnFunctionChain (research R6a, Q3)` 的 describe（1 個測試；方法已移除） | FR-008 |
| `tests/dujs/branchsplit.js` | 1 個測試：刪 `a: L1 -> entry` | FR-008 |
| `tests/dujs/bypass.js` | 1 個測試（byp-2）：刪 `f: entry -> entry` | FR-008 |
| `tests/dujs/callcycles.js` | 8 個測試（cyc-1…、事件處理器循環）：刪 `c: L1/L5/L8 -> entry`、`A: L2 -> entry`、`p: entry -> entry`、`t: L4 -> entry`、`x: L1/L5 -> entry`、`document: entry -> entry`、`h: entry -> entry` | FR-008 |
| `tests/dujs/classfields.js` | 2 個測試（US4-3、US4-4）：刪 `Q: L1 -> entry`、`console: entry -> entry`、`Q: L2 -> entry` | FR-008 |
| `tests/dujs/expansion.js` | 20 個測試（7 個 probe 的 inter-procedural／intra-page／inter-page 期望）：刪 51 筆 `… -> entry` | FR-008 |
| `tests/dujs/hierarchy.js` | 4 個測試（US1 acceptance、n1、n1b、n1c）：刪 `x: L1 -> entry`、`a: L7 -> entry`、`a: L10 -> entry`、`a: L8 -> entry`（`shouldNotLeak` 的不應出現清單保留） | FR-008 |
| `tests/dujs/methodcalls.js` | 3 個測試：刪 `x: L9/L1/L5/L4/L7 -> entry`、`A: L2 -> entry` | FR-008 |
| `tests/dujs/modelbuilder.js` | 2 個測試：刪 `h/init/reg/window: entry -> entry`、`g: entry -> entry` | FR-008 |
| `tests/dujs/newcallsite.js` | 4 個測試：刪 `x: L1 -> entry`、`A: L2 -> entry`、`B: L2 -> entry` | FR-008 |
| `tests/dujs/paramdefaults.js` | 3 個測試：刪 `d: L1 -> entry`（參數預設值的讀取仍在合成的參數初始化節點 `d: L1 -> L3`） | FR-008 |
| `tests/dujs/paramsandnew.js` | 1 個測試：刪 `d: L1 -> entry` | FR-008 |
| `tests/dujs/reviewfixes.js` | 1 個測試（R2）：刪 `v: L6 -> entry` | FR-008 |
| `tests/dujs/scopeguards.js`（期望在 `tests/dujs/cases/probes006/developpairs.json`） | 7 個測試（same pairs as develop）：自 `developpairs.json` 刪 17 筆 `… -> entry`（`A`、`q`、`a`、`m`、`t`、`console`、`x`） | FR-008 |

## US6

### 變化說明

esgraph 的 `finally` 整族（FR-013、research R6、data-model §7–§8）：`lib/esgraph/index.js` 以「`getEntry(finalizer) !== getSuccessor(try)`」判定非空 finally（空 finally 視同沒有）；
catch 本體在 `catchStack` 推入 finally 入口後走訪；`return`／`break`／`continue` 沿 `cfg.parent` 鏈靜態找出跨出的 try（不含從 finally 本身跨出），依序接到第一個非空 finally 入口並登記待續目標；
非空 finally 不是只由正常完成進入時，新增 `finallyExit` 節點（`FlowNode.FINALLY_EXIT_NODE_TYPE`，無 astNode，行號為 finally 區塊結尾），finally 末端改接它，
它的出邊為 normal（正常進入）、exception（例外進入，到外層 handler）與多目標 `finally` 邊（`FlowNode.FINALLY_CONNECTION_TYPE`，每個待續目標一條）；在 branch splitting 之前完成。
`lib/esgraph/dot.js` 以型別為標籤、橢圓繪出 `finallyExit`，`finally` 邊為 `label="finally"`；`lib/dujs/expansion.js` 的 `replayLoop` 一併改接 `finally` 邊；`lib/dujs/cfgbuilder.js` 不以 astNode 覆寫 `finallyExit` 的行號、計算 exit 行號時略過它。
golden 只有 `expected` 的 page0 `parseSaved`（catch 本體 L56 `parsed = []` 可能拋錯）受影響：`intra-procedurals/5.graph.dot` 新增 `finallyExit` 節點，L56 的 exception 邊由 exit 改接 finally 入口 L58，
`finallyExit` 有 normal → L60 與 exception → exit；同一 finally 由正常與例外兩種方式進入，續行取聯集，新增 `parsed: 52 -> 60`（過度近似，research R6 精度說明）。
cfgId 為全域計數器，其後建立的模型（page0 intra-procedurals 6–8、page1、inter-page）的 `.graph.dot` 節點編號全部 +1，去除編號後逐字相同（`共通`）。
`intra-pages/0` 與 `inter-page/0` 的 `.dupairs.dot` 不變（develop 中 parseSaved 的呼叫點未連結，D2 屬 US2）；其他 case 無 `try`／`finally`，全部不變。
淨差異新增 10 筆（graph ~ 9、pair + 1）：`finally` 2 筆（#2、#37，釘選）、`共通` 8 筆。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected | inter-page/0.graph.dot | a711401e2780 → 3f0b8095455f | 節點重新編號（結構不變） |
| expected | page0/intra-procedurals/5.dupairs.dot | 1ebe3e9447bd → 56621c6f95f1 | 新增 `parsed: 52 -> 60`（finally 續行聯集） |
| expected | page0/intra-procedurals/5.graph.dot | b8554f1a9d7a → 66136b5f43f0 | 新增 `finallyExit` 節點；L56 例外邊改接 finally 入口 L58 |
| expected | page0/intra-procedurals/6.graph.dot | 70a954c4acef → fdab9e0a8122 | 節點重新編號（結構不變） |
| expected | page0/intra-procedurals/7.graph.dot | 108b41b8a13d → fd22f796bd58 | 節點重新編號（結構不變） |
| expected | page0/intra-procedurals/8.graph.dot | 8420fe7f3130 → 35bec807b4b2 | 節點重新編號（結構不變） |
| expected | page1/intra-pages/0.graph.dot | b6656468faa3 → 6b7c07528b0b | 節點重新編號（結構不變） |
| expected | page1/intra-procedurals/0.graph.dot | 4eb550c61fe1 → 2ac10291e0b4 | 節點重新編號（結構不變） |
| expected | page1/intra-procedurals/1.graph.dot | 278085bed1cc → 6f244f999160 | 節點重新編號（結構不變） |
| expected | page1/intra-procedurals/2.graph.dot | 8b2504943c78 → 262cfdd60c3a | 節點重新編號（結構不變） |

### 單元測試期望

既有測試的期望未改動（`tests/esgraph/tests/tryfinally.js`、`rethrow.js` 不變）；以下為新增的測試。

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/esgraph/finally.js` | 新增：data-model §8 各列的邊結構（try／catch 拋錯 × 有無 catch × 空／非空 finally、跳躍經 finally、巢狀 finally、finally 內覆寫、多種進入的聯集、巢狀函式邊界、`allNodes`、cfgbuilder 行號、dot 輸出） | FR-013 |
| `tests/dujs/finallyflow.js` | 新增：US6-1…7 驗收 | FR-013、FR-014 |
| `tests/esgraph/flownodetest.js`、`tests/esgraph/flownodefactory.js` | 新增：`finallyExit` 節點型別、`finally` 多目標連接型別、`copyNodes` 保留 `finally` 邊、`createFinallyExitNode` | FR-013 |
| `tests/dujs/reachingsolver.js` | 新增：`finally` 邊帶 OUT、`finallyExit` 的 exception／`finally` 邊到 exit 的抵達分類 | FR-013 |
| `tests/dujs/expansion.js` | 新增：`replayLoop` 改接頁面 exit 前驅的 `finally` 邊（頁面層 labeled break） | FR-013 |

## US1

### 變化說明

- 摘要上線（T053–T056）：upper 模型（有 hierarchy）的 `doAnalysis` 以 `calls`＋`summary.summaryOf` 求解；callReturn 不再吃被呼叫端 exit 的 `return` 邊，改吃
  `apply(S, OUT(callNode))`；被呼叫端例外不再經 exit 回到 callReturn（US3 由 `exceptionalReturn` 接到例外目標）；永不正常返回的被呼叫端之後的節點不分析。
- 刪除 Foundational 過渡規則 `exceptionToCalleeExitCarriesOut`（analyze Q1）與 `doAnalysis` 對它的開啟；`callReturn` 的 `bypassFilter` 合併移除
  （`_bypassFilter` 保留，改以 `isVisibleToCallee` 實作，即摘要的可見性過濾）。
- 呼叫配對輸出（T058、FR-010）：每個 inter-procedural、intra-page、inter-page 模型在 `.graph.dot` 旁另寫 `<index>.matching.json`（`dujs-matching/1`；節點名與 `.graph.dot`
  同為 `cfggraphconverter.dotNodeIds` 的 `n<k>`；`loops` 先為空陣列〔US4〕、摘要的 `exceptional` 先為空〔US3〕；不產 png）。golden 新增 16 個 `*.matching.json`，登記於
  `tests/golden/manifest.json` 各 case 的 `added`（`expected` 3、`expected-es2015` 2、`expected-interprocedural` 5、`expected-fixes004` 6）；`tests/golden/golden.js` 的檔案清單納入它們。
- golden（T062）：`expected`、`expected-es2015` 的 `.dot` 位元組不變（兩者的 upper 模型沒有 call 邊〔函式內的呼叫未連結，D2 屬 US2〕，只有 LOOP／onEvent；`matching.json` 的 `calls` 為空；事件處理器偵測不變）。淨差異由 98 筆增為 114 筆，新增 16 筆：
  - `Q-a` 11 筆（`.graph.dot` ~）：`expected-interprocedural` 5、`expected-fixes004` 6 個 upper 模型圖中，呼叫敘述的 exception 邊由 callReturn 移回 callNode；
    逐行比對只有 `label="exception"` 的邊變化，節點與其他邊不變。
  - `例外IN` 2 筆（+，釘選）：`expected-interprocedural` 的 `total: 2 -> 21`（intra-page、inter-page 各 1）：L15 `addTo(1)` 的 callNode 例外邊帶呼叫前的 IN。
  - `摘要` 3 筆（−，釘選）：`expected-fixes004` 的 `y: 14 -> 52`（inter-procedural 2、intra-page、inter-page 各 1）：add 的摘要 mustKill `y`；舊 pair 經被呼叫端例外 → exit → return 邊回到
    callReturn，為不可實現路徑。不是被呼叫端的例外定義，**US3 不還原**；本階段 golden 中標「US3 還原」者 0 筆。
  - `expected-fixes004` 的 `page0/inter-procedurals/0.dupairs.dot` 只有變數列順序改變（`y`、`x` 兩列互換，皆無 pair），pair 不變、不列入淨差異。
- 先前各階段的列保留原類別與說明（`--verify` 核對類別仍成立）；`--report` 對 `expected` 的部分 `共通`／`finally` 列另列出 `連結` 為首選類別，沿用原類別。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-interprocedural | inter-page/0.dupairs.dot | 7d3cda0b5220 → 98da3f06a99f | 新增 `total: 2 -> 21`（例外IN） |
| expected-interprocedural | inter-page/0.graph.dot | 984a9b950a93 → 37ee3d700c98 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-interprocedural | page0/inter-procedurals/0.graph.dot | 6358657de2d0 → c0dc33fb5f88 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-interprocedural | page0/inter-procedurals/1.graph.dot | 6e41ae057c7f → 1de49a9e02ee | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-interprocedural | page0/inter-procedurals/2.graph.dot | 1ccd8d44b126 → 52ee22d5a537 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-interprocedural | page0/intra-pages/0.dupairs.dot | 1b96184c3d78 → 9965cedd1487 | 新增 `total: 2 -> 21`（例外IN） |
| expected-interprocedural | page0/intra-pages/0.graph.dot | d8c9a6ea00d5 → 2a92a0d7a998 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-fixes004 | inter-page/0.dupairs.dot | 72c28ca1410d → 3b8024a6c642 | 刪除 `y: 14 -> 52`（摘要） |
| expected-fixes004 | inter-page/0.graph.dot | dbe14af147e1 → 270dee2acc57 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-fixes004 | page0/inter-procedurals/0.dupairs.dot | f02d01f385d3 → 1b233dcf964e | 變數列 `y`、`x` 順序互換（無 pair 變化） |
| expected-fixes004 | page0/inter-procedurals/0.graph.dot | 15aa29de3b01 → 79aaf94c4589 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-fixes004 | page0/inter-procedurals/1.graph.dot | c7e843bc8efc → b57af69454b0 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-fixes004 | page0/inter-procedurals/2.dupairs.dot | 72c28ca1410d → 3b8024a6c642 | 刪除 `y: 14 -> 52`（摘要） |
| expected-fixes004 | page0/inter-procedurals/2.graph.dot | 41e81ffde555 → 39b85cf6f25d | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-fixes004 | page0/inter-procedurals/3.graph.dot | f9edebfc6ee8 → f360f12e1169 | Q-a：exception 邊由 callReturn 移回 callNode |
| expected-fixes004 | page0/intra-pages/0.dupairs.dot | 72c28ca1410d → 3b8024a6c642 | 刪除 `y: 14 -> 52`（摘要） |
| expected-fixes004 | page0/intra-pages/0.graph.dot | 26c9d70364b5 → 9bc65091578e | Q-a：exception 邊由 callReturn 移回 callNode |

### 單元測試期望

| 檔案 | 測試 | 原期望 → 新期望 | 理由 | FR | 還原 |
|------|------|-----------------|------|----|------|
| `tests/dujs/reachingsolver.js` | `transitional rule exceptionToCalleeExitCarriesOut (analyze Q1)` 三案例 | 刪除 → 新增 `calls mode (summaries)` 三案例（callReturn 得 `apply`、無正常返回時其後不分析、摘要 VarDef 對不到本圖時拋錯） | 過渡規則隨摘要上線刪除（T054） | FR-002、FR-014 | — |
| `tests/dujs/callcycles.js` | cyc-1、ctor-cycle | intra-page／頁面模型去掉 `x: L1 -> L12` | m（constructor）每條正常路徑都定義 x（mustKill）；舊 pair 來自 L5 例外經 exit 回 L11 callReturn，現例外離開頁面 | FR-001、FR-002 | — |
| `tests/dujs/callcycles.js` | cyc-2 | 去掉 `x: L1 -> L16`、`x: L12 -> L16` | m 正常返回前必經 L8 `x = 1`，殺掉 L1 與 n 的 L12 | FR-001、FR-003 | — |
| `tests/dujs/callcycles.js` | cyc-3（改名 `should have no pair used at L6 after an unconditional recursive call`） | `t: L4 -> L6` → 無以 L6 為 use 端的 pair | 無條件遞迴，m 無正常返回（R3 Q1、US1-4）；條件遞迴版由 `c-cyc3-cond` 驗 | FR-003 | — |
| `tests/dujs/callcycles.js` | cyc-uncond | `['A: L2 -> L8', 'x: L5 -> L9']` → `['A: L2 -> L8']`（頁面模型同） | m 無正常返回，L8 callReturn 之後不可達，不再分析 | FR-003 | — |
| `tests/dujs/callcycles.js` | should connect each call-site once when the page calls both m and n of a cycle | 去掉 `x: L1 -> L18`、`x: L8 -> L18` | L17 `a.n()` 正常返回前必經 L12 `x = 2` | FR-001、FR-002 | — |
| `tests/dujs/expansion.js` | pre-refactor characterization a1（三模型） | 去掉 `i: entry -> L7`、`x: L7 -> L6` | g 只回到自己的呼叫點（L6／L7 的呼叫不再互通） | FR-002 | — |
| `tests/dujs/expansion.js` | pre-refactor characterization a2（三模型） | 去掉 `n: L3 -> L9`、`n: L3 -> L10`；intra-page／inter-page 另去掉 `n: L8 -> L9`、`n: L8 -> L10` | L5 `h()` 經 `reg()` mustKill n；h 作為處理器時不再回到 L5 的 callReturn | FR-001、FR-002 | — |
| `tests/dujs/expansion.js` | pre-refactor characterization a3（三模型） | 去掉 `s: L3 -> L10>L10:T/F`、`s: L6 -> L10>L10:T/F` | outer／inner 的例外不再經 exit 回 L9 callReturn；正常返回必經 L7 finally `s = 6` | FR-001、FR-002 | — |
| `tests/dujs/expansion.js` | pre-refactor characterization r8（三模型） | 去掉 `n: L1 -> L6`；intra-page／inter-page 另去掉 `n: L2 -> L6` | L4 `h()` 經 `reg()` mustKill n；處理器 h 不再回到 L4 的 callReturn | FR-001、FR-002 | — |
| `tests/dujs/modelbuilder.js` | should find the handlers and pairs of probe a2 as before the refactoring | 去掉 `n: L3 -> L9/L10`、`n: L8 -> L9/L10` | 同 a2 | FR-001、FR-002 | — |
| `tests/dujs/modelbuilder.js` | should keep the onEvent targets g, h, g of probe r8 in order with duplicates | 去掉 `n: L1 -> L6`、`n: L2 -> L6` | 同 r8 | FR-001、FR-002 | — |
| `tests/dujs/methodcalls.js` | US3-7 should connect new A().m(); to the field, the constructor and then m | 去掉 `x: L5 -> L13` | m 每條正常路徑定義 x（L9）；L8 例外不再回 L12 callReturn | FR-001、FR-002 | — |
| `tests/dujs/newcallsite.js` | US2-3 should connect new B(); to B only without following extends | 去掉 `x: L1 -> L15` | B 的 constructor 正常返回必經 L11 `x = 2`；`super()` 例外不再回 L14 callReturn | FR-001、FR-002 | — |
| `tests/dujs/finallyflow.js` | US6-1（c-fin1） | present `r: L4 -> L14`、`r: L4 -> L16` → present 空（absent 不變） | f 例外離開時的定義暫失（Q-a 後 callNode 例外邊只帶呼叫前定義；`exceptional` 待 US3） | FR-006、FR-013 | US3 還原（已沖銷，見 US3 節） |
| `tests/dujs/finallyflow.js` | US6-2（c-fin3） | present `r: L7 -> L16`、`r: L7 -> L18` → present 空 | 同上 | FR-006、FR-013 | US3 還原（已沖銷，見 US3 節） |
| `tests/dujs/summary.js`、`tests/dujs/summaryanalysis.js` | `scopeNamed`、US1-8 的 scope 查找；`invariants` 的 no-write 快照；`applyExceptional` 的 `containEql` | 期望不變；修測試工具：`Scope.name` 為全名改比對末段；`Model.graph`／FlowNode Set 欄位讀取即複本，改比對元素 identity；`containEql(VarDef)` 會讓 should-format 拋錯，改 `indexOf` | 測試本身無法執行（與實作無關） | — | — |
| `tests/dujs/summary.js` | `upward-exposed uses` › `should hold the upward-exposed uses of a nested callee` | 程式由「函式 f 內呼叫頁面函式 `g()`」改為 class 方法 `f() { this.g(); }`、`g() { return y; }`；斷言同為 g 與 f 的 `upwardExposed` 含 `y` | 函式內呼叫頁面函式需 US2 的 D2 才連結；依 T044 遞迴案例用 `this.m()` 的同一原則改寫（orchestrator 裁決），驗的仍是巢狀被呼叫端的 `upwardExposed` 併入（測試註解說明） | FR-001 | — |
| `tests/dujs/matching.js` | US1-5 p1、us3-3 的 `calleeScope` 比對 | 期望不變；修測試工具：`Scope.name` 為全名（`$DOMAIN.$PAGE_0.f`），改比對末段（`lastPartOf`）。`matching.json` 的 `callee` 依 contracts/matching-output.md §2 為全名，不變 | 測試本身無法執行（與實作無關） | — | — |

## US3

### 變化說明

- 摘要第四項 `exceptional`（T068，`lib/dujs/summary.js`）：例外抵達 exit 的非哨兵定義（`exitArrivals.exceptional`：exception 邊帶 IN，含 finallyExit 的重拋）
  ∪ 以本圖 exit 為 `exceptionalReturn` 的呼叫紀錄 `applyExceptional(S_callee, OUT(callNode))`（沿呼叫鏈往外），經可見性過濾；generator／async 的 `gen`
  另併入完整 `exceptional`（R13）。求解器的 `exitArrivals` 維持只依邊計算，呼叫紀錄的貢獻由摘要自行取聯集（orchestrator 裁決，兩者不重複）。
- `exceptionalReturn` 虛擬貢獻（T069，`lib/dujs/reachingsolver.js`）：`calls` 模式下，每筆 `exceptionalReturn` 不為 null 的呼叫紀錄，其 `exceptionalReturn` 的 IN 併入
  `OUT(callNode) ∪ exceptional`（經 `flatVarDefOf`，對不到時拋錯；不做 KILL）；callNode 的 OUT 改變時重新入列；可達性：callNode 可達即視 `exceptionalReturn` 可達
  （決策前的 CALL NODE 與串接後段的 callNode 沒有例外邊）。`summary.computeSummary` 與 `defuseanalyzer.doAnalysis` 兩個呼叫端同時生效；`outputwriter.js` 未改（已輸出 `exceptional`）。
- golden（T071）：所有 `.dot` 位元組不變，淨差異維持 114 筆（`--report` 與既有表逐列相同），`tests/golden/manifest.json` 不需更新（`*.matching.json` 只登記於 `added`、無雜湊）。
  變化只在 8 個 `*.matching.json` 的 `summaries.<scope>.exceptional` 由空變非空（`expected-fixes004` 5、`expected-interprocedural` 3）：
  - `expected-fixes004`：`Counter` 的 add（`$ANONYMOUS_FUN_4`）、bump（`$ANONYMOUS_FUN_5`）互相遞迴，`exceptional`＝`{c, x, y}`（與 `gen` 相同：內層呼叫的例外沿 add↔bump 往外）；
    `page0/inter-procedurals/1.matching.json` 只有一個無例外定義的被呼叫端，不變。
  - `expected-interprocedural`：`addTo` 的 `exceptional`＝`{total}`（fixture L8 `scale()` 拋錯時帶 L7 的 `total`）；`inter-procedurals/0`、`2` 的被呼叫端沒有例外定義，不變。
  - 這些例外定義在頁面層的 `exceptionalReturn` 是 LOOP（`replayLoop` 後），但與正常返回的 `gen` 相同，經 LOOP 到處理器的 pair 已存在，因此沒有新增 pair；
    `y: 14 -> 52`（#93、#104、#114，US1 標「US3 不還原」）維持消失。
- 與 US1「US3 還原」各列的沖銷：golden 中 US1 標「US3 還原」者 0 筆（無需沖銷）；單元測試期望表兩列（`finallyflow.js` US6-1、US6-2）於下表沖銷，
  `grep -rn "US3 還原" tests` 無輸出。

### 雜湊變化表（舊→新 sha256 前 12 碼）

`.dot` 無變化；下列為新增檔 `*.matching.json`（不在 manifest `baseline`）的雜湊變化，僅供核對。

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-fixes004 | inter-page/0.matching.json | e848c5d44262 → dc1328f5741b | add、bump 的 `exceptional` 填入 `c`、`x`、`y` |
| expected-fixes004 | page0/inter-procedurals/0.matching.json | 8629aa556f01 → 4616b726692c | 同上 |
| expected-fixes004 | page0/inter-procedurals/2.matching.json | b441d7d2d4cb → 267dc6594a86 | 同上 |
| expected-fixes004 | page0/inter-procedurals/3.matching.json | 838401ceef76 → 5ca05fb3918d | 同上 |
| expected-fixes004 | page0/intra-pages/0.matching.json | da2ba7360f42 → 25efed8683d5 | 同上 |
| expected-interprocedural | inter-page/0.matching.json | 655b95be61d6 → 0fa2541b0f5e | addTo 的 `exceptional` 填入 `total` |
| expected-interprocedural | page0/inter-procedurals/1.matching.json | 8e57c9794bc2 → 13b742cb86c1 | 同上 |
| expected-interprocedural | page0/intra-pages/0.matching.json | 106a3ac1c0bb → ec8075b4634c | 同上 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/finallyflow.js` | US6-1（c-fin1）：present 空 → `r: L4 -> L14`、`r: L4 -> L16`（還原；沖銷 US1 節單元測試期望表 US6-1 列），刪除「US3 還原」註解 | FR-006、FR-013 |
| `tests/dujs/finallyflow.js` | US6-2（c-fin3）：present 空 → `r: L7 -> L16`、`r: L7 -> L18`（還原；沖銷 US1 節單元測試期望表 US6-2 列），刪除「US3 還原」註解 | FR-006、FR-013 |
| `tests/dujs/exceptionsummary.js` | 新增（T064）：US3-1…4、6、7，US3-2 另以 g2-try-catch 對照；既有測試期望無其他翻轉 | FR-006、FR-014 |
| `tests/dujs/summary.js` | 新增 `exceptional (User Story 3)` 六案例（T065） | FR-001、FR-006 |
| `tests/dujs/reachingsolver.js` | 新增 `calls mode (exceptional return)` 六案例（T066） | FR-006 |

## US4

### 變化說明

- LoopRecord（T077）：`expansion.expand` 依 `loop`／`loopReturn`／`event` 重播回傳 `loops`（每個 LOOP 節點〔每頁〕一筆 `{loop, loopReturn, handlers: [{scope, entry, exit}], noHandler}`，
  凍結）；同一處理器重複註冊（`a2` 的 `h.reg`、`r8` 的 `g`）時依 scope 去重，與唯一一條 exit → LOOP RETURN 邊一對一（orchestrator 裁決 2）。`Model.setLoopRecords`／`loopRecords`，
  `modelbuilder.setFlatGraphFromHierarchy` 存入；inter-procedural 模型為空陣列，inter-page 模型每頁一筆。
- 求解器（T078）：`options.loops` 時 LOOP RETURN 的 IN 併入 `OUT(LOOP) ∪ ⋃_h flatVarDefOf(gen_h ∪ exceptional_h)`（不套 `apply` 的 `normalReturn` 與 must-KILL）；
  處理器 exit → LOOP RETURN 的 NORMAL 邊不貢獻（以「source 為該紀錄某處理器的 exit、target 為其 loopReturn」判定，與 return 邊的排除各自獨立）；LOOP 改變時 LOOP RETURN 重新入列；
  可達性：LOOP 可達即視 LOOP RETURN 可達。`defuseanalyzer.doAnalysis` 對 intra-page／inter-page 模型傳入 `loops`。
- 裁決 1（摘要 VarDef 對不到攤平圖）：只在處理器的摘要有對不到的定義、且 `openHandler(scope)` 成立（該 scope 第一個建出的模型為 open hierarchy）時，該處理器退回相容做法
  （其 exit → LOOP RETURN 邊照舊帶 OUT、摘要不貢獻）；其他情形仍拋錯。實測 `callcycles` 的 `cyc-handler` 的處理器 `h` 沒有呼叫，摘要全部對得到，**不觸發**退回；`npm test`、
  golden 與 MDN 33 檔全程 `openHandler` 未被呼叫（builder 對每個有呼叫的 scope 都會登記 closed 模型）。退回行為以 `tests/dujs/reachingsolver.js` 單元測試固定，`cyc-handler` 在
  `tests/dujs/loopmatching.js` 驗不拋錯且 `x = 5`（L3）經摘要抵達 LOOP RETURN。
- 配對輸出（T079）：`*.matching.json` 的 `loops` 依 LoopRecord 輸出（`{loop, loopReturn, handlers: [{scope, entry, exit}]}`，handlers 依 entry 節點名排序；無處理器的頁為
  `handlers: []`），`summaries` 併入處理器的摘要。
- golden（T081）：所有 `.dot` 位元組不變，淨差異維持 114 筆（`--report` 逐列與既有表相同；類別欄 6 列的首選類別差異同 US1 節所述，沿用原類別），釘選表不變，
  `tests/golden/manifest.json` 不需更新。變化只在 9 個 intra-page／inter-page `*.matching.json`：`loops` 由空陣列變為 LoopRecord，`summaries` 併入處理器：
  - `expected`：page0 `onLoad`、`onAdd`、`onModeChange`；page1 `onLoad`、`onClear`（inter-page 兩筆 LOOP 紀錄）。
  - `expected-es2015`：`init`、`$ANONYMOUS_FUN_4`。
  - `expected-interprocedural`：`onClick`、`onLoad`。
  - `expected-fixes004`：頁面沒有處理器，各一筆 `handlers: []` 的 LOOP 紀錄（noHandler）；`summaries` 不變。
  - 未出現 inter-page localStorage 的新增 pair；golden、MDN（`diffcheck.js mdn --report` 與 US4 前逐字相同）與 probes（`probes/run.js` 對 probes005、probes004、probes）的 pair 皆無變化：
    舊做法經處理器 exit 漏進 LOOP 的直接呼叫情境定義，在這些程式中另有頁面敘述的例外邊（帶 IN）抵達 LOOP，所以 pair 不變。可區分的情境（直接呼叫情境的區域變數經處理器 exit
    進 LOOP，例：`k` 內 `var t = 1; … h(); t = 2;`，舊有 `t: L2 -> L4`）以 `tests/dujs/loopmatching.js` 內嵌程式固定。

### 雜湊變化表（舊→新 sha256 前 12 碼）

`.dot` 無變化；下列為新增檔 `*.matching.json`（不在 manifest `baseline`）的雜湊變化，僅供核對。

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected | inter-page/0.matching.json | 3562c9935f4e → d4d85a4907b6 | `loops` 兩筆（page0 三個處理器、page1 兩個）；`summaries` 併入五個處理器 |
| expected | page0/intra-pages/0.matching.json | c86354bbfdd7 → 07b55f534445 | `loops` 一筆（`onLoad`、`onAdd`、`onModeChange`）；`summaries` 併入 |
| expected | page1/intra-pages/0.matching.json | e779e3d0a3aa → 4e7a1805682f | `loops` 一筆（`onLoad`、`onClear`）；`summaries` 併入 |
| expected-es2015 | inter-page/0.matching.json | 3562c9935f4e → cb921174a022 | `loops` 一筆（`init`、`$ANONYMOUS_FUN_4`）；`summaries` 併入 |
| expected-es2015 | page0/intra-pages/0.matching.json | c86354bbfdd7 → 4f4693fd7f87 | 同上 |
| expected-interprocedural | inter-page/0.matching.json | 0fa2541b0f5e → 59bfbff61b05 | `loops` 一筆（`onClick`、`onLoad`）；`summaries` 併入 |
| expected-interprocedural | page0/intra-pages/0.matching.json | ec8075b4634c → 9f28b0853ceb | 同上 |
| expected-fixes004 | inter-page/0.matching.json | dc1328f5741b → 47e0ec647dc8 | `loops` 一筆 `handlers: []`（無處理器） |
| expected-fixes004 | page0/intra-pages/0.matching.json | 25efed8683d5 → a9398d50fd37 | 同上 |

### 單元測試期望

既有測試期望無翻轉（`modelbuilder.js` a2／r8、`es2015.js`、`callcycles.js` cyc-handler、`exceptionsummary.js`、`finallyflow.js`、`summaryanalysis.js`、`cli` 皆照舊通過）。

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/loopmatching.js` | 新增（T073）：US4-1…3、處理器 GEN 經 LOOP 流向自己、處理器區域變數不經 LOOP 流出、直接呼叫情境的定義不經處理器 exit 進 LOOP、LoopRecord 與 call 紀錄分開、無處理器、a2／r8 重複處理器去重與 exit 邊一對一、inter-page 每頁一筆、cyc-handler（裁決 1）、CLI `0.matching.json` 的 `loops` | FR-007、FR-010 |
| `tests/dujs/reachingsolver.js` | 新增 `loops mode (LoopRecord)` 七案例（T074）：虛擬貢獻不套 must-KILL、處理器 exit 不貢獻、無處理器只有 `OUT(LOOP)`、與直接呼叫的 return 邊排除各自獨立、`flatVarDefOf` 對應與拋錯、open 處理器退回、缺 `summaryOf` 拋錯 | FR-007 |
| `tests/dujs/expansion.js` | 新增 `LoopRecords of expand` 三案例（T075）：凍結、處理器依 scope 去重且依序、無處理器、inter-page 每頁一筆、其他模型為空 | FR-007 |
| `tests/dujs/model.js` | 新增 `setLoopRecords`／`loopRecords` 一案例（T075） | FR-007 |

## US2

### 變化說明

- D2 放寬（T087、T088、FR-005、research R8）：`scopebinding` 新增 `PageBinding.prototype.isRelaxedCallee(aVar)`（binding 種類 ∈ {`function`、`let`、`const`、`namedExpressionName`}）；
  `callresolver.resolveVariable` 加第 4 參數＝運算式種類，只有 `calleeScopesOf` 傳入（`classOfInstance`、`calleeScopesOfMethodCall` 不放寬）。到達定義 0 筆時，除既有 class 放寬外，
  `CallExpression`＋呼叫點在函式內（沿 scope parent 跳過 block scope 後不是頁面 scope；頁面層 block 內的呼叫不放寬）＋`definitionsOnThePage` 恰 1 筆＋`targetOfDefinition` 為 `{scope}`
  （`{classInfo}` 不接受：class 運算式的內部名稱也是 `namedExpressionName`）＋`isRelaxedCallee` 才連結。自身遞迴（函式宣告、具名函式運算式內部名稱）與互相遞迴連結，摘要以不動點終止
  （`p7`、`p10-self-rec`、`p11-named-fe`、`c-noret` 實測終止；`tests/dujs/relaxedcallee.js`）。
- golden（T090）：只有 `expected-es2015` 變化：L40 `addTodo(input?.value)`（click 處理器 `$ANONYMOUS_FUN_4` 內；fixture L39）連到 addTodo（`const` 箭頭函式 `$ANONYMOUS_FUN_3`）。
  淨差異由 114 筆增為 162 筆，新增 48 筆皆為 `連結`（釘選）：
  - `.graph.dot` ~ 2 筆（inter-page 0、intra-pages 0）：插入 addTodo 本體與 call／return 邊；新增檔 3 筆：處理器的 inter-procedural 模型 `page0/inter-procedurals/0.{dupairs,graph,hierarchy}.dot`
    （連同 `0.matching.json` 登記於 manifest `expected-es2015` 的 `added`）。
  - pair：L40 呼叫敘述拆為 callNode／callReturn，`addTodo: 19 -> 40`、`input: 39 -> 40` 改為 `-> call`（各頁 −2／＋2）；addTodo 本體進入模型，新增參數 `title` 的 p-use／c-use
    （`(20,21)`、`(20,23)`、`23`）、`state`（`4`、`33`、`23` → `23`；`23` → `24`、`25`）、`nextId`（`5`、`31` → `23`）、`saveTodos: 2 -> 24`、`list: 17 -> 25`（頁面與 init 的定義經 LOOP
    進 click 處理器、再經 L40 進 addTodo）；inter-procedural 0 只含處理器與 addTodo 內的 6 筆。
  - `*.matching.json`：intra-pages 0／inter-page 0 的 `calls` 新增 L40 一筆、`summaries` 併入 addTodo（gen `state`），處理器 exit 節點編號改變。
- **research R8 更正**：R8 預期 golden 連結 3 處（`es2015` 的 `addTodo`、`interprocedural` 的 `scale`、`log`），實測只有 `addTodo` 是新連結；`interprocedural` 的 `scale`、`log`
  在 D2 之前已由到達定義（嚴格規則）連上，golden 無變化。`expected`、`expected-fixes004` 亦無變化（`expected` 中函式內的呼叫如 `sum + add(...)` 不是呼叫敘述）。
- `--report` 對 `expected` 的 6 列（#1–#5、#37）首選類別列為 `連結`，同 US1 節所述沿用原類別；先前各階段的列保留原類別與說明，僅因插入 `expected-es2015` 列而重新編號
  （釘選表的 # 引用隨之更新）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-es2015 | inter-page/0.dupairs.dot | fb91a771d68c → ae6308300018 | L40 連結：`-> 40` 改 `-> call`，新增 addTodo 本體的 pair 與 `title` 列 |
| expected-es2015 | inter-page/0.graph.dot | caa8f6241dc8 → 82ccdd814580 | 插入 addTodo 本體與 call／return 邊 |
| expected-es2015 | page0/intra-pages/0.dupairs.dot | fb91a771d68c → ae6308300018 | 同 inter-page |
| expected-es2015 | page0/intra-pages/0.graph.dot | 14f7942d8d69 → 4cb3b1a1979e | 插入 addTodo 本體與 call／return 邊 |
| expected-es2015 | page0/inter-procedurals/0.dupairs.dot | （新增）→ 3d7c79945e39 | 處理器 `$ANONYMOUS_FUN_4` 的 inter-procedural 模型（manifest `added`） |
| expected-es2015 | page0/inter-procedurals/0.graph.dot | （新增）→ e94dce8b6ea7 | 同上 |
| expected-es2015 | page0/inter-procedurals/0.hierarchy.dot | （新增）→ c9849d17b108 | 同上 |
| expected-es2015 | page0/inter-procedurals/0.matching.json | （新增）→ abfd12f9e462 | 同上（`calls` 一筆） |
| expected-es2015 | inter-page/0.matching.json | cb921174a022 → 403bb1405665 | `calls` 新增 L40、`summaries` 併入 addTodo（不在 manifest `baseline`，僅供核對） |
| expected-es2015 | page0/intra-pages/0.matching.json | 4f4693fd7f87 → 1da0e2476b76 | 同上 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/relaxedcallee.js` | 新增（T083）：US2-1…7（含 US2-2 內嵌變體：`const` 箭頭函式連結；`var` 函式運算式、兩筆定義、`new f()` 不連結）、頁面層 block 內的呼叫不放寬、US1-7 `c-noret`（無以 L7 為 use 端的 `x` pair）、P30 `c-win` 限制（特徵化：誤連 `f`，有 `x: L3 -> L9`、無 `x: L7 -> L9`） | FR-005 |
| `tests/dujs/scopebinding.js` | 新增 `isRelaxedCallee` 三案例（T084） | FR-005 |
| `tests/dujs/exceptionsummary.js` | 新增 US3-5 `g4-chain-loop`（T085，intra-page：L8 `s();` 連到 `s`；有 `x: L3 -> L12`、`x: L9 -> L12`、`x: L1 -> L12`） | FR-005、FR-006 |
| `tests/dujs/newcallsite.js` | `should not relax for a function declaration (H3)` 改為 `should relax F() but not new F() for a function declaration (005 D2)`：L4 `F();` 由 `[]` 改為 `[$DOMAIN.$PAGE_0.F]`，L3 `new F()` 仍 `[]`；檔頭補 D2。理由：D2 取代 004 H3 中函式部分（spec D2、D6），`new` 不放寬 | FR-005 |
| `tests/dujs/scoperesolution.js` | 006 US2-2（D7）`should not connect the recursive call through the name of a function expression` 改為 `should connect ... (005 D2)`：inter-procedural 模型由 1 個（頁面）變 2 個（新增以 `$ANONYMOUS_FUN_0` 為根者），L2 `fact(n - 1)` 有指向該函式 entry 的 call 邊；`fact: L1 -> L2` 仍在 intra-page 與頁面模型；檔頭第 6 行敘述同步。理由：005 D2 明文取代 006 D7（具名函式運算式自身遞迴連結） | FR-005 |
| `tests/dujs/expansion.js` | pre-refactor characterization：`r6a` 新增以 `u` 為根的模型（`u`、`g`，無 pair）；`r6b` 新增以 `u` 為根的模型（`u`、`g`、`k`，`a: L3 -> L6`）；`r6c` 以 `f` 為根的模型加入 `g`（L8 `g()` 連結）並新增 `a: L6 -> L3`，頁面模型、intra-page、inter-page 亦新增 `a: L6 -> L3`（h 的 `a = 7` 經 f 到 g 的讀取）；檔頭補 D2。理由：函式內呼叫頁面函式依 D2 連結 | FR-005 |
| `tests/dujs/bypass.js` | byp-2：期望 pair 不變，只改註解與名稱（`should not change the pairs when the call is not connected` → `should keep the pairs when f() in g is connected (005 D2)`）：L7 `f()` 依 D2 連結，`f` 只定義 `x`、呼叫後未讀取，pair 不變 | FR-005 |
| `tests/dujs/summary.js` | 不改。`should not hold a variable defined before the nested callee reads it` 在 D2 前因 `g()` 未連結而空泛成立；D2 後實測：同程式刪去 `y = 1;` 時 `f` 的 upwardExposed 含 `y`（D2 前不含），有 `y = 1;` 時不含——確實驗到「先定義後呼叫」的過濾 | FR-002 |

## 驗收預期更正

T093（SC-002）以 `node specs/005-summary-analysis/probes/run.js` 逐一核對 P1–P11 與 KI §18 程式（P8 為 KI §18 程式加 `f();`）對 spec 驗收情境的預期：
P1（US1-1）、P2（US1-2）、P3（US2-1）、P4（US3-1）、P5（US4-1，intra-page）、P6（US4-2）、P7（US2-3）、P9（US5-2）、P10（US2-5）、P11（US2-6）
的 pair 皆與預期相符（inter-procedural 與 intra-page 兩層；P7 分析終止）。以下一筆為推導更正（不是實作偏差）：

| 情境 | spec 字面 | 實測 | 更正說明 |
|------|-----------|------|----------|
| US5-1（KI §18 程式；P8） | `f` 的 entry 節點 c-use、p-use 皆空；「`x`、`a`、`o`、`b` 的讀取只在各自敘述的節點」 | entry 的 c-use、p-use 皆空（成立）。`x` 為 L2 `case a:` 節點的 p-use（discriminant）、`o` 為 L4 for-in 節點的 c-use；`a`（`case a` 的 test 與 L3 `a;`）與 `b`（`b;`）不在任何節點被讀取 | 既有建模（002 起）：`case` 的 test 不算讀取，單獨識別字敘述（`a;`、`b;`）在非決策、非分割節點也不算讀取（`lib/dujs/usedexpressions.js` `astNodeItems`）；KI §18 原文「these uses are also found at the nodes of the statements themselves」只對 `x`、`o` 成立。驗收以「entry 為空、`x`／`o` 在各自節點、`a`／`b` 不在 entry」核對；`docs/known-issues.md` §18 的對應更正隨 T096（T102 (b)） |
