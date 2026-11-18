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
- 一筆差異只記一個類別（多類成立時說明欄列「亦符」）。`成員目標`（修正／新增讀取／不再殺除／列消失／層級新增）、`成員目標（摘要）`、`屬性寫入→讀取損失`、`外溢`、`放寬` 與 KI 類（`§37`、`§38`、`§41`、`§43`）為釘選類別：「釘選與簽核」表的「說明」欄必填，簽核欄 implementer 只填「草擬，待簽核」；`共通` 為機械判定，不釘選。`無法到達` 無自動觸發，預期 0 筆。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|

## 段結構改變行

| case | 頁 | 模型檔 | 行 | 基準段標記數 | 008 段標記數 | 簽核 |
|------|----|--------|----|--------------|--------------|------|
| 無 |  |  |  |  |  |  |

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 008 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| a04-bouncing-main-finished | inter-page | 0.dupairs.dot | 7 | 7 | 0 |
| a04-bouncing-main-finished | page0 | inter-procedurals/1.dupairs.dot | 7 | 7 | 0 |
| a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | 7 | 7 | 0 |
| a05-assessment-main | inter-page | 0.dupairs.dot | 8 | 8 | 0 |
| a05-assessment-main | page0 | inter-procedurals/1.dupairs.dot | 8 | 8 | 0 |
| a05-assessment-main | page0 | intra-pages/0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | inter-page | 0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | page0 | intra-pages/0.dupairs.dot | 8 | 8 | 0 |
| s03-loops-2-finish | page0 | intra-procedurals/0.dupairs.dot | 8 | 8 | 0 |
| s04c-for-loop-cats | inter-page | 0.dupairs.dot | 7 | 7 | 0 |
| s04c-for-loop-cats | page0 | intra-pages/0.dupairs.dot | 7 | 7 | 0 |
| s04c-for-loop-cats | page0 | intra-procedurals/0.dupairs.dot | 7 | 7 | 0 |
| s07-gallery-finish | inter-page | 0.dupairs.dot | 2 | 2 | 0 |
| s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | 2 | 2 | 0 |
| s10-allowance-updater | inter-page | 0.dupairs.dot | 8 | 8 | 0 |
| s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | 8 | 8 | 0 |
| s11-calculating-squares | inter-page | 0.dupairs.dot | 4 | 4 | 0 |
| s11-calculating-squares | page0 | intra-pages/0.dupairs.dot | 4 | 4 | 0 |
| s11-calculating-squares | page0 | intra-procedurals/1.dupairs.dot | 4 | 4 | 0 |
| x01-bouncing-cycle | inter-page | 0.dupairs.dot | 7 | 7 | 0 |
| x01-bouncing-cycle | page0 | inter-procedurals/2.dupairs.dot | 7 | 7 | 0 |
| x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | 7 | 7 | 0 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|

## CLI exit code（develop → 本 branch，Setup 時）

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

| 程式 | 模型 | pair | 見證 |
|------|------|------|------|
| （尚無） |  |  |  |

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
