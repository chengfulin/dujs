# Research：成員賦值不是物件變數的定義、函式中的 `o.m()` 放寬、無法到達的程式碼不產生 pair（feature 008）

**Feature**: `008-property-defs-method-calls` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

基準：`develop` `2035c93`（本 branch 的 `lib/`、`tests/`、`README.md`、`docs/` 與它相同，`git diff --stat 2035c93 HEAD -- lib tests README.md docs` 為空）；
`npm test` **1715 passing**（2026-11-18 實測，約 1 分鐘）。技術選型維持 repo 現況（Node ≥ 24、CommonJS、mocha＋should、eslint、c8、fast-check、espree、eslint-scope、walkes），無未知項、無新依賴。

以下每節依「Decision／Rationale／Alternatives considered」記錄；節號在 plan、data-model、contracts 中以 R<n> 引用。

---

## R0. 現況（develop `2035c93`）：成員目標在 def-use 中的角色

- **定義（GEN）**：`defuseanalyzer.findGENSet`（lib/dujs/defuseanalyzer.js:544-690）
  - `AssignmentExpression`（`=`、複合、邏輯）非解構：`defVarsOf(binding, left.type === 'MemberExpression' ? left.object : left)`（:600）——`o.p = v`、`o[k] = v`、`o.p += v` 定義 `o`；`o.p.q = v`（`left.object` 不是 Identifier）不定義任何變數。
    右側是 `AssignmentExpression`／`UpdateExpression` 且**左側有定義**時才遞迴（:608-611），所以 `o.p = x = 1` 定義 `o`、`x`，而 `o.a.b = x = 1`、`this.p = x = 1` **不定義 `x`**（實測：`o.a.b = x = 1; console.log(x)` 得 `x: L1 -> L3`；既有缺口，見 R1 (d)）。
  - 解構賦值與 `for…in`／`for…of` 左側：`getDefinedVariables`（:72-84）把 `bindingPattern.getTargets` 的 `MemberExpression` 目標換成 `node.object` 再 `defVarsOf`——`[o.p] = a`、`({p: o.p} = …)`、`for (o.p of a)` 定義 `o`。
  - `UpdateExpression`：`defVarsOf(binding, node.argument)`，成員目標不是 Identifier → `o.p++` 不定義 `o`（與 FR-001 一致，免改）。
  - 邏輯賦值 `o.p ||= 1` 由 branchsplitter 拆成決策節點（條件為 `o.p`）與 F 分支節點；F 分支的 AST 是 `astrewriter.branchesOf`（lib/esgraph/astrewriter.js:62-71）合成的 `=` 賦值，**與原節點共用 `left` 物件**。develop 中 F 分支以 `:600` 定義 `o`（`L6:F`）。
- **讀取（USE）**：`findUSESet`（:738-）依 `usedexpressions.usedExpressionsOf` 的項目走訪：
  - `=`：只走 `node.right`（`AssignmentExpression` handler），**不讀成員目標的物件與計算鍵**（P2 L2、L4、L7、L9；P33）。複合與邏輯賦值 `recurse(node.left)` → 讀 `o`、`k`。`UpdateExpression`、`delete o.p`（UnaryExpression）讀 `o`。
  - 解構：只走 `bindingPattern.getEvaluatedExpressions`（預設值與計算鍵），**不讀樣式中成員目標的物件**。
  - 迴圈：`usedexpressions.loopHeadExpressions`（:34-46）只在左側本身是 `MemberExpression` 時推入 `left.object`——`for (o[k] of a)` 不讀 `k`、`for ([o.p] of a)` 不讀 `o`（實測）。
- **呼叫解析**（lib/dujs/callresolver.js）：嚴格規則用節點的 `reachIns`；`definitionsOnThePage`（:225-248）以全頁 intra-procedural 模型的 **GEN** 計數（005 D2、class 放寬）；`classOfInstance`（:342-373）只在 `o` 有到達的定義時解析 `o.m()`，沒有則回傳 null（KI §23）。
  ⇒ 成員賦值的定義同時影響嚴格規則（P1、P29–P31）與頁面唯一定義計數（P32、P9）。
- **摘要**（lib/dujs/summary.js）：`summaryGraphOf` 以 `findGENSet`／`findUSESet` 建摘要圖（:156-162），`mustKill`、`gen` 由 GEN 推得——被呼叫端的 `o.p = 1` 經摘要殺掉呼叫端的 `o`（P12）。
- **儲存定義節點**：`hierarchy.definingLocalStorageNodes`（lib/dujs/hierarchy.js:438-465）**語法判定**——`AssignmentExpression` 且 `left` 是 `MemberExpression`、`left.object` 是 Identifier 且 `definesLocalStorage`（:421-429：`binding.localStorageVar()` 在 `binding.defVarsOf(identifier)` 中）；不看 GEN。
  inter-page 的 save 邊從這些節點連到 domain 節點（expansion.js:739-743），`localStorage` 的 pair 則由這些節點 GEN 中的 `localStorage` 定義經 save／load 邊流到其他頁。
