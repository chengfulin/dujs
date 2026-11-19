# Research：修正其餘已知問題（§7、§10–§12、§14、§15、§17、§20、§21）

**Feature**: `004-fix-remaining-issues` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

各節格式：Decision／Rationale／Alternatives considered。驗收情境的分行程式與修正後完整預期在
[contracts/acceptance.md](./contracts/acceptance.md)；本檔只記設計決策與探針發現。

## R0 探針與現況（spec 延後釐清 M2）

- 探針程式在 `probes/`（一行一個節點來源），以 `node specs/004-fix-remaining-issues/probes/run.js [檔案...]` 執行（`tests/helpers/analyze.js`，
  印出 scope、每個 inter-procedural 模型、頁面 intra-procedural 與 intra-page 的 pair）。基準 `ff45928` 的完整輸出存於
  `probes/current-output.txt`，是 golden-diff 與驗收「修正前」欄的依據。
- 基準：`npm test` **933 passing**、`npm run lint` 0 錯誤、`eslint-suppressions.json` **119** 筆（36 檔）。
- 記法補充：intra-page 模型中，決策節點的 false 目標若是 LOOP 節點，helper 印成 `L<n>>Lnull:F`（LOOP 節點沒有行號）；
  驗收以 intra-procedural 斷言 p-use 時寫 `exit:F`。

### 探針實跑發現（與 spec 不一致或 spec 未寫明之處）

