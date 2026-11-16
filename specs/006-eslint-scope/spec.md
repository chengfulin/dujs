# Feature Specification: 改用 eslint-scope 判定變數的宣告與參照

**Feature Branch**: `006-eslint-scope`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "整合現在的 worklist 方法，利用成熟的套件 eslint-scope 找變數在哪邊被定義、被使用（ESLint code path analysis 找 CFG 先做 prototype，不在本 feature）。先插 eslint-scope，再做 005。"（2026-11-16 討論，見「範圍決策」）

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| KI | `docs/known-issues.md` | 各問題的重現輸入與目前結果（§2、§8、§18、§22 (2)、§24） |
| S005 | `specs/005-summary-analysis/spec.md`（在 branch `005-summary-analysis`；Clarifications「暫停說明」、R2-3） | 005 依賴本 feature 的部分：變數以宣告區分、宣告種類、catch 參數算定義 |
| PRB | `specs/006-eslint-scope/probes/*.js`，對 `develop`（584e17d）的探測結果（見「探測結果」） | 目前行為的實測證據 |
| USR | 本 feature 的需求討論與 spec review（2026-11-16，記錄於「範圍決策」） | 範圍、golden 政策與各邊界情形的處置 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | PRB catch-a、catch-b、catch-c、catchloop、catchinner、catch-edge；USR D4；Clarifications |
| US2 | KI §2、§22 (2)；PRB named-expr、classdecl、pdef；USR D7；S005 R2-3 |
| US3 | KI §24；PRB globals；USR D3 |
| US4 | KI §8；USR D1、D2、D5、D6；PRB annexb、with、evalouter、mod、shadow-*、op；Clarifications |

### 範圍決策（USR）

- **D1**（spec review 修訂，Fable F3）：eslint-scope 只決定兩件事，作為唯一來源：(1) 每個 scope 有哪些宣告（名稱、種類、宣告節點）；(2) 每個識別字
  解析到哪個宣告（或未解析）。def／use 的分類、定義發生在哪個節點、定義的種類（函式、字面值、undefined 初值…）仍由 dujs 的 AST 走訪決定
  （例如 `o.p = 1` 在 dujs 仍是 `o` 的定義、`var u;` 仍有 undefined 初值，這些行為本 feature 不變）。worklist、CFG、四層模型與 scope 的命名
  （`$DOMAIN.$PAGE_0.f`、`$ANONYMOUS_FUN_n` 等）維持現狀。ESLint code path analysis 取代 CFG 不在本 feature，先另做 prototype。[SRC USR D1]
- **D2**：golden 只允許下列差異，每一處逐項記入 `specs/006-eslint-scope/golden-diff.md` 並說明對應的 FR；其他差異視為迴歸，不得以更新 golden 放行：
  識別字解析到正確宣告（FR-002–FR-005）、未宣告讀取的全域（FR-006）、catch 節點的讀取（D4）、Annex B（D5）、解析修正導致的呼叫連結增減（FR-013）。[SRC USR D2]
- **D3**：一併處理 KI §24：未宣告就讀取的識別字視為在其頁面 entry 定義的全域（取代固定清單；清單內的物件行為不變）。`typeof x` 中的 `x`、
  `globalThis` 一視同仁；`undefined`、`NaN`、`Infinity` 視為常值，以名稱排除（spec review，使用者決定）。未宣告就賦值的隱含全域維持現行處理。
  `arguments`（含頂層與頂層箭頭函式中 eslint-scope 未解析者，以名稱排除）與 `this` 不是本規則的對象（維持沒有 pair）。未解析的名稱在一頁內
  以「頁面＋名稱」合併成同一個變數（讀與寫共用），不依賴 eslint-scope 的 `globalScope.implicit`（module 與 strict 下為空）。[SRC USR D3]
- **D4**（spec review，Fable F2）：一併修正 catch 子句節點：它只定義 catch 參數，不使用 catch 區塊內的讀取（目前會走訪整個區塊，產生
  `console: entry -> L4` 與迴圈中的假 pair）。[SRC USR D4]
- **D5**（spec review，Fable F4）：block 內的函式宣告（Annex B）完全依 eslint-scope：綁定只存在於該 block；block 外的同名參照成為未解析，依 D3
  成為頁面全域，呼叫不再連結。差異列入 golden-diff，README 寫入限制。D5 優先於 D6（含直接 `eval` 的函式中的 block 函式也依 D5）。[SRC USR D5]
- **D6**（spec review，Fable F5、N2）：凡 eslint-scope 未解析的參照（直接 `eval` 會讓所有外層 scope 變為動態，`with` 亦同），以名稱沿該參照所在
  scope 的 eslint-scope scope chain 往外查找，找到宣告即解析到它，找不到才依 D3 成為全域；結果與 `develop` 相同（D5 除外）。這與 D3 的「頁面＋名稱」
  合併（含其名稱排除），以及固定清單與 `localStorage` 的名稱對應，是「唯一來源」僅有的具名例外（FR-012 (1) 的白名單），且只用 eslint-scope 的 scope 資訊。（plan 可評估以 eslint-scope 的 `optimistic` 選項達成相同結果。）[SRC USR D6]