- **分段**（lib/dujs/callsplit.js）：`walkEvaluation` 已為 `=` 與解構樣式中的成員目標編號物件與計算鍵（`visitMemberTarget`，:163-168、:208-209），所以 FR-002 新增的讀取在段節點上有位置；
  防護 `isDefinedBeforeRead`（:410-431）用 `generatedAt`：develop 中 `o.p = 1, o.m()` 的 `o` 被同節點先定義而不列為呼叫點。

---

## R1. FR-001：成員目標不定義任何變數（`localStorage` 例外）

**Decision**：
(a) 在 `lib/dujs/scopebinding.js` 新增 `PageBinding.prototype.isLocalStorageObject(identifier)`：`localStorageVar()` 存在且在 `defVarsOf(identifier)` 中（即現行 `hierarchy.definesLocalStorage` 的判定，D008 的 Var 同一性）；`hierarchy.definesLocalStorage` 改呼叫它（純重構，行為不變），defuseanalyzer 與 usedexpressions 共用同一判定。
(b) **物件變數**＝從成員目標沿 `MemberExpression.object` 一路往左到達的 Identifier（`o.p`、`o.p.q`、`o[i].q` 的 `o`）；途中遇到非 `MemberExpression`（`f(a).p`、`this.p`、`(a || b).p`）則**沒有物件變數**。
   **豁免**（D004、D008）：物件變數存在且 `binding.isLocalStorageObject(物件變數)` 為真時，該成員目標的定義與讀取一律走 develop 的程式路徑（下表「develop 路徑」）。
(c) 非豁免的成員目標不定義任何變數：
   - `findGENSet` 的 `AssignmentExpression`：`left` 是 `MemberExpression` 時，只在豁免時 `defVarsOf(binding, left.object)`（即 develop 的 `:600`，`left.object` 須為 Identifier）；
   - `getDefinedVariables`：`MemberExpression` 目標只在 `node.object` 是 Identifier 且豁免時定義它（解構、`for…in`／`for…of` 左側、F 分支共用）。
(d) **巢狀賦值的遞迴條件維持 develop**：`o.p = x = 1` 仍定義 `x`。`:608` 的條件由「左側有定義」改為「**develop 會定義左側**」——左側是 Identifier 且有 Var，或左側是成員目標且 `left.object` 是 Identifier 且有 Var（不論豁免與否）。
   因此 `o.p = x = 1` 的 `x` 照舊定義，`o.a.b = x = 1`、`this.p = x = 1` 照舊**不**定義 `x`（R0 的既有缺口，記入 KI，不在本 feature 修；**D012 = A** 已裁決）。
   缺口不限成員目標：GEN 只在右側「直接是」賦值／更新時遞迴，`y = (x = 5, 3)`、`y = [x = 6]`、`y = f(x = 7)`、`[y] = x = [8]`、`o.t = [n++]`、`f().p = x = 2`、`o.a.b = x++` 的內層也不定義；現存實例 `tests/golden/fixtures/es2015/app.js:22` 的 `nextId++`。記為 spec FR-011 (g) 的新 KI；回歸測試 `o.p = x = 1`、`o.p = x++` 仍定義 `x`，`o.a.b = x = 1`、`this.p = x = 1` 為 characterization。golden／MDN 影響 0 筆（行為不變）。

**Rationale**：FR-001 的例外以 Var 同一性定義且須與 hierarchy 的儲存定義判定相同（FR-001 原文「與 `lib/dujs/hierarchy.js:421-428` 的儲存定義判定相同」），共用一個 binding 方法最不易分歧。「develop 路徑」直接重用既有分支，s1–s9 的凍結表（「表示法」）逐列對應到既有程式（R5），不需重新推導。
(d) 若改成「成員目標一律遞迴」，`this.p = x = 1`、`o.a.b = x = 1` 會新增 `x` 的定義——是修正，但不在 spec 範圍且無驗收情境（§CP-1）；若改成「只在左側有定義時遞迴」（字面不動），`o.p = x = 1` 會**失去** `x` 的定義（回歸）。

