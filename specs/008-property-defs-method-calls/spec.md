# Feature Specification: 成員賦值不是物件變數的定義（KI §22 (1)）、函式中的 `o.m()` 放寬解析（KI §23），並查核無法到達的程式碼不產生 pair（KI §22 (5)）

**Feature Branch**: `008-property-defs-method-calls`

**Created**: 2026-11-18

**Status**: Draft（D001–D026 已裁決；D021–D026 見 tasks.md 裁決節與 golden-diff／mdn-diff 簽核備註）

**Input**: User description: "Feature 008 = docs/known-issues.md 的 §22 (1)、§22 (5) 與 §23（見該檔 L20–60 的總覽，以及 §22、§23 本文）。§22 (4)（storage model）不在範圍內。先確認 007 修完後哪些仍未解決，再寫 spec。技術選型維持 repo 現況，不引入新框架或新依賴。慣例沿用 005、006、007：probes 目錄、golden 差異以 tests/golden + diffcheck 記錄、MDN 範例驗收（Advanced JavaScript objects + Core Scripting），新發現記到 docs/known-issues.md。PR 目標 develop。"

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| KI | `docs/known-issues.md` | §22 本文（(1) 在 L827–831）、§22 (0)（嚴格解析與 class 放寬）、§22 (1)、§22 (5)、§23 的問題描述與重現程式；§38（`finally` 多入口）；§45、§46（007 的分段與非呼叫點位置）；總覽 L20–60（008 的範圍） |
| F005 | `specs/005-summary-analysis/spec.md` | 決策 D1（008 的範圍）、D2（函式中 `f()` 的放寬）、FR-003（遞迴的摘要從「沒有正常返回」開始）、FR-018 的 class 放寬 |
| F007 | `specs/007-split-call-nodes/spec.md` | R1（§22 (1)(5)、§23 屬 008）；golden-diff／mdn-diff 的作法（FR-008、FR-009） |
| PRB | 本 feature 對 `develop`（`2035c93`）跑的探測程式 `specs/008-property-defs-method-calls/probes/`（見「探測結果」；完整輸出 `probes/baseline-develop.txt`） | 目前行為的實測證據 |
| USR | 本 feature 的需求描述（2026-11-18） | 範圍、範圍外、驗收方式 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | KI §22 (1)；PRB P1–P4、P12、P25、P27、P29–P33、P37、P42 |
| US2 | KI §23、§22 (0)；F005 D1、D2；PRB P5–P11、P26、P28、P34–P36 |
| US3 | KI §22 (5)、§38；F005 FR-003；PRB P13–P24、P38–P41 |

### 範圍決策（USR）

- **R1**：本 feature 只做 KI §22 (1)、§22 (5)、§23。§22 (4)（儲存模型：`setItem`／`getItem`／`removeItem`、key 的區分）屬另開的 feature；§44、§48、§50 等其他未修項目不在範圍內。[SRC USR；KI 總覽]
- **R2**：golden 與 MDN 範例的結果預期會改變；比照 005／007，每處差異以差異工具逐筆記錄並分類（`golden-diff.md`、`mdn-diff.md`），使用者簽核後才更新 golden。[SRC USR；F007 FR-008、FR-009]

### 探測結果（PRB，`develop` 2035c93）

程式在 `specs/008-property-defs-method-calls/probes/`，以同目錄的 `run.js` 執行（複製自 007 的探測執行器）。「連結」指該呼叫有被呼叫端（inter-procedural 模型含其 scope）。

| ID | 程式 | 目前結果（節錄） | 問題 |
|----|------|------------------|------|
| P1 | `p1-ki22-1-prop.js`（KI §22 (1) 程式） | `o.m()` 不連結；有 `o: L8 -> L9`、`x: L1 -> L10` | `o.p = 1` 被當成 `o` 的定義，蓋掉 `new A()`（§22 (1)） |
| P2 | `p2-member-targets.js`（各種成員賦值目標） | L2 `o.p = 1`、L4 `o[k] = 3`、L7 `[o.p] = a`、L9 `({p: o.p} = …)` 定義 `o`；L3 `o.p.q = 2` 與 L4 都沒有 `o` 的使用；L4 沒有 `k` 的使用 | 成員目標的物件與計算鍵沒有被當成讀取 |
| P3 | `p3-storage-globals.js`（`localStorage.k = v`、`window.f = 1`、`document.title = 'a'`） | 有 `localStorage: L2 -> L3`、`window: L4 -> L5`、`document: L6 -> L7` | `localStorage` 的儲存定義須保留；`window`、`document` 同 §22 (1) |
| P4 | `p4-storage-object.js`（`localStorage.k = 1` 與一般物件並存） | 有 `localStorage: L1 -> L4`、`o: L3 -> L4` | 同上 |
| P5 | `p5-ki23.js`（KI §23 程式，`const o = new A()`） | `o.m()` 不連結；有 `x: L1 -> L12` | 函式中 `o` 沒有到達的定義時不連結（§23） |
| P6 | `p6-ki23-var.js`（P5 改為 `var o = new A()`） | 不連結；有 `x: L1 -> L12` | 守門：放寬不涵蓋 `var`（D002） |
| P7 | `p7-ki23-two-defs.js`（`let o` 有兩個 `new A()` 定義） | 不連結；有 `x: L1 -> L15` | 守門：頁面上不只一個定義，維持不連結 |
| P8 | `p8-ki23-handler.js`（事件處理器中的 `o.m()`） | 不連結；intra-page 有 `x: L1 -> L12` | §23 在事件處理器中同樣成立 |
| P9 | `p9-ki23-prop-then-call.js`（頁面先 `o.p = 1`，函式中 `o.m()`） | 不連結；有 `o: L8 -> L10`、`x: L1 -> L13` | US1 與 US2 的交互：`o.p = 1` 不再是定義後，`o` 只剩一個定義 |
| P10 | `p10-ki23-not-class.js`（`new F()`，`F.prototype.m`） | 不連結；有 `x: L1 -> L11` | 守門：callee 不是 class，維持不連結 |
| P11 | `p11-ki23-local-def.js`（函式內 `var o = new B()` 遮蔽外層 `o`） | 連結 `B` 的 `m`；有 `x: L9 -> L18` | 守門：函式內有到達的定義時沿用嚴格規則 |
| P12 | `p12-callee-sets-prop.js`（被呼叫端做 `o.p = 1`） | intra-page 有 `o: L9 -> L12` | 被呼叫端的成員賦值經摘要被當成 `o` 的定義 |
| P13 | `p13-ki22-5.js`（KI §22 (5) 程式） | intra-page 只有 `A: L2 -> L8` | 守門：005 已消除 `x: L5 -> L9` |
| P14 | `p14-rec-inner.js`（遞迴呼叫後的 `var y = 1; x = y;`） | inter／intra-page 沒有 `y`、`x` 的 pair；intra(f) 有 `y: L4 -> L5` | 守門（intra-procedural 中呼叫不透明，`y: L4 -> L5` 正確） |
| P15 | `p15-mutual.js`（互相遞迴） | intra-page 沒有 `x`、`console` 的 pair | 守門 |
| P16 | `p16-cond-rec.js`（條件式遞迴） | 有 `x: L4 -> L7` | 守門：會正常返回的遞迴照常連結 |
| P17 | `p17-rec-loop-fn.js`（迴圈中的遞迴） | 有 `x: L6 -> L4` | 守門：`c` 為假時會返回，`x = 1` 可到達 |
| P18 | `p18-method-loop.js`（迴圈中的無返回方法呼叫） | intra-page 沒有 `x: L11 -> L9`；intra(page) 有 | 守門 |
| P19 | `p19-try.js`（try 內無返回呼叫，catch 讀取） | inter／intra-page 沒有 `x: L10 -> L14` | 守門 |
| P20 | `p20-handler.js`（事件處理器中無返回呼叫後的定義） | intra-page 中 `x` 的 pair 只有 `x: L1 -> L10` | 守門 |
| P21 | `p21-finally.js`（try 內無返回呼叫，`finally` 後的讀取） | inter／intra-page 有 `x: L1 -> L11`、`console: entry -> L11` | L11 實際到不了：`finally` 只由例外進入，卻仍以正常路徑接到 L11（KI §38 的 finallyExit 根因；D003 不修） |
| P22 | `p22-while-true.js`（`while (true)` 後的程式碼） | 有 `x: L3 -> L5`、`y: L5 -> L6` | 範圍外：條件不求值（常數條件的兩個分支都算可到達） |
| P23 | `p23-finally-summary.js`（`g` 的 try 內無返回呼叫，`finally` 後 `x = 2;` L11） | inter／intra-page 有 `x: L11 -> L14` | 同 P21 的根因，經 `g` 的摘要（normalReturn 為真）外溢到呼叫端（D003） |
| P24 | `p24-finally-throw.js`（try 內呼叫只會拋錯的 `t()`，非遞迴） | inter／intra-page 有 `x: L1 -> L11`、`console: entry -> L11` | 同 P21 的根因；被呼叫端單純 `throw`（D003） |
| P25 | `p25-prop-write-read.js`（`o.p = 1;` L2、`var y = o.p;` L3、`o.p = 2;` L4、`console.log(o.p, y);` L5） | 有 `o: L2 -> L3`、`o: L4 -> L5` | US1 修正後這兩個「屬性寫入→讀取」的 pair 會消失（all-uses 損失，D001） |
| P27 | `p27-member-more.js`（`o.p ||= 1;` L6、`o[g()] = 2;` L7） | 有 `o: L7 -> L8`、`x: L3 -> L8`；L7 沒有 `o` 的使用 | 邏輯賦值與計算鍵中有呼叫的成員目標 |
| P37 | `p37-method-prop-call.js`（`o.m = function…` L2、`o.m();` L5；`q.n = 1;` L6、`q.m();` L7） | 有 `o: L2 -> L5`、`q: L6 -> L7`；兩個呼叫都不連結 | D011 的損失／修正正反例（同路徑 `o.m` 歸損失、異路徑 `q.n`→`q.m()` 歸修正） |
| P26 | `p26-ki23-reassigned.js`（`o` 另在未呼叫的 `h` 中被賦值 `o = null`） | 不連結；有 `x: L1 -> L15` | 守門：頁面上有兩個定義，維持不連結（`var` 版本，另受 D002 影響） |
| P28 | `p28-ki23-let-reassigned.js`（P26 改為 `let o = new A()`） | 不連結；有 `x: L1 -> L15` | 守門：未被呼叫的函式中的賦值也算頁面定義（FR-004） |
| P29 | `p29-fn-prop-call.js`（`function f` 後 `f.p = 1;` L5、`f();` L6） | 不連結；有 `f: L5 -> L6`、`x: L1 -> L7` | FR-001 外溢到呼叫解析：`f.p = 1` 蓋掉函式宣告 |
| P30 | `p30-fn-prop-fn.js`（`f.p = function () {…}` L5、`f();` L8） | `f()` 連到匿名函式；intra-page 有 `f: L5 -> L8`、`x: L6 -> L9` | 同上，且連錯被呼叫端 |
| P31 | `p31-class-prop-new.js`（`A.count = 0;` L7、`new A();` L8） | constructor 不連結；有 `A: L7 -> L8`、`x: L1 -> L9` | 同上（class） |
| P32 | `p32-fn-prop-d2.js`（`f.p = 1;` L5，函式 `g` 中 `f();` L7） | 不連結；有 `x: L1 -> L10` | 同上：D2 的頁面唯一定義計數把 `f.p = 1` 算進去 |
| P33 | `p33-member-object-reads.js`（`f(a).p = 1;` L5、`o[i].q = 2;` L6） | L5 沒有 `f`、`a` 的使用；L6 沒有 `o`、`i` 的使用 | 成員目標物件運算式中的讀取（FR-002） |
| P34 | `p34-ki23-tdz.js`（`g();` L10 在 `const o = new A();` L11 之前） | 不連結；有 `x: L1 -> L12` | 放寬忽略執行順序（暫時死區），008 後連結 |
| P35 | `p35-ki23-let-split.js`（`let o;` L7、`o = new A();` L8） | 不連結；有 `x: L1 -> L13` | 宣告與賦值分開時是否放寬（與 D2 一致，見 P36） |
| P36 | `p36-d2-let-split.js`（`let f;` L2、`f = function () {…};` L3，函式 `g` 中 `f();` L7） | 不連結；有 `x: L1 -> L10` | D2 對同一形式的現行行為（P35 的對照） |
| P38 | `p38-if-norecall.js`（`f` 無條件遞迴，`if (f()) {` L5、`x = 1;` L6、`console.log(x);` L8） | inter／intra-page 有 `f: entry -> L3`、`f: entry -> L5>L6:T`、`f: entry -> L5>L8:F`；intra(page) 另有 `x: L1 -> L8`、`x: L6 -> L8` 等 | 決策節點 L5 在無返回呼叫之後不可到達，卻有 deferred p-use 的 pair（§22 (5) 的死碼 pair，D017） |
| P39 | `p39-if-nested-norecall.js`（`if (g(f())) {` L8、`x = 1;` L9） | inter／intra-page 有 `f: entry -> L8`、`g: entry -> L8>L9:T`、`g: entry -> L8>L11:F` | 同 P38，決策條件中巢狀呼叫（D017） |
| P40 | `p40-while-norecall.js`（`while (f()) {` L5） | 同 P38 的形式（`f: entry -> L5>L6:T`、`f: entry -> L5>L8:F`） | 同 P38，迴圈條件（D017） |
| P41 | `p41-call-after-norecall.js`（`h()` 會返回、`r()` 無條件遞迴；`h();` L8、`r();` L9、`h();` L10、`console.log(x);` L11） | inter[1] 只有 `h: entry -> L8`、`r: entry -> L6`、`r: entry -> L9`；intra(page) 有 `h: entry -> L10`、`x: L1 -> L11` | 守門：L10 之後不可到達；檢查器 (a) 的返回分呼叫點（D015） |
| P42 | `p42-localstorage-call-chain.js`（`var n = 'k', o = 1;` L1、`localStorage.getItem(n).p = o;` L2、`console.log(localStorage);` L3） | 只有 `console: entry -> L3`、`o: L1 -> L2` | 物件運算式是呼叫（`.object` 鏈中斷）時沒有物件變數，不豁免（D013） |

