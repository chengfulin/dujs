---

description: "Task list for feature 007-split-call-nodes"
---

# Tasks：把含呼叫的節點拆成「呼叫之前」與「返回之後」（KI §16、§22 (3)）

**Input**: `specs/007-split-call-nodes/` 的 spec.md、plan.md（「已裁決的事項（DECISION 005）」與「analyze 修正（DECISION 006）」為權威）、research.md（R0–R13）、data-model.md、contracts/（lib-api.md、diff-check.md、acceptance.md）、quickstart.md

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

- [X] T001 以 `git -C /Users/chengfulin/Documents/Personal/dujs diff --quiet edc22d5 -- lib` 確認工作樹 lib 與基準相同（非 0 即停止並回報）；執行 `npm test`（預期 1495 passing）與 `npm run lint`（0 錯誤），把數字記入 `specs/007-split-call-nodes/perf.md` 的「develop 基準」節
- [X] T002 [P] 把 `specs/007-split-call-nodes/probes/*.js`（**不含** `run.js`、`baseline-develop.txt`）逐字複製到 `tests/dujs/cases/probes007/`（以 `cmp` 確認逐位元相同；共 37 檔：p1–p35、p15b、p20b）
- [X] T003 [P] 產生 MDN develop 快照（contracts/diff-check.md §4 步驟 2）：對 `specs/006-eslint-scope/mdn/pages.json` 每個 id，以 `specs/006-eslint-scope/mdn/corpus/` 的檔案跑 CLI（`node bin/dujs.js`），存各模型的 `.dot` **與 `*.matching.json`**（標記改寫的基準側輸入，contracts/diff-check.md §1；DECISION 006 Q3）到 `specs/007-split-call-nodes/mdn/baseline-develop/<id>/`，結束碼寫入 `specs/007-split-call-nodes/mdn/baseline-develop/exitcodes.json`，以 `docs/research/mdn-baseline/tools/run-pairs.js` 產生 `specs/007-split-call-nodes/mdn/baseline-develop/<id>.pairs.txt`（作法參照 `specs/006-eslint-scope/mdn/baseline-develop/` 的既有產物與 `specs/006-eslint-scope/mdn/README.md`）
- [X] T004 量測效能基準（SC-005，R11）：`node specs/006-eslint-scope/tools/perf.js .` 同機 3 輪取中位數，另記 golden 各 case 的 CLI 時間；寫入 `specs/007-split-call-nodes/perf.md` 的「develop 基準（`edc22d5`）」表（與 T003 不同時執行，避免干擾計時；依賴 T001）
- [X] T005 [P] 先寫 diffcheck 自我測試 `specs/007-split-call-nodes/tools/diffcheck.test.js`（此時應失敗）：(a) 檔頭「基準：`edc22d5`」行的讀取與 `--base` 覆寫；(b) pair 以 (case, 頁, 檔案／層級, 變數) 的**集合**比對（重複列不產生差異）；(c)「重複列數」表（同變數同 pair 標記出現第 2 次以上的列數總和，develop／007／增減）與 `--verify` 核對；(d) 標記改寫（contracts/diff-check.md §1）：純標記差異歸 `標記`、同一 call 節點上一筆 pair 定義端改變時**不**歸 `標記`、重名後綴依 007 規則重指定、KI §15 已帶路徑的 `callReturn (6:T)` 不改寫、基準側找不到 record 的 CALL／CALL RETURN 不改寫；**第 0 步**：007 側同一模型的 `.graph.dot` 沒有節點標記 `label="call (`（仍為 `call_x`）時不改寫、兩側零差異，`.dupairs.dot` 跟隨同模型 `.graph.dot` 的判定（只有 `callReturn (6:T)` 不觸發改寫）；(e) 類別觸發 `連結`／`求值順序`（子標 `判別式`、`可迭代`）／`返回後例外`（子標 `決策返回不拋錯`）／KI 類／`標記`／`共通`（contracts/diff-check.md §2 的機械條件）；(f) 新增或消失的 pair 歸不進前三類或 KI 類 → exit 1；`intra-procedurals/*` 有 pair 差異 → exit 1；(g) 釘選筆數不符、重複列數不符、exit code 不同 → exit 1；無法取得基準 → exit 2；(h) MDN 基準側以快照中的 `*.matching.json` 改寫標記（與 golden 側取自 git 的 matching 同一路徑邏輯），快照中某模型有 CALL 節點卻缺該模型的 `*.matching.json` → exit 2（DECISION 006 Q3）；(i)「class static 不再連結」表（contracts/diff-check.md §2）：基準側 `.hierarchy.dot` 有連到 static 成員 scope 的 call 邊、007 側同頁同行沒有時列出（含無 pair 差異者），相關 ± pair 歸 `§44`／`§46` 類，`--verify` 核對筆數
- [X] T006 實作 `specs/007-split-call-nodes/tools/diffcheck.js`（依賴 T005）：以 `require` 重用 `specs/005-summary-analysis/tools/diffcheck.js` 與 `specs/006-eslint-scope/tools/diffcheck.js` 的匯出（`.dot` 解析與標記正規化含 `finallyExit`、`parseGraph`、`parseHierarchy`、差異單位、`--report` 骨架、`--verify` 讀機器區塊、`exitcodes.json`）；缺匯出時只在該檔新增 `module.exports` 項目、不改其行為。golden 基準取自 git 的 `edc22d5`（不受工作樹 golden 影響）、MDN 基準取 `specs/007-split-call-nodes/mdn/baseline-develop/`。子指令 `golden|mdn` × `--report|--verify <file>`。**標記改寫依 contracts/diff-check.md §1 第 0 步**：只在 007 側同一模型的 `.graph.dot` 有節點標記 `label="call (`（完整字串，不用子字串 `call (`）時改寫基準側，`.dupairs.dot` 跟隨同模型 `.graph.dot`——US2 之前 lib 仍輸出 `call_x`，無條件改寫會在 Foundational／US1 產生大量假差異；MDN 基準側讀快照中的 `*.matching.json`；另實作「class static 不再連結」表（§2）；`npx mocha specs/007-split-call-nodes/tools/diffcheck.test.js` 全綠
- [X] T007 建立 `specs/007-split-call-nodes/golden-diff.md` 與 `specs/007-split-call-nodes/mdn-diff.md`：檔頭「基準：`edc22d5`」行、空的機器區塊（淨差異／重複列數／釘選與簽核）、「單元測試期望」表與雜湊變化表骨架（格式參照 `specs/005-summary-analysis/golden-diff.md`）；執行 `diffcheck golden --verify` 與 `diffcheck mdn --verify`，兩者皆 exit 0（lib 未變，零差異；重複列數表兩側相同）

**Checkpoint**: MDN 快照、perf 基準、diffcheck 與其自我測試就緒；lib 尚未變更（T003、T004 的產物與 T001 的確認同一 commit）。

---

## Phase 2: Foundational（阻擋全部 story；**不接到模型建構，行為不變**）

**Purpose**: `callsplit.js`、`generatedAt`、FlowNode 屬性、esgraph 屬性與匯出、`calleeScopesOfExpression`。golden 預期零差異。

