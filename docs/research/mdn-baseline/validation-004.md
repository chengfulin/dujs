# MDN 教學範例驗證報告：feature 004（`004-fix-remaining-issues`）對照 develop

- 日期：2026-11-16。只讀驗證：沒有修改 dujs repo，也沒有 commit。
- 受測版本：
  - **004**：branch `004-fix-remaining-issues`（HEAD `44458b8`）
  - **develop**：以 `git archive develop`（`d1db8e2`）解到 `mdncheck/dev/`
- MDN 釘選版本：`mdn/content@74f6e26e70721281aeb500ba4f8c1f06f20b0100`、`mdn/learning-area@21973263ba859ff3477919087b488157f9d618a6`。來源是以這兩個 commit 取得的 clone，HEAD 已核對。
- 工作檔（驗證時在 `mdncheck/` 底下，未保存；腳本見附錄 B）：
  - `x.js`：抽取 live sample 的程式，規則與 `../tools/extract.js` 相同。
  - `ex/*.js`：受測程式，逐字抽取。
  - `run.js <dujsRoot> <file>...`：用該版本的 `tests/helpers/analyze.js` 分析。同一頁的多個檔案用 `''` 串接，與 CLI 相同。輸出 scopes、每個 scope 的 intra-procedural pair、每個 inter-procedural model 的 pair，以及 intra-page pair。
  - `res/<id>.{004,dev}.txt`：兩個版本的完整輸出。
  - `cli/{004,dev}/<id>/`：CLI 實跑結果。
  - `probe/p1–p4.js`：最小重現程式。
- 記法：沿用 helper 的 `var: def -> use`，行號是**原始檔**行號（CLI 的 dot 會 +1）。`L<n>>X:T/F` 表示 p-use。intra-page 中的 `Lnull` 是 LOOP 節點，這是 helper 的既有記法（specs/004 research.md L14）；CLI 的 dot 印成 `loop`。

## 0. 摘要

### 0.1 範例清單（33 個程式：Advanced JS objects 10、Core Scripting 22、衍生 1）

| id | 模組 | 範例 | 行數 | 004 與 develop 的差異 | 分類 |
|---|---|---|---|---|---|
| a01 | AJO | TYS oojs-1（題目） | 5 | 無 | — |
| a01b | AJO | TYS oojs-1 解答 | 23 | `o.m()` 連結 | (a) §7/FR-004 |
| a02 | AJO | TYS oojs-2（題目） | 20 | 無 | — |
| a02b | AJO | TYS oojs-2 解答 | 36 | `calcArea` 連結；繼承的 `calcPerimeter` 不連結 | (a) FR-004 ＋ (b) 不追 super |
| a03 | AJO | bouncing-balls/main.js | 19 | 無 | — |
| a04 | AJO | bouncing-balls/main-finished.js | 105 | 無（README 已預告） | (b) |
| a05 | AJO | oojs/assessment/main.js | 205 | `ball.exists` 改為 p-use | (a) §20/FR-001；**新發現 N1** |
| a06 | AJO | Classes in JS 內嵌片段組合 | 79 | 7 個方法連結 | (a) §7/FR-004 |
| a07 | AJO | Object prototypes 片段（Person） | 19 | 無 | (b) |
| a08 | AJO | Object prototypes 片段（do-while） | 7 | 無 | — |
| s01 | CS | TYS math-3-finish | 33 | 無 | — |
| s02 | CS | TYS conditionals-3-finish | 23 | 無 | — |
| s03 | CS | TYS loops-2-finish | 27 | 無 | — |
| s04a/b/c | CS | while／do-while／for-loop-cats | 18/18/15 | 無 | — |
| s05 | CS | A_switch_example | 29 | 無 | (b) §18 |
| s06a | CS | Exiting_loops_with_break | 27 | `searchName` 改為 p-use | (a) §20/FR-001 |
| s06b | CS | silly-story-finish | 55 | 無 | (b) |
| s07 | CS | gallery-finish | 69 | 無 | (b) |
| s08 | CS | number-guessing-game.html | 67 | 無 | (b) |
| s09 | CS | functions/first.js＋second.js（conflict.html） | 4+4 | CLI exit 0 改為 1 | (a) §12/FR-009；(b) 檔案串接 |
| s10 | CS | allowance-updater | 25 | 無 | (b) |
| s11 | CS | Calculating squares | 15 | 無 | — |
| s12 | CS | TYS conditionals-2-finish | 30 | 無 | — |
| s13 | CS | TYS functions-1-finish | 19 | 無 | — |
| s14 | CS | TYS functions-3 | 23 | 無 | — |
| s15 | CS | TYS math-1-finish | 28 | 無 | — |
| s16 | CS | TYS objects-2-finish | 35 | 無 | — |
| s17 | CS | string-methods-3 | 17 | 無 | — |
| s18 | CS | target and currentTarget | 13 | 無 | — |
| x01 | 衍生 | a04 加入 `update`↔`collisionDetect` 互相呼叫＋`new Ball(...).update();` | 108 | 呼叫環連結；`width` 改為 p-use | (a) §7/§20/FR-015 |

