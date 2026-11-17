# Golden 差異紀錄（feature 005，FR-011、SC-005）

基準：`9e324be`（develop；`diffcheck.js golden` 未給 `--base` 時讀此行，見 contracts/diff-check.md §1）

行號說明：dot 標記的行號＝fixture 行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」與「釘選與簽核」為機器區塊（`node specs/005-summary-analysis/tools/diffcheck.js golden --verify specs/005-summary-analysis/golden-diff.md` 核對），
每個改 golden 的階段（T019、T028、T042、T062、T071、T081、T090）以 `--report` 重新產生整表（相對 develop 的累積結果）後補「說明」；
`摘要`、`連結`、`finally`、`保守摘要` 與 `例外IN` 的新增 pair 為釘選類別（說明必填），簽核欄 implementer 只填「草擬，待簽核」，使用者於 T099 簽核。
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
| 41 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `addTodo: 19 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 42 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `document: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 43 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `list: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 44 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `loadTodos: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 45 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `state: 33 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 46 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `state: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 47 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `addTodo: 19 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 48 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `document: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 49 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `list: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 50 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `loadTodos: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 51 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `state: 33 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 52 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `state: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 53 | expected-interprocedural | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 54 | expected-interprocedural | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 55 | expected-interprocedural | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 56 | expected-interprocedural | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 57 | expected-interprocedural | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 58 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 59 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 60 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 61 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | + | `total: 2 -> 21` | 例外IN | FR-014 | US1：Q-a 後 L15 `addTo(1)`（fixture L14）的 exception 邊自 callNode 出發、帶呼叫前的定義（FR-014 的 IN），L2 `total`（fixture L1）經頁面 exit 與 LOOP 進入 onClick 的 log，到 L21 `console.log(total)`（fixture L20）；呼叫在 addTo 執行前即拋錯時可實現 |
| 62 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 63 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 64 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 65 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 66 | expected-interprocedural | page0 | inter-procedurals/0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 67 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 68 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 69 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 70 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 71 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 72 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 73 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 74 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | + | `total: 2 -> 21` | 例外IN | FR-014 | US1：Q-a 後 L15 `addTo(1)`（fixture L14）的 exception 邊自 callNode 出發、帶呼叫前的定義（FR-014 的 IN），L2 `total`（fixture L1）經頁面 exit 與 LOOP 進入 onClick 的 log，到 L21 `console.log(total)`（fixture L20）；呼叫在 addTo 執行前即拋錯時可實現 |
| 75 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 76 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 77 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 78 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 79 | expected-fixes004 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 80 | expected-fixes004 | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 81 | expected-fixes004 | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 82 | expected-fixes004 | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 83 | expected-fixes004 | page0 | inter-procedurals/3.graph.dot | graph | ~ | `inter-procedurals/3.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 84 | expected-fixes004 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | US1：Q-a（FR-006）：呼叫敘述的 exception 邊由 callReturn 移回 callNode（呼叫前），callReturn 不再有 exception 邊；節點與其他邊不變 （亦符：共通） |
| 85 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 86 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 87 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 88 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 89 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 90 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 91 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 92 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 93 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `y: 14 -> 52` | 摘要 | FR-002、FR-003、FR-006、FR-007 | US1：L36 `new Counter().add(2)`（fixture L35）改以 add 的摘要套用：add 每條正常返回路徑都經 L23 `y = t`（mustKill `y`），L14 的 `y`（static block）在 callReturn 被殺；舊 pair 來自 add／bump 內的例外經被呼叫端 exit 的 return 邊回到 callReturn（不可實現）。非被呼叫端的例外定義，US3 不還原 （亦符：例外IN） |
| 94 | expected-fixes004 | page0 | inter-procedurals/0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 95 | expected-fixes004 | page0 | inter-procedurals/1.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 96 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 97 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 98 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 99 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 100 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 101 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 102 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 103 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 104 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `y: 14 -> 52` | 摘要 | FR-002、FR-003、FR-006、FR-007 | US1：L36 `new Counter().add(2)`（fixture L35）改以 add 的摘要套用：add 每條正常返回路徑都經 L23 `y = t`（mustKill `y`），L14 的 `y`（static block）在 callReturn 被殺；舊 pair 來自 add／bump 內的例外經被呼叫端 exit 的 return 邊回到 callReturn（不可實現）。非被呼叫端的例外定義，US3 不還原 （亦符：例外IN） |
| 105 | expected-fixes004 | page0 | inter-procedurals/3.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 106 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 107 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 108 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 109 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 110 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 111 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 112 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 113 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 114 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `y: 14 -> 52` | 摘要 | FR-002、FR-003、FR-006、FR-007 | US1：L36 `new Counter().add(2)`（fixture L35）改以 add 的摘要套用：add 每條正常返回路徑都經 L23 `y = t`（mustKill `y`），L14 的 `y`（static block）在 callReturn 被殺；舊 pair 來自 add／bump 內的例外經被呼叫端 exit 的 return 邊回到 callReturn（不可實現）。非被呼叫端的例外定義，US3 不還原 （亦符：例外IN） |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| expected | page0 | finally | L53–L59 `try`／`catch`／`finally`（parseSaved 內；fixture L52–L58） | 1 | 1 | `.graph.dot`：parseSaved 的 catch 本體拋錯改經 finally，新增 `finallyExit` 節點（#2）；pair：finally 由正常與例外進入，續行取聯集而新增 `parsed: 52 -> 60`（#37，過度近似，research R6） | 草擬，待簽核（#2、#37） |
| expected-interprocedural | inter-page | 例外IN | L15 `addTo(1)` 的 callNode 例外邊（Q-a） | 1 | 0 | Q-a：L15 `addTo(1)` 的 callNode 例外邊帶 IN（FR-014），`total: 2 -> 21` 經頁面 exit 與 LOOP 到 onClick 的 log | 草擬，待簽核（#61） |
| expected-interprocedural | page0 | 例外IN | L15 `addTo(1)` 的 callNode 例外邊（Q-a） | 1 | 0 | Q-a：L15 `addTo(1)` 的 callNode 例外邊帶 IN（FR-014），`total: 2 -> 21` 經頁面 exit 與 LOOP 到 onClick 的 log | 草擬，待簽核（#74） |
| expected-fixes004 | inter-page | 摘要 | 基準有 call 邊 | 0 | 1 | L36 `new Counter().add(2)` 套用 add 的摘要（mustKill `y`），`y: 14 -> 52` 消失（不可實現的例外經 exit 回 callReturn 路徑不再存在；US3 不還原） | 草擬，待簽核（#93） |
| expected-fixes004 | page0 | 摘要 | 基準有 call 邊 | 0 | 2 | L36 `new Counter().add(2)` 套用 add 的摘要（mustKill `y`），`y: 14 -> 52` 消失（inter-procedural 2 與 intra-page 各 1；US3 不還原） | 草擬，待簽核（#104、#114） |

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

（待 T081 填寫）

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## US2

### 變化說明

（待 T090 填寫）

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## 驗收預期更正

無
