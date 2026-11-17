# Feature Specification: 把含呼叫的節點拆成「呼叫之前」與「返回之後」——修正決策節點與引數的求值順序（KI §16），並讓運算式中的呼叫成為呼叫點（KI §22 (3)）

**Feature Branch**: `007-split-call-nodes`

**Created**: 2026-11-18

**Status**: Draft（spec review 2026-11-18 通過）

**Input**: User description: "修正 docs/known-issues.md 的 §16（decision node 的呼叫被插在 decision node 之前：條件裡的 uses/defs、含呼叫的引數，被建模成在 callee 執行之後）與 §22 (3)（運算式中的呼叫）。兩者都需要把敘述節點拆成「呼叫之前」與「返回之後」（共用的 statement-node split）。背景：005 的決策 D1 把這兩項排給 007（見 specs/005-summary-analysis/ 的 spec 與 docs/known-issues.md §16、§22 及 §35–§43）。範圍外：§22 (1)(5) 與 §23 屬 feature 008；`.specify/context/mermaid-markdown-output/` 是之後另一個 feature 的需求，不是 007 的上游來源。預期行為改變：golden 與 MDN 結果會有差異，比照 005 用 diffcheck／golden-diff 方式逐筆記錄並分類。PR 目標 develop。"

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| KI | `docs/known-issues.md` | §16、§22 (3) 的問題描述與重現程式；§10（`return g();` 不連結）；§35–§43（005 的行為變更與限制） |
| D005 | `specs/005-summary-analysis/spec.md` | 範圍決策 D1（007 的範圍）、D3／FR-006 與 Clarifications Q-a（呼叫敘述只在呼叫之前可能拋錯）、FR-009／FR-010（攤平圖與配對資訊）、FR-011（golden-diff）、SC-004／SC-005（MDN 與效能）、Assumptions（回傳值不建模） |
| D004 | `specs/004-fix-remaining-issues/plan.md` 決策 U1、`specs/004-fix-remaining-issues/spec.md` FR-018 | 只有呼叫敘述是 call-site 的來由；callee 解析的嚴格規則 |
| PRB | 本 feature 對 `develop`（`edc22d5`）跑的探測程式 `specs/007-split-call-nodes/probes/`（見「探測結果」；完整輸出 `probes/baseline-develop.txt`） | 目前行為的實測證據 |
| USR | 本 feature 的需求描述（2026-11-18） | 範圍、範圍外、差異紀錄方式 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | KI §16；D005 D1；PRB P1、P2、P12、P21 |
| US2 | KI §22 (3)、§10、§37；D004 U1；D005 D1、Assumptions；PRB P3–P5、P10、P13、P14、P18、P19、P22、P23、P25、P27 |
| US3 | KI §16（求值順序）、§22 (3)；PRB P6–P9、P11、P15–P17、P24、P26、P28 |
| US4 | D005 D3、FR-006、Q-a；KI §36；PRB P20、P20b、P29、P30 |

### 範圍決策（USR）

- **R1**：本 feature 只做 KI §16 與 §22 (3)；兩者共用「把含呼叫的節點拆成呼叫之前／返回之後」的建模。§22 (1)、§22 (5)、§23 屬 008；
  §22 (4) 屬另開的儲存模型 feature；`.specify/context/mermaid-markdown-output/` 是之後另一個 feature 的需求，不是本 feature 的來源。[SRC USR；D005 D1]
- **R2**：golden 與 MDN 範例的結果預期會改變；比照 005，每處差異以差異工具逐筆記錄並分類（`golden-diff.md`、`mdn-diff.md`），使用者簽核後才更新 golden。[SRC USR；D005 FR-011、SC-005]

### 探測結果（PRB，`develop` edc22d5）

程式在 `specs/007-split-call-nodes/probes/`，以同目錄的 `run.js` 執行（複製自 005 的探測執行器）。「連結」指該呼叫有被呼叫端（inter-procedural 模型含其 scope）。