### Tests（先寫）

- [X] T008 [P] 擴充 `tests/esgraph/test.js`：`SwitchStatement` 的第一個 `case` FlowNode 有 `discriminantThrowTarget`（try 內＝catch 的例外目標、try 外＝null／exit 依 `getExceptionTarget()`、巢狀 switch 各自正確）；判別式拆分節點（`switch (a && b)`）經 branchsplitter 後帶同一屬性；`require('lib/esgraph').throwTypes` 等於 `['AssignmentExpression','BinaryExpression','CallExpression','MemberExpression','NewExpression','UnaryExpression']`（集合相等、為副本）；**不新增任何邊**（同一程式的邊數與型別與加入屬性前相同）；`FlowNode.copyNodes` 複製 `discriminantThrowTarget`（值仍指原節點）；`branchsplitter.isInsideLoopBody` 已匯出
- [X] T009 [P] 擴充 `tests/dujs/defuseanalyzer.js`：`findGENSet(cfgNode)` 回傳值不變，另設 `cfgNode.generatedAt`（Map<VarDef, AST>）——涵蓋 `var y = g()`（VariableDeclarator）、`x = f()`／`x += f()`（AssignmentExpression）、解構 `var [a, b] = c`、for-of 頭 `var v`、class 宣告名稱、參數與預設值
- [X] T010 [P] 擴充 `tests/dujs/methodcalls.js` 與 `tests/dujs/newcallsite.js`：新增 `calleeScopesOfExpression(node, expression, scopeTree)` 的案例（`f()`、`o.m()`、`this.m()`、`A.s()`、`new A()` 含欄位初始化式＋constructor 順序、不可解析者回傳 `[]`）；**既有 `calleeScopesOf` 期望此階段不改**
- [X] T011 [P] 新增 `tests/dujs/callsplit.js`（contracts/acceptance.md「另有單元測試」）：
  後序位置（data-model §5 每列一例：`x += f()`、`x = f()`、`a[i] = f()`、`new F(a)`、`h(f())`、`f() + g()`、`new F().m(x = 1)`〔兩個呼叫點，`new F()` 在前；**T037 之前只斷言位置**（`new F()` → `x = 1` → `.m()` 的後序與 `x` 定義的段），`.m()` 的 `callees` 在 T037 前仍含 F 的 constructor，T037 完成時補斷言 `callees` 為 `[m]`〕、class static 呼叫點與名稱綁定在 static 之前）；
  讀取與定義歸段（`f(x = 1)` 的 `x` 定義在段 0；`var y = g()` 的 `y` 在段 1；ClassDeclaration 名稱在其 static 呼叫點之前）；
  拋錯判定表（FR-005／R6）：返回後可能拋錯 `f() + 1`、`f()[0]`、`!f()`、`if (!f())`、`f().p`、`x = f()`、`f() > x`、`h(f())`（`f` 返回到呼叫 `h` 那段）；不拋錯 `f();`、`var y = f();`、`if (f())`、`return f();`、`f() ? a : b`（拆分後）、`[f()]`；`throw f();` 最後一段 true；`console.log(f())` 最後一段 true；`throws[j]`（j < k）恆 true；`callsplit.THROW_TYPES` 與 esgraph `throwTypes` 相等；
  `evaluatedExpressionsOf`：第一個 `case` 取判別式、其他 `case` 為空、已拆分（`discriminantSplit`／`loopRightSplit`）者不取、for-of 只取右側、`case` test 不取、`CatchClause` 取 `param`（`catch {}` 為空；data-model §5「catch 參數」）、entry／exit 為空；
  `shape`：`statement`／`decision`／`once-switch`／`once-loop`；`owners`（decision＝`[N]`、once-switch＝所有有 test 的 `case`、only-`default` 時為空）；`throwTarget`（`N.exception`，否則 `discriminantThrowTarget`，否則 null）；
  不列為呼叫點（data-model §5 每列一例，`callSites` 不含該呼叫且其中讀取／定義的 `segmentOf` 有定義）：`c?.m(f())`、`c?.[f()]`、`var [z = f()] = c`、`var {z = f()} = c`、`[z = f()] = c`、`for (o[g()] of a)`、`for (var [z = g()] of a)`、`case g():`、`case class { static y = g(); }:`；class static 變體（不成為 `class-static` 呼叫點，DECISION 006 Q4 必修 3）：`var [z = class { static y = g(); }] = c`、`c?.m(class { static y = g(); })`、`for (o[class { static y = g(); }] of c)`、`catch ({a = class { static y = g(); }})`；
  防護（R13 L3）：`var f = h; f = g, f();` 的 `f()` 不列入、`var o = new A(), r = o.m();` 只列 `new A()`、`f(f = g)` 照常列入；
  參數預設值 `function f(a = g())` 的 `g()` **列入**；`segmentOfVarDef`：`once-loop` 的迴圈變數定義回傳 null；找不到後序位置的 Identifier／定義會拋錯（不默默歸段 0）；`planOf` 結果凍結且以原節點 WeakMap 快取、`reset()` 清快取；**階段性 predicate（暫時項，DECISION 006 Q2；T048 刪除這組案例）**：不給 predicate 時全列舉（含 `once-*`）；給 predicate 時篩掉的呼叫點不進 `callSites`、`segmentOf`／`segmentOfVarDef`／`throws` 依留下的呼叫點重算（例：`h(g())` 篩掉 `g()` → k = 1，`g` 的讀取在段 0）；同一原節點以有／無 predicate 查詢得到不同 plan（快取分開）

### Implementation

