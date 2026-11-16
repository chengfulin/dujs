---

description: "Task list for feature 004-fix-remaining-issues"
---

# Tasks: 修正其餘已知問題（§7、§10–§12、§14、§15、§17、§20、§21）

**Input**: Design documents from `specs/004-fix-remaining-issues/`（plan.md、spec.md、research.md R0–R13、data-model.md、contracts/（acceptance、model-api、cli、output、golden-verification）、quickstart.md、probes/）

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/（皆已 review 並 commit；plan 裁決 U1＝A、U3＝(a) 已定案，U2 由 analyze 裁決取代；analyze 裁決——H3 對 class 放寬、呼叫解析統一為嚴格規則（FR-018）及其餘建議——已寫入 spec「Session 2026-11-16（analyze）」）

**任務總數**：87（T001–T087；T086、T087 為 analyze 後增補，置於 US2、US3 phase 內，執行順序見各 phase 與「Within Each Story」）

**Tests**: 本 feature 要求測試（憲章 §CP-4、SC-001：每個驗收情境一個自動化測試）。**測試先行**：每個 story 先依 `contracts/acceptance.md`（US5 依 `contracts/cli.md` §4）寫驗收測試並確認失敗（red），再實作（green）。

**Organization**: Setup → Foundational（FR-016 繞過規則）→ US1…US6（依 plan「實作順序」）→ Polish；每個 story phase 以閘門任務與 Checkpoint 結束。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、不依賴未完成的任務）
- **[Story]**：US1–US6
- 路徑皆相對於專案根 `/Users/chengfulin/Documents/Personal/dujs`；git 一律 `git -C <專案根>`

## 全程規則（每個任務都適用）

- **驗收預期**：`contracts/acceptance.md` 的修正後預期是手推值。實跑不符時先查推導（exception 邊——呼叫敘述與一般賦值敘述都有 exception 邊直達所在函式 exit，research P6——與 §18 entry 殘留），確認是實作偏離就修實作；確認是推導錯誤才更新 `contracts/acceptance.md` 並記入 `golden-diff.md` 末節「驗收預期更正」（供 PR 說明），**不得只改預期迎合結果**。更正若涉及 spec.md 明列的 pair（驗收情境、Edge Cases），**先改 spec.md（記入 Clarifications 新條目）再改 `contracts/acceptance.md`**，兩者同一 commit。
- **探針複本**：測試只讀 `tests/dujs/cases/probes004/` 的複本（T006），不得讀 `specs/` 下的檔案。
- **Golden 序列化**：`tests/golden/expected-fixes004/`、其他 `tests/golden/expected*/`、`tests/golden/manifest.json`、`specs/004-fix-remaining-issues/golden-diff.md` 是共用資源，**所有寫入這些檔的任務都不標 [P]**，且同一時間只有一個 story 寫入；寫入順序固定為 Setup（T004、T005、T007）→ T016 → T024 → T034 → T050 → T061 → T072 → T078 → T083。每次 golden 任務的步驟（quickstart §1 末段）：`UPDATE_GOLDEN=1 npm test` → `git -C <專案根> diff --stat tests/golden/expected*` 與逐檔 `git diff` 判讀 → 以 quickstart §1 步驟 4 的指令（換目錄）重算雜湊 → 只更新變更的 manifest 鍵（新增檔加入 `baseline`、刪除檔自 `baseline` 移除；既有三個 case 的 `added` 不動）→ `golden-diff.md` 加列（格式見 `contracts/golden-verification.md` §4）→ `npm test` 全綠。
- **既有三個 golden case 預測零差異**（`expected/`、`expected-es2015/`、`expected-interprocedural/`）。出現差異 → 先確認是否為本 story 修正的必然結果；是則記入 golden-diff 並更新 manifest，否則視為回歸修實作；無法判斷 → 停下請使用者裁決。
- **既有測試**只允許修改 plan Constraints 列出的範圍（`tests/dujs/usedexpressions.js` 約 139–147、273–279 行；`tests/dujs/es2015.js` 約 407 行；`tests/dujs/paramsandnew.js` 約 140–152 行；`tests/dujs/expansion.js` 約 1026–1041 行 `call cycle`；`tests/dujs/classfields.js` 檔頭 D7 說明與 92 行測試標題；`tests/golden/golden.js` 約 145 行註解）。每一筆修改記入 `golden-diff.md` 對應節的「單元測試期望」表；其他既有測試失敗 → 先查是否為實作偏離，若確屬修正的必然結果也須逐筆列入並在回報中標明，無法判斷 → 停下裁決。
- 不新增 `eslint-suppressions.json` 項目（維持 119 筆）；不修改 LGPL 檔（`lib/esgraph/index.js`、`lib/esgraph/dot.js`、`lib/analyses/`）；新檔 MIT 檔頭、ES5 風格（`'use strict'`、`var`、function 表示式）。
- `<Setup commit>`：T008 完成後 orchestrator 建立的基準 commit（記於 `golden-diff.md` 檔頭）。
- **步驟閘門**（下文稱「閘門」）：`npm test` 全綠、`npm run lint` 0 錯誤、`git -C <專案根> diff --exit-code <Setup commit> -- eslint-suppressions.json`；`git -C <專案根> diff --exit-code <Setup commit> -- tests/golden/expected tests/golden/expected-es2015 tests/golden/expected-interprocedural`（除非該 story 已依上條記錄差異）；`golden-diff.md` 中本 story 對應節的四個 case 都有列或「無差異」。

---

## Phase 1: Setup（修正前基準；任何 `lib/` 變更之前）

**Purpose**: research R12／quickstart §1——以修正前程式（`ff45928` 的 lib）鎖定新 golden fixture 的輸出與雜湊，並備妥探針複本與差異紀錄骨架。

- [X] T001 確認基準：`git -C <專案根> diff --quiet ff45928 HEAD -- lib bin package.json && echo pre-fix`；`npm test` 933 passing、`npm run lint` 0 錯誤、`eslint-suppressions.json` 119 筆；`node specs/004-fix-remaining-issues/probes/run.js > <暫存目錄>/probes-now.txt` 後與 `specs/004-fix-remaining-issues/probes/current-output.txt` `diff` 無差異（quickstart §0）。不符即停下回報
- [X] T002 新增 `tests/golden/fixtures/fixes004/app.js`，內容**逐字**等於 `specs/004-fix-remaining-issues/probes/golden-fixes004.js`（`cmp` 確認）
- [X] T003 在 `tests/golden/golden.js` 新增 `goldenCase('Golden outputs (004 fixes fixture)', [['fixes004/app.js']], path.join(__dirname, 'expected-fixes004'))`，前加註解 `/// regression of the fixes of feature 004 (§7, §10, §11, §15, §17, §20, §21, FR-015, FR-016); created before the fixes`（quickstart §1 步驟 2）
- [X] T004 `UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js -g "004 fixes"` 產生 `tests/golden/expected-fixes004/`（預期 31 個 .dot）；`git -C <專案根> status --short tests/golden` 只出現 `fixtures/fixes004/`、`expected-fixes004/` 與 `golden.js`
- [X] T005 以 quickstart §1 步驟 4 的指令計算 `tests/golden/expected-fixes004/` 全部 .dot 的 sha256，寫入 `tests/golden/manifest.json` 的 `"expected-fixes004": {"baseline": {...}, "added": []}`；其他 case 的內容不動（`git diff` 只有新增的鍵）
- [X] T006 [P] 把 `specs/004-fix-remaining-issues/probes/*.js`（**不含** `run.js`；共 50 個程式，含 `golden-fixes004.js` 與 analyze 新增的 `ctor-cycle`、`cyc-handler`、`cyc-handler-nocyc`、`cyc-uncond`、`field-new`、`fn-new-early`、`handler-new`、`mix-f`）逐字複製到 `tests/dujs/cases/probes004/`（沿用 003 的 `tests/dujs/cases/probes/` 慣例）
- [X] T007 建立 `specs/004-fix-remaining-issues/golden-diff.md` 骨架（`contracts/golden-verification.md` §4）：檔頭基準行（`<Setup commit>` 待 T008 後填入）、行號說明；依序 §20（US1）、§21（US2，含子節「FR-018」）、§7（US3，含子表「FR-015」「FR-016（Fable A1）」「FR-017」）、§10、§11、§17（US4）、§12（US5）、§15、§14（US6）各一節，每節列出四個 case 待填與「單元測試期望」表頭；另加末節「驗收預期更正」（初始為「無」）。Foundational 的差異記在 §7 的 FR-016 子表
- [X] T008 Setup 閘門：`npm test` 全綠（933 ＋ 新 golden case 的 `it`）、`npm run lint` 0 錯誤、`eslint-suppressions.json` 119 筆；回報「可提交為 Setup 基準 commit」（commit 由 orchestrator 執行，完成後把 commit 寫入 `golden-diff.md` 檔頭）

