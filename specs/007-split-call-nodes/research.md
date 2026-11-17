# Research：把含呼叫的節點拆成「呼叫之前」與「返回之後」（feature 007）

**Feature**: `007-split-call-nodes` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

基準：`develop` `edc22d5`（本 branch 的 `lib/`、`tests/` 與它相同，`git diff --stat edc22d5 HEAD -- lib tests` 為空）；`npm test` **1495 passing**（2026-11-18 實測）。
技術選型維持 repo 現況（Node ≥ 24、CommonJS、mocha＋should、eslint、c8、fast-check、espree、eslint-scope、walkes），無未知項、無偏離。

以下每節依「Decision／Rationale／Alternatives considered」記錄；節號在 plan、data-model、contracts 中以 R<n> 引用。

---

## R0. 現況（develop `edc22d5`）的呼叫建模

- **呼叫點判定**：`callresolver.calleeScopesOf(node)` 只看 `node.astNode` 本身是否為 `CallExpression`／`NewExpression`（`callExpressionOf`，lib/dujs/callresolver.js:158-172），
  外加欄位初始化式的 `this.m()`／`new B()`（FR-017）；`modelbuilder` 另把節點上定義的 class 的 static 成員串在最前面（`findStaticMemberScopesOfClassesAtNode`）。所以只有「呼叫敘述」與決策節點本身的條件是呼叫點（KI §22 (3)）。
- **攤平圖形狀**（`expansion.replayCall`，lib/dujs/expansion.js:386-445）：
  - 非決策節點：原節點的副本改型別為 CALL，保留全部讀取與「例外邊」；GEN 搬到 CALL RETURN（class 名稱例外：`keepGenerateAtCallSite`、`splitByInnerClassName`）；正常邊搬到 CALL RETURN。
    ⇒ 引數中的定義（`f(x = 1)`）被建模在 callee 之後（KI §16 的 P12）。
  - 決策節點（`hierarchy.isCallBeforeDecision`）：在它之前插入新的 CALL 節點（GEN／KILL 空），`CALL → callee → CALL RETURN → 決策節點`；決策節點保留全部讀取、定義與例外邊。
    ⇒ 條件中的讀取與引數的定義都在 callee 之後（KI §16 的 P1），且決策節點的例外邊帶 callee 的定義（P35 的 `x: L3 -> L11`）。
  - 同一節點的多個被呼叫端（`new A()` 的欄位初始化式＋constructor、static 成員）以「前一個的 CALL RETURN 是下一個的 call-site」串接（`hierarchy.addCallEdge` 的 `previous`）。
- **讀取**：`defuseanalyzer.findUSESet` 依 `usedexpressions.usedExpressionsOf` 的項目走訪；p-use 只記在有 `true`／`false` 的節點（`findDUPairs` 以 `Pair(node, node.true／false)` 產生）。
- **定義**：`findGENSet` 走訪 `cfgNode.analyzedExpressions`；攤平圖副本的 GEN 由 `expansion.rebuildGenerateSets` 重建（`flatVarDefOf`）。
- **例外**：esgraph 以遞迴的 `expressionThrows`（lib/esgraph/index.js:287-305）決定節點是否有 exception 出邊；求解器（005）讓 exception 邊帶 `IN(p)`（FR-014）；被呼叫端的例外以
  CallSiteRecord 的 `exceptionalReturn`（＝串接中第一個 call-site 的例外目標）虛擬貢獻（005 R5）。
- **switch**：`case` 節點各自以 p-use 讀判別式（`usedexpressions.astNodeItems`）；判別式被分支拆分時（`switch (a && b)`）由拆分節點在第一個 `case` 前讀一次，`case` 節點帶 `discriminantSplit` 不再讀（lib/dujs/usedexpressions.js:61-63）。
  `case` 節點沒有 exception 出邊（esgraph 的 `SwitchCase` 不呼叫 `mayThrow`）。
- **for…in／for…of**：迴圈節點每次迭代讀整個迴圈頭；右側被拆分時（`loopRightSplit`）由拆分節點在進入迴圈前讀一次，只攔截迴圈外的前驅（`branchsplitter.isInsideLoopBody`）。

---

## R1. 分段在攤平圖中的表示（FR-002、FR-007）

**Decision**：不新增節點型別或邊型別。一個含 k 個呼叫點的節點 N，在 inter-procedural／intra-page（以及沿用其結果的 inter-page）攤平圖中分成 k+1 段（段 0＝第一個呼叫之前，段 j＝第 j 個呼叫返回後到第 j+1 個呼叫進入前，段 k＝最後一個呼叫返回之後），沿用既有的節點：

