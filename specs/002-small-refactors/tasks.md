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

- [X] T001 記錄基線：執行 `npm test`（預期 640 passing）、`npm run lint`（0 錯誤）、`git status tests/golden` 乾淨，並記下 `eslint-suppressions.json` 現況（`git diff --exit-code eslint-suppressions.json` 作為之後比對基準）；不修改檔案
- [X] T002 把 `package.json` 的 `test` 腳本中逐檔列出的 `tests/esgraph/flownodetest.js tests/esgraph/flownodefactory.js tests/esgraph/test.js` 改為 `"tests/esgraph/*.js"`（research R7；目錄頂層現恰為這三檔），重跑 `npm test` 確認仍為 640 passing 於 `package.json`

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

- [X] T003 [US1] 在 `lib/esgraph/branchsplitter.js` 的 `module.exports` 暫時加入 `_testonly_: { findFirstDecision, preEvaluatedOf, isInert, isPlaceholder, placeholder, branchesOf, staticChoice, rewrite, branchRoot }`（純新增、不改任何函式本體；T012 移除）
- [X] T004 [P] [US1] 撰寫 decision finder characterization 測試 `tests/esgraph/decisionfinder.js`：檔頭以單一變數 `subject = require('../../lib/esgraph/branchsplitter')._testonly_` 取得被測函式（T011 改指新模組）；AST 由 `lib/dujs/jsparser` 的 `parseAST` 取得；`findFirstDecision` 對 `searchByType` 每個 case 至少一例（contracts 清單：`ConditionalExpression`、`LogicalExpression` 的 `&&`／`||`／`??`、`AssignmentExpression` 的邏輯指派／複合指派→`compound` entry／一般 `=`、`SequenceExpression`、`TemplateLiteral`、`BinaryExpression`、`UnaryExpression`／`UpdateExpression`／`AwaitExpression`／`YieldExpression`／`SpreadElement`、`MemberExpression`（物件與計算鍵先求值→entries）、`CallExpression`／`NewExpression`（callee 隨葉、不入 entries）、`TaggedTemplateExpression`、`ArrayExpression`（含空洞）、`ObjectExpression`／`Property`（計算鍵）、`ImportExpression`、`ClassDeclaration`／`ClassExpression`（superClass、計算鍵；本體不搜尋）、`VariableDeclaration`（前面的宣告子→`remove`）、`ExpressionStatement`、`ReturnStatement`／`ThrowStatement`、`SwitchCase`、`ExportDefaultDeclaration`（運算式 vs 宣告）、default（識別字、可選鏈→null））；斷言 `{split, condition, ancestors, entries}` 的形狀與 entry `action`；`preEvaluatedOf`（含 `compound` 取 `node.left`）；`isInert` 各分支與 `isPlaceholder`；每例斷言輸入 AST 不被修改；測試標題或註解標示 characterization
- [X] T005 [P] [US1] 撰寫 AST rewriter characterization 測試 `tests/esgraph/astrewriter.js`（同 T004 以 `subject` 變數取 `_testonly_`）：`branchesOf` 每個運算子（`?:`、`&&`、`||`、`??`、`&&=`、`||=`、`??=`，邏輯指派的賦值分支為合成 `=`）、`placeholder` 的 known 值與 range／loc、`staticChoice` 的已知值組合（truthy／falsy／nonnull／unknown）與回傳 null 的情況、`branchRoot` 三種 entry action（placeholder／remove／compound）、`rewrite` 路徑複製；每例以深度凍結或 JSON 快照斷言輸入 AST 不變，並斷言路徑外子樹與原 AST 為同一物件
- [X] T006 [US1] 執行 `npx mocha tests/esgraph/decisionfinder.js tests/esgraph/astrewriter.js`，在**未搬移**的程式上全部綠燈（若失敗，修正測試的預期值使其反映現行行為，不改 lib）

### Implementation for User Story 1

