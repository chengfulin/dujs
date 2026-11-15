---

description: "Task list for 修正已知問題（#1–#6、#8）"
---

# Tasks: 修正已知問題（#1–#6、#8）

**Input**: Design documents from `specs/001-fix-known-issues/`

**Prerequisites**: plan.md、spec.md、research.md（R1–R12）、data-model.md、contracts/（analyze-helper-notation.md、cli-and-output.md）、quickstart.md

**Tests**: 需要。plan／憲章 §CP-4 要求每個驗收情境一個自動化測試（mocha＋should，`it` 標題註明 `US<n>-<情境號>`），
FR-010／D12 不變量以 fast-check 性質測試（`tests/dujs/branchsplit.property.js`）。各 story 先寫測試並確認失敗，再實作。

**Organization**: 依 user story 分 phase；每個 story 可獨立實作與驗證（跨 story 相依見文末）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行（不同檔案、不依賴未完成任務）
- **[Story]**: 所屬 user story（US1–US6）
- 路徑皆相對於專案根 `/Users/chengfulin/Documents/Personal/dujs`

## 共通約定（適用所有任務）

- **LGPL 衍生檔**（`lib/esgraph/index.js`、`lib/esgraph/dot.js`、`tests/esgraph/test.js`、`tests/esgraph/tests/*.js`）：
  任何修改 MUST 留下帶日期的修改紀錄：有檔頭者在檔頭「Modified by」段加一行 `2026-11-xx: <說明>`；fixture
  （`tests/esgraph/tests/*.js`，無檔頭）記在其目錄的 `tests/esgraph/tests/README.md`；並在 `THIRD_PARTY_NOTICES.md`
  §1 esgraph 段記錄；新增的 `lib/esgraph/branchsplitter.js` 為 dujs 原創 MIT，檔頭標 MIT、不得複製 LGPL 程式碼。
- **Golden 差異（FR-013、SC-004）**：凡執行 `UPDATE_GOLDEN=1 npm test` 的任務，MUST 以 `git diff tests/golden tests/esgraph/tests`
  逐處檢視，並把「檔案／差異位置 → FR 編號」追加到 `specs/001-fix-known-issues/golden-diff.md`（本輪新增的稽核
  工作檔，供 PR 說明引用）；出現無法對應 FR 的差異時停止並回報，不得直接接受。
- **記法（FR-014）**：測試期望字串一律依 `contracts/analyze-helper-notation.md`；驗收程式一行一個節點來源（同一行
  不放多個敘述或多個拆分來源，參數預設值與本體分行；spec「表示法」已知限制）。
- **性質測試（fast-check）**：`seed` 預設固定值、可由 `FC_SEED` 覆寫，`numRuns` 預設 100、可由 `FC_NUM_RUNS` 覆寫；
  失敗時印出 seed 與縮小後的反例（research R11）。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 引入性質測試依賴並確認基線

- [X] T001 新增 devDependency `fast-check@^4.10.2`（`npm install -D fast-check@^4.10.2`），更新 `package.json` 與 `package-lock.json`；不改 `scripts.test`（`tests/dujs/*.js` glob 已涵蓋新測試檔）
- [X] T002 執行基線 `npm test`（預期 528 passing）與 `npm run lint`，確認改動前全綠；若不符先回報（依 `package.json` scripts）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: FlowNode 新欄位、走訪入口統一、測試輔助工具記法——所有 story 的測試與實作都依賴

**⚠️ CRITICAL**: 本 phase 完成前不得開始任何 user story