**Alternatives considered**：
- 在 `binding.defVarsOf` 內排除成員目標的物件：`defVarsOf` 也被 hierarchy 的儲存判定與 callsplit 以外的呼叫者使用（`G.p = v` 的讀取 Reference），改它會連帶改 s1 的儲存定義節點，違反 D004。
- 物件變數取「文字上最左側的識別字」（`localStorage.getItem(k).p = v` 的 `localStorage`）：與 hierarchy 的判定（只看 `left.object` 是 Identifier）不一致，且使 FR-002「物件運算式中的 callee 與引數記為讀取」在 `localStorage.getItem(k).p` 失效；採 (b)（**D013 = A** 已裁決；spec「表示法」修訂、US1 情境 16 以 P42 驗收：develop 只有 `console: entry -> L3`、`o: L1 -> L2`，008 後另有 `n: L1 -> L2` 與 L2 對 `localStorage` 的讀取）。

---

## R2. FR-002：成員目標中被求值的部分記為讀取

**Decision**：讀取的新增點（皆排除豁免，R1 (b)）：
1. **`=` 的非解構成員目標**（`findUSESet` 的 `AssignmentExpression` handler）：`node.operator === '='` 且 `left` 是 `MemberExpression` 時先 `recurse(left.object)`，`left.computed` 時再 `recurse(left.property)`，然後 `recurse(node.right)`（求值順序：物件、鍵、右側）。
   `left.object` 走既有的 `MemberExpression`／`CallExpression` handler，所以 `o.p.q` 讀 `o`、`o[i].q` 讀 `o`、`i`、`f(a).p` 讀 `f`、`a`（P33）。複合與邏輯賦值已 `recurse(node.left)`，不變。
2. **解構樣式中的成員目標**（`[o.p] = a`、`({p: o[k]} = …)`）：新增 `bindingPattern.getMemberTargetReads(pattern)` 回傳每個 `MemberExpression` 目標的 `object` 與計算的 `property`（樣式順序）；
   `findUSESet` 的解構分支在 `getEvaluatedExpressions` 之外加走這些運算式（豁免者略過）。
3. **`for…in`／`for…of` 左側**（`usedexpressions.loopHeadExpressions`）：左側本身是成員目標時，除既有的 `left.object` 外，計算鍵加入 `left.property`（豁免者維持 develop：只 `left.object`）；左側是樣式時加入 `getMemberTargetReads(left)`。讀取留在迴圈節點（007 KI §46）。
4. **邏輯賦值的 F 分支不另讀**（US1 情境 8）：合成的 `=` 與原邏輯賦值共用 `left`（R0）。`scopebinding` 在建 binding 時（同 `collectAssignmentTargets` 的走訪）收集頁面上所有**邏輯賦值的 `left` 節點**，提供 `PageBinding.prototype.isLogicalAssignmentTarget(left)`；
   第 1 點遇到 `isLogicalAssignmentTarget(node.left)` 為真時不新增成員目標的讀取（`o` 只在決策節點求值一次，p-use 已由決策節點的條件記錄）。
5. `this.p = v`、`super.p = v`：沒有物件變數；第 1 點照走 `left.object`（`ThisExpression`／`Super` 沒有變數，無讀取），與 develop 結果相同（Edge Cases）。

決策節點中的成員目標（例如 `if (o.p = f())` 的條件）沿 007 FR-003：條件模式中讀取記為 p-use，引數中為 c-use——第 1 點走同一個 walker，不另設規則。

**Rationale**：讀取的位置正是 callsplit 已編號的位置（R0 分段），段節點的 `segment.plan.segmentOf` 對新讀取有定義，不需改 callsplit；第 4 點用 binding 的語法集合判定，不修改 esgraph（LGPL 檔與 astrewriter 都不動）。

**Alternatives considered**：
- 在 `astrewriter.branchesOf` 給合成的 `=` 加標記：可行（astrewriter 為 MIT），但要改 esgraph 目錄與其測試；共用 `left` 的判定已足夠且不改圖的建構。
- 修改 `bindingPattern.getEvaluatedExpressions` 使其包含成員目標的物件：它也被 catch 參數、宣告、迴圈與 callsplit 以外的呼叫者使用（宣告樣式沒有成員目標，但語意名稱是「預設值與計算鍵」），另設函式較清楚。

---

## R3. 與 007 分段、防護的互動

