# Contract：驗收對照（spec 延後釐清 M2）

**Feature**: `004-fix-remaining-issues`

每個情境：探針檔（`specs/004-fix-remaining-issues/probes/`，一行一個節點來源，程式全文見該檔）、修正前（`probes/current-output.txt`，
基準 `ff45928` 實跑）、修正後的完整預期。記法同 spec「表示法」與 `tests/helpers/analyze.js`；pair 清單為 helper 排序後的**完整**清單，
測試以 `should.eql` 斷言（除非註明「含」）。scope 名稱前綴 `P` ＝ `$DOMAIN.$PAGE_0`，`P.$A<k>` ＝ `$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_<k>`。

修正後預期為依 research R1–R11 手推；implement 時若實跑不符，先查推導（特別是 exception 邊——呼叫敘述**與一般賦值敘述**都有 exception 邊直達所在方法／函式的 exit，見 research P6——與 entry 走訪本體的 §18 殘留），
確認是實作偏離再修實作，確認是推導錯誤則更新本檔並在 PR 說明，不得只改預期迎合結果。更正若涉及 spec.md 明列的 pair（驗收情境、Edge Cases），
先改 spec.md（記入 Clarifications）再改本檔。

標「原型實跑」的預期：analyze 階段以 Fable 原型（`RELAX=i`、`FSTRICT`，另加 U3＝(a) 的 handler 查找）實跑取得，並逐項推導核對。

標「§18 殘留」的 pair：方法／函式的 entry 節點走訪整個本體而讀到本體中的變數（KI §18，stage 2），不是本 feature 的新行為，但會出現在清單中。

## US1：決策條件中的讀取一律是 p-use（斷言 `result.intraProcedural()`，頁面）

| # | 探針 | 修正前 | 修正後 |
|---|------|--------|--------|
| 1 | `us1-1.js`（`if (a + b >= c)`） | `a: L1 -> L2>L3:T`、`a: L1 -> L2>exit:F`、`b: L1 -> L2>L3:T`、`b: L1 -> L2>exit:F`、`c: L1 -> L2` | `a: L1 -> L2>L3:T`、`a: L1 -> L2>exit:F`、`b: L1 -> L2>L3:T`、`b: L1 -> L2>exit:F`、`c: L1 -> L2>L3:T`、`c: L1 -> L2>exit:F` |
| 2 | `us1-2.js`（`if (-a < c)`） | `a: L1 -> L2>L3:T`、`a: L1 -> L2>exit:F`、`c: L1 -> L2` | `a: L1 -> L2>L3:T`、`a: L1 -> L2>exit:F`、`c: L1 -> L2>L3:T`、`c: L1 -> L2>exit:F` |
| 3 | `us1-3.js`（`while (f(a) < c)`，本體 `c = 0;`） | `a: L1 -> L5`、`c: L1 -> L5`、`c: L6 -> L5`、`f: entry -> L5>L6:T`、`f: entry -> L5>exit:F` | `a: L1 -> L5`、`c: L1 -> L5>L6:T`、`c: L1 -> L5>exit:F`、`c: L6 -> L5>L6:T`、`c: L6 -> L5>exit:F`、`f: entry -> L5>L6:T`、`f: entry -> L5>exit:F` |
| 4 | `us1-4.js`（`x = a + b >= c;`） | `a: L1 -> L2`、`b: L1 -> L2`、`c: L1 -> L2` | 不變 |
| 5 | `us1-5a.js`（`o.p`、`o[a]`、`x = a`、`a++`、`` `${a}` `` 五個 if） | `a: L1 -> L11`、`a: L1 -> L5`、`a: L1 -> L8`、`a: L11 -> L14`、`o: L1 -> L2`、`o: L1 -> L5` | `a: L1 -> L11>L12:T`、`a: L1 -> L11>L14:F`、`a: L1 -> L5>L6:T`、`a: L1 -> L5>L8:F`、`a: L1 -> L8>L11:F`、`a: L1 -> L8>L9:T`、`a: L11 -> L14>L15:T`、`a: L11 -> L14>exit:F`、`o: L1 -> L2>L3:T`、`o: L1 -> L2>L5:F`、`o: L1 -> L5>L6:T`、`o: L1 -> L5>L8:F` |
| 6 | `us1-6.js`（`if (f(a + 1))`、`if (new F(a))`） | `F: entry -> L9`、`a: L1 -> L6>L7:T`、`a: L1 -> L6>L9:F`、`a: L1 -> L9`、`f: entry -> L6>L7:T`、`f: entry -> L6>L9:F` | `F: entry -> L9>L10:T`、`F: entry -> L9>exit:F`、`a: L1 -> L6`、`a: L1 -> L9`、`f: entry -> L6>L7:T`、`f: entry -> L6>L9:F` |

