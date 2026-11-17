# Feature Specification: 階層模型 stage 2——以摘要做 context-sensitive 分析，並修正函式 entry 節點的讀取（§18）

**Feature Branch**: `005-summary-analysis`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "新 feature：階層模型 stage 2（summary-based analysis：上層以 GEN at exit、must-KILL、upward-exposed uses 做 context-sensitive 分析，預期結果改變、golden diff 需記錄），並一併處理 known-issues §16（decision node 的 call 插入順序）、§18（function entry node 使用 body 內變數）、§22 後續項目（return f() 作為 call-site、o.p=1 作為 o.p 的 def、具名函式運算式內部名稱、localStorage.removeItem、dead-code pair）、§23（o 定義在函式外時 o.m() 未連結）、§24（固定的全域物件清單）。設計輸入見 memory dujs-hierarchical-model-design 與 docs/known-issues.md。PR 目標 develop。"（範圍經 2026-11-16 spec review 拆成三輪，本 feature 只做第一輪，見 D1；2026-11-17 於 `006-eslint-scope` 合併後續作）

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| KI | `docs/known-issues.md` | 各問題的重現輸入與目前結果（§n 對應檔內問題編號；§22 (k) 對應該節第 k 個後續項目） |
| HD | `specs/003-hierarchical-models/spec.md`（D1–D4、範圍外第 190–191 行）與該 feature 的設計討論 | 階層模型的層級定義、stage 1／stage 2 分工、雙輸出 |
| D004 | `specs/004-fix-remaining-issues/spec.md` | 前一輪決策：FR-015（遞迴以回邊表示）、FR-016（繞過）、FR-018（嚴格 callee 規則與 class 放寬）、Clarifications H3 |
| PRB | 本 feature 對 `develop`（9e324be，含 006）跑的探測程式 `specs/005-summary-analysis/probes/`（見「探測結果」） | 目前行為的實測證據 |
| D006 | `specs/006-eslint-scope/spec.md` 與 `lib/dujs/scopebinding.js` | 變數身分（binding）、具名運算式內部名稱、未宣告讀取＝頁面 entry 的全域定義 |
| USR | 本 feature 的需求討論與 spec review（2026-11-16，記錄於「範圍決策」） | 範圍與建模方向 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | HD D3、範圍外；PRB P1、P2、P16；USR D1、D4 |
| US2 | USR D2、R2-3；D004 H3、FR-018；D006；PRB P3、P7、P10、P11、P12 |
| US3 | USR D3、R2-2；PRB P4、P13–P15、P17 |
| US4 | HD 層級定義；USR N1；PRB P5、P6 |
| US5 | KI §18；PRB P8、P9 |

### 範圍決策（USR）

- **D1**（spec review，Fable A10、A1）：原需求拆成三輪，本 feature（005）只做第一輪：
  - **005**：stage 2 摘要分析（context-sensitive）＋KI §18。
  - **007**（後續）：KI §16（呼叫與決策節點、引數的求值順序）＋KI §22 (3)（運算式中的呼叫是 call-site）；兩者共用「把敘述節點拆成
    呼叫前／返回後」的建模。
  - **008**（後續）：KI §22 (1)（`o.p = v` 不再定義 `o`；須保留 `localStorage.k = v` 為儲存定義，Fable A2）、§22 (5)、§23。
    原列的 §22 (2)、§24 已由 `006-eslint-scope` 修正。
  - 編號說明：spec review 時暫訂的「006／007」因 006 已用於 eslint-scope，順延為 007／008。
  - **另開 feature**：localStorage 儲存模型（`setItem`／`getItem`／`removeItem`／`clear`、是否分 key）。KI §22 (4) 的前提不成立：
    `setItem` 目前不產生任何儲存定義（`localStorageSetterNames` 在 lib 中沒有引用），唯一的儲存定義是 `localStorage.k = v`，
    且不分 key、不會被殺掉。本 feature 更正 KI §22 (4) 的敘述。
  [SRC USR D1]
- **D2**（spec review，Fable A3；第二輪 R2-3；006 決策）：函式內的 `f()` 放寬解析：在所在模型（該函式 intra-procedural 模型中呼叫處的
  到達定義）沒有 `f` 的到達定義時，若 `f` 解析到的 binding 在全頁只有一筆定義（以 binding 判定；宣告、賦值、參數、catch 參數、迴圈綁定
  都算定義），且該定義為下列之一，則連到該函式：函式宣告（含 block 內的函式宣告）、以 `const`／`let` 綁定的函式運算式（含箭頭函式）、
  具名函式運算式的內部名稱（006 起它是只在該函式內可見、定義在運算式節點的變數）。函式宣告與具名函式運算式的**自身遞迴**因此也連結
  （006 時兩者皆不連結）。不看執行順序。函式內的 `new F()` 本輪不放寬；其他情形維持 004 FR-018 的嚴格規則。取代 004 Clarifications H3
  中「函式內看不到外層函式定義就不連結」的部分。[SRC USR D2、R2-3；D004 H3、FR-018；D006]
