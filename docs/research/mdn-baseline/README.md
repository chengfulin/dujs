# MDN 教學範例作為 dujs 驗證基準

以 MDN Learn web development 的教學範例作為 dujs 的驗證語料（日後 JS 標準更新時可擴充對應範例），2026-11-16 研究與首次驗證的紀錄。

| 檔案 | 內容 |
|------|------|
| [research.md](research.md) | 三個 MDN 模組（Core／Dynamic scripting、Client-side web APIs、Advanced JavaScript objects）的範例清單、授權（CC0）、語言功能與 API、對照 dujs 能力的分類、第一批基準建議與風險。分類是靜態判斷，不是 dujs 的實跑結果 |
| [validation-004.md](validation-004.md) | feature `004-fix-remaining-issues` 完成後以 33 個範例實跑 dujs，對照 develop 與人工推導的結果；新發現記為 known-issues §23、§24 |
| [tools/](tools/) | 抽取範例與特徵偵測的腳本（`extract.js`、`feat.js`、`gen.js`、`lafeat.js`）與驗證腳本（`extract-sample.js`、`run-pairs.js`）。輔助工具，不屬 dujs 本體，不納入 lint |

範例來源釘選於 `mdn/content@74f6e26e70721281aeb500ba4f8c1f06f20b0100` 與 `mdn/learning-area@21973263ba859ff3477919087b488157f9d618a6`。

驗證後對研究報告的更正（見 validation-004.md）：第一批 #9 `first.js`＋`second.js` 是 MDN 刻意示範的錯誤（兩檔都宣告 `const name`，同頁串接會解析失敗），應歸為「目前無法分析」或改以兩頁分析；#6 silly-story 沒有 §20 的樣式；#13 bouncing balls 在 004 下結果不變。