AJO = Advanced JavaScript objects；CS = Core / Dynamic scripting。第一批中屬於 Core Scripting 的 #1–#9 全部驗證，另外補了 9 個 A 類、40 行以內的範例（s10–s18）。

### 0.2 結論

- **CLI**：32 個範例與 x01 在 004、develop 都 exit 0，stderr 也是空的；x01 含呼叫環。
  - s09（一頁兩個 script，`const name` 重複宣告）在 004 解析失敗：印出 `dujs: analysis failed: Identifier 'name' has already been declared`，exit 1，並刪除輸出目錄。develop 則 exit 0，而且留下輸出目錄。這是 §12 的預期修正。
  - s09 改成兩頁（`-js first.js -js second.js`）後 exit 0。
- **差異**：6 個範例（另加 x01）在 004 與 develop 的結果不同，全部屬於預期修正。**沒有回歸**：找不到 develop 有、004 消失的正確 pair。其餘 26 個範例兩版的 helper 輸出與 CLI `.dot` 逐字相同；`report.html` 只有時間戳不同。
- **人工推導**：35 行以內的 26 個程式都做了完整推導，與 004 一致。人工推導與 004 不一致的地方，都屬於 README Limits 或未修的節（§18）。較大的 a04、a05、s06b、s07、s08、x01 只推導關鍵 pair，也一致。
- **新發現**（詳見 §3）：
  - N1：函式、方法或 handler 內的 `o.m();`，若 `o` 定義在函式之外則不連結。MDN assessment 的 `evilBall.*` 就是這種情形。README 的不連結清單只列了 `f()`/`new F()`。
  - N2：只有固定清單內的全域物件有定義，`Math`、`Object`、`JSON`、`alert`、`requestAnimationFrame` 都沒有。這在 004 之前就存在，README 沒寫。
  - N3：develop 上，條件本身是成員運算式時（`if (o.p)`）也是 c-use，但 §20 的描述沒有包含這種情形。004 已由 FR-001 修正。
- **研究報告要更正的地方**：
  - #9 `first.js`＋`second.js` 是刻意示範的錯誤，應從 A 類改為 C 類。
  - #6 silly-story 沒有 §20 樣式，兩版結果相同。
  - #13 bouncing balls 在 004 下沒有變化，因為 `const ball = new Ball()` 與 for-of 綁定仍不連結。
- **覆蓋缺口**：以下修正沒有任何 MDN 範例觸及：§10、§11、§17、FR-016、FR-017、`new X();` 敘述（§21）、拆分的呼叫點（§15）。其中 §21/FR-003 與 handler 的組合另以 `probe/p3.js` 確認：`new E();` 連到 constructor，constructor 內註冊的 handler 也進入 intra-page，得到 `k: L1 -> L5`、`k: L5 -> L5`。

## 1. 分類標準

- (a) 預期的修正：對應 004 修的 KI §n 或 FR。
- (b) 文件化的限制：依 JS 語意應該有、但 004 沒有的 pair，原因寫在 README Limits 或 known-issues 未修的節（§16、§18、§22 的後續項目）。
- (c) 新發現：其他與推導不符的情形。

推導所依據的 dujs 模型：

- `a.b = …` 定義 `a`，但不算使用 `a`；`a.b += …` 同時使用與定義 `a`。
- 不追蹤 `this` 與物件屬性。
- 全域物件只有內建清單內的有定義。
- handler 由 intra-page 的 LOOP 節點驅動，可以重複觸發。
- `?:`、`&&`、`||` 會拆成決策節點。
- 只有呼叫敘述才是 call-site。
- 「§18 殘留」指函式 entry 節點上的 use（例如 `x: L1 -> entry`）。所有 handler 與函式都有這類 pair，下文不再逐一列出。

## 2. 各範例

### a01 — TYS oojs-1 題目（5 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Test_your_skills/Object-oriented_JavaScript>；`content@74f6e26e` `files/en-us/learn_web_development/extensions/advanced_javascript_objects/test_your_skills/object-oriented_javascript/index.md` L29–35（`live-sample___oojs-1`）
- 程式：`class Shape { name; sides; sideLength; }`
- 推導：沒有初始值的欄位不是 scope，所以沒有 pair。與 004 一致。兩版沒有差異。

### a01b — TYS oojs-1 解答（23 行）
- 來源：同篇 L45–67（`<details>` 內的解答 fence）
- 程式：`Shape` 的 constructor 與 `calcPerimeter()`；`const square = new Shape(...)`、`square.calcPerimeter();`；`triangle` 同樣寫法。
- 差異：004 多了 inter `[PAGE_0, $ANONYMOUS_FUN_1(calcPerimeter)]`，intra-page 多了 `console: entry -> L13`（另有 §18 的 `console: entry -> entry`）。
- 完整推導：
  - `Shape: L1 -> L19/L22`、`square: L19 -> L20`、`triangle: L22 -> L23`、`console: entry -> L13`
  - constructor：`name/sides/sideLength: entry -> L7/8/9`
  - 結果與 004 一致。constructor 不連結，因為 `const o = new A()` 是運算式內的呼叫（README）。
