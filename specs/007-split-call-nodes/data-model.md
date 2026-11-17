# Data Model：節點分段（feature 007）

**Feature**: `007-split-call-nodes` | 設計理由見 [research.md](./research.md)（R<n>）。本文件只列結構與不變式；API 見 [contracts/lib-api.md](./contracts/lib-api.md)。

## 1. SegmentPlan（`lib/dujs/callsplit.js`，R2、R3、R6）

每個 intra-procedural 原節點（`FlowNode`，非 entry／exit）一份，`planOf(node, scopeTree)` 計算後以 WeakMap（鍵＝原節點）快取，凍結。
**暫時項（US1–US2，DECISION 006 Q2）**：`planOf(node, scopeTree, predicate)` 可帶第三個參數，篩掉的呼叫點不進 `callSites`，`segmentCount`、`segmentOf`、`segmentOfVarDef`、`throws` 都依留下的呼叫點重算（被篩掉的呼叫運算式視同一般運算）；沒給 predicate 時列出全部呼叫點。快取依 predicate 分開（同一原節點、不同 predicate 各一份 plan）。機制與移除時點見 plan「階段性的呼叫點篩選」與 contracts/lib-api.md §1。

| 欄位 | 型別 | 說明 |
|------|------|------|
| `node` | FlowNode | 原節點 N |
| `shape` | `'statement'`／`'decision'`／`'once-switch'`／`'once-loop'` | R1 的三種形狀（`once-*` 為只求值一次） |
| `expressions` | Array<AST> | 求值的運算式（`evaluatedExpressionsOf`，R2 步驟 1），依序；`CatchClause` 節點為 `[param]`（見 §5 末「catch 參數」） |
| `order` | Map<AST, number> | 後序位置（0 起）；只含 `expressions` 子樹中被求值的節點（不含巢狀函式／class body 內部） |
| `callSites` | Array<CallSiteEntry> | 依後序位置排序；長度 k ≥ 0；不含 §5「不列為呼叫點」的位置 |
| `segmentCount` | number | k + 1；k = 0 表示不拆分（plan 仍存在，供查詢） |
| `segmentOf(ast)` | function → number | 後序位置在 `ast` 之前的呼叫點個數；`ast` 為呼叫點本身時回傳它「進入」的段（＝其索引） |
| `segmentOfVarDef(vardef)` | function → number／null | 依原節點的 `generatedAt`（§3）找完成定義的 AST，再 `segmentOf`；class 名稱特例歸到其 static 呼叫點的段；`once-loop` 的迴圈變數定義（for-in/of 頭）回傳 null（不屬任何段，留在 N 副本，§4） |
| `throws` | Array<boolean> | 長度 k+1；R6 的不遞迴按段判定；`throws[j]`（j < k）恆為 true |
| `throwTarget` | FlowNode／null | N 的例外目標（原圖）：`N.exception`，否則 `N.discriminantThrowTarget`，否則 null |
| `owners` | Array<FlowNode> | p-use 的歸屬節點（原圖）：`decision` 為 `[N]`；`once-switch` 為該 switch 所有有 test 的 `case`；`once-loop` 為 `[N]`；`statement` 為 `[]` |
| `enteringPrev` | Array<FlowNode>／null | 只用於 `once-loop`：N 在原圖中位於迴圈本體外的前驅（`branchsplitter.isInsideLoopBody` 的規則） |

**CallSiteEntry**：`{index, expression, kind, callees, position}`

| 欄位 | 說明 |
|------|------|
| `index` | 0 起，依求值順序 |
| `expression` | `CallExpression`／`NewExpression`，或有 static 成員的 `ClassDeclaration`／`ClassExpression` |
| `kind` | `'call'`／`'new'`／`'class-static'` |
| `callees` | Array<Scope>，非空；一個呼叫點內依執行順序（欄位初始化式→constructor；static 成員依原始碼順序） |
| `position` | `order.get(expression)` |

