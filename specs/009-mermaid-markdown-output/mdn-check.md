# MDN 語料驗收（009，FR-016）

由 `node specs/009-mermaid-markdown-output/tools/mdncheck.js --report` 產生；`--verify specs/009-mermaid-markdown-output/mdn-check.md` 重跑並核對基準、表格每列與總計。
語料：`specs/006-eslint-scope/mdn/pages.json`＋`corpus/`；兩邊皆以 `PATH=<node 目錄>`（無 Graphviz）執行 `bin/dujs.js`。

- 基準 commit：274257a
- 總計：32 個 id，通過 32；模型 192、圖 281、降級 0；最大邊數 200（a05-assessment-main inter-page/0.graph.dot）；最大字元數 7435

| id | 模型數 | 圖數 | 最大邊數 | 最大字元數 | 降級數 | 結果 |
|----|-------:|-----:|---------:|-----------:|-------:|------|
| a01-oojs-1 | 3 | 5 | 6 | 469 | 0 | 通過 |
| a01b-oojs-1-solution | 6 | 9 | 32 | 1449 | 0 | 通過 |
| a02-oojs-2 | 5 | 7 | 7 | 476 | 0 | 通過 |
| a02b-oojs-2-solution | 8 | 11 | 23 | 1117 | 0 | 通過 |
| a03-bouncing-main | 6 | 9 | 14 | 692 | 0 | 通過 |
| a04-bouncing-main-finished | 13 | 18 | 90 | 3579 | 0 | 通過 |
| a05-assessment-main | 20 | 26 | 200 | 7435 | 0 | 通過 |
| a06-classes-snippets | 15 | 18 | 90 | 3844 | 0 | 通過 |
| a07-prototypes-person | 6 | 9 | 25 | 1143 | 0 | 通過 |
| a08-prototype-chain-dowhile | 3 | 5 | 14 | 719 | 0 | 通過 |
| s01-math-3-finish | 3 | 5 | 49 | 1847 | 0 | 通過 |
| s02-conditionals-3-finish | 3 | 5 | 36 | 1343 | 0 | 通過 |
| s03-loops-2-finish | 3 | 5 | 28 | 1118 | 0 | 通過 |
| s04a-while-loop-cats | 3 | 5 | 23 | 971 | 0 | 通過 |
| s04b-do-while-loop-cats | 3 | 5 | 23 | 972 | 0 | 通過 |
| s04c-for-loop-cats | 3 | 5 | 23 | 972 | 0 | 通過 |
| s05-switch-example | 4 | 6 | 34 | 1303 | 0 | 通過 |
| s06a-exiting-loops-break | 4 | 6 | 39 | 1451 | 0 | 通過 |
| s06b-silly-story-finish | 8 | 12 | 64 | 2547 | 0 | 通過 |
| s07-gallery-finish | 7 | 10 | 73 | 2746 | 0 | 通過 |
| s08-number-guessing-game | 7 | 10 | 88 | 3166 | 0 | 通過 |
| s09 | 7 | 10 | 12 | 706 | 0 | 通過 |
| s10-allowance-updater | 7 | 11 | 53 | 2046 | 0 | 通過 |
| s11-calculating-squares | 5 | 7 | 33 | 1291 | 0 | 通過 |
| s12-conditionals-2-finish | 3 | 5 | 74 | 2617 | 0 | 通過 |
| s13-functions-1-finish | 5 | 8 | 19 | 936 | 0 | 通過 |
| s14-functions-3 | 5 | 8 | 19 | 936 | 0 | 通過 |
| s15-math-1-finish | 3 | 5 | 43 | 1604 | 0 | 通過 |
| s16-objects-2-finish | 3 | 5 | 17 | 803 | 0 | 通過 |
| s17-string-methods-3 | 3 | 5 | 18 | 835 | 0 | 通過 |
| s18-target-currenttarget | 4 | 6 | 25 | 1048 | 0 | 通過 |
| x01-bouncing-cycle | 14 | 20 | 151 | 5754 | 0 | 通過 |

欄位：模型數＝`*.graph.dot` 數；圖數＝`*.graph.dot`＋`*.hierarchy.dot` 數；最大邊數取自 `.dot`；最大字元數＝Mermaid 區塊（不含 fence）的字元數。

## 與 research R5 對照

- id 數：R5 32，實測 32（相符）
- 圖數（`*.graph.dot`＋`*.hierarchy.dot`）：R5 281，實測 281（相符）
- 降級數：R5 0，實測 0（相符）
- 最大邊數：R5 200，實測 200（相符）
- 最大邊數的圖：R5 a05-assessment-main inter-page/0.graph.dot，實測 a05-assessment-main inter-page/0.graph.dot（相符）
- 最大 Mermaid 區塊字元數：R5 7411，實測 7435（不符）

註：R5 的字元數取自研究階段的原型轉換器；實測值為定稿 `lib/dujs/mermaidgraph.js`（contracts/mermaid-graph.md §2）輸出的 JS 字串長度，兩者格式細節不同，字元數有差異屬預期（邊數、圖數與降級數取自 `.dot` 與 `.md`，不受影響）。差異遠低於上限 50000 字元，不改變「語料 0 張降級」的結論。
