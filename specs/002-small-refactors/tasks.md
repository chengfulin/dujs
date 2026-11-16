---

description: "Task list for 002-small-refactors"
---

# Tasks: 三項小型重構（拆分 branchsplitter、FlowNode 分支欄位、usedExpressionsOf）

**Input**: Design documents from `/specs/002-small-refactors/`

**Prerequisites**: plan.md、spec.md、research.md（R1–R9）、data-model.md、contracts/internal-modules.md、quickstart.md

**Tests**: spec 明定需要（FR-003、FR-008、US2 獨立測試）。本 feature 是純重構，新測試採 **characterization**：預期值取自
重構前行為，測試先在現行程式上跑綠燈，再搬移／改寫，重構後必須維持綠燈。不得以 `UPDATE_GOLDEN=1` 處理 golden 失敗。

**Organization**: 依 user story 分 phase；依 spec Assumptions，US1 → US2 → US3 依序進行（後者建立在前者的程式上），
每個 story 結束時 golden 逐位元組相同，各自一個 commit。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行（不同檔案、不依賴未完成任務）
- **[Story]**: US1／US2／US3

## Path Conventions

單一專案：`lib/`、`tests/` 位於 repo 根。路徑皆相對於 repo 根。

## 共同驗證（每個 story 的驗證任務都指這組，來源 quickstart.md「共同檢查」）

```bash
npm test                                                   # 全部通過、數量 ≥ 640 ＋ 已新增測試；含 golden
FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js
npm run lint                                               # 0 錯誤
git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests   # 無輸出
```

---

## Phase 1: Setup（基線與測試腳本）

**Purpose**: 記錄基線、讓新測試檔自動納入 `npm test`

- [ ] T001 記錄基線：執行 `npm test`（預期 640 passing）、`npm run lint`（0 錯誤）、`git status tests/golden` 乾淨，並記下 `eslint-suppressions.json` 現況（`git diff --exit-code eslint-suppressions.json` 作為之後比對基準）；不修改檔案
- [ ] T002 把 `package.json` 的 `test` 腳本中逐檔列出的 `tests/esgraph/flownodetest.js tests/esgraph/flownodefactory.js tests/esgraph/test.js` 改為 `"tests/esgraph/*.js"`（research R7；目錄頂層現恰為這三檔），重跑 `npm test` 確認仍為 640 passing 於 `package.json`

**Checkpoint**: 基線確立；`tests/esgraph/` 新增的測試檔會自動被執行

---

## Phase 2: Foundational

無。三個 story 依序進行，彼此的前置已含在各 story phase 內。

---

## Phase 3: User Story 1 - 分支拆分的三個工作各自成為模組 (Priority: P1) 🎯 MVP

**Goal**: `lib/esgraph/branchsplitter.js`（687 行）拆成 `decisionfinder.js`（只讀 AST）、`astrewriter.js`（複製改寫 AST）與
保留 graph 部分的 `branchsplitter.js`；依賴單向 `branchsplitter → astrewriter → decisionfinder`；`split(entryNode, { expressionThrows })` 不變。

**Independent Test**: 共同驗證全過；`npx mocha tests/esgraph/decisionfinder.js tests/esgraph/astrewriter.js` 只用 AST（不建 CFG）
驗證找條件與改寫結果；三檔皆 < 350 行，前兩者不 require `flownode*`。

### Characterization tests for User Story 1（先在現行程式上綠燈）

> 新模組在搬移前不存在：先暫時從 `branchsplitter.js` 匯出內部函式，讓測試在**未搬移的程式**上跑綠燈；搬移後只改 require 來源。