| N 的種類 | 段 0 | 段 1…k−1 | 段 k |
|----------|------|----------|------|
| 非決策節點（敘述、宣告、`return`、`throw`、參數初始化、欄位初始化…） | N 的副本（型別 CALL，保留 N 的 exception 邊） | 第 j 個呼叫點最後一個被呼叫端的 CALL RETURN | 最後一個 CALL RETURN（接手 N 的 normal 邊） |
| 決策節點（`if`／`while`／`for` 條件、`do…while`、拆分後的決策節點） | 插在 N 前的新 CALL 節點（N 的全部前驅改指向它，迴圈回邊亦然，每次求值都呼叫） | 同左 | N 的副本（決策本身，保留 `true`／`false`） |
| 只求值一次（`switch` 判別式記在第一個 `case`；`for…in`／`for…of` 右側；R5） | 插在第一個 `case`／迴圈節點前的新 CALL 節點 | 同左 | 最後一個 CALL RETURN（接到第一個 `case`／迴圈節點） |

同一呼叫點有多個被呼叫端（`new A()` 的欄位初始化式＋constructor、class 的 static 成員）時維持現行串接，中間的 CALL RETURN 段為空。每個段節點的 `line`／`col`／`labelPath` 取 N 的。

**Rationale**：現行兩種形狀（非決策：副本即 CALL；決策：前插 CALL）已經是「段 0／段 k」的骨架，只差「每段各帶自己的讀取、定義、例外邊」。沿用既有型別讓
`.graph.dot`、`*.matching.json`（`dujs-matching/1`）、求解器的 CallSiteRecord 語意、005 的 bypass（FR-016）與摘要圖（`expandShallow`）都不用改格式；
FR-007 的「新增的節點或邊型別」答案為「無」。

**Alternatives considered**：
- 新增 `segment` 節點型別（每段一個獨立節點，CALL／CALL RETURN 只做呼叫）：節點數多一倍、`.dot` 多一種型別、matching 與 README 都要改，沒有資訊上的收益。
- 在 intra-procedural CFG（esgraph）層就拆節點：違反 FR-006（intra-procedural 的 pair 會變，例如迴圈每次讀右側的 pair 消失）。

## R2. 呼叫點的列舉與求值順序（FR-001、FR-002、Clarifications Q1）

**Decision**：新模組 `lib/dujs/callsplit.js`（MIT）以 `planOf(node, scopeTree)` 為每個 intra-procedural 原節點產出 **SegmentPlan**（data-model §1），步驟：

1. **求值的運算式**（`evaluatedExpressionsOf`）：`split.preEvaluated`（依序）＋依節點種類——一般節點為 `astNode`；第一個 `case` 節點且判別式未被拆分時為 `switch` 的判別式（`case` test 不列入，Clarifications 裁判追加）；
   其他 `case` 節點為空；`for…in`／`for…of` 未拆右側時為 `right`（`left` 不列入：Q2 A，FR-001 的明文例外，見 R13 L1）；entry／exit 為空。
   沒有任何 `case` 的 `switch (f()) {}` 沒有「第一個 `case`」，判別式不列入任何節點（此規則不涵蓋它；develop 對它已拋錯，見 R13 L6）。
2. **後序走訪**：依 ECMAScript 求值順序對上列運算式做後序編號（子節點由左至右，運算節點在其子節點之後；跳過巢狀函式本體、箭頭函式本體、class body 中非 computed key 的部分）。
   這個順序即「運算元由左至右、引數由左至右、引數先於呼叫、複合賦值先讀目標」：`x += f()` 的左側 `x` 在 `f()` 之前，`x = f()` 的賦值（AssignmentExpression 本身）在之後，`new F(a)` 為 `F`、`a`、New。
   短路與 `?:` 已由 branchsplitter 拆成不同節點；單一節點內仍可能有條件求值的只剩 optional chaining（`?.` 之後的部分）與解構樣式內的預設值，這些位置的呼叫不列為呼叫點（步驟 3）。