另以 `tests/dujs/usedexpressions.js` 斷言 case 節點的 discriminant 套用同一規則（`switch (a + f(b) + c)`：`a`、`f`、`c` 為 p-use，`b` 為 c-use）。

既有測試 `tests/dujs/es2015.js` 約 407 行（`var v = o?.a?.b ?? t;` 在 L5，`??` 拆成決策 `o?.a?.b` 與葉 `L5:T`／`L5:F`）：`o: L4 -> L5` 改為
`o: L4 -> L5>L5:F`、`o: L4 -> L5>L5:T`（決策 L5 的分支目標是帶路徑的拆分葉，目標標記已含 `:T`／`:F`，不再附加；原型實跑核對；T020）。

## US2：`new` 敘述是 call-site（斷言 `result.intraPage()` 與 `interProceduralScopes()`）

| # | 探針 | 修正前 | 修正後 |
|---|------|--------|--------|
| 1 | `us2-1.js`（KI §21） | `P: entry -> L5`、`console: entry -> L6`、`x: L1 -> L6`；無 inter-procedural 模型 | `P: entry -> L5`、`a: entry -> L3`、`console: entry -> L6`、`x: L3 -> L6`；inter `[[P, P.P]]`（與 `P(1);` 版本相同） |
| 2 | `us2-2.js`（欄位 `f = x;`、constructor `x = 1;`、`new A();`、`y = x;`） | `A: L2 -> L8`、`x: L1 -> L9` | `A: L2 -> L8`、`x: L1 -> L3`、`x: L1 -> entry`（§18 殘留：欄位 entry）、`x: L5 -> L9`；inter `[[P, P.$A0, P.$A1]]` |
| 3 | `us2-3.js`（`class B extends A`，B 有欄位 `g = x;`、constructor `super(); x = 2;`） | `A: L2 -> L7`、`B: L7 -> L14`、`x: L1 -> L15` | `A: L2 -> L7`、`B: L7 -> L14`、`x: L1 -> L15`（`super();` 未連結，其 exception 邊直達 B constructor 的 exit）、`x: L1 -> L8`、`x: L1 -> entry`（§18 殘留）、`x: L11 -> L15`；inter `[[P, P.$A1, P.$A2]]`（不含 A 的 constructor `P.$A0`，無 `x: L4 -> ...`） |
| 4 | `us2-4.js`（只有方法，`new A();`） | `A: L2 -> L7`、`x: L1 -> L8` | 不變；inter `[]` |
| 5 | `us2-5.js`（`y = new F();`） | `F: entry -> L5`、`console: entry -> L6`、`x: L1 -> L6` | 不變；inter `[]` |
| 6 | `fn-new.js`（函式 `g` 內 `new A();`，A 為全頁唯一的 class 宣告；FR-018 class 放寬） | `A: L2 -> L8`、`A: L2 -> entry`、`console: entry -> L11`、`g: entry -> L10`、`x: L1 -> L11`；inter `[[P, P.g]]` | `A: L2 -> L8`、`A: L2 -> entry`（§18 殘留：`g` 的 entry）、`console: entry -> L11`、`g: entry -> L10`、`x: L4 -> L11`；inter `[[P.g, P.$A0], [P, P.g, P.$A0]]`（`g` 的模型 7 節點、無 pair；頁面模型 14 節點，pair 同 intra-page；intra-page 16 節點）（原型實跑） |
| 7 | `mix-f.js`（`f` 的兩筆到達定義指向不同函式；FR-018 嚴格規則） | `c: L1 -> L5>L10:F`、`c: L1 -> L5>L6:T`、`console: entry -> L11`、`f: L2 -> L10`、`f: L6 -> L10`、`x: L3 -> L11`；inter `[[P, P.$A0]]`（連到第一個函式） | `c: L1 -> L5>L10:F`、`c: L1 -> L5>L6:T`、`console: entry -> L11`、`f: L2 -> L10`、`f: L6 -> L10`、`x: L1 -> L11`；inter `[]`（不連；intra-page 10 節點）（原型實跑） |

