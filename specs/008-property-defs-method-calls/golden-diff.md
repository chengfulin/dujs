# Golden 差異紀錄（feature 008，FR-009、SC-003、SC-004）

基準：`2035c93`（develop；`diffcheck.js golden` 未給 `--base` 時讀此行；rebase 到新 develop 時改此行並整表重產，contracts/diff-check.md §1）

行號說明：dot 標記的行號＝fixture 行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異（相對 develop）」「段結構改變行」「重複列數」「釘選與簽核」為機器區塊（`node specs/008-property-defs-method-calls/tools/diffcheck.js golden --verify specs/008-property-defs-method-calls/golden-diff.md` 核對），
每個改 golden 的階段（US1、US2）以 `UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js` 更新 golden、手動同步 `tests/golden/manifest.json` 後，以 `--report` 重產整表（相對 `2035c93` 的累積結果）再補「說明」。
pair 以「頁 × 層級」的聯集比對（D022）；某行兩側同模型 `.graph.dot` 的段標記多重集合相同時以保留後綴的完整標記比對，不同時去後綴比對並列入「段結構改變行」（使用者逐列簽核）；重複列數另表列出、不設門檻（KI §43）。

## 分類說明

類別、觸發條件與 FR 對應見 [contracts/diff-check.md](contracts/diff-check.md) §2；損失／修正判準見同檔 §3（`tools/classify.js`），工具內的解讀寫在 `tools/diffcheck.js` 檔頭。

- **`o.m()` 歸修正是語法層判定**（FR-009）：`成員目標（修正）` 只看使用行上 `v` 的讀取路徑（`o.m()` 讀 `[m]`）與定義行的寫入路徑（`o.p = …` 寫 `[p]`）是否相同、互為前綴或含計算鍵 `*`。方法 `m` 內讀 `this.p` 的流動，選項 B 也不追；歸修正**不代表語意上沒有資料流**，只代表 008 不再把「成員目標定義物件變數」算成 `o` 的定義。
- **位置條件（T010 定案，contracts/diff-check.md §2「位置條件的 probe 驗證」）**：原條件（pair 的 def 或 use 位於被呼叫端行範圍，或 use 行 > 呼叫點行）**涵蓋不到間接呼叫**。實測證據：`tools/diffcheck.test.js` 的 (g) 以 `tools/probes/position-spill.js`（`g` 宣告於 L20、內含 `o.p = 1; o.m();`，L5 `g();`、L6 讀 `x`；外溢）與 `tools/probes/position-relax.js`（同形，`o.m()` 因 FR-004 新連結；放寬）為 fixture，把 T010 新增的分支關掉重跑，兩例 `+ x: 2 -> 6` 的類別皆為 `[]`（2 failing、1 passing：L6 不在被呼叫端 `A.m` 的 L2，也不在呼叫點 L22／L23 之後）。採用的放寬條件：pair 的 def 或 use 位於被呼叫端行範圍、use 行在該呼叫點之後，**或 use 行在某個（遞移地）呼叫「含該呼叫點之最內層函式」的呼叫點之後**（呼叫紀錄取兩側 `*.matching.json`，函式行範圍取 intra-procedural `.graph.dot`）；(g) 另有反例：pair 在 `g` 的所有呼叫點之前仍不歸。
- **模型對應與 `層級新增`（D022）**：`pair` 與 `row` 以「頁 × 層級」（`intra-procedurals`、`inter-procedurals`、`intra-pages`、inter-page）的聯集比對，不依模型檔編號逐檔比（FR-004／外溢新增模型會使編號位移，如 es2015 基準 `inter-procedurals/1` 在 008 變成 `3`）；模型的出現／消失仍以 `model` 單位記錄。只存在於 008 側模型中的 + pair，若該模型的 `model +` 已成立 `外溢`／`放寬`／`成員目標`，且相同（變數、def、use）存在於基準側同頁 `intra-pages/*.dupairs.dot`，歸「主類別（層級新增）」，說明欄註明對應基準檔（沿 007 DECISION 011）。
- **D023（implement Setup 裁決，工具首次 commit 前定案）**：
  1. **觸發行本身的改標**（併入 `外溢`／`放寬` 的位置條件，類別隨該連結）：pair 的 def 或 use 行等於觸發行 L（被呼叫端集合兩側不同的呼叫點行），L 列在該頁該層級的「段結構改變行」，且把 L 上的標記正規化為行號後，另一側有相同（變數、def 行、use 行）、方向相反的 pair 差異（純改標，如 a05 `evilBall: call (185)_a -> 199` → `evilBall: call (185)_a -> call (199)`）。找不到對應者、或改標發生在被呼叫端集合兩側相同的行，不歸。
  2. **`成員目標（摘要）`**（matching `~`，FR-003）：去掉 `summaries` 後兩側 JSON 相同、`summaries` 鍵集合相同、各函式 `normalReturn`／`conservative` 不變，且每個元素差異屬下列之一（R(f)＝基準側 f 的行範圍＋沿基準 hierarchy call 邊遞移可達的 callee 行範圍）：(1) `gen`／`exceptional` 移除 `v@n`：同模型基準 `.graph.dot` 節點 n 的行上有 v 的定義性成員目標（§3.1 嚴格版：目標物件就是 v）；(2) `mustKill` 移除 v：R(f) 內有 v 的定義性成員目標；(3) `upwardExposed` 新增 v：R(f) 內有非豁免成員目標讀到 v（同 `新增讀取` 的事實，含 `overlay.style.x = …`）；(4) `gen`／`exceptional` 新增 `v@n`：同一摘要有 (1) 的 v 移除，且 008 側同模型 `.graph.dot` 節點 n 的行有 v 的 eslint-scope write reference（非成員定義）。其他（`mustKill` 新增、`upwardExposed` 移除、旗標或其他欄位改變、鍵增減）一律不歸。說明欄列「函式.欄位 ±元素」；「釘選與簽核」另有 `成員目標（摘要）` 列，+／− 為新增／移除的元素數。以檔為單位歸 `外溢`／`放寬`（或因新增呼叫點歸 `共通`）的 matching 檔，兩側皆有的函式的元素差異也逐元素套用這四條（及下方 D024 第 5 條），任一不通過則該檔不歸這些類別（歸不進即 exit 1）；函式鍵的增減依下方 D024 處理。matching 檔判為「去除節點編號後相同」（`共通`）另須 `summaries` 把 `v@n` 換成節點 n 的標記後兩側相同。
  3. **`成員目標（列消失）`**（row −，FR-001）：基準側同頁同層級有含 v 列的模型，該列每個 def 行都有 v 的定義性成員目標（列可無 pair），該模型 `.graph.dot` 節點行集合內沒有 v 的 write reference（含宣告初值），頁面上名為 v 的宣告至多一個，且 row − v 的筆數不超過符合的基準模型數。row + 不收。
