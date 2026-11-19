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

## 008

Polish（T064，2026-11-18，HEAD `8cda1f0`；工作樹 `lib/` 與 HEAD 相同），同機、同法量測（同 develop 基準：MDN 以 `node specs/006-eslint-scope/tools/perf.js .`；golden 各 case 的 CLI 在 scratchpad 空目錄各跑 3 次取中位數）。在 T063 的 `diffcheck.js mdn --report`／`--verify` 跑完之後單獨執行，量測期間未同時執行其他 CPU 密集工作。檢查器（`tests/helpers/reachability.js`）只在 `npm test` 執行，不計入。

### MDN 語料

| 輪次 | 總時間（ms） |
|------|--------------|
| 1 | 198.2 |
| 2 | 155.4 |
| 3 | 149.4 |
| **中位數** | **155.4** |

### golden fixture 的 CLI 時間

結束碼皆 0。

| case | 頁面 | 輪次（ms） | 中位數（ms） | develop 中位數（ms） | 比值 |
|------|------|------------|--------------|----------------------|------|
| expected | `page0/app.js`；`page1/report.js` | 7042.7、7033.9、7066.6 | **7042.7** | 7030.0 | 1.002 |
| expected-es2015 | `es2015/app.js` | 4792.6、4779.2、4792.4 | **4792.4** | 3747.3 | 1.279 |
| expected-interprocedural | `interprocedural/app.js` | 4089.5、4106.8、4212.0 | **4106.8** | 4074.0 | 1.008 |
| expected-fixes004 | `fixes004/app.js` | 6766.0、6719.1、6684.4 | **6719.1** | 6770.7 | 0.992 |

expected-es2015 增加約 1.0 s：US2 的 FR-004 放寬使 `list.render(…)` 連到 `render`，CLI 多輸出 `page0/inter-procedurals/2.*`、`3.*` 兩個模型（含 `.png` 繪製），inter-page／intra-page 模型也多了 `render` 的節點；其他 case 的輸出不變，時間在量測誤差內。

### 合計與比值（SC-006）

| 項目 | develop（ms） | 008（ms） | 比值（008 ÷ develop） |
|------|---------------|-----------|------------------------|
| MDN 語料（中位數） | 159.0 | 155.4 | 0.977 |
| golden CLI（4 case 中位數合計） | 21622.0 | 22661.0 | 1.048 |
| **總分析時間**（MDN＋golden） | **21781.0** | **22816.4** | **1.048** |

判定：總分析時間 22816.4 ms ≤ develop × 2（43562.0 ms），比值 1.048，符合 SC-006。