## US3：class 方法呼叫連到方法本體（斷言 `result.intraPage()`）

| # | 探針 | 修正前 | 修正後 |
|---|------|--------|--------|
| 1 | `us3-1.js`（KI §7） | `A: L2 -> L7`、`console: entry -> L8`、`x: L1 -> L8` | `A: L2 -> L7`、`console: entry -> L8`、`x: L4 -> L8`；inter `[[P, P.$A0]]` |
| 2 | `us3-2.js`（`var o = new A();` `o.m();`） | `A: L2 -> L7`、`console: entry -> L9`、`o: L7 -> L8`、`x: L1 -> L9` | `A: L2 -> L7`、`console: entry -> L9`、`o: L7 -> L8`、`x: L4 -> L9`；inter `[[P, P.$A0]]`（不連 constructor） |
| 3 | `us3-3.js`（`o` 兩分支各為 `new A()` 與物件） | `A: L2 -> L8`、`c: L1 -> L7>L10:F`、`c: L1 -> L7>L8:T`、`console: entry -> L13`、`o: L10 -> L12`、`o: L8 -> L12`、`x: L1 -> L13` | 不變；inter `[]` |
| 4 | `us3-4.js`（`A.s();`） | `A: L2 -> L7`、`console: entry -> L8`、`x: L1 -> L8` | `A: L2 -> L7`、`console: entry -> L8`、`x: L4 -> L8` |
| 5 | `us3-5.js`（欄位 `f = this.m();`、constructor 與方法 `n` 內 `this.m();`、`new A().n();`） | `A: L2 -> L16`、`console: entry -> L17`、`x: L1 -> L17` | `A: L2 -> L16`、`console: entry -> L17`、`x: L9 -> L13`、`x: L9 -> L17`、`x: L9 -> L6`、`x: L9 -> entry`（§18 殘留：constructor 與 `n` 的 entry）；inter（登記順序）`[[P.$A0, P.$A2], [P.$A1, P.$A2], [P.$A3, P.$A2], [P, P.$A0, P.$A2, P.$A1, P.$A3]]`；`[P.$A1, P.$A2]` 模型的 pair 為 `x: L9 -> L6`，`[P.$A3, P.$A2]` 為 `x: L9 -> L13` |
| 6 | `us3-6.js`（`m` 只在 super class；`k` 不存在） | `A: L7 -> L10`、`A: L7 -> L9`、`S: L2 -> L7`、`console: entry -> L11`、`x: L1 -> L11` | 不變、不拋錯；inter `[]` |
| 7 | `us3-7.js`（`new A().m();`，A 有欄位 `f = x;`、constructor `x = 1;`、`m` 內 `y = x; x = 2;`） | `A: L2 -> L12`、`console: entry -> L13`、`x: L1 -> L13` | `A: L2 -> L12`、`console: entry -> L13`、`x: L1 -> L3`、`x: L1 -> entry`、`x: L5 -> L13`（`m` 的 L8 `y = x;` 的 exception 邊直達 `m` 的 exit，帶出 constructor 的 `x@L5`）、`x: L5 -> L8`、`x: L5 -> entry`、`x: L9 -> L13`（欄位讀 L1、`m` 讀 constructor 的 L5 → 順序為欄位、constructor、`m`）；inter `[[P, P.$A0, P.$A1, P.$A2]]`，該模型 pair 與上列 intra-page 清單相同 |

