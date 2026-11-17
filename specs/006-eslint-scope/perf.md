# 效能紀錄（research R15、SC-003）

量測：`node specs/006-eslint-scope/tools/perf.js <dujsRoot>`——同一 process 依 `mdn/pages.json` 以 `<dujsRoot>/tests/helpers/analyze.js` 依序分析
32 個 id（33 檔），整輪 3 次取中位數。門檻：本 branch 中位數 ≤ develop 中位數 × 1.5。

機器：Apple M3 Pro、36 GB RAM、macOS（Darwin 25.6.0）；Node v24.10.0。

## develop（Setup，`lib/` 與 `584e17d` 相同）

| 輪次 | 總時間（ms） |
|------|--------------|
| 1 | 115.2 |
| 2 | 85.8 |
| 3 | 95.2 |
| **中位數** | **95.2** |

## 本 branch

（待 US4／Polish 量測）
