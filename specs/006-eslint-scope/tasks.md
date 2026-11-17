---

description: "Task list for feature 006-eslint-scope"
---

# Tasks: 改用 eslint-scope 判定變數的宣告與參照

**Input**: Design documents from `specs/006-eslint-scope/`（plan.md、spec.md、research.md R0–R16、data-model.md、contracts/（scope-binding-api、static-check、diff-check、acceptance）、quickstart.md、probes/）

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/（plan review 裁決 U1–U4、Fable 仲裁 Q1–Q3 已寫入 spec Clarifications「Session 2026-11-17」與 FR-012；analyze 修正見 Clarifications「Session 2026-11-17（analyze）」）

**任務總數**：71（T001–T071；T070、T071 為 analyze 後新增的 orchestrator「使用者簽核」閘門，分別置於 US4 與 Polish）

**Tests**: 本 feature 要求測試（憲章 §CP-4、SC-001：每個驗收情境一個自動化測試，對應表見 `contracts/acceptance.md`）。**測試先行**：每個 phase 先寫測試並確認失敗（red），再實作（green）。

**Organization**: Setup → Foundational（D1 切換，阻擋所有 story）→ US1 → US2 → US3 → US4 → Polish（依 plan「實作順序與 story 相依」）；每個 story phase 以閘門任務與 Checkpoint 結束。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可並行（不同檔案、不依賴未完成的任務）
- **[Story]**：US1–US4
- 路徑皆相對於專案根 `/Users/chengfulin/Documents/Personal/dujs`；git 一律 `git -C <專案根>`

## 全程規則（每個任務都適用）

- **驗收預期**：spec 與 `contracts/acceptance.md` 的預期 pair 是手推值。實跑不符時先查推導（exception 邊、KI §18 entry 殘留、Q3 的 entry 過濾），確認是實作偏離就修實作；確認是推導錯誤才記入 `golden-diff.md` 末節「驗收預期更正」並在回報中列出（含推導），**implementer 回報，由 orchestrator 改 `contracts/acceptance.md` 並 commit**；**不得只改預期迎合結果**。更正若涉及 spec.md 明列的 pair，**先停下回報，由使用者裁決後 orchestrator 改 spec.md（Clarifications 新條目）**，再改 contracts。
- **探針複本**：測試只讀 `tests/dujs/cases/probes006/` 的複本（T004）與 Setup 記錄的 develop 基準 JSON（T006、T007），不得讀 `specs/` 下的檔案。
- **feature 目錄的寫入範圍**：implementer 只可寫入 `specs/006-eslint-scope/{tools/,mdn/,probes/develop.txt,golden-diff.md,mdn-diff.md,perf.md}`；`spec.md`、`plan.md`、`tasks.md`、`research.md`、`data-model.md`、`quickstart.md`、`contracts/` 需改時 implementer 回報，由 orchestrator 改並 commit。
- **Golden 序列化**：`tests/golden/expected*/`、`tests/golden/manifest.json`、`specs/006-eslint-scope/golden-diff.md` 是共用資源，**寫入它們的任務都不標 [P]**，同一時間只有一個 phase 寫入；順序固定為 T034（Foundational）→ T043（US1）→ T057（US3）→ T063（US4 收尾，只重生驗證、須零差異）。每次的步驟（quickstart §3）：**更新 golden → 跑 diffcheck → 更新 manifest 與 golden-diff**，即
  1. `UPDATE_GOLDEN=1 npm test`（只重建 `expected*`，不碰 manifest）；
  2. `node specs/006-eslint-scope/tools/diffcheck.js golden --report > <scratchpad>/g.md`，把骨架貼入 `golden-diff.md`「淨差異」（**相對 develop 的累積結果，整表重新產生**），補「說明」；`解析` 類移除列填「解析類移除簽核」、`連結`／`AnnexB` 衍生列填「呼叫連結簽核」並釘選筆數（簽核欄只填「草擬，待簽核」，見下方「簽核」）；在本階段敘述節寫該階段的變化與「單元測試期望」表；
  3. `node specs/006-eslint-scope/tools/diffcheck.js golden --verify specs/006-eslint-scope/golden-diff.md` 結束碼 0；
  4. 以 quickstart §3 的 sha256 指令重算雜湊，只更新有變化的 `tests/golden/manifest.json` 鍵（004 `contracts/golden-verification.md` §3 規則），舊→新 sha256 前 12 碼記入本階段的雜湊表；
  5. `npm test` 全綠。
  6. 回報後由 **orchestrator 親自重跑** `diffcheck.js golden --verify` 結束碼 0 才 commit（diffcheck 不進 `npm test`）。
  無法歸入 D2 五類的差異（`--verify` 判準失敗）→ 先視為回歸修實作；確認不是回歸且無法歸類 → 停下請使用者裁決，不得放寬 diffcheck 判準。
- **既有測試案例**的修改只允許在 plan Constraints 列出的檔案（`tests/dujs/scope.js` 名稱 API 改寫；`modelbuilder.js`、`defuseanalyzer.js`、`bypass.js`、`es2015.js`、`model.js`、`nestedfunctions.js`、`analysisexecution.js` 中直接呼叫名稱 API 或 `setLocalVariables` 的段落），只改 API 呼叫方式、斷言語意不變；每一筆修改記入 `golden-diff.md` 對應階段的「單元測試期望」表。其他既有測試失敗 → 先查是否為實作偏離；確屬 D2 修正的必然結果也逐筆列入並在回報中標明；無法判斷 → 停下裁決。**新增測試案例**的檔以任務指名為準（如 `tests/dujs/var.js`、`usedexpressions.js`、`def.js`、`deffactory.js`、`scopebinding.js`），不受上述清單限制。
- `eslint-suppressions.json` 不得新增鍵或增加 count（基準 118 筆、35 檔）；有未使用抑制（lint 報告）時執行 `npx eslint . --prune-suppressions` 並在回報列出移除項；不修改 LGPL 檔（`lib/esgraph/index.js`、`lib/esgraph/dot.js`、`lib/analyses/`）；不修改 plan「明確不受影響」的檔案（`expansion.js`、`hierarchydot.js`、`outputwriter.js`、`cfggraphconverter.js`、`cli.js`、`bin/dujs.js`、`scopetree.js` 的建樹與命名邏輯）；新檔 MIT 檔頭、ES5 風格（`'use strict'`、`var`、function 表示式）。
- **diffcheck 基準**：golden 的「修正前」固定為 `584e17d`（develop；Setup 不改 `tests/golden`），由 T015 寫死在 `golden-diff.md` 檔頭，為 `diffcheck.js golden --base` 的預設值；檔頭未填且無 `--base` 時結束碼 2。MDN 的「修正前」為 Setup commit 提交的 `mdn/baseline-develop/`。
- **簽核**（analyze N2）：「解析類移除簽核」「呼叫連結簽核」與 `mdn-diff.md` 的簽核欄，implementer 只填「草擬，待簽核」，**不得自簽**；使用者在 T063 後、PR 前對 golden 累積表簽核一次（T070），MDN 在 T065 後簽核（T071）。
- **閘門**（下文稱「閘門」）：`npm test` 全綠、`npm run lint` 0 錯誤、`git -C <專案根> diff 584e17d -- eslint-suppressions.json` 無新增鍵、無 count 增加（只允許 prune 造成的刪減，並已列於回報）；改 golden 的階段另需 `diffcheck.js golden --verify` 結束碼 0，且由 orchestrator 親自重跑通過後才 commit。