3. **呼叫點**：後序中每個 `CallExpression`／`NewExpression` 以 `callresolver.calleeScopesOfExpression(node, expression, scopeTree)`（R7）解析；結果非空才是呼叫點；
   另外每個「有 static 成員」的 `ClassDeclaration`／`ClassExpression` 在其後序位置是一個呼叫點（被呼叫端＝static 成員，取代 `findStaticMemberScopesOfClassesAtNode` 的「放在最前面」）。
   呼叫點依後序位置排序；呼叫「進入」的時刻就是該呼叫運算式的後序位置（callee 與引數都已求值）。
   **不列為呼叫點**（即使可解析；與 develop 一致，golden／MDN 皆 0 例；data-model §5）：
   - **條件求值而未被拆分的位置**：`ChainExpression` 中第一個 `optional: true` 節點之後求值的部分（`c?.m(f())` 的 `f()` 與 `.m()`、`c?.[f()]`），以及解構樣式內 `AssignmentPattern` 的預設值（`var [z = f()] = c`、`var {z = f()} = c`、賦值與 catch 參數的解構同理；
     參數本身的預設值除外，依 spec Assumptions 視為一定求值）。這些位置都在單一節點內，模型無法表示「可能不執行」；若列為呼叫點，呼叫會被當成必定發生，callee 的定義會錯殺可實現的 pair（例：`c` 為 undefined 時 `f` 沒被呼叫，`f` 之前的定義仍到達其後的讀取）。
   - for-in/of 左側（步驟 1）與 `case` test（Clarifications 裁判追加；Q3 A 使含 class static 成員的 case test 亦不連結）。
   - **防護（L3）**：callee 為識別字、或成員呼叫的 receiver 為識別字時，若同一節點中該變數有 `generatedAt` 的後序位置早於此識別字的讀取，則此呼叫運算式不列為呼叫點。
     解析讀的是節點開始時的 ReachIn（步驟 4），這種情形會錯連到舊定義：`var f = h; f = g, f();` 的 ReachIn 只有 `f = h`，不防護會連到 `h`（develop 不連結，屬新增的錯誤 pair）。定義在讀取之後者（`f(f = g)`，callee 先求值）不受影響。
4. 解析沿用 004 FR-018／005 FR-005 的規則，讀的是原節點的 ReachIn（節點開始時的定義），與 develop 相同；不擴充（IIFE、optional call、`super(…)`、tagged template、getter 等仍不是呼叫點）。

`callresolver.calleeScopesOf(node)`（現行 API）保留，改為「節點上全部呼叫點的被呼叫端依序串接」的便利函式（供既有測試與 `modelbuilder` 外的呼叫者），欄位初始化式的特例（`dujsFieldInitializer`）由一般列舉涵蓋後刪除。

**Rationale**：Clarifications Q1 → A 要求完整的由左至右求值順序；後序編號是 AST 上最直接的實作，且同一份編號同時供讀取、定義、拋錯判定三者使用（R3、R6），不會分岔。

**Alternatives considered**：只拆「callee 與引數在前、其餘在後」——spec review Q1 已否決（`x += f()` 會錯）。以 range 比較取代後序——`x = f()` 中賦值目標 `x` 的 range 在 `f()` 之前，但定義在之後，range 判斷不出來。

## R3. 讀取與定義歸段（FR-002）

**Decision**：
- **讀取**：每個被讀的 `Identifier` 歸到「後序位置在它之前的呼叫點個數」那一段。`findUSESet` 改為「規則來源節點」與「結果節點」分開：段節點以 N 的原節點為規則來源（`usedExpressionsOf(N)`、N 是否為決策節點），
  只收歸段索引等於自己的 Identifier。
- **定義**：`findGENSet` 另記 `generatedAt`（VarDef → 完成該定義的 AST 節點：AssignmentExpression、VariableDeclarator、UpdateExpression、具名函式／class 運算式本身、for-in/of 頭、CatchClause）；
  定義歸到該 AST 節點後序位置之前的呼叫點個數那一段。**class 名稱特例**：`ClassDeclaration` 的名稱與 class 運算式的內部名稱在其 static 成員執行前綁定，歸到「以該 class 的 static 呼叫點結尾」的那一段
  ——這把現行的 `keepGenerateAtCallSite` 與 `splitByInnerClassName` 統一成同一條位置規則（兩者刪除；既有測試 `classfields.js` 等作為守門，預期零差異）。
- **once-loop 的迴圈變數**：`for…in`／`for…of` 頭完成的迴圈變數定義與左側的讀取每次迭代發生，不屬任何段，留在 N 副本（`segmentOfVarDef` 對它們回傳 null；data-model §1、§4）。
- 段節點的 GEN 為原節點 GEN 中歸到該段的 VarDef 在攤平圖的對應（`flatVarDefOf`；摘要圖用原 VarDef）；KILL 仍由求解器依 GEN 計算。

**Rationale**：一條位置規則同時解出 P1／P12（引數中的 `x = 1` 在段 0，被呼叫端看得到）、P5（`x = f()` 的定義在段 1）、P28（`x += f()` 的讀取在段 0）、P31（`m` 的引數在 `new F()` 之後）。

**Alternatives considered**：沿用「GEN 全搬到最後一個 CALL RETURN」再特例處理引數——無法處理多呼叫點與 `x += f()`。

## R4. 決策節點的 p-use（FR-003）