**Decision**：callsplit 不改。驗證點：(1) `=`／解構的成員目標物件與鍵已由 `visitMemberTarget` 編號——段節點上的新讀取依位置歸段（`o[g()] = 2` 的 `o` 在段 0，P27）；
(2) `once-loop` 左側讀取 `segmentOf` 回傳 null（callsplit.js:594-598），留在迴圈節點副本，新加的計算鍵同理；
(3) 防護 `isDefinedBeforeRead` 讀 `generatedAt`：FR-001 後成員目標不再產生定義，`o.p = 1, o.m()` 的 `o.m()` 成為呼叫點（develop 不連結）——歸 golden／MDN 的「外溢」類（contracts/diff-check.md §2），以 characterization 測試釘住。

**Rationale／Alternatives**：分段的歸屬只依 AST 位置，與讀取是否存在無關；改 callsplit 沒有必要。若 implement 時 `segmentOf` 對新讀取拋 `no evaluation position`（R0 預期不會），視為 callsplit 編號漏洞，先補 callsplit 測試再修（列入 plan 已知風險）。

---

## R4. FR-003：所有模型與摘要一致

**Decision**：不改 `summary.js`、`expansion.js`、`reachingsolver.js`、`outputwriter.js`。四層模型與摘要圖都經 `findGENSet`／`findUSESet`（攤平圖的 GEN 由 `expansion.rebuildGenerateSets` 從原節點的 GEN 重建、段的 GEN 由 `generatedAt` 歸段），所以 R1、R2 的改動自動一致。
驗收：P12（被呼叫端的 `o.p = 1` 不再經摘要殺 `o`）、s10（inter-page 與 intra-page，D007）、`tests/dujs/summary.js` 新增「被呼叫端的成員賦值不在 `gen`／`mustKill`，物件變數在 `upwardExposed`」。

**Alternatives considered**：在摘要層另行過濾成員目標——重複判定，與 FR-003「一致適用」相違。

---

## R5. `localStorage` 凍結（D004、D008）：s1–s9 逐行不變

**Decision**：凍結表每列對應到「develop 路徑」：

| 形式 | 定義 | 讀取 | 儲存定義節點 | 008 的程式路徑 |
|------|------|------|------|------|
| s1 `localStorage.k = 2` | `:600` 豁免 → 定義 | `=` 第 1 點豁免 → 不讀 | hierarchy 不變 | R1 (c)、R2-1 豁免 |
| s2 `+=` | 同上 | 既有 `recurse(left)` | 不變 | 不受影響 |
| s3 `||=` | F 分支 `:600` 豁免 → `L2:F` | 決策節點 p-use | 不變 | R2-4 不讀；豁免定義 |
| s4 `localStorage[k] = 2` | 豁免 → 定義 | 不讀 `localStorage`、`k` | 不變 | R2-1 豁免（整個成員目標） |
| s5 `[localStorage.k] = a` | `getDefinedVariables` 豁免 → 定義 | `getMemberTargetReads` 豁免 → 不讀 | 不是（hierarchy 只看非解構） | R1 (c)、R2-2 豁免 |
| s6 `for (localStorage.k in a)` | 豁免 → 定義 | 既有 `left.object` 讀取 | 不是 | R2-3 豁免維持 develop |
| s7 `localStorage.k++` | 不定義（Update） | 讀 | 不是 | 不受影響 |
| s8 `localStorage.a.b = 2` | 不定義（`left.object` 非 Identifier） | 物件變數為 `localStorage` → 豁免 → 不讀 | 不是 | R1 (b) 沿 `.object` 到 `localStorage` |
| s9 `x = (localStorage.k = 1)` | 遞迴（`x` 有定義）→ 內層豁免定義 | 內層 `=` 豁免 → 不讀 | 不是 | R1 (d) |

s11–s14 依 D008 不豁免（被遮蔽、頁面宣告、別名、`window.localStorage`），依一般規則改變；儲存定義節點數不變（hierarchy 判定不變）。
**驗收**：`tests/dujs/propertydefs.js` 以 `probes/pages/` 的複本跑 run-pages 等價的輸出，s1–s9 四行與 `probes/pages/baseline-develop.txt` 逐字比對（US1 情境 6）；s10–s14 依情境 14、15 斷言。

**Alternatives considered**：以「`localStorage` 名稱」判定——D008 已排除（s11–s13）。

---

## R6. FR-001 對呼叫解析的外溢（P29–P32、P1、P9、P30）

**Decision**：callresolver 不需為外溢另改：嚴格規則讀 `reachIns`、D2／class 放寬讀 `definitionsOnThePage`（GEN），兩者在 R1 之後都不含成員賦值。
- P29：`f.p = 1` 不再殺函式宣告 → 嚴格規則連到 `f`；P30：`f.p = function…` 不再是 `f` 的函式定義 → 連到宣告的 `f`（不再連匿名函式）；P31：`A.count = 0` 同理；P32：頁面唯一定義只剩宣告 → D2 連結；P1、P9：`o` 的到達定義只剩 `new A()`。
- golden／MDN 中這類差異歸「外溢」類，判準見 contracts/diff-check.md §2。