- [ ] T003 [US1] 在 `lib/esgraph/branchsplitter.js` 的 `module.exports` 暫時加入 `_testonly_: { findFirstDecision, preEvaluatedOf, isInert, isPlaceholder, placeholder, branchesOf, staticChoice, rewrite, branchRoot }`（純新增、不改任何函式本體；T011 移除）
- [ ] T004 [P] [US1] 撰寫 decision finder characterization 測試 `tests/esgraph/decisionfinder.js`：檔頭以單一變數 `subject = require('../../lib/esgraph/branchsplitter')._testonly_` 取得被測函式（T012 改指新模組）；AST 由 `lib/dujs/jsparser` 的 `parseAST` 取得；`findFirstDecision` 對 `searchByType` 每個 case 至少一例（contracts 清單：`ConditionalExpression`、`LogicalExpression` 的 `&&`／`||`／`??`、`AssignmentExpression` 的邏輯指派／複合指派→`compound` entry／一般 `=`、`SequenceExpression`、`TemplateLiteral`、`BinaryExpression`、`UnaryExpression`／`UpdateExpression`／`AwaitExpression`／`YieldExpression`／`SpreadElement`、`MemberExpression`（物件與計算鍵先求值→entries）、`CallExpression`／`NewExpression`（callee 隨葉、不入 entries）、`TaggedTemplateExpression`、`ArrayExpression`（含空洞）、`ObjectExpression`／`Property`（計算鍵）、`ImportExpression`、`ClassDeclaration`／`ClassExpression`（superClass、計算鍵；本體不搜尋）、`VariableDeclaration`（前面的宣告子→`remove`）、`ExpressionStatement`、`ReturnStatement`／`ThrowStatement`、`SwitchCase`、`ExportDefaultDeclaration`（運算式 vs 宣告）、default（識別字、可選鏈→null））；斷言 `{split, condition, ancestors, entries}` 的形狀與 entry `action`；`preEvaluatedOf`（含 `compound` 取 `node.left`）；`isInert` 各分支與 `isPlaceholder`；每例斷言輸入 AST 不被修改；測試標題或註解標示 characterization
- [ ] T005 [P] [US1] 撰寫 AST rewriter characterization 測試 `tests/esgraph/astrewriter.js`（同 T004 以 `subject` 變數取 `_testonly_`）：`branchesOf` 每個運算子（`?:`、`&&`、`||`、`??`、`&&=`、`||=`、`??=`，邏輯指派的賦值分支為合成 `=`）、`placeholder` 的 known 值與 range／loc、`staticChoice` 的已知值組合（truthy／falsy／nonnull／unknown）與回傳 null 的情況、`branchRoot` 三種 entry action（placeholder／remove／compound）、`rewrite` 路徑複製；每例以深度凍結或 JSON 快照斷言輸入 AST 不變，並斷言路徑外子樹與原 AST 為同一物件
- [ ] T006 [US1] 執行 `npx mocha tests/esgraph/decisionfinder.js tests/esgraph/astrewriter.js`，在**未搬移**的程式上全部綠燈（若失敗，修正測試的預期值使其反映現行行為，不改 lib）

### Implementation for User Story 1

- [ ] T007 [US1] 建立 `lib/esgraph/decisionfinder.js`：MIT 檔頭（沿用現行 `branchsplitter.js` 的 original dujs code 檔頭）；整段原樣搬入 `PLACEHOLDER_TYPE`、`LOGICAL_ASSIGNMENTS`、`STRUCTURAL_TYPES`、`isPlaceholder`、`isInert`、`findFirstDecision`（含 `searchByType` switch 原樣，D2）、`preEvaluatedOf`；匯出 `{findFirstDecision, preEvaluatedOf, isInert, isPlaceholder, PLACEHOLDER_TYPE}`；不得有任何 `require`（research R1）
- [ ] T008 [US1] 建立 `lib/esgraph/astrewriter.js`：MIT 檔頭；只 `require('./decisionfinder')`；整段原樣搬入 `REMOVED`、`NULLISH_OPERATORS`、`placeholder`、`shallowCopy`、`branchesOf`、`staticChoice`、`rewrite`、`branchRoot`，跨模組呼叫改加前綴；匯出 `{placeholder, branchesOf, staticChoice, rewrite, branchRoot}`（依賴 T007）
- [ ] T009 [US1] 縮減 `lib/esgraph/branchsplitter.js` 只留 graph 部分（`redirect`、`contextsOf`、`discriminantContexts`、`isInsideLoopBody`、`splitNode`、`reachableNodes`、`split`），require `./astrewriter`、`./decisionfinder`、`./flownode`、`./flownodefactory`；匯出維持 `{split, PLACEHOLDER_TYPE}`（後者 re-export decisionfinder）；`splitNode` 內 `create` 呼叫時機與次序、`reachableNodes` 走訪次序、`created.concat` 次序一律不動（research R3）（依賴 T008）
- [ ] T010 [US1] 確認 `lib/esgraph/index.js` 未修改（`git diff --exit-code lib/esgraph/index.js`），FR-011 LGPL 修改紀錄不觸發
- [ ] T011 [US1] 移除 T003 加入的 `_testonly_` 匯出於 `lib/esgraph/branchsplitter.js`（依賴 T009）
- [ ] T012 [P] [US1] 把 `tests/esgraph/decisionfinder.js` 的 `subject` 改為 `require('../../lib/esgraph/decisionfinder')`、`tests/esgraph/astrewriter.js` 的 `subject` 改為 `require('../../lib/esgraph/astrewriter')`（`isPlaceholder` 等跨模組者取自 decisionfinder），測試內容與預期值不變
- [ ] T013 [P] [US1] 在 `THIRD_PARTY_NOTICES.md` §1 original dujs code (MIT) 清單加入 `lib/esgraph/decisionfinder.js`、`lib/esgraph/astrewriter.js`