- **D024（implement Setup 裁決，工具首次 commit 前定案）**：
  1. **matching 檔配對**：摘要檢查以「頁 × 層級內 `mainScope` 相同」配對 `*.matching.json`，不依檔案編號（a05 `inter-procedurals`：基準 `1`（mainScope `$PAGE_0`）對 008 `2`、基準 `2` 對 008 `3`，008 `1` 是 `loop` 的新模型）。編號不同的配對記為一筆 matching `~`，內容欄寫「`<基準檔> → <008 檔>`」、檔案欄寫 008 檔；沒有對應的檔照 model ± 處理（matching `+`／`−`）。某側 mainScope 不唯一（或缺）即失敗（exit 1）。配對後，只在基準側的函式鍵不收；只在 008 側的鍵須 ∈ N（下條，兩側皆有之某函式 f 的 N(f)），說明欄列「新鍵（新連結）…」，否則不收。
  2. **第 5 條**（僅用於整檔已因 `放寬`／`外溢` 觸發行成立的 matching 檔）：N(f)＝reach₀₀₈(f) − reach_基準(f)（沿兩側 hierarchy call 邊的 scope 集合，排除 f 自身與基準側已可達者；008 側新增的邊須有觸發行在其呼叫端（該行的最內層函式）新增該 callee 才算）。`gen`／`exceptional` 新增 `v@n` 須 (i) n（008 側同模型 `.graph.dot`）所在行的**最內層函式** ∈ N(f)（不用「行範圍包含」）、(ii) 該行有 v 的 eslint-scope write reference（非成員定義）、(iii) 同檔 008 側某 g∈N(f) 摘要的同一欄位含同一個 `v@n`；`upwardExposed` 新增 v 須 N(f) 的最內層行上有 v 的讀取 reference、解析到該 callee 之外（或全域、未解析），且 v ∈ 某 g∈N(f) 的 008 側 `upwardExposed`。元素移除、`mustKill` 增減、旗標翻轉不屬第 5 條。說明欄在元素後標「（新連結 g）」；`外溢`／`放寬` 的 matching `~` 在「釘選與簽核」該類別列的 +／− 計入其摘要元素的新增／移除數（含 (1)–(4)），`--verify` 核對。實例：a05 inter-page `0`、`intra-pages/0` 與 `inter-procedurals` 基準 `1` → 008 `2` 的 `loop.gen`／`exceptional +count@n…（新連結 $ANONYMOUS_FUN_9）`、`loop.upwardExposed +Math（新連結 $ANONYMOUS_FUN_7）`、`+count`、`+para`（新連結 `$ANONYMOUS_FUN_9`）；`ctx` 的四項仍走 (1)(2)(3)。
  3. **共通的摘要標記**：matching 檔歸「去除節點編號後相同」時，摘要的 `v@n` 換成節點標記後兩側也須相同（標記不同的 `-x@n4 +x@n3` 不歸 `共通`，純重編號歸）；`.graph.dot` 缺檔時退回用原節點編號比對。
  4. 自我測試：`tools/diffcheck.test.js` 的 (i) D024，正例（a05 型 inter-page／intra-pages、inter-procedurals 配對）與反例 1–11 各一個 `it`（另有 mainScope 不唯一的失敗例）。