---

## R7. FR-004：函式中的 `o.m()` 放寬（`callresolver.classOfInstance`）

**Decision**：`classOfInstance` 在 `reachingDefs.length === 0` 時改呼叫新的私有函式 `relaxedClassOfInstance(node, variable, scopeTree, index)`，條件全部成立才回傳 ClassInfo：
1. `isInFunction(node, scopeTree)`（與 D2 同一函式；頁面程式碼不放寬）；
2. `scopeTree.binding.isRelaxedInstance(variable)`——新增於 scopebinding：binding kind ∈ {`let`, `const`}（`RELAXED_INSTANCE_KINDS`，與 `RELAXED_CALLEE_KINDS` 並列；D002 排除 `var`、參數等）；
3. `definitionsOnThePage(variable, scopeTree)` 恰一筆（與 D2 同一函式；`let o;` 的 undefined 定義、未被呼叫函式中的 `o = null` 都計入——P35、P28）；
4. 該定義的 range 對應 `index.newExpressionsByRange` 的 `new A(…)`，`A` 為 Identifier，且 `resolveVariable(definition.fromNode, A, scopeTree)` 回傳 `classInfo`（含 FR-018 的 class 放寬；函式 `F` 不算——P10）。
`calleeScopesOfMethodCall` 不變（它在 `resolveVariable(o)` 失敗後呼叫 `classOfInstance`）；回傳的方法只取 `instanceMethods`（不含 constructor）。

**Rationale**：與 005 D2 共用 `isInFunction`、`definitionsOnThePage`、binding kind 判定，只把「目標是函式」換成「定義是 `new A()` 且 A 解析為 class」；與既有嚴格分支共用 `newExpressionsByRange` 與 `resolveVariable`，所以 class 的判定與 `o` 有到達定義時完全相同。
FR-005 自動成立：callsplit 的呼叫點列舉經 `calleeScopesOfExpression` → `calleeScopesOfMethodCall`，新的被呼叫端照常分段、建 CallSiteRecord、進摘要與 `*.matching.json`；inter-page 沿用頁面模型的連結。
**驗收**：P5、P8、P9、P34 連結；P6、P7、P10、P11、P26、P28、P35、P36 與 develop 相同；MDN `a05-assessment-main.js` 的三個 `evilBall` 呼叫（US2 情境 8）。

**Alternatives considered**：放寬放在 `resolveVariable`——它回傳 `{scope}`／`{classInfo}` 給 callee 本身，`o` 不是 callee；混在一起會讓 `o()`、`new o()` 也被放寬。

---

## R8. FR-006～FR-008：獨立可到達檢查器

**Decision**：
- **位置**：`tests/helpers/reachability.js`（測試輔助模組，不屬 lib，不進 CLI；與 `tests/helpers/analyze.js` 同層，可被 `tests/dujs/*.js` 與 `specs/008-.../tools/` require）。測試：`tests/dujs/reachability.js`（單元＋陽性對照＋注入）、`tests/dujs/reachabilityinvariant.js`（PRB、golden fixture、MDN 語料全量檢查與允許清單）。
  允許清單：`tests/dujs/cases/reachability-allowlist.json`。理由：FR-007 要求「自動化的不變量檢查（測試）」——放在 `npm test` 內才會隨每次變更執行；放 `specs/008/tools` 則只在手動時執行。
- **獨立性**：只讀模型的圖結構（`model.graph`、各節點的連線欄位與 `type`、`scope`、`astNode`、`line`）、`model.callSiteRecords()`（`callNode`、`callReturn`、`calleeScope`、`entry`、`exit`、`exceptionalReturn`）、`model.loopRecords()`、`model.dupairs` 與 scope 的 AST；
  **不 require** `lib/dujs/reachingsolver.js`、`lib/dujs/summary.js`，不讀節點的 `reachIns`／`reachOuts`、`model` 的分析結果或摘要的 `normalReturn`。以守門測試掃描 `tests/helpers/reachability.js` 原始碼中這些名稱（出現即失敗）。
