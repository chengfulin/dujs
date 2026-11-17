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

## 本 branch 對 develop（T095，2026-11-17，Polish）

同一機器、同一時段交錯量測：develop 為 `git archive 9e324be` 解到 scratchpad 後 `npm ci` 的工作樹，本 branch 為 Polish 第 2 批時的工作樹（HEAD `a5ff2be`，lib 未再變更）。
門檻（SC-004）：本 branch 中位數 ≤ develop 中位數 × 2.0。

### MDN 語料（`node specs/006-eslint-scope/tools/perf.js <root>`，3 輪中位數）

| 量測 | develop 輪次（ms） | develop 中位數 | 本 branch 輪次（ms） | 本 branch 中位數 | 比值 |
|------|--------------------|----------------|----------------------|------------------|------|
| 第 1 組 | 124.6、93.6、103.2 | 103.2 | 158.2、124.4、123.6 | 124.4 | **1.21** |
| 第 2 組（複測） | 126.9、95.7、99.8 | 99.8 | 157.5、122.1、121.4 | 122.1 | 1.22 |

### golden fixture 的 CLI 時間（方法同 develop 基準，3 次取中位數，結束碼皆 0）

| case | develop 輪次（ms） | develop 中位數 | 本 branch 輪次（ms） | 本 branch 中位數 | 比值 |
|------|--------------------|----------------|----------------------|------------------|------|
| expected | 4633.3、4648.7、4612.7 | 4633.3 | 4624.4、4603.0、4632.9 | 4624.4 | 1.00 |
| expected-es2015 | 2849.2、2842.0、2884.6 | 2849.2 | 3355.2、3374.4、3358.4 | 3358.4 | **1.18** |
| expected-interprocedural | 4240.2、4190.8、4115.2 | 4190.8 | 4118.6、4200.1、4193.2 | 4193.2 | 1.00 |
| expected-fixes004 | 6590.8、6632.2、6618.2 | 6618.2 | 6636.9、6618.4、6630.8 | 6630.8 | 1.00 |

結論：最大比值 1.22（MDN 語料）、CLI 最大 1.18（expected-es2015：US2 的 D2 連結新增處理器 inter-procedural 模型，多產 `.dot`／`.png`），皆 ≤ 2.0，SC-004 成立。
CLI 時間以 Graphviz 產 `.png` 為主，分析本身的差異以 MDN 語料的同 process 量測為準。本次量測的 develop 數值比 Setup 基準低約 10%（機器負載不同），比值以同時段數值計算。