## Clarifications

### specify 階段的裁決（2026-11-18，主對話＋Fable 裁判，依使用者授權）

- **D001 → A（附條件）**：成員目標不定義任何變數，只把物件變數與計算鍵記為讀取；不引入屬性層級的變數 `o.p`（選項 B），也不採「不 kill 的弱定義」折衷。
  條件：§22 (1) 不標「完全修正」，只標「`o` 不再被定義」；選項 B 與其成本（`lib/dujs/var.js:48`、`lib/dujs/defuseanalyzer.js:77`／`:600`、
  `lib/dujs/outputwriter.js:394-432`）記為新的後續 KI（FR-011）；明寫 all-uses 的損失（P25 的 `o: L2 -> L3`、`o: L4 -> L5` 消失，US1 情境 7），
  golden-diff／mdn-diff 另設「屬性寫入→讀取損失」分類，不併入修正（FR-009、FR-010、SC-004）；README Limits 的「assigning to `a.b` defines `a`」同步改寫（FR-012）。
- **D002 → A**：§23 的放寬只適用 `const`／`let`。P6（`var o = new A()`）維持不連結，寫進 README 限制（理由：`var` 有 `undefined` 初值，頁面定義數為 2，
  見 `lib/dujs/callresolver.js:313-320`、`lib/dujs/scopebinding.js:791`）。
- **D003 → A（附條件）**：不修 P21。§22 (5) 的剩餘情形全屬 KI §38 的 finallyExit 根因：只由例外進入的 `finally` 仍以正常路徑接續，
  形態有三——P21（呼叫端直接）、P23（經摘要 normalReturn 外溢到呼叫端，`lib/dujs/summary.js:245`）、P24（被呼叫端單純 `throw`，非遞迴）；
  §38 補記這三種形態並記「無可達的非例外進入時不帶出正常路徑」為窄修候選，§22 (5) 寫成「除 §38 的 `finally` 情形外已修」（FR-011）。
  P23、P24 列入 probes 作防回歸基準。FR-006／FR-007 的不變量改為與 reachingsolver 獨立的判定，P21、P23、P24 列為已知違反（允許清單）。
- **D004 → A（改措辭）**：物件變數為 `localStorage` 的成員目標，定義與使用一律與 `develop` 相同，整個豁免 FR-001、FR-002（不寫成「仍定義 `localStorage`」——`++`、`.a.b` 在 `develop` 並不定義它）。驗收基準為「表示法」的凍結表與 `probes/pages/baseline-develop.txt`（兩頁探測，`probes/run-pages.js`）；凍結的缺口記入 KI §22 (4)（FR-011 (e)）。實測與裁判表的一處差異：`for (localStorage.k in a)` 在 `develop` 有讀取（`localStorage: L2 -> L3`，迴圈節點），凍結表以實測為準。
- **D005 → A（附前提）**：允許清單的根因判準由檢查器以差分方式執行（(a)(b)(c) 全開違反、關掉 (c) 後兩端皆可達），附見證、過期項使測試失敗，P21、P23、P24 為陽性對照（FR-008）；(a) 的「沒有正常返回」由檢查器自行重算，不讀求解器算出的 normalReturn（「表示法」、FR-007）。
- **specify 裁決（Fable，a2f0cad）**：`run.js` 只收 `p*.js` 並印出各函式的 intra-procedural pair（baseline 經比對只增不改）；新增 P28–P36（`let` 變體、FR-001 對呼叫解析的外溢、物件運算式中的讀取、暫時死區、宣告與賦值分開）；US1 情境 8 明寫 `||=` 只在決策節點讀 `o`；「表示法」(b) 改以迴圈記錄描述；FR-012 補 README L173。`let o; o = new A();`（P35）依 D2 的現行行為（P36 不連結）定為不放寬，兩者一致，不另發 DECISION。
- **P18 的 `Lnull`**：intra-page 中 `c: L1 -> L8>Lnull:F`（`probes/baseline-develop.txt`）是測試 helper `tests/helpers/analyze.js` 的 `nodeLabel` 對無行號節點的標記，
  不影響 CLI 輸出與 golden；既有測試（`tests/dujs/expansion.js:127`、`tests/dujs/splitcallnodes.js:251`）已釘住此字串。本 feature 不修，記入 known-issues（FR-011）。

