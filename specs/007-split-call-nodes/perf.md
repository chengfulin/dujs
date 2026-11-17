# 效能紀錄（SC-005、research R11、contracts/diff-check.md §4 步驟 3）

機器：Apple M3 Pro、36 GB RAM、macOS（Darwin 25.6.0）；Node v24.10.0。
門檻（SC-005）：本 branch 的 golden fixture 與 MDN 語料總分析時間 ≤ develop（`edc22d5`）× 2.0。

## develop 基準

Setup（2026-11-18）：`git -C <repo> diff --quiet edc22d5 -- lib` 結束碼 0（工作樹 `lib/` 與 `edc22d5` 相同）。

| 項目 | 結果 |
|------|------|
| `npm test` | **1495 passing**（0 failing，48s） |
| `npm run lint` | **0 錯誤**（0 warnings；`eslint-suppressions.json` 未變更） |

## develop 基準（`edc22d5`）

Setup（T004，2026-11-18），在 MDN 快照（T003）與 diffcheck（T005–T007）之後單獨執行，量測期間未同時執行其他 CPU 密集工作。

### MDN 語料

量測：`node specs/006-eslint-scope/tools/perf.js .`——同一 process 依 `specs/006-eslint-scope/mdn/pages.json` 以 `tests/helpers/analyze.js`
依序分析 32 個 id（33 檔），整輪 3 次取中位數。

| 輪次 | 總時間（ms） |
|------|--------------|
| 1 | 156.5 |
| 2 | 122.9 |
| 3 | 125.0 |
| **中位數** | **125.0** |

### golden fixture 的 CLI 時間

量測：每個 case 以 `node bin/dujs.js -js <files> [-js <files>]`（fixture 取自 `tests/golden/fixtures/`，頁面同 `tests/golden/golden.js`）
在 scratchpad 的空目錄執行 3 次，量子行程 wall time（含 `.dot`／`.png`／`report.html` 輸出），取中位數。結束碼皆 0。

| case | 頁面 | 輪次（ms） | 中位數（ms） |
|------|------|------------|--------------|
| expected | `page0/app.js`；`page1/report.js` | 4601.1、4593.2、4629.9 | **4601.1** |
| expected-es2015 | `es2015/app.js` | 3341.4、3331.0、3481.1 | **3341.4** |
| expected-interprocedural | `interprocedural/app.js` | 4163.7、4100.0、4097.0 | **4100.0** |
| expected-fixes004 | `fixes004/app.js` | 6604.2、6584.6、6587.2 | **6587.2** |