- **D3**（spec review，Fable A4；第二輪 R2-2）：摘要的 GEN／must-KILL／upward-exposed uses 只看**正常返回**的路徑：被呼叫端中未被捕捉的
  例外離開，不回到呼叫之後的節點。摘要另有第四項「例外離開時可能有效的定義」（被呼叫端中可能拋錯節點處有效的定義聯集，不做 KILL），
  流向呼叫端的 `catch`／`finally`；呼叫端沒有 `try` 時沿呼叫鏈往外，到頁面層或事件處理器層時進 LOOP。因此現有「呼叫前或被呼叫端中途的
  定義經例外到達 `catch` 內或 LOOP 之後」這類 pair 保留。[SRC USR D3、R2-2]
- **D4**（spec review，Fable A5；第二輪 R2-1）：攤平的敘述層級圖不為每個呼叫點複製被呼叫端（現況因模型串接而出現的重複節點照舊），
  pair 由摘要計算；另外輸出 call 邊與 return 邊的配對資訊，供測試路徑產生器過濾不可實現的路徑。「只看正常返回」也以配對資訊表示
  （被呼叫端的例外邊經 exit 之後只能接到呼叫端的例外後繼），`.dot` 的圖結構不為此改變。**修訂** 003 spec「範圍外」中「每個呼叫點各自
  展開一份屬於 stage 2 的範圍」。[SRC USR D4、R2-1；HD 範圍外]
- **D5**：golden 差異紀錄放在 `specs/005-summary-analysis/golden-diff.md`，每處差異對應到 FR 或 KI 節次。[SRC USR D1]

### 探測結果（PRB，`develop` 9e324be，含 `006-eslint-scope`）

程式在 `specs/005-summary-analysis/probes/`（P5 為 `p5-loop-pair.js`），以同目錄的 `run.js` 執行（複製自 004 的探測執行器）。
spec review 時（584e17d）的結果與下表相同，除 P5（改用新程式，見 N1）、P8（當時不拋錯，entry 節點有 c-use `x`、p-use `a`、`o`）。

| ID | 程式 | 目前結果（節錄） | 問題 |
|----|------|------------------|------|
| P1 | US1 情境 1 | inter-procedural 與 intra-page 都有 `x: L6 -> L5`、`x: L1 -> L8` | 不可實現路徑（從一個呼叫進入、從另一個返回） |
| P2 | US1 情境 2 | 有 `x: L11 -> L10`、`x: L3 -> L13` | 同上 |
| P3 | US2 情境 1 | `f()` 不連結；有 `x: L6 -> L8` | 函式內的 `f()` 不解析（004 H3） |
| P4 | US3 情境 1 | 有 `x: L1 -> L7` | 例外邊經 exit 回到呼叫之後，使 `x = 1` 不是 must-KILL |
| P5 | US4 情境 1 | intra-page 有 `x: L7 -> L6`（inter-procedural 沒有） | LOOP 進入事件處理器、返回直接呼叫之後的不可實現路徑 |
| P6 | US4 情境 2 | 函式內 `f()` 不連結，無被呼叫端；有 `x: L9 -> L11`、沒有 `x: L5 -> L11` | 套用 D2 後若不配對，會出現跨處理器的不可實現 pair |
| P7 | US2 情境 3 | 互相遞迴的 `even()`／`odd()` 在函式內不連結 | 同 P3 |
| P8 | KI §18 程式加 `f();` | 分析拋錯 `Decision node entry of the p-use of variable a lacks its true target` | KI §18 |
| P9 | US5 情境 2 | 分析拋錯 `Decision node entry of the p-use of variable x lacks its true target` | KI §18 的後果 |
| P10 | US2 情境 5 | 函式宣告的自身遞迴 `f();` 不連結；沒有 `n: L4 -> L3>L4:T` | 006 決策：自身遞迴留給本 feature |
| P11 | US2 情境 6 | 具名函式運算式內部名稱的遞迴 `fact();` 不連結（有 `fact: L2 -> L5`）；沒有 `n: L4 -> L3>L4:T` | 同 P10 |
| P12 | US2 情境 4（`g1-local-fn.js`） | `f();` 以區域到達定義連結；有 `x: L4 -> L8`，沒有 `x: L6 -> L8` | 守門 |
| P13 | US3 情境 2（`m1-mdn-error-objects.js`；合成版 `g2-try-catch.js`） | 有 `state: L1 -> L13`、`state: L1 -> L15`、`state: L7 -> L15`、`e: L11 -> L12`，另有 `state: L7 -> L13` | `state: L7 -> L13` 是否保留待 clarify（Q-a） |
| P14 | US3 情境 4（`m2-mdn-finally.js`；合成版 `g3-finally.js`） | 有 `opened: L3 -> L16`、`opened: L9 -> L22`，沒有 `opened: L1 -> …` | 守門 |
| P15 | US3 情境 5（`g4-chain-loop.js`） | `t()` 內的 `s();` 不連結；intra-page 有 `x: L1 -> L12`、`x: L9 -> L12`，沒有 `x: L3 -> L12` | 例外沿呼叫鏈進 LOOP 需 D2 連結 |
| P16 | US1 情境 6（`g5-mdn-person-field.js`） | 有 `count: L1 -> L3`、`count: L1 -> L5`、`count: L5 -> L10`，沒有 `count: L1 -> L10` | 守門（改自 MDN） |
| P17 | US3 情境 6（`m3-mdn-finally-return.js`） | 有 `r: L7 -> L16`、`r: L7 -> L18`；L10 的 `r = 3` 沒有任何 pair（同程式不包在函式中時 `finally` 正確，見 `m4`、`m5`、`m6`） | 既有 CFG 缺陷：函式內 `catch` 重拋的例外略過 `finally` 直接離開函式（Q-b：本 feature 修正，FR-013） |