| ID | 程式 | 目前結果（節錄） | 問題 |
|----|------|------------------|------|
| P1 | `p1-ki16.js`（KI §16 程式） | 有 `x: L1 -> L3`，沒有 `x: L5 -> L3` | 條件中引數的定義 `x = 1` 被建模在 callee 之後（§16） |
| P2 | `p2-ki16-shadow.js`（KI §16 後段程式） | 有 `a: L2 -> L3`、`a: L2 -> L6` | 守門（004 FR-016 已修正） |
| P3 | `p3-assign.js`（`var y = g();`） | `g()` 不連結；有 `x: L1 -> L7`、`y: L6 -> L7` | 運算式中的呼叫不是 call-site（§22 (3)） |
| P4 | `p4-ki10-return.js`（KI §10 程式，`return g();`） | `g()` 不連結；沒有 `d` 的 pair | 同上 |
| P5 | `p5-use-before-def.js`（`x = f();`） | 不連結；有 `x: L6 -> L7`，沒有 `x: L1 -> L3` | 同上；連結後 L6 的定義須在返回之後 |
| P6 | `p6-two-calls.js`（`var y = f() + g();`） | 兩者都不連結；沒有 `x` 的 pair | 同上；兩個呼叫須依求值順序串接 |
| P7 | `p7-nested-arg.js`（`h(f());`） | `h` 連結、`f` 不連結；有 `x: L1 -> L7` | 引數中的呼叫須在外層呼叫之前 |
| P8 | `p8-cond-after.js`（`if (f() > x)`） | 不連結；有 `x: L1 -> L6>L7:T`、`x: L1 -> L7` | 呼叫之後才讀的 `x` 須讀到 callee 的定義 |
| P9 | `p9-cond-before.js`（`if (x < f())`） | 不連結；有 `x: L1 -> L6>L7:T`、`x: L1 -> L7` | 呼叫之前就讀的 `x` 不得讀到 callee 的定義 |
| P10 | `p10-new-var.js`（`var o = new A();`） | constructor 不連結；有 `x: L1 -> L8` | §22 (3) 的 `new` |
| P11 | `p11-while.js`（`while (next() > 0)`） | 不連結；有 `n: L1 -> L7`，沒有 `n` 在 `next` 內的 pair | 迴圈條件中的呼叫 |
| P12 | `p12-stmt-arg.js`（呼叫敘述 `f(x = 1);`） | 有 `x: L1 -> L3`、`x: L5 -> L6`，沒有 `x: L5 -> L3` | 呼叫敘述的引數定義也被建模在 callee 之後（§16 的同一缺陷） |
| P13 | `p13-method-expr.js`（`var r = o.m();`） | 不連結；有 `x: L1 -> L10` | §22 (3) 的方法呼叫 |
| P14 | `p14-return-in-fn.js`（函式內 `return g();`） | `g()` 不連結；有 `x: L1 -> L10` | §22 (3) |
| P15 | `p15-for-of.js`、`p15b-for-of-once.js`（`for (var v of f())`） | 不連結；有 `x: L1 -> L7` | 迴圈的可迭代物件只在進入迴圈前求值一次 |
| P16 | `p16-switch.js`（`switch (f())` 與 `case x:`） | 不連結；有 `x: L1 -> L8` | `switch` 判別式中的呼叫 |
| P17 | `p17-short-circuit.js`（`var y = c && f();`） | 不連結；只有 `x: L1 -> L8` | 短路運算右側的呼叫只在該分支執行 |
| P18 | `p18-default-param.js`（`function f(a = g())`） | `g()` 不連結；有 `x: L1 -> L7` | 參數預設值中的呼叫 |
| P19 | `p19-field-init.js`（欄位 `y = g();`） | `g()` 不連結；有 `x: L1 -> L10` | 欄位初始化式中的呼叫（004 只連 `this.m()`／`new B()`） |
| P20 | `p20-after-return-throws.js`（`try { var y = f().p; }`） | 不連結；只有 `x: L1 -> L10` | 返回之後的求值可能拋錯 |
| P21 | `p21-callee-in-if-stmt.js`（`if (f())`） | 有 `x: L3 -> L7`、`f: entry -> L6>L7:T` | 守門（現況已成立） |
| P22 | `p22-unresolved-arg.js`（`console.log(f(), x);`） | `f()` 不連結；有 `x: L1 -> L6` | 無法解析的外層呼叫，其引數中的呼叫仍是呼叫點 |
| P23 | `p23-iife.js`（`(function () {…})()`） | 不連結；有 `x: L1 -> L6` | 範圍外（callee 不是識別字或成員運算式，見 Assumptions） |
| P20b | `p20b-stmt-call-try.js`（P20 改為 try 內 `f();`） | 有 `x: L1 -> L10`，沒有 `x: L4 -> L10` | 守門：呼叫敘述返回後不拋錯（005 Q-a） |
| P24 | `p24-switch-two-case.js`（`switch (f())` 有兩個 `case`） | 不連結；L7、L9 兩個 `case` 節點都讀判別式（`f: entry -> L7>…`、`f: entry -> L9>…`） | 判別式只求值一次 |
| P25 | `p25-throw.js`（try 內 `throw f();`） | 不連結；只有 `x: L1 -> L9` | `throw` 運算式中的呼叫 |
| P26 | `p26-conditional.js`（`var y = c ? f() : 2;`） | 不連結；只有 `x: L1 -> L8` | 條件運算子分支中的呼叫 |
| P27 | `p27-generator.js`（`var it = g();`，`g` 為 generator） | 不連結；只有 `x: L1 -> L6` | 運算式中的 generator 呼叫套用保守摘要（KI §37） |
| P28 | `p28-compound.js`（`x += f();`） | 不連結；有 `x: L1 -> L6`、`x: L6 -> L7` | 複合賦值先讀 `x` 再呼叫 |
| P29 | `p29-assign-try.js`（try 內 `x = f();`） | 不連結；只有 `x: L1 -> L9` | 返回後的賦值可能拋錯（FR-005） |
| P30 | `p30-var-try.js`（try 內 `var y = f();`） | 不連結；只有 `x: L1 -> L9` | 守門：返回後的宣告初始化不拋錯 |