- **演算法**：worklist 圖可達（BFS），規則 (a)(b)(c) 與起點、例外邊的辨識見 contracts/reachability.md（**M4 定案於此**）。(a) 的「有沒有正常返回」以全部被呼叫端 scope 的最小不動點計算：初值全為否，反覆以目前的值對每個被呼叫端從其 entry 做同一可到達判定，exit 有可到達、且連到 exit 的邊不是例外邊的前驅時為是，直到不變。
- **差分**：`check(model, {finallyRule: true|false})` 兩次；違反＝某 pair 的定義節點、使用節點（p-use 為決策節點與分支目標）任一不可到達。允許清單資格＝全開違反、關掉 (c) 後兩端皆可達。見證＝檢查器輸出的 `{finallyExit: {scope, line}, nonExceptionalEntries: 0}`（取該 pair 不可到達端在全開時的「被停用的 finallyExit 正常出邊」）。
- **D014（`exceptionalReturn`）**：檢查器把 record 的 `exceptionalReturn` 當成從 CALL 出發的例外邊。它不是求解器的結果：`lib/dujs/expansion.js:592-606` 的 `finishCallRecords` 依圖結構設定（鏈的第一個呼叫的段 0 呼叫節點的 `.exception` 目標），求解器只在 `reachingsolver.js:292` 讀它，故與 FR-007 的獨立性相容。實測 1278 筆 record：1230 筆 `callNode.exception === exceptionalReturn`，39 筆呼叫節點本身沒有例外邊（鏈式呼叫的後段、決策前呼叫——圖上沒有從該 CALL 出發的對應邊），9 筆為 null。檢查器斷言每個非 null 的 `exceptionalReturn` 都是圖上某節點的 `.exception` 目標；「呼叫節點無例外邊」形態補單元測試。
- **D015（(a) 分呼叫點）**：比「表示法」(a) 字面（「不經該呼叫的 return 邊」）嚴格——圖上的 return 邊不分呼叫點（攤平圖不為呼叫點複製被呼叫端，005 D4），照圖走會讓任一呼叫使所有 CALL RETURN 可到達。分呼叫點的可達集合是字面可達的子集，故通過即滿足 FR-006。P41（`h(); r(); h(); console.log(x);`）：L10 的 CALL、CALL RETURN 與 L11 皆不可到達，以直接斷言可達集合（或注入）的單元測試釘住。
- **D016（MDN 語料）**：不變量測試直接讀 `specs/006-eslint-scope/mdn/corpus`（33 檔、1218 行；先例 `tests/dujs/splitcallnodes.js:24` 讀 specs 下的 baseline）；缺檔或檔數 ≠ 33 時失敗、不得 skip，並核對 `specs/006-eslint-scope/mdn/README.md` 的 sha256（2026-11-18 以 `shasum -a 256 -c` 實測 33 檔全符）。
- **獨立性的限度**：可走規則（return 邊不走、LoopRecord 虛擬邊、`exceptionalReturn`）與求解器 reached 幾乎同構；獨立性只靠重寫、自算 normalReturn 與 (c)。注入與陽性對照是唯一能證明檢查器會報錯的防線，tasks 不得刪減。
- **陽性對照**：P21、P23、P24（列入允許清單且通過差分判準）；注入：取 P13 的 inter-procedural 模型，以包裝物件（`Object.create(model)` 覆寫 `dupairs`）加入一筆兩端為 L9（無條件遞迴之後）的 DUPair，該 pair 不在允許清單時 `assertInvariant` 必須拋錯（US3 情境 6）。

**Rationale**：pair 只在求解器 reached 的節點產生，若檢查器重用 reached 則檢查恆真（spec「表示法」）；以模型的公開結構與 records 重算可到達，既獨立又不需改 lib。
**Alternatives considered**：放在 `specs/008/tools/`（不進 `npm test`，違反 FR-007 的「測試」）；在 lib 新增可到達 API（產品程式碼擴張；US3 只改 FR-013 的配對條件，R14）。

---

## R9. 008 的差異工具（D006、FR-009、FR-010）

**Decision**：
- `specs/008-property-defs-method-calls/tools/classify.js`：**純模組**（只 require espree、eslint-scope），輸入頁面原始碼與一筆差異 `{sign, variable, def, use, level}`，輸出 `{category, sub, reason}`；判準見 contracts/diff-check.md §2–§3。自我測試 `tools/classify.test.js`（正反例至少 P1、P25、P4、P2 的 4 損失 2 修正、P27、P29–P32、P37）。
- `specs/008-property-defs-method-calls/tools/diffcheck.js`：CLI（`golden|mdn`、`--report`、`--verify`、`--base`），**複製** 007 diffcheck 的 `compareCase`、`buildReport`、`verifyRecord`、`goldenResults`、`mdnResults`、`main` 後修改；`.dot` 解析、`locate`、`exitCodesOf`、`baseOf` 以 `require` 使用 005／006 工具的既有匯出（不修改它們）。
  移除 007 的標記改寫（§1：基準 `2035c93` 與 008 的 CALL 標記同為 `call (<行>)` 形式）；intra-procedural 層級的 pair 差異不再一律失敗（FR-001 本來就改 intra）。自我測試 `tools/diffcheck.test.js`。