**Decision**：段節點上被歸為 p-use 的讀取（條件模式中引數以外的讀取，及 for-in/of 頭依現行規則成為 p-use 者）若段節點本身不是決策節點，記入 `deferredPuse`，
並帶 `puseOwners`（決策節點在攤平圖的副本；`switch` 為該 switch 所有有 test 的 `case` 副本；for-in/of 為迴圈節點副本）。`findDUPairs` 對 `deferredPuse` 的每個到達定義，
於每個 owner 產生 `Pair(owner, owner.true)`／`Pair(owner, owner.false)` 的 p-use pair——讀到的是段節點的 ReachIn（該讀取求值當下的定義），標記形式不變（`L6>L7:T`）。
c-use 照常記在段節點上（標記為 N 的行號）。同一 owner、同一定義、同一分支只產生一筆（去重）。

**Rationale**：P9（`if (x < f())`）要 `x: L1 -> L6>L7:T`：讀在呼叫之前，但仍是決策節點的 p-use；P21／US1-4 要 `f: entry -> L6>L7:T`（callee 在段 0 讀）。
把 p-use 的「讀取時刻」與「歸屬的分支」分開，是唯一同時滿足 FR-002 與 FR-003 的做法。

**Alternatives considered**：把段 0 的讀取都留在決策節點——P9 會讀到 callee 的定義（現行錯誤）。把 p-use 改成 c-use——違反 FR-003。

## R5. 只求值一次：switch 判別式（Clarifications Q2 A'）與 for-in/of 右側（FR-004）

**Decision**：
- 判別式（未拆分）含呼叫點時，在上層模型把判別式的求值從各 `case` 節點移到插在第一個 `case` 之前的 CALL／CALL RETURN 段鏈（R1 第三列）；第一個 `case` 的所有前驅都改指向段 0
  （進入 switch 的路徑都要先求判別式）。各 `case` 副本設 `discriminantSplit`（只在副本上；原節點不動），不再讀判別式。判別式中的讀取依 R4 以每個有 test 的 `case` 為 owner：
  **每個 `case` 各記一筆 p-use，讀到的定義是判別式求值當下（該讀取所在段的 ReachIn）的定義**；判別式中的呼叫只在第一個 `case` 之前發生一次。沒有任何有 test 的 `case`（只有 `default`）時，p-use 讀取沒有 owner，與 develop「不讀」一致；引數中的 c-use 照記。
- for-in/of 右側（未拆分）含呼叫點時同樣前插段鏈，但只把**迴圈外**的前驅改指向段 0（迴圈本體的回邊仍直接回到迴圈節點），判定沿用 `branchsplitter.isInsideLoopBody` 的規則：
  在 `modelbuilder` 建呼叫邊時以 intra-procedural 原圖算出「進入迴圈的前驅原節點」集合存在邊上；`replayCall` 把攤平圖中「來源（副本、或其 call-site 原節點為該集合成員的 CALL／CALL RETURN）屬於該集合」的邊改指向段 0。迴圈節點副本設 `loopRightSplit`。
- **與已拆分判別式先例的關係——並存，不統一**：
  - 先例（`switch (a && b)`，lib/dujs/usedexpressions.js:61-63）由 branchsplitter 在 intra-procedural CFG 就產生真正的拆分節點（決策 `a` 的 p-use 記在拆分決策節點上，值葉 `b` 為 c-use），三種模型一致，**只記一次**；
  - 007 的判別式（未拆分、含呼叫點）只在上層模型處理，**每個 `case` 各記一筆**，intra-procedural 模型照舊由各 `case` 讀判別式（無呼叫時讀到的定義與求值當下相同，因為 `case` 節點之間沒有定義）。
  - 統一成「只記一次」會違反 Q2 A' 並改變 intra-procedural 的 pair（FR-006）；統一成「每個 case 各一筆」要改 branchsplitter 的先例，也會改 intra-procedural 的 pair（FR-006）。兩者並存不衝突：
    判別式被拆分且葉節點含呼叫（`switch (a && f())`）時，葉節點是一般的值節點，依 R1 第一列拆段（c-use 記在段節點上），`case` 不讀判別式，仍是先例的「只記一次」。
  - 列入 golden-diff／mdn-diff 類別 `求值順序`（子標 `判別式`）：判別式含呼叫點的 switch，其 `case` 的 p-use pair 的定義端可能改變、`case` 本體的 pair 因呼叫只發生一次而改變；先例的 switch 應零差異（守門）。
- **例外目標**：`case` 節點沒有 exception 邊，判別式段鏈需要「switch 所在處的例外目標」。在 `lib/esgraph/index.js` 的 `SwitchStatement` 處理中把 `getExceptionTarget()` 記到第一個 `case` 的 FlowNode 屬性
  `discriminantThrowTarget`（只記屬性、不連邊，intra-procedural 圖與 pair 不變；LGPL 檔頭補 Modified 行）。`FlowNode.copyNodes` 複製此屬性（指向原節點，攤平圖以 `copyOf` 取副本）。