## Clarifications

### spec review（2026-11-18）的使用者決策

- **Q1 → A**：節點內依 JavaScript 完整的由左至右求值順序分段（FR-002、US3 情境 4）。佐證：`x += f();` 在 develop 為 `x: L1 -> L6`，
  簡化為「callee 與引數在前、其餘在後」會變成錯誤的 `x: L3 -> L6`（US3 情境 11）。
- **Q2 → A**：返回之後的段也可能拋錯，保留 US4；FR-005 改寫為每段只看該段實際求值的子運算式（不含已返回的呼叫），並列出返回後拋錯／不拋錯的例子，
  新增守門情境 US4 情境 2（P20b）。
- **DECISION 002**：US4 補情境 3、4（P29 `x = f();` 返回後賦值可能拋錯；P30 `var y = f();` 不拋錯；依據 throwTypes 含 AssignmentExpression、不含 VariableDeclarator）；FR-005 補 `throw f();`；US3 敘述補 switch 判別式。帶到 plan（S1）：判別式只讀一次後該讀取記在哪個節點（FR-003 規定 case 的讀取仍是 p-use），plan 定案並列入 golden-diff。spec review 通過（2026-11-18）。
- **Q4 → A**：以現版 specify-cli 繼續。**Q5 → A**：沿用目前的憲章（5.6.0），007 合併後另行更新基線。
- 追加（spec review 必修）：FR-004 擴充到 `switch` 判別式只求值一次（US3 情境 9）；`throw` 驗收（US2 情境 10）；採納 `?:`（US3 情境 10）、generator
  （US2 情境 11，SC-004 補 §37）、差異以去重 pair 比對並另列重複列數（SC-004、FR-009）、`x += f();`（US3 情境 11）、參數預設值的近似（Assumptions）、
  FR-010 補 KI §36 的說明。

## 表示法

沿用 `specs/005-summary-analysis/spec.md`「表示法」：def-use pair 寫成 `<變數>: <def> -> <use>`；c-use 為節點標記；p-use 為
`<決策節點標記>><分支目標節點標記>`，目標不帶路徑時再加 `:T`／`:F`。節點標記為 `L<行>`、`entry` 或 `exit`。行號為被分析程式碼的行號（1 起算）。
「intra-procedural」「inter-procedural」「intra-page」指 dujs 產出的對應模型；未指明模型時，預期對 inter-procedural（若有）與 intra-page 都成立。
驗收程式一行一個節點來源。「沒有 X」表示該 pair 不得出現；未列出的 pair 不在該情境檢查範圍。

**呼叫點（call-site）**：被分析程式中一個可解析出被呼叫端的呼叫運算式（`f(…)`、`new F(…)`、`o.m(…)`、`A.s(…)`、`this.m(…)`、`new F().m(…)`，
解析規則沿用 004 FR-018 與 005 FR-005）。**含呼叫的節點**：其求值包含至少一個呼叫點的 CFG 節點（敘述、條件、`case`、迴圈節點、參數初始化、
欄位初始化等）。**呼叫之前**：節點求值中、某呼叫點進入被呼叫端之前已完成的部分（求 callee、引數，以及依求值順序更早的運算元）；
**返回之後**：該呼叫正常返回之後才進行的部分（其餘運算元、賦值的定義、條件的分支決定）。

## User Scenarios & Testing *(mandatory)*

使用者為以 dujs 分析 client-side JavaScript 資料流程的研究者或工具開發者，透過 CLI 或函式庫 API 取得四層模型與 def-use pair，並以 pair 與
攤平圖產生測試需求與測試路徑。求值順序錯誤會讓 pair 的定義端錯置（多報不可實現的 pair、漏報可實現的 pair）；運算式中的呼叫不連結會漏掉
被呼叫端的效果與其內部的 pair。