- [X] T007 [US1] 建立 `lib/esgraph/decisionfinder.js`：MIT 檔頭（沿用現行 `branchsplitter.js` 的 original dujs code 檔頭）；整段原樣搬入 `PLACEHOLDER_TYPE`、`LOGICAL_ASSIGNMENTS`、`STRUCTURAL_TYPES`、`isPlaceholder`、`isInert`、`findFirstDecision`（含 `searchByType` switch 原樣，D2）、`preEvaluatedOf`；匯出 `{findFirstDecision, preEvaluatedOf, isInert, isPlaceholder, PLACEHOLDER_TYPE}`；不得有任何 `require`（research R1）
- [X] T008 [US1] 建立 `lib/esgraph/astrewriter.js`：MIT 檔頭；只 `require('./decisionfinder')`；整段原樣搬入 `REMOVED`、`NULLISH_OPERATORS`、`placeholder`、`shallowCopy`、`branchesOf`、`staticChoice`、`rewrite`、`branchRoot`，跨模組呼叫改加前綴；匯出 `{placeholder, branchesOf, staticChoice, rewrite, branchRoot}`（依賴 T007）
- [X] T009 [US1] 縮減 `lib/esgraph/branchsplitter.js` 只留 graph 部分（`redirect`、`contextsOf`、`discriminantContexts`、`isInsideLoopBody`、`splitNode`、`reachableNodes`、`split`），require `./astrewriter`、`./decisionfinder`、`./flownode`、`./flownodefactory`；匯出維持 `{split, PLACEHOLDER_TYPE}`（後者 re-export decisionfinder）；`splitNode` 內 `create` 呼叫時機與次序、`reachableNodes` 走訪次序、`created.concat` 次序一律不動（research R3）（依賴 T008）
- [X] T010 [US1] 確認 `lib/esgraph/index.js` 未修改（`git diff --exit-code lib/esgraph/index.js`），FR-011 LGPL 修改紀錄不觸發
- [X] T011 [US1] 把 `tests/esgraph/decisionfinder.js` 的 `subject` 改為 `require('../../lib/esgraph/decisionfinder')`、`tests/esgraph/astrewriter.js` 的 `subject` 改為 `require('../../lib/esgraph/astrewriter')`（`isPlaceholder` 等跨模組者取自 decisionfinder），測試內容與預期值不變；重跑兩檔綠燈（依賴 T009；須先於 T012，否則測試在移除 `_testonly_` 後失去被測對象）
- [X] T012 [US1] 移除 T003 加入的 `_testonly_` 匯出於 `lib/esgraph/branchsplitter.js`（依賴 T011）
- [X] T013 [P] [US1] 在 `THIRD_PARTY_NOTICES.md` §1 列出 original dujs code (MIT) 檔案的那一句（現為「`lib/esgraph/flownode.js`, `lib/esgraph/flownodefactory.js`, `lib/esgraph/branchsplitter.js` and the other files under `tests/esgraph/` are original dujs code (MIT)…」）加入 `lib/esgraph/decisionfinder.js`、`lib/esgraph/astrewriter.js`（FR-011）

### Verification for User Story 1

- [X] T014 [US1] 執行共同驗證：`npm test` 全過（≥ 640 ＋ T004/T005 新增數）、golden 0 差異、`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js` 通過、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出；golden 失敗一律回頭修程式（節點建立順序），不得 `UPDATE_GOLDEN`
- [X] T015 [US1] SC-003／FR-001 量測：`wc -l lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js lib/esgraph/branchsplitter.js` 三檔皆 < 350 行；`grep -n "require(" lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js` 顯示 decisionfinder 無 require、astrewriter 只 require `./decisionfinder`，兩者皆無 `flownode`；`grep -n _testonly_ lib/esgraph/branchsplitter.js lib/esgraph/decisionfinder.js lib/esgraph/astrewriter.js tests/esgraph/decisionfinder.js tests/esgraph/astrewriter.js` 無輸出（暫時匯出無殘留；`flownode.js` 等其他模組既有的 `_testonly_` 不在範圍）

**Checkpoint**: US1 完成——三模組可分開測試、對外介面與 golden 不變；可單獨 commit／作為 MVP 交付

---

## Phase 4: User Story 2 - 拆分節點的欄位收成一個物件，分支標籤只在一處定義 (Priority: P2)

**Goal**: `FlowNode` 以 `split`（`null | 凍結 {path, origin, preEvaluated}`）取代 `branchPath`／`splitOrigin`／`preEvaluated`，新增 `labelPath`
（預設 `''`，所有節點標籤路徑的唯一來源；拆分節點建立時一併設為 `split.path`，不變量 `split !== null ⇒ labelPath === split.path`）；
分支標籤格式集中於 `lib/esgraph/branchlabel.js`（`pathOf`（即回 `labelPath`）、`pathSuffix`、`lineLabel`、`extendPath`、`branchMark`、
`TRUE_BRANCH`／`FALSE_BRANCH`）。`isWithObject`、`loopRightSplit`、`discriminantSplit` 不變（FR-005）。