- **D025（implement US2 T056 裁決，使用者同意修改 008 diffcheck，僅限本項）**：摘要逐元素比對（D023 (b)、D024 第 5 條）之前，先以同模型 `.graph.dot` 把兩側 `gen`／`exceptional` 的 `v@n` 換成節點 n 的標記，換完兩側都有的元素不算差異（純重編號，如 es2015 inter-page `init.gen −nextId@n144 +nextId@n146`，兩側標記皆 `31`）；`.graph.dot` 缺檔或無該節點時沿用原節點編號（偏嚴）；其他判準不變。自我測試：`tools/diffcheck.test.js` 的 (j) D025，正例 12（純重編號）與反例 13（標記不同的 `-nextId@n4 +nextId@n5` 仍逐元素檢查而不收；無 `.graph.dot` 時不收）。
- 一筆差異只記一個類別（多類成立時說明欄列「亦符」）。`成員目標`（修正／新增讀取／不再殺除／列消失／層級新增）、`成員目標（摘要）`、`屬性寫入→讀取損失`、`外溢`、`放寬` 與 KI 類（`§37`、`§38`、`§41`、`§43`）為釘選類別：「釘選與簽核」表的「說明」欄必填，簽核欄 implementer 只填「草擬，待簽核」；`共通` 為機械判定，不釘選。`無法到達` 無自動觸發，預期 0 筆。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected-es2015 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 2 | expected-es2015 | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 3 | expected-es2015 | page0 | inter-procedurals/1.hierarchy.dot | graph | ~ | `inter-procedurals/1.hierarchy.dot` | 放寬 | FR-004 | 亦符：共通 |
| 4 | expected-es2015 | page0 | inter-procedurals/2.dupairs.dot | model | + | `inter-procedurals/2.dupairs.dot` | 放寬 | FR-004 |  |
| 5 | expected-es2015 | page0 | inter-procedurals/2.graph.dot | graph | + | `inter-procedurals/2.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 6 | expected-es2015 | page0 | inter-procedurals/2.hierarchy.dot | graph | + | `inter-procedurals/2.hierarchy.dot` | 放寬 | FR-004 | 亦符：共通 |
| 7 | expected-es2015 | page0 | inter-procedurals/3.dupairs.dot | model | + | `inter-procedurals/3.dupairs.dot` | 放寬 | FR-004 |  |
| 8 | expected-es2015 | page0 | inter-procedurals/3.graph.dot | graph | + | `inter-procedurals/3.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 9 | expected-es2015 | page0 | inter-procedurals/3.hierarchy.dot | graph | + | `inter-procedurals/3.hierarchy.dot` | 放寬 | FR-004 | 亦符：共通 |
| 10 | expected-es2015 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 11 | expected-es2015 | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 放寬 | FR-004 | 亦符：共通；摘要 $ANONYMOUS_FUN_3.gen −state@n156、$ANONYMOUS_FUN_3.exceptional −state@n156、$ANONYMOUS_FUN_4.gen −state@n156、$ANONYMOUS_FUN_4.exceptional −state@n156、init.gen −state@n145、init.exceptional −state@n145、init.upwardExposed +state；新鍵（新連結）$ANONYMOUS_FUN_1 |
| 12 | expected-es2015 | page0 | inter-procedurals/1.matching.json | matching | + | `inter-procedurals/1.matching.json` | 放寬 | FR-004 | 亦符：共通 |
| 13 | expected-es2015 | page0 | inter-procedurals/2.matching.json | matching | + | `inter-procedurals/2.matching.json` | 放寬 | FR-004 | 亦符：共通 |
| 14 | expected-es2015 | page0 | inter-procedurals/3.matching.json | matching | ~ | `inter-procedurals/1.matching.json → inter-procedurals/3.matching.json` | 放寬 | FR-004 | 亦符：共通；摘要 $ANONYMOUS_FUN_3.gen −state@n122、$ANONYMOUS_FUN_3.exceptional −state@n122；新鍵（新連結）$ANONYMOUS_FUN_1 |
| 15 | expected-es2015 | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 放寬 | FR-004 | 亦符：共通；摘要 $ANONYMOUS_FUN_3.gen −state@n59、$ANONYMOUS_FUN_3.exceptional −state@n59、$ANONYMOUS_FUN_4.gen −state@n59、$ANONYMOUS_FUN_4.exceptional −state@n59、init.gen −state@n48、init.exceptional −state@n48、init.upwardExposed +state；新鍵（新連結）$ANONYMOUS_FUN_1 |
| 16 | expected-es2015 | inter-page | *.dupairs.dot | row | + | `todos` | 放寬 | FR-004 |  |
| 17 | expected-es2015 | inter-page | *.dupairs.dot | row | + | `visible` | 放寬 | FR-004 |  |
| 18 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 19 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `list: call (17) -> 25` | 放寬 | FR-004 |  |
| 20 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `list: call (17) -> 34` | 放寬 | FR-004 |  |
| 21 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `list: call (17) -> call (25)` | 放寬 | FR-004 |  |
| 22 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `list: call (17) -> call (34)` | 放寬 | FR-004 |  |
| 23 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 23 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 24 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 25 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 26 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 33 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 27 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos]；亦符：放寬 |
| 28 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> 24` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 29 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> 33` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 30 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> call (25)` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取（L25／L34 因 FR-004 連結 `render` 改為呼叫節點，標記為 `call (…)`） |
| 31 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> call (34)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬；不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取（L25／L34 因 FR-004 連結 `render` 改為呼叫節點，標記為 `call (…)`） |
| 32 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `todos: entry -> 12` | 放寬 | FR-004 | 亦符：§43 |
| 33 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `visible: 12 -> 13` | 放寬 | FR-004 | 亦符：§43 |
| 34 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `id` | 放寬 | FR-004 |  |
| 35 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `saved` | 放寬 | FR-004 |  |
| 36 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `todos` | 放寬 | FR-004 |  |
| 37 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `visible` | 放寬 | FR-004 |  |
| 38 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `id: 30 -> 31` | 放寬 | FR-004 | 亦符：放寬（層級新增）；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 39 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 40 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `nextId: 31 -> 31` | 放寬 | FR-004 | 亦符：放寬（層級新增）；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 41 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `saved: 29 -> (30,30)` | 放寬 | FR-004 | 亦符：放寬（層級新增）；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 42 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `saved: 29 -> 33` | 放寬 | FR-004 | 亦符：放寬（層級新增）；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 43 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 44 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 45 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `todos: entry -> 12` | 放寬 | FR-004 | 亦符：§43 |
| 46 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `visible: 12 -> 13` | 放寬 | FR-004 | 亦符：§43 |
| 47 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | row | + | `todos` | 放寬 | FR-004 |  |
| 48 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | row | + | `visible` | 放寬 | FR-004 |  |
| 49 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 50 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `list: call (17) -> 25` | 放寬 | FR-004 |  |
| 51 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `list: call (17) -> 34` | 放寬 | FR-004 |  |
| 52 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `list: call (17) -> call (25)` | 放寬 | FR-004 |  |
| 53 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `list: call (17) -> call (34)` | 放寬 | FR-004 |  |
| 54 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 23 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 55 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 56 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 57 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 33 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 58 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos]；亦符：放寬 |
| 59 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> 24` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 60 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> 33` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 61 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> call (25)` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取（L25／L34 因 FR-004 連結 `render` 改為呼叫節點，標記為 `call (…)`） |
| 62 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> call (34)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬；不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取（L25／L34 因 FR-004 連結 `render` 改為呼叫節點，標記為 `call (…)`） |
| 63 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `todos: entry -> 12` | 放寬 | FR-004 | 亦符：§43 |
| 64 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `visible: 12 -> 13` | 放寬 | FR-004 | 亦符：§43 |
| 65 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 66 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 67 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 68 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | - | `state: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos]；亦符：放寬 |

## 段結構改變行

| case | 頁 | 模型檔 | 行 | 基準段標記數 | 008 段標記數 | 簽核 |
|------|----|--------|----|--------------|--------------|------|
| expected-es2015 | inter-page | *.graph.dot | 12 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | inter-page | *.graph.dot | 13 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | inter-page | *.graph.dot | 25 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | inter-page | *.graph.dot | 34 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | inter-page | *.graph.dot | entry | 5 | 6 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | 12 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | 13 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | 25 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | 29 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | 30 | 0 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | 31 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | 33 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | inter-procedurals/*.graph.dot | entry | 2 | 3 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | intra-pages/*.graph.dot | 12 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | intra-pages/*.graph.dot | 13 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | intra-pages/*.graph.dot | 25 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | intra-pages/*.graph.dot | 34 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| expected-es2015 | page0 | intra-pages/*.graph.dot | entry | 5 | 6 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 008 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| expected | inter-page | 0.dupairs.dot | 26 | 26 | 0 |
| expected | page0 | inter-procedurals/0.dupairs.dot | 4 | 4 | 0 |
| expected | page0 | inter-procedurals/1.dupairs.dot | 4 | 4 | 0 |
| expected | page0 | inter-procedurals/2.dupairs.dot | 4 | 4 | 0 |
| expected | page0 | intra-pages/0.dupairs.dot | 26 | 26 | 0 |
| expected | page0 | intra-procedurals/2.dupairs.dot | 4 | 4 | 0 |
| expected-es2015 | inter-page | 0.dupairs.dot | 1 | 3 | +2 |
| expected-es2015 | page0 | inter-procedurals/2.dupairs.dot | 0 | 1 | +1 |
| expected-es2015 | page0 | intra-pages/0.dupairs.dot | 1 | 3 | +2 |
| expected-es2015 | page0 | intra-procedurals/5.dupairs.dot | 1 | 1 | 0 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| expected-es2015 | inter-page | 放寬 | L25 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1；L34 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1 | 7 | 8 | L25 `list.render(state.todos)`（`addTodo`，$ANONYMOUS_FUN_3）與 L34（`init`）在函式內呼叫頂層 `const list = new TodoList(…)` 的方法，FR-004 放寬後連到 `TodoList` 的 `render`（$ANONYMOUS_FUN_1）。+：`render` 內 `todos: entry -> 12`、`visible: 12 -> 13` 與其兩列（#16、#17、#32、#33），`list: call (17) -> call (25)`／`call (34)`（#21、#22，use 端改為呼叫節點），#11 摘要 `init.upwardExposed +state`；−：`list: call (17) -> 25`／`34`（#19、#20，與 #21、#22 為同一 pair 改標），#11 摘要 gen／exceptional −`state@n` 6 筆（L23／L33 成員目標，即 US1 的摘要差異；本檔因新連結多出 `$ANONYMOUS_FUN_1` 鍵，改隨檔歸放寬）；`init.gen −nextId@n144 +nextId@n146` 為純重編號（兩側標記皆 31，D025 不計） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#1、#11、#16、#17、#19、#20、#21、#22、#32、#33） |
| expected-es2015 | page0 | 放寬 | L25 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1；L34 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1 | 25 | 10 | 同 inter-page 的觸發（L25、L34 → `render`）。新模型 `inter-procedurals/2`（`init` → `render`）與 `3`（$ANONYMOUS_FUN_4 → `addTodo` → `render`；基準 `1` 依 mainScope 配對到此，#14）共 8 檔（#4–#9、#13、#14）；008 的 `1` 改以 `addTodo`（$ANONYMOUS_FUN_3）為 mainScope（`addTodo` → `render`），#2、#3 改變、其 matching 無基準對應（#12）；inter-procedurals 新增 `id`、`saved`、`todos`、`visible` 四列與 6 筆 pair（#38、#40–#42 為 `init` 模型內的 pair，相同（變數、def、use）見於基準 intra-pages/0，亦符層級新增，D022）；intra-pages 同 inter-page（#47、#48、#50–#53、#63、#64）；摘要 #14 −2（$ANONYMOUS_FUN_3 的 `state@n122`）、#15 +1／−6（同 inter-page #11） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#2、#3、#4、#5、#6、#7、#8、#9、#10、#12、#13、#14、#15、#34、#35、#36、#37、#38、#40、#41、#42、#45、#46、#47、#48、#50、#51、#52、#53、#63、#64） |
| expected-es2015 | inter-page | 成員目標 | 定義性成員目標 input L41；state L23、L33 | 5 | 0 | L41 `input.value = ''` 改為讀取 `input`（+`input: 39 -> 41`）；L23、L33 的 `state.todos = …` 不再殺除 `state`，L4 的 `const state` 到達 L24、L25、L34，L33 本身成為 `state` 的讀取（+`state: 4 -> 33`）；L25、L34 在 US2 成為 `render` 的呼叫節點，pair 標記改為 `call (25)`／`call (34)`（取代 US1 的 `4 -> 25`／`4 -> 34`） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#18、#28、#29、#30、#31） |
| expected-es2015 | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 input L41；state L23、L33 | 0 | 5 | L23、L33 的 `state.todos = …` 原為 `state` 的定義，到達 L23（下一次呼叫 `addTodo` 時）、L24、L25、L34 對 `state.todos` 的讀取；008 不追屬性，這些 pair 消失（讀取路徑 [todos] 與寫入路徑 [todos] 相同，語意上確有資料流，D001 接受的損失）；與 US1 相同 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#23、#24、#25、#26、#27） |
| expected-es2015 | page0 | 成員目標 | 定義性成員目標 input L41；state L23、L33 | 7 | 0 | 同 inter-page：intra-pages 4 筆 `state: 4 -> …`（含 `call (25)`、`call (34)`）與 `input: 39 -> 41`；inter-procedurals、intra-procedurals 只有 `input: 39 -> 41`（`addTodo`／`init` 的單函式模型無 L4 的定義可到達）；與 US1 相同 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#39、#49、#59、#60、#61、#62、#65） |
| expected-es2015 | page0 | 屬性寫入→讀取損失 | 定義性成員目標 input L41；state L23、L33 | 0 | 10 | 同 inter-page：intra-pages 5 筆；inter-procedurals `state: 23 -> 24`、`23 -> 25`（`addTodo`）；intra-procedurals `23 -> 24`、`23 -> 25`（`addTodo`）與 `33 -> 34`（`init`）；與 US1 相同 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#43、#44、#54、#55、#56、#57、#58、#66、#67、#68） |


### 簽核備註（D026，主對話＋Fable 裁判獨立核對）

- #18、#39、#49、#65（`input: 39 -> 41`）的「亦符：放寬」是位置條件過度涵蓋，與 FR-004 無關；主類別「成員目標（新增讀取）」正確。工具判準過寬記於 `docs/known-issues.md` §52。
- 歸「成員目標（修正）」者屬 FR-009 已聲明的語法層判定（見「分類說明」）。

## 可到達性允許清單

golden 的允許清單項（FR-008）逐項列於此，與 `tests/dujs/cases/reachability-allowlist.json` 相同（T061 填入；`--verify` 不核對本節）。

無（golden 沒有允許清單項）。

查核方式（T061，US1／US2 後的最終行為）：`npx mocha tests/dujs/reachabilityinvariant.js` 通過——probes008（含 `pages/`）、golden fixture（`tests/golden/golden.js` 的各 goldenCase 頁面）與 MDN 語料的每個模型以檢查器 (a)(b)(c) 全開執行 `check`，再以 `assertInvariant` 對照允許清單：允許清單外 0 違反、0 過期，每項通過差分判準（關掉 (c) 後兩端皆可達）且 `witness` 與當次輸出逐字相同。允許清單共 18 項，`program` 全為 `probes008/p21-finally.js`、`probes008/p23-finally-summary.js`、`probes008/p24-finally-throw.js`（各 6 項：inter-procedural、intra-page、inter-page 各 2 個 pair），沒有 `golden/…` 項；golden 的模型全開無違反。PRB 項的見證寫入 KI §38（T066），MDN 項（目前亦無）由 T063 寫入 `mdn-diff.md`。

## Setup

### 變化說明

lib 與 `2035c93` 相同（`git diff --quiet 2035c93 -- lib` 為 0），golden 未更新；`diffcheck golden --verify` 零差異、段結構改變行 0 列，重複列數兩側相同。本節同時是 008 工具（`tools/classify.js`、`tools/diffcheck.js` 與其自我測試）的首次 commit 點（T011）；之後修改 `tools/` 一律先發 DECISION。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| （全部） | （無） | 不變 | Setup 不改 golden |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| （無） |  |  |  |  |

## Foundational

### 變化說明

#### T025：全量不變量先報紅（FR-013 修正前）

`npx mocha tests/dujs/reachabilityinvariant.js`（probes008 56 個程式、golden 4 個 case（頁面組合同 `tests/golden/golden.js`）、MDN 32 個 id，共 92 個程式、569 個模型）在暫行允許清單 `tests/dujs/cases/reachability-allowlist.json` 下為紅：`1 failing`，`Reachability invariant (contracts/reachability.md §5): 18 failure(s)`，全部為「violation not in the allowlist」，無過期項、無見證不符。

- 允許清單 18 項：P21、P23、P24 各 6 項（inter-procedural、intra-page、inter-page 三個模型 × 兩個 pair：P21／P24 `x: L1 -> L11`、`console: entry -> L11`；P23 `x: L11 -> L14`、`console: entry -> L14`），全部全開違反且關掉 (c) 後兩端皆可達（`eligible`），`witness` 取自檢查器當次輸出（P21／P24 `[{"scope":"$DOMAIN.$PAGE_0","line":10,"nonExceptionalEntries":0}]`，P23 `[{"scope":"$DOMAIN.$PAGE_0.g","line":10,"nonExceptionalEntries":0}]`），`note` 註明 KI §38 形態。golden 與 MDN 沒有任何違反（無 finallyExit 根因項）。
- 允許清單外 18 項，恰為 P38–P40 決策節點的 deferred p-use pair（關掉 (c) 仍違反，不符允許清單資格；FR-013 修正）：

| 程式 | 模型 | pair | 不可到達端 |
|------|------|------|------------|
| probes008/p38-if-norecall.js | inter-procedural[1]、intra-page[0]、inter-page | `f: entry -> L5>L6:T`、`f: entry -> L5>L8:F` | decision、target |
| probes008/p39-if-nested-norecall.js | inter-procedural[1]、intra-page[0]、inter-page | `g: entry -> L8>L9:T`、`g: entry -> L8>L11:F` | decision、target |
| probes008/p40-while-norecall.js | inter-procedural[1]、intra-page[0]、inter-page | `f: entry -> L5>L6:T`、`f: entry -> L5>L8:F` | decision、target |

inter-page 模型含頁面的全部節點，同一組 pair 亦在其中報出（tasks T025 字面只列 inter-procedural 與 intra-page；允許清單依實測收錄 inter-page 的 P21、P23、P24 項）。除上列外，沒有其他關掉 (c) 仍違反的項目。

#### T027：FR-013 修正後轉綠

`lib/dujs/defuseanalyzer.js` 的 `findDUPairs` 第二段略過不可到達的 owner（`analysisResultOf(owner) === null`）後，全量不變量允許清單外 0 違反、0 過期（上表 18 項含 inter-page 皆消失）；golden、MDN 0 筆差異；`probes/run.js` 相對 baseline 只有 P38–P40 的 inter[1]／intra-page 行各少兩筆 p-use pair。

## US1

### 變化說明

- **T047 golden**：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js` 只改 `expected-es2015` 的 9 檔（`inter-page/0`、`page0/intra-pages/0` 的 `.dupairs.dot` 與 `.matching.json`，`page0/inter-procedurals/1` 的 `.dupairs.dot` 與 `.matching.json`，`page0/intra-procedurals/4`、`5`、`6` 的 `.dupairs.dot`）；`expected`、`expected-interprocedural`、`expected-fixes004` 不變，`.graph.dot`／`.hierarchy.dot` 皆不變，檔案集合不變（`manifest.json` 的 `added` 不增刪）。`diffcheck.js golden --report` 相對 `2035c93` 共 30 筆，全部在 `tests/golden/fixtures/es2015/app.js`，觸發點只有三行（dot 行號＝fixture 行號＋1）：
  - L23 `state.todos = [...state.todos, …]`（`addTodo`）與 L33 `state.todos = saved`（`init`）不再定義 `state`：`屬性寫入→讀取損失` 15 筆（inter-page 5、page0 10：自 L23／L33 出發到 L23、L24、L25、L34 讀 `state.todos` 的 pair 消失；讀寫路徑皆為 `[todos]`，語意上有資料流，D001 接受）；`成員目標（不再殺除）` 6 筆（L4 `const state` 越過 L23／L33 到達 L24、L25、L34，只在 inter-page 與 intra-pages）；`成員目標（新增讀取）` 2 筆（`state: 4 -> 33`，L33 本身讀 `state`）；`成員目標（摘要）` 3 筆 matching `~`（gen／exceptional 移除 `state@n`，`init.upwardExposed +state`）。
  - L41 `input.value = ''` 不再定義 `input`、改為讀取：`成員目標（新增讀取）` 4 筆 `input: 39 -> 41`（inter-page、inter-procedurals、intra-pages、intra-procedurals 各 1）。
  - 類別分布：`成員目標（新增讀取）` 6、`成員目標（不再殺除）` 6、`成員目標（摘要）` 3、`屬性寫入→讀取損失` 15；`成員目標（修正）`、`成員目標（列消失）`、`外溢` 為 0（`app.js` 沒有 `o.p = …; o.m()` 形態，也沒有因 US1 新增的呼叫連結）；無歸不進類別者、無 `無法到達`。
  - 段結構改變行 0 列（無列需簽核）；重複列數兩側相同。`--verify` exit 0。
