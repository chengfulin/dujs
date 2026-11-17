# Contract：驗收情境 → 自動化測試（SC-001、SC-002）

**Feature**: `007-split-call-nodes` | 預期 pair 以 spec 為準（不在此重抄）；測試以 `tests/helpers/analyze.js` 執行。沿用 004／005／006 慣例，Setup 把
`specs/007-split-call-nodes/probes/*.js`（不含 `run.js`、`baseline-develop.txt`）逐字複製到 `tests/dujs/cases/probes007/`，測試以 `fs.readFileSync` 讀入；
spec 以內文給出、probes 沒有的程式以內嵌字串寫在測試中。「未指明模型」者對 inter-procedural（若有）與 intra-page 都斷言。

| 情境 | 測試檔（新） | 程式 | 備註 |
|------|--------------|------|------|
| US1-1…4 | `tests/dujs/splitcallnodes.js` | p1、p12、p2、p21 | US1-3、US1-4 為守門 |
| US2-1…13 | 同上 | p3、p4、p5、p10、p13、p14、p18、p19、p22、p25、p27、p31、p33 | US2-9 另斷言外層 `console.log` 不連結、`f()` 連結（hierarchy call 邊）；US2-12 斷言兩條 call 邊（F 的 constructor、`m`）；**US2-10（P25）在 US2 只斷言 `x: L1 -> L9`、`f` 有 call 邊、分析完成；`x: L3 -> L9`（返回後段的例外邊）移到 US4 的 T052 斷言**（DECISION 006 Q1：US1–US3 期間段 1…k 不連 exception 邊） |
| US3-1…12 | 同上 | p6、p7、p8、p9、p11、p15＋p15b、p16、p17、p24、p26、p28、p32 | US3-9 斷言 `f` 只有一條 call 邊且在第一個 `case` 之前；US3-12 斷言各 `case` 各一筆 p-use |
| US4-1…6 | 同上 | p20、p20b、p29、p30、p34、p35；另 p25 | US4-6 斷言決策節點副本沒有 exception 出邊；另補 US2-10 的 `x: L3 -> L9`（P25，自 US2 移來） |
| P23（IIFE） | 同上 | p23 | 結果與 `baseline-develop.txt` 相同（不連結、不拆分） |
| FR-006 | 同上 | 全部 probes | 每個 probe 的 `intra(page)` pair 與 `probes/baseline-develop.txt` 的 `intra(page)` 行逐字相同 |
| 守門（clarify Q4） | 同上 | 內嵌：`for (;; f())`、`do { } while (f())`、`var y = c ?? f();`、`var y = c \|\| f();` | 前兩者 develop 已連結，結果不退步；後兩者同 P17 機制（`f` 只在該分支呼叫） |
| 先例並存（R5） | 同上 | 內嵌：`switch (a && b)`（無呼叫）、`switch (a && f())`、`for (v of a && f())` | 已拆分判別式只記一次、pair 與 develop 相同；含呼叫的拆分葉依 R1 拆段 |
| 條件求值位置（R13 L5，characterization，US2 T033） | 同上 | 內嵌：`c?.m(f())`、`c?.[f()]`、`var [z = f()] = c`、`var {z = f()} = c`（`f` 內有定義、其後有讀取） | 四例 `f` 皆不連結（無 call 邊）、inter／intra-page pair 與 develop 相同；callee 的定義不錯殺 `f` 之前的定義 |
| for-in/of 左側（DECISION 005 Q2 A，R13 L1，characterization，US2 T033） | 同上 | 內嵌：`for (o[g()] of a) {}`、`for (var [z = g()] of a) {}` | `g` 不連結，pair 與 develop 相同（FR-001 的明文例外） |
| class static 不再連結（DECISION 005 Q3 A、DECISION 006 Q4 必修 3，R13 L2、L2'，characterization，**US1 T066**——行為自 T025 起改變） | 同上 | 內嵌：`switch (v) { case class { static y = g(); }: … }`、`var [z = class { static y = g(); }] = c`、`c?.m(class { static y = g(); })`、`for (o[class { static y = g(); }] of c) {}`、`try { … } catch ({a = class { static y = g(); }}) { … }` | 五例 `g`／static scope 皆不連結——**與 develop 不同**（develop 經 `expressionsEvaluatedAtNode` 連結），測試名與註解標明為相對 develop 的行為變更（`case` test：KI §44；其餘：KI §46） |
| 同節點先定義的 callee（防護，R13 L3，US2 T033） | 同上 | 內嵌：`var f = h; f = g, f();`、`var o = new A(), r = o.m();`、`f(f = g);` | 第一例不連結 `h`、`g`（不得出現經 `h` 的 pair）；第二例只連 `new A()`、不連 `o.m()`；第三例照常連結（定義在 callee 讀取之後） |
| once-loop 的迴圈變數（data-model §4） | 同上 | 內嵌：`for (var v of f()) { use(v); v = 2; }` | `f` 只在進入迴圈前呼叫一次；`v` 的定義在迴圈節點副本：`use(v)` 讀到迴圈頭的定義、沒有 `v = 2` → `use(v)` 的 pair |
| `switch` 沒有 `case`（R13 L6，守門） | 同上 | 內嵌：`switch (f()) {}` | 007 不比 develop 差：develop 拋 `Cannot read properties of undefined`；007 若仍拋錯，不得出現其他錯誤；若能完成分析，更新本測試與 KI §48 |
| 摘要的延後 p-use（R8） | `tests/dujs/summary.js`（擴充） | 內嵌：US1（T021）被呼叫端 `function k() { if (f(x)) {} }`；US2（T036）`function k() { if (x < f()) {} }` | US1：callee `f` 的讀取（延後 p-use）與 `x`（引數的 c-use）∈ `summaryOf(k).upwardExposed`；US2：`x` ∈ `upwardExposed`（`summaryGraphOf` 併入 `deferredPuse`）；`*.matching.json` 的 `summaries` 同步列出。`if (x < f())` 的 `astNode` 是 BinaryExpression，US1 的階段篩選不列 `f()`，故放在 US2 |
| FR-007 配對 | `tests/dujs/matching.js`（擴充） | p6、p31、p32、p15 | 每條 return 邊在 `*.matching.json` 恰對應一個 record；同一節點多個呼叫點各一筆、`seq` 依求值順序；`beforeDecision` 對決策、switch、for-of 皆為 true |
| FR-007 標記（DECISION 005 Q1 → A） | `tests/dujs/cfggraphconverter.js`（擴充） | 內嵌 | CALL／CALL RETURN 標 `call (<行>)`、`callReturn (<行>[:路徑])`，重名加 `_a` |
| SC-002 | 上列合計 | P1–P35、P20b | `node specs/007-split-call-nodes/probes/run.js` 的輸出與各情境預期一致 |