- **007 已知限制（T068 (d)）的處理**：007 以「去重名後綴」的集合比對 pair，同一行多個段節點（`call (79)_a`…）上的 pair 增減可能互相遮蔽。FR-002 新增的讀取多半落在成員目標所在行的段 0（物件先求值），正是這種情形（例：`o[g()] = h(o2)` 一行有兩個段節點）。
  008 改為：**某行在兩側 `.graph.dot` 的段標記多重集合相同時，以保留後綴的完整標記比對**；不同時（FR-004／外溢新增呼叫點使後綴位移）才退回去後綴比對，並把該行列入機器區塊「段結構改變行」表（頁、行、兩側段標記數），由使用者在簽核時逐行確認。
- **MDN 基準**：Setup 以 `2035c93` 的 lib 產生 `specs/008-property-defs-method-calls/mdn/baseline-develop/`（同 007 contracts/diff-check.md §4，含 `*.matching.json` 與 `exitcodes.json`）。golden 基準取自 git 的 `2035c93`。
- 工具建立（Setup 的首次 commit）後的任何修改先發 DECISION（D006）。

**Rationale**：損失／修正的語法判準需要原始碼事實（屬性路徑、呼叫位置、同行敘述數），沿用 007 以 espree 讀串接後原始碼的機制；拆成純模組才能以 spec 的正反例直接單元測試。
**Alternatives considered**：直接修改 007 diffcheck（禁止）；以 `require` 包裝 007 的 `compareCase`（其分類與標記改寫寫死在函式內，無法替換，故複製）。

---

## R10. golden 與 MDN 的重產與簽核

**Decision**：沿 005／007：改 golden 的階段（US1、US2）以 `UPDATE_GOLDEN=1` 更新 `tests/golden/expected*` 與 `manifest.json`（同一 commit），並以 `diffcheck golden --report` 重產相對 `2035c93` 的**累積淨差異**、`--verify` 通過後才 commit（orchestrator 親自重跑）。
釘選列的簽核欄 implementer 只填「草擬，待簽核」；使用者在 golden 收尾後、PR 前簽核 `golden-diff.md` 一次，MDN 驗證（Polish）後簽核 `mdn-diff.md` 一次；不同意的列回到對應階段修正後整表重產。
「單元測試期望」表記錄改動既有測試期望的每一處（檔案、測試名、舊期望、新期望、FR）。

---

## R11. 效能（SC-006）

**Decision**：Setup 以 `2035c93` 量測基準（`node specs/006-eslint-scope/tools/perf.js .` 三輪中位數、golden 四個 case 的 CLI 三輪中位數），Polish 以同法量測 008，寫入 `perf.md`；門檻 ≤ 2×。
預期影響：GEN 減少、USE 微增、FR-004 增加少量呼叫邊；不新增全頁走訪（`isLogicalAssignmentTarget` 的集合在既有 `collectAssignmentTargets` 的同一次走訪中收集）。檢查器只在 `npm test` 執行，不計入 SC-006。KI §50 的既有效能問題不在範圍內，若量測受其影響照實記錄。

---

## R12. 文件（FR-011、FR-012、SC-007）

**Decision**：FR-011 (a)–(g) 與 FR-012 各項在 Polish 逐項修改，並在 `specs/008-property-defs-method-calls/docs-check.md` 記「項目、檔案位置、核對結果」表（SC-007）；新的後續 KI（選項 B、巢狀賦值通用缺口 R1 (d)＝FR-011 (g)、`Lnull`）；§22 (5) 另記 FR-013 的修正（R14）與 §38 的三種形態依 FR-011 寫入。README 的 L173、L187 過期敘述以 `grep` 確認不再出現。

---

## R13. 限制與風險（記入 known-issues 或 plan 已知風險）