| # | 發現 | 證據 | 處置 |
|---|------|------|------|
| P1 | KI §10 程式的本體是 `return g();`，不是呼叫敘述；依既有規則（只有 astNode 為呼叫的節點是 call-site）不會連到箭頭函式，因此 US4-1「`d` 在其中的 use 有 pair」與「本體的 `g();` 被連結」在原程式上**不可能成立** | `probes/us4-1.js`、`e2` 對照（`return g();` 不連、`g();` 會連） | 使用者裁決 U1＝A（plan「使用者裁決紀錄」）：驗收以 `probes/us4-1b.js`（本體 `g();`）寫預期，原程式只斷言 scope 與「不連結」 |
| P2 | FR-017 的 `f = new B();`：欄位初始化式的 scope 是合成函式，intra-procedural 的 reach-in 看不到外層的 `B`，依 H3「所在 scope 看得到定義才連」永遠不會連結；只有 `f = this.m();` 有效 | 規則推導（同 `probes/fn-new.js`：函式內 `new A()` 不連） | U2＝A 之後**由 analyze 裁決 1 取代**：callee 為 class 時放寬（R2），`f = new B();` 會連（`probes/field-new.js` 的 `x: L4 -> L11`） |
| P3 | KI §15 所說「兩個 CALL RETURN 標籤相同（`callReturn (L2:C0)`）」只發生在 `toDotWithLabelLoc`；CLI 預設用 `toDotWithLabelLine`，標籤為 `callReturn_a`／`callReturn_b`（已可區分但沒有分支路徑） | `probes/us6-1.js` 以 CLI 實跑 | FR-011 兩種轉換器都加分支路徑（R9）；不需裁決 |
| P4 | KI §16「後果段」（參數名遮蔽外層變數時，外層變數的 use 消失）由 FR-016 一併修正：`check(a); var c = a;` 修正後恢復 `a: L1 -> L6` | `probes/ki16.js`、`probes/ki16b.js` | 屬 FR-016 範圍內；FR-014 的 known-issues 更新加註 §16 後果段已修（plan 自行決定，見 R6） |
| P5 | 函式的自我遞迴（`function m(){ m(); }`）不會被連結（`m` 的定義不在 `m` 的 intra-procedural reach-in 內，函式不適用 class 放寬），因此實際會形成呼叫環的是依 class 結構判定的 `this.m()`，以及 analyze 裁決 1 之後 class 成員內的 `new A()`／`A.s()`（取代 Fable A3 的「constructor 內 `new A()` 不成環」） | `probes/fn-rec.js`、`probes/ctor-cycle.js` | 呼叫環驗收用 `this.m()`（cyc-1／2／3、cyc-uncond）與 constructor 內 `new A()`（ctor-cycle） |
| P6 | 呼叫敘述有 exception 邊；連結後該邊由 CALL RETURN 出發（既有 replay 行為），遞迴時 exit 的 reach-in 會含「從 CALL RETURN 經 exception 邊」的定義（cyc-2 的 `x: L12 -> L16`）。**一般賦值敘述也有 exception 邊直達所在方法的 exit**：方法被連結後，進入方法時的外層定義可經「賦值敘述 → exception → exit → return → 呼叫端 CALL RETURN」流出（cyc-1 `L5 c = 0` → exit(m) → L11 的 CALL RETURN → L12 帶 `x@L1`，得 `x: L1 -> L12`；cyc-2 得 `x: L1 -> L16`；us3-7 `L8 y = x` 帶 constructor 的 `x@L5`，得 `x: L5 -> L13`） | `probes/fn-rec.js` 的 `x: L1 -> L10` 即此機制；仲裁原型實跑（after-calls）確認 cyc-1／cyc-2／us3-7 三條 | 預期值已納入（acceptance FR-015、US3-7）；屬既有 exception 建模，非新缺陷 |
| P7 | 現行 `-js -js` 相鄰時，`readInput` 會把第一個 `-js` 之後的**全部**參數（含第二個 `-js`）當成同一頁 | `lib/dujs/inputreader.js` | US5 改寫解析後消失（R10） |
| P8 | 無條件遞迴（`m() { this.m(); x = 1; }`、`new A().m(); console.log(x);`）：修正後 intra-page 只剩 `A: L2 -> L8`、`x: L5 -> L9`，`console: entry -> L9` 與 `x: L1 -> L9` 消失。成因：`this.m()` 的回邊只有 call 邊進 entry(m)，CR(L4) 只能由 exit(m) 的 return 到達，而 exit(m) 只能由 L5 與 CR(L4) 的 exception 邊到達——CR(L4)→L5→exit(m)→CR(L8)→L9→LOOP→exit 全部從 entry 不可達（死碼）。entry 出發的定義（`console`、`x@L1`）進不了這個環；CR(L4)／CR(L8) 的 bypass 只送被呼叫端看不到的定義（全域都看得到，為空）。但 reaching definitions 的 worklist 也處理不可達節點，L5 的 GEN `x@L5` 沿不可達的邊流到 L9，因而有 `x: L5 -> L9` | 原型實跑＋扁平圖可達性走訪（`probes/cyc-uncond.js`；不可達節點：CR(L4)、L5、exit(m)、CR(L8)、L9、LOOP、exit、LOOP RETURN） | 屬 README 已記的「無條件遞迴之後，被呼叫端看得到的外層變數 pair 消失（死碼）」；另補記「不可達環內的定義仍會流出（`x: L5 -> L9`）」。驗收鎖定（acceptance FR-015） |
| P9 | 混合定義的 `f()`：`var f = function(){x=1}; if (c) { f = function(){x=2} } f();` 修正前連到第一個函式（`x: L3 -> L11`）；嚴格規則下不連（`x: L1 -> L11`） | `probes/mix-f.js`；Fable 原型 `FSTRICT` | analyze 裁決 2（FR-018）；known-issues 新節、README |
| P10 | 環上方法內註冊的事件 handler：自我／互相遞迴時以環上 scope 為根的模型登記在頁面模型之後，`reachInsForHandlerLookup` 取到非頁面為根的模型，handler 接不上 intra-page（有環版 21 節點） | `probes/cyc-handler.js`、`probes/cyc-handler-nocyc.js`；原型加 U3＝(a) 後有環版 24 節點、無環版 23 節點，兩者都接上 `h` | plan U3＝(a)；FR-015 |

## R1 決策條件的 p-use 規則（FR-001、US1）

- **Decision**：`usedExpressionsOf` 對決策節點（有 true 或 false 目標）的條件運算式（astNode 本身，非 for-in／for-of 的 head、
  非 SwitchCase）改回傳 `read: 'p-use'`（原為 `'walk'`）；`'p-use'` 的語意改為「條件模式」：走訪中所有變數讀取都是 p-use，
  **只有** `CallExpression`／`NewExpression` 的引數（及 `TaggedTemplateExpression` 的樣板運算式）子樹內是 c-use；callee（含
  `o.m` 的 `o`）維持 p-use；`BinaryExpression`／`UnaryExpression`／`ConditionalExpression` 在條件模式下不再切換 `isPUse`。
  case 節點讀 discriminant 的 `'p-use'` 一併套用（`switch (a + f(b) + c)` 的 `c` 由 c-use 改為 p-use，同 §20 機制）。
- 非條件模式（`'walk'`、`'c-use'`）的既有切換規則**完全不動**，包括 entry 節點走訪函式本體時 nested `SwitchCase` 的 p-use 殘留（§18，stage 2）
  與 for-in／for-of head 的 `BinaryExpression` 切換——這兩者改了會改既有 golden 且不在 FR-001 範圍。