---

## Phase 1: Setup（修正前基準；任何 `lib/` 變更之前）

**Purpose**: quickstart §1、contracts/diff-check.md §5——加入依賴，以 develop 的 lib 鎖定 probes 與 MDN 範例集的基準，備妥差異判定與效能工具。

**執行順序**（analyze I2）：**先做 T008**（MDN 範例集複製與雜湊核對；來源為暫存目錄，可能隨時被清除；T009 為備援），再依 T001 起的順序執行其餘任務。

- [X] T001 確認基準：`git -C <專案根> diff --quiet 584e17d HEAD -- lib bin` 成立；`npm test` 1102 passing、`npm run lint` 0 錯誤、`eslint-suppressions.json` 118 筆（35 檔）。不符即停下回報
- [X] T002 `npm install eslint-scope@^9.1.2 --save`：`package.json` 的 `dependencies` 加 `"eslint-scope": "^9.1.2"`、`package-lock.json` 鎖定實際版本；`node -e "console.log(require('eslint-scope/package.json').version)"` 為 9.1.x（research R16）
- [X] T003 在 `eslint.config.js` 的 `ignores` 加 `'tests/dujs/cases/probes006/**'` 與 `'specs/006-eslint-scope/mdn/**'`（瀏覽器程式作為分析輸入，同 probes004 慣例；註解註明 feature 006）；`specs/006-eslint-scope/tools/` **不**忽略，須 lint 通過且不加抑制
- [X] T004 [P] 把 `specs/006-eslint-scope/probes/*.js`（33 個）逐字複製到 `tests/dujs/cases/probes006/`（`cmp` 逐檔確認）
- [X] T005 [P] `node specs/004-fix-remaining-issues/probes/run.js specs/006-eslint-scope/probes/*.js > specs/006-eslint-scope/probes/develop.txt`（develop 的 scopes、inter-procedural 模型與 pair）
- [X] T006 以 develop 對 33 個 probes 記錄 scope 名稱清單與各層模型數（intra-procedural、inter-procedural、intra-page、inter-page 的模型個數），寫入 `tests/dujs/cases/probes006/scopenames.json`（格式 `{"<probe>.js": {"scopes": [...], "models": {"intraProcedural": n, "interProcedural": n, "intraPage": n, "interPage": n}}}`；以 `tests/helpers/analyze.js` 產生，產生用的一次性腳本放 scratchpad、不入庫）——US4-2 基準
- [X] T007 以 develop 記錄 characterization 字面清單到 `tests/dujs/cases/probes006/developpairs.json`：shadow-block、shadow-param、shadow-loop（US2-5，intra-page）；vis3、plan-bi、plan-pf、classdecl、with、evalouter、op、mod、link-n5（intra-page 與 inter-procedural）；Q3 內嵌程式 `var x = 0; function f() { if (x) { let x = 1; console.log(x); } } f();`（intra-page）。每項記 pair 陣列（`tests/helpers/analyze.js` 的正規化字串）
- [X] T008 MDN 範例集主要來源：`SRC=/private/tmp/claude-501/-Users-chengfulin-Documents-Personal-dujs/cbaaf31a-c3b2-4a55-9ff4-356dc509edf6/scratchpad/mdncheck/ex`；`mkdir -p specs/006-eslint-scope/mdn/corpus && cp "$SRC"/*.js specs/006-eslint-scope/mdn/corpus/`；以 quickstart §1 的 `shasum -a 256 … | diff <(sed -n '/^## 附錄 A/,/^## 附錄 B/p' docs/research/mdn-baseline/validation-004.md …) -` 核對，**無輸出＝33 檔全符**；`ls specs/006-eslint-scope/mdn/corpus | wc -l` 為 33
- [X] T009 （僅在 T008 的目錄已不存在或有不符時執行）備援重新抽取（contracts/diff-check.md §5 步驟 2）：在 repo 外 clone `mdn/content`、`mdn/learning-area` 並 checkout 到 `docs/research/mdn-baseline/README.md` 釘選的 commit，依 validation-004 §2 各範例「來源」以 `docs/research/mdn-baseline/tools/extract-sample.js` 抽取或直接複製，a02b、a06、x01 依 §2 人工組合；每檔 sha256 前 16 碼須等於附錄 A，不符者不得使用、記入 `specs/006-eslint-scope/mdn/README.md` 並**停下交使用者裁決**（換新雜湊或剔除）。T008 全符時本任務標為「不需執行」（本次：T008 全符，不需執行）
- [X] T010 建立 `specs/006-eslint-scope/mdn/pages.json`（每個 id 的頁面＝檔案清單：s09 為兩頁 `[["s09-first.js"],["s09-second.js"]]`，其他為單頁單檔；共 32 個 id）與 `specs/006-eslint-scope/mdn/README.md`（來源：validation-004 工作目錄或重新抽取的 commit、授權 CC0、33 檔 sha256 全碼）
- [X] T011 MDN develop 快照（diff-check §5 步驟 4）：以目前（＝develop）的 lib 對每個 id 依 `pages.json` 執行 `node bin/dujs.js -js <files> [-js <files>]`，只保存 `.dot` 檔到 `specs/006-eslint-scope/mdn/baseline-develop/<id>/`（不存 `.png`、`report.html`，移除 `out-*` 暫存目錄），並以 `node docs/research/mdn-baseline/tools/run-pairs.js . <files>` 輸出 `specs/006-eslint-scope/mdn/baseline-develop/<id>.pairs.txt`；記錄每個 id 的 CLI exit code（預期全 0）
- [X] T012 [P] 撰寫自我測試 `specs/006-eslint-scope/tools/diffcheck.test.js`（先行）：以合成的 dot 目錄與內嵌原始碼驗證 §2 正規化（`entry_a`→`entry` 等、p-use 結構）、pair multiset 比對、row／model／graph 單位、五類判準（解析 `vars≥2`／`special`／`defaultLines`；全域 U4 任何新增；catch (a)–(e)；AnnexB 與連結的觸發）、衍生差異與解析類移除的釘選筆數不符時失敗、`--verify` 多列／少列失敗、`golden-diff.md` 檔頭未填基準且無 `--base` 時結束碼 2；用 node `assert`，不進 `npm test`
- [X] T013 實作 `specs/006-eslint-scope/tools/diffcheck.js`（contracts/diff-check.md §1–§4）：模式 `golden`（`git archive <base> tests/golden/expected*` 解到暫存目錄 vs 工作樹；`--base` 預設讀 `golden-diff.md` 檔頭的基準 commit〔T015 寫死 `584e17d`〕；檔頭未填且無 `--base` 即結束碼 2，不回退其他 commit）與 `mdn`（`baseline-develop/` vs 以本 branch CLI 對 `corpus/` 依 `pages.json` 實跑到暫存目錄，報告列 exit code）；頁面原始碼以 `lib/dujs/sourcereader.js` 的 `getSourceFromFiles` 重建，eslint-scope 以 research R1 選項（`optimistic: true`）分析，不呼叫 dujs 分析；`--report` 輸出三個機器區塊骨架，`--verify` 結束碼 0／1（基準缺失為 2）並逐項列出問題。`node specs/006-eslint-scope/tools/diffcheck.test.js` 通過、`npm run lint` 無錯
- [X] T014 [P] 實作 `specs/006-eslint-scope/tools/perf.js <dujsRoot>`（research R15）：同一 process 依 `mdn/pages.json` 以 `<dujsRoot>/tests/helpers/analyze.js` 依序分析 32 個 id（33 檔），整輪 3 次取中位數，輸出總時間（ms）；lint 無錯
- [X] T015 建立 `specs/006-eslint-scope/golden-diff.md` 骨架（contracts/diff-check.md §4）：檔頭基準行（寫死 `584e17d`）、行號說明；機器區塊「淨差異（相對 develop，機器核對）」「解析類移除簽核」「呼叫連結簽核」（初始空表）；敘述節 Foundational、US1、US3、US4 各含「變化說明」「雜湊變化表（舊→新 sha256 前 12 碼）」「單元測試期望」表頭；末節「驗收預期更正」（初始「無」）。並以 `node specs/006-eslint-scope/tools/perf.js .` 量 develop 時間，寫入 `specs/006-eslint-scope/perf.md`（機器、Node 版本、3 次數值與中位數）
- [X] T016 Setup 閘門：`diffcheck.js mdn --report` 與 `diffcheck.js golden --report` 皆輸出「無差異」；`diffcheck.test.js` 通過；`npm test` 1102 passing、`npm run lint` 0 錯誤、`eslint-suppressions.json` 118 筆；`git -C <專案根> status --short lib bin tests/golden` 無輸出；`git -C <專案根> diff --quiet 584e17d -- tests/golden eslint-suppressions.json` 成立。回報「可提交為 Setup commit」（commit 由 orchestrator 執行：corpus、快照、perf 基準同一 commit；golden 基準不取此 commit，固定 `584e17d`）

