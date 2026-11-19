# Research：以 Markdown + Mermaid 取代 Graphviz 圖檔輸出（009）

基準：`develop` `274257a`（本 branch 開工點）。量測日期 2026-11-18，Node v24.10.0、npm 11.17.0。
量測用的暫存腳本與輸出放在 session scratchpad，不進 repo；結論以下列數字為準。

## R1 Mermaid 轉換的來源：解析 dujs 自己產生的 DOT 文字（記憶體中），不重走模型

- **Decision**：扁平圖與階層圖的 Mermaid 由「同一次寫出 `.dot` 時產生的 DOT 字串」轉出：新模組 `lib/dujs/dotreader.js`（MIT，原創）只接受 dujs 產生的 DOT 方言（逐行：`digraph X {`、`node [shape="box"]`、`label = "…"`、`<id> [attrs]`、`<id> -> <id> [attrs]`、`}`），其他行一律拋錯；`lib/dujs/mermaidgraph.js` 把讀出的圖轉成 Mermaid。def-use pairs 表格由 `model.dupairs` 直接產生（與 `graphics.js` `convertDUPairsToDot` 相同的變數名與 pair 文字：變數名以 `String(key)` 取得（`lib/dujs/var.js:101` `toString` 回傳同名，結果等於 `key.name`；避開 `tests/dujs/scopesource.js` 的 S5 靜態檢查，D004-1b），pair 為 `'' + pair`）。
- **Rationale**：
  1. **一一對應由構造保證**：`.dot` 的節點順序、`n<k>` 編號、邊的列舉順序（`FlowNode.CONNECTION_TYPES` 迴圈）、重複邊，都由 LGPL 的 `lib/esgraph/dot.js` 決定。從 DOT 文字轉出，Mermaid 的節點／邊多重集合必然與 `.dot` 相同（SC-003），`.dot` 也完全不用動（FR-008）。
  2. **授權邊界**：重走模型等於重寫 `dot.js` 的節點／邊列舉邏輯（衍生作品風險，D001 judge 注意事項）；讀取 `dot.js` 的**輸出資料**不衍生其程式碼。新檔放 `lib/dujs/`，檔頭標「Original dujs code, MIT License」，不 require `lib/esgraph/dot.js`。
  3. 不需重讀檔案：`outputwriter` 先算出 DOT 字串，寫 `.dot`，再把同一字串交給 Markdown 產生器。
- **標籤還原**：DOT 方言的引號字串以 `\"`→`"`、`\\`→`\` 解碼，等於 `hierarchydot.js` `escapeLabel` 的反函數；`dot.js` 對已設定的 `node.label` 不跳脫，但扁平圖標籤由 `cfggraphconverter.labelWithLineNumber` 產生，只含數字、`a-z`、`:`、`T`/`F`、`(`、`)`、空白、`_` 與節點型別名，不含 `"`／`\`，故解碼結果等於模型原標籤（FR-003）。此不變量由 `dotreader` 的單元測試（含引號／反斜線的階層標籤往返）與 golden 的 Mermaid↔`.dot` 比對共同守住。
- **Alternatives considered**：(a) 由模型重算（`cfgGraphConverter.dotNodeIds`＋重寫邊列舉）——授權風險且重複邏輯，順序一旦與 `dot.js` 分歧即違反 SC-003；(b) 改 `dot.js` 讓它同時輸出 Mermaid——改 LGPL 檔且新程式落入 LGPL 範圍，違背「轉換器放 MIT 範圍」；(c) 寫完 `.dot` 再從磁碟讀回——多一次 I/O，無好處。

## R2 標題的單一來源

- **Decision**：在 `hierarchydot.js`（MIT）抽出 `hierarchyTitleOf(model)`（`inter-procedural: <main>`／`intra-page: <main>`／`inter-page`），`convertHierarchyToDot` 改用它（輸出 byte 不變）；intra-procedural 標題 `intra-procedural: ` + `String(model.mainlyRelatedScope)`。模型 Markdown 的標題與總覽連結文字共用同一函式 `modelTitleOf(model, level)`（`markdownoutput.js`）。
- **Rationale**：FR-001 要求上層模型標題與 `hierarchy.dot` `label`「完全相同」；共用函式比解析 DOT label 更直接，且 golden `.dot` byte-identical 檢查會抓到任何重構失誤。
- **Alternatives**：從 DOT 字串的 `label = "…"` 取——可行但總覽產生時沒有 DOT 字串，需另存狀態。