- **Rationale**：根因是三個 handler 結束時把 `isPUse` 設為 `false`（KI §20）；以「模式＋引數深度」取代切換最直接，且引數 c-use 是
  Clarifications H1／Fable A5 的裁決。把條件交給 `usedexpressions.js` 標示（它本來就負責「讀什麼、怎麼讀」，002 R6）比在 `findUSESet`
  裡比對 `item.expression === cfgNode.astNode` 清楚。
- **既有測試**（皆列入 golden-diff「單元測試期望」）：`tests/dujs/usedexpressions.js` 約 273、279 行斷言決策條件為 `'walk'`，改為 `'p-use'`；
  同檔約 139、145 行（`findUSESet` characterization：`x = o.p[i] ? a : b` 的決策）`o`、`i` 由 c-use 改為 p-use；`tests/dujs/es2015.js` 約 407 行
  `o?.a?.b ?? t` 的 `o: L4 -> L5` 改為 p-use（`o: L4 -> L5>...` 的 T／F 兩條）。
- **Golden 影響（預測）**：既有三個 fixture 的決策條件只有單層 `BinaryExpression`、無引數呼叫或 Identifier（`value > 10`、`i < list.length`、
  `!title.trim()`、`isReady()`、拆分後的 `state.filter === 'all'`、`saved`），結果不變 → 預測零差異；新 fixture 的 `if (a + b >= c)` 有差異。
- **Alternatives**：只把 handler 結束時改為「還原進入前的值」——`f(a + 1)` 的 `a` 仍是 p-use，違反 Fable A5；把整個 `findUSESet` 改為模式化——
  會動到 §18 的 entry 殘留，改既有 golden。

## R2 `new` 敘述與方法呼叫的被呼叫端解析（FR-002–FR-005、FR-017、US2、US3）

- **Decision**：新增 `lib/dujs/callresolver.js`（MIT），提供 `calleeScopesOf(node, scopeTree)`，回傳該節點依執行順序的被呼叫 scope 陣列；
  `modelbuilder` 先放 `findStaticMemberScopesOfClassesAtNode` 的結果（既有），再接本函式的結果。class 索引（每頁一次，WeakMap 快取於 scopeTree）
  記錄每個 `ClassDeclaration`／`ClassExpression`：range、`superClass`、constructor scope、實例欄位 scope（有值者，原始碼順序）、實例方法
  `name → scope`、static 方法 `name → scope`，以及「成員 scope → {class, static}」；另記頁面中所有 `NewExpression` 的 `range → AST`。
- **呼叫運算式**：節點的 astNode 是 `CallExpression`／`NewExpression`（含決策節點與拆分葉，與既有 `f()` 相同的「astNode 即呼叫」規則）；
  或 astNode 是實例欄位合成函式的 `return <expr>` 且 `<expr>` 是 `this.m()`／`new B()`（FR-017，合成 ReturnStatement 以不可列舉屬性
  `dujsFieldInitializer` 標記）。`x = new F();`、`var o = new A();`、`return g();` 都不是。
- **規則**（`reachIns` 一律讀 intra-procedural 原件，同既有；「解析變數 V」＝V 在 reachIns 中的定義**至少一筆且全部**指向同一個函式 scope
  或同一個 class——函式以 FUNCTION 定義的 range、class 以定義 range 對 class 索引；class 運算式 `var A = class {}` 的定義是 literal 型別，
  以 range 對到 class 也算）：

| 形式 | 條件 | 被呼叫端（依序） |
|------|------|-----------------|
| `f(...)` | `f` 解析為函式（嚴格規則；`findFunctionDefinitionFromReachInSet` 的邏輯搬入 `callresolver`，由「任一筆是函式」改為「至少一筆且全部同一個」，FR-018） | `f` |
| `new F(...)` | `F` 解析為函式 | `F` |
| `new A(...)` | `A` 解析為 class | A 的實例欄位（原始碼順序）、A 的 constructor（有才連）；不追 `extends` |
| `new A(...).m(...)` | 同上，且 `m` 是 A 自己的實例方法（`kind: 'method'`、非 computed、非 private） | 上列＋`m`；`new F().m()`（函式）只連 `F` |
| `A.s(...)` | `A` 解析為 class，`s` 是 A 的 static 方法 | `s` |
| `this.m(...)` | 節點最近的函式 scope 本身是 A 的成員 scope（方法、constructor、欄位初始化式、static 方法／欄位／block）；非 static 成員找實例方法，static 成員找 static 方法 | `m` |
| `o.m(...)` | `o` 在 reachIns 中至少一筆定義且每筆定義的 range 都是 `new A(...)`（同一個 class，`A` 以該定義節點的 reachIns 解析） | A 的實例方法 `m`（不連 constructor，Fable A9） |

  其餘一律不連（README）：private、optional call、computed／字串方法名、getter／setter、欄位中的箭頭函式、`new ns.A()`、`new (f())()`、
  super 鏈上的方法、箭頭函式與一般 `function` 內的 `this.m()`、`o` 來源混合或不明、中間有屬性賦值（`o.p = 1` 會定義 `o`，定義不再是 `new`）。