### User Story 1 - 引數與條件中呼叫之前的部分，在被呼叫端執行之前生效 (Priority: P1)

條件、`case`、迴圈節點或呼叫敘述中，呼叫之前求值的引數與運算元所做的定義與讀取，在被呼叫端執行之前生效；被呼叫端看得到引數中的定義。

**Why this priority**: KI §16 的核心缺陷；目前被呼叫端讀到的是引數賦值之前的舊定義（不可實現的 pair），引數賦值後的定義則被漏報。

**Independent Test**: 分析下列程式，比對 inter-procedural 與 intra-page 的 pair。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` L1 / `function f(v) {` L2 / `return x;` L3 / `}` L4 / `if (f(x = 1)) {` L5 / `x = 2;` L6 / `}` L7，**When** 分析，
   **Then** 有 `x: L5 -> L3`，沒有 `x: L1 -> L3`。[SRC KI §16；PRB P1]
2. **Given** `var x = 0;` L1 / `function f(v) {` L2 / `console.log(x);` L3 / `}` L4 / `f(x = 1);` L5 / `console.log(x);` L6，**When** 分析，
   **Then** 有 `x: L5 -> L3`、`x: L5 -> L6`，沒有 `x: L1 -> L3`。[SRC KI §16；PRB P12]
3. **Given** KI §16 後段程式（`function check(a) { return a; }` L1 / `var a = 1, b = 0;` L2 / `if (check(a) || b) {` L3 / `b = 2;` L4 / `}` L5 /
   `var c = a;` L6），**When** 分析 intra-page，**Then** 有 `a: L2 -> L3`、`a: L2 -> L6`（守門：004 FR-016 的繞過仍成立）。[SRC KI §16；PRB P2]
4. **Given** `var x = 0;` L1 / `function f() {` L2 / `x = 1;` L3 / `return 1;` L4 / `}` L5 / `if (f()) {` L6 / `console.log(x);` L7 / `}` L8，
   **When** 分析，**Then** 有 `x: L3 -> L7` 與 `f: entry -> L6>L7:T`（守門：callee 的讀取仍記為該決策節點的 p-use）。[SRC PRB P21]

---

### User Story 2 - 運算式中的呼叫是呼叫點 (Priority: P1)

賦值、變數宣告初始化、`return`、參數預設值、欄位初始化式、條件與迴圈節點中的呼叫運算式（含 `new` 與方法呼叫），都連到被呼叫端；被呼叫端
的效果在返回之後生效，節點在返回之後才做的定義（例如賦值的目標）不被被呼叫端看到。

**Why this priority**: KI §22 (3)；目前只有呼叫敘述連結，大量真實程式（`var o = new A();`、`x = f();`、`return g();`）的被呼叫端效果全部遺漏。

**Independent Test**: 分析下列程式。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` L1 / `function g() {` L2 / `x = 1;` L3 / `return 2;` L4 / `}` L5 / `var y = g();` L6 / `console.log(x, y);` L7，
   **When** 分析，**Then** 有 `x: L3 -> L7`、`y: L6 -> L7`，沒有 `x: L1 -> L7`。[SRC KI §22 (3)；PRB P3]
2. **Given** KI §10 程式（`var d = 1;` L1 / `function f(g = () =>` L2 / `d) {` L3 / `return g();` L4 / `}` L5 / `f();` L6），**When** 分析，
   **Then** 有 `d: L1 -> L3`。[SRC KI §10、§22 (3)；D004 U1；PRB P4]
3. **Given** `var x = 0;` L1 / `function f() {` L2 / `console.log(x);` L3 / `return 1;` L4 / `}` L5 / `x = f();` L6 / `console.log(x);` L7，
   **When** 分析，**Then** 有 `x: L1 -> L3`、`x: L6 -> L7`，沒有 `x: L6 -> L3`（賦值在返回之後）。[SRC PRB P5]
4. **Given** `var x = 0;` L1 / `class A {` L2 / `constructor() {` L3 / `x = 1;` L4 / `}` L5 / `}` L6 / `var o = new A();` L7 / `console.log(x);` L8，
   **When** 分析，**Then** 有 `x: L4 -> L8`、`A: L2 -> L7`，沒有 `x: L1 -> L8`。[SRC KI §22 (3)；PRB P10]
5. **Given** `p13-method-expr.js`（L8 `var o = new A();`、L9 `var r = o.m();`、`m` 在 L4 賦值 `x = 1;`、L10 `console.log(x);`），**When** 分析，
   **Then** 有 `x: L4 -> L10`，沒有 `x: L1 -> L10`。[SRC PRB P13]
