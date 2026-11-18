# Contract：驗收情境 → 自動化測試（SC-001、SC-002）

**Feature**: `008-property-defs-method-calls` | 預期 pair 以 spec 為準（不在此重抄）；測試以 `tests/helpers/analyze.js` 執行。沿用 004–007 慣例，Setup 把
`specs/008-property-defs-method-calls/probes/*.js`（不含 `run.js`、`run-pages.js`、`baseline-develop.txt`）與 `probes/pages/*.js` 逐字複製到 `tests/dujs/cases/probes008/`（`pages/` 子目錄），測試以 `fs.readFileSync` 讀入；
兩頁程式以 `//// page` 行切開（同 `run-pages.js`）。「未指明模型」者對 intra-procedural（頁面）、inter-procedural（若有）與 intra-page 都斷言（spec「表示法」）。

| 情境 | 測試檔 | 程式 | 備註 |
|------|--------|------|------|
| US1-1…5、7…13、17 | `tests/dujs/propertydefs.js`（新） | p1、p2、p3、p4、p12、p25、p27、p29、p30、p31、p32、p33、p37 | US1-8 另斷言 `L6:F` 節點沒有 `o` 的 c-use；US1-9…12 斷言 hierarchy 的 call 邊（被呼叫端 scope 名稱）；US1-13 斷言 `f(a)` 的 call 邊與 L5、L6 的 GEN 為空 |
| US1-6 | 同上 | pages/s1…s9 | 輸出四行（intra(page 1)、storage nodes、inter-page localStorage、inter-page (all)）與 `probes/pages/baseline-develop.txt` 對應段落**逐字相同**（以同一份 baseline 檔讀入比對，不手抄期望） |
| US1-16 | 同上 | p42 | L2 的 GEN 為空、L2 的 USE 含 `localStorage` 與 `n`（D013）；`n: L1 -> L2`、`o: L1 -> L2`、`console: entry -> L3`；`localStorage` 的 pair 以實跑為準寫入測試（develop 慣例下頁面無定義時無 pair）；儲存定義節點數 0（與 develop 同） |
| US1-14、US1-15 | 同上 | pages/s10…s14 | inter-page (all) 與第一頁 intra-page 的斷言；s13、s14 的 `inter-page localStorage` 行與 baseline 相同；儲存定義節點數 |
| US2-1…13 | 同上 | p5、p6、p7、p8、p9、p10、p11、p26、p28、p34、p35、p36 | 「與 develop 相同」者以 `probes/baseline-develop.txt` 該程式的行逐字比對（characterization）；P10（US2-5，D018）不逐字：不連結、有 `x: L1 -> L11`，且 intra(page)、inter[0]、intra-page 各多 `F: entry -> L3`（FR-002），其餘 pair 與 baseline 相同；連結者斷言 `o.m()` 的 call 邊連到 `A` 的 `m`（不含 constructor） |
| US2-8 | 同上 | `specs/006-eslint-scope/mdn/corpus/a05-assessment-main.js` | `loop()` 中三個 `evilBall` 呼叫的 call 邊連到 `EvilCircle` 的 `draw`、`checkBounds`、`collisionDetect` |
| US3-1…3 | `tests/dujs/reachability.js`（新） | p13、p14、p15、p16、p17、p18、p19、p20 | pair 斷言（守門）＋檢查器全開無違反 |
| US3-4 | `tests/dujs/reachabilityinvariant.js`（新） | probes008 全部（含 pages）、golden fixture、MDN 語料 | contracts/reachability.md §5–§6；允許清單 `tests/dujs/cases/reachability-allowlist.json` |
| US3-5 | `tests/dujs/reachability.js` | p21、p23、p24 | 結果與 baseline 相同；全開違反、關掉 (c) 兩端可達、見證 `nonExceptionalEntries: 0` |
| US3-6 | 同上 | p13（注入） | contracts/reachability.md §6 |
| US3-7（FR-013） | `tests/dujs/reachability.js`（pair 斷言）＋`tests/dujs/defuseanalyzer.js`（擴充，`findDUPairs` 單元） | p38、p39、p40 | inter-procedural 與 intra-page 沒有決策節點的 p-use pair（spec 所列），保留段 0 的 c-use；intra-procedural（頁面）與 `probes/baseline-develop.txt` 逐字相同；檢查器全開無違反。單元：owner 可到達時照常配對（`if (h(a))`，`h` 會返回）、owner 不可到達時略過。排程在 Foundational（[US3／FR-013]），先由檢查器報紅 |
| US3-8（D015） | `tests/dujs/reachability.js` | p41 | pair 與 baseline 相同；L10 的 CALL、CALL RETURN 與 L11 不在可達集合（contracts/reachability.md §6） |
| P22（SC-002：結果不變） | `tests/dujs/propertydefs.js` | p22 | 與 baseline 逐字相同 |
| FR-003 摘要 | `tests/dujs/summary.js`（擴充） | 內嵌：被呼叫端 `function g() { o.p = 1; }` | `o` ∉ `summaryOf(g).gen`、∉ `mustKill`，`o` ∈ `upwardExposed`；`*.matching.json` 的 `summaries` 同步 |
| FR-005 | `tests/dujs/matching.js`（擴充） | p5 | FR-004 的呼叫每條 return 邊恰對應一個 record，`callSiteLine` 對應 P5 的 L9（依 matching 既有的行號慣例） |
| 外溢的防護解除（R3） | `tests/dujs/propertydefs.js` | 內嵌：`var o = new A(); o.p = 1, o.m();` | `o.m()` 連結（develop 因同節點先定義而不連；characterization，相對 develop 的行為變更，列入 golden-diff 說明） |
| 巢狀賦值（R1 (d)，D012） | 同上 | 內嵌：`o.p = x = 1;`、`o.p = x++;`、`o.a.b = x = 1;`、`this.p = x = 1;`（方法內），各接 `console.log(x);` | 回歸：前兩例定義 `x`（`x: L1 -> L2` 類 pair 存在）、不定義 `o`；characterization：後兩例與 develop 相同（不定義 `x`，KI 新項 FR-011 (g)） |
| 成員目標讀取（FR-002 細項） | 同上 | 內嵌：`for (o[k] of a) {}`、`for ([o.p] of a) {}`、`({p: o[k]} = b);`、`if ((o.p = f()))`、`f(a).p = 1;` 在被呼叫端 | 讀取在迴圈節點／決策節點（p-use 依 007 FR-003）；豁免變體（`for (localStorage[k] of a)`）與 develop 相同 |

