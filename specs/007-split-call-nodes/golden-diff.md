# Golden 差異紀錄（feature 007，FR-008、SC-003、SC-004）

基準：`edc22d5`（develop；`diffcheck.js golden` 未給 `--base` 時讀此行；rebase 到新 develop 時改此行並整表重產，contracts/diff-check.md §1）

行號說明：dot 標記的行號＝fixture 行號＋1（CLI 在每個檔案前加一行 `/// --- start ...`，見 `lib/dujs/sourcereader.js`）。
「淨差異」「重複列數」「釘選與簽核」「class static 不再連結」為機器區塊（`node specs/007-split-call-nodes/tools/diffcheck.js golden --verify specs/007-split-call-nodes/golden-diff.md` 核對），
每個改 golden 的階段（US1–US4）以 `UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js` 更新 golden 後，以 `--report` 重產整表（相對 `edc22d5` 的累積結果）後補「說明」。
pair 以 (case, 頁, 檔案／層級, 變數) 的集合比對（重複列不產生差異），重複列數另表列出、不設門檻（KI §43）；基準側的 `call[_x]`／`callReturn[_x]` 依基準側 `*.matching.json` 改寫成 `call (<行>)`／`callReturn (<行>)` 後再比對（只在本 branch 同一模型的 `.graph.dot` 有 `label="call (` 時改寫，contracts/diff-check.md §1），只因改寫而消失的差異歸 `標記`。
`連結`、`求值順序`、`返回後例外` 與 KI 類（`§37`、`§38`、`§41`、`§43`、`§44`、`§46`）為釘選類別：「釘選與簽核」表的「說明」欄必填，簽核欄 implementer 只填「草擬，待簽核」，使用者於 golden 收尾後、PR 前簽核。
`標記`、`共通` 為機械判定，不釘選。`intra-procedurals/*` 的 pair 差異一律失敗（FR-006）。