- 分類：(a) §7/FR-004。develop 少了 `console: entry -> L13`。

### a02 — TYS oojs-2 題目（20 行）
- 來源：同篇 L83–104
- 頁面沒有呼叫。constructor 的 pair 為 `name/sides/sideLength: entry -> L7..9`。推導一致，兩版沒有差異。

### a02b — TYS oojs-2 解答（36 行）
- 來源：同篇 L84–101 加上 L117–135（題目程式加解答，去掉 `// ...`）
- 程式：`class Square extends Shape`（constructor 內 `super(...)`，另有 `calcArea()`）；`const square = new Square(4); square.calcPerimeter(); square.calcArea();`
- 差異：004 多了 inter `[PAGE_0, $ANONYMOUS_FUN_3(calcArea)]` 與 `console: entry -> L26`。
- 推導：
  - `Shape: L1 -> L20`、`Square: L20 -> L32`、`square: L32 -> L34/L35`、`console: entry -> L26`
  - 依 JS 語意還應有 `console: entry -> L13`（繼承來的 `calcPerimeter`），但 README 寫明「The super class is not followed」。
  - 扣除這項限制後，與 004 一致。
- 分類：(a) FR-004；(b) 不追 super。

### a03 — bouncing-balls/main.js（19 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Object_building_practice>；`learning-area@21973263` `javascript/oojs/bouncing-balls/main.js`
- 推導：
  - `canvas: L3 -> L4`、`document: entry -> L3`、`window: entry -> L6/L7`；`random` 的 `min/max: entry -> L12`
  - L6、L7 的 `canvas.width = …` 是 `canvas` 的定義，之後沒有 use。
  - `Math` 沒有定義（N2）。
- 與 004 一致，兩版沒有差異。

### a04 — bouncing-balls/main-finished.js（105 行，推導關鍵 pair）
- 來源：`learning-area@21973263` `javascript/oojs/bouncing-balls/main-finished.js`
- 差異：無（helper 輸出與 CLI `.dot` 逐字相同）。
- 004 的關鍵 pair：
  - `loop();` 有連結（inter `[PAGE_0, loop]`）
  - `width: L6 -> L94`、`height: L7 -> L94`、`balls: L74 -> L96`、`ball: L96 -> L97/98/99`、`loop: entry -> L102`、`ball: L78 -> L89`、`size: L77 -> L78`、`balls: L74 -> L76>L77:T/L105:F`
  - `collisionDetect` 的 intra pair `ball: L60 -> L61>L62:T/L60:F`：`!(this === ball)` 是 p-use
- 依 JS 語意應有、但 004 沒有：
  - L97–L99 的 `ball.draw()/update()/collisionDetect()` 不連結，所以沒有 `width: L6 -> L39>…` 與 `balls: L74 -> L60`。
  - `const ball = new Ball(...)` 不連結 constructor。
  - 這些都是 README Limits 寫明的情形（「Common patterns such as the MDN bouncing balls example are still not connected」）。`requestAnimationFrame(loop)` 則屬於「Anonymous function call」。
- §20 原文所指的條件 `this.x + this.size >= width` 由 x01 驗證。分類：(b)。

### a05 — oojs/assessment/main.js（205 行，推導關鍵 pair）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Adding_bouncing_balls_features>；`learning-area@21973263` `javascript/oojs/assessment/main.js`
- 程式：`Shape`、`Ball extends Shape`、`EvilCircle extends Shape`（constructor 內有 `window.addEventListener('keydown', …)`）；`const evilBall = new EvilCircle(...)`；`loop()` 內呼叫 `evilBall.draw(); evilBall.checkBounds(); evilBall.collisionDetect();`
- 差異：以下三處的 `ball` 在 develop 是 c-use，在 004 改為 p-use（intra、inter、intra-page 三種 model 都一樣）：
  - L79 `!(this === ball) && ball.exists`，右側拆成 `L79:T`
  - L147 `if (ball.exists)`
  - L191 `if (ball.exists)`
  - develop 的結果是 `ball: L78 -> L79:T`、`L146 -> L147`、`L190 -> L191`；004 的結果例如 `ball: L190 -> L191>L192:T` 與 `L191>L190:F`。
- 推導：
  - 頁面：`count: L6 -> L180`、`L180 -> L180/L181`、`EvilCircle: L93 -> L184`、`Shape: L27 -> L38/L93`、`evilBall: L184 -> L198/199/200`、`width: L11 -> L188`、`height: L12 -> L188`。004 都有。
  - 條件中的 `ball` 應是 p-use：004 正確，develop 錯。
  - 依 JS 語意應有、但 004 沒有：
    - `evilBall.*()` 不連結，所以沒有 `count: L180 -> L154`、`width: L11 -> L128>…`、`balls: L165 -> L146`。**這不在 README 的限制內（N1）。**
    - `const evilBall = new EvilCircle(...)` 不連結 constructor，constructor 內註冊的 keydown handler 也就不進入 intra-page。屬於 (b)：README「`var o = new A();` does not connect the constructor」。
    - for-of 綁定上的 `ball.draw()` 不連結，屬於 (b)。