**Rationale**：FR-004 與 Q2 A'；P24（`f` 不因每個 `case` 重新呼叫）、P32（`x` 在呼叫之前讀）、P15b（`f` 只在進入迴圈前呼叫一次）。

**Alternatives considered**：判別式段鏈直接接在 `case` 1 上、其餘 `case` 照舊讀判別式——後面的 `case` 會讀到 callee 之後的定義且判別式被讀多次，違反 Q2 A'。
for-in/of 以攤平圖的可達性判斷迴圈內外——攤平圖不複製被呼叫端，經被呼叫端的不可實現路徑會讓迴圈內的節點看似「迴圈外可達」，判斷錯誤。

## R6. 拋錯判定（FR-005；Clarifications Q3）

**Decision**：`callsplit` 內的 `segmentThrows(plan, j)`，**不遞迴、按段歸屬**：每個 AST 節點依 R2 的後序位置歸到一段（呼叫運算式本身歸到它「進入」的那一段，即段尾；已返回的呼叫不在後面的段）；
段 j 可能拋錯 ⇔ 歸到段 j 的 AST 節點中有任一個的**自身型別**屬於 `throwTypes`（AssignmentExpression、BinaryExpression、CallExpression、MemberExpression、NewExpression、UnaryExpression），
或段 j 是 `ThrowStatement` 的最後一段（必定拋出）。無法解析的外層呼叫（`console.log(f())`）只是段 k 中的 CallExpression，判定為可能拋錯。

- `throwTypes` 的內容與 esgraph 一致，以常數陣列放在 `callsplit.js`（附註「與 lib/esgraph/index.js 的 throwTypes 相同」，單元測試比對兩者相等——esgraph 新增 `module.exports.throwTypes` 匯出，只加匯出、不改行為）。
- **介面**：`planOf(node, scopeTree).throws` 為長度 k+1 的布林陣列；`replayCall` 依它連 exception 邊：段 0 一律可能拋錯（以呼叫結尾）；段 j≥1 為 CALL RETURN 時，`throws[j]` 為真才連到 N 的例外目標；
  決策節點副本（段 k）在 `throws[k]` 為假時**移除**其 exception 邊（develop 的 P35 `x: L3 -> L11` 因此消失，golden-diff 子類 `決策返回不拋錯`）；前插的 CALL 節點（段 0）新增 exception 邊。
- N 的例外目標 ＝ 原節點的 exception 目標，原節點沒有時用 `discriminantThrowTarget`（R5）；兩者皆無（沒有例外目標的節點）則不連。
- CallSiteRecord 的 `exceptionalReturn` 改為「N 的例外目標在攤平圖的副本」，不再讀「第一個 call-site 副本的 exception 邊」（決策節點副本的例外邊可能已被移除）。

**為何不能直接重用 `expressionThrows`**（lib/esgraph/index.js:287-305）：
1. 它遞迴整棵子樹：`var y = f()` 的最後一段沒有會拋錯的運算，但子樹含 `CallExpression`，會被判為拋錯（P30 要求不拋錯）；`if (f())` 同理（P35）。
2. 它不知道段：同一棵子樹的節點分屬不同段（`f().p` 的 `f()` 在段 0、`.p` 在段 1），以子樹為單位無法分段。
3. 它是 `ControlFlowGraph` 內的閉包，不匯出；且 esgraph 是 LGPL 衍生檔，把 dujs 的分段語意寫進去會擴大衍生範圍。
4. intra-procedural 模型的 exception 邊仍由 esgraph 的遞迴判定決定（FR-006 不變）；新判定只用於上層模型的段。

**Rationale**：FR-005 的規則與例子逐條對應（返回後可能拋錯：`f() + 1`、`f()[0]`、`!f()`、`if (!f())`、`f().p`、`x = f()`、`f() > x`、`h(f())` 中 `f` 返回後到呼叫 `h` 那段；
不拋錯：`f();`、`var y = f();`、`if (f())`、`return f();`、`f() ? a : b`（拆分後決策節點只剩 `f()`）、`[f()]`；`throw f();` 返回後必定拋出）。

**Alternatives considered**：沿用 005 Q-a「呼叫敘述只在呼叫之前拋錯」並推廣到所有節點——P20（`f().p`）、P29（`x = f()`）、P34（`f() > x`）會漏掉返回後的例外。

## R7. `new F().m()` 拆成兩個呼叫點（Clarifications Q1、US2-12）

