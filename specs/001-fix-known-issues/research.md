# Research: 修正已知問題（#1–#6、#8）

**Feature**: `001-fix-known-issues` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

本文件解決 plan Technical Context 與 spec 中「細節於 plan 決定」的事項。每項以「Decision／Rationale／
Alternatives considered」記錄。程式碼位置以 2026-11-16 的 `001-fix-known-issues` 分支為準。

## 現況盤點（探查結果）

| 項目 | 現況 | 位置 |
|------|------|------|
| CFG 節點粒度 | 一個敘述一個 `FlowNode`；`FlowNode.astNode` 為敘述（`ExpressionStatement` 改指其 expression；if／while／for 的條件節點 `astNode` 為條件運算式本身） | `lib/esgraph/index.js` |
| GEN／USE | `findGENSet`、`findUSESet` 以 walkes 走訪 `cfgNode.astNode`；p-use 只在決策節點的 `BinaryExpression`／`UnaryExpression`／`CallExpression` callee／`ConditionalExpression` test 中產生 | `lib/dujs/defuseanalyzer.js` |
| 單一識別字條件（G-1） | `Identifier` handler 有 `cfgNode.astNode.type !== 'Identifier'` 防護，根節點即識別字時完全不記 use | 同上 |
| KI §6 根因 | `ConditionalExpression` handler 在非決策節點也設 `isPUse = true`，`findDUPairs` 以 `node.true`／`node.false`（null）建 pair | 同上 |
| 呼叫點 | 只有 `astNode.type === 'CallExpression'`（即呼叫敘述 `f();`）才會連結；README Limits 已註明 `x = f()`、`return f()` 不連結 | `lib/dujs/modelbuilder.js` `getInterProceduralModelStartFromTheScope` |
| 函式 CFG | 由 `scope.ast.body` 建；箭頭函式運算式本體以合成 `ReturnStatement`（`dujsBodyStatement`）包裝 — 本 feature 沿用此「合成 AST」手法 | `lib/dujs/modelbuilder.js` `getArrowFunctionBodyStatement` |
| 參數 | 全部在 entry 以 undefined def 定義（`analyzeDefaultValueOfLocalVariables`） | `lib/dujs/defuseanalyzer.js` |
| scope 名稱 | `parent.name + '.' + _name`，name map 以全名為 key，同名後者覆蓋前者（KI §8） | `lib/dujs/scope.js`、`lib/dujs/scopetree.js` |
| class 成員 | `ClassBody` 一律略過；方法為 `FunctionExpression` 故有 scope；欄位、static block 沒有 | `scopetree.js`、`variableanalyzer.js`、`defuseanalyzer.js` |
| dot 輸出 | `toDotWithLabelLine`：一般節點標 `''+line`，同標記者加 `a`、`b`… 後綴；def-use 表以 `FlowNode.toString()`（即 label） | `lib/dujs/cfggraphconverter.js`、`lib/dujs/graphics.js` |
| walkes | 未知 `type` 走 `checkProps`；無子節點的自訂型別可安全走訪 | `node_modules/walkes/index.js` |
| 測試 | `npm test` 528 passing；`tests/dujs/*.js` 自動納入；esgraph 上游 fixture `tests/esgraph/tests/maythrow.js` 含 `1 && call();` | — |

## R1. 拆分後「葉節點」的表示法（D12／FR-008 核心）

**Decision**：採「**合成 AST + FlowNode 分支中繼資料**」：

1. **葉節點**：`astNode` 指向一棵**路徑複製（path-copy）的合成 AST**——從原敘述根到被替換的條件／短路
   運算式之間的節點淺層複製，其餘子樹**與原 AST 共用**（同一物件）。被替換處換成所選分支的運算元；
   已在決策節點求值過的部分（條件之前的前段、短路的左運算元值）換成**佔位節點**
   `{type: 'DujsEvaluatedValue', known: <truthy|falsy|nonnull|unknown>, range, loc}`。
2. **決策節點**：`astNode` 指向條件（`?:` 的 test、短路與邏輯指派的左運算元；可能已被前一層替換成
   佔位節點），與既有 if 條件節點同構；另以 `FlowNode.preEvaluated`（AST 陣列）記錄「條件之前已求值、
   留在決策節點」的前段運算式（如 `x = y + (c ? a : b)` 的 `y`）。