另有單元測試：

- `tests/dujs/scopebinding.js`（擴充）：`isLocalStorageObject`（domain、頁面宣告、函式內遮蔽、別名、`window.localStorage`）、`isRelaxedInstance`（`let`、`const`、`var`、參數、函式、class）、`isLogicalAssignmentTarget`（`&&=`、`||=`、`??=`、`+=`、`=`）。
- `tests/dujs/usedexpressions.js`（擴充）：`loopHeadExpressions` 的計算鍵、樣式成員目標、豁免、`binding` 為 null。
- `tests/dujs/defuseanalyzer.js`（擴充）：`findGENSet`／`findUSESet` 對「表示法」成員目標每一形態（`=`、複合、邏輯、`++`、解構、`for…in`／`for…of`、巢狀、`delete`、`this.p`、`super.p`）各一列，含豁免列。
- `tests/dujs/callresolver` 相關（`relaxedcallee.js`、`methodcalls.js` 擴充）：`relaxedClassOfInstance` 的四個條件各一反例（頁面程式碼、`var`、兩個定義、`new F()`）與 class 放寬的 `A`。
- 既有測試中編碼「成員賦值定義物件變數」者（如 `globals.js`、`methodcalls.js`；實際以各階段 `npm test` 的失敗清單為準）依 FR-001 更新，逐處列入 golden-diff「單元測試期望」。
- `tests/dujs/reachability.js`（D014）：「呼叫節點無例外邊」的 record（鏈式呼叫後段、決策前呼叫）經 `exceptionalReturn` 的虛擬例外邊；`exceptionalReturn` 斷言的反例（contracts/reachability.md §2、§6）。
- `tests/dujs/reachabilityinvariant.js`（D016）：MDN 語料缺檔或檔數 ≠ 33、sha256 與 006 README 不符時失敗，不得 skip。
- 非自動化：golden／MDN `--verify`（contracts/diff-check.md）、`perf.md`（SC-006）、`docs-check.md`（SC-007）。