**Decision**：`callresolver` 新增 `calleeScopesOfExpression(node, expression, scopeTree)`（單一呼叫運算式的被呼叫端）。後序走訪先遇到內層 `new F()`（NewExpression，自己解析為 `calleeScopesOfNew`：欄位初始化式＋constructor 或函式 F），
再遇到外層 `.m(…)`；`calleeScopesOfMethodCall` 的 `object.type === 'NewExpression'` 分支（lib/dujs/callresolver.js:427-434）改為只回傳 `[method]`（仍需解析 `F` 以找到 class 的 instance method；F 為函式時回傳 `[]`）。
`modelbuilder` 中「同一節點的被呼叫端依序串接」（lib/dujs/modelbuilder.js:435-452）改為「依 SegmentPlan 的呼叫點逐一串接，每個呼叫點內的被呼叫端照舊串接」。

**Rationale**：`new F().m(x = 1)` 的求值順序是 `new F()`（含欄位初始化式＋constructor）→ 求 `m` → 求引數 `x = 1` → 呼叫 `m`；兩個呼叫點之間的段 1 帶 `x = 1`，得到 `x: L1 -> L4`、`x: L10 -> L7`（P31）。

**Alternatives considered**：保留單一呼叫點、只把引數定義插在 constructor 與 `m` 之間——等於特例化 R3 的位置規則，且 `calleeScopesOf` 的「`new A().m()` 一次回傳全部」語意仍無法表示兩次 call。

## R8. intra-procedural 模型與摘要圖（FR-006）

**Decision**：分段只發生在 `expansion.replayCall`（攤平圖與 `expandShallow` 摘要圖共用）及其使用的 SegmentPlan；esgraph 只新增不連邊的屬性（R5）與 `throwTypes` 匯出（R6）。
intra-procedural 模型的節點、邊、GEN、USE、pair 不變。驗證：(1) 每個探測程式的 `intra(page)` 輸出與 `probes/baseline-develop.txt` 逐字相同（單元測試）；(2) golden 的 `intra-procedurals/*` 檔只允許 `共通` 類（cfgId 重新編號）差異。
摘要（005）透過同一個 `replayCall` 取得分段後的摘要圖，因此摘要與攤平圖的規則一致；`reachingsolver.js` 不需改程式（exception 邊從 CALL RETURN 出發、CALL RETURN 帶 GEN／USE 都是求解器已泛用處理的情形），以單元測試確認。
**`summary.js` 需修改**：`summaryGraphOf`（lib/dujs/summary.js:160-162）的讀取集合只取 `findUSESet` 的 `cuse`／`puse`；段節點上歸屬決策節點的讀取在 `deferredPuse`（R4），不併入的話，被呼叫端中 `if (x < f())` 的 `x` 會漏出 `upwardExposed`
（此欄位輸出到 `*.matching.json` 的 `summaries`，也影響呼叫端經摘要的到達）。改為三者合併（去重），單元測試擴充 `tests/dujs/summary.js`（被呼叫端含 `if (x < f())`，斷言 `x` ∈ `upwardExposed`）。

## R9. 輸出：標記與配對資訊（FR-007）

**Decision**：
- 不新增節點／邊型別（R1）；`*.matching.json` 格式不變（`dujs-matching/1`，不加欄位）：一個節點的多個呼叫點各有自己的 record（`seq` 遞增＝求值順序），`callSiteLine` 為 N 的行號；
  `beforeDecision` 對「前插 CALL 節點」的三種情形（決策節點、switch 判別式、for-in/of 右側）都為 `true`。既有的配對驗證（每條 return 邊恰對應一個 record）對新呼叫點同樣成立，以 `tests/dujs/matching.js` 擴充斷言。
- **標記（Q1 → A，使用者裁決 DECISION 005）**：FR-007 要求「拆分產生的節點以原節點的行號標記」。現行 CLI 的 `.graph.dot`／`.dupairs.dot` 中 CALL 節點標為 `call`、CALL RETURN 標為 `callReturn`（同名再加 `_a`、`_b`…），
  只有分支拆分後的 CALL RETURN 才標 `callReturn (6:T)`（KI §15）；段節點帶讀取後，`.dupairs.dot` 會出現 `(x,callReturn_c)` 這類看不出行號的 use 端。決定：CALL 與 CALL RETURN 一律標 `call (<行>[:<路徑>])`、`callReturn (<行>[:<路徑>])`
  （`cfggraphconverter.labelWithLineNumber` 一處修改）。不選 B（不改標記）的理由：依 FR-007 原文，007 新連結的 `var y = g();` 的 use 端會由 `6` 變成 `call_x`，CLI 反而退步。
  golden 影響：55 個 `.graph.dot` 中 14 個、55 個 `.dupairs.dot` 中 12 個，共 117 個標記。diffcheck 以基準側 `*.matching.json` 的 `callNode`／`callReturn` → `callSiteLine` 把 develop 的標記換成帶行號的形式後再比對（**不**把兩側正規化成同一個無行號記號，以免 call 節點上的 pair 變動躲進 `標記` 類；contracts/diff-check.md §1）。