### Verification for User Story 1

- [ ] T014 [US1] 執行共同驗證：`npm test` 全過（≥ 640 ＋ T004/T005 新增數）、golden 0 差異、`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js` 通過、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出；golden 失敗一律回頭修程式（節點建立順序），不得 `UPDATE_GOLDEN`
- [ ] T015 [US1] SC-003／FR-001 量測：`wc -l lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js lib/esgraph/branchsplitter.js` 三檔皆 < 350 行；`grep -n "require(" lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js` 顯示 decisionfinder 無 require、astrewriter 只 require `./decisionfinder`，兩者皆無 `flownode`

**Checkpoint**: US1 完成——三模組可分開測試、對外介面與 golden 不變；可單獨 commit／作為 MVP 交付

---

## Phase 4: User Story 2 - 拆分節點的欄位收成一個物件，分支標籤只在一處定義 (Priority: P2)

**Goal**: `FlowNode` 以 `split`（`null | 凍結 {path, origin, preEvaluated}`）取代 `branchPath`／`splitOrigin`／`preEvaluated`，新增 `labelPath`
（預設 `''`）；分支標籤格式集中於 `lib/esgraph/branchlabel.js`（`pathOf`、`pathSuffix`、`lineLabel`、`extendPath`、`branchMark`、
`TRUE_BRANCH`／`FALSE_BRANCH`）。`isWithObject`、`loopRightSplit`、`discriminantSplit` 不變（FR-005）。

**Independent Test**: 共同驗證全過；`npx mocha tests/esgraph/branchlabel.js tests/esgraph/flownodetest.js` 驗證 `split` 預設 null、
setter 驗證與凍結、`analyzedExpressions` 前綴、標籤 helper 輸出；呼叫／call return 節點 `split === null` 且 `labelPath` 為呼叫點路徑。

### Characterization tests for User Story 2（先在現行程式上綠燈）

- [ ] T016 [US2] 在 `tests/dujs/branchsplit.js` 新增 characterization 測試（現行程式上綠燈）：(a) 拆分呼叫點（如 `x = c ? f() : g();` 的 inter-procedural 模型）產生的呼叫節點與 call return 節點，其 analyze helper 標籤（`L<行>:<路徑>`）與 pair 記法（`>…:T`／`:F`）的輸出字串；(b) `x = c ? a : b` 拆出的決策節點與兩葉的標籤（決策 `''`、葉 `T`／`F`）；(c) with 物件節點的 `isWithObject`、for-in/for-of 右側拆分時 loop 節點的 `loopRightSplit`、switch discriminant 拆分時 case 節點的 `discriminantSplit` 旗標值（US2 情境 5）。此時節點路徑以 `node.branchPath` 讀取（T024 改為 `pathOf`），預期字串不變
- [ ] T017 [P] [US2] 撰寫 `tests/esgraph/branchlabel.js`：`TRUE_BRANCH`／`FALSE_BRANCH`、`pathSuffix('')===''`／`pathSuffix('TF')===':TF'`、`lineLabel(3,'')==='L3'`／`lineLabel(3,'T')==='L3:T'`、`extendPath('T','F')==='TF'`、`branchMark('T')===':T'`、`pathOf` 對 `{split:{path:'F'}, labelPath:''}`、`{split:null, labelPath:'T'}`、`{split:null, labelPath:''}` 的結果（以純物件為輸入，不依賴 FlowNode）；預期字串取自現行 `lib/dujs/cfggraphconverter.js` `branchPathSuffix` 與 `tests/helpers/analyze.js` 的拼接格式（本檔在 T018 完成前為紅燈）