- 分類：(a) §20/FR-001；(b)；(c) N1。

### a06 — Classes in JavaScript 片段組合（79 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Classes_in_JavaScript>；`content@74f6e26e` `…/classes_in_javascript/index.md` 的 fence L43、L76、L88、L104、L139、L152、L173（去掉錯誤示範的 `summers.#year;`）、L191（去掉 `myExample.#somePrivateMethod();`）
- 差異：
  - 004 的 inter model 連結了 7 個方法：`giles.introduceSelf`、`spot.sleep`、`walsh.introduceSelf`、`walsh.grade`、`summers.introduceSelf`、`summers.canStudyArchery`、`myExample.somePublicMethod`。
  - intra-page 多了 `console: entry -> L9/L17/L33/L40/L56` 與 `grade: L39 -> L40`。
- 推導：上述 7 個方法都應連結。不連結的有三類，都是 README 寫明的限制：
  - `#somePrivateMethod`（private methods），所以沒有 `console: entry -> L73`
  - constructor（宣告內的 `new`）
  - `super(name)`（不追 super）
- 與 004 一致。分類：(a) §7/FR-004；(b)。

### a07 — Object prototypes 片段：Person（19 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Object_prototypes>；`content@74f6e26e` `…/object_prototypes/index.md` 的 fence L175、L200、L218
- 推導：
  - `Person: entry -> L11/14/16`、`personPrototype: L1 -> L11`、`reuben: L14 -> L15`、`irma: L16 -> L18/19`、`console: entry -> L18/19`
  - `reuben.greet()` 不連結：方法是經 prototype 指派的，而且 `Person` 是函式不是 class。README 的 `o.m()` 只適用 class，也不追蹤屬性。
  - `Object` 沒有定義（N2）。
- 與 004 一致，兩版沒有差異。分類：(b)。

### a08 — Object prototypes 片段：do-while（7 行）
- 來源：同篇 fence L105（去掉輸出註解）
- 推導：`Date: entry -> L1`、`myDate: L1 -> L2`、`object: L2 -> L5`、`object: L5 -> L5/L6`、`object: L5 -> L7>L5:T`、`object: L5 -> L7>exit:F`（intra-page 中為 LOOP 節點）、`console: entry -> L6`。
- 與 004 一致，兩版沒有差異。

### s01 — TYS math-3-finish（33 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Test_your_skills/Math>；`content@74f6e26e` `…/core/scripting/test_your_skills/math/index.md` 的 JS fence L308
- 完整推導共 28 筆，與 004 完全相同：
  - `document: entry -> L15/16/17/18`
  - `eleWeight: L2 -> L11`、`mouseWeight: L3 -> L11`、`ostrichHeight: L5 -> L12`、`duckHeight: L6 -> L12`、`pwd1: L8 -> L13`、`pwd2: L9 -> L13`
  - `weightComparison: L11 -> L19>L19:T/F`、`heightComparison: L12 -> L22>L22:T/F`、`pwdMatch: L13 -> L25>L25:T/F`
  - `weightTest: L19:T/F -> L28`、`heightTest: L22:T/F -> L30`、`pwdTest: L25:T/F -> L32`
  - `para1: L28 -> L29`、`para2: L30 -> L31`、`para3: L32 -> L33`。L16–L18 的定義被 `.textContent=` 蓋掉。
  - `section: L15 -> L29/31/33`
- 兩版沒有差異。

### s02 — TYS conditionals-3-finish（23 行）
- 來源：`…/test_your_skills/conditionals/index.md` 的 JS fence L302
- 完整推導共 16 筆，與 004 相同：
  - `machineActive: L1 -> L7>L8:T/L14:F`、`pwd: L2 -> L9>L9:T/F`
  - `machineResult: L8/L14 -> L20`
  - `pwdResult: L5 -> L21`（經 else 分支）、`pwdResult: L9:T/F -> L21`
  - `para1: L20 -> L22`、`para2: L21 -> L23`、`section: L17 -> L22/23`、`document: entry -> L17/18/19`
- 兩版沒有差異。

### s03 — TYS loops-2-finish（27 行）
- 來源：`…/test_your_skills/loops/index.md` 的 JS fence L170
- 完整推導共 21 筆，與 004 相同：
  - `i: L18 -> L18`、`L18>L19:T/exit:F`、`L19>L20:T/L24:F`、`L20`、`L24>L25:T/L18:F`
  - `phonebook: L4 ->` 的位置與 `i` 相同，L18 本身除外
  - `name: L1 -> L19>L20:T/L24:F`、`para: L2 -> L16`、`section: L15 -> L16`、`document: entry -> L2/L15`
  - `break` 後直接離開迴圈。