- **D7**（spec review，Fable F8、N1）：具名函式運算式的內部名稱定義於該運算式節點（與函式宣告一致），定義種類為函式定義；其本體中的自我遞迴呼叫
  依 004 FR-018 不連結（與函式宣告的自我遞迴一致，004 research P5），留給 005 的「函式內 `f()` 放寬」統一處理。[SRC USR D7]

### 探測結果（PRB，`develop` 584e17d）

以 `node specs/004-fix-remaining-issues/probes/run.js specs/006-eslint-scope/probes/<檔名>` 執行。

| 檔名 | 目前結果（節錄） | 問題 |
|------|------------------|------|
| catch-a | 有 `e: L3 -> L4`、`e: L5 -> L8`、`console: entry -> L4` | catch 區塊內 `e = 3` 被當成外層 `e`；catch 節點使用區塊內的讀取 |
| catch-b | 有 `e: L3 -> L5`、`e: L3 -> L4` | catch 參數不是定義，區塊內的讀取得到外層 `e` |
| catch-c | 沒有 `message`、`err` 的 pair | 解構與一般 catch 參數都不是定義 |
| catchloop | 有 `e: entry -> L5`、`e: L6 -> L5`、`e: L6 -> L11`、`e: L6 -> entry`、`e: entry -> entry` | 外層沒有 `e` 時，catch 內的賦值變成頁面隱含全域並外洩到其他函式 |
| catchinner | 有 `g: entry -> L5`，沒有 `e` 的 pair | catch 節點使用區塊內的讀取；內層函式讀不到 catch 參數 |
| catch-edge | 有 `e: L3 -> L4`、`e: L10 -> L13`、`e: L8 -> L9` | 無參數 catch 的節點使用區塊內讀取；`catch (e) { var e = 4; }` 的初值被當成外層 `e` |
| named-expr | 沒有 `Q`、`fact` 的 pair | KI §22 (2) |
| classdecl | 有 `A: L1 -> L2`、`A: L5 -> L6` | 守門：class 內的 `A` 解析到 class 內層綁定 |
| pdef | 有 `x: entry -> L2` | 參數預設值的 `x` 被解析到函式內的 `var x`，應為外層 |
| globals | 只有 `console`、`t`、`undeclared` 的 pair | KI §24 |
| annexb | `f()`、`g2()` 連結到 block 內宣告的函式 | 依 D5 改變 |
| with | 有 `q: L3 -> L4`、`p: L2 -> L2` | 守門（D6） |
| evalouter | 有 `a: L2 -> L3`、`a: L2 -> L5`、`p: entry -> L5` | 守門（D6：eval 讓外層 scope 也變動態） |
| args | `arguments` 沒有 pair | 守門（D3） |
| tyof | 只有 `console` 的 pair | `zz` 依 D3 新增；`undefined`、`NaN`、`this` 維持沒有 pair |
| shadow-block、shadow-param、shadow-loop | 結果正確 | 守門 |
| op | `o.p = 1` 是 `o` 的定義（`o: L7 -> L8`） | 守門（D1：def／use 分類不變） |
| mod | intra-page 有 `m: L1 -> L3`、`t: L2 -> L3`、`w: L5 -> L6`、`fn: entry -> L4` | 守門（module） |

## Clarifications

### Session 2026-11-16（spec review）

- Q: US4 情境 6（沒有以名稱查找變數的路徑）與「golden 差異都屬 D2 類別」怎麼驗收？ → A: 加自動檢查：靜態測試禁止以名稱查找變數的路徑
  （D3、D6 列白名單）；`golden-diff.md` 每筆差異帶 D2 類別標記，由腳本核對每一處 golden 差異都有對應且類別合法（FR-012）。
- Q: module 程式怎麼守門？ → A: 新增 module 探測程式 `probes/mod.js` 與 US4 情境 8，結果須與 `develop` 相同。
- Q: FR-001 的「可查詢宣告種類與宣告節點」驗什麼？ → A: 規定查詢介面並補單元測試：有宣告的變數與 eslint-scope 宣告一對一；種類列舉為
  var／let／const／函式／class／參數／catch 參數／import／具名運算式名稱／全域／隱含全域（FR-001、US4 情境 9）。

### Session 2026-11-16（clarify）

- Q: 呼叫解析（callee 的 `f()`、`new X()`、`o.m()` 與 004 FR-018「全頁只有一筆定義」的 class 放寬）也以名稱查變數，怎麼處理？ → A: 全部改依
  eslint-scope 的宣告判定（不列為白名單例外）；004 FR-018 的規則內容不變，只改變「哪個變數、全頁幾筆定義」的判定來源（FR-013）。（clarifier H1）
- Q: golden 與 MDN 的差異「屬於允許類別」怎麼判定？ → A: 以每個 pair（及模型數量的變化）為一筆差異；每個 D2 類別有可機械檢驗的判準，同一支腳本判定
  golden 與 MDN 的差異（FR-012 (2)）。（clarifier H2）
- Q: 給 005 的宣告介面，多個宣告與讀寫並存的未宣告名稱怎麼處理？ → A: 以 eslint-scope 的 Variable 為單位，可查全部宣告節點與各自種類；未宣告名稱
  只要頁面中有賦值即為「隱含全域」，只有讀取才是「全域」；`arguments` 這類 eslint-scope 已解析但沒有宣告的變數，不建立 dujs 變數（維持沒有 pair）。（clarifier M3）
