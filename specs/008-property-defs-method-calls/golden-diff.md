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
- 一筆差異只記一個類別（多類成立時說明欄列「亦符」）。`成員目標`（修正／新增讀取／不再殺除／列消失／層級新增）、`成員目標（摘要）`、`屬性寫入→讀取損失`、`外溢`、`放寬` 與 KI 類（`§37`、`§38`、`§41`、`§43`）為釘選類別：「釘選與簽核」表的「說明」欄必填，簽核欄 implementer 只填「草擬，待簽核」；`共通` 為機械判定，不釘選。`無法到達` 無自動觸發，預期 0 筆。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected-es2015 | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_3.gen −state@n156、$ANONYMOUS_FUN_3.exceptional −state@n156、$ANONYMOUS_FUN_4.gen −state@n156、$ANONYMOUS_FUN_4.exceptional −state@n156、init.gen −state@n145、init.exceptional −state@n145、init.upwardExposed +state |
| 2 | expected-es2015 | page0 | inter-procedurals/1.matching.json | matching | ~ | `inter-procedurals/1.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_3.gen −state@n122、$ANONYMOUS_FUN_3.exceptional −state@n122 |
| 3 | expected-es2015 | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 成員目標（摘要） | FR-003 | 摘要 $ANONYMOUS_FUN_3.gen −state@n59、$ANONYMOUS_FUN_3.exceptional −state@n59、$ANONYMOUS_FUN_4.gen −state@n59、$ANONYMOUS_FUN_4.exceptional −state@n59、init.gen −state@n48、init.exceptional −state@n48、init.upwardExposed +state |
| 4 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 5 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 23 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 6 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 7 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 8 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 33 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 9 | expected-es2015 | inter-page | *.dupairs.dot | pair | - | `state: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 10 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> 24` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 11 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> 25` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 12 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> 33` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 13 | expected-es2015 | inter-page | *.dupairs.dot | pair | + | `state: 4 -> 34` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 14 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 15 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 16 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 17 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 18 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 23 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 19 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 20 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 21 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 33 -> 23` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 22 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | - | `state: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 23 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> 24` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 24 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> 25` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 25 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> 33` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 26 | expected-es2015 | page0 | intra-pages/*.dupairs.dot | pair | + | `state: 4 -> 34` | 成員目標（不再殺除） | FR-001 | 不再殺除：L23／L33 的 `state.todos = …` 不再定義 `state`，L4 的 `const state` 越過它們到達此讀取 |
| 27 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | + | `input: 39 -> 41` | 成員目標（新增讀取） | FR-002 | 亦符：成員目標（不再殺除） |
| 28 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 24` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 29 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | - | `state: 23 -> 25` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |
| 30 | expected-es2015 | page0 | intra-procedurals/*.dupairs.dot | pair | - | `state: 33 -> 34` | 屬性寫入→讀取損失 | D001、FR-009 | member read [todos] overlaps write [todos] |

## 段結構改變行

| case | 頁 | 模型檔 | 行 | 基準段標記數 | 008 段標記數 | 簽核 |
|------|----|--------|----|--------------|--------------|------|
| 無 |  |  |  |  |  |  |

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 008 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| expected | inter-page | 0.dupairs.dot | 26 | 26 | 0 |
| expected | page0 | inter-procedurals/0.dupairs.dot | 4 | 4 | 0 |
| expected | page0 | inter-procedurals/1.dupairs.dot | 4 | 4 | 0 |
| expected | page0 | inter-procedurals/2.dupairs.dot | 4 | 4 | 0 |
| expected | page0 | intra-pages/0.dupairs.dot | 26 | 26 | 0 |
| expected | page0 | intra-procedurals/2.dupairs.dot | 4 | 4 | 0 |
| expected-es2015 | inter-page | 0.dupairs.dot | 1 | 1 | 0 |
| expected-es2015 | page0 | intra-pages/0.dupairs.dot | 1 | 1 | 0 |
| expected-es2015 | page0 | intra-procedurals/5.dupairs.dot | 1 | 1 | 0 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| expected-es2015 | inter-page | 成員目標（摘要） | 定義性成員目標 input L41；state L23、L33 | 1 | 6 | `state.todos = …`（L23、L33）不再定義 `state`：`addTodo`（$ANONYMOUS_FUN_3）、其呼叫者 $ANONYMOUS_FUN_4 與 `init` 的 gen／exceptional 移除 `state@n`；`init` 在 L33、L34 讀 `state` 且函式內無定義，upwardExposed 新增 `state` | 草擬，待簽核（#1） |
| expected-es2015 | page0 | 成員目標（摘要） | 定義性成員目標 input L41；state L23、L33 | 1 | 8 | 同 inter-page：intra-pages/0 與 inter-page 相同（gen／exceptional −`state@n` 6 筆、`init.upwardExposed +state`）；inter-procedurals/1（`addTodo`）只有 `$ANONYMOUS_FUN_3` 的 gen／exceptional −`state@n122` | 草擬，待簽核（#2、#3） |
| expected-es2015 | inter-page | 成員目標 | 定義性成員目標 input L41；state L23、L33 | 5 | 0 | L41 `input.value = ''` 改為讀取 `input`（+`input: 39 -> 41`）；L23、L33 的 `state.todos = …` 不再殺除 `state`，L4 的 `const state` 到達 L24、L25、L34，L33 本身成為 `state` 的讀取（+`state: 4 -> 33`） | 草擬，待簽核（#4、#10、#11、#12、#13） |
| expected-es2015 | inter-page | 屬性寫入→讀取損失 | 定義性成員目標 input L41；state L23、L33 | 0 | 5 | L23、L33 的 `state.todos = …` 原為 `state` 的定義，到達 L23（下一次呼叫 `addTodo` 時）、L24、L25、L34 對 `state.todos` 的讀取；008 不追屬性，這些 pair 消失（讀取路徑 [todos] 與寫入路徑 [todos] 相同，語意上確有資料流，D001 接受的損失） | 草擬，待簽核（#5、#6、#7、#8、#9） |
| expected-es2015 | page0 | 成員目標 | 定義性成員目標 input L41；state L23、L33 | 7 | 0 | 同 inter-page：intra-pages 4 筆 `state: 4 -> …` 與 `input: 39 -> 41`；inter-procedurals、intra-procedurals 只有 `input: 39 -> 41`（`addTodo`／`init` 的單函式模型無 L4 的定義可到達） | 草擬，待簽核（#14、#17、#23、#24、#25、#26、#27） |
| expected-es2015 | page0 | 屬性寫入→讀取損失 | 定義性成員目標 input L41；state L23、L33 | 0 | 10 | 同 inter-page：intra-pages 5 筆；inter-procedurals `state: 23 -> 24`、`23 -> 25`（`addTodo`）；intra-procedurals `23 -> 24`、`23 -> 25`（`addTodo`）與 `33 -> 34`（`init`） | 草擬，待簽核（#15、#16、#18、#19、#20、#21、#22、#28、#29、#30） |

## 可到達性允許清單

golden 的允許清單項（FR-008）逐項列於此，與 `tests/dujs/cases/reachability-allowlist.json` 相同（T061 填入；`--verify` 不核對本節）。

| 程式 | 模型 | pair | 見證 |
|------|------|------|------|
| （尚無） |  |  |  |

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
