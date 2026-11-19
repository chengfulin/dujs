# Contract：CLI（FR-009、FR-010、US5、SC-004、SC-005）

**Feature**: `004-fix-remaining-issues` | 檔案：`bin/dujs.js`（只呼叫 `lib/dujs/cli.js` 並設定 `process.exitCode`）、`lib/dujs/cli.js`（新，MIT）、
`lib/dujs/outputwriter.js`、`lib/dujs/reportgenerator.js`；`lib/dujs/inputreader.js` 由 `cli.js` 的解析取代後刪除（無其他使用者）。

## 1. 文法

```
dujs -js <file>... [-js <file>...]...
dujs -h | --help
```

解析：`--` 之前完全等於 `-js` 的參數先對映為 `--js`，再以 `util.parseArgs({args, options: {js: {type: 'boolean', multiple: true},
help: {type: 'boolean', short: 'h'}}, strict: true, allowPositionals: true, tokens: true})`；依 tokens 順序：`js` 開新頁、positional 加入目前頁、
`help` 設旗標、`option-terminator`（`--`）之後的 positional 一律是目前頁的檔案（可用來傳名為 `-js` 的檔案）。

**help 優先的實作**：`parseArgs({strict: true})` 遇到未知選項會直接拋 `ERR_PARSE_ARGS_UNKNOWN_OPTION`（例如 `['-x', '--help']`），來不及看到
`--help`。因此 `cli.js` 在呼叫 `parseArgs` **之前**先掃描 `--` 之前的參數，有完全等於 `-h` 或 `--help` 者即走 #1（或等價地：攔下 `parseArgs` 的錯誤後
再檢查 `--` 之前有無 `-h`／`--help`，有則走 #1）。`-hj` 這類短選項群組不算 help（仍是 #3）。

| # | 參數情形 | 結果 | stdout | stderr | exit | 建目錄 | 讀檔 |
|---|----------|------|--------|--------|------|--------|------|
| 1 | 任一處（`--` 之前）出現 `-h` 或 `--help`，不論其他參數是否有效 | 印 usage | usage | — | 0 | 否 | 否 |
| 2 | 無參數 | 錯誤 `no page: give the files of each page after -js` | — | 訊息＋usage | 2 | 否 | 否 |
| 3 | 未知選項（`-x`、`--out`、`-hj` 之類的短選項群組、`--js=a.js`） | 錯誤（parseArgs 訊息，前綴 `dujs: `） | — | 訊息＋usage | 2 | 否 | 否 |
| 4 | 第一個 `-js` 之前有檔案（`a.js -js b.js`） | 錯誤 `a.js is not after -js` | — | 訊息＋usage | 2 | 否 | 否 |
| 5 | `-js` 後沒有檔案（結尾的 `-js`、`-js -js`、`-js --`） | 錯誤 `-js without files (page <k>)` | — | 訊息＋usage | 2 | 否 | 否 |
| 6 | 任一頁的任一檔案不存在或無法讀取 | 錯誤 `cannot read <file>: <原因>`，先讀完前面的檔案、遇錯即停 | — | 訊息 | 1 | 否 | 部分 |
| 7 | 分析或寫出時拋出例外（任一頁） | 刪除本次輸出目錄，錯誤 `analysis failed: <message>` | — | 訊息 | 1 | 建後刪除 | 是 |
| 8 | 正常 | 輸出同修正前（目錄名稱規則除外） | — | — | 0 | 是 | 是 |

- usage 文字（`--help` 與錯誤共用）：

```
Usage: dujs -js <file>... [-js <file>...]...
       dujs -h | --help

Analyze the def-use pairs of client-side JavaScript pages.
Each -js starts a page; the files after it, up to the next -js, are combined
into that page. The outputs are written to a new directory
out-<date>-<time>[_<n>] in the current directory.

Options:
  -js <file>...  files of one page (repeat for more pages)
  -h, --help     print this help and exit

Example:
  dujs -js lib.js app.js -js report.js
```

- 錯誤訊息一律以 `dujs: ` 開頭、單行；用法錯誤（#2–#5）其後空一行接 usage。不再輸出舊格式 `*** ERROR: ... ***`。

## 2. 執行流程（`cli.run(argv, io)`，回傳 exit status）