### Session 2026-11-18（clarify；D006–D010 由主對話＋Fable 裁判裁決）

- Q: 差異紀錄中「屬性寫入→讀取損失」與「成員目標不是定義（修正）」如何區分？ → A（D006）：「損失」＝選項 B（屬性層級模型，FR-011 (a)）會保留的 pair，其餘為修正；由本 feature 新寫的 `specs/008-property-defs-method-calls/tools/diffcheck`（沿用 007 以 espree 取原始碼事實的機制，分類邏輯為可 require 的模組並自帶測試）依語法判定，準則寫入 `contracts/diff-check.md`（FR-009）。建立 008 diffcheck 已獲授權；工具建立後的任何修改、以及對 005／006／007 diffcheck 的任何改動，先發 DECISION。
- Q: FR-003／FR-005 的 inter-page 是否要有自己的驗收？ → A（D007）：要；新增兩頁 probe `probes/pages/s10-two-pages-method.js`，`run-pages.js` 加印 `inter-page (all):` 一行（既有輸出不動，baseline 只增不改，已核對），US1 情境 14。
- Q: `localStorage` 例外以什麼判定？ → A（D008）：Var 同一性——解析為 domain 的 `localStorage` Var（`binding.localStorageVar()`）才豁免；頁面層或函式內宣告的 `localStorage`、別名（`var s = localStorage; s.k = 2`）不豁免；`window.localStorage.*` 是 `window` 的成員目標（s11–s14，US1 情境 15）。
- Q: `f(a).p = 1` 的 `f(a)` 修正後是否仍連結？ → A（D009）：仍連結；inter-procedural 與 intra-page 保留 `o: L1 -> L3`、`v: entry -> L3`（US1 情境 13）。
- Q: P36 是否補成獨立情境？ → A（D010）：補 US2 情境 13。
- 依 clarifier 建議自行處理（主對話同意）：M5 → 新增 SC-007（FR-011／FR-012 的文件條目逐項核對）；M4 → 「延後釐清」；I2 → 憲章基線已有 v5.7.0（本專案 v5.6.0），沿用 007 作法，本 feature 不升級。

- clarify 裁決（Fable，f477220）：US1 情境 2 的分類改為 4 筆損失、2 筆修正；FR-009 補「整個物件讀取」、同一節點多個成員目標、p-use 與跨 scope；D008 的措辭同步到 FR-002 與凍結表前言；情境 6、14、15 補第四行、intra-page、s14 儲存節點數。
- Q: 使用端是呼叫位置時，消失的 pair 歸損失還是修正？ → A（D011）：裸識別字作 callee 或 `new` 運算元（P29–P32）歸修正；`o.m = fn; o.m()` 寫入路徑與 callee 路徑相同歸損失（同路徑優先），路徑不同歸修正（P37 正反例）。

### Session 2026-11-18（plan；D012–D017）

- Q: 成員目標右側的巢狀賦值（develop 中 `o.a.b = x = 1`、`this.p = x = 1` 不定義 `x`）要不要修？ → A（D012）: 維持 develop——GEN 只在右側「直接是」賦值／更新且 develop 會定義左側時遞迴（`lib/dujs/defuseanalyzer.js:608-611`），`o.p = x = 1`、`o.p = x++` 仍定義 `x`；這個通用缺口（不限成員目標）記為新 KI（FR-011 (g)），`o.a.b = x = 1`、`this.p = x = 1` 以 characterization 測試釘住；golden／MDN 影響 0 筆。
- Q: 「物件變數」遇到呼叫根的成員鏈（`localStorage.getItem(n).p = o`）如何判定？ → A（D013）: 沿 `.object` 鏈往左到達的識別字；鏈中遇到呼叫（或 `this`、括號中的其他運算式）即沒有物件變數，不豁免，FR-002 照常把被求值的識別字（`localStorage`、`n`）記為讀取（「表示法」、US1 情境 16、P42）；因此新增的 `localStorage` 讀取帶出的 inter-page pair 歸 FR-002「新增讀取」類（FR-009）。
- Q: 檢查器如何處理 CallSiteRecord 的 `exceptionalReturn`？ → A（D014）: 視為從呼叫節點出發的例外邊。理由：`exceptionalReturn` 由 `lib/dujs/expansion.js:592-606` 的 `finishCallRecords` 依圖結構設定（段 0 呼叫節點的 `.exception` 目標），求解器只在 `reachingsolver.js:292` 讀它，與 FR-007 的獨立性相容；實測（語料：probes＋golden fixture＋MDN 33 檔，plan 裁決時 Fable 重測）533 筆 record 中 524 筆即 `callNode.exception`，9 筆的呼叫節點沒有例外邊（鏈式呼叫的後段、決策前呼叫），0 筆為 null，下述斷言全部成立（原記「1278 筆：1230／39／9」未註明語料，以此為準）。條件：「呼叫節點無例外邊」的形態補單元測試；檢查器斷言每個非 null 的 `exceptionalReturn` 都是圖上某節點的 `.exception` 目標（「表示法」）。
- Q: (a) 的返回要不要分呼叫點？ → A（D015）: 分——同一 record 的 CALL 可到達且被呼叫端有正常返回，CALL RETURN 才可到達。這比「表示法」(a) 的字面嚴格，其可達集合是字面可達的子集，故通過即滿足 FR-006；以 P41 的可達集合測試（L10 的 CALL、CALL RETURN 與 L11 皆不可到達）釘住（US3 情境 8）。
- Q: 不變量測試的 MDN 語料從哪裡讀？ → A（D016）: 直接讀 `specs/006-eslint-scope/mdn/corpus`（先例 `tests/dujs/splitcallnodes.js:24` 讀 specs 下的檔案）；缺檔或檔數不是 33 時測試失敗、不得 skip，並核對 `specs/006-eslint-scope/mdn/README.md` 記載的 sha256（33 檔、1218 行）。
- Q: 決策條件中的無返回呼叫（P38–P40）仍產生決策節點的 p-use pair，怎麼處理？ → A（D017）: 納入 US3 修正（FR-013）。根因：007 的 deferred p-use（呼叫之前讀取、記為決策節點的 p-use）在 `defuseanalyzer.findDUPairs`（約 L278-293）以段節點的 reachIns 配對到 owner（決策節點）的兩個分支，不看 owner 是否被求解器 reached；owner 在無返回呼叫之後不可到達，關掉 (c) 仍違反。修正：owner 可到達時才配對（US3 情境 7）；intra-procedural 不拆分，不受影響。

### plan 裁決（2026-11-18，主對話＋Fable 裁判，對 97601c4；D018–D019）

- Q: US2 情境 5（P10）「與 develop 相同」與 FR-002 矛盾（US1 後 L3 `F.prototype.m = …` 讀 `F`）如何處理？ → A（D018）: 改為「不連結、有 `x: L1 -> L11`；另因 FR-002 新增 `F: entry -> L3`（intra(page)、inter[0]、intra-page）」，其餘與 develop 相同（Fable 原型 repo2 實測）。contracts/acceptance.md 與 quickstart.md 的 P10 同步。
- Q: 檢查器 (a) 對 generator／async 被呼叫端如何判定正常返回？ → A（D019）: 依被呼叫端 scope AST 的 `generator`／`async` 旗標判為有正常返回（語法判定、不讀摘要，FR-007 的獨立性不變）；「表示法」(a) 補記，contracts/reachability.md §2 修正，加單元測試——反例 `async function f(){ await f(); } f(); x = 1; console.log(x);`：求解器得 `x: L6 -> L7`（行號依測試程式），純結構重算會誤判 `f` 沒有正常返回而誤報。
- 其餘 plan 裁決（不改需求）：FR-013 移到 Foundational（檢查器建立後先報紅 P38–P40，再改 lib 轉綠）；階段檢查統一為「允許清單外 0 違反」；全量不變量測試在 Foundational 啟用、允許清單在 US3 定稿；FR-013 的 owner 可達判定採簡單版（`analysisResultOf(owner) === null` 即略過，產品呼叫端皆在 `doAnalysis` 之後），刪「model 未分析時維持現行行為」；P38–P40 修正前的違反以注入重現；D014 的數字改為上述語料實測。

### analyze 裁決（2026-11-18，主對話；D020）

- Q: P37 沒有驗收情境，SC-002 無從核對，怎麼處理？ → A（D020）: 新增 US1 情境 17（Fable 原型 repo2 實跑）：有 `o: L1 -> L2`、`o: L1 -> L5`、`q: L1 -> L6`、`q: L1 -> L7`、`x: L1 -> L8`，兩個呼叫都不連結（`o`、`q` 的定義是物件字面值，不是 class）；沒有 `o: L2 -> L5`、`q: L6 -> L7`。同次裁決的 tasks／plan 修正（golden manifest 手動同步、`eslint.config.js` 加 `probes008` ignore、MDN 提前比對等）不改需求，見 tasks.md。

- D021–D026（analyze／implement 與 T070 簽核的裁決）見 tasks.md 裁決節與 golden-diff／mdn-diff 簽核備註。