- **class 放寬（analyze 裁決 1）**：「解析變數 V」在 reachIns 中**沒有** V 的任何定義時（V 宣告在外層函式／頁面，常見於函式、方法、constructor、
  欄位初始化式、事件 handler 內），若 V 在全頁所有 intra-procedural 模型中只有**一筆**定義且該定義以 range 對到 class 索引（class 宣告，或
  `const`／`let` 綁定的 class 運算式），解析為該 class；`var A = class {}` 另有一筆 undefined 預設定義（兩筆）而不連；解析結果為函式時不放寬
  （`f()`、`new F()` 在函式內維持 H3）。reachIns 有 V 的定義時一律走嚴格規則（不放寬）。
- **與 H3 的關係**：H3 對函式維持；對 class 被放寬。後果：P2 不再成立（欄位 `new B()` 會連）；constructor 內 `new A()` 成為呼叫環（P5）；放寬
  **不看執行順序**——`function g() { new A(); }` / `g();` / `class A { constructor() { x = 1; } }` 也會連（`probes/fn-new-early.js`，`x: L8 -> L11`；
  實際執行時 `g()` 會因 TDZ 拋錯）；函式內的 `new A()` 會連而 `f()` 不連（不對稱）。三者寫入 README。MDN bouncing balls 不受益：
  `const ball = new Ball(...)` 是宣告（非 `new` 敘述），for-of 綁定的 `ball` 定義不是 `new`，`ball.draw()` 不連。
- Fable 原型（`RELAX=i`、`FSTRICT`）：只改 callresolver 約 20 行；既有三個 golden 零差異、既有測試無新增失敗；探針中只有 `fn-new.js` 改變
  （`x: L1 -> L11` → `x: L4 -> L11`）。
- **Rationale**：判定只依靜態結構與既有 reach-in，不引入型別推論；「至少一筆且全部相同」避免 `o` 定義為空集合時誤連（空集合會讓「全部都是
  `new A`」為真），也讓 `f()` 與其他形式同一規則（混合定義不連，P9）。全頁唯一的 class 定義不會被改寫（`const`／`let`／class 宣告），放寬不會
  連錯對象；函式可被重新賦值或遮蔽，不放寬。新模組讓 `modelbuilder` 只負責建階層。
- **Alternatives**：把 `var A = class {}` 的定義改為 FUNCTION 型別——改 GEN 與既有 dupairs，拒絕；沿 `extends` 查方法——違反 D3／Assumptions。

## R3 `new` 的 GEN 與呼叫端（FR-003 的執行順序）

- **Decision**：沿用既有「同一節點多個被呼叫端串接」機制：前一個被呼叫端的 CALL RETURN 是下一個的呼叫點；呼叫點的 GEN（如
  `new A().m()` 本身無定義）照舊搬到最後一個 CALL RETURN。欄位 → constructor → 方法的順序即 `calleeScopesOf` 的陣列順序。
- **Rationale**：零新機制；與 static 成員串接、`f(x = 1)` 的 GEN 搬移一致。

## R4 class 名稱在 static 成員之前定義（FR-007、US4-3／4）

- **Decision**：`hierarchy.addCallEdge` 的 spec 加選填 `keepGenerateAtCallSite`；`modelbuilder` 在節點的 astNode 是 `ClassDeclaration`
  （或 `export` 包住且有名稱的 `ClassDeclaration`）時，對該節點的 static 成員呼叫邊設為 `true`。`expansion.replayCall` 遇到此旗標時不把呼叫點的
  GEN 搬到 CALL RETURN（CALL RETURN 的 GEN 為空集合），呼叫點（類型改為 CALL）的輸出即含 class 名稱的定義，流入 static 成員。順序成為
  「superclass 與 computed key（class 節點的 use）→ 定義 class 名稱（class 節點的 GEN）→ static 成員」。
