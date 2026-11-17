---

description: "Task list for feature 007-split-call-nodes"
---

# Tasks：把含呼叫的節點拆成「呼叫之前」與「返回之後」（KI §16、§22 (3)）

**Input**: `specs/007-split-call-nodes/` 的 spec.md、plan.md（「已裁決的事項（DECISION 005）」為權威）、research.md（R0–R13）、data-model.md、contracts/（lib-api.md、diff-check.md、acceptance.md）、quickstart.md

**Tests**: 規格要求（§CP-4、SC-001、contracts/acceptance.md），**測試先行**：每個 story 先寫測試（預期先失敗），再實作。框架 mocha＋should（fast-check 可用）；測試以 `tests/helpers/analyze.js` 執行。

**Organization**: 依 plan「實作順序與 story 相依」的階段：Setup → Foundational → US1 → US2 → US3 → US4 → Polish。**改 golden 的階段（US1–US4）必須依序**，每階段重產相對 `edc22d5` 的累積淨差異並 `--verify` 通過才 commit（由 orchestrator 親自重跑）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、不依賴未完成的任務）
- **[Story]**：所屬 user story（US1–US4）
- 路徑皆相對 repo 根 `/Users/chengfulin/Documents/Personal/dujs`

## 共通約定（每個任務都適用）

