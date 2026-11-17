# Contract：驗收情境 → 自動化測試（SC-001、SC-004）

**Feature**: `006-eslint-scope` | 預期 pair 以 spec 為準（不在此重抄）；測試以 `tests/helpers/analyze.js` 執行。沿用 004 慣例，Setup 把
`specs/006-eslint-scope/probes/*.js` 逐字複製到 `tests/dujs/cases/probes006/`（測試不依賴 specs 目錄），測試以 `fs.readFileSync` 讀入。

| 情境 | 測試檔（新） | 模型 | 備註 |
|------|--------------|------|------|
| US1-1…6 | `tests/dujs/catchclause.js` | 頁面 intra-procedural、intra-page；US1-5 另驗 inter-procedural | catch-b、catch-a、catch-c、catchloop、catchinner、catch-edge |
| U3（裁決） | `tests/dujs/catchclause.js` | intra-page | plan-u3：沒有 `y: L4 -> L7`；有 `y: L1 -> L7`、`y: L5 -> L7` |
| Q2（裁決） | `tests/dujs/catchclause.js` | intra-page、頁面 intra-procedural | plan-catch1：沒有 `e: entry -> L4`、`console: entry -> L4`；有 `e: L5 -> L6`（catch 參數）、`h: entry -> L3`、`k: entry -> L9` |
| US2-1、US2-2 | `tests/dujs/scoperesolution.js` | inter-procedural、intra-page、頁面 intra-procedural（不得有 `Q`／`fact`） | US2-2 為內嵌程式（named-expr 改 L5）；斷言分析完成且 `fact(n - 1)` 不連結（inter-procedural 模型的 relatedScopes） |
| US2-3、US2-4、US2-5 | `tests/dujs/scoperesolution.js` | intra-page | classdecl、pdef、shadow-*；US2-5 的期望為 Setup 時以 develop 實跑記錄的字面清單（characterization）：`tests/dujs/cases/probes006/developpairs.json`（T007） |
| U1、U4（裁決） | `tests/dujs/globals.js` | intra-page | plan-u1：不拋錯，有 `$: entry -> L1`、`été: entry -> L2`（`global`），另以 CLI 執行 exit 0 且 `dupairs.dot` 有 `$`、`été` 列（T049）；plan-u4：保留 develop 的 `d1: L5 -> L6`、`o: L1 -> L2`，新增 `kk`、`uu`、`Math`、`location` 的 pair（非 entry 定義：`kk: L2 -> L2`、`uu: L3 -> L4`、`Math: L7 -> L8`、`location: L9 -> L10`），`Math`／`location` 的 Var 種類為 `global`、`kk`／`uu` 為 `implicitGlobal` |
| US3-1…8 | `tests/dujs/globals.js` | 依 spec | globals、args、tyof 讀 probes；US3-2 以 golden（fixed list 的 pair 不在淨差異表）＋單元測試斷言 `window`／`document`／`console`／`localStorage` 的定義種類；US3-5 兩頁；US3-8 斷言 `Math` 等的 VarDef 種類為 `global` |
| US4-1 | `diffcheck.js golden --verify`（quickstart §3） | — | 不進 npm test |
| US4-2 | `tests/dujs/scopeguards.js` | scope 名稱、各層模型數 | 對全部 33 個 probes：scope 名稱清單與 develop 相同（Setup 以 develop 實跑記錄於 `tests/dujs/cases/probes006/scopenames.json`）；模型數只在 annexb、link-n4／n8a／n9／n10 改變且等於 spec 預期 |
| US4-3 | `tests/dujs/scopeguards.js` | scope 名稱、inter-procedural 模型數、intra-page | annexb |
| US4-4、US4-5、US4-8 | `tests/dujs/scopeguards.js` | intra-page | with、evalouter、op、mod（與 develop 相同） |
| Q1、Q3、F9（裁決／修正） | `tests/dujs/scopeguards.js` | inter-procedural、intra-page | 與 develop 相同：vis3（`A: L1 -> L3`、`A: L1 -> L7`、`A: L1 -> entry`）、plan-bi（`Map: entry -> L2`，無 inter-procedural 模型）、plan-pf（`a: entry -> L3`，無 `a` 的 undefined 初值 pair）、Q3 內嵌程式 `var x = 0; function f() { if (x) { let x = 1; console.log(x); } } f();`（`x: L1 -> entry` 等）；期望一律為 Setup 以 develop 記錄的字面清單 `tests/dujs/cases/probes006/developpairs.json`（T007） |
| US4-6 | `tests/dujs/scopesource.js` | — | contracts/static-check.md |
| US4-7 | `diffcheck.js mdn --verify`、`tools/perf.js` | — | quickstart §4 |
| US4-9 | `tests/dujs/scopebinding.js` | — | contracts/scope-binding-api.md §3；Foundational（T017）建立，未宣告只讀→`global`（`declarations` 為空）的斷言於 US3 T050 補入 |
| US4-10 | `tests/dujs/scopeguards.js` | inter-procedural、intra-page | link-n4、link-n8a、link-n9、link-n10、link-n5 |
| US4-11 | `tests/dujs/scopeguards.js` | intra-page | link-bypass |

**階段**（F6）：`scopeguards.js` 整檔在 Foundational 建立並須通過（Foundational 完成條件）；US4 只新增 `scopesource.js` 並重跑全部守門與 golden `--verify`。

另有單元測試：`tests/dujs/scopebinding.js`（R1 選項、R4 擁有者表、R6 可見性含 pdef、「b 不參照但呼叫 a」與 (c)、R6a `isOnFunctionChain`、R7 合併計數、optimistic 的 D6 等價、
D5 優先與唯一偏離（R2：參數預設值＋eval）、`useVarsOf`／`defVarsOf`、保留名稱 `$ANONYMOUS_FUN_0`（R12）、`binding.kind` 多宣告取法、非參照識別字〔標籤、`o.p` 的 `p`、物件鍵、方法鍵、export 別名〕的 `useVarsOf`／`defVarsOf` 為空、`for…of`／`for…in`／解構宣告的 `defVarsOf`、
兩檔串接且第二檔含 `import` 時 `sourceType` 為 module）、`tests/dujs/var.js`（IdentifierName：`$`、`été`、`a\u200Cb` 合法，`1a`、`a-b` 不合法）、
`tests/dujs/usedexpressions.js`（CatchClause items）、`tests/dujs/def.js`／`deffactory.js`（`global` 種類）。