- class 運算式不適用（Fable A7），`var B = class { static s = B; }`、`var B = class Q { static s = Q; }` 不產生 pair；具名運算式內部名稱記入
  known-issues 新節（FR-014）。
- **Rationale**：class 名稱的定義留在 class 節點，dupairs 的 def 標記仍是 class 行號（`Q: L1 -> L3`），不出現在 CALL RETURN。
- **Golden 影響**：既有 fixture 沒有 static 成員 → 零差異。既有測試「should chain static members in source order and define the class after them」
  的斷言（`D: L2 -> L8`）仍成立，只改標題與註解（class 名稱改為在 static 成員之前定義）。

## R5 呼叫環（FR-015）

### R5.1 階層資料：回邊

- **Decision**：`hierarchy.addCallEdge(model, {callSite, calleeModel, back: true})` 記一條**回邊**：`calleeModel` 必須是目標 scope 的
  intra-procedural 模型（沒有 hierarchy，否則拋錯），只取其 entry／exit 原件；edge 物件多 `back: true`；`callee` 單位的 `kind` 為 `'function'`、
  `model` 為該 intra-procedural 模型，但**不**加入 `hierarchy.units`（避免同一 scope 出現兩個單位）；CALL RETURN／CALL 樣板照常建立。
  新增 `hierarchy.openTargetsOf(model)`：子樹中所有回邊的目標 scope，減去子樹中各模型 main 單位的 scope；空集合＝**封閉**。
  新增 `hierarchy.hasBackEdge(model)`：子樹中有無回邊。
- **Rationale**：flat graph 中每個原件只有一份，遞迴不需要再複製被呼叫端；回邊只要「接到已展開的 entry、從其 exit 回到本呼叫的 CALL RETURN」，
  這正是 `replayCall` 對 `copyOf(entryOf(calleeModel))`／`copyOf(exitOf(calleeModel))` 做的事，intra-procedural 模型的 entry／exit 原件
  就是祖先展開時用的同一份原件。

### R5.2 建模：遞迴守衛與每個 scope 的模型

- **Decision**：`getInterProceduralModelStartFromTheScope(scope, scopeTree, stack, built)`（後兩參數選填，`_testonly_` 舊呼叫方式不變）。對每個
  被呼叫 scope `C`：
  1. `C` 在 `stack`（含自己）→ 回邊到 `C`；
  2. `C` 已在本次 DFS 的 `built`（Map：scope → 本次為它建的模型）→ 重用；
  3. `C` 有已登記的 inter-procedural 模型且該模型 `hasBackEdge` 為 false → 重用（無環時即既有行為）；
  4. 否則以 `stack.concat([scope])` 遞迴建 `C`。
  模型建好後放入 `built`；**封閉**且有 hierarchy 時登記（同一 scope 只登記第一個，已登記 scope 的重建模型只 freeze、不展開——它只經 hierarchy 被使用；登記條件由「relatedScopes > 1」改為「有 hierarchy」，
  讓只呼叫自己的 `m` 也登記）；**開放**模型不登記、不展開（不設 `graph`），只作為外層模型的子單位。
  `buildInterProceduralModels` 的略過條件改為「已有登記模型，或曾被建過且沒有呼叫邊」；只被建成開放模型的 scope 之後仍以空堆疊為根再建一次。
- **Rationale**：(1) 原本的無限遞迴來自「建 callee model 時在登記前再次進入自己」，以堆疊判定即可；(2) 由下而上建立並凍結的流程不變，回邊不需要
  尚未完成的模型；(3) 每個根一次 DFS、`built` 保證同一扁平圖中每個 scope 只有一個模型 → 每個呼叫點原件至多一條呼叫邊（重播不會對同一複本做兩次）；
  (4) 跨根只重用無環模型：有環模型含其他 scope 的開放子模型，與本次 DFS 自建的模型混用會讓同一呼叫點出現兩條邊（例：頁面同時呼叫 `m` 與 `n`）。
- **無環程式的行為**：規則 3 與既有「有登記就重用」相同；`built` 中的模型在無環時就是已登記模型 → 既有 golden 不受影響。

### R5.3 m↔n 時各 scope 的模型（完整預期見 acceptance §FR-015）

以 `probes/cyc-2.js`（頁面 `new A().m();`、`m` 呼叫 `this.n()`、`n` 呼叫 `this.m()`）：