- 每階段結尾：`npm test` 全綠、`npm run lint` 0 錯誤；`eslint-suppressions.json` 不得新增鍵或增加 count。
- golden 更新：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js`（同時更新 `tests/golden/expected*` 與 `tests/golden/manifest.json`），接著
  `node specs/007-split-call-nodes/tools/diffcheck.js golden --report` 重產「淨差異（相對 develop）」「重複列數」「釘選與簽核」機器區塊到 `specs/007-split-call-nodes/golden-diff.md`，
  補該階段敘述節、雜湊變化表（舊→新 sha256 前 12 碼）與「單元測試期望」表，最後 `node specs/007-split-call-nodes/tools/diffcheck.js golden --verify specs/007-split-call-nodes/golden-diff.md` exit 0。
- 釘選列（`連結`／`求值順序`／`返回後例外`／KI 類）的簽核欄 implementer 只填「草擬，待簽核」，「說明」欄必填。
- 改動既有測試的期望時，逐處記入 `golden-diff.md` 的「單元測試期望」表（檔案、測試名、舊期望、新期望、FR）。
- intra-procedural 模型不得改變（FR-006）：`intra-procedurals/*` 只允許 `共通` 類差異。
- 不新增節點型別或邊型別（FR-007）；`*.matching.json` 格式不變（`dujs-matching/1`）。

---

## Phase 1: Setup（develop 快照與差異工具；任何 lib 變更之前）

**Purpose**: 在 lib 與 `edc22d5` 相同時取得 MDN／效能基準，並建好 diffcheck。

- [ ] T001 以 `git -C /Users/chengfulin/Documents/Personal/dujs diff --quiet edc22d5 -- lib` 確認工作樹 lib 與基準相同（非 0 即停止並回報）；執行 `npm test`（預期 1495 passing）與 `npm run lint`（0 錯誤），把數字記入 `specs/007-split-call-nodes/perf.md` 的「develop 基準」節
- [ ] T002 [P] 把 `specs/007-split-call-nodes/probes/*.js`（**不含** `run.js`、`baseline-develop.txt`）逐字複製到 `tests/dujs/cases/probes007/`（以 `cmp` 確認逐位元相同；共 37 檔：p1–p35、p15b、p20b）
- [ ] T003 [P] 產生 MDN develop 快照（contracts/diff-check.md §4 步驟 2）：對 `specs/006-eslint-scope/mdn/pages.json` 每個 id，以 `specs/006-eslint-scope/mdn/corpus/` 的檔案跑 CLI（`node bin/dujs.js`），只存 `.dot` 到 `specs/007-split-call-nodes/mdn/baseline-develop/<id>/`，結束碼寫入 `specs/007-split-call-nodes/mdn/baseline-develop/exitcodes.json`，以 `docs/research/mdn-baseline/tools/run-pairs.js` 產生 `specs/007-split-call-nodes/mdn/baseline-develop/<id>.pairs.txt`（作法參照 `specs/006-eslint-scope/mdn/baseline-develop/` 的既有產物與 `specs/006-eslint-scope/mdn/README.md`）
- [ ] T004 量測效能基準（SC-005，R11）：`node specs/006-eslint-scope/tools/perf.js .` 同機 3 輪取中位數，另記 golden 各 case 的 CLI 時間；寫入 `specs/007-split-call-nodes/perf.md` 的「develop 基準（`edc22d5`）」表（與 T003 不同時執行，避免干擾計時；依賴 T001）
- [ ] T005 [P] 先寫 diffcheck 自我測試 `specs/007-split-call-nodes/tools/diffcheck.test.js`（此時應失敗）：(a) 檔頭「基準：`edc22d5`」行的讀取與 `--base` 覆寫；(b) pair 以 (case, 頁, 檔案／層級, 變數) 的**集合**比對（重複列不產生差異）；(c)「重複列數」表（同變數同 pair 標記出現第 2 次以上的列數總和，develop／007／增減）與 `--verify` 核對；(d) 標記改寫（contracts/diff-check.md §1）：純標記差異歸 `標記`、同一 call 節點上一筆 pair 定義端改變時**不**歸 `標記`、重名後綴依 007 規則重指定、KI §15 已帶路徑的 `callReturn (6:T)` 不改寫、基準側找不到 record 的 CALL／CALL RETURN 不改寫；(e) 類別觸發 `連結`／`求值順序`（子標 `判別式`、`可迭代`）／`返回後例外`（子標 `決策返回不拋錯`）／KI 類／`標記`／`共通`（contracts/diff-check.md §2 的機械條件）；(f) 新增或消失的 pair 歸不進前三類或 KI 類 → exit 1；`intra-procedurals/*` 有 pair 差異 → exit 1；(g) 釘選筆數不符、重複列數不符、exit code 不同 → exit 1；無法取得基準 → exit 2
- [ ] T006 實作 `specs/007-split-call-nodes/tools/diffcheck.js`（依賴 T005）：以 `require` 重用 `specs/005-summary-analysis/tools/diffcheck.js` 與 `specs/006-eslint-scope/tools/diffcheck.js` 的匯出（`.dot` 解析與標記正規化含 `finallyExit`、`parseGraph`、`parseHierarchy`、差異單位、`--report` 骨架、`--verify` 讀機器區塊、`exitcodes.json`）；缺匯出時只在該檔新增 `module.exports` 項目、不改其行為。golden 基準取自 git 的 `edc22d5`（不受工作樹 golden 影響）、MDN 基準取 `specs/007-split-call-nodes/mdn/baseline-develop/`。子指令 `golden|mdn` × `--report|--verify <file>`。**標記改寫只在 007 側的該檔已採帶行號形式（含 `call (` 標記）時套用**——US2 之前 lib 仍輸出 `call_x`，若無條件改寫基準側會在 Foundational／US1 產生大量假差異（見文末「plan 缺口」1）；`npx mocha specs/007-split-call-nodes/tools/diffcheck.test.js` 全綠
- [ ] T007 建立 `specs/007-split-call-nodes/golden-diff.md` 與 `specs/007-split-call-nodes/mdn-diff.md`：檔頭「基準：`edc22d5`」行、空的機器區塊（淨差異／重複列數／釘選與簽核）、「單元測試期望」表與雜湊變化表骨架（格式參照 `specs/005-summary-analysis/golden-diff.md`）；執行 `diffcheck golden --verify` 與 `diffcheck mdn --verify`，兩者皆 exit 0（lib 未變，零差異；重複列數表兩側相同）

**Checkpoint**: MDN 快照、perf 基準、diffcheck 與其自我測試就緒；lib 尚未變更（T003、T004 的產物與 T001 的確認同一 commit）。

---

## Phase 2: Foundational（阻擋全部 story；**不接到模型建構，行為不變**）

**Purpose**: `callsplit.js`、`generatedAt`、FlowNode 屬性、esgraph 屬性與匯出、`calleeScopesOfExpression`。golden 預期零差異。

### Tests（先寫）

- [ ] T008 [P] 擴充 `tests/esgraph/test.js`：`SwitchStatement` 的第一個 `case` FlowNode 有 `discriminantThrowTarget`（try 內＝catch 的例外目標、try 外＝null／exit 依 `getExceptionTarget()`、巢狀 switch 各自正確）；判別式拆分節點（`switch (a && b)`）經 branchsplitter 後帶同一屬性；`require('lib/esgraph').throwTypes` 等於 `['AssignmentExpression','BinaryExpression','CallExpression','MemberExpression','NewExpression','UnaryExpression']`（集合相等、為副本）；**不新增任何邊**（同一程式的邊數與型別與加入屬性前相同）；`FlowNode.copyNodes` 複製 `discriminantThrowTarget`（值仍指原節點）；`branchsplitter.isInsideLoopBody` 已匯出
- [ ] T009 [P] 擴充 `tests/dujs/defuseanalyzer.js`：`findGENSet(cfgNode)` 回傳值不變，另設 `cfgNode.generatedAt`（Map<VarDef, AST>）——涵蓋 `var y = g()`（VariableDeclarator）、`x = f()`／`x += f()`（AssignmentExpression）、解構 `var [a, b] = c`、for-of 頭 `var v`、class 宣告名稱、參數與預設值
- [ ] T010 [P] 擴充 `tests/dujs/methodcalls.js` 與 `tests/dujs/newcallsite.js`：新增 `calleeScopesOfExpression(node, expression, scopeTree)` 的案例（`f()`、`o.m()`、`this.m()`、`A.s()`、`new A()` 含欄位初始化式＋constructor 順序、不可解析者回傳 `[]`）；**既有 `calleeScopesOf` 期望此階段不改**
- [ ] T011 [P] 新增 `tests/dujs/callsplit.js`（contracts/acceptance.md「另有單元測試」）：
  後序位置（data-model §5 每列一例：`x += f()`、`x = f()`、`a[i] = f()`、`new F(a)`、`h(f())`、`f() + g()`、`new F().m(x = 1)`〔兩個呼叫點，`new F()` 在前〕、class static 呼叫點與名稱綁定在 static 之前）；
  讀取與定義歸段（`f(x = 1)` 的 `x` 定義在段 0；`var y = g()` 的 `y` 在段 1；ClassDeclaration 名稱在其 static 呼叫點之前）；
  拋錯判定表（FR-005／R6）：返回後可能拋錯 `f() + 1`、`f()[0]`、`!f()`、`if (!f())`、`f().p`、`x = f()`、`f() > x`、`h(f())`（`f` 返回到呼叫 `h` 那段）；不拋錯 `f();`、`var y = f();`、`if (f())`、`return f();`、`f() ? a : b`（拆分後）、`[f()]`；`throw f();` 最後一段 true；`console.log(f())` 最後一段 true；`throws[j]`（j < k）恆 true；`callsplit.THROW_TYPES` 與 esgraph `throwTypes` 相等；
  `evaluatedExpressionsOf`：第一個 `case` 取判別式、其他 `case` 為空、已拆分（`discriminantSplit`／`loopRightSplit`）者不取、for-of 只取右側、`case` test 不取、entry／exit 為空；
  `shape`：`statement`／`decision`／`once-switch`／`once-loop`；`owners`（decision＝`[N]`、once-switch＝所有有 test 的 `case`、only-`default` 時為空）；`throwTarget`（`N.exception`，否則 `discriminantThrowTarget`，否則 null）；
  不列為呼叫點（data-model §5 每列一例，`callSites` 不含該呼叫且其中讀取／定義的 `segmentOf` 有定義）：`c?.m(f())`、`c?.[f()]`、`var [z = f()] = c`、`var {z = f()} = c`、`[z = f()] = c`、`for (o[g()] of a)`、`for (var [z = g()] of a)`、`case g():`、`case class { static y = g(); }:`；
  防護（R13 L3）：`var f = h; f = g, f();` 的 `f()` 不列入、`var o = new A(), r = o.m();` 只列 `new A()`、`f(f = g)` 照常列入；
  參數預設值 `function f(a = g())` 的 `g()` **列入**；`segmentOfVarDef`：`once-loop` 的迴圈變數定義回傳 null；找不到後序位置的 Identifier／定義會拋錯（不默默歸段 0）；`planOf` 結果凍結且以原節點 WeakMap 快取、`reset()` 清快取

### Implementation

- [ ] T012 修改 `lib/esgraph/index.js`（LGPL）：`SwitchStatement` 處理把 `getExceptionTarget()` 記到 `node.cases[0].cfg.discriminantThrowTarget`（只記屬性、不連邊；沒有 `case` 時不記）；`module.exports.throwTypes` 匯出陣列副本；檔頭 Modified 清單加一行記錄本次修改（依賴 T008）
- [ ] T013 修改 `lib/esgraph/flownode.js`（新增 `discriminantThrowTarget`、`generatedAt`、`segment`、`puseOwners`、`deferredPuse` 屬性；`copyNodes` 複製 `discriminantThrowTarget`、不複製 `generatedAt`）與 `lib/esgraph/branchsplitter.js`（判別式脈絡 `origin.type === 'SwitchStatement'` 建立的拆分節點複製 `discriminantThrowTarget`；匯出 `isInsideLoopBody`，只新增匯出）（依賴 T008、T012）
- [ ] T014 修改 `lib/dujs/defuseanalyzer.js` 的 `findGENSet`：另設 `cfgNode.generatedAt`（Map<VarDef, AST>，完成每個定義的 AST 節點），回傳值不變（依賴 T009、T013）
- [ ] T015 修改 `lib/dujs/callresolver.js`：新增並匯出 `calleeScopesOfExpression(node, expression, scopeTree)`（`CallExpression` 成員 callee 走 `calleeScopesOfMethodCall`、`NewExpression` 走 `calleeScopesOfNew`；解析規則不變，004 FR-018、005 FR-005 D2）；`calleeScopesOf` 與 `new F().m()` 分支此階段**不改**（依賴 T010）
- [ ] T016 新增 `lib/dujs/callsplit.js`（MIT 檔頭）：`planOf(node, scopeTree)`、`evaluatedExpressionsOf(node)`、`evaluationOrder(expressions)`、`segmentThrows(plan, j)`、`THROW_TYPES`（附註與 esgraph 相同）、`reset()`；SegmentPlan 欄位依 data-model §1（`node`、`shape`、`expressions`、`order`、`callSites`〔`{index, expression, kind, callees, position}`，`kind` ∈ `'call'`／`'new'`／`'class-static'`，`callees` 非空〕、`segmentCount`、`segmentOf`、`segmentOfVarDef`、`throws`、`throwTarget`、`owners`、`enteringPrev`〔以 `branchsplitter.isInsideLoopBody` 算原圖中迴圈本體外的前驅〕）；後序規則依 data-model §5；不列為呼叫點與防護依 data-model §5；只讀原節點不修改；entry／exit 或無 `astNode` 回傳 `callSites` 為空的 plan；呼叫點的 callees 以 `callresolver.calleeScopesOfExpression` 解析、class static 依原始碼順序（依賴 T011、T013、T014、T015）
- [ ] T017 修改 `tests/helpers/analyze.js`：reset 時呼叫 `callsplit.reset()`（依賴 T016）
- [ ] T018 新增 `tests/dujs/splitcallnodes.js` 骨架：共用 helper（讀 `tests/dujs/cases/probes007/*.js`、以 `tests/helpers/analyze.js` 分析、斷言 inter-procedural 與 intra-page 的 pair「有／沒有」、取 hierarchy call 邊）；**FR-006 守門**：每個 probe 的 `intra(page)` pair 與 `specs/007-split-call-nodes/probes/baseline-develop.txt` 的 `intra(page)` 行逐字相同；**P23 守門**：`p23-iife.js` 結果與 baseline 相同（不連結、不拆分）（此時應通過）（依賴 T002、T017）
- [ ] T019 Foundational 驗證：`npm test`、`npm run lint` 全綠；`diffcheck golden --verify specs/007-split-call-nodes/golden-diff.md` exit 0（零差異，golden 不更新）

**Checkpoint**: callsplit 可單元測試、esgraph 屬性與匯出就緒，模型行為與 develop 相同——user story 可開始。

---

## Phase 3: User Story 1 - 引數與條件中呼叫之前的部分，在被呼叫端執行之前生效（Priority: P1）🎯 MVP

**Goal**: 既有呼叫點（呼叫敘述、決策節點條件本身、`new` 敘述、class static、欄位初始化式中的 `this.m()`／`new B()`）改依 SegmentPlan 分段：段的 GEN／USE、延後 p-use（含摘要）、class 名稱位置規則。例外邊維持 develop 位置，但前插 CALL（段 0）的 exception 邊自本階段建立。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US1`；`node specs/007-split-call-nodes/probes/run.js` 中 P1 有 `x: L5 -> L3`、沒有 `x: L1 -> L3`；P12、P2、P21 依 spec。

### Tests for User Story 1（先寫，預期 US1-1、US1-2 先失敗）

- [ ] T020 [US1] 在 `tests/dujs/splitcallnodes.js` 新增 US1-1…4（p1、p12、p2、p21；inter-procedural 與 intra-page 皆斷言；US1-3、US1-4 為守門，US1-4 斷言 `f: entry -> L6>L7:T` 仍為決策節點 p-use）
- [ ] T021 [P] [US1] 擴充 `tests/dujs/summary.js`（R8）：被呼叫端 `function k() { if (x < f()) {} }`，斷言 `x` ∈ `summaryOf(k).upwardExposed`，且 `*.matching.json` 的 `summaries` 同步列出 `x`
- [ ] T022 [P] [US1] 擴充 `tests/dujs/expansion.js`：(a) `f(x = 1);` 的 `x` 定義在段 0（N 副本／CALL）、`var`-less 呼叫敘述後段 GEN 依 `segmentOfVarDef`；(b) `if (x < f())`：前插 CALL（段 0）帶 `x` 的讀取並記入 `deferredPuse`、`puseOwners` 為 N 副本，`findDUPairs` 以 owner 的 `true`／`false` 產生 pair 且去重；(c) 前插 CALL（段 0）有 exception 邊連到 `copyOf(throwTarget)`（try 內 `if (f())`）；(d) 決策節點副本的 exception 邊**仍保留**（develop 位置，US4 才改）、CALL RETURN 段 1…k 無 exception 邊；(e) 段節點 `segment` 為 `{source, index, plan}`
- [ ] T023 [P] [US1] 在 `tests/dujs/classfields.js` 加守門：class 宣告／運算式的 static 成員相關 pair 與 develop 相同（位置規則取代 `keepGenerateAtCallSite`、`splitByInnerClassName`，**預期零 pair 差異**，有差異即視為 bug）

### Implementation for User Story 1

- [ ] T024 [US1] 修改 `lib/dujs/hierarchy.js`：`addCallEdge(model, spec)` 的 spec 新增 `plan`、`callIndex`、`lastOfCallSite`（凍結 Edge 帶上這三欄）；`beforeDecision` 改為 `plan.shape !== 'statement'`（只第一條邊，串接者 false）；刪除 `keepGenerateAtCallSite`；`isCallBeforeDecision` 保留給沒有 plan 的呼叫者
- [ ] T025 [US1] 修改 `lib/dujs/modelbuilder.js` 的 `getInterProceduralModelStartFromTheScope`：每個節點改用 `callsplit.planOf(node, scopeTree)`，依 `plan.callSites` 逐一、每個呼叫點內依 `callees` 逐一 `hierarchy.addCallEdge`（傳 `{callSite, calleeModel, back, plan, callIndex, lastOfCallSite}`，`order` 跨呼叫點連續編號）；刪除 `findStaticMemberScopesOfClassesAtNode`、`isClassDeclarationNode` 與 `keepGenerateAtCallSite` 的使用（class static 改為 `class-static` 呼叫點）。**US1 暫時篩選**：只採用 develop 會連結的呼叫點（以現行 `callExpressionOf`／`expressionsEvaluatedAtNode` 判定的呼叫運算式與 class static），並排除 `once-*` 形狀；以 `// 007 US2 移除` 註記（依賴 T024）
- [ ] T026 [US1] 修改 `lib/dujs/defuseanalyzer.js`：`findUSESet` 在 `cfgNode.segment` 存在時以 `segment.source` 為規則來源（`usedExpressionsOf`、是否為決策節點），只收 `plan.segmentOf(Identifier) === segment.index` 的讀取；p-use 讀取在段節點不是 owner 時記入 `deferredPuse`；回傳 `{cuse, puse, deferredPuse}`（無 segment 時 `deferredPuse` 為空 Set）；`findDUPairs` 對 `deferredPuse` 以 `puseOwners` 每個 owner 的 `true`／`false` 產生 pair，同一 (定義, owner, 分支) 只加一次
- [ ] T027 [US1] 修改 `lib/dujs/expansion.js` 的 `replayCall`：依 data-model §4 設段節點的 `segment`、`puseOwners`、GEN（`plan.segmentOfVarDef`；攤平圖經 `flatVarDefOf`、摘要圖用原 VarDef）；同一呼叫點內的中間 CALL RETURN 無 GEN／USE、無 exception 邊；`decision` 形狀把 N 副本的全部前驅改指向段 0；前插 CALL（段 0）新增 exception 邊連到 `copyOf(plan.throwTarget)`（有目標時）；其餘 exception 邊維持 develop 位置；刪除 `splitByInnerClassName`；`orderOfCalls` 插入順序不變（依賴 T024、T026）
- [ ] T028 [US1] 修改 `lib/dujs/summary.js` 的 `summaryGraphOf`：讀取集合改為合併 `cuse`、`puse`、`deferredPuse`（去重）；`computeForPage`／`summaryOf` 介面不變（依賴 T026）
- [ ] T029 [US1] 更新編碼舊行為的既有測試（GEN 全搬到 CALL RETURN、`keepGenerateAtCallSite` 等）：`tests/dujs/expansion.js`、`tests/dujs/bypass.js`、`tests/dujs/classfields.js`、`tests/dujs/exceptionsummary.js`、`tests/dujs/hierarchy.js`、`tests/dujs/modelbuilder.js`（僅限確屬 US1 行為變更者），逐處記入 `specs/007-split-call-nodes/golden-diff.md`「單元測試期望」表
- [ ] T030 [US1] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 P1、P2、P12、P21 與 spec US1 情境一致；`npx mocha tests/dujs/splitcallnodes.js` 的 US1 與 FR-006、P23 守門全綠
- [ ] T031 [US1] golden：依「共通約定」更新 golden 與 `tests/golden/manifest.json`，`--report` 寫入 `specs/007-split-call-nodes/golden-diff.md` 的「US1」敘述節（預期只有 `求值順序` 類與 `共通`；不得出現 `返回後例外`），`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: US1 完成——既有呼叫點依求值順序分段；golden 差異只屬求值順序；可 commit（orchestrator 重跑 `--verify`）。

---

## Phase 4: User Story 2 - 運算式中的呼叫是呼叫點（Priority: P1）

**Goal**: 列舉全部呼叫點（運算式、參數預設值、欄位初始化式、箭頭本體、`throw`、`return`）；`new F().m()` 兩個呼叫點；刪除欄位初始化式特例；不列為呼叫點的位置與防護生效；CLI 標記（Q1 A）。`case` 判別式與 for-in/of 右側**暫不列入**（US3 加入）。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US2`；P3、P4、P5、P10、P13、P14、P18、P19、P22、P25、P27、P31、P33 依 spec。

### Tests for User Story 2（先寫）

- [ ] T032 [US2] 在 `tests/dujs/splitcallnodes.js` 新增 US2-1…13（p3、p4、p5、p10、p13、p14、p18、p19、p22、p25、p27、p31、p33）；US2-9 另斷言外層 `console.log` 無 call 邊、`f()` 有 call 邊；US2-12 斷言兩條 call 邊（F 的 constructor、`m`）且順序為 constructor 在前
- [ ] T033 [US2] 在 `tests/dujs/splitcallnodes.js` 新增 characterization／守門（DECISION 005、R13）：
  條件求值位置（L5）`c?.m(f())`、`c?.[f()]`、`var [z = f()] = c`、`var {z = f()} = c`——`f` 無 call 邊、inter／intra-page pair 與 develop 相同、`f` 之前的定義不被錯殺；
  for-in/of 左側（Q2 A，L1）`for (o[g()] of a) {}`、`for (var [z = g()] of a) {}`——`g` 不連結、pair 與 develop 相同（FR-001 明文例外）；
  `case` test 的 class static（Q3 A，L2）`switch (v) { case class { static y = g(); }: … }`——`g`／static scope 不連結，測試名與註解標明「相對 develop 的行為變更（KI §44）」；
  同節點先定義的 callee（L3）`var f = h; f = g, f();`（不連結 `h`、`g`，不得出現經 `h` 的 pair）、`var o = new A(), r = o.m();`（只連 `new A()`）、`f(f = g);`（照常連結）
- [ ] T034 [P] [US2] 擴充 `tests/dujs/cfggraphconverter.js`（Q1 A，FR-007）：CALL／CALL RETURN 標 `call (<行>)`、`callReturn (<行>[:路徑])`，重名加 `_a`、`_b`
- [ ] T035 [P] [US2] 更新 `tests/dujs/methodcalls.js`、`tests/dujs/newcallsite.js`、`tests/dujs/relaxedcallee.js`：`calleeScopesOf` 對 `new A().m()` 的期望改為兩個呼叫點的串接結果；逐處記入「單元測試期望」表
- [ ] T036 [P] [US2] 擴充 `tests/dujs/matching.js`（FR-007）：p6、p31 每條 return 邊在 `*.matching.json` 恰對應一個 record；同一節點多個呼叫點各一筆、`seq` 依求值順序、`callSiteLine` 為 N 的行號

### Implementation for User Story 2

- [ ] T037 [US2] 修改 `lib/dujs/callresolver.js`：`calleeScopesOfMethodCall` 的 `object.type === 'NewExpression'` 分支只回傳 `[method]`（F 為函式時 `[]`）；刪除 `callExpressionOf` 的 `dujsFieldInitializer` 特例；`calleeScopesOf(node, scopeTree)` 改為 `planOf(node).callSites` 的 `callees` 依序串接
- [ ] T038 [US2] 修改 `lib/dujs/modelbuilder.js`：移除 T025 的「develop 呼叫點」暫時篩選，採用 `plan.callSites` 全部（含 `new F().m()` 兩個呼叫點串接、段 1 帶 `m` 的引數）；**保留 `once-*` 形狀的排除**（註記 `// 007 US3 移除`），避免無 once 形狀時以「每個 case 都呼叫」的錯誤形狀連結（依賴 T037）
- [ ] T039 [US2] 修改 `lib/dujs/cfggraphconverter.js` 的 `labelWithLineNumber`：CALL 與 CALL RETURN 一律標 `<type> (<line><pathSuffix>)`，重名 `_a`、`_b` 規則不變
- [ ] T040 [US2] 更新其餘編碼舊行為的既有測試（如 `tests/dujs/expansion.js`、`tests/dujs/paramdefaults.js`、`tests/dujs/paramsandnew.js`、`tests/dujs/classfields.js`、`tests/dujs/cli.js` 中受新呼叫點或新標記影響者），逐處記入「單元測試期望」表
- [ ] T041 [US2] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 US2 各 probe 與 spec 一致、US1 情境不退步；FR-006 守門全綠
- [ ] T042 [US2] golden：依「共通約定」更新並重產累積淨差異到 `specs/007-split-call-nodes/golden-diff.md` 的「US2」敘述節（預期新增 `連結`、`標記` 類；diffcheck 標記改寫自此階段生效），`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: US2 完成——運算式中的呼叫連結；不列為呼叫點的位置以 characterization 釘住；CLI 標記帶行號。

---

## Phase 5: User Story 3 - 一個節點中的讀取、定義與多個呼叫依求值順序（Priority: P2）

**Goal**: 多呼叫點串接驗收；`once-switch`／`once-loop` 形狀（判別式、for-in/of 右側列入）、`discriminantThrowTarget` 的使用、`enteringPrev`；判別式在每個 `case` 各記一筆 p-use、讀求值當下的定義（Q2 A'），與已拆分先例並存。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US3`；P6–P9、P11、P15／P15b、P16、P17、P24、P26、P28、P32 依 spec。

### Tests for User Story 3（先寫）

- [ ] T043 [US3] 在 `tests/dujs/splitcallnodes.js` 新增 US3-1…12（p6、p7、p8、p9、p11、p15＋p15b、p16、p17、p24、p26、p28、p32）；US3-9 斷言 `f` 只有一條 call 邊且前插在第一個 `case` 之前；US3-12 斷言各 `case` 各一筆 p-use、讀判別式求值當下的定義
- [ ] T044 [US3] 在 `tests/dujs/splitcallnodes.js` 新增守門：(a) Clarifications Q4：`for (;; f())`、`do { } while (f())`（develop 已連結，不退步）、`var y = c ?? f();`、`var y = c || f();`（`f` 只在該分支呼叫，同 P17）；(b) 先例並存（R5）：`switch (a && b)`（無呼叫，pair 與 develop 相同、只記一次）、`switch (a && f())`、`for (v of a && f())`（含呼叫的拆分葉依 R1 拆段、`case` 不讀判別式）；(c) once-loop 迴圈變數（data-model §4）：`for (var v of f()) { use(v); v = 2; }`——`f` 只在進入迴圈前呼叫一次、`use(v)` 讀到迴圈頭的定義、沒有 `v = 2` → `use(v)` 的 pair；巢狀迴圈與 `continue` 下的 `enteringPrev`；(d) `switch (f()) {}`（KI §48，R13 L6）：007 不比 develop 差——若仍拋錯，只能是 develop 的同一錯誤（`Cannot read properties of undefined`），不得出現其他失敗模式；若能完成分析，更新本測試並在 Polish 更新 KI §48
- [ ] T045 [P] [US3] 擴充 `tests/dujs/matching.js`：p32、p15 每條 return 邊恰對應一個 record；`beforeDecision` 對決策節點、switch 判別式、for-of 右側皆為 `true`
- [ ] T046 [P] [US3] 擴充 `tests/dujs/expansion.js`：`once-switch` 把第一個 `case` 副本的全部前驅改指向段 0、各 `case` 副本設 `discriminantSplit`（原節點不動）、段 0 exception 邊連到 `copyOf(discriminantThrowTarget)`；`once-loop` 只改「來源的原節點屬 `enteringPrev`」的前驅（CALL／CALL RETURN 以 `segment.source` 比對）、迴圈副本設 `loopRightSplit`、迴圈本體回邊仍直接回到迴圈節點

### Implementation for User Story 3

- [ ] T047 [US3] 修改 `lib/dujs/callsplit.js`：確認／補齊 `once-switch` 的 `owners`（所有有 test 的 `case`）、`throwTarget` 取 `discriminantThrowTarget`、`once-loop` 的 `enteringPrev` 與 `segmentOfVarDef` 對迴圈變數回傳 null；沒有 `case` 的 `switch` 不形成 plan
- [ ] T048 [US3] 修改 `lib/dujs/modelbuilder.js`：移除 T038 保留的 `once-*` 排除；`once-loop` 的 `enteringPrev` 經 plan 帶到呼叫邊（依賴 T047）
- [ ] T049 [US3] 修改 `lib/dujs/expansion.js` 的 `replayCall`：`once-switch`／`once-loop` 的前插段鏈與前驅改向（data-model §4）、在 N 副本（及同一 switch 其他 `case` 副本）設 `discriminantSplit`／`loopRightSplit`、段 k 的 normal 邊 → N 副本、段 0 exception 邊連 `copyOf(plan.throwTarget)`（依賴 T048）
- [ ] T050 [US3] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 US3 各 probe 與 spec 一致、US1／US2 不退步；FR-006 守門全綠
- [ ] T051 [US3] golden：依「共通約定」更新並重產累積淨差異到 `specs/007-split-call-nodes/golden-diff.md` 的「US3」敘述節（預期 `求值順序`／子標 `判別式`、`可迭代`；先例 switch 零差異），`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: US3 完成——多呼叫點串接、switch 判別式與 for-in/of 右側只求值一次。

---

## Phase 6: User Story 4 - 返回之後的求值也可能拋錯（Priority: P3）

**Goal**: 依 `plan.throws` 連段的 exception 邊；決策副本最後一段不拋錯時移除其 exception 邊；`exceptionalReturn` 改取 N 的例外目標。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US4`；P20、P20b、P29、P30、P34、P35 依 spec。

### Tests for User Story 4（先寫）

- [ ] T052 [US4] 在 `tests/dujs/splitcallnodes.js` 新增 US4-1…6（p20、p20b、p29、p30、p34、p35）；US4-6 另斷言決策節點副本沒有 exception 出邊
- [ ] T053 [P] [US4] 擴充 `tests/dujs/exceptionsummary.js` 與 `tests/dujs/expansion.js`：CALL RETURN 段 j≥1 只在 `throws[j]` 為真時有 exception 邊；`decision` 形狀 `throws[k]` 為假時 N 副本無 exception 邊；CallSiteRecord 的 `exceptionalReturn` 為 `copyOf(plan.throwTarget)`（決策副本例外邊被移除時仍正確，無目標時為 null）

### Implementation for User Story 4

- [ ] T054 [US4] 修改 `lib/dujs/expansion.js`：`replayCall` 依 `plan.throws` 連段 1…k 的 exception 邊到 `copyOf(plan.throwTarget)`；`decision` 形狀在 `throws[k]` 為假時移除 N 副本的 exception 邊；`finishCallRecords` 的 `exceptionalReturn` 改取 `copyOf(plan.throwTarget)`（依賴 T053）
- [ ] T055 [US4] 更新編碼舊例外行為的既有測試（`tests/dujs/exceptionsummary.js`、`tests/dujs/expansion.js`、`tests/dujs/finallyflow.js` 等受影響者），逐處記入「單元測試期望」表；`reachingsolver.js` 不改程式（以既有測試確認）
- [ ] T056 [US4] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 US4 各 probe 與 spec 一致、US1–US3 不退步
- [ ] T057 [US4] golden：依「共通約定」更新並重產累積淨差異到 `specs/007-split-call-nodes/golden-diff.md` 的「US4」敘述節（預期 `返回後例外`、子類 `決策返回不拋錯`，含 P35 型的 − pair），`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: 全部 user story 完成；golden 收尾，golden-diff 釘選列待使用者簽核。

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T058 SC-002 全量確認：`node specs/007-split-call-nodes/probes/run.js` 的 P1–P35、P20b 與 spec 各情境逐條一致、P23 與 `baseline-develop.txt` 相同；`npx mocha tests/dujs/splitcallnodes.js` 全綠（SC-001）
- [ ] T059 MDN 驗證（FR-009、SC-004）：`node specs/007-split-call-nodes/tools/diffcheck.js mdn --report` 對 `specs/006-eslint-scope/mdn/corpus` 33 檔與 `specs/007-split-call-nodes/mdn/baseline-develop/` 比對，寫入 `specs/007-split-call-nodes/mdn-diff.md`（去重 pair 淨差異、重複列數表、釘選草擬）；全部檔案完成分析、結束碼與基準相同；歸不進類別的差異先在 `docs/known-issues.md` 記為新已知問題再以 KI 類記錄；`diffcheck mdn --verify specs/007-split-call-nodes/mdn-diff.md` exit 0
- [ ] T060 效能（SC-005）：`node specs/006-eslint-scope/tools/perf.js .` 同機 3 輪中位數＋golden CLI 時間，寫入 `specs/007-split-call-nodes/perf.md` 的「007」表與比值；總分析時間 ≤ develop × 2，超過即回報並停止
- [ ] T061 [P] 更新 `docs/known-issues.md`（FR-010，R12）第一部分：開頭 feature 摘要段落加入 007；§16、§22 (3) 標「Fixed by `007-split-call-nodes`」（保留原描述，前加修正說明，含 P1、P3 修正後 pair）；§10「`return g();` is still not connected」後加註已由 007 修正（`d: L1 -> L3`）；§36 補「被呼叫端正常返回後不再拋錯」只適用呼叫敘述、運算式中的呼叫依 FR-005 按段判定（`var y = f().p;`、`x = f();`），並註明 `if (f())` 返回後不再拋錯為 007 的行為變更
- [ ] T062 更新 `docs/known-issues.md` 第二部分（依賴 T061，同檔）：新增 §44「`case` test 的讀取與呼叫不建模」（分開記：一般讀取與呼叫為既有限制；class static 成員為**相對 develop 的行為變更**，Q3 A）；§45「007 的行為變更」（分段語意與標記、switch／for-in/of 只求值一次與已拆分先例並存、決策節點返回後不拋錯）；§46「不列為呼叫點的位置」（for-in/of 左側〔FR-001 例外，Q2 A〕、條件求值位置〔`?.` 之後、解構預設值〕、同節點先定義的 callee／receiver〔防護〕）；§47「判別式拆分節點的例外邊」（R13 L4）；§48「`switch` 沒有 `case` 時判別式含呼叫會拋錯」（既有 bug，依 T044 (d) 的結果寫現況）；T059 的新已知問題若有則接續編號
- [ ] T063 [P] 更新 `README.md`（FR-007、FR-010，R9）：Limits 不再寫「Only call statements are connected…」，改為運算式中的呼叫也是呼叫點並列出仍不是呼叫點的形式（IIFE、回呼、`super(…)`、optional call、getter／setter、tagged template、隱含呼叫、`case` test、for-in/of 左側、`?.` 之後與解構預設值、同節點先定義的 callee）；補「段」的說明（CALL、CALL RETURN 與決策節點的對應，c-use 可在 CALL RETURN 上、p-use 仍記在決策節點）、`beforeDecision` 的新涵義、CALL／CALL RETURN 的 `call (<行>)` 標記規則；明記未新增節點／邊型別
- [ ] T064 執行 `specs/007-split-call-nodes/quickstart.md` 全流程（§1–§6）：`npm test`、`npm run lint`、probes、`node bin/dujs.js -js specs/007-split-call-nodes/probes/p6-two-calls.js` 的 `.graph.dot` 有兩組 `call (11)`／`callReturn (11)` 且 matching 每條 return 邊對應一個 record、`npx mocha specs/007-split-call-nodes/tools/diffcheck.test.js`、golden 與 mdn `--verify` 皆 exit 0；確認 `lib/esgraph/index.js` 檔頭 Modified 行、`eslint-suppressions.json` 未新增鍵或增加 count、`lib/dujs/reachingsolver.js`／`usedexpressions.js`／`outputwriter.js` 未改（`git -C /Users/chengfulin/Documents/Personal/dujs diff edc22d5 --stat -- lib`）
- [ ] T065 **PR 前提醒（不得略過）**：通知使用者簽核 `specs/007-split-call-nodes/golden-diff.md`（golden 收尾後）與 `specs/007-split-call-nodes/mdn-diff.md`（MDN 驗證後）的「釘選與簽核」列；簽核前簽核欄維持「草擬，待簽核」，未簽核的 golden 變更不得合併（FR-008）；不同意之列回到對應階段修正後整表重產並重跑 `--verify`。PR 目標 `develop`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**：無相依；T001 必須最先；T003、T004 必須在任何 lib 變更前完成。
- **Foundational（Phase 2）**：依賴 Setup；阻擋所有 story。
- **US1 → US2 → US3 → US4**：**嚴格依序**（各階段都改 golden，累積淨差異相對 `edc22d5` 重產；US2 移除 US1 的暫時篩選、US3 移除 US2 的 `once-*` 排除、US4 改 US1–US3 保留的例外邊）。
- **Polish（Phase 7）**：依賴 US4；T061 → T062 同檔依序；T065 最後。

### Within Each Phase

- Foundational：T008 → T012 → T013；T009 → T014；T010 → T015；T011＋T013＋T014＋T015 → T016 → T017 → T018 → T019。
- 每個 story：測試（先失敗）→ lib 實作 → 更新既有測試期望 → probes 確認 → golden 更新與 `--verify`。

### Parallel Opportunities

- Setup：T002、T003、T005 可並行（T004 不與 T003 同時，以免干擾計時）。
- Foundational 測試：T008、T009、T010、T011 可並行（不同檔）。
- US1：T021、T022、T023 可並行（T020 與 T018 同檔）。
- US2：T034、T035、T036 可並行。
- US3：T045、T046 可並行。
- US4：T053。
- Polish：T061、T063 可並行。

## Parallel Example: Foundational 測試

```text
T008 tests/esgraph/test.js（discriminantThrowTarget、throwTypes）
T009 tests/dujs/defuseanalyzer.js（generatedAt）
T010 tests/dujs/methodcalls.js、newcallsite.js（calleeScopesOfExpression）
T011 tests/dujs/callsplit.js（後序、歸段、拋錯判定、不列為呼叫點）
```

## Implementation Strategy

- **MVP**：Setup → Foundational → US1（KI §16 的核心缺陷修正；golden 差異只有求值順序一類）。
- **增量**：US2（連結）→ US3（只求值一次）→ US4（返回後例外），每階段 golden 更新、`--verify`、commit；最後 Polish 做 MDN、效能、文件、簽核提醒。

## plan 缺口（tasks 生成時的處置）

1. **標記改寫與階段順序**：contracts/diff-check.md §1 無條件把基準側 `call_x` 改寫成 `call (<行>)`，但 CLI 標記（Q1 A）在 US2 才改；Foundational「零差異 `--verify`」與 US1 會因此出現大量假差異。T006 改為「只在 007 側已採帶行號形式時改寫」。
2. **US1／US2 的暫時篩選機制**：plan 只說 US1 處理「既有呼叫點」、US2 暫不列入判別式與 for-in/of 右側，未指定機制。T025、T038 以 `modelbuilder.js` 的暫時篩選實作並在 US2／US3 移除；因此 US3 也修改 `modelbuilder.js`（plan 的 US3 主要檔案只列 `expansion.js`、`callsplit.js`）。