US3 #8–#12（spec）的預期在下列各表：#8 → FR-015 表 `cyc-handler`／`cyc-handler-nocyc`；#9 → FR-015 表 `cyc-1`、`cyc-2`、`ctor-cycle`；#10 → FR-016 表
`byp-3`；#11 → FR-016 表 `byp-1`、`ki16b`；#12 → 上表 #5（`us3-5` 欄位 `f = this.m();`）與「FR-017／FR-018」表 `field-new`。

## US4：參數、解構預設值與 class 名稱

| # | 探針 | 斷言 | 修正前 | 修正後 |
|---|------|------|--------|--------|
| 1 | `us4-1b.js`（本體改為 `g();`，見 research P1；U1＝A） | scope 清單、`intraPage()`、inter | scope `P, P.f`；`f: entry -> L6`、`g: L2 -> L4`；inter `[[P, P.f]]` | scope `P, P.f, P.f.$ANONYMOUS_FUN_0`；`d: L1 -> L3`、`d: L1 -> entry`（§18 殘留：箭頭函式 entry）、`f: entry -> L6`、`g: L2 -> L4`；inter `[[P.f, P.f.$ANONYMOUS_FUN_0], [P, P.f, P.f.$ANONYMOUS_FUN_0]]` |
| 1' | `us4-1.js`（KI §10 原程式，`return g();`） | 同上 | scope `P, P.f`；`f: entry -> L6`、`g: L2 -> L4` | scope 加 `P.f.$ANONYMOUS_FUN_0`、其 intra-procedural 模型存在；pair 不變（`return g();` 不是呼叫敘述，不連結） |
| 2 | `us4-2.js`（解構中的 `g = function () {...}`） | scope 清單、`intraPage()`、`intraProcedural('P.f.$ANONYMOUS_FUN_0')` | scope `P, P.f` | scope `P, P.f, P.f.$ANONYMOUS_FUN_0`；`intraPage()` 不變（`f: entry -> L6`）；該函式的 intra-procedural pair `[]` |
| 3 | `us4-3.js`（KI §11 static block） | `intraPage()` | `console: entry -> L3`、`console: entry -> entry` | `Q: L1 -> L3`、`Q: L1 -> entry`（§18 殘留）、`console: entry -> L3`、`console: entry -> entry` |
| 4 | `us4-4.js`（`static s = Q;`、`y = Q;`） | `intraPage()` | `Q: L2 -> L5` | `Q: L2 -> L3`、`Q: L2 -> L5`、`Q: L2 -> entry`（§18 殘留） |
| 5 | `us4-5b.js`（分行：`function h({` / `x = d,` / `y = x` / `} = {}) {`） | `intraPage()`；`h` 的 intra-procedural 節點數與各節點 GEN | `d: L1 -> L2`、`d: L1 -> entry`、`h: entry -> L7`、`x: entry -> L2`；`h` 3 個節點（entry、L2 定義 `x,y`、exit） | `d: L1 -> L3`、`d: L1 -> entry`、`h: entry -> L7`、`x: L3 -> L4`；`h` **5** 個節點：entry、L5（求值 `{}`，GEN 空）、L3（GEN `x`）、L4（GEN `y`）、exit；entry 以外 `x`、`y` 各只被定義一次 |
| 5' | `us4-5.js`（KI §17 單行） | `h` 節點數與 GEN | 3 個節點 | 5 個節點；entry 以外 `x`、`y` 各定義一次；有 `x` 從定義 `x` 的節點到定義 `y` 的節點的 pair（以節點物件比對，標記同為 `L2`） |
| 6 | `us4-6b.js`（無外層預設值） | 同 5 | `d: L1 -> L3`、`d: L1 -> entry`、`h: entry -> L7`、`x: L3 -> L4`；`h` 4 個節點 | 不變 |