**Checkpoint**: develop 基準已鎖定（probes 複本與 develop 記錄、MDN 33 檔與快照、perf 基準、diffcheck 工具）；之後才可改 `lib/`。

---

## Phase 2: Foundational（D1 切換；阻擋所有 user story）

**Purpose**: plan「實作順序」Foundational——建立 `scopebinding.js`，把所有以名稱查變數的路徑換成身分查詢，Scope 名稱 API 一次移除；ClassDeclaration 同時定義內外 Var、具名 Function／ClassExpression 在節點定義名稱、CatchClause 定義參數（research R3–R8、R11、R12；data-model §1–§3、§5、§6；contracts/scope-binding-api.md）。

**分批與批間檢查**（analyze N1；批末條件未達不得進下一批）：
- **2a 純新增**＝T017、T019、T021（只跑新增的 `scopebinding.js`、`var.js`）、T022–T026：批末 `npm test` 既有測試全綠、golden 零差異（普通 `npm test`，不用 `UPDATE_GOLDEN`）；T017 中依賴 2b（Scope 身分儲存、補登記、身分查詢）的案例此時可仍為 red，於回報列出。
- **2b API 一次切換**＝T018、T020、T021（`scopeguards.js`、`scope.js` 部分）、T027–T033：批末 `npx mocha` 全綠（`tests/golden/golden.js` 因 D2 差異失敗者除外，留待 2c）。
- **2c golden**＝T034–T035。
- 若某任務使 2a 批末既有測試無法全綠（例如 T026 的掛載在某些既有測試輸入上拋錯），把它移入 2b 並於回報說明——以「2a 批末既有測試全綠」為準重新歸位。

**Independent Test**: `npx mocha tests/dujs/scopebinding.js tests/dujs/scope.js tests/dujs/var.js tests/dujs/scopeguards.js` 全過；quickstart §2 Foundational 的 run.js 迴圈與 `probes/develop.txt` 對應段落逐行相同；golden `--verify` 通過。

### 測試（先寫，須先失敗）

- [X] T017 [P] 新增 `tests/dujs/scopebinding.js`（contracts/scope-binding-api.md §2–§4、acceptance「另有單元測試」）：R1 選項（`ecmaVersion`＝`jsParser.ECMA_VERSION`、`sourceType` 取自 AST、script 失敗才 module）；`useVarsOf` 對宣告識別字（`var x` 的 `x`、函式名）回傳 `[]`、`defVarsOf` 回傳其 Var（F5）；R4 擁有者表（catch 參數、class 內層、function-expression-name、class-field-initializer／class-static-block 對應 synthetic function、無 lexical 的 block 中的 Annex B 函式）；US4-9（var、let、const、函式宣告、class、參數、catch 參數、import〔module〕、具名函式運算式、未宣告賦值：Var↔Variable 一對一、`var x; var x;` 兩個宣告、class 宣告兩個 Var 皆 `class`、catch-edge L10 `e` 的 def 屬 catch 參數 Var 而宣告節點列在外層 `e` 的 `declarations`、未宣告賦值為 `implicitGlobal` 且 `declarations` 為空、`arguments` 無 Var；**未宣告只讀→`global` 的斷言於 US3 的 T050 補入**）；`binding.kind` 多宣告取法（`function f(a) { function a() {} }`→`function`、`function f(a) { var a; }`→`parameter`）；`isVisible` (a)(b)(c)：pdef、「`b` 不參照 `v` 但呼叫改 `v` 的 `a`」、vis3 內層 `A` 對 `g` 可見；`isOnFunctionChain`（block `let`、catch 參數為 false；全域／builtin 為 true）；`classBindingGroupOf` 合併計數（無重新賦值 1 筆、有 `A = null` 2 筆）；optimistic 的 D6 等價（with、evalouter、含 eval 的函式中的 block 函式〔D5 優先〕、`with` 內的 catch）與唯一偏離 R2（`var x = 1; function f(a = x) { var x = 2; eval(""); return a; }` 的 L2 `x` 的 `useVarsOf` 為頁面的 `x`）；保留名稱 R12（`var $ANONYMOUS_FUN_0 = 1; var g = function () { return $ANONYMOUS_FUN_0; }; g();` 不拋錯、scope 名稱 `$PAGE_0`、`$ANONYMOUS_FUN_0`、inter-procedural 有 `$ANONYMOUS_FUN_0: L1 -> L1`）；builtin 同名 F9（頁面 `var console` 對應 builtin Var；頁面 `var localStorage` 是頁面自己的 Var）；語法矩陣（`using`、`await using`〔歸 `const`〕、`#p in o`、static block、class field、TLA、`import.meta`、解構預設值、`export {q as r}`）；§4 錯誤路徑（合成輸入觸發 `Error('scopebinding: ...')`）；非參照識別字（標籤 `L: for (;;) { break L; }` 的 `L`、`o.p` 的 `p`、物件鍵 `{k: 1}` 的 `k`、方法鍵 `{m() {}}` 的 `m`、`export {q as r}` 的 `r`）的 `useVarsOf`／`defVarsOf` 皆為 `[]`；`for (const x of xs)`、`for (var k in o)`、解構宣告 `var {a, b: [c]} = o` 的 `defVarsOf` 回傳對應 Var；兩檔串接（`getSourceFromFiles`）且第二檔含 `import` 時 `sourceType` 為 `module`
- [X] T018 [P] 新增 `tests/dujs/scopeguards.js`（acceptance US4-2…5、8、10、11 與 Q1／Q3／F9；讀 `tests/dujs/cases/probes006/`、`scopenames.json`、`developpairs.json`）：US4-2 對 33 個 probes 的 scope 名稱清單等於 `scopenames.json`、模型數只在 annexb、link-n4／n8a／n9／n10 改變且等於 spec 預期；US4-3 annexb（scope 名稱含 `$DOMAIN.$PAGE_0.f`、`$DOMAIN.$PAGE_0.g2`，無 inter-procedural 模型，`f: entry -> L1`、`f: entry -> L5`、`g2: entry -> L7`）；US4-4 with、evalouter、US4-5 op、US4-8 mod、classdecl、shadow-*、vis3、plan-bi（`Map: entry -> L2`、無 inter-procedural 模型）、plan-pf（`a: entry -> L3`、無 `a` 的 undefined 初值 pair）、Q3 內嵌程式：pair 與 `developpairs.json` 相同；US4-10 link-n4（`K: L1 -> L6`、無 `K: L5 -> L6`）、link-n8a、link-n9、link-n10（L3 `e();` 不連結）、link-n5（維持不連）；US4-11 link-bypass `e: L6 -> L8`
- [X] T019 [P] 在 `tests/dujs/var.js` 加 IdentifierName 測試（U1）：`$`、`été`、`a‌b`、`$ANONYMOUS_FUN_0` 合法；`1a`、`a-b` 不合法
- [X] T020 [P] 改寫 `tests/dujs/scope.js` 的名稱 API 測試為新 API（`addVariable`、`variables`、`getVariablesIncludingBlockScopes()` 回傳 `Var[]`、同一 scope 可有同名 Var、以身分去重），斷言語意不變；逐項記入 `golden-diff.md` Foundational「單元測試期望」
- [X] T021 執行 `npx mocha tests/dujs/scopebinding.js tests/dujs/scopeguards.js tests/dujs/var.js tests/dujs/scope.js`，確認新測試失敗（red；scopeguards 中「與 develop 相同」者可能已通過，於回報中列出）