- [X] T003 [P] 在 `tests/esgraph/flownodetest.js` 新增 FlowNode 新欄位的單元測試：`preEvaluated` 預設 `[]`、`branchPath` 預設 `''`、`splitOrigin` 預設 `null`、`isWithObject` 與 `loopRightSplit` 預設 `false`、`analyzedExpressions` 為唯讀且等於 `preEvaluated.concat([astNode])`（data-model §1）
- [X] T004 在 `lib/esgraph/flownode.js`（MIT）新增 `preEvaluated`、`branchPath`、`splitOrigin`、`isWithObject`、`loopRightSplit` 欄位與唯讀 getter `analyzedExpressions`（data-model §1、research R8），補 JSDoc；使 T003 通過
- [X] T005 在 `lib/dujs/defuseanalyzer.js` 把所有走訪 `cfgNode.astNode` 求 GEN／USE 之處改走訪 `cfgNode.analyzedExpressions`（`preEvaluated` 以 c-use 語境走訪，research R8）；本任務 MUST NOT 改變任何輸出（`preEvaluated` 尚恆為空）
- [X] T006 [P] 在 `lib/dujs/modelbuilder.js` 把事件 handler、localStorage 偵測等走訪 `astNode` 的地方改走訪 `analyzedExpressions`；呼叫點判定（`astNode.type === 'CallExpression'`）維持不變（R12 方案 A）；MUST NOT 改變任何輸出
- [X] T007 [P] 新增 `tests/dujs/analyzehelper.js`：驗證記法規則——目標不帶路徑時加 `:T`／`:F`（如 `var a = 1;`／`if (a > 0) {`／`  a = 2;`／`}`／`console.log(a);` 得 `a: L1 -> L2>L3:T` 與 `a: L1 -> L2>L5:F`）；true／false 目標同一節點時兩筆皆輸出（規則 4）；以手建的 stub model（決策節點缺 `false`）驗證拋出含變數名與節點標記的 `Error`（規則 6、FR-010）；以手建 FlowNode 設 `branchPath` 驗證 `L<行>:<路徑>` 與目標帶路徑時省略分支碼（規則 2、3）；檔頭註明 helper 的已知限制（同一行多個節點來源時標記碰撞、p-use 省略記法可能歧義；不加序號、不拋錯，故本檔與各驗收測試的程式一行一個節點來源）
- [X] T008 改寫 `tests/helpers/analyze.js`（FR-014、research R9）：`nodeLabel` 加 `:<branchPath>`；p-use 依 `dupair.second.second === first.true` 決定 `:T`／`:F`，目標帶路徑時省略；同目標兩筆；任一 p-use 決策缺 true／false 目標即拋明確 `Error`；改寫檔頭記法說明，並在檔頭註明已知限制：同一行有多個節點來源（多個敘述、多個拆分來源、參數預設值與本體同行）時標記碰撞、p-use 省略記法可能歧義，不加序號、不拋錯（spec「表示法」、contracts 已知限制）；使 T007 通過
- [X] T009 依新記法更新 `tests/dujs/es2015.js` 既有 p-use 期望字串（第 83、104、258、456 行附近，共 9 筆 `L<n>>L<m>` → `L<n>>L<m>:T`／`:F`，依實際 true／false 目標判定）；這些差異對應 FR-014
- [X] T010 執行 `npm test` 與 `npm run lint`：全綠，且 `tests/golden/`、`tests/esgraph/tests/` 零差異（Foundational 不得改變分析輸出）

**Checkpoint**: Foundation ready — user story 可開始

---

## Phase 3: User Story 1 - 含 labeled／with／debugger 的程式可以完成分析 (Priority: P1) 🎯 MVP

**Goal**: labeled／`with`／`debugger` 不再拋錯；labeled `break`／`continue` 控制流程正確（FR-001～003）

**Independent Test**: `npx mocha tests/dujs/labeledwithdebugger.js`，KI §1 三段重現輸入與 US1 情境 1–7 全數通過

### Tests for User Story 1 ⚠️（先寫、確認失敗）

- [X] T011 [US1] 新增 `tests/dujs/labeledwithdebugger.js`：US1-1～US1-6 各一個 `it`（期望 pair 照 spec 原文；US1-1 另斷言不含 `a: L1 -> L3`）；US1-3 因 spec 未給 pair，改以 `cfgBuilder` 取 CFG 斷言 `continue outer` 節點的唯一 normal 後繼為外層 `i++`（L2 的更新式節點），且不是內層 `j++`；另加未加 label 的 `break`／`continue` 在 labeled 迴圈內行為不變的 edge case
- [X] T012 [US1] 在 `tests/dujs/labeledwithdebugger.js` 新增 US1-7 CLI 測試：以 `child_process.spawnSync` 對 `os.tmpdir()` 下的暫存目錄中三個檔案（labeled、with、debugger，內容同 quickstart §3）執行 `node bin/dujs.js -js <檔案>`（cwd 設為暫存目錄），斷言結束碼 0、stderr 為空、產出 `out-*` 目錄且含四層模型 `.dot` 檔；測試結束清除暫存目錄

### Implementation for User Story 1