6. **Given** `p14-return-in-fn.js`（`g` 在 L3 賦值 `x = 1;`、`f` 的本體 L7 `return g();`、L9 `f();`、L10 `console.log(x);`），**When** 分析，
   **Then** 有 `x: L3 -> L10`，沒有 `x: L1 -> L10`。[SRC PRB P14]
7. **Given** `p18-default-param.js`（`function f(a = g())` L6、L7 `console.log(x);`、`g` 在 L3 賦值 `x = 1;`、L9 `f();`），**When** 分析，
   **Then** 有 `x: L3 -> L7`，沒有 `x: L1 -> L7`。[SRC PRB P18]
8. **Given** `p19-field-init.js`（欄位 L7 `y = g();`、L9 `new A();`、L10 `console.log(x);`、`g` 在 L3 賦值 `x = 1;`），**When** 分析，
   **Then** 有 `x: L3 -> L10`，沒有 `x: L1 -> L10`。[SRC PRB P19]
9. **Given** `p22-unresolved-arg.js`（L6 `console.log(f(), x);`、`f` 在 L3 賦值 `x = 1;`），**When** 分析，**Then** `f()` 連結；有 `x: L3 -> L6`，
   沒有 `x: L1 -> L6`（外層呼叫無法解析，不影響引數中的呼叫）。[SRC PRB P22]
10. **Given** `var x = 0;` L1 / `function f() {` L2 / `x = 1;` L3 / `return 2;` L4 / `}` L5 / `try {` L6 / `throw f();` L7 / `} catch (e) {` L8 /
   `console.log(x);` L9 / `}` L10，**When** 分析，**Then** 有 `x: L3 -> L9` 與 `x: L1 -> L9`（呼叫之前可能拋錯）。[SRC PRB P25]
11. **Given** `var x = 0;` L1 / `function* g() {` L2 / `x = 1;` L3 / `}` L4 / `var it = g();` L5 / `console.log(x);` L6，**When** 分析，**Then** 有
   `x: L1 -> L6` 與 `x: L3 -> L6`（generator 的保守摘要，KI §37）。[SRC KI §37；PRB P27]

---

### User Story 3 - 一個節點中的讀取、定義與多個呼叫依求值順序 (Priority: P2)

同一節點中有多個呼叫點時，依 JavaScript 的求值順序串接（引數中的呼叫先於外層呼叫、左運算元先於右運算元）；節點中的每個讀取只得到
「在它被求值時」有效的定義。短路與條件運算子右側的呼叫只在該分支執行；`for…of`／`for…in` 的可迭代物件只在進入迴圈前求值一次，`switch` 的判別式只求值一次。

**Why this priority**: US1、US2 的一般化；只拆「全部引數在前、其餘在後」會讓 `x < f()` 這類運算元讀到錯的定義。

**Independent Test**: 分析下列程式。

**Acceptance Scenarios**:

1. **Given** `p6-two-calls.js`（`f` 在 L3 賦值 `x = 1;`、`g` 在 L7 讀 `x`、L10 `var y = f() + g();`），**When** 分析，**Then** 有 `x: L3 -> L7`，
   沒有 `x: L1 -> L7`。[SRC PRB P6]
2. **Given** `p7-nested-arg.js`（`f` 在 L3 賦值 `x = 1;`、`h` 在 L7 讀 `x`、L9 `h(f());`），**When** 分析，**Then** 有 `x: L3 -> L7`，
   沒有 `x: L1 -> L7`。[SRC PRB P7]
3. **Given** `p8-cond-after.js`（`f` 在 L3 賦值 `x = 1;`、L6 `if (f() > x) {`、L7 `console.log(x);`），**When** 分析，**Then** 有
   `x: L3 -> L6>L7:T`、`x: L3 -> L7`，沒有任何定義端為 L1 的 `x` pair。[SRC PRB P8]
4. **Given** `p9-cond-before.js`（同上但 L6 為 `if (x < f()) {`），**When** 分析，**Then** 有 `x: L1 -> L6>L7:T`、`x: L3 -> L7`，沒有
   `x: L3 -> L6>L7:T`、`x: L1 -> L7`（`x` 在呼叫之前就被讀取）。[SRC PRB P9]
5. **Given** `p11-while.js`（`next` 在 L3 `n = n - 1;`、L6 `while (next() > 0) {`、L7 `console.log(n);`），**When** 分析，**Then** 有
   `n: L1 -> L3`、`n: L3 -> L3`、`n: L3 -> L7`，沒有 `n: L1 -> L7`。[SRC PRB P11]