- [X] T012 修改 `lib/esgraph/index.js`（LGPL）：`SwitchStatement` 處理把 `getExceptionTarget()` 記到 `node.cases[0].cfg.discriminantThrowTarget`（只記屬性、不連邊；沒有 `case` 時不記）；`module.exports.throwTypes` 匯出陣列副本；檔頭 Modified 清單加一行記錄本次修改（依賴 T008）
- [X] T013 修改 `lib/esgraph/flownode.js`（新增 `discriminantThrowTarget`、`generatedAt`、`segment`、`puseOwners`、`deferredPuse` 屬性；`copyNodes` 複製 `discriminantThrowTarget`、不複製 `generatedAt`）與 `lib/esgraph/branchsplitter.js`（判別式脈絡 `origin.type === 'SwitchStatement'` 建立的拆分節點複製 `discriminantThrowTarget`；匯出 `isInsideLoopBody`，只新增匯出）（依賴 T008、T012）
- [X] T014 修改 `lib/dujs/defuseanalyzer.js` 的 `findGENSet`：另設 `cfgNode.generatedAt`（Map<VarDef, AST>，完成每個定義的 AST 節點），回傳值不變（依賴 T009、T013）
- [X] T015 修改 `lib/dujs/callresolver.js`：新增並匯出 `calleeScopesOfExpression(node, expression, scopeTree)`（`CallExpression` 成員 callee 走 `calleeScopesOfMethodCall`、`NewExpression` 走 `calleeScopesOfNew`；解析規則不變，004 FR-018、005 FR-005 D2）；`calleeScopesOf` 與 `new F().m()` 分支此階段**不改**（依賴 T010）
- [X] T016 新增 `lib/dujs/callsplit.js`（MIT 檔頭）：`planOf(node, scopeTree[, predicate])`（predicate 為暫時項，contracts/lib-api.md §1；快取 `WeakMap<原節點, Map<predicate, plan>>`）、`evaluatedExpressionsOf(node)`、`evaluationOrder(expressions)`、`segmentThrows(plan, j)`、`THROW_TYPES`（附註與 esgraph 相同）、`reset()`；SegmentPlan 欄位依 data-model §1（`node`、`shape`、`expressions`、`order`、`callSites`〔`{index, expression, kind, callees, position}`，`kind` ∈ `'call'`／`'new'`／`'class-static'`，`callees` 非空〕、`segmentCount`、`segmentOf`、`segmentOfVarDef`、`throws`、`throwTarget`、`owners`、`enteringPrev`〔以 `branchsplitter.isInsideLoopBody(prev, loop, reachableOutside)` 算原圖中迴圈本體外的前驅；第三個參數 `reachableOutside` 是 `() -> Set`（不經迴圈節點、從 entry 可達的節點集合），由 callsplit 依原圖自行計算，照 branchsplitter 的作法（branchsplitter.js:105 的簽名、231 的使用），每個迴圈算一次（惰性、以迴圈節點快取）〕）；後序規則依 data-model §5；不列為呼叫點與防護依 data-model §5；只讀原節點不修改；entry／exit 或無 `astNode` 回傳 `callSites` 為空的 plan；呼叫點的 callees 以 `callresolver.calleeScopesOfExpression` 解析、class static 依原始碼順序（依賴 T011、T013、T014、T015）
- [X] T017 修改 `tests/helpers/analyze.js`：reset 時呼叫 `callsplit.reset()`（依賴 T016）
- [X] T018 新增 `tests/dujs/splitcallnodes.js` 骨架：共用 helper（讀 `tests/dujs/cases/probes007/*.js`、以 `tests/helpers/analyze.js` 分析、斷言 inter-procedural 與 intra-page 的 pair「有／沒有」、取 hierarchy call 邊）；**FR-006 守門**：每個 probe 的 `intra(page)` pair 與 `specs/007-split-call-nodes/probes/baseline-develop.txt` 的 `intra(page)` 行逐字相同；**P23 守門**：`p23-iife.js` 結果與 baseline 相同（不連結、不拆分）（此時應通過）（依賴 T002、T017）
- [X] T019 Foundational 驗證：`npm test`、`npm run lint` 全綠；`diffcheck golden --verify specs/007-split-call-nodes/golden-diff.md` exit 0（零差異，golden 不更新）

**Checkpoint**: callsplit 可單元測試、esgraph 屬性與匯出就緒，模型行為與 develop 相同——user story 可開始。

---

## Phase 3: User Story 1 - 引數與條件中呼叫之前的部分，在被呼叫端執行之前生效（Priority: P1）🎯 MVP