| 登記序 | 模型 | 階層 | 扁平圖 |
|--------|------|------|--------|
| inter[0] | `m` 的模型 M（relatedScopes `m, n`） | main `m`；call L6 → N_open；N_open＝main `n`、**回邊** L11 → `m`（開放，未登記） | m、n 原件各一份＋CR(L6)、CR(L11)，共 12 節點 |
| inter[1] | 頁面模型（`page, m, n`） | main 頁面；call L15 → M | 頁面 6＋M 的 12＋CR(L15)＝19 |
| inter[2] | `n` 的模型 N（`n, m`） | main `n`；call L11 → M'_open；M'_open＝main `m`、回邊 L6 → `n`（開放） | 12 節點 |

M 與 N 的 pair 相同（都是 `c` 經回邊回到 L4 的 p-use 與 entry 殘留），差在起點；頁面模型以 M 為子單位。

### R5.4 展開與 003 契約修訂

- `orderOfCalls`：回邊只插入 CALL（決策前時）與 CALL RETURN，不加入被呼叫端節點（已在祖先展開中）。
- `expand(model)`：`openTargetsOf(model)` 非空時拋 `Error('open hierarchy: back call edge to <scope> outside the model')`（建模不會發生，防護手動
  建立的錯誤）。原 `checkCycle`（**模型物件**出現在自己的子樹中）保留為結構防護，訊息改為 `model cycle in hierarchy: ...`；建模不再產生此情形。
- 003 `contracts/model-api.md` §2「單元測試以它建立環狀階層」、§3「環：拋出 Error，訊息以 `call cycle in hierarchy` 開頭」與 data-model §4 第 5 點，
  由本 feature [contracts/model-api.md](./contracts/model-api.md) §1–§2 取代（003 文件加一行指向本 feature 的修訂註記）。
  `tests/dujs/expansion.js`「call cycle」測試改為斷言 `model cycle in hierarchy`，另加回邊與開放模型的測試。

### R5.5 hierarchy.dot

- 回邊以新的邊種類繪製：`backCall`（`color="blue", style="bold", label="recursive call"`）與 `backReturn`（`color="blue", style="bold,dashed",
  label="recursive return"`），由呼叫端單位指向目標 scope 的單位（同一 scope 共用一個圖節點，自我遞迴為自環）；不再往下遞迴。既有 `call`／`return`
  不變 → 既有 hierarchy.dot 零差異。

## R6 繞過規則（FR-016）

- **Decision**：每條呼叫邊（含回邊、串接的後續邊）在展開時記一筆 bypass：`{callNode: 有 call 邊的那個複本, callReturn: 複本, calleeScope:
  calleeModel.mainlyRelatedScope}`（非決策呼叫點＝呼叫點複本；決策前＝CALL 複本；串接＝前一個 CALL RETURN 複本）。`expand` 回傳
  `bypasses`（Map：callReturn 複本 → 記錄），`Model.setCallBypasses`／`callBypassOf` 保存。`doAnalysis` 的轉移函式：
  - CALL RETURN 的有效輸入＝worklist 輸入 ∪ `extraReachIns` ∪ `filter(lastOutput(callNode))`；
  - `filter` 保留變數 `v` 滿足 `calleeScope.getVariable(v.name) !== v`（被呼叫端看不到或被遮蔽）**或** `v` 屬於 `calleeScope` 自己（含其 block scope）的
    變數（遞迴時的另一個活動紀錄）；
  - callNode 的輸出改變時，以轉移函式收到的 `list` 參數把對應 CALL RETURN 放回工作佇列（worklist 只會推後繼，兩者之間沒有邊）；
  - CALL RETURN 記錄的 `reachIns`（及 `analysisResultOf`）為合併後的有效輸入。
- **Rationale**：被呼叫端看不到的定義本來就不會被它改寫，只是被 entry 的 `getNonReachableVarDefs` 或 exit 的區域變數 kill 擋掉；在 CALL RETURN
  補回是最小修正。不在圖上加邊：一條 CALL→CALL RETURN 的普通邊會讓所有定義（含被呼叫端會改寫的全域變數）繞過，§21 的 `x: L1 -> L6` 會回來。
  實作只在 `defuseanalyzer.js`（MIT）與 `expansion.js`，不改 LGPL 的 `lib/analyses/index.js`（轉移函式本來就收到 `list`）。
- 正確性要點：第一類（看不到）在被呼叫端 entry 已被 kill、不會同時經由被呼叫端流出；第二類（被呼叫端自己的變數）在 entry 被 GEN（`var`／參數的
  undefined 定義）kill、在 exit 被 kill → 不重複。