6. **Given** `p15-for-of.js`（`f` 在 L3 賦值 `x = 1;`、L6 `for (var v of f()) {`、L7 `console.log(x);`），**When** 分析，**Then** 有 `x: L3 -> L7`，
   沒有 `x: L1 -> L7`；`p15b-for-of-once.js`（`f` 在 L3 讀 `x`、迴圈本體 L7 `x = 2;`）沒有 `x: L7 -> L3`（`f` 只在進入迴圈前呼叫一次）。[SRC PRB P15]
7. **Given** `p16-switch.js`（`f` 在 L3 賦值 `x = 1;`、L6 `switch (f()) {`、L7 `case x:`、L8 `console.log(x);`），**When** 分析，**Then** 有
   `x: L3 -> L7>L8:T`、`x: L3 -> L8`，沒有定義端為 L1 的 `x` pair。[SRC PRB P16]
8. **Given** `p17-short-circuit.js`（`f` 在 L4 賦值 `x = 1;`、L7 `var y = c && f();`、L8 `console.log(x);`），**When** 分析，**Then** 有
   `x: L1 -> L8`、`x: L4 -> L8`（`f` 只在 `c` 為真時呼叫）。[SRC PRB P17]
9. **Given** `var x = 0;` L1 / `function f() {` L2 / `x = x + 1;` L3 / `return 1;` L4 / `}` L5 / `switch (f()) {` L6 / `case 1:` L7 / `break;` L8 /
   `case 2:` L9 / `break;` L10 / `}` L11，**When** 分析，**Then** 有 `x: L1 -> L3`，沒有 `x: L3 -> L3`（判別式只求值一次，`f` 不因每個 `case` 重新呼叫）。
   [SRC PRB P24]
10. **Given** `var x = 0;` L1 / `var c = 0;` L2 / `function f() {` L3 / `x = 1;` L4 / `return 1;` L5 / `}` L6 / `var y = c ? f() : 2;` L7 /
   `console.log(x);` L8，**When** 分析，**Then** 有 `x: L1 -> L8`、`x: L4 -> L8`。[SRC PRB P26]
11. **Given** `var x = 0;` L1 / `function f() {` L2 / `x = 1;` L3 / `return 1;` L4 / `}` L5 / `x += f();` L6 / `console.log(x);` L7，**When** 分析，
   **Then** 有 `x: L1 -> L6`、`x: L6 -> L7`，沒有 `x: L3 -> L6`（`x` 在呼叫之前被讀取）。[SRC PRB P28]

---

### User Story 4 - 返回之後的求值也可能拋錯 (Priority: P3)

被呼叫端正常返回後，節點剩下的求值（例如 `f().p` 的成員存取、`f() > x` 的比較、`h(f())` 中外層呼叫之前那段）若可能拋錯，例外路徑帶「返回之後、該部分執行前」有效的定義
（含被呼叫端的定義）；呼叫之前的部分可能拋錯時帶呼叫之前的定義（005 FR-014、Q-a 不變）。

**Why this priority**: 拆分後「呼叫敘述只在呼叫之前拋錯」（005 Q-a）不再足以描述運算式中的呼叫；影響面較小。