**Goal**: 既有呼叫點（呼叫敘述、決策節點條件本身、`new` 敘述、class static、欄位初始化式中的 `this.m()`／`new B()`）改依 SegmentPlan 分段：段的 GEN／USE、延後 p-use（含摘要）、class 名稱位置規則。例外邊維持 develop 位置，但前插 CALL（段 0）的 exception 邊自本階段建立。呼叫點以階段性 predicate（`callresolver.stagedCallSite`）只留 develop 會連結者；不列為呼叫點的位置中 class static 自本階段起不再連結（行為變更，T066 釘住）。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US1`；`node specs/007-split-call-nodes/probes/run.js` 中 P1 有 `x: L5 -> L3`、沒有 `x: L1 -> L3`；P12、P2、P21 依 spec。

### Tests for User Story 1（先寫，預期 US1-1、US1-2 先失敗）

- [X] T020 [US1] 在 `tests/dujs/splitcallnodes.js` 新增 US1-1…4（p1、p12、p2、p21；inter-procedural 與 intra-page 皆斷言；US1-3、US1-4 為守門，US1-4 斷言 `f: entry -> L6>L7:T` 仍為決策節點 p-use）
- [X] T021 [P] [US1] 擴充 `tests/dujs/summary.js`（R8）：被呼叫端 `function k() { if (f(x)) {} }`（US1 的呼叫點須是 `astNode` 本身；`if (x < f())` 的 `astNode` 是 BinaryExpression，US1 不列，移到 T036），斷言 callee `f` 的讀取（決策節點的延後 p-use，同 US1-4／P21）與 `x`（引數，c-use）都 ∈ `summaryOf(k).upwardExposed`，且 `*.matching.json` 的 `summaries` 同步列出
- [X] T022 [P] [US1] 擴充 `tests/dujs/expansion.js`：(a) `f(x = 1);` 的 `x` 定義在段 0（N 副本／CALL）、`var`-less 呼叫敘述後段 GEN 依 `segmentOfVarDef`；(b) `if (f(x))`：前插 CALL（段 0）帶 callee `f` 的讀取並記入 `deferredPuse`（`x` 為引數，記為 c-use）、`puseOwners` 為 N 副本，`findDUPairs` 以 owner 的 `true`／`false` 產生 `f` 的 pair 且去重（`x < f()` 版本移到 T036）；(c) 前插 CALL（段 0）有 exception 邊連到 `copyOf(throwTarget)`（try 內 `if (f())`）；(d) 決策節點副本的 exception 邊**仍保留**（develop 位置，US4 才改）、CALL RETURN 段 1…k 無 exception 邊；(e) 段節點 `segment` 為 `{source, index, plan}`
- [X] T023 [P] [US1] 在 `tests/dujs/classfields.js` 加守門：class 宣告／運算式的 static 成員相關 pair 與 develop 相同（位置規則取代 `keepGenerateAtCallSite`、`splitByInnerClassName`，**預期零 pair 差異**，有差異即視為 bug；不含 T066 的行為變更位置）
- [X] T066 [US1] 在 `tests/dujs/splitcallnodes.js` 新增 class static 的 characterization（自 T033 提前：行為在 T025 刪除 `findStaticMemberScopesOfClassesAtNode` 時就改變；DECISION 005 Q3 A、DECISION 006 Q4 必修 3，R13 L2、L2'）：`switch (v) { case class { static y = g(); }: … }`、`var [z = class { static y = g(); }] = c`、`c?.m(class { static y = g(); })`、`for (o[class { static y = g(); }] of c) {}`、`try { … } catch ({a = class { static y = g(); }}) { … }`——五例的 static scope 與 `g` 皆不連結（hierarchy 無 call 邊），測試名與註解標明「相對 develop 的行為變更（`case` test：KI §44；其餘：KI §46）」；`case` 例指留在 case 節點內的 test，拆出運算元中的 class static 仍連結（US1 另有測試）（依賴 T018）

### Implementation for User Story 1

- [X] T024 [US1] 修改 `lib/dujs/hierarchy.js`：`addCallEdge(model, spec)` 的 spec 新增 `plan`、`callIndex`、`lastOfCallSite`（凍結 Edge 帶上這三欄）；`beforeDecision` 改為 `plan.shape !== 'statement'`（只第一條邊，串接者 false）；刪除 `keepGenerateAtCallSite`；`isCallBeforeDecision` 保留給沒有 plan 的呼叫者
- [X] T025 [US1] 修改 `lib/dujs/modelbuilder.js` 的 `getInterProceduralModelStartFromTheScope`：每個節點改用 `callsplit.planOf(node, scopeTree, callResolver.stagedCallSite)`，依 `plan.callSites` 逐一、每個呼叫點內依 `callees` 逐一 `hierarchy.addCallEdge`（傳 `{callSite, calleeModel, back, plan, callIndex, lastOfCallSite}`，`order` 跨呼叫點連續編號）；刪除 `findStaticMemberScopesOfClassesAtNode`、`isClassDeclarationNode`、`keepGenerateAtCallSite` 的使用，以及只供前者使用的 `expressionsEvaluatedAtNode`（modelbuilder.js:285）與 `preEvaluatedAt`（:270）（否則 T031 的 lint 會因 `no-unused-vars` 失敗；class static 改為 `class-static` 呼叫點）；`lib/dujs/usedexpressions.js` 第 94 行附近引用 `modelbuilder.expressionsEvaluatedAtNode` 的註解改寫（只改註解）。**US1 階段性篩選（DECISION 006 Q2，plan「階段性的呼叫點篩選」）**：在 `lib/dujs/callresolver.js` 新增並匯出暫時的 `stagedCallSite(entry, node, shape)`——`shape` 為 `once-*` 時回傳 false；否則 `entry.expression === callExpressionOf(node)`（callresolver.js:158-172）或 `entry.kind === 'class-static'` 時回傳 true；篩選只經 `planOf` 的 predicate 做（段由 plan 重算），modelbuilder 不另行丟棄呼叫點；以 `// 007 US2 縮小、US3 移除` 註記。過渡失真：`new F().m(x = 1)` 的 `x = 1` 在 US1 落在段 0（`.m()` 的被呼叫端在 T037 前仍含 F 的 constructor），golden-diff 歸 `求值順序` 類、US1 敘述節註明「T037／T038 後修正」（依賴 T024）
- [X] T026 [US1] 修改 `lib/dujs/defuseanalyzer.js`：`findUSESet` 在 `cfgNode.segment` 存在時以 `segment.source` 為規則來源（`usedExpressionsOf`、是否為決策節點），只收 `plan.segmentOf(Identifier) === segment.index` 的讀取；p-use 讀取在段節點不是 owner 時記入 `deferredPuse`；回傳 `{cuse, puse, deferredPuse}`（無 segment 時 `deferredPuse` 為空 Set）；`findDUPairs` 對 `deferredPuse` 以 `puseOwners` 每個 owner 的 `true`／`false` 產生 pair，同一 (定義, owner, 分支) 只加一次
- [X] T027 [US1] 修改 `lib/dujs/expansion.js` 的 `replayCall`：依 data-model §4 設段節點的 `segment`、`puseOwners`、GEN（`plan.segmentOfVarDef`；攤平圖經 `flatVarDefOf`、摘要圖用原 VarDef）；同一呼叫點內的中間 CALL RETURN 無 GEN／USE、無 exception 邊；`decision` 形狀把 N 副本的全部前驅改指向段 0；前插 CALL（段 0）新增 exception 邊連到 `copyOf(plan.throwTarget)`（有目標時）；其餘 exception 邊維持 develop 位置；刪除 `splitByInnerClassName`；`orderOfCalls` 插入順序不變（依賴 T024、T026）
- [X] T028 [US1] 修改 `lib/dujs/summary.js` 的 `summaryGraphOf`：讀取集合改為合併 `cuse`、`puse`、`deferredPuse`（去重）；`computeForPage`／`summaryOf` 介面不變（依賴 T026）
- [X] T029 [US1] 更新編碼舊行為的既有測試（GEN 全搬到 CALL RETURN、`keepGenerateAtCallSite` 等）：`tests/dujs/expansion.js`、`tests/dujs/bypass.js`、`tests/dujs/classfields.js`、`tests/dujs/exceptionsummary.js`、`tests/dujs/hierarchy.js`、`tests/dujs/modelbuilder.js`（僅限確屬 US1 行為變更者；實際受影響者以 `npm test` 的失敗清單為準），逐處記入 `specs/007-split-call-nodes/golden-diff.md`「單元測試期望」表
- [X] T030 [US1] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 P1、P2、P12、P21 與 spec US1 情境一致；`npx mocha tests/dujs/splitcallnodes.js` 的 US1 與 FR-006、P23 守門全綠
- [X] T031 [US1] golden：依「共通約定」更新 golden 與 `tests/golden/manifest.json`，`--report` 寫入 `specs/007-split-call-nodes/golden-diff.md` 的「US1」敘述節（預期只有 `求值順序` 類與 `共通`，另可能有 `§44`／`§46` 的 class static 行為變更與 for-in/of 右側 class static 的過渡 − 項〔plan「階段性的呼叫點篩選」〕；不得出現 `返回後例外`），敘述節註明 `new F().m(x = 1)` 型的過渡失真與「class static 不再連結」表的實例數，`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: US1 完成——既有呼叫點依求值順序分段；golden 差異只屬求值順序；可 commit（orchestrator 重跑 `--verify`）。

---

## Phase 4: User Story 2 - 運算式中的呼叫是呼叫點（Priority: P1）

**Goal**: 列舉全部呼叫點（運算式、參數預設值、欄位初始化式、箭頭本體、`throw`、`return`）；`new F().m()` 兩個呼叫點；刪除欄位初始化式特例；不列為呼叫點的位置與防護生效；CLI 標記（DECISION 005 Q1 A）。`case` 判別式與 for-in/of 右側**暫不列入**（`stagedCallSite` 排除 `once-*`，US3 加入）。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US2`；P3、P4、P5、P10、P13、P14、P18、P19、P22、P25（部分：只 `x: L1 -> L9`，`x: L3 -> L9` 待 US4）、P27、P31、P33 依 spec。

### Tests for User Story 2（先寫）

- [X] T032 [US2] 在 `tests/dujs/splitcallnodes.js` 新增 US2-1…13（p3、p4、p5、p10、p13、p14、p18、p19、p22、p25、p27、p31、p33）；US2-9 另斷言外層 `console.log` 無 call 邊、`f()` 有 call 邊；US2-10（p25）**只斷言** `x: L1 -> L9`、`f` 有 call 邊、分析完成——`x: L3 -> L9` 需要返回後段的 exception 邊（US4），移到 T052（DECISION 006 Q1）；US2-12 斷言兩條 call 邊（F 的 constructor、`m`）且順序為 constructor 在前
- [X] T033 [US2] 在 `tests/dujs/splitcallnodes.js` 新增 characterization／守門（DECISION 005、R13）：
  條件求值位置（L5）`c?.m(f())`、`c?.[f()]`、`var [z = f()] = c`、`var {z = f()} = c`——`f` 無 call 邊、inter／intra-page pair 與 develop 相同、`f` 之前的定義不被錯殺；
  for-in/of 左側（DECISION 005 Q2 A，L1）`for (o[g()] of a) {}`、`for (var [z = g()] of a) {}`——`g` 不連結、pair 與 develop 相同（FR-001 明文例外）；
  （`case` test 與其他位置的 class static 已提前到 US1 的 T066，此處不重複）；
  同節點先定義的 callee（L3）`var f = h; f = g, f();`（不連結 `h`、`g`，不得出現經 `h` 的 pair）、`var o = new A(), r = o.m();`（只連 `new A()`）、`f(f = g);`（照常連結）