- Q: 新增的未宣告全域（`Math`、`alert` 等）的定義種類？ → A: 新增 `global` 定義種類；現有清單（`htmlDom`、`object`）不變。（clarifier M3b）
- 依 §CP-4（可驗證）自行決定：無參數的 `catch {}`、`catch (e) { var e = 4; }`（依 Annex B.3.5，初值賦給 catch 參數）與 catch 內的內層函式讀取 catch
  參數，列入 US1 情境 5、6 驗收；`undefined`、`NaN`、`Infinity` 只在未解析時以名稱排除（本地宣告的 `var undefined` 照一般變數處理），列入 FR-012 白名單。
  （clarifier M1、M2、M3b）
- 依 §CP-1（可追溯）自行決定：範圍對照補 KI §8（block 內函式的 scope 命名 `f_1`、`$BLOCK_n.f` 不變）與 KI §2（參數預設值）；KI §1 不在範圍，自來源表移除。
  （clarifier M4）

### Session 2026-11-16（clarify 後 Fable 仲裁）

- Q: class 宣告的外層與 class 內層兩個綁定，在 004 FR-018 的「全頁只有一筆定義」中怎麼計數？ → A: 內外合併計數（class 外對同名的賦值也算），結果與
  `develop` 相同；放寬留給 005（link-n5 守門）。（Fable A2）
- Q: FR-013 讓部分呼叫的連結改變（link-n4、link-n8a、link-n9 由不連變連；link-n10 由連變不連），怎麼處置？ → A: 接受，D2 新增第 5 類「解析修正導致的
  呼叫連結增減」，逐項記錄，並列為 US4 情境 10。（Fable A1）
- Q: 呼叫連結變化（D5 與上題）衍生的 pair 增減怎麼驗？ → A: 腳本驗觸發條件（該頁確有對應的呼叫點，其 callee 的解析結果改變），衍生的 pair 逐筆人工
  簽核並釘住筆數，筆數不符即檢查失敗。（Fable A5b）
- 依 Fable 建議直接修正：差異單位加入 `dupairs.dot` 的變數列增減、`graph.dot`／`hierarchy.dot` 只允許在有連結變化的頁面改變（A3）；識別字解析類判準改以原始碼
  的 eslint-scope 結果判定（A4）；catch 類判準收窄（A5a、A5c）；白名單加固定清單與 `localStorage` 的名稱對應，FR-013 涵蓋 handler 識別字與 004 FR-016 的
  可見性判定（A6）；FR-001 明定以參照的解析為準、宣告節點為 `Definition.node`（A7）；殘留舊措辭與 module 一句（A8）；MDN 基準快照（A9）；US1 補列（A10）。

### Session 2026-11-17（plan review：plan 作者 U1–U4 與 Fable 仲裁）

- Q: 名稱為 `$`、非 ASCII 等合法識別字的變數？ → A: dujs 變數名放寬為 ES IdentifierName（否則 FR-006 會讓只讀 `$` 的程式拋錯）；scope 保留名稱
  （`$ANONYMOUS_FUN_n` 等）可能相撞的情形加測試或記入 KI。（U1）
- Q: 被呼叫端的同名區域變數是否遮蔽外層（004 FR-016 的可見性）需要比名稱，怎麼處理？ → A: 以 eslint-scope 的 scope 比對名稱，視為 FR-013 的實作，列入
  FR-012 (1) 白名單。（U2）
- Q: class 內層名稱、catch 參數、具名運算式名稱沒有自己的 dujs scope，被呼叫端看不看得到它們？ → A: 以「定義所在的 dujs scope 是被呼叫端的祖先或本身」判定
  可見，保住 `develop` 既有的 pair（例如 class 方法經由另一個函式呼叫時的 `A: L1 -> L3`，probes/vis3.js 守門）。（Fable F1）
- Q: catch 節點目前也定義區塊內的賦值（def 端為 catch 行），D4 修正後這類 pair 消失，怎麼歸類？ → A: catch 類加判準：移除的 pair 其 def 行為 CatchClause
  所在行且變數不是該 catch 參數。（U3）
- Q: 頁面只有 catch 參數 `e`、沒有其他宣告時，`develop` 把它當隱含全域（`e: entry -> …`），修正後消失，怎麼歸類？ → A: catch 類加判準：名稱為 catch 參數名
  且該頁沒有同名的其他宣告時，該名稱移除的 pair 與變數列歸 catch 類。（Fable F2）
- Q: 未宣告名稱被 `++`、for-in 左側、解構、`G.p = v` 寫入時產生非 entry 的定義，怎麼歸類？ → A: 全域類放寬為「該頁未解析名稱的任何新增 pair 或變數列」；
  `G.p = v` 依 D1 仍是 `G` 的定義，種類仍為 `global`（eslint-scope 視為讀取）。（U4、Fable F4）
- Q: 函式 entry 節點（KI §18）以身分查詢後會讀到 block 內的 `let`／`const`，怎麼處理？ → A: 維持 `develop`：entry 節點只認從函式 scope 可見的變數；KI §18
  整體留給 005。（Fable F5）