**Independent Test**: 共同驗證全過；`npx mocha tests/esgraph/branchlabel.js tests/esgraph/flownodetest.js` 驗證 `split` 預設 null、
setter 驗證與凍結、`analyzedExpressions` 前綴、標籤 helper 輸出；callSite 改型的呼叫節點保留 `split` 與 `labelPath`，新建的呼叫節點與
call return 節點 `split === null` 且 `labelPath` 等於 callSite 的 `labelPath`；拆分節點皆滿足 `labelPath === split.path`。

### Characterization tests for User Story 2（先在現行程式上綠燈）

- [X] T016 [US2] 在 `tests/dujs/branchsplit.js` 新增 characterization 測試（現行程式上綠燈）：(a) 由拆分呼叫點而來的兩種呼叫節點各一例，各含其 call return 節點——(a1) callSite 不是決策節點、本身被改型為呼叫節點（如 `x = c ? f() : g();` 的 inter-procedural 模型中 `x = f()` 葉）；(a2) callSite 是決策節點、新建呼叫節點插在決策節點前（`isCallBeforeDecision`，如 `x = c ? (f() ? a : b) : d;` 中路徑非空、含呼叫的內層決策節點；實際輸入以能讓現行程式走入 `lib/dujs/modelbuilder.js:284` 的 `isCallBeforeDecision` 分支者為準）；斷言其 analyze helper 標籤（`L<行>:<路徑>`）與 pair 記法（`>…:T`／`:F`）的輸出字串；(b) `x = c ? a : b` 拆出的決策節點與兩葉的標籤（決策 `''`、葉 `T`／`F`）；(c) with 物件節點的 `isWithObject`、for-in/for-of 右側拆分時 loop 節點的 `loopRightSplit`、switch discriminant 拆分時 case 節點的 `discriminantSplit` 旗標值（US2 情境 5）。此時節點路徑以 `node.branchPath` 讀取（T027 改為 `pathOf`），預期字串不變
- [X] T017 [P] [US2] 撰寫 `tests/esgraph/branchlabel.js`：`TRUE_BRANCH`／`FALSE_BRANCH`、`pathSuffix('')===''`／`pathSuffix('TF')===':TF'`、`lineLabel(3,'')==='L3'`／`lineLabel(3,'T')==='L3:T'`、`extendPath('T','F')==='TF'`、`branchMark('T')===':T'`、`pathOf` 對 `{labelPath:'T'}`、`{labelPath:''}`、`{split:{path:'F'}, labelPath:'F'}` 的結果，以及 `{split:{path:'F'}, labelPath:'T'}` 回 `'T'`（只讀 `labelPath`、不讀 `split`）（以純物件為輸入，不依賴 FlowNode）；預期字串取自現行 `lib/dujs/cfggraphconverter.js` `branchPathSuffix` 與 `tests/helpers/analyze.js` 的拼接格式（本檔在 T018 完成前為紅燈）

### Implementation for User Story 2