- [X] T034 [P] [US2] 擴充 `tests/dujs/cfggraphconverter.js`（DECISION 005 Q1 A，FR-007）：CALL／CALL RETURN 標 `call (<行>)`、`callReturn (<行>[:路徑])`，重名加 `_a`、`_b`
- [X] T035 [P] [US2] 更新 `tests/dujs/methodcalls.js`、`tests/dujs/newcallsite.js`、`tests/dujs/relaxedcallee.js`：`calleeScopesOf` 對 `new A().m()` 的期望改為兩個呼叫點的串接結果；逐處記入「單元測試期望」表
- [X] T036 [P] [US2] 擴充 `tests/dujs/matching.js`（FR-007）：p6、p31 每條 return 邊在 `*.matching.json` 恰對應一個 record；同一節點多個呼叫點各一筆、`seq` 依求值順序、`callSiteLine` 為 N 的行號；另補自 T021、T022(b) 移來的 `if (x < f())` 版本（US2 起 `f()` 才是呼叫點）：`tests/dujs/summary.js` 斷言被呼叫端 `function k() { if (x < f()) {} }` 的 `x` ∈ `upwardExposed`（`*.matching.json` 的 `summaries` 同步），`tests/dujs/expansion.js` 斷言前插 CALL（段 0）帶 `x` 的讀取並記入 `deferredPuse`、`findDUPairs` 以 owner 的 `true`／`false` 產生 pair 且去重

### Implementation for User Story 2

- [X] T037 [US2] 修改 `lib/dujs/callresolver.js`：`calleeScopesOfMethodCall` 的 `object.type === 'NewExpression'` 分支只回傳 `[method]`（F 為函式時 `[]`）；刪除 `callExpressionOf` 的 `dujsFieldInitializer` 特例；`calleeScopesOf(node, scopeTree)` 改為 `callsplit.planOf(node, scopeTree, stagedCallSite).callSites` 的 `callees` 依序串接（T048 之前帶與 modelbuilder 相同的 predicate）；**循環 require**：`callsplit` 已 require `callresolver`，故 `calleeScopesOf` 在函式內延後 `require('./callsplit')`（先例 defuseanalyzer.js:324），不在檔頭 require；完成後補 T011 中 `new F().m(x = 1)` 的 `callees` 斷言
- [X] T038 [US2] 修改 `lib/dujs/callresolver.js` 的 `stagedCallSite`：移除 T025 的「develop 呼叫點」條件，只保留「`shape` 為 `once-*` 時回傳 false」（同一個 predicate，DECISION 006 Q2 (b)；註記 `// 007 US3 移除`），使 `plan.callSites` 採用全部呼叫點（含 `new F().m()` 兩個呼叫點串接、段 1 帶 `m` 的引數），避免無 once 形狀時以「每個 case 都呼叫」的錯誤形狀連結；`lib/dujs/modelbuilder.js` 照舊傳入 `stagedCallSite`（依賴 T037）
- [X] T039 [US2] 修改 `lib/dujs/cfggraphconverter.js` 的 `labelWithLineNumber`：CALL 與 CALL RETURN 一律標 `<type> (<line><pathSuffix>)`，重名 `_a`、`_b` 規則不變
- [X] T040 [US2] 更新其餘編碼舊行為的既有測試（如 `tests/dujs/expansion.js`、`tests/dujs/paramdefaults.js`、`tests/dujs/paramsandnew.js`、`tests/dujs/classfields.js`、`tests/dujs/cli.js` 中受新呼叫點或新標記影響者；實際受影響者以 `npm test` 的失敗清單為準，完成時把實際檔案清單回填到 `golden-diff.md` 的 US2 敘述節），逐處記入「單元測試期望」表
- [X] T041 [US2] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 US2 各 probe 與 spec 一致、US1 情境不退步；FR-006 守門全綠。**P25 註記**：US2 只核對 `x: L1 -> L9` 與 `f` 的 call 邊，`x: L3 -> L9` 在 US4 才出現（DECISION 006 Q1）。**風險**：US2–US3 期間 `throw f();` 的 CALL RETURN（段 1）沒有出邊；若因此出錯（分析拋錯或求解異常），改走「US2 就替 `throw` 的返回後段連 exception 邊」，並由 orchestrator 以 DECISION REQUEST 回報使用者，裁決前不得自行改走
- [X] T042 [US2] golden：依「共通約定」更新並重產累積淨差異到 `specs/007-split-call-nodes/golden-diff.md` 的「US2」敘述節（預期新增 `連結`、`標記` 類；diffcheck 標記改寫自此階段生效；US1 的 `new F().m()` 過渡失真應消失；「class static 不再連結」表的實例數寫入敘述節），**P25 為部分驗收**（`x: L3 -> L9` 待 US4），`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: US2 完成——運算式中的呼叫連結；不列為呼叫點的位置以 characterization 釘住；CLI 標記帶行號。

---

## Phase 5: User Story 3 - 一個節點中的讀取、定義與多個呼叫依求值順序（Priority: P2）

**Goal**: 多呼叫點串接驗收；`once-switch`／`once-loop` 形狀（判別式、for-in/of 右側列入）、`discriminantThrowTarget` 的使用、`enteringPrev`；判別式在每個 `case` 各記一筆 p-use、讀求值當下的定義（clarify Q2 A'），與已拆分先例並存；移除階段性 predicate。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US3`；P6–P9、P11、P15／P15b、P16、P17、P24、P26、P28、P32 依 spec。

### Tests for User Story 3（先寫）