### 實作

- [X] T022 [P] `lib/dujs/var.js`：`Var.isValidName` 放寬為 `/^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*$/u`（U1）；新增唯讀 `binding`（`{variable, kind, declarations}`，data-model §2）；`FunctionScope`／`Scope` 的名稱規則不動
- [X] T023 [P] `lib/dujs/jsparser.js`：新增 `ECMA_VERSION = espree.latestEcmaVersion`，`parseAST` 預設 `ecmaVersion` 改用此常數（取代 `'latest'`，行為不變）
- [X] T024 新增 `lib/dujs/scopebinding.js`（MIT；lib 中唯一 `require('eslint-scope')`）：`analyze(ast)`（R1 選項）建 `referenceOf`、`declaredBy`；`attach(scopeTree)` 建 `ownerOf`／`eslintScopeOf`（R4，含 `dujsClassMember` 反查）並設 `scopeTree.binding`；`variableVar`、`useVarsOf`、`useVarOf`、`defVarsOf`（data-model §5；Reference 優先、class 宣告 id→外＋內）；Var 建立與 `binding.kind`／`declarations`；白名單 W1 `globalVariableOf(name)`（`@nameLookup D3`，此階段只供有寫入的 `implicitGlobal`）、W2 `isExcludedGlobalName`（`@nameLookup D3`）、W3 `builtInVariableOf`（`@nameLookup FIXED_LIST`；頁面 fixed list 同名宣告對應 builtin Var，`localStorage` 除外）；`declarationsOf`、`localStorageVar`
- [X] T025 `lib/dujs/scopebinding.js`：可見性 `isVisible(var, dujsScope)`＝(a) 未遮蔽（W4 `isShadowed`，`@nameLookup FR-013`，只讀 `Scope.set`）∪ (b) 區域內直接參照 ∪ (c) `definingScopeOf(v)` 是被呼叫端祖先或本身（Q1），每個 dujs scope 計算一次並快取（`visibleCache`）；`isOnFunctionChain`（R6a，只比 scope 身分）；`classBindingGroupOf`（R7）；`registerRemainingVariables()`（R5：依 `scopeManager.scopes` 順序補登記 catch 參數、具名運算式名稱、class 內層名稱並建立 `definingScopeOf`；驗證 data-model §1 一對一規則，不符拋錯）。**只讀未解析名稱與 `++`／for-in 寫入的隱含全域留給 US3**
- [X] T026 `lib/dujs/scopetree.js` 在 class 成員 synthetic function 上加 non-enumerable `dujsClassMember`（建樹與命名邏輯不動）；`lib/dujs/scopectrl.js` 的 `addPageScopeTree(ast)` 在 `buildScopeTree` 前呼叫 `scopebinding.analyze(ast)`、之後 `binding.attach(scopeTree)`
- [X] T027 `lib/dujs/scope.js` 改為 `_variables: Var[]`（登記順序＝R5），新增 `addVariable(var)`、`variables`、`getVariablesIncludingBlockScopes()`；移除 data-model §3 列出的全部名稱 API 與 `vars`、`params`；`setBuiltInObjectVariables()`（定義於 `lib/dujs/scope.js`，`pagescope.js`／`domainscope.js` 不需修改）改為取 `scopebinding.builtInVariablesOf(scope)` 建立的 Var 後 `addVariable` 並交給 W3 表（`builtInObjects` 描述不變）
- [X] T028 `lib/dujs/variableanalyzer.js`：`setLocalVariables` 保留走訪骨架與順序（builtins → 內層函式宣告 → 參數 → 本體走訪 class／import／VariableDeclarator／AssignmentExpression），以識別字身分取得 Variable→Var 並登記到 R4 擁有者 scope；未解析的 `=`／解構寫入以 W1 建 `implicitGlobal`；`lib/dujs/defuseanalysisexecutor.js` 的 `initialize` 依 data-model §6 順序，在各 scope 登記後呼叫每頁 `binding.registerRemainingVariables()`
- [X] T029 `lib/dujs/defuseanalyzer.js`：`getDefinedVariables`、`findGENSet`（6 處）改 `defVarsOf`；ClassDeclaration 同時定義外層＋內層 Var（function def，range＝class）；新增 `FunctionExpression`／`ClassExpression` 規則在運算式所在節點定義內部名稱（function def，不走進本體，R8）；新增 `CatchClause` 規則定義參數綁定的 Var（literal def，range＝param），之後仍照 develop 走訪本體（區塊內賦值的定義保留到 T040 才移除，U3）；`findUSESet` 的 `Identifier` 改 `useVarsOf`，函式 entry 節點以 `isOnFunctionChain` 過濾（Q3）；`bypassFilter`、`getNonReachableVarDefs` 改 `isVisible`；`analyzeFunctionDeclaration` 以身分取 Var，builtin 同名者不給函式定義（F9）；fixed list／`undefined` 初值順序不變
- [X] T030 [P] `lib/dujs/callresolver.js`：`resolveVariable`、`classOfInstance` 改 `useVarOf`；`definitionsOnThePage` 對 `classBindingGroupOf` 合併 GEN 中的定義並以（fromNode, range）去重（FR-013、004 FR-018 規則內容不變）
- [X] T031 [P] `lib/dujs/modelbuilder.js`：`getRegisteredEventHandlerCallback` 的 handler 識別字改 `useVarOf`
- [X] T032 [P] `lib/dujs/hierarchy.js`：`definingLocalStorageNodes` 改以 `localStorageVar()` 身分判定（取代 `getScopeWhereTheVariableDeclared`）
- [X] T033 調整既有測試 `tests/dujs/modelbuilder.js`、`tests/dujs/defuseanalyzer.js`、`tests/dujs/bypass.js`、`tests/dujs/es2015.js`、`tests/dujs/model.js`、`tests/dujs/nestedfunctions.js`、`tests/dujs/analysisexecution.js` 中直接呼叫名稱 API 或 `setLocalVariables` 的段落（只改呼叫方式），逐項記入 `golden-diff.md` Foundational「單元測試期望」；`npx mocha tests/dujs/scopebinding.js tests/dujs/scope.js tests/dujs/var.js tests/dujs/scopeguards.js` 全過；執行 quickstart §2 Foundational 的 run.js 迴圈（shadow-block、shadow-param、shadow-loop、with、evalouter、op、mod、classdecl、vis3、plan-bi、plan-pf、link-n5），pair 輸出與 `specs/006-eslint-scope/probes/develop.txt` 對應段落逐行相同
- [X] T034 Golden 更新（序列化，Foundational；**更新 golden → 跑 diffcheck → 更新 manifest 與 golden-diff**，依「全程規則」步驟 1–5）：預期解析／AnnexB／連結類，catch 類只有「catch 參數列新增」（(c)；U3 的 (d) 移除屬 T043）（plan「golden 更新」預測：`expected-es2015/` 的 `TodoList`、`expected-fixes004/` 的 `Counter` 內層綁定列等）；**`tests/golden/expected-interprocedural/` 必須零差異**（R5 登記順序檢查，否則修實作）；結果寫入 `specs/006-eslint-scope/golden-diff.md` Foundational 節與 `tests/golden/manifest.json`；簽核欄只填「草擬，待簽核」；orchestrator 親自重跑 `--verify` 通過後才 commit
- [X] T035 Foundational 閘門（plan「Foundational 完成條件」F6）：閘門全過；`scopeguards.js` 全過（scope 名稱與模型數、與 develop 相同的守門、FR-013 連結、link-bypass `e: L6 -> L8`）；run.js 對「與 develop 相同」那組 probe 檔與 `probes/develop.txt` 逐行相同（只比 pair）；`diffcheck.js golden --verify` 結束碼 0；`grep -rnwE 'getVariable|hasVariable|getLocalVariable|hasLocalVariable|getScopeWhereTheVariableDeclared|addGlobalVariable|addLocalVariable|addLexicalVariable|addParameter|addInnerFunctionVariable|hasNamedFunction|hasBuiltInObject|isLexicalVariable|getParamNameWithIndex|namedFunctionVars|builtInObjectVars|_vars|_params|_paramNames|_namedFunctionVars|_builtInObjectVars|_lexicalNames' lib/` 無輸出（S1 名稱 API 已從 lib 移除）、`grep -rn "require('eslint-scope')" lib/` 只有 `lib/dujs/scopebinding.js`（靜態守門 `scopesource.js` 於 US4 建立，此處先以 grep 確認）。catch-*、link-bypass 其他 pair、globals、tyof、plan-u*、plan-catch1 此時仍可與 develop 不同。回報可提交