## Clarifications

### 暫停與續作（2026-11-16／2026-11-17）

本 spec 在 specify 階段的 spec review 中暫停，先做 `006-eslint-scope`（PR #7，2026-11-17 合併進 `develop`）。續作時已：依新的 scope 底層
重新檢視 FR-004（變數身分由 `scopebinding` 的 binding 決定，同名區分已是底層性質）、FR-005（「只有一筆定義」以 binding 判定，並納入
006 留下的自身遞迴與具名函式運算式內部名稱）；D1 的後續編號改為 007／008；探測重跑於 9e324be。

### spec review 第二輪（Fable）的使用者決策（已套用）

- **R2-1**（N3）：「只看正常返回」以配對資訊表示，`.dot` 圖結構不變 → D4、FR-009、FR-010。
- **R2-2**（N2）：摘要第四項「例外離開時可能有效的定義」→ D3、FR-001、FR-006、US3 情境 3。
- **R2-3**（N4）：放寬含 `let`、以 binding 判定唯一定義、所在模型＝intra-procedural 的到達定義、不看執行順序、block 內函式宣告視同宣告、
  函式內 `new F()` 不放寬 → D2、FR-005、US2。
- **N1**：US4 情境 1 改用 loop-pair 程式；原 P5 的 `x: L1 -> L3` 來自 `addEventListener` 敘述的例外邊接 LOOP，屬合法 pair。
- **N5**：US4 情境 2 標為守門；US5 情境 2 拆成一行一個節點；US1 情境 5 的 return 邊目標為呼叫點的返回節點（callReturn）。
- SC-005 的消失理由加「呼叫無正常返回」。

### spec review（2026-11-17，續作後）的使用者決策

- SC-002 改為 P1–P11（自身遞迴與具名函式運算式內部名稱列入成功準則）。
- 驗收缺口（US2 情境 4、US3 情境 2、`finally`、例外沿呼叫鏈進 LOOP、一個呼叫點串接多個被呼叫端）：先查 MDN 語料
  （`specs/006-eslint-scope/mdn/corpus`，33 檔，含 MDN「Classes in JavaScript」頁＝`a06-classes-snippets.js`）——語料沒有
  `try`／`catch`／`finally`／`throw`、沒有函式內的區域函式宣告，類別欄位都沒有初始化式，補不了；改以探測程式補成情境
  （P12–P16），`new A()` 串接改自 MDN 該頁的 `Person`（加欄位初始化式，`new` 寫成敘述）。
- 使用者再指定 MDN Guide「Control flow and error handling」：US3 情境 2、4 改用該頁範例的改寫版（P13、P14，原合成程式保留於 probes/ 作對照），
  另以該頁 `finally` 覆寫範例新增 US3 情境 6（P17），探出既有 CFG 缺陷。該頁 `getMonthName` 範例的呼叫在運算式中（`monthName = getMonthName(...)`），
  屬 007，未採用。
- **Q-b → A**：P17 的既有 CFG 缺陷（函式內 `catch` 重拋的例外略過 `finally` 直接離開函式）納入本 feature 修正（FR-013），摘要第四項建立在
  這些例外邊上；golden 差異列入 golden-diff。若 plan 發現牽動面遠超預期，回到使用者改為記錄成已知問題。

### 待 clarify

- **Q-a**：被呼叫端正常返回後，呼叫端 `try` 內已沒有其他可能拋錯的節點時，被呼叫端的定義是否仍可經例外到達 `catch`（P13 的
  `state: L7 -> L13`、`probes/g2-try-catch.js` 的 `x: L4 -> L9`、`probes/us3-3.js` 的 `x: L5 -> L10`）——即呼叫敘述本身在返回後是否算可能拋錯的節點。

## 表示法