## R3 Mermaid 驗證環境（devDependency）

- **Decision**：devDependencies 新增 `"mermaid": "12.3.0"`（精確釘選）與 `"jsdom": "^29.1.1"`；測試以 helper `tests/helpers/mermaid.js`：先設 `global.window`／`global.document`（jsdom），再 `await import('mermaid')`，`mermaid.initialize({startOnLoad: false})`；`after` 時還原全域。
- **實測（2026-11-18）**：
  - 乾淨目錄 `npm install --save-dev --save-exact mermaid@12.3.0 jsdom` → 解析為 `jsdom@29.1.1`；**155 個套件、`node_modules` 225 MB**（mermaid 122 MB、jsdom 8.3 MB）；`npm audit`：0 vulnerabilities。
  - 對 repo 的 `package-lock.json` 做 `npm install --package-lock-only`：lock 的 `packages` 項目 179 → 332（+153，其餘與既有 devDependency 共用），檔案 2258 → 4041 行（+1783 行）；`npm audit` 0 vulnerabilities。
  - 版本：`mermaid@12.3.0` 於 2026-11-03 發佈（engines `node >=22.12.0`，`type: module`，MIT）；`jsdom@29.1.1` engines `^20.19.0 || ^22.13.0 || >=24.0.0`。
  - 間接相依授權：`dompurify`（MPL-2.0 OR Apache-2.0）、`elkjs`（EPL-2.0 OR GPL-3.0-or-later）——僅 devDependency、不隨 dujs 散佈（npm 套件不含 devDependencies），`THIRD_PARTY_NOTICES.md` 不需變更。
  - `mermaid.parse`：可解析 flowchart、拒絕錯誤語法（`a -->`）；套用 `maxEdges`（500 過、501 拒：`Edge limit exceeded`）；**不**檢查 `maxTextSize`（94,902 字元仍通過）。
- **Rationale**：mermaid 是 FR-009 的判定 oracle，版本變動可能改變可解析性與上限，故精確釘選；jsdom 只提供 DOM，用 caret 符合 repo 慣例（lock 仍固定實際版本）。
- **Alternatives**：`@mermaid-js/parser`（只涵蓋部分圖種，不含 flowchart）；`mermaid-cli`（需 Puppeteer＋Chromium，更大且需瀏覽器）；自寫 Mermaid 語法檢查（不是「官方 parser」，違反 FR-009）。

## R4 Mermaid 語法探針（決定 contracts/mermaid-graph.md 的規則）

以暫存原型轉換器實測 `mermaid@12.3.0`：

| 探針 | 結果 | 對契約的影響 |
|------|------|--------------|
| 標籤含 `"#<>\`&[]{}()\|;$%%` 與換行，以 `#<十進位碼>;` 實體＋`<br/>` 輸出、整段雙引號 | 可解析 | FR-006 規則可行；另把 `&` 也實體化（避免 `&lt;` 之類被 HTML 標籤解碼） |
| （D004-1a 補）mermaid `encodeEntities` 先跑 `/style.*:\S*#.*;/`、`/classDef.*:\S*#.*;/`；標籤內 `%%{…}%%`；`\r`；`$$…$$` | 前兩者會砍掉最後一個 `;`（任何實體都會觸發，例 `style:#x`→顯示 `style:#35x`、`a.style:#b;c` 掉 `;`）；`%%{…}%%` 被當 directive 而 parse 失敗；`\r` 被正規化成 `\n`；`/\$\$(.*?)\$\$/` 觸發 KaTeX | `:`→`#58;`、`%`→`#37;`、`\r`→`#13;` 一律實體化；相鄰 `$$` 以 `#36;` 打斷（單一 `$` 不動）；寫入 contracts/mermaid-graph.md §2.3 |
| `getDiagramFromText(...).db.getVertices()` 回傳的文字 | 實體以佔位符出現：數字實體 `ﬂ°°<碼>¶ß`、具名實體 `ﬂ°<名>¶ß`；`<br/>` 回傳為 `<br>` | 往返測試須把 `ﬂ°°(\d+)¶ß`→字元、`<br>`→`\n` 後比對 |
| 空標籤 `[""]`、`((""))`、`-->\|""\|` | **解析失敗** | 空標籤輸出 `" "`（`getVertices` 回傳 `""`，往返相同）；dujs 現有輸出無空標籤，屬防禦規則 |
| 前後空白 | Mermaid 會 trim | 標籤首尾的空白字元以實體輸出（防禦規則；現有輸出無此情形） |
| `([..])` stadium、`(((..)))` double circle、`==>`、`-.->`、`linkStyle i,j stroke:…`、`classDef`／`class a,b c` | 可解析；`getEdges()` 保留同對節點的多條邊（含無標籤重複邊） | FR-004 對應表可行 |
| id `n<k>`／`h<k>` | 無保留字衝突（`end` 等不會出現） | 節點 id 直接沿用 |