3. 所有拆出節點帶 `FlowNode.branchPath`（`''` 表示敘述的第一個決策、`'T'`、`'TF'`…）與
   `FlowNode.splitOrigin`（原敘述的 AST），供 D13 標記、dot 標記與性質測試使用。

**Rationale**：

- 下游（`findGENSet`、`findUSESet`、呼叫點偵測、事件 handler 偵測、localStorage 偵測、dot 標記）全部只
  走訪 `astNode`；合成 AST 讓它們**不需理解替換對照**即得到正確的 def／use／呼叫點，改動集中在一個新模組。
- 共用子樹保證「函式／class 運算式只有一個 scope」：scope 以 range 查找（`getScopeByRange`），葉中的
  函式運算式是同一個 AST 物件、同一個 range（FR-008、Clarification 2026-11-16）。
- 佔位節點沒有子節點、不是 `Identifier`，walkes 走訪不產生 use，自然滿足「左運算元不重讀」。
- 決策節點沿用「`astNode` = 條件運算式」的既有形態，p-use 判定與等效 `if (test)` 完全相同（D12 的
  「等效 if/else」），不另立規則。
- 合成節點的 `range`／`loc` 取自原敘述（`loc`）與被取代的原節點（`range`），`L<行>` 即原敘述所在行
  （D13），`setScopeOfGraphNodes` 以 range 找 block scope 仍正確。

**Alternatives considered**：

- **只在 FlowNode 上記錄替換對照（view），astNode 維持原敘述**：每個走訪器（defuseanalyzer 3 個、
  modelbuilder 3 個、esgraph `expressionThrows`、dot）都要包一層「依對照略過／替換」的 walker，改動面大、
  易漏；否決。
- **把拆分做成 AST 前處理（改寫成真的 if/else 再交給 esgraph）**：需引入暫存變數或複製敘述到新 AST，
  違反「不引入暫存變數」，且原敘述的行號、range、呼叫點識別都會漂移；否決。
- **決策節點的 astNode 用合成 `SequenceExpression [prefix…, test]`**：p-use／c-use 需以「最後一項」
  區分，屬隱式規則；改用顯式 `preEvaluated` 欄位。

## R2. 拆分演算法（求值順序、巢狀、並列、空分支）

**Decision**：新模組 `lib/esgraph/branchsplitter.js`（dujs 原創，MIT）在 `lib/esgraph/index.js` 連好
既有邊、`ExpressionStatement` 改指 expression 之後、DFS 排序與 cfgId 指派之前，對每個一般節點執行：

1. 依 JS **求值順序**走訪節點運算式（不進入函式本體與 `ClassBody`；class 的 `extends` 與 computed key
   會被求值，納入），找出**第一個決策點**：遇到可拆運算子 S（`?:`、`&&`、`||`、`??`、`&&=`、`||=`、
   `??=`；可選鏈不算）時先遞迴找 S 的條件內是否還有可拆者，最內層、最先求值者即第一個決策。
2. 建決策節點 D（`astNode` = S 的條件、`preEvaluated` = 求值順序上先於條件且已完整求值的兄弟／祖先運算元）。
3. 對 T／F 兩個分支各產生替換後的敘述：S 換成所選運算元（`?:` 的 consequent／alternate、短路的右運算元、
   邏輯指派的 `left = right` 單純指派）或帶已知真值的佔位節點（`&&` 的 F → `falsy`、`||` 的 T →
   `truthy`、`??` 的 T → `nonnull`、邏輯指派的不賦值分支同理）；前段換成 `unknown` 佔位。
4. 對替換後的敘述**遞迴**（路徑加 `T`／`F`）：仍有可拆者則再拆（得到並列條件的乘積與巢狀決策）；
   沒有則成為葉。
5. **空分支**：替換後若在「敘述語境」（運算式敘述、值被丟棄）中只剩佔位節點，或在「條件語境」中佔位節點
   的已知真值可直接決定結果，**不建節點**，該分支直接接到後繼（Clarification 2026-11-16）。**例外**：
   `return`／`throw` 的葉（如 `return a || b` 的 T 葉 `return <truthy>`）即使沒有 use／def 也一律建節點，
   因其為控制轉移（spec D15）。