## 淨差異（相對 develop）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 2 | expected | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 3 | expected | page0 | inter-procedurals/0.dupairs.dot | model | + | `inter-procedurals/0.dupairs.dot` | 連結 | FR-001 |  |
| 4 | expected | page0 | inter-procedurals/0.graph.dot | graph | + | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 5 | expected | page0 | inter-procedurals/0.hierarchy.dot | graph | + | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 6 | expected | page0 | inter-procedurals/0.matching.json | matching | + | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 7 | expected | page0 | inter-procedurals/1.dupairs.dot | model | + | `inter-procedurals/1.dupairs.dot` | 連結 | FR-001 |  |
| 8 | expected | page0 | inter-procedurals/1.graph.dot | graph | + | `inter-procedurals/1.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 9 | expected | page0 | inter-procedurals/1.hierarchy.dot | graph | + | `inter-procedurals/1.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 10 | expected | page0 | inter-procedurals/1.matching.json | matching | + | `inter-procedurals/1.matching.json` | 共通 | — |  |
| 11 | expected | page0 | inter-procedurals/2.dupairs.dot | model | + | `inter-procedurals/2.dupairs.dot` | 連結 | FR-001 |  |
| 12 | expected | page0 | inter-procedurals/2.graph.dot | graph | + | `inter-procedurals/2.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 13 | expected | page0 | inter-procedurals/2.hierarchy.dot | graph | + | `inter-procedurals/2.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 14 | expected | page0 | inter-procedurals/2.matching.json | matching | + | `inter-procedurals/2.matching.json` | 共通 | — |  |
| 15 | expected | page0 | inter-procedurals/3.dupairs.dot | model | + | `inter-procedurals/3.dupairs.dot` | 連結 | FR-001 |  |
| 16 | expected | page0 | inter-procedurals/3.graph.dot | graph | + | `inter-procedurals/3.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 17 | expected | page0 | inter-procedurals/3.hierarchy.dot | graph | + | `inter-procedurals/3.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 18 | expected | page0 | inter-procedurals/3.matching.json | matching | + | `inter-procedurals/3.matching.json` | 共通 | — |  |
| 19 | expected | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 20 | expected | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 21 | expected | inter-page | 0.dupairs.dot | row | + | `e` | 連結 | FR-001 |  |
| 22 | expected | inter-page | 0.dupairs.dot | row | + | `i` | 連結 | FR-001 |  |
| 23 | expected | inter-page | 0.dupairs.dot | row | + | `list` | 連結 | FR-001 |  |
| 24 | expected | inter-page | 0.dupairs.dot | row | + | `m` | 連結 | FR-001 |  |
| 25 | expected | inter-page | 0.dupairs.dot | row | + | `n` | 連結 | FR-001 |  |
| 26 | expected | inter-page | 0.dupairs.dot | row | + | `parsed` | 連結 | FR-001 |  |
| 27 | expected | inter-page | 0.dupairs.dot | row | + | `raw` | 連結 | FR-001 |  |
| 28 | expected | inter-page | 0.dupairs.dot | row | + | `result` | 連結 | FR-001 |  |
| 29 | expected | inter-page | 0.dupairs.dot | row | + | `steps` | 連結 | FR-001 |  |
| 30 | expected | inter-page | 0.dupairs.dot | row | + | `sum` | 連結 | FR-001 |  |
| 31 | expected | inter-page | 0.dupairs.dot | row | + | `text` | 連結 | FR-001 |  |
| 32 | expected | inter-page | 0.dupairs.dot | row | + | `value` | 連結 | FR-001 |  |
| 33 | expected | inter-page | 0.dupairs.dot | pair | + | `JSON: entry -> 54` | 連結 | FR-001 | （亦符：§38） |
| 34 | expected | inter-page | 0.dupairs.dot | pair | + | `add: entry -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 35 | expected | inter-page | 0.dupairs.dot | pair | - | `countDown: entry -> 69` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 36 | expected | inter-page | 0.dupairs.dot | pair | + | `countDown: entry -> call (69)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 37 | expected | inter-page | 0.dupairs.dot | pair | - | `describeMode: entry -> 75` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 38 | expected | inter-page | 0.dupairs.dot | pair | + | `describeMode: entry -> call (75)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 39 | expected | inter-page | 0.dupairs.dot | pair | + | `i: 18 -> (18,21)` | 連結 | FR-001 | （亦符：§43） |
| 40 | expected | inter-page | 0.dupairs.dot | pair | + | `i: 18 -> (18,call (19)_a_b_a)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 41 | expected | inter-page | 0.dupairs.dot | pair | + | `i: 18 -> 18` | 連結 | FR-001 | （亦符：§43） |
| 42 | expected | inter-page | 0.dupairs.dot | pair | + | `i: 18 -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 43 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 3 -> 69` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 44 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 3 -> 70` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 45 | expected | inter-page | 0.dupairs.dot | pair | + | `items: 3 -> call (69)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 46 | expected | inter-page | 0.dupairs.dot | pair | + | `items: 3 -> call (70)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 47 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 64 -> 65` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 48 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 64 -> 69` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 49 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 64 -> 70` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 50 | expected | inter-page | 0.dupairs.dot | pair | - | `items: 64 -> 71` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 51 | expected | inter-page | 0.dupairs.dot | pair | + | `items: call (64) -> 71` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 52 | expected | inter-page | 0.dupairs.dot | pair | + | `items: call (64) -> call (65)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 53 | expected | inter-page | 0.dupairs.dot | pair | + | `items: call (64) -> call (69)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 54 | expected | inter-page | 0.dupairs.dot | pair | + | `items: call (64) -> call (70)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 55 | expected | inter-page | 0.dupairs.dot | pair | + | `list: entry_d_h_a_b_a -> (18,21)` | 連結 | FR-001 | （亦符：§43） |
| 56 | expected | inter-page | 0.dupairs.dot | pair | + | `list: entry_d_h_a_b_a -> (18,call (19)_a_b_a)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 57 | expected | inter-page | 0.dupairs.dot | pair | + | `list: entry_d_h_a_b_a -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 58 | expected | inter-page | 0.dupairs.dot | pair | + | `m: entry -> (39,40)` | 連結 | FR-001 |  |
| 59 | expected | inter-page | 0.dupairs.dot | pair | + | `m: entry -> (39,42)` | 連結 | FR-001 |  |
| 60 | expected | inter-page | 0.dupairs.dot | pair | + | `m: entry -> (42,43)` | 連結 | FR-001 |  |
| 61 | expected | inter-page | 0.dupairs.dot | pair | + | `m: entry -> (42,45)` | 連結 | FR-001 |  |
| 62 | expected | inter-page | 0.dupairs.dot | pair | - | `mode: 4 -> 75` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 63 | expected | inter-page | 0.dupairs.dot | pair | + | `mode: 4 -> call (75)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 64 | expected | inter-page | 0.dupairs.dot | pair | - | `mode: 75 -> 75` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 65 | expected | inter-page | 0.dupairs.dot | pair | + | `mode: call (75) -> call (75)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 66 | expected | inter-page | 0.dupairs.dot | pair | + | `n: 27 -> (26,27)` | 連結 | FR-001 |  |
| 67 | expected | inter-page | 0.dupairs.dot | pair | + | `n: 27 -> (26,31)` | 連結 | FR-001 |  |
| 68 | expected | inter-page | 0.dupairs.dot | pair | + | `n: 27 -> 27` | 連結 | FR-001 |  |
| 69 | expected | inter-page | 0.dupairs.dot | pair | + | `n: entry -> (26,27)` | 連結 | FR-001 |  |
| 70 | expected | inter-page | 0.dupairs.dot | pair | + | `n: entry -> (26,31)` | 連結 | FR-001 |  |
| 71 | expected | inter-page | 0.dupairs.dot | pair | + | `n: entry -> 27` | 連結 | FR-001 |  |
| 72 | expected | inter-page | 0.dupairs.dot | pair | - | `parseSaved: entry -> 64` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 73 | expected | inter-page | 0.dupairs.dot | pair | + | `parseSaved: entry -> call (64)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 74 | expected | inter-page | 0.dupairs.dot | pair | + | `parsed: 52 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 75 | expected | inter-page | 0.dupairs.dot | pair | + | `parsed: 54 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 76 | expected | inter-page | 0.dupairs.dot | pair | + | `parsed: 56 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 77 | expected | inter-page | 0.dupairs.dot | pair | + | `raw: entry -> 54` | 連結 | FR-001 | （亦符：§38） |
| 78 | expected | inter-page | 0.dupairs.dot | pair | + | `result: 11 -> 13` | 連結 | FR-001 |  |
| 79 | expected | inter-page | 0.dupairs.dot | pair | + | `result: 9 -> 13` | 連結 | FR-001 |  |
| 80 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 25 -> 28` | 連結 | FR-001 |  |
| 81 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 25 -> 31` | 連結 | FR-001 |  |
| 82 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 28 -> 28` | 連結 | FR-001 |  |
| 83 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 28 -> 31` | 連結 | FR-001 |  |
| 84 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 31 -> (32,31)` | 連結 | FR-001 |  |
| 85 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 31 -> (32,33)` | 連結 | FR-001 |  |
| 86 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 31 -> 31` | 連結 | FR-001 |  |
| 87 | expected | inter-page | 0.dupairs.dot | pair | + | `steps: 31 -> 33` | 連結 | FR-001 |  |
| 88 | expected | inter-page | 0.dupairs.dot | pair | + | `sum: 17 -> 21` | 連結 | FR-001 | （亦符：§43） |
| 89 | expected | inter-page | 0.dupairs.dot | pair | + | `sum: 17 -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 90 | expected | inter-page | 0.dupairs.dot | pair | + | `sum: call (19)_a_b_a -> 21` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 91 | expected | inter-page | 0.dupairs.dot | pair | + | `sum: call (19)_a_b_a -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 92 | expected | inter-page | 0.dupairs.dot | pair | - | `sumAll: entry -> 65` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 93 | expected | inter-page | 0.dupairs.dot | pair | - | `sumAll: entry -> 70` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 94 | expected | inter-page | 0.dupairs.dot | pair | + | `sumAll: entry -> call (65)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 95 | expected | inter-page | 0.dupairs.dot | pair | + | `sumAll: entry -> call (70)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 96 | expected | inter-page | 0.dupairs.dot | pair | + | `text: 40 -> 48` | 連結 | FR-001 |  |
| 97 | expected | inter-page | 0.dupairs.dot | pair | + | `text: 43 -> 48` | 連結 | FR-001 |  |
| 98 | expected | inter-page | 0.dupairs.dot | pair | + | `text: 46 -> 48` | 連結 | FR-001 |  |
| 99 | expected | inter-page | 0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> (8,11)` | 連結 | FR-001 |  |
| 100 | expected | inter-page | 0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> (8,9)` | 連結 | FR-001 |  |
| 101 | expected | inter-page | 0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> 11` | 連結 | FR-001 |  |
| 102 | expected | inter-page | 0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> 9` | 連結 | FR-001 |  |
| 103 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `e` | 連結 | FR-001 |  |
| 104 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `i` | 連結 | FR-001 |  |
| 105 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `i` | 連結 | FR-001 |  |
| 106 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `i` | 連結 | FR-001 |  |
| 107 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `items` | 連結 | FR-001 |  |
| 108 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `list` | 連結 | FR-001 |  |
| 109 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `list` | 連結 | FR-001 |  |
| 110 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `list` | 連結 | FR-001 |  |
| 111 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `m` | 連結 | FR-001 |  |
| 112 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `mode` | 連結 | FR-001 |  |
| 113 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `n` | 連結 | FR-001 |  |
| 114 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `parsed` | 連結 | FR-001 |  |
| 115 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `raw` | 連結 | FR-001 |  |
| 116 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `result` | 連結 | FR-001 |  |
| 117 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `result` | 連結 | FR-001 |  |
| 118 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `result` | 連結 | FR-001 |  |
| 119 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `steps` | 連結 | FR-001 |  |
| 120 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `sum` | 連結 | FR-001 |  |
| 121 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `sum` | 連結 | FR-001 |  |
| 122 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `sum` | 連結 | FR-001 |  |
| 123 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `text` | 連結 | FR-001 |  |
| 124 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `total` | 連結 | FR-001 |  |
| 125 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `total` | 連結 | FR-001 |  |
| 126 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `value` | 連結 | FR-001 |  |
| 127 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `value` | 連結 | FR-001 |  |
| 128 | expected | page0 | inter-procedurals/*.dupairs.dot | row | + | `value` | 連結 | FR-001 |  |
| 129 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `i: 18 -> (18,21)` | 連結 | FR-001 | （亦符：§43） |
| 130 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `i: 18 -> (18,call (19))` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 131 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `i: 18 -> 18` | 連結 | FR-001 | （亦符：§43） |
| 132 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `i: 18 -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 133 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `items: call (64) -> call (65)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 134 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `list: entry -> (18,21)` | 連結 | FR-001 | （亦符：§43） |
| 135 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `list: entry -> (18,call (19))` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 136 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `list: entry -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 137 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `m: entry -> (39,40)` | 連結 | FR-001 |  |
| 138 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `m: entry -> (39,42)` | 連結 | FR-001 |  |
| 139 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `m: entry -> (42,43)` | 連結 | FR-001 |  |
| 140 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `m: entry -> (42,45)` | 連結 | FR-001 |  |
| 141 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `n: 27 -> (26,27)` | 連結 | FR-001 |  |
| 142 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `n: 27 -> (26,31)` | 連結 | FR-001 |  |
| 143 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `n: 27 -> 27` | 連結 | FR-001 |  |
| 144 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `n: entry -> (26,27)` | 連結 | FR-001 |  |
| 145 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `n: entry -> (26,31)` | 連結 | FR-001 |  |
| 146 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `n: entry -> 27` | 連結 | FR-001 |  |
| 147 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `parsed: 52 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 148 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `parsed: 54 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 149 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `parsed: 56 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 150 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `raw: entry -> 54` | 連結 | FR-001 | （亦符：§38） |
| 151 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `result: 11 -> 13` | 連結 | FR-001 |  |
| 152 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `result: 9 -> 13` | 連結 | FR-001 |  |
| 153 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 25 -> 28` | 連結 | FR-001 |  |
| 154 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 25 -> 31` | 連結 | FR-001 |  |
| 155 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 28 -> 28` | 連結 | FR-001 |  |
| 156 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 28 -> 31` | 連結 | FR-001 |  |
| 157 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 31 -> (32,31)` | 連結 | FR-001 |  |
| 158 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 31 -> (32,33)` | 連結 | FR-001 |  |
| 159 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 31 -> 31` | 連結 | FR-001 |  |
| 160 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `steps: 31 -> 33` | 連結 | FR-001 |  |
| 161 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `sum: 17 -> 21` | 連結 | FR-001 | （亦符：§43） |
| 162 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `sum: 17 -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 163 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `sum: call (19) -> 21` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 164 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `sum: call (19) -> call (19)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 165 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `text: 40 -> 48` | 連結 | FR-001 |  |
| 166 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `text: 43 -> 48` | 連結 | FR-001 |  |
| 167 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `text: 46 -> 48` | 連結 | FR-001 |  |
| 168 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `value: entry -> (8,11)` | 連結 | FR-001 |  |
| 169 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `value: entry -> (8,9)` | 連結 | FR-001 |  |
| 170 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `value: entry -> 11` | 連結 | FR-001 |  |
| 171 | expected | page0 | inter-procedurals/*.dupairs.dot | pair | + | `value: entry -> 9` | 連結 | FR-001 |  |
| 172 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `e` | 連結 | FR-001 |  |
| 173 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `i` | 連結 | FR-001 |  |
| 174 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `list` | 連結 | FR-001 |  |
| 175 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `m` | 連結 | FR-001 |  |
| 176 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `n` | 連結 | FR-001 |  |
| 177 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `parsed` | 連結 | FR-001 |  |
| 178 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `raw` | 連結 | FR-001 |  |
| 179 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `result` | 連結 | FR-001 |  |
| 180 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `steps` | 連結 | FR-001 |  |
| 181 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `sum` | 連結 | FR-001 |  |
| 182 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `text` | 連結 | FR-001 |  |
| 183 | expected | page0 | intra-pages/0.dupairs.dot | row | + | `value` | 連結 | FR-001 |  |
| 184 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `JSON: entry -> 54` | 連結 | FR-001 | （亦符：§38） |
| 185 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `add: entry -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 186 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `countDown: entry -> 69` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 187 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `countDown: entry -> call (69)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 188 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `describeMode: entry -> 75` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 189 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `describeMode: entry -> call (75)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 190 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `i: 18 -> (18,21)` | 連結 | FR-001 | （亦符：§43） |
| 191 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `i: 18 -> (18,call (19)_a_b_a)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 192 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `i: 18 -> 18` | 連結 | FR-001 | （亦符：§43） |
| 193 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `i: 18 -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 194 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 3 -> 69` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 195 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 3 -> 70` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 196 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `items: 3 -> call (69)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 197 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `items: 3 -> call (70)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 198 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 64 -> 65` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 199 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 64 -> 69` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 200 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 64 -> 70` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 201 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `items: 64 -> 71` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 202 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `items: call (64) -> 71` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 203 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `items: call (64) -> call (65)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 204 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `items: call (64) -> call (69)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 205 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `items: call (64) -> call (70)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 206 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `list: entry_d_h_a_b_a -> (18,21)` | 連結 | FR-001 | （亦符：§43） |
| 207 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `list: entry_d_h_a_b_a -> (18,call (19)_a_b_a)` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 208 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `list: entry_d_h_a_b_a -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 209 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `m: entry -> (39,40)` | 連結 | FR-001 |  |
| 210 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `m: entry -> (39,42)` | 連結 | FR-001 |  |
| 211 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `m: entry -> (42,43)` | 連結 | FR-001 |  |
| 212 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `m: entry -> (42,45)` | 連結 | FR-001 |  |
| 213 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `mode: 4 -> 75` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 214 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `mode: 4 -> call (75)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 215 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `mode: 75 -> 75` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 216 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `mode: call (75) -> call (75)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 217 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `n: 27 -> (26,27)` | 連結 | FR-001 |  |
| 218 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `n: 27 -> (26,31)` | 連結 | FR-001 |  |
| 219 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `n: 27 -> 27` | 連結 | FR-001 |  |
| 220 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `n: entry -> (26,27)` | 連結 | FR-001 |  |
| 221 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `n: entry -> (26,31)` | 連結 | FR-001 |  |
| 222 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `n: entry -> 27` | 連結 | FR-001 |  |
| 223 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `parseSaved: entry -> 64` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 224 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `parseSaved: entry -> call (64)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 225 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `parsed: 52 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 226 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `parsed: 54 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 227 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `parsed: 56 -> 60` | 連結 | FR-001 | （亦符：§38） |
| 228 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `raw: entry -> 54` | 連結 | FR-001 | （亦符：§38） |
| 229 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `result: 11 -> 13` | 連結 | FR-001 |  |
| 230 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `result: 9 -> 13` | 連結 | FR-001 |  |
| 231 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 25 -> 28` | 連結 | FR-001 |  |
| 232 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 25 -> 31` | 連結 | FR-001 |  |
| 233 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 28 -> 28` | 連結 | FR-001 |  |
| 234 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 28 -> 31` | 連結 | FR-001 |  |
| 235 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 31 -> (32,31)` | 連結 | FR-001 |  |
| 236 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 31 -> (32,33)` | 連結 | FR-001 |  |
| 237 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 31 -> 31` | 連結 | FR-001 |  |
| 238 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `steps: 31 -> 33` | 連結 | FR-001 |  |
| 239 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `sum: 17 -> 21` | 連結 | FR-001 | （亦符：§43） |
| 240 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `sum: 17 -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 241 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `sum: call (19)_a_b_a -> 21` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 242 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `sum: call (19)_a_b_a -> call (19)_a_b_a` | 連結 | FR-001 | （亦符：求值順序、§43） |
| 243 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `sumAll: entry -> 65` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 244 | expected | page0 | intra-pages/0.dupairs.dot | pair | - | `sumAll: entry -> 70` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 245 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `sumAll: entry -> call (65)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 246 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `sumAll: entry -> call (70)` | 連結 | FR-001 | （亦符：求值順序、§38） |
| 247 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `text: 40 -> 48` | 連結 | FR-001 |  |
| 248 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `text: 43 -> 48` | 連結 | FR-001 |  |
| 249 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `text: 46 -> 48` | 連結 | FR-001 |  |
| 250 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> (8,11)` | 連結 | FR-001 |  |
| 251 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> (8,9)` | 連結 | FR-001 |  |
| 252 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> 11` | 連結 | FR-001 |  |
| 253 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `value: entry_e_i_a_b_a -> 9` | 連結 | FR-001 |  |
| 254 | expected-es2015 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 255 | expected-es2015 | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 256 | expected-es2015 | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 257 | expected-es2015 | page0 | inter-procedurals/0.hierarchy.dot | graph | ~ | `inter-procedurals/0.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 258 | expected-es2015 | page0 | inter-procedurals/0.matching.json | matching | ~ | `inter-procedurals/0.matching.json` | 共通 | — |  |
| 259 | expected-es2015 | page0 | inter-procedurals/1.dupairs.dot | model | + | `inter-procedurals/1.dupairs.dot` | 連結 | FR-001 |  |
| 260 | expected-es2015 | page0 | inter-procedurals/1.graph.dot | graph | + | `inter-procedurals/1.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 261 | expected-es2015 | page0 | inter-procedurals/1.hierarchy.dot | graph | + | `inter-procedurals/1.hierarchy.dot` | 連結 | FR-001 | （亦符：共通） |
| 262 | expected-es2015 | page0 | inter-procedurals/1.matching.json | matching | + | `inter-procedurals/1.matching.json` | 共通 | — |  |
| 263 | expected-es2015 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 264 | expected-es2015 | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 265 | expected-es2015 | inter-page | 0.dupairs.dot | row | + | `root` | 連結 | FR-001 |  |
| 266 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `TodoList: 7 -> 17` | 求值順序 | FR-002–FR-004 |  |
| 267 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `TodoList: 7 -> call (17)` | 求值順序 | FR-002–FR-004 |  |
| 268 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `document: entry -> 17` | 求值順序 | FR-002–FR-004 |  |
| 269 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `document: entry -> call (17)` | 求值順序 | FR-002–FR-004 |  |
| 270 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `list: 17 -> 25` | 連結 | FR-001 | （亦符：求值順序） |
| 271 | expected-es2015 | inter-page | 0.dupairs.dot | pair | - | `list: 17 -> 34` | 連結 | FR-001 | （亦符：求值順序） |
| 272 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `list: call (17) -> 25` | 連結 | FR-001 | （亦符：求值順序） |
| 273 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `list: call (17) -> 34` | 連結 | FR-001 | （亦符：求值順序） |
| 274 | expected-es2015 | inter-page | 0.dupairs.dot | pair | + | `root: entry -> 9` | 連結 | FR-001 |  |
| 275 | expected-es2015 | inter-page | 0.dupairs.dot | row | ~ | `addTodo` | 標記 | FR-007 |  |
| 276 | expected-es2015 | inter-page | 0.dupairs.dot | row | ~ | `input` | 標記 | FR-007 |  |
| 277 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `Array` | 連結 | FR-001 |  |
| 278 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `Boolean` | 連結 | FR-001 |  |
| 279 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `Date` | 連結 | FR-001 |  |
| 280 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `Map` | 連結 | FR-001 |  |
| 281 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `Math` | 連結 | FR-001 |  |
| 282 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `Number` | 連結 | FR-001 |  |
| 283 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `Set` | 連結 | FR-001 |  |
| 284 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `String` | 連結 | FR-001 |  |
| 285 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `TodoList` | 連結 | FR-001 |  |
| 286 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `TodoList` | 連結 | FR-001 |  |
| 287 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `WeakMap` | 連結 | FR-001 |  |
| 288 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `addTodo` | 連結 | FR-001 |  |
| 289 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `console` | 連結 | FR-001 |  |
| 290 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `document` | 連結 | FR-001 |  |
| 291 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `init` | 連結 | FR-001 |  |
| 292 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `list` | 連結 | FR-001 |  |
| 293 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `loadTodos` | 連結 | FR-001 |  |
| 294 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `nextId` | 連結 | FR-001 |  |
| 295 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `root` | 連結 | FR-001 |  |
| 296 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `saveTodos` | 連結 | FR-001 |  |
| 297 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `state` | 連結 | FR-001 |  |
| 298 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | + | `window` | 連結 | FR-001 |  |
| 299 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `TodoList: 7 -> call (17)` | 求值順序 | FR-002–FR-004 |  |
| 300 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `document: entry -> 38` | 連結 | FR-001 |  |
| 301 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `document: entry -> call (17)` | 求值順序 | FR-002–FR-004 |  |
| 302 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `init: entry -> 37` | 連結 | FR-001 |  |
| 303 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `root: entry -> 9` | 連結 | FR-001 |  |
| 304 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | pair | + | `window: entry -> 37` | 連結 | FR-001 |  |
| 305 | expected-es2015 | page0 | inter-procedurals/*.dupairs.dot | row | ~ | `input` | 標記 | FR-007 |  |
| 306 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | row | + | `root` | 連結 | FR-001 |  |
| 307 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `TodoList: 7 -> 17` | 求值順序 | FR-002–FR-004 |  |
| 308 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `TodoList: 7 -> call (17)` | 求值順序 | FR-002–FR-004 |  |
| 309 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `document: entry -> 17` | 求值順序 | FR-002–FR-004 |  |
| 310 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `document: entry -> call (17)` | 求值順序 | FR-002–FR-004 |  |
| 311 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `list: 17 -> 25` | 連結 | FR-001 | （亦符：求值順序） |
| 312 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | - | `list: 17 -> 34` | 連結 | FR-001 | （亦符：求值順序） |
| 313 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `list: call (17) -> 25` | 連結 | FR-001 | （亦符：求值順序） |
| 314 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `list: call (17) -> 34` | 連結 | FR-001 | （亦符：求值順序） |
| 315 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | pair | + | `root: entry -> 9` | 連結 | FR-001 |  |
| 316 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | row | ~ | `addTodo` | 標記 | FR-007 |  |
| 317 | expected-es2015 | page0 | intra-pages/0.dupairs.dot | row | ~ | `input` | 標記 | FR-007 |  |
| 318 | expected-interprocedural | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 共通（段0例外） | — | 段0例外：n99 → n109（c3） |
| 319 | expected-interprocedural | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 標記 | FR-007 |  |
| 320 | expected-interprocedural | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 共通（段0例外） | — | 段0例外：n36 → n46（c3） |
| 321 | expected-interprocedural | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | 標記 | FR-007 |  |
| 322 | expected-interprocedural | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 共通（段0例外） | — | 段0例外：n36 → n46（c3） |
| 323 | expected-interprocedural | inter-page | 0.dupairs.dot | row | ~ | `addTo` | 標記 | FR-007 |  |
| 324 | expected-interprocedural | inter-page | 0.dupairs.dot | row | ~ | `log` | 標記 | FR-007 |  |
| 325 | expected-interprocedural | inter-page | 0.dupairs.dot | row | ~ | `scale` | 標記 | FR-007 |  |
| 326 | expected-interprocedural | page0 | inter-procedurals/0.dupairs.dot | row | ~ | `scale` | 標記 | FR-007 |  |
| 327 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | row | ~ | `addTo` | 標記 | FR-007 |  |
| 328 | expected-interprocedural | page0 | inter-procedurals/1.dupairs.dot | row | ~ | `scale` | 標記 | FR-007 |  |
| 329 | expected-interprocedural | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `log` | 標記 | FR-007 |  |
| 330 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | row | ~ | `addTo` | 標記 | FR-007 |  |
| 331 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | row | ~ | `log` | 標記 | FR-007 |  |
| 332 | expected-interprocedural | page0 | intra-pages/0.dupairs.dot | row | ~ | `scale` | 標記 | FR-007 |  |
| 333 | expected-fixes004 | inter-page | 0.graph.dot | graph | ~ | `0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 334 | expected-fixes004 | inter-page | 0.matching.json | matching | ~ | `0.matching.json` | 共通 | — |  |
| 335 | expected-fixes004 | page0 | inter-procedurals/0.graph.dot | graph | ~ | `inter-procedurals/0.graph.dot` | 標記 | FR-007 |  |
| 336 | expected-fixes004 | page0 | inter-procedurals/1.graph.dot | graph | ~ | `inter-procedurals/1.graph.dot` | 標記 | FR-007 |  |
| 337 | expected-fixes004 | page0 | inter-procedurals/1.matching.json | matching | ~ | `inter-procedurals/1.matching.json` | 共通 | — |  |
| 338 | expected-fixes004 | page0 | inter-procedurals/2.graph.dot | graph | ~ | `inter-procedurals/2.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 339 | expected-fixes004 | page0 | inter-procedurals/2.matching.json | matching | ~ | `inter-procedurals/2.matching.json` | 共通 | — |  |
| 340 | expected-fixes004 | page0 | inter-procedurals/3.graph.dot | graph | ~ | `inter-procedurals/3.graph.dot` | 標記 | FR-007 |  |
| 341 | expected-fixes004 | page0 | inter-procedurals/3.matching.json | matching | ~ | `inter-procedurals/3.matching.json` | 共通 | — |  |
| 342 | expected-fixes004 | page0 | intra-pages/0.graph.dot | graph | ~ | `intra-pages/0.graph.dot` | 連結 | FR-001 | （亦符：共通） |
| 343 | expected-fixes004 | page0 | intra-pages/0.matching.json | matching | ~ | `intra-pages/0.matching.json` | 共通 | — |  |
| 344 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `Counter: call (11) -> 37` | 求值順序 | FR-002–FR-004 |  |
| 345 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | + | `Counter: call (11) -> call (37)` | 求值順序 | FR-002–FR-004 |  |
| 346 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | - | `counter: 37 -> call (38)` | 連結 | FR-001 | （亦符：求值順序） |
| 347 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | + | `counter: call (37) -> call (38)` | 連結 | FR-001 | （亦符：求值順序） |
| 348 | expected-fixes004 | inter-page | 0.dupairs.dot | pair | + | `x: 30 -> 16` | 連結 | FR-001 | （亦符：§43） |
| 349 | expected-fixes004 | inter-page | 0.dupairs.dot | row | ~ | `P` | 標記 | FR-007 |  |
| 350 | expected-fixes004 | inter-page | 0.dupairs.dot | row | ~ | `a` | 標記 | FR-007 |  |
| 351 | expected-fixes004 | inter-page | 0.dupairs.dot | row | ~ | `b` | 標記 | FR-007 |  |
| 352 | expected-fixes004 | inter-page | 0.dupairs.dot | row | ~ | `c` | 標記 | FR-007 |  |
| 353 | expected-fixes004 | inter-page | 0.dupairs.dot | row | ~ | `g` | 標記 | FR-007 |  |
| 354 | expected-fixes004 | inter-page | 0.dupairs.dot | row | ~ | `h` | 標記 | FR-007 |  |
| 355 | expected-fixes004 | inter-page | 0.dupairs.dot | row | ~ | `log` | 標記 | FR-007 |  |
| 356 | expected-fixes004 | page0 | inter-procedurals/1.dupairs.dot | row | ~ | `g` | 標記 | FR-007 |  |
| 357 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `Counter: call (11) -> 37` | 求值順序 | FR-002–FR-004 |  |
| 358 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | + | `Counter: call (11) -> call (37)` | 求值順序 | FR-002–FR-004 |  |
| 359 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | - | `counter: 37 -> call (38)` | 連結 | FR-001 | （亦符：求值順序） |
| 360 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | + | `counter: call (37) -> call (38)` | 連結 | FR-001 | （亦符：求值順序） |
| 361 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | pair | + | `x: 30 -> 16` | 連結 | FR-001 | （亦符：§43） |
| 362 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `P` | 標記 | FR-007 |  |
| 363 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `a` | 標記 | FR-007 |  |
| 364 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `b` | 標記 | FR-007 |  |
| 365 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `c` | 標記 | FR-007 |  |
| 366 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `g` | 標記 | FR-007 |  |
| 367 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `h` | 標記 | FR-007 |  |
| 368 | expected-fixes004 | page0 | inter-procedurals/2.dupairs.dot | row | ~ | `log` | 標記 | FR-007 |  |
| 369 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `Counter: call (11) -> 37` | 求值順序 | FR-002–FR-004 |  |
| 370 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | + | `Counter: call (11) -> call (37)` | 求值順序 | FR-002–FR-004 |  |
| 371 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | - | `counter: 37 -> call (38)` | 連結 | FR-001 | （亦符：求值順序） |
| 372 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | + | `counter: call (37) -> call (38)` | 連結 | FR-001 | （亦符：求值順序） |
| 373 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | pair | + | `x: 30 -> 16` | 連結 | FR-001 | （亦符：§43） |
| 374 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | ~ | `P` | 標記 | FR-007 |  |
| 375 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | ~ | `a` | 標記 | FR-007 |  |
| 376 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | ~ | `b` | 標記 | FR-007 |  |
| 377 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | ~ | `c` | 標記 | FR-007 |  |
| 378 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | ~ | `g` | 標記 | FR-007 |  |
| 379 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | ~ | `h` | 標記 | FR-007 |  |
| 380 | expected-fixes004 | page0 | intra-pages/0.dupairs.dot | row | ~ | `log` | 標記 | FR-007 |  |

## 重複列數

| case | 頁 | 檔案 | develop 重複列 | 007 重複列 | 增減 |
|------|----|------|----------------|------------|------|
| expected | inter-page | 0.dupairs.dot | 0 | 26 | +26 |
| expected | page0 | inter-procedurals/0.dupairs.dot | 0 | 4 | +4 |
| expected | page0 | inter-procedurals/1.dupairs.dot | 0 | 4 | +4 |
| expected | page0 | inter-procedurals/2.dupairs.dot | 0 | 4 | +4 |
| expected | page0 | intra-pages/0.dupairs.dot | 0 | 26 | +26 |
| expected | page0 | intra-procedurals/2.dupairs.dot | 4 | 4 | 0 |
| expected-es2015 | inter-page | 0.dupairs.dot | 1 | 1 | 0 |
| expected-es2015 | page0 | intra-pages/0.dupairs.dot | 1 | 1 | 0 |
| expected-es2015 | page0 | intra-procedurals/5.dupairs.dot | 1 | 1 | 0 |

## 釘選與簽核

| case | 頁 | 類別 | 觸發 | + | − | 說明 | 簽核 |
|------|----|------|------|---|---|------|------|
| expected | inter-page | 連結 | L19 → $DOMAIN.$PAGE_0.add；L64 → $DOMAIN.$PAGE_0.parseSaved；L65 → $DOMAIN.$PAGE_0.sumAll；L69 → $DOMAIN.$PAGE_0.countDown；L70 → $DOMAIN.$PAGE_0.sumAll；L75 → $DOMAIN.$PAGE_0.describeMode | 69 | 13 | US2：handler 內 `items = parseSaved(...)`、`total = sumAll(items)`、`items.push(countDown(5))`（引數中的呼叫）、`mode = describeMode(mode)` 與 sumAll 內 `sum = sum + add(list[i])` 成為呼叫點並連結（FR-001）；+ 為被呼叫端內（含 sumAll、add 函式內的 pair，T042 工具修正後以具名函式 `function <scope>` 標題取得行範圍判定）與呼叫點之後的 pair，含呼叫點行上的讀取與定義依段落改落在 `call (<行>)`／`callReturn (<行>)`（亦符求值順序，FR-002）；− 為呼叫點行的讀取／定義改由 CALL／CALL RETURN 標記承載（同一 pair 以 `call (<行>)` 形式出現於 +） | 草擬，待簽核（#1、#21、#22、#23、#24、#25、#26、#27、#28、#29、#30、#31、#32、#33、#34、#35、#36、#37、#38、#39、#40、#41、#42、#43、#44、#45、#46、#47、#48、#49、#50、#51、#52、#53、#54、#55、#56、#57、#58、#59、#60、#61、#62、#63、#64、#65、#66、#67、#68、#69、#70、#71、#72、#73、#74、#75、#76、#77、#78、#79、#80、#81、#82、#83、#84、#85、#86、#87、#88、#89、#90、#91、#92、#93、#94、#95、#96、#97、#98、#99、#100、#101、#102） |
| expected | page0 | 連結 | L19 → $DOMAIN.$PAGE_0.add；L64 → $DOMAIN.$PAGE_0.parseSaved；L65 → $DOMAIN.$PAGE_0.sumAll；L69 → $DOMAIN.$PAGE_0.countDown；L70 → $DOMAIN.$PAGE_0.sumAll；L75 → $DOMAIN.$PAGE_0.describeMode | 150 | 13 | US2：handler 內 `items = parseSaved(...)`、`total = sumAll(items)`、`items.push(countDown(5))`（引數中的呼叫）、`mode = describeMode(mode)` 與 sumAll 內 `sum = sum + add(list[i])` 成為呼叫點並連結（FR-001）；+ 為被呼叫端內（含 sumAll、add 函式內的 pair，T042 工具修正後以具名函式 `function <scope>` 標題取得行範圍判定）與呼叫點之後的 pair，含呼叫點行上的讀取與定義依段落改落在 `call (<行>)`／`callReturn (<行>)`（亦符求值順序，FR-002）；− 為呼叫點行的讀取／定義改由 CALL／CALL RETURN 標記承載（同一 pair 以 `call (<行>)` 形式出現於 +） | 草擬，待簽核（#3、#4、#5、#7、#8、#9、#11、#12、#13、#15、#16、#17、#19、#103、#104、#105、#106、#107、#108、#109、#110、#111、#112、#113、#114、#115、#116、#117、#118、#119、#120、#121、#122、#123、#124、#125、#126、#127、#128、#129、#130、#131、#132、#133、#134、#135、#136、#137、#138、#139、#140、#141、#142、#143、#144、#145、#146、#147、#148、#149、#150、#151、#152、#153、#154、#155、#156、#157、#158、#159、#160、#161、#162、#163、#164、#165、#166、#167、#168、#169、#170、#171、#172、#173、#174、#175、#176、#177、#178、#179、#180、#181、#182、#183、#184、#185、#186、#187、#188、#189、#190、#191、#192、#193、#194、#195、#196、#197、#198、#199、#200、#201、#202、#203、#204、#205、#206、#207、#208、#209、#210、#211、#212、#213、#214、#215、#216、#217、#218、#219、#220、#221、#222、#223、#224、#225、#226、#227、#228、#229、#230、#231、#232、#233、#234、#235、#236、#237、#238、#239、#240、#241、#242、#243、#244、#245、#246、#247、#248、#249、#250、#251、#252、#253） |
| expected-es2015 | inter-page | 連結 | L17 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0 | 4 | 2 | US2：`const list = new TodoList(...)`（L17）連結 TodoList 的 constructor（FR-001）；+ 為 constructor 內與其後的 pair，− `list: 17 -> 25`／`list: 17 -> 34` 改由 `callReturn (17)` 定義（同 pair 見 +） | 草擬，待簽核（#254、#265、#270、#271、#272、#273、#274） |
| expected-es2015 | page0 | 連結 | L17 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0 | 33 | 2 | US2：`const list = new TodoList(...)`（L17）連結 TodoList 的 constructor（FR-001）；+ 為 constructor 內與其後的 pair，− `list: 17 -> 25`／`list: 17 -> 34` 改由 `callReturn (17)` 定義（同 pair 見 +） | 草擬，待簽核（#256、#257、#259、#260、#261、#263、#277、#278、#279、#280、#281、#282、#283、#284、#285、#286、#287、#288、#289、#290、#291、#292、#293、#294、#295、#296、#297、#298、#300、#302、#303、#304、#306、#311、#312、#313、#314、#315） |
| expected-es2015 | inter-page | 求值順序 | 呼叫點行 L17、L40 | 2 | 2 | L17 的 `TodoList`、`document` 讀取在呼叫之前（段 0，`call (17)`）；L40 `addTodo(input?.value)` 的讀取移到 CALL（段 0）標記（FR-002） | 草擬，待簽核（#266、#267、#268、#269） |
| expected-es2015 | page0 | 求值順序 | 呼叫點行 L17、L40 | 4 | 2 | L17 的 `TodoList`、`document` 讀取在呼叫之前（段 0，`call (17)`）；L40 `addTodo(input?.value)` 的讀取移到 CALL（段 0）標記（FR-002） | 草擬，待簽核（#299、#301、#307、#308、#309、#310） |
| expected-fixes004 | inter-page | 連結 | L37 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_2、$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_3 | 2 | 1 | US2：`var counter = new Counter();`（L37）連結 Counter 的欄位初始化式與 constructor（FR-001）；`counter` 的定義端改為呼叫點副本 `call (37)`（−1／+1 同一 pair 換標記）；+ `x: 30 -> 16` 為 constructor 中 `this.bump()` 經 bump 的 `x = 3` | 草擬，待簽核（#333、#346、#347、#348） |
| expected-fixes004 | page0 | 連結 | L37 → $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_2、$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_3 | 4 | 2 | US2：`var counter = new Counter();`（L37）連結 Counter 的欄位初始化式與 constructor（FR-001）；`counter` 的定義端改為呼叫點副本 `call (37)`（−1／+1 同一 pair 換標記）；+ `x: 30 -> 16` 為 constructor 中 `this.bump()` 經 bump 的 `x = 3` | 草擬，待簽核（#338、#342、#359、#360、#361、#371、#372、#373） |
| expected-fixes004 | inter-page | 求值順序 | 呼叫點行 L9、L11、L22、L28、L36、L37、L38、L39、L42、L49、L51 | 1 | 1 | L37 的 `Counter` 讀取在呼叫之前（段 0），use 端由 `37` 改為 `call (37)`（FR-002） | 草擬，待簽核（#344、#345） |
| expected-fixes004 | page0 | 求值順序 | 呼叫點行 L9、L11、L22、L28、L36、L37、L38、L39、L42、L49、L51 | 2 | 2 | L37 的 `Counter` 讀取在呼叫之前（段 0），use 端由 `37` 改為 `call (37)`（FR-002） | 草擬，待簽核（#357、#358、#369、#370） |

## class static 不再連結

| case | 頁 | 行 | static scope | 位置種類 | 相關 ± pair 筆數 |
|------|----|----|--------------|----------|------------------|
| 無 |  |  |  |  |  |

## Setup

### 變化說明

lib 與 `edc22d5` 相同（T001 以 `git diff --quiet edc22d5 -- lib` 確認），golden 未更新；`diffcheck golden --verify` 零差異，重複列數兩側相同。

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

新增 `lib/dujs/callsplit.js`（SegmentPlan、後序、呼叫點列舉、歸段、拋錯判定）、`callresolver.calleeScopesOfExpression`、`findGENSet` 記 `generatedAt`、FlowNode 新屬性、esgraph 的 `discriminantThrowTarget` 屬性與 `throwTypes` 匯出、`branchsplitter.isInsideLoopBody` 匯出；
皆未接到模型建構（`modelbuilder` 未呼叫 `callsplit`），esgraph 只記屬性、不連邊，golden 未更新；`diffcheck golden --verify` 零差異，重複列數兩側相同。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| （全部） | （無） | 不變 | Foundational 行為不變，不改 golden |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| （無） |  |  |  |  |

（本階段只新增測試，未改動既有測試的期望；`tests/dujs/methodcalls.js` 新增「should keep calleeScopesOf of new A().m() unchanged in this phase」釘住 T037 之前的 `calleeScopesOf` 行為。）

## US1

### 變化說明

既有呼叫點（`astNode` 本身是呼叫／`new` 的節點、欄位初始化式的 `return` 引數、class static）改依 SegmentPlan 分段（`callsplit.planOf(node, scopeTree, callresolver.stagedCallSite)`）：
段 0 帶呼叫前的 GEN／USE（`f(x = 1);` 的 `x = 1` 在 CALL 上），返回後段帶其後的 GEN／USE；決策節點中呼叫前讀到的 p-use 記為延後 p-use，以決策節點的 `true`／`false` 產生 pair；
`summary.summaryGraphOf` 併入延後 p-use；class 名稱位置規則取代 `keepGenerateAtCallSite`、`splitByInnerClassName`；前插 CALL（段 0）新增 exception 邊（其餘 exception 邊維持 develop 位置）。
另依 DECISION 007：`callsplit.evaluatedExpressionsOf` 只對「留在 `case` 節點內」的 test（未拆分或拆分後的末端運算元）回傳空，branchsplitter 自 `case` test 拆出的非末端運算元決策節點照常求值（與 develop 相同，`case g() && 1:` 的 `g()` 連結）。

- golden 結果：**無任何 pair 差異**（`求值順序` 類 0 筆；golden fixture 中沒有引數或條件在呼叫前定義、且被呼叫端讀取的變數）。唯一差異是 `expected-interprocedural` 的 3 個 `.graph.dot` 各多一條 `CALL -> 例外目標` 的 exception 邊（同一個 `if (…())` 決策節點在 inter-procedural、intra-page、inter-page 三層；record `c3`，`isReady()`，`beforeDecision: true`），不改任何 pair、`*.matching.json` 不變。
- 這 3 筆歸 `共通`（子標 `段0例外`，DECISION 008 擴充 contracts/diff-check.md §2 `共通` 的第三個成立條件，diffcheck 機械判定：新增邊皆為 exception、來源為 `beforeDecision` record 的 `callNode`、目標為其 `exceptionalReturn`、基準側原決策節點已有同目標 exception 邊、每 record 一條、無 pair／row 差異、無刪邊／改向）。說明欄由 `--report` 自動列出「callNode → 目標（record id）」：inter-page `n99 → n109（c3）`，inter-procedurals/1 與 intra-pages/0 皆 `n36 → n46（c3）`。無釘選列，未出現 `返回後例外`。
- 類別計數：`共通` 3（皆 `段0例外`）；`求值順序`、`連結`、`返回後例外`、`§44`／`§46`、`標記` 皆 0。
- 過渡失真 `new F().m(x = 1)`（US1 只留外層 `.m()`，`x = 1` 落在段 0，歸 `求值順序`，T037／T038 後修正）：golden 與 MDN 皆 0 例。
- for-in/of 右側 class static 的過渡差異（US1–US2 不連結，US3 恢復；plan「階段性的呼叫點篩選」）：golden 與 MDN 皆 0 例（0 筆 − 項）。
- 「class static 不再連結」（KI §44／§46 行為變更）：實例數 golden 0 例（機器區塊表為「無」）、MDN 0 例（`diffcheck mdn --report` 無差異，33 檔 CLI exit code 皆 0→0）；行為以 `tests/dujs/splitcallnodes.js` 的 T066 五例釘住。
- MDN（`diffcheck mdn --report`，僅檢查，mdn-diff.md 未更新）：無差異。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-interprocedural | inter-page/0.graph.dot | 37ee3d700c98 → d9d073172a9c | 前插 CALL（段 0）新增 exception 邊 |
| expected-interprocedural | page0/inter-procedurals/1.graph.dot | 1de49a9e02ee → 603fa7e33f5b | 同上 |
| expected-interprocedural | page0/intra-pages/0.graph.dot | 2a92a0d7a998 → 4d548c20d8e1 | 同上 |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| tests/dujs/expansion.js | pre-refactor characterization (probes) › a1 › keeps the def-use pairs of every inter-procedural model／of the intra-page model／of the inter-page model | `x: L4 -> L3`、`x: L4 -> L6` | `x: L2 -> L3`、`x: L2 -> L6`（`f(x = 1)` 的 `x = 1` 在 f 呼叫 k〔`x = 4`〕之前生效） | FR-002（KI §16） |
| tests/dujs/expansion.js | expansion › GEN of copies › should keep the GEN at the call-site with keepGenerateAtCallSite | `keepGenerateAtCallSite` 使 GEN 留在呼叫點 | 刪除（欄位刪除，class 名稱位置規則取代；`tests/dujs/classfields.js` T023 守門） | FR-002（R3） |
| tests/dujs/expansion.js | expansion by the builder › should connect the calls of probe a1 | `f(x = 1)` 的 `x` 定義在 CALL RETURN 的 GEN、呼叫點副本 GEN 為空 | `x` 定義在呼叫點副本（CALL，段 0）的 GEN、CALL RETURN 的 GEN 為空 | FR-002 |
| tests/dujs/hierarchy.js | addCallEdge › should record keepGenerateAtCallSite on the frozen edge；should not keep the GEN at the call-site by default | Edge 帶 `keepGenerateAtCallSite` | 改為 plan／callIndex／lastOfCallSite 三個測試（有 plan 時 `beforeDecision` 依 shape、只第一條邊；無 plan 時三欄為 null） | FR-002（data-model §2） |
| tests/dujs/hierarchy.js | US1 acceptance (003 quickstart §3) › scenario 2 should keep the predecessor of the decision node L5 in the intra-procedural model | `x: L1 -> L3` | `x: L5 -> L3` | FR-002（KI §16） |
| tests/dujs/reviewfixes.js | R3 should call the callee before a decision node whose condition is a call | CALL 節點的 `next` 只有 f 的 entry | CALL 節點另有 exception 邊（與決策節點同一目標），`next` 兩個 | FR-005（前插段 0 的例外邊） |

## US2

### 變化說明

運算式中的呼叫列為呼叫點（`calleeScopesOf` 改由 `callsplit.planOf(node, scopeTree, stagedCallSite)` 的 `callSites` 串接；`stagedCallSite` 只排除 `once-switch`／`once-loop` 形狀，`// 007 US3 移除`）：
賦值、變數宣告初始化、`return`、參數預設值、欄位初始化式（刪除 `callExpressionOf` 的 `dujsFieldInitializer` 特例，改由呼叫點列舉涵蓋）、箭頭本體、`throw`、引數中的呼叫；`new A().m()` 拆為 `new A()`（欄位初始化式與 constructor）與 `.m()`（只 `m`）兩個呼叫點；
CLI 標記（DECISION 005 Q1 A，FR-007）：`call (<行>[:路徑])`、`callReturn (<行>[:路徑])`，空路徑不帶 `:`，重名加 `_a`、`_b`（只改 `toDotWithLabelLine`）。

- **diffcheck 工具修正（Setup T006 的實作 bug，DECISION 009 範圍、DECISION 010 使用者同意）**：`diffcheck.js outputFactsOf` 原本只以 `label = "...[ <scope> ]"` 取 intra-procedural 模型的行範圍，具名函式的標題是 `label = "function $DOMAIN.$PAGE_0.add"`（`lib/dujs/graphics.js`），範圍表為空，contract §2 `連結` 的「被呼叫端行範圍」條件讀不到具名函式。
  T042 在該處補上 `/^label = "function (\S+)"/m` 的解析（只此一處；判準與 contracts/diff-check.md 不變），`diffcheck.test.js` 補正例（`function <scope>` 標題取得行範圍、範圍內的 pair 歸 `連結`）與反例（無可辨識標題時範圍為空、不歸 `連結`）。
  修正後重產機器區塊（編號不變）：先前 27 列「（無成立類別）」（全在 `expected` 的 `sumAll`〔`i: 18 -> 18`、`i: 18 -> (18,21)`、`list: entry -> (18,21)`〕與 `add`〔`result: 9|11 -> 13`、`value: entry -> 8|9|11|(8,9)|(8,11)`〕函式內的 + pair，三個層級）全歸 `連結`；另有 **20 列因工具修正，從求值順序改歸連結**（`expected` 的 sumAll／add 內、呼叫點行 L19 的 `call (19)` 端點 pair，如 `add: entry -> call (19)_a_b_a`、`sum: 17 -> call (19)`，`求值順序` 改列於「亦符」）；`expected` 的兩列 `求值順序` 釘選因此消失，其 + 併入 `連結` 釘選列。無其他類別變動，無成立類別 0。
- 類別計數（`--report`，共 380 筆）：`連結` 304（+262／−33／~9）、`求值順序` 16（+9／−7）、`標記` 42（~）、`共通` 15（+5／~10）、`共通（段0例外）` 3（US1 既有，未變）；無成立類別、`返回後例外`、`§44`／`§46` 0。
- − pair 皆為呼叫點行的端點改由 `call (<行>)`／`callReturn (<行>)` 承載（同一 def-use 以新標記出現於 +），沒有語意上消失的 pair。
- 「class static 不再連結」：golden 0 例（機器區塊表為「無」）。
- for-in/of 右側 class static 的過渡差異（US1–US2 不連結，US3 恢復，已同意）：golden 0 例（0 筆 − 項）。
- US1 的 `new F().m(x = 1)` 過渡失真：已消失（`new F()` 與 `.m()` 為兩個呼叫點，`x = 1` 在兩者之間；P31 `x: L1 -> L4`、`x: L10 -> L7`，無 `x: L10 -> L4`、`x: L1 -> L7`，`tests/dujs/splitcallnodes.js` US2-12）；golden 無此形狀。
- P25 部分驗收：`throw f();` 只核對 `x: L1 -> L9` 與 `f` 的 call 邊（US2-10）；`x: L3 -> L9` 需返回後段的 exception 邊，待 US4（DECISION 006 Q1）。US2 期間段 1 無出邊，分析未拋錯、求解正常。
- 重複列數：`expected` 新增 inter-procedural 模型帶來新的重複列（inter-page／intra-pages +26、inter-procedurals/0–2 各 +4），不設門檻（KI §43）。
- T040 實際改動的既有測試檔：`tests/dujs/cfggraphconverter.js`、`tests/dujs/newcallsite.js`、`tests/dujs/methodcalls.js`、`tests/dujs/exceptionsummary.js`、`tests/dujs/expansion.js`、`tests/dujs/modelbuilder.js`、`tests/dujs/paramdefaults.js`、`tests/dujs/paramsandnew.js`、`tests/dujs/scopeguards.js`、`tests/dujs/scoperesolution.js`、`tests/dujs/splitcallnodes.js`（T066 守門輔助函式）、`tests/dujs/callsplit.js`（T011 補 `callees` 斷言）。
- MDN：mdn-diff.md 不在本階段範圍（於 Polish T059 重產）。本階段曾試跑 `diffcheck mdn --verify`：exit 1，889 個問題（873 筆 US2 新增的 `連結`／`共通` 差異尚未記錄、16 筆重複列數不符），沒有無類別列，也沒有 intra-procedurals 失敗，屬預期中的尚未重產。MDN 無類別 7 筆＝已查證的工具缺口，產品輸出正確；mdn-diff 於 T059 前置任務（T067）後重產（DECISION 011）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| expected-es2015 | inter-page/0.dupairs.dot | ae6308300018 → 9d5aa27d6be3 | 呼叫點標記與新呼叫點 |
| expected-es2015 | inter-page/0.graph.dot | 82ccdd814580 → f25eb1d9b3cb | 呼叫點標記與新呼叫點 |
| expected-es2015 | inter-page/0.matching.json | 403bb1405665 → cbcde73dafdf | record 增減／重編 |
| expected-es2015 | page0/inter-procedurals/0.dupairs.dot | 3d7c79945e39 → 1287a9ac6665 | 呼叫點標記與新呼叫點 |
| expected-es2015 | page0/inter-procedurals/0.graph.dot | e94dce8b6ea7 → 6ef165c0029c | 呼叫點標記與新呼叫點 |
| expected-es2015 | page0/inter-procedurals/0.hierarchy.dot | c9849d17b108 → 19c2359f5ae2 | 呼叫點標記與新呼叫點 |
| expected-es2015 | page0/inter-procedurals/0.matching.json | abfd12f9e462 → 088389af4cc2 | record 增減／重編 |
| expected-es2015 | page0/inter-procedurals/1.dupairs.dot | （新增） → 72602271b6c3 | 新增（US2 新呼叫點的模型） |
| expected-es2015 | page0/inter-procedurals/1.graph.dot | （新增） → db9a30f5c6c6 | 新增（US2 新呼叫點的模型） |
| expected-es2015 | page0/inter-procedurals/1.hierarchy.dot | （新增） → c9849d17b108 | 新增（US2 新呼叫點的模型） |
| expected-es2015 | page0/inter-procedurals/1.matching.json | （新增） → 675051e7d4ce | 新增（US2 新呼叫點的模型） |
| expected-es2015 | page0/intra-pages/0.dupairs.dot | ae6308300018 → 9d5aa27d6be3 | 呼叫點標記與新呼叫點 |
| expected-es2015 | page0/intra-pages/0.graph.dot | 4cb3b1a1979e → 664cb8c8deba | 呼叫點標記與新呼叫點 |
| expected-es2015 | page0/intra-pages/0.matching.json | 1da0e2476b76 → 0691c9b1e87e | record 增減／重編 |
| expected-fixes004 | inter-page/0.dupairs.dot | 3b8024a6c642 → 729533402530 | 呼叫點標記與新呼叫點 |
| expected-fixes004 | inter-page/0.graph.dot | 270dee2acc57 → d4aa1776f59d | 呼叫點標記與新呼叫點 |
| expected-fixes004 | inter-page/0.matching.json | 47e0ec647dc8 → 8b0108848dfd | record 增減／重編 |
| expected-fixes004 | page0/inter-procedurals/0.graph.dot | 79aaf94c4589 → ab6fd55c630a | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/inter-procedurals/1.dupairs.dot | 95c6e893d24d → 711a1f1f1e00 | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/inter-procedurals/1.graph.dot | b57af69454b0 → 60514747c9c1 | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/inter-procedurals/1.matching.json | 40d5f56f8b9a → be03e3176e67 | record 增減／重編 |
| expected-fixes004 | page0/inter-procedurals/2.dupairs.dot | 3b8024a6c642 → 729533402530 | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/inter-procedurals/2.graph.dot | 39b85cf6f25d → 4b27d024426e | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/inter-procedurals/2.matching.json | 267dc6594a86 → 03e95ec14748 | record 增減／重編 |
| expected-fixes004 | page0/inter-procedurals/3.graph.dot | f360f12e1169 → cea055623e84 | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/inter-procedurals/3.matching.json | 5ca05fb3918d → 0b609a21a730 | record 增減／重編 |
| expected-fixes004 | page0/intra-pages/0.dupairs.dot | 3b8024a6c642 → 729533402530 | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/intra-pages/0.graph.dot | 9bc65091578e → a389e8c0a39d | 呼叫點標記與新呼叫點 |
| expected-fixes004 | page0/intra-pages/0.matching.json | a9398d50fd37 → ca727eafeb23 | record 增減／重編 |
| expected-interprocedural | inter-page/0.dupairs.dot | 98da3f06a99f → 7ce065eed884 | 呼叫點標記與新呼叫點 |
| expected-interprocedural | inter-page/0.graph.dot | d9d073172a9c → 185d866ffe50 | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/inter-procedurals/0.dupairs.dot | 627d2003cd9e → 7b605d4b1691 | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/inter-procedurals/0.graph.dot | c0dc33fb5f88 → dae919ae619c | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/inter-procedurals/1.dupairs.dot | 1f434e0b7beb → a283b34395aa | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/inter-procedurals/1.graph.dot | 603fa7e33f5b → 8a57faeb1d3f | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/inter-procedurals/2.dupairs.dot | f06d85cef816 → dcd1bf18734f | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/inter-procedurals/2.graph.dot | 52ee22d5a537 → 8ffbc4fdfecb | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/intra-pages/0.dupairs.dot | 9965cedd1487 → 41bc40f288aa | 呼叫點標記與新呼叫點 |
| expected-interprocedural | page0/intra-pages/0.graph.dot | 4d548c20d8e1 → ba7aeff8ffc5 | 呼叫點標記與新呼叫點 |
| expected | inter-page/0.dupairs.dot | fd399e593d80 → 1b61ff09e4b0 | 呼叫點標記與新呼叫點 |
| expected | inter-page/0.graph.dot | 3f0b8095455f → 00c9f498f944 | 呼叫點標記與新呼叫點 |
| expected | inter-page/0.matching.json | d4d85a4907b6 → e5c90fdeb416 | record 增減／重編 |
| expected | page0/inter-procedurals/0.dupairs.dot | （新增） → 53bdc190ec0e | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/0.graph.dot | （新增） → 6887c5b7889d | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/0.hierarchy.dot | （新增） → fe8763e0f67a | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/0.matching.json | （新增） → af29aa280c22 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/1.dupairs.dot | （新增） → c51c1bc6aea2 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/1.graph.dot | （新增） → 46f040fc9986 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/1.hierarchy.dot | （新增） → da3921f0b940 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/1.matching.json | （新增） → 1c2b7ff6f616 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/2.dupairs.dot | （新增） → 317183ce6d99 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/2.graph.dot | （新增） → 5000db088960 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/2.hierarchy.dot | （新增） → 5fc0e3534fc4 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/2.matching.json | （新增） → d0368f3630c6 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/3.dupairs.dot | （新增） → 53b13dcb6150 | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/3.graph.dot | （新增） → 03d016d6371d | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/3.hierarchy.dot | （新增） → 50d914ec588c | 新增（US2 新呼叫點的模型） |
| expected | page0/inter-procedurals/3.matching.json | （新增） → 91af82c76d48 | 新增（US2 新呼叫點的模型） |
| expected | page0/intra-pages/0.dupairs.dot | 20f1636ff045 → d1ef73f6a95b | 呼叫點標記與新呼叫點 |
| expected | page0/intra-pages/0.graph.dot | 08bf749a604e → e936df52fd10 | 呼叫點標記與新呼叫點 |
| expected | page0/intra-pages/0.matching.json | 07b55f534445 → c6aef0cda13d | record 增減／重編 |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| tests/dujs/cfggraphconverter.js | Labels of call return nodes › a split call site › should label the calls and the call returns with line and branch path（原名 should label the call returns with line and branch path） | CALL 標 `call_a`、`call_b` | `call (4:T)`、`call (4:F)` | FR-007（DECISION 005 Q1 A） |
| tests/dujs/cfggraphconverter.js | call sites not split › should label the calls and the call returns with their lines（原名 should keep the labels with labeled line numbers） | `call_a`、`callReturn_a`、`call_b`、`callReturn_b` | `call (3)`、`callReturn (3)`、`call (4)`、`callReturn (4)` | FR-007 |
| tests/dujs/cfggraphconverter.js | a split call site and a call site not split › should label only the call returns of the split call site with paths | 未拆分的 CALL RETURN 標 `callReturn` | `callReturn (5)`；CALL 另斷言 `call (4:F)`、`call (4:T)`、`call (5)` | FR-007 |
| tests/dujs/newcallsite.js | US2-5 should connect y = new F(); (feature 007 User Story 2)（原名 US2-5 should not connect y = new F();） | `x: L1 -> L6`、無 inter-procedural 模型 | `x: L3 -> L6`、模型 `[PAGE, PAGE.F]` | FR-001 |
| tests/dujs/newcallsite.js | callExpressionOf › should return null for the return statement of a field initializer（原名 should return this.m() and new B() of a field initializer (FR-017)） | 欄位初始化式的 `this.m()`、`new B()` | `null`（特例刪除）；`calleeScopesOf` 仍解析 `this.m()` → `m` | FR-001（T037） |
| tests/dujs/newcallsite.js | calleeScopesOf › should resolve new ns.A() and an undeclared callee to none, and f() of new (f())() to f | `new (f())()` → `[]` | `[PAGE.f]`（`f()` 為呼叫點） | FR-001 |
| tests/dujs/methodcalls.js | should not resolve o.m() of a getter, a setter or an arrow function of a field | `interProceduralScopes` 為 `[]` | `[[PAGE, $ANONYMOUS_FUN_3]]`（`var o = new A()` 連到欄位 `h` 的初始化式）；pair 不變 | FR-001 |
| tests/dujs/methodcalls.js | should chain the call sites new A() and .m() of new A().m() (feature 007 User Story 2)（原名 should keep calleeScopesOf of new A().m() unchanged in this phase） | `calleeScopesOf` 為單一呼叫點的 `[constructor, m]` | 兩個呼叫點串接仍為 `[constructor, m]`；外層 `.m()` 的 `calleeScopesOfExpression` 只 `[m]`、`new F().m()` 只 `[F]` | FR-001（T037） |
| tests/dujs/exceptionsummary.js | carries the exceptional definitions of the later call of a chain to the catch and to the exit | `new A().m()` 一個呼叫點兩個被呼叫端 | 另斷言 plan 為兩個呼叫點 `new:1`、`call:1`；pair 不變 | FR-001 |
| tests/dujs/expansion.js | pre-refactor characterization (probes) › a2 › keeps the def-use pairs of every inter-procedural model | 兩個模型；頁面模型不含 `init` | 新增模型 `[$ANONYMOUS_FUN_0, init]`（static 欄位 `a = init()`）；頁面模型含 `init`；pair 不變 | FR-001 |
| tests/dujs/modelbuilder.js | should fall back to the intra-procedural reach-in definitions when no model is analyzed | 每個 inter-procedural 模型都含 h 的節點 | 只檢查含 h 節點的模型（新增的 `[$ANONYMOUS_FUN_0, init]` 不含） | FR-001 |
| tests/dujs/paramdefaults.js | US4-1prime should make the arrow function a scope and connect return g() (feature 007)（原名 …without connecting return g()） | 無 `d: L1 -> L3`；模型 `[[PAGE, PAGE.f]]` | 有 `d: L1 -> L3`；模型 `[[PAGE.f, arrow], [PAGE, PAGE.f, arrow]]` | FR-001（KI §10，P4） |
| tests/dujs/paramsandnew.js | should make a default value which is an arrow function a child scope | intra-page 無 `d` pair | `d: L1 -> L3` | FR-001（KI §10） |
| tests/dujs/scopeguards.js | should keep the scope names and the model counts of named-expr.js | interProcedural 1 | 2（`return fact(n);` 自遞迴，新增以 fact 為根的模型） | FR-001 |
| tests/dujs/scoperesolution.js | should define the names of named expressions where they are evaluated (named-expr) | 每個 inter-procedural 模型都有 `Q: L1 -> L2`、`fact: L4 -> L5` | 只檢查以頁面為根的模型（fact 自遞迴模型無這兩個定義） | FR-001 |
| tests/dujs/splitcallnodes.js | US1: class static members in the positions not listed as call sites（5 例）› shouldNotConnect | 任何模型都沒有 call 邊 | 頁面不連到 static scope；唯一允許的 call 邊為 static scope 自身模型 → `g`（`static y = g();` 的初始化式呼叫，US2） | FR-001（KI §44／§46） |

## US3

### 變化說明

`once-switch`／`once-loop` 形狀接上模型建構：移除階段性 predicate（DECISION 006 Q2 (d)，T048：`callresolver.stagedCallSite` 刪除，`modelbuilder` 與 `calleeScopesOf` 改呼叫 `callsplit.planOf(node, scopeTree)`，`planOf` 去掉 predicate 參數、快取改為單層 `WeakMap<原節點, plan>`）；
`switch` 判別式（未拆分且含呼叫點）在第一個 `case` 前插段鏈、只求值一次，各有 test 的 `case` 副本設 `discriminantSplit`（原節點不動），判別式的讀取以延後 p-use 記在每個有 test 的 `case`、讀求值當下的定義（clarify Q2 A'）；
`for…in`／`for…of` 右側在迴圈節點前插段鏈，只改「來源原節點屬 `enteringPrev`」的前驅（CALL／CALL RETURN 以 `segment.source` 比對），迴圈副本設 `loopRightSplit`，本體回邊仍回到迴圈副本；迴圈變數與左側的讀取留在迴圈副本（`callsplit.segmentOf` 對 once-loop 左側的 AST 回傳 null，T047）。
段 0 的 exception 邊連到 `copyOf(plan.throwTarget)`（判別式為 `discriminantThrowTarget`）；段 1…k 的 exception 邊仍待 US4。

- golden 結果：**累積淨差異與 US2 完全相同**（380 筆，`--report` 的淨差異、重複列數、釘選與簽核、class static 表逐列相同）；`UPDATE_GOLDEN=1` 後 `tests/golden/expected*` 與 `manifest.json` 無任何位元組變化。原因：golden fixture 中只有兩處 `switch`／`for…of`（`page0/app.js:37` `switch (m)`、`es2015/app.js:29` `for (const { id } of saved ?? [])`），判別式與右側皆無可解析的呼叫點，`once-*` 形狀的 plan 為 k = 0、不拆分。
- 類別計數：同 US2（`連結` 304、`求值順序` 16、`標記` 42、`共通` 15、`共通（段0例外）` 3）；本階段新增的子標 `判別式`、`可迭代` 在 golden 皆 0 例；無成立類別、`返回後例外`、`§44`／`§46` 皆 0。
- 先例 switch（`switch (a && b)`，已拆分判別式）：golden 無此形狀；以 `tests/dujs/splitcallnodes.js`「US3: guards」守門（pair 與 develop 逐字相同、只記一次；`switch (a && f())`、`for (v of a && f())` 的含呼叫拆分葉依 R1 拆段、`case`／迴圈不再讀判別式／右側）。
- US1–US2 的 for-in/of 右側 class static 過渡 − 項：golden 與 MDN 皆 0 例（自本階段 once-loop 連結；`for (var v of [class { static y = g(); }])` 已恢復連結並得 `x: L3 -> L8`，以探測確認）。
- 「class static 不再連結」：golden 0 例（機器區塊表為「無」）。
- KI §48（`switch (f()) {}`）：仍拋 develop 的同一錯誤（`Cannot read properties of undefined (reading 'type')`，esgraph 建圖時），沒有其他失敗模式（T044 (d) 守門）；沒有 `case` 的 `switch` 沒有第一個 `case` 節點，判別式不屬任何節點、不形成 plan。
- probes（T050）：相對 US2 只有 P15、P15b、P16、P24、P32 的 inter-procedural／intra-page 結果改變，皆與 spec US3 情境一致；其餘 probe 輸出逐字不變，FR-006 守門全綠。
- MDN（`diffcheck mdn --report`，僅檢查，mdn-diff.md 未更新）：輸出與 US2 狀態逐字相同（873 筆；7 筆無成立類別為 US2 已記錄的工具缺口，待 T067）。

### 雜湊變化表（舊→新 sha256 前 12 碼）

| case | 檔案 | 舊 sha256（前 12 碼）→ 新 | 說明 |
|------|------|---------------------------|------|
| （全部） | （無） | 不變 | golden fixture 無含呼叫的 `switch` 判別式或 for-in/of 右側 |

### 單元測試期望

| 檔案 | 測試名 | 舊期望 | 新期望 | FR |
|------|--------|--------|--------|----|
| tests/dujs/callsplit.js | phase predicate (temporary) › should list every call site without a predicate, once-* included | 不給 predicate 時全列舉 | 改名移到 `segmentOfVarDef of once-loop › should list every call site of the once-* shapes`（同一期望，predicate 已不存在） | FR-004（DECISION 006 Q2 (d)） |
| tests/dujs/callsplit.js | phase predicate (temporary) › should recompute the segments from the call sites kept | 篩掉 `g()` 後 k = 1、`g` 在段 0 | 刪除（T048 移除 predicate） | DECISION 006 Q2 (d) |
| tests/dujs/callsplit.js | phase predicate (temporary) › should cache the plans with and without a predicate apart | 有／無 predicate 的 plan 分開快取 | 刪除（快取改為單層，`planOf cache` 測試仍斷言以原節點快取、`reset()` 清除） | DECISION 006 Q2 (d) |
| tests/dujs/exceptionsummary.js | carries the exceptional definitions of the later call of a chain to the catch and to the exit | `planOf(node, scopeTree, callResolver.stagedCallSite)` 的呼叫點為 `new:1`、`call:1` | `planOf(node, scopeTree)`（不帶 predicate），期望不變 | FR-001 |