- [X] T043 [US3] 在 `tests/dujs/splitcallnodes.js` 新增 US3-1…12（p6、p7、p8、p9、p11、p15＋p15b、p16、p17、p24、p26、p28、p32）；US3-9 斷言 `f` 只有一條 call 邊且前插在第一個 `case` 之前；US3-12 斷言各 `case` 各一筆 p-use、讀判別式求值當下的定義
- [X] T044 [US3] 在 `tests/dujs/splitcallnodes.js` 新增守門：(a) clarify Q4：`for (;; f())`、`do { } while (f())`（develop 已連結，不退步）、`var y = c ?? f();`、`var y = c || f();`（`f` 只在該分支呼叫，同 P17）；(b) 先例並存（R5）：`switch (a && b)`（無呼叫，pair 與 develop 相同、只記一次）、`switch (a && f())`、`for (v of a && f())`（含呼叫的拆分葉依 R1 拆段、`case` 不讀判別式）；(c) once-loop 迴圈變數（data-model §4）：`for (var v of f()) { use(v); v = 2; }`——`f` 只在進入迴圈前呼叫一次、`use(v)` 讀到迴圈頭的定義、沒有 `v = 2` → `use(v)` 的 pair；巢狀迴圈與 `continue` 下的 `enteringPrev`；(d) `switch (f()) {}`（KI §48，R13 L6）：007 不比 develop 差——若仍拋錯，只能是 develop 的同一錯誤（`Cannot read properties of undefined`），不得出現其他失敗模式；若能完成分析，更新本測試並在 Polish 更新 KI §48
- [X] T045 [P] [US3] 擴充 `tests/dujs/matching.js`：p32、p15 每條 return 邊恰對應一個 record；`beforeDecision` 對決策節點、switch 判別式、for-of 右側皆為 `true`
- [X] T046 [P] [US3] 擴充 `tests/dujs/expansion.js`：`once-switch` 把第一個 `case` 副本的全部前驅改指向段 0、各 `case` 副本設 `discriminantSplit`（原節點不動）、段 0 exception 邊連到 `copyOf(discriminantThrowTarget)`；`once-loop` 只改「來源的原節點屬 `enteringPrev`」的前驅（CALL／CALL RETURN 以 `segment.source` 比對）、迴圈副本設 `loopRightSplit`、迴圈本體回邊仍直接回到迴圈節點

### Implementation for User Story 3