- Q: 以 `$` 開頭的函式名（`function $(s){}`）在 develop 與本 feature 都拋 `Invalid value for a FunctionScope`，要一併處理嗎？ → A: 不在本次範圍（FR-009
  scope 命名不變），記入 KI。（plan review）
- Q: entry 節點只認函式 scope 可見的變數，使「被 block 內 `let` 遮蔽的讀取」在 entry 的 pair 消失，接受嗎？ → A: 接受，歸解析類並走人工簽核。（plan review）
## 表示法

沿用 `specs/001-fix-known-issues/spec.md`「表示法」：def-use pair 寫成 `<變數>: <def> -> <use>`，`<def>` 為 `entry` 或節點標記；p-use 為
`<決策節點標記>><分支目標節點標記>`。節點標記為 `L<行>`、`entry` 或 `exit`，行號為被分析程式碼的行號（1 起算）。每個情境標明檢查的模型；
「沒有 X」表示該 pair 不得出現；未列出的 pair 不在該情境檢查範圍。同名但不同宣告的變數在 pair 中以名稱表示，驗收時以其宣告所在 scope 區分
（例如 catch 參數 `e` 與外層 `e`）。

## User Scenarios & Testing *(mandatory)*

使用者為以 dujs 分析 client-side JavaScript 資料流程的研究者或工具開發者，以及維護 dujs 的開發者。前者需要每個 pair 的變數都是程式中
真正的那個宣告；後者需要一個由成熟套件維護的 scope 底層，讓後續 feature（005 摘要分析）以宣告而非名稱區分變數。

### User Story 1 - catch 參數是 catch 子句自己的變數 (Priority: P1)

catch 參數（含解構）在 catch 子句定義，只在 catch 區塊內可見；catch 子句節點不使用區塊內的讀取。

**Why this priority**: 目前 catch 參數完全不是定義，區塊內的賦值會汙染外層或變成外洩的隱含全域，是最常見的解析錯誤。

**Independent Test**: 分析 PRB 的 catch-* 程式，比對頁面 intra-procedural 與 intra-page 的 pair。

**Acceptance Scenarios**:

1. **Given** catch-b（`var e = 1;` L1 / `try {` L2 / `e = 2;` L3 / `} catch (e) {` L4 / `console.log(e);` L5 / `}` L6 / `console.log(e);` L7），
   **When** 分析，**Then** 有 catch 參數的 `e: L4 -> L5` 與外層的 `e: L3 -> L7`；沒有 `e: L3 -> L5`、`e: L3 -> L4`、`console: entry -> L4`。[SRC PRB catch-b；USR D4]
2. **Given** catch-a（catch 區塊內 `e = 3;` L5、`console.log(e);` L6，catch 外 `console.log(e);` L8），**When** 分析，**Then** 有 `e: L5 -> L6`（catch 參數）
   與 `e: L3 -> L8`；沒有 `e: L5 -> L8`、`e: L3 -> L4`。[SRC PRB catch-a]
3. **Given** catch-c（`catch ({message})` L4、`console.log(message);` L5；`try { e = 4; } catch (err) { console.log(err); }` L7），**When** 分析，
   **Then** 有 `message: L4 -> L5` 與 `err: L7 -> L7`。[SRC PRB catch-c]
4. **Given** catchloop（頁面沒有 `e`；迴圈中的 catch 內 `e = 3;` L6、`console.log(e);` L7；函式 `f` 內另一個 catch 的內層函式讀 `e`），**When** 分析
   intra-page，**Then** 有 `e: L6 -> L7`；沒有 `e: entry -> L5`、`e: L6 -> L5`、`e: L6 -> L11`、`e: L6 -> entry`、`e: entry -> entry`（catch 的 `e` 不是頁面全域，也不跨
   catch 子句）。修正後另有函式 `f` 內 catch 參數的 `e: L11 -> L11`（同一行的 catch 節點與 `return e`）。[SRC PRB catchloop；USR D4]
5. **Given** catchinner（`var c = 1;` L1 / `function f() {` L2 / `try {` L3 / `c = 2;` L4 / `} catch (e) {` L5 / `var g = function () { return e; };` L6 /
   `g();` L7 / `}` L8 / `}` L9 / `f();` L10），**When** 分析 inter-procedural 與 intra-page，**Then** 有 `e: L5 -> L6`（內層函式讀到 catch 參數）；沒有
   `g: entry -> L5`。[SRC PRB catchinner；Clarifications]
6. **Given** catch-edge（L1–L6：`var e = 1; try { e = 2; } catch { console.log(e); }`；L7–L13：`try { e = 3; } catch (e) { var e = 4; console.log(e); }
   console.log(e);`，各敘述一行），**When** 分析，**Then** 無參數 catch：有 `e: L3 -> L5`，沒有 `e: L3 -> L4`、`console: entry -> L4`；`var e = 4` 的初值
   賦給 catch 參數：有 `e: L10 -> L11` 與 `e: L8 -> L13`，沒有 `e: L10 -> L13`、`e: L8 -> L9`、`console: entry -> L9`。[SRC PRB catch-edge；Clarifications]

---

### User Story 2 - 具名運算式名稱、class 內層名稱與參數預設值解析到正確宣告 (Priority: P1)