1. 解析（§1）；help → #1；用法錯誤 → #2–#5。
2. 依頁面順序讀完所有檔案（`sourceReader.getSourceFromFiles`，內容格式不變）；失敗 → #6。
3. `outputWriter.createRootOutputDirectory()`（§3），之後才建各頁目錄、寫 `src.js`。
4. 既有的四階段分析與寫出、`reportGenerator.createReport()`，順序不變。

   > Superseded by specs/009-mermaid-markdown-output：`reportGenerator.createReport()` 與 `report.html` 已移除，改寫總覽 `README.md`（`outputWriter.writeOverview`，contracts/overview-readme.md）；四階段分析與寫出的順序仍有效。

5. 3–4 任一步拋例外 → `fs.rmSync(本次目錄, {recursive: true, force: true})` → #7。
6. 回傳 0。`io` 預設 `{stdout: process.stdout, stderr: process.stderr, cwd: process.cwd()}`，供測試注入。

## 3. 輸出目錄唯一化

- 基本名稱沿用 `out-<YYYY>-<MM>-<DD>-<H>-<M>-<S>`（現行格式，執行開始時計算）。
- `fs.mkdirSync(名稱)`（非 recursive）；`EEXIST` 時依序試 `名稱_1`、`名稱_2`……直到成功（其他錯誤 → #7 但無目錄可刪）。不覆寫、不重用既有目錄。
- `OutputWriter.prototype.ROOT_OUTPUT_DIR` 改為 getter，回傳本次建立的名稱；建立前讀取拋錯（防止在建立前寫檔）。`reportgenerator` 的
  `report.html` 與 `<img src="../<目錄>/...">` 都改用實際名稱。

  > Superseded by specs/009-mermaid-markdown-output：`reportgenerator`／`report.html`（與其 `<img>`）已移除，總覽 `README.md` 只用相對連結、不含目錄名稱；輸出目錄唯一化本身（本節其餘內容）仍有效。

## 4. 驗收情境（US5、SC-004、SC-005；`tests/dujs/cli.js`，以 `spawnSync`／`spawn` 執行 `bin/dujs.js`，cwd 為暫存目錄）

| # | 命令 | 斷言 |
|---|------|------|
| US5-1 | `dujs --help`、`dujs -h`、`dujs -js a.js --help`、`dujs -x --help`（未知選項在 help 之前） | exit 0；stdout 含 `Usage: dujs -js`；stderr 空；cwd 中沒有 `out-*` |
| US5-2 | `dujs`、`dujs a.js`、`dujs -js`、`dujs -js -js a.js`、`dujs -x -js a.js` | exit 2；stderr 第一行以 `dujs: ` 開頭且含 usage；stdout 空；沒有 `out-*` |
| US5-3 | `dujs -js ok.js -js missing.js`；`dujs -js bad.js`（`bad.js` 內容為語法錯誤 `var a = ;`） | exit 1；missing：stderr 含 `cannot read missing.js`、未建 `out-*`；bad：stderr 含 `dujs: analysis failed:`、執行後 cwd 沒有 `out-*`（建後刪除） |
| US5-4／SC-005 | 同一 cwd 以 `spawn` 同時啟動兩次 `dujs -js ok.js`，重複 10 次 | 每次兩者 exit 0；`out-*` 目錄數＝2×次數（每次各新增 2 個不同目錄）；每個目錄的檔案清單相同且 `report.html` 引用自己的目錄名稱 |
| US5-5 | `dujs -js ok.js` | exit 0；stderr 空；輸出 .dot 與修正前相同（golden 三個 case 照跑即涵蓋） |

> US5-4 superseded by specs/009-mermaid-markdown-output：`report.html` 已移除，「`report.html` 引用自己的目錄名稱」改為每個目錄有總覽 `README.md` 且其內容不含目錄名稱、各目錄的總覽彼此相同；輸出目錄唯一化本身（各次執行得到不同目錄）仍有效。

`bad.js`（SC-004「分析錯誤」）：語法錯誤檔 `var a = ;`。讀檔階段只讀文字，解析在建目錄之後的分析階段才拋錯（修正前的 CLI 實跑：建了
`out-*`、印 `*** ERROR:  Unexpected token ;  ***`、exit 0），因此走 §1 #7：建後刪除、exit 1。驗收以子行程執行 `bin/dujs.js`，**不得以 stub 代替**；
§1 #7 另以 stub 讓 `defuseAnalysisExecutor.initialize` 拋錯的單元測試（`cli.run`）為補充，不取代子行程驗收。
