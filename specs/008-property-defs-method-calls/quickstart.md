# Quickstart：驗證 008（成員賦值、`o.m()` 放寬、可到達性查核）

**Feature**: `008-property-defs-method-calls` | 細節見 [contracts/](./contracts/) 與 [data-model.md](./data-model.md)。所有指令在 repo 根目錄執行。

## 0. 前置

- Node.js ≥ 24、`npm ci`；branch `008-property-defs-method-calls`；golden／MDN 基準 `develop` `2035c93`（`golden-diff.md`、`mdn-diff.md` 檔頭「基準：」行）。
- 基線：`npm test` 1715 passing（2035c93，2026-11-18）。

## 1. 單元、驗收與不變量測試

```sh
npm test          # 全部通過；新增 propertydefs.js、reachability.js、reachabilityinvariant.js（contracts/acceptance.md）
npm run lint      # 0 錯誤；eslint-suppressions.json 不得新增鍵或增加 count
```

預期：spec 全部驗收情境有對應測試且通過（SC-001）；`reachabilityinvariant.js` 對 probes、golden、MDN 的違反都在允許清單內、無過期項（SC-005）。

## 2. 探測程式（SC-002）

```sh
node specs/008-property-defs-method-calls/probes/run.js
node specs/008-property-defs-method-calls/probes/run-pages.js
```

對照 spec「探測結果」與各情境：例如 P1 有 `o: L7 -> L9`、`x: L4 -> L10`，沒有 `o: L8 -> L9`；P5 有 `x: L4 -> L12`；P6、P7、P10、P26、P28、P35、P36 與 `probes/baseline-develop.txt` 相同；
P21、P23、P24、P41 與 baseline 相同；P38–P40 的 inter／intra-page 沒有決策節點的 p-use pair（`f: entry -> L5>L6:T` 等，FR-013），intra(page) 與 baseline 相同；P42 有 `n: L1 -> L2`（D013）；`run-pages.js` 的 s1–s9 輸出與 `probes/pages/baseline-develop.txt` 逐行相同。

## 3. 可到達檢查器（US3）

```sh
npx mocha tests/dujs/reachability.js tests/dujs/reachabilityinvariant.js
```

預期：P21、P23、P24 全開違反、關掉 (c) 後兩端可達、見證 `nonExceptionalEntries: 0`；注入的 pair 被報出；P41 的 L10 CALL、CALL RETURN 與 L11 不可到達（D015）；每個非 null 的 `exceptionalReturn` 都是圖上的例外目標（D014）；MDN 語料 33 檔且 sha256 與 006 README 相符（D016，不符即失敗）；允許清單每項附見證且與輸出相同（contracts/reachability.md）。

## 4. golden 與 MDN 差異

```sh
npx mocha specs/008-property-defs-method-calls/tools/classify.test.js specs/008-property-defs-method-calls/tools/diffcheck.test.js
node specs/008-property-defs-method-calls/tools/diffcheck.js golden --verify specs/008-property-defs-method-calls/golden-diff.md
node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --verify specs/008-property-defs-method-calls/mdn-diff.md
```

預期：exit 0；每筆新增／消失的 pair 歸入 `成員目標`（修正／新增讀取／不再殺除）、`屬性寫入→讀取損失`、`外溢`、`放寬` 或 KI 類；「段結構改變行」「重複列數」與實測一致；釘選列經使用者簽核（SC-003、SC-004）。
MDN `a05-assessment-main.js` 的 `evilBall.draw()`、`checkBounds()`、`collisionDetect()` 連結（US2 情境 8）。

## 5. 效能（SC-006）

```sh
node specs/006-eslint-scope/tools/perf.js .
```

golden＋MDN 總分析時間 ≤ develop（`perf.md` 的基準）× 2。

## 6. 文件（FR-011、FR-012、SC-007）

`specs/008-property-defs-method-calls/docs-check.md` 的每一列核對結果為「符合」；`grep -n "defines <code>a</code>\|known-issues §23)" README.md` 無輸出（L173、L187 的過期敘述已改寫）。