- [X] T018 [US2] 建立 `lib/esgraph/branchlabel.js`（MIT 檔頭；不 require FlowNode；`pathOf(node)` 回 `node.labelPath`、不讀 `split`；`':'` 分隔符為單一常數供 `pathSuffix` 與 `branchMark` 共用），依 contracts 匯出六項；`npx mocha tests/esgraph/branchlabel.js` 綠燈
- [X] T019 [US2] 修改 `lib/esgraph/flownode.js`：建構子（現行 :40-42）移除 `_branchPath`／`_splitOrigin`／`_preEvaluated`，新增 `_split = null`、`_labelPath = ''`；屬性（:681-726）改為 `split`（setter：`null`／`undefined`→null；物件須 `typeof path === 'string'`、`origin` 為非 null 物件、`preEvaluated` 為陣列或省略（→ `[]`），存 `Object.freeze` 淺複本且 `preEvaluated` 另複製並凍結；其他輸入忽略；getter 回傳同一凍結物件）與 `labelPath`（非字串忽略；jsdoc 註明為所有節點標籤路徑的唯一來源、拆分節點 `labelPath === split.path`）；`analyzedExpressions`（:776-786）改為 `(split ? split.preEvaluated : []).concat([astNode])` 回傳新陣列；jsdoc 新增 `@typedef SplitInfo`；`toJSON` 不變
- [X] T020 [US2] 同步改寫 `tests/esgraph/flownodetest.js`（現行 :692-751）：舊欄位預設值等斷言改測新欄位（FR-009 例外）——預設 `split === null`、`labelPath === ''`；`split` setter 的接受／忽略輸入、凍結（strict mode 寫入丟錯）、`preEvaluated` 省略→`[]`；`labelPath` 非字串忽略；`analyzedExpressions` 以 `split.preEvaluated` 為前綴且每次回傳新陣列（US2 情境 1、2）（與 T019 一起完成並綠燈）
- [X] T021 [US2] 修改 `lib/esgraph/branchsplitter.js`：`create(ast, path)` 擴為 `create(ast, path, preEvaluated)`，一次設定 `node.split = {path, origin, preEvaluated}` 與 `node.labelPath = path`（不變量 `split !== null ⇒ labelPath === split.path`）；`expand` 的 `path + 'T'`／`path + 'F'` 改 `branchLabel.extendPath(path, branchLabel.TRUE_BRANCH／FALSE_BRANCH)`，`preEvaluatedOf(decision)` 提前計算後傳入 `create`；`isInsideLoopBody` 的 `splitOrigin || astNode` 改 `split ? split.origin : astNode`；`create` 呼叫時機與次序不變（research R3）（依賴 T018、T019）
- [X] T022 [P] [US2] 修改 `lib/dujs/cfgbuilder.js`（:30）`splitOrigin || astNode` → `split ? split.origin : astNode`
- [X] T023 [P] [US2] 修改 `lib/dujs/cfggraphconverter.js`（:37-40、:50、:98）：移除本地 `branchPathSuffix`，後綴改 `branchLabel.pathSuffix(branchLabel.pathOf(node))`（即讀 `labelPath`）；`'L' + node.line + ':C' + node.col` 與 `node.type + ' (L'` 位置標籤不動
- [X] T024 [P] [US2] 修改 `lib/dujs/modelbuilder.js`：:280（call return 節點）與 :291（callSite 為決策節點時新建的呼叫節點）`x.branchPath = callSite.branchPath` → `x.labelPath = branchLabel.pathOf(callSite)`（即 `callSite.labelPath`；兩者 `split` 維持 null，D5）；callSite 不是決策節點而改型為 CALL 的分支（:307 起）不寫入，保留 callSite 原有 `split` 與 `labelPath`；`expressionsEvaluatedAtNode`（:380、:383、:385）以本地 helper 取 `split ? split.preEvaluated : []`，邏輯不變
- [X] T025 [P] [US2] 修改 `lib/dujs/defuseanalyzer.js`（:562、:566）：`preEvaluated` 改讀 `split ? split.preEvaluated : []`、`splitOrigin` 判斷改 `split !== null`，`findUSESet` 其餘邏輯不動（US3 再整段移出）
- [X] T026 [P] [US2] 修改 `tests/helpers/analyze.js`（:10、:45、:65、:82、:85）：`nodeLabel`（:45）改 `branchLabel.lineLabel(node.line, branchLabel.pathOf(node))`、`!!target.branchPath`（:65）改 `!!branchLabel.pathOf(target)`、`useLabels` 的 `prefix + ':T'`（:82）／`prefix + ':F'`（:85）改 `prefix + branchLabel.branchMark(branchLabel.TRUE_BRANCH／FALSE_BRANCH)`；更新檔頭說明（:10，research R8：標籤路徑來自 `labelPath`）
- [X] T027 [US2] 只改欄位存取方式、預期值不變：`tests/dujs/branchsplit.js`（:216-242、:439-448、:585、:644 及 T016 新增處的 `node.branchPath` → `pathOf(node)`）、`tests/dujs/branchsplit.property.js`（:270-281、:383、:452 的 `splitOrigin` → `split`／`split.origin`、`branchPath` → `pathOf`）、`tests/dujs/reviewfixes.js`（:166）、`tests/dujs/analyzehelper.js`（:23-31 手建節點改設 `labelPath`）
- [X] T028 [US2] 在 `tests/dujs/branchsplit.js` 補 T016 的欄位斷言（US2 情境 2、3）：(a1) 改型為呼叫節點的 callSite `split !== null` 且 `labelPath === split.path`（與改型前相同），其 call return 節點 `split === null`、`labelPath` 等於 callSite 的 `labelPath`；(a2) 新建的呼叫節點與 call return 節點皆 `split === null`、`labelPath` 等於 callSite（決策節點）的 `labelPath`；(b) 決策節點與兩葉的 `split.origin` 為原敘述、`labelPath === split.path`、決策節點 `split.preEvaluated` 為條件前已求值運算式、葉為 `[]`
- [X] T029 [P] [US2] 不變量測試：在 `tests/dujs/branchsplit.property.js` 新增性質——對生成程式的模型中所有 `split !== null` 的節點（含巢狀拆分與改型為呼叫節點者），斷言 `labelPath === split.path`；並斷言 `split === null` 且 `labelPath !== ''` 的節點只有呼叫節點與 call return 節點（data-model §1 不變量）。固定 seed 下綠燈（依賴 T021、T024、T027）
- [X] T030 [P] [US2] 文件同步：`package.json` 的 `doc` 腳本加入 `lib/esgraph/branchlabel.js`；`docs/known-issues.md` §15（:291）`FlowNode.branchPath` 改為「`labelPath`」（拆分節點等於 `split.path`、call return 節點沿用 callSite）；`THIRD_PARTY_NOTICES.md` §1 列出 original dujs code (MIT) 檔案的那一句加入 `lib/esgraph/branchlabel.js`（FR-011）