#### 延後釐清

- （M4，交 plan）inter-page 模型的獨立可到達判定以哪些節點為起點（每頁 entry、事件處理器經 LOOP 進入）、例外邊如何辨識（圖上的邊型別），由 plan 定案並寫入 contracts。

## 表示法

沿用 `specs/005-summary-analysis/spec.md` 與 `specs/007-split-call-nodes/spec.md`「表示法」：def-use pair 寫成 `<變數>: <def> -> <use>`；c-use 為節點標記；p-use 為
`<決策節點標記>><分支目標節點標記>`，目標不帶路徑時再加 `:T`／`:F`。節點標記為 `L<行>`、`entry` 或 `exit`。行號為被分析程式碼的行號（1 起算）。
「intra-procedural」「inter-procedural」「intra-page」「inter-page」指 dujs 產出的對應模型；未指明模型時，預期對 intra-procedural（頁面）、inter-procedural（若有）與 intra-page 都成立。
驗收程式一行一個節點來源。「沒有 X」表示該 pair 不得出現；未列出的 pair 不在該情境檢查範圍。

**成員目標**：賦值目標（`=`、複合賦值、邏輯賦值、`++`／`--`、解構賦值的元素、`for…in`／`for…of` 的左側）中的成員運算式 `E.p` 或 `E[k]`。
**物件變數**：自成員目標沿 `.object` 鏈一路往左到達的識別字（`o.p`、`o.p.q`、`o[k]`、`o[i].q` 中的 `o`）；鏈中遇到呼叫或其他非成員運算式（`localStorage.getItem(n).p`、`f(a).p`、`this.p`、`(a || b).p`）即**沒有物件變數**——不豁免 FR-001 的 `localStorage` 例外，FR-002 照常把物件運算式中被求值的識別字記為讀取（D013）。
**可到達（獨立判定）**：在某模型的圖上從 entry 做圖可達，但 (a) 被呼叫端「沒有正常返回」時，不經該呼叫的 return 邊到達 CALL RETURN 節點——「有沒有正常返回」由檢查器自行以同一判定在被呼叫端的圖上重算（被呼叫端的 exit 是否可經非例外路徑到達，遞迴取最小不動點），不讀 `summary.js` 的 normalReturn（它由求解器的 reached 算出，`lib/dujs/summary.js:245`）；
被呼叫端是 generator 或 async 函式（依其 scope AST 的 `generator`／`async` 旗標，語法判定、不讀摘要）時一律視為有正常返回——呼叫只建立 generator 物件或 promise，立即返回（D019）；
檢查器的 (a) 分呼叫點：同一呼叫的 CALL 可到達且被呼叫端有正常返回，該呼叫的 CALL RETURN 才可到達（D015；比本款字面嚴格，可達集合是字面可達的子集，故通過即滿足 FR-006）；被呼叫端未捕捉的例外以 CallSiteRecord 的 `exceptionalReturn` 視為從 CALL 出發的例外邊（D014；它由 `lib/dujs/expansion.js` 的 `finishCallRecords` 依圖結構取段 0 呼叫節點的例外目標設定，不是求解器的結果）；
(b) 迴圈記錄：LOOP 節點可到達時，其 LOOP RETURN 節點可到達（依 LoopRecord，不論圖上有無對應的邊）；事件處理器 exit 到 LOOP RETURN 的邊照常可走；(c) `finally` 的 finallyExit 的正常出邊，只有在該 `finally` 有可到達的非例外進入（try／catch 正常完成，或 `return`／`break`／`continue`）時才可走。
此判定 MUST 與 `lib/dujs/reachingsolver.js` 的 reached 計算與摘要分開實作（否則 pair 只由 reached 節點產生，檢查必然通過）。適用模型：intra-procedural（呼叫不透明，只套用 (c)）、inter-procedural、intra-page、inter-page（套用 (a)(b)(c)）。

**`localStorage` 成員目標的凍結行為（D004，驗收基準為 `probes/pages/baseline-develop.txt`，以 `probes/run-pages.js` 產生）**：物件變數依 Var 同一性解析為 domain 的 `localStorage` Var 的成員目標（FR-001 例外，D008），其定義與使用一律與 `develop` 相同，整個豁免 FR-001、FR-002。`develop` 的行為（第一頁 `localStorage.a = 1;` 之後的受測式，第二頁讀 `localStorage.k`）：

| 形式（`probes/pages/`） | 定義 `localStorage` | 讀取 `localStorage` | 受測式是儲存定義節點 |
|------|------|------|------|
| `localStorage.k = 2`（s1） | 是 | 否 | 是 |
| `localStorage.k += 2`（s2） | 是 | 是 | 是 |
| `localStorage.k ||= 2`（s3） | 是（`L2:F`） | 是（p-use） | 是 |
| `localStorage[k] = 2`（s4） | 是 | 否（`k` 也沒有使用） | 是 |
| `[localStorage.k] = a`（s5） | 是 | 否 | 否 |
| `for (localStorage.k in a)`（s6） | 是 | 是（迴圈節點，`localStorage: L2 -> L3`） | 否 |
| `localStorage.k++`（s7） | 否 | 是 | 否 |
| `localStorage.a.b = 2`（s8） | 否 | 否 | 否 |
| `x = (localStorage.k = 1)`（s9） | 是 | 否 | 否 |


## User Scenarios & Testing *(mandatory)*

使用者為以 dujs 分析 client-side JavaScript 資料流程的研究者或工具開發者，透過 CLI 或函式庫 API 取得四層模型與 def-use pair，並以 pair 產生測試需求與測試路徑。
把 `o.p = 1` 當成 `o` 的定義，會報出不存在的 `o` 的 pair、漏掉真正的物件來源，並讓之後的 `o.m()` 無法解析；函式中 `o.m()` 不連結，會漏掉方法的效果（MDN「Object building practice」的
`evilBall.draw()` 等）；無法到達的程式碼若仍產生 pair，會產生不可能實現的測試需求。

### User Story 1 - 成員賦值是物件變數的使用，不是它的定義 (Priority: P1)

分析者寫 `o.p = 1`、`o.p.q = 2`、`o[k] = 3`、`[o.p] = a` 這類對物件屬性的賦值時，dujs 把它們視為「讀取 `o`（與鍵 `k`）」，而不是「重新定義 `o`」；
`o` 的到達定義仍是原本建立物件的那個定義，所以之後的 `o.m()` 能照常解析。以 `localStorage` 為物件變數的成員目標整個維持 `develop` 的行為（「表示法」的凍結表；inter-page 模型依賴它）。

**Why this priority**: 這是錯誤的 pair（多報與漏報）且影響呼叫解析；MDN 範例中物件屬性賦值極為常見，修正後 pair 的定義端才正確。也是 US2 能涵蓋 P9 的前提。

**Independent Test**: 以 P1–P4、P12、P25、P27、P29–P33、P37、P42 與 `probes/pages/` 的 s1–s14 執行，比對 intra-procedural、inter-procedural、intra-page、inter-page 的 pair 與連結。

**Acceptance Scenarios**:

1. **Given** P1（`var o = new A();` L7、`o.p = 1;` L8、`o.m();` L9），**When** 分析，**Then** `o.m()` 連結到 `A` 的 `m`；有 `o: L7 -> L8`、`o: L7 -> L9`、`x: L4 -> L10`（inter-procedural 與 intra-page）；沒有 `o: L8 -> L9`、`x: L1 -> L10`（inter-procedural 與 intra-page）。intra-procedural（頁面）有 `o: L7 -> L8`、`o: L7 -> L9`，沒有 `o: L8 -> L9`。
2. **Given** P2（`var o = {}, a = [1], k = 'p';` L1，L2–L10 為各種成員目標），**When** 分析，**Then** L2–L10 都不是 `o` 的定義：`o` 的每個使用都只得到 `o: L1 -> …`，即有 `o: L1 -> L2`、`o: L1 -> L3`、`o: L1 -> L4`、`o: L1 -> L5`、`o: L1 -> L6`、`o: L1 -> L7`、`o: L1 -> L8`、`o: L1 -> L9`、`o: L1 -> L10`、`o: L1 -> L11`（L2、L3、L4、L7、L9 在 `develop` 沒有 `o` 的使用）；L4 有 `k: L1 -> L4`；沒有 `o: L4 -> L5`、`o: L5 -> L6`、`o: L7 -> L8`、`o: L8 -> L8`、`o: L9 -> L10`、`o: L9 -> L11` 等以 L2–L10 為定義端的 `o` 的 pair。差異分類（D006）：損失 4 筆——`o: L5 -> L6`（寫 `o.p` 後讀 `o.p`）、`o: L4 -> L5`（寫 `o[k]` 後讀 `o.p`，計算鍵模糊例，預設歸損失）、`o: L9 -> L10`（`delete o.p` 讀同一路徑）、`o: L9 -> L11`（`console.log(o)` 整個物件讀取）；修正 2 筆——`o: L7 -> L8`、`o: L8 -> L8`（`for (o.p of a)` 左側只寫不讀 `o.p`）。
3. **Given** P3（`localStorage.k = v;` L2、`window.f = 1;` L4、`document.title = 'a';` L6），**When** 分析，**Then** 仍有 `localStorage: L2 -> L3`、`v: L1 -> L2`；`window`、`document` 的使用只得到 `entry`（`window: entry -> L5`、`document: entry -> L7`、`window: entry -> L4`、`document: entry -> L6`）；沒有 `window: L4 -> L5`、`document: L6 -> L7`。
4. **Given** P4，**When** 分析，**Then** 有 `localStorage: L1 -> L4`（儲存定義保留）、`o: L2 -> L3`、`o: L2 -> L4`；沒有 `o: L3 -> L4`（L4 讀 L3 寫入的 `o.p`，差異分類為損失，D006）。
5. **Given** P12（被呼叫端 `g` 做 `o.p = 1;` L9，頁面 `g();` L11、`o.m();` L12），**When** 分析，**Then** intra-page 有 `o: L7 -> L12`、`o: L7 -> L9`、`x: L4 -> L13`；沒有 `o: L9 -> L12`。
6. **Given** `probes/pages/` 的 s1–s9（兩頁程式，第一頁 L1 `localStorage.a = 1;`、受測式、`console.log(localStorage.k);`，第二頁 L1 讀 `localStorage.k`；s4–s6、s9 多一行宣告），**When** 以 `probes/run-pages.js` 分析，**Then** 輸出與 `probes/pages/baseline-develop.txt` 逐行相同（第一頁 intra-procedural 的 pair、儲存定義節點數、inter-page 的 `localStorage` pair）；例：s1 有 `localStorage: L2 -> L3`，inter-page 有 `localStorage: L2 -> L1`（第二頁 L1）。第四行 `inter-page (all)`（D007 加印）對 s1–s9 也 MUST 與 develop 相同。
7. **Given** P25（`var o = {p: 0};` L1、`o.p = 1;` L2、`var y = o.p;` L3、`o.p = 2;` L4、`console.log(o.p, y);` L5），**When** 分析，**Then** 有 `o: L1 -> L2`、`o: L1 -> L3`、`o: L1 -> L4`、`o: L1 -> L5`、`y: L3 -> L5`；沒有 `o: L2 -> L3`、`o: L4 -> L5`。後兩者的消失是選項 A 的已知損失（屬性寫入到讀取的資料流不再以 pair 表示，D001），記入 known-issues 的後續項目，不視為修正。
8. **Given** P27（`var x = 0, o = {};` L1，`o.p ||= 1;` L6，`o[g()] = 2;` L7，`console.log(o, x);` L8），**When** 分析，**Then** 有 `o: L1 -> L6>L6:F`、`o: L1 -> L6>L7:T`（與 `develop` 同）、`o: L1 -> L7`、`o: L1 -> L8`、`x: L3 -> L8`（`g()` 仍連結，inter-procedural 與 intra-page）；沒有 `o: L7 -> L8`。`o.p ||= 1` 由分支拆分成決策節點（讀 `o.p`，p-use）與 F 分支的賦值節點（`L6:F`）；`o` 只在決策節點求值一次，F 分支的賦值節點不另加 `o` 的 c-use（沒有 `o: L1 -> L6` 的 c-use），也不定義 `o`。差異分類：消失的 `o: L7 -> L8`（`console.log(o, x)` 整個物件讀取）為損失。
9. **Given** P29（`function f` L2–L4、`f.p = 1;` L5、`f();` L6），**When** 分析，**Then** `f()` 連結到 `f`；有 `f: entry -> L5`、`f: entry -> L6`、`x: L3 -> L7`（inter-procedural 與 intra-page；函式宣告在 entry 定義，同 P14 的 `f: entry -> L7`）；沒有 `f: L5 -> L6`、`x: L1 -> L7`。（FR-001 對呼叫解析的外溢）
10. **Given** P30（`f.p = function () { x = 2; };` L5–L7、`f();` L8），**When** 分析，**Then** `f()` 連結到 `f`（不再連到 L5 的匿名函式）；有 `x: L3 -> L9`；沒有 `f: L5 -> L8`、`x: L6 -> L9`（inter-procedural 與 intra-page）。
11. **Given** P31（`A.count = 0;` L7、`new A();` L8），**When** 分析，**Then** `new A()` 連結到 `A` 的 constructor；有 `x: L4 -> L9`；沒有 `A: L7 -> L8`、`x: L1 -> L9`。
12. **Given** P32（`f.p = 1;` L5，函式 `g` 中 `f();` L7），**When** 分析，**Then** `f()` 依 D2 連結（頁面唯一定義只剩函式宣告）；有 `x: L3 -> L10`；沒有 `x: L1 -> L10`、`f: L5 -> L7`。
13. **Given** P33（`f(a).p = 1;` L5、`o[i].q = 2;` L6），**When** 分析，**Then** 有 `a: L1 -> L5`、`o: L1 -> L6`、`i: L1 -> L6`、`f: entry -> L5`；`f(a)` 仍連結，inter-procedural 與 intra-page 保留 `o: L1 -> L3`、`v: entry -> L3`（D009）；L5、L6 都不定義任何變數。
14. **Given** `probes/pages/s10-two-pages-method.js`（第一頁：`class A` 的 `m() { x = 1; }` L3、`const o = new A();` L5、`function g` 中 `f(); o.m();` L8–L9、`o.p = 1;` L11、`g();` L12、`localStorage.k = x;` L13；第二頁讀 `y`、`localStorage.k`），**When** 以 `run-pages.js` 分析，**Then** `inter-page (all)` 中第一頁的 pair 有 `o: L5 -> L9`、`o: L5 -> L11`、`x: L3 -> L13`，沒有 `o: L11 -> L9`、`x: L6 -> L13`（develop 有後兩者）；`localStorage: L13 -> L7`（第二頁 L7）與第二頁的 pair 與 develop 相同；第一頁的 intra-page 模型也有 `o: L5 -> L9`、`o: L5 -> L11`、`x: L3 -> L13`，沒有 `o: L11 -> L9`、`x: L6 -> L13`（FR-003 的 intra-page）。標記不含頁別，行號依情境所述頁別解讀。（FR-003、FR-005，D007）
15. **Given** `probes/pages/` 的 s11–s14（D008），**When** 以 `run-pages.js` 分析，**Then**：s11（函式內 `let localStorage = {};` L3、`localStorage.k = 2;` L4）有 `localStorage: L3 -> L4`、`localStorage: L3 -> L5`，沒有 `localStorage: L4 -> L5`，儲存定義節點數 1；s12（頁面 `var localStorage = {};` L1、`localStorage.k = 2;` L2）有 `localStorage: L1 -> L2`、`localStorage: L1 -> L3`，沒有 `localStorage: L2 -> L3`，儲存定義節點數 0；s13（`var s = localStorage;` L2、`s.k = 2;` L3）有 `s: L2 -> L3`、`s: L2 -> L4`，沒有 `s: L3 -> L4`，儲存定義節點數 1；s14（`window.localStorage.k = 2;` L2、`+= 3` L3、`window.f = 1;` L4）有 `window: entry -> L2`、`window: entry -> L3`、`window: entry -> L4`、`window: entry -> L5`，沒有 `window: L4 -> L5`，儲存定義節點數 1（與 develop 同）；s13、s14 的 `inter-page localStorage` 行與 develop 相同；s11 中 domain `localStorage` 的 pair 不變（`localStorage: L1 -> L1`（第二頁 L1）、`localStorage: L1 -> L8`），被遮蔽或頁面宣告的 `localStorage` 的 pair 依上述改變（`inter-page localStorage` 與 `inter-page (all)` 兩行對應更新）。
16. **Given** P42（`var n = 'k', o = 1;` L1、`localStorage.getItem(n).p = o;` L2、`console.log(localStorage);` L3），**When** 分析，**Then** L2 不定義任何變數，也不是儲存定義節點（與 develop 同）；L2 讀取 `localStorage` 與 `n`（物件運算式是呼叫，沒有物件變數，不豁免，D013）：有 `n: L1 -> L2`、`o: L1 -> L2`、`console: entry -> L3`。`localStorage` 在頁面上沒有定義時是否產生 pair 依 develop 慣例（develop 中 L3 讀 `localStorage` 也沒有 pair），以實跑為準由實作確認並寫入測試；L2 的讀取以該節點的 USE 集合斷言。develop 只有 `console: entry -> L3`、`o: L1 -> L2`。
17. **Given** P37（`var x = 0, o = {}, q = {m: function () {}};` L1、`o.m = function () {…};` L2–L4、`o.m();` L5、`q.n = 1;` L6、`q.m();` L7、`console.log(x);` L8），**When** 分析，**Then** 有 `o: L1 -> L2`、`o: L1 -> L5`、`q: L1 -> L6`、`q: L1 -> L7`、`x: L1 -> L8`；沒有 `o: L2 -> L5`、`q: L6 -> L7`（develop 有，差異分類分別為損失與修正，D011）；`o.m()`、`q.m()` 都不連結（定義是物件字面值，不是 class；與 develop 同）。（D020）

---

### User Story 2 - 函式中的 `o.m()` 在 `o` 只有一個 `new A()` 定義時連結 (Priority: P1)