### Implementation for User Story 2

- [ ] T018 [US2] 建立 `lib/esgraph/branchlabel.js`（MIT 檔頭；不 require FlowNode；`':'` 分隔符為單一常數供 `pathSuffix` 與 `branchMark` 共用），依 contracts 匯出六項；`npx mocha tests/esgraph/branchlabel.js` 綠燈
- [ ] T019 [US2] 修改 `lib/esgraph/flownode.js`：建構子（現行 :40-42）移除 `_branchPath`／`_splitOrigin`／`_preEvaluated`，新增 `_split = null`、`_labelPath = ''`；屬性（:681-726）改為 `split`（setter：`null`／`undefined`→null；物件須 `typeof path === 'string'`、`origin` 為非 null 物件、`preEvaluated` 為陣列或省略（→ `[]`），存 `Object.freeze` 淺複本且 `preEvaluated` 另複製並凍結；其他輸入忽略；getter 回傳同一凍結物件）與 `labelPath`（非字串忽略）；`analyzedExpressions`（:776-786）改為 `(split ? split.preEvaluated : []).concat([astNode])` 回傳新陣列；jsdoc 新增 `@typedef SplitInfo`；`toJSON` 不變
- [ ] T020 [US2] 同步改寫 `tests/esgraph/flownodetest.js`（現行 :692-751）：預設 `split === null`、`labelPath === ''`；`split` setter 的接受／忽略輸入、凍結（strict mode 寫入丟錯）、`preEvaluated` 省略→`[]`；`labelPath` 非字串忽略；`analyzedExpressions` 以 `split.preEvaluated` 為前綴且每次回傳新陣列（US2 情境 1、2）（與 T019 一起完成並綠燈）
- [ ] T021 [US2] 修改 `lib/esgraph/branchsplitter.js`：`create(ast, path)` 擴為 `create(ast, path, preEvaluated)` 一次設定 `node.split = {path, origin, preEvaluated}`；`expand` 的 `path + 'T'`／`path + 'F'` 改 `branchLabel.extendPath(path, branchLabel.TRUE_BRANCH／FALSE_BRANCH)`，`preEvaluatedOf(decision)` 提前計算後傳入 `create`；`isInsideLoopBody` 的 `splitOrigin || astNode` 改 `split ? split.origin : astNode`；`create` 呼叫時機與次序不變（research R3）（依賴 T018、T019）
- [ ] T022 [P] [US2] 修改 `lib/dujs/cfgbuilder.js`（:30）`splitOrigin || astNode` → `split ? split.origin : astNode`
- [ ] T023 [P] [US2] 修改 `lib/dujs/cfggraphconverter.js`（:37-40、:50、:98）：移除本地 `branchPathSuffix`，後綴改 `branchLabel.pathSuffix(branchLabel.pathOf(node))`；`'L' + node.line + ':C' + node.col` 與 `node.type + ' (L'` 位置標籤不動
- [ ] T024 [P] [US2] 修改 `lib/dujs/modelbuilder.js`：:280、:291 `x.branchPath = callSite.branchPath` → `x.labelPath = branchLabel.pathOf(callSite)`（D5，呼叫節點不帶 `split`）；`expressionsEvaluatedAtNode`（:380、:383、:385）以本地 helper 取 `split ? split.preEvaluated : []`，邏輯不變
- [ ] T025 [P] [US2] 修改 `lib/dujs/defuseanalyzer.js`（:562、:566）：`preEvaluated` 改讀 `split ? split.preEvaluated : []`、`splitOrigin` 判斷改 `split !== null`，`findUSESet` 其餘邏輯不動（US3 再整段移出）
- [ ] T026 [P] [US2] 修改 `tests/helpers/analyze.js`（:10、:45、:65）：`nodeLabel` 改 `branchLabel.lineLabel(node.line, branchLabel.pathOf(node))`、`!!target.branchPath` 改 `!!branchLabel.pathOf(target)`、`useLabels` 的 `prefix + ':T'`／`':F'` 改 `prefix + branchLabel.branchMark(...)`；更新檔頭說明（research R8）
- [ ] T027 [US2] 只改欄位存取方式、預期值不變：`tests/dujs/branchsplit.js`（:216-242、:439-448、:585、:644 及 T016 新增處的 `node.branchPath` → `pathOf(node)`）、`tests/dujs/branchsplit.property.js`（:270-281、:383、:452 的 `splitOrigin` → `split`／`split.origin`、`branchPath` → `pathOf`）、`tests/dujs/reviewfixes.js`（:166）、`tests/dujs/analyzehelper.js`（:23-31 手建節點改設 `labelPath`）
- [ ] T028 [US2] 在 `tests/dujs/branchsplit.js` T016(a) 的呼叫節點與 call return 節點補斷言 `split === null` 且 `labelPath` 等於呼叫點的 `pathOf`；T016(b) 補斷言決策節點與兩葉的 `split.origin` 為原敘述、決策節點 `split.preEvaluated` 為條件前已求值運算式、葉為 `[]`（US2 情境 2、3）
- [ ] T029 [P] [US2] 文件同步：`package.json` 的 `doc` 腳本加入 `lib/esgraph/branchlabel.js`；`docs/known-issues.md` §15（:291）`FlowNode.branchPath` 改為「`labelPath`（call return 節點）／`split.path`」；`THIRD_PARTY_NOTICES.md` §1 MIT 清單加入 `lib/esgraph/branchlabel.js`