## R5 MDN 語料與 golden 的圖大小（FR-010 閾值的餘裕；spec 數字查明）

以 `274257a` 對 `specs/006-eslint-scope/mdn/corpus`（`pages.json`，32 id）實跑（`PATH=/usr/bin:/bin`，無 Graphviz）：32 個 id 全部 exit 0、stderr 空、0 個 `.png`；共 281 張圖（`*.graph.dot`＋`*.hierarchy.dot`），以原型轉換器（格式同 contracts/mermaid-graph.md）轉出後 **281/281 通過 `mermaid.parse`**；golden 4 個 fixture 86 張圖亦 86/86 通過。

| 圖 | 邊數 | `.dot` bytes | Mermaid 區塊字元數（原型） |
|----|-----:|-------------:|---------------------------:|
| a05-assessment-main `inter-page/0.graph.dot`（最大） | 200 | 11,580 | 7,411 |
| a05-assessment-main `page0/intra-pages/0.graph.dot` | 199 | 11,279 | 7,100 |
| a05-assessment-main `page0/inter-procedurals/2.graph.dot` | 178 | 10,208 | 6,363 |
| x01-bouncing-cycle `inter-page/0.graph.dot` | 151 | 9,172 | 5,730 |
| golden 最大：`expected/page0/intra-pages/0.graph.dot` | 137 | 7,923 | 4,889 |

**spec 數字的出處**：spec「151 條邊、約 9 KB」是 `specs/008-property-defs-method-calls/mdn/baseline-develop/`（`2035c93`，008 開工前）的 x01；「114 邊／6 KB」是 `specs/006-eslint-scope/mdn/baseline-develop/`（007 呼叫分段前）的 x01。008 連上 `o.m()` 之後 a05 成為最大圖（200 邊）。三者皆遠低於 500 邊／50,000 字元，**語料中預期 0 張降級**；降級只由合成圖測試覆蓋（FR-010）。（spec 現況節已更新為 200 邊／11,580 bytes／7,411 字元。）

效能：281 張圖的 parse 約 2 秒（含 import mermaid 約 1 秒），可放進 `npm test`。

## R6 Markdown 表格與標題的跳脫

- **Decision**：表格儲存格的每段文字以 **code span** 呈現（反引號長度取內容最長反引號連續數 +1，首尾為反引號或空白時兩側補一個空白），段與段以 `<br/>` 連接；儲存格內所有 `|` 寫成 `\|`（GFM 在表格中先處理 `\|`，code span 內亦適用）；文字中的換行拆成多段。標題與總覽連結文字同樣用 code span。
- **Rationale**：code span 內不觸發強調（`__proto__`）、HTML、GitHub 數學式——`$DOMAIN.$PAGE_0` 若是純文字會被 GitHub 當成 `$…$` 數學式；原文幾乎不變、diff 可讀；渲染後文字與 `.dot` 相同（FR-005「pair 文字與 `.dupairs.dot` 相同」、FR-006）。
- **Alternatives**：逐字元反斜線跳脫所有 ASCII 標點——可行但 `\(entry\_b,\(8,9\)\)` 難讀；HTML 實體——GitHub 對 `$` 無效。

## R7 總覽的資料來源（無共享狀態）