- 兩版沒有差異。

### s04a/b/c — while／do-while／for-loop-cats（18/18/15 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Loops>；`…/core/scripting/loops/index.md` 的 JS fence L522、L564、L367
- 交叉驗證：
  - while 有 `myFavoriteCats: L4 -> L18` 與 `i: L6 -> L8>L18:F`，因為迴圈可能一次都不執行。
  - do-while 沒有 `L4 -> L18`，也沒有 `i: L6 -> L16`，因為迴圈本體至少執行一次。
  - for 有 `myFavoriteCats: L4 -> L15`。
  - 其他 pair 三者同構（`+=` 同時是 use 與 def）。
- 推導全部一致。兩版沒有差異。

### s05 — A_switch_example（29 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Conditionals>；`…/conditionals/index.md` 的 JS fence L370
- 推導：
  - 頁面：`select: L1 -> L4`、`setWeather: entry -> L4`、`document: entry -> L1/L2`
  - handler：`choice: L7 -> L10>L11:T/L14:F`；L14、L18、L22 也一樣
  - intra-page：`select: L1 -> L7`
- 004 另有 `select: L1 -> entry`，是 §18 殘留（handler 本體含 `switch`，留給 stage 2）。
- 分類：(b) §18。兩版沒有差異。

### s06a — Exiting_loops_with_break（27 行）
- 來源：同 Loops 篇，JS fence L409（EmbedLiveSample L439）
- 差異：`searchName` 在 develop 是 c-use `L13 -> L19`，在 004 改為 `L13 -> L19>L20:T` 與 `L19>L17:F`。intra（handler）與 intra-page 都一樣。
- 推導：
  - `searchName`、`splitContact` 在 L19 是 p-use
  - `splitContact: L18 -> L20`、`contact: L17 -> L18`、`input: L14 -> L15`
  - `para: L16/L20 -> L24>L25:T/exit:F`
  - intra-page 另有 `contacts: L1 -> L17`、`input: L9/L14 -> L13`（handler 再次觸發）
- 與 004 一致。分類：(a) §20/FR-001。

### s06b — silly-story-finish（55 行，推導關鍵 pair）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Silly_story_generator>；`…/silly_story_generator/index.md` 的 JS fence L199
- 差異：無。研究報告把它列為 §20 樣本，但這兩個條件都沒有 §20 樣式：
  - `customName.value !== ""`
  - `document.getElementById("uk").checked`
- 關鍵 pair：
  - `customName: L3 -> L41>L42:T/L46:F`、`customName: L3 -> L42`
  - `document: entry -> L46>L47:T/L53:F`
  - `newStory: L39 -> L43/49/53`、`L43 -> L49/53`、`L49 -> L50`、`L50 -> L53`
  - `weight: L47 -> L49`、`temperature: L48 -> L50`
- 依 JS 語意應有、但 004 沒有：`returnRandomStoryString()` 與 `randomValueFromArray()` 是運算式內的呼叫，不連結（README），所以沒有 `characters: L14 -> L25`。`Math` 也沒有定義（N2）。
- 分類：(b)。

### s07 — gallery-finish（69 行，推導關鍵 pair）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Image_gallery>；`…/image_gallery/index.md` 的 JS fence L177
- 關鍵 pair：
  - 頁面：`images: L9 -> L24`、`image: L24 -> L28/29`、`baseURL: L20 -> L28`、`newImage: L31 -> L33/35/38`、`thumbBar: L2 -> L33`
  - 箭頭 handler：`e: entry -> L39>L40:T/exit:F`、`e: entry -> L40`（引數是 c-use）
  - intra-page：`updateDisplayedImage: entry -> L40`、`btn: L59 -> L58>…`、`btn: L64 -> L68`
- 依 JS 語意應有、但 004 沒有：handler 內的 `updateDisplayedImage(e);` 呼叫的是外層函式，不連結（README：f() of a function defined outside the function containing the call）。
- 分類：(b)。兩版沒有差異。

### s08 — number-guessing-game.html（67 行，推導關鍵 pair）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/A_first_splash>；`learning-area@21973263` `javascript/introduction-to-js-1/first-splash/number-guessing-game.html`（inline script）
- 關鍵 pair：
  - `guessCount: L7/L37 -> L12>…, L23>…`、`guessCount: L37 -> L37`（跨 handler 觸發）
  - `randomNumber: L1 -> L18>…/L30>…/L32>…`
  - `guesses: L16 -> L16`、`guessField: L38 -> L11`、`Number: entry -> L11`
- 依 JS 語意應有、但 004 沒有：L22、L26 的 `setGameOver();` 是在 handler 內呼叫外層函式，不連結（README）。因此 `resetGame` handler 不會被註冊，也就沒有 `guessCount: L54 -> L12>…`、`randomNumber: L66 -> L18>…`。
- 分類：(b)。兩版沒有差異。