- README（FR-007、FR-010）：補「段」的說明（含呼叫的節點如何對應到 CALL、CALL RETURN 與決策節點，c-use 可出現在 CALL RETURN 上、p-use 仍記在決策節點）、`beforeDecision` 的新涵義、標記規則；
  「Limits」中「Only call statements are connected…」改為「運算式中的呼叫也是呼叫點」並列出仍不是呼叫點的形式。

## R10. golden-diff 與 mdn-diff（FR-008、FR-009、SC-003、SC-004）

**Decision**：新工具 `specs/007-split-call-nodes/tools/diffcheck.js`（不屬 lib，不進 `npm test`；自我測試 `diffcheck.test.js`），以 `require` 重用 005／006 diffcheck 的匯出（`.dot` 解析、
`parseGraph`、`parseHierarchy`、`--report` 骨架、`--verify` 讀機器區塊、`exitcodes.json`），替換：

1. **基準**：golden 固定 `edc22d5`，寫在 `golden-diff.md`／`mdn-diff.md` 檔頭「基準：」行（工具未給 `--base` 時讀此行；Clarifications Q5）；日後 rebase 到新 develop 時明確改該行並整表重產。
   MDN 基準快照 `specs/007-split-call-nodes/mdn/baseline-develop/`，Setup 於任何 lib 變更前產生（工作樹 lib＝`edc22d5`，先以 `git diff --quiet edc22d5 -- lib` 確認）；語料讀 `specs/006-eslint-scope/mdn/corpus`（33 檔，`pages.json`）。
2. **去重比對**：pair 單位以每個 (case, 頁, 檔案／層級, 變數) 的**集合**比對（005／006 為 multiset）；另產「重複列數」表：每個 `.dupairs.dot` 在 develop 與 007 各有幾列重複（同變數同標記出現 >1 次的超出筆數），
   只列出、不設門檻（KI §43、SC-004）；`--verify` 只核對表格與實測一致。
3. **類別**（contracts/diff-check.md §2 有機械觸發條件）：`連結`（FR-001）、`求值順序`（FR-002／FR-004；子標 `判別式`、`可迭代`）、`返回後例外`（FR-005；子標 `決策返回不拋錯`＝US4-6 型：
   基準側攤平圖該決策節點有 exception 出邊、007 側沒有，use 在其例外目標之後的 − pair）、KI 既有限制（`§37`、`§38`、`§41`、`§43`…，需註明節次）、`標記`（R9，Q1 A；以基準側 matching 換成帶行號的標記後仍只差標記者）、`共通`（cfgId 重新編號等純結構）。
   新增或消失的 pair 只能歸前三類或 KI 類；歸不進即失敗（記為新已知問題後再以 KI 類記錄）。
4. **釘選與簽核**：`連結`、`求值順序`、`返回後例外`、KI 類的每頁筆數釘選；「說明」欄必填；implementer 只填「草擬，待簽核」，使用者在 golden 收尾後簽核 golden-diff、MDN 驗證後簽核 mdn-diff。
   簽核後才更新 `tests/golden/expected*` 與 `manifest.json`（同一 commit）。
5. 紀錄檔另依慣例保留各階段敘述、雜湊變化表、「單元測試期望」表（每一處改動既有測試的期望）。

**Rationale**：Clarifications Q5 與 FR-008／FR-009 的要求；去重避免 §43 的重複列（新增呼叫點會讓它更常出現）淹沒真正的差異。

**Alternatives considered**：直接用 005 diffcheck——它是 multiset 比對、類別為 005 的（§18、finally…），基準為 `9e324be`，不合本 feature。

## R11. 效能（SC-005）

**Decision**：以 `node specs/006-eslint-scope/tools/perf.js .`（同機 3 輪中位數）量 golden＋MDN 的總分析時間，develop 基準於 Setup 量測，門檻 2.0 倍，記入 `perf.md`。
SegmentPlan 每個原節點計算一次（WeakMap 快取，以原節點為鍵）；後序走訪與節點大小成正比。新增的呼叫邊讓攤平圖變大，但被呼叫端不複製（005 D4），預期增幅小。

## R12. 文件更新（FR-010）