6. 原節點 N 的入邊改接到 D；N 從圖中移除（不留匯合節點）。for-in／for-of 右側例外：迴圈節點 N 保留，只把
   「迴圈外進入 N」的入邊改接到 D（R3）。

**模組介面**：`branchsplitter.split(allNodes, { expressionThrows: fn })`，由 `lib/esgraph/index.js`（LGPL）
呼叫並傳入其 `expressionThrows` 作為 callback；`branchsplitter.js` 只呼叫該 callback，不含任何 LGPL 程式碼。

求值順序細節：

- 指派目標不是運算元：`x = c ? a : b`、`o.p = …` 的目標在葉中保留，def 在葉（目標成員運算式的 object
  現行不算 use，維持）。
- 複合指派 `x += c ? a : b`：目標的讀取在 RHS 之前，屬前段（決策節點的 c-use）；葉以 `x = <ph> + a`
  的單純指派表示，避免葉重讀 `x`。
- `var p = 1, a = c ? 1 : 2, b = 3;`：`p = 1` 的 declarator 屬前段（其 def 在決策節點，GEN 走訪
  `preEvaluated`），之後的 declarator 隨葉複製。
- 連鎖指派、呼叫參數、陣列／物件字面值、樣板字串依 ECMAScript 求值順序（左到右）。

**Rationale**：此即 D12 的等效 if/else 轉換（尾端複製）以 CPS 方式實作：一個遞迴函式同時處理巢狀、
並列（乘積）、短路的左運算元不重讀、前段不重讀；在 esgraph 內執行可沿用其 DFS 排序與 cfgId 指派，
golden 中未受影響的節點順序不變。

**Alternatives considered**：在 `lib/dujs/cfgbuilder.js`（esgraph 之後）做——需重做 DFS 排序與
cfgId 指派、與 `lib/esgraph/index.js` 的邏輯重複；否決。把演算法直接寫進 `lib/esgraph/index.js`——
LGPL 檔案擴大、修改紀錄冗長；改以獨立 MIT 模組，index.js 只加一個呼叫點並於檔頭記錄。

## R3. 各語境的出口接線

**Decision**：

| 原節點 N 的語境 | 葉的形態 | 葉／最後一層決策的出邊 |
|------------------|----------|------------------------|
| 敘述語境（運算式敘述、宣告、指派、`return`、`throw`、for 的 init／update、參數初始化） | 合成敘述（剩餘運算＋def） | 複製 N 的 normal 出邊；`return` 葉接 exit、`throw` 葉接 N 既有的例外目標；`return`／`throw` 葉即使無 use／def 也建節點（D15） |
| 條件語境（if／while／do-while／for 的 test） | 決策節點（測試葉運算元） | 複製 N 的 true／false 出邊；不複製本體 |
| switch 判斷式 | 求值葉運算元的節點 | 接到第一個 case 比對節點；case 節點不再讀判斷式 |
| case 測試式（`case c ? 1 : 2:`） | 決策節點（以葉運算元與判斷式比對） | 複製 case 節點的 true（進入本體）／false（下一個 case 比對）出邊；不複製本體 |
| for-in／for-of 的右側 | 求值葉運算元的節點（葉運算元只剩佔位節點時不建節點，決策直接接迴圈節點） | 只攔截**迴圈外**進入迴圈節點的邊（迴圈本體回邊不經過決策），葉接迴圈節點；迴圈節點不再讀右側：branchsplitter 在迴圈節點設 `loopRightSplit = true`，`defuseanalyzer` 的 `useLoopHead` 遇此旗標略過 `right` |
| `with` 物件（`with (c ? o1 : o2)`） | 求值葉運算元的節點（c-use） | 複製 with 節點的 normal 出邊（進入本體）；with 節點本身被取代 |
| 被 label 標記的敘述（含巢狀 label `a: b: for (…)`） | `LabeledStatement` 本身沒有節點，依被標記敘述的語境處理 | label 解析（`break l`／`continue l` 的目標）在拆分前完成；拆分只把原節點的入邊改接到決策，故跳到被拆節點（如 for 更新式）的 `continue` 邊自動改接到其決策 |
| 含 `extends` 的 class 宣告（`class A extends (c ? B : C) {}`） | 合成宣告（`superClass` 換成葉運算元，`ClassBody` 與原 AST 共用） | 同敘述語境；`ClassBody` 只有一份 scope；每個葉都是 static 成員串接（R5）的起點 |