- [X] T013 [US1] 在 `lib/esgraph/index.js`（LGPL）支援 `LabeledStatement`：`getEntry` 回傳 `getEntry(body)`、連線 walker 遞迴 body、`getSuccessor` 走預設（research R6）
- [X] T014 [US1] 在 `lib/esgraph/index.js`（LGPL）讓 `getJumpTarget` 支援 `label`：沿 `cfg.parent` 找同名 `LabeledStatement`；`break l` → `getSuccessor(labeled)`；`continue l` → 被標記迴圈的 continue 目標（for 更新式、while／do-while 條件、for-in／for-of 迴圈節點）（FR-002）
- [X] T015 [US1] 在 `lib/esgraph/index.js`（LGPL）支援 `WithStatement`（自己一個節點、`connect(getEntry(body))`、mayThrow；去除 `.cfg` 的 walker 將 `astNode` 改指 `node.object` 並設 `FlowNode.isWithObject = true`）與 `DebuggerStatement`（`connectNext`）（FR-001、FR-003）
- [X] T016 [US1] 在 `lib/dujs/defuseanalyzer.js` 讓 `with` 節點的物件運算式記為 c-use：`astNode` 根為 `Identifier`（如 `with (o)`）時，現有 `cfgNode.astNode.type !== 'Identifier'` 防護會漏掉 `o`，須對 `isWithObject` 為 true 的節點例外（research R6、data-model §1）；`a;` 這類運算式敘述維持現狀（US1-5、FR-003）
- [X] T017 [US1] 更新 `lib/esgraph/index.js` 檔頭：「Modified by」加 `2026-11-xx: support labeled statements (labeled break/continue), with and debugger`，移除 `TODO: labeled break/continue`、`TODO: WithStatement`；並在 `THIRD_PARTY_NOTICES.md` esgraph 段記錄本項修改（LGPL 修改紀錄）
- [X] T018 [US1] 執行 `npx mocha tests/dujs/labeledwithdebugger.js` 與 `npm test`：US1 全過；golden 零差異（ES5／ES2015 fixtures 無 labeled／with／debugger，research R10）；如有差異依共通約定記錄或回報

**Checkpoint**: US1 可獨立運作——含 labeled／with／debugger 的程式 CLI 正常產出（SC-002）

---

## Phase 4: User Story 2 - 預設參數與 `new` 的參數被記為 use (Priority: P1)

**Goal**: `new` 的參數（含 spread）為 use；帶預設值參數各有初始化節點（FR-004、FR-005）

**Independent Test**: `npx mocha tests/dujs/paramsandnew.js`，US2 情境 1–7 通過（情境 8 依賴 US5，放在 Phase 7）

### Tests for User Story 2 ⚠️

- [X] T019 [US2] 新增 `tests/dujs/paramsandnew.js`：US2-1～US2-7 各一個 `it`，期望 pair 照 spec 原文（US2-3 另斷言不含 `b: entry -> L3`；US2-5 的箭頭函式與 `function h({x = d}) {}` 各寫在獨立行並附呼叫敘述；US2-6 以無預設值函式斷言 intra-procedural 無額外節點）

### Implementation for User Story 2

- [X] T020 [P] [US2] 在 `lib/dujs/defuseanalyzer.js` 的 `findUSESet` 把 `NewExpression` 改為 `recurse(callee)` 並 `arguments.forEach(recurse)`（`SpreadElement` 走預設遞迴）（FR-004、research R7）
- [X] T021 [P] [US2] 在 `lib/dujs/modelbuilder.js` 取函式 CFG 輸入時，若任一參數帶預設值，改用合成 `BlockStatement`（快取於函式 AST 的不可列舉屬性 `dujsBodyWithParamInits`）：依參數出現順序、含參數解構中巢狀 `AssignmentPattern`，每個帶預設值的名稱一個 `ExpressionStatement(AssignmentExpression '=' 名稱 = 預設值)`，`loc`／`range` 取該 `AssignmentPattern`；其後接原本體（箭頭運算式本體接既有 `dujsBodyStatement`）；無預設值參數維持在 entry 定義（FR-005、research R4、data-model §3）
- [X] T022 [US2] 確認 `lib/dujs/defuseanalyzer.js` 的 `analyzeDefaultValueOfLocalVariables` 對參數解構出的名稱（`{x = d, y = x}`）仍在 entry 有 undefined def，必要時補上，使初始化節點能 kill 之（US2-4、US2-7）
- [X] T023 [US2] 執行 `UPDATE_GOLDEN=1 npm test`：差異只可出現在 `tests/golden/expected-es2015/` 的 ES2015 fixture L16（`new` 參數，FR-004）與 L18（預設參數，FR-005）相關節點／pair；依共通約定寫入 `specs/001-fix-known-issues/golden-diff.md`；同步更新 `tests/dujs/es2015.js` 中受 FR-004／FR-005 影響的期望字串並逐筆註明 FR；`tests/golden/expected/`（ES5）MUST 零差異

**Checkpoint**: US1、US2 皆可獨立運作（US2 不含情境 8：依賴 US5，於 Phase 7 的 T034 驗證）

---

## Phase 5: User Story 3 - class 欄位初始化式與 static block 成為 scope (Priority: P2)

**Goal**: 每個欄位初始化式與 static block 各自成為 scope；static 者接在 class 宣告節點（FR-006）