沿用 `specs/001-fix-known-issues/spec.md`「表示法」：def-use pair 寫成 `<變數>: <def> -> <use>`，`<def>` 為
`entry` 或節點標記；c-use 為節點標記；p-use 為 `<決策節點標記>><分支目標節點標記>`，目標不帶路徑時再加
`:T`／`:F`。節點標記為 `L<行>`、`entry` 或 `exit`。行號為被分析程式碼的行號（1 起算）。「intra-procedural」
「inter-procedural」「intra-page」指 dujs 產出的對應模型；未指明模型時，預期對 inter-procedural（若有）與 intra-page 都成立。
驗收程式一行一個節點來源，以行號標在程式右側註解或文字中。「沒有 X」表示該 pair 不得出現；未列出的 pair 不在該情境檢查範圍。

**摘要（summary）**：一個被呼叫端對呼叫端呈現的資料流程效果——沿正常返回路徑離開時仍有效的定義（GEN at exit）、在每條正常返回
路徑上一定被重新定義的變數（must-KILL）、以及在被重新定義前就被讀取、需由呼叫端供應定義的變數（upward-exposed uses）；另加例外離開時可能有效的定義（見 D3）。

## User Scenarios & Testing *(mandatory)*

使用者為以 dujs 分析 client-side JavaScript 資料流程的研究者或工具開發者，透過 CLI 或函式庫 API 取得四層模型與
def-use pair，並以 pair 與攤平圖產生測試需求與測試路徑。多報不可實現的 pair 會產生無法滿足的測試需求；漏報則漏測。

### User Story 1 - 同一函式被多處呼叫時，只報可實現的 pair (Priority: P1)

函式在多處被呼叫時，資料流程只沿「從哪個呼叫進入就回到哪個呼叫」的路徑傳遞；函式對呼叫端的效果以摘要表示。

**Why this priority**: stage 2 的核心目的；不可實現的 pair 會變成永遠無法覆蓋的測試需求。

**Independent Test**: 分析下列程式，比對 inter-procedural 與 intra-page 的 pair。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` L1 / `function f() {` L2 / `}` L3 / `f();` L4 / `console.log(x);` L5 / `x = 1;` L6 / `f();` L7 /
   `console.log(x);` L8，**When** 分析，**Then** `x` 的 pair 恰為 `x: L1 -> L5` 與 `x: L6 -> L8`；沒有 `x: L6 -> L5`、`x: L1 -> L8`。
   [SRC PRB P1；HD D3]
2. **Given** `var x = 0;` L1 / `function set() {` L2 / `x = 1;` L3 / `}` L4 / `function get() {` L5 / `return x;` L6 / `}` L7 /
   `set();` L8 / `get();` L9 / `console.log(x);` L10 / `x = 2;` L11 / `get();` L12 / `console.log(x);` L13，**When** 分析，
   **Then** 有 `x: L3 -> L6`、`x: L11 -> L6`、`x: L3 -> L10`、`x: L11 -> L13`；沒有 `x: L11 -> L10`、`x: L3 -> L13`，也沒有 L1 的 `x`
   到達 L6、L10、L13。[SRC PRB P2]
3. **Given** `var x = 0;` L1 / `function f(c) {` L2 / `if (c) {` L3 / `x = 1;` L4 / `}` L5 / `}` L6 / `f(0);` L7 / `console.log(x);` L8，
   **When** 分析，**Then** 有 `x: L1 -> L8` 與 `x: L4 -> L8`（被呼叫端只在一條分支定義 `x`，不是 must-KILL）。迴歸守門：現況已成立。[SRC HD D3]
4. **Given** 004 的 `specs/004-fix-remaining-issues/probes/cyc-3.js`（方法 `m` 有區域變數 `t`，L5 遞迴呼叫自己、L6 讀 `t`），
   **When** 分析，**Then** 仍有 `t: L4 -> L6`：遞迴呼叫返回後，外層那次執行的區域變數不被內層那次的定義汙染或殺掉；分析會終止。
   [SRC D004 FR-015、FR-016]
5. **Given** 上述程式，**When** 輸出攤平圖，**Then** 另有 call 邊與 return 邊的配對資訊：每條 return 邊都能對應到唯一的 call 邊（呼叫點），
   且 US1 情境 1 中 `f` 的 exit 到 L4 與到 L7 呼叫點的返回節點（callReturn）的兩條 return 邊，分別對應 L4 與 L7 的 call 邊。[SRC USR D4]
6. **Given**（改自 MDN「Classes in JavaScript」的 `Person`）`let count = 0;` L1 / `class Person {` L2 / `name = count;` L3 /
   `constructor(name) {` L4 / `count = count + 1;` L5 / `this.name = name;` L6 / `}` L7 / `}` L8 / `new Person("Giles");` L9 /
   `console.log(count);` L10，**When** 分析，**Then** 一個呼叫點依序串接欄位初始化式與 constructor 的摘要：有 `count: L1 -> L3`、
   `count: L1 -> L5`、`count: L5 -> L10`，沒有 `count: L1 -> L10`。守門：現況已成立。[SRC PRB P16；D004 FR-018]

---

### User Story 2 - 函式內呼叫頁面層定義的函式 (Priority: P1)

在函式（含事件處理器、方法）中呼叫頁面層唯一定義的函式，也連到被呼叫端，讓摘要分析涵蓋實際程式中最常見的呼叫。

**Why this priority**: 不放寬時 stage 2 只對頁面層的呼叫與 class 方法有效，事件處理器呼叫共用函式、互相遞迴的函式都無法分析（Fable A3）。

**Independent Test**: 分析下列程式。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` L1 / `function f() {` L2 / `x = 7;` L3 / `}` L4 / `function a() {` L5 / `x = 1;` L6 / `f();` L7 /
   `console.log(x);` L8 / `}` L9 / `a();` L10，**When** 分析，**Then** `f();` 連到 `f`，有 `x: L3 -> L8`，沒有 `x: L6 -> L8`。
   [SRC PRB P3；USR D2]