- **MDN（只檢查，不寫 mdn-diff）**：`diffcheck.js mdn --report` exit 0，428 筆，全部歸類：`成員目標（新增讀取）` 185、`屬性寫入→讀取損失` 78、`成員目標（不再殺除）` 69、`成員目標（修正）` 54、`成員目標（摘要）` 35、`成員目標（列消失）` 7；段結構改變行 0 列；32 個 id 的 CLI exit code 兩側皆 0。

- **T044 實際修改的既有測試**（以 `npm test` 失敗清單為準，與 Fable 原型實測的 5 處相同，無清單外失敗）：`tests/dujs/callsplit.js`、`tests/dujs/globals.js`、`tests/dujs/methodcalls.js`、`tests/dujs/scopeguards.js`（期望資料在 `tests/dujs/cases/probes006/developpairs.json` 的 `op.js`）、`tests/dujs/splitcallnodes.js`。皆為「成員賦值定義物件變數」的舊行為；`callsplit.js` 的失敗是 `segmentOfVarDef(undefined)` 拋「no AST completing the definition」（`a[i] = f()` 不再定義 `a`），不是「no evaluation position」，未觸發 DECISION。
- **T045 probes**：`probes/pages/` s1–s9 與 `probes/pages/baseline-develop.txt` 逐行相同；s10–s14 的儲存定義節點數與 s13、s14 的 `inter-page localStorage` 行不變。`probes/run.js` 相對 Foundational（HEAD）有變的只有 P1–P4、P9、P10、P12、P25、P27、P29–P33、P37、P42；US2 守門 probes（P6、P7、P11、P26、P28、P35、P36）與 P38–P40 不變；P10 只新增 `F: entry -> L3`（D018）。輸出與 Fable 原型 US1 實跑（`probes-us1.txt`）逐行相同。
- **T046 全量不變量**：允許清單外 0 違反、0 過期；`tests/dujs/cases/reachability-allowlist.json` 不變（US1 沒有新增或消除 finallyExit 根因的 pair）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

