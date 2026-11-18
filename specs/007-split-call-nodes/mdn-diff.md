# MDN 差異紀錄（feature 007，FR-009、SC-003、SC-004）

基準：`edc22d5`（develop；MDN 基準為 Setup 於 lib＝`edc22d5` 時產生的快照 `specs/007-split-call-nodes/mdn/baseline-develop/`，含各模型的 `.dot` 與 `*.matching.json`、`exitcodes.json`、`<id>.pairs.txt`）

語料：`specs/006-eslint-scope/mdn/corpus/`（33 檔、32 個 id，`pages.json`）；本 branch 的輸出由 diffcheck 以 `node bin/dujs.js` 實跑到暫存目錄。
「淨差異」「重複列數」「釘選與簽核」「class static 不再連結」為機器區塊（`node specs/007-split-call-nodes/tools/diffcheck.js mdn --verify specs/007-split-call-nodes/mdn-diff.md` 核對），
MDN 驗證（Polish，T059）時以 `--report` 重產整表（相對 `edc22d5` 的累積結果）後補「說明」。
pair 以 (case, 頁, 檔案／層級, 變數) 的集合比對（重複列不產生差異），重複列數另表列出、不設門檻（KI §43）；基準側的 `call[_x]`／`callReturn[_x]` 依基準側 `*.matching.json` 改寫成 `call (<行>)`／`callReturn (<行>)` 後再比對（只在本 branch 同一模型的 `.graph.dot` 有 `label="call (` 時改寫，contracts/diff-check.md §1），只因改寫而消失的差異歸 `標記`。
`連結`、`求值順序`、`返回後例外` 與 KI 類（`§37`、`§38`、`§41`、`§43`、`§44`、`§46`）為釘選類別：「釘選與簽核」表的「說明」欄必填，簽核欄 implementer 只填「草擬，待簽核」，使用者於 MDN 驗證後簽核。
`標記`、`共通` 為機械判定，不釘選。`intra-procedurals/*` 的 pair 差異一律失敗（FR-006）。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | a01b-oojs-1-solution | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 2 | a01b-oojs-1-solution | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 3 | a01b-oojs-1-solution | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 4 | a01b-oojs-1-solution | page0 | inter-procedurals/0.hierarchy.dot | graph | ~ | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 5 | a01b-oojs-1-solution | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 6 | a01b-oojs-1-solution | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 7 | a01b-oojs-1-solution | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 8 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 9 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | row | + | `sideLength` | 連結 | FR-001 |  |
| 10 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | row | + | `sides` | 連結 | FR-001 |  |
| 11 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | - | `Shape: 2 -> 20` | 求值順序 | FR-002–FR-004 |  |
| 12 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | - | `Shape: 2 -> 23` | 連結 | FR-001 | （亦符：求值順序） |
| 13 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | + | `Shape: 2 -> call (20)` | 求值順序 | FR-002–FR-004 |  |
| 14 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | + | `Shape: 2 -> call (23)` | 連結 | FR-001 | （亦符：求值順序） |
| 15 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | + | `name: entry -> 8` | 連結 | FR-001 |  |
| 16 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | + | `sideLength: entry -> 10` | 連結 | FR-001 |  |
| 17 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | + | `sides: entry -> 9` | 連結 | FR-001 |  |
| 18 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | - | `square: 20 -> call (21)` | 連結 | FR-001 | （亦符：求值順序） |
| 19 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | + | `square: call (20) -> call (21)` | 連結 | FR-001 | （亦符：求值順序） |
| 20 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | - | `triangle: 23 -> call (24)` | 連結 | FR-001 | （亦符：求值順序） |
| 21 | a01b-oojs-1-solution | inter-page | 0.dupairs.dot | pair | + | `triangle: call (23) -> call (24)` | 連結 | FR-001 | （亦符：求值順序） |
| 22 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 23 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | row | + | `sideLength` | 連結 | FR-001 |  |
| 24 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | row | + | `sides` | 連結 | FR-001 |  |
| 25 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Shape: 2 -> 20` | 求值順序 | FR-002–FR-004 |  |
| 26 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Shape: 2 -> 23` | 連結 | FR-001 | （亦符：求值順序） |
| 27 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Shape: 2 -> call (20)` | 求值順序 | FR-002–FR-004 |  |
| 28 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Shape: 2 -> call (23)` | 連結 | FR-001 | （亦符：求值順序） |
| 29 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `name: entry -> 8` | 連結 | FR-001 |  |
| 30 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `sideLength: entry -> 10` | 連結 | FR-001 |  |
| 31 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `sides: entry -> 9` | 連結 | FR-001 |  |
| 32 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `square: 20 -> call (21)` | 連結 | FR-001 | （亦符：求值順序） |
| 33 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `square: call (20) -> call (21)` | 連結 | FR-001 | （亦符：求值順序） |
| 34 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `triangle: 23 -> call (24)` | 連結 | FR-001 | （亦符：求值順序） |
| 35 | a01b-oojs-1-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `triangle: call (23) -> call (24)` | 連結 | FR-001 | （亦符：求值順序） |
| 36 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 37 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | row | + | `sideLength` | 連結 | FR-001 |  |
| 38 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | row | + | `sides` | 連結 | FR-001 |  |
| 39 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `Shape: 2 -> 20` | 求值順序 | FR-002–FR-004 |  |
| 40 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `Shape: 2 -> 23` | 連結 | FR-001 | （亦符：求值順序） |
| 41 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `Shape: 2 -> call (20)` | 求值順序 | FR-002–FR-004 |  |
| 42 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `Shape: 2 -> call (23)` | 連結 | FR-001 | （亦符：求值順序） |
| 43 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `name: entry -> 8` | 連結 | FR-001 |  |
| 44 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `sideLength: entry -> 10` | 連結 | FR-001 |  |
| 45 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `sides: entry -> 9` | 連結 | FR-001 |  |
| 46 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `square: 20 -> call (21)` | 連結 | FR-001 | （亦符：求值順序） |
| 47 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `square: call (20) -> call (21)` | 連結 | FR-001 | （亦符：求值順序） |
| 48 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `triangle: 23 -> call (24)` | 連結 | FR-001 | （亦符：求值順序） |
| 49 | a01b-oojs-1-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `triangle: call (23) -> call (24)` | 連結 | FR-001 | （亦符：求值順序） |
| 50 | a02b-oojs-2-solution | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 51 | a02b-oojs-2-solution | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 52 | a02b-oojs-2-solution | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 53 | a02b-oojs-2-solution | page0 | inter-procedurals/0.hierarchy.dot | graph | ~ | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 54 | a02b-oojs-2-solution | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 55 | a02b-oojs-2-solution | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 56 | a02b-oojs-2-solution | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 57 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | row | + | `sideLength` | 連結 | FR-001 |  |
| 58 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | - | `Square: 21 -> 33` | 求值順序 | FR-002–FR-004 |  |
| 59 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | + | `Square: 21 -> call (33)` | 求值順序 | FR-002–FR-004 |  |
| 60 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | + | `sideLength: entry -> 23` | 連結 | FR-001 |  |
| 61 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | - | `square: 33 -> 35` | 連結 | FR-001 | （亦符：求值順序） |
| 62 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | - | `square: 33 -> call (36)` | 連結 | FR-001 | （亦符：求值順序） |
| 63 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | + | `square: call (33) -> 35` | 連結 | FR-001 | （亦符：求值順序） |
| 64 | a02b-oojs-2-solution | inter-page | 0.dupairs.dot | pair | + | `square: call (33) -> call (36)` | 連結 | FR-001 | （亦符：求值順序） |
| 65 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | row | + | `sideLength` | 連結 | FR-001 |  |
| 66 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Square: 21 -> 33` | 求值順序 | FR-002–FR-004 |  |
| 67 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Square: 21 -> call (33)` | 求值順序 | FR-002–FR-004 |  |
| 68 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `sideLength: entry -> 23` | 連結 | FR-001 |  |
| 69 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `square: 33 -> 35` | 連結 | FR-001 | （亦符：求值順序） |
| 70 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | - | `square: 33 -> call (36)` | 連結 | FR-001 | （亦符：求值順序） |
| 71 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `square: call (33) -> 35` | 連結 | FR-001 | （亦符：求值順序） |
| 72 | a02b-oojs-2-solution | page0 | inter-procedurals/0.dupairs.dot | pair | + | `square: call (33) -> call (36)` | 連結 | FR-001 | （亦符：求值順序） |
| 73 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | row | + | `sideLength` | 連結 | FR-001 |  |
| 74 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `Square: 21 -> 33` | 求值順序 | FR-002–FR-004 |  |
| 75 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `Square: 21 -> call (33)` | 求值順序 | FR-002–FR-004 |  |
| 76 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `sideLength: entry -> 23` | 連結 | FR-001 |  |
| 77 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `square: 33 -> 35` | 連結 | FR-001 | （亦符：求值順序） |
| 78 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | - | `square: 33 -> call (36)` | 連結 | FR-001 | （亦符：求值順序） |
| 79 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `square: call (33) -> 35` | 連結 | FR-001 | （亦符：求值順序） |
| 80 | a02b-oojs-2-solution | page0 | intra-pages/0.dupairs.dot | pair | + | `square: call (33) -> call (36)` | 連結 | FR-001 | （亦符：求值順序） |
| 81 | a03-bouncing-main | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 82 | a03-bouncing-main | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 83 | a03-bouncing-main | page0 | inter-procedurals/0.dupairs.dot | model | + | `inter-procedurals/0.dupairs.dot` | 連結 | FR-001 |  |
| 84 | a03-bouncing-main | page0 | inter-procedurals/0.graph.dot | graph | + | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 85 | a03-bouncing-main | page0 | inter-procedurals/0.hierarchy.dot | graph | + | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 86 | a03-bouncing-main | page0 | inter-procedurals/0.matching.json | matching | + | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 87 | a03-bouncing-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 88 | a03-bouncing-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 89 | a03-bouncing-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `max: entry -> 13` | 連結 | FR-001 |  |
| 90 | a03-bouncing-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `min: entry -> 13` | 連結 | FR-001 |  |
| 91 | a04-bouncing-main-finished | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 92 | a04-bouncing-main-finished | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 93 | a04-bouncing-main-finished | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 94 | a04-bouncing-main-finished | page0 | inter-procedurals/0.hierarchy.dot | graph | ~ | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 95 | a04-bouncing-main-finished | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 96 | a04-bouncing-main-finished | page0 | inter-procedurals/1.dupairs.dot | model | + | `inter-procedurals/1.dupairs.dot` | 連結 | FR-001 |  |
| 97 | a04-bouncing-main-finished | page0 | inter-procedurals/1.graph.dot | graph | + | `inter-procedurals/1.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 98 | a04-bouncing-main-finished | page0 | inter-procedurals/1.hierarchy.dot | graph | + | `inter-procedurals/1.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 99 | a04-bouncing-main-finished | page0 | inter-procedurals/1.matching.json | matching | + | `inter-procedurals/1.matching.json` | 共通 | — |  |
| 100 | a04-bouncing-main-finished | page0 | inter-procedurals/2.dupairs.dot | model | + | `inter-procedurals/2.dupairs.dot` | 連結 | FR-001 |  |
| 101 | a04-bouncing-main-finished | page0 | inter-procedurals/2.graph.dot | graph | + | `inter-procedurals/2.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 102 | a04-bouncing-main-finished | page0 | inter-procedurals/2.hierarchy.dot | graph | + | `inter-procedurals/2.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 103 | a04-bouncing-main-finished | page0 | inter-procedurals/2.matching.json | matching | + | `inter-procedurals/2.matching.json` | 共通 | — |  |
| 104 | a04-bouncing-main-finished | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 105 | a04-bouncing-main-finished | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 106 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `color` | 連結 | FR-001 |  |
| 107 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 108 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 109 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `size` | 連結 | FR-001 |  |
| 110 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `velX` | 連結 | FR-001 |  |
| 111 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `velY` | 連結 | FR-001 |  |
| 112 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 113 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 114 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `Ball: 22 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 115 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `Ball: 22 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 116 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 117 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `ball: 79 -> 90` | 連結 | FR-001 | （亦符：求值順序） |
| 118 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `ball: call (79) -> 90` | 連結 | FR-001 | （亦符：求值順序） |
| 119 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `balls: 75 -> (77,78)` | 連結 | FR-001 | （亦符：求值順序） |
| 120 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `balls: 75 -> (77,call (78))` | 連結 | FR-001 | （亦符：求值順序） |
| 121 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `color: entry -> 28` | 連結 | FR-001 |  |
| 122 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `height: 8 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 123 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `height: 8 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 124 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `max: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 125 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `min: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 126 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `random: entry -> 78` | 連結 | FR-001 | （亦符：求值順序） |
| 127 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `random: entry -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 128 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 129 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (78)` | 連結 | FR-001 | （亦符：求值順序） |
| 130 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 131 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `randomRGB: entry -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 132 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `randomRGB: entry -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 133 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `size: 78 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 134 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `size: call (78) -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 135 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `size: entry -> 29` | 連結 | FR-001 |  |
| 136 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `velX: entry -> 26` | 連結 | FR-001 |  |
| 137 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `velY: entry -> 27` | 連結 | FR-001 |  |
| 138 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | - | `width: 7 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 139 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `width: 7 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 140 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `x: entry -> 24` | 連結 | FR-001 |  |
| 141 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | pair | + | `y: entry -> 25` | 連結 | FR-001 |  |
| 142 | a04-bouncing-main-finished | inter-page | 0.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 143 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `ball` | 連結 | FR-001 |  |
| 144 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `color` | 連結 | FR-001 |  |
| 145 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `distance` | 連結 | FR-001 |  |
| 146 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `dx` | 連結 | FR-001 |  |
| 147 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `dy` | 連結 | FR-001 |  |
| 148 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 149 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 150 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 151 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 152 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 153 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 154 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `size` | 連結 | FR-001 |  |
| 155 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `velX` | 連結 | FR-001 |  |
| 156 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `velY` | 連結 | FR-001 |  |
| 157 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 158 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 159 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `Ball: 22 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 160 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Ball: 22 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 161 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Math: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 162 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> (62,61)` | 連結 | FR-001 |  |
| 163 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> (62,63)` | 連結 | FR-001 |  |
| 164 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> (67,61)` | 連結 | FR-001 |  |
| 165 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> (67,call (68))` | 連結 | FR-001 | （亦符：求值順序） |
| 166 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> 63` | 連結 | FR-001 |  |
| 167 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 61 -> 64` | 連結 | FR-001 |  |
| 168 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `ball: 79 -> 90` | 連結 | FR-001 | （亦符：求值順序） |
| 169 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: call (79) -> 90` | 連結 | FR-001 | （亦符：求值順序） |
| 170 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `balls: 75 -> (77,78)` | 連結 | FR-001 | （亦符：求值順序） |
| 171 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `balls: 75 -> (77,call (78))` | 連結 | FR-001 | （亦符：求值順序） |
| 172 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `color: entry -> 28` | 連結 | FR-001 |  |
| 173 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `distance: 65 -> (67,61)` | 連結 | FR-001 |  |
| 174 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `distance: 65 -> (67,call (68))` | 連結 | FR-001 | （亦符：求值順序） |
| 175 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `dx: 63 -> 65` | 連結 | FR-001 |  |
| 176 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `dy: 64 -> 65` | 連結 | FR-001 |  |
| 177 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `height: 8 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 178 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `height: 8 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 179 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `max: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 180 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `min: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 181 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `random: entry -> 78` | 連結 | FR-001 | （亦符：求值順序） |
| 182 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `random: entry -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 183 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 184 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (78)` | 連結 | FR-001 | （亦符：求值順序） |
| 185 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 186 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `randomRGB: entry -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 187 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `randomRGB: entry -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 188 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `size: 78 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 189 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `size: call (78) -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 190 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `size: entry -> 29` | 連結 | FR-001 |  |
| 191 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `velX: entry -> 26` | 連結 | FR-001 |  |
| 192 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `velY: entry -> 27` | 連結 | FR-001 |  |
| 193 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | - | `width: 7 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 194 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `width: 7 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 195 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `x: entry -> 24` | 連結 | FR-001 |  |
| 196 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | pair | + | `y: entry -> 25` | 連結 | FR-001 |  |
| 197 | a04-bouncing-main-finished | page0 | inter-procedurals/*.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 198 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `color` | 連結 | FR-001 |  |
| 199 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 200 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 201 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `size` | 連結 | FR-001 |  |
| 202 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `velX` | 連結 | FR-001 |  |
| 203 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `velY` | 連結 | FR-001 |  |
| 204 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 205 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 206 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `Ball: 22 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 207 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `Ball: 22 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 208 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 209 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `ball: 79 -> 90` | 連結 | FR-001 | （亦符：求值順序） |
| 210 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `ball: call (79) -> 90` | 連結 | FR-001 | （亦符：求值順序） |
| 211 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 75 -> (77,78)` | 連結 | FR-001 | （亦符：求值順序） |
| 212 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `balls: 75 -> (77,call (78))` | 連結 | FR-001 | （亦符：求值順序） |
| 213 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `color: entry -> 28` | 連結 | FR-001 |  |
| 214 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 8 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 215 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `height: 8 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 216 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `max: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 217 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `min: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 218 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `random: entry -> 78` | 連結 | FR-001 | （亦符：求值順序） |
| 219 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `random: entry -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 220 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 221 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (78)` | 連結 | FR-001 | （亦符：求值順序） |
| 222 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 223 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `randomRGB: entry -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 224 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `randomRGB: entry -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 225 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `size: 78 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 226 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `size: call (78) -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 227 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `size: entry -> 29` | 連結 | FR-001 |  |
| 228 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `velX: entry -> 26` | 連結 | FR-001 |  |
| 229 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `velY: entry -> 27` | 連結 | FR-001 |  |
| 230 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 7 -> 79` | 連結 | FR-001 | （亦符：求值順序） |
| 231 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `width: 7 -> call (79)` | 連結 | FR-001 | （亦符：求值順序） |
| 232 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `x: entry -> 24` | 連結 | FR-001 |  |
| 233 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | pair | + | `y: entry -> 25` | 連結 | FR-001 |  |
| 234 | a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 235 | a05-assessment-main | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 236 | a05-assessment-main | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 237 | a05-assessment-main | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 238 | a05-assessment-main | page0 | inter-procedurals/0.hierarchy.dot | graph | ~ | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 239 | a05-assessment-main | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 240 | a05-assessment-main | page0 | inter-procedurals/1.dupairs.dot | model | + | `inter-procedurals/1.dupairs.dot` | 連結 | FR-001 |  |
| 241 | a05-assessment-main | page0 | inter-procedurals/1.graph.dot | graph | + | `inter-procedurals/1.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 242 | a05-assessment-main | page0 | inter-procedurals/1.hierarchy.dot | graph | + | `inter-procedurals/1.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 243 | a05-assessment-main | page0 | inter-procedurals/1.matching.json | matching | + | `inter-procedurals/1.matching.json` | 共通 | — |  |
| 244 | a05-assessment-main | page0 | inter-procedurals/2.dupairs.dot | model | + | `inter-procedurals/2.dupairs.dot` | 連結 | FR-001 |  |
| 245 | a05-assessment-main | page0 | inter-procedurals/2.graph.dot | graph | + | `inter-procedurals/2.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 246 | a05-assessment-main | page0 | inter-procedurals/2.hierarchy.dot | graph | + | `inter-procedurals/2.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 247 | a05-assessment-main | page0 | inter-procedurals/2.matching.json | matching | + | `inter-procedurals/2.matching.json` | 共通 | — |  |
| 248 | a05-assessment-main | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 249 | a05-assessment-main | page0 | intra-pages/0.hierarchy.dot | graph | ~ | `intra-pages/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 250 | a05-assessment-main | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 251 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `color` | 連結 | FR-001 |  |
| 252 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `e` | 連結 | FR-001 |  |
| 253 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 254 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 255 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `num` | 連結 | FR-001 |  |
| 256 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `size` | 連結 | FR-001 |  |
| 257 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `velX` | 連結 | FR-001 |  |
| 258 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `velY` | 連結 | FR-001 |  |
| 259 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 260 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 261 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 262 | a05-assessment-main | inter-page | 0.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 263 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `Ball: 39 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 264 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `Ball: 39 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 265 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `EvilCircle: 94 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 266 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `EvilCircle: 94 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 267 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 268 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `ball: 170 -> 180` | 連結 | FR-001 | （亦符：求值順序） |
| 269 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `ball: call (170) -> 180` | 連結 | FR-001 | （亦符：求值順序） |
| 270 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `balls: 166 -> (168,169)` | 連結 | FR-001 | （亦符：求值順序） |
| 271 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `balls: 166 -> (168,185)` | 連結 | FR-001 | （亦符：求值順序） |
| 272 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `balls: 166 -> (168,call (169))` | 連結 | FR-001 | （亦符：求值順序） |
| 273 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `balls: 166 -> (168,call (185))` | 連結 | FR-001 | （亦符：求值順序） |
| 274 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `color: entry -> 44` | 連結 | FR-001 |  |
| 275 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (104,105)` | 連結 | FR-001 |  |
| 276 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (104,107)` | 連結 | FR-001 |  |
| 277 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (107,108)` | 連結 | FR-001 |  |
| 278 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (107,110)` | 連結 | FR-001 |  |
| 279 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (110,111)` | 連結 | FR-001 |  |
| 280 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (110,113)` | 連結 | FR-001 |  |
| 281 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (113,114)` | 連結 | FR-001 |  |
| 282 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `e: entry -> (113,exit)` | 連結 | FR-001 |  |
| 283 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `evilBall: 185 -> 199` | 連結 | FR-001 | （亦符：求值順序） |
| 284 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `evilBall: 185 -> 200` | 連結 | FR-001 | （亦符：求值順序） |
| 285 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `evilBall: 185 -> 201` | 連結 | FR-001 | （亦符：求值順序） |
| 286 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `evilBall: call (185) -> 199` | 連結 | FR-001 | （亦符：求值順序） |
| 287 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `evilBall: call (185) -> 200` | 連結 | FR-001 | （亦符：求值順序） |
| 288 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `evilBall: call (185) -> 201` | 連結 | FR-001 | （亦符：求值順序） |
| 289 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `height: 13 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 290 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `height: 13 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 291 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `height: 13 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 292 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `height: 13 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 293 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `max: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 294 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `min: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 295 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `num: 18 -> 19` | 連結 | FR-001 | （亦符：§43） |
| 296 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `random: entry -> 169` | 連結 | FR-001 | （亦符：求值順序） |
| 297 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `random: entry -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 298 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `random: entry -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 299 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (169)` | 連結 | FR-001 | （亦符：求值順序） |
| 300 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 301 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 302 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (25)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 303 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `randomRGB: entry -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 304 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `randomRGB: entry -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 305 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `size: 169 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 306 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `size: call (169) -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 307 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `size: entry -> 45` | 連結 | FR-001 |  |
| 308 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `velX: entry -> 42` | 連結 | FR-001 |  |
| 309 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `velY: entry -> 42` | 連結 | FR-001 |  |
| 310 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `width: 12 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 311 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | - | `width: 12 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 312 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `width: 12 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 313 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `width: 12 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 314 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `window: entry -> 102` | 連結 | FR-001 |  |
| 315 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `x: entry -> 42` | 連結 | FR-001 |  |
| 316 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `x: entry -> 97` | 連結 | FR-001 |  |
| 317 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `y: entry -> 42` | 連結 | FR-001 |  |
| 318 | a05-assessment-main | inter-page | 0.dupairs.dot | pair | + | `y: entry -> 97` | 連結 | FR-001 |  |
| 319 | a05-assessment-main | inter-page | 0.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 320 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `ball` | 連結 | FR-001 |  |
| 321 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `color` | 連結 | FR-001 |  |
| 322 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `distance` | 連結 | FR-001 |  |
| 323 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `dx` | 連結 | FR-001 |  |
| 324 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `dy` | 連結 | FR-001 |  |
| 325 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 326 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 327 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 328 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 329 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 330 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 331 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `num` | 連結 | FR-001 |  |
| 332 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `num` | 連結 | FR-001 |  |
| 333 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `num` | 連結 | FR-001 |  |
| 334 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `size` | 連結 | FR-001 |  |
| 335 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `velX` | 連結 | FR-001 |  |
| 336 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `velY` | 連結 | FR-001 |  |
| 337 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 338 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 339 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 340 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 341 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `Ball: 39 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 342 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Ball: 39 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 343 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `EvilCircle: 94 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 344 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `EvilCircle: 94 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 345 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Math: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 346 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `ball: 170 -> 180` | 連結 | FR-001 | （亦符：求值順序） |
| 347 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> (80,79)` | 連結 | FR-001 |  |
| 348 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> (80,80:T)` | 連結 | FR-001 |  |
| 349 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> (80:T,79)` | 連結 | FR-001 |  |
| 350 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> (80:T,81)` | 連結 | FR-001 |  |
| 351 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> (85,79)` | 連結 | FR-001 |  |
| 352 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> (85,call (86))` | 連結 | FR-001 | （亦符：求值順序） |
| 353 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> 81` | 連結 | FR-001 |  |
| 354 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 79 -> 82` | 連結 | FR-001 |  |
| 355 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: call (170) -> 180` | 連結 | FR-001 | （亦符：求值順序） |
| 356 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `balls: 166 -> (168,169)` | 連結 | FR-001 | （亦符：求值順序） |
| 357 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `balls: 166 -> (168,185)` | 連結 | FR-001 | （亦符：求值順序） |
| 358 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `balls: 166 -> (168,call (169))` | 連結 | FR-001 | （亦符：求值順序） |
| 359 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `balls: 166 -> (168,call (185))` | 連結 | FR-001 | （亦符：求值順序） |
| 360 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `color: entry -> 44` | 連結 | FR-001 |  |
| 361 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `distance: 83 -> (85,79)` | 連結 | FR-001 |  |
| 362 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `distance: 83 -> (85,call (86))` | 連結 | FR-001 | （亦符：求值順序） |
| 363 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `dx: 81 -> 83` | 連結 | FR-001 |  |
| 364 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `dy: 82 -> 83` | 連結 | FR-001 |  |
| 365 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `evilBall: 185 -> 199` | 連結 | FR-001 | （亦符：求值順序） |
| 366 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `evilBall: 185 -> 200` | 連結 | FR-001 | （亦符：求值順序） |
| 367 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `evilBall: 185 -> 201` | 連結 | FR-001 | （亦符：求值順序） |
| 368 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `evilBall: call (185) -> 199` | 連結 | FR-001 | （亦符：求值順序） |
| 369 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `evilBall: call (185) -> 200` | 連結 | FR-001 | （亦符：求值順序） |
| 370 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `evilBall: call (185) -> 201` | 連結 | FR-001 | （亦符：求值順序） |
| 371 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `height: 13 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 372 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `height: 13 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 373 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `height: 13 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 374 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `height: 13 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 375 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `max: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 376 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `min: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 377 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `num: 18 -> 19` | 連結 | FR-001 | （亦符：§43） |
| 378 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `random: entry -> 169` | 連結 | FR-001 | （亦符：求值順序） |
| 379 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `random: entry -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 380 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `random: entry -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 381 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (169)` | 連結 | FR-001 | （亦符：求值順序） |
| 382 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 383 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 384 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (25)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 385 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `randomRGB: entry -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 386 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `randomRGB: entry -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 387 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `size: 169 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 388 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `size: call (169) -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 389 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `size: entry -> 45` | 連結 | FR-001 |  |
| 390 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `velX: entry -> 42` | 連結 | FR-001 |  |
| 391 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `velY: entry -> 42` | 連結 | FR-001 |  |
| 392 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `width: 12 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 393 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | - | `width: 12 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 394 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `width: 12 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 395 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `width: 12 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 396 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `window: entry -> 102` | 連結 | FR-001 |  |
| 397 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `x: entry -> 42` | 連結 | FR-001 |  |
| 398 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `x: entry -> 97` | 連結 | FR-001 |  |
| 399 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `y: entry -> 42` | 連結 | FR-001 |  |
| 400 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | pair | + | `y: entry -> 97` | 連結 | FR-001 |  |
| 401 | a05-assessment-main | page0 | inter-procedurals/*.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 402 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `color` | 連結 | FR-001 |  |
| 403 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `e` | 連結 | FR-001 |  |
| 404 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 405 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 406 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `num` | 連結 | FR-001 |  |
| 407 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `size` | 連結 | FR-001 |  |
| 408 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `velX` | 連結 | FR-001 |  |
| 409 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `velY` | 連結 | FR-001 |  |
| 410 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 411 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `x` | 連結 | FR-001 |  |
| 412 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 413 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | + | `y` | 連結 | FR-001 |  |
| 414 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `Ball: 39 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 415 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `Ball: 39 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 416 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `EvilCircle: 94 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 417 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `EvilCircle: 94 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 418 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 419 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `ball: 170 -> 180` | 連結 | FR-001 | （亦符：求值順序） |
| 420 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `ball: call (170) -> 180` | 連結 | FR-001 | （亦符：求值順序） |
| 421 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 166 -> (168,169)` | 連結 | FR-001 | （亦符：求值順序） |
| 422 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 166 -> (168,185)` | 連結 | FR-001 | （亦符：求值順序） |
| 423 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `balls: 166 -> (168,call (169))` | 連結 | FR-001 | （亦符：求值順序） |
| 424 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `balls: 166 -> (168,call (185))` | 連結 | FR-001 | （亦符：求值順序） |
| 425 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `color: entry -> 44` | 連結 | FR-001 |  |
| 426 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (104,105)` | 連結 | FR-001 |  |
| 427 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (104,107)` | 連結 | FR-001 |  |
| 428 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (107,108)` | 連結 | FR-001 |  |
| 429 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (107,110)` | 連結 | FR-001 |  |
| 430 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (110,111)` | 連結 | FR-001 |  |
| 431 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (110,113)` | 連結 | FR-001 |  |
| 432 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (113,114)` | 連結 | FR-001 |  |
| 433 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `e: entry -> (113,exit)` | 連結 | FR-001 |  |
| 434 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `evilBall: 185 -> 199` | 連結 | FR-001 | （亦符：求值順序） |
| 435 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `evilBall: 185 -> 200` | 連結 | FR-001 | （亦符：求值順序） |
| 436 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `evilBall: 185 -> 201` | 連結 | FR-001 | （亦符：求值順序） |
| 437 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `evilBall: call (185) -> 199` | 連結 | FR-001 | （亦符：求值順序） |
| 438 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `evilBall: call (185) -> 200` | 連結 | FR-001 | （亦符：求值順序） |
| 439 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `evilBall: call (185) -> 201` | 連結 | FR-001 | （亦符：求值順序） |
| 440 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 13 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 441 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 13 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 442 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `height: 13 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 443 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `height: 13 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 444 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `max: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 445 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `min: entry -> 18` | 連結 | FR-001 | （亦符：§43） |
| 446 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `num: 18 -> 19` | 連結 | FR-001 | （亦符：§43） |
| 447 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `random: entry -> 169` | 連結 | FR-001 | （亦符：求值順序） |
| 448 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `random: entry -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 449 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `random: entry -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 450 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (169)` | 連結 | FR-001 | （亦符：求值順序） |
| 451 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 452 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 453 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (25)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 454 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `randomRGB: entry -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 455 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `randomRGB: entry -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 456 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `size: 169 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 457 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `size: call (169) -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 458 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `size: entry -> 45` | 連結 | FR-001 |  |
| 459 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `velX: entry -> 42` | 連結 | FR-001 |  |
| 460 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `velY: entry -> 42` | 連結 | FR-001 |  |
| 461 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 12 -> 170` | 連結 | FR-001 | （亦符：求值順序） |
| 462 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 12 -> 185` | 連結 | FR-001 | （亦符：求值順序） |
| 463 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `width: 12 -> call (170)` | 連結 | FR-001 | （亦符：求值順序） |
| 464 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `width: 12 -> call (185)` | 連結 | FR-001 | （亦符：求值順序） |
| 465 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `window: entry -> 102` | 連結 | FR-001 |  |
| 466 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `x: entry -> 42` | 連結 | FR-001 |  |
| 467 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `x: entry -> 97` | 連結 | FR-001 |  |
| 468 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `y: entry -> 42` | 連結 | FR-001 |  |
| 469 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | pair | + | `y: entry -> 97` | 連結 | FR-001 |  |
| 470 | a05-assessment-main | page0 | intra-pages/0.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 471 | a06-classes-snippets | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 472 | a06-classes-snippets | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 473 | a06-classes-snippets | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 474 | a06-classes-snippets | page0 | inter-procedurals/0.hierarchy.dot | graph | ~ | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 475 | a06-classes-snippets | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 476 | a06-classes-snippets | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 477 | a06-classes-snippets | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 478 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 479 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 480 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 481 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `teaches` | 連結 | FR-001 |  |
| 482 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | + | `year` | 連結 | FR-001 |  |
| 483 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `Person: 2 -> 13` | 求值順序 | FR-002–FR-004 |  |
| 484 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `Person: 2 -> call (13)` | 求值順序 | FR-002–FR-004 |  |
| 485 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `Professor: 25 -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 486 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `Professor: 25 -> call (44)` | 連結 | FR-001 | （亦符：求值順序） |
| 487 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `Student: 48 -> 64` | 連結 | FR-001 | （亦符：求值順序） |
| 488 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `Student: 48 -> call (64)` | 連結 | FR-001 | （亦符：求值順序） |
| 489 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `giles: 13 -> call (15)` | 連結 | FR-001 | （亦符：求值順序） |
| 490 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `giles: call (13) -> call (15)` | 連結 | FR-001 | （亦符：求值順序） |
| 491 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `name: entry -> 29` | 連結 | FR-001 |  |
| 492 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `name: entry -> 52` | 連結 | FR-001 |  |
| 493 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `name: entry -> 6` | 連結 | FR-001 |  |
| 494 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `summers: 64 -> call (66)` | 連結 | FR-001 | （亦符：求值順序） |
| 495 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `summers: 64 -> call (67)` | 連結 | FR-001 | （亦符：求值順序） |
| 496 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `summers: call (64) -> call (66)` | 連結 | FR-001 | （亦符：求值順序） |
| 497 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `summers: call (64) -> call (67)` | 連結 | FR-001 | （亦符：求值順序） |
| 498 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `teaches: entry -> 30` | 連結 | FR-001 |  |
| 499 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `walsh: 44 -> call (45)` | 連結 | FR-001 | （亦符：求值順序） |
| 500 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | - | `walsh: 44 -> call (47)` | 連結 | FR-001 | （亦符：求值順序） |
| 501 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `walsh: call (44) -> call (45)` | 連結 | FR-001 | （亦符：求值順序） |
| 502 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `walsh: call (44) -> call (47)` | 連結 | FR-001 | （亦符：求值順序） |
| 503 | a06-classes-snippets | inter-page | 0.dupairs.dot | pair | + | `year: entry -> 53` | 連結 | FR-001 |  |
| 504 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | ~ | `myExample` | 標記 | FR-007 |  |
| 505 | a06-classes-snippets | inter-page | 0.dupairs.dot | row | ~ | `spot` | 標記 | FR-007 |  |
| 506 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 507 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 508 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 509 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `teaches` | 連結 | FR-001 |  |
| 510 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | + | `year` | 連結 | FR-001 |  |
| 511 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Person: 2 -> 13` | 求值順序 | FR-002–FR-004 |  |
| 512 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Person: 2 -> call (13)` | 求值順序 | FR-002–FR-004 |  |
| 513 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Professor: 25 -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 514 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Professor: 25 -> call (44)` | 連結 | FR-001 | （亦符：求值順序） |
| 515 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `Student: 48 -> 64` | 連結 | FR-001 | （亦符：求值順序） |
| 516 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `Student: 48 -> call (64)` | 連結 | FR-001 | （亦符：求值順序） |
| 517 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `giles: 13 -> call (15)` | 連結 | FR-001 | （亦符：求值順序） |
| 518 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `giles: call (13) -> call (15)` | 連結 | FR-001 | （亦符：求值順序） |
| 519 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `name: entry -> 29` | 連結 | FR-001 |  |
| 520 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `name: entry -> 52` | 連結 | FR-001 |  |
| 521 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `name: entry -> 6` | 連結 | FR-001 |  |
| 522 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `summers: 64 -> call (66)` | 連結 | FR-001 | （亦符：求值順序） |
| 523 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `summers: 64 -> call (67)` | 連結 | FR-001 | （亦符：求值順序） |
| 524 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `summers: call (64) -> call (66)` | 連結 | FR-001 | （亦符：求值順序） |
| 525 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `summers: call (64) -> call (67)` | 連結 | FR-001 | （亦符：求值順序） |
| 526 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `teaches: entry -> 30` | 連結 | FR-001 |  |
| 527 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `walsh: 44 -> call (45)` | 連結 | FR-001 | （亦符：求值順序） |
| 528 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | - | `walsh: 44 -> call (47)` | 連結 | FR-001 | （亦符：求值順序） |
| 529 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `walsh: call (44) -> call (45)` | 連結 | FR-001 | （亦符：求值順序） |
| 530 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `walsh: call (44) -> call (47)` | 連結 | FR-001 | （亦符：求值順序） |
| 531 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | pair | + | `year: entry -> 53` | 連結 | FR-001 |  |
| 532 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | ~ | `myExample` | 標記 | FR-007 |  |
| 533 | a06-classes-snippets | page0 | inter-procedurals/0.dupairs.dot | row | ~ | `spot` | 標記 | FR-007 |  |
| 534 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 535 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 536 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 537 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `teaches` | 連結 | FR-001 |  |
| 538 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | + | `year` | 連結 | FR-001 |  |
| 539 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `Person: 2 -> 13` | 求值順序 | FR-002–FR-004 |  |
| 540 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `Person: 2 -> call (13)` | 求值順序 | FR-002–FR-004 |  |
| 541 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `Professor: 25 -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 542 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `Professor: 25 -> call (44)` | 連結 | FR-001 | （亦符：求值順序） |
| 543 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `Student: 48 -> 64` | 連結 | FR-001 | （亦符：求值順序） |
| 544 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `Student: 48 -> call (64)` | 連結 | FR-001 | （亦符：求值順序） |
| 545 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `giles: 13 -> call (15)` | 連結 | FR-001 | （亦符：求值順序） |
| 546 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `giles: call (13) -> call (15)` | 連結 | FR-001 | （亦符：求值順序） |
| 547 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `name: entry -> 29` | 連結 | FR-001 |  |
| 548 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `name: entry -> 52` | 連結 | FR-001 |  |
| 549 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `name: entry -> 6` | 連結 | FR-001 |  |
| 550 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `summers: 64 -> call (66)` | 連結 | FR-001 | （亦符：求值順序） |
| 551 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `summers: 64 -> call (67)` | 連結 | FR-001 | （亦符：求值順序） |
| 552 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `summers: call (64) -> call (66)` | 連結 | FR-001 | （亦符：求值順序） |
| 553 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `summers: call (64) -> call (67)` | 連結 | FR-001 | （亦符：求值順序） |
| 554 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `teaches: entry -> 30` | 連結 | FR-001 |  |
| 555 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `walsh: 44 -> call (45)` | 連結 | FR-001 | （亦符：求值順序） |
| 556 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | - | `walsh: 44 -> call (47)` | 連結 | FR-001 | （亦符：求值順序） |
| 557 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `walsh: call (44) -> call (45)` | 連結 | FR-001 | （亦符：求值順序） |
| 558 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `walsh: call (44) -> call (47)` | 連結 | FR-001 | （亦符：求值順序） |
| 559 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | pair | + | `year: entry -> 53` | 連結 | FR-001 |  |
| 560 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | ~ | `myExample` | 標記 | FR-007 |  |
| 561 | a06-classes-snippets | page0 | intra-pages/0.dupairs.dot | row | ~ | `spot` | 標記 | FR-007 |  |
| 562 | a07-prototypes-person | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 563 | a07-prototypes-person | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 564 | a07-prototypes-person | page0 | inter-procedurals/0.dupairs.dot | model | + | `inter-procedurals/0.dupairs.dot` | 連結 | FR-001 |  |
| 565 | a07-prototypes-person | page0 | inter-procedurals/0.graph.dot | graph | + | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 566 | a07-prototypes-person | page0 | inter-procedurals/0.hierarchy.dot | graph | + | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 567 | a07-prototypes-person | page0 | inter-procedurals/0.matching.json | matching | + | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 568 | a07-prototypes-person | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 569 | a07-prototypes-person | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 570 | a07-prototypes-person | inter-page | 0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 571 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | - | `Person: entry -> 15` | 求值順序 | FR-002–FR-004 |  |
| 572 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | - | `Person: entry -> 17` | 連結 | FR-001 | （亦符：求值順序） |
| 573 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `Person: entry -> call (15)` | 求值順序 | FR-002–FR-004 |  |
| 574 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `Person: entry -> call (17)` | 連結 | FR-001 | （亦符：求值順序） |
| 575 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | - | `irma: 17 -> 19` | 連結 | FR-001 | （亦符：求值順序） |
| 576 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | - | `irma: 17 -> 20` | 連結 | FR-001 | （亦符：求值順序） |
| 577 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `irma: call (17) -> 19` | 連結 | FR-001 | （亦符：求值順序） |
| 578 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `irma: call (17) -> 20` | 連結 | FR-001 | （亦符：求值順序） |
| 579 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `name: entry -> 9` | 連結 | FR-001 |  |
| 580 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | - | `reuben: 15 -> 16` | 連結 | FR-001 | （亦符：求值順序） |
| 581 | a07-prototypes-person | inter-page | 0.dupairs.dot | pair | + | `reuben: call (15) -> 16` | 連結 | FR-001 | （亦符：求值順序） |
| 582 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Array` | 連結 | FR-001 |  |
| 583 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Boolean` | 連結 | FR-001 |  |
| 584 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Date` | 連結 | FR-001 |  |
| 585 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Map` | 連結 | FR-001 |  |
| 586 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Number` | 連結 | FR-001 |  |
| 587 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Object` | 連結 | FR-001 |  |
| 588 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Person` | 連結 | FR-001 |  |
| 589 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `Set` | 連結 | FR-001 |  |
| 590 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `String` | 連結 | FR-001 |  |
| 591 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `WeakMap` | 連結 | FR-001 |  |
| 592 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `console` | 連結 | FR-001 |  |
| 593 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `document` | 連結 | FR-001 |  |
| 594 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `irma` | 連結 | FR-001 |  |
| 595 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 596 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `personPrototype` | 連結 | FR-001 |  |
| 597 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `reuben` | 連結 | FR-001 |  |
| 598 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | row | + | `window` | 連結 | FR-001 |  |
| 599 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Object: entry -> 12` | 連結（層級新增） | FR-001 | 層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 600 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Object: entry -> 19` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 601 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Object: entry -> 20` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 602 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Person: entry -> 12` | 連結（層級新增） | FR-001 | 層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 603 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Person: entry -> call (15)` | 求值順序 | FR-002–FR-004 |  |
| 604 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Person: entry -> call (17)` | 連結 | FR-001 | （亦符：求值順序） |
| 605 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `console: entry -> 19` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 606 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `console: entry -> 20` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 607 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `irma: call (17) -> 19` | 連結 | FR-001 | （亦符：求值順序） |
| 608 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `irma: call (17) -> 20` | 連結 | FR-001 | （亦符：求值順序） |
| 609 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `name: entry -> 9` | 連結 | FR-001 |  |
| 610 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `personPrototype: 2 -> 12` | 連結（層級新增） | FR-001 | 層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 611 | a07-prototypes-person | page0 | inter-procedurals/*.dupairs.dot | pair | + | `reuben: call (15) -> 16` | 連結 | FR-001 | （亦符：求值順序） |
| 612 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 613 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | - | `Person: entry -> 15` | 求值順序 | FR-002–FR-004 |  |
| 614 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | - | `Person: entry -> 17` | 連結 | FR-001 | （亦符：求值順序） |
| 615 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `Person: entry -> call (15)` | 求值順序 | FR-002–FR-004 |  |
| 616 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `Person: entry -> call (17)` | 連結 | FR-001 | （亦符：求值順序） |
| 617 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | - | `irma: 17 -> 19` | 連結 | FR-001 | （亦符：求值順序） |
| 618 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | - | `irma: 17 -> 20` | 連結 | FR-001 | （亦符：求值順序） |
| 619 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `irma: call (17) -> 19` | 連結 | FR-001 | （亦符：求值順序） |
| 620 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `irma: call (17) -> 20` | 連結 | FR-001 | （亦符：求值順序） |
| 621 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `name: entry -> 9` | 連結 | FR-001 |  |
| 622 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | - | `reuben: 15 -> 16` | 連結 | FR-001 | （亦符：求值順序） |
| 623 | a07-prototypes-person | page0 | intra-pages/0.dupairs.dot | pair | + | `reuben: call (15) -> 16` | 連結 | FR-001 | （亦符：求值順序） |
| 624 | s06b-silly-story-finish | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 625 | s06b-silly-story-finish | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 626 | s06b-silly-story-finish | page0 | inter-procedurals/0.dupairs.dot | model | + | `inter-procedurals/0.dupairs.dot` | 連結 | FR-001 |  |
| 627 | s06b-silly-story-finish | page0 | inter-procedurals/0.graph.dot | graph | + | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 628 | s06b-silly-story-finish | page0 | inter-procedurals/0.hierarchy.dot | graph | + | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 629 | s06b-silly-story-finish | page0 | inter-procedurals/0.matching.json | matching | + | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 630 | s06b-silly-story-finish | page0 | inter-procedurals/1.dupairs.dot | model | + | `inter-procedurals/1.dupairs.dot` | 連結 | FR-001 |  |
| 631 | s06b-silly-story-finish | page0 | inter-procedurals/1.graph.dot | graph | + | `inter-procedurals/1.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 632 | s06b-silly-story-finish | page0 | inter-procedurals/1.hierarchy.dot | graph | + | `inter-procedurals/1.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 633 | s06b-silly-story-finish | page0 | inter-procedurals/1.matching.json | matching | + | `inter-procedurals/1.matching.json` | 共通 | — |  |
| 634 | s06b-silly-story-finish | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 635 | s06b-silly-story-finish | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 636 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | row | + | `array` | 連結 | FR-001 |  |
| 637 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | row | + | `random` | 連結 | FR-001 |  |
| 638 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | row | + | `randomCharacter` | 連結 | FR-001 |  |
| 639 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | row | + | `randomEvent` | 連結 | FR-001 |  |
| 640 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | row | + | `randomPlace` | 連結 | FR-001 |  |
| 641 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | row | + | `storyText` | 連結 | FR-001 |  |
| 642 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 9` | 連結 | FR-001 |  |
| 643 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `array: entry -> 10` | 連結 | FR-001 |  |
| 644 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `array: entry -> 9` | 連結 | FR-001 |  |
| 645 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `characters: 15 -> call (26)` | 連結 | FR-001 | （亦符：求值順序） |
| 646 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `events: 17 -> call (28)` | 連結 | FR-001 | （亦符：求值順序） |
| 647 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `newStory: 40 -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 648 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `newStory: 40 -> 50` | 連結 | FR-001 | （亦符：求值順序） |
| 649 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `newStory: 40 -> 54` | 連結 | FR-001 | （亦符：求值順序） |
| 650 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `newStory: call (40) -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 651 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `newStory: call (40) -> 50` | 連結 | FR-001 | （亦符：求值順序） |
| 652 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `newStory: call (40) -> 54` | 連結 | FR-001 | （亦符：求值順序） |
| 653 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `places: 16 -> call (27)` | 連結 | FR-001 | （亦符：求值順序） |
| 654 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `random: 9 -> 10` | 連結 | FR-001 |  |
| 655 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `randomCharacter: call (26) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 656 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `randomEvent: call (28) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 657 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `randomPlace: call (27) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 658 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `randomValueFromArray: entry -> call (26)` | 連結 | FR-001 | （亦符：求值順序） |
| 659 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `randomValueFromArray: entry -> call (27)` | 連結 | FR-001 | （亦符：求值順序） |
| 660 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `randomValueFromArray: entry -> call (28)` | 連結 | FR-001 | （亦符：求值順序） |
| 661 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | - | `returnRandomStoryString: entry -> 40` | 連結 | FR-001 | （亦符：求值順序） |
| 662 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `returnRandomStoryString: entry -> call (40)` | 連結 | FR-001 | （亦符：求值順序） |
| 663 | s06b-silly-story-finish | inter-page | 0.dupairs.dot | pair | + | `storyText: 30 -> 32` | 連結 | FR-001 |  |
| 664 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `array` | 連結 | FR-001 |  |
| 665 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `array` | 連結 | FR-001 |  |
| 666 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `name` | 連結 | FR-001 |  |
| 667 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `newStory` | 連結 | FR-001 |  |
| 668 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `random` | 連結 | FR-001 |  |
| 669 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `random` | 連結 | FR-001 |  |
| 670 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `randomCharacter` | 連結 | FR-001 |  |
| 671 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `randomCharacter` | 連結 | FR-001 |  |
| 672 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `randomEvent` | 連結 | FR-001 |  |
| 673 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `randomEvent` | 連結 | FR-001 |  |
| 674 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `randomPlace` | 連結 | FR-001 |  |
| 675 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `randomPlace` | 連結 | FR-001 |  |
| 676 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `story` | 連結 | FR-001 |  |
| 677 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `storyText` | 連結 | FR-001 |  |
| 678 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `storyText` | 連結 | FR-001 |  |
| 679 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `temperature` | 連結 | FR-001 |  |
| 680 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | row | + | `weight` | 連結 | FR-001 |  |
| 681 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `array: entry -> 10` | 連結 | FR-001 |  |
| 682 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `array: entry -> 9` | 連結 | FR-001 |  |
| 683 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `name: 43 -> 44` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 684 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `newStory: 44 -> 50` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 685 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `newStory: 44 -> 54` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 686 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `newStory: 50 -> 51` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 687 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `newStory: 51 -> 54` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 688 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `newStory: call (40) -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 689 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `newStory: call (40) -> 50` | 連結 | FR-001 | （亦符：求值順序） |
| 690 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `newStory: call (40) -> 54` | 連結 | FR-001 | （亦符：求值順序） |
| 691 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: 9 -> 10` | 連結 | FR-001 |  |
| 692 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `randomCharacter: call (26) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 693 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `randomEvent: call (28) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 694 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `randomPlace: call (27) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 695 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `storyText: 30 -> 32` | 連結 | FR-001 |  |
| 696 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `temperature: 49 -> 51` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 697 | s06b-silly-story-finish | page0 | inter-procedurals/*.dupairs.dot | pair | + | `weight: 48 -> 50` | 連結 | FR-001 | （亦符：連結（層級新增））；層級新增：對應基準檔 page0/intra-pages/0.dupairs.dot |
| 698 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | row | + | `array` | 連結 | FR-001 |  |
| 699 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | row | + | `random` | 連結 | FR-001 |  |
| 700 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | row | + | `randomCharacter` | 連結 | FR-001 |  |
| 701 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | row | + | `randomEvent` | 連結 | FR-001 |  |
| 702 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | row | + | `randomPlace` | 連結 | FR-001 |  |
| 703 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | row | + | `storyText` | 連結 | FR-001 |  |
| 704 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 9` | 連結 | FR-001 |  |
| 705 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `array: entry -> 10` | 連結 | FR-001 |  |
| 706 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `array: entry -> 9` | 連結 | FR-001 |  |
| 707 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `characters: 15 -> call (26)` | 連結 | FR-001 | （亦符：求值順序） |
| 708 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `events: 17 -> call (28)` | 連結 | FR-001 | （亦符：求值順序） |
| 709 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `newStory: 40 -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 710 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `newStory: 40 -> 50` | 連結 | FR-001 | （亦符：求值順序） |
| 711 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `newStory: 40 -> 54` | 連結 | FR-001 | （亦符：求值順序） |
| 712 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `newStory: call (40) -> 44` | 連結 | FR-001 | （亦符：求值順序） |
| 713 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `newStory: call (40) -> 50` | 連結 | FR-001 | （亦符：求值順序） |
| 714 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `newStory: call (40) -> 54` | 連結 | FR-001 | （亦符：求值順序） |
| 715 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `places: 16 -> call (27)` | 連結 | FR-001 | （亦符：求值順序） |
| 716 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `random: 9 -> 10` | 連結 | FR-001 |  |
| 717 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `randomCharacter: call (26) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 718 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `randomEvent: call (28) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 719 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `randomPlace: call (27) -> 30` | 連結 | FR-001 | （亦符：求值順序） |
| 720 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `randomValueFromArray: entry -> call (26)` | 連結 | FR-001 | （亦符：求值順序） |
| 721 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `randomValueFromArray: entry -> call (27)` | 連結 | FR-001 | （亦符：求值順序） |
| 722 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `randomValueFromArray: entry -> call (28)` | 連結 | FR-001 | （亦符：求值順序） |
| 723 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | - | `returnRandomStoryString: entry -> 40` | 連結 | FR-001 | （亦符：求值順序） |
| 724 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `returnRandomStoryString: entry -> call (40)` | 連結 | FR-001 | （亦符：求值順序） |
| 725 | s06b-silly-story-finish | page0 | intra-pages/0.dupairs.dot | pair | + | `storyText: 30 -> 32` | 連結 | FR-001 |  |
| 726 | s07-gallery-finish | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 標記 | FR-007 |  |
| 727 | s07-gallery-finish | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 標記 | FR-007 |  |
| 728 | s07-gallery-finish | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 標記 | FR-007 |  |
| 729 | s07-gallery-finish | inter-page | 0.dupairs.dot | row | ~ | `e` | 標記 | FR-007 |  |
| 730 | s07-gallery-finish | inter-page | 0.dupairs.dot | row | ~ | `updateDisplayedImage` | 標記 | FR-007 |  |
| 731 | s07-gallery-finish | page0 | inter-procedurals/0.dupairs.dot | row | ~ | `e` | 標記 | FR-007 |  |
| 732 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | row | ~ | `e` | 標記 | FR-007 |  |
| 733 | s07-gallery-finish | page0 | intra-pages/0.dupairs.dot | row | ~ | `updateDisplayedImage` | 標記 | FR-007 |  |
| 734 | s08-number-guessing-game | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 標記 | FR-007 |  |
| 735 | s08-number-guessing-game | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 標記 | FR-007 |  |
| 736 | s08-number-guessing-game | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 標記 | FR-007 |  |
| 737 | s08-number-guessing-game | inter-page | 0.dupairs.dot | row | ~ | `setGameOver` | 標記 | FR-007 |  |
| 738 | s08-number-guessing-game | page0 | intra-pages/0.dupairs.dot | row | ~ | `setGameOver` | 標記 | FR-007 |  |
| 739 | s10-allowance-updater | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 標記 | FR-007 |  |
| 740 | s10-allowance-updater | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 標記 | FR-007 |  |
| 741 | s10-allowance-updater | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 標記 | FR-007 |  |
| 742 | s10-allowance-updater | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 標記 | FR-007 |  |
| 743 | s10-allowance-updater | inter-page | 0.dupairs.dot | row | ~ | `updateAllowance` | 標記 | FR-007 |  |
| 744 | s10-allowance-updater | page0 | inter-procedurals/0.dupairs.dot | row | ~ | `updateAllowance` | 標記 | FR-007 |  |
| 745 | s10-allowance-updater | page0 | intra-pages/0.dupairs.dot | row | ~ | `updateAllowance` | 標記 | FR-007 |  |
| 746 | s13-functions-1-finish | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 標記 | FR-007 |  |
| 747 | s13-functions-1-finish | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 標記 | FR-007 |  |
| 748 | s13-functions-1-finish | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 標記 | FR-007 |  |
| 749 | s13-functions-1-finish | inter-page | 0.dupairs.dot | row | ~ | `chooseName` | 標記 | FR-007 |  |
| 750 | s13-functions-1-finish | page0 | inter-procedurals/0.dupairs.dot | row | ~ | `chooseName` | 標記 | FR-007 |  |
| 751 | s13-functions-1-finish | page0 | intra-pages/0.dupairs.dot | row | ~ | `chooseName` | 標記 | FR-007 |  |
| 752 | s14-functions-3 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 標記 | FR-007 |  |
| 753 | s14-functions-3 | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 標記 | FR-007 |  |
| 754 | s14-functions-3 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 標記 | FR-007 |  |
| 755 | s14-functions-3 | inter-page | 0.dupairs.dot | row | ~ | `chooseName` | 標記 | FR-007 |  |
| 756 | s14-functions-3 | page0 | inter-procedurals/0.dupairs.dot | row | ~ | `chooseName` | 標記 | FR-007 |  |
| 757 | s14-functions-3 | page0 | intra-pages/0.dupairs.dot | row | ~ | `chooseName` | 標記 | FR-007 |  |
| 758 | x01-bouncing-cycle | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 759 | x01-bouncing-cycle | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 760 | x01-bouncing-cycle | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 761 | x01-bouncing-cycle | page0 | inter-procedurals/0.hierarchy.dot | graph | ~ | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 762 | x01-bouncing-cycle | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 763 | x01-bouncing-cycle | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 764 | x01-bouncing-cycle | page0 | inter-procedurals/1.hierarchy.dot | graph | ~ | `inter-procedurals/1.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 765 | x01-bouncing-cycle | page0 | inter-procedurals/1.matching.json | matching | ~ | `inter-procedurals/1.matching.json` | 共通 | — |  |
| 766 | x01-bouncing-cycle | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 767 | x01-bouncing-cycle | page0 | inter-procedurals/2.hierarchy.dot | graph | ~ | `inter-procedurals/2.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 768 | x01-bouncing-cycle | page0 | inter-procedurals/2.matching.json | matching | ~ | `inter-procedurals/2.matching.json` | 共通 | — |  |
| 769 | x01-bouncing-cycle | page0 | inter-procedurals/3.dupairs.dot | model | + | `inter-procedurals/3.dupairs.dot` | 連結 | FR-001 |  |
| 770 | x01-bouncing-cycle | page0 | inter-procedurals/3.graph.dot | graph | + | `inter-procedurals/3.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 771 | x01-bouncing-cycle | page0 | inter-procedurals/3.hierarchy.dot | graph | + | `inter-procedurals/3.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 772 | x01-bouncing-cycle | page0 | inter-procedurals/3.matching.json | matching | + | `inter-procedurals/3.matching.json` | 共通 | — |  |
| 773 | x01-bouncing-cycle | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 774 | x01-bouncing-cycle | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 775 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 776 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 777 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `Ball: 22 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 778 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Ball: 22 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 779 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `Math: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 780 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `ball: 62 -> (68,69)` | 連結 | FR-001 | （亦符：求值順序） |
| 781 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `ball: 62 -> (68,call (69))` | 連結 | FR-001 | （亦符：求值順序） |
| 782 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `ball: 81 -> 92` | 連結 | FR-001 | （亦符：求值順序） |
| 783 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `ball: call (81) -> 92` | 連結 | FR-001 | （亦符：求值順序） |
| 784 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `balls: 77 -> (79,80)` | 連結 | FR-001 | （亦符：求值順序） |
| 785 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `balls: 77 -> (79,call (80))` | 連結 | FR-001 | （亦符：求值順序） |
| 786 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `distance: 66 -> (68,69)` | 連結 | FR-001 | （亦符：求值順序） |
| 787 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `distance: 66 -> (68,call (69))` | 連結 | FR-001 | （亦符：求值順序） |
| 788 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `height: 8 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 789 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `height: 8 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 790 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `max: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 791 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `min: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 792 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `random: entry -> 80` | 連結 | FR-001 | （亦符：求值順序） |
| 793 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `random: entry -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 794 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 795 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (80)` | 連結 | FR-001 | （亦符：求值順序） |
| 796 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `random: entry -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 797 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `randomRGB: entry -> 69` | 連結 | FR-001 | （亦符：求值順序） |
| 798 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `randomRGB: entry -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 799 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `randomRGB: entry -> call (69)` | 連結 | FR-001 | （亦符：求值順序） |
| 800 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `randomRGB: entry -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 801 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `size: 80 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 802 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `size: call (80) -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 803 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | - | `width: 7 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 804 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | pair | + | `width: 7 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 805 | x01-bouncing-cycle | inter-page | 0.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 806 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 807 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 808 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 809 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 810 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 811 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 812 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 813 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 814 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `Ball: 22 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 815 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Ball: 22 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 816 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `Math: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 817 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `ball: 62 -> (68,69)` | 連結 | FR-001 | （亦符：求值順序） |
| 818 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: 62 -> (68,call (69))` | 連結 | FR-001 | （亦符：求值順序） |
| 819 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `ball: 81 -> 92` | 連結 | FR-001 | （亦符：求值順序） |
| 820 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `ball: call (81) -> 92` | 連結 | FR-001 | （亦符：求值順序） |
| 821 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `balls: 77 -> (79,80)` | 連結 | FR-001 | （亦符：求值順序） |
| 822 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `balls: 77 -> (79,call (80))` | 連結 | FR-001 | （亦符：求值順序） |
| 823 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `distance: 66 -> (68,69)` | 連結 | FR-001 | （亦符：求值順序） |
| 824 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `distance: 66 -> (68,call (69))` | 連結 | FR-001 | （亦符：求值順序） |
| 825 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `height: 8 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 826 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `height: 8 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 827 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `max: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 828 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `min: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 829 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `random: entry -> 80` | 連結 | FR-001 | （亦符：求值順序） |
| 830 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `random: entry -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 831 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 832 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (80)` | 連結 | FR-001 | （亦符：求值順序） |
| 833 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `random: entry -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 834 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `randomRGB: entry -> 69` | 連結 | FR-001 | （亦符：求值順序） |
| 835 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `randomRGB: entry -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 836 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `randomRGB: entry -> call (69)` | 連結 | FR-001 | （亦符：求值順序） |
| 837 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `randomRGB: entry -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 838 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `size: 80 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 839 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `size: call (80) -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 840 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | - | `width: 7 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 841 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | pair | + | `width: 7 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 842 | x01-bouncing-cycle | page0 | inter-procedurals/*.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |
| 843 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | row | + | `max` | 連結 | FR-001 |  |
| 844 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | row | + | `min` | 連結 | FR-001 |  |
| 845 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `Ball: 22 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 846 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Ball: 22 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 847 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `Math: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 848 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `ball: 62 -> (68,69)` | 連結 | FR-001 | （亦符：求值順序） |
| 849 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `ball: 62 -> (68,call (69))` | 連結 | FR-001 | （亦符：求值順序） |
| 850 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `ball: 81 -> 92` | 連結 | FR-001 | （亦符：求值順序） |
| 851 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `ball: call (81) -> 92` | 連結 | FR-001 | （亦符：求值順序） |
| 852 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `balls: 77 -> (79,80)` | 連結 | FR-001 | （亦符：求值順序） |
| 853 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `balls: 77 -> (79,call (80))` | 連結 | FR-001 | （亦符：求值順序） |
| 854 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `distance: 66 -> (68,69)` | 連結 | FR-001 | （亦符：求值順序） |
| 855 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `distance: 66 -> (68,call (69))` | 連結 | FR-001 | （亦符：求值順序） |
| 856 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `height: 8 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 857 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `height: 8 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 858 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `max: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 859 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `min: entry -> 13` | 連結 | FR-001 | （亦符：§43） |
| 860 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `random: entry -> 80` | 連結 | FR-001 | （亦符：求值順序） |
| 861 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `random: entry -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 862 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 863 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (80)` | 連結 | FR-001 | （亦符：求值順序） |
| 864 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `random: entry -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 865 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `randomRGB: entry -> 69` | 連結 | FR-001 | （亦符：求值順序） |
| 866 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `randomRGB: entry -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 867 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `randomRGB: entry -> call (69)` | 連結 | FR-001 | （亦符：求值順序） |
| 868 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `randomRGB: entry -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 869 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `size: 80 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 870 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `size: call (80) -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 871 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | - | `width: 7 -> 81` | 連結 | FR-001 | （亦符：求值順序） |
| 872 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | pair | + | `width: 7 -> call (81)` | 連結 | FR-001 | （亦符：求值順序） |
| 873 | x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | row | ~ | `loop` | 標記 | FR-007 |  |

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 007 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| a04-bouncing-main-finished | inter-page | 0.dupairs.dot | 0 | 7 | +7 |
| a04-bouncing-main-finished | page0 | inter-procedurals/1.dupairs.dot | 0 | 7 | +7 |
| a04-bouncing-main-finished | page0 | intra-pages/0.dupairs.dot | 0 | 7 | +7 |
| a05-assessment-main | inter-page | 0.dupairs.dot | 0 | 8 | +8 |
| a05-assessment-main | page0 | inter-procedurals/1.dupairs.dot | 0 | 8 | +8 |
| a05-assessment-main | page0 | intra-pages/0.dupairs.dot | 0 | 8 | +8 |
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
| x01-bouncing-cycle | inter-page | 0.dupairs.dot | 0 | 7 | +7 |
| x01-bouncing-cycle | page0 | inter-procedurals/2.dupairs.dot | 0 | 7 | +7 |
| x01-bouncing-cycle | page0 | intra-pages/0.dupairs.dot | 0 | 7 | +7 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| a01b-oojs-1-solution | inter-page | 連結 | L20 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0；L23 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0 | 9 | 3 | US2：`const square = new Shape(...)`（L20）、`const triangle = new Shape(...)`（L23）連結 Shape 的 constructor（FR-001）；+ 為 constructor 內（`name`、`sides`、`sideLength` 的讀取）與呼叫點之後的 pair，`square`／`triangle` 的定義端改為 `call (20)`／`call (23)`（−／+ 同一 pair 換標記；返回後才做的定義標在 `call (N)`，DECISION 011） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#1、#8、#9、#10、#12、#14、#15、#16、#17、#18、#19、#20、#21） |
| a01b-oojs-1-solution | page0 | 連結 | L20 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0；L23 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0 | 18 | 6 | US2：`const square = new Shape(...)`（L20）、`const triangle = new Shape(...)`（L23）連結 Shape 的 constructor（FR-001）；+ 為 constructor 內（`name`、`sides`、`sideLength` 的讀取）與呼叫點之後的 pair，`square`／`triangle` 的定義端改為 `call (20)`／`call (23)`（−／+ 同一 pair 換標記；返回後才做的定義標在 `call (N)`，DECISION 011） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#3、#4、#6、#22、#23、#24、#26、#28、#29、#30、#31、#32、#33、#34、#35、#36、#37、#38、#40、#42、#43、#44、#45、#46、#47、#48、#49） |
| a01b-oojs-1-solution | inter-page | 求值順序 | 呼叫點行 L20、L21、L23、L24 | 1 | 1 | L20／L23 的 `Shape` 讀取在呼叫之前（段 0），use 端由 `20`／`23` 改為 `call (20)`／`call (23)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#11、#13） |
| a01b-oojs-1-solution | page0 | 求值順序 | 呼叫點行 L20、L21、L23、L24 | 2 | 2 | L20／L23 的 `Shape` 讀取在呼叫之前（段 0），use 端由 `20`／`23` 改為 `call (20)`／`call (23)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#25、#27、#39、#41） |
| a02b-oojs-2-solution | inter-page | 連結 | L33 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_2 | 4 | 2 | US2：`const square = new Square(4)`（L33）連結 Square 的 constructor（FR-001）；+ 為 constructor 內 `sideLength` 的讀取與呼叫點之後的 pair，`square` 的定義端改為 `call (33)`（−／+ 同一 pair 換標記，DECISION 011） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#50、#57、#60、#61、#62、#63、#64） |
| a02b-oojs-2-solution | page0 | 連結 | L33 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_2 | 8 | 4 | US2：`const square = new Square(4)`（L33）連結 Square 的 constructor（FR-001）；+ 為 constructor 內 `sideLength` 的讀取與呼叫點之後的 pair，`square` 的定義端改為 `call (33)`（−／+ 同一 pair 換標記，DECISION 011） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#52、#53、#55、#65、#68、#69、#70、#71、#72、#73、#76、#77、#78、#79、#80） |
| a02b-oojs-2-solution | inter-page | 求值順序 | 呼叫點行 L33、L36 | 1 | 1 | L33 的 `Square` 讀取在呼叫之前（段 0），use 端由 `33` 改為 `call (33)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#58、#59） |
| a02b-oojs-2-solution | page0 | 求值順序 | 呼叫點行 L33、L36 | 2 | 2 | L33 的 `Square` 讀取在呼叫之前（段 0），use 端由 `33` 改為 `call (33)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#66、#67、#74、#75） |
| a03-bouncing-main | inter-page | 連結 | L19 → $DOMAIN.$PAGE_0.random | 0 | 0 | US2：`randomRGB` 的 template literal 中 `random(0, 255)`（L19）成為呼叫點並連結 random（FR-001）；page0 + 為新 inter-procedural 模型中 random 內 `min`／`max` 的讀取；inter-page 只有 graph 差異（0／0） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#81） |
| a03-bouncing-main | page0 | 連結 | L19 → $DOMAIN.$PAGE_0.random | 7 | 0 | US2：`randomRGB` 的 template literal 中 `random(0, 255)`（L19）成為呼叫點並連結 random（FR-001）；page0 + 為新 inter-procedural 模型中 random 內 `min`／`max` 的讀取；inter-page 只有 graph 差異（0／0） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#83、#84、#85、#87、#88、#89、#90） |
| a04-bouncing-main-finished | inter-page | 連結 | L19 → $DOMAIN.$PAGE_0.random；L78 → $DOMAIN.$PAGE_0.random；L79 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0、$DOMAIN.$PAGE_0.random、$DOMAIN.$PAGE_0.randomRGB；L68 → $DOMAIN.$PAGE_0.randomRGB | 27 | 9 | US2：`randomRGB` 內 `random(...)`（L19）、`ball.color = this.color = randomRGB()`（L68）、`const size = random(10, 20)`（L78）、`new Ball(random(...), …, randomRGB(), size)`（L79）成為呼叫點並連結（FR-001）；+ 為 random、randomRGB、Ball constructor 內（`min`、`max`、`Math`、`x`、`y`、`velX`、`velY`、`color`、`size`）與呼叫點之後的 pair，− 為呼叫點行的讀取／定義改由 `call (N)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#91、#106、#107、#108、#109、#110、#111、#112、#113、#114、#115、#116、#117、#118、#119、#120、#121、#122、#123、#124、#125、#126、#127、#128、#129、#130、#131、#132、#133、#134、#135、#136、#137、#138、#139、#140、#141） |
| a04-bouncing-main-finished | page0 | 連結 | L19 → $DOMAIN.$PAGE_0.random；L78 → $DOMAIN.$PAGE_0.random；L79 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0、$DOMAIN.$PAGE_0.random、$DOMAIN.$PAGE_0.randomRGB；L68 → $DOMAIN.$PAGE_0.randomRGB | 78 | 18 | US2：`randomRGB` 內 `random(...)`（L19）、`ball.color = this.color = randomRGB()`（L68）、`const size = random(10, 20)`（L78）、`new Ball(random(...), …, randomRGB(), size)`（L79）成為呼叫點並連結（FR-001）；+ 為 random、randomRGB、Ball constructor 內（`min`、`max`、`Math`、`x`、`y`、`velX`、`velY`、`color`、`size`）與呼叫點之後的 pair，− 為呼叫點行的讀取／定義改由 `call (N)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#93、#94、#96、#97、#98、#100、#101、#102、#104、#143、#144、#145、#146、#147、#148、#149、#150、#151、#152、#153、#154、#155、#156、#157、#158、#159、#160、#161、#162、#163、#164、#165、#166、#167、#168、#169、#170、#171、#172、#173、#174、#175、#176、#177、#178、#179、#180、#181、#182、#183、#184、#185、#186、#187、#188、#189、#190、#191、#192、#193、#194、#195、#196、#198、#199、#200、#201、#202、#203、#204、#205、#206、#207、#208、#209、#210、#211、#212、#213、#214、#215、#216、#217、#218、#219、#220、#221、#222、#223、#224、#225、#226、#227、#228、#229、#230、#231、#232、#233） |
| a05-assessment-main | inter-page | 連結 | L25 → $DOMAIN.$PAGE_0.random；L169 → $DOMAIN.$PAGE_0.random；L170 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1、$DOMAIN.$PAGE_0.random、$DOMAIN.$PAGE_0.randomRGB；L185 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_5、$DOMAIN.$PAGE_0.random；L86 → $DOMAIN.$PAGE_0.randomRGB | 51 | 17 | US2：同 a04（`randomRGB` L25、`randomRGB()` 賦值 L86、`random(10, 20)` L169、`new Ball(...)` L170）另加 `const evilBall = new EvilCircle(random(0, width), random(0, height))`（L185）連結 EvilCircle 的 constructor 與兩個 random（FR-001）；+ 含 EvilCircle constructor 內 `x`／`y` 與其註冊的 keydown handler 中 `e` 的 pair、`evilBall` 定義端改為 `call (185)`；− 為呼叫點行的讀取／定義改由 `call (N)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#235、#251、#252、#253、#254、#255、#256、#257、#258、#259、#260、#261、#262、#263、#264、#265、#266、#267、#268、#269、#270、#271、#272、#273、#274、#275、#276、#277、#278、#279、#280、#281、#282、#283、#284、#285、#286、#287、#288、#289、#290、#291、#292、#293、#294、#295、#296、#297、#298、#299、#300、#301、#302、#303、#304、#305、#306、#307、#308、#309、#310、#311、#312、#313、#314、#315、#316、#317、#318） |
| a05-assessment-main | page0 | 連結 | L25 → $DOMAIN.$PAGE_0.random；L169 → $DOMAIN.$PAGE_0.random；L170 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1、$DOMAIN.$PAGE_0.random、$DOMAIN.$PAGE_0.randomRGB；L185 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_5、$DOMAIN.$PAGE_0.random；L86 → $DOMAIN.$PAGE_0.randomRGB | 121 | 34 | US2：同 a04（`randomRGB` L25、`randomRGB()` 賦值 L86、`random(10, 20)` L169、`new Ball(...)` L170）另加 `const evilBall = new EvilCircle(random(0, width), random(0, height))`（L185）連結 EvilCircle 的 constructor 與兩個 random（FR-001）；+ 含 EvilCircle constructor 內 `x`／`y` 與其註冊的 keydown handler 中 `e` 的 pair、`evilBall` 定義端改為 `call (185)`；− 為呼叫點行的讀取／定義改由 `call (N)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#237、#238、#240、#241、#242、#244、#245、#246、#248、#249、#320、#321、#322、#323、#324、#325、#326、#327、#328、#329、#330、#331、#332、#333、#334、#335、#336、#337、#338、#339、#340、#341、#342、#343、#344、#345、#346、#347、#348、#349、#350、#351、#352、#353、#354、#355、#356、#357、#358、#359、#360、#361、#362、#363、#364、#365、#366、#367、#368、#369、#370、#371、#372、#373、#374、#375、#376、#377、#378、#379、#380、#381、#382、#383、#384、#385、#386、#387、#388、#389、#390、#391、#392、#393、#394、#395、#396、#397、#398、#399、#400、#402、#403、#404、#405、#406、#407、#408、#409、#410、#411、#412、#413、#414、#415、#416、#417、#418、#419、#420、#421、#422、#423、#424、#425、#426、#427、#428、#429、#430、#431、#432、#433、#434、#435、#436、#437、#438、#439、#440、#441、#442、#443、#444、#445、#446、#447、#448、#449、#450、#451、#452、#453、#454、#455、#456、#457、#458、#459、#460、#461、#462、#463、#464、#465、#466、#467、#468、#469） |
| a06-classes-snippets | inter-page | 連結 | L13 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0；L44 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_3；L64 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_6 | 17 | 7 | US2：`new Person("Giles")`（L13）、`new Professor(...)`（L44）、`new Student(...)`（L64）連結各 constructor（含 `super(name)` 串接的 Person constructor）（FR-001）；+ 為 constructor 內 `name`、`teaches`、`year` 的讀取與呼叫點之後的 pair，`giles`／`walsh`／`summers` 的定義端改為 `call (N)`（−／+ 同一 pair 換標記，DECISION 011）；`Professor`／`Student` 讀取改到 `call (N)`（亦符求值順序） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#471、#478、#479、#480、#481、#482、#485、#486、#487、#488、#489、#490、#491、#492、#493、#494、#495、#496、#497、#498、#499、#500、#501、#502、#503） |
| a06-classes-snippets | page0 | 連結 | L13 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0；L44 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_3；L64 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_6 | 34 | 14 | US2：`new Person("Giles")`（L13）、`new Professor(...)`（L44）、`new Student(...)`（L64）連結各 constructor（含 `super(name)` 串接的 Person constructor）（FR-001）；+ 為 constructor 內 `name`、`teaches`、`year` 的讀取與呼叫點之後的 pair，`giles`／`walsh`／`summers` 的定義端改為 `call (N)`（−／+ 同一 pair 換標記，DECISION 011）；`Professor`／`Student` 讀取改到 `call (N)`（亦符求值順序） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#473、#474、#476、#506、#507、#508、#509、#510、#513、#514、#515、#516、#517、#518、#519、#520、#521、#522、#523、#524、#525、#526、#527、#528、#529、#530、#531、#534、#535、#536、#537、#538、#541、#542、#543、#544、#545、#546、#547、#548、#549、#550、#551、#552、#553、#554、#555、#556、#557、#558、#559） |
| a06-classes-snippets | inter-page | 求值順序 | 呼叫點行 L13、L15、L24、L44、L45、L47、L64、L66、L67、L80 | 1 | 1 | L13 的 `Person` 讀取在呼叫之前（段 0），use 端由 `13` 改為 `call (13)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#483、#484） |
| a06-classes-snippets | page0 | 求值順序 | 呼叫點行 L13、L15、L24、L44、L45、L47、L64、L66、L67、L80 | 2 | 2 | L13 的 `Person` 讀取在呼叫之前（段 0），use 端由 `13` 改為 `call (13)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#511、#512、#539、#540） |
| a07-prototypes-person | inter-page | 連結 | L15 → $DOMAIN.$PAGE_0.Person；L17 → $DOMAIN.$PAGE_0.Person | 6 | 4 | US2：`const reuben = new Person("Reuben")`（L15）、`const irma = new Person("Irma")`（L17）連結 Person（FR-001），page0 新增 inter-procedural 模型（model +）；+ 為 Person 內 `name` 的讀取與呼叫點之後的 pair，`reuben`／`irma` 定義端改為 `call (N)`（DECISION 011）；其中 `Object: entry -> 12`、`Person: entry -> 12`、`personPrototype: 2 -> 12`（L12 `Object.assign(...)`）為 `連結（層級新增）`：新模型中的 pair 與基準側 `page0/intra-pages/0.dupairs.dot` 相同（T067 (b)，DECISION 011） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#562、#570、#572、#574、#575、#576、#577、#578、#579、#580、#581） |
| a07-prototypes-person | page0 | 連結 | L15 → $DOMAIN.$PAGE_0.Person；L17 → $DOMAIN.$PAGE_0.Person | 38 | 4 | US2：`const reuben = new Person("Reuben")`（L15）、`const irma = new Person("Irma")`（L17）連結 Person（FR-001），page0 新增 inter-procedural 模型（model +）；+ 為 Person 內 `name` 的讀取與呼叫點之後的 pair，`reuben`／`irma` 定義端改為 `call (N)`（DECISION 011）；其中 `Object: entry -> 12`、`Person: entry -> 12`、`personPrototype: 2 -> 12`（L12 `Object.assign(...)`）為 `連結（層級新增）`：新模型中的 pair 與基準側 `page0/intra-pages/0.dupairs.dot` 相同（T067 (b)，DECISION 011） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#564、#565、#566、#568、#582、#583、#584、#585、#586、#587、#588、#589、#590、#591、#592、#593、#594、#595、#596、#597、#598、#599、#600、#601、#602、#604、#605、#606、#607、#608、#609、#610、#611、#612、#614、#616、#617、#618、#619、#620、#621、#622、#623） |
| a07-prototypes-person | inter-page | 求值順序 | 呼叫點行 L15、L17 | 1 | 1 | L15 的 `Person` 讀取在呼叫之前（段 0），use 端由 `15` 改為 `call (15)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#571、#573） |
| a07-prototypes-person | page0 | 求值順序 | 呼叫點行 L15、L17 | 2 | 1 | L15 的 `Person` 讀取在呼叫之前（段 0），use 端由 `15` 改為 `call (15)`（FR-002） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#603、#613、#615） |
| s06b-silly-story-finish | inter-page | 連結 | L26 → $DOMAIN.$PAGE_0.randomValueFromArray；L27 → $DOMAIN.$PAGE_0.randomValueFromArray；L28 → $DOMAIN.$PAGE_0.randomValueFromArray；L40 → $DOMAIN.$PAGE_0.returnRandomStoryString | 24 | 4 | US2：`result` 內 `const randomCharacter = randomValueFromArray(characters)` 等三行（L26–L28）與 handler 內 `let newStory = returnRandomStoryString()`（L40）成為呼叫點並連結（FR-001）；+ 為 randomValueFromArray（`array`、`Math`、`random`）、returnRandomStoryString 內與呼叫點之後的 pair（`randomCharacter`／`randomPlace`／`randomEvent` 定義於 `call (N)`、`storyText`），page0 新增 inter-procedural 模型；− 為 `newStory`、`returnRandomStoryString` 在 L40 的定義／讀取改由 `call (40)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#624、#636、#637、#638、#639、#640、#641、#642、#643、#644、#645、#646、#647、#648、#649、#650、#651、#652、#653、#654、#655、#656、#657、#658、#659、#660、#661、#662、#663） |
| s06b-silly-story-finish | page0 | 連結 | L26 → $DOMAIN.$PAGE_0.randomValueFromArray；L27 → $DOMAIN.$PAGE_0.randomValueFromArray；L28 → $DOMAIN.$PAGE_0.randomValueFromArray；L40 → $DOMAIN.$PAGE_0.returnRandomStoryString | 64 | 4 | US2：`result` 內 `const randomCharacter = randomValueFromArray(characters)` 等三行（L26–L28）與 handler 內 `let newStory = returnRandomStoryString()`（L40）成為呼叫點並連結（FR-001）；+ 為 randomValueFromArray（`array`、`Math`、`random`）、returnRandomStoryString 內與呼叫點之後的 pair（`randomCharacter`／`randomPlace`／`randomEvent` 定義於 `call (N)`、`storyText`），page0 新增 inter-procedural 模型；− 為 `newStory`、`returnRandomStoryString` 在 L40 的定義／讀取改由 `call (40)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#626、#627、#628、#630、#631、#632、#634、#664、#665、#666、#667、#668、#669、#670、#671、#672、#673、#674、#675、#676、#677、#678、#679、#680、#681、#682、#683、#684、#685、#686、#687、#688、#689、#690、#691、#692、#693、#694、#695、#696、#697、#698、#699、#700、#701、#702、#703、#704、#705、#706、#707、#708、#709、#710、#711、#712、#713、#714、#715、#716、#717、#718、#719、#720、#721、#722、#723、#724、#725） |
| x01-bouncing-cycle | inter-page | 連結 | L19 → $DOMAIN.$PAGE_0.random；L69 → $DOMAIN.$PAGE_0.randomRGB；L80 → $DOMAIN.$PAGE_0.random；L81 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0、$DOMAIN.$PAGE_0.random、$DOMAIN.$PAGE_0.randomRGB | 18 | 12 | US2：同 a04（`random` L19、`ball.color = this.color = randomRGB()` L69、`random(10, 20)` L80、`new Ball(...)` L81）成為呼叫點並連結（FR-001）；+ 為 random、randomRGB、Ball constructor 內與呼叫點之後的 pair；− 為呼叫點行的讀取／定義（含 L69 的 `ball`、`distance`、`randomRGB` 讀取）改由 `call (N)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#758、#775、#776、#777、#778、#779、#780、#781、#782、#783、#784、#785、#786、#787、#788、#789、#790、#791、#792、#793、#794、#795、#796、#797、#798、#799、#800、#801、#802、#803、#804） |
| x01-bouncing-cycle | page0 | 連結 | L19 → $DOMAIN.$PAGE_0.random；L69 → $DOMAIN.$PAGE_0.randomRGB；L80 → $DOMAIN.$PAGE_0.random；L81 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0、$DOMAIN.$PAGE_0.random、$DOMAIN.$PAGE_0.randomRGB | 45 | 24 | US2：同 a04（`random` L19、`ball.color = this.color = randomRGB()` L69、`random(10, 20)` L80、`new Ball(...)` L81）成為呼叫點並連結（FR-001）；+ 為 random、randomRGB、Ball constructor 內與呼叫點之後的 pair；− 為呼叫點行的讀取／定義（含 L69 的 `ball`、`distance`、`randomRGB` 讀取）改由 `call (N)` 標記承載（同 pair 見 +） | 依使用者授權，由主對話與獨立 Fable 裁判審查後簽核（2026-11-18）；使用者可於 PR 合併前覆核（#760、#761、#763、#764、#766、#767、#769、#770、#771、#773、#806、#807、#808、#809、#810、#811、#812、#813、#814、#815、#816、#817、#818、#819、#820、#821、#822、#823、#824、#825、#826、#827、#828、#829、#830、#831、#832、#833、#834、#835、#836、#837、#838、#839、#840、#841、#843、#844、#845、#846、#847、#848、#849、#850、#851、#852、#853、#854、#855、#856、#857、#858、#859、#860、#861、#862、#863、#864、#865、#866、#867、#868、#869、#870、#871、#872） |

## class static 不再連結

| case | 頁 | 行 | static scope | 位置種類 | 相關 ± pair 筆數 |
|------|----|----|--------------|----------|------------------|
| 無 |  |  |  |  |  |

## Setup

### 變化說明

快照與本 branch 的 lib 相同（`edc22d5`）：`diffcheck mdn --verify` 零差異，重複列數兩側相同，32 個 id 的 CLI exit code 皆為 0。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| id | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|----|------|---------------------------|------|
| （全部） | （無） | 不變 | Setup 不改 lib |

## MDN 驗證（Polish，T059）

### 變化說明

`node specs/007-split-call-nodes/tools/diffcheck.js mdn --report` 以 US4 完成後的 lib 對 `specs/006-eslint-scope/mdn/corpus`（33 檔、32 個 id）實跑 CLI，與快照 `mdn/baseline-develop/` 比對；機器區塊為其輸出（相對 `edc22d5` 的累積結果），`--verify` exit 0。

- 全部 32 個 id 完成分析，CLI exit code 與基準相同（皆 0，見文末表）。
- 873 筆差異，分布於 14 個 id：pair +388／−177、row +166／~31、model +9、graph +18／~50、matching +9／~25。
  類別（紀錄所選）：`連結` 766、`連結（層級新增）` 3、`求值順序` 23、`標記` 47、`共通` 34；`返回後例外`（含 `決策返回不拋錯`）0、KI 類（§37、§38、§41、§43、§44、§46）0。
  `intra-procedurals/*` 無 pair 差異（FR-006）。
- 有 pair 差異的 9 個 id（a01b、a02b、a03、a04、a05、a06、a07、s06b、x01）都是 US2 起「運算式中的呼叫成為呼叫點」：`const o = new C(...)`、`const v = f(...)`、
  template literal 與 `new` 引數中的 `random(...)`、`a.b = this.c = randomRGB()`。每筆 + pair 位於被呼叫端（或其傳遞被呼叫端）的行範圍或呼叫點之後；
  − pair 都是同一 pair 改由 `call (<行>)` 承載（定義端或 use 端），其 + 對應見同頁。返回後才做的定義（如 `const square = new Shape(...)` 的 `square`）定義端標為 `call (N)`，
  不表示呼叫前定義（DECISION 011；`docs/known-issues.md` §45）。
- s07、s08、s10、s13、s14 只有 `標記`（呼叫敘述的 `call[_x]`／`callReturn[_x]` 改為 `call (<行>)`／`callReturn (<行>)`）與 `共通`。
- 「class static 不再連結」：MDN 0 例（表為「無」）。
- probes 與 FR-006（T058）：P1–P35、P20b 與 spec 各情境逐條一致；P23 與 `probes/baseline-develop.txt` 逐字相同；全部 probe 的 `intra(page)` 行與基準逐字相同。

### 驗收工具修正（T067，DECISION 011、DECISION 012 Q3）

US2 起 `mdn --report` 有 7 筆無成立類別（DECISION 011 已查證產品輸出正確，屬工具缺口）。T067 修改 `tools/diffcheck.js` 後全數歸類，未以手動釘選或 KI 類吸收：

| 原無類別的差異 | 原因 | T067 修正 | 現類別 |
|----------------|------|-----------|--------|
| s07-gallery-finish inter-page `0.graph.dot`、page0 `intra-pages/0.graph.dot` | §1 改寫把 develop 的累積後綴（如 `16abab`、`entry_b_d_a_b_a_b`、`exit_b`）也依 007 規則重編，與 007 側原樣保留的標記不同 | (a) 只對被改寫的 CALL／CALL RETURN 標記重編後綴，其他標記原樣保留（contracts/diff-check.md §1 第 2 步） | `標記` |
| s10-allowance-updater inter-page `0.graph.dot`、page0 `intra-pages/0.graph.dot` | 同上 | 同上 | `標記` |
| a07-prototypes-person page0 `inter-procedurals/*.dupairs.dot`：+`Object: entry -> 12`、+`Person: entry -> 12`、+`personPrototype: 2 -> 12` | 007 新增 L15／L17 呼叫點後 page0 多出 inter-procedural 模型（model + 為 `連結`）；L12 `Object.assign(...)` 的 pair 在 L15 之前，「use 行 > 呼叫點行」不成立 | (b) `連結` 子標 `層級新增`：新模型的 + pair 以相同（變數、def、use）存在於基準側同頁 `intra-pages/*.dupairs.dot`；說明欄註明對應基準檔 | `連結（層級新增）`（對應基準檔 `page0/intra-pages/0.dupairs.dot`） |

其餘紀錄的類別欄不變（`--report` 相對 T067 前只有上列 7 筆的類別欄改變；另有 11 筆 a07、s06b 的 `連結` pair 在說明欄加「亦符：連結（層級新增）」與對應基準檔）。
同批另做兩項收緊：改寫後只差節點編號的 graph／matching 改歸 `共通`（`標記` 限改寫後逐字相同）；§2 `共通（段0例外）` 條件 (e) 把同一行的 `&&`／`||`／`??` 計為決策（US4 reviewer SHOULD-FIX）。
golden（`golden --report`）在 T067 前後逐字相同，`golden --verify` exit 0，釘選表未改。

### 重複列數的變化

只列、不設門檻（data-model §6、KI §43）。

- a04-bouncing-main-finished、a05-assessment-main、x01-bouncing-cycle 各增 7／8／7（T068 更正說明）：lib 的輸出沒有重複的 pair（`.dupairs.dot` 每列的格子互不相同）。這些是同一行不同段節點上的不同 pair——如 a04 L79 `new Ball(random(...), random(...), …, randomRGB(), size)` 的 `call (79)_a`…`call (79)_f`、L19 template literal 的三個 `random(0, 255)` 的 `call (19)_a`…`_c`：`(entry_a,call (79)_a)`…`(entry_a,call (79)_d)`、`(call (78),call (79)_a)`／`_b`／`_f` 是不同的 pair，diffcheck 去掉重名後綴後都成為 `random: entry -> call (79)`、`size: call (78) -> call (79)`，因此算成重複。lib 輸出正確。工具限制：pair 以去後綴後的集合比對，同一行某一段的 pair 缺漏或多出（另一段仍有同變數、同行的 pair 時）`--verify` 看不出來（`contracts/diff-check.md` §1）。
- s10-allowance-updater 的 develop 重複列由 Setup 時的 9 變為 8：T067 起基準側的非呼叫標記不再重編後綴（累積後綴保留），基準側改寫後的重複列數隨之改變；007 側同為 8，增減 0。

### 雜湊變化表（舊→新 sha256 前 12 碼）

快照（develop）→ 本 branch，只列 `.dot` 與 `*.matching.json` 有變化者（「（無）」表示該側沒有此檔）；未列的 id（a01、a02、a08、s01–s05、s06a、s09、s11、s12、s15–s18）全部檔案不變。

| id | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|----|------|---------------------------|------|
| a01b-oojs-1-solution | inter-page/0.dupairs.dot | a3507595f0e7 → 514c103457b1 | 見淨差異 |
| a01b-oojs-1-solution | inter-page/0.graph.dot | ca95bb544dad → bdab42d967a3 | 節點／標記改變（見淨差異） |
| a01b-oojs-1-solution | inter-page/0.matching.json | bd2e8054f815 → 51222b7d0056 | record 改變（共通） |
| a01b-oojs-1-solution | page0/inter-procedurals/0.dupairs.dot | a3507595f0e7 → 514c103457b1 | 見淨差異 |
| a01b-oojs-1-solution | page0/inter-procedurals/0.graph.dot | 2ac32e22f68f → 0b92a1cd9baa | 節點／標記改變（見淨差異） |
| a01b-oojs-1-solution | page0/inter-procedurals/0.hierarchy.dot | 4373169b1b48 → 09c22a781941 | call 邊改變（連結） |
| a01b-oojs-1-solution | page0/inter-procedurals/0.matching.json | 97348a206080 → aed2f4c81f1d | record 改變（共通） |
| a01b-oojs-1-solution | page0/intra-pages/0.dupairs.dot | a3507595f0e7 → 514c103457b1 | 見淨差異 |
| a01b-oojs-1-solution | page0/intra-pages/0.graph.dot | fc35823e95c1 → 88c5d3d4c8dc | 節點／標記改變（見淨差異） |
| a01b-oojs-1-solution | page0/intra-pages/0.matching.json | b2e076d3f5c2 → 8881db36d06b | record 改變（共通） |
| a02b-oojs-2-solution | inter-page/0.dupairs.dot | e0234d49bba3 → 8dd1c7544721 | 見淨差異 |
| a02b-oojs-2-solution | inter-page/0.graph.dot | 9ad3ddff2989 → 4a84e5746b6f | 節點／標記改變（見淨差異） |
| a02b-oojs-2-solution | inter-page/0.matching.json | 3b38fbdc92c0 → 1f527d142f0d | record 改變（共通） |
| a02b-oojs-2-solution | page0/inter-procedurals/0.dupairs.dot | e0234d49bba3 → 8dd1c7544721 | 見淨差異 |
| a02b-oojs-2-solution | page0/inter-procedurals/0.graph.dot | ae19a0e045d0 → 3f273381bf62 | 節點／標記改變（見淨差異） |
| a02b-oojs-2-solution | page0/inter-procedurals/0.hierarchy.dot | 3a4234e12bb2 → 0e18e3278734 | call 邊改變（連結） |
| a02b-oojs-2-solution | page0/inter-procedurals/0.matching.json | 84af75a5e8f3 → 1947c498b3d0 | record 改變（共通） |
| a02b-oojs-2-solution | page0/intra-pages/0.dupairs.dot | e0234d49bba3 → 8dd1c7544721 | 見淨差異 |
| a02b-oojs-2-solution | page0/intra-pages/0.graph.dot | 494b8be3325c → 61c7e9be5cf5 | 節點／標記改變（見淨差異） |
| a02b-oojs-2-solution | page0/intra-pages/0.matching.json | 36c051504a75 → 3fb47313c338 | record 改變（共通） |
| a03-bouncing-main | inter-page/0.graph.dot | 02ae48c18d96 → 892d8616d6a0 | 節點／標記改變（見淨差異） |
| a03-bouncing-main | inter-page/0.matching.json | e0abc4597041 → dce5098097f2 | record 改變（共通） |
| a03-bouncing-main | page0/inter-procedurals/0.dupairs.dot | （無） → bab925938352 | 新增模型（連結） |
| a03-bouncing-main | page0/inter-procedurals/0.graph.dot | （無） → 645af602ef3e | 新增模型（連結） |
| a03-bouncing-main | page0/inter-procedurals/0.hierarchy.dot | （無） → 0c0272502ef7 | 新增模型（連結） |
| a03-bouncing-main | page0/inter-procedurals/0.matching.json | （無） → e371099a6075 | 新增模型（連結） |
| a04-bouncing-main-finished | inter-page/0.dupairs.dot | 3dacd75a3e36 → 3c9bc379202f | 見淨差異 |
| a04-bouncing-main-finished | inter-page/0.graph.dot | 631ad69f88a8 → d3942acab128 | 節點／標記改變（見淨差異） |
| a04-bouncing-main-finished | inter-page/0.matching.json | 1fad221577ce → dd2be4678abc | record 改變（共通） |
| a04-bouncing-main-finished | page0/inter-procedurals/0.dupairs.dot | 3dacd75a3e36 → bab925938352 | 見淨差異 |
| a04-bouncing-main-finished | page0/inter-procedurals/0.graph.dot | 04bb1256e016 → 46823108bd64 | 節點／標記改變（見淨差異） |
| a04-bouncing-main-finished | page0/inter-procedurals/0.hierarchy.dot | 858e5332dbcd → 0c0272502ef7 | call 邊改變（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/0.matching.json | 03ec7b027726 → aee92be5b2ed | record 改變（共通） |
| a04-bouncing-main-finished | page0/inter-procedurals/1.dupairs.dot | （無） → 3c9bc379202f | 新增模型（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/1.graph.dot | （無） → 4e452247022a | 新增模型（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/1.hierarchy.dot | （無） → 47ca5719a413 | 新增模型（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/1.matching.json | （無） → dc56b1cb069f | 新增模型（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/2.dupairs.dot | （無） → 79693cae59d7 | 新增模型（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/2.graph.dot | （無） → 4560a80b6252 | 新增模型（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/2.hierarchy.dot | （無） → 2041a97a1306 | 新增模型（連結） |
| a04-bouncing-main-finished | page0/inter-procedurals/2.matching.json | （無） → e45d95d7797d | 新增模型（連結） |
| a04-bouncing-main-finished | page0/intra-pages/0.dupairs.dot | 3dacd75a3e36 → 3c9bc379202f | 見淨差異 |
| a04-bouncing-main-finished | page0/intra-pages/0.graph.dot | 7c9031828bf0 → 9f92d5a1490f | 節點／標記改變（見淨差異） |
| a04-bouncing-main-finished | page0/intra-pages/0.matching.json | fa558e2197ec → b30e27e86f1d | record 改變（共通） |
| a05-assessment-main | inter-page/0.dupairs.dot | f592d5fe4a61 → aa626a74e164 | 見淨差異 |
| a05-assessment-main | inter-page/0.graph.dot | b5a7a821cb67 → 8736efa137cb | 節點／標記改變（見淨差異） |
| a05-assessment-main | inter-page/0.matching.json | b6e2b327be01 → 6d369c219901 | record 改變（共通） |
| a05-assessment-main | page0/inter-procedurals/0.dupairs.dot | f592d5fe4a61 → 516ca194974b | 見淨差異 |
| a05-assessment-main | page0/inter-procedurals/0.graph.dot | f95c212b7d46 → 9d8ee7de0ab9 | 節點／標記改變（見淨差異） |
| a05-assessment-main | page0/inter-procedurals/0.hierarchy.dot | 858e5332dbcd → 0c0272502ef7 | call 邊改變（連結） |
| a05-assessment-main | page0/inter-procedurals/0.matching.json | 6f6ad5712429 → f63d92c8460c | record 改變（共通） |
| a05-assessment-main | page0/inter-procedurals/1.dupairs.dot | （無） → f3fda8cfd018 | 新增模型（連結） |
| a05-assessment-main | page0/inter-procedurals/1.graph.dot | （無） → 47e3e47fb1f3 | 新增模型（連結） |
| a05-assessment-main | page0/inter-procedurals/1.hierarchy.dot | （無） → 5574e102cc47 | 新增模型（連結） |
| a05-assessment-main | page0/inter-procedurals/1.matching.json | （無） → d2e130a6666b | 新增模型（連結） |
| a05-assessment-main | page0/inter-procedurals/2.dupairs.dot | （無） → e2ac88c5a7b4 | 新增模型（連結） |
| a05-assessment-main | page0/inter-procedurals/2.graph.dot | （無） → 0ac7920d86f2 | 新增模型（連結） |
| a05-assessment-main | page0/inter-procedurals/2.hierarchy.dot | （無） → f49ddc46e538 | 新增模型（連結） |
| a05-assessment-main | page0/inter-procedurals/2.matching.json | （無） → bc572815432e | 新增模型（連結） |
| a05-assessment-main | page0/intra-pages/0.dupairs.dot | f592d5fe4a61 → aa626a74e164 | 見淨差異 |
| a05-assessment-main | page0/intra-pages/0.graph.dot | dc578c8a8bcf → 06d6d5b7290c | 節點／標記改變（見淨差異） |
| a05-assessment-main | page0/intra-pages/0.hierarchy.dot | 5fa77389fe1a → ed2ff2e74a04 | call 邊改變（連結） |
| a05-assessment-main | page0/intra-pages/0.matching.json | 7fc14d5afe4e → 27699b1f2472 | record 改變（共通） |
| a06-classes-snippets | inter-page/0.dupairs.dot | 825fa86ef820 → d79370c4af3a | 見淨差異 |
| a06-classes-snippets | inter-page/0.graph.dot | 9c99253e698a → c786fc578638 | 節點／標記改變（見淨差異） |
| a06-classes-snippets | inter-page/0.matching.json | 8924f386cd80 → d51835396a98 | record 改變（共通） |
| a06-classes-snippets | page0/inter-procedurals/0.dupairs.dot | 825fa86ef820 → d79370c4af3a | 見淨差異 |
| a06-classes-snippets | page0/inter-procedurals/0.graph.dot | 1e037eb26ded → 7c8ab9e09667 | 節點／標記改變（見淨差異） |
| a06-classes-snippets | page0/inter-procedurals/0.hierarchy.dot | 94dc27a202b5 → b68f757edc08 | call 邊改變（連結） |
| a06-classes-snippets | page0/inter-procedurals/0.matching.json | c696c7467e74 → 0f2c80b00b6e | record 改變（共通） |
| a06-classes-snippets | page0/intra-pages/0.dupairs.dot | 825fa86ef820 → d79370c4af3a | 見淨差異 |
| a06-classes-snippets | page0/intra-pages/0.graph.dot | 7621626320b8 → e99f51613e60 | 節點／標記改變（見淨差異） |
| a06-classes-snippets | page0/intra-pages/0.matching.json | 88c8f7eaf92a → 64e5d0b7c90b | record 改變（共通） |
| a07-prototypes-person | inter-page/0.dupairs.dot | 84c80f9115f1 → 4c2edfa6c4b6 | 見淨差異 |
| a07-prototypes-person | inter-page/0.graph.dot | 90b9b1d79c30 → f2cee6c478bc | 節點／標記改變（見淨差異） |
| a07-prototypes-person | inter-page/0.matching.json | 8f901b9605cb → e2bbd45269d1 | record 改變（共通） |
| a07-prototypes-person | page0/inter-procedurals/0.dupairs.dot | （無） → 4c2edfa6c4b6 | 新增模型（連結） |
| a07-prototypes-person | page0/inter-procedurals/0.graph.dot | （無） → 584b2f32d970 | 新增模型（連結） |
| a07-prototypes-person | page0/inter-procedurals/0.hierarchy.dot | （無） → 666545efa4a1 | 新增模型（連結） |
| a07-prototypes-person | page0/inter-procedurals/0.matching.json | （無） → aa2d9a2c3648 | 新增模型（連結） |
| a07-prototypes-person | page0/intra-pages/0.dupairs.dot | 84c80f9115f1 → 4c2edfa6c4b6 | 見淨差異 |
| a07-prototypes-person | page0/intra-pages/0.graph.dot | e3227c7387f8 → 443e41e5965f | 節點／標記改變（見淨差異） |
| a07-prototypes-person | page0/intra-pages/0.matching.json | f00cafceff4c → 6d6b24b275ce | record 改變（共通） |
| s06b-silly-story-finish | inter-page/0.dupairs.dot | 251688e9df12 → bdda78a77a03 | 見淨差異 |
| s06b-silly-story-finish | inter-page/0.graph.dot | bcd403e404d0 → 7439743daaad | 節點／標記改變（見淨差異） |
| s06b-silly-story-finish | inter-page/0.matching.json | a8a6357d94ab → 2f027a2d91c2 | record 改變（共通） |
| s06b-silly-story-finish | page0/inter-procedurals/0.dupairs.dot | （無） → 49189f76a6c4 | 新增模型（連結） |
| s06b-silly-story-finish | page0/inter-procedurals/0.graph.dot | （無） → 8164cb49f4d9 | 新增模型（連結） |
| s06b-silly-story-finish | page0/inter-procedurals/0.hierarchy.dot | （無） → 181f35e1acb0 | 新增模型（連結） |
| s06b-silly-story-finish | page0/inter-procedurals/0.matching.json | （無） → 497b98f31a97 | 新增模型（連結） |
| s06b-silly-story-finish | page0/inter-procedurals/1.dupairs.dot | （無） → fb53ff6145e7 | 新增模型（連結） |
| s06b-silly-story-finish | page0/inter-procedurals/1.graph.dot | （無） → 5f262ad21455 | 新增模型（連結） |
| s06b-silly-story-finish | page0/inter-procedurals/1.hierarchy.dot | （無） → 80b5152495f6 | 新增模型（連結） |
| s06b-silly-story-finish | page0/inter-procedurals/1.matching.json | （無） → f3234e50fcc5 | 新增模型（連結） |
| s06b-silly-story-finish | page0/intra-pages/0.dupairs.dot | 251688e9df12 → bdda78a77a03 | 見淨差異 |
| s06b-silly-story-finish | page0/intra-pages/0.graph.dot | 517bdb8ffd34 → a15c73ba6931 | 節點／標記改變（見淨差異） |
| s06b-silly-story-finish | page0/intra-pages/0.matching.json | fee00d4bbfb0 → f8dcf1557d70 | record 改變（共通） |
| s07-gallery-finish | inter-page/0.dupairs.dot | 1168f718bfe3 → a0cc5b02fdaa | 見淨差異 |
| s07-gallery-finish | inter-page/0.graph.dot | b109866228bb → 340990675acb | 節點／標記改變（見淨差異） |
| s07-gallery-finish | page0/inter-procedurals/0.dupairs.dot | 29b9ea9087a0 → a2f7269248a9 | 見淨差異 |
| s07-gallery-finish | page0/inter-procedurals/0.graph.dot | 38f2c639e347 → 4e32822c9fa4 | 節點／標記改變（見淨差異） |
| s07-gallery-finish | page0/intra-pages/0.dupairs.dot | 1168f718bfe3 → a0cc5b02fdaa | 見淨差異 |
| s07-gallery-finish | page0/intra-pages/0.graph.dot | 1e637471a7f0 → 72d8d072ae01 | 節點／標記改變（見淨差異） |
| s08-number-guessing-game | inter-page/0.dupairs.dot | 6148b109ace2 → b8e80acb0c89 | 見淨差異 |
| s08-number-guessing-game | inter-page/0.graph.dot | 2c52b09311bf → 9a218a87537c | 節點／標記改變（見淨差異） |
| s08-number-guessing-game | page0/inter-procedurals/0.graph.dot | 981b4e09273b → 3313bf7c2bdc | 節點／標記改變（見淨差異） |
| s08-number-guessing-game | page0/intra-pages/0.dupairs.dot | 6148b109ace2 → b8e80acb0c89 | 見淨差異 |
| s08-number-guessing-game | page0/intra-pages/0.graph.dot | 5aca68e8d31b → 6282380399c5 | 節點／標記改變（見淨差異） |
| s10-allowance-updater | inter-page/0.dupairs.dot | ffd432a390ca → 6013f28e45ef | 見淨差異 |
| s10-allowance-updater | inter-page/0.graph.dot | 7512d7a4b7ae → 054a97947f5b | 節點／標記改變（見淨差異） |
| s10-allowance-updater | page0/inter-procedurals/0.dupairs.dot | 13d5e9cae294 → 6349d98642be | 見淨差異 |
| s10-allowance-updater | page0/inter-procedurals/0.graph.dot | 6ea87a4ddadd → f4b31d97453e | 節點／標記改變（見淨差異） |
| s10-allowance-updater | page0/inter-procedurals/1.graph.dot | 99e289ecebc0 → 29a471a4749a | 節點／標記改變（見淨差異） |
| s10-allowance-updater | page0/intra-pages/0.dupairs.dot | ffd432a390ca → 6013f28e45ef | 見淨差異 |
| s10-allowance-updater | page0/intra-pages/0.graph.dot | 5a0eb40d8bb1 → b9236424049d | 節點／標記改變（見淨差異） |
| s13-functions-1-finish | inter-page/0.dupairs.dot | 3e70866cc05e → 4caad7f4ec3d | 見淨差異 |
| s13-functions-1-finish | inter-page/0.graph.dot | 7aee7c9d6bfc → 0c7e69721e50 | 節點／標記改變（見淨差異） |
| s13-functions-1-finish | page0/inter-procedurals/0.dupairs.dot | 3e70866cc05e → 4caad7f4ec3d | 見淨差異 |
| s13-functions-1-finish | page0/inter-procedurals/0.graph.dot | bc6a30c7f7ed → cd83225c0d24 | 節點／標記改變（見淨差異） |
| s13-functions-1-finish | page0/intra-pages/0.dupairs.dot | 3e70866cc05e → 4caad7f4ec3d | 見淨差異 |
| s13-functions-1-finish | page0/intra-pages/0.graph.dot | da8707fc4496 → a7d1f882d95e | 節點／標記改變（見淨差異） |
| s14-functions-3 | inter-page/0.dupairs.dot | a73dac2c405d → f1e2c16f95c6 | 見淨差異 |
| s14-functions-3 | inter-page/0.graph.dot | a09d89ac35f8 → 743d1b9b5f8a | 節點／標記改變（見淨差異） |
| s14-functions-3 | page0/inter-procedurals/0.dupairs.dot | a73dac2c405d → f1e2c16f95c6 | 見淨差異 |
| s14-functions-3 | page0/inter-procedurals/0.graph.dot | 73ecc009f57c → 9863efa51e40 | 節點／標記改變（見淨差異） |
| s14-functions-3 | page0/intra-pages/0.dupairs.dot | a73dac2c405d → f1e2c16f95c6 | 見淨差異 |
| s14-functions-3 | page0/intra-pages/0.graph.dot | 479c628f294d → 633ce678291a | 節點／標記改變（見淨差異） |
| x01-bouncing-cycle | inter-page/0.dupairs.dot | 194aae75ec12 → 7e19607a6e23 | 見淨差異 |
| x01-bouncing-cycle | inter-page/0.graph.dot | f93963556fe1 → c57142fcacde | 節點／標記改變（見淨差異） |
| x01-bouncing-cycle | inter-page/0.matching.json | 866d48e3b6ff → 0ea8f6c5f05b | record 改變（共通） |
| x01-bouncing-cycle | page0/inter-procedurals/0.dupairs.dot | b1a374dd94ea → bab925938352 | 見淨差異 |
| x01-bouncing-cycle | page0/inter-procedurals/0.graph.dot | 28fba55cd03b → ab70014a9832 | 節點／標記改變（見淨差異） |
| x01-bouncing-cycle | page0/inter-procedurals/0.hierarchy.dot | 605775e5f0c6 → 0c0272502ef7 | call 邊改變（連結） |
| x01-bouncing-cycle | page0/inter-procedurals/0.matching.json | f3d61bed66ff → d42798ff4a0e | record 改變（共通） |
| x01-bouncing-cycle | page0/inter-procedurals/1.dupairs.dot | 194aae75ec12 → 70846a354351 | 見淨差異 |
| x01-bouncing-cycle | page0/inter-procedurals/1.graph.dot | 909da34c126f → 4f0458cf64df | 節點／標記改變（見淨差異） |
| x01-bouncing-cycle | page0/inter-procedurals/1.hierarchy.dot | 583fff0ffd68 → 6f3e15eaeebb | call 邊改變（連結） |
| x01-bouncing-cycle | page0/inter-procedurals/1.matching.json | 1bac5f346f1f → 11d8cb5f9c68 | record 改變（共通） |
| x01-bouncing-cycle | page0/inter-procedurals/2.dupairs.dot | b1a374dd94ea → 7e19607a6e23 | 見淨差異 |
| x01-bouncing-cycle | page0/inter-procedurals/2.graph.dot | 85924a984c3c → ed1aa0e31da3 | 節點／標記改變（見淨差異） |
| x01-bouncing-cycle | page0/inter-procedurals/2.hierarchy.dot | f4c979aa46cb → 63831bc4f551 | call 邊改變（連結） |
| x01-bouncing-cycle | page0/inter-procedurals/2.matching.json | 61afb82fef7e → 25aabb1698f3 | record 改變（共通） |
| x01-bouncing-cycle | page0/inter-procedurals/3.dupairs.dot | （無） → 8111d2f67f80 | 新增模型（連結） |
| x01-bouncing-cycle | page0/inter-procedurals/3.graph.dot | （無） → 79837fc0bb76 | 新增模型（連結） |
| x01-bouncing-cycle | page0/inter-procedurals/3.hierarchy.dot | （無） → 2966e1d2871a | 新增模型（連結） |
| x01-bouncing-cycle | page0/inter-procedurals/3.matching.json | （無） → d3ed2cc8d91e | 新增模型（連結） |
| x01-bouncing-cycle | page0/intra-pages/0.dupairs.dot | 194aae75ec12 → 7e19607a6e23 | 見淨差異 |
| x01-bouncing-cycle | page0/intra-pages/0.graph.dot | 36ec080876be → eadab39e095c | 節點／標記改變（見淨差異） |
| x01-bouncing-cycle | page0/intra-pages/0.matching.json | 0bd3b1b20074 → 2097eef1b0ce | record 改變（共通） |

## CLI exit code（develop → 本 branch，Polish 時）

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