- **L1**：巢狀賦值缺口（R1 (d)，D012）：`o.a.b = x = 1`、`this.p = x = 1` 等不定義 `x`（develop 既有的通用缺口，008 不修，新 KI FR-011 (g)）。
- **L2**：物件變數以 `.object` 鏈定義（R1 (b)，D013）：`localStorage.getItem(k).p = v` 不豁免、讀 `localStorage`、`k`（凍結表未列此形式；P42）。
- **L3**：檢查器的 (a) 採「呼叫點相依」的返回（D015）：CALL RETURN 只在**同一呼叫的** CALL 可到達且被呼叫端有正常返回時可到達（contracts/reachability.md §2），比圖上直接走 return 邊嚴格；被呼叫端的例外返回（`exceptionalReturn`）視為由 CALL 出發的例外邊（D014，spec「表示法」已補）。
- **L4**：分類工具以名稱比對變數，頁面上同名的多個宣告一律歸「損失」（保守；contracts/diff-check.md §3）。

---

## R14. FR-013：deferred p-use 的死碼 pair（D017；P38–P40）

**現象**（`node specs/008-property-defs-method-calls/probes/run.js`，2026-11-18 實跑，輸出與 `probes/baseline-develop.txt` 逐字相同）：
- P38（`if (f())`，`f` 無條件遞迴）：inter[1] 與 intra-page 為 `f: entry -> L3 | f: entry -> L5>L6:T | f: entry -> L5>L8:F`；intra(page) 另有 `x: L1 -> L8`、`x: L6 -> L8` 等（呼叫不透明，正確）。
- P39（`if (g(f()))`）：inter[1] 與 intra-page 為 `f: entry -> L3 | f: entry -> L8 | g: entry -> L8>L11:F | g: entry -> L8>L9:T`。
- P40（`while (f())`）：同 P38 的形式。
- 決策節點（P38、P40 的 L5，P39 的 L8）與兩個分支目標都在無返回呼叫之後，不可到達；關掉 (c) 仍違反——不是 finallyExit 根因，FR-008 要求修正。P41（無決策節點）在 develop 已無 L10 之後的 pair，為 D015 的守門。

**根因**：007 的 deferred p-use（決策條件中、呼叫之前讀取的變數，記在段節點的 `deferredPuse`，`expansion.js:426` 設 `puseOwners`）在 `defuseanalyzer.findDUPairs` 的第二段（約 L278-293）以**段節點**的 `reachIns` 配對到 owner（決策節點）的 `true`／`false` 分支。段 0 在呼叫之前，可到達且有 reachIns；配對時不看 owner 是否被求解器 reached。owner 在無返回呼叫的 CALL RETURN 之後，求解器不分析它（`reachingsolver.js:306-315` 的 `enqueue`），但 pair 仍由段節點帶出。
`f: entry -> L3`（P38）、`f: entry -> L8`（P39，段 0 讀 `f` 的 c-use）是可到達節點上的 c-use，不受影響。

**Decision**：`findDUPairs` 第二段只在 owner 可到達時配對。可到達的訊號：`doAnalysis`（`defuseanalyzer.js:416-438`）只為求解器 reached 的節點存分析結果（`model.setAnalysisResults`），未 reached 者 `model.analysisResultOf(node) === null`；沒有 calls／loops 的模型 reached 為 null、全部節點都有結果。因此條件為「model 已有分析結果且 `model.analysisResultOf(owner) === null` 時略過該 owner」（model 尚未分析時維持現行行為），**不需修改 `reachingsolver.js`**，也不在節點上另加標記。intra-procedural 模型不拆分呼叫、沒有 deferred p-use，結果不變。`summary.js:164` 把 `deferredPuse` 計入摘要圖的使用（段節點本身的讀取），與 pair 無關，不改。

**原型驗證**（scratchpad 複本，`findDUPairs` 第二段加一行 owner 判定）：
- probes：只有 P38–P40 的 inter[1] 與 intra-page 行改變（各少兩筆 p-use pair），intra(page) 不變，其餘 probes 逐字相同；
- `npm test`：1715 passing（golden 四個 fixture 逐字相同，**golden 0 筆差異**）；
- MDN 33 檔（32 個 id）的 intra-page、inter-procedural、inter-page 全部 pair：develop 與原型逐行相同（**MDN 0 筆差異**）。
- 工作量：lib 一處條件（約 1–3 行）＋ P38–P40 的驗收測試、owner 不可到達的單元測試（含 `while`、巢狀呼叫）；不動 `summary.js`、`reachingsolver.js`、golden。遠小於 US3 其餘工作（檢查器、全量不變量、允許清單）。

**Alternatives considered**：
- 由 reachingsolver 對外回傳 reached 集合或在節點上標記：可行但多一個介面；分析結果的有無已等價，不必擴張。
- 以 owner 的 `reachIns` 是否為空判定：可到達但沒有到達定義的節點也是空集合，不可靠。
- 記為 KI 不修：關掉 (c) 仍違反，FR-008 要求屬本 feature 範圍者修正；成本極低。