**不變式**：
- `callSites` 非空 ⇔ N 在上層模型拆分；`callSites[i].position` 嚴格遞增。
- `segmentOf` 對 `expressions` 中每個被讀的 Identifier 與 `generatedAt` 的每個 AST 都有定義（`once-loop` 的左側與迴圈變數定義不在 `expressions` 內，不屬段）。
- 只有 `ThrowStatement` 的 N，`throws[k]` 為 true；否則 `throws[k]` ⇔ 段 k 有自身型別屬 `throwTypes` 的 AST 節點。
- 判別式已拆分（`discriminantSplit`）的 `case`、右側已拆分（`loopRightSplit`）的迴圈節點不會是 `once-*`（求值的運算式不含判別式／右側）。

## 2. 呼叫邊（`hierarchy.addCallEdge` 的 frozen Edge，新增欄位）

| 欄位 | 現行 | 007 |
|------|------|-----|
| `callSite` | N 或前一條邊的 CALL RETURN 模板 | 不變 |
| `order` | 同一節點中的第幾個被呼叫端 | 不變（跨呼叫點連續編號） |
| `beforeDecision` | `isCallBeforeDecision(callSite)` | 改為 `plan.shape !== 'statement'`（第一條邊；串接者 false） |
| `callNode` | 前插的 CALL 模板 | 不變（`beforeDecision` 時建立） |
| `keepGenerateAtCallSite` | class 宣告的 static 成員 | **刪除**（由 `segmentOfVarDef` 的 class 名稱特例取代，R3） |
| `plan` | — | **新增**：N 的 SegmentPlan |
| `callIndex` | — | **新增**：此邊屬於 `plan.callSites[callIndex]` |
| `lastOfCallSite` | — | **新增**：此邊是該呼叫點的最後一個被呼叫端（其 CALL RETURN 帶段 `callIndex + 1`） |

## 3. FlowNode 新增屬性（`lib/esgraph/flownode.js`）

| 屬性 | 誰設 | 說明 | `copyNodes` |
|------|------|------|-------------|
| `discriminantThrowTarget` | esgraph（第一個 `case`）、branchsplitter（判別式的拆分節點） | switch 所在處的例外目標（原圖節點）；只屬性，不是邊 | 複製（值仍指原節點，用 `copyOf` 換成副本） |
| `generatedAt` | `defuseanalyzer.findGENSet` | Map<VarDef, AST>：完成每個定義的 AST 節點（R3） | 不複製（只在原節點上查） |
| `segment` | `expansion.replayCall` | 攤平圖／摘要圖的段節點：`{source: 原節點 N, index: j, plan}` | — |
| `puseOwners` | `expansion.replayCall` | 段節點的 p-use 歸屬節點（攤平圖副本）；段節點本身是決策節點時為空 | — |
| `deferredPuse` | `defuseanalyzer.findUSESet` | 段節點上歸屬他人的 p-use 變數集合（與 `cuse`／`puse` 並列） | — |

`loopRightSplit`、`discriminantSplit` 既有旗標在 `once-*` 形狀下設在**副本**上（原節點不動）。

## 4. 段節點的讀取、定義與邊（攤平圖，R1、R3、R4、R6）

以 N 的 SegmentPlan、k = `callSites.length` ≥ 1：

| 段 j | 節點 | GEN | USE | exception 邊 | 其他邊 |
|------|------|-----|-----|--------------|--------|
| 0 | `statement`：N 的副本（型別 CALL）；其他：前插 CALL | `segmentOfVarDef = 0` 的 VarDef | `segmentOf(Identifier) = 0` 的讀取 | 連到 `throwTarget` 副本（`statement` 為 N 原有的邊） | `call` → 第一個被呼叫端 entry |
| 1…k−1 | 呼叫點 j−1 最後一個被呼叫端的 CALL RETURN | `= j` | `= j` | `throws[j]` 為真才連 | `call` → 呼叫點 j 第一個被呼叫端 entry |
| k | `statement`／`once-*`：最後一個 CALL RETURN；`decision`：N 的副本 | `= k` | `= k` | `throws[k]` 為真才連（`decision` 為假時移除 N 副本的 exception 邊） | `statement`：N 的 normal 邊；`once-*`：normal → N 副本；`decision`：N 的 `true`／`false` |