## US5：CLI

見 [cli.md](./cli.md) §4 的情境表（命令、stdout／stderr、exit status、輸出目錄）。

## US6：拆分節點標籤與 for-in／for-of

| # | 探針／方式 | 修正前 | 修正後 |
|---|-----------|--------|--------|
| 1 | `us6-1.js`（`log(c ? a : b);`）以 CLI 執行，`page0/inter-procedurals/0.graph.dot`（行號＝程式行＋1） | `callReturn_a`、`callReturn_b` | `callReturn (5:T)`、`callReturn (5:F)`；以 `toDotWithLabelLoc` 轉換同一模型：`callReturn (L4:C0)` ×2 → `callReturn (L4:C0:T)`、`callReturn (L4:C0:F)`（unit 層級，原程式行號）；pair 不變 |
| 2 | 未拆分呼叫點（`us2-1.js` 修正後的 `new P(1);`、golden `expected-interprocedural`） | `callReturn`／`callReturn_a`… | 不變（既有 golden 逐位元組相同） |
| 3 | 單元：手建 CFG，for-of 右側拆分，本體中一個前驅的 astNode 沒有 range | 該前驅的邊被重導到右側決策 | 維持指向迴圈節點（不可從 entry 不經迴圈節點到達） |
| 3' | 單元：同上，但無 range 的前驅在迴圈外（外層 `while` 經 `break` 可繞回） | — | 該前驅被重導到右側決策（從 entry 不經迴圈節點可達） |
| 4 | `us6-4.js`（外層 `while`＋`break`） | `c: L1 -> L2>L3:T`、`c: L1 -> L2>exit:F`、`c: L8 -> L2>L3:T`、`c: L8 -> L2>exit:F`、`s: L1 -> L4>L4:F`、`s: L1 -> L4>L4:T`、`x: L4 -> L5`（intra-procedural） | 不變 |

## FR-015：呼叫環（斷言 intra-page，另逐一斷言各 inter-procedural 模型）