- **影響**：既有 `{ let t = 1; f(); console.log(t); }` 恢復 `t: L6 -> L8`；KI §16 後果段（`check(a); var c = a;` 參數遮蔽）恢復 `a: L1 -> L6`（P4）。
- **Golden 影響（預測）**：既有 fixture 被連結的呼叫（`addTo`、`isReady`、`scale`、`log`）在呼叫點到達的定義全是被呼叫端看得到、也不是其區域變數 →
  bypass 集合為空 → 零差異。
- **Alternatives**：在 FlowNode 上存 bypass（`flownode.js` 欄位）——模型層的資料放在 FlowNode 會讓複本帶不屬於節點的狀態；改 worklist（LGPL）——不必要。

## R7 參數預設值中的函式（FR-006、US4-1／2）

- **Decision**：`scopetree.js` 的 `visitFunctionBody` 在本體之前，於函式 scope 內走訪 `node.params`（只為了找到其中的函式／箭頭函式／class 成員）；
  預設值中的函式因此成為所屬函式的子 scope（名稱如 `$DOMAIN.$PAGE_0.f.$ANONYMOUS_FUN_0`）。初始化節點 `g = () => d` 本來就產生 FUNCTION 定義
  （`isFunctionExpression`），連結依既有規則。
- **既有測試**：`tests/dujs/paramsandnew.js` 約 148 行斷言「預設值中的箭頭函式不是 scope」，R7 後 scope 清單多出 `f.$ANONYMOUS_FUN_0`，
  改斷言新行為（US4，列入 golden-diff「單元測試期望」）。
- **Golden 影響**：既有 fixture 的預設值沒有函式（`title = ''`）→ 零差異。

## R8 有外層預設值的解構參數（FR-008、US4-5／6）

- **Decision**：`collectParameterDefaults` 改為依原始碼前序展開：遇到 `AssignmentPattern` 時，左側是 Identifier → 一個初始化節點 `name = default`（不變）；
  左側是 pattern → 先一個**只求值外層預設值**的節點（`ExpressionStatement`，運算式為該預設值，range／loc 取預設值），再遞迴收集 pattern 內的巢狀預設值
  （每個各一個 `name = default` 節點）。pattern 內的名稱照舊由 entry 的參數 undefined 定義初始，巢狀預設值節點各定義自己的名稱一次。
- 結果：`{x = d, y = x} = {}` 與沒有外層預設值時相同，只多一個求值 `{}` 的節點（節點數 +1）；`x` 只在 `x = d` 定義一次，`y = x` 讀到它。
- **Rationale**：外層預設值只求值一次；內層名稱只定義一次；不需改 GEN 規則。與既有「預設值無條件執行」的近似一致。
- **Alternatives**：外層節點寫成 `{x, y} = {}` 再加巢狀預設值節點——名稱被定義兩次（001 Phase 10 R6 修掉的就是這個）。

## R9 CALL RETURN 標籤（FR-011、US6-1／2）

- **Decision**：`cfggraphconverter.js` 中，CALL RETURN 節點的 `labelPath` 非空（拆分呼叫點）時：
  - `toDotWithLabelLine`（CLI 預設）：`callReturn (<line>:<path>)`，例如 `callReturn (5:T)`；
  - `toDotWithLabelLoc`：`callReturn (L<line>:C<col>:<path>)`，例如 `callReturn (L2:C0:T)`。
  `labelPath` 為空者完全不變（`callReturn`，同名時照舊加 `_a`、`_b`；loc 版 `callReturn (L<line>:C<col>)`）。同名去重的程序照舊在之後執行。
- **Rationale**：與一般節點的行號標籤 `5:T`、`L2:C0:T` 同一寫法；未拆分者逐位元組不變（US6-2）。
- **Golden 影響**：既有 fixture 沒有被連結的拆分呼叫點 → 零差異。

## R10 CLI（FR-009、FR-010、US5）

- **Decision**：`bin/dujs.js` 改為呼叫 `lib/dujs/cli.js`（MIT，新）的 `run(argv, io)`，回傳 exit status，`bin` 以 `process.exitCode` 設定。
  解析用 Node 內建 `util.parseArgs`（`strict: true`、`allowPositionals: true`、`tokens: true`，options：`js`（boolean、multiple）、`help`（boolean、short `h`））；
  `-js` 不符合 POSIX 短選項（會被拆成 `-j -s`），因此在 `--` 之前把**完全等於** `-js` 的參數對映為 `--js` 再解析，依 tokens 順序自行分組。
  文法與錯誤訊息見 [contracts/cli.md](./contracts/cli.md)。