**Checkpoint**: 修正前基準已鎖定（`expected-fixes004/`、manifest baseline、探針複本）；之後才可改 `lib/`。

---

## Phase 2: Foundational（FR-016 繞過規則；阻塞 US2、US3）

**Purpose**: plan「實作順序」2——方法與 constructor 的連結一接上就需要 bypass，否則 US3 的 `byp-3`、`cyc-3` 與 SC-006 無法成立。只動展開、模型、分析三處（research R6、contracts/model-api §2–§4、data-model §5）。

**Independent Test**: `npx mocha tests/dujs/bypass.js` 通過；acceptance「FR-016」表的 `byp-1`、`ki16`、`ki16b`、`byp-2` 符合；既有三個 golden case 零差異。

### 測試（先寫，須先失敗）

- [X] T009 新增 `tests/dujs/bypass.js`（MIT）：acceptance「FR-016」表中 `byp-1.js`、`ki16.js`、`ki16b.js`、`byp-2.js`（對照組，結果不變）的 intra-page 完整 pair（`should.eql`），讀 `tests/dujs/cases/probes004/`；`byp-3.js` 留給 US3（T037）。執行確認 `byp-1`、`ki16`、`ki16b` 失敗、`byp-2` 通過
- [X] T010 在 `tests/dujs/bypass.js` 新增單元測試：(a) `defuseAnalyzer._testonly_._bypassFilter(vardefs, calleeScope)` 保留「`calleeScope.getVariable(v.name) !== v`」與「`v` 屬於 `calleeScope.getVariablesIncludingBlockScopes()`」的定義，濾掉被呼叫端看得到的外層變數定義（data-model §5）；(b) `expansion.expand(model).bypasses`：非決策呼叫點的 `callNode` 是呼叫點複本、決策前呼叫是 CALL 複本、串接呼叫是前一個 CALL RETURN 複本，`calleeScope` ＝ `calleeModel.mainlyRelatedScope`，每條呼叫邊一筆；intra-procedural 模型回傳空 Map；(c) `model.setCallBypasses(map)` 只能設定一次（第二次拋錯）、`callBypassOf(非 CALL RETURN)` 回傳 `null`；(d) 有 bypass 的 CALL RETURN 其 `analysisResultOf(node).reachIns` 為合併後的有效輸入

### 實作

- [X] T011 `lib/dujs/expansion.js`：`expand(model)` 改回傳 `{graph, flatNodeOf, bypasses}`，每條呼叫邊（一般、串接；回邊於 US3 一併適用）記一筆 `callReturn 複本 → {callNode, callReturn, calleeScope}`（contracts/model-api §2）
- [X] T012 `lib/dujs/model.js`：新增 `setCallBypasses(map)`（只能設定一次）與 `callBypassOf(node)`（contracts/model-api §3）
- [X] T013 `lib/dujs/modelbuilder.js`：`setFlatGraphFromHierarchy` 以 `expand` 的 `bypasses` 呼叫 `model.setCallBypasses`
- [X] T014 `lib/dujs/defuseanalyzer.js`：`doAnalysis` 對 `callBypassOf(node)` 非 null 的 CALL RETURN，有效輸入＝worklist 輸入 ∪ `extraReachIns` ∪ `bypassFilter(callNode 上次輸出, calleeScope)`；callNode 輸出改變時以轉移函式的 `list` 參數推回該 CALL RETURN；`reachIns` 與 `analysisResultOf` 記有效輸入；新增 `bypassFilter` 並以 `_testonly_._bypassFilter` 暴露（contracts/model-api §4）。不改 `lib/analyses/index.js`
- [X] T015 執行 `node specs/004-fix-remaining-issues/probes/run.js specs/004-fix-remaining-issues/probes/{byp-1,byp-2,ki16,ki16b,cyc-3}.js`（cyc-3 此時尚未連結，只確認不拋錯）；T009、T010 全過
- [X] T016 Golden（序列化）：依「全程規則」跑 golden；既有三個 case 預期零差異（research R6）；`expected-fixes004/` 若有差異，逐處確認屬 FR-016 後更新 manifest，記入 `golden-diff.md` §7 的「FR-016（Fable A1）」子表（註明 KI §16 後果段）；四個 case 中沒有差異者寫「無差異」
- [X] T017 Foundational 閘門（全程規則的閘門指令；golden 檢查 `tests/golden/manifest.json`、`specs/004-fix-remaining-issues/golden-diff.md`）

**Checkpoint**: 繞過規則就緒——既有 `f()` 的區域變數 pair 恢復（`byp-1`、KI §16 後果段），既有 golden 零差異；US1、US2、US4、US5、US6 可開始。

---

## Phase 3: User Story 1 - 決策條件中的讀取一律是 p-use (Priority: P1) 🎯 MVP

**Goal**: 決策條件以「條件模式」判定：全部 p-use，呼叫與 `new` 的引數子樹 c-use；case discriminant 同規則；非決策節點不變（FR-001、research R1）。

**Independent Test**: `npx mocha tests/dujs/conditionpuse.js tests/dujs/usedexpressions.js tests/dujs/es2015.js`；acceptance US1 表 6 個情境；golden 只有 `expected-fixes004/` 的 §20 差異。

### 測試（先寫，須先失敗）

- [X] T018 [P] [US1] 新增 `tests/dujs/conditionpuse.js`（MIT）：acceptance US1 #1–#6（`us1-1.js`、`us1-2.js`、`us1-3.js`、`us1-4.js`、`us1-5a.js`、`us1-6.js`），斷言頁面 `result.intraProcedural()` 的完整 pair（`should.eql`）；確認 #1、#2、#3、#5、#6 失敗、#4 通過
- [X] T019 [US1] 在 `tests/dujs/usedexpressions.js` 新增 case discriminant 測試：`switch (a + f(b) + c)` 的 `a`、`f`、`c` 為 p-use、`b` 為 c-use（acceptance US1 表下註）
- [X] T020 [US1] 修改 `tests/dujs/usedexpressions.js` 既有期望（plan Constraints）：約 273、279 行決策條件的 read `'walk'` → `'p-use'`；約 139、145 行 `findUSESet` characterization（`x = o.p[i] ? a : b`）的 `o`、`i` 由 c-use 改為 p-use（`{cuse: [], puse: ['o', 'i']}`；145 行的 `f`、`y` 為先求值呼叫，維持 c-use，`o`、`i` 改 p-use）；修改 `tests/dujs/es2015.js` 約 407 行 `'o: L4 -> L5'` 改為 `'o: L4 -> L5>L5:F'`、`'o: L4 -> L5>L5:T'`（acceptance US1 表下註；目標是帶路徑的拆分葉，原型實跑核對）；同步更新這些測試的標題與註解。三處記下供 T024 填入 golden-diff §20「單元測試期望」