**Independent Test**: `npx mocha tests/dujs/classfields.js`，US3 情境 1–5 通過

### Tests for User Story 3 ⚠️

- [X] T024 [US3] 新增 `tests/dujs/classfields.js`：US3-1（scope 清單含欄位 `f` 與 static block 各一個 `$ANONYMOUS_FUN_<n>` scope）、US3-2（含 `v: L1 -> L5`、不含 `v: L1 -> L3`）、US3-3（`v: L1 -> L3`）、US3-4（static block intra-procedural 含 `t: L3 -> L4`）、US3-5（方法、computed key、`extends` 既有行為不變：以修正前結果作 characterization 斷言）

### Implementation for User Story 3

- [X] T025 [US3] 在 `lib/dujs/scopetree.js` 的 `buildScopeTree` 走訪 `ClassBody` 時，對每個有 value 的 `PropertyDefinition` 與 `StaticBlock` 建立合成無參數 `FunctionExpression`（欄位本體 `[ReturnStatement(value)]`（實作時由 ExpressionStatement 更正，見 research R5）、static block 本體為其 `body`；`range`／`loc` 取成員），快取於成員 AST 不可列舉屬性 `dujsScopeFunction`，以既有 `AnonymousFunctionScope` 建 scope；欄位值本身是函式時原函式 scope 為其子 scope（research R5、data-model §3）
- [X] T026 [US3] 確認 `lib/dujs/variableanalyzer.js`、`lib/dujs/defuseanalyzer.js` 對 `ClassBody` 的略過不影響新 scope 的分析（新 scope 的 `ast` 為合成 `FunctionExpression`），必要時最小修正
- [X] T027 [US3] 在 `lib/dujs/modelbuilder.js` 的 inter-procedural 階段，把 class 宣告節點（或含 `ClassExpression` 的敘述節點）視為其 static 欄位與 static block scope 的呼叫點，依原始碼順序以 `connectCallerCalleeScopeRelatedModelsAtCallSite` 串接（CALL → S1.entry、S1.exit RETURN → ret1 → CALL S2…，最後回返節點接原後繼）；實例欄位 scope 不接入（FR-006、D7、data-model §4）
- [X] T028 [US3] 執行 `npx mocha tests/dujs/classfields.js` 與 `npm test`：US3 全過；`tests/golden/` 零差異（fixtures 無 class 欄位／static block，research R5）

**Checkpoint**: US3 可獨立運作（README 註明實例欄位限制於 Polish T050）

---

## Phase 6: User Story 4 - 連鎖指派不把內層目標當成 use (Priority: P2)

**Goal**: 單純連鎖指派的內層目標不記為 use（FR-007）

**Independent Test**: `npx mocha tests/dujs/chainedassignment.js`，US4 情境 1–3 通過

### Tests for User Story 4 ⚠️

- [X] T029 [US4] 新增 `tests/dujs/chainedassignment.js`：US4-1、US4-2（含與不含的 pair 照 spec）、US4-3（程式 `var a, b = 1;` / `a = b += 1;` / `console.log(a, b);`，斷言含 `b: L1 -> L2`、`a: L2 -> L3`、`b: L2 -> L3`；`a ||= b ||= 1` 已移到 US5 情境 14，由 T034a 驗證，本檔不測）

### Implementation for User Story 4

- [X] T030 [US4] 在 `lib/dujs/defuseanalyzer.js` 刪除 `AssignmentExpression` handler 中 `node.right.type === 'AssignmentExpression'` 時的 `recurse(node.right.left)`，及 `VariableDeclarator` 中同型的 `recurse(node.init.left)`；內層由 `recurse(node.right)` 依其運算子決定（FR-007、research R7）
- [X] T031 [US4] 執行 `UPDATE_GOLDEN=1 npm test`：預期零差異；若有差異 MUST 只與連鎖指派相關並依共通約定記錄為 FR-007，否則回報

**Checkpoint**: US4 可獨立運作

---

## Phase 7: User Story 5 - 條件運算式與短路運算子拆出分支 (Priority: P2)

**Goal**: `?:`、`&&`、`||`、`??`、`&&=`、`||=`、`??=` 依等效 if/else 拆出決策與葉節點；單一識別字條件為 p-use；無目標 p-use 消失（FR-008～FR-010、FR-014）

**Independent Test**: `npx mocha tests/dujs/branchsplit.js tests/dujs/branchsplit.property.js`，US5 情境 1–16、10b 與 US2-8 通過，性質 P1–P6 成立

### Tests for User Story 5 ⚠️