**Why this priority**: KI §22 (2) 的漏報與參數預設值的錯誤解析都是 scope 規則問題，eslint-scope 直接給出正確答案。

**Independent Test**: 分析 named-expr、classdecl、pdef。

**Acceptance Scenarios**:

1. **Given** named-expr（`var B = class Q {` L1 / `static s = Q;` L2 / `};` L3 / `var h = function fact(n) {` L4 / `return fact(n);` L5 / `};` L6 /
   `h(1);` L7），**When** 分析 inter-procedural 與 intra-page，**Then** 有 `Q: L1 -> L2` 與 `fact: L4 -> L5`；頁面 intra-procedural 沒有 `Q`、`fact`
   的 pair（只在各自運算式內可見）。[SRC KI §22 (2)；PRB named-expr]
2. **Given** 同上但 L5 改為呼叫敘述 `fact(n - 1);` 並另起一行 `return n;`，**When** 分析，**Then** 有 `fact: L4 -> L5`；`fact(n - 1);` 不連結（與函式宣告的
   自我遞迴一致），分析完成。[SRC USR D7]
3. **Given** classdecl（`class A {` L1 / `static s = A;` L2 / `m() { return new A(); }` L3 / `}` L4 / `A = null;` L5 / `var o = new A();` L6 / `o.m();` L7），
   **When** 分析 intra-page，**Then** 有 `A: L1 -> L2`（class 內層綁定）與 `A: L5 -> L6`（外層綁定），與 `develop` 相同（守門）。[SRC PRB classdecl]
4. **Given** pdef（`var x = 1;` L1 / `function f(a = x) {` L2 / `var x = 2;` L3 / `return a;` L4 / `}` L5 / `f();` L6），**When** 分析 intra-page，
   **Then** 有 `x: L1 -> L2`；沒有 `x: entry -> L2`。[SRC PRB pdef]
5. **Given** shadow-block、shadow-param、shadow-loop，**When** 分析，**Then** 結果與 `develop` 相同（守門）。[SRC PRB shadow-*]

---

### User Story 3 - 未宣告就讀取的全域物件有定義 (Priority: P2)

`Math`、`JSON`、`alert`、`requestAnimationFrame` 等沒有宣告就讀取的識別字，視為在頁面 entry 定義的全域，讀取它們會產生 pair。

**Why this priority**: 固定清單漏掉大多數瀏覽器與 ECMAScript 的全域；改用 eslint-scope 後未解析的參照可直接取得。

**Independent Test**: 分析 globals 與下列程式。

**Acceptance Scenarios**:

1. **Given** globals（`console.log(Math.PI);` L1 / `var t = JSON.stringify({});` L2 / `alert(t);` L3 / `undeclared = 5;` L4 / `console.log(undeclared);` L5），
   **When** 分析，**Then** 有 `Math: entry -> L1`、`JSON: entry -> L2`、`alert: entry -> L3`，以及原有的 `console: entry -> L1`、`t: L2 -> L3`、
   `undeclared: L4 -> L5`。[SRC KI §24；PRB globals]
2. **Given** 原固定清單內的物件（`window`、`document`、`console` 等）與 `localStorage`，**When** 分析 golden fixture，**Then** 這些變數的 pair 與 `develop` 相同。[SRC USR D3]
3. **Given** `console.log(g);` L1 / `g = 1;` L2 / `console.log(g);` L3，**When** 分析，**Then** 有 `g: entry -> L1` 與 `g: L2 -> L3`（守門：現況已成立）。[SRC USR D3]
4. **Given** 函式 `function k() { return Math.max(1, 2); }` 被呼叫，**When** 分析 intra-page，**Then** 有 `Math` 從頁面 entry 到 `return` 節點的 pair。[SRC USR D3]
5. **Given** 兩頁各自讀取 `Math`，**When** 分析 inter-page，**Then** 每頁各自在自己的 entry 定義，不跨頁產生 pair。[SRC USR D3]
6. **Given** args（頂層、頂層箭頭函式與一般函式中的 `arguments`）與 tyof 的 `this.x`，**When** 分析，**Then** `arguments`、`this` 沒有 pair（守門）。[SRC USR D3；PRB args]
7. **Given** tyof（`console.log(typeof zz, undefined, NaN);` L1），**When** 分析，**Then** 有 `zz: entry -> L1`；沒有 `undefined`、`NaN` 的 pair。[SRC USR D3；PRB tyof]
8. **Given** `console.log(globalThis, Infinity);` L1 / `function h() { var undefined = 1; return undefined; }` L2 / `h();` L3，**When** 分析 intra-page，
   **Then** 有 `globalThis: entry -> L1`，沒有 `Infinity` 的 pair；函式內本地宣告的 `undefined` 照一般變數有 `undefined: L2 -> L2`。新全域的定義種類為 `global`。
   [SRC USR D3；Clarifications]

---

### User Story 4 - eslint-scope 是宣告與解析的唯一來源，其餘行為不變 (Priority: P1)

維護者只需要信任一個 scope 底層；除 D2 列出的差異外，分析結果、scope 名稱、模型結構與輸出格式都不變。

**Why this priority**: 兩套解析並存會讓錯誤更難追；golden 不變是確認重構沒有迴歸的手段。