- [X] T047 [US3] 修改 `lib/dujs/callsplit.js`：確認／補齊 `once-switch` 的 `owners`（所有有 test 的 `case`）、`throwTarget` 取 `discriminantThrowTarget`、`once-loop` 的 `enteringPrev` 與 `segmentOfVarDef` 對迴圈變數回傳 null；沒有 `case` 的 `switch` 不形成 plan
- [X] T048 [US3] 移除階段性 predicate（DECISION 006 Q2 (d)）：`lib/dujs/modelbuilder.js` 改呼叫 `callsplit.planOf(node, scopeTree)`（不帶 predicate）、`lib/dujs/callresolver.js` 刪除 `stagedCallSite`、`calleeScopesOf` 不帶 predicate、`lib/dujs/callsplit.js` 刪除 `planOf` 的 predicate 參數與依 predicate 分開的快取、`tests/dujs/callsplit.js` 刪除 T011 的 predicate 案例（contracts/lib-api.md §1 的暫時項自此不再適用）；`once-loop` 的 `enteringPrev` 經 plan 帶到呼叫邊（依賴 T047）
- [X] T049 [US3] 修改 `lib/dujs/expansion.js` 的 `replayCall`：`once-switch`／`once-loop` 的前插段鏈與前驅改向（data-model §4）、在 N 副本（及同一 switch 其他 `case` 副本）設 `discriminantSplit`／`loopRightSplit`、段 k 的 normal 邊 → N 副本、段 0 exception 邊連 `copyOf(plan.throwTarget)`（依賴 T048）
- [X] T050 [US3] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 US3 各 probe 與 spec 一致、US1／US2 不退步（P25 仍只核對 `x: L1 -> L9`，`x: L3 -> L9` 待 US4）；FR-006 守門全綠
- [X] T051 [US3] golden：依「共通約定」更新並重產累積淨差異到 `specs/007-split-call-nodes/golden-diff.md` 的「US3」敘述節（預期 `求值順序`／子標 `判別式`、`可迭代`；先例 switch 零差異；US1–US2 的 for-in/of 右側 class static 過渡 − 項應消失；「class static 不再連結」表的實例數寫入敘述節），`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: US3 完成——多呼叫點串接、switch 判別式與 for-in/of 右側只求值一次。

---

## Phase 6: User Story 4 - 返回之後的求值也可能拋錯（Priority: P3）

**Goal**: 依 `plan.throws` 連段的 exception 邊；決策副本最後一段不拋錯時移除其 exception 邊；`exceptionalReturn` 改取 N 的例外目標。

**Independent Test**: `npx mocha tests/dujs/splitcallnodes.js -g US4`；P20、P20b、P29、P30、P34、P35 依 spec，並補 P25 的 `x: L3 -> L9`。

### Tests for User Story 4（先寫）

- [X] T052 [US4] 在 `tests/dujs/splitcallnodes.js` 新增 US4-1…6（p20、p20b、p29、p30、p34、p35）；US4-6 另斷言決策節點副本沒有 exception 出邊；另補 US2-10（p25）的 `x: L3 -> L9`（自 T032 移來，返回後段的 exception 邊；DECISION 006 Q1）
- [X] T053 [P] [US4] 擴充 `tests/dujs/exceptionsummary.js` 與 `tests/dujs/expansion.js`：CALL RETURN 段 j≥1 只在 `throws[j]` 為真時有 exception 邊；`decision` 形狀 `throws[k]` 為假時 N 副本無 exception 邊；CallSiteRecord 的 `exceptionalReturn` 為段 0 節點的 exception 目標（＝`copyOf(plan.throwTarget)`；該目標的入邊被改向時隨之改向：`replayLoop` 的 LOOP 節點，或目標為有前插 CALL 的決策節點時的該 CALL；DECISION 012 Q2）（決策副本例外邊被移除時仍正確，無目標時為 null）

### Implementation for User Story 4

- [X] T054 [US4] 修改 `lib/dujs/expansion.js`：`replayCall` 依 `plan.throws` 連段 1…k 的 exception 邊到 `copyOf(plan.throwTarget)`；`decision` 形狀在 `throws[k]` 為假時移除 N 副本的 exception 邊；`finishCallRecords` 的 `exceptionalReturn` 改取段 0 節點的 exception 目標（＝`copyOf(plan.throwTarget)`；該目標的入邊被改向時隨之改向，DECISION 012 Q2）（依賴 T053）
- [X] T055 [US4] 更新編碼舊例外行為的既有測試（`tests/dujs/exceptionsummary.js`、`tests/dujs/expansion.js`、`tests/dujs/finallyflow.js` 等受影響者；實際受影響者以 `npm test` 的失敗清單為準，完成時把實際檔案清單回填到 `golden-diff.md` 的 US4 敘述節），逐處記入「單元測試期望」表；`reachingsolver.js` 不改程式（以既有測試確認）
- [X] T056 [US4] 執行 `node specs/007-split-call-nodes/probes/run.js`，確認 US4 各 probe 與 spec 一致、US1–US3 不退步
- [X] T057 [US4] golden：依「共通約定」更新並重產累積淨差異到 `specs/007-split-call-nodes/golden-diff.md` 的「US4」敘述節（預期 `返回後例外`、子類 `決策返回不拋錯`，含 P35 型的 − pair 與 P25 的 `x: L3 -> L9`；「class static 不再連結」表的最終實例數寫入敘述節），`--verify` exit 0；`npm test`、`npm run lint` 全綠

**Checkpoint**: 全部 user story 完成；golden 收尾，golden-diff 釘選列待使用者簽核。

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T058 SC-002 全量確認：`node specs/007-split-call-nodes/probes/run.js` 的 P1–P35、P20b 與 spec 各情境逐條一致、P23 與 `baseline-develop.txt` 相同；`npx mocha tests/dujs/splitcallnodes.js` 全綠（SC-001）
- [ ] T067 diffcheck 前置修正（DECISION 011；T059 之前必做；**修改驗收工具需使用者本人同意——orchestrator 做到本任務時先以 DECISION REQUEST 提出，取得同意後才派遣**）：(a) `specs/007-split-call-nodes/tools/diffcheck.js` 的 plainOf／rewriteLabels 只對被改寫的 CALL／CALL RETURN 標記重編重名後綴，其他標記（如 develop 的累積後綴 `16abab`、`entry_b_d_a_b_a_b`、`exit_b`）原樣保留，同步改 `contracts/diff-check.md` §1 第 2 步文字；(b) `contracts/diff-check.md` §2 `連結` 新增子標 `層級新增`：「該 `.dupairs.dot` 所屬模型只存在於 007 側（其 model `+` 已成立 `連結`），且該 `+` pair 經 §1 改寫後，以相同的（變數、def、use）存在於基準側同頁的 `intra-pages/*.dupairs.dot`。不符者照一般判準，歸不進即失敗。`--report` 在說明欄註明對應的基準檔。」並在 diffcheck.js 實作；(c) `tools/diffcheck.test.js` 補 (a)(b) 正例與反例；(d) 重跑 `golden --verify` exit 0、`mdn --report` 確認 US2 時的 7 筆無類別（s07、s10 的 inter-page／intra-pages `0.graph.dot` 共 4 筆；a07 新 inter-procedurals 模型 L12 的 3 筆 pair）全數歸類。不得以手動釘選或 KI 類吸收這 7 筆
- [ ] T059 MDN 驗證（FR-009、SC-004；依賴 T067）：`node specs/007-split-call-nodes/tools/diffcheck.js mdn --report` 對 `specs/006-eslint-scope/mdn/corpus` 33 檔與 `specs/007-split-call-nodes/mdn/baseline-develop/` 比對，寫入 `specs/007-split-call-nodes/mdn-diff.md`（去重 pair 淨差異、重複列數表、「class static 不再連結」表〔有實例時逐列寫入說明，供簽核列出〕、釘選草擬）；全部檔案完成分析、結束碼與基準相同；歸不進類別的差異先在 `docs/known-issues.md` 記為新已知問題再以 KI 類記錄；`diffcheck mdn --verify specs/007-split-call-nodes/mdn-diff.md` exit 0
- [ ] T060 效能（SC-005）：`node specs/006-eslint-scope/tools/perf.js .` 同機 3 輪中位數＋golden CLI 時間，寫入 `specs/007-split-call-nodes/perf.md` 的「007」表與比值；總分析時間 ≤ develop × 2，超過即回報並停止
- [ ] T061 [P] 更新 `docs/known-issues.md`（FR-010，R12）第一部分：開頭 feature 摘要段落加入 007；§16、§22 (3) 標「Fixed by `007-split-call-nodes`」（保留原描述，前加修正說明，含 P1、P3 修正後 pair）；§10「`return g();` is still not connected」後加註已由 007 修正（`d: L1 -> L3`）；§36 補「被呼叫端正常返回後不再拋錯」只適用呼叫敘述、運算式中的呼叫依 FR-005 按段判定（`var y = f().p;`、`x = f();`），並註明 `if (f())` 返回後不再拋錯為 007 的行為變更
- [ ] T062 更新 `docs/known-issues.md` 第二部分（依賴 T061，同檔）：新增 §44「`case` test 的讀取與呼叫不建模」（分開記：一般讀取與呼叫為既有限制；class static 成員為**相對 develop 的行為變更**，DECISION 005 Q3 A；§44 只涵蓋留在 `case` 節點內的 test〔未拆分者或拆分後的末端運算元〕，拆出的非末端運算元照常建模、其中 class static 仍連結，DECISION 007）；§45「007 的行為變更」（分段語意與標記、switch／for-in/of 只求值一次與已拆分先例並存、決策節點返回後不拋錯）；§46「不列為呼叫點的位置」（for-in/of 左側〔FR-001 例外，DECISION 005 Q2 A〕、條件求值位置〔`?.` 之後、解構預設值含 catch 參數〕、同節點先定義的 callee／receiver〔防護〕；另分開記這些位置中 class static 成員不再連結為**相對 develop 的行為變更**〔DECISION 006 Q4 必修 3，R13 L2'；例：`var [z = class { static y = g(); }] = c`、`c?.m(class {…})`、`for (o[class {…}] of c)`、`catch ({a = class {…}})`〕，§44、§46 各附 golden-diff／mdn-diff「class static 不再連結」表的實例數）；§47「判別式拆分節點的例外邊」（R13 L4）；§48「`switch` 沒有 `case` 時判別式含呼叫會拋錯」（既有 bug，依 T044 (d) 的結果寫現況）；T059 的新已知問題若有則接續編號；另記 DECISION 007 的兩項附帶限制（本輪不處理）：`switch (f()) { case a && 1: }` 首個 `case` 被拆分時沒有 first-case 節點，once-switch 不連結 `f()`（develop 同樣不連結，非退化），此寫法下 FR-004 不生效；`case` 拆分節點的 throwTarget 為 null（develop 同樣無 exception 邊），維持現狀；另 KI §45 寫明：返回後才做的定義，其定義端標為 `call (N)` 而非 `callReturn (N)`（例：`reuben: call (15) -> 16`），不得讀成「呼叫前定義」（DECISION 011 簽核說明）
- [ ] T063 [P] 更新 `README.md`（FR-007、FR-010，R9）：Limits 不再寫「Only call statements are connected…」，改為運算式中的呼叫也是呼叫點並列出仍不是呼叫點的形式（IIFE、回呼、`super(…)`、optional call、getter／setter、tagged template、隱含呼叫、`case` test、for-in/of 左側、`?.` 之後與解構預設值、同節點先定義的 callee）；補「段」的說明（CALL、CALL RETURN 與決策節點的對應，c-use 可在 CALL RETURN 上、p-use 仍記在決策節點）、`beforeDecision` 的新涵義、CALL／CALL RETURN 的 `call (<行>)` 標記規則；明記未新增節點／邊型別
- [ ] T064 執行 `specs/007-split-call-nodes/quickstart.md` 全流程（§1–§6）：`npm test`、`npm run lint`、probes、`node bin/dujs.js -js specs/007-split-call-nodes/probes/p6-two-calls.js` 的 `.graph.dot` 有兩組 `call (11)`／`callReturn (11)` 且 matching 每條 return 邊對應一個 record、`npx mocha specs/007-split-call-nodes/tools/diffcheck.test.js`、golden 與 mdn `--verify` 皆 exit 0；確認 `lib/esgraph/index.js` 檔頭 Modified 行、`eslint-suppressions.json` 未新增鍵或增加 count、`lib/dujs/reachingsolver.js`、`outputwriter.js` 未改，`usedexpressions.js` 邏輯不變（只允許 T025 的註解修改）（`git -C /Users/chengfulin/Documents/Personal/dujs diff edc22d5 --stat -- lib`）
- [ ] T065 **PR 前提醒（不得略過）**：通知使用者簽核 `specs/007-split-call-nodes/golden-diff.md`（golden 收尾後）與 `specs/007-split-call-nodes/mdn-diff.md`（MDN 驗證後）的「釘選與簽核」列；簽核前簽核欄維持「草擬，待簽核」，未簽核的 golden 變更不得合併（FR-008）；golden 或 MDN 的「class static 不再連結」表有實例時，提醒內逐列列出（頁、行、位置種類），請使用者一併確認此行為變更；不同意之列回到對應階段修正後整表重產並重跑 `--verify`。PR 目標 `develop`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**：無相依；T001 必須最先；T003、T004 必須在任何 lib 變更前完成。
- **Foundational（Phase 2）**：依賴 Setup；阻擋所有 story。
- **US1 → US2 → US3 → US4**：**嚴格依序**（各階段都改 golden，累積淨差異相對 `edc22d5` 重產；US2 把 `stagedCallSite` 縮小到只排除 `once-*`、US3 刪除 predicate、US4 改 US1–US3 保留的例外邊並補 P25 的 `x: L3 -> L9`）。
- **Polish（Phase 7）**：依賴 US4；T061 → T062 同檔依序；T065 最後。

### Within Each Phase

- Foundational：T008 → T012 → T013；T009 → T014；T010 → T015；T011＋T013＋T014＋T015 → T016 → T017 → T018 → T019。
- 每個 story：測試（先失敗）→ lib 實作 → 更新既有測試期望 → probes 確認 → golden 更新與 `--verify`。

### Parallel Opportunities

- Setup：T002、T003、T005 可並行（T004 不與 T003 同時，以免干擾計時）。
- Foundational 測試：T008、T009、T010、T011 可並行（不同檔）。
- US1：T021、T022、T023 可並行（T020、T066 與 T018 同檔，依序）。
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

1. （已由 DECISION 006 Q4 A1／M1 回寫 contracts/diff-check.md §1 第 0 步）**標記改寫與階段順序**：contracts/diff-check.md §1 無條件把基準側 `call_x` 改寫成 `call (<行>)`，但 CLI 標記（Q1 A）在 US2 才改；Foundational「零差異 `--verify`」與 US1 會因此出現大量假差異。T006 改為「只在 007 側已採帶行號形式時改寫」。
2. （已由 DECISION 006 Q2 取代：改為 `planOf` 的 predicate，見 plan「階段性的呼叫點篩選」）**US1／US2 的暫時篩選機制**：plan 只說 US1 處理「既有呼叫點」、US2 暫不列入判別式與 for-in/of 右側，未指定機制。T025、T038 以 `modelbuilder.js` 的暫時篩選實作並在 US2／US3 移除；因此 US3 也修改 `modelbuilder.js`（plan 的 US3 主要檔案只列 `expansion.js`、`callsplit.js`）。

## analyze 修正（DECISION 006）

使用者對 analyze 發現（`/speckit-analyze` A1–A6、sdd-spec-clarifier H1–H3、M1–M5）的裁決。只調整既有 task 內容與新增 T066，未刪 task、未重編號。

| 項目 | 裁決 | tasks 改動 | 其他文件 |
|------|------|-----------|----------|
| DECISION 006 Q1（H1） | A：P25 的 `x: L3 -> L9` 移到 US4 | T032（US2-10 只斷言 `x: L1 -> L9`、`f` 有 call 邊、分析完成）；T052（補 `x: L3 -> L9`）；T041、T050 加註；T041 寫入「CALL RETURN 無出邊」風險與 DECISION REQUEST 退路；T042 註明 P25 為部分驗收；T057；US2／US4 Independent Test | plan「US4 之前的例外邊」；contracts/acceptance.md US2、US4 列 |
| DECISION 006 Q2（H2） | A＋條件 (a)–(d)：`planOf` 的階段性 predicate | T011（predicate 案例、`new F().m(x = 1)` T037 前只斷言位置）；T016（`planOf` 第三參數、快取依 predicate 分開）；T025（`callresolver.stagedCallSite`、過渡失真）；T031；T037（`calleeScopesOf` 帶同一 predicate）；T038（縮小 predicate）；T048（刪除 predicate）；Dependencies | plan「階段性的呼叫點篩選」與階段表；contracts/lib-api.md §1–§3（暫時項）；data-model §1；research R2 |
| DECISION 006 Q3（H3） | A：MDN 快照同時存 `*.matching.json` | T003；T005 (h)；T006 | contracts/diff-check.md §1、§4；plan Documentation 樹；research R10 |
| DECISION 006 Q4 A1／M1 | diff-check §1 第 0 步（`label="call (` 完整字串判定，`.dupairs.dot` 跟隨同模型 `.graph.dot`） | T005 (d)（含「007 側仍是 `call_x` 時零差異」）；T006 | contracts/diff-check.md §1 |
| DECISION 006 Q4 A2 | T025 一併刪除 `expressionsEvaluatedAtNode`、`preEvaluatedAt`；usedexpressions.js 註解可改 | T025；T064（「邏輯不變」） | plan 影響範圍、US3 主要檔案補 `modelbuilder.js`；contracts/lib-api.md §3 |
| DECISION 006 Q4 A3／M5 | Scale 改「見變更影響範圍」；影響範圍補 005／006 diffcheck 匯出 | — | plan Scale、變更影響範圍 |
| DECISION 006 Q4 A4 | 註明 `tests/esgraph/test.js` | — | plan 影響範圍、Source Code 樹 |
| DECISION 006 Q4 A5 | 受影響測試以 `npm test` 失敗清單為準並回填 | T029、T040、T055 | plan 影響範圍 |
| DECISION 006 Q4 A6 | `isInsideLoopBody` 第三參數 `() -> Set`，callsplit 自算、每迴圈一次 | T016 | — |
| DECISION 006 Q4 M2 | Q 編號加前綴 | T033、T034、T044、US2／US3 Goal、T062 | plan、research、data-model、contracts、quickstart |
| DECISION 006 Q4 M3 | spec US2 情境 10 括號措辭 | — | spec.md |
| DECISION 006 Q4 M4 | FR-001 例外由 acceptance.md characterization 驗證 | — | spec.md FR-001 |
| 必修 1 | US1 改用 `if (f(x))`；`x < f()` 版本移到 US2 的 T036 | T021、T022(b)、T036 | plan 風險表；research R8；contracts/acceptance.md |
| 必修 2 | 循環 require（callsplit ↔ callresolver）以函式內延後 require | T037 | contracts/lib-api.md §2 |
| 必修 3 | 不列為呼叫點位置中的 class static 一律不連結（行為變更）；catch 參數屬 `evaluatedExpressionsOf` | T011、T023、T031、T033（移出）、**T066（新增）**、T042、T051、T057、T059、T062、T065；T005 (i)、T006 | data-model §5；research R2、R12、R13（L2'）；contracts/diff-check.md §2；contracts/acceptance.md；plan 關鍵設計 |
| 建議 | T011 的 `new F().m(x = 1)` T037 前只斷言位置；class static characterization 提前到 US1 | T011、T037、T066 | — |

**新增 task**：T066（US1）。**各 phase task 數**：Setup 7、Foundational 12、US1 13（原 12）、US2 11、US3 9、US4 6、Polish 8，合計 66。