- [ ] T032 [P] [US5] 新增 `tests/dujs/branchsplit.js`：US5-1～US5-9、US5-11～US5-13 各一個 `it`，期望（含「不含」）照 spec 原文；US5-3 分三個 `it` 涵蓋 `&&`、`||`、`??`；US5-6 涵蓋 `||=`、`&&=`、`??=`；US5-7 對本檔所有程式呼叫 helper 不拋錯；US5-8 MUST 斷言含 `y: L1 -> L2`（前段 `y` 是 `preEvaluated` 中根為識別字的運算式，若誤受根識別字防護會漏記，本斷言須能抓到）；US5-11 斷言匿名函式只有一個 scope 且 `a` 的 pair 不重複；edge case：`while (a || b)`、`if (a ? b : c)` 不複製本體、可選鏈 `a?.b` 不拆分
- [ ] T033 [US5] 在 `tests/dujs/branchsplit.js` 新增 US5-10 與 US5-10b（已裁決，R12 方案 A）：US5-10 程式為呼叫敘述 `log(c ? a : b);`，斷言 `a: L1 -> L2:T`、`b: L1 -> L2:F`，並由 inter-procedural 模型斷言 `L2:T` 與 `L2:F` 兩個葉各自是 CALL 節點、皆連到同一個 `log` scope 的 entry，且其 callReturn 節點標記帶相同 `branchPath`；US5-10b 程式為 `var x = log(c ? a : b);`，只斷言 `a: L1 -> L2:T`、`b: L1 -> L2:F`、`x: L2:T -> L3`、`x: L2:F -> L3`，不驗呼叫連結
- [ ] T034 [US5] 在 `tests/dujs/branchsplit.js` 新增 US2-8（`it` 標題 `US2-8`，跨 story：預設值內的短路拆分）：期望 pair 照 spec US2 情境 8 原文，含不含 `d: L1 -> L2:T`
- [ ] T034a [US5] 在 `tests/dujs/branchsplit.js` 新增 US5-14（`var a = 0, b = 0;` / `a ||= b ||= 1;` / `console.log(a, b);`，期望 9 筆 pair 照 spec 原文）與 US5-15（`function f() {` / `  return a || b;` / `}` / `f();`：intra-page 含 `a: L1 -> L3>L3:T`、`a: L1 -> L3>L3:F`、`b: L1 -> L3:F`，不含 `a: L1 -> L3>exit:T`、`b: L1 -> L3:T`；另以 CFG 斷言 `L3:T`、`L3:F` 皆存在且唯一 normal 後繼為 exit）（D14、D15）
- [ ] T034b [US5] 在 `tests/dujs/branchsplit.js` 新增 US5-16（for-of 右側 `c ? xs : ys`）：pair 含／不含照 spec 原文；以 CFG 斷言 `c` 的決策只有迴圈外入邊、`L2:T`／`L2:F` 唯一 normal 後繼為迴圈節點、本體回邊直接接迴圈節點；另加 edge case `for (var x of (saved ?? []))`（只斷言 helper 不拋錯、迴圈節點不讀 `saved`）
- [ ] T035 [P] [US5] 新增 `tests/dujs/branchsplit.property.js`（fast-check＋mocha，research R11）：以 `fc.letrec` 產生深度 ≤4 的運算式樹（識別字 `a`…`e`、數字、`?:`、`&&`、`||`、`??`、`+`、`g(x)`），包進敘述模板（`var x = E;`、`x = E;`、`x ||= E;`、`if (E) {…}`、`while (E) {…}`、`switch (E) {…}`、函式中 `return E;`、`function k(p = E)`），一行一敘述；驗證 P1（FR-010）～P6，其中 P2 為「每條路徑至多經過一個定義 `x` 的拆出節點，且 0 個的情況只出現在邏輯指派的空分支」、P6 排除 `return`／`throw` 葉（research R11）；`numRuns` 預設 100 可由 `FC_NUM_RUNS` 覆寫，`seed` 預設固定值可由 `FC_SEED` 覆寫，失敗時印出 seed 與反例（§CP-3）

### Implementation for User Story 5