**Decision**：`docs/known-issues.md`：
- 開頭 feature 摘要段落加入 007（修正 §16、§22 (3)，新增 §44 起的章節）。
- §16、§22 (3)：標為「Fixed by `007-split-call-nodes`」，原描述保留，前加修正說明（含 P1、P3 的修正後 pair）。
- §10：「`return g();` is still not connected」一句後加註「已由 007 修正（`d: L1 -> L3`）」。
- §36：補充「被呼叫端正常返回後不再拋錯」只適用呼叫敘述（返回後沒有會拋錯的運算）；運算式中的呼叫依 FR-005 按段判定（例：`var y = f().p;`、`x = f();`），並註明決策節點 `if (f())` 返回後不再拋錯是 007 的行為變更。
- 新增 §44「`case` test 的讀取與呼叫不建模」：`case` test 中的讀取與一般呼叫（`case x:`、`case g():`）在 develop 也不建模，維持不變、留給之後的 feature；
  但**含 class static 成員的 case test 是相對 develop 的行為變更**（Q3 A）：develop 的 `case class { static y = g(); }:` 會把 static scope 連進模型（`modelbuilder.expressionsEvaluatedAtNode` 的 `SwitchCase` 分支取 `ast.test`），007 不再連結（R13 L2）。
  §44 須分開記這兩種情形（前者是既有限制、後者是行為變更），不可概括為「dujs 從不讀 case test」。
- 新增 §45「007 的行為變更」：分段的語意與標記（R1、R9）、switch／for-in/of 只求值一次與已拆分先例並存（R5）、決策節點返回後不拋錯（R6）。
- 新增 §46「不列為呼叫點的位置」：for-in/of 左側（FR-001 的明文例外，Q2 A；L1）、單一節點內的條件求值位置（L5）、同一節點先定義的 callee／receiver（防護，L3）。
- 新增 §47「判別式拆分節點的例外邊」（L4）。
- 新增 §48「`switch` 沒有 `case` 時判別式含呼叫會拋錯」（既有 bug，L6）。
README 依 R9 更新。

## R13. 限制與行為變更（記入 known-issues，不在本 feature 處理）

| # | 項目 | 理由 | 依據 | KI | 測試 |
|---|------|------|------|----|------|
| L1 | `for…in`／`for…of` 左側（成員目標的物件、解構預設值）中的呼叫不是呼叫點（FR-001 的明文例外） | 左側在每次迭代「取得下一個值之後」（true 分支上）求值，要在迴圈節點的 true 邊上再插段鏈；develop 也不連結，golden／MDN 0 例 | Q2 A（DECISION 005） | §46 | characterization：`for (o[g()] of a) …`、`for (var [z = g()] of a) …` 不連結 `g`，pair 與 develop 相同 |
| L2 | `case` test 中 class 的 static 成員不再連結——**相對 develop 的行為變更**（develop 經 `expressionsEvaluatedAtNode` 的 `SwitchCase` 分支取 `ast.test` 而連結） | 與「case test 不建模」一致；golden／MDN 0 例 | Q3 A（DECISION 005） | §44 | characterization：`case class { static y = g(); }:` 不連結 `g`（標明與 develop 不同） |
| L3 | callee 解析讀節點開始時的 ReachIn：同一節點內先定義再呼叫（`var o = new A(), r = o.m();`、`var f = h; f = g, f();`）**不連結（有防護）** | 沿用 004 FR-018 的解析、不擴充（FR-001）；防護避免錯連到舊定義（R2 步驟 3）。`(f = g)()` 的 callee 不是識別字，本來就無法解析 | — | §46 | `var f = h; f = g, f();` 不連結 `h`、`g`；`var o = new A(), r = o.m();` 只連 `new A()`；`f(f = g)` 照常連結（定義在 callee 讀取之後） |
| L4 | 判別式的拆分節點（`switch (a && f())`）在 develop 沒有 exception 邊（第一個 `case` 沒有例外目標可繼承）；007 由 `branchsplitter` 把第一個 `case` 的 `discriminantThrowTarget` 屬性複製到判別式的拆分節點（只屬性、不連邊），含呼叫者的段依 R6 連例外邊；不含呼叫者沿用 develop（沒有 exception 邊） | 不改 intra-procedural 的邊（FR-006） | — | §47 | 先例並存守門（contracts/acceptance.md） |
| L5 | 單一節點內的條件求值位置不拆分、其中的呼叫不是呼叫點：`c?.m(f())`、`c?.[f()]`、`var [z = f()] = c`、`var {z = f()} = c` | 單一節點無法表示「可能不執行」；列為呼叫點會把 `f()` 當成必定執行，callee 的定義錯殺可實現的 pair；與 develop 一致（不連結），golden／MDN 0 例 | 本 plan（使用者必修 2） | §46 | characterization：四例各一，`f` 不連結、pair 與 develop 相同 |
| L6 | `switch (f()) {}`（沒有 `case`）在 develop 拋 `Cannot read properties of undefined` | 既有 bug；「判別式記在第一個 `case`」的規則不涵蓋它 | — | §48 | 守門：007 不得更糟（develop 拋錯則 007 不新增其他失敗模式；若 007 能完成分析，更新 KI 與測試） |