- 同一呼叫點內串接的中間 CALL RETURN：GEN、USE 為空、無 exception 邊。
- p-use：段節點的 p-use 讀取若段節點不是 owner，記入 `deferredPuse`，`findDUPairs` 以 `puseOwners` 每個 owner 的 `true`／`false` 產生 pair（去重）。摘要圖的讀取集合（`summary.summaryGraphOf`）同樣併入 `deferredPuse`（R8）。
- `once-loop`：迴圈變數的定義與左側的讀取（每次迭代發生）留在 N 副本、不屬任何段；段 0…k 只帶右側的讀取與定義。例：`for (var v of f()) { use(v); v = 2; }` 中 `v` 的定義在 N 副本，`use(v)` 讀到的是迴圈頭的定義、不是上一輪的 `v = 2`。
- `once-switch`：沒有任何 `case` 的 `switch (f()) {}` 不形成 plan（沒有第一個 `case`）；develop 對它已拋錯（R13 L6）。
- 前驅：`decision` 與 `once-switch` 把 N 副本的全部前驅改指向段 0；`once-loop` 只改「來源的原節點屬 `enteringPrev`」的前驅（CALL／CALL RETURN 的原節點為其 `segment.source`）。
- CallSiteRecord（005 data-model）：`callNode`＝該邊的呼叫來源（段 0 節點或前一個 CALL RETURN），`callReturn`、`entry`、`exit`、`seq`、`back` 不變；
  `exceptionalReturn`＝`throwTarget` 的副本（null 若無）；`beforeDecision` 依 §2。

## 5. 求值順序規則與呼叫點的範圍（後序，R2）

| 節點 | 順序 |
|------|------|
| CallExpression | callee（MemberExpression：object、computed property）→ arguments 由左至右 → 自身（進入呼叫） |
| NewExpression | callee → arguments → 自身 |
| AssignmentExpression `=`，左側為識別字或成員 | 成員目標的 object／computed property → right → 自身（定義） |
| AssignmentExpression `=`，左側為解構樣式 | right → 樣式（computed key、成員目標、預設值依樣式順序）→ 自身（定義） |
| AssignmentExpression 複合（`+=` 等） | left（含讀取目標）→ right → 自身 |
| VariableDeclarator | init → id（解構樣式的 computed key、預設值依樣式順序）→ 自身（定義） |
| Binary／Unary／Update／Member／Array／Object／Template／Spread | 子節點由左至右 → 自身 |
| ChainExpression | 內部依 Member／Call 規則由左至右（`?.` 之後的部分見下表「不列為呼叫點」） |
| ClassDeclaration／ClassExpression | superClass → computed keys → 自身（static 呼叫點；名稱綁定在 static 之前，R3） |
| 巢狀 Function／Arrow／class body 內部 | 不走訪（屬於自己的 scope） |
| Conditional／Logical | 不應出現（已由 branchsplitter 拆分）；若出現（不可拆分的位置）視為一般運算由左至右，並記錄於單元測試的 characterization |

**不列為呼叫點**（即使 callee 可解析；這些位置中的讀取與定義仍依後序位置歸段）：