### 實作

- [X] T021 [US1] `lib/dujs/usedexpressions.js`：決策節點（有 true 或 false 目標）的 astNode 項目回傳 `read: 'p-use'`（原 `'walk'`）；SwitchCase、for-in／for-of head 的規則不變；檔頭的 read 說明改為「`'p-use'` ＝條件模式（呼叫與 `new` 的引數子樹為 c-use，其餘 p-use）」（contracts/model-api §5）
- [X] T022 [US1] `lib/dujs/defuseanalyzer.js` 的 `findUSESet`：`read: 'p-use'` 的項目以條件模式走訪——所有讀取為 p-use，只有 `CallExpression`／`NewExpression` 的引數（及 `TaggedTemplateExpression` 的樣板運算式）子樹內是 c-use；callee（含 `o.m` 的 `o`）維持 p-use；`BinaryExpression`／`UnaryExpression`／`ConditionalExpression` 在條件模式下不切換 `isPUse`；`'walk'`、`'c-use'` 的既有規則（含 §18 entry 走訪與 for-in／for-of head）**完全不動**（research R1）
- [X] T023 [US1] T018–T020 全過；`node specs/004-fix-remaining-issues/probes/run.js specs/004-fix-remaining-issues/probes/us1-*.js` 與 acceptance US1 一致
- [X] T024 [US1] Golden（序列化）：既有三個 case 預期零差異；`expected-fixes004/` 的 §20 差異（L2 `if (a + b >= c)` 等）逐處判讀、更新 manifest 鍵；填 `golden-diff.md` §20：四個 case 的列或「無差異」，「單元測試期望」表列 T020 的三處（`usedexpressions.js` 約 139、145、273、279 行；`es2015.js` 約 407 行）
- [X] T025 [US1] US1 閘門（全程規則的閘門指令；golden 檢查 `tests/golden/manifest.json`、`specs/004-fix-remaining-issues/golden-diff.md`）

**Checkpoint**: US1 完成——決策條件 p-use 規則一致（SC-002 的 §20），可單獨交付（MVP）。

---

## Phase 4: User Story 2 - `new` 敘述是 call-site (Priority: P1)

**Goal**: 新模組 `callresolver.js` 建 class 索引並解析 `f()`、`new F()`／`new A()`——統一的嚴格規則（到達定義至少一筆且全部指向同一函式／class）與 class 放寬（reachIns 沒有定義時，全頁唯一的 class 定義）；`new A()` 依序連實例欄位初始化式（原始碼順序）與 constructor，不追 `extends`；FR-017 的欄位 `f = new B();` 依放寬會連（analyze 裁決 1，取代 U2）（FR-002、FR-003、FR-017、FR-018、research R2、R3）。

**Independent Test**: `npx mocha tests/dujs/newcallsite.js tests/dujs/classfields.js`；acceptance US2 #1–#7、「FR-017／FR-018」表的 `field-new`、`fn-new-early` 與 edge case `edge-classexpr`。

### 測試（先寫，須先失敗）

- [X] T026 [P] [US2] 新增 `tests/dujs/newcallsite.js`（MIT）：acceptance US2 #1–#7（`us2-1.js`…`us2-5.js`、`fn-new.js`、`mix-f.js`）斷言 `result.intraPage()` 完整 pair 與 `interProceduralScopes()`——#6 `fn-new` 斷言**連結**（`x: L4 -> L11`，inter `[[P.g, P.$A0], [P, P.g, P.$A0]]`），#7 `mix-f` 斷言**不連**（`x: L1 -> L11`，inter `[]`）；Edge case `edge-classexpr.js`（`A: L2 -> L7`、`x: L4 -> L8`）；確認 #1、#2、#3、#6、#7、`edge-classexpr` 失敗

- [X] T027 [P] [US2] 在 `tests/dujs/newcallsite.js` 新增 `callResolver` 單元測試（§TR-7 代表組合）：`classIndexOf(scopeTree)` 的 `ClassInfo` 欄位（`isDeclaration`、`hasSuperClass`、`constructorScope`、`instanceFieldScopes`「有值的實例欄位，原始碼順序」、`instanceMethods`／`staticMethods`「kind 'method'、非 computed、非 private」，data-model §2）與每頁快取（同一 scopeTree 回傳同一物件）；`callExpressionOf`：`new A();` 敘述回傳 NewExpression、`x = new F();`／`var o = new A();`／`return g();` 回傳 `null`、欄位合成 return 的 `this.m()`／`new B()` 回傳該運算式；`calleeScopesOf`：`new F()`→`[F]`、`new A()`→欄位…＋constructor、無 constructor 無欄位→`[]`、`extends` 不含 super class、`super()`／`new ns.A()`／`new (f())()`→`[]` 且不拋錯、`A` 的到達定義混合（函式與 class）→`[]`、到達定義為空→`[]`（「至少一筆且全部指向同一個」，research R2）；**嚴格規則（FR-018）**：`f()` 只有一筆函式定義到達→`[f]`（與修正前 `findFunctionDefinitionFromReachInSet` 結果相同）、混合定義 `var f = function(){x=1}; if (c) { f = function(){x=2} } f();`→`[]`（不連）、函式與非函式值混合（`function f(){}; if (c) { f = 5; } f();`）→`[]`；**class 放寬**：函式內 `new A()`／`A.s()` 且 `A` 為全頁唯一的 class 宣告→連；`const A = class {...}` 同；`var A = class {...}`（另有 undefined 預設定義）→`[]`；函式宣告 `F` 在函式內 `new F()`／`f()`→`[]`（H3）；reachIns 有 `A` 的定義時不走放寬；全頁有兩筆 `A` 定義→`[]`；不修改任何節點（前後快照相同）

- [X] T028 [US2] `tests/dujs/classfields.js`：檔頭的 001 D7「實例欄位初始化式不接入流程」說明改為「已由 004 FR-003 取代：`new A();` 敘述依序連實例欄位初始化式與 constructor」；執行該檔，若有編碼 D7 舊行為而失敗的斷言，逐筆確認為 FR-003 的必然結果後改為新行為並記下供 T034 列入 golden-diff §21「單元測試期望」（全程規則：須在回報中標明）

### 實作
- [X] T086 [P] [US2] 在 `tests/dujs/newcallsite.js` 新增 acceptance「FR-017／FR-018」表的 `field-new.js`（欄位 `f = new B();` **連結**：`x: L4 -> L11`、inter `[[P.$A1, P.$A0], [P, P.$A1, P.$A0]]`，FR-017）與 `fn-new-early.js`（呼叫在 class 宣告之前也連：`x: L8 -> L11`，測試註解寫明「放寬不看執行順序，README 限制」）的 intra-page 完整 pair 與 inter 清單；確認兩者失敗

- [X] T029 [US2] `lib/dujs/scopetree.js`：實例欄位合成函式的 `return` 敘述加不可列舉屬性 `dujsFieldInitializer`（`Object.defineProperty`，`enumerable: false`），供 `callExpressionOf` 判定（research R2）
- [X] T030 [US2] 新增 `lib/dujs/callresolver.js`（MIT，ES5）：`classIndexOf(scopeTree)`（WeakMap 快取；`byRange`、`byMemberScope`、`newExpressionsByRange`，data-model §2）、`callExpressionOf(node)`、`calleeScopesOf(node, scopeTree)` 的 `f(...)`、`new F(...)`／`new A(...)` 三列（research R2 表）；共用「解析變數」：reachIns 中該變數的定義至少一筆且全部指向同一函式／class（FR-018 嚴格規則；`findFunctionDefinitionFromReachInSet` 的邏輯搬入此處並改為嚴格規則，不再是原樣搬移）；reachIns 沒有該變數定義時，統計全頁各 intra-procedural 模型節點 GEN 中該變數的定義，只有一筆且以 range 對到 class 索引才解析為該 class（class 放寬，analyze 裁決 1；函式不放寬）；只讀 intra-procedural 原件的 `node.reachIns`、GEN 與 AST；class 運算式 `var A = class {}` 的 literal 定義以 range 對到 class；找不到一律回傳 `[]` 不拋錯（contracts/model-api §6）