**Checkpoint**: eslint-scope 已是 lib 唯一的宣告與解析來源（名稱 API 已移除；靜態守門於 US4 建立）；之後依序進行 US1 → US2 → US3（golden 寫入須依序）。

---

## Phase 3: User Story 1 - catch 參數是 catch 子句自己的變數 (Priority: P1) 🎯 MVP

**Goal**: catch 節點只讀參數中的求值運算式、GEN 不走進本體（D4；U3：不再定義區塊內賦值）（research R10）。

**Independent Test**: `npx mocha tests/dujs/catchclause.js tests/dujs/usedexpressions.js` 通過（US1-1…6、plan-u3、plan-catch1）。

### 測試（先寫，須先失敗）

- [ ] T036 [P] [US1] 新增 `tests/dujs/catchclause.js`（acceptance US1-1…6、U3、Q2）：讀 `tests/dujs/cases/probes006/` 的 catch-b、catch-a、catch-c、catchloop、catchinner、catch-edge（頁面 intra-procedural、intra-page；US1-5 另驗 inter-procedural），斷言 spec 的有／無 pair；plan-u3（無 `y: L4 -> L7`；有 `y: L1 -> L7`、`y: L5 -> L7`）；plan-catch1（無 `e: entry -> L4`、`console: entry -> L4`；有 `e: L5 -> L6`、`h: entry -> L3`、`k: entry -> L9`）
- [ ] T037 [P] [US1] 在 `tests/dujs/usedexpressions.js` 加 CatchClause items 測試：有參數時只含參數中的求值運算式（解構預設值、計算鍵，read `'walk'`）；無參數 `catch {}` 不讀任何東西；不含本體讀取
- [ ] T038 [US1] 執行 `npx mocha tests/dujs/catchclause.js tests/dujs/usedexpressions.js` 確認新測試失敗（red；Foundational 已使部分成立者於回報中列出）

### 實作

- [ ] T039 [US1] `lib/dujs/usedexpressions.js`：`astNodeItems` 的 CatchClause 只回傳 `bindingPattern.getEvaluatedExpressions(param)`，無參數時為空
- [ ] T040 [US1] `lib/dujs/defuseanalyzer.js`：CatchClause 節點的 GEN 只含 T029 的參數綁定，不再走訪 catch 本體（移除 T029 保留的區塊內賦值定義，U3）；`findUSESet` 於 CatchClause 只用 T039 的 items
- [ ] T041 [US1] `npx mocha tests/dujs/catchclause.js tests/dujs/usedexpressions.js tests/dujs/scopeguards.js` 全過；run.js 對 catch-*、catchloop、catchinner、plan-u3、plan-catch1 的輸出與 spec「探測結果」修正後預期相符
- [ ] T042 [US1] 確認無既有測試需改；若有，依「全程規則」只改允許範圍並記入 `golden-diff.md` US1「單元測試期望」
- [ ] T043 [US1] Golden 更新（序列化，US1；**更新 golden → 跑 diffcheck → 更新 manifest 與 golden-diff**，依「全程規則」步驟 1–5）：預期 catch 類 (a)–(e)（如 `expected/` page0 `parseSaved` 的 catch 參數 `e` 列）；淨差異表整表重新產生；結果寫入 `specs/006-eslint-scope/golden-diff.md` US1 節與 `tests/golden/manifest.json`；簽核欄只填「草擬，待簽核」；orchestrator 親自重跑 `--verify` 通過後才 commit
- [ ] T044 [US1] US1 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；回報可提交

**Checkpoint**: US1 獨立可驗（catch 參數只在 catch 子句內定義與使用）。

---

## Phase 4: User Story 2 - 具名運算式名稱、class 內層名稱與參數預設值解析到正確宣告 (Priority: P1)

**Goal**: 驗收 US2-1…5；D7（具名運算式名稱在節點定義、自我遞迴不連結）與 pdef 已由 Foundational 達成，若有落差在此修正（research R7、R8）。

**Independent Test**: `npx mocha tests/dujs/scoperesolution.js` 通過。

### 測試（先寫）

- [ ] T045 [P] [US2] 新增 `tests/dujs/scoperesolution.js`（acceptance US2-1…5）：named-expr（inter-procedural、intra-page 有 `Q: L1 -> L2`、`fact: L4 -> L5`；頁面 intra-procedural 無 `Q`／`fact` 的 pair）；US2-2 內嵌程式（L5 改 `fact(n - 1);`、另起 `return n;`）分析完成、有 `fact: L4 -> L5`、`fact(n - 1)` 不連結（inter-procedural 模型的 relatedScopes）；classdecl（`A: L1 -> L2`、`A: L5 -> L6`）；pdef（有 `x: L1 -> L2`、無 `x: entry -> L2`）；shadow-block／param／loop 的 pair 等於 `tests/dujs/cases/probes006/developpairs.json`
- [ ] T046 [US2] 執行 `npx mocha tests/dujs/scoperesolution.js`；預期已通過（記錄 red／green 狀態於回報）