- 例外邊：每個拆出節點各自以 `expressionThrows(自己的 analyzedExpressions)` 判斷是否接例外目標；例外目標
  取**原節點 N 既有的 EXCEPTION 出邊**（不重新計算 try／catch 目標）。`expressionThrows` 由 index.js 以
  `split(allNodes, { expressionThrows })` 傳入（R2 模組介面）。
- `??` 位於條件語境（`if (a ?? b)`）時，T 分支的值（`a`，非 null）真假未知：建一個不讀任何變數的決策節點
  `L<n>:T`（等效 `if (a != null) { if (<a 的值>) … }`，依 Clarification 不重讀 `a`）；`||`／`&&` 的已知真值
  分支則直接接 N 的 true／false 目標（spec US5 情境 4）。

**Rationale**：spec D12、D15、Clarifications 2026-11-16 的語境規則。for-in／for-of 右側見 spec US5 情境 16 與
Edge Cases（ES2015 golden fixture `for (const { id } of saved ?? [])` 亦屬此語境），右側只在進入迴圈前求值
一次，故只攔截入口邊。

**Alternatives considered**：for-of 右側沿用「迴圈節點每次迭代都讀右側」的現狀並把決策放在迴圈節點內——
會讓決策在每次迭代重跑，與語意不符；否決。

## R4. 預設參數初始化節點（FR-005、D4、D10、D11）

**Decision**：在 `modelbuilder` 取函式 CFG 輸入時，若有任何參數帶預設值，改用**合成 `BlockStatement`**
（快取於函式 AST 的不可列舉屬性 `dujsBodyWithParamInits`）：依參數出現順序，對每個帶預設值的名稱（含參數
解構中巢狀的 `AssignmentPattern`）放一個合成 `ExpressionStatement(AssignmentExpression '=' 名稱 = 預設值)`，
`loc`／`range` 取該 `AssignmentPattern`；其後接原本體敘述（箭頭函式運算式本體接合成 `ReturnStatement`）。
初始化敘述是一般敘述，故 FR-008 的拆分自動適用（D10）。

**Rationale**：沿用 `getArrowFunctionBodyStatement` 既有手法；GEN／USE 不需新規則（單純指派 `=` 只讀右側、
定義左側參數），參數仍由 `addParameter` 在 entry 有 undefined def，初始化節點 kill 之，因此
`b: entry -> L3` 消失、`a: entry -> L2` 出現（US2 情境 3、4）。

**Alternatives considered**：把 use 歸屬 entry（KI §2 原議）——spec D4 已否決；在 esgraph 內插節點——
esgraph 不知道參數，否決。

**限制**：初始化節點無條件定義（不模擬「僅在 undefined 時」；呼叫端有傳值時 entry 上的 def 視為被覆寫，可能
漏報，spec Assumptions、README Limits 註明）；參數解構的 computed key 不在範圍內（現況不記 use，維持）。一行內
同時有參數預設值與本體敘述時標記碰撞，屬 spec「表示法」所列已知限制（驗收程式參數預設值與本體分行）。

## R5. class 欄位初始化式與 static block 的 scope（FR-006、D5、D7）

**Decision**：

- `ScopeTree.buildScopeTree` 走訪 `ClassBody` 時，對每個 `PropertyDefinition`（有 value 者）與
  `StaticBlock` 建立一個**合成 `FunctionExpression`**（無參數；欄位本體為 `[ExpressionStatement(value)]`，
  static block 本體為其 `body`；`range`／`loc` 取成員），快取於成員 AST 的不可列舉屬性 `dujsScopeFunction`，
  以既有 `AnonymousFunctionScope` 建 scope（命名 `$ANONYMOUS_FUN_<n>`，符合 spec Assumptions「沿用匿名函式
  scope 的命名方式」）。欄位值本身就是函式／箭頭時仍建欄位 scope，原函式 scope 成為其子 scope。
- 其餘流程（variableanalyzer、modelbuilder、defuseanalyzer）因為 `scope.ast` 是 `FunctionExpression`
  而**不需改動**即可分析。