- [X] T031 [US2] `lib/dujs/modelbuilder.js`：被呼叫端改為 `findStaticMemberScopesOfClassesAtNode(node)`（不變）＋`callResolver.calleeScopesOf(node, scopeTree)`（含 `f()`），依序串接（前一個 CALL RETURN 是下一個的呼叫點，research R3）；`findFunctionDefinitionFromReachInSet` 移除或改為委派 callresolver（`_testonly_` 若有暴露則同步）；`modelbuilder` 不判斷語法形式（contracts/model-api §7）

- [X] T032 [US2] T026–T028、T086 全過；`node specs/004-fix-remaining-issues/probes/run.js specs/004-fix-remaining-issues/probes/{us2-1,us2-2,us2-3,us2-4,us2-5,edge-classexpr,fn-new,fn-new-early,field-new,mix-f}.js` 與 acceptance 一致
- [X] T033 [US2] 確認既有測試 `tests/dujs/paramsandnew.js`、`tests/dujs/classfields.js`、`tests/dujs/modelbuilder.js`（含既有 `f()` 連結相關測試；Fable 原型 `FSTRICT` 實測無變化）全過；失敗者依全程規則處理
- [X] T034 [US2] Golden（序列化）：既有三個 case 預期零差異（`new P(1)` 等若出現在既有 fixture 而產生差異，逐處確認屬 FR-002 後記錄）；`expected-fixes004/` 的 §21 差異（L8 `new` 敘述、L15–L18 欄位與 constructor）逐處判讀、更新 manifest（新增的 inter-procedural 模型檔加入 `baseline`）；填 `golden-diff.md` §21、§21 的子節「FR-018」（明載「呼叫規則統一：既有 golden 無差異」，Fable 原型 `FSTRICT`／`RELAX=i` 實測）與 §7 的「FR-017」子表（欄位 `new B()` 會連；fixture 未涵蓋則寫「無差異」）及 T028 的「單元測試期望」
- [X] T035 [US2] US2 閘門（全程規則的閘門指令；golden 檢查 `tests/golden/manifest.json`、`specs/004-fix-remaining-issues/golden-diff.md`）

**Checkpoint**: US2 完成——`new` 敘述連到建構函式／欄位＋constructor（SC-002 的 §21）；呼叫解析統一為嚴格規則、class 放寬（FR-018）；US3 可開始。

---

## Phase 5: User Story 3 - class 方法呼叫連到方法本體 (Priority: P2)（依賴 US2）

**Goal**: 依 D2 四種形式（`new A().m()`、`A.s()`、`this.m()`、`o.m()`）解析方法呼叫；呼叫環以階層**回邊**表示（DFS 堆疊判定、開放模型不登記），取代「遇環丟錯」；`hierarchy.dot` 畫回邊；事件 handler 查找優先採頁面為根的 inter-procedural 模型（U3＝(a)）；class 成員內的 `new A()`／`A.s()` 依 FR-018 放寬連結（constructor 內 `new A()` 成環）（FR-004、FR-005、FR-015、FR-016（US3 情境）、FR-017、FR-018、research R2、R5）。

**Independent Test**: `npx mocha tests/dujs/methodcalls.js tests/dujs/callcycles.js tests/dujs/expansion.js tests/dujs/hierarchy.js tests/dujs/hierarchydot.js`；acceptance US3 #1–#12（#8–#12 對應 FR-015、FR-016 表與「FR-017／FR-018」表）、Edge cases；`cyc-*`、`ctor-cycle` 不拋錯（SC-006）。

### 測試（先寫，須先失敗）

- [X] T036 [P] [US3] 新增 `tests/dujs/methodcalls.js`（MIT）：acceptance US3 #1–#7（`us3-1.js`…`us3-7.js`）斷言 `result.intraPage()` 完整 pair 與 inter 清單（#5 依登記順序逐一斷言四個模型與 `[P.$A1, P.$A2]`、`[P.$A3, P.$A2]` 模型的 pair；#7 斷言 inter 模型的 pair 與 intra-page 相同）；Edge cases：`edge-static-this.js`（只連 static `m`）、`new A().m()` 且 A 無 constructor 無欄位（只連 `m`）、`o.m()` 的 `m` 為 getter／setter 或欄位中的箭頭函式（不連，pair 同修正前）；README 不連結形式各一例（`this.#m()`、`o?.m()`、`o['m']()`、`new ns.A().m()`、箭頭函式與一般 `function` 內的 `this.m()`、`var o = new A(); o.p = 1; o.m();`、函式內 `var A = class {...}` 的 `A.s()`）斷言不連；函式內對全頁唯一 class 宣告的 `A.s()` 斷言**連結**（FR-018 class 放寬；與 T087 的 handler 情境互補）；`new F().m()`（F 為函式）只連 `F`；FR-017 欄位 `f = this.m();` 連 `m`（`us3-5` 已涵蓋）
- [X] T037 [P] [US3] 新增 `tests/dujs/callcycles.js`（MIT）：acceptance「FR-015」表 `cyc-1.js`、`cyc-2.js`、`cyc-3.js`、`ctor-cycle.js`（constructor 內 `new A()` 成環：constructor 模型 `[P.$A0]` 7 節點、L6 回邊）、`cyc-uncond.js`（無條件遞迴：intra-page 只有 `A: L2 -> L8`、`x: L5 -> L9`，測試註解寫明 research P8 的死碼成因）——intra-page 完整 pair，並逐一斷言每個 inter-procedural 模型的 relatedScopes、扁平圖節點數、階層中 `back: true` 呼叫邊（呼叫點行號與目標）、pair（cyc-2 的 inter[0]／[1]／[2] 依 research R5.3）；acceptance「FR-016」表 `byp-3.js`（intra-page 與 `[P.$A1, P.$A0]` 模型）；SC-006：上列全部分析完成不拋錯，且 `cyc-3` 有 `t: L4 -> L6`；plan 風險 2：頁面同時呼叫環上的 `m` 與 `n` 時，每個扁平圖中每個呼叫點原件至多一條呼叫邊；**U3**：讀 T006 複製的 `tests/dujs/cases/probes004/cyc-handler.js` 與對照組 `cyc-handler-nocyc.js`，依 acceptance「FR-015」表斷言兩者的 intra-page 模型都接上 handler `h`（LOOP 的 onEvent 目標含 `h` 的 entry；節點數 24／23）、完整 pair 與 inter 清單，且 `interProceduralScopes()` 順序如表（M、頁面、N）

