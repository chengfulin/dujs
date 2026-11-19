# Quickstart：驗證 009（Markdown + Mermaid 輸出）

前置：Node ≥ 24；`npm install`（含 devDependency `mermaid`、`jsdom`）。不需要 Graphviz。

## 1. 自動測試

```
npm test        # 單元＋golden（含 .md 逐字比對、Mermaid parse、Mermaid↔.dot 比對、降級邊界、確定性、無 Graphviz 執行）＋ tests/docs/links.js（US4 後）
npm run lint
```

預期：全數通過；golden 的 `.dot`／`.matching.json` baseline 雜湊 0 差異（SC-001）。

## 2. 手動跑一次（US1、US2、US3）

```
TRY=/private/tmp/claude-501/-Users-chengfulin-Documents-Personal-dujs/19297300-02ef-456d-8f0f-7f2fc2735e78/scratchpad/dujs-try   # session scratchpad，不用 /tmp/dujs-try
mkdir -p "$TRY" && cd "$TRY"
env PATH=/usr/bin:/bin "$(command -v node)" <repo>/bin/dujs.js -js <repo>/tests/golden/fixtures/page0/app.js -js <repo>/tests/golden/fixtures/page1/report.js
echo $?                                   # 0，stderr 為空
ls out-*/                                 # README.md、page0/、page1/、inter-page/；沒有 report.html
find out-* -name '*.png' | wc -l          # 0
ls out-*/page0/inter-procedurals/         # <n>.graph.dot、<n>.dupairs.dot、<n>.hierarchy.dot、<n>.matching.json、<n>.md
```

`node` 在 fnm 目錄（不在 `/usr/bin:/bin`），故先以 `"$(command -v node)"` 取得絕對路徑，再以 `env PATH=/usr/bin:/bin` 去除 Graphviz（D005-N2）；跑完 `rm -rf "$TRY"`。

在 VS Code（Markdown Preview 的 Mermaid 支援）或其他支援 Mermaid 的檢視器開 `out-*/README.md`：依頁 → Source code → Intra-procedural → Inter-procedural → Intra-page，最後 Inter-page；點連結進 `<n>.md`，看到階層圖（上層模型）→ 扁平圖 → def-use pairs 表格（contracts/overview-readme.md、model-markdown.md）。

## 3. MDN 驗收（FR-016）

```
node specs/009-mermaid-markdown-output/tools/mdncheck.js --report    # 產生 specs/009-mermaid-markdown-output/mdn-check.md
node specs/009-mermaid-markdown-output/tools/mdncheck.js --verify specs/009-mermaid-markdown-output/mdn-check.md
```

預期：32 個 id 全部 exit 0、0 個 `.png`、每張圖 parse 通過、0 張超限（research R5：最大 200 邊）、Mermaid↔`.dot` 0 差異、`.dot`／`.matching.json` 與 `274257a` byte-identical。

## 4. README 拆分（US4，D003 定案清單）

```
node specs/009-mermaid-markdown-output/tools/readmecheck.js specs/009-mermaid-markdown-output/readme-map.md   # exit 0（SC-007）
npx mocha tests/docs/links.js                                                                                 # 標題格式與相對連結（已併入 npm test）
```

預期：README 頂部 Goal 之後有 `## Background`，逐字含論文中文標題 `JavaScript網頁應用程式資料流測試模型之研究`、英文標題 `A Study on Dataflow Testing Model of JavaScript Web Applications` 與連結 `https://hdl.handle.net/11296/u8f5n6`（readme-map 中為「新增（使用者 D003）」列；`tests/docs/links.js` 斷言）。