| 探針 | 修正前 | 修正後 |
|------|--------|--------|
| `cyc-1.js`（`m` 在 `if (c)` 內呼叫 `this.m()`） | intra-page `A: L2 -> L11`、`console: entry -> L12`、`x: L1 -> L12`；inter `[]` | intra-page `A: L2 -> L11`、`c: L1 -> L4>L5:T`、`c: L1 -> L4>L8:F`、`c: L1 -> entry`、`c: L5 -> L4>L5:T`、`c: L5 -> L4>L8:F`、`c: L5 -> entry`、`console: entry -> L12`、`x: L1 -> L12`（`L5` `c = 0` 的 exception 邊直達 `m` 的 exit → 回到 L11 的 CALL RETURN，帶出 `x@L1`）、`x: L8 -> L12`。inter[0] ＝ `m` 的模型：relatedScopes `[P.$A0]`、7 節點、階層一條 `back: true` 的呼叫邊（呼叫點 L6 → `m`）、pair `c: L5 -> L4>L5:T`、`c: L5 -> L4>L8:F`、`c: L5 -> entry`；inter[1] ＝ 頁面 `[P, P.$A0]`、14 節點（intra-page 16），pair 與上列 intra-page 清單相同（含 `x: L1 -> L12`） |
| `cyc-2.js`（`m` 呼叫 `this.n()`、`n` 呼叫 `this.m()`） | intra-page `A: L2 -> L15`、`console: entry -> L16`、`x: L1 -> L16`；inter `[]` | intra-page `A: L2 -> L15`、`c: L1 -> L4>L5:T`、`c: L1 -> L4>L8:F`、`c: L1 -> entry`、`c: L5 -> L4>L5:T`、`c: L5 -> L4>L8:F`、`c: L5 -> entry`、`console: entry -> L16`、`x: L1 -> L16`（同 cyc-1：`L5` 賦值敘述的 exception 邊）、`x: L12 -> L16`、`x: L8 -> L16`。inter[0] ＝ M（`[P.$A0, P.$A1]`，12 節點）、inter[1] ＝ 頁面（`[P, P.$A0, P.$A1]`，19 節點，intra-page 21，pair 與上列 intra-page 清單相同）、inter[2] ＝ N（`[P.$A1, P.$A0]`，12 節點）；M 與 N 的 pair 皆為 `c: L5 -> L4>L5:T`、`c: L5 -> L4>L8:F`、`c: L5 -> entry`；M 的階層：L6 一般呼叫邊 → 開放子模型（main `n`，L11 回邊 → `m`）；N 的階層：L11 一般呼叫邊 → 開放子模型（main `m`，L6 回邊 → `n`）（research R5.3） |
| `ctor-cycle.js`（constructor 在 `if (c)` 內 `c = 0; new A();`、之後 `x = 1;`；頁面 `new A();`；FR-018 放寬後成環） | intra-page `A: L2 -> L11`、`console: entry -> L12`、`x: L1 -> L12`（8 節點）；inter `[]` | intra-page `A: L2 -> L11`、`A: L2 -> L6`、`A: L2 -> entry`、`c: L1 -> L4>L5:T`、`c: L1 -> L4>L8:F`、`c: L1 -> entry`、`c: L5 -> L4>L5:T`、`c: L5 -> L4>L8:F`、`c: L5 -> entry`、`console: entry -> L12`、`x: L1 -> L12`（同 cyc-1：`L5` 賦值敘述的 exception 邊）、`x: L8 -> L12`（16 節點）。inter[0] ＝ constructor 的模型（`[P.$A0]`，7 節點，L6 一條 `back: true` 呼叫邊 → constructor），pair `c: L5 -> L4>L5:T`、`c: L5 -> L4>L8:F`、`c: L5 -> entry`；inter[1] ＝ 頁面（`[P, P.$A0]`，14 節點），pair 與 intra-page 相同（原型實跑） |
| `cyc-uncond.js`（無條件遞迴 `m() { this.m(); x = 1; }`、`new A().m(); console.log(x);`；research P8） | intra-page `A: L2 -> L8`、`console: entry -> L9`、`x: L1 -> L9`（8 節點）；inter `[]` | intra-page `A: L2 -> L8`、`x: L5 -> L9`（14 節點；`console: entry -> L9`、`x: L1 -> L9` 消失：L4 之後的節點從 entry 不可達，`x@L5` 是不可達環內的 GEN 經 worklist 流出）。inter[0] ＝ `m` 的模型（`[P.$A0]`，5 節點，pair `[]`）；inter[1] ＝ 頁面（`[P, P.$A0]`，12 節點），pair `A: L2 -> L8`、`x: L5 -> L9`（原型實跑＋可達性走訪） |
| `cyc-handler.js`（m↔n 互相呼叫，`n` 內 `document.addEventListener('click', h)`；頁面 `new A().m();`；plan U3） | intra-page `A: L5 -> L19`（7 節點）；inter `[]` | intra-page `A: L5 -> L19`、`c: L1 -> L7>L11:F`、`c: L1 -> L7>L8:T`、`c: L1 -> entry`、`c: L8 -> L7>L11:F`、`c: L8 -> L7>L8:T`、`c: L8 -> entry`、`document: entry -> L14`、`document: entry -> entry`、`h: entry -> L14`、`h: entry -> entry`（**24 節點**，LOOP 的 onEvent 目標含 `h` 的 entry；沒有 U3 修正時 21 節點、未接上 `h`，pair 相同）。inter[0] ＝ M（`[P.$A0, P.$A1]`，13 節點，pair `c: L8 -> L7>L11:F`、`c: L8 -> L7>L8:T`、`c: L8 -> entry`）、inter[1] ＝ 頁面（`[P, P.$A0, P.$A1]`，19 節點，pair 同 intra-page）、inter[2] ＝ N（`[P.$A1, P.$A0]`，13 節點，pair 同 M）；`interProceduralScopes()` 順序即此（不受 U3 影響）（原型實跑） |
| `cyc-handler-nocyc.js`（對照：`n` 不呼叫 `this.m()`） | 同 `cyc-handler.js` 修正前 | intra-page `A: L5 -> L19`、`c: L1 -> L7>L11:F`、`c: L1 -> L7>L8:T`、`c: L1 -> entry`、`document: entry -> L14`、`document: entry -> entry`、`h: entry -> L14`、`h: entry -> entry`（**23 節點**，接上 `h`）。inter[0] ＝ `[P.$A0, P.$A1]`（12 節點，pair `[]`）、inter[1] ＝ 頁面（`[P, P.$A0, P.$A1]`，18 節點，pair 同 intra-page）（原型實跑） |
| `cyc-3.js`（`m(p)` 內 `var t = p; this.m(0); y = t;`，FR-016＋遞迴） | intra-page `A: L2 -> L9` | intra-page `A: L2 -> L9`、`p: entry -> L4`、`p: entry -> entry`、`t: L4 -> L6`、`t: L4 -> entry`（後兩個 entry 項為 §18 殘留）；inter[0] ＝ `m` 的模型（`[P.$A0]`，6 節點），pair 同上但無 `A`；沒有 FR-016 時 `t: L4 -> L6` 會消失 |