**Independent Test**: 跑既有測試與 golden，並檢查 golden-diff 的每一處差異；分析 annexb、with、op。

**Acceptance Scenarios**:

1. **Given** 既有 golden fixture，**When** 執行 golden 測試，**Then** 每一處差異都在 `golden-diff.md` 中對應到 D2 列出的某一類；沒有其他差異。[SRC USR D2]
2. **Given** 任一被分析程式，**When** 分析，**Then** scope 的名稱與數量與 `develop` 相同（不因 eslint-scope 的 class、catch、function-expression-name 等
   scope 類型新增或改名 dujs scope）；模型的數量與節點結構與 `develop` 相同，D5 與 FR-013 造成的呼叫連結變化除外且逐項記錄。[SRC USR D1、D5；Clarifications]
3. **Given** annexb（`console.log(f);` L1 / `{` L2 / `function f() {}` L3 / `}` L4 / `f();` L5 / `if (true) { function g2() {} }` L6 / `g2();` L7），
   **When** 分析，**Then** scope 名稱不變（仍有 `$DOMAIN.$PAGE_0.f`、`$DOMAIN.$PAGE_0.g2`），但 L5、L7 的呼叫不連結（沒有 inter-procedural 模型）；
   `f`、`g2` 在 L1、L5、L7 的讀取為頁面全域（`f: entry -> L1`、`f: entry -> L5`、`g2: entry -> L7`，字面與 `develop` 相同，區分在於模型數量）。KI §8 的 block 內
   函式 scope 命名（`f_1`、`$BLOCK_n.f`）不變。[SRC PRB annexb；KI §8；USR D5]
4. **Given** with（`var o = {};` L1 / `with (o) { p = 1; console.log(p); }` L2 / `var q = 2;` L3 / `function k(){ eval("var q=3"); return q; }` L4 / `k();` L5），
   **When** 分析 intra-page，**Then** 與 `develop` 相同：有 `q: L3 -> L4`、`p: L2 -> L2`、`o: L1 -> L2`。evalouter（外層函式 `outer` 的 `a`、`p` 在內層 `eval` 影響下）
   同樣與 `develop` 相同：有 `a: L2 -> L3`、`a: L2 -> L5`、`p: entry -> L5`。[SRC PRB with、evalouter；USR D6]
5. **Given** op（`var o = new A();` L7、`o.p = 1;` L8），**When** 分析，**Then** 與 `develop` 相同（`o: L7 -> L8` 維持；def／use 的分類不變）。[SRC PRB op；USR D1]
6. **Given** 程式碼審查，**When** 檢查宣告的收集與識別字的解析，**Then** 皆取自 eslint-scope 的結果；除 FR-012 (1) 白名單（D6 的回退、D3 的「頁面＋名稱」合併與名稱排除、固定清單與 `localStorage` 的名稱對應）外，
   沒有以名稱查找變數的路徑；此情境以 FR-012 的靜態測試驗證。[SRC USR D1；Clarifications]
7. **Given** 004 研究所用的 MDN 範例集（33 個程式），**When** 分析，**Then** 全部完成、不拋錯；相對 `develop` 的每個 pair 差異都屬 D2 列出的某一類。[SRC USR D2]
8. **Given** mod（`import {m} from "x";` L1 / `var t = 1;` L2 / `function fn() { return t + m; }` L3 / `fn();` L4 / `w = 3;` L5 / `console.log(w);` L6 /
   `export default fn;` L7），**When** 分析 intra-page，**Then** 與 `develop` 相同：有 `m: L1 -> L3`、`t: L2 -> L3`、`w: L5 -> L6`、`fn: entry -> L4`、`fn: entry -> L7`。
   [SRC PRB mod；Clarifications]
9. **Given** 一個含各種宣告的程式（var、let、const、函式宣告、class、參數、catch 參數、import、具名函式運算式、未宣告讀取、未宣告賦值），**When** 建立 scope
   資訊，**Then** 每個有宣告的 dujs 變數對應到唯一的 eslint-scope Variable，可查得其全部宣告節點與各自種類（依 Clarifications 的列舉）；`var x; var x;` 有兩個
   宣告節點；catch-edge L10 的 `e`（宣告節點屬外層 Variable、參照解析到 catch 參數）的 def 以參照為準，屬 catch 參數；未宣告名稱有賦值者為隱含全域、只讀者為全域，宣告節點為空；`arguments` 不建立變數。
   [SRC USR D1；S005 R2-3；Clarifications]
10. **Given** probes 的 link-n4、link-n8a、link-n9、link-n10、link-n5，**When** 分析，**Then** 呼叫連結依 FR-013 改變並逐項記錄：link-n4（catch 參數 `K` 的
    賦值不再算外層 `K` 的定義）L6 `new K();` 連到 class `K`，有 `K: L1 -> L6`，沒有 `K: L5 -> L6`；link-n8a（具名函式運算式內的 `K = 2` 屬內部名稱）L5
    `new K();` 連到 class `K`；link-n9（class 運算式內部名稱 `A`）L3 `new A();` 連到 class 的 constructor；link-n10（catch 參數 `e`）L3 `e();` 不再連到函式 `e`；
    link-n5（class 外 `A = null`）維持不連（守門）。[SRC Clarifications]
