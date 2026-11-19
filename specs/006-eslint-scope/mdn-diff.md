# MDN 範例集差異紀錄（feature 006，FR-012 (2)、US4-7、SC-003）

基準：`specs/006-eslint-scope/mdn/baseline-develop/`（Setup commit，動 `lib/` 前以 develop 的 lib 產生）。新側：本 branch CLI 對 `mdn/corpus/` 實跑（32 個 id、33 檔，s09 為兩頁）。

行號說明：dot 標記的行號＝檔案行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」與兩張簽核表為機器區塊（`node specs/006-eslint-scope/tools/diffcheck.js mdn --verify specs/006-eslint-scope/mdn-diff.md` 核對），
由 `--report` 產生骨架後補「說明」；簽核欄 implementer 只填「草擬，待簽核」，使用者於 T071 簽核。

## 摘要（T065）

- CLI exit code：32 個 id 在 develop 與本 branch 皆為 0（見末節），不拋錯。
- 淨差異 190 筆，**全為新增**（無任何移除 pair／row，無 model、graph 差異）：
  - 全域類 132 筆（FR-006）：`Math`、`requestAnimationFrame`、`Object`、`alert` 未宣告只讀，成為頁面 `global` Var（頁面 entry 定義），
    及其讀取 pair；其中 `X: entry -> entry` 為函式 entry 節點讀本體變數（KI §18 既有行為）。
  - 解析類 58 筆（FR-004）：class 宣告的 class scope 內層綁定成為獨立 Var（空列或列分拆），每檔 pair multiset 不變。
  - catch、AnnexB、連結類 0 筆：範例集沒有 `catch`、block 內函式宣告的外部呼叫、具名函式／class 運算式名稱或同名遮蔽的呼叫點。
- 「解析類移除簽核」0 頁、「呼叫連結簽核」0 頁：兩表無列，無釘選筆數。
- 無法歸類（回歸候選）：0 筆。