- **輸出目錄唯一化**：名稱沿用 `out-<年>-<月>-<日>-<時>-<分>-<秒>`，以 `fs.mkdirSync`（非 recursive，建立具排他性）建立；`EEXIST` 時依序改用
  `<名稱>_1`、`_2`……直到成功。`OutputWriter.ROOT_OUTPUT_DIR` 由「載入時算好的常數」改為「本次建立的目錄名稱」（`createRootOutputDirectory()` 之後才有值）。
- **流程**：解析 → `--help` 則印 usage 到 stdout、exit 0 → 參數錯誤印訊息＋usage 到 stderr、exit 2 → 讀完**所有**頁面檔案（任一失敗：stderr、exit 1、
  不建目錄）→ 建目錄 → 分析與寫出（任一例外：刪除本次目錄、stderr、exit 1）→ exit 0。
- **Rationale**：使用者指定 `util.parseArgs`（無新依賴）；`mkdirSync` 的 EEXIST 是跨行程的原子判定，同秒並行也不共用目錄（SC-005）；exit 2／1 區分用法錯誤
  與執行錯誤（慣例），spec 只要求非零。
- **Alternatives**：`fs.mkdtempSync('out-...-')`——名稱帶亂數，不利人工辨識；毫秒時間戳——仍可能碰撞。

## R11 for-in／for-of 右側拆分的前驅判定（FR-012、US6-3／4）

- **Decision**：`branchsplitter.js` 的 `isInsideLoopBody(prev, loop)`：前驅有 AST range → 維持 range 判定（不變）；沒有 range → 改以支配關係判定：
  從圖的 entry 出發、不經過 loop 節點做一次可達性走訪（每次拆分最多算一次），前驅**不可達**才算本體內。
- **Rationale**：Fable A2 指出「從本體第一個節點可達」會把外層迴圈經 break 繞回的前驅誤判；支配關係不受外層迴圈影響。有 range 的情形完全不變 →
  US6-4 結果與修正前相同、golden 零差異。
- 驗證：單元層級在 `tests/esgraph/` 以手建 CFG（本體前驅的 `astNode` 無 range）呼叫拆分，斷言該前驅的邊仍指向 loop 節點；並建「外層迴圈＋break」
  的無 range 版本斷言外層前驅被重導到右側決策。
- 實作時補充（US6 審查）：迴圈 body 本身沒有 range 時，所有前驅都改走支配關係判定（orchestrator 裁決）。已知邊角：
  (a) 從 entry 本來就到不了的死碼前驅會被判為本體內、邊不重導——它不在分析範圍內，不影響任何 pair；
  (b) do-while 以 for-of 為第一條敘述時，回邊前驅（while 測試節點）只能經過 loop 到達，若它沒有 range 也會被判為本體內。
  parser 產生的節點都有 range，兩者只在手建 CFG 時出現。

## R12 Golden（FR-013）

- **Decision**：新增 fixture `tests/golden/fixtures/fixes004/app.js`（全文見 [quickstart.md](./quickstart.md) §1）與 golden case
  `Golden outputs (004 fixes fixture)` → `tests/golden/expected-fixes004/`；**Setup 時以修正前程式**產生 expected 與 manifest `baseline`（之後各 story
  的差異都是「修正前 → 修正後」，可逐項對應 KI 節次）。manifest 的雜湊由各 story 明確更新，指令見 quickstart；`golden-diff.md` 格式見
  [contracts/golden-verification.md](./contracts/golden-verification.md)。
- 既有三個 case 預測零差異（R1、R4、R6、R7、R9 的分析）；出現差異時先查是否為上列修正的必然結果，否則視為回歸。

## R13 tech-standards 與依賴

- `.specify/memory/baseline/tech-standards.md` 針對服務後端／前端，對本 CLI／函式庫屬**不適用**，非偏離。
- 無新增第三方依賴；`util.parseArgs` 為 Node ≥ 18.3 內建（專案 engines ≥ 24）。新模組 `cli.js`、`callresolver.js` 為 MIT，ES5 風格（`var`、`'use strict'`、
  function 表示式）；不新增 lint 抑制。LGPL 檔（`lib/esgraph/index.js`、`dot.js`、`lib/analyses/index.js`）不修改。