### 實作（預期無）

- [ ] T047 [US2] 若 T046 有失敗：先依「全程規則」判斷推導或實作偏離；實作偏離者修正 `lib/dujs/defuseanalyzer.js` 或 `lib/dujs/scopebinding.js`。**本 story 預期不改 golden**：修正後執行普通 `npm test`（**不得**用 `UPDATE_GOLDEN=1`）：golden 測試失敗即表示 golden 會變，停下回報（須改排入序列化 golden 任務，不得在此寫 golden）。無失敗時本任務標為「不需修改」
- [ ] T048 [US2] US2 閘門：閘門全過；`git -C <專案根> diff --exit-code HEAD -- tests/golden`（US1 已 commit；golden 相對 HEAD 無變化）；回報可提交

**Checkpoint**: US2 獨立可驗。US2 在 US1 commit 後執行，不與 US1 並行。

---

## Phase 5: User Story 3 - 未宣告就讀取的全域物件有定義 (Priority: P2)

**Goal**: 未解析讀取的 `global` Var 與 `Def.GLOBAL_TYPE`；名稱排除；頁面 entry 的 global 定義；`++`／for-in 寫入的隱含全域補登記（research R5、R9；data-model §4）。

**Independent Test**: `npx mocha tests/dujs/globals.js tests/dujs/def.js tests/dujs/deffactory.js` 通過（US3-1…8、plan-u1、plan-u4）。

### 測試（先寫，須先失敗）

- [ ] T049 [P] [US3] 新增 `tests/dujs/globals.js`（acceptance US3-1…8、U1、U4）：globals（`Math: entry -> L1`、`JSON: entry -> L2`、`alert: entry -> L3` 與原有 pair）；US3-2 單元斷言 `window`／`document`／`console`／`localStorage` 的定義種類不變；US3-3 `g` 守門；US3-4 函式內 `Math` 的 entry→`return` pair；US3-5 兩頁各自 entry、不跨頁；args 與 tyof 的 `this.x` 無 `arguments`／`this` pair；tyof（`zz: entry -> L1`，無 `undefined`、`NaN`）；US3-8（`globalThis: entry -> L1`、無 `Infinity`、`undefined: L2 -> L2`；`Math` 等的 VarDef 種類為 `global`）；plan-u1（不拋錯，`$: entry -> L1`、`été: entry -> L2` 為 `global`）；plan-u4（保留 `d1: L5 -> L6`、`o: L1 -> L2`；新增 `kk: L2 -> L2`、`uu: entry -> L3`、`uu: L3 -> L4`、`Math: L7 -> L8`、`location: L9 -> L10` 與各自 entry 定義 pair；`Math`／`location` 為 `global`、`kk`／`uu` 為 `implicitGlobal`）；plan-u1 另以 CLI 執行（`child_process` 以 `os.tmpdir()` 下新建的暫存目錄為 cwd 執行 `node <專案根>/bin/dujs.js -js <專案根>/tests/dujs/cases/probes006/plan-u1.js`，測後刪除）exit 0，且輸出的 `*.dupairs.dot` 有 `$`、`été` 列
- [ ] T050 [P] [US3] 在 `tests/dujs/scopebinding.js` 補 US4-9 的「未宣告只讀→`global`、`declarations` 為空」斷言，以及 `++`／for-in 左側寫入的未宣告名稱為 `implicitGlobal`、登記於既有 Var 之後（R5 順序）；並取消 `tests/dujs/scopeguards.js` 中 US4-3 annexb 全域 pair 案例的 `it.skip`（Foundational 2b 因只讀全域屬 US3 而暫略，scope 名稱與不連結已於 Foundational 驗證）；並加 Foundational 審查 R1 的案例（`function f(a = (g1 = 1)) { return a + g1; } f();`：`g1` 登記於頁面 scope 的 `variables`、種類 `implicitGlobal`）
- [ ] T051 [P] [US3] 在 `tests/dujs/def.js` 加 `Def.GLOBAL_TYPE === 'global'` 且屬 `Def.TYPES`；在 `tests/dujs/deffactory.js` 加 `createGlobalDef(from, range)` 測試（既有 `htmlDom`、`object`、`localStorage` 不變）
- [ ] T052 [US3] 執行 `npx mocha tests/dujs/globals.js tests/dujs/scopebinding.js tests/dujs/def.js tests/dujs/deffactory.js` 確認新測試失敗（red）

### 實作

- [ ] T053 [US3] `lib/dujs/def.js` 新增 `Def.GLOBAL_TYPE = 'global'` 並加入 `Def.TYPES`；`lib/dujs/deffactory.js` 新增 `createGlobalDef(from, range)`；`lib/dujs/vardeffactory.js` 新增 `createGlobalVarDef(variable, node, Def.GLOBAL_TYPE)`（沿用既有 global range）
- [ ] T054 [US3] `lib/dujs/scopebinding.js`：未解析 Reference 依 W2 排除 → W3 builtin → W1 頁面＋名稱（只讀者種類 `global`）；`registerRemainingVariables()` 依原始碼順序補登記只被 `++`／`--`、for-in／for-of 左側寫入的未解析名稱（`implicitGlobal`），再補登記只讀未解析名稱（`global`，含 `G.p = v` 的 `G`）；新增 `globalVars()`；另依 Foundational 審查 R1：`registerRemainingVariables()` 須把 `_globalsByName` 中尚未登記到頁面 scope 的 Var（只在參數預設值或 class 成員中被賦值的未宣告名稱，例如 `function f(a = (g1 = 1)) { return a + g1; }` 的 `g1`）登記到頁面 scope，使其有 entry 的 `undefined` 初值
- [ ] T055 [US3] `lib/dujs/defuseanalyzer.js`：頁面 entry 在 fixed list、`undefined` 初值、函式宣告之後依 `globalVars()` 順序產生 `global` 定義；`G.p = v` 的 `G` 依 D1 在該節點定義（經 `defVarsOf`）
- [ ] T056 [US3] `npx mocha tests/dujs/globals.js tests/dujs/scopebinding.js tests/dujs/def.js tests/dujs/deffactory.js tests/dujs/scopeguards.js` 全過；既有測試若需改依「全程規則」記入 `golden-diff.md` US3「單元測試期望」
- [ ] T057 [US3] Golden 更新（序列化，US3；**更新 golden → 跑 diffcheck → 更新 manifest 與 golden-diff**，依「全程規則」步驟 1–5）：預期全域類（`expected/` page0、page1 的 `JSON`、`expected-es2015/` 的 `Math` 等）；US3-2：fixed list 物件的 pair 不得出現在淨差異表；淨差異表整表重新產生；結果寫入 `specs/006-eslint-scope/golden-diff.md` US3 節與 `tests/golden/manifest.json`；簽核欄只填「草擬，待簽核」；orchestrator 親自重跑 `--verify` 通過後才 commit
- [ ] T058 [US3] US3 閘門：閘門全過、`diffcheck.js golden --verify` 結束碼 0；回報可提交

**Checkpoint**: US3 獨立可驗（未宣告讀取的全域有 entry 定義）。

---

## Phase 6: User Story 4 - eslint-scope 是宣告與解析的唯一來源，其餘行為不變 (Priority: P1)

**Goal**: FR-012 (1) 靜態測試（S1–S6、W1–W4）；重跑 Foundational 守門；golden 淨差異最終核對（contracts/static-check.md；守門已在 Foundational 建立）。