hierarchy.dot（見 [output.md](./output.md) §2）：`cyc-1` 的 `m` 模型有 `h0 -> h0` 的 `recursive call` 與 `recursive return`；`cyc-2` 的 M 有 `m→n` call／return 與
`n→m` recursive call／recursive return。

## FR-016：繞過規則（斷言 intra-page）

| 探針 | 修正前 | 修正後 |
|------|--------|--------|
| `byp-1.js`（區塊 `let t`、`f();`、`console.log(t);`） | `console: entry -> L8`、`f: entry -> L7` | `console: entry -> L8`、`f: entry -> L7`、`t: L6 -> L8` |
| `byp-3.js`（方法 `n(p)` 內 `var t = 1; this.m(); y = t + p;`） | `A: L2 -> L12` | `A: L2 -> L12`、`p: entry -> L9`、`t: L7 -> L9`；`[P.$A1, P.$A0]` 模型 `p: entry -> L9`、`t: L7 -> L9` |
| `ki16b.js`（參數名遮蔽：`check(a); var c = a;`） | `a: L1 -> L5`、`a: entry -> L3`、`check: entry -> L5` | `a: L1 -> L5`、`a: L1 -> L6`、`a: entry -> L3`、`check: entry -> L5`（KI §16 後果段） |
| `ki16.js`（`if (check(a) || b)`） | `a: entry -> L2`、`b: L4 -> L5:F>L6:T`、`b: L4 -> L5:F>L8:F`、`check: entry -> L5>L5:F`、`check: entry -> L5>L6:T` | `a: L4 -> L5`、`a: L4 -> L8`、`a: entry -> L2`、`b: L4 -> L5:F>L6:T`、`b: L4 -> L5:F>L8:F`、`check: entry -> L5>L5:F`、`check: entry -> L5>L6:T` |
| `byp-2.js`（`f` 在 `g` 外，`g` 內的 `f();` 依 H3 不連：函式不適用 FR-018 的 class 放寬） | — | 不變（對照組） |