11. **Given** link-bypass（`function g() { var e = 0; }` L1–L3；`try { f2(); } catch (e) {` L4–L6、`g();` L7、`console.log(e);` L8），**When** 分析 intra-page，
    **Then** 有 `e: L6 -> L8`（呼叫端的 catch 參數對看不到它的 `g` 繞過，不被 `g` 的同名區域變數影響）。[SRC Clarifications；004 FR-016]

---

### Edge Cases

- 多個檔案串接成一頁後才解析：eslint-scope 以串接後的整頁 AST 分析，與現行 parse 一致（先試 script、失敗才 module；`ecmaVersion` 與 espree 一致）。
- module 程式：`import` 綁定與 module scope 依 eslint-scope；module 特有的綁定行為與 `develop` 相同，D2 的差異類別仍適用（例如 module 中的 `Math`）。
- class 宣告在 eslint-scope 有外層與 class 內層兩個綁定：class 內的參照解析到內層（定義於 class 節點）；004 FR-018 的「全頁只有一筆定義」把兩個綁定合併
  計數，class 外對同名的賦值也算（Clarifications）。
- 參數預設值中的函式、參數彼此參照：依 eslint-scope（US2 情境 4）；預設值中的箭頭函式仍是 `$ANONYMOUS_FUN_n`。
- 解構賦值、`for-in`／`for-of` 的左側：解析到對應宣告。
- 物件屬性名、成員存取的屬性（`o.p` 的 `p`）、標籤名不是變數參照。
- 多頁：每頁各自建立 scope 資訊，頁面之間不共用。
- class field、static block、method 的 scope 與 dujs 的 `$ANONYMOUS_FUN_n` 一一對應；識別字以 AST 節點身分對應。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 每個 scope 的宣告（`var`、`let`、`const`、函式、class、參數、catch 參數、`import`、具名運算式的內部名稱）MUST 取自 eslint-scope；dujs 的
  每個有宣告的變數 MUST 對應到一個 eslint-scope Variable（一至多個宣告），並可查詢其每個宣告的種類與宣告節點（`Definition.node`，可取得名稱識別字與
  宣告的 `kind`；class 宣告的內層綁定種類為 class）（供 005 使用）；def／use 一律以該識別字參照的解析結果為準（同一識別字的宣告歸屬與參照解析不同時，
  例如 `catch (e) { var e = 4; }`，以參照為準）；單位為 eslint-scope 的 Variable，可查全部宣告節點與各自種類；
  未解析的名稱依 D3 以「頁面＋名稱」為一個變數，頁面中有賦值者種類為隱含全域、只有讀取者為全域，宣告節點為空；eslint-scope 已解析但沒有宣告的變數（`arguments`）
  不建立 dujs 變數。[SRC USR D1；S005 R2-3]
- **FR-002**: 每個節點的 def 與 use 所指的變數 MUST 依 eslint-scope 的識別字解析結果決定；同名但不同宣告的變數 MUST 是不同的變數。def／use 的分類、
  定義所在節點與定義種類 MUST 維持 dujs 現行規則。[SRC USR D1]
- **FR-003**: catch 參數（含解構）MUST 在 catch 子句節點定義；catch 子句節點 MUST 不使用 catch 區塊內的讀取；catch 區塊內對參數的賦值 MUST 不影響外層
  同名變數，也不成為隱含全域。[SRC PRB catch-*；USR D4]
- **FR-004**: 具名 class 運算式、具名函式運算式的內部名稱與 class 宣告的內層綁定 MUST 是只在該 class／函式內可見的變數，定義於該運算式或宣告節點；
  具名函式運算式內部名稱的定義是函式定義，其自我遞迴呼叫不連結（D7）。[SRC KI §22 (2)；USR D7]
- **FR-005**: 參數預設值中的識別字 MUST 依 eslint-scope 解析（不解析到函式本體內的 `var`）。[SRC PRB pdef]
- **FR-006**: 未宣告就讀取的識別字 MUST 視為在其頁面 entry 定義的全域，定義種類為新增的 `global`（含 `globalThis`、`typeof` 的運算元；未解析的
  `undefined`、`NaN`、`Infinity` 除外，本地宣告者照一般變數）；固定清單內
  的物件、`localStorage` 與隱含全域（未宣告就賦值）的行為 MUST 不變；`arguments`、`this` 不適用。[SRC KI §24；USR D3]
- **FR-007**: block 內的函式宣告 MUST 依 eslint-scope 只在該 block 可見（D5）。[SRC USR D5]
- **FR-008**: eslint-scope 未解析的參照 MUST 以名稱沿其所在 scope 的 eslint-scope scope chain 往外查找，找到宣告即解析到它，找不到才適用 FR-006；
  FR-007 優先。[SRC USR D6]
- **FR-009**: scope 的命名與數量、CFG、worklist 與輸出格式 MUST 不變；模型的數量與結構 MUST 不變，D5 與 FR-013 造成的呼叫連結變化除外。[SRC USR D1]
- **FR-010**: golden 的差異 MUST 只來自 D2 列出的類別，逐項記入 `golden-diff.md` 並更新 `tests/golden/manifest.json`。[SRC USR D2]
- **FR-011**: `docs/known-issues.md` MUST：§22 (2) 與 §24 標為已修正；新增一節記錄 catch 參數與 catch 節點讀取的問題（修正前行為、重現程式）並標為已修正；
  新增一節記錄參數預設值的錯誤解析並標為已修正；本輪發現的其他問題新增章節。README 中與 scope、全域物件、Annex B 相關的限制說明隨之更新。[SRC USR D1]