### s09 — functions/first.js＋second.js（conflict.html）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Functions>；`learning-area@21973263` `javascript/building-blocks/functions/{first,second}.js`
- 程式：兩個檔都寫 `const name = …` 與 `function greeting()`。這是 MDN 刻意示範的命名衝突，瀏覽器在第二個 script 會丟 SyntaxError。
- CLI，兩個檔放在同一頁：
  - 004：`dujs: analysis failed: Identifier 'name' has already been declared`，**exit 1**，輸出目錄已刪除。
  - develop：`*** ERROR: … ***`，**exit 0**，還留下 `out-…`。
- 兩個檔分成兩頁時，004 exit 0。
- 分類：(a) §12/FR-009/FR-010；(b) README「The files of a page are concatenated」。研究報告的 A 類應改為 C 類，或改用「兩頁」形式當作多頁基準。

### s10 — allowance-updater（25 行）
- 來源：Conditionals 篇 JS fence L116（EmbedLiveSample L144）
- 推導：
  - inter `[PAGE_0, updateAllowance]`（L25 呼叫）：`shoppingDone: L3 -> L16>L17:T/L19:F`、`childAllowance: L17/L19 -> L22`、`checkBox: L1 -> L5`
  - intra-page：`shoppingDone: L3/L7/L9 -> L6>L7:T/L9:F`、`updateAllowance: entry -> L11`
- 與 004 一致。
- 依 JS 語意應另有 `shoppingDone: L7/L9 -> L16>…`，但 handler 內 L11 的 `updateAllowance();` 呼叫外層函式，依 README 不連結。
- 分類：(b)。兩版沒有差異。

### s11 — Calculating squares（15 行）
- 來源：Loops 篇 JS fence L263（EmbedLiveSample L283）
- 完整推導共 23 筆，與 004 相同：
  - `i: L4 -> L4`、`L4>L5:T/L8:F`、`L5`
  - `newResult: L5 -> L6`
  - `results: L6 -> L6/L8`
  - intra-page：`results: L1/L15/L6/L8 -> L6/L8`。L15 的箭頭函式本體定義 `results`。
- 兩版沒有差異。

### s12 — TYS conditionals-2-finish（30 行）
- 來源：`…/test_your_skills/conditionals/index.md` 的 JS fence L197
- 完整推導共 42 筆，與 004 相同：
  - `||` 與 `&&` 都會拆分：
    - L6：`L6>L7:T`、`L6>L6:F`、`L6:F>L7:T`、`L6:F>L8:F`
    - L8、L10、L13、L15、L17：`Ln>Ln:T`、`Ln>next:F`、`Ln:T>body:T`、`Ln:T>next:F`
    - L17 的 F 分支到 L24
  - `response` 的 8 個定義都到 L28
  - `score: L2 -> L27`、`machineActive: L3 -> L5>L6:T/L21:F`
- 兩版沒有差異。

### s13 — TYS functions-1-finish（19 行）／s14 — TYS functions-3（23 行）
- 來源：`…/test_your_skills/functions/index.md` 的 JS fence L102、L226。s14 的題目內容與 s13 的解答幾乎相同。
- 推導（各 7 筆）：
  - `names: L1 -> L14/L15`（s14 為 L18/L19）、`names: L1 -> entry`（§18）
  - `randomNumber -> choice`、`choice -> L16/L20`
  - `chooseName: entry -> 呼叫行`、`document: entry -> L11`
- 與 004 一致。兩版沒有差異。

### s15 — TYS math-1-finish（28 行）
- 來源：`…/test_your_skills/math/index.md` 的 JS fence L111
- 完整推導共 23 筆，與 004 相同：
  - `finalResult: L12 -> L14`、`L12 -> L18>L18:T/F`、`L12 -> L18:F`（F 分支的 template literal）
  - `evenOddResult: L14 -> L22>L22:T/F`
  - `finalResultCheck: L18:T/F -> L20`、`evenOddResultCheck: L22:T/F -> L26`
  - number1–4 → L9/L10；`additionResult`、`subtractionResult` → L12
  - `para1: L20 -> L27`、`para2: L26 -> L28`、`section: L16 -> L27/28`
- 兩版沒有差異。

### s16 — TYS objects-2-finish（35 行）
- 來源：`…/test_your_skills/object_basics/index.md` 的 JS fence L209
- 推導（6 筆）：`band: L3 -> L30`、`bandInfo: L30 -> L34`、`para1: L34 -> L35`、`section: L32 -> L35`、`document: entry -> L32/33`。與 004 一致。

### s17 — string-methods-3（17 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Useful_string_methods>；`…/useful_string_methods/index.md` 的 JS fence L360
- 推導（7 筆）：`stations: L2 -> L10`、`station: L10 -> L13`、`result: L13 -> L15`、`listItem: L15 -> L16`、`list: L1 -> L16`、`document: entry -> L1/L14`。與 004 一致。