**Independent Test**: 分析 `p20-after-return-throws.js` 與 `p20b-stmt-call-try.js`。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` L1 / `var o = null;` L2 / `function f() {` L3 / `x = 1;` L4 / `return o;` L5 / `}` L6 / `try {` L7 / `var y = f().p;` L8 /
   `} catch (e) {` L9 / `console.log(x);` L10 / `}` L11，**When** 分析，**Then** 有 `x: L4 -> L10`（`.p` 在返回之後拋錯）與 `x: L1 -> L10`
   （呼叫之前拋錯）。[SRC D005 Q-a、FR-014；PRB P20]
2. **Given** 同上但 L8 為 `f();`（`p20b-stmt-call-try.js`），**When** 分析，**Then** 有 `x: L1 -> L10`，沒有 `x: L4 -> L10`（守門：呼叫敘述返回後不拋錯，
   005 Q-a）。[SRC D005 Q-a；PRB P20b]
3. **Given** `var x = 0;` L1 / `function f() {` L2 / `x = 1;` L3 / `return 2;` L4 / `}` L5 / `try {` L6 / `x = f();` L7 / `} catch (e) {` L8 /
   `console.log(x);` L9 / `}` L10，**When** 分析，**Then** 有 `x: L1 -> L9`（呼叫之前）與 `x: L3 -> L9`（返回後的賦值可能拋錯，帶該段執行前的定義）；
   沒有 `x: L7 -> L9`（FR-014）。[SRC PRB P29]
4. **Given** 同上但 L7 為 `var y = f();`，**When** 分析，**Then** 有 `x: L1 -> L9`，沒有 `x: L3 -> L9`（返回後那段不拋錯）。[SRC PRB P30]

---

### Edge Cases

- 呼叫解析失敗（callee 不可判定、optional call `f?.()`、callee 不是識別字或成員運算式如 IIFE）：維持不連結、不拆節點、不報錯（P23）。
- 巢狀函式、箭頭函式本體中的呼叫屬於該函式，不是外層節點的呼叫點；作為引數傳遞的函式（回呼）不因此被呼叫。
- 短路（`&&`、`||`、`??`）與條件運算子（`?:`）：既有的分支拆分先決定哪些部分在哪個分支執行，每個分支節點再依本 feature 拆分（US3 情境 8）。
- 同一節點的多個被呼叫端（004 的 `new A()`：欄位初始化式再 constructor；class static 成員）在**一個**呼叫點內依序串接，維持 004／005 的順序。
- 遞迴、互相遞迴、無正常返回、generator／async 的保守摘要、例外沿呼叫鏈往外與 LOOP：沿用 005 的摘要規則，對新增的呼叫點同樣適用。
- 事件處理器的註冊查找（`addEventListener` 呼叫的引數）不受影響；註冊呼叫本身無法解析，維持不連結。
- 005 FR-016 繞過（呼叫端的區域變數、參數、block `let`／`const` 不被被呼叫端殺掉）對新增的呼叫點同樣成立。
- intra-procedural 模型中的呼叫維持不透明：節點不拆分，pair 不變（PRB 各程式 `intra(page)` 的結果不變）。
- 已知限制照舊、不在本 feature 修正：KI §38（`finally` 多入口）、§41（diamond 註冊）、§42、§43（同一被呼叫端在 intra-page 列兩份）；新增的呼叫點
  可能讓 §43 的重複列更常出現，列入 mdn-diff 的分類。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 任何 CFG 節點中的每個呼叫點 MUST 連到其被呼叫端（不限呼叫敘述）：含賦值、變數宣告初始化、`return`、`throw`、條件、`case`、
  迴圈節點、參數預設值、欄位初始化式中的呼叫運算式與 `new` 運算式。callee 的解析規則沿用 004 FR-018 與 005 FR-005，不擴充。[SRC KI §22 (3)；D004 U1]
- **FR-002**: 含呼叫點的節點 MUST 在 inter-procedural 與 intra-page 模型中依求值順序分成「第一個呼叫之前」「每兩個呼叫之間」「最後一個呼叫返回之後」
  幾段，順序依 JavaScript 完整的求值順序（運算元由左至右、引數由左至右、引數先於呼叫、複合賦值先讀目標）；每段的讀取只得到該段中該讀取被求值時有效的定義，每段的定義只在其後生效。[SRC KI §16；PRB P1、P6–P9、P12]
- **FR-003**: 決策節點（`if`／迴圈條件、拆分後的決策節點、`case`、`for…in`／`for…of`）中的讀取 MUST 仍記為該決策節點的 p-use（標記形式不變），
  只改變其得到的定義；不在條件中的讀取仍為 c-use。[SRC KI §16；PRB P21]
- **FR-004**: `for…in`／`for…of` 的可迭代物件與 `switch` 的判別式 MUST 只求值一次（可迭代物件在進入迴圈前；判別式在第一個 `case` 比較之前），其中的呼叫與讀取不因每次迭代或每個 `case` 重複。[SRC PRB P15、P24]
- **FR-005**: 拆分的每一段 MUST 依 005 FR-014 決定例外路徑：該段可能拋錯時，例外路徑帶該段執行前的定義（返回之後的段含被呼叫端的定義）。
  每段是否可能拋錯 MUST 只看**該段實際求值的子運算式**，不含已返回的那個呼叫：`f();`、`var y = f();`、`if (f())`、`return f();` 的返回之後那段
  不拋錯（005 Q-a 照舊）；`f().p`（成員存取）、`x = f()`（賦值；依既有判定，賦值運算式可能拋錯）、`f() > x`（比較）、`h(f())`（外層呼叫之前那段，求外層
  callee 與引數）算可能拋錯。`throw f();` 返回之後那段必定拋出，帶返回後的定義。呼叫之前的段可能拋錯時帶呼叫之前的定義（005 Q-a 照舊）。[SRC D005 FR-014、Q-a；PRB P20、P20b、P29、P30]
- **FR-006**: intra-procedural 模型 MUST 不拆分節點、pair 不變（呼叫不透明，005 FR-009）。[SRC D005 FR-009]
- **FR-007**: 攤平圖（`.graph.dot`）與 call／return 配對資訊（005 FR-010）MUST 繼續輸出且一致（新增呼叫點的每條 return 邊在配對資訊中恰對應一個呼叫點，
  既有的配對驗證測試對新增呼叫點同樣通過）；拆分產生的節點 MUST 以原節點的行號標記，pair 的
  標記形式不變。新增的節點型別或邊型別（若有）由 plan 決定，寫入 README。[SRC D005 FR-009、FR-010]
- **FR-008**: golden 的每一處差異 MUST 以差異工具逐筆記錄於 `specs/007-split-call-nodes/golden-diff.md`，對應到本 spec 的 FR 或 KI 節次並分類，
  差異以去重後的 pair 比對並另列 develop 與本 feature 的重複列數（KI §43）；經使用者簽核後更新 golden 與 `tests/golden/manifest.json`。[SRC USR R2；D005 FR-011]
- **FR-009**: MDN 範例集（005 使用的 33 個程式，`specs/006-eslint-scope/mdn/corpus`）MUST 以本 feature 與 `develop` 各跑一次，每一個新增或消失的 pair
  記錄於 `specs/007-split-call-nodes/mdn-diff.md` 並分類（見 SC-004）；差異以去重後的 pair 比對，另列 develop 與本 feature 的重複列數（KI §43），供簽核時檢視增幅（不設門檻）；新發現的問題記入 `docs/known-issues.md`。[SRC USR R2；D005 SC-005]
- **FR-010**: `docs/known-issues.md` MUST：§16、§22 (3) 標為已修正（保留原描述，前加修正說明）；開頭的 feature 摘要段落補上本 feature；§10 中
  「`return g();` 不連結」的敘述註明已由本 feature 修正；§36 補充「被呼叫端正常返回後不再拋錯」只適用呼叫敘述（運算式中的呼叫見 FR-005）；本 feature 的行為變更與限制新增章節。README 的限制說明（只有呼叫敘述是 call-site 等）隨之更新。
  [SRC KI §10、§16、§22 (3)；USR]

### Key Entities

- **呼叫點（call-site）**：可解析出被呼叫端的呼叫運算式；一個節點可含多個，依求值順序排列。
- **節點分段（statement-node split）**：含呼叫點的節點在 inter-procedural／intra-page 模型中的「呼叫之前／呼叫之間／返回之後」各段，各自帶讀取、定義與例外路徑。
- **差異紀錄**：`golden-diff.md`、`mdn-diff.md` 的每筆差異及其分類、對應 FR／KI 節次與簽核。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 本 spec 的全部驗收情境都有對應的自動化測試且通過。
- **SC-002**: PRB P1–P22、P20b、P24–P30 全部得到驗收情境所列的預期結果；P23 結果不變。
- **SC-003**: 既有測試全部通過（編碼舊行為的測試更新並列入 golden-diff）；golden 差異 100% 有對應記錄與分類，且經使用者簽核。
- **SC-004**: MDN 範例集與 golden fixture 全部能完成分析、不拋錯；每一個相對 `develop` 新增或消失的 pair 都歸入下列之一：「新連結的呼叫點（FR-001）」
  「求值順序（FR-002／FR-004）」「返回之後的例外（FR-005）」，或 KI 既有限制（§37、§38、§41、§43 等，需註明節次）；無法歸類者記為新已知問題。差異以去重後的 pair 計，重複列數另列（不設門檻）。
- **SC-005**: golden fixture 與 MDN 範例集的總分析時間不超過 `develop` 的 2 倍。

## Assumptions

- 函式的回傳值仍不建模為定義；只追蹤變數的資料流程（`y = f()` 的 `y` 在返回之後被定義，不帶被呼叫端的資訊）。
- callee 的解析能力不擴充：IIFE、回呼（`arr.forEach(fn)`）、`super(…)`、`super.m()`、optional call、getter／setter、tagged template 與
  隱含呼叫（`valueOf`、迭代協定）都不是呼叫點；方法查找仍不沿 `extends` 鏈。
- 同一節點內的求值順序依 ECMAScript 規範（運算元由左至右、引數由左至右、引數先於呼叫）；賦值目標若是識別字，其定義在右側求值完成之後。
- 參數預設值在模型中一律視為會求值（既有近似）；本 feature 把這個近似延伸到預設值中的呼叫（呼叫一定發生）。
- 拆分只發生在有被呼叫端的模型（inter-procedural、intra-page）；inter-page 層級沿用頁面模型的結果。
- 效能基準以本機執行 golden fixture 與 MDN 範例集量測（同 005）。
- 技術選型維持 repo 現況（Node ≥ 24、CommonJS、mocha + should、eslint、c8、fast-check、espree、eslint-scope、walkes）。