- **static 成員接入**：class 宣告節點（或含 `ClassExpression` 的敘述節點）視為這些 static scope 的呼叫點，
  依原始碼順序**串接**：節點 CALL → S1.entry，S1.exit RETURN → 回返節點 1，回返節點 1 CALL → S2.entry…
  最後的回返節點接原後繼。以 `modelbuilder` 的既有 `connectCallerCalleeScopeRelatedModelsAtCallSite`
  實作（回傳新的 callReturn 節點作為下一個呼叫點）。實例欄位 scope 不接入。

**Rationale**：最小改動、重用既有 inter-procedural 連結機制，intra-page 模型因此含 `v: L1 -> L5`（US3 情境 2）。

**Alternatives considered**：新增 `FIELD_INITIALIZER_TYPE`／`STATIC_BLOCK_TYPE` scope 型別——需在
`Scope.isValidName`、graphics 標題、variableanalyzer、modelbuilder 各加分支，且 spec 只要求命名沿用匿名函式
方式；否決。把 static 本體直接展開進外層 CFG——違反 D5「各自成為一個 scope」；否決。

**影響**：新 scope 使其後匿名函式的序號後移。既有 ES5／ES2015 golden fixtures 沒有 class 欄位與 static
block，序號不變（SC-004）。

## R6. labeled／with／debugger（FR-001～003、D2）

**Decision**（`lib/esgraph/index.js`）：

- `LabeledStatement`：`getEntry` 回傳 `getEntry(body)`；連線 walker 直接遞迴 body；`getSuccessor` 走預設
  （父為 labeled 時取 labeled 的後繼）。
- `getJumpTarget` 支援 `label`：沿 `cfg.parent` 往上找 `label.name` 相同的 `LabeledStatement`；`break l`
  → `getSuccessor(labeled)`；`continue l` → labeled 的 body 迴圈的 continue 目標（既有 switch 分派）。
- `WithStatement`：自己一個節點（求值物件），`connect(getEntry(body))`、`mayThrow`；去除 `.cfg` 的 walker
  將其 `astNode` 改指 `node.object`（同 `ExpressionStatement` 的做法），避免 USE 走訪到本體；並設
  `FlowNode.isWithObject = true`。
- **with 物件記 c-use（例外）**：`astNode` 根為識別字（`with (o)`）時，defuseanalyzer 的根識別字防護會漏掉
  `o`；`isWithObject` 為 true 的節點不受該防護，物件運算式一律以 c-use 走訪（spec US1 情境 5 的 `o: L1 -> L2`）。
  `a;` 這類運算式敘述不設旗標，維持現狀。
- `DebuggerStatement`：`connectNext`。
- 移除檔頭 `TODO: labeled break/continue`、`TODO: WithStatement`；檔頭修改紀錄加一行。

**Rationale**：KI §1 的 TypeError 來自 `getEntry` 對 `LabeledStatement` 回傳未連線的節點；上述為最小修正。

## R7. 其他小修（FR-004、FR-007、FR-009、FR-011）

- **FR-004**：`findUSESet` 的 `NewExpression` 改為 `recurse(callee)` 並 `arguments.forEach(recurse)`
  （`SpreadElement` 走預設 checkProps 即遞迴其 argument）。
- **FR-007**：刪除 `AssignmentExpression` handler 中 `node.right.type === 'AssignmentExpression'` 時的
  `recurse(node.right.left)`，以及 `VariableDeclarator` 中同型的 `recurse(node.init.left)`；內層由
  `recurse(node.right)` 依其運算子決定是否讀目標（複合／邏輯指派會讀）。
- **FR-009**：`Identifier` handler 的根節點防護改為：**依每個 `analyzedExpressions` 根各自判斷**——`astNode`
  根即識別字時，決策節點記 p-use、拆分產生的葉記 c-use、`isWithObject` 節點記 c-use（R6）；其餘非拆分、非決策
  的單一識別字運算式敘述（`a;`）維持現狀（不在本輪 FR 範圍）。`preEvaluated` 的每個根**一律以 c-use 語境走訪、
  不受防護影響**（`x = y + (c ? a : b)` 的前段 `y` 根即識別字，若誤套防護會漏記 spec US5 情境 8 的 `y: L1 -> L2`）。