### s18 — target and currentTarget（13 行）
- 來源：<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling>；`…/event_bubbling/index.md` 的 JS fence L389
- 推導（17 筆）：
  - `handleClick: entry -> L11/12/13`、`container: L8 -> L12`、`button: L9 -> L13`、`document: entry -> L1/8/9/11`
  - `e: entry -> L3/L4`、`logTarget: L3 -> L5`、`logCurrentTarget: L4 -> L5`
  - `output: L1 -> L5`、`output: L5 -> L5`（`+=` 加上 handler 再次觸發）
- 與 004 一致。

### x01 — 衍生：bouncing balls 加呼叫環（108 行）
- 程式：在 a04 上加三處：
  - `update()` 結尾加 `this.collisionDetect();`
  - `collisionDetect()` 結尾加 `this.update();`
  - 檔尾加 `new Ball(50, 50, 1, 1, "red", 10).update();`
- CLI：004 與 develop 都 exit 0。develop 沒有連結，所以也沒有形成環。
- 004 的差異：
  - inter model：`[PAGE_0, loop, FUN_0(ctor), FUN_2(update), FUN_3(collisionDetect)]`，另有 `[update, collisionDetect]`、`[collisionDetect, update]` 兩個子 model。
  - 新增 `width: L6 -> L39>L40:T/L43:F` 與 `height: L7 -> L47>…`。這正是 §20 原文的 `this.x + this.size >= width`。
  - 新增 constructor 參數的 pair `x/y/velX/velY/color/size: entry -> L23..28`，以及 `balls: L76 -> L61`。
- 分類：(a) §7（`new A().m()`、`this.m()`）、FR-015（以回邊表示呼叫環）、§20。

## 3. 新發現

### N1. 函式內的 `o.m();`，若 `o` 定義在函式之外則不連結
- 出處：a05 的 `loop()` 內有 `evilBall.draw(); evilBall.checkBounds(); evilBall.collisionDetect();`，而 `evilBall` 是頁面層的 `const evilBall = new EvilCircle(...)`。
- 最小重現（`probe/p2.js`）：
  ```js
  var x = 0;
  class A {
    m() {
      x = 1;
    }
  }
  const o = new A();
  function g() {
    o.m();
  }
  g();
  console.log(x);
  ```
- 目前結果（004 與 develop 相同）：inter model 只有 `[PAGE_0, g]`，沒有連到 `m`；intra-page 的 pair 是 `x: L1 -> L12`。intra-page 同時也有 `o: L7 -> L9`，表示 `o` 的定義確實到達呼叫點。
- 預期結果：
  - README 的規則是「`o.m();` when every definition of `o` reaching the call is `new A(...)` of the same class」。依這個寫法，此例應連結 `m`，得到 `x: L4 -> L12`。
  - 如果刻意不連結（與 H3「函式內只看所在 scope」一致），README 的 Not connected 清單需要補上這一條。目前清單只寫了 `f()`/`new F()` of a function defined outside，而 §22 (0) 的 class 放寬只適用 `new A()`/`A.s()`。
- 可能位置：`lib/dujs/callresolver.js` 的 `classOfInstance`（約 L301）只看呼叫節點在 intra-procedural 的 `reachIns`，外層變數在那裡沒有到達定義，因此回傳 `null`。呼叫端是同檔 `calleeScopesOfMethodCall` 最後的 `o.m(...)` 分支。
- 建議（二選一）：
  1. 比照 class 放寬：`reachIns` 沒有 `o` 的定義時，若 `o` 在全頁只有一筆定義，而且是 `new A(...)`（`A` 是 class），就連結。
  2. 在 README Limits 寫明這個限制，並以 MDN assessment 為例。
- handler 內的 `o.m()` 也是同樣的情形。
- 建議的 known-issues 節名：**「23. `o.m()` in a function is not connected when `o` is defined outside the function (found by checking the MDN examples after `004-fix-remaining-issues`)」**

### N2. 只有固定清單內的全域物件有定義（文件缺口，004 之前就存在）
- 出處：用到 `Math`（大部分範例）、`Object`（a07、a08）、`alert`（s09）、`requestAnimationFrame`（a04、a05）的範例。
- 最小重現：`console.log(Math.PI);` 只有 `console: entry -> L1`，沒有任何 `Math` 的 pair。
- 原因：`lib/dujs/pagescope.js` 的 `builtInObjects` 只有 `window`、`document`、`String`、`Number`、`Boolean`、`Array`、`Map`、`WeakMap`、`Set`、`Date`、`console`；`lib/dujs/domainscope.js` 只有 `localStorage`。其他沒有宣告的全域名稱都沒有定義。
- 預期：在 README Limits 寫出這份清單，並說明清單以外的全域名稱沒有定義；或者把標準內建物件（`Math`、`Object`、`JSON` 等）加入清單。後者會讓 golden 改變。
- 建議節名：**「24. Only a fixed list of global objects is defined」**；或者只修改 README 的「HTML DOM object」那一條。

