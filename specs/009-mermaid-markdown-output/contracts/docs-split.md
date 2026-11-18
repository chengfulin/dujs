# Contract：repo README 更新與拆分（US3 文件部分、US4）

對應：FR-012（註明輸出變更）、FR-015、FR-017～FR-019、SC-007；research R9。
**§2 章節清單已由使用者確認（D003）**，另增 README 的 `## Background` 小節。

## 1. US3：Graphviz／PNG／HTML 報告的敘述改寫（先做，仍在單一 README）

| 原位置（`274257a` README） | 改為 |
|----------------------------|------|
| Requirements 的 Graphviz 項（L9） | 刪除；加一項「檢視輸出需支援 Mermaid 的 Markdown 檢視器（GitHub、VS Code 等）；`out-*/` 被 `.gitignore` 排除，不會出現在 GitHub 上，請在本機檢視器開啟」 |
| golden 段「referred to in the HTML report before the flat graph」（L37） | 改為「shown before the flat graph in the model Markdown `<k>.md`」；並寫明 golden 比對包含 `.md`、manifest `added` 收錄 `.md` 檔名（FR-009a、FR-015） |
| Usage「The `.png` files are drawn from the `.dot` files with Graphviz `dot`.」（L77-78） | 改為模型 Markdown `<n>.md`（標題、階層圖、扁平圖、def-use pairs）與輸出目錄根的 `README.md` 總覽；超過 500 邊或 50,000 字元的圖改以表格呈現並指向 `.dot` |
| 新增「輸出變更」註記（FR-012） | 一段：自本版起不再產生 `report.html` 與 `.png`、不需 Graphviz；改看 `README.md` 與 `<n>.md` |

## 2. US4：拆分（定案清單，D003）

| 檔案 | 標題 | 涵蓋的原 README 段落 |
|------|------|----------------------|
| `README.md` | `# dujs` | Goal、**Background**（D003 新增，見下）、Requirements、Dependency、Setup（僅指令區塊）、Usage（用法區塊＋一個範例＋連到 docs/usage.md）、Output（一兩句概述＋連到 docs/output-format.md）、Demo、SDD 導入宣告、License；另列 docs/ 各章節檔連結 |
| `docs/usage.md` | `# Usage` | CLI 完整說明（`-js` 分頁、`--`、`-h`）、輸出目錄命名與 `_<n>`、Exit status |
| `docs/output-format.md` | `# Output format` | 各輸出檔（`.dot`、`<n>.md`、總覽 `README.md`、降級表格、檢視方式）、`<n>.matching.json`、finallyExit 與 finally 邊、節點標籤、呼叫分段（feature 007） |
| `docs/limitations.md` | `# Supported syntax and limitations` | Supported syntax、Limits（HTML `<ul>/<li>` 改為 Markdown 清單，巢狀清單保留層級；`<code>` → 反引號；`&amp;` 等實體還原） |
| `docs/development.md` | `# Development` | golden 測試說明、`manifest.json`（`baseline`／`added`，含 `.md`）、`UPDATE_GOLDEN=1`、ESLint bulk suppressions |

**Background（D003 新增，使用者提供）**：README 頂部 Goal 之後加 `## Background` 小節，一兩句註明此 repo 緣起自作者的論文，並 MUST 逐字含下列三項字串（不得改寫、翻譯或增減空白）：

| 項目 | 逐字字串 |
|------|----------|
| 論文中文標題 | `JavaScript網頁應用程式資料流測試模型之研究` |
| 論文英文標題 | `A Study on Dataflow Testing Model of JavaScript Web Applications` |
| 臺北科技大學博碩士論文系統網址 | `https://hdl.handle.net/11296/u8f5n6` |

此節不對應原 README 任何段落，readme-map 中以一列「新增（使用者 D003）」記錄。

`docs/known-issues.md` 不動；README 原有的 known-issues 連結移到 `docs/limitations.md`（相對路徑 `known-issues.md`），README 亦保留一個連結。

## 3. 「內容不遺失」對照表與檢查（FR-018）

- `specs/009-mermaid-markdown-output/readme-map.md`：表格欄 `ID | 原段落（首句摘錄） | 新位置（檔案 + 標題） | 處置 | 理由`；處置為 `搬移`、`改寫` 或 `新增`；`改寫` 必填理由（如「Graphviz／PNG 移除（FR-013）」「HTML 清單改 Markdown（US4 情境 2）」）；`新增` 為原 README 沒有的內容（本 feature 僅 `## Background`，理由欄填「新增（使用者 D003）」，「原段落」欄記載 §2 的三項逐字字串），ID 不佔原段序號（如 `N1`）。原 README 的「段」＝以空行分隔的區塊，`<ul>` 中每個 `<li>`（含巢狀）各算一段。
- `specs/009-mermaid-markdown-output/tools/readmecheck.js`（不進 `npm test`）：
  1. `git show 274257a:README.md` 切段（同上定義）；每段須在對照表恰有一列（以 ID 對應，ID＝段序號）。
  2. `搬移` 段：正規化（去 Markdown／HTML 標記、實體還原、合併空白）後的文字 MUST 為新位置檔案中該標題下正規化文字的子字串。
  3. `改寫` 段：理由欄非空；新位置的標題存在。
  4. `新增` 列：只檢查新位置檔案的該標題下存在該列記載的文字／連結（Background 為 §2 的中文標題、英文標題、網址三項逐字字串）；不參與原 README 的逐段對應。
  5. 結束狀態：0 全部通過；1 有段落未對應／未找到；2 用法錯誤。輸出逐段結果。
- SC-007：`readmecheck.js` exit 0。

## 4. 標題與連結（FR-019，併入 `npm test`，D004-3）

`tests/docs/links.js`（mocha；`package.json` 的 `test` 加入 `tests/docs/*.js`）掃描**根 `README.md` 與 `docs/*.md`**（不遞迴：不含 `docs/research/**`、`tests/golden/expected*/README.md`）：
- 每個 ATX 標題符合 `^#{1,6} \S`（fenced code 內不檢查）；**`docs/known-issues.md` 不做標題檢查**（其 L427 是以 `#7); …` 開頭的折行段落，會被誤判；不改該檔），連結檢查仍做；
- 每個相對連結 `](path[#anchor])` 指向存在的檔案；有 `#anchor` 時目標檔有對應 GitHub slug 的標題；
- 不檢查外部 `http(s)` 連結（不連網）；
- **D003 Background 斷言**：根 `README.md` 的 `## Background` 標題存在，且該節逐字含 `JavaScript網頁應用程式資料流測試模型之研究`、`A Study on Dataflow Testing Model of JavaScript Web Applications`、`https://hdl.handle.net/11296/u8f5n6` 三項字串（字串比對，非連網檢查）。
