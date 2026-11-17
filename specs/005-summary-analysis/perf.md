# 效能紀錄（research R11、contracts/diff-check.md §4 步驟 2）

機器：Apple M3 Pro、36 GB RAM、macOS（Darwin 25.6.0）；Node v24.10.0。

## develop 基準（Setup，2026-11-17，`lib/`、`bin/`、`tests/` 與 `9e324be` 相同）

### MDN 語料

量測：`node specs/006-eslint-scope/tools/perf.js .`——同一 process 依 `specs/006-eslint-scope/mdn/pages.json` 以 `tests/helpers/analyze.js`
依序分析 32 個 id（33 檔），整輪 3 次取中位數。

| 輪次 | 總時間（ms） |
|------|--------------|
| 1 | 135.1 |
| 2 | 106.6 |
| 3 | 114.5 |
| **中位數** | **114.5** |

### golden fixture 的 CLI 時間

量測：每個 case 以 `node bin/dujs.js -js <files> [-js <files>]`（fixture 取自 `tests/golden/fixtures/`，頁面同 `tests/golden/golden.js`）
在 scratchpad 的空目錄執行 3 次，量子行程 wall time（含 `.dot`／`.png`／`report.html` 輸出），取中位數。結束碼皆 0。

| case | 頁面 | 輪次（ms） | 中位數（ms） |
|------|------|------------|--------------|
| expected | `page0/app.js`；`page1/report.js` | 5091.8、5092.4、5082.6 | **5091.8** |
| expected-es2015 | `es2015/app.js` | 3116.8、3125.3、3133.4 | **3125.3** |
| expected-interprocedural | `interprocedural/app.js` | 4507.5、4525.0、4504.7 | **4507.5** |
| expected-fixes004 | `fixes004/app.js` | 7280.0、7280.1、7650.2 | **7280.1** |