## FR-017／FR-018：欄位中的 `new B()` 與 class 放寬（斷言 intra-page 與 `interProceduralScopes()`；原型實跑）

| 探針 | 修正前 | 修正後 |
|------|--------|--------|
| `field-new.js`（A 的欄位 `f = new B();`，B 的 constructor `x = 1;`；頁面 `new A();`） | `A: L7 -> L10`、`console: entry -> L11`、`x: L1 -> L11`（9 節點）；inter `[]` | `A: L7 -> L10`、`B: L2 -> L8`、`B: L2 -> entry`（§18 殘留：欄位 entry）、`console: entry -> L11`、`x: L4 -> L11`（17 節點）；inter `[[P.$A1, P.$A0], [P, P.$A1, P.$A0]]`（欄位模型 7 節點、pair `[]`；頁面模型 15 節點，pair 同 intra-page） |
| `handler-new.js`（事件 handler `onClick` 內 `new A(); A.s(); y = x;`，A 的 constructor `x = 1;`、static `s` 內 `x = 2;`） | `A: L2 -> L11`、`A: L2 -> L12`、`A: L2 -> entry`、`console: entry -> L16`、`onClick: entry -> L15`、`window: entry -> L15`、`x: L1 -> L13`、`x: L1 -> L16`、`x: L1 -> entry`（13 節點）；inter `[]` | `A: L2 -> L11`、`A: L2 -> L12`、`A: L2 -> entry`、`console: entry -> L16`、`onClick: entry -> L15`、`window: entry -> L15`、`x: L1 -> L16`、`x: L1 -> entry`、`x: L4 -> entry`、`x: L7 -> L13`、`x: L7 -> entry`（21 節點；`entry` 項為 §18 殘留：handler 經 LOOP 重入，`x@L4` 經 L11 CALL RETURN 的 exception 邊離開 handler，research P6）；inter `[[P.onClick, P.$A0, P.$A1]]`，pair `x: L7 -> L13` |
| `fn-new-early.js`（`function g() { new A(); }`、`g();` 在 `class A` 宣告**之前**；放寬不看執行順序） | `console: entry -> L11`、`g: entry -> L5`、`x: L1 -> L11`；inter `[[P, P.g]]` | `console: entry -> L11`、`g: entry -> L5`、`x: L8 -> L11`（16 節點；實際執行 `g()` 會因 TDZ 拋錯，README 註明）；inter `[[P.g, P.$A0], [P, P.g, P.$A0]]` |

`fn-new.js` 見 US2 #6，`mix-f.js` 見 US2 #7。

## Edge cases

| 探針／程式 | 修正後 |
|-----------|--------|
| `edge-classexpr.js`（`var A = class { constructor() { x = 1; } }; new A();`） | `A: L2 -> L7`、`x: L4 -> L8`（修正前 `x: L1 -> L8`） |
| `edge-static-this.js`（static `s` 內 `this.m()`（static）與 `this.k()`（實例方法）） | `A: L2 -> L14`、`console: entry -> L15`、`x: L8 -> L15`、`y: L1 -> L15`；inter `[[P.$A0, P.$A1], [P, P.$A0, P.$A1]]`（只連 static `m`） |
| `fn-rec.js`（函式自我遞迴 `m();`） | 不變（P5） |
| `new A().m();`，A 沒有 constructor 與欄位 | 只連 `m`（同 US3-1） |
| `o.m();` 的 `m` 是 getter／setter 或欄位中的箭頭函式 | 不連（單元測試，pair 與修正前相同） |
| `var B = class { static s = B; }`、`var B = class Q { static s = Q; }` | 不產生 `B`／`Q` 在 static 成員中的 pair（Fable A7） |
| 輸出目錄已存在 | 見 cli.md §3 |