- [ ] T036 [US5] 新增 `lib/esgraph/branchsplitter.js`（dujs 原創，MIT 檔頭）：佔位節點 `DujsEvaluatedValue`（`known`：`truthy`／`falsy`／`nonnull`／`unknown`，`range`／`loc` 取被取代運算式，data-model §2）；路徑複製合成 AST（共用未改子樹，保證函式／class 運算式只有一個 scope）；依 JS 求值順序找第一個決策（不進函式本體與 `ClassBody`，納入 `extends`／computed key；可選鏈不算）；建決策節點（`astNode` = 條件、`preEvaluated` = 已求值前段）；T／F 分支替換（`?:` 取分支運算元、短路取右運算元或已知真值佔位、邏輯指派的賦值分支為單純 `left = right`；複合指派葉以 `x = <ph> op …` 避免重讀；`var p = 1, a = c ? 1 : 2` 的前段 declarator 屬 `preEvaluated`）；遞迴產生巢狀與並列（乘積）；設 `branchPath`、`splitOrigin`、`line`／`col` 取原敘述（research R1、R2）
- [ ] T037 [US5] 在 `lib/esgraph/branchsplitter.js` 實作出口接線與模組介面 `split(allNodes, { expressionThrows: fn })`（research R2、R3、data-model §2）：敘述語境葉複製原節點 normal 出邊（`return` 葉接 exit、`throw` 葉接原節點既有的例外目標；`return`／`throw` 葉即使無 use／def 也一律建節點，D15）；條件語境不複製本體，最後一層決策接原 true／false 目標，`truthy`／`falsy` 佔位直接接目標，`nonnull`／`unknown` 建無 use 的決策節點；switch 判斷式各葉接第一個 case 比對；case 測試式、`with` 物件、含 `extends` 的 class 依 R3 語境表；for-in／for-of 右側只攔截迴圈外入口邊、迴圈節點保留並設 `loopRightSplit = true`；空分支不建節點直接接後繼（`return`／`throw` 葉除外）；各拆出節點以 callback `expressionThrows(analyzedExpressions)` 判斷是否可能拋例外，例外目標取原節點既有的 EXCEPTION 出邊（`expressionThrows` 由 `lib/esgraph/index.js` 經 `split` 的參數傳入，不得把 LGPL 程式碼複製進 MIT 檔）；原節點的入邊改接決策節點並自圖中移除（for-in／for-of 除外）
- [ ] T038 [US5] 在 `lib/esgraph/index.js`（LGPL）於既有邊連好、`ExpressionStatement` 改指 expression 之後、DFS 排序與 cfgId 指派之前呼叫 `branchsplitter.split(allNodes, { expressionThrows: expressionThrows })`（傳入本檔既有的 `expressionThrows` 作為 callback）；檔頭「Modified by」加 `2026-11-xx: split conditional and short-circuit expressions into decision/leaf nodes (see branchsplitter.js)`，並在 `THIRD_PARTY_NOTICES.md` 記錄（LGPL 修改紀錄；註明 branchsplitter.js 為 MIT 原創）
- [ ] T039 [US5] 在 `lib/dujs/defuseanalyzer.js`：`ConditionalExpression` handler 的 `isPUse = true` 只在決策節點設定（KI §6 根因防禦）；`Identifier` 根節點防護依每個 `analyzedExpressions` 根各自判斷：決策節點記 p-use、拆分葉記 c-use、`isWithObject` 節點記 c-use、其餘維持現狀；`preEvaluated` 一律以 c-use／GEN 語境走訪、不受防護影響（前段 def 留在決策節點；US5-8 的 `y: L1 -> L2`）（FR-009、research R7）；拆分後的 switch case 節點不重讀判斷式
- [ ] T039a [US5] 在 `lib/dujs/defuseanalyzer.js` 的 `useLoopHead`：迴圈節點 `loopRightSplit` 為 true 時略過 `recurse(node.right)`，迴圈節點不重讀已拆出的右側（左側解構預設值、成員目標的 object 照舊）；使 T034b 通過（FR-008、research R3、spec US5 情境 16）
- [ ] T040 [P] [US5] 在 `lib/dujs/modelbuilder.js` 的 `connectCallerCalleeScopeRelatedModelsAtCallSite` 複製 `line`／`col` 時一併複製 `branchPath`（research R7）；確認葉的合成 `CallExpression` 被認定為呼叫點、函式運算式以 range 查到同一 scope
- [ ] T041 [P] [US5] 在 `lib/dujs/cfggraphconverter.js` 的 `labelWithLineNumber` 對拆出節點輸出 `<行>:<路徑>`、`labelWithLoc` 輸出 `L<行>:C<欄>:<路徑>`；無拆分節點 label 不變，既有 `a`、`b` 碰撞後綴保留（research R10、contracts/cli-and-output.md）
- [ ] T042 [US5] 更新上游 fixture `tests/esgraph/tests/maythrow.js`（LGPL 衍生）的期望 dot：`1 && call();` 依 FR-008 拆為決策 `1` 與 T 葉 `call()`，F 分支空節點不建；在 `tests/esgraph/tests/README.md` 追加帶日期的 `maythrow.js` 修改說明（fixture 無檔頭，依共通約定），於 `THIRD_PARTY_NOTICES.md` 記錄此 fixture 修改，並依共通約定寫入 `golden-diff.md`（FR-008）
- [ ] T043 [US5] 更新受 FR-008／FR-009 影響的既有測試期望（`tests/dujs/es2015.js`、`tests/dujs/defuseanalyzer.js` 等，以 `npm test` 失敗清單為準），每筆變更在 `golden-diff.md` 註明 FR；不得為通過測試而改動與 FR 無關的期望
- [ ] T044 [US5] 執行 `UPDATE_GOLDEN=1 npm test`：`tests/golden/expected-es2015/` 差異只可在 ES2015 fixture L11（`||` 於箭頭運算式本體，FR-008）、L29（`??` 於 for-of 右側，FR-008）相關節點、邊、pair 與 `<行>:<路徑>` label；ES5 `tests/golden/expected/` MUST 零差異；依共通約定記錄
- [ ] T045 [US5] 執行 `npx mocha tests/dujs/branchsplit.js tests/dujs/branchsplit.property.js` 與 `FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js`（預設固定 seed），再以一個隨機 `FC_SEED` 執行一次：全過（SC-003）；失敗時記下輸出的 seed 與反例