- [X] T038 [US3] `tests/dujs/hierarchy.js` 新增回邊測試：`addCallEdge(model, {callSite, calleeModel, back: true})` 的 edge `back === true`、callee 單位 `kind: 'function'` 且**不**在 `hierarchy.units`、`relatedScopes` 加入目標（不重複）、`calleeModel` 為 inter-procedural 模型（有 hierarchy）時拋錯；`openTargetsOf`（子樹回邊目標 − 子樹 main scope；封閉為 `[]`）、`hasBackEdge`（contracts/model-api §1）
- [X] T039 [US3] `tests/dujs/expansion.js`：既有 `call cycle` 測試（約 1026–1041 行）改為斷言 `/^model cycle in hierarchy: /`（標題同步改為 model cycle；記下供 T050 列入 golden-diff §7「單元測試期望」）；新增：回邊的 `nodeOrder` 只插入 CALL（決策前時）與 CALL RETURN、不重複插入被呼叫端節點；`call` 邊指向已存在的 entry 複本、`return` 邊自已存在的 exit 複本；回邊也產生 bypass 記錄；`openTargetsOf` 非空的手建模型 `expand` 拋 `/^open hierarchy: back call edge to /`（contracts/model-api §2）
- [X] T040 [US3] `tests/dujs/hierarchydot.js`：`cyc-1` 的 `m` 模型有 `h0 -> h0` 的 `recursive call`（`color="blue", style="bold"`）與 `recursive return`（`color="blue", style="bold,dashed"`）；`cyc-2` 的 M 依 contracts/output.md §2 範例（行序以實際輸出鎖定）；同一對 scope 的 `call` 與 `backCall` 並存；沒有回邊的模型輸出逐位元組不變

### 實作
- [X] T087 [US3] 在 `tests/dujs/methodcalls.js` 新增 acceptance「FR-017／FR-018」表的 `handler-new.js`（事件 handler 內 `new A(); A.s();` 依 class 放寬連上：intra-page 完整 pair 含 `x: L7 -> L13`、無 `x: L1 -> L13`；inter `[[P.onClick, P.$A0, P.$A1]]`）；確認失敗

- [X] T041 [US3] `lib/dujs/callresolver.js`：`calleeScopesOf` 加入 `new A(...).m(...)`（欄位＋constructor＋`m`；`new F().m()` 只連 `F`）、`A.s(...)`（static 方法）、`this.m(...)`（節點最近的函式 scope 是 A 的成員 scope；非 static 成員找實例方法、static 成員找 static 方法；不考慮子類覆寫）、`o.m(...)`（`o` 的到達定義至少一筆且每筆 range 都是同一 class 的 `new A(...)`；只連 `m`，不連 constructor）；其餘形式回傳 `[]`（research R2 表）
- [X] T042 [US3] `lib/dujs/hierarchy.js`：`addCallEdge` 支援 `back`（目標必須是 intra-procedural 模型）；新增 `openTargetsOf(model)`、`hasBackEdge(model)`（contracts/model-api §1、data-model §3）
- [X] T043 [US3] `lib/dujs/expansion.js`：回邊的展開順序（只插入 CALL／CALL RETURN）、重播沿用 `replayCall`；`openTargetsOf` 非空拋 `open hierarchy: back call edge to <scope> outside the model`；原 `checkCycle` 訊息改為 `model cycle in hierarchy: <scope 名稱鏈>`（research R5.4）
- [X] T044 [US3] `lib/dujs/modelbuilder.js`：`getInterProceduralModelStartFromTheScope(scope, scopeTree[, stack, built])` 實作 research R5.2 四條規則（在 stack → 回邊；在 built → 重用；已登記且無回邊 → 重用；否則遞迴）；登記條件改為「有 hierarchy 且封閉、該 scope 尚未登記」；開放模型不登記、不展開；`buildInterProceduralModels` 略過條件改為「已有登記模型，或曾被建過且沒有呼叫邊」；`_testonly_` 舊兩參數呼叫等同 `stack = []`、`built = new Map()`（contracts/model-api §7）
- [X] T045 [US3] `lib/dujs/modelbuilder.js` 的 `reachInsForHandlerLookup`（約 401–415 行）：優先取以頁面 scope 為 `mainlyRelatedScope` 的 inter-procedural 模型中有結果者，沒有才退回現行「最後一個有結果者」，再退回原件 `reachIns`（plan U3＝(a)）；更新 JSDoc
- [X] T046 [US3] `lib/dujs/hierarchydot.js`：`EDGE_ATTRIBUTES` 新增 `backCall`、`backReturn`；`collectCalls` 遇 `edge.back === true` 時畫 `caller → callee` backCall 與 `callee → caller` backReturn、不往下遞迴；去重鍵含 kind（contracts/output.md §2）
- [X] T047 [US3] T036–T040、T087 全過；`node specs/004-fix-remaining-issues/probes/run.js specs/004-fix-remaining-issues/probes/{us3-1,us3-2,us3-3,us3-4,us3-5,us3-6,us3-7,cyc-1,cyc-2,cyc-3,ctor-cycle,cyc-uncond,cyc-handler,cyc-handler-nocyc,handler-new,byp-3,edge-static-this,fn-rec}.js` 與 acceptance 一致
- [X] T048 [US3] 確認 `tests/dujs/modelbuilder.js` 中 handler 相關測試（003 T033 的 R8 測試、`_reachInsForHandlerLookup`）仍通過；若 T045 改變其「最後分析者」斷言，確認屬 U3 的必然結果並記下供 T050 列入
- [X] T049 [US3] 在暫存目錄以 CLI 跑 `tests/dujs/cases/probes004/cyc-2.js`：exit 0，`page0/inter-procedurals/*.hierarchy.dot` 含 `recursive call`／`recursive return`（SC-006）
- [X] T050 [US3] Golden（序列化）：既有三個 case 預期零差異；`expected-fixes004/` 的 §7 差異（L35–L38 方法呼叫）、FR-015（`add`↔`bump` L21／L27 回邊、新增 inter-procedural 模型與 `.hierarchy.dot` 回邊）、FR-016（L19–L23）逐處判讀、更新 manifest；填 `golden-diff.md` §7 主表與 FR-015／FR-016／FR-017 子表（既有三個 case 若因 FR-018 的 class 放寬有差異，記在 §21 的 FR-018 子節）；「單元測試期望」列 `tests/dujs/expansion.js` `call cycle` → `model cycle`（T039）與 T048 若有的修改
- [X] T051 [US3] US3 閘門（全程規則的閘門指令；golden 檢查 `tests/golden/manifest.json`、`specs/004-fix-remaining-issues/golden-diff.md`）

**Checkpoint**: US3 完成——方法呼叫連結、遞迴不再失敗且呼叫端區域變數 pair 保留（SC-002 的 §7、SC-006）。

---

## Phase 6: User Story 4 - 參數、解構預設值與 class 名稱的 use 不再漏掉 (Priority: P2)

**Goal**: 參數預設值中的函式成為子 scope；class 宣告名稱的定義留在 class 節點再進 static 成員；有外層預設值的解構參數外層只求值一次、內層名稱只定義一次（FR-006、FR-007、FR-008、research R4、R7、R8）。

**Independent Test**: `npx mocha tests/dujs/paramdefaults.js tests/dujs/classfields.js tests/dujs/paramsandnew.js`；acceptance US4 #1、#1'、#2–#6（`us4-5b` 的 `h` 為 5 節點）。

### 測試（先寫，須先失敗）