另有單元測試：

- `tests/dujs/callsplit.js`：
  - 後序位置（data-model §5 每列一例：`x += f()`、`x = f()`、`a[i] = f()`、`new F(a)`、`h(f())`、`f() + g()`、`new F().m(x = 1)`〔T037 之前只斷言位置，callees 於 T037 後補斷言〕、class static 呼叫點與名稱綁定）；
  - 讀取與定義歸段（`f(x = 1)` 的 `x` 定義在段 0；`var y = g()` 的 `y` 在段 1；`ClassDeclaration` 名稱在其 static 呼叫點之前）；
  - 拋錯判定表：FR-005 列出的全部例子（返回後可能拋錯 8 例、不拋錯 6 例、`throw f()`、`console.log(f())`）各一列；`THROW_TYPES` 與 esgraph 匯出相等；
  - `evaluatedExpressionsOf`：第一個 `case` 取判別式、其他 `case` 為空、已拆分者不取、for-of 只取右側、`case` test 不取、`CatchClause` 取 `param`；
  - 呼叫點範圍：data-model §5「不列為呼叫點」每列一例（`callSites` 為空或不含該呼叫），且其中的讀取／定義仍有段（`segmentOf` 有定義）；含 class static 變體（`case` test、解構預設值、catch 參數預設值、`?.` 之後、for-in/of 左側）不成為 `class-static` 呼叫點；
  - 階段性 predicate（暫時項，DECISION 006 Q2）：不給 predicate 時全列舉；給 predicate 時篩掉的呼叫點不進 `callSites`、段依留下者重算，且與不給 predicate 的結果分開快取；
  - `segmentOfVarDef`：`once-loop` 的迴圈變數定義回傳 null。
- `tests/dujs/methodcalls.js`、`newcallsite.js`、`relaxedcallee.js`：`calleeScopesOf` 的 `new A().m()` 期望改為兩個呼叫點的串接結果（記入 golden-diff「單元測試期望」）；新增 `calleeScopesOfExpression` 的案例。
- `tests/dujs/expansion.js`、`bypass.js`、`classfields.js`、`exceptionsummary.js`：編碼舊形狀（GEN 全搬到 CALL RETURN、決策節點保留例外邊、`keepGenerateAtCallSite`）者依新規格更新，逐處列入「單元測試期望」；
  class static 相關測試預期零 pair 差異（R3 統一規則的守門；不含上列 class static 行為變更的位置）。
- `tests/esgraph/`：`discriminantThrowTarget` 的設置（try 內外、巢狀 switch）、不新增任何邊（intra-procedural 圖與 develop 相同）。
- 非自動化：golden／MDN `--verify`（contracts/diff-check.md）與 `perf.md`（SC-005）。