分析者在函式（含方法、事件處理器）中呼叫外層物件的方法 `o.m()`，而 `o` 在函式內沒有到達的定義時，若 `o` 在整個頁面上只有一個定義、它是 `const`／`let` 宣告的 `new A(…)`
且 `A` 解析為 class，dujs 把 `o.m()` 連到 `A` 的實例方法 `m`——與 005 D2 對 `f()`、FR-018 對 `new A()`／`A.s()` 的放寬一致。

**Why this priority**: MDN「Object building practice」評量（`a05-assessment-main.js` L198–200 的 `evilBall.draw()`、`checkBounds()`、`collisionDetect()`）因此漏掉方法的效果；是 008 主要目標之一。

**Independent Test**: 以 P5–P11、P26、P28、P34–P36 執行，比對連結與 pair；以 MDN `a05-assessment-main.js` 檢查 `loop()` 中的三個呼叫連結。

**Acceptance Scenarios**:

1. **Given** P5（KI §23 程式），**When** 分析，**Then** `o.m()`（L9）連結到 `A` 的 `m`；有 `x: L4 -> L12`；沒有 `x: L1 -> L12`（inter-procedural 與 intra-page）。
2. **Given** P8（事件處理器 `h` 中 `o.m();` L9，處理器 `k` 讀 `x` L12），**When** 分析，**Then** intra-page 有 `x: L4 -> L12`（並保留 `x: L1 -> L12`，因 `k` 可能先於 `h` 執行）。
3. **Given** P9（頁面先 `o.p = 1;` L8），**When** 分析，**Then** `o.m()`（L10）連結，有 `x: L4 -> L13`；沒有 `x: L1 -> L13`（需 US1）。
4. **Given** P7（`let o` 在頁面上有兩個定義），**When** 分析，**Then** 結果與 `develop` 相同：不連結，有 `x: L1 -> L15`。
5. **Given** P10（`o = new F()`，`F` 是函式），**When** 分析，**Then** 不連結（與 `develop` 同），有 `x: L1 -> L11`；另因 FR-002（US1），L3 `F.prototype.m = …` 讀取 `F`，intra(page)、inter-procedural（inter[0]）與 intra-page 新增 `F: entry -> L3`——此 pair 以外與 `develop` 相同（D018）。
6. **Given** P11（函式內 `var o = new B();` 遮蔽外層），**When** 分析，**Then** 結果與 `develop` 相同：連結 `B` 的 `m`，有 `x: L9 -> L18`。
7. **Given** P6（`var o = new A()`），**When** 分析，**Then** 結果與 `develop` 相同：不連結（D002：放寬只適用 `const`／`let`；`var` 的 `undefined` 初值使頁面定義數為 2）。
8. **Given** MDN `a05-assessment-main.js`，**When** 分析，**Then** `loop()` 中的 `evilBall.draw()`、`evilBall.checkBounds()`、`evilBall.collisionDetect()` 連結到 `EvilCircle` 的對應方法。
9. **Given** P26（`var o = new A();` 另在未呼叫的 `h` 中 `o = null;`），**When** 分析，**Then** 結果與 `develop` 相同：不連結，有 `x: L1 -> L15`。
10. **Given** P28（`let o = new A();` L7，未被呼叫的 `h` 中 `o = null;` L9），**When** 分析，**Then** 結果與 `develop` 相同：不連結，有 `x: L1 -> L15`（未被呼叫函式中的賦值也算頁面定義）。
11. **Given** P34（`g();` L10 在 `const o = new A();` L11 之前），**When** 分析，**Then** `o.m()`（L8）連結，有 `x: L4 -> L12`；沒有 `x: L1 -> L12`（放寬忽略執行順序，實際執行會在暫時死區拋錯；記入 README 限制）。
12. **Given** P35（`let o;` L7、`o = new A();` L8），**When** 分析，**Then** 結果與 `develop` 相同：不連結，有 `x: L1 -> L13`——與 D2 對同一形式的行為一致（P36 `let f; f = function () {…};` 在 develop 不連結）。
13. **Given** P36（`let f;` L2、`f = function () { x = 1; };` L3–L5，函式 `g` 中 `f();` L7），**When** 分析，**Then** 結果與 `develop` 相同：不連結，有 `x: L1 -> L10`；inter-procedural 保留 `f: L3 -> L7`（D010）。

---

### User Story 3 - 無法到達的程式碼不產生 pair (Priority: P2)

分析者分析含無條件遞迴（或其他永不正常返回的呼叫）的程式時，dujs 不會為呼叫之後無法到達的程式碼產生 pair，也不會讓其中的定義流到可到達的節點；
本 feature 以一個與資料流程求解器獨立的可到達性判定，自動檢查 005 之後的殘留，並把查核範圍與結果記入 known-issues。決策條件中的無返回呼叫（P38–P40）仍產生決策節點的 p-use pair，本 feature 修正（FR-013，D017）；其餘剩餘情形（P21、P23、P24）全屬 KI §38 的 finallyExit 根因，本 feature 不修（D003），列為已知違反並補記到 §38。

**Why this priority**: 005 已消除 KI 原例的 pair（P13）；本 story 主要是系統性查核與防回歸，修正量小（產品程式碼只改 deferred p-use 的配對條件，FR-013；若獨立判定找到其他 §38 以外的違反，依 FR-008 處理）。

**Independent Test**: 對 PRB、golden fixture 與 MDN 範例集的每個 intra-procedural（只套用 (c)）、inter-procedural、intra-page、inter-page 模型檢查不變量（FR-007）；以 P38–P41 比對 pair 與可達集合。

**Acceptance Scenarios**:

1. **Given** P13（KI §22 (5) 程式），**When** 分析，**Then** intra-page 只有 `A: L2 -> L8`；沒有 `x: L5 -> L9`、`x: L1 -> L9`、`console: entry -> L9`。
2. **Given** P14、P15、P18、P19、P20，**When** 分析，**Then** inter-procedural 與 intra-page 沒有以無返回呼叫之後的節點為定義端或使用端的 pair（P14 沒有 `y: L4 -> L5`、`x: L5 -> L8`；P18 沒有 `x: L11 -> L9`；P19 沒有 `x: L10 -> L14`；P20 的 `x` 的 pair 只有 `x: L1 -> L10`；P15 沒有 `x: L2 -> L5`、`console: entry -> L5`）。intra-procedural 模型（呼叫不透明）不受此限（P14 的 intra(f) 仍有 `y: L4 -> L5`）。
3. **Given** P16、P17（遞迴會正常返回），**When** 分析，**Then** 結果與 `develop` 相同（`x: L4 -> L7`、`x: L6 -> L4`）。
4. **Given** PRB、golden fixture 與 MDN 範例集，**When** 以獨立判定（「表示法」的可到達）檢查每個 intra-procedural（只套用 (c)）、inter-procedural、intra-page、inter-page 模型，**Then** 不在允許清單中的違反數為 0；允許清單每一項都通過 FR-008 的差分判準（finallyExit 根因），並附檢查器輸出的見證。
5. **Given** P21、P23、P24，**When** 分析，**Then** 結果與 `develop` 相同（P21 `x: L1 -> L11`；P23 `x: L11 -> L14`；P24 `x: L1 -> L11`）；檢查器 (a)(b)(c) 全開時把這些 pair 報為違反、關掉 (c) 後兩端皆可達（FR-008 判準的陽性對照），並由允許清單放行。
6. **Given** 一個注入了兩端不可到達之 pair 的模型（測試中人工加入，不經求解器），**When** 執行不變量檢查且該 pair 不在允許清單，**Then** 檢查失敗（陽性對照，注入方式由 plan 決定）。
7. **Given** P38（`f` 無條件遞迴，`if (f()) {` L5、`x = 1;` L6、`console.log(x);` L8）、P39（`if (g(f())) {` L8、`x = 1;` L9、`console.log(x);` L11）、P40（`while (f()) {` L5，其餘同 P38），**When** 分析，**Then** inter-procedural 與 intra-page 沒有 P38 的 `f: entry -> L5>L6:T`、`f: entry -> L5>L8:F`，沒有 P39 的 `g: entry -> L8>L9:T`、`g: entry -> L8>L11:F`，沒有 P40 的 `f: entry -> L5>L6:T`、`f: entry -> L5>L8:F`（develop 有，D017）；仍有 P38、P40 的 `f: entry -> L3`，P39 的 `f: entry -> L3`、`f: entry -> L8`（段 0 的讀取可到達）。intra-procedural（頁面）不變（呼叫不透明，仍有上述 p-use pair）；檢查器對三者全開無違反。（FR-013）
8. **Given** P41（`h()` 會返回、`r()` 無條件遞迴；`h();` L8、`r();` L9、`h();` L10、`console.log(x);` L11），**When** 以檢查器計算 inter-procedural 與 intra-page 模型的可達集合，**Then** L10 的 CALL、CALL RETURN 與 L11 皆不可到達（(a) 分呼叫點，D015；照圖走 return 邊時 `h` 的 exit 經 L8 可到達會使 L10 的 CALL RETURN 誤判可到達）；pair 與 develop 相同（inter-procedural 只有 `h: entry -> L8`、`r: entry -> L6`、`r: entry -> L9`）。

---

### Edge Cases