- **Decision**：`outputWriter.writeOverview(sourceContents)` 依 `scopeCtrl.pageScopeTrees` × `modelCtrl.getPageModels(...)` 的 `intraProceduralModels`／`interProceduralModels`／`intraPageModels` 與 `modelCtrl.interPageModel` 列舉，與寫模型檔的迴圈同序同編號；原始碼由 CLI 傳入的 `sourceContents` 取得，不讀 `src.js`、不用 prototype 上的共享陣列。
- **Rationale**：現有 11 個 `*ImageFilePaths`（實測 11 個，含拼錯的 `intraPageDUPairsmageFilePaths`；原記 12 個有誤） 與 `pageJSSourFilePaths` 定義在 prototype 上、跨次執行共享（測試需手動覆寫）；改為從模型列舉可去掉這類狀態，且編號與檔名必然一致（SC-005）。
- **連帶**：`pageJSSourFilePaths` 只供 `reportgenerator` 使用，隨 FR-012 一併移除（spec A7 已列）；`eslint-suppressions.json` 的 `lib/dujs/reportgenerator.js` 項目隨檔案刪除而移除（`npx eslint . --prune-suppressions`）。

## R8 MDN 驗收工具（FR-016）

- **Decision**：`specs/009-mermaid-markdown-output/tools/mdncheck.js`（不屬 dujs、不進 `npm test`，同 008 tools 慣例）：對 `pages.json` 每個 id 以 `PATH` 去除 Graphviz 的環境跑 `bin/dujs.js`，並以 `git worktree` 於 `274257a` 跑一次作基準（worktree 內 symlink repo 的 `node_modules`，收尾 `git worktree remove --force`；D005-A5）；檢查 exit 0、stderr 空、無 `.png`、每個 `.graph.dot` 有同編號 `.md`、`README.md` 連結全部可達、每個 Mermaid 區塊 parse 通過、邊數 ≤ 500 且字元數 ≤ 50,000（否則必須為降級表格）、Mermaid↔`.dot` 多重集合相同、所有 `.dot`／`.matching.json` 與基準 byte-identical；輸出 `mdn-check.md`（每 id 一列：模型數、圖數、最大邊數、最大字元數、降級數、結果）。`--verify mdn-check.md` 重跑並核對。
- **Rationale**：沿用 008 的「工具＋紀錄檔＋verify」作法；`.dot` byte-identical 用 worktree 現跑基準，不需在 repo 存新快照。
- **Alternatives**：把 MDN 放進 `npm test`——33 檔分析＋基準 worktree 太慢且依賴 git。

## R9 README 拆分（US4，D002；章節清單 D003 已確認）

- **Decision**：定案清單（D003 使用者確認）：README 保留 Goal／Background（D003 新增：一兩句說明 repo 緣起自作者論文，逐字含中文標題「JavaScript網頁應用程式資料流測試模型之研究」、英文標題「A Study on Dataflow Testing Model of JavaScript Web Applications」與 https://hdl.handle.net/11296/u8f5n6 ）／Requirements／Dependency／Setup（僅指令）／Usage（最小用法）／Output（概述）／Demo／SDD 導入宣告／License；拆出 `docs/usage.md`、`docs/output-format.md`、`docs/limitations.md`、`docs/development.md`（內容見 contracts/docs-split.md）。
- **「內容不遺失」檢查**：`specs/009-mermaid-markdown-output/readme-map.md`（對照表：原 README 每段的 ID、首句摘錄、新位置檔案＋標題、處置「搬移／改寫（理由）／新增（使用者 D003）」）＋ `tools/readmecheck.js`：以 `git show 274257a:README.md` 取原文、依空行切段，逐段確認在對照表有一列，「搬移」段的正規化文字（去 Markdown 標記、HTML 清單轉文字、合併空白）出現在指定檔案的指定標題下，「改寫」段須有理由欄，「新增」列只檢查新位置存在該文字／連結；FR-019（標題 `^#{1,6} ` 格式、相對連結與 `#anchor` 可達）由 `tests/docs/links.js` 檢查（標題檢查排除 `docs/known-issues.md`，連結仍檢查；D004-3）。
- **Rationale**：可重複執行、可在 PR 中重跑；對照表是人可讀的證據（FR-018），腳本守住機械部分。
- **Alternatives**：放進 `npm test`——原 README 取自 git 歷史，測試不宜依賴 git；連結／標題檢查（不依 git）則做成 mocha 測試 `tests/docs/links.js` 併入 `npm test`（D004-3 採用）。