### N3. §20 的描述漏掉「條件本身就是成員運算式」（develop 的錯誤，004 已修）
- 出處：a05 的 L79:T、L147、L191。
- 最小重現（`probe/p1.js`）：
  ```js
  var o = {}, a = [];
  if (o.e) {
    o = 1;
  }
  for (const b of a) {
    if (b.e) {
      b;
    }
  }
  ```
- develop 的結果是 c-use：`o: L1 -> L2`、`b: L5 -> L6`。004 是 p-use：`o: L1 -> L2>L3:T/L5:F`、`b: L5 -> L6>L7:T/L5:F`，這是正確的。
- 建議：在 §20 的 Fixed 段補一句「A condition that is a member expression (`if (o.p)`) was also a c-use; found by the MDN assessment example」，讓 golden 與範例的差異都有依據可查。這不是 004 的問題。

### 回歸檢查
- 26 個範例在兩個版本間逐字相同。
- 其他 6 個範例與 x01 的差異逐筆看過，只有兩種：c-use 改為成對的 p-use，或因連結而新增 pair。沒有任何 develop 有、004 消失的正確 pair。
- helper 的模型不變性檢查（R14 snapshot 比對）在兩個版本都沒有丟錯。
- **結論：沒有回歸。**

## 4. 預期修正命中情形

| 修正 | 命中範例（舉例 pair） |
|---|---|
| §7/FR-004（`o.m()`） | a01b `console: entry -> L13`；a02b `console: entry -> L26`；a06 的 7 個方法，例如 `grade: L39 -> L40` |
| §7（`new A().m()`、`this.m()`）＋FR-015 呼叫環 | x01 `width: L6 -> L39>L40:T` 與 3 個呼叫環 model |
| §20/FR-001 | s06a `searchName: L13 -> L19>L20:T`；a05 `ball: L190 -> L191>L192:T`（N3） |
| §12/FR-009/FR-010 | s09：exit 由 0 改為 1，不留下輸出目錄 |
| §21/FR-002/FR-003 | MDN 範例中沒有；以 `probe/p3.js` 確認 constructor 與其中註冊的 handler 有連結 |
| §10、§11、§14、§15、§17、FR-016、FR-017 | 這兩個模組的範例都沒有觸及 |

## 附錄 A：受測程式 sha256（前 16 碼）

```
a0bb113f20e7b6f6  a01-oojs-1.js
05e479c97277e39c  a01b-oojs-1-solution.js
b2652135ed4c6c24  a02-oojs-2.js
d8789813d35cc218  a02b-oojs-2-solution.js
3fcf2f3da8163749  a03-bouncing-main.js
b69da83e1f70986a  a04-bouncing-main-finished.js
a36ee1e4c31bba15  a05-assessment-main.js
91468301177c04ca  a06-classes-snippets.js
9cc181d3e0fb9509  a07-prototypes-person.js
39f00da7159a3043  a08-prototype-chain-dowhile.js
1e1dacd2b4b0b54b  s01-math-3-finish.js
14453f3a6c0484a6  s02-conditionals-3-finish.js
dd977e7e82e44d57  s03-loops-2-finish.js
6e42b8018214640c  s04a-while-loop-cats.js
ed642cd654e546cc  s04b-do-while-loop-cats.js
169a100b29b558c4  s04c-for-loop-cats.js
a29ef9124ffa5161  s05-switch-example.js
f3c7b13cedb9ae63  s06a-exiting-loops-break.js
dd90d3b16eec927d  s06b-silly-story-finish.js
43f8ea7b971c9ca9  s07-gallery-finish.js
6fe9d1af535afa2e  s08-number-guessing-game.js
0f753d2d51cbf9a1  s09-first.js
9c331fe4cb81d1af  s09-second.js
5ca270cdc2da7f4f  s10-allowance-updater.js
7d2093494ea2445d  s11-calculating-squares.js
9a808ee2af23bc61  s12-conditionals-2-finish.js
b30717f7d387d837  s13-functions-1-finish.js
fc598bf4ed85e942  s14-functions-3.js
88c2f2e2b72940be  s15-math-1-finish.js
579beb71dbffe73a  s16-objects-2-finish.js
3e734f7dc8625dcd  s17-string-methods-3.js
ed936a6d4886d49f  s18-target-currenttarget.js
b88dbe18838574a4  x01-bouncing-cycle.js
```

## 附錄 B：重跑

工作檔（`ex/`、`res/`、`cli/`、`probe/`、develop 的解壓目錄）未保存；腳本保存在 [`tools/`](tools/)：`extract-sample.js`（原 `x.js`）抽取範例、`run-pairs.js`（原 `run.js`）輸出 pair。

```sh
# <work>：工作目錄；<dujs>：dujs 專案根；<dev>：`git archive develop | tar -x -C <dev>` 解出的 develop 版本
cd <work>/ex
node <dujs>/docs/research/mdn-baseline/tools/run-pairs.js <dujs> a05-assessment-main.js   # 004
node <dujs>/docs/research/mdn-baseline/tools/run-pairs.js <dev>  a05-assessment-main.js   # develop
```