2. **Given** 同上但 `f` 以 `const f = () => { x = 7; };` 或 `let f = function () { x = 7; };` 定義，**When** 分析，**Then** 同樣連結；
   以 `var f = function () {...}` 定義、`f` 在頁面有兩筆定義（例如另有 `f = g;`）、或函式內以 `new f()` 呼叫時，**Then** 不連結
   （`x: L6 -> L8` 維持）。[SRC USR D2、R2-3；D004 FR-018]
3. **Given** `var n = 3;` L1 / `function even() {` L2 / `if (n) {` L3 / `n = n - 1;` L4 / `odd();` L5 / `}` L6 / `}` L7 /
   `function odd() {` L8 / `if (n) {` L9 / `n = n - 1;` L10 / `even();` L11 / `}` L12 / `}` L13 / `even();` L14 / `console.log(n);` L15，
   **When** 分析，**Then** 分析完成且會終止；有 `n: L4 -> L9>L10:T`、`n: L10 -> L3>L4:T`、`n: L1 -> L15`、`n: L4 -> L15`、`n: L10 -> L15`。
   [SRC PRB P7；USR D2；D004 FR-015]
4. **Given** `var x = 0;` L1 / `function a() {` L2 / `function f() {` L3 / `x = 7;` L4 / `}` L5 / `x = 1;` L6 / `f();` L7 /
   `console.log(x);` L8 / `}` L9 / `a();` L10（所在模型有 `f` 的到達定義），**When** 分析，**Then** 依 004 FR-018 的嚴格規則以到達定義
   連到區域函式 `f`；有 `x: L4 -> L8`，沒有 `x: L6 -> L8`。守門：現況已成立。[SRC D004 FR-018；PRB P12]
5. **Given** `var n = 3;` L1 / `function f() {` L2 / `if (n) {` L3 / `n = n - 1;` L4 / `f();` L5 / `}` L6 / `}` L7 / `f();` L8 /
   `console.log(n);` L9，**When** 分析，**Then** L5 的 `f();` 連到 `f`（自身遞迴）；有 `n: L4 -> L3>L4:T`、`n: L1 -> L9`、`n: L4 -> L9`。
   [SRC PRB P10；USR D2；D006]
6. **Given** `var n = 3;` L1 / `var g = function fact() {` L2 / `if (n) {` L3 / `n = n - 1;` L4 / `fact();` L5 / `}` L6 / `};` L7 / `g();` L8 /
   `console.log(n);` L9，**When** 分析，**Then** L5 的 `fact();` 連到該函式；有 `n: L4 -> L3>L4:T`、`n: L1 -> L9`、`n: L4 -> L9`。
   [SRC PRB P11；USR D2；D006]

---

### User Story 3 - 例外離開不算返回呼叫端 (Priority: P2)

被呼叫端中可能拋錯的節點，其例外路徑不回到呼叫之後；摘要只看正常返回。

**Why this priority**: 否則任何含呼叫的函式都算不上 must-KILL，摘要幾乎沒有殺掉效果，不可實現的 pair 仍大量存在（Fable A4）。

