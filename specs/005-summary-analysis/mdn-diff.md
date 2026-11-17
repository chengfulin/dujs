# MDN 範例集差異紀錄（feature 005，SC-004、SC-005）

基準：`specs/005-summary-analysis/mdn/baseline-develop/`（Setup，lib＝`9e324be`）。新側：本 branch CLI 對 `specs/006-eslint-scope/mdn/corpus/` 實跑（32 個 id、33 檔，s09 為兩頁）。

行號說明：dot 標記的行號＝檔案行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」與「釘選與簽核」為機器區塊（`node specs/005-summary-analysis/tools/diffcheck.js mdn --verify specs/005-summary-analysis/mdn-diff.md` 核對），
由 `--report` 產生骨架後補「說明」（T094）；`連結` 等釘選類別的簽核欄 implementer 只填「草擬，待簽核」，使用者於 T100 簽核。
釘選表的 +／− 只計 pair、列、模型的新增與消失；graph 的檔案變更（`~`）列入簽核欄的列號，但不計入 +／−。

## 摘要（T094）

- CLI exit code：32 個 id 在 develop 與本 branch 皆為 0（見「CLI exit code」節），不拋錯。
- 淨差異 330 筆：
  - `§18` 180 筆（全為消失 pair，FR-008）：use 端為函式 `entry` 的 pair（entry 不再讀本體）；本體敘述節點上的同一讀取不受影響。
  - `連結` 135 筆（FR-005）：s07、s08、s10 三頁共 4 個 D2 新連結呼叫點（s07 L41、s08 L23／L27、s10 L12），
    其中新增 pair 78、消失 pair 16（皆為呼叫敘述拆出 callNode 後的改名或 callee 本體副本的 entry 改名）、新增列 14、新增模型 3、新增 graph 6、graph 變更 18（其中 a04、a05、x01 的 11 筆只有節點編號位移，s10 inter-procedurals 0 亦只有編號位移）；
    a04、a05、x01 三頁的觸發所列呼叫位於運算式內，未連結。
  - `Q-a` 15 筆：a01b、a02b、a06、s13、s14 的 graph 變更，去除節點編號後與基準逐字相同（只有編號位移）。
  - `摘要`、`finally`、`例外IN`、`保守摘要` 0 筆：語料沒有 `try`、generator／async 呼叫，呼叫點的摘要未使任何 pair 消失。