- **FR-011**：`ScopeTree.buildScopeTree` 結束後做一次命名後處理：同一個父 scope 的子 scope 依原始碼順序，
  第一個保留原名，其後取最小的 `k ≥ 1` 使 `name_k` 不在「該父 scope 所有子 scope 的原名」與「已指派名」中；
  `Scope` 新增 `_name` 的內部 setter；重建 `_mapFromNameToScope`。匿名與 block scope 名稱本就唯一，不受影響。
- **KI §6 根因**：`ConditionalExpression` handler 的 `isPUse = true` 只在 `cfgNode` 為決策節點時設定；
  拆分後非決策節點不會再含 `?:`，此修正作為防禦。
- **呼叫回返節點**：`connectCallerCalleeScopeRelatedModelsAtCallSite` 複製 `line`／`col` 時一併複製
  `branchPath`，使葉呼叫點的回返節點標記一致。

## R8. 共用的「節點運算式」存取點

**Decision**：在 `lib/dujs/defuseanalyzer.js` 與 `lib/dujs/modelbuilder.js` 中，凡走訪 `cfgNode.astNode` 求
def／use 的地方，改走訪 `[…cfgNode.preEvaluated（c-use 語境）, cfgNode.astNode]`；提供 `FlowNode` 的唯讀
屬性 `analyzedExpressions` 統一取得，避免各處自行拼接。

**Rationale**：前段可能含 def（`x = (y = 1) + (c ? a : b)`）、use 與 localStorage 寫入，必須在同一節點被看見。

## R9. 測試輔助工具記法（FR-014、D9、D13）

**Decision**（`tests/helpers/analyze.js`）：

- `nodeLabel(node)`：`entry`／`exit` 不變；一般節點 `'L' + line + (branchPath ? ':' + branchPath : '')`。
- p-use：`<決策標記>><目標標記>`；目標 `branchPath` 非空時不加分支碼，否則加 `:T`／`:F`（以
  `dupair.second.second === first.true` 判定）。決策的 true、false 目標為同一節點（如 `if (a) {}`）時無法
  由 Pair 區分，兩種字串都輸出。
- 新增 `pUseTargetsExist(model)`／內建檢查：任一 p-use 的決策節點缺 true 或 false 目標即拋錯（FR-010，
  現況行為保留並以明確訊息呈現）。
- 檔頭註解改寫記法說明，並註明已知限制：同一行有多個節點來源時標記可能碰撞、p-use 省略記法可能有歧義，
  不加序號、不拋錯（spec「表示法」）；既有 p-use 期望字串 4 處 9 筆（`tests/dujs/es2015.js`）依新記法更新。

## R10. dot／golden 輸出

**Decision**：

- `labelWithLineNumber`：一般節點 label 改為 `''+line + (branchPath ? ':' + branchPath : '')`；既有的同
  label 加 `a`、`b` 後綴機制保留（用於碰撞）。`labelWithLoc` 同樣附加 `:<path>`。無拆分的節點 label 不變，
  符合 SC-004。
- `lib/esgraph/dot.js`（未設 label 時取 source 片段）：合成節點的 `range` 取被替換的原節點，故切出的片段
  就是該部分原始碼，**不需修改**。
- 輸出檔格式（檔名、dot 結構、def-use 表欄位）不變（spec Assumptions）。
- Golden 更新流程：`UPDATE_GOLDEN=1 npm test` 後逐檔 `git diff`，每一處差異記入稽核工作檔
  `specs/001-fix-known-issues/golden-diff.md`（對應到 FR），最後由 T053 彙整進 PR 說明（FR-013、SC-004）。預期變更：ES5 fixtures 無（已 grep 確認無 `?:`／`&&`／`||`、`new`、連鎖指派、
  單一識別字條件、labeled／`with`／`debugger`；`switch (m)` 的判斷式不可拆，case 讀判斷式的行為不變）；ES2015 fixture 因 L11（`||` 於箭頭運算式本體，
  FR-008）、L16（`new` 參數，FR-004）、L18（預設參數，FR-005）、L29（`??` 於 for-of 右側，FR-008）改變；
  esgraph 上游 fixture `maythrow.js` 的 `1 && call();` 因 FR-008 改變。

## R11. 性質測試（fast-check）