- [X] T052 [P] [US4] 新增 `tests/dujs/paramdefaults.js`（MIT）：acceptance US4 #1（`us4-1b.js`：scope 清單 `P, P.f, P.f.$ANONYMOUS_FUN_0`、intra-page pair 含 `d: L1 -> L3`、inter 清單）、#1'（`us4-1.js` KI §10 原程式 `return g();`：只斷言箭頭函式是 scope 且其 intra-procedural 模型存在、pair 不變、**不連結**——plan U1＝A）、#2（`us4-2.js`）、#5（`us4-5b.js`：intra-page pair、`h` 的 intra-procedural 5 個節點依序 entry、外層預設值求值節點（GEN 空）、`x = d`（GEN `x`）、`y = x`（GEN `y`）、exit；entry 以外 `x`、`y` 各只定義一次）、#5'（`us4-5.js` 單行：5 節點、以節點物件比對 `x` 的定義節點到 `y` 的定義節點有 pair）、#6（`us4-6b.js` 不變，4 節點）；巢狀 `{a: {b = 1} = E} = D` 的初始化節點依序為 `D`、`E`、`b = 1`（data-model §6）
- [X] T053 [P] [US4] `tests/dujs/classfields.js`：新增 acceptance US4 #3（`us4-3.js` static block：`Q: L1 -> L3`、`Q: L1 -> entry` 等完整清單）、#4（`us4-4.js` `static s = Q;`）；Edge cases `var B = class { static s = B; }`、`var B = class Q { static s = Q; }` 不產生 `B`／`Q` 在 static 成員中的 pair；既有 92 行測試「should chain static members in source order and define the class after them」斷言（`D: L2 -> L8`）不動，只把標題與註解改為「class 名稱在 static 成員之前定義」（research R4；記下供 T061 列入）
- [X] T054 [US4] `tests/dujs/paramsandnew.js` 約 140–152 行：「should not analyze a default value which is an arrow function again」改為斷言新行為——預設值箭頭函式是 scope `f.$ANONYMOUS_FUN_0`（R7；標題與註解同步；記下供 T061 列入 golden-diff §10「單元測試期望」）
- [X] T055 [US4] `tests/dujs/hierarchy.js` 與 `tests/dujs/expansion.js`：`addCallEdge(..., {keepGenerateAtCallSite: true})` 的 edge 欄位；展開時呼叫點（類型改為 CALL）保留 GEN、CALL RETURN 的 GEN 為空 Set；未設旗標時行為同前（contracts/model-api §1–§2）

### 實作

- [X] T056 [US4] `lib/dujs/scopetree.js`：`visitFunctionBody` 在本體前於函式 scope 內走訪 `node.params`，使預設值（含解構中）的函式／箭頭函式成為子 scope（research R7）
- [X] T057 [US4] `lib/dujs/modelbuilder.js`：`collectParameterDefaults`／`getFunctionBodyStatement` 依原始碼前序展開——`AssignmentPattern` 左側為 Identifier → `name = default` 節點（不變）；左側為 pattern → 先一個只求值外層預設值的 `ExpressionStatement`（range／loc 取預設值）再遞迴收集巢狀預設值（research R8）
- [X] T058 [US4] `lib/dujs/hierarchy.js`（`addCallEdge` 接受並凍結 `keepGenerateAtCallSite`）與 `lib/dujs/expansion.js`（`replayCall` 非決策分支：呼叫點 GEN 留在呼叫點、類型改 CALL、CALL RETURN GEN 為空 Set）
- [X] T059 [US4] `lib/dujs/modelbuilder.js`：節點 astNode 為 `ClassDeclaration`（或 `export` 包住且有名稱的 `ClassDeclaration`）時，其 static 成員呼叫邊設 `keepGenerateAtCallSite: true`；class 運算式不設（Fable A7）
- [X] T060 [US4] T052–T055 全過；`node specs/004-fix-remaining-issues/probes/run.js specs/004-fix-remaining-issues/probes/us4-*.js` 與 acceptance 一致；若 US3 同時進行，先確認 `modelbuilder.js`／`hierarchy.js`／`expansion.js` 的改動已合併
- [X] T061 [US4] Golden（序列化）：既有三個 case 預期零差異（R4、R7）；`expected-fixes004/` 的 §11（L11–L14）、§17（L42–L45）、§10（L46–L48）差異逐處判讀、更新 manifest；填 `golden-diff.md` §10、§11、§17；「單元測試期望」：§10 列 `tests/dujs/paramsandnew.js` 約 148 行（T054）、§11 列 `tests/dujs/classfields.js` 92 行標題（T053）
- [X] T062 [US4] US4 閘門（全程規則的閘門指令；golden 檢查 `tests/golden/manifest.json`、`specs/004-fix-remaining-issues/golden-diff.md`）

**Checkpoint**: US4 完成——SC-002 的 §10、§11、§17。

---

## Phase 7: User Story 5 - CLI 有 help，失敗時 exit status 非零 (Priority: P2)

**Goal**: `lib/dujs/cli.js` 以 `util.parseArgs` 解析；help 優先、用法錯誤 exit 2、執行錯誤 exit 1；先讀完檔才建目錄；`mkdirSync`＋`_<n>` 保證唯一；失敗刪目錄（FR-009、FR-010、research R10、contracts/cli.md）。

**Independent Test**: `npx mocha tests/dujs/cli.js`；contracts/cli.md §4 的 US5-1…US5-5、SC-004、SC-005；quickstart §3 手動檢查。

### 測試（先寫，須先失敗）

- [X] T063 [P] [US5] 新增 `tests/dujs/cli.js`（MIT）單元層級：以注入 `io`（stdout／stderr 收集器、暫存 `cwd`）呼叫 `cli.run(argv, io)`，覆蓋 contracts/cli.md §1 表 #1–#8（含 `-x --help` 走 help、`-hj` 為未知選項、`--js=a.js` 未知、`a.js -js b.js`、結尾 `-js`／`-js -js`／`-js --`、`--` 後檔名 `-js`）的回傳值、stdout／stderr、是否建目錄；錯誤訊息逐字（`dujs: ` 前綴、單行，用法錯誤後空一行接 usage）、usage 全文逐字；#6 讀檔失敗時不建目錄；#7 以 stub 讓 `defuseAnalysisExecutor.initialize` 拋錯，斷言目錄建後刪除、訊息 `analysis failed: <message>`
- [X] T064 [US5] 在 `tests/dujs/cli.js` 新增：`OutputWriter` 的 `ROOT_OUTPUT_DIR` 在 `createRootOutputDirectory()` 前讀取拋錯、之後為實際名稱；名稱已存在時依序用 `_1`、`_2`，不覆寫既有目錄；`report.html` 的 `<img src="../<目錄>/...">` 用實際名稱（contracts/cli.md §3）
- [X] T065 [US5] 在 `tests/dujs/cli.js` 新增子行程驗收（`spawnSync`／`spawn` 執行 `bin/dujs.js`，cwd 為暫存目錄）：contracts/cli.md §4 的 US5-1、US5-2、US5-3（`missing.js` 未建目錄；`bad.js` 內容為語法錯誤 `var a = ;`：exit 1、stderr 含 `dujs: analysis failed:`、執行後 cwd 沒有 `out-*`——SC-004 的「分析錯誤」，**以子行程執行 `bin/dujs.js`，不得以 stub 代替**，cli.md §4）、US5-4／SC-005（同一 cwd 同時啟動兩次、重複 10 次：每次兩者 exit 0、各新增 2 個不同 `out-*` 目錄、檔案清單相同、`report.html` 引用自己的目錄）、US5-5（exit 0、stderr 空）；mocha timeout 依實測設定

### 實作