**Independent Test**: `npx mocha tests/dujs/scopesource.js tests/dujs/scopeguards.js` 通過；`diffcheck.js golden --verify` 結束碼 0。

### 測試（先寫）

- [ ] T059 [US4] 新增 `tests/dujs/scopesource.js`（contracts/static-check.md）：以 espree（`ecmaVersion: 'latest'`、`sourceType: 'script'`）解析 `lib/**/*.js`、walkes 走訪；每條規則一個 `it`，失敗訊息列 `檔案:行:欄` 與片段——S1 禁用 22 個成員名稱；S2 `Scope.prototype`（及子類）不得定義 S1 名稱與 `vars`、`params`；S3 `require('eslint-scope')` 只在 `lib/dujs/scopebinding.js`；S4 `.set`（非 `Map#set` callee）只在白名單函式內、禁 `.implicit`、`.through`、`.__get` 及 `.resolve` 以外的 scopeManager 名稱 API；S5 `lib/dujs/*.js`（`scopebinding.js` 除外，由 S6 管）的 `.name` 讀取只允許測試檔內的精確允許表（初始項＝static-check.md S5 表，T061 補齊）；S6 `scopebinding.js` 內以字串名稱為鍵的 `Map#get/has/set`、`Set#has` 只在白名單函式內；白名單 `@nameLookup` 函式集合**恰為** W1 `globalVariableOf`、W2 `isExcludedGlobalName`、W3 `builtInVariableOf`、W4 `isShadowed`，只在 `scopebinding.js`，理由 ∈ `{D3, D6, FIXED_LIST, FR-013}`；§3 自我驗證：內嵌違規字串（`scope.getVariable(node.name)`、其他檔名中的 `require('eslint-scope')` 等）使每條規則失敗
- [ ] T060 [US4] 執行 `npx mocha tests/dujs/scopesource.js`；列出違規（red／green 狀態記入回報）

### 實作

- [ ] T061 [US4] 修正 T060 列出的 lib 違規（只改為身分查詢，不改行為；檔案限 plan「修改」清單）；S5 允許表以 `tests/dujs/scopesource.js` 內的表為準，依實際程式碼補齊（預期新增如 `scopetree.js` 的 `node.id.name`、`graphics.js` 的輸出名等；理由欄必填），新增項列於回報與 PR 說明，**不改 contracts**；`npx mocha tests/dujs/scopesource.js` 全過
- [ ] T062 [US4] 重跑全部守門：`npx mocha tests/dujs/scopeguards.js tests/dujs/scopebinding.js tests/dujs/catchclause.js tests/dujs/scoperesolution.js tests/dujs/globals.js` 全過；quickstart §2 Foundational 的 run.js 迴圈與 `probes/develop.txt` 仍逐行相同
- [ ] T063 [US4] Golden 收尾（序列化，US4；重生驗證零差異）：`UPDATE_GOLDEN=1 npm test` 後 `git -C <專案根> diff --exit-code -- tests/golden/expected*` 須零差異。**有任何差異一律先當 T061 的回歸**，修 `lib/` 直到重生後零差異（不更新 manifest、不改淨差異表）；確認無法零差異才停下請使用者裁決。零差異時 `golden-diff.md` US4 節記「無差異」；最終 `node specs/006-eslint-scope/tools/diffcheck.js golden --verify specs/006-eslint-scope/golden-diff.md` 結束碼 0（US4-1），orchestrator 親自重跑通過後才 commit
- [ ] T064 [US4] US4 閘門：閘門全過；回報可提交
- [ ] T070 [US4] **使用者簽核閘門（orchestrator 執行，非 implementer）**：T063／T064 後、PR 前，orchestrator 把 `golden-diff.md` 累積的「解析類移除簽核」「呼叫連結簽核」表（implementer 草擬，待簽核）連同淨差異對應列交使用者一次簽核；使用者同意後 orchestrator 把簽核欄改為簽核紀錄（簽核者、日期），重跑 `diffcheck.js golden --verify` 結束碼 0 並 commit；不同意的列視為回歸，退回 implementer 修正（重做受影響的 golden 任務）

**Checkpoint**: US4 獨立可驗（唯一來源由靜態測試守住；golden 差異 100% 屬 D2 且已經使用者簽核〔T070〕）。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: MDN 範例集與效能（SC-003、US4-7）、文件（FR-011）、最終驗證（SC-001、SC-002、SC-004）。

- [ ] T065 MDN 驗證（quickstart §4、US4-7）：`node specs/006-eslint-scope/tools/diffcheck.js mdn --report > <scratchpad>/m.md`，確認 32 個 id（33 檔，s09 兩頁）CLI exit code 全 0、不拋錯；建立 `specs/006-eslint-scope/mdn-diff.md`（contracts/diff-check.md §4 三個機器區塊＋人工說明；解析類移除與連結衍生差異逐筆列出並釘選筆數，簽核欄只填「草擬，待簽核」，由使用者於 T071 簽核）；`node specs/006-eslint-scope/tools/diffcheck.js mdn --verify specs/006-eslint-scope/mdn-diff.md` 結束碼 0。無法歸類者先視為回歸；確認不是則停下裁決；orchestrator 親自重跑 `--verify` 通過後才 commit
- [ ] T066 效能（SC-003、research R15）：以 `mkdir -p <scratchpad>/develop && git -C <專案根> archive 584e17d | tar -x -C <scratchpad>/develop`，再於該目錄 `npm ci` 取得 develop（implementer 只執行查詢類 git，不建立 worktree），與本 branch 在同一台機器、同一時段各跑 `node specs/006-eslint-scope/tools/perf.js <root>`（3 次中位數），更新 `specs/006-eslint-scope/perf.md`（develop、本 branch、比值，門檻 ≤ 1.5 倍；Setup 基準一併保留）；超過門檻停下回報；完成後刪除 `<scratchpad>/develop`
- [ ] T067 [P] `docs/known-issues.md`（FR-011、quickstart §5）：§22 (2)、§24 標「已修正（006）」；新增「catch 參數與 catch 節點讀取」一節（修正前行為、重現程式＝probes catch-*、plan-u3、plan-catch1，標已修正）；新增「參數預設值的錯誤解析」一節（pdef，標已修正）；本輪發現另立節，至少含：(1) Var 名放寬為 IdentifierName 後可與 scope 保留名稱（`$DOMAIN`、`$PAGE_n`、`$ANONYMOUS_FUN_n`、`$BLOCK_n`）同字，只影響輸出可讀性（U1、R12）；(2) 以 `$` 開頭的函式名（`function $(s) {}`、`function $a() {}`）在 develop 與本 feature 都拋 `Invalid value for a FunctionScope`，scope 命名不在範圍（FR-009）；(3) §18 註明函式 entry 節點只認從函式 scope 可見的變數（Q3），被 block 內 `let` 遮蔽的讀取在 entry 不再產生 pair，其餘留給 005；(4) optimistic 與 D6 字面回退的唯一偏離（參數預設值＋eval，R2）；以及 T061、T065 等過程中的其他發現
- [ ] T068 [P] `README.md` 的 Limits（FR-011、quickstart §5）：scope 依 eslint-scope（catch 參數、具名運算式名稱、class 內層綁定）；全域物件（未宣告讀取＝頁面 entry 的全域、定義種類 `global`；`undefined`／`NaN`／`Infinity`／`arguments` 排除）；Annex B（block 內函式只在 block 可見，外部呼叫不連結）
- [ ] T069 最終驗證：依 quickstart §1–§4 逐條執行（指令可用、預期相符）；`node specs/004-fix-remaining-issues/probes/run.js specs/006-eslint-scope/probes/*.js` 與 spec「探測結果」修正後預期及 `probes/develop.txt`（守門者）逐一核對（SC-004），推導更正記入 `golden-diff.md`「驗收預期更正」；`npm test && npm run lint` 全綠；`git -C <專案根> diff 584e17d -- eslint-suppressions.json` 無新增鍵、無 count 增加（prune 造成的刪減列於回報）；`git -C <專案根> diff --exit-code 584e17d -- lib/esgraph/index.js lib/esgraph/dot.js lib/analyses`；`diffcheck.js golden --verify` 與 `diffcheck.js mdn --verify` 皆結束碼 0；以上指令即 quickstart §6「PR 檢查清單」，orchestrator 於 PR 前親自重跑；回報可提交
- [ ] T071 **MDN 使用者簽核閘門（orchestrator 執行，非 implementer）**：T065 後（T069 完成後、PR 前），orchestrator 把 `mdn-diff.md` 的「解析類移除簽核」「呼叫連結簽核」表（implementer 草擬，待簽核）交使用者簽核；同意後改簽核欄（簽核者、日期）、重跑 `diffcheck.js mdn --verify` 結束碼 0 並 commit；不同意的列視為回歸，退回 implementer 修正。完成後依 quickstart §6 的 PR 檢查清單建立 PR