- **FR-012**: MUST 有自動檢查：(1) 靜態測試確認 lib 中沒有以名稱在 scope 中查找變數的路徑（含呼叫解析），白名單只有：D3 的「頁面＋名稱」合併與
  `undefined`／`NaN`／`Infinity`／`arguments` 的名稱排除、D6 的回退查找、固定清單與 `localStorage` 的名稱對應、遮蔽判定（以 eslint-scope 的 scope 比對名稱，Clarifications U2）；被禁止的 API 與模式由 plan 明列。
  (2) 一支腳本以下列單位計算 golden 與 MDN 範例集的差異：每個 pair 的增減、`dupairs.dot` 每個變數列的增減、每個模型數量的變化；`graph.dot`、`hierarchy.dot`
  只允許在有呼叫連結變化的頁面改變。基準側只以「名稱＋行」比對。每筆差異須符合下列某類的判準，否則檢查失敗：
  - 識別字解析類：以原始碼的 eslint-scope 結果判定，該名稱在該頁有兩個以上 Variable，或宣告於 function-expression-name／class scope，或 pair 一端是含
    參數預設值的節點。
  - 全域類：該頁未解析名稱的任何新增 pair 或變數列（含 `++`、for-in、解構、`G.p = v` 造成的非 entry 定義）。
  - catch 類：移除的 pair 其 use 端為 CatchClause 所在行且變數不是該 catch 參數；或變數名為 catch 參數名且兩端都在該 catch 子句的行範圍內；或新增的
    catch 參數變數列；或移除的 pair 其 def 行為 CatchClause 所在行且變數不是該 catch 參數；或名稱為 catch 參數名且該頁沒有同名的其他宣告時，
    該名稱移除的 pair 與變數列。
  - 呼叫連結類（D5、FR-013）：腳本確認該頁有呼叫點的 callee 解析結果改變（未解析參照與 block 內函式同名，或 FR-013 列舉的情形）；其衍生的 pair 增減
    逐筆人工簽核並釘住筆數，筆數不符即失敗。
  `golden-diff.md` 由腳本輸出產生並附人工說明。MDN 範例集的 `develop` 基準在動 lib 之前產生快照，存於 `specs/006-eslint-scope/`；golden 以現有 `expected*`
  為基準。[SRC Clarifications]
- **FR-013**: 呼叫解析（callee 的 `f()`、`new X()`、`o.m()`、`addEventListener` 的 handler 識別字、004 FR-018 的「全頁只有一筆定義」）與 004 FR-016 繞過的
  可見性判定（被呼叫端看不看得到該變數）MUST 依 eslint-scope 的識別字解析、宣告與 scope chain 判定，不以名稱查找；004 FR-018 與 FR-016 的規則內容不變。
  class 宣告的外層與內層綁定在「全頁只有一筆定義」中合併計數。[SRC Clarifications]
### Key Entities

- **宣告（Declaration）**：eslint-scope 的 Variable（一至多個宣告，各有種類與宣告節點）；dujs 有宣告的變數與 Variable 一對一。
- **識別字解析（Resolution）**：程式中一個識別字對應到的宣告，或未解析（即全域，D6 除外）。
- **Golden 差異紀錄**：每處 golden 變化及其對應的 D2 類別與 FR。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 本 spec 的全部驗收情境都有對應的自動化測試且通過。
- **SC-002**: 既有測試全部通過（編碼舊行為的測試更新並列入 golden-diff）；golden 差異 100% 對應到 D2 的類別（由 FR-012 的腳本判定）。
- **SC-003**: MDN 範例集（33 個程式）全部完成分析、不拋錯，總分析時間不超過 `develop` 的 1.5 倍（同一台機器、各跑 3 次取中位數）；pair 差異全部通過
  FR-012 (2) 的判定（基準為動 lib 之前存下的 `develop` 快照）。
- **SC-004**: PRB 的全部探測程式得到本 spec 的預期結果（守門者與 `develop` 相同）。

## Assumptions

- eslint-scope 成為 runtime 依賴（目前已隨 ESLint 存在於 devDependencies 的依賴樹中）；呼叫時明確傳入與 espree 相同的 `ecmaVersion`，以及 AST 的
  `sourceType`（eslint-scope 預設 `ecmaVersion` 為 5，不可省略）。
- 只追蹤變數；屬性（`o.p`）不是變數，`o.p = v` 的建模不在本 feature。
- 呼叫解析規則（004 FR-018）的內容不變，判定來源改為 eslint-scope（FR-013）；具名函式運算式的自我遞迴與函式宣告一樣不連結，由 005 處理。
- 函式 entry 節點讀取本體變數的行為（KI §18）不變，由 005 處理；因此 US3 的全域在函式內也可能多出以 `entry` 為 use 端的 pair，屬既有行為。
- MDN 範例集的取得與執行方式見 `docs/research/mdn-baseline/`。