### Verification for User Story 2

- [ ] T030 [US2] FR-004 舊欄位檢查：`grep -rn "branchPath\|splitOrigin\|\.preEvaluated\b" lib tests/helpers tests/dujs tests/esgraph` 只剩 `split.preEvaluated` 的讀取
- [ ] T031 [US2] 執行共同驗證：`npm test` 全過（≥ 640 ＋ US1／US2 新增數）、golden 0 差異、`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js` 通過、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出

**Checkpoint**: US2 完成——`split === null` 即未拆分；標籤格式由 `branchlabel.js` 唯一提供；輸出與 golden 不變，可單獨 commit

---

## Phase 5: User Story 3 - 「要讀哪些運算式」與「運算式讀了哪些變數」分開 (Priority: P3)

**Goal**: 新模組 `lib/dujs/usedexpressions.js` 的 `usedExpressionsOf(cfgNode)` 回傳 `[{expression, read: 'c-use'|'p-use'|'walk'}]`，收進
條件前已求值、case discriminant、loop 頭、單一識別字根的判斷；`findUSESet` 只依 `read` 設走訪起始狀態並保留走訪內 p-use 傳播規則。

**Independent Test**: 共同驗證全過；`npx mocha tests/dujs/usedexpressions.js` 對決策節點、拆分葉、with 物件、switch case、for-in/for-of
loop、一般節點直接檢查「要讀的運算式與讀法」而不跑 worklist。

### Characterization tests for User Story 3（先在現行程式上綠燈）