- 新增 pair 只屬 `連結`（SC-005）；消失 pair 只屬 `§18` 與 `連結`（改名）。無法歸類：0 筆。
- `*.matching.json` 79 個（新增檔，不計入差異）。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | a01b-oojs-1-solution | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 2 | a01b-oojs-1-solution | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 3 | a01b-oojs-1-solution | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 4 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 5 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 6 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 7 | a02b-oojs-2-solution | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 8 | a02b-oojs-2-solution | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 9 | a02b-oojs-2-solution | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 10 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 11 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 12 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 13 | a04-bouncing-main-finished | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 14 | a04-bouncing-main-finished | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 15 | a04-bouncing-main-finished | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 16 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `balls: 75 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 17 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `ctx: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 18 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 19 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 20 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 21 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 22 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | - | `balls: 75 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 23 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | - | `ctx: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 24 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 25 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 26 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 27 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 28 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 75 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 29 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `ctx: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 30 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 31 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 32 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 33 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 34 | a05-assessment-main | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 35 | a05-assessment-main | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 36 | a05-assessment-main | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 37 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `balls: 166 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 38 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `ctx: 10 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 39 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `evilBall: 185 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 40 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `height: 13 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 41 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 42 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 43 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `width: 12 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 44 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | - | `balls: 166 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 45 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | - | `ctx: 10 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 46 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | - | `evilBall: 185 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 47 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | - | `height: 13 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 48 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 49 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 50 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | - | `width: 12 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 51 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 166 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 52 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `ctx: 10 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 53 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `evilBall: 185 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 54 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 13 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 55 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 56 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 57 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 12 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 58 | a06-classes-snippets | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 59 | a06-classes-snippets | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 60 | a06-classes-snippets | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 61 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 62 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 63 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 64 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 65 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 66 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 67 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 68 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 69 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 70 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 71 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 72 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 73 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 74 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 75 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 76 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 77 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 78 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `console: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 79 | s05-switch-example | inter-page | 0.dupairs.dot | pair | - | `select: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 80 | s05-switch-example | page0 | intra-pages/0.dupairs.dot | pair | - | `select: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 81 | s06a-exiting-loops-break | inter-page | 0.dupairs.dot | pair | - | `contacts: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 82 | s06a-exiting-loops-break | inter-page | 0.dupairs.dot | pair | - | `input: 10 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 83 | s06a-exiting-loops-break | inter-page | 0.dupairs.dot | pair | - | `input: 15 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 84 | s06a-exiting-loops-break | inter-page | 0.dupairs.dot | pair | - | `para: 17 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 85 | s06a-exiting-loops-break | inter-page | 0.dupairs.dot | pair | - | `para: 21 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 86 | s06a-exiting-loops-break | inter-page | 0.dupairs.dot | pair | - | `para: 26 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 87 | s06a-exiting-loops-break | inter-page | 0.dupairs.dot | pair | - | `para: 9 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 88 | s06a-exiting-loops-break | page0 | intra-pages/0.dupairs.dot | pair | - | `contacts: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 89 | s06a-exiting-loops-break | page0 | intra-pages/0.dupairs.dot | pair | - | `input: 10 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 90 | s06a-exiting-loops-break | page0 | intra-pages/0.dupairs.dot | pair | - | `input: 15 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 91 | s06a-exiting-loops-break | page0 | intra-pages/0.dupairs.dot | pair | - | `para: 17 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 92 | s06a-exiting-loops-break | page0 | intra-pages/0.dupairs.dot | pair | - | `para: 21 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 93 | s06a-exiting-loops-break | page0 | intra-pages/0.dupairs.dot | pair | - | `para: 26 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 94 | s06a-exiting-loops-break | page0 | intra-pages/0.dupairs.dot | pair | - | `para: 9 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 95 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 96 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `customName: 4 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 97 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `document: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 98 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `returnRandomStoryString: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 99 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 100 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `customName: 4 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 101 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `document: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 102 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `returnRandomStoryString: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 103 | s07-gallery-finish | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：插入 callNode／callReturn、callee 本體與 call／return 邊 （亦符：共通） |
| 104 | s07-gallery-finish | page0 | inter-procedurals/0.dupairs.dot | model | + | `inter-procedurals/0.dupairs.dot` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） |
| 105 | s07-gallery-finish | page0 | inter-procedurals/0.graph.dot | graph | + | `inter-procedurals/0.graph.dot` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） （亦符：共通） |
| 106 | s07-gallery-finish | page0 | inter-procedurals/0.hierarchy.dot | graph | + | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） （亦符：共通） |
| 107 | s07-gallery-finish | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：插入 callNode／callReturn、callee 本體與 call／return 邊 （亦符：共通） |
| 108 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `btn: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 109 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `btn: 60 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 110 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `btn: 65 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 111 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `e: entry -> (40,41)` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：摘要） |
| 112 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (40,call)` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：例外IN） |
| 113 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `e: entry -> 41` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：摘要） |
| 114 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `e: entry -> 49` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：updateDisplayedImage 本體在 intra-page 模型有兩份（click 處理器、L41 被呼叫），entry 標籤改帶階層後綴，改記為 `e: entry_b_d_a_b_a -> 49／50` （亦符：摘要） |
| 115 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `e: entry -> 50` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：updateDisplayedImage 本體在 intra-page 模型有兩份（click 處理器、L41 被呼叫），entry 標籤改帶階層後綴，改記為 `e: entry_b_d_a_b_a -> 49／50` （亦符：摘要） |
| 116 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | + | `e: entry -> call` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） |
| 117 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 49` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 118 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 49` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 119 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 50` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 120 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 50` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 121 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `updateDisplayedImage: entry -> 41` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：摘要） |
| 122 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | + | `updateDisplayedImage: entry -> call` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） |
| 123 | s07-gallery-finish | inter-page | 0.dupairs.dot | pair | - | `updateDisplayedImage: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 124 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `displayedImage` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的變數列 |
| 125 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `e` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的變數列 |
| 126 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `e` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的變數列 |
| 127 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `e: entry -> (40,call)` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的 pair（處理器參數 e 讀於 L40 條件、L41 call；callee 參數 e 讀於 L49／L50） |
| 128 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `e: entry -> (40,exit)` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的 pair（處理器參數 e 讀於 L40 條件、L41 call；callee 參數 e 讀於 L49／L50） |
| 129 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `e: entry -> 49` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的 pair（處理器參數 e 讀於 L40 條件、L41 call；callee 參數 e 讀於 L49／L50） |
| 130 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `e: entry -> 50` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的 pair（處理器參數 e 讀於 L40 條件、L41 call；callee 參數 e 讀於 L49／L50） |
| 131 | s07-gallery-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `e: entry -> call` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：新 inter-procedural 模型的 pair（處理器參數 e 讀於 L40 條件、L41 call；callee 參數 e 讀於 L49／L50） |
| 132 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `btn: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 133 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `btn: 60 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 134 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `btn: 65 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 135 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `e: entry -> (40,41)` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：摘要） |
| 136 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (40,call)` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：例外IN） |
| 137 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `e: entry -> 41` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：摘要） |
| 138 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `e: entry -> 49` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：updateDisplayedImage 本體在 intra-page 模型有兩份（click 處理器、L41 被呼叫），entry 標籤改帶階層後綴，改記為 `e: entry_b_d_a_b_a -> 49／50` （亦符：摘要） |
| 139 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `e: entry -> 50` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：updateDisplayedImage 本體在 intra-page 模型有兩份（click 處理器、L41 被呼叫），entry 標籤改帶階層後綴，改記為 `e: entry_b_d_a_b_a -> 49／50` （亦符：摘要） |
| 140 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> call` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） |
| 141 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 49` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 142 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 49` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 143 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 50` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 144 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry_b_d_a_b_a -> 50` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：參數 e 由 updateDisplayedImage 的 entry 定義、L49／L50 讀取；本體兩份（click 處理器、L41 呼叫）各一筆 |
| 145 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `updateDisplayedImage: entry -> 41` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） （亦符：摘要） |
| 146 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `updateDisplayedImage: entry -> call` | 連結 | FR-005 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告 updateDisplayedImage：L41 呼叫敘述拆出 callNode，原記於 L41 的 callee／引數讀取改記於 call（同一 def-use 改名：`-> 41` → `-> call`、`(40,41)` → `(40,call)`） |
| 147 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `updateDisplayedImage: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 148 | s08-number-guessing-game | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：插入 callNode／callReturn、callee 本體與 call／return 邊 （亦符：共通） |
| 149 | s08-number-guessing-game | page0 | inter-procedurals/0.dupairs.dot | model | + | `inter-procedurals/0.dupairs.dot` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） |
| 150 | s08-number-guessing-game | page0 | inter-procedurals/0.graph.dot | graph | + | `inter-procedurals/0.graph.dot` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） （亦符：共通） |
| 151 | s08-number-guessing-game | page0 | inter-procedurals/0.hierarchy.dot | graph | + | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） （亦符：共通） |
| 152 | s08-number-guessing-game | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：插入 callNode／callReturn、callee 本體與 call／return 邊 （亦符：共通） |
| 153 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `Number: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 154 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `document: entry -> 48` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體進入 intra-page 模型，L48 `document.createElement`、L50 `document.body` 讀頁面全域 document |
| 155 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `document: entry -> 50` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體進入 intra-page 模型，L48 `document.createElement`、L50 `document.body` 讀頁面全域 document |
| 156 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `guessCount: 38 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 157 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `guessCount: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 158 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `guessField: 39 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 159 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `guessField: 46 -> 12` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L46 `guessField.disabled = true`（屬性寫入記為 guessField 的定義，§22 (1)）返回 checkGuess 後經 LOOP 再進 checkGuess，L12 讀取 |
| 160 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `guessField: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 161 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `guesses: 14 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 162 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `guesses: 17 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 163 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `guesses: 3 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 164 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `randomNumber: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 165 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `resetButton: 49 -> 50` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體內 L49 `resetButton.textContent = …`（屬性寫入記為定義）→ L50、L51 讀取 |
| 166 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `resetButton: 49 -> 51` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體內 L49 `resetButton.textContent = …`（屬性寫入記為定義）→ L50、L51 讀取 |
| 167 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `resetGame: entry -> 51` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L51 `addEventListener(…, resetGame)` 讀頁面層函式宣告 resetGame |
| 168 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `setGameOver: entry -> 23` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） （亦符：摘要） |
| 169 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `setGameOver: entry -> 27` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） （亦符：摘要） |
| 170 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `setGameOver: entry -> call` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） |
| 171 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `setGameOver: entry -> call` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） |
| 172 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | - | `setGameOver: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 173 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `guessCount` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 174 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `guessField` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 175 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `guessSubmit` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 176 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `guesses` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 177 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `lastResult` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 178 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `lowOrHi` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 179 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `resetButton` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 180 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | row | + | `userGuess` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：新 inter-procedural 模型的變數列 |
| 181 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `guessField: 39 -> 40` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 182 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `guesses: 14 -> 17` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 183 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `resetButton: 49 -> 50` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 184 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `resetButton: 49 -> 51` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 185 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `userGuess: 12 -> (19,20)` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 186 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `userGuess: 12 -> (19,24)` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 187 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `userGuess: 12 -> (31,32)` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 188 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `userGuess: 12 -> (31,33)` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 189 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `userGuess: 12 -> (33,34)` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 190 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `userGuess: 12 -> (33,38)` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 191 | s08-number-guessing-game | page0 | inter-procedurals/*.dupairs.dot | pair | + | `userGuess: 12 -> 17` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：checkGuess 新 inter-procedural 模型的 pair（checkGuess 本體與 setGameOver 本體內的 def-use） |
| 192 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `Number: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 193 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `document: entry -> 48` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體進入 intra-page 模型，L48 `document.createElement`、L50 `document.body` 讀頁面全域 document |
| 194 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `document: entry -> 50` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體進入 intra-page 模型，L48 `document.createElement`、L50 `document.body` 讀頁面全域 document |
| 195 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `guessCount: 38 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 196 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `guessCount: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 197 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `guessField: 39 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 198 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `guessField: 46 -> 12` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L46 `guessField.disabled = true`（屬性寫入記為 guessField 的定義，§22 (1)）返回 checkGuess 後經 LOOP 再進 checkGuess，L12 讀取 |
| 199 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `guessField: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 200 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `guesses: 14 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 201 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `guesses: 17 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 202 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `guesses: 3 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 203 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `randomNumber: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 204 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `resetButton: 49 -> 50` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體內 L49 `resetButton.textContent = …`（屬性寫入記為定義）→ L50、L51 讀取 |
| 205 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `resetButton: 49 -> 51` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：setGameOver 本體內 L49 `resetButton.textContent = …`（屬性寫入記為定義）→ L50、L51 讀取 |
| 206 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `resetGame: entry -> 51` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L51 `addEventListener(…, resetGame)` 讀頁面層函式宣告 resetGame |
| 207 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `setGameOver: entry -> 23` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） （亦符：摘要） |
| 208 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `setGameOver: entry -> 27` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） （亦符：摘要） |
| 209 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `setGameOver: entry -> call` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） |
| 210 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `setGameOver: entry -> call` | 連結 | FR-005 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告 setGameOver：L23、L27 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 23`／`-> 27` → `-> call`） |
| 211 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | - | `setGameOver: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 212 | s10-allowance-updater | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：插入 callNode／callReturn、callee 本體與 call／return 邊 （亦符：Q-a、共通） |
| 213 | s10-allowance-updater | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：Q-a、共通） |
| 214 | s10-allowance-updater | page0 | inter-procedurals/1.dupairs.dot | model | + | `inter-procedurals/1.dupairs.dot` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） |
| 215 | s10-allowance-updater | page0 | inter-procedurals/1.graph.dot | graph | + | `inter-procedurals/1.graph.dot` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） （亦符：Q-a、共通） |
| 216 | s10-allowance-updater | page0 | inter-procedurals/1.hierarchy.dot | graph | + | `inter-procedurals/1.hierarchy.dot` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：該函式有了連結的呼叫，新建其 inter-procedural 模型（呼叫端本體＋callee 本體） （亦符：Q-a、共通） |
| 217 | s10-allowance-updater | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：插入 callNode／callReturn、callee 本體與 call／return 邊 （亦符：Q-a、共通） |
| 218 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `childAllowance: 18 -> 23` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型多一份（L12 處理器內呼叫），其區域 def-use 多列一筆 |
| 219 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `childAllowance: 20 -> 23` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型多一份（L12 處理器內呼叫），其區域 def-use 多列一筆 |
| 220 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 221 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 222 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 223 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 224 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | - | `shoppingDone: 10 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 225 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 4 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型有兩份（L26 頁面層、L12 處理器內），兩份的 L17 共用 ReachIn，L4 的定義（經 L26 呼叫可實現）在第二份也列一筆 |
| 226 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 4 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型有兩份（L26 頁面層、L12 處理器內），兩份的 L17 共用 ReachIn，L4 的定義（經 L26 呼叫可實現）在第二份也列一筆 |
| 227 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | - | `shoppingDone: 4 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 228 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | - | `shoppingDone: 4 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 229 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 230 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 231 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 232 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 233 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | - | `shoppingDone: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 234 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | - | `updateAllowance: entry -> 12` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：L12 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 12` → `-> call`） （亦符：摘要） |
| 235 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | + | `updateAllowance: entry -> call` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：L12 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 12` → `-> call`） |
| 236 | s10-allowance-updater | inter-page | 0.dupairs.dot | pair | - | `updateAllowance: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 237 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | row | + | `childAllowance` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：新 inter-procedural 模型的變數列 |
| 238 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | row | + | `para` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：新 inter-procedural 模型的變數列 |
| 239 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | row | + | `shoppingDone` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：新 inter-procedural 模型的變數列 |
| 240 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | + | `childAllowance: 18 -> 23` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器新 inter-procedural 模型的 pair（處理器 L8／L10 的定義經 L12 呼叫到 L17 條件；callee 區域 childAllowance） |
| 241 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | + | `childAllowance: 20 -> 23` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器新 inter-procedural 模型的 pair（處理器 L8／L10 的定義經 L12 呼叫到 L17 條件；callee 區域 childAllowance） |
| 242 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器新 inter-procedural 模型的 pair（處理器 L8／L10 的定義經 L12 呼叫到 L17 條件；callee 區域 childAllowance） |
| 243 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器新 inter-procedural 模型的 pair（處理器 L8／L10 的定義經 L12 呼叫到 L17 條件；callee 區域 childAllowance） |
| 244 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | - | `shoppingDone: 4 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 245 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器新 inter-procedural 模型的 pair（處理器 L8／L10 的定義經 L12 呼叫到 L17 條件；callee 區域 childAllowance） |
| 246 | s10-allowance-updater | page0 | inter-procedurals/*.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器新 inter-procedural 模型的 pair（處理器 L8／L10 的定義經 L12 呼叫到 L17 條件；callee 區域 childAllowance） |
| 247 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `childAllowance: 18 -> 23` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型多一份（L12 處理器內呼叫），其區域 def-use 多列一筆 |
| 248 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `childAllowance: 20 -> 23` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型多一份（L12 處理器內呼叫），其區域 def-use 多列一筆 |
| 249 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 250 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 251 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 252 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 10 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 253 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | - | `shoppingDone: 10 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 254 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 4 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型有兩份（L26 頁面層、L12 處理器內），兩份的 L17 共用 ReachIn，L4 的定義（經 L26 呼叫可實現）在第二份也列一筆 |
| 255 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 4 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：updateAllowance 本體在 intra-page 模型有兩份（L26 頁面層、L12 處理器內），兩份的 L17 共用 ReachIn，L4 的定義（經 L26 呼叫可實現）在第二份也列一筆 |
| 256 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | - | `shoppingDone: 4 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 257 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | - | `shoppingDone: 4 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 258 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 259 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,18)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 260 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 261 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `shoppingDone: 8 -> (17,20)` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：處理器 L8／L10 的定義經 L12 呼叫進 updateAllowance，L17 條件讀取（p-use）；本體兩份各列一筆 |
| 262 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | - | `shoppingDone: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 263 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | - | `updateAllowance: entry -> 12` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：L12 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 12` → `-> call`） （亦符：摘要） |
| 264 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | + | `updateAllowance: entry -> call` | 連結 | FR-005 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告 updateAllowance：L12 呼叫敘述拆出 callNode，callee 讀取改記於 call（同一 def-use 改名：`-> 12` → `-> call`） |
| 265 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | pair | - | `updateAllowance: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 266 | s11-calculating-squares | inter-page | 0.dupairs.dot | pair | - | `results: 16 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 267 | s11-calculating-squares | inter-page | 0.dupairs.dot | pair | - | `results: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 268 | s11-calculating-squares | inter-page | 0.dupairs.dot | pair | - | `results: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 269 | s11-calculating-squares | inter-page | 0.dupairs.dot | pair | - | `results: 9 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 270 | s11-calculating-squares | page0 | intra-pages/0.dupairs.dot | pair | - | `results: 16 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 271 | s11-calculating-squares | page0 | intra-pages/0.dupairs.dot | pair | - | `results: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 272 | s11-calculating-squares | page0 | intra-pages/0.dupairs.dot | pair | - | `results: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 273 | s11-calculating-squares | page0 | intra-pages/0.dupairs.dot | pair | - | `results: 9 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 274 | s13-functions-1-finish | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 275 | s13-functions-1-finish | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 276 | s13-functions-1-finish | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 277 | s13-functions-1-finish | inter-page | 0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 278 | s13-functions-1-finish | inter-page | 0.dupairs.dot | pair | - | `names: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 279 | s13-functions-1-finish | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 280 | s13-functions-1-finish | page0 | inter-procedurals/0.dupairs.dot | pair | - | `names: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 281 | s13-functions-1-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 282 | s13-functions-1-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `names: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 283 | s14-functions-3 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 284 | s14-functions-3 | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 285 | s14-functions-3 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | Q-a | FR-006 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同 （亦符：共通） |
| 286 | s14-functions-3 | inter-page | 0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 287 | s14-functions-3 | inter-page | 0.dupairs.dot | pair | - | `names: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 288 | s14-functions-3 | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 289 | s14-functions-3 | page0 | inter-procedurals/0.dupairs.dot | pair | - | `names: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 290 | s14-functions-3 | page0 | intra-pages/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 291 | s14-functions-3 | page0 | intra-pages/0.dupairs.dot | pair | - | `names: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要） |
| 292 | s18-target-currenttarget | inter-page | 0.dupairs.dot | pair | - | `output: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 293 | s18-target-currenttarget | inter-page | 0.dupairs.dot | pair | - | `output: 6 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 294 | s18-target-currenttarget | page0 | intra-pages/0.dupairs.dot | pair | - | `output: 2 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 295 | s18-target-currenttarget | page0 | intra-pages/0.dupairs.dot | pair | - | `output: 6 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：摘要、例外IN） |
| 296 | x01-bouncing-cycle | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 297 | x01-bouncing-cycle | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 298 | x01-bouncing-cycle | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 299 | x01-bouncing-cycle | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 300 | x01-bouncing-cycle | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-005 | 節點編號位移（cfgId 為全域計數器，本 branch 新增節點使其後編號改變）；去除節點編號後與基準逐字相同；觸發所列呼叫位於運算式內（非呼叫敘述，§22 (3)），D2 不連結 （亦符：Q-a、共通） |
| 301 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 302 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `balls: 77 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 303 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `balls: 77 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 304 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `ctx: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 305 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 306 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 307 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 308 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 309 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 310 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 311 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 312 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `balls: 77 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 313 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `balls: 77 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 314 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `ctx: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 315 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 316 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 317 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 318 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 319 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 320 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 321 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `Math: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 322 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 77 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 323 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 77 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 324 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `ctx: 5 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN、Q-a） |
| 325 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 326 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 8 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 327 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `loop: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 328 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `requestAnimationFrame: entry -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要） |
| 329 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |
| 330 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 7 -> entry` | §18 | FR-008 | US5（FR-008）：entry 不讀函式本體，use 端為 entry 的 pair 消失 （亦符：連結、摘要、例外IN） |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| a04-bouncing-main-finished | inter-page | 連結 | L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L68 `randomRGB()`（函式運算式 內）：基準未連結 | 0 | 0 | 只有 graph 的節點編號位移（不計 ±）；觸發所列 L19 `random()`、L68 `randomRGB()` 位於運算式內（非呼叫敘述，§22 (3)），D2 不連結；pair 無變化 | 使用者簽核（2026-11-17）（#13） |
| a04-bouncing-main-finished | page0 | 連結 | L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L68 `randomRGB()`（函式運算式 內）：基準未連結 | 0 | 0 | 只有 graph 的節點編號位移（不計 ±）；觸發所列 L19 `random()`、L68 `randomRGB()` 位於運算式內（非呼叫敘述，§22 (3)），D2 不連結；pair 無變化 | 使用者簽核（2026-11-17）（#14、#15） |
| a05-assessment-main | inter-page | 連結 | L25 `random()`（randomRGB 內）：基準未連結；L25 `random()`（randomRGB 內）：基準未連結；L25 `random()`（randomRGB 內）：基準未連結；L86 `randomRGB()`（函式運算式 內）：基準未連結 | 0 | 0 | 只有 graph 的節點編號位移（不計 ±）；觸發所列 L25 `random()`、L86 `randomRGB()` 位於運算式內（非呼叫敘述，§22 (3)），D2 不連結；pair 無變化 | 使用者簽核（2026-11-17）（#34） |
| a05-assessment-main | page0 | 連結 | L25 `random()`（randomRGB 內）：基準未連結；L25 `random()`（randomRGB 內）：基準未連結；L25 `random()`（randomRGB 內）：基準未連結；L86 `randomRGB()`（函式運算式 內）：基準未連結 | 0 | 0 | 只有 graph 的節點編號位移（不計 ±）；觸發所列 L25 `random()`、L86 `randomRGB()` 位於運算式內（非呼叫敘述，§22 (3)），D2 不連結；pair 無變化 | 使用者簽核（2026-11-17）（#35、#36） |
| s07-gallery-finish | inter-page | 連結 | L41 `updateDisplayedImage()`（函式運算式 內）：基準未連結 | 7 | 5 | D2：L41 `updateDisplayedImage(e)`（keydown 箭頭處理器內）連到頁面層函式宣告。−5：L41 拆出 callNode，`e`／`updateDisplayedImage` 在 L41 的讀取改記於 call（3 筆改名）；updateDisplayedImage 本體在模型中變兩份，參數 e 的 entry 改帶階層後綴（2 筆改名）。+7：對應的 `-> call`／`(40,call)` 3 筆與兩份本體的 `e: entry_b_d_a_b_a -> 49／50` 4 筆 | 使用者簽核（2026-11-17）（#103、#111、#112、#113、#114、#115、#116、#117、#118、#119、#120、#121、#122） |
| s07-gallery-finish | page0 | 連結 | L41 `updateDisplayedImage()`（函式運算式 內）：基準未連結 | 18 | 5 | 同 inter-page（intra-pages 0：+7／−5）；另新增箭頭處理器的 inter-procedural 模型 0（`.dupairs`／`.graph`／`.hierarchy.dot`，+1 模型、+3 列 `displayedImage`／`e`／`e`、+5 pair） | 使用者簽核（2026-11-17）（#104、#105、#106、#107、#124、#125、#126、#127、#128、#129、#130、#131、#135、#136、#137、#138、#139、#140、#141、#142、#143、#144、#145、#146） |
| s08-number-guessing-game | inter-page | 連結 | L23 `setGameOver()`（checkGuess 內）：基準未連結；L27 `setGameOver()`（checkGuess 內）：基準未連結 | 8 | 2 | D2：checkGuess 內 L23、L27 `setGameOver()` 連到頁面層函式宣告。−2：`setGameOver: entry -> 23／27` 改記於 callNode（`-> call` ×2）；+8：上述 2 筆，setGameOver 本體進模型後的 `document: entry -> 48／50`、`resetButton: 49 -> 50／51`、`resetGame: entry -> 51`、`guessField: 46 -> 12`（L46 屬性寫入經 LOOP 回到下一次 checkGuess 的 L12） | 使用者簽核（2026-11-17）（#148、#154、#155、#159、#165、#166、#167、#168、#169、#170、#171） |
| s08-number-guessing-game | page0 | 連結 | L23 `setGameOver()`（checkGuess 內）：基準未連結；L27 `setGameOver()`（checkGuess 內）：基準未連結 | 30 | 2 | 同 inter-page（intra-pages 0：+8／−2）；另新增 checkGuess 的 inter-procedural 模型 0（+1 模型、+8 列、+11 pair：checkGuess 與 setGameOver 本體內的 def-use） | 使用者簽核（2026-11-17）（#149、#150、#151、#152、#173、#174、#175、#176、#177、#178、#179、#180、#181、#182、#183、#184、#185、#186、#187、#188、#189、#190、#191、#193、#194、#198、#204、#205、#206、#207、#208、#209、#210） |
| s10-allowance-updater | inter-page | 連結 | L12 `updateAllowance()`（函式運算式 內）：基準未連結 | 13 | 1 | D2：change 箭頭處理器內 L12 `updateAllowance()` 連到頁面層函式宣告。−1：`updateAllowance: entry -> 12` 改記於 callNode（`-> call`）；+13：上述 1 筆，處理器 L8／L10 定義經 L12 呼叫到 L17 條件（各 2 個分支 ×本體兩份＝8 筆），本體第二份的 `shoppingDone: 4 -> (17,…)` 2 筆與 `childAllowance: 18／20 -> 23` 2 筆 | 使用者簽核（2026-11-17）（#212、#218、#219、#220、#221、#222、#223、#225、#226、#229、#230、#231、#232、#234、#235） |
| s10-allowance-updater | page0 | 連結 | L12 `updateAllowance()`（函式運算式 內）：基準未連結 | 25 | 1 | 同 inter-page（intra-pages 0：+13／−1）；另新增處理器的 inter-procedural 模型 1（+1 模型、+3 列、+6 pair）；inter-procedurals 0 的 `.graph.dot` 只有節點編號位移 | 使用者簽核（2026-11-17）（#213、#214、#215、#216、#217、#237、#238、#239、#240、#241、#242、#243、#245、#246、#247、#248、#249、#250、#251、#252、#254、#255、#258、#259、#260、#261、#263、#264） |
| x01-bouncing-cycle | inter-page | 連結 | L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L69 `randomRGB()`（函式運算式 內）：基準未連結 | 0 | 0 | 只有 graph 的節點編號位移（不計 ±）；觸發所列 L19 `random()`、L69 `randomRGB()` 位於運算式內（非呼叫敘述，§22 (3)），D2 不連結；pair 無變化 | 使用者簽核（2026-11-17）（#296） |
| x01-bouncing-cycle | page0 | 連結 | L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L19 `random()`（randomRGB 內）：基準未連結；L69 `randomRGB()`（函式運算式 內）：基準未連結 | 0 | 0 | 只有 graph 的節點編號位移（不計 ±）；觸發所列 L19 `random()`、L69 `randomRGB()` 位於運算式內（非呼叫敘述，§22 (3)），D2 不連結；pair 無變化 | 使用者簽核（2026-11-17）（#297、#298、#299、#300） |

matching：79 個 `*.matching.json`（新增檔，不計入差異）

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


## 人工說明（T094）

### 各頁變化

- **s07-gallery-finish**：keydown 箭頭處理器（L39）內 L41 `updateDisplayedImage(e)` 依 D2 連到頁面層函式宣告。
  L41 拆出 callNode，原記於 L41 的讀取改記於 `call`（`e: entry -> 41`／`(40,41)`、`updateDisplayedImage: entry -> 41` 改名）；
  updateDisplayedImage 本體在 intra-page 模型出現兩份（click 處理器、L41 被呼叫），參數 `e` 的 entry 標籤改帶階層後綴（`entry_b_d_a_b_a`），每份各有 `e -> 49`、`e -> 50`。
  箭頭處理器新建 inter-procedural 模型 0。
- **s08-number-guessing-game**：checkGuess 內 L23、L27 `setGameOver()` 依 D2 連結；setGameOver 本體首次進入 intra-page 模型，
  新增 `document: entry -> 48／50`、`resetButton: 49 -> 50／51`、`resetGame: entry -> 51` 與 `guessField: 46 -> 12`（L46 屬性寫入記為定義〔KI §22 (1)〕，經 LOOP 到下一次 checkGuess 的 L12）；checkGuess 新建 inter-procedural 模型 0。
- **s10-allowance-updater**：change 箭頭處理器內 L12 `updateAllowance()` 依 D2 連結；處理器 L8／L10 的定義經呼叫到 updateAllowance 的 L17 條件；
  updateAllowance 本體在 intra-page 模型有兩份（L26 頁面層呼叫、L12 處理器內呼叫），每份列出同一組 pair（見下「疑點 1」）；處理器新建 inter-procedural 模型 1。
- **a04、a05、x01**：diffcheck 的 `連結` 觸發列出 `random()`（randomRGB 內）與 `randomRGB()`，兩者都在運算式內（模板字串、指派右側），不是呼叫敘述（KI §22 (3)），未連結；graph 只有節點編號位移。
- **§18 各頁**：消失的 `X: d -> entry` 皆為函式 entry 讀本體變數的 pair；抽查 a04（`width: 7 -> entry` 消失，`width: 7 -> 79／95` 保留；`ctx: 5 -> entry` 消失，
  本體的 `ctx` 讀取由 L94 屬性寫入定義，`ctx: 94 -> 95` 保留）、s10（`shoppingDone: 4 -> entry` 消失，`4 -> (17,18)／(17,20)` 保留），本體讀取不受影響。

### 與手推 pair 對照（抽樣，依 MDN 驗證慣例）

- 新增 pair 逐一對照原始碼：s07 的 `e: entry -> 49／50`（參數 e 由 entry 定義、本體讀取）、`-> call` 改名各筆；s08 的 `document: entry -> 48／50`、
  `resetButton: 49 -> 50／51`、`resetGame: entry -> 51`、`guessField: 46 -> 12`（屬性寫入視為定義的既有建模下可實現：setGameOver → 返回 → LOOP → checkGuess L12）、
  checkGuess inter-procedural 模型中的 `userGuess: 12 -> …`、`guesses: 14 -> 17`、`guessField: 39 -> 40`；s10 的 `shoppingDone: 8／10 -> (17,18)／(17,20)`
  （處理器 if／else 兩分支定義，L12 呼叫後 L17 讀）、`childAllowance: 18／20 -> 23`——皆為真實可實現的 def-use。
- 消失 pair：`§18` 皆為 entry 的假讀取；`連結` 的 16 筆消失皆有對應的新增改名列（同一定義、同一讀取，只改節點標籤）。
- 疑點（非本 feature 的錯誤 pair，供簽核參考）：
  1. **s10 本體兩份列出相同 pair 集合**：flat graph 中兩個 callNode 都進入第一份本體（call_b → 第一份 entry），兩份標籤相同的本體節點各列 `{4, 8, 10} -> (17,18)／(17,20)` 與 `childAllowance` 兩筆。
     以「定義行→讀取行」看，每筆都可實現（L4 經 L26 呼叫、L8／L10 經 L12 呼叫）；但若逐份看，L26 那份不可能讀到 L8／L10、L12 那份不可能讀到 L4（處理器 if／else 必定覆蓋）。
     這是多份本體共用 ReachIn 的呈現方式（另以 `var x = 0; function f(){ console.log(x); } f(); document.addEventListener('click', function(){ x = 1; f(); });` 實測同樣各列兩次；
     兩個呼叫都在頁面層時只列一次），不影響 pair 的可實現性，列為呈現上的重複（記入 `docs/known-issues.md` §43）。
  2. **s08 缺少 resetGame 的 pair（漏報，既有）**：setGameOver 在 L51 以名稱註冊頁面層函式 resetGame，但 setGameOver 只經處理器 checkGuess 呼叫，
     註冊點的 ReachIn 取自不屬頁面的模型而沒有 resetGame 的定義，resetGame 不被列為處理器；`resetButton: 48／49 -> 61`、`guessCount: 55 -> …`、`randomNumber: 67 -> 19…` 等可實現 pair 缺漏。
     develop 以 `function h2(){…} function h1(){ b.addEventListener('click', h2); } a.addEventListener('click', h1);` 實測同樣不列 h2（既有行為），記入 `docs/known-issues.md` §42。
  3. **s08 `resetButton` 無 `48 -> 49`**：L49 `resetButton.textContent = …` 的屬性寫入只記為定義、不記讀取（KI §22 (1)，既有建模）。
- 未發現本 feature 引入的錯誤 pair。

## 簽核（T100）

> 使用者於 2026-11-17 簽核（T100）：「釘選與簽核」表 12 列全部同意。
