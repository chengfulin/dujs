# Contract：驗收情境 → 自動化測試（SC-001、SC-002）

**Feature**: `005-summary-analysis` | 預期 pair 以 spec 為準（不在此重抄）；測試以 `tests/helpers/analyze.js` 執行。沿用 004／006 慣例，Setup 把
`specs/005-summary-analysis/probes/*.js`（不含 `run.js`）逐字複製到 `tests/dujs/cases/probes005/`，測試以 `fs.readFileSync` 讀入；spec 中以內文給出、probes 沒有的程式
（US1-3、US2-2 的變體）以內嵌字串寫在測試中。「未指明模型」者對 inter-procedural（若有）與 intra-page 都斷言。

| 情境 | 測試檔（新） | 程式 | 備註 |
|------|--------------|------|------|
| US1-1、US1-2、US1-3 | `tests/dujs/summaryanalysis.js` | p1、p2、內嵌 | US1-1 斷言 `x` 的 pair「恰為」兩筆 |
| US1-4 | 同上 | 依裁決 Q1（cyc-3 或其終止變體） | 斷言分析終止 |
| US1-5 | `tests/dujs/matching.js` | p1、us3-3 | 讀 `model.callBypassOf` 與 CLI 產出的 `*.matching.json`（contracts/matching-output.md §4） |
| US1-6、US1-7、US1-8 | `tests/dujs/summaryanalysis.js` | g5、c-noret、c-gen、c-asy | US1-8 另斷言 Summary `conservative` |
| US2-1…7 | `tests/dujs/relaxedcallee.js` | p3、us2-2-let、內嵌（`var f`、兩筆定義、`new f()`）、p7、g1、p10、p11、c-blk | 連結與否以 inter-procedural 模型的 `relatedScopes`／hierarchy call 邊斷言 |
| US3-1…7 | `tests/dujs/exceptionsummary.js` | p4、m1、us3-3、m2、g4、m3、c-nt | US3-2 另以 g2 對照 |
| US4-1…3 | `tests/dujs/loopmatching.js` | p5、p6、c-h12 | intra-page |
| US5-1 | `tests/dujs/entryuse.js` | p8 | 斷言 `f` 的 entry 節點 `cuse`、`puse` 皆空 |
| US5-2、US5-3 | 同上 | p9、p2、cyc-3 | 斷言不拋錯、無以 `entry` 為 use 端的指定 pair |
| US6-1…7 | `tests/dujs/finallyflow.js` | c-fin1、c-fin3、c-fin4、c-m4h、c-fin2、c-fin5-break、c-fin6-continue、c-out3 | 另有 esgraph 層邊結構測試 `tests/esgraph/finally.js`（data-model §8 每列一例） |
| 限制 P30 | `tests/dujs/relaxedcallee.js` | c-win | characterization：斷言誤連發生（README 限制），標註 |
| SC-002 | 上列 P1–P11 測試合計 | — | `run.js` 對 P1–P11 的輸出與預期一致 |

另有：

- `tests/dujs/summary.js`：Summary 單元（哨兵 must-KILL、`upwardExposed` 經巢狀呼叫、SCC 自身／互相遞迴不動點、⊥ 起算、可見性過濾、哨兵不外洩）。
- `tests/dujs/reachingsolver.js`：邊貢獻表每列一例（exception 帶 IN、return 不貢獻、CallSiteRecord／LoopRecord 虛擬貢獻、`finally` 帶 OUT）。
- `tests/dujs/inliningoracle.property.js`（fast-check）：research R12 的 inlining oracle。
- 既有測試：編碼舊行為者（例如 `bypass.js`、`defuseanalyzer.js` 的 entry use、`expansion.js` 的例外邊搬移、`scopebinding.js` 的 `isOnFunctionChain`）依新規格更新，逐處列入
  golden-diff「單元測試期望」表。
- 非自動化：golden／MDN `--verify`（contracts/diff-check.md）與 `perf.md`（SC-004）。