**Independent Test**: 分析下列程式。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` L1 / `function s() {` L2 / `console.log(1);` L3 / `x = 1;` L4 / `}` L5 / `s();` L6 / `console.log(x);` L7，
   **When** 分析，**Then** 有 `x: L4 -> L7`，沒有 `x: L1 -> L7`。[SRC PRB P4；USR D3]
2. **Given**（改自 MDN Guide「Control flow and error handling」的「Utilizing Error objects」，加觀察變數 `state`）`let state = "idle";` L1 /
   `function doSomethingErrorProne() {` L2 / `if (ourCodeMakesAMistake()) {` L3 / `throw new Error("The message");` L4 / `}` L5 /
   `doSomethingToGetAJavaScriptError();` L6 / `state = "done";` L7 / `}` L8 / `try {` L9 / `doSomethingErrorProne();` L10 / `} catch (e) {` L11 /
   `console.error(e.name);` L12 / `console.error(state);` L13 / `}` L14 / `console.log(state);` L15，**When** 分析，**Then** 有 `state: L1 -> L13`
   （被呼叫端 L4 或 L6 拋錯時呼叫前的定義經例外到達 `catch`）、`state: L1 -> L15`（經 `catch` 之後）、`state: L7 -> L15`（正常返回）、
   `e: L11 -> L12`。`state: L7 -> L13` 依 Q-a 的決定。[SRC USR D3；PRB P13]
3. **Given** `var x = 0;` L1 / `function s() {` L2 / `x = 1;` L3 / `console.log(1);` L4 / `x = 2;` L5 / `}` L6 / `try {` L7 / `s();` L8 /
   `} catch (e) {` L9 / `console.log(x);` L10 / `}` L11，**When** 分析，**Then** 有 `x: L3 -> L10`（L4 拋錯時有效的定義經摘要第四項到達
   呼叫端的 `catch`）。守門：現況已成立（`probes/us3-3.js`）。[SRC USR R2-2]
4. **Given**（改自同頁「The finally block」第一個範例，補上各函式本體與觀察變數 `opened`）`let opened = false;` L1 / `function openMyFile() {` L2 /
   `opened = true;` L3 / `}` L4 / `function writeMyFile(data) {` L5 / `console.log(data);` L6 / `}` L7 / `function closeMyFile() {` L8 /
   `opened = false;` L9 / `}` L10 / `function handleError(e) {` L11 / `console.error(e);` L12 / `}` L13 / `openMyFile();` L14 / `try {` L15 /
   `writeMyFile(opened);` L16 / `} catch (e) {` L17 / `handleError(e);` L18 / `} finally {` L19 / `closeMyFile();` L20 / `}` L21 /
   `console.log(opened);` L22，**When** 分析，**Then** 有 `opened: L3 -> L16`、`opened: L9 -> L22`，沒有 `opened: L1 -> L16`、`opened: L1 -> L22`
   （`finally` 中的呼叫在正常與例外兩條路上都殺掉先前的定義）。守門：現況已成立。[SRC USR R2-2；PRB P14]
5. **Given** `var x = 0;` L1 / `function s() {` L2 / `x = 1;` L3 / `console.log(1);` L4 / `x = 2;` L5 / `}` L6 / `function t() {` L7 /
   `s();` L8 / `x = 3;` L9 / `}` L10 / `function h() {` L11 / `console.log(x);` L12 / `}` L13 / `document.addEventListener('click', h);` L14 /
   `t();` L15，**When** 分析 intra-page，**Then** L8 的 `s();` 連到 `s`（D2），且有 `x: L3 -> L12`（L4 拋錯時有效的定義沿 `s` → `t` → 頁面層
   往外，沒有 `try`，進 LOOP 後到達處理器）、`x: L9 -> L12`、`x: L1 -> L12`。[SRC USR R2-2、D2；PRB P15]
6. **Given**（改自同頁「The finally block」第三個範例，`finally` 改為賦值、外層 `console.log(f())` 改為呼叫敘述）`let r = 0;` L1 /
   `function f() {` L2 / `try {` L3 / `r = 1;` L4 / `throw "bogus";` L5 / `} catch (e) {` L6 / `r = 2;` L7 / `throw e;` L8 / `} finally {` L9 /
   `r = 3;` L10 / `}` L11 / `}` L12 / `try {` L13 / `f();` L14 / `} catch (e) {` L15 / `console.log(r);` L16 / `}` L17 / `console.log(r);` L18，
   **When** 分析，**Then** 有 `r: L10 -> L16`、`r: L10 -> L18`，沒有 `r: L7 -> L16`、`r: L7 -> L18`（`catch` 內重拋的例外先經 `finally` 才離開
   被呼叫端）。[SRC PRB P17；USR Q-b]

---

### User Story 4 - 事件處理器的進入與返回也要配對 (Priority: P2)

intra-page 中，事件處理器由 LOOP 節點進入時，其返回只回到 LOOP；同一函式另被直接呼叫時，直接呼叫的返回只回到該呼叫點。

**Why this priority**: 事件處理器常被直接呼叫做初始化；不配對會產生不可實現的 pair（Fable A8）。

**Independent Test**: 分析下列程式的 intra-page 模型。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` L1 / `function h() {` L2 / `}` L3 / `document.addEventListener('click', h);` L4 / `h();` L5 /
   `console.log(x);` L6 / `x = 2;` L7，**When** 分析 intra-page，**Then** 有 `x: L1 -> L6`，沒有 `x: L7 -> L6`（由 LOOP 進入 `h` 時只返回
   LOOP，不會回到 L5 呼叫之後）。[SRC PRB P5；USR N1]
2. **Given** `var x = 0;` L1 / `function f() {` L2 / `}` L3 / `function h1() {` L4 / `x = 1;` L5 / `f();` L6 / `}` L7 /
   `function h2() {` L8 / `x = 2;` L9 / `f();` L10 / `console.log(x);` L11 / `}` L12 / `document.addEventListener('click', h1);` L13 /
   `document.addEventListener('keyup', h2);` L14，**When** 分析 intra-page，**Then** 有 `x: L9 -> L11`，沒有 `x: L5 -> L11`
   （從 h1 的呼叫進入 `f`、返回 h2 的呼叫之後是不可實現路徑）。守門：現況因 `f()` 不連結而成立，套用 D2 後須仍成立。[SRC PRB P6；USR D2]