### Verification for User Story 2

- [X] T031 [US2] FR-004 舊欄位檢查：`grep -rn "branchPath\|splitOrigin\|\.preEvaluated\b" lib tests/helpers tests/dujs tests/esgraph` 只剩 `split.preEvaluated` 的讀取
- [X] T032 [US2] SC-004 檢查：`grep -rnE "':' *\+|\+ *':[TF]'|\+ *'[TF]'|'L' *\+" lib tests/helpers` 的分支標籤拼接（含 `path + 'T'` 這類路徑延伸）只出現在 `lib/esgraph/branchlabel.js`；`lib/dujs/cfggraphconverter.js` 的 `'L' + node.line + ':C' + node.col`（`L<行>:C<欄>`）與 `node.type + ' (L'`（`<type> (L…)`）為位置標籤，不計入
- [X] T033 [US2] 執行共同驗證：`npm test` 全過（≥ 640 ＋ US1／US2 新增數）、golden 0 差異、`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js` 通過、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出

**Checkpoint**: US2 完成——`split === null` 即非拆分產生的節點；標籤路徑一律取 `labelPath`、格式由 `branchlabel.js` 唯一提供；輸出與 golden 不變，可單獨 commit

---

## Phase 5: User Story 3 - 「要讀哪些運算式」與「運算式讀了哪些變數」分開 (Priority: P3)

**Goal**: 新模組 `lib/dujs/usedexpressions.js` 的 `usedExpressionsOf(cfgNode)` 回傳 `[{expression, read: 'c-use'|'p-use'|'walk'}]`，收進
條件前已求值、case discriminant、loop 頭、單一識別字根的判斷；`findUSESet` 只依 `read` 設走訪起始狀態並保留走訪內 p-use 傳播規則。

**Independent Test**: 共同驗證全過；`npx mocha tests/dujs/usedexpressions.js` 對決策節點、拆分葉、with 物件、switch case、for-in/for-of
loop、一般節點直接檢查「要讀的運算式與讀法」而不跑 worklist。

### Characterization tests for User Story 3（先在現行程式上綠燈）