| 位置 | 例 | 理由 | 與 develop | KI |
|------|----|------|------------|----|
| 條件求值而未被拆分的位置：`ChainExpression` 中第一個 `optional: true` 節點之後求值的部分 | `c?.m(f())`（`f()` 與 `.m()`）、`c?.[f()]`、`c?.m(class { static y = g(); })` | 單一節點內無法表示「可能不執行」；列為呼叫點會把呼叫當成必定執行，callee 的定義錯殺可實現的 pair | 一般呼叫相同（不連結）；**class static 成員為行為變更（不連結）**（develop 經 `expressionsEvaluatedAtNode` 連結） | §46（R13 L5、L2'） |
| 條件求值而未被拆分的位置：解構樣式內 `AssignmentPattern` 的預設值（參數本身的預設值除外，依 spec Assumptions 視為一定求值；catch 參數的解構預設值同屬此列） | `var [z = f()] = c`、`var {z = f()} = c`、`[z = f()] = c`、`var [z = class { static y = g(); }] = c`、`catch ({a = class { static y = g(); }})` | 同上 | 一般呼叫相同（不連結）；**class static 成員為行為變更（不連結）**（develop 經 `expressionsEvaluatedAtNode` 連結） | §46（R13 L5、L2'） |
| `for…in`／`for…of` 左側 | `for (o[g()] of a)`、`for (var [z = g()] of a)`、`for (o[class { static y = g(); }] of c)` | FR-001 的明文例外（DECISION 005 Q2 A） | 一般呼叫相同（不連結）；**class static 成員為行為變更（不連結）**（develop 的 `expressionsEvaluatedAtNode` 取 `ast.left`） | §46（R13 L1、L2'） |
| 留在 `case` 節點內的 test（未拆分者或拆分後的末端運算元；含 class static 成員；拆出的非末端運算元是一般決策節點、照常建模，class static 仍連結，DECISION 007） | `case g():`、`case class { static y = g(); }:` | Clarifications「case test 不建模」；static 成員為 DECISION 005 Q3 A | 一般呼叫相同；**class static 為行為變更**（develop 連結） | §44（R13 L2） |
| 防護：callee 為識別字、或成員呼叫的 receiver 為識別字，且同一節點中該變數有 `generatedAt` 的後序位置早於此識別字的讀取 | `var f = h; f = g, f();`、`var o = new A(), r = o.m();` 的 `o.m()` | 解析讀節點開始時的 ReachIn，會錯連到舊定義（`f = h` → `h`，develop 沒有此錯誤 pair）；`f(f = g)` 的定義在 callee 讀取之後，不受影響 | 相同（不連結） | §46（R13 L3） |

**class static 成員的行為變更（DECISION 006 Q4 必修 3，比照 DECISION 005 Q3）**：develop 以 `modelbuilder.findStaticMemberScopesOfClassesAtNode` 走訪 `expressionsEvaluatedAtNode(node)`（modelbuilder.js:285-303，含 `SwitchCase` 的 test、for-in/of 的 `left`、`CatchClause` 的 `param`、其他節點的全部 `analyzedExpressions`），
把上表前三列位置中 class 的 static scope 也連進 inter-procedural 模型；007 一律**不連結**，標為相對 develop 的行為變更（KI §44 記 `case` test、§46 記其餘三種位置）。此變更自 US1 的 T025（刪除 `findStaticMemberScopesOfClassesAtNode`）生效；
golden-diff／mdn-diff 以 diffcheck 計數其實例（contracts/diff-check.md §2「class static 行為變更」），有實例時於簽核時列出。

**catch 參數**：`CatchClause` 節點的 `evaluatedExpressionsOf` 為 `[param]`（沒有參數的 `catch {}` 為空）。依程式現況：develop 的 `expressionsEvaluatedAtNode` 對 `CatchClause` 取 `ast.param`（modelbuilder.js:298-299）、
`usedExpressionsOf` 在 catch 節點讀參數的預設值與 computed key（usedexpressions.js:72-78）、`findGENSet` 在 catch 節點定義參數的變數——讀取與定義都在 catch 節點，故 `param` 必須在 `expressions` 內，`segmentOf` 才對這些讀取與定義有定義。
參數中的解構預設值屬上表第二列（不列為呼叫點），computed key 中的呼叫依一般規則是呼叫點。

## 6. 差異紀錄（`golden-diff.md`、`mdn-diff.md`）

沿用 005／006 的機器區塊「淨差異（相對 develop）」「釘選與簽核」，新增「重複列數」表：

| 欄 | 說明 |
|----|------|
| case／頁／檔案 | 同淨差異表 |
| develop 重複列 | 該 `.dupairs.dot` 中同變數同標記出現第 2 次以上的列數總和 |
| 007 重複列 | 同上 |
| 增減 | 007 − develop（只列出，不設門檻） |

類別與觸發見 [contracts/diff-check.md](./contracts/diff-check.md)。