---

### User Story 5 - 函式的 entry 節點不讀取本體中的變數 (Priority: P1)

函式的 entry 節點只代表進入函式（參數的定義等），不再把本體敘述的讀取算在自己身上。

**Why this priority**: 目前會讓分析拋錯（P9），且每個被呼叫的函式都多出重複的 pair；摘要的 upward-exposed uses 也會被汙染。

**Independent Test**: 直接檢查函式 entry 節點的 use 集合，並分析下列程式。

**Acceptance Scenarios**:

1. **Given** KI §18 程式，**When** 建立模型，**Then** `f` 的 entry 節點的 c-use 與 p-use 集合皆為空；`x`、`a`、`o`、`b` 的讀取只在各自
   敘述的節點。（`f` 未被呼叫時頁面各層沒有其 pair，故以節點的 use 集合驗證。）[SRC KI §18；PRB P8]
2. **Given** `var x = 0;` L1 / `function g() {` L2 / `x = 1;` L3 / `}` L4 / `function f() {` L5 / `switch (x) {` L6 / `case 1:` L7 /
   `g();` L8 / `}` L9 / `x;` L10 / `}` L11 / `f();` L12，**When** 分析，**Then** 分析完成；`switch (x)` 的 p-use 在 L6 節點上，沒有任何以
   `entry` 為 use 端的 `x` pair。[SRC PRB P9]
3. **Given** US1 情境 2 程式，**When** 分析，**Then** 沒有 `x: L3 -> entry`、`x: L11 -> entry`；004 cyc-3 沒有 `t: L4 -> entry`、
   `p: entry -> entry`。[SRC KI §18]

---

### Edge Cases

- 遞迴與互相遞迴：摘要以不動點求得，分析必定終止；無條件遞迴使函式沒有正常返回時，呼叫之後的節點不可達（KI §22 (5) 的 dead-code pair
  在 008 處理，本 feature 不得讓它變多）。
- 變數身分以宣告（binding，006 的 `scopebinding`）判定，不以名稱判定：被呼叫端中與呼叫端同名的區域變數或參數，不屬於摘要中呼叫端的變數。
- 未宣告就讀取的全域（006：頁面 entry 的全域定義）在摘要中與其他頁面層變數相同。
- 被呼叫端自己的區域變數與參數不出現在對呼叫端的摘要中（GEN／must-KILL 只含呼叫端可見的變數）。
- 004 FR-016 的繞過（呼叫端的區域變數、參數、block `let`／`const` 不被被呼叫端殺掉）在摘要下仍成立。
- 一個呼叫點連到多個被呼叫端（004 的 `new A()`：欄位初始化式再 constructor；class static 成員）時，依序串接各自的摘要（US1 情境 6）。
- 呼叫解析失敗（callee 不可判定）時維持不連結、不報錯。
- 被呼叫端沒有任何正常返回路徑（例如一定拋錯）：呼叫之後的節點只經呼叫端自己的例外處理可達。
- inter-page：頁面之間以 localStorage 傳遞的定義不受呼叫摘要影響（頁面不是被呼叫端）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 每個被呼叫端（函式、方法、constructor、欄位初始化式、事件處理器）MUST 有摘要（GEN at exit、must-KILL、upward-exposed uses，
  皆只沿正常返回路徑；另含例外離開時可能有效的定義；全部只含呼叫端可見的變數），呼叫端的分析 MUST 以摘要計算經過呼叫的資料流程。
  可觀察的結果是 US1–US4 的 pair。[SRC HD D3；USR D3、R2-2]
- **FR-002**: 被呼叫端內部的 use MUST 只得到「從某個實際呼叫點進入時可實現」的定義；呼叫端在呼叫之後的 use MUST 只得到「該呼叫點進入前、
  未被 must-KILL 的定義」與「被呼叫端的 GEN」。[SRC HD D3；PRB P1、P2]
- **FR-003**: 遞迴與互相遞迴 MUST 以不動點計算摘要，分析必定終止；遞迴返回後，外層那次執行的區域變數與參數 MUST 不受內層定義影響。
  [SRC D004 FR-015、FR-016]
- **FR-004**: 004 FR-016 的繞過 MUST 維持；呼叫端與被呼叫端的同名變數 MUST 以宣告（binding）區分。[SRC D004 FR-016；D006]
- **FR-005**: 函式內的 `f()` 在所在模型沒有 `f` 的到達定義時，若 `f` 的 binding 在全頁只有一筆定義，且為函式宣告、`const`／`let` 綁定的
  函式運算式或具名函式運算式的內部名稱，MUST 連到該函式（含自身遞迴）；函式內的 `new F()` 與其他情形依 004 FR-018。[SRC USR D2、R2-3；D006]