- `this.p = v`、`super.p = v`：沒有物件變數，維持不定義任何變數（與 `develop` 同）。
- `o.p = v` 中 `v` 的求值、計算鍵中的呼叫（`o[g()] = v`）沿用 007 的分段與呼叫點規則；`for (o[g()] of a)` 仍不是呼叫點（KI §46）。
- 複合賦值、邏輯賦值、`++`／`--` 的成員目標（`o.p += 1`、`o.p ||= 1`、`o.p++`）：讀取 `o`，不定義 `o`。
- `delete o.p`：讀取 `o`，不定義 `o`（與 `develop` 同）。
- 以 domain 的 `localStorage` Var 為物件變數的成員目標（Var 同一性，D008；被遮蔽、頁面宣告或別名不算）：定義與使用一律與 `develop` 相同（「表示法」的凍結表，D004），整個豁免 FR-001、FR-002；表中的缺口（`localStorage[k]` 不讀 `k`；`=`、`.a.b`、解構不讀 `localStorage`；解構與 `for…in` 有定義卻不是儲存定義節點；巢狀 `x = (localStorage.k = 1)` 不是儲存定義節點）凍結，記入 KI §22 (4)（FR-011 (e)），本 feature 不修。
- 被呼叫端中的成員賦值：經摘要不再是呼叫端 `o` 的定義或殺除（P12）。
- §23 的放寬只在函式中、且 `o` 在函式的 intra-procedural 模型中沒有到達的定義時適用；有到達的定義時沿用嚴格規則（P11）；頁面程式碼不放寬。
- §23 的 `A` 在 `new A(…)` 的節點依既有規則解析（含 FR-018 的 class 放寬）；`A` 不是 class（函式建構子、`var A = class {}` 等不解析為 class 者）不放寬（P10）。
- 放寬忽略執行順序（如同 D2 與 FR-018）：函式在 `const o = new A()` 之前被呼叫（暫時死區）也會連結（P34）；記入 README 的限制。
- 宣告與賦值分開（`let o; o = new A();`）：與 D2 的判準一致——`let o;` 也算一個定義，頁面定義數為 2，不放寬（P35；D2 對 `let f; f = function () {…}` 同樣不連結，P36）。
- FR-001 也影響呼叫解析：函式或 class 的屬性賦值（`f.p = 1`、`A.count = 0`）不再蓋掉 `f`／`A` 的定義，嚴格規則與 D2 的頁面唯一定義計數都不再算它（P29–P32）。
- 常數條件（`while (true)`、`if (false)`）不求值，兩個分支都算可到達（P22），不在 US3 範圍。
- intra-procedural 模型中的呼叫不透明：呼叫之後的節點都算可到達（P14 intra(f)）。
- 決策條件中的呼叫之前讀取的變數（deferred p-use，007）：決策節點不可到達時（條件中的呼叫永不正常返回，P38–P40）不產生 p-use pair；段 0 的 c-use 照常（FR-013）。
- 成員目標右側的巢狀賦值（`o.a.b = x = 1`、`this.p = x = 1`、`y = (x = 5, 3)` 等）不定義內層變數：develop 的既有缺口，維持不修（D012，FR-011 (g)）。
- 已知限制照舊、不在本 feature 修正：KI §38（`finally` 多入口；P21、P23、P24 補記，D003）、§41、§42、§43、§44、§48、§50；測試 helper 的 `Lnull` 標記（P18，記入 KI）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 成員目標 MUST 不是任何變數的定義。例外：物件變數依 Var 同一性解析為 domain 的 `localStorage` Var（`binding.localStorageVar()`，與 `lib/dujs/hierarchy.js:421-428` 的儲存定義判定相同）時，該成員目標的定義與使用一律與 `develop` 相同（「表示法」的凍結表，整個豁免 FR-001、FR-002；D004、D008）。不豁免：頁面層或函式內宣告的 `localStorage`、別名（`var s = localStorage; s.k = 2`）；`window.localStorage.k = v` 是 `window` 的成員目標（讀 `window`，不定義任何變數）。[SRC KI §22 (1)；PRB P1–P4；`probes/pages/` s1–s14]
- **FR-002**: 成員目標中被求值的部分 MUST 記為讀取：物件運算式中所有被求值的識別字——物件變數（含 `o.p.q` 中的 `o`）、計算鍵（`o[k]` 的 `k`，含巢狀 `o[i].q` 的 `i`）、物件運算式中的 callee 與引數（`f(a).p = 1` 的 `f`、`a`）——是該節點的 c-use（在決策節點中依 007 FR-003 為 p-use）。`for…in`／`for…of` 左側的成員目標，其讀取留在迴圈節點（007 KI §46）。物件變數為 domain 的 `localStorage` Var 時不適用（FR-001 例外，D008）：`localStorage[k] = v` 的 `k`、`localStorage.a.b = v` 的 `localStorage` 不新增使用。[SRC KI §22 (1)；PRB P2、P27、P33]
- **FR-003**: FR-001、FR-002 MUST 在所有模型（intra-procedural、inter-procedural、intra-page、inter-page）與被呼叫端的摘要中一致適用。[SRC KI §22 (1)；PRB P12]
- **FR-004**: 在函式（含方法、事件處理器、欄位初始化式等非頁面 scope）中，`o.m(…)` 的 `o` 在該函式的 intra-procedural 模型中沒有到達的定義時，若 `o` 的 binding（可宣告於任何 scope，含外層函式）在整個頁面的所有程式碼中恰有一個定義（依 FR-001，成員賦值不計），且該定義是 `const`／`let` 宣告的 `new A(…)`、`A` 在該定義的節點解析為 class，則 MUST 連到該 class 的實例方法 `m`（不含 constructor，同既有 `o.m()`）。其餘情形沿用既有的嚴格規則（004 FR-018）。[SRC KI §23；F005 D2；PRB P5–P11]
- **FR-005**: FR-004 的連結 MUST 與其他呼叫點相同地參與 007 的分段、005 的摘要與 call／return 配對資訊（`*.matching.json`），沒有新的節點型別、邊型別或輸出格式；inter-page 模型沿用頁面模型的連結結果（與既有放寬相同）。[SRC F007]
- **FR-006**: intra-procedural（只套用 (c)）、inter-procedural、intra-page、inter-page 模型中，每個 pair 的定義節點與使用節點 MUST 依「表示法」的獨立判定都可到達，允許清單除外（D003）。[SRC KI §22 (5)、§38；PRB P13–P24、P38–P41]
- **FR-007**: MUST 有一個自動化的不變量檢查（測試）驗證 FR-006，涵蓋 PRB、golden fixture 與 MDN 範例集；其可到達判定（含 (a) 的「沒有正常返回」）MUST 自行計算，不呼叫或重用 `reachingsolver` 的 reached 與 `summary` 的 normalReturn，並有陽性對照（P21、P23、P24，US3 情境 5；注入的不可到達 pair，US3 情境 6）。允許清單以明列的（程式、模型、pair）表示，不以規則放行。[SRC KI §22 (5)；D003、D005]
- **FR-008**: 允許清單的判準 MUST 由檢查器以差分方式執行（D005）：檢查器跑兩次——(a)(b)(c) 全開、只開 (a)(b)；一項 pair 可列入允許清單，若且唯若「全開時違反、關掉 (c) 後兩端皆可達」（finallyExit 根因）。測試 MUST 在下列情形失敗：允許清單項不符此判準；允許清單項已不再違反（過期）；有允許清單以外的違反。
  每項允許清單 MUST 附檢查器輸出的見證（finallyExit 所在 scope 與行號、該 `finally` 可到達的非例外進入邊數 = 0），寫入 `golden-diff.md`／`mdn-diff.md` 或 KI §38，供 validator 重跑比對。關掉 (c) 仍違反者（非 finallyExit 根因）MUST 修正（屬本 feature 範圍者）或發 DECISION 由使用者裁決。P21、P23、P24 MUST 先通過此判準，作為陽性對照。[SRC KI §22 (5)、§38；D005]