**Checkpoint**: US5 可獨立運作；US2-8 一併通過

---

## Phase 8: User Story 6 - block 內同名函式的 scope 名稱唯一 (Priority: P3)

**Goal**: 同父 scope 下同名 scope 依序加 `_1`、`_2`…（FR-011）

**Independent Test**: `npx mocha tests/dujs/scopenames.js`，US6 情境 1–5 通過

### Tests for User Story 6 ⚠️

- [ ] T046 [US6] 新增 `tests/dujs/scopenames.js`：US6-1（`$DOMAIN.$PAGE_0.f`、`$DOMAIN.$PAGE_0.f_1`，`getScopeByName` 各查到不同 scope）、US6-2（`f`、`f_1`、`f_2`）、US6-3（無重名名稱不變）、US6-4（原始碼已有 `f_1` 與兩個 `f` 時全部唯一、跳過已用名）、US6-5（`$DOMAIN.$PAGE_0.$BLOCK_0.f`）

### Implementation for User Story 6

- [ ] T047 [P] [US6] 在 `lib/dujs/scope.js` 為 `_name` 新增內部 setter（不改公開 API；data-model §4）
- [ ] T048 [US6] 在 `lib/dujs/scopetree.js` 的 `buildScopeTree` 結束後做命名後處理：同父 scope 的子 scope 依原始碼順序，第一個保留原名，其後取最小 `k ≥ 1` 使 `name_k` 不在兄弟原名與已指派名中；重建 `_mapFromNameToScope`（FR-011、research R7；與 T025 同檔，須在 US3 之後或協調合併）
- [ ] T049 [US6] 執行 `npx mocha tests/dujs/scopenames.js` 與 `UPDATE_GOLDEN=1 npm test`：`tests/golden/` 零差異（fixtures 無同名 scope，SC-004）

**Checkpoint**: 所有 user story 皆可獨立運作

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 文件、LGPL 紀錄彙整、全面回歸與 golden 稽核

- [ ] T050 [P] 更新 `README.md` Limits（FR-012）：把「Labeled `break`/`continue`; `catch` parameters are not variables」改為只保留 `catch` 參數限制；新增 `with` 本體內名稱不推斷物件屬性（FR-003）、實例欄位初始化式不接入外層流程（FR-006）、「同一敘述有大量並列條件時節點數以乘積成長；以壓縮（minified）檔為分析目標可能耗盡資源而卡住，建議分析原始碼」（D12、D16）、「帶預設值的參數初始化節點一律定義該參數，不建模『僅在傳入 undefined 時』，呼叫端有傳值時 entry 上的 def 會被視為被覆寫，可能漏報」（FR-005、spec Assumptions）；呼叫點限制維持原文（R12 方案 A）
- [ ] T051 [P] 更新 `docs/known-issues.md`（FR-012）：§1–§6、§8 移除或標為已修正（註明 feature `001-fix-known-issues`）；§7、§9 保留
- [ ] T052 [P] 彙整 `THIRD_PARTY_NOTICES.md`、`lib/esgraph/index.js` 檔頭與 `tests/esgraph/tests/README.md`：確認 T017、T038、T042 的修改紀錄齊全、日期一致，且 `lib/esgraph/branchsplitter.js` 列為 MIT 原創檔
- [ ] T053 Golden 總稽核（FR-013、SC-004）：`git diff master -- tests/golden tests/esgraph/tests tests/dujs/es2015.js` 與 `specs/001-fix-known-issues/golden-diff.md` 逐處比對，確認每處差異都對應 FR-001、FR-004～FR-009 或 FR-014，ES5 golden 零差異；整理為 PR 說明用的對照表
- [ ] T054 SC-001 覆蓋檢查：確認 `docs/known-issues.md` §1–§6、§8 的每段重現輸入都有對應的自動化測試（`tests/dujs/labeledwithdebugger.js`、`paramsandnew.js`、`classfields.js`、`chainedassignment.js`、`branchsplit.js`、`scopenames.js`），缺者補測
- [ ] T055 執行 `specs/001-fix-known-issues/quickstart.md` 全部步驟：`npm test`、`npm run lint`、§3 CLI 煙霧測試（三檔 exit=0、stderr 空）、`FC_NUM_RUNS=1000` 性質測試；全綠（SC-002、SC-003、SC-005）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)**：Foundational 完成前不可開始任何 story
- **User Stories (Phase 3–8)**：皆依賴 Foundational；建議依優先序 US1 → US2 → US3 → US4 → US5 → US6
- **Polish (Phase 9)**：依賴所有 story 完成