- [X] T034 [US3] 建立 `tests/dujs/usedexpressions.js`，第一個 `describe('findUSESet characterization')`：以建好模型的節點（`findUSESet` 依 `cfgNode.scope` 解析變數，故須經 `modelBuilder`／`tests/helpers/analyze.js` 建模取得已設 scope 的節點，而非裸 `cfgBuilder.getCFG`）直接呼叫 `require('../../lib/dujs/defuseanalyzer').findUSESet(node)`（不跑 worklist），以變數名稱比對，斷言 spec US3 情境 1–5 的 c-use／p-use 變數集合：(1) `x = f(y) + (o.p[i] ? a : b)` 決策節點——preEvaluated 內識別字全為 c-use、條件依走訪規則；(2) 拆分葉 `a`、with 物件 `a`、`if (a)`、`a;` 依序 c-use、c-use、p-use、不讀；(3) `switch (x) { case y: …; default: … }` 的 `case y` 讀 `x`（p-use）不讀 `y`、`default` 不讀，discriminant 已拆分時 `case y` 不讀 `x`；另加 `switch (a + b)` 的 case；(4) for-in/for-of：`for (k in x)` 的 `x` 為 c-use、`for (o.p in x)`、`for ({a = d, [e]: f} of x)` 的讀取次序與集合、右側已拆分時不含右側；(5) 一般節點 `x = a + b;`。預期值取自現行行為並標示 characterization；在**未改寫**的 `lib/dujs/defuseanalyzer.js` 上執行 `npx mocha tests/dujs/usedexpressions.js` 綠燈

### Implementation for User Story 3

- [X] T035 [US3] 建立 `lib/dujs/usedexpressions.js`（MIT 檔頭；依 FR-011 不列入 `THIRD_PARTY_NOTICES.md`，該檔 §1 未列任何 `lib/dujs` 檔）匯出 `usedExpressionsOf(cfgNode)`，依 research R6：前綴 `split.preEvaluated` 各一項 `'c-use'`；astNode 為 null→無項目；`SwitchCase` 有 test、`parent` 為 `SwitchStatement` 且 `!discriminantSplit`→`{parent.discriminant, 'p-use'}` 否則無；`ForInStatement`／`ForOfStatement` 依舊 `useLoopHead` 次序（左側成員存取的 `object`→`bindingPattern.getEvaluatedExpressions(left)` 各項→`!loopRightSplit` 時 `right`，皆 `'walk'`）；`Identifier`：有 true 或 false 邊→`'p-use'`，否則 `split` 非 null 或 `isWithObject`→`'c-use'`，否則無；其他→`{astNode, 'walk'}`
- [X] T036 [US3] 在 `tests/dujs/usedexpressions.js` 新增 `describe('usedExpressionsOf')`：對 T034 相同節點直接斷言回傳的 `[{expression, read}]` 序列（情境 1：已求值項在前且 `'c-use'`、條件在後；情境 2：`'c-use'`／`'c-use'`／`'p-use'`／`[]`；情境 3：`case y`→`[{x,'p-use'}]`、`default`→`[]`、discriminant 已拆分→`[]`；情境 4：左側物件、預設值與計算鍵、右側（未拆分時）各 `'walk'`；情境 5：`[{astNode,'walk'}]`）
- [X] T037 [US3] 改寫 `lib/dujs/defuseanalyzer.js` 的 `findUSESet`（:557-699）：對 `usedExpressionsOf(cfgNode)` 每項設 `forceCUse = (read === 'c-use')`、`isPUse = (read === 'p-use')` 後以原 walker 走訪；`Identifier` handler 只剩「`forceCUse`→c-use，否則依 `isPUse`」；移除 `isPreEvaluated`、`currentRoot`、`isSplitLeaf`、`readsDiscriminant`、`useLoopHead`、`readsSwitchDiscriminant`；`SwitchCase`／`ForInStatement`／`ForOfStatement` handler 只保留處理 ENTRY 本體內**巢狀**節點的行為（research R6 實作修正，2026-11-16；根層判斷在新模組），並在 T034 補巢狀 ENTRY 節點的 characterization；二元、呼叫 callee、一元、`?:`（含其 `isDecisionNode` 判斷）、class 頭的 p-use 傳播規則原樣保留；註解改指新模組；簽章與回傳 `{cuse, puse}` 不變（依賴 T035）

### Verification for User Story 3