## 淨差異（相對 develop，機器核對）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | a01-oojs-1 | inter-page | 0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 2 | a01-oojs-1 | page0 | intra-pages/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 3 | a01-oojs-1 | page0 | intra-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 4 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 5 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 6 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 7 | a01b-oojs-1-solution | page0 | intra-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 8 | a02-oojs-2 | inter-page | 0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 9 | a02-oojs-2 | page0 | intra-pages/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 10 | a02-oojs-2 | page0 | intra-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 11 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 12 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | row | + | `Square` | 解析 | FR-002–FR-005 | `class Square`（檔案 L20）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 13 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 14 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | row | + | `Square` | 解析 | FR-002–FR-005 | `class Square`（檔案 L20）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 15 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 16 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | row | + | `Square` | 解析 | FR-002–FR-005 | `class Square`（檔案 L20）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 17 | a02b-oojs-2-solution | page0 | intra-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 18 | a02b-oojs-2-solution | page0 | intra-procedurals/0.dupairs.dot | row | + | `Square` | 解析 | FR-002–FR-005 | `class Square`（檔案 L20）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 19 | a03-bouncing-main | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()` 中 `Math.floor(Math.random() …)`（檔案 L12）；`random` 未被頁面呼叫連結，無 pair |
| 20 | a03-bouncing-main | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()` 中 `Math.floor(Math.random() …)`（檔案 L12）；`random` 未被頁面呼叫連結，無 pair |
| 21 | a03-bouncing-main | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()` 中 `Math.floor(Math.random() …)`（檔案 L12）；`random` 未被頁面呼叫連結，無 pair |
| 22 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 23 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()`（L12）與 `Ball` 方法（L34–L64）讀 `Math`；這些函式不在 develop 既有的 inter-procedural 模型（只有 `loop`），故只有列、無 pair |
| 24 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 25 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 103` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 26 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 27 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 28 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()`（L12）與 `Ball` 方法（L34–L64）讀 `Math`；這些函式不在 develop 既有的 inter-procedural 模型（只有 `loop`），故只有列、無 pair |
| 29 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 30 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 103` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 31 | a04-bouncing-main-finished | page0 | inter-procedurals/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 32 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 33 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()`（L12）與 `Ball` 方法（L34–L64）讀 `Math`；這些函式不在 develop 既有的 inter-procedural 模型（只有 `loop`），故只有列、無 pair |
| 34 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 35 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 103` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 36 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 37 | a04-bouncing-main-finished | page0 | intra-procedurals/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 38 | a04-bouncing-main-finished | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()`（L12）與 `Ball` 方法（L34–L64）讀 `Math`；這些函式不在 develop 既有的 inter-procedural 模型（只有 `loop`），故只有列、無 pair |
| 39 | a04-bouncing-main-finished | page0 | intra-procedurals/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L102） |
| 40 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L38）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 41 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `EvilCircle` | 解析 | FR-002–FR-005 | `class EvilCircle`（檔案 L93）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 42 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()` 與類別方法讀 `Math`；不在 develop 既有的 inter-procedural 模型，只有列 |
| 43 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L27）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 44 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 45 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 203` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 46 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 47 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L38）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 48 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | row | + | `EvilCircle` | 解析 | FR-002–FR-005 | `class EvilCircle`（檔案 L93）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 49 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()` 與類別方法讀 `Math`；不在 develop 既有的 inter-procedural 模型，只有列 |
| 50 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L27）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 51 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 52 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 203` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 53 | a05-assessment-main | page0 | inter-procedurals/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 54 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L38）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 55 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `EvilCircle` | 解析 | FR-002–FR-005 | `class EvilCircle`（檔案 L93）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 56 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()` 與類別方法讀 `Math`；不在 develop 既有的 inter-procedural 模型，只有列 |
| 57 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L27）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 58 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 59 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 203` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 60 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 61 | a05-assessment-main | page0 | intra-procedurals/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L38）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 62 | a05-assessment-main | page0 | intra-procedurals/0.dupairs.dot | row | + | `EvilCircle` | 解析 | FR-002–FR-005 | `class EvilCircle`（檔案 L93）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 63 | a05-assessment-main | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`random()` 與類別方法讀 `Math`；不在 develop 既有的 inter-procedural 模型，只有列 |
| 64 | a05-assessment-main | page0 | intra-procedurals/0.dupairs.dot | row | + | `Shape` | 解析 | FR-002–FR-005 | `class Shape`（檔案 L27）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 65 | a05-assessment-main | page0 | intra-procedurals/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L202） |
| 66 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `Animal` | 解析 | FR-002–FR-005 | `class Animal`（檔案 L15）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 67 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `Example` | 解析 | FR-002–FR-005 | `class Example`（檔案 L67）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 68 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 69 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `Person` | 解析 | FR-002–FR-005 | `class Person`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 70 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `Professor` | 解析 | FR-002–FR-005 | `class Professor`（檔案 L24）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 71 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `Student` | 解析 | FR-002–FR-005 | `class Student`（檔案 L47）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 72 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 40` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 73 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 74 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `Animal` | 解析 | FR-002–FR-005 | `class Animal`（檔案 L15）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 75 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `Example` | 解析 | FR-002–FR-005 | `class Example`（檔案 L67）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 76 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 77 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `Person` | 解析 | FR-002–FR-005 | `class Person`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 78 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `Professor` | 解析 | FR-002–FR-005 | `class Professor`（檔案 L24）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 79 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `Student` | 解析 | FR-002–FR-005 | `class Student`（檔案 L47）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 80 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Math: entry -> 40` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 81 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 82 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `Animal` | 解析 | FR-002–FR-005 | `class Animal`（檔案 L15）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 83 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `Example` | 解析 | FR-002–FR-005 | `class Example`（檔案 L67）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 84 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 85 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `Person` | 解析 | FR-002–FR-005 | `class Person`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 86 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `Professor` | 解析 | FR-002–FR-005 | `class Professor`（檔案 L24）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 87 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `Student` | 解析 | FR-002–FR-005 | `class Student`（檔案 L47）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 88 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 40` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 89 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 90 | a06-classes-snippets | page0 | intra-procedurals/0.dupairs.dot | row | + | `Animal` | 解析 | FR-002–FR-005 | `class Animal`（檔案 L15）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 91 | a06-classes-snippets | page0 | intra-procedurals/0.dupairs.dot | row | + | `Example` | 解析 | FR-002–FR-005 | `class Example`（檔案 L67）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 92 | a06-classes-snippets | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Professor` 的 `grade` 方法中 `Math.floor(Math.random() …)`（檔案 L39） |
| 93 | a06-classes-snippets | page0 | intra-procedurals/0.dupairs.dot | row | + | `Person` | 解析 | FR-002–FR-005 | `class Person`（檔案 L1）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 94 | a06-classes-snippets | page0 | intra-procedurals/0.dupairs.dot | row | + | `Professor` | 解析 | FR-002–FR-005 | `class Professor`（檔案 L24）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 95 | a06-classes-snippets | page0 | intra-procedurals/0.dupairs.dot | row | + | `Student` | 解析 | FR-002–FR-005 | `class Student`（檔案 L47）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 96 | a07-prototypes-person | inter-page | 0.dupairs.dot | row | + | `Object` | 全域 | FR-006 | `Object` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 97 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `Object: entry -> 12` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 98 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `Object: entry -> 19` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 99 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `Object: entry -> 20` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 100 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | row | + | `Object` | 全域 | FR-006 | `Object` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 101 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `Object: entry -> 12` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 102 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `Object: entry -> 19` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 103 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `Object: entry -> 20` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 104 | a07-prototypes-person | page0 | intra-procedurals/0.dupairs.dot | row | + | `Object` | 全域 | FR-006 | `Object` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 105 | a07-prototypes-person | page0 | intra-procedurals/0.dupairs.dot | pair | + | `Object: entry -> 12` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 106 | a07-prototypes-person | page0 | intra-procedurals/0.dupairs.dot | pair | + | `Object: entry -> 19` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 107 | a07-prototypes-person | page0 | intra-procedurals/0.dupairs.dot | pair | + | `Object: entry -> 20` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Object.assign`（檔案 L11）、`Object.hasOwn`（L18、L19） |
| 108 | a08-prototype-chain-dowhile | inter-page | 0.dupairs.dot | row | + | `Object` | 全域 | FR-006 | `Object` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 do-while 中 `Object.getPrototypeOf`（檔案 L5） |
| 109 | a08-prototype-chain-dowhile | inter-page | 0.dupairs.dot | pair | + | `Object: entry -> 6` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 do-while 中 `Object.getPrototypeOf`（檔案 L5） |
| 110 | a08-prototype-chain-dowhile | page0 | intra-pages/0.dupairs.dot | row | + | `Object` | 全域 | FR-006 | `Object` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 do-while 中 `Object.getPrototypeOf`（檔案 L5） |
| 111 | a08-prototype-chain-dowhile | page0 | intra-pages/0.dupairs.dot | pair | + | `Object: entry -> 6` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 do-while 中 `Object.getPrototypeOf`（檔案 L5） |
| 112 | a08-prototype-chain-dowhile | page0 | intra-procedurals/0.dupairs.dot | row | + | `Object` | 全域 | FR-006 | `Object` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 do-while 中 `Object.getPrototypeOf`（檔案 L5） |
| 113 | a08-prototype-chain-dowhile | page0 | intra-procedurals/0.dupairs.dot | pair | + | `Object: entry -> 6` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 do-while 中 `Object.getPrototypeOf`（檔案 L5） |
| 114 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 115 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 48` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 116 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 49` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 117 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 118 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 119 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 48` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 120 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 49` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 121 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 122 | s06b-silly-story-finish | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`generateStory()` 中 `Math.round`（檔案 L47、L48；pair 只在此兩行，`randomValueFromArray()` L8 的讀取未進模型） |
| 123 | s08-number-guessing-game | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 `Math.floor(Math.random() …)`（檔案 L1；L66 在 `resetGame()` 內，未進模型） |
| 124 | s08-number-guessing-game | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 2` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Math.floor(Math.random() …)`（檔案 L1；L66 在 `resetGame()` 內，未進模型） |
| 125 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 `Math.floor(Math.random() …)`（檔案 L1；L66 在 `resetGame()` 內，未進模型） |
| 126 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 2` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Math.floor(Math.random() …)`（檔案 L1；L66 在 `resetGame()` 內，未進模型） |
| 127 | s08-number-guessing-game | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：頂層 `Math.floor(Math.random() …)`（檔案 L1；L66 在 `resetGame()` 內，未進模型） |
| 128 | s08-number-guessing-game | page0 | intra-procedurals/0.dupairs.dot | pair | + | `Math: entry -> 2` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：頂層 `Math.floor(Math.random() …)`（檔案 L1；L66 在 `resetGame()` 內，未進模型） |
| 129 | s09 | inter-page | 0.dupairs.dot | row | + | `alert` | 全域 | FR-006 | `alert` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：各頁函式中 `alert(...)`（s09-first.js L3、s09-second.js L3）；兩頁各自的 `global` Var（頁面＋名稱，不跨頁，US3-5），函式未被呼叫連結，無 pair |
| 130 | s09 | inter-page | 0.dupairs.dot | row | + | `alert` | 全域 | FR-006 | `alert` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：各頁函式中 `alert(...)`（s09-first.js L3、s09-second.js L3）；兩頁各自的 `global` Var（頁面＋名稱，不跨頁，US3-5），函式未被呼叫連結，無 pair |
| 131 | s09 | page0 | intra-pages/0.dupairs.dot | row | + | `alert` | 全域 | FR-006 | `alert` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：各頁函式中 `alert(...)`（s09-first.js L3、s09-second.js L3）；兩頁各自的 `global` Var（頁面＋名稱，不跨頁，US3-5），函式未被呼叫連結，無 pair |
| 132 | s09 | page0 | intra-procedurals/0.dupairs.dot | row | + | `alert` | 全域 | FR-006 | `alert` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：各頁函式中 `alert(...)`（s09-first.js L3、s09-second.js L3）；兩頁各自的 `global` Var（頁面＋名稱，不跨頁，US3-5），函式未被呼叫連結，無 pair |
| 133 | s09 | page1 | intra-pages/0.dupairs.dot | row | + | `alert` | 全域 | FR-006 | `alert` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：各頁函式中 `alert(...)`（s09-first.js L3、s09-second.js L3）；兩頁各自的 `global` Var（頁面＋名稱，不跨頁，US3-5），函式未被呼叫連結，無 pair |
| 134 | s09 | page1 | intra-procedurals/0.dupairs.dot | row | + | `alert` | 全域 | FR-006 | `alert` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：各頁函式中 `alert(...)`（s09-first.js L3、s09-second.js L3）；兩頁各自的 `global` Var（頁面＋名稱，不跨頁，US3-5），函式未被呼叫連結，無 pair |
| 135 | s13-functions-1-finish | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 136 | s13-functions-1-finish | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 15` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 137 | s13-functions-1-finish | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 138 | s13-functions-1-finish | page0 | inter-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 139 | s13-functions-1-finish | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Math: entry -> 15` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 140 | s13-functions-1-finish | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 141 | s13-functions-1-finish | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 142 | s13-functions-1-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 15` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 143 | s13-functions-1-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 144 | s13-functions-1-finish | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L14） |
| 145 | s14-functions-3 | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 146 | s14-functions-3 | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 19` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 147 | s14-functions-3 | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 148 | s14-functions-3 | page0 | inter-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 149 | s14-functions-3 | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Math: entry -> 19` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 150 | s14-functions-3 | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 151 | s14-functions-3 | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 152 | s14-functions-3 | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 19` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 153 | s14-functions-3 | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 154 | s14-functions-3 | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`chooseName()` 中 `Math.floor(Math.random() …)`（檔案 L18） |
| 155 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 156 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 157 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 158 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 41` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 159 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 45` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 160 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 49` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 161 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 53` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 162 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 66` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 163 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 164 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 105` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 165 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 166 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 167 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 168 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 169 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `Math: entry -> 41` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 170 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `Math: entry -> 45` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 171 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `Math: entry -> 49` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 172 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `Math: entry -> 53` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 173 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `Math: entry -> 66` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 174 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 175 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 105` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 176 | x01-bouncing-cycle | page0 | inter-procedurals/1.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 177 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 178 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 179 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 180 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 41` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 181 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 45` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 182 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 49` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 183 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 53` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 184 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 66` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 185 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 186 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> 105` | 全域 | FR-006 | 讀頁面 entry 的 `global` 定義（dot 行號＝檔案行號＋1）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 187 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `requestAnimationFrame: entry -> entry` | 全域 | FR-006 | 函式 entry 節點讀本體變數（KI §18 既有行為）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |
| 188 | x01-bouncing-cycle | page0 | intra-procedurals/0.dupairs.dot | row | + | `Ball` | 解析 | FR-002–FR-005 | `class Ball`（檔案 L21）的 class scope 內層綁定成為獨立 Var（FR-004）；pair multiset 不變 |
| 189 | x01-bouncing-cycle | page0 | intra-procedurals/0.dupairs.dot | row | + | `Math` | 全域 | FR-006 | `Math` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`Ball` 方法中 `Math.abs`（檔案 L40、L44、L48、L52）與 `Math.sqrt`（L65） |
| 190 | x01-bouncing-cycle | page0 | intra-procedurals/0.dupairs.dot | row | + | `requestAnimationFrame` | 全域 | FR-006 | `requestAnimationFrame` 未宣告只讀，成為頁面 `global` Var、頁面 entry 定義（D3）：`loop()` 中 `requestAnimationFrame(loop)`（檔案 L104） |

## 解析類移除簽核（F3：歸「解析」的移除 pair 的釘選筆數）

| case | 頁 | 移除筆數 | 原因摘要 | 簽核 |
|------|----|----------|----------|------|

## 呼叫連結簽核（衍生差異的釘選筆數）

| case | 頁 | 觸發（呼叫點：行、callee、解析變化） | 衍生 + | 衍生 − | 簽核 |
|------|----|----------------------------------------|---------|---------|------|

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

## 簽核（T071）

> **使用者簽核（T071）**：2026-11-17 由使用者（changfulin）對上表 190 筆淨差異（全為新增：全域 132、解析 58）一次簽核通過；
> 「解析類移除簽核」與「呼叫連結簽核」兩表無列，無需逐筆簽核。
