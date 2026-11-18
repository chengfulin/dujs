# 效能紀錄（SC-006、research R11）

機器：Apple M3 Pro、36 GB RAM、macOS（Darwin 25.6.0）；Node v24.10.0。
門檻（SC-006）：本 branch 的 golden fixture 與 MDN 語料總分析時間 ≤ develop（`2035c93`）× 2.0。

## develop 基準（`2035c93`）

Setup（T001，2026-11-18，HEAD `bf4b68c`）：`git -C <repo> diff --quiet 2035c93 -- lib` 結束碼 0（工作樹 `lib/` 與 `2035c93` 相同）。

| 項目 | 結果 |
|------|------|
| `npm test` | **1715 passing**（0 failing，約 1m） |
| `npm run lint` | **0 錯誤**（0 warnings；`eslint-suppressions.json` 未變更） |

Setup（T005，2026-11-18），在 MDN 快照（T004）完成之後單獨執行，量測期間未同時執行其他 CPU 密集工作。

### MDN 語料

量測：`node specs/006-eslint-scope/tools/perf.js .`——同一 process 依 `specs/006-eslint-scope/mdn/pages.json` 以 `tests/helpers/analyze.js`
依序分析 32 個 id（33 檔），整輪 3 次取中位數。

| 輪次 | 總時間（ms） |
|------|--------------|
| 1 | 188.9 |
| 2 | 159.0 |
| 3 | 135.8 |
| **中位數** | **159.0** |

### golden fixture 的 CLI 時間

量測：每個 case 以 `node bin/dujs.js -js <files> [-js <files>]`（fixture 取自 `tests/golden/fixtures/`，頁面同 `tests/golden/golden.js`）
在 scratchpad 的空目錄執行 3 次，量子行程 wall time（含 `.dot`／`.png`／`report.html` 輸出），取中位數。結束碼皆 0。

| case | 頁面 | 輪次（ms） | 中位數（ms） |
|------|------|------------|--------------|
| expected | `page0/app.js`；`page1/report.js` | 7073.3、7030.0、7029.2 | **7030.0** |
| expected-es2015 | `es2015/app.js` | 3905.2、3747.3、3743.2 | **3747.3** |
| expected-interprocedural | `interprocedural/app.js` | 4074.0、4060.2、4077.6 | **4074.0** |
| expected-fixes004 | `fixes004/app.js` | 6643.0、6880.3、6770.7 | **6770.7** |

### 合計

| 項目 | develop（ms） |
|------|---------------|
| MDN 語料（中位數） | 159.0 |
| golden CLI（4 case 中位數合計） | 21622.0 |
| **總分析時間**（MDN＋golden） | **21781.0** |