- [ ] T032 [US3] 建立 `tests/dujs/usedexpressions.js`，第一個 `describe('findUSESet characterization')`：以建好模型的節點（`findUSESet` 依 `cfgNode.scope` 解析變數，故須經 `modelBuilder`／`tests/helpers/analyze.js` 建模取得已設 scope 的節點，而非裸 `cfgBuilder.getCFG`）直接呼叫 `require('../../lib/dujs/defuseanalyzer').findUSESet(node)`（不跑 worklist），以變數名稱比對，斷言 spec US3 情境 1–5 的 c-use／p-use 變數集合：(1) `x = o.p[i] ? a : b` 決策節點——preEvaluated 內識別字全為 c-use、條件依走訪規則；(2) 拆分葉 `a`、with 物件 `a`、`if (a)`、`a;` 依序 c-use、c-use、p-use、不讀；(3) `switch (x) { case y: …; default: … }` 的 `case y` 讀 `x`（p-use）不讀 `y`、`default` 不讀，discriminant 已拆分時 `case y` 不讀 `x`；另加 `switch (a + b)` 的 case；(4) for-in/for-of：`for (k in x)` 的 `x` 為 c-use、`for (o.p in x)`、`for ({a = d, [e]: f} of x)` 的讀取次序與集合、右側已拆分時不含右側；(5) 一般節點 `x = a + b;`。預期值取自現行行為並標示 characterization；在**未改寫**的 `lib/dujs/defuseanalyzer.js` 上執行 `npx mocha tests/dujs/usedexpressions.js` 綠燈

### Implementation for User Story 3

- [ ] T033 [US3] 建立 `lib/dujs/usedexpressions.js`（MIT 檔頭）匯出 `usedExpressionsOf(cfgNode)`，依 research R6：前綴 `split.preEvaluated` 各一項 `'c-use'`；astNode 為 null→無項目；`SwitchCase` 有 test、`parent` 為 `SwitchStatement` 且 `!discriminantSplit`→`{parent.discriminant, 'p-use'}` 否則無；`ForInStatement`／`ForOfStatement` 依舊 `useLoopHead` 次序（左側成員存取的 `object`→`bindingPattern.getEvaluatedExpressions(left)` 各項→`!loopRightSplit` 時 `right`，皆 `'walk'`）；`Identifier`：有 true 或 false 邊→`'p-use'`，否則 `split` 非 null 或 `isWithObject`→`'c-use'`，否則無；其他→`{astNode, 'walk'}`
- [ ] T034 [US3] 在 `tests/dujs/usedexpressions.js` 新增 `describe('usedExpressionsOf')`：對 T032 相同節點直接斷言回傳的 `[{expression, read}]` 序列（情境 1：已求值項在前且 `'c-use'`、條件在後；情境 2：`'c-use'`／`'c-use'`／`'p-use'`／`[]`；情境 3：`case y`→`[{x,'p-use'}]`、`default`→`[]`、discriminant 已拆分→`[]`；情境 4：左側物件、預設值與計算鍵、右側（未拆分時）各 `'walk'`；情境 5：`[{astNode,'walk'}]`）
- [ ] T035 [US3] 改寫 `lib/dujs/defuseanalyzer.js` 的 `findUSESet`（:557-699）：對 `usedExpressionsOf(cfgNode)` 每項設 `forceCUse = (read === 'c-use')`、`isPUse = (read === 'p-use')` 後以原 walker 走訪；`Identifier` handler 只剩「`forceCUse`→c-use，否則依 `isPUse`」；移除 `isPreEvaluated`、`currentRoot`、`isSplitLeaf`、`readsDiscriminant`、`SwitchCase`／`ForInStatement`／`ForOfStatement` handler、`useLoopHead`、`readsSwitchDiscriminant`；二元、呼叫 callee、一元、`?:`、class 頭的 p-use 傳播規則原樣保留；註解改指新模組；簽章與回傳 `{cuse, puse}` 不變（依賴 T033）
- [ ] T036 [P] [US3] 在 `THIRD_PARTY_NOTICES.md` §1 MIT 清單加入 `lib/dujs/usedexpressions.js`

### Verification for User Story 3

- [ ] T037 [US3] `npx mocha tests/dujs/usedexpressions.js` 中 T032 characterization 與 T034 單元測試皆綠燈（情境 6 由共同驗證保證）
- [ ] T038 [US3] 執行共同驗證：`npm test` 全過（≥ 640 ＋ 全部新增數）、golden 0 差異、`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js` 通過、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出

**Checkpoint**: US3 完成——節點種類規則集中於 `usedExpressionsOf`，每個節點的 c-use／p-use 集合與重構前相同，可單獨 commit

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全 feature 的最終驗收（quickstart.md）