- [X] T038 [US3] `npx mocha tests/dujs/usedexpressions.js` 中 T034 characterization 與 T036 單元測試皆綠燈（情境 6 由共同驗證保證）
- [X] T039 [US3] SC-005 檢查：`sed -n '/findUSESet = function/,/^};/p' lib/dujs/defuseanalyzer.js | grep -nE "isPreEvaluated|currentRoot|isSplitLeaf|readsDiscriminant|readsSwitchDiscriminant|isWithObject|preEvaluated|\.split\b"` 無輸出（巢狀用的 `SwitchCase`／`ForInStatement`／`ForOfStatement` handler 屬走訪規則可保留，見 R6 實作修正）（`sed` 限定在 `findUSESet` 範圍，故其前 DEF 走訪的 `SwitchCase: function () {}`、`ForInStatement`／`ForOfStatement: defineLoopVariables` 不會被抓到）；`grep -nE "function (useLoopHead|readsSwitchDiscriminant)" lib/dujs/defuseanalyzer.js` 無輸出（模組層 helper 已移除）。`isDecisionNode` 不列入：`?:` handler 依節點是否有 true/false 邊重設 `isPUse`，屬走訪內 p-use 傳播規則，仍合法留在 `findUSESet`
- [X] T040 [US3] 執行共同驗證：`npm test` 全過（≥ 640 ＋ 全部新增數）、golden 0 差異、`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js` 通過、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出

**Checkpoint**: US3 完成——節點種類規則集中於 `usedExpressionsOf`，每個節點的 c-use／p-use 集合與重構前相同，可單獨 commit

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全 feature 的最終驗收（quickstart.md）

- [X] T041 [P] 重跑 SC-004（T032 的 grep）與 SC-005（T039 的兩個 grep），確認三個 story 合併後仍成立
- [X] T042 [P] 確認 LGPL 檔未改：`git diff --exit-code 9254c18 -- lib/esgraph/index.js lib/esgraph/dot.js`（FR-011 不觸發）；執行 `npm run doc` 確認 API 文件可產生（含 `branchlabel.js`），`doc/` 不納入版控
- [X] T043 最終整體驗證：`npm test` 全過並記錄最終 passing 數（≥ 640 ＋ 新增）、`FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js`（固定 seed 20261116）全部通過（失敗時依輸出的 `FC_SEED=<seed>` 重現並回頭修程式）、`npm run lint` 0 錯誤、`git diff --exit-code eslint-suppressions.json tests/golden tests/esgraph/tests` 無輸出（SC-001、SC-002、SC-006）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：無依賴；T002 須先於任何新增 `tests/esgraph/*.js`
- **Foundational (Phase 2)**：無
- **US1 (Phase 3)** → **US2 (Phase 4)** → **US3 (Phase 5)**：依序（spec Assumptions；US2 改的 `create`／`expand` 位於 US1 拆出的 `branchsplitter.js`，US3 讀 US2 的 `split`）
- **Polish (Phase 6)**：三個 story 完成後

### Within Each User Story

- characterization 測試先寫、在現行程式上綠燈（T003–T006、T016、T034），再搬移／改寫；重構後同一批測試必須仍綠燈
- US1：T007 → T008 → T009 → T011 → T012；T013 可隨時
- US2：T018 → T019+T020 → T021；T022–T026 在 T018、T019 之後可並行；T027 在 lib 改完後，T028、T029 在 T027 之後；驗證 T031 → T032 → T033
- US3：T034 → T035 → T036 → T037；驗證 T038 → T039 → T040

### Parallel Opportunities

- T004 ∥ T005（不同測試檔）
- T011 ∥ T013
- T016 ∥ T017；T022 ∥ T023 ∥ T024 ∥ T025 ∥ T026 ∥ T030；T028 ∥ T029（不同測試檔）
- T041 ∥ T042

---

## Parallel Example: User Story 2

```bash
# T018、T019 完成後，同時改各讀寫處（不同檔案）：
Task: "T022 cfgbuilder.js :30 改 split ? split.origin : astNode"
Task: "T023 cfggraphconverter.js 改用 branchLabel.pathSuffix(pathOf(node))（即 labelPath）"
Task: "T024 modelbuilder.js 新建的呼叫節點與 call return 節點寫 labelPath = callSite.labelPath、expressionsEvaluatedAtNode 改讀 split"
Task: "T025 defuseanalyzer.js :562、:566 改讀 split"
Task: "T026 tests/helpers/analyze.js（:10、:45、:65、:82、:85）改用 lineLabel／pathOf／branchMark"
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
- 既有測試的預期值不得修改，只允許改欄位存取方式；欄位被取代者（如 `flownodetest` 的預設值斷言）改測新欄位（FR-009）
- 不得新增 `eslint-suppressions.json` 項目（FR-010）
- 函式本體以整段搬移為原則，只改跨模組前綴，避免改變節點建立次序（research R3）