- [X] T066 [US5] `lib/dujs/outputwriter.js`：新增 `createRootOutputDirectory()`（`fs.mkdirSync` 非 recursive；`EEXIST` 時試 `名稱_1`、`_2`……；基本名稱 `out-<YYYY>-<MM>-<DD>-<H>-<M>-<S>` 於執行開始時計算）；`ROOT_OUTPUT_DIR` 改為 getter（建立前讀取拋錯）
- [X] T067 [US5] `lib/dujs/reportgenerator.js`：`report.html` 路徑與 `<img src>` 改用 `ROOT_OUTPUT_DIR` 的實際名稱（不再讀載入時常數）
- [X] T068 [US5] 新增 `lib/dujs/cli.js`（MIT，ES5）：`run(argv, io)` 依 contracts/cli.md §1–§2（`--` 前的 `-js` 對映 `--js`；先掃 help；`parseArgs({strict: true, allowPositionals: true, tokens: true})`；依 tokens 分頁；讀完所有檔（`sourceReader.getSourceFromFiles`）→ 建目錄 → 既有四階段分析與寫出 → `reportGenerator.createReport()`；例外時 `fs.rmSync(目錄, {recursive: true, force: true})`）；usage 文字逐字照 cli.md §1；不再輸出 `*** ERROR: ... ***`
- [X] T069 [US5] `bin/dujs.js` 改為只呼叫 `require('../lib/dujs/cli').run(process.argv.slice(2))` 並設定 `process.exitCode`；刪除 `lib/dujs/inputreader.js`（先 `grep -rn "inputreader" lib bin tests` 確認除 `bin/dujs.js` 外無使用者）
- [X] T070 [US5] `tests/golden/golden.js` 約 145 行註解「the CLI reports failures on stderr but still exits with 0」更新為新行為（失敗 exit 非零）；若該處有依 exit 0 的斷言，確認仍正確（記下供 T072 列入 golden-diff §12「單元測試期望」）
- [X] T071 [US5] T063–T065 全過；依 quickstart §3 在暫存目錄手動檢查（help、無參數、`-js -js a.js`、`missing.js`、並行 3 次產生 6 個不同目錄）
- [X] T072 [US5] Golden（序列化）：四個 case 預期全部零差異（US5-5）；填 `golden-diff.md` §12：四個 case「無差異」、目錄名稱規則說明（`_<n>`）、「單元測試期望」列 T070
- [X] T073 [US5] US5 閘門（全程規則的閘門指令，含 `tests/golden/manifest.json`、`golden-diff.md` 檢查；另確認 `npm test` 時 cwd 沒有殘留 `out-*`）

**Checkpoint**: US5 完成——SC-004、SC-005、SC-002 的 §12。

---

## Phase 8: User Story 6 - 拆分節點的標籤與 for-in／for-of 邊界情形 (Priority: P3)

**Goal**: 拆分呼叫點的 CALL RETURN 標籤帶分支路徑（兩種轉換器）；for-in／for-of 右側拆分時無 range 的前驅以支配關係判定（FR-011、FR-012、research R9、R11、contracts/output.md §1）。

**Independent Test**: `npx mocha tests/dujs/cfggraphconverter.js tests/esgraph/branchsplitlooppred.js`；acceptance US6 #1–#4、#3'。

### 測試（先寫，須先失敗）

- [X] T074 [P] [US6] 新增 `tests/dujs/cfggraphconverter.js`（MIT）：acceptance US6 #1——`us6-1.js`（`log(c ? a : b);`）的 inter-procedural 模型以 `toDotWithLabelLine` 轉換得 `callReturn (<line>:T)`、`callReturn (<line>:F)`（行號依轉換器輸入；CLI 輸出為 `callReturn (5:T)`／`(5:F)`），以 `toDotWithLabelLoc` 得 `callReturn (L4:C0:T)`、`callReturn (L4:C0:F)`；pair 不變；#2——未拆分呼叫點（一律用 `f();` 呼叫敘述，不依賴 US2）標籤與修正前相同（`callReturn`、同名 `_a`／`_b`；loc 版 `callReturn (L<line>:C<col>)`）；其他節點（含 CALL）標籤不變
- [X] T075 [P] [US6] 新增 `tests/esgraph/branchsplitlooppred.js`（MIT）：#3——手建 CFG，for-of 右側拆分，本體中一個前驅的 `astNode` 沒有 range，拆分後該前驅的邊仍指向 loop 節點；#3'——無 range 的前驅在迴圈外（外層 `while` 經 `break` 可繞回、從 entry 不經 loop 可達），被重導到右側決策；#4——`us6-4.js` 的頁面 intra-procedural pair 與 acceptance 相同（不變）

### 實作

- [X] T076 [US6] `lib/dujs/cfggraphconverter.js`：CALL RETURN 的 `labelPath` 非空時，line 版標籤 `callReturn (<line>:<path>)`（同名仍加 `_a`、`_b`，去重在之後執行）、loc 版 `callReturn (L<line>:C<col>:<path>)`；`<path>` 取 `branchLabel.pathOf(node)`；`labelPath` 空者完全不變
- [X] T077 [US6] `lib/esgraph/branchsplitter.js`（MIT）：`isInsideLoopBody(prev, loop, entryNode)`——有 range 維持範圍判定；無 range 時從 entry 不經 loop 節點做可達性走訪（每次拆分最多一次），不可達才算本體內；`split` 傳入 entry
- [X] T078 [US6] Golden（序列化）：既有三個 case 預期零差異（R9、R11）；`expected-fixes004/` 的 §15（L41）差異（dupairs 中 CALL RETURN 標籤）逐處判讀、更新 manifest；填 `golden-diff.md` §15（四個 case）與 §14（四個 case「無差異」、「單元測試期望」列 `tests/esgraph/branchsplitlooppred.js` 新增）
- [X] T079 [US6] US6 閘門（全程規則的閘門指令；golden 檢查 `tests/golden/manifest.json`、`specs/004-fix-remaining-issues/golden-diff.md`）