**Checkpoint**: MDN、效能、文件與最終驗證完成，golden（T070）與 MDN（T071）差異皆經使用者簽核；可依 quickstart §6 建立 PR。

---

## Dependencies & Execution Order

### Phase 相依

- **Setup（Phase 1）**：無相依；先做 T008（來源在暫存目錄）；T016 後由 orchestrator 提交 Setup commit（MDN 與 perf 基準；golden 基準固定 `584e17d`），之後才可改 `lib/`。
- **Foundational（Phase 2）**：依賴 Setup；阻擋所有 story（Scope 名稱 API 移除後所有呼叫端須同時改完）；內分 2a → 2b → 2c 三批（見 Phase 2）。
- **US1（Phase 3）、US2（Phase 4）、US3（Phase 5）**：皆依賴 Foundational，**依序**執行 US1 → US2 → US3：US2 在 US1 commit 後執行（只加測試，預期無 lib 變更、不改 golden）；US1 與 US3 都改 `defuseanalyzer.js` 與 golden。
- **US4（Phase 6）**：依賴 US1、US2、US3（靜態測試與 golden 最終核對針對全部 lib 變更）；T070 使用者簽核在 T064 後。
- **Polish（Phase 7）**：依賴 US4（含 T070）；T071 MDN 簽核在 T065、T069 後、PR 前。

### Golden 寫入序列（不可並行）

T034（Foundational）→ T043（US1）→ T057（US3）→ T063（US4 收尾，重生須零差異）。淨差異表是相對 develop（`584e17d`）的累積結果，每次整表重新產生並 `--verify`；orchestrator 親自重跑 `--verify` 通過後才 commit。

### Story 內順序

測試（red）→ 實作 → 測試全過 → golden（若有）→ 閘門。Foundational 內分三批（見 Phase 2「分批與批間檢查」）：2a＝T017、T019 → T021（新增部分）→ T022、T023 → T024 → T025 → T026；2b＝T018、T020 → T021（其餘部分）→ T027 → T028 → T029 → T030–T032（並行）→ T033；2c＝T034 → T035。

## Parallel Opportunities

- **Setup**：T004、T005 並行；T012（diffcheck 自我測試）與 T014（perf.js）並行；T006、T007 寫不同檔，可在 T004 後並行執行（未標 [P] 因同屬 `tests/dujs/cases/probes006/`，避免與 T004 衝突）。
- **Foundational 測試**：2a 內 T017、T019 並行；2b 內 T018、T020 並行。
- **Foundational 實作**：T022、T023 並行；T030、T031、T032 並行（不同檔，皆只依賴 scopebinding）。
- **US1**：T036、T037 並行。
- **US3**：T049、T050、T051 並行。
- **Polish**：T067、T068 並行。

```text
# Foundational 2a 測試先行：
T017 tests/dujs/scopebinding.js
T019 tests/dujs/var.js

# Foundational 2b 測試先行：
T018 tests/dujs/scopeguards.js
T020 tests/dujs/scope.js
```

## Implementation Strategy

### MVP

Setup → Foundational → US1：完成後 Scope 的名稱 API 已從 lib 移除（T035 以 grep 確認；靜態守門 `scopesource.js` 於 US4 建立）、catch 參數問題（最常見的解析錯誤）已修正，golden 差異經 `--verify` 核對，可單獨提交（人工簽核仍在 T070）。

### Incremental Delivery

每個 phase 結束於閘門並各自 commit（由 orchestrator 執行）：Foundational（D1 切換＋守門）→ US1（catch）→ US2（驗收測試）→ US3（全域）→ US4（靜態測試＋golden 重生零差異＋使用者簽核 T070）→ Polish（MDN、perf、文件、MDN 簽核 T071）。每一步都保持 `npm test`、lint 全綠與 golden `--verify` 通過。

## 各 story 預計修改／新增檔案

| Phase | lib | tests | 其他 |
|-------|-----|-------|------|
| Setup | — | 新增 `tests/dujs/cases/probes006/`（33 個 probes＋`scopenames.json`＋`developpairs.json`） | `package.json`、`package-lock.json`、`eslint.config.js`；新增 `probes/develop.txt`、`mdn/`（corpus 33 檔、`pages.json`、`README.md`、`baseline-develop/`）、`tools/diffcheck.js`、`tools/diffcheck.test.js`、`tools/perf.js`、`golden-diff.md`、`perf.md` |
| Foundational | 新增 `scopebinding.js`；修改 `var.js`、`jsparser.js`、`scopetree.js`、`scopectrl.js`、`scope.js`、`pagescope.js`、`domainscope.js`、`variableanalyzer.js`、`defuseanalysisexecutor.js`、`defuseanalyzer.js`、`callresolver.js`、`modelbuilder.js`、`hierarchy.js` | 新增 `scopebinding.js`、`scopeguards.js`；修改 `var.js`、`scope.js`、`modelbuilder.js`、`defuseanalyzer.js`、`bypass.js`、`es2015.js`、`model.js`、`nestedfunctions.js`、`analysisexecution.js` | `tests/golden/expected*`、`manifest.json`、`golden-diff.md` |
| US1 | `usedexpressions.js`、`defuseanalyzer.js` | 新增 `catchclause.js`；修改 `usedexpressions.js` | golden、manifest、`golden-diff.md` |
| US2 | 預期無 | 新增 `scoperesolution.js` | — |
| US3 | `def.js`、`deffactory.js`、`vardeffactory.js`、`scopebinding.js`、`defuseanalyzer.js` | 新增 `globals.js`；修改 `scopebinding.js`、`def.js`、`deffactory.js` | golden、manifest、`golden-diff.md` |
| US4 | 依 T060 違規修正（預期少量） | 新增 `scopesource.js`（含 S5 允許表） | `golden-diff.md` US4 節；T070 簽核欄（orchestrator） |
| Polish | — | — | `mdn-diff.md`、`perf.md`、`docs/known-issues.md`、`README.md`；T071 簽核欄（orchestrator） |
