# MDN 差異紀錄（feature 008，FR-010、SC-003、SC-004）

基準：`2035c93`（develop；MDN 基準為 Setup 於 lib＝`2035c93` 時產生的快照 `specs/008-property-defs-method-calls/mdn/baseline-develop/`，含各模型的 `.dot` 與 `*.matching.json`、`exitcodes.json`、`<id>.pairs.txt`）

語料：`specs/006-eslint-scope/mdn/corpus/`（33 檔、32 個 id，`pages.json`）；本 branch 的輸出由 diffcheck 以 `node bin/dujs.js` 實跑到暫存目錄。
「淨差異（相對 develop）」「段結構改變行」「重複列數」「釘選與簽核」為機器區塊（`node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --verify specs/008-property-defs-method-calls/mdn-diff.md` 核對；CLI exit code 由工具另行比對），
MDN 驗證（Polish，T063）時以 `--report` 重產整表（相對 `2035c93` 的累積結果）後補「說明」。
pair 以「頁 × 層級」的聯集比對（D022）；段結構改變行與重複列數的作法同 [golden-diff.md](golden-diff.md)。

## 分類說明

與 [golden-diff.md](golden-diff.md) 的「分類說明」相同（同一工具、同一判準），全文重列如下。

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
| 1 | a03-bouncing-main | inter-page | *.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 2 | a03-bouncing-main | inter-page | *.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 3 | a03-bouncing-main | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 4 | a03-bouncing-main | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 5 | a03-bouncing-main | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 6 | a03-bouncing-main | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 7 | a04-bouncing-main-finished | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 loop.gen −ctx@n244、loop.exceptional −ctx@n244、loop.mustKill −ctx、loop.upwardExposed +ctx |
| 8 | a04-bouncing-main-finished | page0 | inter-procedurals/1.matching.json | matching | ~ | `inter-procedurals/1.matching.json` | 成員目標（摘要） | FR-003 | 摘要 loop.gen −ctx@n76、loop.exceptional −ctx@n76、loop.mustKill −ctx、loop.upwardExposed +ctx |
| 9 | a04-bouncing-main-finished | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 loop.gen −ctx@n76、loop.exceptional −ctx@n76、loop.mustKill −ctx、loop.upwardExposed +ctx |
| 10 | a04-bouncing-main-finished | inter-page | *.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 11 | a04-bouncing-main-finished | inter-page | *.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 12 | a04-bouncing-main-finished | inter-page | *.dupairs.dot | pair | + | `ctx: 5 -> 94` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 13 | a04-bouncing-main-finished | inter-page | *.dupairs.dot | pair | + | `ctx: 5 -> 95` | 成員目標（不再殺除） | FR-001 |  |
| 14 | a04-bouncing-main-finished | inter-page | *.dupairs.dot | pair | - | `ctx: 94 -> 95` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 15 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> call (68)` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 16 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 17 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 18 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 5 -> 94` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 19 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 5 -> 95` | 成員目標（不再殺除） | FR-001 |  |
| 20 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `ctx: 94 -> 95` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 21 | a04-bouncing-main-finished | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 22 | a04-bouncing-main-finished | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 23 | a04-bouncing-main-finished | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 5 -> 94` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 24 | a04-bouncing-main-finished | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 5 -> 95` | 成員目標（不再殺除） | FR-001 |  |
| 25 | a04-bouncing-main-finished | page0 | intra-pages/*.dupairs.dot | pair | - | `ctx: 94 -> 95` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 26 | a04-bouncing-main-finished | page0 | intra-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> 68` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 27 | a04-bouncing-main-finished | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 28 | a04-bouncing-main-finished | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 29 | a04-bouncing-main-finished | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 34 -> 35` | 成員目標（修正） | FR-001 | reads (method [arc]) miss writes ([fillStyle]) |
| 30 | a04-bouncing-main-finished | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 34 -> 36` | 成員目標（修正） | FR-001 | reads (method [fill]) miss writes ([fillStyle]) |
| 31 | a04-bouncing-main-finished | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 94 -> 95` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 32 | a05-assessment-main | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 33 | a05-assessment-main | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 34 | a05-assessment-main | page0 | inter-procedurals/1.hierarchy.dot | graph | ~ | `inter-procedurals/1.hierarchy.dot` | 放寬 | FR-004 | 亦符：共通 |
| 35 | a05-assessment-main | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 36 | a05-assessment-main | page0 | inter-procedurals/2.hierarchy.dot | graph | ~ | `inter-procedurals/2.hierarchy.dot` | 放寬 | FR-004 | 亦符：共通 |
| 37 | a05-assessment-main | page0 | inter-procedurals/3.dupairs.dot | model | + | `inter-procedurals/3.dupairs.dot` | 放寬 | FR-004 |  |
| 38 | a05-assessment-main | page0 | inter-procedurals/3.graph.dot | graph | + | `inter-procedurals/3.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 39 | a05-assessment-main | page0 | inter-procedurals/3.hierarchy.dot | graph | + | `inter-procedurals/3.hierarchy.dot` | 放寬 | FR-004 | 亦符：共通 |
| 40 | a05-assessment-main | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 放寬 | FR-004 | 亦符：共通 |
| 41 | a05-assessment-main | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 放寬 | FR-004 | 亦符：共通；摘要 loop.gen −ctx@n434、loop.exceptional −ctx@n434、loop.gen +count@n474（新連結 $ANONYMOUS_FUN_9）、loop.exceptional +count@n474（新連結 $ANONYMOUS_FUN_9）、loop.mustKill −ctx、loop.upwardExposed +Math（新連結 $ANONYMOUS_FUN_7）、loop.upwardExposed +count（新連結 $ANONYMOUS_FUN_9）、loop.upwardExposed +ctx、loop.upwardExposed +para（新連結 $ANONYMOUS_FUN_9）；新鍵（新連結）$ANONYMOUS_FUN_7、$ANONYMOUS_FUN_8、$ANONYMOUS_FUN_9 |
| 42 | a05-assessment-main | page0 | inter-procedurals/1.matching.json | matching | + | `inter-procedurals/1.matching.json` | 放寬 | FR-004 | 亦符：共通 |
| 43 | a05-assessment-main | page0 | inter-procedurals/2.matching.json | matching | ~ | `inter-procedurals/1.matching.json → inter-procedurals/2.matching.json` | 放寬 | FR-004 | 亦符：共通；摘要 loop.gen −ctx@n108、loop.exceptional −ctx@n108、loop.gen +count@n145（新連結 $ANONYMOUS_FUN_9）、loop.exceptional +count@n145（新連結 $ANONYMOUS_FUN_9）、loop.mustKill −ctx、loop.upwardExposed +Math（新連結 $ANONYMOUS_FUN_7）、loop.upwardExposed +count（新連結 $ANONYMOUS_FUN_9）、loop.upwardExposed +ctx、loop.upwardExposed +para（新連結 $ANONYMOUS_FUN_9）；新鍵（新連結）$ANONYMOUS_FUN_7、$ANONYMOUS_FUN_8、$ANONYMOUS_FUN_9 |
| 44 | a05-assessment-main | page0 | inter-procedurals/3.matching.json | matching | ~ | `inter-procedurals/2.matching.json → inter-procedurals/3.matching.json` | 放寬 | FR-004 | 亦符：共通 |
| 45 | a05-assessment-main | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 放寬 | FR-004 | 亦符：共通；摘要 loop.gen −ctx@n108、loop.exceptional −ctx@n108、loop.gen +count@n145（新連結 $ANONYMOUS_FUN_9）、loop.exceptional +count@n145（新連結 $ANONYMOUS_FUN_9）、loop.mustKill −ctx、loop.upwardExposed +Math（新連結 $ANONYMOUS_FUN_7）、loop.upwardExposed +count（新連結 $ANONYMOUS_FUN_9）、loop.upwardExposed +ctx、loop.upwardExposed +para（新連結 $ANONYMOUS_FUN_9）；新鍵（新連結）$ANONYMOUS_FUN_7、$ANONYMOUS_FUN_8、$ANONYMOUS_FUN_9 |
| 46 | a05-assessment-main | inter-page | *.dupairs.dot | row | + | `distance` | 放寬 | FR-004 |  |
| 47 | a05-assessment-main | inter-page | *.dupairs.dot | row | + | `dx` | 放寬 | FR-004 |  |
| 48 | a05-assessment-main | inter-page | *.dupairs.dot | row | + | `dy` | 放寬 | FR-004 |  |
| 49 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `Math: entry -> 124` | 放寬 | FR-004 |  |
| 50 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `Math: entry -> 151` | 放寬 | FR-004 |  |
| 51 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ball: 147 -> (148,147)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 52 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ball: 147 -> (148,149)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 53 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ball: 147 -> (153,147)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 54 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ball: 147 -> (153,154)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 55 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ball: 147 -> 149` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 56 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ball: 147 -> 150` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 57 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ball: 147 -> 154` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 58 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `balls: 166 -> 147` | 放寬 | FR-004 |  |
| 59 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `canvas: 9 -> 12` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 60 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `canvas: 9 -> 13` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 61 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `count: 155 -> 155` | 放寬 | FR-004 |  |
| 62 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `count: 155 -> 156` | 放寬 | FR-004 |  |
| 63 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `count: 181 -> 155` | 放寬 | FR-004 |  |
| 64 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `count: 7 -> 155` | 放寬 | FR-004 |  |
| 65 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ctx: 10 -> 121` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 66 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ctx: 10 -> 122` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 67 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ctx: 10 -> 123` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 68 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ctx: 10 -> 124` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 69 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ctx: 10 -> 125` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 70 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ctx: 10 -> 188` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 71 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `ctx: 10 -> 189` | 成員目標（不再殺除） | FR-001 |  |
| 72 | a05-assessment-main | inter-page | *.dupairs.dot | pair | - | `ctx: 188 -> 189` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 73 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `distance: 151 -> (153,147)` | 放寬 | FR-004 |  |
| 74 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `distance: 151 -> (153,154)` | 放寬 | FR-004 |  |
| 75 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `dx: 149 -> 151` | 放寬 | FR-004 |  |
| 76 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `dy: 150 -> 151` | 放寬 | FR-004 |  |
| 77 | a05-assessment-main | inter-page | *.dupairs.dot | pair | - | `evilBall: call (185)_a -> 199` | 放寬 | FR-004 |  |
| 78 | a05-assessment-main | inter-page | *.dupairs.dot | pair | - | `evilBall: call (185)_a -> 200` | 放寬 | FR-004 |  |
| 79 | a05-assessment-main | inter-page | *.dupairs.dot | pair | - | `evilBall: call (185)_a -> 201` | 放寬 | FR-004 |  |
| 80 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (199)` | 放寬 | FR-004 |  |
| 81 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (200)` | 放寬 | FR-004 |  |
| 82 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (201)` | 放寬 | FR-004 |  |
| 83 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `height: 13 -> (137,138)` | 放寬 | FR-004 |  |
| 84 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `height: 13 -> (137,141)` | 放寬 | FR-004 |  |
| 85 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `para: 6 -> 156` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 86 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `para: 6 -> 182` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 87 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `width: 12 -> (129,130)` | 放寬 | FR-004 |  |
| 88 | a05-assessment-main | inter-page | *.dupairs.dot | pair | + | `width: 12 -> (129,133)` | 放寬 | FR-004 |  |
| 89 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Math: entry -> 124` | 放寬 | FR-004 |  |
| 90 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Math: entry -> 151` | 放寬 | FR-004 |  |
| 91 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> (148,147)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 92 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> (148,149)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 93 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> (153,147)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 94 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> (153,154)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 95 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> 149` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 96 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> 150` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 97 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> 154` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 98 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> call (86)` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 99 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `balls: 166 -> 147` | 放寬 | FR-004 |  |
| 100 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `canvas: 9 -> 12` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 101 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `canvas: 9 -> 13` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 102 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `count: 155 -> 155` | 放寬 | FR-004 |  |
| 103 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `count: 155 -> 156` | 放寬 | FR-004 |  |
| 104 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `count: 181 -> 155` | 放寬 | FR-004 |  |
| 105 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `count: 7 -> 155` | 放寬 | FR-004 |  |
| 106 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 10 -> 121` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 107 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 10 -> 122` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 108 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 10 -> 123` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 109 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 10 -> 124` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 110 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 10 -> 125` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 111 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 10 -> 188` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 112 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 10 -> 189` | 成員目標（不再殺除） | FR-001 |  |
| 113 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `ctx: 188 -> 189` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 114 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `distance: 151 -> (153,147)` | 放寬 | FR-004 |  |
| 115 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `distance: 151 -> (153,154)` | 放寬 | FR-004 |  |
| 116 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `dx: 149 -> 151` | 放寬 | FR-004 |  |
| 117 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `dy: 150 -> 151` | 放寬 | FR-004 |  |
| 118 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `evilBall: call (185)_a -> 199` | 放寬 | FR-004 |  |
| 119 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `evilBall: call (185)_a -> 200` | 放寬 | FR-004 |  |
| 120 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `evilBall: call (185)_a -> 201` | 放寬 | FR-004 |  |
| 121 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (199)` | 放寬 | FR-004 |  |
| 122 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (200)` | 放寬 | FR-004 |  |
| 123 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (201)` | 放寬 | FR-004 |  |
| 124 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `height: 13 -> (137,138)` | 放寬 | FR-004 |  |
| 125 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `height: 13 -> (137,141)` | 放寬 | FR-004 |  |
| 126 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `para: 6 -> 156` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 127 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `para: 6 -> 182` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 128 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `width: 12 -> (129,130)` | 放寬 | FR-004 |  |
| 129 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `width: 12 -> (129,133)` | 放寬 | FR-004 |  |
| 130 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | row | + | `distance` | 放寬 | FR-004 |  |
| 131 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | row | + | `dx` | 放寬 | FR-004 |  |
| 132 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | row | + | `dy` | 放寬 | FR-004 |  |
| 133 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `Math: entry -> 124` | 放寬 | FR-004 |  |
| 134 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `Math: entry -> 151` | 放寬 | FR-004 |  |
| 135 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 147 -> (148,147)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 136 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 147 -> (148,149)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 137 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 147 -> (153,147)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 138 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 147 -> (153,154)` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 139 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 147 -> 149` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 140 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 147 -> 150` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 141 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 147 -> 154` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 142 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `balls: 166 -> 147` | 放寬 | FR-004 |  |
| 143 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 9 -> 12` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 144 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 9 -> 13` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 145 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `count: 155 -> 155` | 放寬 | FR-004 |  |
| 146 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `count: 155 -> 156` | 放寬 | FR-004 |  |
| 147 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `count: 181 -> 155` | 放寬 | FR-004 |  |
| 148 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `count: 7 -> 155` | 放寬 | FR-004 |  |
| 149 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 10 -> 121` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 150 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 10 -> 122` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 151 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 10 -> 123` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 152 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 10 -> 124` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 153 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 10 -> 125` | 成員目標（不再殺除） | FR-001 | 亦符：放寬 |
| 154 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 10 -> 188` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 155 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 10 -> 189` | 成員目標（不再殺除） | FR-001 |  |
| 156 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | - | `ctx: 188 -> 189` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 157 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `distance: 151 -> (153,147)` | 放寬 | FR-004 |  |
| 158 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `distance: 151 -> (153,154)` | 放寬 | FR-004 |  |
| 159 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `dx: 149 -> 151` | 放寬 | FR-004 |  |
| 160 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `dy: 150 -> 151` | 放寬 | FR-004 |  |
| 161 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | - | `evilBall: call (185)_a -> 199` | 放寬 | FR-004 |  |
| 162 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | - | `evilBall: call (185)_a -> 200` | 放寬 | FR-004 |  |
| 163 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | - | `evilBall: call (185)_a -> 201` | 放寬 | FR-004 |  |
| 164 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (199)` | 放寬 | FR-004 |  |
| 165 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (200)` | 放寬 | FR-004 |  |
| 166 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `evilBall: call (185)_a -> call (201)` | 放寬 | FR-004 |  |
| 167 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `height: 13 -> (137,138)` | 放寬 | FR-004 |  |
| 168 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `height: 13 -> (137,141)` | 放寬 | FR-004 |  |
| 169 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 6 -> 156` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 170 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 6 -> 182` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 171 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `width: 12 -> (129,130)` | 放寬 | FR-004 |  |
| 172 | a05-assessment-main | page0 | intra-pages/*.dupairs.dot | pair | + | `width: 12 -> (129,133)` | 放寬 | FR-004 |  |
| 173 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | + | `ball: 147 -> 154` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、放寬 |
| 174 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> 86` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 175 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 9 -> 12` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 176 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 9 -> 13` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 177 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 123 -> 124` | 成員目標（修正） | FR-001 | reads (method [arc]) miss writes ([lineWidth])；亦符：放寬 |
| 178 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 123 -> 125` | 成員目標（修正） | FR-001 | reads (method [stroke]) miss writes ([lineWidth])；亦符：放寬 |
| 179 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 188 -> 189` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 180 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 51 -> 52` | 成員目標（修正） | FR-001 | reads (method [arc]) miss writes ([fillStyle]) |
| 181 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 51 -> 53` | 成員目標（修正） | FR-001 | reads (method [fill]) miss writes ([fillStyle]) |
| 182 | a05-assessment-main | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para: 6 -> 182` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 183 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | + | `para1: 17 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 184 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | + | `para1: 17 -> 30` | 成員目標（不再殺除） | FR-001 |  |
| 185 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | - | `para1: 29 -> 30` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 186 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | + | `para2: 18 -> 31` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 187 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | + | `para2: 18 -> 32` | 成員目標（不再殺除） | FR-001 |  |
| 188 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | - | `para2: 31 -> 32` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 189 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | + | `para3: 19 -> 33` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 190 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | + | `para3: 19 -> 34` | 成員目標（不再殺除） | FR-001 |  |
| 191 | s01-math-3-finish | inter-page | *.dupairs.dot | pair | - | `para3: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 192 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 17 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 193 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 17 -> 30` | 成員目標（不再殺除） | FR-001 |  |
| 194 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para1: 29 -> 30` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 195 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 18 -> 31` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 196 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 18 -> 32` | 成員目標（不再殺除） | FR-001 |  |
| 197 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para2: 31 -> 32` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 198 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para3: 19 -> 33` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 199 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para3: 19 -> 34` | 成員目標（不再殺除） | FR-001 |  |
| 200 | s01-math-3-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para3: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 201 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 17 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 202 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 17 -> 30` | 成員目標（不再殺除） | FR-001 |  |
| 203 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para1: 29 -> 30` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 204 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 18 -> 31` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 205 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 18 -> 32` | 成員目標（不再殺除） | FR-001 |  |
| 206 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para2: 31 -> 32` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 207 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para3: 19 -> 33` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 208 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para3: 19 -> 34` | 成員目標（不再殺除） | FR-001 |  |
| 209 | s01-math-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para3: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 210 | s02-conditionals-3-finish | inter-page | *.dupairs.dot | pair | + | `para1: 19 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 211 | s02-conditionals-3-finish | inter-page | *.dupairs.dot | pair | + | `para1: 19 -> 23` | 成員目標（不再殺除） | FR-001 |  |
| 212 | s02-conditionals-3-finish | inter-page | *.dupairs.dot | pair | - | `para1: 21 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 213 | s02-conditionals-3-finish | inter-page | *.dupairs.dot | pair | + | `para2: 20 -> 22` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 214 | s02-conditionals-3-finish | inter-page | *.dupairs.dot | pair | + | `para2: 20 -> 24` | 成員目標（不再殺除） | FR-001 |  |
| 215 | s02-conditionals-3-finish | inter-page | *.dupairs.dot | pair | - | `para2: 22 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 216 | s02-conditionals-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 19 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 217 | s02-conditionals-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 19 -> 23` | 成員目標（不再殺除） | FR-001 |  |
| 218 | s02-conditionals-3-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para1: 21 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 219 | s02-conditionals-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 20 -> 22` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 220 | s02-conditionals-3-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 20 -> 24` | 成員目標（不再殺除） | FR-001 |  |
| 221 | s02-conditionals-3-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para2: 22 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 222 | s02-conditionals-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 19 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 223 | s02-conditionals-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 19 -> 23` | 成員目標（不再殺除） | FR-001 |  |
| 224 | s02-conditionals-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para1: 21 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 225 | s02-conditionals-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 20 -> 22` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 226 | s02-conditionals-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 20 -> 24` | 成員目標（不再殺除） | FR-001 |  |
| 227 | s02-conditionals-3-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para2: 22 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 228 | s03-loops-2-finish | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 229 | s03-loops-2-finish | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 26` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 230 | s03-loops-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 231 | s03-loops-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 26` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 232 | s03-loops-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para: 3 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 233 | s03-loops-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para: 3 -> 26` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 234 | s04a-while-loop-cats | inter-page | *.dupairs.dot | pair | + | `pElem: 3 -> 19` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 235 | s04a-while-loop-cats | page0 | intra-pages/*.dupairs.dot | pair | + | `pElem: 3 -> 19` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 236 | s04a-while-loop-cats | page0 | intra-procedurals/*.dupairs.dot | pair | + | `pElem: 3 -> 19` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 237 | s04b-do-while-loop-cats | inter-page | *.dupairs.dot | pair | + | `pElem: 3 -> 19` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 238 | s04b-do-while-loop-cats | page0 | intra-pages/*.dupairs.dot | pair | + | `pElem: 3 -> 19` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 239 | s04b-do-while-loop-cats | page0 | intra-procedurals/*.dupairs.dot | pair | + | `pElem: 3 -> 19` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 240 | s04c-for-loop-cats | inter-page | *.dupairs.dot | pair | + | `pElem: 3 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 241 | s04c-for-loop-cats | page0 | intra-pages/*.dupairs.dot | pair | + | `pElem: 3 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 242 | s04c-for-loop-cats | page0 | intra-procedurals/*.dupairs.dot | pair | + | `pElem: 3 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 243 | s05-switch-example | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 setWeather.gen −para@n68、setWeather.gen −para@n70、setWeather.gen −para@n72、setWeather.gen −para@n74、setWeather.gen −para@n76、setWeather.mustKill −para、setWeather.upwardExposed +para |
| 244 | s05-switch-example | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 setWeather.gen −para@n21、setWeather.gen −para@n23、setWeather.gen −para@n25、setWeather.gen −para@n27、setWeather.gen −para@n29、setWeather.mustKill −para、setWeather.upwardExposed +para |
| 245 | s05-switch-example | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 12` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 246 | s05-switch-example | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 247 | s05-switch-example | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 20` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 248 | s05-switch-example | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 24` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 249 | s05-switch-example | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 28` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 250 | s05-switch-example | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 12` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 251 | s05-switch-example | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 252 | s05-switch-example | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 20` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 253 | s05-switch-example | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 24` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 254 | s05-switch-example | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 28` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 255 | s06a-exiting-loops-break | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_0.gen −input@n79、$ANONYMOUS_FUN_0.gen −para@n81、$ANONYMOUS_FUN_0.gen −para@n85、$ANONYMOUS_FUN_0.gen −para@n87、$ANONYMOUS_FUN_0.exceptional −input@n79、$ANONYMOUS_FUN_0.exceptional −para@n81、$ANONYMOUS_FUN_0.exceptional −para@n85、$ANONYMOUS_FUN_0.mustKill −input、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para |
| 256 | s06a-exiting-loops-break | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_0.gen −input@n29、$ANONYMOUS_FUN_0.gen −para@n31、$ANONYMOUS_FUN_0.gen −para@n35、$ANONYMOUS_FUN_0.gen −para@n37、$ANONYMOUS_FUN_0.exceptional −input@n29、$ANONYMOUS_FUN_0.exceptional −para@n31、$ANONYMOUS_FUN_0.exceptional −para@n35、$ANONYMOUS_FUN_0.mustKill −input、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para |
| 257 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | + | `input: 10 -> 15` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 258 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | + | `input: 10 -> 16` | 成員目標（不再殺除） | FR-001 |  |
| 259 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | - | `input: 15 -> 14` | 屬性寫入→讀取損失 | D001、FR-009 | member read [value.toLowerCase] overlaps write [value] |
| 260 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | - | `input: 15 -> 16` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 261 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | - | `para: 17 -> (25,26)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 262 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | - | `para: 17 -> (25,exit_b)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 263 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | - | `para: 21 -> (25,26)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 264 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | - | `para: 21 -> (25,exit_b)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 265 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | + | `para: 9 -> (25,26)` | 成員目標（不再殺除） | FR-001 |  |
| 266 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | + | `para: 9 -> (25,exit_b)` | 成員目標（不再殺除） | FR-001 |  |
| 267 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | + | `para: 9 -> 17` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 268 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | + | `para: 9 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 269 | s06a-exiting-loops-break | inter-page | *.dupairs.dot | pair | + | `para: 9 -> 26` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 270 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | + | `input: 10 -> 15` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 271 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | + | `input: 10 -> 16` | 成員目標（不再殺除） | FR-001 |  |
| 272 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | - | `input: 15 -> 14` | 屬性寫入→讀取損失 | D001、FR-009 | member read [value.toLowerCase] overlaps write [value] |
| 273 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | - | `input: 15 -> 16` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 274 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | - | `para: 17 -> (25,26)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 275 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | - | `para: 17 -> (25,exit_b)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 276 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | - | `para: 21 -> (25,26)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 277 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | - | `para: 21 -> (25,exit_b)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 278 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 9 -> (25,26)` | 成員目標（不再殺除） | FR-001 |  |
| 279 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 9 -> (25,exit_b)` | 成員目標（不再殺除） | FR-001 |  |
| 280 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 9 -> 17` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 281 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 9 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 282 | s06a-exiting-loops-break | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 9 -> 26` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 283 | s06a-exiting-loops-break | page0 | intra-procedurals/*.dupairs.dot | pair | - | `input: 15 -> 16` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 284 | s06a-exiting-loops-break | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para: 17 -> (25,26)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 285 | s06a-exiting-loops-break | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para: 17 -> (25,exit)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 286 | s06a-exiting-loops-break | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para: 21 -> (25,26)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 287 | s06a-exiting-loops-break | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para: 21 -> (25,exit)` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 288 | s06b-silly-story-finish | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 generateStory.gen −story@n177、generateStory.exceptional −story@n177、generateStory.mustKill −story、generateStory.upwardExposed +story |
| 289 | s06b-silly-story-finish | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 generateStory.gen −story@n65、generateStory.exceptional −story@n65、generateStory.mustKill −story、generateStory.upwardExposed +story |
| 290 | s06b-silly-story-finish | inter-page | *.dupairs.dot | pair | + | `story: 6 -> 54` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 291 | s06b-silly-story-finish | inter-page | *.dupairs.dot | pair | + | `story: 6 -> 55` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 292 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | - | `story` | 成員目標（列消失） | FR-001 |  |
| 293 | s06b-silly-story-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `story: 6 -> 54` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 294 | s06b-silly-story-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `story: 6 -> 55` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 295 | s07-gallery-finish | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_1.gen −btn@n136、$ANONYMOUS_FUN_1.gen −btn@n139、$ANONYMOUS_FUN_1.exceptional −btn@n136、$ANONYMOUS_FUN_1.exceptional −btn@n139、$ANONYMOUS_FUN_1.mustKill −btn、$ANONYMOUS_FUN_1.upwardExposed +overlay、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.gen −displayedImage@n122、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.exceptional −displayedImage@n121、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.upwardExposed +displayedImage、updateDisplayedImage.gen −displayedImage@n122、updateDisplayedImage.exceptional −displayedImage@n121、updateDisplayedImage.mustKill −displayedImage、updateDisplayedImage.upwardExposed +displayedImage |
| 296 | s07-gallery-finish | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 updateDisplayedImage.gen −displayedImage@n72、updateDisplayedImage.exceptional −displayedImage@n71、updateDisplayedImage.mustKill −displayedImage、updateDisplayedImage.upwardExposed +displayedImage |
| 297 | s07-gallery-finish | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_1.gen −btn@n78、$ANONYMOUS_FUN_1.gen −btn@n81、$ANONYMOUS_FUN_1.exceptional −btn@n78、$ANONYMOUS_FUN_1.exceptional −btn@n81、$ANONYMOUS_FUN_1.mustKill −btn、$ANONYMOUS_FUN_1.upwardExposed +overlay、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.gen −displayedImage@n64、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.exceptional −displayedImage@n63、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.upwardExposed +displayedImage、updateDisplayedImage.gen −displayedImage@n64、updateDisplayedImage.exceptional −displayedImage@n63、updateDisplayedImage.mustKill −displayedImage、updateDisplayedImage.upwardExposed +displayedImage |
| 298 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `btn: 5 -> 60` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 299 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `btn: 5 -> 65` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 300 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `btn: 5 -> 69` | 成員目標（不再殺除） | FR-001 |  |
| 301 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `btn: 60 -> (59,60)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 302 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `btn: 60 -> (59,65)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 303 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `btn: 60 -> 69` | 成員目標（修正） | FR-001 | reads (member [classList.toggle]) miss writes ([textContent]) |
| 304 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `btn: 65 -> (59,60)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 305 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `btn: 65 -> (59,65)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 306 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `btn: 65 -> 69` | 成員目標（修正） | FR-001 | reads (member [classList.toggle]) miss writes ([textContent]) |
| 307 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `displayedImage: 2 -> 49abab` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 308 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `displayedImage: 2 -> 50abab` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 309 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `newImage: 27 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 310 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `newImage: 27 -> 30` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 311 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `newImage: 27 -> 32` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 312 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `newImage: 27 -> 34` | 成員目標（不再殺除） | FR-001 |  |
| 313 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `newImage: 27 -> 36` | 成員目標（不再殺除） | FR-001 |  |
| 314 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `newImage: 27 -> 39` | 成員目標（不再殺除） | FR-001 |  |
| 315 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `newImage: 32 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 316 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `newImage: 32 -> 36` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([tabIndex]) |
| 317 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | - | `newImage: 32 -> 39` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([tabIndex]) |
| 318 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `overlay: 6 -> 61` | 成員目標（新增讀取） | FR-002 |  |
| 319 | s07-gallery-finish | inter-page | *.dupairs.dot | pair | + | `overlay: 6 -> 66` | 成員目標（新增讀取） | FR-002 |  |
| 320 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | row | - | `displayedImage` | 成員目標（列消失） | FR-001 |  |
| 321 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `btn: 5 -> 60` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 322 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `btn: 5 -> 65` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 323 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `btn: 5 -> 69` | 成員目標（不再殺除） | FR-001 |  |
| 324 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `btn: 60 -> (59,60)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 325 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `btn: 60 -> (59,65)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 326 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `btn: 60 -> 69` | 成員目標（修正） | FR-001 | reads (member [classList.toggle]) miss writes ([textContent]) |
| 327 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `btn: 65 -> (59,60)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 328 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `btn: 65 -> (59,65)` | 成員目標（修正） | FR-001 | reads (member [classList.contains]) miss writes ([textContent]) |
| 329 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `btn: 65 -> 69` | 成員目標（修正） | FR-001 | reads (member [classList.toggle]) miss writes ([textContent]) |
| 330 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `displayedImage: 2 -> 49abab` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 331 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `displayedImage: 2 -> 50abab` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 332 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `newImage: 27 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 333 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `newImage: 27 -> 30` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 334 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `newImage: 27 -> 32` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 335 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `newImage: 27 -> 34` | 成員目標（不再殺除） | FR-001 |  |
| 336 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `newImage: 27 -> 36` | 成員目標（不再殺除） | FR-001 |  |
| 337 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `newImage: 27 -> 39` | 成員目標（不再殺除） | FR-001 |  |
| 338 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `newImage: 32 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 339 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `newImage: 32 -> 36` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([tabIndex]) |
| 340 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `newImage: 32 -> 39` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([tabIndex]) |
| 341 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `overlay: 6 -> 61` | 成員目標（新增讀取） | FR-002 |  |
| 342 | s07-gallery-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `overlay: 6 -> 66` | 成員目標（新增讀取） | FR-002 |  |
| 343 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `btn: 60 -> 69` | 成員目標（修正） | FR-001 | reads (member [classList.toggle]) miss writes ([textContent]) |
| 344 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `btn: 65 -> 69` | 成員目標（修正） | FR-001 | reads (member [classList.toggle]) miss writes ([textContent]) |
| 345 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `newImage: 27 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 346 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `newImage: 27 -> 30` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 347 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `newImage: 27 -> 32` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 348 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `newImage: 27 -> 34` | 成員目標（不再殺除） | FR-001 |  |
| 349 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `newImage: 27 -> 36` | 成員目標（不再殺除） | FR-001 |  |
| 350 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `newImage: 27 -> 39` | 成員目標（不再殺除） | FR-001 |  |
| 351 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `newImage: 32 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 352 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `newImage: 32 -> 36` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([tabIndex]) |
| 353 | s07-gallery-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `newImage: 32 -> 39` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([tabIndex]) |
| 354 | s08-number-guessing-game | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 checkGuess.gen −guesses@n181、checkGuess.gen −lastResult@n183、checkGuess.gen −lowOrHi@n185、checkGuess.gen −guessSubmit@n189、checkGuess.gen −resetButton@n191、checkGuess.gen −guessField@n197、checkGuess.gen −lastResult@n200、checkGuess.gen −lowOrHi@n201、checkGuess.gen −lastResult@n204、checkGuess.gen −lowOrHi@n207、checkGuess.gen −lowOrHi@n209、checkGuess.exceptional −guesses@n180、checkGuess.exceptional −guesses@n181、checkGuess.exceptional −lastResult@n183、checkGuess.exceptional −lowOrHi@n185、checkGuess.exceptional −guessField@n188、checkGuess.exceptional −guessSubmit@n189、checkGuess.exceptional −resetButton@n191、checkGuess.exceptional −guessField@n197、checkGuess.exceptional −lastResult@n200、checkGuess.exceptional −lowOrHi@n201、checkGuess.exceptional −lastResult@n204、checkGuess.exceptional −lowOrHi@n207、checkGuess.exceptional −lowOrHi@n209、checkGuess.gen +resetButton@n190、checkGuess.mustKill −guessField、checkGuess.mustKill −guesses、checkGuess.mustKill −lastResult、checkGuess.upwardExposed +guessSubmit、checkGuess.upwardExposed +lastResult、checkGuess.upwardExposed +lowOrHi、setGameOver.gen −guessField@n188、setGameOver.gen −guessSubmit@n189、setGameOver.gen −resetButton@n191、setGameOver.exceptional −guessField@n188、setGameOver.exceptional −guessSubmit@n189、setGameOver.exceptional −resetButton@n191、setGameOver.gen +resetButton@n190、setGameOver.mustKill −guessField、setGameOver.mustKill −guessSubmit、setGameOver.upwardExposed +guessField、setGameOver.upwardExposed +guessSubmit |
| 355 | s08-number-guessing-game | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 setGameOver.gen −guessField@n97、setGameOver.gen −guessSubmit@n98、setGameOver.gen −resetButton@n100、setGameOver.exceptional −guessField@n97、setGameOver.exceptional −guessSubmit@n98、setGameOver.exceptional −resetButton@n100、setGameOver.gen +resetButton@n99、setGameOver.mustKill −guessField、setGameOver.mustKill −guessSubmit、setGameOver.upwardExposed +guessField、setGameOver.upwardExposed +guessSubmit |
| 356 | s08-number-guessing-game | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 checkGuess.gen −guesses@n53、checkGuess.gen −lastResult@n55、checkGuess.gen −lowOrHi@n57、checkGuess.gen −guessSubmit@n61、checkGuess.gen −resetButton@n63、checkGuess.gen −guessField@n69、checkGuess.gen −lastResult@n72、checkGuess.gen −lowOrHi@n73、checkGuess.gen −lastResult@n76、checkGuess.gen −lowOrHi@n79、checkGuess.gen −lowOrHi@n81、checkGuess.exceptional −guesses@n52、checkGuess.exceptional −guesses@n53、checkGuess.exceptional −lastResult@n55、checkGuess.exceptional −lowOrHi@n57、checkGuess.exceptional −guessField@n60、checkGuess.exceptional −guessSubmit@n61、checkGuess.exceptional −resetButton@n63、checkGuess.exceptional −guessField@n69、checkGuess.exceptional −lastResult@n72、checkGuess.exceptional −lowOrHi@n73、checkGuess.exceptional −lastResult@n76、checkGuess.exceptional −lowOrHi@n79、checkGuess.exceptional −lowOrHi@n81、checkGuess.gen +resetButton@n62、checkGuess.mustKill −guessField、checkGuess.mustKill −guesses、checkGuess.mustKill −lastResult、checkGuess.upwardExposed +guessSubmit、checkGuess.upwardExposed +lastResult、checkGuess.upwardExposed +lowOrHi、setGameOver.gen −guessField@n60、setGameOver.gen −guessSubmit@n61、setGameOver.gen −resetButton@n63、setGameOver.exceptional −guessField@n60、setGameOver.exceptional −guessSubmit@n61、setGameOver.exceptional −resetButton@n63、setGameOver.gen +resetButton@n62、setGameOver.mustKill −guessField、setGameOver.mustKill −guessSubmit、setGameOver.upwardExposed +guessField、setGameOver.upwardExposed +guessSubmit |
| 357 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | - | `guessField: 39 -> 12` | 屬性寫入→讀取損失 | D001、FR-009 | member read [value] overlaps write [value] |
| 358 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | - | `guessField: 39 -> 40` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 359 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | - | `guessField: 46 -> 12` | 成員目標（修正） | FR-001 | reads (member [value]) miss writes ([disabled]) |
| 360 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `guessField: 7 -> 39` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 361 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `guessField: 7 -> 40` | 成員目標（不再殺除） | FR-001 |  |
| 362 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `guessField: 7 -> 46` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 363 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `guessSubmit: 6 -> 47` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 364 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | - | `guesses: 14 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 365 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | - | `guesses: 17 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 366 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `guesses: 3 -> 14` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 367 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lastResult: 4 -> 20` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 368 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lastResult: 4 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 369 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lastResult: 4 -> 25` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 370 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lastResult: 4 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 371 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lastResult: 4 -> 30` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 372 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lowOrHi: 5 -> 22` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 373 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lowOrHi: 5 -> 26` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 374 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lowOrHi: 5 -> 32` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 375 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `lowOrHi: 5 -> 34` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 376 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `resetButton: 48 -> 49` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 377 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `resetButton: 48 -> 50` | 成員目標（不再殺除） | FR-001 |  |
| 378 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | + | `resetButton: 48 -> 51` | 成員目標（不再殺除） | FR-001 |  |
| 379 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | - | `resetButton: 49 -> 50` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 380 | s08-number-guessing-game | inter-page | *.dupairs.dot | pair | - | `resetButton: 49 -> 51` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([textContent]) |
| 381 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | - | `guessField` | 成員目標（列消失） | FR-001 |  |
| 382 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | - | `guessSubmit` | 成員目標（列消失） | FR-001 |  |
| 383 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | - | `guesses` | 成員目標（列消失） | FR-001 |  |
| 384 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | - | `lastResult` | 成員目標（列消失） | FR-001 |  |
| 385 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | - | `lowOrHi` | 成員目標（列消失） | FR-001 |  |
| 386 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | - | `guessField: 39 -> 40` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 387 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | - | `guesses: 14 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 388 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `resetButton: 48 -> 49` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 389 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `resetButton: 48 -> 50` | 成員目標（不再殺除） | FR-001 |  |
| 390 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `resetButton: 48 -> 51` | 成員目標（不再殺除） | FR-001 |  |
| 391 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | - | `resetButton: 49 -> 50` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 392 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | - | `resetButton: 49 -> 51` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([textContent]) |
| 393 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | - | `guessField: 39 -> 12` | 屬性寫入→讀取損失 | D001、FR-009 | member read [value] overlaps write [value] |
| 394 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | - | `guessField: 39 -> 40` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 395 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | - | `guessField: 46 -> 12` | 成員目標（修正） | FR-001 | reads (member [value]) miss writes ([disabled]) |
| 396 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `guessField: 7 -> 39` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 397 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `guessField: 7 -> 40` | 成員目標（不再殺除） | FR-001 |  |
| 398 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `guessField: 7 -> 46` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 399 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `guessSubmit: 6 -> 47` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 400 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | - | `guesses: 14 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 401 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | - | `guesses: 17 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 402 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `guesses: 3 -> 14` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 403 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lastResult: 4 -> 20` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 404 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lastResult: 4 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 405 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lastResult: 4 -> 25` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 406 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lastResult: 4 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 407 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lastResult: 4 -> 30` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 408 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lowOrHi: 5 -> 22` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 409 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lowOrHi: 5 -> 26` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 410 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lowOrHi: 5 -> 32` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 411 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `lowOrHi: 5 -> 34` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 412 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `resetButton: 48 -> 49` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 413 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `resetButton: 48 -> 50` | 成員目標（不再殺除） | FR-001 |  |
| 414 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | + | `resetButton: 48 -> 51` | 成員目標（不再殺除） | FR-001 |  |
| 415 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | - | `resetButton: 49 -> 50` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 416 | s08-number-guessing-game | page0 | intra-pages/*.dupairs.dot | pair | - | `resetButton: 49 -> 51` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([textContent]) |
| 417 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | - | `guessField: 39 -> 40` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 418 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | - | `guessField: 64 -> 65` | 成員目標（修正） | FR-001 | reads (method [focus]) miss writes ([value]) |
| 419 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | - | `guesses: 14 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 420 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | + | `resetButton: 48 -> 49` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 421 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | + | `resetButton: 48 -> 50` | 成員目標（不再殺除） | FR-001 |  |
| 422 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | + | `resetButton: 48 -> 51` | 成員目標（不再殺除） | FR-001 |  |
| 423 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | - | `resetButton: 49 -> 50` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 424 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | - | `resetButton: 49 -> 51` | 成員目標（修正） | FR-001 | reads (method [addEventListener]) miss writes ([textContent]) |
| 425 | s08-number-guessing-game | page0 | intra-procedurals/*.dupairs.dot | pair | + | `resetPara: 57 -> 58` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 426 | s10-allowance-updater | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_0.gen −para@n73、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para、updateAllowance.gen −para@n73、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para |
| 427 | s10-allowance-updater | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 updateAllowance.gen −para@n27、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para |
| 428 | s10-allowance-updater | page0 | inter-procedurals/1.matching.json | matching | ~ | `inter-procedurals/1.matching.json` | 成員目標（摘要） | FR-003 | 摘要 updateAllowance.gen −para@n41、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para |
| 429 | s10-allowance-updater | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_0.gen −para@n27、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para、updateAllowance.gen −para@n27、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para |
| 430 | s10-allowance-updater | inter-page | *.dupairs.dot | pair | + | `para: 3 -> 23abab` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、§43 |
| 431 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | + | `para: 3 -> 23` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、§43 |
| 432 | s10-allowance-updater | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 3 -> 23abab` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除）、§43 |
| 433 | s11-calculating-squares | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_0.gen −results@n82、$ANONYMOUS_FUN_0.mustKill −results、$ANONYMOUS_FUN_0.upwardExposed +results、calculate.gen −results@n78、calculate.exceptional −results@n76、calculate.mustKill −results |
| 434 | s11-calculating-squares | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_0.gen −results@n35、$ANONYMOUS_FUN_0.mustKill −results、$ANONYMOUS_FUN_0.upwardExposed +results、calculate.gen −results@n31、calculate.exceptional −results@n29、calculate.mustKill −results |
| 435 | s11-calculating-squares | inter-page | *.dupairs.dot | pair | - | `results: 16b -> 7` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 436 | s11-calculating-squares | inter-page | *.dupairs.dot | pair | - | `results: 16b -> 9` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 437 | s11-calculating-squares | inter-page | *.dupairs.dot | pair | + | `results: 2 -> 16b` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 438 | s11-calculating-squares | inter-page | *.dupairs.dot | pair | - | `results: 7 -> 7` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 439 | s11-calculating-squares | inter-page | *.dupairs.dot | pair | - | `results: 7 -> 9` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 440 | s11-calculating-squares | inter-page | *.dupairs.dot | pair | - | `results: 9 -> 7` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 441 | s11-calculating-squares | inter-page | *.dupairs.dot | pair | - | `results: 9 -> 9` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 442 | s11-calculating-squares | page0 | intra-pages/*.dupairs.dot | pair | - | `results: 16b -> 7` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 443 | s11-calculating-squares | page0 | intra-pages/*.dupairs.dot | pair | - | `results: 16b -> 9` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 444 | s11-calculating-squares | page0 | intra-pages/*.dupairs.dot | pair | + | `results: 2 -> 16b` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 445 | s11-calculating-squares | page0 | intra-pages/*.dupairs.dot | pair | - | `results: 7 -> 7` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 446 | s11-calculating-squares | page0 | intra-pages/*.dupairs.dot | pair | - | `results: 7 -> 9` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 447 | s11-calculating-squares | page0 | intra-pages/*.dupairs.dot | pair | - | `results: 9 -> 7` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 448 | s11-calculating-squares | page0 | intra-pages/*.dupairs.dot | pair | - | `results: 9 -> 9` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 449 | s11-calculating-squares | page0 | intra-procedurals/*.dupairs.dot | pair | - | `results: 7 -> 7` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 450 | s11-calculating-squares | page0 | intra-procedurals/*.dupairs.dot | pair | - | `results: 7 -> 9` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 451 | s12-conditionals-2-finish | inter-page | *.dupairs.dot | pair | + | `para1: 26 -> 28` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 452 | s12-conditionals-2-finish | inter-page | *.dupairs.dot | pair | + | `para1: 26 -> 30` | 成員目標（不再殺除） | FR-001 |  |
| 453 | s12-conditionals-2-finish | inter-page | *.dupairs.dot | pair | - | `para1: 28 -> 30` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 454 | s12-conditionals-2-finish | inter-page | *.dupairs.dot | pair | + | `para2: 27 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 455 | s12-conditionals-2-finish | inter-page | *.dupairs.dot | pair | + | `para2: 27 -> 31` | 成員目標（不再殺除） | FR-001 |  |
| 456 | s12-conditionals-2-finish | inter-page | *.dupairs.dot | pair | - | `para2: 29 -> 31` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 457 | s12-conditionals-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 26 -> 28` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 458 | s12-conditionals-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 26 -> 30` | 成員目標（不再殺除） | FR-001 |  |
| 459 | s12-conditionals-2-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para1: 28 -> 30` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 460 | s12-conditionals-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 27 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 461 | s12-conditionals-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 27 -> 31` | 成員目標（不再殺除） | FR-001 |  |
| 462 | s12-conditionals-2-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para2: 29 -> 31` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 463 | s12-conditionals-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 26 -> 28` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 464 | s12-conditionals-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 26 -> 30` | 成員目標（不再殺除） | FR-001 |  |
| 465 | s12-conditionals-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para1: 28 -> 30` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 466 | s12-conditionals-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 27 -> 29` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 467 | s12-conditionals-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 27 -> 31` | 成員目標（不再殺除） | FR-001 |  |
| 468 | s12-conditionals-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para2: 29 -> 31` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 469 | s13-functions-1-finish | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 chooseName.gen −para@n44、chooseName.mustKill −para、chooseName.upwardExposed +para |
| 470 | s13-functions-1-finish | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para |
| 471 | s13-functions-1-finish | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para |
| 472 | s13-functions-1-finish | inter-page | *.dupairs.dot | pair | + | `para: 12 -> 17` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 473 | s13-functions-1-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `para: 12 -> 17` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 474 | s13-functions-1-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 12 -> 17` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 475 | s14-functions-3 | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 chooseName.gen −para@n44、chooseName.mustKill −para、chooseName.upwardExposed +para |
| 476 | s14-functions-3 | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para |
| 477 | s14-functions-3 | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para |
| 478 | s14-functions-3 | inter-page | *.dupairs.dot | pair | + | `para: 12 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 479 | s14-functions-3 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `para: 12 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 480 | s14-functions-3 | page0 | intra-pages/*.dupairs.dot | pair | + | `para: 12 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 481 | s15-math-1-finish | inter-page | *.dupairs.dot | pair | + | `para1: 18 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 482 | s15-math-1-finish | inter-page | *.dupairs.dot | pair | + | `para1: 18 -> 28` | 成員目標（不再殺除） | FR-001 |  |
| 483 | s15-math-1-finish | inter-page | *.dupairs.dot | pair | - | `para1: 21 -> 28` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 484 | s15-math-1-finish | inter-page | *.dupairs.dot | pair | + | `para2: 22 -> 27` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 485 | s15-math-1-finish | inter-page | *.dupairs.dot | pair | + | `para2: 22 -> 29` | 成員目標（不再殺除） | FR-001 |  |
| 486 | s15-math-1-finish | inter-page | *.dupairs.dot | pair | - | `para2: 27 -> 29` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 487 | s15-math-1-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 18 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 488 | s15-math-1-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 18 -> 28` | 成員目標（不再殺除） | FR-001 |  |
| 489 | s15-math-1-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para1: 21 -> 28` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 490 | s15-math-1-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 22 -> 27` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 491 | s15-math-1-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para2: 22 -> 29` | 成員目標（不再殺除） | FR-001 |  |
| 492 | s15-math-1-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para2: 27 -> 29` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 493 | s15-math-1-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 18 -> 21` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 494 | s15-math-1-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 18 -> 28` | 成員目標（不再殺除） | FR-001 |  |
| 495 | s15-math-1-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para1: 21 -> 28` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 496 | s15-math-1-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 22 -> 27` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 497 | s15-math-1-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para2: 22 -> 29` | 成員目標（不再殺除） | FR-001 |  |
| 498 | s15-math-1-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para2: 27 -> 29` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 499 | s16-objects-2-finish | inter-page | *.dupairs.dot | pair | + | `para1: 34 -> 35` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 500 | s16-objects-2-finish | inter-page | *.dupairs.dot | pair | + | `para1: 34 -> 36` | 成員目標（不再殺除） | FR-001 |  |
| 501 | s16-objects-2-finish | inter-page | *.dupairs.dot | pair | - | `para1: 35 -> 36` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 502 | s16-objects-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 34 -> 35` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 503 | s16-objects-2-finish | page0 | intra-pages/*.dupairs.dot | pair | + | `para1: 34 -> 36` | 成員目標（不再殺除） | FR-001 |  |
| 504 | s16-objects-2-finish | page0 | intra-pages/*.dupairs.dot | pair | - | `para1: 35 -> 36` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 505 | s16-objects-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 34 -> 35` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 506 | s16-objects-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | + | `para1: 34 -> 36` | 成員目標（不再殺除） | FR-001 |  |
| 507 | s16-objects-2-finish | page0 | intra-procedurals/*.dupairs.dot | pair | - | `para1: 35 -> 36` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 508 | s17-string-methods-3 | inter-page | *.dupairs.dot | pair | + | `listItem: 15 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 509 | s17-string-methods-3 | inter-page | *.dupairs.dot | pair | + | `listItem: 15 -> 17` | 成員目標（不再殺除） | FR-001 |  |
| 510 | s17-string-methods-3 | inter-page | *.dupairs.dot | pair | - | `listItem: 16 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 511 | s17-string-methods-3 | page0 | intra-pages/*.dupairs.dot | pair | + | `listItem: 15 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 512 | s17-string-methods-3 | page0 | intra-pages/*.dupairs.dot | pair | + | `listItem: 15 -> 17` | 成員目標（不再殺除） | FR-001 |  |
| 513 | s17-string-methods-3 | page0 | intra-pages/*.dupairs.dot | pair | - | `listItem: 16 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 514 | s17-string-methods-3 | page0 | intra-procedurals/*.dupairs.dot | pair | + | `listItem: 15 -> 16` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 515 | s17-string-methods-3 | page0 | intra-procedurals/*.dupairs.dot | pair | + | `listItem: 15 -> 17` | 成員目標（不再殺除） | FR-001 |  |
| 516 | s17-string-methods-3 | page0 | intra-procedurals/*.dupairs.dot | pair | - | `listItem: 16 -> 17` | 屬性寫入→讀取損失 | D001、FR-009 | whole-object read |
| 517 | s18-target-currenttarget | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 handleClick.gen −output@n63、handleClick.mustKill −output |
| 518 | s18-target-currenttarget | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 handleClick.gen −output@n30、handleClick.mustKill −output |
| 519 | s18-target-currenttarget | inter-page | *.dupairs.dot | pair | - | `output: 6 -> 6` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 520 | s18-target-currenttarget | page0 | intra-pages/*.dupairs.dot | pair | - | `output: 6 -> 6` | 屬性寫入→讀取損失 | D001、FR-009 | member read [textContent] overlaps write [textContent] |
| 521 | x01-bouncing-cycle | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 loop.gen −ctx@n257、loop.exceptional −ctx@n257、loop.mustKill −ctx、loop.upwardExposed +ctx |
| 522 | x01-bouncing-cycle | page0 | inter-procedurals/2.matching.json | matching | ~ | `inter-procedurals/2.matching.json` | 成員目標（摘要） | FR-003 | 摘要 loop.gen −ctx@n77、loop.exceptional −ctx@n77、loop.mustKill −ctx、loop.upwardExposed +ctx |
| 523 | x01-bouncing-cycle | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 loop.gen −ctx@n77、loop.exceptional −ctx@n77、loop.mustKill −ctx、loop.upwardExposed +ctx |
| 524 | x01-bouncing-cycle | inter-page | *.dupairs.dot | pair | + | `ball: 62 -> call (69)` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 525 | x01-bouncing-cycle | inter-page | *.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 526 | x01-bouncing-cycle | inter-page | *.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 527 | x01-bouncing-cycle | inter-page | *.dupairs.dot | pair | + | `ctx: 5 -> 96` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 528 | x01-bouncing-cycle | inter-page | *.dupairs.dot | pair | + | `ctx: 5 -> 97` | 成員目標（不再殺除） | FR-001 |  |
| 529 | x01-bouncing-cycle | inter-page | *.dupairs.dot | pair | - | `ctx: 96 -> 97` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 530 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 62 -> call (69)` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 531 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 532 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 533 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 5 -> 96` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 534 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ctx: 5 -> 97` | 成員目標（不再殺除） | FR-001 |  |
| 535 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `ctx: 96 -> 97` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 536 | x01-bouncing-cycle | page0 | intra-pages/*.dupairs.dot | pair | + | `ball: 62 -> call (69)` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 537 | x01-bouncing-cycle | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 538 | x01-bouncing-cycle | page0 | intra-pages/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 539 | x01-bouncing-cycle | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 5 -> 96` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 540 | x01-bouncing-cycle | page0 | intra-pages/*.dupairs.dot | pair | + | `ctx: 5 -> 97` | 成員目標（不再殺除） | FR-001 |  |
| 541 | x01-bouncing-cycle | page0 | intra-pages/*.dupairs.dot | pair | - | `ctx: 96 -> 97` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |
| 542 | x01-bouncing-cycle | page0 | intra-procedurals/*.dupairs.dot | pair | + | `ball: 62 -> 69` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 543 | x01-bouncing-cycle | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 7` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 544 | x01-bouncing-cycle | page0 | intra-procedurals/*.dupairs.dot | pair | + | `canvas: 4 -> 8` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 545 | x01-bouncing-cycle | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 34 -> 35` | 成員目標（修正） | FR-001 | reads (method [arc]) miss writes ([fillStyle]) |
| 546 | x01-bouncing-cycle | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 34 -> 36` | 成員目標（修正） | FR-001 | reads (method [fill]) miss writes ([fillStyle]) |
| 547 | x01-bouncing-cycle | page0 | intra-procedurals/*.dupairs.dot | pair | - | `ctx: 96 -> 97` | 成員目標（修正） | FR-001 | reads (method [fillRect]) miss writes ([fillStyle]) |

## 段結構改變行

| case | 頁 | 模型檔 | 行 | 基準段標記數 | 008 段標記數 | 簽核 |
|------|----|--------|----|--------------|--------------|------|
| a05-assessment-main | inter-page | *.graph.dot | 121 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 122 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 123 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 124 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 125 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 129 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 130 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 133 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 137 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 138 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 141 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 147 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 148 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 149 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 150 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 151 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 153 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 154 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 155 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 156 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 199 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 200 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | 201 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | entry | 7 | 10 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | inter-page | *.graph.dot | exit | 7 | 10 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 121 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 122 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 123 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 124 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 125 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 129 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 130 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 133 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 137 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 138 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 141 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 147 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 148 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 149 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 150 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 151 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 153 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 154 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 155 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 156 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 199 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 200 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | 201 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | inter-procedurals/*.graph.dot | entry | 6 | 9 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 121 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 122 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 123 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 124 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 125 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 129 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 130 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 133 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 137 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 138 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 141 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 147 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 148 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 149 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 150 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 151 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 153 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 154 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 155 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 156 | 0 | 1 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 199 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 200 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | 201 | 1 | 2 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | entry | 7 | 10 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |
| a05-assessment-main | page0 | intra-pages/*.graph.dot | exit | 7 | 10 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核） |

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 008 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| a04-bouncing-main-finished | inter-page | 0.dupairs.dot | 7 | 7 | 0 |
| a04-bouncing-main-finished | page0 | inter-procedurals/1.dupairs.dot | 7 | 7 | 0 |
| a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | 7 | 7 | 0 |
| a05-assessment-main | inter-page | 0.dupairs.dot | 8 | 8 | 0 |
| a05-assessment-main | page0 | inter-procedurals/1.dupairs.dot | 8 | 0 | -8 |
| a05-assessment-main | page0 | inter-procedurals/2.dupairs.dot | 0 | 8 | +8 |
| a05-assessment-main | page0 | intra-pages/0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | inter-page | 0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | page0 | intra-pages/0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | page0 | intra-procedurals/0.dupairs.dot | 8 | 8 | 0 |
| s04c-for-loop-cats | inter-page | 0.dupairs.dot | 7 | 7 | 0 |
| s04c-for-loop-cats | page0 | intra-pages/0.dupairs.dot | 7 | 7 | 0 |
| s04c-for-loop-cats | page0 | intra-procedurals/0.dupairs.dot | 7 | 7 | 0 |
| s07-gallery-finish | inter-page | 0.dupairs.dot | 2 | 4 | +2 |
| s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | 2 | 4 | +2 |
| s10-allowance-updater | inter-page | 0.dupairs.dot | 8 | 9 | +1 |
| s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | 8 | 9 | +1 |
| s11-calculating-squares | inter-page | 0.dupairs.dot | 4 | 4 | 0 |
| s11-calculating-squares | page0 | intra-pages/0.dupairs.dot | 4 | 4 | 0 |
| s11-calculating-squares | page0 | intra-procedurals/1.dupairs.dot | 4 | 4 | 0 |
| x01-bouncing-cycle | inter-page | 0.dupairs.dot | 7 | 7 | 0 |
| x01-bouncing-cycle | page0 | inter-procedurals/2.dupairs.dot | 7 | 7 | 0 |
| x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | 7 | 7 | 0 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| a03-bouncing-main | inter-page | 成員目標 | 定義性成員目標 canvas L7、L8 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`canvas: 4 -> 7`、`canvas: 4 -> 8` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#1、#2） |
| a03-bouncing-main | page0 | 成員目標 | 定義性成員目標 canvas L7、L8 | 4 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`canvas: 4 -> 7`、`canvas: 4 -> 8` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#3、#4、#5、#6） |
| a04-bouncing-main-finished | inter-page | 成員目標（摘要） | 定義性成員目標 ball L68；canvas L7、L8；ctx L34、L94 | 1 | 3 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` loop.gen −ctx@n244、loop.exceptional −ctx@n244、loop.mustKill −ctx、loop.upwardExposed +ctx | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#7） |
| a04-bouncing-main-finished | page0 | 成員目標（摘要） | 定義性成員目標 ball L68；canvas L7、L8；ctx L34、L94 | 2 | 6 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`inter-procedurals/1.matching.json` loop.gen −ctx@n76、loop.exceptional −ctx@n76、loop.mustKill −ctx、loop.upwardExposed +ctx；`intra-pages/0.matching.json` loop.gen −ctx@n76、loop.exceptional −ctx@n76、loop.mustKill −ctx、loop.upwardExposed +ctx | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#8、#9） |
| a04-bouncing-main-finished | inter-page | 成員目標 | 定義性成員目標 ball L68；canvas L7、L8；ctx L34、L94 | 4 | 1 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 3 筆：`canvas: 4 -> 7`、`canvas: 4 -> 8`、`ctx: 5 -> 94`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 1 筆：`ctx: 5 -> 95`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 1 筆：`ctx: 94 -> 95` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#10、#11、#12、#13、#14） |
| a04-bouncing-main-finished | page0 | 成員目標 | 定義性成員目標 ball L68；canvas L7、L8；ctx L34、L94 | 12 | 5 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 10 筆：`ball: 61 -> call (68)`、`canvas: 4 -> 7`、`canvas: 4 -> 8`、`ctx: 5 -> 94`、`ball: 61 -> 68`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 2 筆：`ctx: 5 -> 95`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 5 筆：`ctx: 94 -> 95`、`ctx: 34 -> 35`、`ctx: 34 -> 36` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#15、#16、#17、#18、#19、#20、#21、#22、#23、#24、#25、#26、#27、#28、#29、#30、#31） |
| a05-assessment-main | inter-page | 放寬 | L199 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_7；L200 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_8；L201 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_9 | 27 | 6 | L199 `evilBall.draw()`、L200 `evilBall.checkBounds()`、L201 `evilBall.collisionDetect()` 在 `loop` 內呼叫頂層 `const evilBall = new EvilCircle(…)`（L185）的方法，`loop` 內沒有 `evilBall` 的到達定義；FR-004 放寬後分別連到 `EvilCircle` 的 `draw`（$ANONYMOUS_FUN_7，L120）、`checkBounds`（$ANONYMOUS_FUN_8，L128）、`collisionDetect`（$ANONYMOUS_FUN_9，L146）。+：三個方法帶出的列與 pair——`dx`、`dy`、`distance` 三列（#46–#48）、`Math: entry -> 124`／`151`、`balls: 166 -> 147`、`count: 7／155／181 -> 155`、`count: 155 -> 156`、`dx: 149 -> 151`、`dy: 150 -> 151`、`distance: 151 -> (153,…)`、`height: 13 -> (137,…)`、`width: 12 -> (129,…)`；`evilBall: call (185)_a -> call (199)`／`call (200)`／`call (201)`（#80–#82，use 端成為呼叫節點）；#41 摘要 `loop.gen`／`exceptional +count@n474`、`loop.upwardExposed +Math`／`+count`／`+para`（新連結 $ANONYMOUS_FUN_7／$ANONYMOUS_FUN_9，D024 第 5 條）與 `+ctx`（L188 成員目標讀到 `ctx`，D023 (b)(3)）共 6 元素，新鍵 $ANONYMOUS_FUN_7–9。−：`evilBall: call (185)_a -> 199`／`200`／`201`（#77–#79，與 #80–#82 為同一 pair 改標，D023 (a)）；#41 摘要 `loop.gen`／`exceptional −ctx@n434`、`loop.mustKill −ctx`（L188 `ctx.fillStyle = …` 不再定義 `ctx`，D023 (b)(1)(2)）。graph ~（#32）為呼叫節點拆分與節點重編號 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#32、#41、#46、#47、#48、#49、#50、#58、#61、#62、#63、#64、#73、#74、#75、#76、#77、#78、#79、#80、#81、#82、#83、#84、#87、#88） |
| a05-assessment-main | page0 | 放寬 | L199 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_7；L200 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_8；L201 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_9 | 55 | 12 | 同 inter-page 的觸發（L199–L201 → `EvilCircle` 的 `draw`／`checkBounds`／`collisionDetect`，$ANONYMOUS_FUN_7–9）。inter-procedurals 依 mainScope 配對（D024）：基準 `1`（$PAGE_0）→ 008 `2`（#43）、基準 `2` → 008 `3`（#44）；008 `1` 是以 `loop` 為 mainScope 的新模型（#42 matching +），模型數 +1 記為 #37（`inter-procedurals/3.dupairs.dot`）；graph／hierarchy ~／+ 為 #33–#36、#38–#40。+：inter-procedurals 與 intra-pages 各有同 inter-page 的列與 pair（`dx`、`dy`、`distance` 列，`Math`、`balls`、`count`、`dx`、`dy`、`distance`、`height`、`width` 的 pair，`evilBall: call (185)_a -> call (199)`／`(200)`／`(201)`）；#43、#45 摘要各 +6（同 inter-page #41）。−：兩層的 `evilBall: call (185)_a -> 199`／`200`／`201` 各 3 筆（與 `call (199)`… 為同一 pair 改標，D023 (a)）；#43、#45 摘要各 −3（`loop.gen`／`exceptional −ctx@n108`、`loop.mustKill −ctx`） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#33、#34、#35、#36、#37、#38、#39、#40、#42、#43、#44、#45、#89、#90、#99、#102、#103、#104、#105、#114、#115、#116、#117、#118、#119、#120、#121、#122、#123、#124、#125、#128、#129、#130、#131、#132、#133、#134、#142、#145、#146、#147、#148、#157、#158、#159、#160、#161、#162、#163、#164、#165、#166、#167、#168、#171、#172） |
| a05-assessment-main | inter-page | 成員目標 | 定義性成員目標 ball L86、L154；canvas L12、L13；ctx L51、L122、L123、L188；para L156、L182 | 18 | 1 | 觸發行的成員賦值不再定義物件變數。不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 10 筆：`ball: 147 -> (148,147)`、`ball: 147 -> (148,149)`、`ball: 147 -> (153,147)`、`ball: 147 -> (153,154)`、`ball: 147 -> 149`、`ball: 147 -> 150`、`ctx: 10 -> 121`、`ctx: 10 -> 124`、`ctx: 10 -> 125`、`ctx: 10 -> 189`；新增讀取（成員目標改為讀取物件變數，FR-002） 8 筆：`ball: 147 -> 154`、`canvas: 9 -> 12`、`canvas: 9 -> 13`、`ctx: 10 -> 122`、`ctx: 10 -> 123`、`ctx: 10 -> 188`、`para: 6 -> 156`、`para: 6 -> 182`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 1 筆：`ctx: 188 -> 189`；部分 pair 亦符 `放寬`（在 L199–L201 新連結的方法內）；其中 `ball: 147 -> …`（#51–#56 及 page0 對應列）實因放寬（FR-004），見簽核備註 D026、KI §52 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#51、#52、#53、#54、#55、#56、#57、#59、#60、#65、#66、#67、#68、#69、#70、#71、#72、#85、#86） |
| a05-assessment-main | page0 | 成員目標 | 定義性成員目標 ball L86、L154；canvas L12、L13；ctx L51、L122、L123、L188；para L156、L182 | 42 | 7 | 觸發行的成員賦值不再定義物件變數。不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 20 筆：`ball: 147 -> (148,147)`、`ball: 147 -> (148,149)`、`ball: 147 -> (153,147)`、`ball: 147 -> (153,154)`、`ball: 147 -> 149`、`ball: 147 -> 150`、`ctx: 10 -> 121`、`ctx: 10 -> 124`、`ctx: 10 -> 125`、`ctx: 10 -> 189`；新增讀取（成員目標改為讀取物件變數，FR-002） 22 筆：`ball: 147 -> 154`、`ball: 79 -> call (86)`、`canvas: 9 -> 12`、`canvas: 9 -> 13`、`ctx: 10 -> 122`、`ctx: 10 -> 123`、`ctx: 10 -> 188`、`para: 6 -> 156`、`para: 6 -> 182`、`ball: 79 -> 86`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 7 筆：`ctx: 188 -> 189`、`ctx: 123 -> 124`、`ctx: 123 -> 125`、`ctx: 51 -> 52`、`ctx: 51 -> 53`；部分 pair 亦符 `放寬`（在 L199–L201 新連結的方法內）；其中 `ball: 147 -> …`（#51–#56 及 page0 對應列）實因放寬（FR-004），見簽核備註 D026、KI §52 | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#91、#92、#93、#94、#95、#96、#97、#98、#100、#101、#106、#107、#108、#109、#110、#111、#112、#113、#126、#127、#135、#136、#137、#138、#139、#140、#141、#143、#144、#149、#150、#151、#152、#153、#154、#155、#156、#169、#170、#173、#174、#175、#176、#177、#178、#179、#180、#181、#182） |
| s01-math-3-finish | inter-page | 成員目標 | 定義性成員目標 para1 L29；para2 L31；para3 L33 | 6 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 3 筆：`para1: 17 -> 29`、`para2: 18 -> 31`、`para3: 19 -> 33`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 3 筆：`para1: 17 -> 30`、`para2: 18 -> 32`、`para3: 19 -> 34` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#183、#184、#186、#187、#189、#190） |
| s01-math-3-finish | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 para1 L29；para2 L31；para3 L33 | 0 | 3 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 29 -> 30`、`para2: 31 -> 32`、`para3: 33 -> 34`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#185、#188、#191） |
| s01-math-3-finish | page0 | 成員目標 | 定義性成員目標 para1 L29；para2 L31；para3 L33 | 12 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 6 筆：`para1: 17 -> 29`、`para2: 18 -> 31`、`para3: 19 -> 33`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 6 筆：`para1: 17 -> 30`、`para2: 18 -> 32`、`para3: 19 -> 34` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#192、#193、#195、#196、#198、#199、#201、#202、#204、#205、#207、#208） |
| s01-math-3-finish | page0 | 屬性寫入→讀取損失 | 定義性成員目標 para1 L29；para2 L31；para3 L33 | 0 | 6 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 29 -> 30`、`para2: 31 -> 32`、`para3: 33 -> 34`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#194、#197、#200、#203、#206、#209） |
| s02-conditionals-3-finish | inter-page | 成員目標 | 定義性成員目標 para1 L21；para2 L22 | 4 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para1: 19 -> 21`、`para2: 20 -> 22`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 2 筆：`para1: 19 -> 23`、`para2: 20 -> 24` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#210、#211、#213、#214） |
| s02-conditionals-3-finish | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 para1 L21；para2 L22 | 0 | 2 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 21 -> 23`、`para2: 22 -> 24`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#212、#215） |
| s02-conditionals-3-finish | page0 | 成員目標 | 定義性成員目標 para1 L21；para2 L22 | 8 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`para1: 19 -> 21`、`para2: 20 -> 22`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 4 筆：`para1: 19 -> 23`、`para2: 20 -> 24` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#216、#217、#219、#220、#222、#223、#225、#226） |
| s02-conditionals-3-finish | page0 | 屬性寫入→讀取損失 | 定義性成員目標 para1 L21；para2 L22 | 0 | 4 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 21 -> 23`、`para2: 22 -> 24`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#218、#221、#224、#227） |
| s03-loops-2-finish | inter-page | 成員目標 | 定義性成員目標 para L21、L26 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para: 3 -> 21`、`para: 3 -> 26` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#228、#229） |
| s03-loops-2-finish | page0 | 成員目標 | 定義性成員目標 para L21、L26 | 4 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`para: 3 -> 21`、`para: 3 -> 26` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#230、#231、#232、#233） |
| s04a-while-loop-cats | inter-page | 成員目標 | 定義性成員目標 pElem L19 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`pElem: 3 -> 19` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#234） |
| s04a-while-loop-cats | page0 | 成員目標 | 定義性成員目標 pElem L19 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`pElem: 3 -> 19` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#235、#236） |
| s04b-do-while-loop-cats | inter-page | 成員目標 | 定義性成員目標 pElem L19 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`pElem: 3 -> 19` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#237） |
| s04b-do-while-loop-cats | page0 | 成員目標 | 定義性成員目標 pElem L19 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`pElem: 3 -> 19` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#238、#239） |
| s04c-for-loop-cats | inter-page | 成員目標 | 定義性成員目標 pElem L16 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`pElem: 3 -> 16` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#240） |
| s04c-for-loop-cats | page0 | 成員目標 | 定義性成員目標 pElem L16 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`pElem: 3 -> 16` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#241、#242） |
| s05-switch-example | inter-page | 成員目標（摘要） | 定義性成員目標 para L12、L16、L20、L24、L28 | 1 | 6 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` setWeather.gen −para@n68、setWeather.gen −para@n70、setWeather.gen −para@n72、setWeather.gen −para@n74、setWeather.gen −para@n76、setWeather.mustKill −para、setWeather.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#243） |
| s05-switch-example | page0 | 成員目標（摘要） | 定義性成員目標 para L12、L16、L20、L24、L28 | 1 | 6 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`intra-pages/0.matching.json` setWeather.gen −para@n21、setWeather.gen −para@n23、setWeather.gen −para@n25、setWeather.gen −para@n27、setWeather.gen −para@n29、setWeather.mustKill −para、setWeather.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#244） |
| s05-switch-example | inter-page | 成員目標 | 定義性成員目標 para L12、L16、L20、L24、L28 | 5 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 5 筆：`para: 3 -> 12`、`para: 3 -> 16`、`para: 3 -> 20`、`para: 3 -> 24`、`para: 3 -> 28` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#245、#246、#247、#248、#249） |
| s05-switch-example | page0 | 成員目標 | 定義性成員目標 para L12、L16、L20、L24、L28 | 5 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 5 筆：`para: 3 -> 12`、`para: 3 -> 16`、`para: 3 -> 20`、`para: 3 -> 24`、`para: 3 -> 28` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#250、#251、#252、#253、#254） |
| s06a-exiting-loops-break | inter-page | 成員目標（摘要） | 定義性成員目標 input L15；para L17、L21、L26 | 1 | 9 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` $ANONYMOUS_FUN_0.gen −input@n79、$ANONYMOUS_FUN_0.gen −para@n81、$ANONYMOUS_FUN_0.gen −para@n85、$ANONYMOUS_FUN_0.gen −para@n87、$ANONYMOUS_FUN_0.exceptional −input@n79、$ANONYMOUS_FUN_0.exceptional −para@n81、$ANONYMOUS_FUN_0.exceptional −para@n85、$ANONYMOUS_FUN_0.mustKill −input、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#255） |
| s06a-exiting-loops-break | page0 | 成員目標（摘要） | 定義性成員目標 input L15；para L17、L21、L26 | 1 | 9 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`intra-pages/0.matching.json` $ANONYMOUS_FUN_0.gen −input@n29、$ANONYMOUS_FUN_0.gen −para@n31、$ANONYMOUS_FUN_0.gen −para@n35、$ANONYMOUS_FUN_0.gen −para@n37、$ANONYMOUS_FUN_0.exceptional −input@n29、$ANONYMOUS_FUN_0.exceptional −para@n31、$ANONYMOUS_FUN_0.exceptional −para@n35、$ANONYMOUS_FUN_0.mustKill −input、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#256） |
| s06a-exiting-loops-break | inter-page | 成員目標 | 定義性成員目標 input L15；para L17、L21、L26 | 7 | 1 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`input: 10 -> 15`、`para: 9 -> 17`、`para: 9 -> 21`、`para: 9 -> 26`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 3 筆：`input: 10 -> 16`、`para: 9 -> (25,26)`、`para: 9 -> (25,exit_b)`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 1 筆：`input: 15 -> 16` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#257、#258、#260、#265、#266、#267、#268、#269） |
| s06a-exiting-loops-break | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 input L15；para L17、L21、L26 | 0 | 5 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`input: 15 -> 14`、`para: 17 -> (25,26)`、`para: 17 -> (25,exit_b)`、`para: 21 -> (25,26)`、`para: 21 -> (25,exit_b)`（member read [value.toLowerCase] overlaps write [value]／member read [textContent] overlaps write [textContent]） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#259、#261、#262、#263、#264） |
| s06a-exiting-loops-break | page0 | 成員目標 | 定義性成員目標 input L15；para L17、L21、L26 | 7 | 2 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`input: 10 -> 15`、`para: 9 -> 17`、`para: 9 -> 21`、`para: 9 -> 26`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 3 筆：`input: 10 -> 16`、`para: 9 -> (25,26)`、`para: 9 -> (25,exit_b)`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 2 筆：`input: 15 -> 16` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#270、#271、#273、#278、#279、#280、#281、#282、#283） |
| s06a-exiting-loops-break | page0 | 屬性寫入→讀取損失 | 定義性成員目標 input L15；para L17、L21、L26 | 0 | 9 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`input: 15 -> 14`、`para: 17 -> (25,26)`、`para: 17 -> (25,exit_b)`、`para: 21 -> (25,26)`、`para: 21 -> (25,exit_b)`、`para: 17 -> (25,exit)`、`para: 21 -> (25,exit)`（member read [value.toLowerCase] overlaps write [value]／member read [textContent] overlaps write [textContent]） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#272、#274、#275、#276、#277、#284、#285、#286、#287） |
| s06b-silly-story-finish | inter-page | 成員目標（摘要） | 定義性成員目標 story L54 | 1 | 3 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` generateStory.gen −story@n177、generateStory.exceptional −story@n177、generateStory.mustKill −story、generateStory.upwardExposed +story | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#288） |
| s06b-silly-story-finish | page0 | 成員目標（摘要） | 定義性成員目標 story L54 | 1 | 3 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`intra-pages/0.matching.json` generateStory.gen −story@n65、generateStory.exceptional −story@n65、generateStory.mustKill −story、generateStory.upwardExposed +story | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#289） |
| s06b-silly-story-finish | inter-page | 成員目標 | 定義性成員目標 story L54 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`story: 6 -> 54`、`story: 6 -> 55` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#290、#291） |
| s06b-silly-story-finish | page0 | 成員目標 | 定義性成員目標 story L54 | 2 | 1 | 觸發行的成員賦值不再定義物件變數。列消失（該列的 def 只剩成員目標，整列消失，FR-001） 1 筆：列 `story`；新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`story: 6 -> 54`、`story: 6 -> 55` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#292、#293、#294） |
| s07-gallery-finish | inter-page | 成員目標（摘要） | 定義性成員目標 btn L60、L65；displayedImage L49、L50；newImage L29、L30、L32 | 3 | 10 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` $ANONYMOUS_FUN_1.gen −btn@n136、$ANONYMOUS_FUN_1.gen −btn@n139、$ANONYMOUS_FUN_1.exceptional −btn@n136、$ANONYMOUS_FUN_1.exceptional −btn@n139、$ANONYMOUS_FUN_1.mustKill −btn、$ANONYMOUS_FUN_1.upwardExposed +overlay、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.gen −displayedImage@n122、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.exceptional −displayedImage@n121、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.upwardExposed +displayedImage、updateDisplayedImage.gen −displayedImage@n122、updateDisplayedImage.exceptional −displayedImage@n121、updateDisplayedImage.mustKill −displayedImage、updateDisplayedImage.upwardExposed +displayedImage | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#295） |
| s07-gallery-finish | page0 | 成員目標（摘要） | 定義性成員目標 btn L60、L65；displayedImage L49、L50；newImage L29、L30、L32 | 4 | 13 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`inter-procedurals/0.matching.json` updateDisplayedImage.gen −displayedImage@n72、updateDisplayedImage.exceptional −displayedImage@n71、updateDisplayedImage.mustKill −displayedImage、updateDisplayedImage.upwardExposed +displayedImage；`intra-pages/0.matching.json` $ANONYMOUS_FUN_1.gen −btn@n78、$ANONYMOUS_FUN_1.gen −btn@n81、$ANONYMOUS_FUN_1.exceptional −btn@n78、$ANONYMOUS_FUN_1.exceptional −btn@n81、$ANONYMOUS_FUN_1.mustKill −btn、$ANONYMOUS_FUN_1.upwardExposed +overlay、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.gen −displayedImage@n64、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.exceptional −displayedImage@n63、$BLOCK_0.$BLOCK_1.$ANONYMOUS_FUN_0.upwardExposed +displayedImage、updateDisplayedImage.gen −displayedImage@n64、updateDisplayedImage.exceptional −displayedImage@n63、updateDisplayedImage.mustKill −displayedImage、updateDisplayedImage.upwardExposed +displayedImage | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#296、#297） |
| s07-gallery-finish | inter-page | 成員目標 | 定義性成員目標 btn L60、L65；displayedImage L49、L50；newImage L29、L30、L32 | 13 | 8 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 9 筆：`btn: 5 -> 60`、`btn: 5 -> 65`、`displayedImage: 2 -> 49abab`、`displayedImage: 2 -> 50abab`、`newImage: 27 -> 29`、`newImage: 27 -> 30`、`newImage: 27 -> 32`、`overlay: 6 -> 61`、`overlay: 6 -> 66`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 4 筆：`btn: 5 -> 69`、`newImage: 27 -> 34`、`newImage: 27 -> 36`、`newImage: 27 -> 39`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 8 筆：`btn: 60 -> (59,60)`、`btn: 60 -> (59,65)`、`btn: 60 -> 69`、`btn: 65 -> (59,60)`、`btn: 65 -> (59,65)`、`btn: 65 -> 69`、`newImage: 32 -> 36`、`newImage: 32 -> 39` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#298、#299、#300、#301、#302、#303、#304、#305、#306、#307、#308、#309、#310、#311、#312、#313、#314、#316、#317、#318、#319） |
| s07-gallery-finish | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 btn L60、L65；displayedImage L49、L50；newImage L29、L30、L32 | 0 | 1 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`newImage: 32 -> 34`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#315） |
| s07-gallery-finish | page0 | 成員目標 | 定義性成員目標 btn L60、L65；displayedImage L49、L50；newImage L29、L30、L32 | 19 | 13 | 觸發行的成員賦值不再定義物件變數。列消失（該列的 def 只剩成員目標，整列消失，FR-001） 1 筆：列 `displayedImage`；新增讀取（成員目標改為讀取物件變數，FR-002） 12 筆：`btn: 5 -> 60`、`btn: 5 -> 65`、`displayedImage: 2 -> 49abab`、`displayedImage: 2 -> 50abab`、`newImage: 27 -> 29`、`newImage: 27 -> 30`、`newImage: 27 -> 32`、`overlay: 6 -> 61`、`overlay: 6 -> 66`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 7 筆：`btn: 5 -> 69`、`newImage: 27 -> 34`、`newImage: 27 -> 36`、`newImage: 27 -> 39`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 12 筆：`btn: 60 -> (59,60)`、`btn: 60 -> (59,65)`、`btn: 60 -> 69`、`btn: 65 -> (59,60)`、`btn: 65 -> (59,65)`、`btn: 65 -> 69`、`newImage: 32 -> 36`、`newImage: 32 -> 39` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#320、#321、#322、#323、#324、#325、#326、#327、#328、#329、#330、#331、#332、#333、#334、#335、#336、#337、#339、#340、#341、#342、#343、#344、#345、#346、#347、#348、#349、#350、#352、#353） |
| s07-gallery-finish | page0 | 屬性寫入→讀取損失 | 定義性成員目標 btn L60、L65；displayedImage L49、L50；newImage L29、L30、L32 | 0 | 2 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`newImage: 32 -> 34`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#338、#351） |
| s08-number-guessing-game | inter-page | 成員目標（摘要） | 定義性成員目標 guessField L39、L46、L62、L64；guessSubmit L47、L63；guesses L14、L17；lastResult L20、L25、L29；lowOrHi L22、L26、L32、L34；resetButton L49；resetPara L58 | 7 | 35 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` checkGuess.gen −guesses@n181、checkGuess.gen −lastResult@n183、checkGuess.gen −lowOrHi@n185、checkGuess.gen −guessSubmit@n189、checkGuess.gen −resetButton@n191、checkGuess.gen −guessField@n197、checkGuess.gen −lastResult@n200、checkGuess.gen −lowOrHi@n201、checkGuess.gen −lastResult@n204、checkGuess.gen −lowOrHi@n207、checkGuess.gen −lowOrHi@n209、checkGuess.exceptional −guesses@n180、checkGuess.exceptional −guesses@n181、checkGuess.exceptional −lastResult@n183、checkGuess.exceptional −lowOrHi@n185、checkGuess.exceptional −guessField@n188、checkGuess.exceptional −guessSubmit@n189、checkGuess.exceptional −resetButton@n191、checkGuess.exceptional −guessField@n197、checkGuess.exceptional −lastResult@n200、checkGuess.exceptional −lowOrHi@n201、checkGuess.exceptional −lastResult@n204、checkGuess.exceptional −lowOrHi@n207、checkGuess.exceptional −lowOrHi@n209、checkGuess.gen +resetButton@n190、checkGuess.mustKill −guessField、checkGuess.mustKill −guesses、checkGuess.mustKill −lastResult、checkGuess.upwardExposed +guessSubmit、checkGuess.upwardExposed +lastResult、checkGuess.upwardExposed +lowOrHi、setGameOver.gen −guessField@n188、setGameOver.gen −guessSubmit@n189、setGameOver.gen −resetButton@n191、setGameOver.exceptional −guessField@n188、setGameOver.exceptional −guessSubmit@n189、setGameOver.exceptional −resetButton@n191、setGameOver.gen +resetButton@n190、setGameOver.mustKill −guessField、setGameOver.mustKill −guessSubmit、setGameOver.upwardExposed +guessField、setGameOver.upwardExposed +guessSubmit | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#354） |
| s08-number-guessing-game | page0 | 成員目標（摘要） | 定義性成員目標 guessField L39、L46、L62、L64；guessSubmit L47、L63；guesses L14、L17；lastResult L20、L25、L29；lowOrHi L22、L26、L32、L34；resetButton L49；resetPara L58 | 10 | 43 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`inter-procedurals/0.matching.json` setGameOver.gen −guessField@n97、setGameOver.gen −guessSubmit@n98、setGameOver.gen −resetButton@n100、setGameOver.exceptional −guessField@n97、setGameOver.exceptional −guessSubmit@n98、setGameOver.exceptional −resetButton@n100、setGameOver.gen +resetButton@n99、setGameOver.mustKill −guessField、setGameOver.mustKill −guessSubmit、setGameOver.upwardExposed +guessField、setGameOver.upwardExposed +guessSubmit；`intra-pages/0.matching.json` checkGuess.gen −guesses@n53、checkGuess.gen −lastResult@n55、checkGuess.gen −lowOrHi@n57、checkGuess.gen −guessSubmit@n61、checkGuess.gen −resetButton@n63、checkGuess.gen −guessField@n69、checkGuess.gen −lastResult@n72、checkGuess.gen −lowOrHi@n73、checkGuess.gen −lastResult@n76、checkGuess.gen −lowOrHi@n79、checkGuess.gen −lowOrHi@n81、checkGuess.exceptional −guesses@n52、checkGuess.exceptional −guesses@n53、checkGuess.exceptional −lastResult@n55、checkGuess.exceptional −lowOrHi@n57、checkGuess.exceptional −guessField@n60、checkGuess.exceptional −guessSubmit@n61、checkGuess.exceptional −resetButton@n63、checkGuess.exceptional −guessField@n69、checkGuess.exceptional −lastResult@n72、checkGuess.exceptional −lowOrHi@n73、checkGuess.exceptional −lastResult@n76、checkGuess.exceptional −lowOrHi@n79、checkGuess.exceptional −lowOrHi@n81、checkGuess.gen +resetButton@n62、checkGuess.mustKill −guessField、checkGuess.mustKill −guesses、checkGuess.mustKill −lastResult、checkGuess.upwardExposed +guessSubmit、checkGuess.upwardExposed +lastResult、checkGuess.upwardExposed +lowOrHi、setGameOver.gen −guessField@n60、setGameOver.gen −guessSubmit@n61、setGameOver.gen −resetButton@n63、setGameOver.exceptional −guessField@n60、setGameOver.exceptional −guessSubmit@n61、setGameOver.exceptional −resetButton@n63、setGameOver.gen +resetButton@n62、setGameOver.mustKill −guessField、setGameOver.mustKill −guessSubmit、setGameOver.upwardExposed +guessField、setGameOver.upwardExposed +guessSubmit | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#355、#356） |
| s08-number-guessing-game | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 guessField L39、L46、L62、L64；guessSubmit L47、L63；guesses L14、L17；lastResult L20、L25、L29；lowOrHi L22、L26、L32、L34；resetButton L49；resetPara L58 | 0 | 4 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`guessField: 39 -> 12`、`guesses: 14 -> 17`、`guesses: 17 -> 17`、`resetButton: 49 -> 50`（member read [value] overlaps write [value]／member read [textContent] overlaps write [textContent]／whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#357、#364、#365、#379） |
| s08-number-guessing-game | inter-page | 成員目標 | 定義性成員目標 guessField L39、L46、L62、L64；guessSubmit L47、L63；guesses L14、L17；lastResult L20、L25、L29；lowOrHi L22、L26、L32、L34；resetButton L49；resetPara L58 | 17 | 3 | 觸發行的成員賦值不再定義物件變數。修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 3 筆：`guessField: 39 -> 40`、`guessField: 46 -> 12`、`resetButton: 49 -> 51`；新增讀取（成員目標改為讀取物件變數，FR-002） 14 筆：`guessField: 7 -> 39`、`guessField: 7 -> 46`、`guessSubmit: 6 -> 47`、`guesses: 3 -> 14`、`lastResult: 4 -> 20`、`lastResult: 4 -> 21`、`lastResult: 4 -> 25`、`lastResult: 4 -> 29`、`lastResult: 4 -> 30`、`lowOrHi: 5 -> 22`、`lowOrHi: 5 -> 26`、`lowOrHi: 5 -> 32`、`lowOrHi: 5 -> 34`、`resetButton: 48 -> 49`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 3 筆：`guessField: 7 -> 40`、`resetButton: 48 -> 50`、`resetButton: 48 -> 51` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#358、#359、#360、#361、#362、#363、#366、#367、#368、#369、#370、#371、#372、#373、#374、#375、#376、#377、#378、#380） |
| s08-number-guessing-game | page0 | 成員目標 | 定義性成員目標 guessField L39、L46、L62、L64；guessSubmit L47、L63；guesses L14、L17；lastResult L20、L25、L29；lowOrHi L22、L26、L32、L34；resetButton L49；resetPara L58 | 24 | 13 | 觸發行的成員賦值不再定義物件變數。列消失（該列的 def 只剩成員目標，整列消失，FR-001） 5 筆：列 `guessField`、列 `guessSubmit`、列 `guesses`、列 `lastResult`、列 `lowOrHi`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 8 筆：`guessField: 39 -> 40`、`resetButton: 49 -> 51`、`guessField: 46 -> 12`、`guessField: 64 -> 65`；新增讀取（成員目標改為讀取物件變數，FR-002） 17 筆：`resetButton: 48 -> 49`、`guessField: 7 -> 39`、`guessField: 7 -> 46`、`guessSubmit: 6 -> 47`、`guesses: 3 -> 14`、`lastResult: 4 -> 20`、`lastResult: 4 -> 21`、`lastResult: 4 -> 25`、`lastResult: 4 -> 29`、`lastResult: 4 -> 30`、`lowOrHi: 5 -> 22`、`lowOrHi: 5 -> 26`、`lowOrHi: 5 -> 32`、`lowOrHi: 5 -> 34`、`resetPara: 57 -> 58`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 7 筆：`resetButton: 48 -> 50`、`resetButton: 48 -> 51`、`guessField: 7 -> 40` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#381、#382、#383、#384、#385、#386、#388、#389、#390、#392、#394、#395、#396、#397、#398、#399、#402、#403、#404、#405、#406、#407、#408、#409、#410、#411、#412、#413、#414、#416、#417、#418、#420、#421、#422、#424、#425） |
| s08-number-guessing-game | page0 | 屬性寫入→讀取損失 | 定義性成員目標 guessField L39、L46、L62、L64；guessSubmit L47、L63；guesses L14、L17；lastResult L20、L25、L29；lowOrHi L22、L26、L32、L34；resetButton L49；resetPara L58 | 0 | 8 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`guesses: 14 -> 17`、`resetButton: 49 -> 50`、`guessField: 39 -> 12`、`guesses: 17 -> 17`（member read [textContent] overlaps write [textContent]／whole-object read／member read [value] overlaps write [value]） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#387、#391、#393、#400、#401、#415、#419、#423） |
| s10-allowance-updater | inter-page | 成員目標（摘要） | 定義性成員目標 para L23 | 2 | 4 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` $ANONYMOUS_FUN_0.gen −para@n73、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para、updateAllowance.gen −para@n73、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#426） |
| s10-allowance-updater | page0 | 成員目標（摘要） | 定義性成員目標 para L23 | 4 | 8 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`inter-procedurals/0.matching.json` updateAllowance.gen −para@n27、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para；`inter-procedurals/1.matching.json` updateAllowance.gen −para@n41、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para；`intra-pages/0.matching.json` $ANONYMOUS_FUN_0.gen −para@n27、$ANONYMOUS_FUN_0.mustKill −para、$ANONYMOUS_FUN_0.upwardExposed +para、updateAllowance.gen −para@n27、updateAllowance.mustKill −para、updateAllowance.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#427、#428、#429） |
| s10-allowance-updater | inter-page | 成員目標 | 定義性成員目標 para L23 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`para: 3 -> 23abab` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#430） |
| s10-allowance-updater | page0 | 成員目標 | 定義性成員目標 para L23 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para: 3 -> 23`、`para: 3 -> 23abab` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#431、#432） |
| s11-calculating-squares | inter-page | 成員目標（摘要） | 定義性成員目標 results L7、L9、L16 | 1 | 5 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` $ANONYMOUS_FUN_0.gen −results@n82、$ANONYMOUS_FUN_0.mustKill −results、$ANONYMOUS_FUN_0.upwardExposed +results、calculate.gen −results@n78、calculate.exceptional −results@n76、calculate.mustKill −results | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#433） |
| s11-calculating-squares | page0 | 成員目標（摘要） | 定義性成員目標 results L7、L9、L16 | 1 | 5 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`intra-pages/0.matching.json` $ANONYMOUS_FUN_0.gen −results@n35、$ANONYMOUS_FUN_0.mustKill −results、$ANONYMOUS_FUN_0.upwardExposed +results、calculate.gen −results@n31、calculate.exceptional −results@n29、calculate.mustKill −results | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#434） |
| s11-calculating-squares | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 results L7、L9、L16 | 0 | 6 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`results: 16b -> 7`、`results: 16b -> 9`、`results: 7 -> 7`、`results: 7 -> 9`、`results: 9 -> 7`、`results: 9 -> 9`（member read [textContent] overlaps write [textContent]） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#435、#436、#438、#439、#440、#441） |
| s11-calculating-squares | inter-page | 成員目標 | 定義性成員目標 results L7、L9、L16 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`results: 2 -> 16b` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#437） |
| s11-calculating-squares | page0 | 屬性寫入→讀取損失 | 定義性成員目標 results L7、L9、L16 | 0 | 8 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`results: 16b -> 7`、`results: 16b -> 9`、`results: 7 -> 7`、`results: 7 -> 9`、`results: 9 -> 7`、`results: 9 -> 9`（member read [textContent] overlaps write [textContent]） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#442、#443、#445、#446、#447、#448、#449、#450） |
| s11-calculating-squares | page0 | 成員目標 | 定義性成員目標 results L7、L9、L16 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`results: 2 -> 16b` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#444） |
| s12-conditionals-2-finish | inter-page | 成員目標 | 定義性成員目標 para1 L28；para2 L29 | 4 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para1: 26 -> 28`、`para2: 27 -> 29`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 2 筆：`para1: 26 -> 30`、`para2: 27 -> 31` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#451、#452、#454、#455） |
| s12-conditionals-2-finish | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 para1 L28；para2 L29 | 0 | 2 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 28 -> 30`、`para2: 29 -> 31`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#453、#456） |
| s12-conditionals-2-finish | page0 | 成員目標 | 定義性成員目標 para1 L28；para2 L29 | 8 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`para1: 26 -> 28`、`para2: 27 -> 29`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 4 筆：`para1: 26 -> 30`、`para2: 27 -> 31` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#457、#458、#460、#461、#463、#464、#466、#467） |
| s12-conditionals-2-finish | page0 | 屬性寫入→讀取損失 | 定義性成員目標 para1 L28；para2 L29 | 0 | 4 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 28 -> 30`、`para2: 29 -> 31`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#459、#462、#465、#468） |
| s13-functions-1-finish | inter-page | 成員目標（摘要） | 定義性成員目標 para L17 | 1 | 2 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` chooseName.gen −para@n44、chooseName.mustKill −para、chooseName.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#469） |
| s13-functions-1-finish | page0 | 成員目標（摘要） | 定義性成員目標 para L17 | 2 | 4 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`inter-procedurals/0.matching.json` chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para；`intra-pages/0.matching.json` chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#470、#471） |
| s13-functions-1-finish | inter-page | 成員目標 | 定義性成員目標 para L17 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`para: 12 -> 17` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#472） |
| s13-functions-1-finish | page0 | 成員目標 | 定義性成員目標 para L17 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para: 12 -> 17` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#473、#474） |
| s14-functions-3 | inter-page | 成員目標（摘要） | 定義性成員目標 para L21 | 1 | 2 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` chooseName.gen −para@n44、chooseName.mustKill −para、chooseName.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#475） |
| s14-functions-3 | page0 | 成員目標（摘要） | 定義性成員目標 para L21 | 2 | 4 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`inter-procedurals/0.matching.json` chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para；`intra-pages/0.matching.json` chooseName.gen −para@n19、chooseName.mustKill −para、chooseName.upwardExposed +para | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#476、#477） |
| s14-functions-3 | inter-page | 成員目標 | 定義性成員目標 para L21 | 1 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`para: 12 -> 21` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#478） |
| s14-functions-3 | page0 | 成員目標 | 定義性成員目標 para L21 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para: 12 -> 21` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#479、#480） |
| s15-math-1-finish | inter-page | 成員目標 | 定義性成員目標 para1 L21；para2 L27 | 4 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para1: 18 -> 21`、`para2: 22 -> 27`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 2 筆：`para1: 18 -> 28`、`para2: 22 -> 29` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#481、#482、#484、#485） |
| s15-math-1-finish | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 para1 L21；para2 L27 | 0 | 2 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 21 -> 28`、`para2: 27 -> 29`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#483、#486） |
| s15-math-1-finish | page0 | 成員目標 | 定義性成員目標 para1 L21；para2 L27 | 8 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`para1: 18 -> 21`、`para2: 22 -> 27`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 4 筆：`para1: 18 -> 28`、`para2: 22 -> 29` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#487、#488、#490、#491、#493、#494、#496、#497） |
| s15-math-1-finish | page0 | 屬性寫入→讀取損失 | 定義性成員目標 para1 L21；para2 L27 | 0 | 4 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 21 -> 28`、`para2: 27 -> 29`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#489、#492、#495、#498） |
| s16-objects-2-finish | inter-page | 成員目標 | 定義性成員目標 para1 L35 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`para1: 34 -> 35`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 1 筆：`para1: 34 -> 36` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#499、#500） |
| s16-objects-2-finish | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 para1 L35 | 0 | 1 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 35 -> 36`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#501） |
| s16-objects-2-finish | page0 | 成員目標 | 定義性成員目標 para1 L35 | 4 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`para1: 34 -> 35`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 2 筆：`para1: 34 -> 36` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#502、#503、#505、#506） |
| s16-objects-2-finish | page0 | 屬性寫入→讀取損失 | 定義性成員目標 para1 L35 | 0 | 2 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`para1: 35 -> 36`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#504、#507） |
| s17-string-methods-3 | inter-page | 成員目標 | 定義性成員目標 listItem L16 | 2 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 1 筆：`listItem: 15 -> 16`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 1 筆：`listItem: 15 -> 17` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#508、#509） |
| s17-string-methods-3 | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 listItem L16 | 0 | 1 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`listItem: 16 -> 17`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#510） |
| s17-string-methods-3 | page0 | 成員目標 | 定義性成員目標 listItem L16 | 4 | 0 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 2 筆：`listItem: 15 -> 16`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 2 筆：`listItem: 15 -> 17` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#511、#512、#514、#515） |
| s17-string-methods-3 | page0 | 屬性寫入→讀取損失 | 定義性成員目標 listItem L16 | 0 | 2 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`listItem: 16 -> 17`（whole-object read） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#513、#516） |
| s18-target-currenttarget | inter-page | 成員目標（摘要） | 定義性成員目標 output L6 | 0 | 2 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` handleClick.gen −output@n63、handleClick.mustKill −output | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#517） |
| s18-target-currenttarget | page0 | 成員目標（摘要） | 定義性成員目標 output L6 | 0 | 2 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`intra-pages/0.matching.json` handleClick.gen −output@n30、handleClick.mustKill −output | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#518） |
| s18-target-currenttarget | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 output L6 | 0 | 1 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`output: 6 -> 6`（member read [textContent] overlaps write [textContent]） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#519） |
| s18-target-currenttarget | page0 | 屬性寫入→讀取損失 | 定義性成員目標 output L6 | 0 | 1 | 觸發行的成員賦值原為物件變數的定義，到達其後讀取該物件（整個物件或同一屬性）的使用；008 不追屬性，這些 pair 消失（語意上確有資料流，D001 接受的損失，FR-009）：`output: 6 -> 6`（member read [textContent] overlaps write [textContent]） | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#520） |
| x01-bouncing-cycle | inter-page | 成員目標（摘要） | 定義性成員目標 ball L69；canvas L7、L8；ctx L34、L96 | 1 | 3 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`0.matching.json` loop.gen −ctx@n257、loop.exceptional −ctx@n257、loop.mustKill −ctx、loop.upwardExposed +ctx | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#521） |
| x01-bouncing-cycle | page0 | 成員目標（摘要） | 定義性成員目標 ball L69；canvas L7、L8；ctx L34、L96 | 2 | 6 | 成員賦值不再定義物件變數，函式摘要隨之改變（FR-003，D023 (b) 逐元素判準 (1)–(4)）：`inter-procedurals/2.matching.json` loop.gen −ctx@n77、loop.exceptional −ctx@n77、loop.mustKill −ctx、loop.upwardExposed +ctx；`intra-pages/0.matching.json` loop.gen −ctx@n77、loop.exceptional −ctx@n77、loop.mustKill −ctx、loop.upwardExposed +ctx | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#522、#523） |
| x01-bouncing-cycle | inter-page | 成員目標 | 定義性成員目標 ball L69；canvas L7、L8；ctx L34、L96 | 5 | 1 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 4 筆：`ball: 62 -> call (69)`、`canvas: 4 -> 7`、`canvas: 4 -> 8`、`ctx: 5 -> 96`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 1 筆：`ctx: 5 -> 97`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 1 筆：`ctx: 96 -> 97` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#524、#525、#526、#527、#528、#529） |
| x01-bouncing-cycle | page0 | 成員目標 | 定義性成員目標 ball L69；canvas L7、L8；ctx L34、L96 | 13 | 5 | 觸發行的成員賦值不再定義物件變數。新增讀取（成員目標改為讀取物件變數，FR-002） 11 筆：`ball: 62 -> call (69)`、`canvas: 4 -> 7`、`canvas: 4 -> 8`、`ctx: 5 -> 96`、`ball: 62 -> 69`；不再殺除（成員賦值不再殺除物件變數，較早的定義到達其後的使用，FR-001） 2 筆：`ctx: 5 -> 97`；修正（原把成員賦值當物件變數定義而產生的 pair 移除；讀取路徑與寫入路徑不相交，語法層判定，FR-009） 5 筆：`ctx: 96 -> 97`、`ctx: 34 -> 35`、`ctx: 34 -> 36` | 已簽核 2026-11-18（主對話＋Fable 裁判，依使用者授權；合併前使用者可複核）（#530、#531、#532、#533、#534、#535、#536、#537、#538、#539、#540、#541、#542、#543、#544、#545、#546、#547） |


### 簽核備註（D026，主對話＋Fable 裁判獨立核對）

- 簽核方式：依使用者於本 session 的授權由主對話＋Fable 裁判代簽，見 tasks.md T070 的簽核方式註記（D026）；使用者合併前可複核。
- 釘選表 L702、L703（淨差異 #51–#56，`ball: 147 -> (148,147)` 等）主類別記「成員目標（不再殺除）」，實際成因是放寬：L154 `ball.exists = false` 的舊定義本會被 L147 迴圈頭重新定義，原缺 pair 只因 `collisionDetect` 未連結；觸發欄「ball L86、L154」依名稱合併了兩個不同宣告的 `ball`（`Ball.collisionDetect` L79 與 `EvilCircle.collisionDetect` L147）。類別不改，工具判準過寬記於 `docs/known-issues.md` §52。
- 歸「成員目標（修正）」的 `ctx: 94 -> 95`、`188 -> 189`（`fillStyle` 寫入後 `fillRect`）語意上有資料流，屬 FR-009 已聲明的語法層判定（見「分類說明」）。

## CLI exit code（develop → 本 branch）

| id | develop | 本 branch |
|----|---------|-----------|
| a01-oojs-1 | 0 | 0 |
| a01b-oojs-1-solution | 0 | 0 |
| a02-oojs-2 | 0 | 0 |
| a02b-oojs-2-solution | 0 | 0 |
| a03-bouncing-main | 0 | 0 |
| a04-bouncing-main-finished | 0 | 0 |
| a05-assessment-main | 0 | 0 |
| a06-classes-snippets | 0 | 0 |
| a07-prototypes-person | 0 | 0 |
| a08-prototype-chain-dowhile | 0 | 0 |
| s01-math-3-finish | 0 | 0 |
| s02-conditionals-3-finish | 0 | 0 |
| s03-loops-2-finish | 0 | 0 |
| s04a-while-loop-cats | 0 | 0 |
| s04b-do-while-loop-cats | 0 | 0 |
| s04c-for-loop-cats | 0 | 0 |
| s05-switch-example | 0 | 0 |
| s06a-exiting-loops-break | 0 | 0 |
| s06b-silly-story-finish | 0 | 0 |
| s07-gallery-finish | 0 | 0 |
| s08-number-guessing-game | 0 | 0 |
| s09 | 0 | 0 |
| s10-allowance-updater | 0 | 0 |
| s11-calculating-squares | 0 | 0 |
| s12-conditionals-2-finish | 0 | 0 |
| s13-functions-1-finish | 0 | 0 |
| s14-functions-3 | 0 | 0 |
| s15-math-1-finish | 0 | 0 |
| s16-objects-2-finish | 0 | 0 |
| s17-string-methods-3 | 0 | 0 |
| s18-target-currenttarget | 0 | 0 |
| x01-bouncing-cycle | 0 | 0 |

## 可到達性允許清單

MDN 的允許清單項（FR-008）逐項列於此，與 `tests/dujs/cases/reachability-allowlist.json` 相同（T063 填入；`--verify` 不核對本節）。

無（MDN 沒有允許清單項）。

查核方式（T063，US1／US2／US3 後的最終行為）：`npx mocha tests/dujs/reachabilityinvariant.js` 通過（5 passing）——「MDN corpus」載入 32 個 id（33 檔、1218 行），sha256 與 `specs/006-eslint-scope/mdn/README.md` 相同；「every model of the probes, the golden fixtures and the MDN corpus」以檢查器 (a)(b)(c) 全開對 MDN 33 檔的每個模型執行 `check`，再以 `assertInvariant` 對照允許清單：允許清單外 0 違反、0 過期。`tests/dujs/cases/reachability-allowlist.json` 共 18 項，`program` 全為 `probes008/p21-finally.js`、`probes008/p23-finally-summary.js`、`probes008/p24-finally-throw.js`，沒有 MDN 項；全量不變量已涵蓋 MDN 33 檔，MDN 的模型全開無違反。

## Setup

### 變化說明

快照與本 branch 的 lib 相同（`2035c93`）：`diffcheck mdn --verify` 零差異、段結構改變行 0 列，重複列數兩側相同，32 個 id 的 CLI exit code 皆為 0。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| id | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|----|------|---------------------------|------|
| （全部） | （無） | 不變 | Setup 不改 lib |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| （無） |  |  |  |  |

## Polish

### 變化說明

T063（MDN 驗證，FR-010、SC-004）：`node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --report` 對 33 檔與 `specs/008-property-defs-method-calls/mdn/baseline-develop/` 比對，重產上方機器區塊（相對 `2035c93` 的累積淨差異），`--report` exit 0、stderr 空；`mdn --verify specs/008-property-defs-method-calls/mdn-diff.md` exit 0（「通過：547 筆差異皆已記錄且判準成立」）。

- **涵蓋範圍（使用者要求的 MDN 驗收）**：`specs/006-eslint-scope/mdn/corpus/` 全部 33 檔、`pages.json` 的 32 個 id（s09 為兩頁 `s09-first.js`、`s09-second.js`，其他為單頁單檔）。依 `pages.json` 的 id 前綴與 `docs/research/mdn-baseline/validation-004.md` §0.1 的分組：
  - **Advanced JavaScript objects**（10 id／10 檔）：`a01-oojs-1`、`a01b-oojs-1-solution`、`a02-oojs-2`、`a02b-oojs-2-solution`、`a03-bouncing-main`、`a04-bouncing-main-finished`、`a05-assessment-main`、`a06-classes-snippets`、`a07-prototypes-person`、`a08-prototype-chain-dowhile`；
  - **Core Scripting**（21 id／22 檔）：`s01`–`s18`（含 `s04a`／`s04b`／`s04c`、`s06a`／`s06b`；`s09` 兩頁）；
  - **衍生**（1 id／1 檔）：`x01-bouncing-cycle`（a04 加入 `update`↔`collisionDetect` 互相呼叫）。
  全部檔案完成分析：32 個 id 的 CLI exit code 在 develop 與本 branch 皆為 0（「CLI exit code」表，工具比對無變化）。有差異的 id 24 個；`a01`、`a01b`、`a02`、`a02b`、`a06`、`a07`、`a08`、`s09` 8 個 id 與基準逐字相同（無成員賦值定義物件變數的形態，也無新連結）。
- **類別分布**（547 筆，0 筆歸不進類別，`無法到達` 0 筆，KI 類 0 筆）：`成員目標（新增讀取）` 197、`成員目標（不再殺除）` 96、`放寬` 83、`屬性寫入→讀取損失` 78、`成員目標（修正）` 54、`成員目標（摘要）` 32、`成員目標（列消失）` 7；`外溢`、`成員目標（層級新增）`、`共通` 0。依單位：pair 488、matching 37、row 13、graph 8、model 1。與 US2 T056 的只檢查結果（547 筆、同一分布）相同，US3 未改變 MDN 輸出。
- **a05 的放寬（FR-004）**：`a05-assessment-main.js` 的 L199 `evilBall.draw()`、L200 `evilBall.checkBounds()`、L201 `evilBall.collisionDetect()`（dot 行號；`loop` 內）呼叫頂層 `const evilBall = new EvilCircle(…)`（L185）的方法，`loop` 內沒有 `evilBall` 的到達定義，develop 不連結；008 放寬後三個呼叫都有連結。證據（本 branch `node bin/dujs.js -js …/a05-assessment-main.js`，exit 0）：`inter-page/0.matching.json` 的呼叫紀錄 `c14`（callSiteLine 199 → `$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_7`，entry `n445`，其後節點 L121＝`EvilCircle.draw` 的 `ctx.beginPath()`）、`c15`（200 → `$ANONYMOUS_FUN_8`，entry 後 L129＝`checkBounds`）、`c16`（201 → `$ANONYMOUS_FUN_9`，entry 後 L147＝`collisionDetect` 的 `for (const ball of balls)`）；基準 `baseline-develop/a05-assessment-main/inter-page/0.matching.json` 的 callSiteLine 只有 25、169、170、185、206。「釘選與簽核」的 `放寬` 觸發欄同為「L199 → $ANONYMOUS_FUN_7；L200 → $ANONYMOUS_FUN_8；L201 → $ANONYMOUS_FUN_9」。帶出 83 筆 `放寬`（inter-page 釘選 +27／−6、page0 +55／−12）：三個方法內的 `dx`、`dy`、`distance` 列與 `Math`、`balls`、`count`、`height`、`width` 等 pair；`evilBall: call (185)_a -> 199`／`200`／`201` 改標為 `call (199)`／`(200)`／`(201)`（D023 (a)）；inter-procedurals 依 mainScope 配對（D024：基準 `1` → 008 `2`、基準 `2` → 008 `3`，008 `1` 是 `loop` 的新模型）；`loop` 摘要的新連結元素（D024 第 5 條）。另有 `ball`、`ctx`、`para` 的成員目標 pair 落在新連結的方法內（`成員目標` 主類別，亦符 `放寬`）。
- **FR-003 摘要**：32 筆 `成員目標（摘要）`（matching `~`），分布在 a04 3、s05 2、s06a 2、s06b 2、s07 3、s08 3、s10 4、s11 2、s13 3、s14 3、s18 2、x01 3；元素差異皆為 D023 (b) 的四條：函式內成員賦值的物件變數 `v` 從 `gen`／`exceptional` 移除 `v@n`、從 `mustKill` 移除 `v`，`upwardExposed` 新增 `v`（如 s05 `setWeather.gen −para@n68…`、`setWeather.mustKill −para`、`setWeather.upwardExposed +para`；s07 另有 `upwardExposed +overlay`，即 `overlay.style.x = …` 讀到 `overlay`）。a05 的 3 個 matching 檔（inter-page `0`、page0 `intra-pages/0`、`inter-procedurals/1 → 2`）的 `loop.gen`／`exceptional −ctx@n`、`loop.mustKill −ctx`、`loop.upwardExposed +ctx` 同屬此判準，但因同檔有新連結的鍵與元素，整檔歸 `放寬`（D024）。沒有 `normalReturn`／`conservative` 改變或鍵增減的摘要差異。
- **段結構改變行** 74 列，全部在 `a05-assessment-main`（inter-page 25、page0 intra-pages 25、inter-procedurals 24），行為 entry、exit、L121–L125（`draw`）、L129–L141（`checkBounds`）、L147–L156（`collisionDetect`）、L199–L201（呼叫點），皆為三個新連結方法帶出的新段，逐列已簽核（2026-11-18，主對話＋Fable 裁判，依使用者授權）。
- **重複列數**：s07-gallery-finish inter-page、intra-pages 各 +2（2 → 4），s10-allowance-updater 各 +1（8 → 9；`para: 3 -> 23abab` 等亦符 §43），皆來自新增讀取的 pair 落在被多處呼叫的函式內（KI §43 既有重複列機制，不設門檻）；a05 page0 `inter-procedurals/1` −8／`2` +8 是 mainScope 配對造成的檔名位移（數值同為 8）；其餘不變。
- **釘選與簽核**：94 列，簽核欄皆已簽核（2026-11-18，主對話＋Fable 裁判，依使用者授權），「說明」欄已填（類別、子標與涉及的 pair／摘要元素）；a05 inter-page 與 page0 兩列「放寬」的說明為手寫，其餘 92 列由腳本依淨差異產生，簽核時已逐列核對（Fable 手推 41 列並核對段結構列，見「簽核備註」）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| id | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| （全部） | （無） | 不變 | MDN 基準為唯讀快照，本階段不改 `baseline-develop/` 與語料 |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| （無） |  |  |  |  |

## 工具限制

- **D025 的 `changes()` 採集合語意**：摘要逐元素比對前，以同模型 `.graph.dot` 把兩側 `gen`／`exceptional` 的 `v@n` 換成節點標記，再以 `indexOf` 判定某元素是否存在於另一側（集合語意）。同一行、同一變數有多個節點（如同一行兩次寫入 `v`）且兩側標記相同時，換成標記後的多個元素互相遮蔽，可能少計一筆元素差異。判準以行為準（同一行的 `v` 定義是否仍在），影響有界：至多少計同一行、同一變數的重複元素，不會使不同行或不同變數的差異漏判。工具不修改。