**Checkpoint**: US6 完成——SC-002 的 §15，§14 以單元測試驗證。

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T080 [P] `docs/known-issues.md`（FR-014）：§7、§10、§11、§12、§14、§15、§17、§20、§21 標題加「fixed by `004-fix-remaining-issues`」並在節內註明修法，保留原始描述；§10 註明 KI 原程式的 `return g();` 仍不連結（只成為 scope）；§16 註明「後果段（參數名遮蔽外層變數時外層變數的 use 消失）已由 FR-016 修正」；新增一節（接在 §21 之後，標題含「found by `004-fix-remaining-issues`」），記錄一項行為改變與三項後續：(0) `f()` 改為嚴格規則（FR-018）：到達定義指向不同函式（或混合非函式值）時不再連結，附 `probes/mix-f.js` 的修正前（`x: L3 -> L11`）與修正後（`x: L1 -> L11`）；(1) 屬性賦值 `o.p = 1` 被當成 `o` 的 def（應為 `o.p` 的 def 與 `o` 的 use，另開 feature），附 `var o = new A(); o.p = 1; o.m();` 不連的例子；(2) 具名 class／函式運算式的內部名稱（`var B = class Q {...}` 的 `Q`）不是變數，`static s = Q` 無 pair；(3) `return f()` 等包在其他運算式中的呼叫也應視為 call-site（plan U1 後續項目，附 KI §10 原程式為例）；更新檔頭索引／分組（若有）
- [ ] T081 [P] `README.md`（FR-014）：限制段更新——新增的連結形式（`new F()`／`new A()` 敘述、`new A().m()`、`A.s()`、class 成員內的 `this.m()`、`o.m()`、欄位初始化式本身為 `this.m()` 或 `new B()`）；不連結形式（spec Clarifications M5 清單：private、optional call、computed／字串方法名、getter／setter、欄位中的箭頭函式、`new ns.A()`、`new (f())()`、箭頭函式與一般 `function` 內的 `this.m()`、函式內 `var A = class {}` 的 `new A()`／`A.s()`、函式內的 `f()`／`new F()`、`o` 來源混合或中間有屬性賦值、`x = new F()` 等包在運算式中的呼叫）；函式內對全頁唯一 class 的 `new A()`／`A.s()` 會連（FR-018 class 放寬，含欄位 `f = new B();`、事件 handler 內），但 `var A = class {}` 與函式的 `f()`／`new F()` 在函式內不連（不對稱）；放寬**不看執行順序**（`function g() { new A(); }` / `g();` / `class A {...}` 也連，實際執行會因 TDZ 拋錯）；混合定義的 `f()` 不連（FR-018 嚴格規則）；MDN bouncing balls 類寫法（`const ball = new Ball()` 宣告、for-of 綁定的 `ball.draw()`）仍不連；`var o = new A()` 不連 constructor 而 `o.m()` 會連的不對稱；不追 super 鏈（欄位與方法）且有 `extends` 時近似為「先欄位、後 constructor 本體」；遞迴以迴圈路徑（回邊）表示，並註明無條件遞迴之後的節點從 entry 不可達（死碼）：被呼叫端看得到的外層變數 pair 會消失、不可達環內的定義仍會流出（`x: L5 -> L9`，research P8）、被 bypass 的區域變數 pair 保留（quickstart §4）；Usage 段改為 CLI 用法（contracts/cli.md §1 usage 與 exit status 0／1／2、輸出目錄 `out-…[_<n>]`）；golden 說明段加入 `expected-fixes004/`
- [ ] T082 [P] `specs/003-hierarchical-models/contracts/model-api.md` §2、§3 與 `specs/003-hierarchical-models/data-model.md` §4 對應段落各加一行「已由 `specs/004-fix-remaining-issues/contracts/model-api.md` 修訂」
- [ ] T083 `golden-diff.md` 定稿（序列化）：每節四個 case 皆有列或「無差異」；以 node 腳本（放暫存目錄、不入庫）比對 `git -C <專案根> show <Setup commit>:tests/golden/manifest.json` 與目前 `manifest.json`，每個變更、新增、刪除的鍵都在 `golden-diff.md` 有對應列（SC-003）；「單元測試期望」與 plan Constraints 清單一致；「驗收預期更正」節完整
- [ ] T084 全量驗證：quickstart §2 全部指令；`node specs/004-fix-remaining-issues/probes/run.js` 實跑結果與 acceptance 全表一致（逐列核對）；`npx c8 npm test` 確認 `lib/dujs/callresolver.js`、`lib/dujs/cli.js` 與修改處有覆蓋；`npm run lint` 0 錯誤、`eslint-suppressions.json` 119 筆；`git -C <專案根> diff ff45928 HEAD -- lib/esgraph/index.js lib/esgraph/dot.js lib/analyses` 為空；`lib/dujs/inputreader.js` 已刪除；SC-001 對照：spec 每個驗收情境（US1-1…US6-4，含 US2-6／7、US3-8…12、Edge Cases）都能指到一個測試
- [ ] T085 準備 PR（目標 `develop`）：以 Skill `mattpocock-skills:pr` 撰寫內容，必含 (1) golden 差異摘要與 `golden-diff.md` 連結；(2) 既有測試修改清單（golden-diff 各節「單元測試期望」）；(3) 驗收預期更正（若有）；(4) plan 裁決 U1／U3 的落實、analyze 裁決（H3 對 class 放寬取代 U2、呼叫解析統一為嚴格規則 FR-018 的行為改變）與 known-issues 新增的節；(5) 003 契約修訂（回邊取代遇環丟錯）；(6) CLI 行為變更（exit status、輸出目錄唯一化）；(7) 連結 spec（憲章 §CP-5）。PR 由 orchestrator 建立

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：無依賴；**必須**在任何 `lib/` 變更前完成並提交（T008 後的 commit 為比對基準）
- **Foundational (Phase 2，FR-016)**：依賴 Setup；阻塞 US2、US3（方法／constructor 連結需要 bypass）。US1、US4、US5、US6 技術上不依賴 FR-016，但 golden 基準以 Foundational 完成後為準，依 plan 順序一律排在其後
- **US1 (Phase 3)**：依賴 Foundational（與 T014 同改 `defuseanalyzer.js`）
- **US2 (Phase 4)**：依賴 Foundational
- **US3 (Phase 5)**：依賴 US2（`new A().m()` 需要建構連結與 class 索引、`callresolver.js` 已存在）
- **US4 (Phase 6)**：依賴 Foundational；與 US3 都改 `lib/dujs/modelbuilder.js`、`hierarchy.js`、`expansion.js`，同時進行時須協調（建議 US3 完成後再做 T057–T059）
- **US5 (Phase 7)**：依賴 Setup／Foundational 基準；檔案不重疊，可與任何 story 並行
- **US6 (Phase 8)**：同 US5（T074 的 #2 一律用 `f();`，不依賴 US2）
- **Polish (Phase 9)**：依賴所有 story 完成

### Golden 寫入順序（不得並行）

T004 → T005 → T007 → T016 → 各 story 的 golden 任務依**完成順序**逐一執行（T024、T034、T050、T061、T072、T078，同一時間只有一個）→ T083。並行開發的 story 在進入 golden 任務前須等待前一個 golden 任務完成並 `npm test` 全綠。

### Within Each Story

- 測試任務（先寫、確認 red）→ 實作 → 驗證 → golden（序列化）→ 閘門
- US1：T018 ∥ T019；T019 → T020（同檔）；T021 → T022 → T023 → T024 → T025
- US2：T026 ∥ T027 ∥ T086（同檔 `newcallsite.js`，若同一人執行則依序）；T029 → T030 → T031 → T032 → T033 → T034 → T035
- US3：T036 ∥ T037；T038、T039、T040 各自檔案可並行；T087 在 T036 之後（同檔 `methodcalls.js`）；T041 → T042 → T043 → T044 → T045 → T046 → T047 → T048 → T049 → T050 → T051
- US4：T052 ∥ T053；T054、T055 依序；T056 → T057 → T058 → T059 → T060 → T061 → T062
- US5：T063 → T064 → T065（同檔）；T066 → T067 → T068 → T069 → T070 → T071 → T072 → T073
- US6：T074 ∥ T075；T076 ∥ T077（不同檔）→ T078 → T079

### Parallel Opportunities

- Setup：T006 可與 T002–T005 並行
- 跨 story：Foundational 完成後，{US1}、{US2 → US3}、{US5}、{US6} 四條線檔案不重疊，可並行；US4 與 US3 共用 `modelbuilder.js`／`hierarchy.js`／`expansion.js`，建議接在 US3 之後或協調合併
- Polish：T080 ∥ T081 ∥ T082

## Parallel Example: User Story 3

```text
Task: "T036 [P] [US3] tests/dujs/methodcalls.js 驗收測試（us3-1…us3-7、edge cases）"
Task: "T037 [P] [US3] tests/dujs/callcycles.js 驗收測試（cyc-1/2/3、ctor-cycle、cyc-uncond、byp-3、cyc-handler）"
```

## Parallel Example: 跨 story（Foundational 完成後）

```text
Task: "T018 [P] [US1] tests/dujs/conditionpuse.js"
Task: "T063 [P] [US5] tests/dujs/cli.js"
Task: "T074 [P] [US6] tests/dujs/cfggraphconverter.js"
Task: "T075 [P] [US6] tests/esgraph/branchsplitlooppred.js"
```

## Implementation Strategy

### MVP First

1. Setup（T001–T008）→ 提交基準
2. Foundational（T009–T017）
3. US1（T018–T025）→ **停下驗證**：acceptance US1、golden 只有 §20 差異 → 可交付 MVP

### Incremental Delivery

1. Setup → Foundational → US1（MVP）→ US2 → US3 → US4 → US5 → US6 → Polish／PR
2. 每個 story 結束：閘門全綠、golden-diff 對應節完成，即可由 orchestrator commit

## Notes

- 任何閘門失敗：先依「全程規則」判讀（推導錯誤 vs 實作偏離）；不得以 `UPDATE_GOLDEN` 放行未記錄的差異，不得只改預期迎合結果
- 既有三個 golden case 出現無法對應到修正的差異、或 plan Constraints 以外的既有測試必須修改 → 停下請使用者裁決