- [ ] T039 性質測試：`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js`（固定 seed 20261116）全部通過；失敗時依輸出的 `FC_SEED=<seed>` 重現並回頭修程式（SC-002）
- [ ] T040 [P] SC-004 檢查：`grep -rnE "':' *\+|\+ *':[TF]'|'L' *\+" lib tests/helpers` 的分支標籤拼接只出現在 `lib/esgraph/branchlabel.js`（`lib/dujs/cfggraphconverter.js` 的 `'L' + node.line + ':C' + node.col` 與 `node.type + ' (L'` 為位置標籤，不計入）
- [ ] T041 [P] SC-005 檢查：`grep -nE "isPreEvaluated|currentRoot|isSplitLeaf|readsSwitchDiscriminant|useLoopHead|loopRightSplit|discriminant|SwitchCase|ForInStatement|ForOfStatement" lib/dujs/defuseanalyzer.js` 在 `findUSESet` 範圍內無結果（`findUSESet` 之前 DEF 走訪的 `SwitchCase: function () {}`、`ForInStatement`／`ForOfStatement: defineLoopVariables` 不計入）
- [ ] T042 [P] 確認 LGPL 檔未改：`git diff --exit-code develop -- lib/esgraph/index.js lib/esgraph/dot.js`（FR-011 不觸發）；執行 `npm run doc` 確認 API 文件可產生（含 `branchlabel.js`），`doc/` 不納入版控
- [ ] T043 最終整體驗證：`npm test` 全過並記錄最終 passing 數（≥ 640 ＋ 新增）、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出（SC-001、SC-002、SC-006）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：無依賴；T002 須先於任何新增 `tests/esgraph/*.js`
- **Foundational (Phase 2)**：無
- **US1 (Phase 3)** → **US2 (Phase 4)** → **US3 (Phase 5)**：依序（spec Assumptions；US2 改的 `create`／`expand` 位於 US1 拆出的 `branchsplitter.js`，US3 讀 US2 的 `split`）
- **Polish (Phase 6)**：三個 story 完成後

### Within Each User Story

- characterization 測試先寫、在現行程式上綠燈（T003–T006、T016、T032），再搬移／改寫；重構後同一批測試必須仍綠燈
- US1：T007 → T008 → T009 → T011 → T012；T013 可隨時
- US2：T018 → T019+T020 → T021；T022–T026 在 T018、T019 之後可並行；T027、T028 在 lib 改完後
- US3：T032 → T033 → T034 → T035

### Parallel Opportunities

- T004 ∥ T005（不同測試檔）
- T012 ∥ T013
- T016 ∥ T017；T022 ∥ T023 ∥ T024 ∥ T025 ∥ T026 ∥ T029
- T040 ∥ T041 ∥ T042

---

## Parallel Example: User Story 2

```bash
# T018、T019 完成後，同時改各讀寫處（不同檔案）：
Task: "T022 cfgbuilder.js :30 改 split ? split.origin : astNode"
Task: "T023 cfggraphconverter.js 改用 branchLabel.pathSuffix(pathOf(node))"
Task: "T024 modelbuilder.js 呼叫節點寫 labelPath、expressionsEvaluatedAtNode 改讀 split"
Task: "T025 defuseanalyzer.js :562、:566 改讀 split"
Task: "T026 tests/helpers/analyze.js 改用 lineLabel／pathOf／branchMark"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 3 US1
2. **STOP and VALIDATE**：T014、T015 通過即可 commit（拆分邏輯可分開測試，是後兩項的安全網）

### Incremental Delivery

1. Setup → US1 → 驗證 → commit
2. US2 → 驗證 → commit
3. US3 → 驗證 → commit
4. Polish → PR（目標 `develop`）

每一步 golden 都必須逐位元組相同；任何 golden 差異視為行為改變，回頭修程式，不得更新 golden。

---

## Notes

- [P] = 不同檔案、無未完成依賴
- 既有測試的預期值不得修改，只允許改欄位存取方式（FR-009）
- 不得新增 `eslint-suppressions.json` 項目（FR-010）
- 函式本體以整段搬移為原則，只改跨模組前綴，避免改變節點建立次序（research R3）