### User Story Dependencies

- **US1 (P1)**：僅依賴 Foundational
- **US2 (P1)**：僅依賴 Foundational；情境 8（預設值內短路）依賴 US5，測試置於 Phase 7（T034）
- **US3 (P2)**：僅依賴 Foundational
- **US4 (P2)**：僅依賴 Foundational
- **US5 (P2)**：依賴 Foundational（FlowNode 欄位、helper 記法）；T034 依賴 US2 的 T021（參數初始化節點）
- **US6 (P3)**：僅依賴 Foundational；與 US3 同改 `lib/dujs/scopetree.js`，不可與 US3 並行修改

### 檔案熱點（同檔任務不可並行）

- `lib/dujs/defuseanalyzer.js`：T005、T016、T020、T022、T026、T030、T039、T039a
- `lib/dujs/modelbuilder.js`：T006、T021、T027、T040
- `lib/esgraph/index.js`：T013–T017、T038
- `lib/dujs/scopetree.js`：T025、T048
- `THIRD_PARTY_NOTICES.md`：T017、T038、T042、T052
- `tests/dujs/branchsplit.js`：T032、T033、T034、T034a、T034b
- `tests/esgraph/tests/README.md`：T042、T052

### Within Each User Story

- 測試先寫並確認失敗 → 實作 → 執行測試與 golden 稽核 → Checkpoint

### Parallel Opportunities

- Phase 2：T003 與 T007 可並行；T006 與 T005 不同檔可並行（T004 完成後）
- US2：T020（defuseanalyzer）與 T021（modelbuilder）可並行
- US5：T032 與 T035 測試檔可並行；T040（modelbuilder）、T041（cfggraphconverter）可與 T036–T037（branchsplitter）並行
- US6：T047 可與 T046 並行
- Polish：T050、T051、T052 可並行
- 跨 story：US1（esgraph/index.js）與 US3（scopetree/modelbuilder）、US4（defuseanalyzer）若有多人可並行，但須注意上列熱點檔案

---

## Parallel Example: User Story 5

```bash
# 測試並行撰寫
Task: "新增 tests/dujs/branchsplit.js（US5-1～9、11～13）"
Task: "新增 tests/dujs/branchsplit.property.js（P1–P6）"

# 實作中與 branchsplitter 無檔案衝突者並行
Task: "lib/dujs/modelbuilder.js callReturn 複製 branchPath"
Task: "lib/dujs/cfggraphconverter.js 拆出節點 label"
```

## Parallel Example: User Story 2

```bash
Task: "lib/dujs/defuseanalyzer.js NewExpression 參數為 use"
Task: "lib/dujs/modelbuilder.js dujsBodyWithParamInits 合成本體"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE**：`npx mocha tests/dujs/labeledwithdebugger.js`＋CLI 煙霧測試（SC-002）
3. MVP 交付：含 labeled／with／debugger 的程式不再中止分析

### Incremental Delivery

1. US1（不中止）→ US2（漏報 use）→ US3（class 成員）→ US4（錯誤 pair）→ US5（拆分支，影響面最大）→ US6（scope 名稱）
2. 每個 story 完成即跑 `npm test` 與 golden 稽核，差異逐處記入 `golden-diff.md`
3. Polish 階段統一更新 README、known-issues 與 LGPL 紀錄並做總稽核

---

## Notes

- [P] = 不同檔案、無未完成依賴
- `it` 標題一律以 `US<n>-<情境號>` 開頭（quickstart §2）
- 各 story 完成後於 Checkpoint 驗證，再進下一 story
- 拆出節點的標記碰撞（同一行多個節點來源）為 spec「表示法」所列已知限制（2026-11-16 analyze 已決：不加序號、不拋錯），驗收程式一行一個節點來源
