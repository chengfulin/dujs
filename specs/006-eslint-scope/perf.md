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

## Polish 對照（T066，2026-11-17，同一台機器、同一時段）

develop 以 `git archive 584e17d | tar -x -C <scratchpad>/develop` 後 `npm ci` 取得；本 branch 為 `44ee00f`（US1–US4 與 T070 後）的工作樹。
兩者交替各跑兩次 `perf.js`（每次 3 輪取中位數），以第 1 次為正式結果、第 2 次為重現確認。

| 執行 | develop 輪次（ms） | develop 中位數 | 本 branch 輪次（ms） | 本 branch 中位數 | 比值 |
|------|--------------------|----------------|----------------------|------------------|------|
| 第 1 次（正式） | 116.2、87.5、92.2 | **92.2** | 130.8、104.7、105.5 | **105.5** | **1.14** |
| 第 2 次（重現） | 116.1、88.3、92.3 | 92.3 | 127.6、96.9、104.8 | 104.8 | 1.14 |

結論：本 branch ／ develop ＝ 1.14 倍 ≤ 1.5，符合 SC-003（未做剖析，不歸因增量來源）。