- **FR-006**: 被呼叫端中未被捕捉的例外 MUST 不回到呼叫之後的節點；例外離開時可能有效的定義 MUST 流向呼叫端的 `catch`／`finally`，呼叫端
  沒有 `try` 時沿呼叫鏈往外，到頁面層或事件處理器層時進 LOOP。[SRC USR D3、R2-2]
- **FR-007**: intra-page 中，事件處理器由 LOOP 進入時 MUST 只返回 LOOP；同一函式被直接呼叫時 MUST 只返回該呼叫點。[SRC PRB P5、P6]
- **FR-008**: 函式的 entry 節點 MUST 不含本體敘述的 use；本體中 `switch`、`for-in`、`for-of` 等的讀取只記在各自節點。[SRC KI §18；PRB P8、P9]
- **FR-009**: 攤平的敘述層級圖與階層圖 MUST 繼續輸出；MUST 不為每個呼叫點複製被呼叫端（現況因模型串接產生的重複節點照舊）；pair 以摘要
  分析的結果為權威，各層模型與攤平圖附帶的 pair 一致。[SRC USR D4、R2-1；HD 雙輸出]
- **FR-010**: 攤平圖的輸出 MUST 附帶 call 邊與 return 邊的配對資訊（每條 return 邊對應唯一的呼叫點，LOOP 的進入與返回亦同；被呼叫端的
  例外邊經 exit 之後只接到呼叫端的例外後繼），供測試路徑產生器只取呼叫與返回相配的路徑。輸出格式由 plan 決定；配對資訊的輸出方式 MUST
  不改動 `.dot`；D2／FR-005 造成的邊變化列入 golden-diff。[SRC USR D4、R2-1]
- **FR-011**: golden 的每一處差異 MUST 記錄於 `golden-diff.md` 並對應到 FR 或 KI 節次；`tests/golden/manifest.json` 隨之明確更新。[SRC USR D5]
- **FR-012**: `docs/known-issues.md` MUST：§18 標為已修正；§22 (0) 註明函式內 `f()` 的放寬；§22 (4) 更正前提（`setItem` 目前不產生定義、
  localStorage 不分 key）並註明移到另開的儲存模型 feature；§16、§22 (3) 註明排入 007，§22 (1)、(5)、§23 排入 008；本輪新發現的問題新增章節。README 的限制說明隨之更新（含 D2 的放寬與
  D3 的例外語意）。[SRC USR D1]
- **FR-013**: 函式內 `catch` 中拋出的例外 MUST 先經同一 `try` 的 `finally` 才離開函式（與不在函式中時的行為一致）；`docs/known-issues.md` 新增此
  問題的章節並標為已修正。[SRC PRB P17；USR Q-b]

### Key Entities

- **摘要（Summary）**：被呼叫端對呼叫端的效果（GEN at exit、must-KILL、upward-exposed uses），只看正常返回，遞迴時由不動點求得。
- **呼叫配對（call/return matching）**：攤平圖中每條 return 邊所屬的呼叫點（或 LOOP），供路徑產生器使用。
- **Golden 差異紀錄**：每處 golden 變化及其對應的 FR 或 KI 節次。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 本 spec 的全部驗收情境都有對應的自動化測試且通過。
- **SC-002**: PRB P1–P11 全部得到預期結果；KI §18 的重現程式符合 US5 情境 1。
- **SC-003**: 既有測試全部通過（編碼舊行為的測試更新並列入 golden-diff）；golden 差異 100% 有對應記錄。
- **SC-004**: 現有 golden fixture 與 004 研究所用的 MDN 範例集（33 個程式）全部能完成分析、不拋錯；總分析時間不超過 `develop` 的 2 倍。
- **SC-005**: MDN 範例集中，每一個相對 `develop` 消失的 pair 都能以「不可實現路徑」「例外不返回」「呼叫無正常返回」或 §18 說明；每一個新增的 pair 都對應到 FR-005
  的放寬或 FR-008。

## Assumptions

- 函式的回傳值仍不建模為定義；只追蹤變數的資料流程（回傳值與運算式中的呼叫屬 007）。
- 只有呼叫敘述（含 004 已支援的 `new` 敘述、方法呼叫敘述、實例欄位初始化）是 call-site；運算式中的呼叫在 007 處理。
- 呼叫與決策節點、引數的先後（KI §16）維持現況，007 處理；本 feature 的驗收程式避免依賴該順序。
- 方法查找仍不沿 `extends` 鏈；`this.m()` 仍連到同一 class 的 `m`（004 決策沿用）。
- 摘要內容是否另外輸出成檔案或顯示在報告中，由 plan 決定；本 spec 只要求 pair 與配對資訊正確。
- 分析時間的基準以本機執行 golden fixture 與 MDN 範例集量測（MDN 範例集與基準見 `specs/006-eslint-scope/mdn/`）。
