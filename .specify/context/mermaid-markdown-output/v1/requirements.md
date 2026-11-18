# 需求規劃：以 Markdown + Mermaid 取代 Graphviz 圖檔輸出

- 狀態：**規劃中（未開工）**。排在 007（KI §16 + §22(3) 運算式中的呼叫）與
  008（KI §22(1)(5)、§23）實作完成之後，作為當時最新的 feature
  （編號以開工時 speckit 自動編號為準，預期 009）。
- 提出：使用者，2026-11-18。取代 2026-11-17 備忘中「`.mmd` 放在 `.dot` 旁、HTML
  報告用 mermaid.js 繪製」的較早構想。
- 技術選型：沿用 repo 現有（Node ≥ 24、CommonJS、mocha + should、eslint、c8、npm）。

## §1 目的

目前每個模型的圖由 `lib/dujs/outputwriter.js` `writeImageFileFromDotFile` 以
`spawnSync('dot', …)` 呼叫系統上的 Graphviz 轉成 `.png`，HTML 報告
（`lib/dujs/reportgenerator.js`）以 `<img>` 顯示。問題：

1. Graphviz 是 npm 以外的系統相依（README「Requirements」標為 optional），
   沒裝時 `spawnSync` 靜默失敗，報告出現破圖。
2. PNG 無法 diff、無法在 GitHub／編輯器內直接閱讀或複製節點文字。

改為：**以 npm 工具鏈（dujs 自身程式碼，必要時加 npm 套件）產出 Markdown 檔，
圖以 Mermaid 語法表示**，在 GitHub、VS Code 等可直接顯示，安裝 dujs 不再需要 Graphviz。

## §2 範圍（初稿，開 feature 時於 specify/clarify 定案）

- S1 每個模型輸出一份 Markdown（暫名 `<n>.md` 或 `<n>.graph.md`），內含
  ` ```mermaid ` 區塊：扁平敘述層級圖（對應 `<n>.graph.dot`）、def-use pairs
  （對應 `<n>.dupairs.dot`）、階層圖（對應 `<n>.hierarchy.dot`，僅
  inter-procedural／intra-page／inter-page）。
- S2 Mermaid 圖的節點名稱與 `.dot` 相同（`n<k>`），標籤沿用 `.dot` 的行號與
  `<line>:<path>` 規則；邊的標籤（`true`／`false`／`exception`／`finally`／
  CALL／RETURN…）一一對應，使 `matching.json` 仍可對照。
- S3 一份總覽 Markdown（每頁一份或整次執行一份）串起所有模型檔，取代或並存於
  HTML 報告（見 §4 Q2）。
- S4 移除 Graphviz 呼叫與 `.png` 產出；README 的 Requirements／Usage 同步更新。
- S5 測試：Mermaid 輸出納入 golden（新增檔案加入 `tests/golden/manifest.json`，
  既有 `.dot` 必須 byte-identical），並以 Mermaid 官方 parser 驗證語法可解析
  （例如 devDependency `mermaid` 的 `parse`，或 `@mermaid-js/mermaid-cli` 抽樣
  轉檔；以不需瀏覽器者優先）。

## §3 非目標

- 不改變任何分析結果（def-use pairs、圖結構）；本 feature 純輸出層。
- 不重新設計節點／邊的語意或標籤規則。

## §4 待決問題（開 feature 時於 clarify 定案）

- Q1 `.dot` 是否保留？建議：**保留**（golden 以 `.dot` 雜湊為基準，且超大圖
  Mermaid 有 `maxTextSize`／`maxEdges` 上限）；只移除 PNG 與 Graphviz 相依。
- Q2 HTML 報告去留：(a) 改用 mermaid.js 在瀏覽器渲染同一份 Mermaid 文字；
  (b) 以 Markdown 總覽取代 HTML 報告；(c) 兩者並存。
- Q3 超過 Mermaid 上限的大圖：分割、降級為只列節點／邊表格，或只提示改看 `.dot`。
- Q4 是否需要預先渲染 SVG（`@mermaid-js/mermaid-cli` 需 puppeteer/Chromium，
  安裝成本高）——傾向不做，交由 Markdown 檢視器渲染。
- Q5 Mermaid 語法特殊字元（`"`、`[`、`{`、`|`、`#`、`<`）的跳脫規則與
  `.dot` 標籤的對應。
- Q6 圖方向（`flowchart TD`）與子圖（hierarchy 的 cluster → `subgraph`）的對應。

## §5 驗收觀點（初稿）

- 未安裝 Graphviz 的環境，`npm install` 後執行 dujs 不出現錯誤或破圖，產出的
  Markdown 在 GitHub 預覽可看到每張圖。
- golden 測試：既有 `.dot` 不變；新增的 Markdown 檔雜湊入 manifest；Mermaid 語法
  全部可由官方 parser 解析。
- MDN 範例語料（`docs/research/mdn-baseline`）全數可產出可解析的 Markdown，超過上限的
  圖依 Q3 的決定處理且有測試。