`manifest.json` 的 `baseline` 手動重算寫回（UPDATE_GOLDEN 不寫 manifest）；`added` 檔名不增刪（`page0/inter-procedurals/1.dupairs.dot` 與三個 `.matching.json` 屬 `added`，不記雜湊）。

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-es2015 | inter-page/0.dupairs.dot | `9d5aa27d6be3` → `cc3dd31f7778` | `state` 列：−23→23、23→24、23→25、33→23、33→34，+4→24、4→25、4→33、4→34；`input` 列 +39→41 |
| expected-es2015 | page0/intra-pages/0.dupairs.dot | `9d5aa27d6be3` → `cc3dd31f7778` | 同 inter-page（單頁，兩檔內容相同） |
| expected-es2015 | page0/intra-procedurals/4.dupairs.dot | `aa0b6c7fb261` → `0dcd53f7bfe2` | `addTodo`：`state` 列（23→24、23→25）消失 |
| expected-es2015 | page0/intra-procedurals/5.dupairs.dot | `1592472c32bd` → `502f5cc8258d` | `init`：`state` 列（33→34）消失 |
| expected-es2015 | page0/intra-procedurals/6.dupairs.dot | `5c180512507b` → `4ab6953479de` | click handler：`input` 列 +39→41 |
| 其他 case／檔案 | （全部） | 不變 |  |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| tests/dujs/callsplit.js | should evaluate the object and the property of a[i] = f() before f() | `segmentOfVarDef(defsOf('a')[0])` 為 1（`a[i] = f()` 定義 `a`） | `defsOf('a')` 為 `[]`；`a` 的讀取在段 0 | FR-001、FR-002 |
| tests/dujs/globals.js | should define the undeclared names written by for-in, ++ and G.p = v (plan-u4) → 更名 …and read G of G.p = v (plan-u4) | 含 `Math: L7 -> L8`、`location: L9 -> L10` | 含 `Math: entry -> L7`、`Math: entry -> L8`、`location: entry -> L9`、`location: entry -> L10`；不含前兩者 | FR-001、FR-002 |
| tests/dujs/methodcalls.js | should not resolve o.m() after a property assignment o.p = 1 → 更名 should resolve o.m() after a property assignment o.p = 1 to m | callee `[]` | callee `[$ANONYMOUS_FUN_0]`（`A` 的 `m`，US1-1／P1） | FR-001 |
| tests/dujs/cases/probes006/developpairs.json（tests/dujs/scopeguards.js：should give the pairs of develop for op.js） | op.js 的 intraPage、interProcedural[0] | `o: L7 -> L8` | `o: L6 -> L7`、`o: L6 -> L8` | FR-001、FR-002 |
| tests/dujs/splitcallnodes.js | should not connect g() of for (o[g()] of a) {} (as develop) → 去掉「(as develop)」 | 含 `o: L9 -> L9`；無 `g` 的 pair | 無 `o: L9 -> L9`；新增 `g: entry -> L9>L10:F`、`g: entry -> L9>L9:T`（鍵 `g()` 在迴圈節點讀取，同 `for (var [z = g()] of a)`）；仍無 call 邊 | FR-001、FR-002 |
| tests/dujs/propertydefs.js | US1-16 should give the localStorage pairs of P42 of the actual run (characterization) | 佔位 `[]`（Fable 原型值，TODO(T045)） | 實跑值 `[]`：intra、inter、intraPage 皆無 `localStorage` 的 pair | FR-002（D013） |

