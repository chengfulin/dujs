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
| 53 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 54 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 55 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 56 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 57 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 58 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 59 | expected-interprocedural | inter-page | 0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 60 | expected-interprocedural | page0 | inter-procedurals/0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 61 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 62 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 63 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 64 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 65 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 66 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `limit: 3 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 67 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 17 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 68 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 69 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 70 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `total: 8 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 71 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | pair | - | `value: entry -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 72 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 73 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 74 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 75 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 76 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 77 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 78 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 79 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 80 | expected-fixes004 | page0 | inter-procedurals/0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 81 | expected-fixes004 | page0 | inter-procedurals/1.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 82 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 83 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 84 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 85 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 86 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 87 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 88 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 89 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 90 | expected-fixes004 | page0 | inter-procedurals/3.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 91 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 92 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `Counter: call -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、Q-a） |
| 93 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `a: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 94 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `a: 4 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 95 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `c: 2 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 96 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `c: 27 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 97 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `q: 45 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 98 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `x: 7 -> entry` | §18 | FR-008 | US5：entry 不讀本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| expected | page0 | finally | L53–L59 `try`／`catch`／`finally`（parseSaved 內；fixture L52–L58） | 1 | 1 | `.graph.dot`：parseSaved 的 catch 本體拋錯改經 finally，新增 `finallyExit` 節點（#2）；pair：finally 由正常與例外進入，續行取聯集而新增 `parsed: 52 -> 60`（#37，過度近似，research R6） | 草擬，待簽核（#2、#37） |

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

（待 T062 填寫）

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## US3

### 變化說明

（待 T071 填寫）

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

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