**Decision**：devDependency `fast-check@^4.10.2`（engines `node >=12.17`，相容 Node 24），以
`fc.assert(fc.property(...))` 寫在 mocha `it` 中，檔案 `tests/dujs/branchsplit.property.js`（被既有
`tests/dujs/*.js` glob 納入 `npm test`，不需改 script）。

- **產生器**：以 `fc.letrec` 產生小型運算式樹（識別字池 `a`…`e`、數字字面值、`?:`、`&&`、`||`、`??`、
  `+`、單參數呼叫 `g(x)`），深度上限 4；包進敘述模板（`var x = E;`、`x = E;`、`x ||= E;`、`if (E) {…}`、
  `while (E) {…}`、`switch (E) {…}`、函式中的 `return E;`、帶預設值參數 `function k(p = E)`），一行一個敘述
  （避開 spec「表示法」所列的標記碰撞限制）。
- **性質**（皆以 CFG／def-use 結果驗證，不比對固定字串）：
  - P1（FR-010、SC-003）：每筆 p-use 的決策節點同時有 true 與 false 目標，且目標在模型圖中。
  - P2（D12 每葉自有 def、無匯合 def）：敘述語境中定義 `x` 的敘述，從其第一個決策出發的每條路徑**至多**經過
    一個定義 `x` 的拆出節點，且經過 0 個的情況只出現在邏輯指派的空分支（`x ||= E` 的 T 等）；定義 `x` 的節點
    都不是決策節點；不存在 `branchPath` 為空而定義 `x` 的匯合節點（有拆分時）。
  - P3（不重讀）：同一敘述的每條路徑上，原始碼中每個識別字出現處至多產生一次 use。
  - P4（分支內 use）：只出現在 `?:` 某一分支運算元內的識別字，其 use 只出現在路徑經過該分支的節點。
  - P5（標記）：同一敘述拆出節點的 `branchPath` 兩兩不同，且每個非空路徑的前綴節點存在。
  - P6（空分支）：拆出節點不存在「沒有 use、沒有 def、沒有呼叫且不是決策」而又位於敘述語境的節點；**例外**：
    `return`／`throw` 的葉（spec D15）。
- `numRuns` 預設 100，可由環境變數 `FC_NUM_RUNS` 覆寫；`seed` 預設固定值（每次執行結果可重現），可由環境變數
  `FC_SEED` 覆寫（§CP-3 不寫死可調參數）；失敗時印出所用 seed 與縮小後的反例，以 `FC_SEED=<seed>` 重現。

**Rationale**：使用者選型；tech-standards §測試工具表建議 PBT 與 ISP 互補。

**Alternatives considered**：以 Jest／Vitest 執行 fast-check——偏離既有 mocha 堆疊，見 plan「偏離
tech-standards」；本輪不導入 Stryker（使用者決定）。

## R12. spec 與既有限制衝突（2026-11-16 使用者裁決：方案 A）

US5 情境 10（`var x = log(c ? a : b);` 的兩個葉「各自連到同一個 `log` scope」）與 README Limits「只有呼叫
敘述 `f();` 會連結為呼叫點，`x = f()` 不會」衝突：葉 `x = log(a)` 的 `astNode` 是宣告，不是
`CallExpression`，依現行規則不會被連結。可行方案：

| 方案 | 內容 | 影響 |
|------|------|------|
| A（建議） | 修 spec 情境 10 為呼叫敘述 `log(c ? a : b);`（葉為 `log(a)`／`log(b)`，現行規則即連結），`var x = …` 形式另以情境驗證 `a`、`b`、`x` 的 pair | 不擴大範圍；仍驗證「呼叫點隨葉複製、連到同一 scope」 |
| B | 擴充呼叫點偵測：指派右側、宣告初始值、`return` 的頂層呼叫也連結（全面，非僅葉） | 解除部分 README 限制；ES5／ES2015 golden 可能因非本 spec FR 的原因改變，需新增 FR 並修改 SC-004 |
| C | 僅拆出的葉特例連結 | 同一寫法拆與不拆行為不一致；不建議 |

**已裁決（2026-11-16）：方案 A**。spec 情境 10 已改為呼叫敘述 `log(c ? a : b);`，`var x = …` 形式另列情境 10b
只驗 pair；呼叫點偵測規則不變（tasks T033）。