- **FR-009**: golden 的每一處差異 MUST 以差異工具（比對基準固定 `develop` `2035c93`，寫在紀錄的基準行）逐筆記錄於 `specs/008-property-defs-method-calls/golden-diff.md`，對應到本 spec 的 FR 或 KI 節次並分類（「屬性寫入→讀取損失」（D001，如 P25）為獨立分類，不併入修正；判準見下），差異以去重後的 pair 比對並另列重複列數（KI §43）；經使用者簽核後更新 golden 與 `tests/golden/manifest.json`。[SRC USR R2；F007 FR-008]
  損失判準（D006）：一筆因 FR-001 消失的 pair（定義端是成員目標）為「損失」，若且唯若選項 B（屬性層級模型）會保留它——使用端節點讀取了定義端寫入的同一屬性路徑（P25 L3 讀 L2 寫入的 `o.p`；P4 的 `o: L3 -> L4`；P2 的 `o: L5 -> L6`）；其餘為「修正」（P1 L9 `o.m()` 讀的是 `m` 不是 `p`）。模糊情形明文化並預設歸損失：計算鍵（寫或讀 `o[k]`，如 P2 的 `o: L4 -> L5`）、路徑前綴重疊（寫 `o.p.q` 讀 `o.p`，或反之）、同一行多個敘述。整個物件的讀取（`console.log(o)`，可能讀到任何屬性）歸損失；`o.m()` 歸修正（語法層判定：方法 `m` 內讀 `this.p` 的流動選項 B 也不追，不代表語意上沒有資料流，golden-diff 的分類說明須寫明）；`delete o.p` 讀 `o.p`（同路徑時歸損失）。整個物件的讀取指 `o` 的使用不在成員運算式的物件位置（引數 `console.log(o)`、別名 `var s = o`、`return o`、`if (o)`、`typeof o`），一律損失（P2 `o: L9 -> L11`、P27 `o: L7 -> L8`）。呼叫位置（D011）：裸識別字作 callee 或 `new` 運算元（P29 `f: L5 -> L6`、P30 `f: L5 -> L8`、P31 `A: L7 -> L8`、P32 `f: L5 -> L7`）歸修正（呼叫語法上不讀該屬性路徑）；方法呼叫 `o.m()` 的 callee 路徑與寫入路徑相同（`o.m = fn; o.m()`）時歸損失（同路徑優先，P37 `o: L2 -> L5`），路徑不同時歸修正（P1、P37 `q: L6 -> L7`）。同一節點多個成員目標（`[o.p, o.q] = a`、`o.p = o.q = 1`）：任一寫入路徑符合即損失。使用端為 p-use，或位於被呼叫端（跨 scope）時，用同一語法判定。物件運算式中新增的讀取（含沒有物件變數的成員目標，如 P42 的 `localStorage.getItem(n).p` 讀 `localStorage`、`n`，D013）帶出的新 pair——包括新增的 `localStorage` 讀取帶出的新 inter-page pair——歸 FR-002「新增讀取」類，不併入 `localStorage` 凍結（D004）。判準由 `specs/008-property-defs-method-calls/tools/` 的差異工具機械判定（分類邏輯為可 require 的模組、自帶測試，正反例至少含 P1、P25、P4、P2），準則寫入 `contracts/diff-check.md`；plan 評估 007 差異工具已知限制（去後綴集合比對看不出同一行不同段的缺漏，007 T068 (d)）對 FR-002 新增讀取的影響。MDN 差異（FR-010）用同一判準。
- **FR-010**: MDN 範例集（`specs/006-eslint-scope/mdn/corpus` 的 33 個程式）MUST 以本 feature 與 `develop`（`2035c93`）各跑一次，每一個新增或消失的 pair 記錄於 `specs/008-property-defs-method-calls/mdn-diff.md` 並分類（見 SC-004）；新發現的問題記入 `docs/known-issues.md`。[SRC USR R2；F007 FR-009]
- **FR-011**: `docs/known-issues.md` MUST：
  (a) §22 (1) 加修正說明「`o` 不再被成員賦值定義（部分修正）」，不標為完全修正；新增後續 KI 記錄屬性層級定義（選項 B：`o.p = v` 定義 `o.p`、讀 `o.p` 使用 `o.p`、重新定義 `o` 時殺掉 `o.p`）、其成本（`lib/dujs/var.js:48`、`lib/dujs/defuseanalyzer.js:77`／`:600`、`lib/dujs/outputwriter.js:394-432`）與 all-uses 損失的例子（P25）；
  (b) §23 標為已修正（保留原描述，前加修正說明），並記 `var` 不放寬（D002）；
  (c) §22 (5) 寫成「除 §38 的 `finally` 情形外已修」，附查核範圍與 FR-013 的修正（決策條件中的無返回呼叫，P38–P40）；§38 補記 P21、P23、P24 三種形態，並記窄修候選「`finally` 沒有可到達的非例外進入時，finallyExit 不帶出正常路徑」；
  (d) 記錄測試 helper 對無行號節點標成 `Lnull` 的既有問題（P18）；
  (e) §22 (4) 補記 D004 凍結的 `localStorage` 缺口：`localStorage[k]` 不讀 `k`；`=`、`.a.b`、解構不讀 `localStorage`；解構與 `for…in` 在 intra-procedural 有定義卻不是儲存定義節點；巢狀 `x = (localStorage.k = 1)` 不是儲存定義節點（`probes/pages/`）；
  (f) §22 標題與開頭的 feature 摘要段落補上本 feature；本 feature 的行為變更、限制與新發現新增章節；
  (g) 新增 KI 記錄巢狀賦值的通用缺口（D012）：GEN 只在賦值右側「直接是」賦值／更新時遞迴，其餘位置的內層賦值不是定義——形態 `y = (x = 5, 3)`、`y = [x = 6]`、`y = f(x = 7)`、`[y] = x = [8]`、`o.t = [n++]`、`this.p = x = 1`、`f().p = x = 2`、`o.a.b = x++`，現存實例 `tests/golden/fixtures/es2015/app.js:22` 的 `nextId++`（`state.todos = [...state.todos, { id: nextId++, … }]`）；本 feature 維持 develop 行為（`o.p = x = 1`、`o.p = x++` 仍定義 `x`）。[SRC KI §22、§23、§38；USR；D001–D003、D012]
- **FR-012**: README MUST 同步：Limits 段「assigning to `a.b` defines `a`」改寫為成員賦值是物件變數的使用、不追蹤屬性層級的資料流；解析規則加入函式中 `o.m()` 的放寬與其限制（只 `const`／`let`、宣告與賦值分開不放寬、忽略執行順序）；L173 的兩句過期敘述「`o.m()` … `o` has a property assignment in between (`o.p = 1` defines `o`)」與「`o.m()` in a function when `o` is defined outside it (known-issues §23)」刪除或改寫。[SRC D001、D002；README L173、L175、L187]
- **FR-013**: deferred p-use（007：決策節點的條件中、呼叫之前讀取的變數，記在段節點、配對到 owner 決策節點的分支）MUST 只在其決策節點（owner）依求解器可到達時產生 pair；owner 不可到達時（條件中的呼叫永不正常返回，P38–P40）不產生該 p-use 的 pair。段節點本身的 c-use 不受影響；intra-procedural 模型不拆分呼叫、沒有 deferred p-use，結果不變。[SRC KI §22 (5)；PRB P38–P40；D017]

### Key Entities

- **成員目標／物件變數**：見「表示法」；本 feature 改變它們在 def-use 中的角色（讀取，而非定義）。
- **`o.m()` 放寬規則**：函式中 `o.m()` 的解析在嚴格規則失敗時的後備規則（FR-004）。
- **可到達性不變量**：每個 pair 的兩端都可到達（FR-006），以自動化檢查表示。
- **差異紀錄**：`golden-diff.md`、`mdn-diff.md` 的每筆差異及其分類、對應 FR／KI 節次與簽核。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 本 spec 的全部驗收情境都有對應的自動化測試且通過。
- **SC-002**: PRB P1–P21、P23–P42 全部得到驗收情境所列的預期結果；P22 結果不變。
- **SC-003**: 既有測試全部通過（編碼舊行為的測試更新並列入 golden-diff）；golden 差異 100% 有對應記錄與分類，且經使用者簽核。
- **SC-004**: MDN 範例集與 golden fixture 全部能完成分析、不拋錯；每一個相對 `develop` 新增或消失的 pair 都歸入下列之一：「成員目標不是定義（FR-001／FR-002）」「成員目標不是定義對呼叫解析的影響（FR-001 外溢：嚴格規則與 D2／class 放寬的定義計數，P29–P32）」「`o.m()` 放寬（FR-004）」「無法到達（FR-006、FR-013）」「屬性寫入→讀取損失（D001）」，或 KI 既有限制（需註明節次）；無法歸類者記為新已知問題。MDN `a05-assessment-main.js` 的三個 `evilBall` 方法呼叫連結（US2 情境 8）。
- **SC-005**: FR-007 的不變量檢查在 PRB、golden fixture 與 MDN 範例集上，允許清單以外的違反數為 0、過期的允許清單項為 0；每一項允許清單都通過 FR-008 的差分判準並附見證；陽性對照（P21、P23、P24、注入的 pair）確實被報出。
- **SC-006**: golden fixture 與 MDN 範例集的總分析時間不超過 `develop` 的 2 倍。
- **SC-007**: FR-011 (a)–(g) 與 FR-012 的每一項 known-issues／README 修改都有逐項核對紀錄（項目、檔案位置、核對結果），README 的過期敘述（L173、L187）不再出現。

## Assumptions

- 不引入屬性層級的資料流程（D001；以 FR-011 (a) 的後續 KI 與 FR-012 的 README 限制記錄）：讀取 `o.p` 仍是 `o` 的使用，pair 以物件變數 `o` 表示。
- 方法查找仍不沿 `extends` 鏈；函式建構子的 prototype 方法（P10）不解析；`o.m()` 以外的形式（`o.p.m()`、`o[k]()`）不放寬。
- 放寬規則的「頁面上的定義」以 binding 計，沿用 005 D2 的判定（不含成員賦值，依 FR-001）。
- 常數條件不求值；可到達性以 dujs 的 CFG 與資料流程規則為準（見「表示法」）。
- 效能基準以本機執行 golden fixture 與 MDN 範例集量測（同 005／007）；KI §50 的既有效能問題不在範圍內。
- 技術選型維持 repo 現況（Node ≥ 24、CommonJS、mocha + should、eslint、c8、fast-check、espree、eslint-scope、walkes），不引入新依賴。