## US2

### 變化說明

T048–T055 已完成（`lib/dujs/callresolver.js`：`classOfInstance` 沒有到達的定義時改由私有 `relaxedClassOfInstance` 判定，FR-004、R7）；T056 重產 golden 與機器區塊（相對 `2035c93` 的累積淨差異）。

- **T056 golden**：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js` 只改 `expected-es2015`：修改 10 檔（`inter-page/0` 的 `.dupairs.dot`、`.graph.dot`、`.matching.json`，`page0/intra-pages/0` 的 `.dupairs.dot`、`.graph.dot`、`.matching.json`，`page0/inter-procedurals/1` 的 `.dupairs.dot`、`.graph.dot`、`.hierarchy.dot`、`.matching.json`），新增 8 檔（`page0/inter-procedurals/2.*`、`3.*`）；`expected`、`expected-interprocedural`、`expected-fixes004` 不變，intra-procedural 模型不變。`diffcheck.js golden --report` 相對 `2035c93` 共 68 筆，全部歸類（0 筆歸不進類別、無 `無法到達`），`--verify` exit 0。
- **新類別 `放寬`（FR-004）**：觸發只有兩行（dot 行號＝fixture 行號＋1）——L25 `list.render(state.todos)`（`addTodo`，$ANONYMOUS_FUN_3）與 L34 `list.render(state.todos)`（`init`）。兩處都在函式內呼叫頂層 `const list = new TodoList(…)` 的方法，函式內沒有 `list` 的到達定義；FR-004 放寬後連到 `TodoList` 的 `render`（$ANONYMOUS_FUN_1，不含 constructor）。帶出：
  - `render` 內的 `todos: entry -> 12`、`visible: 12 -> 13` 與兩列（inter-page、page0 inter-procedurals／intra-pages；亦符 §43：`render` 自兩個呼叫點被呼叫，重複列數 inter-page、intra-pages 各 +2、inter-procedurals/2 +1）；
  - L25、L34 變成呼叫節點，`list: call (17) -> 25`／`34` 改標為 `call (25)`／`call (34)`（−2／+2，同一 pair 的改標，D023 (a)），`state: 4 -> 25`／`34`（US1 的不再殺除）同樣改為 `state: 4 -> call (25)`／`call (34)`；
  - 新模型 `inter-procedurals/2`（`init` → `render`）與 `3`（$ANONYMOUS_FUN_4 → `addTodo` → `render`，基準 `inter-procedurals/1` 依 mainScope 配對到此，D024）共 8 檔；008 的 `inter-procedurals/1` 改以 `addTodo` 為 mainScope（`addTodo` → `render`），其 `.graph.dot`、`.hierarchy.dot` 改變、`.matching.json` 無基準對應（matching +）；
  - 新模型中 `init` 的 `id: 30 -> 31`、`nextId: 31 -> 31`、`saved: 29 -> (30,30)`、`saved: 29 -> 33` 及 `id`、`saved` 兩列：主類別 `放寬`，相同（變數、def、use）見於基準 `page0/intra-pages/0.dupairs.dot`，`放寬（層級新增）` 列於「亦符」（D022 裁決：新模型 pair 主類別為 `放寬`，`層級新增` 為亦符）；
  - graph／matching 檔 `~`／`+` 皆歸 `放寬`（亦符 `共通`：新增呼叫點）。
- **US1 的摘要 matching `~` 改歸 `放寬`**：US1 的 3 筆 `成員目標（摘要）`（inter-page `0`、page0 `intra-pages/0` 與 `inter-procedurals/1`）在 US2 因新連結多出 `$ANONYMOUS_FUN_1`（`render`）的摘要鍵，`summaries` 鍵集合兩側不同，`成員目標（摘要）` 的「鍵集合相同」條件不再成立；該檔已因 L25／L34 觸發行成立 `放寬`，新鍵 ∈ N(f)（記「新鍵（新連結）$ANONYMOUS_FUN_1」），其餘元素差異（gen／exceptional −`state@n`、`init.upwardExposed +state`）仍逐元素通過 D023 (b) 的 (1)–(3)，故整檔改歸 `放寬`，元素數計入 `放寬` 釘選列（inter-page +1／−6；page0 +1／−8），「釘選與簽核」不再有 `成員目標（摘要）` 列。基準 `inter-procedurals/1`（mainScope $ANONYMOUS_FUN_4）改與 008 `3` 配對（matching `~` `inter-procedurals/1.matching.json → inter-procedurals/3.matching.json`）。
- **D025**：inter-page `0.matching.json` 的 `init.gen`／`exceptional −nextId@n144 +nextId@n146` 是 `render` 節點插入造成的純重編號（兩側節點標記皆 `31`）；D025 前逐元素比對判為失敗（(4) 需同摘要有 `nextId` 的成員目標移除），整檔歸不進類別（exit 1）。D025 改為先以同模型 `.graph.dot` 換成節點標記再比對，此元素不算差異，該檔歸 `放寬`。
- **類別分布**（68 筆）：`放寬` 41（inter-page 10、page0 31；pair +／− 14／4、row + 8、model + 2、graph ~／+ 8、matching ~／+ 5）、`屬性寫入→讀取損失` 15、`成員目標（不再殺除）` 6、`成員目標（新增讀取）` 6；`成員目標（修正）`、`成員目標（摘要）`、`成員目標（列消失）`、`外溢` 0。釘選：`放寬` inter-page +7／−8、page0 +25／−10；`成員目標` inter-page +5、page0 +7；`屬性寫入→讀取損失` inter-page −5、page0 −10（後兩類筆數同 US1）。
- **段結構改變行** 18 列（inter-page、page0 intra-pages 各 5 列：L12、L13、L25、L34、entry；page0 inter-procedurals 8 列：L12、L13、L25、L29、L30、L31、L33、entry），皆為 `render` 連結帶出的新段（L12、L13 為 `render` 本身、L25／L34 為呼叫點、entry 多一段；inter-procedurals 的 L29–L33 為新模型 `2` 中的 `init`），逐列已簽核（2026-11-18，主對話＋Fable 裁判，依使用者授權）。
- **MDN（只檢查，不寫 mdn-diff）**：`diffcheck.js mdn --report` exit 0，547 筆，0 筆歸不進類別：`成員目標（新增讀取）` 197、`成員目標（不再殺除）` 96、`放寬` 83、`屬性寫入→讀取損失` 78、`成員目標（修正）` 54、`成員目標（摘要）` 32、`成員目標（列消失）` 7；段結構改變行 74 列。`mdn --verify specs/008-property-defs-method-calls/mdn-diff.md` exit 1（mdn-diff 機器區塊仍為 Setup 的 develop 等價記錄，lib 已改；於 T063 重產）。

- **T053 實際修改的既有測試**（以 `npm test` 失敗清單為準）：**無**。`relaxedClassOfInstance` 接線後 `npm test` 的失敗只有 `tests/golden/golden.js` 的 4 項（`expected-es2015`，留給 T056）；預檢的 `tests/dujs/methodcalls.js`「should not resolve o.m() without a reaching definition of o」（`var o`，D002 不放寬）期望不變。US2 只新增測試：`tests/dujs/propertydefs.js`（T048、T049）、`tests/dujs/relaxedcallee.js` 與 `tests/dujs/methodcalls.js`（T050）、`tests/dujs/matching.js`（T051）。
- **T054 probes**：`probes/run.js` 相對 US1 有變的只有 P5、P8、P9、P34（連結 `A` 的 `m`，`x: L4 -> L12`／`L13`）；P6、P7、P11、P26、P28、P35、P36 與 `probes/baseline-develop.txt` 相同；P10 仍只多 `F: entry -> L3`（D018）；P36 保留 `f: L3 -> L7`（D010）；US1 各 probe 與 P38–P40 不變。`probes/run-pages.js` 的 s10 `inter-page (all)` 有 `x: L3 -> L13`、沒有 `x: L6 -> L13`（第一頁 intra-page 同，由 `tests/dujs/propertydefs.js` 讀模型斷言；D021）；s1–s9 與 `probes/pages/baseline-develop.txt` 相同。兩者輸出與 Fable 原型實跑（`probes-proto.txt`、`pages-proto.txt`）逐行相同。
- **T055 全量不變量**：允許清單外 0 違反、0 過期；`tests/dujs/cases/reachability-allowlist.json` 不變（US2 沒有新增或消除 finallyExit 根因的 pair）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

`manifest.json` 的 `baseline` 手動重算寫回（舊＝US1 commit 時的值）；`added` 新增 8 個檔名 `page0/inter-procedurals/2.dupairs.dot`、`2.graph.dot`、`2.hierarchy.dot`、`2.matching.json`、`3.dupairs.dot`、`3.graph.dot`、`3.hierarchy.dot`、`3.matching.json`（不記雜湊）；`page0/inter-procedurals/1.*` 與三個 `.matching.json` 屬 `added`，內容改變但不記雜湊。

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-es2015 | inter-page/0.dupairs.dot | `cc3dd31f7778` → `bd1279423bbf` | +`todos`、`visible` 列（`render`）；`list`、`state` 的 L25／L34 use 改為 `call (25)`／`call (34)` |
| expected-es2015 | inter-page/0.graph.dot | `f25eb1d9b3cb` → `aeb46ac291e4` | L25、L34 拆成呼叫節點並連到 `render` 的 entry／exit，`render` 節點（L12、L13）插入，節點重編號 |
| expected-es2015 | page0/intra-pages/0.dupairs.dot | `cc3dd31f7778` → `bd1279423bbf` | 同 inter-page（單頁，兩檔內容相同） |
| expected-es2015 | page0/intra-pages/0.graph.dot | `664cb8c8deba` → `0c344ac0491e` | 同 inter-page |
| 其他 case／檔案 | （全部） | 不變 |  |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| （無） |  |  |  |  |

## 工具限制

- **D025 的 `changes()` 採集合語意**：摘要逐元素比對前，以同模型 `.graph.dot` 把兩側 `gen`／`exceptional` 的 `v@n` 換成節點標記，再以 `indexOf` 判定某元素是否存在於另一側（集合語意）。同一行、同一變數有多個節點（如同一行兩次寫入 `v`）且兩側標記相同時，換成標記後的多個元素互相遮蔽，可能少計一筆元素差異。判準以行為準（同一行的 `v` 定義是否仍在），影響有界：至多少計同一行、同一變數的重複元素，不會使不同行或不同變數的差異漏判。工具不修改。
